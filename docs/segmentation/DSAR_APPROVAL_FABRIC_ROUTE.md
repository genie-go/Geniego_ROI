# DSAR — Authorization Fabric Request Routing (Part 3-16 §15·§16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §15·§16 라우팅)

`APPROVAL_FABRIC_ROUTE`는 인가 결정 요청을 어느 PDP/노드/리전으로 보낼지 선택하는 라우팅 정책 계약이다. 라우팅 전략 5종:

- **Local First** — 로컬 노드 PDP 우선(최소 latency·최소 홉).
- **Nearest Region** — geo 근접 리전 PDP로 라우팅.
- **Lowest Latency** — 실측 latency 기반 최저 응답 PDP 선택.
- **Compliance Region** — 데이터 주권/규제(예: EU 데이터는 EU 리전) 강제 라우팅.
- **Disaster Recovery** — 1차 라우팅 실패 시 DR 리전으로 우회.

각 결정은 선택 근거(전략·후보군·탈락 사유)를 라우팅 결정 로그에 남겨야 한다.

## 2. 라이브 substrate 매핑

| SPEC 라우팅 전략 | 라이브 실재 | 근거 | 판정 |
|---|---|---|---|
| 단일 HTTP 진입점(basePath 자동감지) | 존재 | `backend/public/index.php:23` | 단일 노드 진입 |
| Local First(다노드 중 로컬 우선) | 없음 | 노드가 하나뿐 — 선택 대상 없음 | ABSENT |
| Nearest Region(geo 근접) | 없음 | 리전 분산·geo 인지 부재 | ABSENT |
| Lowest Latency(실측 기반 선택) | 없음 | 후보 PDP 집합·latency probe 부재 | ABSENT |
| Compliance Region(주권 강제) | 없음 | 리전 개념·데이터 주권 라우팅 부재 | ABSENT |
| Disaster Recovery(우회) | 없음 | DR 리전·failover 라우팅 부재 | ABSENT |

라이브의 모든 인가 요청은 **단일 Slim 앱 진입점**(`index.php:23` — 배포 형태에 따라 basePath만 자동감지)으로 수렴한다. 라우팅 "선택"은 존재하지 않으며 — 후보가 하나이므로 라우팅 결정 자체가 성립하지 않는다.

## 3. 설계 계약

1. **순신설 라우터**: 5개 전략을 평가하는 fabric-router는 라이브에 대응물이 없다(단일 진입점 `index.php:23`은 라우터가 아니라 프레임워크 basePath 처리). 전면 순신설.
2. **선행 의존**: 라우팅은 다수 PDP/리전 노드가 실재하고(§14 Cluster/Region 실재), 각 노드 헬스(§14)와 failover(§16)가 갖춰진 뒤에만 의미가 있다 → BLOCKED_PREREQUISITE.
3. **Compliance-first 불변식**: Compliance Region 제약은 Lowest Latency보다 우선한다(규제 위반 라우팅 금지 — 데이터 주권 hard constraint).
4. **결정 가시성**: 라우팅 선택은 근거 로그 필수(어느 전략이 어느 후보를 왜 선택/탈락시켰는지).

## 4. 판정

**ABSENT.** 라이브 인가는 단일 진입점(`index.php:23`)으로 전부 수렴하며 리전·geo·latency·compliance·DR 라우팅이 전무하다. 5개 전략 모두 순신설이고, 다노드/다리전 토폴로지(§14·§16)라는 선행조건이 부재하다 → NOT_CERTIFIED · BLOCKED_PREREQUISITE. 코드 변경 0.
