import React, { useState, useEffect, useCallback } from "react";
import { getJsonAuth, requestJsonAuth } from "../services/apiClient.js";

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
    features: ['3 sales channels', '1 warehouse (WMS)', 'Marketing analytics', '2 team members', '10,000 API calls/month', 'Email support (48h)'],
    limits: { warehouses: 1, channels: 3, users: 2 },
  },
  {
    plan_id: 'pro', name: 'Pro', display_order: 20, is_active: true, is_custom_quote: false,
    description: '성장 브랜드 · 멀티채널 운영',
    price_usd: 149, price_annual_usd: 119,
    price_id_monthly: '', price_id_annual: '',
    features: ['Unlimited channels', 'Unlimited warehouses', 'AI Marketing Intelligence', 'Influencer evaluation', 'Commercial invoice auto-gen', '10 team members', '500,000 API calls/month', 'Priority support (8h)'],
    limits: { warehouses: -1, channels: -1, users: 10 },
  },
  {
    plan_id: 'enterprise', name: 'Enterprise', display_order: 30, is_active: true, is_custom_quote: true,
    description: '대규모 운영 · 맞춤 통합',
    price_usd: null, price_annual_usd: null,
    price_id_monthly: '', price_id_annual: '',
    features: ['Everything in Pro', 'Custom AI model training', 'Dedicated account manager', 'SLA 99.9% uptime', 'Unlimited team members', 'Unlimited API calls', 'Custom integrations & webhooks', 'On-premise deployment option'],
    limits: { warehouses: -1, channels: -1, users: -1 },
  },
];

function PlanPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [activePlanIdx, setActivePlanIdx] = useState(0);

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

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const updateField = (idx, patch) => {
    setPlans(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
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
      alert(`${plan.name} 저장 완료`);
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
    alert('초기 시드 완료');
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

      {loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
          플랜 목록 로딩 중…
        </div>
      )}

      {!loading && plans.length === 0 && !error && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>등록된 플랜이 없습니다</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
            상단 "초기 3 플랜 등록" 으로 Starter/Pro/Enterprise 기본값을 생성하세요
          </div>
        </div>
      )}

      {!loading && plans.length > 0 && (
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <Field label="월 요금 (USD)">
                    <input type="number" step="0.01" value={plan.price_usd ?? ''} onChange={e => updateField(activePlanIdx, { price_usd: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} disabled={plan.is_custom_quote} />
                  </Field>
                  <Field label="연 요금 (USD/월 환산)">
                    <input type="number" step="0.01" value={plan.price_annual_usd ?? ''} onChange={e => updateField(activePlanIdx, { price_annual_usd: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} disabled={plan.is_custom_quote} />
                  </Field>
                </div>

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

                <div style={{ display: 'flex', gap: 10, marginTop: 22, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_custom_quote || false} onChange={e => updateField(activePlanIdx, { is_custom_quote: e.target.checked })} /> Custom Quote (Enterprise)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_active !== false} onChange={e => updateField(activePlanIdx, { is_active: e.target.checked })} /> Active
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

function PreviewCard({ plan }) {
  const isCustom = plan.is_custom_quote;
  return (
    <div style={{
      padding: '32px 26px', borderRadius: 18,
      background: 'linear-gradient(155deg, rgba(34,197,94,0.10), rgba(16,185,129,0.04))',
      border: '1px solid rgba(34,197,94,0.25)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 22, minHeight: 32 }}>{plan.description || '—'}</div>
      <div style={{ marginBottom: 22 }}>
        {isCustom ? (
          <span style={{ fontSize: 32, fontWeight: 900 }}>Custom</span>
        ) : (
          <>
            <span style={{ fontSize: 44, fontWeight: 900 }}>${plan.price_usd ?? '—'}</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>/mo</span>
            {plan.price_annual_usd != null && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>연간 결제 시 ${plan.price_annual_usd}/mo (총 ${plan.price_annual_usd * 12}/yr)</div>
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
