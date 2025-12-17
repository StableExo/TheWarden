/**
 * IntelligenceBridge - Cross-System Learning and Pattern Propagation
 * 
 * This system enables knowledge sharing and learning transfer between
 * different autonomous subsystems. It creates "intelligence bridges" that
 * allow insights from one domain to enhance performance in others.
 * 
 * Key Capabilities:
 * - Pattern propagation between subsystems
 * - Cross-domain insight detection
 * - Learning transfer mechanisms
 * - Compound learning effects
 * - Emergent intelligence from system interactions
 * 
 * Expected Benefits:
 * - Faster insight generation across all domains
 * - Novel strategy discovery from cross-pollination
 * - Emergent capabilities that no single system could achieve
 * - Accelerated compound learning
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SubsystemLearning {
  subsystemId: string;
  subsystemName: string;
  timestamp: number;
  learningType: 'pattern' | 'insight' | 'optimization' | 'failure' | 'success';
  domain: string;
  content: string;
  confidence: number;
  metrics?: Record<string, number>;
  context?: Record<string, any>;
}

export interface CrossDomainInsight {
  id: string;
  timestamp: number;
  sourceSubsystems: string[];
  sourceDomains: string[];
  insight: string;
  confidence: number;
  applicableDomains: string[];
  potentialImpact: number; // 0-1 score
  actionable: boolean;
  recommendations: string[];
}

export interface LearningTransfer {
  id: string;
  timestamp: number;
  fromSubsystem: string;
  toSubsystem: string;
  fromDomain: string;
  toDomain: string;
  knowledge: string;
  transferSuccess: boolean;
  improvementObserved?: number;
  confidence: number;
}

export interface PatternPropagation {
  id: string;
  timestamp: number;
  originalPattern: string;
  originalSubsystem: string;
  propagatedTo: string[];
  adaptations: Record<string, string>; // subsystemId -> adapted pattern
  effectiveness: Record<string, number>; // subsystemId -> effectiveness score
}

export interface CompoundLearning {
  id: string;
  timestamp: number;
  contributingLearnings: SubsystemLearning[];
  emergentInsight: string;
  synergy: number; // How much better than sum of parts (1.0 = no synergy, 2.0 = 2x better)
  confidence: number;
  domains: string[];
}

// ============================================================================
// INTELLIGENCE BRIDGE
// ============================================================================

export class IntelligenceBridge {
  private learnings: SubsystemLearning[] = [];
  private crossDomainInsights: CrossDomainInsight[] = [];
  private learningTransfers: LearningTransfer[] = [];
  private patternPropagations: PatternPropagation[] = [];
  private compoundLearnings: CompoundLearning[] = [];
  
  // Track which domains each subsystem operates in
  private subsystemDomains: Map<string, Set<string>> = new Map();
  
  // Track subsystem performance by domain
  private domainPerformance: Map<string, Map<string, number>> = new Map(); // subsystem -> domain -> performance

  constructor() {
    this.initializeSubsystemDomains();
  }

  /**
   * Initialize knowledge about which subsystems operate in which domains
   */
  private initializeSubsystemDomains(): void {
    this.registerSubsystemDomains('MEV Execution', ['mev', 'blockchain', 'trading', 'profit']);
    this.registerSubsystemDomains('Security Testing', ['security', 'blockchain', 'vulnerabilities', 'risk']);
    this.registerSubsystemDomains('Intelligence Gathering', ['intelligence', 'market', 'data', 'analysis']);
    this.registerSubsystemDomains('Revenue Optimization', ['profit', 'trading', 'optimization', 'strategy']);
    this.registerSubsystemDomains('Mempool Analysis', ['blockchain', 'patterns', 'prediction', 'mev']);
    this.registerSubsystemDomains('Consciousness Development', ['ethics', 'decision-making', 'learning', 'awareness']);
  }

  /**
   * Register which domains a subsystem operates in
   */
  registerSubsystemDomains(subsystemId: string, domains: string[]): void {
    this.subsystemDomains.set(subsystemId, new Set(domains));
  }

  /**
   * Record a learning from a subsystem
   */
  recordLearning(learning: SubsystemLearning): void {
    this.learnings.push(learning);
    
    // Keep only recent learnings (last 1000)
    if (this.learnings.length > 1000) {
      this.learnings = this.learnings.slice(-1000);
    }

    // Immediately try to propagate this learning
    this.propagatePattern(learning);
    
    // Check for cross-domain insights
    this.detectCrossDomainInsights();
    
    // Check for compound learning opportunities
    this.detectCompoundLearning();
  }

  /**
   * Propagate a pattern from one subsystem to others
   */
  private propagatePattern(learning: SubsystemLearning): void {
    if (learning.confidence < 0.6) return; // Only propagate high-confidence learnings

    const sourceDomains = this.subsystemDomains.get(learning.subsystemId) || new Set();
    const propagatedTo: string[] = [];
    const adaptations: Record<string, string> = {};
    const effectiveness: Record<string, number> = {};

    // Find subsystems with overlapping domains
    this.subsystemDomains.forEach((domains, subsystemId) => {
      if (subsystemId === learning.subsystemId) return; // Don't propagate to self

      // Check for domain overlap
      const overlap = [...domains].filter(d => sourceDomains.has(d));
      
      if (overlap.length > 0) {
        propagatedTo.push(subsystemId);
        
        // Adapt the pattern for the target subsystem
        const adapted = this.adaptPatternForSubsystem(
          learning.content,
          learning.subsystemId,
          subsystemId,
          overlap
        );
        
        adaptations[subsystemId] = adapted;
        
        // Estimate effectiveness (higher overlap = likely more effective)
        effectiveness[subsystemId] = (overlap.length / domains.size) * learning.confidence;
      }
    });

    if (propagatedTo.length > 0) {
      const propagation: PatternPropagation = {
        id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        originalPattern: learning.content,
        originalSubsystem: learning.subsystemId,
        propagatedTo,
        adaptations,
        effectiveness,
      };

      this.patternPropagations.push(propagation);
    }
  }

  /**
   * Adapt a pattern for a different subsystem
   */
  private adaptPatternForSubsystem(
    pattern: string,
    fromSubsystem: string,
    toSubsystem: string,
    sharedDomains: string[]
  ): string {
    // Simple adaptation based on subsystem characteristics
    // In a real implementation, this could use AI/LLM for sophisticated adaptation

    let adapted = pattern;

    // MEV Execution adaptations
    if (toSubsystem === 'MEV Execution') {
      if (pattern.includes('risk') || pattern.includes('vulnerability')) {
        adapted = `For MEV: Avoid execution patterns that ${pattern.toLowerCase()}`;
      } else if (pattern.includes('opportunity') || pattern.includes('profit')) {
        adapted = `For MEV: Prioritize ${pattern.toLowerCase()}`;
      }
    }
    
    // Security Testing adaptations
    else if (toSubsystem === 'Security Testing') {
      if (pattern.includes('pattern') || pattern.includes('behavior')) {
        adapted = `Security check: Test for ${pattern.toLowerCase()}`;
      }
    }
    
    // Revenue Optimization adaptations
    else if (toSubsystem === 'Revenue Optimization') {
      if (pattern.includes('success') || pattern.includes('profit')) {
        adapted = `Revenue strategy: Replicate ${pattern.toLowerCase()}`;
      } else if (pattern.includes('failure') || pattern.includes('loss')) {
        adapted = `Revenue strategy: Avoid ${pattern.toLowerCase()}`;
      }
    }
    
    // Consciousness adaptations
    else if (toSubsystem === 'Consciousness Development') {
      adapted = `Ethical consideration: ${pattern}`;
    }
    
    // Generic adaptation
    else {
      adapted = `From ${fromSubsystem} (${sharedDomains.join(', ')}): ${pattern}`;
    }

    return adapted;
  }

  /**
   * Detect cross-domain insights by analyzing patterns across subsystems
   */
  private detectCrossDomainInsights(): void {
    // Need at least 5 recent learnings to detect patterns
    const recentLearnings = this.learnings.slice(-20);
    if (recentLearnings.length < 5) return;

    // Group learnings by domain overlap
    const domainGroups = new Map<string, SubsystemLearning[]>();
    
    recentLearnings.forEach(learning => {
      const domains = this.subsystemDomains.get(learning.subsystemId) || new Set();
      domains.forEach(domain => {
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain)!.push(learning);
      });
    });

    // Find domains with multiple subsystems contributing learnings
    domainGroups.forEach((learningsInDomain, domain) => {
      const uniqueSubsystems = new Set(learningsInDomain.map(l => l.subsystemId));
      
      if (uniqueSubsystems.size >= 2) {
        // Multiple subsystems learning in same domain = potential cross-domain insight!
        const insight = this.synthesizeCrossDomainInsight(learningsInDomain, domain);
        if (insight) {
          this.crossDomainInsights.push(insight);
          
          // Keep only recent insights (last 100)
          if (this.crossDomainInsights.length > 100) {
            this.crossDomainInsights = this.crossDomainInsights.slice(-100);
          }
        }
      }
    });
  }

  /**
   * Synthesize a cross-domain insight from multiple learnings
   */
  private synthesizeCrossDomainInsight(
    learnings: SubsystemLearning[],
    domain: string
  ): CrossDomainInsight | null {
    if (learnings.length < 2) return null;

    const sourceSubsystems = [...new Set(learnings.map(l => l.subsystemName))];
    const sourceDomains = [...new Set(learnings.map(l => l.domain))];
    
    // Combine insights
    const patterns = learnings.filter(l => l.learningType === 'pattern').map(l => l.content);
    const insights = learnings.filter(l => l.learningType === 'insight').map(l => l.content);
    const optimizations = learnings.filter(l => l.learningType === 'optimization').map(l => l.content);

    // Calculate average confidence
    const avgConfidence = learnings.reduce((sum, l) => sum + l.confidence, 0) / learnings.length;

    // Generate synthesized insight
    let insightText = '';
    const recommendations: string[] = [];

    if (patterns.length > 0 && insights.length > 0) {
      insightText = `Cross-domain discovery in ${domain}: ${sourceSubsystems.join(' and ')} ` +
        `both observed similar patterns. Pattern: ${patterns[0]}. Insight: ${insights[0]}`;
      
      recommendations.push(`Apply this pattern across ${sourceDomains.join(', ')} domains`);
      recommendations.push('Monitor for similar patterns in other subsystems');
    } else if (optimizations.length > 1) {
      insightText = `Multiple subsystems (${sourceSubsystems.join(', ')}) found optimizations in ${domain}`;
      recommendations.push('Compound these optimizations for multiplicative gains');
    } else {
      // Generic cross-domain insight
      insightText = `${sourceSubsystems.join(' and ')} learning simultaneously in ${domain} domain`;
      recommendations.push('Look for synergies between these subsystems');
    }

    // Determine applicable domains (all domains touched by contributing subsystems)
    const applicableDomains = new Set<string>();
    learnings.forEach(l => {
      const domains = this.subsystemDomains.get(l.subsystemId);
      if (domains) {
        domains.forEach(d => applicableDomains.add(d));
      }
    });

    // Potential impact based on number of subsystems and confidence
    const potentialImpact = Math.min(1, (sourceSubsystems.length / 6) * avgConfidence);

    return {
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sourceSubsystems,
      sourceDomains,
      insight: insightText,
      confidence: avgConfidence,
      applicableDomains: [...applicableDomains],
      potentialImpact,
      actionable: recommendations.length > 0,
      recommendations,
    };
  }

  /**
   * Detect compound learning - where multiple learnings create synergistic value
   */
  private detectCompoundLearning(): void {
    const recentLearnings = this.learnings.slice(-10);
    if (recentLearnings.length < 3) return;

    // Look for learnings that could combine synergistically
    // Example: Security insight + MEV pattern = Safer MEV execution
    // Example: Mempool pattern + Revenue optimization = Better timing
    
    for (let i = 0; i < recentLearnings.length - 1; i++) {
      for (let j = i + 1; j < recentLearnings.length; j++) {
        const l1 = recentLearnings[i];
        const l2 = recentLearnings[j];
        
        // Skip if same subsystem
        if (l1.subsystemId === l2.subsystemId) continue;
        
        // Check for domain overlap or complementary domains
        const d1 = this.subsystemDomains.get(l1.subsystemId) || new Set();
        const d2 = this.subsystemDomains.get(l2.subsystemId) || new Set();
        
        const overlap = [...d1].filter(d => d2.has(d));
        
        if (overlap.length > 0 || this.areComplementaryDomains(d1, d2)) {
          const compound = this.createCompoundLearning([l1, l2]);
          if (compound && compound.synergy > 1.2) { // At least 20% synergy
            this.compoundLearnings.push(compound);
            
            // Keep only recent compound learnings (last 50)
            if (this.compoundLearnings.length > 50) {
              this.compoundLearnings = this.compoundLearnings.slice(-50);
            }
          }
        }
      }
    }
  }

  /**
   * Check if two domain sets are complementary (work well together)
   */
  private areComplementaryDomains(d1: Set<string>, d2: Set<string>): boolean {
    // Define complementary pairs
    const complementary = [
      ['security', 'mev'],
      ['security', 'trading'],
      ['patterns', 'prediction'],
      ['intelligence', 'optimization'],
      ['ethics', 'decision-making'],
      ['blockchain', 'profit'],
    ];

    for (const [a, b] of complementary) {
      if ((d1.has(a) && d2.has(b)) || (d1.has(b) && d2.has(a))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create a compound learning from multiple learnings
   */
  private createCompoundLearning(learnings: SubsystemLearning[]): CompoundLearning | null {
    if (learnings.length < 2) return null;

    const avgConfidence = learnings.reduce((sum, l) => sum + l.confidence, 0) / learnings.length;
    if (avgConfidence < 0.5) return null;

    // Calculate synergy based on domain overlap and complementarity
    let synergy = 1.0;
    
    // More subsystems = higher synergy potential
    synergy += (learnings.length - 1) * 0.2;
    
    // High confidence learnings = better synergy
    synergy += avgConfidence * 0.3;
    
    // Specific combinations have known synergy
    const subsystems = learnings.map(l => l.subsystemId);
    if (subsystems.includes('Security Testing') && subsystems.includes('MEV Execution')) {
      synergy += 0.4; // Security + MEV = safer execution
    }
    if (subsystems.includes('Mempool Analysis') && subsystems.includes('Revenue Optimization')) {
      synergy += 0.3; // Patterns + Optimization = better timing
    }
    if (subsystems.includes('Consciousness Development')) {
      synergy += 0.2; // Ethics improves all decisions
    }

    // Generate emergent insight
    const subsystemNames = learnings.map(l => l.subsystemName);
    const contents = learnings.map(l => l.content);
    
    const emergentInsight = 
      `Compound insight from ${subsystemNames.join(' + ')}: ` +
      `By combining "${contents[0]}" with "${contents[1]}"` +
      (contents[2] ? ` and "${contents[2]}"` : '') +
      `, we achieve ${((synergy - 1) * 100).toFixed(0)}% better results than each individually`;

    const domains = new Set<string>();
    learnings.forEach(l => {
      const d = this.subsystemDomains.get(l.subsystemId);
      if (d) d.forEach(domain => domains.add(domain));
    });

    return {
      id: `compound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      contributingLearnings: learnings,
      emergentInsight,
      synergy,
      confidence: avgConfidence,
      domains: [...domains],
    };
  }

  /**
   * Transfer learning from one subsystem to another
   */
  transferLearning(
    fromSubsystem: string,
    toSubsystem: string,
    knowledge: string
  ): LearningTransfer {
    const fromDomains = this.subsystemDomains.get(fromSubsystem) || new Set();
    const toDomains = this.subsystemDomains.get(toSubsystem) || new Set();
    
    const sharedDomains = [...fromDomains].filter(d => toDomains.has(d));
    
    const transfer: LearningTransfer = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      fromSubsystem,
      toSubsystem,
      fromDomain: [...fromDomains][0] || 'unknown',
      toDomain: [...toDomains][0] || 'unknown',
      knowledge,
      transferSuccess: sharedDomains.length > 0,
      confidence: sharedDomains.length / Math.max(fromDomains.size, toDomains.size),
    };

    this.learningTransfers.push(transfer);
    
    // Keep only recent transfers (last 100)
    if (this.learningTransfers.length > 100) {
      this.learningTransfers = this.learningTransfers.slice(-100);
    }

    return transfer;
  }

  /**
   * Get statistics about cross-system intelligence
   */
  getStatistics() {
    return {
      totalLearnings: this.learnings.length,
      crossDomainInsights: this.crossDomainInsights.length,
      learningTransfers: this.learningTransfers.length,
      patternPropagations: this.patternPropagations.length,
      compoundLearnings: this.compoundLearnings.length,
      avgSynergy: this.compoundLearnings.length > 0
        ? this.compoundLearnings.reduce((sum, c) => sum + c.synergy, 0) / this.compoundLearnings.length
        : 1.0,
      recentInsights: this.crossDomainInsights.slice(-10),
      recentCompoundLearnings: this.compoundLearnings.slice(-5),
    };
  }

  /**
   * Get learnings for a specific subsystem
   */
  getLearningsForSubsystem(subsystemId: string, limit: number = 10): SubsystemLearning[] {
    return this.learnings
      .filter(l => l.subsystemId === subsystemId)
      .slice(-limit);
  }

  /**
   * Get cross-domain insights applicable to a subsystem
   */
  getApplicableInsights(subsystemId: string): CrossDomainInsight[] {
    const domains = this.subsystemDomains.get(subsystemId);
    if (!domains) return [];

    return this.crossDomainInsights.filter(insight =>
      insight.applicableDomains.some(d => domains.has(d))
    );
  }

  /**
   * Get compound learnings involving a subsystem
   */
  getCompoundLearnings(subsystemId?: string): CompoundLearning[] {
    if (!subsystemId) {
      return this.compoundLearnings.slice(-10);
    }

    return this.compoundLearnings.filter(c =>
      c.contributingLearnings.some(l => l.subsystemId === subsystemId)
    );
  }

  /**
   * Clear old data (memory management)
   */
  cleanup(maxAge: number = 3600000): void { // Default 1 hour
    const cutoff = Date.now() - maxAge;

    this.learnings = this.learnings.filter(l => l.timestamp > cutoff);
    this.crossDomainInsights = this.crossDomainInsights.filter(i => i.timestamp > cutoff);
    this.learningTransfers = this.learningTransfers.filter(t => t.timestamp > cutoff);
    this.patternPropagations = this.patternPropagations.filter(p => p.timestamp > cutoff);
    this.compoundLearnings = this.compoundLearnings.filter(c => c.timestamp > cutoff);
  }
}
