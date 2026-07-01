import React, { useState, useMemo, useEffect } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useProductSelection } from '../contexts/ProductSelectionContext.jsx';
import { getJsonAuth, postJson } from '../services/apiClient.js';

/* ── Enterprise Demo Isolation Guard ─── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

export default function DemandForecast() {
  const { t } = useI18n();
  const { inventory = [], orders = [] } = useGlobalData();
  const { selectedProduct } = useProductSelection(); // [현 차수] 전역 상품선택 → 해당 SKU 수요예측 포커스
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [t('demandForecast.tabDashboard', '대시보드'), t('demandForecast.tabForecast', 'SKU 예측'), t('demandForecast.tabSeasonality', '계절성'), t('demandForecast.tabDeadStock', '재고 노후'), t('demandForecast.tabModelConfig', '모델 설정')];

  /* ── 206차 #5: 서버측 실 예측 모델(Holt-Winters/Holt/이동평균) API 배선 ── */
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [season, setSeason] = useState([]);
  const [dead, setDead] = useState(null); // [257차] 재고 노후/악성재고
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, f, sea, ds] = await Promise.all([
          getJsonAuth('/api/demand/summary').catch(() => null),
          getJsonAuth('/api/demand/forecast?horizon=14&top=50').catch(() => null),
          getJsonAuth('/api/demand/seasonality').catch(() => null),
          getJsonAuth('/api/demand/dead-stock').catch(() => null),
        ]);
        if (!alive) return;
        if (s?.ok) setSummary(s);
        if (Array.isArray(f?.items)) setForecast(f.items);
        if (Array.isArray(sea?.seasonality)) setSeason(sea.seasonality);
        if (ds?.ok) setDead(ds);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // [현 차수] 수요예측 자동발주 — 재고<재주문점 SKU에 wms_supply_orders 'suggested' 자동 생성.
  const [replenishing, setReplenishing] = useState(false);
  const [replenishMsg, setReplenishMsg] = useState(null);
  const runAutoReplenish = async () => {
    if (IS_DEMO) { setReplenishMsg(t('demandForecast.demoReplenish', '데모 모드 — 자동발주는 운영에서 실행됩니다.')); return; }
    setReplenishing(true); setReplenishMsg(null);
    try {
      const r = await postJson('/api/demand/auto-replenish', { lead: 7, horizon: 14 });
      if (r?.ok) setReplenishMsg(t('demandForecast.replenishDone', '자동발주 완료 — {{n}}건의 발주 제안이 WMS 발주관리에 생성되었습니다').replace('{{n}}', r.created) + (r.created === 0 ? t('demandForecast.replenishEnough', ' (재고 충분 또는 진행중 발주 존재)') : '') + '.');
      else setReplenishMsg(t('demandForecast.replenishFail', '자동발주 실패 — 다시 시도하세요.'));
    } catch (e) { setReplenishMsg(t('demandForecast.replenishErr', '자동발주 실패: ') + String(e?.message || e)); }
    setReplenishing(false);
  };

  // KPI: 서버 summary 우선, 데이터 없으면(데모/신규) inventory/orders 파생 폴백(날조 정확도 미표시)
  const kpis = useMemo(() => {
    const skuCount = summary ? summary.skus_tracked : (Array.isArray(inventory) ? inventory.length : 0);
    const forecastable = summary ? summary.forecastable
      : (new Set((Array.isArray(orders) ? orders : []).map(o => o.sku).filter(Boolean)).size || (Array.isArray(inventory) ? inventory.length : 0));
    const acc = summary && summary.avg_accuracy > 0 ? `${summary.avg_accuracy}%` : "—";
    const hist = summary && summary.history_days > 0 ? `${summary.history_days}d` : "—";
    return [
      { emoji: "📦", label: t('demandForecast.kpiSkus', '추적 SKU'), val: skuCount },
      { emoji: "📊", label: t('demandForecast.kpiForecasts', '예측가능 SKU'), val: forecastable },
      { emoji: "🎯", label: t('demandForecast.kpiAccuracy', '평균 정확도'), val: acc },
      { emoji: "🗓️", label: t('demandForecast.kpiHistory', '데이터 기간'), val: hist },
    ];
  }, [summary, inventory, orders, t]);

  const METHOD_LABEL = {
    holt_winters: 'Holt-Winters', holt_linear: 'Holt Linear', mean: 'Moving Avg',
  };
  const card = { borderRadius: 14, padding: "18px 20px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(8px)" };
  const th = { padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#6b7280', fontWeight: 700, borderBottom: '1px solid #e5e7eb' };
  const td = { padding: '8px 10px', fontSize: 12, color: '#1e293b', borderBottom: '1px solid #f1f5f9' };

  const emptyState = (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
      {loading ? t('demandForecast.loading', '예측 모델 로딩 중…')
        : t('demandForecast.empty', '예측에 필요한 채널 주문 데이터가 아직 없습니다. 채널을 연동하면 주문이 쌓이며 자동으로 SKU별 수요예측이 생성됩니다.')}
    </div>
  );

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      {/* ── Hero Header ── */}
      <div style={{ borderRadius: 18, padding: "28px 32px", marginBottom: 22, background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(79,142,247,0.12)", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>📈</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>📈 {t('demandForecast.title', 'AI 수요예측')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>{t('demandForecast.subtitle', '판매 신호(주문·재고) 기반 SKU 수요예측 — 채널 연동 데이터가 쌓일수록 정밀해집니다.')}</div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26, flex: "0 0 auto" }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)", lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── [현 차수] 선택 상품 수요예측 포커스 — 전역 상품선택 시 해당 SKU 예측·현재고·소진예상·발주필요(실데이터·정직) ── */}
      {selectedProduct?.sku && (() => {
        const sf = forecast.find(it => String(it.sku) === selectedProduct.sku);
        const inv = (inventory || []).find(x => String(x.sku || x.product_id || '') === selectedProduct.sku);
        const onHand = inv ? Number(inv.stock ?? inv.qty ?? inv.quantity ?? inv.on_hand ?? 0) : null;
        const cover = (sf && sf.avg_daily > 0 && onHand != null) ? Math.floor(onHand / sf.avg_daily) : null;
        const needOrder = sf && onHand != null ? onHand < sf.reorder_point : false;
        return (
          <div style={{ ...card, padding: '14px 18px', marginBottom: 18, borderLeft: '4px solid #4f8ef7' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: sf ? 10 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>📦 {t('demandForecast.selProduct', '선택 상품 수요예측')}: {selectedProduct.name}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{selectedProduct.sku}</span>
            </div>
            {sf ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
                {[[t('demandForecast.colAvg', '일평균'), sf.avg_daily],
                  [t('demandForecast.colSum', '14일 예측'), sf.forecast_sum],
                  [t('demandForecast.colSafety', '안전재고'), sf.safety_stock],
                  [t('demandForecast.colReorder', '재주문점'), sf.reorder_point],
                  [t('demandForecast.onHand', '현재고'), onHand != null ? onHand : '—'],
                  [t('demandForecast.daysCover', '소진예상'), cover != null ? cover + t('demandForecast.daysUnit', '일') : '—']
                ].map(([l, v]) => (<div key={l}><div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>{l}</div><div style={{ fontSize: 17, fontWeight: 900, color: '#1e293b' }}>{v}</div></div>))}
                {needOrder && <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '5px 10px' }}>⚠️ {t('demandForecast.needReorder', '재주문점 미만 — 발주 필요')}</div>}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>
                💡 {t('demandForecast.noForecastForSku', '이 상품은 예측 가능한 주문 이력이 부족합니다. 판매가 누적되면 자동으로 수요예측·안전재고·재주문점이 산출됩니다.')}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Sub Tabs — [240차] page-subtabs: 스크롤 시 상단 고정 ── */}
      <div className="page-subtabs" style={{ display: "flex", gap: 4, marginBottom: 12, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s", background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-2, #475569)" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content Area ── */}
      <div style={{ borderRadius: 16, padding: "24px 28px", minHeight: 320, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}>
        {/* Dashboard */}
        {activeTab === 0 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>{t('demandForecast.tabDashboard', '대시보드')}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {[t('demandForecast.featEnsemble', '멀티모델 앙상블 (Holt-Winters / Holt / 이동평균)'), t('demandForecast.featSeasonal', '계절성 분해 (주간)'), t('demandForecast.featSafety', '서비스 수준 안전재고 (95%)'), t('demandForecast.featReorder', '재주문점 최적화')].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.08)" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))", border: "1px solid rgba(34,197,94,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                {summary ? `${t('demandForecast.statusForecasts', '{{n}}개 SKU 예측').replace('{{n}}', forecast.length)} · ${summary.avg_accuracy > 0 ? t('demandForecast.statusAccuracy', '{{a}}% 평균 정확도').replace('{{a}}', summary.avg_accuracy) : t('demandForecast.statusBuilding', '모델 학습 중')}` : t('demandForecast.statusOperational', '시스템 정상')}
              </span>
            </div>
          </>
        )}

        {/* SKU Forecast */}
        {activeTab === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{t('demandForecast.tabForecast', 'SKU 예측')} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>· {t('demandForecast.next14', '향후 14일')}</span></div>
              <button onClick={runAutoReplenish} disabled={replenishing} title={t('demandForecast.replenishTitle', '재고가 재주문점 미만인 SKU에 발주 제안을 WMS 발주관리에 자동 생성')}
                style={{ padding: '8px 16px', borderRadius: 9, border: 'none', cursor: replenishing ? 'default' : 'pointer', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', fontWeight: 800, fontSize: 12.5 }}>
                {replenishing ? t('demandForecast.replenishing', '발주 생성 중…') : t('demandForecast.autoReplenish', '⚡ 자동발주 실행')}
              </button>
            </div>
            {replenishMsg && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#15803d', fontSize: 12.5 }}>{replenishMsg}</div>}
            {forecast.length === 0 ? emptyState : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['SKU', t('demandForecast.colName', '상품'), t('demandForecast.colModel', '모델'), t('demandForecast.colAcc', '정확도'), t('demandForecast.colAbc', 'ABC'), t('demandForecast.colAvg', '일평균'), t('demandForecast.colSum', '14일 예측'), t('demandForecast.colSafety', '안전재고'), t('demandForecast.colReorder', '재주문점')].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {forecast.map((it) => (
                      <tr key={it.sku} style={selectedProduct?.sku === String(it.sku) ? { background: 'rgba(79,142,247,0.1)' } : undefined}>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7' }}>{it.sku}</td>
                        <td style={td}>{it.name}</td>
                        <td style={td}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{METHOD_LABEL[it.method] || it.method}</span></td>
                        <td style={{ ...td, fontWeight: 700, color: it.accuracy >= 80 ? '#16a34a' : it.accuracy >= 60 ? '#f59e0b' : '#64748b' }}>{it.accuracy > 0 ? it.accuracy + '%' : '—'}</td>
                        <td style={td}>{it.abc_class ? <span title={`${t('demandForecast.serviceLevel', '서비스레벨')} ${it.service_level}%`} style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: it.abc_class === 'A' ? 'rgba(22,163,74,0.12)' : it.abc_class === 'B' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)', color: it.abc_class === 'A' ? '#16a34a' : it.abc_class === 'B' ? '#d97706' : '#64748b' }}>{it.abc_class}</span> : '—'}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{it.avg_daily}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{it.forecast_sum}</td>
                        <td style={{ ...td, textAlign: 'right', color: '#f97316' }}>{it.safety_stock}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#4f8ef7' }}>{it.reorder_point}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Seasonality */}
        {activeTab === 2 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>{t('demandForecast.tabSeasonality', '계절성')} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>· {t('demandForecast.weekly', '요일 지수')}</span></div>
            {season.length === 0 ? emptyState : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '12px 0' }}>
                {season.map((s) => {
                  const h = Math.max(6, Math.min(100, s.index * 50));
                  const hot = s.index >= 1.1, cold = s.index <= 0.9;
                  return (
                    <div key={s.dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: hot ? '#16a34a' : cold ? '#94a3b8' : '#475569' }}>{s.index}×</div>
                      <div style={{ width: '70%', height: `${h}%`, borderRadius: '6px 6px 0 0', background: hot ? 'linear-gradient(180deg,#22c55e,#16a34a)' : cold ? 'linear-gradient(180deg,#cbd5e1,#94a3b8)' : 'linear-gradient(180deg,#4f8ef7,#6366f1)' }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{s.dow}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* [257차] Dead Stock / Aging Inventory */}
        {activeTab === 3 && (() => {
          const sum = dead?.summary;
          const items = dead?.items || [];
          const won = (n) => '₩' + Number(n || 0).toLocaleString();
          const clsBadge = (c) => c === 'dead'
            ? { bg: 'rgba(220,38,38,0.12)', fg: '#dc2626', label: t('demandForecast.dsDead', '악성(무판매)') }
            : { bg: 'rgba(245,158,11,0.14)', fg: '#d97706', label: t('demandForecast.dsSlow', '저회전') };
          const actionLabel = (a) => ({
            liquidate_never_sold: t('demandForecast.dsActNever', '청산(판매이력 없음)'),
            liquidate_or_markdown: t('demandForecast.dsActLiquidate', '청산/마크다운'),
            promote_or_bundle: t('demandForecast.dsActPromote', '프로모/번들'),
          }[a] || a);
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{t('demandForecast.tabDeadStock', '재고 노후')} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>· {t('demandForecast.dsSub', '악성·저회전 재고와 묶인 자본 진단')}</span></div>
              </div>
              {/* 요약 KPI */}
              {sum && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
                  {[
                    { emoji: '🧊', label: t('demandForecast.dsKpiDead', '악성 SKU'), val: sum.dead, color: '#dc2626' },
                    { emoji: '🐢', label: t('demandForecast.dsKpiSlow', '저회전 SKU'), val: sum.slow, color: '#d97706' },
                    { emoji: '💰', label: t('demandForecast.dsKpiDeadCap', '악성 묶인자본'), val: won(sum.dead_tied_capital), color: '#dc2626' },
                    { emoji: '📦', label: t('demandForecast.dsKpiTotalCap', '총 묶인자본'), val: won(sum.total_tied_capital), color: '#4f8ef7' },
                  ].map((k, i) => (
                    <div key={i} style={{ ...card, padding: '14px 18px' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{k.emoji} {k.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: k.color, marginTop: 4 }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              )}
              {items.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  {loading ? t('demandForecast.loading', '예측 모델 로딩 중…')
                    : t('demandForecast.dsEmpty', '악성·저회전 재고가 없거나 재고/판매 데이터가 아직 부족합니다. 채널을 연동해 재고·주문이 쌓이면 자동으로 노후 재고가 진단됩니다.')}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {['SKU', t('demandForecast.colName', '상품'), t('demandForecast.dsColClass', '분류'), t('demandForecast.dsColOnHand', '현재고'), t('demandForecast.dsColLastSale', '최근판매'), t('demandForecast.dsColAging', '경과일'), t('demandForecast.dsCol30', '30일판매'), t('demandForecast.dsColCapital', '묶인자본'), t('demandForecast.dsColDos', '회전일수'), t('demandForecast.dsColAction', '권장')].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {items.map((it) => {
                        const b = clsBadge(it.class);
                        return (
                          <tr key={it.sku}>
                            <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7' }}>{it.sku}</td>
                            <td style={td}>{it.name}</td>
                            <td style={td}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: b.bg, color: b.fg }}>{b.label}</span></td>
                            <td style={{ ...td, textAlign: 'right' }}>{it.on_hand.toLocaleString()}</td>
                            <td style={{ ...td, fontSize: 11, color: '#64748b' }}>{it.last_sale || t('demandForecast.dsNever', '없음')}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: it.days_since_sale == null ? '#dc2626' : (it.days_since_sale >= 90 ? '#dc2626' : '#d97706') }}>{it.days_since_sale == null ? '—' : it.days_since_sale + t('demandForecast.daysUnit', '일')}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{it.sold_30d}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>{won(it.tied_capital)}</td>
                            <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>{it.days_of_supply == null ? '∞' : it.days_of_supply + t('demandForecast.daysUnit', '일')}</td>
                            <td style={td}><span style={{ fontSize: 11, fontWeight: 700, color: it.class === 'dead' ? '#dc2626' : '#d97706' }}>{actionLabel(it.action)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 10 }}>🔬 {t('demandForecast.dsMethod', '현재고 보유 SKU × 실 판매(취소제외)로 산출: 악성=90일+ 무판매/미판매·저회전=30일+ 저조. 묶인자본=평균 판매단가×현재고. 자본 회수 우선순위(묶인자본 큰 순).')}</div>
                </div>
              )}
            </>
          );
        })()}

        {/* Model Config */}
        {activeTab === 4 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>{t('demandForecast.tabModelConfig', '모델 설정')}</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12, color: '#475569' }}>
              {[
                [t('demandForecast.mcHWName', 'Holt-Winters (가법)'), t('demandForecast.mcHWDesc', '데이터 ≥ 14일 — 추세 + 주간 계절성 동시 반영')],
                [t('demandForecast.mcHoltName', 'Holt 선형추세'), t('demandForecast.mcHoltDesc', '데이터 ≥ 4일 — 추세 반영(계절성 데이터 부족 시)')],
                [t('demandForecast.mcMeanName', '이동평균'), t('demandForecast.mcMeanDesc', '데이터 < 4일 — 평균 기반 보수적 예측')],
                [t('demandForecast.mcSafetyName', '안전재고'), t('demandForecast.mcSafetyDesc', 'z(1.65)×잔차σ×√(리드타임) — 서비스레벨 95%')],
                [t('demandForecast.mcAccName', '정확도'), t('demandForecast.mcAccDesc', '1-step in-sample sMAPE 기반(과적합·날조 지표 배제)')],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.08)' }}>
                  <span style={{ fontWeight: 800, minWidth: 130, color: '#1e293b' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
