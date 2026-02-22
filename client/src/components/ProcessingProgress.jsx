import { useState, useEffect } from 'react';

const STAGES = [
  { id: 'upload', label: 'Uploading file', icon: '📤', weight: 10 },
  { id: 'parse', label: 'Parsing CSV data', icon: '📄', weight: 15 },
  { id: 'graph', label: 'Building transaction graph', icon: '🔗', weight: 20 },
  { id: 'cycles', label: 'Detecting cycles (DFS)', icon: '🔄', weight: 20 },
  { id: 'smurfing', label: 'Analyzing smurfing patterns', icon: '🕸️', weight: 15 },
  { id: 'shells', label: 'Finding layered shells', icon: '📊', weight: 10 },
  { id: 'scoring', label: 'Calculating risk scores', icon: '🎯', weight: 5 },
  { id: 'complete', label: 'Analysis complete!', icon: '✅', weight: 5 },
];

function ProcessingProgress({ isProcessing, currentStage, fileSize }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  const currentStageIndex = STAGES.findIndex(s => s.id === currentStage);
  const targetProgress = STAGES.slice(0, currentStageIndex + 1)
    .reduce((sum, s) => sum + s.weight, 0);

  useEffect(() => {
    if (!isProcessing) {
      setAnimatedProgress(0);
      setElapsedTime(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setAnimatedProgress(prev => {
        const diff = targetProgress - prev;
        if (diff <= 0) return targetProgress;
        return prev + Math.min(diff * 0.1, 2);
      });
    }, 50);

    const timeInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, [isProcessing, targetProgress, startTime]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const estimatedTime = fileSize ? Math.max(5, Math.ceil(fileSize / 100000)) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-dark-700 flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              />
              <span className="text-3xl">
                {STAGES[currentStageIndex]?.icon || '⏳'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            {STAGES[currentStageIndex]?.label || 'Processing...'}
          </h3>
          <p className="text-dark-400 text-sm">
            {fileSize && `Processing ${formatFileSize(fileSize)} of transaction data`}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-dark-400 mb-2">
            <span>{Math.round(animatedProgress)}% complete</span>
            <span>
              {elapsedTime > 0 && `${formatTime(elapsedTime)}`}
              {estimatedTime && elapsedTime > 0 && ` / ~${formatTime(estimatedTime)}`}
            </span>
          </div>
          <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-primary-500 bg-[length:200%_100%] animate-gradient rounded-full transition-all duration-300"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {STAGES.map((stage, index) => {
            const isComplete = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isPending = index > currentStageIndex;

            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                  isCurrent
                    ? 'bg-primary-500/10 border border-primary-500/30'
                    : isComplete
                    ? 'opacity-60'
                    : 'opacity-30'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isComplete
                      ? 'bg-success-500 text-white'
                      : isCurrent
                      ? 'bg-primary-500 text-white animate-pulse'
                      : 'bg-dark-600 text-dark-400'
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isCurrent ? 'text-white font-medium' : 'text-dark-400'
                  }`}
                >
                  {stage.label}
                </span>
                {isCurrent && (
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-dark-800/50 rounded-xl">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-dark-400">
              <p className="mb-1">
                <strong className="text-dark-300">Cycle Detection:</strong> Finding circular money flows (A→B→C→A)
              </p>
              <p className="mb-1">
                <strong className="text-dark-300">Smurfing Analysis:</strong> Detecting fan-in/fan-out patterns
              </p>
              <p>
                <strong className="text-dark-300">Shell Detection:</strong> Tracing layered intermediary chains
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcessingProgress;
