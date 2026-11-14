/**
 * Create the enclave spend policies for the Warden's CDP wallet.
 *
 *   npm run cdp:policies
 *
 * Policies are enforced at the enclave layer: even a leaked API credential cannot
 * sign a transaction the policy rejects.
 *
 * Configured from env:
 *   CDP_POLICY_ALLOWED_TARGETS  csv of contract addresses the wallet may call
 *                               (defaults to the FlashSwap V3 address when set)
 *   CDP_POLICY_MAX_ETH          max ETH value per transaction, in ETH (default 0.05)
 *
 * The USD cap rule is emitted only when CDP_POLICY_MAX_USD_CENTS is set, because
 * netUSDChange is evaluated on mainnet transactions only.
 */
import 'dotenv/config';
import { CdpClient } from '@coinbase/cdp-sdk';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  for (const key of ['CDP_API_KEY_ID', 'CDP_API_KEY_SECRET', 'CDP_WALLET_SECRET']) {
    required(key);
  }

  const walletName = process.env.CDP_WALLET_NAME || 'warden-signer';
  const allowedTargets = (process.env.CDP_POLICY_ALLOWED_TARGETS || process.env.FLASHSWAP_V3_ADDRESS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowedTargets.length === 0) {
    throw new Error('Set CDP_POLICY_ALLOWED_TARGETS (or FLASHSWAP_V3_ADDRESS) to the contracts the wallet may call');
  }

  const maxEth = process.env.CDP_POLICY_MAX_ETH || '0.05';
  const maxEthWei = BigInt(Math.round(parseFloat(maxEth) * 1e18)).toString();

  const criteria: Record<string, unknown>[] = [
    { type: 'ethValue', ethValue: maxEthWei, operator: '<=' },
    // evmAddress compares the transaction's `to`, so allowlisting the router is
    // what stops a drain to an unknown contract.
    { type: 'evmAddress', addresses: allowedTargets, operator: 'in' },
  ];

  if (process.env.CDP_POLICY_MAX_USD_CENTS) {
    // Mainnet-only criterion. Confirm it applies to signEvmTransaction for server
    // wallets on your first live run: the documented netUSDChange samples use
    // end-user operations.
    criteria.push({
      type: 'netUSDChange',
      changeCents: parseInt(process.env.CDP_POLICY_MAX_USD_CENTS, 10),
      operator: '<=',
    });
  }

  const cdp = new CdpClient();

  const policy = await cdp.policies.createPolicy({
    policy: {
      scope: 'project',
      description: `Warden enclave policy: <=${maxEth} ETH per tx, ${allowedTargets.length} allowed target(s)`,
      rules: [
        {
          action: 'accept',
          operation: 'signEvmTransaction',
          criteria,
        },
        {
          action: 'accept',
          operation: 'sendEvmTransaction',
          criteria,
        },
      ],
    },
  });

  console.log('Created policy', policy.id);

  const account = await cdp.evm.getOrCreateAccount({ name: walletName });
  const evm = cdp.evm as unknown as Record<string, unknown>;

  if (typeof evm.updateAccount === 'function') {
    await (evm.updateAccount as (args: Record<string, unknown>) => Promise<unknown>)({
      address: account.address,
      accountPolicy: policy.id,
    });
    console.log(`Attached policy ${policy.id} to ${account.address} (wallet "${walletName}")`);
  } else {
    console.log(
      `Attach policy ${policy.id} to ${account.address} in the CDP Portal: this SDK build has no ` +
        'updateAccount, so set it on the account there.'
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
