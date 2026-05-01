import React, { Profiler } from 'react';

/**
 * React Profiler 래퍼 컴포넌트
 * 
 * 컴포넌트 렌더링 성능을 측정하고 기록합니다.
 * 개발 환경에서만 상세 로깅을 수행하며, 프로덕션에서는 최소한의 오버헤드만 발생합니다.
 * 
 * @param {string} id - Profiler 식별자 (페이지명 또는 컴포넌트명)
 * @param {React.ReactNode} children - 측정할 자식 컴포넌트
 * @param {boolean} enabled - Profiler 활성화 여부 (기본값: true)
 */
export default function PerformanceProfiler({ id, children, enabled = true }) {
    if (!enabled) {
        return children;
    }

    /**
     * Profiler 콜백 함수
     * 
     * @param {string} id - Profiler 식별자
     * @param {string} phase - "mount" (초기 렌더링) 또는 "update" (리렌더링)
     * @param {number} actualDuration - 렌더링에 소요된 실제 시간 (ms)
     * @param {number} baseDuration - 메모이제이션 없이 렌더링하는 데 걸리는 예상 시간 (ms)
     * @param {number} startTime - React가 렌더링을 시작한 시간
     * @param {number} commitTime - React가 업데이트를 커밋한 시간
     */
    const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
        // 성능 데이터 저장
        const performanceEntry = {
            id,
            phase,
            actualDuration: Math.round(actualDuration * 100) / 100,
            baseDuration: Math.round(baseDuration * 100) / 100,
            startTime: Math.round(startTime * 100) / 100,
            commitTime: Math.round(commitTime * 100) / 100,
            timestamp: new Date().toISOString(),
        };

        // 로컬 스토리지에 저장 (최근 100개만 유지)
        try {
            const profilerData = JSON.parse(localStorage.getItem('g_profiler_data') || '[]');
            profilerData.unshift(performanceEntry);
            localStorage.setItem('g_profiler_data', JSON.stringify(profilerData.slice(0, 100)));
        } catch (error) {
            console.error('[PerformanceProfiler] Failed to save data:', error);
        }

        // 개발 환경에서 상세 로깅
        if (import.meta.env.DEV) {
            // 렌더링 시간이 16ms(60fps 기준) 이상이면 경고
            const isSlowRender = actualDuration > 16;
            const logLevel = isSlowRender ? 'warn' : 'log';

            console[logLevel](
                `[Profiler] ${id} (${phase}):\n` +
                `  Actual: ${actualDuration.toFixed(2)}ms\n` +
                `  Base: ${baseDuration.toFixed(2)}ms\n` +
                `  Optimization: ${((1 - actualDuration / baseDuration) * 100).toFixed(1)}%`
            );

            // 매우 느린 렌더링 (100ms 이상) 경고
            if (actualDuration > 100) {
                console.error(
                    `⚠️ [Profiler] SLOW RENDER DETECTED!\n` +
                    `  Component: ${id}\n` +
                    `  Duration: ${actualDuration.toFixed(2)}ms\n` +
                    `  Consider optimization: useMemo, useCallback, React.memo`
                );
            }
        }
    };

    return (
        <Profiler id={id} onRender={onRenderCallback}>
            {children}
        </Profiler>
    );
}

/**
 * Profiler 데이터 가져오기
 */
export function getProfilerData() {
    try {
        return JSON.parse(localStorage.getItem('g_profiler_data') || '[]');
    } catch {
        return [];
    }
}

/**
 * Profiler 데이터 초기화
 */
export function clearProfilerData() {
    try {
        localStorage.removeItem('g_profiler_data');
    } catch (error) {
        console.error('[PerformanceProfiler] Failed to clear data:', error);
    }
}

/**
 * 특정 컴포넌트의 평균 렌더링 시간 계산
 */
export function getAverageRenderTime(componentId) {
    const data = getProfilerData();
    const componentData = data.filter(entry => entry.id === componentId);

    if (componentData.length === 0) return null;

    const totalDuration = componentData.reduce((sum, entry) => sum + entry.actualDuration, 0);
    const avgDuration = totalDuration / componentData.length;

    return {
        componentId,
        count: componentData.length,
        avgDuration: Math.round(avgDuration * 100) / 100,
        totalDuration: Math.round(totalDuration * 100) / 100,
        mountCount: componentData.filter(e => e.phase === 'mount').length,
        updateCount: componentData.filter(e => e.phase === 'update').length,
    };
}

/**
 * 모든 컴포넌트의 성능 요약 생성
 */
export function getPerformanceSummary() {
    const data = getProfilerData();
    const componentIds = [...new Set(data.map(entry => entry.id))];

    return componentIds.map(id => getAverageRenderTime(id)).filter(Boolean);
}
