# DSAR — System·Service Task (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §27 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 실 액추에이터 | `AdAdapters::pause`(Alerting.php:631 호출)·`AdAdapters::updateBudget`(:634) — 자격증명 게이트·감사로그 내장 | `LEGACY_ADAPTER`(집행 위임 · 신설 금지) |
| ★Kill Switch | `AdAdapters::executionEnabled`(AdAdapters.php:**34-40**) — `AD_EXECUTION_DISABLED=1` 긴급 차단 · `AD_EXECUTION_ENABLED=0` 명시적 비활성 · **호출부 9곳 실배선 REAL** | `VALIDATED_LEGACY`(**재사용 강제**) |
| Retry/DLQ | `AdAdapters::retryDeliveryDlq`(:1187-1228 · maxAttempts 5 · `600*2^n` **86400s 캡** :1221) · DLQ 테이블 = `ad_delivery_dlq`(:1127) **1개뿐** | `VALIDATED_LEGACY`(확장) |
| 백오프 공식 | **3공식 병존** — AdAdapters:1221(`600*2^n`) · OpenPlatform:466-471(`min(60,2^n)`분) · Omnichannel:365(attempts<3 · **백오프 없음**) | 신설분 = **AdAdapters:1221 채택 권고** |
| `idempotency_key` | **backend/src grep 0** | `NOT_APPLICABLE`(5-3-2가 채울 결번) |
| `trace_id`·`input_hash`·`output_hash`·`worker_identity`·`circuit_breaker` | **backend/src grep 0** | `NOT_APPLICABLE` |
| `correlation_id` | **6건 존재하나 전부 Walmart 벤더 요청 헤더**(`WM_QOS.CORRELATION_ID` ChannelSync.php:1705,1709,2874,2878,3467,3471) — 내부 상관 체계 아님 | `NOT_APPLICABLE`(이름 일치 ≠ 능력) |
| 🔴 `Alerting::executeAction` | Alerting.php:**601-660** — **`:612` 가 `status` 를 SELECT 하고 어디서도 판독하지 않음(죽은 읽기)** → `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행** | 🔴 **참조 구현 금지** · 현재 `VACUOUS` |

**★축 주의 — §27의 최대 함정은 "이미 집행 코드가 있다"는 착시다.** `Alerting::executeAction`(:601-660)은 실 액추에이터를 호출하고 결과에 따라 정직하게 상태를 기록하는 **잘 만들어진 Service Task처럼 보인다**(287차 가짜집행 수정의 산물). 그러나 **:612에서 `status` 를 조회해 놓고 단 한 번도 검사하지 않는다** — 승인 여부와 무관하게 집행된다. 🔴 **이것을 System·Service Task의 참조 구현으로 삼으면 §27 `Service Account Authorization` 이 설계 단계에서 증발한다.** 현재는 `INSERT INTO action_request` **grep 0 = 생산자 전무 = VACUOUS** 라 무해하나, **5-3-2가 생산자를 배선하는 순간 즉시 활성 결함**이 된다. 재사용 대상은 **`:620-650` 의 액추에이터 디스패치 배선뿐**이고, **상태 게이트는 §23의 `Mapping.php:245-290` 5단 규율에서 가져와야 한다.**

## 1. 원문 전사 + 판정 — System·Service Task 적용 항목 **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Idempotency Key | `idempotency_key` **grep 0** · 현행 최근접 = `claimSendOnce(enrollment_id,node_id)` 자연키 선점 마커(JourneyBuilder.php:672) · `raw_vendor_event.uq_rve_dedup` UNIQUE(Db.php:1017-1034) | `NOT_APPLICABLE`(결번 · 아래 규칙 참조) |
| 2 | Execution Attempt | `attempts` 존재(AdAdapters:1187-1228 · Omnichannel:365) — **단 defer≠실패 규율 준수**(Omnichannel:349,362 quiet_hours/sto_defer는 attempts 미증가) | `VALIDATED_LEGACY`(확장) |
| 3 | Worker Identity | `worker_identity` grep 0 · 인접 = `omni_outbox.claim_id`(Omnichannel.php:410) = **워커 UUID 선점 마커** | `LEGACY_ADAPTER` |
| 4 | Service Account Authorization | **부재** · 🔴 `Alerting::executeAction:612` 죽은 읽기 = **인가 없이 집행** · 🟠 `actor_type` 부재로 API 키가 사람과 동등 계수 | `NOT_APPLICABLE` |
| 5 | Tenant Context | 실배선 — `executeAction` 테넌트 소유 검증(:606 `tenantOf` · :612/:653 `WHERE ... AND tenant_id=?` 208차 IDOR 수정) | `VALIDATED_LEGACY` |
| 6 | Environment Context | 부재(집행 컨텍스트) · 인접 = `Db::envLabel()`(278차) | `NOT_APPLICABLE` |
| 7 | Input Hash | `input_hash` grep 0 | `NOT_APPLICABLE` |
| 8 | Output Hash | `output_hash` grep 0 | `NOT_APPLICABLE` |
| 9 | Retry Policy | `retryDeliveryDlq`(:1187-1228 · maxAttempts 5) · **honest pending**(ChannelSync:6173·Catalog:1712 어댑터 부재 시 재시도 미소모) | `VALIDATED_LEGACY`(확장) |
| 10 | Timeout | 부재(집행 단위 선언) · ⚠️285차 실측 = 외부 API 40s 타임아웃이 장애 유발 경로였음 | `NOT_APPLICABLE` |
| 11 | Circuit Breaker Reference | `circuit_breaker` **grep 0** · 인접 = Kill Switch `AdAdapters::executionEnabled`(:34-40) — **전역 차단이지 회로 차단기 아님**(실패율 기반 자동 개방 없음) | `KEEP_SEPARATE_WITH_REASON` |
| 12 | Dead Letter Policy | `ad_delivery_dlq`(AdAdapters.php:1127) **유일 DLQ** · 나머지 큐는 원 테이블 `status='failed'` 잔류 | `VALIDATED_LEGACY`(확장) |
| 13 | Trace ID | `trace_id` **grep 0** | `NOT_APPLICABLE` |
| 14 | Correlation ID | 내부 체계 **부재** — 6건 전부 Walmart 벤더 헤더(ChannelSync.php:1705 외) | `NOT_APPLICABLE` |
| 15 | Execution Evidence | 부재(구조화) · 인접 = `Alerting::audit`(:655 `result` 포함) — 감사로그이지 Evidence 엔티티 아님 | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = 부재 8 · 현행충족/확장 4 · 어댑터 2 · 별도유지 1.

## 2. 원문 전사 + 판정 — System·Service Task 예 **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Approval Requirement 생성 | 부재 — 정족수는 INSERT 리터럴 `2`(Mapping.php:209) | `NOT_APPLICABLE` |
| 2 | Actor Authorization 검증 | `Mapping::actorId` fail-closed(:246-250) | `VALIDATED_LEGACY`(추출) |
| 3 | Resource Snapshot 생성 | 부재 | `NOT_APPLICABLE` |
| 4 | Budget 확인 | 인접 = 배정예산 소진 감지(AutoCampaign.php:883) — **캠페인 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | Funding 확인 | 부재 | `NOT_APPLICABLE` |
| 6 | ERP Document 조회 | 부재 | `NOT_APPLICABLE` |
| 7 | Provider 상태 확인 | 인접 = 어댑터 자격증명 게이트(`no_credentials` AdAdapters.php:38 주석) | `LEGACY_ADAPTER` |
| 8 | Notification 발송 | `Alerting::pushEvent`(Alerting.php:917) **완비 · 신설 금지**(§29) | `VALIDATED_LEGACY`(배선만) |
| 9 | Approval Execution Binding 생성 | **부재** — 승인↔집행 결속 없음. 🔴 그 부재가 곧 `executeAction:612` 죽은 읽기의 근본 원인 | `NOT_APPLICABLE` |
| 10 | Reconciliation 실행 | 부재(승인) · 인접 = 정산 도메인 | `KEEP_SEPARATE_WITH_REASON` |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재 5 · 현행충족 2 · 어댑터 1 · 별도유지 2.
※ 원문 §27 두 목록은 **`Execution Evidence`(적용 15번) / `Reconciliation 실행`(예 10번)으로 끝난다** — 소문자 `evidence` 종결 관례를 투사하지 않았다.

## 3. 규칙

- 🔴 **`Alerting::executeAction`(:601-660)을 참조 구현으로 삼지 마라.** `:612` 죽은 읽기 = **승인 우회**. 재사용 가능한 것은 **`:620-650` 액추에이터 디스패치 배선뿐**이며, 상태 게이트는 **§23 `Mapping.php:245-290` 5단 규율에서 가져온다**. 🔴 **5-3-2가 `action_request` 생산자를 배선하면 이 결함이 즉시 활성화된다** — 배선 전 `:612` 판독 결선이 **선결 조건**이다(수정 자체는 별도 승인 세션).
- 🔴 **Kill Switch 신설 금지 — `AdAdapters::executionEnabled`(:34-40) 재사용 강제.** 호출부 9곳 실배선 REAL. ※오탐 주의: `pause()` 킬스위치 면제는 **279차 D-P1 의도된 설계**(킬스위치는 지출을 늘리는 방향만 차단) — 재플래그 금지. ※`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치** — 주석만 읽고 판정 금지.
- 🔴 **액추에이터 신설 금지** — 실집행은 `AdAdapters` 에 위임(자격증명 게이트·감사로그 내장).
- **Idempotency Key(1번) = 5-3-2가 채울 결번.** 현행 3패턴 중 **`claimSendOnce` 자연키 선점 마커**(JourneyBuilder.php:672)가 승인 결정에 가장 정합하다 — UUID 전달식 멱등키보다 **자연키 UNIQUE 선점**이 SQLite 폴백 제약과도 맞는다.
- **Retry는 `AdAdapters:1221` 공식(`600*2^n`, 86400s 캡)을 채택하라** — 3공식 병존을 4공식으로 늘리지 마라. **defer≠실패**(attempts 미증가)와 **honest pending**(어댑터 부재 시 재시도 미소모) 규율을 함께 승계하라.
- **Circuit Breaker(11번)를 Kill Switch로 대체 계산하지 마라** — 전역 스위치는 실패율 기반 자동 개방이 아니다. 형태 유사에 의한 커버 계산 = 역산.
- **Correlation ID(14번)에 Walmart 헤더를 매핑하지 마라** — 이름만 같고 능력이 다르다.
