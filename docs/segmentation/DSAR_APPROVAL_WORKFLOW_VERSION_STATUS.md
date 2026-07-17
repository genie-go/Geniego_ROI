# DSAR — Workflow Version Status (§9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §9 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Version 상태 머신 | **grep 0** — Version 자체 부재 | `NOT_APPLICABLE`(부재 → 신설) |
| 현행 상태 어휘(레코드 레벨) | `draft→submitted→approved→published`(FeedTemplate.php:248-285) · `pending→approved→applied`(Mapping.php:238-327) · `pending→approved→revoked`(AgencyPortal.php:68-80) · `pending_approval→queued`(Catalog.php:2341-2364) | **레코드 상태이지 Version 상태 아님** — 축이 다르다 |
| 상태 전이 강제 | `FeedTemplate::transition`(:258) 역행 시 `invalid_state` **409** · `Mapping::apply`(:309) `status!=="approved"` → **400** | `VALIDATED_LEGACY`(전이 강제 선례) |

**★축 주의 — 혼동 금지:** 원문 14종은 **Workflow Version(정의 산출물)의 수명주기**다. 현행 `draft/pending/approved` 는 **승인 요청 레코드의 상태**다. **동일 어휘가 다른 축을 가리킨다** — `approved` 가 겹친다고 커버로 계산하면 역산이다. §4.3(Workflow 상태와 Approval 상태를 동일시하지 않는다)이 정확히 이 함정을 금지한다.

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DRAFT | 어휘만 존재(`FeedTemplate` `status DEFAULT 'draft'`) — **Version 축 아님** | `NOT_APPLICABLE` |
| 2 | VALIDATION_PENDING | 부재 — Graph Validation(§16) 자체 부재 | `NOT_APPLICABLE` |
| 3 | VALIDATION_FAILED | 부재 | `NOT_APPLICABLE` |
| 4 | REVIEW_PENDING | 부재 — Review 미분화 | `NOT_APPLICABLE` |
| 5 | APPROVAL_PENDING | 어휘만 존재(`pending`·`pending_approval`) — **Version 축 아님** | `NOT_APPLICABLE` |
| 6 | APPROVED | 어휘만 존재(4개 핸들러) — **Version 축 아님** | `NOT_APPLICABLE` |
| 7 | SCHEDULED | 부재 | `NOT_APPLICABLE` |
| 8 | ACTIVE | 부재(Version 축) | `NOT_APPLICABLE` |
| 9 | ACTIVE_WITH_WARNINGS | 부재 — Warning Contract 부재 | `NOT_APPLICABLE` |
| 10 | DEPRECATED | 부재 | `NOT_APPLICABLE` |
| 11 | SUSPENDED | 부재 | `NOT_APPLICABLE` |
| 12 | RETIRED | 부재 · 유사 종료 선례 = `revoked`(AgencyPortal.php:80 — **현행 유일한 승인 후 취소**) | `LEGACY_ADAPTER` |
| 13 | ARCHIVED | 부재 | `NOT_APPLICABLE` |
| 14 | BLOCKED | 부재 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재 13 · 어댑터 1.

## 2. 규칙

- 🔴 **`DRAFT`·`APPROVAL_PENDING`·`APPROVED` 3종을 "현행에 이미 있다"고 계산 금지.** 어휘가 같을 뿐 **대상 축이 다르다**(Version 정의 vs 승인 요청 레코드) — §4.3 위배.
- `ACTIVE_WITH_WARNINGS` 는 **경고를 정상 완료로 처리하지 않는다**(§4.8)의 상태 표현이다 — 경고를 `ACTIVE` 로 뭉개지 마라. 현행 `Alerting::executeAction`(Alerting.php:612 `status` SELECT 후 **미판독**)이 정확히 "실패/미승인을 정상으로 처리"하는 반례다.
- 상태 전이는 **역행 차단**이 기본이다 — `FeedTemplate::transition` 의 `invalid_state` **409** 패턴을 Version 축으로 확장하라(신설 아님 · Extend).
- `RETIRED` 설계 시 `agency_client_link.revoked_at` 을 참조하라 — **현행 유일한 "승인 후 무효화" 선례**다.
