// Part 3: PO, LeadTime, Risk, LandedCost tabs
const fs=require('fs');
const OUT='src/pages/SupplyChain.jsx';

const code=`
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

`;
fs.appendFileSync(OUT,code,'utf8');
console.log('Part 3 written:',code.length,'chars');
