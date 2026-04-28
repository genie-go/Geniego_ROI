#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V325 Organization (Teams/Groups) and Permission Inheritance

- Stored in <workspace>/data/org.json
- Supports:
  - teams: {team_id: {name, parent_team_id}}
  - memberships: {username: [team_id,...]}
  - team_project_roles: {team_id: {project_id: role}}
  - team_project_perms: {team_id: {project_id: [perm,...]}}  # optional fine-grained
"""
from __future__ import annotations
import json, pathlib, re
from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Tuple

def utcnow() -> str:
    return datetime.utcnow().isoformat() + "Z"

ROLE_ORDER = {"viewer":0,"analyst":1,"manager":2,"admin":3}

def role_max(a: str, b: str) -> str:
    return a if ROLE_ORDER.get(a,0) >= ROLE_ORDER.get(b,0) else b

class OrgStore:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.path = workspace/"data"/"org.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text(json.dumps({
                "version":1,
                "teams":{
                    "root":{"name":"Agency Root","parent":None,"created_at":utcnow()}
                },
                "memberships":{},
                "team_project_roles":{},
                "team_project_perms":{}
            }, ensure_ascii=False, indent=2), encoding="utf-8")
        self._load()

    def _load(self):
        try:
            self.data = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            self.data={"version":1,"teams":{},"memberships":{},"team_project_roles":{},"team_project_perms":{}}

    def _save(self):
        self.path.write_text(json.dumps(self.data, ensure_ascii=False, indent=2), encoding="utf-8")

    def list_teams(self) -> List[Dict[str, Any]]:
        self._load()
        out=[]
        for tid, rec in sorted((self.data.get("teams") or {}).items()):
            out.append({"team_id":tid,"name":rec.get("name"),"parent":rec.get("parent")})
        return out

    def upsert_team(self, team_id: str, name: str, parent: Optional[str]="root"):
        self._load()
        tid=(team_id or "").strip()
        if not tid or not re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,60}$", tid):
            raise ValueError("invalid team_id")
        if parent and parent not in (self.data.get("teams") or {}):
            raise ValueError("parent not found")
        self.data.setdefault("teams",{})[tid]={"name":name or tid,"parent":parent,"updated_at":utcnow()}
        self._save()

    def set_membership(self, username: str, teams: List[str]):
        self._load()
        for t in teams:
            if t not in (self.data.get("teams") or {}):
                raise ValueError(f"team not found: {t}")
        self.data.setdefault("memberships",{})[(username or "").strip()] = list(sorted(set(teams)))
        self._save()

    def set_team_project_role(self, team_id: str, project_id: str, role: str):
        self._load()
        if team_id not in (self.data.get("teams") or {}):
            raise ValueError("team not found")
        self.data.setdefault("team_project_roles",{}).setdefault(team_id,{})[project_id]=role
        self._save()

    def add_team_project_perm(self, team_id: str, project_id: str, perm: str):
        self._load()
        self.data.setdefault("team_project_perms",{}).setdefault(team_id,{}).setdefault(project_id,[])
        perms=set(self.data["team_project_perms"][team_id][project_id])
        perms.add(perm)
        self.data["team_project_perms"][team_id][project_id]=sorted(perms)
        self._save()

    def _ancestors(self, team_id: str) -> List[str]:
        self._load()
        teams=self.data.get("teams") or {}
        out=[]
        cur=team_id
        seen=set()
        while cur and cur in teams and cur not in seen:
            seen.add(cur)
            out.append(cur)
            cur = teams[cur].get("parent")
        return out

    def effective_role_for_user(self, username: str, project_id: str) -> Optional[str]:
        """Compute role inherited from teams. Return highest role among teams."""
        self._load()
        u=(username or "").strip()
        member_teams = (self.data.get("memberships") or {}).get(u) or []
        best=None
        roles_by_team=self.data.get("team_project_roles") or {}
        for t in member_teams:
            for anc in self._ancestors(t):
                r = ((roles_by_team.get(anc) or {}).get(project_id))
                if r:
                    best = r if best is None else role_max(best, r)
        return best

    def effective_perms_for_user(self, username: str, project_id: str) -> Set[str]:
        """Aggregate fine-grained permissions from all teams (including ancestors)."""
        self._load()
        u=(username or "").strip()
        member_teams = (self.data.get("memberships") or {}).get(u) or []
        out=set()
        per=self.data.get("team_project_perms") or {}
        for t in member_teams:
            for anc in self._ancestors(t):
                out.update((per.get(anc) or {}).get(project_id) or [])
        return out
