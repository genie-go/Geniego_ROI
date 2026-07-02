import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { useI18n } from "../i18n/index.js";
import { INF_GUIDE } from "./infGuideI18n.js";
import InfluencerDemographics, { DEFAULT_GRAPHICS } from '../components/InfluencerDemographics.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useSecurityGuard as useEnterpriseSecurity } from '../security/SecurityGuard.js';
import { postJson, getJsonAuth } from '../services/apiClient.js';
import { IS_DEMO } from '../utils/demoEnv';
import { attributionBadge, deriveActivationType, ACTIVATION_META, measurability, costBreakdown, deriveObjective, OBJECTIVE_META, OBJECTIVE_WEIGHTS, computePerformanceScore, channelBreakdown } from '../utils/influencerAttribution.js';
import { ingestStatus } from '../services/influencerIngest.js';


// currency formatting via useCurrency fmt()
const fmtM = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(v);
const pct = v => (Number(v) * 100).toFixed(1) + "%";
const today = new Date();
const daysLeft = d => Math.ceil((new Date(d) - today) / (864e5));

/* ══════════════════════════════════════════════════════════════════
   방어: creator 정규화
   운영 모드에서 creators 는 백엔드(/v423/influencer/creators)가 반환하는
   "사용자가 저장한 그대로의 JSON" — 중첩 필드(identities/contract/settle/
   stats/content)가 누락된 객체가 한 건이라도 섞이면 다수 탭의 직접 접근
   (c.identities.length, c.contract.esign, c.settle.status, c.content.map …)이
   런타임 크래시(흰화면)를 일으킨다. 유입 직후 안전 기본값으로 정규화한다.
   가짜데이터는 주입하지 않음 — 누락 필드만 빈/0 기본값으로 채운다.
══════════════════════════════════════════════════════════════════ */
function _normAttr(a) {
    const at = a || {};
    const method = at.method || (at.couponCode || at.utmSource ? 'tracked' : 'manual');
    return {
        method,
        couponCode: at.couponCode ?? null,
        utmSource: at.utmSource ?? null,
        trackingUrl: at.trackingUrl ?? null,
        measured: at.measured ?? (method === 'tracked'),
        signal: at.signal ?? null,
        matchedOrders: Number(at.matchedOrders) || 0,
        matchedRevenue: Number(at.matchedRevenue) || 0,
    };
}

function normalizeCreator(c) {
    const o = c || {};
    const ct = o.contract || {};
    const st = o.settle || {};
    const stat = o.stats || {};
    return {
        ...o,
        id: o.id ?? '',
        name: o.name ?? '',
        tier: o.tier ?? '',
        duplicateFlag: !!o.duplicateFlag,
        identities: Array.isArray(o.identities) ? o.identities : [],
        content: Array.isArray(o.content) ? o.content : [],
        contract: {
            type: ct.type ?? 'flat',
            flatFee: Number(ct.flatFee) || 0,
            perfRate: Number(ct.perfRate) || 0,
            perfBase: ct.perfBase ?? 'none',
            rights: typeof ct.rights === 'string' ? ct.rights : '',
            period: Array.isArray(ct.period) ? ct.period : ['', ''],
            whitelist: !!ct.whitelist,
            whitelistExpiry: ct.whitelistExpiry ?? null,
            esign: ct.esign ?? 'pending',
        },
        settle: {
            status: st.status ?? 'unpaid',
            paid: Number(st.paid) || 0,
            period: st.period ?? '',
            docs: Array.isArray(st.docs) ? st.docs : [],
        },
        stats: {
            views: Number(stat.views) || 0,
            orders: Number(stat.orders) || 0,
            revenue: Number(stat.revenue) || 0,
            adSpend: Number(stat.adSpend) || 0,
            engagement: Number(stat.engagement) || 0,
        },
        attribution: _normAttr(o.attribution),
        activationType: o.activationType || null,
        objective: o.objective || null,
    };
}

/** 모든 탭이 공유하는 안전 정규화된 creators 훅 */
function useSafeCreators() {
    const { creators } = useGlobalData();
    return useMemo(
        () => (Array.isArray(creators) ? creators.map(normalizeCreator) : []),
        [creators]
    );
}


const Tag = memo(({ label, color = "#4f8ef7", bg }) => (
    <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
        background: bg || color + "18", color, border: `1px solid ${color}33`
    }}>{label}</span>
));

const Bar = memo(({ v, max = 1, color = "#4f8ef7", h = 4 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.06)", borderRadius: h, width: "100%" }}>
        <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width .5s" }} />
    </div>
));

const KpiCard = memo(({ label, value, sub, color = "#4f8ef7", icon }) => (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "11px 16px", display: "flex", alignItems: "center", gap: 14 }}>
        {icon && <span style={{ fontSize: 22, opacity: .7, flex: "0 0 auto" }}>{icon}</span>}
        <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color }}>{value}</div>
            <div style={{ fontSize: 10, color:"#6b7280", fontWeight: 700 }}>{label}</div>
            {sub && <div style={{ fontSize: 10, color:"#6b7280", marginTop: 3 }}>{sub}</div>}
        </div>
    </div>
));


const TIER_COLOR = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
const PLAT_ICO = { youtube: "▶", instagram: "📸", tiktok: "🎵" };
const ESIGN_COL = { signed: "#22c55e", pending: "#eab308", rejected: "#ef4444" };

const SENTIMENT_COLOR = { positive: "#22c55e", neutral: "#eab308", negative: "#ef4444" };
const Stars = memo(function Stars({ n }) {
    const k = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return <span style={{ color: "#fde047", letterSpacing: 1, fontSize: 12 }}>{"★".repeat(k)}{"☆".repeat(5 - k)}</span>;
});

/* ══════════════════════════════════════════════════════════════════
   TAB 1: Creator Identity Integration
══════════════════════════════════════════════════════════════════ */
/* 인플루언서 귀속 설정 에디터 — 전용 쿠폰/UTM 발급 + 활용유형·목표 지정.
   저장 시 updateCreator → (운영) 디바운스 POST /v423/influencer/creators 영속 → 주문 매칭 실측 귀속. */
const AttributionEditor = memo(function AttributionEditor({ creator, onClose, onSave, t }) {
    const a = creator.attribution || {};
    const [coupon, setCoupon] = useState(a.couponCode || '');
    const [utm, setUtm] = useState(a.utmSource || ('cr-' + String(creator.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '')));
    const [act, setAct] = useState(creator.activationType || deriveActivationType(creator));
    const [obj, setObj] = useState(creator.objective || deriveObjective(creator));
    const save = () => {
        const couponT = coupon.trim().toUpperCase();
        const utmT = utm.trim().toLowerCase();
        const method = (couponT || utmT) ? 'tracked' : 'manual';
        onSave({
            attribution: { method, couponCode: couponT || null, utmSource: utmT || null, measured: method === 'tracked', trackingUrl: utmT ? `https://roi.genie-go.com/r/${utmT}` : null },
            activationType: act, objective: obj,
        });
    };
    const fld = { display: 'block', width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(255,255,255,0.98)', fontSize: 12, marginTop: 4, boxSizing: 'border-box' };
    const lbl = { fontSize: 11, fontWeight: 700, color: '#374151' };
    const tracked = !!(coupon.trim() || utm.trim());
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 400 }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(460px,95vw)', background: 'rgba(255,255,255,0.99)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 18, padding: 24, zIndex: 401, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🎯 {t('influencer.attrSetup', '귀속 설정')} — {creator.name}</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 20 }}>✕</button>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>
                    {t('influencer.attrSetupDesc', '전용 쿠폰코드/UTM을 발급하면 해당 코드로 유입된 주문이 이 크리에이터에 실측 귀속됩니다.')}
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>{t('influencer.couponCode', '전용 쿠폰코드')}</label>
                    <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="HANA10" style={fld} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>UTM Source</label>
                    <input value={utm} onChange={e => setUtm(e.target.value)} placeholder="cr-001" style={fld} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                        <label style={lbl}>{t('influencer.activationLabel', '활용 유형')}</label>
                        <select value={act} onChange={e => setAct(e.target.value)} style={fld}>
                            {Object.keys(ACTIVATION_META).map(k => <option key={k} value={k}>{ACTIVATION_META[k].icon} {t('influencer.' + ACTIVATION_META[k].key, ACTIVATION_META[k].label)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={lbl}>{t('influencer.objectiveLabel', '캠페인 목표')}</label>
                        <select value={obj} onChange={e => setObj(e.target.value)} style={fld}>
                            {Object.keys(OBJECTIVE_META).map(k => <option key={k} value={k}>{OBJECTIVE_META[k].icon} {t('influencer.' + OBJECTIVE_META[k].key, OBJECTIVE_META[k].label)}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ fontSize: 10, color: tracked ? '#22c55e' : '#94a3b8', marginBottom: 14, fontWeight: 700 }}>
                    {tracked ? `🎯 ${t('influencer.attrTracked', '실측')} — ${t('influencer.attrTrackedHint', '쿠폰/UTM 주문 자동 귀속')}` : `✍️ ${t('influencer.attrManual', '추정')} — ${t('influencer.attrManualHint', '추적 식별자 없음(저장 추정치 사용)')}`}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn-ghost" onClick={onClose}>{t('influencerUGC.u_34', '닫기')}</button>
                    <button className="btn-primary" onClick={save} style={{ background: 'linear-gradient(135deg,#22c55e,#4f8ef7)' }}>{t('influencer.attrSave', '저장')}</button>
                </div>
            </div>
        </>
    );
});

const IdentityTab = memo(function IdentityTab() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const { updateCreator } = useGlobalData(); // [현차수] 병합 액션 영속화
    const [sel, setSel] = useState(null);
    const [merge, setMerge] = useState([]);
    const [attrModal, setAttrModal] = useState(null); // [현차수] 귀속 설정(쿠폰/UTM) 에디터 대상

    // [현차수] 병합 — 중복 플래그를 해제하고 검토완료로 전이(영속·전탭 동기화). KPI(중복 의심)에 즉시 반영.
    const mergeCreator = (c) => updateCreator(c.id, { duplicateFlag: false, mergedAt: new Date().toISOString() });

    const dups = CREATORS.filter(c => c.duplicateFlag);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label={t("influencer.totalCreators", "전체 크리에이터")} value={CREATORS.length + " " + t("influencerUGC.unit_persons", "명")} color="#4f8ef7" icon="👤" />
                <KpiCard label={t("influencer.dupSuspected", "중복 의심")} value={dups.length + " " + t("influencerUGC.unit_persons", "명")} color="#eab308" icon="⚠" sub={t("influencer.dupSub", "다중 핸들 탐지")} />
                <KpiCard label={t("influencer.unverifiedChannels", "미인증 채널")} value={CREATORS.reduce((s, c) => s + c.identities.filter(i => !i.verified).length, 0) + " " + t("influencerUGC.unit_items", "개")} color="#f97316" icon="🔓" />
                <KpiCard label={t("influencer.connectedPlatforms", "연결 플랫폼")} value={CREATORS.reduce((s, c) => s + c.identities.length, 0) + " " + t("influencerUGC.unit_items", "개")} color="#22c55e" icon="🔗" />
            </div>

            {dups.length > 0 && (
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 11, color: "#eab308", display: "flex", gap: 8, alignItems: "center" }}>
                    {t("influencer.dupAlert", '⚠ 변형 사칭 탐지 — ')}<strong>{dups.map(d => d.name).join(", ")}</strong> {t("influencer.reviewRequired", '즉시 검토 필요')}
                </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
                {CREATORS.map(c => (
                    <div key={c.id} className="card card-glass" style={{
                        borderLeft: `3px solid ${TIER_COLOR[c.tier]}`,
                        outline: c.duplicateFlag ? "1px solid rgba(234,179,8,0.3)" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</div>
                                <Tag label={c.tier} color={TIER_COLOR[c.tier]} />
                                {c.duplicateFlag && <Tag label={t("influencer.tagDup", '⚠ 제재 필요')} color="#eab308" />}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px", color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}
                                    onClick={() => setAttrModal(c)}>🎯 {t('influencer.attrSetup', '귀속 설정')}</button>
                                <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px" }}
                                    onClick={() => setSel(sel === c.id ? null : c.id)}>
                                    {sel === c.id ? t("influencer.btnCollapse", "▲ 접기") : t("influencer.btnChannelDetails", "▼ 채널 정보")}
                                </button>
                                {c.duplicateFlag && (
                                    <button className="btn-primary" onClick={() => mergeCreator(c)} style={{ fontSize: 10, padding: "3px 12px", background: "linear-gradient(135deg,#eab308,#f97316)", cursor: "pointer" }}>🔗 {t("influencerUGC.w_301", "병합")}</button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
                            {c.identities.map((id, i) => (
                                <div key={i} style={{
                                    padding: "9px 12px", borderRadius: 10,
                                    background:"rgba(0,0,0,0.03)", border: `1px solid ${id.verified ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{PLAT_ICO[id.type]} {String(id.type || "").toUpperCase()}</span>
                                        <Tag label={id.verified ? t("influencer.verified","✓ Verified") : t("influencer.unverified","Unverified")} color={id.verified ? "#22c55e" : "#ef4444"} />
                                    </div>
                                    <div style={{ fontSize: 11, color: "#4f8ef7", fontWeight: 700 }}>{id.handle}</div>
                                    <div style={{ fontSize: 10, color:"#6b7280", marginTop: 2 }}>ID: {id.id}</div>
                                    <div style={{ fontSize: 10, color:"#6b7280" }}>{id.email}</div>
                                    <div style={{ marginTop: 5 }}>
                                        {(() => {
                                            const s = ingestStatus(id);
                                            return <Tag color={s.status === 'connected' ? '#22c55e' : '#94a3b8'}
                                                label={s.status === 'connected'
                                                    ? `🔄 ${t('influencer.syncConnected', '인사이트 동기화됨')}`
                                                    : `⏳ ${t('influencer.syncPending', '인사이트 연동 대기')}`} />;
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {sel === c.id && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.1)" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color:"#6b7280", marginBottom: 6 }}>{t("influencerUGC.w_302", "통합 이메일 목록")}</div>
                                {[...new Set(c.identities.map(i => i.email))].map((em, i) => (
                                    <div key={i} style={{ fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(99,140,255,0.06)" }}>{em}</div>
                                ))}
                                {[...new Set(c.identities.map(i => i.email))].length > 1 && (
                                    <div style={{ fontSize: 10, color: "#eab308", marginTop: 6 }}>
                                        {t("influencerUGC.w_303", "⚠ 다중 이메일 탐지 — 동일인 여부를 확인하세요")}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {attrModal && (
                <AttributionEditor creator={attrModal} t={t} onClose={() => setAttrModal(null)}
                    onSave={(patch) => { updateCreator(attrModal.id, patch); setAttrModal(null); }} />
            )}
        </div>
    );
});

/* ══════════════════════════════════════════════════════════════════
   TAB 2: Contract Management
══════════════════════════════════════════════════════════════════ */
const ContractTab = memo(function ContractTab() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { updateCreator } = useGlobalData(); // [현차수] 계약 액션 영속화(updateCreator→useInfluencerDataSync 자동저장→전탭 동기화)
    const [modal, setModal] = useState(null);
    const [pending, setPending] = useState(null); // 진행중 액션 표시용 creator.id

    // [현차수] 서명 재요청 — e-Sign 상태를 'requested' 로 전이(영속·전탭 동기화). 백엔드 creators blob 에 저장됨.
    const resendSignature = (c) => {
        setPending(c.id);
        updateCreator(c.id, { contract: { ...c.contract, esign: 'requested', esignRequestedAt: new Date().toISOString() } });
        setTimeout(() => setPending(null), 1200);
    };
    // [현차수] 권리 갱신 — 화이트리스트 만료일을 1년 연장(영속·전탭 동기화).
    const renewRights = (c) => {
        setPending(c.id);
        const base = new Date();
        base.setFullYear(base.getFullYear() + 1);
        updateCreator(c.id, { contract: { ...c.contract, whitelistExpiry: base.toISOString().slice(0, 10) } });
        setTimeout(() => setPending(null), 1200);
    };

    const esignPending = CREATORS.filter(c => c.contract.esign === "pending").length;
    const wlExpiringSoon = CREATORS.filter(c => c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) <= 90 && daysLeft(c.contract.whitelistExpiry) >= 0).length;
    const wlExpired = CREATORS.filter(c => c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) < 0).length;

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label={t("influencerUGC.u_0", "Active Contracts")} value={CREATORS.length + t("influencer.unitCases","건")} color="#22c55e" icon="📝" />
                <KpiCard label={t("influencerUGC.u_1", "e-Sign Pending")} value={esignPending + t("influencer.unitCases","건")} color="#eab308" icon="✍" />
                <KpiCard label={t("influencerUGC.u_5", "Whitelist")} value={CREATORS.filter(c => c.contract.whitelist).length + t("influencer.unitPersons","명")} color="#4f8ef7" icon="📣" />
                <KpiCard label={t("influencerUGC.u_2", "Whitelist Expiring Soon")} value={wlExpiringSoon + t("influencer.unitCases","건")} color="#f97316" icon="⏰" sub={t("influencerUGC.u_3", "Within 90 days")} />
                <KpiCard label={t("influencerUGC.u_4", "Whitelist Expired")} value={wlExpired + t("influencer.unitCases","건")} color="#ef4444" icon="🚫" />
            </div>

            {}
            {CREATORS.filter(c => c.contract.esign === "pending").map(c => (
                <div key={c.id} style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                    <span>✍ <strong>{c.name}</strong> — — {t("influencerUGC.w_207", "e-Sign not completed yet (contract not effective)")}</span>
                    <button className="btn-primary" disabled={pending === c.id} onClick={() => resendSignature(c)} style={{ fontSize: 10, padding: "4px 12px", background: "linear-gradient(135deg,#eab308,#f97316)", cursor: "pointer" }}>{pending === c.id ? t("influencer.sending","전송 중…") : t("influencerUGC.u_7", "Resend Signature Request")}</button>
                </div>
            ))}
            {CREATORS.filter(c => c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) < 0).map(c => (
                <div key={c.id} style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                    <span>🚫 <strong>{c.name}</strong> — Whitelist Expired ({c.contract.whitelistExpiry}) · Stop ad execution immediately</span>
                    <button className="btn-primary" disabled={pending === c.id} onClick={() => renewRights(c)} style={{ fontSize: 10, padding: "4px 12px", background: "linear-gradient(135deg,#ef4444,#a855f7)", cursor: "pointer" }}>{pending === c.id ? t("influencer.renewing","갱신 중…") : t("influencerUGC.u_9", "Renew Rights")}</button>
                </div>
            ))}

            {}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📋 {t("influencerUGC.w_200", "Contract List")}</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("influencerUGC.u_11", "Creator")}</th>
                                <th>{t("influencerUGC.u_12", "Contract Type")}</th>
                                <th style={{ textAlign: "right" }}>{t("influencerUGC.u_13", "Fixed Fee")}</th>
                                <th style={{ textAlign: "right" }}>{t("influencerUGC.u_14", "Performance Rate")}</th>
                                <th>{t("influencerUGC.u_15", "Rights Scope")}</th>
                                <th>{t("influencerUGC.u_16", "Contract Period")}</th>
                                <th>{t("influencerUGC.u_5", "Whitelist")}</th>
                                <th style={{ textAlign: "center" }}>{t("influencerUGC.u_18", "e-Sign")}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {CREATORS.map(c => {
                                const ct = c.contract;
                                const dl = ct.whitelistExpiry ? daysLeft(ct.whitelistExpiry) : null;
                                const wlColor = dl === null ? "var(--text-3)" : dl < 0 ? "#ef4444" : dl < 90 ? "#eab308" : "#22c55e";
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                                            <div style={{ fontSize: 9, color:"#6b7280" }}>{c.id}</div>
                                        </td>
                                        <td>
                                            <Tag label={ct.type === "flat" ? t("influencer.fixed","Fixed") : ct.type === "perf" ? t("influencer.performance","Performance") : t("influencer.fixedPerf","Fixed+Performance")} color="#4f8ef7" />
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(ct.flatFee)}</td>
                                        <td style={{ textAlign: "right", fontWeight: 700 }}>{ct.perfRate > 0 ? pct(ct.perfRate) : "—"}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                {ct.rights.split("+").map(r => <Tag key={r} label={r} color="#6366f1" />)}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 10 }}>
                                            <div>{ct.period[0]}</div>
                                            <div style={{ color:"#6b7280" }}>~ {ct.period[1]}</div>
                                        </td>
                                        <td>
                                            {ct.whitelist
                                                ? <div>
                                                    <Tag label={t("influencerUGC.u_22", "Allowed")} color={wlColor} />
                                                    <div style={{ fontSize: 9, color: wlColor, marginTop: 2 }}>
                                                        {dl === null ? "—" : dl < 0 ? t("influencer.expired","Expired") : dl + " " + t("influencer.daysLeft","days left")}
                                                    </div>
                                                </div>
                                                : <Tag label={t("influencerUGC.u_26", "None")} color="var(--text-3)" />}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <Tag label={ct.esign === "signed" ? t("influencer.signed","✓ Signed") : ct.esign === "pending" ? t("influencer.pending","⏳ Pending") : t("influencer.rejected","✗ Rejected")}
                                                color={ESIGN_COL[ct.esign]} />
                                        </td>
                                        <td>
                                            <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px" }}
                                                onClick={() => setModal(c)}>{t("influencerUGC.u_30", "Details")}</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📣 {t("influencerUGC.w_201", "Ad Conversion (Whitelisting) Window")}</div>
                <div style={{ fontSize: 10, color:"#6b7280", marginBottom: 14 }}>
                    {t('influencerUGC.txt_WhitelistA_4', '화이트리스트 허용 기간 내 광고 집행 가능 크리에이터 · 만료 전 적극 활용 권장')}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                    {CREATORS.filter(c => c.contract.whitelist && c.contract.whitelistExpiry).map(c => {
                        const dl = daysLeft(c.contract.whitelistExpiry);
                        const expired = dl < 0;
                        const pctUsed = expired ? 100 : Math.max(0, 100 - (dl / 365) * 100);
                        const color = expired ? "#ef4444" : dl < 60 ? "#eab308" : "#22c55e";
                        return (
                            <div key={c.id}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                                    <span style={{ fontWeight: 400, color:"#6b7280" }} >{c.name} <span>{c.identities[0]?.handle || ""}</span></span>
                                    <span style={{ color }}>
                                        {expired ? t("influencer.expired","Expired") : `${dl} ${t("influencer.daysLeft","days left")} · ${c.contract.whitelistExpiry}`}
                                    </span>
                                </div>
                                <Bar v={pctUsed} max={100} color={expired ? "#ef4444" : color} h={6} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {}
            {modal && (
                <>
                    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 300 }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(560px,95vw)", background:"rgba(255,255,255,0.98)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 20, padding: 28, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>📝 Contract Details — {modal.name}</div>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color:"#6b7280", fontSize: 20 }}>✕</button>
                        </div>
                        {[
                            [t("influencerUGC.u_12", "Contract Type"), modal.contract.type],
                            [t("influencerUGC.u_13", "Fixed Fee"), fmt(modal.contract.flatFee)],
                            [t("influencerUGC.u_14", "Performance Rate"), modal.contract.perfRate > 0 ? pct(modal.contract.perfRate) + " / " + modal.contract.perfBase : "None"],
                            [t("influencerUGC.u_15", "Rights Scope"), modal.contract.rights],
                            [t("influencerUGC.u_16", "Contract Period"), modal.contract.period.join(" ~ ")],
                            [t("influencerUGC.u_5", "Whitelist"), modal.contract.whitelist ? "Allowed" : "None"],
                            [t("influencerUGC.u_4", "Whitelist Expired"), modal.contract.whitelistExpiry || "—"],
                            [t("influencerUGC.u_17", "e-Sign Status"), modal.contract.esign],
                        ].map(([l, v]) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                                <span style={{ color:"#6b7280" }}>{l}</span>
                                <span style={{ fontWeight: 700 }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>{t("influencerUGC.u_34", "Close")}</button>
                            <button className="btn-primary" onClick={() => {
                                // [259차] 죽은 버튼 → 계약 정보 클라이언트측 문서 다운로드(백엔드 불요·표시 데이터 그대로)
                                const c = modal.contract || {};
                                const txt = ['Contract — ' + (modal.name || ''),
                                    'Type: ' + (c.type ?? '-'),
                                    'Fixed Fee: ' + fmt(c.flatFee),
                                    'Performance: ' + (c.perfRate > 0 ? pct(c.perfRate) + ' / ' + c.perfBase : 'None'),
                                    'Rights: ' + (c.rights ?? '-'),
                                    'Period: ' + (Array.isArray(c.period) ? c.period.join(' ~ ') : '-'),
                                    'Whitelist: ' + (c.whitelist ? 'Allowed' : 'None') + ' (expiry ' + (c.whitelistExpiry || '-') + ')',
                                    'e-Sign: ' + (c.esign ?? '-')].join('\n');
                                const blob = new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' });
                                const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'contract_' + (modal.name || 'creator') + '.txt'; a.click(); URL.revokeObjectURL(u);
                            }}>{t("influencerUGC.u_35", "📄 Download Contract")}</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    

);
});

/* ══════════════════════════════════════════════════════════════════
   TAB 3: Settlement Management + Auto Verification
══════════════════════════════════════════════════════════════════ */
const SettleTab = memo(function SettleTab() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { updateCreator } = useGlobalData(); // [현차수] 정산 액션 영속화(→전탭 동기화·이상건수 KPI 즉시 반영)
    const [modal, setModal] = useState(null);

    const anomalies = CREATORS.filter(c =>
        c.settle.status === "overpaid" || c.settle.status === "unpaid" || c.settle.status === "partial"
    );

    // [현차수] 정산 처리 — 미지급/부분=계약액 지급 완료, 과지급=초과분 회수. settle.paid 를 계약액에 정합시키고 status='paid'.
    //   영속(creators blob 저장)·이상건수/완료 KPI 즉시 동기화.
    const resolveSettle = (c) => {
        const due = c.contract.flatFee + (c.contract.perfRate > 0 ? (c.stats?.revenue || 0) * c.contract.perfRate : 0);
        updateCreator(c.id, { settle: { ...c.settle, paid: due, status: 'paid', resolvedAt: new Date().toISOString() } });
    };

    const STATUS_LABEL = { paid: t("influencer.stPaid","Done"), partial: t("influencer.stPartial","Partial"), unpaid: t("influencer.stUnpaid","Unpaid"), overpaid: t("influencer.stOverpaid","Overpaid") };
    const STATUS_COLOR = { paid: "#22c55e", partial: "#eab308", unpaid: "#ef4444", overpaid: "#a855f7" };

    const calcDue = c => {
        const ct = c.contract;
        return ct.flatFee + (ct.perfRate > 0 ? c.stats.revenue * ct.perfRate : 0);
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label={t("influencerUGC.u_36", "Total Payable")} value={fmt(CREATORS.reduce((s, c) => s + calcDue(c), 0))} color="#4f8ef7" icon="💸" />
                <KpiCard label={t("influencerUGC.u_37", "Done")} value={CREATORS.filter(c => c.settle.status === "paid").length + t("influencer.unitCases","건")} color="#22c55e" icon="✅" />
                <KpiCard label={t("influencerUGC.u_38", "Unpaid")} value={CREATORS.filter(c => c.settle.status === "unpaid").length + t("influencer.unitCases","건")} color="#ef4444" icon="❌" />
                <KpiCard label={t("influencerUGC.u_39", "Overpayment Detected")} value={CREATORS.filter(c => c.settle.status === "overpaid").length + t("influencer.unitCases","건")} color="#a855f7" icon="⚠" />
                <KpiCard label={t("influencerUGC.u_40", "Total Anomalies")} value={anomalies.length + t("influencer.unitCases","건")} color="#f97316" icon="🔍" sub={t("influencerUGC.u_41", "Review Required")} />
            </div>

            {}
            {anomalies.map(c => {
                const due = calcDue(c);
                const diff = c.settle.paid - due;
                const isOver = diff > 0;
                return (
                    <div key={c.id} style={{
                        padding: "10px 16px", borderRadius: 10,
                        background: `rgba(${isOver ? "168,85,247" : "239,68,68"},0.07)`,
                        border: `1px solid rgba(${isOver ? "168,85,247" : "239,68,68"},0.22)`,
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
                    }}>
                        <div>
                            <span style={{ fontWeight: 700, fontSize: 12 }}>
                                {isOver ? `🟣 ${t("influencer.stOverpaid","Overpaid")}` : `🔴 ${t("influencer.stUnpaid","Unpaid")}/${t("influencer.stPartial","Partial")}`} — {c.name}
                            </span>
                            <span style={{ fontSize: 11, color:"#6b7280", marginLeft: 8 }}>
                                {t("influencer.perContract","Per contract")} {fmt(due)} / {t("influencer.actualPaid","Actual Paid")} {fmt(c.settle.paid)} /
                                {t("influencer.difference","Difference")} <span style={{ color: isOver ? "#a855f7" : "#ef4444", fontWeight: 700 }}>
                                    {isOver ? "+" : ""}{fmt(diff)}
                                </span>
                            </span>
                        </div>
                        <button className="btn-primary" onClick={() => resolveSettle(c)} style={{ fontSize: 10, padding: "4px 12px", cursor: "pointer", background: isOver ? "linear-gradient(135deg,#a855f7,#6366f1)" : "linear-gradient(135deg,#ef4444,#f97316)" }}>
                            {isOver ? t("influencer.recover","Recover") : t("influencer.payRemaining","Pay Remaining")}
                        </button>
                    </div>
                );
            })}

            {}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📋 {t("influencerUGC.w_202", "Settlement Details (Auto-verified)")}</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("influencerUGC.u_11", "Creator")}</th>
                                <th>{t("influencerUGC.u_50", "Period")}</th>
                                <th style={{ textAlign: "right" }}>{t('influencer.settleContractAmt')}</th>
                                <th style={{ textAlign: "right" }}>{t('influencer.settleActualPaid')}</th>
                                <th style={{ textAlign: "right" }}>{t('influencer.settleDiff')}</th>
                                <th style={{ textAlign: "center" }}>{t("influencerUGC.u_51", "Status")}</th>
                                <th>{t("influencerUGC.u_52", "Documents")}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {CREATORS.map(c => {
                                const due = calcDue(c);
                                const diff = c.settle.paid - due;
                                return (
                                    <tr key={c.id}>
                                        <td><div style={{ fontWeight: 700 }}>{c.name}</div></td>
                                        <td style={{ fontSize: 10 }}>{c.settle.period}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(due)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(c.settle.paid)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: diff > 0 ? "#a855f7" : diff < 0 ? "#ef4444" : "#22c55e" }}>
                                            {diff === 0 ? t('influencer.settleMatchLabel') : diff > 0 ? "+" + fmt(diff) : fmt(diff)}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <Tag label={STATUS_LABEL[c.settle.status]} color={STATUS_COLOR[c.settle.status]} />
                                        </td>
                                        <td>
                                            {c.settle.docs.length === 0
                                                ? <span style={{ fontSize: 10, color: "#ef4444" }}>{t("influencerUGC.u_54", "No docs")}</span>
                                                : c.settle.docs.map((d, i) => (
                                                    <div key={i} style={{ fontSize: 10, color: "#4f8ef7", cursor: "pointer" }}>📎 {d}</div>
                                                ))}
                                        </td>
                                        <td>
                                            <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px" }}
                                                onClick={() => setModal(c)}>{t("influencerUGC.u_56", "Statement")}</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {}
            {modal && (
                <>
                    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 300 }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(540px,95vw)", background:"rgba(255,255,255,0.98)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 20, padding: 28, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>💰 Statement — {modal.name}</div>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color:"#6b7280", fontSize: 20 }}>✕</button>
                        </div>
                        {(() => {
                            const due = calcDue(modal);
                            const tax1 = Math.round(due * 0.033);
                            const tax2 = Math.round(due * 0.0033);
                            const net = due - tax1 - tax2;
                            return (
                                <>
                                    {[
                                        [t("influencerUGC.u_58", "계약 Amount (Fixed)"), fmt(modal.contract.flatFee), "var(--text-1)"],
                                        ["Performance Payment (" + pct(modal.contract.perfRate) + ")", fmt(modal.stats.revenue * modal.contract.perfRate), "var(--text-1)"],
                                        [t("influencerUGC.u_60", "Contract Total"), fmt(due), "#4f8ef7"],
                                        [t("influencerUGC.u_61", "Business Income Tax (3.3%)"), "- " + fmt(tax1), "#ef4444"],
                                        [t("influencerUGC.u_62", "Local Income Tax (0.33%)"), "- " + fmt(tax2), "#f97316"],
                                    ].map(([l, v, c]) => (
                                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                                            <span style={{ color:"#6b7280" }}>{l}</span>
                                            <span style={{ fontWeight: 700, color: c }}>{v}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
                                        <span style={{ fontWeight: 700 }}>{t("influencerUGC.u_63", "Net Payable")}</span>
                                        <span style={{ fontWeight: 900, color: "#22c55e", fontSize: 18 }}>{fmt(net)}</span>
                                    </div>
                                    <div style={{ marginTop: 12, fontSize: 11, color:"#6b7280" }}>
                                        {t('influencer.settleDocs')}: {modal.settle.docs.length === 0 ? t('influencer.settleNoDocs') : modal.settle.docs.join(", ")}
                                    </div>
                                    <div style={{ fontSize: 10, color: modal.settle.status === "overpaid" ? "#a855f7" : modal.settle.status === "unpaid" ? "#ef4444" : "#22c55e", padding: "6px 10px", borderRadius: 6, background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)" }}>
                                        {t('influencer.settleActualPaidLabel')} {fmt(modal.settle.paid)} · {t('influencer.settleContractLabel')}: {fmt(due)} ·{" "}
                                        {modal.settle.status === "paid" ? `✓ ${t('influencer.settleMatchLabel')}` : modal.settle.status === "overpaid" ? `⚠ ${t('influencer.stOverpaid')}` : `⚠ ${t('influencer.stUnpaid')}`}
                                    </div>
                                </>
                            );
                        })()}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>{t("influencerUGC.u_34", "Close")}</button>
                            <button className="btn-primary" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                                onClick={() => {
                                    // [259차] 죽은 버튼 → 정산 명세서 클라이언트측 다운로드(modal.settle 표시 데이터)
                                    const s = modal.settle || {};
                                    const txt = ['Settlement Statement — ' + (modal.name || '')].concat(
                                        Object.entries(s).map(([k, v]) => k + ': ' + (v == null ? '-' : String(v)))
                                    ).join('\n');
                                    const blob = new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' });
                                    const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'statement_' + (modal.name || 'creator') + '.txt'; a.click(); URL.revokeObjectURL(u);
                                }}>
                                {t("influencerUGC.u_67", "📥 Statement Download")}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    

);
});

/* ══════════════════════════════════════════════════════════════════
   TAB 4: ROI Ranking + Content Reuse
══════════════════════════════════════════════════════════════════ */
const ROITab = memo(function ROITab() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const allContent = CREATORS.flatMap(c =>
        c.content.map(ct => ({
            ...ct, creatorId: c.id, creatorName: c.name, tier: c.tier,
            whitelist: c.contract.whitelist,
            wlExpiry: c.contract.whitelistExpiry,
            roi: ct.revenue / (c.contract.flatFee / (c.content.length || 1) + 1),
        }))
    );

    const sorted = [...allContent].sort((a, b) => b.roi - a.roi);
    const highViewsLowSales = allContent.filter(c => c.views >= 200000 && c.orders < 50).sort((a, b) => b.views - a.views);
    const reuseRecs = allContent
        .filter(c => c.engRate >= 0.05 && c.orders >= 50)
        .sort((a, b) => b.engRate - a.engRate)
        .slice(0, 4);

    const creatorROI = CREATORS.map(c => ({
        ...c,
        totalRevenue: c.stats.revenue,
        cost: calcCreatorCost(c),
        roi: c.stats.revenue / calcCreatorCost(c),
        viewPerOrder: c.stats.views / (c.stats.orders || 1),
    })).sort((a, b) => b.roi - a.roi);

    function calcCreatorCost(c) {
        return (c.contract?.flatFee || 0) + (c.stats?.revenue || 0) * (c.contract?.perfRate || 0);
    }

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🏆 {t('influencer.roiRanking')}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 14, lineHeight: 1.6 }}>
                    {t('influencer.objHint', '캠페인 목표(인지도/참여/유입/전환)에 따라 성공 기준이 다르게 평가됩니다. 목표성과점수는 해당 목표의 가중치 기준이며, 활용 유형·측정 방식(실측/추정)·계약비/광고집행비를 분리해 표시합니다.')}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                    {creatorROI.map((c, rank) => {
                        const color = TIER_COLOR[c.tier];
                        const hvls = (c.stats?.views || 0) >= 200000 && (c.stats?.orders || 0) < 50;
                        return (
                            <div key={c.id} style={{ padding: "12px 16px", borderRadius: 12, background:"rgba(0,0,0,0.03)", border: `1px solid ${color}22`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, background: `${color}18`, color }}>{`#${rank + 1}`}</div>
                                <div style={{ flex: 1, minWidth: 140 }}>
                                    <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {c.name}
                                        {(() => {
                                            const o = deriveObjective(c); const om = OBJECTIVE_META[o];
                                            return <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: om.color + '18', color: om.color, border: `1px solid ${om.color}33` }}>{om.icon} {t('influencer.' + om.key, om.label)}</span>;
                                        })()}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                                        <Tag label={c.tier} color={color} />
                                        {hvls && <Tag label={`\ud83d\udc41 ${t("influencerUGC.w_305", "High Views/Low Sales")}`} color="#eab308" />}
                                        {(() => {
                                            const b = attributionBadge(c);
                                            const code = c.attribution?.couponCode || c.attribution?.utmSource;
                                            const at = deriveActivationType(c);
                                            const m = ACTIVATION_META[at];
                                            const ms = measurability(c);
                                            return <>
                                                <Tag color={m.color} label={`${m.icon} ${t('influencer.' + m.key, m.label)}`} />
                                                <Tag color={b.color} label={b.method === 'tracked'
                                                    ? `${b.icon} ${t('influencer.attrTracked', '\uc2e4\uce21')}${code ? ' \u00b7 ' + code : ''}`
                                                    : `${b.icon} ${t('influencer.attrManual', '\ucd94\uc815')}`} />
                                                <Tag color={ms.level === 'precise' ? '#22c55e' : '#f59e0b'}
                                                    label={ms.level === 'precise' ? `\u2713 ${t('influencer.measPrecise', '\uc815\ubc00\uce21\uc815')}` : `~ ${t('influencer.measIndirect', '\uac04\uc811\ucd94\uc815')}`} />
                                            </>;
                                        })()}
                                    </div>
                                </div>
                                {(() => { const cb = costBreakdown(c); return [
                                    [t("influencerUGC.u_73", "Total Views"), fmtM(c.stats?.views || 0), "var(--text-2)"],
                                    [t("influencerUGC.u_74", "Attributed Orders"), (c.stats?.orders || 0) + t("influencer.unitCases","건"), "#4f8ef7"],
                                    [t("influencerUGC.u_75", "Attributed Revenue"), fmt(c.stats?.revenue || 0), "#f97316"],
                                    [t("influencer.contractCost", "계약비"), fmt(cb.contractCost), "#ef4444"],
                                    [t("influencer.mediaSpend", "광고집행비"), cb.mediaSpend > 0 ? fmt(cb.mediaSpend) : "—", "#f59e0b"],
                                    [t("influencerUGC.u_111", "ROI"), cb.roi != null ? cb.roi.toFixed(1) + "x" : "—", (cb.roi || 0) >= 5 ? "#22c55e" : (cb.roi || 0) >= 3 ? "#eab308" : "#ef4444"],
                                    (() => { const ps = computePerformanceScore(c).score; return [t('influencer.objScore', '목표성과'), ps + t('influencer.scoreUnit', '점'), ps >= 75 ? "#22c55e" : ps >= 50 ? "#eab308" : "#ef4444"]; })(),
                                ]; })().map(([l, v, col]) => (
                                    <div key={l} style={{ textAlign: "center", minWidth: 80 }}>
                                        <div style={{ fontSize: 9, color:"#6b7280" }}>{l}</div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: col }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {highViewsLowSales.length > 0 && (
                <div className="card card-glass" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#eab308" }}>
                        {"\ud83d\udc41 " + t("influencerUGC.w_203", "High Views / Low Sales Case Analysis")}
                    </div>
                    <div style={{ fontSize: 11, color:"#6b7280", marginBottom: 14 }}>
                        {t('influencer.hvlsDesc')}
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {highViewsLowSales.map(ct => (
                            <div key={ct.id} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{ct.title}</div>
                                    <div style={{ fontSize: 10, color:"#6b7280" }}>{PLAT_ICO[ct.platform]} {ct.platform} {"\u00b7"} {ct.creatorName}</div>
                                </div>
                                <div style={{ display: "flex", gap: 16 }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color:"#6b7280" }}>{t("influencerUGC.u_73","Views")}</div>
                                        <div style={{ fontWeight: 800, color: "#4f8ef7" }}>{fmtM(ct.views)}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color:"#6b7280" }}>{t("influencerUGC.u_74","Orders")}</div>
                                        <div style={{ fontWeight: 800, color: "#ef4444" }}>{ct.orders}{t("influencer.unitCases","건")}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color:"#6b7280" }}>{t("influencerUGC.u_91","Conv. Rate")}</div>
                                        <div style={{ fontWeight: 800, color: "#eab308" }}>{pct(ct.orders / ct.views)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    {"\ud83d\udd04 " + t("influencerUGC.w_205", "Content Reuse Best Candidates")}
                </div>
                <div style={{ fontSize: 11, color:"#6b7280", marginBottom: 14 }}>
                    {t('influencer.contentReuseSub')}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {reuseRecs.map(ct => {
                        const c = CREATORS.find(x => x.id === ct.creatorId);
                        if (!c) return null;
                        const wlOk = c.contract?.whitelist && daysLeft(c.contract?.whitelistExpiry) > 0;
                        return (
                            <div key={ct.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{ct.title}</div>
                                    <Tag label={wlOk ? t("influencer.adReady","Ad Ready") : t("influencer.checkRights","Check Rights")} color={wlOk ? "#22c55e" : "#ef4444"} />
                                </div>
                                <div style={{ fontSize: 10, color:"#6b7280", marginBottom: 8 }}>
                                    {PLAT_ICO[ct.platform]} {ct.platform} {"\u00b7"} {ct.creatorName}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                                    {[[t("influencer.engagement","Engagement"), pct(ct.engRate), "#a855f7"], [t("influencerUGC.u_74","Orders"), ct.orders + t("influencer.unitCases","건"), "#4f8ef7"], [t("influencerUGC.u_75","Revenue"), fmt(ct.revenue), "#f97316"]].map(([l, v, col]) => (
                                        <div key={l} style={{ textAlign: "center", padding: "6px 0", borderRadius: 8, background:"rgba(0,0,0,0.03)" }}>
                                            <div style={{ fontSize: 9, color:"#6b7280" }}>{l}</div>
                                            <div style={{ fontWeight: 800, color: col, fontSize: 13 }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                                    <button onClick={() => { window.location.href = '/auto-marketing'; }} className="btn-primary" style={{ fontSize: 9, padding: "4px 10px", flex: 1, background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>{t("influencer.adCreative","Ad Creative")}</button>
                                    <button onClick={() => { window.location.href = '/digital-shelf'; }} className="btn-primary" style={{ fontSize: 9, padding: "4px 10px", flex: 1, background: "linear-gradient(135deg,#14b8a6,#4f8ef7)" }}>{t("influencer.productPage","Product Page")}</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Phase 4: 채널별(메타·틱톡·유튜브) 성과 비교 */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📡 {t('influencer.channelPerfTitle', '채널별 성과 (메타·틱톡·유튜브)')}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 14 }}>{t('influencer.channelPerfSub', '콘텐츠가 게시된 채널 기준으로 성과를 분리 집계합니다. 조회·참여·전환은 채널 고유 신호입니다.')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                    {channelBreakdown(CREATORS).map(ch => (
                        <div key={ch.platform} style={{ padding: "14px 16px", borderRadius: 12, background: `${ch.color}0a`, border: `1px solid ${ch.color}30` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 18 }}>{ch.icon}</span>
                                <span style={{ fontWeight: 800, fontSize: 14, color: ch.color }}>{ch.label}</span>
                                <span style={{ marginLeft: "auto", fontSize: 10, color: "#6b7280" }}>{ch.creators}{t('influencer.unitPersons', '명')} · {ch.contents}{t('influencer.unitItems', '개')}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                {[
                                    [t("influencerUGC.u_73", "Views"), fmtM(ch.views)],
                                    [t("influencer.engagement", "Engagement"), pct(ch.avgEng)],
                                    [t("influencerUGC.u_74", "Orders"), ch.orders + t("influencer.unitCases", "건")],
                                    [t("influencerUGC.u_91", "Conv. Rate"), pct(ch.convRate)],
                                    [t("influencerUGC.u_75", "Revenue"), fmt(ch.revenue)],
                                ].map(([l, v]) => (
                                    <div key={l} style={{ padding: "6px 0" }}>
                                        <div style={{ fontSize: 9, color: "#6b7280" }}>{l}</div>
                                        <div style={{ fontWeight: 800, fontSize: 13, color: ch.color }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

/* ══════════════════════════════════════════════════════════════════
   TAB 7: Guide (i18n 9-Language)
══════════════════════════════════════════════════════════════════ */
const InfluencerGuideTab = memo(function InfluencerGuideTab() {
    const { lang } = useI18n();
    const G = INF_GUIDE[lang] || INF_GUIDE.en;
    const g = (k) => G[k] || INF_GUIDE.en[k] || INF_GUIDE.ko[k] || '';
    const STEPS = [{n:'1',k:'guideStep1',c:'#6366f1'},{n:'2',k:'guideStep2',c:'#22c55e'},{n:'3',k:'guideStep3',c:'#a855f7'},{n:'4',k:'guideStep4',c:'#f97316'},{n:'5',k:'guideStep5',c:'#06b6d4'},{n:'6',k:'guideStep6',c:'#f472b6'},{n:'7',k:'guideStep7',c:'#6366f1'},{n:'8',k:'guideStep8',c:'#22c55e'}];
    const TABS = [{icon:'🧑',k:'guideIdent',c:'#6366f1'},{icon:'📝',k:'guideContract',c:'#22c55e'},{icon:'💰',k:'guideSettle',c:'#a855f7'},{icon:'🏆',k:'guideRoi',c:'#f97316'},{icon:'⭐',k:'guideUgc',c:'#06b6d4'},{icon:'🤖',k:'guideAi',c:'#f472b6'},{icon:'📖',k:'guideGuide',c:'#22c55e'}];
    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 44 }}>🤝</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color:'#1f2937' }}>{g('guideTitle')}</div>
                <div style={{ fontSize: 13, color:'#374151', fontWeight:600, marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{g('guideSub')}</div>
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color:'#1f2937' }}>{g('guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {STEPS.map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: '1px solid '+s.c+'25', borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 900, background: s.c, color: '#fff', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{g(`${s.k}Title`)}</span>
                            </div>
                            <div style={{ fontSize: 12, color:'#6b7280', lineHeight: 1.7 }}>{g(`${s.k}Desc`)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color:'#1f2937' }}>{g('guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                    {TABS.map((tb,i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background:'rgba(255,255,255,0.95)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{tb.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{g(`${tb.k}Name`)}</div>
                                <div style={{ fontSize: 10, color:'#6b7280', marginTop: 2 }}>{g(`${tb.k}Desc`)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color:'#1f2937' }}>💡 {g('guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color:'#6b7280', lineHeight: 2.2 }}>
                    {[1,2,3,4,5].map(n => <li key={n}>{g('guideTip'+n)}</li>)}
                </ul>
            </div>
        </div>
    );
});


/* TAB 5: UGC Reviews */
const UGCTab = memo(function UGCTab() {
    const { ugcReviews = [], channelStats = [], negKeywords = [] } = useGlobalData();
    const { t } = useI18n();
    const SENTIMENT_LABEL = { positive: t("influencer.positive","Positive"), neutral: t("influencer.neutral","Neutral"), negative: t("influencer.negative","Negative") };
    const [channel, setChannel] = React.useState("all");
    const [sentiment, setSentiment] = React.useState("all");
    const [search, setSearch] = React.useState("");

    const filtered = React.useMemo(() => {
        return ugcReviews.filter(r => {
            if (channel !== "all" && r.channel !== channel) return false;
            if (sentiment !== "all" && r.sentiment !== sentiment) return false;
            if (search && !(r.text || "").includes(search) && !(r.product || "").includes(search)) return false;
            return true;
        });
    }, [channel, sentiment, search]);

    const totalReviews = channelStats.reduce((s, c) => s + c.total, 0);
    const avgRating = totalReviews > 0 ? (channelStats.reduce((s, c) => s + c.avg * c.total, 0) / totalReviews).toFixed(2) : "0.00";
    const negCount = ugcReviews.filter(r => r.sentiment === "negative").length;
    const posRate = ugcReviews.length > 0 ? ((ugcReviews.filter(r => r.sentiment === "positive").length / ugcReviews.length) * 100).toFixed(1) : "0.0";

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label={t('influencer.kpiAllReviews')} value={totalReviews.toLocaleString()} color="#4f8ef7" icon="💬" sub={t('influencer.kpiAllReviewsSub')} />
                <KpiCard label={t('influencer.kpiAvgRating')} value={`★ ${avgRating}`} color="#fde047" icon="⭐" sub={t('influencer.kpiAvgRatingSub')} />
                <KpiCard label={t('influencer.kpiNegReviews')} value={String(negCount)} color="#ef4444" icon="⚠" sub={t('influencer.kpiNegReviewsSub')} />
                <KpiCard label={t('influencer.kpiPosRate')} value={posRate + "%"} color="#22c55e" icon="👍" sub={t('influencer.kpiPosRateSub')} />
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📊 {t('influencer.channelRatingTitle')}</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {channelStats.map(c => (
                            <div key={c.channel} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background:"rgba(0,0,0,0.03)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.08)" }}>
                                <span style={{ fontSize: 18 }}>{c.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{c.channel}</div>
                                    <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                                        <span style={{ color: "#22c55e" }}>{t('influencer.posLabel')} {c.pos}%</span>
                                        <span style={{ color: "#ef4444" }}>{t('influencer.negLabel')} {c.neg}%</span>
                                        <span style={{ color:"#6b7280" }}>{t('influencer.totalItems')} {c.total.toLocaleString()}</span>
                                    </div>
                                    <Bar v={c.pos} max={100} color={c.color} h={3} />
                                </div>
                                <div style={{ textAlign: "right", minWidth: 40 }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: c.color }}>★ {c.avg}</div>
                                    <div style={{ fontSize: 10, color:"#6b7280" }}>/5.0</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>⚠ {t('influencer.negKeywordTitle')}</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {negKeywords.map((k, i) => (
                            <div key={k.word} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(0,0,0,0.03)", borderRadius: 8, border: `1px solid ${i === 0 ? "rgba(239,68,68,0.2)" : "rgba(99,140,255,0.08)"}` }}>
                                <span style={{ fontWeight: 900, color:"#6b7280", width: 18, textAlign: "center", fontSize: 12 }}>{i + 1}</span>
                                <div style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{k.word}</div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <div style={{ width: 60 }}><Bar v={k.count} max={43} color="#ef4444" h={4} /></div>
                                    <span style={{ fontWeight: 700, fontSize: 12, width: 24 }}>{k.count}</span>
                                    <span style={{ fontSize: 10, color: k.change > 0 ? "#ef4444" : "#22c55e", width: 32 }}>{k.change > 0 ? `▲${k.change}` : `▼${Math.abs(k.change)}`}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(239,68,68,0.05)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)", fontSize: 11 }}>
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>🚨 {t("influencerUGC.u_108", "Auto Notification Active")}</span>
                        <span style={{ color:"#6b7280", marginLeft: 8 }}>{t('influencer.negKeywordAlert')}</span>
                    </div>
                </div>
            </div>

            {}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>💬 {t('influencer.reviewFeedTitle')}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <select className="input" style={{ width: 120, padding: "5px 10px", fontSize: 11 }} value={channel} onChange={e => setChannel(e.target.value)}>
                            <option value="all">{t('influencer.filterAllChannel')}</option>
                            {channelStats.map(c => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
                        </select>
                        <select className="input" style={{ width: 100, padding: "5px 10px", fontSize: 11 }} value={sentiment} onChange={e => setSentiment(e.target.value)}>
                            <option value="all">{t('influencer.filterAllSentiment')}</option>
                            <option value="positive">{t('influencer.filterPos')}</option>
                            <option value="neutral">{t('influencer.filterNeutral')}</option>
                            <option value="negative">{t('influencer.filterNeg')}</option>
                        </select>
                        <input className="input" style={{ width: 150, padding: "5px 10px", fontSize: 11 }} placeholder={t('influencer.searchPh')} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                    {filtered.map(r => (
                        <div key={r.id} style={{ padding: "12px 14px", background: r.sentiment === "negative" ? "rgba(239,68,68,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 10, border: `1px solid ${r.sentiment === "negative" ? "rgba(239,68,68,0.15)" : "rgba(99,140,255,0.08)"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Tag label={SENTIMENT_LABEL[r.sentiment]} color={SENTIMENT_COLOR[r.sentiment]} />
                                    <span style={{ fontSize: 11, color:"#6b7280" }}>{r.channel}</span>
                                    <Tag label={r.category} color="#6366f1" />
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <Stars n={r.rating} />
                                    <span style={{ fontSize: 10, color:"#6b7280" }}>{r.date}</span>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color:"#6b7280", marginBottom: 4 }}>{r.product}</div>
                            <div style={{ fontSize: 13, color:"#1f2937", lineHeight: 1.6 }}>{r.text}</div>
                            <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                                <span style={{ fontSize: 11, color:"#6b7280" }}>👍 {r.helpful} {t("influencer.helpful","helpful")}</span>
                                {r.sentiment === "negative" && (
                                    <button onClick={() => { window.location.href = '/reviews-ugc'; }} className="btn-primary" style={{ fontSize: 9, padding: "2px 10px", background: "linear-gradient(135deg,#ef4444,#f97316)" }}>{t('influencer.csRespond')}</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div style={{ textAlign: "center", color:"#6b7280", padding: 32, fontSize: 13 }}>{t('influencer.noResults')}</div>}
                </div>
            </div>
        </div>
    );
});

/* ══════════════════════════════════════════════════════════════════
   TAB 6: AI 인플루언서 평가 Analysis
══════════════════════════════════════════════════════════════════ */
async function fetchInfluencerEval(CREATORS) {
    const data = {
        analysis_date: new Date().toISOString().slice(0, 10),
        creators: CREATORS.map(c => ({
            id: c.id,
            name: c.name,
            tier: c.tier,
            contract_type: c.contract.type,
            flat_fee: c.contract.flatFee,
            perf_rate: c.contract.perfRate,
            total_fee_paid: c.settle.paid,
            views: c.stats.views,
            orders: c.stats.orders,
            revenue: c.stats.revenue,
            ad_spend: c.stats.adSpend,
            roi: c.stats.adSpend > 0
                ? parseFloat((c.stats.revenue / c.stats.adSpend).toFixed(1))
                : null,
            conversion_rate: c.stats.views > 0
                ? parseFloat(((c.stats.orders / c.stats.views) * 100).toFixed(3))
                : 0,
            avg_eng_rate: parseFloat((c.content.reduce((s, v) => s + (v.engRate || 0), 0) / (c.content.length || 1)).toFixed(3)),
            settle_status: c.settle.status,
            esign_status: c.contract.esign,
            content_count: c.content.length,
            // Phase 2~3: 활용 유형·측정 방식·캠페인 목표를 전달 → AI가 목표에 맞는 성공 기준으로 평가
            activation_type: deriveActivationType(c),
            attribution_method: c.attribution?.method || 'manual',
            objective: deriveObjective(c),
            objective_weights: OBJECTIVE_WEIGHTS[deriveObjective(c)],
            performance_score: computePerformanceScore(c).score,
        })),
    };
    const json = await postJson('/v422/ai/influencer-eval', { data });
    if (!json.ok) throw new Error(json.error || 'AI 평가 Failed');
    return json.result;
}

const AIGauge = memo(function AIGauge({ score, size = 48 }) {
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#4f8ef7" : score >= 40 ? "#eab308" : "#ef4444";
    const r = 20, circ = 2 * Math.PI * r, dash = score != null ? (score / 100) * circ : 0;
    return (
        <svg width={size} height={size} viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
            {score != null && <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />}
            <text x="26" y="30" textAnchor="middle" fill={color} fontSize="11" fontWeight="900">{score ?? "—"}</text>
        </svg>
    );
});

const AIGrade = memo(function AIGrade({ grade }) {
    const colors = { S: "#fde047", A: "#22c55e", B: "#4f8ef7", C: "#eab308", D: "#ef4444" };
    const c = colors[grade] || "#6b7280";
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, fontWeight: 900, fontSize: 14,
            background: c + "18", border: `2px solid ${c}44`, color: c
        }}>{grade}</span>
    );
});

const CreatorScoreModal = memo(function CreatorScoreModal({ creator, evalData, onClose }) {
    const { t } = useI18n();
    const { fmt: fmtCur } = useCurrency();
    const result = (evalData?.creators || []).find(c => c.id === creator.id);
    if (!result) return null;
    const bd = result.breakdown || {};
    const contractCfg = { "flat+perf": "#4f8ef7", flat: "#22c55e", perf: "#a855f7" };
    const contractColor = contractCfg[result.fee_recommendation?.contract_type] || "#4f8ef7";
    const renewColor = { '강력 갱신': "#22c55e", '갱신 권장': "#4f8ef7", '조건부 갱신': "#eab308", '재검토 필요': "#f97316", '종료 권고': "#ef4444" };
    const rColor = renewColor[result.renewal_recommendation] || "#374151";

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 500 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(700px,96vw)", maxHeight: "90vh", overflowY: "auto", background: "rgba(255,255,255,0.98)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 22, padding: 28, zIndex: 501, boxShadow: "0 32px 80px rgba(0,0,0,0.85)" }}>
                {}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 10, color: "#a855f7", fontWeight: 700, marginBottom: 3 }}>🤖 {t('influencer.aiEvalTitle')}</div>
                        <div style={{ fontWeight: 900, fontSize: 20 }}>{result.name}</div>
                        <div style={{ fontSize: 11, color:"#6b7280", marginTop: 2 }}>{creator.tier} tier · {creator.id}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <AIGauge score={result.score} size={60} />
                        <AIGrade grade={result.grade} />
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color:"#6b7280", fontSize: 22 }}>✕</button>
                    </div>
                </div>

                {}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color:"#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>📊 {t('influencer.aiBreakdown')}</div>
                    {[
                        { label: 'ROI', score: bd.roi_score, max: 30, actual: creator.stats.adSpend > 0 ? (creator.stats.revenue / creator.stats.adSpend).toFixed(1) + "x" : "—" },
                        { label: 'Conversion', score: bd.conversion_score, max: 25, actual: (creator.stats.orders / creator.stats.views * 100).toFixed(3) + "%" },
                        { label: "Engagement", score: bd.engagement_score, max: 20, actual: (creator.content.reduce((s, v) => s + (v.engRate || 0), 0) / (creator.content.length || 1) * 100).toFixed(1) + "%" },
                        { label: 'Quality', score: bd.content_quality_score, max: 15, actual: creator.content.length + ' items' },
                        { label: 'Reliability', score: bd.reliability_score, max: 10, actual: creator.settle.status },
                    ].map(b => (
                        <div key={b.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                <span style={{ fontWeight: 600 }}>{b.label}</span>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <span style={{ color:"#1f2937", fontWeight: 700 }} >{t('influencer.actual')}: <span>{b.actual}</span></span>
                                    <span style={{ fontWeight: 400, color:"#6b7280" }} >{b.score ?? 0}<span>/{b.max}</span></span>
                                </div>
                            </div>
                            <div style={{ height: 5, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <div style={{ width: `${b.score != null ? (b.score / b.max) * 100 : 0}%`, height: "100%", background: "#a855f7", borderRadius: 5, transition: "width .6s" }} />
                            </div>
                        </div>
                    ))}
                </div>

                {}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color:"#6b7280", marginBottom: 8 }}>✅ {t('influencer.strengths')}</div>
                        {(result.strengths || []).map((s, i) => (
                            <div key={i} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 4, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)", color: "#22c55e" }}>• {s}</div>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color:"#6b7280", marginBottom: 8 }}>⚠️ {t('influencer.weaknesses')}</div>
                        {(result.weaknesses || []).map((w, i) => (
                            <div key={i} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 4, background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.15)", color: "#eab308" }}>• {w}</div>
                        ))}
                    </div>
                </div>

                {}
                {result.fee_recommendation && (
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: `${contractColor}0d`, border: `1px solid ${contractColor}30`, marginBottom: 16 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: contractColor, marginBottom: 12 }}>💰 {t('influencer.aiRecCommission')}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                            {[
                                { l: t('influencer.currentFee'), v: fmtCur(result.fee_recommendation.current_fee || 0) },
                                { l: t('influencer.recFixed'), v: fmtCur(result.fee_recommendation.recommended_flat_fee || 0) },
                                { l: t('influencer.recPerf'), v: ((result.fee_recommendation.recommended_perf_rate || 0) * 100).toFixed(1) + "%" },
                            ].map(({ l, v }) => (
                                <div key={l} style={{ textAlign: "center", padding: "10px 0", borderRadius: 10, background:"rgba(0,0,0,0.03)", border: "1px solid rgba(99,140,255,0.08)" }}>
                                    <div style={{ fontSize: 9, color:"#6b7280" }}>{l}</div>
                                    <div style={{ fontWeight: 800, fontSize: 13, color: contractColor, marginTop: 3 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, color:"#374151", marginBottom: 6 }}>
                            {t("influencer.contractType")}: <strong style={{ color: contractColor }}>{result.fee_recommendation.contract_type}</strong>
                        </div>
                        <div style={{ fontSize: 11, color:"#374151", marginBottom: 6 }}>💡 {result.fee_recommendation.fee_rationale}</div>
                        {result.fee_recommendation.negotiation_tip && (
                            <div style={{ fontSize: 11, padding: "7px 12px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)", color: "#4f8ef7" }}>
                                🤝 {t('influencer.negotiationTip')}: {result.fee_recommendation.negotiation_tip}
                            </div>
                        )}
                    </div>
                )}

                {}
                {result.renewal_recommendation && (
                    <div style={{ padding: "12px 16px", borderRadius: 10, background: `rgba(255,255,255,0.03)`, border: `1px solid ${rColor}30`, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: rColor }}>📝 {t('influencer.aiRenewalRec')}: {result.renewal_recommendation}</div>
                    </div>
                )}

                {}
                {result.ai_insight && (
                    <div style={{ padding: "12px 16px", borderRadius: 10, fontSize: 12, lineHeight: 1.7, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7" }}>
                        🤖 {result.ai_insight}
                    </div>
                )}
            </div>
        </>
    );
});

const Section = memo(function Section() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const [SelId, setSelId] = useState(CREATORS[0]?.id);
    const Creator = CREATORS.find(c => c.id === SelId) || CREATORS[0];
    const Data = Creator?.graphics || DEFAULT_GRAPHICS;
    return (
        <div className="card card-glass" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📊 {t('influencer.aiDemoGraphics')}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {CREATORS.map(c => (
                    <button key={c.id} onClick={() => setSelId(c.id)}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: SelId === c.id ? 'rgba(168,85,247,0.15)' : 'transparent', color: SelId === c.id ? '#a855f7' : '#6b7280', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.2s' }}>
                        {c.name}
                    </button>
                ))}
            </div>
            <InfluencerDemographics data={Data} col="#a855f7" />
        </div>
    );
});

const AIEvalTab = memo(function AIEvalTab() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const [evalResult, setEvalResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modalCreator, setModalCreator] = useState(null);

    const runEval = async () => {
        setLoading(true); setError(null);
        try {
            const r = await fetchInfluencerEval(CREATORS);
            setEvalResult(r);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const tierColor = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
    const renewColor = { '강력 갱신': "#22c55e", '갱신 권장': "#4f8ef7", '조건부 갱신': "#eab308", '재검토 필요': "#f97316", '종료 권고': "#ef4444" };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {}
            <div style={{ padding: "20px 24px", borderRadius: 16, background: "linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.08))", border: "1px solid rgba(168,85,247,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>🤖 {t('influencer.aiEvalTitle')}</div>
                    <div style={{ fontSize: 11, color: '#a855f7' }} >{t('influencer.aiEvalSub')} <strong>{t('influencer.aiDemoGraphics')}</strong></div>
                </div>
                <button onClick={runEval} disabled={loading} style={{ padding: "10px 24px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg,#a855f7,#6366f1)", color:'#1f2937', fontWeight: 800, fontSize: 13, opacity: loading ? 0.7 : 1 }}>
                    {loading ? t('influencer.aiRunning') : t('influencer.aiRunBtn')}
                </button>
            </div>

            {error && (
                <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 12 }}>
                    ❌ {error}
                </div>
            )}

            {loading && (
                <div className="card card-glass" style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t('influencer.aiAnalyzing')}</div>
                    <div style={{ fontSize: 11, color:"#6b7280", marginTop: 6 }}>{CREATORS.length}{t('influencer.aiAnalyzingSub')}</div>
                </div>
            )}

            {!loading && !evalResult && (
                <div className="card card-glass" style={{ padding: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📥 {t('influencer.aiTargetCreators')}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                        {CREATORS.map(c => (
                            <div key={c.id} style={{ padding: "12px 14px", borderRadius: 12, background:"rgba(0,0,0,0.03)", border: `1px solid ${tierColor[c.tier] || "#4f8ef7"}25` }}>
                                <div style={{ fontWeight: 700, color: tierColor[c.tier], fontSize: 13 }}>{c.name}</div>
                                <div style={{ fontSize: 10, color:"#6b7280", marginTop: 2 }}>{c.tier} · {c.contract.type}</div>
                                <div style={{ fontSize: 11, marginTop: 4 }}>Revenue {(c.stats.revenue / 1e6).toFixed(1)}M · {c.stats.orders}건</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", fontSize: 12, color:"#6b7280", marginTop: 14 }}>{t('influencer.aiStartMsg')}</div>
                </div>
            )}

            {!loading && evalResult && (
                <>
                    {}
                    <div style={{ padding: "16px 20px", borderRadius: 14, background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(99,102,241,0.06))", border: "1px solid rgba(168,85,247,0.2)" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: "#a855f7" }}>📋 {t('influencer.aiPortfolioSummary')}</div>
                        <div style={{ fontSize: 12, color:"#374151", lineHeight: 1.7 }}>{evalResult.overall_summary}</div>
                        {evalResult.immediate_action && (
                            <div style={{ marginTop: 10, fontSize: 11, padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)", color: "#4f8ef7" }}>
                                🎯 {t('influencer.aiImmediateAction')}: {evalResult.immediate_action}
                            </div>
                        )}
                    </div>

                    {}
                    {evalResult.creators && <Section />}

                    {}
                    <div className="card card-glass" style={{ padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🏆 {t('influencer.aiRanking')}</div>
                        <div style={{ fontSize: 11, color:"#6b7280", marginBottom: 14 }}>{t('influencer.aiRankingSub')}</div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t("influencerUGC.u_109", "Rank")}</th>
                                    <th>{t("influencerUGC.u_11", "Creator")}</th>
                                    <th style={{ textAlign: "center" }}>{t('influencer.aiScoreTitle')}</th>
                                    <th style={{ textAlign: "center" }}>{t("influencerUGC.u_110", "Grade")}</th>
                                    <th style={{ textAlign: "right" }}>{t("influencerUGC.u_111", "ROI")}</th>
                                    <th style={{ textAlign: "right" }}>{t("influencerUGC.u_91", "Conv. Rate")}</th>
                                    <th>{t('influencer.aiRenewalRec')}</th>
                                    <th>{t('influencer.aiRecCommission')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(evalResult.creators || [])
                                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                                    .map((cr, rank) => {
                                        const orig = CREATORS.find(c => c.id === cr.id);
                                        // 206차 #5: ROI 정의 통일 — ROI 랭킹 탭과 동일한 로컬 공식(revenue/비용)으로
                                        //   산출해 두 탭에서 같은 크리에이터 ROI 값이 일치하도록(API cr.roi 정의 불일치 해소).
                                        const _cost = orig ? ((orig.contract?.flatFee || 0) + (orig.stats?.revenue || 0) * (orig.contract?.perfRate || 0)) : 0;
                                        const uroi = (orig && _cost > 0) ? (orig.stats.revenue / _cost) : (cr.roi != null ? cr.roi : null);
                                        const fc = cr.fee_recommendation;
                                        const rColor = renewColor[cr.renewal_recommendation] || "#6b7280";
                                        const rankIcon = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;
                                        return (
                                            <tr key={cr.id} style={{ cursor: "pointer" }}
                                                onClick={() => setModalCreator(orig)}>
                                                <td style={{ fontWeight: 700 }}>{rankIcon}</td>
                                                <td>
                                                    <div style={{ fontWeight: 700 }}>{cr.name}</div>
                                                    <div style={{ fontSize: 10, color:"#6b7280" }}>{orig?.tier} · {cr.id}</div>
                                                </td>
                                                <td style={{ textAlign: "center" }}><AIGauge score={cr.score} size={36} /></td>
                                                <td style={{ textAlign: "center" }}><AIGrade grade={cr.grade} /></td>
                                                <td style={{ textAlign: "right", fontWeight: 700, color: uroi >= 5 ? "#22c55e" : uroi >= 3 ? "#4f8ef7" : "#eab308" }}>
                                                    {uroi != null ? uroi.toFixed(1) + "x" : "—"}
                                                </td>
                                                <td style={{ textAlign: "right" }}>{orig ? (orig.stats.orders / orig.stats.views * 100).toFixed(3) : "—"}%</td>
                                                <td><span style={{ fontSize: 11, fontWeight: 700, color: rColor }}>{cr.renewal_recommendation || "—"}</span></td>
                                                <td style={{ fontSize: 11 }}>
                                                    {fc ? (
                                                        <div>
                                                            <div style={{ color: "#4f8ef7", fontWeight: 700 }}>{fc.contract_type}</div>
                                                            <div style={{ fontSize: 10, color:"#6b7280" }}>
                                                                {fc.recommended_flat_fee ? fmt(Number(fc.recommended_flat_fee)) : ""}
                                                                {fc.recommended_perf_rate ? " + " + (fc.recommended_perf_rate * 100).toFixed(1) + "%" : ""}
                                                            </div>
                                                        </div>
                                                    ) : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {}
                    {(evalResult.portfolio_insights || []).length > 0 && (
                        <div className="card card-glass" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{t('influencerUGC.txt_포트폴리오전략인사이_44', '💡 포트폴리오 전략 인사이트')}</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {evalResult.portfolio_insights.map((ins, i) => (
                                    <div key={i} style={{ padding: "9px 13px", borderRadius: 9, fontSize: 12, lineHeight: 1.6, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)", color: "#4f8ef7" }}>
                                        💡 {ins}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {}
                    {evalResult.budget_optimization && (
                        <div style={{ padding: "14px 18px", borderRadius: 13, background: "linear-gradient(135deg,rgba(99,102,241,0.09),rgba(168,85,247,0.07))", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#6366f1", marginBottom: 6 }}>{t('influencerUGC.txt_Budget최적화제_45', '💰 예산 최적화 제안')}</div>
                            <div style={{ fontSize: 12, color:"#374151", lineHeight: 1.7 }}>{evalResult.budget_optimization}</div>
                        </div>
                    )}

                    <div style={{ textAlign: "center" }}>
                        <button onClick={runEval} disabled={loading} style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(168,85,247,0.3)", background: "transparent", color: "#a855f7", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{t('influencerUGC.txt_AI재Analysi_46', '🔄 AI 재분석')}</button>
                    </div>
                </>
            )}

            {modalCreator && evalResult && (
                <CreatorScoreModal creator={modalCreator} evalData={evalResult} onClose={() => setModalCreator(null)} />
            )}
        </div>
    );
});

/* ══════════════════════════════════════════════════════════════════
   ANTI-HACKING SECURITY SHIELD (Enterprise-Grade)
   Uses centralized SecurityGuard.js — XSS, CSRF, brute-force,
   DevTools, postMessage, localStorage tampering, clickjacking
══════════════════════════════════════════════════════════════════ */
function useInfluencerSecurity() {
    const { t } = useI18n();
    const { addAlert } = useGlobalData();
    const [hackAlert, setHackAlert] = useState(null);

    // Enterprise SecurityGuard — monitors all vectors
    useEnterpriseSecurity({
        enabled: true,
        addAlert: (info) => {
            if (info.type === 'error' || info.type === 'critical') {
                setHackAlert(info.msg || t('security.hackDetected', '🚨 [보안 경보] 해킹 시도가 탐지되었습니다.'));
                addAlert({ type: 'warn', msg: `🛡️ [인플루언서 보안] ${info.msg}` });
            }
        },
    });

    // Additional input-level XSS detection specific to this module
    useEffect(() => {
        const detectXSS = (e) => {
            const val = e.target?.value || '';
            if (/(<script|javascript:|on\w+=|eval\(|DROP\s+TABLE|UNION\s+SELECT)/gi.test(val)) {
                setHackAlert(t('security.hackDetected', '🚨 [보안 경보] 비정상적인 데이터 주입(해킹) 시도가 탐지되었습니다. 접속 IP가 로깅되며 세션이 차단될 수 있습니다.'));
                e.target.value = '';
                e.preventDefault();
                addAlert({ type: 'warn', msg: `🛡️ XSS 주입 차단: ${val.slice(0, 50)}...` });
            }
        };
        document.addEventListener('input', detectXSS, true);
        return () => document.removeEventListener('input', detectXSS, true);
    }, [t, addAlert]);

    return { alert: hackAlert, clearAlert: () => setHackAlert(null) };
}


/* ══════════════════════════════════════════════════════════════════
   AUTO-LOAD: Fetch influencer data from API → GlobalDataContext sync
   Ensures real-time sync across all modules (Dashboard, CRM, P&L, etc.)
══════════════════════════════════════════════════════════════════ */
function useInfluencerDataSync() {
    const { creators, ugcReviews, channelStats, negKeywords,
            syncCreators, syncUgcReviews, syncChannelStats, syncNegKeywords } = useGlobalData();
    const loaded = useRef(false);
    const ready = useRef(false); // GET 완료 전에는 autosave 금지(초기 빈배열이 백엔드를 덮어쓰는 race 방지)

    useEffect(() => {
        if (loaded.current) return;
        loaded.current = true;
        // [현 차수] H4: /v423/influencer/* (신설 백엔드) 에서 테넌트 영속 데이터 동기화.
        Promise.allSettled([
            getJsonAuth('/api/v423/influencer/creators'),
            getJsonAuth('/api/v423/influencer/ugc-reviews'),
            getJsonAuth('/api/v423/influencer/channel-stats'),
            getJsonAuth('/api/v423/influencer/neg-keywords'),
        ]).then(([creatorsRes, reviewsRes, statsRes, kwRes]) => {
            if (creatorsRes.status === 'fulfilled' && Array.isArray(creatorsRes.value) && creatorsRes.value.length) syncCreators(creatorsRes.value);
            if (reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value) && reviewsRes.value.length) syncUgcReviews(reviewsRes.value);
            if (statsRes.status === 'fulfilled' && Array.isArray(statsRes.value) && statsRes.value.length) syncChannelStats(statsRes.value);
            if (kwRes.status === 'fulfilled' && Array.isArray(kwRes.value) && kwRes.value.length) syncNegKeywords(kwRes.value);
        }).catch(() => { /* Network error — uses existing context data */ })
          .finally(() => { ready.current = true; });
    }, [syncCreators, syncUgcReviews, syncChannelStats, syncNegKeywords]);

    // [현 차수] H4: 운영 영속 — updateCreator 등 편집을 백엔드에 디바운스 저장(데모 제외, GET 완료 후).
    useEffect(() => {
        if (!ready.current || IS_DEMO) return;
        const id = setTimeout(() => { postJson('/api/v423/influencer/creators', { items: creators }).catch(() => {}); }, 1200);
        return () => clearTimeout(id);
    }, [creators]);
    useEffect(() => {
        if (!ready.current || IS_DEMO) return;
        const id = setTimeout(() => { postJson('/api/v423/influencer/ugc-reviews', { items: ugcReviews }).catch(() => {}); }, 1200);
        return () => clearTimeout(id);
    }, [ugcReviews]);
    useEffect(() => {
        if (!ready.current || IS_DEMO) return;
        const id = setTimeout(() => { postJson('/api/v423/influencer/channel-stats', { items: channelStats }).catch(() => {}); }, 1200);
        return () => clearTimeout(id);
    }, [channelStats]);
    useEffect(() => {
        if (!ready.current || IS_DEMO) return;
        const id = setTimeout(() => { postJson('/api/v423/influencer/neg-keywords', { items: negKeywords }).catch(() => {}); }, 1200);
        return () => clearTimeout(id);
    }, [negKeywords]);
}

export default function InfluencerUGC() {
    const CREATORS = useSafeCreators();
    const { t } = useI18n();
    const { alert: hackAlert, clearAlert: clearHack } = useInfluencerSecurity();
    const { fmt } = useCurrency();
    const [tab, setTab] = useState("identity");

    useInfluencerDataSync();

    const anomalyCount = CREATORS.filter(c =>
        c.contract?.esign === "pending" ||
        (c.contract?.whitelist && daysLeft(c.contract?.whitelistExpiry) < 0) ||
        c.settle?.status === "overpaid" || c.settle?.status === "unpaid"
    ).length;

    const TABS=useMemo(()=>[
        {id:'identity',icon:'🧑',label:t('influencer.tab_identity','크리에이터 통합')},
        {id:'contract',icon:'📝',label:t('influencer.tab_contract','계약 & 화이트리스트')},
        {id:'settle',icon:'💰',label:t('influencer.tab_settle','정산 & 검증')},
        {id:'roi',icon:'🏆',label:t('influencer.tab_roi','ROI 랭킹')},
        {id:'ugc',icon:'⭐',label:t('influencer.tab_ugc','UGC 리뷰')},
        {id:'ai_eval',icon:'🤖',label:t('influencer.tab_ai_eval','AI 평가 분석')},
        {id:'guide',icon:'📖',label:t('influencer.tab_guide','이용 가이드')},
    ],[t]);

    const C={accent:"#6366f1",green:"#22c55e",red:"#ef4444",yellow:"#eab308",purple:"#a855f7",cyan:"#06b6d4"};

    return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
            {/* Security Alert */}
            {hackAlert && (
                <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:99999, background:'rgba(239,68,68,0.95)', backdropFilter:'blur(10px)', border:'1px solid #fca5a5', padding:'16px 24px', borderRadius:12, color:'#fff', fontWeight:900, fontSize:13, boxShadow:'0 20px 40px rgba(220,38,38,0.4)', display:'flex', alignItems:'center', gap:14 }}>
                    <span style={{ fontSize:24 }}>🛡️</span>
                    <span>{hackAlert}</span>
                    <button onClick={clearHack} style={{ marginLeft:20, background:'rgba(0,0,0,0.3)', border:'none', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontWeight:700 }}>
                        {t('influencer.dismiss','닫기')}
                    </button>
                </div>
            )}

            {/* Sync Bar — same as SMS */}
            <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.12)', fontSize:10, color:'#6366f1', fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }}/>
                {t('influencer.liveSyncMsg','실시간 크로스탭 동기화 활성')}
            </div>

            {/* Hero — exactly like SMS Marketing */}
            <div style={{ borderRadius:16, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', padding:'13px 28px', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
                    <div>
                        <div style={{ fontSize:24, fontWeight:900, color:'#1f2937' }}>🤝 {t('influencer.title','인플루언서·UGC 허브')}</div>
                        <div style={{ fontSize:13, color:'#374151', fontWeight:600, marginTop:4 }}>{t('influencer.subtitle','크리에이터 정체성 통합 · 계약 관리 · 자동 정산 · ROI 랭킹 · 콘텐츠 재활용')}</div>
                        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#6366f118', color:'#6366f1', border:'1px solid #6366f133', fontWeight:700 }}>
                                {t('influencer.totalCreators','크리에이터')} {CREATORS.length}
                            </span>
                            {anomalyCount>0&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#ef444418', color:'#ef4444', border:'1px solid #ef444433', fontWeight:700 }}>
                                ⚠ {t('influencer.reviewReq','검토 필요')} {anomalyCount}
                            </span>}
                            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#06b6d418', color:'#06b6d4', border:'1px solid #06b6d433', fontWeight:700 }}>
                                🛡️ Security Active
                            </span>
                        </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        {[
                            {l:t('influencer.totalCreators','크리에이터'),v:CREATORS.length,c:'#6366f1'},
                            {l:t('influencer.connectedPlatforms','연동 플랫폼'),v:CREATORS.reduce((s,c)=>s+c.identities.length,0),c:'#22c55e'},
                            {l:t('influencer.dupSuspected','이상 감지'),v:anomalyCount,c:'#ef4444'}
                        ].map(k=>(
                            <div key={k.l} style={{ padding:'8px 14px', borderRadius:10, background:k.c+'10', border:'1px solid '+k.c+'22', textAlign:'center' }}>
                                <div style={{ fontSize:18, fontWeight:900, color:k.c }}>{k.v}</div>
                                <div style={{ fontSize:10, color:'#6b7280' }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs — same style as SMS Marketing */}
            <div className="page-subtabs" style={{ display:'flex', gap:4, padding:5, background:'rgba(0,0,0,0.04)', borderRadius:14, overflowX:'auto', flexShrink:0, marginBottom:12 }}>
                {TABS.map(tb=>(
                    <button key={tb.id} onClick={()=>setTab(tb.id)}
                        className={tab===tb.id?'influencer-active-tab':''}
                        style={{ padding:'8px 14px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, flex:1, whiteSpace:'nowrap', background:tab===tb.id?C.accent:'transparent', color:tab===tb.id?'#ffffff':'#4b5563', transition:'all 150ms' }}>{tb.icon} {tb.label}</button>
                ))}
            </div>

            {/* Content — scrollable area */}
            <div style={{ flex:1, overflowY:'auto', paddingBottom:20 }}>
                {tab === "identity" && <IdentityTab />}
                {tab === "contract" && <ContractTab />}
                {tab === "settle" && <SettleTab />}
                {tab === "roi" && <ROITab />}
                {tab === "ugc" && <UGCTab />}
                {tab === "ai_eval" && <AIEvalTab />}
                {tab === "guide" && <InfluencerGuideTab />}
            </div>
        </div>
    );
}
