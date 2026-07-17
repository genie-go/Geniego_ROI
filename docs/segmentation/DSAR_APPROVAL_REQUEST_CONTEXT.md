# DSAR — Approval Request Context (§11)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — Context 축

| Context 축 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| **Context 테이블/컬럼** | **부재(grep 0)** — `approval_request_context` 없음 | **NOT_APPLICABLE(부재 → 신설)** |
| **Tenant** | ✔ `mapping_change_request.tenant_id`(Db.php:624) · `action_request.tenant_id`(**후행 ALTER** Db.php:589 · 208차 P0 IDOR). 전 승인경로 `WHERE ... AND tenant_id=?`(Mapping.php:252 · Alerting.php:582) | **VALIDATED_LEGACY**(유일하게 견고한 축) |
| **Tenant 예외** | ★`admin_growth_approval` **tenant_id 없음**(AdminGrowth.php:142-149) · `audit_log` **tenant_id 없음**(Db.php:540-546) · `channel_registry` **글로벌**(ChannelRegistry.php:16) | **★MIGRATION_REQUIRED** |
| **Workspace** | **레지스트리 부재** — 실체는 `tenant_kv` KV(WorkspaceState.php:59) | **NOT_APPLICABLE(신설)** |
| **Organization · Department · Legal Entity** | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| **Country / Region** | **레지스트리 부재** — Geo.php:19 는 IP→국가 **탐지**(레지스트리 아님) | **NOT_APPLICABLE(신설)** |
| **Environment** | `Db::env()`(Db.php:46,57) — `GENIE_ENV` → `'demo'\|'production'` **2값 분기 · 레지스트리 아님 · 승인 레코드에 미기록** | **LEGACY_ADAPTER** |
| **Currency** | `fxToKrw`(Connectors.php:1749) — 24통화 하드코딩 + app_setting 캐시. **승인 레코드에 currency 미기록** | **LEGACY_ADAPTER** |
| **Program** | **부재** — REBATE_PROGRAM 포함 `REBATE_*` 전면 grep 0 | **NOT_APPLICABLE(전방호환)** |
| **Actor / Identity** | ★**2계통 분열**: `Mapping::actorId`(:36-53) = **위조불가**(api_key 행 또는 UserAuth 세션에서만 도출 · 실패 시 null→403) **vs** `Alerting::actor`(:33-36) = **클라이언트 `X-User-Email` 헤더 / `?actor=` 쿼리 → 기본 `'unknown'`** **위조 가능** | **VALIDATED_LEGACY**(Mapping) · **★MIGRATION_REQUIRED**(Alerting) |
| **Request Source**(UI/API/system) | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |
| **IP · User-Agent · Session · Device · Risk** | **부재(grep 0)** — 승인 레코드에 미기록 | **NOT_APPLICABLE(신설)** |
| **Timestamp** | ✔ `created_at` VARCHAR(32)(Db.php:599,635) · 승인 시각은 `approvals_json` 내 `ts`(Mapping.php:286 · Alerting.php:592 `gmdate('c')`) | **VALIDATED_LEGACY** |
| **Policy Reference** | 부분 — `action_request.policy_id`(Db.php:594)가 **유일 흔적** · **policy_version 부재**(grep 0) | **LEGACY_ADAPTER** |
| **Plan / Feature Flag** | `PlanPolicy`(PlanPolicy.php:17,20,28) — ★**fail-open**(:12 주석이 자인). Feature Flag **부재(grep 0)** | **MIGRATION_REQUIRED** · **NOT_APPLICABLE** |
| **Context Snapshot** | **부재(grep 0)** — §4.4/§4.6 상충: 승인 시점 Context 재현 불가 | **NOT_APPLICABLE(신설)** |

### 0-1. ★Actor 신원 = Context 의 급소 (실측)

`Alerting::actor`(:33-36)는 **클라이언트가 보낸 헤더를 그대로 신원으로 채택**한다. 289차 `Mapping::approve` G-01 복구는 정확히 이 문제를 고쳤다 — *"사람을 특정할 수 없으면 셀 수도 없다"*(Mapping.php:243-246 주석). **`Alerting` 계통은 미복구**이며, 정족수·자기승인·dedup 이 **전무**(Alerting.php:572-599)해 헤더 위조로 무한 승인이 성립한다. **단 생산자 부재(`INSERT INTO action_request` grep 0)로 도달 불가 = VACUOUS(P1)**.

## 1. 스펙 §11 `APPROVAL_REQUEST_CONTEXT` 필수 필드 전사 — 원문 실측 **24개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §11**

> 🔴 **REQ 집계 23 ↔ 원문 실측 24 — 원문이 정본.**
> REQ `§7` 표의 *"§11 Approval Request Context 필드 = **23**"* 은 **원문 나열과 1건 어긋난다**(원문 나열 실측 = 24).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**

**§0 실측: Context 테이블/컬럼 부재(grep 0)** → 아래는 각 필드의 **대응 축이 현행 어딘가에 존재하는지**를 §0 에서만 인용한 것이다(Context 행 자체는 전 항목 부재).

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_request_context_id` | **부재** — §0 "`approval_request_context` **없음**" · **NOT_APPLICABLE(신설)** |
| 2 | `approval_request_id` | **부재(FK)** — §0 Context 테이블 자체 부재. ※참조 대상 Request `id` 는 존재 |
| 3 | `request_time` | **존재(근사)** — §0 Timestamp: `created_at` VARCHAR(32)(Db.php:599,635) · 승인 시각은 `approvals_json` 내 `ts`(Mapping.php:286 · Alerting.php:592 `gmdate('c')`) · **VALIDATED_LEGACY** |
| 4 | `timezone` | ⚠️ **판정 유보** — §0 미열거. ※인접: `gmdate('c')` = UTC 고정(타임존 축 아님) |
| 5 | `source channel` | **부재** — §0 "Request Source(UI/API/system) **부재(grep 0)**" · **NOT_APPLICABLE(신설)** |
| 6 | `source device reference` | **부재** — §0 "IP·User-Agent·Session·Device·Risk **부재(grep 0)** — 승인 레코드에 미기록" · **NOT_APPLICABLE(신설)** |
| 7 | `source network zone` | **부재** — §0 동일(IP 축 미기록) · **NOT_APPLICABLE(신설)** |
| 8 | `authentication assurance` | ⚠️ **판정 유보** — §0 미열거(§0-1 Actor 신원 축과 인접하나 별개) |
| 9 | `MFA state` | ⚠️ **판정 유보** — §0 미열거 |
| 10 | `session reference` | **부재** — §0 "Session **부재(grep 0)** — 승인 레코드에 미기록". ※§0 `Mapping::actorId`(:36-53)가 **UserAuth 세션에서 신원 도출**하나 **세션 참조를 레코드에 남기지 않음** · **NOT_APPLICABLE(신설)** |
| 11 | `requester risk` | **부재** — §0 "Risk **부재(grep 0)**" · **NOT_APPLICABLE(신설)** |
| 12 | `resource risk` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 13 | `transaction risk` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 14 | `incident state` | **부재** — §0-Resource 실측: Incident 레지스트리 **부재(grep 0)** · **NOT_APPLICABLE(신설)** |
| 15 | `financial amount` | **부재** — §0 승인 레코드에 금액축 미기록 · **NOT_APPLICABLE(신설)** |
| 16 | `currency` | **부재(레코드)** — §0 Currency: `fxToKrw`(Connectors.php:1749) 24통화 하드코딩 + app_setting 캐시 · **승인 레코드에 currency 미기록** · **LEGACY_ADAPTER** |
| 17 | `contract reference` | **부재** — §0 Program/Contract 축 부재(`REBATE_*` 전면 grep 0) · **NOT_APPLICABLE(전방호환)** |
| 18 | `funding reference` | **부재** — §0 동일(`REBATE_*` grep 0) · **NOT_APPLICABLE(전방호환)** |
| 19 | `provider reference` | ⚠️ **판정 유보** — §0 미열거. ※인접: `channel_registry`(ChannelRegistry.php:16) **tenant_id 없는 글로벌** |
| 20 | `customer impact` | ⚠️ **판정 유보** — §0 미열거 |
| 21 | `compliance impact` | ⚠️ **판정 유보** — §0 미열거 |
| 22 | `accounting impact` | ⚠️ **판정 유보** — §0 미열거 |
| 23 | `urgency` | ⚠️ **판정 유보** — §0 미열거 |
| 24 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 24 = **존재(근사) 1**(3 `request_time`) + **부재 13**(1·2·5·6·7·10·11·12·13·14·15·16·17·18 중 §0 근거분) + **판정 유보 9**(4·8·9·19·20·21·22·23·24).

> ⚠️ **미측정 ≠ 부재.** §0 은 **스펙 §11 을 모르는 상태에서** REQ §4 §3.3(공통 비즈니스 기반 18) 축을 실측한 것이므로, 유보 9 는 **측정 대상이 아니었을 뿐**이다. 유보 해제는 별도 실측 세션.

### 1-1. 원문 §11 이 요구하는 축 중 §0 가 이미 급소로 지목한 것

§0-1 은 **Actor 신원**을 Context 의 급소로 지목한다 — 원문 §11 의 필드 **10 `session reference`** · **8 `authentication assurance`** · **9 `MFA state`** 가 정확히 그 축이다.

- `Mapping::actorId`(:36-53) = **위조불가**(api_key 행 또는 UserAuth 세션에서만 도출 · 실패 시 null→403) · **VALIDATED_LEGACY**
- `Alerting::actor`(:33-36) = **클라이언트 `X-User-Email` 헤더 / `?actor=` 쿼리 → 기본 `'unknown'`** **위조 가능** · **★MIGRATION_REQUIRED** · 단 생산자 부재로 **VACUOUS**(P1)

⇒ 원문이 요구하는 인증 컨텍스트 3필드는 **현행 어느 승인 레코드에도 없다**. §0-1 판정과 **정합**(모순 0).

## 2. 규칙

- **§4.6 준수**: 승인자는 **승인 시점에** 유효한 권한 보유 → **Actor Authorization Snapshot 이 Context 의 필수부**(현행 grep 0).
- **Actor 신원 단일화**: `Mapping::actorId`(위조불가)를 **Canonical Actor 해석기로 승격**하고 `Alerting::actor` 를 **여기에 흡수**한다 — 신설 아님(Golden Rule = Extend).
- **Tenant 축은 이미 견고** — 파괴 금지. **tenant_id 없는 3곳**(admin_growth_approval · audit_log · channel_registry)이 격리 구멍(헌법: 테넌트 격리 절대).
- **PlanPolicy fail-open 주의**(:12) — Context 의 Plan 축을 승인 게이트로 쓰면 **fail-open 이 승인 우회로 전이**된다.
- **Context 를 "있다"고 가정하고 배선 금지**(287차 죽은 스켈레톤) — 대부분 grep 0.
