// [현 차수] WMS 물류 운영 고도화 탭 3종 — 물류 대시보드 / 정기 리포트·분석 / 임가공(외주가공) 재고·이력.
//   사용자 요구: ①실시간 출고율·재고현황·재고회전율·유통기한 등급·반품처리율 등 물류흐름 종합 대시보드
//   ②일/월/분기/연간 정기 리포트 + 물류 데이터 분석 ③임가공 중인 재고와 이력 현황.
//   ★데이터 SSOT = 주문(orders)·재고(inventory)·LOT(lotManagement+백엔드)·입출고(inOutHistory+백엔드 movements).
//   가짜 데이터 합성 없이 기존 단일소스에서 파생(임의배분/날조 금지). 임가공은 신규 엔터티라 tenant-scoped
//   localStorage 영속(기존 wms_audit_log 패턴과 동형 — 운영 백엔드 영속은 후속 확장).
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useI18n } from '../../i18n';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';
import { IS_DEMO } from '../../utils/demoEnv.js';
import { tScopedKey } from '../../utils/tenantStorage.js';
import { loadWorkspace, saveWorkspace, wsEnabled } from '../../services/workspaceState.js'; // [279차] 임가공 작업지시 서버 영속
import * as wmsApi from '../../services/wmsApi.js';

/* ── 공용 스타일 (WMS 라이트 테마 정합) ───────────────────────── */
const CARD = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' };
const SEC = { fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 12 };
const SUB = { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 };

/* ── 입출고 유형 정규화 (영문 IO_TYPES + 한글 라벨 혼용 흡수) ── */
function normKind(type) {
  const s = String(type || '').toLowerCase();
  if (/return|반품/.test(s)) return 'returns';
  if (/outbound|출고/.test(s)) return 'outbound';
  if (/inbound|입고/.test(s)) return 'inbound';
  if (/transfer|이동/.test(s)) return 'transfer';
  if (/disposal|폐기/.test(s)) return 'disposal';
  if (/adj|조정/.test(s)) return 'adjust';
  return 'other';
}
function parseDt(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
const isCancel = (o) => /cancel|취소/i.test(String(o.event_type || o.eventType || '') + String(o.status || ''));
const isReturn = (o) => /return|반품/i.test(String(o.event_type || o.eventType || '') + String(o.status || ''));
const oQty = (o) => Number(o.qty ?? o.quantity ?? 1);

function KpiCard({ icon, label, value, sub, color, gauge }) {
  return (
    <div style={{ ...CARD, borderColor: color + '22' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={SUB}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      {gauge != null && (
        <div style={{ height: 6, background: '#eef2f7', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, gauge))}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
        </div>
      )}
      {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* 데모 LOT 시드 — 체험자가 유통기한 등급/FEFO 대시보드를 실제처럼 경험하도록(U-177-A: IS_DEMO 빌드 전용,
//   운영 번들엔 미주입). 운영은 백엔드 listLots 실데이터로 구동. daysLeft 는 런타임 계산. */
const _today = new Date();
const _dPlus = (d) => { const x = new Date(_today); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const DEMO_LOTS = [
  { sku: 'LOR-REV-001', name: "Revitalift Filler 세럼", lotNo: 'L2406A', expiryDate: _dPlus(220), qty: 1800 },
  { sku: 'LOR-RLX-002', name: 'Revitalift Laser 크림', lotNo: 'L2405B', expiryDate: _dPlus(140), qty: 1200 },
  { sku: 'LOR-TM-004', name: 'True Match 파운데이션', lotNo: 'L2404C', expiryDate: _dPlus(75), qty: 640 },
  { sku: 'LOR-LP-007', name: 'Lash Paradise 마스카라', lotNo: 'L2403D', expiryDate: _dPlus(22), qty: 310 },
  { sku: 'LOR-CR-009', name: 'Color Riche 립스틱', lotNo: 'L2312E', expiryDate: _dPlus(-8), qty: 95 },
].map(l => ({ ...l, daysLeft: Math.ceil((new Date(l.expiryDate) - _today) / 86400000) }));

/* 공통: 입출고·LOT 백엔드 병합 훅 */
function useWmsFlow() {
  const gd = useGlobalData();
  const { orders = [], inventory = [], inOutHistory = [], lotManagement = [] } = gd;
  const [beMoves, setBeMoves] = useState([]);
  const [beLots, setBeLots] = useState([]);
  useEffect(() => {
    let alive = true;
    wmsApi.listMovements(500).then(r => { if (alive && Array.isArray(r?.movements)) setBeMoves(r.movements.map(m => ({ type: m.type, sku: m.sku, name: m.name, qty: Number(m.qty) || 0, ts: m.created_at }))); }).catch(() => {});
    wmsApi.listLots().then(r => { if (alive && Array.isArray(r?.lots)) setBeLots(r.lots.map(l => ({ sku: l.sku, name: l.name, expiryDate: l.expiry_date, qty: Number(l.qty) || 0, daysLeft: l.expiry_date ? Math.ceil((new Date(l.expiry_date) - new Date()) / 86400000) : 9999 }))); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const movements = useMemo(() => {
    const ctx = (inOutHistory || []).map(m => ({ kind: normKind(m.type), qty: Number(m.qty) || 0, sku: m.sku, name: m.name, date: parseDt(m.atISO || m.ts || m.created_at || (m.month ? m.month + '-01' : null)) }));
    const be = (beMoves || []).map(m => ({ kind: normKind(m.type), qty: m.qty, sku: m.sku, name: m.name, date: parseDt(m.ts) }));
    return [...be, ...ctx];
  }, [inOutHistory, beMoves]);
  const lots = useMemo(() => {
    const merged = [...beLots, ...(lotManagement || [])];
    return (merged.length === 0 && IS_DEMO) ? DEMO_LOTS : merged;
  }, [beLots, lotManagement]);
  return { ...gd, orders, inventory, movements, lots };
}

/* ════════════════════════════════════════════════════════════════
   TAB: 물류 대시보드 (실시간 출고율·재고·회전율·유통기한·반품처리율)
════════════════════════════════════════════════════════════════ */
export const WmsDashboardTab = memoGuard(function WmsDashboardTab() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { orders, inventory, movements, lots, totalInventoryValue = 0, totalInventoryQty = 0, lowStockCount = 0 } = useWmsFlow();

  const m = useMemo(() => {
    const valid = orders.filter(o => !isCancel(o) && !isReturn(o));
    const returns = orders.filter(o => isReturn(o));
    const totalOrders = orders.length;
    const shipped = valid.length;
    const soldQty = valid.reduce((s, o) => s + oQty(o), 0);
    const returnQty = returns.reduce((s, o) => s + oQty(o), 0);

    // 출고율 = 출고완료(취소·반품 제외) / 전체 주문
    const fulfillRate = totalOrders > 0 ? Math.round(shipped / totalOrders * 1000) / 10 : (shipped > 0 ? 100 : 0);

    // 재고 회전율 = 판매수량 / 평균재고(현재 총재고)
    const turnover = totalInventoryQty > 0 ? Math.round(soldQty / totalInventoryQty * 100) / 100 : 0;

    // 반품률 = 반품수량 / 판매수량(동일 수량 기준, 단위 정합). 처리율 = (전체-미처리)/전체.
    //   미처리 = 접수/요청/대기 상태의 반품(처리 대기). 기록된 반품이벤트는 처리완료로 간주(SSOT 정합).
    const returnRate = soldQty > 0 ? Math.round(returnQty / soldQty * 1000) / 10 : 0;
    const pendingQty = returns.filter(o => /pending|request|요청|접수|대기|미처리/i.test(String(o.status || o.event_type || o.eventType || ''))).reduce((s, o) => s + oQty(o), 0);
    const returnProcRate = returnQty > 0 ? Math.round((returnQty - pendingQty) / returnQty * 1000) / 10 : 100;

    // 유통기한 등급 (FEFO, 수량가중): 만료<=0 / 임박<=30 / 주의<=90 / 안전>90
    const grp = { expired: 0, imminent: 0, caution: 0, safe: 0 };
    let lotQty = 0;
    lots.forEach(l => {
      const q = Number(l.qty) || 0; lotQty += q;
      const d = l.daysLeft != null ? l.daysLeft : (l.expiryDate ? Math.ceil((new Date(l.expiryDate) - new Date()) / 86400000) : 9999);
      if (d <= 0) grp.expired += q; else if (d <= 30) grp.imminent += q; else if (d <= 90) grp.caution += q; else grp.safe += q;
    });
    const safePct = lotQty > 0 ? Math.round(grp.safe / lotQty * 100) : 0;
    const grade = lotQty === 0 ? '—' : safePct >= 85 ? 'A' : safePct >= 65 ? 'B' : safePct >= 40 ? 'C' : 'D';

    // 물류 흐름 — 유형별 수량
    const flow = { inbound: 0, outbound: 0, returns: 0, transfer: 0, disposal: 0, adjust: 0 };
    movements.forEach(x => { if (flow[x.kind] != null) flow[x.kind] += x.qty; });
    // 출고 흐름엔 주문 출고도 반영(데모: 입출고이력이 희소해도 주문 SSOT로 실수량 표기)
    flow.outbound = Math.max(flow.outbound, soldQty);
    flow.returns = Math.max(flow.returns, returnQty);

    // 창고별 재고 분포
    const wh = {};
    (inventory || []).forEach(it => { const st = it.stock || {}; Object.entries(st).forEach(([w, q]) => { wh[w] = (wh[w] || 0) + (Number(q) || 0); }); });

    return { totalOrders, shipped, soldQty, returnQty, fulfillRate, turnover, returnProcRate, returnRate, grp, lotQty, safePct, grade, flow, wh, skuCount: (inventory || []).length };
  }, [orders, inventory, movements, lots, totalInventoryQty]);

  const gradeColor = { A: '#22c55e', B: '#84cc16', C: '#f97316', D: '#ef4444', '—': '#94a3b8' }[m.grade];
  const FLOW_DEF = [
    { k: 'inbound', l: t('wms.dashFlowInbound', '입고'), c: '#22c55e', i: '📥' },
    { k: 'outbound', l: t('wms.dashFlowOutbound', '출고'), c: '#4f8ef7', i: '📤' },
    { k: 'returns', l: t('wms.dashFlowReturns', '반품'), c: '#a855f7', i: '↩️' },
    { k: 'transfer', l: t('wms.dashFlowTransfer', '창고이동'), c: '#eab308', i: '🔁' },
    { k: 'disposal', l: t('wms.dashFlowDisposal', '폐기'), c: '#ef4444', i: '🗑️' },
    { k: 'adjust', l: t('wms.dashFlowAdjust', '재고조정'), c: '#14b8a6', i: '⚖️' },
  ];
  const flowMax = Math.max(1, ...FLOW_DEF.map(f => m.flow[f.k] || 0));
  const WH_NAME = { W001: t('wms.whSeoul', '서울 본사'), W002: t('wms.whBusan', '부산'), W003: t('wms.whIncheon', '인천 허브') };
  const whMax = Math.max(1, ...Object.values(m.wh));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 10px', color: '#16a34a', fontWeight: 700 }}>
          ● {t('wms.dashLive', '실시간 물류 현황')}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('wms.dashSrc', '주문·재고·LOT·입출고 단일소스 파생')}</span>
      </div>

      {/* 핵심 KPI 6종 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12 }}>
        <KpiCard icon="📤" label={t('wms.dashShipRate', '실시간 출고율')} value={m.fulfillRate + '%'} gauge={m.fulfillRate}
          sub={t('wms.dashShipRateSub', '출고완료 {a} / 전체주문 {b}건').replace('{a}', m.shipped.toLocaleString()).replace('{b}', m.totalOrders.toLocaleString())} color="#4f8ef7" />
        <KpiCard icon="📦" label={t('wms.dashStockValue', '재고 자산')} value={fmt(totalInventoryValue)}
          sub={t('wms.dashStockSub', '{q}개 · {s} SKU').replace('{q}', totalInventoryQty.toLocaleString()).replace('{s}', m.skuCount)} color="#22c55e" />
        <KpiCard icon="🔄" label={t('wms.dashTurnover', '재고 회전율')} value={m.turnover.toFixed(2) + '×'}
          sub={t('wms.dashTurnoverSub', '판매 {a} / 평균재고 {b}').replace('{a}', m.soldQty.toLocaleString()).replace('{b}', totalInventoryQty.toLocaleString())} color="#a855f7" />
        <KpiCard icon="📅" label={t('wms.dashExpiryGrade', '유통기한 등급')} value={m.grade}
          sub={t('wms.dashExpirySub', '안전재고 {p}% · {n}개 LOT').replace('{p}', m.safePct).replace('{n}', m.lotQty.toLocaleString())} color={gradeColor} gauge={m.lotQty ? m.safePct : null} />
        <KpiCard icon="↩️" label={t('wms.dashReturnProc', '반품 처리율')} value={m.returnProcRate + '%'} gauge={m.returnProcRate}
          sub={t('wms.dashReturnProcSub', '반품률 {r}% · {q}개 발생').replace('{r}', m.returnRate).replace('{q}', m.returnQty.toLocaleString())} color="#f97316" />
        <KpiCard icon="⚠️" label={t('wms.dashLowStock', '저재고 경보')} value={lowStockCount.toLocaleString() + t('wms.unitCount', '건')}
          sub={t('wms.dashLowStockSub', '안전재고 미만 SKU')} color={lowStockCount > 0 ? '#ef4444' : '#22c55e'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
        {/* 물류 흐름 */}
        <div style={CARD}>
          <div style={SEC}>🔀 {t('wms.dashFlowTitle', '물류 흐름 (수량)')}</div>
          <div style={{ display: 'grid', gap: 9 }}>
            {FLOW_DEF.map(f => (
              <div key={f.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: '#475569' }}>{f.i} {f.l}</span>
                  <span style={{ fontWeight: 800, color: f.c }}>{(m.flow[f.k] || 0).toLocaleString()}</span>
                </div>
                <div style={{ height: 8, background: '#eef2f7', borderRadius: 4 }}>
                  <div style={{ width: `${(m.flow[f.k] || 0) / flowMax * 100}%`, height: '100%', background: f.c, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 유통기한 등급 분포 + 창고 분포 */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={CARD}>
            <div style={SEC}>📅 {t('wms.dashExpiryDist', '유통기한 등급 분포')}</div>
            {m.lotQty === 0 ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('wms.dashNoLot', 'LOT/유통기한 데이터가 없습니다 (LOT 관리 탭에서 등록).')}</div> : (
              <div style={{ display: 'grid', gap: 7 }}>
                {[['safe', t('wms.expSafe', '안전 (90일+)'), '#22c55e'], ['caution', t('wms.expCaution', '주의 (31~90일)'), '#f97316'], ['imminent', t('wms.expImminent', '임박 (30일 이하)'), '#ef4444'], ['expired', t('wms.expExpired', '만료'), '#7f1d1d']].map(([k, l, c]) => (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#475569' }}>{l}</span><span style={{ fontWeight: 800, color: c }}>{m.grp[k].toLocaleString()}</span>
                    </div>
                    <div style={{ height: 7, background: '#eef2f7', borderRadius: 4 }}><div style={{ width: `${m.grp[k] / m.lotQty * 100}%`, height: '100%', background: c, borderRadius: 4 }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={CARD}>
            <div style={SEC}>🏬 {t('wms.dashWhDist', '창고별 재고 분포')}</div>
            {Object.keys(m.wh).length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('wms.dashNoStock', '재고 데이터 없음')}</div> : (
              <div style={{ display: 'grid', gap: 7 }}>
                {Object.entries(m.wh).sort((a, b) => b[1] - a[1]).map(([w, q]) => (
                  <div key={w}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#475569' }}>{WH_NAME[w] || w}</span><span style={{ fontWeight: 800, color: '#4f8ef7' }}>{q.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 7, background: '#eef2f7', borderRadius: 4 }}><div style={{ width: `${q / whMax * 100}%`, height: '100%', background: '#4f8ef7', borderRadius: 4 }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ════════════════════════════════════════════════════════════════
   TAB: 정기 리포트 & 물류 데이터 분석 (일/월/분기/연간)
════════════════════════════════════════════════════════════════ */
export const WmsReportsTab = memoGuard(function WmsReportsTab() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { orders, inventory, movements, lots, totalInventoryValue = 0, totalInventoryQty = 0 } = useWmsFlow();
  const [gran, setGran] = useState('monthly');

  const GRAN = [
    { id: 'daily', l: t('wms.repDaily', '일간'), days: 1 },
    { id: 'monthly', l: t('wms.repMonthly', '월간'), days: 30 },
    { id: 'quarterly', l: t('wms.repQuarterly', '분기'), days: 90 },
    { id: 'yearly', l: t('wms.repYearly', '연간'), days: 365 },
  ];

  // 기간 버킷 키 생성
  const bucketKey = useCallback((d, g) => {
    if (!d) return null;
    const y = d.getFullYear(), mo = d.getMonth();
    if (g === 'daily') return `${y}-${String(mo + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (g === 'monthly') return `${y}-${String(mo + 1).padStart(2, '0')}`;
    if (g === 'quarterly') return `${y} Q${Math.floor(mo / 3) + 1}`;
    return `${y}`;
  }, []);

  const report = useMemo(() => {
    // 기간별 입출고 집계 (날짜 파싱 가능분). 주문은 출고/반품 흐름으로 포함.
    const buckets = {};
    const add = (key, field, qty) => { if (!key) return; if (!buckets[key]) buckets[key] = { key, inbound: 0, outbound: 0, returns: 0, disposal: 0 }; buckets[key][field] += qty; };
    movements.forEach(x => { const k = bucketKey(x.date, gran); if (x.kind === 'inbound') add(k, 'inbound', x.qty); else if (x.kind === 'outbound') add(k, 'outbound', x.qty); else if (x.kind === 'returns') add(k, 'returns', x.qty); else if (x.kind === 'disposal') add(k, 'disposal', x.qty); });
    orders.forEach(o => { const k = bucketKey(parseDt(o.atISO || o.created_at || o.ordered_at || (o.month ? o.month + '-01' : null) || o.date), gran); if (!k) return; if (isReturn(o)) add(k, 'returns', oQty(o)); else if (!isCancel(o)) add(k, 'outbound', oQty(o)); });
    const rows = Object.values(buckets).sort((a, b) => a.key < b.key ? 1 : -1).slice(0, 24).map(r => ({ ...r, net: r.inbound - r.outbound - r.disposal }));

    // 전체 누적 요약 (날짜 무관 — 항상 표기되어 빈 화면 방지)
    const valid = orders.filter(o => !isCancel(o) && !isReturn(o));
    const totalOut = valid.reduce((s, o) => s + oQty(o), 0);
    const totalRet = orders.filter(isReturn).reduce((s, o) => s + oQty(o), 0);
    const totalIn = movements.filter(x => x.kind === 'inbound').reduce((s, x) => s + x.qty, 0);
    const totalDisp = movements.filter(x => x.kind === 'disposal').reduce((s, x) => s + x.qty, 0);

    // SKU별 분석 (판매·재고·유통기한 위험)
    const bySku = {};
    valid.forEach(o => { const sk = o.sku || o.product_id; if (!sk) return; if (!bySku[sk]) bySku[sk] = { sku: sk, name: o.product_name || o.name || sk, soldQty: 0, revenue: 0, stock: 0, expRisk: 0 }; bySku[sk].soldQty += oQty(o); bySku[sk].revenue += Number(o.total_price ?? o.total ?? o.amount ?? 0); });
    (inventory || []).forEach(it => { const sk = it.sku; if (bySku[sk]) bySku[sk].stock = Object.values(it.stock || {}).reduce((a, b) => a + (Number(b) || 0), 0); });
    lots.forEach(l => { const d = l.daysLeft != null ? l.daysLeft : 9999; if (d <= 30 && bySku[l.sku]) bySku[l.sku].expRisk += Number(l.qty) || 0; });
    const skuRows = Object.values(bySku).map(r => ({ ...r, turnover: r.stock > 0 ? Math.round(r.soldQty / r.stock * 100) / 100 : null })).sort((a, b) => b.revenue - a.revenue).slice(0, 15);

    return { rows, skuRows, totalOut, totalRet, totalIn, totalDisp };
  }, [movements, orders, inventory, lots, gran, bucketKey]);

  const exportCsv = () => {
    const head = [t('wms.repColPeriod', '기간'), t('wms.dashFlowInbound', '입고'), t('wms.dashFlowOutbound', '출고'), t('wms.dashFlowReturns', '반품'), t('wms.dashFlowDisposal', '폐기'), t('wms.repColNet', '순증감')];
    const lines = [head.join(','), ...report.rows.map(r => [r.key, r.inbound, r.outbound, r.returns, r.disposal, r.net].join(','))];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wms_report_${gran}.csv`; a.click();
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {GRAN.map(g => (
            <button key={g.id} onClick={() => setGran(g.id)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: gran === g.id ? '#2563eb' : '#eef2f7', color: gran === g.id ? '#fff' : '#475569' }}>{g.l}</button>
          ))}
        </div>
        <button onClick={exportCsv} style={{ padding: '6px 14px', borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📥 {t('wms.repExport', 'CSV 내보내기')}</button>
      </div>

      {/* 누적 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <KpiCard icon="📥" label={t('wms.dashFlowInbound', '입고')} value={report.totalIn.toLocaleString()} color="#22c55e" sub={t('wms.repCumulative', '누적')} />
        <KpiCard icon="📤" label={t('wms.dashFlowOutbound', '출고')} value={report.totalOut.toLocaleString()} color="#4f8ef7" sub={t('wms.repCumulative', '누적')} />
        <KpiCard icon="↩️" label={t('wms.dashFlowReturns', '반품')} value={report.totalRet.toLocaleString()} color="#a855f7" sub={t('wms.repCumulative', '누적')} />
        <KpiCard icon="📦" label={t('wms.dashStockValue', '재고 자산')} value={fmt(totalInventoryValue)} color="#14b8a6" sub={`${totalInventoryQty.toLocaleString()}${t('wms.unitEa', '개')}`} />
      </div>

      {/* 기간별 리포트 */}
      <div style={CARD}>
        <div style={SEC}>📊 {t('wms.repPeriodTitle', '기간별 물류 리포트')} — {GRAN.find(g => g.id === gran)?.l}</div>
        {report.rows.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', padding: '14px 0' }}>{t('wms.repNoData', '선택 기간에 날짜가 기록된 입출고/주문 데이터가 없습니다. 누적 요약을 참고하세요. (운영 연동 시 일자별 자동 집계)')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {[t('wms.repColPeriod', '기간'), t('wms.dashFlowInbound', '입고'), t('wms.dashFlowOutbound', '출고'), t('wms.dashFlowReturns', '반품'), t('wms.dashFlowDisposal', '폐기'), t('wms.repColNet', '순증감')].map((h, i) => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {report.rows.map(r => (
                  <tr key={r.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: '#1e293b' }}>{r.key}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#22c55e' }}>{r.inbound.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#4f8ef7' }}>{r.outbound.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#a855f7' }}>{r.returns.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#ef4444' }}>{r.disposal.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: r.net >= 0 ? '#16a34a' : '#dc2626' }}>{r.net >= 0 ? '+' : ''}{r.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SKU별 분석 */}
      <div style={CARD}>
        <div style={SEC}>🔎 {t('wms.repSkuTitle', '상품별 물류 분석 (Top 15)')}</div>
        {report.skuRows.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('wms.repNoSku', '판매 데이터 없음')}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {[t('wms.repColProduct', '상품'), t('wms.repColSold', '판매량'), t('wms.repColRevenue', '매출'), t('wms.repColStock', '재고'), t('wms.dashTurnover', '회전율'), t('wms.repColExpRisk', '유통기한 위험')].map((h, i) => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {report.skuRows.map(r => (
                  <tr key={r.sku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: '#1e293b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>{r.soldQty.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#16a34a' }}>{fmt(r.revenue)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>{r.stock.toLocaleString()}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: '#a855f7' }}>{r.turnover == null ? '—' : r.turnover.toFixed(2) + '×'}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', color: r.expRisk > 0 ? '#ef4444' : '#94a3b8', fontWeight: r.expRisk > 0 ? 800 : 400 }}>{r.expRisk > 0 ? r.expRisk.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

/* ════════════════════════════════════════════════════════════════
   TAB: 임가공(외주가공) 재고 · 이력 현황
════════════════════════════════════════════════════════════════ */
const TOLL_KEY = 'wms_toll_orders';
const TOLL_STATUS = [
  { id: 'waiting', l: '대기', c: '#94a3b8' },
  { id: 'processing', l: '진행중', c: '#f97316' },
  { id: 'done', l: '완료', c: '#22c55e' },
  { id: 'cancelled', l: '취소', c: '#ef4444' },
];
const DEMO_TOLL = [
  { id: 'TP-2026-001', partner: '대한임가공', inSku: 'LOR-REV-001', inName: "L'Oréal Revitalift 원액 벌크 20L", inQty: 500, outSku: 'LOR-REV-001-30', outName: 'Revitalift Filler 세럼 30ml 완제', outQty: 480, startDate: '2026-06-10', dueDate: '2026-06-20', doneDate: '', status: 'processing', note: '충진·라벨링 외주', createdAt: '2026-06-10T09:00:00' },
  { id: 'TP-2026-002', partner: '한빛팩토리', inSku: 'LOR-TM-004', inName: 'True Match 파운데이션 벌크', inQty: 300, outSku: 'LOR-TM-004-SET', outName: 'True Match 기획세트', outQty: 295, startDate: '2026-05-28', dueDate: '2026-06-05', doneDate: '2026-06-04', status: 'done', note: '세트 합포장', createdAt: '2026-05-28T10:00:00' },
];

export const WmsTollProcessingTab = memoGuard(function WmsTollProcessingTab() {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ partner: '', inSku: '', inName: '', inQty: '', outSku: '', outName: '', outQty: '', startDate: '', dueDate: '', note: '' });
  const [showForm, setShowForm] = useState(false);

  // [279차 감사 E-P1] 임가공(외주가공) 작업지시 = 실 물류 운영 데이터인데 종전 localStorage 전용(타기기·팀원 미공유·
  //   캐시삭제 소실)이면서 UI 는 "회원별로 안전하게 저장됩니다"라 오인 유발. 서버 영속(WorkspaceState·테넌트 스코프)으로
  //   전환해 라벨과 실제 동작을 일치시킨다(데모는 localStorage 폴백).
  const _tollHydrated = useRef(!wsEnabled);
  useEffect(() => {
    let alive = true;
    if (wsEnabled) {
      loadWorkspace('wms_toll').then(v => { if (alive) { if (Array.isArray(v)) setOrders(v); _tollHydrated.current = true; } }).catch(() => {}); // [M3-P1] 실패 시 가드 미개방(서버값 보존)
    } else {
      try { const raw = localStorage.getItem(tScopedKey(TOLL_KEY)); if (raw) { setOrders(JSON.parse(raw)); return; } } catch {}
      if (IS_DEMO) setOrders(DEMO_TOLL);
    }
  }, []);
  const persist = useCallback((next) => {
    setOrders(next);
    if (wsEnabled) { if (_tollHydrated.current) saveWorkspace('wms_toll', next).catch(() => {}); }
    else { try { localStorage.setItem(tScopedKey(TOLL_KEY), JSON.stringify(next)); } catch {} }
  }, []);

  const stLabel = (id) => { const s = TOLL_STATUS.find(s => s.id === id) || TOLL_STATUS[0]; return { l: t('wms.tollSt_' + id, s.l), c: s.c }; };

  const kpi = useMemo(() => {
    const proc = orders.filter(o => o.status === 'processing');
    const done = orders.filter(o => o.status === 'done');
    const inProcQty = proc.reduce((s, o) => s + (Number(o.inQty) || 0), 0);
    const yields = done.map(o => (Number(o.inQty) > 0 ? (Number(o.outQty) || 0) / Number(o.inQty) * 100 : 0)).filter(v => v > 0);
    const avgYield = yields.length ? Math.round(yields.reduce((a, b) => a + b, 0) / yields.length * 10) / 10 : null;
    return { procN: proc.length, inProcQty, doneN: done.length, avgYield, totalN: orders.length };
  }, [orders]);

  const submit = () => {
    if (!form.partner || !form.inSku || !form.inQty) { alert(t('wms.tollReq', '가공처·투입 SKU·투입 수량은 필수입니다.')); return; }
    const id = 'TP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
    const rec = { ...form, id, inQty: Number(form.inQty) || 0, outQty: Number(form.outQty) || 0, doneDate: '', status: 'waiting', createdAt: new Date().toISOString() };
    persist([rec, ...orders]);
    setForm({ partner: '', inSku: '', inName: '', inQty: '', outSku: '', outName: '', outQty: '', startDate: '', dueDate: '', note: '' });
    setShowForm(false);
  };
  const setStatus = (id, status) => persist(orders.map(o => o.id === id ? { ...o, status, doneDate: status === 'done' && !o.doneDate ? new Date().toISOString().slice(0, 10) : o.doneDate } : o));
  const remove = (id) => { if (window.confirm(t('wms.tollDelConfirm', '이 임가공 작업을 삭제할까요?'))) persist(orders.filter(o => o.id !== id)); };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('wms.tollDesc', '외주 임가공(충진·라벨링·세트구성 등) 작업의 투입·산출 재고와 진행 이력을 관리합니다.')}</span>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#2563eb,#4f8ef7)', color: '#fff', fontWeight: 700, fontSize: 12 }}>{showForm ? '✕ ' + t('wms.tollClose', '닫기') : '➕ ' + t('wms.tollNew', '임가공 작업 등록')}</button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <KpiCard icon="⚙️" label={t('wms.tollKpiProc', '진행중 작업')} value={kpi.procN.toLocaleString() + t('wms.unitCount', '건')} color="#f97316" />
        <KpiCard icon="📦" label={t('wms.tollKpiInQty', '진행중 투입재고')} value={kpi.inProcQty.toLocaleString() + t('wms.unitEa', '개')} color="#4f8ef7" sub={t('wms.tollKpiInQtySub', '임가공 중 묶인 재고')} />
        <KpiCard icon="✅" label={t('wms.tollKpiDone', '완료 작업')} value={kpi.doneN.toLocaleString() + t('wms.unitCount', '건')} color="#22c55e" />
        <KpiCard icon="📈" label={t('wms.tollKpiYield', '평균 수율')} value={kpi.avgYield == null ? '—' : kpi.avgYield + '%'} color="#a855f7" sub={t('wms.tollKpiYieldSub', '산출/투입 (완료기준)')} />
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div style={{ ...CARD, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}>
          <div style={SEC}>➕ {t('wms.tollNew', '임가공 작업 등록')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <div><label style={SUB}>{t('wms.tollPartner', '가공처')}</label><TollField form={form} setForm={setForm} k="partner" ph={t('wms.tollPartner', '가공처')} /></div>
            <div><label style={SUB}>{t('wms.tollInSku', '투입 SKU')}</label><TollField form={form} setForm={setForm} k="inSku" ph="SKU" /></div>
            <div><label style={SUB}>{t('wms.tollInName', '투입 품목')}</label><TollField form={form} setForm={setForm} k="inName" ph={t('wms.tollInName', '투입 품목')} /></div>
            <div><label style={SUB}>{t('wms.tollInQty', '투입 수량')}</label><TollField form={form} setForm={setForm} k="inQty" type="number" ph="0" /></div>
            <div><label style={SUB}>{t('wms.tollOutSku', '산출 SKU')}</label><TollField form={form} setForm={setForm} k="outSku" ph="SKU" /></div>
            <div><label style={SUB}>{t('wms.tollOutName', '산출 품목')}</label><TollField form={form} setForm={setForm} k="outName" ph={t('wms.tollOutName', '산출 품목')} /></div>
            <div><label style={SUB}>{t('wms.tollOutQty', '산출 수량')}</label><TollField form={form} setForm={setForm} k="outQty" type="number" ph="0" /></div>
            <div><label style={SUB}>{t('wms.tollStart', '시작일')}</label><TollField form={form} setForm={setForm} k="startDate" type="date" /></div>
            <div><label style={SUB}>{t('wms.tollDue', '완료 예정일')}</label><TollField form={form} setForm={setForm} k="dueDate" type="date" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={SUB}>{t('wms.tollNote', '비고')}</label><TollField form={form} setForm={setForm} k="note" ph={t('wms.tollNote', '비고')} /></div>
          </div>
          <button onClick={submit} style={{ marginTop: 12, padding: '8px 22px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#2563eb,#4f8ef7)', color: '#fff', fontWeight: 700, fontSize: 12 }}>{t('wms.tollSave', '등록')}</button>
        </div>
      )}

      {/* 진행중 재고 */}
      <div style={CARD}>
        <div style={SEC}>⚙️ {t('wms.tollInProcTitle', '임가공 중인 재고 (진행 작업)')}</div>
        {orders.filter(o => o.status === 'processing' || o.status === 'waiting').length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('wms.tollNoProc', '진행중인 임가공 작업이 없습니다.')}</div>
        ) : orders.filter(o => o.status === 'processing' || o.status === 'waiting').map(o => {
          const st = stLabel(o.status);
          return (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: st.c + '18', color: st.c }}>{st.l}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.id}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{o.partner}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>📦 {o.inName || o.inSku} <strong>{Number(o.inQty).toLocaleString()}</strong> → {o.outName || o.outSku || '—'} {o.outQty ? <strong>{Number(o.outQty).toLocaleString()}</strong> : ''}</span>
              {o.dueDate && <span style={{ fontSize: 11, color: '#94a3b8' }}>~{o.dueDate}</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                {o.status === 'waiting' && <button onClick={() => setStatus(o.id, 'processing')} style={btn('#f97316')}>{t('wms.tollStart2', '착수')}</button>}
                {o.status === 'processing' && <button onClick={() => setStatus(o.id, 'done')} style={btn('#22c55e')}>{t('wms.tollComplete', '완료')}</button>}
                <button onClick={() => remove(o.id)} style={btn('#ef4444')}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 전체 이력 */}
      <div style={CARD}>
        <div style={SEC}>📜 {t('wms.tollHistTitle', '임가공 이력 현황')}</div>
        {orders.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('wms.tollNoHist', '임가공 이력이 없습니다.')}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {[t('wms.tollColId', '작업번호'), t('wms.tollPartner', '가공처'), t('wms.tollColIn', '투입'), t('wms.tollColOut', '산출'), t('wms.tollColYield', '수율'), t('wms.tollColDate', '기간'), t('wms.tollColStatus', '상태')].map((h, i) => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: i >= 2 && i <= 4 ? 'right' : 'left', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {orders.map(o => {
                  const st = stLabel(o.status);
                  const yld = Number(o.inQty) > 0 && Number(o.outQty) > 0 ? Math.round(Number(o.outQty) / Number(o.inQty) * 1000) / 10 : null;
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.id}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{o.partner}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{(Number(o.inQty) || 0).toLocaleString()}<div style={{ fontSize: 10, color: '#94a3b8' }}>{o.inSku}</div></td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>{(Number(o.outQty) || 0).toLocaleString()}<div style={{ fontSize: 10, color: '#94a3b8' }}>{o.outSku || '—'}</div></td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: yld == null ? '#94a3b8' : yld >= 95 ? '#16a34a' : yld >= 85 ? '#f97316' : '#ef4444', fontWeight: 700 }}>{yld == null ? '—' : yld + '%'}</td>
                      <td style={{ padding: '8px 6px', fontSize: 10, color: '#64748b' }}>{o.startDate || '—'}{o.doneDate ? ` ~ ${o.doneDate}` : o.dueDate ? ` ~ (${o.dueDate})` : ''}</td>
                      <td style={{ padding: '8px 6px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: st.c + '18', color: st.c }}>{st.l}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 10 }}>{t('wms.tollPersistNote', '※ 임가공 작업은 회원별로 안전하게 저장됩니다(운영 백엔드 영속은 후속 확장).')}</div>
      </div>
    </div>
  );
});

function btn(color) {
  return { padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, background: color + '18', color };
}

/* 모듈 스코프 입력 — 컴포넌트 내부 정의 시 매 렌더 remount 되어 포커스 소실되는 트랩 회피(안정적 식별자). */
function TollField({ form, setForm, k, ph, type = 'text' }) {
  return (
    <input value={form[k]} type={type} placeholder={ph} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      style={{ padding: '7px 10px', borderRadius: 8, background: '#fff', border: '1px solid #d1d5db', color: '#1f2937', fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
  );
}

/* memo 가드 — React.memo 호환(이름 보존) */
function memoGuard(Comp) { return React.memo(Comp); }
