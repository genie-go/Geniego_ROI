# DSAR — APPROVAL_TWIN_SNAPSHOT (Part 3-22 §18·§30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §18·§30 Snapshot Integrity)

`APPROVAL_TWIN_SNAPSHOT`는 권한 승인 디지털 트윈(Authorization Digital Twin)의 **특정 시점 상태를 불변(immutable)으로 봉인한 스냅샷 레코드**다. 트윈이 예측·시뮬레이션을 수행할 때 참조하는 "권한 세계의 사진"으로서, 다음 필드를 계약한다.

- `twin_state` — 승인 트윈의 전체 상태(역할·권한·위임·정책 그래프의 결정론적 직렬화).
- `prediction_result` — 스냅샷 시점에 산출된 예측 결과(승인 확률·리스크 스코어 등)의 봉인본.
- `active_scenario` — 스냅샷이 귀속된 시나리오 식별자(어떤 what-if 분기에서 촬영되었는가).
- `version` — 스냅샷 스키마/트윈 모델 버전(단조 증가, 재현 결정성 보장).
- `timestamp` — 촬영 시각(UTC, 위변조 불가 서명 대상).

§30 Snapshot Integrity 계약: 스냅샷은 **생성 후 변경 불가**하며, 무결성은 append-only 해시 체인으로 증명되어야 한다.

## 2. Substrate 매핑

| 계약 요소 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Twin State snapshot | 없음(트윈 상태 직렬화 부재) | — | ABSENT |
| Prediction Result 봉인 | 없음(예측 엔진 부재) | — | ABSENT |
| Active Scenario 귀속 | 없음(시나리오 분기 부재) | — | ABSENT |
| Version/Timestamp | 없음(트윈 버전축 부재) | — | ABSENT |
| Immutable 봉인 기반 | SecurityAudit append-only 해시 체인 | `SecurityAudit.php:27`·`:56-67` | PARTIAL-substrate(불변성 기반만) |

grep 결과 트윈 스냅샷(twin state/prediction/scenario 봉인) 구현은 **전무(ABSENT)**하다. 유일하게 재사용 가능한 기반은 SecurityAudit의 불변 해시 체인 봉인 메커니즘(`SecurityAudit.php:27`의 체인 앵커, `:56-67`의 체인 append·연결 로직)이며, 이는 twin snapshot이 요구하는 immutable integrity를 **확장하여** 순신설할 substrate다.

## 3. 설계 계약

1. **불변 봉인은 SecurityAudit 해시 체인을 확장**한다 — twin snapshot 레코드는 `SecurityAudit.php:56-67` 체인 append 경로에 스냅샷 다이제스트를 앵커링하여, 별도 무결성 저장소를 신설하지 않고 기존 append-only 체인(`:27`)에 귀속시킨다.
2. **Twin State/Prediction Result/Active Scenario/Version/Timestamp**의 실제 촬영·직렬화 로직은 전부 **순신설**(선행 트윈 엔진 부재로 BLOCKED_PREREQUISITE).
3. 스냅샷은 결정론적 직렬화(version 고정 시 동일 입력→동일 다이제스트)를 계약하여 §19 Replay 재현성의 기반이 된다.

## 4. KEEP_SEPARATE

동음이의 "snapshot"은 twin snapshot이 **아니며** 흡수·통합 금지:
- **CCTV 스냅샷** — `WmsCctv.php`(물리 카메라 프레임 캡처).
- **Config 스냅샷** — `AdminMenu.php:595-652`(메뉴/설정 구성 스냅샷).
- **Memory 스냅샷** — `Health.php:35`(런타임 메모리 사용량 계측).

셋 모두 도메인·의미론이 상이하며 권한 트윈 상태와 무관하다.

## 5. 판정

**ABSENT**(twin snapshot 없음). 불변 봉인 기반만 SecurityAudit 해시 체인(`SecurityAudit.php:27`·`:56-67`)에서 확장 가능하고, Twin State·Prediction·Scenario·Version·Timestamp 촬영 계층은 전부 순신설이다. 선행 트윈 엔진 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
