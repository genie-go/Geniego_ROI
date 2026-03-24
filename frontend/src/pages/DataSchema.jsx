import React, { useState } from "react";

/* ─── shared ────────────────────────────────────────────── */
const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
        background: color + "18", color, border: `1px solid ${color}33`
    }}>{label}</span>
);
const Code = ({ children }) => (
    <code style={{
        fontFamily: "monospace", fontSize: 10, color: "#14d9b0",
        background: "rgba(20,217,176,0.08)", padding: "1px 5px", borderRadius: 4
    }}>{children}</code>
);
const FieldRow = ({ name, type, required, desc, example, tags = [] }) => (
    <tr>
        <td><Code>{name}</Code></td>
        <td><Tag label={type} color={type === "string" ? "#4f8ef7" : type === "number" ? "#f97316" : type === "boolean" ? "#a855f7" : type === "timestamp" ? "#14d9b0" : "#eab308"} /></td>
        <td style={{ textAlign: "center" }}>{required ? <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span> : <span style={{ color: "#475569" }}>—</span>}</td>
        <td style={{ fontSize: 11, color: "var(--text-2)" }}>{desc}</td>
        <td style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{example}</td>
        <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tags.map(t => <Tag key={t} label={t} color="#6366f1" />)}</td>
    </tr>
);

/* ════════════════════════════════════════════════════
   DATA — Schema definitions
════════════════════════════════════════════════════ */
const SCHEMAS = {
    ad: {
        label: "📣 Ad Events", color: "#f97316",
        platforms: ["Meta Ads", "Google Ads", "TikTok Ads", "Naver SA/DA", "Kakao Moment", "Coupang Ads"],
        desc: "Standard schema for campaign · creative · keyword · audience level impression/click/conversion events",
        sections: [
            {
                title: "Campaign Hierarchy",
                fields: [
                    { name: "event_id", type: "string", required: true, desc: "Event unique UUID v4", example: "evt_a1b2c3d4", tags: ["PK"] },
                    { name: "platform", type: "string", required: true, desc: "Platform code (meta/google/tiktok…)", example: "meta", tags: ["PartitionKey"] },
                    { name: "account_id", type: "string", required: true, desc: "Ad account ID", example: "act_123456789", tags: [] },
                    { name: "campaign_id", type: "string", required: true, desc: "Campaign ID", example: "23851234567890", tags: ["FK"] },
                    { name: "campaign_name", type: "string", required: true, desc: "Campaign name", example: "Spring_KR_2026_Q1", tags: [] },
                    { name: "campaign_objective", type: "string", required: true, desc: "Objective (PURCHASE/LEAD/REACH…)", example: "PURCHASE", tags: [] },
                    { name: "adset_id", type: "string", required: true, desc: "Ad set / group ID", example: "23851234567891", tags: ["FK"] },
                    { name: "adset_name", type: "string", required: false, desc: "Ad set name", example: "LA_Retarget_30d", tags: [] },
                    { name: "ad_id", type: "string", required: true, desc: "Creative (Ad) ID", example: "23851234567892", tags: ["FK"] },
                    { name: "ad_name", type: "string", required: false, desc: "Creative name", example: "Creative_v3_Video", tags: [] },
                    { name: "creative_type", type: "string", required: false, desc: "Creative type (video/image/carousel)", example: "video", tags: [] },
                    { name: "keyword_id", type: "string", required: false, desc: "Search keyword ID (SA only)", example: "kw_98765", tags: ["nullable"] },
                    { name: "keyword_text", type: "string", required: false, desc: "Keyword text", example: "wireless headphones", tags: ["nullable"] },
                    { name: "match_type", type: "string", required: false, desc: "Keyword match type", example: "exact", tags: ["nullable"] },
                ]
            },
            {
                title: "Audience Targeting",
                fields: [
                    { name: "audience_id", type: "string", required: false, desc: "Audience segment ID", example: "aud_retarget_30d", tags: [] },
                    { name: "audience_type", type: "string", required: false, desc: "Retarget/LAL/Interest/Keyword", example: "lookalike", tags: [] },
                    { name: "age_min", type: "number", required: false, desc: "Min age target", example: "25", tags: [] },
                    { name: "age_max", type: "number", required: false, desc: "Max age target", example: "44", tags: [] },
                    { name: "gender", type: "string", required: false, desc: "Gender target (ALL/M/F)", example: "ALL", tags: [] },
                    { name: "geo_country", type: "string", required: false, desc: "Country code ISO 3166-1", example: "KR", tags: [] },
                    { name: "placement", type: "string", required: false, desc: "Placement (feed/reels/search…)", example: "feed", tags: [] },
                    { name: "device_type", type: "string", required: false, desc: "Device type (mobile/desktop)", example: "mobile", tags: [] },
                ]
            },
            {
                title: "Performance Metrics",
                fields: [
                    { name: "event_date", type: "timestamp", required: true, desc: "Event date UTC", example: "2026-03-04T09:00:00Z", tags: ["PartitionKey"] },
                    { name: "impressions", type: "number", required: true, desc: "Impression count", example: "41000", tags: ["Aggregate"] },
                    { name: "clicks", type: "number", required: true, desc: "Click count", example: "1820", tags: ["Aggregate"] },
                    { name: "spend", type: "number", required: true, desc: "Ad spend (platform currency)", example: "12400000", tags: ["Aggregate"] },
                    { name: "currency", type: "string", required: true, desc: "Currency code ISO 4217", example: "KRW", tags: [] },
                    { name: "conversions", type: "number", required: true, desc: "Conversion (purchase) count", example: "342", tags: ["Aggregate"] },
                    { name: "conversion_value", type: "number", required: true, desc: "Conversion amount (same currency)", example: "41040000", tags: ["Aggregate"] },
                    { name: "reach", type: "number", required: false, desc: "Unique reach user count", example: "31000", tags: ["Aggregate"] },
                    { name: "frequency", type: "number", required: false, desc: "Avg impression frequency", example: "1.32", tags: [] },
                    { name: "video_views", type: "number", required: false, desc: "Video play count (video creatives)", example: "18700", tags: ["nullable"] },
                    { name: "view_rate", type: "number", required: false, desc: "Video view rate (ThruPlay basis)", example: "0.456", tags: ["nullable"] },
                    { name: "ctr", type: "number", required: false, desc: "Click rate (derived: clicks/impressions)", example: "0.0132", tags: ["Derived"] },
                    { name: "cpc", type: "number", required: false, desc: "Cost per click (derived)", example: "6813", tags: ["Derived"] },
                    { name: "roas", type: "number", required: false, desc: "Return on ad spend (derived)", example: "4.18", tags: ["Derived"] },
                    { name: "acos", type: "number", required: false, desc: "Ad cost of sales spend/conv_value (derived)", example: "0.239", tags: ["Derived"] },
                ]
            },
        ]
    },
    market: {
        label: "🏪 Market Orders/Settlement", color: "#ef4444",
        platforms: ["Coupang", "Naver SmartStore", "11Street", "Gmarket", "Shopify", "Amazon"],
        desc: "Standard schema for market events including order · return · claim · settlement with detailed deduction items",
        sections: [
            {
                title: "Order",
                fields: [
                    { name: "order_id", type: "string", required: true, desc: "Unique order ID (platform original)", example: "ORD-20260304-001", tags: ["PK"] },
                    { name: "platform", type: "string", required: true, desc: "Platform code", example: "coupang", tags: ["PartitionKey"] },
                    { name: "channel_key", type: "string", required: true, desc: "Domestic channel standard key", example: "coupang", tags: [] },
                    { name: "order_date", type: "timestamp", required: true, desc: "Order timestamp UTC", example: "2026-03-04T10:30:00Z", tags: ["PartitionKey"] },
                    { name: "sku", type: "string", required: true, desc: "Product SKU", example: "SKU-A1-BLK", tags: ["FK"] },
                    { name: "product_name", type: "string", required: true, desc: "Product name", example: "WH-1000XM5 Black", tags: [] },
                    { name: "quantity", type: "number", required: true, desc: "Order quantity", example: "2", tags: [] },
                    { name: "sell_price", type: "number", required: true, desc: "Selling unit price", example: "289000", tags: [] },
                    { name: "gross_sales", type: "number", required: true, desc: "Gross sales (qty × price)", example: "578000", tags: ["Aggregate"] },
                    { name: "currency", type: "string", required: true, desc: "Currency code", example: "KRW", tags: [] },
                    { name: "buyer_id_hash", type: "string", required: false, desc: "Buyer hash (anonymized)", example: "sha256:ab12…", tags: ["PIIHash"] },
                    { name: "coupon_code", type: "string", required: false, desc: "Coupon code used", example: "SPRING20", tags: ["nullable"] },
                    { name: "influencer_code", type: "string", required: false, desc: "Influencer referral code", example: "TECHVIBE10", tags: ["nullable", "Attribution"] },
                ]
            },
            {
                title: "Settlement Deductions",
                fields: [
                    { name: "settle_id", type: "string", required: true, desc: "Settlement ID", example: "SET-2026-02-C001", tags: ["PK"] },
                    { name: "settle_period", type: "string", required: true, desc: "Settlement period (YYYY-MM)", example: "2026-02", tags: [] },
                    { name: "platform_fee", type: "number", required: true, desc: "Platform commission (varies by channel)", example: "30688000", tags: ["Deduction"] },
                    { name: "platform_fee_rate", type: "number", required: true, desc: "Commission rate", example: "0.109", tags: ["Derived"] },
                    { name: "ad_fee", type: "number", required: true, desc: "Ad spend deduction", example: "28080000", tags: ["Deduction"] },
                    { name: "payment_fee", type: "number", required: true, desc: "Payment processing fee", example: "4582000", tags: ["Deduction"] },
                    { name: "logistics_fee", type: "number", required: false, desc: "Logistics/shipping deduction (fulfillment)", example: "1500000", tags: ["Deduction", "nullable"] },
                    { name: "return_deduction", type: "number", required: false, desc: "Return handling deduction", example: "2240000", tags: ["Deduction", "nullable"] },
                    { name: "coupon_deduction", type: "number", required: false, desc: "Coupon discount deduction (platform-borne)", example: "5600000", tags: ["Deduction", "nullable"] },
                    { name: "tax_withholding", type: "number", required: false, desc: "Tax withholding", example: "870000", tags: ["Deduction", "nullable"] },
                    { name: "other_deductions", type: "number", required: false, desc: "Other deductions total", example: "0", tags: ["Deduction", "nullable"] },
                    { name: "gross_payout", type: "number", required: true, desc: "Pre-deduction settlement base amount", example: "280800000", tags: [] },
                    { name: "net_payout", type: "number", required: true, desc: "Actual settlement (gross - all deductions)", example: "210800000", tags: ["Aggregate"] },
                    { name: "net_payout_krw", type: "number", required: true, desc: "KRW-converted settlement amount", example: "210800000", tags: ["Aggregate", "FXConversion"] },
                    { name: "fx_rate", type: "number", required: false, desc: "Applied FX rate (KRW basis)", example: "1330.5", tags: ["nullable"] },
                    { name: "vat_rate", type: "number", required: true, desc: "VAT rate", example: "0.1", tags: [] },
                ]
            },
            {
                title: "Return & Claim",
                fields: [
                    { name: "return_id", type: "string", required: true, desc: "Return ID", example: "RET-2026-03-001", tags: ["PK"] },
                    { name: "order_id", type: "string", required: true, desc: "Original order ID", example: "ORD-20260304-001", tags: ["FK"] },
                    { name: "return_reason", type: "string", required: true, desc: "Return reason code", example: "DEFECTIVE", tags: [] },
                    { name: "return_status", type: "string", required: true, desc: "Processing status (REQUESTED/COMPLETED)", example: "COMPLETED", tags: [] },
                    { name: "claim_type", type: "string", required: false, desc: "Claim type (EXCHANGE/REFUND)", example: "REFUND", tags: ["nullable"] },
                    { name: "refund_amount", type: "number", required: false, desc: "Refund amount", example: "289000", tags: ["nullable"] },
                ]
            },
        ]
    },
    ugc: {
        label: "🤝 UGC/Influencer", color: "#a855f7",
        platforms: ["YouTube", "Instagram", "TikTok", "NaverBlog", "Kakao Story"],
        desc: "Complete standard schema for content activity · clicks · coupons · contracts · rights/whitelisting/branded content",
        sections: [
            {
                title: "Creator Identity",
                fields: [
                    { name: "creator_id", type: "string", required: true, desc: "Internal creator UUID", example: "CRE-001-KR", tags: ["PK"] },
                    { name: "platform", type: "string", required: true, desc: "Platform code", example: "tiktok", tags: ["PartitionKey"] },
                    { name: "platform_handle", type: "string", required: true, desc: "Platform handle (@username)", example: "@tiktok_techvibe", tags: [] },
                    { name: "platform_user_id", type: "string", required: true, desc: "Platform unique user ID", example: "tt_9901", tags: ["ExternalID"] },
                    { name: "email_hash", type: "string", required: false, desc: "Email SHA-256 hash (duplicate detection)", example: "sha256:ef45…", tags: ["PIIHash"] },
                    { name: "tier", type: "string", required: true, desc: "Creator Tier", example: "Macro", tags: [] },
                    { name: "is_duplicate", type: "boolean", required: true, desc: "Same-person duplicate account flag", example: "false", tags: ["Quality"] },
                    { name: "identity_group_id", type: "string", required: false, desc: "Unified creator group ID", example: "GRP-001", tags: ["nullable"] },
                ]
            },
            {
                title: "Contract",
                fields: [
                    { name: "contract_id", type: "string", required: true, desc: "Contract UUID", example: "CTR-C003-2026", tags: ["PK"] },
                    { name: "contract_type", type: "string", required: true, desc: "flat/perf/flat+perf", example: "perf", tags: [] },
                    { name: "flat_fee", type: "number", required: false, desc: "Fixed contract fee (KRW)", example: "0", tags: ["nullable"] },
                    { name: "perf_rate", type: "number", required: false, desc: "Performance rate (vs revenue)", example: "0.025", tags: ["nullable"] },
                    { name: "perf_base", type: "string", required: false, desc: "Performance basis (revenue/orders)", example: "revenue", tags: ["nullable"] },
                    { name: "contract_start", type: "timestamp", required: true, desc: "Contract start date", example: "2025-01-01", tags: [] },
                    { name: "contract_end", type: "timestamp", required: true, desc: "Contract end date", example: "2026-08-31", tags: [] },
                    { name: "esign_status", type: "string", required: true, desc: "e-Sign status", example: "signed", tags: [] },
                    { name: "esign_date", type: "timestamp", required: false, desc: "Signature completion datetime", example: "2025-01-15T14:00:00Z", tags: ["nullable"] },
                    { name: "rights_scope", type: "string", required: true, desc: "Rights scope (comma-separated)", example: "commercial,resell", tags: [] },
                    { name: "exclusivity", type: "boolean", required: true, desc: "Exclusive contract flag", example: "false", tags: [] },
                ]
            },
            {
                title: "Rights & Whitelisting",
                fields: [
                    { name: "rights_id", type: "string", required: true, desc: "Rights record UUID", example: "RGT-C003-YT-01", tags: ["PK"] },
                    { name: "content_id", type: "string", required: true, desc: "Platform content ID", example: "dQw4w9WgXcQ", tags: ["FK"] },
                    { name: "rights_type", type: "string", required: true, desc: "organic/commercial/resell/exclusive", example: "commercial", tags: [] },
                    { name: "rights_start", type: "timestamp", required: true, desc: "Rights start date", example: "2025-01-01", tags: [] },
                    { name: "rights_expiry", type: "timestamp", required: true, desc: "Rights expiry date", example: "2025-12-31", tags: ["AlertTrigger"] },
                    { name: "whitelist_enabled", type: "boolean", required: true, desc: "Ad whitelist (bolt) allowed flag", example: "true", tags: ["AdDelivery"] },
                    { name: "whitelist_expiry", type: "timestamp", required: false, desc: "Whitelist expiry date", example: "2025-12-31", tags: ["nullable", "AlertTrigger"] },
                    { name: "ad_account_id", type: "string", required: false, desc: "Whitelist linked ad account ID", example: "act_987654321", tags: ["nullable"] },
                    { name: "is_branded_content", type: "boolean", required: true, desc: "Branded content (sponsored) disclosure flag", example: "true", tags: ["Compliance"] },
                    { name: "bc_label", type: "string", required: false, desc: "Sponsored content disclosure label", example: "Paid Partnership", tags: ["nullable", "Compliance"] },
                    { name: "ftc_compliant", type: "boolean", required: true, desc: "FTC/fair trade compliance flag", example: "true", tags: ["Compliance"] },
                ]
            },
            {
                title: "Content Performance",
                fields: [
                    { name: "content_event_id", type: "string", required: true, desc: "Content event UUID", example: "ce_abc123", tags: ["PK"] },
                    { name: "content_id", type: "string", required: true, desc: "Platform content ID", example: "dQw4w9WgXcQ", tags: ["FK"] },
                    { name: "content_type", type: "string", required: true, desc: "video/reel/post/blog/short", example: "video", tags: [] },
                    { name: "published_at", type: "timestamp", required: true, desc: "Publish datetime UTC", example: "2026-02-15T08:00:00Z", tags: [] },
                    { name: "snapshot_date", type: "timestamp", required: true, desc: "Data snapshot date", example: "2026-03-04", tags: ["PartitionKey"] },
                    { name: "views", type: "number", required: true, desc: "View count", example: "1200000", tags: ["Aggregate"] },
                    { name: "likes", type: "number", required: false, desc: "Like count", example: "84000", tags: ["Aggregate"] },
                    { name: "comments", type: "number", required: false, desc: "Comment count", example: "3600", tags: ["Aggregate"] },
                    { name: "shares", type: "number", required: false, desc: "Share count", example: "12100", tags: ["Aggregate"] },
                    { name: "saves", type: "number", required: false, desc: "Save count (Instagram)", example: "5400", tags: ["Aggregate", "nullable"] },
                    { name: "engagement_rate", type: "number", required: false, desc: "Engagement rate=(likes+comments+shares)/views", example: "0.089", tags: ["Derived"] },
                    { name: "swipe_ups", type: "number", required: false, desc: "Swipe-up/link clicks", example: "9600", tags: ["nullable"] },
                    { name: "link_clicks", type: "number", required: false, desc: "Link click count", example: "9600", tags: ["Aggregate"] },
                    { name: "coupon_uses", type: "number", required: false, desc: "Coupon uses from this content", example: "340", tags: ["Aggregate", "Attribution"] },
                    { name: "coupon_revenue", type: "number", required: false, desc: "Coupon-attributed revenue", example: "34000000", tags: ["Aggregate", "Attribution"] },
                    { name: "attributed_orders", type: "number", required: false, desc: "Attribution-contributed order count", example: "510", tags: ["Derived", "Attribution"] },
                    { name: "attributed_revenue", type: "number", required: false, desc: "Attribution-contributed revenue", example: "51000000", tags: ["Derived", "Attribution"] },
                    { name: "attribution_model", type: "string", required: false, desc: "Attribution model", example: "last_touch_7d", tags: ["nullable"] },
                ]
            },
            {
                title: "Settlement",
                fields: [
                    { name: "settle_id", type: "string", required: true, desc: "Settlement UUID", example: "INF-SET-C003-02", tags: ["PK"] },
                    { name: "contract_id", type: "string", required: true, desc: "Contract FK", example: "CTR-C003-2026", tags: ["FK"] },
                    { name: "settle_period", type: "string", required: true, desc: "Settlement period YYYY-MM", example: "2026-02", tags: [] },
                    { name: "base_amount", type: "number", required: true, desc: "Contract basis payment amount", example: "2225000", tags: [] },
                    { name: "income_tax", type: "number", required: true, desc: "Business income tax 3.3%", example: "73425", tags: ["Deduction"] },
                    { name: "local_tax", type: "number", required: true, desc: "Local income tax 0.33%", example: "7342", tags: ["Deduction"] },
                    { name: "net_payout", type: "number", required: true, desc: "Actual payment amount", example: "2144233", tags: [] },
                    { name: "paid_at", type: "timestamp", required: false, desc: "Payment completion datetime", example: "2026-03-10T14:00:00Z", tags: ["nullable"] },
                    { name: "settle_status", type: "string", required: true, desc: "paid/partial/unpaid/overpaid", example: "paid", tags: ["AlertTrigger"] },
                    { name: "overpay_amount", type: "number", required: false, desc: "Overpayment amount (when detected)", example: "0", tags: ["nullable", "AlertTrigger"] },
                    { name: "doc_urls", type: "string", required: false, desc: "Supporting document URL array (JSON)", example: '["s3://bucket/doc.pdf"]', tags: ["nullable"] },
                    { name: "bank_code", type: "string", required: false, desc: "Receiving bank code", example: "004", tags: ["nullable"] },
                    { name: "account_hash", type: "string", required: false, desc: "Account number SHA-256", example: "sha256:bb99…", tags: ["PIIHash", "nullable"] },
                ]
            },
        ]
    },
};

/* ════════════════════════════════════════════════════
   PIPELINE tab data
════════════════════════════════════════════════════ */
const PIPELINE = [
    {
        step: "1. Collect",
        icon: "📡", color: "#4f8ef7",
        items: [
            { title: "Ad API Collection", desc: "Meta Marketing API v19 / Google Ads API v16 / TikTok Business API / Naver Search API — OAuth2 token auto-refresh, 15-min pull", tags: ["OAuth2", "15min", "Rate-limit handling"] },
            { title: "Market Settlement File Collection", desc: "Coupang Wing / Naver SmartStore settlement CSV auto-download → S3 load / Amazon SP-API Reports → SQS", tags: ["S3", "SQS", "Daily", "Webhook"] },
            { title: "UGC Content Crawling", desc: "YouTube Data API v3 / Instagram Graph API / TikTok Research API — snapshots at 1h·24h·7d·30d post-publish", tags: ["Snapshot", "Cache TTL 1h"] },
            { title: "Coupon/Event Receipt", desc: "Coupon usage events → Webhook POST → Kafka topic influencer.coupon.used", tags: ["Kafka", "Webhook", "Real-time"] },
        ]
    },
    {
        step: "2. Normalize",
        icon: "⚙️", color: "#a855f7",
        items: [
            { title: "Field Mapping & Currency Conversion", desc: "Platform-specific source fields → standard schema mapping table. Foreign currency → KRW FX rate daily update (BOK API)", tags: ["FX Conversion", "Mapping Table", "Quality Check"] },
            { title: "Creator Identity Unification", desc: "Email hash + handle similarity (Levenshtein ≤ 2) based duplicate detection → assign identity_group_id", tags: ["Dedup", "Fuzzy Match"] },
            { title: "Attribution Linking", desc: "Coupon code → influencer_code join → attributed_orders/revenue calculation (last-touch 7d default)", tags: ["last-touch", "coupon-join", "7d window"] },
            { title: "PII Anonymization", desc: "Buyer email/phone → SHA-256 hash. Account number encrypted (AES-256) storage", tags: ["SHA-256", "AES-256", "GDPR", "PIPA"] },
            { title: "Data Quality (DQ) Validation", desc: "Required field NULL check, negative amount guard, ROAS threshold anomaly flag, duplicate event_id removal", tags: ["DQ", "NULL Check", "Anomaly", "Dedup"] },
        ]
    },
    {
        step: "3. Metrics Calculation",
        icon: "📊", color: "#22c55e",
        items: [
            { title: "Real-time Aggregation (Streaming)", desc: "Kafka Streams: ad click/conversion events → 1-min rolling window ROAS, CTR aggregation → Redis cache → Dashboard", tags: ["Kafka Streams", "1min window", "Redis"] },
            { title: "Daily Batch Aggregation", desc: "Airflow DAG daily at 04:00 KST: SKU × channel × campaign × creator P&L calculation → Parquet → BigQuery", tags: ["Airflow", "BigQuery", "Parquet", "04:00 KST"] },
            { title: "Derived Metrics", desc: "ROAS = conv_value/spend · ACOS = spend/conv_value · CTR · CVR · Return Rate · Coupon Rate · Settlement Rate · Creator ROI", tags: ["Derived", "SLA 6h"] },
            { title: "Anomaly Scoring", desc: "Z-score based anomaly detection + rule-based (ROAS < 3 / Return Rate > 12%) combination → anomaly_score [0-100]", tags: ["Z-score", "Rule-based", "Real-time"] },
        ]
    },
    {
        step: "4. Recommend & Alert",
        icon: "🚀", color: "#f97316",
        items: [
            { title: "Anomaly Alerts", desc: "anomaly_score > 70 → Slack #alert-channel + in-app banner. Rights/whitelist expiry D-30/D-7/D-0 → email+in-app", tags: ["Slack", "In-app", "Email", "D-30/7/0"] },
            { title: "Budget Reallocation Recommendation", desc: "ROAS-based budget shift simulation: Δrevenue prediction + confidence interval → 'Moving ₩X from campaign A→B expected +₩Y' card", tags: ["Simulation", "Confidence Interval", "P1 Priority"] },
            { title: "Creator Renewal Recommendation", desc: "Creator ROI top 20% & contract expiry D-60 → auto contract draft generation + e-Sign link", tags: ["Auto Draft", "e-Sign", "D-60"] },
            { title: "Content Repurposing Recommendation", desc: "Engagement rate ≥ 5% & orders ≥ 50 & whitelist valid → ad creative conversion recommendation + product page insertion", tags: ["Whitelist Check", "Ad Creative", "PDP"] },
            { title: "Settlement Auto-Verification", desc: "Contract basis vs actual payment comparison → |diff| > ₩10,000 anomaly flag → overpayment clawback / underpayment payment workflow trigger", tags: ["Auto Verify", "Clawback", "Underpayment", "₩10K threshold"] },
        ]
    },
];

/* ════════════════════════════════════════════════════
   METRICS CATALOG
════════════════════════════════════════════════════ */
const METRICS = [
    { domain: "Ad", name: "ROAS", formula: "conversion_value / spend", type: "Derived", alert: "< 3.0x → 🔴", unit: "x" },
    { domain: "Ad", name: "ACOS", formula: "spend / conversion_value", type: "Derived", alert: "> 30% → 🟡", unit: "%" },
    { domain: "Ad", name: "CTR", formula: "clicks / impressions", type: "Derived", alert: "< 0.5% → 🟡", unit: "%" },
    { domain: "Ad", name: "CVR", formula: "conversions / clicks", type: "Derived", alert: "< 1% → 🟡", unit: "%" },
    { domain: "Ad", name: "CPC", formula: "spend / clicks", type: "Derived", alert: null, unit: "₩" },
    { domain: "Market", name: "Return Rate", formula: "returns / orders", type: "Derived", alert: "> 12% → 🔴", unit: "%" },
    { domain: "Market", name: "Settlement Rate", formula: "net_payout / gross_sales", type: "Derived", alert: "< 70% → 🟡", unit: "%" },
    { domain: "Market", name: "Commission Rate", formula: "platform_fee / gross_sales", type: "Derived", alert: "> 14% → 🟡", unit: "%" },
    { domain: "Market", name: "Coupon Rate", formula: "coupon_deduction / gross_sales", type: "Derived", alert: "> 15% → 🟡", unit: "%" },
    { domain: "UGC", name: "Engagement Rate", formula: "(likes+comments+shares) / views", type: "Derived", alert: "< 1% → 🟡", unit: "%" },
    { domain: "UGC", name: "Creator ROI", formula: "attributed_revenue / (flat_fee + perf_pay)", type: "Derived", alert: "< 10x → 🟡", unit: "x" },
    { domain: "UGC", name: "Coupon Conv. Rate", formula: "coupon_uses / views", type: "Derived", alert: "> 0.5‰ high usage check", unit: "‰" },
    { domain: "UGC", name: "Attribution Rate", formula: "attributed_orders / total_orders", type: "Derived", alert: null, unit: "%" },
    { domain: "Integrated", name: "Blended ROAS", formula: "Σadvertised_revenue / Σspend (all channels)", type: "Aggregate", alert: "< 3.0x → 🔴", unit: "x" },
    { domain: "Integrated", name: "Net Margin", formula: "net_profit / gross_sales", type: "Aggregate", alert: "< 20% → 🟡", unit: "%" },
];

const DOMAIN_COLOR = { "Ad": "#f97316", "Market": "#ef4444", "UGC": "#a855f7", "Integrated": "#4f8ef7" };

/* ════════════════════════════════════════════════════
   TAB renderers
════════════════════════════════════════════════════ */
function SchemaTab() {
    const [domain, setDomain] = useState("ad");
    const [openSection, setOpenSection] = useState(null);
    const s = SCHEMAS[domain];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Domain selector */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(SCHEMAS).map(([k, v]) => (
                    <button key={k} onClick={() => { setDomain(k); setOpenSection(null); }} style={{
                        padding: "6px 16px", borderRadius: 8, border: "1px solid",
                        borderColor: domain === k ? v.color : "var(--border)",
                        background: domain === k ? v.color + "18" : "transparent",
                        color: domain === k ? v.color : "var(--text-3)", fontSize: 11, cursor: "pointer", fontWeight: 700,
                    }}>{v.label}</button>
                ))}
            </div>

            {/* Platform coverage */}
            <div style={{
                padding: "10px 16px", borderRadius: 10,
                background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)",
                display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap"
            }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>Platforms:</span>
                {s.platforms.map(p => <Tag key={p} label={p} color={s.color} />)}
            </div>

            <div style={{ fontSize: 12, color: "var(--text-2)", padding: "0 2px" }}>{s.desc}</div>

            {/* Sections (accordion) */}
            {s.sections.map((sec, si) => (
                <div key={si} className="card card-glass" style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${s.color}` }}>
                    <button onClick={() => setOpenSection(openSection === si ? null : si)} style={{
                        width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{sec.title}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "var(--text-3)" }}>{sec.fields.length} fields</span>
                            <span style={{ color: "var(--text-3)" }}>{openSection === si ? "▲" : "▼"}</span>
                        </div>
                    </button>
                    {openSection === si && (
                        <div style={{ padding: "0 18px 18px" }}>
                            <div style={{ overflowX: "auto" }}>
                                <table className="table" style={{ fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th>Field</th><th>Type</th><th style={{ textAlign: "center" }}>Required</th>
                                            <th>Description</th><th>Example</th><th>Tags</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sec.fields.map((f, fi) => <FieldRow key={fi} {...f} />)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function PipelineTab() {
    return (
        <div style={{ display: "grid", gap: 20 }}>
            {PIPELINE.map((p, pi) => (
                <div key={pi} className="card card-glass" style={{ padding: 20, borderLeft: `4px solid ${p.color}` }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: p.color }}>
                        {p.icon} {p.step}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                        {p.items.map((item, ii) => (
                            <div key={ii} style={{
                                padding: "12px 14px", borderRadius: 10,
                                background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.08)"
                            }}>
                                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{item.title}</div>
                                <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 8, lineHeight: 1.5 }}>{item.desc}</div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {item.tags.map(t => <Tag key={t} label={t} color={p.color} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {/* Flow diagram */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>🔄 Data Flow Summary</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, fontWeight: 700 }}>
                    {[
                        ["📡 Platform API", "#4f8ef7"], ["→", null],
                        ["⚙ Kafka/S3", "#6366f1"], ["→", null],
                        ["🔧 Normalize", "#a855f7"], ["→", null],
                        ["📊 BigQuery", "#22c55e"], ["→", null],
                        ["🚀 Recommend/Alert", "#f97316"],
                    ].map(([l, c], i) => c
                        ? <span key={i} style={{ padding: "5px 14px", borderRadius: 8, background: c + "18", color: c, border: `1px solid ${c}33` }}>{l}</span>
                        : <span key={i} style={{ color: "var(--text-3)", fontSize: 14 }}>{l}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricsTab() {
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {["Ad", "Market", "UGC", "Integrated"].map(d => (
                    <div key={d} className="card card-glass" style={{ padding: "12px 16px", borderLeft: `3px solid ${DOMAIN_COLOR[d]}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{d} Domain</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: DOMAIN_COLOR[d] }}>
                            {METRICS.filter(m => m.domain === d).length}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>defined metrics</div>
                    </div>
                ))}
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📐 Metrics Catalog</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr><th>Domain</th><th>Metric</th><th>Formula</th><th>Type</th><th>Unit</th><th>Alert Condition</th></tr>
                        </thead>
                        <tbody>
                            {METRICS.map((m, i) => (
                                <tr key={i}>
                                    <td><Tag label={m.domain} color={DOMAIN_COLOR[m.domain]} /></td>
                                    <td style={{ fontWeight: 800 }}>{m.name}</td>
                                    <td><Code>{m.formula}</Code></td>
                                    <td><Tag label={m.type} color={m.type === "Derived" ? "#6366f1" : "#14d9b0"} /></td>
                                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>{m.unit}</td>
                                    <td style={{ fontSize: 11, color: m.alert?.includes("🔴") ? "#ef4444" : m.alert?.includes("🟡") ? "#eab308" : "var(--text-3)" }}>
                                        {m.alert || "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function AlertTab() {
    const rules = [
        { priority: "P0", trigger: "ROAS < 2.0x (24h continuous)", action: "Auto-pause campaign + immediate Slack alert", channel: ["Slack", "In-app"], color: "#ef4444" },
        { priority: "P1", trigger: "ROAS < 3.0x", action: "Budget reallocation recommendation card", channel: ["In-app", "Email"], color: "#f97316" },
        { priority: "P1", trigger: "Return Rate > 12%", action: "Product ops action recommendation + MD email", channel: ["Email", "In-app"], color: "#f97316" },
        { priority: "P1", trigger: "Coupon Rate > 15%", action: "Coupon limit adjustment recommendation card", channel: ["In-app"], color: "#f97316" },
        { priority: "P1", trigger: "Settlement fee rate > 14%", action: "Channel mix rebalance recommendation", channel: ["In-app"], color: "#f97316" },
        { priority: "P1", trigger: "Overpayment detected", action: "Clawback workflow trigger + responsible party email", channel: ["Email", "In-app"], color: "#a855f7" },
        { priority: "P2", trigger: "Whitelist expiry D-30", action: "Renewal request email to creator", channel: ["Email"], color: "#eab308" },
        { priority: "P2", trigger: "Whitelist expiry D-7", action: "Urgent ad delivery review in-app banner", channel: ["In-app", "Slack"], color: "#eab308" },
        { priority: "P2", trigger: "Whitelist D-0 expired", action: "Auto-stop ad + 🔴 in-app warning", channel: ["In-app", "Slack", "Email"], color: "#ef4444" },
        { priority: "P2", trigger: "e-Sign pending > 7 days", action: "Auto-resend signature request", channel: ["Email"], color: "#eab308" },
        { priority: "P2", trigger: "Rights expiry D-30", action: "Auto contract draft + e-Sign link", channel: ["Email", "In-app"], color: "#eab308" },
        { priority: "P3", trigger: "Creator ROI < 10x", action: "Renewal review recommendation", channel: ["In-app"], color: "#22c55e" },
        { priority: "P3", trigger: "High views (200K+) & low orders (50-)", action: "Content/landing optimization recommendation", channel: ["In-app"], color: "#22c55e" },
        { priority: "P3", trigger: "Engagement ≥ 5% & orders ≥ 50", action: "Content repurposing candidate (ad/PDP)", channel: ["In-app"], color: "#22c55e" },
    ];
    const PCOLOR = { P0: "#ef4444", P1: "#f97316", P2: "#eab308", P3: "#22c55e" };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {["P0", "P1", "P2", "P3"].map(p => (
                    <div key={p} className="card card-glass" style={{ padding: "12px 16px", borderLeft: `3px solid ${PCOLOR[p]}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Priority {p}</div>
                        <div style={{ fontWeight: 900, fontSize: 22, color: PCOLOR[p] }}>{rules.filter(r => r.priority === p).length}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{p === "P0" ? "Auto-execute" : p === "P1" ? "Immediate action" : p === "P2" ? "Early warning" : "Optimization"}</div>
                    </div>
                ))}
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📋 Recommend/Alert Rule Catalog</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ fontSize: 11 }}>
                        <thead>
                            <tr><th>Priority</th><th>Trigger Condition</th><th>Action</th><th>Channel</th></tr>
                        </thead>
                        <tbody>
                            {rules.map((r, i) => (
                                <tr key={i}>
                                    <td><Tag label={r.priority} color={PCOLOR[r.priority]} /></td>
                                    <td style={{ fontWeight: 700, color: r.color }}>{r.trigger}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: 10 }}>{r.action}</td>
                                    <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                        {r.channel.map(c => <Tag key={c} label={c} color="#6366f1" />)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════ */
const TABS = [
    { id: "schema", label: "📋 Event Schema", desc: "Standard field specifications" },
    { id: "pipeline", label: "🔄 Collect→Normalize", desc: "Data pipeline" },
    { id: "metrics", label: "📐 Metrics Catalog", desc: "Formulas / thresholds" },
    { id: "alerts", label: "🚀 Recommend/Alert Rules", desc: "Automation triggers" },
];

export default function DataSchema() {
    const [tab, setTab] = useState("schema");
    const totalFields = Object.values(SCHEMAS).reduce((s, sc) => s + sc.sections.reduce((ss, sec) => ss + sec.fields.length, 0), 0);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(20,217,176,0.04))",
                borderColor: "rgba(99,102,241,0.15)"
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(20,217,176,0.1))" }}>📋</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#6366f1,#14d9b0)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                        }}>Data Product Spec</div>
                        <div className="hero-desc">
                            Standard event schema for domestic &amp; global platforms · Collect→Normalize→Metrics→Recommend/Alert pipeline specs
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    {[
                        ["Total Event Fields", totalFields, "#6366f1"],
                        ["Metric Definitions", METRICS.length, "#22c55e"],
                        ["Alert Rules", "14", "#f97316"],
                        ["Supported Platforms", "11", "#4f8ef7"],
                    ].map(([l, v, c]) => (
                        <div key={l} style={{
                            padding: "6px 14px", borderRadius: 8, background: c + "12",
                            border: `1px solid ${c}22`, fontSize: 11, color: c, fontWeight: 700
                        }}>{l}: {v}</div>
                    ))}
                </div>
            </div>

            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? "rgba(99,102,241,0.1)" : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? "#6366f1" : "transparent"}`, transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="card card-glass fade-up fade-up-2">
                {tab === "schema" && <SchemaTab />}
                {tab === "pipeline" && <PipelineTab />}
                {tab === "metrics" && <MetricsTab />}
                {tab === "alerts" && <AlertTab />}
            </div>
        </div>
    );
}
