// Part 2: Append sub-tab components to SupplyChain.jsx
const fs=require('fs');
const OUT='src/pages/SupplyChain.jsx';

const code=`
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

`;
fs.appendFileSync(OUT,code,'utf8');
console.log('Part 2 written:',code.length,'chars');
