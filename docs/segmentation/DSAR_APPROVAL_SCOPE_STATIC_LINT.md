# DSAR — Scope Static Lint (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Static Lint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§41(Static Lint)는 Scope 관련 코드/설정을 **저장·커밋 시점**에 검사하는 목록이다: **Hardcoded Scope · Organization Auto Expansion · Wildcard Scope · Missing Version · Missing Snapshot · Missing Policy**(6종). ★이 저장소는 **CI에서 실행되는 Static Lint 자체는 grep 0**(CLAUDE.md 확정: "lint/test 스크립트 없음")이므로 6종 전부 **CI 발동 기준으로는 ABSENT**다. 단, §41이 겨냥하는 안티패턴 후보는 이 저장소의 7곳 산재 scope substrate(DUPLICATE_AUDIT D-1) 중 **실제 위반 후보를 갖는 항목**이 있어, "CI 부재로 미발동"과 "안티패턴 실물 존재"를 구분해 표기한다.

## 2. Canonical 필드

- **Lint Rule** — §41 6종 중 1
- **판정** — `REAL`(정형화 대상 실 위반 후보) / `ABSENT`(정직 부재) / `NOT_APPLICABLE`(CI 자체 부재)
- **실 substrate** — file:line(없으면 ABSENT)
- **정형화 방향** — 신설 시 lint가 겨눌 구체 대상

## 3. 열거형 / 타입

§41 Static Lint 6종(원문 그대로): `HARDCODED_SCOPE` · `ORGANIZATION_AUTO_EXPANSION` · `WILDCARD_SCOPE` · `MISSING_VERSION` · `MISSING_SNAPSHOT` · `MISSING_POLICY`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §41 lint 규칙 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Hardcoded Scope | **REAL(정형화 대상)** | api_key defaultScopes가 2곳 독자 정의(`UserAuth.php:4305-4311` apiKeyDefaultScopes · `Keys.php:191,204`)·data_scope 9차원 enum이 `TeamPermissions.php:41` 단일 상수배열에 하드코딩(통합 Registry 참조 없음, DUPLICATE_AUDIT D-3) |
| 2 | Organization Auto Expansion | **REAL(실결함 직결)** | `ORG_PRESET` 재무팀 프리셋이 `scope='company'`(전사 무제한)로 시드(`TeamPermissions.php:706-722`)·`seedOrg` idempotent 재실행 시 승인 절차 없이 즉시 반영(ADR §5 부수 결함·DUPLICATE_AUDIT D-5 두 번째 항목). ★manager scope 위임상한 미구현(`putMemberPermissions`가 scope를 clamp 없이 기록·`TeamPermissions.php:648-653`)도 조직 위계를 경유한 자동확대 사례로 동일 lint 표적 |
| 3 | Wildcard Scope | **REAL(정형화 대상)** | `company`=null 무제한(`TeamPermissions.php:258,372`·기능적 wildcard)·api_key `write:*`(`UserAuth.php:4307`·강제 `index.php:589`)=명시 wildcard 문자열 — 둘 다 lint가 겨눌 실물 존재(DUPLICATE_AUDIT D-4) |
| 4 | Missing Version | **REAL(구조적 부재)** | `replaceScope`(`TeamPermissions.php:337-346`) DELETE→INSERT 전량교체 — 이전 값이 물리적으로 소실(version 개념 부재를 실증하는 사례, EXISTING_IMPLEMENTATION §9) |
| 5 | Missing Snapshot | **ABSENT → 신설** | Scope Snapshot 스키마 부재(EXISTING_IMPLEMENTATION §9 "snapshot grep 0"). 근접 substrate 없음 |
| 6 | Missing Policy | **PARTIAL** | Amount Scope에 한해 `evaluatePolicy`(`Catalog.php:1104-1148`)·`requiresHighValueApproval`(`:1159-1169`)가 근접 Policy substrate이나, 9차원 전체를 아우르는 `APPROVAL_SCOPE_POLICY` 엔티티는 부재(카탈로그 국한, EXISTING_IMPLEMENTATION §4) |

## 5. 설계 원칙

1. **"CI 부재=검사 불필요"가 아니다** — Organization Auto Expansion(#2)·Wildcard Scope(#3)·Missing Version(#4)은 CI가 없어서 못 도는 게 아니라 **현재 실물 안티패턴이 상시 존재 중**임을 명시(REAL). CI가 없어서 lint를 못 다는 것과, lint 대상이 상시 발생 중인 것은 다르다.
2. **Organization Auto Expansion(#2) lint는 D-5 실결함 2건(재무팀 프리셋·manager 위임상한 미구현)을 정면 표적으로 설계** — 이번 차수는 수정 아님(설계·코드 0), 실 수정은 별도 fix 세션 배포승인 필요.
3. **Hardcoded Scope(#1) lint는 다중 정의 통합이 목표** — `UserAuth.php`/`Keys.php`의 api_key defaultScopes 2곳과 `TeamPermissions.php:41` data_scope enum을 삭제·재구현이 아니라 Canonical Scope Registry 참조로 정형화(중복 Resolver 신설 금지, ADR D-1·D-6).
4. **Wildcard Scope(#3) lint는 완전 금지가 아니라 승인 게이트 결합** — `company`/`write:*`를 즉시 제거 대상으로 날조하지 않는다(기능적으로 필요한 최광의 scope일 수 있음). Scope Expansion Guard(Runtime Guard #2)·seed 승인 Hook과 결합해 명시적 승인 경유만 허용하는 방향으로 설계.
5. **Missing Policy(#6) lint는 Amount Scope Policy 승격과 결합** — 카탈로그 국한 `evaluatePolicy`를 삭제·재구현하지 않고 9차원 공통 `APPROVAL_SCOPE_POLICY` 엔티티의 첫 구현체로 확장(무후퇴).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 6종 전부 Canonical Scope 저장 스키마(Registry/Version/Snapshot/Policy) 신설 + CI Static Lint 파이프라인 구축 이후에 실 lint 발동 가능.
- **REAL(정형화 대상)**: Hardcoded Scope(#1)·Organization Auto Expansion(#2, D-5 실결함 직결)·Wildcard Scope(#3)·Missing Version(#4) — CI 부재가 아니라 현행 실 코드의 구조적 위반 후보.
- **ABSENT(정직)**: Missing Snapshot(#5).
- **PARTIAL**: Missing Policy(#6) — Amount Scope 국한 근접 substrate만 존재.
- **판정**: NOT_CERTIFIED · 실 lint 활성 = 스키마 신설 + CI 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SCOPE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_SCOPE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]
