# DSAR — Workflow Task Definition (§22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §22 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

원문 엔티티명: `APPROVAL_WORKFLOW_TASK_DEFINITION`

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Task **정의 테이블**(`task_*`) | **grep 0** · 워크플로 정의 테이블(`workflow_*`/`flow_*`/`wf_*`) **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| Task / 배정 / 클레임(승인) 개념 | **전무** — 승인은 Task 가 아니라 **핸들러 메서드 직접 호출** | `NOT_APPLICABLE` |
| ★`Mapping::approve`(Mapping.php:238-294) | **레포 유일 REAL 승인** — 위조불가 신원 fail-closed(`Mapping::actorId` · `apikey:{id}`/`user:{email}` · 미확인 null→403) → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수. **5단 규율** | `VALIDATED_LEGACY` — **공용 추출 대상** |
| `action_request` | 정족수 **컬럼 없음** · `Alerting:562` 리터럴 `2` = 장식 · 🔴 **`INSERT INTO action_request` grep 0 = 생산자 전무 = 한 번도 채워진 적 없음** · `listActionRequests` 는 `required_approvals:2` 응답하나 `decideAction` 은 **1명에 approved** = **계약 위반 이미 존재** | `VACUOUS` — 흡수 대상(재사용 자산 아님) |
| `admin_growth_approval` | **tenant_id 없음** · 전역 조회 · 결정 경로도 격리 없음(`:1324 WHERE id=?`) · 단일결재 암묵 | 미달 — 흡수 대상 |
| `catalog_writeback_approval` | **고아**(읽는 코드 0) | 미달 — 폐기 대상 |
| 정족수 선언 | **전부 코드 상수** — Mapping INSERT 리터럴 `2`(:209) · Alerting 응답 하드코딩 `2`(:562) · AdminGrowth 단일결재 암묵 | `NOT_APPLICABLE`(정의 축 부재) |
| 실 액추에이터 | `AdAdapters::pause`(Alerting.php:631)/`updateBudget`(:634) — `Alerting::executeAction`(:620-650) **유일 실자산** | `LEGACY_ADAPTER` |
| Kill Switch | `AdAdapters::executionEnabled`(:34-40) **호출부 9곳 실배선 REAL** | `VALIDATED_LEGACY`(재사용 강제) |
| 에러 봉투 | `AdminGrowth::fail`(:181-184) `code`+`detail`+`meta` 구현 + 승인 경로 `approvalDecide` **실배선**(:1322/:1326/:1327) | `VALIDATED_LEGACY`(공용 추출·확장) |
| 멱등 | `idempotency_key` **grep 0** · 인접 = `claimSendOnce`(JourneyBuilder.php:450·:679) | `NOT_APPLICABLE`(5-3-2 결번) |

**★축 주의 — 승인 지형은 "중복 4벌"이 아니라 "1 REAL + 3 미달"이다.** 겉보기엔 승인 테이블이 4개지만, **`mapping_change_request` 만 실제로 작동**한다. `action_request` 는 **VACUOUS**(생산자 0), `admin_growth_approval` 은 **테넌트 격리 없음**, `catalog_writeback_approval` 은 **고아**다. "4벌 있으니 통합만 하면 된다"는 판단은 **미달 3벌을 자산으로 오계상하는 역산**이다.

**★축 주의 2 — 승인 정의(Definition)는 신설이 불가피하다.** 현행 4종 전부 **"누가·몇 명·어떤 순서"가 코드 상수**다(:209 리터럴 `2` · :562 하드코딩 `2` · AdminGrowth 암묵). **정의 테이블·step·조건부 라우팅·역할 바인딩 전부 부재** → §22는 **레포에 대응물이 없는 진짜 결번**이다. 단 **정족수 판정 로직은 신설이 아니라 `Mapping` 에서 위치 이동**(설계 결론 3).

**★축 주의 3 — JourneyBuilder 는 Task 축에서 커버가 아니라 숙주다.** JourneyBuilder(`advanceEnrollment` :498-700+ · 노드 13종 · 원자적 claim :411-418 · 순회 멱등 :672 · 순환 감지 :512 · cron 배선 REAL)는 **레포 유일 실 Flow 실행 엔진**이며 **`approval` 노드 하나만 결번**이다(grep 0 · `JourneyBuilder.php`·`JourneyBuilderConstants.js` 양쪽). 그러나 이는 **"Task 요구가 충족됐다"는 뜻이 아니라 "Task 를 태울 엔진이 있다"** 는 뜻이다. 🔴 **최대 설계 리스크**: 실행 컨텍스트가 `crm_customers`/`journey_enrollments` 이고 **`customer_id` 필수**(:554) → **비-고객 승인(예산·가격·배포)을 태우려면 enrollment 컨텍스트 일반화가 선결**이다.

## 1. 원문 전사 + 판정 — **원문 필수 필드 21종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | task_definition_id | 부재 — Task 정의 테이블 grep 0 | `NOT_APPLICABLE` |
| 2 | workflow_node_id | 부재 — 워크플로 정의 테이블 grep 0. 인접 = `journey_enrollments.current_node`(**인스턴스 위치**이지 정의 참조 아님) | `NOT_APPLICABLE` |
| 3 | task code | 부재 | `NOT_APPLICABLE` |
| 4 | task name | 부재 | `NOT_APPLICABLE` |
| 5 | task type | 부재 — §22 Task Type 17종 축은 [DSAR_APPROVAL_WORKFLOW_TASK_TYPE.md](DSAR_APPROVAL_WORKFLOW_TASK_TYPE.md) 참조 | `NOT_APPLICABLE` |
| 6 | task description | 부재 | `NOT_APPLICABLE` |
| 7 | input contract | 부재 — 노드 입력 계약 선언 0. 인접 = `journeys` `node['config']`(JourneyBuilder.php:535) **스키마 없는 자유 JSON** | `NOT_APPLICABLE` |
| 8 | output contract | 부재 · 인접 = `Alerting::executeAction` 반환(:620-650) — 계약 선언 없음 | `NOT_APPLICABLE` |
| 9 | assignment hook | 부재 — 배정 개념 전무. 🔴 현행 승인자는 **"먼저 호출한 사람"**(`Mapping::approve` 는 후보를 특정하지 않고 **호출자 신원만 검증**) | `NOT_APPLICABLE` |
| 10 | required permission | 부재(Task 단위) · 인접 = 전역 RBAC(`viewer<connector<analyst<admin` + `write:*`/`admin:keys` · index.php:60-89 미들웨어) | `LEGACY_ADAPTER`(전역 축만 · Task 바인딩 0) |
| 11 | required role type | 부재 — 🔴 **`actor_type` 부재**로 `apikey:`/`user:` 가 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배) | `NOT_APPLICABLE`(신설 · 🟠 기존 결함 동반) |
| 12 | required approval requirement | 부재(선언) · 🔴 현행 **전부 코드 상수**: Mapping INSERT 리터럴 `2`(:209) · Alerting 응답 하드코딩 `2`(:562 · **판정에 미사용 = 장식**) · AdminGrowth 단일결재 암묵. `Approvals.jsx:576` `required_approvals` = **매핑 1회 후 참조 0**(dead field) | `NOT_APPLICABLE`(정의 축 신설) |
| 13 | form reference | 부재 | `NOT_APPLICABLE` |
| 14 | evidence requirement | 부재(요구 선언) · 인접 = `journey_node_logs`(:50,:69) **사후 로그이지 사전 요구 아님** | `NOT_APPLICABLE` |
| 15 | due date hook | 부재 · 인접 = `wait_until`(:80-82·:562 · 255차 절대기한) — **마케팅 · 훅 아니라 컬럼 직접 판독** | `KEEP_SEPARATE_WITH_REASON` |
| 16 | retry policy | 부재(Task) · 인접 3공식 병존 — `AdAdapters::retryDeliveryDlq`(:1187-1228 · maxAttempts 5 · `600*2^n` **86400s 캡**) · `OpenPlatform`(:466-471 `min(60,2^n)`분) · `Omnichannel`(:365 attempts<3 · **백오프 없음**) | `VALIDATED_LEGACY` — 🔴 **AdAdapters:1221 공식 채택** |
| 17 | timeout policy | 부재 | `NOT_APPLICABLE` |
| 18 | idempotency policy | 부재(`idempotency_key` grep 0) · 인접 3패턴 → **`claimSendOnce`(:450·:679) 자연키 선점 마커가 승인 결정에 가장 정합** | `NOT_APPLICABLE`(5-3-2 결번) |
| 19 | completion policy | 부재(선언) · 인접 실규율 = `Mapping::approve` **5단**(:245-290 · 위조불가 신원 → 자기승인 차단 → dedup → 비-pending 409 → 정족수) = **완료 판정의 유일 REAL 구현** | `VALIDATED_LEGACY` — **공용 추출(위치 이동)** |
| 20 | status | 부재(Task 정의) — 🔴 **상태머신 없음**: `UPDATE ... SET status=` **155건/44파일** · **전이 규칙 선언 0** · 전이 가드 4곳뿐(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `NOT_APPLICABLE` |
| 21 | evidence | 부재 · 인접 감사로그 = `journey_node_logs`(:50,:69) · `logNode` 패턴(:541,:563) | `LEGACY_ADAPTER`(로깅 패턴 인용) |

**실측 개수: 21 / 21 전사.** 커버리지 = 부재 15 · 확장 3 · 어댑터 2 · 도메인분리 1.

## 2. 규칙

- 🔴 **4번째 승인 Foundation 신설 금지(AL-19).** 통합은 신설이 아니라 **`Mapping::approve` + `Mapping::actorId`(Mapping.php:238-294) 공용 추출 후 흡수**다.
- 🔴 **정족수·Maker-Checker 로직을 새로 작성하지 마라 — 위치만 옮겨라.** `Mapping.php:245-290` 5단 규율(**위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수**)을 **공용 트레이트/서비스로 추출**하라. **재작성하면 289차 G-01이 닫은 우회로(익명 2회 = 정족수 충족)를 다시 연다.**
- 🔴 **`EquivalenceProof` 선행 없이 통합 금지** — 286차 rank 맵 붕괴 재현 위험.
- 🔴 **`action_request` 를 재사용 자산으로 취급 금지.** `INSERT` **grep 0 = 생산자 전무 = VACUOUS**. **첫 생산자로 배선하거나 폐기 후 디스패치만 회수**하라. **현 상태 방치 = 가짜 정족수 잔존**(`required_approvals:2` 응답 ↔ `decideAction` 1명 승인 = **계약 위반 이미 존재**).
- 🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 참조 구현으로 삼지 마라.** `:612` 가 `status` 를 SELECT 하고 **어디서도 판독하지 않아** `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행**한다(287차 가짜집행 수정의 부작용). 현재 VACUOUS 이나 **생산자 배선 시 즉시 활성**. **유일 회수 가치 = 액추에이터 배선(:620-650)** 이다.
- 🟠 **`required role type` 은 `actor_type` 부재 결함과 짝이다.** 역할 타입 없이 정족수를 세면 **API 키 2개로 Maker-Checker 가 뚫린다**(스펙 §20 위배). Task 정의에 `required role type` 을 넣으면서 **`actor_type` 을 함께 도입해야 실효**가 생긴다.
- **Flow 엔진 신설 금지** → `JourneyBuilder` 에 **`approval` 노드 추가**(유일 결번) + **`wait` event-mode 재폴링 패턴(:565-570) 재사용**. 🔴 **단 enrollment 컨텍스트 일반화가 선결**(`customer_id` 필수 :554 → 비-고객 승인 불가).
- **에러 봉투 신설 금지** — `AdminGrowth::fail`(:181-184)이 `code`+`detail`+`meta` 를 구현하고 **승인 경로에 실배선**(:1322/:1326/:1327)돼 있다. ★ **"에러 코드 체계 부재"는 과장이다** — 믿었다면 **두 번째 봉투를 신설할 뻔**했다. **공용 추출·확장**.
- **Kill Switch 신설 금지** — `AdAdapters::executionEnabled`(:34-40) **호출부 9곳 실배선 REAL** 재사용 강제.
  ※ 오탐 주의(재플래그 금지): `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계**(킬스위치는 **지출을 늘리는 방향만** 차단) · `ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**.
- **재시도 = `AdAdapters::retryDeliveryDlq`(:1221) 공식으로 통일**(4번째 백오프 금지). ★ **defer≠실패**(Omnichannel:349,362) · ★ **honest pending**(ChannelSync:6173·Catalog:1712) 규율 승계.
- **동시성 = 조건부 UPDATE + rowCount CAS 로 통일.** 🔴 다른 모델 금지(optimistic lock/분산락/`GET_LOCK` **전부 grep 0** · **SQLite 폴백 호환이 명시적 설계 제약**).
- **통지 = 신설 금지·배선만**(`Alerting::pushEvent` 재사용 · `notification_channel` SSOT Alerting.php:911 + 폴백 체인 :471-497 **완비** · **승인↔통지 배선만 0**). ⚠️ 282차 트랩: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블 → 무발송.
- 🔴 15종 **"있다고 가정"하고 배선 금지**.

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
