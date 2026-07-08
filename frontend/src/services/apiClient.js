// [171차 N-170-apiclient-base] localhost:8000 fallback 제거 → relative path (동일 origin).
// 운영 브라우저가 .env 부재 시 localhost 호출하여 CORS/ERR_CONNECTION_REFUSED 발생하던 28페이지 fix.
const base = import.meta.env.VITE_API_BASE || "";

/* ── 데모 모드 감지 ── */
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const TOKEN_KEY = IS_DEMO ? "demo_genie_token" : "genie_token";

/* 183차 Phase3: 읽기전용 멤버(team_role='member') 쓰기 차단 중앙 가드 */
import { guardWrite } from "./writeGuard.js";

export async function getJson(path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}


/** [272차 대행사] 인증 토큰 해석 — 대행사 콘솔이 클라이언트로 전환한 상태(agt_ 토큰 보유)면 그 토큰을 사용해
 *  기존 전 앱(대시보드/캠페인/어트리뷰션 등)이 그대로 '클라이언트 스코프'로 동작(서버가 링크에서 tenant 도출·
 *  매요청 승인 재검증). 대행사 로그아웃 시 genie_agency_token 제거 → 일반 세션 복귀. 데모는 미적용(격리). */
export function agencyToken() {
  try { const at = localStorage.getItem("genie_agency_token"); if (!IS_DEMO && at && at.indexOf("agt_") === 0) return at; } catch (e) {}
  return "";
}
function defaultHeaders() {
  const token = agencyToken() || localStorage.getItem(TOKEN_KEY) || localStorage.getItem("accessToken") || localStorage.getItem("genie_auth_token") || "";
  const h = {
    "Content-Type": "application/json",
    "X-Tenant-ID": IS_DEMO ? "demo" : (localStorage.getItem("tenantId") || ""),
    // [231차] 사용자 로케일 전달 → 백엔드 AI/리포트 생성기가 해당 언어로 출력(ClaudeAI::reqLang).
    "X-Lang": localStorage.getItem("genie_roi_lang") || "ko",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  // [251차] admin 'platform_growth' 컨텍스트 전환 — 켜져 있으면 기존 모든 메뉴(크리에이티브/자동화/어트리뷰션 등)가
  //   플랫폼 자체 성장 데이터로 조회·운영(서버는 admin 계정에만 허용). 기본 OFF. 데모는 미적용(격리).
  try { if (!IS_DEMO && localStorage.getItem("gg_act_as_tenant") === "platform_growth") h["X-Act-As-Tenant"] = "platform_growth"; } catch (e) {}
  return h;
}

/** [251차] 외부(raw fetch 페이지)에서도 동일 컨텍스트 헤더를 붙일 수 있게 공개. AutoMarketing 등 raw fetch 재사용. */
export function actAsHeader() {
  try { if (!IS_DEMO && localStorage.getItem("gg_act_as_tenant") === "platform_growth") return { "X-Act-As-Tenant": "platform_growth" }; } catch (e) {}
  return {};
}



export async function postJson(path, body) {
  guardWrite("POST", path);
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
      // [251차] 상품/광고디자인 등록 한도 초과(402) → 전역 초과 모달 트리거(추가팩 구매/거부). 호출부는 기존대로 throw 처리.
      if (res.status === 402 && j && (j.error === 'product_limit_reached' || j.error === 'ad_design_limit_reached')) {
        try { window.dispatchEvent(new CustomEvent('gg-product-overage', { detail: j })); } catch (e) { }
      }
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}

export async function getJsonAuth(path) {
  const res = await fetch(`${base}${path}`, { headers: defaultHeaders() });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}


export async function putText(path, rawBody) {
  guardWrite("PUT", path);
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: defaultHeaders(),
    body: rawBody,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}

export async function putJson(path, body) {
  guardWrite("PUT", path);
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: defaultHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return await res.json();
}

export async function patchJson(path, body) {
  guardWrite("PATCH", path);
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: defaultHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return await res.json();
}

export async function delJson(path) {
  guardWrite("DELETE", path);
  const res = await fetch(`${base}${path}`, { method: "DELETE", headers: defaultHeaders() });
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j); }
    catch (e) { try { detail = await res.text(); } catch { } }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return await res.json();
}


export async function postJsonAuth(path, body, extraHeaders = {}) {
  return requestJsonAuth(path, "POST", body, extraHeaders);
}

export async function requestJsonAuth(path, method, body, extraHeaders = {}) {
  guardWrite(method, path);
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...defaultHeaders(), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  const txt = await res.text();
  if (!txt) return {};
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}
// === Abortable wrappers (76th, AbortController/signal support) ===

export async function getJsonAuthAbortable(path, signal) {
  const res = await fetch(`${base}${path}`, { headers: defaultHeaders(), signal });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}

export async function requestJsonAuthAbortable(path, method, body, signal) {
  guardWrite(method, path);
  const res = await fetch(`${base}${path}`, {
    method,
    headers: defaultHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body ?? {}),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch { }
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  const txt = await res.text();
  if (!txt) return {};
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

export async function postJsonAuthAbortable(path, body, signal) {
  return requestJsonAuthAbortable(path, "POST", body, signal);
}
