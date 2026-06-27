import React, { useEffect, useState, useCallback } from 'react';
import BeginnerGuide from '../components/BeginnerGuide.jsx';
import { GUIDE } from '../lib/guideSpecs.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import { useToast } from '../components/ToastProvider.jsx';
import { IS_DEMO } from '../utils/demoEnv';
import { bt } from '../utils/billingI18n';
import CrossLinkBar from '../components/CrossLinkBar.jsx';
import PeriodFilterBar, { inPeriodAny } from '../components/common/PeriodFilterBar.jsx'; // [현 차수] 결제내역 기간조회
import { useGlobalData } from '../context/GlobalDataContext.jsx'; // [현 차수] 데모 결제내역 파생

// [현 차수] 데모 결제/청구 내역 파생 — v427/billing/ledger 부재 시 주문 광고비를 월×채널 청구행으로 집계(기간 반응).
const _LEDGER_CH = { meta: 'Meta Ads', google: 'Google Ads', naver: 'Naver', naver_sa: 'Naver SA', coupang: 'Coupang', tiktok: 'TikTok', kakao: 'Kakao', oliveyoung: 'Olive Young', '11st': '11번가', gmarket: 'G마켓' };
function deriveDemoLedger(orders, channelBudgets) {
  const by = {};
  (orders || []).forEach(o => {
    if (/cancel|취소/i.test(String(o.status || ''))) return;
    const ym = o.month || (o.atISO ? String(o.atISO).slice(0, 7) : null); if (!ym) return;
    const ch = o.ch || o.channel || 'meta';
    const amt = Number(o.adFee || o.fee || Math.round(Number(o.total || 0) * 0.03));
    const k = ym + '|' + ch;
    if (!by[k]) by[k] = { id: k, ym, channel: ch, channel_name: _LEDGER_CH[ch] || ch, amount: 0, status: 'charged', created_at: ym + '-15' };
    by[k].amount += amt;
  });
  return Object.values(by).map(r => ({ ...r, amount: Math.round(r.amount) })).filter(r => r.amount > 0).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.amount - a.amount);
}

// [현 차수] 결제·청구 관련 화면 교차링크(비파괴 통합, 사용자 접근 가능 페이지만)
const PAY_LINKS = [
  { to: '/payment-methods', icon: '💳', label: '결제수단' },
  { to: '/auto-marketing', icon: '🚀', label: '마케팅 자동화' },
  { to: '/app-pricing', icon: '🧾', label: '구독 플랜' },
];

const fmtKRW = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');
const tok = () => localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

export default function PaymentMethods() {
  const { lang } = useI18n();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const tr = useCallback((k) => bt(k, lang), [lang]);

  const { orders, channelBudgets } = useGlobalData(); // [현 차수] 데모 결제내역 파생용
  const [methods, setMethods] = useState([]);
  const [budget, setBudget] = useState(null);
  const [ledger, setLedger] = useState([]); // [현 차수] 결제/청구 내역
  const [period, setPeriod] = useState({ preset: 'all' });
  const [cfg, setCfg] = useState({ customer_key: '', client_key: '', configured: false });
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(() => {
    fetch('/api/v427/billing/methods', { headers: authHeaders() }).then(r => r.json())
      .then(d => { if (d && d.ok) setMethods(d.methods || []); }).catch(() => {});
    fetch('/api/v427/billing/budget-status', { headers: authHeaders() }).then(r => r.json())
      .then(d => { if (d && d.ok) setBudget(d); }).catch(() => {});
    fetch('/api/v427/billing/customer-key', { headers: authHeaders() }).then(r => r.json())
      .then(d => { if (d && d.ok) setCfg({ customer_key: d.customer_key || '', client_key: d.client_key || '', configured: !!d.configured }); }).catch(() => {});
    // [현 차수] 결제/청구 내역 — 운영은 기존 ledger 엔드포인트, 데모는 주문 광고비 파생(기간조회 대상)
    if (IS_DEMO) { setLedger(deriveDemoLedger(orders, channelBudgets)); }
    else fetch('/api/v427/billing/ledger', { headers: authHeaders() }).then(r => r.json())
      .then(d => { if (d && d.ok) setLedger(d.rows || d.ledger || []); }).catch(() => {});
  }, [orders, channelBudgets]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Toss requestBillingAuth 리다이렉트 복귀 처리: ?bauth=1&authKey=..&customerKey=..
  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (!q.get('bauth')) return;
    if (q.get('bauth') === 'fail') {
      addToast(tr('regFail'), 'warning');
      navigate('/payment-methods', { replace: true });
      return;
    }
    const authKey = q.get('authKey'); const customerKey = q.get('customerKey');
    if (authKey && customerKey) {
      setBusy(true);
      fetch('/api/v427/billing/methods/issue', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ authKey, customerKey }) })
        .then(r => r.json())
        .then(d => {
          if (d && d.ok) { addToast(tr('regSuccess'), 'success'); }
          else if (d && d.needs_config) { addToast(tr('notConfigured'), 'warning'); }
          else { addToast((d && d.message) || (d && d.error) || tr('regFail'), 'warning'); }
        })
        .catch(() => addToast(tr('regFail'), 'warning'))
        .finally(() => { setBusy(false); navigate('/payment-methods', { replace: true }); setTimeout(loadAll, 300); });
    }
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [loc.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTossJs = () => new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve();
    const s = document.createElement('script');
    s.src = 'https://js.tosspayments.com/v1/payment';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('toss sdk load failed'));
    document.head.appendChild(s);
  });

  const onRegister = async () => {
    if (IS_DEMO) { addToast(tr('demoMsg'), 'info', 6000); return; }
    if (!cfg.configured || !cfg.client_key) { addToast(tr('notConfigured'), 'warning', 6000); return; }
    if (!cfg.customer_key) { addToast(tr('regFail'), 'warning'); return; }
    try {
      setBusy(true);
      await loadTossJs();
      const tp = window.TossPayments(cfg.client_key);
      await tp.requestBillingAuth('카드', {
        customerKey: cfg.customer_key,
        successUrl: `${window.location.origin}/payment-methods?bauth=1`,
        failUrl: `${window.location.origin}/payment-methods?bauth=fail`,
      });
      // 리다이렉트 발생 — 이후는 복귀 useEffect 가 처리
    } catch (e) {
      setBusy(false);
      addToast(tr('regFail'), 'warning');
    }
  };

  const onSetDefault = async (id) => {
    if (IS_DEMO) { addToast(tr('demoMsg'), 'info'); return; }
    const r = await fetch(`/api/v427/billing/methods/${id}/default`, { method: 'POST', headers: authHeaders() }).then(x => x.json()).catch(() => null);
    if (r && r.ok) { addToast(tr('defDone'), 'success'); loadAll(); }
    else addToast((r && (r.message || r.error)) || tr('regFail'), 'warning');
  };

  const onDelete = async (id) => {
    if (IS_DEMO) { addToast(tr('demoMsg'), 'info'); return; }
    const r = await fetch(`/api/v427/billing/methods/${id}`, { method: 'DELETE', headers: authHeaders() }).then(x => x.json()).catch(() => null);
    if (r && r.ok) { addToast(tr('delDone'), 'success'); loadAll(); }
    else addToast((r && (r.message || r.error)) || tr('regFail'), 'warning');
  };

  const card = { background: '#fff', border: '1px solid #e9eef5', borderRadius: 18, padding: 24, boxShadow: '0 4px 20px rgba(15,23,42,0.05)' };
  const cap = budget ? Number(budget.monthly_budget || 0) : 0;
  const charged = budget ? Number(budget.mtd_charged || 0) : 0;
  const remaining = budget ? Number(budget.remaining || 0) : 0;
  const pct = cap > 0 ? Math.min(100, Math.round(charged / cap * 100)) : 0;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px', color: '#0f172a', fontFamily: "'Pretendard','Inter',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>💳 {tr('pageTitle')}</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0, maxWidth: 760 }}>{tr('pageDesc')}</p>
      </div>

      <CrossLinkBar links={PAY_LINKS} note="결제·청구 관련" />
      <div style={{ marginBottom: 18 }}><BeginnerGuide spec={GUIDE.paymentMethods} /></div>

      {IS_DEMO && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: 13, marginBottom: 18 }}>
          ⓘ {tr('demoMsg')}
        </div>
      )}
      {!IS_DEMO && !cfg.configured && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 13, marginBottom: 18 }}>
          ⚠ {tr('notConfigured')}
        </div>
      )}

      {/* 월 예산 청구 현황 */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>{tr('budgetTitle')} <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 12 }}>({budget ? budget.ym : ''})</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 16 }}>
          {[
            { l: tr('budgetCap'), v: fmtKRW(cap), c: '#4f46e5' },
            { l: tr('budgetCharged'), v: fmtKRW(charged), c: '#dc2626' },
            { l: tr('budgetRemaining'), v: fmtKRW(remaining), c: '#059669' },
          ].map((b, i) => (
            <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>{b.l}</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: b.c, letterSpacing: -0.5 }}>{b.v}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 8, borderRadius: 99, background: '#eef2f7', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#dc2626' : 'linear-gradient(90deg,#4f46e5,#7c3aed)', transition: 'width .4s' }} />
        </div>
        {budget && budget.cap_hit && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>⛔ {tr('capHit')}</div>
        )}
      </div>

      {/* [현 차수] 결제/청구 내역 — 기간 설정 후 조회(누락 기능 신설). 운영=v427/billing/ledger, 데모=주문 광고비 파생. */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🧾 결제/청구 내역</div>
          <PeriodFilterBar value={period} onChange={setPeriod} />
        </div>
        {(() => {
          const rows = (ledger || []).filter(r => inPeriodAny(r, period, ['created_at', 'ym', 'charged_at']));
          const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
          if (!rows.length) return <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>선택 기간의 결제/청구 내역이 없습니다.</div>;
          return (
            <>
              <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>합계 <strong style={{ color: '#4f46e5', fontSize: 14 }}>{fmtKRW(total)}</strong> · {rows.length}건</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ borderBottom: '1px solid #eef2f7', color: '#94a3b8', fontSize: 11, textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>청구월</th><th style={{ padding: '8px 10px' }}>채널</th><th style={{ padding: '8px 10px', textAlign: 'right' }}>금액</th><th style={{ padding: '8px 10px' }}>상태</th>
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 200).map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f6f8fb' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#475569' }}>{r.ym || (r.created_at || '').slice(0, 7)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{r.channel_name || r.channel}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{fmtKRW(r.amount)}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: r.status === 'charged' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', color: r.status === 'charged' ? '#16a34a' : '#a16207' }}>{r.status === 'charged' ? '청구완료' : (r.status || '대기')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </div>

      {/* 등록 카드 목록 */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{tr('card')}</div>
          <button onClick={onRegister} disabled={busy}
            data-onboard-cta="pay-method" data-onboard-hint={tr('onboardHint', '여기서 광고비 결제 카드를 등록하세요')} style={{
            padding: '10px 22px', borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer',
            background: busy ? '#cbd5e1' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 13,
            boxShadow: '0 6px 18px rgba(79,70,229,0.26)'
          }}>{busy ? tr('processing') : `＋ ${tr('registerBtn')}`}</button>
        </div>

        {methods.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13.5 }}>{tr('noCard')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {methods.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #eef2f7', flexWrap: 'wrap' }}>
                <div style={{ width: 44, height: 30, borderRadius: 6, background: 'linear-gradient(135deg,#1e293b,#475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    {(m.card_issuer || tr('card'))} •••• {m.card_last4 || '****'}
                    {Number(m.is_default) === 1 && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: 99 }}>{tr('defaultBadge')}</span>}
                  </div>
                  {m.created_at && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>{tr('registeredAt')}: {String(m.created_at).slice(0, 10)}</div>}
                </div>
                {Number(m.is_default) !== 1 && Number(m.id) > 0 && (
                  <button onClick={() => onSetDefault(m.id)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#fff', color: '#4f46e5', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{tr('setDefaultBtn')}</button>
                )}
                {Number(m.id) > 0 && (
                  <button onClick={() => onDelete(m.id)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{tr('deleteBtn')}</button>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 11.5, color: '#94a3b8' }}>🔒 {tr('secureNote')}</div>
      </div>

      {/* 작동 방식 */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>{tr('howTitle')}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {['how1', 'how2', 'how3', 'how4'].map((k, i) => (
            <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: '#eef2ff', color: '#4f46e5', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              {tr(k)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={() => navigate('/auto-marketing')} style={{ padding: '11px 26px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>🚀 {tr('gotoMarketing')}</button>
      </div>
    </div>
  );
}
