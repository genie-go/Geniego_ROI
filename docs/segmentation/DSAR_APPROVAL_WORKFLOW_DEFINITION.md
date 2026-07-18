# DSAR — Workflow Definition (§8)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §8 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `workflow_definition` | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| Definition/Instance 분리(§4.1) | 현행 승인은 **Definition 이 없다** — 전이 규칙이 **PHP 코드에 하드코딩**(FeedTemplate.php:258 `$r['status'] !== $from` · Mapping.php:309 `$r["status"] !== "approved"`) | **구조적 부재** |
| 가장 근접한 "정의된 흐름" | `FeedTemplate::transition`(FeedTemplate.php:248-285) `draft→submitted→approved→published` 순차 강제 · 역행 시 `invalid_state` **409** · `must_approve_first` **409**(:285) | `VALIDATED_LEGACY`(현행 유일한 명시적 상태전이 강제 = Definition 의 **원형**) |
| 실행 전 게이트 | `Mapping::apply`(Mapping.php:309) `status !== "approved"` → **400** | `VALIDATED_LEGACY`(현행 유일한 실행 전 승인 게이트) |
| 그래프 저장 유사물 | `journeys.nodes`/`edges` MEDIUMTEXT(JourneyBuilder.php:35-38) — **마케팅 여정**(`approve|approval` **grep 0** · 노드 10종에 승인 없음) | `KEEP_SEPARATE_WITH_REASON` — **승인 Definition 으로 전용 금지** |
| `REBATE_*` | **grep 0** | Definition 이 적용될 대상 부재 → **전방호환 계약** |

**★핵심: 현행에 Workflow Definition 은 데이터가 아니라 코드다.** 따라서 §4.2(실행 중 Definition 덮어쓰기 금지)는 **현행에서 검증 불가** — 배포가 곧 정의 변경이다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 31축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_definition_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_catalog_id | 부재(§6) | `NOT_APPLICABLE` |
| 3 | workflow_code | 부재 | `NOT_APPLICABLE` |
| 4 | workflow_name | 부재 | `NOT_APPLICABLE` |
| 5 | workflow_description | 부재 | `NOT_APPLICABLE` |
| 6 | workflow_type | 부재 | `NOT_APPLICABLE` |
| 7 | tenant_id | `auth_tenant` 주입(index.php:591-593) | `VALIDATED_LEGACY` |
| 8 | workspace_id | `tenant_kv` KV(WorkspaceState.php:59) — 레지스트리 아님 | `MIGRATION_REQUIRED` |
| 9 | organization_id | 부재(grep 0) | `NOT_APPLICABLE` |
| 10 | legal_entity_scope | 부재(grep 0) | `NOT_APPLICABLE` |
| 11 | country scope | 부재(승인 도메인) | `NOT_APPLICABLE` |
| 12 | environment scope | `Db::envLabel()`(278차) | 부분 재사용 |
| 13 | approval domain types | 부재 | `NOT_APPLICABLE` |
| 14 | applicable request types | 부재 | `NOT_APPLICABLE` |
| 15 | applicable resource types | 부재 | `NOT_APPLICABLE` |
| 16 | template reference | 부재(§7) | `NOT_APPLICABLE` |
| 17 | default priority | 부재 | `NOT_APPLICABLE` |
| 18 | start node reference | 부재 | `NOT_APPLICABLE` |
| 19 | terminal node references | 부재 | `NOT_APPLICABLE` |
| 20 | maximum execution duration | 부재 | `NOT_APPLICABLE` |
| 21 | maximum active instances | 부재 | `NOT_APPLICABLE` |
| 22 | custom 여부 | 부재 | `NOT_APPLICABLE` |
| 23 | system defined 여부 | 부재 | `NOT_APPLICABLE` |
| 24 | reusable 여부 | 부재 | `NOT_APPLICABLE` |
| 25 | sub-workflow usable 여부 | 부재 | `NOT_APPLICABLE` |
| 26 | owner | 부재 | `NOT_APPLICABLE` |
| 27 | active version | 부재 — 승인계 버전 개념 전무 | `NOT_APPLICABLE` |
| 28 | status | 레코드 `status` 는 있으나 **Definition status** 아님 | `NOT_APPLICABLE` |
| 29 | valid_from | 부재 | `NOT_APPLICABLE` |
| 30 | valid_to | 부재 | `NOT_APPLICABLE` |
| 31 | evidence | `menu_audit_log.hash_chain`(AdminMenu.php:123-131) 만 선례 — 🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts`(:195) 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68` | `MIGRATION_REQUIRED` |

**실측 개수: 31 / 31 전사.** 커버리지 = 신설 27 · 재사용/이관 4.

## 2. 규칙

- **Definition 은 데이터여야 한다.** 현행처럼 PHP 조건문에 박히면 §4.2(실행 중 Definition 불변)·§9(Version)·§16(Graph Validation)이 **전부 성립 불가**다.
- `FeedTemplate::transition` 은 **Definition 의 의미론적 원형**으로 참조하라 — 순차 강제·역행 차단·`must_approve_first` 는 이미 REAL 이다. 단 **코드에서 데이터로 승격**해야 한다(Golden Rule: Extend).
- 🔴 **`journeys` 테이블에 승인 Definition 을 얹지 마라.** 노드 10종(`action·condition·delay·email·kakao·push·sms·split·wait·webhook`)에 승인 노드가 없고 `approve|approval` grep 0 → 전용 시 **죽은 스켈레톤**(287차).
- 🔴 `NOT_APPLICABLE` 27축을 "있다고 가정"하고 배선 금지.
- `tenant_id`·`workspace_id`·`organization_id`·`legal_entity_scope` 4축은 **Definition 공유·실행 격리**(§4.9)의 전제다 — 스코프 없이 Definition 을 전역 배치하면 `admin_growth_approval` 의 전역 유출이 재현된다.
