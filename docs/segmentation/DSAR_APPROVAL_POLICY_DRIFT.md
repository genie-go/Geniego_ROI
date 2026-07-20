# DSAR — PDP/PEP Governance: 인가 결정 드리프트 (APPROVAL_POLICY_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_DRIFT`(SPEC §2 Canonical Entity)는 인가 정책·런타임·결정 상태가 **의도(선언된 Policy Version)와 실제(집행 결과) 사이에서 시간에 따라 벗어나는 편차를 탐지**하는 엔티티다. SPEC §18(Drift Detection)은 4종 드리프트를 규정한다.

| 드리프트 유형(SPEC §18) | 의미 |
|---|---|
| Policy Drift | 게시된 정책 버전과 실제 적용 버전의 불일치 |
| Decision Drift | 동일 Request에 대한 결정이 시간 경과로 변화 |
| Runtime Drift | Runtime Context(SPEC §13)와 정책 전제의 이탈 |
| Scope Drift | data_scope 강제 범위와 선언된 Scope의 이탈 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거 |
|---|---|---|
| authz Decision Drift 엔진 | **ABSENT(grep 0)** | GT② §2 "Decision Analytics/Drift/Simulation/Reconciliation(authz)=ABSENT" · GT② §1 `policy_version\|pdp\|pep` authz 매치 0건 |
| Drift 비교 기준선(정책 버전) | **ABSENT** | Policy Registry/Version 부재(GT② §2). 정책은 코드 if 분기·DB 권한행(`acl_permission`/`data_scope`·`TeamPermissions.php:152-166`)에 암묵 내장 |
| 드리프트 재계산용 결정 스냅샷 | **PARTIAL** | 결정 스냅샷 전용 부재. SecurityAudit 해시체인(`SecurityAudit.php:12-68`)은 문자열 detail·rule/scope trace 미기록(GT② §2) |
| Scope 강제 실측점(Scope Drift 관측대상) | **PRESENT** | `scopeSql`/`scopeSqlNamed`(`TeamPermissions.php:286-322`)·`__deny__`(`:234`) — 관측대상이지 드리프트 탐지 아님 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: Policy Version(baseline) + Runtime Decision(observed) + Decision Snapshot(SPEC §22) + Runtime Context(SPEC §13).
- **드리프트 4축**: `drift_type`∈{POLICY, DECISION, RUNTIME, SCOPE}(SPEC §18). 각 축은 baseline↔observed 델타로 산출.
- **상태**: `DETECTED` → `ACKNOWLEDGED` → `RESOLVED`(정책 재게시 또는 캐시 무효화). Runtime Drift는 SPEC §28 Warning Contract의 `Runtime Drift` 경고와 결합.
- **제약**: 테넌트 격리 절대(SPEC §30 Tenant Isolation·`index.php:619` X-Tenant-Id 재활용). Drift는 관측·경고 산출만 하며 결정을 직접 변경하지 않음(트리거→Revalidation으로 위임, ADR §D-1 Decision Pipeline).
- **결합**: 탐지된 드리프트는 `APPROVAL_POLICY_REVALIDATION`(SPEC §19) 트리거로 전달. Reconciliation(SPEC §20)과 상호보완(Reconciliation=상태 비교, Drift=시간 편차).

## 4. KEEP_SEPARATE (마케팅 policy/drift/simulate/recon 흡수금지)

★동음이의 엄격 분리(GT② §5 C-3). 본 엔티티의 drift는 **authz 결정 드리프트**이며 다음과 코드·데이터 공유 없음:

- **ModelMonitor.php:220-335** = ML 모델 드리프트(예측 성능 편차). authz Decision Drift 아님. 흡수·개명 금지.
- Catalog `evaluatePolicy`(`Catalog.php:1104`)·RuleEngine(`RuleEngine.php:24`)·Decisioning(`Decisioning.php:12`)의 policy/decision = 마케팅·커머스(GT② §5 C-1). authz policy 아님.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. authz Decision Drift 엔진은 grep 0(GT②·ADR §2.2). 순수 신설.
- **재활용(흡수 아님)**: baseline은 신설 Policy Version, 관측대상은 `scopeSql`(`:286-322`)·`__deny__`(`:234`), 증거는 SecurityAudit(`SecurityAudit.php:12-68`) 확장(ADR §D-5).
- **선행의존(BLOCKED_PREREQUISITE)**: Drift는 Policy Version baseline과 Decision Snapshot이 선행 존재해야 성립 → Policy Registry/Version·중앙 PDP(effectiveForUser 승격·ADR §D-1) 완료 후 실 구현. 코드 변경 0 · NOT_CERTIFIED. 하드코딩 authz 61+12개소(GT② §4)는 부채≠결함·재플래그 금지(ADR §D-8).
