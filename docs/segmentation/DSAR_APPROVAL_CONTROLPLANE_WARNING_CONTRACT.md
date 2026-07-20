# DSAR — Authorization Control Plane Warning Contract (Part 3-19 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Warning Contract는 요청을 **차단하지 않으면서** 운영자에게 위험 신호를 전달하는 비종결적(non-terminal) 신호 집합이다. Error(§32)가 "거부"라면 Warning은 "허용하되 주의"이며, 무시 시 향후 Error로 승격될 수 있는 선행 지표다. SPEC §33이 규정하는 5종:

- **Region Sync Delayed** — 리전 동기화 지연(아직 실패는 아님).
- **Configuration Drift** — 기대 설정과 실제 상태의 점진적 이탈.
- **Rollout Risk High** — 롤아웃 범위/속도가 위험 임계 근접.
- **Rollback Recommended** — 지표 악화로 롤백을 권고(강제 아님).
- **Feature Flag Expiring** — 플래그 수명 만료 임박.

각 경고는 non-blocking이며 관측·경보 채널로 전달, 승인/자동화를 정지시키지 않는다.

## 2. Substrate 매핑
| SPEC 경고 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| Configuration Drift | 설정 KV 상태 스냅샷 표면 | `backend/src/Db.php:308-321` | **대상 표면**(drift 비교 대상·경고 로직 부재) |
| Rollout Risk / Rollback Recommended | 배포 마커 관측 | `backend/src/Handlers/Health.php:56-67` | **간접**(배포 관측만·리스크 판정 부재) |
| Region Sync Delayed / Feature Flag Expiring | — | grep 0 | **ABSENT** |

## 3. 설계 계약
- **Non-blocking 원칙**: 경고는 §30 Guard 통과를 막지 않는다. Error(§32)와 명확히 분리 — Feature Flag Expiring은 warning, 만료 후 위반은 §32 FEATURE_FLAG_INVALID로 승격.
- **승격 경로**: Region Sync Delayed→(임계 초과)→§32 REGION_SYNC_FAILED, Configuration Drift→(허용범위 초과)→§32 CONFIGURATION_CONFLICT. warning은 error의 조기 지표.
- **Configuration Drift**: 현행 flat KV(`Db.php:308-321`) 상태와 발행 기대치의 diff를 산출(읽기 전용 비교·저장 로직 무변경).
- **Rollout Risk High / Rollback Recommended**: 배포 마커(`Health.php:56-67`)·리전 헬스 지표를 입력으로 리스크 스코어링. Rollback Recommended는 §34 Rollback API를 **권고**할 뿐 자동집행 금지(승인정책 존중).
- **전달**: 경고는 §34 Query Runtime Status/Region Health 응답에 부가 신호로 노출. `/api` 접두·`$register`.

## 4. 판정
- **ABSENT** — 5종 경고 grep 0. Configuration Drift의 비교 대상 표면(`Db.php:308-321`)과 Rollout 관측 입력(`Health.php:56-67`)은 존재하나 경고 산출·전달 로직 부재.
- **BLOCKED_PREREQUISITE** — 리전 동기화 엔진·설정 기대치 모델·롤아웃 리스크 지표 등 경고 입력 substrate 부재. 순신설.
- ★Rollback Recommended는 권고 신호이지 자동 롤백 트리거가 아니다 — killswitch 자동집행(`AutoCampaign.php:473`, 광고 도메인)과 혼동 금지(KEEP_SEPARATE).
- 코드 변경 0 · NOT_CERTIFIED.
