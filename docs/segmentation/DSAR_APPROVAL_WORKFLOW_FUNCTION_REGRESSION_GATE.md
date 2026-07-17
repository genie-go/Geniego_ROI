# DSAR — 검증 게이트 (§82)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §82 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

### 0.1 ★정직 등급 필수 — 이 문서 전체가 `CONTRACT_ONLY`

§82 는 **"완료 전에 반드시 확인하라"** 는 **게이트 목록**이다. 5-3-2 는 **비파괴 설계 명세 · 코드변경 0** 이므로 **현 시점 34개 게이트 중 실 코드로 통과하는 것은 0이다.** 이 문서는 **게이트 계약을 확정할 뿐 통과를 주장하지 않는다.**

> 🔴 **가짜 녹색 금지.** 아래 표의 "현행 대조" 열은 **인접 실자산의 존재**를 기록한 것이지 **게이트 통과**가 아니다. 인접 자산이 있다는 사실을 통과로 계상하면 **분모=분자 동어반복**이며, 289차가 5-3-1 에서 겪은 역산의 정확한 재현이다.

| 축 | 실측 | 판정 |
|---|---|---|
| 34개 게이트 전체 | **실 코드 0**(5-3-2 = 설계 명세 · 코드변경 0) | `CONTRACT_ONLY` |
| 회귀 기준선 | `JourneyBuilder`(레포 유일 실 Flow 엔진 · :498-700+) · `Mapping::approve`(:238-294 · 유일 REAL 승인) · `Omnichannel::claimBatch`(:394-423) · `notification_channel` SSOT(Alerting.php:911) · `AdAdapters::executionEnabled`(:34-40 · 호출부 9곳) | **기능후퇴 0 의 측정 대상** |
| `EquivalenceProof` | **현행 부재** — 5-3-2 통합의 **선행 조건**(286차 rank 맵 붕괴 재현 방지) | `NOT_APPLICABLE`(신설) |

### 0.2 ★기능후퇴 0 의 정확한 측정 대상

§82 는 **"기존 Workflow 기능의 회귀가 없는가"**(#31)를 묻는다. **회귀의 기준선은 "승인 4종 전체"가 아니다.**

승인 지형은 **"중복 4벌"이 아니라 "1 REAL + 3 미달"** 이다(→ [DSAR_APPROVAL_WORKFLOW_DUPLICATE_IMPLEMENTATION_AUDIT.md](DSAR_APPROVAL_WORKFLOW_DUPLICATE_IMPLEMENTATION_AUDIT.md) §0.1). 따라서:

- **회귀 측정 대상 = `mapping_change_request` 의 5단 규율**(Mapping.php:245-290)과 **`JourneyBuilder` 의 실행 프리미티브**뿐이다.
- `action_request`(VACUOUS · 생산자 0) · `admin_growth_approval`(tenant 미격리) · `catalog_writeback_approval`(고아)는 **처음부터 통제로서 작동한 적이 없다** → 이들의 "기능 유지"를 회귀 기준으로 삼으면 **미달을 보존 대상으로 승격**시키는 오류다.
- 🔴 **역방향 함정이 더 위험하다**: 미달 3종을 "중복"으로 묶어 통합하면 통합 결과물이 **자동으로 "기능 유지"** 로 위장된다(보존할 기능이 애초에 없으므로 어떤 결과든 후퇴가 없다). **이 함정을 §82-31 판정에서 반드시 배제하라.**

### 0.3 ★`EquivalenceProof` 선행 — 협상 대상 아님

`Mapping::approve` + `Mapping::actorId` 를 공용 트레이트/서비스로 **추출**할 때, **추출 전후 동일 입력 → 동일 판정 증명이 선행**한다.

- 근거: **286차 rank 맵 붕괴** — 동등해 보이는 재배치가 실제 판정을 바꿨다.
- 근거: **289차 G-01** — `Mapping::actorId` 가 닫은 우회로(**익명 2회 = 정족수 충족**). **재작성하면 이 우회로가 다시 열린다. 이것은 신규 작성이 아니라 위치 이동이다.**
- → `EquivalenceProof` 없는 통합은 §82 통과 주장 자체가 불가하며, **`BLOCKED_MIGRATION_RISK`** 로 판정한다.

## 1. 원문 전사 + 판정 — **원문 34종**

| # | 원문 게이트 | 현행 대조 (인접 실자산 — **통과 아님**) | 판정 |
|---|---|---|---|
| 1 | Workflow Catalog가 구축되었는가 | 카탈로그 0(`workflow_*`/`flow_*`/`wf_*` grep 0) | `CONTRACT_ONLY` |
| 2 | Standard Template과 Tenant Custom Workflow가 구분되는가 | 템플릿 축 0 | `CONTRACT_ONLY` |
| 3 | Workflow Definition과 Version이 분리되는가 | 정의 자체가 **코드 상수**(Mapping:209 리터럴 `2` · Alerting:562 하드코딩 `2` · AdminGrowth 단일결재 암묵) | `CONTRACT_ONLY` |
| 4 | Active Version이 Immutable한가 | 불변성 개념 전무 · `journeys` JSON 은 **작성자 JSON 에 acyclicity 검증 없음**(JourneyBuilder:512 주석 자인) | `CONTRACT_ONLY` |
| 5 | Request·Case가 Workflow Instance와 연결되는가 | 인접 = `journey_enrollments`(마케팅 · 🔴 **`customer_id` 필수** :551/:556) | `CONTRACT_ONLY` — **enrollment 컨텍스트 일반화 선결** |
| 6 | Start·End Node가 검증되는가 | `journeys` 는 `trigger`/`exit` 노드 실재하나 **정적 검증 0**(런타임 방어만) | `CONTRACT_ONLY` |
| 7 | Node·Edge Graph Validation이 작동하는가 | **정적 그래프 검증 0** · 런타임 순환 감지만(JourneyBuilder:512 — 한 패스 내 재방문 중단) | `CONTRACT_ONLY`(인접 = 런타임 방어) |
| 8 | Unreachable·Dead-end Node가 차단되는가 | **차단 0** — 도달성 분석 부재 | `CONTRACT_ONLY` |
| 9 | Mandatory Approval Task 우회가 차단되는가 | 🔴 **현행 우회 실재**: `Alerting::executeAction`(:601-660) `:612` 죽은 읽기 → `pending`·`rejected` 실집행. 현재 VACUOUS(생산자 0)이나 **생산자 배선 시 즉시 활성** | `CONTRACT_ONLY` — **§0.4 순서 절대** |
| 10 | Approval·Review·Human·Manual·System Task가 구분되는가 | **Task 엔티티 0** — 구분 축 자체가 없음 | `CONTRACT_ONLY` |
| 11 | Human Task Assignment·Claim이 구현되는가 | 승인 배정/클레임 0. 인접 = `Omnichannel::claimBatch`:394-423 / `JourneyBuilder`:411(**잡 claim** — 도메인 상이) | `CONTRACT_ONLY` + `KEEP_SEPARATE_WITH_REASON`(잡 claim ≠ human task claim) |
| 12 | Candidate Scope·Tenant·Legal Entity 검증이 적용되는가 | 🔴 **현행 위반 실재**: `admin_growth_approval` **tenant_id 없음** · 전역 조회 · `AdminGrowth:1324 WHERE id=?` | `CONTRACT_ONLY` — **`BLOCKED_CROSS_TENANT` 선재** |
| 13 | Approval Task 완료 시 Decision이 강제되는가 | 🔴 **현행 위반 실재**: `executeAction` 이 결정 없이 완료(§72-22) | `CONTRACT_ONLY` |
| 14 | Workflow Instance·Execution·Token·Transition이 분리되는가 | 분리 0 — Token 개념 grep 0 · 전이 규칙 선언 0 | `CONTRACT_ONLY` |
| 15 | 모든 Transition이 Event로 기록되는가 | **`UPDATE … SET status=` 155건/44파일 중 감사 동반은 소수**. 인접 = `journey_node_logs`(:50,:69) 노드 감사 | `CONTRACT_ONLY`(인접 = `VALIDATED_LEGACY` 패턴) |
| 16 | 중복 Task·Transition이 차단되는가 | 인접 = 조건부 UPDATE+rowCount CAS 4곳(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:394-447) · `claimSendOnce`(:672) | `CONTRACT_ONLY`(인접 = `VALIDATED_LEGACY`) |
| 17 | Wait·Timer·Signal·Message Correlation이 구현되는가 | 인접 = `resume_at`/`wait_until`(:80-82 · 206차 delay + 255차 이벤트 절대기한 **분리 설계**) + **OS cron 폴링 단일 수단**. **Signal/Message 상관 0** · 범용 이벤트 버스 grep 0 | `CONTRACT_ONLY`(Wait/Timer 패턴은 `VALIDATED_LEGACY`) |
| 18 | External Callback이 인증·Tenant 검증되는가 | 인증: Paddle HMAC(:1073) REAL · 🔴 **Tenant 검증 부재**(`paddle_events` tenant_id 없음 :99) · 범용 인바운드 `Webhooks.php:22-27` = **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) | `CONTRACT_ONLY` — **`BLOCKED_CROSS_TENANT` 선재** |
| 19 | Retry·Backoff·Failure·Dead Letter가 구현되는가 | 인접 = **백오프 3공식 병존**(AdAdapters:1187-1228 `600*2^n` **86400s 캡** · OpenPlatform:466-471 `min(60,2^n)`분 · Omnichannel:365 **백오프 없음**) · **DLQ 테이블은 `ad_delivery_dlq` 1개뿐** | `CONTRACT_ONLY` + `CONSOLIDATION_REQUIRED`(**`AdAdapters:1221` 공식 채택 권고**) |
| 20 | Financial Task Retry가 Idempotency를 확인하는가 | **`idempotency_key` grep 0** · 자연키 선점 3패턴(`claimSendOnce`:672 · `notification_id` UNIQUE · `uq_rve_dedup` Db.php:1017-1034) | `CONTRACT_ONLY` — **5-3-2 결번** |
| 21 | Pause·Resume·Cancellation이 구현되는가 | 승인 도메인 0. 인접 킬스위치 = `AdAdapters::executionEnabled`:34-40(**호출부 9곳 실배선 REAL** → **재사용 강제**) | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(킬스위치) |
| 22 | Compensation Hook이 구축되는가 | 승인 도메인 0. 유사 선례 = OrderHub 수동취소 역분개(268차) | `CONTRACT_ONLY` |
| 23 | Workflow Idempotency가 구현되는가 | **grep 0** → **`claimSendOnce` 자연키 선점 마커가 승인 결정에 가장 정합** | `CONTRACT_ONLY` |
| 24 | Optimistic Concurrency·Distributed Lock이 적용되는가 | 🔴 **`version`·분산락·`GET_LOCK` 전부 grep 0** — **SQLite 폴백 호환이 명시적 설계 제약**. 대체 자산 = 조건부 UPDATE+rowCount CAS · `claimConditional`:427-447(SQLite/MySQL<8 2단 폴백) · `flock` 은 `stock_sync_cron.php:54` 유일 | **⚠️ 원문 요구와 설계 제약이 충돌** — §2 규칙 |
| 25 | 실행 중 Workflow Migration 기반이 구축되는가 | 0 | `CONTRACT_ONLY` |
| 26 | Replay가 Side-effect 안전한가 | replay 기전 0. 인접 = `claimSendOnce`(커밋 전 크래시 시 재발송 차단 · 277차) | `CONTRACT_ONLY`(인접 = `VALIDATED_LEGACY` 패턴) |
| 27 | Workflow Candidate·Selection 근거가 기록되는가 | 0 | `CONTRACT_ONLY` |
| 28 | Workflow State와 Approval State가 Mapping되는가 | 0 — 양변 모두 부재(워크플로 상태 축 없음 · 승인 상태는 인라인) | `CONTRACT_ONLY` |
| 29 | External Engine과 Canonical Contract가 Reconciliation되는가 | **외부 엔진 `backend/src` grep 0**(§73) → 대사 대상 부재 | `NOT_APPLICABLE`(전제 미성립) |
| 30 | 최소 Static Lint·Runtime Guard가 작동하는가 | Runtime Guard 인접 = 순환 감지(:512) · 전이 가드 4곳(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155). **Static Lint 0**(레포에 테스트 스위트 자체 없음) | `CONTRACT_ONLY` |
| 31 | 기존 Workflow 기능의 회귀가 없는가 | **회귀 기준선 = `Mapping::approve` 5단 규율(:245-290) + `JourneyBuilder` 실행 프리미티브뿐**(§0.2). 미달 3종은 기준선 아님 | `CONTRACT_ONLY` — **기능후퇴 0 · `EquivalenceProof` 선행** |
| 32 | 중복 Workflow Engine이 생성되지 않았는가 | **현행 실 Flow 엔진 = `JourneyBuilder` 1개뿐**(레포 유일) · 외부 엔진 0 → **현재 중복 없음**. 🔴 **5-3-2 가 엔진을 신설하면 이 게이트가 즉시 실패** | `CONTRACT_ONLY` — **`approval` 노드 추가만이 통과 경로** |
| 33 | ADR·PM·Repeat Problem·Agent History가 갱신되었는가 | 5-3-2 산출 = `docs/segmentation/*.md` + ADR(`ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md`) | `CONTRACT_ONLY` — 문서 게이트 |
| 34 | 다음 Multi-Level Approval 단계가 실행 가능한가 | 선결: ① `executeAction` 상태 게이트 ② enrollment 컨텍스트 일반화 ③ `Mapping::approve` 공용 추출 + `EquivalenceProof` ④ `actor_type` 축 | `CONTRACT_ONLY` |

**실측 개수: 34 / 34 전사.** 원문 개수와 전사 개수 **일치**.
커버리지 = **`CONTRACT_ONLY` 33 · `NOT_APPLICABLE` 1**(#29 외부 엔진 전제 미성립). **실 코드 통과 = 0 / 34.** 인접 `VALIDATED_LEGACY` 참조 6 · 게이트 #24 는 **원문 요구와 SQLite 폴백 설계 제약이 충돌**하므로 별도 규칙(§2)으로 해소한다.

### 0.4 ★순서 절대 (게이트 #9·#13 의 전제)

> **① `executeAction` 상태 게이트 → ② `action_request` 생산자 배선.**

뒤집으면 **승인 우회가 즉시 활성**된다. 게이트 #9(Mandatory Approval Task 우회 차단)·#13(Decision 강제)은 이 순서를 지킨 경우에만 통과 주장이 가능하다.

## 2. 규칙

- 🔴 **정직 등급 필수.** 34개 게이트 전부 **`CONTRACT_ONLY`(실 코드 0)** 로 표기한다. **인접 실자산의 존재를 게이트 통과로 계상 금지** — 그것이 가짜 녹색의 가장 순수한 형태다.
- 🔴 **기능후퇴 0.** 회귀 기준선은 **`Mapping::approve` 5단 규율(:245-290)** 과 **`JourneyBuilder` 실행 프리미티브**뿐이다. 🔴 **미달 3종(`action_request` VACUOUS · `admin_growth_approval` tenant 미격리 · `catalog_writeback_approval` 고아)을 "중복"으로 묶어 통합하면 통합 결과물이 자동으로 "기능 유지"로 위장된다** — §82-31 판정에서 반드시 배제하라.
- 🔴 **`EquivalenceProof` 선행 없이 통합 금지.** 추출 전후 **동일 입력 → 동일 판정** 증명이 선행 조건이다. 근거: **286차 rank 맵 붕괴** · **289차 G-01 이 닫은 우회로(익명 2회=정족수)**. **재작성은 신규 작성이 아니라 위치 이동이다.**
- 🔴 **게이트 #32(중복 엔진 미생성)가 5-3-2 설계를 강제한다.** 현행 실 Flow 엔진은 `JourneyBuilder` **1개뿐**이며, 엔진을 신설하는 순간 이 게이트가 **즉시 실패**한다 → **`approval` 노드 추가 + `wait` event-mode 재폴링(:565-570) 재사용이 유일 통과 경로.** 단 **enrollment 컨텍스트 일반화(`customer_id` 종속 :551/:556)가 선결**(게이트 #5).
- ⚠️ **게이트 #24 충돌 해소**: 원문은 **"Optimistic Concurrency·Distributed Lock 적용"** 을 요구하나, 현행은 **`version`·분산락·`GET_LOCK` 전부 grep 0 이고 그 부재가 SQLite 폴백 호환이라는 명시적 설계 제약의 직접 결과**다. → **`version` 컬럼·분산락 도입 금지.** **조건부 UPDATE+rowCount CAS**(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · `Omnichannel::claimBatch`:394-423 / `claimConditional`:427-447)로 **동등한 동시성 보장을 달성했음을 증명**하는 방식으로 게이트를 통과한다. **다른 동시성 모델 도입은 제약 위반이다.**
- 🔴 **★순서 절대 (§0.4)**: `executeAction` 상태 게이트 → `action_request` 생산자 배선. 뒤집으면 승인 우회 즉시 활성.
- 🟠 **게이트 #10·#12 는 `actor_type` 축을 요구한다.** 현행은 `apikey:`/`user:` 동등 계수 → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). 이 축 없이 #12 통과 주장 금지.
- **신설 금지 목록(게이트 통과가 신설을 정당화하지 않는다)**: 실행 엔진(→ JourneyBuilder 확장) · 정족수/Maker-Checker(→ `Mapping::approve` 추출) · 알림(→ `Alerting::pushEvent` 재사용 · **승인 이벤트↔통지 배선만 0**) · 킬스위치(→ `AdAdapters::executionEnabled` 재사용) · 에러 봉투(→ `AdminGrowth::fail`:181-184 공용 추출) · 4번째 Foundation(AL-19).
- **오탐 재플래그 금지**: "에러 코드 체계 부재"는 **과장**(`AdminGrowth::fail` 실배선 :1322/:1326/:1327) · `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계** · `ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**.

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
