import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * MenuVisibilityContext — N-152-F F2/F3 (T3) frontend skeleton.
 *
 * spec: docs/spec/n152f_consolidated_pm_track.md §4.4
 *
 * 정책:
 *  - admin 전역 가시성 (menu_tree.visibility): 모든 사용자에 적용
 *  - 사용자 개인 가시성 (localStorage): 본인 한정
 *  - **우선순위: 전역 > 개인** (사용자 결정 — 통합 spec §4.5)
 *  - 충돌: 전역 hidden ∧ 개인 visible → 최종 hidden
 *
 * Backend endpoint:
 *  - GET /api/v425/menu-tree            (visibility/role 통과만)
 *  - GET /api/v425/admin/menu-tree      (admin 전체 트리, AdminMenuManager 페이지에서)
 *  - PATCH /api/v425/admin/menu-tree/:id
 *  - POST  /api/v425/admin/menu-tree/reorder
 *
 * 본 skeleton 은 localStorage mock + API 호출 분기. 실제 fetch 는 본 168차 범위.
 */

const MenuVisibilityContext = createContext(null);

const USER_PREFS_KEY = 'g_user_menu_visibility';
const ADMIN_TREE_CACHE_KEY = 'g_admin_menu_tree_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

function loadUserPrefs() {
  try {
    const raw = localStorage.getItem(USER_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

function saveUserPrefs(prefs) {
  try {
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

function loadAdminTreeCache() {
  try {
    const raw = localStorage.getItem(ADMIN_TREE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || (Date.now() - parsed.ts) > CACHE_TTL_MS) return null;
    return parsed.data || null;
  } catch {
    return null;
  }
}

function saveAdminTreeCache(data) {
  try {
    localStorage.setItem(ADMIN_TREE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export function MenuVisibilityProvider({ children }) {
  const { token } = useAuth() || {};

  const [globalVisibility, setGlobalVisibility] = useState(() => loadAdminTreeCache() || {});
  const [userPrefs, setUserPrefs] = useState(loadUserPrefs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 글로벌 visibility 페치 — /api/v425/menu-tree
   * 응답을 menu_id → visibility 맵으로 변환.
   * 본 skeleton: 백엔드 미배포 환경에서 fail-silent (캐시 fallback).
   */
  const fetchGlobal = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.VITE_API_BASE || '';
      const res = await fetch(`${base}/api/v425/menu-tree`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'omit',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const tree = Array.isArray(json?.tree) ? json.tree : [];
      const map = {};
      for (const node of tree) {
        if (node?.id) {
          map[node.id] = {
            visibility: node.visibility || 'visible',
            required_plan: node.required_plan || null,
            required_role: node.required_role || null,
            is_admin_only: !!node.is_admin_only,
          };
        }
      }
      setGlobalVisibility(map);
      saveAdminTreeCache(map);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchGlobal(); }, [fetchGlobal]);

  /**
   * 사용자 개인 가시성 토글.
   */
  const setUserVisibility = useCallback((menuId, visible) => {
    setUserPrefs(prev => {
      const next = { ...prev, [menuId]: visible ? 'visible' : 'hidden' };
      saveUserPrefs(next);
      return next;
    });
  }, []);

  const resetUserPrefs = useCallback(() => {
    setUserPrefs({});
    saveUserPrefs({});
  }, []);

  /**
   * 최종 가시성 — admin 전역 > 사용자 개인 우선.
   * - global hidden/disabled → 항상 비노출
   * - global visible + user hidden → 비노출 (개인 숨김)
   * - global visible + user visible/미설정 → 노출
   * - global 미등록 → 기본 visible (sidebar hardcode 정합)
   */
  const isVisible = useCallback((menuId) => {
    if (!menuId) return true;
    const g = globalVisibility[menuId];
    if (g) {
      if (g.visibility !== 'visible') return false;
    }
    const u = userPrefs[menuId];
    if (u === 'hidden') return false;
    return true;
  }, [globalVisibility, userPrefs]);

  const value = useMemo(() => ({
    isVisible,
    globalVisibility,
    userPrefs,
    setUserVisibility,
    resetUserPrefs,
    refresh: fetchGlobal,
    loading,
    error,
  }), [isVisible, globalVisibility, userPrefs, setUserVisibility, resetUserPrefs, fetchGlobal, loading, error]);

  return (
    <MenuVisibilityContext.Provider value={value}>
      {children}
    </MenuVisibilityContext.Provider>
  );
}

export function useMenuVisibility() {
  const ctx = useContext(MenuVisibilityContext);
  if (!ctx) {
    return {
      isVisible: () => true,
      globalVisibility: {},
      userPrefs: {},
      setUserVisibility: () => {},
      resetUserPrefs: () => {},
      refresh: () => {},
      loading: false,
      error: null,
    };
  }
  return ctx;
}
