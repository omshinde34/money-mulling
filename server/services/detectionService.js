const { v4: uuidv4 } = require('uuid');
const TimeWindow = require('../utils/timeWindow');

class DetectionService {
  constructor(graphService) {
    this.graphService = graphService;
    this.timeWindow = new TimeWindow(72);
    this.detectedCycles = new Map();
    this.detectedSmurfing = new Map();
    this.detectedLayeredShells = new Map();
    this.fraudRings = [];
    this.ringCounter = 0;
  }

  reset() {
    this.detectedCycles.clear();
    this.detectedSmurfing.clear();
    this.detectedLayeredShells.clear();
    this.fraudRings = [];
    this.ringCounter = 0;
  }

  generateRingId() {
    this.ringCounter++;
    return `RING_${String(this.ringCounter).padStart(3, '0')}`;
  }

  normalizeCycle(cycle) {
    if (cycle.length === 0) return '';
    const minIndex = cycle.indexOf(Math.min(...cycle.map((_, i) => cycle[i])));
    const normalized = [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
    return normalized.join('->');
  }

  detectCycles(minLength = 3, maxLength = 5) {
    const cycles = [];
    const visited = new Set();
    const cycleSet = new Set();
    const accounts = this.graphService.getAllAccounts();

    for (const startNode of accounts) {
      if (this.graphService.isMerchant(startNode) || this.graphService.isPayrollAccount(startNode)) {
        continue;
      }

      this.dfsForCycles(startNode, startNode, [startNode], visited, cycleSet, cycles, minLength, maxLength);
    }

    const ringId = cycles.length > 0 ? this.generateRingId() : null;

    for (const cycle of cycles) {
      const cycleInfo = {
        cycle,
        length: cycle.length,
        pattern_type: 'cycle',
        ring_id: ringId
      };

      for (const accountId of cycle) {
        if (!this.detectedCycles.has(accountId)) {
          this.detectedCycles.set(accountId, []);
        }
        this.detectedCycles.get(accountId).push(cycleInfo);
      }
    }

    if (cycles.length > 0) {
      const allMembers = new Set();
      cycles.forEach(cycle => cycle.forEach(acc => allMembers.add(acc)));

      this.fraudRings.push({
        ring_id: ringId,
        member_accounts: Array.from(allMembers),
        pattern_type: 'cycle',
        cycles: cycles,
        risk_score: this.calculateCycleRiskScore(cycles)
      });
    }

    return cycles;
  }

  dfsForCycles(startNode, currentNode, path, visited, cycleSet, cycles, minLength, maxLength) {
    if (path.length > maxLength + 1) return;

    const neighbors = this.graphService.getOutgoingNeighbors(currentNode);

    for (const neighbor of neighbors) {
      if (neighbor === startNode && path.length >= minLength && path.length <= maxLength) {
        const cyclePath = [...path];
        const normalizedCycle = this.normalizeCycle(cyclePath);

        if (!cycleSet.has(normalizedCycle)) {
          cycleSet.add(normalizedCycle);
          cycles.push(cyclePath);
        }
        continue;
      }

      if (path.includes(neighbor)) continue;
      if (path.length >= maxLength) continue;

      if (this.graphService.isMerchant(neighbor)) continue;

      path.push(neighbor);
      this.dfsForCycles(startNode, neighbor, path, visited, cycleSet, cycles, minLength, maxLength);
      path.pop();
    }
  }

  calculateCycleRiskScore(cycles) {
    let baseScore = 70;

    if (cycles.some(c => c.length === 3)) baseScore += 15;
    if (cycles.length > 3) baseScore += 10;

    return Math.min(baseScore, 100);
  }

  detectSmurfing(minConnections = 10, windowHours = 72) {
    const fanInPatterns = [];
    const fanOutPatterns = [];
    const accounts = this.graphService.getAllAccounts();

    for (const accountId of accounts) {
      if (this.graphService.isMerchant(accountId) || this.graphService.isPayrollAccount(accountId)) {
        continue;
      }

      const fanIn = this.detectFanIn(accountId, minConnections, windowHours);
      if (fanIn) {
        fanInPatterns.push(fanIn);
      }

      const fanOut = this.detectFanOut(accountId, minConnections, windowHours);
      if (fanOut) {
        fanOutPatterns.push(fanOut);
      }
    }

    this.processSmurfingPatterns(fanInPatterns, 'fan_in');
    this.processSmurfingPatterns(fanOutPatterns, 'fan_out');

    return { fanIn: fanInPatterns, fanOut: fanOutPatterns };
  }

  detectFanIn(receiverId, minSenders = 10, windowHours = 72) {
    const neighbors = this.graphService.getNeighbors(receiverId);
    const incomingTxs = neighbors.incoming;

    if (incomingTxs.length < minSenders) return null;

    const analysis = this.timeWindow.slidingWindowAnalysis(
      incomingTxs.map(tx => ({ ...tx, timestamp: tx.timestamp })),
      windowHours
    );

    if (!analysis.maxWindow) return null;

    const windowTxs = analysis.maxWindow.transactions;
    const uniqueSenders = new Set(windowTxs.map(tx => tx.from));

    if (uniqueSenders.size >= minSenders) {
      return {
        aggregator: receiverId,
        senders: Array.from(uniqueSenders),
        transaction_count: windowTxs.length,
        unique_senders: uniqueSenders.size,
        time_window: {
          start: analysis.maxWindow.start,
          end: analysis.maxWindow.end
        },
        total_amount: windowTxs.reduce((sum, tx) => sum + tx.amount, 0)
      };
    }

    return null;
  }

  detectFanOut(senderId, minReceivers = 10, windowHours = 72) {
    const neighbors = this.graphService.getNeighbors(senderId);
    const outgoingTxs = neighbors.outgoing;

    if (outgoingTxs.length < minReceivers) return null;

    const analysis = this.timeWindow.slidingWindowAnalysis(
      outgoingTxs.map(tx => ({ ...tx, timestamp: tx.timestamp })),
      windowHours
    );

    if (!analysis.maxWindow) return null;

    const windowTxs = analysis.maxWindow.transactions;
    const uniqueReceivers = new Set(windowTxs.map(tx => tx.to));

    if (uniqueReceivers.size >= minReceivers) {
      return {
        distributor: senderId,
        receivers: Array.from(uniqueReceivers),
        transaction_count: windowTxs.length,
        unique_receivers: uniqueReceivers.size,
        time_window: {
          start: analysis.maxWindow.start,
          end: analysis.maxWindow.end
        },
        total_amount: windowTxs.reduce((sum, tx) => sum + tx.amount, 0)
      };
    }

    return null;
  }

  processSmurfingPatterns(patterns, type) {
    for (const pattern of patterns) {
      const ringId = this.generateRingId();
      const centralAccount = type === 'fan_in' ? pattern.aggregator : pattern.distributor;
      const connectedAccounts = type === 'fan_in' ? pattern.senders : pattern.receivers;

      const smurfingInfo = {
        type,
        pattern,
        ring_id: ringId
      };

      if (!this.detectedSmurfing.has(centralAccount)) {
        this.detectedSmurfing.set(centralAccount, []);
      }
      this.detectedSmurfing.get(centralAccount).push(smurfingInfo);

      for (const accountId of connectedAccounts) {
        if (!this.detectedSmurfing.has(accountId)) {
          this.detectedSmurfing.set(accountId, []);
        }
        this.detectedSmurfing.get(accountId).push({
          ...smurfingInfo,
          role: 'participant'
        });
      }

      this.fraudRings.push({
        ring_id: ringId,
        member_accounts: [centralAccount, ...connectedAccounts],
        pattern_type: 'smurfing',
        smurfing_type: type,
        risk_score: this.calculateSmurfingRiskScore(pattern, type)
      });
    }
  }

  calculateSmurfingRiskScore(pattern, type) {
    let baseScore = 60;

    const count = type === 'fan_in' ? pattern.unique_senders : pattern.unique_receivers;
    if (count >= 20) baseScore += 20;
    else if (count >= 15) baseScore += 15;
    else if (count >= 10) baseScore += 10;

    if (pattern.total_amount > 100000) baseScore += 10;

    return Math.min(baseScore, 100);
  }

  detectLayeredShells(minHops = 3, maxTransactions = 3) {
    const chains = [];
    const accounts = this.graphService.getAllAccounts();
    const visitedChains = new Set();

    for (const startNode of accounts) {
      if (this.graphService.isMerchant(startNode) || this.graphService.isPayrollAccount(startNode)) {
        continue;
      }

      const stats = this.graphService.getAccountStats(startNode);
      if (!stats) continue;

      if (stats.incomingCount > 0 && stats.incomingCount <= maxTransactions) {
        continue;
      }

      this.dfsForLayeredShells(
        startNode,
        [startNode],
        chains,
        visitedChains,
        minHops,
        maxTransactions
      );
    }

    this.processLayeredShellPatterns(chains);

    return chains;
  }

  dfsForLayeredShells(currentNode, path, chains, visitedChains, minHops, maxTransactions) {
    if (path.length > 10) return;

    const neighbors = this.graphService.getOutgoingNeighbors(currentNode);

    for (const neighbor of neighbors) {
      if (path.includes(neighbor)) continue;
      if (this.graphService.isMerchant(neighbor)) continue;

      const stats = this.graphService.getAccountStats(neighbor);
      if (!stats) continue;

      const totalTx = stats.outgoingCount + stats.incomingCount;
      const isShellNode = totalTx >= 2 && totalTx <= maxTransactions;

      if (isShellNode || path.length >= minHops - 1) {
        const newPath = [...path, neighbor];

        if (newPath.length >= minHops) {
          const chainKey = newPath.join('->');
          if (!visitedChains.has(chainKey)) {
            visitedChains.add(chainKey);

            const validChain = this.validateLayeredShellChain(newPath, maxTransactions);
            if (validChain) {
              chains.push({
                chain: newPath,
                length: newPath.length,
                shell_nodes: validChain.shellNodes,
                is_high_velocity: this.checkChainVelocity(newPath)
              });
            }
          }
        }

        if (isShellNode) {
          this.dfsForLayeredShells(neighbor, newPath, chains, visitedChains, minHops, maxTransactions);
        }
      }
    }
  }

  validateLayeredShellChain(chain, maxTransactions) {
    const shellNodes = [];

    for (let i = 1; i < chain.length - 1; i++) {
      const stats = this.graphService.getAccountStats(chain[i]);
      if (!stats) continue;

      const totalTx = stats.outgoingCount + stats.incomingCount;
      if (totalTx >= 2 && totalTx <= maxTransactions) {
        shellNodes.push(chain[i]);
      }
    }

    return shellNodes.length >= 1 ? { shellNodes } : null;
  }

  checkChainVelocity(chain) {
    const transactions = [];

    for (let i = 0; i < chain.length - 1; i++) {
      const edgeTxs = this.graphService.getEdgeTransactions(chain[i], chain[i + 1]);
      transactions.push(...edgeTxs);
    }

    return this.timeWindow.isHighVelocity(transactions, 24);
  }

  processLayeredShellPatterns(chains) {
    for (const chainInfo of chains) {
      const ringId = this.generateRingId();

      const layeredInfo = {
        chain: chainInfo.chain,
        ring_id: ringId,
        is_high_velocity: chainInfo.is_high_velocity
      };

      for (const accountId of chainInfo.chain) {
        if (!this.detectedLayeredShells.has(accountId)) {
          this.detectedLayeredShells.set(accountId, []);
        }
        this.detectedLayeredShells.get(accountId).push(layeredInfo);
      }

      this.fraudRings.push({
        ring_id: ringId,
        member_accounts: chainInfo.chain,
        pattern_type: 'layered_shell',
        chain_length: chainInfo.length,
        risk_score: this.calculateLayeredShellRiskScore(chainInfo)
      });
    }
  }

  calculateLayeredShellRiskScore(chainInfo) {
    let baseScore = 50;

    if (chainInfo.length >= 5) baseScore += 20;
    else if (chainInfo.length >= 4) baseScore += 15;
    else if (chainInfo.length >= 3) baseScore += 10;

    if (chainInfo.is_high_velocity) baseScore += 15;
    if (chainInfo.shell_nodes && chainInfo.shell_nodes.length >= 2) baseScore += 10;

    return Math.min(baseScore, 100);
  }

  runAllDetections() {
    this.reset();

    const cycles = this.detectCycles(3, 5);
    const smurfing = this.detectSmurfing(10, 72);
    const layeredShells = this.detectLayeredShells(3, 3);

    return {
      cycles: {
        count: cycles.length,
        patterns: cycles
      },
      smurfing: {
        fanIn: smurfing.fanIn.length,
        fanOut: smurfing.fanOut.length,
        patterns: smurfing
      },
      layeredShells: {
        count: layeredShells.length,
        patterns: layeredShells
      },
      fraudRings: this.fraudRings
    };
  }

  getAccountPatterns(accountId) {
    const patterns = [];

    const cyclePatterns = this.detectedCycles.get(accountId);
    if (cyclePatterns) {
      for (const cp of cyclePatterns) {
        patterns.push(`cycle_length_${cp.length}`);
      }
    }

    const smurfingPatterns = this.detectedSmurfing.get(accountId);
    if (smurfingPatterns) {
      for (const sp of smurfingPatterns) {
        if (sp.role === 'participant') {
          patterns.push('smurfing_participant');
        } else {
          patterns.push(sp.type === 'fan_in' ? 'smurfing_aggregator' : 'smurfing_distributor');
        }
      }
    }

    const layeredPatterns = this.detectedLayeredShells.get(accountId);
    if (layeredPatterns) {
      patterns.push('layered_shell');
      for (const lp of layeredPatterns) {
        if (lp.is_high_velocity) {
          patterns.push('high_velocity');
        }
      }
    }

    return [...new Set(patterns)];
  }

  getAccountRingId(accountId) {
    const cyclePatterns = this.detectedCycles.get(accountId);
    if (cyclePatterns && cyclePatterns.length > 0) {
      return cyclePatterns[0].ring_id;
    }

    const smurfingPatterns = this.detectedSmurfing.get(accountId);
    if (smurfingPatterns && smurfingPatterns.length > 0) {
      return smurfingPatterns[0].ring_id;
    }

    const layeredPatterns = this.detectedLayeredShells.get(accountId);
    if (layeredPatterns && layeredPatterns.length > 0) {
      return layeredPatterns[0].ring_id;
    }

    return null;
  }

  getSuspiciousAccounts() {
    const suspicious = new Set();

    for (const accountId of this.detectedCycles.keys()) {
      suspicious.add(accountId);
    }

    for (const accountId of this.detectedSmurfing.keys()) {
      suspicious.add(accountId);
    }

    for (const accountId of this.detectedLayeredShells.keys()) {
      suspicious.add(accountId);
    }

    return Array.from(suspicious);
  }

  getFraudRings() {
    return this.fraudRings;
  }
}

module.exports = DetectionService;
