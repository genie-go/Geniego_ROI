import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ═══════════════════════════════════════════════════
   SECURITY — Enterprise Superium v5.0
   ═══════════════════════════════════════════════════ */
const THREAT_PATTERNS = [
  { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
  { re: /on\w+\s*=/i, type: 'XSS' }, { re: /eval\s*\(/i, type: 'XSS' },
  { re: /union\s+select/i, type: 'SQL_INJECT' }, { re: /drop\s+table/i, type: 'SQL_INJECT' },
  { re: /;\s*delete\s+from/i, type: 'SQL_INJECT' }, { re: /or\s+1\s*=\s*1/i, type: 'SQL_INJECT' },
  { re: /__proto__/i, type: 'PROTO_POLLUTION' },
  { re: /fetch\s*\(\s*['"]http/i, type: 'DATA_EXFIL' },
  { re: /Function\s*\(/i, type: 'CODE_INJECT' },
];
function useSecurityGuard(addAlert) {
  const [locked, setLocked] = useState(null);
  const inputLog = useRef([]);
  useEffect(() => {
    const onInput = (e) => {
      const val = e.target?.value || '';
      if (val.length < 3) return;
      const now = Date.now();
      inputLog.current.push(now);
      inputLog.current = inputLog.current.filter(t => now - t < 3000);
      if (inputLog.current.length > 20) { setLocked('BRUTE_FORCE'); try { addAlert?.({ type: 'error', msg: '[DataSchema] Brute-force blocked' }); } catch (_) {} e.target.value = ''; return; }
      for (const p of THREAT_PATTERNS) { if (p.re.test(val)) { setLocked(p.type + ': ' + val.slice(0, 60)); try { addAlert?.({ type: 'error', msg: '[DataSchema] ' + p.type + ' blocked' }); } catch (_) {} e.target.value = ''; return; } }
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, [addAlert]);
  return { locked, setLocked };
}
function SecurityOverlay({ reason, onUnlock, t }) {
  const [code, setCode] = useState('');
  if (!reason) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.95)', backdropFilter: 'blur(20px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#128737;&#65039;</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('ds.secTitle')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('ds.secCode')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: '#fff', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>{t('ds.secUnlock')}</button>
        </div>
    </div>
);
}

/* ─── Shared Components ────────────────────────────── */
const Tag = ({ label, color = "#4f8ef7" }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
);
const Code = ({ children }) => (
  <code style={{ fontFamily: "monospace", fontSize: 10, color: "#14d9b0", background: "rgba(20,217,176,0.08)", padding: "1px 5px", borderRadius: 4 }}>{children}</code>
);
const FieldRow = ({ name, type, required, desc, example, tags = [] }) => (
  <tr>
    <td><Code>{name}</Code></td>
    <td><Tag label={type} color={type === "string" ? "#4f8ef7" : type === "number" ? "#f97316" : type === "boolean" ? "#a855f7" : type === "timestamp" ? "#14d9b0" : "#eab308"} /></td>
    <td style={{ textAlign: "center", color: "var(--text-3)", fontWeight: 800 }} >{required ? <span>✓</span> : <span>—</span>}</td>
    <td style={{ fontSize: 11, color: "var(--text-2)" }}>{desc}</td>
    <td style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-3)" }}>{example}</td>
    <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tags.map(t => <Tag key={t} label={t} color="#6366f1" />)}</td>
  </tr>
);

/* ═══════════════════════════════════════════════════
   SCHEMA DEFINITIONS (technical reference — field names stay in English as API standard)
   ═══════════════════════════════════════════════════ */
function buildSchemas(t) {
  return {
    ad: {
      label: `📣 ${t('ds.adEvents')}`, color: "#f97316",
      platforms: ["Meta Ads", "Google Ads", "TikTok Ads", "Naver SA/DA", "Kakao Moment", "Coupang Ads"],
      desc: t('ds.adDesc'),
      sections: [
        {
          title: t('ds.secCampaignHierarchy'), fields: [
            { name: "event_id", type: "string", required: true, desc: t('ds.fEventId'), example: "—", tags: ["PK"] },
            { name: "platform", type: "string", required: true, desc: t('ds.fPlatform'), example: "—", tags: ["PartitionKey"] },
            { name: "account_id", type: "string", required: true, desc: t('ds.fAccountId'), example: "—", tags: [] },
            { name: "campaign_id", type: "string", required: true, desc: t('ds.fCampaignId'), example: "—", tags: ["FK"] },
            { name: "campaign_name", type: "string", required: true, desc: t('ds.fCampaignName'), example: "—", tags: [] },
            { name: "campaign_objective", type: "string", required: true, desc: t('ds.fCampaignObj'), example: "—", tags: [] },
            { name: "adset_id", type: "string", required: true, desc: t('ds.fAdsetId'), example: "—", tags: ["FK"] },
            { name: "adset_name", type: "string", required: false, desc: t('ds.fAdsetName'), example: "—", tags: [] },
            { name: "ad_id", type: "string", required: true, desc: t('ds.fAdId'), example: "—", tags: ["FK"] },
            { name: "ad_name", type: "string", required: false, desc: t('ds.fAdName'), example: "—", tags: [] },
            { name: "creative_type", type: "string", required: false, desc: t('ds.fCreativeType'), example: "—", tags: [] },
            { name: "keyword_id", type: "string", required: false, desc: t('ds.fKeywordId'), example: "—", tags: ["nullable"] },
            { name: "keyword_text", type: "string", required: false, desc: t('ds.fKeywordText'), example: "—", tags: ["nullable"] },
            { name: "match_type", type: "string", required: false, desc: t('ds.fMatchType'), example: "—", tags: ["nullable"] },
          ]
        },
        {
          title: t('ds.secAudienceTarget'), fields: [
            { name: "audience_id", type: "string", required: false, desc: t('ds.fAudienceId'), example: "—", tags: [] },
            { name: "audience_type", type: "string", required: false, desc: t('ds.fAudienceType'), example: "—", tags: [] },
            { name: "age_min", type: "number", required: false, desc: t('ds.fAgeMin'), example: "—", tags: [] },
            { name: "age_max", type: "number", required: false, desc: t('ds.fAgeMax'), example: "—", tags: [] },
            { name: "gender", type: "string", required: false, desc: t('ds.fGender'), example: "—", tags: [] },
            { name: "geo_country", type: "string", required: false, desc: t('ds.fGeoCountry'), example: "—", tags: [] },
            { name: "placement", type: "string", required: false, desc: t('ds.fPlacement'), example: "—", tags: [] },
            { name: "device_type", type: "string", required: false, desc: t('ds.fDeviceType'), example: "—", tags: [] },
          ]
        },
        {
          title: t('ds.secPerfMetrics'), fields: [
            { name: "event_date", type: "timestamp", required: true, desc: t('ds.fEventDate'), example: "—", tags: ["PartitionKey"] },
            { name: "impressions", type: "number", required: true, desc: t('ds.fImpressions'), example: "—", tags: ["Aggregate"] },
            { name: "clicks", type: "number", required: true, desc: t('ds.fClicks'), example: "—", tags: ["Aggregate"] },
            { name: "spend", type: "number", required: true, desc: t('ds.fSpend'), example: "—", tags: ["Aggregate"] },
            { name: "currency", type: "string", required: true, desc: t('ds.fCurrency'), example: "—", tags: [] },
            { name: "conversions", type: "number", required: true, desc: t('ds.fConversions'), example: "—", tags: ["Aggregate"] },
            { name: "conversion_value", type: "number", required: true, desc: t('ds.fConvValue'), example: "—", tags: ["Aggregate"] },
            { name: "reach", type: "number", required: false, desc: t('ds.fReach'), example: "—", tags: ["Aggregate"] },
            { name: "frequency", type: "number", required: false, desc: t('ds.fFrequency'), example: "—", tags: [] },
            { name: "ctr", type: "number", required: false, desc: t('ds.fCtr'), example: "—", tags: ["Derived"] },
            { name: "cpc", type: "number", required: false, desc: t('ds.fCpc'), example: "—", tags: ["Derived"] },
            { name: "roas", type: "number", required: false, desc: t('ds.fRoas'), example: "—", tags: ["Derived"] },
          ]
        },
      ]
    },
    market: {
      label: `🏪 ${t('ds.marketOrders')}`, color: "#ef4444",
      platforms: ["Coupang", "Naver SmartStore", "11Street", "Gmarket", "Shopify", "Amazon"],
      desc: t('ds.marketDesc'),
      sections: [
        {
          title: t('ds.secOrder'), fields: [
            { name: "order_id", type: "string", required: true, desc: t('ds.fOrderId'), example: "—", tags: ["PK"] },
            { name: "platform", type: "string", required: true, desc: t('ds.fPlatform'), example: "—", tags: ["PartitionKey"] },
            { name: "order_date", type: "timestamp", required: true, desc: t('ds.fOrderDate'), example: "—", tags: ["PartitionKey"] },
            { name: "sku", type: "string", required: true, desc: t('ds.fSku'), example: "—", tags: ["FK"] },
            { name: "product_name", type: "string", required: true, desc: t('ds.fProductName'), example: "—", tags: [] },
            { name: "quantity", type: "number", required: true, desc: t('ds.fQuantity'), example: "—", tags: [] },
            { name: "sell_price", type: "number", required: true, desc: t('ds.fSellPrice'), example: "—", tags: [] },
            { name: "gross_sales", type: "number", required: true, desc: t('ds.fGrossSales'), example: "—", tags: ["Aggregate"] },
            { name: "currency", type: "string", required: true, desc: t('ds.fCurrency'), example: "—", tags: [] },
          ]
        },
        {
          title: t('ds.secSettlement'), fields: [
            { name: "settle_id", type: "string", required: true, desc: t('ds.fSettleId'), example: "—", tags: ["PK"] },
            { name: "platform_fee", type: "number", required: true, desc: t('ds.fPlatformFee'), example: "—", tags: ["Deduction"] },
            { name: "ad_fee", type: "number", required: true, desc: t('ds.fAdFee'), example: "—", tags: ["Deduction"] },
            { name: "net_payout", type: "number", required: true, desc: t('ds.fNetPayout'), example: "—", tags: ["Aggregate"] },
          ]
        },
        {
          title: t('ds.secReturnClaim'), fields: [
            { name: "return_id", type: "string", required: true, desc: t('ds.fReturnId'), example: "—", tags: ["PK"] },
            { name: "order_id", type: "string", required: true, desc: t('ds.fOrigOrderId'), example: "—", tags: ["FK"] },
            { name: "return_reason", type: "string", required: true, desc: t('ds.fReturnReason'), example: "—", tags: [] },
            { name: "return_status", type: "string", required: true, desc: t('ds.fReturnStatus'), example: "—", tags: [] },
            { name: "refund_amount", type: "number", required: false, desc: t('ds.fRefundAmt'), example: "—", tags: ["nullable"] },
          ]
        },
      ]
    },
    ugc: {
      label: `🤝 ${t('ds.ugcInfluencer')}`, color: "#a855f7",
      platforms: ["YouTube", "Instagram", "TikTok", "NaverBlog", "Kakao Story"],
      desc: t('ds.ugcDesc'),
      sections: [
        {
          title: t('ds.secCreatorIdentity'), fields: [
            { name: "creator_id", type: "string", required: true, desc: t('ds.fCreatorId'), example: "—", tags: ["PK"] },
            { name: "platform", type: "string", required: true, desc: t('ds.fPlatform'), example: "—", tags: ["PartitionKey"] },
            { name: "platform_handle", type: "string", required: true, desc: t('ds.fHandle'), example: "—", tags: [] },
            { name: "tier", type: "string", required: true, desc: t('ds.fTier'), example: "—", tags: [] },
          ]
        },
        {
          title: t('ds.secContract'), fields: [
            { name: "contract_id", type: "string", required: true, desc: t('ds.fContractId'), example: "—", tags: ["PK"] },
            { name: "contract_type", type: "string", required: true, desc: t('ds.fContractType'), example: "—", tags: [] },
            { name: "contract_start", type: "timestamp", required: true, desc: t('ds.fContractStart'), example: "—", tags: [] },
            { name: "contract_end", type: "timestamp", required: true, desc: t('ds.fContractEnd'), example: "—", tags: [] },
            { name: "esign_status", type: "string", required: true, desc: t('ds.fEsignStatus'), example: "—", tags: [] },
          ]
        },
        {
          title: t('ds.secContentPerf'), fields: [
            { name: "content_id", type: "string", required: true, desc: t('ds.fContentId'), example: "—", tags: ["FK"] },
            { name: "content_type", type: "string", required: true, desc: t('ds.fContentType'), example: "—", tags: [] },
            { name: "views", type: "number", required: true, desc: t('ds.fViews'), example: "—", tags: ["Aggregate"] },
            { name: "likes", type: "number", required: false, desc: t('ds.fLikes'), example: "—", tags: ["Aggregate"] },
            { name: "engagement_rate", type: "number", required: false, desc: t('ds.fEngRate'), example: "—", tags: ["Derived"] },
            { name: "attributed_revenue", type: "number", required: false, desc: t('ds.fAttribRevenue'), example: "—", tags: ["Derived", "Attribution"] },
          ]
        },
      ]
    },
  };
}

/* ═══════════════════════════════════════════════════
   METRICS CATALOG (formulas are universal)
   ═══════════════════════════════════════════════════ */
const DOMAIN_COLOR = { "Ad": "#f97316", "Market": "#ef4444", "UGC": "#a855f7", "Integrated": "#4f8ef7" };
function buildMetrics(t) {
  return [
    { domain: "Ad", name: "ROAS", formula: "conversion_value / spend", type: t('ds.typeDerived'), alert: "< 3.0x → 🔴", unit: "x" },
    { domain: "Ad", name: "ACOS", formula: "spend / conversion_value", type: t('ds.typeDerived'), alert: "> 30% → 🟡", unit: "%" },
    { domain: "Ad", name: "CTR", formula: "clicks / impressions", type: t('ds.typeDerived'), alert: "< 0.5% → 🟡", unit: "%" },
    { domain: "Ad", name: "CVR", formula: "conversions / clicks", type: t('ds.typeDerived'), alert: "< 1% → 🟡", unit: "%" },
    { domain: "Ad", name: "CPC", formula: "spend / clicks", type: t('ds.typeDerived'), alert: null, unit: "KRW" },
    { domain: "Market", name: t('ds.metReturnRate'), formula: "returns / orders", type: t('ds.typeDerived'), alert: "> 12% → 🔴", unit: "%" },
    { domain: "Market", name: t('ds.metSettleRate'), formula: "net_payout / gross_sales", type: t('ds.typeDerived'), alert: "< 70% → 🟡", unit: "%" },
    { domain: "Market", name: t('ds.metCommRate'), formula: "platform_fee / gross_sales", type: t('ds.typeDerived'), alert: "> 14% → 🟡", unit: "%" },
    { domain: "UGC", name: t('ds.metEngRate'), formula: "(likes+comments+shares) / views", type: t('ds.typeDerived'), alert: "< 1% → 🟡", unit: "%" },
    { domain: "UGC", name: t('ds.metCreatorROI'), formula: "attributed_revenue / (flat_fee + perf_pay)", type: t('ds.typeDerived'), alert: "< 10x → 🟡", unit: "x" },
    { domain: "Integrated", name: t('ds.metBlendedROAS'), formula: "Σrev / Σspend (all channels)", type: t('ds.typeAggregate'), alert: "< 3.0x → 🔴", unit: "x" },
    { domain: "Integrated", name: t('ds.metNetMargin'), formula: "net_profit / gross_sales", type: t('ds.typeAggregate'), alert: "< 20% → 🟡", unit: "%" },
  ];
}

/* ═══════════════════════════════════════════════════
   TAB RENDERERS
   ═══════════════════════════════════════════════════ */
function SchemaTab({ t }) {
  const SCHEMAS = buildSchemas(t);
  const [domain, setDomain] = useState("ad");
  const [openSection, setOpenSection] = useState(null);
  const s = SCHEMAS[domain];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(SCHEMAS).map(([k, v]) => (
          <button key={k} onClick={() => { setDomain(k); setOpenSection(null); }} style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid", borderColor: domain === k ? v.color : "var(--border)", background: domain === k ? v.color + "18" : "transparent", color: domain === k ? v.color : "var(--text-3)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{v.label}</button>
        ))}
      </div>
      <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>{t('ds.platforms')}:</span>
        {s.platforms.map(p => <Tag key={p} label={p} color={s.color} />)}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", padding: "0 2px" }}>{s.desc}</div>
      {s.sections.map((sec, si) => (
        <div key={si} className="card card-glass" style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${s.color}` }}>
          <button onClick={() => setOpenSection(openSection === si ? null : si)} style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", color: '#fff' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{sec.title}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-2)" }}>{sec.fields.length} {t('ds.fields')}</span>
              <span style={{ color: "var(--text-2)" }}>{openSection === si ? "▲" : "▼"}</span>
            </div>
          </button>
          {openSection === si && (
            <div style={{ padding: "0 18px 18px" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th>{t('ds.thField')}</th><th>{t('ds.thType')}</th><th style={{ textAlign: "center" }}>{t('ds.thRequired')}</th>
                      <th>{t('ds.thDesc')}</th><th>{t('ds.thExample')}</th><th>{t('ds.thTags')}</th>
                    </tr>
                  </thead>
                  <tbody>{sec.fields.map((f, fi) => <FieldRow key={fi} {...f} />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PipelineTab({ t }) {
  const PIPELINE = [
    { step: `1. ${t('ds.pipeCollect')}`, icon: "📡", color: "#4f8ef7", items: [
      { title: t('ds.pipeAdApi'), desc: t('ds.pipeAdApiDesc'), tags: ["OAuth2", "15min", "Rate-limit"] },
      { title: t('ds.pipeMarketFile'), desc: t('ds.pipeMarketFileDesc'), tags: ["S3", "SQS", "Daily", "Webhook"] },
      { title: t('ds.pipeUgcCrawl'), desc: t('ds.pipeUgcCrawlDesc'), tags: ["Snapshot", "Cache TTL 1h"] },
    ]},
    { step: `2. ${t('ds.pipeNormalize')}`, icon: "⚙️", color: "#a855f7", items: [
      { title: t('ds.pipeFieldMap'), desc: t('ds.pipeFieldMapDesc'), tags: ["FX Conversion", "Mapping Table"] },
      { title: t('ds.pipeCreatorUnify'), desc: t('ds.pipeCreatorUnifyDesc'), tags: ["Dedup", "Fuzzy Match"] },
      { title: t('ds.pipeDQ'), desc: t('ds.pipeDQDesc'), tags: ["DQ", "NULL Check", "Anomaly"] },
    ]},
    { step: `3. ${t('ds.pipeMetricsCalc')}`, icon: "📊", color: "#22c55e", items: [
      { title: t('ds.pipeStreamAgg'), desc: t('ds.pipeStreamAggDesc'), tags: ["Kafka Streams", "1min", "Redis"] },
      { title: t('ds.pipeBatchAgg'), desc: t('ds.pipeBatchAggDesc'), tags: ["Airflow", "BigQuery", "Parquet"] },
      { title: t('ds.pipeDerivedMetrics'), desc: t('ds.pipeDerivedMetricsDesc'), tags: ["Derived", "SLA 6h"] },
    ]},
    { step: `4. ${t('ds.pipeRecommend')}`, icon: "🚀", color: "#f97316", items: [
      { title: t('ds.pipeAnomalyAlert'), desc: t('ds.pipeAnomalyAlertDesc'), tags: ["Slack", "In-app", "Email"] },
      { title: t('ds.pipeBudgetRealloc'), desc: t('ds.pipeBudgetReallocDesc'), tags: ["Simulation", "P1"] },
    ]},
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {PIPELINE.map((p, pi) => (
        <div key={pi} className="card card-glass" style={{ padding: 20, borderLeft: `4px solid ${p.color}` }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: p.color }}>{p.icon} {p.step}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {p.items.map((item, ii) => (
              <div key={ii} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.08)" }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5, color: '#fff' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 8, lineHeight: 1.5 }}>{item.desc}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{item.tags.map(tg => <Tag key={tg} label={tg} color={p.color} />)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card card-glass" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#fff' }}>🔄 {t('ds.dataFlowSummary')}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, fontWeight: 700 }}>
          {[
            [`📡 ${t('ds.flowPlatformApi')}`, "#4f8ef7"], ["→", null], [`⚙ ${t('ds.flowKafkaS3')}`, "#6366f1"], ["→", null],
            [`🔧 ${t('ds.flowNormalize')}`, "#a855f7"], ["→", null], [`📊 ${t('ds.flowBigQuery')}`, "#22c55e"], ["→", null],
            [`🚀 ${t('ds.pipeRecommend')}`, "#f97316"],
          ].map(([l, c], i) => c
            ? <span key={i} style={{ padding: "5px 14px", borderRadius: 8, background: c + "18", color: c, border: `1px solid ${c}33` }}>{l}</span>
            : <span key={i} style={{ color: "var(--text-3)", fontSize: 14 }}>{l}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricsTab({ t }) {
  const METRICS = buildMetrics(t);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {["Ad", "Market", "UGC", "Integrated"].map(d => (
          <div key={d} className="card card-glass" style={{ padding: "12px 16px", borderLeft: `3px solid ${DOMAIN_COLOR[d]}` }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{d} {t('ds.domain')}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: DOMAIN_COLOR[d] }}>{METRICS.filter(m => m.domain === d).length}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t('ds.definedMetrics')}</div>
          </div>
        ))}
      </div>
      <div className="card card-glass" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#fff' }}>📐 {t('ds.metricsCatalog')}</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>{t('ds.domain')}</th><th>{t('ds.metric')}</th><th>{t('ds.formula')}</th><th>{t('ds.thType')}</th><th>{t('ds.unit')}</th><th>{t('ds.alertCondition')}</th></tr></thead>
            <tbody>
              {METRICS.map((m, i) => (
                <tr key={i}>
                  <td><Tag label={m.domain} color={DOMAIN_COLOR[m.domain]} /></td>
                  <td style={{ fontWeight: 800, color: '#fff' }}>{m.name}</td>
                  <td><Code>{m.formula}</Code></td>
                  <td><Tag label={m.type} color={m.type === t('ds.typeDerived') ? "#6366f1" : "#14d9b0"} /></td>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-2)" }}>{m.unit}</td>
                  <td style={{ fontSize: 11, color: m.alert?.includes("🔴") ? "#ef4444" : m.alert?.includes("🟡") ? "#eab308" : "var(--text-3)" }}>{m.alert || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildAlertRules(t) {
  return [
    { priority: "P0", trigger: t('ds.ruleROAS2'), action: t('ds.ruleROAS2Action'), channel: ["Slack", "In-app"], color: "#ef4444" },
    { priority: "P1", trigger: t('ds.ruleROAS3'), action: t('ds.ruleROAS3Action'), channel: ["In-app", "Email"], color: "#f97316" },
    { priority: "P1", trigger: t('ds.ruleReturn12'), action: t('ds.ruleReturn12Action'), channel: ["Email", "In-app"], color: "#f97316" },
    { priority: "P1", trigger: t('ds.ruleOverpay'), action: t('ds.ruleOverpayAction'), channel: ["Email", "In-app"], color: "#a855f7" },
    { priority: "P2", trigger: t('ds.ruleWhitelistD30'), action: t('ds.ruleWhitelistD30Action'), channel: ["Email"], color: "#eab308" },
    { priority: "P2", trigger: t('ds.ruleWhitelistD7'), action: t('ds.ruleWhitelistD7Action'), channel: ["In-app", "Slack"], color: "#eab308" },
    { priority: "P2", trigger: t('ds.ruleWhitelistD0'), action: t('ds.ruleWhitelistD0Action'), channel: ["In-app", "Slack", "Email"], color: "#ef4444" },
    { priority: "P3", trigger: t('ds.ruleCreatorROI10'), action: t('ds.ruleCreatorROI10Action'), channel: ["In-app"], color: "#22c55e" },
    { priority: "P3", trigger: t('ds.ruleHighViewLowOrder'), action: t('ds.ruleHighViewLowOrderAction'), channel: ["In-app"], color: "#22c55e" },
  ];
}

function AlertTab({ t }) {
  const rules = buildAlertRules(t);
  const PCOLOR = { P0: "#ef4444", P1: "#f97316", P2: "#eab308", P3: "#22c55e" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {["P0", "P1", "P2", "P3"].map(p => (
          <div key={p} className="card card-glass" style={{ padding: "12px 16px", borderLeft: `3px solid ${PCOLOR[p]}` }}>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t('ds.priority')} {p}</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: PCOLOR[p] }}>{rules.filter(r => r.priority === p).length}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{p === "P0" ? t('ds.autoExec') : p === "P1" ? t('ds.immediateAction') : p === "P2" ? t('ds.earlyWarning') : t('ds.optimization')}</div>
          </div>
        ))}
      </div>
      <div className="card card-glass" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#fff' }}>📋 {t('ds.alertRuleCatalog')}</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ fontSize: 11 }}>
            <thead><tr><th>{t('ds.priority')}</th><th>{t('ds.triggerCondition')}</th><th>{t('ds.action')}</th><th>{t('ds.channel')}</th></tr></thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={i}>
                  <td><Tag label={r.priority} color={PCOLOR[r.priority]} /></td>
                  <td style={{ fontWeight: 700, color: r.color }}>{r.trigger}</td>
                  <td style={{ fontSize: 10, color: "var(--text-2)" }}>{r.action}</td>
                  <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{r.channel.map(c => <Tag key={c} label={c} color="#6366f1" />)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GUIDE TAB — Enterprise Superium v6.0
   ═══════════════════════════════════════════════════ */
function GuideTab({ t }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(20,217,176,0.05))', padding: '32px 28px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.12)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{t('ds.guideTitle')}</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{t('ds.guideSub')}</p>
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, border: '1px solid rgba(99,102,241,0.1)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#6366f1' }}>📋 {t('ds.guideStepsTitle')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ padding: 16, borderRadius: 14, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#14d9b0)', color: '#fff' }}>{i}</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: i<=2?'#6366f1':i<=4?'#22c55e':'#f97316' }}>{t(`ds.guideStep${i}Title`)}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{t(`ds.guideStep${i}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, border: '1px solid rgba(99,102,241,0.1)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#14d9b0' }}>🗂 {t('ds.guideRolesTitle')}</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {[{k:'Ad',emoji:'📣',c:'#f97316'},{k:'Market',emoji:'🏪',c:'#ef4444'},{k:'Ugc',emoji:'🤝',c:'#a855f7'}].map(r => (
            <div key={r.k} style={{ padding: '12px 16px', borderRadius: 12, background: `${r.c}08`, border: `1px solid ${r.c}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{r.emoji}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{t(`ds.guideSec${r.k}`)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, border: '1px solid rgba(99,102,241,0.1)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#22c55e' }}>💡 {t('ds.guideTipsTitle')}</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#22c55e', fontWeight: 900 }}>Tip{i}</span> {t(`ds.guideTip${i}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v6.0
   ═══════════════════════════════════════════════════ */
export default function DataSchema() {
  const { t } = useI18n();
  const { addAlert, isDemo } = useGlobalData();
  const { locked, setLocked } = useSecurityGuard(addAlert);
  const { connectors } = useConnectorSync?.() || { connectors: [] };
  const bcRef = useRef(null);
  const [tab, setTab] = useState("schema");

  // Integration Hub sync: get connected platforms dynamically
  const connectedPlatforms = useMemo(() => {
    if (!connectors?.length) return [];
    return connectors.filter(c => c.status === 'connected' || c.credentials?.length > 0).map(c => c.name || c.key);
  }, [connectors]);

  // Schema export handler
  const handleExport = useCallback((format) => {
    const SCHEMAS = buildSchemas(t);
    const data = {};
    Object.entries(SCHEMAS).forEach(([k, v]) => {
      data[k] = { label: v.label, platforms: v.platforms, sections: v.sections.map(s => ({ title: s.title, fields: s.fields.map(f => ({ name: f.name, type: f.type, required: f.required, desc: f.desc, tags: f.tags })) })) };
    });
    let content, mime, ext;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mime = 'application/json'; ext = 'json';
    } else {
      const rows = ['Domain,Section,Field,Type,Required,Description,Tags'];
      Object.entries(data).forEach(([dk, dv]) => dv.sections.forEach(s => s.fields.forEach(f => rows.push([dk, s.title, f.name, f.type, f.required, f.desc, f.tags.join(';')].map(v => `"${v}"`).join(',')))));
      content = rows.join('\n');
      mime = 'text/csv'; ext = 'csv';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `geniego_schema.${ext}`; a.click();
    URL.revokeObjectURL(url);
    addAlert?.({ type: 'info', msg: `${t('ds.exportSchema')} (${ext.toUpperCase()})` });
  }, [t, addAlert]);

  // BroadcastChannel
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('genie_dataschema_sync');
      bcRef.current.onmessage = (e) => {
        if (e.data?.type === 'schema_updated') addAlert?.({ type: 'info', msg: t('ds.crossTabSync') });
      };
    } catch (_) {}
    return () => { try { bcRef.current?.close(); } catch (_) {} };
  }, []);

  const SCHEMAS = buildSchemas(t);
  const METRICS = buildMetrics(t);
  const totalFields = Object.values(SCHEMAS).reduce((s, sc) => s + sc.sections.reduce((ss, sec) => ss + sec.fields.length, 0), 0);

  const TABS = [
    { id: "schema", label: `📋 ${t('ds.tabSchema')}`, desc: t('ds.tabSchemaDesc') },
    { id: "pipeline", label: `🔄 ${t('ds.tabPipeline')}`, desc: t('ds.tabPipelineDesc') },
    { id: "metrics", label: `📐 ${t('ds.tabMetrics')}`, desc: t('ds.tabMetricsDesc') },
    { id: "alerts", label: `🚀 ${t('ds.tabAlerts')}`, desc: t('ds.tabAlertsDesc') },
    { id: "guide", label: `📖 ${t('ds.tabGuide')}`, desc: t('ds.tabGuideDesc') },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />
      <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(20,217,176,0.04))", borderColor: "rgba(99,102,241,0.15)" }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(20,217,176,0.1))" }}>📋</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#6366f1,#14d9b0)" }}>{t('ds.heroTitle')}</div>
            <div className="hero-desc">{t('ds.heroDesc')}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {[
            [t('ds.badgeTotalFields'), totalFields, "#6366f1"],
            [t('ds.badgeMetrics'), METRICS.length, "#22c55e"],
            [t('ds.badgeAlertRules'), buildAlertRules(t).length, "#f97316"],
            [t('ds.badgePlatforms'), Object.values(SCHEMAS).reduce((s, sc) => s + sc.platforms.length, 0), "#4f8ef7"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ padding: "6px 14px", borderRadius: 8, background: c + "12", border: `1px solid ${c}22`, fontSize: 11, color: c, fontWeight: 700 }}>{l}: {v}</div>
          ))}
          <button onClick={() => handleExport('json')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('ds.exportJSON')}</button>
          <button onClick={() => handleExport('csv')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(20,217,176,0.3)', background: 'rgba(20,217,176,0.1)', color: '#14d9b0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('ds.exportCSV')}</button>
        </div>
      </div>
      <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left", color: '#fff',
              background: tab === tb.id ? "rgba(99,102,241,0.1)" : "transparent",
              borderBottom: `2px solid ${tab === tb.id ? "#6366f1" : "transparent"}`, transition: "all 200ms" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: tab === tb.id ? "var(--text-1)" : "var(--text-2)" }}>{tb.label}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card card-glass fade-up fade-up-2">
        {tab === "schema" && <SchemaTab t={t} />}
        {tab === "pipeline" && <PipelineTab t={t} />}
        {tab === "metrics" && <MetricsTab t={t} />}
        {tab === "alerts" && <AlertTab t={t} />}
        {tab === "guide" && <GuideTab t={t} />}
      </div>
    </div>
  );
}
