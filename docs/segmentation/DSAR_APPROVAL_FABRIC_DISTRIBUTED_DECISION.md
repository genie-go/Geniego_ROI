# DSAR — Distributed Decision Engine (Part 3-16 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Distributed Decision Engine(§6)은 Unified Authorization Fabric의 authz 결정(PDP)을 복수 노드/위치에 분산해 수행하는 계약이다. 계약 요소:

- **Regional Decision**: region-local 노드가 근접 위치에서 결정.
- **Global Decision**: 전역 일관 정책에 근거한 중앙 결정.
- **Federated Decision**: 복수 결정 도메인이 연합해 합의 결정.
- **Offline Decision**: 중앙 미도달 시 로컬 캐시 정책으로 결정.
- **Cached Decision**: 결정 결과/정책 스냅샷 캐시로 지연·부하 절감.

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| 결정 지점(PDP) | 단일 노드 in-process 결정 `index.php:69-622`·역할/권한 판정 `TeamPermissions.php:695-701` | **PARTIAL(단일노드)** |
| Regional decision | 없음 — 단일 리전·단일 호스트 `Db.php:120` | **ABSENT** |
| Global/Federated decision | 없음 — 연합/합의 노드 없음 | **ABSENT** |
| Offline decision | 없음 — 로컬 정책 캐시 계약 없음 | **ABSENT** |
| Cached decision | 없음 — 매 요청 in-process 재판정 | **ABSENT** |
| 분산 오케스트레이션 의존 | 없음 — `composer.json:5-13` 무의존 | **ABSENT** |

## 3. 설계 계약 (순신설 — 코드 0)

distributed decision plane을 신규 도입한다. 결정 계약을 노드 위치와 분리(policy/decision 외부화)하고, region-local PDP가 근접 결정을 수행하되 전역 정책 스냅샷과 정합한다. federated decision은 도메인 간 합의 규칙으로, offline decision은 로컬 정책 번들로, cached decision은 TTL·무효화 계약으로 정의한다. 현 단일노드 in-process 결정(`index.php:69-622`·`TeamPermissions.php:695-701`)은 분산 노드의 **참조 결정 로직**으로 승격하되, 분산 시에도 최종 fail-secure 거부 계약을 불변식으로 유지한다.

## 4. ★KEEP_SEPARATE — 오판 금지

- 현 결정은 단일노드 in-process(`index.php:69-622`·`TeamPermissions.php:695-701`)이다 — regional/global/federated/offline/cached 분산 결정의 PRESENT 근거로 오용 금지(단일노드 판정만 PARTIAL).
- **죽은 terraform/compose**: `infra/aws/terraform/*`·`infra/docker-compose.yml`은 라이브 무연결 죽은 스캐폴딩이며 분산 결정 노드를 구성하지 않는다 — PRESENT 근거 인용 금지.

## 5. 판정

**ABSENT.** 라이브 authz 결정은 단일노드 in-process(`index.php:69-622`·`TeamPermissions.php:695-701`)뿐이며 regional/global/federated/offline/cached 분산 결정이 전무하다(`composer.json:5-13` 무의존·단일 호스트 `Db.php:120`). Distributed Decision substrate는 순신설 대상이며 선행 결정-외부화·region/federation plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
