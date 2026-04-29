import React,{useState,useMemo,useCallback,useEffect} from "react";
import {useI18n} from '../i18n/index.js';
import {useGlobalData} from '../context/GlobalDataContext';
import {useSecurityGuard} from '../security/SecurityGuard.js';
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';

const C={accent:"#4f8ef7",green:"#22c55e",red:"#ef4444",yellow:"#eab308",purple:"#a855f7",cyan:"#06b6d4"};
const Tag=({label,color=C.accent})=>(<span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:color+'18', color, border:'1px solid '+color+'33', fontWeight:700 }}>{label}</span>);

function useContentCalendarSecurity(addAlert){
  useSecurityGuard({addAlert:useCallback((a)=>{if(typeof addAlert==='function')addAlert(a);},[addAlert]),enabled:true});
}

function getWeeksInMonth(year,month){
  const firstDay=new Date(year,month,1);const lastDay=new Date(year,month+1,0);const weeks=[];
  let current=new Date(firstDay);current.setDate(current.getDate()-current.getDay());
  while(current<=lastDay){const week=[];for(let i=0;i<7;i++){week.push(new Date(current));current.setDate(current.getDate()+1);}weeks.push(week);}
  return weeks;
}

function MonthCalendar({year,month,events,t}){
  const weeks=getWeeksInMonth(year,month);
  const DAY_KEYS=['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat'];
  const DAY_COLORS=['#ef4444',null,null,null,null,null,'#4f8ef7'];
  const toStr=d=>d.toISOString().slice(0,10);
  const todayStr=new Date().toISOString().slice(0,10);
  const evByDate={};
  for(const e of events){const dk=e.date?.slice(0,10);if(!dk)continue;if(!evByDate[dk])evByDate[dk]=[];evByDate[dk].push(e);}
  const STATUS_COLORS={draft:"#eab308",review:"#f97316",scheduled:"#4f8ef7",published:"#22c55e",cancelled:"#ef4444"};
  const PLAT_ICO={instagram:"📸",youtube:"▶",tiktok:"🎵",blog:"📝",facebook:"📘",twitter:"🐦",linkedin:"💼",pinterest:"📌"};
  /* Enterprise Error Boundary */

  if (_pageError) return <ErrorFallback error={_pageError} onRetry={() => { _setPageError(null); _setRetryCount(c => c + 1); }} />;

  return(
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
        {DAY_KEYS.map((dk,i)=>(
          <div key={dk} style={{ fontSize:10, fontWeight:700, textAlign:"center", color:DAY_COLORS[i]||"#6b7280", padding:"4px 0" }}>{t(`contentCal.${dk}`)}</div>
        ))}
      </div>
      {weeks.map((week,wi)=>(
        <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
          {week.map((day,di)=>{
            const ds=toStr(day);const inMonth=day.getMonth()===month;const dayEvents=evByDate[ds]||[];const isToday=ds===todayStr;
            return(
              <div key={di} style={{ minHeight:62, padding:"4px 5px", borderRadius:6, background:isToday?"rgba(99,102,241,0.12)":inMonth?"rgba(241,245,249,0.8)":"rgba(241,245,249,0.3)", border:isToday?"1.5px solid rgba(99,102,241,0.45)":"1px solid rgba(0,0,0,0.06)", opacity:inMonth?1:0.3, transition:"all .2s" }}>
                <div style={{ fontSize:11, fontWeight:isToday?900:600, color:di===0?"#ef4444":di===6?"#4f8ef7":"#374151", marginBottom:2 }}>
                  {day.getDate()}{isToday&&<span style={{ fontSize:7, color:"#6366f1", marginLeft:2, fontWeight:900 }}>TODAY</span>}
                </div>
                {dayEvents.slice(0,2).map((ev,ei)=>{
                  const sc=STATUS_COLORS[ev.status]||"#888";
                  return(<div key={ei} style={{ fontSize:8, padding:"1px 4px", borderRadius:3, background:sc+"15", color:sc, marginBottom:1, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                    {PLAT_ICO[ev.platform]||"📄"} {ev.title}
                  </div>);
                })}
                {dayEvents.length>2&&<div style={{ fontSize:8, color:"#9ca3af" }}>+{dayEvents.length-2}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ContentListTab({events,t}){
  const[filter,setFilter]=useState("all");
  const STATUS_LIST=['draft','review','scheduled','published','cancelled'];
  const STATUS_COLORS={draft:"#eab308",review:"#f97316",scheduled:"#4f8ef7",published:"#22c55e",cancelled:"#ef4444"};
  const PLAT_ICO={instagram:"📸",youtube:"▶",tiktok:"🎵",blog:"📝",facebook:"📘",twitter:"🐦",linkedin:"💼",pinterest:"📌"};
  const filtered=events.filter(e=>filter==="all"||e.status===filter).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  return(
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        <button onClick={()=>setFilter("all")} className={filter==="all"?"cc-active-tab":""} style={{ padding:"4px 12px", borderRadius:99, border:"1px solid rgba(0,0,0,0.08)", background:filter==="all"?C.accent:"transparent", color:filter==="all"?"#fff":"#4b5563", cursor:"pointer", fontSize:10, fontWeight:700 }}>{t('contentCal.filterAll')}</button>
        {STATUS_LIST.map(s=>(<button key={s} onClick={()=>setFilter(s)} className={filter===s?"cc-active-tab":""} style={{padding:"4px 12px",borderRadius:99,border:`1px solid ${STATUS_COLORS[s]}33`,background:filter===s?STATUS_COLORS[s]:"transparent",color:filter===s?"#fff":STATUS_COLORS[s],cursor:"pointer",fontSize:10,fontWeight:700}}>{t(`contentCal.st_${s}`)}</button>))}
      </div>
      {filtered.length===0&&(<div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:13 }}>📭 {t('contentCal.noContent')}</div>)}
      {filtered.map((ev,idx)=>{
        const sc=STATUS_COLORS[ev.status]||"#888";
        return(
          <div key={ev.id||idx} style={{padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,0.95)",border:`1px solid ${sc}18`,borderLeft:`3px solid ${sc}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,transition:"transform .15s",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#1f2937" }}>{ev.title||t('contentCal.untitled')}</div>
              <div style={{ fontSize:10, color:"#6b7280", marginTop:3, display:"flex", gap:8, flexWrap:"wrap" }}>
                <span>{PLAT_ICO[ev.platform]||"📄"} {ev.platform||'-'}</span>
                {ev.creator&&<span>👤 {ev.creator}</span>}
                <span>📅 {ev.date||'-'}</span>
                {ev.campaign&&ev.campaign!=='—'&&<span>🎯 {ev.campaign}</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {ev.views>0&&<Tag label={`👁 ${(ev.views/1000).toFixed(0)}K`} color="#f97316"/>}
              <Tag label={t(`contentCal.st_${ev.status}`)||ev.status} color={sc}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AiContentTab({t,channels}){
  const channelData=useMemo(()=>{
    if(!channels||Object.keys(channels).length===0)return {};
    const result={};Object.entries(channels).forEach(([key,ch])=>{result[key]={name:ch.name||key,impressions:ch.impressions||0,clicks:ch.clicks||0,spend:ch.spend||0,revenue:ch.revenue||0,roas:ch.roas||0,conversions:ch.conversions||0,ctr:ch.ctr||0,convRate:ch.convRate||0,cpc:ch.cpc||0};});return result;
  },[channels]);
  if(Object.keys(channelData).length===0){
    return(<div style={{ textAlign:"center", padding:60, color:"#6b7280", fontSize:11, marginBottom:6, fontWeight:700 }} ><div>📊</div><div>{t('contentCal.noChannelData')}</div><div>{t('contentCal.noChannelDataSub')}</div></div>);
  }
  return <MarketingAIPanel channels={channelData} campaigns={[]}/>;
}

function ContentRegisterModal({onClose,onSave,t}){
  const[form,setForm]=useState({title:'',platform:'instagram',date:new Date().toISOString().slice(0,10),status:'draft',creator:'',campaign:''});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const PLATFORMS=['instagram','youtube','tiktok','blog','facebook','twitter','linkedin','pinterest'];
  const STATUSES=['draft','review','scheduled','published'];
  const INPUT={width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1e293b",boxSizing:"border-box",fontSize:13,outline:"none"};
  return(
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center", backdropFilter:"blur(6px)" }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ width:440, maxWidth:"92vw", background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.1)", padding:28, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontWeight:900, fontSize:18, marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", color:"#1f2937" }}>
          <span>📝 {t('contentCal.registerTitle')}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {[{label:t('contentCal.fieldTitle'),key:'title',type:'text'},{label:t('contentCal.fieldCreator'),key:'creator',type:'text'},{label:t('contentCal.fieldCampaign'),key:'campaign',type:'text'},{label:t('contentCal.fieldDate'),key:'date',type:'date'}].map(f=>(
          <div key={f.key} style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", marginBottom:4 }}>{f.label}</div>
            <input type={f.type} value={form[f.key]} onChange={e=>set(f.key,e.target.value)} style={{ ...INPUT }}/>
          </div>
        ))}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div><div style={{ fontSize:10, fontWeight:700, color:"#6b7280", marginBottom:4 }}>{t('contentCal.fieldPlatform')}</div>
            <select value={form.platform} onChange={e=>set('platform',e.target.value)} style={{ ...INPUT }}>{PLATFORMS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></div>
          <div><div style={{ fontSize:10, fontWeight:700, color:"#6b7280", marginBottom:4 }}>{t('contentCal.fieldStatus')}</div>
            <select value={form.status} onChange={e=>set('status',e.target.value)} style={{ ...INPUT }}>{STATUSES.map(s=><option key={s} value={s}>{t(`contentCal.st_${s}`)}</option>)}</select></div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <button onClick={onClose} style={{ padding:"8px 20px", borderRadius:8, border:"1px solid rgba(0,0,0,0.1)", background:"transparent", color:"#374151", cursor:"pointer", fontSize:12, fontWeight:700 }}>{t('contentCal.btnCancel')}</button>
          <button onClick={()=>{if(!form.title.trim())return;onSave({...form,id:Date.now(),views:0});onClose(); }} style={{ padding:"8px 20px", borderRadius:8, border:"none", background:C.accent, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700 }}>{t('contentCal.btnSave')}</button>
        </div>
      </div>
    </div>
  );
}

function ContentCalGuideTab(){
  const{t}=useI18n();
  const STEPS=[
    {n:'1',k:'guideStep1',c:'#6366f1'},{n:'2',k:'guideStep2',c:'#22c55e'},{n:'3',k:'guideStep3',c:'#a855f7'},
    {n:'4',k:'guideStep4',c:'#f97316'},{n:'5',k:'guideStep5',c:'#06b6d4'},{n:'6',k:'guideStep6',c:'#f472b6'},
    {n:'7',k:'guideStep7',c:'#6366f1'},{n:'8',k:'guideStep8',c:'#22c55e'},{n:'9',k:'guideStep9',c:'#a855f7'},
    {n:'10',k:'guideStep10',c:'#f97316'},{n:'11',k:'guideStep11',c:'#06b6d4'},{n:'12',k:'guideStep12',c:'#f472b6'},
    {n:'13',k:'guideStep13',c:'#6366f1'},{n:'14',k:'guideStep14',c:'#22c55e'},{n:'15',k:'guideStep15',c:'#a855f7'},
  ];
  const TABS=[
    {icon:'📅',k:'guideCal',c:'#6366f1'},{icon:'📋',k:'guideList',c:'#22c55e'},
    {icon:'🤖',k:'guideAi',c:'#a855f7'},{icon:'📖',k:'guideGuide',c:'#f472b6'},
  ];
  return(
    <div style={{ display:'grid', gap:18 }}>
      <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:14, textAlign:'center', padding:32 }}>
        <div style={{ fontSize:44 }}>📅</div>
        <div style={{ fontWeight:900, fontSize:22, marginTop:8, color:'#1f2937' }}>{t('contentCal.guideTitle')}</div>
        <div style={{ fontSize:13, color:'#374151', fontWeight:600, marginTop:6, maxWidth:600, margin:'6px auto 0', lineHeight:1.7 }}>{t('contentCal.guideSub')}</div>
      </div>
      <div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}>
        <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1f2937' }}>{t('contentCal.guideStepsTitle')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{ background:s.c+'0a', border:'1px solid '+s.c+'25', borderRadius:12, padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:900, background:s.c, color:'#fff', width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{s.n}</span>
                <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{t(`contentCal.${s.k}Title`)}</span>
              </div>
              <div style={{ fontSize:12, color:'#6b7280', lineHeight:1.7 }}>{t(`contentCal.${s.k}Desc`)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}>
        <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1f2937' }}>{t('contentCal.guideTabsTitle')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          {TABS.map((tb,i)=>(
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', background:'rgba(255,255,255,0.95)', borderRadius:10, border:'1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{tb.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:12, color:tb.c }}>{t(`contentCal.${tb.k}Name`)}</div>
                <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>{t(`contentCal.${tb.k}Desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:14, padding:20 }}>
        <div style={{ fontWeight:800, fontSize:17, marginBottom:12, color:'#1f2937' }}>💡 {t('contentCal.guideTipsTitle')}</div>
        <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'#4b5563', lineHeight:2.2 }}>
          {[1,2,3,4,5,6,7].map(n=>(<li key={n}>{t('contentCal.guideTip'+n)}</li>))}
        </ul>
      </div>
    </div>
  );
}


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

export default function ContentCalendar(){
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);

  const{t}=useI18n();
  const { addAlert,sharedCalendarEvents,setSharedCalendarEvents,connectedChannels, isDemo } = useGlobalData();
  useContentCalendarSecurity(addAlert);
  const[tab,setTab]=useState("calendar");
  const[showRegister,setShowRegister]=useState(false);
  const now=new Date();
  const[viewYear,setViewYear]=useState(now.getFullYear());
  const[viewMonth,setViewMonth]=useState(now.getMonth());
  const calEvents=useMemo(()=>Array.isArray(sharedCalendarEvents)?sharedCalendarEvents:[],[sharedCalendarEvents]);
  const channelDataForAI=useMemo(()=>{
    if(!connectedChannels||!Array.isArray(connectedChannels))return {};
    const result={};connectedChannels.forEach(ch=>{if(ch.status==='connected'&&ch.category){result[ch.platform||ch.name]={name:ch.name||ch.platform,impressions:ch.metrics?.impressions||0,clicks:ch.metrics?.clicks||0,spend:ch.metrics?.spend||0,revenue:ch.metrics?.revenue||0,roas:ch.metrics?.roas||0,conversions:ch.metrics?.conversions||0,ctr:ch.metrics?.ctr||0,convRate:ch.metrics?.convRate||0,cpc:ch.metrics?.cpc||0};}});return result;
  },[connectedChannels]);
  const STATUS_COLORS={draft:"#eab308",review:"#f97316",scheduled:"#4f8ef7",published:"#22c55e",cancelled:"#ef4444"};
  const MONTH_KEYS=['monthJan','monthFeb','monthMar','monthApr','monthMay','monthJun','monthJul','monthAug','monthSep','monthOct','monthNov','monthDec'];
  const prevMonth=()=>{if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else{setViewMonth(m=>m-1);}};
  const nextMonth=()=>{if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else{setViewMonth(m=>m+1);}};
  const monthEvents=useMemo(()=>calEvents.filter(e=>{if(!e.date)return false;const d=new Date(e.date);return d.getFullYear()===viewYear&&d.getMonth()===viewMonth;}),[calEvents,viewYear,viewMonth]);
  const handleSaveContent=useCallback((content)=>{if(typeof setSharedCalendarEvents==='function'){setSharedCalendarEvents(prev=>[...(Array.isArray(prev)?prev:[]),content]);}},[setSharedCalendarEvents]);
  const TABS=useMemo(()=>[
    {id:"calendar",label:`📅 ${t('contentCal.tabCalendar')}`},
    {id:"list",label:`📋 ${t('contentCal.tabList')}`},
    {id:"ai",label:`🤖 ${t('contentCal.tabAi')}`},
    {id:"guide",label:`📖 ${t('contentCal.tabGuide')}`},
  ],[t]);

  return(
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(20,217,176,0.04)', border:'1px solid rgba(20,217,176,0.12)', fontSize:10, color:'#14d9b0', fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }}/>{t('contentCal.liveSyncMsg')}
      </div>
      <div style={{ borderRadius:16, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', padding:'22px 28px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:24, display:'flex', alignItems:'center', gap:8, color:'#1f2937' }} ><span>📅</span> {t('contentCal.title')}</div>
            <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>{t('contentCal.subtitle')}</div>
          </div>
          <button onClick={()=>setShowRegister(true)} style={{ background:C.accent, fontSize:12, padding:'8px 18px', borderRadius:8, border:'none', color:'#fff', cursor:'pointer', fontWeight:700 }}>+ {t('contentCal.btnRegister')}</button>
        </div>
      </div>
      <div style={{ padding:'10px 16px', borderRadius:12, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.06)', marginBottom:8 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:10, color:'#6b7280', fontWeight:700 }}>{t('contentCal.statusLabel')}:</span>
          {Object.entries(STATUS_COLORS).map(([k,c])=><Tag key={k} label={t(`contentCal.st_${k}`)} color={c}/>)}
        </div>
      </div>
      <div style={{ display:'flex', gap:4, padding:5, background:'rgba(0,0,0,0.04)', borderRadius:14, overflowX:'auto', flexShrink:0, marginBottom:12 }}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} className={tab===tb.id?'cc-active-tab':''} style={{ padding:'8px 14px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, flex:1, whiteSpace:'nowrap', background:tab===tb.id?C.accent:'transparent', color:tab===tb.id?'#ffffff':'#4b5563', transition:'all 150ms' }}>{tb.label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', paddingBottom:20 }}>
        {tab==="calendar"&&(
          <div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <button onClick={prevMonth} style={{ fontSize:13, padding:'4px 12px', cursor:'pointer', borderRadius:8, border:'1px solid rgba(0,0,0,0.08)', background:'transparent', color:'#374151' }}>← {t('contentCal.btnPrev')}</button>
              <div style={{ fontWeight:800, fontSize:15, color:'#1f2937' }}>{viewYear}{t('contentCal.yearSuffix')} {t(`contentCal.${MONTH_KEYS[viewMonth]}`)}</div>
              <button onClick={nextMonth} style={{ fontSize:13, padding:'4px 12px', cursor:'pointer', borderRadius:8, border:'1px solid rgba(0,0,0,0.08)', background:'transparent', color:'#374151' }}>{t('contentCal.btnNext')} →</button>
            </div>
            <MonthCalendar year={viewYear} month={viewMonth} events={monthEvents} t={t}/>
            {monthEvents.length===0&&(<div style={{ textAlign:'center', padding:32, color:'#9ca3af', fontSize:12 }}>📭 {t('contentCal.noEventsMonth')}</div>)}
          </div>
        )}
        {tab==="list"&&(<div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}><ContentListTab events={calEvents} t={t}/></div>)}
        {tab==="ai"&&(<div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}><AiContentTab t={t} channels={channelDataForAI}/></div>)}
        {tab==="guide"&&(<div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}><ContentCalGuideTab/></div>)}
      </div>
      {showRegister&&<ContentRegisterModal onClose={()=>setShowRegister(false)} onSave={handleSaveContent} t={t}/>}
    </div>
  );
}
