import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';
import { MEMBER_MENU, ADMIN_MENU } from '../layout/sidebarManifest.js';
import { MENU_KEY_LABEL, SUB_TABS_BY_PATH } from '../layout/sidebarMenuLabels.js';

/**
 * AdminMenuManager — 172차 PHASE 2-D 전면 재설계.
 *
 * N-152-F F2/F3 (T3) 의 메뉴 가시성 토글. 169차 P1 menu_tree seed 정합.
 *
 * 초고도화 보강:
 *  - sidebarManifest + MENU_KEY_LABEL 활용 4계층 트리 (대 → 중 → 하 → 서브탭)
 *  - i18n 한글 라벨 (label_key raw 노출 X)
 *  - 검색 + 섹션 collapse
 *  - 일괄 토글 (섹션 전체 visible/hidden/disabled)
 *  - 통계 카드 (visible/hidden/disabled 갯수)
 *  - Promise.all 로 다수 PATCH 호출 (backend 단일 endpoint 활용)
 *
 * Backend:
 *   - GET /api/v425/admin/menu-tree       — 전체 트리
 *   - PATCH /api/v425/admin/menu-tree/{id} — visibility 변경
 *   - POST /api/v425/admin/menu-tree/reset (super_admin)
 */
export default function AdminMenuManager() {
  const t = useT();
  const { token, user, isAdmin, plan } = useAuth() || {};
  const scope = user?.scope || '';
  const isSuper = isAdmin && (scope.includes('admin:menu_super') || scope.includes('admin:*'));

  const [tree, setTree] = useState([]);           // backend menu_tree rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  const base = import.meta.env.VITE_API_BASE || '';
  const sections = useMemo(() => [...MEMBER_MENU, ...ADMIN_MENU], []);

  // backend menu_tree row 의 id → visibility 맵
  const visibilityByKey = useMemo(() => {
    const m = {};
    for (const r of tree) {
      m[r.id] = r.visibility || 'visible';
    }
    return m;
  }, [tree]);

  const dbKeySet = useMemo(() => new Set(tree.map(r => r.id)), [tree]);

  // 172차: 5계층 확장 키 변환 헬퍼 (__section:/__leaf:/__subtab:)
  const sectionKeyOf = (sectionKey) => `__section:${sectionKey}`;
  const leafKeyOf = (route) => `__leaf:${route}`;
  const subtabKeyOf = (route, subId) => `__subtab:${route}::${subId}`;

  const fetchTree = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/api/v425/admin/menu-tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTree(Array.isArray(json?.tree) ? json.tree : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally { setLoading(false); }
  }, [token, base]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const updateVisibility = useCallback(async (menuId, visibility) => {
    if (!token) return;
    setSavingId(menuId);
    try {
      const res = await fetch(`${base}/api/v425/admin/menu-tree/${encodeURIComponent(menuId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ visibility, reason: 'admin toggle via AdminMenuManager (172차)' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      // optimistic local update
      setTree(prev => prev.map(r => r.id === menuId ? { ...r, visibility } : r));
      // 172차 — Sidebar 즉시 반영용 broadcast
      try { new BroadcastChannel('geniego_menu_visibility_sync').postMessage({ type: 'menu_visibility_updated', menuId, visibility, ts: Date.now() }); } catch {}
    } catch (e) {
      alert(`업데이트 실패: ${e.message}`);
    } finally { setSavingId(null); }
  }, [token, base]);

  /** 일괄 토글 — 여러 menu_id 를 동일 visibility 로 변경 (Promise.all) */
  const bulkUpdate = useCallback(async (menuIds, visibility) => {
    if (!token || menuIds.length === 0) return;
    if (!window.confirm(`${menuIds.length}개 메뉴를 ${visibility} 로 일괄 변경하시겠습니까?`)) return;
    setBulkSaving(true);
    try {
      const results = await Promise.allSettled(menuIds.map(id =>
        fetch(`${base}/api/v425/admin/menu-tree/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ visibility, reason: 'admin bulk toggle (172차)' }),
        })
      ));
      const failed = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok)).length;
      if (failed > 0) alert(`${menuIds.length}개 중 ${failed}개 실패`);
      await fetchTree();
      try { new BroadcastChannel('geniego_menu_visibility_sync').postMessage({ type: 'menu_visibility_updated', bulk: true, count: menuIds.length, ts: Date.now() }); } catch {}
    } finally { setBulkSaving(false); }
  }, [token, base, fetchTree]);

  const onReset = useCallback(async () => {
    if (!isSuper) { alert('reset 은 admin:menu_super scope 필요'); return; }
    const reason = prompt('reset 사유 (필수, 감사 로그 기록)');
    if (!reason) return;
    if (!confirm('정말 메뉴 트리를 기본값으로 복원합니까? (모든 커스터마이즈 손실)')) return;
    try {
      const res = await fetch(`${base}/api/v425/admin/menu-tree/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: 'RESET_MENU_TREE', reason }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.error || `HTTP ${res.status}`); }
      await fetchTree();
      alert('reset 완료');
    } catch (e) { alert(`reset 실패: ${e.message}`); }
  }, [isSuper, token, base, fetchTree]);

  // 통계
  const stats = useMemo(() => {
    const s = { visible: 0, hidden: 0, disabled: 0, total: tree.length };
    for (const r of tree) {
      const v = r.visibility || 'visible';
      if (s[v] !== undefined) s[v]++;
    }
    return s;
  }, [tree]);

  const toggleCollapse = (key) => setCollapsed(prev => {
    const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n;
  });

  const matchesFilter = (item) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    const ko = MENU_KEY_LABEL[item.menuKey]?.title?.toLowerCase() || '';
    const label = (t(item.labelKey, item.labelKey) || '').toLowerCase();
    return ko.includes(q) || label.includes(q) || (item.to || '').toLowerCase().includes(q) || (item.menuKey || '').toLowerCase().includes(q);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 32 }}>
        <h2>접근 불가</h2>
        <p>본 페이지는 admin plan 필수입니다. 현재 plan: {plan || '(unknown)'}</p>
      </div>
    );
  }

  // 섹션 단위 메타 (대메뉴 → 중메뉴 그룹)
  const sectionMeta = (section) => {
    const groups = [];
    const seen = new Map();
    for (const it of section.items) {
      if (!it.menuKey) continue;
      if (!seen.has(it.menuKey)) {
        const grp = { menuKey: it.menuKey, items: [] };
        seen.set(it.menuKey, grp);
        groups.push(grp);
      }
      seen.get(it.menuKey).items.push(it);
    }
    return groups;
  };

  return (
    <div style={{ padding: 24, color: 'var(--text-1)' }}>
      {/* 헤더 */}
      <div style={{
        borderRadius: 14, padding: '16px 20px', marginBottom: 14,
        background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 22 }}>🗂</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>메뉴 가시성 관리 (4계층)</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            대메뉴 → 중메뉴 → 하위 페이지 → 서브탭 4단계. 각 menu_tree row 의 visibility (visible/hidden/disabled) 직접 토글 또는 섹션 일괄.
          </div>
        </div>
        <button onClick={fetchTree} disabled={loading} style={{
          padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>{loading ? '로딩…' : '🔄 새로고침'}</button>
        {isSuper && (
          <button onClick={onReset} style={{
            padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.30)',
            background: 'rgba(239,68,68,0.08)', color: '#dc2626',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>🗑 기본값 복원 (super)</button>
        )}
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: '전체 메뉴',  value: stats.total,    color: '#4f46e5' },
          { label: '✓ 표시',    value: stats.visible,  color: '#16a34a' },
          { label: '⊘ 숨김',    value: stats.hidden,   color: '#d97706' },
          { label: '✗ 비활성',  value: stats.disabled, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '12px 16px', borderRadius: 10,
            background: `${s.color}10`, border: `1px solid ${s.color}33`,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text" value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="🔍 메뉴 이름/경로/한글 라벨/키 검색…"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.18)',
            color: 'var(--text-1)', fontSize: 13,
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: 12, marginBottom: 14, borderRadius: 8,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)',
          color: '#dc2626', fontSize: 13,
        }}>⚠ {error}</div>
      )}

      {tree.length === 0 && !loading && !error && (
        <div style={{ padding: 24, opacity: 0.7, fontSize: 13 }}>
          menu_tree 가 비어 있습니다. 169차 P1 seed 적용 또는 backend 운영 적용 확인 필요.
        </div>
      )}

      {/* 4계층 트리 */}
      <div>
        {sections.map(section => {
          const groups = sectionMeta(section);
          const visibleGroups = groups.filter(g => g.items.some(matchesFilter));
          if (filter.trim() && visibleGroups.length === 0) return null;
          const isCollapsed = collapsed.has(section.key);
          const sectionLabel = t(section.labelKey, section.labelKey.split('.').pop());
          // 섹션 단위 visibility 통계 + section 자체 키 (__section:<key>)
          const sectionExtKey = sectionKeyOf(section.key);
          const sectionExtVis = visibilityByKey[sectionExtKey] || 'visible';
          const sectionInDb = dbKeySet.has(sectionExtKey);
          const sectionKeys = groups.map(g => g.menuKey);
          const sectionVisCount = sectionKeys.filter(k => visibilityByKey[k] === 'visible').length;
          return (
            <div key={section.key} style={{
              marginBottom: 12, borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              {/* 대메뉴 헤더 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
                flexWrap: 'wrap',
              }} onClick={() => toggleCollapse(section.key)}>
                <span style={{ width: 12, fontSize: 12, color: 'var(--text-3)' }}>{isCollapsed ? '▶' : '▼'}</span>
                <span style={{ fontSize: 16 }}>{section.icon}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                  background: 'rgba(99,102,241,0.15)', color: '#4f46e5',
                }}>대메뉴</span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{sectionLabel}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  background: 'rgba(34,197,94,0.10)', color: '#16a34a',
                }}>{sectionVisCount} / {sectionKeys.length} 표시</span>
                <div style={{ flex: 1 }} />
                {/* 대메뉴 자체 visibility 토글 (172차 — section level 신규) */}
                {sectionInDb && (
                  <div onClick={e => e.stopPropagation()}>
                    <VisibilityToggle
                      current={sectionExtVis}
                      onChange={(v) => updateVisibility(sectionExtKey, v)}
                      saving={savingId === sectionExtKey}
                      size="sm"
                    />
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); bulkUpdate(sectionKeys.filter(k => dbKeySet.has(k)), 'visible'); }} disabled={bulkSaving} style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                  border: '1px solid rgba(34,197,94,0.28)', cursor: 'pointer',
                }}>✓ 중메뉴 전체 표시</button>
                <button onClick={e => { e.stopPropagation(); bulkUpdate(sectionKeys.filter(k => dbKeySet.has(k)), 'hidden'); }} disabled={bulkSaving} style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: 'rgba(217,119,6,0.12)', color: '#d97706',
                  border: '1px solid rgba(217,119,6,0.28)', cursor: 'pointer',
                }}>⊘ 중메뉴 전체 숨김</button>
              </div>
              {/* 중메뉴 그룹 */}
              {!isCollapsed && (
                <div style={{ padding: '8px 12px 12px 30px' }}>
                  {visibleGroups.map(group => {
                    const items = group.items.filter(matchesFilter);
                    const inDb = dbKeySet.has(group.menuKey);
                    const currentVis = visibilityByKey[group.menuKey] || 'visible';
                    const ko = MENU_KEY_LABEL[group.menuKey];
                    return (
                      <div key={group.menuKey} style={{
                        marginTop: 10, padding: '10px 12px', borderRadius: 8,
                        background: currentVis === 'visible' ? 'rgba(34,197,94,0.04)' :
                                    currentVis === 'hidden' ? 'rgba(217,119,6,0.04)' :
                                    'rgba(220,38,38,0.04)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        opacity: inDb ? 1 : 0.55,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 7px', borderRadius: 8, fontSize: 9, fontWeight: 800,
                            background: 'rgba(34,197,94,0.15)', color: '#16a34a',
                          }}>중메뉴</span>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>{ko?.title || group.menuKey}</span>
                          <code style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-3)', padding: '1px 5px', borderRadius: 3, background: 'rgba(0,0,0,0.2)' }}>
                            {group.menuKey}
                          </code>
                          {!inDb && <span style={{ padding: '1px 7px', borderRadius: 8, fontSize: 9, background: 'rgba(251,146,60,0.12)', color: '#d97706' }}>⚠ menu_tree 미등록</span>}
                          <div style={{ flex: 1 }} />
                          {/* visibility 토글 */}
                          {inDb && (
                            <VisibilityToggle
                              current={currentVis}
                              onChange={(v) => updateVisibility(group.menuKey, v)}
                              saving={savingId === group.menuKey}
                            />
                          )}
                        </div>
                        {ko?.desc && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4, marginBottom: 6 }}>{ko.desc}</div>
                        )}
                        {/* 하위메뉴 (leaf) + 서브탭 */}
                        <div style={{ display: 'grid', gap: 4, paddingLeft: 20 }}>
                          {items.map(it => {
                            const leafLabel = t(it.labelKey, it.labelKey.split('.').pop());
                            const subTabs = SUB_TABS_BY_PATH[it.to] || [];
                            const leafExtKey = leafKeyOf(it.to);
                            const leafExtVis = visibilityByKey[leafExtKey] || 'visible';
                            const leafInDb = dbKeySet.has(leafExtKey);
                            return (
                              <div key={it.to} style={{
                                padding: '5px 8px', borderRadius: 6,
                                background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.03)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                                  <span style={{ width: 14, textAlign: 'center', opacity: 0.6 }}>{it.icon}</span>
                                  <span style={{
                                    padding: '1px 6px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                                    background: 'rgba(251,191,36,0.15)', color: '#d97706',
                                  }}>하위</span>
                                  <span style={{ minWidth: 130, fontWeight: 700 }}>{leafLabel}</span>
                                  <code style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>{it.to}</code>
                                  {subTabs.length > 0 && (
                                    <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, background: 'rgba(168,85,247,0.12)', color: '#9333ea' }}>
                                      📑 서브탭 {subTabs.length}
                                    </span>
                                  )}
                                  <div style={{ flex: 1 }} />
                                  {/* 하위 leaf 토글 — 172차 */}
                                  {leafInDb && (
                                    <VisibilityToggle
                                      current={leafExtVis}
                                      onChange={(v) => updateVisibility(leafExtKey, v)}
                                      saving={savingId === leafExtKey}
                                      size="xs"
                                    />
                                  )}
                                </div>
                                {subTabs.length > 0 && (
                                  <div style={{ marginTop: 6, paddingLeft: 20, display: 'grid', gap: 3 }}>
                                    {subTabs.map(st => {
                                      const stKey = subtabKeyOf(it.to, st.id);
                                      const stVis = visibilityByKey[stKey] || 'visible';
                                      const stInDb = dbKeySet.has(stKey);
                                      return (
                                        <div key={st.id} style={{
                                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                                          padding: '3px 8px', borderRadius: 6,
                                          background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.10)',
                                        }}>
                                          <span style={{
                                            padding: '1px 6px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                                            background: 'rgba(168,85,247,0.18)', color: '#9333ea',
                                          }}>📑 서브탭</span>
                                          <span style={{ fontWeight: 700 }}>{st.label}</span>
                                          <code style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{st.id}</code>
                                          <div style={{ flex: 1 }} />
                                          {stInDb && (
                                            <VisibilityToggle
                                              current={stVis}
                                              onChange={(v) => updateVisibility(stKey, v)}
                                              saving={savingId === stKey}
                                              size="xs"
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* — 5계층 토글 안내 — */}
      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7,
      }}>
        🆕 <strong>5계층 개별 토글</strong>:
        <span style={{ color: '#4f46e5', fontWeight: 700, marginLeft: 6 }}>대메뉴</span> →
        <span style={{ color: '#16a34a', fontWeight: 700, marginLeft: 6 }}>중메뉴</span> →
        <span style={{ color: '#d97706', fontWeight: 700, marginLeft: 6 }}>하위 페이지</span> →
        <span style={{ color: '#9333ea', fontWeight: 700, marginLeft: 6 }}>📑 서브탭</span>
        — 모든 레벨에서 ✓ 표시 / ⊘ 숨김 / ✗ 비활성 개별 선택 가능.
      </div>

      {/* 사용자 안내 */}
      <div style={{
        marginTop: 18, padding: '12px 16px', borderRadius: 10,
        background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7,
      }}>
        💡 <strong>가시성 정책</strong>:
        <span style={{ color: '#16a34a', fontWeight: 700, marginLeft: 6 }}>✓ 표시</span> 사이드바 노출 ·
        <span style={{ color: '#d97706', fontWeight: 700, marginLeft: 6 }}>⊘ 숨김</span> 비노출 (자물쇠 없음) ·
        <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 6 }}>✗ 비활성</span> 노출되지만 클릭 비활성. <br/>
        변경 즉시 MenuVisibilityContext 캐시 무효 + 다음 페이지 로드 시 반영 (강제 새로고침은 불필요).
      </div>
    </div>
  );
}

/**
 * 172차 PHASE 2-D 보강 — VisibilityToggle (모든 5계층 공유).
 * 3-state segmented control: visible / hidden / disabled.
 */
function VisibilityToggle({ current, onChange, saving, size = 'md' }) {
  const opts = [
    { v: 'visible',  label: '✓ 표시',   color: '#16a34a' },
    { v: 'hidden',   label: '⊘ 숨김',   color: '#d97706' },
    { v: 'disabled', label: '✗ 비활성', color: '#dc2626' },
  ];
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 10 : 11;
  const padding = size === 'xs' ? '2px 6px' : size === 'sm' ? '3px 7px' : '3px 8px';
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 2, borderRadius: 5,
      background: 'rgba(0,0,0,0.2)', opacity: saving ? 0.6 : 1,
    }}>
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          disabled={saving || current === o.v}
          style={{
            padding, borderRadius: 3, fontSize, fontWeight: 700, border: 'none',
            background: current === o.v ? o.color : 'transparent',
            color: current === o.v ? '#fff' : 'var(--text-3)',
            cursor: saving ? 'default' : 'pointer', whiteSpace: 'nowrap',
          }}
        >{o.label}</button>
      ))}
    </div>
  );
}
