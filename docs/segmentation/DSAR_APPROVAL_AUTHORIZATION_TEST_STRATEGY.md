# DSAR — Authorization Test Strategy (§65)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§65 Testing(범주)**:

- **Unit**: Registry ~ Reconciliation 각 엔티티.
- **Property**: 동일 Context→동일 Digest · Tenant 변경 시 Cache Key 재사용 금지 · Resource/Action 변경 시 Permit 재사용 금지 · Explicit Deny→Permit 금지 · Missing Policy/Indeterminate→Permit 금지 · Exception Scope 밖 무효 · Override Expiration 후 무효 · Snapshot/Decision/Evidence Immutable · Commit Binding Deterministic · Cross-Tenant Isolation · Default Deny.
- **Integration**: Actor Identity/Authentication · Decision Command/Approval Case/Slot · Assignment/Authority/Delegation/Sequential · Commit/Snapshot/Evidence/Audit/Ledger Digest/Hash Chain/Tamper · API Gateway/ERP/Workflow.
- **Security**: Actor Spoofing · Tenant Spoofing · Resource IDOR · Version Downgrade · Action Substitution · Policy/Definition Version Downgrade · Cache Poisoning/Collision/Cross-Tenant Reuse · Client Permission/UI/API Route Bypass · Hardcoded Admin Bypass · Exception Scope Expansion · Override/Kill Switch Bypass · Engine Timeout/Error Fail-open · Indeterminate Permit · Snapshot/Evidence/Digest Mutation · Replay · Reuse for Different Slot/Resource/Action.
- **Concurrency**: Policy Activation/Suspension · Definition/Resource Version · Session/Exception Revocation · Override Expiration · Kill Switch · Cache Invalidation ↔ Commit/Evaluation · Idempotency · 동일 Slot 동시 Commit · Revalidation↔Original.
- **Migration**: Hardcoded Admin/Legacy Role/Permission · UI-only · JWT Scope · ERP/Workflow Role · Department/Manager/Resource Owner Check · Legacy Authority · Feature Flag · Missing Version · Ambiguous/Default Allow/Fail-open Legacy.
- **Regression**: Approval 생성/Assignment/Delegation/Sequential/Approve/Reject/Return/Cancel/Correction/Supersession/Rebate/Claim/Settlement/Payment/Contract/ERP/Workflow/Mobile/API/Reporting/Audit.

의미: 인가 테스트는 정상 Permit뿐 아니라 **Deny·Fail-closed·격리·불변성·재사용금지·위장공격 방어**를 필수 검증하며, 특히 Security 계열은 실 공격벡터(Spoofing/IDOR/Downgrade/Cache Poisoning/Fail-open/Replay/UI Bypass)를 재현해 회귀를 막는다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **자동화 인가 테스트 스위트는 부재** — 레포에 PHPUnit/`npm test` 미구성(CLAUDE.md 확정). 인가 검증은 배포 후 수동. Property/Security/Concurrency 계열 인가 회귀 테스트 = **no hits**.
- **실존하는 검증 substrate(테스트는 아님·불변식 자체)**:
  - **Tenant Isolation**: `index.php:590-593,600` tenant 강제주입 — Tenant Spoofing 방어의 실 불변식(테스트로 고정해야 할 대상).
  - **Resource IDOR 방어**: 동상 tenant 덮어쓰기가 Cross-Tenant 리소스 접근을 차단(Security IDOR 테스트 앵커).
  - **Hardcoded Admin Bypass 부재(긍정)**: GROUND_TRUTH §2·§0.6 — user-id/email 하드코딩 authz 부재, admin 판정 전부 DB plan/plans/admin_level. Migration/Security "Hardcoded User ID Allow" 테스트는 부재확인(음성) 케이스.
  - **Maker-Checker 자기승인 차단**: Mapping approve(`Mapping.php:238-292` 자기승인차단/dedup/정족수/fail-closed actor)·Alerting decideAction(`Alerting.php:598-658` 정족수2) — Security "Self-approval"·Concurrency "동일 Slot 동시 Commit" 회귀 앵커.
  - **위임 상한**: `TeamPermissions.php:615-647` DELEGATION_EXCEEDED — Security "Exception Scope Expansion" 유사 회귀 대상.
- **★Fail-open 회귀 위험(테스트로 고정 필요)**: `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)·FE writeGuard UI-only fail-open(`writeGuard.js:13,61-90`)·Rate Limit catch→통과(`index.php:550`) — Security "Engine Timeout/Error Fail-open"·"UI Bypass" 테스트가 이 지점을 반드시 커버해야 회귀 방지.

## 3. 판정

- **Verdict: ABSENT** (인가 자동 테스트 스위트 부재). 단 Tenant 강제주입·Maker-Checker·위임상한 등 **검증해야 할 불변식은 PRESENT-substrate로 실재** — 테스트가 고정할 대상.
- **선행 의존**: 테스트는 §7~§52 전 엔티티·§45 Fail-closed·§39 Commit Binding의 종속 산출 — 상위 구현 ABSENT/BLOCKED이므로 테스트도 설계 명세 단계. Integration(Ledger/Hash Chain/Tamper)은 §3.4 Integrity 부재로 BLOCKED_PREREQUISITE.
- **cover: 0** (인가 테스트 코드 전무). 실존 불변식은 회귀 앵커일 뿐 테스트 대체 아님.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: §65 6계열(Unit/Property/Integration/Security/Concurrency/Migration/Regression) 테스트 매트릭스 설계. 레포에 테스트 러너 미구성이므로 **최소 회귀 하네스(render/e2e smoke 계열, MEMORY 266차 `npm run e2e`)** 확장으로 인가 회귀를 우선 편입 — 신규 프레임워크 남설 금지.
- **Property 필수 불변식**: 동일 Context→동일 Digest · Tenant 변경 Cache Key 금지 · Resource/Action 변경 Permit 재사용 금지 · Explicit Deny→Permit 금지 · Missing Policy/Indeterminate→Permit 금지 · Snapshot/Decision/Evidence Immutable · Cross-Tenant Isolation(`index.php:600` 강제주입 고정) · Default Deny.
- **Security 공격 재현(회귀 필수)**: Tenant Spoofing(tenant 주입 우회 시도) · Resource IDOR · Version Downgrade · Cache Poisoning/Cross-Tenant Reuse · UI/API Route Bypass(writeGuard fail-open `writeGuard.js:13,61-90`가 서버측에서 반드시 차단됨을 증명) · Hardcoded Admin Bypass(부재 확인) · Fail-open(requireFeaturePlan `UserAuth.php:64-84`·Rate Limit `index.php:550`이 고위험 경로에서 Deny로 귀결) · Replay · Slot/Resource/Action 재사용.
- **Concurrency**: Maker-Checker 정족수(`Mapping.php:238-292`·`Alerting.php:598-658`) 동시 승인·중복승인 방어를 동시성 테스트로 고정(자기승인·중복 actor 차단 회귀).
- **Regression 무회귀(§65)**: 기존 Approval 생성/Approve/Reject/Return/Cancel·api_key scope·team RBAC·tenant 격리가 인가 Foundation 도입 후에도 동일 동작함을 회귀로 증명. Migration 계열은 Legacy 하드코딩(plan==='admin' 다수·GROUND_TRUTH §2)의 Canonical 매핑 후 행동 동일성 검증.
- Part 1은 테스트 전략·매트릭스·앵커 설계만·실 테스트 코드는 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_AUTHORIZATION_MIGRATION]] · [[reference_e2e_smoke]].
