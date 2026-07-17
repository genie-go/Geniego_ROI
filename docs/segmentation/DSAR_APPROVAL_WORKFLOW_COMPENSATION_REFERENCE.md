# DSAR — Compensation Hook / Compensation Reference (§52)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §52 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Compensation | **`compensation` backend/src grep 0** | `NOT_APPLICABLE` |
| 역분개(보상) 선례 | **OrderHub 수동취소 역분개**(268차) — OrderHub.php:495(수동 활성→취소/반품 전이 시 자동 폴링/웹훅과 **대칭 부수효과**: CRM LTV 역분개·채널/물리재고 복원) · :1041-1050 | `LEGACY_ADAPTER`(선례 인용) |
| 보상 멱등 선례 | OrderHub.php:1043 실측 — *"order_id 멱등이라 이후 채널 폴링 recordCrmRefund 와 중복돼도 이중역분개 없음"* | `LEGACY_ADAPTER`(★가장 정합한 선례) |
| 과다보상 방지 선례 | OrderHub.php:1050 — 부분클레임 과다역분개 수정(실환불액 기준 · 원주문 상한) | `LEGACY_ADAPTER` |
| 보상 순서(order) | **부재** — 순서 개념 grep 0 | `NOT_APPLICABLE` |
| 보상 작업 정의 | **부재** — Task 정의 테이블 자체 없음(설계 결론 2) | `NOT_APPLICABLE` |
| 보상의 승인 요구 | **부재** — 보상이 승인을 요구하는 경로 없음 | `NOT_APPLICABLE` |
| CRM LTV 역분개 | 263차 확립(취소/반품 역분개) | `LEGACY_ADAPTER` |

**★축 주의 — "역분개"는 회계 도메인, "Compensation"은 워크플로 도메인이다.** OrderHub 역분개는 **주문 취소 시 파생 집계를 되돌리는 것**이고, §52 는 **워크플로 Task 가 만든 부수효과를 별도 보상 Task 로 되돌리는 계약**이다. 도메인이 다르므로 **커버로 계산하면 역산** → `NOT_APPLICABLE` 유지. 단 **보상 규율(멱등·상한·대칭)의 선례로는 인용 가능**하며, 레포에서 실제로 검증된 유일한 보상 구현이다.

**★두 번째 축 주의 — 원문이 스코프를 명시적으로 좁혔다.** 실측: *"이번 단계에서는 Compensation 실행 Contract와 Reference를 구축한다. 상세 Financial Reversal은 각 Domain 정책으로 처리한다."* → **§52 는 `CONTRACT_ONLY` 가 정답이다.** 여기서 Financial Reversal 로직을 구현하면 **스코프 위반이자 OrderHub 역분개와의 중복 구현**이다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 11개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | compensation_reference_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow instance | 부재 — 인스턴스 테이블 grep 0 | `NOT_APPLICABLE` |
| 3 | source task | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 4 | source execution | 부재 — **실행 인스턴스 ≠ Task 정의**(같은 Task 가 여러 번 실행되면 보상 대상은 실행 단위) | `NOT_APPLICABLE` |
| 5 | compensation task definition | 부재 · §12 #23 `COMPENSATION_REFERENCE` 와 짝 | `NOT_APPLICABLE` |
| 6 | compensation order | 부재 — 순서 개념 grep 0 | `NOT_APPLICABLE` |
| 7 | compensation condition | 부재 · 인접 전이 가드 4곳(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `LEGACY_ADAPTER` |
| 8 | approval requirement reference | 부재 — **보상 자체가 승인을 요구할 수 있다**는 축 · 현행 정족수는 코드 리터럴(Mapping INSERT `2` :209) | `NOT_APPLICABLE` |
| 9 | idempotency policy | 부재 · 인접 = OrderHub `order_id` 멱등(:1043) · `claimSendOnce`(JourneyBuilder.php:672) · §53 과 짝 | `LEGACY_ADAPTER` |
| 10 | status | 부재(승인) · 전이 규칙 선언 0 | `NOT_APPLICABLE` |
| 11 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 11 / 11 전사.** 커버리지 = 부재 9 · 어댑터 2.

## 2. 원문 요구 문장 전사

> **"Compensation은 원본 Event 삭제가 아니라 별도 보상 작업으로 처리한다."**
> **"이번 단계에서는 Compensation 실행 Contract와 Reference를 구축한다. 상세 Financial Reversal은 각 Domain 정책으로 처리한다."**

## 3. 규칙

- 🔴 **원본 삭제 금지 — 원문 명시.** 보상은 **추가 기록**이지 **되돌리기(UPDATE/DELETE)**가 아니다. 원본 Event 를 지우면 감사 추적이 끊기고, §51 취소가 "일어나지 않은 일"이 된다.
- 🔴 **스코프 위반 금지.** §52 는 **Contract + Reference 까지**다. Financial Reversal 상세를 여기서 구현하면 **OrderHub 역분개(268차)와 중복 구현**이며 정본 재구현 금지 위반이다. → **§52 판정 = `CONTRACT_ONLY`**, 실 보상 로직은 각 Domain 정책에 위임.
- ✅ **`idempotency policy` 의 참조 선례 = OrderHub `order_id` 자연키 멱등**(OrderHub.php:1043). **보상은 반드시 멱등이어야 한다** — 보상이 두 번 돌면 **이중역분개**(과다 보상)다. OrderHub 가 이 함정을 이미 밟고 고쳤다(:1050 부분클레임 과다역분개 수정 · **실환불액 기준 · 원주문 상한**). 🔴 **상한 없는 보상 금지.**
- ✅ **`compensation order` 는 역순(LIFO)이 기본**이나 **원문에 순서 규칙 명시 없음** — 지어내지 마라. 원문 항목은 `compensation order` **필드의 존재**까지이며, **정렬 규칙은 이 단계에서 미정의**다.
- 🔴 **`source task` 와 `source execution` 을 하나로 합치지 마라.** 원문이 **두 개의 별도 필드**로 요구했다. 같은 Task 가 재시도/replay 로 여러 번 실행되면 **보상 대상은 실행 단위**이며, Task 단위로 보상하면 **어느 실행을 되돌렸는지 불명**해진다.
- 🔴 **`approval requirement reference` 를 장식으로 두지 마라.** 보상이 승인을 요구하는데 그 요구가 강제되지 않으면 `action_request` 의 전철(`required_approvals:2` 응답하나 `decideAction` 은 1명에 approved = **계약 위반이 이미 존재**)을 밟는다.
- `compensation condition` 은 전이 가드 4곳의 규율을 재사용하되 **`Catalog::approveQueue`:2341**(승인 도메인 인접)을 참조하라. 🔴 `Alerting::executeAction`(Alerting.php:601-660) **참조 금지** — `:612` status 죽은 읽기로 `rejected` 도 실집행(현재 `VACUOUS`, 생산자 배선 시 즉시 활성).
- ⚠️ **보상 실패 = 조용한 유실 금지.** 현행 DLQ 테이블은 **`ad_delivery_dlq` 1개뿐**(나머지는 원 테이블 `status='failed'` 잔류)이다. 보상 실패는 **돈이 되돌아가지 않은 상태**이므로 **반드시 DLQ + 알림**(`Alerting::pushEvent` 재사용 · 설계 결론 6)으로 승격하라. 재시도 백오프는 **`AdAdapters:1221` 공식 채택**(`600*2^n` · maxAttempts 5 · 86400s 캡 · 설계 결론 5).

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
