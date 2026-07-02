import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useI18n } from "../i18n";
import { WP_GUIDE } from "./webPopupGuideI18n.js";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useCurrency } from "../contexts/CurrencyContext.jsx";
import { postJsonAuth, getJsonAuth, requestJsonAuth } from "../services/apiClient.js"; // [259차] ai/ad-copy · [261차] 웹팝업 CRUD/설정 영속
// 179차 — 데모 환경: 가상 웹팝업 성과(체험용). 판별은 정본(demoEnv) 사용.
import { IS_DEMO as _IS_DEMO } from "../utils/demoEnv.js";


/* ══ Demo/Prod Data Isolation Guard ══ */
function DataIsolationGuard({ isDemo, children }) {
  useEffect(() => {
    if (!isDemo) {
      const DEMO_MARKERS = ['demo_','mock_','test_','seed_','fake_','sample_','tmp_','__demo','__test'];
      const origSet = localStorage.setItem.bind(localStorage);
      localStorage.setItem = (k, v) => {
        const val = typeof v === 'string' ? v.toLowerCase() : '';
        if (DEMO_MARKERS.some(m => val.includes(m) || (typeof k === 'string' && k.toLowerCase().includes(m)))) {
          console.warn('[DataIsolation] Blocked demo data in production:', k);
          return;
        }
        origSet(k, v);
      };
      return () => { localStorage.setItem = origSet; };
    }
  }, [isDemo]);
  return children;
}

/* ══ Security ══ */
const XSS_RE = /(<script|javascript:|on\w+=|eval\(|document\.(cookie|domain))/i;
function usePopupSecurity() {
  const { addAlert } = useGlobalData();
  useEffect(() => {
    const h = e => { const v = e.target?.value || ""; if (XSS_RE.test(v)) { e.target.value = ""; e.preventDefault(); addAlert?.({ type: "warn", msg: "XSS blocked: " + v.slice(0, 30) }); } };
    document.addEventListener("input", h, true);
    return () => document.removeEventListener("input", h, true);
  }, [addAlert]);
}

const fmtK = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(v);
const TABS = ["tabOverview", "tabManage", "tabLive", "tabAB", "tabSettings", "tabGuide"];
const TAB_ICONS = ["📊", "🎨", "🔴", "🧪", "⚙️", "📖"];

/* ══ Pill Tab Bar ══ */
function PillTabs({ tabs, icons, active, setActive, t }) {
  return (
    <div className="page-subtabs" style={{ display: "flex", gap: 6, padding: "6px 0", flexWrap: "wrap", marginBottom: 12 }}>
      {tabs.map((k, i) => (
        <button key={k} onClick={() => setActive(i)}
          style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: active === i ? "#f97316" : "#f1f5f9", color: active === i ? "#fff" : "#374151", transition: "all .2s" }}>
          {icons[i]} {t("webPopup." + k)}
        </button>
      ))}
    </div>
  );
}

/* ══ KPI Card ══ */
function Kpi({ label, value, sub, color = "#f97316", icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "12px 18px", borderLeft: "4px solid " + color, display: "flex", alignItems: "center", gap: 14 }}>
      {icon && <span style={{ fontSize: 22, flex: "0 0 auto" }}>{icon}</span>}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 22, color }}>{value}</div>
        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>{label}</span>
        {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ══ Overview Tab ══ */
const _POPUP_TRIGGER_LABEL = { center_modal: "Center Modal", slide_in: "Slide-in", exit_intent: "Exit Intent", bottom_bar: "Bottom Bar", top_banner: "Top Banner" };
const _POPUP_STATUS_COLOR = { active: "#22c55e", scheduled: "#3b82f6", ended: "#9ca3af" };
/* [262차] 임베드 스니펫 — 머천트가 자사몰에 붙여넣는 로더 <script> 태그. 운영 전용(데모는 tenant 부재). */
function EmbedSnippet({ t }) {
  const [copied, setCopied] = useState(false);
  const tenant = (typeof localStorage !== "undefined" && localStorage.getItem("tenantId")) || "";
  const origin = (typeof window !== "undefined" && window.location && window.location.origin) || "https://roi.genie-go.com";
  const snippet = `<script src="${origin}/api/v424/web-popups/embed.js?tenant=${encodeURIComponent(tenant)}" async></script>`;
  const copy = () => { navigator.clipboard.writeText(snippet).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <div style={{ background: "linear-gradient(135deg,#fff7ed,#fffbeb)", border: "1px solid #fed7aa", borderRadius: 14, padding: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: "#9a3412", marginBottom: 6 }}>🔗 {t("webPopup.embedTitle", "사이트 임베드 코드")}</div>
      <div style={{ fontSize: 12, color: "#9a3412", opacity: 0.85, marginBottom: 10, lineHeight: 1.6 }}>{t("webPopup.embedDesc", "아래 코드를 자사몰 <head> 또는 </body> 직전에 한 번 붙여넣으면 활성 팝업이 방문자에게 자동 노출됩니다(트리거·전환 비콘 포함). 별도 로그인 불필요·자동 갱신.")}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <textarea readOnly rows={2} value={snippet} onClick={e => e.target.select()}
          style={{ flex: 1, boxSizing: "border-box", fontFamily: "monospace", fontSize: 11, padding: "10px 12px", borderRadius: 8, border: "1px solid #fed7aa", background: "#fff", color: "#0f172a", resize: "vertical" }} />
        <button onClick={copy} style={{ padding: "0 16px", fontSize: 12, fontWeight: 800, borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#f97316,#f7931e)", color: "#fff", whiteSpace: "nowrap" }}>
          {copied ? t("webPopup.embedCopied", "복사됨 ✓") : t("webPopup.embedCopy", "코드 복사")}
        </button>
      </div>
    </div>
  );
}

function OverviewTab({ t }) {
  // 공유 webPopupCampaigns에서 읽기 → AI 자동액션·CRM 연동으로 생성된 팝업까지 라이브 반영(데모·운영 동기화)
  const { webPopupCampaigns } = useGlobalData();
  // [262차] 운영: 백엔드 list(실 impressions/clicks/conversions 비콘집계) 로드 → Overview 실지표 배선.
  //   데모: 공유 state(가상 성과) 유지.
  const [liveRows, setLiveRows] = useState(null);
  useEffect(() => {
    if (_IS_DEMO) return;
    let alive = true;
    getJsonAuth('/api/v424/web-popups')
      .then(r => { if (alive && r && r.ok && Array.isArray(r.popups)) setLiveRows(r.popups); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const rows = _IS_DEMO ? (Array.isArray(webPopupCampaigns) ? webPopupCampaigns : [])
                        : (Array.isArray(liveRows) ? liveRows : []);
  const totalViews = rows.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalConv = rows.reduce((s, p) => s + (p.conversions || 0), 0);
  const active = rows.filter(p => p.status === "active").length;
  const inactive = rows.length - active;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {!_IS_DEMO && <EmbedSnippet t={t} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <Kpi label={t("webPopup.statViews")} value={fmtK(totalViews)} sub={rows.length ? `${rows.length} popups` : t("webPopup.noData", "No data yet")} icon="👁️" />
        <Kpi label={t("webPopup.statConv")} value={fmtK(totalConv)} sub={totalViews ? `CVR ${((totalConv / totalViews) * 100).toFixed(1)}%` : t("webPopup.noData", "No data yet")} color="#22c55e" icon="🎯" />
        <Kpi label={t("webPopup.active")} value={String(active)} color="#3b82f6" icon="🟢" />
        <Kpi label={t("webPopup.inactive")} value={String(inactive)} color="#9ca3af" icon="⏸️" />
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 12 }}>📈 {t("webPopup.popupPerf")}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280" }}>
            <th style={{ textAlign: "left", padding: 8 }}>{t("webPopup.colName")}</th>
            <th style={{ textAlign: "left", padding: 8 }}>{t("webPopup.colTrigger")}</th>
            <th style={{ textAlign: "left", padding: 8 }}>{t("webPopup.colStatus")}</th>
            <th style={{ textAlign: "right", padding: 8 }}>{t("webPopup.colViews")}</th>
            <th style={{ textAlign: "right", padding: 8 }}>{t("webPopup.colClicks")}</th>
            <th style={{ textAlign: "right", padding: 8 }}>{t("webPopup.colConv")}</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>{t("webPopup.noData", "No popup data yet.")}</td></tr>}
            {rows.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8, fontWeight: 600, color: "#1f2937" }}>{p.name}</td>
                <td style={{ padding: 8, color: "#6b7280" }}>{_POPUP_TRIGGER_LABEL[p.type] || p.type}</td>
                <td style={{ padding: 8 }}><span style={{ color: _POPUP_STATUS_COLOR[p.status] || "#6b7280", fontWeight: 700 }}>● {p.status}</span></td>
                <td style={{ padding: 8, textAlign: "right" }}>{(p.impressions || 0).toLocaleString()}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{(p.clicks || 0).toLocaleString()}</td>
                <td style={{ padding: 8, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{(p.conversions || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══ Template Presets ══ */
const TEMPLATES = [
  { id:"discount", icon:"🏷️", gradient:"linear-gradient(135deg,#ff6b35,#f7931e)", accent:"#ff6b35", badge:"🔥 HOT DEAL" },
  { id:"newsletter", icon:"📧", gradient:"linear-gradient(135deg,#667eea,#764ba2)", accent:"#667eea", badge:"📩 SUBSCRIBE" },
  { id:"cart", icon:"🛒", gradient:"linear-gradient(135deg,#f093fb,#f5576c)", accent:"#f5576c", badge:"⏰ DON'T MISS" },
  { id:"welcome", icon:"👋", gradient:"linear-gradient(135deg,#4facfe,#00f2fe)", accent:"#4facfe", badge:"🎉 WELCOME" },
  { id:"flash", icon:"⚡", gradient:"linear-gradient(135deg,#fa709a,#fee140)", accent:"#fa709a", badge:"⚡ FLASH SALE" },
  { id:"season", icon:"🌸", gradient:"linear-gradient(135deg,#a8edea,#fed6e3)", accent:"#43b99a", badge:"🌺 SEASONAL" },
  { id:"social", icon:"💬", gradient:"linear-gradient(135deg,#ffecd2,#fcb69f)", accent:"#e17055", badge:"⭐ TRENDING" },
  { id:"exit", icon:"🚪", gradient:"linear-gradient(135deg,#2c3e50,#4ca1af)", accent:"#4ca1af", badge:"👀 WAIT!" },
];
const LAYOUTS = ["center","fullwidth","slide-bottom","slide-right","corner","bar-top","bar-bottom","gamify"];
const TRIGGERS = ["triggerExit","triggerTime","triggerScroll","triggerInactive"];
const inp={width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #d1d5db",marginTop:4,fontSize:13,boxSizing:"border-box"};
const lbl={fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6};

/* ══ Live Preview ══ */
function PopupPreview({form,tpl,layout}){
  const t=TEMPLATES.find(x=>x.id===tpl)||TEMPLATES[0];
  const isBar=layout==="bar-top"||layout==="bar-bottom";
  const isCorner=layout==="corner";
  const isSlide=layout==="slide-bottom"||layout==="slide-right";
  if(isBar) return (
    <div style={{ background:t.gradient, borderRadius:10, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, color:"#fff" }}>
      <div style={{ display:"flex", gap:10, alignItems:"center", flex:1 }}>
        <span style={{ fontSize:18 }}>{t.icon}</span>
        <div><div style={{ fontWeight:800, fontSize:14 }}>{form.title||"Headline"}</div>
          <div style={{ fontSize:11, opacity:.85 }}>{form.body||"Promo text here"}</div></div>
      </div>
      <button style={{ padding:"8px 20px", borderRadius:8, border:"2px solid rgba(255,255,255,.5)", background:"rgba(255,255,255,.15)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>{form.cta||"Shop Now"}</button>
    </div>
  );
  if(isCorner) return (
    <div style={{ width:220, background:"#fff", borderRadius:16, boxShadow:"0 12px 40px rgba(0,0,0,.18)", overflow:"hidden" }}>
      <div style={{ background:t.gradient, padding:"14px 16px", position:"relative" }}>
        <div style={{ position:"absolute", top:8, right:8, width:20, height:20, borderRadius:10, background:"rgba(255,255,255,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", cursor:"pointer" }}>✕</div>
        {form.discount>0&&<div style={{ background:"#fff", color:t.accent, fontWeight:900, fontSize:20, borderRadius:8, padding:"4px 10px", display:"inline-block" }}>{form.discount}% OFF</div>}
        <div style={{ color:"#fff", fontWeight:800, fontSize:13, marginTop:6 }}>{form.title||"Special Offer"}</div>
      </div>
      <div style={{ padding:"12px 16px", fontSize:11, color:"#6b7280", marginBottom:10 }} ><div>{form.body||"Limited time deal"}</div>
        <button style={{ width:"100%", padding:"8px", borderRadius:8, border:"none", background:t.gradient, color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>{form.cta||"Get Deal"}</button></div>
    </div>
  );
  /* Center / Fullwidth / Slide / Gamify */
  const fw=layout==="fullwidth";
  return (
    <div style={{ width:fw?360:320, background:"#fff", borderRadius:fw?0:20, boxShadow:"0 20px 60px rgba(0,0,0,.22)", overflow:"hidden", position:"relative" }}>
      {/* Badge Ribbon */}
      <div style={{ position:"absolute", top:12, left:-6, background:t.accent, color:"#fff", fontWeight:800, fontSize:10, padding:"4px 14px 4px 10px", borderRadius:"0 4px 4px 0", zIndex:2, letterSpacing:1, boxShadow:"2px 2px 8px rgba(0,0,0,.15)" }}>{t.badge}</div>
      {/* Close btn */}
      <div style={{ position:"absolute", top:10, right:12, width:26, height:26, borderRadius:13, background:"rgba(0,0,0,.3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, cursor:"pointer", zIndex:2 }}>✕</div>
      {/* Hero Image Area */}
      <div style={{ background:t.gradient, padding:fw?"40px 28px":"32px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 30% 50%, rgba(255,255,255,.15) 0%, transparent 60%)" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>{t.icon}</div>
          <div style={{ fontWeight:900, fontSize:fw?24:20, color:"#fff", lineHeight:1.2, textShadow:"0 2px 8px rgba(0,0,0,.2)" }}>{form.title||"Amazing Offer!"}</div>
          {form.discount>0&&<div style={{ marginTop:10, display:"inline-block", background:"rgba(255,255,255,.2)", backdropFilter:"blur(4px)", borderRadius:10, padding:"6px 18px", fontWeight:900, fontSize:fw?28:22, color:"#fff", border:"2px solid rgba(255,255,255,.4)" }}>{form.discount}% OFF</div>}
          <div style={{ fontSize:13, color:"rgba(255,255,255,.9)", marginTop:8, lineHeight:1.6 }}>{form.body||"Don't miss this exclusive deal"}</div>
        </div>
      </div>
      {/* Bottom Area */}
      <div style={{ padding:"18px 24px 22px", textAlign:"center", background:layout==="gamify"?"linear-gradient(to bottom,#fff,#f0f7ff)":"#fff" }}>
        {layout==="gamify"&&<div style={{ fontSize:11, color:"#6b7280", marginBottom:8 }}>🎰 Spin the wheel for a chance to win!</div>}
        <button style={{ width:"100%", padding:"12px 0", borderRadius:10, border:"none", background:t.gradient, color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 4px 14px "+t.accent+"44", transition:"transform .15s" }}>{form.cta||"Get This Deal →"}</button>
        {form.linkUrl&&<div style={{ fontSize:11, color:t.accent, marginTop:8, fontWeight:600 }}>🔗 {form.linkUrl.replace(/https?:\/\//,"").slice(0,30)}</div>}
        <div style={{ fontSize:10, color:"#9ca3af", marginTop:8 }}>No spam · Unsubscribe anytime</div>
      </div>
    </div>
  );
}

/* ══ Manage Tab ══ */
function ManageTab({ t }) {
  const [form, setForm] = useState({ name:"", title:"", cta:"", discount:20, body:"", trigger:"exit", linkUrl:"", email:"", subtitle:"" });
  const [tpl, setTpl] = useState("discount");
  const [layout, setLayout] = useState("center");
  const [aiTheme, setAiTheme] = useState("aiThemeDiscount");
  const [aiTopic, setAiTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState([]);
  const { addWebPopup } = useGlobalData();
  const F=(k,v)=>setForm(p=>({...p,[k]:v}));

  // [261차] 운영: 저장 팝업을 백엔드(테넌트 스코프)에서 로드 → 새로고침 영속. 데모: 컨텍스트 유지(비배선).
  useEffect(() => {
    if (_IS_DEMO) return;
    let alive = true;
    getJsonAuth('/api/v424/web-popups')
      .then(r => { if (alive && r?.ok) setSaved((r.popups || []).map(p => ({ ...p, tpl: p.template, layout: p.layout, id: p.id }))); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const RESET = { name:"", title:"", cta:"", discount:20, body:"", trigger:"exit", linkUrl:"", email:"", subtitle:"" };
  const handleSave=async ()=>{
    if(!form.name){alert("Popup name required");return;}
    // 공유 상태에 생성 → OverviewTab 성과·CRM 연동에 라이브 반영
    const ptype = (layout==='bar-top'||layout==='bar-bottom') ? 'top_banner'
      : (layout==='slide-bottom'||layout==='slide-right'||layout==='corner') ? 'slide_in'
      : 'center_modal';
    const shared = { name:form.name, title:form.title||form.name, subtitle:form.subtitle, type:ptype, status:'active', template:tpl, trigger:form.trigger, btnText:form.cta, linkUrl:form.linkUrl };
    if (_IS_DEMO) {
      addWebPopup?.(shared);
      setSaved(p=>[...p,{...form,tpl,layout,id:Date.now()}]);
      setForm(RESET);
      return;
    }
    // 운영: 백엔드 영속(테넌트 스코프) → 새로고침·서빙 백엔드(active) 반영.
    try {
      const r = await postJsonAuth('/api/v424/web-popups', { ...form, ptype, type:ptype, template:tpl, tpl, layout, status:'active' });
      if (r?.ok && r.popup) {
        setSaved(p=>[{ ...r.popup, tpl:r.popup.template, layout:r.popup.layout, id:r.popup.id }, ...p]);
        addWebPopup?.(shared);
        setForm(RESET);
      } else { alert(t('webPopup.saveFail','팝업 저장에 실패했습니다.')); }
    } catch { alert(t('webPopup.saveFail','팝업 저장에 실패했습니다.')); }
  };

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* ─── BUILDER: Left=Form, Right=Preview ─── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:16, alignItems:"start" }}>
        {/* LEFT: Form */}
        <div style={{ display:"grid", gap:14 }}>
          {/* Template Selection */}
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:18 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1f2937", marginBottom:10 }}>🎨 Template Style</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
              {TEMPLATES.map(tp=>(<button key={tp.id} onClick={()=>setTpl(tp.id)}
                style={{ padding:"8px 4px", borderRadius:10, border:tpl===tp.id?"2px solid "+tp.accent:"1px solid #e5e7eb", background:tpl===tp.id?"#fafafa":"#fff", cursor:"pointer", textAlign:"center", transition:"all .15s" }}>
                <div style={{ fontSize:20 }}>{tp.icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:tpl===tp.id?tp.accent:"#6b7280", marginTop:2 }}>{t("webPopup.aiTheme"+tp.id.charAt(0).toUpperCase()+tp.id.slice(1),tp.id)}</div>
              </button>))}
            </div>
          </div>
          {/* Layout Selection */}
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:18 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1f2937", marginBottom:10 }}>📐 Layout</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {LAYOUTS.map(l=>(<button key={l} onClick={()=>setLayout(l)}
                style={{ padding:"5px 12px", borderRadius:8, border:layout===l?"2px solid #f97316":"1px solid #e5e7eb", background:layout===l?"#fff7ed":"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:layout===l?"#f97316":"#6b7280" }}>{l}</button>))}
            </div>
          </div>
          {/* Content Fields */}
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:18 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1f2937", marginBottom:12 }}>✏️ {t("webPopup.createPopup")}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <label style={lbl}>{t("webPopup.popupName")}<input value={form.name} onChange={e=>F("name",e.target.value)} placeholder={t("webPopup.popupNamePh")} style={inp}/></label>
              <label style={lbl}>{t("webPopup.title")}<input value={form.title} onChange={e=>F("title",e.target.value)} placeholder={t("webPopup.titlePh")} style={inp}/></label>
              <label style={lbl}>{t("webPopup.ctaBtn")}<input value={form.cta} onChange={e=>F("cta",e.target.value)} placeholder={t("webPopup.buyNow")} style={inp}/></label>
              <label style={lbl}>{t("webPopup.discountPct")}<input type="number" value={form.discount} onChange={e=>F("discount",+e.target.value)} style={inp}/></label>
            </div>
            <label style={{ ...lbl, marginTop:8, ...inp, resize:"vertical" }} >{t("webPopup.bodyContent")}<textarea value={form.body} onChange={e=>F("body",e.target.value)} placeholder={t("webPopup.bodyPh")} rows={2}/></label>
            <label style={{ ...lbl, marginTop:8 }}>{t("webPopup.linkUrl")}<input value={form.linkUrl} onChange={e=>F("linkUrl",e.target.value)} placeholder={t("webPopup.linkUrlPh")} style={inp}/></label>
            {/* Triggers */}
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:6 }}>{t("webPopup.triggerType")}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {TRIGGERS.map(tr=>{const k=tr.replace("trigger","").toLowerCase();return(<button key={tr} onClick={()=>F("trigger",k)}
                  style={{ padding:"5px 12px", borderRadius:8, border:form.trigger===k?"2px solid #f97316":"1px solid #d1d5db", background:form.trigger===k?"#fff7ed":"#fff", fontSize:11, fontWeight:600, cursor:"pointer", color:"#374151" }}>{t("webPopup."+tr)}</button>);})}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={handleSave} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>💾 {t("webPopup.createPopup")}</button>
              <button onClick={()=>setForm({name:"",title:"",cta:"",discount:20,body:"",trigger:"exit",linkUrl:"",email:"",subtitle:""})} style={{ padding:"10px 16px", borderRadius:10, border:"1px solid #d1d5db", background:"#fff", color:"#6b7280", fontWeight:600, fontSize:12, cursor:"pointer" }}>↺ Reset</button>
            </div>
          </div>
          {/* AI Design */}
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:18 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1f2937", marginBottom:6 }}>🤖 {t("webPopup.aiDesignTitle")}</div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>{t("webPopup.aiDesignDesc")}</div>
            <input value={aiTopic} onChange={e=>setAiTopic(e.target.value)} placeholder={t("webPopup.aiTopicPh")} style={{ ...inp, marginBottom:8 }}/>
            <button onClick={async()=>{
                // [259차] 과거 setTimeout 후 하드코딩 영어 카피 주입(가짜 AI)이었음 → 실 AI 엔드포인트 배선.
                //   운영은 AI 자격증명 등록 시에만 실 생성, 미설정 시 정직 안내(가짜 카피 미주입).
                setGenerating(true);
                try {
                  const r = await postJsonAuth('/api/ai/generate/ad-copy', { product: (aiTopic||'').trim() || t('webPopup.aiDefaultTopic','프로모션'), platform: 'web', goal: t('webPopup.aiGoal','전환') });
                  const item = Array.isArray(r?.result) ? r.result[0] : r?.result;
                  if (r?.ok && item) { setForm(p=>({...p, title:item.headline||p.title, body:item.body||p.body, cta:item.cta||p.cta})); }
                  else { alert(t('webPopup.aiUnavailable','AI 자동생성을 사용하려면 설정에서 AI 자격증명을 등록하세요.')); }
                } catch { alert(t('webPopup.aiFail','AI 자동생성에 실패했습니다.')); }
                finally { setGenerating(false); }
              }} disabled={generating}
              style={{ padding:"10px 20px", borderRadius:10, border:"none", background:generating?"#d1d5db":"linear-gradient(135deg,#8b5cf6,#6366f1)", color:"#fff", fontWeight:700, fontSize:13, cursor:generating?"wait":"pointer" }}>
              {generating?t("webPopup.aiGenerating"):("🎨 "+t("webPopup.aiGenerate"))}</button>
          </div>
        </div>
        {/* RIGHT: Live Preview */}
        <div style={{ position:"sticky", top:0 }}>
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:18 }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1f2937", marginBottom:12 }}>👁️ {t("webPopup.preview","Live Preview")}</div>
            <div style={{ background:"#f1f5f9", borderRadius:12, padding:20, display:"flex", alignItems:"center", justifyContent:"center", minHeight:300 }}>
              <PopupPreview form={form} tpl={tpl} layout={layout}/>
            </div>
          </div>
        </div>
      </div>
      {/* ─── Saved Popups ─── */}
      {saved.length>0&&<div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:18 }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#1f2937", marginBottom:12 }}>📋 Saved Popups ({saved.length})</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
          {saved.map(s=>(<div key={s.id} style={{ border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
            <div style={{ background:(TEMPLATES.find(x=>x.id===s.tpl)||TEMPLATES[0]).gradient, padding:"12px 14px", color:"#fff" }}>
              <div style={{ fontWeight:800, fontSize:13 }}>{s.name}</div>
              <div style={{ fontSize:11, opacity:.8 }}>{s.title} · {s.layout}</div>
            </div>
            <div style={{ padding:"10px 14px", display:"flex", gap:6 }}>
              <button onClick={()=>{setForm(s);setTpl(s.tpl);setLayout(s.layout);}} style={{ flex:1, padding:"6px", borderRadius:6, border:"1px solid #d1d5db", background:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", color:"#374151" }}>{t("webPopup.editPopup","Edit")}</button>
              <button onClick={async()=>{ if(!_IS_DEMO){ try{ await requestJsonAuth(`/api/v424/web-popups/${s.id}`, 'DELETE'); }catch{} } setSaved(p=>p.filter(x=>x.id!==s.id)); }} style={{ padding:"6px 10px", borderRadius:6, border:"1px solid #fecaca", background:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", color:"#ef4444" }}>🗑</button>
            </div>
          </div>))}
        </div>
      </div>}
    </div>
  );
}

/* ══ Live Test Tab ══ */
function LiveTab({ t }) {
  const [detecting, setDetecting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  useEffect(() => {
    if (!detecting) return;
    const h = e => { if (e.clientY < 10) setShowPopup(true); };
    document.addEventListener("mousemove", h);
    return () => document.removeEventListener("mousemove", h);
  }, [detecting]);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 8 }}>🔴 {t("webPopup.live")}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{t("webPopup.howItWorks")}</div>
        <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(i => (<div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 24, height: 24, borderRadius: 99, background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i}</span>
            <span style={{ fontSize: 13, color: "#374151" }}>{t("webPopup.step" + i)}</span>
          </div>))}
        </div>
        <button onClick={() => { setDetecting(!detecting); setShowPopup(false); }} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: detecting ? "#ef4444" : "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {detecting ? ("⏹ " + t("webPopup.liveMoveUp")) : ("▶ " + t("webPopup.startDetect"))}</button>
      </div>
      {showPopup && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPopup(false)}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 400, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", marginBottom: 8 }}>{t("webPopup.limitedOffer")}</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>{t("webPopup.instantDiscount")}</div>
          <button style={{ padding: "10px 32px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{t("webPopup.buyNow")}</button>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>{t("webPopup.closingSoon")}</div>
        </div>
      </div>}
    </div>
  );
}

/* ══ A/B Tab ══ */
function ABTab({ t }) {
  return (<div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
    <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 8 }}>🧪 {t("webPopup.abResult")}</div>
    <div style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7280" }}>{t("webPopup.noAbTests")}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{t("webPopup.noAbTestsDesc")}</div>
    </div>
  </div>);
}

/* ══ Settings Tab ══ */
function SettingsTab({ t }) {
  const settings = [
    { key: "settingExit", desc: "settingExitDesc", def: true }, { key: "settingTab", desc: "settingTabDesc", def: false },
    { key: "settingInactive", desc: "settingInactiveDesc", def: true }, { key: "settingMobile", desc: "settingMobileDesc", def: true },
    { key: "settingCookie", desc: "settingCookieDesc", def: true }, { key: "settingGdpr", desc: "settingGdprDesc", def: false },
  ];
  const [vals, setVals] = useState(() => Object.fromEntries(settings.map(s => [s.key, s.def])));

  // [261차] 전역설정 영속 — 운영: 백엔드(테넌트 스코프), 데모: localStorage. 저장버튼 없던 미배선 토글 보강.
  useEffect(() => {
    if (_IS_DEMO) { try { const s = JSON.parse(localStorage.getItem('wp_settings') || 'null'); if (s) setVals(v => ({ ...v, ...s })); } catch {} return; }
    getJsonAuth('/api/v424/web-popup-settings')
      .then(r => { if (r?.ok && r.settings && Object.keys(r.settings).length) setVals(v => ({ ...v, ...r.settings })); })
      .catch(() => {});
  }, []);
  const toggle = (key) => setVals(prev => {
    const next = { ...prev, [key]: !prev[key] };
    if (_IS_DEMO) { try { localStorage.setItem('wp_settings', JSON.stringify(next)); } catch {} }
    else { requestJsonAuth('/api/v424/web-popup-settings', 'PUT', { settings: next }).catch(() => {}); }
    return next;
  });

  return (<div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
    <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 16 }}>⚙️ {t("webPopup.globalSettings")}</div>
    {settings.map(s => (<div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div><div style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>{t("webPopup." + s.key)}</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>{t("webPopup." + s.desc)}</div></div>
      <button onClick={() => toggle(s.key)}
        style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: vals[s.key] ? "#22c55e" : "#d1d5db", position: "relative", transition: "all .2s" }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: vals[s.key] ? 23 : 3, transition: "left .2s" }} />
      </button>
    </div>))}
  </div>);
}



/* ══ Guide Tab (Expanded 15-step) ══ */
function GuideTab() {
  const { lang } = useI18n();
  const G = WP_GUIDE[lang] || WP_GUIDE.en;
  const g = (k) => G[k] || WP_GUIDE.en[k] || WP_GUIDE.ko[k] || '';
  const COLORS = ['#f97316','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4','#f59e0b','#ef4444'];
  const steps = [];
  for (let i = 1; i <= 8; i++) { const title = g("guideStep" + i + "Title"); if (title) steps.push({ n: i, title, desc: g("guideStep" + i + "Desc"), c: COLORS[i-1] }); }
  const tips = [];
  for (let i = 1; i <= 7; i++) { const tip = g("guideTip" + i); if (tip) tips.push(tip); }
  const tabFs = [{ n: "guideDashName", d: "guideDashDesc", icon: "📊" }, { n: "guideFeedName", d: "guideFeedDesc", icon: "🎨" }, { n: "guideTrendName", d: "guideTrendDesc", icon: "🔴" }, { n: "guideABName", d: "guideABDesc", icon: "🧪" }, { n: "guideAiDesignName", d: "guideAiDesignDesc", icon: "🤖" }, { n: "guideSettingsName", d: "guideSettingsDesc", icon: "⚙️" }, { n: "guideGuideName", d: "guideGuideDesc", icon: "📖" }];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, padding: "28px 24px", textAlign: "center", border: "1px solid #fed7aa" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb" }}>{g("guideTitle")}</div>
        <div style={{ fontSize: 13, color: "#374151", marginTop: 6, maxWidth: 620, margin: "6px auto 0", lineHeight: 1.7 }}>{g("guideSub")}</div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 16 }}>{g("guideStepsTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {steps.map(s => (<div key={s.n} style={{ display: "flex", gap: 12, padding: 14, background: s.c+'08', borderRadius: 12, border: '1px solid '+s.c+'20' }}>
            <span style={{ width: 28, height: 28, borderRadius: 99, background: s.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.n}</span>
            <div><div style={{ fontWeight: 700, fontSize: 13, color: s.c, lineHeight: 1.5 }}>{s.title}</div><div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.6 }}>{s.desc}</div></div>
          </div>))}
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 16 }}>{g("guideTabsTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
          {tabFs.map(tf => (<div key={tf.n} style={{ display: "flex", gap: 10, padding: 12, background: "#f9fafb", borderRadius: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{tf.icon}</span>
            <div><div style={{ fontWeight: 700, fontSize: 13, color: "#f97316" }}>{g(tf.n)}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>{g(tf.d)}</div></div>
          </div>))}
        </div>
      </div>
      {tips.length > 0 && <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, borderLeft: "4px solid #f97316" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 12 }}>💡 {g("guideTipsTitle")}</div>
        {tips.map((tip, i) => (<div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
          <span style={{ color: "#374151", fontWeight: 800, fontSize: 13, lineHeight: 1.6 }} >💡</span><span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>{tip}</span>
        </div>))}
      </div>}
    </div>
  );
}

/* ══ MAIN ══ */

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

export default function WebPopup() {
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);

  const { t } = useI18n();
  const { isDemo } = useGlobalData();
  const { fmt } = useCurrency();
  usePopupSecurity();
  const [activeTab, setActiveTab] = useState(0);
  return (
    <DataIsolationGuard isDemo={isDemo}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
      <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>
        <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, padding: "13px 24px", border: "1px solid #fed7aa", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎯</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>{t("webPopup.heroTitle", "Web Popup Manager")}</div>
              <div style={{ fontSize: 12, color: "#374151" }}>{t("webPopup.heroDesc")}</div>
            </div>
          </div>
        </div>
        {isDemo && <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 6, fontWeight: 700 }}>🔒 {t("webPopup.demoIsolation","Demo environment — data is isolated from production")}</div>}
        <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 10 }}>● {t("webPopup.liveSyncMsg")}</div>
        <PillTabs tabs={TABS} icons={TAB_ICONS} active={activeTab} setActive={setActiveTab} t={t} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
        {activeTab === 0 && <OverviewTab t={t} />}
        {activeTab === 1 && <ManageTab t={t} />}
        {activeTab === 2 && <LiveTab t={t} />}
        {activeTab === 3 && <ABTab t={t} />}
        {activeTab === 4 && <SettingsTab t={t} />}
        {activeTab === 5 && <GuideTab t={t} />}
      </div>
    </div>
    </DataIsolationGuard>
  );
}
