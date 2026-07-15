import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getJsonAuth, requestJsonAuth } from '../services/apiClient.js';
import { useI18n } from '../i18n';
import CctvPlayer from './CctvPlayer.jsx';

/**
 * CCTV 자격등록 + 원격 실시간 조회.
 *
 * 두 곳에서 재사용한다 — 창고 카드의 "CCTV 보기" 모달(whId 고정)과 WMS 의 CCTV 탭(전 창고).
 * 사용자가 지정한 임의 장소(place)에도 카메라를 달 수 있으므로 창고 소속은 선택값이다.
 *
 * 등록 형식은 현장 배포문서 그대로 — 프로그램 / 도메인 / 포트 / 아이디 / 비번.
 * 프로그램(vendor)이 목록에 없으면 '직접 입력'으로 RTSP·스냅샷 URL 템플릿을 넣는다
 * ({host} {port} {rtspPort} {user} {pass} {channel} 치환).
 *
 * ★비밀번호는 저장 후 서버가 절대 돌려주지 않는다(has_password 만 온다). 폼을 비워두면 기존 값 유지.
 */

const PROTOCOLS = [
    { v: 'rtsp',     labelKey: 'wms.cctv.protoRtsp',     fallback: 'RTSP (DVR/NVR · 서버가 HLS로 변환)' },
    { v: 'snapshot', labelKey: 'wms.cctv.protoSnapshot', fallback: '스냅샷 폴링 (ffmpeg 불필요)' },
    { v: 'hls',      labelKey: 'wms.cctv.protoHls',      fallback: 'HLS (.m3u8 URL 직접)' },
    { v: 'webrtc',   labelKey: 'wms.cctv.protoWebrtc',   fallback: 'WebRTC / WHEP URL' },
    { v: 'iframe',   labelKey: 'wms.cctv.protoIframe',   fallback: '벤더 임베드 페이지' },
];
const URL_MODE = ['hls', 'webrtc', 'iframe'];

const emptyForm = {
    id: 0, wh_id: '', name: '', place: '', vendor: 'jwc_hdvr', protocol: 'rtsp',
    host: '', port: '', rtsp_port: '', channel: '1', direct_url: '',
    rtsp_template: '', snapshot_template: '', username: '', password: '', active: true,
    source: 'direct', bridge_id: 0,
};

const lbl = { fontSize: 10, color: '#6b7280', fontWeight: 700, display: 'block', marginBottom: 3 };
const inp = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 12, background: '#fff', color: '#111827' };

function Field({ label, children }) {
    return <div><label style={lbl}>{label}</label>{children}</div>;
}
function Btn({ onClick, color = '#4f8ef7', children, disabled, small }) {
    return (
        <button onClick={onClick} disabled={disabled} style={{
            padding: small ? '5px 10px' : '7px 14px', borderRadius: 7, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled ? '#9ca3af' : color, color: '#fff', fontSize: small ? 11 : 12, fontWeight: 700,
        }}>{children}</button>
    );
}

export default function CctvManager({ whId = '', warehouses = [], compact = false }) {
    const { t } = useI18n();
    const [cams, setCams] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [ffmpeg, setFfmpeg] = useState(true);
    const [form, setForm] = useState({ ...emptyForm, wh_id: whId });
    const [showForm, setShowForm] = useState(false);
    const [viewing, setViewing] = useState(null); // camera object (단일 보기)
    const [wall, setWall] = useState(false);       // 전체 보기(비디오월)
    const [busy, setBusy] = useState('');
    const [notice, setNotice] = useState('');
    // 브리지(온프렘 에이전트)
    const [bridges, setBridges] = useState([]);
    const [showBridges, setShowBridges] = useState(false);
    const [newBridgeName, setNewBridgeName] = useState('');
    const [pairInfo, setPairInfo] = useState(null); // { name, pair_code } 방금 발급
    const [infoId, setInfoId] = useState(0);        // [287차] 정보 보기 패널이 열린 카메라 id(0=닫힘)

    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const reload = useCallback(async () => {
        try {
            const q = whId ? `?wh_id=${encodeURIComponent(whId)}` : '';
            const r = await getJsonAuth(`/api/wms/cameras${q}`);
            setCams(Array.isArray(r?.cameras) ? r.cameras : []);
            if (typeof r?.ffmpeg === 'boolean') setFfmpeg(r.ffmpeg);
        } catch (e) { setNotice(String(e?.message || e)); }
    }, [whId]);

    const reloadBridges = useCallback(async () => {
        try { const r = await getJsonAuth('/api/wms/cctv/bridges'); setBridges(Array.isArray(r?.bridges) ? r.bridges : []); }
        catch { /* keep */ }
    }, []);

    useEffect(() => { reload(); reloadBridges(); }, [reload, reloadBridges]);
    // 브리지 온라인 상태·발견장비 주기 갱신(10초).
    useEffect(() => { const iv = setInterval(reloadBridges, 10000); return () => clearInterval(iv); }, [reloadBridges]);
    useEffect(() => {
        getJsonAuth('/api/wms/cctv/vendors')
            .then(r => { setVendors(Array.isArray(r?.vendors) ? r.vendors : []); if (typeof r?.ffmpeg === 'boolean') setFfmpeg(r.ffmpeg); })
            .catch(() => {});
    }, []);

    const addBridge = async () => {
        const name = newBridgeName.trim();
        if (!name) return;
        setBusy('bridge'); setNotice('');
        try {
            const r = await requestJsonAuth('/api/wms/cctv/bridges', 'POST', { name });
            setPairInfo({ name, pair_code: r?.pair_code || '' });
            setNewBridgeName('');
            await reloadBridges();
        } catch (e) { setNotice(String(e?.message || e)); }
        setBusy('');
    };
    const removeBridge = async (b) => {
        if (!window.confirm(t('wms.cctv.bridgeDeleteConfirm', '이 브리지를 삭제할까요? 연결된 카메라는 재배정이 필요합니다.'))) return;
        try { await requestJsonAuth(`/api/wms/cctv/bridges/${b.id}`, 'DELETE'); await reloadBridges(); await reload(); }
        catch (e) { setNotice(String(e?.message || e)); }
    };
    const rotateBridge = async (b) => {
        try { const r = await requestJsonAuth(`/api/wms/cctv/bridges/${b.id}/rotate`, 'POST', {}); setPairInfo({ name: b.name, pair_code: r?.pair_code || '' }); await reloadBridges(); }
        catch (e) { setNotice(String(e?.message || e)); }
    };

    const vendorMap = useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v])), [vendors]);

    // 프로그램 변경 → 그 프로그램의 기본 포트/템플릿을 폼에 채운다(사용자가 덮어쓸 수 있음).
    const onVendor = (id) => {
        const v = vendorMap[id];
        setForm(p => ({
            ...p, vendor: id,
            port: v?.port ? String(v.port) : p.port,
            rtsp_port: v?.rtsp_port ? String(v.rtsp_port) : p.rtsp_port,
            protocol: id === 'url' ? 'hls' : p.protocol,
            rtsp_template: id === 'custom' ? p.rtsp_template : '',
            snapshot_template: id === 'custom' ? p.snapshot_template : '',
        }));
    };

    const reset = () => { setForm({ ...emptyForm, wh_id: whId }); setShowForm(false); };

    const save = async () => {
        setBusy('save'); setNotice('');
        const body = {
            ...form,
            port: Number(form.port) || 0,
            rtsp_port: Number(form.rtsp_port) || 554,
            active: !!form.active,
        };
        try {
            if (form.id) await requestJsonAuth(`/api/wms/cameras/${form.id}`, 'PUT', body);
            else await requestJsonAuth('/api/wms/cameras', 'POST', body);
            await reload();
            reset();
        } catch (e) { setNotice(String(e?.message || e)); }
        setBusy('');
    };

    const edit = (c) => {
        // 비밀번호는 서버가 반환하지 않는다 — 빈 칸으로 두면 기존 값이 유지된다.
        setForm({
            ...emptyForm, ...c,
            port: String(c.port || ''), rtsp_port: String(c.rtsp_port || ''),
            username: '', password: '',
        });
        setShowForm(true);
    };

    const remove = async (c) => {
        if (!window.confirm(t('wms.cctv.deleteConfirm', '이 카메라 등록을 삭제할까요?'))) return;
        try { await requestJsonAuth(`/api/wms/cameras/${c.id}`, 'DELETE'); await reload(); }
        catch (e) { setNotice(String(e?.message || e)); }
    };

    const test = async (c) => {
        setBusy('test' + c.id); setNotice('');
        try {
            const r = await requestJsonAuth(`/api/wms/cameras/${c.id}/test`, 'POST', {});
            setNotice((r?.ok ? '✅ ' : '⚠️ ') + (r?.message || ''));
            await reload();
        } catch (e) { setNotice('⚠️ ' + String(e?.message || e)); }
        setBusy('');
    };

    const urlMode = URL_MODE.includes(form.protocol);
    const isBridge = form.source === 'bridge';
    const onlineBridges = bridges.filter(b => b.paired);
    const whName = (id) => warehouses.find(w => String(w.id) === String(id))?.name || id;

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                    📹 {t('wms.cctv.title', 'CCTV 실시간 조회')}
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginLeft: 8 }}>
                        {t('wms.cctv.subtitle', '자격등록을 마치면 언제든 원격으로 볼 수 있습니다')}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {cams.filter(c => c.active).length > 0 && (
                        <Btn onClick={() => setWall(w => !w)} color={wall ? '#0891b2' : '#0ea5e9'}>
                            {wall ? `▣ ${t('wms.cctv.wallClose', '전체 보기 닫기')}` : `▣ ${t('wms.cctv.wallBtn', '전체 보기')} (${cams.filter(c => c.active).length})`}
                        </Btn>
                    )}
                    <Btn onClick={() => setShowBridges(s => !s)} color="#8b5cf6">
                        🖥️ {t('wms.cctv.bridgeBtn', '브리지 관리')}{bridges.length ? ` (${bridges.filter(b => b.online).length}/${bridges.length})` : ''}
                    </Btn>
                    <Btn onClick={() => { setForm({ ...emptyForm, wh_id: whId }); setShowForm(s => !s); }} color="#4f8ef7">
                        + {t('wms.cctv.addBtn', '카메라 자격등록')}
                    </Btn>
                </div>
            </div>

            {pairInfo && (
                <div className="card card-glass" style={{ padding: 16, border: '1px solid rgba(139,92,246,0.4)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>🔑 {t('wms.cctv.pairTitle', '브리지 페어코드(API 키)')}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                        {t('wms.cctv.pairHint', '현장 PC에서 아래 코드로 에이전트를 1회 페어링하세요. 이 코드는 지금만 표시됩니다.')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <code style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, background: '#111827', color: '#a5f3fc', padding: '8px 14px', borderRadius: 8 }}>{pairInfo.pair_code}</code>
                        <Btn onClick={() => { navigator.clipboard?.writeText(pairInfo.pair_code); setNotice(t('wms.cctv.copied', '복사됨')); }} color="#6366f1" small>{t('wms.cctv.copyBtn', '복사')}</Btn>
                        <Btn onClick={() => setPairInfo(null)} color="#6b7280" small>{t('wms.cctv.closeBtn', '닫기')}</Btn>
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 10, fontFamily: 'monospace', background: 'rgba(0,0,0,0.04)', padding: 8, borderRadius: 6, wordBreak: 'break-all' }}>
                        CLOUD={typeof window !== 'undefined' ? window.location.origin : 'https://www.genieroi.com'} PAIR_CODE={pairInfo.pair_code} node bridge.js
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>
                        {t('wms.cctv.agentPath', '에이전트: 저장소 tools/cctv-bridge/ (Node.js 18+ 및 ffmpeg 필요)')}
                    </div>
                </div>
            )}

            {showBridges && (
                <div className="card card-glass" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>🖥️ {t('wms.cctv.bridgeTitle', '온프렘 브리지')}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                        {t('wms.cctv.bridgeIntro', 'P2P·ActiveX·독자VMS 등 인터넷으로 표준 스트림을 열지 않는 장비는, 현장 PC에 브리지 에이전트를 설치하면 LAN에서 물어 자동 재생됩니다.')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        <input style={{ ...inp, maxWidth: 260 }} value={newBridgeName} onChange={e => setNewBridgeName(e.target.value)} placeholder={t('wms.cctv.bridgeNamePh', '예: 서울본사 물류센터 PC')} />
                        <Btn onClick={addBridge} color="#8b5cf6" disabled={busy === 'bridge'}>+ {t('wms.cctv.bridgeAdd', '브리지 추가')}</Btn>
                    </div>
                    {bridges.length === 0 ? (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{t('wms.cctv.bridgeEmpty', '등록된 브리지가 없습니다.')}</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {bridges.map(b => (
                                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.03)', flexWrap: 'wrap' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{b.name}</span>
                                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 20,
                                                       background: b.online ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.2)', color: b.online ? '#16a34a' : '#64748b' }}>
                                            {b.online ? t('wms.cctv.online', '온라인') : (b.paired ? t('wms.cctv.offline', '오프라인') : t('wms.cctv.unpaired', '미연결'))}
                                        </span>
                                        {Array.isArray(b.discovered) && b.discovered.length > 0 && (
                                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
                                                🔍 {t('wms.cctv.discovered', '발견')}: {b.discovered.map(d => `${d.address}${d.model ? `(${d.model})` : ''}`).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {!b.paired && <Btn onClick={() => rotateBridge(b)} color="#6366f1" small>{t('wms.cctv.showCode', '페어코드')}</Btn>}
                                        {b.paired && <Btn onClick={() => rotateBridge(b)} color="#64748b" small>{t('wms.cctv.reissue', '코드 재발급')}</Btn>}
                                        <Btn onClick={() => removeBridge(b)} color="#ef4444" small>🗑</Btn>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!ffmpeg && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)', fontSize: 11, color: '#854d0e' }}>
                    {t('wms.cctv.noFfmpeg', '서버에 ffmpeg가 없어 직접 RTSP 변환을 쓸 수 없습니다. 스냅샷 폴링·HLS/WebRTC URL, 또는 브리지 경유(현장 ffmpeg)를 사용하세요.')}
                </div>
            )}
            {notice && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', fontSize: 11, wordBreak: 'break-word' }}>{notice}</div>
            )}

            {showForm && (
                <div className="card card-glass" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
                        {form.id ? t('wms.cctv.editTitle', '카메라 수정') : t('wms.cctv.newTitle', '새 카메라 자격등록')}
                    </div>

                    {/* 접속 경로: 직접(공인망) vs 브리지 경유(현장 LAN 에이전트) */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => setF('source', 'direct')} style={{
                            padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (!isBridge ? '#4f8ef7' : '#d1d5db'), cursor: 'pointer',
                            background: !isBridge ? 'rgba(79,142,247,0.12)' : '#fff', fontSize: 11, fontWeight: 700, color: !isBridge ? '#2563eb' : '#6b7280' }}>
                            🌐 {t('wms.cctv.srcDirect', '직접 접속 (공인 도메인·URL)')}
                        </button>
                        <button onClick={() => setF('source', 'bridge')} style={{
                            padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (isBridge ? '#8b5cf6' : '#d1d5db'), cursor: 'pointer',
                            background: isBridge ? 'rgba(139,92,246,0.12)' : '#fff', fontSize: 11, fontWeight: 700, color: isBridge ? '#7c3aed' : '#6b7280' }}>
                            🖥️ {t('wms.cctv.srcBridge', '브리지 경유 (현장 LAN)')}
                        </button>
                    </div>

                    {isBridge && (
                        <div style={{ marginBottom: 12 }}>
                            <Field label={t('wms.cctv.fBridge', '브리지 선택')}>
                                <select style={inp} value={form.bridge_id} onChange={e => setF('bridge_id', Number(e.target.value))}>
                                    <option value={0}>{t('wms.cctv.selBridge', '— 브리지를 선택하세요 —')}</option>
                                    {onlineBridges.map(b => <option key={b.id} value={b.id}>{b.name} {b.online ? '🟢' : '⚪'}</option>)}
                                </select>
                            </Field>
                            {onlineBridges.length === 0 && (
                                <div style={{ fontSize: 11, color: '#b45309', marginTop: 6 }}>
                                    {t('wms.cctv.noBridge', '연결된 브리지가 없습니다. 먼저 "브리지 관리"에서 브리지를 만들고 현장 PC에 에이전트를 페어링하세요.')}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                        <Field label={t('wms.cctv.fName', '카메라 이름')}>
                            <input style={inp} value={form.name} onChange={e => setF('name', e.target.value)} placeholder={t('wms.cctv.phName', '예: 1층 출고장')} />
                        </Field>
                        <Field label={t('wms.cctv.fWarehouse', '창고 (선택)')}>
                            <select style={inp} value={form.wh_id} onChange={e => setF('wh_id', e.target.value)} disabled={!!whId}>
                                <option value="">{t('wms.cctv.noWarehouse', '창고 미지정(임의 장소)')}</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </Field>
                        <Field label={t('wms.cctv.fPlace', '설치 장소')}>
                            <input style={inp} value={form.place} onChange={e => setF('place', e.target.value)} placeholder={t('wms.cctv.phPlace', '예: A동 3번 랙 통로')} />
                        </Field>

                        <Field label={t('wms.cctv.fVendor', '프로그램')}>
                            <select style={inp} value={form.vendor} onChange={e => onVendor(e.target.value)}>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                            </select>
                        </Field>
                        <Field label={t('wms.cctv.fProtocol', '연결 방식')}>
                            <select style={inp} value={form.protocol} onChange={e => setF('protocol', e.target.value)}>
                                {PROTOCOLS.map(p => (
                                    <option key={p.v} value={p.v} disabled={p.v === 'rtsp' && !ffmpeg}>{t(p.labelKey, p.fallback)}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    {urlMode ? (
                        <div style={{ marginTop: 10 }}>
                            <Field label={t('wms.cctv.fDirectUrl', '스트림 URL (공개 https)')}>
                                <input style={inp} value={form.direct_url} onChange={e => setF('direct_url', e.target.value)} placeholder="https://cam.example.com/live/index.m3u8" />
                            </Field>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 10 }}>
                                <Field label={isBridge ? t('wms.cctv.fHostLan', 'LAN 주소 / IP') : t('wms.cctv.fHost', '도메인 / IP')}>
                                    <input style={inp} value={form.host} onChange={e => setF('host', e.target.value)} placeholder={isBridge ? '192.168.0.64' : '16831e.eznetdns.com'} />
                                </Field>
                                <Field label={t('wms.cctv.fPort', '포트')}>
                                    <input style={inp} value={form.port} onChange={e => setF('port', e.target.value)} placeholder="8601" inputMode="numeric" />
                                </Field>
                                <Field label={t('wms.cctv.fRtspPort', 'RTSP 포트')}>
                                    <input style={inp} value={form.rtsp_port} onChange={e => setF('rtsp_port', e.target.value)} placeholder="554" inputMode="numeric" />
                                </Field>
                                <Field label={t('wms.cctv.fChannel', '채널')}>
                                    <input style={inp} value={form.channel} onChange={e => setF('channel', e.target.value)} placeholder="1" />
                                </Field>
                            </div>

                            {form.vendor === 'custom' && (
                                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                                    <div style={{ fontSize: 10, color: '#6b7280' }}>
                                        {t('wms.cctv.tplHint', '치환 변수: {host} {port} {rtspPort} {user} {pass} {channel}')}
                                    </div>
                                    <Field label={t('wms.cctv.fRtspTpl', 'RTSP 주소 템플릿')}>
                                        <input style={inp} value={form.rtsp_template} onChange={e => setF('rtsp_template', e.target.value)}
                                               placeholder="rtsp://{user}:{pass}@{host}:{rtspPort}/live/ch{channel}" />
                                    </Field>
                                    <Field label={t('wms.cctv.fSnapTpl', '스냅샷 주소 템플릿')}>
                                        <input style={inp} value={form.snapshot_template} onChange={e => setF('snapshot_template', e.target.value)}
                                               placeholder="http://{host}:{port}/cgi-bin/snapshot.cgi?channel={channel}" />
                                    </Field>
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 10 }}>
                        <Field label={t('wms.cctv.fUser', '아이디')}>
                            <input style={inp} value={form.username} onChange={e => setF('username', e.target.value)} autoComplete="off"
                                   placeholder={form.id ? t('wms.cctv.phKeep', '변경하려면 입력') : 'admin'} />
                        </Field>
                        <Field label={t('wms.cctv.fPass', '비밀번호')}>
                            <input style={inp} type="password" value={form.password} onChange={e => setF('password', e.target.value)} autoComplete="new-password"
                                   placeholder={form.id && form.has_password ? t('wms.cctv.phKeep', '변경하려면 입력') : '••••'} />
                        </Field>
                        <Field label={t('wms.cctv.fActive', '상태')}>
                            <select style={inp} value={form.active ? '1' : '0'} onChange={e => setF('active', e.target.value === '1')}>
                                <option value="1">{t('wms.cctv.active', '사용')}</option>
                                <option value="0">{t('wms.cctv.inactive', '중지')}</option>
                            </select>
                        </Field>
                    </div>

                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 10 }}>
                        🔒 {t('wms.cctv.secNote', '아이디·비밀번호는 AES-256-GCM으로 암호화 저장되며, 영상은 서버가 중계하므로 자격증명이 브라우저로 전달되지 않습니다.')}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <Btn onClick={save} color="#22c55e" disabled={busy === 'save'}>{t('wms.cctv.saveBtn', '저장')}</Btn>
                        <Btn onClick={reset} color="#6b7280">{t('wms.cctv.cancelBtn', '취소')}</Btn>
                    </div>
                </div>
            )}

            {/* 전체 보기(비디오월) — 한 창고의 모든 활성 카메라를 동시 재생 */}
            {wall && (
                <div className="card card-glass" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>▣ {t('wms.cctv.wallTitle', '전체 카메라')} ({cams.filter(c => c.active).length})</div>
                        <Btn onClick={() => setWall(false)} color="#6b7280" small>{t('wms.cctv.closeBtn', '닫기')}</Btn>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fill,minmax(260px,1fr))' : 'repeat(auto-fill,minmax(320px,1fr))', gap: 10 }}>
                        {cams.filter(c => c.active).map(c => (
                            <CctvPlayer key={c.id} camera={c} height={compact ? 190 : 220} />
                        ))}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>
                        {t('wms.cctv.wallHint', '각 카메라를 동시에 실시간 재생합니다. 대수가 많으면 대역폭·CPU 부하가 커질 수 있습니다.')}
                    </div>
                </div>
            )}

            {viewing && !wall && (
                <div className="card card-glass" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{viewing.name}</div>
                        <Btn onClick={() => setViewing(null)} color="#6b7280" small>{t('wms.cctv.closeBtn', '닫기')}</Btn>
                    </div>
                    <CctvPlayer camera={viewing} height={compact ? 300 : 420} />
                </div>
            )}

            {cams.length === 0 ? (
                <div className="card card-glass" style={{ padding: 28, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
                    {t('wms.cctv.empty', '등록된 카메라가 없습니다. 자격등록을 하면 실시간 조회가 가능합니다.')}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                    {cams.map(c => (
                        <div key={c.id} className="card card-glass" style={{ padding: 12, opacity: c.active ? 1 : 0.55 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: 12 }}>{c.name}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, wordBreak: 'break-all' }}>
                                        {c.place && <>📍 {c.place} · </>}
                                        {c.wh_id ? whName(c.wh_id) : t('wms.cctv.noWarehouse', '창고 미지정(임의 장소)')}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {c.source === 'bridge' ? `🖥️ ${bridges.find(b => b.id === c.bridge_id)?.name || t('wms.cctv.bridgeBtn', '브리지')} · ` : ''}
                                        {c.vendor_label} · {c.protocol.toUpperCase()} {c.host ? `· ${c.host}:${c.port}` : ''}
                                    </div>
                                </div>
                                {c.test_status && (
                                    <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
                                                   background: c.test_status === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                   color: c.test_status === 'ok' ? '#16a34a' : '#dc2626' }}>
                                        {c.test_status === 'ok' ? t('wms.cctv.statOk', '연결됨') : t('wms.cctv.statFail', '연결실패')}
                                    </span>
                                )}
                            </div>
                            {c.test_message && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, wordBreak: 'break-word' }}>{c.test_message}</div>}
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                <Btn onClick={() => setViewing(c)} color="#0ea5e9" small disabled={!c.active}>▶ {t('wms.cctv.viewBtn', '실시간 보기')}</Btn>
                                <Btn onClick={() => setInfoId(v => v === c.id ? 0 : c.id)} color="#0d9488" small>ℹ {t('wms.cctv.infoBtn', '정보 보기')}</Btn>
                                <Btn onClick={() => test(c)} color="#6366f1" small disabled={busy === 'test' + c.id}>
                                    {busy === 'test' + c.id ? t('wms.cctv.testing', '테스트 중…') : t('wms.cctv.testBtn', '연결 테스트')}
                                </Btn>
                                <Btn onClick={() => edit(c)} color="#64748b" small>{t('wms.cctv.editBtn', '수정')}</Btn>
                                <Btn onClick={() => remove(c)} color="#ef4444" small>🗑</Btn>
                            </div>
                            {infoId === c.id && (() => {
                                // [287차] CCTV 정보 보기 — device 메타(info_json) + 연결정보 전체를 표로 표시.
                                const nf = c.info || {};
                                const rows = [
                                    [t('wms.cctv.iModel', '모델'), nf.model || c.model],
                                    [t('wms.cctv.iMaker', '제조사'), nf.manufacturer],
                                    [t('wms.cctv.iProgram', '프로그램'), nf.program],
                                    [t('wms.cctv.iProto', '프로토콜'), (c.protocol || '').toUpperCase() + (c.source === 'bridge' ? ' · ' + t('wms.cctv.viaBridge', '브리지 경유(LAN)') : '')],
                                    [t('wms.cctv.iLan', 'LAN 주소'), c.host ? `${c.host}:${c.rtsp_port || nf.rtsp_port || ''}` : (nf.int_ip || '')],
                                    ['RTSP', c.rtsp_template || nf.rtsp],
                                    [t('wms.cctv.iIntIp', '내부 IP'), nf.int_ip],
                                    [t('wms.cctv.iExtIp', '외부 IP'), nf.ext_ip],
                                    [t('wms.cctv.iPorts', '포트(영상/웹)'), (nf.video_port || nf.web_port) ? `${nf.video_port || '-'} / ${nf.web_port || '-'}${nf.alt_port ? ' (' + nf.alt_port + ')' : ''}` : ''],
                                    [t('wms.cctv.iAdminWeb', '관리자 웹'), nf.admin_web],
                                    [t('wms.cctv.iNvrId', '녹화기 ID'), nf.nvr_login],
                                    [t('wms.cctv.iBridge', '브리지'), c.source === 'bridge' ? (bridges.find(b => b.id === c.bridge_id)?.name || '-') : t('wms.cctv.srcDirect', '직접')],
                                    [t('wms.cctv.iWh', '창고'), c.wh_id ? whName(c.wh_id) : '-'],
                                ].filter(r => r[1]);
                                return (
                                    <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', marginBottom: 6 }}>ℹ {t('wms.cctv.infoTitle', 'CCTV 장비 정보')}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 11 }}>
                                            {rows.map(([k, v]) => (
                                                <React.Fragment key={k}>
                                                    <div style={{ color: '#6b7280', fontWeight: 700, whiteSpace: 'nowrap' }}>{k}</div>
                                                    <div style={{ color: '#111827', wordBreak: 'break-all', fontFamily: /IP|RTSP|주소|포트|웹/.test(k) ? 'monospace' : 'inherit' }}>{String(v)}</div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        {nf.note && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>※ {nf.note}</div>}
                                    </div>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
