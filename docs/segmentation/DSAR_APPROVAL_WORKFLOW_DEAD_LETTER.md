# DSAR — Workflow Dead Letter (§48)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §48 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★**DLQ 테이블 = 레포 전체에 `ad_delivery_dlq` 1개뿐** | AdAdapters.php:1127(`ensureDlqTable` :1189) — 잡/큐 REAL 7종 중 **유일** | `VALIDATED_LEGACY`(유일 선례) |
| 나머지 6경로의 "죽은 메시지" | **원 테이블 `status='failed'` 잔류** — `webhook_delivery`(OpenPlatform:465) · `omni_outbox`(Omnichannel:373) · `catalog_writeback_job` · `channel_shipment_job` · `catalog_sync_job` · `raw_vendor_event` | `NOT_APPLICABLE`(DLQ 부재) |
| DLQ 재처리 러너 | `AdAdapters::retryDeliveryDlq`(:1187-1228) — cron · `status='pending' AND next_retry_at <= now`(:1193) · 지수 백오프(:1221) · `maxAttempts 5` 초과 → `failed`(:1220) | `VALIDATED_LEGACY` |
| ↳ 성공 시 | :1217 `status='done'` · 회수분 writeback(:1207) · ★**킬스위치+결제수단 게이트 재확인**(:1213 `executionEnabled()` + `BillingMethod::hasActiveMethod()`) 후 활성화(:1214) | ★**재사용 강제** |
| ↳ 종착 | `status='failed'` — 🔴 **그 이후가 없다**(다음 행동·담당자·리플레이 개념 0) | `NOT_APPLICABLE` |
| `next action`(8종 분기) | **grep 0** — DLQ 종착 후 행동 선택지 전무 | `NOT_APPLICABLE` |
| `assigned operator` | **grep 0** — DLQ 담당자 배정 개념 0 | `NOT_APPLICABLE` |
| `replay allowed 여부` | **grep 0** — 리플레이 허용 게이트 0(재시도는 무조건 자동) | `NOT_APPLICABLE` |
| DLQ 진입 통지 | **부재** · 인접 = `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497) = **완비** | `LEGACY_ADAPTER`(배선만) |
| `payload hash` | **부재** — `settings_json` 원문 저장(AdAdapters:1199) | `NOT_APPLICABLE` |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — "DLQ가 하나 있다"는 커버가 아니라 결함의 실측이다.** `ad_delivery_dlq`는 **광고 소재 배달(delivery) 전용**이며 승인 도메인이 아니다. 나머지 6개 잡/큐는 **DLQ 자체가 없어** 실패가 원 테이블에 `status='failed'`로 **영원히 잔류**한다 — 아무도 읽지 않고, 아무도 재처리하지 않고, 아무도 통지받지 않는다. 이를 "DLQ 인프라 있음"으로 계산하면 **역산**이다.

**★두 번째 함정 — 현행 DLQ의 종착은 `failed`이고 그 다음이 없다.** `retryDeliveryDlq`는 5회 초과 시 `status='failed'`(:1220)로 바꾸고 **끝난다**. 원문 §48이 요구하는 것은 정확히 **"그 다음"** 이다(`next action` 8종 · `assigned operator` · `replay allowed`). 즉 현행 DLQ는 **"재시도 큐"이지 "Dead Letter 관리 체계"가 아니다**. 재시도 러너의 존재를 §48 커버로 세지 마라 → **재시도 기전만 `VALIDATED_LEGACY`, 관리 축은 전부 `NOT_APPLICABLE`.**

**★세 번째 함정 — DLQ 진입이 조용하다.** `failed` 전환(:1220)에 **통지가 없다**. 승인 집행이 DLQ로 떨어져 죽어도 **아무도 모른다** — 282차 "알림 통지 죽음"과 동형이다. 원문 `assigned operator`가 있는 이유다.

## 1. 원문 전사 + 판정 — Next Action **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MANUAL_REVIEW | **부재** — DLQ `failed` 행을 사람에게 올리는 경로 0(조회 UI·담당자 배정 전무) | `NOT_APPLICABLE` |
| 2 | REPLAY | **부재**(수동 리플레이) · 인접 = `retryDeliveryDlq`(:1187) = **자동 재시도**, 사람이 고른 리플레이가 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 3 | RETRY_AFTER_FIX | **부재** — 수정 후 재시도 개념 0 · 🔴 `failed` 전환(:1220) 후 `pending` 복귀 경로 **없음**(:1193 이 `status='pending'`만 조회 → **`failed`는 영구 종착**) | `NOT_APPLICABLE` |
| 4 | CANCEL_INSTANCE | **부재** | `NOT_APPLICABLE` |
| 5 | MIGRATE_INSTANCE | **부재** — 인스턴스 마이그레이션 개념 0 | `NOT_APPLICABLE` |
| 6 | COMPENSATE_REFERENCE | **부재** · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) — 승인 도메인 아님 · **참조 유형**(중복 정의 금지) | `NOT_APPLICABLE` |
| 7 | IGNORE_WITH_REASON | **부재** — 사유 기록 무시 경로 0 · 인접 원리 = `skipped`+사유 문자열(Omnichannel:348,:355,:369) — **DLQ 축 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 8 | BLOCK | **부재** | `NOT_APPLICABLE` |

**실측 개수: 8 / 8 전사.** 커버리지 = 부재 6 · 형태유사·도메인 상이(매핑 금지) 2. **원문 Next Action을 충족하는 현행 = 0.**

## 1-2. 원문 전사 + 판정 — 필수 필드 **원문 16개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | dead_letter_id | 부재(승인) · 인접 = `ad_delivery_dlq.id`(AdAdapters:1217 `WHERE id=?`) — 광고 배달 전용 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | workflow instance | **부재** · 인접 = `ad_delivery_dlq.campaign_id`(:1200,:1207,:1211) — 캠페인이지 워크플로 인스턴스 아님 | `NOT_APPLICABLE` |
| 3 | execution | **부재** — 실행 회차 개념 0 | `NOT_APPLICABLE` |
| 4 | task | **부재** — Task 엔티티 전무 | `NOT_APPLICABLE` |
| 5 | message or event reference | **부재** · 인접 = `camp_ext_id`/`design_id`(:1200) — 도메인 식별자 | `NOT_APPLICABLE` |
| 6 | failure reference | **부재** — §47 실패 엔티티 자체가 부재 · 인접 = `last_error` **인라인 문자열**(:1223-1224 · 500자 절단) | `NOT_APPLICABLE` |
| 7 | payload reference | 부재(참조) · 인접 = `settings_json` **인라인 저장**(:1199 `json_decode((string)($row['settings_json'] ?? '[]'))`) | `LEGACY_ADAPTER` |
| 8 | payload hash | **부재** — 해시 0 | `NOT_APPLICABLE` |
| 9 | failed attempts | 존재 = `ad_delivery_dlq.attempts`(:1202 `(int)$row['attempts'] + 1` · :1220 `>= $maxAttempts`) | `VALIDATED_LEGACY` |
| 10 | first failed at | **부재** — 최초 실패 시각 미보존(`updated_at`이 **덮어써짐** :1223-1224) | `NOT_APPLICABLE` |
| 11 | last failed at | 부재(전용) · 인접 = `updated_at`(:1223-1224) — 성공 시에도 갱신(:1217) → **실패 시각 전용 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | next action | **부재**(grep 0) — 위 8종 대조 참조 | `NOT_APPLICABLE` |
| 13 | assigned operator | **부재**(grep 0) — DLQ 진입 통지조차 없음 | `NOT_APPLICABLE` |
| 14 | replay allowed 여부 | **부재** — 재시도는 무조건 자동(:1193). 허용 게이트 0 | `NOT_APPLICABLE` |
| 15 | status | 존재(형태) = `pending`/`done`/`failed`(:1193,:1217,:1220) — 🔴 **3값뿐이고 `failed`는 영구 종착**. 원문 DLQ 관리 status 축 미달 · 전이 규칙 선언 0 | `NOT_APPLICABLE` |
| 16 | evidence | **부재** · 인접 = `last_error` 500자 절단(:1223-1224) — **잘린 문자열은 증거가 아니다** | `LEGACY_ADAPTER` |

**실측 개수: 16 / 16 전사**(목록 끝 `evidence` 포함 — 누락 없음). 커버리지 = 부재 10 · 어댑터 2 · 검증된 선례 1 · 도메인 상이 3.

## 2. 규칙

- ✅ **DLQ 재시도 기전 = 신설 금지·`ad_delivery_dlq` 패턴 재사용** — cron + `status='pending' AND next_retry_at <= now`(:1193) + `min(86400, 600*2^n)`(:1221) + `maxAttempts 5`(:1187). **레포 유일 DLQ 선례**이므로 여기서 갈라지면 두 번째 DLQ 방언이 된다(§46 백오프 3공식 병존의 재현).
- ✅ **★킬스위치·결제수단 게이트 재확인 강제.** AdAdapters:1213 이 **재시도 성공 경로에서** `executionEnabled()` + `BillingMethod::hasActiveMethod()` 를 **다시 확인**하는 것이 정본이다. 승인 DLQ 리플레이는 **최초 승인 시점의 게이트 통과를 재사용하지 마라** — DLQ 체류 중 승인이 철회·만료·킬스위치 발동됐을 수 있다. **리플레이 = 재승인 검증**.
- 🔴 **★`replay allowed 여부` 없이 자동 리플레이 금지.** 현행 DLQ는 **무조건 자동 재시도**(:1193)다. 승인 집행(리베이트·예산)은 **외부 Idempotency 확인 수단이 없으므로**(`idempotency_key` grep 0) 자동 리플레이 = **중복 집행**이다(§46 원문: "Financial Execution Task는 외부 시스템 Idempotency 확인 없이 무조건 Retry하지 마라"). **`replay allowed`는 기본 false(fail-closed)**.
- 🔴 **`failed` 영구 종착 상속 금지.** 현행 `failed`(:1220)는 **다음이 없다** — `:1193`이 `pending`만 조회하므로 `failed`는 **되살아날 수 없다**. 원문 `RETRY_AFTER_FIX`·`REPLAY`가 성립하려면 **`failed` → 재처리 가능 상태로의 전이 경로가 신설**되어야 한다. "재시도 러너가 있으니 리플레이 있음"은 역산이다.
- ✅ **DLQ 진입 통지 = 신설 금지·배선만** — `Alerting::pushEvent` + `notification_channel` SSOT(:911 `min_severity`) + 폴백 체인(:471-497) 재사용. 🔴 **현행 `failed` 전환에 통지가 없다** — 승인 집행이 조용히 죽는다. ⚠️282차 트랩: 정책은 `slack.enabled`만 보고 URL은 다른 테이블 → **무발송**. 실발송 검증 필수.
- ✅ **`first failed at`·`last failed at` 2필드 분리 신설** — 현행 `updated_at`(:1223-1224)은 **성공 시에도 덮어써서**(:1217) 최초 실패 시각이 **소실**된다. 합치면 체류 기간(DLQ age) 산출 불가.
- ✅ **`payload hash` 결번 신설** — 현행 `settings_json` 원문 저장(:1199)만 있고 해시가 없다. 리플레이 시 **원본 변조 탐지**가 불가능하다. 원문 보존은 유지(무후퇴).
- 🔴 **`COMPENSATE_REFERENCE` 는 참조 유형** — 보상(§ 해당 정의)을 **참조만** 하고 **중복 정의 금지**.
- 🔴 **테넌트 스코프 필수.** `ad_delivery_dlq`는 `tenant_id`를 갖지만(:1198 `(string)$row['tenant_id']`), `paddle_events`는 **tenant_id 없이** 만들어졌다(Paddle.php:99-108). 승인 DLQ는 **tenant_id 필수 + 조회/리플레이 시 tenant 검증** — `admin_growth_approval`이 **tenant_id 없이 전역 조회**되고 결정 경로도 격리가 없는(`:1324 WHERE id=?`) 전례를 반복하지 마라.
- 🔴 **Next Action 8종 전부 부재 — "있다고 가정"하고 배선 금지.**

---

## ★정정 — 통지 인프라 재사용 판정 (289차 9회차 · PM 직접 실측)

> **본 절은 상위 본문의 "통지 = 신설 금지·배선만" 판정을 정정한다.** 초판은 전사자 공통 규율 파일의 **`Alerting::dispatch` 재사용**을 인용했으나, 그 이름은 **실재하지 않는다**.

**① 팬텀 이름의 출처** — `function dispatch(` **grep 0**. `Alerting.php:472-474` **주석**에 *"종전 dispatch 는 …"* 로 남은 **역사적 명칭**(282차 수정으로 소멸)이며, 규율 파일이 이를 실 메서드로 오인해 인용했다. CLAUDE.md 기지 트랩(`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**)과 **동형**이다. → **주석을 API 근거로 삼지 마라.**

**② 실 진입점과 가시성** — `Alerting::pushEvent`(**:917**)만이 `public`이다. 폴백 체인(:471-497)을 품은 `dispatchNotifications`(**:445**)·`sendSlack`(:736)·`sendEmail`(:810)·`sendWebhook`(:937)은 **전부 `private`** → 승인 노드가 직접 부를 수 없다. **가시성 승격이 선결.**

**③ `pushEvent` 는 그대로 재사용 불가** (실측 3제약)
- **반환 `void` + 예외 삼킴**(:934 `catch { error_log }`) → **발송 실패가 무음**. 승인 통지는 감사 대상이므로 **결과 반환·감사 기록이 필수**.
- **`tenant === 'demo'` → no-op**(:919) → **데모 환경에서 승인 통지 검증 불가**(배포 전 E2E 사각).
- **`notification_channel` = `tenant_id` PRIMARY KEY = 테넌트당 1행**(:911-912) · `email_to` **단일 주소** · locale 한국어 하드코딩(:927) → **승인자 개인 통지(recipient resolution) 구조적 불가**.

**④ 정정된 판정** — "배선만"은 **Channel 축에만 참**이다. §29 실측 기준 **필수 10종 현행 충족 0**.
> ∴ 정확한 판정 = **`pushEvent` 배선 + 가시성 승격 + 발송결과 반환/감사 + recipient resolution 신설**.
> 🔴 **"완비 → 배선만"으로 닫으면 분모를 Channel 축으로 갈아끼우는 역산이다.**

**⑤ 보존되는 것**(재구현 금지) — `notification_channel` SSOT(:911) · 폴백 체인(:471-497 · 282차 "알림 통지 죽음" 수정분) · `min_severity` 게이트 · `Genie\Crypto` 자격 복호(`nDec` :915). ⚠️282차 트랩: 정책은 `slack.enabled`만 보고 URL은 다른 테이블 → **무발송**. **실발송 검증 필수.**
