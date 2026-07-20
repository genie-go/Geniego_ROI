# DSAR — RBAC Analytics & Governance Dashboard: 영향 시뮬레이션 (APPROVAL_ANALYTICS_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_SIMULATION`은 authz 거버넌스 변경을 **집행 전 what-if 시뮬레이션**하여 영향을 예측하는 엔티티다. SPEC §34가 시나리오 4종·영향 4축을 규정한다.

| 시나리오(입력) | SPEC 근거 | 영향 지표(출력) | SPEC 근거 |
|---|---|---|---|
| Policy Change | §34(SPEC:513) | Risk 감소 | §34(SPEC:520) |
| Role Reduction | §34(SPEC:514) | Approval 증가 | §34(SPEC:521) |
| JIT Adoption | §34(SPEC:515) | Runtime Latency 변화 | §34(SPEC:522) |
| SoD 강화 | §34(SPEC:516) | Compliance Score 변화 | §34(SPEC:523) |

API §39 `Simulation 실행`(SPEC:587)로 노출된다. 산출은 읽기전용 예측이며 실 집행(원천 통제 변경)은 없다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Simulation 전용 엔진(what-if 영향분석) | **ABSENT(grep 0)** | GT② §2(authz Snapshot/…/**Simulation**/Reconciliation substrate grep 0) |
| 소스 상태(시뮬레이션 대상) | PRESENT | `TeamPermissions.php:10`(acl_permission·`scopeSqlNamed` `:738-750`)·`AccessReview.php:87-122`(api_key 검토 classify) |
| SoD 실집행 선례(강화 시나리오 참조) | PARTIAL | `Mapping.php:268-271`(SoD 실집행 선례·%-KPI 아님·GT② §2) |
| 결과 증거 저장 | PARTIAL(재활용) | `SecurityAudit.php:14-33`(append-only) — 시뮬레이션 실행 증거 기록 substrate |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(신규)**: `simulation_id`·`tenant_id`·`scenario_type`(Policy Change/Role Reduction/JIT Adoption/SoD 강화)·`input_delta`(변경 제안)·`impact`(risk_delta/approval_delta/latency_delta/compliance_delta)·`run_at`·`analytics_version`.
- **상태**: `REQUESTED → COMPUTED → EVIDENCE_RECORDED`. 실 집행 없음(읽기전용 예측).
- **제약**: 테넌트 격리 필수(§40·ADR D-6). 영향 4축은 §20 KPI Engine 산출식과 동일 버전(KPI Formula Version §40)에 고정. Role Reduction/SoD 강화 시나리오는 실 role/SoD 통제(Part 3-9/3-10) 모델을 읽어 계산(ADR D-7 읽기 소비·무중복).
- **substrate 재사용**: 시뮬레이션 실행 증거는 `SecurityAudit.php:14-33` 체인 재활용(ADR D-4).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★**Simulation ≠ Mmm/AutoRecommend**: `Mmm.php:24`(믹스모델·adstock·forecast/frontier)·`AutoRecommend.php:40`(예산배분·베이즈·UCB bandit)은 **마케팅 최적화 시뮬레이션**으로 `performance_metrics`/`channel_orders` 소스다(GT② §B-1·§B-2). 본 엔티티는 authz 정책·역할·JIT·SoD 변경의 거버넌스 영향분석으로 데이터 소스·목적이 완전 분리된다. Mmm frontier·bandit 로직을 흡수·개명 절대 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT-순신규**. authz what-if Simulation 엔진 grep 0(GT② §2). 그린필드.
- **재활용(흡수 아님·확장)**: 소스 상태 `TeamPermissions.php:10`·`:738-750`·`Mapping.php:268-271`(SoD 참조)·`SecurityAudit.php:14-33`(실행 증거).
- **선행 의존(★강)**: SPEC §34 4축 영향분석은 선행 **Part 3-9(JIT)·3-10(Runtime SoD Enforcement)** 엔진 실 구현에 의존한다(ADR 선행계보·D-7). §20 KPI Engine 산출식 부재 시 영향 정량화 불가(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진은 선행 Decision Core 인증 후 RP-track 승인세션.
