# DSAR — Permission API Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 통제하는 **API 표면**을 URL 문자열이 아니라 **Canonical Operation ID**로 정형화한다. 서비스·버전·엔드포인트·HTTP 메서드·operation id·resource type·canonical action·client type·audience·token scope 매핑·요청/응답 필드 제약·rate limit을 하나의 API Scope 엔티티로 선언한다. 목표는 **API Gateway 계층의 노출 표면과 App Permission(Definition/Resolution)을 대사(Reconciliation)** 하여, 게이트웨이에서 열려 있으나 App Permission이 부재한 표면(또는 그 역)을 드리프트로 검출하는 것. Permission은 내부 authz 판정이며, api_key scopes·connector OAuth scope는 **아웃바운드 자격(내부 authz 아님)** 이므로 혼입하지 않는다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `operation_id` | Canonical Operation 식별자(전역 유일·URL 문자열 아님) |
| `service` | 논리 서비스명 |
| `api_version` | 버전 접두(`/v{NNN}`·`/api` 별칭 포함) |
| `endpoint_pattern` | 경로 패턴(문서화용·식별자 아님) |
| `http_method` | GET/POST/PUT/PATCH/DELETE |
| `resource_type` | 대상 Canonical Resource |
| `canonical_action` | 매핑되는 Canonical Action(§DSAR_APPROVAL_PERMISSION_NAMESPACE) |
| `client_type` | 허용 client 유형(WEB/MOBILE/API/SYSTEM 등·§CHANNEL_CLIENT_SCOPE) |
| `audience` | token audience 제약 |
| `required_token_scope` | 게이트에서 요구하는 scope 매핑(참조·아웃바운드 아님) |
| `request_field_constraints` | 요청 필드 허용/필수 제약 |
| `response_field_constraints` | 응답 필드 노출 제약(민감필드 마스킹) |
| `rate_limit_ref` | rate limit 정책 참조 |
| `gateway_mirror_status` | Gateway↔App Permission 대사 상태 |

## 3. 열거형 / 타입

- **http_method**: `GET` · `POST` · `PUT` · `PATCH` · `DELETE`.
- **client_type**: `WEB` · `MOBILE` · `API` · `ERP` · `WORKFLOW_ENGINE` · `BATCH` · `SYSTEM` · `CUSTOM`.
- **gateway_mirror_status**: `MIRRORED`(게이트웨이·App 일치) · `GATEWAY_ONLY`(노출됐으나 App Permission 부재·드리프트) · `APP_ONLY` · `UNRECONCILED`.
- **scope_direction**: `INTERNAL_AUTHZ`(Permission) · `OUTBOUND_CREDENTIAL`(api_key/connector·내부 authz 아님).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| API PEP(HTTP 메서드×scope×rank write 게이트) | index.php 중앙 RBAC | CANONICAL(PEP·확장) | `index.php:553-603`·write 게이트 `:590-596` |
| roleRank scale | viewer/connector/analyst/admin | CANONICAL | `index.php:573-576` |
| token scope lookup | `api_key.scopes_json` | 참조(내부 authz 게이트 입력) | `index.php:577` |
| keys 관리 표면 게이트 | `/v421/keys`=admin:keys∨rank≥3 | CANONICAL | `index.php:583-586` |
| tenant 강제주입(Cross-tenant 격리) | X-Tenant-Id inject | CANONICAL | `index.php:619` |
| AI-gate 별칭 미러 | `/v422/ai/*` 별칭 미러 | CANONICAL | `index.php:430-437` |
| api_key scopes(read:*/write:*/write:ingest/admin:keys) | 프로그래매틱 자격 | **OUTBOUND/제한범위(§6.8)·내부 operation authz 아님** | `Keys.php:191,204`·`UserAuth.php:4307` |
| connector OAuth scope | 광고플랫폼 아웃바운드 | **OUTBOUND(내부 authz 아님)** | EXISTING §1.6 `connector_token.scopes` |
| Canonical Operation ID·resource_type·request/response field 제약·rate_limit·gateway reconciliation | — | **ABSENT(순신규)** | — |

★현재 게이트는 **HTTP 메서드 계열(write/ingest)+scope+rank** 의 coarse 판정이며, `operation_id`·`resource_type`·필드 수준 제약·rate limit·Gateway↔App 대사는 부재.

## 5. 설계 원칙 / 결정

- API Scope 식별자는 **Canonical Operation ID**(URL 문자열·버전 접두는 metadata). 버전 변경·경로 재작성이 Permission 식별자를 흔들지 않게 분리.
- `required_token_scope`는 게이트 입력 참조일 뿐, api_key/connector scope를 **내부 Permission Definition으로 승격 금지**(아웃바운드 자격 ≠ 내부 authz·Golden Rule).
- Gateway↔App Permission Reconciliation는 드리프트 검출 전용(§DSAR_APPROVAL_PERMISSION 후속 Drift Part 연계)·자동 grant 금지.
- 응답 필드 제약은 민감필드 노출을 Permission으로 통제(EXPORT는 VIEW_SENSITIVE 불포함 원칙·§IMPLICATION 참조).
- Golden Rule: index.php 중앙 RBAC(PEP)를 확장·재사용, 중복 API 게이트 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `operation_id`·`resource_type`·`canonical_action` 매핑·필드 제약·rate limit·`gateway_mirror_status` = 순신규 ABSENT.
- 현행 게이트는 method-class coarse 판정 — operation·field 정밀도 미착수(설계만).
- **BLOCKED_PREREQUISITE**: 실 대사 엔진은 Canonical Action/Resource Registry + Part 1 Decision Core 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
