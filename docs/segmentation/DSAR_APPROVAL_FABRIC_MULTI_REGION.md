# DSAR — Multi-Region Architecture (Part 3-16 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Multi-Region Architecture(§7)는 Unified Authorization Fabric을 복수 지리·장애 도메인(region)에 걸쳐 배치·복제하는 topology 계약이다. 계약 요소:

- **Active-Active**: 복수 region이 동시에 authz 결정을 처리하며 트래픽을 분산 수용.
- **Active-Passive**: primary region이 결정을 담당하고 passive region은 대기·승격 후보.
- **Regional Isolation**: 한 region의 장애/부하가 타 region 결정에 전파되지 않는 격리 경계.
- **Failover**: primary 상실 시 passive 승격, active-active에서 실패 region 트래픽 배제.
- **Geo Routing**: 요청을 데이터 주권·근접도 정책에 따라 담당 region으로 라우팅.

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| Region topology/registry | 없음 — 단일 DB 호스트 `Db.php:120`(`GENIE_DB_HOST` 기본 `127.0.0.1`) | **ABSENT** |
| Active-Active 결정 | 없음 — in-process 단일 authz `index.php:69-622` | **ABSENT** |
| Active-Passive/승격 | 없음 — 단일 리전·단일 프로세스 | **ABSENT** |
| Regional Isolation | 없음 — 리전 개념 부재 | **ABSENT** |
| Failover | 없음 — `composer.json:5-13` 클러스터/오케스트레이션 의존 전무 | **ABSENT** |
| Geo Routing | 없음 | **ABSENT** |
| 격리 baseline(참고) | 멀티테넌트 격리 `index.php:614-619` = **테넌트** 경계(리전 경계 아님) | **PARTIAL(비-region)** |

## 3. 설계 계약 (순신설 — 코드 0)

region plane을 신규 도입한다. 각 region은 자체 authz 결정 노드 집합과 region-local 데이터 복제본을 보유하며, active-active는 geo router가 실패 region을 배제하고 잔여 region이 fail-secure로 결정을 이어받는다. active-passive는 heartbeat 상실 시 passive를 승격한다. 기존 테넌트 격리(`index.php:614-619`)는 리전 내부에서 유지되는 하위 격리 축으로 배치하고, region 간 전파 시 **테넌트 경계 보존**을 baseline 불변식으로 삼는다(리전 경계와 혼동 금지).

## 4. ★KEEP_SEPARATE — 오판 금지

- **죽은 terraform**: `infra/aws/terraform/*`의 Postgres/ECS·`db_multi_az`·blue-green·autoscaling·multi-az는 라이브(MySQL/PHP·`Db.php:120`)와 엔진·언어·배포경로가 전부 불일치하는 **미연결 죽은 스캐폴딩**이다. `db_multi_az`는 (구현되었더라도) 단일 리전 내 HA일 뿐 multi-region이 아니며, 무엇보다 라이브에 무연결이므로 Multi-Region/HA의 PRESENT 근거로 인용 절대 금지.
- 멀티테넌트 격리(`index.php:614-619`)는 **테넌트** 축이지 region 축이 아니다 — Regional Isolation 충족 근거로 오용 금지.

## 5. 판정

**ABSENT.** 라이브 authz는 단일 호스트(`Db.php:120`)·단일 in-process(`index.php:69-622`)의 단일 리전이며 active-active/passive·regional isolation·failover·geo routing이 전부 없다(`composer.json:5-13` 무의존). 죽은 terraform은 라이브와 무연결이므로 PRESENT 근거 아님. Multi-Region substrate는 순신설 대상이며 선행 cluster/membership·region plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
