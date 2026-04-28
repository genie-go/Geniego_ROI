#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Slack/Teams notifier via incoming webhooks.

Env:
- GENIE_ROI_NOTIFY_ENABLED=1
- GENIE_ROI_SLACK_WEBHOOK_URL=...
- GENIE_ROI_TEAMS_WEBHOOK_URL=...
"""
from __future__ import annotations
import json, os, urllib.request
from typing import Any, Dict, Optional

def _post_json(url: str, payload: Dict[str, Any]) -> None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()

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
    slack = os.getenv("GENIE_ROI_SLACK_WEBHOOK_URL","").strip()
    teams = os.getenv("GENIE_ROI_TEAMS_WEBHOOK_URL","").strip()

    if slack:
        payload = {"text": f"[{base['event']}] {base.get('project_id') or '-'} {base.get('title')}\n{base.get('text')}"}
        try: _post_json(slack, payload)
        except Exception: pass

    if teams:
        payload = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": base["title"],
            "themeColor": "2F5597",
            "title": f"{base['event']} · {base.get('project_id') or '-'}",
            "text": base.get("text") or "",
        }
        try: _post_json(teams, payload)
        except Exception: pass
