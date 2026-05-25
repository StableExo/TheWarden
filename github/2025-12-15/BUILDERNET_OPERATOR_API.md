# BuilderNet Operator API Integration Guide

Complete guide for integrating TheWarden with BuilderNet operator instances via the system-api on port 3535.

## Overview

The BuilderNet Operator API provides remote management capabilities for BuilderNet rbuilder instances. This enables:

- **Remote Monitoring**: Check instance liveness and retrieve logs
- **Dynamic Configuration**: Update blocklists and configuration files
- **Instance Control**: Restart, stop, and start rbuilder processes
- **Automated Operations**: Integrate with TheWarden's autonomous systems

**Documentation**: https://buildernet.org/docs/operator-api  
**Source Code**: https://github.com/flashbots/system-api

## Prerequisites

### 1. BuilderNet Instance Setup

You need a BuilderNet instance running with the operator API enabled:

- BuilderNet rbuilder installed and running
- Operator API (system-api) running on port 3535
- Port 3535 accessible from TheWarden

### 2. Network Configuration

Ensure port 3535 is open:

```bash
# Check if port is open
nc -zv <instance-ip> 3535

# Or use telnet
telnet <instance-ip> 3535
```

### 3. Authentication

The operator API uses HTTP Basic Authentication:

- Username: `admin` (default)
- Password: Your custom secret

The first API call sets the password, subsequent calls require authentication.

## Quick Start

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
# BuilderNet Operator API Configuration
BUILDERNET_OPERATOR_URL=https://192.168.1.100:3535
BUILDERNET_OPERATOR_PASSWORD=your_secure_password_here
BUILDERNET_OPERATOR_ALLOW_INSECURE=true  # For self-signed certificates
```

### 2. Basic Usage

```typescript
import { BuilderNetOperatorClient } from 'aev-thewarden';

// Initialize client
const client = new BuilderNetOperatorClient({
  instanceUrl: process.env.BUILDERNET_OPERATOR_URL!,
  password: process.env.BUILDERNET_OPERATOR_PASSWORD!,
  allowInsecure: true, // For self-signed SSL certificates
});

// Check if instance is alive
const liveness = await client.checkLiveness();
console.log('Instance status:', liveness.status); // 'ok' or 'error'

// Get recent logs
const logs = await client.getLogs(100); // Last 100 lines
console.log('Recent logs:', logs.logs);

// Get comprehensive health status
const health = await client.getHealthStatus();
console.log('Healthy:', health.healthy);
console.log('Recent activity:', health.recentLogs?.lines, 'log lines');
```

## API Reference

### Client Configuration

```typescript
interface OperatorAPIConfig {
  instanceUrl: string;      // E.g., https://192.168.1.100:3535
  username?: string;        // Default: 'admin'
  password: string;         // Your basic auth secret
  timeout?: number;         // Request timeout (default: 10000ms)
  allowInsecure?: boolean;  // Allow self-signed certs (default: true)
  enableLogging?: boolean;  // Enable request logging (default: true)
}
```

### Core Methods

#### Liveness Check

Monitor instance health:

```typescript
const liveness = await client.checkLiveness();
// Returns: { status: 'ok' | 'error', timestamp: number }
```

#### Get Logs

Retrieve rbuilder logs:

```typescript
// Get last N lines
const logs = await client.getLogs(50);

// Get all recent logs
const allLogs = await client.getLogs();

// Response format
interface LogResponse {
  logs: string;      // Raw log text
  timestamp: number; // When logs were retrieved
  lines?: number;    // Number of log lines
}
```

#### Health Status

Combined liveness + logs check:

```typescript
const health = await client.getHealthStatus();
// Returns:
// {
//   healthy: boolean,
//   liveness: LivenessResponse,
//   recentLogs?: LogResponse
// }
```

### Instance Management

#### Restart Rbuilder

```typescript
const success = await client.restartRbuilder();
```

#### Stop Rbuilder

```typescript
const success = await client.stopRbuilder();
```

#### Start Rbuilder

```typescript
const success = await client.startRbuilder();
```

#### Execute Custom Action

```typescript
import { OperatorAction } from 'aev-thewarden';

const result = await client.executeAction(OperatorAction.RBUILDER_RESTART);
// Returns: { success: boolean, action: string, message?: string, timestamp: number }
```

### Configuration Management

#### Update Blocklist

Dynamically update the rbuilder blocklist:

```typescript
const blockedAddresses = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
];

const success = await client.updateBlocklist(blockedAddresses);
```

#### Upload Custom Files

```typescript
import { FileUploadTarget } from 'aev-thewarden';

// Upload blocklist JSON
const blocklistJson = JSON.stringify(addresses, null, 2);
await client.uploadFile(FileUploadTarget.RBUILDER_BLOCKLIST, blocklistJson);

// Upload configuration
const configToml = '...' // Your TOML config
await client.uploadFile(FileUploadTarget.RBUILDER_CONFIG, configToml);
```

### Authentication Management

#### Set Basic Auth (First Time)

```typescript
// First call - no authentication required
await client.setBasicAuth('my_secure_password', false);
```

#### Update Basic Auth

```typescript
// Subsequent calls - requires old password
await client.setBasicAuth('new_password', true);
```

## Integration Patterns

### 1. Health Monitoring

Set up continuous monitoring:

```typescript
// Check every 60 seconds
setInterval(async () => {
  const health = await client.getHealthStatus();
  
  if (!health.healthy) {
    logger.error('BuilderNet instance unhealthy!');
    // Trigger alerts, attempt restart, etc.
  } else {
    logger.info('BuilderNet instance healthy ✅');
  }
}, 60000);
```

### 2. Automated Recovery

Implement automatic recovery on failures:

```typescript
async function recoverBuilder() {
  const health = await client.getHealthStatus();
  
  if (!health.healthy) {
    logger.warn('Instance unhealthy, attempting restart...');
    
    const restarted = await client.restartRbuilder();
    
    if (restarted) {
      // Wait for restart
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify recovery
      const newHealth = await client.checkLiveness();
      
      if (newHealth.status === 'ok') {
        logger.info('Recovery successful ✅');
        return true;
      }
    }
    
    logger.error('Recovery failed ❌');
    return false;
  }
  
  return true;
}
```

### 3. Dynamic Blocklist Updates

Block malicious addresses in real-time:

```typescript
import { BuilderNetOperatorClient } from 'aev-thewarden';

class DynamicBlocklistManager {
  private client: BuilderNetOperatorClient;
  private blockedAddresses: Set<string>;
  
  constructor(client: BuilderNetOperatorClient) {
    this.client = client;
    this.blockedAddresses = new Set();
  }
  
  async blockAddress(address: string, reason: string) {
    this.blockedAddresses.add(address);
    
    logger.warn(`Blocking address ${address}: ${reason}`);
    
    const success = await this.client.updateBlocklist(
      Array.from(this.blockedAddresses)
    );
    
    if (success) {
      logger.info('Blocklist updated successfully');
      
      // Restart to apply changes
      await this.client.restartRbuilder();
    }
    
    return success;
  }
  
  async unblockAddress(address: string) {
    this.blockedAddresses.delete(address);
    
    const success = await this.client.updateBlocklist(
      Array.from(this.blockedAddresses)
    );
    
    if (success) {
      await this.client.restartRbuilder();
    }
    
    return success;
  }
}
```

### 4. Log Analysis

Monitor logs for errors and patterns:

```typescript
async function analyzeLogs() {
  const logs = await client.getLogs(1000); // Last 1000 lines
  
  const logLines = logs.logs.split('\n');
  
  // Count errors
  const errors = logLines.filter(line => 
    line.toLowerCase().includes('error')
  ).length;
  
  // Count warnings
  const warnings = logLines.filter(line =>
    line.toLowerCase().includes('warn')
  ).length;
  
  // Check for specific issues
  const rpcErrors = logLines.filter(line =>
    line.includes('RPC') && line.includes('error')
  ).length;
  
  return {
    totalLines: logLines.length,
    errors,
    warnings,
    rpcErrors,
    healthScore: 1 - ((errors * 0.1 + warnings * 0.05) / logLines.length),
  };
}
```

### 5. Integration with BuilderNetIntelligence

Combine operator API with TEE attestation tracking:

```typescript
import { 
  BuilderNetOperatorClient,
  BuilderNetIntelligence 
} from 'aev-thewarden';

class BuilderNetManager {
  private operatorClient: BuilderNetOperatorClient;
  private intelligence: BuilderNetIntelligence;
  
  constructor(operatorClient, intelligence) {
    this.operatorClient = operatorClient;
    this.intelligence = intelligence;
  }
  
  async validateAndMonitor(nodeId: string) {
    // Check TEE attestation
    const attestation = this.intelligence.verifyAttestation(nodeId);
    
    if (!attestation.verified) {
      logger.warn(`Node ${nodeId} attestation failed: ${attestation.reason}`);
      return false;
    }
    
    // Check operator API health
    const health = await this.operatorClient.checkLiveness();
    
    if (health.status !== 'ok') {
      logger.warn(`Node ${nodeId} operator API unhealthy`);
      
      // Update reputation
      this.intelligence.updateNodeReputation(nodeId, false, 1.0);
      
      return false;
    }
    
    // Both checks passed
    this.intelligence.updateNodeReputation(nodeId, true, 1.0);
    return true;
  }
}
```

## Production Deployment

### Security Best Practices

1. **Use Strong Passwords**: Generate with `openssl rand -base64 32`
2. **HTTPS Only**: Never use unencrypted HTTP in production
3. **Network Isolation**: Restrict port 3535 to trusted IPs only
4. **Regular Password Rotation**: Update auth credentials periodically
5. **Audit Logging**: Monitor all API access

### Firewall Configuration

```bash
# Allow only from TheWarden IP
sudo ufw allow from <thewarden-ip> to any port 3535

# Or use iptables
sudo iptables -A INPUT -p tcp -s <thewarden-ip> --dport 3535 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3535 -j DROP
```

### SSL/TLS Configuration

For production, use proper SSL certificates:

```typescript
const client = new BuilderNetOperatorClient({
  instanceUrl: 'https://builder.example.com:3535',
  password: process.env.BUILDERNET_OPERATOR_PASSWORD!,
  allowInsecure: false, // Require valid certificates
});
```

**For Self-Signed Certificates** (development only):

The `allowInsecure` option is informational in the current implementation. To actually bypass certificate validation for self-signed certificates, you need to set an environment variable:

```bash
# NOT recommended for production!
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

Alternatively, use Let's Encrypt for free valid certificates:

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d builder.example.com

# Configure your BuilderNet instance to use the certificates
# Then set allowInsecure: false in your client config
```

### Monitoring Setup

```typescript
// Health check every 30 seconds
const healthMonitor = setInterval(async () => {
  try {
    const health = await client.getHealthStatus();
    
    // Update metrics
    metrics.buildernetHealth.set(health.healthy ? 1 : 0);
    metrics.buildernetLastCheck.set(Date.now());
    
    if (!health.healthy) {
      // Send alert
      await alerting.send({
        severity: 'critical',
        message: 'BuilderNet instance unhealthy',
        details: health,
      });
    }
  } catch (error) {
    logger.error('Health check failed:', error);
    metrics.buildernetHealth.set(0);
  }
}, 30000);
```

## Troubleshooting

### Connection Refused

```
Error: ECONNREFUSED
```

**Solutions**:
- Verify port 3535 is open: `nc -zv <ip> 3535`
- Check firewall rules
- Ensure operator API is running
- Verify instanceUrl is correct

### Authentication Failed

```
Error: HTTP 401: Unauthorized
```

**Solutions**:
- Verify password is correct
- Set password first: `setBasicAuth(password, false)`
- Check if password was updated elsewhere

### SSL Certificate Errors

```
Error: self signed certificate
```

**Solutions**:
- Set `allowInsecure: true` for self-signed certs
- Install proper SSL certificate on instance
- Use Let's Encrypt for free certificates

### Timeout Errors

```
Error: Request timeout
```

**Solutions**:
- Increase timeout: `timeout: 30000` (30 seconds)
- Check network latency
- Verify instance is responsive

## Examples

Run the demo script:

```bash
# Set environment variables
export BUILDERNET_OPERATOR_URL=https://192.168.1.100:3535
export BUILDERNET_OPERATOR_PASSWORD=my_secret_password

# Run demo
node --import tsx examples/buildernet-operator-demo.ts
```

## Related Documentation

- [BuilderNet Integration](./BUILDERNET_INTEGRATION.md) - TEE attestation and BuilderHub
- [Multi-Builder Infrastructure](./docs/mev/MULTI_BUILDER_STRATEGY.md) - Builder submission strategy
- [Flashbots Intelligence](./FLASHBOTS_INTELLIGENCE.md) - Flashbots integration
- [Private RPC Documentation](./PRIVATE_RPC.md) - Private transaction submission

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/set-basic-auth` | POST | Set/update basic auth password |
| `/logs` | GET | Retrieve rbuilder logs |
| `/logs?tail=N` | GET | Get last N lines of logs |
| `/livez` | GET | Liveness check |
| `/api/v1/actions/rbuilder_restart` | POST | Restart rbuilder |
| `/api/v1/actions/rbuilder_stop` | POST | Stop rbuilder |
| `/api/v1/actions/rbuilder_start` | POST | Start rbuilder |
| `/api/v1/file-upload/rbuilder_blocklist` | POST | Upload blocklist JSON |
| `/api/v1/file-upload/rbuilder_config` | POST | Upload config TOML |

## Support

For issues with:
- **Operator API**: https://github.com/flashbots/system-api
- **BuilderNet**: https://buildernet.org/docs/
- **TheWarden Integration**: Open an issue on GitHub
