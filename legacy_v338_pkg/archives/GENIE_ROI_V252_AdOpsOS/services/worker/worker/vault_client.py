import httpx
from typing import Optional, Dict, Any
from .config import settings

async def _vault_token() -> Optional[str]:
    if settings.vault_token:
        return settings.vault_token
    if settings.vault_addr and settings.vault_role_id and settings.vault_secret_id:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{settings.vault_addr.rstrip('/')}/v1/auth/approle/login",
                                  json={"role_id": settings.vault_role_id, "secret_id": settings.vault_secret_id})
            r.raise_for_status()
            return r.json()["auth"]["client_token"]
    return None

async def vault_get(path: str) -> Dict[str, Any] | None:
    if not settings.vault_addr:
        return None
    tok = await _vault_token()
    if not tok:
        return None
    headers = {"X-Vault-Token": tok}
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{settings.vault_addr.rstrip('/')}/v1/{path.lstrip('/')}", headers=headers)
        if r.status_code >= 400:
            return None
        return r.json()

async def vault_put(path: str, data: Dict[str, Any]) -> bool:
    if not settings.vault_addr:
        return False
    tok = await _vault_token()
    if not tok:
        return False
    headers = {"X-Vault-Token": tok}
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{settings.vault_addr.rstrip('/')}/v1/{path.lstrip('/')}", headers=headers, json={"data": data})
        return r.status_code < 300
