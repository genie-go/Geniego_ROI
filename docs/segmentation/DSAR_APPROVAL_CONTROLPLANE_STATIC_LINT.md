# DSAR — Authorization Control Plane Static Lint (Part 3-19 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Static Lint는 제어평면 설정이 **발행(publish) 이전** 정적 단계에서 구조적 결함을 거부하는 pre-flight 게이트다. Runtime Guard(§30)가 런타임 상태전이를 막는다면 Lint는 그 앞단에서 "발행 자체를 시도할 수 없게" 만든다. SPEC §31이 규정하는 6종 룰:

- **Missing Rollback Plan** — 롤백 스냅샷/대상 버전 미지정 설정.
- **Missing Version** — 버전 식별자 부재(CAS 불가).
- **Hardcoded Configuration** — 환경별 파생 대신 값이 코드/설정에 박제.
- **Missing Approval** — 승인 참조(승인 evidence) 미첨부.
- **Invalid Feature Flag** — 스키마·타입·수명(expiry) 위반 플래그.
- **Missing Region Mapping** — 리전 배치 매핑 누락(Split-Brain 유발원).

각 룰은 error 등급이며, 하나라도 위반 시 발행 파이프라인 정지.

## 2. Substrate 매핑
| SPEC 룰 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| Hardcoded Configuration | flat KV 설정 저장/조회 | `backend/src/Db.php:308-321` | **대상**(현 flat KV = lint 검사 대상 표면·룰 부재) |
| Missing Approval | 승인 evidence verify | `backend/src/SecurityAudit.php:56` | **PARTIAL**(evidence 존재검증만·lint 미연결) |
| Missing Version / Rollback Plan / Feature Flag / Region Mapping | — | grep 0 | **ABSENT** |

## 3. 설계 계약
- **Pre-publish 위치**: Lint는 §34 Publish Configuration API 진입점의 첫 단계. 통과 전 설정은 저장소로 승격되지 않는다. 신규 배선은 `/api` 접두 + `$register`.
- **Hardcoded Configuration**: 현행 flat KV(`Db.php:308-321`)에 직접 박힌 리터럴을 스캔, 환경(운영/데모) 파생 가능한 값의 하드코딩을 error로 승격. 이는 리팩터가 아니라 **발행 시점 lint 룰**로만 강제(기존 저장 로직 무변경).
- **Missing Version**: 버전 식별자 필수화 — Runtime Guard의 CAS·§32 `VERSION_INCOMPATIBLE` 전제.
- **Missing Rollback Plan / Region Mapping**: 스냅샷 참조·리전 매핑을 발행 필수 필드로. 누락 시 각각 §30 Invalid Rollback·Split-Brain 예방.
- **Missing Approval**: `SecurityAudit.php:56` verify 통과 evidence 참조를 필수화(Unknown≠승인됨, fail-closed).
- **Invalid Feature Flag**: 플래그 스키마·타입·expiry 검증. 만료 임박은 error 아닌 §33 warning으로 위임.

## 4. 판정
- **ABSENT** — Static Lint 6종 룰 grep 0. Hardcoded Configuration 룰의 검사 표면인 flat KV(`Db.php:308-321`)는 존재하나 lint 룰 자체는 부재. Missing Approval의 신뢰근인 `SecurityAudit.php:56`은 verify만 제공, lint 연결 없음.
- **BLOCKED_PREREQUISITE** — 버전·스냅샷·리전 매핑·플래그 스키마 등 lint가 검사할 구조화된 제어평면 설정 모델 자체가 부재. 순신설.
- 코드 변경 0 · NOT_CERTIFIED.
