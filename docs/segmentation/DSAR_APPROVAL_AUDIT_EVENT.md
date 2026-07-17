# DSAR — Approval Audit Event (§51·Event 26)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

**Event 26종** — 스펙 §51 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `26`만 고정 · 원문 나열 부재).
→ 분류 **UNVERIFIED**. 이벤트명을 **지어내지 않는다**(REQ §15 역산 금지 · 자기가 쓴 것을 요구로 삼는 사고). 스펙 원문 §51 수령 시 본 절을 채우고, **위 실측 4종과 매핑**한다. **현 시점 Event 축 커버리지 주장 불가**.

영속된 요구(§4.9·§61·§62 항목 21·22)에서 확정 가능한 구조 요구:
- Audit Event는 **Append-only**(§4.9) — UPDATE/DELETE 금지. 선례: `pm_audit_log`는 **애플리케이션 차원에서 UPDATE/DELETE 거부**(마이그레이션 파일 `:1-3` 주석) → **패턴 재사용**.
- **차단된 시도도 사건이다** — §62 항목 22(Invalid Transition 차단 수)·34~38(재사용·초과 차단 수)은 **거부를 기록해야만** 셀 수 있다. 현행 4곳은 **성공만 기록**하고 거부는 남기지 않는다(`Mapping.php:250,263,270,282`의 403/409 응답에 audit 호출 **없음**).

## 2. 규칙

- **기존 4개 이벤트를 개명·제거하지 않는다**(무후퇴) — Canonical 어휘로 **매핑**하되 기존 기록의 연속성을 끊지 않는다.
- **`pm_audit_log`를 승인 감사에 전용 금지** — ENUM에 `'approve'`가 없고 entity_type도 PM 전용이다. ENUM 확장으로 **승인을 PM 감사에 끼워 넣는 것은 도메인 오염**.
- **거부·차단 경로에도 감사를 남긴다** — 그래야 §62 완료 보고가 **관측 기반**이 된다(임의 숫자 금지).
- **저장소 무결성은 [Evidence 문서](DSAR_APPROVAL_EVIDENCE.md)의 결론을 따른다** — `menu_audit_log.hash_chain`(`AdminMenu.php:123-131`) 패턴 승격.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
