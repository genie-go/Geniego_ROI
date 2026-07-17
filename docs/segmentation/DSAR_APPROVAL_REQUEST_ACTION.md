# DSAR — Approval Request Action (§10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — Action 바인딩

| 스펙 요구 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| **Action 분리 테이블** | **부재(grep 0)** | **NOT_APPLICABLE(부재 → 신설)** |
| Action 의 **현행 표현** | `action_request.action_json` **MEDIUMTEXT 블롭**(Db.php:597). 스키마·제약·검증 **없음** | **MIGRATION_REQUIRED** |
| `action_type` | 블롭 내부 키 — `$action['action'] ?? $action['type'] ?? $action['action_type']`(Alerting.php:623) **3중 폴백**. 응답에선 또 `type`/`action_type` 폴백 후 기본값 `"writeback"`(Alerting.php:560) | **MIGRATION_REQUIRED**(계약 불명) |
| Action **판정 방식** | ★**부분문자열 매칭**: `strpos($type,'pause')!==false \|\| strpos($type,'lock')... \|\| 'stop' \|\| 'off'` → `AdAdapters::pause`(:631) / `strpos($type,'budget')` → `updateBudget`(:634). **열거형 부재로 인한 우회** | **★MIGRATION_REQUIRED** |
| `amount` · `currency` | **부재(grep 0)** — Action 의 금액축 없음. 유일 근접 = `$budget = (int)($action['daily_budget'] ?? $action['budget'] ?? 0)`(Alerting.php:624) **블롭 내부·통화 없음** | **NOT_APPLICABLE(신설)** |
| **승인 범위 초과 차단** | ★**부재(grep 0)** — 승인된 금액/Action/Scope 와 **실집행 값을 대조하는 로직 없음**. `executeAction` 은 `action_json` 을 **그대로** 집행(:631,:634) → §4.10·스펙 §61 "Amount·Currency·Action·Scope 초과 차단" **미충족** | **NOT_APPLICABLE(신설)** |
| **승인 상태 검증** | ★`executeAction` :612 가 `status` 를 SELECT 하나 **어디서도 읽지 않음** → pending/rejected 도 실집행 = **승인 우회**. **단 `INSERT INTO action_request` grep 0 → 생산자 전무 → 도달 불가** | **★MIGRATION_REQUIRED** · 실피해 **VACUOUS**(P1) |
| Execution Binding · Consumption(1승인 1집행) | **부재(grep 0)** — 동일 승인 재집행 차단 없음 | **NOT_APPLICABLE(신설)** · §4.10 상충 |
| Idempotency | **전용 구현 부재**(`idempotency_key`/`Idempotency-Key` grep 0). 유사물: `dedup_key`(Db.php:257-281 · **ingest 전용**) · Paddle.php:343(웹훅 notification_id UNIQUE) | **KEEP_SEPARATE_WITH_REASON**(도메인 상이) · Approval 은 **신설** |
| Mapping 도메인의 Action | `Mapping::apply`(Mapping.php:296-327) — **`status!=='approved'` 게이트(:309) 보유** = **유일하게 승인-집행이 결속된 경로** | **VALIDATED_LEGACY**(★참조 원형) |

## 1. 스펙 §10 `APPROVAL_REQUEST_ACTION` 필수 필드 전사 — 원문 실측 **15개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §10**

> ✅ **REQ 집계 15 ↔ 원문 실측 15 — 일치.**

**원문 §10 말미 지시**: *"승인된 Action과 실제 실행 Action이 일치하도록 후속 Execution Binding에 사용하라."*
**§0 실측: Action 분리 테이블 부재(grep 0)** · Action 은 `action_json` **블롭**에만 존재.

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_request_action_id` | **부재** — §0 "Action 분리 테이블 **부재(grep 0)**" · **NOT_APPLICABLE(신설)** |
| 2 | `approval_request_id` | **부재(FK)** — §0 Action 테이블 자체 부재. ※참조 대상 Request `id` 는 존재 |
| 3 | `authorization_action_id` | ⚠️ **판정 유보** — §0 미열거. ※인접: `TeamPermissions::ACTIONS`(:39)는 **인가 액션 목록**이며 §0-DOMAIN 실측상 **검사 호출부 grep 0 = 고아** |
| 4 | `action_code` | **부재(명시 필드)** — §0 `action_type` = 블롭 내부 키 **3중 폴백**(`$action['action'] ?? $action['type'] ?? $action['action_type']` · Alerting.php:623) · **MIGRATION_REQUIRED**(계약 불명) |
| 5 | `target_resource_type` | **부재** — §0 `action_json` 블롭 내부 · 스키마 없음 · **MIGRATION_REQUIRED** |
| 6 | `target_resource_id` | **부재(명시 필드)** — §0 런타임 키 폴백 체인 추출(`campaign_ext_id`/`external_id`/`campaign_id`/`adset_id` · Alerting.php:621-622) · **MIGRATION_REQUIRED** |
| 7 | `requested execution count` | **부재** — §0 "Execution Binding · Consumption(1승인 1집행) **부재(grep 0)**" · §4.10 상충 · **NOT_APPLICABLE(신설)** |
| 8 | `maximum execution count` | **부재** — §0 동일 — **동일 승인 재집행 차단 없음** · §4.10 상충 · **NOT_APPLICABLE(신설)** |
| 9 | `amount limit` | **부재** — §0 "`amount`·`currency` **부재(grep 0)** — Action 의 금액축 없음". 유일 근접 = `$budget = (int)($action['daily_budget'] ?? $action['budget'] ?? 0)`(Alerting.php:624) **블롭 내부** · **NOT_APPLICABLE(신설)** |
| 10 | `currency` | **부재** — §0 동일 — 위 `$budget` 근접값조차 **통화 없음** · **NOT_APPLICABLE(신설)** |
| 11 | `scope limit` | **부재** — §0 "승인 범위 초과 차단 **부재(grep 0)**" · **NOT_APPLICABLE(신설)** |
| 12 | `environment` | **부재(Action 행)** — §0 Action 테이블 자체 부재 · **NOT_APPLICABLE(신설)** |
| 13 | `execution validity` | **부재** — §0 Execution Binding 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 14 | `status` | **부재(Action 행)** — ※Request 행 `status` 는 존재하나 §0 실측상 `executeAction` :612 가 SELECT 후 **미독** · **★MIGRATION_REQUIRED** · 실피해 **VACUOUS**(P1) |
| 15 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

### 1-1. ★원문 §10 지시 vs §0 실측의 정면 대비

원문은 **"승인된 Action = 실제 실행 Action"** 을 Execution Binding 으로 보장하라고 요구한다. §0 실측:

- **승인 범위 초과 차단 = 부재(grep 0)** — 승인된 금액/Action/Scope 와 **실집행 값을 대조하는 로직 없음**. `executeAction` 은 `action_json` 을 **그대로** 집행(:631,:634) ⇒ 스펙 §61 *"Amount·Currency·Action·Scope 초과 차단"* **미충족**
- **Action 판정 = 부분문자열 매칭**(`strpos($type,'pause')` 등 · Alerting.php:623,631,634) — **열거형 부재로 인한 우회** · **★MIGRATION_REQUIRED**
- **유일한 결속 경로 = `Mapping::apply`** — `status!=='approved'` 게이트(:309) 보유 · **VALIDATED_LEGACY**(★참조 원형)

⇒ **원문 15 필드 중 §0 근거로 "존재" 인 것은 0개**. **판정 유보 2**(3·15) · 나머지 **13 부재**.
즉 §10 은 **Action 축 전체가 미구현**이며, 유일 참조 원형은 §0 이 지목한 `Mapping::apply` 의 status 게이트다.

## 2. 규칙

- **§4.10 준수**: 동일 승인으로 여러 실행 무제한 허용 금지 → Execution Binding + Consumption **신설**(현행 grep 0).
- **참조 원형 = `Mapping::apply` 의 status 게이트**(:309). `Alerting::executeAction` 은 **같은 게이트가 빠진 동일 구조** — 신설이 아니라 **원형을 이식**하는 문제(Golden Rule = Extend).
- **블롭 → 명시 필드**: `action_json` 폴백 체인(3중 `action_type` · 4중 `campaign_ext_id` · 2중 `budget`)을 Canonical Action 필드로 승격하되 **기존 키 계속 수용**(무후퇴).
- **부분문자열 매칭 제거**: `strpos` 판정은 Canonical Action Type 열거형 도입 시 **정확 일치**로 전환(Static Lint 후보).
- **VACUOUS 경로 수정은 별도 승인 세션** — 본 세션 비파괴(코드변경 0).
