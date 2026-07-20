# DSAR — Compliance Simulation (Part 3-17 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §24 — Compliance Simulation)

인가 컴플라이언스 상태에 **가상의 변경을 적용했을 때의 파급을 사전 산출**하는 what-if 엔진을 규정한다. 실제 통제/정책/증거를 변경하지 않고, 격리된 시나리오 위에서 결과 지표만 예측한다. 시나리오 변경 유형:

- **Regulation 변경** — 규제 조항 신설/개정/폐지가 요구 통제 집합에 미치는 영향.
- **Policy 제거** — 특정 정책 철회 시 요구 통제의 커버리지 손실.
- **Control 추가** — 신규 통제 도입 시 갭 축소·커버리지 증가.
- **Exception 증가** — 예외 승인 확대가 유효 통제 강도에 미치는 희석.

각 시나리오는 산출 영향 지표 `{compliance_score, audit_readiness, risk_score, control_coverage}` 델타를 반환하며, 원본 posture는 불변(read-only projection). 시뮬레이션 결과는 승인/의사결정 근거로만 사용되고 라이브 상태에 커밋되지 않는다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 라이브 readiness posture(baseline) | `Compliance.php:53-130`(flat readiness 산출) | 시뮬 baseline 소스로 참조 |
| Compliance 지표 집계 | `Compliance.php:143-190`(audit 통합) | baseline 지표 소스 |
| 감사 증적 봉인(시뮬 실행 기록) | `SecurityAudit.php:14-68`(append-only 해시체인) | 실행 로그 배선 대상 |
| What-if 시나리오 격리 실행 | — | **ABSENT(grep 0)** |
| Regulation/Policy/Control/Exception 델타 산출 | — | **ABSENT** |
| 지표 델타(score/readiness/risk/coverage) 예측 | — | **ABSENT** |

## 3. 설계 계약

1. `ComplianceSimulation::run(scenario) → projection` — scenario는 `{type: regulation|policy|control|exception, target_ref, mutation}`. baseline은 `Compliance.php:53-130` 현행 posture를 read-only로 복제.
2. projection은 baseline 대비 `{compliance_score, audit_readiness, risk_score, control_coverage}` 4지표 델타. 산출 로직은 `Compliance.php:143-190` 집계 경로의 순수함수 사본(부작용 0).
3. 라이브 상태 불변 보장 — 시뮬은 어떤 통제/정책/증거도 커밋하지 않는다(격리 projection).
4. 시뮬 실행 자체는 `SecurityAudit.php:14-68` 해시체인에 기록(누가·어떤 시나리오·언제)하되 결과는 근거 문서로만 사용.

## 4. KEEP_SEPARATE (흡수 금지)

- `ModelMonitor.php` — ML 모델 성능/드리프트 시뮬레이션. 인가 컴플라이언스 what-if 아님.
- `AnomalyDetection.php:2-6`,`:4-6` — SPC(통계적 공정관리) 이상탐지. 규제 시나리오 시뮬 아님.
- `Risk.php:12`,`:149-152` — 마케팅 캠페인 risk 산정. 컴플라이언스 risk_score와 도메인 분리.

## 5. 판정

**ABSENT** — Regulation/Policy/Control/Exception 시나리오 격리 실행·지표 델타 예측 grep 0. Compliance 시뮬레이션 엔진 전무. 현행은 `Compliance.php:53-130` flat readiness posture와 `:143-190` audit 통합, `SecurityAudit.php:14-68` 봉인뿐 — what-if 투영 계층 없음. → **순신설**(격리 projection 엔진). 코드 변경 0 · BLOCKED_PREREQUISITE(선행: Control/Policy/Regulation 정본 모델·커버리지 산정 함수 정의).
