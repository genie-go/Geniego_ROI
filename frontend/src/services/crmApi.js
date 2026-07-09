// 191차 4단계 — CRM 도메인 백엔드 실배선 서비스 래퍼.
//   운영(비-데모) 전용: 190차 부활 백엔드(/api/crm/*)를 세션 토큰으로 호출.
//   ★경로: 상대 /crm 은 nginx SPA HTML 폴백 → /api/* 로만 도달(reference_api_prefix_routing).
//   핸들러는 UserAuth::requirePro + authedTenant 로 테넌트 격리. 데모는 GlobalData 로컬 시뮬레이션 유지.
import { getJsonAuth, postJsonAuth, requestJsonAuth } from "./apiClient.js";

export const crmApi = {
  // 고객 — [현 차수 P1] 하드캡 해소: 서버 page 페이지네이션(백엔드 limit 최대 100/page) + 전체 KPI는 stats() 사용.
  listCustomers:  (q = "", page = 1, limit = 100) => getJsonAuth(`/api/crm/customers?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  // KPI/세그먼트/CSV 전체수: 서버집계(총/활성/총LTV) — 100행 리스트로 계산하던 언더카운트 제거.
  stats:          ()       => getJsonAuth("/api/crm/stats"),
  // CSV 내보내기용 전건 수집(page 루프, 서버 total 기준 종료).
  listAllCustomers: async (q = "", maxRows = 20000) => {
    let all = [], page = 1, total = Infinity;
    for (;;) {
      const d = await getJsonAuth(`/api/crm/customers?page=${page}&limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      const rows = (d && d.customers) || [];
      if (typeof d?.total === "number") total = d.total;
      all = all.concat(rows);
      if (rows.length < 100 || all.length >= total || all.length >= maxRows) break;
      page += 1;
    }
    return { ok: true, customers: all, total: all.length };
  },
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
  // [255차 P1] 옴니채널 오케스트레이터 — 세그먼트→다채널 워터폴 비동기 발송.
  omniChannels:        ()       => getJsonAuth("/api/v427/omni/channels"),
  omniListCampaigns:   ()       => getJsonAuth("/api/v427/omni/campaigns"),
  omniCreateCampaign:  (body)   => postJsonAuth("/api/v427/omni/campaigns", body),
  omniDeleteCampaign:  (id)     => requestJsonAuth(`/api/v427/omni/campaigns/${id}`, "DELETE"),
  omniSendCampaign:    (id)     => postJsonAuth(`/api/v427/omni/campaigns/${id}/send`, {}),
  omniCampaignStats:   (id)     => getJsonAuth(`/api/v427/omni/campaigns/${id}/stats`),
};
