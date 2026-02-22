class ScoringService {
  constructor(graphService, detectionService) {
    this.graphService = graphService;
    this.detectionService = detectionService;

    this.weights = {
      cycle_involvement: 40,
      smurfing_aggregator: 30,
      smurfing_distributor: 30,
      smurfing_participant: 15,
      layered_shell: 20,
      high_velocity: 10
    };

    this.reductions = {
      merchant: 30,
      payroll: 30,
      high_volume_legitimate: 20
    };
  }

  calculateScore(accountId) {
    let score = 0;
    const appliedFactors = [];

    const patterns = this.detectionService.getAccountPatterns(accountId);

    const cyclePattern = patterns.find(p => p.startsWith('cycle_length_'));
    if (cyclePattern) {
      score += this.weights.cycle_involvement;
      appliedFactors.push({ factor: 'cycle_involvement', points: this.weights.cycle_involvement });
    }

    if (patterns.includes('smurfing_aggregator')) {
      score += this.weights.smurfing_aggregator;
      appliedFactors.push({ factor: 'smurfing_aggregator', points: this.weights.smurfing_aggregator });
    } else if (patterns.includes('smurfing_distributor')) {
      score += this.weights.smurfing_distributor;
      appliedFactors.push({ factor: 'smurfing_distributor', points: this.weights.smurfing_distributor });
    } else if (patterns.includes('smurfing_participant')) {
      score += this.weights.smurfing_participant;
      appliedFactors.push({ factor: 'smurfing_participant', points: this.weights.smurfing_participant });
    }

    if (patterns.includes('layered_shell')) {
      score += this.weights.layered_shell;
      appliedFactors.push({ factor: 'layered_shell', points: this.weights.layered_shell });
    }

    if (patterns.includes('high_velocity')) {
      score += this.weights.high_velocity;
      appliedFactors.push({ factor: 'high_velocity', points: this.weights.high_velocity });
    }

    const reductions = this.calculateReductions(accountId);
    score -= reductions.totalReduction;

    score = Math.max(0, Math.min(100, score));

    return {
      account_id: accountId,
      raw_score: score + reductions.totalReduction,
      final_score: score,
      factors: appliedFactors,
      reductions: reductions.applied,
      detected_patterns: patterns,
      ring_id: this.detectionService.getAccountRingId(accountId)
    };
  }

  calculateReductions(accountId) {
    const reductions = [];
    let totalReduction = 0;

    if (this.graphService.isMerchant(accountId)) {
      totalReduction += this.reductions.merchant;
      reductions.push({ factor: 'merchant_account', reduction: this.reductions.merchant });
    }

    if (this.graphService.isPayrollAccount(accountId)) {
      totalReduction += this.reductions.payroll;
      reductions.push({ factor: 'payroll_account', reduction: this.reductions.payroll });
    }

    const stats = this.graphService.getAccountStats(accountId);
    if (stats) {
      const totalTx = stats.outgoingCount + stats.incomingCount;
      if (totalTx > 500 && !this.graphService.isMerchant(accountId)) {
        const variance = this.calculateAmountVariance(accountId);
        if (variance < 0.2) {
          totalReduction += this.reductions.high_volume_legitimate;
          reductions.push({ 
            factor: 'high_volume_low_variance', 
            reduction: this.reductions.high_volume_legitimate 
          });
        }
      }
    }

    return { totalReduction, applied: reductions };
  }

  calculateAmountVariance(accountId) {
    const neighbors = this.graphService.getNeighbors(accountId);
    const allAmounts = [
      ...neighbors.outgoing.map(tx => tx.amount),
      ...neighbors.incoming.map(tx => tx.amount)
    ];

    if (allAmounts.length < 2) return 1;

    const mean = allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length;
    const variance = allAmounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allAmounts.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 1;
  }

  scoreAllAccounts() {
    const suspiciousAccounts = this.detectionService.getSuspiciousAccounts();
    const scoredAccounts = [];

    for (const accountId of suspiciousAccounts) {
      const scoreResult = this.calculateScore(accountId);
      if (scoreResult.final_score > 0) {
        scoredAccounts.push(scoreResult);
      }
    }

    scoredAccounts.sort((a, b) => b.final_score - a.final_score);

    return scoredAccounts;
  }

  calculateRingRiskScores() {
    const rings = this.detectionService.getFraudRings();

    for (const ring of rings) {
      const memberScores = ring.member_accounts.map(accountId => {
        const scoreResult = this.calculateScore(accountId);
        return scoreResult.final_score;
      });

      if (memberScores.length > 0) {
        const avgScore = memberScores.reduce((a, b) => a + b, 0) / memberScores.length;
        const maxScore = Math.max(...memberScores);
        ring.risk_score = Math.round((avgScore * 0.4 + maxScore * 0.6) * 10) / 10;
      }
    }

    return rings;
  }

  generateOutput(processingTimeSeconds) {
    const scoredAccounts = this.scoreAllAccounts();
    const rings = this.calculateRingRiskScores();
    const totalAccounts = this.graphService.getAllAccounts().length;

    const suspicious_accounts = scoredAccounts.map(acc => ({
      account_id: acc.account_id,
      suspicion_score: Math.round(acc.final_score * 10) / 10,
      detected_patterns: acc.detected_patterns,
      ring_id: acc.ring_id
    }));

    const fraud_rings = rings.map(ring => ({
      ring_id: ring.ring_id,
      member_accounts: ring.member_accounts,
      pattern_type: ring.pattern_type,
      risk_score: ring.risk_score
    }));

    const summary = {
      total_accounts_analyzed: totalAccounts,
      suspicious_accounts_flagged: suspicious_accounts.length,
      fraud_rings_detected: fraud_rings.length,
      processing_time_seconds: Math.round(processingTimeSeconds * 100) / 100
    };

    return {
      suspicious_accounts,
      fraud_rings,
      summary
    };
  }

  getDetailedAnalysis() {
    const scoredAccounts = this.scoreAllAccounts();

    return scoredAccounts.map(acc => ({
      account_id: acc.account_id,
      suspicion_score: acc.final_score,
      raw_score: acc.raw_score,
      scoring_factors: acc.factors,
      score_reductions: acc.reductions,
      detected_patterns: acc.detected_patterns,
      ring_id: acc.ring_id,
      account_stats: this.graphService.getAccountStats(acc.account_id),
      is_merchant: this.graphService.isMerchant(acc.account_id),
      is_payroll: this.graphService.isPayrollAccount(acc.account_id)
    }));
  }
}

module.exports = ScoringService;
