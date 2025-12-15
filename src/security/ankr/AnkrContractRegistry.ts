/**
 * Ankr Contract Registry
 * 
 * Centralizes all Ankr Network smart contract addresses across multiple chains
 * for monitoring, vulnerability detection, and bug bounty hunting.
 * 
 * Sources:
 * - Official Ankr Documentation: https://www.ankr.com/docs/staking-extra/staking-smart-contracts/
 * - Immunefi Bug Bounty: https://immunefi.com/bug-bounty/ankr/scope/
 * - Recent Audits: Halborn (Aug 2024), Veridise (Apr 2024), Beosin, Salus
 */

export enum AnkrChain {
  ETHEREUM = 'ethereum',
  BSC = 'bsc',
  POLYGON = 'polygon',
}

export enum AnkrContractType {
  LIQUID_STAKING = 'liquid_staking',
  BRIDGE = 'bridge',
  TOKEN = 'token',
  STAKING_POOL = 'staking_pool',
  REWARD_MANAGER = 'reward_manager',
}

export interface AnkrContract {
  address: string;
  chain: AnkrChain;
  type: AnkrContractType;
  name: string;
  description: string;
  /** Known vulnerabilities from audits */
  knownRisks: string[];
  /** Audit reports covering this contract */
  auditReports: string[];
  /** High-priority for monitoring */
  highPriority: boolean;
}

/**
 * Comprehensive registry of Ankr Network smart contracts
 */
export class AnkrContractRegistry {
  private static contracts: AnkrContract[] = [
    // ========================================
    // ETHEREUM MAINNET CONTRACTS
    // ========================================
    {
      address: '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb',
      chain: AnkrChain.ETHEREUM,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'ankrETH',
      description: 'Liquid Staking ETH token - represents staked Ethereum',
      knownRisks: [
        'Flash unstake fee DoS potential (Veridise Apr 2024)',
        'Unvalidated EVM execution results (Halborn Aug 2024)',
        'Missing duplication checks in initialization',
      ],
      auditReports: [
        'Halborn Aug 2024 - FLOW Liquid Staking',
        'Veridise Apr 2024 - BNB Liquid Staking',
        'Beosin 2022-2023 - ETH Staking',
      ],
      highPriority: true,
    },
    {
      address: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
      chain: AnkrChain.ETHEREUM,
      type: AnkrContractType.TOKEN,
      name: 'ANKR Token',
      description: 'Ankr utility token - governance and staking rewards',
      knownRisks: ['Privilege escalation risks', 'Improper access control'],
      auditReports: ['Beosin 2022-2023', 'Salus May 2023'],
      highPriority: false,
    },
    {
      address: '0xc437DF90B37C1dB6657339E31BfE54627f0e7181',
      chain: AnkrChain.ETHEREUM,
      type: AnkrContractType.BRIDGE,
      name: 'Ankr Bridge (ETH)',
      description: 'Cross-chain bridge for Ankr assets',
      knownRisks: [
        'Deposit/withdraw validation flaws (Beosin)',
        'Missing address validation',
        'Incorrect resource handling',
      ],
      auditReports: ['Beosin 2022-2023 - Bridge Security Audit'],
      highPriority: true,
    },
    {
      address: '0x26dcFbFa8Bc267b250432c01C982Eaf81cC5480C',
      chain: AnkrChain.ETHEREUM,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'ankrPOL (Polygon Staking on ETH)',
      description: 'Polygon liquid staking token on Ethereum',
      knownRisks: ['Cross-chain message validation', 'Oracle manipulation risks'],
      auditReports: ['Halborn Aug 2024', 'Veridise Apr 2024'],
      highPriority: true,
    },

    // ========================================
    // BSC (BINANCE SMART CHAIN) CONTRACTS
    // ========================================
    {
      address: '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827',
      chain: AnkrChain.BSC,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'ankrBNB',
      description: 'Liquid Staking BNB token on BSC',
      knownRisks: [
        'Flash unstake fee DoS (Veridise Apr 2024 - HIGH PRIORITY)',
        'Swap function denial of service',
        'Unnecessarily payable functions',
        'Gas optimization issues',
      ],
      auditReports: [
        'Veridise Apr 2024 - BNB Liquid Staking (PRIMARY)',
        'Beosin 2022-2023 - BNB Staking',
      ],
      highPriority: true, // DoS vulnerability identified
    },
    {
      address: '0x1075bea848451a13fd6f696b5d0fda52743e6439',
      chain: AnkrChain.BSC,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'aETHb (ETH on BSC)',
      description: 'ETH liquid staking token on BSC',
      knownRisks: ['Cross-chain validation', 'Bridge security'],
      auditReports: ['Beosin 2022-2023'],
      highPriority: true,
    },
    {
      address: '0xe05a08226c49b636acf99c40da8dc6af83ce5bb3',
      chain: AnkrChain.BSC,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'ankrETH (on BSC)',
      description: 'Ethereum liquid staking on BSC',
      knownRisks: ['Bridge security', 'Cross-chain attacks'],
      auditReports: ['Beosin 2022-2023'],
      highPriority: true,
    },
    {
      address: '0xc437DF90B37C1dB6657339E31BfE54627f0e7181',
      chain: AnkrChain.BSC,
      type: AnkrContractType.BRIDGE,
      name: 'Ankr Bridge (BSC)',
      description: 'Cross-chain bridge on BSC',
      knownRisks: [
        'Deposit/withdraw validation (Beosin)',
        'Event trigger missing',
        'Redundant code',
      ],
      auditReports: ['Beosin 2022-2023 - Bridge Security Audit'],
      highPriority: true,
    },
    {
      address: '0x738d96caf7096659db4c1afbf1e1bdfd281f388c',
      chain: AnkrChain.BSC,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'ankrPOL (on BSC)',
      description: 'Polygon liquid staking token on BSC',
      knownRisks: ['Cross-chain security', 'Oracle manipulation'],
      auditReports: ['Halborn Aug 2024', 'Veridise Apr 2024'],
      highPriority: true,
    },

    // ========================================
    // POLYGON CONTRACTS
    // ========================================
    {
      address: '0x738d96caf7096659db4c1afbf1e1bdfd281f388c',
      chain: AnkrChain.POLYGON,
      type: AnkrContractType.LIQUID_STAKING,
      name: 'ankrPOL',
      description: 'Polygon liquid staking token on Polygon mainnet',
      knownRisks: [
        'Unvalidated EVM execution results (Halborn)',
        'Missing initialization checks',
        'Gas limit issues',
      ],
      auditReports: [
        'Halborn Aug 2024 - FLOW Liquid Staking (12 critical)',
        'Veridise Apr 2024',
      ],
      highPriority: true,
    },
  ];

  /**
   * Get all registered Ankr contracts
   */
  static getAllContracts(): AnkrContract[] {
    return this.contracts;
  }

  /**
   * Get contracts by chain
   */
  static getContractsByChain(chain: AnkrChain): AnkrContract[] {
    return this.contracts.filter((c) => c.chain === chain);
  }

  /**
   * Get contracts by type
   */
  static getContractsByType(type: AnkrContractType): AnkrContract[] {
    return this.contracts.filter((c) => c.type === type);
  }

  /**
   * Get high-priority contracts (known vulnerabilities or high-value)
   */
  static getHighPriorityContracts(): AnkrContract[] {
    return this.contracts.filter((c) => c.highPriority);
  }

  /**
   * Get contract by address (case-insensitive)
   */
  static getContractByAddress(address: string): AnkrContract | undefined {
    return this.contracts.find(
      (c) => c.address.toLowerCase() === address.toLowerCase()
    );
  }

  /**
   * Get contracts with known risks
   */
  static getContractsWithKnownRisks(): AnkrContract[] {
    return this.contracts.filter((c) => c.knownRisks.length > 0);
  }

  /**
   * Get summary of vulnerability patterns from known risks
   */
  static getVulnerabilityPatterns(): string[] {
    const patterns = new Set<string>();

    this.contracts.forEach((contract) => {
      contract.knownRisks.forEach((risk) => {
        // Extract vulnerability type from risk description
        if (risk.toLowerCase().includes('dos') || risk.toLowerCase().includes('denial')) {
          patterns.add('Denial of Service (DoS)');
        }
        if (risk.toLowerCase().includes('validation')) {
          patterns.add('Validation Errors');
        }
        if (risk.toLowerCase().includes('initialization') || risk.toLowerCase().includes('missing')) {
          patterns.add('Missing Initialization');
        }
        if (risk.toLowerCase().includes('privilege') || risk.toLowerCase().includes('access')) {
          patterns.add('Privilege Escalation / Access Control');
        }
        if (risk.toLowerCase().includes('cross-chain') || risk.toLowerCase().includes('bridge')) {
          patterns.add('Cross-Chain Vulnerabilities');
        }
        if (risk.toLowerCase().includes('oracle')) {
          patterns.add('Oracle Manipulation');
        }
        if (risk.toLowerCase().includes('gas')) {
          patterns.add('Gas Optimization / Gas Limit Issues');
        }
        if (risk.toLowerCase().includes('flash')) {
          patterns.add('Flash Loan / Flash Unstake Attacks');
        }
      });
    });

    return Array.from(patterns).sort();
  }

  /**
   * Get monitoring priority list (sorted by priority)
   */
  static getMonitoringPriorityList(): AnkrContract[] {
    return this.contracts.sort((a, b) => {
      // High priority first
      if (a.highPriority !== b.highPriority) {
        return a.highPriority ? -1 : 1;
      }
      // Then by number of known risks
      return b.knownRisks.length - a.knownRisks.length;
    });
  }

  /**
   * Get contracts by chain and type
   */
  static getContractsByChainAndType(
    chain: AnkrChain,
    type: AnkrContractType
  ): AnkrContract[] {
    return this.contracts.filter((c) => c.chain === chain && c.type === type);
  }

  /**
   * Export registry as JSON for external tools
   */
  static exportToJSON(): string {
    return JSON.stringify(
      {
        metadata: {
          generated: new Date().toISOString(),
          totalContracts: this.contracts.length,
          chains: Object.values(AnkrChain),
          types: Object.values(AnkrContractType),
        },
        contracts: this.contracts,
        vulnerabilityPatterns: this.getVulnerabilityPatterns(),
      },
      null,
      2
    );
  }
}

/**
 * Known vulnerability patterns to monitor for (from audit reports)
 */
export const ANKR_VULNERABILITY_PATTERNS = {
  // From Halborn Aug 2024 - FLOW Liquid Staking
  HALBORN_2024: [
    'Unvalidated EVM execution results',
    'Incorrect resource handling',
    'Missing duplication checks',
    'Hardcoded values',
    'Gas limit issues',
    'Missing initializations',
  ],

  // From Veridise Apr 2024 - BNB Liquid Staking
  VERIDISE_2024: [
    'Flash unstake fee DoS attack',
    'Swap function denial of service',
    'Unnecessarily payable functions',
    'Gas optimization needed',
  ],

  // From Beosin 2022-2023
  BEOSIN: [
    'Deposit/withdraw validation flaws',
    'Missing address validation',
    'Improper function design',
    'Missing event triggers',
    'Redundant code',
  ],

  // From Salus May 2023
  SALUS: [
    'Privilege escalation',
    'Access control issues',
    'Initialization bugs',
  ],
};

/**
 * High-risk functions to monitor (from audit findings)
 */
export const ANKR_HIGH_RISK_FUNCTIONS = [
  // Liquid Staking
  'stake',
  'unstake',
  'flashUnstake',
  'swap',
  'mint',
  'burn',
  'withdraw',
  'deposit',

  // Bridge
  'bridge',
  'lock',
  'unlock',
  'claim',
  'relayMessage',

  // Rewards
  'claimRewards',
  'distributeRewards',
  'updateRewardRate',
  'updateOracle',

  // Admin (privilege escalation risks)
  'setFee',
  'setOracle',
  'pause',
  'unpause',
  'upgradeContract',
  'transferOwnership',
];
