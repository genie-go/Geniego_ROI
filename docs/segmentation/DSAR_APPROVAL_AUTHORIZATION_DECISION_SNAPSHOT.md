# DSAR — Authorization Decision Snapshot (06-A-03-02-03-04 Part 1 · §34)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§34 DECISION_SNAPSHOT — 원문 전사 필드:
- `request snapshot` · `context snapshot` · `subject snapshot` · `resource snapshot` · `action snapshot` · `environment snapshot`
- `definition version` · `policy set snapshot` · `applicable policy snapshot`
- `combining algorithm` · `effect` · `result`
- `reasons` · `obligations` · `advice` · `constraints`
- `challenge` · `exception` · `override`
- `valid` · `captured` · `snapshot digest`

의미: Decision Snapshot은 한 Authorization Decision이 산출된 **바로 그 시점의 모든 입력·정책·판정을 불변으로 동결한 봉인 레코드**다. §5.8(Decision=Immutable Snapshot·현재 Role/Permission/Policy로 과거 Decision 덮어쓰기 금지)의 물리적 실현이다. 핵심은 ① request/context/subject/resource/action/environment를 **당시 값 그대로** 보존(현재 재조회 금지·§20 Context Snapshot과 정합), ② 적용된 definition version·policy set·applicable policy·combining algorithm을 동결(§5.7 과거 Decision 재해석 금지), ③ effect/result와 부착된 reasons/obligations/advice/constraints/challenge/exception/override 전부 포함, ④ `snapshot digest`로 변조탐지(앞 블록 Hash Chain 정책·§37). Evidence(§35)·Ledger·§39 Commit Binding의 재검증 기준이 된다.

## 2. 기존 구현 대조

- **Authorization 판정 불변 snapshot은 부재** — 인가결정을 "그 시점 입력·정책·결과의 불변 동결"로 저장하는 구조가 전무. 현재 RBAC는 매 요청 실시간 재계산이며, 판정 결과를 불변 레코드로 남기지 않는다(§24 Decision·§25 Result 부재의 연쇄).
- 실존하는 유사·인접 자산(snapshot 아님):
  - **SecurityAudit append-only 해시체인**(`SecurityAudit.php:48-68`) — 유일한 실 append-only 불변 기록. INSERT/SELECT만(`SecurityAudit.php:8`)·prev_hash 체인(`SecurityAudit.php:27`)·GENESIS(`SecurityAudit.php:39`)·verify(`SecurityAudit.php:56-68`)·서버UTC(`SecurityAudit.php:24`)·배선(`UserAuth.php:4046`·`Compliance.php:162`). 그러나 이는 **단일 감사트레일**이지 authorization decision의 입력·정책·판정을 재구성 가능하게 동결한 snapshot이 아니다(KEEP_SEPARATE — audit ≠ decision snapshot).
  - 중앙 RBAC(`index.php:553-603`)·ABAC data_scope(`TeamPermissions.php:236-322`) — 매 요청 실시간 평가. auth_tenant/role attach(`index.php:590-593`)는 요청 attribute이지 동결 snapshot이 아니다.
- ★장식 오인 금지: `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)은 verify() 0(289차 정정·GROUND_TRUTH)으로 tamper-evident 아님 → Decision Snapshot 무결성 근거로 계상 금지.
- ★불변성 상충: `media_gc_cron.php:35,43`은 append-only 감사로그를 90일 물리 DELETE(Legal Hold 예외 없음) → snapshot 도입 시 immutability 위협 대상.
- `definition version`·`policy set snapshot`·`applicable policy snapshot`·`combining algorithm`·판정 `snapshot digest` → **no hits**.

## 3. 판정

- Verdict: **ABSENT (순신규)**
- substrate 태그: SecurityAudit 해시체인(`SecurityAudit.php:48-68`) = **CANONICAL(불변·verify 실재 패턴)** — Snapshot 무결성/digest/변조탐지의 **재사용 패턴 substrate**이나 감사트레일이지 decision snapshot 자체 아님(KEEP_SEPARATE). 실시간 RBAC/ABAC(`index.php:553-603`·`TeamPermissions.php:236-322`)는 평가엔진이지 동결 snapshot 아님.
- 선행 의존: Decision Snapshot은 Request(§21)·Context Snapshot(§20)·Subject/Resource/Action/Environment Contract(§15–18)·Decision(§24)·Evidence(§35)의 상위 결합 — 상위 Decision/Context Foundation 부재로 BLOCKED_PREREQUISITE.
- cover: **0**(snapshot 데이터 동결 전무. SecurityAudit는 무결성 패턴 재사용원이지 대체 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_decision_snapshot` — 판정 시점 전 입력·정책·결과의 불변 동결. 필드: `snapshot_id`·`decision_id`·`request_snapshot`·`context_snapshot`(§20 참조)·`subject_snapshot`·`resource_snapshot`(+version)·`action_snapshot`·`environment_snapshot`·`definition_version`·`policy_set_snapshot`·`applicable_policy_snapshot`·`combining_algorithm`·`effect`·`result`·`reasons`·`obligations`·`advice`·`constraints`·`challenge_ref`·`exception_ref`·`override_ref`·`valid_from`·`valid_until`·`captured_at`·`snapshot_digest`.
- **불변식 강제**(§5.8·§20·§54 Lint "Mutable Snapshot"/"Decision Update Repository" 차단): snapshot은 INSERT-only·UPDATE/DELETE 금지. 현재 값 재조회 금지 — resource/role/policy는 당시 snapshot 값만 참조(§20 "현재 Resource/Role/Policy 재조회 금지").
- Golden Rule=Extend: SecurityAudit 해시체인(`SecurityAudit.php:48-68`)의 prev_hash 체인+GENESIS+verify를 **snapshot_digest·변조탐지의 CANONICAL 패턴으로 재사용**(§37 Digest "앞 블록 Hash Chain 정책"). SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`)·서버UTC(`SecurityAudit.php:24`) 재사용. 단 decision snapshot 테이블은 감사트레일과 분리(KEEP_SEPARATE).
- ★immutability 실집행 요구: snapshot·decision·evidence를 `media_gc_cron.php:35,43`류 물리 DELETE 대상에서 제외(§32 Exception과 §33 Override 참조 유지 필요·Legal Hold). `menu_audit_log.hash_chain`(`AdminMenu.php:123-143`)은 verify 0이므로 snapshot 무결성 매체로 사용 금지 — SecurityAudit verify(`SecurityAudit.php:56-68`)만 정본.
- §39 Commit Binding·§44 Version Resolution이 Validation↔Commit 사이 policy/resource version 변경을 이 snapshot 기준으로 탐지. 실 배선은 후속 enforcement Part(상위 Decision Foundation 신설 후).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_ADVICE]] · [[DSAR_APPROVAL_AUTHORIZATION_CONSTRAINT]] · [[DSAR_AUTHORIZATION_CONTEXT]] · [[DSAR_AUTHORIZATION_DECISION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[reference_menu_audit_log_not_tamper_evident]].
