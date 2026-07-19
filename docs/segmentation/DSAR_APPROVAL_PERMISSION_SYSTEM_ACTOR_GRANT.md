# DSAR — Permission System Actor Grant (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

플랫폼 **System Actor**(자동 의사결정 엔진·규칙/워크플로 실행 주체)에 부여되는 Grant의 Canonical 명세. System Actor는 사람 대신 정책·규칙 버전에 근거해 자동 집행하므로, **어떤 Auto-decision Policy/Rule/Workflow 버전에 근거해** 어떤 리소스·동작·금액/통화 범위에서 행위하는지를 결속한다. Human Actor의 Permission Bundle을 그대로 부여하지 않으며(자동집행의 무제한 확산 방지), 실행 client·system identity를 명시한다. Permission ≠ Role ≠ Authority(금액 한도는 Part 5 Approval Authority 연결 Contract).

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `system_grant_id` | System Actor Grant 식별자 |
| `system_actor_ref` | System identity(자동 엔진 주체) |
| `auto_decision_policy_ref` | 근거 Auto-decision Policy 참조 |
| `rule_version` | 근거 Rule 버전(In-place 변경 금지·버전 결속) |
| `workflow_version` | 근거 Workflow 버전 |
| `allowed_resource_types` | 허용 리소스 유형 집합(명시 열거) |
| `actions` | 허용 canonical action 집합 |
| `amount_scope_ref` / `currency_scope_ref` | 금액·통화 범위 참조(Approval Authority 연결) |
| `tenant_ref` / `legal_entity_ref` / `org_ref` | 귀속 테넌트/법인/조직 |
| `execution_client` | 실행 client 결속 |
| `system_identity_ref` | 시스템 자격/인증 identity |
| `human_bundle_denied` | Boolean(항상 true·Human Actor Bundle 이식 금지) |
| `audit_ref` | 부여/자동집행 감사 참조 |
| `digest` | Grant 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**actor type**: `SYSTEM`(본 엔티티) — HUMAN_USER / SERVICE_ACCOUNT / API_CLIENT와 구분.
**lifecycle status**: `PROVISIONED` · `ACTIVE` · `POLICY_STALE`(근거 정책/룰 버전 노후) · `SUSPENDED` · `EXPIRED` · `REVOKED`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 실행 게이트(PEP) | index.php 중앙 RBAC(roleRank/scope) | CANONICAL(확장) | `index.php:553-603` |
| 프로그래매틱 자격 | api_key(`scopes_json`·role) | CANONICAL(프로그래매틱) | `index.php:577`·`Keys.php:191,204` |
| tenant 강제주입 | X-Tenant 주입 | CANONICAL | `index.php:619` |
| 자동집행 감사 | `auth_audit_log` | Evidence PARTIAL | `UserAuth::logAudit` |

★**정직/ABSENT**: `system_actor_ref`·`auto_decision_policy_ref`·`rule_version`·`workflow_version`·`allowed_resource_types`/`actions` 결속·`amount_scope_ref`/`currency_scope_ref`·`org_ref`·`execution_client`·`system_identity_ref`·`human_bundle_denied` 강제·`digest` = **전부 순신규 ABSENT**. 현 substrate에 System Actor를 별도 actor-type으로 구분하는 축 없음·자동집행 근거 정책/룰/워크플로 버전 결속 부재. 금액/통화 scope는 Part 5 부재로 미연결.

## 5. 설계 원칙 / 결정

- **Human Actor Bundle 그대로 부여 금지**(`human_bundle_denied=true`) — System Actor 권한은 근거 정책/룰/워크플로 버전에서 도출된 최소 리소스/동작만.
- 자동집행은 반드시 `auto_decision_policy_ref`+`rule_version`+`workflow_version` 결속 — 근거 버전 없는 자동집행 Deny(fail-closed).
- `amount_scope_ref`/`currency_scope_ref`는 Part 5 Approval Authority와 연결 Contract만(Permission이 금액한도를 스스로 판정하지 않음).
- Cross-tenant 자동집행 금지 — `tenant_ref` 강제.
- Golden Rule: index.php RBAC + api_key를 System Actor substrate로 확장(중복 엔진 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: System actor-type·정책/룰/워크플로 버전 결속·금액 scope·human bundle 금지 = 순신규.
- **BLOCKED_PREREQUISITE**: policy/rule/workflow 버전 결속·amount scope는 선행 Decision Core + Part 5 Approval Authority + Canonical Rule/Workflow Version Registry 부재로 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
