import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { IS_DEMO } from '../utils/demoEnv'; // [현 차수 P2] 데모 게이트 정본
import { useI18n } from '../i18n/index.js';
import { getJsonAuth, requestJsonAuth } from '../services/apiClient.js';
import { MEMBER_MENU } from '../layout/sidebarManifest.js';
import { requiredPlanForMenu, isAdminOnlyMenu, PLAN_TIER_RANK } from '../auth/planMenuPolicy.js';

/**
 * 203차 재구축 — 플랜별 메뉴 접근 권한 관리(실 백엔드 연결).
 *
 * 기존: 하드코딩 라벨 + handleSave=alert(스텁, menuKey 불일치). 전수감사에서 "admin 이 UI 로
 *   plan_menu_access 를 저장할 방법이 없음" 갭으로 발견됨.
 * 본 버전:
 *   - 행(메뉴): sidebarManifest 의 coarse menuKey(admin 전용 제외) — planMenuPolicy SSOT 와 동일.
 *   - 열(플랜): GET /v424/admin/plans-menu-access 의 plan_config(free/starter/pro/enterprise…).
 *   - 셀: plan_menu_access.enabled. 미설정 셀은 정책 tier 기본값(MENU_MIN_PLAN)으로 제안.
 *   - 저장: PUT /v424/admin/plans/{id}/menu-access { menus: { menu_key: 0/1 } } (플랜별 bulk upsert).
 *   - 저장 즉시 런타임 반영: AuthContext 가 /auth/pricing/public-plans 로 planMenuAccess 를 읽음.
 */

const PLAN_COLORS = { free: '#94a3b8', starter: '#22c55e', growth: '#06b6d4', pro: '#3b82f6', enterprise: '#a855f7' };

function defaultByTier(planId, menuKey) {
  const planRank = PLAN_TIER_RANK[planId];
  if (planRank === undefined) return 0; // 알 수 없는 플랜은 보수적(차단)
  const reqRank = PLAN_TIER_RANK[requiredPlanForMenu(menuKey)] ?? PLAN_TIER_RANK.pro ?? 3;
  return planRank >= reqRank ? 1 : 0;
}

function buildMenuRows(t) {
  const rows = [];
  for (const sec of MEMBER_MENU) {
    const seen = new Set();
    const items = [];
    for (const it of (sec.items || [])) {
      const mk = it.menuKey;
      if (!mk || isAdminOnlyMenu(mk) || seen.has(mk)) continue;
      seen.add(mk);
      const lbl = t(it.labelKey);
      items.push({ menuKey: mk, label: (lbl && lbl !== it.labelKey) ? lbl : (it.labelKey || mk) });
    }
    if (items.length) {
      const secLbl = t(sec.labelKey);
      rows.push({ section: (secLbl && secLbl !== sec.labelKey) ? secLbl : (sec.labelKey || sec.key), items });
    }
  }
  return rows;
}

export default function MenuAccessManager() {
  const { t } = useI18n();
  const isDemoMode = IS_DEMO; // [현 차수 P2] 정본 IS_DEMO 사용(데모호스트 운영빌드 시에도 정확)
  const [plans, setPlans] = useState([]);
  const [access, setAccess] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [msg, setMsg] = useState(null);
  const rows = useMemo(() => buildMenuRows(t), [t]);

  const seedAccess = useCallback((planList, dbAccess) => {
    const acc = {};
    for (const p of planList) {
      const pid = p.plan_id;
      acc[pid] = {};
      const fromDb = (dbAccess && dbAccess[pid]) || null;
      for (const sec of rows) for (const it of sec.items) {
        acc[pid][it.menuKey] = (fromDb && (it.menuKey in fromDb))
          ? (fromDb[it.menuKey] ? 1 : 0)
          : defaultByTier(pid, it.menuKey);
      }
    }
    return acc;
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await getJsonAuth('/v424/admin/plans-menu-access');
      const pl = (Array.isArray(r?.plans) ? r.plans : [])
        .map(p => ({ plan_id: p.plan_id, name: p.name || p.plan_id }))
        .filter(p => p.plan_id && p.plan_id !== 'admin' && p.plan_id !== 'demo');
      setPlans(pl);
      setAccess(seedAccess(pl, r?.access));
    } catch (e) {
      setMsg({ kind: 'err', text: (t('menuAccess.loadFail', '권한 매트릭스를 불러오지 못했습니다: ')) + (e?.message || '') });
    } finally { setLoading(false); }
  }, [seedAccess, t]);

  useEffect(() => { load(); }, [load]);

  const toggle = (pid, mk) => {
    if (isDemoMode) return;
    setAccess(prev => ({ ...prev, [pid]: { ...prev[pid], [mk]: prev[pid]?.[mk] ? 0 : 1 } }));
  };

  const applyPolicyDefaults = () => {
    if (isDemoMode) return;
    const acc = {};
    for (const p of plans) {
      acc[p.plan_id] = {};
      for (const sec of rows) for (const it of sec.items) acc[p.plan_id][it.menuKey] = defaultByTier(p.plan_id, it.menuKey);
    }
    setAccess(acc);
    setMsg({ kind: 'info', text: t('menuAccess.policyApplied', '정책 기본값(요금제 등급)으로 채웠습니다. "저장"을 눌러 반영하세요.') });
  };

  const savePlan = async (pid) => {
    if (isDemoMode) { setMsg({ kind: 'err', text: t('marketing.Locker', '데모 모드에서는 저장할 수 없습니다.') }); return; }
    setSaving(pid); setMsg(null);
    try {
      const r = await requestJsonAuth(`/v424/admin/plans/${pid}/menu-access`, 'PUT', { menus: access[pid] || {} });
      if (r?.ok) setMsg({ kind: 'ok', text: `${pid} ${t('menuAccess.saved', '저장됨')} (${r.count ?? 0})` });
      else setMsg({ kind: 'err', text: (t('menuAccess.saveFail', '저장 실패: ')) + (r?.error || r?.detail || '') });
    } catch (e) {
      setMsg({ kind: 'err', text: (t('menuAccess.saveFail', '저장 실패: ')) + (e?.message || '') });
    } finally { setSaving(''); }
  };

  const saveAll = async () => {
    if (isDemoMode) { setMsg({ kind: 'err', text: t('marketing.Locker', '데모 모드에서는 저장할 수 없습니다.') }); return; }
    setSaving('__all__'); setMsg(null);
    let ok = 0, fail = 0;
    for (const p of plans) {
      try {
        const r = await requestJsonAuth(`/v424/admin/plans/${p.plan_id}/menu-access`, 'PUT', { menus: access[p.plan_id] || {} });
        if (r?.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setSaving('');
    setMsg({ kind: fail ? 'err' : 'ok', text: `${t('menuAccess.savedAll', '전체 저장')}: ${ok} ✓${fail ? ` / ${fail} ✗` : ''}` });
  };

  const planColor = (pid) => PLAN_COLORS[pid] || '#6366f1';
  const msgColor = msg ? (msg.kind === 'ok' ? '#10b981' : msg.kind === 'err' ? '#ef4444' : '#3b82f6') : 'transparent';

  return (
    <div style={{ padding: 24, paddingBottom: 60, minHeight: '100vh', background: '#0a101d', color: '#fff' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{t('gNav.menuAccessManager', '플랜별 메뉴 접근 권한')}</h1>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          {t('menuAccess.descV2', '요금제(플랜)별로 어떤 메뉴를 노출할지 제어합니다. 저장 즉시 해당 플랜 사용자에게 반영됩니다(상위 메뉴는 업그레이드 유도).')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={applyPolicyDefaults} disabled={isDemoMode || loading}
          style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)', color: '#c7d2fe', fontWeight: 800, borderRadius: 8, cursor: isDemoMode ? 'not-allowed' : 'pointer', fontSize: 12 }}>
          ✨ {t('menuAccess.applyPolicy', '정책 기본값 적용(요금제 등급)')}
        </button>
        <button onClick={saveAll} disabled={isDemoMode || loading || saving}
          style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: isDemoMode ? 'not-allowed' : 'pointer', fontSize: 12 }}>
          💾 {saving === '__all__' ? t('menuAccess.saving', '저장 중…') : t('menuAccess.saveAll', '전체 저장(배포)')}
        </button>
        <button onClick={load} disabled={loading}
          style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', fontWeight: 700, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
          ↻ {t('menuAccess.reload', '새로고침')}
        </button>
        {isDemoMode && <span style={{ fontSize: 11, color: '#f59e0b' }}>🔒 {t('menuAccess.demoReadonly', '데모 모드: 읽기 전용')}</span>}
        {msg && <span style={{ fontSize: 12, fontWeight: 700, color: msgColor }}>{msg.text}</span>}
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>{t('menuAccess.loading', '권한 매트릭스 불러오는 중…')}</div>
      ) : (
        <div style={{ background: 'var(--surface, #111827)', border: '1px solid var(--border, #1f2937)', borderRadius: 12, padding: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', position: 'sticky', left: 0, background: 'var(--surface, #111827)', minWidth: 220, color: '#e5e7eb' }}>{t('menuAccess.colMenu', '메뉴')}</th>
                {plans.map(p => (
                  <th key={p.plan_id} style={{ padding: '10px 8px', textAlign: 'center', minWidth: 120 }}>
                    <div style={{ fontWeight: 900, color: planColor(p.plan_id), fontSize: 13 }}>{p.name}</div>
                    <button onClick={() => savePlan(p.plan_id)} disabled={isDemoMode || !!saving}
                      style={{ marginTop: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, borderRadius: 6, border: 'none', cursor: isDemoMode ? 'not-allowed' : 'pointer', background: saving === p.plan_id ? '#475569' : 'rgba(16,185,129,0.18)', color: '#6ee7b7' }}>
                      {saving === p.plan_id ? '…' : `💾 ${t('menuAccess.saveBtn2', '저장')}`}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(sec => (
                <React.Fragment key={sec.section}>
                  <tr>
                    <td colSpan={plans.length + 1} style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.08)', fontWeight: 900, color: '#a5b4fc', fontSize: 12, borderTop: '1px solid var(--border, #1f2937)' }}>{sec.section}</td>
                  </tr>
                  {sec.items.map(it => (
                    <tr key={it.menuKey} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 12px', position: 'sticky', left: 0, background: 'var(--surface, #111827)', color: '#e5e7eb' }}>
                        {it.label}
                        <span style={{ marginLeft: 8, fontSize: 9, color: '#64748b' }}>{it.menuKey} · ≥{requiredPlanForMenu(it.menuKey)}</span>
                      </td>
                      {plans.map(p => {
                        const on = !!access[p.plan_id]?.[it.menuKey];
                        return (
                          <td key={p.plan_id} style={{ textAlign: 'center', padding: '8px' }}>
                            <input type="checkbox" checked={on} disabled={isDemoMode}
                              onChange={() => toggle(p.plan_id, it.menuKey)}
                              style={{ width: 16, height: 16, accentColor: planColor(p.plan_id), cursor: isDemoMode ? 'not-allowed' : 'pointer' }} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
