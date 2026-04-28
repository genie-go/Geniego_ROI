import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '../context/GlobalDataContext.jsx';

import ko from '../i18n/locales/ko.js';
import { useT } from '../i18n/index.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


// ─── Channelper Color·Icon ──────────────────────────────────────
const CH_MAP = {
  coupang: { label: 'Coupang', icon: '🛒', color: '#ef4444' },
  naver:   { label: 'Naver', icon: '🟩', color: '#03c75a' },
  amazon:  { label: '아마존', icon: '🏪', color: '#f59e0b' },
  gmarket: { label: 'Gmarket', icon: '🏬', color: '#8b5cf6' },
  shopify: { label: 'Shopify', icon: '🛍', color: '#6366f1' },
  welfare: { label: '복지몰', icon: '❤️', color: '#ec4899' },
  '11st':  { label: '11Street', icon: '🔴', color: '#dc2626' },
};

const STATUS_COLOR = {
  '발주Confirm': '#f59e0b', '출고Pending': '#4f8ef7', '배송in progress': '#22c55e',
  '배송Done': '#94a3b8', 'Cancel요청': '#ef4444', 'CancelDone': '#374151',
  '반품요청': '#f97316',
};

const WH_LABELS = { W001: '서울 물류센터', W002: '부산 물류센터', W003: '인천 물류센터' };

const TABS = [
  { id: 'all',       label: 'All', icon: '🔍' },
  { id: 'product',   label: 'Product·Stock', icon: '📦' },
  { id: 'order',     label: 'Orders', icon: '📋' },
  { id: 'channel',   label: 'Channel', icon: '🌐' },
  { id: 'settlement', label: '정산', icon: '💰' },
];

// ─── Unified 카탈로그 데이터 ( catalog - CatalogSync Page와 Sync될 Product List)
const _CATALOG = [
  { sku: 'EP-PRX-001', name: '시카페어(Cicapair) 크림 50ml', category: '전자기기', brand: '테크코리아', channels: ['coupang','naver','amazon','gmarket'], status: 'active' },
  { sku: 'SW-SE-002', name: '세라마이딘(Ceramidin) 리퀴드 토너', category: '전자기기', brand: '테크코리아', channels: ['coupang','naver','amazon'], status: 'active' },
  { sku: 'UH-7C-003', name: 'USB-C 허브 7in1', category: '액세서리', brand: '디지털마트', channels: ['amazon','shopify'], status: 'active' },
  { sku: 'TP-MF-004', name: 'Note리폼 여행용 목베개', category: '생활용품', brand: '컴포트', channels: ['coupang','naver','gmarket'], status: 'active' },
  { sku: 'CL-LED-005', name: 'V7 토닝 라이트 크림', category: '아웃도어', brand: '아웃도어플러스', channels: ['coupang','gmarket','shopify','welfare'], status: 'active' },
];

// ─── 공통 Card Style ─────────────────────────────────────────
const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '14px 16px',
};
const badge = (color = '#4f8ef7') => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
  background: `${color}22`, color, border: `1px solid ${color}44`,
});

export default function CommerceUnifiedSearch() {
  const t = useT();
  const navigate = useNavigate();
  const { inventory, orders, settlement, lowStockCount, orderStats } = useGlobalData();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // ─── Unified Search 결과 ────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Product·Stock
    const products = (tab === 'all' || tab === 'product') ? inventory.map(item => {
      const totalStock = Object.values(item.stock).reduce((a, b) => a + b, 0);
      const isLow = totalStock <= item.safeQty;
      const catalog = _CATALOG.find(c => c.sku === item.sku);
      if (q && !item.sku.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q) &&
          !(catalog?.category?.toLowerCase().includes(q)) && !(catalog?.brand?.toLowerCase().includes(q))) return null;
      return {
        type: 'product', id: item.sku, sku: item.sku, name: item.name,
        totalStock, isLow, safeQty: item.safeQty,
        cost: item.cost, price: item.price,
        stock: item.stock,
        channels: catalog?.channels || [],
        category: catalog?.category || '',
        brand: catalog?.brand || '',
        margin: ((item.price - item.cost) / item.price * 100).toFixed(1),
      };
    }).filter(Boolean) : [];

    // Orders
    const orderList = (tab === 'all' || tab === 'order') ? orders.map(o => {
      if (filterChannel !== 'all' && o.ch !== filterChannel) return null;
      if (filterStatus !== 'all' && o.status !== filterStatus) return null;
      if (q && !o.id.toLowerCase().includes(q) && !o.name.toLowerCase().includes(q) &&
          !o.buyer.toLowerCase().includes(q) && !o.sku.toLowerCase().includes(q)) return null;
      return { type: 'order', id: o.id, ...o };
    }).filter(Boolean) : [];

    // Channelper Aggregate (tab === 'channel')
    let channelList = [];
    if (tab === 'all' || tab === 'channel') {
      const chMap = {};
      orders.forEach(o => {
        if (!chMap[o.ch]) chMap[o.ch] = { channel: o.ch, orderCount: 0, revenue: 0, items: [] };
        chMap[o.ch].orderCount++;
        chMap[o.ch].revenue += o.total;
        chMap[o.ch].items.push(o.id);
      });
      channelList = Object.values(chMap).filter(c =>
        !q || c.channel.toLowerCase().includes(q) || (CH_MAP[c.channel]?.label || '').includes(q)
      ).map(c => ({ type: 'channel', id: c.channel, ...c }));
    }

    // 정산
    const settlementList = (tab === 'all' || tab === 'settlement') ? settlement.map(s => {
      if (filterChannel !== 'all' && s.channel !== filterChannel) return null;
      if (q && !s.channel.toLowerCase().includes(q) && !(CH_MAP[s.channel]?.label || '').includes(q)) return null;
      return { type: 'settlement', id: `${s.channel}-${s.period}`, ...s };
    }).filter(Boolean) : [];

    const all = [...products, ...orderList, ...channelList, ...settlementList];

    // Sort
    if (sortBy === 'name') all.sort((a, b) => (a.name || a.channel || '').localeCompare(b.name || b.channel || ''));
    if (sortBy === 'amount') all.sort((a, b) => (b.total || b.revenue || b.price || 0) - (a.total || a.revenue || a.price || 0));

    return all;
  }, [query, tab, sortBy, filterChannel, filterStatus, inventory, orders, settlement]);

  // ─── Summary KPI ─────────────────────────────────────────────
  const kpi = useMemo(() => {
    const products = results.filter(r => r.type === 'product');
    const ords = results.filter(r => r.type === 'order');
    return {
      products: products.length,
      lowStock: products.filter(p => p.isLow).length,
      orders: ords.length,
      orderRevenue: ords.reduce((s, o) => s + (o.total || 0), 0),
    };
  }, [results]);

  const handleGo = useCallback((type, id) => {
    const routes = { product: '/catalog-sync', order: '/order-hub', channel: '/omni-channel', settlement: '/reconciliation' };
    navigate(routes[type] || '/commerce');
  }, [navigate]);

  // ─── Search어 하이라이트 ───────────────────────────────────
  const hl = (text = '') => {
    if (!query.trim()) return text;
    const re = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} style={{ background: 'rgba(79,142,247,0.35)', color: 'var(--text-1)', borderRadius: 3, padding: '0 1px' }}>{p}</mark> : p
    );
  };

  return (
    <div style={{ minHeight: '100%', color: '#e8eaf6', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 26 }}>🔍</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>커머스·물류 Unified Search</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Product·Stock·Orders·Channel·정산을 한 번에 Search</p>
        </div>

        {/* KPI Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'All Product', value: inventory.length, icon: '📦', color: '#4f8ef7' },
            { label: 'Stock 부족', value: lowStockCount, icon: '⚠️', color: '#f59e0b' },
            { label: 'All Orders', value: orderStats.count, icon: '📋', color: '#22c55e' },
            { label: 'Total Orders액', value: `₩${(orderStats.revenue / 10000).toFixed(0)}만`, icon: '💰', color: '#a78bfa' },
          ].map((k, i) => (
            <div key={i} style={{ ...card, borderColor: `${k.color}33`, textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{k.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{k.label}</div>
          ))}

        {/* Search창 */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#4f8ef7' }}>🔍</span>
          <input
            type="text"
            placeholder="SKU, Product Name, Orders번호, 구매자명, Channel명으로 Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 44px',
              background: 'rgba(79,142,247,0.08)', border: '1.5px solid rgba(79,142,247,0.3)',
              borderRadius: 12, color: '#e8eaf6', fontSize: 14, outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={e => e.target.style.borderColor = '#4f8ef7'}
            onBlur={e => e.target.style.borderColor = 'rgba(79,142,247,0.3)'}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}

        {/* Tab + Filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: tab === t.id ? 'linear-gradient(135deg,rgba(79,142,247,0.3),rgba(99,102,241,0.25))' : 'transparent',
                color: tab === t.id ? '#93c5fd' : '#7c8fa8',
                borderBottom: tab === t.id ? '2px solid #4f8ef7' : '2px solid transparent',
              }}>{t.icon} {t.label}</button>
            ))}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} style={{ padding: '5px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: '#e8eaf6', fontSize: 11 }}>
              <option value="all">All Channel</option>
              {Object.entries(CH_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '5px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: '#e8eaf6', fontSize: 11 }}>
              <option value="all">All Status</option>
              {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '5px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: '#e8eaf6', fontSize: 11 }}>
              <option value="relevance">Related도순</option>
              <option value="name">Name순</option>
              <option value="amount">Amount순</option>
            </select>
        </div>

      {/* ── Search 결과 ── */}
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
        Total <strong style={{ color: '#4f8ef7' }}>{results.length}</strong>개 결과
        {query && <span> · Search어: <strong style={{ color: 'var(--text-1)' }}>"{query}"</strong></span>}

      {results.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Search 결과가 없습니다</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>{query ? `"${query}"에 해당하는 항목이 없습니다.` : 'Search어를 입력하거나 Tab을 Select하세요.'}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {results.map((item, idx) => (
            <ResultCard key={`${item.type}-${item.id}-${idx}`} item={item} hl={hl} onGo={handleGo} />
          ))}
      )}
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

// ─── 결과 Card Component ──────────────────────────────────────
function ResultCard({ item, hl, onGo }) {
  const [expanded, setExpanded] = useState(false);

  if (item.type === 'product') {
    const stockEntries = Object.entries(item.stock);
    return (
      <div style={{ ...card, cursor: 'pointer', transition: 'border-color 200ms', borderColor: item.isLow ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📦</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>{hl(item.name)}</span>
              <span style={{ fontSize: 10, color: '#7c8fa8' }}>{item.sku}</span>
              {item.isLow && <span style={badge('#ef4444')}>⚠️ Stock부족</span>}
              {item.category && <span style={badge('#6366f1')}>{item.category}</span>}
            <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>TotalStock <strong style={{ color: item.isLow ? '#ef4444' : '#22c55e' }}>{item.totalStock}개</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>안전Stock {item.safeQty}개</span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Sale Price <strong style={{ color: '#4f8ef7' }}>₩{item.price?.toLocaleString()}</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>마진 <strong style={{ color: '#22c55e' }}>{item.margin}%</strong></span>
            {item.channels.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                {item.channels.map(ch => (
                  <span key={ch} style={{ ...badge(CH_MAP[ch]?.color || '#7c8fa8'), fontSize: 9 }}>{CH_MAP[ch]?.icon} {CH_MAP[ch]?.label || ch}</span>
                ))}
            )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={e => { e.stopPropagation(); onGo('product', item.id); }} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(79,142,247,0.4)', background: 'transparent', color: '#4f8ef7', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>카탈로그 →</button>
            <span style={{ fontSize: 11, color: '#7c8fa8', alignSelf: 'center' }}>{expanded ? '▲' : '▼'}</span>
        </div>
        {expanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c8fa8', marginBottom: 6 }}>📍 창고per Stock</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {stockEntries.map(([wh, qty]) => (
                <div key={wh} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#7c8fa8' }}>{WH_LABELS[wh] || wh}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: qty <= 0 ? '#ef4444' : qty < 30 ? '#f59e0b' : '#22c55e', marginTop: 2 }}>{qty}</div>
                  <div style={{ fontSize: 9, color: '#7c8fa8' }}>개</div>
              ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={e => { e.stopPropagation(); onGo('product', item.id); }} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>📂 카탈로그 Management</button>
              <button onClick={e => { e.stopPropagation(); window.location.href = '/wms-manager'; }} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>🏭 WMS 입출고</button>
              <button onClick={e => { e.stopPropagation(); window.location.href = '/price-opt'; }} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>💡 Price Optimization</button>
          </div>
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

  if (item.type === 'order') {
    const ch = CH_MAP[item.ch] || { label: item.ch, icon: '🛒', color: '#7c8fa8' };
    return (
      <div style={{ ...card, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{ch.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>{hl(item.name)}</span>
              <span style={{ ...badge(ch.color), fontSize: 9 }}>{ch.label}</span>
              <span style={{ ...badge(STATUS_COLOR[item.status] || '#7c8fa8'), fontSize: 9 }}>{item.status}</span>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Orders <strong style={{ color: 'var(--text-1)' }}>{hl(item.id)}</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>구매자 <strong style={{ color: 'var(--text-1)' }}>{hl(item.buyer)}</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Quantity {item.qty}개</span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Amount <strong style={{ color: '#4ade80' }}>₩{item.total?.toLocaleString()}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={e => { e.stopPropagation(); onGo('order', item.id); }} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(34,197,94,0.4)', background: 'transparent', color: '#22c55e', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>Orders 허브 →</button>
            <span style={{ fontSize: 11, color: '#7c8fa8' }}>{expanded ? '▲' : '▼'}</span>
        </div>
        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {[
              ['SKU', item.sku], ['창고', WH_LABELS[item.wh] || item.wh],
              ['단가', `₩${item.price?.toLocaleString()}`], ['PlatformCommission율', `${(item.platformFeeRate * 100 || 0).toFixed(1)}%`],
              ['Commission', `₩${item.fee?.toLocaleString()}`], ['Ad Spend', `₩${item.adFee?.toLocaleString()}`],
              ['Orders시각', item.at],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <span style={{ color: '#7c8fa8', minWidth: 72 }}>{k}</span>
                <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{v}</span>
            ))}
        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
  }

  if (item.type === 'channel') {
    const ch = CH_MAP[item.channel] || { label: item.channel, icon: '🌐', color: '#7c8fa8' };
    return (
      <div style={{ ...card, borderColor: `${ch.color}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{ch.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)', marginBottom: 4 }}>{ch.label}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Orders <strong style={{ color: '#4f8ef7' }}>{item.orderCount}건</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Revenue <strong style={{ color: '#4ade80' }}>₩{item.revenue?.toLocaleString()}</strong></span>
          </div>
          <button onClick={() => onGo('channel', item.channel)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${ch.color}66`, background: 'transparent', color: ch.color, fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>Channel Management →</button>
            </div>
        </div>
    </div>
);
  }

  if (item.type === 'settlement') {
    const ch = CH_MAP[item.channel] || { label: item.channel, icon: '💰', color: '#7c8fa8' };
    const isPending = item.status === 'pending';
    return (
      <div style={{ ...card, borderColor: isPending ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{ch.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>{ch.label}</span>
              <span style={{ fontSize: 10, color: '#7c8fa8' }}>{item.period}</span>
              <span style={badge(isPending ? '#f59e0b' : '#22c55e')}>{isPending ? '⏳ Pending' : '✅ Done'}</span>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>TotalRevenue <strong style={{ color: '#4f8ef7' }}>₩{(item.grossSales / 10000).toFixed(0)}만</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>순지급 <strong style={{ color: '#4ade80' }}>₩{(item.netPayout / 10000).toFixed(0)}만</strong></span>
              <span style={{ fontSize: 11, color: '#7c8fa8' }}>Orders {item.orders} items</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={e => { e.stopPropagation(); onGo('settlement', item.id); }} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.4)', background: 'transparent', color: '#f59e0b', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>정산 →</button>
            <span style={{ fontSize: 11, color: '#7c8fa8' }}>{expanded ? '▲' : '▼'}</span>
        </div>
        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              ['Platform Commission', `₩${item.platformFee?.toLocaleString()}`],
              ['Ad Spend', `₩${item.adFee?.toLocaleString()}`],
              ['Coupon 할인', `₩${item.couponDiscount?.toLocaleString()}`],
              ['반품 처리비', `₩${item.returnFee?.toLocaleString()}`],
              ['반품 건Count', `${item.returns}건`],
              ['반품율', `${item.orders > 0 ? (item.returns / item.orders * 100).toFixed(1) : 0}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#7c8fa8' }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{v}</div>
            ))}
        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
  }

  return null;
}
