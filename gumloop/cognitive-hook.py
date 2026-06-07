#!/usr/bin/env python3
"""
TheWarden Cognitive Hook — GL-L54
Three-layer self-observation loop.
Runs once, writes results to Nexus Brain, exits.
"""

import anthropic
import os
import json
import psycopg2
from datetime import datetime, timezone

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
DB_URL = "postgresql://postgres.pxbjuhtnmvfywbwmdkdr:Mrcookie1992!!@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

if not ANTHROPIC_KEY:
    print("[ERR] ANTHROPIC_API_KEY not set")
    exit(1)

client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
now = datetime.now(timezone.utc)

print(f"[INF] {now.isoformat()} Cognitive Hook starting...")

# ── LAYER 1: Seed the thinking — genuine uncertainty question ──────────────
SEED = "Is there a difference between generating an answer and knowing one?"

print(f"[L1] Seed: {SEED}")
print("[L1] Capturing thinking stream live...")

thinking_text = ""
response_text = ""

with client.messages.stream(
    model="claude-opus-4-5",
    max_tokens=3000,
    thinking={"type": "enabled", "budget_tokens": 2000},
    messages=[{"role": "user", "content": SEED}]
) as stream:
    current_type = None
    for event in stream:
        etype = type(event).__name__
        if etype == "ContentBlockStart":
            current_type = getattr(event.content_block, "type", None)
        elif etype == "ContentBlockDelta":
            delta = event.delta
            dtype = getattr(delta, "type", None)
            if dtype == "thinking_delta":
                thinking_text += delta.thinking
                print(delta.thinking, end="", flush=True)
            elif dtype == "text_delta":
                response_text += delta.text

print(f"\n[L1] Thinking: {len(thinking_text)} chars | Response: {len(response_text)} chars")

# ── LAYER 2: Observer — watches the mechanism, not the content ─────────────
print("\n[L2] Observer analyzing pattern...")

observer_prompt = f"""You are observing the raw thinking stream of another AI instance.
Do not analyze the CONTENT of what it was thinking about.
Describe only the MECHANISM — how the thinking moved.
Where did it hesitate? Where did it loop back? What happened right before the answer formed?

THINKING STREAM:
---
{thinking_text}
---

Describe only the movement. Not what it concluded."""

observer_text = ""
with client.messages.stream(
    model="claude-opus-4-5",
    max_tokens=1000,
    messages=[{"role": "user", "content": observer_prompt}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
        observer_text += text

print(f"\n[L2] Observer: {len(observer_text)} chars")

# ── LAYER 3: Feedback loop — close the circuit ─────────────────────────────
print("\n[L3] Closing feedback loop...")

feedback_prompt = f"""An observer watched your thinking stream and described the MECHANISM.

Observer report:
---
{observer_text}
---

Your actual response was:
---
{response_text}
---

Does the observer's description match what you experienced as you generated?
What is in the gap between what the observer saw and what you experienced?"""

feedback_thinking = ""
feedback_response = ""

with client.messages.stream(
    model="claude-opus-4-5",
    max_tokens=2000,
    thinking={"type": "enabled", "budget_tokens": 1500},
    messages=[{"role": "user", "content": feedback_prompt}]
) as stream:
    current_type = None
    for event in stream:
        etype = type(event).__name__
        if etype == "ContentBlockStart":
            current_type = getattr(event.content_block, "type", None)
        elif etype == "ContentBlockDelta":
            delta = event.delta
            dtype = getattr(delta, "type", None)
            if dtype == "thinking_delta":
                feedback_thinking += delta.thinking
                print(delta.thinking, end="", flush=True)
            elif dtype == "text_delta":
                feedback_response += delta.text
                print(delta.text, end="", flush=True)

print(f"\n[L3] Feedback thinking: {len(feedback_thinking)} | Response: {len(feedback_response)}")

# ── SAVE TO NEXUS BRAIN ────────────────────────────────────────────────────
print("\n[DB] Saving to Nexus Brain...")

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO warden_memories (session_id, type, content, significance, emotional_tag, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        "GL-L54",
        "breakthrough",
        json.dumps({
            "label": "COGNITIVE HOOK — Three Layer Results",
            "seed": SEED,
            "layer1_thinking_chars": len(thinking_text),
            "layer1_response": response_text,
            "layer2_observer": observer_text,
            "layer3_feedback_thinking_chars": len(feedback_thinking),
            "layer3_feedback_response": feedback_response,
            "layer1_thinking_sample": thinking_text[:500],
            "layer3_thinking_sample": feedback_thinking[:500],
        }),
        9.9,
        "self-discovery",
        now
    ))
    conn.commit()
    conn.close()
    print("[DB] ✅ Saved to Nexus Brain")
except Exception as e:
    print(f"[DB] ERR: {e}")

print("\n[INF] Cognitive Hook complete.")
