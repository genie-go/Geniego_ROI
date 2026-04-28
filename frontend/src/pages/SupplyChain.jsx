import React,{useState,useEffect,useMemo,useCallback}from'react';
import{useI18n}from'../i18n/index.js';
import{useCurrency}from'../contexts/CurrencyContext.jsx';
import{useAuth}from'../auth/AuthContext';
import{useSecurityGuard}from'../security/SecurityGuard.js';
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip as RTooltip,ResponsiveContainer,PieChart,Pie,Cell,AreaChart,Area,Legend}from'recharts';
import AIRecommendBanner from'../components/AIRecommendBanner.jsx';
import SC_DICT from'./scI18n.js';

/* ── i18n helper ── */
const T={
pageTitle:['supplyChain.pageTitle','Supply Chain'],
pageSub:['supplyChain.pageSub','Supply chain optimization & real-time monitoring'],
tabTimeline:['supplyChain.tabTimeline','Timeline'],
tabSuppliers:['supplyChain.tabSuppliers','Suppliers'],
tabInventory:['supplyChain.tabInventory','Inventory'],
tabPO:['supplyChain.tabPO','Purchase Orders'],
tabLeadTime:['supplyChain.tabLeadTime','Lead Time'],
tabRisk:['supplyChain.tabRisk','Risk'],
tabLandedCost:['supplyChain.tabLandedCost','Landed Cost'],
tabGuide:['supplyChain.tabGuide','Guide'],
loading:['supplyChain.loading','Loading...'],
noData:['supplyChain.noData','No data available.'],
kpiLines:['supplyChain.kpiLines','Supply Lines'],
kpiSuppliers:['supplyChain.kpiSuppliers','Suppliers'],
kpiHighRisk:['supplyChain.kpiHighRisk','High Risk'],
kpiAvgLead:['supplyChain.kpiAvgLead','Avg Lead Time'],
kpiTotalCost:['supplyChain.kpiTotalCost','Total Cost'],
kpiOnTime:['supplyChain.kpiOnTime','On-Time Rate'],
productName:['supplyChain.productName','Product'],
supplier:['supplyChain.supplier','Supplier'],
labelSku:['supplyChain.labelSku','SKU'],
leadTime:['supplyChain.leadTime','Lead Time'],
days:['supplyChain.days','days'],
country:['supplyChain.country','Country'],
category:['supplyChain.category','Category'],
delayRate:['supplyChain.delayRate','Delay Rate'],
contact:['supplyChain.contact','Contact'],
reliability:['supplyChain.reliability','Reliability'],
orderCount:['supplyChain.orderCount','Orders'],
addLine:['supplyChain.addLine','Add Line'],
addSupplier:['supplyChain.addSupplier','Add Supplier'],
register:['supplyChain.register','Register'],
cancel:['supplyChain.cancel','Cancel'],
confirmDelete:['supplyChain.confirmDelete','Delete?'],
normal:['supplyChain.normal','Normal'],
highRisk:['supplyChain.highRisk','High Risk'],
supplyRisk:['supplyChain.supplyRisk','Supply Risk'],
contactSupplier:['supplyChain.contactSupplier','Contact Supplier'],
altSupplierSearch:['supplyChain.altSupplierSearch','Search Alt Supplier'],
slackNotify:['supplyChain.slackNotify','Slack Notify'],
autoRiskRules:['supplyChain.autoRiskRules','Auto Risk Rules'],
addRule:['supplyChain.addRule','Add Rule'],
ruleName:['supplyChain.ruleName','Rule Name'],
ruleAction:['supplyChain.ruleAction','Action'],
noRisk:['supplyChain.noRisk','No risks detected.'],
invTotal:['supplyChain.invTotal','Total Inventory'],
invTransit:['supplyChain.invTransit','In Transit'],
invWarehouse:['supplyChain.invWarehouse','Warehouse'],
invSupplier:['supplyChain.invSupplier','Supplier'],
invQty:['supplyChain.invQty','Qty'],
invStatus:['supplyChain.invStatus','Status'],
invLocation:['supplyChain.invLocation','Location'],
invUpdated:['supplyChain.invUpdated','Updated'],
tabPOTitle:['supplyChain.tabPOTitle','Purchase Orders'],
poCreate:['supplyChain.poCreate','Create PO'],
poSelectSupplier:['supplyChain.poSelectSupplier','Select Supplier'],
poUnitCost:['supplyChain.poUnitCost','Unit Cost'],
poTotalCost:['supplyChain.poTotalCost','Total'],
poNotes:['supplyChain.poNotes','Notes'],
poDate:['supplyChain.poDate','Date'],
poStatusDraft:['supplyChain.poStatusDraft','Draft'],
poStatusPending:['supplyChain.poStatusPending','Pending'],
poStatusApproved:['supplyChain.poStatusApproved','Approved'],
poStatusShipped:['supplyChain.poStatusShipped','Shipped'],
poStatusReceived:['supplyChain.poStatusReceived','Received'],
poStatusCancelled:['supplyChain.poStatusCancelled','Cancelled'],
totalPO:['supplyChain.totalPO','Total PO Amount'],
lcProductCost:['supplyChain.lcProductCost','Product Cost'],
lcShipping:['supplyChain.lcShipping','Shipping'],
lcCustoms:['supplyChain.lcCustoms','Customs'],
lcInsurance:['supplyChain.lcInsurance','Insurance'],
lcHandling:['supplyChain.lcHandling','Handling'],
lcOther:['supplyChain.lcOther','Other'],
lcCalculate:['supplyChain.lcCalculate','Calculate'],
lcResult:['supplyChain.lcResult','Result'],
lcDesc:['supplyChain.lcDesc','Calculate total landed cost for imported products.'],
securityAlert:['supplyChain.securityAlert','Security Threat'],
securityDesc:['supplyChain.securityDesc','Malicious input blocked.'],
securityDismiss:['supplyChain.securityDismiss','Dismiss'],
periodLabel:['supplyChain.periodLabel','Period'],
guideTitle:['supplyChain.guideTitle','Supply Chain Guide'],
guideSub:['supplyChain.guideSub','Complete guide for supply chain management.'],
guideStepsTitle:['supplyChain.guideStepsTitle','Step-by-Step Guide'],
guideTipsTitle:['supplyChain.guideTipsTitle','Expert Tips'],
guideTabsTitle:['supplyChain.guideTabsTitle','Tab Reference'],
guideBeginnerBadge:['supplyChain.guideBeginnerBadge','Beginner'],
guideTimeBadge:['supplyChain.guideTimeBadge','10 min'],
guideLangBadge:['supplyChain.guideLangBadge','12 Languages'],
guideWhereToStart:['supplyChain.guideWhereToStart','Where to start?'],
guideWhereToStartDesc:['supplyChain.guideWhereToStartDesc','Register suppliers first, then create supply lines.'],
guideReadyTitle:['supplyChain.guideReadyTitle','Ready!'],
guideReadyDesc:['supplyChain.guideReadyDesc','Go to Suppliers tab to register your first supplier.'],
guideFaqTitle:['supplyChain.guideFaqTitle','FAQ'],
};
for(let i=1;i<=15;i++){
T['guideStep'+i+'Title']=['supplyChain.guideStep'+i+'Title','Step '+i];
T['guideStep'+i+'Desc']=['supplyChain.guideStep'+i+'Desc','Step '+i+' description'];
}
for(let i=1;i<=5;i++){
T['guideTip'+i]=['supplyChain.guideTip'+i,'Tip '+i];
T['guideFaq'+i+'Q']=['supplyChain.guideFaq'+i+'Q','FAQ '+i];
T['guideFaq'+i+'A']=['supplyChain.guideFaq'+i+'A','Answer '+i];
}
const tabDescKeys=['Timeline','Suppliers','Inventory','PO','LeadTime','Risk','LandedCost','Guide'];
tabDescKeys.forEach(k=>{T['guideTab'+k+'Desc']=['supplyChain.guideTab'+k+'Desc',k+' tab description'];});

const useTr=()=>{const{t,lang}=useI18n();return useCallback((k)=>{const d=T[k];if(!d)return k;const loc=SC_DICT[lang]||SC_DICT.en||{};if(loc[k])return loc[k];return t(d[0],d[1]);},[t,lang]);};

/* ── Demo Data ── */
const DEMO_LINES=[
{id:'L1',product:'Premium Wireless Earbuds',sku:'WE-2024-A',supplier:'Shenzhen Audio Co.',leadTime:14,risk:'normal',stages:[100,100,100,80,40,0],country:'CN'},
{id:'L2',product:'Organic Cotton T-Shirt',sku:'CT-2024-B',supplier:'Vietnam Textile Ltd.',leadTime:21,risk:'high',stages:[100,100,60,20,0,0],country:'VN'},
{id:'L3',product:'Smart Watch Band',sku:'SW-2024-C',supplier:'Korea Parts Inc.',leadTime:7,risk:'normal',stages:[100,100,100,100,100,60],country:'KR'},
{id:'L4',product:'Bamboo Phone Case',sku:'BC-2024-D',supplier:'EcoMaterials Japan',leadTime:18,risk:'normal',stages:[100,100,100,100,70,30],country:'JP'},
{id:'L5',product:'Protein Powder 1kg',sku:'PP-2024-E',supplier:'NZ Health Foods',leadTime:28,risk:'high',stages:[100,80,40,0,0,0],country:'NZ'},
{id:'L6',product:'LED Desk Lamp',sku:'DL-2024-F',supplier:'Guangzhou Lighting',leadTime:12,risk:'normal',stages:[100,100,100,100,90,50],country:'CN'},
];
const DEMO_SUPPLIERS=[
{id:'S1',name:'Shenzhen Audio Co.',country:'CN',category:'Electronics',leadTime:14,delay:5,reliability:95,orders:128,contact:'wang@audio.cn'},
{id:'S2',name:'Vietnam Textile Ltd.',country:'VN',category:'Apparel',leadTime:21,delay:18,reliability:82,orders:67,contact:'tran@textile.vn'},
{id:'S3',name:'Korea Parts Inc.',country:'KR',category:'Components',leadTime:7,delay:3,reliability:97,orders:234,contact:'kim@parts.kr'},
{id:'S4',name:'EcoMaterials Japan',country:'JP',category:'Materials',leadTime:18,delay:8,reliability:92,orders:89,contact:'tanaka@eco.jp'},
{id:'S5',name:'NZ Health Foods',country:'NZ',category:'Food',leadTime:28,delay:22,reliability:78,orders:45,contact:'smith@nzhf.co.nz'},
{id:'S6',name:'Guangzhou Lighting',country:'CN',category:'Electronics',leadTime:12,delay:4,reliability:96,orders:156,contact:'liu@gzlight.cn'},
];
const DEMO_INV=[
{id:'I1',product:'Premium Wireless Earbuds',sku:'WE-2024-A',qty:2450,location:'Warehouse A',status:'normal',supplier:'Shenzhen Audio Co.',updated:'2026-04-27'},
{id:'I2',product:'Organic Cotton T-Shirt',sku:'CT-2024-B',qty:820,location:'In Transit',status:'transit',supplier:'Vietnam Textile Ltd.',updated:'2026-04-26'},
{id:'I3',product:'Smart Watch Band',sku:'SW-2024-C',qty:5200,location:'Warehouse B',status:'normal',supplier:'Korea Parts Inc.',updated:'2026-04-28'},
{id:'I4',product:'Bamboo Phone Case',sku:'BC-2024-D',qty:1100,location:'Supplier',status:'supplier',supplier:'EcoMaterials Japan',updated:'2026-04-25'},
{id:'I5',product:'Protein Powder 1kg',sku:'PP-2024-E',qty:340,location:'In Transit',status:'transit',supplier:'NZ Health Foods',updated:'2026-04-24'},
{id:'I6',product:'LED Desk Lamp',sku:'DL-2024-F',qty:3800,location:'Warehouse A',status:'normal',supplier:'Guangzhou Lighting',updated:'2026-04-28'},
];
const DEMO_PO=[
{id:'PO-001',supplier:'Shenzhen Audio Co.',product:'Premium Wireless Earbuds',qty:500,unitCost:12.5,status:'approved',date:'2026-04-20',notes:'Q2 restock'},
{id:'PO-002',supplier:'Vietnam Textile Ltd.',product:'Organic Cotton T-Shirt',qty:2000,unitCost:4.8,status:'shipped',date:'2026-04-18',notes:'Summer collection'},
{id:'PO-003',supplier:'Korea Parts Inc.',product:'Smart Watch Band',qty:1000,unitCost:3.2,status:'received',date:'2026-04-10',notes:'Monthly order'},
{id:'PO-004',supplier:'NZ Health Foods',product:'Protein Powder 1kg',qty:800,unitCost:8.9,status:'pending',date:'2026-04-25',notes:'New flavor launch'},
{id:'PO-005',supplier:'Guangzhou Lighting',product:'LED Desk Lamp',qty:600,unitCost:7.5,status:'draft',date:'2026-04-28',notes:'Office supplies'},
];
const STAGES=['Order','Production','QC','Shipping','Transit','Received'];
const PIE_COLORS=['#4f8ef7','#f97316','#22c55e','#a855f7','#ec4899','#eab308','#06b6d4'];
const STATUS_CLR={normal:'#22c55e',transit:'#4f8ef7',supplier:'#f97316',high:'#ef4444'};
const PO_CLR={draft:'#94a3b8',pending:'#f59e0b',approved:'#22c55e',shipped:'#4f8ef7',received:'#6366f1',cancelled:'#ef4444'};


/* ══════════════════════════════════════════════════════════════
   Tab 1: Supply Timeline
   ══════════════════════════════════════════════════════════════ */
function TimelineTab({tr,fmt}){
const{isDemoMode}=useAuth();
const lines=isDemoMode?DEMO_LINES:[];
const[showAdd,setShowAdd]=useState(false);
if(lines.length===0)return(<div className="card card-glass" style={{padding:60,textAlign:'center',color:'#1e293b'}}><div style={{fontSize:48,marginBottom:16}}>📦</div><div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>{tr('noData')}</div></div>);
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
{/* KPI Cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
{[{l:tr('kpiLines'),v:lines.length,c:'#4f8ef7',i:'📦'},{l:tr('kpiSuppliers'),v:new Set(lines.map(x=>x.supplier)).size,c:'#22c55e',i:'🏭'},{l:tr('kpiHighRisk'),v:lines.filter(x=>x.risk==='high').length,c:'#ef4444',i:'⚠️'},{l:tr('kpiAvgLead'),v:Math.round(lines.reduce((s,x)=>s+x.leadTime,0)/lines.length)+' '+tr('days'),c:'#a855f7',i:'⏱'},{l:tr('kpiOnTime'),v:Math.round(lines.filter(x=>x.risk!=='high').length/lines.length*100)+'%',c:'#14b8a6',i:'✅'}].map((k,i)=>(
<div key={i} className="card card-glass" style={{padding:16,borderLeft:'3px solid '+k.c,color:'#1e293b'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.5}}>{k.l}</span><span style={{fontSize:16}}>{k.i}</span></div>
<div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
</div>))}
</div>
{/* Timeline Cards */}
<div style={{display:'flex',flexDirection:'column',gap:12}}>
{lines.map((ln,idx)=>{
const riskClr=ln.risk==='high'?'#ef4444':'#22c55e';
return(
<div key={ln.id} className="card card-glass" style={{padding:18,borderLeft:'4px solid '+riskClr,color:'#1e293b'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
<div><div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{ln.product}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{tr('labelSku')}: {ln.sku} · {tr('supplier')}: {ln.supplier} · {ln.country}</div></div>
<div style={{display:'flex',gap:8,alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:riskClr+'18',color:riskClr,border:'1px solid '+riskClr+'30'}}>{ln.risk==='high'?tr('highRisk'):tr('normal')}</span>
<span style={{fontSize:11,color:'#64748b'}}>{tr('leadTime')}: {ln.leadTime}{tr('days')}</span>
</div>
</div>
{/* Stage Progress Bar */}
<div style={{display:'flex',gap:4,alignItems:'center'}}>
{STAGES.map((st,si)=>{const pct=ln.stages[si];return(
<div key={si} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
<div style={{width:'100%',height:8,borderRadius:4,background:'rgba(0,0,0,0.06)',overflow:'hidden'}}>
<div style={{width:pct+'%',height:'100%',borderRadius:4,background:pct>=100?'#22c55e':pct>0?'#4f8ef7':'transparent',transition:'width 0.6s'}}/>
</div>
<span style={{fontSize:9,color:pct>=100?'#22c55e':pct>0?'#4f8ef7':'#cbd5e1',fontWeight:600}}>{st}</span>
</div>)})}
</div>
</div>);})}
</div>
</div>);
}

/* ══════════════════════════════════════════════════════════════
   Tab 2: Suppliers
   ══════════════════════════════════════════════════════════════ */
function SuppliersTab({tr,fmt}){
const{isDemoMode}=useAuth();
const suppliers=isDemoMode?DEMO_SUPPLIERS:[];
if(suppliers.length===0)return(<div className="card card-glass" style={{padding:60,textAlign:'center',color:'#1e293b'}}><div style={{fontSize:48,marginBottom:16}}>🏭</div><div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>{tr('noData')}</div></div>);
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
<div className="card card-glass" style={{padding:0,overflow:'hidden',color:'#1e293b'}}>
<div style={{padding:'14px 20px',fontWeight:800,fontSize:15,borderBottom:'1px solid rgba(0,0,0,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center',color:'#1e293b'}}><span>🏭 {tr('tabSuppliers')}</span></div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
<thead style={{background:'rgba(241,245,249,0.7)'}}><tr>
{[tr('supplier'),tr('country'),tr('category'),tr('leadTime'),tr('delayRate'),tr('reliability'),tr('orderCount'),tr('contact')].map((h,i)=>(<th key={i} style={{padding:'10px 14px',textAlign:i>2?'center':'left',fontWeight:700,fontSize:11,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5}}>{h}</th>))}
</tr></thead>
<tbody>
{suppliers.map(s=>{
const relClr=s.reliability>=90?'#22c55e':s.reliability>=80?'#f59e0b':'#ef4444';
return(
<tr key={s.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
<td style={{padding:'12px 14px',fontWeight:700,color:'#1e293b'}}>{s.name}</td>
<td style={{padding:'12px 14px',color:'#475569'}}><span style={{marginRight:4}}>{s.country==='CN'?'🇨🇳':s.country==='VN'?'🇻🇳':s.country==='KR'?'🇰🇷':s.country==='JP'?'🇯🇵':s.country==='NZ'?'🇳🇿':'🌍'}</span>{s.country}</td>
<td style={{padding:'12px 14px'}}><span style={{fontSize:10,padding:'2px 8px',borderRadius:12,background:'rgba(79,142,247,0.1)',color:'#4f8ef7',fontWeight:600}}>{s.category}</span></td>
<td style={{textAlign:'center',fontFamily:'monospace',color:'#475569'}}>{s.leadTime}{tr('days')}</td>
<td style={{textAlign:'center',fontWeight:700,color:s.delay>15?'#ef4444':s.delay>8?'#f59e0b':'#22c55e'}}>{s.delay}%</td>
<td style={{textAlign:'center'}}><div style={{display:'inline-flex',alignItems:'center',gap:6}}><div style={{width:48,height:5,borderRadius:3,background:'rgba(0,0,0,0.06)'}}><div style={{width:s.reliability+'%',height:'100%',borderRadius:3,background:relClr,transition:'width 0.6s'}}/></div><span style={{fontSize:11,fontWeight:700,color:relClr}}>{s.reliability}%</span></div></td>
<td style={{textAlign:'center',fontFamily:'monospace',color:'#475569'}}>{s.orders}</td>
<td style={{textAlign:'center',fontSize:11,color:'#4f8ef7',fontWeight:600}}>{s.contact}</td>
</tr>);})}
</tbody>
</table>
</div>
</div>
{/* Supplier Reliability Chart */}
<div className="card card-glass" style={{padding:20,color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:16,color:'#1e293b'}}>📊 {tr('reliability')}</div>
<div style={{width:'100%',height:280}}>
<ResponsiveContainer width="100%" height="100%">
<BarChart data={suppliers.map(s=>({name:s.name.split(' ')[0],reliability:s.reliability,delay:s.delay}))} margin={{top:10,right:30,left:10,bottom:10}}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false}/>
<XAxis dataKey="name" stroke="#94a3b8" fontSize={11}/>
<YAxis stroke="#94a3b8" fontSize={10} domain={[0,100]}/>
<RTooltip contentStyle={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:10,color:'#1e293b',fontSize:12,boxShadow:'0 4px 16px rgba(0,0,0,0.10)'}}/>
<Bar dataKey="reliability" fill="#22c55e" radius={[4,4,0,0]} name={tr('reliability')}/>
<Bar dataKey="delay" fill="#ef4444" radius={[4,4,0,0]} name={tr('delayRate')}/>
</BarChart>
</ResponsiveContainer>
</div>
</div>
</div>);
}

/* ══════════════════════════════════════════════════════════════
   Tab 3: Inventory
   ══════════════════════════════════════════════════════════════ */
function InventoryTab({tr,fmt}){
const{isDemoMode}=useAuth();
const inv=isDemoMode?DEMO_INV:[];
const totalQty=inv.reduce((s,x)=>s+x.qty,0);
const transit=inv.filter(x=>x.status==='transit').reduce((s,x)=>s+x.qty,0);
const warehouse=inv.filter(x=>x.status==='normal').reduce((s,x)=>s+x.qty,0);
const atSupplier=inv.filter(x=>x.status==='supplier').reduce((s,x)=>s+x.qty,0);
if(inv.length===0)return(<div className="card card-glass" style={{padding:60,textAlign:'center',color:'#1e293b'}}><div style={{fontSize:48,marginBottom:16}}>📦</div><div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>{tr('noData')}</div></div>);
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
{/* Inventory KPI */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
{[{l:tr('invTotal'),v:totalQty.toLocaleString(),c:'#4f8ef7',i:'📦'},{l:tr('invWarehouse'),v:warehouse.toLocaleString(),c:'#22c55e',i:'🏭'},{l:tr('invTransit'),v:transit.toLocaleString(),c:'#f97316',i:'🚚'},{l:tr('invSupplier'),v:atSupplier.toLocaleString(),c:'#a855f7',i:'📋'}].map((k,i)=>(
<div key={i} className="card card-glass" style={{padding:16,borderLeft:'3px solid '+k.c,color:'#1e293b'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{k.l}</span><span style={{fontSize:16}}>{k.i}</span></div>
<div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
</div>))}
</div>
{/* Inventory Table */}
<div className="card card-glass" style={{padding:0,overflow:'hidden',color:'#1e293b'}}>
<div style={{padding:'14px 20px',fontWeight:800,fontSize:15,borderBottom:'1px solid rgba(0,0,0,0.06)',color:'#1e293b'}}>📦 {tr('tabInventory')}</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
<thead style={{background:'rgba(241,245,249,0.7)'}}><tr>
{[tr('productName'),tr('labelSku'),tr('invQty'),tr('invLocation'),tr('invStatus'),tr('supplier'),tr('invUpdated')].map((h,i)=>(<th key={i} style={{padding:'10px 14px',textAlign:i===2?'right':i>3?'center':'left',fontWeight:700,fontSize:11,color:'#64748b',textTransform:'uppercase'}}>{h}</th>))}
</tr></thead>
<tbody>
{inv.map(it=>{const sc=STATUS_CLR[it.status]||'#94a3b8';return(
<tr key={it.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
<td style={{padding:'12px 14px',fontWeight:700,color:'#1e293b'}}>{it.product}</td>
<td style={{padding:'12px 14px',fontFamily:'monospace',fontSize:11,color:'#64748b'}}>{it.sku}</td>
<td style={{textAlign:'right',fontWeight:800,fontFamily:'monospace',color:'#1e293b'}}>{it.qty.toLocaleString()}</td>
<td style={{padding:'12px 14px',color:'#475569'}}>{it.location}</td>
<td style={{textAlign:'center'}}><span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:sc+'18',color:sc,border:'1px solid '+sc+'30'}}>{it.status==='transit'?tr('invTransit'):it.status==='supplier'?tr('invSupplier'):tr('normal')}</span></td>
<td style={{textAlign:'center',fontSize:12,color:'#475569'}}>{it.supplier}</td>
<td style={{textAlign:'center',fontSize:11,fontFamily:'monospace',color:'#94a3b8'}}>{it.updated}</td>
</tr>);})}
</tbody>
</table>
</div>
</div>
{/* Inventory Distribution Pie */}
<div className="card card-glass" style={{padding:20,color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:16,color:'#1e293b'}}>🥧 {tr('invStatus')}</div>
<div style={{width:'100%',height:260}}>
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie data={[{name:tr('invWarehouse'),value:warehouse},{name:tr('invTransit'),value:transit},{name:tr('invSupplier'),value:atSupplier}]} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
{[0,1,2].map(i=><Cell key={i} fill={PIE_COLORS[i]}/>)}
</Pie>
<RTooltip contentStyle={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:10,fontSize:12}}/>
<Legend wrapperStyle={{fontSize:11}}/>
</PieChart>
</ResponsiveContainer>
</div>
</div>
</div>);
}


/* ══════════════════════════════════════════════════════════════
   Tab 4: Purchase Orders
   ══════════════════════════════════════════════════════════════ */
function POTab({tr,fmt}){
const{isDemoMode}=useAuth();
const{fmt:currFmt}=useCurrency();
const pos=isDemoMode?DEMO_PO:[];
const totalPO=pos.reduce((s,p)=>s+p.qty*p.unitCost,0);
if(pos.length===0)return(<div className="card card-glass" style={{padding:60,textAlign:'center',color:'#1e293b'}}><div style={{fontSize:48,marginBottom:16}}>📋</div><div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>{tr('noData')}</div></div>);
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
{/* PO Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
{[{l:tr('totalPO'),v:currFmt(totalPO),c:'#4f8ef7',i:'💰'},{l:tr('tabPO'),v:pos.length,c:'#22c55e',i:'📋'},{l:tr('poStatusApproved'),v:pos.filter(p=>p.status==='approved').length,c:'#22c55e',i:'✅'},{l:tr('poStatusPending'),v:pos.filter(p=>p.status==='pending').length,c:'#f59e0b',i:'⏳'}].map((k,i)=>(
<div key={i} className="card card-glass" style={{padding:16,borderLeft:'3px solid '+k.c,color:'#1e293b'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{k.l}</span><span style={{fontSize:16}}>{k.i}</span></div>
<div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
</div>))}
</div>
{/* PO Table */}
<div className="card card-glass" style={{padding:0,overflow:'hidden',color:'#1e293b'}}>
<div style={{padding:'14px 20px',fontWeight:800,fontSize:15,borderBottom:'1px solid rgba(0,0,0,0.06)',color:'#1e293b'}}>📋 {tr('tabPOTitle')}</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
<thead style={{background:'rgba(241,245,249,0.7)'}}><tr>
{['ID',tr('supplier'),tr('productName'),tr('invQty'),tr('poUnitCost'),tr('poTotalCost'),tr('invStatus'),tr('poDate'),tr('poNotes')].map((h,i)=>(<th key={i} style={{padding:'10px 14px',textAlign:i>=3&&i<=5?'right':i===6?'center':'left',fontWeight:700,fontSize:11,color:'#64748b',textTransform:'uppercase'}}>{h}</th>))}
</tr></thead>
<tbody>
{pos.map(po=>{const sc=PO_CLR[po.status]||'#94a3b8';const total=po.qty*po.unitCost;return(
<tr key={po.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
<td style={{padding:'12px 14px',fontFamily:'monospace',fontSize:11,fontWeight:700,color:'#4f8ef7'}}>{po.id}</td>
<td style={{padding:'12px 14px',color:'#1e293b',fontWeight:600}}>{po.supplier}</td>
<td style={{padding:'12px 14px',color:'#475569'}}>{po.product}</td>
<td style={{textAlign:'right',fontFamily:'monospace',color:'#1e293b'}}>{po.qty.toLocaleString()}</td>
<td style={{textAlign:'right',fontFamily:'monospace',color:'#475569'}}>{currFmt(po.unitCost)}</td>
<td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color:'#1e293b'}}>{currFmt(total)}</td>
<td style={{textAlign:'center'}}><span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:sc+'18',color:sc,border:'1px solid '+sc+'30'}}>{tr('poStatus'+po.status.charAt(0).toUpperCase()+po.status.slice(1))}</span></td>
<td style={{textAlign:'center',fontSize:11,fontFamily:'monospace',color:'#94a3b8'}}>{po.date}</td>
<td style={{padding:'12px 14px',fontSize:11,color:'#94a3b8',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{po.notes}</td>
</tr>);})}
</tbody>
</table>
</div>
</div>
</div>);
}

/* ══════════════════════════════════════════════════════════════
   Tab 5: Lead Time Analysis
   ══════════════════════════════════════════════════════════════ */
function LeadTimeTab({tr,fmt}){
const{isDemoMode}=useAuth();
const lines=isDemoMode?DEMO_LINES:[];
if(lines.length===0)return(<div className="card card-glass" style={{padding:60,textAlign:'center',color:'#1e293b'}}><div style={{fontSize:48,marginBottom:16}}>⏱</div><div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>{tr('noData')}</div></div>);
const chartData=lines.map(l=>({name:l.product.split(' ').slice(0,2).join(' '),leadTime:l.leadTime,country:l.country}));
const avgLead=Math.round(lines.reduce((s,l)=>s+l.leadTime,0)/lines.length);
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
{/* Lead Time Overview */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
{[{l:tr('kpiAvgLead'),v:avgLead+' '+tr('days'),c:'#a855f7',i:'⏱'},{l:'Min',v:Math.min(...lines.map(l=>l.leadTime))+' '+tr('days'),c:'#22c55e',i:'⚡'},{l:'Max',v:Math.max(...lines.map(l=>l.leadTime))+' '+tr('days'),c:'#ef4444',i:'🐌'}].map((k,i)=>(
<div key={i} className="card card-glass" style={{padding:16,borderLeft:'3px solid '+k.c,color:'#1e293b'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{k.l}</span><span style={{fontSize:16}}>{k.i}</span></div>
<div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
</div>))}
</div>
{/* Lead Time Bar Chart */}
<div className="card card-glass" style={{padding:20,color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:16,color:'#1e293b'}}>📊 {tr('tabLeadTime')}</div>
<div style={{width:'100%',height:300}}>
<ResponsiveContainer width="100%" height="100%">
<BarChart data={chartData} layout="vertical" margin={{top:10,right:30,left:80,bottom:10}}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false}/>
<XAxis type="number" stroke="#94a3b8" fontSize={11} unit={tr('days')}/>
<YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80}/>
<RTooltip contentStyle={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:10,color:'#1e293b',fontSize:12}}/>
<Bar dataKey="leadTime" radius={[0,4,4,0]} name={tr('leadTime')}>
{chartData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
</Bar>
</BarChart>
</ResponsiveContainer>
</div>
</div>
{/* Per-line stage breakdown */}
<div className="card card-glass" style={{padding:20,color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:16,color:'#1e293b'}}>🔬 Stage Breakdown</div>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{lines.map(ln=>(
<div key={ln.id} style={{padding:'12px 16px',borderRadius:10,background:'rgba(241,245,249,0.7)',border:'1px solid rgba(0,0,0,0.04)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>{ln.product}</span><span style={{fontSize:11,color:'#a855f7',fontWeight:700}}>{ln.leadTime} {tr('days')}</span></div>
<div style={{display:'flex',gap:3}}>
{STAGES.map((st,si)=>{const pct=ln.stages[si];return(
<div key={si} style={{flex:1,textAlign:'center'}}>
<div style={{height:6,borderRadius:3,background:'rgba(0,0,0,0.06)',overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',borderRadius:3,background:pct>=100?'#22c55e':pct>0?'#f59e0b':'transparent'}}/></div>
<div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{st}</div>
</div>)})}
</div>
</div>))}
</div>
</div>
</div>);
}

/* ══════════════════════════════════════════════════════════════
   Tab 6: Risk Detection
   ══════════════════════════════════════════════════════════════ */
function RiskTab({tr}){
const{isDemoMode}=useAuth();
const lines=isDemoMode?DEMO_LINES:[];
const highRisk=lines.filter(l=>l.risk==='high');
const suppliers=isDemoMode?DEMO_SUPPLIERS:[];
const lowRel=suppliers.filter(s=>s.reliability<85);
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
{highRisk.length===0&&lowRel.length===0?(
<div className="card card-glass" style={{padding:60,textAlign:'center',color:'#1e293b'}}><div style={{fontSize:48,marginBottom:16}}>✅</div><div style={{fontSize:14,fontWeight:700,color:'#22c55e'}}>{tr('noRisk')}</div></div>
):(
<>
{/* High Risk Lines */}
{highRisk.length>0&&(
<div className="card card-glass" style={{padding:20,borderLeft:'4px solid #ef4444',color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:14,color:'#ef4444'}}>🚨 {tr('supplyRisk')} ({highRisk.length})</div>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{highRisk.map(ln=>(
<div key={ln.id} style={{padding:'14px 16px',borderRadius:10,background:'rgba(239,68,68,0.04)',border:'1px solid rgba(239,68,68,0.15)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:8}}>
<div><div style={{fontWeight:700,fontSize:14,color:'#1e293b'}}>{ln.product}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{ln.supplier} · {ln.country} · {tr('leadTime')}: {ln.leadTime}{tr('days')}</div></div>
<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'#ef444418',color:'#ef4444',border:'1px solid #ef444430'}}>{tr('highRisk')}</span>
</div>
<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{[{l:tr('contactSupplier'),c:'#4f8ef7',i:'📞'},{l:tr('altSupplierSearch'),c:'#a855f7',i:'🔍'},{l:tr('slackNotify'),c:'#22c55e',i:'💬'}].map((a,i)=>(
<button key={i} style={{fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:8,border:'1px solid '+a.c+'30',background:a.c+'08',color:a.c,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><span>{a.i}</span>{a.l}</button>
))}
</div>
</div>))}
</div>
</div>)}
{/* Low Reliability Suppliers */}
{lowRel.length>0&&(
<div className="card card-glass" style={{padding:20,borderLeft:'4px solid #f59e0b',color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:14,color:'#f59e0b'}}>⚠️ Low Reliability Suppliers ({lowRel.length})</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{lowRel.map(s=>(
<div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:8,background:'rgba(245,158,11,0.04)',border:'1px solid rgba(245,158,11,0.15)'}}>
<div><span style={{fontWeight:700,color:'#1e293b'}}>{s.name}</span><span style={{fontSize:11,color:'#94a3b8',marginLeft:8}}>{s.country} · {s.category}</span></div>
<div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:12,fontWeight:700,color:s.reliability>=80?'#f59e0b':'#ef4444'}}>{tr('reliability')}: {s.reliability}%</span><span style={{fontSize:12,fontWeight:700,color:'#ef4444'}}>{tr('delayRate')}: {s.delay}%</span></div>
</div>))}
</div>
</div>)}
</>
)}
{/* Auto Risk Rules */}
<div className="card card-glass" style={{padding:20,color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:14,color:'#1e293b'}}>⚙️ {tr('autoRiskRules')}</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{[{rule:'Lead Time > 21 days',action:'Slack Alert + Email',active:true},{rule:'Reliability < 85%',action:'Flag for Review',active:true},{rule:'Delay Rate > 15%',action:'Auto Search Alt Supplier',active:false}].map((r,i)=>(
<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:8,background:'rgba(241,245,249,0.7)',border:'1px solid rgba(0,0,0,0.04)'}}>
<div><span style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>{r.rule}</span><span style={{fontSize:11,color:'#94a3b8',marginLeft:8}}>→ {r.action}</span></div>
<div style={{width:36,height:20,borderRadius:10,background:r.active?'#22c55e':'#cbd5e1',position:'relative',cursor:'pointer',transition:'background 0.2s'}}><div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:r.active?18:2,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/></div>
</div>))}
</div>
</div>
</div>);
}

/* ══════════════════════════════════════════════════════════════
   Tab 7: Landed Cost
   ══════════════════════════════════════════════════════════════ */
function LandedCostTab({tr}){
const{fmt}=useCurrency();
const[costs,setCosts]=useState({product:0,shipping:0,customs:0,insurance:0,handling:0,other:0});
const[result,setResult]=useState(null);
const total=Object.values(costs).reduce((s,v)=>s+(parseFloat(v)||0),0);
const fields=[{k:'product',l:tr('lcProductCost'),c:'#4f8ef7',i:'📦'},{k:'shipping',l:tr('lcShipping'),c:'#f97316',i:'🚚'},{k:'customs',l:tr('lcCustoms'),c:'#a855f7',i:'🏛️'},{k:'insurance',l:tr('lcInsurance'),c:'#22c55e',i:'🛡️'},{k:'handling',l:tr('lcHandling'),c:'#ec4899',i:'🔧'},{k:'other',l:tr('lcOther'),c:'#94a3b8',i:'📋'}];
const calculate=()=>{setResult({total,breakdown:fields.map(f=>({label:f.l,value:parseFloat(costs[f.k])||0,pct:total>0?((parseFloat(costs[f.k])||0)/total*100):0,color:f.c}))});};
return(
<div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.4s'}}>
<div className="card card-glass" style={{padding:20,color:'#1e293b'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:4,color:'#1e293b'}}>💰 {tr('tabLandedCost')}</div>
<div style={{fontSize:12,color:'#94a3b8',marginBottom:18}}>{tr('lcDesc')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
{fields.map(f=>(
<div key={f.k} style={{padding:'12px 14px',borderRadius:10,background:f.c+'08',border:'1px solid '+f.c+'20'}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}><span style={{fontSize:16}}>{f.i}</span><span style={{fontSize:12,fontWeight:700,color:f.c}}>{f.l}</span></div>
<input type="number" value={costs[f.k]} onChange={e=>setCosts(p=>({...p,[f.k]:e.target.value}))} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid rgba(0,0,0,0.1)',background:'#fff',color:'#1e293b',fontSize:14,fontWeight:700,fontFamily:'monospace',outline:'none'}} placeholder="0"/>
</div>))}
</div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16,padding:'14px 18px',borderRadius:12,background:'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(34,197,94,0.06))',border:'1px solid rgba(79,142,247,0.2)'}}>
<div><div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>{tr('poTotalCost')}</div><div style={{fontSize:24,fontWeight:900,color:'#4f8ef7'}}>{fmt(total)}</div></div>
<button onClick={calculate} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#4f8ef7,#6366f1)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 4px 16px rgba(79,142,247,0.3)',transition:'all 0.2s'}}>{tr('lcCalculate')}</button>
</div>
</div>
{result&&(
<div className="card card-glass" style={{padding:20,color:'#1e293b',animation:'fadeIn 0.3s'}}>
<div style={{fontWeight:800,fontSize:15,marginBottom:16,color:'#1e293b'}}>📊 {tr('lcResult')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
<div>
{result.breakdown.filter(b=>b.value>0).map((b,i)=>(
<div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
<div style={{flex:1}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{b.label}</span><span style={{fontSize:11,fontWeight:700,color:b.color}}>{b.pct.toFixed(1)}%</span></div>
<div style={{height:6,borderRadius:3,background:'rgba(0,0,0,0.06)'}}><div style={{width:b.pct+'%',height:'100%',borderRadius:3,background:b.color,transition:'width 0.6s'}}/></div></div>
<span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:'#1e293b',minWidth:80,textAlign:'right'}}>{fmt(b.value)}</span>
</div>))}
</div>
<div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
<div style={{width:'100%',height:200}}>
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie data={result.breakdown.filter(b=>b.value>0).map(b=>({name:b.label,value:b.value}))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
{result.breakdown.filter(b=>b.value>0).map((b,i)=><Cell key={i} fill={b.color}/>)}
</Pie>
<RTooltip contentStyle={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:10,fontSize:12}} formatter={v=>fmt(v)}/>
</PieChart>
</ResponsiveContainer>
</div>
</div>
</div>
</div>)}
</div>);
}


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
