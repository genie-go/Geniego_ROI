#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Slack/Teams notifier (V332)

Supports:
1) Incoming Webhook (simple)
2) Slack Web API chat.postMessage (threaded alerts + auto interpretation)

Env:
- GENIE_ROI_NOTIFY_ENABLED=1
- GENIE_ROI_SLACK_WEBHOOK_URL=...                    (optional)
- GENIE_ROI_TEAMS_WEBHOOK_URL=...                    (optional)
- GENIE_ROI_SLACK_BOT_TOKEN=xoxb-...                 (optional, enables threading)
- GENIE_ROI_SLACK_CHANNEL=#channel or C0123456789    (required with BOT_TOKEN)
"""
from __future__ import annotations
import json, os, urllib.request, urllib.parse
from typing import Any, Dict, Optional

from scripts.v333.slo_interpreter import interpret

def _post_json(url: str, payload: Dict[str, Any], *, headers: Optional[Dict[str,str]]=None) -> Dict[str,Any]:
    data = json.dumps(payload).encode("utf-8")
    hdr = {"Content-Type":"application/json"}
    if headers:
        hdr.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdr)
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read()
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {"ok": True, "raw": raw[:200].decode("utf-8", errors="ignore")}

def _slack_api_post(method: str, token: str, payload: Dict[str,Any]) -> Dict[str,Any]:
    url = f"https://slack.com/api/{method}"
    return _post_json(url, payload, headers={"Authorization": f"Bearer {token}"})

def _format_base_text(base: Dict[str,Any]) -> str:
    pid = base.get("project_id") or "-"
    title = base.get("title") or base.get("event")
    text = base.get("text") or ""
    return f"[{base['event']}] {pid} {title}\n{text}".strip()

def notify(event: str, *, project_id: Optional[str]=None, title: str="", text: str="", extra: Optional[Dict[str, Any]]=None) -> None:
    if os.getenv("GENIE_ROI_NOTIFY_ENABLED","0") != "1":
        return
    extra = extra or {}
    base = {
        "event": event,
        "project_id": project_id,
        "title": title or event,
        "text": text,
        "extra": extra,
    }

    slack_webhook = os.getenv("GENIE_ROI_SLACK_WEBHOOK_URL","").strip()
    teams_webhook = os.getenv("GENIE_ROI_TEAMS_WEBHOOK_URL","").strip()
    slack_token = os.getenv("GENIE_ROI_SLACK_BOT_TOKEN","").strip()
    slack_channel = os.getenv("GENIE_ROI_SLACK_CHANNEL","").strip()

    # ---------- Slack (preferred: Web API for threading) ----------
    thread_ts: Optional[str] = None
    if slack_token and slack_channel:
        try:
            r = _slack_api_post("chat.postMessage", slack_token, {
                "channel": slack_channel,
                "text": _format_base_text(base),
                "unfurl_links": False,
                "unfurl_media": False,
            })
            if r.get("ok") and r.get("ts"):
                thread_ts = r.get("ts")
        except Exception:
            thread_ts = None

        # attach auto interpretation as a thread reply (SLO / SmartStore scan)
        if thread_ts and event in ("slo_breach", "smartstore_missing_suspected"):
            try:
                payload = extra.copy()
                if event == "slo_breach" and "breaches" not in payload:
                    # try to parse from text
                    try:
                        payload.update(json.loads(text))
                    except Exception:
                        pass
                msg = interpret(event, payload)
                _slack_api_post("chat.postMessage", slack_token, {
                    "channel": slack_channel,
                    "thread_ts": thread_ts,
                    "text": msg,
                    "unfurl_links": False,
                    "unfurl_media": False,
                })
            except Exception:
                pass

    # fallback: webhook (no guaranteed threading)
    if slack_webhook and (not slack_token or not slack_channel):
        try:
            _post_json(slack_webhook, {"text": _format_base_text(base)})
        except Exception:
            pass
    elif slack_webhook and slack_token and slack_channel and (thread_ts is None):
        # if Web API failed, still send webhook so the alert is not lost
        try:
            _post_json(slack_webhook, {"text": _format_base_text(base)})
        except Exception:
            pass

    # ---------- Teams ----------
    if teams_webhook:
        try:
            _post_json(teams_webhook, {
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                "summary": base["title"],
                "themeColor": "2F5597",
                "title": f"{base['event']} · {base.get('project_id') or '-'}",
                "text": base.get("text") or "",
            })
        except Exception:
            pass
