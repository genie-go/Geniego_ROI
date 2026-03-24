from __future__ import annotations
from fastapi import Header, HTTPException
from typing import Tuple

ROLE_PERMS = {
    "admin": {"execute","approve","view","manage"},
    "operator": {"execute","approve","view"},
    "viewer": {"view"},
}

def get_ctx(
    x_tenant_id: str = Header("demo"),
    x_role: str = Header("operator"),
) -> Tuple[str, str]:
    tenant = (x_tenant_id or "demo").strip()
    role = (x_role or "viewer").strip().lower()
    if role not in ROLE_PERMS:
        raise HTTPException(status_code=401, detail="Unknown role")
    return tenant, role

def require(role: str, action: str):
    if action not in ROLE_PERMS.get(role, set()):
        raise HTTPException(status_code=403, detail="Permission denied")
