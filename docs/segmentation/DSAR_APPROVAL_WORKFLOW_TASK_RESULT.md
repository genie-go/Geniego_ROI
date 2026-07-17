# DSAR — Task Result (§41)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §41 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_TASK_RESULT` 엔티티 | `task_result` **grep 0** — 결과를 Attempt 와 분리해 보관하는 개념 전무 | `NOT_APPLICABLE`(부재 → 신설) |
| 결과 = 상태에 융합 | 현행 승인은 **결과 엔티티 없이 원 행의 `status` 를 덮어쓴다** — `Mapping::approve`:288 `UPDATE mapping_change_request SET approvals_json=?, status=?` · `AdminGrowth::approvalDecide`:1324 · `Alerting::decideAction` | `NOT_APPLICABLE` |
| 승인 결정 기록 | **`mapping_change_request.approvals_json`**(Mapping.php:274,288 — `["user"=>$actor, "ts"=>gmdate('c')]` 배열 누적) = **레포 유일의 승인자별 결정 이력** | `LEGACY_ADAPTER`(결정 이력 원형) |
| 결정 유형 | 현행 = **approved / pending 2값**(`Mapping::approve`:287 `count($approvals) >= required_approvals ? "approved" : "pending"`) + `reject` 경로. **원문 14종 대비 대부분 결번** | `NOT_APPLICABLE` |
| 🔴 immutable hash | 결과 해시·불변 봉인 **grep 0**. 인접 = `paddle_events` 원문 보관(Paddle.php:343) · `settings_json`(AdAdapters.php:1199) = **원문 보관이지 해시 봉인 아님** | `NOT_APPLICABLE` |
| next transition hint | **grep 0** — 전이 힌트 개념 전무. 전이 규칙 선언 자체가 0(`UPDATE ... SET status=` **155건/44파일** 전부 호출 지점 인라인 · 전이 가드는 **4곳뿐**: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `NOT_APPLICABLE` |
| 잡 결과 컬럼(형태 유사) | `channel_shipment_job.result`(ChannelSync.php:6145 `json_encode($res)`) · `catalog_writeback_job.result`(Catalog.php:1679) — **잡 응답 원문**(가변·비봉인) | `KEEP_SEPARATE_WITH_REASON` |
| 🔴 가짜 결과 선례 | **`action_request`** — `listActionRequests` 는 `required_approvals:2` 를 응답하나 `decideAction` 은 **1명에 approved**(Alerting.php:562) = **계약 위반이 이미 존재**. `INSERT INTO action_request` **grep 0 = 생산자 전무** | `VACUOUS` |

**★축 주의 — 결과 엔티티의 부재가 결정 이력의 부재는 아니다.** `approvals_json`(Mapping.php:274)은 승인자·시각을 누적하는 **실 결정 이력**이다. 그러나 이것은 **§41 Result 가 아니다**: ① Attempt 와 무관하게 원 행에 융합 ② 결과 **유형**이 없음(approved/pending 2값) ③ **불변 봉인 없음**(`UPDATE`:288 로 통째 덮어씀 · **status 가드도 없어 동시 승인 시 lost update 가능**) ④ 산출물·증거 참조 없음. **형태 유사를 커버로 계산하면 역산**이다 → `LEGACY_ADAPTER`(원형)로만 인용한다.

**★`immutable hash` 요구의 실증.** `Mapping::approve`:288 의 `UPDATE ... SET approvals_json=?, status=? WHERE id=? AND tenant_id=?` 에는 **status·version 가드가 없다**. 즉 승인 결과는 **덮어쓰기 가능한 가변 JSON** 이다. 원문이 결과를 **별도 엔티티 + `immutable hash`** 로 못박은 이유가 현행에 실재한다.

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | task_result_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_task_id | 부재(§36 Task 자체 부재) | `NOT_APPLICABLE` |
| 3 | task_attempt_id | 부재(§40 Attempt 자체 부재) | `NOT_APPLICABLE` |
| 4 | result type | 부재 — 현행 2값(approved/pending Mapping.php:287) + reject. 원문 14종 대비 결번(아래 Type 표) | `NOT_APPLICABLE` |
| 5 | output reference | 부재 · 형태 유사 = 잡 `result` 컬럼(ChannelSync.php:6145 · Catalog.php:1679 `json_encode` 응답 원문) | `KEEP_SEPARATE_WITH_REASON` |
| 6 | approval decision reference | 부재(참조) · **인접 원형 = `approvals_json`**(Mapping.php:274,288 `["user"=>$actor,"ts"=>...]`) — **참조가 아니라 원 행 내 융합** | `LEGACY_ADAPTER` |
| 7 | evidence references | 부재 — 증거 참조 개념 전무. 인접 감사 = `Mapping::audit`(:292) · `journey_node_logs`(JourneyBuilder.php:50,69) = **감사로그이지 결과가 가리키는 증거 참조 아님** | `NOT_APPLICABLE` |
| 8 | next transition hint | **grep 0** — 전이 규칙 선언 0(155건/44파일 인라인 · 전이 가드 4곳뿐) | `NOT_APPLICABLE` |
| 9 | completed by | 부재(Result) · 인접 = `approvals_json` 의 `user`(Mapping.php:274 = `Mapping::actorId`:36-50 위조불가 신원) | `LEGACY_ADAPTER`(신원 해석 위임) |
| 10 | completed at | 부재(Result) · 인접 = `approvals_json` 의 `ts`(Mapping.php:274 `gmdate('c')`) | `LEGACY_ADAPTER` |
| 11 | immutable hash | **grep 0** — 현행 결과는 **가변**(Mapping.php:288 무가드 덮어쓰기) | `NOT_APPLICABLE` |
| 12 | status | 부재(Result) — Result 행 자체가 없음 | `NOT_APPLICABLE` |
| 13 | evidence | 부재 · 인접 감사 = `Mapping::audit`(:292 `"mapping_approve", ["id"=>$id,"status"=>$status]`) | `LEGACY_ADAPTER`(감사 기록 위임) |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 8 · 인접 위임(`LEGACY_ADAPTER`) 4 · 형태유사 분리(`KEEP_SEPARATE_WITH_REASON`) 1 · **현행 충족 0**.

## 1-2. 원문 Result Type 전사 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SUCCESS | 부재(Result) · 형태 유사 = 잡 `status='done'`(AdAdapters.php:1217 · ChannelSync.php:6168) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | APPROVED | **인접 실값 존재** = `Mapping::approve`:287 `"approved"`(정족수 충족 시) · `AdminGrowth::approvalDecide`(:1322-1327) | `LEGACY_ADAPTER`(값 이식) |
| 3 | REJECTED | 인접 실값 = `Mapping` reject 경로 · `Alerting` `rejected`(Alerting.php:612 맥락) | `LEGACY_ADAPTER` |
| 4 | CONDITIONALLY_APPROVED | **부재** — 조건부 승인 개념 grep 0 | `NOT_APPLICABLE` |
| 5 | CHANGES_REQUIRED | **부재** — 보완 요청 개념 grep 0 | `NOT_APPLICABLE` |
| 6 | RETURNED | **부재** — 반려(재제출 가능) 개념 grep 0. 현행 reject 는 **종결**이며 재제출 경로 없음 | `NOT_APPLICABLE` |
| 7 | REVIEW_COMPLETED | **부재** — Review/Approval 미분화(§12 `REVIEW_TASK` 부재와 짝) | `NOT_APPLICABLE` |
| 8 | WAITING | 부재(Result) · **인접 규율 = defer≠실패**(Omnichannel.php:349-350,362-363 attempts 미증가 재큐) · honest pending(ChannelSync.php:6173 · Catalog.php:1712) | `LEGACY_ADAPTER`(**규율 이식**) |
| 9 | RETRY | 부재(Result) · 인접 = `ad_delivery_dlq` `status='pending'`+`next_retry_at`(AdAdapters.php:1220-1224) | `LEGACY_ADAPTER` |
| 10 | FAILED | 부재(Result) · 형태 유사 = 잡 `status='failed'`(AdAdapters.php:1220 `$attempts >= $maxAttempts`) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | CANCELLED | **부재**(승인) · 인접 취소 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 12 | EXPIRED | **부재**(승인 결과) · 인접 = stale 리스 회수(Omnichannel.php:395 900s · ChannelSync.php:6136 600s) = **워커 회수이지 결과 만료 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 13 | BLOCKED | **부재** · 인접 차단 = `AdAdapters::executionEnabled`(:34-40 킬스위치 · 호출부 9곳 REAL) · `BillingMethod::hasActiveMethod`(AdAdapters.php:1213) = **집행 게이트이지 Task 결과 아님** | `LEGACY_ADAPTER`(게이트 재사용) |
| 14 | MANUAL_REVIEW | **부재** — 수동 검토 승격 경로 grep 0 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 6 · 인접 위임(`LEGACY_ADAPTER`) 5 · 형태유사 분리(`KEEP_SEPARATE_WITH_REASON`) 3 · **현행 충족 0**.
**★현행 승인 결정 유형은 실질 3값(approved/pending/rejected)이며 원문 14종 중 11종이 결번이다.**

## 2. 규칙

- 🔴 **Result 를 원 행 `status` 에 융합 금지 — 별도 엔티티로 신설하라.** 현행 4종 전부 결과를 원 행에 덮어쓴다(`Mapping`:288 · `AdminGrowth`:1324). 그 결과 ① Attempt 별 결과 추적 불가 ② 결과 변조 탐지 불가 ③ **동시 승인 시 lost update**(:288 무가드). §41 이 Result 를 독립 엔티티 + `immutable hash` 로 요구하는 이유다.
- 🔴 **`immutable hash` 를 "원문 보관"으로 대체 금지.** `paddle_events` 원문 보관(Paddle.php:343)·`settings_json`(AdAdapters.php:1199)은 **가변 저장**이다. 봉인(hash)은 **저장 후 변경을 탐지**하는 능력이며 레포에 **grep 0** — 진짜 신설이다.
- 🔴 **`WAITING` 을 `FAILED` 로 위장 금지 — defer≠실패 규율 계승.** `Omnichannel`:349-350,362-363 이 **보류를 시도 실패로 세지 않는다**(attempts 미증가 재큐). 승인 Result 에서 이를 어기면 **승인자 부재·조건 미도래가 재시도 소진 → `FAILED`** 로 귀결되어 승인이 조용히 죽는다. 마찬가지로 **honest pending**(ChannelSync.php:6173 · Catalog.php:1712)은 **처리 수단이 없을 때 `done` 도 `failed` 도 찍지 않는다** — `WAITING`/`RETRY`/`BLOCKED` 3종이 이 규율의 명시적 표현이다.
- 🔴 **`APPROVED` 값 이식은 `Mapping::approve` 5단 규율과 분리 불가.** 값(`"approved"` :287)만 베끼고 규율(위조불가 신원 fail-closed :245-250 → 자기승인 차단 :268-271 → 승인자 dedup :278-284 → 비-pending 409 :262-266 → 정족수 :287)을 빠뜨리면 **289차 G-01 이 닫은 우회로(익명 2회 = 정족수)를 다시 연다.** **재작성이 아니라 공용 추출(위치 이동)이다.**
- 🔴 **`action_request` 를 참조 구현으로 삼지 마라 — 가짜 결과의 표본이다.** `listActionRequests` 는 `required_approvals:2` 를 응답하나 `decideAction` 은 **1명에 approved**(Alerting.php:562 리터럴 `2` = 장식) → **계약 위반이 이미 존재**. `INSERT INTO action_request` **grep 0 = 생산자 전무 = 한 번도 채워진 적 없음**(`VACUOUS`). §41 은 **결과 유형을 응답에 적는 것과 실제로 그 유형을 판정하는 것이 다르다**는 교훈의 자리다.
  🔴 나아가 `Alerting::executeAction`(:601-660)은 `:612` 에서 `status` 를 **SELECT 하고 어디서도 판독하지 않아** `pending`·`rejected` **Result 도 실집행**한다(`AdAdapters::pause`:631 / `updateBudget`:634). 현재 VACUOUS 이나 **생산자 배선 시 즉시 활성** — **Result 를 만들고도 그것을 읽지 않으면 Result 는 없는 것과 같다.**
- 🔴 **`next transition hint` 는 전이 규칙 선언과 함께 도입하라.** 현행은 `UPDATE ... SET status=` **155건/44파일**이 전부 인라인이고 전이 가드는 **4곳뿐**이다. 힌트만 만들고 그것을 소비하는 선언적 전이가 없으면 **`required_approvals` 처럼 매핑 1회 후 참조 0인 dead field**(`Approvals.jsx:576` 선례)가 된다.
- **`BLOCKED` 의 게이트는 `AdAdapters::executionEnabled`(:34-40) 재사용** — 호출부 9곳 실배선 REAL. 두 번째 킬스위치 금지.
  ⚠️ 오탐 주의: `pause()` 킬스위치 면제는 **279차 D-P1 의도된 설계**(지출을 늘리는 방향만 차단) — 재플래그 금지.
- 🔴 **14종 전부 "있다고 가정"하고 배선 금지.** 특히 `CONDITIONALLY_APPROVED`·`CHANGES_REQUIRED`·`RETURNED`·`REVIEW_COMPLETED`·`MANUAL_REVIEW` 5종은 **현행에 인접 자산조차 없다** — 진짜 신설이다.
- ⚠️ **`evidence` 는 부록이 아니다.** 원문 필드 목록의 **마지막 항목**이며 13번째 필수 필드다. `evidence references`(#7)와 **별개 항목**임에 주의 — 원문은 둘을 모두 나열한다.
