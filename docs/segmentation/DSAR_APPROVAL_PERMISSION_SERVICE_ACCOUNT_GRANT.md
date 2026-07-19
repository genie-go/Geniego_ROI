# DSAR — Permission Service Account Grant (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

비대화형(non-interactive) **Service Account**에 부여되는 Grant의 Canonical 명세. Service Account는 사람이 아니라 자동화/배치/통합 실행 주체이므로, **Interactive Permission(로그인 UI 세션 기반 권한) 부여 금지**·**Human Approval Permission(사람 승인 동작) 기본 금지**를 강제한다. Human Actor의 Permission Bundle을 그대로 이식하지 않으며, 허용 client·리소스·동작·법인·테넌트를 명시 결속하고 rotation/expiration을 상시 요구한다. Permission ≠ Role ≠ Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `service_grant_id` | Service Account Grant 식별자 |
| `service_account_ref` | 대상 Service Account identity |
| `permission_code` / `permission_version` | 부여 Permission Canonical Code + 버전 결속 |
| `allowed_client_binding` | 허용 실행 client 결속(이 client 외 사용 금지) |
| `resource_type` | 접근 허용 리소스 유형 |
| `action` | 허용 canonical action |
| `tenant_ref` | 귀속 테넌트(Cross-tenant 금지) |
| `legal_entity_ref` | 귀속 법인 |
| `network_ref` | 허용 네트워크/IP 경계 |
| `certificate_ref` | 인증서/키 자격 참조(mTLS 등) |
| `rotation_policy` | 자격 회전 주기/정책(필수) |
| `expiration` | 만기([`DSAR_APPROVAL_PERMISSION_EXPIRATION`](DSAR_APPROVAL_PERMISSION_EXPIRATION.md)·필수) |
| `business_owner` / `technical_owner` | 사업/기술 책임자(회수·재검토 주체) |
| `interactive_denied` | Boolean(항상 true·대화형 권한 금지) |
| `human_approval_denied` | Boolean(기본 true·APPROVE/OVERRIDE/CERTIFY 금지) |
| `audit_ref` | 부여/사용 감사 참조 |
| `digest` | Grant 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**denied approval actions(기본 금지)**: `APPROVE` · `OVERRIDE` · `CERTIFY`(명시 예외 없이는 Deny).
**lifecycle status**: `PROVISIONED` · `ACTIVE` · `ROTATION_DUE` · `EXPIRED` · `SUSPENDED`([`DSAR_APPROVAL_PERMISSION_SUSPENSION`](DSAR_APPROVAL_PERMISSION_SUSPENSION.md)) · `REVOKED`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 프로그래매틱 자격 최근접 | api_key(`scopes_json`·role) | CANONICAL(PEP·프로그래매틱) | `index.php:577`·`Keys.php:191,204`·`UserAuth.php:4307` |
| 실행 게이트(PEP) | index.php 중앙 RBAC(roleRank/scope/write) | CANONICAL(확장) | `index.php:553-603` |
| tenant 강제주입 | X-Tenant 주입(Cross-tenant 격리) | CANONICAL | `index.php:619` |
| 부여 감사 | `auth_audit_log` | Evidence PARTIAL | `UserAuth::logAudit` |

★**정직/ABSENT**: `service_account_ref`(별도 Service Account identity 축)·`allowed_client_binding`·`network_ref`·`certificate_ref`(mTLS)·`rotation_policy`·`business_owner`/`technical_owner`·`interactive_denied`/`human_approval_denied` 강제·`digest` = **전부 순신규 ABSENT**. 현 api_key는 사람/서비스 구분 없는 role+scopes만·rotation/owner/interactive 금지 정책 부재. Service Account를 Human과 분리하는 actor-type 축 자체가 없음.

## 5. 설계 원칙 / 결정

- **Interactive Permission 부여 금지** — Service Account에 UI 세션 기반 권한 이식 불가(`interactive_denied=true`).
- **Human Approval Permission 기본 금지** — `APPROVE`/`OVERRIDE`/`CERTIFY`는 명시 예외·별도 승인 없이는 Deny(fail-closed).
- Human Actor Bundle을 그대로 부여하지 않음 — 리소스/동작을 명시 열거해 최소권한.
- `rotation_policy`·`expiration` 필수(무기한·무회전 금지). owner 미지정 = 부여 불가.
- Golden Rule: api_key(scopes_json·role)를 Service Account substrate로 확장(중복 자격 store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: actor-type 분리·client/network/cert 결속·rotation/owner·approval 금지 강제 = 순신규.
- **BLOCKED_PREREQUISITE**: certificate/network 결속·rotation 집행은 선행 Actor Identity(03-03) Binding + Decision Core 부재로 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
