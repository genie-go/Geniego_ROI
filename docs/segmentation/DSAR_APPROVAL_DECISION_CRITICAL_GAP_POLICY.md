# DSAR — Decision Critical Gap Policy (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 정책 명세.

## 1. 원문 전사 (Canonical Contract)

**CRITICAL_GAP_POLICY (§60)** — Gap 목록(원문 전사):

1. Decision Version 없음
2. Command · Record 혼합
3. Validation 없이 Commit
4. Actor Resolution 없음
5. Assignment 미검증
6. Authority 미검증
7. Delegation 미검증
8. Sequential Step 미검증
9. Claim/Lease 부재
10. Cross-Tenant / Legal-Entity 위반
11. Wrong Resource / Action
12. Amount 초과
13. Currency Mismatch
14. Security / SoD / CoI 실패
15. 동일 Slot 복수 Committed
16. Idempotency 없음
17. 동일 key 다른 payload
18. Replay 재사용
19. Lock / Fencing 없음
20. stale worker Commit
21. Expected Version 미검증
22. Record Update / Delete
23. Snapshot / Audit / Outbox / Sequential Ref 누락
24. Partial Commit
25. Client Time Commit
26. Email / Channel Actor / Authority
27. 과거 재작성
28. Mandatory Control 제거
29. 중복 Entity

## 2. 기존 구현 대조 (Gap 실측)

현행 4핸들러는 in-place UPDATE 형이며, **위 Gap 대부분이 미방지 상태**다:

| Gap | 실측 근거 | 상태 |
|---|---|---|
| #1 Decision Version 없음 | Version/Definition 엔티티 ABSENT | 미방지 |
| #2 Command·Record 혼합 | 단일 UPDATE 로 명령=상태변경(Mapping:288·AdminGrowth:1330·Alerting:594·Catalog:2397) | 미방지 |
| #3 Validation 없이 Commit | Validation Pipeline ABSENT | 미방지 |
| #4 Actor Resolution 없음 | **일부 방지** — Mapping actor(:36-53) fail-closed null·403(:247)은 CANONICAL. 단 §18 전 순서 부재 | 부분방지 |
| #15 동일 Slot 복수 Committed | Slot 개념 부재 · Mapping dedup(:278)·자기승인차단(:268)·정족수(:287)는 부분 방지 | 부분방지 |
| #16/#17/#18 Idempotency/Replay | Idempotency·Replay ABSENT. (Paddle 웹훅 UNIQUE(notification_id):343-368 은 결제용 선례) | 미방지 |
| #19/#20 Lock/Fencing·stale worker | Lock/Fencing ABSENT · Mapping TOCTOU(:287)·Alerting 비원자(:631/:653) | 미방지 |
| #21 Expected Version 미검증 | Optimistic Version ABSENT · Catalog CAS-lite WHERE status(:2397)만 부분 | 부분방지 |
| #22/#27 Record Update/Delete·과거 재작성 | 불변 Record 부재 → status 를 UPDATE 로 덮어씀(구조적으로 재작성 가능) | 미방지 |
| #23/#24 Snapshot/Audit/Outbox 누락·Partial Commit | Alerting 비원자(:631 pause + :653 UPDATE)로 Partial Commit 상시 가능 · Snapshot/Outbox ABSENT | 미방지 |
| #26 Email/Channel Actor/Authority | **★ Alerting::actor() 헤더 위조(`Alerting.php:33-35`, X-User-Email/?actor=) = BLOCKED_SECURITY** — 위조된 actor 로 결정 집행 가능 | **위조 취약** |
| #28 Mandatory Control 제거 | 통제 자체가 미신설이라 "제거"라기보다 부재 | 미방지 |

**★ Alerting 위조 명시**: `Alerting::executeAction`(:601-665)는 `actor()`(:33-35)가 요청 헤더(X-User-Email/?actor=)를 그대로 신뢰하므로, **인증되지 않은 임의 actor 이름으로 결정을 집행**할 수 있다(BLOCKED_SECURITY). 이는 §60 Gap #4(Actor Resolution 없음)·#26(Email/Channel Actor)·#14(Security 실패)의 복합이며, 결정 코어의 **최우선 실위험**이다. 이름이 남는다고 감사가 되는 것이 아니라, 위조 가능한 이름은 감사의 근거가 될 수 없다.

## 3. 판정

- Verdict: **CRITICAL** — §60 Gap 29항 중 대부분이 미방지 또는 부분방지. 부분방지분(#4 actor·#15 slot dedup/정족수·#21 CAS-lite)조차 §60 이 요구하는 완전 통제가 아님.
- 선행 의존: Gap 방지는 §3.1~§3.6 선행 6군(Approval/Authority/Delegation/Assignment/Sequential ABSENT, Identity/Security PARTIAL) + 결정 코어(Command/Validation/Commit/Idempotency/Lock/Snapshot/Outbox/Record 불변) 전체 신설에 의존.
- cover: 부분방지 = Mapping actor fail-closed(:36-53)·403(:247)·dedup(:278)·자기승인차단(:268)·정족수(:287) · Catalog CAS-lite(:2397). 그 외 커버 **0**.

## 4. 확장/구현 방향 (정책)

- **모든 §60 Gap = Fail-Closed 게이트로 승격.** Mandatory Control(§24 Guard) 위반 시 Commit 차단이 기본값. "경고 후 진행" 금지.
- **최우선 P0 = Alerting actor 위조 차단**: `Alerting::actor()`(:33-35) 헤더 신뢰를 §18 Actor Resolution(Authenticated Principal→Canonical Subject→app_user `UserAuth.php:155-157`) 통과분으로 대체. 이는 결정 코어 신설 전이라도 **선행 보안 치유** 대상.
- **정직판정 원칙**: Gap 이 "미방지"인 이유의 대부분은 통제 부재이지 통제 회귀가 아니다. 따라서 이 문서는 결함 고발이 아니라 **신설해야 할 통제 목록**의 근거다. 재구현 금지·기존 확장 우선(Mapping 정족수·Paddle 멱등·omni_outbox·SecurityAudit).
- **무후퇴**: Gap 게이트 신설이 기존 Mapping 정족수 승인·AdminGrowth·Catalog·Alerting decide 기능을 후퇴시켜선 안 됨(§70 회귀 게이트).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
