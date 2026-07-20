# DSAR — Authorization Universal Governance Mesh: Index (Part 3-24 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
§31은 Universal Governance Mesh 조회 경로의 **인덱스(Index)** 설계를 정의한다. Mesh Node·Region·Cluster·Route·Trust·Snapshot 각 축의 저지연 조회를 위한 인덱스가 계약 대상이다.

| # | Index | 대상 조회 |
|---|-------|-----------|
| IX-1 | Mesh Node Index | node_id·상태·헬스별 노드 조회 |
| IX-2 | Region Index | region_id·리전별 노드/정책 조회 |
| IX-3 | Cluster Index | cluster_id·클러스터 멤버십 조회 |
| IX-4 | Route Index | 정책 배포 경로·홉(hop) 조회 |
| IX-5 | Trust Index | node ↔ node 신뢰 관계 조회 |
| IX-6 | Snapshot Index | 위상/정책 스냅샷 버전 조회 |

## 2. Substrate 매핑(현행 실측 → 계약)
| 계약 | 현행 substrate | 실측 | 판정 |
|------|----------------|------|------|
| IX-1~IX-6 mesh 인덱스 | mesh_node/region/cluster/route/trust/snapshot 테이블 | grep 0 | **ABSENT** |
| DB 인덱스 substrate | PDO 싱글톤 단일 커넥션(`backend/src/Db.php:20-21`) | 단일 호스트 관계형 인덱스만 | 신설 종속 |
| 분산 조회 substrate | 메시지 버스/분산 인덱스 부재(`backend/composer.json:6-13`) | 의존성 목록에 없음 | 부재 |

## 3. 설계 계약
- **선행 종속**: 인덱스 6종은 모두 §30(Database Constraint)이 정의하는 mesh 테이블 위에서만 성립한다. §30 테이블이 grep 0이므로 §31 인덱스는 **테이블 신설 이후** 착수(§30 종속).
- **IX-1 Mesh Node / IX-2 Region / IX-3 Cluster**: 관계형 복합 인덱스(`tenant_id, region_id, status`)로 설계. 현 substrate가 단일 PDO 커넥션(`Db.php:20-21`)이므로 물리 인덱스는 단일 호스트 B-tree로 충족 가능하나, 대상 테이블 부재로 생성 불가.
- **IX-4 Route / IX-5 Trust**: 배포 경로·신뢰 그래프는 인접 리스트 인덱스로 설계. 신뢰 무결성 원천은 §30에서 SecurityAudit 체인에 앵커되므로 인덱스는 조회 가속 전용(무결성 판정은 인덱스 밖).
- **IX-6 Snapshot**: 스냅샷 버전 단조 조회 인덱스. 정책 버전 단조성(§30 C-3)에 종속.
- 분산 인덱스(리전 간)는 메시지 버스/분산 substrate 부재(`composer.json:6-13`)로 **BLOCKED_PREREQUISITE**. 설계만 명세, 물리 인덱스 미생성.

## 4. 판정
**ABSENT**. mesh 테이블·인덱스가 전무하며(grep 0), 현 DB는 PDO 싱글톤 단일 커넥션(`backend/src/Db.php:20-21`)에 분산 substrate가 없다(`composer.json:6-13`). 6종 인덱스 전부 **순신설**이며 §30 테이블 신설에 종속. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE. 선행 Part 1~3-23 및 §30 인증 후 착수.
