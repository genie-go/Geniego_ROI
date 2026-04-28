import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../i18n";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/* ─── Security Engine ──────────────────────────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };

function SecurityOverlay({ threats, onDismiss, t }) {
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('reportBuilder.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('reportBuilder.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}… — {th.time}
                </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                    ✕ {t('reportBuilder.dismiss')}
                </button>
            </div>
    </div>
);
}

/* ─── Shared Styles ─── */
const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
const INPUT = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1,#e8eaf0)', fontSize: 12, boxSizing: 'border-box' };
const BTN = (bg, color) => ({ padding: '7px 16px', borderRadius: 8, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' });
const ACCENT = '#4f8ef7';
const GREEN = '#22c55e';
const PIE_COLORS = ['#4f8ef7', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4', '#eab308', '#ec4899'];
const STORAGE_KEY = 'genie_report_builder_layouts';
const SCHEDULE_KEY = 'genie_report_schedules';
const TEMPLATE_KEY = 'genie_report_templates';

/* ─── Widget Templates ──────────────────────────────────── */
const WIDGETS_TEMPLATE = [
    { id: "w_roas_trend", titleKey: 'reportBuilder.widgetRoasTrend', type: "area", dataKey: "roas", color: "#4f8ef7", icon: "📈" },
    { id: "w_clicks_bar", titleKey: 'reportBuilder.widgetDailyClicks', type: "bar", dataKey: "clicks", color: "#22c55e", icon: "🖱" },
    { id: "w_spend_area", titleKey: 'reportBuilder.widgetAdSpend', type: "area", dataKey: "spend", color: "#f97316", icon: "💰" },
    { id: "w_kpi_summary", titleKey: 'reportBuilder.widgetKpiSummary', type: "kpi", dataKey: "summary", icon: "📊" },
    { id: "w_conversion", titleKey: 'reportBuilder.widgetConversion', type: "bar", dataKey: "conversions", color: "#a855f7", icon: "🎯" },
    { id: "w_revenue_trend", titleKey: 'reportBuilder.widgetRevenueTrend', type: "area", dataKey: "revenue", color: "#06b6d4", icon: "💵" },
    { id: "w_channel_pie", titleKey: 'reportBuilder.widgetChannelPie', type: "pie", dataKey: "channel", color: "#eab308", icon: "🍩" },
    { id: "w_fee_compare", titleKey: 'reportBuilder.widgetFeeCompare', type: "bar", dataKey: "fees", color: "#ec4899", icon: "🏷" },
];

/* ─── Report Templates ─── */
function buildTemplates(t) {
    return [
        { id: 'tpl_perf', name: t('reportBuilder.tplPerformance'), desc: t('reportBuilder.tplPerformanceDesc'), widgets: ['w_roas_trend', 'w_clicks_bar', 'w_kpi_summary', 'w_conversion'], icon: '📊' },
        { id: 'tpl_revenue', name: t('reportBuilder.tplRevenue'), desc: t('reportBuilder.tplRevenueDesc'), widgets: ['w_revenue_trend', 'w_spend_area', 'w_channel_pie'], icon: '💰' },
        { id: 'tpl_channel', name: t('reportBuilder.tplChannel'), desc: t('reportBuilder.tplChannelDesc'), widgets: ['w_channel_pie', 'w_fee_compare', 'w_roas_trend'], icon: '📡' },
        { id: 'tpl_executive', name: t('reportBuilder.tplExecutive'), desc: t('reportBuilder.tplExecutiveDesc'), widgets: ['w_kpi_summary', 'w_revenue_trend', 'w_roas_trend', 'w_channel_pie'], icon: '🏢' },
    ];
}

/* ─── Integration Hub Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const channels = [];
        try {
            const keys = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]');
            if (Array.isArray(keys)) keys.forEach(k => { if (k.service) channels.push(k.service.toLowerCase()); });
        } catch { /* ignore */ }
        ['meta', 'google', 'tiktok', 'kakao_moment', 'naver', 'line', 'whatsapp', 'coupang', 'amazon', 'shopify'].forEach(ch => {
            try { if (localStorage.getItem(`geniego_channel_${ch}`)) channels.push(ch); } catch { /* ignore */ }
        });
        return [...new Set(channels)];
    }, []);
}

/* ─── Widget Renderer ─── */
function WidgetRenderer({ widget, t, size = 'M' }) {
    const h = size === 'S' ? 140 : size === 'L' ? 280 : 200;
    if (widget.type === "area") {
        return (
            <ResponsiveContainer width="100%" height={h}>
                <AreaChart data={[]}>
                    <defs><linearGradient id={`c-${widget.uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={widget.color} stopOpacity={0.8} /><stop offset="95%" stopColor={widget.color} stopOpacity={0} />
                    </linearGradient></defs>
                    <XAxis dataKey="name" fontSize={10} stroke="#555" tickLine={false} axisLine={false} />
                    <YAxis fontSize={9} stroke="#555" tickLine={false} axisLine={false} width={35} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey={widget.dataKey} stroke={widget.color} fillOpacity={1} fill={`url(#c-${widget.uid})`} />
                </AreaChart>
            </ResponsiveContainer>
        );
    }
    if (widget.type === "bar") {
        return (
            <ResponsiveContainer width="100%" height={h}>
                <BarChart data={[]}>
                    <XAxis dataKey="name" fontSize={10} stroke="#555" tickLine={false} axisLine={false} />
                    <YAxis fontSize={9} stroke="#555" tickLine={false} axisLine={false} width={35} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey={widget.dataKey} fill={widget.color} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    }
    if (widget.type === "pie") {
        return (
            <ResponsiveContainer width="100%" height={h}>
                <PieChart>
                    <Pie data={[]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label>
                        {[].map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        );
    }
    if (widget.type === "kpi") {
        const kpis = [
            { label: t('reportBuilder.kpiRevenue'), value: '—', color: '#4f8ef7', icon: '💰' },
            { label: t('reportBuilder.kpiRoas'), value: '—', color: '#22c55e', icon: '📈' },
            { label: t('reportBuilder.kpiOrders'), value: '—', color: '#a855f7', icon: '📦' },
            { label: t('reportBuilder.kpiCvr'), value: '—', color: '#f97316', icon: '🎯' },
        ];
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {kpis.map((k, i) => (
                    <div key={i} style={{ background: 'var(--surface)', padding: 16, borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                        <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{k.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</div>
                </div>
                ))}
        </div>
);
    }
    return <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>{t('reportBuilder.noData')}</div>;
}

/* ═══════════ TAB 1: Canvas ═══════════ */
function CanvasTab({ t, safeguard, connectedChannels }) {
    const [canvas, setCanvas] = useState([]);
    const [draggedWidget, setDraggedWidget] = useState(null);
    const [layoutName, setLayoutName] = useState('');
    const [savedLayouts, setSavedLayouts] = useState([]);
    const [dateRange, setDateRange] = useState('7d');
    const [channelFilter, setChannelFilter] = useState('all');
    const [widgetSize, setWidgetSize] = useState('M');
    const WIDGETS = WIDGETS_TEMPLATE.map(w => ({ ...w, title: t(w.titleKey) }));

    useEffect(() => { try { setSavedLayouts(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch {} }, []);

    const handleDragStart = (e, w) => { setDraggedWidget(w); e.dataTransfer.setData("widgetId", w.id); e.dataTransfer.effectAllowed = "copyMove"; };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
    const handleDrop = (e) => {
        e.preventDefault();
        const wid = e.dataTransfer.getData("widgetId");
        const cfg = WIDGETS.find(w => w.id === wid);
        if (cfg) setCanvas(prev => [...prev, { ...cfg, uid: Date.now() + Math.random() }]);
        setDraggedWidget(null);
    };
    const removeWidget = (uid) => setCanvas(prev => prev.filter(w => w.uid !== uid));

    const saveLayout = () => {
        const name = safeguard(layoutName.trim(), 'layoutName');
        if (!name || canvas.length === 0) return;
        const layout = { id: Date.now(), name, widgets: canvas.map(w => ({ id: w.id, titleKey: w.titleKey, type: w.type, dataKey: w.dataKey, color: w.color })), createdAt: new Date().toISOString() };
        const updated = [...savedLayouts, layout];
        setSavedLayouts(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setLayoutName('');
    };
    const loadLayout = (layout) => { setCanvas(layout.widgets.map(w => ({ ...w, uid: Date.now() + Math.random(), title: t(w.titleKey) }))); };
    const deleteLayout = (id) => { const u = savedLayouts.filter(l => l.id !== id); setSavedLayouts(u); localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); };

    const handleExport = (format) => {
        const data = { format, date: new Date().toISOString(), widgets: canvas.map(w => w.title), dateRange, channelFilter };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `report_${Date.now()}.${format === 'excel' ? 'json' : format}`; a.click(); URL.revokeObjectURL(url);
    };

    const DATE_RANGES = [
        { key: 'today', label: t('reportBuilder.dateToday') },
        { key: '7d', label: t('reportBuilder.date7d') },
        { key: '30d', label: t('reportBuilder.date30d') },
        { key: '90d', label: t('reportBuilder.date90d') },
        { key: 'custom', label: t('reportBuilder.dateCustom') },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Toolbar */}
            <div style={{ ...CARD, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Date Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>📅 {t('reportBuilder.dateRange')}:</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                        {DATE_RANGES.map(d => (
                            <button key={d.key} onClick={() => setDateRange(d.key)} style={{
                                padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                borderColor: dateRange === d.key ? ACCENT : 'rgba(255,255,255,0.1)',
                                background: dateRange === d.key ? 'rgba(79,142,247,0.15)' : 'transparent',
                                color: dateRange === d.key ? ACCENT : '#888',
                            }}>{d.label}</button>
                        ))}
                </div>
                {/* Channel Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>📡 {t('reportBuilder.channelFilter')}:</span>
                    <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} style={{ ...INPUT, width: 120, padding: '4px 8px' }}>
                        <option value="all">{t('reportBuilder.allChannels')}</option>
                        {connectedChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                {/* Widget Size */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>📐 {t('reportBuilder.widgetSize')}:</span>
                    {['S', 'M', 'L'].map(s => (
                        <button key={s} onClick={() => setWidgetSize(s)} style={{
                            padding: '3px 8px', borderRadius: 4, border: '1px solid', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            borderColor: widgetSize === s ? ACCENT : 'rgba(255,255,255,0.1)',
                            background: widgetSize === s ? 'rgba(79,142,247,0.15)' : 'transparent',
                            color: widgetSize === s ? ACCENT : '#888',
                        }}>{s}</button>
                    ))}
                <div style={{ flex: 1 }} />
                {/* Export Buttons */}
                <button onClick={() => handleExport('pdf')} style={BTN('rgba(239,68,68,0.15)', '#ef4444')}>📄 PDF</button>
                <button onClick={() => handleExport('excel')} style={BTN('rgba(34,197,94,0.15)', GREEN)}>📊 Excel</button>
                <button onClick={() => setCanvas([])} style={BTN('rgba(239,68,68,0.1)', '#ef4444')}>🗑️ {t('reportBuilder.clearCanvas')}</button>

            {/* Connected Channels Badge */}
            {connectedChannels.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>🔗 {t('reportBuilder.connectedChannels')}:</span>
                    {connectedChannels.slice(0, 10).map(ch => (
                        <span key={ch} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 999, background: GREEN + '15', color: GREEN, fontWeight: 600 }}>{ch}</span>
                    ))}
            )}

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
                {/* Widget Library */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={CARD}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>📦 {t('reportBuilder.widgetLibrary')}</h3>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>{t('reportBuilder.dragDesc')}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {WIDGETS.map(w => (
                                <div key={w.id} draggable onDragStart={(e) => handleDragStart(e, w)} style={{
                                    padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
                                    borderRadius: 8, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
                                }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    <span style={{ fontSize: 16 }}>{w.icon}</span>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{w.title}</div>
                            </div>
                            ))}
                    </div>
                    {/* Save Layout */}
                    <div style={CARD}>
                        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>💾 {t('reportBuilder.saveLayout')}</h4>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input value={layoutName} onChange={(e) => setLayoutName(safeguard(e.target.value, 'layoutName'))} placeholder={t('reportBuilder.layoutNamePh')} style={{ ...INPUT, flex: 1 }} />
                            <button onClick={saveLayout} disabled={!layoutName.trim() || canvas.length === 0} style={BTN(layoutName.trim() && canvas.length > 0 ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.05)', layoutName.trim() && canvas.length > 0 ? ACCENT : '#666')}>{t('reportBuilder.save')}</button>
                    </div>
                    {/* Saved Layouts (inline) */}
                    {savedLayouts.length > 0 && (
                        <div style={CARD}>
                            <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📂 {t('reportBuilder.savedLayouts')}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {savedLayouts.map(l => (
                                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700 }}>{l.name}</div>
                                            <div style={{ fontSize: 9, color: '#888' }}>{l.widgets.length} {t('reportBuilder.widgetsCount')}</div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => loadLayout(l)} style={BTN('rgba(79,142,247,0.15)', ACCENT)}>📥</button>
                                            <button onClick={() => deleteLayout(l.id)} style={BTN('rgba(239,68,68,0.15)', '#ef4444')}>🗑</button>
                                    </div>
                                ))}
                        </div>
                    )}

                {/* Canvas */}
                <div onDragOver={handleDragOver} onDrop={handleDrop} style={{
                    background: canvas.length > 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    border: canvas.length > 0 ? 'none' : '2px dashed rgba(255,255,255,0.1)',
                    borderRadius: 16, padding: 10, display: 'grid',
                    gridTemplateColumns: widgetSize === 'L' ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))',
                    gridAutoRows: 'max-content', gap: 16, alignItems: 'start',
                }}>
                    {canvas.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>📥</div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{t('reportBuilder.dropHere')}</div>
                            <div style={{ fontSize: 11, marginTop: 6 }}>{t('reportBuilder.dropHereDesc')}</div>
                    )}
                    {canvas.map(widget => (
                        <div key={widget.uid} style={{ ...CARD, position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 800 }}>{widget.icon} {widget.title}</div>
                                <button onClick={() => removeWidget(widget.uid)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, fontWeight: 900 }}>×</button>
                            <WidgetRenderer widget={widget} t={t} size={widgetSize} />
                    ))}
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

/* ═══════════ TAB 2: Templates ═══════════ */
function TemplatesTab({ t }) {
    const templates = buildTemplates(t);
    const WIDGETS = WIDGETS_TEMPLATE.map(w => ({ ...w, title: t(w.titleKey) }));
    const [preview, setPreview] = useState(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(168,85,247,0.06))', borderColor: ACCENT + '30', textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 36 }}>📑</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 8 }}>{t('reportBuilder.tplTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{t('reportBuilder.tplSubtitle')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {templates.map(tpl => (
                    <div key={tpl.id} style={{ ...CARD, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setPreview(preview === tpl.id ? null : tpl.id)}
                        onMouseOver={e => e.currentTarget.style.borderColor = ACCENT + '40'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(99,140,255,0.08)'}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{tpl.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{tpl.name}</div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 12 }}>{tpl.desc}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {tpl.widgets.map(wid => {
                                const w = WIDGETS.find(x => x.id === wid);
                                return w ? <span key={wid} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 999, background: 'rgba(79,142,247,0.1)', color: ACCENT, fontWeight: 600 }}>{w.icon} {w.title}</span> : null;
                            })}
                        {preview === tpl.id && (
                            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>{t('reportBuilder.tplPreview')}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{t('reportBuilder.tplWidgetCount')}: {tpl.widgets.length}</div>
                        )}
                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ═══════════ TAB 3: Scheduled ═══════════ */
function ScheduledTab({ t, safeguard }) {
    const [schedules, setSchedules] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState({ name: '', freq: 'weekly', time: '09:00', email: '' });

    useEffect(() => { try { setSchedules(JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '[]')); } catch {} }, []);
    const save = (list) => { setSchedules(list); localStorage.setItem(SCHEDULE_KEY, JSON.stringify(list)); };
    const addSchedule = () => {
        const name = safeguard(form.name.trim(), 'scheduleName');
        if (!name) return;
        save([...schedules, { id: Date.now(), ...form, name, status: 'active', createdAt: new Date().toISOString() }]);
        setForm({ name: '', freq: 'weekly', time: '09:00', email: '' }); setShowNew(false);
    };
    const toggleStatus = (id) => save(schedules.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s));
    const delSchedule = (id) => save(schedules.filter(s => s.id !== id));

    const FREQ = [
        { value: 'daily', label: t('reportBuilder.freqDaily') },
        { value: 'weekly', label: t('reportBuilder.freqWeekly') },
        { value: 'monthly', label: t('reportBuilder.freqMonthly') },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>⏰ {t('reportBuilder.schedTitle')}</div>
                <button onClick={() => setShowNew(!showNew)} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${ACCENT},#6366f1)`, color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer' }}>
                    {showNew ? t('reportBuilder.cancel') : t('reportBuilder.schedNew')}
                </button>
            {showNew && (
                <div style={{ ...CARD, borderColor: ACCENT + '40' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div><label style={{ fontSize: 11, color: '#888' }}>{t('reportBuilder.schedName')}</label><input style={{ ...INPUT, width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div><label style={{ fontSize: 11, color: '#888' }}>{t('reportBuilder.schedFreq')}</label>
                            <select style={{ ...INPUT, width: '100%' }} value={form.freq} onChange={e => setForm({ ...form, freq: e.target.value })}>
                                {FREQ.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        <div><label style={{ fontSize: 11, color: '#888' }}>{t('reportBuilder.schedTime')}</label><input type="time" style={{ ...INPUT, width: '100%' }} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
                    <div style={{ marginTop: 10 }}><label style={{ fontSize: 11, color: '#888' }}>{t('reportBuilder.schedEmail')}</label><input style={{ ...INPUT, width: '100%' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" /></div>
                    <button onClick={addSchedule} disabled={!form.name.trim()} style={{ marginTop: 12, ...BTN(GREEN, '#fff') }}>{t('reportBuilder.schedCreate')}</button>
            )}
            {schedules.length === 0 ? (
                <div style={{ ...CARD, textAlign: 'center', color: '#888', padding: 40 }}>{t('reportBuilder.schedEmpty')}</div>
            ) : (
                schedules.map(s => (
                    <div key={s.id} style={CARD}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 800, fontSize: 14 }}>{s.name}</span>
                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, background: s.status === 'active' ? GREEN + '20' : 'rgba(255,255,255,0.05)', color: s.status === 'active' ? GREEN : '#888' }}>
                                        {s.status === 'active' ? t('reportBuilder.schedActive') : t('reportBuilder.schedPaused')}
                                    </span>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                                    {FREQ.find(f => f.value === s.freq)?.label} · {s.time} · {s.email || '—'}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => toggleStatus(s.id)} style={BTN(s.status === 'active' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)', s.status === 'active' ? '#eab308' : GREEN)}>
                                    {s.status === 'active' ? '⏸' : '▶'}
                                </button>
                                <button onClick={() => delSchedule(s.id)} style={BTN('rgba(239,68,68,0.15)', '#ef4444')}>🗑</button>
                        </div>
                ))
            )}
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

/* ═══════════ TAB 4: Saved ═══════════ */
function SavedTab({ t }) {
    const [layouts, setLayouts] = useState([]);
    useEffect(() => { try { setLayouts(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch {} }, []);
    const deleteLayout = (id) => { const u = layouts.filter(l => l.id !== id); setLayouts(u); localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>📁 {t('reportBuilder.savedTitle')}</div>
            {layouts.length === 0 ? (
                <div style={{ ...CARD, textAlign: 'center', color: '#888', padding: 40 }}>{t('reportBuilder.savedEmpty')}</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {layouts.map(l => (
                        <div key={l.id} style={CARD}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 15 }}>{l.name}</div>
                                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{l.widgets.length} {t('reportBuilder.widgetsCount')} · {l.createdAt?.slice(0, 10)}</div>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                                        {l.widgets.slice(0, 5).map((w, i) => <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: 'var(--surface)', color: '#888' }}>{t(w.titleKey)}</span>)}
                                </div>
                                <button onClick={() => deleteLayout(l.id)} style={BTN('rgba(239,68,68,0.15)', '#ef4444')}>🗑</button>
                        </div>
                    ))}
            )}
                </div>
            </div>
        </div>
    </div>
);
}

/* ═══════════ TAB 5: Guide ═══════════ */
function GuideTab({ t }) {
    const steps = [
        { icon: '1️⃣', title: t('reportBuilder.guideStep1Title'), desc: t('reportBuilder.guideStep1Desc'), color: ACCENT },
        { icon: '2️⃣', title: t('reportBuilder.guideStep2Title'), desc: t('reportBuilder.guideStep2Desc'), color: GREEN },
        { icon: '3️⃣', title: t('reportBuilder.guideStep3Title'), desc: t('reportBuilder.guideStep3Desc'), color: '#eab308' },
        { icon: '4️⃣', title: t('reportBuilder.guideStep4Title'), desc: t('reportBuilder.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('reportBuilder.guideStep5Title'), desc: t('reportBuilder.guideStep5Desc'), color: '#f97316' },
        { icon: '6️⃣', title: t('reportBuilder.guideStep6Title'), desc: t('reportBuilder.guideStep6Desc'), color: '#06b6d4' },
    ];
    const widgetDescs = [
        { icon: '📈', name: t('reportBuilder.widgetRoasTrend'), desc: t('reportBuilder.guideWidgetRoas') },
        { icon: '🖱', name: t('reportBuilder.widgetDailyClicks'), desc: t('reportBuilder.guideWidgetClicks') },
        { icon: '💰', name: t('reportBuilder.widgetAdSpend'), desc: t('reportBuilder.guideWidgetSpend') },
        { icon: '📊', name: t('reportBuilder.widgetKpiSummary'), desc: t('reportBuilder.guideWidgetKpi') },
        { icon: '🎯', name: t('reportBuilder.widgetConversion'), desc: t('reportBuilder.guideWidgetConv') },
        { icon: '💵', name: t('reportBuilder.widgetRevenueTrend'), desc: t('reportBuilder.guideWidgetRevenue') },
        { icon: '🍩', name: t('reportBuilder.widgetChannelPie'), desc: t('reportBuilder.guideWidgetPie') },
        { icon: '🏷', name: t('reportBuilder.widgetFeeCompare'), desc: t('reportBuilder.guideWidgetFee') },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Hero */}
            <div style={{ ...CARD, background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.08))', borderColor: ACCENT + '40', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('reportBuilder.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 500, margin: '6px auto 0' }}>{t('reportBuilder.guideSub')}</div>
            {/* Steps */}
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('reportBuilder.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                    ))}
            </div>
            {/* Widget Reference */}
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('reportBuilder.guideWidgetsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {widgetDescs.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{n.name}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{n.desc}</div>
                        </div>
                    ))}
            </div>
            {/* Tips */}
            <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', borderColor: GREEN + '30' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('reportBuilder.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('reportBuilder.guideTip1')}</li>
                    <li>{t('reportBuilder.guideTip2')}</li>
                    <li>{t('reportBuilder.guideTip3')}</li>
                    <li>{t('reportBuilder.guideTip4')}</li>
                    <li>{t('reportBuilder.guideTip5')}</li>
                </ul>
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

/* ═══════════ MAIN PAGE ═══════════ */
export default function ReportBuilder() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { addAlert } = useGlobalData();
    const { connectedChannels: csChannels = {}, connectedCount = 0 } = useConnectorSync?.() || {};
    const [activeTab, setActiveTab] = useState('canvas');
    const [threats, setThreats] = useState([]);
    const [syncTick, setSyncTick] = useState(0);
    const bcRef = useRef(null);
    const connectedChannels = useConnectedChannels();

    /* BroadcastChannel sync */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel('genie_report_builder_sync');
        const ch2 = new BroadcastChannel('genie_connector_sync');
        const ch3 = new BroadcastChannel('genie_product_sync');
        const handler = () => setSyncTick(p => p + 1);
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); };
    }, []);
    useEffect(() => {
        const id = setInterval(() => {
            setSyncTick(p => p + 1);
            try { bcRef.current?.postMessage({ type: 'RB_UPDATE', ts: Date.now() }); } catch {}
        }, 30000);
        return () => clearInterval(id);
    }, []);

    /* Security guard */
    const safeguard = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            const entry = { type: threat, value, field: fieldName, time: new Date().toLocaleTimeString() };
            setThreats(prev => [...prev, entry]);
            try {
                addAlert({ id: `sec_rb_${Date.now()}`, type: 'security', severity: 'critical', title: `🚨 [Report Builder] ${threat}`, body: `"${fieldName}": ${value.slice(0, 50)}`, timestamp: new Date().toISOString(), read: false });
            } catch {}
            return '';
        }
        return value;
    }, [addAlert]);

    const TABS = [
        { key: 'canvas', label: t('reportBuilder.tabCanvas'), icon: '📊' },
        { key: 'templates', label: t('reportBuilder.tabTemplates'), icon: '📑' },
        { key: 'scheduled', label: t('reportBuilder.tabScheduled'), icon: '⏰' },
        { key: 'saved', label: t('reportBuilder.tabSaved'), icon: '📁' },
        { key: 'guide', label: t('reportBuilder.tabGuide'), icon: '📖' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} t={t} />

            {/* Header */}
            <div style={{ flexShrink: 0, padding: '14px 16px 0', background: 'var(--surface-1, #070f1a)', zIndex: 10, borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
                <div className="hero fade-up" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(168,85,247,0.05))', borderColor: 'rgba(79,142,247,0.15)', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div className="hero-meta">
                            <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))' }}>📋</div>
                            <div>
                                <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#a855f7)' }}>{t('reportBuilder.pageTitle')}</div>
                                <div className="hero-desc">{t('reportBuilder.pageDesc')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: GREEN }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'pulse 2s infinite' }} /> {t('reportBuilder.realtimeSync')}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: threats.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${threats.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`, color: threats.length > 0 ? '#ef4444' : GREEN }}>
                                {threats.length > 0 ? '🔴' : '🟢'} {threats.length > 0 ? `${threats.length} ${t('reportBuilder.threats')}` : t('reportBuilder.securityNormal')}
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: GREEN, fontWeight: 700 }}>
                                🔗 {connectedCount}{t('reportBuilder.badgeChannelUnit', '개 채널 연동')}
                            </span>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700 }}>
                                🛡️ {t('reportBuilder.badgeSecurity')}
                            </span>
                    </div>
                {/* Tab Bar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 0, background: 'var(--surface)', padding: 4, borderRadius: '12px 12px 0 0', border: '1px solid rgba(99,140,255,0.06)', borderBottom: 'none' }}>
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: activeTab === tab.key ? `linear-gradient(135deg,${ACCENT}20,#6366f115)` : 'transparent',
                            color: activeTab === tab.key ? ACCENT : '#888', fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13,
                            transition: 'all 0.2s', borderBottom: activeTab === tab.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                        }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
                {activeTab === 'canvas' && <CanvasTab t={t} safeguard={safeguard} connectedChannels={connectedChannels} />}
                {activeTab === 'templates' && <TemplatesTab t={t} />}
                {activeTab === 'scheduled' && <ScheduledTab t={t} safeguard={safeguard} />}
                {activeTab === 'saved' && <SavedTab t={t} />}
                {activeTab === 'guide' && <GuideTab t={t} />}

            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
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
