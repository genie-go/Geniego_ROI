# DSAR — Approval Service Role Assignment (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Role Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Role Assignment는 Service Role(§3-6 자매편)이 특정 Service Identity에 실제로 부여되는 결합 기록이다(스펙 §8·Canonical Entity `APPROVAL_SERVICE_ROLE_ASSIGNMENT`, §2). Part 3-3 Role Assignment(인간)와 대비되는 개념으로, "이 서비스 identity에게 언제·어떤 경로로·얼마나 role이 배정되었는가"를 기록한다.

## 2. Canonical 필드

스펙 §2·§8 근거 설계 필드(코드 0·미확정):

- `assignment_id`(PK) · `identity_ref`(→ Service Identity Registry) · `service_role_ref`(→ Service Role) · `assignment_type`(§3 5유형 중 1) · `granted_at` · `expires_at`(Temporary/Emergency 유형용) · `granted_by_ref`(발급 actor) · `tenant_id` · `version_ref`(Immutable, §35)

## 3. 열거형 / 타입

- `assignment_type`(스펙 §8, 5유형): Direct · Dynamic · Runtime · Temporary · Emergency.

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Service Role Assignment 자체 = ABSENT**: 별도 assignment 기록 테이블 grep 0. api_key는 생성 시 `role` 컬럼이 즉시 고정되며(`Keys.php:81-133`·화이트리스트 `:95`) 이는 "배정 이벤트"가 아니라 "identity 생성과 동시 확정된 속성값"이다 — Direct/Dynamic/Runtime/Temporary/Emergency 어느 유형으로도 구분되지 않는다.
- **`Direct` 유형에 가장 근접**: api_key `create`(`Keys.php:81-133`)가 role을 즉시 확정한다는 점에서 개념적으로 "Direct(직접 배정)"에 가장 가깝다. 그러나 별도 assignment row·assignment_type 컬럼·이력 추적은 없다(role 값 자체가 곧 배정 상태).
- **`Temporary`/`Emergency` 유형 근접 substrate 없음**: api_key `expires_at`(`Db.php:942-958`·게이트 검사 `index.php:518-520`)은 identity 전체의 만료이지 "이 role 배정이 일시적"이라는 별도 개념이 아니다. 강제 max TTL도 없다(전수조사 §4 "생성 시 클라 지정·강제 max TTL 없음").
- **`Dynamic`/`Runtime` 유형 = 완전 ABSENT**: 요청 컨텍스트에 따라 role이 재계산되는 로직 grep 0. api_key role은 생성 시 고정되며 요청마다 재평가되지 않는다(전수조사 §1 "rotate 수동만" 대조).
- **cron/batch·omni_outbox = Assignment 대상 아님**: bin 35 cron은 `Db::pdo()` 공유 자격증명 직접 사용(`writeback_cron.php:37`·`Db.php:122-123`)으로 role assignment 개념 자체가 개입하지 않는다. `omni_outbox` claim_id(`Omnichannel.php:392`)는 동시성 락일 뿐 role 배정이 아니다(전수조사 §8, Part 3-3 정합 재확인).

## 5. 설계 원칙

- **api_key create 흐름을 Direct Assignment의 substrate로 확장**: 신규 Assignment 기록 테이블을 신설하되, `Direct` 유형은 기존 `Keys.php:81-133` create 흐름에 결합 이벤트 로깅을 추가하는 방향으로 확장한다(발명 아님, Golden Rule). `Dynamic`/`Runtime` 유형은 Part 3-4/3-5(Scoped/Dynamic Role) 선행 설계와 결합 필요.
- **Emergency 유형은 승인 경로 필요**: 스펙 §8 Emergency는 개념상 즉시 승인 우회 경로를 암시하므로, Decision Core(§1 선행조건)의 승인 정책과 결합 없이 단독 신설 금지(안전장치 부재 상태에서 Emergency 배정만 먼저 만들면 우회 통로가 된다).
- **Assignment 이력 = SecurityAudit tamper-evident 승격 대상**(ADR §3): 배정/회수 이벤트는 감사 가능해야 하며, 이는 Part 3-6 Secret Governance(§3-6-7)와 별개로 Assignment 자체의 감사 요건이다.

## 6. Gap / BLOCKED_PREREQUISITE

- Service Role(§3-6-2 자매편)·Service Identity Registry(§3-6-1 자매편) 둘 다 설계 명세 단계(코드 0)이므로 Assignment의 두 FK(`identity_ref`, `service_role_ref`)가 참조할 대상이 아직 확정되지 않았다.
- **BLOCKED_PREREQUISITE(RP-002)**: Part 3-3 Role Assignment(인간)가 실 구현이 아니라 설계 명세 단계이므로, Service Role Assignment가 그 패턴을 재사용/대비하는 설계도 코드 0 상태로만 진행 가능.
- `Dynamic`/`Runtime` 유형은 Part 3-5 Dynamic Role Governance의 Rule Evaluation 엔진(현재 순신규)이 선행되어야 실제 재계산 로직을 가질 수 있다 — 이번 차수는 유형 정의만 제공.
