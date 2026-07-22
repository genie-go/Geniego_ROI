import { useI18n } from '../i18n';
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { IS_DEMO } from '../utils/demoEnv';
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import PlanGate from "../components/PlanGate.jsx";
import { useNavigate } from "react-router-dom";
import GuideWizard from '../components/GuideWizard.jsx'; // [237차] 인앱 순차 완료 위저드(필수등록 게이팅)
import { getJsonAuth as _gjaCrm, postJsonAuth as _pjaCrm, delJson as _delCrm, requestJsonAuth as _reqCrm } from '../services/apiClient.js';
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { crmApi } from "../services/crmApi.js"; // 191차 4단계: 운영 백엔드 실배선(/api/crm/*)
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

const C = {
  bg: "#f8fafc", surface: "#f1f5f9", card: "rgba(255,255,255,0.95)",
  border: "#e2e8f0", accent: "#4f8ef7",
  green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
  purple: "#a78bfa", muted: "#64748b", text: "#1e293b",
};

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const getPriorityBadge = (t) => ({
  urgent: { label: t('crm.gUrgent'), color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  high: { label: t('crm.gRisk'), color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  medium: { label: t('crm.gNormal'), color: "#4f8ef7", bg: "rgba(79,142,247,0.12)" },
});

const getRfmGrade = (t) => ({
  champions: { label: t('crm.gChamp'), color: "#22c55e" },
  loyal: { label: t('crm.gLoyal'), color: "#4f8ef7" },
  at_risk: { label: t('crm.gRisk'), color: "#fbbf24" },
  lost: { label: t('crm.gLost'), color: "#f87171" },
  new: { label: t('crm.gNew'), color: "#a78bfa" },
  normal: { label: t('crm.gNormal'), color: "#64748b" },
});

/* ── Currency Formatting ────────────────────────────────────────────────────── */
function useCurrencyFmt() {
  // [265차] 훅 try/catch = GlobalDataProvider 밖 렌더 대비 의도적 fallback(useGlobalData 는 provider 밖에서 throw).
  //   현 CRM 페이지는 항상 provider 내라 catch 미발생(잠복 위반이지 능동 크래시 아님). 리팩터 시 fallback 후퇴 위험 → 의도적 예외.
  /* eslint-disable react-hooks/rules-of-hooks */
  try {
    const { currency, exchangeRates } = useGlobalData();
    const fmt = useCallback((krwAmount) => {
      if (!krwAmount && krwAmount !== 0) return '-';
      const cur = currency || 'KRW';
      const rate = exchangeRates?.[cur] || 1;
      const converted = krwAmount * rate;
      const symbols = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥', CNY: '¥', GBP: '£', THB: '฿', VND: '₫', IDR: 'Rp' };
      const sym = symbols[cur] || cur + ' ';
      if (cur === 'KRW') return `${sym}${Math.round(converted).toLocaleString()}`;
      if (cur === 'JPY') return `${sym}${Math.round(converted).toLocaleString()}`;
      return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }, [currency, exchangeRates]);
    return fmt;
  } catch {
    return (v) => new Intl.NumberFormat(navigator.language || 'ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(Math.round(v || 0));
  }
  /* eslint-enable react-hooks/rules-of-hooks */
}

/* ── CSV Export ──────────────────────────────────────────────────────────────── */
function downloadCsv(headers, rows, filename) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Connected Channels Badge ───────────────────────────────────────────────── */
function ConnectedChannelsBadge({ t }) {
  const sync = useConnectorSync();
  const navigate = useNavigate();
  const raw = sync?.connectedChannels || {};
  const connectedChannels = Array.isArray(raw) ? raw : Object.entries(raw).filter(([,v]) => v).map(([k]) => ({ key: k, platform: k }));
  if (!connectedChannels.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 11, marginBottom: 14 }}>
        <span>⚠️</span>
        <span style={{ color: '#eab308', fontWeight: 600 }}>{t('crm.noConnectedChannels')}</span>
        <button onClick={() => navigate('/integration-hub')} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#1d4ed8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('crm.goIntegrationHub')}</button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '6px 10px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 10, marginBottom: 14 }}>
      <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 11 }}>🔗 {t('crm.connectedChannels')}:</span>
      {connectedChannels.map(ch => (
        <span key={ch.key || ch.platform} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{ch.platform || ch.key}</span>
      ))}
    </div>
  );
}

/* ── Security Lock Modal ───────────────────────────────────────────────────── */
function SecurityLockModal({ t, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, maxWidth: 380, textAlign: 'center', boxShadow: '0 24px 64px rgba(239,68,68,0.12)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: '#ef4444', marginBottom: 8 }}>{t('crm.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>{t('crm.secLockDesc')}</div>
        <button onClick={onDismiss} style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{t('crm.dismiss')}</button>
      </div>
    </div>
  );
}

/* ── StatCard ───────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 26, flex: "0 0 auto" }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: color || C.accent, lineHeight: 1.15 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Customer Detail Panel ──────────────────────────────────────────────────── */
function CustomerPanel({ customer, onClose, onSendEmail, onSendKakao, onDelete, crmCustomerHistory, timeline = [] }) {
  const { t } = useI18n();
  const fmt = useCurrencyFmt();
  // [현 차수] 통합 고객 아이덴티티 360 — email/phone/kakao 병합 후 집계된 LTV/빈도/타임라인.
  const [identity, setIdentity] = React.useState(null);
  const [unmerging, setUnmerging] = React.useState(0);
  const reloadIdentity = React.useCallback(() => {
    if (_isDemo || customer?.id == null) { setIdentity(null); return; }
    _gjaCrm(`/api/crm/identity/${customer.id}`).then(r => setIdentity(r && (r.ok !== false) ? r : null)).catch(() => setIdentity(null));
  }, [customer?.id]);
  React.useEffect(() => {
    if (_isDemo || customer?.id == null) { setIdentity(null); return; }
    let alive = true;
    _gjaCrm(`/api/crm/identity/${customer.id}`).then(r => { if (alive) setIdentity(r && (r.ok !== false) ? r : null); }).catch(() => { if (alive) setIdentity(null); });
    return () => { alive = false; };
  }, [customer?.id]);
  // [282차 R3] 오병합 되돌리기 — 통합 멤버를 단독 아이덴티티로 분리(확률병합 실수 복구).
  const unmergeMember = async (memberId) => {
    if (_isDemo || !memberId) return;
    setUnmerging(memberId);
    try { await _pjaCrm('/api/crm/identity/unmerge', { customer_id: memberId }); reloadIdentity(); }
    catch (e) { /* 무음 — 상세는 콘솔 */ console.warn('unmerge fail', e); }
    finally { setUnmerging(0); }
  };
  if (!customer) return null;
  const grade = getRfmGrade(t)[customer.grade] || getRfmGrade(t).normal;
  // 링크된 연락처 행 수(다중 email/phone/kakao 병합 결과) — 응답 필드 방어적 파싱
  // [270차 수정] 핸들러 identityView 는 {members, member_count, aggregate:{ltv,frequency}} 네스팅 반환.
  //   과거 flat 키(contacts/linked_count/ltv/frequency) 소비로 병합고객 상세가 항상 0명·₩0·0회 은폐.
  const idLinked = identity ? (Array.isArray(identity.members) ? identity.members : []) : [];
  const idLinkedCount = identity ? (Number(identity.member_count ?? idLinked.length) || 0) : 0;
  const idLtv = identity ? Number(identity.aggregate?.ltv ?? 0) : 0;
  const idFreq = identity ? Number(identity.aggregate?.frequency ?? 0) : 0;
  const acts = crmCustomerHistory[customer.id] || [];
  // [257차] 360 전체 활동 타임라인 — 활동 유형별 아이콘/라벨(구매 외 전 접점).
  const actMeta = (type) => {
    const m = {
      purchase: { icon: '💳', label: t('crm.actPurchase', '구매') },
      email: { icon: '✉️', label: t('crm.actEmail', '이메일') }, email_sent: { icon: '✉️', label: t('crm.actEmail', '이메일') },
      kakao: { icon: '💬', label: t('crm.actKakao', '카카오') }, sms: { icon: '📱', label: t('crm.actSms', 'SMS') },
      segment: { icon: '🏷', label: t('crm.actSegment', '세그먼트') }, signup: { icon: '🎉', label: t('crm.actSignup', '가입') },
      churn: { icon: '⚠️', label: t('crm.actChurn', '이탈위험') }, return: { icon: '↩', label: t('crm.actReturn', '반품') },
      claim: { icon: '↩', label: t('crm.actClaim', '클레임') }, webhook: { icon: '🔗', label: t('crm.actWebhook', '이벤트') },
    };
    return m[type] || { icon: '•', label: type };
  };
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{t('crm.titDetail')}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: C.card, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${grade.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{customer.name?.[0] || "?"}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{customer.name || "-"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{customer.email}</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: `${grade.color}22`, color: grade.color, borderRadius: 6, padding: "3px 8px" }}>{grade.label}</span>
          </div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              [t('crm.lblPhone'), customer.phone || "-"],
              ["💰 LTV", fmt(customer.ltv)],
              [t('crm.colCnt'), `${customer.purchase_count} ${t('crm.unitTimes')}`],
              ["🏷 Tags", (customer.tags || []).join(", ") || "-"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: C.surface, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, color: C.muted }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onSendEmail(customer)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: `${C.accent}22`, color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{t('crm.btnEmail')}</button>
          <button onClick={() => onSendKakao(customer)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#fee08b22", color: "#fbbf24", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{t('crm.btnKakao')}</button>
          <button onClick={() => { if(window.confirm(t('crm.deleteConfirm'))) onDelete(customer.id); }} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "rgba(248,113,113,0.12)", color: "#f87171", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{t('crm.deleteCustomer')}</button>
        </div>
        {/* [현 차수] 통합 고객 아이덴티티 360 — 병합된 연락처 전체 집계(운영 전용) */}
        {!_isDemo && identity && (
          <div style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}33`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.purple, marginBottom: 10 }}>🪪 {t('crm.identity.title', '통합 고객 아이덴티티')}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                [t('crm.identityLinked', '병합 연락처'), `${idLinkedCount}${t('crm.affPeople', '명')}`],
                ["💰 LTV", fmt(idLtv)],
                [t('crm.colCnt'), `${idFreq} ${t('crm.unitTimes')}`],
              ].map(([k, v]) => (
                <div key={k} style={{ background: C.card, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: C.muted }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</div>
                </div>
              ))}
            </div>
            {idLinked.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {idLinked.slice(0, 12).map((lc, i) => (
                  <span key={i} style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: C.surface, color: C.muted, border: `1px solid ${C.border}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {lc.email || lc.phone || lc.kakao_id || lc.identifier || lc.value || (typeof lc === 'string' ? lc : '-')}
                    {idLinkedCount > 1 && lc.id && (
                      <button onClick={() => unmergeMember(lc.id)} disabled={unmerging === lc.id} title={t('crm.idUnmerge', '이 연락처를 별도 고객으로 분리(오병합 되돌리기)')}
                        style={{ border: 'none', background: 'transparent', color: unmerging === lc.id ? C.muted : '#dc2626', cursor: unmerging === lc.id ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0 }}>✕</button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t('crm.lblAct')} ({acts.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {acts.slice(0, 10).map((a, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>💳</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t('crm.actPurchase')}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{a.ch || "Web"}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {a.total > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{fmt(a.total)}</div>}
                  <div style={{ fontSize: 10, color: C.muted }}>{a.at}</div>
                </div>
              </div>
            ))}
            {acts.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>{t('crm.actEmpty')}</div>}
          </div>
        </div>
        {/* [257차] 360 전체 활동 타임라인 — 구매 외 전 접점(이메일/카카오/SMS/세그먼트/가입 등) 시간순 */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🕒 {t('crm.timelineTitle', '전체 활동 타임라인')} ({timeline.length})</div>
          {timeline.length === 0
            ? <div style={{ color: C.muted, fontSize: 12 }}>{t('crm.timelineEmpty', '활동 기록이 아직 없습니다.')}</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {timeline.slice(0, 30).map((a, i) => { const m = actMeta(a.type); return (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderLeft: `2px solid ${C.border}`, marginLeft: 8, paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: -9, top: 9, fontSize: 12, background: C.surface }}>{m.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{m.label}{a.ch ? ` · ${a.ch}` : ""}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{a.at}</div>
                    </div>
                    {a.amount > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{fmt(a.amount)}</div>}
                  </div>
                ); })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/* ── AI Segments Tab ────────────────────────────────────────────────────────── */
function AISegmentsTab({ navigate, derivedCustomers }) {
  const { t } = useI18n();
  const fmt = useCurrencyFmt();
  const [expanded, setExpanded] = useState(null);
  const [actionMsg, setActionMsg] = useState({});

  const segments = useMemo(() => {
    if (!derivedCustomers.length) return [];
    const highVal = derivedCustomers.filter(c => c.ltv > 500000);
    const risk = derivedCustomers.filter(c => c.ltv > 0 && c.purchase_count === 1);
    const res = [];
    // [266차] 임의 상수(×150000/×50000) 제거 → 세그먼트 실 LTV 합계로 파생(임의숫자 금지·SSOT). VIP=보유가치, 이탈위험=위험노출액.
    const sumLtv = (arr) => arr.reduce((s, c) => s + (Number(c.ltv) || 0), 0);
    if (highVal.length > 0) {
      res.push({ id: "vip_upsell", name: t('crm.aiSegVip'), icon: "💎", color: "#a855f7", priority: "medium", count: highVal.length, predicted_revenue: sumLtv(highVal), reason: t('crm.aiSegVipReason'), ai_insight: t('crm.aiSegVipInsight') });
    }
    if (risk.length > 0) {
      res.push({ id: "churn_risk", name: t('crm.aiSegChurn'), icon: "⚠️", color: "#f87171", priority: "urgent", count: risk.length, predicted_revenue: sumLtv(risk), reason: t('crm.aiSegChurnReason'), ai_insight: t('crm.aiSegChurnInsight') });
    }
    return res;
  }, [derivedCustomers, t]);

  const triggerAction = (segId, action) => {
    // [266차] 이 액션은 실제 발송이 아니라 해당 실행 화면으로 '이동'만 한다(발송은 이동한 화면에서 수행).
    //   기존 msgEmailDone/…="발송 완료" 는 거짓 성공 표기 → 이동 안내로 정정(t 2번째 인자=한글 fallback·15국 즉시정상).
    const msgs = {
      email: t('crm.msgNavEmail', '이메일 마케팅 화면으로 이동합니다'),
      kakao: t('crm.msgNavKakao', '카카오 채널 화면으로 이동합니다'),
      journey: t('crm.msgNavJourney', '저니 빌더 화면으로 이동합니다'),
    };
    setActionMsg(p => ({ ...p, [segId + action]: msgs[action] }));
    setTimeout(() => setActionMsg(p => { const n = { ...p }; delete n[segId + action]; return n; }), 3000);
    if (action === "email") navigate("/email-marketing");
    else if (action === "kakao") navigate("/kakao-channel");
    else if (action === "journey") navigate("/journey-builder");
  };

  const totalPredicted = segments.reduce((s, x) => s + x.predicted_revenue, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { label: t('crm.aiSum1'), value: segments.length, icon: "🤖", color: C.accent },
          { label: t('crm.aiSum2'), value: segments.reduce((s, x) => s + x.count, 0).toLocaleString() + " " + t('crm.segUnit'), icon: "👥", color: C.green },
          { label: t('crm.aiSum3'), value: fmt(totalPredicted), icon: "💰", color: C.purple },
        ].map(({ label, value, icon, color }, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      {segments.map(seg => {
        const pBadge = getPriorityBadge(t)[seg.priority];
        const isExp = expanded === seg.id;
        return (
          <div key={seg.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", borderLeft: `4px solid ${seg.color}` }}>
            <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setExpanded(isExp ? null : seg.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{seg.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{seg.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{seg.reason}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: seg.color }}>{seg.count.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{t('crm.segUnit')}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{fmt(seg.predicted_revenue)}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{t('crm.aiSum3')}</div>
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{isExp ? "▲" : "▼"}</span>
              </div>
            </div>
            {isExp && (
              <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: `${seg.color}0d`, border: `1px solid ${seg.color}30`, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                  🤖 <strong>{t('crm.aiInsight')}</strong> {seg.ai_insight}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {[
                    { action: "email", label: t('crm.btnEmailMkt'), color: C.accent },
                    { action: "kakao", label: t('crm.aiBtnKakao'), color: "#c8a000" },
                    { action: "journey", label: t('crm.btnJourney'), color: C.purple },
                  ].map(({ action, label, color }) => (
                    <button key={action} onClick={() => triggerAction(seg.id, action)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${color}40`, background: `${color}15`, color, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{label}</button>
                  ))}
                  {Object.entries(actionMsg).filter(([k]) => k.startsWith(seg.id)).map(([k, msg]) => (
                    <span key={k} style={{ fontSize: 12, color: C.green, alignSelf: "center", fontWeight: 700 }}>{msg}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {segments.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>{t('crm.emptyCust')}</div>}
    </div>
  );
}

/* ── Segments Tab ───────────────────────────────────────────────────────────── */
function SegmentsTab({ segments, onSave, onDelete, onSmartSeed, onRefresh }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", description: "", color: "#4f8ef7", rules: [] });
  const [msg, setMsg] = useState("");
  const [seeding, setSeeding] = useState(false);
  const smartSeed = async () => { setSeeding(true); try { await onSmartSeed?.(); } finally { setSeeding(false); } };
  const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, { field: "ltv", op: "gte", value: "" }] }));
  const removeRule = (i) => setForm(f => { const r = [...f.rules]; r.splice(i, 1); return { ...f, rules: r }; });
  const updateRule = (i, k, v) => setForm(f => { const r = [...f.rules]; r[i] = { ...r[i], [k]: v }; return { ...f, rules: r }; });
  const save = async () => {
    await onSave(form); // 데모=로컬 append, 운영=crmApi.createSegment+reload
    setMsg(`✅ ${t('crm.btnSaving')}`);
    setForm({ name: "", description: "", color: "#4f8ef7", rules: [] });
    setTimeout(() => setMsg(""), 3000);
  };
  const crmSegments = segments;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{t('crm.segNew')}</div>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('crm.segName')} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('crm.segDesc')} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t('crm.segColor')}</span>
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 36, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: "none" }} />
        </div>
        <div style={{ flex: 1, minHeight: 120 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{t('crm.segCond')}</div>
          {form.rules.map((rule, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <select value={rule.field} onChange={e => updateRule(i, "field", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                <option value="ltv">LTV</option><option value="frequency">{t('crm.segFreq', '구매횟수')}</option><option value="recency">{t('crm.segRecency', '최근구매 경과일')}</option><option value="rfm_score">RFM</option><option value="grade">{t('crm.colGrade', '등급')}</option>
              </select>
              <select value={rule.op} onChange={e => updateRule(i, "op", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                <option value="gte">≥</option><option value="lte">≤</option><option value="gt">&gt;</option><option value="lt">&lt;</option><option value="eq">=</option>
              </select>
              <input value={rule.value} onChange={e => updateRule(i, "value", e.target.value)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }} />
              <button onClick={() => removeRule(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          ))}
          <button onClick={addRule} style={{ fontSize: 12, color: C.accent, background: "none", border: `1px dashed ${C.accent}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>{t('crm.segAdd')}</button>
        </div>
        {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red, marginBottom: 8 }}>{msg}</div>}
        <button onClick={save} disabled={!form.name} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: C.accent, color: '#ffffff', fontWeight: 700, cursor: "pointer" }}>{t('crm.segCreate')}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={smartSeed} disabled={seeding} style={{ padding: "10px 14px", borderRadius: 10, border: "none", cursor: seeding ? "default" : "pointer", fontWeight: 800, fontSize: 13, background: seeding ? "#cbd5e1" : "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff" }}>
          {seeding ? "…" : "🧠 " + t('crm.smartSeed', '스마트 세그먼트 자동생성 (VIP·충성·신규·이탈위험·휴면)')}
        </button>
        {crmSegments.map(s => (
          <div key={s.id} style={{ background: C.card, borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${s.color || "#4f8ef7"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontWeight: 700, fontSize: 11, color: C.muted, marginTop: 2 }} >{s.name}</div><div>{s.description}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right", fontSize: 10, fontWeight: 700, color: C.muted }} ><div>{s.count}</div><div>{t('crm.segUnit')}</div></div>
                {onRefresh && <button onClick={() => onRefresh(s.id)} title={t('crm.segRefresh', '멤버십 재계산 (실데이터 기준 동기화)')} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14 }}>🔄</button>}
                <button onClick={() => { if (window.confirm(t('crm.deleteConfirm', 'Delete?'))) onDelete(s.id); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
        {crmSegments.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>{t('crm.segEmpty')}</div>}
      </div>
    </div>
  );
}

/* [240차 약점③] 예측형 CDP 행 점수 — 운영은 백엔드 churn_prob/predicted_clv(단일소스·CRM.addPredictiveScores) 우선,
   데모(백엔드값 부재)는 recency/frequency 기반 표시용 근사(샌드박스 전용·운영 로직 무관·데이터 오염 0). */
function predRowScore(c) {
  if (c.churn_prob != null && c.predicted_clv != null) return { churn: Number(c.churn_prob), clv: Number(c.predicted_clv) };
  const freq = Number(c.purchase_count || 0);
  const daysSince = c.last_purchase ? Math.max(0, (Date.now() - new Date(c.last_purchase).getTime()) / 86400000) : 999;
  if (freq <= 0) return { churn: 0.5, clv: 0 };
  const churn = Math.min(0.99, daysSince / (freq >= 3 ? 120 : freq === 2 ? 100 : 180));
  const aov = c.ltv > 0 ? c.ltv / freq : 0;
  const clv = Math.round(aov * (1 - churn) * (freq >= 2 ? 1.5 : 0.5));
  return { churn: Math.round(churn * 1000) / 1000, clv };
}

/* ── Deliverability Tab — 메시징 빈도캡(Frequency Capping) + 발송시간 최적화(STO) ──
 *   [현 차수] 경쟁사 Braze/Klaviyo 정합. 서버 app_setting(테넌트 격리 skey 접두)에 저장.
 *   데모는 로컬 상태만(운영 격리). 운영은 /api/crm/comms-freq GET/PUT 실배선. */
/* [P1 커넥터 폭] CS/헬프데스크 인바운드(Zendesk·Intercom·Freshdesk·Gorgias) — cs_metrics 실DB 파생.
   티켓 생성/해결/미해결·CSAT. 자격증명 미등록·미동기화 시 정직 빈 상태. */
function CsMetricsTab({ t }) {
  const [source, setSource] = React.useState('all');
  const [data, setData] = React.useState(null);
  const [status, setStatus] = React.useState('idle');
  React.useEffect(() => {
    let alive = true; setStatus('loading');
    _gjaCrm(`/api/v426/cs/metrics?source=${source}`)
      .then(r => { if (!alive) return; setData(r && r.ok ? r : { rows: [], totals: {} }); setStatus('done'); })
      .catch(() => { if (alive) { setData({ rows: [], totals: {} }); setStatus('done'); } });
    return () => { alive = false; };
  }, [source]);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const tot = data?.totals || {};
  const nf = (n) => Number(n || 0).toLocaleString();
  const SRC = [{ id: 'all', label: t('crm.csAll', '전체') }, { id: 'zendesk', label: 'Zendesk' }, { id: 'intercom', label: 'Intercom' }, { id: 'freshdesk', label: 'Freshdesk' }, { id: 'gorgias', label: 'Gorgias' }];
  const cards = [
    { label: t('crm.csCreated', '생성 티켓'), c: '#2563eb', v: nf(tot.tickets_created) },
    { label: t('crm.csSolved', '해결 티켓'), c: '#16a34a', v: nf(tot.tickets_solved) },
    { label: t('crm.csOpen', '미해결'), c: '#ea580c', v: nf(tot.open_tickets) },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(3,54,61,0.06),rgba(37,99,235,0.05))', border: '1px solid rgba(3,54,61,0.18)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b' }}>🎧 {t('crm.tabCs', 'CS 지원')}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>{t('crm.csDesc', '연동허브에서 Zendesk·Intercom·Freshdesk·Gorgias 자격증명을 등록하면 티켓·CSAT·응답시간이 인바운드 수집됩니다.')}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 4, border: '1px solid rgba(0,0,0,0.06)', width: 'fit-content', flexWrap: 'wrap' }}>
        {SRC.map(s => (<button key={s.id} onClick={() => setSource(s.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: source === s.id ? '#03363d' : 'transparent', color: source === s.id ? '#fff' : '#475569' }}>{s.label}</button>))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
        {cards.map((c, i) => (<div key={i} style={{ background: c.c + '0d', border: `1px solid ${c.c}22`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{c.label}</div><div style={{ fontSize: 18, fontWeight: 900, color: c.c, marginTop: 4 }}>{c.v}</div></div>))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: 14, overflowX: 'auto' }}>
        {status === 'loading' ? (<div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>{t('common.loading', '불러오는 중…')}</div>)
          : rows.length === 0 ? (<div style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}><div style={{ fontSize: 30, marginBottom: 8 }}>🔌</div>{t('crm.csEmpty', 'Zendesk·Intercom·Freshdesk·Gorgias 자격증명을 등록하면 CS 데이터가 표시됩니다.')}<div style={{ marginTop: 8 }}><button onClick={() => { window.location.href = '/api-keys'; }} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.06)', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('crm.csGoConnect', '연동허브로 이동 →')}</button></div></div>)
          : (<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ borderBottom: '2px solid rgba(0,0,0,0.08)', color: '#475569', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: '8px 10px' }}>{t('crm.csSource', '채널')}</th><th style={{ padding: '8px 10px' }}>{t('crm.csCreated', '생성')}</th><th style={{ padding: '8px 10px' }}>{t('crm.csSolved', '해결')}</th><th style={{ padding: '8px 10px' }}>{t('crm.csSolveRate', '해결률')}</th><th style={{ padding: '8px 10px' }}>{t('crm.csOpen', '미해결')}</th><th style={{ padding: '8px 10px' }}>CSAT</th></tr></thead><tbody>{rows.map((r, i) => (<tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'right' }}><td style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{r.source}</td><td style={{ padding: '7px 10px', color: '#334155' }}>{nf(r.tickets_created)}</td><td style={{ padding: '7px 10px', color: '#334155' }}>{nf(r.tickets_solved)}</td><td style={{ padding: '7px 10px', color: '#16a34a', fontWeight: 600 }}>{(Number(r.solve_rate || 0) * 100).toFixed(1)}%</td><td style={{ padding: '7px 10px', color: '#ea580c' }}>{nf(r.open_tickets)}</td><td style={{ padding: '7px 10px', color: '#334155' }}>{r.csat > 0 ? r.csat + '%' : '—'}</td></tr>))}</tbody></table>)}
      </div>
    </div>
  );
}

function DeliverabilityTab({ t }) {
  const [cfg, setCfg] = React.useState({ cap: 4, window: 7, quiet_start: 21, quiet_end: 8, sto: false });
  const [loading, setLoading] = React.useState(!IS_DEMO);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    if (IS_DEMO) return; // 데모: 기본값 로컬 편집(운영 격리)
    let alive = true;
    (async () => {
      try {
        const r = await crmApi.getCommsFreq();
        if (alive && r?.config) setCfg(c => ({ ...c, ...r.config }));
      } catch (e) { /* 미설정/네트워크 → 기본값 유지 */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, isNaN(+v) ? lo : Math.round(+v)));
  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const onSave = async () => {
    setMsg(""); setSaving(true);
    const body = {
      cap: clamp(cfg.cap, 1, 50),
      window: clamp(cfg.window, 1, 90),
      quiet_start: clamp(cfg.quiet_start, 0, 23),
      quiet_end: clamp(cfg.quiet_end, 0, 23),
      sto: !!cfg.sto,
    };
    try {
      if (IS_DEMO) { setCfg(c => ({ ...c, ...body })); setMsg(t('crm.deliverSaved', '저장되었습니다 (데모)')); }
      else {
        const r = await crmApi.saveCommsFreq(body);
        if (r?.config) setCfg(c => ({ ...c, ...r.config }));
        setMsg(t('crm.deliverSaved', '저장되었습니다'));
      }
    } catch (e) { setMsg(t('crm.deliverSaveErr', '저장 실패: 권한 또는 네트워크를 확인하세요')); }
    finally { setSaving(false); }
  };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 };
  const labelSt = { fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 };
  const descSt = { fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 };
  const inputSt = { width: 110, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 13, fontWeight: 600 };

  if (loading) return <div style={{ padding: 24, color: C.muted, fontSize: 13 }}>{t('crm.loading', '불러오는 중...')}</div>;

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
        {t('crm.deliverIntro', '과발송을 차단해 스팸 신고·차단·발신자 평판 하락을 예방합니다. 이메일·카카오·SMS 발송에 공통 적용됩니다(경쟁사 Braze/Klaviyo 동급 제어).')}
      </div>

      {/* 빈도 상한(Frequency Capping) */}
      <div style={card}>
        <div style={labelSt}>📊 {t('crm.deliverFreqTitle', '발송 빈도 상한 (Frequency Capping)')}</div>
        <div style={descSt}>{t('crm.deliverFreqDesc', '지정한 기간 동안 한 고객에게 보낼 수 있는 최대 메시지 수입니다. 초과 시 자동 발송이 차단됩니다.')}</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverCap', '최대 발송 건수 (1~50)')}</div>
            <input type="number" min={1} max={50} value={cfg.cap} onChange={e => set('cap', e.target.value)} style={inputSt} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverWindow', '기간 (일, 1~90)')}</div>
            <input type="number" min={1} max={90} value={cfg.window} onChange={e => set('window', e.target.value)} style={inputSt} />
          </div>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, paddingBottom: 8 }}>
            {t('crm.deliverFreqSummary', '{cap}건 / {window}일', { cap: clamp(cfg.cap, 1, 50), window: clamp(cfg.window, 1, 90) })}
          </div>
        </div>
      </div>

      {/* 발송시간 최적화(STO) — 야간 차단 */}
      <div style={card}>
        <div style={labelSt}>🌙 {t('crm.deliverStoTitle', '발송시간 최적화 (STO) — 야간 차단')}</div>
        <div style={descSt}>{t('crm.deliverStoDesc', '활성화 시 지정한 야간 시간대(한국시간 기준)에는 메시지 발송이 차단됩니다. 수신자 경험과 도달률을 보호합니다.')}</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.text }}>
          <input type="checkbox" checked={!!cfg.sto} onChange={e => set('sto', e.target.checked)} style={{ width: 16, height: 16 }} />
          {t('crm.deliverStoEnable', '야간 발송 차단 사용')}
        </label>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", opacity: cfg.sto ? 1 : 0.45 }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverQuietStart', '차단 시작 (시, 0~23)')}</div>
            <input type="number" min={0} max={23} value={cfg.quiet_start} onChange={e => set('quiet_start', e.target.value)} disabled={!cfg.sto} style={inputSt} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverQuietEnd', '차단 종료 (시, 0~23)')}</div>
            <input type="number" min={0} max={23} value={cfg.quiet_end} onChange={e => set('quiet_end', e.target.value)} disabled={!cfg.sto} style={inputSt} />
          </div>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, paddingBottom: 8 }}>
            {t('crm.deliverQuietSummary', '{start}시 ~ {end}시 차단', { start: clamp(cfg.quiet_start, 0, 23), end: clamp(cfg.quiet_end, 0, 23) })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <button onClick={onSave} disabled={saving} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? t('crm.saving', '저장 중...') : t('crm.deliverSave', '설정 저장')}
        </button>
        {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: C.green }}>{msg}</span>}
      </div>

      <SuppressionPanel t={t} card={card} labelSt={labelSt} descSt={descSt} inputSt={inputSt} />

      <PreferencesPanel t={t} card={card} labelSt={labelSt} descSt={descSt} inputSt={inputSt} />
    </div>
  );
}

/* ── [현 차수] Suppression(수신거부/바운스) 리스트 관리 — 리스트 위생(Klaviyo Suppressions 정합) ── */
function SuppressionPanel({ t, card, labelSt, descSt, inputSt }) {
  const [list, setList] = React.useState([]);
  const [byReason, setByReason] = React.useState({});
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    if (IS_DEMO) return;
    try { const r = await _gjaCrm('/api/email/suppression'); setList(r?.suppression || []); setByReason(r?.by_reason || {}); } catch (e) { /* 미인증/네트워크 */ }
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const add = async () => {
    const e = email.trim(); if (!e) return; setBusy(true);
    try {
      if (IS_DEMO) { setList(l => [{ email: e.toLowerCase(), reason: 'manual', source: 'admin', created_at: new Date().toISOString().slice(0, 16) }, ...l]); }
      else { await _pjaCrm('/api/email/suppression', { email: e, reason: 'manual' }); await load(); }
      setEmail("");
    } catch (err) { /* noop */ } finally { setBusy(false); }
  };
  const remove = async (e) => {
    setBusy(true);
    try { if (IS_DEMO) { setList(l => l.filter(x => x.email !== e)); } else { await _delCrm('/api/email/suppression?email=' + encodeURIComponent(e)); await load(); } }
    catch (err) { /* noop */ } finally { setBusy(false); }
  };
  const REASON_LABEL = { unsubscribe: t('crm.supUnsub', '수신거부'), manual: t('crm.supManual', '수동'), bounce: t('crm.supBounce', '반송(바운스)'), complaint: t('crm.supComplaint', '스팸신고') };
  const REASON_COLOR = { unsubscribe: '#64748b', manual: '#0ea5e9', bounce: '#f59e0b', complaint: '#ef4444' };
  return (
    <div style={card}>
      <div style={labelSt}>🚫 {t('crm.supTitle', '수신거부 / 차단 리스트 (Suppression)')}</div>
      <div style={descSt}>{t('crm.supDesc', '수신거부·하드바운스·스팸신고된 주소는 자동으로 발송에서 영구 제외됩니다(컴플라이언스·발신자 평판 보호). 직접 추가/해제할 수 있습니다.')}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.keys(byReason).length === 0
          ? <span style={{ fontSize: 12, color: C.muted }}>{t('crm.supEmpty', '차단된 주소 없음')}</span>
          : Object.entries(byReason).map(([r, n]) => (
            <span key={r} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: (REASON_COLOR[r] || '#64748b') + '18', color: REASON_COLOR[r] || '#64748b' }}>{REASON_LABEL[r] || r} {n}</span>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('crm.supAddPh', '차단할 이메일 주소')} style={{ ...inputSt, width: 260 }} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        <button onClick={add} disabled={busy || !email.trim()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: busy || !email.trim() ? '#cbd5e1' : '#ef4444', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: busy || !email.trim() ? 'default' : 'pointer' }}>{t('crm.supAdd', '차단 추가')}</button>
      </div>
      {list.length > 0 && (
        <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr style={{ background: 'rgba(241,245,249,0.6)', color: C.muted, fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>{t('crm.supColEmail', '이메일')}</th><th style={{ padding: '8px 12px' }}>{t('crm.supColReason', '사유')}</th><th style={{ padding: '8px 12px' }}>{t('crm.supColDate', '일시')}</th><th></th>
            </tr></thead>
            <tbody>
              {list.slice(0, 500).map((s, i) => (
                <tr key={s.email + i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: C.text }}>{s.email}</td>
                  <td style={{ padding: '7px 12px' }}><span style={{ color: REASON_COLOR[s.reason] || '#64748b', fontWeight: 700 }}>{REASON_LABEL[s.reason] || s.reason}</span></td>
                  <td style={{ padding: '7px 12px', color: C.muted }}>{(s.created_at || '').slice(0, 16)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right' }}><button onClick={() => remove(s.email)} disabled={busy} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, textDecoration: 'underline' }}>{t('crm.supRemove', '해제')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── [현 차수] 수신 선호 관리(Preference Center) — 채널별 옵트인/아웃 + 콰이어트아워 + 옵트아웃 요약 ──
 *   경쟁사 Iterable/Braze Subscription Center 정합. 운영은 /api/crm/preferences GET/PUT·/summary 실배선.
 *   데모는 로컬 상태만(운영 격리·PII 미저장). 채널: email/sms/kakao/whatsapp/push. */
function PreferencesPanel({ t, card, labelSt, descSt, inputSt }) {
  const CHANNELS = [
    { id: 'email', label: t('crm.channel.email', '이메일'), color: '#2563eb' },
    { id: 'sms', label: t('crm.channel.sms', 'SMS'), color: '#16a34a' },
    { id: 'kakao', label: t('crm.channel.kakao', '카카오'), color: '#d97706' },
    { id: 'whatsapp', label: t('crm.channel.whatsapp', 'WhatsApp'), color: '#059669' },
    { id: 'push', label: t('crm.channel.push', '푸시'), color: '#7c3aed' },
  ];
  // [282차 R3] 토픽(주제) 레벨 선호 — 채널과 직교(이메일 받되 프로모션만 끄기).
  const TOPICS = [
    { id: 'promo', label: t('crm.topic.promo', '프로모션·할인'), color: '#dc2626' },
    { id: 'newsletter', label: t('crm.topic.newsletter', '뉴스레터·소식'), color: '#2563eb' },
    { id: 'product', label: t('crm.topic.product', '신상품·업데이트'), color: '#059669' },
    { id: 'event', label: t('crm.topic.event', '이벤트·웨비나'), color: '#7c3aed' },
  ];
  const [summary, setSummary] = React.useState(null);
  const [custId, setCustId] = React.useState('');
  const [prefs, setPrefs] = React.useState(null); // { [channel]: {opted_in, quiet_start, quiet_end} }
  const [topicPrefs, setTopicPrefs] = React.useState(null); // { [topic]: bool }
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const loadSummary = React.useCallback(async () => {
    if (IS_DEMO) { setSummary({}); return; }
    try { const r = await _gjaCrm('/api/crm/preferences/summary'); setSummary(r?.summary || r?.by_channel || r?.opt_out || (r && !r.ok ? r : r) || {}); }
    catch { setSummary({}); }
  }, []);
  React.useEffect(() => { loadSummary(); }, [loadSummary]);

  const blankPrefs = () => { const b = {}; CHANNELS.forEach(c => { b[c.id] = { opted_in: true, quiet_start: 21, quiet_end: 8 }; }); return b; };
  const blankTopics = () => { const b = {}; TOPICS.forEach(tp => { b[tp.id] = true; }); return b; };
  const loadCustomer = async () => {
    const id = custId.trim(); if (!id) return;
    setMsg('');
    const base = blankPrefs();
    const tbase = blankTopics();
    if (IS_DEMO) { setPrefs(base); setTopicPrefs(tbase); return; }
    try {
      const r = await _gjaCrm(`/api/crm/preferences?customer_id=${encodeURIComponent(id)}`);
      // 백엔드 정본 응답: { channels:{email:bool,...}, topics:{promo:{opted_in},...}, quiet:{quiet_start,quiet_end,tz_offset} }
      const qs = r?.quiet?.quiet_start, qe = r?.quiet?.quiet_end;
      if (r?.channels && typeof r.channels === 'object') {
        CHANNELS.forEach(c => { if (c.id in r.channels) base[c.id] = { opted_in: !!r.channels[c.id], quiet_start: qs ?? 21, quiet_end: qe ?? 8 }; });
      } else {
        // 레거시 rows 형태 폴백(호환)
        const rows = Array.isArray(r?.preferences) ? r.preferences : Array.isArray(r?.rows) ? r.rows : Array.isArray(r) ? r : [];
        rows.forEach(p => { const ch = p.channel; if (base[ch]) base[ch] = { opted_in: p.opted_in !== 0 && p.opted_in !== false && p.opted_in !== '0', quiet_start: p.quiet_start ?? 21, quiet_end: p.quiet_end ?? 8 }; });
      }
      if (r?.topics && typeof r.topics === 'object') {
        TOPICS.forEach(tp => { if (tp.id in r.topics) tbase[tp.id] = !!(r.topics[tp.id]?.opted_in ?? r.topics[tp.id]); });
      }
      setPrefs(base); setTopicPrefs(tbase);
    } catch (e) { setPrefs(base); setTopicPrefs(tbase); }
  };
  const setPref = (ch, k, v) => setPrefs(p => ({ ...p, [ch]: { ...p[ch], [k]: v } }));
  const setTopic = (tp, v) => setTopicPrefs(p => ({ ...p, [tp]: v }));
  const clampH = (v) => Math.max(0, Math.min(23, isNaN(+v) ? 0 : Math.round(+v)));
  // 채널 1행 저장 — 백엔드 정본 계약 {customer_id, channels:{[ch]:bool}, quiet_*}.
  const savePref = async (ch) => {
    const id = custId.trim(); if (!id || !prefs?.[ch]) return;
    const row = prefs[ch];
    const body = { customer_id: id, channels: { [ch]: !!row.opted_in }, quiet_start: clampH(row.quiet_start), quiet_end: clampH(row.quiet_end) };
    setBusy(true); setMsg('');
    try {
      if (!IS_DEMO) await _reqCrm('/api/crm/preferences', 'PUT', body);
      setMsg(`${CHANNELS.find(c => c.id === ch)?.label || ch} · ${t('crm.prefSaved', '저장되었습니다')}`);
      loadSummary();
    } catch (e) { setMsg(t('crm.prefSaveErr', '저장 실패: 권한 또는 네트워크를 확인하세요')); }
    finally { setBusy(false); }
  };
  // [282차 R3] 토픽 선호 일괄 저장 — {customer_id, topics:{promo:bool,...}}.
  const saveTopics = async () => {
    const id = custId.trim(); if (!id || !topicPrefs) return;
    setBusy(true); setMsg('');
    try {
      if (!IS_DEMO) await _reqCrm('/api/crm/preferences', 'PUT', { customer_id: id, topics: { ...topicPrefs } });
      setMsg(t('crm.topicSaved', '주제 선호가 저장되었습니다'));
      loadSummary();
    } catch (e) { setMsg(t('crm.prefSaveErr', '저장 실패: 권한 또는 네트워크를 확인하세요')); }
    finally { setBusy(false); }
  };

  const optOutOf = (ch) => {
    if (!summary) return null;
    const v = summary[ch] ?? summary[`${ch}_opt_out`] ?? summary[`${ch}_optout`];
    return v == null ? null : Number(v);
  };

  return (
    <div style={card}>
      <div style={labelSt}>📬 {t('crm.preferences.title', '수신 선호 관리')}</div>
      <div style={descSt}>{t('crm.prefDesc', '고객이 채널별로 마케팅 수신을 켜고 끌 수 있습니다. 콰이어트아워(야간 미발송)와 옵트아웃 현황을 관리하세요(경쟁사 Iterable/Braze Subscription Center 동급).')}</div>

      {/* 옵트아웃 요약(채널별) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {CHANNELS.map(c => {
          const n = optOutOf(c.id);
          return (
            <span key={c.id} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: `${c.color}14`, color: c.color }}>
              {c.label} · {t('crm.prefOptOut', '수신거부')} {n == null ? '—' : n.toLocaleString()}
            </span>
          );
        })}
      </div>

      {/* 고객별 채널 선호 편집 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={custId} onChange={e => setCustId(e.target.value)} placeholder={t('crm.prefCustPh', '고객 ID')} style={{ ...inputSt, width: 200 }} onKeyDown={e => { if (e.key === 'Enter') loadCustomer(); }} />
        <button onClick={loadCustomer} disabled={!custId.trim()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: !custId.trim() ? '#cbd5e1' : C.accent, color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: !custId.trim() ? 'default' : 'pointer' }}>{t('crm.prefLoad', '선호 불러오기')}</button>
      </div>

      {prefs && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {CHANNELS.map((c, i) => {
            const row = prefs[c.id];
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${C.border}` : 'none', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: c.color, minWidth: 88 }}>{c.label}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!row.opted_in} onChange={e => setPref(c.id, 'opted_in', e.target.checked)} style={{ width: 15, height: 15 }} />
                  {row.opted_in ? t('crm.prefOptIn', '수신 동의') : t('crm.prefOptOut', '수신거부')}
                </label>
                <span style={{ fontSize: 11.5, color: C.muted }}>{t('crm.prefQuiet', '콰이어트아워')}</span>
                <input type="number" min={0} max={23} value={row.quiet_start} onChange={e => setPref(c.id, 'quiet_start', e.target.value)} style={{ ...inputSt, width: 66 }} />
                <span style={{ fontSize: 12, color: C.muted }}>~</span>
                <input type="number" min={0} max={23} value={row.quiet_end} onChange={e => setPref(c.id, 'quiet_end', e.target.value)} style={{ ...inputSt, width: 66 }} />
                <button onClick={() => savePref(c.id)} disabled={busy} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: 'none', background: busy ? '#cbd5e1' : c.color, color: '#fff', fontWeight: 700, fontSize: 12, cursor: busy ? 'default' : 'pointer' }}>{t('crm.prefSave', '저장')}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* [282차 R3] 토픽(주제) 선호 — 채널과 직교 */}
      {topicPrefs && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>🏷️ {t('crm.topicTitle', '주제별 수신 선호')}</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>{t('crm.topicDesc', '채널과 별개로 고객이 관심 주제만 받도록 설정합니다. 거래성 알림(주문·배송·결제)은 항상 발송되며 여기에 포함되지 않습니다.')}</div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {TOPICS.map((tp, i) => (
              <div key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: tp.color, minWidth: 120 }}>{tp.label}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!topicPrefs[tp.id]} onChange={e => setTopic(tp.id, e.target.checked)} style={{ width: 15, height: 15 }} />
                  {topicPrefs[tp.id] ? t('crm.prefOptIn', '수신 동의') : t('crm.prefOptOut', '수신거부')}
                </label>
              </div>
            ))}
          </div>
          <button onClick={saveTopics} disabled={busy} style={{ marginTop: 10, padding: '7px 16px', borderRadius: 8, border: 'none', background: busy ? '#cbd5e1' : C.accent, color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: busy ? 'default' : 'pointer' }}>{t('crm.topicSave', '주제 선호 저장')}</button>
        </div>
      )}
      {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: C.green, marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

/* ── RFM Tab ────────────────────────────────────────────────────────────────── */
/* ── [현 차수] 코호트 리텐션 — 가입월 × N개월 재구매율 히트맵(Klaviyo Cohorts 정합) ── */
function CohortRetentionPanel({ t }) {
  const [data, setData] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    (async () => { try { const r = await _gjaCrm('/api/crm/cohort-retention'); if (alive) setData(r || { cohorts: [] }); } catch (e) { if (alive) setData({ cohorts: [] }); } })();
    return () => { alive = false; };
  }, []);
  if (!data) return null;
  const cohorts = data.cohorts || [];
  const maxO = data.max_offset ?? 11;
  const heat = (v) => { if (v <= 0) return '#f1f5f9'; const a = Math.min(1, v / 100); return `rgba(79,70,229,${(0.14 + a * 0.72).toFixed(2)})`; };
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: C.text }}>📈 {t('crm.cohortTitle', '코호트 리텐션 (가입월 × 재구매율)')}</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>{t('crm.cohortDesc', '가입한 월별 그룹이 이후 N개월에 재구매한 비율입니다. 리텐션 곡선으로 충성도·LTV 추세를 진단합니다(경쟁사 Klaviyo Cohorts 동급).')}</div>
      {cohorts.length === 0
        ? <div style={{ fontSize: 12.5, color: C.muted, padding: '14px 0' }}>{t('crm.cohortEmpty', '코호트 데이터가 아직 없습니다(가입·구매 이력이 누적되면 표시됩니다).')}</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 700 }}>{t('crm.cohortCol', '가입월')}</th>
                <th style={{ padding: '6px 8px', color: C.muted, fontWeight: 700 }}>{t('crm.cohortSize', '인원')}</th>
                {Array.from({ length: maxO + 1 }, (_, i) => <th key={i} style={{ padding: '6px 8px', color: C.muted, fontWeight: 700 }}>M{i}</th>)}
              </tr></thead>
              <tbody>
                {cohorts.map(c => (
                  <tr key={c.cohort}>
                    <td style={{ padding: '5px 10px', fontFamily: 'monospace', color: C.text }}>{c.cohort}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: C.muted }}>{c.size}</td>
                    {(c.retention || []).map((v, i) => <td key={i} style={{ padding: '5px 8px', textAlign: 'center', background: heat(v), color: v > 50 ? '#fff' : '#1e293b', fontWeight: 600, minWidth: 40 }}>{v > 0 ? v + '%' : '·'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

/* ── [257차] 상품 연관분석(함께 구매) — 고객 동시구매 SKU 쌍 lift/confidence(크로스셀·번들) ── */
function ProductAffinityPanel({ t }) {
  const [data, setData] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    (async () => { try { const r = await _gjaCrm('/api/crm/product-affinity?top=30'); if (alive) setData(r || { pairs: [] }); } catch (e) { if (alive) setData({ pairs: [] }); } })();
    return () => { alive = false; };
  }, []);
  if (!data) return null;
  const pairs = data.pairs || [];
  const recs = data.recommendations || []; // [282차] 협업필터(item-item 코사인) SKU별 추천
  const liftColor = (l) => l >= 3 ? '#16a34a' : l >= 1.5 ? '#d97706' : '#64748b';
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: C.text }}>🧺 {t('crm.affinityTitle', '상품 연관분석 (함께 구매)')}</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>{t('crm.affinityDesc', '같은 고객이 함께 구매한 상품 쌍입니다. 연관강도(lift)>1은 우연보다 자주 함께 팔린다는 의미 — 크로스셀·번들·추천에 활용하세요. (전체 구매고객 {{n}}명 기준)').replace('{{n}}', data.total_buyers ?? 0)}</div>
      {pairs.length === 0
        ? <div style={{ fontSize: 12.5, color: C.muted, padding: '14px 0' }}>{t('crm.affinityEmpty', '함께 구매 데이터가 아직 부족합니다(동일 고객이 2개 이상 상품을 구매하면 표시됩니다).')}</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                {[t('crm.affA', '상품 A'), t('crm.affB', '함께 산 상품 B'), t('crm.affCo', '동시구매'), t('crm.affConf', 'B 구매율(A→B)'), t('crm.affConfBa', 'A 구매율(B→A)'), t('crm.affLift', '연관강도')].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 700 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {pairs.map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 10px', color: C.text }}>{p.a_name}</td>
                    <td style={{ padding: '6px 10px', color: C.text, fontWeight: 600 }}>{p.b_name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: C.muted }}>{p.co_buyers}{t('crm.affPeople', '명')}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: C.muted }}>{p.conf_ab}%</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: C.muted }}>{p.conf_ba != null ? p.conf_ba + '%' : '—'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: liftColor(p.lift) }}>{p.lift}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {recs.length > 0 && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: C.text }}>🤝 {t('crm.cfTitle', '상품별 협업필터 추천')}</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>{t('crm.cfDesc', '각 상품 구매자에게 함께 추천할 상품(item-item 코사인 유사도 기준). 인기 편향에 강건해 크로스셀/번들 추천에 그대로 활용할 수 있습니다.')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {recs.slice(0, 12).map((r, i) => (
              <div key={i} style={{ background: C.bg || 'rgba(148,163,184,0.06)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>{t('crm.cfBuyers', '구매고객')} {r.buyers}{t('crm.affPeople', '명')}</div>
                {(r.recommended || []).map((rc, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, padding: '2px 0' }}>
                    <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }} title={rc.name}>→ {rc.name}</span>
                    <span style={{ color: rc.cosine >= 0.3 ? '#16a34a' : '#64748b', fontWeight: 700, flexShrink: 0 }}>{rc.cosine}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RFMTab({ derivedCustomers }) {
  const { t } = useI18n();
  const fmt = useCurrencyFmt();
  const stats = useMemo(() => {
    const s = { champions: 0, loyal: 0, at_risk: 0, lost: 0, new: 0, normal: 0 };
    derivedCustomers.forEach(c => { if (c.grade && s[c.grade] !== undefined) s[c.grade]++; else s.normal++; });
    return s;
  }, [derivedCustomers]);
  const total = derivedCustomers.length || 1;
  // [265차 확장] 예측형 CDP 요약 KPI — 기존 predRowScore(운영=백엔드 churn_prob/predicted_clv 단일소스·데모=근사) 재집계.
  //   행 단위 점수는 이미 표시 중이나 코호트 상단 요약(평균 이탈·고위험수·예측 CLV 합)이 없었음. 추가 fetch·백엔드 변경 0.
  const pred = useMemo(() => {
    let sumChurn = 0, high = 0, sumClv = 0, n = 0;
    derivedCustomers.forEach(c => { const s = predRowScore(c); sumChurn += s.churn; sumClv += s.clv; if (s.churn >= 0.6) high++; n++; });
    return { avgChurn: n ? sumChurn / n : 0, highChurn: high, totalClv: sumClv, n };
  }, [derivedCustomers]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {pred.n > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { l: t('crm.predAvgChurn', '평균 이탈확률'), v: Math.round(pred.avgChurn * 100) + '%', c: pred.avgChurn >= 0.5 ? '#dc2626' : pred.avgChurn >= 0.3 ? '#d97706' : '#16a34a' },
            { l: t('crm.predHighRisk', '고위험 고객(이탈≥60%)'), v: pred.highChurn.toLocaleString() + t('crm.affPeople', '명'), c: '#dc2626' },
            { l: t('crm.predTotalClv', '예측 CLV 합계'), v: fmt(pred.totalClv), c: '#4f8ef7' },
          ].map(m => (
            <div key={m.l} style={{ background: C.card, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${m.c}` }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{m.l}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: m.c, marginTop: 3 }}>{m.v}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {Object.entries(getRfmGrade(t)).filter(([k]) => k !== "normal").map(([key, { label, color }]) => {
          const pct = Math.round(((stats[key] || 0) / total) * 100);
          return (
            <div key={key} style={{ background: C.card, borderRadius: 12, padding: "16px", textAlign: "center", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{stats[key] || 0}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{label}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{pct}%</div>
            </div>
          );
        })}
      </div>

      <CohortRetentionPanel t={t} />
      <ProductAffinityPanel t={t} />

      <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{t('crm.rfmListTit')}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f1f5f9" }}>
              {[t('crm.fName'), t('crm.colEmail'), "LTV", t('crm.colCnt'), t('crm.colLast'), t('crm.colGrade'), t('crm.colChurn', '이탈확률'), t('crm.colPredClv', '예측 CLV')].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {derivedCustomers.slice(0, 50).map((c, i) => {
                const g = getRfmGrade(t)[c.grade] || getRfmGrade(t).normal;
                // [240차 약점③] 이탈확률·예측CLV — 운영=백엔드 churn_prob/predicted_clv(단일소스). 데모=표시용 근사(recency/freq 기반, 샌드박스 전용).
                const { churn, clv } = predRowScore(c);
                const churnColor = churn >= 0.6 ? '#ef4444' : churn >= 0.35 ? '#f59e0b' : '#22c55e';
                // [현 차수] CLV 모델 배지 — 백엔드 clv_model('bgnbd'=BG/NBD 확률모델, 그 외=희소데이터 휴리스틱 폴백).
                const isBgnbd = c.clv_model === 'bgnbd';
                const clvBadge = isBgnbd
                  ? { text: 'BG/NBD', title: t('crm.clv.modelBgnbd', 'BG/NBD 예측 모델'), color: '#8b5cf6' }
                  : { text: 'Heuristic (sparse)', title: t('crm.clv.modelHeuristic', '휴리스틱(데이터 부족)'), color: '#94a3b8' };
                return (
                  <tr key={c.id || i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "#f1f5f9" : "transparent" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600 }}>{c.name || "-"}</td>
                    <td style={{ padding: "8px 14px", color: C.muted }}>{c.email}</td>
                    <td style={{ padding: "8px 14px", color: C.green, fontWeight: 700 }}>{fmt(c.ltv)}</td>
                    <td style={{ padding: "8px 14px" }}>{c.purchase_count || 0} {t('crm.unitTimes')}</td>
                    <td style={{ padding: "8px 14px", color: C.muted, fontSize: 12 }}>{c.last_purchase || "-"}</td>
                    <td style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }} ><span>{g.label}</span></td>
                    <td style={{ padding: "8px 14px", fontWeight: 700, color: churnColor }}>{churn != null ? Math.round(churn * 100) + '%' : '-'}</td>
                    <td style={{ padding: "8px 14px", color: '#8b5cf6', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{clv != null ? fmt(clv) : '-'}</span>
                        <span title={clvBadge.title} style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: `${clvBadge.color}1f`, color: clvBadge.color, border: `1px solid ${clvBadge.color}44`, whiteSpace: 'nowrap' }}>{clvBadge.text}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {derivedCustomers.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.muted }}>{t('crm.emptyCust')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Guide Tab (enterprise 패턴 — 183차 OrderHub/CatalogSync 정본 렌더러, NS=crm) ── */
function GuideTab() {
  const { t } = useI18n();
  const g = (k) => { const v = t('crm.' + k, ''); return (v && !String(v).includes('crm.')) ? v : ''; };
  const COLORS = ['#4f8ef7', '#22c55e', '#f59e0b', '#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#e11d48', '#06b6d4', '#0ea5e9', '#f97316'];
  const ICONS = ['🔗', '👥', '🏅', '🤖', '🏷️', '📊', '✉️', '🛤️', '📥', '🔄', '📈', '🛡️', '📦', '🔔', '🚀'];
  const steps = [];
  for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[i - 1], color: COLORS[(i - 1) % COLORS.length], n: i }); }
  const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
  const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
  const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
  const secTitle = { fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
  const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* 배너 + 배지 */}
      <div style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))", borderRadius: 16, border: "1px solid rgba(79,142,247,0.3)", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('crm.guideTitle')}</div>
        <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('crm.guideSub')}</div>
        {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 700, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
        </div>}
      </div>
      {/* 이 가이드에서 배우는 내용 */}
      {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
      {/* 이용 대상 */}
      {g('guideAudienceTitle') ? <div style={card}><div style={secTitle}>👥 {g('guideAudienceTitle')}</div><div style={pre}>{g('guideAudienceDesc')}</div></div> : null}
      {/* 어디서 시작 */}
      {g('guideWhereToStart') ? <div style={card}><div style={secTitle}>🧭 {g('guideWhereToStart')}</div><div style={pre}>{g('guideWhereToStartDesc')}</div></div> : null}
      {/* 단계별 운영 가이드 */}
      {steps.length > 0 && <div style={card}>
        {g('guideStepsTitle') ? <div style={secTitle}>{g('guideStepsTitle')}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
              <div>
                {s.phase ? <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>}
      {/* 전문가 팁 */}
      {tips.length > 0 && (
        <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
          <div style={secTitle}>💡 {t('crm.guideTipsTitle')}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#ffffff", border: "1px solid rgba(34,197,94,0.12)" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, WebkitTextFillColor: '#374151' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* FAQ */}
      {faqs.length > 0 && (
        <div style={card}>
          <div style={secTitle}>❓ {g('guideFaqTitle') || t('crm.guideFaqTitle', '자주 묻는 질문')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(241,245,249,0.6)', borderRadius: 10, border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#4f8ef7', marginBottom: 5, WebkitTextFillColor: '#4f8ef7' }}>Q. {f.q}</div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>A. {f.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 보안 및 권한 */}
      {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}><div style={secTitle}>🛡️ {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
      {/* 운영 권장 사항 */}
      {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🗓️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
      {/* 완료 CTA */}
      {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyTitle')}</div>
        <div style={{ fontSize: 13, color: '#374151', maxWidth: 640, margin: '8px auto 0', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>{g('guideReadyDesc')}</div>
      </div> : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   [255차 P1] 옴니채널 캠페인 탭 — 세그먼트 → 다채널 워터폴 비동기 발송
   ══════════════════════════════════════════════════════════════════════════════ */
const OMNI_CH_META = {
  whatsapp: { label: 'WhatsApp', icon: '🟢' },
  kakao:    { label: '카카오 알림톡', icon: '💬' },
  // [283차 P2-1] SMS 워터폴 정식 편입 — 백엔드 deliverWaterfall 에 발송코드가 있었으나 WATERFALL_CHANNELS/normalizeChannels 가
  //   sms 를 제거해 호출 0(데드코드)이었다. 이제 순서에 넣으면 실제로 SMS 로 폴백 발송된다.
  sms:      { label: 'SMS(문자)', icon: '📱' },
  email:    { label: '이메일', icon: '✉️' },
  // [283차 P2-3] 웹푸시 개인 타겟 — RFC8291 암호화 페이로드로 제목·본문·딥링크가 실제로 실린다(구독 결속 고객 한정).
  push:     { label: '웹푸시(개인)', icon: '🔔' },
};
/* [283차 P0] 캠페인 토픽 — 백엔드 PreferenceCenter::TOPICS 가 SSOT. 지정 시 해당 주제 수신거부 고객은 발송 제외. */
const OMNI_TOPICS = [
  { id: 'promo',      icon: '🏷️', ko: '프로모션·할인' },
  { id: 'newsletter', icon: '📰', ko: '뉴스레터·소식' },
  { id: 'product',    icon: '✨', ko: '신상품·업데이트' },
  { id: 'event',      icon: '🎪', ko: '이벤트·웨비나' },
];
/** 워터폴 순서를 고를 수 있는 채널(주소 지정형). line 은 브로드캐스트 전용이라 워터폴 편입 불가. */
const OMNI_WATERFALL = ['whatsapp', 'kakao', 'sms', 'email', 'push'];
function OmnichannelTab({ t, segments, addAlert }) {
  const [channels, setChannels] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [busy, setBusy] = useState(false);
  // 기본 채널 순서는 종전과 동일(whatsapp→kakao→email) — sms/push 는 사용자가 명시적으로 켤 때만 활성(회귀 0).
  const emptyForm = { name: '', segment_id: 0, channels: ['whatsapp', 'kakao', 'email'], email_subject: '', body: '', kakao_template_code: '', also_webpush: false, topic: '', sto: false, push_title: '', push_url: '' };
  const [form, setForm] = useState(emptyForm);

  const reload = useCallback(() => { crmApi.omniListCampaigns().then(r => setCampaigns(r.campaigns || [])).catch(() => {}); }, []);
  useEffect(() => { crmApi.omniChannels().then(r => setChannels(r.channels || {})).catch(() => setChannels({})); reload(); }, [reload]);

  const toggleCh = (ch) => setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  const moveCh = (ch, dir) => setForm(f => {
    const arr = [...f.channels]; const i = arr.indexOf(ch); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return f;
    [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...f, channels: arr };
  });

  const create = async () => {
    if (!form.name.trim()) { addAlert?.({ type: 'error', msg: t('crm.omniNeedName', '캠페인 이름을 입력하세요') }); return; }
    if (!form.channels.length) { addAlert?.({ type: 'error', msg: t('crm.omniNeedCh', '채널을 1개 이상 선택하세요') }); return; }
    // [283차 P0/P1] topic(주제 수신거부 강제) · sto(개인 최적시각) · push_* (웹푸시 실콘텐츠) 를 config 에 동봉.
    //   omni_campaigns.config(TEXT JSON) 재사용 → 스키마 변경 0. 백엔드 deliverWaterfall 이 게이트 입력으로 사용.
    const config = { email_subject: form.email_subject, email_body: form.body, whatsapp_body: form.body, kakao_content: form.body, sms_content: form.body, kakao_template_code: form.kakao_template_code, also_webpush: !!form.also_webpush, topic: form.topic || '', sto: !!form.sto, push_title: form.push_title || form.email_subject, push_body: form.body, push_url: form.push_url || '/' };
    try {
      await crmApi.omniCreateCampaign({ name: form.name, segment_id: Number(form.segment_id) || 0, channels: form.channels, config });
      addAlert?.({ type: 'success', msg: t('crm.omniCreated', '옴니채널 캠페인이 생성되었습니다') });
      setForm(emptyForm); reload();
    } catch (e) { addAlert?.({ type: 'error', msg: t('crm.omniCreateFail', '생성 실패') + ': ' + (e?.message || '') }); }
  };
  const send = async (id) => {
    setBusy(true);
    try {
      const r = await crmApi.omniSendCampaign(id);
      addAlert?.({ type: 'success', msg: t('crm.omniQueued', '발송 큐 적재') + `: ${r.queued ?? 0} · ${t('crm.omniFirstBatch', '즉시처리')} ${r.first_batch?.sent ?? 0}` });
      reload(); pollStats(id);
    } catch (e) { addAlert?.({ type: 'error', msg: t('crm.omniSendFail', '발송 실패') + ': ' + (e?.message || '') }); }
    finally { setBusy(false); }
  };
  const del = async (id) => { try { await crmApi.omniDeleteCampaign(id); reload(); setStats(s => { const n = { ...s }; delete n[id]; return n; }); } catch (e) {} };
  const pollStats = (id) => { crmApi.omniCampaignStats(id).then(r => setStats(s => ({ ...s, [id]: r }))).catch(() => {}); };

  const card = { background: C.card, borderRadius: 14, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 };
  const inputSt = { padding: '9px 11px', borderRadius: 9, border: `1px solid ${C.border}`, background: '#fff', color: '#0f172a', fontSize: 13, width: '100%' };

  return (
    <div>
      {/* 채널 자격 상태 — register-then-execute 안내 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>📡 {t('crm.omniChTitle', '연결 채널 상태')}</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{t('crm.omniChSub', '자격을 등록하면 즉시 해당 채널로 실발송됩니다(미설정 채널은 다음 채널로 자동 폴백).')}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['whatsapp', 'kakao', 'sms', 'email', 'webpush'].map(ch => {
            const st = channels?.[ch];
            const live = !!st?.live;
            const m = OMNI_CH_META[ch] || { label: ch === 'webpush' ? '웹 푸시' : ch, icon: '🔔' };
            return (
              <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: `1px solid ${live ? 'rgba(34,197,94,0.3)' : C.border}`, background: live ? 'rgba(34,197,94,0.06)' : '#f8fafc' }}>
                <span>{m.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{m.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: live ? '#16a34a' : '#94a3b8' }}>
                  {live ? `🟢 ${t('crm.omniLive', '라이브')}` : (ch === 'email' ? `🟢 ${t('crm.omniFallback', '폴백 가능')}` : `⚪ ${t('crm.omniUnset', '미설정')}`)}
                </span>
                {/* [283차] 웹푸시는 전체 구독수와 '개인 타겟 가능(고객 결속)' 구독수를 분리 표기(정직). */}
                {ch === 'webpush' && st?.subscribers != null && <span style={{ fontSize: 11, color: C.muted }}>({st.subscribers}{st?.targetable != null ? ` · ${t('crm.omniPushTargetable', '타겟가능')} ${st.targetable}` : ''})</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 캠페인 생성 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>➕ {t('crm.omniNew', '새 옴니채널 캠페인')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t('crm.omniName', '캠페인 이름')}</div>
            <input style={inputSt} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('crm.omniNamePh', '예) 6월 VIP 재구매 유도')} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t('crm.omniSeg', '대상 세그먼트')}</div>
            <select style={inputSt} value={form.segment_id} onChange={e => setForm({ ...form, segment_id: e.target.value })}>
              <option value={0}>{t('crm.omniAllCust', '전체 고객')}</option>
              {(segments || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.member_count ?? s.count ?? 0})</option>)}
            </select>
          </div>
        </div>

        {/* 채널 워터폴 순서 */}
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{t('crm.omniWaterfall', '채널 우선순위(위 채널 미도달/미설정 시 다음 채널로 폴백)')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {OMNI_WATERFALL.slice().sort((a, b) => {
            const ia = form.channels.indexOf(a), ib = form.channels.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
          }).map(ch => {
            const sel = form.channels.includes(ch); const m = OMNI_CH_META[ch];
            return (
              <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: sel ? '#fff' : '#f8fafc', opacity: sel ? 1 : 0.6 }}>
                <input type="checkbox" checked={sel} onChange={() => toggleCh(ch)} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{sel ? `${form.channels.indexOf(ch) + 1}. ` : ''}{m.icon} {m.label}</span>
                {sel && <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button onClick={() => moveCh(ch, -1)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 6, cursor: 'pointer', padding: '2px 7px' }}>▲</button>
                  <button onClick={() => moveCh(ch, 1)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 6, cursor: 'pointer', padding: '2px 7px' }}>▼</button>
                </span>}
              </div>
            );
          })}
        </div>

        {/* 콘텐츠 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t('crm.omniEmailSubj', '이메일 제목')}</div>
            <input style={inputSt} value={form.email_subject} onChange={e => setForm({ ...form, email_subject: e.target.value })} placeholder={t('crm.omniEmailSubjPh', '예) {{name}}님께 드리는 특별 혜택')} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t('crm.omniKakaoTpl', '카카오 템플릿 코드')}</div>
            <input style={inputSt} value={form.kakao_template_code} onChange={e => setForm({ ...form, kakao_template_code: e.target.value })} placeholder={t('crm.omniKakaoTplPh', '승인된 알림톡 템플릿 코드')} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{t('crm.omniBody', '메시지 본문(전 채널 공통 · {{name}} 치환)')}</div>
          <textarea style={{ ...inputSt, minHeight: 70, resize: 'vertical' }} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder={t('crm.omniBodyPh', '{{name}}님, 이번 주만 특별 할인 진행 중입니다!')} />
        </div>
        {/* [283차 P0] 콘텐츠 주제 — 지정 시 해당 주제를 수신거부한 고객에게는 전 채널 발송이 차단된다(선호센터 연동). */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{t('crm.omniTopic', '콘텐츠 주제 — 지정 시 해당 주제 수신거부 고객은 자동 제외됩니다')}</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setForm({ ...form, topic: '' })}
              style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                border: form.topic === '' ? '2px solid #64748b' : `1px solid ${C.border}`,
                background: form.topic === '' ? 'rgba(100,116,139,0.10)' : '#f8fafc', color: form.topic === '' ? '#475569' : '#94a3b8' }}>
              {t('crm.omniTopicNone', '주제 없음')}
            </button>
            {OMNI_TOPICS.map(tp => { const sel = form.topic === tp.id; return (
              <button key={tp.id} type="button" onClick={() => setForm({ ...form, topic: sel ? '' : tp.id })}
                style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: sel ? '2px solid #2563eb' : `1px solid ${C.border}`,
                  background: sel ? 'rgba(37,99,235,0.10)' : '#f8fafc', color: sel ? '#1d4ed8' : '#64748b' }}>
                {tp.icon} {t('crm.omniTopic_' + tp.id, tp.ko)}
              </button>
            ); })}
          </div>
        </div>
        {/* [283차 P1] STO — ON 시 수신자별 과거 참여 최빈시각까지 아웃박스에 보류했다가 그 시각에 발송(드롭 없음·cron 재시도). */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0f172a', marginBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.sto} onChange={e => setForm({ ...form, sto: e.target.checked })} />
          ⏰ {t('crm.omniSto', '개인별 최적 발송시간(STO) — 수신자 참여 최빈 시각에 자동 발송')}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0f172a', marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.also_webpush} onChange={e => setForm({ ...form, also_webpush: e.target.checked })} />
          🔔 {t('crm.omniAlsoPush', '웹 푸시 동시 발송(구독자 전체)')}
        </label>
        <button onClick={create} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>{t('crm.omniCreate', '캠페인 생성')}</button>
      </div>

      {/* 캠페인 목록 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>📋 {t('crm.omniList', '옴니채널 캠페인')}</div>
        {campaigns.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>{t('crm.omniEmpty', '생성된 캠페인이 없습니다')}</div>}
        {campaigns.map(c => {
          const s = stats[c.id];
          return (
            <div key={c.id} style={{ padding: '12px 14px', borderRadius: 11, border: `1px solid ${C.border}`, marginBottom: 8, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{(c.channels || []).map(ch => OMNI_CH_META[ch]?.icon || '').join(' ')}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{c.segment_name || t('crm.omniAllCust', '전체 고객')}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: c.status === 'sent' ? 'rgba(34,197,94,0.1)' : c.status === 'sending' ? 'rgba(59,130,246,0.1)' : '#f1f5f9', color: c.status === 'sent' ? '#16a34a' : c.status === 'sending' ? '#2563eb' : '#64748b', fontWeight: 700 }}>{c.status}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button disabled={busy} onClick={() => send(c.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🚀 {t('crm.omniSend', '발송')}</button>
                  <button onClick={() => pollStats(c.id)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🔄</button>
                  <button onClick={() => del(c.id)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>🗑</button>
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>{t('crm.omniTotal', '대상')}: <b style={{ color: '#0f172a' }}>{c.total ?? 0}</b></span>
                <span>{t('crm.omniSent', '발송')}: <b style={{ color: '#16a34a' }}>{c.sent ?? 0}</b></span>
                <span>{t('crm.omniSkipped', '건너뜀')}: <b style={{ color: '#94a3b8' }}>{c.skipped ?? 0}</b></span>
                <span>{t('crm.omniFailed', '실패')}: <b style={{ color: '#ef4444' }}>{c.failed ?? 0}</b></span>
                {s && <span>{t('crm.omniProgress', '진행률')}: <b style={{ color: '#2563eb' }}>{s.progress_done ?? 0}%</b></span>}
                {s?.by_channel && Object.keys(s.by_channel).length > 0 && <span>{t('crm.omniByCh', '채널별')}: {Object.entries(s.by_channel).map(([k, v]) => `${OMNI_CH_META[k]?.label || k} ${v}`).join(', ')}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN CRM CONTENT
   ══════════════════════════════════════════════════════════════════════════════ */
function CRMContent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fmt = useCurrencyFmt();

  /* ── GlobalDataContext + Security ── */
  const { crmCustomerHistory, crmSegments, setCrmSegments, addAlert, broadcastUpdate } = useGlobalData();
  const [secLocked, setSecLocked] = useState(false);
  useSecurityGuard({
    addAlert: useCallback((a) => {
      if (typeof addAlert === 'function') addAlert(a);
      if (a?.severity === 'critical') setSecLocked(true);
    }, [addAlert]),
    enabled: true,
  });

  /* ── BroadcastChannel ── */
  const bcRef = useRef(null);
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel(tChannelName('geniego_crm'));
      // [270차 수정] 과거 빈 본문 → 크로스탭 CRM_REFRESH 수신해도 no-op(타 탭 미갱신). 운영 리로드 배선.
      bcRef.current.onmessage = (ev) => { if (ev.data?.type === 'CRM_REFRESH' && !IS_DEMO) { reloadOpCustomers(); reloadOpSegments(); reloadOpRfm(); } };
    } catch {}
    return () => { try { bcRef.current?.close(); } catch {} };
  }, []);
  const broadcastRefresh = useCallback(() => {
    try { bcRef.current?.postMessage({ type: 'CRM_REFRESH', ts: Date.now() }); } catch {}
    if (typeof broadcastUpdate === 'function') broadcastUpdate('crm', { refreshed: Date.now() });
  }, [broadcastUpdate]);

  /* ── Derived Customers ── */
  const derivedCustomers = useMemo(() => {
    return Object.entries(crmCustomerHistory).map(([key, hsts]) => {
      const totalLtv = hsts.reduce((sum, h) => sum + h.total, 0);
      const lastPurchase = hsts[0]?.at?.slice(0, 10);
      let grade = 'normal';
      if (totalLtv > 500000) grade = 'champions';
      else if (totalLtv > 200000) grade = 'loyal';
      else if (totalLtv > 0 && hsts.length === 1) grade = 'new';
      return { id: key, name: key, email: key.includes('@') ? key : `${key}@mail.example`, phone: "-", grade, ltv: totalLtv, purchase_count: hsts.length, last_purchase: lastPurchase, tags: [] };
    });
  }, [crmCustomerHistory]);

  const [manualCustomers, setManualCustomers] = useState([]);

  /* ── 191차 4단계: 운영=백엔드(/api/crm/*) 실배선, 데모=주문이력 파생+로컬 유지 ── */
  const [opCustomers, setOpCustomers] = useState([]);
  const [opStats, setOpStats] = useState(null); // [현 차수 P1] 서버 전체집계(총/활성/총LTV) — 100행 캡 언더카운트 해소
  const [opSegments, setOpSegments] = useState([]);
  const [opRfm, setOpRfm] = useState([]);
  const [opPanelActs, setOpPanelActs] = useState([]);
  const [opPanelTimeline, setOpPanelTimeline] = useState([]); // [257차] 360 전체 활동 타임라인(전 유형)
  const mapCust = (r) => ({ id: r.id, name: r.name || '', email: r.email || '', phone: r.phone || '-', grade: r.grade || 'normal', ltv: Number(r.ltv || 0), purchase_count: Number(r.purchase_count || 0), last_purchase: (r.last_purchase || '').slice(0, 10), tags: Array.isArray(r.tags) ? r.tags : [] });
  const reloadOpCustomers = useCallback(() => {
    crmApi.listCustomers("", 1, 100).then(r => setOpCustomers((r.customers || []).map(mapCust))).catch(() => {});
    crmApi.stats().then(s => setOpStats(s || null)).catch(() => {}); // 전체 KPI는 서버집계 사용
  }, []);
  const reloadOpSegments = useCallback(() => { crmApi.listSegments().then(r => setOpSegments((r.segments || []).map(s => ({ ...s, count: Number(s.member_count || 0) })))).catch(() => {}); }, []);
  const reloadOpRfm = useCallback(() => { crmApi.rfm().then(r => setOpRfm((r.customers || []).map(c => ({ id: c.id, name: c.name || '', email: c.email || '', phone: '-', grade: c.rfm_grade || 'normal', ltv: Number(c.monetary || 0), purchase_count: Number(c.frequency || 0), last_purchase: (c.last_purchase || '').slice(0, 10), churn_prob: c.churn_prob, predicted_clv: c.predicted_clv, clv_model: c.clv_model, tags: [] })))).catch(() => {}); }, []); // [240차 약점③] 예측형 CDP: 백엔드 churn_prob/predicted_clv/clv_model(BG/NBD·단일소스) 전달
  useEffect(() => { if (IS_DEMO) return; reloadOpCustomers(); reloadOpSegments(); reloadOpRfm(); }, [reloadOpCustomers, reloadOpSegments, reloadOpRfm]);

  const customers = useMemo(() => (
    IS_DEMO ? [...derivedCustomers, ...manualCustomers].sort((a, b) => b.ltv - a.ltv) : [...opCustomers].sort((a, b) => b.ltv - a.ltv)
  ), [derivedCustomers, manualCustomers, opCustomers]);
  const segments = IS_DEMO ? crmSegments : opSegments;
  const rfmList = IS_DEMO ? customers : opRfm;

  const [tab, setTab] = useState("customers");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "", grade: "normal", tags: "" });
  const PER_PAGE = 20;

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PER_PAGE));
  const pageCustomers = filteredCustomers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const saveCustomer = async () => {
    const tags = form.tags ? form.tags.split(",").map(tx => tx.trim()).filter(Boolean) : [];
    if (IS_DEMO) {
      setManualCustomers(prev => [{ ...form, id: form.email, ltv: 0, purchase_count: 0, tags }, ...prev]);
    } else {
      try { await crmApi.createCustomer({ email: form.email, name: form.name, phone: form.phone, grade: form.grade, tags }); reloadOpCustomers(); }
      catch (e) { addAlert?.({ type: 'error', msg: '고객 등록 실패: ' + (e?.message || '') }); return; }
    }
    setShowForm(false); setForm({ email: "", name: "", phone: "", grade: "normal", tags: "" });
    broadcastRefresh();
  };

  const deleteCustomer = async (id) => {
    if (IS_DEMO) { setManualCustomers(prev => prev.filter(c => c.id !== id)); }
    else { try { await crmApi.deleteCustomer(id); reloadOpCustomers(); reloadOpRfm(); } catch (e) { addAlert?.({ type: 'error', msg: '삭제 실패: ' + (e?.message || '') }); return; } }
    setSelectedCustomer(null);
    broadcastRefresh();
  };

  // 운영: 고객 선택 시 360°(getCustomer) 활동을 패널용으로 매핑(데모는 주문이력 사용)
  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    if (!IS_DEMO && c?.id != null) {
      setOpPanelActs([]); setOpPanelTimeline([]);
      crmApi.getCustomer(c.id).then(r => {
        const all = r.activities || [];
        setOpPanelActs(all.filter(a => a.type === 'purchase' || a.amount).map(a => ({ ch: a.channel || 'Web', total: Number(a.amount || 0), at: (a.created_at || '').slice(0, 16) })));
        // [257차] 360 전체 활동 타임라인 — 구매만이 아닌 전 접점(이메일/카카오/SMS/세그먼트/가입 등) 시간순.
        setOpPanelTimeline(all.map(a => ({ type: a.type || 'event', ch: a.channel || '', amount: Number(a.amount || 0), at: (a.created_at || '').slice(0, 16) })));
      }).catch(() => {});
    }
  };

  // 세그먼트 저장/삭제(데모=로컬, 운영=백엔드)
  const onSaveSegment = async (segForm) => {
    if (IS_DEMO) { setCrmSegments(prev => [...prev, { id: "seg_" + Date.now(), ...segForm, count: 0 }]); }
    else { try { await crmApi.createSegment(segForm); reloadOpSegments(); } catch (e) { addAlert?.({ type: 'error', msg: '세그먼트 생성 실패: ' + (e?.message || '') }); } }
  };
  const onDeleteSegment = async (id) => {
    if (IS_DEMO) { setCrmSegments(prev => prev.filter(s => s.id !== id)); }
    else { try { await crmApi.deleteSegment(id); reloadOpSegments(); } catch (e) { addAlert?.({ type: 'error', msg: '세그먼트 삭제 실패: ' + (e?.message || '') }); } }
  };
  // [240차 동기화] 세그먼트 멤버십 재계산 — member_count/멤버십은 생성·시드 시점 스냅샷이라 신규 구매 누적 시 stale.
  //   백엔드 refreshSegment(POST /crm/segments/{id}/refresh)가 존재했으나 프론트 호출처가 없어(고아) 사용자가
  //   재동기화할 수단이 없었다. 카드별 새로고침으로 멤버십·카운트를 실데이터 기준 재계산(캠페인 발송 대상 정합).
  const onRefreshSegment = async (id) => {
    if (IS_DEMO) { addAlert?.({ type: 'info', msg: '데모에서는 멤버십이 시뮬레이션됩니다.' }); return; }
    try { const r = await crmApi.refreshSegment(id); reloadOpSegments(); addAlert?.({ type: 'success', msg: `세그먼트 멤버십 재계산 완료 (${r?.member_count ?? '-'}명)` }); }
    catch (e) { addAlert?.({ type: 'error', msg: '세그먼트 새로고침 실패: ' + (e?.message || '') }); }
  };
  // [239차+ CDP] 표준 행동 세그먼트 원클릭 생성(VIP/충성/신규/이탈위험/휴면). 실 구매 데이터로 자동 멤버십.
  const onSmartSeed = async () => {
    try {
      const d = await crmApi.smartSeedSegments();
      if (IS_DEMO) reloadOpSegments?.(); else reloadOpSegments();
      addAlert?.({ type: 'success', msg: `스마트 세그먼트 ${(d?.created || []).length}개 생성 (이미 있으면 건너뜀)` });
    } catch (e) { addAlert?.({ type: 'error', msg: '스마트 세그먼트 생성 실패: ' + (e?.message || '') }); }
  };

  // [현 차수] 아이덴티티 재해석 — email/phone/kakao 교차 union-find 병합(테넌트 단위). 병합 건수 안내 후 목록 재적재.
  const [resolvingId, setResolvingId] = useState(false);
  const onResolveIdentities = async () => {
    if (IS_DEMO) { addAlert?.({ type: 'info', msg: t('crm.identityDemo', '데모에서는 아이덴티티 병합이 시뮬레이션됩니다.') }); return; }
    setResolvingId(true);
    try {
      const r = await _pjaCrm('/api/crm/identity/resolve', {});
      const merged = Number(r?.merged ?? r?.merged_count ?? r?.merges ?? r?.linked ?? 0);
      addAlert?.({ type: 'success', msg: `${t('crm.identityResolved', '아이덴티티 병합 완료')}: ${merged}` });
      reloadOpCustomers(); reloadOpRfm();
    } catch (e) { addAlert?.({ type: 'error', msg: t('crm.identityFail', '아이덴티티 재해석 실패') + ': ' + (e?.message || '') }); }
    finally { setResolvingId(false); }
  };

  // [282차 R3] 확률 매칭 후보 — read-only 조회 → 관리자가 쌍별 승인(병합)/무시. 자동병합 없음(오병합=LTV오염 방지).
  const [cands, setCands] = useState(null);   // null=미조회, []=조회했지만 없음
  const [loadingCands, setLoadingCands] = useState(false);
  const [mergingKey, setMergingKey] = useState('');
  const REASON_LABEL = {
    email_local_exact: t('crm.idReasonEmailExact', '이메일 아이디 동일(도메인만 다름)'),
    email_local_similar: t('crm.idReasonEmailSim', '이메일 아이디 유사'),
    phone_suffix: t('crm.idReasonPhone', '전화 뒷자리 일치(국가코드 차이 추정)'),
    name_exact: t('crm.idReasonNameExact', '이름 동일'),
    name_similar: t('crm.idReasonNameSim', '이름 유사'),
  };
  const loadCandidates = async () => {
    if (IS_DEMO) { addAlert?.({ type: 'info', msg: t('crm.identityDemo', '데모에서는 아이덴티티 병합이 시뮬레이션됩니다.') }); return; }
    setLoadingCands(true);
    try {
      const r = await _gjaCrm('/api/crm/identity/candidates');
      setCands(Array.isArray(r?.candidates) ? r.candidates : []);
    } catch (e) { setCands([]); addAlert?.({ type: 'error', msg: t('crm.idCandFail', '후보 조회 실패') + ': ' + (e?.message || '') }); }
    finally { setLoadingCands(false); }
  };
  const approveMerge = async (c) => {
    const key = `${c.a.id}-${c.b.id}`; setMergingKey(key);
    try {
      await _pjaCrm('/api/crm/identity/merge', { a_id: c.a.id, b_id: c.b.id, score: c.score });
      setCands(list => (list || []).filter(x => `${x.a.id}-${x.b.id}` !== key));
      addAlert?.({ type: 'success', msg: t('crm.idMerged', '병합 완료 — 두 고객이 한 사람으로 통합되었습니다') });
      reloadOpCustomers(); reloadOpRfm();
    } catch (e) { addAlert?.({ type: 'error', msg: t('crm.idMergeFail', '병합 실패') + ': ' + (e?.message || '') }); }
    finally { setMergingKey(''); }
  };
  const dismissCand = (key) => setCands(list => (list || []).filter(x => `${x.a.id}-${x.b.id}` !== key));

  const handleExportCsv = async () => {
    const headers = [t('crm.fName'), t('crm.colEmail'), t('crm.colPhone'), t('crm.colGrade'), 'LTV', t('crm.colCnt'), t('crm.colLast')];
    // [현 차수 P1] 운영 CSV는 전건 수집(page 루프) — 목록 100행 캡으로 잘려 내보내던 문제 해소. 데모는 로컬 전건.
    let src = customers;
    if (!IS_DEMO) {
      try { const all = await crmApi.listAllCustomers(); src = (all.customers || []).map(mapCust); } catch { src = customers; }
    }
    const rows = src.map(c => [c.name, c.email, c.phone, c.grade, c.ltv, c.purchase_count, c.last_purchase || '']);
    downloadCsv(headers, rows, `crm_customers_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const TABS = [
    { id: "customers", label: t('crm.tabCust') },
    { id: "ai_segments", label: t('crm.tabAiSeg') },
    { id: "segments", label: t('crm.tabManSeg') },
    { id: "omni", label: `📡 ${t('crm.tabOmni', '옴니채널')}` },
    { id: "rfm", label: t('crm.tabRfm') },
    { id: "deliverability", label: t('crm.tabDeliver', '딜리버러빌리티') },
    { id: "cs", label: `🎧 ${t('crm.tabCs', 'CS 지원')}` },
    { id: "guide", label: t('crm.tabGuide') },
  ];

  // [237차] CRM 위저드 필수등록 게이팅 — 실제 상태 검증(미완 시 차단). null=시스템 자동확인.
  const crmChecks = useMemo(() => {
    const cnt = async (ep, keys) => { try { const r = await _gjaCrm(ep); for (const k of keys) { if (Array.isArray(r?.[k])) return r[k].length > 0; } return Array.isArray(r) ? r.length > 0 : false; } catch { return false; } };
    return [
      null,                                                                  // 0 로그인
      async () => cnt('/api/crm/customers', ['customers', 'items', 'rows', 'data']), // 1 ★고객 1명 이상 등록 필수
      async () => cnt('/api/crm/segments', ['segments', 'items', 'rows']),          // 2 ★세그먼트 1개 이상 필수
      null,                                                                  // 3 캠페인 메시지(자동)
      null,                                                                  // 4 발송·자동화(자동)
      null,                                                                  // 5 성과 분석(자동)
    ];
  }, []);

  // [현 차수 P1] 운영 전체 KPI는 서버집계(opStats) 사용 — 목록 100행 캡으로 언더카운트되던 문제 해소.
  //   데모는 파생 전건이 로컬에 있어 그대로 집계. 서버집계 미로드 시 목록 폴백(회귀 0).
  const displayStats = (!IS_DEMO && opStats) ? {
    total: Number(opStats.total ?? opStats.total_customers ?? customers.length),
    active_30d: Number(opStats.active ?? opStats.active_30d ?? customers.filter(c => c.purchase_count > 0).length),
    total_ltv: Number(opStats.total_ltv ?? customers.reduce((sum, c) => sum + c.ltv, 0)),
  } : {
    total: customers.length,
    active_30d: customers.filter(c => c.purchase_count > 0).length,
    total_ltv: customers.reduce((sum, c) => sum + c.ltv, 0),
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
      {secLocked && <SecurityLockModal t={t} onDismiss={() => setSecLocked(false)} />}
      <AIRecommendBanner context="crm" />

      {/* Connected Channels */}
      <ConnectedChannelsBadge t={t} />

      {/* Live Sync Status */}
      <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', fontSize: 10, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        {t('crm.liveSyncStatus')}
      </div>

      {/* Hero */}
      <div className="page-hero" style={{ borderRadius: 16, background: '#f1f5f9', border: `1px solid ${C.border}`, padding: "13px 24px", marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="section-title" style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{t('crm.pageTitle')}</div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{t('crm.pageSub')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { broadcastRefresh(); if (!IS_DEMO) { reloadOpCustomers(); reloadOpSegments(); reloadOpRfm(); } }} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>🔄 {t('crm.syncNow')}</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon="👥" label={t('crm.statTot')} value={displayStats.total.toLocaleString()} color={C.accent} />
        <StatCard icon="🔥" label={t('crm.statAct')} value={displayStats.active_30d.toLocaleString()} color={C.green} />
        <StatCard icon="💰" label={t('crm.statLtv')} value={fmt(displayStats.total_ltv)} color="#38bdf8" />
        <StatCard icon="🏷" label={t('crm.statSeg')} value={segments.length} color={C.yellow} />
      </div>

      {/* [현 차수] 특정상품 조회 — 전역 동기화. 선택 시 그 상품 매출·구매자·채널/국가별 인라인. */}
      <ProductSelectBar />
      <ProductMarketingPanel period="monthly" />

      {/* Tabs — [240차] page-subtabs: 스크롤 시 상단 고정(sticky), 아래 콘텐츠 스크롤 */}
      <div className="page-subtabs" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(tOption => (
          <button key={tOption.id} onClick={() => setTab(tOption.id)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === tOption.id ? C.accent : C.card, color: tab === tOption.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13 }}>{tOption.label}</button>
        ))}
        {tab === "customers" && (
          <>
            <button onClick={handleExportCsv} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📥 {t('crm.exportCsv')}</button>
            <button onClick={onResolveIdentities} disabled={resolvingId} title={t('crm.identity.title', '통합 고객 아이덴티티')} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.purple}55`, background: `${C.purple}12`, color: C.purple, fontWeight: 700, cursor: resolvingId ? "default" : "pointer", fontSize: 13, opacity: resolvingId ? 0.6 : 1 }}>🪪 {resolvingId ? '…' : t('crm.identity.resolve', '아이덴티티 재해석')}</button>
            <button onClick={loadCandidates} disabled={loadingCands} title={t('crm.idCandTitle', '이름·이메일·전화 유사도로 동일인 추정 쌍을 찾아 관리자 승인 후 병합')} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.accent}55`, background: `${C.accent}12`, color: C.accent, fontWeight: 700, cursor: loadingCands ? "default" : "pointer", fontSize: 13, opacity: loadingCands ? 0.6 : 1 }}>🔗 {loadingCands ? '…' : t('crm.idCandBtn', '확률 매칭 후보')}</button>
            <button onClick={() => setShowForm(f => !f)} data-onboard-cta="crm-customer" data-onboard-hint={t('crm.onboardHint', '여기서 첫 고객을 추가하세요')} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 10, border: "none", background: C.green, color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ {t('crm.btnRegister')}</button>
          </>
        )}
      </div>

      {/* [282차 R3] 확률 매칭 후보 검토 — 관리자가 쌍별 승인/무시(자동병합 없음) */}
      {tab === "customers" && cands != null && (
        <div style={{ background: C.card, borderRadius: 14, padding: 18, marginBottom: 20, border: `1px solid ${C.accent}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ fontWeight: 800, color: C.text }}>🔗 {t('crm.idCandHdr', '확률 매칭 후보 (동일인 추정)')}</div>
            <span style={{ fontSize: 12, color: C.muted }}>{cands.length}{t('crm.idCandCount', '쌍')}</span>
            <button onClick={() => setCands(null)} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 11.5, cursor: 'pointer' }}>{t('common.close', '닫기')}</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>{t('crm.idCandDesc', '이름·이메일·전화 유사도로 동일인일 가능성이 높은 쌍입니다. 확인 후 [병합]하면 두 고객이 한 사람으로 통합되어 LTV·세그먼트가 합산됩니다. 자동 병합은 하지 않으며, 잘못 병합해도 고객 상세에서 되돌릴 수 있습니다.')}</div>
          {cands.length === 0
            ? <div style={{ fontSize: 12.5, color: C.muted, padding: '10px 0' }}>{t('crm.idCandEmpty', '병합 후보가 없습니다. (이미 통합됐거나 유사 쌍이 없음)')}</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cands.map((c) => {
                  const key = `${c.a.id}-${c.b.id}`;
                  const sc = Math.round((c.score || 0) * 100);
                  const scColor = sc >= 85 ? '#16a34a' : sc >= 70 ? '#d97706' : '#64748b';
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: scColor, minWidth: 52, textAlign: 'center' }}>{sc}%</div>
                      <div style={{ flex: 1, minWidth: 220, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {[c.a, c.b].map((m, mi) => (
                          <React.Fragment key={m.id}>
                            {mi === 1 && <span style={{ color: C.muted, fontSize: 16 }}>⇄</span>}
                            <div style={{ fontSize: 12 }}>
                              <div style={{ color: C.text, fontWeight: 700 }}>{m.name || '(무명)'} <span style={{ color: C.muted, fontWeight: 400 }}>#{m.id}</span></div>
                              <div style={{ color: C.muted }}>{m.email || '—'}{m.phone ? ` · ${m.phone}` : ''}</div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 260 }}>
                        {(c.reasons || []).map(rz => <span key={rz} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: `${C.accent}14`, color: C.accent }}>{REASON_LABEL[rz] || rz}</span>)}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                        <button onClick={() => approveMerge(c)} disabled={mergingKey === key} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: mergingKey === key ? '#cbd5e1' : C.green, color: '#fff', fontWeight: 700, fontSize: 12, cursor: mergingKey === key ? 'default' : 'pointer' }}>{mergingKey === key ? '…' : t('crm.idMergeBtn', '병합')}</button>
                        <button onClick={() => dismissCand(key)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{t('crm.idDismiss', '무시')}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* Customer Registration Form */}
      {showForm && tab === "customers" && (
        <div style={{ background: C.card, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>{t('crm.formNew')}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[[t('crm.fEmail'), "email", "email@example.com"], [t('crm.fName'), "name", "John Doe"], [t('crm.fPhone'), "phone", "010-0000-0000"]].map(([label, key, placeholder]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('crm.fGrade')}</div>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                <option value="normal">{t('crm.fGradeGen')}</option>
                <option value="loyal">{t('crm.gLoyal')}</option>
                <option value="champions">{t('crm.gChamp')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={saveCustomer} disabled={!form.email} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: C.accent, color: '#ffffff', fontWeight: 700, cursor: "pointer" }}>{t('crm.btnSave')}</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 22px", borderRadius: 9, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer" }}>{t('crm.btnCancel')}</button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {tab === "customers" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('crm.fSearch')}
              style={{ flex: 1, padding: "9px 14px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
          <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                {[t('crm.fName'), t('crm.colEmail'), t('crm.colPhone'), t('crm.colGrade'), t('crm.colLtv', 'LTV'), t('crm.colCnt'), t('crm.colLast'), ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pageCustomers.map((c, i) => {
                  const g = getRfmGrade(t)[c.grade] || getRfmGrade(t).normal;
                  return (
                    <tr key={c.id} onClick={() => selectCustomer(c)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 ? "#f1f5f9" : "transparent", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "#f1f5f9" : "transparent"}>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{c.name || "-"}</td>
                      <td style={{ padding: "10px 16px", color: C.muted }}>{c.email}</td>
                      <td style={{ padding: "10px 16px", color: C.muted }}>{c.phone || "-"}</td>
                      <td style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }} ><span>{g.label}</span></td>
                      <td style={{ padding: "10px 16px", color: C.green, fontWeight: 700 }}>{fmt(c.ltv)}</td>
                      <td style={{ padding: "10px 16px" }}>{c.purchase_count || 0} {t('crm.unitTimes')}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: C.muted }}>{c.last_purchase || "-"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 11, color: C.accent }} ><span>{t('crm.tDetail')}</span></td>
                    </tr>
                  );
                })}
                {customers.length === 0 && <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: C.muted }}>{t('crm.emptyCust')}</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: page <= 1 ? 'rgba(0,0,0,0.2)' : C.accent, cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 700, fontSize: 12 }}>{t('crm.prev')}</button>
              <span style={{ fontSize: 12, color: C.muted }}>{t('crm.page')} {page} {t('crm.of')} {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: page >= totalPages ? 'rgba(0,0,0,0.2)' : C.accent, cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 700, fontSize: 12 }}>{t('crm.next')}</button>
            </div>
          )}
        </>
      )}

      {tab === "segments" && <SegmentsTab segments={segments} onSave={onSaveSegment} onDelete={onDeleteSegment} onSmartSeed={onSmartSeed} onRefresh={onRefreshSegment} />}
      {tab === "omni" && <OmnichannelTab t={t} segments={segments} addAlert={addAlert} />}
      {tab === "rfm" && <RFMTab derivedCustomers={rfmList} />}
      {tab === "deliverability" && <DeliverabilityTab t={t} />}
      {tab === "cs" && <CsMetricsTab t={t} />}
      {tab === "ai_segments" && <AISegmentsTab navigate={navigate} derivedCustomers={customers} />}
      {tab === "guide" && (
        <>
          <div style={{ background: "var(--card-bg,#fff)", border: "1px solid var(--border,#e2e8f0)", borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
            <GuideWizard guideKey="crm" checks={crmChecks} />
          </div>
          <GuideTab />
        </>
      )}

      <CustomerPanel
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        timeline={IS_DEMO
          ? ((selectedCustomer ? (crmCustomerHistory[selectedCustomer.id] || []) : []).map(a => ({ type: 'purchase', ch: a.ch || 'Web', amount: Number(a.total || 0), at: a.at })))
          : opPanelTimeline}
        crmCustomerHistory={IS_DEMO ? crmCustomerHistory : (selectedCustomer ? { [selectedCustomer.id]: opPanelActs } : {})}
        onDelete={deleteCustomer}
        onSendEmail={c => navigate(`/email-marketing?prefill_email=${encodeURIComponent(c.email)}`)}
        onSendKakao={c => navigate(`/kakao-channel?prefill_phone=${encodeURIComponent(c.phone || "")}`)}
      />
    </div>
  );
}

export default function CRM() {
  return (
    <PlanGate feature="crm">
      <CRMContent />
    </PlanGate>
  );
}
