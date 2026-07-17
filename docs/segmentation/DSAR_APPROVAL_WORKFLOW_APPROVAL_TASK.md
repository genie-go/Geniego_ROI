# DSAR — Approval Task (§23)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §23 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 = 노드인가 | **아니다 — 핸들러 메서드**(`Mapping::approve` Mapping.php:238-294). 워크플로 노드로 표현된 승인은 grep 0 | `NOT_APPLICABLE`(노드화 = 신설) |
| ★승인 5단 규율 | Mapping.php:**245-290** — ①위조불가 신원 fail-closed(:246-250, 403) → ②비-pending 409(:262-265) → ③자기승인 차단(:268-271, 403) → ④승인자 dedup(:278-283, 409) → ⑤정족수(:287) | `VALIDATED_LEGACY`(**공용 추출 대상 · 재작성 금지**) |
| 정족수 값의 출처 | `$r["required_approvals"]` — **행 단위 컬럼 상수**(INSERT 리터럴 `2` :209). "누가·몇 명·어떤 순서"의 **정의(Definition) 부재** | `NOT_APPLICABLE`(정의 = 신설 불가피) |
| 결정 저장 형태 | `approvals_json` 배열에 `["user","ts"]` append 후 **UPDATE 덮어쓰기**(:285-289) — append-only 저장소 아님 | `NOT_APPLICABLE` |
| reject 경로 | **부재** — Mapping.php 전체에 `function reject` · `'rejected'` **grep 0**(존재 메서드 = `approve`:238 / `apply`:296) | `NOT_APPLICABLE` |
| `action_request` 승인 | 정족수 컬럼 없음 · `INSERT INTO action_request` **grep 0 = 생산자 전무** | `VACUOUS` |

**★축 주의 — 이 블록 전체의 심장은 §23이다.** `Mapping.php:245-290` 5단 규율은 289차 G-01이 **익명 승인 2회 = 정족수 충족** 우회로를 닫으며 확립한 것이다. Approval Task 노드를 **새로 작성하면 그 우회로가 그대로 다시 열린다.** 따라서 §23의 구현은 **신규 작성이 아니라 위치 이동**(공용 트레이트/서비스 추출 후 노드가 호출)이다. 🟠 단 현행 5단 규율에도 **`actor_type` 부재** 결함이 있다 — `apikey:{id}`/`user:{email}`가 정족수에 **동등 계수**되어 **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). 추출 시 함께 교정하되, **교정을 이유로 재작성하지 마라.**

## 1. 원문 전사 + 판정 — Approval Task 강제 항목 **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 연결된 Approval Requirement | Requirement 엔티티 부재 · 정족수는 행 컬럼 상수(:287) | `NOT_APPLICABLE` |
| 2 | 승인자 후보 Assignment Hook | 후보/배정 개념 grep 0 — 승인자는 "먼저 누른 사람" | `NOT_APPLICABLE` |
| 3 | Actor Authorization Check | `Mapping::actorId` fail-closed(:246-250) — 미확인 null→403 | `VALIDATED_LEGACY`(추출) |
| 4 | Resource Snapshot 검증 | 부재 — 승인 시점 payload 해시 대조 없음 | `NOT_APPLICABLE` |
| 5 | Decision Append-only 기록 | `approvals_json` 단일 컬럼 재기록(:285-289) = append-only 아님 · 별도 `audit`(:291)만 존재 | `NOT_APPLICABLE` |
| 6 | Decision Reason 처리 | 부재 — 기록 필드는 `user`/`ts` 뿐(:285) | `NOT_APPLICABLE` |
| 7 | Condition·Obligation 처리 | 부재 — 조건부 승인 개념 자체가 없음 | `NOT_APPLICABLE` |
| 8 | Task Completion과 Decision Correlation | Task 개념 부재(§25) → 상관 불가 | `NOT_APPLICABLE` |
| 9 | 중복 Decision 방지 | 승인자 dedup(:278-283, 409) | `VALIDATED_LEGACY`(추출) |
| 10 | Final Decision 후 재완료 방지 | 비-pending 409(:262-265) | `VALIDATED_LEGACY`(추출) |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재 7 · 현행충족(추출) 3.

## 2. 원문 전사 + 판정 — Approval Task 완료 결과 **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVED | `status='approved'`(Mapping.php:287) | `VALIDATED_LEGACY` |
| 2 | REJECTED | **부재** — Mapping에 reject 경로 grep 0 · `action_request`의 거부는 `VACUOUS` | `NOT_APPLICABLE` |
| 3 | CONDITIONALLY_APPROVED | 부재 | `NOT_APPLICABLE` |
| 4 | CHANGES_REQUIRED | 부재 | `NOT_APPLICABLE` |
| 5 | RETURNED | 부재 | `NOT_APPLICABLE` |
| 6 | ABSTAINED | 부재 — 기권은 정족수 분모 처리를 요구하나 현행은 `count(approvals) >= required`(:287) 단순 비교 | `NOT_APPLICABLE` |
| 7 | MANUAL_REVIEW | 부재(승인 도메인) · 인접 = `Alerting::executeAction`의 `approved_manual`(Alerting.php:628,650)이나 **`VACUOUS`** | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.** 커버리지 = 현행충족 1 · 부재 6.
**★현행 REAL 승인 엔진은 7종 중 사실상 `APPROVED` 하나만 구현한다** — 거부조차 코드 경로가 없다.

## 3. 규칙

- 🔴 **`Mapping.php:245-290` 5단 규율 재작성 절대 금지.** 공용 트레이트/서비스로 **추출(위치 이동)** 후 Approval Task 노드가 호출한다. 순서(신원→상태→자기승인→dedup→정족수)는 **불변**이다 — 순서를 바꾸면 신원 미확인 상태로 dedup을 통과하는 경로가 생긴다.
- 🔴 **`EquivalenceProof` 선행 없이 통합 금지**(286차 rank 맵 붕괴 재현). 4번째 Foundation 신설 금지(AL-19).
- 🟠 **`actor_type` 축을 추출과 동시에 도입하라** — 없으면 API 키 2개로 Maker-Checker가 뚫린다. 이는 §23 항목 3(Actor Authorization Check)의 미완 부분이지, 5단 규율 폐기 사유가 아니다.
- **정족수 `2` 리터럴(:209)을 노드 정의로 옮겨라** — §23 항목 1은 "연결된 Approval Requirement"를 요구하므로 **행 컬럼 상수는 요구 미충족**이다.
- **Decision 저장은 append-only 별도 테이블로** — 현행 `approvals_json` 재기록은 §23 항목 5를 충족하지 못한다. 단 **기존 컬럼 제거 금지**(무후퇴).
- 🔴 **완료 결과 6종을 "있다고 가정"하고 배선 금지.** 특히 `REJECTED`는 현행에 경로가 없으므로 **신설**이다.
- **`action_request` 는 재사용 자산이 아니다** — 흡수 대상. 현 상태 방치 = 가짜 정족수 잔존.
