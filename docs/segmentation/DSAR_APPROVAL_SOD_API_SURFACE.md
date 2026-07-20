# DSAR — Runtime SoD Enforcement: API 표면 (Part 3-10 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §35 API는 SoD 거버넌스 최소 8엔드포인트다: Conflict Rule 생성·Conflict Matrix 조회·Runtime Evaluation·Conflict Simulation·Exception 등록·Override 요청·Analytics 조회·Explain Conflict. 전부 신규 표면이며 기존 승인/인가 라우트와 **분리(KEEP_SEPARATE)** 된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §35 엔드포인트 | 판정 | 인접 substrate | GT 인용 |
|---|---|---|---|
| Conflict Rule 생성 | **ABSENT** | Conflict Rule Registry grep 0 | GT②2 첫 행 |
| Conflict Matrix 조회 | **ABSENT** | Conflict Matrix 구조 0(SAML `SPSSODescriptor` 오탐만) | GT②2 |
| Runtime Evaluation | **ABSENT** | 매 요청 충돌평가 grep 0. 인가 게이트는 RBAC(재활용 PEP) | `index.php:572-611`(GT②2.2·ADR D-1) |
| Conflict Simulation | **ABSENT** | SoD 시뮬 코드경로 0 | GT②2·B-6 |
| Exception 등록 | **ABSENT** | SoD 예외 워크플로 부재 | GT②2 |
| Override 요청 | ABSENT(패턴만) | break-glass 비상경로 substrate | `UserAuth.php:790-801`(GT①§F) |
| Analytics 조회 | **ABSENT** | SoD 전용 Analytics 스키마 0 | GT②2 |
| Explain Conflict | **ABSENT** | 설명가능 충돌해소 코드 0 | GT②2·ADR §4 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **8엔드포인트 전부 순신규 라우트**: 기존 approval 라우트와 별개로 신설(ADR §4). 인가는 중앙 api_key RBAC 게이트(`index.php:572-611`) 아래에 배치하고, admin scope(예: `admin:keys`/`write:*`) 검사를 재활용.
- **Runtime Evaluation은 PEP 재활용 위에 얹음**: 매 요청 평가 종단은 §31 Runtime Guard(별도 DSAR)이며, `/…/runtime-evaluation` 엔드포인트는 명시적 평가/시뮬 호출을 노출(ADR D-1). 테넌트 격리는 `index.php:614-619` 서버도출 강제 재활용.
- **성능 계약**: Explain Generation ≤ 100ms·Simulation ≤ 3초·Runtime Evaluation ≤ 10ms(§38). Analytics는 §26 지표(Blocked Requests·Exception/Override Usage·Top Violated Rules)를 반환.
- **증거 결선**: Exception/Override 등록·요청은 SecurityAudit 불변체인 기록(`SecurityAudit.php:14-33`)과 대응(ADR D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **기존 승인 라우트 흡수 금지**: `Mapping.php`(self-approval dual-control)·`Alerting.php`(action_request·VACUOUS)·`AdminGrowth.php:1294`·`:1313-1331`(단일 admin decide)·`Catalog.php:2383-2407`(approveQueue 단일승인)는 dual-control/단일승인이지 SoD API 아님(GT② B-2·B-5). 신규 SoD 8엔드포인트는 이들과 라우트 분리.
- **Alerting VACUOUS = 수정 대상 아님**: `Db.php:592-600` maker 부재·생산자 0(기존 확정)은 Part 3-10 설계 범위 밖 — 재플래그·수정 금지(GT②5·ADR D-3/D-7).
- **비즈 simulate ≠ Conflict Simulation**: `RuleEngine.php`/`Decisioning.php`/`PriceOpt.php` 시뮬은 비즈 도메인이지 SoD Simulation 아님(GT② B-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

API 표면 **8엔드포인트 전부 ABSENT·순신규**. 라우팅·RBAC scope 게이트·cross-tenant·SecurityAudit는 **재활용 substrate**이나 SoD 엔드포인트 자체는 그린필드. 기존 approval 라우트는 KEEP_SEPARATE(개명·흡수 금지). 코드 변경 0·NOT_CERTIFIED. 선행: Conflict Rule/Matrix/Evaluator/Exception/Analytics 신설(ADR D-1/D-2/D-4/D-5) 후 배선(BLOCKED_PREREQUISITE).
