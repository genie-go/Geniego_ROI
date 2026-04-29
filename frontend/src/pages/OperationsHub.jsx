import React, { useState, useMemo, useCallback } from "react";
import { useNotification } from "../context/NotificationContext.jsx";
import { useT } from '../i18n/index.js';
import useSecurityMonitor from "../hooks/useSecurityMonitor.js";
import CreativeStudioTab from "./CreativeStudioTab.jsx";

const API = "/api";
const fmtW = n => n >= 1_000_000 ? `\u20a9${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `\u20a9${(n/1000).toFixed(0)}K` : `\u20a9${n}`;
const CH = [
  {id:"shopify",name:"Shopify",icon:"\ud83d\uded2",color:"#96bf48"},
  {id:"amazon",name:"Amazon",icon:"\ud83d\udce6",color:"#ff9900"},
  {id:"coupang",name:"Coupang",icon:"\ud83c\uddf0\ud83c\uddf7",color:"#00bae5"},
  {id:"naver",name:"Naver",icon:"\ud83d\udfe2",color:"#03c75a"},
  {id:"11st",name:"11Street",icon:"\ud83c\udfec",color:"#ff0000"},
  {id:"tiktok",name:"TikTok",icon:"\ud83c\udfb5",color:"#ff0050"},
];
const ch = id => CH.find(c => c.id === id) || {name:id,icon:"\ud83d\udd0c",color:"#4f8ef7"};

function Badge({children,color="#4f8ef7"}) {
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:color+"18",color,border:`1px solid ${color}33`}}>{children}</span>;
}
function Modal({title,onClose,children}) {
  return (<>
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", zIndex:300 }}/>
    <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(680px,95vw)", maxHeight:"85vh", overflowY:"auto", background:"linear-gradient(180deg,var(--surface),#090f1e)", border:"1px solid rgba(99,140,255,0.2)", borderRadius:20, padding:28, zIndex:301, boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, alignItems:"center" }}>
        <div style={{ fontWeight:800, fontSize:16, color: '#fff' }}>{title}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-3)", fontSize:18 }}>{"\u2715"}</button>
      </div>
      {children}
    </div>
  </>);
}

function downloadCSV(filename,headers,rows) {
  const BOM='\uFEFF';
  const esc=v=>{const s=String(v??'');return s.includes(',')||s.includes('"')||s.includes('\n')?`"${s.replace(/"/g,'""')}"`:s;};
  const lines=[headers.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))];
  const blob=new Blob([BOM+lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ─── TAB 1: Products ─── */
function ProductTab() {
  const t = useT();
  const STATUS_CFG = {active:{label:t('operations.statusActive'),color:"#22c55e"},paused:{label:t('operations.statusPaused'),color:"#eab308"},soldout:{label:t('operations.statusSoldout'),color:"#ef4444"}};
  const {pushNotification} = useNotification();
  const [products,setProducts] = useState([]);
  const [modal,setModal] = useState(null);
  const [editing,setEditing] = useState(null);
  const [search,setSearch] = useState('');
  const [filterCat,setFilterCat] = useState('all');
  const [filterStatus,setFilterStatus] = useState('all');
  const [filterCh,setFilterCh] = useState('all');
  const [viewMode,setViewMode] = useState('table');
  const [form,setForm] = useState({});
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const filtered=useMemo(()=>{let rows=products;if(search)rows=rows.filter(p=>p.name?.includes(search)||p.sku?.toLowerCase().includes(search.toLowerCase()));if(filterCat!=='all')rows=rows.filter(p=>p.category===filterCat);if(filterStatus!=='all')rows=rows.filter(p=>p.status===filterStatus);if(filterCh!=='all')rows=rows.filter(p=>p.channels?.includes(filterCh));return rows;},[products,search,filterCat,filterStatus,filterCh]);
  const kpis=useMemo(()=>({active:products.filter(p=>p.status==='active').length,paused:products.filter(p=>p.status==='paused').length,soldout:products.filter(p=>p.status==='soldout').length,lowStock:products.filter(p=>p.stock>0&&p.stock<=(p.safeQty||20)).length,avgMargin:products.length?(products.reduce((s,p)=>s+((p.price-p.cost)/p.price*100),0)/products.length).toFixed(1):'0.0',totalValue:products.reduce((s,p)=>s+p.cost*p.stock,0)}),[products]);
  const margin=p=>p.price>0?((p.price-p.cost)/p.price*100).toFixed(1):0;
  const marginColor=m=>m>=40?'#22c55e':m>=20?'#eab308':'#ef4444';
  const isLow=p=>p.stock>0&&p.stock<=(p.safeQty||20);
  const openModal=(type,p=null)=>{setEditing(p);if(type==='add')setForm({name:'',sku:'',category:'',supplier:'',cost:0,supplyPrice:0,price:0,safeQty:20,stock:0,channels:[],status:'active',origin:'',weightKg:0});else if(p)setForm({...p,newPrice:p.price,newStock:p.stock,promoRate:10,promoType:t('operations.discountRate'),promoDays:7});setModal(type);};
  const applyAction=()=>{if(modal==='edit'||modal==='add'){if(modal==='add')setProducts(ps=>[...ps,{...form,id:`P${String(ps.length+1).padStart(3,'0')}`,channelIds:{}}]);else setProducts(ps=>ps.map(p=>p.id===editing.id?{...p,...form}:p));}else if(modal==='price'){setProducts(ps=>ps.map(p=>p.id===editing.id?{...p,price:+form.newPrice,cost:form.newCost!==undefined?+form.newCost:p.cost}:p));}else if(modal==='promo'){setProducts(ps=>ps.map(p=>p.id===editing.id?{...p,promo:{type:form.promoType,rate:+form.promoRate}}:p));}setModal(null);pushNotification&&pushNotification({type:'success',message:t('operations.fbUpdated')});};
  const handleExcel=()=>{downloadCSV(`Products_${new Date().toISOString().slice(0,10)}.csv`,[t('operations.colId'),t('operations.colSku'),t('operations.colName'),t('operations.colCategory'),t('operations.colSupplier'),t('operations.colCost'),t('operations.colSupplyPrice'),t('operations.colSalePrice'),t('operations.colMargin'),t('operations.colSafeStock'),t('operations.colStock'),t('operations.colOrigin'),t('operations.colWeight'),t('operations.colStatus'),t('operations.colChannels')],filtered.map(p=>[p.id,p.sku,p.name,p.category||'',p.supplier||'',p.cost,p.supplyPrice||'',p.price,margin(p),p.safeQty||'',p.stock,p.origin||'',p.weightKg||'',STATUS_CFG[p.status]?.label||p.status,p.channels?.length||0]));};

  /* Enterprise Error Boundary */


  if (_pageError) return <ErrorFallback error={_pageError} onRetry={() => { _setPageError(null); _setRetryCount(c => c + 1); }} />;


  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
        {[{l:t('operations.statusActive'),v:kpis.active,c:'#22c55e',icon:'\ud83d\udfe2'},{l:t('operations.statusPaused'),v:kpis.paused,c:'#eab308',icon:'\u23f8'},{l:t('operations.statusSoldout'),v:kpis.soldout,c:'#ef4444',icon:'\ud83d\udd34'},{l:t('operations.statusLowStock'),v:kpis.lowStock,c:'#f97316',icon:'\u26a0\ufe0f'},{l:t('operations.avgMargin'),v:kpis.avgMargin+'%',c:'#4f8ef7',icon:'\ud83d\udcca'},{l:t('operations.stockAsset'),v:fmtW(kpis.totalValue),c:'#a855f7',icon:'\ud83d\udcb0'}].map(({l,v,c,icon})=>(
          <div key={l} style={{padding:'10px 12px',borderRadius:12,background:`${c}0d`,border:`1px solid ${c}22`,textAlign:'center'}}>
            <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:700, marginBottom:2 }}>{icon} {l}</div>
            <div style={{ fontSize:16, fontWeight:900, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 180px' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'#22c55e' }}>{"\ud83d\udd0d"}</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('operations.searchProduct')} style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px 7px 30px', borderRadius:9, background:'rgba(34,197,94,0.07)', border:'1.5px solid rgba(34,197,94,0.2)', color:'#e8eaf6', fontSize:12, outline:'none' }}/>
        </div>
        <select className="input" style={{ width:110 }} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="all">{t('operations.allCategory')}</option>
        </select>
        <select className="input" style={{ width:110 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">{t('operations.allStatus')}</option>
          <option value="active">{t('operations.statusActive')}</option><option value="paused">{t('operations.statusPaused')}</option><option value="soldout">{t('operations.statusSoldout')}</option>
        </select>
        <select className="input" style={{ width:110 }} value={filterCh} onChange={e=>setFilterCh(e.target.value)}>
          <option value="all">{t('operations.allChannel')}</option>
          {CH.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <div style={{ display:'flex', gap:4, background:'var(--surface)', borderRadius:8, padding:'3px' }}>
          {[['table',t('operations.viewProducts')],['cost',t('operations.costMargin')]].map(([m,l])=>(
            <button key={m} onClick={()=>setViewMode(m)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:10, fontWeight:700, background:viewMode===m?'linear-gradient(135deg,#4f8ef7,#6366f1)':'transparent', color:viewMode===m?'#fff':'var(--text-3)' }}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize:11, color:'var(--text-3)' }}>{filtered.length} {t('operations.items')}</span>
        <button className="btn-ghost" style={{ marginLeft:'auto', fontSize:11, padding:'5px 12px' }} onClick={handleExcel}>{t('operations.downloadExcel')}</button>
        <button className="btn-primary" style={{ background:'linear-gradient(135deg,#22c55e,#14d9b0)', fontSize:11, padding:'6px 14px', whiteSpace:'nowrap' }} onClick={()=>openModal('add')}>+ {t('operations.addProduct')}</button>
      </div>
      {viewMode==='table'&&(
        <div style={{ overflowX:'auto' }}>
          <table className="table" style={{ minWidth:1100 }}>
            <thead><tr>
              <th>{t('operations.colProductSku')}</th><th>{t('operations.colCategory')}</th><th>{t('operations.colSupplier')}</th>
              <th style={{ textAlign:'center' }}>{t('operations.colSalePrice')}</th>
              <th style={{ textAlign:'center' }}>{t('operations.colStock')}</th>
              <th style={{ textAlign:'center' }}>{t('operations.colSafeStock')}</th>
              <th>{t('operations.colChannelReg')}</th><th>{t('operations.colPromotion')}</th><th>{t('operations.colStatus')}</th>
              <th style={{ textAlign:'right' }}>{t('operations.colAction')}</th>
            </tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={10} style={{ textAlign:'center', color:'var(--text-3)', padding:40 }}>{t('operations.noProducts')}</td></tr>}
              {filtered.map(p=>{const sc=STATUS_CFG[p.status];const low=isLow(p);return(
                <tr key={p.id} style={{ background:low?'rgba(249,115,22,0.03)':p.status==='soldout'?'rgba(239,68,68,0.03)':'' }}>
                  <td><div style={{ fontWeight:700, fontSize:9, fontFamily:'monospace', color:'#4f8ef7', marginTop:1 }} >{p.name}</div><div>{p.sku}</div></td>
                  <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.category}</td>
                  <td style={{ fontSize:11 }}>{p.supplier}</td>
                  <td style={{ textAlign:'center', fontFamily:'monospace', fontWeight:700, fontSize:13 }}>{fmtW(p.price)}</td>
                  <td style={{ textAlign:'center', fontWeight:700, color:p.stock===0?'#ef4444':low?'#f97316':'#22c55e' }}>{p.stock}</td>
                  <td style={{ textAlign:'center', fontSize:11, color:'var(--text-3)' }}>{p.safeQty}</td>
                  <td><div style={{ display:'flex', gap:4, flexWrap:'wrap', fontSize:13, opacity:p.channels?.includes(c.id)?1:0.2, filter:p.channels?.includes(c.id)?'none':'grayscale(1)' }} >{CH.map(c=><span key={c.id}>{c.icon}</span>)}</div></td>
                  <td>{p.promo?<Badge color="#f97316">{p.promo.type} -{p.promo.rate}%</Badge>:<span style={{ color:'var(--text-3)', fontSize:11 }}>{"\u2014"}</span>}</td>
                  <td><Badge color={sc?.color||'#64748b'}>{sc?.label||p.status}</Badge></td>
                  <td><div style={{ display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
                    <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>openModal('edit',p)}>{t('operations.btnEdit')}</button>
                    <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>openModal('price',p)}>{t('operations.btnPrice')}</button>
                    <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>openModal('promo',p)}>{t('operations.btnPromo')}</button>
                  </div></td>
                </tr>);})}
            </tbody>
          </table>
        </div>
      )}
      {viewMode==='cost'&&(
        <div style={{ overflowX:'auto' }}>
          <table className="table" style={{ minWidth:900 }}>
            <thead><tr>
              <th>{t('operations.colProductSku')}</th><th>{t('operations.colSupplier')}</th>
              <th style={{ textAlign:'right' }}>{t('operations.colCost')}</th>
              <th style={{ textAlign:'right' }}>{t('operations.colSupplyPrice')}</th>
              <th style={{ textAlign:'right' }}>{t('operations.colSalePrice')}</th>
              <th style={{ textAlign:'right' }}>{t('operations.colMarginAmt')}</th>
              <th style={{ textAlign:'center' }}>{t('operations.colMarginRate')}</th>
              <th style={{ textAlign:'center' }}>{t('operations.colStockAsset')}</th>
            </tr></thead>
            <tbody>
              {filtered.map(p=>{const m=margin(p);return(
                <tr key={p.id}>
                  <td><div style={{ fontWeight:700, fontSize:9, fontFamily:'monospace', color:'#4f8ef7' }} >{p.name}</div><div>{p.sku}</div></td>
                  <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.supplier}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontSize:12 }}>{fmtW(p.cost)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontSize:12, color:'var(--text-3)' }}>{p.supplyPrice?fmtW(p.supplyPrice):'\u2014'}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, fontSize:13 }}>{fmtW(p.price)}</td>
                  <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'#22c55e', fontSize:12 }}>+{fmtW(p.price-p.cost)}</td>
                  <td style={{ textAlign:'center', fontWeight:700, color:marginColor(m), fontSize:12 }} ><span>{m}%</span></td>
                  <td style={{ textAlign:'center', fontFamily:'monospace', fontSize:11 }}>{fmtW(p.cost*p.stock)}</td>
                </tr>);})}
              <tr style={{ background:'rgba(79,142,247,0.06)', fontWeight:700 }}>
                <td colSpan={7} style={{ textAlign:'right', fontSize:12, color:'var(--text-3)' }}>{t('operations.totalStockCost')}</td>
                <td style={{ textAlign:'center', fontFamily:'monospace', color:'#4f8ef7', fontSize:13 }}>{fmtW(filtered.reduce((s,p)=>s+p.cost*p.stock,0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {(modal==='add'||modal==='edit')&&(
        <Modal title={modal==='add'?t('operations.modalAddProduct'):t('operations.modalEditProduct')} onClose={()=>setModal(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="input-label">{t('operations.fieldProductName')}</label><input className="input" value={form.name||''} onChange={e=>upd('name',e.target.value)}/></div>
            <div><label className="input-label">{t('operations.fieldSku')}</label><input className="input" value={form.sku||''} onChange={e=>upd('sku',e.target.value)}/></div>
            {[['operations.fieldCost','cost','number'],['operations.fieldSupplyPrice','supplyPrice','number'],['operations.fieldSalePrice','price','number'],['operations.fieldSafeStock','safeQty','number'],['operations.fieldStock','stock','number'],['operations.fieldOrigin','origin','text'],['operations.fieldWeight','weightKg','number']].map(([lk,k,tp])=>(
              <div key={k}><label className="input-label">{t(lk)}</label><input className="input" type={tp} value={form[k]||''} onChange={e=>upd(k,e.target.value)}/></div>
            ))}
            <div style={{ gridColumn:'span 2' }}>
              <label className="input-label">{t('operations.fieldChannels')}</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
                {CH.map(c=><label key={c.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, cursor:'pointer' }}>
                  <input type="checkbox" checked={(form.channels||[]).includes(c.id)} onChange={e=>upd('channels',e.target.checked?[...(form.channels||[]),c.id]:(form.channels||[]).filter(x=>x!==c.id))}/>{c.icon} {c.name}
                </label>)}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
            <button className="btn-ghost" onClick={()=>setModal(null)}>{t('operations.cancel')}</button>
            <button className="btn-primary" onClick={applyAction}>{modal==='add'?t('operations.btnRegister'):t('operations.btnSave')}</button>
          </div>
        </Modal>
      )}
      {modal==='price'&&editing&&(
        <Modal title={t('operations.modalPriceChange')} onClose={()=>setModal(null)}>
          <div style={{ display:'grid', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div><label className="input-label">{t('operations.newCost')}</label><input className="input" type="number" value={form.newCost??editing.cost} onChange={e=>upd('newCost',e.target.value)}/></div>
              <div><label className="input-label">{t('operations.newSupplyPrice')}</label><input className="input" type="number" value={form.newSupply??editing.supplyPrice??''} onChange={e=>upd('newSupply',e.target.value)}/></div>
              <div><label className="input-label">{t('operations.newSalePrice')}</label><input className="input" type="number" value={form.newPrice??editing.price} onChange={e=>upd('newPrice',e.target.value)}/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={()=>setModal(null)}>{t('operations.cancel')}</button>
              <button className="btn-primary" onClick={applyAction}>{t('operations.btnApplyPrice')}</button>
            </div>
          </div>
        </Modal>
      )}
      {modal==='promo'&&editing&&(
        <Modal title={t('operations.modalPromo')} onClose={()=>setModal(null)}>
          <div style={{ display:'grid', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label className="input-label">{t('operations.promoRate')}</label><input className="input" type="number" value={form.promoRate||10} onChange={e=>upd('promoRate',e.target.value)}/></div>
              <div><label className="input-label">{t('operations.promoDays')}</label><input className="input" type="number" value={form.promoDays||7} onChange={e=>upd('promoDays',e.target.value)}/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={()=>setModal(null)}>{t('operations.cancel')}</button>
              <button className="btn-primary" onClick={applyAction}>{t('operations.btnApplyPromo')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── TAB 2: Ad Campaign ─── */
const PLATFORMS={meta:{name:"Meta Ads",icon:"\ud83d\udcd8",color:"#1877f2"},tiktok:{name:"TikTok Ads",icon:"\ud83c\udfb5",color:"#ff0050"},google:{name:"Google Ads",icon:"\ud83d\udd0d",color:"#4285f4"},naver:{name:"Naver SA",icon:"\ud83d\udfe2",color:"#03c75a"},coupang:{name:"Coupang Ads",icon:"\ud83c\uddf0\ud83c\uddf7",color:"#00bae5"}};

function CampaignTab() {
  const t = useT();
  const [campaigns,setCampaigns] = useState([]);
  const [modal,setModal] = useState(null);
  const [form,setForm] = useState({});
  const [editing,setEditing] = useState(null);
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const openNew=()=>{setEditing(null);setForm({name:"",platform:"meta",type:"Conversion",budget:300000,dailyBudget:50000,bidStrategy:"lowest_cost",targetRoas:3.0});setModal("new");};
  const openBudget=c=>{setEditing(c);setForm({newBudget:c.budget});setModal("budget");};
  const createCampaign=()=>{setCampaigns(cs=>[...cs,{id:`CMP-${String(cs.length+1).padStart(3,"0")}`, ...form,status:"active",spend:0,roas:0,impressions:0,clicks:0}]);setModal(null);};
  const applyBudget=()=>{setCampaigns(cs=>cs.map(c=>c.id===editing.id?{...c,budget:+form.newBudget}:c));setModal(null);};
  const toggle=id=>setCampaigns(cs=>cs.map(c=>c.id===id?{...c,status:c.status==="active"?"paused":"active"}:c));

  return (
    <div style={{ display:"grid", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:'var(--text-3)' }}>{campaigns.length} {t('operations.campaigns')}</div>
        <button className="btn-primary" onClick={openNew} style={{ background:"linear-gradient(135deg,#1877f2,#a855f7)" }}>+ {t('operations.createCampaign')}</button>
      </div>
      {campaigns.length===0&&<div style={{ textAlign:'center', color:'var(--text-3)', fontSize:13, padding:'40px 0' }}>{t('operations.noCampaigns')}</div>}
      <div style={{ display:"grid", gap:10 }}>
        {campaigns.map(c=>{const pl=PLATFORMS[c.platform]||{name:c.platform,icon:"\ud83d\udcca",color:"#4f8ef7"};const prog=c.budget>0?Math.round((c.spend/c.budget)*100):0;return(
          <div key={c.id} className="card card-glass" style={{borderLeft:`3px solid ${pl.color}`,padding:18}}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:14 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:22 }}>{pl.icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                  <div style={{ fontSize:10, color:"#4f8ef7", marginTop:2, fontFamily:"monospace" }} >{pl.name} {"\u00b7"} {c.type} {"\u00b7"} <span>{c.id}</span></div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <Badge color={c.status==="active"?"#22c55e":"#eab308"}>{c.status==="active"?t('operations.running'):t('operations.paused')}</Badge>
                <button className="btn-ghost" style={{ fontSize:10, padding:"3px 8px" }} onClick={()=>openBudget(c)}>{t('operations.budgetBid')}</button>
                <button className="btn-ghost" style={{ fontSize:10, padding:"3px 8px", color:c.status==="active"?"#eab308":"#22c55e" }} onClick={()=>toggle(c.id)}>
                  {c.status==="active"?t('operations.pause'):t('operations.resume')}
                </button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:12 }}>
              {[[t('operations.budget'),fmtW(c.budget),"#4f8ef7"],[t('operations.spent'),fmtW(c.spend),"#f97316"],["ROAS",c.roas?c.roas+"x":"\u2014","#22c55e"],[t('operations.impressions'),(c.impressions>=1e6?(c.impressions/1e6).toFixed(1)+"M":(c.impressions/1000).toFixed(0)+"K"),"#a855f7"],[t('operations.clicks'),(c.clicks/1000).toFixed(1)+"K","#14d9b0"]].map(([l,v,col])=>(
                <div key={l} style={{ textAlign:"center", padding:"8px 4px", borderRadius:10, background:"rgba(9,15,30,0.5)" }}>
                  <div style={{ fontSize:9, color:"var(--text-3)", fontWeight:700, marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:col }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ height:4, background:'var(--surface)', borderRadius:4, overflow:'hidden' }}><div style={{ width:`${prog}%`,height:"100%",borderRadius:4,background:`linear-gradient(90deg,${pl.color},${pl.color}88)` }}/></div>
            <div style={{ fontSize:10, color:"var(--text-3)", marginTop:4, textAlign:"right" }}>{t('operations.budgetUsed')} {prog}%</div>
          </div>
        );})}
      </div>
      {modal==="new"&&(
        <Modal title={t('operations.newCampaign')} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gap:12 }}>
            <div><label className="input-label">{t('operations.campName')}</label><input className="input" value={form.name} onChange={e=>upd("name",e.target.value)}/></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label className="input-label">{t('operations.platform')}</label><select className="input" value={form.platform} onChange={e=>upd("platform",e.target.value)}>{Object.entries(PLATFORMS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.name}</option>)}</select></div>
              <div><label className="input-label">{t('operations.totalBudget')}</label><input className="input" type="number" value={form.budget} onChange={e=>upd("budget",e.target.value)}/></div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={()=>setModal(null)}>{t('operations.cancel')}</button>
              <button className="btn-primary" onClick={createCampaign}>{t('operations.createCampaign')}</button>
            </div>
          </div>
        </Modal>
      )}
      {modal==="budget"&&editing&&(
        <Modal title={t('operations.budgetChange')} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gap:12 }}>
            <div><label className="input-label">{t('operations.newBudget')}</label><input className="input" type="number" value={form.newBudget} onChange={e=>upd("newBudget",e.target.value)}/></div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={()=>setModal(null)}>{t('operations.cancel')}</button>
              <button className="btn-primary" onClick={applyBudget}>{t('operations.btnApplyChange')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── TAB 3: Coupon/Promo ─── */
function PromoTab() {
  const t = useT();
  const [promos,setPromos] = useState([]);
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({});
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const openNew=()=>{setForm({name:"",type:"percent",value:"",code:"",maxUse:1000,channels:["shopify"],startDate:"",endDate:"",budget:500});setModal(true);};
  const create=()=>{setPromos(ps=>[...ps,{id:`PROMO-${String(ps.length+1).padStart(3,"0")}`, ...form,status:"draft",used:0}]);setModal(false);};
  const PROMO_STATUS={active:"#22c55e",ended:"#ef4444",draft:"#eab308"};

  return (
    <div style={{ display:"grid", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:'var(--text-3)' }}>{promos.length} {t('operations.promotions')}</div>
        <button className="btn-primary" onClick={openNew} style={{ background:"linear-gradient(135deg,#ec4899,#f97316)" }}>+ {t('operations.createPromo')}</button>
      </div>
      {promos.length===0&&<div style={{ textAlign:'center', color:'var(--text-3)', fontSize:13, padding:'40px 0' }}>{t('operations.noPromos')}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
        {promos.map(p=>(
          <div key={p.id} className="card card-glass" style={{borderTop:`3px solid ${PROMO_STATUS[p.status]||"#4f8ef7"}`}}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <Badge color={PROMO_STATUS[p.status]}>{p.status==="active"?t('operations.running'):p.status==="ended"?t('operations.ended'):t('operations.draft')}</Badge>
              <span style={{ fontSize:10, fontFamily:"monospace", color:"var(--text-3)" }}>{p.id}</span>
            </div>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>{p.name}</div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:12 }}>{p.type} {"\u00b7"} {p.value}</div>
            <div style={{ display:"flex", gap:6 }}>
              <button className="btn-ghost" style={{ flex:1, fontSize:10, padding:"5px 0" }}>{t('operations.edit')}</button>
              {p.status==="draft"&&<button className="btn-primary" style={{ flex:1, fontSize:10, padding:"5px 0" }} onClick={()=>setPromos(ps=>ps.map(q=>q.id===p.id?{...q,status:"active"}:q))}>{t('operations.activate')}</button>}
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <Modal title={t('operations.newPromo')} onClose={()=>setModal(false)}>
          <div style={{ display:"grid", gap:12 }}>
            <div><label className="input-label">{t('operations.promoName')}</label><input className="input" value={form.name} onChange={e=>upd("name",e.target.value)}/></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label className="input-label">{t('operations.promoValue')}</label><input className="input" value={form.value} onChange={e=>upd("value",e.target.value)} placeholder="15% / 5000"/></div>
              <div><label className="input-label">{t('operations.couponCode')}</label><input className="input" value={form.code} onChange={e=>upd("code",e.target.value)} placeholder="SPRING2026"/></div>
              <div><label className="input-label">{t('operations.startDate')}</label><input className="input" type="date" value={form.startDate} onChange={e=>upd("startDate",e.target.value)}/></div>
              <div><label className="input-label">{t('operations.endDate')}</label><input className="input" type="date" value={form.endDate} onChange={e=>upd("endDate",e.target.value)}/></div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={()=>setModal(false)}>{t('operations.cancel')}</button>
              <button className="btn-primary" onClick={create}>{t('operations.createPromo')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── TAB 4: Influencer ─── */
function InfluencerTab() {
  const t = useT();
  const [campaigns] = useState([]);
  return (
    <div style={{ display:"grid", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:'var(--text-3)' }}>{campaigns.length} {t('operations.influencers')}</div>
      </div>
      {campaigns.length===0&&<div style={{ textAlign:'center', color:'var(--text-3)', fontSize:13, padding:'40px 0' }}>{t('operations.noInfluencers')}</div>}
    </div>
  );
}

/* ─── Usage Guide ─── */
function UsageGuide({t}) {
  const [open,setOpen] = useState(false);
  const steps=[1,2,3,4,5,6];
  return (
    <div style={{ marginTop:8 }}>
      <button onClick={()=>setOpen(v=>!v)} style={{ display:"flex", alignItems:"center", gap:8, margin:"0 auto 16px", padding:"10px 24px", borderRadius:12, border:"1px solid rgba(249,115,22,0.3)", background:"rgba(249,115,22,0.06)", color:"#f97316", fontSize:13, fontWeight:700, cursor:"pointer" }}>
        {open?`\ud83d\udcd6 ${t("operations.guideTitle")} \u25b2`:`\ud83d\udcd6 ${t("operations.guideTitle")} \u25bc`}
      </button>
      {open&&(
        <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:16, padding:24 }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>{"\u26a1"}</div>
            <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 6px", color: '#fff' }}>{t("operations.guideTitle")}</h2>
            <p style={{ color:'var(--text-3)', fontSize:12 }}>{t("operations.guideSub")}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            {steps.map(i=>(
              <div key={i} style={{ padding:14, borderRadius:12, background:"rgba(249,115,22,0.03)", border:"1px solid rgba(249,115,22,0.08)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, background:"linear-gradient(135deg,#f97316,#a855f7)", color: '#fff' }}>{i}</span>
                  <span style={{ fontWeight:800, fontSize:12, color:"#f97316" }}>{t(`operations.guideStep${i}Title`)}</span>
                </div>
                <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.6, margin:0 }}>{t(`operations.guideStep${i}Desc`)}</p>
              </div>
            ))}
          </div>
          <div style={{ padding:"14px 16px", borderRadius:10, background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.15)" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#a855f7", marginBottom:6 }}>{"\ud83d\udca1"} {t("operations.guideTipTitle")}</div>
            <p style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.6, margin:0 }}>{t("operations.guideTipDesc")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */

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

export default function OperationsHub() {
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);

  const t = useT();
  useSecurityMonitor("operations");
  const TABS = [
    {id:"promotions",label:t('operations.tabPromo'),desc:t('operations.tabPromoDesc')},
    {id:"creative",label:t('operations.tabCreative'),desc:t('operations.tabCreativeDesc')},
  ];
  const [tab,setTab] = useState("promotions");

  return (
    <div style={{ display:"grid", gap:16 }}>
      <div className="hero fade-up" style={{ background:"linear-gradient(135deg,rgba(249,115,22,0.08),rgba(168,85,247,0.06))", borderColor:"rgba(249,115,22,0.15)" }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background:"linear-gradient(135deg,rgba(249,115,22,0.25),rgba(168,85,247,0.15))" }}>{"\u26a1"}</div>
          <div>
            <div className="hero-title" style={{ background:"linear-gradient(135deg,#f97316,#a855f7)" }}>{t('operations.heroTitle')}</div>
            <div className="hero-desc">{t('operations.heroDesc')}</div>
          </div>
        </div>
      </div>
      <div className="card card-glass fade-up fade-up-1" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)" }}>
          {TABS.map(tabItem=>(
            <button key={tabItem.id} onClick={()=>setTab(tabItem.id)} style={{padding:"16px 14px",border:"none",cursor:"pointer",textAlign:"left",background:tab===tabItem.id?"rgba(249,115,22,0.1)":"transparent",borderBottom:`2px solid ${tab===tabItem.id?"#f97316":"transparent"}`,transition:"all 200ms"}}>
              <div style={{ fontSize:14, fontWeight:800, color:tab===tabItem.id?"var(--text-1)":"var(--text-2)" }}>{tabItem.label}</div>
              <div style={{ fontSize:10, color:"var(--text-3)", marginTop:3 }}>{tabItem.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card card-glass fade-up fade-up-2">
        {tab==="promotions"&&<PromoTab/>}
        {tab==="creative"&&<CreativeStudioTab sourcePage="operations"/>}
      </div>
      <UsageGuide t={t}/>
    </div>
  );
}
