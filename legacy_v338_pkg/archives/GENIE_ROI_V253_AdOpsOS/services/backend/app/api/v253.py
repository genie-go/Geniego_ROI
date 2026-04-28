from __future__ import annotations
import os, time, json, random, datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.core.security import get_ctx, require
from app.workflows.pipeline import run_pipeline
from app.reports import write_report, read_latest, read_report_html
from app.ai.pricing_simulation import PricingInputs, simulate

router = APIRouter(prefix="/v253", tags=["v253"])

# --- Simple in-process event stream buffer (for demo). For prod: Redis pubsub / Kafka -> websocket gateway.
_EVENT_LOG: Dict[str, list[str]] = {}

def _push(tenant: str, msg: str):
    arr = _EVENT_LOG.setdefault(tenant, [])
    arr.append(msg)
    if len(arr) > 200:
        del arr[:-200]

@router.get("/ui", response_class=HTMLResponse)
def ui():
    # Served by StaticFiles mount in app.main; this is a convenience redirect.
    return HTMLResponse('<meta http-equiv="refresh" content="0; url=/ui/index.html" />')

@router.get("/metrics/summary")
def metrics_summary(ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    # Demo metrics; replace with DB aggregation in production
    # generate consistent synthetic 14-day series
    days = [(datetime.date.today() - datetime.timedelta(days=i)).isoformat() for i in range(13,-1,-1)]
    spend = [180 + i*5 + random.uniform(-8, 8) for i in range(14)]
    roas = [1.45 + random.uniform(-0.08, 0.10) for _ in range(14)]
    revenue = [spend[i]*roas[i] for i in range(14)]
    approvals_7d = random.randint(5, 40)
    return {
        "tenant_id": tenant,
        "runtime": {"AUTO_EXECUTE": os.getenv("AUTO_EXECUTE","false"), "DRY_RUN": os.getenv("DRY_RUN","true")},
        "kpi": {"spend": float(spend[-1]), "revenue": float(revenue[-1]), "roas": float(roas[-1]), "approvals_7d": approvals_7d},
        "trends": {"days": days, "spend": spend, "roas": roas},
    }

@router.get("/stream/events")
def stream_events(tenant_id: str = Query("demo")):
    def gen():
        last = 0
        while True:
            arr = _EVENT_LOG.get(tenant_id, [])
            while last < len(arr):
                yield f"data: {arr[last]}\n\n"
                last += 1
            # keep-alive ping
            yield f"data: ping {time.time()}\n\n"
            time.sleep(2.0)
    return StreamingResponse(gen(), media_type="text/event-stream")

@router.post("/workflows/run")
def workflows_run(body: Dict[str, Any] | None = None, ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "execute")
    _push(tenant, f"[{time.strftime('%H:%M:%S')}] pipeline:start")
    res = run_pipeline(tenant_id=tenant)
    payload = {"report_id": res.report_id, "summary": res.summary, "artifacts": res.artifacts}
    write_report(tenant, res.report_id, payload)
    _push(tenant, f"[{time.strftime('%H:%M:%S')}] pipeline:report_created {res.report_id}")
    _push(tenant, f"[{time.strftime('%H:%M:%S')}] pipeline:done")
    return {"ok": True, "report_id": res.report_id}

@router.get("/reports/latest")
def reports_latest(ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    return read_latest(tenant)

@router.get("/reports/{report_id}", response_class=HTMLResponse)
def reports_get(report_id: str, ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    html = read_report_html(tenant, report_id)
    if html is None:
        return HTMLResponse("Report not found", status_code=404)
    return HTMLResponse(html)

@router.post("/pricing/simulate")
def pricing_simulate(body: Dict[str, Any], ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    inputs = PricingInputs(
        arpa=float(body.get("arpa", 399)),
        monthly_churn=float(body.get("monthly_churn", 0.03)),
        cac=float(body.get("cac", 1200)),
        nrr=float(body.get("nrr", 1.15)),
        customers0=int(body.get("customers0", 50)),
        months=int(body.get("months", 24)),
    )
    return simulate(inputs)
