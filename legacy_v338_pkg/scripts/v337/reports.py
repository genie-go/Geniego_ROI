#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V325 Reporting (deliver dashboards via email/webhook/file)

Config: project templates/v325/reports.json
{
  "enabled": true,
  "destinations": [
    {"type":"file","path":"out/reports"},
    {"type":"webhook","url":"https://...", "headers":{"Authorization":"Bearer ..."}},
    {"type":"email","to":["a@b.com"], "subject":"Daily ROI Report", "smtp":{...}}
  ]
}
SMTP can also be supplied via env:
  GENIE_ROI_SMTP_HOST, GENIE_ROI_SMTP_PORT, GENIE_ROI_SMTP_USER, GENIE_ROI_SMTP_PASS, GENIE_ROI_SMTP_FROM
"""
from __future__ import annotations
import json, pathlib, os, smtplib, ssl, urllib.request
from email.message import EmailMessage
from datetime import datetime
from typing import Dict, Any, List, Tuple

def utcnow() -> str:
    return datetime.utcnow().isoformat()+"Z"

def _load_reports_cfg(project_root: pathlib.Path) -> Dict[str, Any]:
    p = project_root/"templates"/"v325"/"reports.json"
    if not p.exists():
        return {"enabled": False, "destinations":[{"type":"file","path":"out/reports"}]}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"enabled": False, "destinations":[{"type":"file","path":"out/reports"}]}

def _read_dashboard(project_root: pathlib.Path) -> Dict[str, Any]:
    p = project_root/"out"/"dashboard_ads_kpi.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"error":"missing dashboard"}

def deliver_report(project_root: pathlib.Path, *, project_id: str) -> List[Dict[str, Any]]:
    cfg = _load_reports_cfg(project_root)
    if not cfg.get("enabled"):
        # still write to file for audit
        return [{"type":"disabled","ok":True}]
    data=_read_dashboard(project_root)
    results=[]
    for dest in (cfg.get("destinations") or []):
        t=(dest.get("type") or "file").lower()
        if t=="file":
            out_dir = project_root/(dest.get("path") or "out/reports")
            out_dir.mkdir(parents=True, exist_ok=True)
            fn = f"report_{project_id}_{datetime.utcnow().strftime('%Y%m%d')}.json"
            (out_dir/fn).write_text(json.dumps({"generated_at":utcnow(),"project_id":project_id,"dashboard":data}, ensure_ascii=False, indent=2), encoding="utf-8")
            results.append({"type":"file","ok":True,"path":str(out_dir/fn)})
        elif t=="webhook":
            url = dest.get("url")
            if not url:
                results.append({"type":"webhook","ok":False,"error":"missing url"}); continue
            payload=json.dumps({"project_id":project_id,"generated_at":utcnow(),"dashboard":data}).encode("utf-8")
            req=urllib.request.Request(url, data=payload, headers={"Content-Type":"application/json"})
            for k,v in (dest.get("headers") or {}).items():
                req.add_header(k, str(v))
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    results.append({"type":"webhook","ok":True,"status":resp.status})
            except Exception as e:
                results.append({"type":"webhook","ok":False,"error":str(e)})
        elif t=="email":
            tos=dest.get("to") or []
            if not tos:
                results.append({"type":"email","ok":False,"error":"missing to"}); continue
            subject=dest.get("subject") or f"[GENIE_ROI] Daily Report {project_id}"
            # SMTP config priority: dest.smtp > env
            smtp_cfg=dest.get("smtp") or {}
            host = smtp_cfg.get("host") or os.environ.get("GENIE_ROI_SMTP_HOST")
            port = int(smtp_cfg.get("port") or os.environ.get("GENIE_ROI_SMTP_PORT") or "587")
            user = smtp_cfg.get("user") or os.environ.get("GENIE_ROI_SMTP_USER")
            pw = smtp_cfg.get("pass") or os.environ.get("GENIE_ROI_SMTP_PASS")
            from_addr = smtp_cfg.get("from") or os.environ.get("GENIE_ROI_SMTP_FROM") or (user or "no-reply@example.com")
            if not host:
                results.append({"type":"email","ok":False,"error":"missing smtp host"}); continue
            msg=EmailMessage()
            msg["From"]=from_addr
            msg["To"]=", ".join(tos)
            msg["Subject"]=subject
            msg.set_content("Attached: dashboard_ads_kpi.json snapshot.\n")
            msg.add_attachment(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"), maintype="application", subtype="json", filename=f"{project_id}_dashboard.json")
            try:
                context=ssl.create_default_context()
                with smtplib.SMTP(host, port, timeout=25) as s:
                    s.starttls(context=context)
                    if user and pw:
                        s.login(user, pw)
                    s.send_message(msg)
                results.append({"type":"email","ok":True})
            except Exception as e:
                results.append({"type":"email","ok":False,"error":str(e)})
        else:
            results.append({"type":t,"ok":False,"error":"unknown destination type"})
    return results
