from fastapi import HTTPException

ROLE_PERMISSIONS = {
    "admin": ["execute", "approve", "view"],
    "operator": ["execute", "view"],
    "viewer": ["view"],
}

def check_permission(role: str, action: str):
    if action not in ROLE_PERMISSIONS.get(role, []):
        raise HTTPException(status_code=403, detail="Permission denied")
