import React,{useState,useMemo,useCallback}from'react';
import{useI18n as _useI18n}from'../i18n/index.js';
import{useCurrency}from'../contexts/CurrencyContext.jsx';
import{useAuth}from'../auth/AuthContext';
import RP from'./rpI18n.js';

function useI18n(){const c=_useI18n();const lang=c.lang||'en';const ot=c.t;
const t=(k,fb)=>{if(k&&k.startsWith('rp.')){const x=k.slice(3);const d=RP[lang]||RP.en||{};if(d[x]!==undefined)return d[x];}return ot(k,fb);};
return{...c,t};}

const useTr=()=>{const{t,lang}=useI18n();return useCallback(k=>{const d=RP[lang]||RP.en||{};return d[k]||k;},[lang]);};

const Card=({children,style={}})=><div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'16px 20px',marginBottom:12,...style}}>{children}</div>;
const Stat=({label,value,color='#6366f1',sub})=><Card><div style={{fontSize:10,color:'#7c8fa8',marginBottom:2}}>{label}</div><div style={{fontSize:22,fontWeight:800,color}}>{value}</div>{sub&&<div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{sub}</div>}</Card>;
const Badge=({label,color})=><span style={{background:color+'22',color,border:'1px solid '+color+'55',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700}}>{label}</span>;

const DEMO_RETURNS=[
{id:'RT-2401',orderNo:'ORD-87231',product:'Premium Wireless Earbuds',customer:'김민수',channel:'coupang',reason:'defective',status:'pending',date:'2026-04-25',amount:89000,inspGrade:null,refundMethod:null},
{id:'RT-2402',orderNo:'ORD-87455',product:'Organic Cotton T-Shirt L',customer:'이지현',channel:'naver',reason:'wrongItem',status:'approved',date:'2026-04-24',amount:35000,inspGrade:'A',refundMethod:'card'},
{id:'RT-2403',orderNo:'ORD-87102',product:'Smart Watch Band Black',customer:'박준혁',channel:'11st',reason:'damaged',status:'refunded',date:'2026-04-23',amount:22000,inspGrade:'C',refundMethod:'bank'},
{id:'RT-2404',orderNo:'ORD-87789',product:'Bamboo Phone Case',customer:'최서연',channel:'gmarket',reason:'notAsDesc',status:'restocked',date:'2026-04-22',amount:15000,inspGrade:'A',refundMethod:'original'},
{id:'RT-2405',orderNo:'ORD-87333',product:'LED Desk Lamp Pro',customer:'정태우',channel:'kakaogift',reason:'changeOfMind',status:'pending',date:'2026-04-26',amount:67000,inspGrade:null,refundMethod:null},
{id:'RT-2406',orderNo:'ORD-87600',product:'Protein Powder 1kg',customer:'한소희',channel:'lotteon',reason:'lateDelivery',status:'approved',date:'2026-04-21',amount:45000,inspGrade:'B',refundMethod:'card'},
{id:'RT-2407',orderNo:'ORD-87801',product:'Bluetooth Speaker Mini',customer:'윤재호',channel:'coupang',reason:'defective',status:'disposed',date:'2026-04-20',amount:32000,inspGrade:'F',refundMethod:'bank'},
];

const STATUS_COLORS={pending:'#f59e0b',approved:'#22c55e',rejected:'#ef4444',refunded:'#6366f1',restocked:'#06b6d4',disposed:'#94a3b8'};

function OverviewTab({data,tr,fmt}){
const kpis=useMemo(()=>{const t=data.length,p=data.filter(d=>d.status==='pending').length,a=data.filter(d=>d.status==='approved').length,r=data.filter(d=>d.status==='refunded').length;return{t,p,a,r};},[data]);
return <div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
<Stat label={tr('kpiTotal')} value={kpis.t} color="#6366f1"/>
<Stat label={tr('kpiPending')} value={kpis.p} color="#f59e0b"/>
<Stat label={tr('kpiApproved')} value={kpis.a} color="#22c55e"/>
<Stat label={tr('kpiRefunded')} value={kpis.r} color="#6366f1"/>
<Stat label={tr('kpiRate')} value={(kpis.t>0?((kpis.t/50)*100).toFixed(1):'0')+'%'} color="#ef4444"/>
<Stat label={tr('kpiAvgDays')} value="3.2" color="#06b6d4" sub={tr('date')}/>
</div>
<Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>{tr('tabRequests')} - {tr('tabOverview')}</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{['ID',tr('orderNo'),tr('product'),tr('customer'),tr('channel'),tr('reason'),tr('status'),tr('amount')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{data.slice(0,10).map((r,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontFamily:'monospace',color:'#6366f1',fontWeight:700}}>{r.id}</td>
<td style={{padding:'6px 8px',fontSize:10,color:'#64748b'}}>{r.orderNo}</td>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{r.product}</td>
<td style={{padding:'6px 8px'}}>{r.customer}</td>
<td style={{padding:'6px 8px'}}><Badge label={r.channel} color={r.channel==='coupang'?'#ef4444':'#22c55e'}/></td>
<td style={{padding:'6px 8px'}}>{tr('reason'+r.reason.charAt(0).toUpperCase()+r.reason.slice(1))||r.reason}</td>
<td style={{padding:'6px 8px'}}><Badge label={tr('status'+r.status.charAt(0).toUpperCase()+r.status.slice(1))} color={STATUS_COLORS[r.status]||'#94a3b8'}/></td>
<td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:'#1e293b'}}>{fmt(r.amount)}</td>
</tr>)}</tbody></table></Card></div>;
}

function RequestsTab({data,tr,fmt}){
return <Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>📋 {tr('tabRequests')}</div>
<div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
<button style={{padding:'6px 14px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {tr('register')}</button>
<button style={{padding:'6px 14px',borderRadius:8,background:'#f1f5f9',color:'#1e293b',border:'1px solid #e5e7eb',fontSize:11,fontWeight:600,cursor:'pointer'}}>🔍 {tr('search')}</button>
<button style={{padding:'6px 14px',borderRadius:8,background:'#f1f5f9',color:'#1e293b',border:'1px solid #e5e7eb',fontSize:11,fontWeight:600,cursor:'pointer'}}>📤 {tr('export')}</button>
</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{['ID',tr('orderNo'),tr('product'),tr('reason'),tr('status'),tr('date'),tr('amount')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{data.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontFamily:'monospace',color:'#6366f1',fontWeight:700}}>{r.id}</td>
<td style={{padding:'6px 8px',color:'#64748b'}}>{r.orderNo}</td>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{r.product}</td>
<td style={{padding:'6px 8px'}}>{tr('reason'+r.reason.charAt(0).toUpperCase()+r.reason.slice(1))||r.reason}</td>
<td style={{padding:'6px 8px'}}><Badge label={tr('status'+r.status.charAt(0).toUpperCase()+r.status.slice(1))} color={STATUS_COLORS[r.status]||'#94a3b8'}/></td>
<td style={{padding:'6px 8px',color:'#64748b'}}>{r.date}</td>
<td style={{padding:'6px 8px',textAlign:'right',fontWeight:700}}>{fmt(r.amount)}</td>
</tr>)}</tbody></table></Card>;
}

function InspectionTab({data,tr}){
return <Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>🔍 {tr('tabInspection')}</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{['ID',tr('product'),tr('inspResult'),tr('inspGrade'),tr('inspDate')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{data.filter(r=>r.inspGrade).map((r,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontFamily:'monospace',color:'#6366f1',fontWeight:700}}>{r.id}</td>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{r.product}</td>
<td style={{padding:'6px 8px'}}><Badge label={r.inspGrade==='F'?tr('inspFail'):r.inspGrade==='C'?tr('inspPartial'):tr('inspPass')} color={r.inspGrade==='F'?'#ef4444':r.inspGrade==='C'?'#f59e0b':'#22c55e'}/></td>
<td style={{padding:'6px 8px'}}><Badge label={tr('grade'+r.inspGrade)} color={r.inspGrade==='A'?'#22c55e':r.inspGrade==='B'?'#06b6d4':r.inspGrade==='C'?'#f59e0b':'#ef4444'}/></td>
<td style={{padding:'6px 8px',color:'#64748b'}}>{r.date}</td>
</tr>)}</tbody></table></Card>;
}

function RefundsTab({data,tr,fmt}){
const refunded=data.filter(r=>r.refundMethod);
return <Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>💰 {tr('tabRefunds')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:16}}>
<Stat label={tr('refundPending')} value={data.filter(r=>r.status==='pending'||r.status==='approved').length} color="#f59e0b"/>
<Stat label={tr('refundComplete')} value={refunded.length} color="#22c55e"/>
<Stat label={tr('refundAmount')} value={fmt(refunded.reduce((s,r)=>s+r.amount,0))} color="#6366f1"/>
</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{['ID',tr('product'),tr('amount'),tr('refundMethod'),tr('refundStatus')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{refunded.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontFamily:'monospace',color:'#6366f1',fontWeight:700}}>{r.id}</td>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{r.product}</td>
<td style={{padding:'6px 8px',fontWeight:700}}>{fmt(r.amount)}</td>
<td style={{padding:'6px 8px'}}><Badge label={r.refundMethod==='card'?tr('refundCard'):r.refundMethod==='bank'?tr('refundBank'):tr('refundOriginal')} color="#6366f1"/></td>
<td style={{padding:'6px 8px'}}><Badge label={tr('refundComplete')} color="#22c55e"/></td>
</tr>)}</tbody></table></Card>;
}

function RestockTab({data,tr}){
const items=data.filter(r=>r.inspGrade&&r.inspGrade!=='F');
return <Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>📦 {tr('tabRestock')}</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{['ID',tr('product'),tr('inspGrade'),tr('restockLocation'),tr('status')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{items.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontFamily:'monospace',color:'#6366f1',fontWeight:700}}>{r.id}</td>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{r.product}</td>
<td style={{padding:'6px 8px'}}><Badge label={tr('grade'+r.inspGrade)} color={r.inspGrade==='A'?'#22c55e':'#06b6d4'}/></td>
<td style={{padding:'6px 8px',color:'#64748b'}}>{r.inspGrade==='A'?'WH-A1 (Main)':'WH-B2 (Outlet)'}</td>
<td style={{padding:'6px 8px'}}><Badge label={r.inspGrade==='A'?tr('restockResell'):tr('restockRecycle')} color={r.inspGrade==='A'?'#22c55e':'#f59e0b'}/></td>
</tr>)}</tbody></table></Card>;
}

function AnalyticsTab({data,tr}){
const reasons={};data.forEach(r=>{reasons[r.reason]=(reasons[r.reason]||0)+1;});
const channels={};data.forEach(r=>{channels[r.channel]=(channels[r.channel]||0)+1;});
return <div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
<Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>📊 {tr('analyticsByReason')}</div>
{Object.entries(reasons).map(([k,v])=><div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
<div style={{flex:1,fontSize:11,color:'#64748b'}}>{tr('reason'+k.charAt(0).toUpperCase()+k.slice(1))||k}</div>
<div style={{width:120,background:'#e5e7eb',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:(v/data.length*100)+'%',background:'#6366f1',height:'100%',borderRadius:4}}/></div>
<div style={{fontSize:11,fontWeight:700,color:'#6366f1',minWidth:30}}>{v}</div>
</div>)}</Card>
<Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>📊 {tr('analyticsByChannel')}</div>
{Object.entries(channels).map(([k,v])=><div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
<div style={{flex:1,fontSize:11,color:'#64748b'}}>{k}</div>
<div style={{width:120,background:'#e5e7eb',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:(v/data.length*100)+'%',background:'#22c55e',height:'100%',borderRadius:4}}/></div>
<div style={{fontSize:11,fontWeight:700,color:'#22c55e',minWidth:30}}>{v}</div>
</div>)}</Card>
</div></div>;
}

function PoliciesTab({tr}){
const policies=[
{name:tr('policyAutoApprove')+' - '+tr('reasonChangeOfMind'),days:7,active:true},
{name:tr('policyAutoApprove')+' - '+tr('reasonDefective'),days:30,active:true},
{name:tr('policyMaxDays')+' 14'+tr('policyDays'),days:14,active:true},
{name:tr('policyMaxDays')+' 30'+tr('policyDays'),days:30,active:false},
];
return <Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>⚙️ {tr('tabPolicies')}</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{[tr('policyName'),tr('policyDays'),tr('status')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{policies.map((p,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{p.name}</td>
<td style={{padding:'6px 8px'}}>{p.days}</td>
<td style={{padding:'6px 8px'}}><Badge label={p.active?tr('policyActive'):tr('policyInactive')} color={p.active?'#22c55e':'#94a3b8'}/></td>
</tr>)}</tbody></table></Card>;
}

function GuideTab({tr}){
const steps=[];for(let i=1;i<=15;i++)steps.push({t:tr('guideStep'+i+'T'),d:tr('guideStep'+i+'D')});
return <div>
<Card style={{background:'linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 100%)',border:'1px solid rgba(99,102,241,0.15)'}}>
<div style={{textAlign:'center',padding:'20px 0'}}>
<div style={{fontSize:36,marginBottom:8}}>📖</div>
<div data-guide-title="true" style={{fontSize:20,fontWeight:800,color:'#4f46e5'}}>{tr('guideTitle')}</div>
<div style={{fontSize:13,color:'#64748b',marginTop:4}}>{tr('guideSub')}</div>
<div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
<Badge label={tr('guideBeginner')} color="#22c55e"/>
<Badge label={tr('guideTime')} color="#06b6d4"/>
<Badge label={tr('guideLang')} color="#6366f1"/>
</div>
</div></Card>
<Card style={{borderLeft:'3px solid #f59e0b'}}><div style={{fontSize:13,fontWeight:700,color:'#f59e0b',marginBottom:4}}>🚀 {tr('guideStart')}</div><div style={{fontSize:12,color:'#64748b'}}>{tr('guideStartDesc')}</div></Card>
<Card><div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:16}}>📋 {tr('guideSteps')}</div>
{steps.map((s,i)=><div key={i} style={{display:'flex',gap:12,marginBottom:14,alignItems:'flex-start'}}>
<div style={{width:28,height:28,borderRadius:'50%',background:i<5?'#6366f1':i<10?'#22c55e':'#f59e0b',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</div>
<div><div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{s.t}</div><div style={{fontSize:11,color:'#64748b',marginTop:2}}>{s.d}</div></div>
</div>)}
</Card>
<Card style={{borderLeft:'3px solid #22c55e'}}><div style={{fontSize:13,fontWeight:700,color:'#22c55e',marginBottom:4}}>✅ {tr('guideReady')}</div><div style={{fontSize:12,color:'#64748b'}}>{tr('guideReadyDesc')}</div></Card>
</div>;
}

const TABS=['tabOverview','tabRequests','tabInspection','tabRefunds','tabRestock','tabAnalytics','tabPolicies','tabGuide'];
const TAB_ICONS=['📊','📋','🔍','💰','📦','📈','⚙️','📖'];
const PERIOD_TABS=new Set(['tabOverview','tabRequests','tabInspection','tabRefunds','tabAnalytics']);

export default function ReturnsPortal(){
const tr=useTr();
const{fmt}=useCurrency();
const{user}=useAuth();
const isDemo=user?.email?.includes('demo')||window.location.hostname.includes('demo');
const[tab,setTab]=useState('tabOverview');
const[data]=useState(()=>isDemo?DEMO_RETURNS:[]);

const titleStyle={fontSize:22,fontWeight:800,color:'#1e293b'};
const subStyle={fontSize:13,color:'#64748b',marginTop:4};
const tabBtnStyle=(active)=>({padding:'8px 16px',borderRadius:8,border:active?'none':'1px solid #e5e7eb',background:active?'#4f46e5':'#fff',color:active?'#fff':'#374151',fontSize:12,fontWeight:active?700:500,cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'all 0.2s'});

return <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f8fafc',color:'#1e293b'}}>
{/* Title */}
<div style={{padding:'18px 28px 0',flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<span style={{fontSize:28}}>📦</span>
<div><div style={titleStyle}>{tr('pageTitle')}</div><div style={subStyle}>{tr('pageSub')}</div></div>
</div>
<div style={{display:'flex',gap:6,marginTop:10}}>
<Badge label={tr('badgeLive')} color="#22c55e"/>
<Badge label={tr('badgeSync')} color="#06b6d4"/>
<Badge label={tr('badgeSecurity')} color="#6366f1"/>
</div>
</div>
{/* Sub-tabs fixed */}
<div style={{padding:'12px 28px',display:'flex',gap:6,flexWrap:'wrap',borderBottom:'1px solid #e5e7eb',background:'#fff',position:'sticky',top:0,zIndex:10,flexShrink:0}}>
{TABS.map((t2,i)=><button key={t2} style={tabBtnStyle(tab===t2)} onClick={()=>setTab(t2)}>{TAB_ICONS[i]} {tr(t2)}</button>)}
</div>
{/* Content scroll */}
<div style={{flex:1,overflowY:'auto',padding:'20px 28px 40px'}}>
{tab==='tabOverview'&&<OverviewTab data={data} tr={tr} fmt={fmt}/>}
{tab==='tabRequests'&&<RequestsTab data={data} tr={tr} fmt={fmt}/>}
{tab==='tabInspection'&&<InspectionTab data={data} tr={tr}/>}
{tab==='tabRefunds'&&<RefundsTab data={data} tr={tr} fmt={fmt}/>}
{tab==='tabRestock'&&<RestockTab data={data} tr={tr}/>}
{tab==='tabAnalytics'&&<AnalyticsTab data={data} tr={tr}/>}
{tab==='tabPolicies'&&<PoliciesTab tr={tr}/>}
{tab==='tabGuide'&&<GuideTab tr={tr}/>}
</div>
</div>;
}
