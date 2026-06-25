import { useState, useEffect, useMemo } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useProductSelection } from '../../contexts/ProductSelectionContext.jsx';
import { useI18n } from '../../i18n/index.js';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';
import { loadProductPerf, PP_COUNTRY_LABEL } from './productPerf.js';
import ProductFunnel from './ProductFunnel.jsx';

/**
 * [현 차수] 특정 상품 마케팅 성과 패널 — 사용자 요구 "특정 상품에 광고를 집행하므로 마케팅 성과에도
 *   전체↔특정상품 지표가 나와야 한다". 전역 상품 선택 시, 광고/채널 대시보드 상단에 그 상품의 실제
 *   마케팅 성과를 표시한다. ★데이터 SSOT = productPerf(운영=백엔드 attribution_touch 기반 ad/ad_attr,
 *   데모=주문 파생 판매성과). 광고-상품 귀속 데이터가 없으면 '임의배분' 대신 정직하게 비우고 무엇을
 *   연동해야 자동 수집되는지 안내(가짜 광고비 배분 금지=값정확성). 선택 없으면 렌더 안 함(=전체는 기존 화면).
 */
export default function ProductMarketingPanel({ period = 'monthly', n = 0 }) {
  const { isDemo, orders, inventory } = useGlobalData();
  const { selectedProduct, clearProduct } = useProductSelection();
  const { t } = useI18n();
  const { fmt: fmtC } = useCurrency();
  const sku = selectedProduct?.sku;
  const costMap = useMemo(() => {
    const m = {}; (inventory || []).forEach(it => { const s = it.sku || it.product_id; if (s && it.cost != null) m[String(s)] = Number(it.cost) || 0; }); return m;
  }, [inventory]);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sku) { setData(null); return; }
    let alive = true;
    loadProductPerf({ isDemo, orders, costMap, period, n })
      .then(r => { if (alive) setData(r); })
      .catch(() => { if (alive) setData({ products: [] }); });
    return () => { alive = false; };
  }, [sku, isDemo, orders, costMap, period, n]);

  const sel = useMemo(() => (data?.products || []).find(p => p.sku === sku) || null, [data, sku]);
  // [현 차수 hooks 수정] chMax/ctMax useMemo 를 조건부 early-return 위로 이동 — 기존엔 return 아래 있어
  //   상품 선택 토글 시 hook 개수가 7↔9 로 바뀌어 React #300(Rendered fewer/more hooks) 크래시. 규칙 준수.
  const chMax = useMemo(() => Math.max(...Object.values(sel?.byChannel || {}).map(v => v.revenue || 0), 1), [sel]);
  const ctMax = useMemo(() => Math.max(...Object.values(sel?.byCountry || {}).map(v => v.revenue || 0), 1), [sel]);
  if (!sku) return null;

  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(15,23,42,0.04)' };
  const head = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 };
  const kpi = (label, value, color) => (
    <div key={label} style={{ minWidth: 96 }}>
      <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color }}>{value}</div>
    </div>
  );

  // 광고 성과 출처: 직접연동(ad) 우선, 없으면 어트리뷰션 배분(ad_attr)
  const ad = sel?.ad && (sel.ad.spend > 0 || sel.ad.impressions > 0)
    ? { roas: sel.ad.roas, spend: sel.ad.spend, rev: sel.ad.ad_revenue, impr: sel.ad.impressions, clicks: sel.ad.clicks, ctr: sel.ad.ctr, src: t('dashboard.productMkt.srcDirect', '광고-상품 직접연동') }
    : (sel?.ad_attr && sel.ad_attr.spend > 0
      ? { roas: sel.ad_attr.roas, spend: sel.ad_attr.spend, rev: sel.ad_attr.attr_revenue, src: t('dashboard.productMkt.srcAttr', '어트리뷰션 배분') }
      : null);

  const Bar = ({ map, max }) => {
    const entries = Object.entries(map || {}).sort((a, b) => (b[1].revenue || 0) - (a[1].revenue || 0)).slice(0, 6);
    if (!entries.length) return null;
    return (
      <div style={{ display: 'grid', gap: 5, marginTop: 4 }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ fontWeight: 700 }}>{PP_COUNTRY_LABEL[k] || k}</span><span>{fmtC(v.revenue || 0)}</span>
            </div>
            <div style={{ height: 7, background: '#eef2f7', borderRadius: 4 }}>
              <div style={{ width: `${Math.round((v.revenue || 0) / (max || 1) * 100)}%`, height: '100%', background: '#4f8ef7', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div style={card}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#1e293b' }}>📣 {t('dashboard.productMkt.title', '상품 마케팅 성과')}: {selectedProduct.name}</span>
        {sel?.rank ? <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>#{sel.rank}</span> : null}
        <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px' }}>
          {isDemo ? t('dashboard.productMkt.demoSrc', '데모 · 주문 파생') : t('dashboard.productMkt.liveSrc', '실집계 · attribution')}
        </span>
        <button onClick={clearProduct} style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
          {t('dashboard.productMkt.viewAll', '전체 보기')}
        </button>
      </div>

      {!sel ? (
        <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>{t('dashboard.productMkt.noSales', '선택 기간에 이 상품의 판매 데이터가 없습니다.')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 12 }}>
            {kpi(t('dashboard.productMkt.revenue', '매출'), fmtC(sel.revenue || 0), '#4f8ef7')}
            {kpi(t('dashboard.productMkt.orders', '주문'), (sel.orders || 0).toLocaleString(), '#f59e0b')}
            {kpi(t('dashboard.productMkt.qty', '판매량'), (sel.qty || 0).toLocaleString(), '#06b6d4')}
            {kpi(t('dashboard.productMkt.aov', '객단가'), fmtC(sel.aov || 0), '#8b5cf6')}
            {kpi(t('dashboard.productMkt.returnRate', '반품률'), (sel.return_rate ?? 0) + '%', (sel.return_rate ?? 0) > 12 ? '#ef4444' : '#22c55e')}
            {/* [Phase1 순이익] 매출−원가−광고비−마켓수수료. 원가 미등록 시 산출 불가(—). */}
            {sel.net_profit != null && kpi(t('dashboard.productMkt.netProfit', '순이익'), fmtC(sel.net_profit), sel.net_profit >= 0 ? '#16a34a' : '#ef4444')}
            {sel.net_margin != null && kpi(t('dashboard.productMkt.netMargin', '순이익률'), sel.net_margin + '%', sel.net_margin >= 0 ? '#16a34a' : '#ef4444')}
          </div>
          {/* [Phase1 순이익] 수수료 출처 정직 표기 — 등록 즉시 실값(settlement)으로 자동 상향. */}
          {sel.net_profit != null && sel.fees_source !== 'settlement' && (
            <div style={{ fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
              ⓘ {sel.fees_source === 'estimated'
                ? t('dashboard.productMkt.feesEstimated', '순이익의 마켓 수수료는 요율 추정치입니다. 정산 연동 시 실수수료로 자동 반영됩니다.')
                : t('dashboard.productMkt.feesNone', '순이익은 원가·광고비 기준입니다(마켓 수수료 미반영). 정산·수수료율 연동 시 자동 반영됩니다.')}
            </div>
          )}
          {sel.net_profit == null && (
            <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
              ⓘ {t('dashboard.productMkt.noCost', '순이익 산출에는 상품 원가 등록이 필요합니다(가격최적화 › 상품 원가).')}
            </div>
          )}

          {/* 광고 성과 — attribution 기반(있을 때만). 없으면 정직 안내 */}
          {ad ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                📈 {t('dashboard.productMkt.adPerf', '광고 성과')} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>({ad.src})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <span style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>ROAS</span> <strong>{ad.roas != null ? ad.roas + 'x' : '—'}</strong></span>
                <span style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>{t('dashboard.productMkt.adSpend', '광고비')}</span> <strong>{fmtC(ad.spend || 0)}</strong></span>
                <span style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>{t('dashboard.productMkt.adRev', '광고매출')}</span> <strong>{fmtC(ad.rev || 0)}</strong></span>
                {ad.impr != null && <span style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>{t('dashboard.productMkt.impr', '노출')}</span> <strong>{(ad.impr || 0).toLocaleString()}</strong></span>}
                {ad.clicks != null && <span style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>{t('dashboard.productMkt.clicks', '클릭')}</span> <strong>{(ad.clicks || 0).toLocaleString()}</strong></span>}
                {ad.ctr != null && <span style={{ fontSize: 12 }}><span style={{ color: '#64748b' }}>CTR</span> <strong>{ad.ctr}%</strong></span>}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#854d0e' }}>
              💡 {t('dashboard.productMkt.adEmpty', '이 상품의 광고 성과 데이터가 아직 없습니다. 광고-상품 매핑(캠페인에 상품 태깅) 또는 어트리뷰션을 연동하면 상품별 ROAS·광고비가 실집계로 자동 표시됩니다. (임의 배분 대신 실데이터 기준)')}
            </div>
          )}

          {/* 어디서 팔리는지 — 마케팅 인사이트(채널·국가) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>🛒 {t('dashboard.productMkt.byChannel', '채널별 판매')}</div>
              <Bar map={sel.byChannel} max={chMax} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>🌍 {t('dashboard.productMkt.byCountry', '국가별 판매')}</div>
              <Bar map={sel.byCountry} max={ctMax} />
            </div>
          </div>
          {/* [Phase3] 상품 고객 퍼널 — 노출→클릭→광고전환→실주문→순주문(기존 데이터 파생). */}
          <div style={{ marginTop: 14, borderTop: '1px solid #eef2f7', paddingTop: 12 }}>
            <ProductFunnel sel={sel} />
          </div>
        </>
      )}
    </div>
  );
}
