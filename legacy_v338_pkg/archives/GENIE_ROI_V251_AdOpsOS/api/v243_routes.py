from __future__ import annotations

import time, uuid, json
from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Dict, Any

from infra.database import init_db, get_conn
from infra.rbac import check_permission

router = APIRouter(prefix="/v243", tags=["v243"])
init_db()

class ApprovalRequest(BaseModel):
    job_type: str
    payload: Dict[str, Any]

@router.post("/approve")
def approve(req: ApprovalRequest, x_role: str = Header("operator")):
    check_permission(x_role, "approve")
    conn = get_conn()
    job_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO approvals VALUES (?, ?, ?, ?, ?)",
        (job_id, req.job_type, json.dumps(req.payload), "APPROVED", time.time()),
    )
    conn.commit()
    conn.close()
    return {"approved": True, "job_id": job_id}

@router.get("/audit")
def audit_logs(x_role: str = Header("viewer")):
    check_permission(x_role, "view")
    conn = get_conn()
    rows = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"logs": [dict(r) for r in rows]}
