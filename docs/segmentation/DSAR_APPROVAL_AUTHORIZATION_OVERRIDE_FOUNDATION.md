# DSAR — Authorization Override Foundation (06-A-03-02-03-04 Part 1 · §33)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§33 OVERRIDE Foundation — 원문 전사:
- 유형(8종): `EMERGENCY` / `BREAK_GLASS` / `ADMINISTRATIVE` / `SECURITY` / `COMPLIANCE` / `LEGAL` / `INCIDENT_RESPONSE` / `CUSTOM`.
- 필드: `original decision` · `requested by` / `executed by` / `approved by` · `reason` · `incident` / `ticket` · `scope` · `valid` · `use count` / `max count` · `obligations` · `notifications` · `post-review required` / `post-review deadline`.
- **불변식: 일반 Permit으로 기록 금지.**

의미: Override는 정상 Authorization이 거부하는 상황을 **비상·관리·보안·컴플라이언스·법무·사고대응 목적으로 강제 통과**시키는 최상위 예외경로다(§5.14 Override ≠ 일반 Allow). 핵심 불변식은 ① **일반 Permit과 물리·논리 분리**(별도 Policy/Reason/Approval/Expiration/Evidence/Audit·§53 "Override 일반 Allow 기록") — override를 정상 허용으로 위장하면 감사 불능, ② **사후검토 필수**(`post-review required`+deadline) — break-glass는 사용 후 반드시 검토, ③ `incident`/`ticket` 결속·`notifications` 발송·`obligations` 부착으로 추적, ④ `scope`·`valid`·`max count`로 경계. §36 Audit Event의 OVERRIDE_REQUESTED/EXECUTED/REVIEWED와 결합.

## 2. 기존 구현 대조

- **Authorization Override 선언체는 부재** — 정상 인가를 비상 통과시키고 사후검토·incident 결속·별도 감사하는 구조가 전무.
- ★유일 유사물: 03-03(Actor Identity Assurance)에서 확인된 **break-glass 마스터 로그인**. 03-03에서 `auth.breakglass` 전용 감사 이벤트가 이미 추가되어, break-glass 진입이 일반 로그인과 분리·전용 감사된다. 이것이 §33 Override의 `BREAK_GLASS`/`EMERGENCY` semantics에 가장 근접한 substrate다. 단 이는 **로그인 수준 비상접근**이지 **특정 Authorization Decision을 override하는 선언체**가 아니며, original decision·post-review deadline·max count·obligations·scope 결속이 없다. (해당 break-glass file:line은 본 블록 GROUND_TRUTH allowlist 밖 — 개념 substrate로만 등재, 인용 생략.)
- 인접 자산(override 아님):
  - `requireFeaturePlan` admin bypass(`UserAuth.php:64-84` `:68,72,82-84`) — admin은 게이트 통과. 그러나 이는 override 선언체가 아니라 무기한·무감사 하드코딩 bypass(§53). override였다면 incident·post-review·notification이 붙었어야 함.
  - master/sub 차단(`UserAdmin.php:65-68,273,287,358,395`)·requireAdminUser(`UserAuth.php:2920`) — 관리자 권한 판정이지 비상 override 경로가 아니다.
  - SecurityAudit append-only 해시체인(`SecurityAudit.php:48-68`) — override 발생 시 불변 감사에 쓸 실 substrate(유일한 실 append-only 감사·`UserAuth.php:4046`·`Compliance.php:162` 배선). override 자체는 아니나 override audit의 기록 매체.
- `original decision`·`incident/ticket`·`post-review required/deadline`·`max count`·override `obligations`/`notifications` → **no hits**.

## 3. 판정

- Verdict: **ABSENT (Authorization Override 선언체 부재) · substrate 존재(03-03 break-glass)**
- substrate 태그: 03-03 break-glass 마스터 로그인+`auth.breakglass` 전용감사 = **CANDIDATE(BREAK_GLASS/EMERGENCY 원시재료)**. SecurityAudit(`SecurityAudit.php:48-68`) = override audit 기록 매체(CANONICAL append-only). 단 결정단위 override 선언체(original decision·post-review·scope·max count)는 전무.
- 선행 의존: Override는 original Decision(§24)·Evidence(§35)·Audit(§36)·Obligation(§27)에 종속 — 상위 Decision Foundation 부재로 BLOCKED_PREREQUISITE.
- cover: **부분(break-glass 로그인 substrate·SecurityAudit 감사매체 실재, 결정단위 override 선언체 0)**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_override` — 비상 강제통과 선언체. 필드: `override_id`·`override_type`(8종)·`original_decision_id`·`requested_by`·`executed_by`·`approved_by`·`reason`·`incident_ref`·`ticket_ref`·`scope`·`valid_from`·`valid_until`(NOT NULL·§61)·`use_count`·`max_count`·`obligations`·`notifications`·`post_review_required`·`post_review_deadline`·`immutable_digest`.
- **일반 Permit 분리 불변식**(§5.14·§53): override는 정상 Decision 테이블·Permit 경로와 물리 분리. §54 Lint "Override without Reason" 차단·§61 "Override Expiration Not Null". override가 일반 allow로 침투하지 못하도록 Decision Result(§25) OVERRIDE_REQUIRED 경유만 허용.
- Golden Rule=Extend: 03-03 break-glass(`auth.breakglass` 전용감사)를 `BREAK_GLASS`/`EMERGENCY` override의 **비상 진입 substrate로 재사용**하되, 로그인 수준을 넘어 특정 Decision을 override하는 선언체를 그 위에 신설(로그인 break-glass와 KEEP_SEPARATE). override audit은 SecurityAudit 해시체인(`SecurityAudit.php:48-68`)에 append(유일 실 append-only·verify 실재)로 봉인 — `menu_audit_log.hash_chain`은 verify() 0(289차 정정)이므로 override 무결성 근거로 계상 금지.
- **post-review 강제**: break-glass/emergency override는 `post_review_required`=true·deadline 경과 시 §36 Audit + §57 Warning(OVERRIDE 미검토)·§48 Drift로 에스컬레이션. `notifications` 자동발송으로 즉시 가시화.
- Override(§33·비상·사후검토) vs Exception(§32·통상·사전승인·정책불변) 명확분리. admin bypass(`UserAuth.php:64-84`) 등 현재 무통제 우회는 override/exception 선언체로 흡수(후속 enforcement Part). 실 배선은 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EXCEPTION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DENIAL]] · [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] · [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
