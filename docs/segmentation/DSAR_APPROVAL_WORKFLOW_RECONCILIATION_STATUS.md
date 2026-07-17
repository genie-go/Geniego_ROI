# DSAR — Reconciliation 상태 (§62)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §62 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 대사 상태 열거 | grep 0 — §62 26종 전부 부재 | `NOT_APPLICABLE` |
| 값 대사 4종의 상태 | `PgSettlement::reconcile`(:215) · `Connectors::roasReconciliation`(:902) · `Wms::reconcileChannelStock`(:2160) · `KrChannel`(:415-419) — **차이 리포트 반환** · 상태 열거 미선언 | `KEEP_SEPARATE_WITH_REASON` |
| 상태 열거 선언 관행 | 🔴 레포 전반에 **상태 열거를 선언하는 관행이 없음** — `status VARCHAR(20) DEFAULT 'pending'`(AdminGrowth.php:146) 처럼 **문자열 자유값** | `NOT_APPLICABLE` |
| MANUAL_REVIEW 폴백 | 부재 · 인접 = 사람 결재(`AdminGrowth::approvalDecide` :1322-1330 · **유일 경로이지 폴백 아님**) | `NOT_APPLICABLE` |
| BLOCKED 폴백 | 부재 · 인접 실자산 = `AdAdapters::executionEnabled`(:34-40 · 호출부 9곳 실배선 REAL) | `VALIDATED_LEGACY` |

**★축 주의 — §62 26종 = §61 23비교 + 3폴백.** 원문 대조 결과 §62의 상태는 §61의 비교 23종과 **1:1 대응**하고(각 비교의 불일치 상태), 여기에 `MATCH`·`MANUAL_REVIEW`·`BLOCKED` 3종이 더해져 26이다. **이 대응은 원문 구조에서 도출한 것이지 개수를 맞추려 배분한 것이 아니다** — 아래 표에 §61 대응 번호를 병기해 검증 가능하게 남긴다.

**★축 주의 2 — 상태를 선언해도 정본이 없으면 무의미.** §62는 대사 **결과**의 어휘다. 그러나 §61에서 확인했듯 비교의 오른쪽 변(Canonical State)이 §63에서 선언돼 있지 않다. **정본 없는 대사는 26종 중 `MATCH` 하나만 영원히 반환한다.** 상태 열거 신설이 대사를 작동시키는 것이 아니다.

## 1. 원문 전사 + 판정 — **원문 26종**

| # | 원문 항목명 | §61 대응 | 현행 대조 | 판정 |
|---|---|---|---|---|
| 1 | MATCH | (일치) | 부재 — 🔴 **정본 부재 시 이것만 반환되는 가짜녹색 위험** | `NOT_APPLICABLE` |
| 2 | CASE_INSTANCE_MISMATCH | #1 | 부재(Case·Instance 양변 부재) | `NOT_APPLICABLE` |
| 3 | DEFINITION_VERSION_MISMATCH | #2 | 부재(정의·버전 grep 0) | `NOT_APPLICABLE` |
| 4 | INSTANCE_CASE_STATUS_MISMATCH | #3 | 부재(§63 매핑 미선언) | `NOT_APPLICABLE` |
| 5 | NODE_TASK_MISMATCH | #4 | 부재(Task 개념 전무) | `NOT_APPLICABLE` |
| 6 | TOKEN_BRANCH_MISMATCH | #5 | 부재(Token 개념 전무) | `NOT_APPLICABLE` |
| 7 | TASK_PARTICIPANT_MISMATCH | #6 | 부재(배정/클레임 전무) | `NOT_APPLICABLE` |
| 8 | CLAIM_DECISION_ACTOR_MISMATCH | #7 | 부재 · 🟠 **actor_type 부재**로 `apikey:`/`user:` 동등 계수(스펙 §20 위배) | `NOT_APPLICABLE` |
| 9 | TASK_DECISION_MISMATCH | #8 | 부재 · 🔴 **현행 반례** = `action_request` 는 `required_approvals:2` 응답하나 `decideAction` 은 1명에 approved = **계약 위반 이미 존재** | `NOT_APPLICABLE` |
| 10 | TRANSITION_STATE_MISMATCH | #9 | 부재 — 🔴 전이 규칙 선언 0 | `NOT_APPLICABLE` |
| 11 | TIMER_SCHEDULER_MISMATCH | #10 | 부재 · 인접 = `resume_at`/`wait_until`(JourneyBuilder.php:80-82) vs OS cron(`journey_cron.php:29-35`) | `LEGACY_ADAPTER` |
| 12 | WAIT_SUBSCRIPTION_MISMATCH | #11 | 부재 — 🔴 이벤트 구독 기전 grep 0(오른쪽 변 부재) | `NOT_APPLICABLE` |
| 13 | CALLBACK_CORRELATION_MISMATCH | #12 | 부재 · 인접 = Paddle `notification_id` UNIQUE · 🔴 `paddle_events` tenant_id 없음(:99) | `LEGACY_ADAPTER` |
| 14 | RETRY_ATTEMPT_MISMATCH | #13 | 부재 · 인접 = `ad_delivery_dlq.attempts`(:1187-1228) | `LEGACY_ADAPTER` |
| 15 | DEAD_LETTER_EXECUTION_MISMATCH | #14 | 부재 · 인접 = **DLQ 테이블 1개뿐**(`ad_delivery_dlq`) | `LEGACY_ADAPTER` |
| 16 | CANCELLATION_TASK_MISMATCH | #15 | 부재 | `NOT_APPLICABLE` |
| 17 | PAUSE_EXECUTION_MISMATCH | #16 | 부재 · 인접 = stale 회수(`BillingMethod::reconcileStaleClaims` :551-589 · `Omnichannel::claimBatch` :394-423) | `LEGACY_ADAPTER` |
| 18 | COMPLETION_REQUIREMENT_MISMATCH | #17 | 부재 · 인접 게이트 = `AdminGrowth::launch`(:1155) | `LEGACY_ADAPTER` |
| 19 | END_REQUEST_STATUS_MISMATCH | #18 | 부재(§63 매핑 미선언) | `NOT_APPLICABLE` |
| 20 | EXECUTION_AUDIT_MISMATCH | #19 | 부재 · 인접 = `audit_log`·`journey_node_logs` | `LEGACY_ADAPTER` |
| 21 | EXTERNAL_ENGINE_MISMATCH | #20 | 부재 — 외부 엔진 없음 + 정본 미선언 = 양변 부재 | `NOT_APPLICABLE` |
| 22 | MIGRATION_VERSION_MISMATCH | #21 | 부재(§56/§57 전방호환 계약) | `NOT_APPLICABLE` |
| 23 | REPLAY_STATE_MISMATCH | #22 | 부재(§58 부재) | `NOT_APPLICABLE` |
| 24 | EXECUTION_BINDING_MISMATCH | #23 | 🔴 부재 + **현행 반례 실재** = `Alerting::executeAction` 죽은 status 읽기(:612) → `pending`/`rejected` 실집행(:631/:634) | `NOT_APPLICABLE` |
| 25 | MANUAL_REVIEW | (폴백) | 부재(폴백 축) · 현행 사람 결재는 **유일 경로이지 폴백 아님** | `NOT_APPLICABLE` |
| 26 | BLOCKED | (폴백) | 부재 · 인접 실자산 = `AdAdapters::executionEnabled`(:34-40 · 9곳 실배선) | `VALIDATED_LEGACY` |

**실측 개수: 26 / 26 전사.** 커버리지 = 부재 17 · 어댑터 8 · 확장 1.
**§61 대응 검증: 23비교 → #2~#24 로 1:1 대응 · 잔여 3종(`MATCH`·`MANUAL_REVIEW`·`BLOCKED`) = 폴백 축. 23 + 3 = 26 일치.**

## 2. 규칙

- 🔴 **`MATCH` 가 가장 위험한 상태다.** 정본(Canonical State)이 §63에서 선언되기 전에는 26종 중 `MATCH` 만 반환된다 — 대사가 "전부 정상"을 보고하는데 실은 비교를 한 적이 없는 상태. **가짜녹색의 순수형이며 289차 P1 systemic(하드실패를 `ok=>true` 로 위장)과 동형이다.**
- 🔴 **26종을 상태 컬럼 하나로 선언하고 끝내지 마라.** 레포 전반이 `status VARCHAR(20)` **자유 문자열** 관행(AdminGrowth.php:146)이라 오타가 곧 무검출이다. §62는 **열거 계약**으로 관리하라(§63의 Versioned Mapping Registry와 동일 원칙).
- 🔴 **불일치 검출 = 자동 해소 아님.** `MANUAL_REVIEW`·`BLOCKED` 로 낙하시키는 것이 기본이며, 자동 해소는 **§61 `resolution` 규율(외부 실집행 포함 · SEG-H2/H5)** 을 만족할 때만. **내부 status만 바꾸고 닫는 해소 금지.**
- **`BLOCKED` 은 `AdAdapters::executionEnabled` 재사용 강제**(신규 차단 기전 금지).
  - ⚠️ 오탐 주의: `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계** — 재플래그 금지.
- 🟠 **#8 `CLAIM_DECISION_ACTOR_MISMATCH` 는 actor_type 결번 위에서 검출 불가.** `apikey:`/`user:` 가 동등 계수되므로 **API 키 2개로 Maker-Checker 충족**이 가능하다(스펙 §20 위배). 대사가 이 불일치를 잡으려면 actor_type 분리가 선결.
- 🔴 **#9 `TASK_DECISION_MISMATCH` 와 #24 `EXECUTION_BINDING_MISMATCH` 는 이미 현행에 반례가 있다**(`action_request` 정족수 계약 위반 · `Alerting::executeAction` 승인 우회). 둘 다 **VACUOUS(생산자 0)라 아직 드러나지 않았을 뿐**이며, 생산자 배선 시 즉시 활성이다. 대사 신설 시 이 두 상태가 **첫 실검출 대상**이 되어야 한다.
- **테넌트 결번 반영**: `admin_growth_approval`(tenant_id 컬럼 없음 :142-149 · 전역 조회 :641,:1306 · `:1324 WHERE id=?`) · `paddle_events`(tenant_id 없음 :99). **대사 상태를 테넌트별로 집계하려면 백필이 선결.**
- 🔴 26종 **"있다고 가정"하고 배선 금지**.
