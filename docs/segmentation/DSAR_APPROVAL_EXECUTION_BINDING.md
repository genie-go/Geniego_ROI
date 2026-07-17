# DSAR — Approval Execution Binding (§40·필드 **20**)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §40**
> 🔴 **REQ 집계 불일치**: REQ §7은 필드 **19**로 고정하나 **원문 실측 20**. **원문이 정본** — 제목·본문을 20으로 정정한다.

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q22 "승인 완료 전 고위험 작업이 실행되지 않는가") | 현행 | 분류 |
|---|---|---|
| **★`Mapping::apply`** `Handlers/Mapping.php:296-327` | `:309` **`if ($r["status"] !== "approved")` → 400 거부** 후에만 registry 반영·`applied` 전이 | **★VALIDATED_LEGACY**(현행 **유일**한 실행 전 승인 게이트 · **정본 패턴으로 승격**) |
| 🔴 **`Alerting::executeAction`** `Handlers/Alerting.php:601-660` | `:612` `SELECT action_json, status`로 status를 **가져오지만** 이후 `$r['status']`를 **어디서도 읽지 않음**(죽은 읽기). `:619`부터 곧장 `AdAdapters::pause`(`:631`)/`updateBudget`(`:634`) **실집행** | **🔴 MIGRATION_REQUIRED**(게이트 부재 = 승인 우회) |
| 그 결함의 **도달성** | **`INSERT INTO action_request` grep 0 → 생산자 전무 → 현재 도달 불가(VACUOUS)** | **VACUOUS**(별도 승인 세션 대상 · 본 블록 코드변경 0) |
| 그 결함의 **경위** | 287차가 "가짜집행"(status만 변경·외부 API 미호출)을 고치며 **실집행을 붙였으나 승인 게이트는 붙이지 않음**(`:606-610` 주석 실측) | **생산자 배선 시 즉시 활성 결함** |
| 라우트 노출면 | `routes.php:434`(`/v410/action_requests/{id}/execute`) · `:438`(`/v423/approvals/{id}/execute`) · `:441`(`/api/v423/...`) — **3중 별칭 동일 핸들러** | 게이트 신설 시 **3경로 동시 적용 필수** |
| **APPROVAL_EXECUTION_BINDING** 엔티티 | `execution_binding` grep **0** — 승인 1건과 실행 1건을 잇는 **영속 링크 부재** | **NOT_APPLICABLE(부재→신설)** |
| 승인 **금액·통화·Action·Scope 대비 실행 검증** | **부재**(grep 0). `action_request.action_json`(`Db.php:592-600`)은 **JSON blob** — 승인 금액과 실행 금액을 **대조할 구조 자체가 없음** | **NOT_APPLICABLE** |

> **대조가 말하는 것**: 같은 저장소가 한쪽에선 **"승인 아니면 실행 금지"를 한 줄로 구현**했고(`Mapping.php:309`), 다른 쪽에선 **status를 읽고도 버린다**(`Alerting.php:612`). 부재가 아니라 **불일치**다 → 신설이 아니라 **정본 패턴의 확산**.

## 1. Execution Binding = **어떤 승인이 · 어떤 실행을 · 어디까지 허가했는가**의 영속 링크

### 1.1 필수 필드 — **원문 전사 20** (§40)

`APPROVAL_EXECUTION_BINDING` — 원문 정의: **승인 완료 후 실제 작업 실행과 연결한다.**

| # | 필드(원문) | 현행 대조 (file:line) | 분류 |
|---|---|---|---|
| 1 | approval_execution_binding_id | `execution_binding` grep **0** | NOT_APPLICABLE |
| 2 | approval_request_id | 실행이 근거 승인을 지목하는 링크 부재 — `Alerting::executeAction`은 `action_request.id`로 **자기 자신**을 읽을 뿐(`Alerting.php:612`) | NOT_APPLICABLE |
| 3 | approval_case_id | Case 축 부재(§4.2) | NOT_APPLICABLE |
| 4 | approval_item_id | Item 축 부재 — 현행은 전부 단일 레코드 1건 승인 | NOT_APPLICABLE |
| 5 | approval_decision_id | Decision 테이블 부재(현행 `UPDATE SET status=?` 덮어쓰기) | NOT_APPLICABLE |
| 6 | approved resource type | 부재 — `action_json` **JSON blob** 내부(`Db.php:592-600`)이며 대조 컬럼 아님 | NOT_APPLICABLE |
| 7 | approved resource id | 동상 — 실행 시 blob에서 `campaign_ext_id` 등을 꺼내나(`Alerting.php:624`) **승인 시 고정된 값과 대조하지 않음** | NOT_APPLICABLE |
| 8 | approved resource version | Resource Version 축 부재(§4.4 미충족) | NOT_APPLICABLE |
| 9 | approved action | 부재 — `Alerting.php:625`가 blob의 `type`을 **실행 시점에** 해석. 승인된 action과 대조 불가 | NOT_APPLICABLE |
| 10 | approved amount | 부재 — `Alerting.php:626` `daily_budget`을 blob에서 읽어 그대로 집행(`:634`). 승인 금액 상한 없음 | NOT_APPLICABLE |
| 11 | approved currency | 부재 — 승인 통화 개념 없음. 재사용 후보 = `Connectors::fxToKrw`(`Connectors.php:1749` · 24통화 + `app_setting` 24h 캐시) | NOT_APPLICABLE(단 환산기는 VALIDATED_LEGACY) |
| 12 | approved scope | 부재 | NOT_APPLICABLE |
| 13 | approved environment | 부재 — 승인 도메인 environment 축 없음 | NOT_APPLICABLE |
| 14 | valid_from | 부재 — 승인 유효기간 컬럼 없음(`Db.php:592-600` · `:623-636`) | NOT_APPLICABLE |
| 15 | valid_to | 동상 | NOT_APPLICABLE |
| 16 | maximum executions | 부재 — 실행 횟수 제한 개념 없음([Consumption 문서](DSAR_APPROVAL_CONSUMPTION.md) §0) | NOT_APPLICABLE |
| 17 | execution service | 부재 — 실 집행자는 `AdAdapters`(`Alerting.php:631,634`)이나 **승인에 기록되지 않음** | NOT_APPLICABLE |
| 18 | execution endpoint reference | 부재 | NOT_APPLICABLE |
| 19 | status | 인접만 — `action_request.status`(`approved\|rejected\|executed\|failed\|approved_manual` · `Alerting.php:628,644`)는 **요청 상태**이지 Binding 상태 아님(축 상이) | KEEP_SEPARATE_WITH_REASON |
| 20 | evidence | 부재([Evidence 문서](DSAR_APPROVAL_EVIDENCE.md) §0) | NOT_APPLICABLE |

🔴 **필드 20/20 중 Binding 축으로 존재하는 것 0** — 커버리지 0/20. 19·11은 **인접 자산의 재사용 후보**일 뿐 Binding 구현이 아니다. 있다고 가정하고 배선 금지.

영속된 요구(§0 Q22·Q23·§4.10·§61)에서 확정 가능한 구조 요구:
- Binding은 **Decision ↔ 실행 사건**을 잇는다 — 실행은 **자기가 근거로 삼은 승인 id를 지목할 수 있어야** 한다.
- Binding은 **승인 범위를 명시**한다(Amount·Currency·Action·Scope) — 범위가 없으면 §0 Q23(범위 초과 차단)은 **원리적으로 검사 불가**.
- 통화 대조 시 **`Connectors::fxToKrw`**(`Handlers/Connectors.php:1749` · 24통화 + `app_setting.skey='fx_rates_krw'` 24h 캐시)를 재사용한다 — 환산기 중복 신설 금지.
- **JSON blob은 검사면이 아니다** — Amount/Currency/Action/Scope는 `action_json` 내부가 아니라 **대조 가능한 컬럼**으로 승격돼야 한다.

## 2. 규칙

- **★`Mapping.php:309` 패턴이 정본**이다 — 모든 실행 경로는 **집행 직전에** 승인 상태를 검사하고, 미승인이면 **fail-closed 거부**한다. 이 게이트를 **완화·우회하는 방향의 변경 금지**(무후퇴).
- 🔴 **`Alerting::executeAction`은 게이트 부재 = MIGRATION_REQUIRED.** 단 **VACUOUS**(생산자 0)이므로 **본 블록에서 수정하지 않는다** — 실 수정은 **별도 승인 세션**(Golden Rule + verify + 배포 승인). 여기서 조급히 고치면 스펙 없는 자율 변경이 된다.
- **`action_request`에 생산자를 배선하기 전에 게이트를 먼저 붙인다** — 순서가 뒤집히면 **승인 우회가 즉시 활성화**된다. 이 순서 의존성이 본 문서의 실질적 산출이다.
- 게이트 신설 시 **`/api` 별칭 포함 3경로 동시 적용**(`routes.php:434,438,441`) — 별칭 누락은 192차 권한상승 사고 재현.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 본 문서 **코드변경 0**.
