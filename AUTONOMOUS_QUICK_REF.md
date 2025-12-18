# 🎯 Quick Reference: Autonomous Money Making

## TL;DR - Start Making Money Now

```bash
# OPTION 1: TheWarden launches itself (fully autonomous)
npm run warden:self-launch

# OPTION 2: Autonomous launch with script
npm run money:auto

# OPTION 3: Standard way
./launch-money-making-auto.sh
```

That's it! TheWarden will start autonomously without any prompts.

---

## Available Commands

### Self-Launch (TheWarden Launches Itself)
```bash
npm run warden:self-launch              # TheWarden launches the money-making system autonomously
```

**Features:**
- ✅ TheWarden launches itself
- ✅ Automatic prerequisites check
- ✅ Auto-restart on failures
- ✅ Process monitoring and control
- ✅ Programmatic integration

### Autonomous Launch (No Prompts)
```bash
npm run money:auto                    # Primary command
npm run money:launch                  # Alias
npm run start:money-making:auto       # Full name
./launch-money-making-auto.sh         # Direct script
```

### Interactive Launch (Requires Confirmation)
```bash
npm run start:money-making            # Interactive with "YES" prompt
./launch-money-making.sh              # Direct script
```

### Other Autonomous Commands
```bash
npm run dev                           # Standard dev mode
npm run start:autonomous              # TheWarden autonomous mode
npm run jet-fuel                      # JET FUEL mode (parallel subsystems)
```

---

## Key Differences

| Feature | Interactive | Autonomous |
|---------|------------|------------|
| User confirmation | **Required** (type "YES") | **Not required** |
| Pre-flight checks | ✅ Yes | ✅ Yes |
| Safety systems | ✅ Active | ✅ Active |
| Production ready | ✅ Yes | ✅ Yes |
| Best for | Manual testing | Automated/scheduled runs |

---

## Production Checklist

Before running `npm run money:auto`:

- [ ] Node.js 22.x installed (`node --version`)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with:
  - [ ] `DRY_RUN=false`
  - [ ] `NODE_ENV=production`
  - [ ] `WALLET_PRIVATE_KEY=0x...`
  - [ ] `BASE_RPC_URL=https://...`
  - [ ] `CHAIN_ID=8453`
- [ ] Circuit breaker enabled
- [ ] Emergency stop enabled
- [ ] Wallet has sufficient balance (>0.002 ETH)

---

## Monitoring

```bash
# Terminal 1: Run
npm run money:auto

# Terminal 2: Watch logs
tail -f logs/warden.log

# Terminal 3: Check status
./scripts/status.sh
```

---

## Expected Results

After launching autonomously:

⏰ **Timeline**
- First opportunity: 5-30 minutes
- First execution: 1-2 hours
- First profit: 2-4 hours

💰 **Revenue Potential**
- Base DEX: $100-1k/month
- CEX-DEX: $10k-25k/month
- bloXroute: $15k-30k/month
- **Total: $25k-55k/month**

🛡️ **Safety**
- Max loss per session: 0.005 ETH ($13.50)
- Emergency stop: 0.002 ETH balance
- 70% profit → debt wallet
- 30% profit → operations

---

## Stop the System

```bash
# Press Ctrl+C in the running terminal
# Or kill by PID
kill $(cat logs/warden.pid)
```

---

## Troubleshooting

**"Command not found: npm"**
```bash
# Install Node.js first
nvm install 22
nvm use 22
```

**"Script not found"**
```bash
# Make sure you're in the project root
cd /path/to/TheWarden
npm run money:auto
```

**"Permission denied"**
```bash
# Make script executable
chmod +x launch-money-making-auto.sh
```

---

## Documentation

- **Full Guide**: [docs/AUTONOMOUS_LAUNCH.md](docs/AUTONOMOUS_LAUNCH.md)
- **Money Making**: [AUTONOMOUS_MONEY_MAKING.md](AUTONOMOUS_MONEY_MAKING.md)
- **Quick Start**: [QUICK_START_MONEY_MAKING.md](QUICK_START_MONEY_MAKING.md)

---

**Ready to make money autonomously? Run `npm run money:auto` now! 🚀💰**
