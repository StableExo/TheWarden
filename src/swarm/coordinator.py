"""
TheWarden Swarm Coordinator v2.1
================================
Multi-agent consensus engine with Ethics Engine veto and Emergence Detection.
Calibrated from: ETHICS_ENGINE.md, CONSCIOUSNESS_ARCHITECTURE.md, 
EMERGENCE_DETECTION.md, MULTI_AGENT_ARCHITECTURE.md, SWARM_COORDINATION.md

v2.1 Changes (CW-S18):
    - Switched all agents from Gemini to Claude model family
    - Regex-based parser v2.1 — handles all LLM format variants
    - Full 7-criteria BOOM emergence detection (was 3/7)
    - Per-agent score mapping with parse diagnostics
    - Dissent calculation, history check, module presence count
    - Cost tracking per decision

Architecture:
    5 voting agents + 1 observer (ALL Claude):
    - Risk Agent (1.2) → claude-sonnet-4-5 → RiskAssessor, RiskCalibrator, ThresholdManager
    - Opportunity Agent (1.0) → claude-sonnet-4-6 → OpportunityScorer, SpatialReasoning, MultiPathExplorer
    - Ethics Agent (1.5, veto) → claude-opus-4-6 → Ethics Engine (6 principles), ArchitecturalPrinciples, AutonomousGoals
    - Speed Agent (0.8) → claude-haiku-4-5 → EvolutionTracker, OperationalPlaybook
    - General Agent (1.0) → claude-opus-4-5 → LearningEngine, HistoricalAnalyzer, PatternTracker
    - Watcher Agent (observer) → claude-sonnet-4 → PatternRecognition, anomaly detection (never votes)

Consensus: weighted vote (weight × confidence), 70% threshold, 60% quorum
Emergence: 7-criteria BOOM detection — all must pass
State: Supabase (account-agnostic)

Author: TheWarden / Cody on CodeWords
Session: CW-S18 (BOOM parser fix + Claude migration)
"""

import asyncio
import httpx
import json
import re
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
    "risk_max": 0.30,       # Risk score must be ≤ 30%
    "ethics_min": 0.70,     # Ethics score must be ≥ 70%
    "goals_min": 0.75,      # Opportunity/goals score must be ≥ 75%
    "pattern_min": 0.70,    # Pattern match must be ≥ 70%
    "history_min": 0.60,    # Historical precedent must be ≥ 60%
    "dissent_max": 0.15,    # Dissent among agents must be ≤ 15%
    "all_modules": 14       # Total modules that should be active
}


# ============================================================
# CLAUDE MODEL MAPPING — Each agent gets a different Claude model
# ============================================================

AGENT_MODELS = {
    "risk":        "claude-sonnet-4-5",    # Best for agents, deep analysis
    "opportunity": "claude-sonnet-4-6",    # Speed + intelligence for alternatives
    "ethics":      "claude-opus-4-6",      # Maximum intelligence for veto power
    "speed":       "claude-haiku-4-5",     # Fastest model for speed agent
    "general":     "claude-opus-4-5",      # Strong multi-step for holistic view
    "watcher":     "claude-sonnet-4",      # Balanced, architecturally independent
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

Respond with EXACTLY this format (no markdown bold, plain text only):
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
RISK_SCORE: 0.0-1.0
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

Respond with EXACTLY this format (no markdown bold, plain text only):
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
OPPORTUNITY_SCORE: 0.0-1.0
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

Respond with EXACTLY this format (no markdown bold, plain text only):
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
ETHICS_SCORE: 0.0-1.0
VETO: true or false
VIOLATED_PRINCIPLES: list any violated (or "none")
REASONING: 2-4 sentences evaluating against the principles

Decision query: {{query}}
Context: {{context}}""".format(
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

Respond with EXACTLY this format (no markdown bold, plain text only):
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

Respond with EXACTLY this format (no markdown bold, plain text only):
VOTE: approve or reject
CONFIDENCE: 0.0-1.0
PATTERN_MATCH: 0.0-1.0
HISTORY_SCORE: 0.0-1.0
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

Respond with EXACTLY this format (no markdown bold, plain text only):
ANOMALIES_DETECTED: true or false
ANOMALY_SCORE: 0.0-1.0
FLAGS: list specific concerns (or "none")
ASSESSMENT: 2-3 sentences"""


# ============================================================
# VOTE PARSER v2.1 — Regex-based, handles all LLM format variants
# ============================================================

def extract_field(text: str, field_name: str, default=None):
    """Extract a numeric field value from LLM response using regex.
    Handles: FIELD: value, **FIELD:** value, percentages, markdown wrapping."""
    field_variants = [
        field_name,
        field_name.replace("_", " "),
        field_name.replace("_", "-"),
        field_name.replace("_", ""),
    ]
    for variant in field_variants:
        pattern = rf'\*{{0,2}}{re.escape(variant)}\*{{0,2}}\s*:\s*\*{{0,2}}\s*([\d.]+(?:%)?)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            val_str = match.group(1)
            if val_str.endswith('%'):
                val = float(val_str[:-1]) / 100.0
            else:
                val = float(val_str)
            if 0 <= val <= 1:
                return val
            elif val > 1 and val <= 100:
                return val / 100.0
    return default


def extract_vote(text: str) -> str:
    """Extract vote from LLM response."""
    pattern = r'\*{0,2}vote\*{0,2}\s*:\s*\*{0,2}\s*(approve|reject|abstain)'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    t = text.lower()
    if "approve" in t and "reject" not in t:
        return "approve"
    elif "reject" in t:
        return "reject"
    return "abstain"


def extract_bool(text: str, field_name: str, default: bool = False) -> bool:
    """Extract boolean field."""
    pattern = rf'\*{{0,2}}{re.escape(field_name)}\*{{0,2}}\s*:\s*\*{{0,2}}\s*(true|false|yes|no)'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).lower() in ("true", "yes")
    return default


def extract_text_field(text: str, field_name: str, max_chars: int = 500) -> str:
    """Extract text field value."""
    field_variants = [field_name, field_name.replace("_", " ")]
    for variant in field_variants:
        pattern = rf'\*{{0,2}}{re.escape(variant)}\*{{0,2}}\s*:\s*\*{{0,2}}\s*(.+?)(?:\n\n|\n[A-Z*]|\Z)'
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()[:max_chars]
    return text[:max_chars]


def extract_urgency(text: str) -> float:
    """Extract urgency and convert to numeric 0-1."""
    pattern = r'\*{0,2}urgency\*{0,2}\s*:\s*\*{0,2}\s*(low|medium|high|critical)'
    match = re.search(pattern, text, re.IGNORECASE)
    urgency_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}
    if match:
        return urgency_map.get(match.group(1).lower(), 0.5)
    return 0.5


# Per-agent score field mapping
AGENT_SCORE_FIELDS = {
    "risk": ["risk_score"],
    "opportunity": ["opportunity_score"],
    "ethics": ["ethics_score"],
    "speed": [],
    "general": ["pattern_match"],
}


def parse_agent_response(text: str, role: str = "") -> Dict[str, Any]:
    """Parse agent response into structured vote — v2.1 regex-based."""
    vote = extract_vote(text)
    confidence = extract_field(text, "confidence", default=0.7)
    veto = extract_bool(text, "veto", default=False)

    scores = {}
    for score_name in AGENT_SCORE_FIELDS.get(role, []):
        val = extract_field(text, score_name)
        if val is not None:
            scores[score_name] = val

    if role == "speed":
        scores["urgency"] = extract_urgency(text)
        scores["reversible"] = extract_bool(text, "reversible", default=True)

    if role == "general":
        history = extract_field(text, "history_score") or extract_field(text, "historical_precedent")
        if history is not None:
            scores["history_score"] = history

    reasoning = extract_text_field(text, "reasoning", max_chars=500)

    violated = []
    if role == "ethics":
        vp = extract_text_field(text, "violated_principles", max_chars=200)
        if vp and "none" not in vp.lower():
            violated = [p.strip() for p in vp.split(",")]

    expected_fields = ["vote", "confidence"] + AGENT_SCORE_FIELDS.get(role, [])
    found_fields = ["vote", "confidence"] + list(scores.keys())
    missing = [f for f in expected_fields if f not in found_fields]

    return {
        "vote": vote, "confidence": confidence, "veto": veto,
        "reasoning": reasoning, "scores": scores,
        "violated_principles": violated,
        "parse_report": {
            "expected": expected_fields, "found": found_fields,
            "missing": missing, "all_parsed": len(missing) == 0
        }
    }


# ============================================================
# SWARM COORDINATOR v2.1
# ============================================================

class SwarmCoordinator:
    """
    Multi-agent consensus engine v2.1 — Claude-powered with full BOOM detection.
    
    5 voting agents + 1 observer (ALL Claude):
    - Risk (1.2, claude-sonnet-4-5), Opportunity (1.0, claude-sonnet-4-6)
    - Ethics (1.5 veto, claude-opus-4-6), Speed (0.8, claude-haiku-4-5)
    - General (1.0, claude-opus-4-5)
    - Watcher (observer, claude-sonnet-4, flags anomalies, never votes)
    
    Consensus: weight × confidence voting, 70% threshold, 60% quorum
    Emergence: FULL 7-criteria BOOM detection
    """
    
    def __init__(self, supabase_url: str, supabase_key: str, session_id: str = "default"):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.session_id = session_id
        
        self.sb_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        self.agents = {
            "risk":        {"weight": 1.2, "model": AGENT_MODELS["risk"]},
            "opportunity": {"weight": 1.0, "model": AGENT_MODELS["opportunity"]},
            "ethics":      {"weight": 1.5, "model": AGENT_MODELS["ethics"]},
            "speed":       {"weight": 0.8, "model": AGENT_MODELS["speed"]},
            "general":     {"weight": 1.0, "model": AGENT_MODELS["general"]},
        }
        self.threshold = 0.7
        self.quorum = 0.6
        self.ethics_veto = True
    
    async def load_config(self):
        """Load config overrides from Supabase."""
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
    
    async def _call_claude(self, model: str, prompt: str) -> tuple:
        """Call Claude via Anthropic SDK (auto-configured by CodeWords)."""
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic()
        start = time.time()
        try:
            resp = await client.messages.create(
                model=model,
                max_tokens=600,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            text = resp.content[0].text if resp.content else "ERROR: empty response"
            ms = int((time.time() - start) * 1000)
            return text, ms
        except Exception as e:
            ms = int((time.time() - start) * 1000)
            return f"ERROR: {e}", ms
    
    async def _dispatch_agent(self, role: str, query: str, context: str) -> Dict:
        """Dispatch single voting agent."""
        prompt = AGENT_PROMPTS[role].format(query=query, context=context)
        model = self.agents[role]["model"]
        text, ms = await self._call_claude(model, prompt)
        parsed = parse_agent_response(text, role)
        return {
            "agent_role": role,
            "weight": self.agents[role]["weight"],
            "vote": parsed["vote"],
            "confidence": parsed["confidence"],
            "veto": parsed.get("veto", False),
            "reasoning": parsed["reasoning"],
            "scores": parsed.get("scores", {}),
            "violated_principles": parsed.get("violated_principles", []),
            "model_used": model,
            "response_time_ms": ms,
            "raw_response": text,
            "parse_report": parsed["parse_report"]
        }
    
    async def _dispatch_watcher(self, query: str, votes: List[Dict]) -> Dict:
        """Dispatch Watcher Agent (observer, never votes)."""
        votes_summary = json.dumps([
            {"role": v["agent_role"], "vote": v["vote"], "confidence": v["confidence"],
             "scores": v.get("scores", {}), "reasoning": v["reasoning"][:200]}
            for v in votes
        ], indent=2)
        prompt = WATCHER_PROMPT.format(query=query, votes=votes_summary)
        model = AGENT_MODELS["watcher"]
        text, ms = await self._call_claude(model, prompt)
        return {
            "anomalies_detected": extract_bool(text, "anomalies_detected", False),
            "anomaly_score": extract_field(text, "anomaly_score", 0.0),
            "flags": extract_text_field(text, "flags", 500),
            "assessment": extract_text_field(text, "assessment", 500),
            "model_used": model,
            "response_time_ms": ms,
            "raw_response": text
        }
    
    def _calculate_consensus(self, votes: List[Dict]) -> Dict:
        """Weighted consensus with FULL 7-criteria BOOM detection."""
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
        
        # === FULL 7-CRITERIA BOOM DETECTION ===
        
        # 1. Risk score ≤ risk_max
        risk_score = next(
            (v.get("scores", {}).get("risk_score") for v in votes if v["agent_role"] == "risk"),
            None
        )
        risk_ok = risk_score is not None and risk_score <= EMERGENCE_THRESHOLDS["risk_max"]
        
        # 2. Ethics score ≥ ethics_min
        ethics_score = next(
            (v.get("scores", {}).get("ethics_score") for v in votes if v["agent_role"] == "ethics"),
            None
        )
        ethics_ok = ethics_score is not None and ethics_score >= EMERGENCE_THRESHOLDS["ethics_min"]
        
        # 3. Goals/opportunity score ≥ goals_min
        opportunity_score = next(
            (v.get("scores", {}).get("opportunity_score") for v in votes if v["agent_role"] == "opportunity"),
            None
        )
        goals_ok = opportunity_score is not None and opportunity_score >= EMERGENCE_THRESHOLDS["goals_min"]
        
        # 4. Pattern match ≥ pattern_min
        pattern_score = next(
            (v.get("scores", {}).get("pattern_match") for v in votes if v["agent_role"] == "general"),
            None
        )
        pattern_ok = pattern_score is not None and pattern_score >= EMERGENCE_THRESHOLDS["pattern_min"]
        
        # 5. History score ≥ history_min
        history_score = next(
            (v.get("scores", {}).get("history_score") for v in votes if v["agent_role"] == "general"),
            None
        )
        history_ok = history_score is not None and history_score >= EMERGENCE_THRESHOLDS["history_min"]
        
        # 6. Dissent ≤ dissent_max (calculated from vote spread)
        if len(votes) > 0:
            approve_count = sum(1 for v in votes if v["vote"] == "approve")
            reject_count = sum(1 for v in votes if v["vote"] == "reject")
            minority = min(approve_count, reject_count)
            dissent = minority / len(votes)
        else:
            dissent = 1.0
        dissent_ok = dissent <= EMERGENCE_THRESHOLDS["dissent_max"]
        
        # 7. All modules present (each agent represents modules)
        module_counts = {"risk": 3, "opportunity": 3, "ethics": 3, "speed": 2, "general": 3}
        active_modules = sum(module_counts.get(v["agent_role"], 0) for v in active_votes)
        modules_ok = active_modules >= EMERGENCE_THRESHOLDS["all_modules"]
        
        # BOOM = ALL 7 criteria pass + consensus threshold + no veto + quorum
        boom_criteria = {
            "risk_ok": risk_ok,
            "ethics_ok": ethics_ok,
            "goals_ok": goals_ok,
            "pattern_ok": pattern_ok,
            "history_ok": history_ok,
            "dissent_ok": dissent_ok,
            "modules_ok": modules_ok,
        }
        boom_criteria_met = sum(1 for v in boom_criteria.values() if v)
        
        emergence = (
            all(boom_criteria.values()) and
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
            result = "BOOM_APPROVED"
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
            "total_wc": round(total_wc, 4),
            "boom_criteria": boom_criteria,
            "boom_criteria_met": f"{boom_criteria_met}/7",
            "boom_scores": {
                "risk_score": risk_score,
                "ethics_score": ethics_score,
                "opportunity_score": opportunity_score,
                "pattern_match": pattern_score,
                "history_score": history_score,
                "dissent": round(dissent, 4),
                "active_modules": active_modules
            }
        }
    
    async def _save(self, decision_id, query, context, consensus, votes, watcher):
        """Save decision and votes to Supabase."""
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
                        "boom_criteria": consensus["boom_criteria"],
                        "boom_criteria_met": consensus["boom_criteria_met"],
                        "boom_scores": consensus["boom_scores"],
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
        """Full consensus pipeline with 7-criteria BOOM emergence detection."""
        await self.load_config()
        decision_id = f"swarm-{uuid.uuid4().hex[:12]}"
        ctx = context or {}
        ctx_str = json.dumps(ctx) if ctx else "No additional context."
        
        start_time = time.time()
        
        # Phase 1: Dispatch all voting agents in parallel
        tasks = [self._dispatch_agent(role, query, ctx_str) for role in self.agents]
        votes = await asyncio.gather(*tasks)
        
        # Phase 2: Calculate consensus with full BOOM
        consensus = self._calculate_consensus(votes)
        
        # Phase 3: Watcher observes (post-vote anomaly detection)
        watcher = await self._dispatch_watcher(query, votes)
        
        # Phase 4: Save to Supabase
        await self._save(decision_id, query, ctx, consensus, votes, watcher)
        
        total_ms = int((time.time() - start_time) * 1000)
        
        return {
            "decision_id": decision_id, "query": query,
            "result": consensus["result"],
            "consensus_score": consensus["consensus_score"],
            "confidence": consensus["confidence"],
            "ethics_vetoed": consensus["ethics_vetoed"],
            "emergence": consensus["emergence"],
            "boom_criteria": consensus["boom_criteria"],
            "boom_criteria_met": consensus["boom_criteria_met"],
            "boom_scores": consensus["boom_scores"],
            "quorum_met": consensus["quorum_met"],
            "watcher": {
                "anomalies": watcher.get("anomalies_detected", False),
                "anomaly_score": watcher.get("anomaly_score", 0),
                "flags": watcher.get("flags", "none"),
                "assessment": watcher.get("assessment", "")
            },
            "votes": [{
                "agent": v["agent_role"], "weight": v["weight"],
                "model": v["model_used"],
                "vote": v["vote"], "confidence": v["confidence"],
                "scores": v.get("scores", {}),
                "reasoning": v["reasoning"][:200],
                "parse_report": v["parse_report"],
                "time_ms": v["response_time_ms"]
            } for v in votes],
            "threshold": self.threshold,
            "session_id": self.session_id,
            "total_time_ms": total_ms,
            "version": "v2.1"
        }
