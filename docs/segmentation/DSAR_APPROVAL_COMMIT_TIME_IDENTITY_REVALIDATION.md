# DSAR — Commit-time Identity Revalidation (06-A-03-02-03-03 · §55)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§55 **Commit-time Identity Revalidation (27항)** (SPEC 원문):

Commit 직전 다음을 전면 재검증한다 — `Principal` · `Canonical Subject Binding` · `Effective Actor` · `Original Principal` · `Account` · `Employment` · `Tenant` · `Legal Entity` · `Organization Membership` · `Role` · `Position` · `Delegation Active` · `Impersonation Active`·`Allowed` · `Session Active` · `Token 미폐기` · `Nonce Valid` · `Auth Age` · `AAL` · `Device/Client Binding` · `Channel` · `Slot/Action/Resource/Command Digest Match` · `Identity/Authentication Snapshot 생성`.

연계: §5.4(Actor Identity는 Commit 시 재검증) · §30 Commit Binding · §50/§51 Drift(Validation↔Commit 사이 상태변화 시 Commit 차단) · §63 Runtime Guard.

의미: 검증(Validation)과 실제 Commit 사이 시간차 동안 계정 비활성·퇴직·세션 폐기·토큰 재사용·권한 회수·Step-up 만료가 발생할 수 있으므로, **Commit 직전에 신원·인증 상태를 재조회하여 유효할 때만 원장에 확정**하고 그 순간의 Identity/Authentication Snapshot을 불변으로 남긴다.

## 2. 기존 구현 대조

- **재검증에 필요한 원천 상태는 실재하나, "Commit 직전 재검증" 결합부는 부재.**
  - 세션 검증(`UserAuth.php:229-318`·`:229-264` user_session JOIN app_user·`expires_at>now`·`is_active=1`)·세션 revocation(logout `:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`·DELETE `:1381,1617,1631`)은 실재한다. 즉 세션 활성/폐기 재조회의 원천은 있으나 **승인 Commit 시점에 호출되지 않는다.**
  - Canonical actor 정본(`Mapping.php:36-53` `actorId()`)은 서버 인증 context에서만 도출·클라이언트 미신뢰·자기승인 차단(`Mapping.php:268`)·정족수 2(`Mapping.php:287`)로 fail-closed. 그러나 이는 **propose/approve 매 요청의 인증검사**이지, 별도의 Commit 직전 27항 재검증 단계가 아니다.
- **★BLOCKED_SECURITY 핵심 결함**: `Alerting::executeAction`(`Alerting.php:601-665`)이 `action_json`을 AdAdapters로 dispatch하며 **status='approved' 확인 없이·재인증/MFA/approver≠executor 확인 없이** 집행한다. `decideAction`(`Alerting.php:572-599` `:562`)도 단일 `approved`(정족수 상수만)이며 §30 Commit Binding·§55 재검증이 전무. (승인자 자체도 `Alerting::actor()`(`Alerting.php:33-36`) X-User-Email/`?actor=` 위조 가능 — §61 정면 위반.)
- **결합 대상(불변 Decision Commit Record)도 부재**: 승인 substrate=`mapping_change_request`(`Db.php:623-634`)+`action_request` 2테이블. Commit 직전 재검증이 산출할 **Identity/Authentication Snapshot을 담을 불변 레코드가 없다.**
- Snapshot/Digest/Evidence·Auth Age·AAL·Step-up·Device/Client Binding·Nonce(승인경로)·Command Digest Match 축은 전부 `ABSENT`(§2·§3 GROUND_TRUTH).

## 3. 판정

- Verdict: **BLOCKED_SECURITY** (핵심 부재이자 라이브 실결함).
- cover: **부분 substrate 有(세션 재조회·revocation·canonical actor·자기승인 차단)이나 Commit-time 재검증 결합 = 0.** `executeAction`이 status/재인증/`approver≠executor` 확인 없이 집행하는 것은 §30·§55·§5.4 정면 위반이며, session revocation은 실재하나 승인 commit에 미결합.
- 선행 의존: §3.3 Decision Foundation(불변 Commit Record/Snapshot) ABSENT → 27항 재검증 산출물을 고정할 대상 부재로 완결형은 **BLOCKED_PREREQUISITE**. 단 executeAction의 미검증 집행 차단은 선행과 무관하게 자립 수정 가능(별도 배포승인 세션 후보).

## 4. 확장/구현 방향 (설계)

- 순신규 `commit_time_identity_revalidation` 게이트 — Decision Commit 직전 27항을 단일 트랜잭션 내에서 재조회: Principal/Canonical Subject(`Mapping.php:36-53` 재사용)·Account 상태(`UserAuth.php:248,260` is_active)·Session Active(`UserAuth.php:229-318` 재사용)·Token 미폐기(revocation 경로 `:1765,:4173` 재사용)·Tenant 일치(`index.php:417,437`)·이후 신설 축(Employment/Role/Position/AAL/Nonce/Device/Client/Command Digest). 통과 시에만 원장 확정+불변 Snapshot 생성.
- Golden Rule=Extend: 새 인증검사 엔진을 만들지 않고 기존 세션검증/revocation/actorId를 재검증 게이트가 **재호출**하도록 조립. Snapshot 불변 기록은 `SecurityAudit`(`SecurityAudit.php:14-33`) 해시체인 패턴 재사용.
- **자립 수정(BLOCKED_SECURITY 해소·별도 승인세션)**: `Alerting::executeAction`(`Alerting.php:601-665`)에 status='approved' 강제·`approver≠executor` 강제·집행 직전 세션/actor 재검증을 추가. `Alerting::actor()`(`Alerting.php:33-36`) 위조 헤더/쿼리 제거하고 `Mapping::actorId` canonical 경로로 통일(무회귀 — 기존 decideAction/policy ops `:82,127,171,189,603` 동작 보존).
- 무후퇴: Commit-time 재검증은 승인 성공 경로를 더 엄격하게만 함(신규 차단조건 추가) — 정상 유효 세션·유효 actor의 기존 승인은 그대로 통과.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_PRIVILEGE_ESCALATION_FOUNDATION]] · [[DSAR_APPROVAL_IDENTITY_EXPIRATION_POLICY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
