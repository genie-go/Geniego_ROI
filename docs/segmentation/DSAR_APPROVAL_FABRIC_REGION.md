# DSAR — Approval Fabric Region (Part 3-16 §7·§2·§32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_REGION`은 Unified Authorization Fabric을 지리·장애 도메인(region) 단위로 분할·복제하는 substrate 계약이다. 계약 요소:

- **Region Topology**: `region_id`, 소속 cluster node 집합, `mode∈{active-active, active-passive}`.
- **Regional Isolation**: 한 region의 장애/부하가 타 region 결정에 전파되지 않는 격리 경계.
- **Failover**: active-passive에서 primary 상실 시 passive 승격, active-active에서 실패 region 트래픽 배제.
- **Geo Routing**: 요청을 데이터 주권/근접도 정책에 따라 담당 region으로 라우팅.
- **Cross-Region Propagation**: 정책/역할/할당 변경을 region 간 전파(수렴 baseline은 §13 Sync).

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| Region topology/registry | 없음 — 단일 DB 호스트 `Db.php:120`(`GENIE_DB_HOST` 기본 `127.0.0.1`) | **ABSENT** |
| Multi-region cluster | 없음 — 단일 `$app` (`index.php:23`, `:686`) | **ABSENT** |
| Active-Active/Passive mode | 없음 — 단일 리전·단일 프로세스 | **ABSENT** |
| Failover/승격 | 없음 — `composer.json:5-13` 클러스터/오케스트레이션 의존 전무 | **ABSENT** |
| Geo routing | 없음 | **ABSENT** |
| Cross-region propagation | 없음 (§13 Sync도 ABSENT) | **ABSENT** |
| 격리 baseline(참고) | 멀티테넌트 격리 `index.php:614-619` = **테넌트** 경계(리전 경계 아님) | **PARTIAL(비-region)** |

## 3. 설계 계약 (순신설 — 코드 0)

region plane을 신규 도입한다. `APPROVAL_REGION`(`region_id`/`mode`/노드 집합/`state`), region-local PDP 결정 우선, cross-region은 §13 Sync로 최종수렴. active-passive는 heartbeat 상실 시 passive 승격, active-active는 실패 region을 geo router에서 배제하며 잔여 region이 fail-secure로 결정을 이어받는다. 기존 테넌트 격리(`index.php:614-619`)는 리전 내부에서 유지되는 **하위 격리 축**으로 배치하고, 이를 region 간 전파 시 **테넌트 경계 보존**의 baseline 불변식으로 삼는다(리전 경계와 혼동 금지).

## 4. 판정

**ABSENT.** 라이브 authz는 단일 호스트(`Db.php:120`)·단일 프로세스(`index.php:23`, `:686`)의 단일 리전이며 region topology·failover·geo routing이 전부 없다(`composer.json:5-13` 무의존). ★죽은 terraform(`infra/aws/terraform/*` Postgres/ECS·db_multi_az·multi-az)은 라이브와 무연결이므로 Multi-Region/HA PRESENT 근거로 인용 금지 — 라이브 DB는 `Db.php:120` 단일 MySQL이다. 멀티테넌트 격리(`index.php:614-619`)는 리전이 아닌 테넌트 축이므로 region 계약을 충족하지 않는다. Region substrate는 순신설 대상이며 선행 cluster/membership plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
