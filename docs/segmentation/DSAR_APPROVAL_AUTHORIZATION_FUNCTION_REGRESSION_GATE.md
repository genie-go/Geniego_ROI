# DSAR — Authorization Function Regression Gate (§65)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§65 Regression(무회귀 대상)**: Approval 생성/Assignment/Delegation/Sequential/Approve/Reject/Return/Cancel/Correction/Supersession/Rebate/Claim/Settlement/Payment/Contract/ERP/Workflow/Mobile/API/Reporting/Audit — 인가 Foundation 도입 후에도 **기존 기능 동작 불변**.

**§71 완료 조건**: 위 전부 구축 + **기존 Approval 무회귀** + History 갱신 + Part 2 Permission Engine이 사용할 안정 Canonical Authorization Contract 준비.

**본 게이트의 보호대상(과업 지정)**: 기존 `index.php` 중앙 RBAC · TeamPermissions · Maker-Checker(Mapping/Alerting) · api_key scope · tenant 격리 **무회귀**.

의미: Function Regression Gate는 Authorization Registry Foundation(설계·후속 배선)이 실존하는 인가 enforcement를 **약화·우회·중복·드리프트**시키지 않음을 보증하는 관문이다. Foundation은 Extend여야 하며, 어떤 신규 Canonical 경로도 기존 fail-closed 지점을 fail-open으로 되돌려선 안 된다.

## 2. 기존 구현 대조 (GROUND_TRUTH) — 보호대상 실측

- **① 중앙 RBAC(`index.php:553-603`)** — roleRank(`index.php:554`)·admin:keys scope(`index.php:564-567`)·write 메서드 게이트(`index.php:568-578`)·**tenant 강제주입**(`index.php:590-593,600`)·키조회 예외→401(`index.php:490-493`)·agency 위임 재검증(`index.php:74-104`). **무회귀 필수** — 인증 실패 401/403 fail-closed·tenant 위조 원천차단이 Foundation 도입 후에도 동일해야 함.
- **② TeamPermissions RBAC/ABAC(`TeamPermissions.php:120-322`)** — roleOf fail-closed(`TeamPermissions.php:120-131` `:127`)·isAdmin/isOwnerAdmin/isManagerAdmin(`TeamPermissions.php:132,134,136`)·acl_permission 매트릭스(`TeamPermissions.php:39,152-159,325-336`)·data_scope DENY_SCOPE fail-closed(`TeamPermissions.php:234,236-322`)·위임상한 DELEGATION_EXCEEDED(`TeamPermissions.php:615-647`). **무회귀 필수** — 미해결 role→member·빈값 owner 승격차단 등 권한상승 벡터 제거가 유지돼야 함.
- **③ Maker-Checker** — Mapping approve(`Mapping.php:238-292` 자기승인차단/dedup/정족수/fail-closed actor)·Alerting decideAction(`Alerting.php:598-658` 정족수2). **무회귀 필수** — n-of-m/four-eyes·self-approval 차단 유지.
- **④ api_key scope** — scope 화이트리스트+역할상한·owner-only CRUD(`Keys.php:99-113,198-206`·`UserAuth.php:4204-4290`)·`/v421/keys` admin:keys 게이트(`index.php:564-567`). **무회귀 필수**.
- **⑤ tenant 격리** — 강제주입(`index.php:600`)·agency 위임 fail-closed(`index.php:74-104`)·핸들러 WHERE tenant_id 편재. **무회귀 필수** — Cross-Tenant 접근 원천차단 유지.
- **부수 보호(고위험 발송 게이트, MEMORY 289차)**: high_value 승인 게이트(`requiresHighValueApproval` 서버측 강제·pending_approval)·발송 중앙게이트(`isMarketingSendAllowed`) 무회귀 — 인가 Foundation이 이 게이트를 우회하지 않도록.

## 3. 판정

- **Verdict: PRESENT(보호대상 실재) / Gate=ABSENT(회귀 게이트 미구성)** — 보호할 enforcement 5축은 모두 실재하나, 이를 회귀로 고정하는 자동 게이트는 부재(레포 테스트 러너 미구성).
- **선행 의존**: 게이트는 §65 Regression·§69 무회귀 게이트의 종속 — Foundation(§7~§52) 실 배선 시점에 발동. Part 1은 보호대상 목록·무회귀 기준 설계까지.
- **cover: N/A(게이트는 신규·보호대상은 실측 완료)** — 보호대상 file:line은 GROUND_TRUTH 등재분으로 확정, 회귀 게이트 구현은 후속.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend·무후퇴(핵심)**: Authorization Registry Foundation은 위 5축을 **대체(Replace)하지 않고 Canonical Policy 데이터로 흡수**한다. 중앙 RBAC(`index.php:553-603`)·TeamPermissions(`TeamPermissions.php:120-322`)는 Evaluation을 호출하는 Adapter로 위임하되, 위임 전/후 **동일 Allow/Deny 결과**를 회귀로 증명한 뒤에만 전환.
- **무회귀 게이트 항목(설계)**:
  1. 미인증 요청 401·무권한 403 유지(`index.php:490-493,553-603`).
  2. tenant 위조 시도가 강제주입으로 무력화(`index.php:600`)·Cross-Tenant 리소스 접근 차단.
  3. member read-only·owner/manager 서열·DENY_SCOPE fail-closed 유지(`TeamPermissions.php:120-322,234`).
  4. Maker-Checker 자기승인·중복 actor 차단·정족수 유지(`Mapping.php:238-292`·`Alerting.php:598-658`).
  5. api_key scope 화이트리스트·owner-only CRUD 유지(`Keys.php:99-113`).
  6. high_value 승인 게이트·발송 중앙게이트 무우회(MEMORY 289차).
- **★Fail-open 회귀 금지**: Foundation 도입이 기존 fail-closed(roleOf→member·DENY_SCOPE·agency 재검증)를 fail-open으로 되돌리지 않음을 게이트로 보증. 반대로 기존 fail-open(`requireFeaturePlan` `UserAuth.php:64-84`·writeGuard `writeGuard.js:13,61-90`·Rate Limit `index.php:550`)의 **fail-closed 전환은 무후퇴 예외(=개선)**이나 별도 승인·회귀 후에만.
- **Part 2 준비(§71)**: 게이트 통과가 Part 2 Permission Engine이 얹을 안정 Canonical Contract의 전제. Part 1은 보호대상·게이트 기준 설계만·실 회귀 하네스(§65 Test Strategy·266차 e2e 확장)는 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_TEST_STRATEGY]] · [[DSAR_APPROVAL_AUTHORIZATION_MIGRATION]] · [[project_n231_team_permission_rbac]] · [[project_n289_13_highvalue_routing_gap]].
