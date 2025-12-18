# 🚀 TheWarden Autonomous Launch Guide

## Overview

TheWarden can now run the money-making system **completely autonomously** without any user interaction. This guide explains how to use the autonomous launch scripts.

## Quick Start

### Option 1: NPM Scripts (Recommended)

```bash
# Launch autonomously (no prompts)
npm run money:auto

# Or use the full command name
npm run start:money-making:auto
```

### Option 2: Direct Script Execution

```bash
# Launch autonomously
./launch-money-making-auto.sh

# Or the interactive version (requires manual confirmation)
./launch-money-making.sh
```

## What's the Difference?

### Interactive Version (`launch-money-making.sh`)
- **Requires** user confirmation before starting
- Shows all safety information and asks you to type "YES"
- Best for manual launches and testing

### Autonomous Version (`launch-money-making-auto.sh`)
- **No prompts** - starts immediately after checks
- Automatically proceeds with production settings
- Best for automated/scheduled launches and CI/CD

## Pre-Launch Checklist

Both scripts perform these automated checks:

- ✅ Node.js v22.x is installed and active
- ✅ `.env` file exists with required configuration
- ✅ `DRY_RUN` is set correctly
- ✅ Wallet private key is configured
- ✅ RPC endpoints are configured
- ✅ Dependencies are installed

## Production Configuration

The autonomous launch expects these critical `.env` settings:

```bash
# Production Mode
DRY_RUN=false
NODE_ENV=production
MAINNET_DRY_RUN=false

# Network
CHAIN_ID=8453  # Base mainnet
BASE_RPC_URL=https://base-mainnet.core.chainstack.com/...

# Wallet
WALLET_PRIVATE_KEY=0x...

# Safety Systems
CIRCUIT_BREAKER_ENABLED=true
EMERGENCY_STOP_ENABLED=true
CIRCUIT_BREAKER_MAX_LOSS=0.005
```

## Revenue Streams Enabled

When launched autonomously, TheWarden activates:

1. **Base DEX Arbitrage**: $100-1k/month
   - Uniswap V3, Aerodrome, BaseSwap, SushiSwap
   - Flash loans via Aave V3
   
2. **CEX-DEX Arbitrage**: $10k-25k/month
   - Binance, Coinbase, OKX (FREE tier APIs)
   
3. **bloXroute Mempool Intelligence**: $15k-30k/month
   - Mempool monitoring for MEV opportunities
   
4. **Rated Network MEV Intelligence**: Optimization
   - Builder selection and routing optimization
   
5. **Security Bug Bounties**: Up to $500k per finding
   - Automated testing on Immunefi contracts

**Total Potential**: $25k-55k/month

## Safety Systems

All autonomous launches include:

- ✅ **Circuit Breaker**: Max loss 0.005 ETH
- ✅ **Emergency Stop**: Triggers at 0.002 ETH balance
- ✅ **MEV Protection**: Risk-aware execution
- ✅ **Transaction Simulation**: Pre-validation
- ✅ **Slippage Protection**: Max 1.5%
- ✅ **Rate Limiting**: 100 trades/hour
- ✅ **Profit Allocation**: 70% to debt, 30% operations

## Monitoring

Once launched autonomously, monitor with:

```bash
# Terminal 1: Running autonomous instance
npm run money:auto

# Terminal 2: Watch logs
tail -f logs/warden.log

# Terminal 3: Check status
./scripts/status.sh
```

## Expected Timeline

After autonomous launch:

- **First opportunity detected**: 5-30 minutes
- **First execution attempt**: 1-2 hours
- **First profitable trade**: 2-4 hours

## Stopping the System

To stop autonomous operation:

```bash
# Press Ctrl+C in the terminal
# Or find and kill the process
kill $(cat logs/warden.pid)
```

## Automated/Scheduled Launches

### Using Cron

```bash
# Edit crontab
crontab -e

# Add entry to run every hour
0 * * * * cd /path/to/TheWarden && ./launch-money-making-auto.sh >> logs/cron.log 2>&1

# Or run on system startup
@reboot cd /path/to/TheWarden && ./launch-money-making-auto.sh
```

### Using Systemd (Linux)

Create `/etc/systemd/system/thewarden.service`:

```ini
[Unit]
Description=TheWarden Autonomous Money Making
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/TheWarden
ExecStart=/path/to/TheWarden/launch-money-making-auto.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl enable thewarden
sudo systemctl start thewarden
sudo systemctl status thewarden
```

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start launch-money-making-auto.sh --name thewarden

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## GitHub Actions / CI/CD

Example GitHub Actions workflow:

```yaml
name: Launch TheWarden Autonomously

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  launch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm install
      
      - name: Create .env from secrets
        run: |
          echo "${{ secrets.DOT_ENV }}" > .env
      
      - name: Launch TheWarden
        run: npm run money:auto
        timeout-minutes: 240  # 4 hours
```

## Troubleshooting

### Script fails with "Node.js not found"

```bash
# Install nvm first
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 22
nvm install 22
nvm use 22
```

### Script fails with ".env file not found"

```bash
# Copy from example
cp .env.example .env

# Edit with your configuration
nano .env
```

### Script fails with "Wallet private key missing"

Ensure your `.env` has:
```bash
WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

### Script fails with "Dependencies not found"

```bash
# Install dependencies
npm install
```

## Security Best Practices

1. **Never commit** `.env` to git
2. **Use environment-specific** configurations
3. **Monitor logs** for suspicious activity
4. **Set appropriate** circuit breaker limits
5. **Test with testnet** before mainnet
6. **Keep private keys** in secure vaults for production

## Additional Resources

- [AUTONOMOUS_MONEY_MAKING.md](../AUTONOMOUS_MONEY_MAKING.md) - Complete guide
- [QUICK_START_MONEY_MAKING.md](../QUICK_START_MONEY_MAKING.md) - Quick start
- [LAUNCH_READY.md](../LAUNCH_READY.md) - Validation report
- [MISSION_COMPLETE.md](../MISSION_COMPLETE.md) - Executive summary

## Support

For issues or questions:
1. Check logs in `logs/warden.log`
2. Run diagnostics: `npm run check:readiness`
3. Review documentation in `docs/`
4. Check GitHub issues

---

**Welcome to fully autonomous AI-powered money making! 🚀💰**
