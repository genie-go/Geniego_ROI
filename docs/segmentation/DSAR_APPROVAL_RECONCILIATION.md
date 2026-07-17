# DSAR — Approval Reconciliation (§43·비교 대상 19·필드 14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §43**
> ✅ **REQ 집계 일치**: 비교 대상 **19** · 필드 **14** — 원문 실측과 동일.

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q21 "UI·API·ERP·Provider·Internal Approval 상태가 일치하는가") | 현행 | 분류 |
|---|---|---|
| **승인 도메인 Reconciliation** | **부재**(grep 0). 타 도메인 선례(`Mapping` 매핑 정규화 · 285차 `consolidateOrphanStock` WMS 재고 병합)는 **승인과 무관** | **NOT_APPLICABLE(부재→신설)** |
| 🔴 **드리프트 실측 (a) — 표시≠실제** | 백엔드가 `required_approvals => 2`를 **리터럴로** 내려보내나(`Handlers/Alerting.php:562`), **`decideAction`은 첫 결정 1건으로 즉시 `approved`**(`:589-591`) — **정족수 2가 집행되지 않음**. 프론트는 그 값을 state에 담기만 하고(`frontend/src/pages/Approvals.jsx:576`) **렌더 사용처 0**(파일 내 유일 출현) | **★MIGRATION_REQUIRED**(UI_API_MISMATCH **이미 실현**) |
| 🔴 **드리프트 실측 (b) — 팬텀 승인 라우트** | 핸들러 클래스 **부재** → 템플릿/501 폴백(`routes.php:1819-1828`)으로 흘러가는 승인 엔드포인트: `:1868` `/v384/budget/requests/{id}/approve` · `:1943,1953,1967,1998,2059` `/v399~403/recon/reports/{id}/approve` — **API는 응답하나 구현 없음** | **★MIGRATION_REQUIRED**(가짜 표면) |
| 승인 상태 **원천 다중화** | `action_request`(`Db.php:592-600`) · `mapping_change_request`(`:623-636`) · `admin_growth_approval`(`AdminGrowth.php:142-149`) · `catalog_writeback_job.status='pending_approval'`(`Catalog.php:2341-2364`) — **4계통 분산·상호 대조 없음** | **CONSOLIDATION_REQUIRED** |
| **Provider·ERP 승인 상태** 대조 | **부재**(grep 0) — 외부 시스템 승인 상태를 읽어오는 경로 없음 | **NOT_APPLICABLE** |

> **★이 도메인은 "장차 드리프트가 생길 수 있다"가 아니다 — 드리프트가 이미 두 건 실측된다.** (a)는 **화면이 약속한 정족수(2)를 백엔드가 지키지 않는** 사례이고, (b)는 **엔드포인트가 존재하는 척하는** 사례다. Reconciliation의 필요성은 가설이 아니라 **현행 관측 결과**다.

## 1. Reconciliation = **여러 원천의 승인 상태를 대조해 불일치를 표면화**

### 1.1 비교 대상 — **원문 전사 19** (§43 "다음을 비교하라")

| # | 비교 대상(원문) | 현행 대조 가능 여부 (file:line) |
|---|---|---|
| 1 | Source System Request vs Canonical Approval Request | 🔴 불가 — Canonical 축 부재. 원천 4계통 분산(`Db.php:592-600` · `:623-636` · `AdminGrowth.php:142-149` · `Catalog.php:2341-2364`) |
| 2 | UI Status vs Backend Status | 🔴 **불일치 이미 실측** — 백엔드 `required_approvals => 2` 리터럴(`Alerting.php:562`) vs `decideAction` 1건 즉시 `approved`(`:589-591`). 프론트는 state 보관만·렌더 사용처 0(`Approvals.jsx:576`) |
| 3 | API Status vs Case Status | 🔴 불가 — Case 축 부재 |
| 4 | Approval Request Version vs Resource Version | 🔴 불가 — 양 축 모두 부재(§4.4 미충족) |
| 5 | Approval Policy Version vs Runtime Policy | 🔴 불가 — Policy Version(§33) 부재 · `PlanPolicy` fail-open(`PlanPolicy.php:12`) |
| 6 | Approval Participant Role vs Current Role | 🔴 불가 — Participant 축 부재 · Role Version 부재(§4.6 미충족) |
| 7 | Decision Actor Scope vs Required Scope | 🔴 불가 — Required Scope 축 부재. `api_key.scopes_json`(`Db.php:942-955`)은 존재하나 승인 결정에 미조회 |
| 8 | Decision Amount vs Requested Amount | 🔴 불가 — 승인 금액 컬럼 부재(blob 내부) |
| 9 | Decision Currency vs Requested Currency | 🔴 불가 — 승인 통화 축 부재 |
| 10 | Decision Resource Version vs Current Resource Version | 🔴 불가 — Version 축 부재 |
| 11 | Approved Action vs Executed Action | 🔴 불가 — `Alerting.php:625`가 실행 시점 blob 해석. 승인 action 미고정 |
| 12 | Approved Scope vs Executed Scope | 🔴 불가 — Scope 축 부재 |
| 13 | Approval Consumption vs Business Execution | 🔴 불가 — Consumption 원장 부재([Consumption 문서](DSAR_APPROVAL_CONSUMPTION.md)) |
| 14 | ERP Approval vs Internal Approval | 🔴 불가 — 외부 ERP 승인 상태 수집 경로 grep 0 |
| 15 | Provider Approval vs Internal Approval | 🔴 불가 — Provider 승인 상태 수집 경로 grep 0 |
| 16 | Notification State vs Approval State | 🔴 불가 — 승인 알림 상태 축 부재 |
| 17 | Audit Event vs Decision | 🔴 불가 — Decision 테이블 부재. 감사 4곳은 **성공만** 기록([Audit Event 문서](DSAR_APPROVAL_AUDIT_EVENT.md) §1) |
| 18 | Cancelled Request vs Active Execution | 🔴 불가 — Cancellation(§37) 축 부재 |
| 19 | Revoked Approval vs Cached Execution Permission | 🔴 불가 — 승인 revoke 부재. 인접 선례만 = `agency_client_link.revoked_at`(`AgencyPortal.php:68,80` · 현행 유일 revoke 선례) |

🔴 **19/19 전부 대조 불가** — 대조기가 없어서가 아니라 **대조할 양변이 없기 때문**이다. #2만 예외적으로 **양변이 존재해 불일치가 실측**된다.

### 1.2 필수 필드 — **원문 전사 14** (§43)

`APPROVAL_RECONCILIATION`

| # | 필드(원문) | 현행 대조 | 분류 |
|---|---|---|---|
| 1 | approval_reconciliation_id | 부재(grep 0) | NOT_APPLICABLE |
| 2 | approval request | 부재 | NOT_APPLICABLE |
| 3 | approval case | Case 축 부재 | NOT_APPLICABLE |
| 4 | approval item | Item 축 부재 | NOT_APPLICABLE |
| 5 | comparison type | 부재 — 위 19종 열거형 미존재 | NOT_APPLICABLE |
| 6 | source state | 부재 | NOT_APPLICABLE |
| 7 | canonical state | 부재 — Canonical SSOT 자체 부재 | NOT_APPLICABLE |
| 8 | difference | 부재 | NOT_APPLICABLE |
| 9 | severity | 부재(승인 도메인) | NOT_APPLICABLE |
| 10 | detected_at | 부재 | NOT_APPLICABLE |
| 11 | resolved_at | 부재 | NOT_APPLICABLE |
| 12 | resolution | 부재 | NOT_APPLICABLE |
| 13 | status | 부재 — [Reconciliation Status 문서](DSAR_APPROVAL_RECONCILIATION_STATUS.md)(§44·22종) 참조 | NOT_APPLICABLE |
| 14 | evidence | 부재 | NOT_APPLICABLE |

🔴 **필드 14/14 전부 부재** — 커버리지 0/14.

영속된 요구(§0 Q21·§61·§62 항목 39·40)에서 확정 가능한 구조 요구:
- Reconciliation은 **탐지이지 교정이 아니다** — 불일치를 **자동으로 맞추면** 어느 쪽이 진실인지 잃는다. 산출은 **Mismatch 레코드**이며 교정은 별도 결정.
- 비교는 **Canonical Approval을 SSOT로** 삼는다(§4.1) — UI 표시값·Provider 응답을 SSOT로 승격 금지.
- 드리프트 (a)류 재발 방지는 **Static Lint 축**(§46)의 일이다 — "백엔드가 내려보내지만 프론트가 렌더하지 않는 계약 필드"는 **코드로 탐지 가능**하다.

## 2. 규칙

- **드리프트 (a)(b)를 본 블록에서 수정하지 않는다** — 실 수정은 **별도 승인 세션**(Golden Rule + verify + 배포 승인). 본 문서의 산출은 **근거 고정**이다.
- **팬텀 라우트를 "구현된 것"으로 세지 않는다**(283차 "코드 존재 ≠ 구현 완료") — §62 항목 43 집계 시 501 폴백 경로는 **Existing Implementation 아님**.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Reconciliation 엔진이 없는 동안 대시보드에 "정합 OK"를 표시하지 않는다(가짜녹색 · 288차 systemic 교훈).
- 본 문서 **코드변경 0**.
