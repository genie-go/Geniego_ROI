# DSAR — Actor Authentication Binding (06-A-03-02-03-03 · §22)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.
> ★이 엔티티 = 이 배치의 **핵심 결손 + BLOCKED_SECURITY** 지점.

## 1. 원문 전사 (Canonical Contract)

§22 AUTHENTICATION_BINDING (Command↔Auth Context 결합, 원문 전사):

필드: `decision command id` · `decision instance id` · `decision slot id` · `action type` · `resource` · `principal` · `effective actor` · `session` · `auth context` · `token binding` · `device binding` · `client binding` · `command digest` · `auth context digest` · `session binding digest` · `created/expires` · `commit validated_at` · `immutable digest`.

의미: Authentication Binding은 "이 인증 컨텍스트(§21)로 확립된 세션이 **바로 이 Decision Command에 결합됐다**"를 불변으로 고정한다(§5.5). 타 세션 Token·타 Command 재사용을 차단하는 핵심 결합이며, §30 Commit Binding이 "Commit 직전 이 Binding이 Active·Session 미폐기·AAL 충분·Command Digest 일치"를 재검증한다(§55). 이 결합이 없으면 "인증된 누군가"가 "임의의 승인"을 대신 커밋할 수 있다.

## 2. 기존 구현 대조

- **Command↔Auth Context 결합은 전면 부재** — 승인 커맨드와 인증 세션을 묶는 구조가 없다. 승인 판정은 인증 컨텍스트·세션·AAL·nonce와 무관하게 진행된다.
- **★BLOCKED_SECURITY — 라이브 실결함(GROUND_TRUTH §3)**:
  1. **`Alerting::actor()`(`Alerting.php:33-36`) 승인자 위조** — `X-User-Email` 헤더 / `?actor=` 쿼리를 승인자로 신뢰. `decideAction`(`Alerting.php:572-599`)이 위조 actor를 `action_request.approvals_json`+audit에 기록하고 정족수 없이 단일 approved. policy ops(`Alerting.php:82,127,171,189,603`)도 동일. §5.11(Client Identity Claim 미신뢰)·§61 정면 위반. Mapping은 289차 하드닝됐으나 Alerting 미수정.
  2. **`Alerting::executeAction`(`Alerting.php:601-665`) 미승인·미재검증 집행** — status='approved' 확인·재인증/MFA·approver≠executor·session 유효성 없이 action_json을 AdAdapters로 dispatch(`Alerting.php:562`). §30 Commit Binding·§55 Revalidation 부재.
- **결합 substrate 부재 세부**:
  - `session`/`auth context`: 세션(`UserAuth.php:964-970`)은 있으나 커맨드에 결합되지 않음. 승인 감사는 비체인 audit_log(`Mapping.php:60`·`Alerting.php:28`)에만.
  - `command digest`·`auth context digest`·`session binding digest`: 부재 — 결합 무결성 봉인 없음.
  - `token binding`·`device binding`·`client binding`: 부재(Device ABSENT). token 자체도 평문(`UserAuth.php:969`).
  - `commit validated_at`: Commit-time 재검증 부재 — Mapping 승인(`Mapping.php:246-250,287` 정족수 2)조차 승인 시점 세션만 보고 커밋 시점 재검증 없음.
  - `decision command/instance/slot id`: 결합 대상 불변 Decision Record가 부재(GROUND_TRUTH §4 BLOCKED_PREREQUISITE). 승인 substrate는 `mapping_change_request`(`Db.php:623-634`)·`action_request` 2테이블뿐.
- **상대적 양호(Mapping 경로)**: `Mapping`은 canonical actor 정본(`Mapping.php:36-53`)·자기승인 차단(`Mapping.php:268`)·재승인 dedup(`Mapping.php:279`)·정족수 2(`Mapping.php:287`)로 fail-closed — 그러나 여기에도 session↔command 결합·commit 재검증은 없음.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (Command↔Auth Context 결합 구조 전무·결합 대상 Decision Record 부재) **+ BLOCKED_SECURITY** (Alerting 위조 actor 승인·미재검증 집행 라이브 실결함).
- cover: **0** (결합·digest·commit 재검증 구조 부재. canonical actor·정족수·세션 substrate는 결합의 재료이지 결합 자체가 아님).
- 선행 의존: Binding은 §21 Auth Context·§20 Session·§3.3 Decision Command Envelope(decision command/instance/slot id)를 모두 요구 — 다중 선행 부재로 완전 구현 BLOCKED_PREREQUISITE. **단 BLOCKED_SECURITY 2건(Alerting)은 선행과 무관하게 자립 수정 가능**(별도 배포승인 세션 후보).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_actor_authentication_binding` — 승인 커맨드마다 §21 Auth Context·§20 Session을 command/slot에 결합하고 command digest·auth context digest·session binding digest를 봉인. §30 Commit Binding이 커밋 직전 재검증(§55). Golden Rule=Extend: session=`user_session`(`UserAuth.php:964-970`)·effective actor=`Mapping::actorId`(`Mapping.php:36-53`)·digest=SHA-256(`SecurityAudit.php:27`) 재사용.
- **★자립 수정 우선(BLOCKED_SECURITY, 선행 불요)**:
  - `Alerting::actor()`(`Alerting.php:33-36`)의 헤더/쿼리 actor 신뢰를 폐기하고 `Mapping::actorId`(`Mapping.php:36-53`) 서버 context 해석으로 교체 → §5.11 준수(289차 Mapping 하드닝 패턴 이식).
  - `Alerting::decideAction`(`Alerting.php:572-599`)에 정족수·자기승인 차단(`Mapping.php:268,287` 패턴) 도입, `executeAction`(`Alerting.php:601-665`)에 status='approved' 확인·approver≠executor·commit-time 재검증 게이트 추가.
- session↔command 결합(§5.5): 승인 제출 시 세션 id·generation을 command에 바인딩 → 타 세션 token 재사용 차단. decision-command nonce(§24) 1회 소비로 replay 차단.
- commit validated_at + §55 Revalidation 27항: 커밋 직전 Principal/Effective Actor Active·Session 미폐기·Token 미폐기·AAL 충분·Command Digest/Action/Slot/Resource 일치 재검증 — Critical Drift 시 Commit 차단.
- 결합 대상 Decision Record(decision command/instance/slot id)는 §3.3 Decision Foundation 신설 후 배선 — 그전까지 Binding은 설계 확정·구현 BLOCKED. 봉인 원장은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`)을 CANONICAL 패턴으로 재사용(비체인 audit_log `Mapping.php:60`·`Alerting.php:28` 대체 아닌 승격).

관련: [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_CONTEXT]] · [[DSAR_APPROVAL_AUTHENTICATION_SESSION]] · [[DSAR_APPROVAL_ACTOR_RESOLUTION_RESULT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
