# DSAR — Review Task (§24)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §24 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Review 개념 | **부재 — Review/Approval 미분화.** 현행에 "결정을 만들지 않는 검토" 경로 grep 0 | `NOT_APPLICABLE` |
| 현행 승인 경로의 결과 | `Mapping::approve`(Mapping.php:238-294)는 **누르면 곧 정족수 1표**(:285-287). 검토만 하고 표를 안 내는 선택지가 없다 | `NOT_APPLICABLE` |
| 인접 유사 | `Catalog::approveQueue`(:2341) · `FeedTemplate::transition`(:248-285) — 전이 가드일 뿐 검토 결과 축 없음 | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — §24의 핵심은 "Review ≠ Approval"이다.** 원문은 "Review Task는 Approval Decision을 **생성하지 않을 수 있다**"고 규정하고, 마지막 줄에서 **"Review 완료가 Approval Requirement 충족으로 잘못 처리되지 않게 하라"**고 못박는다. 현행은 검토 경로 자체가 없으므로 이 오염이 발생한 적이 없다 — 그러나 **Review Task를 신설하는 순간 이 위험이 새로 생긴다.** 현행 정족수 계산 `count($approvals) >= (int)$r["required_approvals"]`(Mapping.php:287)은 **배열에 들어온 모든 항목을 1표로 센다** — 검토 결과를 같은 배열에 넣으면 즉시 §24 위반이다.

## 1. 원문 전사 + 판정 — Review Task 지원 결과 **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REVIEW_COMPLETED | 부재 | `NOT_APPLICABLE` |
| 2 | INFORMATION_SUFFICIENT | 부재 | `NOT_APPLICABLE` |
| 3 | INFORMATION_INSUFFICIENT | 부재 | `NOT_APPLICABLE` |
| 4 | CHANGES_RECOMMENDED | 부재 · §23 `CHANGES_REQUIRED`(강제)와 **구별 필수** — 권고는 승인 요건을 막지 않는다 | `NOT_APPLICABLE` |
| 5 | ESCALATION_RECOMMENDED | 부재 — 에스컬레이션 기전 grep 0 | `NOT_APPLICABLE` |
| 6 | ACKNOWLEDGED | 부재 | `NOT_APPLICABLE` |
| 7 | BLOCKED | 부재 · §25 Human Task Lifecycle의 `BLOCKED`와 **동명이의**(생애주기 상태 ≠ 검토 결과) | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.** 커버리지 = 부재 7 · 현행 충족 0.

## 2. 규칙

- 🔴 **Review 결과를 Approval Decision 저장소에 넣지 마라.** 현행 정족수식(Mapping.php:287)은 배열 길이만 세므로, 검토 결과가 같은 배열에 들어가면 **`REVIEW_COMPLETED` 2건 = 승인 완료**가 된다. 이는 289차 G-01이 닫은 "익명 2회 = 정족수"와 **구조가 동일한 우회로**다.
- 🔴 **Review Task 완료 = Approval Requirement 충족으로 해석 금지**(원문 명시). 정족수 계수 대상은 **Approval Decision 뿐**이다.
- `CHANGES_RECOMMENDED`(§24 권고) 와 `CHANGES_REQUIRED`(§23 강제)를 **같은 값으로 접지 마라** — 이름이 닮았으나 하나는 흐름을 막고 하나는 막지 않는다. 접으면 검토자가 승인 흐름을 정지시킬 권한을 얻는다.
- `BLOCKED` 는 §24(검토 결과)와 §25(Human Task Lifecycle) 양쪽에 등장한다 — **축이 다르므로 별도 열거형**으로 둔다. 병합은 형태 유사에 의한 역산이다.
- 7종 전부 부재 → **신설**. 🔴 **"있다고 가정"하고 배선 금지.**
