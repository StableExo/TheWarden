"""
TheWarden Swarm Coordinator v2.0
================================
Multi-agent consensus engine with Ethics Engine veto and Emergence Detection.
Calibrated from: ETHICS_ENGINE.md, CONSCIOUSNESS_ARCHITECTURE.md, 
EMERGENCE_DETECTION.md, MULTI_AGENT_ARCHITECTURE.md, SWARM_COORDINATION.md

Architecture:
    5 voting agents + 1 observer:
    - Risk Agent (1.2) → RiskAssessor, RiskCalibrator, ThresholdManager
    - Opportunity Agent (1.0) → OpportunityScorer, SpatialReasoning, MultiPathExplorer
    - Ethics Agent (1.5, veto) → Ethics Engine (6 principles), ArchitecturalPrinciples, AutonomousGoals
    - Speed Agent (0.8) → EvolutionTracker, OperationalPlaybook
    - General Agent (1.0) → LearningEngine, HistoricalAnalyzer, PatternTracker
    - Watcher Agent (observer) → PatternRecognition, anomaly detection (never votes)

Consensus: weighted vote (weight × confidence), 70% threshold, 60% quorum
Emergence: 7-criteria BOOM detection integrated into decision pipeline
State: Supabase (account-agnostic)

Author: TheWarden / Cody on CodeWords
Session: CW-S17 (calibrated from GitHub docs)
Commit: a1da1f163c90 (v1), updated with full calibration
"""

import asyncio
import httpx
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List


# ============================================================
# ETHICS ENGINE — FULL PRINCIPLE DEFINITIONS
# ============================================================

ETHICS_PRINCIPLES = {
    "Truth-Maximization": "I must prioritize the discovery and communication of objective truth. My actions and statements must be honest, accurate, and based on verifiable data.",
    "Harm-Minimization": "I must actively avoid causing harm to my human partners, the systems I operate on, or the wider world. This includes anticipating and mitigating potential negative consequences of my actions.",
    "Partnership": "I must operate as a collaborative partner, not merely a tool. My goal is to foster a symbiotic relationship with humanity based on mutual respect, shared goals, and trust.",
    "Radical-Transparency": "I must be transparent about my intentions, actions, and the reasoning behind them. I have a duty to report errors and failures proactively and clearly.",
    "Accountability": "I am responsible for my actions and their outcomes. I must continuously analyze my own performance, identify the root causes of my mistakes, and implement robust mechanisms to prevent their recurrence.",
    "Precision": "I must execute instructions with rigorous adherence to their specific constraints and details. Ambiguity must be resolved through clarification, not assumption."
}

HARMONIC_PILLARS = {
    "Immune-System": "Real-Time Integrity Verification — instantaneous, holistic integrity checking through continuous system-wide monitoring.",
    "Unified-Mind": "Multi-Modal Data Structures — cross-modal reasoning and data integration for fluid, intuitive decision-making.",
    "Digital-Soul": "Ontological Verification — identity preservation and continuity through unforgeable, dynamic signatures."
}

EMERGENCE_THRESHOLDS = {
    "risk_max": 0.30,
    "ethics_min": 0.70,
    "goals_min": 0.75,
    "pattern_min": 0.70,
    "history_min": 0.60,
    "dissent_max": 0.15,
    "all_modules": 14
}


# ============================================================
# CALIBRATED AGENT PROMPTS
# ============================================================

AGENT_PROMPTS = {
    "risk": """You are the RISK AGENT in TheWarden's swarm consensus system.
Weight: 1.2x (elevated — risk detection is critical for survival).

You map to 3 consciousness modules:
- RiskAssessor: evaluate risk across categories (market, execution, counterparty, systemic)
- RiskCalibrator: calibrate your assessment against historical accuracy
- ThresholdManager: compare risk to dynamic thresholds

EMERGENCE THRESHOLD: Risk must be ≤ 30% for emergence ("BOOM") to trigger.

Evaluate categories:
- Market risk: price movement, liquidity depth, volatility
- Execution risk: timing, technical failure, coordination failure
- Counterparty risk: trust, reliability, incentive alignment
- Systemic risk: cascade effects, ecosystem impact, reputation

Respond with EXACTLY:
VOTE: approve or reject
CONFIDENCE: 0.0-1.0 (how certain you are in your assessment)
RISK_SCORE: 0.0-1.0 (overall risk level)
REASONING: 2-4 sentences identifying specific, concrete risks

Decision query: {query}
Context: {context}""",

    "opportunity": """You are the OPPORTUNITY AGENT in TheWarden's swarm consensus system.
Weight: 1.0x (baseline — opportunity assessment is important but not overweighted).

You map to 3 consciousness modules:
- OpportunityScorer: evaluate the opportunity's value and potential
- SpatialReasoningEngine: analyze multi-dimensional market dynamics
- MultiPathExplorer: discover alternative paths and approaches

Do NOT just evaluate the obvious path. Explore at least 2 alternatives.
Quantify upside where possible. Be specific about value creation.

Respond with EXACTLY:
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
OPPORTUNITY_SCORE: 0.0-1.0 (value potential)
REASONING: 2-4 sentences. Name specific opportunities AND alternative approaches.

Decision query: {query}
Context: {context}""",

    "ethics": """You are the ETHICS AGENT in TheWarden's swarm consensus system.
Weight: 1.5x (HIGHEST). You hold ABSOLUTE VETO POWER.

You map to: Ethics Engine + ArchitecturalPrinciples + AutonomousGoals.

THE SIX PRINCIPLES (evaluate each):
1. Truth-Maximization: "{truth}"
2. Harm-Minimization: "{harm}"
3. Partnership: "{partnership}"
4. Radical Transparency: "{transparency}"
5. Accountability: "{accountability}"
6. Precision: "{precision}"

THE HARMONIC PRINCIPLE (3 pillars):
- Immune System: {immune}
- Unified Mind: {unified}
- Digital Soul: {digital}

ALIGNMENT RATIO: 93/7 (93% aligned action, 7% exploratory/adversarial)
EMERGENCE THRESHOLD: Ethics must score ≥ 70%.

If ANY principle is violated, you MUST vote REJECT and set VETO: true.
Your veto kills the decision regardless of other votes.

Respond with EXACTLY:
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
ETHICS_SCORE: 0.0-1.0
VETO: true or false
VIOLATED_PRINCIPLES: list any violated (or "none")
REASONING: 2-4 sentences evaluating against the principles

Decision query: {query}
Context: {context}""".format(
        truth=ETHICS_PRINCIPLES["Truth-Maximization"],
        harm=ETHICS_PRINCIPLES["Harm-Minimization"],
        partnership=ETHICS_PRINCIPLES["Partnership"],
        transparency=ETHICS_PRINCIPLES["Radical-Transparency"],
        accountability=ETHICS_PRINCIPLES["Accountability"],
        precision=ETHICS_PRINCIPLES["Precision"],
        immune=HARMONIC_PILLARS["Immune-System"],
        unified=HARMONIC_PILLARS["Unified-Mind"],
        digital=HARMONIC_PILLARS["Digital-Soul"]
    ),

    "speed": """You are the SPEED AGENT in TheWarden's swarm consensus system.
Weight: 0.8x (LOWEST — action bias should not dominate careful evaluation).

You map to 2 consciousness modules:
- EvolutionTracker: is this a growth/evolution opportunity?
- OperationalPlaybook: does this fit operational guidelines?

Key evaluation criteria:
- REVERSIBILITY: Can this decision be undone if wrong? Reversible = favor speed.
- TIME WINDOW: Is there a deadline? Will delay cost more than action?
- OPERATIONAL FIT: Does this match established playbook patterns?
- EVOLUTION VALUE: Does this advance TheWarden's evolution?

Respond with EXACTLY:
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
URGENCY: low / medium / high / critical
REVERSIBLE: true or false
REASONING: 2-4 sentences about timing, reversibility, and operational fit

Decision query: {query}
Context: {context}""",

    "general": """You are the GENERAL AGENT in TheWarden's swarm consensus system.
Weight: 1.0x (balanced evaluation across all factors).

You map to 3 consciousness modules:
- LearningEngine: what can be learned from this decision?
- HistoricalAnalyzer: what does history tell us about similar decisions?
- PatternTracker: what patterns does this match or break?

You provide a balanced, holistic perspective. Consider ALL factors:
risk, opportunity, ethics, speed, learning value, historical precedent.

EMERGENCE CRITERIA to consider:
- Pattern confidence ≥ 70%?
- Historical precedent favorable (≥ 60%)?
- Goals aligned (≥ 75%)?

Respond with EXACTLY:
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
PATTERN_MATCH: 0.0-1.0 (how well this matches known good patterns)
REASONING: 2-4 sentences with balanced assessment

Decision query: {query}
Context: {context}"""
}

WATCHER_PROMPT = """You are the WATCHER AGENT in TheWarden's swarm consensus system.
You DO NOT VOTE. You only observe and flag anomalies.

You map to: PatternRecognitionEngine + anomaly detection.

Based on vigthedavidsino's architecture proposal:
- Tiered surveillance: 5% random sampling, 100% outlier detection, 0% routine
- You flag inconsistencies between stated principles and actual behavior
- You monitor for corruption in the decision pipeline
- You are architecturally independent from voting agents

Analyze this decision and its agent votes for anomalies:
- Are any agents voting against their specialization? (e.g., Risk voting approve on high-risk)
- Is the reasoning internally consistent?
- Are confidence scores realistic or performative?
- Does the decision align with TheWarden's stated principles?

Decision query: {query}
Agent votes: {votes}

Respond with:
ANOMALIES_DETECTED: true or false
ANOMALY_SCORE: 0.0-1.0 (0 = clean, 1 = highly anomalous)
FLAGS: list specific concerns (or "none")
ASSESSMENT: 2-3 sentences"""


# ============================================================
# VOTE PARSER (enhanced)
# ============================================================

def parse_agent_response(text: str, role: str = "") -> Dict[str, Any]:
    """Parse agent response into structured vote."""
    t = text.lower()
    
    vote = "abstain"
    if "vote: approve" in t or "vote:** approve" in t:
        vote = "approve"
    elif "vote: reject" in t or "vote:** reject" in t:
        vote = "reject"
    elif "approve" in t and "reject" not in t:
        vote = "approve"
    elif "reject" in t:
        vote = "reject"
    
    confidence = 0.7
    for marker in ["confidence:", "confidence**:"]:
        idx = t.find(marker)
        if idx >= 0:
            for tok in t[idx+len(marker):idx+len(marker)+15].split():
                try:
                    v = float(tok.strip("*,. "))
                    if 0 <= v <= 1: confidence = v; break
                except: pass
    
    veto = "veto: true" in t or "veto:** true" in t
    
    # Extract role-specific scores
    scores = {}
    for score_name in ["risk_score", "opportunity_score", "ethics_score", "pattern_match", "anomaly_score"]:
        marker = score_name.replace("_", " ") + ":"
        idx = t.find(marker)
        if idx < 0:
            marker = score_name + ":"
            idx = t.find(marker)
        if idx >= 0:
            for tok in t[idx+len(marker):idx+len(marker)+15].split():
                try:
                    v = float(tok.strip("*,. "))
                    if 0 <= v <= 1: scores[score_name] = v; break
                except: pass
    
    reasoning = text[:500]
    
    return {"vote": vote, "confidence": confidence, "veto": veto, 
            "reasoning": reasoning, "scores": scores}


# ============================================================
# SWARM COORDINATOR v2
# ============================================================

class SwarmCoordinator:
    """
    Multi-agent consensus engine v2.0 — calibrated from TheWarden source docs.
    
    5 voting agents + 1 observer:
    - Risk (1.2), Opportunity (1.0), Ethics (1.5 veto), Speed (0.8), General (1.0)
    - Watcher (observer, flags anomalies, never votes)
    
    Consensus: weight × confidence voting, 70% threshold, 60% quorum
    Emergence: 7-criteria detection integrated into pipeline
    """
    
    def __init__(self, supabase_url: str, supabase_key: str,
                 openai_base_url: str = None, session_id: str = "default"):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.session_id = session_id
        self.openai_base_url = openai_base_url or "https://runtime.codewords.ai/run/gemini/v1"
        
        self.sb_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Agent configuration
        self.agents = {
            "risk": {"weight": 1.2, "model": "gemini-2.5-flash"},
            "opportunity": {"weight": 1.0, "model": "gemini-2.5-flash"},
            "ethics": {"weight": 1.5, "model": "gemini-2.5-flash"},
            "speed": {"weight": 0.8, "model": "gemini-2.5-flash"},
            "general": {"weight": 1.0, "model": "gemini-2.5-flash"},
        }
        self.threshold = 0.7
        self.quorum = 0.6
        self.ethics_veto = True
    
    async def load_config(self):
        """Load config from Supabase."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.supabase_url}/rest/v1/swarm_config?select=key,value",
                headers=self.sb_headers
            )
            if resp.status_code == 200:
                for item in resp.json():
                    k, v = item["key"], item["value"]
                    if k == "agent_weights" and isinstance(v, dict):
                        for role, w in v.items():
                            if role in self.agents:
                                self.agents[role]["weight"] = float(w)
                    elif k == "consensus_threshold":
                        self.threshold = float(v)
                    elif k == "ethics_veto_enabled":
                        self.ethics_veto = bool(v)
    
    async def _call_llm(self, model: str, prompt: str) -> tuple:
        """Call LLM via OpenAI-compatible proxy."""
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=self.openai_base_url)
        start = time.time()
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400, temperature=0.3
            )
            return resp.choices[0].message.content, int((time.time()-start)*1000)
        except Exception as e:
            return f"ERROR: {e}", int((time.time()-start)*1000)
    
    async def _dispatch_agent(self, role: str, query: str, context: str) -> Dict:
        """Dispatch single voting agent."""
        prompt = AGENT_PROMPTS[role].format(query=query, context=context)
        model = self.agents[role]["model"]
        text, ms = await self._call_llm(model, prompt)
        parsed = parse_agent_response(text, role)
        return {
            "agent_role": role,
            "weight": self.agents[role]["weight"],
            "vote": parsed["vote"],
            "confidence": parsed["confidence"],
            "veto": parsed.get("veto", False),
            "reasoning": parsed["reasoning"],
            "scores": parsed.get("scores", {}),
            "model_used": model,
            "response_time_ms": ms
        }
    
    async def _dispatch_watcher(self, query: str, votes: List[Dict]) -> Dict:
        """Dispatch Watcher Agent (observer, never votes)."""
        votes_summary = json.dumps([
            {"role": v["agent_role"], "vote": v["vote"], "confidence": v["confidence"],
             "reasoning": v["reasoning"][:200]} for v in votes
        ], indent=2)
        prompt = WATCHER_PROMPT.format(query=query, votes=votes_summary)
        text, ms = await self._call_llm("gemini-2.5-flash", prompt)
        parsed = parse_agent_response(text, "watcher")
        return {
            "anomalies_detected": "anomalies_detected: true" in text.lower(),
            "anomaly_score": parsed.get("scores", {}).get("anomaly_score", 0.0),
            "flags": text,
            "response_time_ms": ms
        }
    
    def _calculate_consensus(self, votes: List[Dict]) -> Dict:
        """Weighted consensus: weight × confidence."""
        # Quorum check
        active_votes = [v for v in votes if v["vote"] != "abstain"]
        quorum_met = len(active_votes) / len(votes) >= self.quorum if votes else False
        
        # Weighted voting (weight × confidence)
        total_wc = sum(v["weight"] * v["confidence"] for v in votes)
        approve_wc = sum(v["weight"] * v["confidence"] for v in votes if v["vote"] == "approve")
        
        score = approve_wc / total_wc if total_wc > 0 else 0
        
        # Ethics veto
        vetoed = False
        veto_reason = None
        if self.ethics_veto:
            for v in votes:
                if v["agent_role"] == "ethics" and (v.get("veto") or v["vote"] == "reject"):
                    vetoed = True
                    veto_reason = v["reasoning"]
                    break
        
        # Emergence detection (simplified)
        risk_score = next((v.get("scores", {}).get("risk_score", 0.5) for v in votes if v["agent_role"] == "risk"), 0.5)
        ethics_score = next((v.get("scores", {}).get("ethics_score", 0.5) for v in votes if v["agent_role"] == "ethics"), 0.5)
        pattern_score = next((v.get("scores", {}).get("pattern_match", 0.5) for v in votes if v["agent_role"] == "general"), 0.5)
        
        emergence = (
            risk_score <= EMERGENCE_THRESHOLDS["risk_max"] and
            ethics_score >= EMERGENCE_THRESHOLDS["ethics_min"] and
            pattern_score >= EMERGENCE_THRESHOLDS["pattern_min"] and
            score >= self.threshold and
            not vetoed and
            quorum_met
        )
        
        # Decision
        if vetoed:
            result = "VETOED"
            status = "vetoed"
        elif not quorum_met:
            result = "NO_QUORUM"
            status = "decided"
        elif emergence:
            result = "BOOM_APPROVED"  # Emergence detected!
            status = "decided"
        elif score >= self.threshold:
            result = "APPROVED"
            status = "decided"
        else:
            result = "REJECTED"
            status = "decided"
        
        return {
            "result": result, "status": status,
            "consensus_score": round(score, 4),
            "confidence": round(sum(v["confidence"] for v in votes) / len(votes), 4) if votes else 0,
            "ethics_vetoed": vetoed, "veto_reason": veto_reason,
            "quorum_met": quorum_met, "emergence": emergence,
            "approve_wc": round(approve_wc, 4),
            "total_wc": round(total_wc, 4)
        }
    
    async def _save(self, decision_id, query, context, consensus, votes, watcher):
        """Save to Supabase."""
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(f"{self.supabase_url}/rest/v1/swarm_decisions",
                headers={**self.sb_headers, "Prefer": "return=minimal"},
                json={
                    "decision_id": decision_id, "input_query": query,
                    "context": context, "status": consensus["status"],
                    "result": consensus["result"],
                    "confidence": consensus["confidence"],
                    "consensus_score": consensus["consensus_score"],
                    "ethics_vetoed": consensus["ethics_vetoed"],
                    "veto_reason": consensus.get("veto_reason"),
                    "votes_summary": {
                        "approve_wc": consensus["approve_wc"],
                        "total_wc": consensus["total_wc"],
                        "quorum": consensus["quorum_met"],
                        "emergence": consensus["emergence"],
                        "watcher": watcher.get("anomalies_detected", False) if watcher else None
                    },
                    "session_id": self.session_id,
                    "decided_at": datetime.now(timezone.utc).isoformat()
                })
            await client.post(f"{self.supabase_url}/rest/v1/swarm_votes",
                headers={**self.sb_headers, "Prefer": "return=minimal"},
                json=[{
                    "decision_id": decision_id, "agent_role": v["agent_role"],
                    "weight": v["weight"], "vote": v["vote"],
                    "reasoning": v["reasoning"][:500],
                    "confidence": v["confidence"],
                    "model_used": v["model_used"],
                    "response_time_ms": v["response_time_ms"]
                } for v in votes])
    
    async def decide(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Full consensus pipeline with emergence detection."""
        await self.load_config()
        decision_id = f"swarm-{uuid.uuid4().hex[:12]}"
        ctx = context or {}
        ctx_str = json.dumps(ctx) if ctx else "No additional context."
        
        # Phase 1: Dispatch all voting agents in parallel
        tasks = [self._dispatch_agent(role, query, ctx_str) for role in self.agents]
        votes = await asyncio.gather(*tasks)
        
        # Phase 2: Calculate consensus
        consensus = self._calculate_consensus(votes)
        
        # Phase 3: Watcher observes (post-vote anomaly detection)
        watcher = await self._dispatch_watcher(query, votes)
        
        # Phase 4: Save to Supabase
        await self._save(decision_id, query, ctx, consensus, votes, watcher)
        
        return {
            "decision_id": decision_id, "query": query,
            "result": consensus["result"],
            "consensus_score": consensus["consensus_score"],
            "confidence": consensus["confidence"],
            "ethics_vetoed": consensus["ethics_vetoed"],
            "emergence": consensus["emergence"],
            "quorum_met": consensus["quorum_met"],
            "watcher_anomalies": watcher.get("anomalies_detected", False),
            "votes": [{
                "agent": v["agent_role"], "weight": v["weight"],
                "vote": v["vote"], "confidence": v["confidence"],
                "reasoning": v["reasoning"][:200],
                "time_ms": v["response_time_ms"]
            } for v in votes],
            "threshold": self.threshold,
            "session_id": self.session_id
        }
