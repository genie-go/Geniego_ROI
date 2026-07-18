# DSAR — Approval Status History (§28)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §28** — 원문 나열 실측 **12 필드**. ✅ REQ 집계 12 와 **개수 일치**.

## 0. 현행 실측 대조표 (file:line)

**★`status_history` grep 0 — Status History 테이블은 전면 부재.** 현행 상태는 전부 **제자리 덮어쓰기**다.

| 현행 | 상태 갱신 방식 (실측) | 이력 보존 | 분류 |
|---|---|---|---|
| `action_request` | `UPDATE ... SET approvals_json=?, status=?`(`Alerting.php:653`) — **전이 검증 0** | ✘ 이전 상태 소실 | **MIGRATION_REQUIRED** |
| `mapping_change_request` | `pending`→`approved`(`Mapping.php:238-294` · pending 아니면 409)→`applied`(`:296-327` · `status!=='approved'` 게이트 `:309`) | ✘ 상태값만 덮어씀 | **VALIDATED_LEGACY**(게이트만) |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — `UPDATE status` | ✘ | **MIGRATION_REQUIRED** |
| `catalog_writeback_job` | `'pending_approval'`→`'queued'`(`Catalog.php:2341-2364`) | ✘ | **MIGRATION_REQUIRED** |
| `FeedTemplate::transition` | `draft→submitted→approved→published` 순차 강제 · 역행 차단 · `invalid_state` 409(`FeedTemplate.php:248-285`) | ✘ **전이는 막지만 이력은 안 남김** | **CANONICAL_APPROVAL_TRANSITION_GUARD**(전이 강제만 승격) |
| `audit_log` | `id, actor, action, details_json, created_at`(`Db.php:540-546`) · `Mapping::audit`(`Mapping.php:60-63`) | △ **tenant_id 없음 · 해시체인 없음 · immutable 아님** | **LEGACY_ADAPTER**(대체물 아님) |
| **`menu_audit_log`** | `hash_chain CHAR(64)` + `old_value`/`new_value` JSON + `prev` 해시 체인(`AdminMenu.php:123-131,169-210`) | ⚠️ **체인만 실재·검증 불가** — `verify()` 0(`hash_equals` `AdminMenu` 0히트) · preimage `ts`(`:195`) 미저장(`:199-203` 에 `created_at` 없음) → **tamper-evident 아님**. 진짜 검증 선례 = `SecurityAudit::verify():56-68` | **필드·저장 선례**(승인 도메인 아님 · 🔴 무결성은 `SecurityAudit` 이식) |
| APPROVAL_STATUS_HISTORY | **grep 0** | — | **NOT_APPLICABLE(부재 → 신설)** |

> **스펙 §28 요구 대비 현행 판정**: 스펙은 *"Status 를 직접 덮어쓰지 말고 History Event 를 생성하라"* 를 요구한다.
> **현행은 전 4개 승인 테이블이 100% 직접 덮어쓰기** → **요구 미충족(0/4)**. `FeedTemplate` 조차 전이는 강제하되 이력은 남기지 않는다.
> ⇒ **"누가·언제·무엇에서 무엇으로·왜" 바꿨는지 승인 도메인에서 재현 불가.**

## 1. 스펙 §28 `APPROVAL_STATUS_HISTORY` 필수 필드 전사 — 원문 실측 **12개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §28**

> ✅ **REQ 집계 12 ↔ 원문 실측 12 — 개수 일치.**
>
> 🔴 **본 절 초판(`UNVERIFIED_TRANSCRIPTION`)의 항목명 일부는 원문과 어긋나 폐기됐다.**
> 초판에만 있던 것: `status_history_id`·`tenant_id`·`subject_type`·`subject_id`·`from_status`·`to_status`·`transition_reason_code`·`actor_id`·`actor_type`·`decision_id`·`hash_chain`·`occurred_at`.
> 원문에만 있는 것: `approval_status_history_id`·`entity_type`·`entity_id`·`previous_status`·`new_status`·`transition_type`·`actor`·`transition reason`·`effective_at`·`recorded_at`·`correlation id`·`evidence`.
> ★**원문에는 `tenant_id`·`hash_chain`·`decision_id`·`actor_type` 이 없고, 초판에는 `transition_type`·`effective_at`/`recorded_at` 2시각 분리·`correlation id`·`evidence` 가 없었다.**
> 개수(12)만 우연히 일치했을 뿐 **항목 구성은 다르다** — 개수 일치는 정합의 증거가 아니다(289차 ② 351 사건의 메커니즘).

**원문 §28 말미 지시**: *"허용되지 않은 상태 전이를 Runtime Guard에서 차단하라."*
**§0 실측: ★`status_history` grep 0 — Status History 테이블은 전면 부재. 현행 상태는 전부 제자리 덮어쓰기** → **12 필드 전부 부재**.

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_status_history_id` | **부재** — §0 "APPROVAL_STATUS_HISTORY **grep 0**" · **NOT_APPLICABLE(신설)** |
| 2 | `entity_type` | **부재** — §0 History 테이블 자체 부재 · **NOT_APPLICABLE(신설)** |
| 3 | `entity_id` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 4 | `previous_status` | **부재** — §0 "✘ **이전 상태 소실**"(`UPDATE ... SET status=?` Alerting.php:653 · Mapping/AdminGrowth/Catalog 전부 덮어쓰기) · **★MIGRATION_REQUIRED** · §4.9 상충 |
| 5 | `new_status` | **부분** — ※현행 `status` 컬럼이 **현재값만** 보유(이력 아님). §0 판정: 4테이블 **100% 직접 덮어쓰기** · **MIGRATION_REQUIRED** |
| 6 | `transition_type` | **부재** — §0 "`action_request` — **전이 검증 0**"(Alerting.php:653). ※인접 REAL: `FeedTemplate::transition` 순차 강제·역행 차단·`invalid_state` 409(FeedTemplate.php:248-285) · **CANONICAL_APPROVAL_TRANSITION_GUARD**(전이 강제만 승격 · **이력은 안 남김**) |
| 7 | `actor` | **부분(신뢰 불가)** — ※`audit_log`(Db.php:540-546)에 `actor` 있음 · `Mapping::audit`(Mapping.php:60-63). §0 판정 **LEGACY_ADAPTER**(**History 대체물 아님**). ★`Alerting::actor`(:33-36)는 `X-User-Email` **위조 가능** |
| 8 | `transition reason` | **부재** — §0 History 축 부재 · **NOT_APPLICABLE(신설)** |
| 9 | `effective_at` | **부재** — §0 History 축 부재. ※`audit_log.created_at` 은 **기록시각**이며 **발효시각 아님**(2시각 미분리) · **NOT_APPLICABLE(신설)** |
| 10 | `recorded_at` | **부분** — ※`audit_log.created_at`(Db.php:540-546) · **tenant_id 없음 · 해시체인 없음 · immutable 아님** · **LEGACY_ADAPTER** |
| 11 | `correlation id` | **부재** — `correlation_id` grep 0 · **NOT_APPLICABLE(신설)** · §34 축 |
| 12 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 12 = **존재 0** + **부분 4**(5·7·10 · 6은 인접 REAL) + **부재 7** + **판정 유보 1**(12).

### 1-1. ★원문에 **없는** 축 — `tenant_id` · `hash_chain`

초판은 `tenant_id`(*"격리 필수 — `audit_log` 결함 교정"*)와 `hash_chain`(*"`menu_audit_log` 선례 확장"*)을 필드로 넣었다. **둘 다 스펙 §28 원문에는 없다.**

> ⚠️ **그렇다고 §0 의 결함 판정이 취소되는 것은 아니다** — `audit_log` **tenant_id 없음 · 해시체인 없음 · immutable 아님**(**LEGACY_ADAPTER**)과 `menu_audit_log.hash_chain` **필드·저장 선례**(AdminMenu.php:123-131,169-210 · 🔴 **tamper-evident 아님** — `verify()` 0·preimage ts(`:195`) 소실 → 무결성 검증은 `SecurityAudit::verify():56-68` 이식)는 **§0 실측으로 유효하며 삭제하지 않는다**(무후퇴).
> **다만 그 둘은 "스펙 §28 이 요구한 필드"가 아니라 "289차가 판단한 보강"** 이다 — **분모(원문)와 판단(설계)을 섞지 않는다**(REQ §16 요구 날조 0 · §15 역산 금지). 헌법상 **테넌트 격리 절대**는 별도 근거로 유지된다.

> **§0 판정 재확인**: 스펙 §28 요구 대비 현행 **미충족 0/4**(전 4개 승인 테이블 100% 직접 덮어쓰기) — 전사 후에도 **모순 0**.

## 2. 규칙

- **Append-only**(§4.9) — History 행은 **UPDATE·DELETE 금지**. 상태 변경은 **History INSERT 가 정본**이고, 현재 상태 컬럼은 **파생 캐시**다.
- **기존 `status` 컬럼 보존**(비파괴 · Golden Rule = Extend) — 컬럼 제거 금지. History 를 **추가**할 뿐이다.
- **전이 검증 없는 `UPDATE status` 금지** — `FeedTemplate.php:248-285` 의 `invalid_state` 409 패턴을 **확장**(신설 금지). 허용 전이 정본 = `DSAR_APPROVAL_ALLOWED_TRANSITIONS.md`(§29).
- **해시체인은 신설이 아니라 재사용** — 🔴 단 검증형 정본은 **`SecurityAudit`**(`verify():56-68`·preimage ts 저장 `:31`)이다. `menu_audit_log.hash_chain` 은 **쓰기 체인만 실재·검증 불가**(tamper-evident 아님)이므로 **필드·prev-chain 알고리즘만** 참조하고 무결성 검증은 `SecurityAudit` 을 확장. 별도 tamper-evident 엔진 신설 금지(중복 엔진 금지).
- `audit_log`(`Db.php:540-546`)는 **History 대체물이 아니다**(tenant_id·체인 부재). **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤).
- **코드변경 0**.
