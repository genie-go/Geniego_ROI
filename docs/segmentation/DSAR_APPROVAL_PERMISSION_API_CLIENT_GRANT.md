# DSAR — Permission API Client Grant (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

**API Client**(OAuth/토큰 기반 프로그래매틱 클라이언트)에 부여되는 Grant의 Canonical 명세. API Client는 그 자체로 전권을 갖지 않으며 — **User∧Client Conjunctive Model**: 실효 권한 = 사용자(actor) 권한 ∩ Client 권한의 교집합(둘 다 허용해야 허용). client id·등록 버전·audience·허용 grant type·token scope 매핑·리소스/동작/채널·인증서·유효기간을 결속한다. 실 substrate = `api_key`(scopes_json·role)를 정형화. Permission ≠ Role ≠ Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `api_client_grant_id` | API Client Grant 식별자 |
| `client_id` | API Client 식별자 |
| `registration_version` | Client 등록 버전(In-place 변경 금지) |
| `tenant_ref` | 귀속 테넌트(Cross-tenant 금지) |
| `audience` | 토큰 대상(aud·수용 리소스 서버) |
| `allowed_grant_type` | 허용 OAuth grant type(§3) |
| `token_scope_mapping` | 토큰 scope → Canonical Permission Code 매핑 |
| `resource_type` | 접근 허용 리소스 유형 |
| `action` | 허용 canonical action |
| `channel` | 허용 채널/엔드포인트 경계 |
| `certificate_ref` | 클라이언트 인증서/키 참조 |
| `validity` | 유효기간([`DSAR_APPROVAL_PERMISSION_EXPIRATION`](DSAR_APPROVAL_PERMISSION_EXPIRATION.md)) |
| `conjunctive_with_user` | Boolean(항상 true·User∧Client 교집합 강제) |
| `digest` | Grant 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**allowed_grant_type**: `CLIENT_CREDENTIALS` · `AUTHORIZATION_CODE` · `REFRESH_TOKEN` · `DEVICE_CODE`(수용 집합·나머지 Deny).
**lifecycle status**: `REGISTERED` · `ACTIVE` · `CERT_ROTATION_DUE` · `SUSPENDED` · `EXPIRED` · `REVOKED`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Client 자격/scope | `api_key`(`scopes_json`·role) | CANONICAL(PEP·프로그래매틱) | `index.php:577`·`Keys.php:191,204`·`UserAuth.php:4307` |
| token scope vocabulary | `read:*`·`write:*`·`write:ingest`·`write:attribution`·`write:mta`·`admin:keys` | 정형화(§6.8 제한 wildcard) | `Keys.php:191,204` |
| 실행 게이트(PEP) | index.php RBAC(roleRank/scope/write) | CANONICAL(확장) | `index.php:553-603`·`:573-577` |
| tenant 강제주입 | X-Tenant 주입 | CANONICAL | `index.php:619` |

★**정직/ABSENT**: `client_id`(별도 client 등록 엔티티)·`registration_version`·`audience`·`allowed_grant_type`·`token_scope_mapping`(scope→Canonical Code)·`channel`·`certificate_ref`·`validity`·`conjunctive_with_user` 강제·`digest` = **전부 순신규 ABSENT**. 현 api_key는 단일 role+scopes CSV만·client 등록/audience/grant type/User∧Client 교집합 축 부재. wildcard(write:*/read:*)는 §6.8 부합(api_key 프로그래매틱 한정)이나 Canonical Code 매핑은 없음.

## 5. 설계 원칙 / 결정

- **User∧Client Conjunctive Model**(`conjunctive_with_user=true`) — 실효 권한 = actor 권한 ∩ Client 권한. Client가 넓어도 사용자 권한을 넘지 못함(Scope Expansion Guard).
- wildcard token scope는 §6.8대로 api_key 프로그래매틱에 한정·일반 사용자 UI 부여 금지 유지.
- `registration_version` 불변 — 변경은 새 버전(In-place Update 금지).
- Cross-tenant 금지·`audience` 불일치 토큰 Deny(fail-closed).
- Golden Rule: api_key(scopes_json·role)를 API Client substrate로 확장(중복 자격 store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: client 등록/버전·audience·grant type·scope→Code 매핑·User∧Client 교집합·cert = 순신규.
- **BLOCKED_PREREQUISITE**: token_scope_mapping의 Canonical Code 결속은 선행 Namespace/Registry + Decision Core 부재로 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
