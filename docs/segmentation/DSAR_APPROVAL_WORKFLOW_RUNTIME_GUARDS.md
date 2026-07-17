# DSAR — 최소 Runtime Guard (§66)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §66 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 런타임 가드 | 승인 도메인 Runtime Guard **grep 0** | `CONTRACT_ONLY` |
| ★정족수 5단 규율 REAL | `Mapping::approve`(Mapping.php:238-294) — **위조불가 신원 fail-closed**(`Mapping::actorId`:36 · `apikey:{id}`/`user:{email}` · 미확인 null→403) → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수 | `VALIDATED_LEGACY` — **공용 추출 대상**(재작성 금지) |
| ★동시성 = 레포 최고 성숙 자산 | `Omnichannel::claimBatch`:394-423(**stale lease 900s 회수 → `SELECT..FOR UPDATE SKIP LOCKED`+claim_id → 조건부 UPDATE 폴백**) · `Omnichannel::claimConditional`:427-447(SQLite/MySQL<8 2단 폴백) | `VALIDATED_LEGACY` |
| 조건부 UPDATE + rowCount CAS | **4곳 확립**: Catalog:1683 · ChannelSync:6136-6153(stale 600s 회수) · JourneyBuilder:411-418 | `VALIDATED_LEGACY` — **채택 강제** |
| 🔴 락 기전 | `optimistic lock(version)`·**분산락**·`GET_LOCK` **전부 grep 0** · `flock` 은 `stock_sync_cron.php:54` 유일 | `NOT_APPLICABLE` — **SQLite 폴백 호환이 명시적 설계 제약** |
| Kill Switch | `AdAdapters::executionEnabled`(AdAdapters.php:34) — **호출부 9곳 실배선** | `VALIDATED_LEGACY` — 재사용 강제 |
| 순회 멱등 | `claimSendOnce(enrollment_id,node_id)`(JourneyBuilder.php:672 · 커밋 전 크래시 시 재발송 차단·277차) | `LEGACY_ADAPTER` |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` — **5-3-2가 채울 결번** |
| 전이 가드 | **4곳뿐**: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155 (**전이 규칙 선언 0** · `UPDATE ... SET status=` 155건/44파일 전부 인라인) | `LEGACY_ADAPTER`(패턴) · `NOT_APPLICABLE`(선언) |

### ★등급 축 주의 — **정직 등급 필수**

- **5-3-1의 Lint 19 + Guard 30 은 전부 `CONTRACT_ONLY`(실 코드·테이블 0건)였다.** 아래 37종도 **승인 도메인 실 가드 코드는 0건**이다 → 전건 `CONTRACT_ONLY`. 인접 도메인(잡 큐·마케팅 여정·광고 어댑터)에 **재사용 가능한 실 프리미티브가 있다**는 것과 **승인 가드가 있다**는 것은 완전히 다른 진술이다. 후자로 바꿔 적으면 역산이다.
- **형태 유사 ≠ 의미 동일.** `Omnichannel::claimBatch`(:394-423)의 claim/lease 는 **아웃박스 잡 큐** 도메인이고, `JourneyBuilder`의 claim(:411-418)은 **마케팅 여정** 도메인이다. §66 #19(Invalid Task Claim)·#20(Task Claim Expired)의 **커버로 계산하면 안 된다** → `KEEP_SEPARATE_WITH_REASON`. 단 **실행 프리미티브의 재사용 근거로는 인용 가능**(설계 결론 5).
- 🔴 **§66 #26(Optimistic Lock Conflict)·#27(Distributed Lock Lost)은 현행 설계 제약과 정면 충돌한다.** `version` 낙관적 락·분산락 **전부 grep 0**이고 **SQLite 폴백 호환이 명시적 제약**이다. 이 두 가드를 원문 문자 그대로 구현하면 **제약 위반**이다 → 아래 규칙 참조.

## 1. 원문 전사 + 판정 — **원문 37종**

원문 §66 서두: **"다음을 차단하라."**

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | Workflow Definition Not Found | Definition 테이블 grep 0 | `CONTRACT_ONLY` |
| 2 | Workflow Version Not Active | Version 개념 부재 | `CONTRACT_ONLY` |
| 3 | Tenant Scope Mismatch | **인접 실재 갭**: `admin_growth_approval` tenant_id 없음 · 결정 경로 `AdminGrowth.php:1324` = `WHERE id=?`(테넌트 술어 없음) · `paddle_events` tenant_id 없음(:99) | `CONTRACT_ONLY` · 🔴 인접 갭 실재 |
| 4 | Workspace Scope Mismatch | Workspace 개념 grep 0 | `CONTRACT_ONLY` |
| 5 | Legal Entity Scope Mismatch | Legal Entity 개념 grep 0 | `CONTRACT_ONLY` |
| 6 | Environment Scope Mismatch | Environment Scope 개념 부재(인접: `Db::envLabel()` 운영/데모 구분 — **승인 도메인 아님**) | `CONTRACT_ONLY` |
| 7 | Approval Domain Mismatch | Approval Domain 개념 부재 | `CONTRACT_ONLY` |
| 8 | Resource Type Mismatch | Resource Type 개념 부재 | `CONTRACT_ONLY` |
| 9 | Invalid Start Trigger | Start Trigger 개념 부재 | `CONTRACT_ONLY` |
| 10 | Invalid Node Transition | **전이 규칙 선언 0** · 전이 가드 4곳뿐(FeedTemplate::transition:248-285 · Mapping::apply:309 · Catalog::approveQueue:2341 · AdminGrowth::launch:1155) | `CONTRACT_ONLY` · `LEGACY_ADAPTER`(패턴 인용) |
| 11 | Inactive Workflow Instance | Instance 개념 부재 | `CONTRACT_ONLY` |
| 12 | Paused Workflow Execution | Pause 개념 부재 · 인접 킬스위치 `AdAdapters::executionEnabled`:34(9곳 배선) | `CONTRACT_ONLY` · `VALIDATED_LEGACY`(킬스위치) |
| 13 | Cancelled Workflow Execution | Cancel 전이 부재 | `CONTRACT_ONLY` |
| 14 | Superseded Workflow Execution | Superseded 개념 부재 | `CONTRACT_ONLY` |
| 15 | Duplicate Instance Start | 멱등키 grep 0 | `CONTRACT_ONLY` |
| 16 | Duplicate Task Creation | Task 개념 부재 · 인접 dedup 선례 `uq_rve_dedup` UNIQUE(Db.php:1017-1034) | `CONTRACT_ONLY` · `LEGACY_ADAPTER` |
| 17 | Duplicate Task Completion | 인접: `claimSendOnce(enrollment_id,node_id)`(JourneyBuilder.php:672) 자연키 선점 마커 | `CONTRACT_ONLY` · `LEGACY_ADAPTER` |
| 18 | Duplicate Transition | Transition 개념 부재 | `CONTRACT_ONLY` |
| 19 | Invalid Task Claim | Task Claim 부재 · **인접 실자산**: `Omnichannel::claimBatch`:394-423(잡 큐) · `JourneyBuilder`:411-418(마케팅 여정) | `CONTRACT_ONLY` · `KEEP_SEPARATE_WITH_REASON`(도메인 상이) |
| 20 | Task Claim Expired | Claim 만료 부재 · **인접 실자산**: stale lease 회수 = Omnichannel **900s**(:394-423) · ChannelSync **600s**(:6136-6153) | `CONTRACT_ONLY` · `LEGACY_ADAPTER` |
| 21 | Actor Authorization Invalid | ★**인접 REAL**: `Mapping::actorId`(Mapping.php:36) 위조불가 신원 fail-closed(미확인 null→403) · `Mapping::approve`(:238-294) 5단 규율 | `CONTRACT_ONLY`(승인 워크플로) · `VALIDATED_LEGACY`(공용 추출 대상) · 🟠 **`actor_type` 부재**(아래 규칙) |
| 22 | Resource Version Drift | Resource Version 개념 부재 · `version` grep 0 | `CONTRACT_ONLY` |
| 23 | Policy Version Drift | Policy Version 개념 부재 | `CONTRACT_ONLY` |
| 24 | Missing Approval Requirement | **인접 실재 갭**: `action_request` 정족수 **컬럼 없음** · `Alerting:562` 리터럴 `2` 장식 · `listActionRequests`는 `required_approvals:2` 응답하나 `decideAction`은 **1명에 approved** = **계약 위반 이미 존재** | `CONTRACT_ONLY` · 🔴 인접 갭 실재 |
| 25 | Missing Required Evidence | Evidence Requirement 부재(§69 전 축 신설) | `CONTRACT_ONLY` |
| 26 | Optimistic Lock Conflict | 🔴 `optimistic lock(version)` **grep 0** · **SQLite 폴백 호환이 명시적 설계 제약** · 확립 대체 = 조건부 UPDATE+rowCount CAS 4곳(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411) | `CONTRACT_ONLY` · 🔴 **원문 문자 그대로 구현 시 제약 위반**(아래 규칙) |
| 27 | Distributed Lock Lost | 🔴 **분산락·`GET_LOCK` 전부 grep 0** · `flock` 은 `stock_sync_cron.php:54` **유일**(단일 호스트) | `CONTRACT_ONLY` · 🔴 **동상 — 제약 위반 위험** |
| 28 | Retry Limit Exceeded | **백오프 3공식 병존**: AdAdapters:1187-1228(maxAttempts 5 · `600*2^n` · **86400s 캡**) · OpenPlatform:466-471(`min(60,2^n)`분) · Omnichannel:365(attempts<3 · **백오프 없음**) | `CONTRACT_ONLY` · `LEGACY_ADAPTER` — **AdAdapters:1221 공식 채택 권고** |
| 29 | Non-retryable Error | 오류 분류 체계 부재 · ★**defer≠실패 규율 존재**(Omnichannel:349,362 quiet_hours/sto_defer attempts 미증가) · ★**honest pending**(ChannelSync:6173 · Catalog:1712 어댑터 부재 시 재시도 미소모) | `CONTRACT_ONLY` · `VALIDATED_LEGACY`(두 규율 **보존 강제**) |
| 30 | Invalid Callback Authentication | **인접 REAL**: Paddle HMAC 서명(Paddle.php:1073) · 아웃바운드 `OpenPlatform.php:373` Stripe식 서명 + **SSRF 방어**(전달 직전 DNS 재검증 :414-424) · 🔴 범용 인바운드 `Webhooks.php:22-27` = **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) | `CONTRACT_ONLY`(승인) · `LEGACY_ADAPTER`(서명 선례) · 🔴 인접 갭 실재(opt-in) |
| 31 | Callback Tenant Mismatch | 🔴 **인접 실재 갭**: `paddle_events` 에 tenant_id **없음**(:99) = **테넌트 검증 부재** | `CONTRACT_ONLY` · 🔴 인접 갭 실재 |
| 32 | Event Correlation Failed | 🔴 **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0** — 내부는 전부 직접 static 호출 · `OpenPlatform::emit`:311-328 은 **웹훅 발신 전용**(화이트리스트 · 구독 0이면 no-op · **예외 절대 미전파** :325) | `CONTRACT_ONLY` · `KEEP_SEPARATE_WITH_REASON`(emit≠이벤트 버스) |
| 33 | Workflow Migration Invalid | Migration 개념 부재 | `CONTRACT_ONLY` |
| 34 | Replay Side-effect Risk | Replay 개념 부재 · 멱등키 grep 0 | `CONTRACT_ONLY` |
| 35 | Mandatory Requirement Pending | Requirement 부재(#24 와 짝) | `CONTRACT_ONLY` |
| 36 | Critical Reconciliation Drift | Reconciliation 개념 부재(외부 엔진 미도입) | `CONTRACT_ONLY` |
| 37 | Kill Switch 활성 | ★**인접 REAL**: `AdAdapters::executionEnabled`(AdAdapters.php:34) **호출부 9곳 실배선** · ⚠️오탐 주의: `pause()` 면제 = **279차 D-P1 의도된 설계**(킬스위치는 지출을 늘리는 방향만 차단) · ⚠️`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치** | `CONTRACT_ONLY`(승인 도메인) · `VALIDATED_LEGACY` — **재사용 강제·신설 금지** |

**실측 개수: 37 / 37 전사.** 커버리지 = `CONTRACT_ONLY` 37 (**승인 도메인 실 가드 코드 0건**) · 그중 인접 실자산 재사용 가능 10건(#12·#16·#17·#19·#20·#21·#28·#29·#30·#37) · 인접 갭 실재 4건(#3·#24·#30·#31) · 🔴 설계 제약 충돌 2건(#26·#27).

🔴 **37/37 `CONTRACT_ONLY` = 5-3-1(Guard 30 전건 `CONTRACT_ONLY`)의 연장이다.** 5-3-2 시점에도 **승인 워크플로 Runtime Guard 는 단 1건도 코드로 존재하지 않는다.** 인접 실자산 10건은 **재사용 후보**이지 **충족 증거가 아니다.**

## 2. 규칙

- 🔴 **등급을 부풀리지 마라.** 5-3-1의 Lint 19 + Guard 30 이 전건 `CONTRACT_ONLY`(실 코드·테이블 0건)였다. 신설분도 **실 코드가 없으면 `CONTRACT_ONLY`**다. 인접 도메인 실자산의 존재를 승인 가드의 충족으로 계산하면 **분모=분자 동어반복**이다.
- 🔴 **"CI 가드"라는 표현은 배선 후에도 거짓일 수 있다.** 정확한 등급은 `WIRED(pre-commit·로컬)`(`.githooks/pre-commit`) / `WIRED(CI·탐지)`(`security-scan.yml` `repo-guards`:57·:82) 다. **브랜치 보호 + required check 미설정(G-06b·사용자 결정 대기) → 가드는 탐지일 뿐 예방이 아니다.** §66 은 **"차단하라"**를 요구한다 — 탐지는 미충족. (규칙 SSOT = `tools/scan_secrets.sh` — **정규식을 CI 에 복사하면 규칙 분기의 병을 새로 심는다.**)
- 🔴 **#26/#27 을 원문 문자 그대로 구현하지 마라 — 설계 제약 위반이다.** `version` 낙관적 락·분산락·`GET_LOCK` 전부 grep 0 이고 **SQLite 폴백 호환이 명시적 설계 제약**이다.
  - **채택**: **조건부 UPDATE + rowCount CAS**(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411-418 — 확립 4곳) + `Omnichannel::claimConditional`(:427-447 SQLite/MySQL<8 2단 폴백).
  - **#26 은 "CAS 실패"로, #27 은 "lease 만료 회수"(Omnichannel 900s · ChannelSync 600s)로 매핑**한다. 새 동시성 모델 도입은 **제약 위반**이다.
- 🔴 **#21/#24 정족수 = 신설 금지 · 위치 이동.** `Mapping.php:245-290` 5단 규율(**위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수**)을 **공용 트레이트/서비스로 추출**하라. **재작성하면 289차 G-01 이 닫은 우회로(익명 2회=정족수)를 다시 연다.** 신규 작성이 아니라 **위치 이동**이다. `EquivalenceProof` 선행 없이 통합 금지(286차 rank 맵 붕괴 재현).
- 🟠 **#21 의 알려진 결함 = `actor_type` 부재.** `apikey:{id}`/`user:{email}` 이 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). #21 가드 신설 시 `actor_type` 분리가 **선결**이다.
- 🔴 **#37 Kill Switch = 신설 금지.** `AdAdapters::executionEnabled`(:34) 재사용 강제(호출부 9곳 실배선). ⚠️**오탐 재플래그 금지**: `pause()` 면제는 **279차 D-P1 의도된 설계**다. ⚠️`ClaudeAI.php` 주석("killswitch 내장")은 **실효와 불일치** — 주석만 읽고 판정하지 마라.
- 🔴 **#12 Paused 를 `Alerting::executeAction`으로 구현하지 마라.** Alerting.php:601-660 은 `:612` 에서 `status` 를 SELECT 하고 **어디서도 판독하지 않아** `pending`·`rejected` 도 실집행한다(승인 우회). 현재 `VACUOUS`(`INSERT INTO action_request` grep 0 = 생산자 전무)이나 **생산자 배선 시 즉시 활성**. **참조 구현으로 삼지 마라.**
- **#28 Retry = `AdAdapters::retryDeliveryDlq`(:1187-1228) 공식 채택**(maxAttempts 5 · `600*2^n` · **86400s 캡**). 4번째 공식 금지(현재 3공식 병존). **DLQ 테이블은 `ad_delivery_dlq` 1개뿐**(나머지는 원 테이블 `status='failed'` 잔류) — DLQ 신설 시 이 사실 위에 설계하라.
- **#29 Non-retryable = 두 규율 보존 강제.** ★**defer ≠ 실패**(Omnichannel:349,362 attempts 미증가) · ★**honest pending**(ChannelSync:6173 · Catalog:1712 어댑터 부재 시 재시도 미소모). 오류 분류 신설이 이 규율을 덮어쓰면 **기능 후퇴**다.
- **#32 Event Correlation**: `OpenPlatform::emit`(:311-328)을 이벤트 버스로 오인하지 마라 — **웹훅 발신 전용**이며 **예외를 절대 전파하지 않는다**(:325). 승인 상관관계를 emit 에 얹으면 **실패가 조용히 삼켜진다**. 재폴링 패턴은 `JourneyBuilder` `wait` event-mode(:565-570) 재사용(설계 결론 1).
- **#15/#16/#17/#18/#34 멱등 = 5-3-2가 채울 결번**(`idempotency_key` grep 0). 현행 3패턴 중 **`claimSendOnce`(JourneyBuilder.php:672) 자연키 선점 마커가 승인 결정에 가장 정합**(설계 결론 7).
- **#30/#31 Callback**: 승인 콜백은 **Paddle 멱등 선례**(`notification_id` UNIQUE → **`processed=1` 일 때만 skip · `processed=0` 은 재처리 허용**·272차)를 따르되 **`paddle_events` 의 tenant_id 부재(:99)를 복제하지 마라** — #31 은 그 부재 때문에 **현행에서 이미 미방어**다. 아웃바운드는 `OpenPlatform.php:373` 서명 + **SSRF DNS 재검증(:414-424) 보존**.
- **알림 = 신설 금지·배선만**(`Alerting::pushEvent` 재사용 · `notification_channel` SSOT Alerting.php:911 + 폴백 체인 :471-497 완비 · **승인 이벤트↔통지 배선만 0**). ⚠️282차 트랩: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블 → **무발송**.
- 🔴 **37종 "있다고 가정"하고 배선 금지.** 부재는 부재로 기록했다.

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
