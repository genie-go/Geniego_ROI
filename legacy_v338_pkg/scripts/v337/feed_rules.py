#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V335 Feed Rule Engine (minimal)

Goal:
- 채널별 필수 필드/제약 검증 (required, max_len, forbidden_words, images min_count)
- 일괄/선택 가격 조정, 할인, 쿠폰 설정을 "표준 스키마"에서 관리할 수 있게 함

NOTE:
- 본 엔진은 "설계/상품화 최소버전"입니다.
- 실제 채널 업로드 API는 채널별 커넥터에서 수행(향후 확장).
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple, Optional
import json, re, math, uuid
from datetime import datetime

def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

@dataclass
class ValidationIssue:
    severity: str   # ERROR/WARN
    code: str
    message: str
    field: str
    item_id: str

def load_rule_spec(rule_json: str | Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(rule_json, str):
        return json.loads(rule_json)
    return rule_json

def validate_items(items: List[Dict[str, Any]], channel: str, rule_spec: Dict[str, Any]) -> List[ValidationIssue]:
    ch = (rule_spec.get("channels") or {}).get(channel) or {}
    required = ch.get("required_fields") or []
    constraints = ch.get("constraints") or {}
    issues: List[ValidationIssue] = []

    for it in items:
        sku = str(it.get("sku") or it.get("item_id") or it.get("id") or "")
        if not sku:
            sku = f"unknown_{uuid.uuid4().hex[:8]}"
        # required fields
        for f in required:
            v = it.get(f)
            if v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, list) and len(v)==0):
                issues.append(ValidationIssue("ERROR", "REQUIRED_MISSING", f"필수 필드 누락: {f}", f, sku))

        # title constraints
        if "title" in constraints and it.get("title") is not None:
            t = str(it.get("title") or "")
            mx = int((constraints["title"] or {}).get("max_len") or 0)
            if mx and len(t) > mx:
                issues.append(ValidationIssue("ERROR", "TITLE_TOO_LONG", f"제목 길이 초과({len(t)}/{mx})", "title", sku))
            forb = (constraints["title"] or {}).get("forbidden_words") or []
            for w in forb:
                if w and w in t:
                    issues.append(ValidationIssue("WARN", "TITLE_FORBIDDEN_WORD", f"금지어 포함: {w}", "title", sku))

        # images constraints
        if "images" in constraints:
            imgs = it.get("images") or []
            minc = int((constraints["images"] or {}).get("min_count") or 0)
            if minc and (not isinstance(imgs, list) or len(imgs) < minc):
                issues.append(ValidationIssue("ERROR", "IMAGES_TOO_FEW", f"이미지 최소 {minc}개 필요", "images", sku))

        # price sanity
        if it.get("price") is not None:
            try:
                p = float(it.get("price"))
                if p <= 0:
                    issues.append(ValidationIssue("ERROR", "PRICE_NON_POSITIVE", "가격이 0 이하입니다", "price", sku))
            except Exception:
                issues.append(ValidationIssue("ERROR", "PRICE_NOT_NUMERIC", "가격이 숫자가 아닙니다", "price", sku))

    return issues

def _round_price(v: float, round_to: int) -> float:
    if round_to <= 1:
        return float(v)
    return float(round(v / round_to) * round_to)

def apply_price_adjustment(items: List[Dict[str, Any]], op: str, value: float, round_to: int=1,
                           selection_skus: Optional[List[str]]=None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    op:
      - "percent": price *= (1 + value/100)
      - "fixed": price += value
    selection_skus:
      - None => 전체 일괄
      - list => 선택 SKU만 적용
    """
    sel = set([str(x) for x in (selection_skus or [])]) if selection_skus else None
    changed = 0
    for it in items:
        sku = str(it.get("sku") or "")
        if sel is not None and sku not in sel:
            continue
        try:
            p = float(it.get("price") or 0)
        except Exception:
            continue
        if op == "percent":
            p2 = p * (1.0 + float(value)/100.0)
        elif op == "fixed":
            p2 = p + float(value)
        else:
            continue
        p2 = max(0.0, _round_price(p2, int(round_to)))
        it["price"] = p2
        changed += 1
    meta = {"op": op, "value": value, "round_to": round_to, "changed": changed, "selection": "ALL" if sel is None else len(sel)}
    return items, meta

def apply_discount(items: List[Dict[str, Any]], discount_type: str, value: float, unit: str="percent",
                   selection_skus: Optional[List[str]]=None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    discount_type:
      - "sale_price": compute sale_price field
    unit:
      - percent/fixed
    """
    sel = set([str(x) for x in (selection_skus or [])]) if selection_skus else None
    changed = 0
    for it in items:
        sku = str(it.get("sku") or "")
        if sel is not None and sku not in sel:
            continue
        try:
            p = float(it.get("price") or 0)
        except Exception:
            continue
        if discount_type == "sale_price":
            if unit == "percent":
                sp = p * (1.0 - float(value)/100.0)
            else:
                sp = p - float(value)
            it["sale_price"] = max(0.0, sp)
            changed += 1
    meta = {"type": discount_type, "value": value, "unit": unit, "changed": changed}
    return items, meta

def apply_coupon(items: List[Dict[str, Any]], coupon: Dict[str, Any], selection_skus: Optional[List[str]]=None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Store coupon definition into item-level field `coupons` (list).
    coupon keys example:
      - type: cart_coupon / item_coupon
      - value, unit, min_order, starts_ts, ends_ts
    """
    sel = set([str(x) for x in (selection_skus or [])]) if selection_skus else None
    changed = 0
    for it in items:
        sku = str(it.get("sku") or "")
        if sel is not None and sku not in sel:
            continue
        it.setdefault("coupons", [])
        it["coupons"].append(coupon)
        changed += 1
    return items, {"coupon": coupon, "changed": changed}

def issues_to_rows(issues: List[ValidationIssue]) -> List[Dict[str, Any]]:
    return [dict(severity=i.severity, code=i.code, message=i.message, field=i.field, item_id=i.item_id) for i in issues]
