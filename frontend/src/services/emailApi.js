// 191차 2단계 — EmailMarketing 백엔드 실배선 서비스 래퍼.
//   운영(비-데모) 전용: 190차 부활 백엔드(/email/*, /crm/segments)를 세션 토큰으로 호출.
//   라우트는 index.php bypass(세션 self-auth)이며 핸들러가 UserAuth::requirePro + authedTenant 로
//   테넌트 격리(X-Tenant-Id 헤더 불신, 188차 정합). 데모는 GlobalData 로컬 시뮬레이션 유지(미사용).
import { getJsonAuth, postJsonAuth, putJson, requestJsonAuth } from "./apiClient.js";

// ★경로 주의(191차 라우팅 검증): nginx 는 상대경로 /email·/crm 을 SPA index.html 로 폴백(200 HTML)
//   하고, 백엔드(PHP)는 /api/* 별칭으로만 도달한다(/api/email/templates → 401 requirePro). 따라서
//   반드시 /api 접두를 사용한다(상대 /email 사용 시 JSON 대신 HTML 수신 → 파싱오류).
export const emailApi = {
  // 템플릿
  listTemplates:  ()        => getJsonAuth("/api/email/templates"),
  getTemplate:    (id)      => getJsonAuth(`/api/email/templates/${id}`),
  createTemplate: (body)    => postJsonAuth("/api/email/templates", body),
  updateTemplate: (id, body)=> putJson(`/api/email/templates/${id}`, body),
  deleteTemplate: (id)      => requestJsonAuth(`/api/email/templates/${id}`, "DELETE"),
  // 캠페인
  listCampaigns:  ()        => getJsonAuth("/api/email/campaigns"),
  createCampaign: (body)    => postJsonAuth("/api/email/campaigns", body),
  sendCampaign:   (id)      => postJsonAuth(`/api/email/campaigns/${id}/send`, {}),
  campaignStats:  (id)      => getJsonAuth(`/api/email/campaigns/${id}/stats`),
  // 설정
  getSettings:    ()        => getJsonAuth("/api/email/settings"),
  saveSettings:   (body)    => putJson("/api/email/settings", body),
  // 타겟 세그먼트(CRM 소유, 읽기)
  listSegments:   ()        => getJsonAuth("/api/crm/segments"),
};
