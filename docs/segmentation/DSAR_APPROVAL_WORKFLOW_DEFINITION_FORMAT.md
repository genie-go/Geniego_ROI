# DSAR — Workflow Definition Format (§10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §10 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 정의 포맷 | **부재** — Definition 이 데이터가 아니라 **PHP 코드**(FeedTemplate.php:258 · Mapping.php:309) | `NOT_APPLICABLE`(부재 → 신설) |
| BPMN | **backend/src grep 0** | `NOT_APPLICABLE` |
| 외부 엔진(Temporal·Camunda·Flowable·Zeebe·StepFunctions) | **전부 backend/src grep 0** | `NOT_APPLICABLE` — **통합할 외부 엔진이 없다** |
| JSON DSL 유사물 | `journeys.nodes`/`edges` MEDIUMTEXT JSON(JourneyBuilder.php:35-38) — **마케팅 여정 DSL**(승인 노드 grep 0) | `KEEP_SEPARATE_WITH_REASON` |
| `action_json`(Alerting) · `payload_json`(AdminGrowth.php:142-149) · `approvals_json` | **단건 페이로드**이지 그래프 정의 아님 | 축 다름 |
| YAML 파서 | 승인 도메인 grep 0 | `NOT_APPLICABLE` |

**★현행 커버리지 0/6.** 현행에 승인 정의 포맷은 존재하지 않는다.

## 1. 원문 전사 + 판정 — **원문 6종**(“최소 다음을 지원하라”)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | INTERNAL_JSON_DSL | 부재(승인). 인접 선례 = `journeys.nodes/edges` JSON — **전용 금지·형식 참조만** | `NOT_APPLICABLE`(신설) |
| 2 | BPMN_2_REFERENCE | **grep 0** | `NOT_APPLICABLE` |
| 3 | STATE_MACHINE_JSON | 부재 — 현행 상태머신은 코드(FeedTemplate.php:248-285) | `NOT_APPLICABLE` |
| 4 | YAML_DSL | 부재 | `NOT_APPLICABLE` |
| 5 | EXTERNAL_ENGINE_REFERENCE | **grep 0**(엔진 6종 전부 부재) | `NOT_APPLICABLE` |
| 6 | CUSTOM_ADAPTER | 부재 | `NOT_APPLICABLE` |

**실측 개수: 6 / 6 전사.** 커버리지 = **부재 6 / 6 (100%)**.

### 1.1 원문 서술 전사

> Canonical 실행 의미는 내부 Workflow Contract로 표준화한다.
>
> 외부 BPMN 또는 Engine Definition을 직접 Runtime Source of Truth로 사용하더라도 Canonical Node·Edge·Version·Execution Mapping을 유지하라.

**판정:** 현행은 외부 엔진이 **하나도 없으므로**(grep 0) 이 조항은 **전방호환 계약**이다 — 지금 어댑터를 배선할 대상이 없다.

## 2. 규칙

- **포맷은 6종을 지원하되 실행 의미는 하나**다(내부 Workflow Contract). 포맷마다 실행 엔진을 만들면 **중복 엔진 금지 위반**이다.
- 🔴 **외부 엔진 어댑터를 지금 구현 금지** — 대상이 grep 0 이다. 없는 것을 있다고 가정한 배선 = **287차 죽은 스켈레톤**.
- 🔴 **`journeys` JSON DSL 을 승인 포맷으로 재사용 금지**(승인 노드 부재). **형식적 참조**만 허용.
- 외부 정의를 Runtime SoT 로 쓰더라도 **Canonical Node·Edge·Version·Execution Mapping 은 필수 유지** — 매핑 없는 외부 위임은 §16 Graph Validation·§9 Version 을 무력화한다.
- 최초 구현 범위는 `INTERNAL_JSON_DSL` **1종**으로 족하다(나머지 5종은 계약상 확장점).
