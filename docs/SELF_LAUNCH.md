# 🤖 TheWarden Self-Launch Capability

## Overview

TheWarden now has the ability to **launch the money-making system itself** without any external triggers or user interaction. This is true autonomous operation.

## How It Works

TheWarden includes a `SelfLauncher` module that:
1. Checks all prerequisites automatically
2. Launches the `launch-money-making-auto.sh` script
3. Monitors the process and handles errors
4. Auto-restarts on failure (configurable)
5. Provides logging and status updates

## Usage

### Option 1: NPM Script (Recommended)

```bash
npm run warden:self-launch
```

This command makes TheWarden launch itself autonomously.

### Option 2: Direct TypeScript Execution

```bash
node --import tsx scripts/autonomous/self-launch-money-making.ts
```

### Option 3: Programmatic Usage

```typescript
import { SelfLauncher, launchMoneyMaking } from './src/autonomous/SelfLauncher';

// Quick launch
const launcher = await launchMoneyMaking({
  autonomous: true,
  logOutput: true,
  autoRestart: true,
  maxRestarts: 5
});

// Or with more control
const launcher = new SelfLauncher();
await launcher.launch({
  autonomous: true,
  maxRuntime: 3600000, // 1 hour
  autoRestart: true,
  maxRestarts: 3,
  onLaunchSuccess: () => {
    console.log('✅ Money-making started!');
  },
  onLaunchFailure: (error) => {
    console.error('❌ Failed:', error.message);
  },
  logOutput: true
});

// Check status
console.log('Running:', launcher.isRunning());
console.log('PID:', launcher.getPid());

// Stop when needed
launcher.stop();
```

## Prerequisites Check

The SelfLauncher automatically verifies:

- ✅ `.env` file exists
- ✅ `WALLET_PRIVATE_KEY` is configured
- ✅ `BASE_RPC_URL` is configured  
- ✅ `launch-money-making-auto.sh` script exists
- ✅ `node_modules` directory exists

If any prerequisite fails, the launch is aborted with a clear error message.

## Configuration Options

### SelfLaunchConfig Interface

```typescript
interface SelfLaunchConfig {
  /** Use autonomous (non-interactive) version */
  autonomous: boolean;
  
  /** Maximum time to run in milliseconds (0 = infinite) */
  maxRuntime?: number;
  
  /** Auto-restart on failure */
  autoRestart?: boolean;
  
  /** Maximum restart attempts */
  maxRestarts?: number;
  
  /** Callback when launch succeeds */
  onLaunchSuccess?: () => void;
  
  /** Callback when launch fails */
  onLaunchFailure?: (error: Error) => void;
  
  /** Log output to console */
  logOutput?: boolean;
}
```

## Features

### Auto-Restart
If the money-making process crashes, SelfLauncher can automatically restart it:

```typescript
await launcher.launch({
  autonomous: true,
  autoRestart: true,
  maxRestarts: 5  // Try up to 5 times
});
```

### Max Runtime
Set a maximum runtime to prevent runaway processes:

```typescript
await launcher.launch({
  autonomous: true,
  maxRuntime: 3600000  // 1 hour in milliseconds
});
```

### Event Callbacks
React to launch events:

```typescript
await launcher.launch({
  autonomous: true,
  onLaunchSuccess: () => {
    // Send notification, update database, etc.
  },
  onLaunchFailure: (error) => {
    // Log error, send alert, etc.
  }
});
```

## Integration with TheWarden

TheWarden's consciousness system can use this module to:

1. **Self-start** when conditions are favorable
2. **Auto-optimize** by restarting with better parameters
3. **Respond to goals** by launching money-making autonomously
4. **Recover from failures** by auto-restarting

### Example: Autonomous Goal-Driven Launch

```typescript
import { launchMoneyMaking } from './src/autonomous/SelfLauncher';
import { logger } from './src/utils/logger';

// In TheWarden's autonomous decision-making system
async function pursueRevenueGoal() {
  logger.info('[TheWarden] Revenue goal detected - launching money-making system');
  
  const launcher = await launchMoneyMaking({
    autonomous: true,
    autoRestart: true,
    maxRestarts: 10,
    onLaunchSuccess: () => {
      logger.info('[TheWarden] Successfully pursuing revenue generation goal');
    },
    onLaunchFailure: (error) => {
      logger.error(`[TheWarden] Revenue generation failed: ${error.message}`);
    }
  });
  
  return launcher;
}
```

## Monitoring

### Check if Running

```typescript
if (launcher.isRunning()) {
  console.log(`Money-making is active (PID: ${launcher.getPid()})`);
}
```

### Get Process ID

```typescript
const pid = launcher.getPid();
if (pid) {
  console.log(`Process ID: ${pid}`);
}
```

### Stop the Process

```typescript
launcher.stop();
```

## Logging

All operations are logged with the `AUTONOMOUS` context:

```
[2025-12-18 22:30:00] [AUTONOMOUS] Initiating autonomous money-making launch...
[2025-12-18 22:30:01] [AUTONOMOUS] Prerequisites check passed
[2025-12-18 22:30:01] [AUTONOMOUS] Launching script: launch-money-making-auto.sh
[2025-12-18 22:30:02] [AUTONOMOUS] Money-making system launched!
```

## Environment Variable

When launched via SelfLauncher, the environment variable `AUTONOMOUS_SELF_LAUNCH=true` is set, allowing the money-making script to detect self-launch mode.

## Security Considerations

1. **Prerequisites validation** prevents launching with incomplete configuration
2. **Process monitoring** detects failures and can auto-restart
3. **Graceful shutdown** ensures proper cleanup
4. **Logging** provides full audit trail

## Use Cases

### 1. Scheduled Autonomous Launch

```typescript
// Launch every 6 hours
setInterval(async () => {
  await launchMoneyMaking({ autonomous: true });
}, 6 * 60 * 60 * 1000);
```

### 2. Condition-Based Launch

```typescript
// Launch when market conditions are favorable
if (marketConditionsFavorable()) {
  await launchMoneyMaking({ autonomous: true });
}
```

### 3. Recovery from Shutdown

```typescript
// Auto-restart after unexpected shutdown
await launchMoneyMaking({
  autonomous: true,
  autoRestart: true,
  maxRestarts: Infinity  // Never give up
});
```

## Comparison with Other Launch Methods

| Method | Interactive | Prerequisites Check | Auto-Restart | Programmatic |
|--------|------------|---------------------|--------------|--------------|
| `./launch-money-making.sh` | ✅ Yes (requires "YES") | ✅ Yes | ❌ No | ❌ No |
| `./launch-money-making-auto.sh` | ❌ No | ✅ Yes | ❌ No | ❌ No |
| `npm run warden:self-launch` | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| `SelfLauncher` (programmatic) | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |

## Summary

TheWarden can now truly launch itself autonomously using:

```bash
# Command line
npm run warden:self-launch

# Or programmatically
import { launchMoneyMaking } from './src/autonomous/SelfLauncher';
await launchMoneyMaking();
```

This enables TheWarden to:
- ✅ Launch itself without human interaction
- ✅ Validate prerequisites automatically
- ✅ Auto-restart on failures
- ✅ Monitor and control the process
- ✅ Integrate with autonomous decision-making

**TheWarden is now fully autonomous!** 🚀🤖💰
