#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V324 Permissions (fine-grained)

V323: role-based (viewer/analyst/manager/admin)
V324: keeps roles but adds fine-grained permission checks for operations,
      plus "approver" capability for approval workflow.

Design:
- Roles map to permission sets (static defaults).
- Per-project overrides may be applied via templates/v324/permissions_override.json.
- API keys also carry a role, thus inherit role permissions.

This stays stdlib-only and is intended for intranet/controlled environments.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Set

DEFAULT_ROLE_PERMS: Dict[str, Set[str]] = {
    "viewer": {
        "dashboard:view",
        "diagnostics:view",
    },
    "analyst": {
        "dashboard:view",
        "diagnostics:view",
        "export:csv",
        "refresh:run",
        "audit:view",
    },
    "manager": {
        "dashboard:view",
        "diagnostics:view",
        "export:csv",
        "refresh:run",
        "audit:view",
        "data:upload",
        "template:edit",
        "api_key:manage",
        "connector:manage",
        "connector:run",
        "marketplace:manage",
        "marketplace:publish_request",
    },
    "admin": {
        "*",
    },
    # approval workflow: can approve/reject
    "approver": {
        "approve:action",
        "audit:view",
        "dashboard:view",
        "diagnostics:view",
    },
}

ROLE_ORDER = ["viewer","analyst","manager","approver","admin"]

def role_at_least(role: str, required: str) -> bool:
    """Legacy helper retained for compatibility; approver is treated like manager-ish."""
    try:
        return ROLE_ORDER.index(role) >= ROLE_ORDER.index(required)
    except ValueError:
        return False

def perms_for_role(role: str) -> Set[str]:
    return set(DEFAULT_ROLE_PERMS.get(role or "viewer", DEFAULT_ROLE_PERMS["viewer"]))

def has_perm(role: str, perm: str) -> bool:
    perms = perms_for_role(role)
    return ("*" in perms) or (perm in perms)

