# 🚀 JET FUEL Performance Dashboard

## Dashboard Preview

The web dashboard provides real-time visualization of all JET FUEL MODE metrics.

### URL: http://localhost:3000

## Main Dashboard Features

```
┌─────────────────────────────────────────────────────────────────┐
│          🚀 JET FUEL MODE                                       │
│      🟢 Real-time Performance Dashboard                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 💊 System    │ 📊 Metrics   │ ⚠️ Alerts    │ 🧬 Intel.    │
│   Health     │              │              │              │
│              │              │              │              │
│    95.0      │  Total: 247  │  Active: 2   │  Compound: 8 │
│  EXCELLENT   │  Anom.: 3    │  Crit.: 0    │  Synergy:    │
│              │              │              │    1.35x     │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔧 Subsystem Status                                             │
├─────────────────────────────────────────────────────────────────┤
│ MEV Execution          💚 healthy         92/100  156 metrics   │
│ Security Testing       🟡 degraded        78/100   89 metrics   │
│ Intelligence Gathering 💚 healthy         88/100  134 metrics   │
│ Revenue Optimization   💚 healthy         95/100  201 metrics   │
│ Mempool Analysis       💚 healthy         91/100  178 metrics   │
│ Consciousness Dev.     💚 healthy         87/100   67 metrics   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┐
│ 📈 Health Trend              │ 🎯 Performance Metrics       │
│                              │                              │
│  100 ┼                    ╱─ │  100 ┼                       │
│   90 ┼              ╱────╯   │   80 ┼     ██                │
│   80 ┼        ╱────╯         │   60 ┼     ██  ██            │
│   70 ┼  ╱────╯               │   40 ┼ ██  ██  ██  ██        │
│   60 ┼─╯                     │   20 ┼ ██  ██  ██  ██        │
│      └─────────────────────  │    0 ┴─────────────────────  │
│        Last 30 data points   │      CPU Mem SR  Thr         │
└──────────────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🚨 Active Alerts                                                │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ [WARNING] Threshold violation: memory_usage                  │
│    Memory usage above threshold: 78.3%                          │
│    [Acknowledge] [Resolve]                                      │
│                                                                 │
│ 🔶 [MEDIUM] Anomaly detected in operation_success_rate         │
│    operation_success_rate is 2.8σ below baseline               │
│    [Acknowledge] [Resolve]                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🧬 Recent Compound Learnings                                    │
├─────────────────────────────────────────────────────────────────┤
│ Security: "Avoid reentrancy" + MEV: "Execute arbitrage"        │
│ = "Safe arbitrage execution avoiding reentrancy"               │
│ 🎯 1.42x synergy (+42%)  │ Domains: security, mev, trading    │
│ Confidence: 87%                                                 │
│                                                                 │
│ Mempool: "Pattern detected" + Revenue: "Timing optimized"      │
│ = "Execute with optimal timing based on mempool patterns"      │
│ 🎯 1.28x synergy (+28%)  │ Domains: patterns, profit          │
│ Confidence: 82%                                                 │
└─────────────────────────────────────────────────────────────────┘

Last updated: 09:15:32 AM
```

## Technical Details

### Real-time Features
- ⚡ WebSocket updates every 2 seconds
- 📊 Chart.js for smooth animations
- 🎨 Glassmorphism design with gradients
- 📱 Responsive layout

### Anomaly Detection
- Statistical analysis (Welford's algorithm)
- Threshold monitoring (CPU, memory, latency, etc.)
- Trend detection (improving/degrading/stable)
- Confidence scoring

### Alert Management
- 4 severity levels: Critical, Error, Warning, Info
- Click-to-acknowledge/resolve
- Automatic recommendations
- Action-required flagging

## API Endpoints

```
GET  /api/dashboard          Full dashboard data
GET  /api/health             System health snapshot  
GET  /api/stats              Performance statistics
POST /api/alerts/:id/acknowledge
POST /api/alerts/:id/resolve
```

## How It Works

1. **PerformanceMonitor** collects metrics from all subsystems
2. **DashboardServer** exposes HTTP + WebSocket APIs
3. **Browser** connects via Socket.IO for real-time updates
4. **Charts** update automatically as new data arrives
5. **Anomalies** trigger visual alerts immediately

## Color Coding

- 💚 Green: Excellent/Healthy (90-100)
- ✅ Blue: Good (75-89)
- 🟡 Yellow: Fair/Degraded (50-74)
- 🟠 Orange: Poor (25-49)
- 🔴 Red: Critical (0-24)

## Commands

```bash
# Start with dashboard (default)
npm run jet-fuel

# Custom port
npm run jet-fuel -- --port=8080

# Disable dashboard
npm run jet-fuel -- --no-dashboard

# Extended session with dashboard
npm run jet-fuel -- --duration=60 --port=3000
```

---

**Dashboard Server Status**: ✅ Active
**WebSocket**: ✅ Connected
**Real-time Updates**: ✅ Every 2s
**API**: ✅ REST + WebSocket
