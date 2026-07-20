# DSAR — Authorization Control Simulation (Part 3-19 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Control Simulation이란 **인가 제어면 변경을 프로덕션에 적용하기 전에**, 가상의 상태 전이(what-if)를 실행하여 영향을 사전 산정하는 거버넌스 계약이다. 파괴적 롤아웃을 실집행 이전 게이트로 차단한다. §27은 네 시나리오와 네 영향축을 정의한다.

| 시뮬레이션 시나리오 | 정의 |
|---|---|
| Global Rollout | 전 테넌트/전 리전 동시 정책 배포의 예측 파급 |
| Region Failure | 특정 리전 제어면 장애 시 잔여 리전의 유효 인가 부하 |
| Policy Upgrade | 정책 스키마/규칙 상향 시 기존 부여의 재판정 결과 |
| Configuration Upgrade | 설정 파라미터 변경 시 제어 결정의 편차 |

| 영향축 | 산정 대상 |
|---|---|
| Availability | 시뮬레이션 후 제어면 가용성 저하 여부 |
| Runtime Latency | 인가 판정 경로의 추가 지연 |
| Compliance | 규제/정책 위반 신규 노출 여부 |
| Decision Accuracy | 재판정 결과의 정오(허용/거부) 편차 |

## 2. Substrate 매핑
| 계약 요구 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| 변경 이전 상태 스냅샷 | AdminPlans 미러 | `AdminPlans.php:53-72` | 정적 미러만(가상 전이 실행 없음) |
| 선언 설정 원천 | app_setting | `Db.php:308-321` | 입력값 존재(시뮬 엔진 없음) |
| 가용성 관측 | Health probe | `Health.php:102-103` | 실측만(예측 미지원) |
| 변경 감사 기록 | SecurityAudit | `SecurityAudit.php:14-64` | 사후 기록(사전 what-if 없음) |

## 3. 설계 계약
- **ControlSimulator(순신설)**: 제안 변경(diff)을 입력받아 현행 상태 스냅샷 위에서 가상 재판정을 실행, 시나리오별 4영향축 벡터를 산출한다. **부작용 없는 read-only 평가** — 실 정책/설정에 쓰기 금지.
- **게이트 연동**: Global Rollout·Policy Upgrade 시나리오가 Compliance 또는 Decision Accuracy 임계 초과 시 실집행 승인 큐를 차단(fail-closed).
- **결과 보존**: 시뮬레이션 산출물은 append-only 감사 흐름(`SecurityAudit.php:56`)에 근거로 첨부(승인 판단 추적성).
- **선행 의존**: Control Plane 스냅샷·유효 상태 모델 부재로 가상 전이 대상이 미완 → BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE
- 본 시뮬레이션은 **인가 제어면 전용**이다. 재무 정산 예측(`PgSettlement.php:215`·`:295`)·재고 이동 시뮬은 도메인이 달라 흡수 금지.
- ML 예측 모델 평가(`ModelMonitor.php:21`)와 혼동 금지 — 통계 예측이 아닌 규칙 재판정이다.

## 5. 판정
**ABSENT** — control 시뮬레이션 코드 전무(grep 0). 현행은 정적 미러(`AdminPlans.php:53-72`)·설정 저장(`Db.php:308-321`)·사후 감사(`SecurityAudit.php:14-64`)뿐으로 사전 what-if 실행 엔진 부재. 순신설 필요. 선행 스냅샷 부재로 BLOCKED_PREREQUISITE. NOT_CERTIFIED.
