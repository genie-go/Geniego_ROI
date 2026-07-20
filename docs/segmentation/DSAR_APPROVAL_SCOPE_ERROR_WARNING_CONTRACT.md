# DSAR — Scope Error/Warning Contract (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Error/Warning Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§42(Error Contract)는 **SCOPE_NOT_FOUND · INVALID_SCOPE · SCOPE_EXPANDED · SCOPE_VERSION_INVALID · SCOPE_CONTEXT_INVALID · SCOPE_POLICY_BLOCKED**(6종) 하드 차단 코드를, §43(Warning Contract)은 **Scope Expanded · Scope Deprecated · Scope Review Required · Scope Drift**(4종) 소프트 경고를 정의한다. ★이 저장소에는 Canonical Scope Error/Warning Contract 자체가 없다(grep 0) — `effectiveScope`(`TeamPermissions.php:236-265`)의 `DENY_SCOPE` 문자열 반환이 유일하게 실물 코드로 존재하는 근접 Error다. 본 문서는 10개 코드 각각을 근접 substrate와 대조한다.

## 2. Canonical 필드

- **Code** — §42/§43 원문 10종 중 1
- **분류** — Error(하드 차단)/Warning(소프트 경고)
- **판정** — 근접 substrate 유무(PARTIAL/ABSENT)
- **현재 substrate** — file:line(없으면 ABSENT)
- **HTTP 대응(설계 방향)** — 실 구현 시 상태코드 매핑(순신규)

## 3. 열거형 / 타입

**Error(§42) 6종(원문 그대로)**: `SCOPE_NOT_FOUND` · `INVALID_SCOPE` · `SCOPE_EXPANDED` · `SCOPE_VERSION_INVALID` · `SCOPE_CONTEXT_INVALID` · `SCOPE_POLICY_BLOCKED`.

**Warning(§43) 4종(원문 그대로)**: `SCOPE_EXPANDED_WARNING` · `SCOPE_DEPRECATED` · `SCOPE_REVIEW_REQUIRED` · `SCOPE_DRIFT`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 코드 | 분류 | 판정 | 근거(file:line) |
|---|---|---|---|---|
| 1 | `SCOPE_NOT_FOUND` | Error | **ABSENT** | Canonical Scope Registry/Definition 부재 — "등록된 scope 정의를 찾을 수 없음"을 판정할 대상 자체가 없음(EXISTING_IMPLEMENTATION §9) |
| 2 | `INVALID_SCOPE` | Error | **PARTIAL** | `DENY_SCOPE` 문자열(`TeamPermissions.php:251,260-263`)이 근접 Error — 단 이는 fail-closed 시 반환되는 범용 거부값이지 Scope Definition 스키마 대조 결과가 아님 |
| 3 | `SCOPE_EXPANDED` | Error | **ABSENT(실결함 직결)** | Runtime Guard #2와 동일 근거 — `putMemberPermissions`가 scope 확대를 감지·차단하지 않음(`TeamPermissions.php:648-653`·ADR §5·DUPLICATE_AUDIT D-5). 이 코드가 발동해야 할 시점에 아무 에러도 발생하지 않고 그대로 통과 |
| 4 | `SCOPE_VERSION_INVALID` | Error | **ABSENT(순신규)** | Scope Version 개념 부재(#4 Runtime Guard와 동일 근거) |
| 5 | `SCOPE_CONTEXT_INVALID` | Error | **PARTIAL** | Tenant Context 위조 시도 차단은 실재(`index.php:609-619`·`UserAuth.php:399,401-429`)하나 전용 `SCOPE_CONTEXT_INVALID` 코드가 아니라 tenant 미들웨어의 범용 거부. Time/Device/Network/Client Context는 판정 대상 자체 부재 |
| 6 | `SCOPE_POLICY_BLOCKED` | Error | **PARTIAL** | `requiresHighValueApproval`(`Catalog.php:1159-1169`) 서버측 강제가 근접 — 단 Amount Scope 국한(카탈로그), 9차원 공통 Scope Policy 코드 아님 |
| 7 | `SCOPE_EXPANDED_WARNING` | Warning | **ABSENT** | 경고 레벨조차 발동 지점 없음(#3 Error와 동일 근본 원인) |
| 8 | `SCOPE_DEPRECATED` | Warning | **ABSENT** | Scope Deprecation 개념 부재(Scope Version §6 Deprecation 상태 자체가 순신규) |
| 9 | `SCOPE_REVIEW_REQUIRED` | Warning | **ABSENT** | Scope Certification/Review 주기 개념 부재(grep 0) |
| 10 | `SCOPE_DRIFT` | Warning | **ABSENT** | EXISTING_IMPLEMENTATION §9 명시 확정 — drift 판정 로직 grep 0(reconciliation 매치는 PgSettlement/ROAS 등 금융 정합이지 scope 무관) |

## 5. 설계 원칙

1. **DENY_SCOPE를 INVALID_SCOPE로 오표기 금지** — 근접이나 범용 거부값(#2)일 뿐 스키마 대조 결과가 아님을 문서 전체에서 일관되게 PARTIAL로 명시.
2. **SCOPE_EXPANDED(#3)/SCOPE_EXPANDED_WARNING(#7)은 D-5 실결함 해소와 결합 설계** — 이 코드가 실 구현되는 순간이 곧 Expanded Scope Runtime Guard가 실제로 동작하는 순간(Static Lint #2 Organization Auto Expansion과도 동일 표적). 이번 차수는 코드 미변경(설계만).
3. **SCOPE_CONTEXT_INVALID(#5)는 Tenant 축 우선 승격, 나머지 축은 순신규** — Tenant Context 위조 차단(강한 실재)을 대체하지 않고 그 위에 통합 코드로 얹는다(무후퇴).
4. **SCOPE_POLICY_BLOCKED(#6)는 Amount Scope Policy를 삭제하지 않고 확장** — `evaluatePolicy`/`requiresHighValueApproval`을 9차원 공통 Policy 코드의 첫 구현체로 승격.
5. **Warning 4종 전부 ABSENT를 날조하지 않는다** — 소프트 경고조차 발동하지 않는 현행을 정직하게 유지, "경고는 있는데 로그만 안 남긴다" 식 과장 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 10종 전부 Canonical Scope Registry/Version/Context/Policy 실구현 이후에 실 코드 발동 가능.
- **ABSENT(순신규)**: `SCOPE_NOT_FOUND`(#1)·`SCOPE_EXPANDED`(#3, D-5 실결함 직결)·`SCOPE_VERSION_INVALID`(#4)·Warning 4종 전부(#7~#10).
- **PARTIAL(근접·불충분)**: `INVALID_SCOPE`(#2)·`SCOPE_CONTEXT_INVALID`(#5)·`SCOPE_POLICY_BLOCKED`(#6).
- **판정**: NOT_CERTIFIED · 실 Contract = Canonical Scope Registry/Version/Context/Policy 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SCOPE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_SCOPE_STATIC_LINT]] · [[DSAR_APPROVAL_SCOPE_API_CONTRACT]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]
