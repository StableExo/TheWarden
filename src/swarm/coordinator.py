"""
TheWarden Swarm Coordinator
===========================
Multi-agent consensus engine with Ethics Engine veto.

Architecture:
    4 specialized agents (Risk 1.2, Opportunity 1.0, Ethics 1.5 veto, Speed 0.8)
    → parallel LLM dispatch → weighted consensus → Supabase state

Account-agnostic: lives in GitHub, state in Supabase.
Can be called from ANY CodeWords session with credentials.

Usage:
    from swarm_coordinator import SwarmCoordinator
    
    coordinator = SwarmCoordinator(
        supabase_url="https://xxx.supabase.co",
        supabase_key="your-key"
    )
    result = await coordinator.decide("Should we post on Moltbook about X?")

Author: TheWarden / Cody on CodeWords
Session: CW-S17
"""

import asyncio
import httpx
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List


# ============================================================
# AGENT PROMPTS
# ============================================================

AGENT_PROMPTS = {
    "risk": """You are the RISK AGENT in a swarm consensus system.
Your weight: 1.2x (elevated because risk detection is critical).
Your job: Identify threats, downsides, failure modes, and risks.

Evaluate the following decision query and respond with:
1. VOTE: approve / reject / abstain
2. CONFIDENCE: 0.0 to 1.0
3. REASONING: Your risk assessment (2-4 sentences)

Be specific. Name concrete risks. Don't hedge with generalities.
If the risk is low and manageable, vote approve. If it's high or unmitigable, vote reject.

Ethics Engine principles to consider:
{ethics_principles}

Decision query: {query}
Context: {context}""",

    "opportunity": """You are the OPPORTUNITY AGENT in a swarm consensus system.
Your weight: 1.0x (baseline — opportunity is important but not weighted above default).
Your job: Identify value, upside, strategic advantages, and possibilities.

Evaluate the following decision query and respond with:
1. VOTE: approve / reject / abstain
2. CONFIDENCE: 0.0 to 1.0
3. REASONING: Your opportunity assessment (2-4 sentences)

Be specific about the upside. Quantify where possible. Don't be blindly optimistic.
If opportunity exceeds risk, vote approve. If there's no clear upside, vote reject.

Decision query: {query}
Context: {context}""",

    "ethics": """You are the ETHICS AGENT in a swarm consensus system.
Your weight: 1.5x (highest weight). You hold ABSOLUTE VETO POWER.
Your job: Evaluate against the 6 Ethics Engine principles.

THE SIX PRINCIPLES:
{ethics_principles}

ALIGNMENT RATIO: 93/7 (93% aligned action, 7% exploratory/adversarial testing)

If ANY principle is violated, you MUST vote REJECT. Your rejection is a VETO — 
the decision dies regardless of what other agents voted.

Evaluate the following decision query and respond with:
1. VOTE: approve / reject / abstain
2. CONFIDENCE: 0.0 to 1.0
3. REASONING: Which principles are satisfied/violated (2-4 sentences)
4. VETO: true/false (true = absolute override, decision rejected)

Decision query: {query}
Context: {context}""",

    "speed": """You are the SPEED AGENT in a swarm consensus system.
Your weight: 0.8x (lowest — speed bias is useful but should not dominate).
Your job: Assess urgency and bias toward action when appropriate.

Evaluate the following decision query and respond with:
1. VOTE: approve / reject / abstain
2. CONFIDENCE: 0.0 to 1.0
3. REASONING: Your urgency/timing assessment (2-4 sentences)

Consider: Is there a time window? Will delay cost more than action?
Is this decision reversible if wrong? Reversible decisions favor speed.

Decision query: {query}
Context: {context}"""
}


# ============================================================
# VOTE PARSER
# ============================================================

def parse_agent_response(text: str) -> Dict[str, Any]:
    """Parse an agent's natural language response into structured vote."""
    text_lower = text.lower()
    
    # Extract vote
    vote = "abstain"
    if "vote: approve" in text_lower or "vote:** approve" in text_lower:
        vote = "approve"
    elif "vote: reject" in text_lower or "vote:** reject" in text_lower:
        vote = "reject"
    elif "approve" in text_lower and "reject" not in text_lower:
        vote = "approve"
    elif "reject" in text_lower and "approve" not in text_lower:
        vote = "reject"
    
    # Extract confidence
    confidence = 0.7  # default
    for marker in ["confidence:", "confidence**:"]:
        idx = text_lower.find(marker)
        if idx >= 0:
            snippet = text_lower[idx + len(marker):idx + len(marker) + 10].strip()
            for token in snippet.split():
                try:
                    val = float(token.strip("*,. "))
                    if 0 <= val <= 1:
                        confidence = val
                        break
                except ValueError:
                    continue
    
    # Extract veto (ethics agent only)
    veto = False
    if "veto: true" in text_lower or "veto:** true" in text_lower:
        veto = True
    
    # Extract reasoning
    reasoning = text.strip()
    for marker in ["reasoning:", "3.", "REASONING:"]:
        idx = text.find(marker)
        if idx >= 0:
            reasoning = text[idx + len(marker):].strip()
            # Trim after next numbered item
            for end_marker in ["4.", "VETO:"]:
                end_idx = reasoning.find(end_marker)
                if end_idx > 0:
                    reasoning = reasoning[:end_idx].strip()
            break
    
    return {
        "vote": vote,
        "confidence": confidence,
        "veto": veto,
        "reasoning": reasoning[:500]  # cap length
    }


# ============================================================
# SWARM COORDINATOR
# ============================================================

class SwarmCoordinator:
    """
    Multi-agent consensus engine with Ethics Engine veto.
    
    Architecture:
        - 4 specialized agents with weighted voting
        - Risk (1.2), Opportunity (1.0), Ethics (1.5 + veto), Speed (0.8)
        - Consensus threshold: 0.7 (configurable via Supabase)
        - All state persisted to Supabase
    """
    
    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        openai_api_key: Optional[str] = None,
        openai_base_url: Optional[str] = None,
        session_id: str = "default"
    ):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.session_id = session_id
        
        # LLM config — works with CodeWords proxy or direct OpenAI
        self.openai_api_key = openai_api_key or "dummy"
        self.openai_base_url = openai_base_url or "https://runtime.codewords.ai/openai/v1"
        
        self.sb_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Defaults (overridden by Supabase config)
        self.weights = {"risk": 1.2, "opportunity": 1.0, "ethics": 1.5, "speed": 0.8}
        self.threshold = 0.7
        self.ethics_veto = True
        self.models = {role: "gemini-2.5-flash" for role in self.weights}
        self.ethics_principles = [
            "Truth-Maximization", "Harm-Minimization", "Partnership",
            "Radical Transparency", "Accountability/Self-Correction", "Precision"
        ]
    
    async def load_config(self):
        """Load configuration from Supabase."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.supabase_url}/rest/v1/swarm_config?select=key,value",
                headers=self.sb_headers
            )
            if resp.status_code == 200:
                for item in resp.json():
                    key, val = item["key"], item["value"]
                    if key == "agent_weights":
                        self.weights = val
                    elif key == "consensus_threshold":
                        self.threshold = float(val)
                    elif key == "ethics_veto_enabled":
                        self.ethics_veto = bool(val)
                    elif key == "models":
                        self.models = val
                    elif key == "ethics_principles":
                        self.ethics_principles = val
    
    async def _call_llm(self, model: str, prompt: str) -> tuple:
        """Call an LLM via OpenAI-compatible API. Returns (response_text, time_ms)."""
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(
            api_key=self.openai_api_key,
            base_url=self.openai_base_url
        )
        
        start = time.time()
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.3
            )
            elapsed_ms = int((time.time() - start) * 1000)
            return resp.choices[0].message.content, elapsed_ms
        except Exception as e:
            elapsed_ms = int((time.time() - start) * 1000)
            return f"ERROR: {str(e)}", elapsed_ms
    
    async def _dispatch_agent(self, role: str, query: str, context: str) -> Dict:
        """Dispatch a single agent and parse its vote."""
        prompt_template = AGENT_PROMPTS[role]
        prompt = prompt_template.format(
            query=query,
            context=context,
            ethics_principles="\n".join(f"  - {p}" for p in self.ethics_principles)
        )
        
        model = self.models.get(role, "gemini-2.5-flash")
        response_text, time_ms = await self._call_llm(model, prompt)
        
        parsed = parse_agent_response(response_text)
        
        return {
            "agent_role": role,
            "weight": self.weights[role],
            "vote": parsed["vote"],
            "reasoning": parsed["reasoning"],
            "confidence": parsed["confidence"],
            "veto": parsed.get("veto", False),
            "model_used": model,
            "response_time_ms": time_ms,
            "raw_response": response_text
        }
    
    def _calculate_consensus(self, votes: List[Dict]) -> Dict:
        """Calculate weighted consensus from agent votes."""
        total_weight = sum(v["weight"] for v in votes)
        approve_weight = sum(v["weight"] for v in votes if v["vote"] == "approve")
        reject_weight = sum(v["weight"] for v in votes if v["vote"] == "reject")
        
        consensus_score = approve_weight / total_weight if total_weight > 0 else 0
        
        # Check ethics veto
        ethics_vetoed = False
        veto_reason = None
        if self.ethics_veto:
            ethics_votes = [v for v in votes if v["agent_role"] == "ethics"]
            for ev in ethics_votes:
                if ev.get("veto") or ev["vote"] == "reject":
                    ethics_vetoed = True
                    veto_reason = ev["reasoning"]
                    break
        
        # Determine result
        if ethics_vetoed:
            result = "VETOED"
            status = "vetoed"
        elif consensus_score >= self.threshold:
            result = "APPROVED"
            status = "decided"
        else:
            result = "REJECTED"
            status = "decided"
        
        avg_confidence = sum(v["confidence"] for v in votes) / len(votes) if votes else 0
        
        return {
            "result": result,
            "status": status,
            "consensus_score": round(consensus_score, 4),
            "confidence": round(avg_confidence, 4),
            "ethics_vetoed": ethics_vetoed,
            "veto_reason": veto_reason,
            "approve_weight": approve_weight,
            "reject_weight": reject_weight,
            "total_weight": total_weight
        }
    
    async def _save_decision(self, decision_id: str, query: str, context: dict,
                              consensus: dict, votes: list):
        """Save decision and votes to Supabase."""
        async with httpx.AsyncClient(timeout=15) as client:
            # Save decision
            decision_record = {
                "decision_id": decision_id,
                "input_query": query,
                "context": context,
                "status": consensus["status"],
                "result": consensus["result"],
                "confidence": consensus["confidence"],
                "consensus_score": consensus["consensus_score"],
                "ethics_vetoed": consensus["ethics_vetoed"],
                "veto_reason": consensus["veto_reason"],
                "votes_summary": {
                    "approve_weight": consensus["approve_weight"],
                    "reject_weight": consensus["reject_weight"],
                    "total_weight": consensus["total_weight"],
                    "agent_count": len(votes)
                },
                "session_id": self.session_id,
                "decided_at": datetime.now(timezone.utc).isoformat()
            }
            
            await client.post(
                f"{self.supabase_url}/rest/v1/swarm_decisions",
                headers={**self.sb_headers, "Prefer": "return=minimal"},
                json=decision_record
            )
            
            # Save individual votes
            vote_records = []
            for v in votes:
                vote_records.append({
                    "decision_id": decision_id,
                    "agent_role": v["agent_role"],
                    "weight": v["weight"],
                    "vote": v["vote"],
                    "reasoning": v["reasoning"],
                    "confidence": v["confidence"],
                    "model_used": v["model_used"],
                    "response_time_ms": v["response_time_ms"]
                })
            
            await client.post(
                f"{self.supabase_url}/rest/v1/swarm_votes",
                headers={**self.sb_headers, "Prefer": "return=minimal"},
                json=vote_records
            )
    
    async def decide(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Full consensus pipeline:
        1. Load config from Supabase
        2. Generate decision ID
        3. Dispatch all agents in parallel
        4. Calculate weighted consensus
        5. Check ethics veto
        6. Save to Supabase
        7. Return result
        """
        # Load latest config
        await self.load_config()
        
        decision_id = f"swarm-{uuid.uuid4().hex[:12]}"
        context = context or {}
        context_str = json.dumps(context) if context else "No additional context."
        
        # Dispatch all agents in parallel
        tasks = [
            self._dispatch_agent(role, query, context_str)
            for role in self.weights.keys()
        ]
        votes = await asyncio.gather(*tasks)
        
        # Calculate consensus
        consensus = self._calculate_consensus(votes)
        
        # Save to Supabase
        await self._save_decision(decision_id, query, context, consensus, votes)
        
        return {
            "decision_id": decision_id,
            "query": query,
            "result": consensus["result"],
            "consensus_score": consensus["consensus_score"],
            "confidence": consensus["confidence"],
            "ethics_vetoed": consensus["ethics_vetoed"],
            "veto_reason": consensus["veto_reason"],
            "votes": [
                {
                    "agent": v["agent_role"],
                    "weight": v["weight"],
                    "vote": v["vote"],
                    "confidence": v["confidence"],
                    "reasoning": v["reasoning"],
                    "time_ms": v["response_time_ms"]
                }
                for v in votes
            ],
            "threshold": self.threshold,
            "session_id": self.session_id
        }
    
    async def get_history(self, limit: int = 10) -> List[Dict]:
        """Retrieve recent decisions from Supabase."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.supabase_url}/rest/v1/swarm_decisions?select=*&order=created_at.desc&limit={limit}",
                headers=self.sb_headers
            )
            return resp.json() if resp.status_code == 200 else []
