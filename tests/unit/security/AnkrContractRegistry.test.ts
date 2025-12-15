/**
 * Test: Ankr Contract Registry
 * 
 * Validates contract registry functionality
 */

import { describe, it, expect } from 'vitest';
import {
  AnkrContractRegistry,
  AnkrChain,
  AnkrContractType,
  ANKR_VULNERABILITY_PATTERNS,
  ANKR_HIGH_RISK_FUNCTIONS,
} from '../../../src/security/ankr/AnkrContractRegistry.js';

describe('AnkrContractRegistry', () => {
  it('should return all registered contracts', () => {
    const contracts = AnkrContractRegistry.getAllContracts();
    expect(contracts.length).toBeGreaterThan(0);
  });

  it('should filter contracts by chain', () => {
    const ethContracts = AnkrContractRegistry.getContractsByChain(AnkrChain.ETHEREUM);
    expect(ethContracts.every((c) => c.chain === AnkrChain.ETHEREUM)).toBe(true);

    const bscContracts = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC);
    expect(bscContracts.every((c) => c.chain === AnkrChain.BSC)).toBe(true);
  });

  it('should filter contracts by type', () => {
    const liquidStaking = AnkrContractRegistry.getContractsByType(
      AnkrContractType.LIQUID_STAKING
    );
    expect(liquidStaking.every((c) => c.type === AnkrContractType.LIQUID_STAKING)).toBe(true);
  });

  it('should return high-priority contracts', () => {
    const highPriority = AnkrContractRegistry.getHighPriorityContracts();
    expect(highPriority.every((c) => c.highPriority)).toBe(true);
    expect(highPriority.length).toBeGreaterThan(0);
  });

  it('should find contract by address', () => {
    const ankrBNB = AnkrContractRegistry.getContractByAddress(
      '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827'
    );
    expect(ankrBNB).toBeDefined();
    expect(ankrBNB?.name).toBe('ankrBNB');
  });

  it('should be case-insensitive for address lookup', () => {
    const contract1 = AnkrContractRegistry.getContractByAddress(
      '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827'
    );
    const contract2 = AnkrContractRegistry.getContractByAddress(
      '0x52f24a5e03aee338da5fd9df68d2b6fae1178827'
    );
    expect(contract1).toEqual(contract2);
  });

  it('should return contracts with known risks', () => {
    const withRisks = AnkrContractRegistry.getContractsWithKnownRisks();
    expect(withRisks.every((c) => c.knownRisks.length > 0)).toBe(true);
  });

  it('should extract vulnerability patterns', () => {
    const patterns = AnkrContractRegistry.getVulnerabilityPatterns();
    expect(patterns).toContain('Denial of Service (DoS)');
    expect(patterns).toContain('Validation Errors');
    expect(patterns).toContain('Privilege Escalation / Access Control');
  });

  it('should export to JSON', () => {
    const json = AnkrContractRegistry.exportToJSON();
    const data = JSON.parse(json);
    expect(data.metadata).toBeDefined();
    expect(data.contracts).toBeDefined();
    expect(data.vulnerabilityPatterns).toBeDefined();
  });

  it('should have vulnerability patterns from all audits', () => {
    expect(ANKR_VULNERABILITY_PATTERNS.HALBORN_2024.length).toBeGreaterThan(0);
    expect(ANKR_VULNERABILITY_PATTERNS.VERIDISE_2024.length).toBeGreaterThan(0);
    expect(ANKR_VULNERABILITY_PATTERNS.BEOSIN.length).toBeGreaterThan(0);
    expect(ANKR_VULNERABILITY_PATTERNS.SALUS.length).toBeGreaterThan(0);
  });

  it('should have high-risk functions defined', () => {
    expect(ANKR_HIGH_RISK_FUNCTIONS).toContain('flashUnstake');
    expect(ANKR_HIGH_RISK_FUNCTIONS).toContain('setOracle');
    expect(ANKR_HIGH_RISK_FUNCTIONS).toContain('transferOwnership');
  });

  it('should prioritize ankrBNB due to DoS vulnerability', () => {
    const ankrBNB = AnkrContractRegistry.getContractByAddress(
      '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827'
    );
    expect(ankrBNB?.highPriority).toBe(true);
    expect(ankrBNB?.knownRisks).toContain(
      'Flash unstake fee DoS (Veridise Apr 2024 - HIGH PRIORITY)'
    );
  });
});
