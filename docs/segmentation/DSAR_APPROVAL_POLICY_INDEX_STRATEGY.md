# DSAR — PDP/PEP Governance: 인덱스 전략 (Policy·Version·Subject·Resource·Action·Decision·Snapshot) (Part 3-12 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §31은 7개 인덱스 축을 요구한다: **Policy**·**Version**·**Subject**·**Resource**·**Action**·**Decision**·**Snapshot**. 이는 PDP 결정 파이프라인(§8)과 Decision Cache(§14 subject/resource/action/context-hash)·Analytics(§17)·Explain(§16 조회)의 조회 경로를 O(log n)으로 지지하기 위한 것으로, §32 성능(P95≤15ms) 목표와 직접 결합한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 인덱스 축 | 판정 | 근거(파일:라인) |
|---|---|---|
| Policy / Version | **ABSENT** | authz 정책·버전 전용 구조 grep 0(GT②§2). 인덱싱 대상 테이블 부재. de-facto PAP CRUD는 버전 없음(`TeamPermissions.php:598-692`) |
| Subject | **PARTIAL** | subject 속성원 실존(`UserAuth.php:256-268` team_role/plan/parent_user_id/tenant_id, GT①§D)이나 authz decision 조회용 subject 인덱스 아님 |
| Resource / Action | **PARTIAL** | RBAC menu→actions(`TeamPermissions.php:39`·`:152-159`·`:202-213`)·ABAC scope(`:160-166`·`:215-225`, GT①§D). 리소스/액션 authz decision 인덱스 미존재 |
| Decision | **ABSENT** | Runtime Decision Cache 전무(subject/resource/action/context-hash→decision·`TeamPermissions.php:202-225` **매 호출 DB 재계산**, GT②§2). 인덱스 대상 decision 테이블 없음 |
| Snapshot | **ABSENT** | authz decision snapshot 테이블 부재(GT②§2). 근접=SecurityAudit 해시체인(`SecurityAudit.php:12-68`)은 체인 순차·decision 인덱스 아님 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Policy/Version 인덱스**: `APPROVAL_POLICY(policy_id, tenant_id)`·`APPROVAL_POLICY_VERSION(policy_id, version, status)` — PAP 게시·조회(§7·§29 Publish/Query). 현행 `TeamPermissions.php:598-692` 위 버전 계층에 부착(ADR§D-3).
- **Subject/Resource/Action 인덱스**: Decision Cache 키(§14) `(subject, resource, action, context_hash)` 복합 인덱스 — `UserAuth.php:256-268` 세션 subject·`TeamPermissions.php:39` ACTIONS 8동작 기반.
- **Decision 인덱스**: `APPROVAL_POLICY_DECISION(tenant_id, subject, decision, ts)` — Analytics(§17 Permit/Deny/Cache Hit)·Explain 역조회(§16). 현행 매 요청 재계산(`:202-225`)을 캐시+인덱스로 대체.
- **Snapshot 인덱스**: `APPROVAL_POLICY_SNAPSHOT(request_id, policy_version, ts)` — Reconciliation(§20)·Revalidation(§19) 조회. SecurityAudit 체인(`SecurityAudit.php:12-53`) 병행.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE(GT②§5)**: `attribution_model_cache`(마케팅)·PriceOpt/AdminGrowth simulate·ModelMonitor drift 인덱스는 authz decision 인덱스 아님. 흡수·개명 금지.
- **선행의존**: Decision/Snapshot 인덱스는 §30 DB Constraint(Immutable Version/Snapshot 테이블) 신설 후에만 정의 가능. Part 1~3-11 인증 의존(BLOCKED_PREREQUISITE).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**authz Policy/Version/Decision/Snapshot 인덱스 = ABSENT(순신규·인덱싱 대상 테이블 자체 부재).** Subject/Resource/Action은 속성 substrate만 PARTIAL 실존(`UserAuth.php:256-268`·`TeamPermissions.php:39-41`). Decision Cache 부재로 현행은 매 호출 DB 재계산(`:202-225`). 인덱스 실 정의·성능검증은 §30 테이블 선행 후 **RP-track 실구현 조건**(코드0·NOT_CERTIFIED). 마케팅 캐시 인덱스 흡수 금지.
