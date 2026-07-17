# DSAR — Approval Audit Event (§51·Event 26)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §51**
> ✅ **REQ 집계 일치**: Event **26** — 원문 실측과 동일.

## 0. 현행 실측 — 승인 감사 이벤트 **전수 4곳** (file:line)

| # | 이벤트명(실측 문자열) | 호출부 | 담는 것 | 분류 |
|---|---|---|---|---|
| 1 | `action_decide` | `Handlers/Alerting.php:597` | `id, decision` | **VALIDATED_LEGACY**(존재) |
| 2 | `action_execute` | `Handlers/Alerting.php:655` | `id, channel, type, dispatched, status, result` — **집행 결과까지 정직 기록**(287차) | **VALIDATED_LEGACY**(현행 최선) |
| 3 | `mapping_approve` | `Handlers/Mapping.php:291` | `id, status` | **VALIDATED_LEGACY** |
| 4 | `approval.decide` | `Handlers/AdminGrowth.php:1342` | `id, ref_type, ref_id, decision` | **VALIDATED_LEGACY** |

**대조 결과 — 26종 분모 대비 실측 4종**(≈15%). 다만 **스펙 §51 원문 26종의 항목명이 미영속**이므로 **이 비율을 커버리지로 인용하지 말 것**(축 미확정 · REQ §14 인용 규칙).

| 결함 | 실측 | 분류 |
|---|---|---|
| **명명 규칙 불일치** | `action_decide`·`mapping_approve`(snake) vs `approval.decide`(dot) — **동일 도메인 이벤트가 두 어법** | **CONSOLIDATION_REQUIRED** |
| **`apply`(실행) 감사 누락 대조** | `Mapping::apply`는 `mapping_apply` 기록(`:328`)하나, `action_request`엔 **withdrawal·cancellation·reopen·supersession·consumption 이벤트 자체가 부재**(해당 기능 부재 · grep 0) | **NOT_APPLICABLE(부재→신설)** |
| 🔴 **`pm_audit_log` ENUM에 `'approve'` 부재** | `backend/migrations/20260526_168_008_create_pm_audit_log.sql:12` — `action ENUM('create','update','delete','restore','status_change','assign','unassign')` — **승인 행위를 담을 값이 없다** | **MIGRATION_REQUIRED**(승인 감사 대상 아님을 명시) |
| **저장소 결함 상속** | 위 4곳 전부 `audit_log`(`Db.php:540-546`) 사용 — **tenant_id 없음 · 해시체인 없음** | **MIGRATION_REQUIRED**([Evidence 문서](DSAR_APPROVAL_EVIDENCE.md) §0) |

> **★"감사가 있다"와 "감사가 충분하다"는 다르다.** 4곳 모두 **실제로 기록한다**(죽은 스켈레톤 아님 — 287차와 구분). 결함은 **존재 여부가 아니라 어휘·범위·저장소 무결성**이다.

## 1. Audit Event = **승인 생애의 모든 상태 변화를 남기는 Append-only 사건 축**

### 1.1 지원 Event — **원문 전사 26** (§51) · 실측 4종 매핑

`APPROVAL_AUDIT_EVENT`

| # | Event(원문) | 현행 실측 매핑 (file:line) | 상태 |
|---|---|---|---|
| 1 | APPROVAL_REQUEST_CREATED | 🔴 **미기록** — `AdminGrowth::createApproval`(`AdminGrowth.php:1289-1297`)·`Catalog::approvalCreate`(`:2258-2277`) 모두 **생성 감사 없음** | 부재 |
| 2 | APPROVAL_REQUEST_UPDATED | 미기록 | 부재 |
| 3 | APPROVAL_REQUEST_SUBMITTED | 미기록(승인 도메인) · 인접 = `FeedTemplate::transition` `draft→submitted`(`FeedTemplate.php:248-285`) | 부재(축 상이) |
| 4 | APPROVAL_REQUEST_VALIDATED | 미기록 | 부재 |
| 5 | APPROVAL_REQUEST_REJECTED_BY_VALIDATION | 미기록 — 검증 거부 경로 감사 없음 | 부재 |
| 6 | APPROVAL_CASE_CREATED | Case 축 부재 | 부재 |
| 7 | APPROVAL_CASE_VERSION_CREATED | 부재 | 부재 |
| 8 | APPROVAL_ITEM_CREATED | Item 축 부재 | 부재 |
| 9 | APPROVAL_REQUIREMENT_GENERATED | Requirement 축 부재(§17) | 부재 |
| 10 | APPROVAL_PARTICIPANT_ADDED | Participant 축 부재(§19) | 부재 |
| 11 | APPROVAL_ACTOR_VALIDATED | 🔴 미기록 — `Mapping::actorId`(`Mapping.php:246-252`)가 **403 fail-closed 하나 감사 호출 없음** | 부재 |
| 12 | **APPROVAL_DECISION_RECORDED** | ✅ **실측 3종 대응** — `action_decide`(`Alerting.php:597`) · `mapping_approve`(`Mapping.php:291`) · `approval.decide`(`AdminGrowth.php:1342`) | **존재**(어휘 3갈래) |
| 13 | APPROVAL_CONDITION_ADDED | Conditional Approval(§25) 축 부재 | 부재 |
| 14 | APPROVAL_OBLIGATION_ADDED | Obligation(§26) 축 부재 | 부재 |
| 15 | APPROVAL_STATUS_CHANGED | 🔴 미기록(전용 이벤트) — 상태 변화는 #12 안에 `status` 값으로 **묻혀 있음**(`Mapping.php:291`) | 부재 |
| 16 | APPROVAL_WITHDRAWAL_REQUESTED | Withdrawal(§36) 축 부재 | 부재 |
| 17 | APPROVAL_WITHDRAWN | 부재 | 부재 |
| 18 | APPROVAL_CANCELLED | Cancellation(§37) 축 부재 · 인접 revoke 선례 = `agency_client_link.revoked_at`(`AgencyPortal.php:80`) | 부재 |
| 19 | APPROVAL_REOPENED | Reopen(§38) 축 부재 | 부재 |
| 20 | APPROVAL_SUPERSEDED | 승인 도메인 부재 · 인접 = `catalog_writeback_job.status='superseded'`(`Catalog.php:1188`) **감사 이벤트 아님** | 부재 |
| 21 | APPROVAL_EXECUTION_BOUND | Binding 축 부재(§40) | 부재 |
| 22 | **APPROVAL_CONSUMED** | **부분** — `action_execute`(`Alerting.php:655`)가 집행 결과를 정직 기록(287차)하나 **소비 원장 아님**(§41 축 부재). `mapping_apply`(`Mapping.php:328`)도 동일 한계 | **부분**(축 상이) |
| 23 | APPROVAL_EXECUTION_BLOCKED | 🔴 **미기록** — `Mapping::apply` `:309` 게이트가 **400 거부하나 감사 없음**. 차단 사건이 남지 않음 | 부재 |
| 24 | APPROVAL_DUPLICATE_DETECTED | 🔴 미기록 — `Mapping.php:277-284` dedup 409 · `AdminGrowth.php:1292` pending 재사용 **둘 다 감사 없음** | 부재 |
| 25 | APPROVAL_DRIFT_DETECTED | Reconciliation 축 부재(§43) | 부재 |
| 26 | MANUAL_REVIEW_REQUESTED | 미기록 — 단 `approved_manual` **상태값**은 존재(`Alerting.php:628`) · 이벤트 아님 | 부재 |

**대조 결과 — Event 26종 중 존재 1종(#12) · 부분 1종(#22) · 부재 24종. 실측 감사 호출부는 전수 4곳.**
🔴 **#12는 3개 어휘로 분산**(`action_decide`/`mapping_approve` snake vs `approval.decide` dot) = 같은 사건이 세 이름. **1종 존재를 "정상"으로 읽지 말 것.**

> **★원문 전사가 확정한 결함 — 차단 사건 미기록**: 원문 26종 중 **#5·#11·#23·#24 네 종이 "거부·차단" 이벤트**다. 현행 4개 감사는 **전부 성공 경로에만** 있고, `Mapping.php:250,263,270,282`의 403/409 응답과 `:309`의 400 응답에는 **audit 호출이 없다**. 즉 저장소는 **막기는 하되 막았다는 사실을 남기지 않는다** — §62 항목 22·34~38(차단 건수)은 **현행 코드로는 원리적으로 집계 불가**다.

영속된 요구(§4.9·§61·§62 항목 21·22)에서 확정 가능한 구조 요구:
- Audit Event는 **Append-only**(§4.9) — UPDATE/DELETE 금지. 선례: `pm_audit_log`는 **애플리케이션 차원에서 UPDATE/DELETE 거부**(마이그레이션 파일 `:1-3` 주석) → **패턴 재사용**.
- **차단된 시도도 사건이다** — §62 항목 22(Invalid Transition 차단 수)·34~38(재사용·초과 차단 수)은 **거부를 기록해야만** 셀 수 있다. 현행 4곳은 **성공만 기록**하고 거부는 남기지 않는다(`Mapping.php:250,263,270,282`의 403/409 응답에 audit 호출 **없음**).

## 2. 규칙

- **기존 4개 이벤트를 개명·제거하지 않는다**(무후퇴) — Canonical 어휘로 **매핑**하되 기존 기록의 연속성을 끊지 않는다.
- **`pm_audit_log`를 승인 감사에 전용 금지** — ENUM에 `'approve'`가 없고 entity_type도 PM 전용이다. ENUM 확장으로 **승인을 PM 감사에 끼워 넣는 것은 도메인 오염**.
- **거부·차단 경로에도 감사를 남긴다** — 그래야 §62 완료 보고가 **관측 기반**이 된다(임의 숫자 금지).
- **저장소 무결성은 [Evidence 문서](DSAR_APPROVAL_EVIDENCE.md)의 결론을 따른다** — `menu_audit_log.hash_chain`(`AdminMenu.php:123-131`) 패턴 승격.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
