import { useState, useCallback } from 'react';
import axios from 'axios';
import UploadSection from '../components/UploadSection';
import GraphView from '../components/GraphView';
import RingTable from '../components/RingTable';
import SummaryCard from '../components/SummaryCard';
import Header from '../components/Header';
import FeatureSection from '../components/FeatureSection';
import AccountSearch from '../components/AccountSearch';
import RingFilter from '../components/RingFilter';
import ProcessingProgress from '../components/ProcessingProgress';

const API_BASE = '/api';

function Dashboard() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStage, setCurrentStage] = useState('upload');
  const [fileSize, setFileSize] = useState(0);
  const [selectedRing, setSelectedRing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedNode, setHighlightedNode] = useState(null);

  const simulateProgress = useCallback(async (stages, delays) => {
    for (let i = 0; i < stages.length; i++) {
      setCurrentStage(stages[i]);
      if (delays[i] > 0) {
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  }, []);

  const handleUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setCurrentStage('upload');
    setFileSize(file.size);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const estimatedTime = Math.max(3000, file.size / 50);
    const stageDelay = estimatedTime / 6;

    try {
      const progressPromise = simulateProgress(
        ['upload', 'parse', 'graph', 'cycles', 'smurfing', 'shells', 'scoring'],
        [500, stageDelay, stageDelay, stageDelay * 1.5, stageDelay, stageDelay * 0.8, stageDelay * 0.5]
      );

      const [response] = await Promise.all([
        axios.post(`${API_BASE}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
        progressPromise
      ]);

      setCurrentStage('complete');

      if (response.data.success) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setResult(response.data);
      } else {
        setError(response.data.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to process the file'
      );
    } finally {
      setLoading(false);
    }
  }, [simulateProgress]);

  const handleDownload = useCallback(async () => {
    if (!result?.session_id) return;

    try {
      const response = await axios.get(
        `${API_BASE}/download/${result.session_id}`,
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `graphshield-result-${result.session_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download results');
    }
  }, [result?.session_id]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setSelectedRing(null);
    setSearchTerm('');
    setHighlightedNode(null);
  }, []);

  const handleNodeClick = useCallback((nodeId) => {
    setHighlightedNode(nodeId);
    setSearchTerm(nodeId);
  }, []);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (term && result?.suspicious_accounts) {
      const found = result.suspicious_accounts.find(
        (acc) => acc.account_id.toLowerCase().includes(term.toLowerCase())
      );
      if (found) {
        setHighlightedNode(found.account_id);
      } else {
        setHighlightedNode(null);
      }
    } else {
      setHighlightedNode(null);
    }
  }, [result?.suspicious_accounts]);

  const filteredAccounts = result?.suspicious_accounts?.filter((acc) => {
    const matchesRing = !selectedRing || acc.ring_id === selectedRing;
    const matchesSearch =
      !searchTerm ||
      acc.account_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRing && matchesSearch;
  });

  const filteredRings = result?.fraud_rings?.filter((ring) => {
    return !selectedRing || ring.ring_id === selectedRing;
  });

  return (
    <div className="min-h-screen">
      <Header onReset={result ? handleReset : null} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {!result && !loading && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient">GraphShield</span>
              </h1>
              <p className="text-xl text-dark-300 max-w-2xl mx-auto">
                Advanced Money Muling Detection Engine powered by Graph Analysis
              </p>
            </div>

            <UploadSection onUpload={handleUpload} disabled={loading} />

            {error && (
              <div className="mt-6 p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-400">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Error</span>
                </div>
                <p className="mt-2 text-sm">{error}</p>
              </div>
            )}

            <FeatureSection />
          </>
        )}

        {loading && (
          <div className="py-8">
            <ProcessingProgress
              isProcessing={loading}
              currentStage={currentStage}
              fileSize={fileSize}
            />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Detection Results
                </h2>
                <p className="text-dark-400 text-sm mt-1">
                  Session: {result.session_id?.slice(0, 8)}...
                </p>
              </div>
              <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download JSON Report
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Accounts Analyzed"
                value={result.summary?.total_accounts_analyzed || 0}
                icon="users"
                color="primary"
              />
              <SummaryCard
                title="Suspicious Accounts"
                value={result.summary?.suspicious_accounts_flagged || 0}
                icon="alert"
                color="danger"
              />
              <SummaryCard
                title="Fraud Rings"
                value={result.summary?.fraud_rings_detected || 0}
                icon="ring"
                color="warning"
              />
              <SummaryCard
                title="Processing Time"
                value={`${result.summary?.processing_time_seconds?.toFixed(2) || 0}s`}
                icon="clock"
                color="success"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <AccountSearch
                  value={searchTerm}
                  onChange={handleSearch}
                  accounts={result.suspicious_accounts}
                />
              </div>
              <div className="md:w-64">
                <RingFilter
                  rings={result.fraud_rings}
                  selectedRing={selectedRing}
                  onSelect={setSelectedRing}
                />
              </div>
            </div>

            <div className="glass-card p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Transaction Graph
                </span>
                {result.graph_data?.isFiltered && (
                  <span className="text-xs bg-warning-500/20 text-warning-400 px-2 py-1 rounded-full">
                    Showing relevant nodes ({result.graph_data.nodes?.length} of {result.graph_data.totalNodes})
                  </span>
                )}
              </h3>
              <div className="h-[500px] rounded-xl overflow-hidden border border-dark-700 bg-dark-900">
                <GraphView
                  graphData={result.graph_data}
                  suspiciousAccounts={result.suspicious_accounts}
                  fraudRings={result.fraud_rings}
                  selectedRing={selectedRing}
                  highlightedNode={highlightedNode}
                  onNodeClick={handleNodeClick}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-danger-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Suspicious Accounts ({filteredAccounts?.length || 0})
                </h3>
                <div className="table-container max-h-[400px] overflow-auto scrollbar-thin">
                  <table className="data-table">
                    <thead className="sticky top-0">
                      <tr>
                        <th>Account ID</th>
                        <th>Score</th>
                        <th>Patterns</th>
                        <th>Ring</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts?.map((account) => (
                        <tr
                          key={account.account_id}
                          className={`cursor-pointer ${
                            highlightedNode === account.account_id
                              ? 'bg-primary-500/20'
                              : ''
                          }`}
                          onClick={() => handleNodeClick(account.account_id)}
                        >
                          <td className="font-mono text-xs">
                            {account.account_id}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                account.suspicion_score >= 80
                                  ? 'badge-danger'
                                  : account.suspicion_score >= 60
                                  ? 'badge-warning'
                                  : 'badge-primary'
                              }`}
                            >
                              {account.suspicion_score}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {account.detected_patterns?.slice(0, 2).map((p) => (
                                <span
                                  key={p}
                                  className="text-xs text-dark-400 bg-dark-700 px-1.5 py-0.5 rounded"
                                >
                                  {p}
                                </span>
                              ))}
                              {account.detected_patterns?.length > 2 && (
                                <span className="text-xs text-dark-500">
                                  +{account.detected_patterns.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {account.ring_id && (
                              <span className="badge badge-warning">
                                {account.ring_id}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!filteredAccounts || filteredAccounts.length === 0) && (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center text-dark-500 py-8"
                          >
                            No suspicious accounts found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <RingTable
                rings={filteredRings}
                onRingClick={(ringId) => setSelectedRing(ringId)}
                selectedRing={selectedRing}
              />
            </div>

            {result.detection_details && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Detection Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-primary-400">
                      {result.detection_details.cycles_detected}
                    </div>
                    <div className="text-sm text-dark-400">Cycles Detected</div>
                  </div>
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-warning-400">
                      {result.detection_details.fan_in_patterns}
                    </div>
                    <div className="text-sm text-dark-400">Fan-In Patterns</div>
                  </div>
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-danger-400">
                      {result.detection_details.fan_out_patterns}
                    </div>
                    <div className="text-sm text-dark-400">Fan-Out Patterns</div>
                  </div>
                  <div className="text-center p-4 bg-dark-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-success-400">
                      {result.detection_details.layered_shell_chains}
                    </div>
                    <div className="text-sm text-dark-400">Shell Chains</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-dark-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-dark-500 text-sm">
          <p>GraphShield - Money Muling Detection Engine</p>
          <p className="mt-1">Built for RIFT 2026 Challenge</p>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
