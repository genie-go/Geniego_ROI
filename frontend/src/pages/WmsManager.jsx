import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { loadWorkspace, saveWorkspace, wsEnabled } from "../services/workspaceState"; // [279차] 합포장·번들 서버 영속
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useProductSelection } from '../contexts/ProductSelectionContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { handlePlanLimit } from '../utils/planLimit.js';
import { useI18n } from '../i18n';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { detectXSS, sanitizeInput } from '../security/SecurityGuard.js';

import ApprovalModal from '../components/ApprovalModal.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import GuideWizard from '../components/GuideWizard.jsx'; // [237차] 인앱 순차 완료 위저드(필수등록 게이팅)
import CctvManager from '../components/CctvManager.jsx'; // [현 차수] CCTV 자격등록+원격 실시간 조회
import { getJsonAuth as _gjaWms, requestJsonAuth as _rjaWms } from '../services/apiClient.js';
import * as wmsApi from '../services/wmsApi.js';
import { IS_DEMO } from '../utils/demoEnv.js';
import { tChannelName } from '../utils/tenantStorage'; // [286차] 크로스탭 채널 테넌트 스코프
import { WmsDashboardTab, WmsReportsTab, WmsTollProcessingTab } from '../components/wms/WmsOpsTabs.jsx'; // [현 차수] 물류 대시보드·정기리포트·임가공
import PeriodFilterBar, { inPeriodAny } from '../components/common/PeriodFilterBar.jsx'; // [현 차수] 입출고 기간조회

/* ── BroadcastChannel Cross-Tab Sync ──────────────── */
const BC_WMS = 'geniego_wms_sync';
function useWmsCrossTabSync(onMessage) {
    const cbRef = useRef(onMessage);
    cbRef.current = onMessage;
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            const bc = new BroadcastChannel(tChannelName(BC_WMS));
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
// 206차: 데모 창고 시드 — 재고 단일소스(demoSeedData stock 키 W001/W002/W003)와 정확히 일치시켜
//   WarehouseTab 재고 합계가 인벤토리/대시보드와 동기화되도록. 데모 백엔드 창고 미시드 시 폴백.
const DEMO_WAREHOUSES = [
    { id: 'W001', name: '서울 본사 물류센터', code: 'SEL-HQ', location: '서울 강남구', area: 3200, temp: 'Room Temp', manager: '김창고', phone: '02-1234-5678', type: 'Direct', active: true },
    { id: 'W002', name: '부산 물류센터', code: 'BSN-01', location: '부산 강서구', area: 2100, temp: 'Room Temp', manager: '이물류', phone: '051-987-6543', type: 'Direct', active: true },
    { id: 'W003', name: '인천 글로벌 허브', code: 'ICN-GH', location: '인천 중구', area: 4500, temp: 'Cold Chain', manager: '박글로벌', phone: '032-555-1212', type: '3PL', active: true },
];
_dloc(DEMO_WAREHOUSES);
const initWarehouses = IS_DEMO ? DEMO_WAREHOUSES : [];

const initCarriers = [];

const initInOut = [];

const initInventory = [];

const initCombined = [];

const IO_TYPES = ["Inbound", "Outbound", "ReturnsInbound", "ReturnsOutbound", "WarehouseTransfer", "StockAdj", "Disposal"];
const IO_COLORS = { "Inbound": "#22c55e", "Outbound": "#4f8ef7", "ReturnsInbound": "#a855f7", "ReturnsOutbound": "#f97316", "WarehouseTransfer": "#eab308", "StockAdj": "#14d9b0", "Disposal": "#ef4444" };
const CARRIER_TYPES = ["Domestic", "IntlExpress", "IntlPost", "Freight", "SameDay"];

/* ─── [현 차수] WMS 물리집행 백엔드 클라이언트 (bins·barcodes·scan·waves) ──────────
   wmsApi.js 는 스코프잠금(이 파일만 편집)으로 확장 불가 → apiClient 의 getJsonAuth/requestJsonAuth
   를 직접 사용. 인증은 기존 WMS 호출과 동일(세션 self-auth, /api/wms 접두).                 */
const binsApi = {
    list:    ()       => _gjaWms('/api/wms/bins'),
    create:  (b)      => _rjaWms('/api/wms/bins', 'POST', b),
    update:  (id, b)  => _rjaWms(`/api/wms/bins/${id}`, 'PUT', b),
    remove:  (id)     => _rjaWms(`/api/wms/bins/${id}`, 'DELETE'),
    stock:   ()       => _gjaWms('/api/wms/bin-stock'),
};
const barcodesApi = {
    list:    ()       => _gjaWms('/api/wms/barcodes'),
    create:  (b)      => _rjaWms('/api/wms/barcodes', 'POST', b),
    remove:  (id)     => _rjaWms(`/api/wms/barcodes/${id}`, 'DELETE'),
};
const scanApi = {
    scanIn:  (b)      => _rjaWms('/api/wms/scan-in', 'POST', b),
    scanOut: (b)      => _rjaWms('/api/wms/scan-out', 'POST', b),
    putaway: (b)      => _rjaWms('/api/wms/putaway', 'POST', b),
};
const wavesApi = {
    list:    ()       => _gjaWms('/api/wms/waves'),
    create:  (b)      => _rjaWms('/api/wms/waves', 'POST', b),
    confirm: (id)     => _rjaWms(`/api/wms/waves/${id}/confirm`, 'POST', {}),
    remove:  (id)     => _rjaWms(`/api/wms/waves/${id}`, 'DELETE'),
};
const WAVE_STATUS_COLOR = { completed: '#22c55e', partial: '#eab308', short: '#ef4444' };

/* 창고 목록 로더 — 물리집행 탭들이 wh_id 선택지를 백엔드에서 확보(운영 whs=[] 폴백 대응) */
function useWmsWarehouses() {
    const [whs, setWhs] = useState(IS_DEMO ? DEMO_WAREHOUSES : []);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await _gjaWms('/api/wms/warehouses');
                if (!cancelled && Array.isArray(r?.warehouses) && r.warehouses.length) setWhs(r.warehouses);
            } catch { /* 폴백 유지 */ }
        })();
        return () => { cancelled = true; };
    }, []);
    return whs;
}
function whOpts(whs) {
    const opts = (whs || []).map(w => ({ v: w.id, l: w.name || w.id }));
    return opts.length ? opts : [{ v: 'W001', l: 'W001' }];
}

/* ═══ TAB 1: Warehouse Management ═══════════════════════════ */
const WarehouseTab = memo(function WarehouseTab({ showForm, setShowForm, showPerms, setShowPerms }) {
    const { t } = useI18n();
    // 206차: 창고별 재고 합계를 단일소스(GlobalDataContext.inventory)에서 파생 — 기존 initInventory(빈배열)로
    //   항상 0이던 버그 + InventoryTab/대시보드/SupplyChain 재고와 불일치 해소(전 메뉴 재고 일관).
    const { inventory: ctxInventory } = useGlobalData();
    const [whs, setWhs] = useState(initWarehouses);
    const [form, setForm] = useState({ id: "", name: "", code: "", location: "", area: "", temp: "Room Temp", manager: "", phone: "", type: "Direct", active: true });
    const [editing, setEditing] = useState(false);
    // [286차] 창고 목록 정렬(오름/내림)·창고명 검색
    const [whSortAsc, setWhSortAsc] = useState(true);
    const [whSearch, setWhSearch] = useState('');   // 입력값
    const [whQuery, setWhQuery] = useState('');      // 조회 버튼으로 적용된 검색어
    const [cctvWh, setCctvWh] = useState(null); // CCTV 모달 대상 창고(null=닫힘)
    const isMobile = useIsMobile();

    /* ── 205차: 백엔드 영속화(/api/wms/warehouses). 새로고침 후에도 유지 ── */
    const reloadWhs = useCallback(async () => {
        try { const r = await wmsApi.listWarehouses(); if (Array.isArray(r?.warehouses) && r.warehouses.length) setWhs(r.warehouses); else if (IS_DEMO) setWhs(DEMO_WAREHOUSES); } catch { if (IS_DEMO) setWhs(DEMO_WAREHOUSES); }
    }, []);
    useEffect(() => { reloadWhs(); }, [reloadWhs]);

    const [permissions, setPermissions] = useState([]);
    const [permForm, setPermForm] = useState({ user: '', role: 'viewer', warehouses: [] });
    const reloadPerms = useCallback(async () => {
        try { const r = await wmsApi.listPermissions(); if (Array.isArray(r?.permissions)) setPermissions(r.permissions.map(p => ({ ...p, user: p.user_email }))); } catch {}
    }, []);
    useEffect(() => { reloadPerms(); }, [reloadPerms]);
    const ROLES = [
        { id: 'admin', label: t('wms.permRoleAdmin'), color: '#ef4444' },
        { id: 'manager', label: t('wms.permRoleManager'), color: '#f97316' },
        { id: 'operator', label: t('wms.permRoleOperator'), color: '#4f8ef7' },
        { id: 'viewer', label: t('wms.permRoleViewer'), color: '#22c55e' },
    ];
    const addPermission = async () => {
        if (!permForm.user) return;
        try { await wmsApi.createPermission(permForm); await reloadPerms(); } catch (e) { alert(String(e?.message || e)); }
        setPermForm({ user: '', role: 'viewer', warehouses: [] });
    };
    const removePermission = async (id) => {
        try { await wmsApi.deletePermission(id); await reloadPerms(); } catch (e) { alert(String(e?.message || e)); }
    };
    const temps = [t("wms.whTempRoom"), t("wms.whTempCold"), t("wms.whTempFrozen"), t("wms.whTempCombi"), t("wms.whTempElec"), t("wms.whTempHazard")];
    const types = [t("wms.whTypeDirect"), t("wms.whType3PL"), t("wms.whTypeRent")];

    const reset = () => { setForm({ id: "", name: "", code: "", location: "", area: "", temp: "Room Temp", manager: "", phone: "", type: "Direct", active: true }); setEditing(false); };
    const save = async () => {
        if (!form.name || !form.code) return alert(t("wms.whNameRequired"));
        try {
            if (editing && form.id) await wmsApi.updateWarehouse(form.id, form);
            else await wmsApi.createWarehouse(form);
            await reloadWhs();
        } catch (e) { if (handlePlanLimit(e)) return; return alert(String(e?.message || e)); }
        reset(); setShowForm(false);
    };
    const editWh = (w) => { setForm({ ...w }); setEditing(true); setShowForm(true); };
    const toggleActive = async (id) => {
        const w = whs.find(x => x.id === id); if (!w) return;
        try { await wmsApi.updateWarehouse(id, { ...w, active: !w.active }); await reloadWhs(); } catch (e) { alert(String(e?.message || e)); }
    };
    // [286차] 창고 삭제 — 재고 보유 시 서버(409)가 거부하므로 그 메시지를 표면화(이동/소진 후 삭제 안내). 임시중단은 비활성화.
    const deleteWh = async (w) => {
        if (!window.confirm(t('wms.whDeleteConfirm', '창고 «{name}» 을(를) 삭제하시겠습니까?\n※ 재고가 남아 있으면 삭제되지 않습니다(먼저 다른 창고로 이동/소진). 임시 중단은 «비활성화»를 사용하세요.').replace('{name}', w.name || w.code || ''))) return;
        try {
            const r = await wmsApi.deleteWarehouse(w.id);
            if (r && r.ok) { await reloadWhs(); }
            else { alert(r?.error || t('wms.whDeleteFail', '창고 삭제 실패')); }
        } catch (e) {
            // requestJsonAuth 는 409/500 을 throw('HTTP 409 {json}') → 서버 error 메시지 추출.
            const msg = String(e?.message || e);
            let userMsg = msg;
            const m = msg.match(/\{[\s\S]*\}/);
            if (m) { try { const j = JSON.parse(m[0]); if (j && j.error) userMsg = j.error; } catch { /* 원문 사용 */ } }
            alert(userMsg);
        }
    };

    const f = form;
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // [286차] 검색(창고명/코드 부분일치) + 정렬(창고명 오름/내림) 적용 목록.
    const _wq = whQuery.trim().toLowerCase();
    const displayWhs = (Array.isArray(whs) ? whs : [])
        .filter(w => !_wq || String(w.name || '').toLowerCase().includes(_wq) || String(w.code || '').toLowerCase().includes(_wq))
        .slice()
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko') * (whSortAsc ? 1 : -1));

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* [286차] 창고목록 제목 바로 옆에 정렬(오름/내림)·창고명 조회 컨트롤 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginRight: 2 }}>{t("wms.whListTitle")}</div>
                <input value={whSearch} onChange={e => setWhSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') setWhQuery(whSearch); }}
                    placeholder={t('wms.whSearchPh', '창고명 검색')}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-1)', fontSize: 12, width: 150 }} />
                <Btn onClick={() => setWhQuery(whSearch)} color="#4f8ef7" small>🔍 {t('wms.whSearchBtn', '조회')}</Btn>
                {whQuery && <Btn onClick={() => { setWhSearch(''); setWhQuery(''); }} color="#666" small>✕</Btn>}
                <Btn onClick={() => setWhSortAsc(s => !s)} color="#6366f1" small>
                    {whSortAsc ? t('wms.whSortAsc', '창고명 ↑') : t('wms.whSortDesc', '창고명 ↓')}
                </Btn>
            </div>

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
                        <Input label={t("wms.whManagerLabel")} value={f.manager} onChange={v => setF("manager", v)} placeholder={t('wmsPage.namePh', '홍길동')} />
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
                {displayWhs.length === 0 && (
                    <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: 20 }}>
                        {whQuery ? t('wms.whSearchNoResult', '‘{q}’ 검색 결과가 없습니다').replace('{q}', whQuery) : t('wms.whListEmpty', '등록된 창고가 없습니다')}
                    </div>
                )}
                {displayWhs.map(w => {
                    // [286차] 창고 재고합 = 서버 권위값(w.stock, 창고별 SUM on_hand·고아 병합 반영) 우선.
                    //   종전엔 ctxInventory 에서 p.stock[w.id] 로 재구성해 'default' 버킷 재고를 0 으로 오표시했다.
                    const totalStock = (w.stock !== undefined && w.stock !== null)
                        ? Number(w.stock)
                        : (ctxInventory || []).reduce((s, p) => s + ((p.stock && p.stock[w.id]) || 0), 0);
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
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <Btn onClick={() => editWh(w)} color="#6366f1" small>{t("wms.whEditBtn")}</Btn>
                                <Btn onClick={() => setCctvWh(w)} color="#0ea5e9" small>📹 {t("wms.cctv.viewBtn", "CCTV 보기")}</Btn>
                                <Btn onClick={() => toggleActive(w.id)} color={w.active ? "#f59e0b" : "#22c55e"} small>{w.active ? t("wms.whInactive") : t("wms.whResumeBtn")}</Btn>
                                <Btn onClick={() => deleteWh(w)} color="#ef4444" small>🗑 {t("wms.whDeleteBtn", "삭제")}</Btn>
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
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <Btn onClick={() => editWh(w)} color="#6366f1" small>{t('wms.supEditBtn')}</Btn>
                                <Btn onClick={() => setCctvWh(w)} color="#0ea5e9" small>📹 {t("wms.cctv.viewBtn", "CCTV 보기")}</Btn>
                                <Btn onClick={() => toggleActive(w.id)} color={w.active ? "#f59e0b" : "#22c55e"} small>{w.active ? t("wms.whInactive") : t("wms.whResumeBtn")}</Btn>
                                <Btn onClick={() => deleteWh(w)} color="#ef4444" small>🗑 {t("wms.whDeleteBtn", "삭제")}</Btn>
                            </div>
                        </div>
                    );
                })}
            </div>

            {cctvWh && (
                <div onClick={() => setCctvWh(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{ background: 'var(--card-bg,#fff)', borderRadius: 14, padding: 18, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>📹 {cctvWh.name} — {t('wms.cctv.title', 'CCTV 실시간 조회')}</div>
                            <button onClick={() => setCctvWh(null)} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
                        </div>
                        <CctvManager whId={cctvWh.id} warehouses={whs} compact />
                    </div>
                </div>
            )}
        </div>
    );
});

/* ═══ TAB 2: Inbound/Outbound Management ════════════════════════ */
const InOutTab = memo(function InOutTab({ whs, prefill, onPrefillDone }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const { inOutHistory, registerInOut, addAlert, inventory: gdProducts } = useGlobalData();   // [281차 P2] addAlert · [286차] 상품 선택 소스
    const {isDemo} = useAuth();
    /* ── 205차: 입출고 이력 백엔드 영속화(/api/wms/movements). 감사추적·새로고침 후 유지 ── */
    const [beMoves, setBeMoves] = useState([]);
    const reloadMoves = useCallback(async () => {
        try {
            const r = await wmsApi.listMovements(300);
            if (Array.isArray(r?.movements)) setBeMoves(r.movements.map(m => ({
                id: 'BE' + m.id, type: m.type, sku: m.sku, name: m.name, qty: Number(m.qty) || 0,
                whId: m.wh_id, unit: Number(m.unit) || 0, memo: m.memo, ref: m.ref, reason: m.reason,
                // [269차 수정] 렌더 테이블은 r.at 를 읽는데 백엔드행엔 at 미세팅→날짜 공란이었다. created_at 을 at 으로 포맷.
                ts: m.created_at, at: (m.created_at || '').replace('T', ' ').slice(0, 16), by: '-',
            })));
        } catch {}
    }, []);
    useEffect(() => { reloadMoves(); }, [reloadMoves]);
    const [filter, setFilter] = useState('All');
    const [searchTxt, setSearchTxt] = useState('');
    const [period, setPeriod] = useState({ preset: 'all' }); // [현 차수] 입출고 기간조회
    const [form, setForm] = useState({ type: 'Inbound', whId: '', destWhId: '', sku: '', name: '', qty: '', unit: '', memo: '', ref: '', reason: '' });
    // [현 차수 P1] ★창고 기본값을 실제 창고로 동기화 — 기존 하드코딩 'W001'(데모 시드 id)은 운영 창고(정수 PK)에
    //   없어, 폼/CSV가 유령창고 'W001' 로 wms_stock 을 적재→allocationPlan 후보 제외→채널판매가 영구 미차감이었다.
    useEffect(() => {
        if (whs && whs.length) setForm(p => (whs.some(w => String(w.id) === String(p.whId)) ? p : { ...p, whId: whs[0].id }));
    }, [whs]);
    const [showForm, setShowForm] = useState(false);
    // [286차] 카탈로그 등에서 상품 프리필로 진입 → 입고등록 폼 자동 오픈 + 상품 채움(창고·수량은 사용자 선택).
    useEffect(() => {
        if (prefill && prefill.sku) {
            setForm(p => ({ ...p, type: 'Inbound', sku: prefill.sku, name: prefill.name || p.name, qty: prefill.qty || '' }));
            setShowForm(true);
            onPrefillDone && onPrefillDone();
        }
    }, [prefill]);   // eslint-disable-line react-hooks/exhaustive-deps
    const [showScanner, setShowScanner] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [manualScan, setManualScan] = useState(''); // [현 차수] 운영 수동 바코드 입력(가짜 SKU 자동생성 차단)
    const videoRef = React.useRef(null);

    /* ── IO Type i18n label map (shared across filter/select/tag) ── */
    const IO_LABEL_MAP = useMemo(() => ({
        All: t('wms.ioFilterAll'), Inbound: t('wms.ioFilterInbound'), Outbound: t('wms.ioFilterOutbound'),
        ReturnsInbound: t('wms.ioFilterRetInbound'), ReturnsOutbound: t('wms.ioFilterRetOutbound'),
        WarehouseTransfer: t('wms.ioFilterTransfer'), StockAdj: t('wms.ioFilterAdj'), Disposal: t('wms.ioFilterDisposal'),
    }), [t]);

    const startScan = async () => {
        setShowScanner(true); setScanResult(null); setManualScan('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
            // [현 차수] 가짜 SKU 생성 차단: 데모만 시뮬레이션 바코드. 운영은 실 바코드 인식 라이브러리 미연동
            //   상태이므로 가짜 SKU 를 자동 생성하지 않고, 카메라 미리보기 + 수동 입력(아래 필드)으로 정직 처리.
            if (isDemo) {
                setTimeout(() => {
                    const mockBarcode = 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase();
                    setScanResult(mockBarcode);
                    stream.getTracks().forEach(tr => tr.stop());
                }, 3000);
            }
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
        // [현 차수 P1] 유효 창고 검증 — 유령창고 적재 차단.
        if (!whs.length) { alert(t('wms.ioNoWarehouse', '등록된 창고가 없습니다. 먼저 창고를 등록하세요.')); return; }
        if (!whs.some(w => String(w.id) === String(form.whId))) { alert(t('wms.ioPickWarehouse', '유효한 창고를 선택하세요.')); return; }
        // ✅ GlobalDataContext.registerInOut() → Stock Auto Change + Notification
        const payload = {
            type: form.type,
            sku: form.sku,
            qty: Number(form.qty),
            whId: form.whId,
            destWhId: form.destWhId,
            name: form.name,
            unit: Number(form.unit || 0),
            memo: form.memo,
            ref: form.ref,
            reason: form.reason,
            by: 'User',
        };
        registerInOut(payload);
        // 205차: 백엔드 영속(감사추적). [281차 P2] 종전 .catch(()=>{}) 는 422(재고부족)·403(창고권한)을 삼켜
        //   화면엔 "등록됨"처럼 보였다(로컬 registerInOut 만 반영). 서버 실패를 표면화한다.
        wmsApi.createMovement(payload)
            .then(r => { if (r && r.ok === false) addAlert({ type: 'error', msg: r.error || t('wms.ioFail', '입출고 등록 실패') }); reloadMoves(); })
            .catch(e => addAlert({ type: 'error', msg: (e && e.message) || t('wms.ioFail', '입출고 등록 실패') }));
        setForm({ type: 'Inbound', whId: whs[0]?.id || '', destWhId: '', sku: '', name: '', qty: '', unit: '', memo: '', ref: '', reason: '' });
        setShowForm(false);
    };

    const filtered = [...beMoves, ...inOutHistory].filter(r => {
        const q = searchTxt.trim().toLowerCase();
        const matchType = filter === 'All' || r.type === filter;
        const matchQ = !q || (r.sku || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q) || (r.ref || '').toLowerCase().includes(q);
        // [현 차수] 기간조회 — 입출고 감사이력을 선택 기간으로 필터(ts ISO 우선, ko-KR at 폴백)
        const matchP = inPeriodAny(r, period, ['ts', 'atISO', 'created_at', 'at']);
        return matchType && matchQ && matchP;
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
        // [현 차수 P1] CSV 창고 폴백을 실제 창고로 — 창고 미등록 시 임포트 차단(유령 'W001' 적재 방지).
        if (!whs.length) { alert(t('wms.ioNoWarehouse', '등록된 창고가 없습니다. 먼저 창고를 등록하세요.')); return; }
        const validWh = new Set(whs.map(w => String(w.id)));
        const defWh = whs[0].id;
        let ok = 0;
        let srvFail = 0;   // [281차 P2] 서버 영속 실패 집계(종전 .catch(()=>{}) 무음)
        const pending = [];
        bulkData.forEach(row => {
            const type = row.Type || row.type || 'Inbound';
            const sku = row.SKU || row.sku || '';
            const qty = Number(row.Qty || row.qty || 0);
            if (!sku || !qty) return;
            const rawWh = row.WarehouseID || row.warehouseId || '';
            const payload = {
                type, sku, qty: Math.abs(qty),
                whId: validWh.has(String(rawWh)) ? rawWh : defWh,
                name: row.ProductName || row.productName || row.name || '',
                unit: Number(row.UnitCost || row.unitCost || 0),
                memo: row.Memo || row.memo || '',
                ref: row.RefNo || row.refNo || row.ref || '',
                reason: row.Reason || row.reason || '',
                by: 'BulkUpload',
            };
            registerInOut(payload);
            // [265차] 대량 입출고 백엔드 영속 — 단건(wmsApi.createMovement:358)·CSV(:719)·조정(:779) 형제와 대칭.
            //   기존엔 registerInOut(로컬 state)만 호출 → 운영 새로고침 시 대량 입출고 이력 소실(비영속).
            // [281차 P2] 서버 실패(재고부족/권한)를 집계해 표면화(종전 무음).
            pending.push(wmsApi.createMovement(payload).then(r => { if (r && r.ok === false) srvFail++; }).catch(() => { srvFail++; }));
            ok++;
        });
        Promise.allSettled(pending).then(() => {
            if (ok > 0) { try { reloadMoves(); } catch { /* no-op */ } }
            if (srvFail > 0) addAlert({ type: 'error', msg: t('wms.bulkPartialFail', '{f}건 서버 반영 실패').replace('{f}', String(srvFail)) });
            setBulkStatus({ count: ok - srvFail, total: bulkData.length, success: srvFail === 0 });
            setBulkData([]);
            setTimeout(() => { setShowBulk(false); setBulkStatus(null); }, 3000);
        });
    };

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <PeriodFilterBar value={period} onChange={setPeriod} />
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
                    {/* [현 차수] 운영: 가짜 SKU 자동생성 대신 스캔한 바코드/SKU 직접 입력(정직화). 데모는 자동 시뮬레이션. */}
                    {!isDemo && !scanResult && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{t('wms.scanManualHint', '카메라로 바코드를 확인한 뒤 코드를 직접 입력하세요.')}</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    value={manualScan}
                                    onChange={e => setManualScan(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && manualScan.trim()) setScanResult(manualScan.trim()); }}
                                    placeholder={t('wms.scanManualPh', '스캔한 바코드 / SKU 입력')}
                                    style={{ flex: 1, boxSizing: 'border-box', padding: '8px 10px', borderRadius: 9, background: 'rgba(79,142,247,0.07)', border: '1.5px solid rgba(79,142,247,0.25)', color: '#1f2937', fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
                                />
                                <Btn onClick={() => { if (manualScan.trim()) setScanResult(manualScan.trim()); }} color="#4f8ef7" small>{t('wms.scanManualApply', '입력')}</Btn>
                            </div>
                        </div>
                    )}
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
                        {/* [286차] ★상품 선택기 — 커머스 동기화 상품을 SKU/상품명으로 검색해 선택(선택 시 sku·상품명 자동 채움). 신규 상품은 아래 수동입력.
                            현재고를 함께 표시 — 옵션 라벨 및 선택 후 '현재고' 라인. */}
                        {(() => {
                            const prodStock = (sku) => {
                                const p = (Array.isArray(gdProducts) ? gdProducts : []).find(x => String(x.sku) === String(sku));
                                if (!p) return null;
                                const s = p.stock;
                                if (s && typeof s === 'object') return Object.values(s).reduce((a, b) => a + (Number(b) || 0), 0);
                                if (typeof s === 'number') return s;
                                return Number(p.inventory ?? p.available ?? 0) || 0;
                            };
                            const cur = form.sku ? prodStock(form.sku) : null;
                            return (
                                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 4 }}>
                                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('wms.ioProductPick', '상품 선택 (동기화 상품)')}</label>
                                    <input list="wms-io-products" placeholder={t('wms.ioProductPickPh', 'SKU 또는 상품명으로 검색…')}
                                        onChange={e => {
                                            const v = e.target.value;
                                            const list = Array.isArray(gdProducts) ? gdProducts : [];
                                            const hit = list.find(p => v.startsWith(`${p.sku} · ${p.name}`)) || list.find(p => String(p.sku) === v) || list.find(p => p.name === v);
                                            if (hit) setForm(p => ({ ...p, sku: String(hit.sku || ''), name: String(hit.name || '') }));
                                        }}
                                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12, background: "#fff" }} />
                                    <datalist id="wms-io-products">
                                        {(Array.isArray(gdProducts) ? gdProducts : []).slice(0, 500).map((p, i) => {
                                            const st = prodStock(p.sku);
                                            return <option key={(p.sku || '') + '-' + i} value={`${p.sku} · ${p.name}`} label={st != null ? `현재고 ${st}` : undefined} />;
                                        })}
                                    </datalist>
                                    {form.sku && cur != null && (
                                        <div style={{ fontSize: 11, color: "#0f766e", fontWeight: 700 }}>
                                            📦 {t('wms.ioCurrentStock', '현재고')}: {cur}
                                            {form.qty !== '' && form.type === 'Inbound' && <span style={{ color: "#64748b", fontWeight: 500 }}> → {t('wms.ioAfterInbound', '입고 후')} {cur + (Number(form.qty) || 0)}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
    const { inventory: gdInventory, adjustStock, addAlert } = useGlobalData();
    const {isDemo} = useAuth();
    const [adjForm, setAdjForm] = useState(null);
    const [distProd, setDistProd] = useState(null); // [286차] 상품별 창고 재고 분포 팝업(어느 창고에 얼마)
    // 208차(A): WMS 재고 단일 진실 = wms_stock(입출고 파생 물리재고). 운영은 wms_stock 을 SKU별로
    //   {sku,name,stock:{wh_id:on_hand}} 로 그룹핑해 표시(입출고가 즉시 반영). 데모/미존재 시 GlobalData 폴백.
    const [wmsStock, setWmsStock] = useState(null);
    useEffect(() => {
        if (IS_DEMO) return;
        let cancelled = false;
        const load = () => wmsApi.listStock(false).then(res => {
            if (cancelled || !res?.ok || !Array.isArray(res.stock)) return;
            const bySku = {};
            res.stock.forEach(r => {
                const k = String(r.sku || '');
                if (!k) return;
                if (!bySku[k]) bySku[k] = { sku: k, name: r.name || k, stock: {}, safeQty: 0, cost: 0 };
                const wh = String(r.wh_id || 'W001');
                bySku[k].stock[wh] = (bySku[k].stock[wh] || 0) + Number(r.on_hand || 0);
            });
            setWmsStock(Object.values(bySku));
        }).catch(() => {});
        load();
        const iv = setInterval(load, 30000); // 입출고 반영 주기 갱신
        return () => { cancelled = true; clearInterval(iv); };
    }, []);
    // 운영에 wms_stock 데이터가 있으면 그것을 단일 진실로, 없으면 GlobalData(channel_inventory) 폴백.
    const inventory = (!IS_DEMO && wmsStock && wmsStock.length > 0) ? wmsStock : gdInventory;
    const [searchQuery, setSearchQuery] = useState('');
    const [showLowOnly, setShowLowOnly] = useState(false);
    // [현 차수] 전역 상품선택 → 재고 그리드 자동 필터(실시간 동기화). 다른 메뉴에서 상품 선택 시 그 SKU 재고로 즉시 포커스.
    const { selectedProduct: _wmsSelProd } = useProductSelection();
    useEffect(() => { if (_wmsSelProd?.sku) setSearchQuery(_wmsSelProd.sku); }, [_wmsSelProd]);
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
    // 207차 후속: CSV import 가 성공 토스트만 띄우던 무동작 셸 → 실제 재고 반영(adjustStock 단일소스 +
    //   운영은 wmsApi.createMovement 감사 영속). SKU/수량/창고 컬럼은 다양한 헤더명을 관용 매핑.
    const executeImport = () => {
        // [현 차수 P0] ★유령창고 'W001' 폴백 제거 + 서버 반영 실패 집계 + 서버결과 기반 성공표기(executeBulkImport 패턴 정합).
        //   종전엔 CSV에 창고 컬럼이 없으면 존재하지 않는 'W001'에 적재→allocationPlan 후보 제외→채널 판매 미차감(초과판매),
        //   그리고 createMovement 실패를 await 없이 삼켜(비동기 reject 미포착) 재고가 30초 폴링에 원복되는데도 "성공"으로 표기했다.
        if (!IS_DEMO && !(whs && whs.length)) { alert(t('wms.ioNoWarehouse', '등록된 창고가 없습니다. 먼저 창고를 등록하세요.')); return; }
        const validWh = new Set((whs || []).map(w => String(w.id)));
        const defWh = (whs && whs[0]) ? String(whs[0].id) : 'W001'; // 운영=실제 창고 whs[0](유령 아님), 데모=W001 로컬 샌드박스
        let applied = 0, srvFail = 0;
        const pending = [];
        (csvData || []).forEach(r => {
            const sku = String(r.SKU || r.sku || r.Sku || r['상품코드'] || '').trim();
            const qtyRaw = r.qty ?? r.Qty ?? r.quantity ?? r.Quantity ?? r['수량'] ?? r.available ?? r.stock ?? r.Stock ?? '';
            const qty = parseInt(String(qtyRaw).replace(/[^0-9-]/g, ''), 10);
            const rawWh = String(r.warehouse || r.wh || r.whId || r.WH || r['창고'] || '').trim();
            const wh = validWh.has(rawWh) ? rawWh : defWh; // 미지정/미등록 창고는 실제 기본창고로(유령 W001 금지)
            if (sku && !isNaN(qty) && wh) {
                // CSV 수량=절대 목표재고 → 백엔드가 인식하는 StockAdj(델타)로 영속(doAdj 패턴).
                const cur = (inventory.find(p => p.sku === sku)?.stock?.[wh]) || 0;
                adjustStock(sku, wh, qty); // 로컬 낙관 반영(절대값)
                applied++;
                if (!IS_DEMO) {
                    const delta = qty - cur;
                    if (delta !== 0) pending.push(
                        wmsApi.createMovement({ sku, name: r.name || r.product || r['상품명'] || '', qty: delta, wh_id: wh, type: 'StockAdj', reason: 'CSV 재고 등록' })
                            .then(rr => { if (rr && rr.ok === false) srvFail++; }).catch(() => { srvFail++; })
                    );
                }
            }
        });
        Promise.allSettled(pending).then(() => {
            setImportStatus({ count: Math.max(0, applied - srvFail), success: srvFail === 0 && applied > 0, srvFail });
            setCsvData([]);
            setTimeout(() => setShowImport(false), 2800);
        });
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
        const newQty = Math.max(0, Number(adjForm.qty) || 0);
        // 208차(A): wms_stock 단일진실 운영에서는 조정 절대값 → StockAdj 델타 movement 로 영속(wms_stock 반영).
        if (!IS_DEMO && wmsStock && wmsStock.length > 0) {
            const cur = (inventory.find(p => p.sku === adjForm.sku)?.stock?.[adjForm.whId]) || 0;
            const delta = newQty - cur;
            // [286차] ★무음실패 정직화 — 종전엔 await/응답체크 없이 catch{} 로 삼켜, 403(창고권한)/422 여도 낙관값이
            //   '저장됨'처럼 보이고 30초 폴링에 조용히 원복됐다. 응답을 검사해 실패를 사용자에게 표면화한다.
            if (delta !== 0) {
                wmsApi.createMovement({ sku: adjForm.sku, name: adjForm.name || '', qty: delta, wh_id: adjForm.whId, type: 'StockAdj', reason: '재고 조정' })
                    .then(r => { if (r && r.ok === false) { if (typeof addAlert === 'function') addAlert({ type: 'error', msg: r.error || t('wms.invAdjFail', '재고 조정 반영 실패 — 잠시 후 원복될 수 있습니다.') }); } })
                    .catch(e => { if (typeof addAlert === 'function') addAlert({ type: 'error', msg: (e && e.message) || t('wms.invAdjFail', '재고 조정 반영 실패 — 잠시 후 원복될 수 있습니다.') }); });
            }
            setWmsStock(prev => (prev || []).map(p => p.sku === adjForm.sku ? { ...p, stock: { ...p.stock, [adjForm.whId]: newQty } } : p)); // 낙관적 반영
        } else {
            // ✅ GlobalDataContext.adjustStock() → Instant sync across app (데모/폴백)
            adjustStock(adjForm.sku, adjForm.whId, newQty);
        }
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

            {/* [286차] ── 상품별 창고 재고 분포 팝업 — "어느 창고에 얼마" 명시 표시(사용자 요청) ── */}
            {distProd && (() => {
                const p = distProd;
                const whIds = new Set((whs || []).map(w => String(w.id)));
                const total = Object.values(p.stock || {}).reduce((s, v) => s + (Number(v) || 0), 0);
                const extras = Object.keys(p.stock || {}).filter(k => !whIds.has(String(k)) && (Number(p.stock[k]) || 0) !== 0);
                return (
                    <div onClick={() => setDistProd(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
                        <div onClick={e => e.stopPropagation()} className="card card-glass" style={{ padding: 20, minWidth: 320, maxWidth: 480, width: "100%", background: "var(--surface,#fff)" }}>
                            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>📦 {p.name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", marginBottom: 12 }}>{p.sku} · {t("wms.invDistTitle", "창고별 재고 분포")}</div>
                            <table className="table" style={{ width: "100%" }}>
                                <thead><tr><th>{t("wms.invColWarehouse", "창고")}</th><th style={{ textAlign: "right" }}>{t("wms.whCurrentStock", "현 재고")}</th></tr></thead>
                                <tbody>
                                    {(whs || []).map(w => (
                                        <tr key={w.id}>
                                            <td>{w.name} <span style={{ color: "#6b7280", fontSize: 10 }}>({w.code})</span></td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: (p.stock[w.id] || 0) === 0 ? "#ef4444" : "#22c55e" }}>{p.stock[w.id] || 0}</td>
                                        </tr>
                                    ))}
                                    {extras.map(k => (
                                        <tr key={k}>
                                            <td style={{ color: "#eab308" }}>{t("wms.invUnassignedWh", "미지정(창고 없음)")} <span style={{ fontSize: 10 }}>[{k}]</span></td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: "#eab308" }}>{p.stock[k]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot><tr><td style={{ fontWeight: 800 }}>{t("wms.invColTotal", "합계")}</td><td style={{ textAlign: "right", fontWeight: 900 }}>{total}</td></tr></tfoot>
                            </table>
                            {extras.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 10.5, color: "#eab308" }}>⚠ {t("wms.invUnassignedHint", "미지정 재고는 다음 재고현황 조회 시 대표 창고로 자동 병합됩니다.")}</div>
                            )}
                            <div style={{ marginTop: 14, textAlign: "right" }}>
                                <Btn onClick={() => setDistProd(null)} color="#666" small>{t("wms.close", "닫기")}</Btn>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                        importStatus.srvFail > 0 ? (
                            <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#ef4444', fontWeight: 700 }}>
                                ⚠️ {importStatus.count} {t('wms.csvImportDone')} · {importStatus.srvFail}{t('wms.csvImportSrvFail', '건 서버 반영 실패(원복될 수 있음)')}
                            </div>
                        ) : (
                            <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                                ✅ {importStatus.count} {t('wms.csvImportDone')}
                            </div>
                        )
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
                                        {/* [286차] 상품명 클릭 → 창고별 재고 분포 팝업(어느 창고에 얼마 있는지) */}
                                        <td style={{ fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#4f8ef7", textDecoration: "underline dotted" }}
                                            onClick={() => setDistProd(p)} title={t("wms.invDistHint", "창고별 재고 분포 보기")}>{p.name}</td>
                                        {whs.map(w => (
                                            <td key={w.id} style={{ textAlign: "center", fontWeight: 700, color: (p.stock[w.id] || 0) === 0 ? "#ef4444" : (p.stock[w.id] || 0) < 20 ? "#eab308" : "#22c55e", cursor: "pointer" }}
                                                onClick={() => setAdjForm({ sku: p.sku, name: p.name, whId: w.id, qty: p.stock[w.id] || 0 })}>
                                                {p.stock[w.id] || 0}
                                            </td>
                                        ))}
                                        <td style={{ textAlign: "center", fontWeight: 900, color: low ? "#ef4444" : "#1e293b", cursor: "pointer", textDecoration: "underline dotted" }}
                                            onClick={() => setDistProd(p)} title={t("wms.invDistHint", "창고별 재고 분포 보기")}>{total}</td>
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
    const { isDemo } = useAuth();
    const [list, setList] = useState(initCombined);
    // [279차 감사 E-P1] 합포장 요청/승인/발송 = 종전 인메모리 전용(새로고침 소실). 서버 영속(WorkspaceState).
    const _cbHydrated = useRef(!wsEnabled);
    useEffect(() => {
        let alive = true;
        if (wsEnabled) loadWorkspace('wms_combine').then(v => { if (alive) { if (Array.isArray(v)) setList(v); _cbHydrated.current = true; } }).catch(() => {}); // [M3-P1] 실패 시 가드 미개방(서버값 보존)
        return () => { alive = false; };
    }, []);
    useEffect(() => { if (wsEnabled && _cbHydrated.current) saveWorkspace('wms_combine', list).catch(() => {}); }, [list]);
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
    // 191차: 운송장번호는 데모 시뮬레이션 전용. 운영은 가짜 송장번호 주입 금지 — 실 송장은
    //   택배사 연동(미배선)에서 발급. 운영은 빈 값 유지(완료 처리만, 정직).
    const complete = (id) => setList(p => p.map(c => c.id === id ? { ...c, status: "Done", tracking: isDemo ? ("TRK" + Math.floor(Math.random() * 9000000000 + 1000000000)) : "" } : c));

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

    /* ── 205차: 백엔드 영속화(/api/wms/carriers). api_key 는 서버 AES-256-GCM 저장·마스킹 반환 ── */
    const reloadCarriers = useCallback(async () => {
        try {
            const r = await wmsApi.listCarriers();
            if (Array.isArray(r?.carriers)) setCarriers(r.carriers.map(c => ({ ...c, trackUrl: c.trackUrl || c.track_url || '', apiKey: c.api_key || '' })));
        } catch {}
    }, []);
    useEffect(() => { reloadCarriers(); }, [reloadCarriers]);

    const reset = () => { setForm({ id: "", name: "", code: "", type: "Domestic", country: "KR", trackUrl: "", apiKey: "", active: true }); setEditing(false); };
    const save = async () => {
        if (!form.name || !form.code) return alert(t('wms.carrNameRequired'));
        try {
            if (editing && form.id) await wmsApi.updateCarrier(form.id, form);
            else await wmsApi.createCarrier(form);
            await reloadCarriers();
        } catch (e) { return alert(String(e?.message || e)); }
        reset(); setShowForm(false);
    };
    const editC = (c) => { setForm({ ...c }); setEditing(true); setShowForm(true); };
    const toggleActive = async (id) => {
        const c = carriers.find(x => x.id === id); if (!c) return;
        try { await wmsApi.updateCarrier(id, { ...c, active: !c.active }); await reloadCarriers(); } catch (e) { alert(String(e?.message || e)); }
    };

    // [현 차수 P3-2] 택배사 API 연동 테스트 — 죽은 /api/carrier-track → 실 추적 엔드포인트(/v427/logistics/track)로
    //   재배선. 테스트 운송장으로 핑(키 유효 시 carrier API 응답=ok, 인증실패=fail). ★거짓성공 제거: 네트워크/서버
    //   오류 시 길이기반 가짜 'ok' 폴백을 honest 'fail'로 교체(실 검증만 표기).
    const testApi = async (id) => {
        const carrier = carriers.find(c => c.id === id);
        const key = apiInputs[id] ?? carrier.apiKey;
        if (!key || key.trim() === '') { alert(t('wms.carrApiKeyRequired')); return; }
        setTesting(p => ({ ...p, [id]: 'loading' }));
        setCarriers(p => p.map(c => c.id === id ? { ...c, apiKey: key } : c));
        try { await wmsApi.updateCarrier(id, { ...carrier, apiKey: key }); } catch {}

        try {
            const token = localStorage.getItem('genie_token');
            const BASE = import.meta.env?.VITE_API_BASE ?? '';
            const r = await fetch(`${BASE}/api/v427/logistics/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    carrier: carrier.code, carrier_code: carrier.code, carrierName: carrier.name,
                    tracking_no: 'TEST0000000000', api_key: key, country: carrier.country, ping: true,
                }),
            });
            const d = await r.json().catch(() => ({}));
            // carrier API 가 응답(인증 통과)하면 ok — 추적번호 미존재(found=false)여도 키는 유효. 인증/구성 오류만 fail.
            const authFail = d.error && /auth|unauthor|key|forbidden|401|403/i.test(String(d.error));
            setTesting(p => ({ ...p, [id]: (r.ok && d.ok !== false && !authFail) ? 'ok' : 'fail' }));
        } catch {
            setTesting(p => ({ ...p, [id]: 'fail' })); // 거짓성공 제거 — 실 검증 실패는 honest fail
        }
    };

    const saveApiKey = async (id) => {
        const key = apiInputs[id];
        if (!key) return;
        const carrier = carriers.find(c => c.id === id);
        setCarriers(p => p.map(c => c.id === id ? { ...c, apiKey: key } : c));
        setApiInputs(p => { const n = { ...p }; delete n[id]; return n; });
        try { if (carrier) { await wmsApi.updateCarrier(id, { ...carrier, apiKey: key }); await reloadCarriers(); } } catch {}
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
    /* ── 205차: 운영=백엔드 영속(/api/wms/supply-orders), 데모=GlobalDataContext 단일소스 ── */
    const [beOrders, setBeOrders] = React.useState([]);
    const reload = React.useCallback(async () => {
        if (IS_DEMO) return;
        try {
            const r = await wmsApi.listSupplyOrders();
            if (Array.isArray(r?.supplyOrders)) setBeOrders(r.supplyOrders.map(o => ({
                id: o.id, _be: true, sku: o.sku, name: o.name, qty: Number(o.qty) || 0,
                supplier: o.supplier, status: o.status, eta: o.eta, wh: o.wh_id,
                orderDate: (o.created_at || '').slice(0, 10), unitCost: 0, total: 0,
            })));
        } catch {}
    }, []);
    React.useEffect(() => { reload(); }, [reload]);
    const rows = IS_DEMO ? supplyOrders : beOrders;
    const confirmReceive = async (po) => {
        if (po._be) { try { await wmsApi.updateSupplyOrder(po.id, { status: 'received', eta: po.eta || '' }); await reload(); } catch (e) { alert(String(e?.message || e)); } }
        else { updateSupplyOrderStatus(po.id, 'received'); }
    };
    return (
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[{ l:t('wms.recvAllPO'), v:rows.length, c:'#4f8ef7' }, { l:t('wms.recvInTransit'), v:rows.filter(p=>p.status==='in_transit').length, c:'#f97316' }, { l:t('wms.recvReceived'), v:rows.filter(p=>p.status==='received').length, c:'#22c55e' }, { l:t('wms.recvTotalAmt'), v:fmt(rows.reduce((s,p)=>s+(p.total||0),0)), c:'#a855f7' }].map(({l,v,c}) => (
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
                    {rows.map(po => (
                        <tr key={po._be ? 'b'+po.id : po.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
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
                                        onClick={() => confirmReceive(po)}>
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
    /* ── 205차: 운영=백엔드 영속(/api/wms/picking), 데모=GlobalDataContext 단일소스 ── */
    const [bePicks, setBePicks] = React.useState([]);
    const [localOverride, setLocalOverride] = React.useState({}); // 데모 컨텍스트 항목 상태 로컬 반영
    const reload = React.useCallback(async () => {
        if (IS_DEMO) return;
        try {
            const r = await wmsApi.listPicking();
            if (Array.isArray(r?.picking)) setBePicks(r.picking.map(p => ({
                id: p.id, _be: true, orderId: p.order_ref, sku: p.sku, name: p.name,
                qty: Number(p.qty) || 0, wh: p.wh_id, carrier: p.carrier,
                status: p.status, createdAt: (p.created_at || '').slice(0, 16),
            })));
        } catch {}
    }, []);
    React.useEffect(() => { reload(); }, [reload]);
    const list = (IS_DEMO ? pickingLists : bePicks).map(p => {
        const k = p._be ? 'b'+p.id : p.id;
        return localOverride[k] ? { ...p, ...localOverride[k] } : p;
    });
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [approval, setApproval] = React.useState(null); // { pk, onConfirm }
    // 207차 후속: 운영 피킹리스트 생성 UI (wmsApi.createPicking). 데모는 주문에서 자동 생성.
    const [pickForm, setPickForm] = React.useState({ orderRef:'', sku:'', name:'', qty:'', whId:'', carrier:'' });
    const [pickSaving, setPickSaving] = React.useState(false);
    const createPick = async (e) => {
        e.preventDefault();
        if (!pickForm.sku && !pickForm.orderRef) return;
        setPickSaving(true);
        try {
            await wmsApi.createPicking({ orderRef: pickForm.orderRef, sku: pickForm.sku, name: pickForm.name, qty: Number(pickForm.qty)||0, whId: pickForm.whId, carrier: pickForm.carrier, status:'pending' });
            await reload();
            setPickForm({ orderRef:'', sku:'', name:'', qty:'', whId:'', carrier:'' });
        } catch (err) { alert(String(err?.message||err)); }
        setPickSaving(false);
    };

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
            onConfirm: async () => {
                if (pk._be) { try { await wmsApi.updatePicking(pk.id, { status: 'picked', carrier: pk.carrier || '' }); await reload(); } catch (e) { alert(String(e?.message || e)); } }
                else { setLocalOverride(prev => ({ ...prev, [pk.id]: { status: 'picked' } })); }
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

            {/* 207차 후속: 피킹리스트 생성 폼 (운영) */}
            {!IS_DEMO && (
                <form onSubmit={createPick} style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'flex-end', padding:'12px 14px', borderRadius:10, background:'rgba(79,142,247,0.05)', border:'1px solid rgba(79,142,247,0.18)' }}>
                    <div style={{ fontWeight:800, fontSize:12, width:'100%', color:'#374151' }}>➕ {t('wms.pickCreateTitle','피킹리스트 생성')}</div>
                    {[['orderRef',t('wms.pickColOrder')],['sku',t('wms.pickColSku')],['name',t('wms.pickColProduct')],['whId',t('wms.pickColWh')],['carrier','Carrier']].map(([k,ph])=>(
                        <input key={k} value={pickForm[k]} onChange={e=>setPickForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                            style={{ padding:'7px 9px', borderRadius:7, border:'1px solid rgba(0,0,0,0.12)', fontSize:11, width: k==='name'?150:110, fontFamily:'inherit' }} />
                    ))}
                    <input type="number" min="0" value={pickForm.qty} onChange={e=>setPickForm(f=>({...f,qty:e.target.value}))} placeholder={t('wms.pickColQty')}
                        style={{ padding:'7px 9px', borderRadius:7, border:'1px solid rgba(0,0,0,0.12)', fontSize:11, width:80, fontFamily:'inherit' }} />
                    <button type="submit" disabled={pickSaving} style={{ padding:'8px 16px', borderRadius:7, border:'none', background:'#4f8ef7', color:'#fff', fontWeight:700, fontSize:11, cursor:pickSaving?'default':'pointer', opacity:pickSaving?0.6:1 }}>{t('wms.pickCreateBtn','생성')}</button>
                </form>
            )}

            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {[t('wms.pickColId'),t('wms.pickColOrder'),t('wms.pickColSku'),t('wms.pickColProduct'),t('wms.pickColQty'),t('wms.pickColWh'),t('wms.pickColStatus'),t('wms.pickColCreated'),t('wms.pickColAction')].map(h=>(
                        <th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'#6b7280', fontWeight:700 }}>{h}</th>
                    ))}
                </tr></thead>
                <tbody>
                    {filtered.map(pk => (
                        <tr key={pk._be ? 'b'+pk.id : pk.id} style={{ borderBottom: '1px solid #e5e7eb', background: pk.status==='pending'?'rgba(249,115,22,0.03)':'' }}>
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
    const today = new Date();
    /* ── 205차: 백엔드 영속화(/api/wms/lots, FEFO 정렬). 새로고침 후에도 유지 ── */
    const [beLots, setBeLots] = React.useState([]);
    const reloadLots = React.useCallback(async () => {
        try {
            const r = await wmsApi.listLots();
            if (Array.isArray(r?.lots)) setBeLots(r.lots.map(l => ({
                id: l.id, sku: l.sku, name: l.name, lotNo: l.lot_no, mfgDate: l.mfg_date,
                expiryDate: l.expiry_date, qty: Number(l.qty) || 0, wh: l.wh_id,
                daysLeft: l.expiry_date ? Math.ceil((new Date(l.expiry_date) - new Date()) / (86400000)) : 9999,
            })));
        } catch {}
    }, []);
    React.useEffect(() => { reloadLots(); }, [reloadLots]);
    const allLots = [...beLots, ...lotManagement];
    const expiringSoon = allLots.filter(l => l.daysLeft <= 30);
    const handleSubmit = async () => {
        const expiry = new Date(form.expiryDate);
        const daysLeft = Math.ceil((expiry - today) / (1000*60*60*24));
        try { await wmsApi.createLot(form); await reloadLots(); } catch {}
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
    /* ── 205차: 운영=백엔드 영속(/api/wms/supply-orders), 데모=GlobalDataContext 단일소스 ── */
    const [beOrders, setBeOrders] = React.useState([]);
    const reload = React.useCallback(async () => {
        if (IS_DEMO) return;
        try {
            const r = await wmsApi.listSupplyOrders();
            if (Array.isArray(r?.supplyOrders)) setBeOrders(r.supplyOrders.map(o => ({
                id: o.id, _be: true, sku: o.sku, name: o.name, qty: Number(o.qty) || 0,
                supplier: o.supplier, status: o.status, eta: o.eta, wh: o.wh_id,
                orderDate: (o.created_at || '').slice(0, 10), unitCost: 0, total: 0,
            })));
        } catch {}
    }, []);
    React.useEffect(() => { reload(); }, [reload]);
    const rows = IS_DEMO ? supplyOrders : beOrders;
    const handleAutoFill = (item) => {
        const totalStock = Object.values(item.stock).reduce((a,b)=>a+b,0);
        const suggested = Math.max(item.safeQty * 3 - totalStock, 50);
        setForm({ sku:item.sku, name:item.name, qty:suggested, supplier:'', unitCost:item.cost, eta:'' });
    };
    const handleSubmit = async () => {
        if (IS_DEMO) { addSupplyOrder(form); }
        else { try { await wmsApi.createSupplyOrder(form); await reload(); } catch (e) { alert(String(e?.message || e)); return; } }
        setSaved(true); setTimeout(()=>setSaved(false),2000);
    };
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
                        {rows.map(po => (
                            <tr key={po._be ? 'b'+po.id : po.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
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
    const whs = useWmsWarehouses();   // [280차 P1] 번들 출고를 실제 주창고로 서버 원장에 반영(하드코딩 W001 제거)
    // currency formatting via useCurrency fmt()
    const [bundles, setBundles] = useState(INIT_BUNDLES);
    // [279차 감사 E-P1] 번들/키트 BOM 정의 = 종전 인메모리 전용(새로고침 소실→출고 시 참조불가). 서버 영속(WorkspaceState).
    const _bdlHydrated = useRef(!wsEnabled);
    useEffect(() => {
        let alive = true;
        if (wsEnabled) loadWorkspace('wms_bundle').then(v => { if (alive) { if (Array.isArray(v)) setBundles(v); _bdlHydrated.current = true; } }).catch(() => {}); // [M3-P1] 실패 시 가드 미개방(서버값 보존)
        return () => { alive = false; };
    }, []);
    useEffect(() => { if (wsEnabled && _bdlHydrated.current) saveWorkspace('wms_bundle', bundles).catch(() => {}); }, [bundles]);
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
        // [280차 P1] ★번들 출고 = 가짜 버튼이었다: ① type:'Outbound'(영문)는 registerInOut 이 인식 못 해
        //   (한글 '출고'만) 로컬 재고 delta=0 ② wmsApi.createMovement(서버 원장) 미호출 ③ whId 'W001' 하드코딩.
        //   → 번들 판매 시 구성품 재고가 서버·로컬 어디서도 차감 안 됨 = 초과판매·COGS 누락. 형제 단건출고
        //   패턴대로 서버 원장에 보내고 한글 type·실제 주창고·실패 표면화로 교정.
        const wh = whs[0]?.id || '';
        if (!wh) { addAlert({ type: 'error', msg: t('wms.noWarehouse', '창고가 없습니다. 먼저 창고를 등록하세요.') }); return; }
        const ref = `BDL-${bundle.id || bundle.name}-${Date.now()}`;
        bundle.components.forEach(comp => {
            const payload = { type: '출고', sku: comp.sku, qty: comp.qty * qty, whId: wh,
                name: comp.name, by: `Bundle(${bundle.name})`, reason: 'Bundle Sale', ref };
            registerInOut(payload);
            if (!IS_DEMO) wmsApi.createMovement({ ...payload, wh_id: wh }).catch(e => {
                addAlert({ type: 'error', msg: `${comp.sku}: ${(e && e.message) || t('wms.outboundFail', '출고 반영 실패')}` });
            });
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

/* ═══ TAB 13: Inventory Count / Audit ══════════ */
const InventoryAuditTab = memo(function InventoryAuditTab({ inventory }) {

    const { t } = useI18n();
    const { adjustStock } = useGlobalData(); // [현 차수] P1: 재고실사 일괄조정 단일소스
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

    // [현 차수] P1: 재고실사 일괄조정 — 실사 차이를 실제 재고로 반영(기존 alert 무동작 dead 버튼 해소).
    //   adjustStock(절대값=실사 실제수량) 단일소스 즉시반영 + 운영은 wmsApi.createMovement 감사 영속(CSV import 패턴).
    const handleBulkAdjust = () => {
        const diffs = auditItems.filter(i => i.diff !== null && i.diff !== 0);
        if (!diffs.length) return;
        // [현 차수 P0] ★다창고 재고 파괴 + 유령창고 + 무음실패 3중 수정.
        //   종전엔 다창고 SKU 의 '전 창고 합계' 실사수량을 '첫 창고'에 절대SET → 총재고가 부풀었다
        //   (W-A30+W-B20=50, 실사45 입력 → adjustStock(W-A,45) → W-A45+W-B20=65). 델타(diff)를 한 창고에
        //   적용해 총재고 변화=diff 로 정합화한다. 창고 미상 항목은 건너뛴다(유령 'W001' 적재 금지).
        //   서버 반영 실패는 await 후 집계해 표면화(종전 try/catch 무음 + 무조건 "완료" alert).
        let srvFail = 0, adjusted = 0, skipped = 0;
        const pending = [];
        diffs.forEach(i => {
            const prod = (inventory || initInventory).find(p => p.sku === i.sku);
            const whKeys = prod ? Object.keys(prod.stock || {}) : [];
            const wh = (i.wh && whKeys.includes(String(i.wh))) ? i.wh : (whKeys[0] || '');
            if (!wh) { skipped++; return; } // 창고를 특정할 수 없는 항목은 조정하지 않는다(유령창고 금지)
            const curWh = Number((prod?.stock?.[wh]) || 0);
            adjustStock(i.sku, wh, Math.max(0, curWh + i.diff)); // ★델타 적용(절대 총량 SET 아님)
            adjusted++;
            if (!IS_DEMO) {
                // 부호있는 델타(diff=counted-book)를 StockAdj 로 보내 권위재고 반영(doAdj 동일 SSOT).
                pending.push(
                    wmsApi.createMovement({ sku: i.sku, name: i.name, qty: i.diff, wh_id: wh, type: 'StockAdj', reason: '재고실사 조정' })
                        .then(rr => { if (rr && rr.ok === false) srvFail++; }).catch(() => { srvFail++; })
                );
            }
        });
        Promise.allSettled(pending).then(() => {
            setStatus('adjusted');
            if (srvFail > 0) {
                alert(t('wms.auditPartial', '재고실사 조정: {a}건 시도, {f}건 서버 반영 실패 — 실패분은 잠시 후 원복될 수 있습니다.').replace('{a}', adjusted).replace('{f}', srvFail));
            } else {
                alert(t('wms.auditDone', '{a}건 재고 조정 완료').replace('{a}', adjusted) + (skipped > 0 ? t('wms.auditSkipped', ' ({s}건은 창고 미상으로 건너뜀)').replace('{s}', skipped) : ''));
            }
        });
    };

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
        w.document.write(`<!DOCTYPE html><html><head><title>${t('wms.auditTitle')} - ${auditDate}</title><style>body{font-family:sans-serif;font-size:10pt;margin:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 8px;font-size:9pt}.pass{color:green}.plus{color:blue}.minus{color:red}</style></head><body><h2>📋 ${t('wms.auditTitle')} (${auditDate})</h2><table><tr><th>SKU</th><th>${t('wmsPage.productName', '상품명')}</th><th>${t('wms.auditColBook')}</th><th>${t('wms.auditColInput')}</th><th>${t('wms.auditColDiff')}</th></tr>${rows}<tr style="background:#f5f5f5;font-weight:bold"><td colspan="4">${t('wms.auditTotalDiff')}</td><td style="text-align:center;color:${hasDiscrepancy?'red':'green'}">${hasDiscrepancy?'±'+totalDiff:t('wms.auditNoDiff')}</td></tr></table></body></html>`);
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
                        <Btn onClick={handleBulkAdjust} color="#ef4444">{t("wms.auditBulkAdj")}</Btn>
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
            // [현 차수] Tier0: 실제 추적 엔드포인트(/v427/logistics/track)로 재배선 + 운영 가짜 폴백 제거.
            //   기존엔 미존재 /api/carrier-track 호출 실패 시 _RESULT(데모 시뮬 타임라인)을 운영에 노출(목데이터 오염).
            const r = await fetch(`${BASE}/api/v427/logistics/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ carrier: carrierId, tracking_no: num }),
            });
            if (r.ok) {
                const d = await r.json();
                if (d && d.ok !== false) setResult(d.data || d);
                else setError((d && d.error) || t('wms.trackError', '추적 정보를 가져올 수 없습니다. 운송장/택배사를 확인하세요.'));
            } else {
                // [현 차수] 운영 가짜 폴백 제거 — 실패 시 데모 시뮬 노출 금지, 정직한 에러 표시
                setError(t('wms.trackError', '추적 정보를 가져올 수 없습니다. 운송장/택배사를 확인하세요.'));
            }
        } catch {
            setError(t('wms.trackError', '추적 정보를 가져올 수 없습니다. 운송장/택배사를 확인하세요.'));
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

/* ═══ TAB 15: Usage Guide (Enterprise 12-Step) ═══════════════ */
/* 184차 #6: enterprise 패턴 렌더러(CRM/OmniChannel/PriceOpt/Kakao/Email/CampaignMgr/JourneyBuilder/IntegrationHub 정본 동일, NS=wms). */
const WmsGuideTab = memo(function WmsGuideTab() {
    const { t } = useI18n();
    const g = (k) => { const v = t('wms.' + k, ''); return (v && !String(v).includes('wms.')) ? v : ''; };
    const COLORS = ['#4f8ef7','#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48'];
    const ICONS = ['🏢','🔗','📥','📊','🏷️','🛒','📦','🚚','📍','📋','🔄','🛡️'];
    const STEPS = [];
    for (let i = 1; i <= 12; i++) { const title = g('guideStep' + i + 'Title'); if (title) STEPS.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[(i - 1) % ICONS.length], color: COLORS[(i - 1) % COLORS.length], n: i }); }
    const TIPS = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) TIPS.push(tip); }
    const FAQS = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) FAQS.push({ q, a: g('guideFaq' + i + 'A') }); }
    const BADGES = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
    const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
    const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
    return (
        <div style={{ display: 'grid', gap: 18, color: '#1e293b' }}>
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#faf5ff)', borderRadius: 16, border: '1px solid #bfdbfe', padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏬</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginBottom: 6, letterSpacing: '-0.02em', WebkitTextFillColor: '#1e293b' }}>{t('wms.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{t('wms.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {BADGES.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
                </div>}
            </div>
            {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{[g('guideLearnDesc1'), g('guideLearnDesc2')].filter(Boolean).join('\n\n')}</div></div> : null}
            {STEPS.length > 0 && <div style={card}>
                {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {STEPS.map((s) => (
                        <div key={s.n} style={{ padding: '16px 18px', borderRadius: 14, background: s.color + '08', border: '1px solid ' + s.color + '22', display: 'flex', gap: 14, alignItems: 'start' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '15', border: '1px solid ' + s.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + '20', padding: '2px 8px', borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>}
            {TIPS.length > 0 && <div style={{ ...card, background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.25)' }}>
                <div style={secTitle}>💡 {t('wms.guideTipsTitle')}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {TIPS.map((tip, i) => (<div key={i} style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 12.5, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}><span style={{ color: '#22c55e', fontWeight: 900, WebkitTextFillColor: '#22c55e' }}>✓</span><span>{tip}</span></div>))}
                </div>
            </div>}
            {FAQS.length > 0 && <div style={card}>
                <div style={secTitle}>❓ {t('wms.guideFaqTitle')}</div>
                <div style={{ display: 'grid', gap: 12 }}>
                    {FAQS.map((f, i) => (<div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: 10 }}><div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 4, WebkitTextFillColor: '#1e293b' }}>Q. {f.q}</div><div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.7, WebkitTextFillColor: '#475569' }}>{f.a}</div></div>))}
                </div>
            </div>}
            {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={secTitle}>🔒 {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
            {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🛠️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
            {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,#eff6ff,#faf5ff)', borderRadius: 16, border: '1px solid #bfdbfe', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: '#1e293b', marginBottom: 8, WebkitTextFillColor: '#1e293b' }}>🎉 {g('guideReadyTitle')}</div>
                <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.8, fontWeight: 500, whiteSpace: 'pre-line', maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{[g('guideReadyDesc1'), g('guideReadyDesc2')].filter(Boolean).join('\n\n')}</div>
            </div> : null}
        </div>
    );
});

/* ═══ TAB: Bin Locations (로케이션/빈 관리 + 빈재고) ═══════════════ */
const BinLocationsTab = memo(function BinLocationsTab() {
    const { t } = useI18n();
    const whs = useWmsWarehouses();
    const [bins, setBins] = useState([]);
    const [binStock, setBinStock] = useState([]);
    const [form, setForm] = useState({ code: '', zone: '', aisle: '', rack: '', level: '', slot: '', seq: '', wh_id: 'W001' });
    const [editing, setEditing] = useState(null); // id or null
    const [showForm, setShowForm] = useState(false);
    const [view, setView] = useState('bins'); // 'bins' | 'stock'

    const reload = useCallback(async () => {
        try { const r = await binsApi.list(); setBins(Array.isArray(r?.bins) ? r.bins : (Array.isArray(r?.rows) ? r.rows : (Array.isArray(r) ? r : []))); } catch (e) { /* keep */ }
    }, []);
    const reloadStock = useCallback(async () => {
        try { const r = await binsApi.stock(); setBinStock(Array.isArray(r?.binStock) ? r.binStock : (Array.isArray(r?.stock) ? r.stock : (Array.isArray(r?.rows) ? r.rows : (Array.isArray(r) ? r : [])))); } catch (e) { /* keep */ }
    }, []);
    useEffect(() => { reload(); reloadStock(); }, [reload, reloadStock]);

    const reset = () => { setForm({ code: '', zone: '', aisle: '', rack: '', level: '', slot: '', seq: '', wh_id: whOpts(whs)[0].v }); setEditing(null); };
    const save = async () => {
        if (!form.code) return alert(t('wms.bins.codeRequired', '빈 코드를 입력하세요'));
        const body = { ...form, seq: form.seq === '' ? 0 : Number(form.seq) };
        try {
            if (editing) await binsApi.update(editing, body);
            else await binsApi.create(body);
            await reload();
        } catch (e) { if (handlePlanLimit(e)) return; return alert(String(e?.message || e)); }
        reset(); setShowForm(false);
    };
    const editBin = (b) => { setForm({ code: b.code || '', zone: b.zone || '', aisle: b.aisle || '', rack: b.rack || '', level: b.level || '', slot: b.slot || '', seq: b.seq ?? '', wh_id: b.wh_id || 'W001' }); setEditing(b.id); setShowForm(true); };
    const removeBin = async (id) => {
        if (!window.confirm(t('wms.bins.deleteConfirm', '이 로케이션을 삭제할까요?'))) return;
        try { await binsApi.remove(id); await reload(); await reloadStock(); } catch (e) { alert(String(e?.message || e)); }
    };
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <Sec action={<div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setView('bins')} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: view === 'bins' ? '#2563eb' : '#eef2ff', color: view === 'bins' ? '#fff' : '#374151' }}>{t('wms.bins.tabBins', '로케이션')}</button>
                <button onClick={() => setView('stock')} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: view === 'stock' ? '#2563eb' : '#eef2ff', color: view === 'stock' ? '#fff' : '#374151' }}>{t('wms.bins.tabStock', '빈 재고')}</button>
                <Btn onClick={() => { reset(); setShowForm(s => !s); }} color="#4f8ef7">+ {t('wms.bins.addBtn', '빈 추가')}</Btn>
            </div>}>{t('wms.bins.title', '로케이션(빈) 관리')}</Sec>

            {showForm && view === 'bins' && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{editing ? t('wms.bins.editTitle', '빈 수정') : t('wms.bins.newTitle', '새 빈 등록')}</Sec>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                        <Input label={t('wms.bins.code', '빈 코드')} value={form.code} onChange={v => setF('code', v)} placeholder="A-01-01-1" />
                        <Select label={t('wms.bins.wh', '창고')} value={form.wh_id} onChange={v => setF('wh_id', v)} opts={whOpts(whs)} />
                        <Input label={t('wms.bins.zone', '존')} value={form.zone} onChange={v => setF('zone', v)} placeholder="A" />
                        <Input label={t('wms.bins.aisle', '통로')} value={form.aisle} onChange={v => setF('aisle', v)} placeholder="01" />
                        <Input label={t('wms.bins.rack', '랙')} value={form.rack} onChange={v => setF('rack', v)} placeholder="01" />
                        <Input label={t('wms.bins.level', '단')} value={form.level} onChange={v => setF('level', v)} placeholder="1" />
                        <Input label={t('wms.bins.slot', '번')} value={form.slot} onChange={v => setF('slot', v)} placeholder="1" />
                        <Input label={t('wms.bins.seq', '피킹 순서')} value={form.seq} onChange={v => setF('seq', v)} type="number" placeholder="0" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <Btn onClick={save} color="#22c55e">{t('wms.bins.saveBtn', '저장')}</Btn>
                        <Btn onClick={() => { reset(); setShowForm(false); }} color="#666">{t('wms.whCancelBtn')}</Btn>
                    </div>
                </div>
            )}

            {view === 'bins' && (
                <div className="card card-glass">
                    <table className="table">
                        <thead><tr>
                            <th>{t('wms.bins.code', '빈 코드')}</th><th>{t('wms.bins.wh', '창고')}</th><th>{t('wms.bins.zone', '존')}</th>
                            <th>{t('wms.bins.aisle', '통로')}</th><th>{t('wms.bins.rack', '랙')}</th><th>{t('wms.bins.level', '단')}</th>
                            <th>{t('wms.bins.slot', '번')}</th><th>{t('wms.bins.seq', '피킹 순서')}</th><th>{t('wms.permColAction')}</th>
                        </tr></thead>
                        <tbody>
                            {bins.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontSize: 12 }}>{t('wms.bins.empty', '등록된 로케이션이 없습니다')}</td></tr>}
                            {bins.map(b => (
                                <tr key={b.id}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{b.code}</td>
                                    <td style={{ fontSize: 11 }}>{(whs.find(w => w.id === b.wh_id)?.code) || b.wh_id}</td>
                                    <td style={{ fontSize: 11 }}>{b.zone}</td>
                                    <td style={{ fontSize: 11 }}>{b.aisle}</td>
                                    <td style={{ fontSize: 11 }}>{b.rack}</td>
                                    <td style={{ fontSize: 11 }}>{b.level}</td>
                                    <td style={{ fontSize: 11, textAlign: 'center' }}>{b.slot || '—'}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.seq ?? '—'}</td>
                                    <td style={{ display: 'flex', gap: 6 }}>
                                        <Btn onClick={() => editBin(b)} color="#6366f1" small>{t('wms.supEditBtn')}</Btn>
                                        <Btn onClick={() => removeBin(b.id)} color="#ef4444" small>🗑</Btn>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'stock' && (
                <div className="card card-glass">
                    <table className="table">
                        <thead><tr>
                            <th>{t('wms.bins.code', '빈 코드')}</th><th>{t('wms.bins.wh', '창고')}</th>
                            <th>{t('wms.bins.locPath', '보관 위치(랙·단·번)')}</th>
                            <th>{t('wms.ioColSku')}</th><th>{t('wms.ioColProduct')}</th><th>{t('wms.ioColQty')}</th>
                        </tr></thead>
                        <tbody>
                            {binStock.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontSize: 12 }}>{t('wms.bins.stockEmpty', '빈 재고가 없습니다')}</td></tr>}
                            {binStock.map((s, i) => {
                                // 상품이 '어느 창고 / 몇 번 랙 / 몇 단 / 몇 번'에 있는지 한 눈에.
                                const parts = [];
                                if (s.zone) parts.push(`${t('wms.bins.zone', '존')} ${s.zone}`);
                                if (s.rack) parts.push(`${t('wms.bins.rack', '랙')} ${s.rack}`);
                                if (s.level) parts.push(`${t('wms.bins.level', '단')} ${s.level}`);
                                if (s.slot) parts.push(`${t('wms.bins.slot', '번')} ${s.slot}`);
                                const loc = parts.join(' · ');
                                return (
                                <tr key={s.id || i}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{s.bin || s.code || s.bin_code}</td>
                                    <td style={{ fontSize: 11 }}>{(whs.find(w => w.id === s.wh_id)?.code) || s.wh_id}</td>
                                    <td style={{ fontSize: 11, color: loc ? '#111827' : '#9ca3af' }}>{loc || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{s.sku}</td>
                                    <td style={{ fontSize: 12 }}>{s.name}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#22c55e' }}>{Number(s.qty ?? s.on_hand ?? 0)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

/* ═══ TAB: Barcode / Serial Registry (바코드·시리얼 매핑) ═══════════════ */
const BarcodeRegistryTab = memo(function BarcodeRegistryTab() {
    const { t } = useI18n();
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState({ code: '', sku: '', kind: 'barcode', status: 'active' });
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');

    const reload = useCallback(async () => {
        try { const r = await barcodesApi.list(); setRows(Array.isArray(r?.barcodes) ? r.barcodes : (Array.isArray(r?.rows) ? r.rows : (Array.isArray(r) ? r : []))); } catch (e) { /* keep */ }
    }, []);
    useEffect(() => { reload(); }, [reload]);

    const save = async () => {
        if (!form.code || !form.sku) return alert(t('wms.barcodes.required', '바코드와 SKU를 입력하세요'));
        try { await barcodesApi.create(form); await reload(); } catch (e) { if (handlePlanLimit(e)) return; return alert(String(e?.message || e)); }
        setForm({ code: '', sku: '', kind: 'barcode', status: 'active' }); setShowForm(false);
    };
    const remove = async (id) => {
        if (!window.confirm(t('wms.barcodes.deleteConfirm', '이 매핑을 삭제할까요?'))) return;
        try { await barcodesApi.remove(id); await reload(); } catch (e) { alert(String(e?.message || e)); }
    };
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const q = search.trim().toLowerCase();
    const filtered = q ? rows.filter(r => (r.code || '').toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q)) : rows;

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <Sec action={<Btn onClick={() => setShowForm(s => !s)} color="#4f8ef7">+ {t('wms.barcodes.addBtn', '매핑 추가')}</Btn>}>{t('wms.barcodes.title', '바코드/시리얼 매핑')}</Sec>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('wms.barcodes.desc', '바코드 또는 시리얼번호를 SKU에 연결해 스캔 입출고를 인식합니다.')}</div>

            {showForm && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{t('wms.barcodes.newTitle', '새 매핑 등록')}</Sec>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
                        <Input label={t('wms.barcodes.code', '바코드/시리얼')} value={form.code} onChange={v => setF('code', v)} placeholder="8801234567890" />
                        <Input label={t('wms.ioSkuLabel')} value={form.sku} onChange={v => setF('sku', v)} placeholder="EP-PRX-001" />
                        <Select label={t('wms.barcodes.kind', '유형')} value={form.kind} onChange={v => setF('kind', v)} opts={[{ v: 'barcode', l: t('wms.barcodes.kindBarcode', '바코드') }, { v: 'serial', l: t('wms.barcodes.kindSerial', '시리얼') }]} />
                        <Select label={t('wms.barcodes.status', '상태')} value={form.status} onChange={v => setF('status', v)} opts={[{ v: 'active', l: t('wms.barcodes.statusActive', '활성') }, { v: 'inactive', l: t('wms.barcodes.statusInactive', '비활성') }]} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <Btn onClick={save} color="#22c55e">{t('wms.bins.saveBtn', '저장')}</Btn>
                        <Btn onClick={() => setShowForm(false)} color="#666">{t('wms.whCancelBtn')}</Btn>
                    </div>
                </div>
            )}

            <div style={{ position: 'relative' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('wms.barcodes.searchPh', '바코드 / SKU 검색')}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 9, background: '#fff', border: '1px solid #d1d5db', color: '#1f2937', fontSize: 12, outline: 'none' }} />
            </div>

            <div className="card card-glass">
                <table className="table">
                    <thead><tr>
                        <th>{t('wms.barcodes.code', '바코드/시리얼')}</th><th>{t('wms.ioColSku')}</th>
                        <th>{t('wms.barcodes.kind', '유형')}</th><th>{t('wms.barcodes.status', '상태')}</th><th>{t('wms.permColAction')}</th>
                    </tr></thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontSize: 12 }}>{t('wms.barcodes.empty', '등록된 매핑이 없습니다')}</td></tr>}
                        {filtered.map(r => (
                            <tr key={r.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{r.code}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.sku}</td>
                                <td><Tag label={r.kind === 'serial' ? t('wms.barcodes.kindSerial', '시리얼') : t('wms.barcodes.kindBarcode', '바코드')} color={r.kind === 'serial' ? '#a855f7' : '#4f8ef7'} /></td>
                                <td><Tag label={(r.status === 'inactive') ? t('wms.barcodes.statusInactive', '비활성') : t('wms.barcodes.statusActive', '활성')} color={(r.status === 'inactive') ? '#666' : '#22c55e'} /></td>
                                <td><Btn onClick={() => remove(r.id)} color="#ef4444" small>🗑</Btn></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

/* ═══ TAB: Scan (스캔 입고·출고·적치) ═══════════════ */
const ScanForm = memo(function ScanForm({ kind, whs, title, color }) {
    const { t } = useI18n();
    const [form, setForm] = useState({ code: '', qty: '1', wh_id: whOpts(whs)[0].v, bin: '' });
    const [result, setResult] = useState(null); // {ok, msg, unresolved}
    const [busy, setBusy] = useState(false);
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const submit = async () => {
        if (!form.code) { setResult({ ok: false, msg: t('wms.scan.codeRequired', '바코드/SKU를 입력하세요') }); return; }
        const body = { barcode: form.code, sku: form.code, qty: Number(form.qty) || 1, wh_id: form.wh_id, bin: form.bin };
        setBusy(true); setResult(null);
        try {
            const fn = kind === 'in' ? scanApi.scanIn : kind === 'out' ? scanApi.scanOut : scanApi.putaway;
            const res = await fn(body);
            // 백엔드가 바코드/SKU 를 해석하지 못한 경우
            if (res?.unresolved || res?.resolved === false || (res && res.ok === false && /unresolv|not\s*found|no\s*match/i.test(String(res.error || res.message || '')))) {
                setResult({ ok: false, unresolved: true, msg: t('wms.scan.unresolved', '바코드/SKU를 인식할 수 없습니다') });
            } else if (res && res.ok === false) {
                setResult({ ok: false, msg: String(res.error || res.message || t('wms.scan.failed', '처리 실패')) });
            } else {
                const sku = res?.sku || res?.resolved_sku || form.code;
                setResult({ ok: true, msg: t('wms.scan.done', '처리 완료') + (sku ? ` · ${sku}` : '') });
                setForm(p => ({ ...p, code: '' }));
            }
        } catch (e) {
            if (handlePlanLimit(e)) { setBusy(false); return; }
            const em = String(e?.message || e);
            if (/unresolv|not\s*found|no\s*match|404/i.test(em)) setResult({ ok: false, unresolved: true, msg: t('wms.scan.unresolved', '바코드/SKU를 인식할 수 없습니다') });
            else setResult({ ok: false, msg: em });
        } finally { setBusy(false); }
    };

    return (
        <div className="card card-glass" style={{ padding: 18, borderTop: `3px solid ${color}` }}>
            <Sec>{title}</Sec>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                <Input label={t('wms.scan.code', '바코드 / SKU')} value={form.code} onChange={v => setF('code', v)} placeholder="8801234567890 / EP-PRX-001" />
                <Input label={t('wms.ioQtyLabel')} value={form.qty} onChange={v => setF('qty', v)} type="number" placeholder="1" />
                <Select label={t('wms.bins.wh', '창고')} value={form.wh_id} onChange={v => setF('wh_id', v)} opts={whOpts(whs)} />
                <Input label={t('wms.scan.bin', '로케이션(빈)')} value={form.bin} onChange={v => setF('bin', v)} placeholder="A-01-01-1" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                <Btn onClick={submit} color={color}>{busy ? '…' : title}</Btn>
                {result && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: result.ok ? '#22c55e' : (result.unresolved ? '#f97316' : '#ef4444') }}>
                        {result.ok ? '✅' : (result.unresolved ? '⚠️' : '⛔')} {result.msg}
                    </span>
                )}
            </div>
        </div>
    );
});
const ScanTab = memo(function ScanTab() {
    const { t } = useI18n();
    const whs = useWmsWarehouses();
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <Sec>{t('wms.scan.title', '스캔 입출고·적치')}</Sec>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('wms.scan.desc', '바코드 또는 SKU를 입력해 입고/출고/적치를 처리합니다. 등록된 바코드↔SKU 매핑으로 자동 인식됩니다.')}</div>
            <ScanForm kind="in" whs={whs} title={t('wms.scan.in', '스캔 입고')} color="#22c55e" />
            <ScanForm kind="out" whs={whs} title={t('wms.scan.out', '스캔 출고')} color="#4f8ef7" />
            <ScanForm kind="putaway" whs={whs} title={t('wms.scan.putaway', '적치(Put-away)')} color="#a855f7" />
        </div>
    );
});

/* ═══ TAB: Wave Picking (웨이브 피킹) ═══════════════ */
const WavePickingTab = memo(function WavePickingTab() {
    const { t } = useI18n();
    const whs = useWmsWarehouses();
    const [waves, setWaves] = useState([]);
    const [form, setForm] = useState({ name: '', zone: '', wh_id: whOpts(whs)[0].v, orders: '' });
    const [showForm, setShowForm] = useState(false);

    const reload = useCallback(async () => {
        try { const r = await wavesApi.list(); setWaves(Array.isArray(r?.waves) ? r.waves : (Array.isArray(r?.rows) ? r.rows : (Array.isArray(r) ? r : []))); } catch (e) { /* keep */ }
    }, []);
    useEffect(() => { reload(); }, [reload]);

    const create = async () => {
        const orders = form.orders.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
        const body = { name: form.name || undefined, zone: form.zone || undefined, wh_id: form.wh_id, orders };
        try { await wavesApi.create(body); await reload(); } catch (e) { if (handlePlanLimit(e)) return; return alert(String(e?.message || e)); }
        setForm({ name: '', zone: '', wh_id: whOpts(whs)[0].v, orders: '' }); setShowForm(false);
    };
    const confirm = async (id) => {
        try { const r = await wavesApi.confirm(id); await reload(); if (r?.status) { /* status reflected on reload */ } } catch (e) { alert(String(e?.message || e)); }
    };
    const remove = async (id) => {
        if (!window.confirm(t('wms.wave.deleteConfirm', '이 웨이브를 삭제할까요?'))) return;
        try { await wavesApi.remove(id); await reload(); } catch (e) { alert(String(e?.message || e)); }
    };
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <Sec action={<Btn onClick={() => setShowForm(s => !s)} color="#4f8ef7">+ {t('wms.wave.addBtn', '웨이브 생성')}</Btn>}>{t('wms.wave.title', '웨이브 피킹')}</Sec>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('wms.wave.desc', '여러 주문을 존별로 묶어 피킹 동선 순서로 정렬합니다. 확정 시 출고 이동으로 전환됩니다.')}</div>

            {showForm && (
                <div className="card card-glass" style={{ padding: 18 }}>
                    <Sec>{t('wms.wave.newTitle', '새 웨이브')}</Sec>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
                        <Input label={t('wms.wave.name', '웨이브명')} value={form.name} onChange={v => setF('name', v)} placeholder="WAVE-2026-001" />
                        <Select label={t('wms.bins.wh', '창고')} value={form.wh_id} onChange={v => setF('wh_id', v)} opts={whOpts(whs)} />
                        <Input label={t('wms.bins.zone', '존')} value={form.zone} onChange={v => setF('zone', v)} placeholder="A" />
                        <Input label={t('wms.wave.orders', '주문번호(쉼표 구분)')} value={form.orders} onChange={v => setF('orders', v)} placeholder="ORD-1, ORD-2, ORD-3" style={{ gridColumn: '1 / -1' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <Btn onClick={create} color="#22c55e">{t('wms.wave.createBtn', '생성')}</Btn>
                        <Btn onClick={() => setShowForm(false)} color="#666">{t('wms.whCancelBtn')}</Btn>
                    </div>
                </div>
            )}

            <div className="card card-glass">
                <table className="table">
                    <thead><tr>
                        <th>{t('wms.wave.name', '웨이브명')}</th><th>{t('wms.bins.wh', '창고')}</th><th>{t('wms.bins.zone', '존')}</th>
                        <th>{t('wms.wave.orderCount', '주문 수')}</th><th>{t('wms.barcodes.status', '상태')}</th><th>{t('wms.ioColDate')}</th><th>{t('wms.permColAction')}</th>
                    </tr></thead>
                    <tbody>
                        {waves.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontSize: 12 }}>{t('wms.wave.empty', '생성된 웨이브가 없습니다')}</td></tr>}
                        {waves.map(w => {
                            const oc = w.order_count ?? (Array.isArray(w.orders) ? w.orders.length : (w.orders || '—'));
                            return (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 700, color: '#2563eb' }}>{w.name || w.code || ('WAVE-' + w.id)}</td>
                                    <td style={{ fontSize: 11 }}>{(whs.find(x => x.id === w.wh_id)?.code) || w.wh_id || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{w.zone || '—'}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{oc}</td>
                                    <td>{w.status ? <Tag label={w.status} color={WAVE_STATUS_COLOR[String(w.status).toLowerCase()] || '#4f8ef7'} /> : <Tag label={t('wms.wave.statusOpen', '대기')} color="#4f8ef7" />}</td>
                                    <td style={{ fontSize: 11, color: '#6b7280' }}>{w.created_at || w.at || '—'}</td>
                                    <td style={{ display: 'flex', gap: 6 }}>
                                        {!(w.status && /completed/i.test(String(w.status))) && <Btn onClick={() => confirm(w.id)} color="#22c55e" small>{t('wms.wave.confirmBtn', '피킹 확정')}</Btn>}
                                        <Btn onClick={() => remove(w.id)} color="#ef4444" small>🗑</Btn>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default function WmsManager() {
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { inventory, totalInventoryValue, totalInventoryQty, lowStockCount, orderStats, pickingLists, lotManagement, supplyOrders, addSupplyOrder, updateSupplyOrderStatus, registerLot, connectedChannels: ctxChannels, addAlert } = useGlobalData();
    const [tab, setTab] = useState("dashboard");
    // [286차] ★메인 컴포넌트도 창고를 로드한다 — 종전 `const [whs]=useState(initWarehouses)`(운영=[]·정적)라
    //   WarehouseTab 에서 창고를 등록해도 InOutTab(입출고 폼)에는 빈 창고목록이 전달돼 "창고가 안 나타남" 결함.
    const [whs, setWhs] = useState(initWarehouses);
    useEffect(() => {
        let alive = true;
        (async () => { try { const r = await wmsApi.listWarehouses(); if (alive && Array.isArray(r?.warehouses) && r.warehouses.length) setWhs(r.warehouses); } catch { /* 미등록·오류 시 기존 유지 */ } })();
        return () => { alive = false; };
    }, []);
    // [286차] 카탈로그 등에서 `?tab=inout&sku=&name=&qty=` 로 진입 시 입고등록 폼 프리필(재고=입고 이벤트 원장경유).
    const [inboundPrefill, setInboundPrefill] = useState(null);
    useEffect(() => {
        try {
            const q = new URLSearchParams(window.location.search);
            if (q.get('tab')) setTab(q.get('tab'));
            if (q.get('sku')) setInboundPrefill({ sku: q.get('sku') || '', name: q.get('name') || '', qty: q.get('qty') || '' });
        } catch { /* no-op */ }
    }, []);
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

    // [281\uCC28 P2] \u2605\uAC10\uC0AC\uCD94\uC801\uC744 \uC11C\uBC84 \uC6D0\uC7A5(wms_movements) \uAE30\uBC18\uC73C\uB85C \uAD50\uCCB4. \uC885\uC804\uC5D4 localStorage('wms_audit_log')
    //   \uAE30\uBC18\uC778\uB370 addAuditEntry \uD638\uCD9C\uBD80\uAC00 0\uAC74\uC774\uB77C \uD56D\uC0C1 \uBE44\uC5B4 \uC788\uC5C8\uACE0(\uAC89\uBCF4\uAE30 \uAC10\uC0AC\uAE30\uB2A5\u00B7\uC2E4\uC81C \uBBF8\uC791\uB3D9), \uCE90\uC2DC \uC0AD\uC81C\u00B7\uD0C0
    //   \uAE30\uAE30\uC5D0\uC11C \uC18C\uC2E4\uB418\uBA70 \uBCC0\uC870 \uBC29\uC9C0\uB3C4 \uC5C6\uC5C8\uB2E4("\uC740\uD589\uAE09 \uAC10\uC0AC"\uB85C \uBCF4\uC774\uB098 \uC2E4\uC81C \uAC10\uC0AC \uC6D0\uC7A5 \uC544\uB2D8). \uC2E4 \uC7AC\uACE0 \uC774\uB3D9\uC740 \uC774\uBBF8
    //   \uC11C\uBC84 wms_movements(\uBCC0\uC870\uBC29\uC9C0\u00B7tenant\uC2A4\uCF54\uD504)\uC5D0 \uAE30\uB85D\uB418\uBBC0\uB85C \uADF8\uAC78 \uC870\uD68C\uD574 \uD45C\uC2DC\uD55C\uB2E4(\uC9C4\uC9DC \uAC10\uC0AC \uAC00\uCE58).
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const loadAuditLog = React.useCallback(() => {
        setAuditLoading(true);
        wmsApi.listMovements(500)
            .then(r => setAuditLog(Array.isArray(r?.movements) ? r.movements : (Array.isArray(r) ? r : [])))
            .catch(() => setAuditLog([]))
            .finally(() => setAuditLoading(false));
    }, []);
    React.useEffect(() => { if (showAuditLog) loadAuditLog(); }, [showAuditLog, loadAuditLog]);
    const exportAuditLog = () => {
        const rows = auditLog.map(e => [e.created_at || e.timestamp || '', e.type || e.action || '', `"${(e.sku || '') + ' ' + (e.name || '') + ' x' + (e.qty ?? '')}"`, e.wh_id || '', e.reason || e.ref || ''].join(','));
        const csv = [['Timestamp','Type','Item','Warehouse','Reason'].join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wms_audit_trail_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    };

    const TABS_I18N = [
        { id: "dashboard", label: t("wms.tabDashboard", "📊 물류 대시보드"), desc: t("wms.tabDashboardDesc", "실시간 출고율·재고·회전율·유통기한·반품처리율") },
        { id: "warehouse", label: t("wms.tabWarehouse"), desc: t("wms.tabWarehouseDesc") },
        { id: "inout", label: t("wms.tabInOut"), desc: t("wms.tabInOutDesc") },
        { id: "inventory", label: t("wms.tabInventory"), desc: t("wms.tabInventoryDesc") },
        { id: "bins", label: t("wms.tabBins", "📍 로케이션"), desc: t("wms.tabBinsDesc", "빈 로케이션·피킹순서·빈재고") },
        { id: "barcodes", label: t("wms.tabBarcodes", "🏷️ 바코드"), desc: t("wms.tabBarcodesDesc", "바코드/시리얼↔SKU 매핑") },
        { id: "scan", label: t("wms.tabScan", "📷 스캔"), desc: t("wms.tabScanDesc", "스캔 입고·출고·적치") },
        { id: "wave", label: t("wms.tabWave", "🌊 웨이브"), desc: t("wms.tabWaveDesc", "웨이브 피킹·동선 확정") },
        { id: "tollprocessing", label: t("wms.tabToll", "🛠️ 임가공"), desc: t("wms.tabTollDesc", "외주 임가공 재고·이력 현황") },
        { id: "reports", label: t("wms.tabReports", "📈 정기 리포트"), desc: t("wms.tabReportsDesc", "일/월/분기/연간 리포트·물류 분석") },
        { id: "receiving", label: t("wms.tabReceiving"), desc: t("wms.tabReceivingDesc") },
        { id: "picking", label: t("wms.tabPicking"), desc: t("wms.tabPickingDesc") },
        { id: "lot", label: t("wms.tabLot"), desc: t("wms.tabLotDesc") },
        { id: "replenishment", label: t("wms.tabReplenishment"), desc: t("wms.tabReplenishmentDesc") },
        { id: "combine", label: t("wms.tabCombine"), desc: t("wms.tabCombineDesc") },
        { id: "carrier", label: t("wms.tabCarrier"), desc: t("wms.tabCarrierDesc") },
        { id: "tracking", label: t("wms.tabTracking"), desc: t("wms.tabTrackingDesc") },
        { id: "invoice", label: t("wms.tabInvoice"), desc: t("wms.tabInvoiceDesc") },
        { id: "bundle", label: t("wms.tabBundle"), desc: t("wms.tabBundleDesc") },
        /* [현 차수] '거래처'·'파트너 계정'은 팀·계정(/team-members)으로 통합 이관 — 중복 메뉴 제거. */
        { id: "audit", label: t("wms.tabAudit"), desc: t("wms.tabAuditDesc") },
        { id: "guide", label: t("wms.tabGuide"), desc: t("wms.tabGuideDesc") },
    ];

    // [237차] WMS 위저드 필수등록 게이팅 — 실제 상태 검증(미완 시 차단). null=시스템 자동확인.
    const wmsChecks = useMemo(() => {
        const cnt = async (ep, keys) => { try { const r = await _gjaWms(ep); for (const k of keys) { if (Array.isArray(r?.[k])) return r[k].length > 0; } return Array.isArray(r) ? r.length > 0 : false; } catch { return false; } };
        return [
            null,                                                              // 0 로그인
            async () => cnt('/api/wms/warehouses', ['warehouses', 'items', 'rows']), // 1 ★창고 1개 이상 등록 필수
            async () => cnt('/api/wms/movements', ['movements', 'items', 'rows']),   // 2 ★입고 1건 이상 필수
            null,                                                              // 3 재고 확인(자동)
            null,                                                              // 4 출고·피킹(자동)
            null,                                                              // 5 발주(자동)
        ];
    }, []);

    // [286차 SSOT 통일] 헤더 '총재고' KPI 를 재고현황 그리드와 동일한 wms_stock 원천으로 계산.
    //   종전엔 totalInventoryQty(GlobalData=channel_inventory 기반)라 WMS 실운용 시 같은 화면의 그리드(wms_stock)와
    //   갈렸다. 창고별 재고합(w.stock=SUM on_hand, 서버 권위·고아 병합 반영)의 총합 = 실물 총재고.
    //   창고 재고 데이터가 아직 없으면(초기/로딩) 기존 값으로 폴백(무회귀).
    const wmsWhTotal = (whs || []).reduce((s, w) => s + (Number(w.stock) || 0), 0);
    const hasWhStock = Array.isArray(whs) && whs.some(w => w && w.stock !== undefined && w.stock !== null);
    const totalStock = hasWhStock ? wmsWhTotal : totalInventoryQty;
    // 자산가치는 단가(cost)가 channel_inventory/po 원천이라 그대로 유지(물리수량×단가 가중). 총재고 정합이 우선.
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
        // 212차 #6(P2): window.fetch 전역 몽키패치 제거(다중 마운트·복원순서 어긋남 시 전역 fetch 체인 손상 위험).
        //   비침습 PerformanceObserver(resource 엔트리)로 네트워크 요청 수를 모니터링한다.
        let apiCallCount = 0;
        let perfObs = null;
        try {
            perfObs = new PerformanceObserver((list) => {
                for (const e of list.getEntries()) {
                    if (e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest') apiCallCount++;
                }
            });
            perfObs.observe({ type: 'resource', buffered: false });
        } catch (e) { /* PerformanceObserver 미지원 → 모니터 비활성(안전) */ }
        const rateLimitTimer = setInterval(() => {
            if (apiCallCount > 50) {
                setSecAlerts(prev => [{ id: Date.now().toString(36), time: new Date().toISOString(), type: 'Rate Limit', severity: 'warning', action: 'API Abuse', detail: `${apiCallCount} calls/min detected`, blocked: false }, ...prev].slice(0, 100));
            }
            apiCallCount = 0;
        }, 60000);
        return () => {
            document.removeEventListener('input', handler);
            clearInterval(rateLimitTimer);
            try { perfObs?.disconnect(); } catch (e) {}
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
                            <button onClick={() => navigate('/budget-tracker')} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#6b7280", fontSize: 10, cursor: "pointer" }}>{t("wms.wmsBtnBudget")}</button>
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
                                <button onClick={() => { setWhShowForm(true) }} data-onboard-cta="wms-warehouse" data-onboard-hint={t('wms.onboardHint', '여기서 첫 창고를 등록하세요')} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, color: '#fff', background: '#4f8ef7' }}>{t('wms.whAddBtn')}</button>
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
                        </div>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {auditLoading && <div style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontSize: 12 }}>{t('wms.loading', '불러오는 중…')}</div>}
                        {!auditLoading && auditLog.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontSize: 12 }}>{t('wms.auditLogEmpty')}</div>}
                        {!auditLoading && auditLog.map((entry, i) => {
                            const typ = String(entry.type || entry.action || '');
                            const isOut = /out|출고|폐기/i.test(typ);
                            const isIn = /in|입고|등록/i.test(typ);
                            return (
                            <div key={entry.id || i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
                                <div style={{ width: 4, minHeight: 30, borderRadius: 2, background: isOut ? '#ef4444' : isIn ? '#22c55e' : '#4f8ef7', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{typ} · {entry.sku || ''} {entry.qty != null ? `×${entry.qty}` : ''}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{entry.name || ''} {entry.wh_id ? `@${entry.wh_id}` : ''} {entry.reason || entry.ref || ''}</div>
                                </div>
                                <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <div>{entry.by || entry.user || '—'}</div>
                                    <div>{entry.created_at || entry.timestamp ? new Date(entry.created_at || entry.timestamp).toLocaleString() : ''}</div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {tab === "dashboard" && <WmsDashboardTab />}
            {tab === "tollprocessing" && <WmsTollProcessingTab />}
            {tab === "reports" && <WmsReportsTab />}
            {tab === "warehouse" && <WarehouseTab showForm={whShowForm} setShowForm={setWhShowForm} showPerms={whShowPerms} setShowPerms={setWhShowPerms} />}
            {tab === "inout" && <InOutTab whs={whs} prefill={inboundPrefill} onPrefillDone={() => setInboundPrefill(null)} />}
            {tab === "inventory" && <InventoryTab whs={whs} />}
            {tab === "bins" && <BinLocationsTab />}
            {tab === "barcodes" && <BarcodeRegistryTab />}
            {tab === "scan" && <ScanTab />}
            {tab === "wave" && <WavePickingTab />}
            {tab === "receiving" && <ReceivingTab supplyOrders={supplyOrders} updateSupplyOrderStatus={updateSupplyOrderStatus} />}
            {tab === "picking" && <PickingListTab pickingLists={pickingLists} />}
            {tab === "lot" && <LotManagementTab lotManagement={lotManagement} registerLot={registerLot} inventory={inventory} />}
            {tab === "replenishment" && <ReplenishmentTab supplyOrders={supplyOrders} addSupplyOrder={addSupplyOrder} inventory={inventory} />}
            {tab === "combine" && <CombineTab />}
            {tab === "carrier" && <CarrierTab />}
            {tab === "tracking" && <TrackingTab />}
            {tab === "invoice" && <InvoiceTab />}
            {tab === "bundle" && <BundleTab />}
            {/* [현 차수] supplier/partners 탭 제거 — 팀·계정(/team-members)으로 통합 이관 */}
            {tab === "audit" && <InventoryAuditTab inventory={inventory} />}
            {tab === "guide" && (
                <>
                    <div style={{ background: "var(--card-bg,#fff)", border: "1px solid var(--border,#e2e8f0)", borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
                        <GuideWizard guideKey="wms" checks={wmsChecks} />
                    </div>
                    <WmsGuideTab />
                </>
            )}
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
