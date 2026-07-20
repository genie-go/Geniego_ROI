# DSAR — Organization Scope 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Organization Scope(스펙 §14)는 Company/HQ/Branch/Department/Team 단위 접근범위이며, 스펙은 "자동 확장 금지"를 명시한다. 기존 TEAM_TYPES/ORG_PRESET이 근접 substrate — **PARTIAL** 판정.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_DEFINITION`(Scope Type=ORGANIZATION). Organization 단위(스펙 §14 원문): Company · HQ · Branch · Department · Team.

## 3. 열거형 / 타입

Organization Unit: COMPANY · HQ · BRANCH · DEPARTMENT · TEAM.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

**PARTIAL** —
- TEAM_TYPES 17종(자유문자열)·`TeamPermissions.php:44-49`.
- ORG_PRESET 시드(`TeamPermissions.php:706-722`).
- team 테이블 **평면**(`TeamPermissions.php:145-151`·parent_team_id 없음) — HQ/Branch/Department 간 상속 없음(§13 Hierarchy와 분리 판정과 동일 근거).
- data_scope `company` 차원=null 시 무제한(사실상 wildcard, `TeamPermissions.php:258,372`).

★리스크(Duplicate Audit D-5): ORG_PRESET 재무팀 프리셋 `scope='company'`(전사 무제한)·`seedOrg` idempotent 실행 시 재무팀 전원 즉시 회사 전체 무제한 부여(승인 절차 없음)(`TeamPermissions.php:706-722`).

## 5. 설계 원칙

- ADR D-1: TEAM_TYPES/ORG_PRESET을 **ORGANIZATION Scope Type substrate**로 확장·통합(신규 병렬 조직 테이블 신설 금지).
- 스펙 §14 "자동 확장 금지" — company=null 무제한(현행 fail-open 예외조항 `:255-256`)을 Organization Scope로 승격 시 명시적 확장 승인 없이는 유지 금지(ADR D-2 자동확대 금지 직접 적용).
- ORG_PRESET seed 경로에 승인 Hook 신설 필요(Duplicate Audit D-5 권고) — 이번 차수는 설계 등재만, 구현 아님.
- Organization Scope와 Scope Hierarchy(§13)는 분리 — team 평면 구조 자체를 Hierarchy 신설 근거로 오사용 금지.

## 6. Gap / BLOCKED_PREREQUISITE

team 평면(계층 없음)·company wildcard fail-open·ORG_PRESET 무승인 seed 3건이 Gap. 회사 전체 무제한 리스크(D-5)는 설계 단계 등재이며 이번 차수 수정 아님(별도 fix 세션 대상). BLOCKED_PREREQUISITE: RP-002.
