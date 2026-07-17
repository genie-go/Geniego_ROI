# DSAR — Approval Request (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — 두 Request 테이블 컬럼 전수

| 컬럼 | `mapping_change_request`<br>(Db.php:623-636) | `action_request`<br>(Db.php:592-600) | Canonical 분류 |
|---|---|---|---|
| `id` | ✔ INT AI PK | ✔ INT AI PK | **CANONICAL_APPROVAL_REQUEST**(승격) |
| `tenant_id` | ✔ VARCHAR(100) NULL | ✔ **후행 ALTER**(Db.php:589 · 208차 P0 IDOR) | **VALIDATED_LEGACY** |
| `status` | ✔ DEFAULT `'pending'` | ✔ NOT NULL(기본값 없음) | **VALIDATED_LEGACY** → §27 |
| `requested_by` | ✔ VARCHAR(255) NOT NULL | **없음** | **MIGRATION_REQUIRED**(요청자 미기록) |
| `approvals_json` | ✔ MEDIUMTEXT | ✔ MEDIUMTEXT | **VALIDATED_LEGACY**(Decision 누적) |
| **`required_approvals`** | ✔ **INT NOT NULL DEFAULT 2**(실사용 — Mapping.php:288 정족수 판정) | ★**컬럼 없음** — 응답의 `"required_approvals" => 2` 는 **하드코딩 리터럴**(Alerting.php:562) | **★MIGRATION_REQUIRED**(아래 §1-1) |
| `created_at` | ✔ VARCHAR(32) | ✔ VARCHAR(32) | **VALIDATED_LEGACY** |
| `platform`·`field`·`raw_value`·`canonical_value`·`note` | ✔ (Resource/Action 을 **평면 컬럼으로 인라인**) | — | **MIGRATION_REQUIRED**(§9/§10 분리) |
| `policy_id` | — | ✔ INT(Requirement 출처 유일 흔적) | **LEGACY_ADAPTER** |
| `action_json` | — | ✔ MEDIUMTEXT(Action 을 **JSON 블롭**으로) | **MIGRATION_REQUIRED**(§10 분리) |
| **부재 공통** | \_ | \_ | **NOT_APPLICABLE(부재·grep 0 → 신설)** |

**두 테이블 모두 부재(grep 0)**: `domain_type` · `request_type` · `approval_case_id` · `version` · `amount`/`currency` · `workspace_id`/`legal_entity_id`/`environment` · `idempotency_key` · `correlation_id` · `resource_snapshot` · `context_snapshot` · `policy_version` · `expires_at` · `withdrawn/cancelled/reopened/superseded` 계열.

### 0-1. ★`required_approvals` 3계층 붕괴 (실측)

```
DB      : action_request 에 컬럼 없음            (Db.php:592-600)
Backend : "required_approvals" => 2  ← 리터럴    (Alerting.php:562)
Decision: 1회 approve → 즉시 approved            (Alerting.php:594 · 정족수 미참조)
Frontend: state 에 매핑 1회, 이후 참조 0 → 렌더 0 (Approvals.jsx:576)
```
→ **표시용 장식**. DB에 근거 없고, 판정에 쓰이지 않고, 화면에 그려지지도 않는다.
※ 289차 재증명: `INSERT INTO action_request` **grep 0**(생산자 전무) → 실피해 **VACUOUS**(P1 · 미도달).

### 0-2. Environment / Currency (스펙 §7 필수 축)

| 축 | 실측 | 분류 |
|---|---|---|
| Environment | `Db::env()`(Db.php:46,57) — `GENIE_ENV` → `'demo'|'production'` **2값 분기**(레지스트리 아님) | **LEGACY_ADAPTER** |
| Currency | `fxToKrw`(Connectors.php:1749) — 24통화 하드코딩 + app_setting 캐시 | **LEGACY_ADAPTER** |
| Workspace | 레지스트리 부재 — 실체는 `tenant_kv` KV(WorkspaceState.php:59) | **NOT_APPLICABLE(신설)** |
| Organization · Legal Entity | **부재(grep 0)** | **NOT_APPLICABLE(신설)** |

## 1. 스펙 §7 `APPROVAL_REQUEST` 필수 필드 전사 — 원문 실측 **35개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §7**

> 🔴 **REQ 집계 31 ↔ 원문 실측 35 — 원문이 정본.**
> REQ `§7` 표의 *"§7 Approval Request 필수 필드 = **31**"* 은 **원문 나열과 4건 어긋난다**(원문 나열 실측 = 35).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**

**현행 존재 여부는 §0 실측표에서만 인용**한다. §0 이 다루지 않는 필드는 §0 의 **"두 테이블 모두 부재(grep 0)"** 열거에 근거하며, 그 열거에도 없으면 **판정 유보**로 둔다.

| # | 필수 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_request_id` | **존재** — §0 `id` INT AI PK(양 테이블) · **CANONICAL_APPROVAL_REQUEST**(승격) |
| 2 | `request_number` | ⚠️ **판정 유보** — §0 미열거(별도 실측 필요) |
| 3 | `approval_domain_type` | **부재** — §0 "두 테이블 모두 부재" `domain_type` · **NOT_APPLICABLE(신설)** |
| 4 | `request_type` | **부재** — §0 "두 테이블 모두 부재" `request_type` · **NOT_APPLICABLE(신설)** |
| 5 | `tenant_id` | **존재** — §0 `tenant_id`(`action_request` 는 **후행 ALTER** Db.php:589 · 208차 P0 IDOR) · **VALIDATED_LEGACY** |
| 6 | `workspace_id` | **부재** — §0-2 Workspace 레지스트리 부재(실체 = `tenant_kv` WorkspaceState.php:59) · **NOT_APPLICABLE(신설)** |
| 7 | `organization_id` | **부재** — §0-2 Organization 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 8 | `legal_entity_id` | **부재** — §0-2 Legal Entity 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 9 | `country` | ⚠️ **판정 유보** — §0 미열거 |
| 10 | `region` | ⚠️ **판정 유보** — §0 미열거 |
| 11 | `environment` | **부재(레코드)** — §0-2 Environment = `Db::env()`(Db.php:46,57) **2값 분기 · 레지스트리 아님** · **LEGACY_ADAPTER** |
| 12 | `requester_subject_id` | **부분** — §0 `requested_by`(`mapping_change_request` 만) · `action_request` **없음** · **MIGRATION_REQUIRED**(요청자 미기록) |
| 13 | `requester_role_assignment_id` | ⚠️ **판정 유보** — §0 미열거 |
| 14 | `requested_for_subject_id` | ⚠️ **판정 유보** — §0 미열거 |
| 15 | `source_system` | ⚠️ **판정 유보** — §0 미열거 |
| 16 | `source_channel` | ⚠️ **판정 유보** — §0 미열거 |
| 17 | `business_resource_type` | **부재** — §0 `platform`·`field` 등이 **평면 인라인**(§9 분리 대상) · **MIGRATION_REQUIRED** |
| 18 | `business_resource_id` | **부재** — §0 동일(인라인) · **MIGRATION_REQUIRED** |
| 19 | `business_resource_version` | **부재** — §0 "두 테이블 모두 부재" `version` · **NOT_APPLICABLE(신설)** |
| 20 | `requested_action` | **부재(명시 필드)** — §0 `action_json` **JSON 블롭**(§10 분리 대상) · **MIGRATION_REQUIRED** |
| 21 | `requested_amount` | **부재** — §0 "두 테이블 모두 부재" `amount`/`currency` · **NOT_APPLICABLE(신설)** |
| 22 | `requested_currency` | **부재** — §0 동일 · §0-2 Currency = `fxToKrw` **LEGACY_ADAPTER**(레코드 미기록) |
| 23 | `requested_scope` | ⚠️ **판정 유보** — §0 미열거 |
| 24 | `business_justification` | **부분** — §0 `note`(`mapping_change_request` 인라인 컬럼군) · **MIGRATION_REQUIRED** |
| 25 | `urgency` | ⚠️ **판정 유보** — §0 미열거 |
| 26 | `risk_reference` | ⚠️ **판정 유보** — §0 미열거 |
| 27 | `policy_reference` | **부분** — §0 `policy_id`(`action_request` 만 · Requirement 출처 유일 흔적) · **LEGACY_ADAPTER** |
| 28 | `authorization_decision_reference` | ⚠️ **판정 유보** — §0 미열거 |
| 29 | `correlation_id` | **부재** — §0 "두 테이블 모두 부재" `correlation_id` · **NOT_APPLICABLE(신설)** |
| 30 | `parent_request_id` | ⚠️ **판정 유보** — §0 미열거 |
| 31 | `original_request_id` | ⚠️ **판정 유보** — §0 미열거 |
| 32 | `submitted_at` | **존재(근사)** — §0 `created_at` VARCHAR(32)(양 테이블) · **VALIDATED_LEGACY**(제출시각과 생성시각 동일시 주의) |
| 33 | `valid_until` | **부재** — §0 "두 테이블 모두 부재" `expires_at` · **NOT_APPLICABLE(신설)** |
| 34 | `status` | **존재** — §0 `status`(`mapping` DEFAULT `'pending'` · `action` NOT NULL) · **VALIDATED_LEGACY** → §27 |
| 35 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 35 = **존재 4**(1·5·32·34) + **부분 3**(12·24·27) + **부재 8**(3·4·6·7·8·17·18·19·21·22·29·33 중 §0 근거분) + **판정 유보 13**.

> ⚠️ **"판정 유보 13"을 부재로 단정하지 않는다.** §0 은 **스펙 §7 을 모르는 상태에서 작성**됐으므로 그 필드들을 측정 대상으로 삼지 않았다 — **미측정 ≠ 부재**. 유보 해제는 별도 실측 세션.
> ※ §0 의 **부재 목록은 추측이 아니다** — 스펙 예단이 아니라 **현행 두 테이블이 실제로 갖지 않은 컬럼의 실측 열거**다(각 항목 grep 0 확인).

## 2. 규칙

- **Request ≠ Business Resource**(스펙 §4.1). 현행 `mapping_change_request` 는 Resource(platform/field/raw/canonical)를 **Request 에 인라인** → §9 분리 대상.
- **정족수는 DB 컬럼에서만 읽는다.** 리터럴 하드코딩 금지(Alerting.php:562 재발 방지 · Static Lint 후보).
- **`Mapping::approve` 를 확장**하라(유일 REAL). `action_request` 승인부 신설 금지 — **기존 확장**(Golden Rule).
