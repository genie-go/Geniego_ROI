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
import json, hashlib, time, urllib.parse
from typing import Any, Dict, Optional, Tuple
from http import cookies

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

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
    # vanilla JS pixel (no dependencies)
    # sends: page_view automatically, plus genie('event', name, props)
    js = f"""
;(function() {{
  var PID = {json.dumps(project_id)};
  var ENDPOINT = {json.dumps(endpoint)};
  var COOKIE = {json.dumps(cookie_name)};

  function getCookie(name) {{
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }}
  function setCookie(name, value, days) {{
    var d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; expires=' + d.toUTCString() + '; SameSite=Lax';
  }}
  function uuid() {{
    // simple uuid-ish (not crypto)
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {{
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }});
  }}

  function ensureAnon() {{
    var id = getCookie(COOKIE);
    if (!id) {{
      id = uuid();
      setCookie(COOKIE, id, 365);
    }}
    return id;
  }}

  function send(eventName, props) {{
    props = props || {{}};
    var payload = {{
      project_id: PID,
      anonymous_id: ensureAnon(),
      event_name: eventName,
      ts_ms: Date.now(),
      page: {{
        url: location.href,
        referrer: document.referrer || null,
        title: document.title || null
      }},
      props: props
    }};
    try {{
      navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], {{type:'application/json'}}));
    }} catch(e) {{
      fetch(ENDPOINT, {{
        method:'POST',
        headers: {{'Content-Type':'application/json'}},
        keepalive:true,
        body: JSON.stringify(payload)
      }}).catch(function(){{}});
    }}
  }}

  window.genie = window.genie || function(cmd, a, b) {{
    if (cmd === 'event') return send(a, b);
    if (cmd === 'identify') {{
      // a: {email, phone, customer_id}
      var id = ensureAnon();
      send('identify', a || {{}});
    }}
  }};

  // auto page_view
  send('page_view', {{}});
}})();
"""
    return js.strip()+"\n"

def normalize_identity_payload(payload: Dict[str,Any]) -> Dict[str,str]:
    """
    Expected identify props:
      email (plain) or email_hash, phone_hash, customer_id
    We will hash email if provided.
    """
    out={}
    if isinstance(payload.get("email"), str) and payload["email"].strip():
        out["email_hash"]=sha256_hex(payload["email"].strip().lower())
    if isinstance(payload.get("email_hash"), str) and payload["email_hash"]:
        out["email_hash"]=payload["email_hash"]
    if isinstance(payload.get("customer_id"), str) and payload["customer_id"]:
        out["customer_id"]=payload["customer_id"]
    if isinstance(payload.get("phone_hash"), str) and payload["phone_hash"]:
        out["phone_hash"]=payload["phone_hash"]
    return out
