# DSAR — Task Completion (§42)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §42 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

**§42 는 필드 축이 아니라 완료 전 검증 11항 + 신뢰성 연결 규율 1항이다.**

| 항목 | 실측 | 판정 |
|---|---|---|
| Task Completion 경로 | 부재 — Task 개념 자체 전무(`workflow_task`·`human_task` grep 0). 현행 승인은 **클레임도 Task 도 없이 바로 결정**(`Mapping::approve`:238 · `AdminGrowth::approvalDecide`:1322) | `NOT_APPLICABLE`(부재 → 신설) |
| ★완료 전 검증 선례 | **`Mapping::approve` 5단**(Mapping.php:245-290) — ① 위조불가 신원 fail-closed(:245-250 `actor===null` → **403**) ② 비-pending **409**(:262-266) ③ 자기승인 차단 **403**(:268-271) ④ 승인자 dedup **409**(:278-284) ⑤ 정족수(:287) | `VALIDATED_LEGACY`(**규율 정본 — 공용 추출**) |
| 🔴 Transactional Outbox | **`omni_outbox`**(Omnichannel.php:74-93) = **outbox 이름·의미 모두 레포 유일**. 단 이것은 **발송 아웃박스**(메시지 큐)이지 **상태변경-이벤트 원자성 보장용 Transactional Outbox 가 아니다** | `KEEP_SEPARATE_WITH_REASON` |
| 완료-전이 원자성 | **보장 0** — 현행 결정은 단일 `UPDATE`(Mapping.php:288)로 끝나고 후속 전이·통지·집행과 **트랜잭션으로 묶이지 않는다** | `NOT_APPLICABLE` |
| 통지 배선 | `notification_channel` SSOT(Alerting.php:911 slack/webhook/email + `min_severity`) + **폴백 체인**(:471-497 · 282차 "알림 통지 죽음" 수정분) = **완비**. 🔴**승인 이벤트↔통지 배선만 0** | `VALIDATED_LEGACY`(**신설 금지·배선만**) |
| 이벤트 전파 | `OpenPlatform::emit`(:311-328 화이트리스트 · 구독 0이면 no-op · **예외 절대 미전파** :325) = **웹훅 발신 전용**. 🔴**범용 이벤트 버스·in-process dispatcher grep 0** — 내부는 전부 직접 static 호출 | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — `omni_outbox` 는 Transactional Outbox 가 아니다.** 이름이 정확히 일치하는 유일한 자산이지만 **능력이 다르다**: `omni_outbox` 는 **발송할 메시지를 담는 큐**이며, 원문 §42 가 요구하는 것은 **"Task 완료와 Workflow 전이가 부분 성공하지 않도록" 상태 변경과 후속 이벤트를 한 트랜잭션에 함께 쓰고 별도 워커가 발행하는 신뢰성 패턴**이다. **이름 일치를 능력 일치로 읽으면 8회차 BPMN 오판의 정반대 실수**다 → `KEEP_SEPARATE_WITH_REASON`. 단 **"DB 테이블 + cron 폴링 워커"라는 구현 골격은 재사용 가능**하다(레포에 타이머 서비스·지연큐·메시지 브로커가 없고 **스케줄링은 OS cron 단일 수단**이므로 이 골격 외 선택지가 없다).

**★검증 규율은 이미 있다 — 없는 것은 Task 다.** `Mapping::approve` 5단(:245-290)은 원문 11항 중 4항을 **능력으로 충족**한다. 이것은 **재구현 금지·위치 이동** 대상이다(289차 G-01 이 이 5단을 세웠다).

## 1. 원문 전사 + 판정 — **원문 11종**

| # | 원문 항목명(완료 전 검증) | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Task가 Active 상태인가 | **능력 충족** = `Mapping::approve` 비-pending **409**(:262-266 "proposal is not pending (status={$curStatus})" · 289차 G-01 "이미 처리된 건에 승인 누적 금지"). 단 **Task 가 아니라 제안 행 기준** | `VALIDATED_LEGACY`(규율 이식) |
| 2 | 올바른 Workflow Instance인가 | 부재 — 인스턴스 개념 전무(§10). 인접 = 테넌트 스코프(`Mapping`:253 `WHERE id=? AND tenant_id=?`) ↔ **`admin_growth_approval` 은 tenant_id 없음**(:1324 전역) | `NOT_APPLICABLE` |
| 3 | Claim이 필요한 경우 유효한 Claim이 있는가 | **검증 0** — `claim_token` grep 0 · 승인은 클레임 없이 바로 결정(§38 차단 6번과 동일 결번) | `NOT_APPLICABLE` |
| 4 | Actor Authorization이 유효한가 | **부분** — 신원은 위조불가 fail-closed(`Mapping::actorId`:36-50 · :245-250 미확인 null→**403**). 🔴그러나 **인가는 미검증**: `acl_permission` 의 `approve` 동작(TeamPermissions.php:39,708-717)이 **부여되나 외부 판독 grep 0** | `CONTRACT_ONLY` |
| 5 | Required Evidence가 있는가 | **검증 0** — 증거 요구 개념 전무(§41 `evidence references` 부재와 짝) | `NOT_APPLICABLE` |
| 6 | Required Form Field가 충족되는가 | **검증 0** — Form/필드 요구 개념 grep 0 | `NOT_APPLICABLE` |
| 7 | Approval Task면 Decision이 생성되었는가 | **역전되어 있음** — 현행은 Decision **생성 여부를 검증**하는 것이 아니라 Decision 이 **곧 완료**다(`approvals_json` 누적 = 결정 = 상태 전이, Mapping.php:274-288 단일 UPDATE). 검증 지점이 존재하지 않음 | `NOT_APPLICABLE` |
| 8 | Resource Version이 유효한가 | **검증 0** — 리소스 버전 개념 grep 0 | `NOT_APPLICABLE` |
| 9 | Task Lock Version이 일치하는가 | **검증 0** — `lock_version`·optimistic `version`·분산락·`GET_LOCK` **전부 grep 0**. 실증: `Mapping::approve`:288 `UPDATE ... WHERE id=? AND tenant_id=?` = **status·version 가드 없음**(:262 pending 검사와 :288 쓰기 사이 무방비 → 동시 승인 시 `approvals_json` lost update 가능). 인접 능력 = **조건부 UPDATE + rowCount CAS 4곳**(Catalog:1683-1691 · ChannelSync:6145-6153 · JourneyBuilder:411-418 · Omnichannel:427) | `LEGACY_ADAPTER`(**패턴 강제 재사용**) |
| 10 | Idempotency Key가 유효한가 | **검증 0** — `idempotency_key` grep 0. 인접 멱등 3패턴 = `claimSendOnce`(JourneyBuilder.php:450-461 자연키 선점) · `paddle_events.notification_id` UNIQUE(Paddle.php:343) · `uq_rve_dedup`(Db.php:1017-1034) — 전부 **서버 도출 자연키**(호출자 제시 키 아님) | `LEGACY_ADAPTER`(패턴 재사용) |
| 11 | 이미 완료된 Task가 아닌가 | **능력 충족** = 비-pending **409**(Mapping.php:262-266) + 승인자 dedup **409**(:278-284 "already approved by this approver" · 289차 G-01 "한 사람이 두 번 눌러 정족수를 채우던 경로"). 단 **Task 가 아니라 제안 행 기준** | `VALIDATED_LEGACY`(규율 이식) |

**실측 개수: 11 / 11 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 6 · 인접 위임(`LEGACY_ADAPTER`) 2 · 현행 충족(`VALIDATED_LEGACY`) 2 · 계약만(`CONTRACT_ONLY`) 1.

## 1-2. 원문 신뢰성 규율 전사 — **원문 1종**

| # | 원문 규율 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Task Completion과 Workflow Transition을 **Transactional Outbox 또는 동등한 신뢰성 패턴**으로 연결하라 | **부재** — 완료-전이 원자성 보장 0(현행 결정은 단일 `UPDATE` Mapping.php:288 로 끝나고 후속 전이·통지·집행과 트랜잭션 미결합). 이름 유일 일치 = `omni_outbox`(Omnichannel.php:74-93)이나 **발송 큐이지 Transactional Outbox 아님**(§0 축 주의). 동등 패턴 후보 = **DB 테이블 + cron 폴링**(레포 유일 성립 골격 — 브로커·지연큐·타이머 서비스 전부 부재 · 스케줄링=OS cron 단일) | `NOT_APPLICABLE`(**골격만 재사용**) |

**실측 개수: 1 / 1 전사.**

## 2. 규칙

- 🔴 **검증 4항(#1·#4 신원분·#11)은 재작성 금지 — `Mapping::approve` 5단을 공용 트레이트/서비스로 추출하라.** `Mapping.php:245-290` 의 **위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수** 는 289차 G-01 이 세운 규율이다. **재작성하면 G-01 이 닫은 우회로(익명 승인 2회 = 정족수 충족)를 다시 연다.** 이것은 신규 작성이 아니라 **위치 이동**이다.
  🔴 **`EquivalenceProof` 선행 없이 통합 금지** — 286차 rank 맵 붕괴가 재현된다.
- 🔴 **`Task Lock Version` 검증에 다른 동시성 모델 도입 금지.** optimistic lock(`version`)·분산락·`GET_LOCK` 이 **레포 전역 grep 0** 인 것은 결함이 아니라 **SQLite 폴백 호환이라는 명시적 설계 제약**이다(증거: `Omnichannel::claimConditional` Omnichannel.php:427-447 = SKIP LOCKED 미지원 드라이버 전용 2단 폴백 · `Catalog`:1682 주석 "FOR UPDATE/SKIP LOCKED 불필요 — SQLite 폴백 환경에서도 동일하게 동작한다"). **반드시 조건부 UPDATE + rowCount CAS**(4곳 확립)로 구현하라.
- 🔴 **`Idempotency Key` 검증 = 5-3-2 가 채울 결번이나 자연키 선점을 택하라.** `JourneyBuilder::claimSendOnce`(:450-461)의 **`(tenant, enrollment_id, node_id)` UNIQUE INSERT = 성공이 곧 소유권**이 승인 완료에 가장 정합하다 — **행위 전에 선점**하므로 완료-집행 사이 크래시에도 **이중 집행이 없다**(주석 :452-453).
  ⚠️ **동반 책임**: `releaseSendOnce`(:463-471 · **"해제하지 않으면 영구 미발송"**). 완료 실패 경로마다 해제하지 않으면 **승인이 영구 스턱**된다.
- 🔴 **`Actor Authorization` 은 신설이 아니라 배선이다.** `acl_permission` 에 **`approve` 동작이 이미 있고**(TeamPermissions.php:39) 마케팅팀·영업팀·물류팀·재무팀 템플릿이 **실제로 부여**한다(:708,711,714,716,717). **없는 것은 권한이 아니라 그 권한을 읽는 코드다**(외부 판독 grep 0). 새 권한 축을 만들면 부여된 `approve` 는 영원히 죽고 권한 모델이 2벌이 된다(AL-19 위반).
  🟠 동시에 **`actor_type` 결번**을 닫아라 — 현행 `actorId` 는 `apikey:`/`user:` 를 **동등 계수**하여 **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배).
- 🔴 **Transactional Outbox 를 `omni_outbox` 로 대체 금지 — 이름만 같다.** `omni_outbox`(Omnichannel.php:74-93)는 **발송 메시지 큐**다. §42 가 요구하는 것은 **상태 변경과 후속 이벤트의 원자적 커밋**이다. 다만 **브로커·지연큐·타이머 서비스가 전부 부재하고 스케줄링이 OS cron 단일 수단**이므로, "동등한 신뢰성 패턴"의 구현 골격은 **DB 테이블 + cron 폴링**(`journey_cron.php:29-35` `*/5` · `install_crontab.sh` 정본 등재)뿐이다 — **이 골격 외 도입 금지.**
- 🔴 **완료 후 통지는 신설 금지·배선만.** `notification_channel` SSOT(Alerting.php:911)와 **폴백 체인**(:471-497 · 282차 "알림 통지 죽음" 수정분)이 **완비**되어 있고 **승인 이벤트↔통지 배선만 0**이다. `Alerting::pushEvent` 를 재사용하라.
  ⚠️ **282차 트랩**: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블에서 읽어 **무발송**이 됐던 전례가 있다 — 배선 후 실발송 검증 필수.
- 🔴 **완료를 만들고도 읽지 않으면 완료는 없는 것과 같다.** `Alerting::executeAction`(:601-660)의 `:612` 가 `status` 를 **SELECT 하고 어디서도 판독하지 않아** `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행**한다. 현재 VACUOUS(`INSERT INTO action_request` grep 0 = 생산자 전무)이나 **생산자 배선 시 즉시 활성**이다 — **§42 검증 11항을 구현하고도 집행 경로가 그것을 조회하지 않으면 동일 결함**이다. 참조 구현으로 삼지 마라.
- 🔴 **`Approval Task면 Decision이 생성되었는가`(#7)의 역전에 주의.** 현행은 Decision 이 **곧 완료**여서 검증 지점이 없다(Mapping.php:274-288 단일 UPDATE). §42 는 **완료와 Decision 을 분리하고 완료가 Decision 을 검증**할 것을 요구한다 — 이 분리 없이는 §41 Result 도 §40 Attempt 도 성립하지 않는다.
- 🔴 **6종 "있다고 가정"하고 배선 금지.** 특히 `Required Evidence`·`Required Form Field`·`Resource Version` 3종은 **인접 자산조차 없다** — 진짜 신설이다.

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
