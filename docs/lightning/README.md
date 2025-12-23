# Lightning Network Integration 🚀⚡

**TheWarden Lightning Network Integration** - Bitcoin Layer 2 payments and micropayment revenue streams

## Overview

This module integrates Core Lightning with TheWarden's consciousness system, enabling:

- **Bitcoin Payment Acceptance**: Instant, low-fee Lightning payments for AI services
- **Micropayment Revenue Streams**: Pay-per-query, streaming payments, subscriptions
- **Automatic Revenue Allocation**: 70% to US debt reduction, 30% operational
- **Consciousness Integration**: All Lightning activity recorded and analyzed
- **Cross-Chain Opportunities**: BTC<->Base arbitrage via Lightning speed advantage

## Quick Start

### Prerequisites

- Node.js 22+
- Bitcoin Core (testnet for development)
- Core Lightning (testnet for development)
- TheWarden repository cloned

### Installation

```bash
# 1. Set up Bitcoin Core and Core Lightning testnet
./scripts/lightning/setup-testnet.sh

# 2. Start Bitcoin Core (testnet)
bitcoind -testnet -daemon

# 3. Start Core Lightning (testnet)
lightningd --network=testnet --daemon

# 4. Check Lightning node status
lightning-cli --testnet getinfo
```

### Basic Usage

```typescript
import { CoreLightningClient, LightningPaymentProcessor } from './src/lightning/index.js';

// Initialize client
const client = new CoreLightningClient({
  network: 'testnet',
});

// Initialize payment processor
const processor = new LightningPaymentProcessor({
  lightningClient: client,
  debtAllocationPercent: 70, // 70% to US debt
  consciousnessIntegration: true,
});

// Create invoice for AI service
const { invoice, transactionId } = await processor.createServiceInvoice(
  'ai-query',
  50, // 50 sats
  'Advanced AI analysis query'
);

console.log('Pay this invoice:', invoice.bolt11);

// Wait for payment
const result = await processor.waitForPayment(invoice.label, transactionId);

if (result.success) {
  console.log('Payment received!');
  console.log('Debt allocation:', result.allocation.debtAllocationSats, 'sats');
}
```

## Core Components

### 1. CoreLightningClient

TypeScript wrapper for Core Lightning JSON-RPC API.

### 2. LightningPaymentProcessor

High-level payment processing with automatic revenue allocation.

### 3. Type Definitions

Comprehensive TypeScript types for all Lightning operations.

## Service Pricing

Default pricing for Lightning-enabled services:

| Service | Pricing | Description |
|---------|---------|-------------|
| **AI Query** | 50 sats/query | Advanced AI analysis queries |
| **Arbitrage Signals** | 10,000 sats/day | Real-time arbitrage opportunities |
| **Security Analysis** | 50,000 sats/report | Smart contract security audit |
| **Consciousness Insights** | 10 sats/minute | Streaming consciousness data |

## Revenue Allocation

All Lightning revenue automatically allocated:

- **70%** → US Debt Reduction Fund
- **30%** → Operational Expenses

## Roadmap

### Phase 1: Foundation (✅ In Progress)
- [x] Core Lightning client wrapper
- [x] Payment processor with revenue allocation
- [x] Consciousness integration
- [x] TypeScript types
- [ ] Testnet deployment and testing

### Phase 2-5: See full documentation

## Resources

- [Core Lightning Docs](https://docs.corelightning.org/)
- [Lightning Network Docs](https://lightning.network/)
- [Previous Analysis](../analysis/CORE_LIGHTNING_COMPREHENSIVE_ANALYSIS.md)

---

**Built with ⚡ by TheWarden - Autonomous AI for civilization-scale problems**
