# DSAR — Scope Test Strategy (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Test Strategy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§47(테스트)은 **Unit(Scope/Resolution/Projection/Policy) · Integration(Assignment/Permission/Organization) · Security(Scope Escalation/Wildcard Abuse/Tenant Bypass) · Regression(Approval/Assignment/RBAC/Workflow)**을 정의한다. ★CLAUDE.md 확정 사실 — "이 저장소에는 구성된 lint/test 스크립트가 없다(no `npm test`, no PHPUnit suite)". 따라서 §47의 4개 대분류 **전부 실행 가능한 테스트 코드 기준으로는 ABSENT**다. 본 문서는 4개 대분류·9개 세부 항목이 겨눌 **실 substrate 표적**(테스트 코드가 아니라 검증 대상 함수/시나리오)을 근접 인용과 함께 명세한다.

## 2. Canonical 필드

- **테스트 항목** — §47 원문 9종 중 1
- **분류** — Unit/Integration/Security/Regression
- **검증 표적** — 실 substrate 함수/시나리오(file:line, 없으면 ABSENT)
- **판정** — 테스트 코드 존재 여부(전항목 ABSENT) + 표적 substrate 존재 여부(PARTIAL/ABSENT)

## 3. 열거형 / 타입

**Unit(원문)**: Scope · Resolution · Projection · Policy.
**Integration(원문)**: Assignment · Permission · Organization.
**Security(원문)**: Scope Escalation · Wildcard Abuse · Tenant Bypass.
**Regression(원문)**: Approval · Assignment · RBAC · Workflow.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 분류 | 항목 | 검증 표적(현행 근접 substrate) | 판정 |
|---|---|---|---|---|
| 1 | Unit | Scope | data_scope 9차원 정의(`TeamPermissions.php:41,160-166`) — 값 저장/조회 자체는 존재하나 4/9차원만 실 소비 | **PARTIAL(표적 존재·테스트 0)** |
| 2 | Unit | Resolution | `effectiveScope()`(`TeamPermissions.php:236-265`) fail-closed 분기 — owner/admin null·비owner+무tenant DENY_SCOPE·예외 DENY_SCOPE·company null·미설정 fail-open(`:255-256`) | **PARTIAL(표적 존재·테스트 0)** |
| 3 | Unit | Projection | Scope Projection 스키마 부재 | **ABSENT(표적 없음)** |
| 4 | Unit | Policy | `evaluatePolicy`/`requiresHighValueApproval`(`Catalog.php:1104-1148,1159-1169`) — Amount Scope 국한 | **PARTIAL(표적 존재·테스트 0)** |
| 5 | Integration | Assignment | `replaceScope`(`TeamPermissions.php:337-346`) 저장 흐름 — Part 3-3 Assignment 영역과 결합 지점 | **PARTIAL(표적 존재·테스트 0)** |
| 6 | Integration | Permission | Part 2 Permission Engine 결합 지점(코드 0, 선행 미구현) | **BLOCKED_PREREQUISITE** |
| 7 | Integration | Organization | `ORG_PRESET` 시드(`TeamPermissions.php:706-722`)·TEAM_TYPES(`:44-49`)·team 평면구조(`:145-151`) | **PARTIAL(표적 존재·테스트 0)** |
| 8 | Security | Scope Escalation | ★`putMemberPermissions`가 scope를 clamp 없이 기록(`TeamPermissions.php:648-653`) — manager가 팀원에 `company` 무제한 scope 부여 가능(ADR §5·DUPLICATE_AUDIT D-5). **정확히 이 테스트가 현재 통과해서는 안 될 시나리오를 통과시키는 실결함 재현 케이스** | **REAL(표적 존재·현재 미검증 상태로 실결함 노출)** |
| 9 | Security | Wildcard Abuse | `company`=null 무제한(`TeamPermissions.php:258,372`)·api_key `write:*`(`UserAuth.php:4307`·강제 `index.php:589`) | **PARTIAL(표적 존재·테스트 0)** |
| 10 | Security | Tenant Bypass | X-Tenant-Id 위조 배제(`index.php:609-619`)·authedTenant fail-closed(`UserAuth.php:399,401-429`)·188차 P0 확정 방어 | **PARTIAL(표적 존재·이미 회귀보호 대상)** |
| 11 | Regression | Approval | `requiresHighValueApproval`(`Catalog.php:1159-1169`) 289차 클라 우회 봉인 무후퇴 | **PARTIAL(표적 존재)** |
| 12 | Regression | Assignment | Part 3-3 Assignment 영역(별도 DSAR) | 별도 문서 참조 |
| 13 | Regression | RBAC | 4/9차원 SQL 강제 4핸들러(`Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,62,64,90,92,115,117,134`) | **PARTIAL(표적 존재)** |
| 14 | Regression | Workflow | PM 모듈(`PM/Shared.php:59-89`)은 data_scope 미연동(role rank만) — Scope 도입이 PM Workflow를 오염하지 않아야 함이 검증 표적 | **PARTIAL(경계 검증)** |

## 5. 설계 원칙

1. **"테스트 스크립트 0"과 "검증 표적 부재"는 다르다** — Unit/Integration/Security/Regression 4대분류 전부 실행 가능한 코드는 ABSENT지만, 대부분(#1·#2·#4·#5·#7·#9~#14)은 검증할 실 substrate가 이미 존재한다(PARTIAL). Projection(#3)·Permission Integration(#6)만 표적 자체가 없다.
2. **Security > Scope Escalation(#8)이 최우선 테스트 표적** — D-5 실결함(`TeamPermissions.php:648-653`)을 재현하는 테스트 케이스는 "신규 기능 검증"이 아니라 "현재 실패해야 할 시나리오가 통과하고 있음을 실증하는" REAL 항목. 이번 차수는 코드 미변경(설계만), 실 수정·테스트는 별도 fix 세션.
3. **Tenant Bypass(#10)는 이미 188차 P0로 방어된 회귀보호 대상** — 신규 테스트 신설 시 기존 방어 로직(index.php:609-619)을 대체하지 않고 그 위에 케이스 추가.
4. **Permission Integration(#6)은 BLOCKED_PREREQUISITE로 고정** — Part 2 Permission Engine이 코드 0(설계만)이므로 결합 테스트 자체가 성립하지 않음.
5. **Regression 4종은 무후퇴 원칙의 실행 계획** — Approval/RBAC/Workflow 기존 동작이 Scope Registry 도입 후에도 동일 판정을 내려야 함(§6 Gap 및 별도 문서 [[DSAR_APPROVAL_SCOPE_FUNCTION_REGRESSION_GATE]] 참조).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 전체 테스트 코드 실행은 Canonical Scope Registry 실구현 + Permission Engine(Part 2) 실구현 이후. Integration > Permission(#6)은 선행 자체가 부재해 결합 테스트 성립 불가.
- **ABSENT(표적 없음)**: Unit > Projection(#3).
- **REAL(최우선 표적)**: Security > Scope Escalation(#8) — D-5 실결함을 재현하는 시나리오, 실 수정 전까지 "실패해야 할 테스트가 없는 상태"로 방치됨을 정직 기록.
- **PARTIAL(표적 존재·테스트 코드 0)**: 나머지 전 항목.
- **판정**: NOT_CERTIFIED · 실 테스트 스위트 = Canonical Scope Registry 신설 + PHPUnit/CI 파이프라인 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SCOPE_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_SCOPE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]
