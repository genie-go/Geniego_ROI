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


function defaultHeaders() {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem("accessToken") || localStorage.getItem("genie_auth_token") || "";
  const h = {
    "Content-Type": "application/json",
    "X-Tenant-ID": IS_DEMO ? "demo" : (localStorage.getItem("tenantId") || ""),
    // [231차] 사용자 로케일 전달 → 백엔드 AI/리포트 생성기가 해당 언어로 출력(ClaudeAI::reqLang).
    "X-Lang": localStorage.getItem("genie_roi_lang") || "ko",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
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
