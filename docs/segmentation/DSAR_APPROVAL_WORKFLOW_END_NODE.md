# DSAR — End Node (§14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §14 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| End Node | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 현행 종료 상태 | `approved`/`applied`(Mapping.php:238-327) · `published`(FeedTemplate.php:285) · `revoked`(AgencyPortal.php:80) · `queued`(Catalog.php:2341-2364) · `executed`/`failed`/`approved_manual`(Alerting.php:601-660) | **상태 문자열이지 End Node 아님** — 축 다름 |
| 종료 상태 Mapping | **부재** — Case/Request 개념이 없어 매핑할 대상이 없다 | `NOT_APPLICABLE` |
| Append-only | 🔴 현행 전부 `UPDATE ... SET status=?` **덮어쓰기**(§52 §4) — **종료 이력 소실** | `MIGRATION_REQUIRED` |
| 정직한 종료 선례 | `Alerting::executeAction` 결과 기록 `executed`(실집행 성공)/`failed`(실패)/`approved_manual`(자동집행 불가) — **287차에 fake-looks-real 을 고친 정직 상태** | `VALIDATED_LEGACY`(**실패를 성공으로 위장하지 않는** 선례) |

**★§4.8(실패를 정상 완료로 처리하지 않는다) 실측:** 종료 어휘는 `Alerting::executeAction` 이 **유일하게 성공/실패를 구분**한다. 나머지 승인 핸들러는 **성공 경로만** 가진다.

## 1. 원문 전사 + 판정 — 지원 End Type **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVED | 어휘 존재(4핸들러) — **End Node 아닌 레코드 상태** | `NOT_APPLICABLE`(축 다름) |
| 2 | CONDITIONALLY_APPROVED | 부재 — 조건부 승인 개념 전무 | `NOT_APPLICABLE` |
| 3 | REJECTED | 부분 — `Alerting::decideAction`(Alerting.php:572-599) reject 경로 존재. 🔴 단 `executeAction`(:612)이 status 미판독 → **rejected 도 실집행**(승인 우회) | `MIGRATION_REQUIRED` |
| 4 | CHANGES_REQUIRED | 부재 | `NOT_APPLICABLE` |
| 5 | RETURNED | 부재 | `NOT_APPLICABLE` |
| 6 | CANCELLED | 부재(승인 도메인) | `NOT_APPLICABLE` |
| 7 | WITHDRAWN | 부재 — Withdrawal 전무(§52 §4) | `NOT_APPLICABLE` |
| 8 | EXPIRED | 부재 — Validity/만료 전무 | `NOT_APPLICABLE` |
| 9 | COMPLETED | 부재(승인 축) · 유사 `applied`(Mapping.php:296-327)/`published`(FeedTemplate.php:285) | `LEGACY_ADAPTER` |
| 10 | FAILED | 유사 `failed`(Alerting.php:601-660) — **현행 유일한 명시적 실패 종료** | `VALIDATED_LEGACY` |
| 11 | COMPENSATED | 부재 · 인접 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 12 | BLOCKED | 부재 | `NOT_APPLICABLE` |
| 13 | SUPERSEDED | 부재 — Supersession 전무 | `NOT_APPLICABLE` |
| 14 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재 10 · 이관 2 · 어댑터 1 · 재사용 1.

### 1.1 원문 서술 전사

> 각 End Node는 Approval Case·Request 상태 Mapping을 가져야 한다.
>
> 완료되지 않은 Mandatory Approval Requirement가 존재하는데 Approved End로 이동하지 못하게 하라.

**판정:** 🔴 **현행은 두 번째 조항의 정확한 반례를 보유한다.** `Alerting::executeAction`(Alerting.php:612)은 `status` 를 SELECT 하고도 판독하지 않아 **승인 요건 미완인 채 집행**된다. **`INSERT INTO action_request` grep 0 → 현재 VACUOUS**(도달 불가)이나 생산자 배선 시 즉시 활성.

## 2. 규칙

- **End Type 은 Case·Request 상태로 매핑되어야 한다** — §4.3(Workflow 상태 ≠ Approval 상태)에 따라 **동일시가 아니라 명시적 매핑**이다.
- 🔴 **Mandatory Approval Requirement 미완 시 `APPROVED` End 이동 차단**은 **§16 Graph Validation + 런타임 이중 게이트**로 집행하라. 정본 참조 구현 = `Mapping::apply`(Mapping.php:309 `status!=="approved"` → 400) — **현행 유일한 실행 전 승인 게이트**.
- `FAILED` 를 `COMPLETED` 로 뭉개지 마라(§4.8). `Alerting::executeAction` 의 `executed`/`failed`/`approved_manual` 3분기는 **정직한 종료의 선례**로 확장 대상이다.
- 종료는 **Append-only 이벤트**여야 한다 — 현행 `UPDATE SET status=?` 덮어쓰기는 **종료 이력을 소실**시킨다(§4.4 모든 Transition 을 Event 로 기록).
- 🔴 `NOT_APPLICABLE` 10종 **"있다고 가정"하고 배선 금지**.
