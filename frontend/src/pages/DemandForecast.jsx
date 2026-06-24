import React, { useState, useMemo, useEffect } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { getJsonAuth, postJson } from '../services/apiClient.js';

/* ── Enterprise Demo Isolation Guard ─── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

export default function DemandForecast() {
  const { t } = useI18n();
  const { inventory = [], orders = [] } = useGlobalData();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [t('demandForecast.tabDashboard', '대시보드'), t('demandForecast.tabForecast', 'SKU 예측'), t('demandForecast.tabSeasonality', '계절성'), t('demandForecast.tabModelConfig', '모델 설정')];

  /* ── 206차 #5: 서버측 실 예측 모델(Holt-Winters/Holt/이동평균) API 배선 ── */
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [season, setSeason] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, f, sea] = await Promise.all([
          getJsonAuth('/api/demand/summary').catch(() => null),
          getJsonAuth('/api/demand/forecast?horizon=14&top=50').catch(() => null),
          getJsonAuth('/api/demand/seasonality').catch(() => null),
        ]);
        if (!alive) return;
        if (s?.ok) setSummary(s);
        if (Array.isArray(f?.items)) setForecast(f.items);
        if (Array.isArray(sea?.seasonality)) setSeason(sea.seasonality);
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

      {/* ── Sub Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}>
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
                    {['SKU', t('demandForecast.colName', '상품'), t('demandForecast.colModel', '모델'), t('demandForecast.colAcc', '정확도'), t('demandForecast.colAvg', '일평균'), t('demandForecast.colSum', '14일 예측'), t('demandForecast.colSafety', '안전재고'), t('demandForecast.colReorder', '재주문점')].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {forecast.map((it) => (
                      <tr key={it.sku}>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7' }}>{it.sku}</td>
                        <td style={td}>{it.name}</td>
                        <td style={td}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{METHOD_LABEL[it.method] || it.method}</span></td>
                        <td style={{ ...td, fontWeight: 700, color: it.accuracy >= 80 ? '#16a34a' : it.accuracy >= 60 ? '#f59e0b' : '#64748b' }}>{it.accuracy > 0 ? it.accuracy + '%' : '—'}</td>
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

        {/* Model Config */}
        {activeTab === 3 && (
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
