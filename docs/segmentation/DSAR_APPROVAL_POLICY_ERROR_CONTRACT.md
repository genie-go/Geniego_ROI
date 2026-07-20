# DSAR — PDP/PEP Governance: 에러 계약 (Part 3-12 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §27은 결정 파이프라인 실패 시 반환할 7개 결정론적 에러코드를 정의한다: **PDP_TIMEOUT**, **PEP_FAILURE**, **POLICY_NOT_FOUND**, **POLICY_EVALUATION_FAILED**, **CONTEXT_NOT_AVAILABLE**, **DECISION_CACHE_CORRUPTED**, **DECISION_GENERATION_FAILED**. 모든 에러는 SPEC §10 기본 결합규칙(Deny Overrides) 하에서 **fail-closed**(deny)로 귀결해야 하며, SPEC §32 성능(P95≤15ms)이 PDP_TIMEOUT 임계의 근거다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 에러코드 | 판정 | 재활용/신규 근거 |
|---|---|---|
| PDP_TIMEOUT | **ABSENT** | 중앙 PDP·타임아웃 계약 부재(GT② §2 통합 PDP ABSENT). SPEC §32 P95≤15ms 임계는 순신규 |
| PEP_FAILURE | **PARTIAL** | 분산 PEP 실집행(`requireTeamWrite` `UserAuth.php:1134`·`guardWarehouse` `Wms.php:557`·`guardTeamWrite` `index.php:78-89`) 존재하나 통일 에러코드 없이 개별 403 |
| POLICY_NOT_FOUND | **ABSENT** | Policy Registry/Version 부재(GT② §2)로 조회대상 자체가 그린필드 |
| POLICY_EVALUATION_FAILED | **PARTIAL** | proto-PDP `effectiveForUser`(`TeamPermissions.php:393-421`)·`effectiveScope`(`:236-265`)는 fail-closed(`__deny__` `:234`) 반환하나 표준 에러계약 미구조화 |
| CONTEXT_NOT_AVAILABLE | **PARTIAL** | 컨텍스트 수집(`UserAuth.php:3446-3454` clientIp·auth_tenant `index.php:608-619`) 존재·결손 시 표준코드 없음 |
| DECISION_CACHE_CORRUPTED | **ABSENT** | Decision Cache 부재(`TeamPermissions.php:202-225` 매 호출 재계산·GT② §2) |
| DECISION_GENERATION_FAILED | **PARTIAL** | Decision Types(mfa Challenge `UserAuth.php:929-964`·Read-only `:1128`) 집행하나 생성실패 표준코드 없음 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **fail-closed 원칙(§10·§25)**: 7개 에러 전부 deny로 귀결. 어떤 실패도 Permit로 폴백 불가. `__deny__` 센티넬(`TeamPermissions.php:234`)을 전역 fail-closed 표준으로 승격(ADR D-4).
2. **PDP_TIMEOUT**: SPEC §32(P95≤15ms·P99≤40ms) 초과 시 반환·deny. 중앙 PDP 신설과 결합.
3. **PEP_FAILURE**: 분산 PEP(`UserAuth.php:1134`·`Wms.php:557`) 강제 실패를 단일 코드로 표준화. 중앙 PEP(`index.php:78-89`) 경로 포함.
4. **POLICY_NOT_FOUND / POLICY_EVALUATION_FAILED**: Policy Registry(ADR D-3)·`effectiveForUser`(`:393-421`) 평가 예외를 구조화. rule/scope trace를 Evidence(`SecurityAudit.php:12-53`)에 기록.
5. **CONTEXT_NOT_AVAILABLE / DECISION_CACHE_CORRUPTED / DECISION_GENERATION_FAILED**: 컨텍스트 결손·캐시 오염(§25 Cache Poisoning 가드 연동)·결정 생성실패를 각각 표준코드로 반환·감사(`UserAuth.php:4174`).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

본 에러계약은 **authz 결정 실패** 전용이다. 마케팅/ops의 실패·예외는 별개(GT② §5): Catalog `evaluatePolicy`(`Catalog.php:1104`)·RuleEngine(`RuleEngine.php:24`)·Decisioning ingest 실패(`Decisioning.php:36`)·action_request policy(`Db.php:576`·`routes.php:439-445`)·PgSettlement recon(`routes.php:655`). 이들 도메인 에러는 PDP 에러코드로 매핑 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** PDP_TIMEOUT·POLICY_NOT_FOUND·DECISION_CACHE_CORRUPTED = **ABSENT(순신규)**. PEP_FAILURE·POLICY_EVALUATION_FAILED·CONTEXT_NOT_AVAILABLE·DECISION_GENERATION_FAILED = **PARTIAL** — fail-closed substrate(`__deny__` `:234`·분산 PEP·Decision Types) 위에 표준코드 신설. 선행의존: 중앙 PDP·Decision Cache(ADR D-1·D-3) 구축 후 성립(BLOCKED_PREREQUISITE). Part 1~3-11 인증 후 RP-track 실구현.
