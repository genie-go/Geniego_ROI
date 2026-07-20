# DSAR — Authorization Fabric Health Monitoring (Part 3-16 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §14)

`APPROVAL_FABRIC_HEALTH`는 인가 패브릭 전체 구성요소의 실시간 건강 상태를 단일 관측면(observability plane)으로 집계하는 계약이다. 관측 대상 6종:

- **Cluster Status** — 인가 클러스터 노드 멤버십·quorum·leader 여부.
- **Region Status** — 리전별 PDP(Policy Decision Point) 가용성·리전 격리 상태.
- **Cache Status** — 결정 캐시(decision cache)·정책 캐시 hit ratio·staleness·warm/cold.
- **PDP Status** — 정책 평가 엔진 latency·evaluation error rate·정책 버전 정합.
- **PEP Status** — 정책 집행점(Policy Enforcement Point) 접속성·enforce/deny 분포·fail-mode.
- **Sync Status** — 노드간 정책/할당 복제 지연(replication lag)·수렴 여부.

각 상태는 `HEALTHY / DEGRADED / UNAVAILABLE` 3단계 + 마지막 관측 timestamp·근거 metric을 포함해야 한다(관측 불가는 UNKNOWN, HEALTHY로 위장 금지 — Fail-visible).

## 2. 라이브 substrate 매핑

| SPEC 관측 대상 | 라이브 실재 | 근거 | 판정 |
|---|---|---|---|
| 단일노드 프로세스 헬스 | 존재 | `backend/src/Handlers/SystemMetrics.php:32`·`:60-100`·`:67-76` | PARTIAL baseline |
| 경량 liveness probe | 존재 | `backend/src/Handlers/Health.php:13-26` | PARTIAL baseline |
| Cluster Status(노드 멤버십·quorum) | 없음 | 단일노드·클러스터 개념 부재 | ABSENT |
| Region Status(리전별 PDP) | 없음 | 리전 분산 없음 | ABSENT |
| Cache Status(결정 캐시 관측) | 없음 | 결정 캐시 계층 부재 | ABSENT |
| PDP Status(정책 엔진 latency/error) | 없음 | 독립 PDP 없음(인가는 요청경로 인라인) | ABSENT |
| PEP Status(집행점 분포) | 없음 | 독립 PEP 관측면 부재 | ABSENT |
| Sync Status(replication lag) | 없음 | 노드간 복제 없음(단일 DB) | ABSENT |

라이브 헬스는 **단일 프로세스/DB 관점**의 지표만 노출한다(`SystemMetrics.php:60-100` = 프로세스·DB·리소스 메트릭, `Health.php:13-26` = liveness). 이는 패브릭 관측면의 필요조건이나, 노드/리전/캐시/PDP/PEP/Sync 어느 축의 집계도 포함하지 않는다.

## 3. 설계 계약

1. **Substrate 확장(비파괴)**: `SystemMetrics.php:32`·`:60-100`·`:67-76`·`Health.php:13-26`의 단일노드 지표는 패브릭 헬스의 **노드-로컬 기여자(node-local contributor)**로 승격 재사용한다. 기존 응답 shape·엔드포인트 무변경(Extend-not-Replace).
2. **집계 계층 순신설**: 노드-로컬 기여자들을 수집·집계해 Cluster/Region/Cache/PDP/PEP/Sync 6축 상태를 산출하는 fabric-health aggregator는 라이브에 대응물이 전무 → 순신설.
3. **Fail-visible 불변식**: 관측 불가 축은 UNKNOWN으로 보고(HEALTHY 위장 금지). 단일노드 배포에서 Cluster/Region/Sync는 "N/A(single-node)"로 정직 표기 — DEGRADED와 구분.
4. **근거 metric 필수**: 모든 상태는 관측 timestamp + 산출 근거를 동반한다(XAI 원칙 준용).

## 4. 판정

**PARTIAL baseline.** 단일노드 프로세스/liveness 헬스(`SystemMetrics.php:32`·`:60-100`·`:67-76`·`Health.php:13-26`)는 실재하며 패브릭 헬스의 노드-로컬 기여자로 확장 가능하다. 그러나 노드간·리전·클러스터·캐시·PDP·PEP·Sync 집계는 **전부 순신설**이며 라이브 substrate가 없다 → NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행: 패브릭 노드 토폴로지·복제 계층 실재 후에만 실집계 가능). 코드 변경 0.
