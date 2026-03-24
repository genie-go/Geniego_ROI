#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENIE_ROI V328 First-Party Pixel + Server-side Events

What this provides (stdlib-only)
- /pixel/p.js : browser pixel script (first-party cookie + event queue)
- /pixel/e    : browser event ingest (POST)
- /pixel/s2s  : server-to-server event ingest (POST) with X-API-Key
- identity graph stitching (anonymous_id <-> stable ids like email_hash)

This is a pragmatic baseline for "Triple Whale style" 1P data capture.
For production you should also add:
- Consent mode / CMP integration
- PII hashing policy (SHA256 lower(trim(email)))
- Data retention policy + GDPR/CCPA workflows
"""
from __future__ import annotations
import json, hashlib, time, urllib.parse, os
from typing import Any, Dict, Optional, Tuple
from http import cookies

def sha256_hex(s: str, salt: str="") -> str:
    raw = (salt + s).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def _parse_cookies(cookie_header: str|None) -> Dict[str,str]:
    if not cookie_header: return {}
    c=cookies.SimpleCookie()
    c.load(cookie_header)
    return {k: morsel.value for k,morsel in c.items()}

def get_or_set_anonymous_id(headers: Dict[str,str], set_cookie_cb, cookie_name: str="_genie_fp") -> str:
    c=_parse_cookies(headers.get("Cookie"))
    if cookie_name in c and c[cookie_name]:
        return c[cookie_name]
    # generate deterministic-ish id
    aid = sha256_hex(f"{time.time()}:{headers.get('User-Agent','')}:{headers.get('X-Forwarded-For','')}" )[:24]
    set_cookie_cb(cookie_name, aid, max_age=60*60*24*365)
    return aid

def make_pixel_js(project_id: str, endpoint: str="/pixel/e", cookie_name: str="_genie_fp") -> str:
    """
    First-party pixel JS (no external deps)
    - Consent Mode (CMP-lite): genie_consent cookie (1=accept, 0=deny)
    - Schema versioning: schema_version=2
    - Idempotency: event_id UUID per event (client-side)
    - Re-try & queue: localStorage queue flush with sendBeacon/fetch
    """
    js = f"""
(function(){{
  var PID = {json.dumps(project_id)};
  var ENDPOINT = {json.dumps(endpoint)};
  var COOKIE = {json.dumps(cookie_name)};
  var CONSENT_COOKIE = 'genie_consent';
  var SCHEMA = 2;
  var QUEUE_KEY = 'genie_q_v2_' + PID;
  var SENT_KEY = 'genie_sent_v2_' + PID;

  function getCookie(name){{
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }}
  function setCookie(name, value, days){{
    var d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; expires=' + d.toUTCString() + '; SameSite=Lax';
  }}
  function uuid(){{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){{
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }});
  }}
  function ensureAnon(){{
    var id = getCookie(COOKIE);
    if(!id){{ id = uuid(); setCookie(COOKIE, id, 365); }}
    return id;
  }}
  function consent(){{
    var v = getCookie(CONSENT_COOKIE);
    if(v === '1') return true;
    if(v === '0') return false;
    return null; // unknown
  }}
  function showConsentBanner(){{
    if(consent() !== null) return;
    var el = document.createElement('div');
    el.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;background:#111;color:#fff;padding:14px 14px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.25);font-family:system-ui;line-height:1.35;max-width:920px;margin:0 auto;';
    el.innerHTML = '<div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;">'
      + '<div style="min-width:260px;max-width:640px;">'
      + '<div style="font-weight:700;margin-bottom:6px;">쿠키/분석 수집 동의</div>'
      + '<div style="opacity:.9;font-size:13px;">이 사이트는 성과 분석(퍼스트파티 픽셀)을 위해 쿠키/이벤트를 수집합니다. 동의하시면 더 정확한 성과 측정이 가능합니다.</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center;">'
      + '<button id="genie_cmp_deny" style="border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;padding:9px 12px;border-radius:10px;cursor:pointer;">거부</button>'
      + '<button id="genie_cmp_ok" style="border:0;background:#fff;color:#111;padding:9px 12px;border-radius:10px;cursor:pointer;font-weight:700;">동의</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
    document.getElementById('genie_cmp_ok').onclick=function(){{ setCookie(CONSENT_COOKIE,'1',365); try{{send('consent_granted',{{}} , true);}}catch(e){{}} el.remove(); flush(); }};
    document.getElementById('genie_cmp_deny').onclick=function(){{ setCookie(CONSENT_COOKIE,'0',365); el.remove(); }};
  }}

  function getJSON(key, fallback){{
    try{{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : (fallback||null); }}catch(e){{ return (fallback||null); }}
  }}
  function setJSON(key, value){{
    try{{ localStorage.setItem(key, JSON.stringify(value)); }}catch(e){{}}
  }}
  function rememberSent(event_id){{
    var arr = getJSON(SENT_KEY, []) || [];
    arr.push(event_id);
    if(arr.length > 200) arr = arr.slice(arr.length-200);
    setJSON(SENT_KEY, arr);
  }}
  function alreadySent(event_id){{
    var arr = getJSON(SENT_KEY, []) || [];
    return arr.indexOf(event_id) >= 0;
  }}

  function enqueue(payload){{
    var q = getJSON(QUEUE_KEY, []) || [];
    q.push(payload);
    if(q.length > 500) q = q.slice(q.length-500);
    setJSON(QUEUE_KEY, q);
  }}
  function dequeueAll(){{
    var q = getJSON(QUEUE_KEY, []) || [];
    setJSON(QUEUE_KEY, []);
    return q;
  }}

  function post(payload){{
    var ok = false;
    try{{
      ok = navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], {{type:'application/json'}}));
    }}catch(e){{ ok = false; }}
    if(ok) return true;
    try{{
      fetch(ENDPOINT, {{
        method:'POST',
        headers: {{'Content-Type':'application/json'}},
        keepalive:true,
        body: JSON.stringify(payload)
      }}).catch(function(){{}});
      return true; // assume queued by browser
    }}catch(e){{ return false; }}
  }}

  function send(eventName, props, force){{
    props = props || {{}};
    var c = consent();
    if(!force && c !== true) return; // only send if consent granted
    var eid = uuid();
    if(alreadySent(eid)) return;
    var payload = {{
      schema_version: SCHEMA,
      event_id: eid,
      project_id: PID,
      source: 'browser',
      anonymous_id: ensureAnon(),
      event_name: eventName,
      event_ts_ms: Date.now(),
      page: {{
        url: location.href,
        referrer: document.referrer || null,
        title: document.title || null
      }},
      props: props
    }};
    // optimistic send; also enqueue for replay safety
    enqueue(payload);
    post(payload);
    rememberSent(eid);
  }}

  function flush(){{
    var c = consent();
    if(c !== true) return;
    var q = dequeueAll();
    if(!q || !q.length) return;
    for(var i=0;i<q.length;i++){{ post(q[i]); }}
  }}

  window.genie = window.genie || function(cmd, a, b){{
    if(cmd === 'event') return send(a, b, false);
    if(cmd === 'identify') {{
      // a: {email, email_hash, phone_hash, customer_id}
      return send('identify', a || {{}}, false);
    }}
    if(cmd === 'consent') {{
      // a: true/false
      setCookie(CONSENT_COOKIE, a ? '1' : '0', 365);
      if(a){{ flush(); }}
      return;
    }}
  }};

  // show CMP-lite banner if unknown
  if(document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', function(){{ showConsentBanner(); }});
  }} else {{
    showConsentBanner();
  }}

  // auto page_view only if consent granted (or after consent flush)
  try{{ send('page_view', {{}}, false); }}catch(e){{}}
  setInterval(function(){{ try{{ flush(); }}catch(e){{}} }}, 5000);
}})();
"""
    return js.strip()+"\n"

def normalize_identity_payload(payload: Dict[str,Any]) -> Dict[str,str]:
    """
    Expected identify props:
      email (plain) or email_hash, phone_hash, customer_id
    We will hash email if provided.
    """
    salt = os.environ.get("GENIE_ID_SALT", "")
    out={}
    if isinstance(payload.get("email"), str) and payload["email"].strip():
        out["email_hash"]=sha256_hex(payload["email"].strip().lower(), salt=salt)
    if isinstance(payload.get("email_hash"), str) and payload["email_hash"]:
        out["email_hash"]=payload["email_hash"]
    if isinstance(payload.get("customer_id"), str) and payload["customer_id"]:
        out["customer_id"]=payload["customer_id"]
    if isinstance(payload.get("phone_hash"), str) and payload["phone_hash"]:
        out["phone_hash"]=payload["phone_hash"]
    return out
