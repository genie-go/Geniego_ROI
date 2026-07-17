# DSAR — Approval Idempotency (§35)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §35 — 원문 그대로 전사.
> **분모 정합**: Resolution — REQ 6 ↔ **원문 실측 6 개수 일치**(단 **항목명 전면 상이** · §1-1).
> 🔴 **분모 불일치**: 필드 — **REQ 집계 14 ↔ 원문 실측 15 — 원문이 정본.** REQ §7 의 `14` 는 정정 대상.

## 0. 현행 실측 대조표 (file:line)

**전용 구현 부재**: `idempotency_key` / `Idempotency-Key` **grep 0**. `idempotency` 문자열 실측 = **주석 1건**(`Paddle.php:343`)뿐.
**★그러나 동등 목적의 선례가 3종 실재한다 — 이 도메인은 신설이 아니라 확장이다.**

| # | 현행 dedup 선례 | 실측 | 분류 |
|---|---|---|---|
| 1 | **`dedup_key` + UNIQUE 인덱스** | `Db.php:257-281` `dedupAggTable()` — `dedup_key VARCHAR(64)` 컬럼 보강 → 자연키 **sha256 백필** → 중복행 제거 → `CREATE UNIQUE INDEX uq_{table}_dedup`. **앱 upsert 와 이중방어**(주석 자인) | **★`VALIDATED_LEGACY`**(재사용 원형) |
| 2 | **`raw_vendor_event.dedup_key`** | `Db.php:1023`(컬럼) + `Db.php:1034` `uq_rve_dedup(tenant_id,vendor,dedup_key)` — **테넌트 포함 복합 UNIQUE** | **★`VALIDATED_LEGACY`**(테넌트 격리 선례) |
| 3 | **Paddle 웹훅 guard** | `Paddle.php:343` — `notification_id` UNIQUE 를 **idempotency guard 로 명시 사용**(주석 자인) | **`VALIDATED_LEGACY`**(외부 이벤트) |
| 4 | **`AdminGrowth::createApproval`** | `AdminGrowth.php:1292` — 동일 `ref_type`/`ref_id` **pending 존재 시 기존 id 재사용**(`SELECT` 후 early return) | **`LEGACY_ADAPTER`** — **현행 유일한 승인측 중복방지**(아래 0-1) |
| 5 | `Mapping::approve` | `Mapping.php:238-294` — 동일 승인자 **dedup 409** | **`VALIDATED_LEGACY`**(Decision 중복만 · 요청 중복 아님) |
| 6 | `action_request` / `mapping_change_request` / `catalog_writeback_job` | idempotency 컬럼 **없음**(`Db.php:592-600,623-636` · `Catalog.php:2341-2364`) | **NOT_APPLICABLE(부재 → 신설)** |
| 7 | APPROVAL_IDEMPOTENCY | **grep 0** | **NOT_APPLICABLE(부재 → 신설)** |

### 0-1. #4 가 `LEGACY_ADAPTER`(약한 dedup)인 이유

① **`SELECT`→`INSERT` 비원자적** → **TOCTOU**(동시 요청 시 중복 생성 · DB 제약 없음), ② `status='pending'` 한정 → **approved 이후 동일 요청 재생성 차단 못함**, ③ **payload 무시** → **내용이 달라도 같은 요청으로 병합**(위험), ④ `tenant_id` **미포함**(`admin_growth_approval` 자체가 tenant_id 부재).

> **🔴 스펙 §35 요구("Financial Approval 에 Idempotency Key + Payload Hash 강제") 대비 판정 = 미충족.**
> 승인 도메인에 **Idempotency Key 0 · Payload Hash 0 · UNIQUE 제약 0**.
> ⇒ 네트워크 재시도/더블클릭 시 **동일 승인 요청의 중복 생성·중복 집행을 막는 DB 수준 방어가 없다**(금전 도메인 = §45 Critical Gap 후보).
> ※ `REBATE_*` **grep 0** · `INSERT INTO action_request` **grep 0** → 현재 **실피해 미도달(VACUOUS)** · P 등급 단정은 PM 코드 재증명 후.

## 1. Idempotency Resolution (6) — 원문 전사

`APPROVAL_IDEMPOTENCY`

| # | Resolution | # | Resolution |
|---|---|---|---|
| 1 | `RETURN_EXISTING` | 4 | `CREATE_SUPERSEDING_REQUEST` |
| 2 | `REJECT_DUPLICATE` | 5 | `MERGE_REFERENCE` |
| 3 | `CREATE_NEW_VERSION` | 6 | `MANUAL_REVIEW` |

> 스펙 §35 원문 말미: **"같은 Payout·Settlement·Funding 작업에 대해 중복 Approval Request 와 중복 실행이 생성되지 않도록 하라."**

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록

289차 placeholder 는 **개수(6)만 맞고 항목명이 전면 자작**이었다. placeholder = **HTTP 재시도 결과 코드**(CREATED/REPLAYED/CONFLICT…), 원문 = **중복 요청 처리 방침**(무엇을 할 것인가):

| placeholder(자작·폐기) | 원문 §35 | 성격 |
|---|---|---|
| `CREATED` · `REPLAYED` · `CONFLICT` · `IN_PROGRESS` · `EXPIRED` · `SUPERSEDED` | **전부 없음** | **자작**(HTTP 상태 축) |
| — | `RETURN_EXISTING`(#1) · `REJECT_DUPLICATE`(#2) · `CREATE_NEW_VERSION`(#3) · `CREATE_SUPERSEDING_REQUEST`(#4) · `MERGE_REFERENCE`(#5) · `MANUAL_REVIEW`(#6) | **원문에 있으나 placeholder 전면 누락** |

⇒ **원문이 정본.** 의미상 근접쌍은 `REPLAYED`≈`RETURN_EXISTING`(#1) · `CONFLICT`≈`REJECT_DUPLICATE`(#2) 정도이나 **동일하지 않다** — 원문은 **#3~#5(새 Version·대체 요청·병합)** 라는 **적극적 처리 경로**를 요구하며 placeholder 에는 그 축이 없었다.

## 2. 스펙 §35 필수 필드 — 원문 전사 (실측 15)

원문 순서 그대로:

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_idempotency_id` | 9 | duplicate detection window |
| 2 | `tenant_id` | 10 | `first_seen_at` |
| 3 | `source_system` | 11 | `last_seen_at` |
| 4 | source request key | 12 | duplicate count |
| 5 | business resource | 13 | resolution |
| 6 | requested action | 14 | `status` |
| 7 | request payload hash | 15 | `evidence` |
| 8 | existing approval request | | |

> 🔴 **필드 원문 실측 15 ↔ REQ 집계 14 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

**원문 대조 결과**:
- **#7 request payload hash 는 원문 필수 필드** → §0 판정("Payload Hash 0 · 같은 키로 다른 내용 병합 위험")이 **원문으로 직접 뒷받침**됨. `AdminGrowth.php:1292` 의 **payload 무시**(§0-1 ③)는 이 축의 정면 위반.
- **#9 duplicate detection window · #11 duplicate count · #10 `last_seen_at`** = **중복 관측 이력** 요구. placeholder 에 없던 축이며 현행 전무.
- placeholder 의 `idempotency_key`·`scope`·`dedup_key`·`state`·`response_snapshot_json`·`correlation_id`·`environment`·`expires_at` 는 **원문 §35 필드가 아니다**(자작) → 요구 분모에서 **폐기**. 원문은 클라이언트 키가 아니라 **`source_system`(#3) + source request key(#4) + business resource(#5) + requested action(#6)** 조합을 축으로 삼는다.
- **현행 커버리지 = 15 중 0**(§0 실측 · `dedup_key` 선례들은 **승인 도메인 밖**이므로 산입 불가 — 재사용 가능한 **패턴**일 뿐).

## 3. 규칙

- **신설이 아니라 확장**(Golden Rule) — `dedupAggTable()`(`Db.php:257-281`)·`uq_rve_dedup`(`Db.php:1034`)·Paddle guard(`Paddle.php:343`) 가 **이미 정립한 패턴**을 승인 도메인으로 확장한다. **별도 idempotency 엔진/미들웨어 신설 금지**.
- 🔴 **DB UNIQUE 제약이 정본** — 키 구성은 **원문 축**(`tenant_id`#2 + `source_system`#3 + source request key#4)으로 잡는다. **애플리케이션 `SELECT` 선검사 단독 금지** — `AdminGrowth.php:1292` 의 **TOCTOU 패턴 복제 금지**(제약 + 앱검사 **이중방어**).
- **request payload hash(#7) 불일치 = 병합 금지.** 같은 키로 다른 내용을 밀어넣는 것은 **오류이지 재시도가 아니다**(§0-1 ③ 결함 교정 지점) → 원문 Resolution **`REJECT_DUPLICATE`(#2)** 또는 **`CREATE_NEW_VERSION`(#3)/`CREATE_SUPERSEDING_REQUEST`(#4)** 중 정책이 정한 경로. **조용한 병합(`MERGE_REFERENCE`#5)은 금전 도메인 기본값 금지**.
- **Financial Approval 은 source request key(#4) + request payload hash(#7) 필수**(§35) — 누락 시 요청 **거부**(fail-closed). `PlanPolicy.php:12` fail-open 복제 금지.
- **`dedupAggTable()` 의 fail-soft try/catch 를 승인 도메인에 복제 금지** — 집계 테이블에선 적절하나, **금전 승인에서 제약 생성 실패의 무음 흡수는 곧 중복 집행**이다.
- **기존 dedup 컬럼·인덱스 보존**(비파괴) — `dedup_key`/`notification_id`/`ref_type`+`ref_id` 제거 금지.
- **코드변경 0**.
