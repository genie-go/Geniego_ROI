import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext';
import { useAuth } from '../auth/AuthContext';
import ApprovalModal from '../components/ApprovalModal.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── CSV Download Util ──────────────────────────────── */
function downloadCSV(filename, headers, rows) {
    const BOM = '\uFEFF';
    const escape = v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
    const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const CHANNELS = [
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" },
    { id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "#ff0050" },
];
const INTL_CHANNELS = [
    { id: "amazon_us", name: "Amazon US", icon: "🇺🇸", color: "#ff9900" },
    { id: "amazon_jp", name: "Amazon JP", icon: "🇯🇵", color: "#e74c3c" },
    { id: "lazada", name: "Lazada", icon: "🌏", color: "#0f146d" },
    { id: "shopee", name: "Shopee", icon: "🛍️", color: "#ee4d2d" },
    { id: "zalando", name: "Zalando", icon: "🇪🇺", color: "#ff6900" },
];
const SLA_HOURS = { coupang: 24, naver: 48, amazon: 48, shopify: 72, "11st": 48, tiktok: 48 };
const ORDER_TAGS = ["VIP", "Urgent", "B2B", "International", "Bundle", "Partial Ship", "재Send"];
const SPLIT_REASONS = ["Stock부족", "Split Warehouse", "무게초과", "구매자요청"];
const INTL_CARRIERS = ["DHL", "FedEx", "UPS", "EMS", "Yamato", "J&T Express"];
const ORDER_STATUS = ["PaymentDone", "Product준Weight", "Shippingin progress", "ShippingDone", "구매확정"];
const CLAIM_TYPES = ["Cancel", "Return", "Exchange", "환불"];
const CLAIM_STATUS = ["요청접Count", "처리in progress", "Done", "반려"];
const CARRIERS = ["CJ대한통운", "롯데택배", "한진택배", "우체국택배", "로젠택배"];


/* ─── Mock data generators ────────────────────────────────────────────────── */
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const SKUS = ["WH-1000XM5", "KB-MXM-RGB", "HC-USB4-7P", "CAM-4K-PRO", "MS-ERG-BL", "CH-60W-GAN"];
const NAMES = ["무선 노이즈캔슬링 헤드폰", "RGB 기계식 키보드", "USB-C 7포트 허브", "4K 웹캠 Pro", "에르고 마우스", "60W 급속충전기"];

const ORDERS = Array.from({ length: 60 }, (_, i) => {
    const si = i % 6;
    const ch = CHANNELS[i % CHANNELS.length];
    const qty = 1 + (i % 3);
    const price = [89000, 149000, 49000, 129000, 69000, 39000][si];
    const total = price * qty;
    const d = new Date(2026, 2, 4 - Math.floor(i / 10), 16 - (i % 8), (i * 7) % 60);
    const orderedMs = d.getTime();
    const slaHrs = SLA_HOURS[ch.id] || 48;
    const slaViolated = (Date.now() - orderedMs) > slaHrs * 3600000 && ['PaymentDone','Product준Weight'].includes(ORDER_STATUS[i % ORDER_STATUS.length]);
    return {
        id: `ORD-20260304-${String(i + 1).padStart(4, "0")}`,
        channel: ch.id,
        sku: `${SKUS[si]}-${String((i % 5) + 1).padStart(2, "0")}`,
        name: NAMES[si],
        qty,
        price,
        total,
        buyer: `buyer${String(i + 1).padStart(3, "0")}@example.com`,
        status: ORDER_STATUS[i % ORDER_STATUS.length],
        carrier: i % 5 === 0 ? null : CARRIERS[i % CARRIERS.length],
        trackingNo: i % 5 === 0 ? null : `${String(200 + i).padStart(3,'0')}${String(i).padStart(10, "0")}`,
        orderedAt: d.toLocaleString("ko-KR"),
        hasClaim: i % 7 === 0,
        settled: i % 3 !== 0,
        settlementAmt: Math.round(total * 0.82),
        slaViolated,
        slaDeadline: new Date(orderedMs + slaHrs * 3600000).toLocaleString('ko-KR'),
        tags: i % 8 === 0 ? ['VIP'] : i % 10 === 0 ? ['B2B'] : [],
        memo: i % 12 === 0 ? 'Customer 요청: 빠른 Shipping 필요' : '',
        partialShipped: i % 15 === 0,
        splitOrders: i % 15 === 0 ? [`${`ORD-20260304-${String(i+100).padStart(4,'0')}`}`] : [],
        wh: ['W001','W002','W003'][i % 3],
    };
});

const INTL_ORDERS = Array.from({ length: 20 }, (_, i) => {
    const ch = INTL_CHANNELS[i % INTL_CHANNELS.length];
    const si = i % 6;
    const qty = 1 + (i % 2);
    const price = [89000, 149000, 49000, 129000, 69000, 39000][si];
    return {
        id: `INTL-2026030-${String(i + 1).padStart(4,'0')}`,
        channel: ch.id, channelName: ch.name,
        sku: SKUS[si], name: NAMES[si], qty, price, total: price * qty,
        buyer: `intl_buyer${i+1}@example.com`,
        country: ['US','JP','SG','TH','DE'][i % 5],
        carrier: INTL_CARRIERS[i % INTL_CARRIERS.length],
        status: ORDER_STATUS[i % ORDER_STATUS.length],
        incoterm: i % 2 === 0 ? 'DDP' : 'DDU',
        hsCode: ['8518.30','9102.11','8473.30','8525.80','8471.60'][i % 5],
        customsDuty: Math.round(price * qty * 0.08),
        orderedAt: new Date(2026, 2, i+1).toLocaleString('ko-KR'),
        trackingNo: `INTL${String(100+i)}`,
    };
});


const CLAIMS = ORDERS.filter(o => o.hasClaim).map((o, i) => ({
    id: `CLM-${String(i + 1).padStart(4, "0")}`,
    orderId: o.id,
    channel: o.channel,
    sku: o.sku,
    name: o.name,
    type: CLAIM_TYPES[i % CLAIM_TYPES.length],
    status: CLAIM_STATUS[i % CLAIM_STATUS.length],
    reason: ["단순 변심", "Product 불량", "오Shipping", "파손", "Description과 다름"][i % 5],
    amount: o.price,
    requestedAt: o.orderedAt,
    resolvedAt: i % 2 === 0 ? new Date(2026, 2, 4).toLocaleDateString("ko-KR") : null,
}));

const DELIVERIES = ORDERS.filter(o => o.carrier).map((o, i) => ({
    id: `DEL-${String(i + 1).padStart(4, "0")}`,
    orderId: o.id,
    channel: o.channel,
    carrier: o.carrier,
    trackingNo: o.trackingNo,
    sku: o.sku,
    buyer: o.buyer,
    status: ["CollectionPending", "CollectionDone", "간선Movein progress", "지점도착", "배달in progress", "배달Done"][i % 6],
    eta: new Date(2026, 2, 5 + (i % 3)).toLocaleDateString("ko-KR"),
    events: [
        { ts: "03/04 08:12", desc: "CollectionDone", loc: "서울 강남 HUB" },
        { ts: "03/04 14:35", desc: "간선Movein progress", loc: "Count도권 메인 HUB" },
        ...(i % 2 === 0 ? [{ ts: "03/04 18:00", desc: "지점도착", loc: "부산 해운대 지점" }] : []),
    ],
}));

const SETTLEMENTS = CHANNELS.map((ch, i) => {
    const gross = rnd(4000000, 20000000);
    const fee = Math.round(gross * (0.08 + i * 0.02));
    const refund = rnd(100000, 500000);
    const net = gross - fee - refund;
    return {
        id: `SET-2026030${i + 1}`,
        channel: ch.id,
        period: "2026-03-01 ~ 2026-03-04",
        grossSales: gross,
        platformFee: fee,
        refundDeduct: refund,
        netPayout: net,
        feeRate: ((fee / gross) * 100).toFixed(1),
        status: i % 4 === 0 ? "처리in progress" : "Done",
        paidAt: i % 4 === 0 ? null : "2026-03-04",
        orders: rnd(30, 200),
    };
});

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const ch = id => CHANNELS.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };
const fmtW = n => n >= 1_000_000 ? `₩${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `₩${(n / 1000).toFixed(0)}K` : `₩${n}`;

function StatusBadge({ s, map }) {
    const cfg = map[s] || { cls: "badge", color: "#64748b" };
    return <span className={`badge ${cfg.cls}`} style={{ fontSize: 9 }}>{s}</span>;
}

const ORDER_STATUS_MAP = { "PaymentDone": { cls: "badge-blue" }, "Product준Weight": { cls: "badge-yellow" }, "Shippingin progress": { cls: "badge-purple" }, "ShippingDone": { cls: "badge-teal" }, "구매확정": { cls: "badge-green" } };
const CLAIM_STATUS_MAP = { "요청접Count": { cls: "badge-blue" }, "처리in progress": { cls: "badge-yellow" }, "Done": { cls: "badge-green" }, "반려": { cls: "badge-red" } };
const SETTLE_STATUS_MAP = { "Done": { cls: "badge-green" }, "처리in progress": { cls: "badge-yellow" } };
const DELIVERY_STATUS_MAP = { "CollectionPending": { cls: "badge" }, "CollectionDone": { cls: "badge-blue" }, "간선Movein progress": { cls: "badge-purple" }, "지점도착": { cls: "badge-teal" }, "배달in progress": { cls: "badge-yellow" }, "배달Done": { cls: "badge-green" } };

function ProgressBar({ pct, color = "#4f8ef7" }) {
    return (
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
        </div>
    );
}

function Drawer({ children, onClose }) {
    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200 }} />
            <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 520, background: "linear-gradient(180deg,#0d1525,#090f1e)", borderLeft: "1px solid rgba(99,140,255,0.2)", zIndex: 201, overflowY: "auto", padding: 26, animation: "slideIn 0.25s cubic-bezier(.4,0,.2,1)" }}>
                {children}
                <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            </div>
        </>
    );
}

/* ─── CRM Sync Button ─────────────────────────────────────────────────────── */
function CrmSyncButton({ order }) {
    const [status, setStatus] = useState(null); // null | 'syncing' | 'done' | 'error'

    const sync = async () => {
        setStatus('syncing');
        try {
            // 1) CRM Customer Register/갱신 (Email 기준 upsert)
            const custRes = await fetch('/api/crm/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: order.buyer,
                    name: order.buyer.split('@')[0],
                    phone: '',
                }),
            }).then(r => r.json());

            const customerId = custRes.customer?.id || custRes.id;
            if (!customerId) { setStatus('error'); return; }

            // 2) 구매 활동 기록
            await fetch(`/api/crm/customers/${customerId}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'purchase',
                    channel: order.channel,
                    amount: order.total,
                    note: `${order.name} x${order.qty} | Orders번호: ${order.id}`,
                }),
            });

            setStatus('done');
            setTimeout(() => setStatus(null), 3000);
        } catch {
            setStatus('error');
        }
    };

    return (
        <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.18)", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>👤 CRM Integration</div>
            {status === 'done' && (
                <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 8 }}>✅ CRM에 Customer·구매 활동이 Register되었습니다</div>
            )}
            {status === 'error' && (
                <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>❌ Sync Failed — CRM API를 Confirm하세요</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={sync} disabled={status === 'syncing'} className="btn-primary" style={{
                    fontSize: 11, padding: "6px 16px",
                    background: status === 'syncing' ? 'rgba(99,140,255,0.2)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                    cursor: status === 'syncing' ? 'not-allowed' : 'pointer',
                }}>
                    {status === 'syncing' ? 'Syncing...' : '👤 CRM에 구매 활동 Register'}
                </button>
                <a href="/crm" style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-3)', textDecoration: 'none', padding: '6px 10px' }}>CRM 보기 →</a>
            </div>
        </div>
    );
}

/* ─── Live Ingest Bar ─────────────────────────────────────────────────────── */
function LiveIngestBar({ tab }) {
    const [tick, setTick] = useState(0);
    const [feed, setFeed] = useState([
        { id: 1, ch: "coupang", type: "Orders", msg: "ORD-20260304-0039 New", ts: "16:49:52" },
        { id: 2, ch: "naver", type: "Shipping", msg: "DEL-00018 지점 도착 Event Count신", ts: "16:49:48" },
        { id: 3, ch: "amazon", type: "Claim", msg: "CLM-0003 Return Request 접Count", ts: "16:49:31" },
    ]);
    const eventPool = [
        { ch: "shopify", type: "Orders", msg: "신규 Orders 접Count" },
        { ch: "tiktok", type: "Orders", msg: "TikTok Shop Orders Count집" },
        { ch: "coupang", type: "Shipping", msg: "배달in progress → 배달Done Event" },
        { ch: "11st", type: "정산", msg: "일per 정산 데이터 Count신" },
        { ch: "naver", type: "Claim", msg: "Exchange Request 접Count" },
        { ch: "amazon", type: "Return", msg: "Return Approval Done" },
    ];
    useEffect(() => {
        const id = setInterval(() => {
            setTick(t => t + 1);
            const ev = eventPool[Math.floor(Math.random() * eventPool.length)];
            const now = new Date().toLocaleTimeString("ko-KR");
            setFeed(f => [{ id: Date.now(), ...ev, ts: now }, ...f.slice(0, 8)]);
        }, 3500);
        return () => clearInterval(id);
    }, []); // eslint-disable-line

    const typeColor = t => ({ "Orders": "#4f8ef7", "Shipping": "#22c55e", "Claim": "#eab308", "Return": "#f97316", "정산": "#a855f7" })[t] || "#4f8ef7";

    return (
        <div className="card card-glass" style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>🔴 실Time Count집 피드</div>
                <span className="badge badge-green" style={{ fontSize: 9 }}><span className="dot dot-green" /> LIVE · {tick * 1 + 3}건 Count집</span>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                {feed.map(f => (
                    <div key={f.id} style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 8, background: "rgba(9,15,30,0.7)", border: `1px solid ${typeColor(f.type)}22`, animation: "fadeIn 0.3s" }}>
                        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontSize: 11 }}>{ch(f.ch).icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: typeColor(f.type), padding: "1px 5px", background: typeColor(f.type) + "18", borderRadius: 4 }}>{f.type}</span>
                            <span style={{ fontSize: 9, color: "var(--text-3)" }}>{f.ts}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-2)", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.msg}</div>
                    </div>
                ))}
            </div>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}`}</style>
        </div>
    );
}

/* ─── Tab: Orders ──────────────────────────────────────────────────────────── */
function OrderTab() {
    const [search, setSearch] = useState("");
    const [selCh, setSelCh] = useState("all");
    const [selSt, setSelSt] = useState("all");
    const [page, setPage] = useState(0);
    const [detail, setDetail] = useState(null);
    const PAGE = 10;

    const filtered = useMemo(() => {
        let rows = ORDERS;
        if (search) rows = rows.filter(r => r.id.includes(search) || r.sku.includes(search) || r.buyer.includes(search));
        if (selCh !== "all") rows = rows.filter(r => r.channel === selCh);
        if (selSt !== "all") rows = rows.filter(r => r.status === selSt);
        return rows;
    }, [search, selCh, selSt]);

    const paged = filtered.slice(page * PAGE, (page + 1) * PAGE);
    const totalPages = Math.ceil(filtered.length / PAGE);

    const kpis = useMemo(() => ({
        total: ORDERS.length,
        today: ORDERS.filter(o => o.orderedAt.includes("2026")).length,
        shipped: ORDERS.filter(o => o.status === "Shippingin progress" || o.status === "ShippingDone").length,
        claims: ORDERS.filter(o => o.hasClaim).length,
        revenue: ORDERS.reduce((s, o) => s + o.total, 0),
    }), []);

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                {[
                    { l: "All Orders", v: kpis.total, c: "#4f8ef7" },
                    { l: "금일 Orders", v: kpis.today, c: "#22c55e" },
                    { l: "Shippingin progress", v: kpis.shipped, c: "#a855f7" },
                    { l: "Claim", v: kpis.claims, c: "#ef4444" },
                    { l: "Total Revenue", v: fmtW(kpis.revenue), c: "#f97316" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ "--accent": c, padding: "12px 14px" }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input" style={{ flex: "1 1 180px" }} placeholder="Orders번호·SKU·Email Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
                <select className="input" style={{ width: 130 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input" style={{ width: 130 }} value={selSt} onChange={e => setSelSt(e.target.value)}>
                    <option value="all">All Status</option>
                    {ORDER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ alignSelf: "center", fontSize: 11, color: "var(--text-3)" }}>{filtered.length} items</span>
                <button className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "5px 12px" }}
                    onClick={() => downloadCSV(`Orders_${new Date().toISOString().slice(0,10)}.csv`,
                        ['Orders번호','Channel','Product Name','SKU','Quantity','Amount','Status','Claim','정산','Orders일시'],
                        filtered.map(o => [o.id, ch(o.channel).name, o.name, o.sku, o.qty, o.total, o.status, o.hasClaim?'Present':'None', o.settled?'Done':'Pending', o.orderedAt.slice(0,10)]))}>
                    📥 엑셀 Download
                </button>
            </div>

            {/* Table */}
            <table className="table">
                <thead>
                    <tr><th>Orders번호</th><th>Channel</th><th>Product</th><th>Quantity</th><th>Amount</th><th>Status</th><th>Claim</th><th>정산</th><th>Orders일시</th><th>상세</th></tr>
                </thead>
                <tbody>
                    {paged.map(o => (
                        <tr key={o.id} style={{ background: o.slaViolated ? 'rgba(239,68,68,0.04)' : '' }}>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "#4f8ef7" }}>
                                {o.id}
                                {o.slaViolated && <span className="badge badge-red" style={{ fontSize: 8, marginLeft: 4 }}>SLA위반</span>}
                            </td>
                            <td><span style={{ fontSize: 14 }}>{ch(o.channel).icon}</span></td>
                            <td>
                                <div style={{ fontSize: 11, fontWeight: 600 }}>{o.name}</div>
                                <div style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text-3)" }}>{o.sku}</div>
                                {o.tags?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                                        {o.tags.map(t => <span key={t} className="badge badge-blue" style={{ fontSize: 8 }}>{t}</span>)}
                                    </div>
                                )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                                {o.qty}
                                {o.partialShipped && <div style={{ fontSize: 8, color: '#f97316' }}>Partial Ship</div>}
                            </td>
                            <td style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>{fmtW(o.total)}</td>
                            <td><StatusBadge s={o.status} map={ORDER_STATUS_MAP} /></td>
                            <td>{o.hasClaim ? <span className="badge badge-red" style={{ fontSize: 9 }}>⚠</span> : <span style={{ color: "var(--text-3)", fontSize: 10 }}>—</span>}</td>
                            <td>{o.settled ? <span className="badge badge-green" style={{ fontSize: 9 }}>Done</span> : <span className="badge badge-yellow" style={{ fontSize: 9 }}>Pending</span>}</td>
                            <td style={{ fontSize: 10, color: "var(--text-3)" }}>{o.orderedAt.slice(0, 10)}</td>
                            <td><button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setDetail(o)}>상세</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, filtered.length)} / {filtered.length}</span>
                <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={!page} onClick={() => setPage(p => p - 1)}>‹ Previous</button>
                    {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => (
                        <button key={i} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11, background: i === page ? "#4f8ef7" : "", color: i === page ? "#fff" : "" }} onClick={() => setPage(i)}>{i + 1}</button>
                    ))}
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
                </div>
            </div>

            {/* Order Detail Drawer */}
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: "#4f8ef7", fontFamily: "monospace" }}>{detail.id}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{ch(detail.channel).icon} {ch(detail.channel).name}</div>
                        </div>
                        <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => setDetail(null)}>✕</button>
                    </div>

                    {[
                        ["Product", `${detail.name} (${detail.sku})`],
                        ["Quantity", detail.qty],
                        ["Sale Price", fmtW(detail.price)],
                        ["Total", fmtW(detail.total)],
                        ["구매자", detail.buyer],
                        ["Orders일시", detail.orderedAt],
                        ["Orders Status", detail.status],
                        ["정산 Amount", fmtW(detail.settlementAmt)],
                        ["정산 Status", detail.settled ? "Done" : "Pending"],
                        ["창고", detail.wh || 'W001'],
                        ["SLA 마감", detail.slaDeadline || '-'],
                    ].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                            <span style={{ color: "var(--text-3)" }}>{l}</span>
                            <span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                    ))}
                    {detail.slaViolated && (
                        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                            SLA
                        </div>
                    )}
                    <WmsSyncPanel order={detail} />
                    <MemoTagPanel order={detail} />
                    <CrmSyncButton order={detail} />
                </Drawer>
            )}
        </div>
    );
}


/* ─── Note/Tag Panel ─────────────────────────────────────────────────────── */
function MemoTagPanel({ order }) {
    const { orderMemos, setOrderMemo } = useGlobalData();
    const saved = orderMemos[order.id] || { memo: order.memo || '', tags: order.tags || [] };
    const [memo, setMemo] = React.useState(saved.memo);
    const [tags, setTags] = React.useState(saved.tags);
    const toggle = (t) => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
    return (
        <div style={{ marginTop: 14, padding: '14px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>🏷️ Orders Note / Tag</div>
            <textarea style={{ width: '100%', minHeight: 60, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,140,255,0.2)', borderRadius: 8, color: '#e2e8f0', fontSize: 11, padding: 8, resize: 'vertical' }}
                value={memo} onChange={e => setMemo(e.target.value)} placeholder="Orders Related Note 입력..." />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {ORDER_TAGS.map(t => (
                    <button key={t} onClick={() => toggle(t)} className={tags.includes(t) ? 'btn-primary' : 'btn-ghost'}
                        style={{ fontSize: 10, padding: '3px 8px' }}>{t}</button>
                ))}
            </div>
            <button className="btn-primary" style={{ marginTop: 8, fontSize: 11, padding: '5px 14px' }}
                onClick={() => setOrderMemo(order.id, memo, tags)}>Save</button>
        </div>
    );
}

/* ─── Tab: Claim/Return ────────────────────────────────────────────────────── */
function ClaimTab() {
    const [selType, setSelType] = useState("all");
    const [selSt, setSelSt] = useState("all");
    const [selCh, setSelCh] = useState("all");
    const [search, setSearch] = useState("");
    const [detail, setDetail] = useState(null);
    const { registerClaimReturn } = useGlobalData();

    const filtered = useMemo(() => {
        let rows = CLAIMS;
        if (selCh !== "all") rows = rows.filter(r => r.channel === selCh);
        if (selType !== "all") rows = rows.filter(r => r.type === selType);
        if (selSt !== "all") rows = rows.filter(r => r.status === selSt);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            rows = rows.filter(r =>
                r.id.toLowerCase().includes(q) ||
                r.orderId.toLowerCase().includes(q) ||
                r.name.toLowerCase().includes(q) ||
                r.reason.toLowerCase().includes(q)
            );
        }
        return rows;
    }, [selCh, selType, selSt, search]);

    const handleDownload = () => {
        downloadCSV(`Claim_${new Date().toISOString().slice(0,10)}.csv`,
            ['ClaimID','Orders번호','Channel','Type','사유','Amount','Status','요청일','처리일'],
            filtered.map(c => [c.id, c.orderId, ch(c.channel).name, c.type, c.reason, c.amount, c.status, c.requestedAt.slice(0,10), c.resolvedAt||'미처리']));
    };

    const stats = useMemo(() => ({
        total: CLAIMS.length,
        cancel: CLAIMS.filter(c => c.type === "Cancel").length,
        return: CLAIMS.filter(c => c.type === "Return").length,
        exchange: CLAIMS.filter(c => c.type === "Exchange").length,
        refund: CLAIMS.filter(c => c.type === "환불").length,
        totalAmt: CLAIMS.reduce((s, c) => s + c.amount, 0),
    }), []);

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                {[
                    { l: "All Claim", v: stats.total, c: "#ef4444" },
                    { l: "Cancel", v: stats.cancel, c: "#f97316" },
                    { l: "Return", v: stats.return, c: "#eab308" },
                    { l: "Exchange", v: stats.exchange, c: "#a855f7" },
                    { l: "환불 Amount", v: fmtW(stats.totalAmt), c: "#ec4899" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ "--accent": c, padding: "12px 14px" }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* 🔍 빠른 Search */}
            <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#eab308" }}>🔍</span>
                <input
                    className="input"
                    style={{ paddingLeft: 34, width: "100%", boxSizing: "border-box" }}
                    placeholder="ClaimID·Orders번호·Product Name·사유로 빠른 Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>✕</button>}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select className="input" style={{ width: 120 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input" style={{ width: 120 }} value={selType} onChange={e => setSelType(e.target.value)}>
                    <option value="all">All Types</option>
                    {CLAIM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select className="input" style={{ width: 120 }} value={selSt} onChange={e => setSelSt(e.target.value)}>
                    <option value="all">All Status</option>
                    {CLAIM_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
                <span style={{ alignSelf: "center", fontSize: 11, color: "var(--text-3)" }}>{filtered.length} items</span>
                <button className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "5px 12px" }} onClick={handleDownload}>📥 엑셀 Download</button>
            </div>


            <table className="table">
                <thead>
                    <tr><th>ClaimID</th><th>Orders번호</th><th>Channel</th><th>Type</th><th>사유</th><th>Amount</th><th>Status</th><th>요청일</th><th>처리일</th><th></th></tr>
                </thead>
                <tbody>
                    {filtered.map(c => (
                        <tr key={c.id}>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "#ef4444" }}>{c.id}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "#4f8ef7" }}>{c.orderId}</td>
                            <td><span style={{ fontSize: 14 }}>{ch(c.channel).icon}</span></td>
                            <td><span className="badge badge-yellow" style={{ fontSize: 9 }}>{c.type}</span></td>
                            <td style={{ fontSize: 11 }}>{c.reason}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmtW(c.amount)}</td>
                            <td><StatusBadge s={c.status} map={CLAIM_STATUS_MAP} /></td>
                            <td style={{ fontSize: 10, color: "var(--text-3)" }}>{c.requestedAt.slice(0, 10)}</td>
                            <td style={{ fontSize: 10, color: c.resolvedAt ? "#22c55e" : "var(--text-3)" }}>{c.resolvedAt || "—"}</td>
                            <td><button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setDetail(c)}>상세</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: "#ef4444", fontFamily: "monospace" }}>{detail.id}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Connect Orders: {detail.orderId}</div>
                        </div>
                        <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[
                        ["Type", detail.type], ["사유", detail.reason], ["Product", detail.name], ["Amount", fmtW(detail.amount)],
                        ["Status", detail.status], ["요청일", detail.requestedAt.slice(0, 10)], ["처리일", detail.resolvedAt || "미처리"],
                    ].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                            <span style={{ color: "var(--text-3)" }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: 16, display: "flex", gap: 8, flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" style={{ flex: 1, background: "linear-gradient(135deg,#22c55e,#14d9b0)" }}
                                onClick={() => {
                                    registerClaimReturn({ id: detail.id, orderId: detail.orderId, sku: detail.sku, name: detail.name, qty: 1, channel: detail.channel, reason: detail.reason, wh: 'W001', returnFee: 3000 });
                                    setDetail(null);
                                }}>✓ 처리Done + WMS Return입고
                            </button>
                            <button className="btn-ghost" style={{ flex: 1, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>✗ 반려</button>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', padding: '4px 8px', background: 'rgba(34,197,94,0.05)', borderRadius: 6 }}>
                            🔗 처리Done 시 WMS 본류돌이 Return입고 Auto Register + 정산에서 Return비 Auto 차감
                        </div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}

/* ─── Tab: Shipping 추적 ─────────────────────────────────────────────────────── */
function DeliveryTab() {
    const [selStatus, setSelStatus] = useState("all");
    const [selCh, setSelCh] = useState("all");
    const [detail, setDetail] = useState(null);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        let rows = DELIVERIES;
        if (selCh !== "all") rows = rows.filter(r => r.channel === selCh);
        if (search) rows = rows.filter(r => r.trackingNo?.includes(search) || r.orderId.includes(search));
        if (selStatus !== "all") rows = rows.filter(r => r.status === selStatus);
        return rows;
    }, [selCh, search, selStatus]);

    const handleDownload = () => {
        downloadCSV(`Shipping추적_${new Date().toISOString().slice(0,10)}.csv`,
            ['ShippingID','Orders번호','Channel','택배사','운송장번호','Status','배달예정일'],
            filtered.map(d => [d.id, d.orderId, ch(d.channel).name, d.carrier, d.trackingNo, d.status, d.eta]));
    };

    const stats = useMemo(() => {
        const byStatus = {};
        DELIVERIES.forEach(d => { byStatus[d.status] = (byStatus[d.status] || 0) + 1; });
        return byStatus;
    }, []);

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* Status KPIs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["배달Done", "배달in progress", "지점도착", "간선Movein progress", "CollectionDone", "CollectionPending"].map(s => (
                    <div key={s} className="kpi-card" style={{ flex: "1 1 100px", padding: "10px 12px", "--accent": "#4f8ef7" }}>
                        <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700 }}>{s}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: s === "배달Done" ? "#22c55e" : s === "배달in progress" ? "#4f8ef7" : "var(--text-2)" }}>{stats[s] || 0}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select className="input" style={{ width: 120 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input className="input" style={{ flex: 1 }} placeholder="운송장번호·Orders번호 Search…" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width: 130 }} value={selStatus} onChange={e => setSelStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    {["CollectionPending", "CollectionDone", "간선Movein progress", "지점도착", "배달in progress", "배달Done"].map(s => <option key={s}>{s}</option>)}
                </select>
                <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={handleDownload}>📥 엑셀 Download</button>
            </div>

            <table className="table">
                <thead>
                    <tr><th>ShippingID</th><th>Orders번호</th><th>Channel</th><th>택배사</th><th>운송장번호</th><th>Shipping Status</th><th>배달 예정일</th><th></th></tr>
                </thead>
                <tbody>
                    {filtered.slice(0, 20).map(d => (
                        <tr key={d.id}>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "#22c55e" }}>{d.id}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "#4f8ef7" }}>{d.orderId}</td>
                            <td><span style={{ fontSize: 14 }}>{ch(d.channel).icon}</span></td>
                            <td style={{ fontSize: 11 }}>{d.carrier}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-2)" }}>{d.trackingNo}</td>
                            <td><StatusBadge s={d.status} map={DELIVERY_STATUS_MAP} /></td>
                            <td style={{ fontSize: 11, color: d.status === "배달Done" ? "#22c55e" : "var(--text-2)" }}>{d.eta}</td>
                            <td><button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setDetail(d)}>추적</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: "#22c55e", fontFamily: "monospace" }}>{detail.id}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{detail.carrier} · {detail.trackingNo}</div>
                        </div>
                        <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <StatusBadge s={detail.status} map={DELIVERY_STATUS_MAP} />
                        <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-2)" }}>배달 예정: {detail.eta}</span>
                    </div>
                    {/* Timeline */}
                    <div style={{ position: "relative", paddingLeft: 24, marginBottom: 16 }}>
                        <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "rgba(99,140,255,0.15)", borderRadius: 1 }} />
                        {detail.events.map((ev, i) => (
                            <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                                <div style={{ position: "absolute", left: -20, top: 4, width: 10, height: 10, borderRadius: "50%", background: i === detail.events.length - 1 ? "#4f8ef7" : "#22c55e", boxShadow: i === detail.events.length - 1 ? "0 0 8px #4f8ef788" : "none" }} />
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>{ev.desc}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{ev.loc} · {ev.ts}</div>
                            </div>
                        ))}
                    </div>
                </Drawer>
            )}
        </div>
    );
}

/* ─── Tab: 정산 데이터 ────────────────────────────────────────────────────── */
function SettlementTab() {
    const [detail, setDetail] = useState(null);
    const [selCh, setSelCh] = useState("all");

    const filtered = useMemo(() => selCh === "all" ? SETTLEMENTS : SETTLEMENTS.filter(s => s.channel === selCh), [selCh]);
    const totalNet = filtered.reduce((s, r) => s + r.netPayout, 0);
    const totalFee = filtered.reduce((s, r) => s + r.platformFee, 0);
    const totalRef = filtered.reduce((s, r) => s + r.refundDeduct, 0);

    const handleDownload = () => {
        downloadCSV(`정산_${new Date().toISOString().slice(0,10)}.csv`,
            ['정산ID','Channel','정산Period','TotalRevenue','PlatformCommission','환불차감','순지급','OrdersCount','Status','지급일'],
            filtered.map(s => [s.id, ch(s.channel).name, s.period, s.grossSales, s.platformFee, s.refundDeduct, s.netPayout, s.orders, s.status, s.paidAt||'처리in progress']));
    };

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* Channel Filter + Download */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select className="input" style={{ width: 140 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{filtered.length}개 Channel</span>
                <button className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "5px 12px" }} onClick={handleDownload}>📥 엑셀 Download</button>
            </div>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                    { l: "순 정산금", v: fmtW(totalNet), c: "#22c55e" },
                    { l: "Platform Commission", v: fmtW(totalFee), c: "#ef4444" },
                    { l: "환불 차감", v: fmtW(totalRef), c: "#f97316" },
                    { l: "정산 Channel", v: filtered.length + "개", c: "#4f8ef7" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ "--accent": c }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Channel breakdown */}
            <div className="card">
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>Channelper 정산 현황</div>
                {filtered.map(s => {
                    const c = ch(s.channel);
                    const pct = Math.round((s.netPayout / totalNet) * 100);
                    return (
                        <div key={s.id} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
                                    <StatusBadge s={s.status} map={SETTLE_STATUS_MAP} />
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{fmtW(s.netPayout)}</div>
                                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>Commission {s.feeRate}%</div>
                                </div>
                            </div>
                            <ProgressBar pct={pct} color={c.color} />
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
                                <span>TotalRevenue {fmtW(s.grossSales)}</span>
                                <span>환불차감 {fmtW(s.refundDeduct)}</span>
                                <button className="btn-ghost" style={{ fontSize: 9, padding: "2px 6px" }} onClick={() => setDetail(s)}>상세</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <table className="table">
                <thead>
                    <tr><th>정산ID</th><th>Channel</th><th>정산 Period</th><th>TotalRevenue</th><th>Commission</th><th>환불차감</th><th>순지급</th><th>OrdersCount</th><th>Status</th><th>지급일</th></tr>
                </thead>
                <tbody>
                    {filtered.map(s => (
                        <tr key={s.id} onClick={() => setDetail(s)} style={{ cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"}
                            onMouseLeave={e => e.currentTarget.style.background = ""}>
                            <td style={{ fontFamily: "monospace", fontSize: 10, color: "#a855f7" }}>{s.id}</td>
                            <td><span style={{ fontSize: 14 }}>{ch(s.channel).icon}</span> <span style={{ fontSize: 11 }}>{ch(s.channel).name}</span></td>
                            <td style={{ fontSize: 10, color: "var(--text-3)" }}>{s.period}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtW(s.grossSales)}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 11, color: "#ef4444" }}>-{fmtW(s.platformFee)}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 11, color: "#f97316" }}>-{fmtW(s.refundDeduct)}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 800, color: "#22c55e" }}>{fmtW(s.netPayout)}</td>
                            <td style={{ textAlign: "center" }}>{s.orders}</td>
                            <td><StatusBadge s={s.status} map={SETTLE_STATUS_MAP} /></td>
                            <td style={{ fontSize: 11, color: s.paidAt ? "#22c55e" : "#eab308" }}>{s.paidAt || "정산 In Progressin progress"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: "#a855f7", fontFamily: "monospace" }}>{detail.id}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{ch(detail.channel).icon} {ch(detail.channel).name} · {detail.period}</div>
                        </div>
                        <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[
                        ["Total Revenue", fmtW(detail.grossSales)], ["Platform Commission", `-${fmtW(detail.platformFee)} (${detail.feeRate}%)`],
                        ["환불 차감", `-${fmtW(detail.refundDeduct)}`], ["순 지급액", fmtW(detail.netPayout)],
                        ["Orders Count", detail.orders + "건"], ["Status", detail.status], ["지급일", detail.paidAt || "처리in progress"],
                    ].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                            <span style={{ color: "var(--text-3)" }}>{l}</span>
                            <span style={{ fontWeight: 700, color: l === "순 지급액" ? "#22c55e" : l.includes("Commission") || l.includes("환불") ? "#ef4444" : "var(--text-1)" }}>{v}</span>
                        </div>
                    ))}
                </Drawer>
            )}
        </div>
    );
}

/* ─── Tab: Product 일괄 Upload ─────────────────────────────────────────────── */
const UPLOAD_COLS = ['Product Name', 'SKU', 'Price', 'Stock', 'Category', 'Description'];
const SAMPLE_ROWS = [
    ['무선 노이즈캔슬링 헤드폰', 'WH-1000XM5-01', '89000', '150', '전자제품 > 음향기기', '소니 WH-1000XM5 블랙'],
    ['RGB 기계식 키보드', 'KB-MXM-RGB-01', '149000', '80', '전자제품 > 주변기기', 'Cherry MX 스위치'],
    ['4K 웹캠 Pro', 'CAM-4K-PRO-01', '129000', '45', '전자제품 > 카메라', '4K 화질 웹캠'],
];

function ProductUploadTab() {
    const [selChannels, setSelChannels] = useState(['shopify']);
    const [rows, setRows] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    const toggleChannel = (id) => setSelChannels(prev =>
        prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );

    const parseCSV = (text) => {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return;
        const hdrs = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        const data = lines.slice(1).map(line => {
            const cells = [];
            let cur = '', inQ = false;
            for (const ch of line) {
                if (ch === '"') { inQ = !inQ; }
                else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
            cells.push(cur.trim());
            return cells;
        }).filter(r => r.some(c => c));
        setHeaders(hdrs);
        setRows(data);
        setUploadMsg('');
    };

    const handleFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(csv|txt)$/i)) {
            setUploadMsg('❌ CSV 또는 TXT File만 지원됩니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => parseCSV(e.target.result);
        reader.readAsText(file, 'UTF-8');
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!rows.length) { setUploadMsg('❌ Upload할 Product 데이터가 없습니다.'); return; }
        if (!selChannels.length) { setUploadMsg('❌ Min 1개 Channel을 Select하세요.'); return; }
        setUploading(true);
        setUploadMsg('');
        // 시뮬레이션 (실제 API Integration 시 fetch 호출)
        await new Promise(r => setTimeout(r, 1500));
        setUploading(false);
        setUploadMsg(`✅ ${rows.length}개 Product을 ${selChannels.map(id => CHANNELS.find(c=>c.id===id)?.name||id).join(', ')}에 Upload Done!`);
    };

    const downloadSample = () => {
        downloadCSV('ProductUpload_샘플.csv', UPLOAD_COLS, SAMPLE_ROWS);
    };

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* 안내 */}
            <div style={{ padding: '10px 14px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 10, fontSize: 12, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📋 CSV File로 Product을 일괄 Upload합니다. 컬럼: {UPLOAD_COLS.join(', ')}</span>
                <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px', flexShrink: 0 }} onClick={downloadSample}>📄 샘플 Download</button>
            </div>

            {/* Channel Select */}
            <div className="card card-glass">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📡 Upload 대상 Channel Select</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {CHANNELS.map(c => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', borderRadius: 10, border: `1px solid ${selChannels.includes(c.id) ? c.color : 'rgba(255,255,255,0.08)'}`, background: selChannels.includes(c.id) ? `${c.color}18` : 'transparent', transition: 'all 150ms' }}>
                            <input type="checkbox" checked={selChannels.includes(c.id)} onChange={() => toggleChannel(c.id)} style={{ accentColor: c.color }} />
                            <span style={{ fontSize: 16 }}>{c.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: selChannels.includes(c.id) ? c.color : 'var(--text-2)' }}>{c.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* File 드롭존 */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                    border: `2px dashed ${dragOver ? '#4f8ef7' : 'rgba(99,140,255,0.25)'}`,
                    borderRadius: 14, padding: '32px', textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'rgba(79,142,247,0.06)' : 'transparent',
                    transition: 'all 200ms',
                }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>CSV File을 드래그하거나 Clicks하여 Upload</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>지원 형식: .csv, .txt (UTF-8)</div>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* 미리보기 */}
            {rows.length > 0 && (
                <div className="card card-glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>📋 미리보기 ({rows.length}개 Product)</div>
                        <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#ef4444' }} onClick={() => { setRows([]); setHeaders([]); setUploadMsg(''); }}>✕ Reset</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ fontSize: 11 }}>
                            <thead>
                                <tr>{(headers.length ? headers : UPLOAD_COLS).map(h => <th key={h}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {rows.slice(0, 10).map((row, i) => (
                                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                                ))}
                                {rows.length > 10 && <tr><td colSpan={headers.length || UPLOAD_COLS.length} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '8px' }}>... +{rows.length - 10}개 더</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {uploadMsg && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: uploadMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{uploadMsg}</div>}
                    <button onClick={handleUpload} disabled={uploading} className="btn-primary" style={{ marginTop: 14, alignSelf: 'flex-start', background: uploading ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#a855f7)', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                        {uploading ? '⏳ Upload in progress...' : `📤 ${selChannels.length}개 Channel에 일괄 Upload`}
                    </button>
                </div>
            )}

            {!rows.length && !uploadMsg && (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px 0', fontSize: 12 }}>File을 Upload하면 미리보기가 표시됩니다.</div>
            )}
        </div>
    );
}

/* ─── Tab: Count집 Settings ──────────────────────────────────────────────────────── */
function CollectSettingTab() {
    const [cfg, setCfg] = useState(
        Object.fromEntries(CHANNELS.map(c => [c.id, { orders: true, claims: true, delivery: true, settlement: true, interval: "5", retries: 3, webhook: true }]))
    );
    const upd = (cid, k, v) => setCfg(prev => ({ ...prev, [cid]: { ...prev[cid], [k]: v } }));

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: "10px 14px", background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)", borderRadius: 10, fontSize: 12, color: "var(--text-2)" }}>
                💡 Count집 주기는 Channel API Rate limit을 고려하여 Settings하세요. Webhook Activate 시 실Time 푸시 Count신이 가능합니다.
            </div>
            {CHANNELS.map(c => {
                const r = cfg[c.id];
                return (
                    <div key={c.id} className="card card-glass">
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: 20 }}>{c.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                            <span className="badge badge-green" style={{ fontSize: 9, marginLeft: "auto" }}>Connected</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr) auto auto", gap: 10, alignItems: "center" }}>
                            {[["orders", "Orders"], ["claims", "Claim"], ["delivery", "Shipping"], ["settlement", "정산"]].map(([k, l]) => (
                                <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                                    <input type="checkbox" checked={r[k]} onChange={e => upd(c.id, k, e.target.checked)} />
                                    {l}
                                </label>
                            ))}
                            <div>
                                <label className="input-label" style={{ fontSize: 9 }}>주기(분)</label>
                                <input className="input" type="number" value={r.interval} style={{ width: 70, padding: "4px 8px", fontSize: 11 }} onChange={e => upd(c.id, "interval", e.target.value)} />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11 }}>
                                <input type="checkbox" checked={r.webhook} onChange={e => upd(c.id, "webhook", e.target.checked)} />
                                Webhook
                            </label>
                        </div>
                    </div>
                );
            })}
            <button className="btn-primary" style={{ alignSelf: "flex-start", background: "linear-gradient(135deg,#4f8ef7,#a855f7)" }}>💾 Settings Save</button>
        </div>
    );
}

/* ─── Tab: InternationalOrders ──────────────────────────────────────────────────────── */
function IntlOrderTab() {
    const [selCh, setSelCh] = useState('all');
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);
    const COUNTRY_FLAG = { US:'🇺🇸', JP:'🇯🇵', SG:'🇸🇬', TH:'🇹🇭', DE:'🇩🇪' };
    const filtered = useMemo(() => {
        let rows = INTL_ORDERS;
        if (selCh !== 'all') rows = rows.filter(r => r.channel === selCh);
        if (search) rows = rows.filter(r => r.id.includes(search) || r.buyer.includes(search) || r.name.includes(search));
        return rows;
    }, [selCh, search]);
    const stats = useMemo(() => ({
        total: INTL_ORDERS.length,
        totalRevenue: INTL_ORDERS.reduce((s, o) => s + o.total, 0),
        totalDuty: INTL_ORDERS.reduce((s, o) => s + (o.customsDuty || 0), 0),
        ddp: INTL_ORDERS.filter(o => o.incoterm === 'DDP').length,
    }), []);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                    { l: 'International Orders', v: stats.total, c: '#4f8ef7' },
                    { l: 'Total Revenue', v: fmtW(stats.totalRevenue), c: '#22c55e' },
                    { l: '관세 예상', v: fmtW(stats.totalDuty), c: '#f97316' },
                    { l: 'DDP Orders', v: stats.ddp, c: '#a855f7' }
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c, padding: '12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Orders번호·구매자·Product…" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width: 140 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {INTL_CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <table className="table">
                <thead><tr><th>Orders번호</th><th>Channel</th><th>Country</th><th>Product</th><th>Quantity</th><th>Amount</th><th>Incoterm</th><th>HS코드</th><th>관세</th><th>택배사</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {filtered.map(o => (
                        <tr key={o.id}>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7' }}>{o.id}</td>
                            <td>{INTL_CHANNELS.find(c=>c.id===o.channel)?.icon||'🌐'} {o.channelName}</td>
                            <td>{COUNTRY_FLAG[o.country]||'🌍'} {o.country}</td>
                            <td style={{ fontSize:11 }}>{o.name}</td>
                            <td style={{ textAlign:'center' }}>{o.qty}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:11 }}>{fmtW(o.total)}</td>
                            <td><span className={`badge ${o.incoterm==='DDP'?'badge-green':'badge-blue'}`} style={{ fontSize:9 }}>{o.incoterm}</span></td>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'var(--text-3)' }}>{o.hsCode}</td>
                            <td style={{ fontSize:11, color:'#f97316' }}>{fmtW(o.customsDuty)}</td>
                            <td style={{ fontSize:11 }}>{o.carrier}</td>
                            <td><StatusBadge s={o.status} map={ORDER_STATUS_MAP} /></td>
                            <td><button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={() => setDetail(o)}>상세</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                        <div style={{ fontWeight:900, fontSize:15, color:'#4f8ef7', fontFamily:'monospace' }}>{detail.id}</div>
                        <button className="btn-ghost" style={{ padding:'5px 10px' }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[['Channel',detail.channelName],['Country',`${COUNTRY_FLAG[detail.country]||''} ${detail.country}`],['구매자',detail.buyer],['Product',detail.name],['Quantity',detail.qty],['Total',fmtW(detail.total)],['Incoterm',detail.incoterm],['HS코드',detail.hsCode],['예상 관세',fmtW(detail.customsDuty)],['택배사',detail.carrier],['운송장',detail.trackingNo],['Orders일시',detail.orderedAt]].map(([l,v]) => (
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(99,140,255,0.07)', fontSize:12 }}>
                            <span style={{ color:'var(--text-3)' }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                        </div>
                    ))}
                    <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(79,142,247,0.06)', borderRadius:10 }}>
                        <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>🌐 국제 Shipping 안내</div>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>{detail.incoterm==='DDP'?'✅ DDP — 관세 포함 (구매자 부담 None)':'⚠️ DDU — 관세 per도 (현지 Customs 필요)'}</div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}

/* ─── B2B 도매 Orders Tab ───────────────────────────────────────── */
function B2BOrderTab() {
    const [autoSplit, setAutoSplit] = useState(false);
    const [splitResult, setSplitResult] = useState(null);

    const B2B_BUYERS = [
        { id:"B001", name:"다나와 유통",   region:"서울", grade:"Gold",     monthlyVolume:3800000, orderCount:42 },
        { id:"B002", name:"제이스마켓",     region:"경기", grade:"Silver",   monthlyVolume:1200000, orderCount:18 },
        { id:"B003", name:"롯데온 도매",    region:"전국", grade:"Platinum", monthlyVolume:9500000, orderCount:88 },
        { id:"B004", name:"GlobalB2B",     region:"인천", grade:"Gold",     monthlyVolume:4400000, orderCount:31 },
        { id:"B005", name:"이커머스파트너", region:"부산", grade:"Silver",   monthlyVolume:870000,  orderCount:12 },
    ];
    const B2B_ORDERS = [
        { id:"B2B-001", buyer:"롯데온 도매", skus:12, qty:350, amount:8750000, status:"PaymentDone",   created:"2026-03-16 09:21", isBundled:true  },
        { id:"B2B-002", buyer:"다나와 유통", skus:5,  qty:120, amount:2400000, status:"Product준Weight", created:"2026-03-16 10:05", isBundled:false },
        { id:"B2B-003", buyer:"GlobalB2B",  skus:8,  qty:200, amount:4200000, status:"Shippingin progress",     created:"2026-03-15 14:33", isBundled:true  },
        { id:"B2B-004", buyer:"제이스마켓", skus:3,  qty:60,  amount:890000,  status:"PaymentDone",   created:"2026-03-15 16:48", isBundled:false },
    ];
    const PREDICTED = [
        { day:"Today",  count:14, amount:3200000, confidence:87 },
        { day:"내일",  count:18, amount:4100000, confidence:73 },
        { day:"3일후", count:22, amount:5800000, confidence:61 },
    ];
    const GRADE_CLR = { Platinum:"#e0e7ff", Gold:"#fbbf24", Silver:"#94a3b8" };

    function handleAutoSplit(orderId) {
        const o = B2B_ORDERS.find(x => x.id === orderId);
        if (!o) return;
        setSplitResult({
            original: orderId,
            splits: [
                { warehouse:"서울 물류센터", qty:Math.floor(o.qty*0.6), carrier:"CJ대한통운" },
                { warehouse:"경기 물류센터", qty:Math.ceil(o.qty*0.4),  carrier:"한진택배"   },
            ],
        });
        setAutoSplit(true);
    }

    return (
        <div style={{ display:"grid", gap:20 }}>
            <div>
                <div style={{ fontWeight:800, fontSize:14, color:"#e2e8f0", marginBottom:12 }}>🔮 AI Forecast OrdersCount (B2B)</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    {PREDICTED.map(p => (
                        <div key={p.day} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)" }}>
                            <div style={{ fontSize:11, color:"#a5b4fc", fontWeight:700, marginBottom:6 }}>{p.day}</div>
                            <div style={{ fontSize:22, fontWeight:900, color:"#e2e8f0" }}>{p.count}건</div>
                            <div style={{ fontSize:11, color:"#22c55e", marginTop:2 }}>₩{p.amount.toLocaleString()}</div>
                            <div style={{ marginTop:8, height:4, background:"#1e3a5f", borderRadius:2, overflow:"hidden" }}>
                                <div style={{ width:`${p.confidence}%`, height:"100%", background:"#6366f1", borderRadius:2 }} />
                            </div>
                            <div style={{ fontSize:9, color:"#7c8fa8", marginTop:3 }}>신뢰도 {p.confidence}%</div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div style={{ fontWeight:800, fontSize:14, color:"#e2e8f0", marginBottom:12 }}>🏢 거래처 현황</div>
                <div style={{ display:"grid", gap:6 }}>
                    {B2B_BUYERS.map(b => (
                        <div key={b.id} style={{ display:"grid", gridTemplateColumns:"60px 1fr 80px 80px 110px 70px", gap:8, padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", alignItems:"center" }}>
                            <span style={{ fontSize:10, color:"#7c8fa8", fontFamily:"monospace" }}>{b.id}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{b.name}</span>
                            <span style={{ fontSize:11, color:"#94a3b8" }}>{b.region}</span>
                            <span style={{ fontSize:10, fontWeight:800, color:GRADE_CLR[b.grade] }}>{b.grade}</span>
                            <span style={{ fontSize:11, fontWeight:700, color:"#22c55e" }}>₩{b.monthlyVolume.toLocaleString()}</span>
                            <span style={{ fontSize:11, color:"#4f8ef7" }}>{b.orderCount} items</span>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:"#e2e8f0", flex:1 }}>📦 B2B Orders List</div>
                    <div style={{ fontSize:10, color:"#7c8fa8" }}>BundleOrders → ⚡ Auto-Split으로 창고 Auto 분배</div>
                </div>
                <div style={{ display:"grid", gap:8 }}>
                    {B2B_ORDERS.map(o => (
                        <div key={o.id} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:16 }}>
                            <div style={{ flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                                    <span style={{ fontWeight:800, fontSize:12, color:"#e2e8f0" }}>{o.id}</span>
                                    <span style={{ fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700,
                                        background:o.status==="Shippingin progress"?"rgba(34,197,94,0.15)":"rgba(79,142,247,0.12)",
                                        color:o.status==="Shippingin progress"?"#22c55e":"#4f8ef7",
                                        border:`1px solid ${o.status==="Shippingin progress"?"rgba(34,197,94,0.3)":"rgba(79,142,247,0.25)"}`,
                                    }}>{o.status}</span>
                                    {o.isBundled && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:99, background:"rgba(168,85,247,0.15)", color:"#a855f7", border:"1px solid rgba(168,85,247,0.3)", fontWeight:700 }}>Bundle</span>}
                                </div>
                                <div style={{ fontSize:11, color:"#94a3b8" }}>{o.buyer} · SKU {o.skus}종 · {o.qty}개</div>
                                <div style={{ fontSize:10, color:"#7c8fa8", marginTop:2 }}>{o.created}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                                <div style={{ fontSize:14, fontWeight:800, color:"#22c55e" }}>₩{o.amount.toLocaleString()}</div>
                                {o.isBundled && (
                                    <button onClick={() => handleAutoSplit(o.id)} style={{ marginTop:6, padding:"4px 12px", borderRadius:7, border:"none", background:"linear-gradient(135deg,#6366f1,#a855f7)", color:"#fff", fontSize:10, fontWeight:800, cursor:"pointer" }}>
                                        ⚡ Auto-Split
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {autoSplit && splitResult && (
                <div style={{ padding:"16px 20px", borderRadius:14, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.3)" }}>
                    <div style={{ fontWeight:800, fontSize:13, color:"#a5b4fc", marginBottom:12 }}>⚡ Auto-Split 결과 — {splitResult.original}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        {splitResult.splits.map((s, i) => (
                            <div key={i} style={{ padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
                                <div style={{ fontWeight:700, fontSize:12, color:"#e2e8f0", marginBottom:4 }}>📦 분할 {i+1}</div>
                                <div style={{ fontSize:11, color:"#94a3b8" }}>창고: {s.warehouse}</div>
                                <div style={{ fontSize:11, color:"#22c55e", fontWeight:700 }}>Quantity: {s.qty}개</div>
                                <div style={{ fontSize:11, color:"#4f8ef7" }}>택배사: {s.carrier}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setAutoSplit(false)} style={{ marginTop:12, padding:"6px 16px", borderRadius:8, border:"1px solid rgba(99,102,241,0.3)", background:"transparent", color:"#a5b4fc", fontSize:11, cursor:"pointer" }}>Close</button>
                </div>
            )}
        </div>
    );
}

/* ═══ Orders Auto라우팅 단에지 (Auto Routing Engine) ═══ */
const ROUTING_RULES = [
    { id: 'R001', name: '서울/경기 빠른Shipping', condition: '구매자 Address: 서울·경기', targetWh: 'W001 (A창고 서울)', priority: 1, active: true, matched: 234 },
    { id: 'R002', name: '부산·경남 Shipping', condition: 'Address: 부산·경남 + 무게 < 5kg', targetWh: 'W003 (C창고 부산)', priority: 2, active: true, matched: 89 },
    { id: 'R003', name: 'Coupang Rocket Delivery', condition: 'Average종 Coupang Orders', targetWh: 'W002 (경기 광주 청상스트)', priority: 3, active: true, matched: 156 },
    { id: 'R004', name: '대Capacity B2B', condition: 'B2B Tag + Quantity > 10', targetWh: 'W002 (대량창고)', priority: 4, active: false, matched: 12 },
];

function AutoRoutingTab() {
    const { fmt } = useCurrency();
    // currency formatting via useCurrency fmt()
    const [rules, setRules] = React.useState(ROUTING_RULES);
    const [showForm, setShowForm] = React.useState(false);
    const [form, setForm] = React.useState({ name: '', condition: '', targetWh: '', priority: 5 });
    const [simResult, setSimResult] = React.useState(null);

    const toggleRule = (id) => setRules(p => p.map(r => r.id === id ? { ...r, active: !r.active } : r));

    const simulate = () => {
        const total = 476;
        const matched = rules.filter(r => r.active).reduce((s, r) => s + r.matched, 0);
        setSimResult({ total, matched, ratio: ((matched / total) * 100).toFixed(1), savings: fmt(matched * 800) });
    };

    const addRule = () => {
        if (!form.name) return;
        setRules(p => [{ ...form, id: `R${Date.now().toString(36).toUpperCase()}`, active: true, matched: 0, priority: Number(form.priority) }, ...p]);
        setForm({ name: '', condition: '', targetWh: '', priority: 5 });
        setShowForm(false);
    };

    const WHOUSES = ['W001 (A창고 서울)', 'W002 (경기 광주)', 'W003 (C창고 부산)'];
    const inp = (lbl, key, type='text') => (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>{lbl}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                style={{ padding:'7px 10px', borderRadius:8, background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:12 }} />
        </div>
    );

    return (
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                    <div style={{ fontWeight:800, fontSize:14 }}>🚦 Orders Auto 라우팅 엔진</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Orders 조건(Address·무게·Channel)에 따라 Actions창고 Auto 배정</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    <button onClick={simulate}
                        style={{ padding:'7px 14px', background:'rgba(34,197,94,0.15)', border:'1px solid #22c55e', borderRadius:8, color:'#22c55e', fontWeight:700, cursor:'pointer', fontSize:12 }}>
                        ⚡ 시뮬레이션
                    </button>
                    <button onClick={() => setShowForm(p=>!p)}
                        style={{ padding:'7px 16px', background:'linear-gradient(135deg,#4f8ef7,#6366f1)', border:'none', borderRadius:8, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:12 }}>
                        + 라우팅 Rule Add
                    </button>
                </div>
            </div>

            {simResult && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    {[
                        { l:'All Orders', v:simResult.total, c:'#4f8ef7' },
                        { l:'Auto라우팅 Apply', v:simResult.matched, c:'#22c55e' },
                        { l:'Apply률', v:simResult.ratio+'%', c:'#a855f7' },
                        { l:'절감예상(Shipping Fee)', v:simResult.savings, c:'#f59e0b' },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ padding:'12px 16px', borderRadius:12, background:`${c}08`, border:`1px solid ${c}22`, textAlign:'center' }}>
                            <div style={{ fontSize:20, fontWeight:900, color:c }}>{v}</div>
                            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{l}</div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div style={{ padding:16, background:'rgba(79,142,247,0.07)', borderRadius:12, border:'1px solid rgba(79,142,247,0.2)' }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>새 라우팅 Rule</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                        {inp('Rule Name', 'name')}
                        {inp('조건 Description', 'condition')}
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <label style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>Goal 창고</label>
                            <select value={form.targetWh} onChange={e => setForm(f=>({...f,targetWh:e.target.value}))}
                                style={{ padding:'7px 10px', borderRadius:8, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:12 }}>
                                <option value="">Select</option>
                                {WHOUSES.map(w => <option key={w}>{w}</option>)}
                            </select>
                        </div>
                        {inp('Priority', 'priority', 'number')}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:14 }}>
                        <button onClick={addRule} style={{ padding:'7px 18px', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:8, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:12 }}>Register</button>
                        <button onClick={() => setShowForm(false)} style={{ padding:'7px 14px', background:'rgba(255,255,255,0.07)', border:'none', borderRadius:8, color:'var(--text-2)', cursor:'pointer', fontSize:12 }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display:'grid', gap:10 }}>
                {[...rules].sort((a,b)=>a.priority-b.priority).map(r => (
                    <div key={r.id} style={{ padding:'14px 18px', borderRadius:12, background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, opacity: r.active ? 1 : 0.5 }}>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(79,142,247,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'#4f8ef7' }}>P{r.priority}</div>
                            <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>{r.name}</div>
                                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>조건: {r.condition}</div>
                                <div style={{ fontSize:11, color:'#22c55e', marginTop:1 }}>화살표 {r.targetWh}</div>
                            </div>
                        </div>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <div style={{ textAlign:'center' }}>
                                <div style={{ fontSize:18, fontWeight:900, color:'#4f8ef7' }}>{r.matched}</div>
                                <div style={{ fontSize:10, color:'var(--text-3)' }}>매칭</div>
                            </div>
                            <button onClick={() => toggleRule(r.id)}
                                style={{ padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700, fontSize:11,
                                    background: r.active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                                    color: r.active ? '#22c55e' : 'var(--text-3)' }}>
                                {r.active ? '● Active' : '○ Inactive'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
                💡 <strong>Auto 라우팅 엔진</strong>: Orders 유입 시 조건엔 맞는 1Rank Rule부터 연속 Apply → WMS 입력 Auto화.
                · 조건: Address지역 / Channel / 무게 / Price대 / VIP 세그먼트 등 복합 조건 지원·
                · 창고가 해당 Stock 부족 시 Auto 차Rank 창고로 라우팅
            </div>
        </div>
    );
}

export default function OrderHub() {
    const { fmt } = useCurrency();
    const [tab, setTab] = useState("orders");
    const { t } = useI18n();
    const kpis = useMemo(() => ({
        orders: ORDERS.length, claims: CLAIMS.length,
        deliveries: DELIVERIES.length, channels: CHANNELS.length,
    }), []);
    const TABS_I18N = [

        { id: "orders",     label: t("orderHub.tabOrders")     || "📋 Orders" },
        { id: "claims",     label: t("orderHub.tabClaims")     || "⚠ Claim/Return" },
        { id: "delivery",   label: t("orderHub.tabDelivery")   || "🚚 Shipping 추적" },
        { id: "settlement", label: t("orderHub.tabSettlement") || "💰 정산" },
        { id: "intl",       label: "🌏 InternationalOrders" },
        { id: "b2b",        label: "🏢 B2B 도매" },
        { id: "upload",     label: "📤 Product Upload" },
        { id: "settings",   label: t("orderHub.tabSettings")   || "⚙ Count집 Settings" },
        { id: "routing",    label: "🚦 Auto라우팅" },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(34,197,94,0.15))" }}>📬</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Order Data Hub
                        </div>
                        <div className="hero-desc">
                            Orders · Claim · Return · Shipping · 정산 데이터를 6개 Channel에서 실Time Count집·Unified Management합니다.
                        </div>
                    </div>
                </div>
            </div>

            {/* Live feed */}
            <div className="fade-up fade-up-1">
                <LiveIngestBar tab={tab} />
            </div>

            {/* KPIs */}
            <div className="grid4 fade-up fade-up-2">
                {[
                    { l: "Count집 Orders", v: kpis.orders, c: "#4f8ef7" },
                    { l: "Claim/Return", v: kpis.claims, c: "#ef4444" },
                    { l: "Shipping 추적", v: kpis.deliveries, c: "#22c55e" },
                    { l: "Connect Channel", v: kpis.channels, c: "#a855f7" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card card-hover" style={{ "--accent": c }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="card card-glass fade-up fade-up-3">
                <div className="tabs" style={{ marginBottom: 20 }}>
                    {TABS_I18N.map(t => (
                        <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
                    ))}
                </div>
                {tab === "orders"     && <OrderTab />}
                {tab === "claims"     && <ClaimTab />}
                {tab === "delivery"   && <DeliveryTab />}
                {tab === "settlement" && <SettlementTab />}
                {tab === "intl"       && <IntlOrderTab />}
                {tab === "b2b"        && <B2BOrderTab />}
                {tab === "upload"     && <ProductUploadTab />}
                {tab === "settings"   && <CollectSettingTab />}
                {tab === "routing"    && <AutoRoutingTab />}
            </div>
        </div>
    );
}
