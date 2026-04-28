#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENIE_ROI V330 First-Party Pixel + Server-side Events (SaaS-grade)

V330 upgrades:
- schema_version=2
- idempotency: event_id per event (UUID-ish)
- retry queue (localStorage) for temporary failures
- consent mode (CMP-lite): genie('consent', true/false) + built-in banner option
- compliance support: consent log endpoint + retention + deletion requests handled by OpsStore

Server endpoints (implemented in run_web_ui.py):
- GET  /p/<project>/pixel/p.js
- POST /p/<project>/pixel/e
- POST /p/<project>/pixel/s2s
- POST /p/<project>/api/compliance/consent
"""
from __future__ import annotations
import json, hashlib, time, os, textwrap
from typing import Any, Dict, Optional

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def normalize_email(email: str) -> str:
    return email.strip().lower()

def email_hash(email: str, *, salt: str="") -> str:
    return sha256_hex(salt + normalize_email(email))

def make_pixel_js(project_id: str, base_path: str, *, banner: bool=True) -> str:
    """
    base_path: '/p/<project_id>' prefix
    """
    # Keep JS dependency-free
    banner_js = ""
    if banner:
        banner_js = r"""
(function(){
  try {
    if (localStorage.getItem("genie_consent") !== null) return;
    var bar = document.createElement("div");
    bar.style.position="fixed"; bar.style.left="0"; bar.style.right="0"; bar.style.bottom="0";
    bar.style.padding="12px 14px"; bar.style.background="rgba(20,20,20,0.92)";
    bar.style.color="#fff"; bar.style.fontFamily="system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    bar.style.zIndex="99999"; bar.style.display="flex"; bar.style.gap="10px"; bar.style.alignItems="center";
    bar.innerHTML = '<div style="flex:1; font-size:13px; line-height:1.35;">이 사이트는 성능 측정을 위해 1st-party 이벤트를 수집합니다. 동의하시면 분석 정확도가 올라갑니다.</div>'
      + '<button id="genieConsentYes" style="padding:8px 10px;border-radius:10px;border:0;cursor:pointer;">동의</button>'
      + '<button id="genieConsentNo" style="padding:8px 10px;border-radius:10px;border:0;cursor:pointer;opacity:.9;">거부</button>';
    document.body.appendChild(bar);
    document.getElementById("genieConsentYes").onclick=function(){ window.genie && window.genie("consent", true); bar.remove(); };
    document.getElementById("genieConsentNo").onclick=function(){ window.genie && window.genie("consent", false); bar.remove(); };
  } catch(e){}
})();
"""

    js = f"""
/* GENIE_ROI Pixel v330 (schema_version=2) */
(function(w, d) {{
  var PROJECT = {json.dumps(project_id)};
  var BASE = {json.dumps(base_path)};
  var ENDPOINT = BASE + "/pixel/e";
  var CONSENT_EP = BASE + "/api/compliance/consent";
  var SCHEMA_VERSION = 2;

  function nowIso() {{
    return new Date().toISOString().replace(/\\.\\d{{3}}Z$/, "Z");
  }}
  function randId() {{
    // short UUID-ish
    return "e_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }}
  function getAnonId() {{
    try {{
      var k="genie_anonymous_id";
      var v=localStorage.getItem(k);
      if(!v){{ v="a_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16); localStorage.setItem(k,v); }}
      return v;
    }} catch(e) {{ return null; }}
  }}
  function getConsent() {{
    try {{
      var v = localStorage.getItem("genie_consent");
      if (v === null) return null;
      return v === "1";
    }} catch(e) {{ return null; }}
  }}
  function setConsent(val) {{
    try {{
      localStorage.setItem("genie_consent", val ? "1" : "0");
    }} catch(e) {{}}
    try {{
      fetch(CONSENT_EP, {{
        method:"POST",
        headers:{{"Content-Type":"application/json"}},
        body: JSON.stringify({{ ts: nowIso(), anonymous_id: getAnonId(), consent: !!val }})
      }}).catch(function(){{}});
    }} catch(e) {{}}
  }}

  function loadQueue() {{
    try {{
      return JSON.parse(localStorage.getItem("genie_q") || "[]");
    }} catch(e) {{ return []; }}
  }}
  function saveQueue(q) {{
    try {{ localStorage.setItem("genie_q", JSON.stringify(q.slice(-200))); }} catch(e) {{}}
  }}

  function send(payload) {{
    return fetch(ENDPOINT, {{
      method:"POST",
      headers:{{"Content-Type":"application/json"}},
      body: JSON.stringify(payload),
      keepalive: true
    }});
  }}

  function flush() {{
    var consent = getConsent();
    if (consent !== true) return;
    var q = loadQueue();
    if (!q.length) return;
    var head = q[0];
    send(head).then(function(res){{
      if(res && res.ok) {{
        q.shift();
        saveQueue(q);
        if(q.length) setTimeout(flush, 50);
      }}
    }}).catch(function(){{}});
  }}

  function track(name, props) {{
    var consent = getConsent();
    if (consent !== true) return;
    var payload = {{
      schema_version: SCHEMA_VERSION,
      event_id: randId(),
      ts: nowIso(),
      name: name,
      anonymous_id: getAnonId(),
      user_id: null,
      consent: true,
      props: props || {{}}
    }};
    var q = loadQueue();
    q.push(payload);
    saveQueue(q);
    flush();
  }}

  function identify(obj) {{
    // obj: {{ email, customer_id, user_id }}
    var consent = getConsent();
    if (consent !== true) return;
    var payload = {{
      schema_version: SCHEMA_VERSION,
      event_id: randId(),
      ts: nowIso(),
      name: "identify",
      anonymous_id: getAnonId(),
      user_id: (obj && (obj.user_id || obj.customer_id || obj.email_hash)) || null,
      consent: true,
      props: obj || {{}}
    }};
    var q = loadQueue(); q.push(payload); saveQueue(q); flush();
  }}

  w.genie = function(cmd, a, b) {{
    if (cmd === "track") return track(a, b);
    if (cmd === "identify") return identify(a || {{}});
    if (cmd === "consent") return setConsent(!!a);
    if (cmd === "flush") return flush();
  }};

  // auto: page_view
  try {{ w.genie("track", "page_view", {{ url: location.href, ref: document.referrer || "" }}); }} catch(e) {{}}

  // periodic flush
  setInterval(flush, 5000);

}})(window, document);

{banner_js}
"""
    return js

def s2s_require_api_key(headers: Dict[str,str], expected: str) -> bool:
    got = headers.get("X-API-Key") or headers.get("x-api-key") or ""
    return bool(expected) and (got == expected)
