import { useI18n } from '../i18n/index.js';\n/**
 * perf.js — 공통 성능 유틸 훅 모음
 * React.memo 래퍼 · useDebounce · useThrottle · useLazyData
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ── 디바운스 훅 ────────────────────────────────────────── */
export function useDebounce(value, delay = 300) {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

/* ── 스로틀 훅 ──────────────────────────────────────────── */
export function useThrottle(fn, delay = 100) {
    const last = useRef(0);
    return useCallback((...args) => {
        const now = Date.now();
        if (now - last.current >= delay) { last.current = now; fn(...args); }
    }, [fn, delay]);
}

/* ── localStorage 디바운스 Save ─────────────────────────── */
export function useLSState(key, defaultVal) {
    const [val, setVal] = useState(() => {
        try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : defaultVal; } catch { return defaultVal; }
    });
    const timerRef = useRef(null);
    const save = useCallback((v) => {
        setVal(v);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            localStorage.setItem(key, JSON.stringify(v));
        }, 400); // 400ms 디바운스 — 빠른 연속 클릭 시 Save 최소화
    }, [key]);
    const reset = useCallback(() => save(defaultVal), [save]);
    return [val, save, reset];
}

/* ── 인터섹션 옵저버 기반 지연 로딩 ─────────────────────── */
export function useLazyVisible(ref, rootMargin = "200px") {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!ref.current || visible) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin });
        obs.observe(ref.current);
        return () => obs.disconnect();
    }, [ref, rootMargin, visible]);
    return visible;
}

/* ── 정렬 훅 ────────────────────────────────────────────── */
export function useSortedData(data, initialKey = "", initialDir = "desc") {
    const [sortKey, setSortKey] = useState(initialKey);
    const [sortDir, setSortDir] = useState(initialDir);
    const sorted = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            if (av == null) return 1; if (bv == null) return -1;
            const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);
    const toggleSort = useCallback((key) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    }, [sortKey]);
    return { sorted, sortKey, sortDir, toggleSort };
}

/* ── 페이지네이션 훅 ─────────────────────────────────────── */
export function usePagination(data, pageSize = 20) {
    const [page, setPage] = useState(0);
    const total = Math.ceil(data.length / pageSize);
    const slice = useMemo(() => data.slice(page * pageSize, (page + 1) * pageSize), [data, page, pageSize]);
    const reset = useCallback(() => setPage(0), []);
    return { slice, page, total, setPage, reset, hasNext: page < total - 1, hasPrev: page > 0 };
}

/* ── API fetch 훅 (메모이즈드 캐시) ─────────────────────── */
const cache = new Map();
export function useFetch(url, opts = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const cacheKey = url + JSON.stringify(opts);
    useEffect(() => {
        if (!url) return;
        if (cache.has(cacheKey)) { setData(cache.get(cacheKey)); return; }
        setLoading(true);
        fetch(url, opts)
            .then(r => r.json())
            .then(d => { cache.set(cacheKey, d); setData(d); })
            .catch(e => setError(e))
            .finally(() => setLoading(false));
    }, [cacheKey]);
    const invalidate = useCallback(() => { cache.delete(cacheKey); }, [cacheKey]);
    return { data, loading, error, invalidate };
}

/* ── 숫자 포맷 유틸 (메모이즈드) ────────────────────────── */
const KRW_FMT = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const NUM_FMT = new Intl.NumberFormat("ko-KR");
export const fmtKRW = (v) => KRW_FMT.format(v);
export const fmtNum = (v) => NUM_FMT.format(v);
export const fmtM = (v) => (v >= 0 ? "+" : "") + "₩" + (Math.abs(v) / 1e6).toFixed(2) + "M";
export const fmtPct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
