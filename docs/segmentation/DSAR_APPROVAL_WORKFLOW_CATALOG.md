# DSAR — Workflow Catalog (§6)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §6 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_CATALOG` 테이블 | `workflow_definition`·`workflow_node`·`workflow_edge` **backend/src grep 0** | `NOT_APPLICABLE`(부재·grep 0 → 신설) |
| 워크플로 엔진 | BPMN·Temporal·Camunda·Flowable·Zeebe·StepFunctions **backend/src grep 0** | **엔진 자체 부재** — 카탈로그가 얹힐 런타임이 없다 |
| 워크플로 "목록" 유사물 | `JourneyBuilder` `journeys`(JourneyBuilder.php:35-38 · `nodes`/`edges` MEDIUMTEXT · `status DEFAULT 'draft'`) | **KEEP_SEPARATE_WITH_REASON** — 마케팅 여정 카탈로그(`approve|approval` **grep 0**). 승인 카탈로그로 전용 금지 |
| 카탈로그 대상 도메인 | `REBATE_*` **grep 0** | 카탈로그가 등재할 승인 대상이 코드에 없다 → **전방호환 계약** |
| `catalog_type` 스코프 축 | `tenant_id` 는 광범위 존재 · `organization_id`·`workspace_id` 는 승인계 테이블 **부재**(`admin_growth_approval` 은 tenant_id 조차 없음 · AdminGrowth.php:142-149) | `MIGRATION_REQUIRED` |
| `evidence` | 해시체인 선례 `menu_audit_log.hash_chain`(AdminMenu.php:123-131) **유일** · `audit_log`(Db.php:540-546)은 `actor·action·details_json·created_at` 뿐 — 🔴 단 `menu_audit_log` 은 **쓰기 체인만 실재·`verify()` 0·preimage `ts`(:195) 소실 → tamper-evident 아님**; 검증형 정본 = `SecurityAudit::verify():56-68` | 부분 재사용 |

**★현행에 "승인 워크플로 카탈로그"는 존재하지 않는다.** 현행 승인은 카탈로그 없이 **핸들러별 하드코딩 상태전이**로 분산돼 있다(§52 기존 구현 분류).

## 1. 원문 전사 + 판정

### 1.1 필수 필드 — **원문 18축** (`APPROVAL_WORKFLOW_CATALOG`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_catalog_id | 부재 | `NOT_APPLICABLE` |
| 2 | tenant_id | `auth_tenant` 미들웨어 주입(index.php:591-593) | `VALIDATED_LEGACY` 재사용 |
| 3 | organization_id | 부재(grep 0) | `NOT_APPLICABLE` |
| 4 | workspace_id | 실체=`tenant_kv` KV(WorkspaceState.php:59) — 레지스트리 아님 | `MIGRATION_REQUIRED` |
| 5 | catalog_type | 부재 | `NOT_APPLICABLE` |
| 6 | catalog_name | 부재 | `NOT_APPLICABLE` |
| 7 | supported domains | 부재 | `NOT_APPLICABLE` |
| 8 | template support | 부재 | `NOT_APPLICABLE` |
| 9 | custom workflow support | 부재 | `NOT_APPLICABLE` |
| 10 | restricted node policy | 부재 | `NOT_APPLICABLE` |
| 11 | mandatory control policy | 부재 | `NOT_APPLICABLE` |
| 12 | environment scope | `Db::envLabel()`(운영/데모 라벨·278차) | 부분 재사용 |
| 13 | owner | 부재 | `NOT_APPLICABLE` |
| 14 | active version | 부재 — 현행 승인계에 버전 개념 **전무** | `NOT_APPLICABLE` |
| 15 | status | 핸들러별 `status` 컬럼 존재하나 카탈로그 레벨 없음 | `NOT_APPLICABLE` |
| 16 | valid_from | 부재 | `NOT_APPLICABLE` |
| 17 | valid_to | 부재 | `NOT_APPLICABLE` |
| 18 | evidence | `menu_audit_log.hash_chain` 만 선례 — 🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts`(:195) 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68` | `MIGRATION_REQUIRED` |

**실측 개수: 18 / 18 전사.** 커버리지 = 신설 15 · 재사용/이관 3.

### 1.2 Catalog Type — **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PLATFORM | `admin_growth_approval` 이 사실상 전역(tenant_id 없음 · AdminGrowth.php:142-149) — **의도된 PLATFORM 이 아니라 격리 누락** | `MIGRATION_REQUIRED` |
| 2 | TENANT | `auth_tenant` 스코프 | `VALIDATED_LEGACY` |
| 3 | WORKSPACE | `tenant_kv` KV 뿐 | `MIGRATION_REQUIRED` |
| 4 | ORGANIZATION | 부재(grep 0) | `NOT_APPLICABLE` |
| 5 | DOMAIN | 부재 | `NOT_APPLICABLE` |
| 6 | PARTNER | `agency_client_link`(AgencyPortal.php:68) = 유일 파트너 스코프 선례 | `LEGACY_ADAPTER` |
| 7 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.**

## 2. 규칙

- **Catalog 은 Definition 의 상위 스코프 레지스트리**다. `catalog_type` 없이 Definition 을 테넌트에 직접 매달지 마라 — 현행 승인계가 정확히 그 상태이고, 그래서 `admin_growth_approval` 이 **전역 유출**됐다.
- 🔴 **`JourneyBuilder` 를 승인 카탈로그로 전용 금지.** `approve|approval` **grep 0** · 노드타입 10종(`action·condition·delay·email·kakao·push·sms·split·wait·webhook`)에 승인 노드 없음 → 전용 시 **287차 죽은 스켈레톤 재현**.
- 🔴 **`NOT_APPLICABLE` 15축을 "있다고 가정"하고 배선 금지.**
- `restricted node policy`·`mandatory control policy` 는 §16 Graph Validation 이 집행 주체다 — 카탈로그는 **선언**만 보유하고 판정을 중복 구현하지 마라(중복 엔진 금지).
