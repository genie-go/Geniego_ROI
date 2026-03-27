import React, { useState, useMemo } from "react";
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';
/* ── Color Token ──────────────────────────────────────────── */
const C = {
    ad: { bg: "rgba(79,142,247,0.08)", border: "rgba(79,142,247,0.25)", text: "#4f8ef7", label: "🔵 Ads" },
    market: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", text: "#22c55e", label: "🟢 Market" },
    ugc: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", text: "#a855f7", label: "🟣 UGC" },
    common: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "#94a3b8", label: "⚪ Common" },
};

/* ── 표준 Schema 정의 ──────────────────────────────────── */
const SCHEMA = [
    // ── Common ──
    { domain: "common", field: "id", type: "INT", nullable: false, desc: "Event PK (Auto Increase)" },
    { domain: "common", field: "raw_event_id", type: "INT", nullable: true, desc: "원본 raw_vendor_event PK 참조" },
    { domain: "common", field: "tenant_id", type: "VARCHAR(100)", nullable: false, desc: "테넌트 식per자 (멀티테넌트)" },
    { domain: "common", field: "event_date", type: "VARCHAR(10)", nullable: false, desc: "Event 발생일 (YYYY-MM-DD)", example: "2026-03-05" },
    { domain: "common", field: "event_type", type: "VARCHAR(100)", nullable: false, desc: "표준 Event Type", example: "ad_conversion / order_placed / ugc_view" },
    { domain: "common", field: "domain", type: "VARCHAR(30)", nullable: false, desc: "데이터 도메인", example: "ad / market / influencer" },
    { domain: "common", field: "currency", type: "VARCHAR(10)", nullable: false, desc: "Currency 코드 (ISO 4217)", example: "KRW / USD / JPY" },
    { domain: "common", field: "region", type: "VARCHAR(10)", nullable: true, desc: "지역 코드 (ISO 3166-1)", example: "KR / US / JP" },
    { domain: "common", field: "normalized_at", type: "VARCHAR(32)", nullable: false, desc: "정규화 처리 시각 (UTC ISO8601)" },
    { domain: "common", field: "normalizer_version", type: "VARCHAR(50)", nullable: true, desc: "정규화 엔진 버전", example: "v423_rule_v1" },
    { domain: "common", field: "extra_json", type: "MEDIUMTEXT", nullable: true, desc: "Platformper 확장 Field (비정형 보존)" },

    // ── Ads 도메인 ──
    { domain: "ad", field: "vendor", type: "VARCHAR(100)", nullable: true, desc: "Ads Platform", example: "meta / tiktok / google / kakao / naver / coupang_ads" },
    { domain: "ad", field: "account_id", type: "VARCHAR(255)", nullable: true, desc: "Ads Account ID (Platformper 고유)" },
    { domain: "ad", field: "campaign_id", type: "VARCHAR(255)", nullable: true, desc: "Campaign ID" },
    { domain: "ad", field: "campaign_name", type: "VARCHAR(500)", nullable: true, desc: "Campaign Name" },
    { domain: "ad", field: "adset_id", type: "VARCHAR(255)", nullable: true, desc: "Ads 세트(그룹) ID" },
    { domain: "ad", field: "adset_name", type: "VARCHAR(500)", nullable: true, desc: "Ads 세트 Name" },
    { domain: "ad", field: "ad_id", type: "VARCHAR(255)", nullable: true, desc: "Ads 소재 ID" },
    { domain: "ad", field: "creative_id", type: "VARCHAR(255)", nullable: true, desc: "크리에이티브 자산 ID" },
    { domain: "ad", field: "creative_type", type: "VARCHAR(50)", nullable: true, desc: "소재 Type", example: "image / video / carousel / collection / app_install" },
    { domain: "ad", field: "keyword", type: "VARCHAR(500)", nullable: true, desc: "Search 키워드 (SA 전용)" },
    { domain: "ad", field: "match_type", type: "VARCHAR(20)", nullable: true, desc: "키워드 매칭 Type", example: "broad / phrase / exact / neg_broad / neg_exact" },
    { domain: "ad", field: "audience_segment", type: "VARCHAR(255)", nullable: true, desc: "오디언스 세그먼트", example: "lookalike_2pct / retargeting_7d / interest_beauty" },
    { domain: "ad", field: "impressions", type: "INT", nullable: true, desc: "Impressions Count" },
    { domain: "ad", field: "clicks", type: "INT", nullable: true, desc: "Clicks Count" },
    { domain: "ad", field: "spend", type: "DOUBLE", nullable: true, desc: "Ad Spend 지출 (Currency Unit)" },
    { domain: "ad", field: "conversions", type: "INT", nullable: true, desc: "Conversion Count" },
    { domain: "ad", field: "attributed_revenue", type: "DOUBLE", nullable: true, desc: "Conversion 기여 Revenue" },

    // ── Market 도메인 ──
    { domain: "market", field: "channel", type: "VARCHAR(100)", nullable: true, desc: "판매 Channel", example: "coupang / naver_store / amazon / shopify / elevenst" },
    { domain: "market", field: "order_id", type: "VARCHAR(255)", nullable: true, desc: "Orders ID" },
    { domain: "market", field: "sku", type: "VARCHAR(255)", nullable: true, desc: "Stock Management 코드" },
    { domain: "market", field: "product_title", type: "VARCHAR(500)", nullable: true, desc: "Product Name" },
    { domain: "market", field: "qty", type: "INT", nullable: true, desc: "Quantity" },
    { domain: "market", field: "gross_sales", type: "DOUBLE", nullable: true, desc: "Total 판매Amount (Commission 공제 전)" },
    { domain: "market", field: "platform_fee", type: "DOUBLE", nullable: true, desc: "Platform 판매 Commission" },
    { domain: "market", field: "ad_fee", type: "DOUBLE", nullable: true, desc: "Platform 내 Ad Spend 공제" },
    { domain: "market", field: "shipping_fee", type: "DOUBLE", nullable: true, desc: "배송비 공제" },
    { domain: "market", field: "return_fee", type: "DOUBLE", nullable: true, desc: "반품 물류비 공제" },
    { domain: "market", field: "coupon_discount", type: "DOUBLE", nullable: true, desc: "Coupon 할인 지원액" },
    { domain: "market", field: "point_discount", type: "DOUBLE", nullable: true, desc: "포인트 할인 지원액" },
    { domain: "market", field: "settlement_deduction_type", type: "VARCHAR(100)", nullable: true, desc: "정산 공제 항목 Type", example: "platform_commission / ad_cost / return_logistics / cancellation_fee / price_error / inspection_fee / vat" },
    { domain: "market", field: "settlement_deduction_amount", type: "DOUBLE", nullable: true, desc: "해당 공제 Amount" },
    { domain: "market", field: "net_payout", type: "DOUBLE", nullable: true, desc: "최종 정산 지급액 (gross_sales - All 공제)" },
    { domain: "market", field: "is_return", type: "TINYINT(1)", nullable: true, desc: "반품 여부 (1=반품)", example: "0 / 1" },

    // ── UGC / 인플루언서 도메인 ──
    { domain: "ugc", field: "creator_id", type: "VARCHAR(255)", nullable: true, desc: "크리에이터 고유 ID (Platform 내부)" },
    { domain: "ugc", field: "creator_handle", type: "VARCHAR(255)", nullable: true, desc: "크리에이터 핸들(@ 아이디)", example: "@techvibe_kr" },
    { domain: "ugc", field: "ugc_content_id", type: "VARCHAR(255)", nullable: true, desc: "UGC 콘텐츠 ID (영상/게시물)" },
    { domain: "ugc", field: "ugc_platform", type: "VARCHAR(50)", nullable: true, desc: "UGC Platform", example: "tiktok / instagram / youtube / naver_blog / kakao" },
    { domain: "ugc", field: "ugc_rights_status", type: "VARCHAR(50)", nullable: true, desc: "UGC 사용 권리 Status", example: "pending / granted / expired / revoked / not_requested" },
    { domain: "ugc", field: "ugc_whitelist_status", type: "VARCHAR(50)", nullable: true, desc: "Ads Account 화이트리스트 Register Status", example: "whitelisted / not_whitelisted / pending / revoked" },
    { domain: "ugc", field: "ugc_branded_content", type: "TINYINT(1)", nullable: true, desc: "브랜디드 콘텐츠(Paid 파트너십) 표기 여부", example: "0=미표기 / 1=표기Done" },
    { domain: "ugc", field: "impressions", type: "INT", nullable: true, desc: "UGC Impressions/Search Count (views)" },
];

/* ── Platform 매핑 ───────────────────────────────────────── */
const PLATFORM_MAPPING = [
    {
        platform: "Meta (Facebook/Instagram)", region: "Global", type: "Ads", color: "#1877f2",
        fields: [
            { raw: "insights.campaign_id", std: "campaign_id" },
            { raw: "insights.adset_id", std: "adset_id" },
            { raw: "insights.ad_id", std: "ad_id" },
            { raw: "insights.impressions", std: "impressions" },
            { raw: "insights.clicks", std: "clicks" },
            { raw: "insights.spend", std: "spend" },
            { raw: "actions[purchase]", std: "conversions" },
            { raw: "action_values[purchase]", std: "attributed_revenue" },
            { raw: "targeting.custom_audiences", std: "audience_segment" },
        ]
    },
    {
        platform: "TikTok Business", region: "Global", type: "Ads/UGC", color: "#010101",
        fields: [
            { raw: "campaign_id", std: "campaign_id" },
            { raw: "adgroup_id", std: "adset_id" },
            { raw: "metrics.impressions", std: "impressions" },
            { raw: "metrics.clicks", std: "clicks" },
            { raw: "metrics.spend", std: "spend" },
            { raw: "metrics.purchase", std: "conversions" },
            { raw: "video_id (webhook)", std: "ugc_content_id" },
            { raw: "whitelist_status", std: "ugc_whitelist_status" },
            { raw: "is_branded", std: "ugc_branded_content" },
        ]
    },
    {
        platform: "Google Ads", region: "Global", type: "Ads", color: "#4285f4",
        fields: [
            { raw: "campaign.id", std: "campaign_id" },
            { raw: "adGroup.id", std: "adset_id" },
            { raw: "segments.keyword", std: "keyword" },
            { raw: "segments.keywordMatchType", std: "match_type" },
            { raw: "metrics.impressions", std: "impressions" },
            { raw: "metrics.clicks", std: "clicks" },
            { raw: "metrics.costMicros/1e6", std: "spend" },
            { raw: "metrics.conversions", std: "conversions" },
        ]
    },
    {
        platform: "Kakao Moment", region: "Domestic", type: "Ads", color: "#fee500",
        fields: [
            { raw: "campaignId", std: "campaign_id" },
            { raw: "adGroupId", std: "adset_id" },
            { raw: "imp", std: "impressions" },
            { raw: "click", std: "clicks" },
            { raw: "cost", std: "spend" },
            { raw: "conv1d", std: "conversions" },
        ]
    },
    {
        platform: "Naver SearchAds/GFA", region: "Domestic", type: "Ads", color: "#03c75a",
        fields: [
            { raw: "campaignId", std: "campaign_id" },
            { raw: "adGroupId", std: "adset_id" },
            { raw: "keyword", std: "keyword" },
            { raw: "matchType (BROAD/EXACT/PHRASE)", std: "match_type" },
            { raw: "impCount", std: "impressions" },
            { raw: "clkCount", std: "clicks" },
            { raw: "salesAmt", std: "spend" },
        ]
    },
    {
        platform: "Coupang Ads", region: "Domestic", type: "Ads", color: "#e8003d",
        fields: [
            { raw: "campaignId", std: "campaign_id" },
            { raw: "keyword", std: "keyword" },
            { raw: "impression", std: "impressions" },
            { raw: "click", std: "clicks" },
            { raw: "cost", std: "spend" },
            { raw: "orders", std: "conversions" },
        ]
    },
    {
        platform: "Coupang Partners (정산)", region: "Domestic", type: "Market", color: "#e8003d",
        fields: [
            { raw: "settlementSummary.totalSales", std: "gross_sales" },
            { raw: "settlementSummary.platformFee", std: "platform_fee" },
            { raw: "settlementSummary.adFee", std: "ad_fee" },
            { raw: "settlementSummary.vat", std: "settlement_deduction_type=vat" },
            { raw: "settlementSummary.netPayout", std: "net_payout" },
            { raw: "lineItems[].orderId", std: "order_id" },
            { raw: "lineItems[].sku", std: "sku" },
            { raw: "lineItems[].isReturn", std: "is_return" },
        ]
    },
    {
        platform: "Naver Smart Store (정산)", region: "Domestic", type: "Market", color: "#03c75a",
        fields: [
            { raw: "productOrderId", std: "order_id" },
            { raw: "productId", std: "sku" },
            { raw: "salesAmount", std: "gross_sales" },
            { raw: "commissionAmount", std: "platform_fee" },
            { raw: "discountAmount", std: "coupon_discount" },
            { raw: "paymentAmount", std: "net_payout" },
            { raw: "claimType=RETURN", std: "is_return=1" },
        ]
    },
    {
        platform: "Amazon SP-API", region: "Global", type: "Market", color: "#ff9900",
        fields: [
            { raw: "Order.AmazonOrderId", std: "order_id" },
            { raw: "OrderItems[].ASIN", std: "sku" },
            { raw: "OrderTotal.Amount", std: "gross_sales" },
            { raw: "OrderTotal.CurrencyCode", std: "currency" },
            { raw: "OrderStatus=Returned", std: "is_return=1" },
        ]
    },
    {
        platform: "TikTok Creator Marketplace (UGC)", region: "Global", type: "UGC", color: "#010101",
        fields: [
            { raw: "creator_id", std: "creator_id" },
            { raw: "handle", std: "creator_handle" },
            { raw: "video_id", std: "ugc_content_id" },
            { raw: "ugc_rights_expires", std: "ugc_rights_status" },
            { raw: "whitelist_status", std: "ugc_whitelist_status" },
            { raw: "is_branded", std: "ugc_branded_content" },
            { raw: "metrics.views", std: "impressions" },
        ]
    },
];

/* ── Metric 카탈로그 ─────────────────────────────────────── */
const METRICS = [
    { group: "Ads 효율", name: "CTR", formula: "clicks / impressions × 100", unit: "%", desc: "CTR", domain: "ad", threshold: "< 1% 주의 / < 0.5% Warning" },
    { group: "Ads 효율", name: "CPC", formula: "spend / clicks", unit: "원", desc: "Clicks당 Cost", domain: "ad", threshold: "Category 벤치마크 대비 +30% Warning" },
    { group: "Ads 효율", name: "CPM", formula: "spend / impressions × 1000", unit: "원", desc: "1,000 Impressions당 Cost", domain: "ad" },
    { group: "Ads 효율", name: "ROAS", formula: "attributed_revenue / spend", unit: "배", desc: "Ads Profit률 (Return on Ad Spend)", domain: "ad", threshold: "< 2.0 주의 / < 1.5 Warning" },
    { group: "Ads 효율", name: "CVR", formula: "conversions / clicks × 100", unit: "%", desc: "Conv. Rate (Clicks→구매)", domain: "ad" },
    { group: "Ads 효율", name: "CPA", formula: "spend / conversions", unit: "원", desc: "Conversion당 Cost", domain: "ad" },
    { group: "Market Profit", name: "Net Margin", formula: "net_payout / gross_sales × 100", unit: "%", desc: "최종 정산 마진", domain: "market", threshold: "< 15% Warning" },
    { group: "Market Profit", name: "Fee Rate", formula: "(platform_fee + ad_fee) / gross_sales × 100", unit: "%", desc: "Total Commission율", domain: "market" },
    { group: "Market Profit", name: "Return Rate", formula: "SUM(is_return=1) / COUNT(*) × 100", unit: "%", desc: "반품률", domain: "market", threshold: "> 10% 주의 / > 20% Warning" },
    { group: "Market Profit", name: "AOV", formula: "SUM(gross_sales) / COUNT(DISTINCT order_id)", unit: "원", desc: "Average Orders Amount", domain: "market" },
    { group: "Market Profit", name: "Settlement GAP", formula: "expected_payout - actual_net_payout", unit: "원", desc: "예상 vs 실제 정산 차이 (이상 탐지)", domain: "market", threshold: "절대Value > 100,000원 Warning" },
    { group: "UGC Performance", name: "Engagement Rate", formula: "(likes + comments + shares) / impressions × 100", unit: "%", desc: "UGC 참여율", domain: "ugc" },
    { group: "UGC Performance", name: "Rights Coverage", formula: "SUM(ugc_rights_status='granted') / COUNT(*) × 100", unit: "%", desc: "UGC 권리 확보율", domain: "ugc", threshold: "< 80% Warning" },
    { group: "UGC Performance", name: "Whitelist Rate", formula: "SUM(ugc_whitelist_status='whitelisted') / eligible × 100", unit: "%", desc: "화이트리스트 Register률", domain: "ugc" },
    { group: "UGC Performance", name: "Branded Disclosure Rate", formula: "SUM(ugc_branded_content=1) / paid_collab × 100", unit: "%", desc: "브랜디드 콘텐츠 표기 준Count율", domain: "ugc", threshold: "< 100% 위험" },
    { group: "Unified P&L", name: "Blended ROAS", formula: "attributed_revenue / (spend + ad_fee)", unit: "배", desc: "Ad Spend All(외부+내부) 기준 Unified ROAS", domain: "Unified" },
    { group: "Unified P&L", name: "True ROAS", formula: "net_payout / (spend + platform_fee + ad_fee + return_fee)", unit: "배", desc: "순Profit 기준 ROAS", domain: "Unified" },
    { group: "Unified P&L", name: "EBITDA Contribution", formula: "net_payout - spend - creator_cost - logistics", unit: "원", desc: "SKUper EBITDA 기여", domain: "Unified" },
];

/* ── Recommend/Notification 규칙 ────────────────────────────────────── */
const RULES = [
    {
        id: "R001", severity: "danger", domain: "ad", trigger: "ROAS < 1.5 (48h 롤링)",
        title: "Ad Spend 손익 적자 감지",
        desc: "ROAS가 1.5 미만이면 Ads Cost이 Revenue을 초과할 위험이 있습니다.",
        actions: ["Campaign 일시 in progress단 검토", "입찰가 20% 하향 Auto Recommend", "Slack #growth Notification 전송"],
        pipeline: "normalized_activity_event(domain=ad) → Metrics Engine → alert_instance",
    },
    {
        id: "R002", severity: "warning", domain: "ad", trigger: "CTR < 0.5% (7일 MA)",
        title: "소재 피로도 감지 (Creative Fatigue)",
        desc: "CTR이 지속적으로 하락하면 소재 교체 시점입니다.",
        actions: ["상위 Creative 3개 Auto Recommend (CVR 기준)", "크리에이티브 Refresh 예약"],
        pipeline: "normalized_activity_event → CTR MA7 → creative_fatigue_alert",
    },
    {
        id: "R003", severity: "warning", domain: "market", trigger: "Return Rate > 15% (7일)",
        title: "반품률 이상 급등",
        desc: "특정 SKU 또는 Channel의 반품률이 임계Value을 초과했습니다.",
        actions: ["해당 SKU 상세 Analysis Link 제공", "CS Team Auto 티켓 Create", "Channelper 반품 사유 분류"],
        pipeline: "normalized_activity_event(is_return=1) → return_rate_window → kr_recon_ticket",
    },
    {
        id: "R004", severity: "danger", domain: "market", trigger: "Settlement GAP > ₩100,000",
        title: "정산 Amount 불일치 감지",
        desc: "예상 정산액과 실제 정산액 차이가 임계Value을 초과했습니다. Commission Error 또는 누락 가능성.",
        actions: ["정산 차이 내역 리포트 Auto Generate", "Channel Owner 에스컬레이션", "kr_recon_ticket Auto Generate (severity=high)"],
        pipeline: "kr_settlement_line → recon_engine → kr_recon_ticket(severity=high)",
    },
    {
        id: "R005", severity: "danger", domain: "ugc", trigger: "ugc_branded_content = 0 AND contract_type = paid",
        title: "브랜디드 콘텐츠 미표기 (규정 위반)",
        desc: "Paid 협찬 콘텐츠에 '#AD' 또는 'Paid 파트너십' 표기가 누락됩니다. 공정위 규정 위반 위험.",
        actions: ["해당 크리에이터 Urgent Notification Send", "콘텐츠 Edit 요청 티켓 Create", "법무Team 에스컬레이션"],
        pipeline: "normalized_activity_event(domain=ugc) → compliance_check → urgent_alert",
    },
    {
        id: "R006", severity: "warning", domain: "ugc", trigger: "ugc_rights_status = expired OR ugc_whitelist_status = revoked",
        title: "UGC 권리 Expired / 화이트리스트 Disconnect",
        desc: "Ads에 사용 in progress인 UGC의 저작권 계약이 Expired되거나 화이트리스트가 Disconnect됐습니다.",
        actions: ["해당 Ads 소재 즉시 Inactive화", "크리에이터 계약 갱신 요청", "대체 소재 Auto Recommend"],
        pipeline: "normalized_activity_event(domain=ugc) → rights_expiry_monitor → action_request",
    },
    {
        id: "R007", severity: "info", domain: "Unified", trigger: "SKU Blended ROAS < channel average × 0.7",
        title: "SKU Channel 효율 열위 감지",
        desc: "특정 SKU의 Channelper Unified ROAS가 Channel Average 대비 30% 이상 낮습니다.",
        actions: ["Channel Budget 재배분 시뮬레이션 제공", "SKU Price Optimization Recommend", "PnL Dashboard Integration"],
        pipeline: "normalized_activity_event → blended_ROAS_by_sku → reallocation_recommendation",
    },
];

/* ── Pipeline Step Component ─────────────────────────── */
function PipelineStep({ icon, title, sub, color, arrow }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
                display: "grid", gap: 4, padding: "14px 18px", borderRadius: 12, minWidth: 140, textAlign: "center",
                background: `${color}10`, border: `1.5px solid ${color}40`,
            }}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: 11, color }}>{title}</div>
                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{sub}</div>
            </div>
            {arrow && <div style={{ fontSize: 18, color: "var(--text-3)", fontWeight: 900 }}>→</div>}
        </div>
    );
}

/* ── MAIN PAGE ───────────────────────────────────────── */
export default function DataProduct() {
    const [tab, setTab] = useState("overview");
    const [domainFilter, setDomainFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [platType, setPlatType] = useState("all");

    const TABS = [
        { id: "overview", label: "🔷 개요 & 파이프라인" },
        { id: "schema", label: "📋 표준 Event Schema" },
        { id: "platform", label: "🌐 Platform 매핑" },
        { id: "metrics", label: "📊 Metric 카탈로그" },
        { id: "rules", label: "🔔 Recommend / Notification 규칙" },
    ];

    const filteredSchema = useMemo(() => SCHEMA.filter(f => {
        const matchDomain = domainFilter === "all" || f.domain === domainFilter;
        const q = search.toLowerCase();
        const matchSearch = !q || f.field.includes(q) || f.desc.toLowerCase().includes(q) || (f.example || "").toLowerCase().includes(q);
        return matchDomain && matchSearch;
    }), [domainFilter, search]);

    const filteredPlatforms = useMemo(() =>
        PLATFORM_MAPPING.filter(p => platType === "all" || p.type.includes(platType)), [platType]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(79,142,247,0.05),rgba(168,85,247,0.04))",
                borderColor: "rgba(79,142,247,0.15)",
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.2),rgba(168,85,247,0.15))" }}>🗂</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            데이터 제품 명세서
                        </div>
                        <div className="hero-desc">
                            Domestic/Global Platformper 표준 활동 Event Schema · Count집→표준화→Metric→Recommend/Notification All 파이프라인 명세
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                        { v: `${SCHEMA.length}개`, l: "표준 Field" },
                        { v: `${PLATFORM_MAPPING.length}개`, l: "Platform 매핑" },
                        { v: `${METRICS.length}개`, l: "파생 Metric" },
                        { v: `${RULES.length}개`, l: "Notification 규칙" },
                    ].map(k => (
                        <div key={k.l} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)" }}>
                            <span style={{ fontWeight: 900, fontSize: 14, color: "#4f8ef7" }}>{k.v}</span>
                            <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: 5 }}>{k.l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 4, overflowX: "auto", background: "rgba(99,140,255,0.04)", padding: 4, borderRadius: 12, border: "1px solid rgba(99,140,255,0.1)" }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                        background: tab === t.id ? "rgba(79,142,247,0.12)" : "transparent",
                        color: tab === t.id ? "#4f8ef7" : "var(--text-3)", fontWeight: tab === t.id ? 800 : 500, fontSize: 11,
                        transition: "all 150ms",
                    }}>{t.label}</button>
                ))}
            </div>

            {/* ── Tab: Overview ── */}
            {tab === "overview" && (
                <div style={{ display: "grid", gap: 16 }}>
                    {/* Pipeline */}
                    <div className="card card-glass fade-up" style={{ padding: 24 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>🔄 Count집 → 표준화 → Metric → Recommend/Notification 파이프라인</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 20 }}>All 데이터 제품 흐름 — 원문 Event부터 Action Recommend까지</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <PipelineStep icon="📡" title="Count집" sub="webhook/polling/API" color="#4f8ef7" arrow />
                            <PipelineStep icon="📦" title="Raw Event" sub="raw_vendor_event" color="#6366f1" arrow />
                            <PipelineStep icon="⚙️" title="정규화 엔진" sub="v423_rule_v1" color="#8b5cf6" arrow />
                            <PipelineStep icon="✅" title="표준 Event" sub="normalized_activity_event" color="#a855f7" arrow />
                            <PipelineStep icon="📊" title="Metric 산출" sub="Metrics Engine" color="#ec4899" arrow />
                            <PipelineStep icon="🔔" title="Recommend/Notification" sub="alert_instance" color="#ef4444" />
                        </div>
                    </div>

                    {/* Platform coverage */}
                    <div className="card card-glass fade-up" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 14 }}>🌐 Count집 커버리지 — Domestic/Global Platform</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                            {[
                                { region: "Domestic Ads", platforms: ["Kakao Moment", "Naver SearchAds", "Naver GFA", "Coupang Ads", "11st Ads"], color: "#22c55e" },
                                { region: "Global Ads", platforms: ["Meta (FB/IG)", "TikTok Business", "Google Ads", "Snapchat", "Pinterest"], color: "#4f8ef7" },
                                { region: "Domestic Market", platforms: ["Coupang Partners", "Naver Smart Store", "11Street", "Gmarket", "SSG", "무신사"], color: "#f59e0b" },
                                { region: "Global Market", platforms: ["Amazon SP-API", "Shopify", "Lazada", "Rakuten"], color: "#f97316" },
                                { region: "UGC Domestic", platforms: ["Naver 블로그", "Kakao스토리", "유튜브 KR", "인스타그램 KR"], color: "#a855f7" },
                                { region: "UGC Global", platforms: ["TikTok Creator", "Instagram Global", "YouTube Global"], color: "#ec4899" },
                            ].map(g => (
                                <div key={g.region} style={{ padding: 12, borderRadius: 10, background: `${g.color}07`, border: `1px solid ${g.color}25` }}>
                                    <div style={{ fontWeight: 800, fontSize: 10, color: g.color, marginBottom: 8 }}>{g.region}</div>
                                    {g.platforms.map(p => (
                                        <div key={p} style={{ fontSize: 9, color: "var(--text-2)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                                            <span style={{ color: g.color }}>▪</span>{p}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Domain summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {Object.entries(C).filter(([k]) => k !== "common").map(([k, v]) => (
                            <div key={k} style={{ padding: 16, borderRadius: 12, background: v.bg, border: `1px solid ${v.border}` }}>
                                <div style={{ fontWeight: 900, fontSize: 12, color: v.text, marginBottom: 8 }}>{v.label} 도메인</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                                    {SCHEMA.filter(f => f.domain === k).length}개 표준 Field ·{" "}
                                    {METRICS.filter(m => m.domain === k).length}개 파생 Metric ·{" "}
                                    {RULES.filter(r => r.domain === k || r.domain === "Unified").length}개 Notification 규칙
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tab: Schema ── */}
            {tab === "schema" && (
                <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Field명 Search..."
                            style={{
                                flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                                background: "rgba(255,255,255,0.04)", color: "var(--text-1)", fontSize: 11, outline: "none",
                            }}
                        />
                        {["all", "common", "ad", "market", "ugc"].map(d => (
                            <button key={d} onClick={() => setDomainFilter(d)} style={{
                                padding: "6px 12px", borderRadius: 8, border: "1px solid",
                                borderColor: domainFilter === d ? (C[d] || C.common).text : "var(--border)",
                                background: domainFilter === d ? (C[d] || C.common).bg : "transparent",
                                color: domainFilter === d ? (C[d] || C.common).text : "var(--text-3)",
                                fontSize: 10, cursor: "pointer", fontWeight: 600,
                            }}>
                                {d === "all" ? "All" : d === "common" ? "Common" : d === "ad" ? "Ads" : d === "market" ? "Market" : "UGC"}
                                <span style={{ marginLeft: 4, opacity: .6 }}>({d === "all" ? SCHEMA.length : SCHEMA.filter(f => f.domain === d).length})</span>
                            </button>
                        ))}
                    </div>

                    <div className="card card-glass" style={{ padding: 0, overflow: "hidden" }}>
                        <table className="table" style={{ fontSize: 10 }}>
                            <thead>
                                <tr>
                                    <th>도메인</th><th>Field명</th><th>Type</th><th>Nullable</th><th>Description</th><th>예시Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSchema.map(f => {
                                    const col = C[f.domain] || C.common;
                                    return (
                                        <tr key={f.field}>
                                            <td><span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 9, background: col.bg, color: col.text, fontWeight: 700, border: `1px solid ${col.border}` }}>{f.domain}</span></td>
                                            <td><code style={{ fontSize: 10, color: "#4f8ef7" }}>{f.field}</code></td>
                                            <td><code style={{ fontSize: 9, color: "#a855f7" }}>{f.type}</code></td>
                                            <td style={{ textAlign: "center", color: f.nullable ? "#f59e0b" : "#22c55e" }}>{f.nullable ? "Y" : "N"}</td>
                                            <td style={{ color: "var(--text-2)" }}>{f.desc}</td>
                                            <td style={{ color: "var(--text-3)", fontStyle: "italic" }}>{f.example || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "right" }}>{filteredSchema.length} / {SCHEMA.length} Field 표시</div>
                </div>
            )}

            {/* ── Tab: Platform Mapping ── */}
            {tab === "platform" && (
                <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                        {["all", "Ads", "Market", "UGC"].map(t => (
                            <button key={t} onClick={() => setPlatType(t === "all" ? "all" : t)} style={{
                                padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                                background: platType === (t === "all" ? "all" : t) ? "rgba(79,142,247,0.1)" : "transparent",
                                color: platType === (t === "all" ? "all" : t) ? "#4f8ef7" : "var(--text-3)", fontSize: 10, cursor: "pointer", fontWeight: 600,
                            }}>{t === "all" ? "All Platform" : t}</button>
                        ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                        {filteredPlatforms.map(p => (
                            <div key={p.platform} className="card card-glass fade-up" style={{ padding: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 11 }}>{p.platform}</div>
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>{p.region} · {p.type}</div>
                                    </div>
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ fontSize: 9, textAlign: "left", padding: "3px 6px", color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.1)" }}>Platform 원본 Field</th>
                                            <th style={{ fontSize: 9, textAlign: "left", padding: "3px 6px", color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.1)" }}>표준 Field</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {p.fields.map(f => (
                                            <tr key={f.raw}>
                                                <td style={{ fontSize: 9, padding: "3px 6px", color: "#f59e0b", fontFamily: "monospace" }}>{f.raw}</td>
                                                <td style={{ fontSize: 9, padding: "3px 6px", color: "#4f8ef7", fontFamily: "monospace" }}>{f.std}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tab: Metrics ── */}
            {tab === "metrics" && (
                <div style={{ display: "grid", gap: 12 }}>
                    {["Ads 효율", "Market Profit", "UGC Performance", "Unified P&L"].map(grp => (
                        <div key={grp} className="card card-glass fade-up" style={{ padding: 16 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 12 }}>{grp}</div>
                            <table className="table" style={{ fontSize: 10 }}>
                                <thead>
                                    <tr><th>Metric명</th><th>공식</th><th>Unit</th><th>Description</th><th>임계值</th></tr>
                                </thead>
                                <tbody>
                                    {METRICS.filter(m => m.group === grp).map(m => (
                                        <tr key={m.name}>
                                            <td><strong style={{ color: "#4f8ef7" }}>{m.name}</strong></td>
                                            <td><code style={{ fontSize: 9, color: "#a855f7", background: "rgba(168,85,247,0.06)", padding: "2px 5px", borderRadius: 4 }}>{m.formula}</code></td>
                                            <td style={{ color: "#22c55e", fontWeight: 700 }}>{m.unit}</td>
                                            <td style={{ color: "var(--text-2)" }}>{m.desc}</td>
                                            <td style={{ fontSize: 9, color: m.threshold ? "#f59e0b" : "var(--text-3)" }}>{m.threshold || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tab: Rules ── */}
            {tab === "rules" && (
                <div style={{ display: "grid", gap: 12 }}>
                    {RULES.map(r => {
                        const sev = { danger: ["#ef4444", "rgba(239,68,68,0.08)", "🔴"], warning: ["#f59e0b", "rgba(245,158,11,0.08)", "🟡"], info: ["#4f8ef7", "rgba(79,142,247,0.08)", "🔵"] }[r.severity];
                        return (
                            <div key={r.id} className="card card-glass fade-up" style={{ padding: 18, border: `1px solid ${sev[0]}30`, background: sev[1] }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontSize: 18 }}>{sev[2]}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)" }}>{r.id}</span>
                                            <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: `${sev[0]}15`, color: sev[0] }}>{r.severity.toUpperCase()}</span>
                                            <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: "rgba(99,140,255,0.1)", color: "var(--text-2)" }}>{r.domain}</span>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 4 }}>{r.title}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 8 }}>{r.desc}</div>
                                        <div style={{ fontSize: 9, padding: "5px 10px", borderRadius: 6, background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.1)", fontFamily: "monospace", color: "#4f8ef7", marginBottom: 10 }}>
                                            <strong>TRIGGER:</strong> {r.trigger}
                                        </div>
                                        <div style={{ display: "grid", gap: 4 }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)" }}>Auto Action:</div>
                                            {r.actions.map((a, i) => (
                                                <div key={i} style={{ fontSize: 10, display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span style={{ color: sev[0], fontWeight: 700 }}>→</span><span style={{ color: "var(--text-2)" }}>{a}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: 10, fontSize: 9, color: "var(--text-3)", borderTop: "1px solid rgba(99,140,255,0.08)", paddingTop: 8, fontFamily: "monospace" }}>
                                            {r.pipeline}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
