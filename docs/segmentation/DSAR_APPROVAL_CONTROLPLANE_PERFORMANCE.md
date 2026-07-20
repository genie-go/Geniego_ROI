# DSAR — Authorization Control Plane Performance (Part 3-19 §37)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_PLANE_PERFORMANCE

Authorization Control Plane 은 다음 성능·가용성 목표를 만족해야 한다. 각 지표는 측정 대상 control-plane 컴포넌트가 실존할 때에만 검증 가능하다(RP-track 조건).

- **Config Publish ≤ 30초**: 정책/설정 발행이 등록부터 Data Plane 전파 완료까지 30초 이내.
- **Region Sync ≤ 10초**: 리전 간 config 버전 수렴 10초 이내.
- **Failover ≤ 30초**: 리전/노드 장애 시 조정·재라우팅 30초 이내.
- **Rollback ≤ 60초**: 직전 안정 버전 복원 60초 이내.
- **Availability ≥ 99.999%**: control plane 조회·발행 가용성.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| 라이브 authz 런타임 | 단일 PHP/MySQL Slim 모놀리스 | `backend/public/index.php:23`·`backend/src/Db.php:18`·`backend/composer.json:2-12` |
| Config Publish 파이프라인(측정 대상) | **ABSENT** (grep 0) | 발행/전파 컴포넌트 부재. 현행은 flat KV 쓰기 `Db.php:308-321` |
| Region Sync/Failover(측정 대상) | **ABSENT** | 다중 리전 조정 계층 없음(단일 모놀리스 `composer.json:2-12`) |
| Rollback 경로(근사) | **PARTIAL** | 스키마 롤백만 존재 `backend/bin/migrate.php:9-15`(`:10`)·`:48`; config 롤백 부재 |
| 런타임 인가 결정(로컬 PDP) | PRESENT | `TeamPermissions.php:695-701`(프로세스 내 로컬 결정, 전파 계층 아님) |
| 가용성 상태 신호 | PARTIAL(근사) | 헬스 체크 `backend/src/Handlers/Health.php:56-67`·`:102-103`(단일 프로세스 liveness, control-plane SLA 아님) |

**판정 근거**: 성능 목표의 측정 대상인 Config Publish·Region Sync·Failover·control-plane Rollback 컴포넌트가 전부 부재하다(grep 0). 현존하는 것은 프로세스 내 로컬 PDP(`TeamPermissions.php:695-701`), 스키마 수준 rollback(`migrate.php:9-15`), 단일 프로세스 헬스 신호(`Health.php:56-67`)뿐으로, 어느 것도 control-plane SLA 를 측정·보증하지 않는다. 따라서 본 §37 은 **ABSENT · RP-track 조건**(측정 대상 신설 후에만 지표 유효)으로 판정한다.

## 3. 설계 계약(규칙)

- **R1 (측정 대상 선행)**: 성능 지표는 §35 영속·§36 인덱스·발행/조정 컴포넌트가 신설된 후에만 측정·인증한다. 대상 부재 상태에서 목표치 인증(green) 금지.
- **R2 (Rollback EXTEND)**: config Rollback ≤60초 는 스키마 롤백(`migrate.php:9-15`·`:48`) 패턴을 계승·확장해 구현하되, 스키마 롤백을 config 롤백으로 오표기 금지.
- **R3 (가용성 계측)**: Availability ≥99.999% 는 단일 프로세스 헬스(`Health.php:56-67`·`:102-103`)를 넘어서는 control-plane 종합 가용성으로 별도 계측한다. 프로세스 liveness 를 SLA 로 오인 금지.
- **R4 (로컬 PDP 무회귀)**: 성능 최적화가 런타임 인가 결정(`TeamPermissions.php:695-701`)의 정확성·격리를 후퇴시키지 않는다. 성능↔정확성 트레이드에서 fail-closed 우선.
- **R5 (죽은 인프라 배제)**: 성능 근거로 미가동 IaC(§4)를 인용하지 않는다. 실측 기반만 인정.

## 4. KEEP_SEPARATE

Region Sync·Failover·Blue-Green 관련 미가동 IaC(`infra/aws/terraform/codedeploy_bluegreen.tf`·`infra/aws/terraform/autoscaling.tf`·`infra/docker-compose.yml`)는 성능 지표의 측정 근거로 인용하지 않는다. 존재만으로 Failover/Region Sync PRESENT·목표 달성 판정 금지. 예측·모니터링 계열(`ModelMonitor.php:21`)도 authz control-plane 성능과 별개 도메인으로 유지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE · ABSENT.** 성능 목표(Publish 30s·Region Sync 10s·Failover 30s·Rollback 60s·99.999%)의 측정 대상 control-plane 컴포넌트가 부재(grep 0)하고, 현존은 로컬 PDP(`TeamPermissions.php:695-701`)·스키마 rollback(`migrate.php:9-15`)·프로세스 헬스(`Health.php:56-67`) 근사뿐이다. 본 지표는 RP-track 조건으로, 실 계측·인증은 측정 대상 신설 후 별도 승인 세션에서 진행한다. 코드 변경 0.
