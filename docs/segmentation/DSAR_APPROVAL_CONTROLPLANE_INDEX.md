# DSAR — Authorization Control Plane Index (Part 3-19 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_PLANE_INDEX

Authorization Control Plane 의 조회 성능·무결성 검증을 위해 다음 인덱스 축이 선언되어야 한다. 각 인덱스는 control-plane 영속 테이블(§35) 위에서만 의미를 가지며, 저장소 부재 시 인덱스도 성립하지 않는다.

- **Configuration Index**: (tenant, config_key) 조회 및 active 상태 필터.
- **Version Index**: (config_key, version) monotonic 정렬·최신본 조회.
- **Region Index**: (region, config_version) 리전별 배포 상태 조회.
- **Cluster Index**: (cluster_id, node) 서비스 디스커버리 조회.
- **Rollout Index**: (rollout_id, phase, status) 진행 중 롤아웃 조회.
- **Rollback Index**: (target_version, rollback_at) 롤백 대상·이력 조회.
- **Snapshot Index**: (snapshot_id, created_at, hash) 시점 스냅샷 조회·무결성 대조.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| 라이브 영속·인덱스 기반 | 단일 PDO 싱글톤 | `backend/src/Db.php:18`·`:20-21` |
| Configuration/Version/Region/Cluster/Rollout/Rollback/Snapshot Index | **ABSENT** (grep 0) | control-plane 테이블·인덱스 전무 |
| 현행 설정 저장소(인덱스 근사) | **PARTIAL** | flat KV `app_setting(skey,svalue,updated_at)` `Db.php:308-321`(`:315`,`:317`) — PK/skey 룩업만, 다축 인덱스 없음 |
| 스키마 버전 인덱스(근사) | **PARTIAL** | `schema_migrations` 버전 트래킹 `Db.php:157`·`:157-162`(`:159`) |
| 인덱스 부트스트랩(멱등 ensure) 패턴 | PRESENT(재사용 기반) | `Db.php:308-321`(멱등 DDL ensure) |
| tenant 격리 인덱스 전제 | PRESENT | `backend/public/index.php:610` |

**판정 근거**: control plane 인덱스 축(Configuration/Version/Region/Cluster/Rollout/Rollback/Snapshot)은 코드·스키마 어디에도 없다(grep 0). 유일한 근사 조회 구조는 `app_setting` flat KV(`Db.php:308-321`)의 단일 키 룩업과 `schema_migrations` 버전 트래킹(`Db.php:157-162`)뿐이며, 다축·상태 필터 인덱스 개념이 없다. 따라서 본 §36 인덱스는 **ABSENT · 순신설**이고 §35(DB Constraint)의 영속 테이블 성립에 **종속**한다(테이블 없으면 인덱스 불성립).

## 3. 설계 계약(규칙)

- **R1 (§35 종속)**: 본 인덱스는 §35 control-plane 테이블이 신설된 후에만 정의·구현한다. 저장소 없는 선행 인덱스 정의 금지.
- **R2 (EXTEND-only DDL)**: 인덱스 생성은 `app_setting` 멱등 ensure 패턴(`Db.php:308-321`·`:315`·`:317`)을 계승해 애플리케이션 부트스트랩에서 CREATE INDEX IF NOT EXISTS 형태로 배선한다. 별도 마이그레이션 러너 난립 금지(현행 `backend/bin/migrate.php:9-15` 계승).
- **R3 (tenant 선두)**: Configuration/Snapshot/Rollout Index 는 tenant 를 선두 컬럼으로 두어 `index.php:610` 격리와 정합한다. cross-tenant 스캔 불가.
- **R4 (Version monotonic)**: Version Index 는 `schema_migrations` monotonic 버전(`Db.php:157-162`) 패턴을 계승해 최신본 O(log n) 조회를 보장한다.
- **R5 (Snapshot 무결성 대조)**: Snapshot Index 는 hash 컬럼을 포함해 `SecurityAudit.php:56`(verify) 무결성 대조와 연동한다. 인덱스 자체가 무결성 로직을 재구현하지 않는다.

## 4. KEEP_SEPARATE

해당 없음. 본 §36 인덱스는 순신설이며 흡수·확장 대상 마케팅/ML/deploy 컴포넌트 없음.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE · ABSENT.** control plane 인덱스 축은 라이브에 전무(grep 0)하고, 현행은 `app_setting` flat KV(`Db.php:308-321`)·`schema_migrations`(`Db.php:157-162`) 근사만 존재한다. 본 인덱스는 §35 영속 테이블 신설에 종속하며, 실 구현은 선행 foundation 완료 후 별도 승인 세션에서 진행한다. 코드 변경 0.
