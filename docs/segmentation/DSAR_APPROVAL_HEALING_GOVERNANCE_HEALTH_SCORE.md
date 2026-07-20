# DSAR — Authorization Governance Health Score (Part 3-20 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_GOVERNANCE_HEALTH_SCORE`는 인가(Authorization) 거버넌스 건강도를 6개 하위 축으로 0–100 정규화하여 단일 종합 점수로 집계하는 **읽기 전용 관측 계약**이다.

- **Policy Health**: 정책 정합성·고아 정책·상충률.
- **Runtime Health**: 런타임 권한 해석 일관성·캐시 신선도.
- **Compliance Health**: SoD/JIT/최소권한 준수율.
- **Federation Health**: SSO·외부 identity 매핑 정합성.
- **AI Governance Health**: ABAC/Rule 기반 자동 결정의 근거·신뢰도 커버리지.
- **Overall Health**: 위 5축 가중 종합(0–100) + Readiness 라벨(READY/WARNING/BLOCKED).

점수는 **자동 집행 트리거가 아니다** — 관측·경보·리포트 전용. 어떤 점수도 Safety Guardrail(자동삭제 금지)을 우회하지 못한다.

## 2. Substrate 매핑

| SPEC 축 | 현행 substrate | 관계 | 인용 |
|---|---|---|---|
| Compliance Health(인접) | SOC2/ISO readiness 산출 | **인접 패턴** — authz score 아님 | `Compliance.php:53`,`:120`,`:124` |
| Policy/Runtime Health 원천 | Access Review 집계 | 부분 신호원(집계만) | `AccessReview.php:141-171` |
| Evidence 무결성 참조 | append-only 해시체인 | 증거 신뢰 원천 | `SecurityAudit.php:56-68` |
| Overall Health 종합 | — | ABSENT(grep 0) | 없음 |

현행 `Compliance.php:120`의 readiness는 컴플라이언스 프레임워크(SOC2/ISO) 준비도이며, **인가 거버넌스 건강 점수와 의미가 다르다**. `AccessReview.php:141-171`은 리뷰 항목 집계를 제공하나 6축 정규화·종합 점수는 부재하다.

## 3. 설계 계약

- **입력**: Access Review 집계, Compliance readiness(인접, 직접 재사용 금지·별도 축), SecurityAudit 증거 무결성 상태.
- **정규화**: 각 축 0–100, 결측 축은 점수 미산입 + `coverage_gap` 플래그(임의 기본값 금지 — 실제값 자동산출 원칙).
- **종합**: 가중합 → Overall + Readiness 라벨. 가중치는 SPEC 상수, 하드코딩 점수 금지.
- **출력**: 읽기 전용 스냅샷 + 시계열. **집행·삭제·차단 부작용 0**.
- **테넌트 격리**: 점수는 테넌트별 산출, 크로스테넌트 집계 금지.
- **무후퇴**: 기존 Compliance readiness·AccessReview 출력 불변 — 본 스코어는 상위 관측 레이어로만 추가.

## 4. KEEP_SEPARATE

- `AnomalyDetection.php:3` — 데이터 이상탐지 엔진. 인가 거버넌스 점수와 도메인 상이, 병합 금지.
- `ModelMonitor.php:221` — 모델 모니터링. AI Governance Health의 신호원이 될 수 있으나 **엔진은 분리 유지**.

## 5. 판정

**ABSENT** — authz governance health score는 grep 0. 현행 `Compliance.php:53`·`:120`·`:124`는 컴플라이언스 프레임워크 readiness(인접 패턴, authz score 아님)이고 `AccessReview.php:141-171`은 리뷰 집계만 제공한다. 6축 정규화·Overall Health 종합은 부재하므로 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 foundation 미확정).
