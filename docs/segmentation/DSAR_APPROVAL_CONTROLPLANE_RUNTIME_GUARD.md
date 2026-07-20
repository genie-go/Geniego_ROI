# DSAR — Authorization Control Plane Runtime Guard (Part 3-19 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Control Plane Runtime Guard는 인가 제어평면(Authorization Control Plane)의 **설정 발행·롤아웃·리전 동기화**가 런타임 경로로 진입하기 직전, 6종 위협을 **fail-closed**로 차단하는 단일 관문(single choke-point)이다. SPEC §30이 규정하는 차단 대상:

- **Unauthorized Deployment** — 승인 워크플로를 우회한 제어평면 설정 발행.
- **Configuration Tampering** — 발행 후 무결성이 훼손된 설정의 적용.
- **Version Conflict** — 기대 버전과 실제 활성 버전의 불일치(선점/경합).
- **Split-Brain** — 리전 간 상충하는 활성 버전이 동시 서빙되는 상태.
- **Invalid Rollback** — 존재하지 않거나 무결성 미검증 스냅샷으로의 롤백.
- **Control Plane Bypass** — 관문을 거치지 않은 직접 설정 주입.

Guard는 **부재하면 자동화가 정지(BLOCKED)** 하는 필수 선행(prerequisite)이며, 판단 결과·차단 사유·evidence 해시를 감사 로그에 append-only로 기록한다.

## 2. Substrate 매핑
| SPEC 위협 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| Configuration Tampering | evidence append-only 해시체인 verify | `backend/src/SecurityAudit.php:56` (`:14-64`) | **PARTIAL**(무결성 baseline만·제어평면 미연결) |
| Unauthorized Deployment | inline RBAC bypass·writes 게이트 | `backend/public/index.php:68-80` | **PARTIAL**(HTTP RBAC·제어평면 개념 부재) |
| 배포 마커/헬스 | deploy marker 노출 | `backend/src/Handlers/Health.php:56-67` | **PARTIAL**(관측만·차단 아님) |
| Version Conflict / Split-Brain / Invalid Rollback / Bypass | — | grep 0 | **ABSENT** |

## 3. 설계 계약
- **관문 단일화**: 모든 제어평면 상태전이(publish/rollback/sync)는 Guard 통과 후에만 활성화. 직접 주입 경로는 `Control Plane Bypass`로 거부. 신규 엔드포인트는 `/api` 접두 + 라우트 등록 파일 `$register` 배선을 강제한다.
- **Fail-closed 기본값**: 버전 확인 불가·evidence verify 실패·리전 상태 불명은 전부 **거부**(Unknown≠Allowed). Config Tampering 검증은 `SecurityAudit.php:56` verify를 baseline 신뢰근으로 채택하되, 제어평면 스냅샷 서명까지 확장한다.
- **Version Conflict**: publish는 expected-version(CAS) 조건부로만 승격. 불일치 시 §32 `VERSION_INCOMPATIBLE` 발생원.
- **Split-Brain**: 리전별 활성 버전 벡터를 비교, 상충 시 서빙 차단 + §33 Drift 경고.
- **Invalid Rollback**: 대상 스냅샷 존재·무결성·승인 3검증 통과 전 롤백 불가.
- **감사**: 모든 allow/deny를 evidence 해시와 함께 append-only 기록. 현행 RBAC 컨텍스트(`index.php:68-80` 산출 attribute)를 actor로 재사용.

## 4. 판정
- **ABSENT** — Control Plane Runtime Guard는 grep 0. 현 가드는 (a) HTTP inline RBAC(`index.php:68-80`), (b) evidence verify(`SecurityAudit.php:56`), (c) deploy 관측(`Health.php:56-67`) 3종으로 **분산·부분적**이며 제어평면 상태전이를 차단하는 단일 관문이 아니다.
- **BLOCKED_PREREQUISITE** — 제어평면 설정 저장소·버전 벡터·스냅샷 레지스트리 등 선행 substrate 부재. 순신설.
- ★**죽은 terraform PRESENT 금지**: `infra/aws/terraform/codedeploy_bluegreen.tf`는 blue/green 배포 IaC일 뿐 인가 제어평면 런타임 가드가 아니다 — substrate로 인용 금지(KEEP_SEPARATE). killswitch는 광고 자동화(`AutoCampaign.php:473`) 개념으로, 제어평면 Guard와 별개.
- 코드 변경 0 · NOT_CERTIFIED.
