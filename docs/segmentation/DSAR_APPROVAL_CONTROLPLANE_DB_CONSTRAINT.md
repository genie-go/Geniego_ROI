# DSAR — Authorization Control Plane Database Constraint (Part 3-19 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_PLANE_DB_CONSTRAINT

Authorization Control Plane 의 영속 계층은 다음 5대 DB 무결성 제약을 **선언적으로 강제**해야 한다. 제약은 애플리케이션 코드가 아니라 스키마/저장소 수준의 불변식으로 표현되어, 우회 경로 없이 데이터 진위를 보증한다.

- **Immutable Deployment History**: config publish·rollout·rollback 각 배포 이벤트는 append-only 이며 사후 변조 불가.
- **Immutable Snapshot**: 시점 스냅샷(config/policy 집합)은 생성 후 내용·해시가 고정되고, 참조 무결성으로 원본 삭제를 차단.
- **Configuration Version Integrity**: 각 설정 아티팩트는 monotonic version 을 가지며 동일 (tenant,key,version) 중복·역행 금지.
- **Tenant Isolation**: 모든 control-plane 레코드는 tenant 스코프로 격리되고 cross-tenant 읽기/쓰기 불가.
- **Cross-Region Consistency**: 다중 리전 복제본 간 config 버전·상태가 수렴하며 split-brain 시 결정적 조정.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| 라이브 영속 런타임 | 단일 PDO(MySQL·SQLite 폴백) 싱글톤 | `backend/src/Db.php:18`·`:20-21`·`:27` |
| Deployment History(배포 이벤트 테이블) | **ABSENT** (grep 0) | control_plane/rollout/deployment 테이블 부재. 현행은 flat KV `Db.php:308-321`(`:315`,`:317`) |
| Immutable Snapshot(불변 스냅샷) | **ABSENT** (순신설) | 스냅샷 저장소·해시 고정 제약 없음 |
| Configuration Version Integrity | **PARTIAL** | 스키마 버전 트래킹만 존재 `Db.php:157`·`:157-162`(`:159`)·`schema_migrations`; config 아티팩트 버전 제약은 부재 |
| Tenant Isolation | **PRESENT** | 요청 tenant 주입·격리 `backend/public/index.php:610` |
| Immutable(변경 증거 불변) | **PRESENT(재사용)** | SecurityAudit append-only 해시체인 `SecurityAudit.php:14-64`·`:43-51`(log/verify) |
| Cross-Region Consistency | **ABSENT** | 단일 모놀리스·복제 계층 없음 `backend/composer.json:2-12` |

**판정 근거**: 5대 제약 중 실제 강제되는 것은 **Tenant Isolation**(`index.php:610`)과 변경 증거의 **Immutable**(`SecurityAudit.php:14-64`·`:43-51`)뿐이다. **Configuration Version Integrity** 는 스키마 마이그레이션 버전(`Db.php:157-162`)에 한해 부분적으로만 존재하며 config 아티팩트에는 적용되지 않는다. Deployment History·Snapshot·Cross-Region 은 저장소 자체가 없어 순신설 대상이다.

## 3. 설계 계약(규칙)

- **R1 (EXTEND-only 영속)**: 신규 제약 테이블은 flat KV `app_setting`(`Db.php:308-321`) 의 멱등 ensure DDL 패턴(`:315` MySQL·`:317` SQLite)을 계승해 추가한다. 기존 스칼라 설정 스키마 파괴·대체 금지.
- **R2 (Immutable 강제)**: Deployment History·Snapshot 은 UPDATE/DELETE 경로 없이 INSERT-only 로 설계하고, 무결성 증거는 자체 구현하지 않고 `SecurityAudit.php:14-64` 해시체인(verify `:43-51`)을 참조한다.
- **R3 (Version Integrity)**: config 아티팩트는 `(tenant,key,version)` unique·monotonic 제약을 스키마 버전 트래킹(`Db.php:157-162`) 패턴을 확장해 부여한다. 역행·중복 삽입 거부.
- **R4 (Tenant Isolation 불변)**: 모든 control-plane 레코드는 `index.php:610` 의 tenant 해석을 단일 원본으로 쓰고, 플랫폼 전역 정의는 `__shared__` 스코프로만 표기한다. cross-tenant 접근 fail-closed.
- **R5 (Cross-Region)**: 리전 수렴 제약은 선행 복제 아키텍처 결정 전까지 **설계 보류**(현 단일 모놀리스 `composer.json:2-12` 에서는 강제 불가). 죽은 인프라 코드로 선행 구현 금지.

## 4. KEEP_SEPARATE

Cross-Region 복제·blue-green 배포 인프라(`infra/aws/terraform/codedeploy_bluegreen.tf`·`infra/aws/terraform/autoscaling.tf`·`infra/docker-compose.yml`)는 **미가동 IaC** 로, DB 제약 강제의 근거로 인용·의존하지 않는다. 존재만으로 Cross-Region Consistency PRESENT 판정 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE · PARTIAL.** 5대 DB 제약 중 Tenant Isolation(`index.php:610`)·Immutable(`SecurityAudit.php:14-64`)만 실존하고, Configuration Version Integrity 는 스키마 버전(`Db.php:157-162`)에 한해 부분 존재한다. Deployment History·Immutable Snapshot·Cross-Region Consistency 는 순신설이다. 실 구현은 선행 foundation(영속 스키마 EXTEND 승인·복제 아키텍처 결정) 완료 후 별도 승인 세션에서 진행한다. 코드 변경 0.
