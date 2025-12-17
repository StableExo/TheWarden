/**
 * PerformanceMonitor - Autonomous Performance Monitoring Dashboard
 * 
 * Centralized metrics collection, anomaly detection, and real-time monitoring
 * for all autonomous subsystems. Provides early detection of performance issues
 * and data-driven optimization decisions.
 * 
 * Key Capabilities:
 * - Centralized metrics collection from all subsystems
 * - Real-time anomaly detection using statistical methods
 * - Historical performance trending and analysis
 * - Automated alerting for critical issues
 * - Dashboard-ready data structures
 * 
 * Expected Benefits:
 * - Early detection of performance degradation
 * - Data-driven optimization decisions
 * - Historical performance analysis
 * - Automated anomaly detection
 * - Real-time system health visibility
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetric {
  subsystemId: string;
  subsystemName: string;
  timestamp: number;
  metricType: 'cpu' | 'memory' | 'latency' | 'throughput' | 'success_rate' | 'error_rate' | 'custom';
  metricName: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface AnomalyDetection {
  id: string;
  timestamp: number;
  subsystemId: string;
  metricName: string;
  currentValue: number;
  expectedValue: number;
  deviation: number; // Standard deviations from mean
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  recommendation?: string;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  alertType: 'anomaly' | 'threshold' | 'trend' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  subsystemId?: string;
  title: string;
  message: string;
  metrics?: PerformanceMetric[];
  anomalies?: AnomalyDetection[];
  actionRequired: boolean;
  acknowledged: boolean;
  resolvedAt?: number;
}

export interface PerformanceTrend {
  subsystemId: string;
  metricName: string;
  timeWindow: number; // milliseconds
  dataPoints: number;
  trend: 'improving' | 'degrading' | 'stable' | 'volatile';
  slope: number; // rate of change
  volatility: number; // standard deviation
  prediction?: number; // predicted next value
  confidence: number;
}

export interface SystemHealthSnapshot {
  timestamp: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number; // 0-100
  subsystemHealth: Map<string, SubsystemHealth>;
  activeAnomalies: number;
  activeAlerts: number;
  criticalIssues: number;
  trends: PerformanceTrend[];
}

export interface SubsystemHealth {
  subsystemId: string;
  subsystemName: string;
  healthScore: number; // 0-100
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastMetricTime: number;
  metricsCount: number;
  anomaliesCount: number;
  alertsCount: number;
  recentMetrics: PerformanceMetric[];
}

export interface DashboardData {
  snapshot: SystemHealthSnapshot;
  recentMetrics: PerformanceMetric[];
  recentAnomalies: AnomalyDetection[];
  activeAlerts: PerformanceAlert[];
  trends: PerformanceTrend[];
  historicalData: {
    timestamps: number[];
    healthScores: number[];
    metricsBySubsystem: Map<string, number[]>;
  };
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private anomalies: AnomalyDetection[] = [];
  private alerts: PerformanceAlert[] = [];
  private trends: Map<string, PerformanceTrend> = new Map();
  
  // Statistical baselines for anomaly detection
  private baselines: Map<string, {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    samples: number;
  }> = new Map();
  
  // Alert thresholds
  private thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 75, critical: 95 },
    latency: { warning: 1000, critical: 5000 }, // ms
    error_rate: { warning: 0.05, critical: 0.1 }, // 5%, 10%
    success_rate: { warning: 0.9, critical: 0.7 }, // 90%, 70%
  };
  
  // Anomaly detection settings
  private anomalySettings = {
    minSamples: 10, // Minimum samples needed for baseline
    deviationThreshold: 2.5, // Standard deviations to flag as anomaly
    highDeviationThreshold: 3.5, // Standard deviations for high severity
    criticalDeviationThreshold: 5.0, // Standard deviations for critical
  };

  constructor() {}

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics (last 10000)
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }

    // Update baseline statistics
    this.updateBaseline(metric);
    
    // Check for anomalies
    const anomaly = this.detectAnomaly(metric);
    if (anomaly) {
      this.anomalies.push(anomaly);
      
      // Generate alert for high severity anomalies
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        this.createAlert({
          alertType: 'anomaly',
          severity: anomaly.severity === 'critical' ? 'critical' : 'error',
          subsystemId: metric.subsystemId,
          title: `Anomaly detected in ${metric.metricName}`,
          message: anomaly.description,
          anomalies: [anomaly],
          actionRequired: anomaly.severity === 'critical',
        });
      }
    }
    
    // Check threshold violations
    this.checkThresholds(metric);
    
    // Update trends
    this.updateTrends(metric);
  }

  /**
   * Update baseline statistics for a metric
   */
  private updateBaseline(metric: PerformanceMetric): void {
    const key = `${metric.subsystemId}:${metric.metricName}`;
    const baseline = this.baselines.get(key);

    if (!baseline) {
      this.baselines.set(key, {
        mean: metric.value,
        stdDev: 0,
        min: metric.value,
        max: metric.value,
        samples: 1,
      });
      return;
    }

    // Update using Welford's online algorithm for running mean and variance
    baseline.samples++;
    const delta = metric.value - baseline.mean;
    baseline.mean += delta / baseline.samples;
    const delta2 = metric.value - baseline.mean;
    
    // Running variance calculation
    if (baseline.samples > 1) {
      const variance = ((baseline.samples - 2) * baseline.stdDev ** 2 + delta * delta2) / (baseline.samples - 1);
      baseline.stdDev = Math.sqrt(Math.max(0, variance));
    }
    
    baseline.min = Math.min(baseline.min, metric.value);
    baseline.max = Math.max(baseline.max, metric.value);
    
    this.baselines.set(key, baseline);
  }

  /**
   * Detect anomalies in a metric using statistical methods
   */
  private detectAnomaly(metric: PerformanceMetric): AnomalyDetection | null {
    const key = `${metric.subsystemId}:${metric.metricName}`;
    const baseline = this.baselines.get(key);

    if (!baseline || baseline.samples < this.anomalySettings.minSamples) {
      return null; // Not enough data for anomaly detection
    }

    if (baseline.stdDev === 0) {
      return null; // No variance, can't detect anomalies
    }

    const deviation = Math.abs(metric.value - baseline.mean) / baseline.stdDev;
    
    if (deviation < this.anomalySettings.deviationThreshold) {
      return null; // Within normal range
    }

    // Determine severity based on deviation
    let severity: AnomalyDetection['severity'];
    if (deviation >= this.anomalySettings.criticalDeviationThreshold) {
      severity = 'critical';
    } else if (deviation >= this.anomalySettings.highDeviationThreshold) {
      severity = 'high';
    } else if (deviation >= this.anomalySettings.deviationThreshold + 0.5) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    const expectedValue = baseline.mean;
    const confidence = Math.min(0.95, baseline.samples / 100); // Higher confidence with more samples

    const direction = metric.value > baseline.mean ? 'above' : 'below';
    const description = 
      `${metric.metricName} is ${deviation.toFixed(1)}σ ${direction} baseline ` +
      `(current: ${metric.value.toFixed(2)}${metric.unit}, expected: ${expectedValue.toFixed(2)}${metric.unit})`;

    const recommendation = this.generateAnomalyRecommendation(metric, deviation, direction);

    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      subsystemId: metric.subsystemId,
      metricName: metric.metricName,
      currentValue: metric.value,
      expectedValue,
      deviation,
      severity,
      confidence,
      description,
      recommendation,
    };
  }

  /**
   * Generate recommendation for an anomaly
   */
  private generateAnomalyRecommendation(
    metric: PerformanceMetric,
    deviation: number,
    direction: 'above' | 'below'
  ): string {
    const recommendations: string[] = [];

    // Metric-specific recommendations
    switch (metric.metricType) {
      case 'cpu':
        if (direction === 'above') {
          recommendations.push('Reduce workload or optimize CPU-intensive operations');
          recommendations.push('Consider scaling resources or throttling requests');
        }
        break;
      
      case 'memory':
        if (direction === 'above') {
          recommendations.push('Check for memory leaks');
          recommendations.push('Clear caches or reduce in-memory data structures');
        }
        break;
      
      case 'latency':
        if (direction === 'above') {
          recommendations.push('Investigate network bottlenecks');
          recommendations.push('Optimize slow operations or add caching');
        }
        break;
      
      case 'error_rate':
        if (direction === 'above') {
          recommendations.push('Review recent errors in logs');
          recommendations.push('Check external dependencies for issues');
        }
        break;
      
      case 'success_rate':
        if (direction === 'below') {
          recommendations.push('Investigate recent failures');
          recommendations.push('Validate input data quality');
        }
        break;
    }

    // Severity-based recommendations
    if (deviation >= this.anomalySettings.criticalDeviationThreshold) {
      recommendations.unshift('CRITICAL: Immediate investigation required');
      recommendations.push('Consider emergency circuit breaker activation');
    }

    return recommendations.join('; ');
  }

  /**
   * Check if metric violates predefined thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds[metric.metricType as keyof typeof this.thresholds];
    if (!threshold) return;

    let severity: PerformanceAlert['severity'] | null = null;
    let message = '';

    if (metric.metricType === 'success_rate') {
      // For success rate, lower is worse
      if (metric.value <= threshold.critical) {
        severity = 'critical';
        message = `Success rate critically low: ${(metric.value * 100).toFixed(1)}%`;
      } else if (metric.value <= threshold.warning) {
        severity = 'warning';
        message = `Success rate below threshold: ${(metric.value * 100).toFixed(1)}%`;
      }
    } else {
      // For other metrics, higher is worse
      if (metric.value >= threshold.critical) {
        severity = 'critical';
        message = `${metric.metricName} critically high: ${metric.value.toFixed(1)}${metric.unit}`;
      } else if (metric.value >= threshold.warning) {
        severity = 'warning';
        message = `${metric.metricName} above threshold: ${metric.value.toFixed(1)}${metric.unit}`;
      }
    }

    if (severity) {
      this.createAlert({
        alertType: 'threshold',
        severity,
        subsystemId: metric.subsystemId,
        title: `Threshold violation: ${metric.metricName}`,
        message,
        metrics: [metric],
        actionRequired: severity === 'critical',
      });
    }
  }

  /**
   * Update performance trends for a metric
   */
  private updateTrends(metric: PerformanceMetric): void {
    const key = `${metric.subsystemId}:${metric.metricName}`;
    const timeWindow = 300000; // 5 minutes
    const now = Date.now();

    // Get recent metrics for this subsystem and metric
    const recentMetrics = this.metrics
      .filter(m => 
        m.subsystemId === metric.subsystemId &&
        m.metricName === metric.metricName &&
        m.timestamp > now - timeWindow
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    if (recentMetrics.length < 5) return; // Need at least 5 points for trend

    // Calculate trend using linear regression
    const values = recentMetrics.map(m => m.value);
    const timestamps = recentMetrics.map(m => m.timestamp);
    
    const { slope, volatility } = this.calculateTrend(timestamps, values);
    
    // Determine trend direction
    let trend: PerformanceTrend['trend'];
    if (Math.abs(slope) < volatility * 0.1) {
      trend = 'stable';
    } else if (volatility > values.reduce((a, b) => a + b, 0) / values.length * 0.5) {
      trend = 'volatile';
    } else if (slope > 0) {
      // For success_rate, increasing is improving; for others, increasing might be degrading
      trend = metric.metricType === 'success_rate' ? 'improving' : 'degrading';
    } else {
      trend = metric.metricType === 'success_rate' ? 'degrading' : 'improving';
    }

    // Predict next value (simple linear extrapolation)
    const prediction = values[values.length - 1] + slope;
    const confidence = Math.max(0.5, 1 - (volatility / (values.reduce((a, b) => a + b, 0) / values.length)));

    const trendData: PerformanceTrend = {
      subsystemId: metric.subsystemId,
      metricName: metric.metricName,
      timeWindow,
      dataPoints: recentMetrics.length,
      trend,
      slope,
      volatility,
      prediction,
      confidence,
    };

    this.trends.set(key, trendData);

    // Alert on degrading trends
    if (trend === 'degrading' && Math.abs(slope) > volatility) {
      this.createAlert({
        alertType: 'trend',
        severity: 'warning',
        subsystemId: metric.subsystemId,
        title: `Degrading trend detected: ${metric.metricName}`,
        message: `${metric.metricName} is trending ${slope > 0 ? 'upward' : 'downward'} at ${Math.abs(slope).toFixed(2)}${metric.unit}/min`,
        actionRequired: false,
      });
    }
  }

  /**
   * Calculate linear regression for trend analysis
   */
  private calculateTrend(timestamps: number[], values: number[]): {
    slope: number;
    volatility: number;
  } {
    const n = values.length;
    if (n < 2) return { slope: 0, volatility: 0 };

    // Normalize timestamps to minutes from first point
    const normalizedTimes = timestamps.map(t => (t - timestamps[0]) / 60000);
    
    // Calculate means
    const meanX = normalizedTimes.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    
    // Calculate slope (linear regression)
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (normalizedTimes[i] - meanX) * (values[i] - meanY);
      denominator += (normalizedTimes[i] - meanX) ** 2;
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Calculate volatility (standard deviation)
    const squaredDiffs = values.map(v => (v - meanY) ** 2);
    const volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n);
    
    return { slope, volatility };
  }

  /**
   * Create an alert
   */
  private createAlert(params: {
    alertType: PerformanceAlert['alertType'];
    severity: PerformanceAlert['severity'];
    subsystemId?: string;
    title: string;
    message: string;
    metrics?: PerformanceMetric[];
    anomalies?: AnomalyDetection[];
    actionRequired: boolean;
  }): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      alertType: params.alertType,
      severity: params.severity,
      subsystemId: params.subsystemId,
      title: params.title,
      message: params.message,
      metrics: params.metrics,
      anomalies: params.anomalies,
      actionRequired: params.actionRequired,
      acknowledged: false,
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Get system health snapshot
   */
  getHealthSnapshot(): SystemHealthSnapshot {
    const now = Date.now();
    const subsystemHealth = new Map<string, SubsystemHealth>();
    
    // Calculate health for each subsystem
    const subsystemIds = [...new Set(this.metrics.map(m => m.subsystemId))];
    
    subsystemIds.forEach(id => {
      const subsystemMetrics = this.metrics.filter(m => m.subsystemId === id);
      const recentMetrics = subsystemMetrics.filter(m => m.timestamp > now - 60000); // Last minute
      const subsystemAnomalies = this.anomalies.filter(a => a.subsystemId === id && a.timestamp > now - 300000);
      const subsystemAlerts = this.alerts.filter(a => a.subsystemId === id && !a.acknowledged);
      
      // Calculate health score (0-100)
      let healthScore = 100;
      
      // Deduct for anomalies
      subsystemAnomalies.forEach(a => {
        if (a.severity === 'critical') healthScore -= 30;
        else if (a.severity === 'high') healthScore -= 15;
        else if (a.severity === 'medium') healthScore -= 7;
        else healthScore -= 3;
      });
      
      // Deduct for active alerts
      subsystemAlerts.forEach(a => {
        if (a.severity === 'critical') healthScore -= 20;
        else if (a.severity === 'error') healthScore -= 10;
        else if (a.severity === 'warning') healthScore -= 5;
      });
      
      // Deduct if no recent metrics (offline)
      if (recentMetrics.length === 0 && subsystemMetrics.length > 0) {
        healthScore -= 50;
      }
      
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      // Determine status
      let status: SubsystemHealth['status'];
      if (healthScore >= 80) status = 'healthy';
      else if (healthScore >= 50) status = 'degraded';
      else if (recentMetrics.length === 0) status = 'offline';
      else status = 'critical';
      
      subsystemHealth.set(id, {
        subsystemId: id,
        subsystemName: subsystemMetrics[0]?.subsystemName || id,
        healthScore,
        status,
        lastMetricTime: recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1].timestamp : 0,
        metricsCount: subsystemMetrics.length,
        anomaliesCount: subsystemAnomalies.length,
        alertsCount: subsystemAlerts.length,
        recentMetrics: recentMetrics.slice(-10),
      });
    });
    
    // Calculate overall health
    const avgHealth = subsystemIds.length > 0
      ? Array.from(subsystemHealth.values()).reduce((sum, h) => sum + h.healthScore, 0) / subsystemIds.length
      : 100;
    
    let overallHealth: SystemHealthSnapshot['overallHealth'];
    if (avgHealth >= 90) overallHealth = 'excellent';
    else if (avgHealth >= 75) overallHealth = 'good';
    else if (avgHealth >= 50) overallHealth = 'fair';
    else if (avgHealth >= 25) overallHealth = 'poor';
    else overallHealth = 'critical';
    
    const activeAnomalies = this.anomalies.filter(a => a.timestamp > now - 300000).length;
    const activeAlerts = this.alerts.filter(a => !a.acknowledged).length;
    const criticalIssues = this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
    
    return {
      timestamp: now,
      overallHealth,
      healthScore: avgHealth,
      subsystemHealth,
      activeAnomalies,
      activeAlerts,
      criticalIssues,
      trends: Array.from(this.trends.values()),
    };
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): DashboardData {
    const snapshot = this.getHealthSnapshot();
    const now = Date.now();
    const recentWindow = 300000; // 5 minutes
    
    const recentMetrics = this.metrics
      .filter(m => m.timestamp > now - recentWindow)
      .slice(-100);
    
    const recentAnomalies = this.anomalies
      .filter(a => a.timestamp > now - recentWindow)
      .slice(-20);
    
    const activeAlerts = this.alerts
      .filter(a => !a.acknowledged)
      .sort((a, b) => {
        // Sort by severity
        const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    
    // Historical data (last hour, 1-minute buckets)
    const historicalWindow = 3600000; // 1 hour
    const bucketSize = 60000; // 1 minute
    const bucketCount = historicalWindow / bucketSize;
    
    const timestamps: number[] = [];
    const healthScores: number[] = [];
    const metricsBySubsystem = new Map<string, number[]>();
    
    for (let i = 0; i < bucketCount; i++) {
      const bucketTime = now - (bucketCount - i) * bucketSize;
      timestamps.push(bucketTime);
      
      // Calculate health score for this time bucket
      // (simplified - in production, would need to recalculate based on metrics at that time)
      healthScores.push(snapshot.healthScore);
    }
    
    return {
      snapshot,
      recentMetrics,
      recentAnomalies,
      activeAlerts,
      trends: Array.from(this.trends.values()),
      historicalData: {
        timestamps,
        healthScores,
        metricsBySubsystem,
      },
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    
    alert.acknowledged = true;
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    
    alert.acknowledged = true;
    alert.resolvedAt = Date.now();
    return true;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const now = Date.now();
    const recentWindow = 300000; // 5 minutes
    
    return {
      totalMetrics: this.metrics.length,
      totalAnomalies: this.anomalies.length,
      totalAlerts: this.alerts.length,
      recentMetrics: this.metrics.filter(m => m.timestamp > now - recentWindow).length,
      recentAnomalies: this.anomalies.filter(a => a.timestamp > now - recentWindow).length,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      subsystemsMonitored: new Set(this.metrics.map(m => m.subsystemId)).size,
      healthSnapshot: this.getHealthSnapshot(),
    };
  }

  /**
   * Clear old data (memory management)
   */
  cleanup(maxAge: number = 3600000): void { // Default 1 hour
    const cutoff = Date.now() - maxAge;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.anomalies = this.anomalies.filter(a => a.timestamp > cutoff);
    // Keep all alerts regardless of age for audit purposes
  }
}
