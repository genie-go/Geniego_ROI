import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext.jsx";

import { useI18n } from '../i18n';

/* ─── Channel Master Data ────────────────────────────────────────────────────── */
const CHANNELS = [
  // Global Ads
  { key:"meta_ads",       group:"global_ad",  name:"Meta Ads",          icon:"📘", color:"#1877F2",
    autoOAuth:true,  oauthUrl:"https://www.facebook.com/v12.0/dialog/oauth",
    issueUrl:"https://developers.facebook.com/apps/",
    guide:"Business Manager → 앱 → 토큰 Create → access_token Copy",
    autoAcquire: false, reason:"OAuth 2.0 User 동의 필요 (직접 로그인 필Count)",
    capabilities:["ProductRegister","AdsAuto화","Conversion추적","잠Stock객"], },

  { key:"google_ads",     group:"global_ad",  name:"Google Ads",        icon:"🔵", color:"#4285F4",
    autoOAuth:true,  oauthUrl:"https://accounts.google.com/o/oauth2/auth",
    issueUrl:"https://console.cloud.google.com/apis/credentials",
    guide:"Google Cloud Console → User 인증 Info → OAuth 2.0 클라이언트 ID Create",
    autoAcquire: false, reason:"OAuth 2.0 User 동의 필요 (Google Account 로그인 필Count)",
    capabilities:["SearchAds","쇼핑Ads","GA4Integration","Conversion추적"], },

  { key:"tiktok_business",group:"global_ad",  name:"TikTok Business",   icon:"🎶", color:"#010101",
    autoOAuth:true,  oauthUrl:"https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/",
    issueUrl:"https://ads.tiktok.com/marketing_api/apps/",
    guide:"TikTok Marketing API → 앱 Create → Access Token Issue",
    autoAcquire: false, reason:"OAuth 2.0 User 동의 필요",
    capabilities:["틱톡Ads","숏폼Marketing","Conversion추적"], },

  { key:"amazon_spapi",   group:"global_commerce", name:"Amazon SP-API", icon:"📦", color:"#FF9900",
    autoOAuth:true,  oauthUrl:"https://sellercentral.amazon.com/apps/authorize/consent",
    issueUrl:"https://developer-docs.amazon.com/sp-api/docs/registering-your-application",
    guide:"Seller Central → 앱 Management → LWA credentials Issue",
    autoAcquire: false, reason:"Amazon LWA OAuth + 개발자 Register 심사 필요",
    capabilities:["ProductAutoRegister","OrdersInfoCount집","StockSync","AdsIntegration"], },

  { key:"shopify",        group:"global_commerce", name:"Shopify",       icon:"🛍", color:"#96BF48",
    autoOAuth:true,  oauthUrl:"https://{store}.myshopify.com/admin/oauth/authorize",
    issueUrl:"https://partners.shopify.com/",
    guide:"Shopify Partners → 앱 Create → Admin API Token Issue",
    autoAcquire: false, reason:"스토어 도메인per OAuth 동의 필요",
    capabilities:["ProductAutoRegister","OrdersManagement","CustomerCRM","StockSync"], },

  // Domestic
  { key:"coupang",        group:"domestic",   name:"Coupang Wing",          icon:"🛒", color:"#C02525",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://wing.coupang.com/",
    guide:"Coupang Wing → 판매자 Settings → API Integration → Access Key + Secret Key Issue",
    autoAcquire: true, reason:"HMAC 방식 API Key — 판매자센터에서 직접 Copy 가능",
    capabilities:["ProductAutoRegister","OrdersInfoCount집","정산Info","CoupangAds"], },

  { key:"naver_smartstore",group:"domestic",  name:"Naver 스마트스토어", icon:"🟢", color:"#03C75A",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://apicenter.commerce.naver.com/",
    guide:"커머스 API 센터 → 애플리케이션 Register → Client ID / Secret Issue",
    autoAcquire: true, reason:"애플리케이션 Register 후 즉시 Issue 가능",
    capabilities:["ProductAutoRegister","OrdersManagement","정산Info","리뷰Count집"], },

  { key:"naver_sa",       group:"domestic",   name:"Naver SearchAds(SA)", icon:"🟩", color:"#03C75A",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://searchad.naver.com/",
    guide:"SearchAds 시스템 → 도구 → API Management → API Key Issue",
    autoAcquire: true, reason:"SearchAds Account에서 직접 Issue 가능",
    capabilities:["SearchAdsAuto화","키워드Analysis","입찰Management"], },

  { key:"kakao_moment",   group:"domestic",   name:"Kakao 모먼트",       icon:"💛", color:"#FEE500",
    autoOAuth:true,  oauthUrl:"https://kauth.kakao.com/oauth/authorize",
    issueUrl:"https://developers.kakao.com/",
    guide:"Kakao Developers → 앱 Create → Kakao 로그인 → 토큰 Issue",
    autoAcquire: false, reason:"Kakao OAuth 로그인 필요",
    capabilities:["KakaoAds","Notification톡","CustomerAnalysis"], },

  { key:"st11",           group:"domestic",   name:"11Street",             icon:"🔶", color:"#FA3E2C",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://openapi.11st.co.kr/",
    guide:"11Street Open API {t('sc.apply','Apply')} → 심사 Approval 후 API Key Email Count신",
    autoAcquire: true, reason:"신청 후 1~3 영업일 이내 Issue",
    capabilities:["ProductAutoRegister","OrdersInfoCount집"], },

  { key:"gmarket",        group:"domestic",   name:"Gmarket / 옥션",        icon:"🟡", color:"#0099CC",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://www.gmarketglobal.com/api",
    guide:"Gmarket 파트너센터 → API 신청 → Approval 후 키 Issue",
    autoAcquire: true, reason:"파트너 Register 후 Issue 가능",
    capabilities:["ProductAutoRegister","OrdersManagement"], },

  { key:"rakuten",        group:"global_commerce", name:"Rakuten(라쿠텐)", icon:"🛒", color:"#BF0000",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://webservice.rakuten.co.jp/",
    guide:"Rakuten Web Service → 어플리케이션 Register → Service Secret + License Key Issue",
    autoAcquire: true, reason:"앱 Register 후 즉시 Issue 가능",
    capabilities:["ProductAutoRegister","OrdersInfoCount집","MarketingIntegration"], },

  { key:"qoo10",          group:"global_commerce", name:"Qoo10(큐텐)",     icon:"🟡", color:"#FF6B00",
    autoOAuth:false, oauthUrl:null,
    issueUrl:"https://api.qoo10.com/",
    guide:"Qoo10 판매자센터 → API Settings → API Key Confirm",
    autoAcquire: true, reason:"판매자 Register 후 판매자센터에서 Confirm 가능",
    capabilities:["ProductAutoRegister","OrdersManagement"], },

  { key:"google_analytics",group:"own_etc",  name:"Google Analytics 4", icon:"📊", color:"#E37400",
    autoOAuth:true,  oauthUrl:"https://accounts.google.com/o/oauth2/auth",
    issueUrl:"https://analytics.google.com/analytics/web/",
    guide:"GA4 → Admin → Data Streams → Measurement Protocol API Secret Create",
    autoAcquire: false, reason:"Google OAuth 로그인 후 Count동 Create 필요",
    capabilities:["트래픽Analysis","Conversion추적","잠Stock객"], },

  { key:"slack",          group:"own_etc",   name:"Slack Webhook",      icon:"💬", color:"#4A154B",
    autoOAuth:true,  oauthUrl:"https://slack.com/oauth/v2/authorize",
    issueUrl:"https://api.slack.com/apps",
    guide:"Slack API → Your Apps → Incoming Webhooks → Webhook URL Copy",
    autoAcquire: true, reason:"앱 Create 후 즉시 URL 획득 가능",
    capabilities:["NotificationAuto화","Event전송"], },
];

/* ─── Auto 획득 가능 여부에 따른 분류 헬퍼 ────────────────────────────────── */
const STATUS = { unscanned:"unscanned", found:"found", missing:"missing", applying:"applying", applied:"applied", registered:"registered" };

/* ─── 시뮬레이션 스캔 함Count ────────────────────────────────────────────────── */
async function simulateScan(channelKey, savedKeys) {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 800));
  const hasSaved = savedKeys.includes(channelKey);
  if (hasSaved) return { status: "registered", keyPreview: "sk_••••••••" };
  // : 일부 Channel은 기존 키가 있는 것으로 시뮬레이션
  const preloaded = ["coupang","naver_smartstore","rakuten","slack"];
  if (preloaded.includes(channelKey)) return { status: "found", keyPreview: "auto_••••••••" };
  return { status: "missing" };
}

/* ─── Auto Sync 시뮬레이션 ────────────────────────────────────────────────── */
async function simulateAutoLink(channelKey) {
  await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
  return { ok: true, message: "Auto Sync 및 Run Done", capabilities: CHANNELS.find(c=>c.key===channelKey)?.capabilities || [] };
}

/* ─── Issue 신청 시뮬레이션 ────────────────────────────────────────────────── */
async function simulateApply(channelKey) {
  await new Promise(r => setTimeout(r, 800));
  return { ok: true, ticketId: `APPLY-${Date.now().toString(36).toUpperCase()}` };
}

/* ═══════════════════════════════════════════════════════════════════════════
   메인 Page
═══════════════════════════════════════════════════════════════════════════ */

/* ── Enterprise Error Boundary ─────────────────────────── */
function ErrorFallback({ error, onRetry }) {
  return (
    <div style={{
      padding: '40px 28px', textAlign: 'center', borderRadius: 16,
      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
      margin: '20px 0'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', marginBottom: 8 }}>
        An error occurred
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', marginBottom: 16,
        padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)',
        fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 500, margin: '0 auto 16px'
      }}>
        {error?.message || 'Unknown error'}
      </div>
      <button onClick={onRetry} style={{
        padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff',
        fontWeight: 700, fontSize: 12
      }}>
        🔄 Retry
      </button>
    </div>
  );
}

export default function SmartConnect() {
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);

  const { pushNotification } = useNotification();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [channelStates, setChannelStates] = useState(() =>
    Object.fromEntries(CHANNELS.map(c => [c.key, { status: STATUS.unscanned, keyPreview: null, ticketId: null, linked: false, linkResult: null }]))
  );
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [linking, setLinking] = useState({});
  const [applying, setApplying] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [detailChannel, setDetailChannel] = useState(null);

  const upd = useCallback((key, patch) =>
    setChannelStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } })), []);

  /* All 스캔 */
  const handleScanAll = useCallback(async () => {
    setScanning(true);
    setScanProgress(0);
    const savedKeys = []; // 실제로는 API에서 creds Loading

    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      upd(ch.key, { status: "scanning" });
      const result = await simulateScan(ch.key, savedKeys);
      upd(ch.key, result);
      setScanProgress(Math.round(((i + 1) / CHANNELS.length) * 100));
    }

    setScanning(false);
    setScanProgress(100);

    const found = CHANNELS.filter(c => ["found","registered"].includes(channelStates[c.key]?.status)).length;
    pushNotification({
      type: "connector",
      title: t('sc.scanNotif','API Key Scan Complete'),
      body: `${CHANNELS.length}개 Channel Analysis Done — ${found}개 키 감지`,
      link: "/smart-connect",
    });
  }, [channelStates, upd, pushNotification]);

  /* Auto Sync Run */
  const handleAutoLink = useCallback(async (channelKey) => {
    setLinking(prev => ({ ...prev, [channelKey]: true }));
    const result = await simulateAutoLink(channelKey);
    upd(channelKey, { linked: true, linkResult: result });
    setLinking(prev => ({ ...prev, [channelKey]: false }));

    const ch = CHANNELS.find(c => c.key === channelKey);
    pushNotification({
      type: "connector",
      title: `${ch?.name} Auto Sync Done`,
      body: `${result.capabilities?.join(", ")} Feature이 Activate되었습니다.`,
      link: "/api-keys",
    });
  }, [upd, pushNotification]);

  /* 일괄 Auto Sync */
  const handleAutoLinkAll = useCallback(async () => {
    const targets = CHANNELS.filter(c => channelStates[c.key]?.status === "found");
    for (const ch of targets) {
      await handleAutoLink(ch.key);
    }
  }, [channelStates, handleAutoLink]);

  /* Issue 신청 */
  const handleApply = useCallback(async (channelKey) => {
    const ch = CHANNELS.find(c => c.key === channelKey);
    if (!ch) return;
    if (ch.autoOAuth) {
      window.open(ch.issueUrl, "_blank");
      return;
    }
    setApplying(prev => ({ ...prev, [channelKey]: true }));
    upd(channelKey, { status: STATUS.applying });
    const res = await simulateApply(channelKey);
    upd(channelKey, { status: STATUS.applied, ticketId: res.ticketId });
    setApplying(prev => ({ ...prev, [channelKey]: false }));

    pushNotification({
      type: "connector",
      title: `${ch.name} Issue 신청 Done`,
      body: `티켓 ${res.ticketId} — 1~3 영업일 후 Email로 키가 Send됩니다.`,
      link: "/smart-connect",
    });
  }, [upd, pushNotification]);

  /* Statistics */
  const stats = useMemo(() => {
    const vals = Object.values(channelStates);
    return {
      total: CHANNELS.length,
      registered: vals.filter(v => v.status === "registered").length,
      found:      vals.filter(v => v.status === "found").length,
      linked:     vals.filter(v => v.linked).length,
      missing:    vals.filter(v => v.status === "missing").length,
      applied:    vals.filter(v => ["applying","applied"].includes(v.status)).length,
      unscanned:  vals.filter(v => ["unscanned","scanning"].includes(v.status)).length,
    };
  }, [channelStates]);

  /* Filter */
  const displayed = useMemo(() => {
    if (activeFilter === "all") return CHANNELS;
    if (activeFilter === "found") return CHANNELS.filter(c => channelStates[c.key]?.status === "found");
    if (activeFilter === "registered") return CHANNELS.filter(c => channelStates[c.key]?.status === "registered");
    if (activeFilter === "linked") return CHANNELS.filter(c => channelStates[c.key]?.linked);
    if (activeFilter === "missing") return CHANNELS.filter(c => channelStates[c.key]?.status === "missing");
    if (activeFilter === "applied") return CHANNELS.filter(c => ["applied","applying"].includes(channelStates[c.key]?.status));
    return CHANNELS;
  }, [activeFilter, channelStates]);

  const foundCount = stats.found;

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* Hero */}
      <div className="hero fade-up" style={{ background:"linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))", borderColor:"rgba(79,142,247,0.15)" }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background:"linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))", fontSize:26 }}>🤖</div>
          <div>
            <div className="hero-title" style={{ background:"linear-gradient(135deg,#4f8ef7,#a855f7)" }}>
              ${t('sc.heroTitle', 'SmartConnect — API Key Automation Hub')}
            </div>
            <div className="hero-desc">
              ${t('sc.heroDesc', 'Auto scan, detect, register, and integrate API keys.')}
            </div>
          </div>
        </div>

        {/* In Progress바 */}
        {(scanning || scanProgress > 0) && (
          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--text-3)", marginBottom:4 }}>
              <span>{scanning ? `🔍 ${t('sc.scanning','Scanning...')} (${scanProgress}%)` : ('✅ ' + t('sc.scanDone','Scan Complete'))}</span>
              <span>{scanProgress}%</span>
            </div>
            <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ width:`${scanProgress}%`, height:"100%", borderRadius:99,
                background:"linear-gradient(90deg,#4f8ef7,#a855f7)", transition:"width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
          <button
            onClick={handleScanAll}
            disabled={scanning}
            style={{ padding:"10px 24px", borderRadius:10, fontWeight:800, fontSize:13, cursor:scanning?"not-allowed":"pointer", background: scanning ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#4f8ef7,#6366f1)", border:"none", color:scanning?"var(--text-3)":"#fff", boxShadow: scanning ? "none" : "0 6px 24px rgba(79,142,247,0.35)", transition:"all 200ms", opacity:scanning?0.6:1 }}
          >
            {scanning ? ('⏳ ' + t('sc.scanning','Scanning...')) : ('🔍 ' + t('sc.scanAll','Full Auto Scan'))}
          </button>

          {foundCount > 0 && (
            <button
              onClick={handleAutoLinkAll}
              style={{ padding:"10px 24px", borderRadius:10, fontWeight:800, fontSize:13, cursor:"pointer", background:"linear-gradient(135deg,#22c55e,#14d9b0)", border:"none", color: '#fff', boxShadow:"0 6px 24px rgba(34,197,94,0.35)" }}
            >
              {t('sc.autoSyncAll','Auto Sync Detected Keys')} ({foundCount})
            </button>
          )}

          <button
            onClick={() => navigate("/api-keys")}
            style={{ padding:"10px 18px", borderRadius:10, fontWeight:700, fontSize:12, cursor:"pointer", background: 'var(--surface)', border:"1px solid rgba(99,140,255,0.2)", color:"var(--text-2)" }}
          >
            {t('sc.apiKeyMgmt','API Key Management')}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l:t('sc.kpiAll','All Channels'),  v:stats.total,      c:"#4f8ef7", icon:"📡" },
          { l:t('sc.kpiRegistered','Registered'), v:stats.registered,c:"#22c55e", icon:"✅" },
          { l:t('sc.kpiFound','Detected'),  v:stats.found,      c:"#a855f7", icon:"🔍" },
          { l:t('sc.kpiLinked','Linked'),  v:stats.linked,     c:"#14d9b0", icon:"⚡" },
          { l:t('sc.kpiMissing','Missing'),   v:stats.missing,    c:"#ef4444", icon:"❌" },
          { l:t('sc.kpiApplied','Applied'),  v:stats.applied,    c:"#eab308", icon:"📋" },
          { l:t('sc.kpiUnscanned','Unscanned'),    v:stats.unscanned,  c:"#8da4c4", icon:"⏸" },
          { l:t('sc.kpiAutoAvail','Auto Available'),  v:CHANNELS.filter(c=>c.autoAcquire).length, c:"#f97316", icon:"🤖" },
        ].map(({l,v,c,icon}) => (
          <div key={l} className="kpi-card" style={{ "--accent":c }}>
            <div className="kpi-label">{icon} {l}</div>
            <div className="kpi-value" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter Tab */}
      <div className="card card-glass fade-up fade-up-2" style={{ padding:"10px 14px" }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[
            { id:"all",        label:`${t('sc.filterAll','All')} (${CHANNELS.length})` },
            { id:"registered", label:`${t('sc.filterRegistered','Registered')} (${stats.registered})` },
            { id:"found",      label:`${t('sc.filterFound','Detected')} (${stats.found})` },
            { id:"linked",     label:`${t('sc.filterLinked','Linked')} (${stats.linked})` },
            { id:"missing",    label:`${t('sc.filterMissing','Missing')} (${stats.missing})` },
            { id:"applied",    label:`${t('sc.filterApplied','Applied')} (${stats.applied})` },
          ].map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className={activeFilter === f.id ? "btn-primary" : "btn-ghost"}
              style={{ fontSize:11, padding:"5px 12px" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Card 그리드 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }} className="fade-up fade-up-3">
        {displayed.map(ch => (
          <ChannelCard
            key={ch.key}
            ch={ch}
            state={channelStates[ch.key]}
            isLinking={!!linking[ch.key]}
            isApplying={!!applying[ch.key]}
            onAutoLink={() => handleAutoLink(ch.key)}
            onApply={() => handleApply(ch.key)}
            onDetail={() => setDetailChannel(ch.key)}
          />
        ))}
      </div>

      {/* Auto 획득 불가 안내 */}
      <AutoGuidePanel />

      {/* 상세 Modal */}
      {detailChannel && (
        <DetailModal
          ch={CHANNELS.find(c => c.key === detailChannel)}
          state={channelStates[detailChannel]}
          isLinking={!!linking[detailChannel]}
          isApplying={!!applying[detailChannel]}
          onAutoLink={() => handleAutoLink(detailChannel)}
          onApply={() => handleApply(detailChannel)}
          onClose={() => setDetailChannel(null)}
        />
      )}
    </div>
  
  );
}

/* ─── Channel Card ─────────────────────────────────────────────────────────────── */
function ChannelCard({ ch, state, isLinking, isApplying, onAutoLink, onApply, onDetail }) {
  const { t } = useI18n();
  const stCfg = statusConfig(state?.status, state?.linked);
  return (
    <div style={{
      borderRadius:14, padding:16,
      background:"rgba(9,15,30,0.5)",
      border:`1.5px solid ${stCfg.borderColor}`,
      display:"flex", flexDirection:"column", gap:12,
      transition:"all 200ms",
      boxShadow: state?.linked ? `0 4px 20px ${ch.color}22` : "none" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = ch.color + "66"}
      onMouseLeave={e => e.currentTarget.style.borderColor = stCfg.borderColor}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:10, fontSize:20,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:`${ch.color}18`, border:`1px solid ${ch.color}33`, flexShrink:0 }}>
          {ch.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ch.name}</div>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:3 }}>
            <StatusPill status={state?.status} linked={state?.linked} />
            {ch.autoAcquire && (
              <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, background:"rgba(20,217,176,0.12)", color:"#14d9b0", border:"1px solid rgba(20,217,176,0.25)" }}>
                🤖 AutoIssue 가능
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 감지된 키 미리보기 */}
      {state?.keyPreview && (
        <div style={{ padding:"6px 10px", borderRadius:8, background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", fontSize:11, color:"#22c55e", fontFamily:"monospace" }}>
          🔑 {state.keyPreview}
        </div>
      )}

      {/* Integration Feature Tag */}
      {state?.linked && state?.linkResult?.capabilities && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {state.linkResult.capabilities.map(cap => (
            <span key={cap} style={{ fontSize:9, padding:"2px 7px", borderRadius:99,
              background:`${ch.color}14`, color:ch.color, border:`1px solid ${ch.color}22`, fontWeight:700 }}>
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Issue 신청 Done */}
      {state?.ticketId && (
        <div style={{ fontSize:10, color:"#eab308", padding:"4px 8px", borderRadius:7, background:"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)" }}>
          {t('sc.appliedDone','Requested')}: {state.ticketId}
        </div>
      )}

      {/* Action */}
      <div style={{ display:"flex", gap:6, marginTop:"auto" }}>
        {state?.status === "found" && !state?.linked && (
          <button onClick={onAutoLink} disabled={isLinking}
            style={{ flex:2, padding:"7px 0", borderRadius:8, fontWeight:800, fontSize:11, cursor:"pointer", border:"none", background: isLinking ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#22c55e,#14d9b0)", color: isLinking ? "var(--text-3)" : "#fff", opacity:isLinking?0.7:1 }}>
            {isLinking ? ('⏳ ' + t('sc.linking','Linking...')) : ('⚡ ' + t('sc.autoSync','Auto Sync'))}
          </button>
        )}
        {state?.status === "registered" && !state?.linked && (
          <button onClick={onAutoLink} disabled={isLinking}
            style={{ flex:2, padding:"7px 0", borderRadius:8, fontWeight:700, fontSize:11, cursor:"pointer", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.3)", color:"#22c55e" }}>
            {isLinking ? "⏳..." : "▶ Run"}
          </button>
        )}
        {state?.linked && (
          <div style={{ flex:2, padding:"7px 0", borderRadius:8, fontWeight:800, fontSize:11, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.3)", color:"#22c55e", textAlign:"center" }}>
            ✅ Integration Active
          </div>
        )}
        {state?.status === "missing" && (
          <button onClick={onApply} disabled={isApplying}
            style={{ flex:2, padding:"7px 0", borderRadius:8, fontWeight:800, fontSize:11, cursor:"pointer", border:"none", background: isApplying ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#f97316,#eab308)", color: isApplying ? "var(--text-3)":"#fff", opacity:isApplying?0.7:1 }}>
            {isApplying ? ('⏳ ' + t('sc.applying','Applying...')) : (ch.autoOAuth ? "🔗 OAuth Connect" : ('📋 ' + t('sc.applyIssue','Request Key')))}
          </button>
        )}
        {["applied","applying"].includes(state?.status) && (
          <div style={{ flex:2, padding:"7px 0", borderRadius:8, fontWeight:700, fontSize:11, background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.3)", color:"#eab308", textAlign:"center" }}>
            📋 Issue 신청 Done
          </div>
        )}
        {["unscanned","scanning"].includes(state?.status) && (
          <div style={{ flex:2, padding:"7px 0", borderRadius:8, fontWeight:700, fontSize:11, background:"rgba(148,163,184,0.06)", border:"1px solid rgba(148,163,184,0.15)", color:"var(--text-3)", textAlign:"center" }}>
            {state?.status === "scanning" ? ('🔍 ' + t('sc.scanning','Scanning...')) : ('⏸ ' + t('sc.preScan','Not Scanned'))}
          </div>
        )}
        <button onClick={onDetail}
          style={{ padding:"7px 10px", borderRadius:8, fontSize:11, cursor:"pointer", background: 'var(--surface)', border:"1px solid rgba(99,140,255,0.15)", color:"var(--text-3)" }}>
          📄
        </button>
      </div>
    </div>
  );
}

/* ─── Status Settings ─────────────────────────────────────────────────────────────── */
function statusConfig(status, linked) {
  if (linked) return { borderColor:"rgba(34,197,94,0.35)" };
  if (status === "found") return { borderColor:"rgba(168,85,247,0.4)" };
  if (status === "registered") return { borderColor:"rgba(34,197,94,0.25)" };
  if (status === "missing") return { borderColor:"rgba(239,68,68,0.2)" };
  if (status === "applied") return { borderColor:"rgba(234,179,8,0.3)" };
  if (status === "scanning") return { borderColor:"rgba(79,142,247,0.4)" };
  return { borderColor:"rgba(99,140,255,0.1)" };
}

function StatusPill({ status, linked }) {
  const { t } = useI18n();
  if (linked) return <Pill color="#22c55e" label={'✅ ' + t('sc.linkedActive','Linked Active')} />;
  const map = {
    registered: ["#22c55e", '🔑 ' + t('sc.statusRegistered','Registered')],
    found:      ["#a855f7", '🔍 ' + t('sc.statusFound','Key Detected')],
    missing:    ["#ef4444", '❌ ' + t('sc.statusMissing','No Key')],
    applied:    ["#eab308", '📋 ' + t('sc.statusApplied','Requested')],
    applying:   ["#eab308", '⏳ ' + t('sc.statusApplying','Requesting')],
    scanning:   ["#4f8ef7", '🔍 ' + t('sc.statusScanning','Scanning')],
  };
  const [c, l] = map[status] || ["#8da4c4", '⏸ ' + t('sc.statusUnscanned','Unscanned')];
  return <Pill color={c} label={l} />;
}

function Pill({ color, label }) {
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99,
      background:`${color}14`, color, border:`1px solid ${color}28` }}>
      {label}
    </span>
  );
}

/* ─── Auto 획득 불가 안내 Panel ───────────────────────────────────────────────── */
function AutoGuidePanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const oauthChannels = CHANNELS.filter(c => !c.autoAcquire && c.autoOAuth);
  const manualChannels = CHANNELS.filter(c => !c.autoAcquire && !c.autoOAuth);

  return (
    <div className="card card-glass fade-up" style={{ borderColor:"rgba(234,179,8,0.2)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>📖</span>
          <div>
            <div style={{ fontWeight:800, fontSize:13 }}>{t('sc.guideTitle','Channels Requiring Manual Setup')}</div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>
              {oauthChannels.length + manualChannels.length}개 Channel은 User 직접 동의/Issue이 필요합니다
            </div>
          </div>
        </div>
        <span style={{ color:"var(--text-3)", fontSize:12 }}>{open ? "{t('sc.collapse','Collapse')}" : "{t('sc.expand','Expand')}"}</span>
      </div>

      {open && (
        <div style={{ marginTop:16, display:"grid", gap:12 }}>
          {/* OAuth 필요 */}
          <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(79,142,247,0.05)", border:"1px solid rgba(79,142,247,0.15)" }}>
            <div style={{ fontWeight:800, fontSize:12, color:"#4f8ef7", marginBottom:10 }}>
              🔐 OAuth 2.0 로그인 필요 Channel ({oauthChannels.length}개)
            </div>
            <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.8, marginBottom:10 }}>
              아래 Channel은 <b>User가 직접 해당 Platform에 로그인하여 Permission 동의</b>를 해야 합니다.<br/>
              Geniego-ROI가 Auto으로 토큰을 가져올 Count 없는 이유: PersonalInfo보호법 및 각 Platform의 보안 정책상
              서드파티가 User 자격증명을 직접 보관·전달하는 것이 금지되어 있습니다.
            </div>
            <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.12)", marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#4f8ef7", marginBottom:6 }}>✅ 해결 방법</div>
              <ol style={{ fontSize:11, color:"var(--text-2)", lineHeight:2, margin:0, paddingLeft:16 }}>
                <li>아래 Channel의 <b>"OAuth Connect" Button</b>을 Clicks → 새 창에서 해당 Platform 로그인</li>
                <li>Permission 동의 Screen에서 <b>"Allow"</b> Clicks → Auto으로 Access Token Count신</li>
                <li>Geniego-ROI가 Token을 암호화 Save하고 <b>Auto Sync Run</b></li>
              </ol>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
              {oauthChannels.map(ch => (
                <div key={ch.key} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(9,15,30,0.5)", border:"1px solid rgba(79,142,247,0.12)", display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:16 }}>{ch.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ch.name}</div>
                    <div style={{ fontSize:9, color:"var(--text-3)" }}>{ch.reason}</div>
                  </div>
                  <a href={ch.issueUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:9, padding:"3px 8px", borderRadius:6, background:"rgba(79,142,247,0.12)", color:"#4f8ef7", border:"1px solid rgba(79,142,247,0.3)", textDecoration:"none", whiteSpace:"nowrap", fontWeight:700 }}>
                    {t('sc.devConsole','Dev Console')} →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Count동 Issue 필요 */}
          <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.15)" }}>
            <div style={{ fontWeight:800, fontSize:12, color:"#f97316", marginBottom:10 }}>
              📋 판매자센터 직접 Issue 필요 Channel ({manualChannels.length}개)
            </div>
            <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.8, marginBottom:10 }}>
              아래 Channel은 각 Platform의 <b>판매자센터/개발자센터에서 API 키를 직접 Copy</b>해야 합니다.<br/>
              &quot;Issue 신청&quot; Button을 Clicks하면 Geniego-ROI가 신청을 대신 처리하고 키를 Email로 Count신합니다.
            </div>
            <div style={{ display:"grid", gap:6 }}>
              {manualChannels.slice(0, 6).map(ch => (
                <div key={ch.key} style={{ padding:"8px 12px", borderRadius:8, background:"rgba(9,15,30,0.5)", border:"1px solid rgba(249,115,22,0.1)", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{ch.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>{ch.name}</div>
                    <div style={{ fontSize:10, color:"var(--text-3)", lineHeight:1.6 }}>📌 {ch.guide}</div>
                  </div>
                  <a href={ch.issueUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:9, padding:"3px 8px", borderRadius:6, background:"rgba(249,115,22,0.1)", color:"#f97316", border:"1px solid rgba(249,115,22,0.3)", textDecoration:"none", whiteSpace:"nowrap", fontWeight:700 }}>
                    신청 →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 상세 Modal ─────────────────────────────────────────────────────────────── */
function DetailModal({ ch, state, isLinking, isApplying, onAutoLink, onApply, onClose }) {
  const { t } = useI18n();
  if (!ch) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:"min(600px,94vw)", maxHeight:"85vh", overflowY:"auto", background:"linear-gradient(180deg,var(--surface),#090f1e)", border:"1px solid rgba(99,140,255,0.2)", borderRadius:20, padding:28, boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:44, height:44, borderRadius:12, fontSize:22, display:"flex", alignItems:"center",
              justifyContent:"center", background:`${ch.color}18`, border:`1px solid ${ch.color}33` }}>{ch.icon}</div>
            <div>
              <div style={{ fontWeight:800, fontSize:16 }}>{ch.name}</div>
              <StatusPill status={state?.status} linked={state?.linked} />
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-3)", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        {/* Issue 가이드 */}
        <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(79,142,247,0.05)", border:"1px solid rgba(79,142,247,0.15)", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#4f8ef7", marginBottom:6 }}>📖 Issue 방법</div>
          <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.7 }}>{ch.guide}</div>
        </div>

        {/* 이유 */}
        <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.15)", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#eab308", marginBottom:4 }}>
            {ch.autoAcquire ? "✅ Auto Issue 가능" : "⚠ Count동 획득 필요"}
          </div>
          <div style={{ fontSize:11, color:"var(--text-2)" }}>{ch.reason}</div>
        </div>

        {/* Feature Tag */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", marginBottom:8 }}>Integration 시 Activate Feature</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ch.capabilities.map(cap => (
              <span key={cap} style={{ fontSize:10, padding:"4px 10px", borderRadius:99,
                background:`${ch.color}14`, color:ch.color, border:`1px solid ${ch.color}22`, fontWeight:700 }}>
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Action */}
        <div style={{ display:"flex", gap:10 }}>
          <a href={ch.issueUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex:1, padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:700, textAlign:"center", background: 'var(--surface)', border:"1px solid rgba(99,140,255,0.2)", color:"var(--text-2)", textDecoration:"none" }}>
            {t('sc.openDevConsole','Open Dev Console')}
          </a>
          {state?.status === "found" && (
            <button onClick={() => { onAutoLink(); onClose(); }} disabled={isLinking}
              style={{ flex:2, padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", border:"none", background:"linear-gradient(135deg,#22c55e,#14d9b0)", color: '#fff' }}>
              ⚡ Auto Sync Run
            </button>
          )}
          {state?.status === "missing" && (
            <button onClick={() => { onApply(); onClose(); }} disabled={isApplying}
              style={{ flex:2, padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", border:"none", background:"linear-gradient(135deg,#f97316,#eab308)", color: '#fff' }}>
              {ch.autoOAuth ? "🔐 OAuth Connect" : "📋 Issue 신청"}
            </button>
          )}
      </div>
      </div>
      </div>
  );
}
