/* [246차 P3] 웹 푸시 구독 — push-only SW(push-sw.js) 등록 + VAPID 구독 + 백엔드 저장.
 *   ★화이트스크린 트랩 회피: push-sw.js 는 fetch핸들러 부재(내비게이션 미가로채기). 사용자 명시 허용 시에만 등록(opt-in).
 *   VAPID 미설정(서버) 시 enabled=false → 버튼 숨김(graceful). */
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';

function urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** 서버 VAPID 활성 여부 + 공개키 조회. */
export async function pushConfig() {
  try { const d = await getJsonAuth('/api/v426/push/vapid-key'); return d && d.enabled ? d : { enabled: false }; }
  catch { return { enabled: false }; }
}

/** 현재 구독 상태(SW + 권한). */
export async function pushStatus() {
  if (!pushSupported()) return { supported: false, subscribed: false };
  try {
    const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return { supported: true, subscribed: !!sub, permission: Notification.permission };
  } catch { return { supported: true, subscribed: false, permission: Notification.permission }; }
}

/** 푸시 구독(opt-in) — 권한요청 → push-sw 등록 → VAPID 구독 → 백엔드 저장. */
export async function pushSubscribe() {
  if (!pushSupported()) throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다.');
  const cfg = await pushConfig();
  if (!cfg.enabled || !cfg.public_key) throw new Error('서버에 푸시(VAPID)가 설정되지 않았습니다.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림 권한이 거부되었습니다.');
  const reg = await navigator.serviceWorker.register('/push-sw.js'); // push-only(fetch핸들러 부재)
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(cfg.public_key) });
  }
  const j = sub.toJSON();
  // [283차 R2] customer_id 는 **서버가** 세션 사용자의 email 로 자기 테넌트 CRM 고객을 해상해 결속한다
  //   (WebPush::subscribe → resolveCustomerByContact). 프론트가 임의 customer_id 를 보내면 위조가 되므로 보내지 않는다.
  //   ※ 이 경로는 대시보드 로그인 사용자 전용이다. 고객사 **상점 방문자(소비자)** 구독은 공개 픽셀 경로
  //     (pixel.js: genie('pushSubscribe') → POST /api/pixel/push/subscribe)가 담당한다.
  await postJsonAuth('/api/v426/push/subscribe', { endpoint: j.endpoint, keys: j.keys || {} });
  return true;
}

/** 푸시 해지 — 백엔드 삭제 + 브라우저 구독 해제. */
export async function pushUnsubscribe() {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) { await postJsonAuth('/api/v426/push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); }
    return true;
  } catch { return false; }
}
