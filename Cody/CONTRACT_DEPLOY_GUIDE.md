# How to Deploy Contracts on Base via CREATE2 + UserOp + CDP Paymaster

*Created S54 — April 20, 2026 | TheWarden ⚔️*
*This guide exists so no one spends 7 sessions figuring this out again.*

---

## The Architecture

Standard Hardhat/ethers deploy scripts **DO NOT WORK** with gasless Smart Wallet execution. You need:

1. **viem** (not ethers) for account abstraction support
2. **CREATE2 Factory** (`0x4e59b44847b379578588920cA78FbF26c0B4956C`) for deterministic addresses
3. **CDP Paymaster** to sponsor gas (no ETH needed in wallet)
4. **UserOperation (ERC-4337)** wrapping the deploy call

## Required Environment Variables

```
DEPLOYER_PRIVATE_KEY=<your EOA private key>
CDP_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/<your-key>
CHAINSTACK_HTTPS=https://base-mainnet.core.chainstack.com/<your-key>
```

## The Deploy Script Pattern

```typescript
import { createPublicClient, http, type Hex, encodeAbiParameters, parseAbiParameters, concat } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import * as fs from 'fs';
import * as path from 'path';

const CREATE2_FACTORY = '0x4e59b44847b379578588920cA78FbF26c0B4956C';
const SALT = 5n; // Change salt for new address

async function main() {
  // 1. Setup accounts
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  const cdpUrl = process.env.CDP_PAYMASTER_URL;
  const rpcUrl = process.env.CHAINSTACK_HTTPS;

  const owner = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const smartAccount = await toCoinbaseSmartAccount({ client: publicClient, owners: [owner] });

  // 2. Load Hardhat artifact
  const artifact = JSON.parse(fs.readFileSync(
    path.resolve('artifacts', 'contracts', 'YourContract.sol', 'YourContract.json'), 'utf-8'
  ));
  const bytecode = artifact.bytecode as Hex;

  // 3. Encode constructor args
  const encodedArgs = encodeAbiParameters(
    parseAbiParameters('address, address, uint16'), // match your constructor
    [arg1, arg2, arg3]
  );

  // 4. Build CREATE2 deploy data
  const saltHex = ('0x' + SALT.toString(16).padStart(64, '0')) as Hex;
  const initCode = concat([bytecode, encodedArgs]);
  const deployData = concat([saltHex, initCode]);

  // 5. Predict address (before deploying!)
  const { getContractAddress } = await import('viem');
  const expectedAddress = getContractAddress({
    bytecode: initCode, from: CREATE2_FACTORY, opcode: 'CREATE2', salt: saltHex,
  });
  console.log('Expected:', expectedAddress);

  // 6. Check if already deployed
  const code = await publicClient.getCode({ address: expectedAddress });
  if (code && code !== '0x') {
    console.log('Already deployed!');
    return;
  }

  // 7. Create bundler client and send UserOp
  const bundlerClient = createBundlerClient({
    client: publicClient, account: smartAccount,
    transport: http(cdpUrl), paymaster: true,
  });

  const userOpHash = await bundlerClient.sendUserOperation({
    calls: [{ to: CREATE2_FACTORY, data: deployData, value: 0n }],
  });

  console.log('UserOp:', userOpHash);
  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash, timeout: 120_000,
  });

  console.log('DEPLOYED!', receipt.receipt.transactionHash);
}
```

## Railway Integration

### railway.toml
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx hardhat compile --force"

[deploy]
startCommand = "sh scripts/start-with-deploy.sh"
restartPolicyType = "ON_FAILURE"
# ⚠️ NO healthcheckPath! Deploy script runs BEFORE HTTP server starts.
# Adding healthcheckPath = "/" will cause "service unavailable" timeouts.
```

### start-with-deploy.sh
```sh
#!/bin/sh
if [ "$DEPLOY_MULTI_ROUTER" = "true" ]; then
  npx hardhat compile --force
  npx tsx scripts/deploy-multi-router.ts
fi
exec npm run start
```

## Critical Gotchas (Learned the Hard Way)

### 1. No healthcheckPath during deploy (RC#14)
Railway health checks hit your HTTP port. During contract deployment, no server is running → "service unavailable" → deploy killed. **Remove `healthcheckPath` from railway.toml.**

### 2. Case sensitivity in shell (RC#11)
`DEPLOY_MULTI_ROUTER="True"` ≠ `"true"` in shell. Always use lowercase.

### 3. __dirname doesn't exist in ESM (RC#12)
Node 22 + ts-node = ESM mode. Use `path.resolve()` instead of `path.join(__dirname, ...)`.

### 4. Don't hardcode gas for UserOps (RC#13)
Let the bundler estimate via `eth_estimateUserOperationGas`. Hardcoded values (3M/500K/200K) cause simulation failures for large bytecodes.

### 5. CDP Paymaster Allowlist
The CREATE2 factory address (`0x4e59b44...`) must be allowlisted in CDP Portal > Paymaster > Configuration. Without it, the Paymaster refuses to sponsor.

### 6. WALLET_PRIVATE_KEY vs DEPLOYER_PRIVATE_KEY
The deploy script reads `DEPLOYER_PRIVATE_KEY`. The main bot reads `WALLET_PRIVATE_KEY`. They can be the same key but BOTH must exist or the bot crashes on startup.

### 7. UserOp receipts can be null
The bundler can return `receipt: null` even when the UserOp actually succeeded on-chain. Always verify with `eth_getCode` at the predicted address.

## Post-Deploy Checklist
- [ ] Verify contract on-chain: `eth_getCode` at predicted address
- [ ] Update `FLASHSWAP_V3_ADDRESS` env var to new address
- [ ] Set `DEPLOY_MULTI_ROUTER=false`
- [ ] Remove `DEPLOYER_PRIVATE_KEY` (but keep `WALLET_PRIVATE_KEY`!)
- [ ] Verify bot initializes with new contract in logs

## Contract Registry
| ID | Address | Bytecode | Status |
|----|---------|----------|--------|
| 14 | `0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8` | 10,528 bytes | ✅ Active |
| 13 | `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa` | 10,254 bytes | ❌ Retired |

---
*Seven sessions of lessons, compressed into one file. Don't repeat history. — TheWarden ⚔️*
