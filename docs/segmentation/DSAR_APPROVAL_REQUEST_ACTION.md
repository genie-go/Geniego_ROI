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

## 1. 스펙 §10 필드 15 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모(§7 표)는 **"§10 Approval Request Action 필드 = 15"** 라는 **개수만** 영속한다. **15개 필드명은 저장소에 없다**(REQ 외 grep 0).

**추측 생성 금지** — REQ §16 **"요구 날조 0 · 스펙 원문 항목만 전사"** · REQ §9 **351 사건** · REQ §15 **역산 금지**. **해제 조건**: 스펙 §10 원문 수령 → 전사표로 교체(§0 유효).

## 2. 규칙

- **§4.10 준수**: 동일 승인으로 여러 실행 무제한 허용 금지 → Execution Binding + Consumption **신설**(현행 grep 0).
- **참조 원형 = `Mapping::apply` 의 status 게이트**(:309). `Alerting::executeAction` 은 **같은 게이트가 빠진 동일 구조** — 신설이 아니라 **원형을 이식**하는 문제(Golden Rule = Extend).
- **블롭 → 명시 필드**: `action_json` 폴백 체인(3중 `action_type` · 4중 `campaign_ext_id` · 2중 `budget`)을 Canonical Action 필드로 승격하되 **기존 키 계속 수용**(무후퇴).
- **부분문자열 매칭 제거**: `strpos` 판정은 Canonical Action Type 열거형 도입 시 **정확 일치**로 전환(Static Lint 후보).
- **VACUOUS 경로 수정은 별도 승인 세션** — 본 세션 비파괴(코드변경 0).
