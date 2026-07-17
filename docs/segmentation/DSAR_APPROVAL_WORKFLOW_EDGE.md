# DSAR — Workflow Edge (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §15 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `workflow_edge` | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 전이 "간선"의 현행 형태 | **PHP 조건문** — `FeedTemplate::transition`(FeedTemplate.php:258) `$r['status'] !== $from` → `invalid_state` **409** · `must_approve_first` **409**(:285) | `VALIDATED_LEGACY`(**Edge 의 의미론적 원형** — 소스/타겟 강제) |
| 엣지 저장 유사물 | `journeys.edges` MEDIUMTEXT(JourneyBuilder.php:35-38) — **마케팅 여정**(승인 grep 0) | `KEEP_SEPARATE_WITH_REASON` |
| `condition reference` | 부재(§19) | `NOT_APPLICABLE` |
| `condition priority`/`default path` | 부재 — 분기 개념 전무(현행은 **선형 전이**) | `NOT_APPLICABLE` |

**★현행 승인 흐름은 그래프가 아니라 직선이다.** `draft→submitted→approved→published` 는 분기 없는 **단일 경로**이므로 Edge 타입·우선순위·기본경로가 성립할 여지가 없다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 15축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_edge_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_version_id | 부재(§9) | `NOT_APPLICABLE` |
| 3 | edge_code | 부재 | `NOT_APPLICABLE` |
| 4 | source_node_id | 부재 · 유사 = `transition($from)` 인자(FeedTemplate.php:249) | `LEGACY_ADAPTER` |
| 5 | target_node_id | 부재 · 유사 = `transition($to)` 인자(FeedTemplate.php:249) | `LEGACY_ADAPTER` |
| 6 | edge_type | 부재 | `NOT_APPLICABLE` |
| 7 | condition reference | 부재(§19) | `NOT_APPLICABLE` |
| 8 | condition priority | 부재 | `NOT_APPLICABLE` |
| 9 | default path 여부 | 부재 | `NOT_APPLICABLE` |
| 10 | event reference | 부재(§20) | `NOT_APPLICABLE` |
| 11 | timeout reference | 부재(§21) | `NOT_APPLICABLE` |
| 12 | label | 부재 | `NOT_APPLICABLE` |
| 13 | enabled 여부 | 부재 | `NOT_APPLICABLE` |
| 14 | status | 부재(엣지 레벨) | `NOT_APPLICABLE` |
| 15 | evidence | 부분(`audit_log` Db.php:540-546 — tenant_id·해시체인 없음) | `MIGRATION_REQUIRED` |

**실측 개수: 15 / 15 전사.** ★**말미 `evidence` 포함 확인.** 커버리지 = 신설 12 · 어댑터 2 · 이관 1.

> Edge Type 16종은 [DSAR_APPROVAL_WORKFLOW_EDGE_TYPE.md](DSAR_APPROVAL_WORKFLOW_EDGE_TYPE.md) 참조.

## 2. 규칙

- **Edge 는 데이터여야 한다.** 현행처럼 `$from`/`$to` 가 코드 인자면 §16 Graph Validation(도달가능성·고아·데드엔드)이 **원리적으로 불가능**하다.
- `FeedTemplate::transition` 의 **소스 상태 강제 + 역행 차단 409** 는 Edge 의 검증된 의미론이다 — **신설이 아니라 데이터로 승격**하라(Golden Rule: Extend).
- `enabled 여부` 는 Version 불변(§4.2)과 충돌하지 않는다 — **Version 내 선언**이지 런타임 토글이 아니다. 🔴 런타임 Edge 토글로 구현 금지(정의 변조 = §4.2 위배).
- `condition priority` + `default path 여부` 는 §18 Gateway `EvaluationMode`(`HIGHEST_PRIORITY`·`DEFAULT_ON_NO_MATCH`)의 입력이다 — **Gateway 없이 Edge 조건만으로 분기 판정 금지**(중복 판정 엔진 발생).
- 🔴 `NOT_APPLICABLE` 12축 **"있다고 가정"하고 배선 금지**.
