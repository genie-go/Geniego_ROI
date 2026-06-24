// 191차 4단계 — CRM 도메인 백엔드 실배선 서비스 래퍼.
//   운영(비-데모) 전용: 190차 부활 백엔드(/api/crm/*)를 세션 토큰으로 호출.
//   ★경로: 상대 /crm 은 nginx SPA HTML 폴백 → /api/* 로만 도달(reference_api_prefix_routing).
//   핸들러는 UserAuth::requirePro + authedTenant 로 테넌트 격리. 데모는 GlobalData 로컬 시뮬레이션 유지.
import { getJsonAuth, postJsonAuth, requestJsonAuth } from "./apiClient.js";

export const crmApi = {
  // 고객
  listCustomers:  (q = "") => getJsonAuth(`/api/crm/customers?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  getCustomer:    (id)     => getJsonAuth(`/api/crm/customers/${id}`),
  createCustomer: (body)   => postJsonAuth("/api/crm/customers", body),
  deleteCustomer: (id)     => requestJsonAuth(`/api/crm/customers/${id}`, "DELETE"),
  rfm:            ()       => getJsonAuth("/api/crm/rfm"),
  // 세그먼트
  listSegments:   ()       => getJsonAuth("/api/crm/segments"),
  createSegment:  (body)   => postJsonAuth("/api/crm/segments", body),
  deleteSegment:  (id)     => requestJsonAuth(`/api/crm/segments/${id}`, "DELETE"),
  refreshSegment: (id)     => postJsonAuth(`/api/crm/segments/${id}/refresh`, {}),
  smartSeedSegments: ()    => postJsonAuth("/api/crm/segments/smart-seed", {}), // [239차+ CDP] 표준 행동 세그먼트 원클릭
  // 빈도캡/STO(딜리버러빌리티 제어) — [현 차수] admin 조정. 테넌트 격리(서버 app_setting skey 접두).
  getCommsFreq:   ()       => getJsonAuth("/api/crm/comms-freq"),
  saveCommsFreq:  (body)   => requestJsonAuth("/api/crm/comms-freq", "PUT", body),
};
