import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';

/* ─── Security: Input Sanitizer ──────────────────────────────────────── */
const XSS_RE = [/<script/i,/javascript:/i,/on\w+\s*=/i,/eval\s*\(/i,/SELECT\s+.*FROM/i,/DROP\s+TABLE/i,/UNION\s+SELECT/i,/\.\.\//g,/document\.(cookie|location)/i];
function detectThreat(v){return typeof v==='string'&&XSS_RE.some(r=>r.test(v))}

/* ─── Channel Fee Reference ──────────────────────────────────────────── */
const CH_META={meta_ads:{n:'Meta Ads',f:0,i:'🔵'},google_ads:{n:'Google Ads',f:0,i:'🔴'},tiktok_business:{n:'TikTok',f:0,i:'🎵'},naver_smartstore:{n:'Naver Store',f:5.5,i:'🟢'},naver_sa:{n:'Naver SA',f:0,i:'🟢'},coupang:{n:'Coupang',f:10.8,i:'🟠'},kakao_moment:{n:'Kakao',f:0,i:'💬'},shopify:{n:'Shopify',f:2.9,i:'🛍️'},amazon_spapi:{n:'Amazon',f:15,i:'📦'},st11:{n:'11Street',f:6,i:'🔶'},gmarket:{n:'Gmarket',f:7.5,i:'🟡'},rakuten:{n:'Rakuten',f:8,i:'🏯'},lazada:{n:'Lazada',f:6,i:'🌏'},cafe24:{n:'Cafe24',f:3,i:'☕'},own_mall:{n:'Own Mall',f:0,i:'🏠'}};

/* ─── API Endpoints (documentation — not mock data) ──────────────────── */
const API_ENDPOINTS=[
  {method:'GET',path:'/api/v423/inventory',auth:true,descKey:'epInvGet',params:'page, limit, sku'},
  {method:'POST',path:'/api/v423/inventory',auth:true,descKey:'epInvPost',params:'sku, name, stock, safeQty'},
  {method:'GET',path:'/api/v423/orders',auth:true,descKey:'epOrders',params:'status, channel, from, to'},
  {method:'GET',path:'/api/v423/settlement',auth:true,descKey:'epSettle',params:'channel, from, to'},
  {method:'GET',path:'/api/v423/campaigns',auth:true,descKey:'epCampGet',params:'status, page, limit'},
  {method:'POST',path:'/api/v423/campaigns',auth:true,descKey:'epCampPost',params:'name, budget, channels, period'},
  {method:'GET',path:'/api/v423/crm/segments',auth:true,descKey:'epCrm',params:'type'},
  {method:'POST',path:'/api/v423/pnl/report',auth:true,descKey:'epPnl',params:'from, to, channels'},
  {method:'GET',path:'/api/v423/channel-budgets',auth:true,descKey:'epBudget',params:'none'},
  {method:'POST',path:'/api/v423/webhook/register',auth:true,descKey:'epWhReg',params:'url, events, secret'},
  {method:'GET',path:'/api/v423/webhook/list',auth:true,descKey:'epWhList',params:'none'},
  {method:'DELETE',path:'/api/v423/webhook/{id}',auth:true,descKey:'epWhDel',params:'id (path)'},
];
const WEBHOOK_EVENTS=['order.created','order.status_changed','inventory.low_stock','campaign.approved','campaign.executed','settlement.completed'];
const METHOD_COLOR={GET:'#22c55e',POST:'#4f8ef7',PUT:'#eab308',DELETE:'#ef4444',PATCH:'#a855f7'};
const TABS=['docs','webhook','apikey','sdk','guide'];
const BASE_URL='https://roi.genie-go.com';

/* ─── Security Alert ─────────────────────────────────────────────────── */
function SecurityAlert({t,onDismiss}){
  return(<div style={{padding:'16px 20px',borderRadius:14,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
    <span style={{fontSize:24}}>🛡️</span>
    <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:'#ef4444'}}>{t('devHub.securityTitle')}</div><div style={{fontSize:11,color:'var(--text-2)',marginTop:2}}>{t('devHub.securityDesc')}</div></div>
    <button onClick={onDismiss} style={{padding:'6px 14px',borderRadius:8,border:'1px solid rgba(239,68,68,0.3)',background:'transparent',color:'#ef4444',fontSize:11,fontWeight:700,cursor:'pointer'}}>{t('devHub.dismiss')}</button>
    </div>
);
}

/* ─── Endpoint Row ───────────────────────────────────────────────────── */
function EndpointRow({ep,t}){
  const[open,setOpen]=useState(false);
  return(<div style={{borderBottom: '1px solid var(--border)'}}>
    <div onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',cursor:'pointer'}}>
      <span style={{fontSize:10,fontWeight:800,padding:'3px 8px',borderRadius:6,background:`${METHOD_COLOR[ep.method]}18`,color:METHOD_COLOR[ep.method],minWidth:46,textAlign:'center',border:`1px solid ${METHOD_COLOR[ep.method]}33`}}>{ep.method}</span>
      <code style={{flex:1,fontSize:11,color:'var(--text-1)',fontFamily:'monospace'}}>{ep.path}</code>
      <span style={{fontSize:10,color:'var(--text-3)'}}>{t(`devHub.${ep.descKey}`)}</span>
      {ep.auth&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:99,background:'rgba(79,142,247,0.1)',color:'#4f8ef7',border:'1px solid rgba(79,142,247,0.25)'}}>🔐 Auth</span>}
      <span style={{color:'var(--text-3)',fontSize:11}}>{open?'▲':'▼'}</span>
    {open&&(<div style={{padding:'10px 14px 14px 74px',background: 'var(--surface)'}}>
      <div style={{fontSize:10,color:'var(--text-3)',marginBottom:4}}>{t('devHub.params')}: <span style={{color:'var(--text-2)',fontFamily:'monospace'}}>{ep.params}</span></div>
      {ep.auth&&<div style={{fontSize:10,color:'var(--text-3)'}}>{t('devHub.authMethod')}: <code style={{color:'#4f8ef7',fontFamily:'monospace',fontSize:10}}>Authorization: Bearer {'{token}'}</code></div>}
    </div>)}
        </div>
    </div>
);
}

/* ─── Webhook Manager (zero mock) ────────────────────────────────────── */
function WebhookManager({t,secCheck}){
  const[hooks,setHooks]=useState([]);
  const[adding,setAdding]=useState(false);
  const[newUrl,setNewUrl]=useState('');
  const[selEvents,setSelEvents]=useState([]);
  const[saving,setSaving]=useState(false);

  const toggleEv=(id)=>setSelEvents(p=>p.includes(id)?p.filter(e=>e!==id):[...p,id]);
  const handleAdd=async()=>{
    if(!newUrl||selEvents.length===0)return;
    if(secCheck(newUrl))return;
    setSaving(true);
    try{
      const token=localStorage.getItem('genie_token')||'';
      const res=await fetch('/api/v423/webhook/register',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({url:newUrl,events:selEvents}),credentials:'include'});
      if(res.ok){const d=await res.json();if(d.ok)setHooks(p=>[...p,{id:Date.now(),url:newUrl,events:selEvents,active:true,created:new Date().toISOString().slice(0,10)}]);}
    }catch{}
    setSaving(false);setAdding(false);setNewUrl('');setSelEvents([]);
  };
  const loadHooks=useCallback(async()=>{
    try{const token=localStorage.getItem('genie_token')||'';const res=await fetch('/api/v423/webhook/list',{headers:{...(token?{Authorization:`Bearer ${token}`}:{})},credentials:'include'});if(res.ok){const d=await res.json();if(d.ok&&d.webhooks)setHooks(d.webhooks);}}catch{}
  },[]);
  useEffect(()=>{loadHooks();},[loadHooks]);

  return(<div style={{display:'grid',gap:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{fontWeight:700,fontSize:13}}>⚡ {t('devHub.webhookTitle')}</div>
      <button onClick={()=>setAdding(v=>!v)} style={{padding:'8px 16px',borderRadius:9,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#4f8ef7)',color: 'var(--text-1)',fontWeight:700,fontSize:11}}>
        {adding?t('devHub.cancel'):`+ ${t('devHub.webhookAdd')}`}
      </button>
    {adding&&(<div style={{padding:18,borderRadius:12,background:'rgba(0,0,0,0.25)',border:'1px solid rgba(99,102,241,0.2)'}}>
      <div style={{display:'grid',gap:10}}>
        <div><div style={{fontSize:10,color:'var(--text-3)',marginBottom:4}}>Endpoint URL</div>
          <input value={newUrl} onChange={e=>{if(!secCheck(e.target.value))setNewUrl(e.target.value)}} placeholder="https://your-server.com/webhook" style={{width:'100%',padding:'9px 12px',borderRadius:9,background: 'var(--surface)',border:'1px solid rgba(99,102,241,0.3)',color: 'var(--text-1)',fontSize:12,boxSizing:'border-box'}}/></div>
        <div><div style={{fontSize:10,color:'var(--text-3)',marginBottom:8}}>{t('devHub.selectEvents')}</div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {WEBHOOK_EVENTS.map(ev=>(<button key={ev} onClick={()=>toggleEv(ev)} style={{padding:'5px 12px',borderRadius:99,border:`1px solid ${selEvents.includes(ev)?'#6366f1':'rgba(255,255,255,0.1)'}`,background:selEvents.includes(ev)?'rgba(99,102,241,0.15)':'transparent',color:selEvents.includes(ev)?'#818cf8':'var(--text-3)',fontSize:10,fontWeight:700,cursor:'pointer'}}>{t(`devHub.ev_${ev.replace('.','_')}`)}</button>))}
          </div></div>
        <button onClick={handleAdd} disabled={saving} style={{padding:'9px 0',borderRadius:9,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#4f8ef7)',color: 'var(--text-1)',fontWeight:800,fontSize:12,opacity:saving?0.7:1}}>
          {saving?`⏳ ${t('devHub.saving')}`:`💾 ${t('devHub.webhookRegister')}`}
        </button>
    </div>)}
    {hooks.length===0&&!adding&&(<div style={{textAlign:'center',padding:'36px 20px'}}><div style={{fontSize:40,marginBottom:8,opacity:0.5}}>⚡</div><div style={{fontWeight:800,fontSize:14,color:'var(--text-1)',marginBottom:6}}>{t('devHub.noWebhooks')}</div><div style={{fontSize:11,color:'var(--text-3)'}}>{t('devHub.noWebhooksDesc')}</div></div>)}
    {hooks.map(h=>(<div key={h.id} className="card card-glass" style={{padding:'14px 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div><code style={{fontSize:12,color:'#4f8ef7',fontFamily:'monospace'}}>{h.url}</code>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:6}}>{(h.events||[]).map(ev=><span key={ev} style={{fontSize:9,padding:'2px 7px',borderRadius:99,background:'rgba(99,102,241,0.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,0.2)'}}>{ev}</span>)}</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:10,color:'var(--text-3)'}}>{h.created}</span>
          <span style={{padding:'3px 10px',borderRadius:99,background:h.active?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:h.active?'#22c55e':'#ef4444',fontSize:10,fontWeight:700,border:`1px solid ${h.active?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`}}>● {h.active?t('devHub.active'):t('devHub.inactive')}</span>
          <button onClick={()=>setHooks(p=>p.filter(x=>x.id!==h.id))} style={{padding:'4px 10px',borderRadius:7,border:'1px solid rgba(239,68,68,0.3)',background:'transparent',color:'#ef4444',fontSize:10,cursor:'pointer'}}>{t('devHub.delete')}</button>
      </div>
    </div>))}
                </div>
);
}

/* ─── Guide Tab ──────────────────────────────────────────────────────── */
function GuideTab({t}){
  const steps=Array.from({length:8},(_,i)=>i+1);
  const tips=Array.from({length:5},(_,i)=>i+1);
  return(<div style={{display:'grid',gap:16}}>
    <div className="card card-glass" style={{padding:'20px 24px',background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(79,142,247,0.04))'}}>
      <div style={{fontWeight:900,fontSize:16,color:'var(--text-1)',marginBottom:6}}>📖 {t('devHub.guideTitle')}</div>
      <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.7}}>{t('devHub.guideSub')}</div>
    <div className="card card-glass">
      <div style={{fontSize:13,fontWeight:800,color:'var(--text-1)',marginBottom:14}}>📋 {t('devHub.guideStepsTitle')}</div>
      <div style={{display:'grid',gap:10}}>
        {steps.map(i=>(<div key={i} style={{display:'flex',gap:12,padding:'12px 14px',borderRadius:10,background:'rgba(79,142,247,0.03)',border:'1px solid rgba(79,142,247,0.08)'}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#4f8ef7)',display:'flex',alignItems:'center',justifyContent:'center',color: 'var(--text-1)',fontSize:12,fontWeight:900,flexShrink:0}}>{i}</div>
          <div><div style={{fontWeight:800,fontSize:12,color:'var(--text-1)',marginBottom:4}}>{t(`devHub.guideStep${i}Title`)}</div><div style={{fontSize:11,color:'var(--text-2)',lineHeight:1.7}}>{t(`devHub.guideStep${i}Desc`)}</div></div>
        </div>))}
    </div>
    <div className="card card-glass">
      <div style={{fontSize:13,fontWeight:800,color:'var(--text-1)',marginBottom:14}}>💡 {t('devHub.guideTipsTitle')}</div>
      <div style={{display:'grid',gap:8}}>
        {tips.map(i=>(<div key={i} style={{display:'flex',gap:8,padding:'10px 12px',borderRadius:8,background:'rgba(234,179,8,0.04)',border:'1px solid rgba(234,179,8,0.12)'}}>
          <span style={{fontSize:14,flexShrink:0}}>💡</span>
          <div style={{fontSize:11,color:'var(--text-2)',lineHeight:1.7}}>{t(`devHub.guideTip${i}`)}</div>
        </div>))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function DeveloperHub(){
  const t=useT();
  const navigate=useNavigate();
  const{token}=useAuth();
  const{connectedChannels,connectedCount,refresh}=useConnectorSync();
  const{addAlert}=useGlobalData();
  const[tab,setTab]=useState('docs');
  const[copied,setCopied]=useState(false);
  const[methodFilter,setMethodFilter]=useState('ALL');
  const[search,setSearch]=useState('');
  const[secAlert,setSecAlert]=useState(null);

  useEffect(()=>{refresh();},[]);

  const secCheck=useCallback((input)=>{
    if(detectThreat(input)){setSecAlert(true);addAlert({type:'warn',msg:`🛡️ ${t('devHub.securityTitle')}`});return true;}return false;
  },[addAlert,t]);

  const filteredEps=useMemo(()=>API_ENDPOINTS.filter(ep=>(methodFilter==='ALL'||ep.method===methodFilter)&&(ep.path.includes(search)||t(`devHub.${ep.descKey}`).toLowerCase().includes(search.toLowerCase()))),[methodFilter,search,t]);

  const connChs=useMemo(()=>Object.entries(connectedChannels).filter(([,info])=>info.connected).map(([key,info])=>({key,...(CH_META[key]||{n:key,f:0,i:'🔌'}),keyCount:info.keyCount||0})),[connectedChannels]);

  const handleCopyToken=()=>{if(token){navigator.clipboard.writeText(token);setCopied(true);setTimeout(()=>setCopied(false),2000);}};

  const handleDownloadPostman=()=>{
    const col={info:{name:'Geniego-ROI API',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},item:API_ENDPOINTS.map(ep=>({name:t(`devHub.${ep.descKey}`),request:{method:ep.method,url:{raw:`${BASE_URL}${ep.path}`,host:[BASE_URL],path:ep.path.split('/').filter(Boolean)},header:ep.auth?[{key:'Authorization',value:'Bearer {{token}}'}]:[]}}))};
    const blob=new Blob([JSON.stringify(col,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Geniego-ROI-Postman.json';a.click();
  };

  return(
<div style={{display:'grid',gap:16}}>
    {secAlert&&<SecurityAlert t={t} onDismiss={()=>setSecAlert(null)}/>}

    {/* Hero */}
    <div className="hero fade-up">
      <div className="hero-meta">
        <div className="hero-icon" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(79,142,247,0.15))'}}>⚙️</div>
        <div>
          <div className="hero-title" style={{background:'linear-gradient(135deg,#6366f1,#4f8ef7)' }}>{t('devHub.heroTitle', 'Developer Hub')}</div>
          <div className="hero-desc">{t('devHub.heroDesc')}</div>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
        {['REST API v423','JSON','JWT Auth','Webhook','OpenAPI 3.0'].map(tag=>(<span key={tag} className="badge" style={{fontSize:9,background:'rgba(99,102,241,0.12)',color:'#818cf8',border:'1px solid rgba(99,102,241,0.25)'}}>{tag}</span>))}
        <span className="badge" style={{fontSize:9,background:'rgba(34,197,94,0.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.25)'}}>🔗 {connectedCount} {t('devHub.badgeChannels')}</span>
      <div style={{marginTop:10}}>
        <button onClick={handleDownloadPostman} style={{padding:'10px 20px',borderRadius:11,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#f97316,#ef4444)',color: 'var(--text-1)',fontWeight:800,fontSize:12}}>📦 {t('devHub.postmanDownload')}</button>
    </div>

    {/* Tabs */}
    <div className="card card-glass fade-up fade-up-1" style={{padding:'4px 6px'}}>
      <div style={{display:'flex',gap:4}}>
        {TABS.map(tabKey=>(<button key={tabKey} onClick={()=>setTab(tabKey)} style={{flex:1,padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',background:tab===tabKey?'rgba(99,102,241,0.12)':'transparent',color:tab===tabKey?'#6366f1':'var(--text-3)',fontWeight:tab===tabKey?800:600,fontSize:11,transition:'all 200ms'}}>{t(`devHub.tab_${tabKey}`)}</button>))}
    </div>

    <div className="fade-up fade-up-2">
      {/* API Docs */}
      {tab==='docs'&&(<div className="card card-glass" style={{padding:20}}>
        <div style={{display:'grid',gap:14}}>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{fontWeight:700,fontSize:13,flex:1}}>📖 {t('devHub.endpointList')}</div>
            <div style={{display:'flex',gap:6}}>
              {['ALL','GET','POST','DELETE'].map(m=>(<button key={m} onClick={()=>setMethodFilter(m)} style={{padding:'5px 12px',borderRadius:99,border:`1px solid ${methodFilter===m?(METHOD_COLOR[m]||'#6366f1'):'rgba(255,255,255,0.1)'}`,background:methodFilter===m?(METHOD_COLOR[m]||'#6366f1')+'18':'transparent',color:methodFilter===m?(METHOD_COLOR[m]||'#818cf8'):'var(--text-3)',fontSize:10,fontWeight:700,cursor:'pointer'}}>{m}</button>))}
            <input value={search} onChange={e=>{if(!secCheck(e.target.value))setSearch(e.target.value)}} placeholder={t('devHub.searchPlaceholder')} style={{padding:'7px 12px',borderRadius:9,background: 'var(--surface)',border: '1px solid var(--border)',color: 'var(--text-1)',fontSize:11,width:160}}/>
          <div style={{padding:'10px 14px',borderRadius:10,background: 'var(--surface)',border: '1px solid var(--border)'}}>
            <span style={{fontSize:10,color:'var(--text-3)',marginRight:8}}>Base URL:</span>
            <code style={{fontSize:12,color:'#4f8ef7',fontFamily:'monospace'}}>{BASE_URL}</code>
          {connChs.length>0&&(<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(34,197,94,0.04)',border:'1px solid rgba(34,197,94,0.15)'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#22c55e',marginBottom:6}}>🔗 {t('devHub.connectedApis')}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {connChs.map(ch=>(<span key={ch.key} style={{fontSize:9,padding:'3px 8px',borderRadius:99,background:'rgba(34,197,94,0.08)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)',fontWeight:700}}>{ch.i} {ch.n}{ch.f>0?` (${ch.f}%)`:''}</span>))}
          </div>)}
          <div style={{borderRadius:12,border: '1px solid var(--border)',overflow:'hidden'}}>
            {filteredEps.map((ep,i)=><EndpointRow key={i} ep={ep} t={t}/>)}
        </div>
      </div>)}

      {/* Webhook */}
      {tab==='webhook'&&(<div className="card card-glass" style={{padding:20}}><WebhookManager t={t} secCheck={secCheck}/></div>)}

      {/* API Auth */}
      {tab==='apikey'&&(<div className="card card-glass" style={{padding:20}}>
        <div style={{display:'grid',gap:16}}>
          <div style={{fontWeight:700,fontSize:13}}>🔑 {t('devHub.authTitle')}</div>
          <div style={{padding:'16px 18px',borderRadius:12,background:'rgba(79,142,247,0.06)',border:'1px solid rgba(79,142,247,0.2)'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#4f8ef7',marginBottom:10}}>{t('devHub.authMethodLabel')}</div>
            <div style={{fontFamily:'monospace',fontSize:12,background:'rgba(0,0,0,0.4)',padding:'12px 16px',borderRadius:9,marginBottom:10,color:'#a5b4fc',lineHeight:1.8}}>
              <div style={{color:'var(--text-3)'}}>{'// '}{t('devHub.authComment')}</div>
              <div>Authorization: Bearer <span style={{color:'#22c55e'}}>{'{your-jwt-token}'}</span></div><br/>
              <div style={{color:'var(--text-3)'}}>{'// '}{t('devHub.authLoginComment')}</div>
              <div><span style={{color:'#f97316'}}>POST</span> /api/auth/login</div>
              <div>{`{ "email": "...", "password": "..." }`}</div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <div style={{fontSize:10,color:'var(--text-3)'}}>{t('devHub.sessionToken')}:</div>
              <code style={{flex:1,fontSize:10,color:'#4f8ef7',fontFamily:'monospace',padding:'4px 10px',borderRadius:6,background: 'var(--surface)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{token?token.slice(0,40)+'...':t('devHub.loginRequired')}</code>
              <button onClick={handleCopyToken} style={{padding:'6px 14px',borderRadius:8,border:'1px solid rgba(79,142,247,0.3)',background:'transparent',color:'#4f8ef7',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{copied?`✅ ${t('devHub.copied')}`:`📋 ${t('devHub.copy')}`}</button>
          </div>
          <div style={{padding:'16px 18px',borderRadius:12,background:'rgba(234,179,8,0.05)',border:'1px solid rgba(234,179,8,0.2)'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#eab308',marginBottom:10}}>⚡ {t('devHub.rateLimits')}</div>
            <div style={{display:'grid',gap:8}}>
              {[{plan:'Starter',limit:'1,000 req/hr',color:'#4f8ef7'},{plan:'Growth',limit:'5,000 req/hr',color:'#a855f7'},{plan:'Pro / Enterprise',limit:'Unlimited',color:'#22c55e'}].map(r=>(<div key={r.plan} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-2)',padding:'6px 0',borderBottom: '1px solid var(--border)'}}><span style={{color:r.color,fontWeight:700}}>{r.plan}</span><span>{r.limit}</span></div>))}
          </div>
          <div style={{textAlign:'center',paddingTop:8}}>
            <button onClick={()=>navigate('/integration-hub')} className="btn-primary" style={{padding:'9px 20px',fontSize:12}}>🔗 {t('devHub.goIntegrationHub')}</button>
        </div>
      </div>)}

      {/* SDK Tab */}
      {tab==='sdk'&&(<div className="card card-glass" style={{padding:20}}>
        <div style={{display:'grid',gap:16}}>
          <div style={{fontWeight:700,fontSize:13}}>📦 {t('devHub.sdkTitle')}</div>
          {[{title:'JavaScript / Node.js',icon:'🟨',color:'#f97316',code:`const axios = require('axios');\nconst client = axios.create({\n  baseURL: '${BASE_URL}/api',\n  headers: { Authorization: \`Bearer \${TOKEN}\` }\n});\n\nconst orders = await client.get('/v423/orders', {\n  params: { status: 'pending', limit: 50 }\n});\nconsole.log(orders.data);`},{title:'Python',icon:'🐍',color:'#3b82f6',code:`import requests\n\nBASE = '${BASE_URL}/api'\nheaders = {'Authorization': f'Bearer {TOKEN}'}\n\nr = requests.get(f'{BASE}/v423/inventory', headers=headers)\ndata = r.json()\n\nr = requests.post(f'{BASE}/v423/campaigns',\n    headers=headers,\n    json={'name': 'Campaign', 'budget': 1000000})`},{title:'cURL',icon:'🖥️',color:'#22c55e',code:`# GET Orders\ncurl -X GET "${BASE_URL}/api/v423/orders?status=pending" \\\n  -H "Authorization: Bearer YOUR_TOKEN"\n\n# POST Campaign\ncurl -X POST "${BASE_URL}/api/v423/campaigns" \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Test","budget":1000000}'`}].map(sdk=>(<div key={sdk.title} style={{borderRadius:12,border:`1px solid ${sdk.color}22`,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',background:`${sdk.color}08`,display:'flex',alignItems:'center',gap:8}}><span>{sdk.icon}</span><span style={{fontWeight:700,fontSize:12,color:sdk.color}}>{sdk.title}</span></div>
            <pre style={{margin:0,padding:'14px 16px',background:'rgba(0,0,0,0.4)',color:'#a5b4fc',fontSize:11,fontFamily:'monospace',lineHeight:1.7,overflowX:'auto'}}>{sdk.code}</pre>
          </div>))}
      </div>)}

      {/* Guide */}
      {tab==='guide'&&<GuideTab t={t}/>}

    {/* Live Sync Status */}
    <div className="card card-glass fade-up fade-up-3" style={{padding:'10px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,fontSize:10,color:'var(--text-3)'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite'}}/>
        {t('devHub.liveSyncStatus')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}