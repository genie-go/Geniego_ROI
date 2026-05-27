import React, { useState, useEffect, useCallback } from "react";
import { getJsonAuth, requestJsonAuth } from "../services/apiClient.js";

/**
 * 169차 P4 완벽 동기화 — admin 저장 후 user 측 sidebar 즉시 갱신.
 * BroadcastChannel + custom event 둘 다 발행 (cross-tab + same-tab).
 * AuthContext.loadMenuAccess listener 가 받음.
 */
const SYNC_CHANNEL = "geniego_menu_access_sync";
function publishMenuAccessSync(payload) {
  try { new BroadcastChannel(SYNC_CHANNEL).postMessage({ type: "menu_access_updated", ts: Date.now(), ...payload }); } catch {}
  try { window.dispatchEvent(new CustomEvent("menu-access-saved", { detail: payload })); } catch {}
}

/**
 * PlanPricing — admin 플랜별 구독요금 설정 (169차 사용자 발견 issue fix).
 *
 * 168차 USD/Paddle 단일 정책 정합:
 *  - 통화 USD 고정 / 카드 결제 전용
 *  - Paddle MoR (가격 source of truth = Paddle dashboard)
 *  - 본 페이지는 plan 정의 (name, features, limits, priceId 매핑) 관리
 *
 * Endpoint:
 *  - GET    /v424/admin/plans
 *  - PUT    /v424/admin/plans/{id}
 *  - DELETE /v424/admin/plans/{id}  (soft, is_active=0)
 *
 * 초기 DB 비어 있을 때 hardcoded 3 plan (starter/pro/enterprise) seed 버튼 제공.
 * 한국어 고정 (DbAdmin / AdminEnvironment 패턴 정합).
 */

const SEED_PLANS = [
  {
    plan_id: 'starter', name: 'Starter', display_order: 10, is_active: true, is_custom_quote: false,
    description: '소규모 팀 · 단일 채널 운영',
    price_usd: 49, price_annual_usd: 39,
    price_id_monthly: '', price_id_annual: '',
    features: ['판매 채널 3개', '창고(WMS) 1개', '마케팅 분석', '팀 멤버 2명', 'API 호출 월 10,000건', '이메일 지원 (48시간 내)'],
    limits: { warehouses: 1, channels: 3, users: 2 },
  },
  {
    plan_id: 'pro', name: 'Pro', display_order: 20, is_active: true, is_custom_quote: false,
    description: '성장 브랜드 · 멀티채널 운영',
    price_usd: 149, price_annual_usd: 119,
    price_id_monthly: '', price_id_annual: '',
    features: ['무제한 판매 채널', '무제한 창고', 'AI 마케팅 인텔리전스', '인플루언서 평가', '상업 송장 자동 생성', '팀 멤버 10명', 'API 호출 월 500,000건', '우선 지원 (8시간 내)'],
    limits: { warehouses: -1, channels: -1, users: 10 },
  },
  {
    plan_id: 'enterprise', name: 'Enterprise', display_order: 30, is_active: true, is_custom_quote: true,
    description: '대규모 운영 · 맞춤 통합',
    price_usd: null, price_annual_usd: null,
    price_id_monthly: '', price_id_annual: '',
    features: ['Pro 플랜 전체 기능', '맞춤 AI 모델 학습', '전담 계정 매니저', '99.9% 가용성 SLA', '무제한 팀 멤버', '무제한 API 호출', '맞춤 통합 & 웹훅', '온프레미스 배포 옵션'],
    limits: { warehouses: -1, channels: -1, users: -1 },
  },
];

function PlanPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [outerTab, setOuterTab] = useState('pricing'); // pricing | permissions | periods
  const [menus, setMenus] = useState([]);
  const [access, setAccess] = useState({});
  const [accessDirty, setAccessDirty] = useState(false);
  // [171차] 기간별 가격 (1/3/6/12개월)
  const [periodPricing, setPeriodPricing] = useState({}); // { plan_id: { 1: {price_usd, discount_pct, paddle_price_id, ...}, 3: {...}, ... } }
  const [periodSaving, setPeriodSaving] = useState(null);
  const PERIODS = [1, 3, 6, 12];
  const PERIOD_LABEL = { 1: '월간 (1개월)', 3: '분기 (3개월)', 6: '반기 (6개월)', 12: '연간 (12개월)' };

  const fetchPlans = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getJsonAuth('/v424/admin/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
    } catch (e) {
      setError(String(e?.message || e));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenuAccess = useCallback(async () => {
    try {
      const data = await getJsonAuth('/v424/admin/plans-menu-access');
      setMenus(Array.isArray(data?.menus) ? data.menus : []);
      setAccess(data?.access && typeof data.access === 'object' ? data.access : {});
      setAccessDirty(false);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  // [171차] 기간별 가격 조회
  const fetchPeriodPricing = useCallback(async () => {
    try {
      const data = await getJsonAuth('/v424/admin/plans-period-pricing');
      setPeriodPricing(data?.pricing && typeof data.pricing === 'object' ? data.pricing : {});
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  // 자동 추천: 월 가격 변경 시 3/6/12개월 자동 계산 (admin이 직접 변경 시 그 값 우선)
  const updatePeriodField = (planId, months, patch) => {
    setPeriodPricing(prev => {
      const planPP = { ...(prev[planId] || {}) };
      const cur = { ...(planPP[months] || {}) };
      const next = { ...cur, ...patch };
      planPP[months] = next;
      // 1m price_usd 변경 시 → 다른 기간 자동 산출 (admin이 해당 기간 price_usd 직접 변경 안 한 경우)
      if (months === 1 && patch.price_usd !== undefined) {
        const base = Number(next.price_usd) || 0;
        if (base > 0) {
          for (const p of [3, 6, 12]) {
            const cfg = planPP[p] || {};
            const d = Number(cfg.discount_pct || 0);
            if (d >= 0 && d < 100) {
              planPP[p] = { ...cfg, price_usd: +(base * (1 - d / 100)).toFixed(2) };
            }
          }
        }
      }
      // 특정 기간의 discount_pct 변경 시 → 그 기간 price_usd 재계산 (1m 가격 기준)
      if (patch.discount_pct !== undefined && months !== 1) {
        const base = Number(planPP[1]?.price_usd) || 0;
        const d = Number(next.discount_pct || 0);
        if (base > 0 && d >= 0 && d < 100) {
          planPP[months] = { ...next, price_usd: +(base * (1 - d / 100)).toFixed(2) };
        }
      }
      return { ...prev, [planId]: planPP };
    });
  };

  const savePeriodPricing = async (planId) => {
    setPeriodSaving(planId);
    try {
      const periods = {};
      for (const m of PERIODS) {
        const cfg = periodPricing[planId]?.[m] || {};
        periods[m] = {
          price_usd: cfg.price_usd ?? null,
          discount_pct: cfg.discount_pct ?? 0,
          paddle_price_id: cfg.paddle_price_id ?? '',
          is_active: cfg.is_active !== false,
        };
      }
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(planId)}/period-pricing`, 'PUT', { periods });
      await fetchPeriodPricing();
      publishMenuAccessSync({ plan_id: planId, source: 'period_pricing_save' });
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setPeriodSaving(null);
    }
  };

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { if (outerTab === 'permissions') fetchMenuAccess(); }, [outerTab, fetchMenuAccess]);
  useEffect(() => { if (outerTab === 'periods') fetchPeriodPricing(); }, [outerTab, fetchPeriodPricing]);

  const toggleMenuAccess = (planId, menuKey) => {
    setAccess(prev => {
      const planAcc = { ...(prev[planId] || {}) };
      planAcc[menuKey] = planAcc[menuKey] ? 0 : 1;
      return { ...prev, [planId]: planAcc };
    });
    setAccessDirty(true);
  };

  const togglePlanAll = (planId, value) => {
    setAccess(prev => {
      const planAcc = {};
      menus.forEach(m => { planAcc[m.menu_key || m.id] = value ? 1 : 0; });
      return { ...prev, [planId]: planAcc };
    });
    setAccessDirty(true);
  };

  const saveAllAccess = async () => {
    setSaving('access');
    try {
      for (const p of plans) {
        const menusForPlan = {};
        menus.forEach(m => {
          const key = m.menu_key || m.id;
          menusForPlan[key] = access[p.plan_id]?.[key] ? 1 : 0;
        });
        await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(p.plan_id)}/menu-access`, 'PUT', { menus: menusForPlan });
      }
      await fetchMenuAccess();
      publishMenuAccessSync({ source: 'menu_access_bulk' });
      alert('메뉴 접근 권한 저장 완료 — 모든 user sidebar 자동 갱신');
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  // [171차] 연 요금 자동 산출 — SEED_PLANS 정합 ($49→$39, $149→$119 = 20% 할인).
  // 정책: 월 요금 × (1 - 할인율/100) = 연 결제 시 월 환산 요금.
  // 결제 통화 USD 고정 (168차 USD 단일 정책 정합 — Paddle MoR).
  const DEFAULT_DISCOUNT_PCT = 20;
  const computeAnnualUsd = (monthly, discountPct) => {
    const m = Number(monthly);
    const d = Number(discountPct);
    if (!Number.isFinite(m) || m <= 0) return null;
    if (!Number.isFinite(d) || d < 0 || d >= 100) return null;
    return +(m * (1 - d / 100)).toFixed(2);
  };

  const updateField = (idx, patch) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const next = { ...p, ...patch };
      if (next.is_custom_quote) return next; // enterprise — 자동 산출 skip
      const monthlyChanged = patch.price_usd !== undefined;
      const discountChanged = patch.discount_pct !== undefined;
      const annualManual = patch.price_annual_usd !== undefined;
      // 월 요금 또는 할인율 변경 + 사용자가 연 요금 직접 변경 안 함 → 자동 산출
      if ((monthlyChanged || discountChanged) && !annualManual) {
        const discount = next.discount_pct ?? DEFAULT_DISCOUNT_PCT;
        next.price_annual_usd = computeAnnualUsd(next.price_usd, discount);
      }
      return next;
    }));
  };

  const updateFeature = (planIdx, fIdx, value) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p;
      const features = [...(p.features || [])];
      features[fIdx] = value;
      return { ...p, features };
    }));
  };

  const addFeature = (planIdx) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: [...(p.features || []), '새 기능 항목'] } : p));
  };

  const removeFeature = (planIdx, fIdx) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: (p.features || []).filter((_, j) => j !== fIdx) } : p));
  };

  const updateLimit = (planIdx, key, val) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, limits: { ...(p.limits || {}), [key]: val === '' ? null : Number(val) } } : p));
  };

  const savePlan = async (plan) => {
    if (!plan.plan_id) return;
    setSaving(plan.plan_id);
    try {
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(plan.plan_id)}`, 'PUT', {
        name: plan.name,
        description: plan.description,
        price_usd: plan.price_usd,
        price_annual_usd: plan.price_annual_usd,
        price_id_monthly: plan.price_id_monthly,
        price_id_annual: plan.price_id_annual,
        features: plan.features || [],
        limits: plan.limits || {},
        display_order: plan.display_order || 0,
        is_active: plan.is_active !== false,
        is_custom_quote: !!plan.is_custom_quote,
      });
      await fetchPlans();
      publishMenuAccessSync({ plan_id: plan.plan_id, source: 'plan_save' });
      alert(`${plan.name} 저장 완료 (sidebar 자동 갱신)`);
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  const seedDefaults = async () => {
    if (!window.confirm('초기 3 플랜 (Starter/Pro/Enterprise) 을 등록합니다. 진행할까요?')) return;
    for (const p of SEED_PLANS) {
      try {
        await requestJsonAuth(`/v424/admin/plans/${p.plan_id}`, 'PUT', p);
      } catch (e) { console.error('seed', p.plan_id, e); }
    }
    await fetchPlans();
    publishMenuAccessSync({ source: 'seed' });
    alert('초기 시드 완료 (sidebar 자동 갱신)');
  };

  const archivePlan = async (plan) => {
    if (!window.confirm(`${plan.name} 을 비활성화합니다. 진행할까요?`)) return;
    try {
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(plan.plan_id)}`, 'DELETE');
      await fetchPlans();
    } catch (e) {
      alert(`비활성화 실패: ${e?.message || e}`);
    }
  };

  const cardStyle = {
    borderRadius: 14, padding: '16px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  };
  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)', color: 'var(--text-1)',
    fontSize: 13, fontFamily: 'inherit',
  };

  const plan = plans[activePlanIdx];

  return (
    <div style={{ padding: 24, minHeight: '100%', color: 'var(--text-1)' }}>
      <div style={{
        borderRadius: 18, padding: '28px 32px', marginBottom: 22,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(16,185,129,0.06))',
        border: '1px solid rgba(34,197,94,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }}>💳</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>플랜별 구독요금 설정</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                USD 단일 · Paddle MoR · 카드 결제 전용 (168차 N-152-F 정책)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.open('https://vendors.paddle.com/products-v2', '_blank')} style={{
              padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>🔗 Paddle Dashboard</button>
            {plans.length === 0 && !loading && (
              <button onClick={seedDefaults} style={{
                padding: '9px 14px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}>🌱 초기 3 플랜 등록</button>
            )}
            <button onClick={fetchPlans} style={{
              padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>🔄 새로고침</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)',
          color: '#f87171', fontSize: 12,
        }}>⚠ 플랜 조회 실패 — {error}</div>
      )}

      {/* outer tab: pricing | permissions */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[
          { id: 'pricing',     label: '💳 요금·상세' },
          { id: 'permissions', label: '🔐 메뉴 접근 권한' },
          { id: 'periods', label: '📅 기간별 구독 가격 (1/3/6/12개월)' },
        ].map(tb => (
          <button key={tb.id} onClick={() => setOuterTab(tb.id)} style={{
            padding: '12px 22px', border: 'none', background: 'transparent',
            color: outerTab === tb.id ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: 13, fontWeight: outerTab === tb.id ? 800 : 600, cursor: 'pointer',
            borderBottom: outerTab === tb.id ? '2px solid #22c55e' : '2px solid transparent',
            marginBottom: -1,
          }}>{tb.label}</button>
        ))}
      </div>

      {outerTab === 'permissions' && (
        <PermissionsMatrix
          plans={plans} menus={menus} access={access}
          toggleMenuAccess={toggleMenuAccess} togglePlanAll={togglePlanAll}
          saveAllAccess={saveAllAccess} saving={saving === 'access'} dirty={accessDirty}
        />
      )}

      {outerTab === 'periods' && (
        <PeriodPricingMatrix
          plans={plans} periodPricing={periodPricing} periods={PERIODS} periodLabel={PERIOD_LABEL}
          updatePeriodField={updatePeriodField} savePeriodPricing={savePeriodPricing}
          periodSaving={periodSaving}
        />
      )}

      {outerTab === 'pricing' && loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
          플랜 목록 로딩 중…
        </div>
      )}

      {outerTab === 'pricing' && !loading && plans.length === 0 && !error && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>등록된 플랜이 없습니다</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
            상단 "초기 3 플랜 등록" 으로 Starter/Pro/Enterprise 기본값을 생성하세요
          </div>
        </div>
      )}

      {outerTab === 'pricing' && !loading && plans.length > 0 && (
        <>
          <div style={{
            display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {plans.map((p, i) => (
              <button key={p.plan_id} onClick={() => setActivePlanIdx(i)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12,
                background: activePlanIdx === i ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'transparent',
                color: activePlanIdx === i ? '#fff' : 'var(--text-2)',
              }}>{p.name || p.plan_id}</button>
            ))}
          </div>

          {plan && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start',
            }}>
              {/* 좌: 편집 폼 */}
              <div style={{ ...cardStyle, padding: '22px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <Field label="Plan ID (immutable)"><input value={plan.plan_id} disabled style={{ ...inputStyle, opacity: 0.6 }} /></Field>
                  <Field label="이름"><input value={plan.name || ''} onChange={e => updateField(activePlanIdx, { name: e.target.value })} style={inputStyle} /></Field>
                </div>
                <Field label="설명"><textarea value={plan.description || ''} onChange={e => updateField(activePlanIdx, { description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>

                {/* [171차] 통화 USD 고정 — 168차 USD 단일 정책 정합 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
                  <Field label="월 요금 (USD $)">
                    <input type="number" step="0.01" min="0" value={plan.price_usd ?? ''} onChange={e => updateField(activePlanIdx, { price_usd: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} disabled={plan.is_custom_quote} />
                  </Field>
                  <Field label="연간 할인율 (%)">
                    <input type="number" step="1" min="0" max="80" value={plan.discount_pct ?? DEFAULT_DISCOUNT_PCT} onChange={e => updateField(activePlanIdx, { discount_pct: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} disabled={plan.is_custom_quote} placeholder="20" />
                  </Field>
                  <Field label="연 요금 (USD $/월 환산, 자동 산출)">
                    <input type="number" step="0.01" min="0" value={plan.price_annual_usd ?? ''} onChange={e => updateField(activePlanIdx, { price_annual_usd: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} disabled={plan.is_custom_quote} />
                  </Field>
                </div>
                {!plan.is_custom_quote && plan.price_usd > 0 && plan.price_annual_usd > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
                    💡 월 ${plan.price_usd} × 12 = ${(plan.price_usd * 12).toFixed(2)}/년 · 연간 결제 시 ${plan.price_annual_usd}/월 (총 ${(plan.price_annual_usd * 12).toFixed(2)}/년) · 절약 <strong style={{ color: '#22c55e' }}>${(plan.price_usd * 12 - plan.price_annual_usd * 12).toFixed(2)}</strong> ({(plan.discount_pct ?? DEFAULT_DISCOUNT_PCT)}%)
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <Field label="Paddle priceId (월간)"><input value={plan.price_id_monthly || ''} onChange={e => updateField(activePlanIdx, { price_id_monthly: e.target.value })} placeholder="pri_xxxxxxxxxx" style={inputStyle} /></Field>
                  <Field label="Paddle priceId (연간)"><input value={plan.price_id_annual || ''} onChange={e => updateField(activePlanIdx, { price_id_annual: e.target.value })} placeholder="pri_xxxxxxxxxx" style={inputStyle} /></Field>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>기능 목록</div>
                  {(plan.features || []).map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input value={f} onChange={e => updateFeature(activePlanIdx, i, e.target.value)} style={inputStyle} />
                      <button onClick={() => removeFeature(activePlanIdx, i)} style={{
                        padding: '0 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)',
                        background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 12, cursor: 'pointer',
                      }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => addFeature(activePlanIdx)} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.3)',
                    background: 'transparent', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 4,
                  }}>＋ 기능 추가</button>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>한도 (Limits) · -1 = 무제한</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {['warehouses', 'channels', 'users'].map(key => (
                      <Field key={key} label={key}>
                        <input type="number" value={plan.limits?.[key] ?? ''} onChange={e => updateLimit(activePlanIdx, key, e.target.value)} style={inputStyle} />
                      </Field>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 22, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_custom_quote || false} onChange={e => updateField(activePlanIdx, { is_custom_quote: e.target.checked })} /> 맞춤 견적 (Enterprise)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_active !== false} onChange={e => updateField(activePlanIdx, { is_active: e.target.checked })} /> 활성
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_recommended === true || plan.is_recommended === 1} onChange={e => updateField(activePlanIdx, { is_recommended: e.target.checked ? 1 : 0 })} /> ⭐ 추천 플랜 (Most Popular 배지)
                  </label>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => archivePlan(plan)} style={{
                    padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>비활성화</button>
                  <button onClick={() => savePlan(plan)} disabled={saving === plan.plan_id} style={{
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                    color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    opacity: saving === plan.plan_id ? 0.6 : 1,
                  }}>{saving === plan.plan_id ? '저장 중…' : '💾 저장'}</button>
                </div>
              </div>

              {/* 우: 미리보기 */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>실시간 미리보기</div>
                <PreviewCard plan={plan} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

function PermissionsMatrix({ plans, menus, access, toggleMenuAccess, togglePlanAll, saveAllAccess, saving, dirty }) {
  if (!plans.length) {
    return (
      <div style={{
        padding: 40, borderRadius: 14, textAlign: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        color: 'var(--text-3)', fontSize: 13,
      }}>플랜이 없습니다. 먼저 "요금·상세" 탭에서 플랜을 등록하세요.</div>
    );
  }
  if (!menus.length) {
    return (
      <div style={{
        padding: 40, borderRadius: 14, textAlign: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        color: 'var(--text-3)', fontSize: 13,
      }}>menu_tree 가 비어 있습니다. 169차 P1 seed migration 적용 필요.</div>
    );
  }

  const planCounts = plans.map(p => {
    const acc = access[p.plan_id] || {};
    return menus.filter(m => acc[m.menu_key || m.id]).length;
  });

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          각 플랜이 사용 가능한 메뉴를 체크. user 의 plan 에 따라 sidebar 에 표시되는 메뉴가 결정됩니다.
        </div>
        <button onClick={saveAllAccess} disabled={saving || !dirty} style={{
          padding: '9px 22px', borderRadius: 9, border: 'none',
          background: dirty ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'rgba(255,255,255,0.06)',
          color: dirty ? '#fff' : 'var(--text-3)',
          fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default',
          opacity: saving ? 0.6 : 1,
        }}>{saving ? '저장 중…' : (dirty ? '💾 전체 저장' : '저장됨')}</button>
      </div>

      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `2fr repeat(${plans.length}, 1fr)`,
          background: 'rgba(99,102,241,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, fontWeight: 800, color: 'var(--text-2)',
        }}>
          <div style={{ padding: '12px 16px' }}>메뉴</div>
          {plans.map((p, i) => (
            <div key={p.plan_id} style={{ padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-1)' }}>{p.name || p.plan_id}</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>
                {planCounts[i]} / {menus.length}
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                <button onClick={() => togglePlanAll(p.plan_id, true)} style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer',
                }}>all</button>
                <button onClick={() => togglePlanAll(p.plan_id, false)} style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(248,113,113,0.10)', color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                }}>none</button>
              </div>
            </div>
          ))}
        </div>
        {menus.map((m, mi) => {
          const key = m.menu_key || m.id;
          return (
            <div key={m.id || m.menu_key} style={{
              display: 'grid',
              gridTemplateColumns: `2fr repeat(${plans.length}, 1fr)`,
              borderBottom: mi < menus.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: mi % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
            }}>
              <div style={{ padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 10, fontFamily: 'monospace' }}>{key}</span>
                {m.route && <span style={{ color: 'var(--text-3)', fontSize: 10 }}>· {m.route}</span>}
              </div>
              {plans.map(p => {
                const checked = !!access[p.plan_id]?.[key];
                return (
                  <div key={p.plan_id} style={{
                    padding: '6px 12px', textAlign: 'center', cursor: 'pointer',
                  }} onClick={() => toggleMenuAccess(p.plan_id, key)}>
                    <input type="checkbox" checked={checked} readOnly style={{
                      cursor: 'pointer', accentColor: '#22c55e', width: 16, height: 16,
                    }} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// [171차] 기간별 가격 매트릭스 — 1/3/6/12개월 × plan, admin 자유 설정 + 자동 추천
function PeriodPricingMatrix({ plans, periodPricing, periods, periodLabel, updatePeriodField, savePeriodPricing, periodSaving }) {
  const inputS = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)', color: 'inherit', fontSize: 12, fontFamily: 'inherit',
  };
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 13, color: 'var(--text-2)' }}>
        💡 <strong>구독 기간별 가격 매트릭스</strong> — 결제 통화 USD 고정. 1개월 가격 입력 시 3/6/12개월 자동 산출 (할인율 기반). 할인율과 각 기간 가격은 admin이 자유롭게 조정 가능.
      </div>
      {plans.map(plan => {
        const isCustom = plan.is_custom_quote;
        const pp = periodPricing[plan.plan_id] || {};
        return (
          <div key={plan.plan_id} style={{
            padding: '18px 22px', borderRadius: 14,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{plan.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{plan.plan_id}</span>
              {isCustom && <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(251,146,60,0.15)', color: '#fb923c', fontSize: 10, fontWeight: 800 }}>맞춤 견적</span>}
              <div style={{ flex: 1 }} />
              <button onClick={() => savePeriodPricing(plan.plan_id)} disabled={periodSaving === plan.plan_id} style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff',
                fontSize: 12, fontWeight: 800, cursor: 'pointer', opacity: periodSaving === plan.plan_id ? 0.6 : 1,
              }}>{periodSaving === plan.plan_id ? '저장 중…' : '💾 저장'}</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', width: '20%' }}>기간</th>
                  <th style={{ padding: '8px 6px', width: '15%' }}>월 환산 USD $</th>
                  <th style={{ padding: '8px 6px', width: '12%' }}>할인율 %</th>
                  <th style={{ padding: '8px 6px', width: '15%' }}>총 결제액 USD $</th>
                  <th style={{ padding: '8px 6px', width: '28%' }}>Paddle priceId</th>
                  <th style={{ padding: '8px 6px', width: '10%' }}>활성</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(months => {
                  const cfg = pp[months] || {};
                  const total = cfg.price_usd != null ? (cfg.price_usd * months).toFixed(2) : '—';
                  return (
                    <tr key={months} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{periodLabel[months]}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <input type="number" step="0.01" min="0" disabled={isCustom}
                          value={cfg.price_usd ?? ''}
                          onChange={e => updatePeriodField(plan.plan_id, months, { price_usd: e.target.value === '' ? null : Number(e.target.value) })}
                          style={inputS} />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input type="number" step="1" min="0" max="80" disabled={isCustom}
                          value={cfg.discount_pct ?? 0}
                          onChange={e => updatePeriodField(plan.plan_id, months, { discount_pct: e.target.value === '' ? 0 : Number(e.target.value) })}
                          style={inputS} />
                      </td>
                      <td style={{ padding: '8px 6px', color: '#22c55e', fontWeight: 700 }}>${total}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <input type="text" value={cfg.paddle_price_id ?? ''} placeholder="pri_xxxxxxxxxx"
                          onChange={e => updatePeriodField(plan.plan_id, months, { paddle_price_id: e.target.value })}
                          style={inputS} />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <input type="checkbox" checked={cfg.is_active !== false}
                          onChange={e => updatePeriodField(plan.plan_id, months, { is_active: e.target.checked })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function PreviewCard({ plan }) {
  const isCustom = plan.is_custom_quote;
  const isRecommended = plan.is_recommended === true || plan.is_recommended === 1;
  return (
    <div style={{
      position: 'relative',
      padding: '32px 26px', borderRadius: 18,
      background: isRecommended
        ? 'linear-gradient(155deg, rgba(99,102,241,0.18), rgba(79,142,247,0.08))'
        : 'linear-gradient(155deg, rgba(34,197,94,0.10), rgba(16,185,129,0.04))',
      border: isRecommended ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(34,197,94,0.25)',
    }}>
      {isRecommended && (
        <div style={{
          position: 'absolute', top: -12, right: 16,
          padding: '4px 12px', borderRadius: 20,
          background: 'linear-gradient(135deg,#6366f1,#4f8ef7)',
          color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>⭐ MOST POPULAR</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: isRecommended ? '#6366f1' : '#22c55e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 22, minHeight: 32 }}>{plan.description || '—'}</div>
      <div style={{ marginBottom: 22 }}>
        {isCustom ? (
          <span style={{ fontSize: 32, fontWeight: 900 }}>맞춤 견적</span>
        ) : (
          <>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-3)' }}>USD </span>
            <span style={{ fontSize: 44, fontWeight: 900 }}>${plan.price_usd ?? '—'}</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>/월</span>
            {plan.price_annual_usd != null && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>연간 결제 시 ${plan.price_annual_usd}/월 (총 ${(plan.price_annual_usd * 12).toFixed(2)}/년)</div>
            )}
          </>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {(plan.features || []).slice(0, 8).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ color: '#22c55e' }}>✓</span>{f}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Paddle priceId</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-2)' }}>
          M: {plan.price_id_monthly || '미설정'}<br />
          A: {plan.price_id_annual || '미설정'}
        </div>
      </div>
    </div>
  );
}

export default PlanPricing;
