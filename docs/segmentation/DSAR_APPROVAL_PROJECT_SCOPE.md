# DSAR — Project Scope 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Project Scope(스펙 §15)는 Project/Program/Portfolio 단위 접근범위다. 기존 PM 모듈이 근접하나 **data_scope와 완전 미연동**된 별개 체계 — PARTIAL(별개체계) 판정.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_DEFINITION`(Scope Type=PROJECT). Project 단위(스펙 §15 원문): Project · Program · Portfolio.

## 3. 열거형 / 타입

Project Unit: PROJECT · PROGRAM · PORTFOLIO.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

**PARTIAL(별개체계)** —
- PM 모듈 pm_projects, tenant 격리만(`PM/Projects.php:30-143`).
- Portfolio 개념 = `PM/Enterprise.php`.
- ★게이트는 role rank만(`PM/Shared.php:59-89`) — **data_scope/effectiveScope 호출 grep 0** = PM 프로젝트 접근제어가 Scope 계층과 완전 분리된 독립 판정 로직.

## 5. 설계 원칙

- ADR §3 경계 보존: "PM project는 별개 체계로 Canonical Scope Type으로 흡수하되 오분류 금지."
- Project Scope 신설 시 PM 기존 role-rank 게이트(`PM/Shared.php:59-89`)를 대체하지 않고 **data_scope PROJECT 차원으로 연동**하는 Adapter를 설계(신규 병렬 프로젝트 접근제어 신설 금지).
- Program/Portfolio는 substrate 전무 — Project(pm_projects)만 근접, 나머지 2단위는 순신규.

## 6. Gap / BLOCKED_PREREQUISITE

PROJECT 단위만 PARTIAL(별개체계·미연동), PROGRAM/PORTFOLIO는 substrate 없음(순신규). data_scope↔PM 연동 자체가 Gap(현재 PM 게이트는 role rank 전용). BLOCKED_PREREQUISITE: RP-002 — PM 연동은 Permission Engine·Role Assignment 실구현 후 설계 재검토 대상.
