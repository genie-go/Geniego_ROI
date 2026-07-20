# DSAR — Authorization Cluster Coordinator (Part 3-19 §2·§9 Fabric)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2·§9)
`APPROVAL_CLUSTER_COORDINATOR`는 승인 제어 평면의 **클러스터 조정(Fabric)** 계층으로, 다수 노드(프로세스/워커)에 걸친 authz 결정의 **일관성(Synchronization)**과 **멤버십(Cluster)**을 계약한다.
- **Cluster Membership**: authz 노드 집합의 가입/이탈/헬스를 관리하고 리더(coordinator)를 선출.
- **State Synchronization**: 정책·할당·위임 캐시를 노드 간 수렴시키고 stale read를 경계.
- **Fabric Invariant**: 결정 경로는 단일 논리 진실(single logical truth)을 보되 물리 노드는 다중.
- **Split-Brain Guard**: 분단 시 소수 파티션은 결정 write를 중단(fail-closed).

## 2. Substrate 매핑 (현행 → 계약)
| SPEC 능력 | 현행 substrate | 상태 |
|---|---|---|
| 노드 런타임 | 단일 프로세스 부트스트랩 `index.php:23`(Slim 앱 1개) | ABSENT |
| 의존 그래프 | `composer.json:2-12`(단일 PHP 서비스·클러스터 라이브러리 없음) | ABSENT |
| 상태 연결 | `Db.php:20-21` PDO 싱글톤(프로세스 내 단일 커넥션) | ABSENT |
| DB 부트 | `Db.php:18`·`:27` 단일 인스턴스 초기화 | 클러스터 무관 |
| 결정 일관성 근거 | `SecurityAudit.php:14-64` append-only(단일 저장소 직렬화) | 노드 간 합의 없음 |

## 3. 설계 계약 (신설, 코드 0)
- **Node Registry**: `{node_id, role(leader|follower), health_epoch, lease_expiry}` 논리 테이블. Ground-Truth ①에 등재 후 배선.
- **Leadership Lease**: 리더는 만료형 리스(lease)로만 성립 — 무리스 결정 금지(fail-closed). 리스 갱신 실패 시 자동 강등.
- **State Convergence Contract**: 정책/할당 캐시 무효화는 `SecurityAudit.php:14-64` 이벤트 순번(sequence)으로 순서화 → 모든 노드가 동일 순번까지 재생 후에만 READY.
- **Quorum Write**: authz 상태 변경은 정족수 확인 없이는 커밋 불가. 소수 파티션은 read-only 강등.
- **Consistency Class 선언**: 결정 경로는 강일관(strong)·조회 경로는 유계 지연(bounded-staleness)으로 명시 분리.

## 4. KEEP_SEPARATE (혼입 금지)
- `Db.php:20-21` PDO 싱글톤 = **프로세스 내 커넥션 재사용**이지 분산 클러스터 조정 아님. 클러스터 근거로 승격 금지.
- `index.php:23` = 단일 Slim 부트. 노드 오케스트레이션과 명명 분리.
- `composer.json:2-12` = 의존 선언. 클러스터 프레임워크 부재의 증거이지 substrate 아님.

## 5. 판정
**ABSENT (순신설)**. 현행은 단일 프로세스 부트(`index.php:23`)·단일 의존 그래프(`composer.json:2-12`)·단일 PDO 싱글톤(`Db.php:20-21`, 초기화 `Db.php:18`·`:27`)으로, 다중 노드 멤버십·리더 선출·상태 합의가 부재하다. `SecurityAudit.php:14-64`는 단일 저장소 append-only 직렬화이지 노드 간 합의 프로토콜이 아니다. 본 조정자는 Node Registry·Leadership Lease·Quorum Write를 **순신설**하되, 물리 합의 이전에 append-only 순번 계약을 SSOT로 고정한다. §14 Region Coordinator의 선행 substrate. BLOCKED_PREREQUISITE — 클러스터 런타임 부재로 코드 착수 불가. NOT_CERTIFIED.
