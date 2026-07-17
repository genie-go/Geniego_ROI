# DSAR — Workflow Template (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §7 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_TEMPLATE` | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 템플릿 유사물 | `feed_template`(FeedTemplate.php) — **채널 피드 템플릿**이지 승인 워크플로 템플릿 아님 | `KEEP_SEPARATE_WITH_REASON`(명명 충돌 주의) |
| 알림 템플릿 | notification template 계열 존재 | §17 `notification template reference` 로만 참조 |
| 유일한 "기본 승인 형태" | `Mapping::approve`(Mapping.php:238-294) `required_approvals INT DEFAULT 2`(Db.php:623-636) | **`SIMPLE_SINGLE_APPROVAL` 아님 — 2인 정족수가 기본** |
| production certification | 부재(grep 0) | `NOT_APPLICABLE` |

**★현행에 재사용 가능한 승인 워크플로 템플릿은 0건.** 승인 형태는 핸들러마다 다시 손으로 짜여 있다(불균등의 원인).

## 1. 원문 전사 + 판정 — 필수 필드 **원문 17축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_template_id | 부재 | `NOT_APPLICABLE` |
| 2 | template_code | 부재 | `NOT_APPLICABLE` |
| 3 | template_name | 부재 | `NOT_APPLICABLE` |
| 4 | domain types | 부재 | `NOT_APPLICABLE` |
| 5 | template version | 부재 — 승인계 버전 개념 전무 | `NOT_APPLICABLE` |
| 6 | default nodes | 부재(노드 개념 없음) | `NOT_APPLICABLE` |
| 7 | default edges | 부재(엣지 개념 없음) | `NOT_APPLICABLE` |
| 8 | default requirements | 유사물 = `required_approvals DEFAULT 2`(Db.php:623-636) — **단일 스칼라**(요구사항 집합 아님) | `MIGRATION_REQUIRED` |
| 9 | mandatory nodes | 부재 | `NOT_APPLICABLE` |
| 10 | optional nodes | 부재 | `NOT_APPLICABLE` |
| 11 | prohibited modifications | 부재 | `NOT_APPLICABLE` |
| 12 | supported variables | 부재 | `NOT_APPLICABLE` |
| 13 | supported assignment hooks | 부재 — Human Task 배정 개념 없음 | `NOT_APPLICABLE` |
| 14 | production certification state | 부재 | `NOT_APPLICABLE` |
| 15 | owner | 부재 | `NOT_APPLICABLE` |
| 16 | status | 부재(템플릿 레벨) | `NOT_APPLICABLE` |
| 17 | evidence | `menu_audit_log.hash_chain`(AdminMenu.php:123-131) 만 선례 | `MIGRATION_REQUIRED` |

**실측 개수: 17 / 17 전사.** 커버리지 = 신설 15 · 이관 2.

## 2. 규칙

- **Template ≠ Definition.** Template 은 Definition 생성의 **원형**이고, 생성 후 Definition 은 독립 수명을 갖는다(§4.1 Definition/Instance 분리와 별개 축).
- `prohibited modifications` 는 **Custom Workflow 가 보안 정책을 우회할 수 없다**(§4.10)의 집행점이다 — Template 이 금지한 수정을 §16 Graph Validation 이 재검증해야 한다(**두 곳 다 필요** · 선언과 집행의 분리).
- 🔴 **`feed_template` 과 명명 충돌 주의** — 동일 개념 아님. 재사용 금지.
- `default requirements` 를 현행 `required_approvals` 스칼라로 축소 금지 — **정족수는 요구사항의 한 속성일 뿐**이다.
