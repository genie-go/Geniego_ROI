# DSAR — Concurrency Lock (§54)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §54 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

> ★**동시성 = 레포 최고 성숙 자산.** 이 축은 **결번이 아니라 "다른 모델로 이미 풀려 있다"** — 판정의 난도가 여기 있다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 분산락 | 🔴 **분산락·`GET_LOCK` backend/src grep 0** (289차 실측 재확인) | `NOT_APPLICABLE` |
| 파일락 | `flock` — **`stock_sync_cron.php:54` 유일**(크론 중복 실행 방지) | `KEEP_SEPARATE_WITH_REASON`(프로세스 축) |
| Fencing Token | 🔴 **`fencing` grep 0** · 유사 = `claim_id`(Omnichannel.php:394-423) — ★**소유자 태그이지 fencing token 아님**(단조 증가 아님 → stale 소유자 배제 불가) | `NOT_APPLICABLE` |
| Lock Version | 🔴 **`lock_version`·optimistic lock(`version` 컬럼) grep 0** · §55 와 짝 | `NOT_APPLICABLE` |
| **★실 잠금 규율** | **조건부 UPDATE + rowCount CAS** — Catalog.php:1683 · ChannelSync.php:6136-6153 · JourneyBuilder.php:411 | `VALIDATED_LEGACY`(★채택 강제 · 설계 결론 5) |
| 성숙 구현(정점) | `Omnichannel::claimBatch` **Omnichannel.php:394-423** — **stale lease 900s 회수 → `SELECT..FOR UPDATE SKIP LOCKED` + claim_id → 조건부 UPDATE 폴백** | `VALIDATED_LEGACY`(★참조 구현) |
| 드라이버 폴백 | `Omnichannel::claimConditional` **:427-447** — SQLite/MySQL<8 용 **2단 폴백**(UPDATE..IN(subquery+LIMIT) 거부 시 SELECT 후 IN + status 가드) | `VALIDATED_LEGACY` |
| Lease TTL | Omnichannel **900s**(:394) · ChannelSync **600s**(:6136-6153) — 🔴 **TTL 2값 병존** | `LEGACY_ADAPTER`(통일 필요) |
| heartbeat | **부재** — 갱신 개념 없음(`claimed_at` 은 **1회 기록** · 이후 미갱신 → 장기 작업이 lease 만료로 **중복 집힘**) | `NOT_APPLICABLE` |

**★축 주의 — "락 부재"가 아니라 "다른 모델"이다.** 이름 grep(`GET_LOCK`/`fencing`/`lock_version`) 0 을 **동시성 방어 부재**로 확대 해석하면 **8회차 오판의 재현**이다(BPMN/Temporal grep 0 → "워크플로 엔진 부재" → JourneyBuilder 의 존재로 뒤집힘). **능력으로 대조하라**: 레포는 **조건부 UPDATE + rowCount CAS** 로 **동일 능력(상호배제)을 실제로 달성**하고 있으며 4곳에서 확립됐다. → **판정 = 락 프리미티브는 `VALIDATED_LEGACY`, 원문 필드 축(fencing/version/heartbeat)은 `NOT_APPLICABLE`.**

**★두 번째 축 주의 — `claim_id` 를 `fencing token` 으로 계산하면 역산이다.** 실측(Omnichannel.php:405-418): `claim_id` 는 **소유행 로드용 태그**(`WHERE claim_id=:cid`)다. Fencing token 의 정의적 요건인 **단조 증가**와 **다운스트림 리소스의 stale 토큰 거부**가 없다 → 900s 만료 후 되살아난 옛 워커가 **여전히 부수효과를 낼 수 있다**. 이름이 비슷하고 목적이 인접하나 **능력이 다르다**.

**★세 번째 축 주의 — 🔴 SQLite 폴백 호환이 명시적 설계 제약이다.** `Omnichannel::claimConditional`(:427-447)의 존재 자체가 이 제약의 증거다(`FOR UPDATE SKIP LOCKED` 미지원 드라이버를 위한 2단 폴백 · 일부 SQLite 빌드는 `UPDATE..IN(subquery+LIMIT)` 조차 거부). `Db.php` 는 MySQL 불가 시 **SQLite 로 투명 폴백**한다. → **§54 가 요구하는 `fencing token`·`lock version`·`heartbeat` 도입은 이 제약과 충돌한다**(§55 문서에서 상세). **정직하게 기록한다: 이 긴장은 미해결이다.**

## 1. 원문 전사 + 판정 — Lock Type **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | WORKFLOW_INSTANCE | 부재(인스턴스 개념 없음) · 인접 = `journey_enrollments` 조건부 UPDATE 선점(JourneyBuilder.php:411-418) | `LEGACY_ADAPTER`(패턴 선례) |
| 2 | WORKFLOW_TOKEN | 부재 — Token 개념 전무 | `NOT_APPLICABLE` |
| 3 | WORKFLOW_TASK | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 4 | TASK_CLAIM | 부재(승인) · 인접 = `Omnichannel::claimBatch`(:394-423 · stale lease 900s + SKIP LOCKED + 폴백) | `VALIDATED_LEGACY`(★참조 구현) |
| 5 | TRANSITION | 부재 — 전이 규칙 선언 0 · 전이 가드 4곳뿐(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `NOT_APPLICABLE` |
| 6 | MIGRATION | 부재 · §56 과 짝 | `NOT_APPLICABLE` |
| 7 | CANCELLATION | 부재 · §51 과 짝 | `NOT_APPLICABLE` |
| 8 | REPLAY | 부재 | `NOT_APPLICABLE` |
| 9 | COMPENSATION | 부재(`compensation` grep 0) · §52 와 짝 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.** 커버리지 = 부재 7 · 어댑터 1 · 참조구현 1.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 12개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_lock_id | 부재 — **락 레코드 개념 자체가 없음**(현행은 대상 행의 `status` 컬럼이 곧 락) | `NOT_APPLICABLE` |
| 2 | lock type | 부재 — 위 9종 구분축 | `NOT_APPLICABLE` |
| 3 | resource id | 부재(락 테이블 없음) · 현행은 대상 행 PK 가 암묵적 resource id | `NOT_APPLICABLE` |
| 4 | owner | 부재 · 인접 = `claim_id`(Omnichannel.php:405-418) — **소유자 태그** | `LEGACY_ADAPTER` |
| 5 | fencing token | 🔴 **grep 0** · `claim_id` 는 **단조 증가 아님 → fencing 불가** | `NOT_APPLICABLE` |
| 6 | lock version | 🔴 **grep 0** · §55 와 짝 · **SQLite 폴백 제약과 충돌** | `NOT_APPLICABLE` |
| 7 | acquired at | 부재 · 인접 = `claimed_at`(Omnichannel.php:394-405) | `LEGACY_ADAPTER` |
| 8 | heartbeat at | **부재** — `claimed_at` 은 1회 기록 후 미갱신 → 장기 작업이 lease 만료로 중복 집힘 | `NOT_APPLICABLE` |
| 9 | expires at | 부재(컬럼) · 인접 = **암묵 TTL 계산**(Omnichannel.php:394 `time()-900` · ChannelSync.php:6136-6153 stale 600s) — ★**저장이 아니라 조회 시 산출** | `LEGACY_ADAPTER`(부분) |
| 10 | released at | 부재 · 인접 = `status` 되돌림(JourneyBuilder.php:414-415 `release` · `claim_id=NULL` Omnichannel.php:396) — **시각 미기록** | `LEGACY_ADAPTER`(부분) |
| 11 | status | 부재(락 상태) · 현행은 **대상 행의 `status` 가 락 상태를 겸함**(`'queued'`→`'processing'`) | `LEGACY_ADAPTER` |
| 12 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 12 / 12 전사.** 커버리지 = 부재 6 · 어댑터 6.

## 3. 원문 요구 문장 전사

> **"Database Row Lock만으로 분산 Worker 동시성을 해결할 수 없는 경우 Distributed Lock 또는 Optimistic Concurrency와 Fencing Token을 사용하라."**

**★이 문장이 §54 의 판정을 가른다.** 원문은 **조건절**로 요구한다 — *"Row Lock 만으로 해결할 수 없는 경우"*. 현행은 **Row Lock(조건부 UPDATE CAS)으로 실제 해결하고 있다**(4곳 확립 · `Omnichannel::claimBatch` 는 SKIP LOCKED + stale 회수 + 폴백까지 완비). → **분산락/Fencing Token 은 조건 미충족 시 요구되지 않는다.** 이를 무조건 요구로 읽고 도입하면 **SQLite 폴백 제약 위반 + 정본 재구현**이다.

🔴 **단, "해결할 수 없는 경우"가 실재한다** — 정직하게 기록한다:
- **heartbeat 부재** → lease TTL(900s)보다 긴 승인 Task 는 **중복 집힘**. 승인은 **사람이 며칠 걸린다** → 발송 워커(초 단위)의 TTL 모델이 승인 도메인에 그대로 통하지 않는다.
- **fencing 부재** → 만료 후 되살아난 워커가 **부수효과 재발생**. 발송은 §53 멱등 마커가 막지만, **승인 집행(예산 증액 등)은 마커 없이 막지 못한다**.
→ **이 두 창은 §54 가 Row Lock 만으로 못 닫는다.** 해법 선택(분산락 vs Optimistic+Fencing)은 **SQLite 제약과 충돌**하므로 **이 단계에서 결정하지 않는다** → `CONTRACT_ONLY`. 지어내지 않는다.

## 4. 규칙

- ✅ **채택 강제 = 조건부 UPDATE + rowCount CAS**(설계 결론 5 · 4곳 확립). **참조 구현 = `Omnichannel::claimBatch`**(Omnichannel.php:394-423). 3단 구조를 그대로 승계하라: **① stale lease 회수 → ② `FOR UPDATE SKIP LOCKED` + claim_id → ③ 조건부 UPDATE 폴백**.
- 🔴 **`claimConditional`(:427-447) 폴백을 빠뜨리지 마라.** SQLite 폴백 호환이 **명시적 설계 제약**이다. `FOR UPDATE SKIP LOCKED` 단독 구현은 **SQLite 환경에서 무음 실패**한다. 실측이 이미 2단 폴백까지 내려간다(일부 SQLite 빌드가 `UPDATE..IN(subquery+LIMIT)` 거부).
- 🔴 **분산락·`GET_LOCK` 도입 금지(현 단계).** grep 0 은 **부재가 아니라 선택**이다 — `GET_LOCK` 은 MySQL 전용이라 **SQLite 폴백에서 즉시 붕괴**한다. 도입하려면 **SQLite 폴백 포기**라는 상위 결정이 선행돼야 하며, 이는 5-3-2 의 권한 밖이다.
- 🔴 **lease TTL 2값 병존(900s/600s) 통일 필요** — 신설 시 임의의 3번째 값을 만들지 마라. **승인 도메인은 사람 시간 척도**이므로 두 값 모두 부적합할 수 있다 → **TTL 값은 근거와 함께 결정하고, 근거 없이 베끼지 마라**(임의 숫자 금지).
- 🔴 **`claim_id` 를 fencing token 이라 부르지 마라.** 단조 증가·stale 거부가 없다. 이름을 빌려 쓰면 **없는 방어가 있다고 믿게 된다**(가짜 녹색).
- 🔴 **`expires at`·`released at` 을 산출값으로 두지 마라.** 현행은 **조회 시 `time()-900` 으로 산출**(Omnichannel.php:394)하고 해제 시각은 **아예 기록 안 한다**(`claim_id=NULL`). 원문은 **저장 필드**를 요구한다 — 감사(`evidence`)가 불가능하기 때문이다.
- ⚠️ **`flock`(stock_sync_cron.php:54)을 락 모델로 확장 금지.** 단일 호스트 프로세스 중복 방지 전용이며 **분산 워커에 무효**다.
- 🔴 **§54 와 §53 을 하나로 합치지 마라.** Lock 은 **동시 진입**을, Idempotency 는 **부수효과 중복**을 막는다. 실측 자인(JourneyBuilder.php:672): *"claim 만으로는 이 창을 막지 못한다."*
