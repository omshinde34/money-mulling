function FeatureSection() {
  const features = [
    {
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      title: 'Cycle Detection',
      description:
        'Detect circular transaction patterns (length 3-5) that indicate potential money laundering loops.',
      color: 'primary',
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      title: 'Smurfing Analysis',
      description:
        'Identify fan-in/fan-out patterns with 10+ connections within 72-hour windows.',
      color: 'warning',
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      title: 'Layered Shells',
      description:
        'Track funds through chains of intermediary shell accounts with limited transaction history.',
      color: 'danger',
    },
    {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      title: 'Risk Scoring',
      description:
        'Weighted scoring model (0-100) with false positive controls for merchants and payroll.',
      color: 'success',
    },
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'primary':
        return 'bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20';
      case 'warning':
        return 'bg-warning-500/10 text-warning-400 group-hover:bg-warning-500/20';
      case 'danger':
        return 'bg-danger-500/10 text-danger-400 group-hover:bg-danger-500/20';
      case 'success':
        return 'bg-success-500/10 text-success-400 group-hover:bg-success-500/20';
      default:
        return 'bg-dark-700 text-dark-300';
    }
  };

  return (
    <div className="mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-white mb-2">Detection Capabilities</h2>
        <p className="text-dark-400 max-w-xl mx-auto">
          Advanced graph-based algorithms to detect complex money muling patterns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="glass-card-hover p-6 group cursor-default"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${getColorClasses(
                feature.color
              )}`}
            >
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-dark-400 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 glass-card p-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-medium">
                  1
                </span>
                <div>
                  <p className="text-white font-medium">Upload CSV</p>
                  <p className="text-sm text-dark-400">
                    Upload your transaction data with sender, receiver, amount, and timestamp.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-medium">
                  2
                </span>
                <div>
                  <p className="text-white font-medium">Graph Analysis</p>
                  <p className="text-sm text-dark-400">
                    Build adjacency list and run DFS-based pattern detection.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-medium">
                  3
                </span>
                <div>
                  <p className="text-white font-medium">Risk Scoring</p>
                  <p className="text-sm text-dark-400">
                    Calculate weighted suspicion scores with false positive controls.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-medium">
                  4
                </span>
                <div>
                  <p className="text-white font-medium">Export Results</p>
                  <p className="text-sm text-dark-400">
                    Download structured JSON with suspicious accounts and fraud rings.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4">Scoring Model</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <span className="text-dark-300">Cycle Involvement</span>
                <span className="text-danger-400 font-medium">+40 points</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <span className="text-dark-300">Smurfing Aggregator</span>
                <span className="text-warning-400 font-medium">+30 points</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <span className="text-dark-300">Layered Shell</span>
                <span className="text-primary-400 font-medium">+20 points</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <span className="text-dark-300">High Velocity (&lt;24h)</span>
                <span className="text-success-400 font-medium">+10 points</span>
              </div>
              <div className="mt-4 p-3 bg-success-500/10 border border-success-500/30 rounded-lg">
                <p className="text-sm text-success-400">
                  <strong>False Positive Control:</strong> Merchant and payroll accounts
                  receive -30 point reduction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureSection;
