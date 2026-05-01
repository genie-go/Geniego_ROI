/**
 * Web Vitals 성능 측정 유틸리티
 * 
 * Core Web Vitals 측정:
 * - LCP (Largest Contentful Paint): 최대 콘텐츠풀 페인트
 * - FID (First Input Delay): 최초 입력 지연
 * - CLS (Cumulative Layout Shift): 누적 레이아웃 이동
 * 
 * 추가 메트릭:
 * - FCP (First Contentful Paint): 최초 콘텐츠풀 페인트
 * - TTFB (Time to First Byte): 최초 바이트까지의 시간
 */

// 성능 데이터 저장소
const performanceData = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
};

// 성능 데이터 콜백 리스너
const listeners = [];

/**
 * 성능 데이터 변경 시 호출될 콜백 등록
 */
export function onPerformanceData(callback) {
    listeners.push(callback);
    return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    };
}

/**
 * 성능 데이터 업데이트 및 리스너 호출
 */
function updatePerformanceData(metric, value) {
    performanceData[metric] = value;
    listeners.forEach(callback => callback({ ...performanceData }));

    // 콘솔에 로깅 (개발 환경)
    if (import.meta.env.DEV) {
        console.log(`[Web Vitals] ${metric.toUpperCase()}: ${value.toFixed(2)}ms`);
    }
}

/**
 * LCP (Largest Contentful Paint) 측정
 * 좋음: < 2500ms, 개선 필요: 2500-4000ms, 나쁨: > 4000ms
 */
export function measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            updatePerformanceData('lcp', lastEntry.renderTime || lastEntry.loadTime);
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
        console.error('[Web Vitals] LCP measurement failed:', error);
    }
}

/**
 * FID (First Input Delay) 측정
 * 좋음: < 100ms, 개선 필요: 100-300ms, 나쁨: > 300ms
 */
export function measureFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.processingStart && entry.startTime) {
                    updatePerformanceData('fid', entry.processingStart - entry.startTime);
                }
            });
        });

        observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
        console.error('[Web Vitals] FID measurement failed:', error);
    }
}

/**
 * CLS (Cumulative Layout Shift) 측정
 * 좋음: < 0.1, 개선 필요: 0.1-0.25, 나쁨: > 0.25
 */
export function measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();

            entries.forEach((entry) => {
                // hadRecentInput이 없거나 false인 경우만 카운트
                if (!entry.hadRecentInput) {
                    const firstSessionEntry = sessionEntries[0];
                    const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

                    // 세션 갭이 1초 이상이거나 5초 이상 지속되면 새 세션 시작
                    if (
                        sessionValue &&
                        entry.startTime - lastSessionEntry.startTime < 1000 &&
                        entry.startTime - firstSessionEntry.startTime < 5000
                    ) {
                        sessionValue += entry.value;
                        sessionEntries.push(entry);
                    } else {
                        sessionValue = entry.value;
                        sessionEntries = [entry];
                    }

                    // 최대 세션 값 업데이트
                    if (sessionValue > clsValue) {
                        clsValue = sessionValue;
                        updatePerformanceData('cls', clsValue);
                    }
                }
            });
        });

        observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
        console.error('[Web Vitals] CLS measurement failed:', error);
    }
}

/**
 * FCP (First Contentful Paint) 측정
 * 좋음: < 1800ms, 개선 필요: 1800-3000ms, 나쁨: > 3000ms
 */
export function measureFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                    updatePerformanceData('fcp', entry.startTime);
                }
            });
        });

        observer.observe({ type: 'paint', buffered: true });
    } catch (error) {
        console.error('[Web Vitals] FCP measurement failed:', error);
    }
}

/**
 * TTFB (Time to First Byte) 측정
 * 좋음: < 800ms, 개선 필요: 800-1800ms, 나쁨: > 1800ms
 */
export function measureTTFB() {
    try {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
            const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
            updatePerformanceData('ttfb', ttfb);
        }
    } catch (error) {
        console.error('[Web Vitals] TTFB measurement failed:', error);
    }
}

/**
 * 모든 Web Vitals 측정 시작
 */
export function initWebVitals() {
    if (typeof window === 'undefined') return;

    measureLCP();
    measureFID();
    measureCLS();
    measureFCP();
    measureTTFB();

    // 페이지 언로드 시 최종 데이터 로깅
    window.addEventListener('beforeunload', () => {
        if (import.meta.env.DEV) {
            console.log('[Web Vitals] Final Report:', performanceData);
        }
    });
}

/**
 * 현재 성능 데이터 가져오기
 */
export function getPerformanceData() {
    return { ...performanceData };
}

/**
 * 성능 등급 계산
 */
export function getPerformanceGrade(metric, value) {
    if (value === null) return 'N/A';

    const thresholds = {
        lcp: { good: 2500, needsImprovement: 4000 },
        fid: { good: 100, needsImprovement: 300 },
        cls: { good: 0.1, needsImprovement: 0.25 },
        fcp: { good: 1800, needsImprovement: 3000 },
        ttfb: { good: 800, needsImprovement: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'N/A';

    if (value <= threshold.good) return 'Good';
    if (value <= threshold.needsImprovement) return 'Needs Improvement';
    return 'Poor';
}

/**
 * 성능 데이터를 로컬 스토리지에 저장
 */
export function savePerformanceReport(pageName) {
    const report = {
        page: pageName,
        timestamp: new Date().toISOString(),
        metrics: { ...performanceData },
    };

    try {
        const reports = JSON.parse(localStorage.getItem('g_perf_reports') || '[]');
        reports.unshift(report);
        // 최근 50개만 유지
        localStorage.setItem('g_perf_reports', JSON.stringify(reports.slice(0, 50)));
    } catch (error) {
        console.error('[Web Vitals] Failed to save report:', error);
    }
}

/**
 * 저장된 성능 리포트 가져오기
 */
export function getPerformanceReports() {
    try {
        return JSON.parse(localStorage.getItem('g_perf_reports') || '[]');
    } catch {
        return [];
    }
}
