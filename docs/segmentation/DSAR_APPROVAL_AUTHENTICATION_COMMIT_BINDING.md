# DSAR — Approval Authentication Commit Binding (06-A-03-02-03-03 · §30)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§30 Commit Binding** — Commit 직전 재검증 18항:
`Auth Binding Active` · `Session Active` · `Token 미폐기` · `Principal/Effective Actor Active` · `Tenant 일치` · `Device Binding 유효` · `Client Binding 유효` · `AAL 충분` · `Auth Age 이내` · `Step-up 충족` · `Nonce 소비상태` · `Command Digest 일치` · `Action 일치` · `Slot 일치` · `Resource Version 일치` · `Impersonation 일치` · `Delegation 일치` (+ Identity/Authentication Snapshot 생성).

★ Commit 은 검증→토큰/세션 유효성이 **Commit 시점까지** 유지됨을 확인하는 마지막 게이트(§5.4·§55 Revalidation 27항과 결합).

## 2. 기존 구현 대조

- **★Commit 직전 재검증이 사실상 전무하며, 실 집행 경로가 미검증으로 열려 있다(BLOCKED_SECURITY).**
  - `Alerting::executeAction`(`Alerting.php:601-665`)은 **status='approved' 확인 없이·재인증/MFA 없이·approver≠executor 확인 없이** `action_json` 을 AdAdapters 로 dispatch 한다. §30 의 18항 중 **어느 것도** 검증하지 않는다 — GROUND_TRUTH §3.2: "executeAction 미승인·미재검증 집행".
  - 그 앞단 `decideAction`(`Alerting.php:572-599` `:562`)도 단일 approved(정족수 상수만)로 결정하며, session↔command 결합·token 미폐기·auth age·step-up·nonce 소비상태를 전혀 확인하지 않는다.
  - actor 자체가 위조 가능: `Alerting::actor()`(`Alerting.php:33-36`)의 `X-User-Email`/`?actor=` → Principal/Effective Actor Active 검증의 전제가 무너진다.
- **대조 정본(부분 substrate)**: `Mapping` 승인은 자기승인 차단(`Mapping.php:268`)·재승인 dedup(`:279`)·정족수 2(`:287`)를 강제하고 `mapping_change_request`(`Db.php:623-634`)에 기록한다 — 그러나 이는 **승인 카운트 로직**이지 §30 의 인증 재검증(session active·token 미폐기·AAL·auth age·nonce·device/client·command digest)이 아니다.
- **결합 대상 부재**: 세션 검증(`UserAuth.php:229-318`)은 매 요청 유효성을 보나, 이를 **특정 Commit 순간에 command/slot/resource/nonce 와 함께** 재검증하는 지점이 없다. Impersonation(`UserAdmin.php:472-534`)은 Original Principal 미보존이라 "Impersonation 일치" 검증 자체가 불가.
- 18항 매핑: Session Active=부분(요청단 세션검증) · Tenant 일치=부분(`index.php:590-600`) · 나머지 16항(Token 미폐기 결합·Effective Actor·Device/Client·AAL·Auth Age·Step-up·Nonce·Command Digest·Action/Slot/Resource Version·Impersonation/Delegation 일치·Snapshot 생성)=**부재**.

## 3. 판정

- **Verdict: BLOCKED_SECURITY(미검증 집행) + ABSENT(18항 Commit 재검증)**.
  - **BLOCKED_SECURITY**: `Alerting::executeAction`(`:601-665`) status/재인증/approver≠executor 미확인 집행 — §30·§55 정면 부재. actor 위조(`:33-36`)와 결합돼 실 라이브 결함.
  - ABSENT: Auth Binding·Token 미폐기·AAL·Auth Age·Step-up·Nonce·Device/Client·Command Digest·Action/Slot/Resource·Impersonation/Delegation Commit-time 재검증·Snapshot 생성.
  - PARTIAL substrate: Session Active(`UserAuth.php:229-318`)·Tenant 일치(`index.php:590-600`)·정족수/자기승인 차단(`Mapping.php:268,279,287`)은 재사용 가능한 조각.
- **선행 의존**: Command Digest·Slot·Resource Version·Impersonation/Delegation 일치는 §3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation 부재로 BLOCKED_PREREQUISITE.
- **cover: 부분** — session/tenant/정족수 조각만. Commit-time 18항 통합 재검증 0.

## 4. 확장/구현 방향 (설계)

- **`Alerting::executeAction` 미검증 집행 봉합은 Mandatory Control(자립 수정 가능·최우선)**: dispatch 직전 status='approved' 확인·approver≠executor 강제·(고위험 시) 재인증을 요구. actor 는 `Mapping::actorId`(`Mapping.php:36-53`) 정본으로 도출(헤더 위조 제거). 이는 선행 Decision Core 없이도 자립 수정 가능한 BLOCKED_SECURITY 봉합.
- **Commit Binding 게이트 신설(§30 18항)**: Decision Core(§3.3) 위에서 Commit 직전 Auth Binding Active·Session Active·Token 미폐기(family/generation)·Principal/Effective Actor Active·Tenant 일치·Device/Client 유효·AAL 충분·Auth Age 이내·Step-up 충족·Nonce 소비상태·Command Digest/Action/Slot/Resource Version/Impersonation/Delegation 일치를 원자적으로 재검증 → 실패 시 Commit 차단(§55 Revalidation·§50/§51 Drift 와 결합).
- **재사용 substrate**(Golden Rule=Extend): 세션검증(`UserAuth.php:229-318`)·tenant 강제(`index.php:590-600`)·정족수/자기승인/dedup(`Mapping.php:268,279,287`)을 Commit 게이트의 구성요소로 조립(발명 아닌 조립). Snapshot/Digest 는 SecurityAudit 불변체인(`SecurityAudit.php:14-33`)의 append-only+sha256 패턴을 CANONICAL 로 재사용.
- **Impersonation/Delegation 일치**: `UserAdmin.php:472-534` impersonation 에 Original Principal 보존을 먼저 추가(§39)해야 "Impersonation 일치" 검증이 성립 — 선행 봉합 필요.
- 실 구현 = 별도 승인 세션(executeAction 봉합은 즉시 후보). 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_TOKEN_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_SCOPE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_TENANT_BINDING]] · [[DSAR_APPROVAL_DECISION_COMMIT_REVALIDATION]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
