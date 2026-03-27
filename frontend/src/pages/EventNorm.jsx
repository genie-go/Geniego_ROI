import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';
/* ─── const ───────────────────────────────────────────────── */
const API = "/api";
const AUTH = "genie_live_demo_key_00000000";
const headers = { "Authorization": `Bearer ${AUTH}`, "Content-Type": "application/json" };

const VENDOR_COLORS = {
    meta: "#1877f2", tiktok: "#010101", google: "#4285f4",
    amazon: "#ff9900", naver: "#03c75a", coupang: "#c0392b",
    youtube: "#ff0000", instagram: "#c13584",
};
const DOMAIN_COLORS = { ad: "#4f8ef7", market: "#22c55e", influencer: "#a855f7" };
const STATUS_COLORS = { pending: "#eab308", normalized: "#22c55e", error: "#ef4444", skipped: "#64748b" };

const VendorBadge = ({ vendor }) => (
    <span style={{
        padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800,
        background: (VENDOR_COLORS[vendor] || "#64748b") + "20",
        color: VENDOR_COLORS[vendor] || "#64748b",
        border: `1px solid ${(VENDOR_COLORS[vendor] || "#64748b")}30`,
        textTransform: "uppercase",
    }}>{vendor}</span>
);

const Badge = ({ label, color }) => (
    <span style={{
        padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800,
        background: color + "20", color, border: `1px solid ${color}30`,
    }}>{label}</span>
);

const fmtM = v => Math.abs(+v) >= 1e6 ? (+v / 1e6).toFixed(1) + "M" : Math.abs(+v) >= 1e3 ? (+v / 1e3).toFixed(0) + "K" : String(Number(+v).toFixed(0));

/* ─── MOCK DATA (for pure-frontend demo if API unavailable) ── */
const MOCK_RAW = [
    { id: 1, vendor: "meta", source_system: "polling", event_type: "ad_report", dedup_key: "meta_camp_spring25_20260304", received_at: "2026-03-04T08:00:00Z", status: "normalized", normalized_event_id: 1, raw_preview: '{"data":{"id":"act_123456789","name":"Spring KR Campaign","insights":{"data":[{"campaign_name":"Spring KR Campaign","impressions":"84200"' },
    { id: 2, vendor: "tiktok", source_system: "polling", event_type: "ad_report", dedup_key: "tiktok_cpp_spring_20260304", received_at: "2026-03-04T08:01:00Z", status: "normalized", normalized_event_id: 2, raw_preview: '{"code":0,"data":{"list":[{"campaign_name":"TikTok CPP Spring","adgroup_name":"KR Female 18-35","metrics":{"impressions":521000' },
    { id: 3, vendor: "google", source_system: "polling", event_type: "ad_report", dedup_key: "google_brand_kw_20260304", received_at: "2026-03-04T08:02:00Z", status: "normalized", normalized_event_id: 3, raw_preview: '{"results":[{"campaign":{"name":"Google Brand KW"},"segments":{"keyword":"Brand Headphones","keywordMatchType":"EXACT"}' },
    { id: 4, vendor: "coupang", source_system: "polling", event_type: "settlement", dedup_key: "coupang_settle_2026_W10", received_at: "2026-03-04T08:05:00Z", status: "normalized", normalized_event_id: 4, raw_preview: '{"settlementSummary":{"period":"2026-03-01~2026-03-07","totalSales":15680000,"platformFee":2352000,"adFee":980000' },
    { id: 5, vendor: "tiktok", source_system: "webhook", event_type: "ugc_report", dedup_key: "ugc_webhook_tt_v012345", received_at: "2026-03-04T08:10:00Z", status: "normalized", normalized_event_id: 5, raw_preview: '{"event":"video.metric_update","video_id":"tt_vid_012345","creator_id":"creator_techvibe_9991","handle":"@techvibe_kr","metrics":{"views":1980000' },
    { id: 6, vendor: "amazon", source_system: "polling", event_type: "order", dedup_key: "amazon_order_112-3456789-0001234", received_at: "2026-03-04T08:12:00Z", status: "normalized", normalized_event_id: 6, raw_preview: '{"payload":{"Order":{"AmazonOrderId":"112-3456789-0001234","OrderStatus":"Shipped","MarketplaceId":"A1VC38T7YXB528"' },
];
const MOCK_NORM = [
    { id: 1, raw_event_id: 1, event_date: "2026-03-04", event_type: "ad_conversion", domain: "ad", vendor: "meta", account_id: "act_123456789", campaign_name: "Spring KR Campaign", adset_name: "Lookalike 2% KR Female", ad_id: "ad_88801", creative_type: "image", audience_segment: "lookalike_2pct", impressions: 84200, clicks: 3124, spend: 12400.5, conversions: 182, attributed_revenue: 51833, currency: "KRW", region: "KR", normalizer_version: "v423_rule_v1" },
    { id: 2, raw_event_id: 2, event_date: "2026-03-04", event_type: "ad_conversion", domain: "ad", vendor: "tiktok", campaign_name: "TikTok CPP Spring", adset_name: "KR Female 18-35", creative_type: "video", audience_segment: "interest_tech", impressions: 521000, clicks: 15200, spend: 14200, conversions: 890, attributed_revenue: 28400, currency: "KRW", region: "KR", normalizer_version: "v423_rule_v1" },
    { id: 3, raw_event_id: 3, event_date: "2026-03-04", event_type: "ad_conversion", domain: "ad", vendor: "google", campaign_name: "Google Brand KW", adset_name: "Exact Match Brand", keyword: "Brand Headphones", match_type: "exact", impressions: 12400, clicks: 3100, spend: 5600, conversions: 1120, attributed_revenue: 39200, currency: "KRW", region: "KR", normalizer_version: "v423_rule_v1" },
    { id: 4, raw_event_id: 4, event_date: "2026-03-04", event_type: "settlement_deduction", domain: "market", channel: "coupang", gross_sales: 15680000, platform_fee: 2352000, ad_fee: 980000, settlement_deduction_type: "platform_fee", settlement_deduction_amount: 3332000, net_payout: 12016000, currency: "KRW", region: "KR", normalizer_version: "v423_rule_v1" },
    { id: 5, raw_event_id: 5, event_date: "2026-03-04", event_type: "ugc_view", domain: "influencer", vendor: "tiktok", creator_handle: "@techvibe_kr", ugc_content_id: "tt_vid_012345", ugc_platform: "tiktok", ugc_rights_status: "granted", ugc_whitelist_status: "whitelisted", ugc_branded_content: 1, impressions: 1980000, currency: "KRW", region: "KR", normalizer_version: "v423_rule_v1" },
    { id: 6, raw_event_id: 6, event_date: "2026-03-04", event_type: "order_placed", domain: "market", channel: "amazon", order_id: "112-3456789-0001234", sku: "SKU-A1-US", product_title: "WH-1000XM5 Headphones", qty: 1, gross_sales: 142.99, is_return: 0, currency: "USD", region: "US", normalizer_version: "v423_rule_v1" },
];
const MOCK_SUMMARY = {
    raw: { by_status: { normalized: 6 }, by_vendor: { meta: 1, tiktok: 2, google: 1, coupang: 1, amazon: 1 }, total: 6 },
    normalized: {
        by_domain: { ad: 3, market: 2, influencer: 1 },
        by_event_type: { ad_conversion: 3, settlement_deduction: 1, ugc_view: 1, order_placed: 1 },
        total_ad_spend: 32200.5,
        ugc_breakdown: [{ ugc_rights_status: "granted", ugc_whitelist_status: "whitelisted", ugc_branded_content: 1, cnt: 1 }],
    },
};

/* ─── Schema Diagram ─────────────────────────────────────── */
const SCHEMA_SECTIONS = [
    {
        layer: "Layer 1 — RawVendorEvent",
        color: "#f97316",
        icon: "📥",
        desc: "Platform Original payload as-is 보관 + Count신 메타",
        fields: [
            { name: "id", type: "INTEGER PK", desc: "AutoIncrease Basic키" },
            { name: "tenant_id", type: "TEXT", desc: "멀티테넌트 식per자" },
            { name: "vendor", type: "TEXT", desc: "meta | tiktok | google | amazon | naver | coupang | ..." },
            { name: "source_system", type: "TEXT", desc: "webhook | polling | manual | sdk" },
            { name: "event_type", type: "TEXT", desc: "ad_report | order | settlement | ugc_report | ..." },
            { name: "dedup_key", type: "TEXT UNIQUE", desc: "in progress복 방지 idempotency 키" },
            { name: "raw_payload", type: "TEXT (JSON)", desc: "Original JSON blob — 원본 불변 보관" },
            { name: "received_at", type: "TEXT", desc: "UTC ISO-8601 Count신 시각" },
            { name: "status", type: "TEXT", desc: "pending → normalized | error | skipped" },
            { name: "error_msg", type: "TEXT?", desc: "정규화 Failed 시 Error Message" },
            { name: "normalized_event_id", type: "INTEGER?", desc: "→ normalized_activity_event.id FK" },
        ],
    },
    {
        layer: "Layer 2 — NormalizedActivityEvent",
        color: "#4f8ef7",
        icon: "⚡",
        desc: "Single 필드 체계로 정규화된 표준 Event",
        fields: [
            { name: "id / raw_event_id", type: "INTEGER", desc: "PK · Layer1 역참조 FK" },
            { name: "event_date / event_type / domain", type: "TEXT", desc: "YYYY-MM-DD · Event Type · ad|market|influencer" },
            { name: "━━ Ad 도메인 (Advertising) ━━", type: "", desc: "" },
            { name: "vendor / account_id", type: "TEXT", desc: "Ad Platform / Account ID" },
            { name: "campaign_id / campaign_name", type: "TEXT", desc: "Campaign 식per자 + Name" },
            { name: "adset_id / adset_name", type: "TEXT", desc: "Ad세트 식per자 + Name" },
            { name: "creative_id / creative_type", type: "TEXT", desc: "소재 ID · image|video|carousel|collection" },
            { name: "keyword / match_type", type: "TEXT", desc: "키워드 · exact|phrase|broad" },
            { name: "audience_segment", type: "TEXT", desc: "lookalike_2pct | retarget | interest_tech | ..." },
            { name: "impressions / clicks / spend", type: "INTEGER/REAL", desc: "Impressions·Clicks·지출" },
            { name: "conversions / attributed_revenue", type: "INTEGER/REAL", desc: "Conversion·귀속Revenue" },
            { name: "━━ 마켓 도메인 (Market) ━━", type: "", desc: "" },
            { name: "channel", type: "TEXT", desc: "coupang | naver | 11st | amazon | shopify | ..." },
            { name: "order_id / sku / product_title", type: "TEXT", desc: "Orders번호 · SKU · Product Name" },
            { name: "gross_sales / platform_fee / ad_fee", type: "REAL", desc: "TotalRevenue · PlatformCommission · Ad Spend공제" },
            { name: "settlement_deduction_type / amount", type: "TEXT/REAL", desc: "공제 Type 및 Amount" },
            { name: "net_payout / is_return", type: "REAL/INT", desc: "순정산Amount · 반품 여부" },
            { name: "━━ UGC / 인플루언서 도메인 ━━", type: "", desc: "" },
            { name: "creator_id / creator_handle", type: "TEXT", desc: "크리에이터 ID · @핸들" },
            { name: "ugc_content_id / ugc_platform", type: "TEXT", desc: "콘텐츠 ID · youtube|instagram|tiktok" },
            { name: "ugc_rights_status", type: "TEXT", desc: "pending | granted | expired | revoked" },
            { name: "ugc_whitelist_status", type: "TEXT", desc: "not_requested | whitelisted | rejected" },
            { name: "ugc_branded_content", type: "INTEGER", desc: "1 = Branded Content Tag 포함" },
            { name: "━━ 공통 ━━", type: "", desc: "" },
            { name: "currency / region", type: "TEXT", desc: "KRW | USD | JPY ... · 지역코드" },
            { name: "normalizer_version / extra_json", type: "TEXT", desc: "Rule 버전 · Add 파라미터 (확장)" },
        ],
    },
];

/* ─── Tab: Schema Diagram ────────────────────────────────── */
function SchemaTab() {
    return (
        <div style={{ display: "grid", gap: 20 }}>
            {/* Flow arrow */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", rowGap: 8 }}>
                {[
                    { icon: "🌐", label: "Meta Webhook", color: "#1877f2" },
                    { icon: "📱", label: "TikTok Polling", color: "#010101" },
                    { icon: "🔍", label: "Google API", color: "#4285f4" },
                    { icon: "🟠", label: "Coupang Settlement", color: "#c0392b" },
                    { icon: "🤝", label: "UGC Webhook", color: "#a855f7" },
                    { icon: "📦", label: "Amazon Order", color: "#ff9900" },
                ].map((s, i, arr) => (
                    <React.Fragment key={s.label}>
                        <div style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                            background: s.color + "15", color: s.color, border: `1px solid ${s.color}30`,
                            display: "flex", gap: 5, alignItems: "center",
                        }}><span>{s.icon}</span>{s.label}</div>
                        {i < arr.length - 1 && <span style={{ color: "var(--text-3)", fontSize: 14, margin: "0 2px" }}>·</span>}
                    </React.Fragment>
                ))}
                <span style={{ color: "var(--text-3)", margin: "0 12px", fontSize: 16 }}>→</span>
                <div style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" }}>
                    📥 RawVendorEvent
                </div>
                <span style={{ color: "var(--text-3)", margin: "0 12px", fontSize: 16 }}>→</span>
                <div style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.25)" }}>
                    ⚡ NormalizedActivityEvent
                </div>
            </div>

            {/* Tables */}
            {SCHEMA_SECTIONS.map(s => (
                <div key={s.layer} className="card card-glass" style={{ padding: 20, borderLeft: `3px solid ${s.color}` }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 13, color: s.color }}>{s.layer}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.desc}</div>
                        </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(99,140,255,0.1)" }}>
                                {["필드명", "타입", "Description"].map(h => (
                                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 800, color: "var(--text-3)", fontSize: 10 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {s.fields.map((f, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid rgba(99,140,255,0.04)", background: f.name.startsWith("━") ? "rgba(99,140,255,0.04)" : "transparent" }}>
                                    <td style={{ padding: "5px 10px", fontFamily: "monospace", color: f.name.startsWith("━") ? "var(--text-3)" : s.color, fontWeight: f.name.startsWith("━") ? 700 : 600, fontSize: f.name.startsWith("━") ? 9 : 11 }}>{f.name}</td>
                                    <td style={{ padding: "5px 10px", fontFamily: "monospace", color: "var(--text-3)", fontSize: 10 }}>{f.type}</td>
                                    <td style={{ padding: "5px 10px", color: "var(--text-2)", fontSize: 10 }}>{f.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}

/* ─── Tab: Raw Events ────────────────────────────────────── */
function RawTab({ rows, loading, onSeed, onNormalize }) {
    const [expanded, setExpanded] = useState(null);
    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={onSeed} className="btn-primary" style={{ fontSize: 11, padding: "6px 16px", background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
                    📥 Demo Raw Event 시드
                </button>
                <button onClick={onNormalize} className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }}>
                    ⚡ 정규화 Run
                </button>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>Total {rows.length} items</span>
            </div>

            {loading && <div style={{ textAlign: "center", color: "var(--text-3)", padding: 20 }}>Loading...</div>}

            {rows.map(row => (
                <div key={row.id} className="card card-glass" style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${STATUS_COLORS[row.status] || "#64748b"}` }}>
                    <div
                        style={{ padding: "10px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}
                        onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    >
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-3)", width: 28 }}>#{row.id}</span>
                        <VendorBadge vendor={row.vendor} />
                        <Badge label={row.source_system} color="#64748b" />
                        <Badge label={row.event_type} color="#4f8ef7" />
                        <div style={{ flex: 1, fontSize: 10, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.dedup_key}
                        </div>
                        <Badge label={row.status} color={STATUS_COLORS[row.status] || "#64748b"} />
                        <span style={{ fontSize: 9, color: "var(--text-3)" }}>{row.received_at?.slice(0, 16)}</span>
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{expanded === row.id ? "▲" : "▼"}</span>
                    </div>
                    {expanded === row.id && (
                        <div style={{
                            padding: "0 16px 14px", borderTop: "1px solid rgba(99,140,255,0.08)",
                        }}>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 6, paddingTop: 10 }}>Original Payload (미리보기 300자)</div>
                            <pre style={{
                                padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.15)",
                                fontSize: 10, color: "#a5f3fc", overflowX: "auto", margin: 0, maxHeight: 180, lineHeight: 1.5,
                                fontFamily: "monospace",
                            }}>{row.raw_preview || "(payload None)"}</pre>
                            {row.normalized_event_id && (
                                <div style={{ marginTop: 8, fontSize: 10, color: "#22c55e" }}>
                                    ✓ 정규화 Done → normalized_activity_event #{row.normalized_event_id}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
            {!loading && rows.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                    <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>📭</div>
                    <div style={{ fontSize: 12 }}>Count집된 Raw Event가 없습니다. "Demo Raw Event 시드" 를 Clicks하세요.</div>
                </div>
            )}
        </div>
    );
}

/* ─── Tab: Normalized Events ─────────────────────────────── */
const NORM_COLS = {
    ad: ["campaign_name", "adset_name", "keyword", "audience_segment", "impressions", "clicks", "spend", "conversions"],
    market: ["channel", "order_id", "sku", "product_title", "gross_sales", "platform_fee", "settlement_deduction_type", "net_payout"],
    influencer: ["creator_handle", "ugc_content_id", "ugc_platform", "ugc_rights_status", "ugc_whitelist_status", "ugc_branded_content", "impressions"],
};

function NormTab({ rows, loading }) {
    const [domain, setDomain] = useState("all");
    const filtered = domain === "all" ? rows : rows.filter(r => r.domain === domain);
    const cols = domain === "all"
        ? ["vendor", "event_type", "domain", "campaign_name", "channel", "creator_handle", "impressions", "spend", "gross_sales", "currency"]
        : NORM_COLS[domain] || [];

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
                {["all", "ad", "market", "influencer"].map(d => (
                    <button key={d} onClick={() => setDomain(d)} style={{
                        padding: "5px 14px", borderRadius: 8, border: "1px solid",
                        borderColor: domain === d ? (DOMAIN_COLORS[d] || "#4f8ef7") : "var(--border)",
                        background: domain === d ? (DOMAIN_COLORS[d] || "#4f8ef7") + "15" : "transparent",
                        color: domain === d ? (DOMAIN_COLORS[d] || "#4f8ef7") : "var(--text-3)",
                        fontSize: 11, cursor: "pointer", fontWeight: 700,
                    }}>{d === "all" ? "All" : d}</button>
                ))}
                <span style={{ fontSize: 10, color: "var(--text-3)", display: "flex", alignItems: "center", marginLeft: 4 }}>
                    {filtered.length}건
                </span>
            </div>
            {loading ? (
                <div style={{ textAlign: "center", color: "var(--text-3)", padding: 20 }}>Loading...</div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ fontSize: 10, minWidth: 700 }}>
                        <thead>
                            <tr>
                                <th>ID</th><th>Date</th><th>Event Type</th><th>도메인</th>
                                {cols.map(c => <th key={c}>{c.replace(/_/g, " ")}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontFamily: "monospace", fontSize: 9, color: "var(--text-3)" }}>#{r.id}</td>
                                    <td>{r.event_date}</td>
                                    <td><Badge label={r.event_type} color="#4f8ef7" /></td>
                                    <td><Badge label={r.domain} color={DOMAIN_COLORS[r.domain] || "#64748b"} /></td>
                                    {cols.map(c => {
                                        const v = r[c];
                                        if (c === "vendor") return <td key={c}>{v ? <VendorBadge vendor={v} /> : "—"}</td>;
                                        if (c === "ugc_branded_content") return <td key={c}>{v ? <span style={{ color: "#a855f7", fontWeight: 800 }}>● BC</span> : "—"}</td>;
                                        if (c === "ugc_rights_status") return <td key={c}><Badge label={v || "—"} color={v === "granted" ? "#22c55e" : v === "expired" ? "#ef4444" : "#64748b"} /></td>;
                                        if (c === "ugc_whitelist_status") return <td key={c}><Badge label={v || "—"} color={v === "whitelisted" ? "#22c55e" : "#f97316"} /></td>;
                                        if (typeof v === "number" && v > 1000) return <td key={c} style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(v)}</td>;
                                        return <td key={c} style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v ?? "—"}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div style={{ textAlign: "center", padding: 30, fontSize: 11, color: "var(--text-3)" }}>정규화된 Event가 없습니다.</div>}
                </div>
            )}
        </div>
    );
}

/* ─── Tab: Summary ───────────────────────────────────────── */
function SummaryTab({ summary }) {
    if (!summary) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Summary No data</div>;
    const { raw, normalized } = summary;
    const StatBox = ({ label, value, color }) => (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: color + "10", border: `1px solid ${color}25` }}>
            <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            <div style={{ fontWeight: 900, fontSize: 22, color, marginTop: 4 }}>{value}</div>
        </div>
    );
    return (
        <div style={{ display: "grid", gap: 20 }}>
            {/* KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <StatBox label="Total Raw Event" value={raw?.total ?? 0} color="#f97316" />
                <StatBox label="정규화 Done" value={raw?.by_status?.normalized ?? 0} color="#22c55e" />
                <StatBox label="표준 Event Total계" value={Object.values(normalized?.by_domain ?? {}).reduce((a, b) => a + +b, 0)} color="#4f8ef7" />
                <StatBox label="Total Ad Spend" value={"₩" + fmtM(normalized?.total_ad_spend ?? 0)} color="#a855f7" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {/* Raw by Vendor */}
                <div className="card card-glass" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 12 }}>📥 Raw — 벤더per</div>
                    {Object.entries(raw?.by_vendor ?? {}).map(([v, cnt]) => (
                        <div key={v} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <VendorBadge vendor={v} />
                            <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 12 }}>{cnt}</span>
                        </div>
                    ))}
                </div>
                {/* Normalized by Domain */}
                <div className="card card-glass" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 12 }}>⚡ 표준 — 도메인per</div>
                    {Object.entries(normalized?.by_domain ?? {}).map(([d, cnt]) => (
                        <div key={d} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                            <Badge label={d} color={DOMAIN_COLORS[d] || "#64748b"} />
                            <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 12 }}>{cnt}</span>
                        </div>
                    ))}
                </div>
                {/* UGC Breakdown */}
                <div className="card card-glass" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 12 }}>🎬 UGC 권리/화이트리스트</div>
                    {(normalized?.ugc_breakdown ?? []).map((u, i) => (
                        <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid rgba(99,140,255,0.06)", fontSize: 10 }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 3 }}>
                                <Badge label={"권리:" + (u.ugc_rights_status || "—")} color={u.ugc_rights_status === "granted" ? "#22c55e" : "#64748b"} />
                                <Badge label={"WL:" + (u.ugc_whitelist_status || "—")} color={u.ugc_whitelist_status === "whitelisted" ? "#4f8ef7" : "#f97316"} />
                                {u.ugc_branded_content ? <Badge label="Branded" color="#a855f7" /> : null}
                            </div>
                            <div style={{ color: "var(--text-3)" }}>{u.cnt}건</div>
                        </div>
                    ))}
                    {!(normalized?.ugc_breakdown?.length) && <div style={{ color: "var(--text-3)", fontSize: 10 }}>UGC Event None</div>}
                </div>
            </div>

            {/* Event types */}
            <div className="card card-glass" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 12 }}>📊 Event Typeper 분포</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(normalized?.by_event_type ?? {}).map(([et, cnt]) => (
                        <div key={et} style={{
                            padding: "6px 14px", borderRadius: 8, background: "rgba(79,142,247,0.08)",
                            border: "1px solid rgba(79,142,247,0.15)",
                            fontSize: 11,
                        }}>
                            <span style={{ color: "var(--text-3)", fontSize: 10 }}>{et.replace(/_/g, " ")}</span>
                            <span style={{ marginLeft: 8, fontWeight: 900, color: "#4f8ef7" }}>{cnt}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── MAIN ───────────────────────────────────────────────── */
const TABS = [
    { id: "schema", label: "🏗 스키마 정의", desc: "2단 Table 구조" },
    { id: "raw", label: "📥 Raw Event", desc: "Original Count집 뷰어" },
    { id: "normalized", label: "⚡ 표준 Event", desc: "정규화 결과 Table" },
    { id: "summary", label: "📊 Summary Statistics", desc: "도메인per Aggregate" },
];

export default function EventNorm() {
  const t = useT();
    const [tab, setTab] = useState("schema");
    const [rawRows, setRawRows] = useState(MOCK_RAW);
    const [normRows, setNormRows] = useState(MOCK_NORM);
    const [summary, setSummary] = useState(MOCK_SUMMARY);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, color = "#22c55e") => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 2800);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [r1, r2, r3] = await Promise.all([
                fetch(`${API}/v423/events/raw?limit=50`, { headers }),
                fetch(`${API}/v423/events/normalized?limit=50`, { headers }),
                fetch(`${API}/v423/events/summary`, { headers }),
            ]);
            if (r1.ok) { const d = await r1.json(); setRawRows(d.rows || []); }
            if (r2.ok) { const d = await r2.json(); setNormRows(d.rows || []); }
            if (r3.ok) { const d = await r3.json(); setSummary(d); }
        } catch {
            // API unavailable — keep mock data
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSeed = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/v423/events/ingest-raw`, { method: "POST", headers });
            if (r.ok) {
                const d = await r.json();
                showToast(`✓ ${d.seeded ?? 0}개 Demo Event 시드 Done`);
                await fetchAll();
            } else {
                // Offline mode — already using MOCK_RAW
                showToast("오프라인 모드 — 목 데이터 표시 in progress", "#eab308");
            }
        } catch {
            showToast("오프라인 모드 — 목 데이터 표시 in progress", "#eab308");
        }
        setLoading(false);
    };

    const handleNormalize = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/v423/events/normalize`, { method: "POST", headers });
            if (r.ok) {
                const d = await r.json();
                showToast(`✓ ${d.normalized ?? 0}건 정규화 Done`);
                await fetchAll();
            } else {
                showToast("정규화 Run — 목 데이터 표시", "#eab308");
            }
        } catch {
            showToast("오프라인 모드", "#eab308");
        }
        setLoading(false);
    };

    return (
        <div style={{ display: "grid", gap: 16, position: "relative" }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: 24, right: 24, zIndex: 9999,
                    padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                    background: toast.color + "20", color: toast.color,
                    border: `1px solid ${toast.color}40`, backdropFilter: "blur(8px)",
                }}>{toast.msg}</div>
            )}

            {/* Hero */}
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(249,115,22,0.05),rgba(79,142,247,0.05))",
                borderColor: "rgba(249,115,22,0.15)",
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.2),rgba(79,142,247,0.15))" }}>🔄</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#f97316,#4f8ef7)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>표준 Event 스키마</div>
                        <div className="hero-desc">
                            Platform Original(RawVendorEvent) → Single 표준(NormalizedActivityEvent) 2단 정규화 파이프라인
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {[
                        { label: "Layer 1: RawVendorEvent", color: "#f97316" },
                        { label: "Layer 2: NormalizedActivityEvent", color: "#4f8ef7" },
                        { label: "6개 벤더 지원", color: "#22c55e" },
                        { label: "Campaign·정산·UGC 표준화", color: "#a855f7" },
                    ].map(({ label, color }) => (
                        <span key={label} style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                            background: color + "18", color, border: `1px solid ${color}33`,
                        }}>{label}</span>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? "rgba(249,115,22,0.08)" : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? "#f97316" : "transparent"}`, transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "schema" && <SchemaTab />}
                {tab === "raw" && <RawTab rows={rawRows} loading={loading} onSeed={handleSeed} onNormalize={handleNormalize} />}
                {tab === "normalized" && <NormTab rows={normRows} loading={loading} />}
                {tab === "summary" && <SummaryTab summary={summary} />}
            </div>
        </div>
    );
}
