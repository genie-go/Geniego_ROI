import React, { useState, useEffect, useCallback } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';
// [237차] getJson(비인증)→getJsonAuth(세션 Bearer) 별칭. /api/v419/kr/* 는 핸들러가 미들웨어
//   auth_tenant 만 신뢰(self-auth 없음)+세션게이트 편입 → 인증 GET 필수. postJson/patchJson은 인증됨.
import { getJsonAuth as getJson, postJson, patchJson } from '../services/apiClient';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx'; // [현 차수] 데모 정산요약/대사 폴백 — 주문 SSOT 파생

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리
const API = "/api";

/* [현 차수] 데모 KR 정산 요약 폴백 — v419 데모 백엔드 부재 시 주문(orders)에서 채널별 정산 파생(since~until 윈도우).
   ko-KR at 파싱불가 → atISO 사용. gross=Σtotal, 수수료=platformFeeRate, 광고비=fee, 정산=gross-수수료합. 선택 기간 반응. */
const _KR_CH_NAME = { coupang: '쿠팡', naver: '네이버 스마트스토어', smartstore: '네이버 스마트스토어', oliveyoung: '올리브영', '11st': '11번가', gmarket: 'G마켓', auction: '옥션', kakao: '카카오선물하기', lotteon: '롯데ON', wemef: '위메프', tmon: '티몬' };
function deriveKrSettleSummary(orders, since, until) {
  const sT = since ? new Date(since + 'T00:00:00').getTime() : 0;
  const uT = until ? new Date(until + 'T23:59:59').getTime() : Date.now();
  const by = {};
  (orders || []).forEach(o => {
    const ch = o.ch || o.channel; if (!ch || !(ch in _KR_CH_NAME)) return;
    const c = o.atISO || o.created_at || (o.month ? o.month + '-01' : null); const d = c ? new Date(c).getTime() : NaN;
    if (isNaN(d) || d < sT || d > uT) return;
    if (/cancel|취소/i.test(String(o.status || ''))) return;
    const gross = Number(o.total || 0);
    const pfee = Math.round(gross * Number(o.platformFeeRate || 0.055));
    const adf = Number(o.fee || Math.round(gross * 0.03));
    const isRet = /return|반품|refund|환불/i.test(String(o.status || ''));
    const shipf = 0, retf = isRet ? Math.round(gross * 0.02) : 0, coupon = Math.round(gross * 0.015), vat = Math.round(gross / 11);
    if (!by[ch]) by[ch] = { channel_key: ch, display_name: _KR_CH_NAME[ch], lines: 0, gross_sales: 0, platform_fee: 0, ad_fee: 0, shipping_fee: 0, return_fee: 0, coupon_discount: 0, vat: 0, net_payout: 0 };
    const r = by[ch]; r.lines += 1; r.gross_sales += gross; r.platform_fee += pfee; r.ad_fee += adf; r.shipping_fee += shipf; r.return_fee += retf; r.coupon_discount += coupon; r.vat += vat;
    r.net_payout += gross - pfee - adf - shipf - retf - coupon;
  });
  const channels = Object.values(by).map(r => ({ ...r, effective_fee_rate_pct: r.gross_sales > 0 ? Math.round((r.gross_sales - r.net_payout) / r.gross_sales * 1000) / 10 : 0 })).sort((a, b) => b.gross_sales - a.gross_sales);
  const totals = channels.reduce((a, c) => { ['gross_sales', 'platform_fee', 'ad_fee', 'shipping_fee', 'return_fee', 'coupon_discount', 'vat', 'net_payout', 'lines'].forEach(k => a[k] = (a[k] || 0) + c[k]); return a; }, {});
  totals.effective_fee_rate_pct = totals.gross_sales > 0 ? Math.round((totals.gross_sales - totals.net_payout) / totals.gross_sales * 1000) / 10 : 0;
  return { ok: true, totals, channels };
}

const KRW = (v) =>
    v == null ? "—" : new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(Number(v));

const PCT = (v) => (v == null ? "—" : Number(v).toFixed(2) + "%");

const CHANNEL_COLORS = {
    coupang: "#ef4444", naver: "#22c55e", "11st": "#f97316",
    gmarket: "#6366f1", auction: "#06b6d4", kakaogift: "#fbbf24",
    lotteon: "#a855f7", wemef: "#ec4899", tmon: "#14b8a6",
};
const chColor = (k) => CHANNEL_COLORS[k] || "#64748b";

/* 184차 #3 — 데모 가상 채널 마스터 시드(빈상태 방지). 운영(_isDemo=false)은 실 API 데이터만 사용. */
const DEMO_KR_CHANNELS = [
    { channel_key: "coupang",   display_name: "쿠팡",            currency: "KRW", settlement_cycle: "주 1회(주정산)",  vat_rate: 0.10, note: "로켓배송은 별도 정산 주기 적용" },
    { channel_key: "naver",     display_name: "네이버 스마트스토어", currency: "KRW", settlement_cycle: "구매확정+2영업일", vat_rate: 0.10, note: "네이버페이 연동 정산" },
    { channel_key: "11st",      display_name: "11번가",          currency: "KRW", settlement_cycle: "월 2회(15/말)",   vat_rate: 0.10, note: "" },
    { channel_key: "gmarket",   display_name: "G마켓",           currency: "KRW", settlement_cycle: "월 2회(익월 정산)", vat_rate: 0.10, note: "스마일배송 수수료 별도" },
    { channel_key: "auction",   display_name: "옥션",            currency: "KRW", settlement_cycle: "월 2회",          vat_rate: 0.10, note: "" },
    { channel_key: "kakaogift", display_name: "카카오 선물하기",   currency: "KRW", settlement_cycle: "월 1회",          vat_rate: 0.10, note: "선물 수신 확정 기준 정산" },
    { channel_key: "lotteon",   display_name: "롯데온",          currency: "KRW", settlement_cycle: "월 2회",          vat_rate: 0.10, note: "" },
    { channel_key: "wemef",     display_name: "위메프",          currency: "KRW", settlement_cycle: "월 1회",          vat_rate: 0.10, note: "" },
    { channel_key: "tmon",      display_name: "티몬",            currency: "KRW", settlement_cycle: "월 1회",          vat_rate: 0.10, note: "" },
];
/** 채널 응답이 비었을 때의 폴백: 데모만 시드, 운영은 빈 배열(목 데이터 유입 0). */
const krChannelsFallback = (d) => (d && d.channels && d.channels.length) ? d.channels : (_isDemo ? DEMO_KR_CHANNELS : []);

const Badge = ({ label, color }) => (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
        {label}
    </span>
);

const Sev = ({ s }) => {
    const c = s === "high" ? "#ef4444" : s === "medium" ? "#f97316" : "#eab308";
    return <Badge label={s} color={c} />;
};

const TicketStatus = ({ t, onPatch }) => {
    const s = t.status;
    const c = s === "resolved" || s === "waived" ? "#22c55e" : s === "investigating" ? "#f97316" : "#64748b";
    return (
        <select value={s} onChange={(e) => onPatch(t.id, { status: e.target.value })}
            style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: c, padding: "3px 6px", fontSize: 11 }}>
            {["open", "investigating", "resolved", "waived"].map((x) => (
                <option key={x} value={x}>{x}</option>
            ))}
        </select>
    );
};

// ── Tab: Channels ─────────────────────────────────────────────────────────────
/* Mock data permanently removed — KrChannel uses live API only */

function ChannelsTab() {
    const t = useT();
    const [channels, setChannels] = useState([]);
    const [isMock, setIsMock] = useState(false);
    useEffect(() => {
        getJson(`${API}/v419/kr/channels`)
            .then((d) => { setChannels(krChannelsFallback(d)); setIsMock(false); })
            .catch(() => { setChannels(_isDemo ? DEMO_KR_CHANNELS : []); setIsMock(!_isDemo); });
    }, []);

    return (
        <div>
            {isMock && (
                <div style={{ marginBottom: 12, padding: "6px 14px", borderRadius: 8, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 11, color: "#eab308" }}>
                    {t('krChannel.apiDisconnected', 'API 연결 대기 중')}
                </div>
            )}
            <h3 style={{ marginTop: 0, fontSize: 14 }}>{t('krChannel.channelMaster', '🇰🇷 채널 마스터리스트')}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {channels.map((ch) => (
                    <div key={ch.channel_key} className="card" style={{ borderLeft: `3px solid ${chColor(ch.channel_key)}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{ch.display_name}</span>
                            <Badge label={ch.channel_key} color={chColor(ch.channel_key)} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                            <span>{t('krChannel.lblCurrency', '화폐')}</span><span style={{ color: '#fff' }}>{ch.currency}</span>
                            <span>{t('krChannel.lblSettleCycle', '정산 주기')}</span><span style={{ color: '#fff' }}>{ch.settlement_cycle}</span>
                            <span>{t('krChannel.lblVat', '부가세')}</span><span style={{ color: '#fff' }}>{(ch.vat_rate * 100).toFixed(0)}%</span>
                        </div>
                        {ch.note && (<div style={{ marginTop: 6, fontSize: 10, color: "#64748b", borderTop: "1px solid #1c2842", paddingTop: 4 }}>{ch.note}</div>)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Tab: Fee Rules ────────────────────────────────────────────────────────────
function FeeRulesTab() {
    const t = useT();
    const [channels, setChannels] = useState([]);
    const [sel, setSel] = useState("");
    const [rules, setRules] = useState([]);
    const [form, setForm] = useState({
        channel_key: "", category: "*", platform_fee_rate: "", ad_fee_rate: "",
        shipping_standard: "", free_ship_threshold: "", return_fee_standard: "", vat_rate: "0.10", note: "",
        effective_from: new Date().toISOString().slice(0, 10),
    });
    const [msg, setMsg] = useState("");

    useEffect(() => {
        getJson(`${API}/v419/kr/channels`)
            .then((d) => setChannels(krChannelsFallback(d)))
            .catch(() => setChannels(_isDemo ? DEMO_KR_CHANNELS : []));
    }, []);

    const loadRules = (key) => {
        setSel(key);
        setForm((f) => ({ ...f, channel_key: key }));
        getJson(`${API}/v419/kr/fee-rules/${key}`)
            .then((d) => setRules(d.rules || [])).catch(() => { });
    };

    const save = async () => {
        const d = await postJson(`${API}/v419/kr/fee-rules`, {
            ...form,
            platform_fee_rate: parseFloat(form.platform_fee_rate) || 0,
            ad_fee_rate: parseFloat(form.ad_fee_rate) || 0,
            shipping_standard: parseFloat(form.shipping_standard) || 0,
            free_ship_threshold: parseFloat(form.free_ship_threshold) || 0,
            return_fee_standard: parseFloat(form.return_fee_standard) || 0,
            vat_rate: parseFloat(form.vat_rate) || 0.1,
        });
        setMsg(d.ok ? t('krChannel.saved', '✅ 저장됨') + " (id:" + d.id + ")" : "❌ " + d.error);
        if (sel) loadRules(sel);
    };

    const Inp = ({ label, k, ph }) => (
        <div>
            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{label}</label>
            <input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} placeholder={ph}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
        </div>
    );

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>{t('krChannel.commissionReg', '수수료 규칙 등록')}</h4>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: "#7c8fa8" }}>{t('krChannel.channelSelect', '채널 선택')}</label>
                    <select value={form.channel_key} onChange={(e) => { setForm((f) => ({ ...f, channel_key: e.target.value })); if (e.target.value) loadRules(e.target.value); }} style={{ display: "block", width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12, marginTop: 3 }}>
                        <option value="">{t('krChannel.selectPlaceholder', '-- 선택 --')}</option>
                        {channels.map((c) => <option key={c.channel_key} value={c.channel_key}>{c.display_name} ({c.channel_key})</option>)}
                    </select>
                </div>
                <div style={{ display: "grid", gap: 7, marginBottom: 10 }}>
                    <Inp label={t('krChannel.categoryAll', '카테고리 (* = 전체)')} k="category" ph="electronics" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <Inp label={`${t('krChannel.platformFeeRate', '플랫폼 수수료율')} (예: 0.109)`} k="platform_fee_rate" ph="0.109" />
                        <Inp label={t('krChannel.adSpendRate', '광고비율')} k="ad_fee_rate" ph="0.03" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <Inp label={t('krChannel.shippingFee', '기본 배송비 (₩)')} k="shipping_standard" ph="3000" />
                        <Inp label={t('krChannel.returnFee', '기본 반품비 (₩)')} k="return_fee_standard" ph="5000" />
                    </div>
                    <Inp label={t('krChannel.freeShipThreshold', '무료배송 기준금액 (₩, 이상 구매 시 배송비 무료 · 0=항상 유료)')} k="free_ship_threshold" ph="50000" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <Inp label={t('krChannel.vatRateLabel', '부가세율')} k="vat_rate" ph="0.10" />
                        <Inp label={t('krChannel.effectiveDate', '적용 시작일')} k="effective_from" ph="2024-01-01" />
                    </div>
                    <Inp label={t('krChannel.note', '노트')} k="note" ph="2024년 쿠팡 기본 수수료" />
                </div>
                <button className="btn" onClick={save} disabled={!form.channel_key} style={{ width: "100%" }}>
                    {t('krChannel.saveCommission', '+ 수수료 규칙 저장')}
                </button>
                {msg && <div style={{ marginTop: 8, fontSize: 12, color: "#22c55e" }}>{msg}</div>}
            </div>

            <div>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>
                    {sel ? `${sel} ${t('krChannel.commissionHistory', '수수료 규칙 이력')}` : t('krChannel.selectChannelHint', '채널을 선택하면 이력이 표시됩니다')}
                </h4>
                {rules.map((r, i) => (
                    <div key={i} style={{ padding: "8px 10px", background: "#0f172a", borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <Badge label={r.category} color={chColor(sel)} />
                            <span style={{ color: "#64748b" }}>{r.effective_from}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, color: "#94a3b8" }}>
                            <span>{t('krChannel.feeShort', '수수료')} <b style={{ color: '#fff' }}>{PCT(r.platform_fee_rate * 100)}</b></span>
                            <span>{t('krChannel.adShort', '광고')} <b style={{ color: '#fff' }}>{PCT(r.ad_fee_rate * 100)}</b></span>
                            <span>{t('krChannel.shipShort', '배송')} <b style={{ color: '#fff' }}>{KRW(r.shipping_standard)}</b>{Number(r.free_ship_threshold) > 0 && <span style={{ color: '#14b8a6' }}> ({KRW(r.free_ship_threshold)}{t('krChannel.freeAbove', '↑무료')})</span>}</span>
                            <span>{t('krChannel.lblVat', '부가세')} <b style={{ color: '#fff' }}>{PCT(r.vat_rate * 100)}</b></span>
                        </div>
                        {r.note && <div style={{ color: "#64748b", marginTop: 3 }}>{r.note}</div>}
                    </div>
                ))}
                {sel && !rules.length && <div className="sub" style={{ fontSize: 12 }}>{t('krChannel.noRules', '등록된 수수료 규칙 없음')}</div>}
            </div>
        </div>
    );
}

// ── Tab: Ingest Settlement ────────────────────────────────────────────────────
const _LINES = {
    coupang: [{
        order_id: "CP-20240301-001", period_start: "2024-03-01", period_end: "2024-03-31",
        sku: "SKU-A1", product_name: "스니커즈 A", qty: 2, sell_price: 59000,
        gross_sales: 118000, platform_fee: 12862, ad_fee: 3540, shipping_fee: 0,
        return_fee: 0, vat: 11800, coupon_discount: 5000, point_discount: 0,
        other_deductions: 0, net_payout: 84798, currency: "KRW",
    }],
    naver: [{
        order_id: "NV-20240301-002", period_start: "2024-03-01", period_end: "2024-03-31",
        sku: "SKU-B1", product_name: "후드티 B", qty: 1, sell_price: 79000,
        gross_sales: 79000, platform_fee: 4345, ad_fee: 2000, shipping_fee: 2500,
        return_fee: 0, vat: 7900, coupon_discount: 3000, point_discount: 1000,
        other_deductions: 0, net_payout: 58255, currency: "KRW",
    }],
};

function IngestTab() {
    const t = useT();
    const [channels, setChannels] = useState([]);
    const [sel, setSel] = useState("coupang");
    // 207차 운영오염 차단: 가짜 정산 샘플 prefill 은 데모 한정. 운영은 빈 입력에서 시작.
    const [linesJson, setLinesJson] = useState(_isDemo ? JSON.stringify(_LINES["coupang"], null, 2) : "[]");
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getJson(`${API}/v419/kr/channels`)
            .then((d) => setChannels(krChannelsFallback(d)))
            .catch(() => setChannels(_isDemo ? DEMO_KR_CHANNELS : []));
    }, []);

    const load = (key) => {
        setSel(key);
        setLinesJson(_isDemo ? JSON.stringify(_LINES[key] || _LINES["coupang"], null, 2) : "[]");
    };

    const ingest = async () => {
        setLoading(true);
        setMsg({ type: "", text: "" });
        try {
            const lines = JSON.parse(linesJson);
            let d;
            try {
                d = await postJson(`${API}/v419/kr/settle/ingest`, { channel_key: sel, lines });
            } catch (apiErr) {
                // 207차: 운영에서 실패를 가짜 성공([MOCK])으로 표시하던 것 제거 → 정직한 에러.
                if (_isDemo) {
                    setMsg({ type: "ok", text: t('krChannel.mockReprocessed', '✅ [데모] {{n}}건 재처리 시뮬레이션 ({{ch}})', { n: lines.length, ch: sel }) });
                } else {
                    setMsg({ type: "err", text: "❌ " + t('krChannel.ingestFailed', '정산 적재 실패 — 채널 연동/권한을 확인하세요.') + (apiErr?.message ? ` (${apiErr.message})` : '') });
                }
                return;
            }
            setMsg({
                type: d.ok ? "ok" : "err",
                text: d.ok ? t('krChannel.reprocessed', '✅ {{n}}건 재처리 완료 ({{ch}})', { n: d.inserted, ch: sel }) : "❌ " + (d.error || JSON.stringify(d)),
            });
        } catch (e) {
            setMsg({ type: "err", text: "❌ " + e.message });
        } finally { setLoading(false); }
    };

    return (
        <div>
            <h4 style={{ marginTop: 0, fontSize: 13 }}>{t('krChannel.ingestTitle', '정산 라인 재처리 (표준 포맷)')}</h4>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <select value={sel} onChange={(e) => load(e.target.value)}
                    style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 10px", fontSize: 12 }}>
                    {channels.map((c) => <option key={c.channel_key} value={c.channel_key}>{c.display_name}</option>)}
                </select>
                <button className="btn" onClick={() => load(sel)}>{t('krChannel.loadSample', '샘플 데이터 로드')}</button>
                <button className="btn" onClick={ingest} disabled={loading} style={{ background: "#6366f1" }}>
                    {loading ? "⏳" : t('krChannel.reprocessBtn', '📥 정산 재처리')}
                </button>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
                <b style={{ color: "#94a3b8" }}>{t('krChannel.requiredFields', '필수 필드:')}</b> order_id, period_start, period_end, sku, product_name, qty, sell_price, gross_sales, platform_fee, ad_fee, shipping_fee, return_fee, vat, coupon_discount, point_discount, other_deductions, net_payout, currency
            </div>
            <textarea value={linesJson} onChange={(e) => setLinesJson(e.target.value)} rows={18}
                style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1c2842", borderRadius: 6, color: "#94d9a2", fontFamily: "monospace", fontSize: 11, padding: 10, boxSizing: "border-box" }} />
            {msg.text && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 6, fontSize: 12, color: msg.type === "ok" ? "#22c55e" : "#ef4444" }}>
                    {msg.text}
                </div>
            )}
        </div>
    );
}

// ── Tab: Summary ──────────────────────────────────────────────────────────────
function SummaryTab() {
    const t = useT();
    const { orders } = useGlobalData();
    const [data, setData] = useState(null);
    const [since, setSince] = useState(new Date().toISOString().slice(0, 8) + "01");
    const [until, setUntil] = useState(new Date().toISOString().slice(0, 10));

    // [현 차수] 데모 폴백 — v419 데모 백엔드 부재로 빈 화면이던 것 → 주문 SSOT 파생(기간 since~until 반응).
    const load = useCallback(() => {
        if (_isDemo) { setData(deriveKrSettleSummary(orders, since, until)); return; }
        getJson(`${API}/v419/kr/settle/summary?since=${since}&until=${until}`)
            .then(setData).catch(() => { });
    }, [since, until, orders]);
    useEffect(load, [load]);

    const cols = [
        ["gross_sales", t('krChannel.colGrossSales', '매출액')], ["platform_fee", t('krChannel.colPlatformFee', '플랫폼 수수료')], ["ad_fee", t('krChannel.colAdFee', '광고비')],
        ["shipping_fee", t('krChannel.colShipFee', '배송비')], ["return_fee", t('krChannel.colReturnFee', '반품비')], ["coupon_discount", t('krChannel.colCoupon', '쿠폰할인')],
        ["net_payout", t('krChannel.colNetPayout', '정산액')], ["effective_fee_rate_pct", t('krChannel.colEffRate', '유효 수수료율')],
    ];

    return (
        <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
                {[["since", since, setSince], ["until", until, setUntil]].map(([k, v, s]) => (
                    <input key={k} type="date" value={v} onChange={(e) => s(e.target.value)}
                        style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12 }} />
                ))}
                <button className="btn" onClick={load}>{t('krChannel.search', '조회')}</button>
            </div>

            {data && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
                        {[["gross_sales", t('krChannel.totalGrossSales', '총 매출액'), "#6366f1"], ["platform_fee", t('krChannel.totalFee', '총 수수료'), "#ef4444"], ["net_payout", t('krChannel.totalNetPayout', '총 정산액'), "#22c55e"]].map(([k, label, color]) => (
                            <div key={k} className="card" style={{ borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color }}>{KRW(data.totals?.[k])}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #1c2842", color: "#7c8fa8" }}>
                                    <th style={{ padding: "5px 8px", textAlign: "left" }}>{t('krChannel.colChannel', '채널')}</th>
                                    <th style={{ padding: "5px 8px", textAlign: "right" }}>{t('krChannel.colCount', '건수')}</th>
                                    {cols.map(([k, label]) => <th key={k} style={{ padding: "5px 8px", textAlign: "right", fontWeight: 500, fontSize: 10 }}>{label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {(data.channels || []).map((ch) => (
                                    <tr key={ch.channel_key} style={{ borderBottom: "1px solid #0f172a" }}>
                                        <td style={{ padding: "5px 8px" }}>
                                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: chColor(ch.channel_key) }} />
                                                <span style={{ fontWeight: 700 }}>{ch.display_name || ch.channel_key}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8" }}>{ch.lines}</td>
                                        {cols.map(([k]) => (
                                            <td key={k} style={{ padding: "5px 8px", textAlign: "right", color: k === "net_payout" ? "#22c55e" : k === "effective_fee_rate_pct" ? "#f97316" : "#e2e8f0", fontWeight: k === "net_payout" ? 700 : 400 }}>
                                                {k === "effective_fee_rate_pct" ? PCT(ch[k]) : KRW(ch[k])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {!data.channels?.length && (
                                    <tr><td colSpan={cols.length + 2} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                                        {t('krChannel.noDataReprocess', '데이터 없음 — 정산 재처리 탭에서 데이터를 먼저 재처리하세요')}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    
    );
}

// ── Tab: Recon ────────────────────────────────────────────────────────────────
function ReconTab() {
    const t = useT();
    const [channels, setChannels] = useState([]);
    const [form, setForm] = useState({
        channel_key: "coupang",
        period_start: new Date().toISOString().slice(0, 8) + "01",
        period_end: new Date().toISOString().slice(0, 10),
    });
    const [reports, setReports] = useState([]);
    const [selReport, setSelReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getJson(`${API}/v419/kr/channels`)
            .then((d) => setChannels(krChannelsFallback(d)))
            .catch(() => setChannels(_isDemo ? DEMO_KR_CHANNELS : []));
        loadReports();
    }, []);

    const loadReports = () =>
        getJson(`${API}/v419/kr/recon/reports`)
            .then((d) => setReports(d.reports || [])).catch(() => { });

    const openReport = (id) =>
        getJson(`${API}/v419/kr/recon/reports/${id}`)
            .then((d) => setSelReport(d.report || null)).catch(() => { });

    const run = async () => {
        setLoading(true);
        try {
            const d = await postJson(`${API}/v419/kr/recon/run`, form);
            await loadReports();
            if (d.report_id) openReport(d.report_id);
        } finally { setLoading(false); }
    };

    const patchTicket = async (id, patch) => {
        await patchJson(`${API}/v419/kr/recon/tickets/${id}`, patch); // [259차] ${API}(/api) 접두 누락 수정(형제 recon 호출과 정합·SPA HTML 반환 방지)
        if (selReport) openReport(selReport.id);
    };

    return (
        <div>
            <div className="card" style={{ marginBottom: 14 }}>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>{t('krChannel.reconRun', '대사 실행')}</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('krChannel.colChannel', '채널')}</label>
                        <select value={form.channel_key} onChange={(e) => setForm((f) => ({ ...f, channel_key: e.target.value }))}
                            style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 10px", fontSize: 12 }}>
                            {channels.map((c) => <option key={c.channel_key} value={c.channel_key}>{c.display_name}</option>)}
                        </select>
                    </div>
                    {["period_start", "period_end"].map((k) => (
                        <div key={k}>
                            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>
                                {k === "period_start" ? t('krChannel.startDate', '시작일') : t('krChannel.endDate', '종료일')}
                            </label>
                            <input type="date" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                                style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12 }} />
                        </div>
                    ))}
                    <button className="btn" onClick={run} disabled={loading}>
                        {loading ? t('krChannel.running', '⏳ 실행 중…') : t('krChannel.runReconBtn', '🔍 대사 실행')}
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {reports.map((r) => (
                    <button key={r.id} onClick={() => openReport(r.id)}
                        style={{ background: selReport?.id === r.id ? "#1c2842" : "transparent", border: `1px solid ${selReport?.id === r.id ? "#3b4d6e" : "#1c2842"}`, borderRadius: 8, padding: "6px 12px", color: '#fff', cursor: "pointer", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: chColor(r.channel_key) }} />
                        {r.channel_key} · {r.period_start?.slice(0, 7)} · {r.status}
                    </button>
                ))}
                {!reports.length && <div className="sub" style={{ fontSize: 12 }}>{t('krChannel.noReports', '대사 리포트 없음')}</div>}
            </div>

            {selReport && (
                <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                        {[["total_orders", t('krChannel.reconTotal', '전체'), "#6366f1"], ["matched", t('krChannel.reconMatched', '일치'), "#22c55e"], ["mismatch", t('krChannel.reconMismatch', '불일치'), "#ef4444"], ["missing_settlement", t('krChannel.reconMissingSettle', '정산 누락'), "#f97316"], ["missing_order", t('krChannel.reconMissingOrder', '주문 누락'), "#eab308"]].map(([k, label, color]) => (
                            <div key={k} className="card" style={{ borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color }}>{selReport[k]}</div>
                            </div>
                        ))}
                        <div className="card" style={{ borderLeft: "3px solid #ef4444" }}>
                            <div style={{ fontSize: 10, color: "#7c8fa8" }}>{t('krChannel.netDiff', '순액 차이')}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{KRW(selReport.net_diff)}</div>
                        </div>
                        <div className="card" style={{ borderLeft: "3px solid #f97316" }}>
                            <div style={{ fontSize: 10, color: "#7c8fa8" }}>{t('krChannel.feeDiff', '수수료 차이')}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#f97316" }}>{KRW(selReport.fee_diff)}</div>
                        </div>
                    </div>

                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>{t('krChannel.diffTickets', '차이 티켓')} ({selReport.tickets?.length || 0}{t('krChannel.countCases', '건')})</h4>
                    {selReport.tickets?.length ? (
                        <div style={{ display: "grid", gap: 8 }}>
                            {selReport.tickets.map((tk) => (
                                <div key={tk.id} style={{ padding: "10px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1c2842" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                                        <Badge label={tk.category} color={chColor(tk.channel_key)} />
                                        <Sev s={tk.severity} />
                                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{tk.order_id || "?"}</span>
                                        <div style={{ flex: 1 }} />
                                        <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>net △ {KRW(tk.net_diff)}</span>
                                        <span style={{ color: "#f97316", fontSize: 11, fontWeight: 700 }}>fee △ {KRW(tk.fee_diff)}</span>
                                        <TicketStatus t={tk} onPatch={patchTicket} />
                                    </div>
                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{tk.title}</div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="sub" style={{ fontSize: 12 }}>{t('krChannel.noTickets', '✅ 티켓 없음 (차이 기준 미만)')}</div>}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
// 176차 PM8c: hardcoded label → ko.js root.krChannel i18n key 호출 (사용자 이전 차수 자산 활용)
export default function KrChannel() {
  const t = useT();
  const TABS = React.useMemo(() => [
    { id: "channels", label: t('krChannel.tabChannels', '🇰🇷 채널 목록') },
    { id: "fees", label: t('krChannel.tabFees', '📋 수수료 규칙') },
    { id: "ingest", label: t('krChannel.tabIngest', '📥 정산 재처리') },
    { id: "summary", label: t('krChannel.tabSummary', '📊 채널 종합') },
    { id: "recon", label: t('krChannel.tabRecon', '🔍 정산 대사') },
  ], [t]);
    const [tab, setTab] = useState("channels");

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 18 }}>{t('krChannel.pageTitle', '🇰🇷 한국 채널 정산 허브')}</h2>
                <div className="sub">
                    {t('krChannel.pageSub', 'Coupang · Naver · 11번가 · Gmarket · 옥션 · 카카오선물하기 · 롯데ON · 위메프 · 티몬 — 정산 표준화 · 수수료 관리 · 대사 (v419)')}
                </div>
            </div>

            {/* [현 차수] 특정상품 정산 조회 — 선택 시 그 상품 매출·순이익·채널/국가별 인라인(주문 SSOT). 아래 정산/수수료/대사는 전체 기준. */}
            <ProductSelectBar />
            <ProductMarketingPanel period="monthly" />

            <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #1c2842", paddingBottom: 8, flexWrap: "wrap" }}>
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ background: tab === t.id ? "#1c2842" : "transparent", border: "1px solid " + (tab === t.id ? "#3b4d6e" : "transparent"), color: tab === t.id ? "#e2e8f0" : "#7c8fa8", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="card">
                {tab === "channels" && <ChannelsTab />}
                {tab === "fees" && <FeeRulesTab />}
                {tab === "ingest" && <IngestTab />}
                {tab === "summary" && <SummaryTab />}
                {tab === "recon" && <ReconTab />}
            </div>
        </div>
    );
}
