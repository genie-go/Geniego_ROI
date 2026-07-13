// liveApi.js — 라이브 커머스(Live Commerce) 백엔드 클라이언트 (208차 신설).
// 라우팅: /api/v425/live/* (세션 self-auth, LiveCommerce::requirePro + 테넌트 격리).
//   reference_api_prefix_routing: 신규 실배선은 /api 접두 필수(nginx 가 상대경로를 SPA HTML 폴백).
import { getJsonAuth, postJsonAuth, requestJsonAuth } from './apiClient.js';

const BASE = '/api/v425/live';

/* ── 세션 ── */
export const listSessions   = () => getJsonAuth(`${BASE}/sessions`);
export const saveSession    = (body) => postJsonAuth(`${BASE}/sessions`, body);
export const updateSession  = (id, body) => requestJsonAuth(`${BASE}/sessions/${id}`, 'PUT', body);
export const deleteSession  = (id) => requestJsonAuth(`${BASE}/sessions/${id}`, 'DELETE');
export const goLive         = (id) => postJsonAuth(`${BASE}/sessions/${id}/go-live`, {});
export const endSession     = (id) => postJsonAuth(`${BASE}/sessions/${id}/end`, {});

/* ── 편성 상품 ── */
export const listProducts   = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/products`);
export const saveProduct    = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/products`, body);
export const deleteProduct  = (pid) => requestJsonAuth(`${BASE}/products/${pid}`, 'DELETE');
export const featureProduct = (pid) => postJsonAuth(`${BASE}/products/${pid}/feature`, {});

/* ── 방송 중 구매 ── */
export const listOrders     = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/orders`);
export const placeOrder     = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/orders`, body);

/* ── 채팅/댓글주문 ── */
export const listChat       = (sid, since = 0) => getJsonAuth(`${BASE}/sessions/${sid}/chat?since=${since}`);
export const postChat       = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/chat`, body);

/* ── 시청자/통계 ── */
export const heartbeat      = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/heartbeat`, body);
export const getStats       = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/stats`);
export const getOverview    = () => getJsonAuth(`${BASE}/overview`);

/* ── [현 차수] 미디어 평면(WHIP 송출/WHEP 재생) URL ── */
export const getMedia       = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/media`);
/* ── [현 차수] 미디어서버 설정 등록(추후 등록 시 즉시 자동 활성) ── */
export const getMediaConfig  = () => getJsonAuth(`${BASE}/media-config`);
export const saveMediaConfig = (body) => requestJsonAuth(`${BASE}/media-config`, 'PUT', body);
export const testMediaConfig = () => requestJsonAuth(`${BASE}/media-config/test`, 'POST', {}); // [P2] 연결 헬스체크

/* ── 멀티 송출 대상(RTMP) — 208차 #1 ── */
export const listDestinations  = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/destinations`);
export const saveDestination   = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/destinations`, body);
export const deleteDestination = (id) => requestJsonAuth(`${BASE}/destinations/${id}`, 'DELETE');
export const toggleDestination = (id) => postJsonAuth(`${BASE}/destinations/${id}/toggle`, {});
export const multicast         = (sid, action) => postJsonAuth(`${BASE}/sessions/${sid}/multicast/${action}`, {});

/* ── [246차] 인터랙티브 오버레이: 투표·이모지 반응 ── */
export const listPolls       = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/polls`);
export const createPoll      = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/polls`, body);
export const votePoll        = (pid, body) => postJsonAuth(`${BASE}/polls/${pid}/vote`, body);
export const closePoll       = (pid) => postJsonAuth(`${BASE}/polls/${pid}/close`, {});
export const postReaction    = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/reactions`, body);
export const reactionSummary = (sid, since = 0) => getJsonAuth(`${BASE}/sessions/${sid}/reactions/summary?since=${since}`);

/* ── 멀티게스트/코호스트 ── */
export const listGuests   = (sid) => getJsonAuth(`${BASE}/sessions/${sid}/guests`);
export const inviteGuest  = (sid, body) => postJsonAuth(`${BASE}/sessions/${sid}/guests`, body);
export const updateGuest  = (gid, body) => requestJsonAuth(`${BASE}/guests/${gid}`, 'PUT', body);
export const removeGuest  = (gid) => requestJsonAuth(`${BASE}/guests/${gid}`, 'DELETE');

/* [282차 R3] 연동 프레임워크 CRUD(listIntegrations/saveIntegration/deleteIntegration) 제거 —
   호출처 0 고아이며 채널 자격증명 등록은 IntegrationHub(/integration-hub)가 SSOT로 담당(중복 회피). */

/**
 * SSE 스트림 URL. EventSource 는 커스텀 헤더 불가 → ?token=<genie_token>.
 * 운영 nginx vhost: location /api/v425/live/stream { proxy_buffering off; proxy_read_timeout 360s; }
 */
export function streamUrl(sid, since = 0) {
  const base = import.meta.env.VITE_API_BASE || '';
  const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
  const token = localStorage.getItem(IS_DEMO ? 'demo_genie_token' : 'genie_token')
    || localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
  const p = new URLSearchParams();
  p.set('session_id', String(sid));
  if (since) p.set('since', String(since));
  if (token) p.set('token', token);
  return `${base}${BASE}/stream?${p.toString()}`;
}
