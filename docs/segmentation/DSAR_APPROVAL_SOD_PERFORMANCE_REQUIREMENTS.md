# DSAR — Runtime SoD Enforcement: 성능 요구사항 (Performance Requirements) (Part 3-10 §38)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §38은 SoD 런타임 강제의 6개 성능 SLO를 규정한다.

| # | 지표 | 목표 | SPEC |
|---|---|---|---|
| P1 | Runtime Conflict Evaluation | ≤ 10ms | §38·§22 |
| P2 | Conflict Lookup | ≤ 5ms | §38 |
| P3 | Explain Generation | ≤ 100ms | §38·§35(Explain Conflict) |
| P4 | Simulation | ≤ 3초 | §38·§30 |
| P5 | Cache Hit | ≥ 97% | §38 |
| P6 | False Positive | ≤ 0.5% | §38 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

**성능 대상 코드경로(Runtime Conflict Evaluator) 자체가 ABSENT** → 측정·벤치마크 대상 전무. 지연예산이 얹힐 삽입지점(PEP)만 실존.

| 지표 | 판정 | 근거(GT/ADR) |
|---|---|---|
| P1 Runtime Eval ≤10ms | **ABSENT(삽입지점만 실존)** | Runtime Conflict Evaluator grep 0(GT② §2). 얹힐 PEP=`index.php:572-611`(매 요청 인가 게이트) — 정적 RBAC 판정 **후** SoD 평가 삽입(ADR D-1). 10ms 예산=이 핫패스 오버헤드 상한 |
| P2 Lookup ≤5ms | **ABSENT** | Conflict Rule/Matrix 룩업 대상 테이블 부재(GT② §2). §37 인덱스 신설 종속 |
| P3 Explain ≤100ms | **ABSENT** | Explain Conflict(§35) 코드 0. Evidence 재활용 후보=`SecurityAudit.php:14-33` |
| P4 Simulation ≤3s | **ABSENT** | SoD Simulation 코드경로 0(GT② §2). 비즈 simulate(`RuleEngine.php`/`Decisioning.php`/`PriceOpt.php`)는 무관 decoy(GT② B-6) |
| P5 Cache Hit ≥97% | **ABSENT** | SoD 캐시층 부재 |
| P6 False Positive ≤0.5% | **ABSENT** | 충돌평가 로직 부재로 FP 측정 불가 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **P1 지연예산의 위치**: SoD Evaluator는 매 요청 게이트(`index.php:572-611`) 이후 실행되므로 10ms는 **요청 임계경로 예산**. 활성 역할집합 룩업(§37 Role 인덱스)+Matrix 조회가 이 안에 완결(ADR D-1).
- **P2/P5**: Conflict Matrix는 테넌트별 준정적 → 캐시 워밍 후 ≥97% 히트로 Lookup ≤5ms 달성. 규칙 불변(§36 Immutable)이므로 무효화 빈도 낮음(ADR D-2).
- **P3**: Explain은 저장된 Evidence/Snapshot(`SecurityAudit.php:14-33` 재활용)을 조립 → 비임계경로 100ms.
- **P4**: Simulation(§30 New Rule/Role 영향분석)은 배치성 3초.
- **P6**: FP ≤0.5%는 Conflict Matrix 정확도·Temporal 창 정밀도(ADR D-4)에 의존.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: PEP 게이트(`index.php:572-611`)의 기존 RBAC 스코프 판정 지연은 SoD 예산과 별개(ADR D-1 "정적 RBAC 판정 후"). 비즈 simulate/드리프트(GT② B-6) latency와 무관.
- **선행의존**: 모든 SLO는 §36 테이블·§37 인덱스·Runtime Evaluator 신설 후에만 측정 가능 → 벤치마크는 실 구현 산출물. 이 repo는 구성된 테스트/벤치 스크립트 부재(CLAUDE.md) → 성능 검증도 RP-track 신설.

## 5. 판정

**NOT_CERTIFIED · 코드 0.** 6개 성능 SLO의 측정 대상(Runtime Conflict Evaluator·Lookup·Explain·Simulation·Cache) 전부 ABSENT. 유일 실존=지연예산이 얹힐 PEP 삽입지점(`index.php:572-611`)과 Evidence 재활용 후보(`SecurityAudit.php:14-33`). Performance Benchmark(≤10ms Runtime Eval 등)는 **RP-track 실 구현 조건**(SPEC §40 Performance Benchmark 통과·ADR §5) — 선행 Decision Core Part 1~3-9 인증 후. Extend-only·무후퇴.
