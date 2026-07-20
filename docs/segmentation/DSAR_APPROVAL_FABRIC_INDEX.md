# DSAR — Index 계약 (Part 3-16 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §32)

Fabric 의 결정(decision) 조회 지연을 만족시키기 위해 7종 인덱스가 필요하다:

- **IX-1 Region Index** — 리전별 정책/노드 라우팅 조회.
- **IX-2 Cluster Index** — 클러스터 멤버십·헬스 조회.
- **IX-3 Policy Version Index** — 활성 정책 버전 lookup.
- **IX-4 Cache Version Index** — 캐시 무효화 세대(generation) 조회.
- **IX-5 Distribution Index** — 분배 이력 시계열 조회.
- **IX-6 Health Index** — 노드/리전 헬스 시계열.
- **IX-7 Snapshot Index** — 스냅샷 버전·발행시각 조회.

## 2. 라이브 substrate 매핑

| SPEC 인덱스 | 실 substrate | 상태 |
|---|---|---|
| IX-1 Region | (fabric region 테이블) | **ABSENT** |
| IX-2 Cluster | (fabric cluster 테이블) | **ABSENT** |
| IX-3 Policy Version | (fabric policy_version 테이블) | **ABSENT** |
| IX-4 Cache Version | (fabric cache_version 테이블) | **ABSENT** |
| IX-5 Distribution | (fabric distribution 테이블) | **ABSENT** |
| IX-6 Health | 헬스는 런타임 probe(`SystemMetrics.php:60-100`)로 산출·**시계열 인덱스 테이블 없음** | ABSENT(테이블 부재) |
| IX-7 Snapshot | (fabric snapshot 테이블) | **ABSENT** |
| 현 DB 인덱스 | 단일 노드 MySQL 스키마·ensureTables 자가치유 `Db.php:63-87`·`:116-166` | 일반 도메인 테이블만 |

## 3. 설계 계약(신설 시)

- 7종 인덱스는 §31 의 fabric 테이블(distribution/snapshot/version/region/cluster/health)이 **먼저 신설**되어야 정의 가능. 대상 테이블 부재 → 인덱스는 선행 종속.
- 현 DB 는 단일 노드(`Db.php:63-87`)이며 스키마는 `Db.php:116-166` 의 마이그레이션/자가치유 경로로 관리된다. 신규 fabric 인덱스는 동일 경로(마이그레이션 또는 handler `ensureTables`)로 진입해야 하며 별도 인덱스 관리자 신설 금지.
- 인덱스 설계는 §33 성능 계약(Decision≤20ms·Cache Hit≥99%)의 조회 패턴에서 역산한다. 성능 목표 미확정 상태에서 인덱스 컬럼 순서 고정 금지.
- IX-6 Health 는 현재 런타임 probe(`SystemMetrics.php:60-100`)로만 존재 — 시계열 영속화 테이블이 신설될 때 인덱스 대상 발생.

## 4. 판정

**ABSENT.** Fabric 테이블·인덱스가 전무하다. 현 DB 는 단일 노드(`Db.php:63-87`·`:116-166`)이고, 헬스는 영속 시계열이 아니라 요청 시 probe(`SystemMetrics.php:60-100`) 로 계산된다. 7종 인덱스 전부 **순신설**이며 §31 fabric 테이블 신설에 종속(BLOCKED_PREREQUISITE).

NOT_CERTIFIED · 코드 변경 0.
