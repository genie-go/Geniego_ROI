import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * AdminMenuManager — N-152-F F2 (admin 전역 메뉴 가시성 토글) skeleton.
 *
 * 백엔드: backend/src/Handlers/AdminMenu.php — 6 endpoint
 *  - GET /api/v425/admin/menu-tree
 *  - PATCH /api/v425/admin/menu-tree/{id}
 *  - POST /api/v425/admin/menu-tree/reorder
 *  - POST /api/v425/admin/menu-tree/reset (super_admin)
 *  - GET /api/v425/admin/menu-tree/audit-log
 *
 * 본 페이지는 admin role 필수. AuthContext 의 role/scope 확인.
 */
export default function AdminMenuManager() {
  const t = useT();
  // [171차 fix] app_user 테이블 role 컬럼 부재 → user.role 항상 undefined.
  // AuthContext의 isAdmin (userPlan === 'admin' || IS_DEMO_MODE) + plan 사용.
  const { token, user, isAdmin, plan } = useAuth() || {};
  const scope = user?.scope || '';
  const isSuper = isAdmin && (scope.includes('admin:menu_super') || scope.includes('admin:*'));

  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const base = import.meta.env.VITE_API_BASE || '';

  const fetchTree = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/v425/admin/menu-tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTree(Array.isArray(json?.tree) ? json.tree : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, base]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const updateVisibility = useCallback(async (menuId, visibility) => {
    if (!token) return;
    setSavingId(menuId);
    try {
      const res = await fetch(`${base}/api/v425/admin/menu-tree/${encodeURIComponent(menuId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility, reason: 'admin toggle via AdminMenuManager' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await fetchTree();
    } catch (e) {
      alert(`업데이트 실패: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  }, [token, base, fetchTree]);

  const onReset = useCallback(async () => {
    if (!isSuper) {
      alert('reset 은 admin:menu_super scope 필요');
      return;
    }
    const reason = prompt('reset 사유 (필수, 감사 로그 기록)');
    if (!reason) return;
    if (!confirm('정말 메뉴 트리를 기본값으로 복원합니까? (모든 커스터마이즈 손실)')) return;
    try {
      const res = await fetch(`${base}/api/v425/admin/menu-tree/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: 'RESET_MENU_TREE', reason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await fetchTree();
      alert('reset 완료');
    } catch (e) {
      alert(`reset 실패: ${e.message}`);
    }
  }, [isSuper, token, base, fetchTree]);

  const rootRows = useMemo(
    () => tree.filter(r => !r.parent_id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    [tree]
  );

  const childMap = useMemo(() => {
    const m = {};
    for (const r of tree) {
      if (r.parent_id) {
        if (!m[r.parent_id]) m[r.parent_id] = [];
        m[r.parent_id].push(r);
      }
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
    return m;
  }, [tree]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 32 }}>
        <h2>접근 불가</h2>
        <p>본 페이지는 admin plan 필수입니다. 현재 plan: {plan || '(unknown)'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1, #e5e7eb)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{t('admin.menu.title') || 'Admin 메뉴 가시성 관리'}</h2>
        <button
          onClick={fetchTree}
          disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border, #334155)',
                   background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          {loading ? '로딩…' : '새로고침'}
        </button>
        {isSuper && (
          <button
            onClick={onReset}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ef4444',
                     background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
          >
            기본값 복원 (super_admin)
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                      borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {tree.length === 0 && !loading && !error && (
        <div style={{ padding: 24, opacity: 0.7 }}>
          메뉴 트리가 비어 있습니다. 백엔드 운영 적용 + seed 가 필요합니다 (168차 skeleton).
        </div>
      )}

      <div>
        {rootRows.map(root => (
          <MenuNode
            key={root.id}
            node={root}
            children={childMap[root.id] || []}
            childMap={childMap}
            onToggle={updateVisibility}
            savingId={savingId}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function MenuNode({ node, children, childMap, onToggle, savingId, depth }) {
  return (
    <div style={{ marginLeft: depth * 24, padding: '8px 0', borderBottom: '1px solid var(--border, #1e293b)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ minWidth: 24 }}>{node.icon || '•'}</span>
        <span style={{ flex: 1, fontWeight: depth === 0 ? 700 : 400 }}>
          {node.label_key} <span style={{ opacity: 0.5, fontSize: 12 }}>({node.id})</span>
        </span>
        <select
          value={node.visibility || 'visible'}
          onChange={e => onToggle(node.id, e.target.value)}
          disabled={savingId === node.id}
          style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-2, #0f172a)',
                   color: 'inherit', border: '1px solid var(--border, #334155)' }}
        >
          <option value="visible">visible</option>
          <option value="hidden">hidden</option>
          <option value="disabled">disabled</option>
        </select>
      </div>
      {children.map(child => (
        <MenuNode
          key={child.id}
          node={child}
          children={childMap[child.id] || []}
          childMap={childMap}
          onToggle={onToggle}
          savingId={savingId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
