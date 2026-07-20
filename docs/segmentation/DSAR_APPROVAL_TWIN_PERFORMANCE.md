# DSAR — APPROVAL_TWIN_PERFORMANCE (Part 3-22 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §32 Performance)

`APPROVAL_TWIN_PERFORMANCE`는 권한 승인 디지털 트윈 런타임이 준수해야 할 **성능 SLO**를 계약한다.

- **Twin Sync ≤ 5초** — 실 권한 세계 변경이 트윈에 반영되는 지연.
- **Scenario ≤ 30초** — what-if 시나리오 1건 시뮬레이션 완료.
- **Replay Start ≤ 3초** — 이벤트 리플레이 세션 개시 지연.
- **Prediction ≤ 10초** — 예측 산출 1건 응답.
- **Availability ≥ 99.999%** — 트윈 서비스 가용성.

## 2. Substrate 매핑

| 계약 SLO | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Twin Sync ≤ 5s | 측정 대상 트윈 동기화 파이프라인 부재 | — | ABSENT |
| Scenario ≤ 30s | 시나리오 엔진 부재 | — | ABSENT |
| Replay Start ≤ 3s | 이벤트 리플레이 엔진 부재 | — | ABSENT |
| Prediction ≤ 10s | authz 예측 엔진 부재(`risk_prediction`=마케팅) | `Db.php:458` | ABSENT |
| Availability ≥ 99.999% | 시스템 메트릭 계측 계층 | `SystemMetrics.php:32` | PARTIAL-substrate(계측 기반만) |
| 성능 이벤트 봉인 | SecurityAudit append-only | `SecurityAudit.php:27` | PARTIAL-substrate(감사 기반만) |

측정 대상인 트윈 동기화·시나리오·리플레이·예측 파이프라인이 전부 부재하여 SLO 계측 자체가 성립하지 않는다(ABSENT). 재사용 가능한 계측 기반은 SystemMetrics의 런타임 메트릭 수집(`SystemMetrics.php:32`)과 SecurityAudit의 불변 감사 봉인(`SecurityAudit.php:27`)뿐이며, 이는 향후 트윈 성능 지표를 **확장 수집**할 substrate다.

## 3. 설계 계약

1. **성능 계측은 SystemMetrics(`SystemMetrics.php:32`)를 확장**하여 Twin Sync/Scenario/Replay/Prediction 지연을 수집하고, SLO 위반 이벤트는 SecurityAudit(`SecurityAudit.php:27`)에 불변 봉인한다(별도 APM 신설 금지).
2. **Availability ≥ 99.999%**는 메시지 브로커 기반 비동기 동기화 파이프라인을 전제하나, 현 스택에 브로커가 부재(§4)하여 RP-track(선행 인프라) 조건부다.
3. Twin Sync/Scenario/Replay/Prediction의 실측 대상 파이프라인은 전부 **순신설**(BLOCKED_PREREQUISITE).

## 4. KEEP_SEPARATE / 인프라 제약

- **메시지 브로커 부재** — `composer.json:5-13` 의존성에 브로커 클라이언트 없음. Twin Sync ≤ 5초·Availability 5-nine SLO는 브로커 신설을 선행 요건으로 하며, 현 동기 요청/응답 스택으로는 미충족.

## 5. 판정

**ABSENT**(측정 대상 트윈 부재). 계측 기반만 SystemMetrics(`SystemMetrics.php:32`)·SecurityAudit(`SecurityAudit.php:27`)에서 확장 가능하고, 5종 SLO의 실 대상 파이프라인은 전부 순신설이다. 5-nine 가용성은 메시지 브로커(`composer.json:5-13` 부재) 신설을 전제하는 **RP-track 조건**. 선행 트윈 엔진·브로커 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
