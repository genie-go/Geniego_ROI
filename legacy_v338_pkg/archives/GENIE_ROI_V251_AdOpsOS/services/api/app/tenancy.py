from fastapi import Header, HTTPException
def require_tenant(x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID")) -> str:
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="Missing X-Tenant-ID header")
    return x_tenant_id
