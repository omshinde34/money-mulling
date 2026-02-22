import { generateRingColor, getPatternDisplayName } from '../utils/graphUtils';

function RingTable({ rings, onRingClick, selectedRing }) {
  if (!rings || rings.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-warning-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Fraud Rings (0)
        </h3>
        <div className="text-center py-8 text-dark-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-dark-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>No fraud rings detected</p>
        </div>
      </div>
    );
  }

  const getPatternIcon = (patternType) => {
    switch (patternType) {
      case 'cycle':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
      case 'smurfing':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        );
      case 'layered_shell':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4"
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
        );
    }
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-warning-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        Fraud Rings ({rings.length})
      </h3>

      <div className="space-y-3 max-h-[400px] overflow-auto scrollbar-thin">
        {rings.map((ring) => {
          const ringColor = generateRingColor(ring.ring_id);
          const isSelected = selectedRing === ring.ring_id;

          return (
            <div
              key={ring.ring_id}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary-500/10 border-primary-500/50'
                  : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
              }`}
              onClick={() => onRingClick(isSelected ? null : ring.ring_id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ringColor }}
                  />
                  <span className="font-medium text-white">{ring.ring_id}</span>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    ring.risk_score >= 80
                      ? 'bg-danger-500/20 text-danger-400'
                      : ring.risk_score >= 60
                      ? 'bg-warning-500/20 text-warning-400'
                      : 'bg-primary-500/20 text-primary-400'
                  }`}
                >
                  Risk: {ring.risk_score}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm text-dark-400">
                {getPatternIcon(ring.pattern_type)}
                <span className="capitalize">
                  {ring.pattern_type.replace('_', ' ')}
                </span>
              </div>

              <div className="text-xs text-dark-500 mb-2">
                {ring.member_accounts.length} members
              </div>

              <div className="flex flex-wrap gap-1">
                {ring.member_accounts.slice(0, 4).map((acc) => (
                  <span
                    key={acc}
                    className="text-xs font-mono bg-dark-700/50 text-dark-300 px-2 py-0.5 rounded"
                  >
                    {acc}
                  </span>
                ))}
                {ring.member_accounts.length > 4 && (
                  <span className="text-xs text-dark-500">
                    +{ring.member_accounts.length - 4} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RingTable;
