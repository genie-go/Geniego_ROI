import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ─── Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const ch = [];
        try { const k = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]'); if (Array.isArray(k)) k.forEach(x => { if (x.service) ch.push(x.service.toLowerCase()); }); } catch {}
        ['meta','google','tiktok','kakao_moment','naver','coupang','amazon','shopify','gmarket','11st','line','whatsapp'].forEach(c => {
            try { if (localStorage.getItem(`geniego_channel_${c}`)) ch.push(c); } catch {}
        });
        return [...new Set(ch)];
    }, []);
}

/* ─── Security Engine ──────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };

function SecurityOverlay({ threats, onDismiss, t }) {
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('dataProduct.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('dataProduct.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}…
                </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                    ✕ {t('dataProduct.dismiss')}
                </button>
            </div>
    </div>
);
}

/* ── SCHEMA (System Spec — NOT mock data) ─── */
const buildSchema = (t) => [
    { domain: "common", field: "id", type: "INT", nullable: false, desc: "Event PK (Auto Increment)" },
    { domain: "common", field: "raw_event_id", type: "INT", nullable: true, desc: t('dataProduct.schemaRawEventId') },
    { domain: "common", field: "tenant_id", type: "VARCHAR(100)", nullable: false, desc: t('dataProduct.schemaTenantId') },
    { domain: "common", field: "event_date", type: "VARCHAR(10)", nullable: false, desc: t('dataProduct.schemaEventDate'), example: "2026-03-05" },
    { domain: "common", field: "event_type", type: "VARCHAR(100)", nullable: false, desc: t('dataProduct.schemaEventType'), example: "ad_conversion / order_placed / ugc_view" },
    { domain: "common", field: "domain", type: "VARCHAR(30)", nullable: false, desc: t('dataProduct.schemaDomain'), example: "ad / market / influencer" },
    { domain: "common", field: "currency", type: "VARCHAR(10)", nullable: false, desc: t('dataProduct.schemaCurrency'), example: "KRW / USD / JPY" },
    { domain: "common", field: "region", type: "VARCHAR(10)", nullable: true, desc: t('dataProduct.schemaRegion'), example: "KR / US / JP" },
    { domain: "common", field: "normalized_at", type: "VARCHAR(32)", nullable: false, desc: t('dataProduct.schemaNormalizedAt') },
    { domain: "common", field: "normalizer_version", type: "VARCHAR(50)", nullable: true, desc: t('dataProduct.schemaNormalizerVer'), example: "v423_rule_v1" },
    { domain: "common", field: "extra_json", type: "MEDIUMTEXT", nullable: true, desc: t('dataProduct.schemaExtraJson') },
    { domain: "ad", field: "vendor", type: "VARCHAR(100)", nullable: true, desc: t('dataProduct.schemaVendor'), example: "meta / tiktok / google / kakao / naver / coupang_ads" },
    { domain: "ad", field: "account_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaAccountId') },
    { domain: "ad", field: "campaign_id", type: "VARCHAR(255)", nullable: true, desc: "Campaign ID" },
    { domain: "ad", field: "campaign_name", type: "VARCHAR(500)", nullable: true, desc: "Campaign Name" },
    { domain: "ad", field: "adset_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaAdsetId') },
    { domain: "ad", field: "adset_name", type: "VARCHAR(500)", nullable: true, desc: t('dataProduct.schemaAdsetName') },
    { domain: "ad", field: "ad_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaAdId') },
    { domain: "ad", field: "creative_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaCreativeId') },
    { domain: "ad", field: "creative_type", type: "VARCHAR(50)", nullable: true, desc: t('dataProduct.schemaCreativeType'), example: "image / video / carousel / collection" },
    { domain: "ad", field: "keyword", type: "VARCHAR(500)", nullable: true, desc: t('dataProduct.schemaKeyword') },
    { domain: "ad", field: "match_type", type: "VARCHAR(20)", nullable: true, desc: t('dataProduct.schemaMatchType'), example: "broad / phrase / exact" },
    { domain: "ad", field: "audience_segment", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaAudienceSeg'), example: "lookalike_2pct / retargeting_7d" },
    { domain: "ad", field: "impressions", type: "INT", nullable: true, desc: t('dataProduct.schemaImpressions') },
    { domain: "ad", field: "clicks", type: "INT", nullable: true, desc: t('dataProduct.schemaClicks') },
    { domain: "ad", field: "spend", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaSpend') },
    { domain: "ad", field: "conversions", type: "INT", nullable: true, desc: t('dataProduct.schemaConversions') },
    { domain: "ad", field: "attributed_revenue", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaAttrRevenue') },
    { domain: "market", field: "channel", type: "VARCHAR(100)", nullable: true, desc: t('dataProduct.schemaChannel'), example: "coupang / naver_store / amazon / shopify" },
    { domain: "market", field: "order_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaOrderId') },
    { domain: "market", field: "sku", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaSku') },
    { domain: "market", field: "product_title", type: "VARCHAR(500)", nullable: true, desc: t('dataProduct.schemaProductTitle') },
    { domain: "market", field: "qty", type: "INT", nullable: true, desc: t('dataProduct.schemaQty') },
    { domain: "market", field: "gross_sales", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaGrossSales') },
    { domain: "market", field: "platform_fee", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaPlatformFee') },
    { domain: "market", field: "ad_fee", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaAdFee') },
    { domain: "market", field: "shipping_fee", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaShippingFee') },
    { domain: "market", field: "return_fee", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaReturnFee') },
    { domain: "market", field: "coupon_discount", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaCouponDiscount') },
    { domain: "market", field: "point_discount", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaPointDiscount') },
    { domain: "market", field: "net_payout", type: "DOUBLE", nullable: true, desc: t('dataProduct.schemaNetPayout') },
    { domain: "market", field: "is_return", type: "TINYINT(1)", nullable: true, desc: t('dataProduct.schemaIsReturn'), example: "0 / 1" },
    { domain: "ugc", field: "creator_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaCreatorId') },
    { domain: "ugc", field: "creator_handle", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaCreatorHandle'), example: "@techvibe_kr" },
    { domain: "ugc", field: "ugc_content_id", type: "VARCHAR(255)", nullable: true, desc: t('dataProduct.schemaUgcContentId') },
    { domain: "ugc", field: "ugc_platform", type: "VARCHAR(50)", nullable: true, desc: t('dataProduct.schemaUgcPlatform'), example: "tiktok / instagram / youtube / naver_blog" },
    { domain: "ugc", field: "ugc_rights_status", type: "VARCHAR(50)", nullable: true, desc: t('dataProduct.schemaUgcRights'), example: "pending / granted / expired / revoked" },
    { domain: "ugc", field: "ugc_whitelist_status", type: "VARCHAR(50)", nullable: true, desc: t('dataProduct.schemaWhitelist'), example: "whitelisted / not_whitelisted / pending" },
    { domain: "ugc", field: "ugc_branded_content", type: "TINYINT(1)", nullable: true, desc: t('dataProduct.schemaBranded'), example: "0 / 1" },
    { domain: "ugc", field: "impressions", type: "INT", nullable: true, desc: t('dataProduct.schemaUgcImpressions') },
];

const PLATFORM_MAPPING = [
    { platform: "Meta (Facebook/Instagram)", region: "Global", type: "Ads", color: "#1877f2", fields: [{ raw: "insights.campaign_id", std: "campaign_id" }, { raw: "insights.adset_id", std: "adset_id" }, { raw: "insights.impressions", std: "impressions" }, { raw: "insights.clicks", std: "clicks" }, { raw: "insights.spend", std: "spend" }, { raw: "actions[purchase]", std: "conversions" }, { raw: "action_values[purchase]", std: "attributed_revenue" }] },
    { platform: "TikTok Business", region: "Global", type: "Ads/UGC", color: "#010101", fields: [{ raw: "campaign_id", std: "campaign_id" }, { raw: "adgroup_id", std: "adset_id" }, { raw: "metrics.impressions", std: "impressions" }, { raw: "metrics.clicks", std: "clicks" }, { raw: "metrics.spend", std: "spend" }, { raw: "metrics.purchase", std: "conversions" }, { raw: "video_id", std: "ugc_content_id" }] },
    { platform: "Google Ads", region: "Global", type: "Ads", color: "#4285f4", fields: [{ raw: "campaign.id", std: "campaign_id" }, { raw: "adGroup.id", std: "adset_id" }, { raw: "segments.keyword", std: "keyword" }, { raw: "metrics.impressions", std: "impressions" }, { raw: "metrics.clicks", std: "clicks" }, { raw: "metrics.costMicros/1e6", std: "spend" }, { raw: "metrics.conversions", std: "conversions" }] },
    { platform: "Kakao Moment", region: "Domestic", type: "Ads", color: "#fee500", fields: [{ raw: "campaignId", std: "campaign_id" }, { raw: "adGroupId", std: "adset_id" }, { raw: "imp", std: "impressions" }, { raw: "click", std: "clicks" }, { raw: "cost", std: "spend" }, { raw: "conv1d", std: "conversions" }] },
    { platform: "Naver SearchAds/GFA", region: "Domestic", type: "Ads", color: "#03c75a", fields: [{ raw: "campaignId", std: "campaign_id" }, { raw: "adGroupId", std: "adset_id" }, { raw: "keyword", std: "keyword" }, { raw: "impCount", std: "impressions" }, { raw: "clkCount", std: "clicks" }, { raw: "salesAmt", std: "spend" }] },
    { platform: "Coupang Ads", region: "Domestic", type: "Ads", color: "#e8003d", fields: [{ raw: "campaignId", std: "campaign_id" }, { raw: "keyword", std: "keyword" }, { raw: "impression", std: "impressions" }, { raw: "click", std: "clicks" }, { raw: "cost", std: "spend" }, { raw: "orders", std: "conversions" }] },
    { platform: "Coupang Partners", region: "Domestic", type: "Market", color: "#e8003d", fields: [{ raw: "totalSales", std: "gross_sales" }, { raw: "platformFee", std: "platform_fee" }, { raw: "adFee", std: "ad_fee" }, { raw: "netPayout", std: "net_payout" }, { raw: "orderId", std: "order_id" }, { raw: "sku", std: "sku" }, { raw: "isReturn", std: "is_return" }] },
    { platform: "Naver Smart Store", region: "Domestic", type: "Market", color: "#03c75a", fields: [{ raw: "productOrderId", std: "order_id" }, { raw: "salesAmount", std: "gross_sales" }, { raw: "commissionAmount", std: "platform_fee" }, { raw: "discountAmount", std: "coupon_discount" }, { raw: "paymentAmount", std: "net_payout" }, { raw: "claimType=RETURN", std: "is_return=1" }] },
    { platform: "Amazon SP-API", region: "Global", type: "Market", color: "#ff9900", fields: [{ raw: "AmazonOrderId", std: "order_id" }, { raw: "ASIN", std: "sku" }, { raw: "OrderTotal.Amount", std: "gross_sales" }, { raw: "CurrencyCode", std: "currency" }, { raw: "OrderStatus=Returned", std: "is_return=1" }] },
    { platform: "TikTok Creator Marketplace", region: "Global", type: "UGC", color: "#010101", fields: [{ raw: "creator_id", std: "creator_id" }, { raw: "handle", std: "creator_handle" }, { raw: "video_id", std: "ugc_content_id" }, { raw: "ugc_rights_expires", std: "ugc_rights_status" }, { raw: "whitelist_status", std: "ugc_whitelist_status" }, { raw: "metrics.views", std: "impressions" }] },
];

const buildMetrics = (t) => [
    { group: "adsEfficiency", name: "CTR", formula: "clicks / impressions × 100", unit: "%", desc: t('dataProduct.metricCTR'), domain: "ad", threshold: "< 1% / < 0.5%" },
    { group: "adsEfficiency", name: "CPC", formula: "spend / clicks", unit: t('dataProduct.unitCurrency'), desc: t('dataProduct.metricCPC'), domain: "ad" },
    { group: "adsEfficiency", name: "CPM", formula: "spend / impressions × 1000", unit: t('dataProduct.unitCurrency'), desc: t('dataProduct.metricCPM'), domain: "ad" },
    { group: "adsEfficiency", name: "ROAS", formula: "attributed_revenue / spend", unit: "x", desc: t('dataProduct.metricROAS'), domain: "ad", threshold: "< 2.0 / < 1.5" },
    { group: "adsEfficiency", name: "CVR", formula: "conversions / clicks × 100", unit: "%", desc: t('dataProduct.metricCVR'), domain: "ad" },
    { group: "adsEfficiency", name: "CPA", formula: "spend / conversions", unit: t('dataProduct.unitCurrency'), desc: t('dataProduct.metricCPA'), domain: "ad" },
    { group: "marketProfit", name: "Net Margin", formula: "net_payout / gross_sales × 100", unit: "%", desc: t('dataProduct.metricNetMargin'), domain: "market", threshold: "< 15%" },
    { group: "marketProfit", name: "Fee Rate", formula: "(platform_fee + ad_fee) / gross_sales × 100", unit: "%", desc: t('dataProduct.metricFeeRate'), domain: "market" },
    { group: "marketProfit", name: "Return Rate", formula: "SUM(is_return=1) / COUNT(*) × 100", unit: "%", desc: t('dataProduct.metricReturnRate'), domain: "market", threshold: "> 10% / > 20%" },
    { group: "marketProfit", name: "AOV", formula: "SUM(gross_sales) / COUNT(DISTINCT order_id)", unit: t('dataProduct.unitCurrency'), desc: t('dataProduct.metricAOV'), domain: "market" },
    { group: "marketProfit", name: "Settlement GAP", formula: "expected - actual", unit: t('dataProduct.unitCurrency'), desc: t('dataProduct.metricSettlementGap'), domain: "market", threshold: "> KRW 100,000" },
    { group: "ugcPerf", name: "Engagement Rate", formula: "(likes+comments+shares)/impressions×100", unit: "%", desc: t('dataProduct.metricEngagement'), domain: "ugc" },
    { group: "ugcPerf", name: "Rights Coverage", formula: "granted / total × 100", unit: "%", desc: t('dataProduct.metricRights'), domain: "ugc", threshold: "< 80%" },
    { group: "ugcPerf", name: "Whitelist Rate", formula: "whitelisted / eligible × 100", unit: "%", desc: t('dataProduct.metricWhitelist'), domain: "ugc" },
    { group: "ugcPerf", name: "Branded Disclosure", formula: "branded / paid_collab × 100", unit: "%", desc: t('dataProduct.metricBranded'), domain: "ugc", threshold: "< 100%" },
    { group: "unifiedPnl", name: "Blended ROAS", formula: "attributed_revenue / (spend + ad_fee)", unit: "x", desc: t('dataProduct.metricBlendedRoas'), domain: "unified" },
    { group: "unifiedPnl", name: "True ROAS", formula: "net_payout / (spend + fees)", unit: "x", desc: t('dataProduct.metricTrueRoas'), domain: "unified" },
    { group: "unifiedPnl", name: "EBITDA Contribution", formula: "net_payout - spend - creator_cost - logistics", unit: t('dataProduct.unitCurrency'), desc: t('dataProduct.metricEbitda'), domain: "unified" },
];

const buildRules = (t) => [
    { id: "R001", severity: "danger", domain: "ad", trigger: "ROAS < 1.5 (48h)", title: t('dataProduct.ruleR001Title'), desc: t('dataProduct.ruleR001Desc'), actions: [t('dataProduct.ruleR001A1'), t('dataProduct.ruleR001A2'), t('dataProduct.ruleR001A3')], pipeline: "normalized_activity_event → Metrics Engine → alert_instance" },
    { id: "R002", severity: "warning", domain: "ad", trigger: "CTR < 0.5% (7d MA)", title: t('dataProduct.ruleR002Title'), desc: t('dataProduct.ruleR002Desc'), actions: [t('dataProduct.ruleR002A1'), t('dataProduct.ruleR002A2')], pipeline: "normalized_activity_event → CTR MA7 → creative_fatigue_alert" },
    { id: "R003", severity: "warning", domain: "market", trigger: "Return Rate > 15% (7d)", title: t('dataProduct.ruleR003Title'), desc: t('dataProduct.ruleR003Desc'), actions: [t('dataProduct.ruleR003A1'), t('dataProduct.ruleR003A2'), t('dataProduct.ruleR003A3')], pipeline: "normalized_activity_event → return_rate → kr_recon_ticket" },
    { id: "R004", severity: "danger", domain: "market", trigger: "Settlement GAP > KRW 100,000", title: t('dataProduct.ruleR004Title'), desc: t('dataProduct.ruleR004Desc'), actions: [t('dataProduct.ruleR004A1'), t('dataProduct.ruleR004A2')], pipeline: "kr_settlement → recon_engine → kr_recon_ticket" },
    { id: "R005", severity: "danger", domain: "ugc", trigger: "branded_content = 0 AND paid", title: t('dataProduct.ruleR005Title'), desc: t('dataProduct.ruleR005Desc'), actions: [t('dataProduct.ruleR005A1'), t('dataProduct.ruleR005A2'), t('dataProduct.ruleR005A3')], pipeline: "normalized_activity_event → compliance_check → urgent_alert" },
    { id: "R006", severity: "warning", domain: "ugc", trigger: "rights = expired OR whitelist = revoked", title: t('dataProduct.ruleR006Title'), desc: t('dataProduct.ruleR006Desc'), actions: [t('dataProduct.ruleR006A1'), t('dataProduct.ruleR006A2'), t('dataProduct.ruleR006A3')], pipeline: "ugc_event → rights_monitor → action_request" },
    { id: "R007", severity: "info", domain: "unified", trigger: "SKU Blended ROAS < avg × 0.7", title: t('dataProduct.ruleR007Title'), desc: t('dataProduct.ruleR007Desc'), actions: [t('dataProduct.ruleR007A1'), t('dataProduct.ruleR007A2')], pipeline: "normalized_activity_event → blended_ROAS → recommendation" },
];

const C = {
    ad: { bg: "rgba(79,142,247,0.08)", border: "rgba(79,142,247,0.25)", text: "#4f8ef7", label: "🔵 Ads" },
    market: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", text: "#22c55e", label: "🟢 Market" },
    ugc: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", text: "#a855f7", label: "🟣 UGC" },
    common: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "#94a3b8", label: "⚪ Common" },
    unified: { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)", text: "#ec4899", label: "🔴 Unified" },
};

function PipelineStep({ icon, title, sub, color, arrow }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 4, padding: "14px 18px", borderRadius: 12, minWidth: 140, textAlign: "center", background: `${color}10`, border: `1.5px solid ${color}40` }}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: 11, color }}>{title}</div>
                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{sub}</div>
            {arrow && <div style={{ fontSize: 18, color: "var(--text-3)", fontWeight: 900 }}>→</div>}
        </div>
    </div>
);
}

/* ═══ Guide Tab ═══ */
function GuideTab({ t }) {
    const steps = [
        { icon: '1️⃣', title: t('dataProduct.guideStep1Title'), desc: t('dataProduct.guideStep1Desc'), color: '#4f8ef7' },
        { icon: '2️⃣', title: t('dataProduct.guideStep2Title'), desc: t('dataProduct.guideStep2Desc'), color: '#22c55e' },
        { icon: '3️⃣', title: t('dataProduct.guideStep3Title'), desc: t('dataProduct.guideStep3Desc'), color: '#eab308' },
        { icon: '4️⃣', title: t('dataProduct.guideStep4Title'), desc: t('dataProduct.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('dataProduct.guideStep5Title'), desc: t('dataProduct.guideStep5Desc'), color: '#f97316' },
        { icon: '6️⃣', title: t('dataProduct.guideStep6Title'), desc: t('dataProduct.guideStep6Desc'), color: '#06b6d4' },
    ];
    const sections = [
        { icon: '🔄', name: t('dataProduct.tabOverview'), desc: t('dataProduct.guideSecOverview') },
        { icon: '📋', name: t('dataProduct.tabSchema'), desc: t('dataProduct.guideSecSchema') },
        { icon: '🌐', name: t('dataProduct.tabPlatform'), desc: t('dataProduct.guideSecPlatform') },
        { icon: '📊', name: t('dataProduct.tabMetrics'), desc: t('dataProduct.guideSecMetrics') },
        { icon: '🔔', name: t('dataProduct.tabRules'), desc: t('dataProduct.guideSecRules') },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))', border: '1px solid rgba(79,142,247,0.25)', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>🗂</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('dataProduct.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 520, margin: '6px auto 0' }}>{t('dataProduct.guideSub')}</div>
            </div>
            <div style={{ borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('dataProduct.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('dataProduct.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {sections.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{n.name}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{n.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ borderRadius: 16, border: '1px solid rgba(34,197,94,0.2)', padding: 20, background: 'rgba(34,197,94,0.04)' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('dataProduct.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('dataProduct.guideTip1')}</li>
                    <li>{t('dataProduct.guideTip2')}</li>
                    <li>{t('dataProduct.guideTip3')}</li>
                    <li>{t('dataProduct.guideTip4')}</li>
                    <li>{t('dataProduct.guideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ═══ MAIN ═══ */
export default function DataProduct() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { addAlert } = useGlobalData();
    const [tab, setTab] = useState("overview");
    const [domainFilter, setDomainFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [platType, setPlatType] = useState("all");
    const [threats, setThreats] = useState([]);
    const connectedChannels = useConnectedChannels();
    const { connectedCount = 0 } = useConnectorSync?.() || {};
    const bcRef = useRef(null);

    const [syncTick, setSyncTick] = useState(0);
    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return;
        const ch1 = new BroadcastChannel("genie_dp_sync");
        const ch2 = new BroadcastChannel("genie_connector_sync");
        const ch3 = new BroadcastChannel("genie_product_sync");
        const handler = () => setSyncTick(p => p + 1);
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (["CHANNEL_REGISTERED","CHANNEL_REMOVED"].includes(e.data?.type)) handler(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); };
    }, []);
    useEffect(() => {
        const id = setInterval(() => { setSyncTick(p => p + 1); try { bcRef.current?.postMessage({ type: "DP_UPDATE", ts: Date.now() }); } catch {} }, 30000);
        return () => clearInterval(id);
    }, []);

    const safeguard = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            setThreats(prev => [...prev, { type: threat, value, field: fieldName }]);
            try { addAlert({ id: `sec_dp_${Date.now()}`, type: "security", severity: "critical", title: `🚨 [DataProduct] ${threat}`, body: `"${fieldName}": ${value.slice(0, 50)}`, timestamp: new Date().toISOString(), read: false }); } catch (_) {}
            return "";
        }
        return value;
    }, [addAlert]);

    const SCHEMA = useMemo(() => buildSchema(t), [t]);
    const METRICS = useMemo(() => buildMetrics(t), [t]);
    const RULES = useMemo(() => buildRules(t), [t]);

    const handleExport = () => {
        const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), schema: SCHEMA, metrics: METRICS, rules: RULES, platforms: PLATFORM_MAPPING }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `data_product_spec_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    };

    const TABS = [
        { id: "overview", icon: "🔄", label: t("dataProduct.tabOverview"), desc: t("dataProduct.tabOverviewDesc") },
        { id: "schema", icon: "📋", label: t("dataProduct.tabSchema"), desc: t("dataProduct.tabSchemaDesc") },
        { id: "platform", icon: "🌐", label: t("dataProduct.tabPlatform"), desc: t("dataProduct.tabPlatformDesc") },
        { id: "metrics", icon: "📊", label: t("dataProduct.tabMetrics"), desc: t("dataProduct.tabMetricsDesc") },
        { id: "rules", icon: "🔔", label: t("dataProduct.tabRules"), desc: t("dataProduct.tabRulesDesc") },
        { id: "guide", icon: "📖", label: t("dataProduct.tabGuide"), desc: t("dataProduct.tabGuideDesc") },
    ];

    const METRIC_GROUPS = [
        { key: "adsEfficiency", label: t("dataProduct.groupAdsEfficiency") },
        { key: "marketProfit", label: t("dataProduct.groupMarketProfit") },
        { key: "ugcPerf", label: t("dataProduct.groupUgcPerf") },
        { key: "unifiedPnl", label: t("dataProduct.groupUnifiedPnl") },
    ];

    const filteredSchema = useMemo(() => SCHEMA.filter(f => {
        const matchDomain = domainFilter === "all" || f.domain === domainFilter;
        const q = safeguard(search.toLowerCase(), "search");
        const matchSearch = !q || f.field.includes(q) || f.desc.toLowerCase().includes(q) || (f.example || "").toLowerCase().includes(q);
        return matchDomain && matchSearch;
    }), [domainFilter, search, SCHEMA]);

    const filteredPlatforms = useMemo(() =>
        PLATFORM_MAPPING.filter(p => platType === "all" || p.type.includes(platType)), [platType]);

    return (
        <div style={{ display: "flex", flexDirection: "column", margin: "-14px -16px -20px", height: "calc(100vh - 52px)", overflow: "hidden" }}>
            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} t={t} />

            {/* ─── Sticky Header ─── */}
            <div style={{ flexShrink: 0, padding: "14px 16px 0", background: "var(--surface-1, #070f1a)", zIndex: 10, borderBottom: "1px solid rgba(99,140,255,0.06)" }}>
                <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.05),rgba(168,85,247,0.04))", borderColor: "rgba(79,142,247,0.15)", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div className="hero-meta">
                            <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.2),rgba(168,85,247,0.15))" }}>🗂</div>
                            <div>
                                <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)" }}>{t("dataProduct.heroTitle")}</div>
                                <div className="hero-desc">{t("dataProduct.heroDesc")}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#22c55e" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} /> {t("dataProduct.realtimeSync")}
                            </div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: threats.length > 0 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${threats.length > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)"}`, color: threats.length > 0 ? "#ef4444" : "#22c55e" }}>
                                {threats.length > 0 ? "🔴" : "🟢"} {t("dataProduct.securityNormal")}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                        {[
                            { v: `${SCHEMA.length}`, l: t("dataProduct.badgeFields") },
                            { v: `${PLATFORM_MAPPING.length}`, l: t("dataProduct.badgePlatforms") },
                            { v: `${METRICS.length}`, l: t("dataProduct.badgeMetrics") },
                            { v: `${RULES.length}`, l: t("dataProduct.badgeRules") },
                        ].map(k => (
                            <div key={k.l} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)" }}>
                                <span style={{ fontWeight: 900, fontSize: 14, color: "#4f8ef7" }}>{k.v}</span>
                                <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: 5 }}>{k.l}</span>
                            </div>
                        ))}
                        {connectedChannels.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#a855f718", color: "#a855f7", border: "1px solid #a855f733" }}>🔗 {connectedChannels.length} {t("dataProduct.channelsLinked")}</span>}
                        <button onClick={handleExport} style={{ marginLeft: "auto", fontSize: 10, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#22c55e", cursor: "pointer", fontWeight: 700 }}>📥 {t("dataProduct.export")}</button>
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: "flex", gap: 2, background: "var(--surface)", padding: "4px 4px 0", borderRadius: "12px 12px 0 0", border: "1px solid rgba(99,140,255,0.06)", borderBottom: "none" }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                            flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", textAlign: "center", borderRadius: "8px 8px 0 0",
                            background: tab === tb.id ? "rgba(79,142,247,0.08)" : "transparent",
                            borderBottom: `2px solid ${tab === tb.id ? "#4f8ef7" : "transparent"}`, transition: "all 200ms" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: tab === tb.id ? "var(--text-1)" : "var(--text-2)" }}>{tb.icon} {tb.label}</div>
                            <div style={{ fontSize: 8, color: "var(--text-3)", marginTop: 2 }}>{tb.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
            {/* ─── Scrollable Content ─── */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px", paddingBottom: 80 }}>
                {/* ── Tab: Overview ── */}
                {tab === "overview" && (
                    <div style={{ display: "grid", gap: 16 }}>
                        <div className="card card-glass fade-up" style={{ padding: 24 }}>
                            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>🔄 {t("dataProduct.pipelineTitle")}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 20 }}>{t("dataProduct.pipelineDesc")}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                <PipelineStep icon="📡" title={t("dataProduct.pipeCollect")} sub="webhook/polling/API" color="#4f8ef7" arrow />
                                <PipelineStep icon="📦" title={t("dataProduct.pipeRawEvent")} sub="raw_vendor_event" color="#6366f1" arrow />
                                <PipelineStep icon="⚙️" title={t("dataProduct.pipeNormalize")} sub="v423_rule_v1" color="#8b5cf6" arrow />
                                <PipelineStep icon="✅" title={t("dataProduct.pipeStdEvent")} sub="normalized_activity_event" color="#a855f7" arrow />
                                <PipelineStep icon="📊" title={t("dataProduct.pipeMetric")} sub="Metrics Engine" color="#ec4899" arrow />
                                <PipelineStep icon="🔔" title={t("dataProduct.pipeNotify")} sub="alert_instance" color="#ef4444" />
                            </div>
                        </div>

                        <div className="card card-glass fade-up" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 14 }}>🌐 {t("dataProduct.coverageTitle")}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                                {[
                                    { region: t("dataProduct.regionDomAds"), platforms: ["Kakao Moment", "Naver SearchAds", "Naver GFA", "Coupang Ads", "11st Ads"], color: "#22c55e" },
                                    { region: t("dataProduct.regionGblAds"), platforms: ["Meta (FB/IG)", "TikTok Business", "Google Ads", "Snapchat", "Pinterest"], color: "#4f8ef7" },
                                    { region: t("dataProduct.regionDomMkt"), platforms: ["Coupang Partners", "Naver Smart Store", "11Street", "Gmarket", "SSG"], color: "#f59e0b" },
                                    { region: t("dataProduct.regionGblMkt"), platforms: ["Amazon SP-API", "Shopify", "Lazada", "Rakuten"], color: "#f97316" },
                                    { region: t("dataProduct.regionDomUgc"), platforms: [t("dataProduct.naverBlog"), t("dataProduct.kakaoStory"), t("dataProduct.youtubeKr"), t("dataProduct.instagramKr")], color: "#a855f7" },
                                    { region: t("dataProduct.regionGblUgc"), platforms: ["TikTok Creator", "Instagram Global", "YouTube Global"], color: "#ec4899" },
                                ].map(g => (
                                    <div key={g.region} style={{ padding: 12, borderRadius: 10, background: `${g.color}07`, border: `1px solid ${g.color}25` }}>
                                        <div style={{ fontWeight: 800, fontSize: 10, color: g.color, marginBottom: 8 }}>{g.region}</div>
                                        {g.platforms.map(p => (
                                            <div key={p} style={{ fontSize: 9, color: g.color, marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }} ><span>▪</span>{p}</div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                            {Object.entries(C).filter(([k]) => k !== "common" && k !== "unified").map(([k, v]) => (
                                <div key={k} style={{ padding: 16, borderRadius: 12, background: v.bg, border: `1px solid ${v.border}` }}>
                                    <div style={{ fontWeight: 900, fontSize: 12, color: v.text, marginBottom: 8 }}>{v.label} {t("dataProduct.domainLabel")}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                                        {SCHEMA.filter(f => f.domain === k).length} {t("dataProduct.stdFields")} · {METRICS.filter(m => m.domain === k).length} {t("dataProduct.derivedMetrics")} · {RULES.filter(r => r.domain === k || r.domain === "unified").length} {t("dataProduct.notifRules")}
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
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("dataProduct.searchField")}
                                style={{ flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: '#fff', fontSize: 11, outline: "none" }} />
                            {["all", "common", "ad", "market", "ugc"].map(d => (
                                <button key={d} onClick={() => setDomainFilter(d)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", borderColor: domainFilter === d ? (C[d] || C.common).text : "var(--border)", background: domainFilter === d ? (C[d] || C.common).bg : "transparent", color: domainFilter === d ? (C[d] || C.common).text : "var(--text-3)", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                                    {d === "all" ? t("dataProduct.filterAll") : d === "common" ? "Common" : d === "ad" ? "Ads" : d === "market" ? "Market" : "UGC"}
                                    <span style={{ marginLeft: 4, opacity: .6 }}>({d === "all" ? SCHEMA.length : SCHEMA.filter(f => f.domain === d).length})</span>
                                </button>
                            ))}
                        </div>
                        <div className="card card-glass" style={{ padding: 0, overflow: "hidden" }}>
                            <table className="table" style={{ fontSize: 10, width: "100%" }}>
                                <thead><tr><th>{t("dataProduct.colDomain")}</th><th>{t("dataProduct.colFieldName")}</th><th>{t("dataProduct.colType")}</th><th>{t("dataProduct.colNullable")}</th><th>{t("dataProduct.colDescription")}</th><th>{t("dataProduct.colExample")}</th></tr></thead>
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
                        <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "right" }}>{filteredSchema.length} / {SCHEMA.length} {t("dataProduct.fieldsShown")}</div>
                    </div>
                )}

                {/* ── Tab: Platform ── */}
                {tab === "platform" && (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                            {["all", "Ads", "Market", "UGC"].map(tp => (
                                <button key={tp} onClick={() => setPlatType(tp === "all" ? "all" : tp)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: platType === (tp === "all" ? "all" : tp) ? "rgba(79,142,247,0.1)" : "transparent", color: platType === (tp === "all" ? "all" : tp) ? "#4f8ef7" : "var(--text-3)", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>{tp === "all" ? t("dataProduct.allPlatforms") : tp}</button>
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
                                        <thead><tr>
                                            <th style={{ fontSize: 9, textAlign: "left", padding: "3px 6px", color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.1)" }}>{t("dataProduct.rawField")}</th>
                                            <th style={{ fontSize: 9, textAlign: "left", padding: "3px 6px", color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.1)" }}>{t("dataProduct.stdField")}</th>
                                        </tr></thead>
                                        <tbody>{p.fields.map(f => (
                                            <tr key={f.raw}>
                                                <td style={{ fontSize: 9, padding: "3px 6px", color: "#f59e0b", fontFamily: "monospace" }}>{f.raw}</td>
                                                <td style={{ fontSize: 9, padding: "3px 6px", color: "#4f8ef7", fontFamily: "monospace" }}>{f.std}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tab: Metrics ── */}
                {tab === "metrics" && (
                    <div style={{ display: "grid", gap: 12 }}>
                        {METRIC_GROUPS.map(grp => (
                            <div key={grp.key} className="card card-glass fade-up" style={{ padding: 16 }}>
                                <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 12 }}>{grp.label}</div>
                                <table className="table" style={{ fontSize: 10, width: "100%" }}>
                                    <thead><tr><th style={{ textAlign: "left" }} >{t("dataProduct.colMetricName")}</th><th>{t("dataProduct.colFormula")}</th><th>{t("dataProduct.colUnit")}</th><th>{t("dataProduct.colDescription")}</th><th>{t("dataProduct.colThreshold")}</th></tr></thead>
                                    <tbody>
                                        {METRICS.filter(m => m.group === grp.key).map(m => (
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
                                                <strong>{t("dataProduct.trigger")}:</strong> {r.trigger}
                                            </div>
                                            <div style={{ display: "grid", gap: 4 }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)" }}>{t("dataProduct.autoAction")}:</div>
                                                {r.actions.map((a, i) => (
                                                    <div key={i} style={{ fontSize: 10, display: "flex", gap: 6, alignItems: "center" }}>
                                                        <span style={{ color: sev[0], fontWeight: 700 }}>→</span>
                                                        <span style={{ color: "var(--text-2)" }}>{a}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: 10, fontSize: 9, color: "var(--text-3)", borderTop: "1px solid rgba(99,140,255,0.08)", paddingTop: 8, fontFamily: "monospace" }}>{r.pipeline}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Tab: Guide ── */}
                {tab === "guide" && <GuideTab t={t} />}
            </div>
            <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
        </div>
    );
}

