# DSAR — Authorization Evaluation Pipeline (06-A-03-02-03-04 · §42)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §42 Evaluation Pipeline(37단계) · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§42 Evaluation Pipeline — 37단계 (원문 전사):

`Tenant → Actor Identity → Authentication Context 검증 → Registry Resolution → Scope Resolution → Definition Resolution → Active Version → Policy Set → Context Schema Validation → Required Subject/Resource/Action/Environment Field → Subject/Resource/Action/Environment Contract 생성 → Context 생성 → Policy Applicability → Condition → Effect → Combining Algorithm → Obligation/Advice/Constraint 집계 → Challenge 판단 → Exception/Override 적용검증 → 최종 Effect → Decision → Snapshot → Evidence → Audit → Digest → Decision Binding → Cache 가능여부 → Commit Revalidation Requirement.`

의미: Pipeline은 인가 판정을 **선언적·고정 순서의 37단계 절차**로 정형화해, 매 요청이 동일하게 재현·감사 가능하도록 만드는 인가 코어의 실행 골격이다. 입력(Tenant/Identity/AuthN Context)→해석(Registry/Scope/Definition/Version/Policy Set)→계약 생성(Subject/Resource/Action/Environment Contract)→Context→평가(Applicability/Condition/Effect/Combining)→집계(Obligation/Advice/Constraint/Challenge/Exception/Override)→산출(Decision/Snapshot/Evidence/Audit/Digest/Binding)→후속(Cache/Commit Revalidation)로 흐른다. §5.1(Authentication≠Authorization)·§5.2(Default Deny)·§5.13(Fail-open 금지)를 파이프라인의 단계 순서 자체로 봉인한다.

## 2. 기존 구현 대조

- **선언적 37단계 인가 파이프라인은 부재** — Registry Resolution·Scope Resolution·Definition/Active Version Resolution·Policy Applicability·Combining Algorithm·Obligation/Constraint 집계·Snapshot/Evidence/Digest·Commit Revalidation Requirement을 순서화된 단계로 실행하는 엔진 전무.
- 실존하는 유사 자산(절차적 mini-pipeline substrate, 선언적 파이프라인 아님):
  - **중앙 RBAC 게이트 `index.php:553-603`** — 매 요청 미들웨어가 절차적 mini-pipeline을 실행: 키검증(`index.php:490-493` 예외→401)→roleRank 산출(`index.php:554` viewer0/connector1/analyst2/admin3)→scope 게이트(admin:keys `index.php:564-567`·write:* `index.php:568-578`)→tenant 강제주입(`index.php:590-593,600` X-Tenant-Id 무조건 덮어쓰기). 37단계 중 **Tenant/Actor/Authentication/Scope 단계의 조잡한 대리**만 존재.
  - agency 위임 격리 `index.php:74-104` — agency_client_link.status='approved' 매요청 재검증(읽기전용 write 차단). Scope Resolution의 특수 케이스이나 선언적 단계가 아님.
  - `TeamPermissions.php:236-322`(`:234` DENY_SCOPE) ABAC data_scope 행필터 — effectiveScope/scopeSql. Policy Condition/Effect의 특수형이나 파이프라인 단계로 분리 선언되지 않음.
  - `TeamPermissions.php:39,152-159,325-336` acl_permission 매트릭스(subject_type×menu×8action·manage 슈퍼셋) — Policy Applicability의 조회 대리.
- **Definition/Active Version Resolution·Context Schema Validation·Combining Algorithm·Snapshot/Evidence/Digest·Decision Binding·Commit Revalidation Requirement** → no hits. 판정결과 불변저장·evidence·digest 결합 부재(auth append만).
- 현 mini-pipeline은 **단일 절차 흐름**이라 단계별 산출물(Decision/Snapshot/Evidence)을 남기지 않고 통과/거부만 한다. 37단계의 후반부(21~37: Decision~Commit Revalidation) 전부 부재.

## 3. 판정

- Verdict: **PARTIAL (절차 substrate 실재 · 선언적 37단계 부재)**
- 근거: `index.php:553-603`이 키검증→roleRank→scope→tenant의 절차적 mini-pipeline을 매 요청 실행 → 파이프라인 substrate PRESENT. 그러나 이는 4~5단계의 조잡한 대리이며, Registry/Scope/Definition/Version Resolution·Context·Combining·Snapshot/Evidence/Digest/Binding·Commit Revalidation 등 나머지 30여 단계는 부재.
- 선행 의존: Pipeline은 Registry(§7)·Definition(§12)·Version(§13)·Policy Set(§11)·Context(§19)·Decision(§24)·Snapshot(§34)·Evidence(§35)를 순차 소비 — 이들 상위 구조체가 전부 ABSENT/PARTIAL이라 파이프라인 후반부는 참조 대상 자체가 부재.
- cover: **부분** (Tenant/Actor/AuthN/Scope 4단계의 절차 substrate만. 판정→산출→후속 단계는 0).

## 4. 확장/구현 방향 (설계)

- 현 절차적 mini-pipeline(`index.php:553-603`)을 **선언적 37단계 파이프라인의 초기 substrate로 승격** — 재구현 금지, 기존 키검증/roleRank/scope/tenant 로직을 파이프라인 앞 단계(Tenant→Actor Identity→Authentication Context→Scope Resolution)의 실 구현체로 흡수(Golden Rule=Extend).
- 신규는 후반 단계만: Registry/Definition/Active Version/Policy Set Resolution → Contract 생성 → Context/Context Snapshot → Applicability/Condition/Effect/Combining Algorithm → 집계 → Decision/Snapshot/Evidence/Audit/Digest/Binding → Cache/Commit Revalidation. 각 단계가 산출물을 남겨 재현·감사 가능하게.
- §5.1 봉인: 파이프라인은 Authentication Context 검증(3단계) 이후에도 **반드시** Policy Applicability~Effect를 거쳐야 Permit 산출 — 인증성공이 Effect 단계를 건너뛰지 못하도록 단계 순서로 강제.
- §5.13 봉인: 어느 단계든 예외/Timeout/Indeterminate 시 최종 Effect=DENY로 귀결(고위험 Fail-open 금지). 현 `index.php:490-493` 키조회 예외→401 fail-closed는 이 원칙의 선례로 유지.
- ★위험(후속 enforcement Part): 절차 substrate가 판정 산출물(Decision/Snapshot/Evidence)을 남기지 않아 §51 Reconciliation(UI Hint vs Server) 근거가 없다 — 파이프라인 후반 단계 신설이 이 감사 공백을 닫는다. 실 배선은 후속 Part(이번 Part=설계만).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY_RESOLUTION]] · [[DSAR_APPROVAL_AUTHORIZATION_FAIL_CLOSED_POLICY]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
