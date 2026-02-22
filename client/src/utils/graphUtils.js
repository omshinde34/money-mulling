export const generateRingColor = (ringId) => {
  if (!ringId) return '#6b7280';

  const colors = [
    '#22c55e', // green
    '#3b82f6', // blue
    '#f97316', // orange
    '#eab308', // yellow
    '#a855f7', // purple
    '#ef4444', // red
    '#ec4899', // pink
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#6366f1', // indigo
    '#d946ef', // fuchsia
  ];

  const ringNumber = parseInt(ringId.replace('RING_', ''), 10) || 0;
  return colors[ringNumber % colors.length];
};

export const getScoreColor = (score) => {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#22c55e';
  return '#6b7280';
};

export const getScoreBadgeClass = (score) => {
  if (score >= 80) return 'badge-danger';
  if (score >= 60) return 'badge-warning';
  return 'badge-primary';
};

export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat().format(num);
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0%';
  return `${(value * 100).toFixed(1)}%`;
};

export const getPatternDisplayName = (pattern) => {
  const patternNames = {
    cycle_length_3: 'Cycle (Length 3)',
    cycle_length_4: 'Cycle (Length 4)',
    cycle_length_5: 'Cycle (Length 5)',
    smurfing_aggregator: 'Smurfing Aggregator',
    smurfing_distributor: 'Smurfing Distributor',
    smurfing_participant: 'Smurfing Participant',
    layered_shell: 'Layered Shell Chain',
    high_velocity: 'High Velocity',
  };
  return patternNames[pattern] || pattern;
};

export const getPatternIcon = (pattern) => {
  if (pattern.startsWith('cycle')) return '🔄';
  if (pattern.startsWith('smurfing')) return '🕸️';
  if (pattern === 'layered_shell') return '📊';
  if (pattern === 'high_velocity') return '⚡';
  return '⚠️';
};

export const getRiskLevel = (score) => {
  if (score >= 80) return { level: 'Critical', color: 'danger' };
  if (score >= 60) return { level: 'High', color: 'warning' };
  if (score >= 40) return { level: 'Medium', color: 'warning' };
  if (score >= 20) return { level: 'Low', color: 'success' };
  return { level: 'Minimal', color: 'success' };
};

export const transformGraphData = (graphData, suspiciousAccounts) => {
  if (!graphData) return { nodes: [], edges: [] };

  const suspiciousMap = new Map(
    suspiciousAccounts?.map(acc => [acc.account_id, acc]) || []
  );

  const nodes = graphData.nodes.map(node => {
    const suspicious = suspiciousMap.get(node.id);
    return {
      data: {
        id: node.id,
        label: node.id,
        suspicious: !!suspicious,
        score: suspicious?.suspicion_score || 0,
        patterns: suspicious?.detected_patterns || [],
        ringId: suspicious?.ring_id || node.ring_id || null,
        outgoingCount: node.outgoingCount || 0,
        incomingCount: node.incomingCount || 0,
        totalSent: node.totalSent || 0,
        totalReceived: node.totalReceived || 0,
      },
    };
  });

  const edges = graphData.edges.map((edge, index) => ({
    data: {
      id: `e${index}`,
      source: edge.source,
      target: edge.target,
      amount: edge.amount || 0,
      count: edge.transactionCount || 1,
    },
  }));

  return { nodes, edges };
};

export const cytoscapeStyles = [
  {
    selector: 'node',
    style: {
      'background-color': '#6b7280',
      'label': 'data(label)',
      'color': '#9ca3af',
      'font-size': '8px',
      'text-valign': 'bottom',
      'text-margin-y': 5,
      'width': 35,
      'height': 35,
      'border-width': 0,
      'transition-property': 'background-color, width, height',
      'transition-duration': '0.15s',
    },
  },
  {
    selector: 'node[?suspicious]',
    style: {
      'background-color': '#ef4444',
      'width': 38,
      'height': 38,
    },
  },
  {
    selector: 'node[ringColor]',
    style: {
      'background-color': 'data(ringColor)',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'width': 42,
      'height': 42,
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'width': 45,
      'height': 45,
      'z-index': 9999,
    },
  },
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.15,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': '#374151',
      'target-arrow-color': '#374151',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.6,
      'opacity': 0.6,
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#60a5fa',
      'target-arrow-color': '#60a5fa',
      'width': 2,
      'opacity': 1,
      'z-index': 9999,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.05,
    },
  },
];

export const cytoscapeLayout = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  animationEasing: 'ease-out',
  nodeDimensionsIncludeLabels: true,
  nodeRepulsion: 8000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  nestingFactor: 1.2,
  gravity: 80,
  numIter: 1000,
  coolingFactor: 0.95,
  minTemp: 1.0,
  randomize: true,
  componentSpacing: 100,
  padding: 50,
};

export const calculateGraphStats = (graphData) => {
  if (!graphData || !graphData.nodes) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      avgDegree: 0,
      maxDegree: 0,
      density: 0,
    };
  }

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges?.length || 0;

  if (nodeCount === 0) {
    return { nodeCount: 0, edgeCount: 0, avgDegree: 0, maxDegree: 0, density: 0 };
  }

  const degrees = new Map();
  graphData.nodes.forEach(node => {
    const id = node.data?.id || node.id;
    degrees.set(id, 0);
  });

  graphData.edges?.forEach(edge => {
    const source = edge.data?.source || edge.source;
    const target = edge.data?.target || edge.target;
    degrees.set(source, (degrees.get(source) || 0) + 1);
    degrees.set(target, (degrees.get(target) || 0) + 1);
  });

  const degreeValues = Array.from(degrees.values());
  const avgDegree = degreeValues.reduce((a, b) => a + b, 0) / nodeCount;
  const maxDegree = Math.max(...degreeValues, 0);
  const maxPossibleEdges = nodeCount * (nodeCount - 1);
  const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

  return {
    nodeCount,
    edgeCount,
    avgDegree: Math.round(avgDegree * 100) / 100,
    maxDegree,
    density: Math.round(density * 10000) / 10000,
  };
};
