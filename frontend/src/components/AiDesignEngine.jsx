import React, { useState, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../i18n/index.js";

/* ══════════════════════════════════════════════════════════
   AiDesignEngine — Enterprise AI Creative Marketing Generator
   Platform: TikTok, Meta, Instagram, YouTube, Kakao, GDN, Popup
   ══════════════════════════════════════════════════════════ */

const PLATFORMS = [
  { id:"popup", label:"Web Popup", icon:"🎯", w:460, h:320, ratio:"16:9" },
  { id:"instagram_feed", label:"Instagram Feed", icon:"📸", w:540, h:540, ratio:"1:1" },
  { id:"instagram_story", label:"IG Story/Reels", icon:"📱", w:270, h:480, ratio:"9:16" },
  { id:"tiktok", label:"TikTok", icon:"🎵", w:270, h:480, ratio:"9:16" },
  { id:"meta_feed", label:"Meta/FB Feed", icon:"📘", w:600, h:315, ratio:"1.91:1" },
  { id:"kakao", label:"KakaoTalk", icon:"💬", w:360, h:360, ratio:"1:1" },
  { id:"youtube_thumb", label:"YouTube Thumbnail", icon:"▶️", w:640, h:360, ratio:"16:9" },
  { id:"youtube_short", label:"YouTube Shorts", icon:"📺", w:270, h:480, ratio:"9:16" },
  { id:"youtube_instream", label:"YouTube In-Stream", icon:"🎬", w:640, h:360, ratio:"16:9" },
  { id:"youtube_bumper", label:"YouTube Bumper", icon:"⚡", w:640, h:360, ratio:"16:9" },
  { id:"gdn", label:"Google Display", icon:"🌐", w:336, h:280, ratio:"6:5" },
  { id:"display_banner", label:"Display Banner", icon:"🖥️", w:728, h:90, ratio:"8:1" },
  { id:"mobile_popup", label:"Mobile Popup", icon:"📲", w:320, h:480, ratio:"2:3" },
  { id:"landing_hero", label:"Landing Hero", icon:"🏠", w:720, h:300, ratio:"12:5" },
];

const THEMES = [
  { id:"discount", label:"Discount/Sale", icon:"🎁", colors:["#f97316","#ef4444","#dc2626"] },
  { id:"welcome", label:"Welcome", icon:"👋", colors:["#22c55e","#10b981","#059669"] },
  { id:"flash", label:"Flash Sale", icon:"⚡", colors:["#eab308","#f97316","#ef4444"] },
  { id:"season", label:"Seasonal", icon:"🌿", colors:["#a855f7","#6366f1","#4f46e5"] },
  { id:"luxury", label:"Luxury/Premium", icon:"💎", colors:["#1e1e2e","#2d2b55","#0f0c29"] },
  { id:"newsletter", label:"Newsletter/Lead", icon:"✉️", colors:["#4f8ef7","#6366f1","#8b5cf6"] },
  { id:"cart", label:"Cart Recovery", icon:"🛒", colors:["#ef4444","#dc2626","#b91c1c"] },
  { id:"birthday", label:"Birthday/Event", icon:"🎂", colors:["#ec4899","#f43f5e","#e11d48"] },
  { id:"game", label:"Gamified/Interactive", icon:"🎮", colors:["#06b6d4","#0891b2","#0e7490"] },
  { id:"product", label:"Product Launch", icon:"🚀", colors:["#8b5cf6","#7c3aed","#6d28d9"] },
];

const INTERACTIVE_TYPES = [
  { id:"spin", label:"Spin-to-Win", icon:"🎰" },
  { id:"scratch", label:"Scratch Card", icon:"🎫" },
  { id:"quiz", label:"Quiz Recommend", icon:"❓" },
  { id:"progress", label:"Progress Unlock", icon:"📊" },
  { id:"countdown", label:"Countdown Deal", icon:"⏱️" },
  { id:"swipe", label:"Swipe Reveal", icon:"👆" },
];

const POPUP_TRIGGERS = [
  { id:"exit_intent", label:"Exit Intent" },
  { id:"scroll_50", label:"Scroll 50%" },
  { id:"time_delay", label:"Time Delay (5s)" },
  { id:"first_visit", label:"First Visit" },
  { id:"returning", label:"Returning User" },
  { id:"cart_abandon", label:"Cart Abandon" },
];

function renderCanvas(canvas, prompt, theme, platform) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const th = THEMES.find(t=>t.id===theme) || THEMES[0];
  const grd = ctx.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,th.colors[0]); grd.addColorStop(0.5,th.colors[1]); grd.addColorStop(1,th.colors[2]);
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
  const seed = (prompt||"").length + theme.length;
  for(let i=0;i<35;i++){
    const x=((seed*7+i*137)%W), y=((seed*13+i*89)%H), r=4+(i%20)*3;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(255,255,255,${0.06+(i%5)*0.02})`); g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle="rgba(255,255,255,0.05)"; ctx.lineWidth=1;
  for(let i=0;i<6;i++){ctx.beginPath();ctx.arc((seed*3+i*97)%W,(seed*11+i*53)%H,30+i*18,0,Math.PI*2);ctx.stroke();}
  const fs=Math.max(14,Math.min(28,W/16));
  ctx.font=`900 ${fs}px 'Inter','Noto Sans KR',sans-serif`;
  ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=8;
  const txt=prompt||th.label;
  const lines=txt.length>28?[txt.slice(0,28),txt.slice(28,56)]:[txt];
  lines.forEach((l,i)=>ctx.fillText(l,W/2,H/2-(lines.length-1)*fs/2+i*fs*1.3));
  ctx.shadowBlur=0; ctx.font="bold 10px Inter,sans-serif"; ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.textAlign="right";
  const pl=PLATFORMS.find(p=>p.id===platform);
  ctx.fillText(`${pl?.label||platform} · Geniego AI`,W-10,H-10);
  ctx.font="bold 9px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillStyle="rgba(255,255,255,0.2)";
  ctx.fillText("Geniego-ROI",10,H-10);
  return canvas.toDataURL("image/png");
}

/* CTA copy suggestions */
const CTA_OPTIONS = ["Shop Now","Get 20% Off","Try Free","Learn More","Subscribe","Claim Reward","Buy Now","Start Today","Join Us","Explore"];

export default function AiDesignEngine({ defaultPlatform="popup" }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);

  const [platform, setPlatform] = useState(defaultPlatform);
  const [theme, setTheme] = useState("discount");
  const [prompt, setPrompt] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("Shop Now");
  const [interactiveType, setInteractiveType] = useState("");
  const [popupTrigger, setPopupTrigger] = useState("exit_intent");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeSection, setActiveSection] = useState("platform");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  /* Event Period / Schedule */
  const today = new Date().toISOString().slice(0,10);
  const weekLater = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(weekLater);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul');

  const currentPlatform = useMemo(()=>PLATFORMS.find(p=>p.id===platform)||PLATFORMS[0],[platform]);

  const generate = useCallback(()=>{
    setGenerating(true); setResult(null);
    setTimeout(()=>{
      const c=canvasRef.current; if(!c)return;
      c.width=currentPlatform.w; c.height=currentPlatform.h;
      const dataUrl=renderCanvas(c, prompt||headline||theme, theme, platform);
      const res={
        id:Date.now(), platform, theme, prompt, headline, subheadline, ctaText,
        interactiveType, popupTrigger, dataUrl,
        size:`${currentPlatform.w*2}×${currentPlatform.h*2}`,
        ratio:currentPlatform.ratio,
        timestamp:new Date().toISOString(),
        platformLabel:currentPlatform.label,
      };
      setResult(res);
      setHistory(prev=>[res,...prev].slice(0,20));
      setGenerating(false);
    },1500);
  },[platform,theme,prompt,headline,subheadline,ctaText,interactiveType,popupTrigger,currentPlatform]);

  const handleUpload = useCallback((file)=>{
    if(!file||file.size>5*1024*1024) return;
    const r=new FileReader();
    r.onload=(e)=>{
      const res={id:Date.now(),dataUrl:e.target.result,fileName:file.name,custom:true,platform,theme,timestamp:new Date().toISOString()};
      setResult(res); setHistory(prev=>[res,...prev].slice(0,20));
    }; r.readAsDataURL(file);
  },[platform,theme]);

  const downloadResult = useCallback(()=>{
    if(!result?.dataUrl) return;
    const a=document.createElement("a"); a.href=result.dataUrl;
    a.download=`geniego_${platform}_${theme}_${Date.now()}.png`; a.click();
  },[result,platform,theme]);

  const CS={
    card:{background:"#fff",borderRadius:14,border:"1px solid rgba(0,0,0,0.06)",padding:18,marginBottom:0},
    section:{marginBottom:16},
    label:{fontSize:13,fontWeight:800,color:"#1e293b",marginBottom:10,display:"flex",alignItems:"center",gap:6},
    chip:(active,color)=>({padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:active?700:500,border:`1.5px solid ${active?color:"rgba(0,0,0,0.06)"}`,background:active?color+"12":"rgba(241,245,249,0.7)",color:active?color:"#64748b",cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.2s"}),
    input:{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(0,0,0,0.08)",background:"rgba(241,245,249,0.5)",color:"#1e293b",fontSize:12,boxSizing:"border-box",outline:"none"},
    btn:(disabled)=>({padding:"10px 24px",borderRadius:10,border:"none",fontSize:13,fontWeight:800,background:disabled?"#cbd5e1":"linear-gradient(135deg,#4f8ef7,#6366f1)",color:"#fff",cursor:disabled?"wait":"pointer",boxShadow:disabled?"none":"0 4px 16px rgba(79,142,247,0.3)",transition:"all 0.2s",minWidth:160}),
  };

  const needsSchedule = ["popup","mobile_popup","landing_hero"].includes(platform) || ["flash","season","birthday","cart","welcome"].includes(theme);

  const SECTIONS=[
    {id:"platform",icon:"📱",label:t("marketing.aiSectionPlatform","Platform & Size")},
    {id:"theme",icon:"🎨",label:t("marketing.aiSectionTheme","Theme & Style")},
    {id:"content",icon:"✏️",label:t("marketing.aiSectionContent","Content & Copy")},
    {id:"interactive",icon:"🎮",label:t("marketing.aiSectionInteractive","Interactive & Triggers")},
    ...(needsSchedule ? [{id:"schedule",icon:"📅",label:t("marketing.aiSectionSchedule","Event Period")}] : []),
    {id:"generate",icon:"🚀",label:t("marketing.aiSectionGenerate","Generate & Preview")},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <canvas ref={canvasRef} style={{display:"none"}} />

      {/* Section Nav */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",padding:"6px 8px",background:"rgba(241,245,249,0.7)",borderRadius:12,border:"1px solid rgba(0,0,0,0.06)"}}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setActiveSection(s.id)} style={{...CS.chip(activeSection===s.id,"#4f8ef7"),padding:"7px 14px",borderRadius:9,fontSize:11}}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* PLATFORM SECTION */}
      {activeSection==="platform" && (
        <div style={CS.card}>
          <div style={CS.label}>📱 {t("marketing.aiPlatformTitle","Target Platform")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6}}>
            {PLATFORMS.map(p=>(
              <button key={p.id} onClick={()=>setPlatform(p.id)} style={{...CS.chip(platform===p.id,"#4f8ef7"),padding:"10px 8px",flexDirection:"column",gap:2,textAlign:"center",borderRadius:10}}>
                <span style={{fontSize:18}}>{p.icon}</span>
                <span style={{fontSize:10,fontWeight:700}}>{p.label}</span>
                <span style={{fontSize:9,color:"#94a3b8"}}>{p.ratio} · {p.w*2}×{p.h*2}</span>
              </button>
            ))}
          </div>
          <div style={{marginTop:12,padding:"10px 14px",background:"rgba(79,142,247,0.06)",borderRadius:10,border:"1px solid rgba(79,142,247,0.15)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4f8ef7"}}>✅ {t("marketing.aiSelected","Selected")}: {currentPlatform.icon} {currentPlatform.label}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{t("marketing.aiOutputSize","Output")}: {currentPlatform.w*2}×{currentPlatform.h*2}px · {currentPlatform.ratio}</div>
          </div>
        </div>
      )}

      {/* THEME SECTION */}
      {activeSection==="theme" && (
        <div style={CS.card}>
          <div style={CS.label}>🎨 {t("marketing.aiThemeTitle","Creative Theme")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:6}}>
            {THEMES.map(th=>(
              <button key={th.id} onClick={()=>setTheme(th.id)} style={{...CS.chip(theme===th.id,th.colors[0]),padding:"10px",borderRadius:10,flexDirection:"column",gap:4}}>
                <span style={{fontSize:18}}>{th.icon}</span>
                <span style={{fontSize:11,fontWeight:700}}>{th.label}</span>
                <div style={{display:"flex",gap:3}}>
                  {th.colors.map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:3,background:c}} />)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT SECTION */}
      {activeSection==="content" && (
        <div style={CS.card}>
          <div style={CS.label}>✏️ {t("marketing.aiContentTitle","Ad Copy & Content")}</div>
          <div style={{display:"grid",gap:10}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiHeadline","Headline")}</div>
              <input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder={t("marketing.aiHeadlinePh","e.g. Summer Sale 50% OFF")} style={CS.input} />
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiSubheadline","Subheadline")}</div>
              <input value={subheadline} onChange={e=>setSubheadline(e.target.value)} placeholder={t("marketing.aiSubPh","Limited time offer for new members")} style={CS.input} />
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiImagePrompt","AI Image Prompt")}</div>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3} placeholder={t("marketing.aiPromptPh","Describe the visual style (e.g. summer beach sunset, luxury gold)")} style={{...CS.input,resize:"vertical",minHeight:60}} />
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiCtaText","CTA Button Text")}</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {CTA_OPTIONS.map(c=>(
                  <button key={c} onClick={()=>setCtaText(c)} style={CS.chip(ctaText===c,"#22c55e")}>{c}</button>
                ))}
              </div>
              <input value={ctaText} onChange={e=>setCtaText(e.target.value)} style={{...CS.input,marginTop:6}} />
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE SECTION */}
      {activeSection==="interactive" && (
        <div style={CS.card}>
          <div style={CS.label}>🎮 {t("marketing.aiInteractiveTitle","Interactive & Popup Triggers")}</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1e293b",marginBottom:6}}>{t("marketing.aiInteractiveType","Interactive Ad Type")}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:6}}>
              {INTERACTIVE_TYPES.map(it=>(
                <button key={it.id} onClick={()=>setInteractiveType(interactiveType===it.id?"":it.id)} style={CS.chip(interactiveType===it.id,"#06b6d4")}>
                  <span>{it.icon}</span> {it.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#1e293b",marginBottom:6}}>{t("marketing.aiPopupTrigger","Popup Trigger")}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {POPUP_TRIGGERS.map(tr=>(
                <button key={tr.id} onClick={()=>setPopupTrigger(tr.id)} style={CS.chip(popupTrigger===tr.id,"#a855f7")}>{tr.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE SECTION */}
      {activeSection==="schedule" && needsSchedule && (
        <div style={CS.card}>
          <div style={CS.label}>📅 {t("marketing.aiScheduleTitle","Event Period Settings")}</div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              <input type="checkbox" checked={scheduleEnabled} onChange={e=>setScheduleEnabled(e.target.checked)} style={{accentColor:"#4f8ef7",width:16,height:16}} />
              <span style={{fontSize:12,fontWeight:700,color:scheduleEnabled?"#4f8ef7":"#64748b"}}>{t("marketing.aiScheduleEnable","Enable scheduled event period")}</span>
            </label>
          </div>
          {scheduleEnabled && (
            <div style={{display:"grid",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiStartDate","Start Date")}</div>
                  <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{...CS.input,cursor:"pointer"}} />
                </div>
                <span style={{fontSize:16,color:"#94a3b8",paddingTop:16}}>~</span>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiEndDate","End Date")}</div>
                  <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{...CS.input,cursor:"pointer"}} />
                </div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:4}}>{t("marketing.aiTimezone","Timezone")}</div>
                <select value={timezone} onChange={e=>setTimezone(e.target.value)} style={{...CS.input,cursor:"pointer"}}>
                  {["Asia/Seoul","Asia/Tokyo","Asia/Shanghai","America/New_York","America/Los_Angeles","Europe/London","Europe/Berlin","UTC"].map(tz=><option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div style={{padding:"10px 14px",background:"rgba(34,197,94,0.06)",borderRadius:10,border:"1px solid rgba(34,197,94,0.15)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#22c55e"}}>✅ {t("marketing.aiScheduleSummary","Schedule Summary")}</div>
                <div style={{fontSize:10,color:"#64748b",marginTop:4}}>
                  {startDate} ~ {endDate} ({Math.max(1,Math.ceil((new Date(endDate)-new Date(startDate))/86400000))}{t("marketing.aiDays"," days")}) · {timezone}
                </div>
              </div>
            </div>
          )}
          {!scheduleEnabled && (
            <div style={{padding:"12px 14px",background:"rgba(241,245,249,0.5)",borderRadius:10,border:"1px solid rgba(0,0,0,0.04)",fontSize:11,color:"#94a3b8"}}>
              {t("marketing.aiScheduleOff","No schedule set — creative will be active immediately upon deployment.")}
            </div>
          )}
        </div>
      )}

      {/* GENERATE SECTION */}
      {activeSection==="generate" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Config Summary */}
          <div style={CS.card}>
            <div style={CS.label}>📋 {t("marketing.aiConfigSummary","Creative Configuration Summary")}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
              {[
                {l:"Platform",v:`${currentPlatform.icon} ${currentPlatform.label}`,c:"#4f8ef7"},
                {l:"Theme",v:`${(THEMES.find(t=>t.id===theme)||THEMES[0]).icon} ${(THEMES.find(t=>t.id===theme)||THEMES[0]).label}`,c:"#a855f7"},
                {l:"Size",v:`${currentPlatform.w*2}×${currentPlatform.h*2}px`,c:"#f97316"},
                {l:"CTA",v:ctaText,c:"#22c55e"},
              ].map((item,i)=>(
                <div key={i} style={{padding:"8px 12px",background:item.c+"08",border:`1px solid ${item.c}20`,borderRadius:8}}>
                  <div style={{fontSize:9,color:"#94a3b8",fontWeight:700}}>{item.l}</div>
                  <div style={{fontSize:12,fontWeight:700,color:item.c,marginTop:2}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={generate} disabled={generating} style={CS.btn(generating)}>
              {generating ? "⚙️ Generating..." : `🤖 ${t("marketing.aiGenerateBtn","Generate AI Creative")}`}
            </button>
            <div style={{position:"relative"}}>
              <button onClick={()=>fileRef.current?.click()} style={{...CS.btn(false),background:"linear-gradient(135deg,#a855f7,#ec4899)",boxShadow:"0 4px 16px rgba(168,85,247,0.3)"}}>
                📤 {t("marketing.aiUploadBtn","Upload Custom")}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={e=>handleUpload(e.target.files[0])} style={{display:"none"}} />
            </div>
          </div>

          {/* Result Preview */}
          {result && (
            <div style={CS.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>✅ {t("marketing.aiResultTitle","Generated Creative")}</div>
                <button onClick={downloadResult} style={{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(79,142,247,0.3)",background:"rgba(79,142,247,0.06)",color:"#4f8ef7",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  💾 {t("marketing.aiDownload","Download")}
                </button>
              </div>
              {result.dataUrl && (
                <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(0,0,0,0.06)",marginBottom:12}}>
                  <img src={result.dataUrl} alt="AI Generated" style={{width:"100%",maxHeight:400,objectFit:"contain",display:"block"}} />
                </div>
              )}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:10}}>
                {result.size && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(79,142,247,0.08)",color:"#4f8ef7",fontWeight:600}}>📐 {result.size}</span>}
                {result.platformLabel && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(168,85,247,0.08)",color:"#a855f7",fontWeight:600}}>📱 {result.platformLabel}</span>}
                {result.ratio && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(249,115,22,0.08)",color:"#f97316",fontWeight:600}}>📏 {result.ratio}</span>}
                {result.theme && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(34,197,94,0.08)",color:"#22c55e",fontWeight:600}}>🎨 {result.theme}</span>}
              </div>
              {(headline||subheadline) && (
                <div style={{marginTop:10,padding:"10px 14px",background:"rgba(241,245,249,0.5)",borderRadius:8,border:"1px solid rgba(0,0,0,0.04)"}}>
                  {headline && <div style={{fontSize:13,fontWeight:800,color:"#1e293b"}}>{headline}</div>}
                  {subheadline && <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{subheadline}</div>}
                  {ctaText && <div style={{marginTop:6,display:"inline-block",padding:"5px 16px",borderRadius:6,background:"linear-gradient(135deg,#4f8ef7,#6366f1)",color:"#fff",fontSize:11,fontWeight:700}}>{ctaText}</div>}
                </div>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div style={CS.card}>
              <div style={CS.label}>🕐 {t("marketing.aiHistory","Recent Creatives")} ({history.length})</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8}}>
                {history.map((h,i)=>(
                  <div key={h.id||i} onClick={()=>setResult(h)} style={{cursor:"pointer",borderRadius:10,overflow:"hidden",border:result?.id===h.id?"2px solid #4f8ef7":"1px solid rgba(0,0,0,0.06)",transition:"all 0.2s"}}>
                    {h.dataUrl && <img src={h.dataUrl} alt="" style={{width:"100%",height:80,objectFit:"cover"}} />}
                    <div style={{padding:"4px 6px",fontSize:9,color:"#64748b",fontWeight:600}}>{h.platformLabel||h.platform}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div style={CS.card}>
            <div style={CS.label}>📤 {t("marketing.aiCustomUpload","Custom Image Upload")}</div>
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleUpload(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current?.click()}
              style={{minHeight:80,borderRadius:10,cursor:"pointer",border:`2px dashed ${dragOver?"#4f8ef7":"rgba(0,0,0,0.08)"}`,background:dragOver?"rgba(79,142,247,0.04)":"rgba(241,245,249,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",transition:"all 0.2s"}}>
              <div style={{fontSize:28,opacity:0.4}}>🖼</div>
              <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{t("marketing.aiDragDrop","Drag & drop or click to upload")}</div>
              <div style={{fontSize:9,color:"#94a3b8",opacity:0.6,marginTop:2}}>PNG, JPG, GIF, WebP (max 5MB)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
