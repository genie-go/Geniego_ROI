import React, { useState, useMemo, useCallback, useEffect } from "react";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import MediaEditor from '../components/MediaEditor.jsx';
import { ImgCreativeEditor } from './ImgCreativeEditor.jsx';
import { ResultSection } from './ResultSection.jsx';
import { CAT_OPTIONS, PRODUCT_CATALOG, CAT_TO_PRODUCT } from './campaignConstants.js';
import { useI18n } from '../i18n/index.js';

const CHANNEL_COLORS = {
    google_search: '#34A853', naver_search: '#03c75a', meta: '#1877f2',
    instagram: '#E1306C', tiktok: '#EE1D52', youtube: '#FF0000',
    kakao: '#fbbf24', blog: '#22c55e', default: '#6366f1',
};
const CHANNEL_ICONS = {
    google_search: '🔍', naver_search: '🟢', meta: '📘',
    instagram: '📸', tiktok: '🎵', youtube: '▶', kakao: '💛', blog: '📝',
};

/* SVG → PNG Download Utils */
function downloadSvg(svgEl, filename) {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
        canvas.width = svgEl.getAttribute('width') * 3;
        canvas.height = svgEl.getAttribute('height') * 3;
        const ctx = canvas.getContext('2d');
        ctx.scale(3, 3);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.download = filename;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };
    img.src = url;
}

/* Channelper Ads Image SVG (소형 Card용) */
function AdMockup({ chId, headline, copy, color, size }) {
    const W = size === 'story' ? 110 : size === 'banner' ? 190 : 140;
    const H = size === 'story' ? 185 : size === 'banner' ? 55 : 140;
    const gc = color || '#4f8ef7';
    return (
        <svg width={W} height={H} style={{ borderRadius: 10, flexShrink: 0, display: 'block', overflow: 'hidden' }}>
            <defs>
                <linearGradient id={`gm${chId}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={gc} stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.96" />
                </linearGradient>
            </defs>
            <rect width={W} height={H} fill={`url(#gm${chId})`} />
            <circle cx={W * 0.82} cy={H * 0.18} r={H * 0.38} fill="rgba(255,255,255,0.05)" />
            <circle cx={W * 0.08} cy={H * 0.88} r={H * 0.28} fill="rgba(255,255,255,0.04)" />
            <rect x="8" y="7" width={Math.min(55, W - 16)} height="15" rx="7" fill="rgba(255,255,255,0.18)" />
            <text x="13" y="19" fontSize="7" fill="white" fontFamily="sans-serif" fontWeight="bold">{(chId || '').replace(/_/g, ' ').slice(0, 9)}</text>
            {size === 'banner' ? (
                <>
                    <text x="9" y={H * 0.53} fontSize="9" fill="white" fontFamily="sans-serif" fontWeight="900">{(headline || '').slice(0, 17)}</text>
                    <rect x={W - 54} y={(H - 17) / 2} width="48" height="17" rx="8" fill="rgba(255,255,255,0.2)" />
                    <text x={W - 30} y={(H - 17) / 2 + 11} fontSize="7" fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="700">Apply Now</text>
                </>
            ) : (
                <>
                    <text x={W / 2} y={H * 0.47} fontSize="10" fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="900">{(headline || '').slice(0, 10)}</text>
                    <text x={W / 2} y={H * 0.61} fontSize="7" fill="rgba(255,255,255,0.78)" textAnchor="middle" fontFamily="sans-serif">{(copy || '').slice(0, 15)}</text>
                    <rect x={W / 2 - 28} y={H - 28} width="56" height="16" rx="8" fill="rgba(255,255,255,0.22)" />
                    <text x={W / 2} y={H - 18} fontSize="7" fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="700">Learn More</text>
                </>
            )}
        </svg>
    );
}

/* Ads Image 소재 Text 편집기 */



function BudgetPanel({ result, customBudget, setCustomBudget, budgetEditing, setBudgetEditing, budgetInputVal, setBudgetInputVal }) {
    const aiMonthly = result.total_monthly_budget
        || parseInt((result.monthly_budget || '').replace(/[^0-9]/g, '')) || 0;
    const activeBudget = customBudget !== null ? customBudget : aiMonthly;
    const annualBudget = activeBudget * 12;
    const fmtWon = (n) => n >= 10000 ? '\u20a9' + Math.round(n / 10000).toLocaleString() + '\ub9cc' : '\u20a9' + n.toLocaleString();
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#4f8ef70f', border: budgetEditing ? '1.5px solid #4f8ef7' : '1px solid #4f8ef722', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => { if (!budgetEditing) { setBudgetEditing(true); setBudgetInputVal(String(activeBudget)); } }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    Monthly Recommended Budget <span style={{ fontSize: 8, color: '#4f8ef7' }}>✏️ Edit</span>
                </div>
                {budgetEditing ? (
                    <input autoFocus type="number" value={budgetInputVal}
                        onChange={e => setBudgetInputVal(e.target.value)}
                        onBlur={() => { const v = parseInt(budgetInputVal.replace(/[^0-9]/g, '')); if (!isNaN(v) && v > 0) setCustomBudget(v); setBudgetEditing(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setBudgetEditing(false); setBudgetInputVal(''); } }}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: 14, fontWeight: 900, color: '#4f8ef7', appearance: 'textfield' }}
                    />
                ) : (
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#4f8ef7' }}>{fmtWon(activeBudget)}</div>
                )}
                {customBudget !== null && (
                    <div style={{ fontSize: 8, color: '#fbbf24', marginTop: 2 }}>
                        Original: {result.monthly_budget}
                        <span style={{ marginLeft: 6, cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={e => { e.stopPropagation(); setCustomBudget(null); }}>Reset</span>
                    </div>
                )}
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#22c55e0f', border: '1px solid #22c55e22', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    Annual Recommended Budget <span style={{ fontSize: 8, color: '#22c55e' }}>&times;12 \uc790\ub3d9</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>{fmtWon(annualBudget)}</div>
                {customBudget !== null && (
                    <div style={{ fontSize: 8, color: '#fbbf24', marginTop: 2 }}>Original: {result.annual_budget}</div>
                )}
            </div>
            {result.expected_roas && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f973160f', border: '1px solid #f9731622', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>Expected ROAS</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#f97316' }}>{result.expected_roas}</div>
                </div>
            )}
        </div>
    );
}



function ChannelBarCard({ ch, colors, icons }) {
    const color = colors[ch.channel_id] || colors.default;
    const icon = icons[ch.channel_id] || '\uD83D\uDCE3';
    return (
        <div key={ch.channel_id} style={{ marginBottom: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color, fontWeight: 700 }}>{icon} #{ch._idx + 1} {ch.channel_name}</span>
                <span style={{ color: 'var(--text-2)' }}>
                    {'Monthly'} \u20a9{(ch.monthly_budget || 0).toLocaleString()} ({ch.budget_pct}%)
                    {ch.effectiveness_score ? ` · Effectiveness ${ch.effectiveness_score}pts` : ''}
                </span>
            </div>
            {ch.effectiveness_score && (
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 3 }}>
                    <div style={{ width: ch.effectiveness_score + '%', height: '100%', background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: 3, transition: 'width 0.7s' }} />
                </div>
            )}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
                <div style={{ width: (ch.budget_pct || 0) + '%', height: '100%', background: color + '55', borderRadius: 3, transition: 'width 0.8s' }} />
            </div>
        </div>
    );
}

function ChannelAdCard({ ch, cr, color, icon, catLabel, regenLoad, onRegen, onDownload, onUpdate }) {
    const size = ch.channel_id === 'youtube' ? 'banner'
        : (ch.channel_id === 'instagram' || ch.channel_id === 'tiktok') ? 'story' : 'feed';
    const W = size === 'story' ? 200 : size === 'banner' ? 420 : 300;
    const H = size === 'story' ? 340 : size === 'banner' ? 100 : 300;
    const svgId = 'adsvg_' + ch.channel_id;
    return (
        <div key={ch.channel_id} className="card card-glass" style={{ padding: 18, border: `1px solid ${color}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color }}>{ch.channel_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{cr.format || ch.ad_type} \u00b7 {cr.spec || ''}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onRegen(ch.channel_id)} disabled={regenLoad === ch.channel_id}
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${color}44`, background: color + '18', color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        {regenLoad === ch.channel_id ? '\u23F3' : '🔄 Regenerate'}
                    </button>
                    <button onClick={() => onDownload(svgId, ch.channel_name)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${color}44`, background: 'transparent', color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        ⬇ Save PNG
                    </button>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <svg id={svgId} width={W} height={H}
                    style={{ borderRadius: 14, flexShrink: 0, display: 'block', overflow: 'hidden', boxShadow: `0 8px 32px ${color}30` }}>
                    <defs>
                        <linearGradient id={'lg_' + ch.channel_id} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                            <stop offset="60%" stopColor={color} stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#0a0f1e" stopOpacity="0.98" />
                        </linearGradient>
                        <linearGradient id={'lg2_' + ch.channel_id} x1="0" y1="1" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
                        </linearGradient>
                    </defs>
                    <rect width={W} height={H} fill={'url(#lg_' + ch.channel_id + ')'} />
                    <rect width={W} height={H} fill={'url(#lg2_' + ch.channel_id + ')'} />
                    <circle cx={W * 0.85} cy={H * 0.15} r={H * 0.35} fill="rgba(255,255,255,0.06)" />
                    <circle cx={W * 0.1} cy={H * 0.9} r={H * 0.25} fill="rgba(255,255,255,0.04)" />
                    <circle cx={W * 0.5} cy={H * 0.5} r={H * 0.45} fill="rgba(255,255,255,0.02)" />
                    <rect x="16" y="14" width={Math.min(W * 0.5, 160)} height="24" rx="12" fill="rgba(255,255,255,0.18)" />
                    <text x="26" y="30" fontSize={size === 'banner' ? 10 : 12} fill="white" fontFamily="sans-serif" fontWeight="700">{catLabel || '\uBC30\uC1A1\uB300\uD589'}</text>
                    {size === 'banner' ? (
                        <>
                            <text x="16" y={H * 0.55} fontSize="16" fill="white" fontFamily="sans-serif" fontWeight="900">{(cr.headline || ch.channel_name + ' \uAD11\uACE0').slice(0, 22)}</text>
                            <text x="16" y={H * 0.75} fontSize="11" fill="rgba(255,255,255,0.8)" fontFamily="sans-serif">{(cr.copy || '').slice(0, 30)}</text>
                            <rect x={W - 100} y={(H - 30) / 2} width="90" height="30" rx="15" fill="rgba(255,255,255,0.25)" />
                            <text x={W - 55} y={(H - 30) / 2 + 19} fontSize="12" fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="800">{cr.cta || 'Start Now'}</text>
                        </>
                    ) : (
                        <>
                            <text x={W / 2} y={H * 0.42} fontSize={size === 'story' ? 17 : 20} fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="900">{(cr.headline || '').slice(0, 14)}</text>
                            <text x={W / 2} y={H * 0.53} fontSize={size === 'story' ? 13 : 15} fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="900">{(cr.headline || '').slice(14, 26)}</text>
                            <text x={W / 2} y={H * 0.64} fontSize={size === 'story' ? 10 : 12} fill="rgba(255,255,255,0.82)" textAnchor="middle" fontFamily="sans-serif">{(cr.copy || '').slice(0, 20)}</text>
                            <text x={W / 2} y={H * 0.72} fontSize={size === 'story' ? 10 : 12} fill="rgba(255,255,255,0.7)" textAnchor="middle" fontFamily="sans-serif">{(cr.copy || '').slice(20, 38)}</text>
                            <rect x={W / 2 - 55} y={H - 50} width="110" height="34" rx="17" fill="rgba(255,255,255,0.28)" />
                            <text x={W / 2} y={H - 28} fontSize="13" fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="800">{cr.cta || 'Apply Now'}</text>
                        </>
                    )}
                </svg>
                <div style={{ flex: 1, minWidth: 180 }}>
                    <ImgCreativeEditor chId={ch.channel_id} cr={cr} color={color}
                        onUpdate={(u) => onUpdate(ch.channel_id, u)} />
                    {cr.tips && (
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: color + '0f', border: `1px solid ${color}22`, fontSize: 10, color: 'var(--text-2)', lineHeight: 1.6 }}>
                            💡 Tip: {cr.tips}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AIRecommendTab() {
    const [catId, setCatId] = useState('beauty');
    const { t } = useI18n();
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const [creatives, setCreatives] = useState({});
    const [imgStatus, setImgStatus] = useState('idle');
    const [regenLoad, setRegenLoad] = useState(null);
    const [approved, setApproved] = useState({});
    const [executing, setExecuting] = useState({});
    const [executed, setExecuted] = useState({});
    const [activeTab, setActiveTab] = useState('channels');
    const [customReq, setCustomReq] = useState({});
    const [searchQ, setSearchQ] = useState('');
    const [showApproveAllBanner, setShowApproveAllBanner] = useState(false);
    const [dataSource, setDataSource] = useState(''); // 'ai' | 'fallback'
    const [dataModel, setDataModel] = useState('');
    const [customBudget, setCustomBudget] = useState(null);
    const [budgetEditing, setBudgetEditing] = useState(false);
    const [budgetInputVal, setBudgetInputVal] = useState('');
    const [imgSubTab, setImgSubTab] = useState('ai'); // 'ai' | 'upload'
    const [uploadChannelId, setUploadChannelId] = useState(''); // Upload Tab에서 Select한 Channel

    // ── Product Info 입력 Status ──
    const [productInfo, setProductInfo] = useState({
        skuCount: '', monthlyQty: '', avgPrice: '', marginRate: '',
        targetRevenue: '', period: 'monthly',
        salesChannels: [],
    });
    const [productInfoEdited, setProductInfoEdited] = useState(false);

    const cat = CAT_OPTIONS.find(c => c.id === catId) || CAT_OPTIONS[0];
    const isForwardingType = catId === 'forwarding' || catId === 'purchasing';

    // ── Product Register 현황에서 Categoryper Aggregate ──
    const catalogStats = useMemo(() => {
        const pCats = CAT_TO_PRODUCT[catId] || [];
        if (!pCats.length) return null;
        const matched = PRODUCT_CATALOG.filter(p => pCats.includes(p.category));
        if (!matched.length) return null;
        const totalSku = matched.length;
        const avgPrice = Math.round(matched.reduce((s, p) => s + p.price, 0) / totalSku);
        const avgCost = Math.round(matched.reduce((s, p) => s + p.productCost, 0) / totalSku);
        const avgMargin = Math.round(((avgPrice - avgCost) / avgPrice) * 100);
        const totalQty = matched.reduce((s, p) => s + (p.monthlySales || 0), 0);
        const totalInv = matched.reduce((s, p) => s + p.inventory, 0);
        const topProds = [...matched].sort((a, b) => b.monthlySales - a.monthlySales).slice(0, 3);
        return { totalSku, avgPrice, avgCost, avgMargin, totalQty, totalInv, topProds, matched };
    }, [catId]);

    // Category 바뀌면 Product Info Auto ForecastValue으로 Reset
    useEffect(() => {
        if (!catalogStats || productInfoEdited) return;
        setProductInfo(prev => ({
            ...prev,
            skuCount: String(catalogStats.totalSku),
            monthlyQty: String(catalogStats.totalQty),
            avgPrice: String(catalogStats.avgPrice),
            marginRate: String(catalogStats.avgMargin),
            targetRevenue: String(Math.round(catalogStats.avgPrice * catalogStats.totalQty * 0.8 / 10000) * 10000),
        }));
    }, [catId, catalogStats]);

    const setProd = (k, v) => { setProductInfo(prev => ({ ...prev, [k]: v })); setProductInfoEdited(true); };
    const toggleSalesCh = (ch) => setProductInfo(prev => ({
        ...prev,
        salesChannels: prev.salesChannels.includes(ch)
            ? prev.salesChannels.filter(c => c !== ch)
            : [...prev.salesChannels, ch]
    }));

    const SUGGESTIONS = cat.suggestions || [
        `${cat.label} Ads Marketing Recommend`, `${cat.label} per-channel budget allocation`,
        `${cat.label} SNS ads strategy`, `${cat.label} maximize ad efficiency`,
    ];

    const runSearch = useCallback(async (q) => {
        const query = q || (isForwardingType ? `${cat.label} Ads Marketing Channel Recommend` :
            `${cat.label} 판매 Product ${productInfo.skuCount || catalogStats?.totalSku || ''}개 SKU 기준 Marketing Channel 및 Budget Recommend`);
        setStatus('loading'); setResult(null); setCreatives({}); setImgStatus('idle');
        try {
            const payload = {
                query,
                service_type: cat.label,
                service_route: cat.route,
                category_id: catId,
            };
            if (!isForwardingType) {
                payload.products = {
                    sku_count: parseInt(productInfo.skuCount) || catalogStats?.totalSku || 0,
                    monthly_qty: parseInt(productInfo.monthlyQty) || catalogStats?.totalQty || 0,
                    avg_price: parseInt(productInfo.avgPrice) || catalogStats?.avgPrice || 0,
                    margin_rate: parseInt(productInfo.marginRate) || catalogStats?.avgMargin || 0,
                    target_revenue: parseInt(productInfo.targetRevenue) || 0,
                    period: productInfo.period,
                    sales_channels: productInfo.salesChannels,
                    top_products: catalogStats?.topProds?.map(p => ({ name: p.name, sku: p.sku, price: p.price, monthly_sales: p.monthlySales })) || [],
                    data_source: productInfoEdited ? 'user_input' : 'catalog_auto',
                };
            }
            const res = await fetch(`${API}/v422/ai/campaign-search`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ data: payload }),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || 'AI Analysis Failed');
            setResult(data.result);
            setDataSource(data.data_source || 'ai');
            setDataModel(data.model || '');
            setStatus('done');
            genCreatives(data.result.channels || [], query);
        } catch (e) {
            setStatus('error');
            setResult({ error: e.message });
        }
    }, [catId, cat, productInfo, catalogStats, isForwardingType, productInfoEdited]);

    const genCreatives = useCallback(async (channels, kw, customRequest) => {
        if (!channels.length) return;
        setImgStatus('loading');
        try {
            const res = await fetch(`${API}/v422/ai/campaign-ad-creative`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({
                    data: {
                        service_type: cat.label, service_route: cat.route,
                        keyword: kw,
                        channels: channels.map(c => ({ id: c.channel_id, name: c.channel_name, ad_type: c.ad_type })),
                        custom_request: customRequest || '',
                    }
                }),
            });
            const data = await res.json();
            if (data.ok && data.result?.creatives) {
                const m = {};
                data.result.creatives.forEach(c => { m[c.channel_id] = c; });
                setCreatives(m);
            }
        } catch { /* silent */ }
        setImgStatus('done');
    }, [cat]);

    const regenImage = useCallback(async (chId) => {
        if (!result) return;
        setRegenLoad(chId);
        const ch = result.channels?.find(c => c.channel_id === chId);
        try {
            const res = await fetch(`${API}/v422/ai/campaign-ad-creative`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({
                    data: {
                        service_type: cat.label, service_route: cat.route,
                        keyword: cat.label, regenerate: true,
                        channels: [{ id: chId, name: ch?.channel_name, ad_type: ch?.ad_type }],
                        custom_request: customReq[chId] || '',
                    }
                }),
            });
            const data = await res.json();
            if (data.ok && data.result?.creatives?.[0]) {
                setCreatives(prev => ({ ...prev, [chId]: data.result.creatives[0] }));
            }
        } catch { /* silent */ }
        setRegenLoad(null);
    }, [cat, result, customReq]);

    const handleApprove = (chId) => {
        setApproved(prev => {
            const next = { ...prev, [chId]: !prev[chId] };
            const totalCh = (result?.channels || []).length;
            const approvedCnt = Object.values(next).filter(Boolean).length;
            if (totalCh > 0 && approvedCnt === totalCh) setShowApproveAllBanner(true);
            return next;
        });
    };
    const handleApproveAndMove = () => {
        const a = {};
        (result?.channels || []).forEach(c => { a[c.channel_id] = true; });
        setApproved(a);
        setActiveTab('images');
        if (imgStatus === 'idle') genCreatives(result?.channels || [], cat.label);
    };
    const handleExecute = async (ch) => {
        setExecuting(prev => ({ ...prev, [ch.channel_id]: true }));
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        setExecuting(prev => ({ ...prev, [ch.channel_id]: false }));
        setExecuted(prev => ({ ...prev, [ch.channel_id]: true }));
    };
    const handleExecuteAll = async () => {
        for (const ch of (result?.channels || []).filter(c => approved[c.channel_id])) {
            if (!executed[ch.channel_id]) await handleExecute(ch);
        }
    };
    const approvedCount = Object.values(approved).filter(Boolean).length;

    // Upload Tab: Select된 Channel Info
    const uploadCh = result?.channels?.find(c => c.channel_id === uploadChannelId)
        || result?.channels?.[0];
    const uploadChColor = CHANNEL_COLORS[uploadCh?.channel_id] || cat?.color || '#6366f1';
    const uploadCreative = uploadCh ? creatives[uploadCh.channel_id] : null;
    const aiTabDisplay = imgSubTab === 'ai' ? 'grid' : 'none';
    const mkUpdater = (chId, u, setter) => setter(p => { const n = Object.assign({}, p); n[chId] = Object.assign({}, p[chId], u); return n; });


    const handleDownload = (svgId, chName) => { const el = document.getElementById(svgId); if (el) downloadSvg(el, chName + "_ad_image.png"); };
    const handleApproveAll = () => { const a = {}; (result.channels || []).forEach(c => { a[c.channel_id] = true; }); setApproved(a); setShowApproveAllBanner(true); };


    return (
        <div style={{ display: 'grid', gap: 16 }}>

            {/* ── Header 타이틀 ── */}
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>
                    🤖 AI Marketing Recommend & Automation Engine
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Claude AI analyzes optimal Channels, Budgets, and Ad creatives in one search</div>
            </div>

            {/* ── Category 칩 ── */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {CAT_OPTIONS.map(c => (
                    <button key={c.id} onClick={() => { setCatId(c.id); setResult(null); setStatus('idle'); setShowApproveAllBanner(false); setApproved({}); }}
                        style={{
                            padding: '6px 18px', borderRadius: 99, border: `2px solid ${catId === c.id ? c.color : 'rgba(120,130,200,0.18)'}`,
                            background: catId === c.id ? c.color + '15' : 'transparent',
                            color: catId === c.id ? c.color : 'var(--text-3)', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.17s'
                        }}>
                        {c.label} <span style={{ fontSize: 9, opacity: 0.7 }}>({c.route})</span>
                    </button>
                ))}
            </div>

            {/* ── Product Info 입력 Panel (배송/구매대행 제외) ── */}
            {!isForwardingType && (
                <div className="card card-glass" style={{ padding: '14px 18px', border: `1px solid ${cat.color}22` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: cat.color }}>{t('aiRec.salesInfo')}</div>
                        {catalogStats && !productInfoEdited && (
                            <div style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: cat.color + '18', color: cat.color, border: `1px solid ${cat.color}33` }}>
                                {t('aiRec.catalogAuto')}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                        {[[t('aiRec.skuCount'), 'skuCount', 'units'], [t('aiRec.monthlyQty'), 'monthlyQty', 'units'], [t('aiRec.avgPrice'), 'avgPrice', '₩'], [t('aiRec.marginRate'), 'marginRate', '%'], [t('aiRec.goalRevenue'), 'targetRevenue', '₩']].map(([lbl, key, unit]) => (
                            <div key={key}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3 }}>{lbl}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input type="number" value={productInfo[key]} onChange={e => setProd(key, e.target.value)}
                                        style={{ flex: 1, background: 'rgba(0,0,0,0.35)', border: `1px solid ${cat.color}33`, borderRadius: 7, color: '#e2e8f0', padding: '5px 8px', fontSize: 11 }} />
                                    <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{unit}</span>
                                </div>
                            </div>
                        ))}
                        <div>
                            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3 }}>Period</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[['monthly', 'Monthly'], ['annual', 'Annual']].map(([v, l]) => (
                                    <button key={v} onClick={() => setProd('period', v)}
                                        style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${productInfo.period === v ? cat.color : 'rgba(120,130,200,0.2)'}`, background: productInfo.period === v ? cat.color + '18' : 'transparent', color: productInfo.period === v ? cat.color : 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 5 }}>{t('aiRec.mainChannels')}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {['Naver Shopping', 'Coupang', 'Own Mall', '11Street', 'Gmarket', 'Kakao Shopping', 'Amazon', 'Rakuten'].map(ch => (
                                <button key={ch} onClick={() => toggleSalesCh(ch)}
                                    style={{ padding: '3px 10px', borderRadius: 99, border: `1px solid ${productInfo.salesChannels.includes(ch) ? cat.color : 'rgba(120,130,200,0.18)'}`, background: productInfo.salesChannels.includes(ch) ? cat.color + '18' : 'transparent', color: productInfo.salesChannels.includes(ch) ? cat.color : 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>
                                    {ch}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Search 바 ── */}
            <div style={{ position: 'relative' }}>
                <input
                    value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder={`e.g. "${SUGGESTIONS[0]}" or enter your marketing goal`}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '14px 120px 14px 18px', borderRadius: 14,
                        border: `2px solid ${cat.color}44`,
                        background: 'rgba(0,0,0,0.35)', color: '#e2e8f0',
                        fontSize: 13, outline: 'none',
                        boxShadow: `0 0 0 0 ${cat.color}`,
                        transition: 'border 0.2s',
                    }}
                />
                <button onClick={() => runSearch()} disabled={status === 'loading' || !searchQ.trim()}
                    style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: status === 'loading' ? 'rgba(99,102,241,0.4)' : `linear-gradient(135deg,${cat.color},#6366f1)`,
                        color: '#fff', fontWeight: 800, fontSize: 12, transition: 'all 0.2s',
                    }}>
                    {status === 'loading' ? '⏳' : '🔍 AI Analysis'}
                </button>
            </div>

            {/* Recommend Search어 */}
            {status === 'idle' && (
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 2 }}>Recommend:</span>
                    {SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => runSearch(s)}
                            style={{ padding: '3px 11px', borderRadius: 99, border: '1px solid rgba(120,140,200,0.2)', background: 'rgba(99,102,241,0.06)', color: 'var(--text-2)', fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading */}
            {status === 'loading' && (
                <div style={{ padding: '44px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 38, marginBottom: 12 }}>🤖</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 5 }}>AI Marketing Analysis in progress...</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>"{searchQ}" — {cat.label} 최적 Channel·Budget·소재를 Analysis합니다</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', opacity: 0.7 }}>Claude AI → Expert knowledge base: gathering optimal data</div>
                </div>
            )}

            {/* 에러 */}
            {status === 'error' && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 12 }}>
                    ❌ {result?.error}
                </div>
            )}

            {/* ── 결과 ── */}
            {status === 'done' && result && (
                <ResultSection
                    result={result} dataSource={dataSource} dataModel={dataModel}
                    searchQ={searchQ} cat={cat}
                    customBudget={customBudget} setCustomBudget={setCustomBudget}
                    budgetEditing={budgetEditing} setBudgetEditing={setBudgetEditing}
                    budgetInputVal={budgetInputVal} setBudgetInputVal={setBudgetInputVal}
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    imgStatus={imgStatus} creatives={creatives} setCreatives={setCreatives}
                    approved={approved} executing={executing} executed={executed}
                    handleApprove={handleApprove} handleExecute={handleExecute}
                    handleExecuteAll={handleExecuteAll} approvedCount={approvedCount}
                    regenImage={regenImage} regenLoad={regenLoad}
                    genCreatives={genCreatives}
                    imgSubTab={imgSubTab} setImgSubTab={setImgSubTab}
                    uploadChannelId={uploadChannelId} setUploadChannelId={setUploadChannelId}
                    uploadCh={uploadCh} uploadChColor={uploadChColor}
                    uploadCreative={uploadCreative} aiTabDisplay={aiTabDisplay}
                    mkUpdater={mkUpdater} handleDownload={handleDownload}
                    handleApproveAll={handleApproveAll} showApproveAllBanner={showApproveAllBanner}
                    setShowApproveAllBanner={setShowApproveAllBanner}
                />
            )}

        </div>
    );
}

export { AIRecommendTab, BudgetPanel, ChannelBarCard, ChannelAdCard, CHANNEL_COLORS, CHANNEL_ICONS };
export default AIRecommendTab;
