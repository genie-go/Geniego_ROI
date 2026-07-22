import React, { useState, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../i18n/index.js";
import { IS_DEMO } from "../utils/demoEnv";
import AIDesignChat from "./AIDesignChat.jsx"; // 196차 — 대화형 AI 디자인(동일 메뉴 내 통합)

// 196차 — AiDesignEngine 디자인을 백엔드(ad_design)에 임시저장/저장 → 캠페인 자동화에서 활용
const _adToken = () => localStorage.getItem(IS_DEMO ? "demo_genie_token" : "genie_token") || localStorage.getItem("genie_token") || localStorage.getItem("demo_genie_token") || "";
const _adHeaders = () => { const t = _adToken(); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; };

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

/* [현 차수] 채널별 광고물 CSS 모션 애니메이션 — 디자인에 저장(spec.animation)되어 채널별로 보관되고,
 *  엔진/보관함 미리보기와 웹팝업 소재에 실제 적용. (keyframes 는 styles.css 의 ad* 정의) */
const ANIMATIONS = [
  { id:"none",    label:"정적(없음)",  icon:"⏹️", css:"" },
  { id:"fadeIn",  label:"페이드 인",   icon:"🌫️", css:"adFadeIn 1.2s ease both" },
  { id:"slideUp", label:"슬라이드 업", icon:"⬆️", css:"adSlideUp 0.9s cubic-bezier(.2,.8,.2,1) both" },
  { id:"zoomIn",  label:"줌 인",       icon:"🔎", css:"adZoomIn 0.9s ease both" },
  { id:"pulse",   label:"펄스",        icon:"💓", css:"adPulse 1.8s ease-in-out infinite" },
  { id:"float",   label:"플로팅",      icon:"🎈", css:"adFloat 2.8s ease-in-out infinite" },
  { id:"shine",   label:"샤인",        icon:"✨", css:"adShine 2.2s ease-in-out infinite" },
];
export const animCss = (id) => (ANIMATIONS.find(a => a.id === id) || {}).css || "";

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
  ctx.fillText(`${pl?.label||platform} · Geniego`,W-10,H-10);
  ctx.font="bold 9px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillStyle="rgba(255,255,255,0.2)";
  ctx.fillText("Geniego-ROI",10,H-10);
  return canvas.toDataURL("image/png");
}

/* CTA copy suggestions */
const CTA_OPTIONS = ["Shop Now","Get 20% Off","Try Free","Learn More","Subscribe","Claim Reward","Buy Now","Start Today","Join Us","Explore"];

export default function AiDesignEngine({ defaultPlatform="popup", mode=null, hideModeToggle=false }) {
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
  const [animation, setAnimation] = useState("fadeIn"); // [현 차수] 채널별 광고물 CSS 모션
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeSection, setActiveSection] = useState("platform");
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { ok, text }
  const [innerMode, setInnerMode] = useState("chat"); // 'chat' 대화형(기본) | 'engine' 디자인엔진
  const designMode = mode || innerMode; // [현 차수] 부모가 mode 제어 시 그 값 사용(외부 단일 토글 통합)
  const fileRef = useRef(null);
  /* Event Period / Schedule */
  const today = new Date().toISOString().slice(0,10);
  const weekLater = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(weekLater);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul');

  const currentPlatform = useMemo(()=>PLATFORMS.find(p=>p.id===platform)||PLATFORMS[0],[platform]);

  // [현 차수] ★가짜 AI 제거 — 종전엔 setTimeout(1500) 지연 후 로컬 canvas 그라디언트를 그려 "AI 생성"으로 표기했다
  //   (네트워크 호출 0). 이제 실제 이미지 생성 엔드포인트(/v422/ai/campaign-ad-image)를 호출한다.
  //   AI 키 미설정·실패 시에는 로컬 템플릿으로 폴백하되 결과를 정직하게 "로컬 템플릿"으로 표기(_ai=false).
  const generate = useCallback(async ()=>{
    setGenerating(true); setResult(null);
    const localTemplate = (aiImage, note)=>{
      const c=canvasRef.current;
      const dataUrl = aiImage || (c ? (c.width=currentPlatform.w, c.height=currentPlatform.h, renderCanvas(c, prompt||headline||theme, theme, platform)) : '');
      const res={
        id:Date.now(), platform, theme, prompt, headline, subheadline, ctaText,
        interactiveType, popupTrigger, animation, dataUrl,
        size:`${currentPlatform.w*2}×${currentPlatform.h*2}`,
        ratio:currentPlatform.ratio,
        timestamp:new Date().toISOString(),
        platformLabel:currentPlatform.label,
        _ai: !!aiImage,          // true=실제 AI 이미지, false=로컬 템플릿
        _note: note || '',
      };
      setResult(res);
      setHistory(prev=>[res,...prev].slice(0,20));
      setGenerating(false);
    };
    const promptText = (prompt||headline||theme||'').trim();
    try {
      const r = await fetch('/api/v422/ai/campaign-ad-image', {
        method:'POST', headers:_adHeaders(),
        body: JSON.stringify({ prompt: promptText || (headline||theme||'광고 비주얼'), ratio: currentPlatform.ratio || '1:1' }),
      });
      const d = await r.json().catch(()=>({}));
      if (d && d.ok && d.image) { localTemplate(d.image, ''); return; }        // 실제 AI 이미지
      // 미설정/실패 → 정직한 로컬 템플릿 폴백
      const why = (d && d.configured === false)
        ? 'AI 이미지 생성 키가 없어 로컬 템플릿으로 만들었습니다. [AI 광고 디자인 > API 연동]에서 키를 등록하면 실사 AI 이미지가 생성됩니다.'
        : (d && d.error) ? ('AI 생성 실패 — 로컬 템플릿으로 대체: ' + d.error) : 'AI 미응답 — 로컬 템플릿으로 대체했습니다.';
      localTemplate(null, why);
    } catch(e) {
      localTemplate(null, '네트워크 오류 — 로컬 템플릿으로 대체했습니다.');
    }
  },[platform,theme,prompt,headline,subheadline,ctaText,interactiveType,popupTrigger,currentPlatform]);

  // 196차 — 디자인 백엔드 저장(임시저장 draft / 저장 approved). 저장된 디자인은 캠페인 자동화에서 연결.
  const saveDesign = useCallback(async (status)=>{
    if(!result){ setSaveMsg({ok:false,text:"먼저 'Generate AI Creative'로 디자인을 생성하세요."}); return; }
    setSaving(true); setSaveMsg(null);
    try {
      const th = THEMES.find(x=>x.id===result.theme);
      const cols = th?.colors || ["#0f172a","#4f8ef7","#22d3ee"];
      const design = {
        channel: result.platform, format: result.platformLabel, ratio: result.ratio,
        headline: result.headline, subheadline: result.subheadline, body: result.prompt, cta: result.ctaText,
        mood: th?.label || result.theme,
        animation: result.animation || animation, // [현 차수] 채널별 광고물 애니메이션(CSS 모션) 영속
        palette: { bg: cols[0], primary: cols[1]||cols[0], accent: cols[2]||cols[1]||cols[0], text: "#ffffff" },
      };
      // [현 차수] 채널별 광고물 기간 등록 — 노출 기간(설정 시)을 함께 저장해 채널별·기간별로 사용.
      const periodStart = scheduleEnabled ? startDate : null;
      const periodEnd   = scheduleEnabled ? endDate : null;
      const r = await fetch("/api/v422/ai/ad-design/save", { method:"POST", headers:_adHeaders(),
        body: JSON.stringify({ product_description: result.prompt||result.headline||"", category: th?.label||"", design, svg: result.dataUrl||"", status,
          period_start: periodStart, period_end: periodEnd }) });
      const d = await r.json().catch(()=>({}));
      setSaveMsg(r.ok && d.ok ? { ok:true, text:d.message||"저장되었습니다." } : { ok:false, text:(d.error||"저장에 실패했습니다. 로그인 상태를 확인하세요.") });
    } catch { setSaveMsg({ ok:false, text:"서버 오류. 다시 시도하세요." }); }
    setSaving(false);
  },[result, scheduleEnabled, startDate, endDate, animation]);

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

  // [현 차수] 채널별 광고물 기간 등록 — 전 채널(유튜브/메타 등)에서 광고 노출 기간을 설정·저장할 수 있도록 항상 노출.
  const needsSchedule = true;

  const SECTIONS=[
    {id:"platform",icon:"📱",label:t("marketing.aiSectionPlatform","Platform & Size")},
    {id:"theme",icon:"🎨",label:t("marketing.aiSectionTheme","Theme & Style")},
    {id:"content",icon:"✏️",label:t("marketing.aiSectionContent","Content & Copy")},
    {id:"interactive",icon:"🎮",label:t("marketing.aiSectionInteractive","Interactive & Triggers")},
    {id:"animation",icon:"📽️",label:t("marketing.aiSectionAnimation","Animation")},
    ...(needsSchedule ? [{id:"schedule",icon:"📅",label:t("marketing.aiSectionSchedule","Event Period")}] : []),
    {id:"generate",icon:"🚀",label:t("marketing.aiSectionGenerate","Generate & Preview")},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <canvas ref={canvasRef} style={{display:"none"}} />

      {/* 196차 — 대화형 / 디자인엔진 모드 토글. [현 차수] 부모 단일 토글 통합 시 hideModeToggle로 숨김 */}
      {!hideModeToggle && (
      <div style={{display:"inline-flex",gap:4,padding:4,borderRadius:12,background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",width:"fit-content"}}>
        {[["chat","💬 대화형 AI 디자인"],["engine","🎨 디자인 엔진"]].map(([id,label])=>(
          <button key={id} onClick={()=>setInnerMode(id)} style={{padding:"8px 16px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,background:designMode===id?"linear-gradient(135deg,#a855f7,#4f8ef7)":"transparent",color:designMode===id?"#fff":"#64748b"}}>{label}</button>
        ))}
      </div>
      )}

      {designMode==="chat" && <AIDesignChat />}

      {designMode==="engine" && (<>
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
                <span style={{fontSize:10,color:"#94a3b8"}}>{p.ratio} · {p.w*2}×{p.h*2}</span>
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

      {/* ANIMATION SECTION — [현 차수] 채널별 광고물 CSS 모션 */}
      {activeSection==="animation" && (
        <div style={CS.card}>
          <div style={CS.label}>📽️ {t("marketing.aiAnimationTitle","Creative Animation (CSS Motion)")}</div>
          <div style={{fontSize:11,color:"#94a3b8",marginBottom:10}}>{t("marketing.aiAnimationHint","선택한 모션은 채널별로 저장되어 보관함·웹팝업 소재에 적용됩니다.")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6}}>
            {ANIMATIONS.map(a=>(
              <button key={a.id} onClick={()=>setAnimation(a.id)} style={{...CS.chip(animation===a.id,"#ec4899"),padding:"10px 8px",flexDirection:"column",gap:3,textAlign:"center",borderRadius:10}}>
                <span style={{fontSize:18, animation: a.css||"none"}}>{a.icon}</span>
                <span style={{fontSize:10,fontWeight:700}}>{a.label}</span>
              </button>
            ))}
          </div>
          <div style={{marginTop:12,padding:"10px 14px",background:"rgba(236,72,153,0.06)",borderRadius:10,border:"1px solid rgba(236,72,153,0.15)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#ec4899"}}>✅ {t("marketing.aiSelected","Selected")}: {(ANIMATIONS.find(a=>a.id===animation)||ANIMATIONS[0]).icon} {(ANIMATIONS.find(a=>a.id===animation)||ANIMATIONS[0]).label}</div>
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
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>{item.l}</div>
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

          {/* 196차 — 임시저장 / 저장 (항상 표시; 생성 후 활성). 저장 디자인은 캠페인 자동화에 연결 */}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={()=>saveDesign("draft")} disabled={saving||!result}
              style={{flex:1,padding:"11px 0",borderRadius:10,border:"1px solid rgba(79,142,247,0.35)",cursor:(saving||!result)?"not-allowed":"pointer",background:result?"rgba(79,142,247,0.07)":"rgba(148,163,184,0.08)",color:result?"#4f8ef7":"#94a3b8",fontSize:13,fontWeight:800}}>
              📝 {t("marketing.aiSaveDraft","임시저장")}
            </button>
            <button onClick={()=>saveDesign("approved")} disabled={saving||!result}
              style={{flex:1,padding:"11px 0",borderRadius:10,border:"none",cursor:(saving||!result)?"not-allowed":"pointer",background:(saving||!result)?"rgba(34,197,94,0.25)":"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",fontSize:13,fontWeight:800}}>
              ✅ {t("marketing.aiSaveApply","저장 (캠페인에 활용)")}
            </button>
          </div>
          {!result && <div style={{fontSize:11,color:"#94a3b8",marginTop:-2}}>ℹ️ {t("marketing.aiSaveHint","'Generate AI Creative'로 디자인을 생성하면 임시저장·저장이 활성화됩니다.")}</div>}
          {saveMsg && <div style={{padding:"9px 13px",borderRadius:9,fontSize:12,fontWeight:600,background:saveMsg.ok?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.08)",color:saveMsg.ok?"#16a34a":"#dc2626"}}>{saveMsg.text}</div>}

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
                  <img key={(result.id)+"-"+(result.animation||"none")} src={result.dataUrl} alt="AI Generated" style={{width:"100%",maxHeight:400,objectFit:"contain",display:"block",animation:animCss(result.animation)||"none"}} />
                </div>
              )}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:10}}>
                {/* [현 차수] 정직 표기 — 실제 AI 이미지 vs 로컬 템플릿 */}
                {result._ai
                  ? <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(34,197,94,0.12)",color:"#16a34a",fontWeight:800}}>🤖 AI 생성 이미지</span>
                  : <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(245,158,11,0.12)",color:"#b45309",fontWeight:800}}>🖼️ 로컬 템플릿</span>}
                {result.animation && result.animation!=="none" && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(236,72,153,0.1)",color:"#ec4899",fontWeight:700}}>📽️ {(ANIMATIONS.find(a=>a.id===result.animation)||{}).label||result.animation}</span>}
                {result.size && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(79,142,247,0.08)",color:"#4f8ef7",fontWeight:600}}>📐 {result.size}</span>}
                {result.platformLabel && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(168,85,247,0.08)",color:"#a855f7",fontWeight:600}}>📱 {result.platformLabel}</span>}
                {result.ratio && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(249,115,22,0.08)",color:"#f97316",fontWeight:600}}>📏 {result.ratio}</span>}
                {result.theme && <span style={{padding:"3px 10px",borderRadius:999,background:"rgba(34,197,94,0.08)",color:"#22c55e",fontWeight:600}}>🎨 {result.theme}</span>}
              </div>
              {result._note && <div style={{fontSize:10.5,color:"#b45309",marginTop:2,lineHeight:1.5}}>ℹ️ {result._note}</div>}
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
                    <div style={{padding:"4px 6px",fontSize:10,color:"#64748b",fontWeight:600}}>{h.platformLabel||h.platform}</div>
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
              <div style={{fontSize:10,color:"#94a3b8",opacity:0.6,marginTop:2}}>PNG, JPG, GIF, WebP (max 5MB)</div>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
