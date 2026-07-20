# DSAR — Resource Scope 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Resource Scope(스펙 §16)는 Resource Type/ID/Pattern 단위 접근범위이며, 스펙은 "Wildcard는 정책으로 제한"을 명시한다. 기존 acl_permission이 메뉴 단위로 근접 — PARTIAL(메뉴만) 판정.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_DEFINITION`(Scope Type=RESOURCE_TYPE/RESOURCE_INSTANCE). Resource 단위(스펙 §16 원문): Resource Type · Resource ID · Resource Pattern.

## 3. 열거형 / 타입

Resource Unit: RESOURCE_TYPE · RESOURCE_ID · RESOURCE_PATTERN.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

**PARTIAL(메뉴 단위만)** —
- acl_permission menu×action(`TeamPermissions.php:39` ACTIONS 8종 · `:55-82` MENU_CATALOG 26종 · `:152-159` 스키마) — menu_key가 Resource Type/ID 근접.
- ★**field/row/column scope 부재**(field_scope|row_level|column_mask grep 0).
- Dataset/Document/API를 단위로 하는 별도 scope 부재 — menu_key가 근접이나 리소스타입 분류 체계 자체는 아님.

Wildcard(스펙 §16 "정책으로 제한") 인접 사례 — **오분류 주의**: api_key `write:*`(`UserAuth.php:4307` · 강제 `index.php:589`)는 **PROGRAMMATIC_SCOPE**(ADR D-1) wildcard이지 Resource Scope의 Resource Pattern wildcard가 아니다. Resource Scope 자체에는 wildcard/pattern 매칭 substrate 없음(grep 0).

## 5. 설계 원칙

- ADR D-1: acl_permission menu_key를 **RESOURCE_SCOPE(메뉴 단위) 확장** substrate로 흡수 — field/row/dataset scope 신설의 토대로만 사용, 신규 병렬 리소스 테이블 금지.
- 스펙 §16 "Wildcard는 정책으로 제한" — 신설 시 api_key `write:*`류 무제한 wildcard 패턴을 Resource Scope에 그대로 이식 금지, 명시적 정책 화이트리스트로 제한.
- Resource Scope(메뉴)과 Dataset Scope(§17)/Document Scope(§18)는 분리된 Scope Type — menu_key 하나로 3개 계층을 겸용 설계 금지.

## 6. Gap / BLOCKED_PREREQUISITE

RESOURCE_TYPE/ID는 메뉴 단위로만 PARTIAL, RESOURCE_PATTERN(wildcard 정책제한)은 substrate 없음(순신규). field/row/column 단위 접근제어 완전 부재(ABSENT)는 §17 Dataset Scope와 경계가 겹치므로 별도 Part에서 재확인 필요. BLOCKED_PREREQUISITE: RP-002.
