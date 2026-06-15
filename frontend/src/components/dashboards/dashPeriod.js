/* ─────────────────────────────────────────────────────────────────────────
   dashPeriod.js — 대시보드 6탭 공통 기간(period) 스코프 유틸 (현 차수 신설)

   목적: 그동안 Dashboard.jsx 가 DashPeriodSelector 의 period 를 prop 으로 넘겨도
   각 대시보드 컴포넌트가 이를 받지 않아 기간 선택이 "죽은 선택자"였다(7일/30일/90일
   을 바꿔도 값 불변). 본 유틸로 6탭 전부 period-aware 하게 만든다.

   데이터 모델 제약(정직한 스코프 원칙):
   - 주문(orders)은 날짜를 보유(데모 atISO/at/month, 운영 ordered_at/created_at)하므로
     "실제 기간 필터"가 가능 → 매출/주문수/객단가/반품/취소/채널별 매출을 정확히 재집계.
   - 채널 광고 집계(channelBudgets[].spent/revenue/impressions/clicks)는 날짜가 없는
     전체 누적값이므로 "기간일수 / 데이터윈도우" 비례로 균등 스코프(일평균 균등 가정).
     비율 지표(ROAS/CTR/CVR/CPC)는 분자·분모가 같은 계수로 스케일되어 기간 불변 → 보존.
   - 전체 윈도우(=데이터 전 구간) 선택 시 계수=1 → 누적값 그대로(보존 법칙).

   period 형태: { preset, start: Date(00:00:00), end: Date(23:59:59) }
   ───────────────────────────────────────────────────────────────────────── */

// [225차 P2-3] 취소/반품 판정 공용 캐논(내부 deriveOrderKpis 사용 + 아래 re-export 로 외부 노출).
import { isCancelledStatus, isReturnStatus } from './orderStatusCanon.js';

const DAY = 86400000;

/** 주문 1건의 날짜를 폭넓게 추출(데모/운영 필드 모두 지원). 실패 시 null. */
export function orderDate(o) {
  if (!o || typeof o !== 'object') return null;
  const cand = o.atISO || o.ordered_at || o.created_at || o.createdAt
    || o.orderDate || o.date || o.at || o.month;
  if (!cand) return null;
  const d = new Date(cand);
  return isNaN(d.getTime()) ? null : d;
}

/** period 가 유효한 기간 범위인지(둘 다 Date). */
export function hasPeriod(period) {
  return !!(period && period.start instanceof Date && period.end instanceof Date
    && !isNaN(period.start.getTime()) && !isNaN(period.end.getTime()));
}

/** 날짜 d 가 period 안에 포함되는지(경계 inclusive). period 없으면 true(전체). */
export function inPeriod(d, period) {
  if (!hasPeriod(period)) return true;
  if (!d) return false;
  const t = d.getTime();
  return t >= period.start.getTime() && t <= period.end.getTime();
}

/** period 의 일수(inclusive, 캘린더일 기준). period 없으면 0(=스코프 안 함 신호).
 *  end 는 23:59:59 이므로 floor 로 캘린더일 차를 구한 뒤 +1(시작·종료 양일 포함). */
export function periodDays(period) {
  if (!hasPeriod(period)) return 0;
  return Math.max(1, Math.floor((period.end.getTime() - period.start.getTime()) / DAY) + 1);
}

/** orders 를 period 로 필터. period 없으면 원본 그대로. */
export function filterOrdersByPeriod(orders, period) {
  if (!Array.isArray(orders)) return [];
  if (!hasPeriod(period)) return orders;
  return orders.filter(o => inPeriod(orderDate(o), period));
}

/** orders 가 실제로 분포한 데이터 윈도우 일수(min~max). 비면 90 fallback. */
export function dataWindowDays(orders) {
  const ts = [];
  for (const o of (orders || [])) {
    const d = orderDate(o);
    if (d) ts.push(d.getTime());
  }
  if (!ts.length) return 90;
  const span = (Math.max(...ts) - Math.min(...ts)) / DAY + 1;
  return Math.max(1, Math.round(span));
}

/**
 * 날짜 없는 누적 집계(광고비/노출/클릭 등)를 기간 비례로 스코프하는 계수(0~1).
 * 전체 윈도우 이상이면 1(누적값 보존). period 없으면 1.
 * @param {{start:Date,end:Date}} period
 * @param {number} windowDays  데이터 윈도우 일수(dataWindowDays(orders))
 */
export function scopeFactor(period, windowDays) {
  if (!hasPeriod(period)) return 1;
  const days = periodDays(period);
  const win = Math.max(1, windowDays || 90);
  return Math.min(1, days / win);
}

/**
 * period 스코프 묶음을 한 번에 계산하는 헬퍼.
 * 반환: { scoped(=필터된 orders), factor, days, windowDays, active(period 적용 여부) }
 */
export function buildPeriodScope(orders, period) {
  const windowDays = dataWindowDays(orders);
  return {
    scoped: filterOrdersByPeriod(orders, period),
    factor: scopeFactor(period, windowDays),
    days: periodDays(period),
    windowDays,
    active: hasPeriod(period),
  };
}

// [225차 P2-3] 취소/반품 판정은 공용 캐논(orderStatusCanon)으로 통합 — 독립 복사본 드리프트 제거.
//   기존 dashPeriod 자체 토큰셋은 'refunded'/'refund' 를 취소로 오분류해(매출 제외) 기간필터 매출이
//   전체 매출(반품=매출포함)과 발산했다. 백엔드 OrderHub 캐논과 정합되는 단일 소스로 통일.
//   (상단에서 import 한 로컬 바인딩을 재노출 — 기존 importer 들의 dashPeriod 경유 import 보존.)
export { isCancelledStatus, isReturnStatus };

/** 주문 1건의 매출액 추출(데모 total, 운영 total/total_price). */
export function orderRevenue(o) {
  if (!o) return 0;
  return Number(o.total ?? o.total_price ?? o.amount ?? ((o.qty || 0) * (o.price || 0))) || 0;
}

/** 주문 1건의 채널 키. */
export function orderChannel(o) {
  if (!o) return '';
  return String(o.ch || o.channel || o.platform || '');
}

/**
 * period 필터된 orders 에서 주문 기반 KPI 재집계(취소 제외, 반품률 포함).
 * 반환: { revenue, orders(건수), returns, cancelled, aov, byChannel{ch:{revenue,orders}} }
 */
export function deriveOrderKpis(scopedOrders) {
  let revenue = 0, count = 0, returns = 0, cancelled = 0;
  const byChannel = {};
  for (const o of (scopedOrders || [])) {
    const st = o.status;
    if (isCancelledStatus(st)) { cancelled++; continue; }
    const rev = orderRevenue(o);
    revenue += rev; count++;
    if (isReturnStatus(st)) returns++;
    const ch = orderChannel(o);
    if (ch) {
      if (!byChannel[ch]) byChannel[ch] = { revenue: 0, orders: 0 };
      byChannel[ch].revenue += rev; byChannel[ch].orders++;
    }
  }
  return {
    revenue, orders: count, returns, cancelled,
    aov: count > 0 ? revenue / count : 0,
    returnRate: count + returns > 0 ? (returns / (count + returns)) * 100 : 0,
    byChannel,
  };
}
