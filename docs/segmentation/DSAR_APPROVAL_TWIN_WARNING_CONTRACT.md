# DSAR — Authorization Digital Twin Warning Contract (Part 3-22 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Warning Contract는 twin 파이프라인이 **아직 실패(error)는 아니지만 열화(degradation) 추세** 를 감지했을 때 방출하는 비차단(non-blocking) 신호의 정본이다. Error(§27)가 흐름을 멈춘다면, Warning은 흐름을 유지한 채 운영자에게 선제 개입 기회를 준다. 본 §28이 규정하는 5종 경고:

- **Prediction Accuracy Declining** — 예측 정확도가 시간에 따라 하락하는 추세.
- **Sync Delay Increasing** — twin 동기화 지연이 증가하는 추세.
- **Replay Queue Backlog** — 리플레이 대기 큐가 적체되는 추세.
- **Scenario Conflict** — 활성 시나리오 간 충돌(상호 배타 조건) 감지.
- **Twin Drift Increasing** — twin과 운영 실체 간 드리프트(괴리)가 확대되는 추세.

## 2. Substrate 매핑 (기존 기반 · 재사용 대상)
| 경고 | 재사용 substrate | 현행 근거 | 성격 |
|---|---|---|---|
| Prediction Accuracy Declining | (정확도 모니터 부재) | — | ABSENT |
| Sync Delay Increasing | 시스템 메트릭 baseline | `SystemMetrics.php:32`, 집계 `:36-45` | 지연 관측 baseline |
| Replay Queue Backlog | read-only 큐 관례(KEEP_SEPARATE) | `AccessReview.php:32`, `:124` | 큐 관측 유사물 |
| Scenario Conflict | (충돌 탐지 부재) | — | ABSENT |
| Twin Drift Increasing | 정합 검증 substrate | `SecurityAudit.php:56-67` | 드리프트 판정 baseline |

## 3. 설계 계약 (본 DSAR가 규정)
- **비차단 방출**: 경고는 파이프라인을 멈추지 않고 관측 채널로만 방출. 임계 초과가 지속되면 §27 error로 승격(예: Sync Delay Increasing → TWIN_SYNC_FAILED, Replay Queue Backlog → EVENT_REPLAY_FAILED)하는 히스테리시스 경계를 명시.
- **추세 기반 판정**: 스냅샷 단발이 아니라 시계열 추세로 판정. Sync Delay는 시스템 메트릭(`SystemMetrics.php:32`·`:36-45`) 관측을 baseline으로 확장, Twin Drift는 정합 해시 편차(`SecurityAudit.php:56-67`)의 누적으로 산출.
- **Replay Queue Backlog**: 큐 깊이 관측은 read-only 큐 관례(`AccessReview.php:32`·`:124`, KEEP_SEPARATE)를 참조하되 twin 리플레이 전용 큐는 별도 신설 — 기존 접근검토 큐를 재사용하지 않는다(도메인 혼입 금지).
- **Scenario Conflict**: 활성 시나리오 집합의 상호배타 조건을 정적 lint(§26 Duplicate Scenario)와 상보적으로 런타임에 재검사.
- **Prediction Accuracy Declining**: 예측 산출을 baseline 실측과 지속 대조(§26 Prediction Baseline 연동), 하락 추세를 XAI 근거와 함께 경고 — 근거없는 신호 금지.

## 4. 판정
**ABSENT — greenfield.** Twin Warning Contract 전용 코드는 부재. 5종 중 관측 substrate가 있는 것은 Sync Delay(`SystemMetrics.php:32`·`:36-45`), Twin Drift(`SecurityAudit.php:56-67`), Replay Queue Backlog(read-only 큐 유사물 `AccessReview.php:32`·`:124`, KEEP_SEPARATE) baseline뿐. Prediction Accuracy·Scenario Conflict 탐지는 완전 부재.

## 5. KEEP_SEPARATE
`AccessReview.php:32`·`:124`의 read-only 큐는 **접근검토(access review) 도메인 전용**이며 twin 리플레이 큐와 의미가 다르다. Replay Queue Backlog 관측 시 이 큐를 재사용·확장하지 않고 twin 전용 큐를 신설한다(도메인 격리 유지). **순신설 · 코드 변경 0 · NOT_CERTIFIED.**
