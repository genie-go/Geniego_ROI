# DSAR — Authorization Control Plane API Surface (Part 3-19 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
API Surface는 제어평면을 외부에서 조작·관측하는 8종 엔드포인트 계약이다. 모든 표면은 §30 Runtime Guard 후단에 놓여 fail-closed로 보호되며, §32/§33 Error·Warning Contract를 표준 응답으로 노출한다. SPEC §34가 규정하는 8종:

- **Publish Configuration** — 설정 발행(쓰기·§31 lint→§30 guard 통과).
- **Rollback Configuration** — 이전 스냅샷으로 롤백(쓰기).
- **Query Runtime Status** — 제어평면 활성 상태 조회(읽기).
- **Query Region Health** — 리전별 헬스/동기화 상태 조회(읽기).
- **Trigger Synchronization** — 리전 동기화 트리거(쓰기).
- **Run Simulation** — 발행 전 dry-run 시뮬레이션(읽기·무부작용).
- **Query Analytics** — 롤아웃/드리프트 분석 조회(읽기).
- **Query Snapshot** — 스냅샷/버전 이력 조회(읽기).

## 2. Substrate 매핑
| SPEC 엔드포인트 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| Query Runtime Status | 헬스/가용성 핸들러 | `backend/src/Handlers/Health.php:56-67` | **확장근**(관측만·제어평면 상태 아님) |
| Rollback Configuration | schema 마이그레이터(스냅샷/버전 개념) | `backend/bin/migrate.php:9-15` | **확장근**(schema 롤백·설정 롤백 아님) |
| 쓰기 게이트 | writes RBAC(analyst+/write:*) | `backend/public/index.php:68-80` | **PARTIAL**(HTTP 인가만·제어평면 미배선) |
| Publish / Trigger Sync / Simulation / Analytics / Snapshot / Region Health | — | grep 0 | **ABSENT** |

## 3. 설계 계약
- **배선 규약**: 8종 전부 `/api` 접두 + 라우트 등록 파일 `$register` 배선. nginx SPA HTML 폴백 착시 회피(핸들러 미배선≠실백엔드).
- **인가**: 쓰기 3종(Publish/Rollback/Trigger Sync)은 현행 writes RBAC(`index.php:68-80`, analyst+/`write:*`) 게이트를 재사용하되 제어평면 전용 scope로 상향. 읽기 5종은 조회 권한.
- **Query Runtime Status**: Health(`Health.php:56-67`) 배포 마커 관측을 확장 — 가용성뿐 아니라 활성 버전·리전 벡터를 반환. 신규 필드는 §32/§33 신호 포함.
- **Rollback Configuration**: migrate(`migrate.php:9-15`)의 schema 스냅샷/버전 개념을 **설정 스냅샷**으로 확장(별개 저장소). §30 Invalid Rollback 3검증 통과 필수.
- **Run Simulation**: 무부작용 dry-run — §31 lint를 실행하되 발행 없이 결과만 반환.
- **표준 응답**: 실패는 §32 7종 에러, 부가신호는 §33 5종 경고로 노출.

## 4. 판정
- **ABSENT** — 8종 순신규. Query Runtime Status의 확장근(`Health.php:56-67`)과 Rollback의 확장근(`migrate.php:9-15` schema)은 각각 관측·schema 롤백일 뿐 제어평면 설정 상태/롤백이 아니다. 쓰기 게이트(`index.php:68-80`)는 HTTP RBAC로 제어평면에 미배선.
- **BLOCKED_PREREQUISITE** — §30 Guard·§31 Lint·설정 저장소·스냅샷 레지스트리 부재로 8종 표면 전부 선행 미충족. 순신설.
- ★`infra/aws/terraform/codedeploy_bluegreen.tf`는 인프라 blue/green IaC이지 제어평면 API가 아니다 — 표면 substrate로 인용 금지(KEEP_SEPARATE).
- 코드 변경 0 · NOT_CERTIFIED.
