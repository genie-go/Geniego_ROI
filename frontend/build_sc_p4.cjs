// Part 4: Guide tab + Main SupplyChain component
const fs=require('fs');
const OUT='src/pages/SupplyChain.jsx';

const code=`
/* ══════════════════════════════════════════════════════════════
   Tab 8: Guide
   ══════════════════════════════════════════════════════════════ */
function GuideTab({tr}){
const steps=[];
for(let i=1;i<=15;i++){
const colors=['#4f8ef7','#22c55e','#a855f7','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#ef4444','#0ea5e9','#d946ef','#eab308','#10b981'];
const icons=['🏭','📦','📋','📊','⏱','🚨','💰','⭐','🔄','📈','🛡️','🔍','💬','📅','🎯'];
steps.push({n:i,k:'guideStep'+i,c:colors[(i-1)%colors.length],icon:icons[(i-1)%icons.length]});
}
const tabDescs=[{k:'guideTabTimeline',c:'#4f8ef7',icon:'📦'},{k:'guideTabSuppliers',c:'#22c55e',icon:'🏭'},{k:'guideTabInventory',c:'#f97316',icon:'📋'},{k:'guideTabPO',c:'#a855f7',icon:'📝'},{k:'guideTabLeadTime',c:'#ec4899',icon:'⏱'},{k:'guideTabRisk',c:'#ef4444',icon:'🚨'},{k:'guideTabLandedCost',c:'#06b6d4',icon:'💰'},{k:'guideTabGuide',c:'#6366f1',icon:'📖'}];
const tips=[];for(let i=1;i<=5;i++)tips.push({k:'guideTip'+i,icon:['💡','⚠️','📉','🎯','🔄'][i-1]});
const faqs=[];for(let i=1;i<=5;i++)faqs.push({k:'guideFaq'+i});
return(
<div style={{display:'flex',flexDirection:'column',gap:20,animation:'fadeIn 0.4s'}}>
{/* Hero */}
<div style={{background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))',border:'1px solid rgba(79,142,247,0.3)',borderRadius:16,padding:'36px 24px',textAlign:'center',color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontSize:52}}>🔗</div>
<div style={{fontWeight:900,fontSize:24,marginTop:10,color:'#1e293b'}}>{tr('guideTitle')}</div>
<div style={{fontSize:14,color:'#64748b',marginTop:8,maxWidth:640,margin:'8px auto 0',lineHeight:1.8}}>{tr('guideSub')}</div>
<div style={{display:'flex',justifyContent:'center',gap:16,marginTop:18,flexWrap:'wrap'}}>
<div style={{background:'rgba(79,142,247,0.15)',border:'1px solid rgba(79,142,247,0.3)',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:'#4f8ef7'}}>📋 {tr('guideBeginnerBadge')}</div>
<div style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:'#22c55e'}}>⏱ {tr('guideTimeBadge')}</div>
<div style={{background:'rgba(168,85,247,0.15)',border:'1px solid rgba(168,85,247,0.3)',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:'#a855f7'}}>🌍 {tr('guideLangBadge')}</div>
</div>
</div>
{/* Where to Start */}
<div style={{background:'rgba(255,255,255,0.92)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,padding:20,borderLeft:'4px solid #4f8ef7',color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontWeight:900,fontSize:16,marginBottom:8,color:'#1e293b'}}>🚀 {tr('guideWhereToStart')}</div>
<div style={{fontSize:13,color:'#475569',lineHeight:1.8}}>{tr('guideWhereToStartDesc')}</div>
</div>
{/* 15-Step Guide */}
<div style={{background:'rgba(255,255,255,0.92)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,padding:20,color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontWeight:900,fontSize:16,marginBottom:16,color:'#1e293b'}}>📚 {tr('guideStepsTitle')}</div>
<div style={{display:'flex',flexDirection:'column',gap:12}}>
{steps.map(s=>(
<div key={s.n} style={{background:s.c+'08',border:'1px solid '+s.c+'20',borderRadius:12,padding:'14px 18px',borderLeft:'4px solid '+s.c}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
<span style={{fontSize:20}}>{s.icon}</span>
<span style={{fontWeight:800,fontSize:14,color:s.c}}>Step {s.n}. {tr(s.k+'Title')}</span>
</div>
<div style={{fontSize:13,color:'#475569',lineHeight:1.8,paddingLeft:30}}>{tr(s.k+'Desc')}</div>
</div>))}
</div>
</div>
{/* Tab Reference */}
<div style={{background:'rgba(255,255,255,0.92)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,padding:20,color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontWeight:900,fontSize:16,marginBottom:16,color:'#1e293b'}}>🗂 {tr('guideTabsTitle')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
{tabDescs.map((td,i)=>(
<div key={i} style={{background:td.c+'0a',border:'1px solid '+td.c+'25',borderRadius:10,padding:'14px 16px'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:18}}>{td.icon}</span><span style={{fontWeight:700,fontSize:13,color:td.c}}>{tr('tab'+td.k.replace('guideTab',''))}</span></div>
<div style={{fontSize:11,color:'#475569',lineHeight:1.7}}>{tr(td.k+'Desc')}</div>
</div>))}
</div>
</div>
{/* Expert Tips */}
<div style={{background:'rgba(255,255,255,0.92)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,padding:20,color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontWeight:900,fontSize:16,marginBottom:14,color:'#1e293b'}}>💡 {tr('guideTipsTitle')}</div>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{tips.map((tp,i)=>(
<div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 14px',borderRadius:8,border:'1px solid rgba(0,0,0,0.06)'}}>
<span style={{fontSize:18,flexShrink:0}}>{tp.icon}</span>
<div style={{fontSize:12,color:'#475569',lineHeight:1.7}}>{tr(tp.k)}</div>
</div>))}
</div>
</div>
{/* FAQ */}
<div style={{background:'rgba(255,255,255,0.92)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,padding:20,color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontWeight:900,fontSize:16,marginBottom:14,color:'#1e293b'}}>❓ {tr('guideFaqTitle')}</div>
<div style={{display:'flex',flexDirection:'column',gap:12}}>
{faqs.map((f,i)=>(
<div key={i} style={{padding:'12px 16px',borderRadius:10,background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.12)'}}>
<div style={{fontSize:13,fontWeight:700,color:'#1e293b',marginBottom:6}}>Q. {tr(f.k+'Q')}</div>
<div style={{fontSize:12,color:'#475569',lineHeight:1.8}}>A. {tr(f.k+'A')}</div>
</div>))}
</div>
</div>
{/* Ready */}
<div style={{textAlign:'center',padding:24,background:'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(34,197,94,0.06))',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,color:'#1e293b',backdropFilter:'blur(12px)'}}>
<div style={{fontSize:14,fontWeight:800,marginBottom:6,color:'#1e293b'}}>🎉 {tr('guideReadyTitle')}</div>
<div style={{fontSize:12,color:'#475569',lineHeight:1.7}}>{tr('guideReadyDesc')}</div>
</div>
</div>);
}

/* ══════════════════════════════════════════════════════════════════
   Main SupplyChain Component (Enterprise Light Edition)
   ══════════════════════════════════════════════════════════════════ */
export default function SupplyChain(){
const{t}=useI18n();
const{fmt}=useCurrency();
const{addAlert}=typeof window!=='undefined'?(() => { try{const m=require('../context/GlobalDataContext.jsx');return m.useGlobalData();}catch{return{addAlert:null};}})():{addAlert:null};
const[tab,setTab]=useState('timeline');
const tr=useTr();

useSecurityGuard({addAlert:useCallback((a)=>{if(typeof addAlert==='function')addAlert(a);},[addAlert]),enabled:true});

const TAB_CLR={timeline:'#4f8ef7',suppliers:'#22c55e',inventory:'#f97316',po:'#a855f7',leadtime:'#ec4899',risk:'#ef4444',landedcost:'#06b6d4',guide:'#6366f1'};

const TABS=useMemo(()=>[
{id:'timeline',icon:'📦',label:tr('tabTimeline')},
{id:'suppliers',icon:'🏭',label:tr('tabSuppliers')},
{id:'inventory',icon:'📋',label:tr('tabInventory')},
{id:'po',icon:'📝',label:tr('tabPO')},
{id:'leadtime',icon:'⏱',label:tr('tabLeadTime')},
{id:'risk',icon:'🚨',label:tr('tabRisk')},
{id:'landedcost',icon:'💰',label:tr('tabLandedCost')},
{id:'guide',icon:'📖',label:tr('tabGuide')},
],[tr]);

const showDatePicker=tab!=='guide'&&tab!=='landedcost';

return(
<div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
<AIRecommendBanner context="supply-chain"/>

{/* ══════ Hero Header ══════ */}
<div style={{padding:'18px 24px',flexShrink:0,background:'#ffffff',borderBottom:'1px solid rgba(0,0,0,0.06)',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
<div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',maxWidth:1400,margin:'0 auto'}}>
<div style={{width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,rgba(79,142,247,0.15),rgba(79,142,247,0.05))',border:'1px solid rgba(79,142,247,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🔗</div>
<div style={{flex:1,minWidth:200}}>
<div style={{fontWeight:900,fontSize:20,color:'#4f8ef7',letterSpacing:'-0.3px'}}>{tr('pageTitle')}</div>
<div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{tr('pageSub')}</div>
</div>
{showDatePicker&&(
<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
<span style={{fontSize:11,fontWeight:700,color:'#64748b'}}>📅 {tr('periodLabel')}</span>
<div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:8,padding:'4px 10px'}}>
<span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block',boxShadow:'0 0 6px #22c55e'}}/>
<span style={{fontSize:11,color:'#16a34a',fontWeight:700}}>LIVE</span>
</div>
</div>)}
</div>
</div>

{/* ══════ Sub-Tab Navigation ══════ */}
<div style={{flexShrink:0,background:'#ffffff',padding:'4px 6px 0',borderBottom:'1px solid rgba(0,0,0,0.06)',boxShadow:'0 1px 2px rgba(0,0,0,0.03)'}}>
<div style={{display:'flex',gap:4,flexWrap:'wrap',background:'rgba(241,245,249,0.7)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:14,padding:'6px 8px',maxWidth:1400,margin:'0 auto'}}>
{TABS.map(tb=>{
const active=tab===tb.id;
const c=TAB_CLR[tb.id];
return(
<button key={tb.id} onClick={()=>setTab(tb.id)} style={{
display:'flex',alignItems:'center',gap:5,
padding:'7px 13px',borderRadius:10,border:'none',cursor:'pointer',
fontSize:12,fontWeight:700,
transition:'all 0.2s cubic-bezier(.4,0,.2,1)',
background:active?c:'transparent',
color:active?'#ffffff':'#64748b',
boxShadow:active?'0 4px 20px '+c+'40':'none',
transform:active?'translateY(-1px)':'none'
}} onMouseEnter={e=>{if(!active){e.currentTarget.style.background=c+'10';e.currentTarget.style.color='#1e293b';}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#64748b';}}}><span style={{fontSize:14}}>{tb.icon}</span>{tb.label}</button>
);})}
</div>
</div>

{/* ══════ Scrollable Content ══════ */}
<div style={{flex:1,minHeight:0,overflowY:'auto',padding:'16px 20px 40px'}}>
<div style={{maxWidth:1400,margin:'0 auto'}}>
{tab==='timeline'&&<TimelineTab tr={tr} fmt={fmt}/>}
{tab==='suppliers'&&<SuppliersTab tr={tr} fmt={fmt}/>}
{tab==='inventory'&&<InventoryTab tr={tr} fmt={fmt}/>}
{tab==='po'&&<POTab tr={tr} fmt={fmt}/>}
{tab==='leadtime'&&<LeadTimeTab tr={tr} fmt={fmt}/>}
{tab==='risk'&&<RiskTab tr={tr}/>}
{tab==='landedcost'&&<LandedCostTab tr={tr}/>}
{tab==='guide'&&<GuideTab tr={tr}/>}
</div>
</div>
</div>);
}
`;
fs.appendFileSync(OUT,code,'utf8');
console.log('Part 4 written:',code.length,'chars');
