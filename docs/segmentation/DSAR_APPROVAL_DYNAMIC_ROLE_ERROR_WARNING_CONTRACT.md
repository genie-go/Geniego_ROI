# DSAR — Dynamic Role Error/Warning Contract (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Error/Warning Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§30(Error Contract)는 **RULE_NOT_FOUND · RULE_VERSION_INVALID · ATTRIBUTE_NOT_FOUND · CONTEXT_INVALID · RUNTIME_ROLE_INVALID · POLICY_BLOCKED · EVALUATION_FAILED**(7종) 하드 차단 코드를, §31(Warning Contract)은 **Rule Deprecated · Rule Drift · Context Drift · Runtime Review Required**(4종) 소프트 경고를 정의한다. ★이 저장소에는 Canonical Dynamic Role Error/Warning Contract 자체가 없다(grep 0) — `effectiveScope`의 `DENY_SCOPE` 문자열 반환(`TeamPermissions.php:234,251,260-263`)과 index.php RBAC 게이트의 403(`:572-598`)이 유일하게 실물 코드로 존재하는 근접 Error다. 본 문서는 11개 코드 각각을 근접 substrate와 대조한다.

## 2. Canonical 필드

- **Code** — §30/§31 원문 11종 중 1
- **분류** — Error(하드 차단)/Warning(소프트 경고)
- **판정** — 근접 substrate 유무(PARTIAL/ABSENT)
- **현재 substrate** — file:line(없으면 ABSENT)
- **HTTP 대응(설계 방향)** — 실 구현 시 상태코드 매핑(순신규)

## 3. 열거형 / 타입

**Error(§30) 7종(원문 그대로)**: `RULE_NOT_FOUND` · `RULE_VERSION_INVALID` · `ATTRIBUTE_NOT_FOUND` · `CONTEXT_INVALID` · `RUNTIME_ROLE_INVALID` · `POLICY_BLOCKED` · `EVALUATION_FAILED`.

**Warning(§31) 4종(원문 그대로)**: `RULE_DEPRECATED` · `RULE_DRIFT` · `CONTEXT_DRIFT` · `RUNTIME_REVIEW_REQUIRED`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 코드 | 분류 | 판정 | 근거(file:line) |
|---|---|---|---|---|
| 1 | `RULE_NOT_FOUND` | Error | **ABSENT** | RBAC용 Rule Engine/Registry 자체가 grep 0(EXISTING_IMPLEMENTATION §2). `RuleEngine.php`(`:12,24`)는 마케팅 automation(KEEP_SEPARATE)이라 대체 substrate 아님 |
| 2 | `RULE_VERSION_INVALID` | Error | **ABSENT** | Rule Version 개념 자체 부재(ADR §거버넌스 계층 완전 부재) |
| 3 | `ATTRIBUTE_NOT_FOUND` | Error | **PARTIAL** | MFA/session/risk/env 컬럼은 실재(`UserAuth.php:3525,4165`·`Db.php:1111-1119,56-61`)하나 이를 조회하는 전용 조회 API·오류코드 없음(EXISTING_IMPLEMENTATION §4). employment/position/department는 컬럼 자체 부재(grep 0) |
| 4 | `CONTEXT_INVALID` | Error | **PARTIAL** | index.php RBAC 게이트(`:572-598`)·`guardTeamWrite`(`:82-89`)가 요청 컨텍스트(api_key/method)를 이진 판정하나 전용 `CONTEXT_INVALID` 코드가 아니라 범용 403. Time/Device/Network Context는 판정 대상 자체 부재(EXISTING_IMPLEMENTATION §5) |
| 5 | `RUNTIME_ROLE_INVALID` | Error | **ABSENT** | Dynamic/Runtime/Session/Conditional Role 개념 자체 grep 0(EXISTING_IMPLEMENTATION §1) — team_role/api_key/admin_level은 전부 정적(fixed) role이라 "Runtime Role"이 존재하지 않음 |
| 6 | `POLICY_BLOCKED` | Error | **PARTIAL** | index.php RBAC 게이트(`:572-598`)·`guardTeamWrite`(`:82-89`)의 이진 거부가 근접 — 단 Permit/Deny/Challenge/Escalate 다중결정 PDP가 아니라 이진(허용/거부) 게이트(EXISTING_IMPLEMENTATION §6) |
| 7 | `EVALUATION_FAILED` | Error | **ABSENT** | Rule Evaluation 자체가 ABSENT(RBAC 맥락 grep 0) — 평가 실패를 반환할 평가 로직 자체가 없음 |
| 8 | `RULE_DEPRECATED` | Warning | **ABSENT** | Rule Deprecation 개념 부재(#1과 동일 근본 원인 — Registry 자체 없음) |
| 9 | `RULE_DRIFT` | Warning | **ABSENT** | RBAC Rule Drift 판정 로직 grep 0. `RuleEngine.php` 등 마케팅 도메인의 명명(rule/drift)만 유사할 뿐 대상(광고/재고) 전혀 다름(KEEP_SEPARATE, DUPLICATE_AUDIT D-1) |
| 10 | `CONTEXT_DRIFT` | Warning | **ABSENT** | Context Drift 판정 로직 grep 0 — Runtime Context 자체가 기록·표시용(`UserAuth.php:4243-4281`)이라 정의값 대비 실효값 불일치를 계산할 기준값이 없음 |
| 11 | `RUNTIME_REVIEW_REQUIRED` | Warning | **ABSENT** | Runtime Role/Certification/Review 주기 개념 부재(grep 0) — `auth_audit_log.risk`(`UserAuth.php:4165,4174-4197`)는 정적 심각도 라벨(호출부 하드코딩)이지 계산형 Review 트리거가 아님 |

## 5. 설계 원칙

1. **DENY_SCOPE/403을 전용 Dynamic Role 코드로 오표기 금지** — #4·#6 모두 근접이나 범용 거부값일 뿐 Rule Evaluation 상태머신 결과가 아님을 문서 전체에서 일관되게 PARTIAL로 명시.
2. **RUNTIME_ROLE_INVALID(#5)는 정적 role 대체가 아니라 신규 개념** — team_role/api_key/admin_level 정적 role 반환(`UserAuth.php:1019,191,1022`·`index.php:573-576`)을 삭제·재구현하지 않고, 그 위에 Runtime Role 판정 레이어를 얹는다(무후퇴).
3. **ATTRIBUTE_NOT_FOUND(#3)는 기존 attribute 컬럼을 재사용, 신규 컬럼 중복 신설 금지** — MFA/session/risk/env는 EXISTING_IMPLEMENTATION §4가 확정한 개별목적 컬럼을 그대로 결정 입력으로 편입.
4. **RULE_DRIFT(#9)는 마케팅 automation의 drift와 절대 혼동 금지** — `RuleEngine.php`/`Alerting.php`/`AutoCampaign.php`/`Decisioning.php`(DUPLICATE_AUDIT D-1)는 이 코드의 근접 substrate가 아니다(KEEP_SEPARATE).
5. **Warning 4종 전부 ABSENT를 날조하지 않는다** — 소프트 경고조차 발동하지 않는 현행을 정직하게 유지, "경고는 있는데 로그만 안 남긴다" 식 과장 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 11종 전부 Canonical Rule Registry/Version/Context/PDP 실구현 이후에 실 코드 발동 가능.
- **ABSENT(순신규)**: `RULE_NOT_FOUND`(#1)·`RULE_VERSION_INVALID`(#2)·`RUNTIME_ROLE_INVALID`(#5)·`EVALUATION_FAILED`(#7)·Warning 4종 전부(#8~#11).
- **PARTIAL(근접·불충분)**: `ATTRIBUTE_NOT_FOUND`(#3)·`CONTEXT_INVALID`(#4)·`POLICY_BLOCKED`(#6).
- **판정**: NOT_CERTIFIED · 실 Contract = Canonical Rule Registry/Version/Context/PDP 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_STATIC_LINT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_API_CONTRACT]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]
