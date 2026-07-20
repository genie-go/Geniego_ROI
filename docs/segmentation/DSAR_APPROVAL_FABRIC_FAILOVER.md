# DSAR — Authorization Fabric Failover (Part 3-16 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §16)

`APPROVAL_FABRIC_FAILOVER`는 인가 패브릭 구성요소 장애 시 결정 연속성을 보장하는 우회·복구 계약이다. Failover 5종 + RTO 목표:

- **PDP Failover** — 1차 정책 결정점 장애 → 대체 PDP로 결정 승계.
- **Cache Failover** — 결정 캐시 장애 → cold-path(직접 평가)로 강등, 정확성 유지.
- **Region Failover** — 리전 전체 장애 → 건강한 리전 PDP로 승계(compliance 제약 존중).
- **Cluster Failover** — 클러스터 노드/leader 상실 → quorum 재구성·leader 재선출.
- **Context Failover** — 컨텍스트 소스(속성/세션) 장애 → 안전 기본값(Fail-closed) 강등.
- **RTO ≤ 30초** — 감지→우회→정상결정 재개까지 목표 복구시간.

## 2. 라이브 substrate 매핑

| SPEC failover 대상 | 라이브 실재 | 근거 | 판정 |
|---|---|---|---|
| 단일노드 프로세스 헬스(감지 baseline) | 존재 | `backend/src/Handlers/SystemMetrics.php:60-100`·`Health.php:13-26` | 감지 baseline만 |
| DB 계층 SQLite 폴백 | 존재(비-인가) | `backend/src/Db.php:116-166`·`:127`·`:120` | KEEP_SEPARATE(§4) |
| PDP Failover | 없음 | 대체 PDP·독립 결정점 부재 | ABSENT |
| Cache Failover | 없음 | 결정 캐시 계층 부재 | ABSENT |
| Region Failover | 없음 | 리전 분산 부재 | ABSENT |
| Cluster Failover | 없음 | 클러스터·quorum·leader 부재 | ABSENT |
| Context Failover | 없음 | 컨텍스트 강등 경로 부재 | ABSENT |
| RTO ≤ 30초 계측 | 없음 | RTO 개념·측정 부재 | ABSENT |

라이브는 **단일 노드**이므로 노드/리전/클러스터/PDP 간 승계 대상이 존재하지 않는다. 헬스(`SystemMetrics.php:60-100`·`Health.php:13-26`)는 장애 감지의 baseline은 되나, 감지 이후 우회·승계 로직은 전무하다.

## 3. 설계 계약

1. **순신설 failover 오케스트레이터**: 5종 failover + RTO 계측은 라이브 대응물 없음 → 전면 순신설. 감지 신호원으로 `SystemMetrics.php:60-100`·`Health.php:13-26`를 재사용(비파괴).
2. **Fail-closed 불변식**: Context/컨텍스트 소스 장애 시 안전 기본값은 **거부(deny)**로 강등한다(가용성보다 안전 우선 — 인가에서 fail-open 금지).
3. **Compliance 존중**: Region Failover는 §15 Compliance Region 제약을 위반하는 리전으로 승계 금지.
4. **선행 의존**: 다노드/다리전 토폴로지(§14)·라우팅(§15) 실재 후에만 성립 → BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE

`Db.php:116-166`·`:127`·`:120`의 MySQL→SQLite 투명 폴백은 **DB 접속 회복탄력성**이지 인가 패브릭 failover가 아니다. 단일 프로세스 내 스토리지 폴백일 뿐 PDP/리전/클러스터 승계와 무관 — 인가 failover로 흡수·PRESENT 계상 금지, 별도 유지.

## 5. 판정

**ABSENT.** 라이브는 단일노드로 PDP/Cache/Region/Cluster/Context failover가 전무하고 RTO 계측도 없다. 헬스 baseline(`SystemMetrics.php:60-100`·`Health.php:13-26`)은 감지 신호원일 뿐이며 승계 로직은 순신설이다. ★죽은 terraform의 autoscaling/multi-az 정의는 라이브 인가 경로와 무연결이므로 PRESENT로 계상하지 않는다 → NOT_CERTIFIED · BLOCKED_PREREQUISITE. 코드 변경 0.
