# DSAR — Permission Channel & Client Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission의 **접속 채널(Channel)** 과 **클라이언트 신원(Client Scope)** 을 정형화한다. 동일 Permission이라도 어떤 Channel(WEB/MOBILE/API/ERP/WORKFLOW_ENGINE/EMAIL_REFERENCE/BATCH/SYSTEM 등)로, 어떤 등록된 Client(client id/type/application id·version/tenant/allowed channels·resource types·actions/certificate/token audience)로 요청됐는지에 따라 허용을 제한한다. **★Conjunctive Model**: 최종 허용 = User Permission ∧ Client Scope — 사용자가 권한을 가져도 그 요청 Client가 해당 Channel/Resource/Action을 허용받지 못하면 거부(둘 다 충족해야 함).

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `channel` | 접속 채널 유형(§3 열거) |
| `client_id` | 등록 Client 식별자 |
| `client_type` | Client 분류(USER_AGENT/SERVICE/ERP/…) |
| `application_id` / `application_version` | 애플리케이션 식별·버전 |
| `tenant_id` | Client 귀속 테넌트(격리) |
| `allowed_channels` | 이 Client가 허용된 Channel 집합 |
| `allowed_resource_types` | 허용 Resource type 집합 |
| `allowed_actions` | 허용 Canonical Action 집합 |
| `certificate_ref` | 상호 TLS/서명 인증서 참조 |
| `token_audience` | 허용 token audience |
| `conjunction_rule` | User∧Client 결합 규칙(항상 AND·완화 불가) |

## 3. 열거형 / 타입

- **channel**: `WEB` · `MOBILE` · `API` · `ERP` · `WORKFLOW_ENGINE` · `EMAIL_REFERENCE` · `BATCH` · `SYSTEM` · `CUSTOM`.
- **client_type**: `USER_AGENT` · `SERVICE_ACCOUNT` · `ERP_CONNECTOR` · `WORKFLOW_ENGINE` · `PROGRAMMATIC_API_KEY` · `SYSTEM_INTERNAL` · `CUSTOM`.
- **conjunction_rule**: `USER_AND_CLIENT`(고정·AND) — OR/우회 불가(Mandatory Control).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 프로그래매틱 Client 신원(부분) | `api_key`(scopes_json·role) | 부분 substrate(client=api_key) | `index.php:577`·`Keys.php:191,204` |
| Client role scale | roleRank(viewer/connector/analyst/admin) | 부분(client 등급) | `index.php:573-576` |
| tenant 격리(모든 요청) | X-Tenant-Id 강제주입 | CANONICAL(격리) | `index.php:619` |
| SSO/외부 IdP client(참조) | `EnterpriseAuth`(SAML/SCIM) | VALIDATED_IAM(프로비저닝·authz 아님) | EXISTING §1.6 |
| Channel 유형·allowed_channels·application_id/version·certificate·token_audience·Conjunctive User∧Client | — | **ABSENT(순신규)** | — |

★현행은 사용자 인증 후 `api_key`(프로그래매틱)와 role/scope만 판정하며, **요청 Channel 분류·등록 Client Scope(allowed channels/resource/action)·User∧Client Conjunctive 결합**은 부재. WEB/MOBILE/API 구분·application version pinning·mutual TLS audience 제약은 순신규.

## 5. 설계 원칙 / 결정

- **Conjunctive**: 유효 허용 = `user_permission ∧ client_scope`. 사용자 권한이 넓어도 Client Scope가 좁으면 좁은 쪽으로 축소(Scope Intersection·확장 금지).
- Channel은 Permission Constraint의 한 차원(§CONSTRAINT `CHANNEL`/`CLIENT` type과 정합)이며 별도 우회 경로가 아님.
- api_key는 `PROGRAMMATIC_API_KEY` client_type의 **아웃바운드/프로그래매틱 자격**으로 취급 — 일반 사용자 UI 권한 부여와 혼용 금지(ADR §6.8).
- tenant 격리는 Client Scope에서도 절대(Cross-tenant Client 금지·Mandatory Control).
- Golden Rule: index.php RBAC·api_key 신원·tenant 주입을 Client Scope substrate로 확장, 중복 client 레지스트리 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `channel`(9종)·`client_id/type`·`application_version`·`certificate_ref`·`token_audience`·Conjunctive 결합 = 순신규 ABSENT.
- 현행은 api_key/role 단일 축 — Channel·Client 이중 축 미착수(설계만).
- **BLOCKED_PREREQUISITE**: Client Registry + Part 1 Decision Core 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
