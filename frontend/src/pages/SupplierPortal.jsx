// SupplierPortal.jsx — Supplier Portal (P1 신규)
// 공급사 Purchase Order·납기·Cost Price협의 B2B 포털 + WMS Stock Integration
import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { useGlobalData } from '../context/GlobalDataContext.jsx';

const fmtM = (v) => `₩${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';

/* ──── 초기 Supplier 데이터 ──── */
const INIT_SUPPLIERS = [
  { id: 'SUP-001', name: '(주)테크서플라이', contact: '김대리 02-1234-5678', email: 'supply@techsup.co.kr', category: '전자제품', grade: 'A', paymentTerms: '월 2회 정산', leadTimeDays: 7, rating: 4.8, active: true },
  { id: 'SUP-002', name: 'SmartTech Co.', contact: 'John Park +82-10-9876-5432', email: 'john@smarttech.com', category: '스마트기기', grade: 'A', paymentTerms: '30일 후 정산', leadTimeDays: 14, rating: 4.5, active: true },
  { id: 'SUP-003', name: '오션패브릭(주)', contact: '이부장 031-876-5432', email: 'ocean@fabric.kr', category: '생활용품', grade: 'B', paymentTerms: '월 1회 정산', leadTimeDays: 5, rating: 4.2, active: true },
  { id: 'SUP-004', name: '코리아캠핑', contact: '박과장 051-234-5678', email: 'info@krcamping.kr', category: '아웃도어', grade: 'B', paymentTerms: '선불', leadTimeDays: 10, rating: 3.9, active: false },
];

const INIT_QUOTATIONS = [
  { id: 'QT-001', supplierId: 'SUP-001', sku: 'EP-PRX-001', name: '시카페어(Cicapair) 크림 50ml', qty: 500, unitCost: 43000, totalCost: 21500000, status: 'approved', requestDate: '2026-03-10', deliveryDate: '2026-03-17', notes: 'Urgent 납기 요청' },
  { id: 'QT-002', supplierId: 'SUP-002', sku: 'SW-SE-002', name: '세라마이딘(Ceramidin) 리퀴드 토너', qty: 200, unitCost: 93000, totalCost: 18600000, status: 'negotiating', requestDate: '2026-03-12', deliveryDate: '2026-03-25', notes: '단가 협의 in progress' },
  { id: 'QT-003', supplierId: 'SUP-003', sku: 'TP-MF-004', name: 'Note리폼 여행용 목베개', qty: 300, unitCost: 11500, totalCost: 3450000, status: 'pending', requestDate: '2026-03-14', deliveryDate: '2026-03-19', notes: '' },
  { id: 'QT-004', supplierId: 'SUP-001', sku: 'UH-7C-003', name: 'USB-C 허브 7in1', qty: 1000, unitCost: 24000, totalCost: 24000000, status: 'delivered', requestDate: '2026-03-01', deliveryDate: '2026-03-08', notes: 'Done' },
];

const STATUS_BADGE = {
  pending:     { label: '검토in progress',   color: '#f59e0b', bg: '#fef3c7' },
  negotiating: { label: '협의in progress',   color: '#3b82f6', bg: '#dbeafe' },
  approved:    { label: 'Approval',     color: '#10b981', bg: '#d1fae5' },
  delivered:   { label: '납품Done', color: '#6b7280', bg: '#f3f4f6' },
  cancelled:   { label: 'Cancel',     color: '#ef4444', bg: '#fee2e2' },
};

const GRADE_COLOR = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };

const TABS = ['📋 Supplier List', '📝 견적·Purchase Order', '📊 Performance Analysis', '⚙️ Settings'];

export default function SupplierPortal() {
  const { inventory, addAlert, supplyOrders, registerInOut } = useGlobalData();
  const [tab, setTab] = useState(0);
  const [suppliers, setSuppliers] = useState(INIT_SUPPLIERS);
  const [quotations, setQuotations] = useState(INIT_QUOTATIONS);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [selectedSup, setSelectedSup] = useState(null);
  const [search, setSearch] = useState('');
  const [newSup, setNewSup] = useState({ name: '', contact: '', email: '', category: '', grade: 'B', paymentTerms: '월 1회 정산', leadTimeDays: 7 });
  const [newQt, setNewQt] = useState({ supplierId: '', sku: '', name: '', qty: '', unitCost: '', deliveryDate: '', notes: '' });

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s => !search || s.name.includes(search) || s.category.includes(search)),
  [suppliers, search]);

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.active).length,
    gradeA: suppliers.filter(s => s.grade === 'A').length,
    totalOrders: quotations.length,
    pendingOrders: quotations.filter(q => q.status === 'pending' || q.status === 'negotiating').length,
    totalPO: quotations.reduce((s, q) => s + q.totalCost, 0),
  }), [suppliers, quotations]);

  const handleApproveQuote = (id) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: 'approved' } : q));
    const qt = quotations.find(q => q.id === id);
    if (qt) addAlert({ type: 'success', msg: `✅ 견적 Approval: [${qt.name}] ${qt.qty}개 — ${fmtM(qt.totalCost)}` });
  };

  const handleDelivered = (id) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: 'delivered' } : q));
    const qt = quotations.find(q => q.id === id);
    if (qt) {
      registerInOut({ type: '입고', sku: qt.sku, qty: qt.qty, whId: 'W001', name: qt.name, by: `Supplier 납품 (${qt.id})` });
      addAlert({ type: 'success', msg: `📦 납품 Done → WMS Stock Auto반영: [${qt.name}] +${qt.qty}개` });
    }
  };

  const handleAddSupplier = () => {
    if (!newSup.name) return;
    const sup = { ...newSup, id: `SUP-${Date.now().toString(36).toUpperCase()}`, rating: 4.0, active: true };
    setSuppliers(prev => [sup, ...prev]);
    setNewSup({ name: '', contact: '', email: '', category: '', grade: 'B', paymentTerms: '월 1회 정산', leadTimeDays: 7 });
    setShowAddSupplier(false);
    addAlert({ type: 'success', msg: `🏭 Supplier Register: ${sup.name}` });
  };

  const handleAddQuote = () => {
    if (!newQt.supplierId || !newQt.sku) return;
    const qty = Number(newQt.qty);
    const unit = Number(newQt.unitCost);
    const qt = {
      ...newQt, id: `QT-${Date.now().toString(36).toUpperCase()}`,
      qty, unitCost: unit, totalCost: qty * unit,
      status: 'pending', requestDate: new Date().toISOString().slice(0, 10),
    };
    setQuotations(prev => [qt, ...prev]);
    setNewQt({ supplierId: '', sku: '', name: '', qty: '', unitCost: '', deliveryDate: '', notes: '' });
    setShowAddQuote(false);
    addAlert({ type: 'info', msg: `📝 견적 요청: [${qt.name}] ${qty}개 — ${fmtM(qt.totalCost)}` });
  };

  const card = (label, value, sub, color = 'var(--accent)') => (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const inp = (label, key, obj, setter, type = 'text', opts) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{label}</label>
      {opts ? (
        <select value={obj[key]} onChange={e => setter(p => ({ ...p, [key]: e.target.value }))}
          style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-1)', fontSize: 13 }}>
          {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input type={type} value={obj[key]} onChange={e => setter(p => ({ ...p, [key]: e.target.value }))}
          style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-1)', fontSize: 13 }} />
      )}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🏭 Supplier Portal</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 13 }}>공급사 Purchase Order·납기·Cost Price협의 B2B 포털 · WMS Stock Auto Sync</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddSupplier(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            + Supplier Register
          </button>
          <button onClick={() => setShowAddQuote(true)}
            style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            📝 견적 요청
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {card('All Supplier', stats.total + '개', `Active ${stats.active}개`)}
        {card('Grade A 공급사', stats.gradeA + '개', '우Count 파트너', '#10b981')}
        {card('In Progress Purchase Order', stats.pendingOrders + '건', '검토in progress·협의in progress')}
        {card('Total Purchase Order Amount', fmtM(stats.totalPO), `All ${stats.totalOrders}건`, '#f59e0b')}
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', padding: 6, borderRadius: 12, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === i ? 700 : 400,
              background: tab === i ? 'var(--accent)' : 'transparent', color: tab === i ? '#fff' : 'var(--text-2)', fontSize: 13 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 내용 */}
      {tab === 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input placeholder="🔍 Supplier명, Category Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-1)', fontSize: 13 }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['Supplier', 'Category', 'Owner', 'Grade', 'Payment조건', '리드타임', '평점', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedSup(s)}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{s.category}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)', fontSize: 12 }}>{s.contact}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: GRADE_COLOR[s.grade] + '22', color: GRADE_COLOR[s.grade], padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{s.grade}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)', fontSize: 12 }}>{s.paymentTerms}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{s.leadTimeDays}일</td>
                    <td style={{ padding: '10px 14px' }}>{'⭐'.repeat(Math.round(s.rating))} {s.rating}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: s.active ? '#d1fae5' : '#f3f4f6', color: s.active ? '#10b981' : '#6b7280' }}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); setNewQt(p => ({ ...p, supplierId: s.id })); setShowAddQuote(true); }}
                        style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        견적
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>견적·Purchase Order List</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['견적번호', 'Supplier', 'Product', 'Quantity', '단가', 'TotalAmount', '요청일', '납기', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotations.map(q => {
                  const sup = suppliers.find(s => s.id === q.supplierId);
                  const st = STATUS_BADGE[q.status] || STATUS_BADGE.pending;
                  return (
                    <tr key={q.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{q.id}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{sup?.name || q.supplierId}</td>
                      <td style={{ padding: '10px 14px' }}>{q.name}<br /><span style={{ fontSize: 11, color: 'var(--text-3)' }}>{q.sku}</span></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{q.qty.toLocaleString()}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtM(q.unitCost)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>{fmtM(q.totalCost)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)' }}>{q.requestDate}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)' }}>{q.deliveryDate}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', display: 'flex', gap: 4 }}>
                        {q.status === 'negotiating' && (
                          <button onClick={() => handleApproveQuote(q.id)}
                            style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            Approval
                          </button>
                        )}
                        {q.status === 'approved' && (
                          <button onClick={() => handleDelivered(q.id)}
                            style={{ padding: '4px 8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            납품Done → WMS
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Supplierper 납품 현황</div>
            {suppliers.filter(s => s.active).map(s => {
              const myQuotes = quotations.filter(q => q.supplierId === s.id);
              const tot = myQuotes.reduce((a, q) => a + q.totalCost, 0);
              const delivered = myQuotes.filter(q => q.status === 'delivered').length;
              return (
                <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{fmtM(tot)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                    Total {myQuotes.length}건 · 납품Done {delivered}건 · Grade {s.grade}
                  </div>
                  <div style={{ marginTop: 6, background: 'var(--bg)', borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${myQuotes.length ? (delivered / myQuotes.length) * 100 : 0}%`, background: '#10b981', height: '100%', borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Categoryper Purchase Order 현황</div>
            {['전자제품', '스마트기기', '생활용품', '아웃도어'].map(cat => {
              const catSups = suppliers.filter(s => s.category === cat).map(s => s.id);
              const catQuotes = quotations.filter(q => catSups.includes(q.supplierId));
              const tot = catQuotes.reduce((a, q) => a + q.totalCost, 0);
              if (!tot) return null;
              return (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600 }}>{cat}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmtM(tot)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{catQuotes.length}건</div>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 20, fontWeight: 700, marginBottom: 12 }}>WMS Integration Stock 현황</div>
            {inventory.slice(0, 4).map(item => {
              const totalStock = Object.values(item.stock).reduce((s, v) => s + v, 0);
              const pct = Math.min(100, (totalStock / (item.safeQty * 5)) * 100);
              return (
                <div key={item.sku} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: totalStock <= item.safeQty ? '#ef4444' : '#10b981', fontWeight: 700 }}>{totalStock}개</span>
                  </div>
                  <div style={{ marginTop: 4, background: 'var(--bg)', borderRadius: 4, height: 5 }}>
                    <div style={{ width: `${pct}%`, background: totalStock <= item.safeQty ? '#ef4444' : '#10b981', height: '100%', borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 3 && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>⚙️ 포털 Settings</div>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { label: 'Auto Purchase Order 임계Value', value: '안전Stock × 0.5 이하 시 Auto 견적 요청', icon: '🤖' },
              { label: '납기 Notification', value: 'D-3일 Auto Notification Send', icon: '📅' },
              { label: 'WMS Auto Sync', value: '납품Done Clicks 시 WMS 入庫 Auto 처리', icon: '🔄', active: true },
              { label: '정산 주기', value: '월 2회 (15일, 말일)', icon: '💳' },
              { label: '공급사 평가 주기', value: 'Quarterper Auto 평가 (납기준Count율·불량률·Price경쟁력)', icon: '⭐' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.value}</div>
                </div>
                {s.active !== undefined && (
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: s.active ? '#d1fae5' : '#f3f4f6', color: s.active ? '#10b981' : '#6b7280' }}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Register Modal */}
      {showAddSupplier && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 480, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🏭 Supplier Register</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {inp('업체명 *', 'name', newSup, setNewSup)}
              {inp('Owner (Name + 연락처)', 'contact', newSup, setNewSup)}
              {inp('Email', 'email', newSup, setNewSup, 'email')}
              {inp('Category', 'category', newSup, setNewSup)}
              {inp('Grade', 'grade', newSup, setNewSup, 'text', [
                { value: 'A', label: 'A — 우Count' }, { value: 'B', label: 'B — General' }, { value: 'C', label: 'C — Management' }
              ])}
              {inp('Payment조건', 'paymentTerms', newSup, setNewSup)}
              {inp('리드타임 (일)', 'leadTimeDays', newSup, setNewSup, 'number')}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddSupplier(false)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddSupplier} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Register</button>
            </div>
          </div>
        </div>
      )}

      {/* 견적 요청 Modal */}
      {showAddQuote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 480, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📝 견적 요청</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {inp('Supplier *', 'supplierId', newQt, setNewQt, 'text',
                suppliers.filter(s => s.active).map(s => ({ value: s.id, label: s.name })))}
              {inp('SKU', 'sku', newQt, setNewQt)}
              {inp('Product Name', 'name', newQt, setNewQt)}
              {inp('Quantity', 'qty', newQt, setNewQt, 'number')}
              {inp('단가 (원)', 'unitCost', newQt, setNewQt, 'number')}
              {inp('납기 희망일', 'deliveryDate', newQt, setNewQt, 'date')}
              {inp('요청사항', 'notes', newQt, setNewQt)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddQuote(false)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddQuote} style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>요청</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
