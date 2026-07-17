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

## 1. 스펙 §7 필수 필드 31개 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모는 **"§7 Approval Request 필수 필드 = 31"** 이라는 **개수만** 영속한다. **31개 필드명은 저장소에 없다.**
필드명 추측 생성 금지 — REQ §16(요구 날조 0) · REQ §9(351 사건). **해제 조건**: 스펙 §7 원문 수령.

> ※ 위 §0 의 **부재 목록은 추측이 아니다** — 스펙이 요구할 항목의 예단이 아니라, **현행 두 테이블이 실제로 갖지 않은 컬럼의 실측 열거**다(각 항목 grep 0 확인).

## 2. 규칙

- **Request ≠ Business Resource**(스펙 §4.1). 현행 `mapping_change_request` 는 Resource(platform/field/raw/canonical)를 **Request 에 인라인** → §9 분리 대상.
- **정족수는 DB 컬럼에서만 읽는다.** 리터럴 하드코딩 금지(Alerting.php:562 재발 방지 · Static Lint 후보).
- **`Mapping::approve` 를 확장**하라(유일 REAL). `action_request` 승인부 신설 금지 — **기존 확장**(Golden Rule).
