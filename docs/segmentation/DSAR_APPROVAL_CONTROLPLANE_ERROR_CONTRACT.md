# DSAR — Authorization Control Plane Error Contract (Part 3-19 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Error Contract는 제어평면이 요청을 **거부/실패**시킬 때 반환하는 종결적(terminal) 오류코드 집합이다. 각 코드는 정확히 하나의 발생원(guard/lint/API)과 결정론적으로 대응하며, 소비자는 코드만으로 재시도 가능성·복구 경로를 판정한다. SPEC §32가 규정하는 7종:

- **CONTROL_PLANE_UNAVAILABLE** — 제어평면 자체가 서빙 불가(fail-closed 기본반환).
- **CONFIGURATION_CONFLICT** — 동시 발행/상충 설정 경합.
- **DEPLOYMENT_FAILED** — 발행이 적용 단계에서 실패.
- **ROLLBACK_FAILED** — 롤백 실행 실패.
- **REGION_SYNC_FAILED** — 리전 동기화 실패.
- **FEATURE_FLAG_INVALID** — 플래그 스키마/수명 위반(런타임 검출).
- **VERSION_INCOMPATIBLE** — 기대 버전과 활성 버전 불일치(CAS 실패).

## 2. Substrate 매핑
| SPEC 에러코드 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| VERSION_INCOMPATIBLE | evidence verify 실패 신호(무결성 baseline) | `backend/src/SecurityAudit.php:56` | **간접**(verify 실패는 있으나 제어평면 코드 아님) |
| CONTROL_PLANE_UNAVAILABLE | 헬스/가용성 관측 | `backend/src/Handlers/Health.php:102-103` | **간접**(가용성 신호만·에러코드 미정의) |
| CONFIGURATION_CONFLICT / DEPLOYMENT_FAILED / ROLLBACK_FAILED / REGION_SYNC_FAILED / FEATURE_FLAG_INVALID | — | grep 0 | **ABSENT** |

## 3. 설계 계약
- **1코드=1발생원**: 각 에러는 단일 결정지점에서만 발출. VERSION_INCOMPATIBLE=Runtime Guard CAS(§30), FEATURE_FLAG_INVALID=런타임 플래그 검증(정적 위반은 §31 lint가 선차단), CONFIGURATION_CONFLICT=동시 publish 경합.
- **Fail-closed 종결성**: 제어평면 상태 불명 시 기본반환은 CONTROL_PLANE_UNAVAILABLE(재시도 가능), 무결성 위반은 종결(재시도 불가). Health(`Health.php:102-103`) 가용성 신호를 UNAVAILABLE 판정 입력으로 재사용하되 에러코드는 신규 정의.
- **재시도 분류**: UNAVAILABLE·REGION_SYNC_FAILED=transient(재시도 가능), CONFIGURATION_CONFLICT·VERSION_INCOMPATIBLE·FEATURE_FLAG_INVALID=재발행 필요, ROLLBACK_FAILED=수동개입(경보).
- **감사 연동**: 모든 에러 발출은 §30 Guard 감사 로그에 사유·evidence와 함께 기록.
- **API 표면**: 에러는 §34 8종 엔드포인트의 표준 실패 응답으로 노출. `/api` 접두·`$register` 배선.

## 4. 판정
- **ABSENT** — 7종 에러코드 grep 0, 발생원 코드 전무. VERSION_INCOMPATIBLE의 개념적 baseline(`SecurityAudit.php:56` verify 실패)과 UNAVAILABLE의 가용성 신호(`Health.php:102-103`)는 존재하나 제어평면 에러코드로 승격된 코드 경로가 아니다.
- **BLOCKED_PREREQUISITE** — 제어평면 상태전이 엔진(§30)·설정 모델(§31)·API(§34) 부재로 발생원 자체가 없음. 순신설.
- 코드 변경 0 · NOT_CERTIFIED.
