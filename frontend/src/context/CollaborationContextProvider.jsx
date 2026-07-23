/**
 * [CWIS Part004-03] Collaboration Context Store.
 *
 * ★무후퇴 설계: 본 Provider 는 **레거시 사이드바 동작에 절대 영향을 주지 않는다**.
 *   - 서버가 `enabled=false`(기본값)를 주면 신규 사이드바는 렌더되지 않고 레거시가 그대로 쓰인다.
 *   - 로딩 중·API 실패·503(스냅샷 부재)·네트워크 오류 → 전부 `enabled=false` 로 수렴(안전 폴백).
 *   즉 **켜지지 않는 한 아무것도 바뀌지 않는다**.
 *
 * ★보안: Context 는 서버가 검증한 값만 신뢰한다. localStorage 는 UI 상태(접힘)만 저장하며
 *   테넌트/프로젝트 값을 저장하거나 그것으로 데이터를 요청하지 않는다.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const Ctx = createContext(null);
const SIDEBAR_UI_KEY = 'g_sidebar_ui_state';   // UI 상태 전용(보안 무관) — 기존 키와 충돌하지 않음

const EMPTY = {
  enabled: false, available: false, loading: false, error: null,
  context: null, contextVersion: 0, contextSource: null,
  sections: [], activeMenu: null, activeAncestors: [], breadcrumb: [],
  switchers: null, registryVersion: null,
};

export function CollaborationContextProvider({ children }) {
  const { token, sessionReady } = useAuth() || {};
  const { pathname } = useLocation();
  const [state, setState] = useState(EMPTY);
  const [switching, setSwitching] = useState(false);
  const etagRef = useRef(null);
  const inFlight = useRef(false);

  const base = import.meta.env.VITE_API_BASE || '';
  const authFetch = useCallback((path, opts = {}) => fetch(`${base}${path}`, {
    ...opts,
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }), [base, token]);

  /** 사이드바 + Context + Active + Breadcrumb 를 한 번에 로드. 실패는 조용히 레거시로 폴백한다. */
  const load = useCallback(async (path) => {
    if (!token || !sessionReady || inFlight.current) return;
    inFlight.current = true;
    setState(s => ({ ...s, loading: true }));
    try {
      const headers = etagRef.current ? { 'If-None-Match': etagRef.current } : {};
      const res = await authFetch(`/api/v425/pm/sidebar?path=${encodeURIComponent(path)}&platform=WEB_DESKTOP`, { headers });
      if (res.status === 304) { setState(s => ({ ...s, loading: false })); return; }
      if (!res.ok) {
        // 503(스냅샷 부재) 포함 — 신규 사이드바를 켜지 않는다(레거시 유지)
        setState({ ...EMPTY, error: `http_${res.status}` });
        return;
      }
      etagRef.current = res.headers.get('ETag');
      const j = await res.json();
      setState({
        enabled: j.enabled === true, available: j.available === true, loading: false, error: null,
        context: j.context || null, contextVersion: j.context_version ?? 0, contextSource: j.context_source || null,
        sections: Array.isArray(j.sections) ? j.sections : [],
        activeMenu: j.active_menu || null,
        activeAncestors: Array.isArray(j.active_ancestors) ? j.active_ancestors : [],
        breadcrumb: Array.isArray(j.breadcrumb) ? j.breadcrumb : [],
        switchers: j.switchers || null, registryVersion: j.registry_version || null,
      });
    } catch (e) {
      setState({ ...EMPTY, error: String(e?.message || e) });
    } finally {
      inFlight.current = false;
    }
  }, [authFetch, token, sessionReady]);

  useEffect(() => { load(pathname); }, [load, pathname]);

  /** 전환 가능 Context 목록. 접근 불가 항목은 서버가 애초에 제외한다. */
  const fetchOptions = useCallback(async (type, query = {}) => {
    const q = new URLSearchParams({ type, ...query });
    try {
      const r = await authFetch(`/api/v425/pm/context/options?${q}`);
      return await r.json();
    } catch (e) { return { ok: false, error: String(e?.message || e) }; }
  }, [authFetch]);

  /**
   * ★원자적 전환 — 서버가 전 계층을 검증한 뒤에만 상태를 갱신한다.
   * 실패 시 기존 Context 를 그대로 유지하고 사유를 반환한다(낙관적 갱신 금지).
   */
  const switchContext = useCallback(async ({ tenantId, projectId, setDefault } = {}) => {
    if (switching) return { ok: false, error: 'ALREADY_SWITCHING' };
    setSwitching(true);
    try {
      const r = await authFetch('/api/v425/pm/context/switch', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId, project_id: projectId || '',
          expected_version: state.contextVersion || undefined,
          set_default: !!setDefault,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) return { ok: false, status: r.status, ...(j || {}) };

      // ★테넌트가 바뀌면 이전 테넌트 데이터가 화면에 남지 않도록 캐시를 비운다(§39).
      if (j.cache_invalidation?.tenant_changed) {
        try {
          for (const k of Object.keys(localStorage)) {
            // 테넌트 스코프 키(tenantStorage 규약 `base::t=<tenant>`)만 정리 — UI 프리퍼런스는 보존
            if (k.includes('::t=')) localStorage.removeItem(k);
          }
        } catch { /* 스토리지 접근 실패 무시 */ }
      }
      etagRef.current = null;
      await load(pathname);
      return { ok: true, ...j };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    } finally {
      setSwitching(false);
    }
  }, [authFetch, switching, state.contextVersion, load, pathname]);

  /* ── Sidebar UI 상태(보안 무관) ─────────────────────────────────────────── */
  const [uiState, setUiState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SIDEBAR_UI_KEY) || '{}'); } catch { return {}; }
  });
  const setSidebarState = useCallback((next) => {
    setUiState(prev => {
      const merged = { ...prev, ...next };
      try { localStorage.setItem(SIDEBAR_UI_KEY, JSON.stringify(merged)); } catch { /* quota 무시 */ }
      return merged;
    });
  }, []);

  const value = useMemo(() => ({
    ...state, switching, uiState,
    reload: () => { etagRef.current = null; return load(pathname); },
    fetchOptions, switchContext, setSidebarState,
  }), [state, switching, uiState, load, pathname, fetchOptions, switchContext, setSidebarState]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Provider 밖에서도 안전하게 동작(항상 enabled=false → 레거시 유지). */
export function useCollaborationContext() {
  return useContext(Ctx) || {
    ...EMPTY, switching: false, uiState: {},
    reload: () => {}, fetchOptions: async () => ({ ok: false }), switchContext: async () => ({ ok: false }),
    setSidebarState: () => {},
  };
}

export default CollaborationContextProvider;
