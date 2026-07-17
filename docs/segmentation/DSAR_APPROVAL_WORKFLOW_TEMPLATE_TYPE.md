# DSAR — Workflow Template Type (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §7 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Template Type 열거 | **grep 0** — 승인 유형 분류축 자체가 코드에 없다 | `NOT_APPLICABLE`(부재 → 신설) |
| `REBATE_*` | **grep 0** | CLAIM/SETTLEMENT/PAYOUT/FUNDING 계열 4종의 **대상 도메인이 코드에 없다** |
| 현행 승인 도메인 실측 | mapping(Mapping.php:238) · action(Alerting.php:572) · admin growth(AdminGrowth.php:1313) · catalog writeback(Catalog.php:2341) · agency(AgencyPortal.php:365) · feed(FeedTemplate.php:248) | 6종 전부 **원문 14종 어디에도 1:1 대응 없음** |

**★중요 — 축이 다르다:** 원문 Template Type 은 **승인 업무의 성격**(누가/무엇을 승인하는가)으로 분류한다. 현행 6개 승인 구현은 **기술 모듈명**으로 나뉘어 있을 뿐 업무 성격 분류가 아니다. **현행을 원문 축에 억지로 매핑하면 갭이 정의상 소멸한다** — 매핑하지 않고 부재로 판정한다.

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SIMPLE_SINGLE_APPROVAL | 유사 동작 = `Alerting::decideAction`(Alerting.php:572-599) 1회 approve→즉시 approved. 단 이는 **의도된 템플릿이 아니라 정족수 누락 결함** | `MIGRATION_REQUIRED`(결함을 템플릿으로 정당화 금지) |
| 2 | MANAGER_APPROVAL | 부재(grep 0) — 조직/상급자 개념 없음 | `NOT_APPLICABLE` |
| 3 | FINANCE_APPROVAL | 부재(grep 0) | `NOT_APPLICABLE` |
| 4 | LEGAL_APPROVAL | 부재(grep 0) | `NOT_APPLICABLE` |
| 5 | SECURITY_APPROVAL | 부재(grep 0) | `NOT_APPLICABLE` |
| 6 | PROGRAM_ACTIVATION | 부재 — `REBATE_*` grep 0 | `NOT_APPLICABLE` |
| 7 | FUNDING_CHANGE | 부재 · 🔴 팬텀 라우트 `/v384/budget/requests/{request_id}/approve`(routes.php:1868) → `$custom` 미등재 → `$templateHandler` → `templates.json` 에 **키 존재** → `__CALL__:BudgetRequestOut` → allowlist(`isoformat|utcnow|now`) 밖 → **`null` 반환 · HTTP 200**(TemplateResponder.php:39-45) = **fake-looks-real** | `NOT_APPLICABLE`(팬텀 · **501 아님**) |
| 8 | CLAIM_APPROVAL | 부재 — `REBATE_*` grep 0 | `NOT_APPLICABLE` |
| 9 | SETTLEMENT_APPROVAL | 부재 · 🔴 팬텀 라우트 `/v399~403/recon/reports/{report_id}/approve` **5개**(routes.php:1943·1953·1967·1998·2059) → `__CALL__:approve_report` → **`null` 반환 · HTTP 200** = **fake-looks-real** | `NOT_APPLICABLE`(팬텀 · **501 아님**) |
| 10 | PAYOUT_APPROVAL | 부재 — 지급 승인 grep 0 | `NOT_APPLICABLE` |
| 11 | MIGRATION_APPROVAL | 부재 | `NOT_APPLICABLE` |
| 12 | ACCESS_APPROVAL | 유사물 = `AgencyPortal::approveAgency`(AgencyPortal.php:365-384) + 매 요청 approved 재검증(:427) | `LEGACY_ADAPTER`(유일 접근승인 선례) |
| 13 | CONTRACT_APPROVAL | 부재 | `NOT_APPLICABLE` |
| 14 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재 12 · 이관 1 · 어댑터 1.

## 2. 규칙

- 🔴 **부재 12종을 "현행 6개 승인 핸들러로 이미 커버된다"고 주장 금지.** 분류축이 다르다(업무 성격 vs 기술 모듈).
- 🔴 **팬텀 승인 라우트 2계열(budget·recon · 총 6개)을 구현으로 계산 금지.**
  ★**289차 5-3-1 §5 정정**: 이들은 **501 폴백이 아니다.** `templates.json` 에 키가 **존재**하므로 501 분기(`no template`)에 도달하지 않고, `__CALL__:BudgetRequestOut`·`__CALL__:approve_report` 가 allowlist(`isoformat|utcnow|now`) 밖이라 **`null` 을 담은 HTTP 200** 을 반환한다(routes.php:1801-1810 · TemplateResponder.php:39-45).
  → **501(정직한 미구현)보다 나쁘다**: 클라이언트는 `approve` POST 에 **200 을 받고 승인 성공으로 오인**하나 실제 상태전이는 **0**. 전형적 fake-looks-real(287차 유형).
- `SIMPLE_SINGLE_APPROVAL` 을 **기본값으로 채택 금지.** 현행 유일한 REAL maker-checker(`Mapping::approve`)는 정족수 2를 기본으로 하며, 단일 승인은 §4.10·SoD 위배 위험이 크다.
