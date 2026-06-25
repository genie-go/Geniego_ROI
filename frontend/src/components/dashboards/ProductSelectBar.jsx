import { useMemo } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useProductSelection } from '../../contexts/ProductSelectionContext.jsx';
import { useI18n } from '../../i18n/index.js';

/**
 * [현 차수] 공용 인라인 상품 선택 바 — 마케팅성과·채널 KPI 등 ProductMarketingPanel 을 소비하는 탭에서
 *   그 탭을 떠나지 않고 전체↔특정상품 전환(전역 동기화)을 할 수 있게 한다. 선택 소스=주문 SSOT 단일화로
 *   DashOverview 의 인라인 선택 로직을 탭마다 재구현하지 않는다(중복 금지). 선택 시 ProductSelectionContext
 *   를 통해 BroadcastChannel 로 전 메뉴가 실시간 동기화된다.
 *   ★신규 i18n 키 없이 기존 dashboard.* 인라인 폴백 키(DashOverview 와 동일) 재사용.
 */
export default function ProductSelectBar() {
  const { orders } = useGlobalData();
  const { selectedProduct, setSelectedProduct } = useProductSelection();
  const { t } = useI18n();
  const productList = useMemo(() => {
    const m = new Map();
    (orders || []).forEach(o => {
      const s = o.sku || o.product_id;
      if (s && !m.has(String(s))) m.set(String(s), String(o.product_name || o.name || o.product || s));
    });
    return [...m.entries()].map(([sku, name]) => ({ sku, name }));
  }, [orders]);

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: selectedProduct ? '4px solid #4f8ef7' : '4px solid var(--border)',
      borderRadius: 14, padding: '12px 16px',
    }}>
      <span style={{ fontWeight: 800, fontSize: 13 }}>🛍️ {t('dashboard.productView', '상품 조회')}</span>
      <select
        value={selectedProduct?.sku || ''}
        onChange={e => { const s = e.target.value; setSelectedProduct(s ? (productList.find(p => p.sku === s) || { sku: s, name: s }) : null); }}
        style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 13, minWidth: 200 }}
      >
        <option value="">{t('dashboard.allProducts', '전체 상품')}</option>
        {productList.map(p => <option key={p.sku} value={p.sku}>{p.name}</option>)}
      </select>
      {!selectedProduct && (
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {t('dashboard.productViewHint', '특정 상품을 선택하면 그 상품의 매출·주문·재구매율 등을 조회할 수 있습니다 (전체는 아래 대시보드).')}
        </span>
      )}
    </div>
  );
}
