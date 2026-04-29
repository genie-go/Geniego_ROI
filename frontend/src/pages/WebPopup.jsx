import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useI18n } from "../i18n";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useCurrency } from "../contexts/CurrencyContext.jsx";


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
  /* Enterprise Error Boundary */

  if (_pageError) return <ErrorFallback error={_pageError} onRetry={() => { _setPageError(null); _setRetryCount(c => c + 1); }} />;

  return (
    <div style={{ display: "flex", gap: 6, padding: "6px 0", flexWrap: "wrap" }}>
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
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 18px", borderLeft: "4px solid " + color }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>{label}</span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontWeight: 900, fontSize: 22, color, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ══ Overview Tab ══ */
function OverviewTab({ t }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <Kpi label={t("webPopup.statViews")} value={fmtK(0)} sub={t("webPopup.noData", "No data yet")} icon="👁️" />
        <Kpi label={t("webPopup.statConv")} value="0" sub={t("webPopup.noData", "No data yet")} color="#22c55e" icon="🎯" />
        <Kpi label={t("webPopup.active")} value="0" color="#3b82f6" icon="🟢" />
        <Kpi label={t("webPopup.inactive")} value="0" color="#9ca3af" icon="⏸️" />
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
          <tbody><tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>{t("webPopup.noData", "No popup data yet.")}</td></tr></tbody>
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
  const F=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=()=>{
    if(!form.name){alert("Popup name required");return;}
    setSaved(p=>[...p,{...form,tpl,layout,id:Date.now()}]);
    setForm({name:"",title:"",cta:"",discount:20,body:"",trigger:"exit",linkUrl:"",email:"",subtitle:""});
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
            <button onClick={()=>{setGenerating(true);setTimeout(()=>{setGenerating(false);setForm(p=>({...p,title:aiTopic||"Special Offer",body:"AI-generated promo copy for maximum conversion.",cta:"Get It Now →"}));},1500);}} disabled={generating}
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
              <button onClick={()=>setSaved(p=>p.filter(x=>x.id!==s.id))} style={{ padding:"6px 10px", borderRadius:6, border:"1px solid #fecaca", background:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", color:"#ef4444" }}>🗑</button>
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
  return (<div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
    <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 16 }}>⚙️ {t("webPopup.globalSettings")}</div>
    {settings.map(s => (<div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div><div style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>{t("webPopup." + s.key)}</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>{t("webPopup." + s.desc)}</div></div>
      <button onClick={() => setVals(p => ({ ...p, [s.key]: !p[s.key] }))}
        style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: vals[s.key] ? "#22c55e" : "#d1d5db", position: "relative", transition: "all .2s" }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: vals[s.key] ? 23 : 3, transition: "left .2s" }} />
      </button>
    </div>))}
  </div>);
}



/* ══ Guide Tab (Expanded 15-step) ══ */
function GuideTab({ t }) {
  const COLORS = ['#f97316','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4','#f59e0b','#ef4444','#8b5cf6','#10b981','#f97316','#6366f1','#14b8a6','#e11d48','#0ea5e9'];
  const steps = [];
  for (let i = 1; i <= 15; i++) { const title = t("webPopup.guideStep" + i + "Title", ""); if (title && !title.includes("webPopup.")) steps.push({ n: i, title, desc: t("webPopup.guideStep" + i + "Desc", ""), c: COLORS[i-1] }); }
  const tips = [];
  for (let i = 1; i <= 10; i++) { const tip = t("webPopup.guideTip" + i, ""); if (tip && !tip.includes("webPopup.")) tips.push(tip); }
  const tabFs = [{ n: "guideDashName", d: "guideDashDesc", icon: "📊" }, { n: "guideFeedName", d: "guideFeedDesc", icon: "🎨" }, { n: "guideTrendName", d: "guideTrendDesc", icon: "🔴" }, { n: "guideABName", d: "guideABDesc", icon: "🧪" }, { n: "guideAiDesignName", d: "guideAiDesignDesc", icon: "🤖" }, { n: "guideSettingsName", d: "guideSettingsDesc", icon: "⚙️" }, { n: "guideGuideName", d: "guideGuideDesc", icon: "📖" }];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, padding: "28px 24px", textAlign: "center", border: "1px solid #fed7aa" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb" }}>{t("webPopup.guideTitle")}</div>
        <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>{t("webPopup.guideSub")}</div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 16 }}>{t("webPopup.guideStepsTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {steps.map(s => (<div key={s.n} style={{ display: "flex", gap: 12, padding: 14, background: s.c+'08', borderRadius: 12, border: '1px solid '+s.c+'20' }}>
            <span style={{ width: 28, height: 28, borderRadius: 99, background: s.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.n}</span>
            <div><div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.6 }} >{s.title}</div><div>{s.desc}</div></div>
          </div>))}
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 16 }}>{t("webPopup.guideTabsTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
          {tabFs.map(tf => (<div key={tf.n} style={{ display: "flex", gap: 10, padding: 12, background: "#f9fafb", borderRadius: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{tf.icon}</span>
            <div><div style={{ fontWeight: 700, fontSize: 13, color: "#f97316" }}>{t("webPopup." + tf.n)}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>{t("webPopup." + tf.d)}</div></div>
          </div>))}
        </div>
      </div>
      {tips.length > 0 && <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, borderLeft: "4px solid #f97316" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", marginBottom: 12 }}>💡 {t("webPopup.guideTipsTitle")}</div>
        {tips.map((tip, i) => (<div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
          <span style={{ color: "#374151", fontWeight: 800, fontSize: 13, lineHeight: 1.6 }} >💡</span><span>{tip}</span>
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
        <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, padding: "20px 24px", border: "1px solid #fed7aa", marginBottom: 12 }}>
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
