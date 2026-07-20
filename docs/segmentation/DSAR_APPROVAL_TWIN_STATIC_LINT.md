# DSAR — Authorization Digital Twin Static Lint (Part 3-22 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Static Lint는 twin 정의(미러 매핑·시나리오·리플레이·예측 설정)를 **배포/정의 시점(설계 타임)** 에 정적 검증해, 런타임 도달 전 구조적 결함을 차단하는 게이트다. 런타임 차단(§25)과 상보적이며, 오탐 유발하는 정의 자체를 사전에 걸러낸다. 본 §26이 규정하는 6종 lint 규칙:

- **Missing Replay Metadata** — 리플레이 정의에 필수 메타데이터(시점·소스·범위) 누락 검출.
- **Missing Prediction Baseline** — 예측 산출에 비교 기준(baseline) 미지정 검출.
- **Invalid Twin Mapping** — twin ↔ 운영 엔티티 매핑이 존재하지 않거나 깨진 참조 검출.
- **Duplicate Scenario** — 동일 시나리오 정의 중복 검출(중복 인텔리전스 금지 원칙).
- **Missing Sync Rule** — twin 동기화 규칙 미정의 검출.
- **Hardcoded Simulation Value** — 시뮬레이션에 임의 하드코딩 값 사용 검출(실제값 자동산출 원칙).

## 2. Substrate 매핑 (기존 기반 · 재사용 대상)
| lint 규칙 | 재사용 substrate | 현행 근거 | 성격 |
|---|---|---|---|
| Missing Replay Metadata | (전용 정적검사 부재) | — | ABSENT |
| Missing Prediction Baseline | (전용 정적검사 부재) | — | ABSENT |
| Invalid Twin Mapping | DB 스키마/연결 참조 규약 | `Db.php:63-87`(env 파싱·연결), `:20-21` | 참조 무결성 baseline |
| Duplicate Scenario | (중복탐지 전용 부재) | — | ABSENT |
| Missing Sync Rule | (동기화 규칙 정의 부재) | — | ABSENT |
| Hardcoded Simulation Value | 정적 정책 상수 규약(일반) | — | ABSENT |

## 3. 설계 계약 (본 DSAR가 규정)
- **실행 시점**: twin/시나리오/예측 정의를 등록·변경하는 정의 시점에 동기적으로 수행. 통과하지 못한 정의는 런타임 substrate에 도달 불가(fail-closed).
- **Missing Replay Metadata / Missing Sync Rule**: 리플레이·동기화 규칙은 필수 필드 집합을 스키마로 고정, 누락 시 정의 거부. 매핑 무결성은 기존 DB 참조 규약(`Db.php:63-87`) 위에서 twin-엔티티 링크의 존재를 정적 확인.
- **Missing Prediction Baseline**: 모든 예측 정의는 명시적 baseline(과거 실측 스냅샷)을 참조해야 한다 — baseline 없는 예측은 lint 거부(§27 `FORECAST_UNAVAILABLE`/§27 `MODEL_CONFIDENCE_TOO_LOW`와 연동).
- **Duplicate Scenario**: 시나리오 정의의 정규화 해시 비교로 중복 차단(중복 인텔리전스 금지). 해시 봉인은 SecurityAudit 체인(`SecurityAudit.php:56-67`) 패턴 재사용 가능.
- **Hardcoded Simulation Value**: 시뮬레이션 입력은 SSOT 집계/파생값만 허용, 리터럴 상수 주입은 lint 실패. 임의 숫자 금지 원칙의 정적 강제.

## 4. 판정
**ABSENT — greenfield (grep 0).** Twin Static Lint 전용 코드는 전무. 6종 규칙 모두 신규 게이트이며, 유일한 인접 substrate는 DB 참조/연결 규약(`Db.php:63-87`, `:20-21`)이 Invalid Twin Mapping 검사의 baseline 성격으로 존재할 뿐이다. Replay 메타데이터·Prediction baseline·Duplicate scenario·Sync rule·Hardcoded value 검출기는 모두 부재. **순신설 · 코드 변경 0 · NOT_CERTIFIED.**
