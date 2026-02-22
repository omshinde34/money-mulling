import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import cytoscape from 'cytoscape';
import {
  transformGraphData,
  cytoscapeStyles,
  generateRingColor,
  formatCurrency,
} from '../utils/graphUtils';

const MAX_INSTANT_RENDER = 500;
const MAX_NODES_DISPLAY = 200;

function GraphView({
  graphData,
  suspiciousAccounts,
  fraudRings,
  selectedRing,
  highlightedNode,
  onNodeClick,
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [nodeLimit, setNodeLimit] = useState(100);
  const [nodeCount, setNodeCount] = useState({ total: 0, displayed: 0 });

  const totalNodes = graphData?.nodes?.length || 0;
  const isLargeDataset = totalNodes > MAX_INSTANT_RENDER;

  const filteredGraphData = useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], edges: [] };
    if (!showGraph && isLargeDataset) return { nodes: [], edges: [] };

    const suspiciousIds = new Set(suspiciousAccounts?.map(a => a.account_id) || []);
    const ringMembers = new Set();
    fraudRings?.forEach(ring => {
      ring.member_accounts?.forEach(id => ringMembers.add(id));
    });

    const sortedSuspicious = [...(suspiciousAccounts || [])]
      .sort((a, b) => b.suspicion_score - a.suspicion_score)
      .slice(0, nodeLimit)
      .map(a => a.account_id);

    const nodesToShow = new Set(sortedSuspicious);

    fraudRings?.slice(0, 5).forEach(ring => {
      ring.member_accounts?.slice(0, 10).forEach(id => nodesToShow.add(id));
    });

    if (nodesToShow.size < nodeLimit) {
      graphData.edges.forEach(edge => {
        if (nodesToShow.size >= nodeLimit) return;
        const source = edge.source || edge.data?.source;
        const target = edge.target || edge.data?.target;
        if (nodesToShow.has(source) && !nodesToShow.has(target)) {
          nodesToShow.add(target);
        }
      });
    }

    const filteredNodes = graphData.nodes.filter(node => {
      const id = node.id || node.data?.id;
      return nodesToShow.has(id);
    });

    const nodeIdSet = new Set(filteredNodes.map(n => n.id || n.data?.id));
    const filteredEdges = graphData.edges.filter(edge => {
      const source = edge.source || edge.data?.source;
      const target = edge.target || edge.data?.target;
      return nodeIdSet.has(source) && nodeIdSet.has(target);
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, suspiciousAccounts, fraudRings, showGraph, nodeLimit, isLargeDataset]);

  useEffect(() => {
    if (!isLargeDataset) {
      setShowGraph(true);
    }
  }, [isLargeDataset]);

  useEffect(() => {
    if (!containerRef.current || !showGraph) return;
    if (filteredGraphData.nodes.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNodeCount({
      total: totalNodes,
      displayed: filteredGraphData.nodes?.length || 0
    });

    const timeoutId = setTimeout(() => {
      const { nodes, edges } = transformGraphData(filteredGraphData, suspiciousAccounts);

      if (nodes.length === 0) {
        setIsLoading(false);
        return;
      }

      const ringColorMap = new Map();
      const nodeToRingMap = new Map();
      
      fraudRings?.forEach((ring) => {
        const color = generateRingColor(ring.ring_id);
        ringColorMap.set(ring.ring_id, color);
        ring.member_accounts?.forEach(accountId => {
          nodeToRingMap.set(accountId, { ringId: ring.ring_id, color });
        });
      });

      const edgeMap = new Map();
      edges.forEach(edge => {
        const src = edge.data.source;
        const tgt = edge.data.target;
        if (!edgeMap.has(src)) edgeMap.set(src, []);
        if (!edgeMap.has(tgt)) edgeMap.set(tgt, []);
        edgeMap.get(src).push(tgt);
        edgeMap.get(tgt).push(src);
      });

      nodes.forEach(node => {
        const nodeId = node.data.id;
        if (!nodeToRingMap.has(nodeId)) {
          const neighbors = edgeMap.get(nodeId) || [];
          for (const neighbor of neighbors) {
            if (nodeToRingMap.has(neighbor)) {
              nodeToRingMap.set(nodeId, nodeToRingMap.get(neighbor));
              break;
            }
          }
        }
      });

      const styledNodes = nodes.map((node) => {
        const nodeId = node.data.id;
        const ringInfo = nodeToRingMap.get(nodeId);
        const ringColor = ringInfo?.color || (node.data.ringId ? ringColorMap.get(node.data.ringId) : null);
        return {
          ...node,
          data: { ...node.data, ringColor },
        };
      });

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const layoutConfig = {
        name: 'cose',
        animate: false,
        padding: 30,
        nodeRepulsion: 8000,
        nodeOverlap: 20,
        idealEdgeLength: 50,
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 0.25,
        numIter: 500,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
        componentSpacing: 100,
        nodeDimensionsIncludeLabels: true,
        randomize: true,
        fit: true,
      };

      const cy = cytoscape({
        container: containerRef.current,
        elements: [...styledNodes, ...edges],
        style: [
          ...cytoscapeStyles,
          {
            selector: 'node[ringColor]',
            style: {
              'background-color': 'data(ringColor)',
              'border-color': 'data(ringColor)',
            },
          },
        ],
        layout: layoutConfig,
        minZoom: 0.1,
        maxZoom: 3,
        wheelSensitivity: 0.3,
        textureOnViewport: true,
        hideEdgesOnViewport: true,
        motionBlur: false,
      });

      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        onNodeClick?.(node.id());
      });

      cy.on('mouseover', 'node', (evt) => {
        const node = evt.target;
        const data = node.data();
        const position = evt.renderedPosition;
        setTooltip({
          x: position.x,
          y: position.y,
          data: {
            id: data.id,
            score: data.score,
            patterns: data.patterns,
            ringId: data.ringId,
            outgoing: data.outgoingCount,
            incoming: data.incomingCount,
            totalSent: data.totalSent,
            totalReceived: data.totalReceived,
          },
        });
      });

      cy.on('mouseout', 'node', () => setTooltip(null));

      cyRef.current = cy;
      setIsLoading(false);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [filteredGraphData, suspiciousAccounts, fraudRings, onNodeClick, showGraph, totalNodes]);

  useEffect(() => {
    if (!cyRef.current || !selectedRing) return;
    const cy = cyRef.current;
    cy.nodes().removeClass('highlighted dimmed');
    cy.edges().removeClass('highlighted dimmed');

    const ringMembers = fraudRings?.find(r => r.ring_id === selectedRing)?.member_accounts;
    if (ringMembers) {
      const memberSet = new Set(ringMembers);
      cy.nodes().forEach(node => {
        node.addClass(memberSet.has(node.id()) ? 'highlighted' : 'dimmed');
      });
      cy.edges().forEach(edge => {
        const inRing = memberSet.has(edge.source().id()) && memberSet.has(edge.target().id());
        edge.addClass(inRing ? 'highlighted' : 'dimmed');
      });
    }
  }, [selectedRing, fraudRings]);

  useEffect(() => {
    if (!cyRef.current || !highlightedNode) return;
    const cy = cyRef.current;
    const node = cy.getElementById(highlightedNode);
    if (node.length > 0) {
      cy.nodes().removeClass('highlighted');
      node.addClass('highlighted');
      cy.center(node);
    }
  }, [highlightedNode]);

  const handleZoomIn = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2), []);
  const handleZoomOut = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8), []);
  const handleFit = useCallback(() => cyRef.current?.fit(undefined, 50), []);
  const handleReset = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.nodes().removeClass('highlighted dimmed');
      cyRef.current.edges().removeClass('highlighted dimmed');
      cyRef.current.fit(undefined, 50);
    }
  }, []);

  const handleLoadGraph = useCallback(() => setShowGraph(true), []);
  const handleLoadMore = useCallback(() => setNodeLimit(prev => Math.min(prev + 100, MAX_NODES_DISPLAY)), []);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-dark-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p>No graph data available</p>
        </div>
      </div>
    );
  }

  if (isLargeDataset && !showGraph) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Large Dataset Detected</h3>
          <p className="text-dark-400 mb-6 max-w-md">
            Your dataset has <span className="text-primary-400 font-semibold">{totalNodes.toLocaleString()}</span> accounts. 
            The graph will show the top suspicious nodes for better performance.
          </p>
          <button onClick={handleLoadGraph} className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/25">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Load Graph Visualization
            </span>
          </button>
          <p className="text-dark-500 text-sm mt-4">Will display top {nodeLimit} suspicious accounts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900/80 z-10">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-dark-400">Rendering {nodeCount.displayed} nodes...</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button onClick={handleZoomIn} className="p-2 bg-dark-800/90 hover:bg-dark-700 rounded-lg border border-dark-600 transition-colors" title="Zoom In">
          <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button onClick={handleZoomOut} className="p-2 bg-dark-800/90 hover:bg-dark-700 rounded-lg border border-dark-600 transition-colors" title="Zoom Out">
          <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button onClick={handleFit} className="p-2 bg-dark-800/90 hover:bg-dark-700 rounded-lg border border-dark-600 transition-colors" title="Fit">
          <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button onClick={handleReset} className="p-2 bg-dark-800/90 hover:bg-dark-700 rounded-lg border border-dark-600 transition-colors" title="Reset">
          <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-dark-800/90 rounded-lg p-3 border border-dark-600 text-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
            <span className="text-dark-400">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-danger-500"></div>
            <span className="text-dark-400">Suspicious</span>
          </div>
        </div>

        <div className="border-t border-dark-600 pt-2 text-dark-400">
          Showing {nodeCount.displayed} of {nodeCount.total.toLocaleString()} nodes
        </div>

        {nodeCount.displayed < MAX_NODES_DISPLAY && nodeCount.displayed < nodeCount.total && (
          <button onClick={handleLoadMore} className="w-full px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded text-xs transition-colors">
            Load more nodes
          </button>
        )}
      </div>

      {tooltip && (
        <div
          className="absolute z-20 bg-dark-800/95 border border-dark-600 rounded-lg p-3 shadow-xl pointer-events-none min-w-[200px]"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15,
            transform: 'translateY(-50%)',
          }}
        >
          <p className="font-mono text-sm font-medium text-white mb-2">
            {tooltip.data.id}
          </p>
          {tooltip.data.score > 0 && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-dark-400 text-xs">Suspicion Score:</span>
              <span
                className={`text-sm font-medium ${
                  tooltip.data.score >= 80
                    ? 'text-danger-400'
                    : tooltip.data.score >= 60
                    ? 'text-warning-400'
                    : 'text-primary-400'
                }`}
              >
                {tooltip.data.score}
              </span>
            </div>
          )}
          {tooltip.data.ringId && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-dark-400 text-xs">Ring:</span>
              <span className="text-warning-400 text-xs">{tooltip.data.ringId}</span>
            </div>
          )}
          <div className="border-t border-dark-600 mt-2 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-dark-500">Out:</span>{' '}
                <span className="text-dark-300">{tooltip.data.outgoing}</span>
              </div>
              <div>
                <span className="text-dark-500">In:</span>{' '}
                <span className="text-dark-300">{tooltip.data.incoming}</span>
              </div>
              <div>
                <span className="text-dark-500">Sent:</span>{' '}
                <span className="text-dark-300">
                  {formatCurrency(tooltip.data.totalSent)}
                </span>
              </div>
              <div>
                <span className="text-dark-500">Recv:</span>{' '}
                <span className="text-dark-300">
                  {formatCurrency(tooltip.data.totalReceived)}
                </span>
              </div>
            </div>
          </div>
          {tooltip.data.patterns && tooltip.data.patterns.length > 0 && (
            <div className="border-t border-dark-600 mt-2 pt-2">
              <p className="text-dark-500 text-xs mb-1">Patterns:</p>
              <div className="flex flex-wrap gap-1">
                {tooltip.data.patterns.map((p) => (
                  <span
                    key={p}
                    className="text-xs bg-dark-700 text-dark-300 px-1.5 py-0.5 rounded"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GraphView;
