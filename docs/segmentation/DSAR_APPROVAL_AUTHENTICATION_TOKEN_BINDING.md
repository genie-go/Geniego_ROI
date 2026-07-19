# DSAR — Approval Authentication Token Binding (06-A-03-02-03-03 · §23)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist)에 등재된 file:line 만 사용.

## 1. 원문 전사 (Canonical Contract)

**§23 Token Binding** — 승인에 사용된 토큰을 Decision·Session·Principal 에 결합하는 최소 필드:
`token family` · `token id/JTI Digest` · `session` · `principal` · `canonical subject` · `client` · `tenant` · `device` · `issued/expires` · `nonce` · `scope digest` · `generation` · `revocation`.

★ **Access Token 전체 저장 금지** (§5.7·§62). 저장 대상은 **JTI Digest·Family·Scope Digest·Verification Result** 뿐. Refresh Token·Access Token 원문·Session Cookie 평문 저장 금지.

## 2. 기존 구현 대조

- **세션 토큰은 실재하나 모델이 §23 과 어긋난다.** 세션 발급(`UserAuth.php:964-970`)은 `bin2hex(random_bytes(32))` 64-hex **opaque stateful** 토큰을 `user_session` 에 저장하고, 검증(`UserAuth.php:229-318`)은 매 요청 `WHERE token=? AND expires_at>now AND is_active=1` DB 조회로 수행한다. JWT 아님 → **JTI·token family·scope digest·generation 개념 자체가 부재**(GROUND_TRUTH "세션 모델" 행: JTI/refresh 부재).
- **★평문 저장(BLOCKED_SECURITY):** 세션 토큰이 해시 없이 원문으로 저장된다(`UserAuth.php:969` 발급 → `:229-318` `WHERE token=?` 조회). §23 이 요구하는 "JTI **Digest**" 와 정면 배치 — DB 유출 시 세션 즉시 탈취.
- **api_key 는 부분적으로 §23 에 근접.** 발급(`UserAuth.php:4240-4246`·`Db.php:942-955`)은 `genie_key_`+random_bytes(16) 원문을 **1회만** 반환하고 `hash('sha256')` 만 저장하며 `scopes_json`·`role`·`expires_at`·`idx_api_key_tenant` 를 보유한다. 인증(`index.php:483-493`)은 sha256 조회. 즉 **Digest 저장·tenant/scope/expiry 결합·revocation(is_active)** 은 api_key 축에서 실재한다 — 그러나 이는 승인 커맨드가 아니라 API 인증용이고, JTI/family/generation·decision 결합은 없다.
- **Revocation 은 세션 삭제로만 존재**(logout `UserAuth.php:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`·DELETE `:1381,1617,1631`) — 토큰 family 단위 폐기·decision 시점 revocation 대조는 없다.
- **승인 결합 전무**: `mapping_change_request`(`Db.php:623-634`)·`action_request` 어디에도 토큰 id/family/scope digest 를 승인 레코드에 결합하는 컬럼이 없다. 승인 판정(`Mapping.php:186-190`·`Alerting.php:572-599`)은 토큰을 참조하지 않는다.

## 3. 판정

- **Verdict: PARTIAL(substrate) + BLOCKED_SECURITY(평문) + BLOCKED_PREREQUISITE(승인 결합)**.
  - substrate: api_key 축의 sha256 digest·tenant·scope(`scopes_json`)·expiry·revocation(is_active) 은 **PARTIAL-PRESENT**(`Db.php:942-955`·`index.php:483-493`).
  - **BLOCKED_SECURITY**: `user_session.token` 평문 저장(`UserAuth.php:969`) — §5.7·§23 "JTI Digest" 위반.
  - **ABSENT**: JTI/token family/scope digest/generation·nonce 결합·decision command↔token binding.
- **선행 의존**: §3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation ABSENT — 토큰을 결합할 불변 Decision Record/Snapshot 대상 부재.
- **cover: 부분** — api_key digest/scope/tenant/expiry/revocation 만 커버(승인 밖). 세션 토큰 digest·JTI·family·decision 결합 0.

## 4. 확장/구현 방향 (설계)

- **세션 토큰 평문 → Digest 저장 전환은 Mandatory Control(자립 수정 가능)**: `user_session` 조회를 토큰 sha256 digest 기준으로 바꿔 §23 "JTI Digest" 를 세션에도 적용(api_key 의 sha256 패턴을 CANONICAL 로 재사용·Golden Rule=Extend). 평문 컬럼 폐기.
- **JTI/token family/generation 도입**: opaque 세션에 `token_family`·`generation`·`jti_digest` 를 부여해 재발급 시 family 승계·이전 generation 무효화. Refresh 도입 시에도 **Access Token 원문은 절대 저장 않음** — digest·scope digest 만.
- **승인 결합부는 BLOCKED_PREREQUISITE**: Decision Core(§3.3) 신설 후, 승인 커맨드 레코드에 `token family`·`jti digest`·`scope digest`·`session generation`·`nonce ref` 를 결합하고 Commit 직전(§30) 토큰 미폐기·family 미오염을 재검증. 선행 없이 조용히 건너뛰지 말 것.
- **Scope Digest 는 승인 대상(resource/action/decision slot/amount)과 묶어** 타 커맨드 토큰 재사용을 차단(§29 Scope Binding 과 연동). api_key `scopes_json` 은 API RBAC 용이므로 decision-scope digest 는 별도 축으로 신설(중복 금지·KEEP_SEPARATE).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_NONCE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_SCOPE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
