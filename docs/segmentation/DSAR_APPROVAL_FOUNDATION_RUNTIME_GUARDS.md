# DSAR — 최소 Runtime Guard (§47·Guard 30)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §47**
> ✅ **REQ 집계 일치**: Guard **30** — 원문 실측과 동일.
> 🔴 **`CONTRACT_ONLY` — 본 블록 구현·배선 0.** 아래 표의 "존재"는 **인접 핸들러의 기존 동작 실측**이며 **Canonical Approval Guard의 구현이 아니다**. 이 문서는 가드를 **만들지 않는다**.

## §0. 현행 실측 — 가드는 **한 핸들러에만** 있다 (file:line)

| 심볼 | 가드 실측 | 분류 |
|---|---|---|
| **★`Mapping::approve`** `Handlers/Mapping.php:238-294` | **현행 유일한 다중 가드 4종**: 신원 미확인 **403**(`:246-252`) · 자기승인 **403**(`:267-271`) · 동일 actor 재승인 **409**(`:277-284`) · pending 아니면 **409**(`:260-264`) | **★VALIDATED_LEGACY**(정본 패턴) |
| **`Mapping::apply`** `Handlers/Mapping.php:296-327` | 실행 전 승인 게이트 `:309` `if ($r["status"] !== "approved")` → **400 거부**. 현행 **유일**한 실행 전 게이트 | **★VALIDATED_LEGACY** |
| 🔴 **`Alerting::executeAction`** `Handlers/Alerting.php:601-660` | `:612` `SELECT action_json, status` — status를 **가져오나 어디서도 판독 안 함**(죽은 읽기) → `pending`·`rejected` 도 `AdAdapters::pause`(`:631`)/`updateBudget`(`:634`) **실집행**. **가드 0** | **🔴 MIGRATION_REQUIRED** |
| 그 결함의 **도달성** | `INSERT INTO action_request` grep **0** → 생산자 전무 → **현재 도달 불가(VACUOUS)**. **생산자 배선 시 즉시 활성 결함** | **VACUOUS**(별도 승인 세션) |
| 🔴 `Alerting::decideAction` `Handlers/Alerting.php:572-599` | 테넌트 소유 검증(`:581-582`)만. **후보·자기승인·dedup·정족수 전부 미검사** · `:595` 첫 결정으로 즉시 `approved` | **MIGRATION_REQUIRED** |
| **208차 IDOR 차단** | `Alerting::tenantOf` → `WHERE id=? AND tenant_id=?`(`Alerting.php:582` · `:613`) — 타 테넌트 액션 승인/실행 차단 | **VALIDATED_LEGACY**(Tenant 축 **유일 실배선 가드**) |
| 🔴 `Alerting::actor` `Handlers/Alerting.php:33-36` | **클라이언트 `X-User-Email` 헤더 / `?actor=` 쿼리 → 기본 `'unknown'`** = **위조 가능**. Mapping이 289차에 고친 결함이 **미전파** | **MIGRATION_REQUIRED** |

> **★대조가 말하는 것**: 가드는 **부재가 아니라 단 한 도메인(mapping)에만 존재**한다. 같은 저장소가 한쪽에선 4중 가드를 걸고, 다른 쪽에선 status를 읽고도 버린다. 신설이 아니라 **정본 패턴의 확산**이 답이다(Golden Rule = Extend).

## §0.1 🔴 Kill Switch 실재 여부 — **직접 grep 판정 결과**

**판정: 승인 도메인 Kill Switch = 부재. 광고 집행 도메인 Kill Switch = ★실재(REAL).**

| 항목 | 실측 |
|---|---|
| **실재 확인** | `AdAdapters::executionEnabled()` `Handlers/AdAdapters.php:34-40` — `getenv('AD_EXECUTION_DISABLED')==='1'`(`:36` 긴급 킬스위치) · `getenv('AD_EXECUTION_ENABLED')==='0'`(`:37` 명시적 비활성) → `false` |
| **배선 실측(주석 아님)** | 호출부 **9곳**: `AdAdapters.php:55`(autoMode) · `:194`(createCampaign) · `:240` · `:331` · `:355` · `:1083` · `:1213` · `:1799`(syncAudience) · `:1820` — 추가로 `AutoCampaign.php:411`(상태 노출) · `:533`(집행 게이트) |
| **정직한 실패** | 차단 시 `status='execution_disabled'` 반환(`:195` · `:1799`) — 무음 성공 아님(288차 가짜녹색 기준 충족) |
| **★설계된 비대칭(오탐 주의)** | `AdAdapters::pause()` `:267-270`는 **의도적으로 킬스위치 면제**. 279차 D-P1 감사가 "킬스위치는 **지출을 늘리는 방향**(create/activate/증액)만 차단해야 한다 — 정지는 안전 방향"으로 **명시 수정한 결과**다. 🔴 **이를 "가드 누락"으로 재플래그 금지**(FP 레지스트리 대상) |
| **승인 도메인 배선** | 🔴 **0** — `Mapping::approve`·`Alerting::decideAction`·`AdminGrowth::approvalDecide` 어디서도 `executionEnabled()` 미호출. 승인 자체를 멈추는 스위치는 **없다** |
| **스코프 한계** | **env 전역**(프로세스 단위) — **테넌트별·도메인별 kill 불가**. `feature_flag` 레지스트리 grep **0** |
| **`ClaudeAI.php:953,967,973` 주석** | "killswitch 내장"이라 **주장**하나, 실 경로는 `AdAdapters::pause`(**면제 대상**) → 🔴 **주석의 주장 ≠ 실효**. 코파일럿 pause 경로는 킬스위치로 멈지 않는다(설계상 정상) |

> **★289차 ① `guard_headerless_getjson` 교훈 적용**: 본 절은 **주석·이름이 아니라 호출부 9곳과 면제 1곳을 세어** 판정했다. `ClaudeAI` 주석만 읽었다면 "코파일럿에 킬스위치 있음"으로 **오판**했을 것이다. **파일 존재 ≠ 배선 ≠ 실효.**
> **결론**: §47 #30(Kill Switch 활성)은 **인접 도메인에 검증된 구현이 실재**하므로 **VALIDATED_LEGACY로 재사용**한다 — 승인용 킬스위치를 **별도 신설 금지**. 단 **현재 승인 경로에 미배선**이므로 **커버리지로 계상하지 않는다**.

## §1. Guard 30종 — **원문 전사** + 현행 대조

원문(§47) 도입부: **다음을 차단하라.**

| # | Guard(원문) | 현행 차단 여부 (file:line) | 분류 |
|---|---|---|---|
| 1 | Approval Request Not Found | ✅ **존재(3곳)** — `Mapping.php:255-258`(404) · `Alerting.php:615-618`(404) · `AdminGrowth.php:1326`(404 · `NOT_FOUND`) | VALIDATED_LEGACY |
| 2 | Approval Case Not Found | 🔴 미차단 — **Case 축 자체 부재**(§4.2) | NOT_APPLICABLE |
| 3 | Approval Item Not Found | 🔴 미차단 — Item 축 부재(현행 전부 단일 레코드 1건 승인) | NOT_APPLICABLE |
| 4 | Request Not Active | **부분** — `Mapping.php:260-264` pending 아니면 **409**. 🔴 `Alerting::decideAction`은 **status 미검사**(종결건 재결정 가능) | ★Mapping=VALIDATED_LEGACY / Alerting=MIGRATION_REQUIRED |
| 5 | Case Not Active | 🔴 미차단 — Case 축 부재 | NOT_APPLICABLE |
| 6 | Invalid Status Transition | **부분** — 인접 선례 `FeedTemplate::transition`(`FeedTemplate.php:248-285`) `draft→submitted→approved→published` 순차 강제·역행 차단·`must_approve_first` **409**. 🔴 승인 도메인엔 **State Machine 부재**(BPMN/Temporal/Camunda/Flowable/Zeebe/Step Functions `backend/src` grep **0**) | LEGACY_ADAPTER(축 상이) |
| 7 | **Tenant Mismatch** | ✅ **존재(승인 3계통)** — `Mapping.php:253`·`:302`·`:307` · `Alerting.php:582`·`:613`(208차 P0 IDOR) 전부 `WHERE ... AND tenant_id=?`. 🔴 **예외 = `AdminGrowth`** — `admin_growth_approval`에 **`tenant_id` 컬럼 자체가 없어**(`AdminGrowth.php:142-149`) `approvals`(`:1299-1310`)·`approvalDecide`(`:1325`)가 **전역 조회** | ★VALIDATED_LEGACY / 🔴 AdminGrowth=CONSOLIDATION_REQUIRED |
| 8 | Workspace Mismatch | 🔴 미차단 — Workspace 실체는 `tenant_kv` KV(`WorkspaceState.php:59`) · **레지스트리 부재** | NOT_APPLICABLE |
| 9 | Legal Entity Mismatch | 🔴 미차단 — Legal Entity 축 grep **0** | NOT_APPLICABLE |
| 10 | Environment Mismatch | 🔴 미차단 — 승인 도메인 environment 축 부재 | NOT_APPLICABLE |
| 11 | Resource Version Mismatch | 🔴 미차단 — Resource Version 축 부재(§4.4 미충족) | NOT_APPLICABLE |
| 12 | Request Version Mismatch | 🔴 미차단 — Request Version 축 부재 | NOT_APPLICABLE |
| 13 | Approval Requirement Missing | 🔴 미차단 — Requirement(§17)·Requirement Source(§18) 축 부재 | NOT_APPLICABLE |
| 14 | Actor Role Invalid | 🔴 **미차단** — 재료는 존재하나(`api_key.role`·`scopes_json` `Db.php:942-955` · 미들웨어 주입 `index.php:591-593` · `TeamPermissions::ACTIONS['approve']` `:39`) **승인 경로에서 role 검사 grep 0**. `'approve'` 권한은 **상수·시드에만 있는 고아**(호출부 0) | 🔴 CONSOLIDATION_REQUIRED(데이터만 있는 고아) |
| 15 | Actor Scope Invalid | 🔴 미차단 — Required Scope 축 부재 | NOT_APPLICABLE |
| 16 | Actor Assignment Expired | 🔴 미차단 — Assignment 유효기간 축 부재(§4.6 미충족) | NOT_APPLICABLE |
| 17 | **Actor Authentication Insufficient** | ✅ **존재(1곳·정본)** — `Mapping::actorId`(`:36-53`)가 `auth_key`(미들웨어 SHA-256 검증 후 주입) → `apikey:{id}` · `UserAuth::authedUser` → `user:{email}` · **미확인 = null → 403 fail-closed**(`:246-252`). 🔴 `Alerting::actor`(`:33-36`)는 **헤더 위조 가능 → 'unknown'** | ★Mapping=VALIDATED_LEGACY / 🔴 Alerting=MIGRATION_REQUIRED |
| 18 | Decision Already Final | **부분** — `Mapping.php:260-264`(pending 아니면 409)가 사실상 커버. 🔴 `Alerting::decideAction` 미차단 | ★Mapping=VALIDATED_LEGACY / Alerting=MIGRATION_REQUIRED |
| 19 | **Duplicate Decision** | **부분** — `Mapping.php:277-284` 동일 actor 재승인 **409**(289차 G-01). 🔴 `Alerting::decideAction`은 `approvals_json`에 **무조건 append**(`:591`) — dedup **0**. 인접 = `AdminGrowth::createApproval` pending 재사용(`:1292` · **요청측** dedup) | ★Mapping=VALIDATED_LEGACY / 🔴 Alerting=MIGRATION_REQUIRED |
| 20 | Approval Expired | 🔴 미차단 — 만료 컬럼 부재(`Db.php:592-600` · `:623-636`) | NOT_APPLICABLE |
| 21 | Approval Withdrawn | 🔴 미차단 — Withdrawal(§36) 축 부재 | NOT_APPLICABLE |
| 22 | Approval Cancelled | 🔴 미차단 — Cancellation(§37) 축 부재. 인접 revoke 선례 = `agency_client_link`(`AgencyPortal.php:68,80` · **매 요청 approved 재검증 fail-closed** `:427`) | NOT_APPLICABLE(선례는 LEGACY_ADAPTER) |
| 23 | Approval Superseded | 🔴 미차단 — Supersession(§39) 축 부재. 인접 = `catalog_writeback_job.status='superseded'`(`Catalog.php:1188`) **승인 아님** | NOT_APPLICABLE |
| 24 | Approved Amount Exceeded | 🔴 **미차단** — 승인 금액 컬럼 부재. `Alerting.php:626`이 blob `daily_budget`을 읽어 `:634` `updateBudget`에 **그대로 전달**. 대조 대상 없음 | NOT_APPLICABLE |
| 25 | Approved Currency Mismatch | 🔴 미차단 — 승인 통화 축 부재. 재사용 후보 = `Connectors::fxToKrw`(`Connectors.php:1749` · 24통화 + `app_setting` 24h 캐시) | NOT_APPLICABLE(환산기는 VALIDATED_LEGACY) |
| 26 | Approved Action Mismatch | 🔴 미차단 — `Alerting.php:625`가 **실행 시점** blob `type` 해석. 승인된 action과 대조 없음 | NOT_APPLICABLE |
| 27 | Approved Scope Exceeded | 🔴 미차단 — Scope 축 부재 | NOT_APPLICABLE |
| 28 | Approval Execution Count Exceeded | 🔴 미차단 — `maximum executions`·잔여 횟수 개념 부재([Consumption 문서](DSAR_APPROVAL_CONSUMPTION.md) §1.2 #8). 🔴 `Alerting::executeAction`은 `executed` 건 **재호출 시 재발사** | NOT_APPLICABLE |
| 29 | Critical Reconciliation Drift | 🔴 미차단 — Reconciliation 엔진 부재(§43). **드리프트는 이미 2건 실측**되나 탐지·차단 경로 없음([Reconciliation 문서](DSAR_APPROVAL_RECONCILIATION.md) §0) | NOT_APPLICABLE |
| 30 | **Kill Switch 활성** | **인접 실재·승인 미배선** — `AdAdapters::executionEnabled()`(`AdAdapters.php:34-40` · 호출부 9곳). 🔴 승인 경로 호출 **0** · env 전역(테넌트별 불가) · `pause` 의도적 면제(279차 D-P1) → §0.1 | **VALIDATED_LEGACY**(재사용 강제 · 신설 금지) / 승인 배선 = NOT_APPLICABLE |

## §2. 대조 집계 — **정직한 분자**

| 구분 | 수 | 비고 |
|---|---|---|
| **승인 경로에 실배선된 가드** | **3/30**(#1·#7·#17) | 단 #7은 `AdminGrowth` 예외 · #17은 `Mapping`만 |
| **부분(핸들러 간 불균등)** | **4/30**(#4·#6·#18·#19) | 전부 **Mapping=REAL / Alerting=부재** 패턴 |
| **인접 도메인 실재·승인 미배선** | **1/30**(#30 Kill Switch) | 재사용 대상 |
| **완전 부재(대상 엔티티 없음 → 판정 불가)** | **22/30** | #2·#3·#5·#8~#13·#15·#16·#20~#28 |

🔴 **"3/30 존재"를 커버리지로 홍보하지 말 것.** 22종은 **가드를 안 걸어서 부재가 아니라 걸 대상(Case/Item/Version/Scope/Amount/Currency/Execution Count/Requirement/Environment/Legal Entity)이 코드에 없어서 판정 불가**다. `REBATE_*`는 `backend/src`·`frontend/src` **0 occurrence**(§4) — **승인 대상 엔티티 자체가 없다**. 본 블록은 **전방호환 계약**이다.

🔴 **불균등의 정체**: 부분 4종은 전부 **동일한 형태**다 — 289차 G-01이 `Mapping`에 고친 것이 `Alerting`에 **미전파**. 즉 결함은 "가드를 모른다"가 아니라 **"아는 것을 한 곳에만 적용했다"**이다.

## §3. 규칙

- **★`Mapping::approve`+`actorId`가 정본**이다 — Canonical Runtime Guard는 **신설이 아니라 이 4중 가드(신원·자기승인·dedup·상태)의 공용 추출**이다(헌법 Golden Rule = Replace가 아니라 Extend).
- **★`Mapping.php:309` 게이트를 완화·우회하는 변경 금지**(무후퇴) — 현행 유일한 실행 전 승인 게이트다.
- **★Kill Switch를 신설하지 않는다** — `AdAdapters::executionEnabled()`(`:34-40`)를 재사용한다. **`pause` 면제는 279차가 의도한 설계**이므로 "가드 복원" 명목으로 되돌리지 말 것(되돌리면 킬스위치를 켠 순간 라이브 캠페인을 못 멈춘다 — 279차가 고친 설계 모순의 재현).
- 🔴 **`Alerting` 계열 4건(actor 위조·decide 무가드·executeAction 승인 우회·required_approvals 장식)은 본 블록 미수정** — **비파괴·코드변경 0** · **별도 승인 세션**(Golden Rule + verify + 배포 승인). 단 **`action_request`에 생산자를 배선하기 전에 가드를 먼저 붙인다** — 순서가 뒤집히면 승인 우회가 **즉시 활성화**된다(G-01이 노출 0일 때 고쳐진 것과 동일 논리).
- 가드 신설 시 **`/api` 별칭 포함 3경로 동시 적용**(`routes.php:434` `/v410/action_requests/{id}/execute` · `:438` `/v423/approvals/{id}/execute` · `:441` `/api/v423/...`) — **3중 별칭 동일 핸들러**이므로 별칭 누락은 권한상승 사고 재현.
- 🔴 **`NOT_APPLICABLE`을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤) — 가드 22종이 부재하는 동안 UI·보고서에 "가드 통과"·"안전"을 표시하지 않는다(288차 가짜녹색 systemic 교훈).
- 🔴 **본 문서는 `CONTRACT_ONLY`** — 구현·배선 **0**. "가드가 있다"고 서술하지 않는다. 위 표의 ✅는 **인접 핸들러의 기존 동작**이며 Canonical Guard가 아니다. 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
