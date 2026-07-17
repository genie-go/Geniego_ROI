# DSAR — Gateway Evaluation Mode (§18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §18 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

> **본 문서는 §18의 `Evaluation Mode` 축만 다룬다.** Gateway Type 10종·필수 필드 11축은 [DSAR_APPROVAL_WORKFLOW_GATEWAY.md](DSAR_APPROVAL_WORKFLOW_GATEWAY.md) 정본을 참조하라(중복 금지).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `evaluation mode` 축 | **backend/src grep 0**(`first_match`/`highest_priority`/`all_matches`/`no_match`/`default_edge` 전건 무히트) | `NOT_APPLICABLE`(부재 → 신설) |
| 현행의 유일한 암묵 모드 | **`FIRST_MATCH` 1종 고정.** `nextNode`(JourneyBuilder.php:795-800) — 후보 엣지를 순회하며 **첫 라벨 일치 즉시 `return`** · 선택 불가·선언 불가 | `KEEP_SEPARATE_WITH_REASON`(마케팅 여정 · **선택 축 자체가 없음**) |
| 우선순위 | **부재.** 엣지에 `priority` 개념 없음(§15 필드 #8 `condition priority` = `NOT_APPLICABLE`) → 순서 = **작성자 JSON 배열 순서 우연** | `NOT_APPLICABLE` |
| 다중 일치 | **탐지·기록 0.** 첫 일치 return(:799) → 동일 라벨 엣지 2개는 **조용히 앞의 것만** | `NOT_APPLICABLE` |
| 무매칭 | **fail-closed 실동작.** 라벨 그래프에서 미매칭 → `''` → 여정 종료(:809 · 286차) | `VALIDATED_LEGACY`(**`BLOCK_ON_NO_MATCH` 의미론** — 아래 ★) |
| 무매칭(레거시) | 무라벨 그래프만 **위치 폴백**(:811 `true/a`→idx 0 · `false/b`→idx 1) — 286차가 라벨 그래프에서만 제거 | `KEEP_SEPARATE_WITH_REASON`(🔴 승인 이식 금지) |
| 충돌 시 수동 검토 | **부재.** 사람 개입 개념 전무(§12 #5 HUMAN_TASK `NOT_APPLICABLE`) | `NOT_APPLICABLE` |

**★축 주의 — "FIRST_MATCH 가 있다"는 오독이다.** 현행은 FIRST_MATCH 를 **선택한 것이 아니라 그것밖에 못 한다**. 원문 `evaluation mode` 는 **작성자가 게이트웨이마다 7종 중 선언하는 축**이다. 하나의 암묵 동작을 "7종 중 1종 충족"으로 계산하면 **역산**이다 — **선택 가능성이 곧 축의 실체**다.

**★현행 순서는 의미가 아니라 우연이다.** `nextNode` :789 `foreach ($edges as $e)` 는 **JSON 배열 순서**를 그대로 따른다. 작성자가 캔버스에서 엣지를 그린 순서가 곧 평가 순서이며, **아무도 그것을 선언하거나 검증하지 않는다**. 승인 도메인 등가 = **엣지를 다시 그리면 승인 우선순위가 바뀐다.**

## 1. 원문 전사 + 판정 — Evaluation Mode **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | FIRST_MATCH | **암묵 유일 동작**(`nextNode` :795-800 첫 일치 return) — 🔴 **선언이 아니라 유일 선택지** · 마케팅 여정 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | HIGHEST_PRIORITY | **부재.** 엣지 priority 축 없음(§15 #8) → 현행 순서는 **JSON 배열 우연**(:789) | `NOT_APPLICABLE` |
| 3 | ALL_MATCHES | **부재 · 구조적 불가.** `nextNode` 반환형이 **단일 문자열**(:786 `: string`) — 다중 경로를 **표현할 타입이 없다**. `advanceEnrollment` 도 단일 `$nodeId` 커서(:511) | `NOT_APPLICABLE` |
| 4 | SINGLE_REQUIRED | **부재.** "정확히 1개 일치" 강제 없음 — 다중 일치가 **탐지조차 안 됨**(:799) | `NOT_APPLICABLE` |
| 5 | DEFAULT_ON_NO_MATCH | **부재 · 286차가 의도적으로 제거**(:809 `if ($hasLabeled) return '';`). 무라벨 레거시 그래프에만 위치 폴백 잔존(:811) | `NOT_APPLICABLE`(🔴 위치 폴백을 이 모드로 계산 금지 — 아래 규칙) |
| 6 | BLOCK_ON_NO_MATCH | **의미론 실재 · 선언 축 부재.** 라벨 그래프 미매칭 → 여정 종료(:809) = **fail-closed**. 286차가 오라우팅 사고 후 확립 | `VALIDATED_LEGACY`(**의미론만** · 도메인 상이) |
| 7 | MANUAL_REVIEW_ON_CONFLICT | **부재.** 충돌 탐지도 사람 개입도 전무 | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.** 커버리지 = 신설 5 · 도메인분리 1 · 의미론재사용 1. **선언적 모드 선택 축은 0 / 7.**

## 2. 규칙

- 🔴 **"현행이 FIRST_MATCH 를 한다"를 #1 커버로 계산 금지.** 원문은 **모드 선택**을 요구하고 현행은 **선택 불가**다. 축은 "어떻게 동작하는가"가 아니라 **"작성자가 선언할 수 있는가"**다.
- ★**#6 `BLOCK_ON_NO_MATCH` 를 승인 도메인 기본값으로 채택하라 — 이것은 사고 후 확립된 규율이다.** `nextNode` :801-809 주석 실측 — 종전 위치 폴백이 **조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송**했고, 286차가 라벨 그래프에서 폴백을 제거해 **미연결 분기 = 정지**로 바꿨다. **승인 도메인 등가 = 반려를 승인 경로로 라우팅.** 🔴 재작성 시 286차가 닫은 경로를 다시 연다 — **신규 작성이 아니라 의미론 이동**.
- 🔴 **#5 `DEFAULT_ON_NO_MATCH` 를 무라벨 위치 폴백(:811)으로 구현 금지.** 그 폴백은 **레거시 무라벨 그래프 하위호환용 잔존물**이지 설계된 기본 경로가 아니다. `DEFAULT_ON_NO_MATCH` 는 **명시 `default edge`(§18 필드 #6)가 선언된 게이트웨이에서만** 유효하며, **선언 없으면 자동으로 #6 `BLOCK_ON_NO_MATCH` 로 강등**되어야 한다.
- **#5 와 #6 은 §16 #8("Gateway Default Path 규칙 충족")이 정적으로 검증한다.** `DEFAULT_ON_NO_MATCH` 인데 `default edge` 가 없으면 **활성화 거부** — 런타임에 발견하면 이미 잘못 라우팅된 뒤다.
- **#2 `HIGHEST_PRIORITY` 는 §15 `condition priority`(필드 #8)가 선행 필수다.** 🔴 priority 없이 모드만 선언하면 **JSON 배열 순서로 조용히 강등**된다(= 현행 상태의 이름만 바뀐 재현). **엣지에 명시 priority + 동일 priority 금지**를 §16 에서 검증하라.
- **#3 `ALL_MATCHES` 는 §18 `PARALLEL`/`FORK` 와 동일한 선결 조건을 갖는다** — `nextNode` 반환형이 단일 문자열(:786)이고 `advanceEnrollment` 가 단일 커서(:511)인 한 **모드 선언만으로 얻어지지 않는다**. 🔴 다중 경로 도입 시 `optimistic lock(version)`·분산락·`GET_LOCK` **전부 grep 0** · **SQLite 폴백 호환이 명시적 설계 제약** → 반드시 **조건부 UPDATE + rowCount CAS** 채택(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:427-447).
- **#4 `SINGLE_REQUIRED` 가 승인 도메인의 안전 기본값 후보다.** 승인 게이트웨이에서 **2개 이상 일치 = 정의 결함**이지 런타임 선택 문제가 아니다. 다중 일치를 **첫 일치로 조용히 흡수(현행 :799)** 하면 **동일 조건에 승인·반려 엣지가 동시 매칭돼도 배열 순서대로 승인**된다.
- **#7 `MANUAL_REVIEW_ON_CONFLICT` 는 §12 #5 `HUMAN_TASK` 선행 필수다.** 🔴 사람 개입 대상(배정·클레임·큐)이 없으면 이 모드는 **"충돌 시 멈춤"과 구별 불가** = 이름만 다른 #6. **HUMAN_TASK 없이 #7 선언 = 가짜 녹색.**
- **모드 전환은 정의 변경이다.** 🔴 런타임 토글 금지 — Version 에 고정(§4.2 · §15 `enabled 여부` 규칙과 동일 논리).
- 🔴 `NOT_APPLICABLE` 5종 **"있다고 가정"하고 배선 금지**.
