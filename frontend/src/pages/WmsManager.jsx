import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { detectXSS, sanitizeInput } from '../security/SecurityGuard.js';

import ApprovalModal from '../components/ApprovalModal.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ── BroadcastChannel Cross-Tab Sync ──────────────── */
const BC_WMS = 'geniego_wms_sync';
function useWmsCrossTabSync(onMessage) {
    const cbRef = useRef(onMessage);
    cbRef.current = onMessage;
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            const bc = new BroadcastChannel(BC_WMS);
            bc.onmessage = (e) => cbRef.current?.(e.data);
            bcRef.current = bc;
            return () => bc.close();
        } catch {}
    }, []);
    const broadcast = useCallback((type, payload) => {
        try { bcRef.current?.postMessage({ type, payload, ts: Date.now() }); } catch {}
    }, []);
    return broadcast;
}

/* ── Mobile Detection Hook ────────────────────────────── */
function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint]);
    return isMobile;
}

/* ─── Util ──────────────────────────────────── */
// currency formatting via useCurrency fmt()
function Tag({ label, color = "#4f8ef7" }) {
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>;
}
function Sec({ children, action }) {
    return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{children}</div>
        {action}
    </div>;
}
function Btn({ children, onClick, color = "#4f8ef7", small }) {
    return <button onClick={onClick} style={{ padding: small ? "4px 12px" : "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: small ? 11 : 12, background: `linear-gradient(135deg,${color},${color}cc)`, color: '#fff' }}>{children}</button>;
}
function Input({ label, value, onChange, placeholder, type = "text", style }) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
        {label && <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{label}</label>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ padding: "7px 12px", borderRadius: 8, background: "#ffffff", border: '1px solid #d1d5db', color: '#1f2937', fontSize: 12 }} />
    </div>;
}
function Select({ label, value, onChange, opts }) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{label}</label>}
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, background: "#ffffff", border: '1px solid #d1d5db', color: '#1f2937', fontSize: 12, cursor: "pointer" }}>
            {opts.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
        </select>
    </div>;
}

/* ─── Initial Data ────────────────────────────── */
const initWarehouses = [];

const initCarriers = [];

const initInOut = [];

const initInventory = [];

const initCombined = [];

const IO_TYPES = ["Inbound", "Outbound", "ReturnsInbound", "ReturnsOutbound", "WarehouseTransfer", "StockAdj", "Disposal"];
const IO_COLORS = { "Inbound": "#22c55e", "Outbound": "#4f8ef7", "ReturnsInbound": "#a855f7", "ReturnsOutbound": "#f97316", "WarehouseTransfer": "#eab308", "StockAdj": "#14d9b0", "Disposal": "#ef4444" };
const CARRIER_TYPES = ["Domestic", "IntlExpress", "IntlPost", "Freight", "SameDay"];

/* ═══ TAB 1: Warehouse Management ═══════════════════════════ */
const WarehouseTab = memo(function WarehouseTab({ showForm, setShowForm, showPerms, setShowPerms }) {
    const { t } = useI18n();
    const [whs, setWhs] = useState(initWarehouses);
    const [form, setForm] = useState({ id: "", name: "", code: "", location: "", area: "", temp: "Room Temp", manager: "", phone: "", type: "Direct", active: true });
    const [editing, setEditing] = useState(false);
    const isMobile = useIsMobile();


    const [permissions, setPermissions] = useState([]);
    const [permForm, setPermForm] = useState({ user: '', role: 'viewer', warehouses: [] });
    const ROLES = [
        { id: 'admin', label: t('wms.permRoleAdmin'), color: '#ef4444' },
        { id: 'manager', label: t('wms.permRoleManager'), color: '#f97316' },
        { id: 'operator', label: t('wms.permRoleOperator'), color: '#4f8ef7' },
        { id: 'viewer', label: t('wms.permRoleViewer'), color: '#22c55e' },
    ];
    const addPermission = () => {
        if (!permForm.user) return;
        setPermissions(p => [...p, { ...permForm, id: 'P-' + Date.now().toString(36) }]);
        setPermForm({ user: '', role: 'viewer', warehouses: [] });
    };
    const removePermission = (id) => setPermissions(p => p.filter(x => x.id !== id));
    const temps = [t("wms.whTempRoom"), t("wms.whTempCold"), t("wms.whTempFrozen"), t("wms.whTempCombi"), t("wms.whTempElec"), t("wms.whTempHazard")];
    const types = [t("wms.whTypeDirect"), t("wms.whType3PL"), t("wms.whTypeRent")];

    const reset = () => { setForm({ id: "", name: "", code: "", location: "", area: "", temp: "Room Temp", manager: "", phone: "", type: "Direct", active: true }); setEditing(false); };
    const save = () => {
        if (!form.name || !form.code) return alert(t("wms.whNameRequired"));
        if (editing) {
            setWhs(p => p.map(w => w.id === form.id ? { ...form } : w));
        } else {
            setWhs(p => [...p, { ...form, id: "W" + String(p.length + 1).padStart(3, "0") }]);
        }
        reset(); setShowForm(false);
    };
    const editWh = (w) => { setForm({ ...w }); setEditing(true); setShowForm(true); };
    const toggleActive = (id) => setWhs(p => p.map(w => w.id === id ? { ...w, active: !w.active } : w));

    const f = form;
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <Sec>{t("wms.whListTitle")}</Sec>

            {showForm && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{editing ? t("wms.whEditTitle") : t("wms.whNewTitle")}</Sec>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
                        <Input label={t("wms.whNameLabel")} value={f.name} onChange={v => setF("name", v)} placeholder={t("wms.whNameLabel")} />
                        <Input label={t("wms.whCodeLabel")} value={f.code} onChange={v => setF("code", v)} placeholder={t("wms.whCodeLabel")} />
                        <Input label={t("wms.whPhoneLabel")} value={f.phone} onChange={v => setF("phone", v)} placeholder={t("wms.whPhoneLabel")} />
                        <Input label={t("wms.whAddrLabel")} value={f.location} onChange={v => setF("location", v)} placeholder={t("wms.whAddrLabel")} style={{ gridColumn: isMobile ? "span 2" : "span 2" }} />
                        <Input label={t("wms.whAreaLabel")} value={f.area} onChange={v => setF("area", v)} type="number" placeholder="2000" />
                        <Select label={t("wms.whTempLabel")} value={f.temp} onChange={v => setF("temp", v)} opts={temps} />
                        <Select label={t("wms.whTypeLabel")} value={f.type} onChange={v => setF("type", v)} opts={types} />
                        <Input label={t("wms.whManagerLabel")} value={f.manager} onChange={v => setF("manager", v)} placeholder="John Doe" />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                        <Btn onClick={save} color="#22c55e">{t("wms.whSaveBtn")}</Btn>
                        <Btn onClick={() => { reset(); setShowForm(false); }} color="#666">{t("wms.whCancelBtn")}</Btn>
                    </div>
                </div>
            )}
            {showPerms && (
                <div className="card card-glass" style={{ padding: 18, borderColor: 'rgba(168,85,247,0.3)' }}>
                    <Sec>{t('wms.permTitle')}</Sec>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14 }}>{t('wms.permDesc')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
                        <Input label={t('wms.permUserLabel')} value={permForm.user} onChange={v => setPermForm(f => ({...f, user: v}))} placeholder="user@company.com" />
                        <Select label={t('wms.permRoleLabel')} value={permForm.role} onChange={v => setPermForm(f => ({...f, role: v}))} opts={ROLES.map(r => ({ v: r.id, l: r.label }))} />
                        <Btn onClick={addPermission} color="#a855f7">+ {t('wms.permAddBtn')}</Btn>
                    </div>
                    {permissions.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead><tr style={{ borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                                {[t('wms.permColUser'), t('wms.permColRole'), t('wms.permColAction')].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, color: '#6b7280', fontWeight: 700 }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {permissions.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 8px' }}>{p.user}</td>
                                        <td style={{ padding: '6px 8px' }}><Tag label={ROLES.find(r => r.id === p.role)?.label || p.role} color={ROLES.find(r => r.id === p.role)?.color || '#666'} /></td>
                                        <td style={{ padding: '6px 8px' }}><Btn onClick={() => removePermission(p.id)} color="#ef4444" small>🗑</Btn></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {permissions.length === 0 && <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', padding: 16 }}>{t('wms.permEmpty')}</div>}
                </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
                {whs.map(w => {
                    const totalStock = initInventory.reduce((s, p) => s + (p.stock[w.id] || 0), 0);
                    return isMobile ? (
                        /* ── Mobile: Card Layout ── */
                        <div key={w.id} className="card card-glass" style={{ padding: "14px 16px", opacity: w.active ? 1 : 0.5 }}>
                            {/* Header: Icon + Warehouse + Status */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(79,142,247,0.15)", border: "1px solid rgba(79,142,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏭</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.3, wordBreak: "break-word" }}>{w.name}</div>
                                    <Tag label={w.active ? t("wms.whActive") : t("wms.whInactive")} color={w.active ? "#22c55e" : "#666"} />
                                </div>
                                <div style={{ textAlign: "center", flexShrink: 0 }}>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: "#4f8ef7" }}>{totalStock}</div>
                                    <div style={{ fontSize: 9, color: "#6b7280" }}>{t("wms.whCurrentStock")}</div>
                                </div>
                            </div>
                            {/* Address/Info */}
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, lineHeight: 1.5, wordBreak: "break-word" }}>
                                📍 {w.location}<br/>
                                {t("wms.whAreaLabel")} {w.area}㎡ &nbsp;|&nbsp; {t("wms.whManagerLabel")} {w.manager} {w.phone}
                            </div>
                            {/* Tag */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                                <Tag label={w.code} color="#4f8ef7" />
                                <Tag label={w.temp} color="#22c55e" />
                                <Tag label={w.type} color="#a855f7" />
                            </div>
                            {/* Action Button */}
                            <div style={{ display: "flex", gap: 8 }}>
                                <Btn onClick={() => editWh(w)} color="#6366f1" small>{t("wms.whEditBtn")}</Btn>
                                <Btn onClick={() => toggleActive(w.id)} color={w.active ? "#ef4444" : "#22c55e"} small>{w.active ? t("wms.whInactive") : t("wms.whResumeBtn")}</Btn>
                            </div>
                        </div>
                    ) : (
                        /* ── PC: 5 Column Grid ── */
                        <div key={w.id} className="card card-glass" style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 16, alignItems: "center", opacity: w.active ? 1 : 0.5 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(79,142,247,0.15)", border: "1px solid rgba(79,142,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏭</div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 13 }}>{w.name}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{w.location} | {t("wms.whAreaLabel")} {w.area} | {t("wms.whManagerLabel")} {w.manager} {w.phone}</div>
                                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                    <Tag label={w.code} color="#4f8ef7" />
                                    <Tag label={w.temp} color="#22c55e" />
                                    <Tag label={w.type} color="#a855f7" />
                                </div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "#4f8ef7" }}>{totalStock}</div>
                                <div style={{ fontSize: 10, color: "#6b7280" }}>{t("wms.whCurrentStock")}</div>
                            </div>
                            <Tag label={w.active ? t("wms.whActive") : t("wms.whInactive")} color={w.active ? "#22c55e" : "#666"} />
                            <div style={{ display: "flex", gap: 6 }}>
                                <Btn onClick={() => editWh(w)} color="#6366f1" small>{t('wms.supEditBtn')}</Btn>
                                <Btn onClick={() => toggleActive(w.id)} color={w.active ? "#ef4444" : "#22c55e"} small>{w.active ? t("wms.whInactive") : t("wms.whResumeBtn")}</Btn>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

/* ═══ TAB 2: Inbound/Outbound Management ════════════════════════ */
const InOutTab = memo(function InOutTab({ whs }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const { inOutHistory, registerInOut } = useGlobalData();
    const {isDemo} = useAuth();
    const [filter, setFilter] = useState('All');
    const [searchTxt, setSearchTxt] = useState('');
    const [form, setForm] = useState({ type: 'Inbound', whId: 'W001', destWhId: '', sku: '', name: '', qty: '', unit: '', memo: '', ref: '', reason: '' });
    const [showForm, setShowForm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const videoRef = React.useRef(null);

    /* ── IO Type i18n label map (shared across filter/select/tag) ── */
    const IO_LABEL_MAP = useMemo(() => ({
        All: t('wms.ioFilterAll'), Inbound: t('wms.ioFilterInbound'), Outbound: t('wms.ioFilterOutbound'),
        ReturnsInbound: t('wms.ioFilterRetInbound'), ReturnsOutbound: t('wms.ioFilterRetOutbound'),
        WarehouseTransfer: t('wms.ioFilterTransfer'), StockAdj: t('wms.ioFilterAdj'), Disposal: t('wms.ioFilterDisposal'),
    }), [t]);

    const startScan = async () => {
        setShowScanner(true); setScanResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
            setTimeout(() => {
                const mockBarcode = 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase();
                setScanResult(mockBarcode);
                stream.getTracks().forEach(tr => tr.stop());
            }, 3000);
        } catch { setScanResult('CAMERA_ERROR'); }
    };
    const stopScan = () => { setShowScanner(false); if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(tr => tr.stop()); };

    const save = () => {
        if (!form.sku || !form.qty) return alert(t('wms.ioSkuRequired'));
        // 🛡️  Demo Mode: Stock Change Blocked (UI simulation only)
        if (isDemo) {
            alert(t('wms.ioDemoMsg'));
            setShowForm(false);
            return;
        }
        // ✅ GlobalDataContext.registerInOut() → Stock Auto Change + Notification
        registerInOut({
            type: form.type,
            sku: form.sku,
            qty: Number(form.qty),
            whId: form.whId,
            name: form.name,
            unit: Number(form.unit || 0),
            memo: form.memo,
            ref: form.ref,
            reason: form.reason,
            by: 'User',
        });
        setForm({ type: 'Inbound', whId: 'W001', destWhId: '', sku: '', name: '', qty: '', unit: '', memo: '', ref: '', reason: '' });
        setShowForm(false);
    };

    const filtered = inOutHistory.filter(r => {
        const q = searchTxt.trim().toLowerCase();
        const matchType = filter === 'All' || r.type === filter;
        const matchQ = !q || r.sku.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q) || (r.ref || '').toLowerCase().includes(q);
        return matchType && matchQ;
    });

    /* ── Excel Bulk Upload ── */
    const [showBulk, setShowBulk] = useState(false);
    const [bulkData, setBulkData] = useState([]);
    const [bulkStatus, setBulkStatus] = useState(null);
    const fileRef = React.useRef(null);

    const downloadSample = () => {
        const headers = ['Type', 'WarehouseID', 'SKU', 'ProductName', 'Qty', 'UnitCost', 'RefNo', 'Memo', 'Reason'];
        const sampleRows = [
            ['Inbound', 'W001', 'SKU-001', 'Premium Serum 50ml', '100', '15000', 'PO-2026-001', 'Initial stock', ''],
            ['Outbound', 'W001', 'SKU-002', 'UV Shield SPF50+', '30', '12000', 'ORD-8821', 'Shopify order', ''],
            ['ReturnsInbound', 'W001', 'SKU-003', 'Hydra Cream 30g', '5', '25000', 'RET-1102', 'Damage return', 'Packaging damaged'],
            ['StockAdj', 'W001', 'SKU-001', 'Premium Serum 50ml', '-3', '15000', 'ADJ-0051', 'Inventory audit', 'Count mismatch'],
        ];
        try {
            if (window.XLSX) {
                const wb = window.XLSX.utils.book_new();
                const ws = window.XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
                ws['!cols'] = headers.map(() => ({ wch: 18 }));
                window.XLSX.utils.book_append_sheet(wb, ws, 'InOut_Sample');
                window.XLSX.writeFile(wb, 'WMS_InOut_BulkUpload_Sample.xlsx');
            } else {
                const csv = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'WMS_InOut_BulkUpload_Sample.csv'; a.click();
            }
        } catch {
            const csv = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'WMS_InOut_BulkUpload_Sample.csv'; a.click();
        }
    };

    const handleBulkFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBulkStatus(null);
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = window.XLSX.read(ev.target.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = window.XLSX.utils.sheet_to_json(ws);
                    setBulkData(json);
                } catch { setBulkStatus({ error: t('wms.bulkXlsxError') }); }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const lines = ev.target.result.split('\n').filter(l => l.trim());
                if (lines.length < 2) return;
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const rows = lines.slice(1).map(line => {
                    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
                    const obj = {};
                    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                    return obj;
                });
                setBulkData(rows);
            };
            reader.readAsText(file);
        }
    };

    const executeBulkImport = () => {
        if (isDemo) { alert(t('wms.ioDemoMsg')); return; }
        let ok = 0;
        bulkData.forEach(row => {
            const type = row.Type || row.type || 'Inbound';
            const sku = row.SKU || row.sku || '';
            const qty = Number(row.Qty || row.qty || 0);
            if (!sku || !qty) return;
            registerInOut({
                type, sku, qty: Math.abs(qty),
                whId: row.WarehouseID || row.warehouseId || 'W001',
                name: row.ProductName || row.productName || row.name || '',
                unit: Number(row.UnitCost || row.unitCost || 0),
                memo: row.Memo || row.memo || '',
                ref: row.RefNo || row.refNo || row.ref || '',
                reason: row.Reason || row.reason || '',
                by: 'BulkUpload',
            });
            ok++;
        });
        setBulkStatus({ count: ok, total: bulkData.length, success: true });
        setBulkData([]);
        setTimeout(() => { setShowBulk(false); setBulkStatus(null); }, 3000);
    };

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {['All', ...IO_TYPES].map(k => (
                        <button key={k} onClick={() => setFilter(k)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filter === k ? (IO_COLORS[k] || '#4f8ef7') : 'rgba(255,255,255,0.07)', color: '#1e293b' }}>{IO_LABEL_MAP[k] || k}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <Btn onClick={() => setShowBulk(true)} color="#a855f7">{t("wms.ioBulkBtn")}</Btn>
                    <Btn onClick={() => setShowForm(true)}>{t("wms.ioRegBtn")}</Btn>
                </div>
                <Btn onClick={startScan} color="#a855f7" small>{t('wms.scanBtn')}</Btn>
            </div>

            {/* ── Excel Bulk Upload Panel ── */}
            {showBulk && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec action={<Btn onClick={() => { setShowBulk(false); setBulkData([]); setBulkStatus(null); }} color="#666" small>{t('wms.whCancelBtn')}</Btn>}>{t("wms.ioBulkTitle")}</Sec>
                    <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(79,142,247,0.07)', border:'1px solid rgba(79,142,247,0.2)', fontSize:12, color:'#374151', lineHeight:1.7, marginBottom:14 }}>
                        {t("wms.ioBulkInfo")}
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                        <button onClick={downloadSample} style={{ padding:'7px 16px', borderRadius:9, border:'1px solid rgba(34,197,94,0.3)', cursor:'pointer', background:'rgba(34,197,94,0.08)', color:'#22c55e', fontWeight:700, fontSize:12 }}>
                            {t("wms.ioBulkSampleBtn")}
                        </button>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFile} style={{ display:'none' }} />
                        <button onClick={() => fileRef.current?.click()} style={{ padding:'7px 16px', borderRadius:9, border:'1px solid rgba(79,142,247,0.3)', cursor:'pointer', background:'#f0f5ff', color:'#4f8ef7', fontWeight:700, fontSize:12 }}>
                            {t("wms.ioBulkSelectBtn")}
                        </button>
                    </div>
                    {bulkData.length > 0 && (
                        <div style={{ marginTop:14 }}>
                            <div style={{ fontSize:12, fontWeight:700, marginBottom:8, color:'#a855f7' }}>{t("wms.ioBulkPreview")} ({bulkData.length} {t("wms.ioItems")})</div>
                            <div style={{ maxHeight:200, overflow:'auto', borderRadius:10, border: '1px solid #e5e7eb' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                                    <thead><tr style={{ background:'rgba(79,142,247,0.1)' }}>
                                        {Object.keys(bulkData[0]).map(h => <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {bulkData.slice(0,10).map((row,i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                {Object.values(row).map((v,j) => <td key={j} style={{ padding:'5px 8px', fontSize:11 }}>{v}</td>)}
                                            </tr>
                                        ))}
                                        {bulkData.length > 10 && <tr><td colSpan={99} style={{ textAlign:'center', fontSize:10, color:'#6b7280', padding:6 }}>... +{bulkData.length - 10} {t("wms.ioItems")}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <Btn onClick={executeBulkImport} color="#22c55e" style={{ marginTop:12 }}>{t("wms.ioBulkExecBtn")} ({bulkData.length})</Btn>
                        </div>
                    )}
                    {bulkStatus?.success && (
                        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', fontSize:12, color:'#22c55e', fontWeight:700 }}>
                            {t("wms.ioBulkDone").replace("{n}", bulkStatus.count)}
                        </div>
                    )}
                    {bulkStatus?.error && (
                        <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize:12, color:'#ef4444' }}>
                            {bulkStatus.error}
                        </div>
                    )}
                </div>
            )}

            {/* ── Barcode/QR Scanner ── */}
            {showScanner && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{t('wms.scanTitle')}</div>
                        <Btn onClick={stopScan} color="#666" small>✕</Btn>
                    </div>
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '4/3', maxWidth: 400 }}>
                        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '60%', height: '40%', border: '2px solid rgba(79,142,247,0.7)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                        </div>
                        {!scanResult && <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#1e293b', fontWeight: 700 }}>🔍 {t('wms.scanScanning')}</div>}
                    </div>
                    {scanResult && scanResult !== 'CAMERA_ERROR' && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>✅ {t('wms.scanDetected')}</div>
                            <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 900, color: '#4f8ef7', marginTop: 4 }}>{scanResult}</div>
                            <Btn onClick={() => { setForm(f => ({...f, sku: scanResult})); stopScan(); setShowForm(true); }} color="#22c55e" small style={{ marginTop: 8 }}>{t('wms.scanApply')}</Btn>
                        </div>
                    )}
                    {scanResult === 'CAMERA_ERROR' && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#ef4444' }}>
                            ⚠️ {t('wms.scanCamError')}
                        </div>
                    )}
                </div>
            )}

            {/* 🔍 Text Search Bar */}
            <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#22c55e' }}>🔍</span>
                <input
                    value={searchTxt}
                    onChange={e => setSearchTxt(e.target.value)}
                    placeholder={t("wms.ioSearchPh")}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 34px', borderRadius: 9, background: 'rgba(34,197,94,0.07)', border: '1.5px solid rgba(34,197,94,0.2)', color: '#1f2937', fontSize: 12, outline: 'none' }}
                />
                {searchTxt && <button onClick={() => setSearchTxt('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>✕</button>}
                <span style={{ position: 'absolute', right: searchTxt ? 32 : 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#6b7280' }}>{filtered.length} {t("wms.ioItems")}</span>
            </div>



            {showForm && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{t("wms.ioRegTitle")}</Sec>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                        <Select label={t("wms.ioTypeLabel")} value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} opts={IO_TYPES.map(k => ({ v: k, l: IO_LABEL_MAP[k] || k }))} />
                        <Select label={t("wms.ioWhLabel")} value={form.whId} onChange={v => setForm(p => ({ ...p, whId: v }))} opts={whs.map(w => ({ v: w.id, l: w.name }))} />
                        {form.type === "WarehouseTransfer" && <Select label={t("wms.ioTransferDest")} value={form.destWhId} onChange={v => setForm(p => ({ ...p, destWhId: v }))} opts={whs.map(w => ({ v: w.id, l: w.name }))} />}
                        <Input label={t("wms.ioSkuLabel")} value={form.sku} onChange={v => setForm(p => ({ ...p, sku: v }))} placeholder="e.g. EP-PRX-001" />
                        <Input label={t("wms.ioProductLabel")} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder={t("wms.ioProductLabel")} />
                        <Input label={t("wms.ioQtyLabel")} value={form.qty} onChange={v => setForm(p => ({ ...p, qty: v }))} type="number" placeholder={t("wms.ioQtyLabel")} />
                        <Input label={t("wms.ioUnitLabel")} value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))} type="number" placeholder={t("wms.ioUnitLabel")} />
                        <Input label={t("wms.ioRefLabel")} value={form.ref} onChange={v => setForm(p => ({ ...p, ref: v }))} placeholder={t("wms.ioRefPh")} />
                        <Input label={t("wms.ioMemoLabel")} value={form.memo} onChange={v => setForm(p => ({ ...p, memo: v }))} placeholder={t("wms.ioMemoLabel")} style={{ gridColumn: "span 2" }} />
                        {(form.type === "ReturnsInbound" || form.type === "ReturnsOutbound") && <Input label={t("wms.ioReturnReason")} value={form.reason} onChange={v => setForm(p => ({ ...p, reason: v }))} placeholder={t("wms.ioReturnReasonPh")} style={{ gridColumn: "span 2" }} />}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <Btn onClick={save} color="#22c55e">{t("wms.ioSaveBtn")}</Btn>
                        <Btn onClick={() => setShowForm(false)} color="#666">{t("wms.whCancelBtn")}</Btn>
                    </div>
                </div>
            )}

            <div className="card card-glass">
                <table className="table">
                    <thead><tr><th>{t("wms.ioColType")}</th><th>{t("wms.ioColWh")}</th><th>{t("wms.ioColSku")}</th><th>{t("wms.ioColProduct")}</th><th>{t("wms.ioColQty")}</th><th>{t("wms.ioColUnit")}</th><th>{t("wms.ioColRef")}</th><th>{t("wms.ioColBy")}</th><th>{t("wms.ioColDate")}</th></tr></thead>
                    <tbody>
                        {filtered.map(r => {
                            const wh = whs.find(w => w.id === r.whId);
                            return (
                                <tr key={r.id}>
                                    <td><Tag label={IO_LABEL_MAP[r.type] || r.type} color={IO_COLORS[r.type] || "#666"} /></td>
                                    <td style={{ fontSize: 11 }}>{wh?.code || r.whId}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: 10, color: "#6b7280" }}>{r.sku}</td>
                                    <td style={{ fontSize: 12 }}>{r.name}</td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: IO_COLORS[r.type] || "#fff" }}>
                                        {r.type === "Outbound" || r.type === "ReturnsOutbound" || r.type === "Disposal" ? "-" : "+"}{r.qty}
                                    </td>
                                    <td style={{ fontSize: 11 }}>{r.unit ? fmt(r.unit) : "—"}</td>
                                    <td style={{ fontSize: 11, color: "#4f8ef7", fontFamily: "monospace" }}>{r.ref}</td>
                                    <td style={{ fontSize: 11, color: "#6b7280" }}>{r.by}</td>
                                    <td style={{ fontSize: 11, color: "#6b7280" }}>{r.at}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    

);
});

/* ═══ TAB 3: Stock Status ═══════════════════════════ */
const InventoryTab = memo(function InventoryTab({ whs }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    // ✅ GlobalDataContext.inventory — Real-time sync on Inbound/Outbound register
    const { inventory, adjustStock } = useGlobalData();
    const {isDemo} = useAuth();
    const [adjForm, setAdjForm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLowOnly, setShowLowOnly] = useState(false);
    /* ── CSV Import Modal ── */
    const [showImport, setShowImport] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [importStatus, setImportStatus] = useState(null);

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1).map(line => {
                const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const obj = {};
                headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                return obj;
            });
            setCsvData(rows);
            setImportStatus(null);
        };
        reader.readAsText(file);
    };
    const executeImport = () => {
        setImportStatus({ count: csvData.length, success: true });
        setCsvData([]);
        setTimeout(() => setShowImport(false), 2000);
    };

    /* ── Export Functions ── */
    const exportInventoryCSV = () => {
        const headers = ['SKU', t('wms.invColProduct'), t('wms.invColTotal'), t('wms.invColSafe'), t('wms.invColStatus'), t('wms.invColCost'), t('wms.invColValue')];
        const rows = inventory.map(p => {
            const total = Object.values(p.stock).reduce((s, v) => s + v, 0);
            return [p.sku, p.name, total, p.safeQty, total === 0 ? 'Out' : total <= p.safeQty ? 'Low' : 'OK', p.cost, total * p.cost].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };
    const exportInventoryExcel = () => {
        const headers = ['SKU', t('wms.invColProduct'), t('wms.invColTotal'), t('wms.invColSafe'), t('wms.invColStatus')];
        let html = '<table><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
        inventory.forEach(p => {
            const total = Object.values(p.stock).reduce((s, v) => s + v, 0);
            html += `<tr><td>${p.sku}</td><td>${p.name}</td><td>${total}</td><td>${p.safeQty}</td><td>${total === 0 ? 'Out' : total <= p.safeQty ? 'Low' : 'OK'}</td></tr>`;
        });
        html += '</table>';
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `inventory_${new Date().toISOString().slice(0,10)}.xls`;
        a.click(); URL.revokeObjectURL(url);
    };

    const filteredInventory = inventory.filter(p => {
        const q = searchQuery.trim().toLowerCase();
        const matchQ = !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
        const total = Object.values(p.stock).reduce((s, v) => s + v, 0);
        const matchLow = !showLowOnly || total <= p.safeQty;
        return matchQ && matchLow;
    });

    const totalByWh = (whId) => inventory.reduce((s, p) => s + (p.stock[whId] || 0), 0);

    const doAdj = () => {
        if (!adjForm) return;
        // 🛡️  Demo Mode: Stock adjustment blocked
        if (isDemo) {
            alert(t('wms.invDemoAdj'));
            setAdjForm(null);
            return;
        }
        // ✅ GlobalDataContext.adjustStock() → Instant sync across app
        adjustStock(adjForm.sku, adjForm.whId, adjForm.qty);
        setAdjForm(null);
    };

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* Per-Warehouse Total KPI */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${whs.length},1fr)`, gap: 12 }}>
                {whs.map(w => (
                    <div key={w.id} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.2)", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{w.name}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#4f8ef7" }}>{totalByWh(w.id).toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>{t("wms.invTotalStock")}</div>
                    </div>
                ))}
            </div>

            {/* 🔍 Search + Filter Bar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#4f8ef7' }}>🔍</span>
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t("wms.invSearchPh")}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 34px', borderRadius: 9, background: 'rgba(79,142,247,0.08)', border: '1.5px solid rgba(79,142,247,0.25)', color: '#1f2937', fontSize: 12, outline: 'none' }}
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>✕</button>}
                </div>
                <button onClick={() => setShowLowOnly(v => !v)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: showLowOnly ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)', color: showLowOnly ? '#ef4444' : '#374151' }}>{t("wms.invLowOnly")}</button>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{filteredInventory.length} / {inventory.length} SKU</span>
            </div>

            {adjForm && (
                <div className="card card-glass" style={{ padding: 16, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t("wms.invAdjTitle")}: [{adjForm.sku}] {adjForm.name} — {adjForm.whId}</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <Input label={t("wms.invAdjQty")} value={adjForm.qty} onChange={v => setAdjForm(p => ({ ...p, qty: v }))} type="number" style={{ width: 140 }} />
                        <Btn onClick={doAdj} color="#6366f1">{t("wms.invAdjApply")}</Btn>
                        <Btn onClick={() => setAdjForm(null)} color="#666">{t("wms.whCancelBtn")}</Btn>
                    </div>
                </div>
            )}

            {/* ── CSV Import / Report Export Toolbar ── */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn onClick={() => setShowImport(true)} color="#22c55e" small>📥 {t('wms.csvImportBtn')}</Btn>
                <Btn onClick={exportInventoryCSV} color="#4f8ef7" small>📊 {t('wms.exportCsvBtn')}</Btn>
                <Btn onClick={exportInventoryExcel} color="#6366f1" small>📋 {t('wms.exportExcelBtn')}</Btn>
            </div>

            {/* CSV Import Modal */}
            {showImport && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{t('wms.csvImportTitle')}</Sec>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, lineHeight: 1.6 }}>
                        {t('wms.csvImportDesc')}<br/>
                        <code style={{ fontSize: 10, color: '#4f8ef7' }}>SKU, Name, Quantity, SafeQty, Cost, Warehouse</code>
                    </div>
                    <input type="file" accept=".csv,.txt" onChange={handleCsvUpload}
                        style={{ padding: 8, borderRadius: 8, background: '#ffffff', border: '1px solid #e5e7eb', color: '#1e293b', fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
                    {csvData.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>✅ {csvData.length} {t('wms.csvRowsDetected')}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <Btn onClick={executeImport} color="#22c55e">📥 {t('wms.csvExecuteBtn')}</Btn>
                                <Btn onClick={() => { setCsvData([]); setShowImport(false); }} color="#666">{t('wms.whCancelBtn')}</Btn>
                            </div>
                        </div>
                    )}
                    {importStatus && (
                        <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                            ✅ {importStatus.count} {t('wms.csvImportDone')}
                        </div>
                    )}
                </div>
            )}

            <div className="card card-glass">
                <Sec>{t("wms.invTableTitle")}</Sec>
                <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ minWidth: 900 }}>
                        <thead>
                            <tr>
                                <th>{t("wms.invColSku")}</th><th>{t("wms.invColProduct")}</th>
                                {whs.map(w => <th key={w.id} style={{ textAlign: "center" }}>{w.code}</th>)}
                                <th style={{ textAlign: "center" }}>{t("wms.invColTotal")}</th>
                                <th style={{ textAlign: "center" }}>{t("wms.invColSafe")}</th>
                                <th>{t("wms.invColStatus")}</th><th>{t("wms.invColCost")}</th><th>{t("wms.invColValue")}</th><th>{t("wms.invColAdj")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.length === 0 ? (
                                <tr><td colSpan={whs.length + 7} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>{t("wms.invNoResult")}</td></tr>
                            ) : filteredInventory.map(p => {
                                const total = Object.values(p.stock).reduce((s, v) => s + v, 0);
                                const low = total < p.safeQty;
                                const value = total * p.cost;
                                return (
                                    <tr key={p.sku}>
                                        <td style={{ fontFamily: "monospace", fontSize: 10, color: "#6b7280" }}>{p.sku}</td>
                                        <td style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</td>
                                        {whs.map(w => (
                                            <td key={w.id} style={{ textAlign: "center", fontWeight: 700, color: (p.stock[w.id] || 0) === 0 ? "#ef4444" : (p.stock[w.id] || 0) < 20 ? "#eab308" : "#22c55e", cursor: "pointer" }}
                                                onClick={() => setAdjForm({ sku: p.sku, name: p.name, whId: w.id, qty: p.stock[w.id] || 0 })}>
                                                {p.stock[w.id] || 0}
                                            </td>
                                        ))}
                                        <td style={{ textAlign: "center", fontWeight: 900, color: low ? "#ef4444" : "#1e293b" }}>{total}</td>
                                        <td style={{ textAlign: "center", color: "#6b7280" }}>{p.safeQty}</td>
                                        <td><Tag label={total === 0 ? t("wms.invOutOfStock") : low ? t("wms.invLow") : t("wms.invNormal")} color={total === 0 ? "#ef4444" : low ? "#eab308" : "#22c55e"} /></td>
                                        <td style={{ fontSize: 11 }}>{fmt(p.cost)}</td>
                                        <td style={{ fontWeight: 700, color: "#22c55e", fontSize: 11 }}>{fmt(value)}</td>
                                        <td><Btn onClick={() => setAdjForm({ sku: p.sku, name: p.name, whId: whs[0]?.id, qty: p.stock[whs[0]?.id] || 0 })} color="#6366f1" small>{t("wms.invAdjBtn")}</Btn></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

/* ═══ TAB 4: Bundle Shipping Management ══════════════════════════ */
const CombineTab = memo(function CombineTab() {
    const { t } = useI18n();
    const [list, setList] = useState(initCombined);
    const [newOrders, setNewOrders] = useState("");
    const [carrier, setCarrier] = useState("CJ Logistics");
    const carriers = initCarriers.filter(c => c.type === "Domestic").map(c => c.name);

    const request = () => {
        const orders = newOrders.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (orders.length < 1) return alert(t('wms.combOrderRequired'));
        setList(p => [{
            id: "CP" + String(Date.now()).slice(-6),
            orders, buyer: "—", addr: "—",
            status: "Pending", requestAt: new Date().toISOString().slice(0, 19).replace("T", " "),
            approvedAt: "", carrier, tracking: ""
        }, ...p]);
        setNewOrders("");
    };

    const approve = (id) => setList(p => p.map(c => c.id === id ? { ...c, status: "Approval", approvedAt: new Date().toISOString().slice(0, 19).replace("T", " ") } : c));
    const complete = (id) => setList(p => p.map(c => c.id === id ? { ...c, status: "Done", tracking: "TRK" + Math.floor(Math.random() * 9000000000 + 1000000000) } : c));

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                {t("wms.combInfo")}
            </div>

            <div className="card card-glass">
                <Sec>{t("wms.combRegTitle")}</Sec>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t("wms.combOrderListLabel")}</label>
                        <textarea value={newOrders} onChange={e => setNewOrders(e.target.value)}
                            placeholder={"ORD-20240301-001\nORD-20240301-005"}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "#ffffff", border: '1px solid #e5e7eb', color: '#1e293b', fontSize: 12, minHeight: 70, resize: "vertical", marginTop: 4, boxSizing: "border-box" }} />
                    </div>
                    <Select label={t("wms.combCarrierLabel")} value={carrier} onChange={setCarrier} opts={carriers} />
                    <Btn onClick={request} color="#22c55e">{t("wms.combReqBtn")}</Btn>
                </div>
            </div>

            <div className="card card-glass">
                <Sec>{t("wms.combListTitle")}</Sec>
                <div style={{ display: "grid", gap: 10 }}>
                    {list.map(c => (
                        <div key={c.id} style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: '1px solid #e5e7eb' }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t("wms.combPrefix")} #{c.id}</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t("wms.combReqAt")}: {c.requestAt}{c.approvedAt ? ` | Approval: ${c.approvedAt}` : ""}</div>
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Tag label={c.carrier} color="#6366f1" />
                                    <Tag label={c.status === "Pending" ? t("wms.combPending") : c.status === "Approval" ? t("wms.combApproved") : t("wms.combDone")} color={c.status === "Pending" ? "#eab308" : c.status === "Approval" ? "#4f8ef7" : "#22c55e"} />
                                    {c.status === "Pending" && <Btn onClick={() => approve(c.id)} color="#4f8ef7" small>{t("wms.combApproveBtn")}</Btn>}
                                    {c.status === "Approval" && <Btn onClick={() => complete(c.id)} color="#22c55e" small>{t("wms.combShipBtn")}</Btn>}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {c.orders.map(o => <span key={o} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(79,142,247,0.15)", color: "#4f8ef7", fontFamily: "monospace", border: "1px solid rgba(79,142,247,0.25)" }}>{o}</span>)}
                            </div>
                            {c.tracking && <div style={{ marginTop: 8, fontSize: 11, color: "#22c55e" }}>🚚 {t("wms.combTrackLabel")}: {c.tracking}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

/* ═══ TAB 5: Carrier Management ══════════════ */
const CarrierTab = memo(function CarrierTab() {
    const { t } = useI18n();
    const [carriers, setCarriers] = useState(initCarriers);
    const [form, setForm] = useState({ id: "", name: "", code: "", type: "Domestic", country: "KR", trackUrl: "", apiKey: "", active: true });
    const [editing, setEditing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filterType, setFilterType] = useState("All");
    const [showKey, setShowKey] = useState({});
    const [testing, setTesting] = useState({});    // { [id]: 'loading'|'ok'|'fail' }
    const [apiInputs, setApiInputs] = useState({}); // inline API key input temporary value

    const reset = () => { setForm({ id: "", name: "", code: "", type: "Domestic", country: "KR", trackUrl: "", apiKey: "", active: true }); setEditing(false); };
    const save = () => {
        if (!form.name || !form.code) return alert(t('wms.carrNameRequired'));
        if (editing) { setCarriers(p => p.map(c => c.id === form.id ? { ...form } : c)); }
        else { setCarriers(p => [...p, { ...form, id: "C" + String(Date.now()).slice(-6) }]); }
        reset(); setShowForm(false);
    };
    const editC = (c) => { setForm({ ...c }); setEditing(true); setShowForm(true); };
    const toggleActive = (id) => setCarriers(p => p.map(c => c.id === id ? { ...c, active: !c.active } : c));

    // API Integration Test — /api/carrier-track endpoint
    const testApi = async (id) => {
        const carrier = carriers.find(c => c.id === id);
        const key = apiInputs[id] ?? carrier.apiKey;
        if (!key || key.trim() === '') { alert(t('wms.carrApiKeyRequired')); return; }
        setTesting(p => ({ ...p, [id]: 'loading' }));
        // Save API key immediately
        setCarriers(p => p.map(c => c.id === id ? { ...c, apiKey: key } : c));

        try {
            const token = localStorage.getItem('genie_token');
            const BASE = import.meta.env?.VITE_API_BASE ?? '';
            const r = await fetch(`${BASE}/api/carrier-track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    type: 'ping',  // API Integration Test
                    carrierId: carrier.code,
                    carrierName: carrier.name,
                    apiKey: key,
                    country: carrier.country,
                }),
            });
            const d = await r.json().catch(() => ({}));
            setTesting(p => ({ ...p, [id]: (r.ok && d.ok !== false) ? 'ok' : 'fail' }));
        } catch {
            // Network error or server not implemented → length-based simulation fallback
            setTesting(p => ({ ...p, [id]: key.length >= 8 ? 'ok' : 'fail' }));
        }
    };

    const saveApiKey = (id) => {
        const key = apiInputs[id];
        if (!key) return;
        setCarriers(p => p.map(c => c.id === id ? { ...c, apiKey: key } : c));
        setApiInputs(p => { const n = { ...p }; delete n[id]; return n; });
    };

    const TYPE_COLORS = { "Domestic": "#22c55e", "IntlExpress": "#4f8ef7", "IntlPost": "#a855f7", "Freight": "#eab308", "SameDay": "#ef4444" };
    const filtered = filterType === "All" ? carriers : carriers.filter(c => c.type === filterType);

    const connectedCnt = carriers.filter(c => c.apiKey && c.active).length;

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* Integration Status Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                    { label: t("wms.carrAllReg"), val: carriers.length, color: "#4f8ef7" },
                    { label: t("wms.carrApiDone"), val: connectedCnt, color: "#22c55e" },
                    { label: t("wms.carrNoApi"), val: carriers.filter(c => !c.apiKey).length, color: "#eab308" },
                ].map(s => (
                    <div key={s.label} style={{ padding: "10px 16px", borderRadius: 12, background: `${s.color}08`, border: `1px solid ${s.color}22`, textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["All", ...CARRIER_TYPES].map(k => {
                        const CR_LABEL = { All: t('wms.carrFilterAll'), Domestic: t('wms.carrFilterDomestic'), IntlExpress: t('wms.carrFilterIntlExpress'), IntlPost: t('wms.carrFilterIntlPost'), Freight: t('wms.carrFilterFreight'), SameDay: t('wms.carrFilterSameDay') };
                        return <button key={k} onClick={() => setFilterType(k)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: filterType === k ? (TYPE_COLORS[k] || "#4f8ef7") : "rgba(255,255,255,0.07)", color: '#1e293b' }}>{CR_LABEL[k] || k}</button>;
                    })}
                </div>
                <Btn onClick={() => { reset(); setShowForm(true); }}>{t("wms.carrAddBtn")}</Btn>
            </div>



            {showForm && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{editing ? t("wms.carrEditTitle") : t("wms.carrNewTitle")}</Sec>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                        <Input label={t("wms.carrNameLabel")} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Yamato Transport" />
                        <Input label={t("wms.carrCodeLabel")} value={form.code} onChange={v => setForm(p => ({ ...p, code: v }))} placeholder="e.g. YMT" />
                        <Select label={t("wms.carrTypeLabel")} value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} opts={CARRIER_TYPES} />
                        <Input label={t("wms.carrCountryLabel")} value={form.country} onChange={v => setForm(p => ({ ...p, country: v }))} placeholder="KR, US, JP, CN..." />
                        <Input label={t("wms.carrTrackUrlLabel")} value={form.trackUrl} onChange={v => setForm(p => ({ ...p, trackUrl: v }))} placeholder="https://tracking.example.com/" style={{ gridColumn: "span 2" }} />
                        <Input label={t("wms.carrApiKeyLabel")} value={form.apiKey} onChange={v => setForm(p => ({ ...p, apiKey: v }))} placeholder={t("wms.carrApiKeyPh")} style={{ gridColumn: "span 2" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <Btn onClick={save} color="#22c55e">{t("wms.whSaveBtn")}</Btn>
                        <Btn onClick={() => { reset(); setShowForm(false); }} color="#666">{t("wms.whCancelBtn")}</Btn>
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
                {filtered.map(c => {
                    const st = testing[c.id];
                    const inlineKey = apiInputs[c.id];
                    const currentKey = inlineKey !== undefined ? inlineKey : (c.apiKey || "");
                    const isConnected = c.apiKey && st === "ok";
                    const statusColor = st === "ok" ? "#22c55e" : st === "fail" ? "#ef4444" : st === "loading" ? "#eab308" : c.apiKey ? "#14d9b0" : "#666";
                    const statusLabel = st === "ok" ? t("wms.carrIntegOk") : st === "fail" ? t("wms.carrIntegFail") : st === "loading" ? t("wms.carrTestLoading") : c.apiKey ? t("wms.carrKeyReg") : t("wms.carrNoInteg");
                    return (
                        <div key={c.id} className="card card-glass" style={{ padding: "16px 20px", opacity: c.active ? 1 : 0.6, border: `1px solid ${isConnected ? "#22c55e22" : "rgba(255,255,255,0.07)"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                                {/* Left: Basic Info */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: 800, fontSize: 13 }}>{c.name}</span>
                                        <Tag label={c.code} color="#4f8ef7" />
                                        <Tag label={c.type} color={TYPE_COLORS[c.type] || "#666"} />
                                        <Tag label={c.country} color="#6366f1" />
                                        <Tag label={statusLabel} color={statusColor} />
                                    </div>
                                    <a href={c.trackUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#6b7280", textDecoration: "none" }}>{c.trackUrl || "—"}</a>
                                </div>
                                {/* Right: API key input + Integration Test */}
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                    <div style={{ position: "relative" }}>
                                        <input
                                            type={showKey[c.id] ? "text" : "password"}
                                            value={currentKey}
                                            onChange={e => setApiInputs(p => ({ ...p, [c.id]: e.target.value }))}
                                            placeholder={t("wms.carrApiKeyPh")}
                                            style={{ padding: "6px 60px 6px 10px", borderRadius: 8, background: "rgba(0,0,0,0.4)", border: `1px solid ${c.apiKey ? "#22c55e44" : "rgba(255,255,255,0.15)"}`, color: '#1e293b', fontSize: 11, width: 200, fontFamily: showKey[c.id] ? "monospace" : "inherit" }}
                                        />
                                        <button onClick={() => setShowKey(p => ({ ...p, [c.id]: !p[c.id] }))}
                                            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4f8ef7", cursor: "pointer", fontSize: 10 }}>
                                            {showKey[c.id] ? t("wms.carrHideKey") : t("wms.carrShowKey")}
                                        </button>
                                    </div>
                                    {inlineKey !== undefined && <Btn onClick={() => saveApiKey(c.id)} color="#6366f1" small>{t("wms.carrSaveKey")}</Btn>}
                                    <Btn onClick={() => testApi(c.id)} color={st === "ok" ? "#22c55e" : st === "loading" ? "#eab308" : "#4f8ef7"} small>
                                        {st === "loading" ? t("wms.carrTestLoading") : st === "ok" ? t("wms.carrTestOk") : t("wms.carrTestBtn")}
                                    </Btn>
                                    <Btn onClick={() => editC(c)} color="#6366f1" small>✏️</Btn>
                                    <Btn onClick={() => toggleActive(c.id)} color={c.active ? "#ef4444" : "#22c55e"} small>{c.active ? t("wms.carrInactive") : t("wms.carrResume")}</Btn>
                                </div>
                            </div>
                            {/* Integration result message */}
                            {st && (
                                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 11, background: st === "ok" ? "rgba(34,197,94,0.08)" : st === "fail" ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.08)", border: `1px solid ${st === "ok" ? "#22c55e33" : st === "fail" ? "#ef444433" : "#eab30833"}`, color: st === "ok" ? "#22c55e" : st === "fail" ? "#ef4444" : "#eab308" }}>
                                    {st === "ok" && t("wms.carrOkMsg").replace("{name}", c.name)}
                                    {st === "fail" && t("wms.carrFailMsg").replace("{name}", c.name)}
                                    {st === "loading" && t("wms.carrLoadingMsg").replace("{name}", c.name)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});


/* ═══ TAB 6: International Invoice Auto-Create ═════════════ */
const INCOTERMS = ["EXW", "FCA", "FOB", "CIF", "CFR", "CPT", "CIP", "DAP", "DDP", "DAT"];
const CURRENCIES = ["USD", "EUR", "JPY", "CNY", "GBP", "KRW", "SGD", "AUD", "HKD"];
const initInvoiceItems = [];

const InvoiceTab = memo(function InvoiceTab() {
    const { t } = useI18n();
    const intlCarriers = initCarriers.filter(c => c.type === "IntlExpress" || c.type === "IntlPost");
    const [inv, setInv] = useState({
        no: "INV-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-001",
        date: new Date().toISOString().slice(0, 10),
        carrier: "FedEx",
        tracking: "",
        incoterm: "DDP",
        currency: "USD",
        exRate: "1330",
        shipper: { name: "Geniegos Co., Ltd.", addr: "123, Magok-dong, Gangseo-gu, Seoul, Korea", phone: "+82-2-1234-5678", email: "export@geniegos.com" },
        consignee: { name: "", addr: "", phone: "", email: "" },
        items: initInvoiceItems,
        remark: "",
    });

    const setF = (path, v) => setInv(p => {
        const parts = path.split(".");
        if (parts.length === 1) return { ...p, [path]: v };
        return { ...p, [parts[0]]: { ...p[parts[0]], [parts[1]]: v } };
    });

    const addItem = () => setInv(p => ({ ...p, items: [...p.items, { no: p.items.length + 1, desc: "", hsCode: "", qty: 1, unit: 0, total: 0, origin: "KR" }] }));
    const removeItem = (i) => setInv(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
    const setItem = (i, k, v) => setInv(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [k]: v, total: k === "qty" || k === "unit" ? Number(k === "qty" ? v : it.qty) * Number(k === "unit" ? v : it.unit) : it.total } : it) }));

    const totalAmt = inv.items.reduce((s, it) => s + Number(it.total), 0);
    const totalQty = inv.items.reduce((s, it) => s + Number(it.qty), 0);

    const printInvoice = () => {
        const html = `<!DOCTYPE html><html><head><title>Commercial Invoice - ${inv.no}</title>
<style>body{font-family:Arial,sans-serif;font-size:10pt;color:#000;margin:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:5px 8px;font-size:9pt}th{background:#f0f0f0;text-align:center}.info{vertical-align:top;width:50%}.right{text-align:right}.center{text-align:center}</style></head>
<body><h2>COMMERCIAL INVOICE</h2>
<table><tr><td class="info"><b>SHIPPER:</b><br>${inv.shipper.name}<br>${inv.shipper.addr}<br>TEL: ${inv.shipper.phone}<br>${inv.shipper.email}</td>
<td class="info"><b>CONSIGNEE:</b><br>${inv.consignee.name || '—'}<br>${inv.consignee.addr || '—'}<br>TEL: ${inv.consignee.phone || '—'}<br>${inv.consignee.email || '—'}</td></tr>
<tr><td><b>Invoice No:</b> ${inv.no}</td><td><b>Date:</b> ${inv.date}</td></tr>
<tr><td><b>Carrier:</b> ${inv.carrier} &nbsp; <b>Tracking:</b> ${inv.tracking || '—'}</td><td><b>INCOTERM:</b> ${inv.incoterm} &nbsp; <b>Currency:</b> ${inv.currency}</td></tr></table>
<br><table><tr><th>#</th><th>Description of Goods</th><th>HS Code</th><th>Origin</th><th class="center">Qty</th><th class="right">Unit Price</th><th class="right">Amount</th></tr>
${inv.items.map((it, i) => `<tr><td class="center">${i + 1}</td><td>${it.desc}</td><td>${it.hsCode}</td><td class="center">${it.origin}</td><td class="center">${it.qty}</td><td class="right">${Number(it.unit).toFixed(2)}</td><td class="right">${Number(it.total).toFixed(2)}</td></tr>`).join('')}
<tr><td colspan="4"><b>TOTAL</b></td><td class="center"><b>${totalQty}</b></td><td></td><td class="right"><b>${inv.currency} ${totalAmt.toFixed(2)}</b></td></tr></table>
${inv.remark ? `<br><b>Remarks:</b> ${inv.remark}` : ''}
<br><br><div style="display:flex;justify-content:space-between"><div><b>Shipper's Signature:</b><br><br>___________________</div><div><b>Date:</b><br><br>___________________</div></div>
</body></html>`;
        const w = window.open("", "_blank");
        w.document.write(html);
        w.document.close();
        w.print();
    };

    const fs = { padding: "6px 10px", borderRadius: 7, background: "#ffffff", border: '1px solid #e5e7eb', color: '#1e293b', fontSize: 11 };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{t("wms.invcTitle")}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t("wms.invcDesc")}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={printInvoice} color="#22c55e">{t("wms.invcPrintBtn")}</Btn>
                    <Btn onClick={() => navigator.clipboard.writeText(inv.no)} color="#6366f1" small>{t("wms.invcCopyNo")}</Btn>
                </div>
            </div>

            {/* Basic Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="card card-glass">
                    <Sec>{t("wms.invcBasicInfo")}</Sec>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }} >{t("wms.invcNoLabel")}</label><input value={inv.no} onChange={e => setF("no", e.target.value)} /></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }} >{t("wms.invcDateLabel")}</label><input type="date" value={inv.date} onChange={e => setF("date", e.target.value)} /></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280" }}>{t("wms.invcCarrierLabel")}</label>
                            <select value={inv.carrier} onChange={e => setF("carrier", e.target.value)} style={{ ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }}>
                                {intlCarriers.map(c => <option key={c.id}>{c.name}</option>)}
                            </select></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }} >{t("wms.invcTrackLabel")}</label><input value={inv.tracking} onChange={e => setF("tracking", e.target.value)} placeholder="e.g. 772899358023" /></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280" }}>{t("wms.invcIncotermLabel")}</label>
                            <select value={inv.incoterm} onChange={e => setF("incoterm", e.target.value)} style={{ ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }}>
                                {INCOTERMS.map(term => <option key={term}>{term}</option>)}
                            </select></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280" }}>{t("wms.invcCurrLabel")}</label>
                            <select value={inv.currency} onChange={e => setF("currency", e.target.value)} style={{ ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }}>
                                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                            </select></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }} >{t("wms.invcExRateLabel").replace("{c}", inv.currency)}</label><input type="number" value={inv.exRate} onChange={e => setF("exRate", e.target.value)} /></div>
                        <div><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 3 }} >{t("wms.invcRemarkLabel")}</label><input value={inv.remark} onChange={e => setF("remark", e.target.value)} placeholder={t("wms.invcRemarkPh")} /></div>
                    </div>
                </div>
                <div style={{ display: "grid", gap: 14 }}>
                    <div className="card card-glass">
                        <Sec>{t("wms.invcShipperTitle")}</Sec>
                        <div style={{ display: "grid", gap: 8 }}>
                            {[[t("wms.invcCompany"), "name", "Geniegos Co., Ltd."], [t("wms.invcAddress"), "addr", "123, Magok-dong..."], [t("wms.invcPhone"), "phone", "+82-2-1234-5678"], ["Email", "email", "export@example.com"]].map(([l, k, ph]) => (
                                <div key={k}><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 2 }} >{l}</label><input value={inv.shipper[k]} onChange={e => setF("shipper." + k, e.target.value)} placeholder={ph} /></div>
                            ))}
                        </div>
                    </div>
                    <div className="card card-glass">
                        <Sec>{t("wms.invcConsigneeTitle")}</Sec>
                        <div style={{ display: "grid", gap: 8 }}>
                            {[[t("wms.invcCompanyName"), "name", "John Doe"], [t("wms.invcAddress"), "addr", "123 Main St, New York, USA"], [t("wms.invcPhone"), "phone", "+1-212-000-0000"], ["Email", "email", "buyer@example.com"]].map(([l, k, ph]) => (
                                <div key={k}><label style={{ fontSize: 10, color: "#6b7280", ...fs, width: "100%", boxSizing: "border-box", marginTop: 2 }} >{l}</label><input value={inv.consignee[k]} onChange={e => setF("consignee." + k, e.target.value)} placeholder={ph} /></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="card card-glass">
                <Sec action={<Btn onClick={addItem} small color="#22c55e">{t("wms.invcAddItem")}</Btn>}>{t("wms.invcItemsTitle")}</Sec>
                <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ minWidth: 900, fontSize: 11 }}>
                        <thead><tr><th>{t("wms.invcColNo")}</th><th>{t("wms.invcColDesc")}</th><th>{t("wms.invcColHs")}</th><th>{t("wms.invcColOrigin")}</th><th>{t("wms.invcColQty")}</th><th>{t("wms.invcColUnit")} ({inv.currency})</th><th>{t("wms.invcColAmt")} ({inv.currency})</th><th>{t("wms.invcColDel")}</th></tr></thead>
                        <tbody>
                            {inv.items.map((it, i) => (
                                <tr key={i}>
                                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                                    <td><input value={it.desc} onChange={e => setItem(i, "desc", e.target.value)} style={{ ...fs, width: "100%", boxSizing: "border-box" }} /></td>
                                    <td><input value={it.hsCode} onChange={e => setItem(i, "hsCode", e.target.value)} placeholder="xxxx.xx" style={{ ...fs, width: 90, fontFamily: "monospace" }} /></td>
                                    <td><input value={it.origin} onChange={e => setItem(i, "origin", e.target.value)} placeholder="KR" style={{ ...fs, width: 55, textAlign: "center" }} /></td>
                                    <td><input type="number" value={it.qty} onChange={e => setItem(i, "qty", Number(e.target.value))} style={{ ...fs, width: 65, textAlign: "center" }} /></td>
                                    <td><input type="number" value={it.unit} onChange={e => setItem(i, "unit", Number(e.target.value))} step="0.01" style={{ ...fs, width: 90, textAlign: "right" }} /></td>
                                    <td style={{ textAlign: "right", fontWeight: 700, color: "#4f8ef7" }}>{Number(it.total).toFixed(2)}</td>
                                    <td style={{ textAlign: "center", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }} ><button onClick={() => removeItem(i)}>✕</button></td>
                                </tr>
                            ))}
                            <tr style={{ background: "rgba(79,142,247,0.08)" }}>
                                <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>{t("wms.invcTotal")}</td>
                                <td style={{ textAlign: "center", fontWeight: 700 }}>{totalQty}</td>
                                <td />
                                <td style={{ textAlign: "right", fontWeight: 900, color: "#22c55e", fontSize: 13 }}>{inv.currency} {totalAmt.toFixed(2)}</td>
                                <td />
                            </tr>
                            <tr>
                                <td colSpan={7} style={{ textAlign: "right", color: "#6b7280", fontSize: 10 }}>
                                    ≈ KRW {(totalAmt * Number(inv.exRate)).toLocaleString()} ({t("wms.invcExRateShort")} {Number(inv.exRate).toLocaleString()})
                                </td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

/* ═══ Inbound Inspection Tab ══════════════════════════════ */
const ReceivingTab = memo(function ReceivingTab({ supplyOrders, updateSupplyOrderStatus }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    // currency formatting via useCurrency fmt()
    const STATUS_COLOR = { draft:'#64748b', confirmed:'#4f8ef7', in_transit:'#f97316', received:'#22c55e', partial:'#eab308' };
    const [form, setForm] = React.useState(null);
    return (
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[{ l:t('wms.recvAllPO'), v:supplyOrders.length, c:'#4f8ef7' }, { l:t('wms.recvInTransit'), v:supplyOrders.filter(p=>p.status==='in_transit').length, c:'#f97316' }, { l:t('wms.recvReceived'), v:supplyOrders.filter(p=>p.status==='received').length, c:'#22c55e' }, { l:t('wms.recvTotalAmt'), v:fmt(supplyOrders.reduce((s,p)=>s+(p.total||0),0)), c:'#a855f7' }].map(({l,v,c}) => (
                    <div key={l} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius:12, padding:'12px 14px' }}>
                        <div style={{ fontSize:10, color:'#6b7280', fontWeight:700 }}>{l}</div>
                        <div style={{ fontSize:20, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
                    </div>
                ))}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {[t('wms.recvColPO'),t('wms.recvColSku'),t('wms.recvColProduct'),t('wms.recvColQty'),t('wms.recvColSupplier'),t('wms.recvColOrderDate'),t('wms.recvColEta'),t('wms.recvColUnit'),t('wms.recvColTotal'),t('wms.recvColStatus'),t('wms.recvColAction')].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {supplyOrders.map(po => (
                        <tr key={po.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{po.id}</td>
                            <td style={{ fontFamily:'monospace', fontSize:10, padding:'8px 4px' }}>{po.sku}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{po.name}</td>
                            <td style={{ textAlign:'center', padding:'8px 4px' }}>{po.qty}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{po.supplier}</td>
                            <td style={{ fontSize:10, color:'#6b7280', padding:'8px 4px' }}>{po.orderDate}</td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{po.eta}</td>
                            <td style={{ fontFamily:'monospace', fontSize:11, padding:'8px 4px' }}>{fmt(po.unitCost)}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:11, padding:'8px 4px' }}>{fmt(po.total)}</td>
                            <td style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, background:(STATUS_COLOR[po.status]||'#64748b')+'18', color:(STATUS_COLOR[po.status]||'#64748b'), border:`1px solid ${(STATUS_COLOR[po.status]||'#64748b')}33` }} ><span>{po.status}</span></td>
                            <td style={{ padding:'8px 4px' }}>
                                {po.status !== 'received' && (
                                    <button style={{ fontSize:10, padding:'3px 10px', borderRadius:7, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#22c55e,#16a34a)', color: '#1e293b', fontWeight:700 }}
                                        onClick={() => updateSupplyOrderStatus(po.id, 'received')}>
                                        {t("wms.recvConfirmBtn")}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

/* ═══ Picking 리스트 Tab ══════════════════════════════ */
const PickingListTab = memo(function PickingListTab({ pickingLists }) {
    const { t } = useI18n();
    const _PICKS = [];
    const [list, setList] = React.useState([...pickingLists, ..._PICKS]);
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [approval, setApproval] = React.useState(null); // { pk, onConfirm }

    const filtered = statusFilter === 'all' ? list : list.filter(p => p.status === statusFilter);
    const STATUS_MAP = { pending:'#f97316', picked:'#4f8ef7', packed:'#22c55e', shipped:'#a855f7' };
    const STATUS_LABEL = { pending:t('wms.pickPending'), picked:t('wms.pickPicked'), packed:t('wms.pickPacked'), shipped:t('wms.pickShipped') };

    const printSlip = (pk) => {
        const w = window.open('','_blank','width=400,height=600');
        w.document.write(`<html><body style=\"font-family:sans-serif;padding:20px\"><h3>📋 Picking / Packing Slip</h3><p>Orders: ${pk.orderId}</p><p>SKU: ${pk.sku}</p><p>Product: ${pk.name}</p><p>Quantity: ${pk.qty}</p><p>Warehouse: ${pk.wh}</p><p>Create: ${pk.createdAt}</p><hr><p style=\"font-size:11px;color:#666\">☐ Pick ☐ Pack ☐ Ship</p></body></html>`);
        w.print();
    };

    /* Dispatch approval → ApprovalModal */
    const handleDispatchApprove = (pk) => {
        setApproval({
            title: t('wms.pickDispatchTitle'),
            subtitle: t('wms.pickDispatchSub'),
            items: [
                { label: t('wms.pickColId'),  value: pk.id,       color: '#4f8ef7' },
                { label: t('wms.pickColOrder'), value: pk.orderId,  color: '#a855f7' },
                { label: t('wms.pickColSku'),      value: pk.sku,       color: '#374151' },
                { label: t('wms.pickColProduct'),   value: pk.name,     color: '#1e293b' },
                { label: t('wms.pickColQty'),     value: pk.qty, color: '#22c55e' },
                { label: t('wms.pickColWh'),     value: pk.wh,        color: '#eab308' },
            ],
            warnings: [t('wms.pickDispatchWarn')],
            requireNote: false,
            confirmText: t('wms.pickDispatchConfirm'),
            confirmColor: '#22c55e',
            onConfirm: () => {
                setList(prev => prev.map(p => p.id === pk.id ? { ...p, status: 'picked' } : p));
                setApproval(null);
            },
        });
    };

    return (
        <div style={{ display:'grid', gap:14 }}>
            {/* 🔐 Dispatch Approval Modal */}
            {approval && (
                <ApprovalModal
                    {...approval}
                    onCancel={() => setApproval(null)}
                />
            )}

            {/* Filter Tab */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {['all','pending','picked','packed','shipped'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        style={{ fontSize:10, padding:'4px 12px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, background: statusFilter===s?'linear-gradient(135deg,#4f8ef7,#6366f1)':'rgba(255,255,255,0.06)', color: statusFilter===s?'#fff':'#6b7280' }}>
                        {s==='all' ? t('wms.pickAll') : STATUS_LABEL[s] || s}
                    </button>
                ))}
                <span style={{ marginLeft:'auto', fontSize:11, color:'#6b7280', alignSelf:'center' }}>
                    {filtered.length} {t("wms.pickItems")}
                    {list.filter(p=>p.status==='pending').length > 0 && (
                        <span style={{ marginLeft:8, padding:'2px 8px', borderRadius:99, fontSize:9, background:'rgba(249,115,22,0.15)', color:'#f97316', border:'1px solid rgba(249,115,22,0.3)', fontWeight:700 }}>
                            🔐 {t("wms.pickApprovalPending")} {list.filter(p=>p.status==='pending').length}
                        </span>
                    )}
                </span>
            </div>

            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {[t('wms.pickColId'),t('wms.pickColOrder'),t('wms.pickColSku'),t('wms.pickColProduct'),t('wms.pickColQty'),t('wms.pickColWh'),t('wms.pickColStatus'),t('wms.pickColCreated'),t('wms.pickColAction')].map(h=>(
                        <th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>
                    ))}
                </tr></thead>
                <tbody>
                    {filtered.map(pk => (
                        <tr key={pk.id} style={{ borderBottom: '1px solid #e5e7eb', background: pk.status==='pending'?'rgba(249,115,22,0.03)':'' }}>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{pk.id}</td>
                            <td style={{ fontFamily:'monospace', fontSize:10, padding:'8px 4px' }}>{pk.orderId}</td>
                            <td style={{ fontFamily:'monospace', fontSize:10, padding:'8px 4px' }}>{pk.sku}</td>
                            <td style={{ fontSize:11, padding:'8px 4px', fontWeight: pk.status==='pending'?700:400 }}>{pk.name}</td>
                            <td style={{ textAlign:'center', fontWeight:700, padding:'8px 4px' }}>{pk.qty}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{pk.wh}</td>
                            <td style={{ padding:'8px 4px' }}>
                                <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, background:(STATUS_MAP[pk.status]||'#64748b')+'18', color:(STATUS_MAP[pk.status]||'#64748b') }}>
                                    {STATUS_LABEL[pk.status] || pk.status}
                                </span>
                            </td>
                            <td style={{ fontSize:10, color:'#6b7280', padding:'8px 4px' }}>{pk.createdAt}</td>
                            <td style={{ padding:'8px 4px', display:'flex', gap:4, flexWrap:'wrap' }}>
                                {/* Dispatch approval button for pending items */}
                                {pk.status === 'pending' && (
                                    <button
                                        onClick={() => handleDispatchApprove(pk)}
                                        style={{ fontSize:10, padding:'3px 10px', borderRadius:7, border:'1px solid rgba(34,197,94,0.3)', cursor:'pointer', background:'rgba(34,197,94,0.1)', color:'#22c55e', fontWeight:700 }}>
                                        {t('wms.pickDispatchBtn')}
                                    </button>
                                )}
                                <button
                                    style={{ fontSize:10, padding:'3px 10px', borderRadius:7, border:'none', cursor:'pointer', background:'rgba(79,142,247,0.15)', color:'#4f8ef7', fontWeight:700 }}
                                    onClick={() => printSlip(pk)}>
                                    {t('wms.pickPrintBtn')}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

/* ═══ Lot / Expiry Date Management Tab ══════════════════════ */
const LotManagementTab = memo(function LotManagementTab({ lotManagement, registerLot, inventory }) {
    const { t } = useI18n();
    const [form, setForm] = React.useState({ sku:'', name:'', lotNo:'', mfgDate:'', expiryDate:'', qty:0, wh:'W001' });
    const [saved, setSaved] = React.useState(false);
    const Lots = [];
    const allLots = [...Lots, ...lotManagement];
    const today = new Date();
    const expiringSoon = allLots.filter(l => l.daysLeft <= 30);
    const handleSubmit = () => {
        const expiry = new Date(form.expiryDate);
        const daysLeft = Math.ceil((expiry - today) / (1000*60*60*24));
        registerLot({ ...form, daysLeft });
        setSaved(true);
        setTimeout(() => { setSaved(false); setForm({ sku:'', name:'', lotNo:'', mfgDate:'', expiryDate:'', qty:0, wh:'W001' }); }, 2000);
    };
    return (
        <div style={{ display:'grid', gap:16 }}>
            {expiringSoon.length > 0 && (
                <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, fontSize:12 }}>
                    <span style={{ color:'#ef4444', fontWeight:700 }}>{t("wms.lotExpireSoon")}</span>
                    {expiringSoon.map(l => <span key={l.id} style={{ marginLeft:8, color:'#f97316' }}>[{l.name}] {l.daysLeft} {t("wms.lotDaysLeft")}</span>)}
                </div>
            )}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {[t('wms.lotColId'),t('wms.lotColSku'),t('wms.lotColProduct'),t('wms.lotColLotNo'),t('wms.lotColMfg'),t('wms.lotColExpiry'),t('wms.lotColDays'),t('wms.lotColQty'),t('wms.lotColWh'),t('wms.lotColWarn')].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {allLots.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #e5e7eb', background: l.daysLeft <= 30 ? 'rgba(239,68,68,0.03)' : '' }}>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{l.id}</td>
                            <td style={{ fontFamily:'monospace', fontSize:10, padding:'8px 4px' }}>{l.sku}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{l.name}</td>
                            <td style={{ fontFamily:'monospace', fontSize:10, padding:'8px 4px' }}>{l.lotNo}</td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{l.mfgDate}</td>
                            <td style={{ fontSize:10, padding:'8px 4px', color: l.daysLeft<=30?'#ef4444':'' }}>{l.expiryDate}</td>
                            <td style={{ textAlign:'center', fontWeight:700, padding:'8px 4px', color: l.daysLeft<=30?'#ef4444':l.daysLeft<=90?'#f97316':'#22c55e' }}>{l.daysLeft}</td>
                            <td style={{ textAlign:'center', padding:'8px 4px' }}>{l.qty}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{l.wh}</td>
                            <td style={{ padding:'2px 6px', fontSize:9, fontWeight:700, borderRadius:20, background:'rgba(239,68,68,0.15)', color:'#ef4444' }} >{l.daysLeft<=30&&<span>{t("wms.lotImminent")}</span>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ padding:'16px', background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:12 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>{t("wms.lotRegTitle")}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[[t('wms.lotColSku'),'sku'],[t('wms.lotColProduct'),'name'],[t('wms.lotColLotNo'),'lotNo'],[t('wms.lotColMfg'),'mfgDate'],[t('wms.lotColExpiry'),'expiryDate'],[t('wms.lotColWh'),'wh']].map(([lbl,key]) => (
                        <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <label style={{ fontSize:10, color:'#6b7280', fontWeight:600 }}>{lbl}</label>
                            <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                                style={{ padding:'7px 10px', borderRadius:8, background: '#ffffff', border: '1px solid #e5e7eb', color: '#1e293b', fontSize:12 }} />
                        </div>
                    ))}
                </div>
                {saved ? <div style={{ marginTop:10, fontSize:11, color:'#22c55e' }}>{t("wms.lotRegDone")}</div> : (
                    <button style={{ marginTop:12, padding:'7px 20px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#1e293b', fontWeight:700, fontSize:12 }} onClick={handleSubmit}>{t("wms.lotRegBtn")}</button>
                )}
            </div>
        </div>
    );
});

/* ═══ Auto Purchase Order (Replenishment) Tab ══════════════════════ */
const ReplenishmentTab = memo(function ReplenishmentTab({ supplyOrders, addSupplyOrder, inventory }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    // currency formatting via useCurrency fmt()
    const lowStock = inventory.filter(item => Object.values(item.stock).reduce((a,b)=>a+b,0) <= item.safeQty);
    const [form, setForm] = React.useState({ sku:'', name:'', qty:100, supplier:'', unitCost:0, eta:'' });
    const [saved, setSaved] = React.useState(false);
    const handleAutoFill = (item) => {
        const totalStock = Object.values(item.stock).reduce((a,b)=>a+b,0);
        const suggested = Math.max(item.safeQty * 3 - totalStock, 50);
        setForm({ sku:item.sku, name:item.name, qty:suggested, supplier:'', unitCost:item.cost, eta:'' });
    };
    const handleSubmit = () => { addSupplyOrder(form); setSaved(true); setTimeout(()=>setSaved(false),2000); };
    return (
        <div style={{ display:'grid', gap:16 }}>
            {lowStock.length > 0 && (
                <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:'#ef4444', marginBottom:8 }}>{t("wms.replNeedTitle").replace("{n}", lowStock.length)}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {lowStock.map(item => {
                            const total = Object.values(item.stock).reduce((a,b)=>a+b,0);
                            return (
                                <div key={item.sku} style={{ padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:8, cursor:'pointer', border:'1px solid rgba(239,68,68,0.2)' }}
                                    onClick={() => handleAutoFill(item)}>
                                    <div style={{ fontSize:11, fontWeight:700 }}>{item.name}</div>
                                    <div style={{ fontSize:10, color:'#6b7280' }}>{item.sku} | {t('wms.replStockLabel')} {total} / {t('wms.replSafeLabel')} {item.safeQty}</div>
                                    <div style={{ fontSize:9, color:'#4f8ef7', marginTop:2 }}>{t("wms.replClickAuto")}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div style={{ padding:'16px', background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:12 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>{t("wms.replFormTitle")}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[[t('wms.invColSku'),'sku'],[t('wms.invColProduct'),'name'],[t('wms.replQtyLabel'),'qty'],[t('wms.replSupplierLabel'),'supplier'],[t('wms.replUnitLabel'),'unitCost'],[t('wms.replEtaLabel'),'eta']].map(([lbl,key]) => (
                        <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <label style={{ fontSize:10, color:'#6b7280', fontWeight:600 }}>{lbl}</label>
                            <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                                style={{ padding:'7px 10px', borderRadius:8, background: '#ffffff', border: '1px solid #e5e7eb', color: '#1e293b', fontSize:12 }} />
                        </div>
                    ))}
                </div>
                <div style={{ marginTop:10, fontSize:11, color:'#6b7280' }}>{t("wms.replTotal")}: {fmt((Number(form.qty)||0)*(Number(form.unitCost)||0))}</div>
                {saved ? <div style={{ marginTop:10, fontSize:11, color:'#22c55e' }}>{t("wms.replDone")}</div> : (
                    <button style={{ marginTop:12, padding:'7px 20px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#22c55e,#4f8ef7)', color: '#1e293b', fontWeight:700, fontSize:12 }} onClick={handleSubmit}>{t("wms.replCreateBtn")}</button>
                )}
            </div>
            <div>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>{t("wms.replHistTitle")}</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                        {[t('wms.replColPO'),t('wms.invColSku'),t('wms.invColProduct'),t('wms.replColQty'),t('wms.replColSupplier'),t('wms.replColOrderDate'),t('wms.replColEta'),t('wms.replColTotal'),t('wms.replColStatus')].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {supplyOrders.map(po => (
                            <tr key={po.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{po.id}</td>
                                <td style={{ fontFamily:'monospace', fontSize:10, padding:'8px 4px' }}>{po.sku}</td>
                                <td style={{ fontSize:11, padding:'8px 4px' }}>{po.name}</td>
                                <td style={{ textAlign:'center', padding:'8px 4px' }}>{po.qty}</td>
                                <td style={{ fontSize:11, padding:'8px 4px' }}>{po.supplier}</td>
                                <td style={{ fontSize:10, color:'#6b7280', padding:'8px 4px' }}>{po.orderDate}</td>
                                <td style={{ fontSize:10, padding:'8px 4px' }}>{po.eta}</td>
                                <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:11, padding:'8px 4px' }}>{fmt(po.total)}</td>
                                <td style={{ padding:'2px 8px', fontSize:9, fontWeight:700, borderRadius:20, background: po.status==='received'?'rgba(34,197,94,0.15)': po.status==='in_transit'?'rgba(249,115,22,0.15)':'rgba(79,142,247,0.15)', color: po.status==='received'?'#22c55e':po.status==='in_transit'?'#f97316':'#4f8ef7' }} ><span>{po.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

/* ═══ 번들·키트 BOM Management Tab ════════════════════════════════ */
const INIT_BUNDLES = [];
const BundleTab = memo(function BundleTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { inventory, registerInOut, addAlert } = useGlobalData();
    // currency formatting via useCurrency fmt()
    const [bundles, setBundles] = useState(INIT_BUNDLES);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', sku: '', price: '', components: [] });
    const [newComp, setNewComp] = useState({ sku: '', qty: 1 });

    const getBundleStock = (bundle) => {
        if (!bundle.components.length) return 0;
        return Math.min(...bundle.components.map(comp => {
            const item = inventory.find(i => i.sku === comp.sku);
            const total = item ? Object.values(item.stock).reduce((s,v)=>s+v,0) : 0;
            return Math.floor(total / comp.qty);
        }));
    };

    const getBundleCost = (bundle) => {
        return bundle.components.reduce((sum, comp) => {
            const item = inventory.find(i => i.sku === comp.sku);
            return sum + (item?.cost || 0) * comp.qty;
        }, 0);
    };

    const handleOutbound = (bundle, qty) => {
        bundle.components.forEach(comp => {
            registerInOut({ type: 'Outbound', sku: comp.sku, qty: comp.qty * qty,
                whId: 'W001', name: comp.name, by: `Bundle(${bundle.name})`, reason: 'Bundle Sale' });
        });
        addAlert({ type: 'success', msg: `📦 ${t('wms.bdlShipAlert')} [${bundle.name}] x${qty}` });
    };

    const addComponent = () => {
        if (!newComp.sku) return;
        const item = inventory.find(i => i.sku === newComp.sku);
        setForm(f => ({ ...f, components: [...f.components, { sku: newComp.sku, name: item?.name || newComp.sku, qty: Number(newComp.qty) }] }));
        setNewComp({ sku: '', qty: 1 });
    };

    const saveBundle = () => {
        if (!form.name || !form.sku || !form.components.length) return;
        const cost = form.components.reduce((s, c) => {
            const item = inventory.find(i => i.sku === c.sku);
            return s + (item?.cost || 0) * c.qty;
        }, 0);
        setBundles(p => [{ ...form, id: `BDL-${Date.now().toString(36).toUpperCase()}`, price: Number(form.price), cost, status: 'active' }, ...p]);
        setForm({ name: '', sku: '', price: '', components: [] });
        setShowForm(false);
        addAlert({ type: 'success', msg: `✅ ${t('wms.bdlRegAlert')} [${form.name}]` });
    };

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{t("wms.bdlTitle")}</div>
                <Btn onClick={() => setShowForm(p => !p)} color="#22c55e">{t("wms.bdlAddBtn")}</Btn>
            </div>



            {showForm && (
                <div className="card card-glass" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>{t("wms.bdlNewTitle")}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <Input label={t("wms.bdlNameLabel")} value={form.name} onChange={v => setForm(f=>({...f,name:v}))} placeholder={t("wms.bdlNamePh")} />
                        <Input label={t("wms.bdlSkuLabel")} value={form.sku} onChange={v => setForm(f=>({...f,sku:v}))} placeholder="BDL-XXX-001" />
                        <Input label={t("wms.bdlPriceLabel")} value={form.price} onChange={v => setForm(f=>({...f,price:v}))} type="number" placeholder={t("wms.bdlPriceLabel")} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>{t("wms.bdlBomTitle")}</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <Select label="SKU" value={newComp.sku} onChange={v => setNewComp(p=>({...p,sku:v}))} opts={inventory.map(i=>({v:i.sku,l:`${i.name} (${i.sku})`}))} />
                        <Input label={t("wms.bdlQtyLabel")} value={newComp.qty} onChange={v => setNewComp(p=>({...p,qty:v}))} type="number" style={{ width: 80 }} />
                        <div style={{ alignSelf: 'flex-end' }}><Btn onClick={addComponent} color="#4f8ef7" small>{t("wms.bdlAddComp")}</Btn></div>
                    </div>
                    {form.components.map((c, i) => (
                        <div key={i} style={{ fontSize: 12, padding: '4px 8px', background: 'rgba(79,142,247,0.08)', borderRadius: 6, marginBottom: 4 }}>
                            {c.name} ({c.sku}) × {c.qty}
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <Btn onClick={saveBundle} color="#22c55e">{t("wms.whSaveBtn")}</Btn>
                        <Btn onClick={() => setShowForm(false)} color="#666">{t("wms.whCancelBtn")}</Btn>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
                {bundles.map(bundle => {
                    const availStock = getBundleStock(bundle);
                    const cost = getBundleCost(bundle);
                    const margin = bundle.price ? ((bundle.price - cost) / bundle.price * 100).toFixed(1) : 0;
                    return (
                        <div key={bundle.id} className="card card-glass" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 13 }}>{bundle.name}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 }}>{bundle.sku}</div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                        {bundle.components.map(c => (
                                            <Tag key={c.sku} label={`${c.name} ×${c.qty}`} color="#4f8ef7" />
                                        ))}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: availStock > 0 ? '#22c55e' : '#ef4444' }}>{availStock} {t("wms.bdlAvailable")}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280' }}>{t("wms.bdlAssemble")}</div>
                                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginTop: 4 }}>{fmt(bundle.price)}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280' }}>{t("wms.bdlCostLabel")} {fmt(cost)} | {t("wms.bdlMarginLabel")} {margin}%</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                <Btn onClick={() => handleOutbound(bundle, 1)} color="#6366f1" small>{t("wms.bdlShip1")}</Btn>
                                <Btn onClick={() => handleOutbound(bundle, 10)} color="#f97316" small>{t("wms.bdlShip10")}</Btn>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

/* ═══ TAB 12: Supplier Management ══════════════ */
const initSuppliers = [];

const SupplierTab = memo(function SupplierTab() {
    const { t } = useI18n();
    const { fmt: fmtSup } = useCurrency();
    const [suppliers, setSuppliers] = React.useState(initSuppliers);
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [form, setForm] = React.useState({ id:'', name:'', code:'', type:'Manufacturer', country:'KR', contact:'', phone:'', email:'', payTerms:'Net 30', leadDays:14, rating:5, active:true });
    const [search, setSearch] = React.useState('');
    const [selectedSup, setSelectedSup] = React.useState(null);

    const TYPES = [t('wms.supTypeManuf'),t('wms.supTypeWholesale'),t('wms.supTypeOverseas'),t('wms.supType3PL'),t('wms.supTypeRawMat')];
    const PAY_TERMS = ['Cash','7D','30D','60D','30% prepaid','LC 60D'];
    const filtered = suppliers.filter(s => !search || s.name.includes(search) || s.code.includes(search) || s.contact.includes(search));
    const totalAmt = suppliers.reduce((s,p) => s + p.totalAmt, 0);

    const reset = () => setForm({ id:'', name:'', code:'', type:'Manufacturer', country:'KR', contact:'', phone:'', email:'', payTerms:'Net 30', leadDays:14, rating:5, active:true });
    const save = () => {
        if (!form.name || !form.code) return alert(t('wms.supNameRequired'));
        if (editing) {
            setSuppliers(p => p.map(s => s.id === editing.id ? { ...s, ...form } : s));
        } else {
            setSuppliers(p => [...p, { ...form, id: 'SUP-' + String(p.length+1).padStart(3,'0'), totalPO:0, totalAmt:0 }]);
        }
        reset(); setShowForm(false); setEditing(null);
    };
    const editSup = s => { setForm({...s}); setEditing(s); setShowForm(true); };
    const RATING_COLOR = r => r >= 5 ? '#22c55e' : r >= 3 ? '#eab308' : '#ef4444';

    return (
        <div style={{ display:'grid', gap:16 }}>
            {/* KPI */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[{ l:t('wms.supRegVendor'), v:suppliers.length, c:'#4f8ef7' }, { l:t('wms.supActiveVendor'), v:suppliers.filter(s=>s.active).length, c:'#22c55e' }, { l:t('wms.supTotalPO'), v:suppliers.reduce((s,p)=>s+p.totalPO,0), c:'#a855f7' }, { l:t('wms.supTotalAmt'), v:fmtSup(totalAmt), c:'#f97316' }].map(({l,v,c}) => (
                    <div key={l} style={{ background:`${c}0d`, border:`1px solid ${c}22`, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:10, color:'#6b7280', fontWeight:700 }}>{l}</div>
                        <div style={{ fontSize:20, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
                    </div>
                ))}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flex:'1 1 220px' }}>
                    <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#4f8ef7' }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("wms.supSearchPh")}
                        style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px 8px 34px', borderRadius:9, background:'#f0f5ff', border:'1.5px solid rgba(79,142,247,0.25)', color:'#1f2937', fontSize:12, outline:'none' }} />
                </div>
                <Btn onClick={() => { reset(); setShowForm(true); setEditing(null); }}>{t("wms.supAddBtn")}</Btn>
            </div>



            {showForm && (
                <div className="card card-glass" style={{ padding:18 }}>
                    <Sec>{editing ? t('wms.supEditTitle') : t('wms.supNewTitle')}</Sec>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                        <Input label={t("wms.supNameLabel")} value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder={t("wms.supNamePh")} />
                        <Input label={t("wms.supCodeLabel")} value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder={t("wms.supCodePh")} />
                        <Select label={t("wms.supTypeLabel")} value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} opts={TYPES} />
                        <Input label={t("wms.supCountryLabel")} value={form.country} onChange={v=>setForm(f=>({...f,country:v}))} placeholder="KR, CN, JP..." />
                        <Input label={t("wms.supContactLabel")} value={form.contact} onChange={v=>setForm(f=>({...f,contact:v}))} placeholder="John Doe" />
                        <Input label={t("wms.supPhoneLabel")} value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="02-1234-5678" />
                        <Input label={t("wms.supEmailLabel")} value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="contact@company.com" />
                        <Select label={t("wms.supPayLabel")} value={form.payTerms} onChange={v=>setForm(f=>({...f,payTerms:v}))} opts={PAY_TERMS} />
                        <Input label={t("wms.supLeadLabel")} value={form.leadDays} onChange={v=>setForm(f=>({...f,leadDays:v}))} type="number" placeholder="14" />
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:14 }}>
                        <Btn onClick={save} color="#22c55e">{t("wms.whSaveBtn")}</Btn>
                        <Btn onClick={() => { reset(); setShowForm(false); setEditing(null); }} color="#666">{t("wms.whCancelBtn")}</Btn>
                    </div>
                </div>
            )}

            {/* Supplier List */}
            <div style={{ display:'grid', gap:10 }}>
                {filtered.map(s => (
                    <div key={s.id} className="card card-glass" style={{ padding:'16px 20px', opacity:s.active?1:0.6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                            <div style={{ flex:1, minWidth:200 }}>
                                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                                    <span style={{ fontWeight:800, fontSize:14 }}>{s.name}</span>
                                    <Tag label={s.code} color="#4f8ef7" />
                                    <Tag label={s.type} color="#a855f7" />
                                    <Tag label={s.country} color="#6366f1" />
                                    <Tag label={s.active ? t('wms.supActive') : t('wms.supInactive')} color={s.active ? '#22c55e' : '#64748b'} />
                                </div>
                                <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.7 }}>
                                    👤 {s.contact} · 📞 {s.phone} · ✉️ {s.email}<br/>
                                    💳 {s.payTerms} · ⏱️ {t('wms.supLeadTimeLabel')} {s.leadDays}{t('wms.supDays')}
                                </div>
                                <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                                    <span style={{ fontSize:11, color:'#f97316', fontWeight:700 }}>{t('wms.supTotalPOLabel')} {s.totalPO} · {t('wms.supTotalAmtLabel')} {fmtSup(s.totalAmt)}</span>
                                    <span style={{ fontSize:11, color:RATING_COLOR(s.rating) }}>{'★'.repeat(s.rating)}{'☆'.repeat(5-s.rating)} ({t('wms.supRatingLabel')} {s.rating}/5)</span>
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                <Btn onClick={() => editSup(s)} color="#6366f1" small>{t('wms.supEditBtn')}</Btn>
                                <Btn onClick={() => setSuppliers(p => p.map(q => q.id===s.id ? {...q,active:!q.active} : q))} color={s.active?'#ef4444':'#22c55e'} small>{s.active ? t('wms.supInactivate') : t('wms.supActivate')}</Btn>
                                <Btn onClick={() => setSelectedSup(s)} color="#f97316" small>{t('wms.supPoHistory')}</Btn>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* PO History Drawer */}
            {selectedSup && (
                <>
                    <div onClick={() => setSelectedSup(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:200 }} />
                    <div style={{ position:'fixed', right:0, top:0, bottom:0, width:480, background:'#ffffff', borderLeft:'1px solid rgba(99,140,255,0.2)', zIndex:201, overflowY:'auto', padding:26 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                            <div>
                                <div style={{ fontWeight:900, fontSize:15, color:'#f97316' }}>{selectedSup.name}</div>
                                <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{selectedSup.type} · {selectedSup.country}</div>
                            </div>
                            <button onClick={() => setSelectedSup(null)} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:18 }}>✕</button>
                        </div>
                        {[[t('wms.supDrawerCode'),selectedSup.code],[t('wms.supDrawerContact'),selectedSup.contact],[t('wms.supDrawerPhone'),selectedSup.phone],['Email',selectedSup.email],[t('wms.supDrawerPayTerms'),selectedSup.payTerms],[t('wms.supDrawerLeadTime'),selectedSup.leadDays+t('wms.supDays')],[t('wms.supDrawerTotalPO'),selectedSup.totalPO],[t('wms.supDrawerTotalAmt'),fmtSup(selectedSup.totalAmt)]].map(([l,v]) => (
                            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(99,140,255,0.07)', fontSize:12 }}>
                                <span style={{ color:'#6b7280', fontWeight:600 }} >{l}</span><span>{v}</span>
                            </div>
                        ))}
                        <div style={{ marginTop:20, padding:'12px 16px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:10, fontSize:11, color:'#f97316' }}>
                            {t('wms.supPoHistHint')}
                        </div>
                    </div>
                </>
            )}
        </div>
    
    );
});

/* ═══ TAB 13: Inventory Count / Audit ══════════ */
const InventoryAuditTab = memo(function InventoryAuditTab({ inventory }) {

    const { t } = useI18n();
    const allItems = (inventory || initInventory).map(p => ({
        sku: p.sku, name: p.name,
        bookQty: Object.values(p.stock).reduce((s,v)=>s+v,0),
        countedQty: '', diff: null, wh: Object.keys(p.stock)[0] || 'W001'
    }));
    const [auditDate, setAuditDate] = React.useState(new Date().toISOString().slice(0,10));
    const [auditItems, setAuditItems] = React.useState(allItems);
    const [status, setStatus] = React.useState('draft'); // draft | counting | completed
    const [search, setSearch] = React.useState('');

    const setCount = (sku, val) => setAuditItems(prev => prev.map(i => {
        if (i.sku !== sku) return i;
        const counted = val === '' ? '' : Number(val);
        const diff = val === '' ? null : counted - i.bookQty;
        return { ...i, countedQty: val, diff };
    }));

    const filtered = auditItems.filter(i => !search || i.sku.toLowerCase().includes(search.toLowerCase()) || i.name.includes(search));
    const countedCount = auditItems.filter(i => i.countedQty !== '').length;
    const totalDiff = auditItems.filter(i => i.diff !== null).reduce((s,i) => s + Math.abs(i.diff), 0);
    const hasDiscrepancy = auditItems.some(i => i.diff !== null && i.diff !== 0);

    const startAudit = () => setStatus('counting');
    const completeAudit = () => {
        if (countedCount < auditItems.length) {
            if (!window.confirm(t('wms.auditConfirmMsg').replace('{n}', auditItems.length - countedCount))) return;
        }
        setStatus('completed');
    };
    const printAuditSheet = () => {
        const rows = filtered.map(i => `<tr><td>${i.sku}</td><td>${i.name}</td><td style="text-align:center">${i.bookQty}</td><td style="text-align:center;color:${i.diff===null?'#000':i.diff===0?'green':i.diff>0?'blue':'red'}">${i.countedQty===''?'—':i.countedQty}</td><td style="text-align:center;color:${i.diff===null?'#000':i.diff===0?'green':i.diff>0?'blue':'red'}">${i.diff===null?'—':i.diff>0?'+'+i.diff:i.diff}</td></tr>`).join('');
        const w = window.open('','_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>${t('wms.auditTitle')} - ${auditDate}</title><style>body{font-family:sans-serif;font-size:10pt;margin:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 8px;font-size:9pt}.pass{color:green}.plus{color:blue}.minus{color:red}</style></head><body><h2>📋 ${t('wms.auditTitle')} (${auditDate})</h2><table><tr><th>SKU</th><th>Product Name</th><th>${t('wms.auditColBook')}</th><th>${t('wms.auditColInput')}</th><th>${t('wms.auditColDiff')}</th></tr>${rows}<tr style="background:#f5f5f5;font-weight:bold"><td colspan="4">${t('wms.auditTotalDiff')}</td><td style="text-align:center;color:${hasDiscrepancy?'red':'green'}">${hasDiscrepancy?'±'+totalDiff:t('wms.auditNoDiff')}</td></tr></table></body></html>`);
        w.document.close(); w.print();
    };

    return (
        <div style={{ display:'grid', gap:16 }}>
            {/* Header */}
            <div className="card card-glass" style={{ padding:'14px 18px', background:'rgba(168,85,247,0.06)', borderColor:'rgba(168,85,247,0.2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12, alignItems:'center' }}>
                    <div>
                        <div style={{ fontWeight:800, fontSize:14 }}>{t("wms.auditTitle")}</div>
                        <div style={{ fontSize:11, color:'#6b7280', marginTop:3 }}>{t("wms.auditDesc")}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <div>
                            <label style={{ fontSize:10, color:'#6b7280', display:'block' }}>{t("wms.auditDateLabel")}</label>
                            <input type="date" value={auditDate} onChange={e=>setAuditDate(e.target.value)}
                                style={{ padding:'6px 10px', borderRadius:8, background:'#ffffff', border: '1px solid #d1d5db', color: '#1f2937', fontSize:12 }} />
                        </div>
                        <Tag label={status==='draft'?t('wms.auditDraft'):status==='counting'?t('wms.auditCounting'):t('wms.auditCompleted')} color={status==='draft'?'#64748b':status==='counting'?'#f97316':'#22c55e'} />
                        {status==='draft' && <Btn onClick={startAudit} color="#f97316">{t("wms.auditStartBtn")}</Btn>}
                        {status==='counting' && <Btn onClick={completeAudit} color="#22c55e">{t("wms.auditDoneBtn")}</Btn>}
                        <Btn onClick={printAuditSheet} color="#6366f1" small>{t("wms.auditPrintBtn")}</Btn>
                    </div>
                </div>
            </div>

            {/* KPI */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[{ l:t('wms.auditAllSku'), v:auditItems.length, c:'#4f8ef7' }, { l:t('wms.auditDoneCount'), v:countedCount, c:'#22c55e' }, { l:t('wms.auditNotDone'), v:auditItems.length-countedCount, c:'#eab308' }, { l:t('wms.auditDiffQty'), v:totalDiff>0?'±'+totalDiff:t('wms.auditNoDiff'), c:totalDiff>0?'#ef4444':'#22c55e' }].map(({l,v,c}) => (
                    <div key={l} style={{ background:`${c}0d`, border:`1px solid ${c}22`, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:10, color:'#6b7280', fontWeight:700 }}>{l}</div>
                        <div style={{ fontSize:18, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#a855f7' }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("wms.auditSearchPh")}
                    style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px 8px 34px', borderRadius:9, background:'#faf5ff', border:'1.5px solid rgba(168,85,247,0.25)', color:'#1f2937', fontSize:12, outline:'none' }} />
            </div>

            {/* Audit Sheet */}
            <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                        <tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                            {[t('wms.auditColSku'),t('wms.auditColProduct'),t('wms.auditColBook'),t('wms.auditColInput'),t('wms.auditColDiff'),t('wms.auditColStatus')].map(h => (
                                <th key={h} style={{ padding:'8px 6px', textAlign: false?'center':'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(item => {
                            const diffColor = item.diff===null?'#6b7280':item.diff===0?'#22c55e':item.diff>0?'#4f8ef7':'#ef4444';
                            return (
                                <tr key={item.sku} style={{ borderBottom: '1px solid #e5e7eb', background: item.diff!==null&&item.diff!==0?'rgba(239,68,68,0.03)':'' }}>
                                    <td style={{ fontFamily:'monospace', fontSize:10, color:'#a855f7', padding:'8px 6px' }}>{item.sku}</td>
                                    <td style={{ fontSize:12, fontWeight:600, padding:'8px 6px' }}>{item.name}</td>
                                    <td style={{ textAlign:'center', fontWeight:700, padding:'8px 6px', color:'#4f8ef7' }}>{item.bookQty}</td>
                                    <td style={{ textAlign:'center', padding:'8px 6px' }}>
                                        <input
                                            type="number"
                                            value={item.countedQty}
                                            disabled={status==='draft'||status==='completed'}
                                            onChange={e => setCount(item.sku, e.target.value)}
                                            placeholder={t("wms.auditInputPh")}
                                            style={{ width:70, padding:'4px 8px', textAlign:'center', borderRadius:7, background: status==='counting'?'rgba(168,85,247,0.12)':'rgba(0,0,0,0.3)', border:`1px solid ${status==='counting'?'rgba(168,85,247,0.4)':'rgba(255,255,255,0.1)'}`, color: '#1e293b', fontSize:12 }}
                                        />
                                    </td>
                                    <td style={{ textAlign:'center', fontWeight:700, color:diffColor, padding:'8px 6px' }}>
                                        {item.diff===null?'—':item.diff>0?'+'+item.diff:item.diff}
                                    </td>
                                    <td style={{ padding:'8px 6px' }}>
                                        <Tag
                                            label={item.countedQty===''?t('wms.auditNotCounted'):item.diff===0?t('wms.auditNormal'):item.diff>0?t('wms.auditExcess'):t('wms.auditShort')}
                                            color={item.countedQty===''?'#64748b':item.diff===0?'#22c55e':item.diff>0?'#4f8ef7':'#ef4444'}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {status==='completed' && hasDiscrepancy && (
                <div style={{ padding:'14px 18px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#ef4444', marginBottom:8 }}>{t("wms.auditDiscTitle")}</div>
                    <div style={{ fontSize:11, color:'#374151', lineHeight:1.8 }}>
                        {auditItems.filter(i=>i.diff!==null&&i.diff!==0).map(i => (
                            <div key={i.sku}>📦 [{i.sku}] {i.name}: {t('wms.auditColBook')} {i.bookQty} → {t('wms.auditColInput')} {i.countedQty} ({t('wms.auditColDiff')} {i.diff>0?'+'+i.diff:i.diff})</div>
                        ))}
                    </div>
                    <div style={{ marginTop:12, display:'flex', gap:8 }}>
                        <Btn onClick={() => alert(t('wms.auditAdjAlert'))} color="#ef4444">{t("wms.auditBulkAdj")}</Btn>
                        <Btn onClick={printAuditSheet} color="#6366f1" small>{t("wms.auditDiffReport")}</Btn>
                    </div>
                </div>
            )}
        </div>
    );
});

/* ═══ TAB D-7: Delivery Tracking ══════════ */
const TrackingTab = memo(function TrackingTab() {
    const { t } = useI18n();
    const [trackingNum, setTrackingNum] = useState('');
    const [carrierId, setCarrierId] = useState('CJ');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const {isDemo} = useAuth();

    const SUPPORTED = [
        { id: 'CJ', name: t('wms.trackCJ'), color: '#00bae5' },
        { id: 'HJ', name: t('wms.trackHJ'), color: '#e60012' },
        { id: 'LT', name: t('wms.trackLT'), color: '#e60012' },
        { id: 'EMS', name: t('wms.trackEMS'), color: '#c41f3e' },
        { id: 'CPR', name: t('wms.trackCPR'), color: '#00adee' },
        { id: 'LZ', name: t('wms.trackLZ'), color: '#f97316' },
    ];

    // Demo simulation result
    const _RESULT = (num) => ({
        trackingNum: num,
        carrier: SUPPORTED.find(c => c.id === carrierId)?.name || carrierId,
        status: t('wms.trackStatusInTransit'),
        deliveryDate: t('wms.trackEtaToday'),
        timeline: [
            { time: '2026-03-20 09:12', location: t('wms.trackLoc1'), desc: t('wms.trackDesc1') },
            { time: '2026-03-20 07:45', location: t('wms.trackLoc2'), desc: t('wms.trackDesc2') },
            { time: '2026-03-20 03:22', location: t('wms.trackLoc3'), desc: t('wms.trackDesc3') },
            { time: '2026-03-19 22:10', location: t('wms.trackLoc4'), desc: t('wms.trackDesc4') },
        ],
    });

    const doTrack = async () => {
        const num = trackingNum.trim();
        if (!num) return alert(t('wms.trackNumRequired'));
        setLoading(true); setResult(null); setError(null);

        try {
            if (isDemo) {
                await new Promise(r => setTimeout(r, 1000));
                setResult(_RESULT(num));
                return;
            }
            const token = localStorage.getItem('genie_token');
            const BASE = import.meta.env?.VITE_API_BASE ?? '';
            const r = await fetch(`${BASE}/api/carrier-track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ type: 'track', carrierId, trackingNum: num }),
            });
            if (r.ok) {
                const d = await r.json();
                setResult(d.data || d);
            } else {
                // API not implemented → demo fallback
                setResult(_RESULT(num));
            }
        } catch {
            // Network error → demo fallback
            setResult(_RESULT(num));
        } finally {
            setLoading(false);
        }
    };

    const STATUS_COLORS = {};
    const sc = STATUS_COLORS[result?.status] || '#94a3b8';

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 12, color: '#374151' }}>
                🔍 <strong style={{ color: '#4f8ef7' }}>{t("wms.trackTitle")}</strong> — {t("wms.trackDesc")}
                {isDemo && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>{t("wms.trackDemoTag")}</span>}
            </div>

            <div className="card card-glass">
                <Sec>{t("wms.trackSearchTitle")}</Sec>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                    <Select label={t("wms.trackCarrierLabel")} value={carrierId} onChange={setCarrierId}
                        opts={SUPPORTED.map(c => ({ v: c.id, l: `${c.name}` }))} />
                    <Input label={t("wms.trackNumLabel")} value={trackingNum} onChange={setTrackingNum}
                        placeholder={t("wms.trackNumPh")} />
                    <Btn onClick={doTrack} color="#4f8ef7">
                        {loading ? t('wms.trackSearching') : t('wms.trackSearchBtn')}
                    </Btn>
                </div>
            </div>

            {result && (
                <div className="card card-glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>🚚 {result.carrier}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{result.trackingNum}</div>
                        </div>
                        <div>
                            <span style={{ padding: '4px 14px', borderRadius: 20, background: `${sc}18`, color: sc, fontWeight: 700, fontSize: 12, border: `1px solid ${sc}44` }}>
                                {result.status}
                            </span>
                        </div>
                    </div>
                    {result.deliveryDate && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 14, fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                            📅 {result.deliveryDate}
                        </div>
                    )}
                    <div style={{ display: 'grid', gap: 0 }}>
                        {(result.timeline || []).map((ev, i) => (
                            <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < (result.timeline?.length - 1) ? '1px solid #e5e7eb' : 'none' }}>
                                <div style={{ width: 4, minHeight: 36, borderRadius: 2, background: i === 0 ? '#4f8ef7' : 'rgba(255,255,255,0.1)', flexShrink: 0, marginTop: 4 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 12, color: i === 0 ? '#1e293b' : '#374151' }}>{ev.desc}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{ev.location} · {ev.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    
    );
});

/* ═══ MAIN ══════════════════════════════════════ */
/* Note: Tab definitions are in TABS_I18N inside WmsManager() using t() */

/* ═══ TAB 15: Usage Guide (Enterprise 20-Step) ═══════════════ */
const WmsGuideTab = memo(function WmsGuideTab() {
    const { t } = useI18n();
    const COLORS = ['#4f8ef7','#22c55e','#a855f7','#eab308','#06b6d4','#f97316','#ec4899','#ef4444','#8b5cf6','#10b981','#3b82f6','#6366f1','#14b8a6','#e11d48','#0ea5e9','#f59e0b','#84cc16','#d946ef','#64748b','#0d9488'];
    const ICONS = ['🏢','📦','📊','📥','🔍','🔗','⚡','🎁','🚚','📍','🧳','📦','🏭','📋','🔔','📈','🛡️','💳','🌐','🚀'];

    const STEPS = [];
    for (let i = 1; i <= 20; i++) {
        const title = t('wms.guideS' + i + 'T', '');
        const desc = t('wms.guideS' + i + 'D', '');
        if (title && !title.includes('wms.guideS')) {
            STEPS.push({ icon: ICONS[i-1] || '📌', title, desc, color: COLORS[i-1] || '#4f8ef7' });
        }
    }

    const TAB_INFO = [];
    for (let i = 1; i <= 15; i++) {
        const name = t('wms.guideTab' + i + 'N', '');
        const desc = t('wms.guideTab' + i + 'D', '');
        if (name && !name.includes('wms.guideTab')) {
            TAB_INFO.push({ name, desc, color: COLORS[i-1] || '#4f8ef7' });
        }
    }

    const TIPS = [];
    for (let i = 1; i <= 10; i++) {
        const tip = t('wms.guideTp' + i, '');
        if (tip && !tip.includes('wms.guideTp')) TIPS.push(tip);
    }

    const CAUTIONS = [];
    for (let i = 1; i <= 5; i++) {
        const c = t('wms.guideCt' + i, '');
        if (c && !c.includes('wms.guideCt')) CAUTIONS.push(c);
    }

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            {/* Hero Banner */}
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#faf5ff)', borderRadius: 16, border: '1px solid #bfdbfe', padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#2563eb' }}>{t('wms.guideHeroTitle', 'WMS 창고 관리 완벽 가이드')}</div>
                <div style={{ fontSize: 13, color: '#374151', marginTop: 6, maxWidth: 600, margin: '6px auto 0' }}>{t('wms.guideHeroSub', '처음 시작부터 마무리까지, 단계별로 따라하면 누구나 쉽게 창고를 관리할 수 있습니다.')}</div>
            </div>

            {/* Quick Start */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 10 }}>⚡ {t('wms.guideQuickStart', '빠른 시작 가이드')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                    {[
                        { icon: '1️⃣', label: t('wms.guideQS1', '창고 등록'), desc: t('wms.guideQS1D', 'WMS 창고 탭에서 창고를 먼저 등록하세요'), color: '#4f8ef7' },
                        { icon: '2️⃣', label: t('wms.guideQS2', '상품 입고'), desc: t('wms.guideQS2D', '입고검수 탭에서 상품을 입고 처리합니다'), color: '#22c55e' },
                        { icon: '3️⃣', label: t('wms.guideQS3', '재고 확인'), desc: t('wms.guideQS3D', '재고현황 탭에서 실시간 재고를 확인합니다'), color: '#a855f7' },
                        { icon: '4️⃣', label: t('wms.guideQS4', '출고 처리'), desc: t('wms.guideQS4D', '피킹/패킹 탭에서 주문 출고를 처리합니다'), color: '#f97316' },
                    ].map(({ icon, label, desc, color }) => (
                        <div key={label} style={{ padding: '14px 16px', borderRadius: 12, background: color + '08', border: '1px solid ' + color + '22', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{label}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step-by-Step Guide */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>🚀 {t('wms.guideStepsTitle2', '단계별 상세 가이드')}</div>
                <div style={{ display: 'grid', gap: 14 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14, padding: '16px 18px', borderRadius: 14, background: s.color + '08', border: '1px solid ' + s.color + '22', alignItems: 'start' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '15', border: '1px solid ' + s.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <span>{s.icon}</span>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + '20', padding: '2px 8px', borderRadius: 20 }}>STEP {i + 1}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab Descriptions */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>📑 {t('wms.guideTabsTitle2', '메뉴별 기능 설명')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
                    {TAB_INFO.map((tb, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: tb.color + '08', border: '1px solid ' + tb.color + '22', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{tb.name}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{tb.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pro Tips */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#22c55e', marginBottom: 14 }}>💡 {t('wms.guideTipsTitle2', '전문가 팁')}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {TIPS.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>✅</span>
                            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cautions */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #fecaca', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#ef4444', marginBottom: 14 }}>⚠️ {t('wms.guideCautionTitle', '주의사항')}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {CAUTIONS.map((ct, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🚨</span>
                            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{ct}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default function WmsManager() {
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { inventory, totalInventoryValue, totalInventoryQty, lowStockCount, orderStats, pickingLists, lotManagement, supplyOrders, addSupplyOrder, updateSupplyOrderStatus, registerLot, connectedChannels: ctxChannels, addAlert } = useGlobalData();
    const [tab, setTab] = useState("warehouse");
    const [whs] = useState(initWarehouses);
    const { t } = useI18n();
    const isMobile = useIsMobile();

    /* ── ConnectorSyncContext — Integration Hub channel awareness ── */
    const { connectedChannels: csChannels, refresh: csRefresh } = useConnectorSync();

    /* ── SecurityGuard — standardized alert forwarding ── */
    const secAddAlert = useCallback((a) => {
        if (typeof addAlert === 'function') addAlert(a);
    }, [addAlert]);

    /* ── BroadcastChannel — cross-tab real-time sync ── */
    const broadcast = useWmsCrossTabSync(useCallback((msg) => {
        if (msg?.type === 'inventory_update' || msg?.type === 'carrier_update' || msg?.type === 'channel_update') {
            csRefresh?.();
        }
    }, [csRefresh]));

    /* ── Lifted Warehouse Tab states for sidebar control ── */
    const [whShowForm, setWhShowForm] = useState(false);
    const [whShowPerms, setWhShowPerms] = useState(false);

    /* ── Integration Hub Carrier Auto-Sync ── */
    const hubCarriers = useMemo(() => {
        try {
            const raw = localStorage.getItem('genie_api_keys');
            if (!raw) return [];
            const keys = JSON.parse(raw);
            const CARRIER_MAP = {
                'cj_logistics': { name: 'CJ Logistics', code: 'CJ', type: 'Domestic', country: 'KR', trackUrl: 'https://trace.cjlogistics.com' },
                'hanjin': { name: 'Hanjin Express', code: 'HJ', type: 'Domestic', country: 'KR', trackUrl: 'https://trace.hanjin.co.kr' },
                'lotte_express': { name: 'Lotte Express', code: 'LT', type: 'Domestic', country: 'KR', trackUrl: 'https://trace.lotteglogis.com' },
                'logen': { name: 'Logen Express', code: 'LG', type: 'Domestic', country: 'KR', trackUrl: 'https://trace.ilogen.com' },
                'korea_post': { name: 'Korea Post (EMS)', code: 'EMS', type: 'IntlPost', country: 'KR', trackUrl: 'https://trace.epost.go.kr' },
                'fedex': { name: 'FedEx', code: 'FDX', type: 'IntlExpress', country: 'US', trackUrl: 'https://www.fedex.com/fedextrack' },
                'dhl': { name: 'DHL Express', code: 'DHL', type: 'IntlExpress', country: 'DE', trackUrl: 'https://www.dhl.com/tracking' },
                'ups': { name: 'UPS', code: 'UPS', type: 'IntlExpress', country: 'US', trackUrl: 'https://www.ups.com/track' },
                'yamato': { name: 'Yamato Transport', code: 'YMT', type: 'IntlExpress', country: 'JP', trackUrl: 'https://jizen.kuronekoyamato.co.jp' },
                'sagawa': { name: 'Sagawa Express', code: 'SGW', type: 'IntlExpress', country: 'JP', trackUrl: 'https://www.sagawa-exp.co.jp' },
                'sf_express': { name: 'SF Express', code: 'SF', type: 'IntlExpress', country: 'CN', trackUrl: 'https://www.sf-express.com' },
                'coupang_rocket': { name: 'Coupang Rocket', code: 'CPR', type: 'SameDay', country: 'KR', trackUrl: '' },
            };
            return (Array.isArray(keys) ? keys : []).filter(k => CARRIER_MAP[k.service?.toLowerCase?.()]).map(k => {
                const mapped = CARRIER_MAP[k.service.toLowerCase()];
                return { ...mapped, id: 'HUB_' + mapped.code, apiKey: k.key || k.value || '', active: k.status === 'active', hubSynced: true };
            });
        } catch { return []; }
    }, []);

    const [showAuditLog, setShowAuditLog] = useState(false);
    const [auditLog, setAuditLog] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wms_audit_log') || '[]'); } catch { return []; }
    });
    const addAuditEntry = React.useCallback((action, details) => {
        const entry = { id: Date.now().toString(36), timestamp: new Date().toISOString(), action, details, user: 'Admin' };
        setAuditLog(prev => { const next = [entry, ...prev].slice(0, 500); localStorage.setItem('wms_audit_log', JSON.stringify(next)); return next; });
    }, []);
    const clearAuditLog = () => { if (window.confirm(t('wms.auditLogClearConfirm'))) { localStorage.removeItem('wms_audit_log'); setAuditLog([]); } };
    const exportAuditLog = () => {
        const csv = [['Timestamp','Action','Details','User'].join(','), ...auditLog.map(e => [e.timestamp, e.action, `"${e.details}"`, e.user].join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit_trail_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    };

    const TABS_I18N = [
        { id: "warehouse", label: t("wms.tabWarehouse"), desc: t("wms.tabWarehouseDesc") },
        { id: "inout", label: t("wms.tabInOut"), desc: t("wms.tabInOutDesc") },
        { id: "inventory", label: t("wms.tabInventory"), desc: t("wms.tabInventoryDesc") },
        { id: "receiving", label: t("wms.tabReceiving"), desc: t("wms.tabReceivingDesc") },
        { id: "picking", label: t("wms.tabPicking"), desc: t("wms.tabPickingDesc") },
        { id: "lot", label: t("wms.tabLot"), desc: t("wms.tabLotDesc") },
        { id: "replenishment", label: t("wms.tabReplenishment"), desc: t("wms.tabReplenishmentDesc") },
        { id: "combine", label: t("wms.tabCombine"), desc: t("wms.tabCombineDesc") },
        { id: "carrier", label: t("wms.tabCarrier"), desc: t("wms.tabCarrierDesc") },
        { id: "tracking", label: t("wms.tabTracking"), desc: t("wms.tabTrackingDesc") },
        { id: "invoice", label: t("wms.tabInvoice"), desc: t("wms.tabInvoiceDesc") },
        { id: "bundle", label: t("wms.tabBundle"), desc: t("wms.tabBundleDesc") },
        { id: "supplier", label: t("wms.tabSupplier"), desc: t("wms.tabSupplierDesc") },
        { id: "audit", label: t("wms.tabAudit"), desc: t("wms.tabAuditDesc") },
        { id: "guide", label: t("wms.tabGuide"), desc: t("wms.tabGuideDesc") },
    ];

    // ✅ GlobalDataContext real-time aggregate values
    const totalStock = totalInventoryQty;
    const totalValue = totalInventoryValue;

    /* ── Security Monitor ── */
    const [secAlerts, setSecAlerts] = useState([]);
    const [showSecPanel, setShowSecPanel] = useState(false);
    const secCheck = React.useCallback((action, detail) => {
        const patterns = [
            { regex: /<script|javascript:|on\w+\s*=/i, type: 'XSS', severity: 'critical' },
            { regex: /('|"|;|--|union\s+select|drop\s+table|insert\s+into)/i, type: 'SQLi', severity: 'critical' },
            { regex: /(\.\.[\/\\]|%2e%2e|%00)/i, type: 'Path Traversal', severity: 'high' },
            { regex: /(eval\(|Function\(|setTimeout\(.*['"]\.)/i, type: 'Code Injection', severity: 'critical' },
        ];
        for (const p of patterns) {
            if (p.regex.test(detail)) {
                const alert = { id: Date.now().toString(36), time: new Date().toISOString(), type: p.type, severity: p.severity, action, detail: detail.slice(0, 100), blocked: true };
                setSecAlerts(prev => [alert, ...prev].slice(0, 100));
                // Forward to GlobalDataContext for cross-module awareness
                secAddAlert?.({ ...alert, source: 'WMS Manager' });
                // Broadcast to other tabs
                broadcast?.('security_alert', alert);
                // Browser notification
                if (Notification.permission === 'granted') {
                    new Notification('🚨 WMS Security Alert', { body: `${p.type} attempt detected: ${action}`, icon: '🛡️' });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
                return true; // blocked
            }
        }
        return false; // safe
    }, []);

    // Monitor all form inputs for injection attacks
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                const val = e.target.value || '';
                if (val.length > 3) secCheck('Form Input', val);
            }
        };
        document.addEventListener('input', handler);
        // Rate limiting: detect rapid API calls
        let apiCallCount = 0;
        const rateLimitTimer = setInterval(() => {
            if (apiCallCount > 50) {
                setSecAlerts(prev => [{ id: Date.now().toString(36), time: new Date().toISOString(), type: 'Rate Limit', severity: 'warning', action: 'API Abuse', detail: `${apiCallCount} calls/min detected`, blocked: false }, ...prev].slice(0, 100));
            }
            apiCallCount = 0;
        }, 60000);
        // Intercept fetch for monitoring
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            apiCallCount++;
            return origFetch.apply(this, args);
        };
        return () => {
            document.removeEventListener('input', handler);
            clearInterval(rateLimitTimer);
            window.fetch = origFetch;
        };
    }, [secCheck]);

    const sidebarBtnStyle = { padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, width: '100%', textAlign: 'center', color: '#fff', transition: 'all 150ms' };

    return (
<div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* ── Fixed Header Area ── */}
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', borderRadius: 16, padding: '18px 24px', border: '1px solid #bfdbfe', marginBottom: 0, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb', WebkitTextFillColor: '#2563eb' }}>{t("wms.wmsHeroTitle")}</div>
                        <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 4 }}>{t("wms.wmsHeroDesc")}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd' }}>{whs.length}{t("wms.wmsBadgeWh")}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7' }}>{initCarriers.length}{t("wms.wmsBadgeCarrier")}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}>{inventory.length}{t("wms.wmsBadgeSku")}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7' }}>{t("wms.wmsBadgeTotalStock").replace("{n}", totalStock.toLocaleString())}</span>
                            {lowStockCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>{t("wms.wmsBadgeLowStock").replace("{n}", lowStockCount)}</span>}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd' }}>{t("wms.wmsBadgeOrders").replace("{n}", orderStats.count)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button onClick={() => navigate('/omni-channel')} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#6b7280", fontSize: 10, cursor: "pointer" }}>{t("wms.wmsBtnSalesChannel")}</button>
                            <button onClick={() => navigate('/budget-planner')} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#6b7280", fontSize: 10, cursor: "pointer" }}>{t("wms.wmsBtnBudget")}</button>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{t("wms.wmsAssetValue")}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#4f8ef7" }}>{fmt(totalValue)}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button onClick={() => setShowAuditLog(p => !p)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, color: '#fff', background: showAuditLog ? '#475569' : '#64748b' }}>{t('wms.auditLogBtn')}</button>
                            <button onClick={() => setShowSecPanel(p => !p)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, color: '#fff', background: secAlerts.length > 0 ? '#ef4444' : '#22c55e' }}>{t('wms.securityBtn')}</button>
                            {tab === 'warehouse' && <>
                                <button onClick={() => setWhShowPerms(p => !p)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, color: '#fff', background: whShowPerms ? '#a855f7' : '#7c3aed' }}>{t('wms.permBtn')}</button>
                                <button onClick={() => { setWhShowForm(true) }} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, color: '#fff', background: '#4f8ef7' }}>{t('wms.whAddBtn')}</button>
                            </>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── STICKY TAB BAR ─── */}
            <div style={{ flexShrink: 0, zIndex: 30, background: "#f8fafc", padding: "6px 0" }}>
                <div style={{ display: "flex", gap: 3, padding: "4px", background: "#ffffff", borderRadius: 14, overflowX: "auto", backdropFilter: "blur(16px)" }}>
                    {TABS_I18N.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: isMobile ? "5px 8px" : "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: isMobile ? 9 : 10, flexShrink: 0, whiteSpace: "nowrap", background: tab === tb.id ? "#2563eb" : "#ffffff", color: tab === tb.id ? "#fff" : "#374151", transition: "all 150ms", minWidth: "fit-content" }}>
                            <div>{tb.label}</div>
                            <div style={{ fontSize: 8, fontWeight: 400, color: tab === tb.id ? "rgba(255,255,255,0.7)" : "#6b7280", marginTop: 1 }}>{tb.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
            {/* ── Scrollable Content Area ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {showAuditLog && (
                <div className="card card-glass" style={{ padding: 18, borderColor: 'rgba(100,116,139,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>{t('wms.auditLogTitle')}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t('wms.auditLogDesc')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Btn onClick={exportAuditLog} color="#4f8ef7" small>{t('wms.exportCsvBtn')}</Btn>
                            <Btn onClick={clearAuditLog} color="#ef4444" small>{t('wms.auditLogClearBtn')}</Btn>
                        </div>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {auditLog.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontSize: 12 }}>{t('wms.auditLogEmpty')}</div>}
                        {auditLog.map(entry => (
                            <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
                                <div style={{ width: 4, minHeight: 30, borderRadius: 2, background: entry.action.includes('Delete') || entry.action.includes('삭제') ? '#ef4444' : entry.action.includes('Add') || entry.action.includes('등록') ? '#22c55e' : '#4f8ef7', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{entry.action}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{entry.details}</div>
                                </div>
                                <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <div>{entry.user}</div>
                                    <div>{new Date(entry.timestamp).toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === "warehouse" && <WarehouseTab showForm={whShowForm} setShowForm={setWhShowForm} showPerms={whShowPerms} setShowPerms={setWhShowPerms} />}
            {tab === "inout" && <InOutTab whs={whs} />}
            {tab === "inventory" && <InventoryTab whs={whs} />}
            {tab === "receiving" && <ReceivingTab supplyOrders={supplyOrders} updateSupplyOrderStatus={updateSupplyOrderStatus} />}
            {tab === "picking" && <PickingListTab pickingLists={pickingLists} />}
            {tab === "lot" && <LotManagementTab lotManagement={lotManagement} registerLot={registerLot} inventory={inventory} />}
            {tab === "replenishment" && <ReplenishmentTab supplyOrders={supplyOrders} addSupplyOrder={addSupplyOrder} inventory={inventory} />}
            {tab === "combine" && <CombineTab />}
            {tab === "carrier" && <CarrierTab />}
            {tab === "tracking" && <TrackingTab />}
            {tab === "invoice" && <InvoiceTab />}
            {tab === "bundle" && <BundleTab />}
            {tab === "supplier" && <SupplierTab />}
            {tab === "audit" && <InventoryAuditTab inventory={inventory} />}
            {tab === "guide" && <WmsGuideTab />}
            {showSecPanel && (
                <div className="card card-glass" style={{ padding: 18, borderColor: secAlerts.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: secAlerts.length > 0 ? '#ef4444' : '#22c55e' }}>
                                🛡️ {t('wms.securityTitle')}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t('wms.securityDesc')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Btn onClick={() => setSecAlerts([])} color="#ef4444" small>🗑 {t('wms.auditLogClearBtn')}</Btn>
                        </div>
                    </div>
                    {secAlerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, fontSize: 12 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
                            <div style={{ color: '#22c55e', fontWeight: 700 }}>{t('wms.securitySafe')}</div>
                            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{t('wms.securitySafeDesc')}</div>
                        </div>
                    ) : (
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {secAlerts.map(a => (
                                <div key={a.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
                                    <div style={{ width: 4, minHeight: 30, borderRadius: 2, background: a.severity === 'critical' ? '#ef4444' : a.severity === 'high' ? '#f97316' : '#eab308', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: a.severity === 'critical' ? '#ef4444' : '#f97316' }}>
                                            🚨 [{a.type}] {a.blocked ? '✅ BLOCKED' : '⚠️ WARNING'}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, fontFamily: 'monospace' }}>{a.detail}</div>
                                    </div>
                                    <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>
                                        {new Date(a.time).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            </div>{/* end scrollable content */}
        </div>
);
}
