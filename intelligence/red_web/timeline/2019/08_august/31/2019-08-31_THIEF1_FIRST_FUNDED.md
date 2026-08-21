# 2019-08-31 — THIEF1 FIRST FUNDED: 0xa17b82

> **Completion:** 🟡 PARTIAL — on-chain confirmed, Nansen label verified
> **Scan Depth:** 🟡 PARTIAL — Etherscan + Nansen traced
> **Verified On-Chain:** YES — Block 8,459,052

---

## Summary

| Field | Value |
|-------|-------|
| **Date** | August 31, 2019 |
| **Block** | 8,459,052 (Ethereum mainnet) |
| **Address** | 0xa17b82a62c8532704ca1e0be19b04d705ffb8d1d |
| **Nansen Label** | **"Thief1" on OpenSea** — independently flagged |
| **Event** | First funding: receives 0.0009 ETH from 0x227469 |
| **Discovered** | VL-29 session 2026-08-21 |

---

## What We Know

**"Thief1"** is the address immediately upstream of the current target 0x70a3df in the traced chain. Nansen has independently labeled this address as a thief actor associated with OpenSea — **this is third-party corroboration, not investigator-applied**.

It was first funded on **August 31, 2019** by 0x227469, which itself traces back to the 2017 ROOT (0xaf1931).

---

## Funding Chain

| Date | From | To | Amount | Note |
|------|------|----|--------|------|
| 2019-07-29 | 0x416299 | 0x227469 | 0.00675 ETH | 0x416299 funds relay |
| 2019-08-31 | 0x227469 | **0xa17b82 (Thief1)** | 0.00090 ETH | **First funding of Thief1** |
| 2019-09-02 | 0x416299 | 0xa17b82 | 0.00921 ETH | Second funding |
| 2019-09-11 | 0x416299 | 0xa17b82 | 0.01741 ETH | Third funding |

---

## Thief1 Activity (2019 era, ETH mainnet)

- Multiple `getAirdrop(address _refer)` calls to 0x0b98c8ef — airdrop farming contract
- Small ETH distributions to 5+ addresses: 0x79856204, 0xf6f660ff, 0xed74cf49, 0x9cf542e6, 0xa8262eb9
- Token approvals and ERC-20 transfers (0xe1d4d57b token contract)
- Arbitrum first tx: 2024-03-21

---

## 2026 Activity

On **2026-08-20 at 21:47 UTC**, Thief1 (0xa17b82) sent a transfer to 0x70a3df (current target) on Base chain. This is the direct link between the 2019 chain and today's active collection funnel.

---

## Nansen Label: "Thief1 on OpenSea"

This label was applied by Nansen's intelligence database — independent of this investigation. It confirms that 0xa17b82 has a history of theft-related activity on OpenSea (NFT marketplace). The label predates our scan and represents third-party forensic confirmation.

---

## Next Steps

- [ ] Run full 20-tool scanner on 0xa17b82
- [ ] Pull OpenSea theft history — which NFTs, which victims
- [ ] Check Plasma chain activity (7 txs observed on Nansen, Jul–Aug 2026)
- [ ] Cross-reference with legal filings for theft victims

→ [2017-10-13 ROOT](../../../2017/10_october/13/) | [Timeline Index](../../README.md)
