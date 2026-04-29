/**
 * Enterprise Performance Monitor
 * =================================
 * Collects Web Vitals + custom metrics
 * Reports to console + localStorage for admin dashboard
 */

let _metrics = {};

export function recordMetric(name, value) {
  _metrics[name] = { value, timestamp: Date.now() };
  try {
    const stored = JSON.parse(localStorage.getItem('g_perf_metrics') || '{}');
    stored[name] = _metrics[name];
    localStorage.setItem('g_perf_metrics', JSON.stringify(stored));
  } catch {}
}

export function getMetrics() {
  try {
    return JSON.parse(localStorage.getItem('g_perf_metrics') || '{}');
  } catch {
    return {};
  }
}

export function initPerformanceMonitor() {
  if (typeof window === 'undefined') return;

  // Navigation timing
  window.addEventListener('load', () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        recordMetric('TTFB', Math.round(nav.responseStart - nav.requestStart));
        recordMetric('DOMContentLoaded', Math.round(nav.domContentLoadedEventEnd - nav.fetchStart));
        recordMetric('PageLoad', Math.round(nav.loadEventEnd - nav.fetchStart));
        recordMetric('DOMInteractive', Math.round(nav.domInteractive - nav.fetchStart));
      }

      // Resource count
      const resources = performance.getEntriesByType('resource');
      recordMetric('ResourceCount', resources.length);
      recordMetric('TotalTransfer', Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024));

      console.log(
        '%c[PerfMon] 🚀 Page Metrics',
        'color:#4f8ef7;font-weight:bold',
        getMetrics()
      );
    }, 100);
  });

  // Long task observer
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            console.warn(`[PerfMon] ⚠️ Long task: ${Math.round(entry.duration)}ms`);
            recordMetric('LastLongTask', Math.round(entry.duration));
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {}

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          recordMetric('LCP', Math.round(lastEntry.startTime));
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const firstEntry = list.getEntries()[0];
        if (firstEntry) {
          recordMetric('FID', Math.round(firstEntry.processingStart - firstEntry.startTime));
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {}

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        recordMetric('CLS', Math.round(clsValue * 1000) / 1000);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}
  }

  // Memory usage (Chrome only)
  if (performance.memory) {
    setInterval(() => {
      recordMetric('HeapUsed', Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)));
      recordMetric('HeapTotal', Math.round(performance.memory.totalJSHeapSize / (1024 * 1024)));
    }, 30000);
  }
}

export default { initPerformanceMonitor, recordMetric, getMetrics };
