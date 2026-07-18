# DSAR — Cache Policy (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 근거: §GROUND_TRUTH(ⓑ 전수조사) + §CONTRACTS §69 CACHE_POLICY. file:line 인용은 허용목록만.

## 1. 원문 전사 (Canonical Contract §69)

### 1.1 Validation Cache Key 구성요소 (전사)

Validation Cache Key = 다음 전 구성요소의 합성:

1. tenant
2. instance
3. slot
4. command id
5. request hash
6. actor subject version
7. actor state version
8. case version
9. work item version
10. assignment version
11. claim version
12. lease version
13. authority version set hash
14. delegation version set hash
15. sequential step version
16. cursor version
17. decision version
18. action type
19. resource
20. amount
21. currency
22. security context version
23. effective timestamp

### 1.2 캐시 규율 (전사)

- **Version-aware** — 모든 버전 요소가 키에 포함.
- **Tenant-aware / Actor-aware / Assignment-aware / Claim-Lease-aware / Authority-aware / Delegation-aware / Sequential-state-aware / Slot-aware.**
- **Validation TTL** — Validation Result는 유한 TTL(§26 `expires_at`·무기한 재사용 금지).
- **전 이벤트 Invalidation** — 관련 상태 변경 이벤트 발생 시 캐시 무효화.
- **Critical Drift 차단** — Validation↔Commit 사이 Critical Drift(§51) 시 캐시 히트여도 Commit 차단(§32 Commit 직전 재검증).
- **과거 Snapshot 재생성 금지** — 과거 시점 스냅샷(§54)을 캐시 워밍으로 재생성 금지.

## 2. 기존 구현 대조

정본 Validation Cache Policy **부재**(ABSENT). 애초에 캐시할 대상인 **분리된 Validation Result(§26)가 없다** — 현행 검증은 요청 처리 중 인라인 즉시 수행:

- 인라인 검증만: enum 화이트리스트 `AdminGrowth.php:1321` · 자기승인 차단 `Mapping.php:268` · dedup `:278` · 정족수 maker-checker `:287`. 검증 결과를 영속·재사용하는 캐시 계층 0.
- Validation Result 엔티티 부재 → TTL·Invalidation·Cache Key 개념 매핑 대상 없음([[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] §2 Validation Pipeline=PARTIAL 인라인).
- 캐시 키 구성 23요소 대비 현행 버전 요소 실측:
  - Optimistic Version(actor/case/assignment/claim/lease/step/cursor/decision version) = **ABSENT**(version 컬럼 0·`Catalog.php:2397` WHERE status는 CAS-lite·버전 아님).
  - authority/delegation version set hash = **ABSENT**(§3.2 Authority·§3.3 Delegation 부재).
  - security context version = **PARTIAL**(Tenant Guard·`SecurityAudit.php:56-68` 존재하나 버전화된 컨텍스트 아님).
  - request hash = **ABSENT**(결정)/PRESENT(웹훅 `Paddle.php:343-368`).
- ★위험: 캐시 부재가 문제가 아니라, **Commit 직전 재검증(§32)이 없다**는 것이 핵심 결함. `Mapping::approve`는 read(:273)-modify-write(:288)를 트랜잭션 없이 수행 → 검증 시점과 쓰기 시점 사이 Drift를 잡지 못함(TOCTOU). 캐시가 있었다면 stale hit로 오히려 악화됐을 구조.

## 3. 판정

- **Verdict**: **ABSENT**(정본 Validation Cache Policy). 캐시할 Validation Result 자체가 부재(PARTIAL 인라인 검증만).
- **선행 의존**: Cache Key 23요소가 §44 Optimistic Version·§3.2 Authority·§3.3 Delegation·§3.4 Assignment·§3.5 Sequential(모두 ABSENT) 버전을 요구 → **BLOCKED_PREREQUISITE**. 우선순위상 캐시는 Validation Pipeline(§25) 분리 후 최후 최적화.
- **cover**: **0**.

## 4. 확장/구현 방향 (설계)

- **선(先) Validation Result 영속화**: §26 Validation Result 엔티티(status·expires_at·context hash·각 검증 결과) 신설이 캐시의 전제. 캐시는 그 위의 성능 레이어.
- **Cache Key = 23요소 합성 해시**: 하나라도 버전 변경 시 키 miss → 재검증. 특히 authority/delegation **version set hash**(§13/§14)는 위임 그래프 전체의 버전 집합 → 위임 변경 시 광범위 무효화.
- **무기한 재사용 금지 · Commit 직전 재검증 우선**: 캐시 히트여도 §32 Commit Revalidation(Validation Result 유효기간·Context Hash 불변·Version 일치·동일 Slot Committed 없음·Lock/Fencing 최신)을 **항상** 통과해야 Commit. Critical Drift(§51) 감지 시 캐시 무시·차단(Fail-Closed).
- **전 이벤트 Invalidation**: §28 EVENT(Assignment 변경/Authority Revocation/Delegation Expiration/Step 전이/Security Suspension 등) 발생 시 관련 Cache Key 무효화 훅.
- **과거 Snapshot 불재생성**: §54 과거 스냅샷은 불변 저장·캐시 워밍으로 재계산 금지(재해석 방지).
- **재사용**: request hash 캐시 컴포넌트는 Paddle 웹훅 해시 패턴 참조(VALIDATED_LEGACY). Drift 차단은 §51/§32 로직에 위임.
- **실 구현 = Validation Pipeline(§25) 분리 후 별도 승인세션**. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_DECISION_API_CONTRACT]] · [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
