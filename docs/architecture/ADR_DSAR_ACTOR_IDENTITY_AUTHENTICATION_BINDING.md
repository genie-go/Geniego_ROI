# ADR — Actor Identity Assurance & Authentication Binding Governance (EPIC 06-A-03-02-03-03)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 승인 결합부 구현은 선행 Decision Core 신설 후 별도 승인세션 / ★단 BLOCKED_SECURITY 5건은 자립 수정 가능)
- **차수**: 289차 후속 회차 (2026-07-19)
- **스펙**: [`SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM`](../segmentation/SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md)
- **전수조사(ⓑ·GROUND_TRUTH)**: [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_IDENTITY_DUPLICATE_IMPLEMENTATION_AUDIT`](../segmentation/DSAR_APPROVAL_IDENTITY_DUPLICATE_IMPLEMENTATION_AUDIT.md)
- **선행 블록**: [`ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION`](ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION.md)(03-02-03-02) · [`ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER`](ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER.md)(03-02-03-01)
- **관련 메모리**: [[reference_platform_growth_actas_tenant_hijack]] · [[project_n237_session_auth_gaps]] · [[project_n_member_session_impersonation]] · [[reference_headless_admin_repro_trap]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-03은 Approval Decision을 수행한 Actor가 실제 누구인지·어떤 인증수단/세션으로 제출했는지·그 인증상태가 Commit 시점까지 유효했는지를 Canonical Identity + Immutable Evidence로 고정하는 것을 요구한다(Decision Integrity & Security 10 세부 EPIC 중 3번째·Authorization/SoD/Dual-Control 상세는 후속). §3은 Canonical Identity·Authentication·Decision·Assignment/Authority/Delegation Foundation을 전제한다.

★**이 블록은 순수-설계였던 선행 블록(03-02-03-01/02)과 결정적으로 다르다** — 리포에 **실 인증/신원 코드가 대량 실재**한다. 능력 기반 전수조사(ⓑ·2 에이전트·코드 정독):

- **★Canonical actor 정본 실재 = `Mapping::actorId`**(`Mapping.php:36-53`) — 서버 인증 context에서만 도출(api_key→`apikey:{id}`·세션→`user:{email}`·미확인 null)·클라이언트 입력 미신뢰·승인 fail-closed(자기승인 차단 `:268`·정족수 2 `:287`). **Actor Identity Assurance의 확장 기준점.**
- **★인증 스택 대량 실재(확장 substrate)** — 서버측 영속 세션(`user_session` opaque·30일·revocation·유휴폐기 `UserAuth.php:229-318,964-970`)·api_key+RBAC scopes(`index.php:554-600`·`Db.php:942-955`)·MFA(TOTP/SMS/email/복구코드·정책 off/admin/all `:3459-3660`)·SSO OIDC/SAML/SCIM(프로덕션급·state/nonce/assertion-replay 방어 `EnterpriseAuth.php:194-619`)·SecurityAudit 불변체인(actor preimage `SecurityAudit.php:27`).
- **★진짜 부재(순신규)** — Device/mTLS/Cert·session↔Decision Command 결합·commit-time 재검증·Original Principal↔Effective Actor 이중보존·불변 Identity/Authentication Snapshot·Person↔Account 분리·Employment/Position·JTI/refresh 이중토큰·승인경로 replay 탐지.

## 2. 결정 (Decision)

### D-1. Canonical Identity Assurance Contract를 **신설**하되 실존 primitive를 확장(Golden Rule) — "발명이 아니라 조립"

| 실존 | §66 태그 | 확장 결정 |
|---|---|---|
| **`Mapping::actorId` canonical actor** | **CANONICAL_SUBJECT_BINDING 기준점(확장)** | 위조불가 서버 context 정본(`Mapping.php:36-53`). Actor Resolution·Canonical Subject Binding의 참조 구현. email→Canonical Subject id 승격. |
| 서버측 영속 세션 `user_session` | **CANONICAL_AUTHENTICATION_SESSION(확장·KEEP)** | opaque stateful·revocation·유휴폐기 실재. Authentication Session이 이를 확장(중복 store 금지). ★token 평문 저장 교정. |
| api_key + RBAC scopes | **VALIDATED(확장)** | `index.php:554-600` role rank·scopes·tenant 강제. Client Binding·Principal(SERVICE) substrate. |
| MFA 스택(TOTP/SMS/email/복구·정책) | **VALIDATED(확장)** | Step-up·MFA Binding의 확장 substrate. ★승인 decision 미결합·mfa_secret 평문 교정. |
| SSO OIDC/SAML/SCIM + one-time nonce | **VALIDATED_IDP_SOURCE** | 엔터프라이즈 인증 완성형. Reconciliation·Nonce 패턴 재사용. |
| SecurityAudit 불변체인 | **CANONICAL(앞 블록 확장)** | Identity/Authentication Evidence·Digest의 저장 substrate. |

### D-2. **장식/오인 금지**

- `Decisioning.php`(`:12,36`) = 클래스명만 decision·실제 ad-insights ingest(Decision 도메인 아님).
- 승인 감사가 **비체인 `audit_log`**(`Mapping.php:60`·`Alerting.php:28`)에 문자열 actor만 기록 — SecurityAudit 해시체인과 분리(무결성 트레일 밖).

### D-3. **BLOCKED_SECURITY — 라이브 실결함 (선행과 무관·자립 수정 가능·별도 배포승인)**

1. **`Alerting::actor()`(`Alerting.php:33-36`) X-User-Email/`?actor=` 승인자 위조** — `decideAction`(`:572-599`)이 위조 actor를 `action_request`+audit에 기록·정족수 없이 단일 approved. policy ops(`:82,127,171,189,603`)도 동일. §5.11·§61 정면 위반. **수정=canonical actor(`Mapping::actorId` 패턴) 강제.**
2. **`Alerting::executeAction`(`:601-665`) 미승인·미재검증 집행** — status 확인·재인증·approver≠executor 없이 AdAdapters dispatch. §30·§55 부재.
3. **`user_session.token` 평문 저장**(`UserAuth.php:969`) — DB 유출 시 세션 탈취.
4. **`mfa_secret`(TOTP) 평문 base32 저장**(`UserAuth.php:3421,3771`) — DB 유출 시 전 사용자 TOTP 재현. §5.7 위반.
5. **break-glass 마스터 로그인 MFA 우회**(`UserAuth.php:777-798,925`) — 예외경로 감사 필요.
6. **Member impersonation Original Principal 미보존**(`UserAdmin.php:472-534`) — 대행 승인이 본인 승인과 구별 불가.

### D-4. **승인 결합부 구현 BLOCKED_PREREQUISITE** — 선행 Decision Core 신설 후 별도 승인세션(RP-002)

| 선행군 | 상태 |
|---|---|
| §3.1 Canonical Identity Foundation | **PARTIAL(app_user·team_role 실재·Person/Subject/Employment/Position 부재)** |
| §3.2 Authentication Foundation | **PRESENT(session·api_key·MFA·SSO·SCIM 실재·Device/mTLS 부재)** |
| §3.3 Decision Foundation · §3.4 Assignment/Authority/Delegation | **ABSENT(설계전용·코드 0)** |

→ Identity Assurance가 **결합할 불변 Decision Record/Snapshot/Ledger Entry 대상이 없어** 승인 결합부는 공회전(현행 승인=`mapping_change_request`+`action_request` 2테이블·문자열 actor). §74 per-entity는 **substrate 있는 인증/신원 계층=PARTIAL/VALIDATED, 승인 결합/불변 snapshot/device/신규 governance=ABSENT/BLOCKED_PREREQUISITE**가 정직판정. 실 엔진=Decision Core 신설 → 기존 세션/actor/MFA/SecurityAudit 위 Identity Assurance 조립. 이번 차수=설계 명세(코드 0).

### D-5. Principal ≠ Actor · Account ≠ Person · 인증 ≠ 승인권한 (§5.1-5.3·구현 시 강제)

Original Principal + Effective Actor 이중보존·Email 비-PK·Canonical Subject Binding·인증성공만으로 Approval Authority 부여 금지.

### D-6. Mandatory Identity Control 고객설정 비활성 불가(§5.12)

Canonical Subject Resolution·Original Principal/Effective Actor Preservation·Tenant/Session Binding·Commit-time Revalidation·Disabled/Terminated Blocking·Raw Credential Storage Prohibition·Impersonation Disclosure·Identity Snapshot·Authentication Evidence·Identity Audit.

## 3. ★실 위험 (별도 수정세션 후보)

D-3의 6건(Alerting actor 위조·executeAction 미승인 집행·session token 평문·mfa_secret 평문·break-glass MFA 우회·impersonation Original Principal 미보존). ★이 중 1·2는 승인 무결성 직접 위협으로 최우선.

## 4. 대안 (Considered)

- **A. 지금 Identity Assurance 전면 구현** — 기각. 결합할 불변 Decision Record 부재(D-4)·RP-002 위반.
- **B. `Mapping::actorId`를 전 승인경로에 강제 + BLOCKED_SECURITY 5건 즉시 수정** — **부분 채택**. Identity 정본 확장은 설계로 확정, BLOCKED_SECURITY는 자립 수정 가능하므로 별도 배포승인 세션 후보로 등재(설계와 분리).
- **C. 설계 명세만(코드 0)+실존 substrate 조립계획+BLOCKED_SECURITY 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관.

## 5. 귀결 (Consequences)

- (+) `Mapping::actorId`·user_session·api_key RBAC·MFA·SSO/SCIM·SecurityAudit의 확장 substrate 지위·조립 경로 확정("발명 아닌 조립").
- (+) BLOCKED_SECURITY 6건(특히 Alerting actor 위조·executeAction 미승인 집행)을 라이브 실결함으로 문서화·별도 수정세션 후보 등재.
- (+) 인증/신원 계층의 정직한 PARTIAL/VALIDATED 판정(부재만 과장하지 않음)·장식(Decisioning·비체인 audit_log) 오인 방지.
- (+) Actor Type/Principal/Subject Binding/Assurance Level/Resolution/Binding/Snapshot/Evidence/Drift/Detection 67편 설계 정본 확보.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: BLOCKED_SECURITY 5건 자립 수정(배포승인) + 선행 Decision Core 신설 → Identity Assurance 실 엔진 → **EPIC 06-A-03-02-03-04 Authorization·SoD·Conflict-of-Interest·Dual-Control Governance**(스펙 대기).

## 6. 규율 준수

Golden Rule(Extend not Replace·중복 Principal/Session/Device Registry 금지) · 무후퇴(평문 저장 교정·Alerting actor 교체=개선 예외) · "결론의 근거도 재실증"(canonical actor 정본·인증 substrate·BLOCKED_SECURITY 전부 코드 정독으로 확정) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002 · 장식 오인 금지 · GROUND_TRUTH 외 인용 금지.
