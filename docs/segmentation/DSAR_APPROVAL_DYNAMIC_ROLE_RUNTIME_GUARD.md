# DSAR — Dynamic Role Runtime Guard (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Runtime Guard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · Dynamic≠정적 role · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§28(Runtime Guard)는 Rule Evaluation·Dynamic Role 활성화가 발생하는 **매 요청 시점**에 발동해야 하는 차단 목록이다: **Invalid Rule · Unknown Decision · Invalid Context · Missing Attribute · Missing Version · Invalid Projection**(6종). ★ADR/GROUND_TRUTH가 확정한 대로, Dynamic Role Registry·Rule Engine·PDP는 이 저장소에 **순신규(ABSENT, grep 0)**다. 가장 근접한 실 substrate는 ① `guardTeamWrite`(`index.php:82-89`) 전역 쓰기가드·index.php RBAC 게이트(`:572-598`)의 **정적(이진) 게이트** ② `effectiveScope` fail-closed 판정(`TeamPermissions.php:236-265`·DENY_SCOPE `:234,251,260-263`)이며, 이는 **Dynamic Role Rule을 참조하는 전용 Runtime Guard가 아니라 매 요청 라이브 재계산되는 정적 값 게이트**다(ADR D-1·D-5). 본 문서는 §28의 6개 차단 항목 각각을 실 substrate와 대조해 PARTIAL/ABSENT를 정직 판정한다.

## 2. Canonical 필드

- **Guard ID** — §28 6종 중 1
- **Trigger Condition** — 차단 발동 조건(§28 원문)
- **Related Rule Version** — Part 3-5 §8 Rule Version 참조(순신규)
- **Related Error Code** — §30 대응 코드([[DSAR_APPROVAL_DYNAMIC_ROLE_ERROR_WARNING_CONTRACT]])
- **Enforcement Point** — Read-time(Runtime Role Evaluation) / Write-time(Rule 생성·변경)
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

§28 Runtime Guard 6종(원문 그대로): `INVALID_RULE_BLOCKED` · `UNKNOWN_DECISION_BLOCKED` · `INVALID_CONTEXT_BLOCKED` · `MISSING_ATTRIBUTE_BLOCKED` · `MISSING_VERSION_BLOCKED` · `INVALID_PROJECTION_BLOCKED`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §28 차단 항목 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Invalid Rule 차단 | **ABSENT(순신규)** | RBAC용 Rule Engine 자체가 grep 0(EXISTING_IMPLEMENTATION §2). `RuleEngine.php`(`:12,24,32,34,194-220`)는 channel_roas/sku_stock 대상 마케팅/재고 자동화이며 role/permission 문자열 전무 — **KEEP_SEPARATE**(ADR D-4). "Rule이 유효한지" 판정할 RBAC Rule 자체가 없음 |
| 2 | Unknown Decision 차단 | **PARTIAL(철학 근접)** | ADR D-2가 확정한 "UNKNOWN·ERROR는 Permit 금지" 철학의 근접 substrate=`effectiveScope` fail-closed(DENY_SCOPE `TeamPermissions.php:234,251,260-263`) — 단 이는 Rule Evaluation TRUE/FALSE/UNKNOWN/ERROR 4상태 모델이 아니라 scope 값 재계산 결과의 이진(허용/거부) 판정. PDP/Policy Decision 자체는 ABSENT(`index.php:572-598`은 근접 이진 게이트, PEP_NEAR) |
| 3 | Invalid Context 차단 | **PARTIAL** | Runtime Context는 대부분 기록·표시용(`user_session` `Db.php:1111-1119`·`recordSessionMeta`/`listSessions` `UserAuth.php:4243-4281`)이며 role 결정 로직 입력으로 연결된 지점 없음(EXISTING_IMPLEMENTATION §5). index.php RBAC 게이트(`:572-598`)·`guardTeamWrite`(`:82-89`)는 요청 컨텍스트(api_key 존재·method)를 판정하나 Dynamic Context Validation 전용 로직이 아님 |
| 4 | Missing Attribute 차단 | **PARTIAL** | Attribute Source 컬럼은 실재(MFA `mfa_enabled/mfa_secret/mfa_method` `UserAuth.php:3525`·session age `Db.php:1111-1119`·login time/risk `auth_audit_log.at/risk` `UserAuth.php:4165`·env `Db::envLabel()` `Db.php:56-61`)하나, 이들이 role 활성 입력으로 조합되는 지점이 없어(EXISTING_IMPLEMENTATION §4·표) "속성 누락"을 판정할 Rule Evaluation 자체가 없음 |
| 5 | Missing Version 차단 | **ABSENT(순신규)** | Rule Version 개념 자체가 이 저장소에 없음(ADR §거버넌스 계층 완전 부재 — Version/Snapshot/Digest/Evidence grep 0). 검사 대상 자체가 부재 |
| 6 | Invalid Projection 차단 | **ABSENT(순신규)** | Dynamic Permission/Scope Projection·Cache 자체가 순신규(ADR D-5·§3 Canonical Interface). 현행 `effectiveScope`는 라이브 재계산이지 Projection 산출물 대조가 아님(ADR §근접 substrate 표) |

**근접 Runtime Guard substrate 정리**: `guardTeamWrite`(`index.php:82-89`) + index.php RBAC 게이트(`:572-598`) + `effectiveScope` fail-closed(`TeamPermissions.php:236-265`) — Rule/Context/Attribute/Version/Projection을 판정하는 것이 아니라 **정적 role rank + data_scope 값을 매 요청 즉시 재조회**하는 이진 게이트다. §28이 요구하는 "Rule Evaluation 상태머신 기반 차단"과는 판정 축이 근본적으로 다르다(즉시값 대조 vs Rule/Context/Version 기반 다상태 결정).

## 5. 설계 원칙

1. **guardTeamWrite/index.php RBAC 게이트/effectiveScope는 확장 기반이지 Dynamic Role Runtime Guard 자체가 아니다** — Canonical Runtime Guard는 이 정적 게이트를 대체하지 않고 그 위에 Rule/Context/Attribute/Version/Projection 판정 레이어로 얹는다(무후퇴·기존 게이트 삭제 금지, ADR D-1).
2. **UNKNOWN Permit 금지(D-2)는 effectiveScope fail-closed 철학을 Rule Evaluation 전역으로 확장하는 것이지 재발명이 아니다** — DENY_SCOPE 패턴(`TeamPermissions.php:234`)을 Rule Evaluation TRUE/FALSE/UNKNOWN/ERROR 4상태 모델의 안전 기준선으로 승격.
3. **Missing Attribute Guard는 기존 attribute 컬럼(MFA/session/risk/env)을 삭제·재구현하지 않고 결정 입력으로 편입** — `UserAuth.php` 개별목적 컬럼(EXISTING_IMPLEMENTATION §4)을 그대로 재사용, 신규 컬럼 중복 신설 금지.
4. **Invalid Rule/Missing Version/Invalid Projection 3종은 순신규이며 근접 substrate로 오분류 금지** — RBAC Rule Engine·Version·Projection 전부 grep 0을 그대로 정직 유지.
5. **마케팅 `RuleEngine.php` 등 4곳은 이 Guard의 판정 대상이 아니다(KEEP_SEPARATE, ADR D-4)** — Invalid Rule 차단이 실 구현되어도 channel_roas/sku_stock 자동화는 별개 도메인으로 보존.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 6종 전부 Canonical Rule Registry/Version·PDP·Projection 실구현 이후에 실 Guard 발동 가능. 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core가 코드 0(설계만)이므로 Rule↔Permission/Scope version 결합 자체가 성립 불가.
- **ABSENT(순신규)**: Invalid Rule(#1)·Missing Version(#5)·Invalid Projection(#6) — 대상 개념 자체가 substrate에 없음(날조 금지).
- **PARTIAL(근접·불충분)**: Unknown Decision(#2)·Invalid Context(#3)·Missing Attribute(#4) — effectiveScope fail-closed·index.php RBAC 게이트·attribute 컬럼이 근접이나 전용 Rule Evaluation 판정 로직 없음.
- **판정**: NOT_CERTIFIED · 실 Guard = Canonical Rule Registry/Version + PDP + Projection 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_STATIC_LINT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]
