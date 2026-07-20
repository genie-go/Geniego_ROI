# DSAR — PDP/PEP Governance: 인가 결정 재검증 (APPROVAL_POLICY_REVALIDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_REVALIDATION`(SPEC §2)은 캐시된/기존 인가 결정이 **특정 변경 이벤트에 의해 더 이상 유효하지 않을 수 있을 때 재평가를 트리거**하는 엔티티다. SPEC §19(Revalidation)는 4종 트리거를 규정한다.

| 재검증 트리거(SPEC §19) | 의미 |
|---|---|
| Policy 변경 | 정책 버전 게시/폐기 |
| Runtime 변경 | Runtime Context(SPEC §13) 이탈 |
| Assignment 변경 | 역할/권한/scope 부여 변경 |
| Context 변경 | 세션/Risk/환경 변화 |

- SPEC §15(Cache Invalidation)와 짝을 이룸(재검증은 무효화의 능동 재평가 측면).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거 |
|---|---|---|
| authz Revalidation 엔진 | **ABSENT(grep 0)** | GT② §2 Decision Cache/Invalidation ABSENT · GT② §1 authz 매치 0건 |
| 재평가 대상 결정함수 | **PARTIAL(proto)** | `effectiveForUser`(`TeamPermissions.php:393-421`)·`effectiveScope`(`:236-265`) — 재평가 근접이나 미배선(GT① §C) |
| Assignment 변경 관측점(트리거원) | **PARTIAL(PAP)** | `putTeamPermissions`/`putMemberPermissions`(`TeamPermissions.php:598-692`)·`replaceScope`(`:337-346`) = 파괴적 교체·버전 없음(GT② §2). 변경 이벤트원이나 트리거 발행 부재 |
| Context/Risk 변경원 | **PARTIAL** | 세션 메타(`UserAuth.php:4243-4250` recordSessionMeta)·risk 컬럼(`:4165`·정적 문자열·PDP 미소비·GT① §D) |
| 재검증 후 무효화 대상 캐시 | **ABSENT** | Decision Cache 전무(GT② §2 매 호출 DB 재계산) → 무효화할 캐시 자체 부재 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **트리거 모델**: `reval_trigger`∈{POLICY, RUNTIME, ASSIGNMENT, CONTEXT}(SPEC §19). 각 트리거는 영향받는 Decision Cache 엔트리(subject/resource/action/context-hash·SPEC §14) 집합을 지정.
- **동작**: 트리거 발생 → 대상 결정 재평가(중앙 PDP) → 결과 상이 시 캐시 무효화(SPEC §15) + 재발행. 상태 `TRIGGERED` → `REVALIDATED` → `INVALIDATED`(변경) / `CONFIRMED`(불변).
- **제약**: 테넌트 격리 절대(SPEC §30·`index.php:619`). 재검증은 결정론 유지(SPEC §4). Drift 탐지(SPEC §18) 결과를 트리거 입력으로 수용(Drift→Revalidation 위임·본 DSAR §1 결합).
- **결합**: Reconciliation(SPEC §20)과 구분 — Revalidation=변경 트리거 재평가(선제), Reconciliation=현재 상태 3자 비교(사후).
- **선행 의존**: 재검증은 Decision Cache(순신규·ADR §D-3)와 중앙 PDP(effectiveForUser 승격·ADR §D-1)가 선행. 무효화(SPEC §15)는 Cache 존재 전제.

## 4. KEEP_SEPARATE (마케팅 policy/drift/simulate/recon 흡수금지)

★동음이의 엄격 분리(GT② §5). Revalidation은 순신규 개념으로 저장소에 재활용 대상 근접물이 없다(마케팅 recon과도 무관):

- **PgSettlement**(`routes.php:655`)·**Connectors.php:902**(ROAS)·**Wms.php:2160**·**KrChannel.php:419** = 정산/ROAS/재고 reconciliation(GT② §5 C-3). authz 재검증 아님·흡수 금지.
- `action_request.policy_id`(`Db.php:576`)·`alert_policies`(Alerting)·maker-checker(`Mapping.php:269`) = 알림/액션 거버넌스(GT② §5 C-2). authz 재검증 아님.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. authz Revalidation 엔진 grep 0(GT②·ADR §2.2).
- **재활용(흡수 아님)**: 재평가함수는 신설 중앙 PDP(effectiveForUser·`:393-421` 승격), 변경 이벤트원은 PAP CRUD(`:598-692`)·세션 메타(`UserAuth.php:4243-4250`).
- **선행의존(BLOCKED_PREREQUISITE)**: Decision Cache·중앙 PDP 선행 필수. 코드 변경 0 · NOT_CERTIFIED. 하드코딩 authz 61+12개소(GT② §4)는 부채≠결함·재플래그 금지(ADR §D-8).
