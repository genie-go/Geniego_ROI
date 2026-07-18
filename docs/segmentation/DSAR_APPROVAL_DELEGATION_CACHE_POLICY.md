# DSAR — Approval Delegation Cache 원칙 (§62)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §62(줄 2604-2654) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ⓓ ADR: `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(예정)
> 판정 어휘(§58): `NOT_APPLICABLE`·`ABSENT`·`LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON`·`TEST_ONLY`·`BLOCKED_*` — **`VALIDATED_LEGACY` 금지(커버 0).**
> 측정기 분모: `--sec=62` → **41**(불릿 41·번호 0). **헤더 분할 분모 = Cache Key 항목 23 + 적용 원칙 18 = 41.** 육안 계수 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 서버 캐시 계층 | 🔴 `redis`·`memcached` 소스 **grep 0**(backend/src 전량) — 서버 사이드 캐시 스토어 부재 | `ABSENT` |
| apcu | `SystemMetrics.php:225·235-236`(`apcu_cache_info`/`apcu_sma_info` 정보조회)·`:428-455`(요청/에러 카운터 `apcu_fetch/store/inc`) — **지표(SLO) 전용 · Delegation Resolution 캐시 아님** | `KEEP_SEPARATE_WITH_REASON`(도메인 상이) |
| Delegation Resolution Cache | Delegation 엔티티 부재(ⓑ §0·§1) → 캐시할 resolution 자체가 없음 · cache key 신설 | `ABSENT` |
| 프론트 캐시(관리 메뉴트리) | `MenuVisibilityContext.jsx:28` `g_admin_menu_tree_cache`(localStorage) — 클라이언트 전용 UI 캐시 | `KEEP_SEPARATE_WITH_REASON`(클라 전용) |
| 프론트 캐시(FX 환율) | `CurrencyContext.jsx:143-158` `geniego_fx_rates`(localStorage) · **`CACHE_TTL = 60*60*1000`(=1시간·`:144`)** — ★헤더의 "24h TTL"은 오기, 실측 1h · TTL 만료 시 재조회(§20 effective-time 반영 아님) | `LEGACY_ADAPTER`(부분·클라 TTL만) |

★**서버 캐시 계층이 부재(Redis/Memcached 0)하고 Delegation 엔티티 자체가 없으므로 "무효화(Invalidation) 대상"이 존재하지 않는다.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이 / 인접 클라 캐시"를 기록한다. 원문에 없는 캐시 키를 지어내지 않는다.

## 1. 원문 전사 + 판정 — **원문 41종**(Cache Key 항목 23 + 적용 원칙 18)

### 1-A. Delegation Resolution Cache Key 항목 (23)

> 원문: "Delegation Resolution Cache Key에는 최소 다음을 포함하라."

| # | 원문 Cache Key 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | tenant_id | 서버 resolution 캐시 부재 → 키 컴포넌트 없음 · 격리는 `index.php:600`이 REAL이나 strict 기본 OFF(`:585`) | `NOT_APPLICABLE` |
| 2 | delegator_subject_id | Delegator Binding(§21) 부재 | `NOT_APPLICABLE` |
| 3 | delegate_subject_id | Delegate Binding(§22) 부재 | `NOT_APPLICABLE` |
| 4 | delegation_version_id | Delegation Version(§10) 부재 · 불변 version 체인 선례 0(ⓑ §2.1) | `NOT_APPLICABLE` |
| 5 | delegation_status | Lifecycle status(§41) 부재 | `NOT_APPLICABLE` |
| 6 | original_authority_version_id | Authority Version 부재 · Authority Registry/Matrix 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 7 | authority_domain | Authority Domain 부재 | `NOT_APPLICABLE` |
| 8 | authority_type | Authority Type 부재 | `NOT_APPLICABLE` |
| 9 | action | 인접 = `acl_permission` action(권한 매트릭스·resolution 캐시 아님·ⓑ §2.1) | `NOT_APPLICABLE` |
| 10 | resource_type | Resource Binding(§13) 부재 | `NOT_APPLICABLE` |
| 11 | resource_id | Resource Binding(§13) 부재 | `NOT_APPLICABLE` |
| 12 | organization_id | Org 마스터 부재(ⓑ §3.3) | `NOT_APPLICABLE` |
| 13 | legal_entity_id | Legal Entity 엔티티 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 14 | geography | 인접 = `Geo`(IP→ISO→언어·Authority 스코프 아님) | `NOT_APPLICABLE` |
| 15 | amount | 금액축 저장계층 부재 · `HIGH_VALUE_KRW` 상수만(ⓑ §3.2) | `NOT_APPLICABLE` |
| 16 | currency | 통화 스코프 0 · 프론트 FX만(`CurrencyContext.jsx:143`·클라) | `NOT_APPLICABLE` |
| 17 | approval_chain_version_id | Approval Chain(5-3-3-3) 커버 0(ⓑ §3.1) | `NOT_APPLICABLE` |
| 18 | approval_chain_level_id | Chain Level 부재 | `NOT_APPLICABLE` |
| 19 | effective_timestamp | Effective-dated Period(§20) 부재 · FX 캐시 TTL(1h)은 effective-time 인식 아님 | `NOT_APPLICABLE` |
| 20 | acceptance_version | Delegation Acceptance(§23) 부재 | `NOT_APPLICABLE` |
| 21 | approval_version | Delegation Approval(§24) 부재 | `NOT_APPLICABLE` |
| 22 | re-delegation_chain_hash | Re-delegation Governance(§37)/Cycle(§38) 부재 · 인접 hash 정본 = `SecurityAudit::verify()`(ⓑ §2.5) | `NOT_APPLICABLE` |
| 23 | policy_version_set_hash | Policy Version Set 부재 · `RuleEngine`은 마케팅 세그 DSL(승인 정책 아님·ⓑ §2.1) | `NOT_APPLICABLE` |

### 1-B. 적용 원칙 (18)

> 원문: "다음을 적용하라."

| # | 원문 적용 원칙 | 현행 대조 | 판정 |
|---|---|---|---|
| 24 | Version-aware Cache | 불변 version 체인 선례 0(ⓑ §2.1) → 버전 인식 캐시 대상 없음 | `NOT_APPLICABLE` |
| 25 | Tenant-isolated Cache | 서버 resolution 캐시 부재 · 격리 원칙은 Guard 레벨(`index.php:600`)에만 존재(캐시 아님) | `NOT_APPLICABLE` |
| 26 | Effective-time-aware Cache | Effective-dated 부재 · FX TTL(1h·`CurrencyContext.jsx:144`)은 만료-재조회일 뿐 effective-time 인식 아님 | `LEGACY_ADAPTER`(부분) |
| 27 | Authority-aware Cache | Authority 엔티티 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 28 | Actor-state-aware Cache | Actor Auth Snapshot ABSENT(ⓑ §3.4) | `NOT_APPLICABLE` |
| 29 | Acceptance-aware Cache | Acceptance(§23) 부재 | `NOT_APPLICABLE` |
| 30 | Approval-aware Cache | Approval(§24) 부재 | `NOT_APPLICABLE` |
| 31 | Cycle-aware Cache | Cycle Detection(§38) 부재 · 인접 DFS는 PM/메뉴 도메인(ⓑ §2.4) | `NOT_APPLICABLE` |
| 32 | Delegation Activation 시 Invalidation | Activation(§42) 부재 → 무효화 대상 없음 | `NOT_APPLICABLE` |
| 33 | Suspension 시 즉시 Invalidation | Suspension(§43) 부재 | `NOT_APPLICABLE` |
| 34 | Revocation 시 즉시 Invalidation | Revocation(§44) 부재 · `agency_client_link.revoked_at`(접근권·캐시무효화 아님·ⓑ §2.3) | `NOT_APPLICABLE` |
| 35 | Expiration 시 즉시 Invalidation | Expiration(§45) 부재 | `NOT_APPLICABLE` |
| 36 | Authority 변경 시 Invalidation | Authority 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 37 | Role·Position 변경 시 Invalidation | Position/Incumbency 0 · Role=`team_role` flat enum 3값(ⓑ §3.3) · 무효화 캐시 대상 없음 | `NOT_APPLICABLE` |
| 38 | Legal Entity 변경 시 Invalidation | Legal Entity 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 39 | Delegate 상태 변경 시 Invalidation | Delegate Binding(§22)/상태 부재 | `NOT_APPLICABLE` |
| 40 | Critical Conflict 시 Cache 차단 | Delegation Conflict(§34) 부재 → 차단할 캐시 없음 | `NOT_APPLICABLE` |
| 41 | 과거 Snapshot은 Current Cache로 재생성 금지 | Snapshot(§39) 부재 · 인접 검증형 정본 = `SecurityAudit::verify():56-68`(재계산 검증·ⓑ §2.5) — 캐시 재생성 정책은 신설 시 이 무결성 원칙 상속 | `NOT_APPLICABLE` |

**실측 개수: 41 / 41 전사**(Cache Key 23 + 원칙 18). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1 · `NOT_APPLICABLE` 40.

> 🔴 **커버 0.** 서버 캐시 계층이 부재(Redis/Memcached 0)하고 Delegation Resolution 엔티티가 없으므로 **무효화(Invalidation) 대상이 존재하지 않는다.** `LEGACY_ADAPTER` 1건(#26 Effective-time-aware=FX 1h TTL)은 클라 전용 부분 인접이지 커버가 아니다.

## 2. 규칙

- 🔴 **무효화 대상 부재를 "우연한 준수"로 계산 금지** — 서버 캐시가 없어서 "stale delegation을 절대 서빙하지 않는다"고 표기하지 마라. 이는 Correctness가 아니라 **캐시 계층 부재의 부산물**이며, resolution 캐시를 신설하는 순간 §62 무효화 18원칙이 전부 신규 요건이 된다.
- 🔴 **`apcu`(SystemMetrics.php:225-455)를 Delegation 캐시로 전용 금지** — SLO 지표(요청/에러 카운터) 전용이다. Resolution 캐시로 재사용하면 지표 오염 + TTL 60s가 위임 유효기간(§20)과 무관하게 stale를 유발한다. 별도 스토어로.
- 🔴 **프론트 localStorage 캐시(`g_admin_menu_tree_cache`·`geniego_fx_rates`)를 서버 신뢰 소스로 승격 금지** — 클라 전용이며 변조 가능. Delegation Resolution은 서버가 매 Decision 시점 재검증(ⓑ §5.11)해야 하고 클라 캐시로 대체할 수 없다. `KEEP_SEPARATE_WITH_REASON`.
- 🔴 **FX 캐시(1h TTL)를 Effective-dated 캐시 패턴의 선례로 오독 금지** — `CACHE_TTL = 60*60*1000`(`CurrencyContext.jsx:144`)은 만료-재조회일 뿐 특정 시점(effective_timestamp)의 값을 결정론적으로 재생성하지 않는다. §62 "과거 Snapshot을 Current Cache로 재생성 금지"와 정면으로 다르다.
- 🔴 **Cache Key에 `tenant_id`·`delegation_version_id`·`effective_timestamp`를 반드시 포함하라(신설 시)** — 셋 중 하나라도 누락하면 Cross-Tenant 서빙·stale version·시점 오염이 구조적으로 발생한다. Guard가 strict 기본 OFF(`index.php:585`)인 잔여를 캐시 키에서 재현하지 마라.
