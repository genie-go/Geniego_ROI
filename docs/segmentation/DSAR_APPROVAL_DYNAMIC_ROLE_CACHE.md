# DSAR — Dynamic Role Cache 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Cache + Cache Invalidation · 스펙 §22+§23)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · PEP≠PDP · **Cache는 Version 기반**(스펙 §22 명문) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §22 Cache는 Context/Rule/Projection/Evaluation 4종을 **Version 기반**으로 캐시하는 엔티티다. §23 Cache Invalidation은 Rule 변경·Context 변경·Session 종료·Risk 변경·Policy 변경 5개 트리거로 무효화를 강제한다. ADR §3(거버넌스 계층 완전 부재)이 명시하는 대로 **"Projection/Cache(effectiveScope 라이브 재계산·캐시0)"** — 현재는 캐시 자체가 존재하지 않고 매 요청 즉석 재계산된다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | cache id / key | Cache 키(Subject+Version 기반) |
| 2 | subject id | 대상 Subject |
| 3 | cached type | 아래 §3 열거형(§22) |
| 4 | rule/context version id | 캐시 기준 Version(스펙 §22 "Version 기반") |
| 5 | cached value / payload | 캐시된 산출값 |
| 6 | computed at | 산출 시각 |
| 7 | invalidated at | 무효화 시각 |
| 8 | invalidation trigger | 아래 §3 열거형(§23) |
| 9 | status | 활성/무효화됨 |

## 3. 열거형 / 타입

**Cached Type**(스펙 §22 원문): `CONTEXT_CACHE` · `RULE_CACHE` · `PROJECTION_CACHE` · `EVALUATION_CACHE`

**Invalidation Trigger**(스펙 §23 원문): `RULE_CHANGED` · `CONTEXT_CHANGED` · `SESSION_ENDED` · `RISK_CHANGED` · `POLICY_CHANGED`

## 4. 실 substrate 매핑 (ABSENT — 캐시 0)

| Canonical | 근접 substrate(캐시 아님·라이브 재계산) | file:line | 판정 |
|---|---|---|---|
| Cache 저장체(전용, 4종 전부) | — | — | **ABSENT** — ADR §3 "Projection/Cache(effectiveScope 라이브 재계산·캐시0)" 명문 |
| PROJECTION_CACHE 대상(무캐시 산출 로직 자체는 실재) | `effectiveScope`(DATA_SCOPES 9차원·fail-closed) | `TeamPermissions.php:236-265`(EXISTING_IMPLEMENTATION §3) | 근접(산출 로직은 실재) — 그러나 Version 무관·매 요청 재계산·저장/무효화 개념 없음 |
| RULE_CACHE 대상 | — | — | **ABSENT** — Rule Engine(§6) 자체가 RBAC용으로 순신규(EXISTING_IMPLEMENTATION §2). 마케팅 `RuleEngine.php`(`:12,24,32,34,194-220`)는 KEEP_SEPARATE 대상이라 RULE_CACHE 근접 substrate로 오흡수 금지 |
| CONTEXT_CACHE 대상 | Runtime Context(user_session·recordSessionMeta·listSessions) 표시/기록용 조회 | `UserAuth.php:4237,4243-4281`(EXISTING_IMPLEMENTATION §5) | 근접(조회 로직은 실재) — 그러나 role 결정 미사용·캐시 개념 없음 |
| EVALUATION_CACHE 대상 | — | — | **ABSENT** — Rule Evaluation(§9) 자체가 ABSENT |
| RULE_CHANGED 트리거 이벤트 소스 | — | — | **ABSENT**(Rule 자체 부재) |
| CONTEXT_CHANGED 트리거 이벤트 소스(근접) | `recordSessionMeta`(세션 메타 갱신) | `UserAuth.php:4243-4251`(EXISTING_IMPLEMENTATION §5) | 근접(변경 이벤트 자체는 실재) — 이를 소비해 캐시를 무효화하는 대상 캐시가 없어 트리거 개념 자체가 성립하지 않음 |
| SESSION_ENDED 트리거 이벤트 소스(근접) | Session Role(§12)이 세션 종료 시 자동 삭제되어야 하나 Session Role 자체가 ABSENT(EXISTING_IMPLEMENTATION §1) | — | **ABSENT**(무효화 대상 Session Role 부재) |
| RISK_CHANGED 트리거 이벤트 소스 | `auth_audit_log.risk`가 정적 라벨이라 "변경"이라는 개념 자체가 계산형 값 변화가 아님 | `UserAuth.php:4165,4174-4197`(EXISTING_IMPLEMENTATION §7) | **ABSENT**(계산형 risk 부재 — 별편 `DSAR_APPROVAL_DYNAMIC_RUNTIME_RISK_EVALUATION.md`) |
| POLICY_CHANGED 트리거 이벤트 소스 | — | — | **ABSENT**(Policy Decision §18 자체가 ABSENT) |

## 5. 설계 원칙

- Cache는 반드시 Version 기반(스펙 §22 명문) — Rule/Context Version이 바뀌면 캐시 키도 바뀐다(stale read 방지). 그러나 현재 Rule Version(§8)·Context 자체가 순신규이므로 "Version 기반 Cache"는 선행 없이 설계만 가능하다.
- 현재 `effectiveScope`류가 "캐시 없이 매 요청 라이브 재계산"하는 것은 정확성 관점에서는 안전(항상 최신)하지만, Cache 도입 시에는 §23의 5개 트리거 전부가 무효화를 강제해야 하며, RULE_CHANGED·RISK_CHANGED·POLICY_CHANGED는 각각 §6 Rule Engine·§20 Runtime Risk·§18 Policy Decision이 먼저 실 구현된 후에만 트리거 이벤트 소스가 의미를 갖는다(현재는 무효화할 대상 자체가 없음).
- ★Cache 신설은 성능 최적화이지 정합성 완화가 아니다 — 무효화 트리거 누락 시 stale Dynamic Role/Permission/Scope 노출(권한상승) 위험이므로 Mandatory Control 후보로 취급한다. UNKNOWN Permit 금지 원칙(ADR D-2)과 마찬가지로, 캐시된 값이 무효화 트리거를 놓쳐 "과거 Permit"을 계속 반환하는 경로는 fail-closed 설계(TTL·버전 불일치 시 재계산 강제)로 원천 차단한다.
- 마케팅 `RuleEngine.php`(`Alerting.php:12`·`AutoCampaign.php:14-15,222-226`·`Decisioning.php:12`)의 캐시/평가 로직을 RULE_CACHE/EVALUATION_CACHE의 근접 substrate로 재사용하지 않는다(KEEP_SEPARATE — DUPLICATE_AUDIT §D-1).

## 6. Gap / BLOCKED_PREREQUISITE

- Cache 저장체(4종)·Version 기반 키 = ABSENT(캐시 자체 0·ADR §3).
- 5개 Invalidation Trigger 전부 무효화 "대상 캐시"가 없어 트리거 개념 자체가 미성립 — RULE_CHANGED/RISK_CHANGED/POLICY_CHANGED는 각각 §6/§20/§18 선행 구현 필요, CONTEXT_CHANGED/SESSION_ENDED는 이벤트 소스는 근접이나 소비 대상 부재.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 및 §6 Rule Engine·§18 Policy Decision·§20 Runtime Risk 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
