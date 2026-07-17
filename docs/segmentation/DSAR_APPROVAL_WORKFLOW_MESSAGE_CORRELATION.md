# DSAR — Workflow Message Correlation (§45)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §45 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 상관관계 **엔티티**(`message_correlation`·`correlation key`) | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 인바운드 메시지 → 대기 인스턴스 **매칭** | **grep 0** — 수신 메시지가 워크플로를 깨우는 경로 0(§44) | `NOT_APPLICABLE` |
| ★인접 실선례 — **멱등 수신** | Paddle webhook: `notification_id` **UNIQUE**(Paddle.php:101 `UNIQUE KEY uq_notification_id` · :146 SQLite `TEXT NOT NULL UNIQUE`) → INSERT 충돌로 중복 탐지(:346) | `VALIDATED_LEGACY`(멱등 원리) |
| ↳ ★**272차 H-P1 규율** | :351-363 — 멱등 skip 은 **`processed=1`(처리완료)일 때만**. **`processed=0`(과거 처리실패)은 재처리 허용** (:355 `SELECT processed ...` → :363 `processed=0 → 재처리 진행`) | ★**재사용 강제** |
| ↳ 처리 완료 마킹 | :373 `UPDATE paddle_events SET processed = 1 WHERE notification_id = ?` | `VALIDATED_LEGACY` |
| ↳ 서명 검증 | HMAC(Paddle.php:1073) = **강제**(opt-in 아님) | `VALIDATED_LEGACY` |
| ↳ 순서 규율 | :16 주석 — `occurred_at` ordering, 최신 이벤트가 이미 처리됐으면 stale skip | `VALIDATED_LEGACY` |
| ↳ 🔴**테넌트 검증 부재** | `paddle_events` 컬럼(:99-108) = `notification_id`·`event_type`·`occurred_at`·`payload`·`processed`·`error` — **tenant_id 없음** | ★§2 금지 참조 |
| 범용 인바운드 | `Webhooks.php:22-27` — **opt-in 서명검증**: 시크릿(`GENIE_WEBHOOK_SECRET_<VENDOR>`/`GENIE_WEBHOOK_SECRET`) **미설정 벤더는 수신 허용 + `verified=false`** (:23-27) | `LEGACY_ADAPTER`(승인 상속 금지) |
| 원시 이벤트 dedup | `raw_vendor_event` + `uq_rve_dedup` UNIQUE (Db.php:1017-1034) | `LEGACY_ADAPTER`(dedup 원리) |
| Unmatched 보존·Manual Reconciliation | **grep 0** — 미매칭 메시지 개념·보존 기간·수동 대사 정책 전무 | `NOT_APPLICABLE` |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — "멱등"과 "상관관계"는 다른 능력이다.** Paddle 경로는 **같은 메시지를 두 번 처리하지 않는 능력**(dedup)은 REAL이지만, **메시지를 대기 중인 워크플로 인스턴스에 결합시키는 능력**(correlation)은 **0**이다. `notification_id`는 **자기 자신의 고유키**이지 `correlation key`(외부 메시지 ↔ 내부 인스턴스를 잇는 키)가 아니다. 이 둘을 혼동해 "멱등 있으니 상관관계 있음"으로 계산하면 **역산**이다 → 상관관계 축은 `NOT_APPLICABLE`, 멱등 원리만 `VALIDATED_LEGACY`로 인용한다.

**★두 번째 함정 — `processed=0` 재처리 허용은 순진한 "UNIQUE면 skip"보다 정교하다.** 272차가 발견한 것: **INSERT 충돌 = 중복**이 아니라, **INSERT 충돌 + `processed=1` = 중복**이다. 충돌했지만 `processed=0`이면 **과거에 받았으나 처리에 실패한 것**이므로 재처리해야 한다. 5-3-2가 `duplicate 여부`를 **UNIQUE 충돌 하나로** 판정하면 **272차 수정을 되돌리는 기능 후퇴**다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 19개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | message_correlation_id | 부재 | `NOT_APPLICABLE` |
| 2 | message id | 부재(상관관계) · 인접 = `paddle_events.notification_id`(Paddle.php:101 · :331 `$payload['notification_id'] ?? ($payload['id'] ?? '')` · :337 없으면 400) | `LEGACY_ADAPTER` |
| 3 | message type | 부재 · 인접 = `paddle_events.event_type`(:99-108) | `LEGACY_ADAPTER` |
| 4 | source system | **부재** — Paddle 테이블은 **단일 벤더 전용**이라 출처 컬럼이 없다 · `Webhooks.php`는 `$vendor` 를 **서명 시크릿 조회에만** 사용(:23-27), 저장 축 아님 | `NOT_APPLICABLE` |
| 5 | tenant_id | 🔴 **부재** — `paddle_events`(:99-108)에 **tenant_id 없음** | `NOT_APPLICABLE` |
| 6 | workspace_id | **부재**(grep 0) | `NOT_APPLICABLE` |
| 7 | correlation key | **부재**(grep 0) — 외부 메시지 ↔ 내부 인스턴스 결합 키 전무 | `NOT_APPLICABLE` |
| 8 | business resource reference | 부재 · 인접 = Paddle `ref_id`(:89 주석의 드리프트 정합화 대상 컬럼) — **구독 참조 전용**, 범용 리소스 참조 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | approval request reference | **부재** — 승인 요청을 가리키는 인바운드 메시지 개념 0 | `NOT_APPLICABLE` |
| 10 | approval case reference | **부재** | `NOT_APPLICABLE` |
| 11 | workflow instance reference | **부재** | `NOT_APPLICABLE` |
| 12 | target node | **부재** | `NOT_APPLICABLE` |
| 13 | payload hash | **부재** — 원문은 **해시**를 요구하나 현행은 `paddle_events.payload` **원문 전체 저장**(:99-108,:346) | `NOT_APPLICABLE` |
| 14 | received_at | 부재(전용) · 인접 = `paddle_events.occurred_at`(:99-108) — **발생 시각**(벤더 기준)이지 수신 시각 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 15 | correlated_at | **부재** — 상관관계 성립 시각 개념 0 | `NOT_APPLICABLE` |
| 16 | duplicate 여부 | 부재(컬럼) · ★인접 = **`notification_id` UNIQUE + `processed=1`일 때만 skip**(:346,:351-363 · 272차) | `VALIDATED_LEGACY`(원리 채택) |
| 17 | unmatched 여부 | **부재** — 미매칭 개념 자체가 없다(매칭이 없으므로) | `NOT_APPLICABLE` |
| 18 | status | 부재(전용) · 인접 = `paddle_events.processed`(TINYINT/INTEGER :105,:150) + `error`(:375) — **2값 플래그**, 원문 status 축 미달 | `NOT_APPLICABLE` |
| 19 | evidence | **부재** · 인접 = `paddle_events.payload` 원문 보존(:346) = **증거 소재는 있으나 봉투 아님** | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사**(목록 끝 `evidence` 포함 — 누락 없음). 커버리지 = 부재 13 · 어댑터 3 · 검증된 선례 1 · 도메인 상이 2.

## 2. 규칙

- ✅ **멱등 판정은 272차 규율 그대로 채택 강제** — **UNIQUE 충돌 + `processed=1` 일 때만 `duplicate`**. `processed=0`(과거 처리실패)은 **재처리 허용**(Paddle.php:351-363). 🔴 **"UNIQUE 충돌 = 중복 = skip"으로 단순화하면 272차 H-P1 수정을 되돌리는 기능 후퇴**다.
- 🔴 **테넌트 검증 부재를 상속 금지.** `paddle_events`는 **tenant_id 컬럼이 없다**(:99-108). 승인 메시지 상관관계는 **tenant_id 필수 컬럼 + 매칭 시 tenant 일치 검증**이 없으면, **한 테넌트의 메시지가 다른 테넌트의 승인 인스턴스를 재개시킬 수 있다**. 원문이 `tenant_id`·`workspace_id`를 **둘 다** 요구하는 이유다.
- 🔴 **opt-in 인증 상속 절대 금지.** `Webhooks.php:22-27`은 시크릿 미설정 벤더의 수신을 **허용**하고 `verified=false`만 남긴다. 승인 메시지에 이 규율이 붙으면 **미인증 메시지가 승인 워크플로를 전진시킨다**. Paddle의 **강제 HMAC**(:1073)이 올바른 선례다 — 승인은 **fail-closed**(미검증 = 거부).
- ✅ **`payload hash` 는 결번 신설.** 현행은 원문 전체를 저장하며 해시가 없다 → 변조 탐지·중복 판정 보조 키로 **신설**하라. 단 원문 보존(`payload`)은 증거로 유지(무후퇴).
- ✅ **Unmatched 는 즉시 폐기 금지**(원문 §45 명시) — **보존 기간 + Manual Reconciliation 정책**을 함께 정의하라. 현행에 미매칭 개념이 없으므로 **전부 신설**이며, "현행이 조용히 버린다"를 정책으로 오인하지 마라.
- ✅ **dedup 저장 원리는 `raw_vendor_event`+`uq_rve_dedup` UNIQUE**(Db.php:1017-1034) **재사용** — 신설 dedup 기전 금지.
- 🔴 **`correlation key` 를 `message id` 로 대체하지 마라.** `notification_id`는 **메시지 자신의 고유키**이고 `correlation key`는 **메시지 ↔ 인스턴스 결합키**다. 대체하면 상관관계 축이 정의상 소멸한다(역산).
- 🔴 **`received_at` 을 `occurred_at` 으로 대체하지 마라.** 벤더 발생 시각 ≠ 수신 시각이며, Paddle의 stale skip 규율(:16)은 **두 축이 다르다는 전제** 위에 있다.
- 🔴 **19필드 중 13종을 "있다고 가정"하고 배선 금지.**
