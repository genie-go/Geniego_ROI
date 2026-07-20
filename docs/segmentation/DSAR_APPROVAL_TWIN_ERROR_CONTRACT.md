# DSAR — Authorization Digital Twin Error Contract (Part 3-22 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Error Contract는 twin 파이프라인이 **복구 불가능한 실패(error)** 를 만났을 때 반환하는 기계판독 코드의 정본이다. 각 코드는 단일 의미·발생원·HTTP 상태·후속 조치를 고정한다. 본 §27이 규정하는 7종 에러코드:

- **TWIN_SYNC_FAILED** — twin ↔ 운영 상태 동기화 실패.
- **EVENT_REPLAY_FAILED** — 이벤트 리플레이 실행 실패.
- **PREDICTION_ENGINE_FAILED** — 예측 엔진 산출 실패.
- **SCENARIO_INVALID** — 시나리오 정의가 유효하지 않음(정적 lint 통과 후 런타임 무효).
- **FORECAST_UNAVAILABLE** — 예측 결과를 산출할 수 없음(입력·baseline 부재).
- **TWIN_RECONCILIATION_FAILED** — twin과 운영 실체 간 정합(reconciliation) 실패.
- **MODEL_CONFIDENCE_TOO_LOW** — 모델 신뢰도가 임계 미만 → 산출 차단(Confidence 게이트).

## 2. Substrate 매핑 (기존 기반 · 재사용 대상)
| 에러코드 | 재사용 substrate | 현행 근거 | 성격 |
|---|---|---|---|
| TWIN_SYNC_FAILED | env 격리·DB 연결 실패 처리 | `Db.php:63-87`, `:81-84` | 연결/격리 baseline |
| EVENT_REPLAY_FAILED | (리플레이 실행기 부재) | — | ABSENT |
| PREDICTION_ENGINE_FAILED | 예측/추론 호출 계층(일반) | `ClaudeAI.php:18` | 추론 진입 baseline |
| SCENARIO_INVALID | (시나리오 런타임 부재) | — | ABSENT |
| FORECAST_UNAVAILABLE | 예측 진입(일반) | `ClaudeAI.php:18` | 추론 진입 baseline |
| TWIN_RECONCILIATION_FAILED | append-only 정합 검증 | `SecurityAudit.php:56-67`(verify) | 무결성 검증 substrate |
| MODEL_CONFIDENCE_TOO_LOW | (Confidence 게이트 부재) | — | ABSENT |

## 3. 설계 계약 (본 DSAR가 규정)
- **HTTP 매핑**: 입력/정의 결함(SCENARIO_INVALID)은 4xx, 파이프라인 내부 실패(TWIN_SYNC_FAILED·EVENT_REPLAY_FAILED·PREDICTION_ENGINE_FAILED·TWIN_RECONCILIATION_FAILED)는 5xx, 산출 불가(FORECAST_UNAVAILABLE·MODEL_CONFIDENCE_TOO_LOW)는 정책적 4xx(게이트 거부)로 표준화.
- **Fail-closed 원칙**: MODEL_CONFIDENCE_TOO_LOW·FORECAST_UNAVAILABLE는 "빈 결과를 성공으로 위장" 금지(가짜녹색 systemic 방지). 신뢰도 미달 시 산출을 반환하지 않고 명시적 error를 낸다 — Data Trust Constitution의 "수집≠사용, 신뢰도 미달은 자동화/AI 제외" 강제.
- **TWIN_RECONCILIATION_FAILED**: twin↔운영 해시 정합은 SecurityAudit verify(`SecurityAudit.php:56-67`) 패턴으로 검증, 불일치 시 twin 무효화 + 운영 무영향 보장.
- **발생원 명시**: 각 코드는 단일 발생원에서만 방출(중복 방출 금지). PREDICTION/FORECAST 계열은 추론 진입(`ClaudeAI.php:18`) 상위에 게이트를 얹는다 — 은퇴모델·근거없는 결론 반환 금지.

## 4. 판정
**ABSENT — greenfield.** 7종 에러코드 모두 신규이며 발생원(리플레이 실행기·시나리오 런타임·예측 엔진·정합기·Confidence 게이트)이 부재. 인접 substrate는 DB 연결/격리 실패(`Db.php:63-87`·`:81-84`), 정합 검증(`SecurityAudit.php:56-67`), 추론 진입(`ClaudeAI.php:18`) baseline뿐. **MODEL_CONFIDENCE_TOO_LOW = Confidence 게이트**로 신설(신뢰도 미달 fail-closed). **순신설 · 코드 변경 0 · NOT_CERTIFIED.**
