import React,{useState,useMemo,useCallback}from'react';
import{useI18n as _useI18n}from'../i18n/index.js';
import{useCurrency}from'../contexts/CurrencyContext.jsx';
import{useAuth}from'../auth/AuthContext';
import{useGlobalData}from'../context/GlobalDataContext.jsx';
import{useProductSelection}from'../contexts/ProductSelectionContext.jsx';
import RP from'./rpI18n.js';
import { IS_DEMO } from '../utils/demoEnv';
import * as apiClient from '../services/apiClient';
import PeriodFilterBar, { inPeriodAny } from '../components/common/PeriodFilterBar.jsx'; // [현 차수] 기간조회

function useI18n(){const c=_useI18n();const lang=c.lang||'en';const ot=c.t;
const t=(k,fb)=>{if(k&&k.startsWith('rp.')){const x=k.slice(3);const d=RP[lang]||RP.en||{};if(d[x]!==undefined)return d[x];}return ot(k,fb);};
return{...c,t};}

const useTr=()=>{const{t,lang}=useI18n();return useCallback(k=>{const d=RP[lang]||RP.en||{};return d[k]||k;},[lang]);};

const Card=({children,style={}})=><div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'16px 20px',marginBottom:12,...style}}>{children}</div>;
const Stat=({label,value,color='#6366f1',sub,style={}})=><Card style={{padding:'9px 16px',marginBottom:0,...style}}><div style={{fontSize:10,color:'#7c8fa8',marginBottom:2}}>{label}</div><div style={{fontSize:22,fontWeight:800,color}}>{value}</div>{sub&&<div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{sub}</div>}</Card>;
const Badge=({label,color})=><span style={{background:color+'22',color,border:'1px solid '+color+'55',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700}}>{label}</span>;

// 204차: 전자제품 DEMO_RETURNS 하드코딩 제거 — 데모 반품은 단일소스 orders(L'Oréal)에서 파생(ReturnsPortal 본체).
const STATUS_COLORS={pending:'#f59e0b',approved:'#22c55e',rejected:'#ef4444',refunded:'#6366f1',restocked:'#06b6d4',disposed:'#94a3b8'};

function OverviewTab({data,tr,fmt,orderCount=0,claimStats=null}){
// [225차 P1-16] 운영 KPI 카운트는 서버 클레임 통계(전체 행) 우선 — claims?limit=200 배열 집계 과소 해소.
//   서버 통계 미가용(데모·실패) 시 표시용 data 배열 폴백.
const kpis=useMemo(()=>{
  if(claimStats&&claimStats.ok){return{t:Number(claimStats.total)||0,p:Number(claimStats.pending)||0,a:Number(claimStats.approved)||0,r:Number(claimStats.refunded)||0};}
  const t=data.length,p=data.filter(d=>d.status==='pending').length,a=data.filter(d=>d.status==='approved').length,r=data.filter(d=>d.status==='refunded').length;return{t,p,a,r};
},[data,claimStats]);
// 204차 동기화: 반품률=반품수/전체주문수(단일소스 orderCount, 과거 /50 임의분모), 평균처리일=상태별 가중 파생(과거 "3.2" 하드코딩).
const rate=useMemo(()=>orderCount>0?((kpis.t/orderCount)*100).toFixed(1):'0',[kpis.t,orderCount]);
const avgDays=useMemo(()=>{if(!data.length)return'0';const D={refunded:4.2,approved:2.1,pending:1.0,restocked:3.5,disposed:5.0};return(data.reduce((s,d)=>s+(D[d.status]||2),0)/data.length).toFixed(1);},[data]);
return <div>
<div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:20,justifyContent:'flex-end',marginLeft:'auto'}}>
<Stat label={tr('kpiTotal')} value={kpis.t} color="#6366f1"/>
<Stat label={tr('kpiPending')} value={kpis.p} color="#f59e0b"/>
<Stat label={tr('kpiApproved')} value={kpis.a} color="#22c55e"/>
<Stat label={tr('kpiRefunded')} value={kpis.r} color="#6366f1"/>
<Stat label={tr('kpiRate')} value={rate+'%'} color="#ef4444"/>
<Stat label={tr('kpiAvgDays')} value={avgDays} color="#06b6d4" sub={tr('date')}/>
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

function RequestsTab({data,tr,fmt,onAdd}){
// [259차] 죽은 버튼(등록/검색/내보내기 onClick 전무) → 실배선: 등록=추가모달 콜백, 검색=클라 필터, 내보내기=CSV.
const [q,setQ]=useState('');
const rows=q.trim()?data.filter(r=>['id','orderNo','product','reason','status','sku'].some(k=>String(r[k]??'').toLowerCase().includes(q.trim().toLowerCase()))):data;
const exportCsv=()=>{
  const head=['ID','orderNo','product','reason','status','date','amount'];
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const lines=[head.join(',')].concat(rows.map(r=>[r.id,r.orderNo,r.product,r.reason,r.status,r.date,r.amount].map(esc).join(',')));
  const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`returns_${Date.now()}.csv`;a.click();URL.revokeObjectURL(url);
};
return <Card><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'#1e293b'}}>📋 {tr('tabRequests')}</div>
<div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
<button onClick={()=>onAdd?.()} style={{padding:'6px 14px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {tr('register')}</button>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={'🔍 '+tr('search')} style={{padding:'6px 12px',borderRadius:8,background:'#fff',color:'#1e293b',border:'1px solid #e5e7eb',fontSize:11,minWidth:160,flex:'0 1 220px'}}/>
<button onClick={exportCsv} disabled={!rows.length} style={{padding:'6px 14px',borderRadius:8,background:'#f1f5f9',color:'#1e293b',border:'1px solid #e5e7eb',fontSize:11,fontWeight:600,cursor:rows.length?'pointer':'not-allowed',opacity:rows.length?1:0.5}}>📤 {tr('export')}</button>
{q.trim()&&<span style={{fontSize:10,color:'#94a3b8'}}>{rows.length}/{data.length}</span>}
</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{['ID',tr('orderNo'),tr('product'),tr('reason'),tr('status'),tr('date'),tr('amount')].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{rows.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontFamily:'monospace',color:'#6366f1',fontWeight:700}}>{r.id}</td>
<td style={{padding:'6px 8px',color:'#64748b'}}>{r.orderNo}</td>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{r.product}</td>
<td style={{padding:'6px 8px'}}>{(r.reason&&(tr('reason'+r.reason.charAt(0).toUpperCase()+r.reason.slice(1))))||r.reason||'-'}</td>
<td style={{padding:'6px 8px'}}>{r.status?<Badge label={tr('status'+r.status.charAt(0).toUpperCase()+r.status.slice(1))} color={STATUS_COLORS[r.status]||'#94a3b8'}/>:'-'}</td>
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

function AnalyticsTab({data,tr,fmt}){
const reasons={};data.forEach(r=>{reasons[r.reason]=(reasons[r.reason]||0)+1;});
const channels={};data.forEach(r=>{channels[r.channel]=(channels[r.channel]||0)+1;});
// [257차] 서버 전수 집계(전체 반품 기준·환불영향·반품유발 상품·불량률) — 기존 클라 카드는 폴백/데모용 유지.
const[srv,setSrv]=React.useState(null);
React.useEffect(()=>{let a=true;if(IS_DEMO)return;apiClient.getJsonAuth('/api/v420/returns/reason-analysis?top=12').then(r=>{if(a&&r&&r.ok)setSrv(r);}).catch(()=>{});return()=>{a=false;};},[]);
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
</div>
{/* [257차] 반품 유발 상품 Top + 불량률 — 서버 전수 집계(전체 반품 기준·환불영향). 데이터 있을 때만 노출(회귀0). */}
{srv&&Array.isArray(srv.top_products)&&srv.top_products.length>0&&<Card style={{marginTop:16}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:10}}>
<div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>🎯 {tr('analyticsTopProducts')||'반품 유발 상품 Top'}</div>
<span style={{fontSize:11,color:'#ef4444',fontWeight:700}}>{(tr('analyticsDefectiveRate')||'불량률')} {srv.defective_rate}%</span>
<span style={{fontSize:10.5,color:'#94a3b8'}}>· {(tr('analyticsServerNote')||'전체 반품 전수 집계')} ({srv.total})</span>
</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'2px solid #e5e7eb',color:'#7c8fa8'}}>
{[tr('product'),tr('kpiTotal')||'반품수',tr('amount'),tr('defective')||'불량'].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left'}}>{h}</th>)}
</tr></thead>
<tbody>{srv.top_products.map((p,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
<td style={{padding:'6px 8px',fontWeight:600,color:'#1e293b'}}>{p.product}</td>
<td style={{padding:'6px 8px',fontWeight:700,color:'#6366f1'}}>{p.count}</td>
<td style={{padding:'6px 8px',color:'#1e293b'}}>{fmt?fmt(p.refund):p.refund}</td>
<td style={{padding:'6px 8px'}}>{p.defective>0?<span style={{color:'#ef4444',fontWeight:700}}>⚠ {p.defective}</span>:'-'}</td>
</tr>)}</tbody></table></Card>}
</div>;
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

export default function ReturnsPortal(){
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);

const tr=useTr();
const{fmt}=useCurrency();
const{user}=useAuth();
const isDemo=IS_DEMO; // 180차: email·host broad includes('demo') 제거 → demoEnv 정본 격리(운영 오염 0)
const{orders=[],claimHistory=[],claimStatsServer=null,orderStats=null,registerClaimReturn}=useGlobalData();
const{selectedProduct}=useProductSelection();// [현 차수] 전역 상품선택 → 그 상품 반품만 필터·상품별 반품률(실시간 동기화)
const[tab,setTab]=useState('tabOverview');
const[period,setPeriod]=useState({preset:'all'}); // [현 차수] 기간조회
// [현 차수] P1: 수동 반품 등록 — registerClaimReturn(낙관적 claimHistory 추가 + sku/qty 시 반품입고=재고복원)
//   + 운영은 백엔드 ingestClaims 영속(POST /v424/orderhub/claims). 등록 후 화면 즉시 반영.
const[showAdd,setShowAdd]=useState(false);
const[af,setAf]=useState({orderNo:'',product:'',buyer:'',channel:'',reason:'',amount:'',sku:'',qty:''});
const handleAddReturn=async()=>{
  if(!af.orderNo&&!af.sku){alert('주문번호 또는 SKU를 입력하세요');return;}
  const id='RT-'+Date.now();
  const claim={id,orderId:af.orderNo,buyer:af.buyer,channel:af.channel,type:'return',reason:af.reason,status:'pending',amount:Number(af.amount)||0,sku:af.sku,qty:Number(af.qty)||0,name:af.product};
  if(typeof registerClaimReturn==='function')registerClaimReturn(claim);
  if(!isDemo){try{await apiClient.postJson('/api/v424/orderhub/claims',{items:[{id,order_id:af.orderNo,buyer:af.buyer,channel:af.channel,type:'return',reason:af.reason,status:'pending',amount:Number(af.amount)||0}]});}catch{}}
  setShowAdd(false);setAf({orderNo:'',product:'',buyer:'',channel:'',reason:'',amount:'',sku:'',qty:''});
};
// 204차 동기화: 데모 반품을 단일소스(orders=L'Oréal 상품)에서 파생 — 과거 독립 하드코딩 DEMO_RETURNS(전자제품,
//   타 메뉴 불일치)를 제거. 주문에서 결정적 선별 → 상품·채널·고객·금액이 주문/대시보드와 정합.
const _RREASON=['defective','wrongItem','damaged','notAsDesc','changeOfMind','lateDelivery'];
const _RSTATUS=['refunded','approved','pending','restocked','disposed','approved'];
const _RGRADE=['A','B','C',null,'A','F'];
const _RMETHOD=['card','bank','original',null,'card','bank'];
const data=useMemo(()=>{
  if(isDemo){
    const src=Array.isArray(orders)?orders:[];
    return src.filter((_,i)=>i%7===2||i%7===5).slice(0,14).map((o,i)=>({
      id:`RT-${2401+i}`, orderNo:o.id, product:o.name, sku:o.sku||o.product_id||'', customer:(String(o.buyer||'').split(' ')[0]||o.buyer),
      channel:o.ch, amount:o.total, reason:_RREASON[i%_RREASON.length], status:_RSTATUS[i%_RSTATUS.length],
      date:String(o.at||'').slice(0,10), inspGrade:_RGRADE[i%_RGRADE.length], refundMethod:_RMETHOD[i%_RMETHOD.length],
    }));
  }
  // 207차: 운영은 OrderHub 백엔드 적재 claimHistory(/api/v424/orderhub/claims) 를 소비 — 빈 화면 해소.
  const src=Array.isArray(claimHistory)?claimHistory:[];
  return src.map((c)=>({
    id:c.id, orderNo:c.orderId||'', product:c.product||'', sku:c.sku||'', customer:(String(c.buyer||'').split(' ')[0]||c.buyer||''),
    channel:c.channel||'', amount:Number(c.amount)||0, reason:c.reason||'', status:c.status||'pending',
    date:String(c.createdAt||'').slice(0,10), inspGrade:c.inspGrade??null, refundMethod:c.refundMethod??null,
  }));
},[isDemo,orders,claimHistory]);
// [225차 P1-16] 반품률 분모 = 실주문수. 운영은 과거 claimHistory.length(=반품수, 분자와 동일 → 항상 ~100%)
//   였던 치명 버그를 서버 주문집계(orderStats.totalOrders, 전체 행)로 교체. 데모는 단일소스 주문수.
const orderCount=isDemo?(Array.isArray(orders)?orders.length:0):(Number(orderStats?.totalOrders||orderStats?.count)||(Array.isArray(claimHistory)?claimHistory.length:0));
// [현 차수] 전역 상품선택 시 그 상품 반품만 — 모든 탭(요청·검수·환불·재입고·분석)에 동일 필터 전파(실시간 동기화). sku 우선, 없으면 상품명.
const prodMode=!!selectedProduct?.sku;
const viewData=useMemo(()=>{
  let d=prodMode?data.filter(r=>(r.sku&&String(r.sku)===selectedProduct.sku)||(r.product&&r.product===selectedProduct.name)):data;
  // [현 차수] 기간조회 — 반품을 선택 기간으로 필터(date YYYY-MM-DD 우선, at/createdAt 폴백). 전 탭·KPI 동반 반응.
  if(period&&period.preset!=='all')d=d.filter(r=>inPeriodAny(r,period,['date','at','createdAt','atISO']));
  return d;
},[data,prodMode,selectedProduct,period]);
// 상품별 반품률 분모 = 그 상품 주문수(실주문 파생, 정직). orders 파생 가능 시만 표기(운영 부분적재 시 '—').
const prodOrderCount=useMemo(()=>{if(!prodMode)return 0;const src=Array.isArray(orders)?orders:[];return src.filter(o=>String(o.sku||o.product_id||'')===selectedProduct.sku||o.name===selectedProduct.name).length;},[prodMode,orders,selectedProduct]);
const prodRate=prodMode&&prodOrderCount>0?((viewData.length/prodOrderCount)*100).toFixed(1):null;

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
<button onClick={()=>setShowAdd(true)} style={{marginLeft:8,padding:'5px 14px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ {tr('register')}</button>
</div>
</div>
{/* Sub-tabs fixed */}
<div style={{padding:'12px 28px',display:'flex',gap:6,flexWrap:'wrap',borderBottom:'1px solid #e5e7eb',background:'#fff',position:'sticky',top:0,zIndex:10,flexShrink:0}}>
{TABS.map((t2,i)=><button key={t2} style={tabBtnStyle(tab===t2)} onClick={()=>setTab(t2)}>{TAB_ICONS[i]} {tr(t2)}</button>)}
</div>
{/* [현 차수] 기간조회 — 데이터 탭에서만 노출(반품 리스트·KPI 선택 기간 정확 스코프) */}
{PERIOD_TABS.has(tab)&&<div style={{padding:'8px 28px 0'}}><PeriodFilterBar value={period} onChange={setPeriod}/></div>}
{/* Content scroll */}
<div style={{flex:1,overflowY:'auto',padding:'20px 28px 40px'}}>
{/* [현 차수] 선택 상품 반품 요약 — 전 탭 동일 필터(실시간 동기화). 반품률 분모=상품 주문수(정직, 미파생 시 '—') */}
{prodMode&&<div style={{marginBottom:16,padding:'11px 16px',borderRadius:10,background:'linear-gradient(90deg,#eff6ff,#eef2ff)',border:'1px solid #c7d2fe',fontSize:13,display:'flex',flexWrap:'wrap',gap:16,alignItems:'center'}}>
<span style={{fontWeight:800}}>📦 {selectedProduct.name}</span>
<span><b>{viewData.length}</b> {tr('tabRequests')||'반품'}</span>
<span>{tr('kpiReturnRate')||'반품률'}: <b style={{color:'#dc2626'}}>{prodRate!=null?prodRate+'%':'—'}</b></span>
{(()=>{const rs={};viewData.forEach(r=>{if(r.reason)rs[r.reason]=(rs[r.reason]||0)+1;});const top=Object.entries(rs).sort((a,b)=>b[1]-a[1])[0];return top?<span style={{color:'#475569'}}>{tr('topReason')||'주요 사유'}: {(tr('reason'+top[0].charAt(0).toUpperCase()+top[0].slice(1))||top[0])} ({top[1]})</span>:null;})()}
</div>}
{tab==='tabOverview'&&<OverviewTab data={viewData} tr={tr} fmt={fmt} orderCount={prodMode&&prodOrderCount>0?prodOrderCount:orderCount} claimStats={isDemo?null:claimStatsServer}/>}
{tab==='tabRequests'&&<RequestsTab data={viewData} tr={tr} fmt={fmt} onAdd={()=>setShowAdd(true)}/>}
{tab==='tabInspection'&&<InspectionTab data={viewData} tr={tr}/>}
{tab==='tabRefunds'&&<RefundsTab data={viewData} tr={tr} fmt={fmt}/>}
{tab==='tabRestock'&&<RestockTab data={viewData} tr={tr}/>}
{tab==='tabAnalytics'&&<AnalyticsTab data={viewData} tr={tr} fmt={fmt}/>}
{tab==='tabPolicies'&&<PoliciesTab tr={tr}/>}
{tab==='tabGuide'&&<GuideTab tr={tr}/>}
</div>
{showAdd && (<>
<div onClick={()=>setShowAdd(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:300}}/>
<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'min(460px,95vw)',maxHeight:'90vh',overflowY:'auto',background:'#fff',borderRadius:16,padding:24,zIndex:301,boxShadow:'0 24px 64px rgba(0,0,0,0.4)'}}>
<div style={{fontWeight:800,fontSize:16,marginBottom:14}}>📦 {tr('register')}</div>
{[['orderNo',tr('orderNo')],['product',tr('product')],['buyer',tr('customer')],['channel',tr('channel')],['reason',tr('reason')],['amount',tr('amount')],['sku','SKU'],['qty','수량']].map(([k,label])=>(
<div key={k} style={{marginBottom:10}}>
<label style={{fontSize:11,fontWeight:600,color:'#374151'}}>{label}</label>
<input value={af[k]} onChange={e=>setAf(p=>({...p,[k]:e.target.value}))} style={{display:'block',width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:12,marginTop:3,boxSizing:'border-box'}}/>
</div>))}
<div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
<button onClick={()=>setShowAdd(false)} style={{padding:'8px 16px',borderRadius:8,background:'#f1f5f9',border:'1px solid #e5e7eb',cursor:'pointer',fontSize:12}}>닫기</button>
<button onClick={handleAddReturn} style={{padding:'8px 16px',borderRadius:8,background:'#6366f1',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>{tr('register')}</button>
</div>
</div>
</>)}
</div>;
}
