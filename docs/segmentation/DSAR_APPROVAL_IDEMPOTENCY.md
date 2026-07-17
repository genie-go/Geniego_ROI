# DSAR — Approval Idempotency (§35)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §35 필드 = 14 · Resolution = 6). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

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

## 1. Idempotency Resolution (6)

| # | Resolution | 조건 |
|---|---|---|
| 1 | `CREATED` | 신규 키 → 정상 생성 |
| 2 | `REPLAYED` | 동일 키 + **payload_hash 일치** → **기존 결과 반환**(재집행 없음) |
| 3 | `CONFLICT` | 동일 키 + **payload_hash 불일치** → **409 거부**(가장 중요 — #4 결함 교정) |
| 4 | `IN_PROGRESS` | 동일 키 처리 중 → **409/425**(경합 차단) |
| 5 | `EXPIRED` | 키 보존기간 경과 → 신규 취급 |
| 6 | `SUPERSEDED` | 신 Version 이 키를 대체(§39) |

## 2. CANONICAL_APPROVAL_IDEMPOTENCY 필드 (14)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `idempotency_id` | PK |
| 2 | `tenant_id` | **복합 UNIQUE 필수**(`uq_rve_dedup` 선례 `Db.php:1034`) |
| 3 | `idempotency_key` | 클라이언트 제공 또는 서버 파생 |
| 4 | `scope` | 키 유효 범위(도메인·엔드포인트) |
| 5 | `dedup_key` | **자연키 sha256**(`Db.php:257-281` 패턴 **확장**) |
| 6 | `payload_hash` | **★sha256 · `CONFLICT` 판정 근거**(현행 부재) |
| 7 | `request_id` | FK → §7(생성 결과) |
| 8 | `resolution` | 위 6종 |
| 9 | `state` | `IN_PROGRESS` \| `COMPLETED` \| `FAILED` |
| 10 | `response_snapshot_json` | `REPLAYED` 시 반환할 원 결과 |
| 11 | `correlation_id` | §34 |
| 12 | `environment` | `Db::env()`(`Db.php:46,57`) — demo/production 키 충돌 차단 |
| 13 | `first_seen_at` | |
| 14 | `expires_at` | 보존기간 |

## 3. 규칙

- **신설이 아니라 확장**(Golden Rule) — `dedupAggTable()`(`Db.php:257-281`)·`uq_rve_dedup`(`Db.php:1034`)·Paddle guard(`Paddle.php:343`) 가 **이미 정립한 패턴**을 승인 도메인으로 확장한다. **별도 idempotency 엔진/미들웨어 신설 금지**.
- 🔴 **DB UNIQUE 제약이 정본**(`uq_approval_idem(tenant_id, scope, idempotency_key)`). **애플리케이션 `SELECT` 선검사 단독 금지** — `AdminGrowth.php:1292` 의 **TOCTOU 패턴 복제 금지**(제약 + 앱검사 **이중방어**).
- **`payload_hash` 불일치 = 병합 아니라 `CONFLICT` 409.** 같은 키로 다른 내용을 밀어넣는 것은 **오류이지 재시도가 아니다**(#4 결함 교정 지점).
- **Financial Approval 은 `idempotency_key` + `payload_hash` 필수**(§35) — 누락 시 요청 **거부**(fail-closed). `PlanPolicy.php:12` fail-open 복제 금지.
- **`dedupAggTable()` 의 fail-soft try/catch 를 승인 도메인에 복제 금지** — 집계 테이블에선 적절하나, **금전 승인에서 제약 생성 실패의 무음 흡수는 곧 중복 집행**이다.
- **기존 dedup 컬럼·인덱스 보존**(비파괴) — `dedup_key`/`notification_id`/`ref_type`+`ref_id` 제거 금지.
- **코드변경 0**.
