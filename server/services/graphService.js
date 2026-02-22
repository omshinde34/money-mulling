class GraphService {
  constructor() {
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    this.accountData = new Map();
    this.edgeData = new Map();
  }

  clear() {
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.accountData.clear();
    this.edgeData.clear();
  }

  buildGraph(transactions) {
    this.clear();

    for (const tx of transactions) {
      const { sender_id, receiver_id, amount, timestamp, transaction_id } = tx;

      if (!this.adjacencyList.has(sender_id)) {
        this.adjacencyList.set(sender_id, { outgoing: [], incoming: [] });
        this.accountData.set(sender_id, {
          outgoingCount: 0,
          incomingCount: 0,
          totalSent: 0,
          totalReceived: 0,
          transactions: []
        });
      }

      if (!this.adjacencyList.has(receiver_id)) {
        this.adjacencyList.set(receiver_id, { outgoing: [], incoming: [] });
        this.accountData.set(receiver_id, {
          outgoingCount: 0,
          incomingCount: 0,
          totalSent: 0,
          totalReceived: 0,
          transactions: []
        });
      }

      if (!this.reverseAdjacencyList.has(receiver_id)) {
        this.reverseAdjacencyList.set(receiver_id, []);
      }

      this.adjacencyList.get(sender_id).outgoing.push({
        to: receiver_id,
        amount,
        timestamp: new Date(timestamp),
        transaction_id
      });

      this.adjacencyList.get(receiver_id).incoming.push({
        from: sender_id,
        amount,
        timestamp: new Date(timestamp),
        transaction_id
      });

      this.reverseAdjacencyList.get(receiver_id).push(sender_id);

      const senderData = this.accountData.get(sender_id);
      senderData.outgoingCount++;
      senderData.totalSent += amount;
      senderData.transactions.push(tx);

      const receiverData = this.accountData.get(receiver_id);
      receiverData.incomingCount++;
      receiverData.totalReceived += amount;
      receiverData.transactions.push(tx);

      const edgeKey = `${sender_id}->${receiver_id}`;
      if (!this.edgeData.has(edgeKey)) {
        this.edgeData.set(edgeKey, []);
      }
      this.edgeData.get(edgeKey).push({ amount, timestamp, transaction_id });
    }

    return {
      nodeCount: this.adjacencyList.size,
      edgeCount: this.edgeData.size,
      totalTransactions: transactions.length
    };
  }

  getNeighbors(accountId) {
    const node = this.adjacencyList.get(accountId);
    if (!node) return { outgoing: [], incoming: [] };
    return node;
  }

  getOutgoingNeighbors(accountId) {
    const node = this.adjacencyList.get(accountId);
    if (!node) return [];
    return [...new Set(node.outgoing.map(e => e.to))];
  }

  getIncomingNeighbors(accountId) {
    const node = this.adjacencyList.get(accountId);
    if (!node) return [];
    return [...new Set(node.incoming.map(e => e.from))];
  }

  getAllAccounts() {
    return Array.from(this.adjacencyList.keys());
  }

  getAccountStats(accountId) {
    return this.accountData.get(accountId) || null;
  }

  getTotalTransactionCount(accountId) {
    const data = this.accountData.get(accountId);
    if (!data) return 0;
    return data.outgoingCount + data.incomingCount;
  }

  isMerchant(accountId, threshold = 1000) {
    const data = this.accountData.get(accountId);
    if (!data) return false;

    const totalTx = data.outgoingCount + data.incomingCount;
    if (totalTx < threshold) return false;

    if (data.incomingCount === 0) return false;
    const ratio = data.outgoingCount / data.incomingCount;
    return ratio < 0.1 || ratio > 10;
  }

  isPayrollAccount(accountId) {
    const data = this.accountData.get(accountId);
    if (!data) return false;

    if (data.outgoingCount < 20) return false;
    if (data.incomingCount > data.outgoingCount * 0.1) return false;

    const outgoingAmounts = this.adjacencyList.get(accountId).outgoing.map(e => e.amount);
    if (outgoingAmounts.length < 5) return false;

    const mean = outgoingAmounts.reduce((a, b) => a + b, 0) / outgoingAmounts.length;
    const variance = outgoingAmounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / outgoingAmounts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    return coefficientOfVariation < 0.3;
  }

  getEdgeTransactions(senderId, receiverId) {
    const edgeKey = `${senderId}->${receiverId}`;
    return this.edgeData.get(edgeKey) || [];
  }

  getGraphForVisualization() {
    const nodes = [];
    const edges = [];

    for (const [accountId, data] of this.accountData) {
      nodes.push({
        id: accountId,
        outgoingCount: data.outgoingCount,
        incomingCount: data.incomingCount,
        totalSent: data.totalSent,
        totalReceived: data.totalReceived
      });
    }

    for (const [edgeKey, txList] of this.edgeData) {
      const [source, target] = edgeKey.split('->');
      const totalAmount = txList.reduce((sum, tx) => sum + tx.amount, 0);
      const latestTimestamp = txList.reduce((latest, tx) => 
        new Date(tx.timestamp) > new Date(latest) ? tx.timestamp : latest, 
        txList[0].timestamp
      );

      edges.push({
        source,
        target,
        amount: totalAmount,
        transactionCount: txList.length,
        timestamp: latestTimestamp
      });
    }

    return { nodes, edges };
  }

  getSubgraph(accountIds) {
    const accountSet = new Set(accountIds);
    const nodes = [];
    const edges = [];

    for (const accountId of accountIds) {
      const data = this.accountData.get(accountId);
      if (data) {
        nodes.push({
          id: accountId,
          outgoingCount: data.outgoingCount,
          incomingCount: data.incomingCount,
          totalSent: data.totalSent,
          totalReceived: data.totalReceived
        });
      }
    }

    for (const [edgeKey, txList] of this.edgeData) {
      const [source, target] = edgeKey.split('->');
      if (accountSet.has(source) && accountSet.has(target)) {
        const totalAmount = txList.reduce((sum, tx) => sum + tx.amount, 0);
        edges.push({
          source,
          target,
          amount: totalAmount,
          transactionCount: txList.length
        });
      }
    }

    return { nodes, edges };
  }
}

module.exports = GraphService;
