#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V325 Central Template Distribution

Agency(대행사) 운영을 위해 고객사 프로젝트별 템플릿(매핑/룰/환율/커넥터 설정)을
중앙(agency-wide)에서 버전 관리하고 각 프로젝트로 배포(Deploy)할 수 있는 모듈.

- Stored under <workspace>/data/central_templates/
  - index.json : catalog + active versions
  - versions/<template_name>/<version>.json : payload
"""
from __future__ import annotations
import json, pathlib, shutil
from datetime import datetime
from typing import Dict, Any, Optional, List

def utcnow() -> str:
    return datetime.utcnow().isoformat() + "Z"

class CentralTemplates:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.root = workspace/"data"/"central_templates"
        self.versions_dir = self.root/"versions"
        self.root.mkdir(parents=True, exist_ok=True)
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.root/"index.json"
        if not self.index_path.exists():
            self.index_path.write_text(json.dumps({"version":1,"templates":{}}, ensure_ascii=False, indent=2), encoding="utf-8")
        self._load()

    def _load(self):
        try:
            self.index = json.loads(self.index_path.read_text(encoding="utf-8"))
        except Exception:
            self.index = {"version":1,"templates":{}}

    def _save(self):
        self.index_path.write_text(json.dumps(self.index, ensure_ascii=False, indent=2), encoding="utf-8")

    def list_templates(self) -> List[Dict[str, Any]]:
        self._load()
        out=[]
        for name, meta in sorted((self.index.get("templates") or {}).items()):
            out.append({
                "name": name,
                "active_version": meta.get("active_version"),
                "versions": sorted(list((meta.get("versions") or {}).keys())),
                "updated_at": meta.get("updated_at"),
            })
        return out

    def get_version_payload(self, name: str, version: str) -> Optional[Dict[str, Any]]:
        p = self.versions_dir/name/f"{version}.json"
        if not p.exists(): return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None

    def create_version(self, name: str, payload: Dict[str, Any], *, set_active: bool = False) -> Dict[str, Any]:
        self._load()
        tdir = self.versions_dir/name
        tdir.mkdir(parents=True, exist_ok=True)
        version = payload.get("_version") or datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        payload["_version"]=version
        payload["_name"]=name
        (tdir/f"{version}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        meta = (self.index.get("templates") or {}).get(name) or {"versions":{}}
        meta["versions"][version] = {"created_at": utcnow()}
        meta["updated_at"] = utcnow()
        if set_active or not meta.get("active_version"):
            meta["active_version"]=version
        self.index.setdefault("templates",{})[name]=meta
        self._save()
        return {"name":name,"version":version,"active_version":meta.get("active_version")}

    def set_active(self, name: str, version: str):
        self._load()
        meta = (self.index.get("templates") or {}).get(name)
        if not meta or version not in (meta.get("versions") or {}):
            raise ValueError("version not found")
        meta["active_version"]=version
        meta["updated_at"]=utcnow()
        self.index["templates"][name]=meta
        self._save()

    def export_active_bundle(self) -> Dict[str, Any]:
        """Return dict: {template_name: payload} using active versions."""
        self._load()
        bundle={}
        for name, meta in (self.index.get("templates") or {}).items():
            v = meta.get("active_version")
            if not v: 
                continue
            payload = self.get_version_payload(name, v)
            if payload is not None:
                bundle[name]=payload
        return bundle

    def deploy_to_project(self, project_root: pathlib.Path, *, template_subdir: str = "templates/v325", overwrite: bool = True) -> List[str]:
        """Deploy active central bundle into a project's templates directory."""
        deployed=[]
        bundle = self.export_active_bundle()
        tdir = project_root/template_subdir
        tdir.mkdir(parents=True, exist_ok=True)
        # Map template names to filenames
        name_to_file = {
            "channel_mappers": "channel_mappers.json",
            "custom_mappers": "custom_mappers.json",
            "fx_rates": "fx_rates.json",
            "default_settings": "default_settings.json",
            "default_attribution": "default_attribution.json",
            "connectors": "connectors.json",
            "reports": "reports.json",
            "marketplace": "marketplace.json",
        }
        for name, payload in bundle.items():
            fn = name_to_file.get(name)
            if not fn: 
                continue
            outp = tdir/fn
            if outp.exists() and (not overwrite):
                continue
            outp.write_text(json.dumps(payload.get("data", payload), ensure_ascii=False, indent=2), encoding="utf-8")
            deployed.append(fn)
        return deployed
