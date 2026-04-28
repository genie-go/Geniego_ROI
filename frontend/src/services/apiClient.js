const base = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/* ── 데모 모드 감지 ── */
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const TOKEN_KEY = IS_DEMO ? "demo_genie_token" : "genie_token";

export async function getJson(path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}


function defaultHeaders() {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem("accessToken") || "";
  const h = {
    "Content-Type": "application/json",
    "X-Tenant-ID": IS_DEMO ? "demo" : (localStorage.getItem("tenantId") || ""),
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}



export async function postJson(path, body) {
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
      try { detail = await res.text(); } catch {}
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
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}


export async function putText(path, rawBody) {
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
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}

export async function putJson(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return await res.json();
}


export async function postJsonAuth(path, body, extraHeaders = {}) {
  return requestJsonAuth(path, "POST", body, extraHeaders);
}

export async function requestJsonAuth(path, method, body, extraHeaders = {}) {
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
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  const txt = await res.text();
  if (!txt) return {};
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

export async function getJsonAuthWithHeaders(path, extraHeaders = {}) {
  const res = await fetch(`${base}${path}`, { headers: { ...defaultHeaders(), ...extraHeaders } });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  return res.json();
}



export async function postFileAuth(path, file, extraFields = {}, extraHeaders = {}) {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(extraFields || {}).forEach(([k,v]) => fd.append(k, String(v)));
  const headers = { ...defaultHeaders(), ...extraHeaders };
  // Let browser set multipart boundary; remove JSON content-type
  delete headers["Content-Type"];
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? JSON.stringify(j.detail) : JSON.stringify(j);
    } catch (e) {
      try { detail = await res.text(); } catch {}
    }
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
  const txt = await res.text();
  if (!txt) return {};
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}
