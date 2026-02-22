const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

class TimeWindow {
  constructor(windowHours = 72) {
    this.windowMs = windowHours * HOUR_MS;
  }

  isWithinWindow(timestamp1, timestamp2) {
    const t1 = new Date(timestamp1).getTime();
    const t2 = new Date(timestamp2).getTime();
    return Math.abs(t2 - t1) <= this.windowMs;
  }

  getWindowStart(timestamp, windowHours = null) {
    const windowMs = windowHours ? windowHours * HOUR_MS : this.windowMs;
    return new Date(new Date(timestamp).getTime() - windowMs);
  }

  getWindowEnd(timestamp, windowHours = null) {
    const windowMs = windowHours ? windowHours * HOUR_MS : this.windowMs;
    return new Date(new Date(timestamp).getTime() + windowMs);
  }

  groupByTimeWindow(transactions, windowHours = 72) {
    if (!transactions.length) return [];

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const windows = [];
    let currentWindow = [sorted[0]];
    let windowStart = new Date(sorted[0].timestamp);

    for (let i = 1; i < sorted.length; i++) {
      const txTime = new Date(sorted[i].timestamp);
      const windowMs = windowHours * HOUR_MS;

      if (txTime - windowStart <= windowMs) {
        currentWindow.push(sorted[i]);
      } else {
        if (currentWindow.length > 0) {
          windows.push([...currentWindow]);
        }
        currentWindow = [sorted[i]];
        windowStart = txTime;
      }
    }

    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  slidingWindowAnalysis(transactions, windowHours = 72) {
    if (!transactions.length) return { maxCount: 0, windows: [] };

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const windowMs = windowHours * HOUR_MS;
    let maxCount = 0;
    let maxWindow = null;
    const windows = [];

    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].timestamp);
      const windowEnd = new Date(windowStart.getTime() + windowMs);

      const windowTxs = sorted.filter(tx => {
        const txTime = new Date(tx.timestamp);
        return txTime >= windowStart && txTime <= windowEnd;
      });

      if (windowTxs.length > maxCount) {
        maxCount = windowTxs.length;
        maxWindow = {
          start: windowStart,
          end: windowEnd,
          transactions: windowTxs
        };
      }

      windows.push({
        start: windowStart,
        end: windowEnd,
        count: windowTxs.length
      });
    }

    return {
      maxCount,
      maxWindow,
      windows
    };
  }

  calculateVelocity(transactions) {
    if (transactions.length < 2) return 0;

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const firstTime = new Date(sorted[0].timestamp).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const durationHours = (lastTime - firstTime) / HOUR_MS;

    if (durationHours === 0) return transactions.length;
    return transactions.length / durationHours;
  }

  isHighVelocity(transactions, threshold = 24) {
    if (transactions.length < 2) return false;

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const firstTime = new Date(sorted[0].timestamp).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const durationHours = (lastTime - firstTime) / HOUR_MS;

    return durationHours <= threshold && transactions.length >= 3;
  }
}

module.exports = TimeWindow;
