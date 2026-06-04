// 191차 3단계 — JourneyBuilder 백엔드 실배선 서비스 래퍼.
//   운영(비-데모) 전용: 190차 부활 백엔드(/api/journey/*)를 세션 토큰으로 호출.
//   ★경로: nginx 는 상대 /journey 를 SPA HTML 폴백 → 백엔드는 /api/* 로만 도달(reference_api_prefix_routing).
//   핸들러는 UserAuth::requirePro + authedTenant 로 테넌트 격리. 데모는 GlobalData 로컬 시뮬레이션 유지.
import { getJsonAuth, postJsonAuth, putJson, requestJsonAuth } from "./apiClient.js";

export const journeyApi = {
  list:   ()       => getJsonAuth("/api/journey/journeys"),
  create: (body)   => postJsonAuth("/api/journey/journeys", body),
  update: (id,body)=> putJson(`/api/journey/journeys/${id}`, body),
  remove: (id)     => requestJsonAuth(`/api/journey/journeys/${id}`, "DELETE"),
  launch: (id)     => postJsonAuth(`/api/journey/journeys/${id}/launch`, {}),
  stats:  (id)     => getJsonAuth(`/api/journey/journeys/${id}/stats`),
};
