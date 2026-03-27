import { useAuth } from '../auth/AuthContext';
import React, { useState } from "react";
import { useI18n } from '../i18n';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

import { useT } from '../i18n/index.js';
/* ─── Mock Data ────────────────────────────────────────── */
const MOCK_DATA = [
    { name: 'Mon', roas: 2400, clicks: 2400, spend: 1000 },
    { name: 'Tue', roas: 3398, clicks: 1398, spend: 2000 },
    { name: 'Wed', roas: 9800, clicks: 9800, spend: 3000 },
    { name: 'Thu', roas: 3908, clicks: 3908, spend: 2100 },
    { name: 'Fri', roas: 4800, clicks: 4800, spend: 3500 },
    { name: 'Sat', roas: 3800, clicks: 3800, spend: 2500 },
    { name: 'Sun', roas: 4300, clicks: 4300, spend: 2100 },
];

/* ─── Widgets Library ──────────────────────────────────── */
const WIDGETS = [
    { id: "w_roas_trend", title: t('super.rbTrend'), type: "area", dataKey: "roas", color: "#4f8ef7" },
    { id: "w_clicks_bar", title: t('super.rbClicks'), type: "bar", dataKey: "clicks", color: "#22c55e" },
    { id: "w_spend_area", title: t('super.rbSpend'), type: "area", dataKey: "spend", color: "#f97316" },
    { id: "w_kpi_summary", title: t('super.rbKpi'), type: "kpi", dataKey: "summary" }
];

export default function ReportBuilder() {
  const t = useT();
    const [canvas, setCanvas] = useState([]); // Widgets dropped on canvas
    const [draggedWidget, setDraggedWidget] = useState(null);

    // Draggable Library Item Event
    const handleDragStart = (e, widget) => {
        setDraggedWidget(widget);
        e.dataTransfer.setData("widgetId", widget.id);
        e.dataTransfer.effectAllowed = "copyMove";
    };

    // Canvas Drop Events
    const handleDragOver = (e) => {
        e.preventDefault(); // allow drop
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const widgetId = e.dataTransfer.getData("widgetId");
        const widgetConfig = WIDGETS.find(w => w.id === widgetId);
        if (widgetConfig) {
            setCanvas([...canvas, { ...widgetConfig, uid: Date.now() + Math.random() }]);
        }
        setDraggedWidget(null);
    };

    const removeWidget = (uid) => {
        setCanvas(canvas.filter(w => w.uid !== uid));
    };

    // Rendering a specific widget based on type
    const renderWidget = (widget) => {
        if (widget.type === "area") {
            return (
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={MOCK_DATA}>
                        <defs>
                            <linearGradient id={`color-${widget.uid}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={widget.color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={widget.color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" fontSize={10} stroke="#888" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                        <Area type="monotone" dataKey={widget.dataKey} stroke={widget.color} fillOpacity={1} fill={`url(#color-${widget.uid})`} />
                    </AreaChart>
                </ResponsiveContainer>
            );
        }
        if (widget.type === "bar") {
            return (
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={MOCK_DATA}>
                        <XAxis dataKey="name" fontSize={10} stroke="#888" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                        <Bar dataKey={widget.dataKey} fill={widget.color} radius={[4,4,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            );
        }
        if (widget.type === "kpi") {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, height: 200, alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>{t('super.kpiRev')}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#4f8ef7' }}>₩482M</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#888' }}>{t('super.kpiRoas')}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e' }}>4.8x</div>
                    </div>
                </div>
            );
        }
        return <div>{t('super.rbUnknown')}</div>;
    };

    return (
        <div style={{ padding: 24, animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.1))', padding: '24px 32px', borderRadius: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>🛠️ {t('super.rbTitle')}</h1>
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('super.rbPageDesc')}</p>
                </div>
                <button onClick={() => setCanvas([])} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ef444455', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
                    Clear Canvas
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, minHeight: '600px' }}>
                {/* WIDGET LIBRARY SIDEBAR */}
                <div style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>{t('super.rbLib')}</h3>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>{t('super.rbDragDesc')}</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {WIDGETS.map(w => (
                            <div 
                                key={w.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, w)}
                                style={{ 
                                    padding: '12px 16px', 
                                    background: 'rgba(255,255,255,0.03)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: 8, 
                                    cursor: 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            >
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: w.color || '#fff' }}></div>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{w.title}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DROP CANVAS */}
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    style={{ 
                        background: canvas.length > 0 ? 'transparent' : 'rgba(255,255,255,0.01)', 
                        border: canvas.length > 0 ? 'none' : '2px dashed rgba(255,255,255,0.1)', 
                        borderRadius: 16, 
                        padding: 10,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                        gridAutoRows: 'max-content',
                        gap: 20,
                        alignItems: 'start'
                    }}
                >
                    {canvas.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>📥</div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{t('super.rbDropHere')}</div>
                        </div>
                    )}

                    {canvas.map(widget => (
                        <div key={widget.uid} style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, border: '1px solid var(--border)', position: 'relative', animation: 'fadeIn 0.3s' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 800 }}>{widget.title}</div>
                                <button onClick={() => removeWidget(widget.uid)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                            </div>
                            <div style={{ padding: 16 }}>
                                {renderWidget(widget)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
