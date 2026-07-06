// [266차] 테넌트 워크스페이스 상태 영속 헬퍼 — 운영 미영속(localStorage/state 전용) 페이지 해소.
//   백엔드: GET/POST /api/v424/workspace (WorkspaceState, 세션 self-auth·tenant 격리·key 화이트리스트).
//   데모 모드는 백엔드 호출 없이 기존 localStorage 동작 유지(운영 오염 차단).
import { getJsonAuth, postJsonAuth } from './apiClient.js';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
export const wsEnabled = !IS_DEMO;

/** 저장된 값 로드. 없으면 undefined(호출부가 기존 시드/state 유지). 실패는 조용히 undefined. */
export async function loadWorkspace(key) {
  if (IS_DEMO) return undefined;
  try {
    const r = await getJsonAuth(`/api/v424/workspace?key=${encodeURIComponent(key)}`);
    return r && r.ok ? r.value : undefined;
  } catch { return undefined; }
}

/** 값 저장(upsert). best-effort — 실패해도 UI 흐름 방해 안 함. */
export async function saveWorkspace(key, value) {
  if (IS_DEMO) return;
  try { await postJsonAuth('/api/v424/workspace', { key, value }); } catch { /* best-effort */ }
}
