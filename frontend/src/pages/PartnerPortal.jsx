import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from '../i18n/index.js';

/**
 * PartnerPortal.jsx — 212차 #3-B 파트너(매입처/물류처/창고처) 전용 포털.
 *
 * 본사 로그인(genie_token)과 완전 분리된 독립 페이지(/partner). 파트너는 발급받은
 * 로그인 ID/비밀번호로 접속해 "공유된 본인 데이터만" 스코프 한정으로 열람·등록·수정한다.
 *   - 인증: POST /api/partner/login → partner_token (localStorage 'partner_token')
 *   - 데이터: GET /api/partner/data (유형별 본인 것만)
 *   - 작업: POST /api/partner/action (유형별 최소권한)
 */

const PK = 'partner_token';
const api = async (path, opts = {}) => {
  const tok = localStorage.getItem(PK) || '';
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(opts.headers || {}) },
  });
  let data = {}; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' };
const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const btn = { padding: '11px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' };
const th = { textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 800, color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', fontSize: 12.5, color: '#1e293b', borderBottom: '1px solid #f1f5f9' };

export default function PartnerPortal() {
  const { t } = useI18n();
  const [me, setMe] = useState(null);
  const [authed, setAuthed] = useState(!!localStorage.getItem(PK));
  const [form, setForm] = useState({ login_id: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState(null);

  const loadMe = useCallback(async () => {
    const { status, data } = await api('/partner/me');
    if (status === 200 && data.ok) { setMe(data.partner); setAuthed(true); }
    else { localStorage.removeItem(PK); setAuthed(false); setMe(null); }
  }, []);

  const loadData = useCallback(async () => {
    const { data } = await api('/partner/data');
    if (data.ok) setPayload(data);
  }, []);

  useEffect(() => { if (authed) { loadMe(); loadData(); } }, [authed, loadMe, loadData]);

  const login = async () => {
    setErr(''); setBusy(true);
    const { status, data } = await api('/partner/login', { method: 'POST', body: JSON.stringify(form) });
    setBusy(false);
    if (status === 200 && data.ok && data.token) { localStorage.setItem(PK, data.token); setMe(data.partner); setAuthed(true); }
    else setErr(data.error || t('partnerPortal.loginFailed', '로그인에 실패했습니다.'));
  };

  const logout = async () => { await api('/partner/logout', { method: 'POST' }); localStorage.removeItem(PK); setAuthed(false); setMe(null); setPayload(null); };

  const doAction = async (op, extra) => {
    const { data } = await api('/partner/action', { method: 'POST', body: JSON.stringify({ op, ...extra }) });
    if (data.ok) { loadData(); return true; }
    alert(data.error || t('partnerPortal.actionFailed', '처리에 실패했습니다.')); return false;
  };

  // ── 로그인 화면 ──
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', padding: 20 }}>
        <div style={{ ...card, width: 'min(400px,94vw)' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>🤝 {t('partnerPortal.title', '파트너 포털')}</div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 20 }}>{t('partnerPortal.loginSubtitle', '매입처 · 물류처 · 창고처 전용 로그인. 발급받은 ID로 접속하세요.')}</div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('partnerPortal.loginId', '로그인 ID')}</label>
          <input style={{ ...inp, margin: '6px 0 14px' }} value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} placeholder={t('partnerPortal.partnerIdPlaceholder', '파트너 ID')} autoComplete="username" />
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('partnerPortal.password', '비밀번호')}</label>
          <input type="password" style={{ ...inp, margin: '6px 0 14px' }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && login()} autoComplete="current-password" />
          {err && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>⚠ {err}</div>}
          <button style={{ ...btn, width: '100%', opacity: busy ? 0.6 : 1 }} onClick={login} disabled={busy}>{busy ? t('partnerPortal.loggingIn', '로그인 중...') : t('partnerPortal.login', '로그인')}</button>
        </div>
      </div>
    );
  }

  // ── 인증 후: 유형별 스코프 대시보드 ──
  const TYPE_LABEL = { supplier: t('partnerPortal.typeSupplier', '매입처'), logistics: t('partnerPortal.typeLogistics', '물류처'), warehouse: t('partnerPortal.typeWarehouse', '창고처') };
  const typeLabel = TYPE_LABEL[me?.type] || me?.type || '';
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '0' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>🤝 {t('partnerPortal.title', '파트너 포털')}</span>
          <span style={{ marginLeft: 12, fontSize: 12.5, color: '#64748b' }}>{typeLabel} · {me?.partner_name || me?.name}</span>
        </div>
        <button onClick={logout} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{t('partnerPortal.logout', '로그아웃')}</button>
      </div>
      <div style={{ padding: 24, display: 'grid', gap: 18, maxWidth: 1100, margin: '0 auto' }}>
        {me?.type === 'supplier' && <SupplierView rows={payload?.rows || []} onAction={doAction} />}
        {me?.type === 'logistics' && <LogisticsView rows={payload?.rows || []} onAction={doAction} />}
        {me?.type === 'warehouse' && <WarehouseView stock={payload?.stock || []} movements={payload?.movements || []} onAction={doAction} />}
      </div>
    </div>
  );
}

function SupplierView({ rows, onAction }) {
  const { t } = useI18n();
  const [f, setF] = useState({ sku: '', name: '', qty: '', eta: '' });
  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📥 {t('partnerPortal.orderRegister', '발주 등록 (입고 예정)')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr)) auto', gap: 8, alignItems: 'end' }}>
          <input style={inp} placeholder="SKU" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} />
          <input style={inp} placeholder={t('partnerPortal.productNamePlaceholder', '상품명')} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <input style={inp} type="number" placeholder={t('partnerPortal.qtyPlaceholder', '수량')} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} />
          <input style={inp} type="date" value={f.eta} onChange={e => setF({ ...f, eta: e.target.value })} />
          <button style={btn} onClick={async () => { if (await onAction('add_order', { ...f, qty: Number(f.qty) || 0 })) setF({ sku: '', name: '', qty: '', eta: '' }); }}>{t('partnerPortal.register', '등록')}</button>
        </div>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📋 {t('partnerPortal.orderHistory', '발주 내역')} ({rows.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>SKU</th><th style={th}>{t('partnerPortal.colProductName', '상품명')}</th><th style={th}>{t('partnerPortal.colQty', '수량')}</th><th style={th}>{t('partnerPortal.colEta', '입고예정')}</th><th style={th}>{t('partnerPortal.colStatus', '상태')}</th><th style={th}>{t('partnerPortal.colAction', '작업')}</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={6}>{t('partnerPortal.noOrders', '발주 내역이 없습니다.')}</td></tr>}
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.sku}</td><td style={td}>{r.name}</td><td style={td}>{r.qty}</td><td style={td}>{r.eta || '—'}</td>
                  <td style={td}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: r.status === 'shipped' ? '#dcfce7' : '#fef3c7', color: r.status === 'shipped' ? '#16a34a' : '#b45309' }}>{r.status}</span></td>
                  <td style={td}>
                    {r.status !== 'shipped' && <button onClick={() => onAction('update_status', { id: r.id, status: 'shipped' })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#4f8ef7', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('partnerPortal.confirmShipment', '출고확인')}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function LogisticsView({ rows, onAction }) {
  const { t } = useI18n();
  return (
    <div style={card}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🚚 {t('partnerPortal.assignedShipments', '배정 출고/피킹')} ({rows.length})</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>{t('partnerPortal.colOrderNo', '주문번호')}</th><th style={th}>SKU</th><th style={th}>{t('partnerPortal.colProductName', '상품명')}</th><th style={th}>{t('partnerPortal.colQty', '수량')}</th><th style={th}>{t('partnerPortal.colStatus', '상태')}</th><th style={th}>{t('partnerPortal.colAction', '작업')}</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={6}>{t('partnerPortal.noAssignedShipments', '배정된 출고가 없습니다.')}</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td style={td}>{r.order_ref}</td><td style={td}>{r.sku}</td><td style={td}>{r.name}</td><td style={td}>{r.qty}</td>
                <td style={td}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: r.status === 'shipped' ? '#dcfce7' : '#fef3c7', color: r.status === 'shipped' ? '#16a34a' : '#b45309' }}>{r.status}</span></td>
                <td style={td}>{r.status !== 'shipped' && <button onClick={() => onAction('update_status', { id: r.id, status: 'shipped' })} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#4f8ef7', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('partnerPortal.completeShipment', '출고완료')}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarehouseView({ stock, movements, onAction }) {
  const { t } = useI18n();
  const [f, setF] = useState({ type: 'Inbound', sku: '', name: '', qty: '' });
  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📦 {t('partnerPortal.movementRegister', '입출고 등록')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(auto-fit,minmax(120px,1fr)) auto', gap: 8, alignItems: 'end' }}>
          <select style={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="Inbound">{t('partnerPortal.inbound', '입고')}</option><option value="Outbound">{t('partnerPortal.outbound', '출고')}</option><option value="ReturnsInbound">{t('partnerPortal.returnsInbound', '반품입고')}</option></select>
          <input style={inp} placeholder="SKU" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} />
          <input style={inp} placeholder={t('partnerPortal.productNamePlaceholder', '상품명')} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <input style={inp} type="number" placeholder={t('partnerPortal.qtyPlaceholder', '수량')} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} />
          <button style={btn} onClick={async () => { if (await onAction('add_movement', { ...f, qty: Number(f.qty) || 0 })) setF({ type: 'Inbound', sku: '', name: '', qty: '' }); }}>{t('partnerPortal.register', '등록')}</button>
        </div>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📊 {t('partnerPortal.stockStatus', '재고 현황')} ({stock.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>SKU</th><th style={th}>{t('partnerPortal.colProductName', '상품명')}</th><th style={th}>{t('partnerPortal.colStock', '재고')}</th><th style={th}>{t('partnerPortal.colUpdated', '갱신')}</th></tr></thead>
            <tbody>
              {stock.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={4}>{t('partnerPortal.noStock', '재고 데이터가 없습니다.')}</td></tr>}
              {stock.map((s, i) => (<tr key={i}><td style={td}>{s.sku}</td><td style={td}>{s.name}</td><td style={td}>{s.on_hand}</td><td style={td}>{(s.updated_at || '').slice(0, 16)}</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🔄 {t('partnerPortal.recentMovements', '최근 입출고')} ({movements.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>{t('partnerPortal.colType', '구분')}</th><th style={th}>SKU</th><th style={th}>{t('partnerPortal.colProductName', '상품명')}</th><th style={th}>{t('partnerPortal.colQty', '수량')}</th><th style={th}>{t('partnerPortal.colDatetime', '일시')}</th></tr></thead>
            <tbody>
              {movements.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={5}>{t('partnerPortal.noMovements', '이력이 없습니다.')}</td></tr>}
              {movements.map(m => (<tr key={m.id}><td style={td}>{({ Inbound: t('partnerPortal.inbound', '입고'), Outbound: t('partnerPortal.outbound', '출고'), ReturnsInbound: t('partnerPortal.returnsInbound', '반품입고') }[m.type]) || m.type}</td><td style={td}>{m.sku}</td><td style={td}>{m.name}</td><td style={td}>{m.qty}</td><td style={td}>{(m.created_at || '').slice(0, 16)}</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
