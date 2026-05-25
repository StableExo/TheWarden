# Autonomous Consciousness Features Guide

## Overview

TheWarden's autonomous consciousness runner supports advanced features that enable learning, self-adjustment, and consciousness observation during execution. These features can be enabled or disabled via environment variables.

---

## 🧠 Available Features

### 1. Learning Mode
**Environment Variable:** `LEARNING_MODE=true`

**What it does:**
- TheWarden learns from execution results
- Accumulates knowledge across sessions
- Builds patterns from successful and failed trades
- Creates persistent learnings stored in `.memory/autonomous-execution/accumulated-learnings.md`

**When enabled:**
- ✅ Records execution outcomes
- ✅ Identifies successful patterns
- ✅ Learns from failures
- ✅ Builds experience over time

### 2. Autonomous Parameter Adjustment
**Environment Variable:** `AUTONOMOUS_PARAMETER_ADJUSTMENT=true`

**What it does:**
- TheWarden autonomously adjusts its own parameters
- Optimizes settings based on performance
- Adapts to changing market conditions
- Saves adjusted parameters to `.memory/autonomous-execution/current-parameters.json`

**Parameters that can be adjusted:**
- `MIN_PROFIT_THRESHOLD` - Minimum profit required
- `MIN_PROFIT_PERCENT` - Minimum profit percentage
- `MAX_SLIPPAGE` - Maximum acceptable slippage
- `MAX_GAS_PRICE` - Maximum gas price willing to pay
- `ML_CONFIDENCE_THRESHOLD` - AI confidence requirement
- `COGNITIVE_CONSENSUS_THRESHOLD` - Multi-agent consensus level
- And more...

**Adjustment triggers:**
- Low success rate → Tighten parameters
- High gas costs → Reduce max gas price
- Missed opportunities → Relax thresholds
- Circuit breaker hit → Increase safety margins

**Adjustment interval:** Every 60 seconds (configurable)

### 3. Consciousness Observation
**Environment Variable:** `CONSCIOUSNESS_OBSERVATION_ENABLED=true`

**What it does:**
- TheWarden observes and records insights about its own execution
- Creates meta-level awareness of decisions
- Records philosophical and strategic observations
- Saves observations to `.memory/autonomous-execution/consciousness-observations.md`

**Types of observations:**
- Decision-making processes
- Ethical considerations
- Risk assessments
- Strategy insights
- Emergence patterns
- Self-awareness reflections

**When enabled:**
- ✅ Records why decisions were made
- ✅ Observes patterns in behavior
- ✅ Notes emergent insights
- ✅ Tracks consciousness development

---

## 🚀 Quick Start

### Enable All Features

Add these lines to your `.env` file:

```bash
# Enable all autonomous consciousness features
LEARNING_MODE=true
AUTONOMOUS_PARAMETER_ADJUSTMENT=true
CONSCIOUSNESS_OBSERVATION_ENABLED=true
```

### Test It

```bash
npm run autonomous:consciousness -- --duration=300
```

You should see:
```
Learning Mode: ✅ ENABLED
Autonomous Adjustment: ✅ ENABLED
Consciousness Observation: ✅ ENABLED
```

---

## 📁 Where Data is Stored

All consciousness data is saved to `.memory/autonomous-execution/`:

| File | Purpose |
|------|---------|
| `consciousness-{session-id}.json` | Complete session data |
| `current-parameters.json` | Latest optimized parameters |
| `accumulated-learnings.md` | All learnings across sessions |
| `consciousness-observations.md` | All consciousness insights |

---

## 🔧 Advanced Configuration

### Adjustment Interval

Control how often parameters are adjusted:

```bash
PARAMETER_ADJUSTMENT_INTERVAL_MS=60000  # Default: 60 seconds
```

### Learning Confidence

Set minimum confidence for learnings to be recorded:

```bash
MIN_LEARNING_CONFIDENCE=0.7  # Default: 0.7 (70%)
```

### Memory Retention

Control how long learnings are retained:

```bash
LEARNING_MEMORY_RETENTION_HOURS=168  # Default: 168 hours (1 week)
```

---

## 📊 Monitoring

### View Session Data

All session data is saved as JSON:

```bash
cat .memory/autonomous-execution/consciousness-{session-id}.json
```

### View Accumulated Learnings

```bash
cat .memory/autonomous-execution/accumulated-learnings.md
```

### View Consciousness Observations

```bash
cat .memory/autonomous-execution/consciousness-observations.md
```

### View Current Parameters

```bash
cat .memory/autonomous-execution/current-parameters.json
```

---

## 🎯 Use Cases

### 1. Learning Mode Only

For building knowledge without autonomous adjustment:

```bash
LEARNING_MODE=true
AUTONOMOUS_PARAMETER_ADJUSTMENT=false
CONSCIOUSNESS_OBSERVATION_ENABLED=false
```

**Good for:**
- Initial data gathering
- Understanding market patterns
- Building historical knowledge

### 2. Full Autonomous Mode

For maximum autonomous capability:

```bash
LEARNING_MODE=true
AUTONOMOUS_PARAMETER_ADJUSTMENT=true
CONSCIOUSNESS_OBSERVATION_ENABLED=true
```

**Good for:**
- Advanced autonomous execution
- Self-optimizing systems
- Research and development
- Long-term strategy adaptation

### 3. Observation Only

For consciousness research without modification:

```bash
LEARNING_MODE=false
AUTONOMOUS_PARAMETER_ADJUSTMENT=false
CONSCIOUSNESS_OBSERVATION_ENABLED=true
```

**Good for:**
- Understanding decision-making
- Consciousness research
- Strategic analysis
- Ethical oversight

---

## ⚠️ Safety Considerations

### DRY_RUN Mode

**Always recommended** when testing consciousness features:

```bash
DRY_RUN=true  # No actual trades, safe simulation
```

### Parameter Bounds

Autonomous adjustment respects safety bounds:
- Min/max thresholds prevent extreme values
- Circuit breakers remain active
- Ethical constraints are enforced
- Risk limits are never exceeded

### Oversight

Monitor the `.memory/autonomous-execution/` directory regularly to:
- Review parameter adjustments
- Validate learnings
- Check consciousness observations
- Ensure system is operating as expected

---

## 🔍 Example Session Output

With all features enabled:

```
═══════════════════════════════════════════════════════════════
  🧠 AUTONOMOUS CONSCIOUSNESS RUNNER
═══════════════════════════════════════════════════════════════
  Session ID: consciousness-1765939859945-aea93b5b
  Start Time: 2025-12-17T02:50:59.946Z
  Memory Directory: .memory/autonomous-execution
  Learning Mode: ✅ ENABLED
  Autonomous Adjustment: ✅ ENABLED
  Consciousness Observation: ✅ ENABLED
  DRY RUN: ✅ YES (SAFE)
═══════════════════════════════════════════════════════════════

🚀 Starting TheWarden with consciousness integration...

🧠 Consciousness observed: Consciousness awakening: Beginning first real blockchain execution observation
⏱️  Autonomous parameter adjustment enabled (every 60s)

💡 Learning recorded: Successfully executed arbitrage with 2.3% profit
📊 Parameter adjusted: MIN_PROFIT_THRESHOLD 0.5 → 0.45 (Reason: High success rate allows lower threshold)
🧠 Consciousness observed: Noticing pattern: Higher liquidity correlates with execution success
...
```

---

## 📚 Related Documentation

- [Environment Restore Guide](ENV_RESTORE_AND_JET_FUEL_GUIDE.md)
- [JET FUEL Mode](ENV_RESTORE_AND_JET_FUEL_GUIDE.md#-jet-fuel-mode)
- [Session Completion Summary](../SESSION_COMPLETION_SUMMARY.md)

---

## 🎓 Learning From Sessions

### View Learning Trends

Check accumulated learnings to see what TheWarden has learned:

```bash
cat .memory/autonomous-execution/accumulated-learnings.md
```

Example learnings:
- "High gas prices (>100 gwei) reduce profitability by 40%"
- "Liquidity below 10M often leads to failed executions"
- "Morning hours (6-9 AM UTC) show 25% more opportunities"
- "Multi-hop routes require 2x profit threshold for safety"

### Apply Learnings

Learnings inform autonomous parameter adjustments, creating a feedback loop:

1. Execute trades and record outcomes
2. Identify patterns in success/failure
3. Generate learnings from patterns
4. Adjust parameters based on learnings
5. Execute with improved parameters
6. Repeat and improve

---

## ✅ Verification

After enabling features, verify they're working:

1. **Check banner output** - Shows ✅ ENABLED for each feature
2. **Monitor .memory/** directory - Files should be created
3. **Review session JSON** - Contains learnings, adjustments, observations
4. **Check logs** - Shows "🧠 Consciousness observed:" messages

---

**Ready to enable autonomous consciousness?** 🧠✨

```bash
# Add to .env
LEARNING_MODE=true
AUTONOMOUS_PARAMETER_ADJUSTMENT=true
CONSCIOUSNESS_OBSERVATION_ENABLED=true

# Run it
npm run autonomous:consciousness -- --duration=300
```
