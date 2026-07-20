# DSAR — Dynamic Role Static Lint (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Static Lint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§29(Static Lint)는 Dynamic Role/Rule 관련 코드를 **저장·커밋 시점**에 검사하는 목록이다: **Hardcoded Rule · Java if(Role) · SQL Role Injection · Missing Version · Missing Snapshot · Permit on Unknown**(6종, 원문 그대로 §29 표기 유지). ★이 저장소는 **CI에서 실행되는 Static Lint 자체가 grep 0**(CLAUDE.md 확정: "lint/test 스크립트 없음")이므로 6종 전부 **CI 발동 기준으로는 ABSENT**다. 단, DUPLICATE_AUDIT D-3이 확정한 **하드코딩 role 비교 백엔드 15+FE 22개소 산재**는 §29가 겨냥하는 안티패턴의 실물이며, "CI 부재로 미발동"과 "안티패턴 실물 존재"를 구분해 표기한다.

## 2. Canonical 필드

- **Lint Rule** — §29 6종 중 1
- **판정** — `REAL`(정형화 대상 실 위반 후보) / `ABSENT`(정직 부재) / `NOT_APPLICABLE`(CI 자체 부재)
- **실 substrate** — file:line(없으면 ABSENT)
- **정형화 방향** — 신설 시 lint가 겨눌 구체 대상

## 3. 열거형 / 타입

§29 Static Lint 6종(원문 그대로): `HARDCODED_RULE` · `JAVA_IF_ROLE` · `SQL_ROLE_INJECTION` · `MISSING_VERSION` · `MISSING_SNAPSHOT` · `PERMIT_ON_UNKNOWN`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §29 lint 규칙 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Hardcoded Rule | **REAL(정형화 대상)** | 하드코딩 role/plan 비교 **백엔드 ~15개소**: `TeamPermissions.php:120-136`(roleOf/isAdmin 헬퍼·12개소 재사용)·`UserAuth.php:85,124,1119-1181,3766,3810,3836,4307`·`UserAdmin.php:252,285,300,416,437`·`Pnl.php:522`·`Compliance.php:203`·`Keys.php:191,206`. **프론트 ~22개소(8파일)**: `TeamMembers.jsx:191-458`(team_role 리터럴 9~10)·`writeGuard.js:73-74`·`teamApi.js`·`AgentModeCard.jsx`·`AuthContext.jsx`·`App.jsx`·`Topbar.jsx`·`UserManagement.jsx`(DUPLICATE_AUDIT D-3) |
| 2 | Java if(Role) | **REAL(#1과 동일 실물, 패턴 하위집합)** | §29 원문 표기 "Java if(Role)"는 `if(role===...)` 형태 리터럴 비교 패턴을 지칭 — 동일 실물이 #1과 같은 file:line 목록(DUPLICATE_AUDIT D-3). ★**하드코딩 rank가 실버그 유발 증거**: AdminMenu required_role↔rank 데드락(`AdminMenu.php:337-356`)—super_admin/moderator가 rank 배열에 없어 admin조차 영구 비노출, 커밋 974ab0db6ff로 **이미 수정**(재플래그 아님) |
| 3 | SQL Role Injection | **ABSENT(GROUND_TRUTH 인용 범위 밖)** | 상위 ADR·ground-truth 2문서 어디에도 SQL Role Injection 실물/취약 file:line 인용 없음(반날조 원칙상 없으면 ABSENT). 근접 substrate로 오분류 금지 |
| 4 | Missing Version | **ABSENT(구조적 부재)** | Rule Version 컬럼/개념 자체가 이 저장소에 없음(ADR §거버넌스 계층 완전 부재 — Version/Snapshot/Digest/Evidence grep 0). "버전 누락"을 판정할 대상 자체가 없음 |
| 5 | Missing Snapshot | **ABSENT(구조적 부재)** | Snapshot 스키마 부재(#4와 동일 근본 원인, ADR §거버넌스 계층 완전 부재) |
| 6 | Permit on Unknown | **PARTIAL(반대사례 실재·전역 대상 부재)** | ADR D-2 "UNKNOWN Permit 금지"의 **위반 방지 근접사례**=`effectiveScope` fail-closed(DENY_SCOPE `TeamPermissions.php:234,251,260-263`)가 이미 이 안티패턴을 회피하고 있음 — 단 Rule Evaluation 자체가 ABSENT이므로 lint가 감시할 전역 Rule Evaluation 코드 자체는 없음(감시 대상=향후 신설 Rule Engine) |

## 5. 설계 원칙

1. **"CI 부재=검사 불필요"가 아니다** — Hardcoded Rule(#1)·Java if(Role)(#2)은 CI가 없어서 못 도는 게 아니라 **하드코딩 role 비교 37+개소가 상시 존재 중**임을 명시(REAL). CI가 없어서 lint를 못 다는 것과, lint 대상이 상시 발생 중인 것은 다르다.
2. **Hardcoded Rule/Java if(Role) lint는 D-3의 AdminMenu 데드락 실버그를 정면 근거로 설계** — 해당 결함은 커밋 974ab0db6ff로 이미 수정 완료(재플래그 아님)이나, 유사 패턴이 백엔드 15+FE 22개소 산재 중이므로 **재발 방지가 lint의 목적**(수정 대상 아님, 설계·코드 0).
3. **SQL Role Injection(#3)은 근접 substrate로 오분류 금지** — GROUND_TRUTH 인용 범위 밖임을 정직 유지, 없는 취약점을 있다고 날조하지 않는다.
4. **Missing Version/Missing Snapshot(#4·#5)은 Canonical Rule Registry 신설이 선행** — 버전·스냅샷 컬럼 없는 현행에서는 "누락"을 판정할 대상 자체가 없다(정직 부재).
5. **Permit on Unknown(#6) lint는 effectiveScope fail-closed 패턴을 신설 Rule Engine의 필수 기준선으로 강제하는 방향으로 설계** — 기존 DENY_SCOPE 패턴을 삭제·재구현하지 않고 Rule Evaluation 전역 검사 규칙으로 승격.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 6종 전부 Canonical Rule Registry(Version/Snapshot) 신설 + CI Static Lint 파이프라인 구축 이후에 실 lint 발동 가능.
- **REAL(정형화 대상)**: Hardcoded Rule(#1)·Java if(Role)(#2) — CI 부재가 아니라 현행 실 코드의 구조적 위반 후보(AdminMenu 데드락이 실버그 유발 증거, 이미 수정).
- **ABSENT(정직)**: SQL Role Injection(#3, 인용 범위 밖)·Missing Version(#4)·Missing Snapshot(#5).
- **PARTIAL**: Permit on Unknown(#6) — effectiveScope fail-closed 반대사례만 존재, 전역 Rule Evaluation 대상 자체 부재.
- **판정**: NOT_CERTIFIED · 실 lint 활성 = Canonical Rule Registry 신설 + CI 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]
