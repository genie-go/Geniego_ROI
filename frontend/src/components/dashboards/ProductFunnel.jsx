import { useI18n } from '../../i18n/index.js';

/**
 * [Phase3] 상품 고객 퍼널 — 선택 상품의 노출→클릭→광고전환→실주문→순주문(반품제외) 단계별 전환·이탈을
 *   기존 데이터(ad: impressions/clicks/conversions, 주문: orders/returns)로 파생한다. 백엔드 불요(중복 금지).
 *   ★상품조회·장바구니·결제시도 단계는 커머스 주문 데이터에 없는 이벤트라 파생 불가 → 정직하게 생략하고
 *   픽셀/이벤트 연동 시 자동 확장됨을 안내(가짜 퍼널 금지). 데이터 2단계 미만이면 렌더 안 함.
 */
export default function ProductFunnel({ sel, fmtN }) {
  const { t } = useI18n();
  if (!sel) return null;
  const ad = sel.ad || {};
  const impressions = Number(ad.impressions || 0);
  const clicks = Number(ad.clicks || 0);
  const conversions = Number(ad.conversions || 0);
  const orders = Number(sel.orders || 0);
  const returns = Number(sel.returns || 0);
  const netOrders = Math.max(0, orders - returns);
  const fmt = fmtN || (v => Number(v || 0).toLocaleString());

  const stages = [
    impressions > 0 && { key: 'impr', l: t('dashboard.funnel.impr', '노출'), v: impressions, c: '#4f8ef7' },
    clicks > 0 && { key: 'click', l: t('dashboard.funnel.click', '클릭'), v: clicks, c: '#22c55e' },
    conversions > 0 && { key: 'conv', l: t('dashboard.funnel.adConv', '광고 전환'), v: conversions, c: '#a855f7' },
    { key: 'order', l: t('dashboard.funnel.order', '실주문'), v: orders, c: '#f59e0b' },
    { key: 'net', l: t('dashboard.funnel.net', '순주문(반품 제외)'), v: netOrders, c: '#16a34a' },
  ].filter(Boolean);

  if (stages.length < 2) return null;
  const top = stages[0].v || 1;

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
        🔻 {t('dashboard.funnel.title', '고객 퍼널')}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1] : null;
          const rate = prev && prev.v > 0 ? (s.v / prev.v * 100) : null;     // 직전 단계 대비 전환율
          const w = Math.max(4, Math.round(s.v / top * 100));
          return (
            <div key={s.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, color: '#334155' }}>{s.l}</span>
                <span style={{ color: '#475569' }}>
                  {fmt(s.v)}
                  {rate != null && <span style={{ color: rate >= 50 ? '#16a34a' : rate >= 20 ? '#d97706' : '#ef4444', fontWeight: 700, marginLeft: 6 }}>({rate.toFixed(1)}%)</span>}
                </span>
              </div>
              <div style={{ height: 9, background: '#eef2f7', borderRadius: 4 }}>
                <div style={{ width: `${w}%`, height: '100%', background: s.c, borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
        ⓘ {t('dashboard.funnel.note', '상품조회·장바구니·결제시도 단계는 픽셀/이벤트 연동 시 자동 확장됩니다(주문 데이터엔 미수집).')}
      </div>
    </div>
  );
}
