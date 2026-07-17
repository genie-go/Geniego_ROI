# DSAR — Error Contract (§48·Error 35) · Warning Contract (§49·Warning 18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §48 · §49**
> ✅ **REQ 집계 일치**: Error **35** · Warning **18** — 원문 실측과 동일.
> 🔴 **`CONTRACT_ONLY` — 본 블록 구현·배선 0.**

## §0. 현행 실측 — 승인 에러 응답 **전수** (file:line)

### §0.1 `Mapping` — 자유문자열 `detail`

| # | 문자열(실측 원문) | 위치 | HTTP |
|---|---|---|---|
| 1 | `"requester identity unresolved"` | `Handlers/Mapping.php:188` | **403** |
| 2 | `"approver identity unresolved"` | `Handlers/Mapping.php:248` | **403** |
| 3 | `"proposal not found"` | `Handlers/Mapping.php:256`(approve) · `:306`(apply) | **404** |
| 4 | `"proposal is not pending (status={$curStatus})"` | `Handlers/Mapping.php:263` | **409** |
| 5 | `"self-approval is not allowed (maker-checker)"` | `Handlers/Mapping.php:269` | **403** |
| 6 | `"already approved by this approver"` | `Handlers/Mapping.php:280` | **409** |
| 7 | `"proposal not approved"` | `Handlers/Mapping.php:310`(apply 게이트) | **400** |

### §0.2 `Alerting` — 자유문자열 `detail`

| # | 문자열(실측 원문) | 위치 | HTTP |
|---|---|---|---|
| 8 | `"action_request not found"` | `Handlers/Alerting.php:586`(decideAction) | **404** |
| 9 | `"action_request not found"` | `Handlers/Alerting.php:616`(executeAction) | **404** |
| 10 | `"admin only"` | `Handlers/Alerting.php:671` | **403** |

### §0.3 🔴 봉투(envelope) 3갈래 — **동일 저장소·동일 도메인**

| 봉투 | 형태 | 실측 |
|---|---|---|
| A. `detail` 자유문자열 | `{"detail": "..."}` | `Mapping`(7종) · `Alerting`(3종) — **코드 없음** |
| B. **`code` + `detail` + `meta`** | `{"error":{...}, "meta":{request_id, timestamp, version}}` · `['code'=>$codeStr,'detail'=>$detail]` | **`AdminGrowth::fail`** `Handlers/AdminGrowth.php:181-184`(응답 조립 `:170-178`) |
| C. `error` 자유문자열 | `{"error": "..."}` | `Alerting.php:875,885,894`(422) — **같은 파일 안에서 A와 혼용** |

## §0.4 🔴 **집계 정정 — "에러 코드 체계 부재"는 과장이다**

**직접 grep 재확인 결과, 본 문서는 착수 시 전제를 다음과 같이 정정한다.**

| 주장 | 실측 판정 |
|---|---|
| `APPROVAL_*` 도메인 에러 코드 상수 **grep 0** | ✅ **사실** — `backend/src`·`frontend/src` 통틀어 `APPROVAL_*` 코드 상수 **0**. (`Approvals.jsx:602` `'APPROVAL_UPDATE'`는 **BroadcastChannel 메시지 타입**이지 에러 코드 아님 · `Mapping.php:31`은 문서 경로 주석) |
| "에러 **코드 체계**가 부재" | 🔴 **과장 — 정정.** `AdminGrowth::fail($res, $detail, $codeStr, $http)`(`AdminGrowth.php:181-184`)가 **`code` 문자열 체계를 실제로 구현**하고 있으며, **승인 경로에 실배선**되어 있다 |
| 실배선 증거(**승인 경로**) | `AdminGrowth::approvalDecide` `:1322` `'VALIDATION'`(422) · `:1326` `'NOT_FOUND'`(404) · `:1327` `'CONFLICT'`(409) — **승인 결정 핸들러가 세 코드를 실제로 반환한다** |
| 실측 코드 어휘 전수 | `VALIDATION`(422) · `NOT_FOUND`(404) · `CONFLICT`(409) · `SAVE_FAILED`(500) — `self::fail(` 호출부 **10곳**(`AdminGrowth.php:905,929,931,1016,1034,1051,1140,1322,1326,1327`) |
| "클라이언트가 문자열 파싱 외 분기 불가" | 🔴 **부분 과장.** `Mapping`·`Alerting` 경로는 사실이나, **`AdminGrowth` 경로는 `code`로 분기 가능**하다 |

> **★그러므로 판정은 `NOT_APPLICABLE(부재→신설)`이 아니라 존재·분산·불균등이다** — §52 기존 구현 분류의 대전제("승인은 부재가 아니라 존재·분산·불균등 — 통합이지 신설이 아니다")가 **에러 계약 축에서도 그대로 성립**한다.
> **★이 정정 자체가 본 문서의 핵심 산출이다.** 착수 전제는 "코드 체계 부재 → 신설"이었고, **그대로 믿었다면 `AdminGrowth::fail`을 무시한 채 두 번째 에러 봉투를 신설**해 중복 구현 금지 원칙을 위반했을 것이다(헌법 = Replace가 아니라 Extend). **부재 주장에도 부재증명이 필요하다**(경쟁 갭분석 원칙과 동형).

### §0.5 Warning 채널

| 대상 | 실측 | 분류 |
|---|---|---|
| **승인 도메인 Warning 채널** | **부재(grep 0)** — 승인 응답에 `warnings` 키를 담는 경로 **0** | **NOT_APPLICABLE(부재→신설)** |
| 인접 선례 | `warnings` 배열을 반환하는 유일 계통 = **Feed 도메인** — `FeedTransform::apply`(`FeedTransform.php:36,75` · `['mapped','errors','warnings']`) · `FeedTemplate.php:126,130,319,328` · 소비 `Catalog.php:1792,2216` | **VALIDATED_LEGACY**(★현행 유일한 "errors/warnings 분리 반환" 선례 · **승인 아님**) |
| 그 선례의 의미 | 저장소는 이미 **"차단하는 error"와 "통과시키되 알리는 warning"을 분리 반환하는 형태**를 한 도메인에서 구현했다 — Warning 축은 **개념 부재가 아니라 승인 미확산** | 재사용 대상 |

## §1. Error Contract — **원문 전사 35** (§48) + 현행 대조

| # | Error(원문) | 현행 대응 실측 (file:line) | HTTP 관행 | 분류 |
|---|---|---|---|---|
| 1 | APPROVAL_REQUEST_NOT_FOUND | ✅ **3곳 실재**(코드명만 부재) — `Mapping.php:256,306`("proposal not found") · `Alerting.php:586,616`("action_request not found") · `AdminGrowth.php:1326`(**`NOT_FOUND`**) | **404 정합** | **VALIDATED_LEGACY**(상태코드 보존·코드명 확장) |
| 2 | APPROVAL_REQUEST_INVALID | **부분** — `AdminGrowth.php:1322` `VALIDATION`(422 · decision 값 검증) | 422 | LEGACY_ADAPTER |
| 3 | APPROVAL_REQUEST_VERSION_NOT_FOUND | 🔴 부재 — Version 축 부재 | — | NOT_APPLICABLE |
| 4 | APPROVAL_REQUEST_DUPLICATE | **부분** — `AdminGrowth::createApproval` `:1292` pending 재사용(**에러 아님 · 조용히 재사용**) | (에러 미반환) | LEGACY_ADAPTER |
| 5 | APPROVAL_REQUEST_TENANT_MISMATCH | **부분** — `Mapping.php:253,302,307` · `Alerting.php:582,613` 이 `AND tenant_id=?`로 걸러 **404로 축약**(존재 은닉 = **의도된 IDOR 방어** · 208차). 🔴 `AdminGrowth`는 tenant 컬럼 자체 부재 | 404(축약) | ★VALIDATED_LEGACY(축약은 보안상 정당) / AdminGrowth=CONSOLIDATION_REQUIRED |
| 6 | APPROVAL_REQUEST_WORKSPACE_MISMATCH | 🔴 부재 — Workspace 레지스트리 부재(`tenant_kv` KV · `WorkspaceState.php:59`) | — | NOT_APPLICABLE |
| 7 | APPROVAL_REQUEST_LEGAL_ENTITY_MISMATCH | 🔴 부재(grep 0) | — | NOT_APPLICABLE |
| 8 | APPROVAL_REQUEST_ENVIRONMENT_MISMATCH | 🔴 부재 | — | NOT_APPLICABLE |
| 9 | APPROVAL_CASE_NOT_FOUND | 🔴 부재 — Case 축 부재(§4.2) | — | NOT_APPLICABLE |
| 10 | APPROVAL_CASE_INVALID | 🔴 부재 | — | NOT_APPLICABLE |
| 11 | APPROVAL_CASE_CROSS_TENANT | 🔴 부재 | — | NOT_APPLICABLE |
| 12 | APPROVAL_ITEM_NOT_FOUND | 🔴 부재 — Item 축 부재 | — | NOT_APPLICABLE |
| 13 | APPROVAL_REQUIREMENT_NOT_FOUND | 🔴 부재 — Requirement(§17) 축 부재 | — | NOT_APPLICABLE |
| 14 | APPROVAL_POLICY_REFERENCE_MISSING | 🔴 부재 — Policy Reference(§33) 부재 · `PlanPolicy` **fail-open**(`PlanPolicy.php:12` 주석 자인) | — | BLOCKED_POLICY_DRIFT |
| 15 | APPROVAL_RESOURCE_SNAPSHOT_MISSING | 🔴 부재(§30 grep 0) | — | NOT_APPLICABLE |
| 16 | APPROVAL_CONTEXT_SNAPSHOT_MISSING | 🔴 부재(§32 grep 0) | — | NOT_APPLICABLE |
| 17 | **APPROVAL_ACTOR_NOT_AUTHORIZED** | ✅ **실재(코드명만 부재)** — `Mapping.php:248-249`("approver identity unresolved" **403**) · `:188-189`("requester identity unresolved" 403) · `Alerting.php:671-672`("admin only" 403) | **403 정합** | **★VALIDATED_LEGACY** |
| 18 | APPROVAL_ACTOR_SCOPE_MISMATCH | 🔴 부재 — Required Scope 축 부재(`api_key.scopes_json` `Db.php:942-955`는 존재하나 승인 경로 미조회) | — | NOT_APPLICABLE |
| 19 | APPROVAL_ACTOR_ASSIGNMENT_EXPIRED | 🔴 부재 — Assignment 유효기간 축 부재(§4.6) | — | NOT_APPLICABLE |
| 20 | **APPROVAL_DECISION_DUPLICATE** | ✅ **실재(Mapping만)** — `Mapping.php:280-281`("already approved by this approver" **409**) · `AdminGrowth.php:1327` **`CONFLICT`**(409 "이미 처리된 항목입니다"). 🔴 `Alerting::decideAction` **부재**(무조건 append `:591`) | **409 정합** | ★VALIDATED_LEGACY / 🔴 Alerting=MIGRATION_REQUIRED |
| 21 | **APPROVAL_DECISION_ALREADY_FINAL** | ✅ **실재** — `Mapping.php:263-264`("proposal is not pending (status=…)" **409**) · `AdminGrowth.php:1327` `CONFLICT`(409) | **409 정합** | ★VALIDATED_LEGACY |
| 22 | APPROVAL_DECISION_REASON_REQUIRED | 🔴 부재 — 현행 승인은 **사유를 요구하지 않음**(§24 Decision Reason 축 부재) | — | NOT_APPLICABLE |
| 23 | APPROVAL_STATUS_TRANSITION_INVALID | **부분** — 승인 도메인 부재. 인접 = `FeedTemplate::transition` `must_approve_first` **409**(`FeedTemplate.php:248-285`) | 409(인접) | LEGACY_ADAPTER(축 상이) |
| 24 | APPROVAL_WITHDRAWN | 🔴 부재 — Withdrawal(§36) 축 부재 | — | NOT_APPLICABLE |
| 25 | APPROVAL_CANCELLED | 🔴 부재 — Cancellation(§37) 축 부재 | — | NOT_APPLICABLE |
| 26 | APPROVAL_EXPIRED | 🔴 부재 — 만료 컬럼 부재 | — | NOT_APPLICABLE |
| 27 | APPROVAL_SUPERSEDED | 🔴 부재 — Supersession(§39) 축 부재 | — | NOT_APPLICABLE |
| 28 | APPROVAL_RESOURCE_VERSION_CHANGED | 🔴 부재 — Version 축 부재(§4.4·§4.5 미충족) | — | NOT_APPLICABLE |
| 29 | APPROVAL_AMOUNT_EXCEEDED | 🔴 부재 — 승인 금액 대조 대상 없음(`Alerting.php:626,634`) | — | NOT_APPLICABLE |
| 30 | APPROVAL_CURRENCY_MISMATCH | 🔴 부재 — 재사용 후보 `Connectors::fxToKrw`(`Connectors.php:1749`) | — | NOT_APPLICABLE |
| 31 | APPROVAL_ACTION_MISMATCH | 🔴 부재 — `Alerting.php:625` 실행 시점 blob 해석 | — | NOT_APPLICABLE |
| 32 | APPROVAL_SCOPE_EXCEEDED | 🔴 부재 | — | NOT_APPLICABLE |
| 33 | APPROVAL_EXECUTION_LIMIT_EXCEEDED | 🔴 부재 — 상한 개념 부재([Consumption 문서](DSAR_APPROVAL_CONSUMPTION.md)) | — | NOT_APPLICABLE |
| 34 | APPROVAL_RECONCILIATION_FAILED | 🔴 부재 — Reconciliation 엔진 부재(§43) | — | NOT_APPLICABLE |
| 35 | **APPROVAL_RUNTIME_BLOCKED** | **부분** — `Mapping.php:310-311`("proposal not approved" **400**)이 실행 차단. 🔴 인접 킬스위치 차단은 **에러가 아니라 상태값** `'execution_disabled'` 반환(`AdAdapters.php:195` · `:1799`) | 400 | LEGACY_ADAPTER |

**대조 집계 — Error 35종 중 실재 4종(#1·#17·#20·#21) · 부분 5종(#2·#4·#5·#23·#35) · 부재 26종.**
🔴 실재 4종도 **코드명이 아니라 자유문자열**이며, #20은 **`Mapping`에만** 있다.

> **★HTTP 상태코드 관행은 이미 정합하다.** 실재·부분 9종의 상태코드(**403 미인가 · 404 부재 · 409 충돌 · 422 검증**)는 §48이 함축하는 의미론과 **어긋나지 않는다**. 즉 저장소가 틀린 코드를 쓰고 있어서 고쳐야 하는 것이 아니라, **맞는 코드에 이름표가 없을 뿐**이다.

## §2. Warning Contract — **원문 전사 18** (§49) + 현행 대조

🔴 **전제: 승인 도메인 Warning 채널 자체가 부재(grep 0)** → 아래 18종은 **전부 부재**다. 개별 대조는 "이 경고를 낼 자리가 있는가"를 기록한다.

| # | Warning(원문) | 현행 — 경고를 낼 자리 |
|---|---|---|
| 1 | APPROVAL_REQUEST_WARNING | 부재 — 요청 축은 있으나 경고 채널 없음 |
| 2 | APPROVAL_REQUEST_VERSION_WARNING | 부재 — Version 축 부재 |
| 3 | APPROVAL_RESOURCE_VERSION_WARNING | 부재 — Resource Version 축 부재(§4.5 재승인 검토 트리거 부재) |
| 4 | APPROVAL_CONTEXT_STALE_WARNING | 부재 — Context Snapshot(§32) 축 부재 |
| 5 | APPROVAL_POLICY_VERSION_WARNING | 부재 — Policy Version(§33) 부재 · `PlanPolicy` fail-open |
| 6 | APPROVAL_PARTICIPANT_WARNING | 부재 — Participant(§19) 축 부재 |
| 7 | APPROVAL_ACTOR_ROLE_WARNING | 부재 — 재료(`TeamPermissions::ACTIONS['approve']` `:39` · `acl_permission`)는 있으나 **승인 경로 미조회**(호출부 grep 0 = 고아) |
| 8 | APPROVAL_ACTOR_SCOPE_WARNING | 부재 — Scope 축 부재 |
| 9 | APPROVAL_DECISION_WARNING | 부재 — Decision 테이블 부재 |
| 10 | APPROVAL_CONDITIONAL_WARNING | 부재 — Conditional Approval(§25) 축 부재 |
| 11 | APPROVAL_WITHDRAWAL_WARNING | 부재 — Withdrawal(§36) 축 부재 |
| 12 | APPROVAL_CANCELLATION_WARNING | 부재 — Cancellation(§37) 축 부재 |
| 13 | APPROVAL_REOPEN_WARNING | 부재 — Reopen(§38) 축 부재 |
| 14 | APPROVAL_SUPERSESSION_WARNING | 부재 — Supersession(§39) 축 부재 |
| 15 | APPROVAL_EXECUTION_BINDING_WARNING | 부재 — Binding(§40) 축 부재 |
| 16 | APPROVAL_CONSUMPTION_WARNING | 부재 — Consumption(§41) 축 부재 |
| 17 | APPROVAL_RECONCILIATION_WARNING | 부재 — 🔴 **드리프트는 이미 2건 실측**되나 경고를 낼 채널이 없다([Reconciliation 문서](DSAR_APPROVAL_RECONCILIATION.md) §0) |
| 18 | APPROVAL_MANUAL_REVIEW_REQUIRED | **부재(경고)** — 단 인접 상태값 존재: `Alerting.php:628` `approved_manual` + 메시지 "이 액션 유형은 자동 집행 대상이 아니라 수동 처리가 필요합니다"(`:652`). 🔴 **상태값이지 경고가 아니다**(축 상이) |

**대조 집계 — Warning 18/18 전부 부재. 커버리지 0/18.**
🔴 #18은 **가장 가까운 인접**이나 상태값이며, 이를 "Warning 1종 존재"로 세면 축 혼합이다.

## §3. 판정

| 축 | 판정 | 근거 |
|---|---|---|
| **`APPROVAL_*` 도메인 에러 코드** | **NOT_APPLICABLE(부재 → 신설)** | grep 0 |
| **에러 코드 봉투(`code`/`detail`/`meta`)** | 🔴 **VALIDATED_LEGACY(존재 → 확장)** — **부재 아님** | `AdminGrowth::fail` `:181-184` · 승인 경로 실배선 `:1322,1326,1327` |
| **HTTP 상태코드 관행(403/404/409/422)** | **★VALIDATED_LEGACY(보존·확장)** | 실재 9종 전부 §48 의미론과 정합 — **재정의 금지** |
| **봉투 3갈래 혼재(A/B/C)** | **CONSOLIDATION_REQUIRED** | `Mapping`/`Alerting` = A · `AdminGrowth` = B · `Alerting.php:875,885,894` = C |
| **Warning 채널(승인)** | **NOT_APPLICABLE(부재 → 신설)** | grep 0 |
| **Warning 분리반환 패턴** | **VALIDATED_LEGACY(재사용)** | `FeedTransform.php:36,75`(`errors`/`warnings` 분리) |

## §4. 규칙

- 🔴 **★두 번째 에러 봉투를 신설하지 않는다** — `AdminGrowth::fail`(`:181-184`)의 `code`+`detail`+`meta(request_id/timestamp/version)` 형태가 **이미 승인 경로에서 동작 중**이다. Canonical Error Contract는 **신설이 아니라 이 봉투를 공용 추출**하고 `Mapping`·`Alerting`의 자유문자열을 그 위로 흡수하는 것이다(헌법 Golden Rule = Replace가 아니라 Extend · 중복 구현 절대 금지).
- **★HTTP 상태코드를 재정의하지 않는다**(무후퇴) — 403/404/409/422 관행은 **이미 정합**하다. `APPROVAL_*` 코드는 **상태코드를 대체하는 것이 아니라 그 위에 이름을 붙이는 것**이다. 상태코드를 바꾸면 기존 클라이언트가 깨진다.
- **★#5 tenant mismatch의 404 축약을 "부정확한 코드"로 교정하지 않는다** — 존재 은닉은 **208차 P0 IDOR 방어가 의도한 동작**이다. `APPROVAL_REQUEST_TENANT_MISMATCH`를 **응답으로 노출하면 타 테넌트 리소스의 존재가 새어나간다**. 이 코드는 **내부 감사·Reconciliation 축에서만** 쓰고 응답은 404를 유지한다. 🔴 이를 "코드 누락"으로 재플래그 금지(FP 레지스트리 대상).
- **기존 에러 문자열을 개명·제거하지 않는다**(무후퇴) — Canonical 코드로 **매핑**하되 `detail` 문자열의 연속성을 끊지 않는다. 프론트가 문자열에 의존 중일 수 있다.
- 🔴 **`Alerting` 계열은 본 블록 미수정** — **비파괴·코드변경 0** · 별도 승인 세션.
- **Warning은 error가 아니다** — 경고를 이유로 승인을 차단하면 §48/§49 분리가 무의미해진다. 반대로 **차단해야 할 것을 경고로 낮추지 않는다**(Fail-closed 원칙 · Unknown ≠ 통과).
- 🔴 **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Warning 채널이 없는 동안 UI에 경고 배지를 노출하지 않고, `APPROVAL_*` 코드가 없는 동안 프론트에 **코드 기반 분기를 선반영하지 않는다**(응답에 없는 코드로 분기 = 죽은 코드).
- 🔴 **본 문서는 `CONTRACT_ONLY`** — 구현·배선 **0**. 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
