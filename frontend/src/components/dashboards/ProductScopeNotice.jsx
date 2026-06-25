import { useProductSelection } from '../../contexts/ProductSelectionContext.jsx';
import { useI18n } from '../../i18n/index.js';

/**
 * [현 차수] 전역 상품 선택 정직 배너 — 광고/채널·크리에이터·정적 국가 단위 대시보드는 지표가
 *   상품(SKU) 귀속이 불가(광고비는 캠페인 단위·임의배분 금지)하다. 전역 상품이 선택된 상태에서
 *   이런 대시보드를 보면 "전체 기준"임을 명시하고, 상품별 국가·성별·연령·순위 분석은
 *   [통합현황 > 상품 성과] 탭으로 안내한다. 값 왜곡(가짜 상품귀속) 대신 정직 표기.
 *   선택 없으면(=전체) 아무것도 렌더하지 않음.
 */
export default function ProductScopeNotice({ scope }) {
  const { selectedProduct, clearProduct } = useProductSelection();
  const { t } = useI18n();
  if (!selectedProduct?.sku) return null;
  const reason = scope === 'channel'
    ? t('dashboard.productScope.channelReason', '광고·채널 단위 지표라 상품별 귀속이 불가합니다')
    : scope === 'creator'
    ? t('dashboard.productScope.creatorReason', '크리에이터 단위 지표라 상품별 귀속이 불가합니다')
    : scope === 'global'
    ? t('dashboard.productScope.globalReason', '국가 단위 집계라 상품별 분석은 상품 성과 탭에서 제공됩니다')
    : t('dashboard.productScope.adReason', '광고 단위 지표라 상품별 귀속이 불가합니다');
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      background: 'linear-gradient(90deg,#fef9c3,#fef3c7)', border: '1px solid #fde68a',
      borderRadius: 10, padding: '10px 14px', margin: '0 0 14px', fontSize: 13, color: '#854d0e',
    }}>
      <span style={{ fontWeight: 800 }}>🛍️ {t('dashboard.productScope.selected', '상품 선택됨')}: {selectedProduct.name}</span>
      <span style={{ color: '#92400e' }}>— {t('dashboard.productScope.allBasis', '이 화면은 전체 기준')} ({reason}).</span>
      <span style={{ color: '#92400e' }}>
        {t('dashboard.productScope.hint', '상품별 국가·성별·연령·판매 순위는')} <strong>{t('dashboard.productScope.tabPath', '통합현황 › 상품 성과')}</strong> {t('dashboard.productScope.tabSuffix', '탭을 이용하세요.')}
      </span>
      <button onClick={clearProduct} style={{
        marginLeft: 'auto', background: '#fff', border: '1px solid #fcd34d', borderRadius: 7,
        padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#854d0e', cursor: 'pointer',
      }}>{t('dashboard.productScope.clear', '전체 보기')}</button>
    </div>
  );
}
