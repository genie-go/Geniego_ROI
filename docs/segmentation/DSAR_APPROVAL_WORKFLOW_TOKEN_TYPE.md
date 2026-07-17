# DSAR — Workflow Token Type (§33)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §33(Token Type) · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)
> 필드 축은 [DSAR_APPROVAL_WORKFLOW_TOKEN.md](DSAR_APPROVAL_WORKFLOW_TOKEN.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Token 개념 | `workflow_token`·`token_id`·`parent_token`·`fork_ref`·`join_ref` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| Token 종류 축 | **부재** — 토큰이 없으므로 그 분류도 없음 | `NOT_APPLICABLE` |
| 실행 경로 커서 | `journey_enrollments.current_node`(JourneyBuilder.php:44) **스칼라 1개** · `nextNode(...): string`(:786) **단일 반환** | **토큰 1개 고정 = 종류 개념 성립 불가** |

**★축 주의 — 종류(type)는 복수 토큰을 전제한다.** `PRIMARY` 와 `BRANCH` 를 구분하는 것은 **동시에 여러 토큰이 살아 있을 때만** 의미가 있다. 현행은 커서가 1개(:44)이고 `split` 조차 `pickWeighted`(:618)로 **택일**하므로 — 굳이 매핑하면 현행 커서를 `PRIMARY` 라 부를 수 있으나 **그것은 이름 붙이기이지 커버가 아니다**. 8종 전부 `NOT_APPLICABLE` 로 판정한다.

## 1. 원문 전사 + 판정 — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PRIMARY | 부재 · 인접 = `journey_enrollments.current_node`(:44) **단일 커서** — 이름을 붙이면 PRIMARY 이나 **종류 축이 없다** | `NOT_APPLICABLE` |
| 2 | BRANCH | **부재** — `split`(:614-621)은 **택일**(`pickWeighted` :618 → `nextNode` 단일 반환 :620). 분기 토큰이 생기지 않음 | `NOT_APPLICABLE` |
| 3 | SUB_WORKFLOW | **부재** — `sub_journey`/`call_activity` **grep 0** | `NOT_APPLICABLE` |
| 4 | COMPENSATION | **부재** · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) — **토큰 축 아님** | `NOT_APPLICABLE` |
| 5 | REPLAY | **부재**(리플레이 개념 grep 0) | `NOT_APPLICABLE` |
| 6 | MIGRATION | **부재**(정의 버전 개념 grep 0) | `NOT_APPLICABLE` |
| 7 | ERROR | **부재** — 여정은 실패 상태조차 없다(예외 시 `release`(:417)로 `waiting` 복귀 = **에러 경로 없이 원위치**) | `NOT_APPLICABLE` |
| 8 | TIMEOUT | **부재**(토큰) · 인접 = `wait` mode=event 의 timeout 분기(:565-570 `wait_until <= now` → `nextNode($edges,$nodeId,'timeout')`) — **엣지 라벨**이지 토큰 아님 | `KEEP_SEPARATE_WITH_REASON` |

**실측 개수: 8 / 8 전사.** 커버리지 = 부재 7 · `KEEP_SEPARATE_WITH_REASON` 1 · **`VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 0**.

★ **5-3-2 범위에서 `LEGACY_ADAPTER` 조차 0인 유일한 축이다.** 위임할 인접 자산이 없다 — 토큰 종류는 토큰 없이 존재할 수 없기 때문이다. 이는 **§33 필드 축(15종) 신설이 선행되지 않으면 이 문서의 8종은 전부 무의미**하다는 뜻이다.

## 2. 규칙

- 🔴 **현행 단일 커서(:44)를 `PRIMARY` 로 명명하고 "1/8 커버"라 계산 금지.** 종류 축은 복수 토큰의 존재를 전제한다. 이름 붙이기를 커버로 세는 것이 **역산의 가장 순수한 형태**다.
- 🔴 **`TIMEOUT`(#8) 을 `wait` timeout 분기(:565-570)로 대체 금지.** 형태는 닮았으나 그것은 **엣지 라벨**(`nextNode($edges,$nodeId,'timeout')`)이다 — **같은 토큰이 다른 엣지로 갈 뿐** 새 토큰이 생기지 않는다. §33 `TIMEOUT` 토큰은 **원 토큰과 병존**하는 별 토큰이다(원 토큰은 여전히 대기 중일 수 있다). 이 차이를 무시하면 **타임아웃 시 원 경로가 조용히 사라진다**.
- 🔴 **`ERROR`(#7) 배선 시 현행 `release`(:417) 패턴을 참조 구현으로 삼지 마라** — `UPDATE journey_enrollments SET status='waiting' WHERE id=:id AND status='processing'` 은 **예외를 삼키고 원위치**시킨다. 실패가 상태로 남지 않으므로 **무한 재시도**가 된다(여정에서는 cron `*/5` 가 계속 집는다). 승인 도메인에서 이 패턴은 **`DEAD_LETTERED` 도달 불가**를 뜻한다.
- 🔴 **8종 중 `SUB_WORKFLOW`·`REPLAY`·`MIGRATION` 은 각각 §22(Sub-workflow)·정의 버전 축이 선행되지 않으면 배선 금지** — 셋 다 참조 대상(child 정의·과거 실행 이력·정의 버전)이 **현행에 존재하지 않는다**. "있다고 가정" 배선 금지.
- **필드 축 선행 필수** — [DSAR_APPROVAL_WORKFLOW_TOKEN.md](DSAR_APPROVAL_WORKFLOW_TOKEN.md) §33 15종(특히 `parent_token_id`·`fork reference`·`join reference`)이 없으면 `BRANCH`/`SUB_WORKFLOW`/`COMPENSATION` 은 **부모를 가리킬 곳이 없다**.
