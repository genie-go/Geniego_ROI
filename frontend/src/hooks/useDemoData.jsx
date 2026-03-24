import { useAuth } from "../auth/AuthContext";

/**
 * useDemoData — 데모 User에게 모크 데이터를 제공하는 훅
 * isPro가 false(데모/free)이면 각 기능별 샘플 데이터를 반환합니다.
 * 유료 User에는 모크 데이터 없이 실제 데이터를 사용하세요.
 */
export function useDemoData() {
  const { isDemo, isPro } = useAuth();
  return { isDemo, isPro };
}

/** 데모용 CRM 고객 샘플 데이터 */
export const DEMO_CRM_CUSTOMERS = [
  { id: 1, name: "김현우", email: "kim@example.com", plan: "VIP", ltv: 2850000, orders: 18, lastOrder: "2026-03-14", segment: "VIP", riskScore: 12 },
  { id: 2, name: "이서연", email: "lee@example.com", plan: "일반", ltv: 760000, orders: 5, lastOrder: "2026-03-10", segment: "일반", riskScore: 41 },
  { id: 3, name: "박준혁", email: "park@example.com", plan: "일반", ltv: 420000, orders: 3, lastOrder: "2026-02-28", segment: "이탈위험", riskScore: 78 },
  { id: 4, name: "최Edit", email: "choi@example.com", plan: "VIP", ltv: 4200000, orders: 31, lastOrder: "2026-03-15", segment: "VIP", riskScore: 8 },
  { id: 5, name: "정민서", email: "jung@example.com", plan: "일반", ltv: 180000, orders: 2, lastOrder: "2026-01-20", segment: "이탈위험", riskScore: 88 },
  { id: 6, name: "한지은", email: "han@example.com", plan: "일반", ltv: 950000, orders: 7, lastOrder: "2026-03-12", segment: "잠재VIP", riskScore: 22 },
  { id: 7, name: "윤태양", email: "yoon@example.com", plan: "VIP", ltv: 3100000, orders: 22, lastOrder: "2026-03-15", segment: "VIP", riskScore: 15 },
  { id: 8, name: "임나현", email: "lim@example.com", plan: "일반", ltv: 320000, orders: 4, lastOrder: "2026-03-01", segment: "일반", riskScore: 55 },
];

/** 데모용 이메일 캠페인 샘플 */
export const DEMO_EMAIL_CAMPAIGNS = [
  { id: 1, name: "3월 봄맞이 할인", status: "active", sent: 12400, opened: 3720, clicked: 892, converted: 156, revenue: 4680000, openRate: 30.0, clickRate: 7.2 },
  { id: 2, name: "VIP 전용 신상품 오픈", status: "active", sent: 1850, opened: 1110, clicked: 418, converted: 89, revenue: 5340000, openRate: 60.0, clickRate: 22.6 },
  { id: 3, name: "이탈 고객 재Active화", status: "paused", sent: 4200, opened: 672, clicked: 98, converted: 12, revenue: 360000, openRate: 16.0, clickRate: 2.3 },
  { id: 4, name: "Orders Done 감사 메일", status: "active", sent: 7800, opened: 4290, clicked: 936, converted: 0, revenue: 0, openRate: 55.0, clickRate: 12.0 },
];

/** 데모용 픽셀 이벤트 샘플 */
export const DEMO_PIXEL_EVENTS = [
  { time: "13:48:22", event: "purchase", page: "/checkout", value: 128000, userId: "u_4829" },
  { time: "13:47:51", event: "add_to_cart", page: "/product/1234", value: 48000, userId: "u_1122" },
  { time: "13:47:18", event: "page_view", page: "/category/fashion", value: 0, userId: "u_7731" },
  { time: "13:46:44", event: "purchase", page: "/checkout", value: 256000, userId: "u_9901" },
  { time: "13:46:12", event: "initiate_checkout", page: "/cart", value: 92000, userId: "u_3388" },
  { time: "13:45:33", event: "add_to_cart", page: "/product/5678", value: 35000, userId: "u_5512" },
  { time: "13:45:01", event: "page_view", page: "/home", value: 0, userId: "u_6647" },
  { time: "13:44:28", event: "search", page: "/search", value: 0, userId: "u_2293" },
];

/** 데모용 여정 빌더 흐름 샘플 */
export const DEMO_JOURNEYS = [
  { id: 1, name: "신규 가입 웰컴 시퀀스", status: "active", participants: 1240, completed: 820, conversion: 12.4, steps: 4 },
  { id: 2, name: "이탈 방지 자동화", status: "active", participants: 380, completed: 145, conversion: 8.1, steps: 3 },
  { id: 3, name: "구매 후 재구매 유도", status: "draft", participants: 0, completed: 0, conversion: 0, steps: 5 },
];

/** 데모 표시 래퍼 컴포넌트 — 데모 배너 표시 */
export function DemoBanner() {
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 10, marginBottom: 20,
      background: "linear-gradient(135deg, rgba(234,179,8,0.12), rgba(245,158,11,0.06))",
      border: "1px solid rgba(234,179,8,0.3)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>🟡</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 12, color: "#fbbf24" }}>데모 체험 모드</div>
        <div style={{ fontSize: 11, color: "#d97706" }}>실제 데이터 대신 샘플 데이터가 표시됩니다. <a href="/app-pricing" style={{ color: "#4f8ef7", fontWeight: 700 }}>Upgrade</a>하면 실제 기능을 사용할 수 있습니다.</div>
      </div>
    </div>
  );
}
