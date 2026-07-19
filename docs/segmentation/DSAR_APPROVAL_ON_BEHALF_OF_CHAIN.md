# DSAR — On-behalf-of Chain (06-A-03-02-03-03 · §41)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §41.

## 1. 원문 전사 (Canonical Contract)

**§41 On-behalf-of Chain** — 인증 주체에서 실제 수행 주체까지의 "대신 수행" 관계를 링크 체인으로 표현. Link Type(원문 9종):
- `AUTHENTICATED_AS` / `ACTING_AS` / `DELEGATED_BY` / `IMPERSONATING` / `OPERATED_BY` / `REQUESTED_BY` / `EXECUTED_BY` / `SYSTEM_INITIATED_BY` / `CUSTOM`

필수 필드(원문): `sequence` · `source principal` · `target subject` · `link type` · `policy/delegation/impersonation ref` · `effective_from/to` · `immutable digest`.

원칙 계약(§5.1·§41·§84): 각 링크는 Original Principal→Effective Actor 경로의 한 단계를 명시하며 **Circular Chain 차단.** 체인 전체가 불변 digest로 봉인되어 사후 재해석 없이 재현 가능해야 한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **On-behalf-of Chain = 부재.** GROUND_TRUTH 어디에도 `source principal→target subject` 링크를 `link type`·`sequence`·`immutable digest`로 연쇄 저장하는 구조체 없음 → **no hits**.
- 실제 canonical actor는 **단일 문자열**(`Mapping::actorId` — `Mapping.php:36-53` → `user:{email}`/`apikey:{id}`)로만 표현되어 **체인(다단계 위임/가장/시스템개시)을 표현할 자료구조 자체가 없다.** 승인 저장(`Mapping.php:210` approvals_json)도 단일 actor만 기록.
- 개별 링크의 잠재 재료는 산재: `AUTHENTICATED_AS`=세션 인증(`UserAuth.php:229-264`)·`IMPERSONATING`=`imp_` 세션(`UserAdmin.php:472-534`)·`ACTING_AS`=`X-Act-As-Tenant`(`UserAuth.php:398`)·`EXECUTED_BY`=`Alerting::executeAction`(`Alerting.php:601-665`). 그러나 **이들을 하나의 순서 있는 링크 체인으로 묶고 Circular을 차단하는 계층은 전무**. `DELEGATED_BY`·`REQUESTED_BY`·`SYSTEM_INITIATED_BY` 대응 실체는 부재(Delegation 도메인 ABSENT).

## 3. 판정 (Verdict)

- Verdict: **ABSENT**
- 근거: 링크 체인 엔티티·Circular 차단·불변 digest 봉인 전무. 링크별 재료는 부분 실재하나 **연결·순서·봉인 계층이 없어** 다단계 on-behalf-of 관계를 재현 불가.
- cover: **0**. 산재한 링크 재료(세션·imp_·act-as·executeAction)는 **재사용 대상**이나 체인 자체의 대체물로 계상 금지.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_ON_BEHALF_OF_CHAIN` — `sequence`·`source principal`·`target subject`·`link type`(9종)·`policy/delegation/impersonation ref`·`effective_from/to`·`immutable digest`. 예: `[AUTHENTICATED_AS admin] → [IMPERSONATING member]`(§39) 또는 `[AUTHENTICATED_AS admin] → [ACTING_AS tenant](§X-Act-As)`.
- **Golden Rule=Extend**: 링크 소스는 기존 자산 재사용 — `AUTHENTICATED_AS`=세션(`UserAuth.php:229-264`)·`IMPERSONATING`=`imp_`(`UserAdmin.php:472-534`)·`ACTING_AS`=`X-Act-As-Tenant`(`UserAuth.php:398`)·`EXECUTED_BY`=`Alerting::executeAction`(`Alerting.php:601-665`). 새 actor 소스 발명 금지.
- **Mandatory Control(§41·§84)**: **Circular Chain 차단**(A acting-as B acting-as A 금지) — §38 Delegation Chain과 Cycle Detection 규칙 공유. `immutable digest`는 §45 Authentication Context Digest / §44 Actor Identity Digest와 정합되게 **앞 블록(06-A-03-02-03-02) Canonical Crypto Policy** 사용.
- **선행 필수(BLOCKED)**: Delegation(§3.4)·불변 Decision Record(§3.3) 실구현이 선행. 이번 차수=설계 명세.

관련: [[DSAR_APPROVAL_DELEGATED_ACTOR_IDENTITY]] · [[DSAR_APPROVAL_IMPERSONATION_SESSION_GOVERNANCE]] · [[DSAR_APPROVAL_AUTHENTICATION_CONTEXT_DIGEST]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
