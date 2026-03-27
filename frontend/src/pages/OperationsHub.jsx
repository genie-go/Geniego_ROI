import React, { useState, useMemo, useCallback } from "react";
import { useNotification } from "../context/NotificationContext.jsx";

import { useT } from '../i18n/index.js';
/* ─── Shared helpers ─────────────────────────────────────────── */
const fmtW = n => n >= 1_000_000 ? `₩${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `₩${(n / 1000).toFixed(0)}K` : `₩${n}`;
const CH = [
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" },
    { id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "tiktok", name: "TikTok", icon: "🎵", color: "#ff0050" },
];
const ch = id => CH.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };

function Badge({ children, color = "#4f8ef7" }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20,
            fontSize: 10, fontWeight: 700, background: color + "18", color, border: `1px solid ${color}33`
        }}>
            {children}
        </span>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300 }} />
            <div style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(680px,95vw)",
                maxHeight: "85vh", overflowY: "auto", background: "linear-gradient(180deg,#0d1525,#090f1e)",
                border: "1px solid rgba(99,140,255,0.2)", borderRadius: 20, padding: 28, zIndex: 301,
                animation: "popIn 0.2s cubic-bezier(.4,0,.2,1)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1)" }}>{title}</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18 }}>✕</button>
                </div>
                {children}
            </div>
            <style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1: Product Management
═══════════════════════════════════════════════════════════════ */
/* ─── Category / Supplier ─── */
const CATEGORIES = ["전자제품", "음향기기", "주변기기", "충전기/케이블", "캠핑용품", "패션잡화", "생활용품", "기타"];
const SUPPLIERS_LIST = ["(주)테크넷코리아", "광저우일렉트론Co.", "에이원부품상사", "직Count입"];

const MOCK_PRODUCTS = [
    { id: "P001", sku: "WH-1000XM5", name: "시카페어(Cicapair) 미스트", category: "음향기기", supplier: "(주)테크넷코리아", cost: 180000, supplyPrice: 210000, price: 289000, safeQty: 30, stock: 142, channels: ["shopify", "coupang", "naver"], channelIds: { shopify:"SHF-P001", coupang:"CPG-10001", naver:"NVR-A001" }, status: "active", promo: null, weightKg: 0.35, origin: "KR" },
    { id: "P002", sku: "KB-MXM-RGB", name: "세라마이딘(Ceramidin) 세라마이드 크림", category: "주변기기", supplier: "(주)테크넷코리아", cost: 75000, supplyPrice: 88000, price: 149000, safeQty: 20, stock: 87, channels: ["shopify", "amazon", "11st"], channelIds: { shopify:"SHF-P002", amazon:"AMZ-B001", "11st":"11S-K002" }, status: "active", promo: { type: "할인", rate: 15 }, weightKg: 0.95, origin: "KR" },
    { id: "P003", sku: "HC-USB4-7P", name: "바이탈 하이드라 콜라겐 앰플", category: "주변기기", supplier: "광저우일렉트론Co.", cost: 18000, supplyPrice: 22000, price: 49000, safeQty: 50, stock: 23, channels: ["coupang", "naver"], channelIds: { coupang:"CPG-20002", naver:"NVR-B002" }, status: "paused", promo: null, weightKg: 0.15, origin: "CN" },
    { id: "P004", sku: "CAM-4K-PRO", name: "더마클리어 마이크로 폼 수딩 젤", category: "전자제품", supplier: "광저우일렉트론Co.", cost: 55000, supplyPrice: 68000, price: 129000, safeQty: 15, stock: 56, channels: ["shopify", "amazon"], channelIds: { shopify:"SHF-P004", amazon:"AMZ-C004" }, status: "active", promo: { type: "번들", rate: 10 }, weightKg: 0.28, origin: "CN" },
    { id: "P005", sku: "MS-ERG-BL", name: "크라이오 고무 마스크 워터풀", category: "주변기기", supplier: "(주)테크넷코리아", cost: 28000, supplyPrice: 34000, price: 69000, safeQty: 25, stock: 0, channels: ["naver", "11st"], channelIds: { naver:"NVR-C005", "11st":"11S-M005" }, status: "soldout", promo: null, weightKg: 0.12, origin: "KR" },
    { id: "P006", sku: "CH-60W-GAN", name: "V7 핑크 토닝 라이트 V3", category: "충전기/케이블", supplier: "에이원부품상사", cost: 12000, supplyPrice: 16000, price: 39000, safeQty: 100, stock: 210, channels: ["shopify", "tiktok"], channelIds: { shopify:"SHF-P006", tiktok:"TTK-G006" }, status: "active", promo: null, weightKg: 0.09, origin: "CN" },
];

const STATUS_CFG = { active: { label: "판매in progress", color: "#22c55e" }, paused: { label: "일시Stop", color: "#eab308" }, soldout: { label: "품절", color: "#ef4444" } };

function downloadCSV(filename, headers, rows) {
    const BOM = '\uFEFF';
    const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))];
    const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ProductTab() {
    const { pushNotification } = useNotification();
    const [products, setProducts] = useState(MOCK_PRODUCTS);
    const [modal, setModal] = useState(null);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCh, setFilterCh] = useState('all');
    const [viewMode, setViewMode] = useState('table'); // table | cost
    const [form, setForm] = useState({});
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const filtered = useMemo(() => {
        let rows = products;
        if (search) rows = rows.filter(p => p.name.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase()));
        if (filterCat !== 'all') rows = rows.filter(p => p.category === filterCat);
        if (filterStatus !== 'all') rows = rows.filter(p => p.status === filterStatus);
        if (filterCh !== 'all') rows = rows.filter(p => p.channels.includes(filterCh));
        return rows;
    }, [products, search, filterCat, filterStatus, filterCh]);

    const kpis = useMemo(() => ({
        active: products.filter(p => p.status === 'active').length,
        paused: products.filter(p => p.status === 'paused').length,
        soldout: products.filter(p => p.status === 'soldout').length,
        lowStock: products.filter(p => p.stock > 0 && p.stock <= (p.safeQty || 20)).length,
        avgMargin: (products.reduce((s,p) => s + ((p.price - p.cost)/p.price*100), 0) / products.length).toFixed(1),
        totalValue: products.reduce((s,p) => s + p.cost * p.stock, 0),
    }), [products]);

    const openModal = (type, p = null) => {
        setEditing(p);
        if (type === 'add') setForm({ name:'', sku:'', category:'전자제품', supplier:SUPPLIERS_LIST[0], cost:0, supplyPrice:0, price:0, safeQty:20, stock:0, channels:[], status:'active', origin:'KR', weightKg:0 });
        else if (p) setForm({ ...p, newPrice: p.price, newStock: p.stock, promoRate: 10, promoType:'할인율', promoDays:7 });
        setModal(type);
    };

    const applyAction = () => {
        if (modal === 'edit' || modal === 'add') {
            if (modal === 'add') { setProducts(ps => [...ps, { ...form, id:`P${String(ps.length+1).padStart(3,'0')}`, channelIds:{} }]); }
            else { setProducts(ps => ps.map(p => p.id === editing.id ? { ...p, ...form } : p)); }
        } else if (modal === 'price') {
            setProducts(ps => ps.map(p => p.id === editing.id ? { ...p, price: +form.newPrice, cost: form.newCost !== undefined ? +form.newCost : p.cost } : p));
        } else if (modal === 'promo') {
            setProducts(ps => ps.map(p => p.id === editing.id ? { ...p, promo: { type: form.promoType, rate: +form.promoRate } } : p));
        }
        setModal(null);
        pushNotification && pushNotification({ type:'success', message:'Product Info가 Update되었습니다.' });
    };

    const margin = p => p.price > 0 ? ((p.price - p.cost) / p.price * 100).toFixed(1) : 0;
    const marginColor = m => m >= 40 ? '#22c55e' : m >= 20 ? '#eab308' : '#ef4444';

    const handleExcel = () => {
        downloadCSV(`Product마스터_${new Date().toISOString().slice(0,10)}.csv`,
            ['ID','SKU','Product Name','Category','Supplier','Cost Price','공급가','Sale Price','마진율(%)','안전Stock','현Stock','원산지','무게(kg)','Status','ChannelCount'],
            filtered.map(p => [p.id, p.sku, p.name, p.category||'', p.supplier||'', p.cost, p.supplyPrice||'', p.price, margin(p), p.safeQty||'', p.stock, p.origin||'', p.weightKg||'', STATUS_CFG[p.status]?.label||p.status, p.channels.length])
        );
    };

    const isLow = p => p.stock > 0 && p.stock <= (p.safeQty || 20);

    return (
        <div style={{ display:'grid', gap:16 }}>
            {/* KPI 행 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
                {[
                    { l:'판매in progress', v:kpis.active, c:'#22c55e', icon:'🟢' },
                    { l:'일시Stop', v:kpis.paused, c:'#eab308', icon:'⏸' },
                    { l:'품절', v:kpis.soldout, c:'#ef4444', icon:'🔴' },
                    { l:'Stock부족', v:kpis.lowStock, c:'#f97316', icon:'⚠️' },
                    { l:'Average마진율', v:kpis.avgMargin+'%', c:'#4f8ef7', icon:'📊' },
                    { l:'Stock자산(Cost Price)', v:'₩'+(kpis.totalValue/1000000).toFixed(1)+'M', c:'#a855f7', icon:'💰' },
                ].map(({l,v,c,icon}) => (
                    <div key={l} style={{ padding:'10px 12px', borderRadius:12, background:`${c}0d`, border:`1px solid ${c}22`, textAlign:'center' }}>
                        <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:700, marginBottom:2 }}>{icon} {l}</div>
                        <div style={{ fontSize:16, fontWeight:900, color:c }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Stock부족 Notification */}
            {kpis.lowStock > 0 && (
                <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', fontSize:11, color:'#f97316', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                    ⚠️ <strong>Stock 부족 {kpis.lowStock}개 품목</strong> — 안전Stock 이하입니다. WMS &gt; Auto발주 Tab에서 즉시 발주를 Create하세요.
                    {products.filter(isLow).map(p => (
                        <span key={p.sku} style={{ padding:'2px 8px', borderRadius:99, background:'rgba(249,115,22,0.15)', color:'#f97316', fontSize:10, fontWeight:700, border:'1px solid rgba(249,115,22,0.3)' }}>{p.sku} ({p.stock}/{p.safeQty})</span>
                    ))}
                </div>
            )}

            {/* Search·Filter·Action */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ position:'relative', flex:'1 1 180px' }}>
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'#22c55e' }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Product Name·SKU Search…"
                        style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px 7px 30px', borderRadius:9, background:'rgba(34,197,94,0.07)', border:'1.5px solid rgba(34,197,94,0.2)', color:'#e8eaf6', fontSize:12, outline:'none' }} />
                </div>
                <select className="input" style={{ width:110 }} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                    <option value="all">All Category</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="input" style={{ width:110 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">판매in progress</option><option value="paused">일시Stop</option><option value="soldout">품절</option>
                </select>
                <select className="input" style={{ width:110 }} value={filterCh} onChange={e=>setFilterCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {CH.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'3px' }}>
                    {[['table','📋 ProductList'],['cost','💹 Cost Price/마진']].map(([m,l]) => (
                        <button key={m} onClick={()=>setViewMode(m)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:10, fontWeight:700, background:viewMode===m?'linear-gradient(135deg,#4f8ef7,#6366f1)':'transparent', color:viewMode===m?'#fff':'var(--text-3)' }}>{l}</button>
                    ))}
                </div>
                <span style={{ fontSize:11, color:'var(--text-3)' }}>{filtered.length}개</span>
                <button className="btn-ghost" style={{ marginLeft:'auto', fontSize:11, padding:'5px 12px' }} onClick={handleExcel}>📥 엑셀 Download</button>
                <button className="btn-primary" style={{ background:'linear-gradient(135deg,#22c55e,#14d9b0)', fontSize:11, padding:'6px 14px', whiteSpace:'nowrap' }} onClick={()=>openModal('add')}>+ 신규 Product Register</button>
            </div>

            {/* ── 뷰 1: Product 마스터 Table ── */}
            {viewMode === 'table' && (
                <div style={{ overflowX:'auto' }}>
                    <table className="table" style={{ minWidth:1100 }}>
                        <thead>
                            <tr>
                                <th>Product·SKU</th><th>Category</th><th>Supplier</th>
                                <th style={{ textAlign:'center' }}>Sale Price</th>
                                <th style={{ textAlign:'center' }}>현Stock</th>
                                <th style={{ textAlign:'center' }}>안전Stock</th>
                                <th>Channel Register 현황</th><th>Pro모션</th><th>Status</th>
                                <th style={{ textAlign:'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const sc = STATUS_CFG[p.status];
                                const low = isLow(p);
                                return (
                                    <tr key={p.id} style={{ background: low?'rgba(249,115,22,0.03)':p.status==='soldout'?'rgba(239,68,68,0.03)':'' }}>
                                        <td>
                                            <div style={{ fontWeight:700, fontSize:12 }}>{p.name}</div>
                                            <div style={{ fontSize:9, fontFamily:'monospace', color:'#4f8ef7', marginTop:1 }}>{p.sku}</div>
                                            {p.origin && <span style={{ fontSize:8, color:'var(--text-3)' }}>🌍 {p.origin} · {p.weightKg}kg</span>}
                                        </td>
                                        <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.category}</td>
                                        <td style={{ fontSize:11 }}>{p.supplier}</td>
                                        <td style={{ textAlign:'center', fontFamily:'monospace', fontWeight:700, fontSize:13 }}>{fmtW(p.price)}</td>
                                        <td style={{ textAlign:'center', fontWeight:700, color: p.stock===0?'#ef4444':low?'#f97316':'#22c55e' }}>
                                            {p.stock}
                                            {low && <div style={{ fontSize:8, color:'#f97316' }}>⚠부족</div>}
                                            {p.stock===0 && <div style={{ fontSize:8, color:'#ef4444' }}>품절</div>}
                                        </td>
                                        <td style={{ textAlign:'center', fontSize:11, color:'var(--text-3)' }}>{p.safeQty}</td>
                                        <td>
                                            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                                {CH.map(c => {
                                                    const reg = p.channels.includes(c.id);
                                                    return (
                                                        <span key={c.id} title={reg ? `${c.name}: ${p.channelIds?.[c.id]||'Register됨'}` : `${c.name}: 미Register`}
                                                            style={{ fontSize:13, opacity: reg?1:0.2, filter:reg?'none':'grayscale(1)' }}>
                                                            {c.icon}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <div style={{ fontSize:8, color:'var(--text-3)', marginTop:2 }}>{p.channels.length}/{CH.length} Channel</div>
                                        </td>
                                        <td>
                                            {p.promo ? <Badge color="#f97316">{p.promo.type} -{p.promo.rate}%</Badge>
                                                : <span style={{ color:'var(--text-3)', fontSize:11 }}>—</span>}
                                        </td>
                                        <td><Badge color={sc.color}>{sc.label}</Badge></td>
                                        <td>
                                            <div style={{ display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
                                                <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>openModal('edit',p)}>✏️ Edit</button>
                                                <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>openModal('price',p)}>💹 Price</button>
                                                <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>openModal('promo',p)}>🎁 Pro모션</button>
                                                <button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px', color: p.status==='paused'?'#22c55e':'#eab308' }}
                                                    onClick={()=>setProducts(ps=>ps.map(q=>q.id===p.id?{...q,status:q.status==='paused'?'active':'paused'}:q))}>
                                                    {p.status==='paused'?'▶ 재개':'⏸ Stop'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 뷰 2: Cost Price/마진 Analysis ── */}
            {viewMode === 'cost' && (
                <div style={{ overflowX:'auto' }}>
                    <table className="table" style={{ minWidth:900 }}>
                        <thead>
                            <tr>
                                <th>Product·SKU</th><th>Supplier</th>
                                <th style={{ textAlign:'right' }}>Cost Price</th>
                                <th style={{ textAlign:'right' }}>공급가</th>
                                <th style={{ textAlign:'right' }}>Sale Price</th>
                                <th style={{ textAlign:'right' }}>마진(원)</th>
                                <th style={{ textAlign:'center' }}>마진율</th>
                                <th style={{ textAlign:'center' }}>Stock자산(Cost Price)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const m = margin(p);
                                const profitAmt = p.price - p.cost;
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ fontWeight:700, fontSize:12 }}>{p.name}</div>
                                            <div style={{ fontSize:9, fontFamily:'monospace', color:'#4f8ef7' }}>{p.sku}</div>
                                        </td>
                                        <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.supplier}</td>
                                        <td style={{ textAlign:'right', fontFamily:'monospace', fontSize:12 }}>{fmtW(p.cost)}</td>
                                        <td style={{ textAlign:'right', fontFamily:'monospace', fontSize:12, color:'var(--text-3)' }}>{p.supplyPrice ? fmtW(p.supplyPrice) : '—'}</td>
                                        <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, fontSize:13 }}>{fmtW(p.price)}</td>
                                        <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'#22c55e', fontSize:12 }}>+{fmtW(profitAmt)}</td>
                                        <td style={{ textAlign:'center' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                                                <div style={{ width:60, height:5, background:'rgba(255,255,255,0.07)', borderRadius:99 }}>
                                                    <div style={{ width:`${Math.min(100,m)}%`, height:'100%', borderRadius:99, background:marginColor(m) }} />
                                                </div>
                                                <span style={{ fontWeight:700, color:marginColor(m), fontSize:12 }}>{m}%</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign:'center', fontFamily:'monospace', fontSize:11 }}>{fmtW(p.cost * p.stock)}</td>
                                    </tr>
                                );
                            })}
                            <tr style={{ background:'rgba(79,142,247,0.06)', fontWeight:700 }}>
                                <td colSpan={7} style={{ textAlign:'right', fontSize:12, color:'var(--text-3)' }}>Total Stock Cost Price Total</td>
                                <td style={{ textAlign:'center', fontFamily:'monospace', color:'#4f8ef7', fontSize:13 }}>{fmtW(filtered.reduce((s,p)=>s+p.cost*p.stock,0))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Modal: 신규 Register / Edit ── */}
            {(modal === 'add' || modal === 'edit') && (
                <Modal title={modal==='add' ? '📦 신규 Product Register' : `✏️ Product Edit — ${editing?.name}`} onClose={()=>setModal(null)}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        {[['Product Name','name','text'],['SKU','sku','text']].map(([l,k,t]) => (
                            <div key={k}><label className="input-label">{l}</label><input className="input" type={t} value={form[k]||''} onChange={e=>upd(k,e.target.value)} /></div>
                        ))}
                        <div><label className="input-label">Category</label>
                            <select className="input" value={form.category||'전자제품'} onChange={e=>upd('category',e.target.value)}>
                                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                            </select></div>
                        <div><label className="input-label">Supplier</label>
                            <select className="input" value={form.supplier||''} onChange={e=>upd('supplier',e.target.value)}>
                                {SUPPLIERS_LIST.map(s=><option key={s}>{s}</option>)}
                            </select></div>
                        {[['Cost Price(₩)','cost','number'],['공급가(₩)','supplyPrice','number'],['Sale Price(₩)','price','number'],['안전Stock','safeQty','number'],['초기 Stock','stock','number'],['원산지','origin','text'],['무게(kg)','weightKg','number']].map(([l,k,t]) => (
                            <div key={k}><label className="input-label">{l}</label><input className="input" type={t} value={form[k]||''} onChange={e=>upd(k,e.target.value)} /></div>
                        ))}
                        <div style={{ gridColumn:'span 2' }}>
                            <label className="input-label">판매 Channel</label>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
                                {CH.map(c => <label key={c.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, cursor:'pointer' }}>
                                    <input type="checkbox" checked={(form.channels||[]).includes(c.id)}
                                        onChange={e => upd('channels', e.target.checked ? [...(form.channels||[]),c.id] : (form.channels||[]).filter(x=>x!==c.id))} />
                                    {c.icon} {c.name}
                                </label>)}
                            </div>
                        </div>
                        {/* 마진 미리보기 */}
                        {form.price > 0 && form.cost > 0 && (
                            <div style={{ gridColumn:'span 2', padding:'10px 14px', borderRadius:10, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)', fontSize:12 }}>
                                💹 예상 마진: <b style={{ color:'#22c55e' }}>{fmtW(form.price - form.cost)}</b> &nbsp;|&nbsp; 마진율: <b style={{ color:marginColor(((form.price-form.cost)/form.price*100).toFixed(1)) }}>{((form.price-form.cost)/form.price*100).toFixed(1)}%</b>
                            </div>
                        )}
                    </div>
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                        <button className="btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
                        <button className="btn-primary" onClick={applyAction}>{modal==='add'?'📦 Register':'💾 Save'}</button>
                    </div>
                </Modal>
            )}

            {/* ── Modal: Price/Cost Price Change ── */}
            {modal === 'price' && editing && (
                <Modal title={`💹 Price·Cost Price Change — ${editing.name}`} onClose={()=>setModal(null)}>
                    <div style={{ display:'grid', gap:12 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:'12px 14px', borderRadius:10, background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', fontSize:12 }}>
                            {[['현재 Cost Price', fmtW(editing.cost),'#4f8ef7'],['현재 공급가',editing.supplyPrice?fmtW(editing.supplyPrice):'—','var(--text-3)'],['현재 Sale Price',fmtW(editing.price),'#22c55e']].map(([l,v,c])=>(
                                <div key={l} style={{ textAlign:'center' }}><div style={{ fontSize:9, color:'var(--text-3)' }}>{l}</div><div style={{ fontWeight:700, color:c, fontSize:13, marginTop:2 }}>{v}</div></div>
                            ))}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                            <div><label className="input-label">새 Cost Price(₩)</label><input className="input" type="number" value={form.newCost??editing.cost} onChange={e=>upd('newCost',e.target.value)} /></div>
                            <div><label className="input-label">새 공급가(₩)</label><input className="input" type="number" value={form.newSupply??editing.supplyPrice??''} onChange={e=>upd('newSupply',e.target.value)} /></div>
                            <div><label className="input-label">새 Sale Price(₩)</label><input className="input" type="number" value={form.newPrice??editing.price} onChange={e=>upd('newPrice',e.target.value)} /></div>
                        </div>
                        {form.newPrice > 0 && form.newCost > 0 && (
                            <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(34,197,94,0.06)', fontSize:11, color:'#22c55e' }}>
                                💹 Change 후 마진: <b>{fmtW(form.newPrice - form.newCost)}</b> / 마진율: <b>{((form.newPrice-form.newCost)/form.newPrice*100).toFixed(1)}%</b>
                            </div>
                        )}
                        <div><label className="input-label">Change 사유</label>
                            <select className="input"><option>정기 Price 조정</option><option>경쟁사 대응</option><option>Cost Price 상승</option><option>Pro모션</option></select></div>
                        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                            <button className="btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={applyAction}>💹 Price Change Apply</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Modal: Pro모션 ── */}
            {modal === 'promo' && editing && (
                <Modal title={`🎁 Pro모션 Settings — ${editing.name}`} onClose={()=>setModal(null)}>
                    <div style={{ display:'grid', gap:12 }}>
                        <div><label className="input-label">Pro모션 Type</label>
                            <select className="input" value={form.promoType||'할인율'} onChange={e=>upd('promoType',e.target.value)}>
                                <option>할인율</option><option>번들</option><option>사은품</option><option>Free배송</option><option>한정딜</option>
                            </select></div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                            <div><label className="input-label">할인율 (%)</label><input className="input" type="number" value={form.promoRate||10} onChange={e=>upd('promoRate',e.target.value)} /></div>
                            <div><label className="input-label">Period (일)</label><input className="input" type="number" value={form.promoDays||7} onChange={e=>upd('promoDays',e.target.value)} /></div>
                        </div>
                        {form.promoRate > 0 && (
                            <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(249,115,22,0.06)', fontSize:11, color:'#f97316' }}>
                                🎁 할인 Apply가: <b>{fmtW(Math.round(editing.price * (1 - form.promoRate/100)))}</b> (Cost Price 대비 마진율: {((Math.round(editing.price*(1-form.promoRate/100))-editing.cost)/Math.round(editing.price*(1-form.promoRate/100))*100).toFixed(1)}%)
                            </div>
                        )}
                        <div><label className="input-label">대상 Channel</label>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
                                {CH.map(c=><label key={c.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, cursor:'pointer' }}>
                                    <input type="checkbox" defaultChecked={editing.channels.includes(c.id)} /> {c.icon} {c.name}
                                </label>)}
                            </div></div>
                        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                            <button className="btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={applyAction}>🎁 Pro모션 Apply</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}




/* ═══════════════════════════════════════════════════════════════
   TAB 2: Ad Campaign
═══════════════════════════════════════════════════════════════ */
const MOCK_CAMPAIGNS = [
    { id: "CMP-001", name: "Spring KR — ROAS Drive", platform: "meta", type: "Conversion", status: "active", budget: 500000, spend: 312000, roas: 4.2, impressions: 1240000, clicks: 8400 },
    { id: "CMP-002", name: "TikTok Shop Launch", platform: "tiktok", type: "Awareness", status: "active", budget: 300000, spend: 189000, roas: 3.1, impressions: 3100000, clicks: 21000 },
    { id: "CMP-003", name: "Google PMax — SKU Bundle", platform: "google", type: "PMax", status: "paused", budget: 200000, spend: 0, roas: 0, impressions: 0, clicks: 0 },
    { id: "CMP-004", name: "Meta Retargeting — Cart", platform: "meta", type: "Retargeting", status: "active", budget: 150000, spend: 98000, roas: 6.8, impressions: 420000, clicks: 3100 },
];

const PLATFORMS = { meta: { name: "Meta Ads", icon: "📘", color: "#1877f2" }, tiktok: { name: "TikTok Ads", icon: "🎵", color: "#ff0050" }, google: { name: "Google Ads", icon: "🔍", color: "#4285f4" }, naver: { name: "Naver SA", icon: "🟢", color: "#03c75a" }, coupang: { name: "Coupang Ads", icon: "🇰🇷", color: "#00bae5" } };


function CampaignTab() {
    const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [editing, setEditing] = useState(null);
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const openNew = () => {
        setEditing(null);
        setForm({ name: "", platform: "meta", type: "Conversion", budget: 300000, dailyBudget: 50000, bidStrategy: "lowest_cost", objective: "ROAS", targetRoas: 3.0 });
        setModal("new");
    };
    const openBudget = c => { setEditing(c); setForm({ newBudget: c.budget, newBid: "최저Cost", reason: "Budget 최적화" }); setModal("budget"); };

    const createCampaign = () => {
        setCampaigns(cs => [...cs, { id: `CMP-${String(cs.length + 1).padStart(3, "0")}`, ...form, status: "active", spend: 0, roas: 0, impressions: 0, clicks: 0 }]);
        setModal(null);
    };
    const applyBudget = () => {
        setCampaigns(cs => cs.map(c => c.id === editing.id ? { ...c, budget: +form.newBudget } : c));
        setModal(null);
    };
    const toggle = id => setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status: c.status === "active" ? "paused" : "active" } : c));

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-primary" onClick={openNew} style={{ background: "linear-gradient(135deg,#1877f2,#a855f7)" }}>+ Create Campaign</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
                {campaigns.map(c => {
                    const pl = PLATFORMS[c.platform] || { name: c.platform, icon: "📊", color: "#4f8ef7" };
                    const prog = c.budget > 0 ? Math.round((c.spend / c.budget) * 100) : 0;
                    return (
                        <div key={c.id} className="card card-glass" style={{ borderLeft: `3px solid ${pl.color}`, padding: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <span style={{ fontSize: 22 }}>{pl.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                            {pl.name} · {c.type} · <span style={{ fontFamily: "monospace", color: "#4f8ef7" }}>{c.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <Badge color={c.status === "active" ? "#22c55e" : "#eab308"}>{c.status === "active" ? "● Runin progress" : "⏸ 일시Stop"}</Badge>
                                    <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => openBudget(c)}>Budget·입찰</button>
                                    <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px", color: c.status === "active" ? "#eab308" : "#22c55e" }} onClick={() => toggle(c.id)}>
                                        {c.status === "active" ? "일시Stop" : "재개"}
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 12 }}>
                                {[
                                    ["Budget", fmtW(c.budget), "#4f8ef7"],
                                    ["집행", fmtW(c.spend), "#f97316"],
                                    ["ROAS", c.roas ? c.roas + "x" : "—", "#22c55e"],
                                    ["Impressions", c.impressions >= 1e6 ? (c.impressions / 1e6).toFixed(1) + "M" : (c.impressions / 1000).toFixed(0) + "K", "#a855f7"],
                                    ["Clicks", (c.clicks / 1000).toFixed(1) + "K", "#14d9b0"],
                                ].map(([l, v, col]) => (
                                    <div key={l} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(9,15,30,0.5)" }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: col }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                                <div style={{ width: `${prog}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${pl.color},${pl.color}88)`, transition: "width 0.5s" }} />
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, textAlign: "right" }}>Budget 소진 {prog}%</div>
                        </div>
                    );
                })}
            </div>

            {modal === "new" && (
                <Modal title="새 Create Campaign" onClose={() => setModal(null)}>
                    <div style={{ display: "grid", gap: 12 }}>
                        <div><label className="input-label">Campaign Name</label><input className="input" value={form.name} onChange={e => upd("name", e.target.value)} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div><label className="input-label">Platform</label>
                                <select className="input" value={form.platform} onChange={e => upd("platform", e.target.value)}>
                                    {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
                                </select>
                            </div>
                            <div><label className="input-label">Goal Type</label>
                                <select className="input" value={form.type} onChange={e => upd("type", e.target.value)}>
                                    {["Conversion", "Awareness", "Retargeting", "PMax", "Shopping"].map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div><label className="input-label">Total Budget (₩)</label><input className="input" type="number" value={form.budget} onChange={e => upd("budget", e.target.value)} /></div>
                            <div><label className="input-label">일 Budget (₩)</label><input className="input" type="number" value={form.dailyBudget} onChange={e => upd("dailyBudget", e.target.value)} /></div>
                            <div><label className="input-label">입찰 전략</label>
                                <select className="input" value={form.bidStrategy} onChange={e => upd("bidStrategy", e.target.value)}>
                                    {["lowest_cost", "target_roas", "target_cpa", "max_clicks"].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div><label className="input-label">Goal ROAS</label><input className="input" type="number" step="0.1" value={form.targetRoas} onChange={e => upd("targetRoas", e.target.value)} /></div>
                        </div>
                        <div style={{ padding: "10px 14px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 10, fontSize: 11, color: "#eab308" }}>
                            ⚠ 소재(Creative)는 Create Campaign 후 per도로 Upload하세요.
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={createCampaign}>Create Campaign</button>
                        </div>
                    </div>
                </Modal>
            )}
            {modal === "budget" && editing && (
                <Modal title={`Budget·입찰 Change — ${editing.name}`} onClose={() => setModal(null)}>
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)", fontSize: 12 }}>
                            현재 Budget: <b style={{ color: "#4f8ef7" }}>{fmtW(editing.budget)}</b> · 집행: <b style={{ color: "#f97316" }}>{fmtW(editing.spend)}</b>
                        </div>
                        <div><label className="input-label">신규 Budget (₩)</label><input className="input" type="number" value={form.newBudget} onChange={e => upd("newBudget", e.target.value)} /></div>
                        <div><label className="input-label">입찰 전략</label>
                            <select className="input"><option>lowest_cost</option><option>target_roas</option><option>target_cpa</option></select></div>
                        <div><label className="input-label">Change 사유</label>
                            <select className="input" value={form.reason} onChange={e => upd("reason", e.target.value)}>
                                <option>Budget 최적화</option><option>Performance 확대</option><option>Cost 절감</option><option>시즌 대응</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={applyBudget}>Change Apply</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3: Coupon/딜/Pro모션
═══════════════════════════════════════════════════════════════ */
const PROMO_TYPES = ["퍼센트 할인", "Amount 할인", "Free배송", "번들", "BOGO", "한정딜"];

const MOCK_PROMOS = [
    { id: "PROMO-001", name: "봄맞이 15% 할인", type: "퍼센트 할인", value: "15%", channels: ["shopify", "coupang"], status: "active", startDate: "2026-03-01", endDate: "2026-03-31", used: 342, budget: 1000 },
    { id: "PROMO-002", name: "5만원 이상 Free배송", type: "Free배송", value: "₩0 배송비", channels: ["naver", "11st"], status: "active", startDate: "2026-03-01", endDate: "2026-03-15", used: 891, budget: 5000 },
    { id: "PROMO-003", name: "RGB 키보드 번들딜", type: "번들", value: "10% OFF", channels: ["amazon"], status: "ended", startDate: "2026-02-10", endDate: "2026-02-28", used: 156, budget: 500 },
    { id: "PROMO-004", name: "플래시 세일 20%", type: "한정딜", value: "20%", channels: ["tiktok"], status: "draft", startDate: "2026-03-10", endDate: "2026-03-10", used: 0, budget: 200 },
];

const PROMO_STATUS = { active: "#22c55e", ended: "#ef4444", draft: "#eab308" };

function PromoTab() {
    const [promos, setPromos] = useState(MOCK_PROMOS);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({});
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const openNew = () => {
        setForm({ name: "", type: "퍼센트 할인", value: "", code: "", minOrder: 0, maxUse: 1000, channels: ["shopify"], startDate: "2026-03-04", endDate: "2026-03-31", budget: 500 });
        setModal(true);
    };

    const create = () => {
        setPromos(ps => [...ps, { id: `PROMO-${String(ps.length + 1).padStart(3, "0")}`, ...form, status: "draft", used: 0 }]);
        setModal(false);
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" onClick={openNew} style={{ background: "linear-gradient(135deg,#ec4899,#f97316)" }}>+ Pro모션 Create</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
                {promos.map(p => (
                    <div key={p.id} className="card card-glass" style={{ borderTop: `3px solid ${PROMO_STATUS[p.status] || "#4f8ef7"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <Badge color={PROMO_STATUS[p.status] || "#4f8ef7"}>{p.status === "active" ? "● In Progressin progress" : p.status === "ended" ? "End" : "초안"}</Badge>
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-3)" }}>{p.id}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>{p.type} · {p.value}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                            {[["Period", `${p.startDate} ~ ${p.endDate}`], ["Channel", p.channels.map(c => ch(c).icon).join(" ")],
                            ["사용Count", `${p.used.toLocaleString()}건`], ["Budget", `${p.budget.toLocaleString()}건`],
                            ].map(([l, v]) => (
                                <div key={l} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(9,15,30,0.6)" }}>
                                    <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
                                    <div style={{ fontSize: 11, marginTop: 2 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                        {p.budget > 0 && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                                    <div style={{ width: `${Math.min(100, (p.used / p.budget) * 100)}%`, height: "100%", background: PROMO_STATUS[p.status], borderRadius: 4 }} />
                                </div>
                                <div style={{ fontSize: 9, color: "var(--text-3)", textAlign: "right", marginTop: 3 }}>Coupon 소진 {Math.round((p.used / p.budget) * 100)}%</div>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-ghost" style={{ flex: 1, fontSize: 10, padding: "5px 0" }}>Edit</button>
                            {p.status === "draft" && <button className="btn-primary" style={{ flex: 1, fontSize: 10, padding: "5px 0" }}
                                onClick={() => setPromos(ps => ps.map(q => q.id === p.id ? { ...q, status: "active" } : q))}>Activate</button>}
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <Modal title="새 Pro모션 Create" onClose={() => setModal(false)}>
                    <div style={{ display: "grid", gap: 12 }}>
                        <div><label className="input-label">Pro모션 Name</label><input className="input" value={form.name} onChange={e => upd("name", e.target.value)} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div><label className="input-label">Type</label>
                                <select className="input" value={form.type} onChange={e => upd("type", e.target.value)}>
                                    {PROMO_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div><label className="input-label">할인Value</label><input className="input" value={form.value} onChange={e => upd("value", e.target.value)} placeholder="15% 또는 5000원" /></div>
                            <div><label className="input-label">Coupon Code</label><input className="input" value={form.code} onChange={e => upd("code", e.target.value)} placeholder="SPRING2026" /></div>
                            <div><label className="input-label">Max Issue Count</label><input className="input" type="number" value={form.maxUse} onChange={e => upd("maxUse", e.target.value)} /></div>
                            <div><label className="input-label">Start일</label><input className="input" type="date" value={form.startDate} onChange={e => upd("startDate", e.target.value)} /></div>
                            <div><label className="input-label">End Date</label><input className="input" type="date" value={form.endDate} onChange={e => upd("endDate", e.target.value)} /></div>
                        </div>
                        <div><label className="input-label">대상 Channel</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                                {CH.map(c => <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer" }}>
                                    <input type="checkbox" defaultChecked={form.channels?.includes(c.id)} />
                                    {c.icon} {c.name}
                                </label>)}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={create}>Pro모션 Create</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 4: 인플루언서 Campaign
═══════════════════════════════════════════════════════════════ */
const CAMPAIGN_STAGES = ["오퍼", "계약", "e-Sign", "콘텐츠 Approval", "게시 Done", "정산"];
const MOCK_INFLUENCERS = [
    { id: "INF-001", handle: "@tech_unboxing_kr", name: "테크 언박싱", followers: 89000, platform: "youtube", tier: "Micro", rate: 350000, stage: 3, contractSigned: true, contentUrl: "https://youtube.com/watch?v=demo1" },
    { id: "INF-002", handle: "@daily_gadget_life", name: "데일리 가젯", followers: 234000, platform: "instagram", tier: "Mid", rate: 800000, stage: 1, contractSigned: false, contentUrl: null },
    { id: "INF-003", handle: "@tiktok_techvibe", name: "테크바이브", followers: 560000, platform: "tiktok", tier: "Macro", rate: 2000000, stage: 5, contractSigned: true, contentUrl: "https://tiktok.com/@demo" },
    { id: "INF-004", handle: "@camgear_review", name: "캠기어 리뷰", followers: 45000, platform: "youtube", tier: "Nano", rate: 150000, stage: 0, contractSigned: false, contentUrl: null },
];

const TIER_COLOR = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
const PLATFORM_ICO = { youtube: "▶", instagram: "📷", tiktok: "🎵" };

function InfluencerTab() {
    const [campaigns, setCampaigns] = useState(MOCK_INFLUENCERS);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);

    const advance = id => setCampaigns(cs => cs.map(c => c.id === id && c.stage < 5 ? { ...c, stage: c.stage + 1, contractSigned: c.stage >= 1 ? true : c.contractSigned } : c));
    const sign = id => setCampaigns(cs => cs.map(c => c.id === id ? { ...c, contractSigned: true } : c));
    const settle = c => { setSelected(c); setModal("settle"); };

    const totalBudget = campaigns.reduce((s, c) => s + c.rate, 0);
    const completedPct = Math.round(campaigns.filter(c => c.stage >= 4).length / campaigns.length * 100);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                    ["인플루언서", campaigns.length, "#4f8ef7"],
                    ["계약 Done", campaigns.filter(c => c.contractSigned).length, "#22c55e"],
                    ["콘텐츠 Approval", campaigns.filter(c => c.stage >= 3).length, "#a855f7"],
                    ["Total 계약금", fmtW(totalBudget), "#f97316"],
                ].map(([l, v, c]) => (
                    <div key={l} className="kpi-card" style={{ "--accent": c, padding: "12px 14px" }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 18 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Cards */}
            <div style={{ display: "grid", gap: 14 }}>
                {campaigns.map(c => (
                    <div key={c.id} className="card card-glass" style={{ borderLeft: `3px solid ${TIER_COLOR[c.tier]}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(79,142,247,0.2),rgba(168,85,247,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                                    {PLATFORM_ICO[c.platform]}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 13 }}>{c.name}</div>
                                    <div style={{ fontSize: 11, color: "#4f8ef7" }}>{c.handle}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                        팔로워 {(c.followers / 1000).toFixed(0)}K · <Badge color={TIER_COLOR[c.tier]}>{c.tier}</Badge>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 800, fontSize: 16, color: "#f97316" }}>{fmtW(c.rate)}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>계약금</div>
                            </div>
                        </div>

                        {/* Stage pipeline */}
                        <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 10, overflow: "hidden" }}>
                            {CAMPAIGN_STAGES.map((s, i) => (
                                <div key={s} style={{
                                    flex: 1, padding: "6px 2px", textAlign: "center", fontSize: 9, fontWeight: 700,
                                    background: i < c.stage ? "#22c55e18" : i === c.stage ? "rgba(79,142,247,0.15)" : "rgba(9,15,30,0.6)",
                                    color: i < c.stage ? "#22c55e" : i === c.stage ? "#4f8ef7" : "var(--text-3)",
                                    borderRight: i < CAMPAIGN_STAGES.length - 1 ? "1px solid rgba(99,140,255,0.1)" : "none",
                                    position: "relative",
                                }}>
                                    {i < c.stage && <span style={{ fontSize: 8 }}>✓ </span>}{s}
                                    {i === c.stage && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#4f8ef7" }} />}
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {!c.contractSigned && c.stage >= 1 && (
                                <button className="btn-primary" style={{ fontSize: 10, padding: "5px 12px", background: "linear-gradient(135deg,#22c55e,#14d9b0)" }}
                                    onClick={() => sign(c.id)}>✍ e-Sign 요청</button>
                            )}
                            {c.contractSigned && c.stage < 5 && (
                                <button className="btn-primary" style={{ fontSize: 10, padding: "5px 12px" }}
                                    onClick={() => advance(c.id)}>
                                    {c.stage === 2 ? "콘텐츠 제출 Confirm" : c.stage === 3 ? "콘텐츠 Approval" : c.stage === 4 ? "게시 Done 처리" : "Next 단계 →"}
                                </button>
                            )}
                            {c.stage === 5 && <button className="btn-primary" style={{ fontSize: 10, padding: "5px 12px", background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                                onClick={() => settle(c)}>💰 정산 처리</button>}
                            {c.contentUrl && <a href={c.contentUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 10, padding: "5px 12px" }}>📎 콘텐츠 보기</a>}
                            {!c.contractSigned && (
                                <button className="btn-ghost" style={{ fontSize: 10, padding: "5px 12px" }} onClick={() => advance(c.id)}>오퍼 Send →</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {modal === "settle" && selected && (
                <Modal title={`정산 처리 — ${selected.name}`} onClose={() => setModal(null)}>
                    <div style={{ display: "grid", gap: 12 }}>
                        {[["인플루언서", selected.handle], ["Platform", selected.platform], ["팔로워", (selected.followers / 1000).toFixed(0) + "K"], ["계약금", fmtW(selected.rate)], ["공제액", fmtW(Math.round(selected.rate * 0.033)) + "(3.3% 사업소득세)"], ["실지급", fmtW(selected.rate - Math.round(selected.rate * 0.033))]].map(([l, v]) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                                <span style={{ color: "var(--text-3)" }}>{l}</span><span style={{ fontWeight: 700 }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                                onClick={() => { setCampaigns(cs => cs.map(c => c.id === selected.id ? { ...c, stage: 6 } : c)); setModal(null); }}>
                                정산 Done 처리
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const TABS = [
    { id: "products", label: "📦 Product Management", desc: "Register·Edit·Stop·Price·Stock·Pro모션" },
    { id: "campaigns", label: "📣 Ad Campaign", desc: "Create·소재·Budget·입찰" },
    { id: "promotions", label: "🎁 Coupon/딜/Pro모션", desc: "Coupon Create·딜 Management" },
    { id: "influencer", label: "🤝 인플루언서", desc: "오퍼·계약·e-Sign·정산" },
];

export default function OperationsHub() {
  const t = useT();
    const [tab, setTab] = useState("products");
    const cur = TABS.find(t => t.id === tab);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.08),rgba(168,85,247,0.06))", borderColor: "rgba(249,115,22,0.15)" }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.25),rgba(168,85,247,0.15))" }}>⚡</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#f97316,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Operations Hub
                        </div>
                        <div className="hero-desc">
                            Product Register·Price Change · Ad Campaign 운영 · Coupon/Pro모션 · 인플루언서 계약·정산을 한 Screen에서 Run합니다.
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab nav */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "16px 14px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? "rgba(249,115,22,0.1)" : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? "#f97316" : "transparent"}`,
                            transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="card card-glass fade-up fade-up-2">
                {tab === "products" && <ProductTab />}
                {tab === "campaigns" && <CampaignTab />}
                {tab === "promotions" && <PromoTab />}
                {tab === "influencer" && <InfluencerTab />}
            </div>
        </div>
    );
}
