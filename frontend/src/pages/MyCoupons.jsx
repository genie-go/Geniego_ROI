import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';
import { useAuth } from '../auth/AuthContext.jsx'; // [282차 R2] 쿠폰 등록 후 플랜/메뉴 즉시 갱신

// [259차] 과거 전체 하드코딩 가짜 셸(KPI 8/5/2/14·죽은 "Create New" 탭·백엔드 미배선)이었음.
//   실 엔드포인트 GET /v423/coupons/mine(UserAdmin::myCoupons, 세션) 배선 + 코드 등록(redeem).
//   데모는 체험용 샘플(IS_DEMO 게이트), 운영은 실 보유 쿠폰만(가짜 미노출).
const DEMO_COUPONS = [
  { code: 'WELCOME30', plan: 'growth', duration_days: 30, max_uses: 1, use_count: 0, is_revoked: 0, created_at: '2026-06-01T00:00:00Z' },
  { code: 'PRO60FREE', plan: 'pro', duration_days: 60, max_uses: 1, use_count: 0, is_revoked: 0, created_at: '2026-06-10T00:00:00Z' },
  { code: 'LOYALTY14', plan: 'starter', duration_days: 14, max_uses: 3, use_count: 2, is_revoked: 0, created_at: '2026-05-20T00:00:00Z' },
];

export default function MyCoupons() {
  const { t } = useI18n();
  const { refreshPlan } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getJsonAuth('/api/v423/coupons/mine');
      const rows = Array.isArray(d?.coupons) ? d.coupons : [];
      // 운영=실 데이터만. 데모는 실 데이터가 없으면 체험 샘플로 보강.
      setCoupons(rows.length ? rows : (IS_DEMO ? DEMO_COUPONS : []));
    } catch {
      setCoupons(IS_DEMO ? DEMO_COUPONS : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // [282차 R3 추천인 제도] 내 추천코드/실적 — 구독회원만 코드 발급됨.
  const [refCode, setRefCode] = useState(null);        // 코드 문자열
  const [refEligible, setRefEligible] = useState(null); // true/false/null
  const [refStats, setRefStats] = useState({ referred_count: 0, rewarded_count: 0 });
  const [refCopied, setRefCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getJsonAuth('/api/auth/referral/my-code');
        if (!alive) return;
        if (d && d.ok && d.eligible) { setRefCode(d.code); setRefEligible(true); }
        else setRefEligible(false);
        const s = await getJsonAuth('/api/auth/referral/stats');
        if (alive && s && s.ok) setRefStats({ referred_count: s.referred_count || 0, rewarded_count: s.rewarded_count || 0 });
      } catch { if (alive) setRefEligible(false); }
    })();
    return () => { alive = false; };
  }, []);
  const refLink = refCode ? `${window.location.origin}/login?ref=${encodeURIComponent(refCode)}` : '';
  const copyRef = async () => {
    try { await navigator.clipboard.writeText(refCode || ''); setRefCopied(true); setTimeout(() => setRefCopied(false), 1800); } catch {}
  };

  const usable = (c) => !Number(c.is_revoked) && (Number(c.use_count) || 0) < (Number(c.max_uses) || 1);
  const kpis = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(usable).length;
    const used = coupons.reduce((s, c) => s + (Number(c.use_count) || 0), 0);
    const unavailable = coupons.filter(c => !usable(c)).length;
    return [
      { emoji: '🎟️', label: t('myCoupons.total', '보유 쿠폰'), val: total },
      { emoji: '✅', label: t('myCoupons.active', '사용 가능'), val: active },
      { emoji: '📊', label: t('myCoupons.used', '사용 횟수'), val: used },
      { emoji: '⏰', label: t('myCoupons.unavailable', '소진/만료'), val: unavailable },
    ];
  }, [coupons, t]);

  const tabs = [t('myCoupons.tabAvailable', '사용 가능'), t('myCoupons.tabUsed', '사용 내역'), t('myCoupons.tabUnavailable', '소진/만료')];
  const shown = useMemo(() => {
    if (activeTab === 0) return coupons.filter(usable);
    if (activeTab === 1) return coupons.filter(c => (Number(c.use_count) || 0) > 0);
    return coupons.filter(c => !usable(c));
  }, [coupons, activeTab]);

  const redeem = async () => {
    const cc = code.trim();
    if (!cc) return;
    setBusy(true); setMsg('');
    try {
      const r = await postJsonAuth('/api/auth/coupon/redeem', { code: cc });
      if (r?.ok) {
        setMsg(t('myCoupons.redeemOk', '쿠폰이 적용되었습니다.')); setCode(''); load();
        // [282차 R2 P2] 플랜 부여형 쿠폰 등록 후 AuthContext 플랜 리프레시 → 사이드바/메뉴 접근 즉시 재계산
        //   (종전엔 재로그인/새로고침 전까지 새 플랜 메뉴가 안 열렸다). demo 무해.
        try { if (typeof refreshPlan === 'function') await refreshPlan(); } catch { /* 비치명 */ }
      }
      else setMsg(r?.error || r?.message || t('myCoupons.redeemFail', '쿠폰 적용에 실패했습니다.'));
    } catch (e) { setMsg(t('myCoupons.redeemFail', '쿠폰 적용에 실패했습니다.')); }
    finally { setBusy(false); }
  };

  const card = { borderRadius: 14, padding: '14px 20px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' };

  return (
    <div style={{ padding: 24, minHeight: '100%', color: 'var(--text-1, #1e293b)' }}>
      <div style={{ borderRadius: 18, padding: '28px 32px', marginBottom: 22, background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))', border: '1px solid rgba(79,142,247,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>🎟️</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{t('myCoupons.title', '내 쿠폰')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3, #64748b)', marginTop: 2 }}>{t('myCoupons.subtitle', '보유 쿠폰 조회 및 쿠폰 코드 등록')}</div>
          </div>
        </div>
      </div>

      {/* 쿠폰 코드 등록 */}
      <div style={{ ...card, marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && redeem()}
          placeholder={t('myCoupons.codePh', '쿠폰 코드 입력')}
          style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13 }} />
        <button onClick={redeem} disabled={busy || !code.trim()}
          style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: busy ? 'wait' : 'pointer', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', opacity: busy || !code.trim() ? 0.6 : 1 }}>
          {busy ? '⏳' : t('myCoupons.redeem', '등록')}
        </button>
        {msg && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2,#475569)' }}>{msg}</span>}
      </div>

      {/* [282차 R3] 추천인 제도 — 내 추천코드 + 실적(구독회원 전용) */}
      {refEligible === true && refCode && (
        <div style={{ marginBottom: 18, borderRadius: 16, padding: '20px 24px', background: 'linear-gradient(135deg, #0b1220, #1a2a52)', color: '#fff', border: '1px solid rgba(129,171,255,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>🎁</span>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{t('myCoupons.refTitle', '내 추천 코드')}</div>
          </div>
          <div style={{ fontSize: 12.5, color: '#c9d6ee', lineHeight: 1.6, marginBottom: 14 }}>
            {t('myCoupons.refDesc', '이 코드로 다른 기업이 구독 가입하면, 그 회원이 1개월 구독을 유지하는 즉시 PRO 1개월 무료쿠폰이 확실하게 지급됩니다(추천일로부터 1년 유효).')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(129,171,255,0.5)' }}>{refCode}</code>
            <button onClick={copyRef} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>
              {refCopied ? t('myCoupons.refCopied', '복사됨 ✓') : t('myCoupons.refCopy', '코드 복사')}
            </button>
            <button onClick={async () => { try { await navigator.clipboard.writeText(refLink); setRefCopied(true); setTimeout(() => setRefCopied(false), 1800); } catch {} }}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'transparent', color: '#fff' }}>
              {t('myCoupons.refCopyLink', '초대 링크 복사')}
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 12 }}>
              <div><span style={{ fontSize: 18, fontWeight: 800 }}>{refStats.referred_count}</span> <span style={{ color: '#9fb3d4' }}>{t('myCoupons.refCount', '추천 가입')}</span></div>
              <div><span style={{ fontSize: 18, fontWeight: 800, color: '#6ee7b7' }}>{refStats.rewarded_count}</span> <span style={{ color: '#9fb3d4' }}>{t('myCoupons.refRewards', '지급 보상')}</span></div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 26 }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3, #64748b)', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent', color: activeTab === i ? '#fff' : 'var(--text-2, #475569)' }}>{tab}</button>
        ))}
      </div>

      <div style={{ borderRadius: 16, padding: '24px 28px', minHeight: 280, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3,#94a3b8)', fontSize: 13 }}>{t('common.loading', '불러오는 중…')}</div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3,#94a3b8)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎟️</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('myCoupons.empty', '해당 쿠폰이 없습니다')}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{t('myCoupons.emptyDesc', '보유한 쿠폰 코드가 있다면 위에서 등록하세요.')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {shown.map((c, i) => {
              const left = Math.max(0, (Number(c.max_uses) || 1) - (Number(c.use_count) || 0));
              // [282차 R3] 추천 보상쿠폰 잠금 표시 — usable_from 이 미래면 아직 사용 불가(피추천 회원 1개월 유지 대기).
              const locked = c.usable_from && new Date(String(c.usable_from).replace(' ', 'T')).getTime() > Date.now();
              const ok = usable(c) && !locked;
              const unlockDate = locked ? String(c.usable_from).slice(0, 10) : '';
              return (
                <div key={c.code + i} style={{ borderRadius: 12, padding: '16px 18px', background: ok ? 'linear-gradient(135deg, rgba(79,142,247,0.06), rgba(99,102,241,0.04))' : 'rgba(0,0,0,0.03)', border: `1px solid ${ok ? 'rgba(79,142,247,0.18)' : 'rgba(0,0,0,0.08)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: ok ? '#4f8ef7' : 'var(--text-3,#94a3b8)' }}>{c.code}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ok ? 'rgba(34,197,94,0.12)' : (locked ? 'rgba(245,158,11,0.14)' : 'rgba(0,0,0,0.06)'), color: ok ? '#16a34a' : (locked ? '#b45309' : '#94a3b8') }}>
                      {ok ? t('myCoupons.usable', '사용 가능') : (locked ? `🔒 ${t('myCoupons.locked', '잠금')}` : (Number(c.is_revoked) ? t('myCoupons.revoked', '취소됨') : t('myCoupons.exhausted', '소진')))}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2,#475569)', fontWeight: 600 }}>
                    {t('myCoupons.planLabel', '플랜')}: <b style={{ textTransform: 'capitalize' }}>{c.plan}</b> · {c.duration_days ? `${c.duration_days}${t('myCoupons.days', '일')}` : t('myCoupons.unlimited', '무기한')}
                  </div>
                  {locked && (
                    <div style={{ fontSize: 11, color: '#b45309', marginTop: 4, fontWeight: 600 }}>
                      🔒 {t('myCoupons.unlockOn', '사용 가능일')}: {unlockDate} — {t('myCoupons.unlockNote', '추천 회원의 구독 유지 확인 후 자동 활성화')}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-3,#94a3b8)', marginTop: 4 }}>
                    {t('myCoupons.usesLeft', '남은 사용')}: {left}/{Number(c.max_uses) || 1}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
