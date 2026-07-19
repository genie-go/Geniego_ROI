# DSAR — Approval Authentication Tenant · Legal Entity · Organization Binding (06-A-03-02-03-03 · §28)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§28 Tenant · Legal Entity · Organization Binding** — 다음의 일치 검증:
`Request/Decision Tenant` · `Actor Tenant Membership` · `Client/Session Tenant` · `Legal Entity Membership` · `Approval Case Legal Entity` · `Org Membership` · `Assignment/Authority/Delegation Organization`.

★ **Cross-Tenant Auth Context 재사용 차단**(§5·§62 "Tenant 없는 Session" 금지·§49 TENANT_MISMATCH).

## 2. 기존 구현 대조

- **★Tenant Binding 은 인증 스택에서 실재(PARTIAL-PRESENT).**
  - **Session/Client Tenant 강제**: `index.php:590-600` 이 인증 후 `X-Tenant-Id` 를 api_key 행의 tenant 로 **덮어쓰기(강제)** 하고, `index.php:417,437` 이 auth_tenant 를 위조불가하게 주입한다. 클라이언트가 임의 tenant 헤더를 보내도 인증 주체의 tenant 로 고정 → **Cross-Tenant 재사용의 1차 차단이 실동작**.
  - **api_key tenant 결합**: `Db.php:942-955`(`idx_api_key_tenant`) — 키가 tenant 에 스코프됨.
  - **X-Act-As-Tenant(제한적 impersonation)**: `UserAuth.php:398` — admin + `'platform_growth'` **단일값만** 허용, effective tenant 만 치환하고 actor 는 admin 유지. 즉 임의 cross-tenant 치환이 아니라 특정 플랫폼 tenant 로만 제한(GROUND_TRUTH "제한"). 단 **Original/Effective tenant 를 반환값에 보존하지 않는다**(§5.1·§28 Original 보존 요구와 갭).
- **★부재/갭 축**:
  - `Legal Entity Membership`·`Approval Case Legal Entity`·`Org Membership`·`Assignment/Authority/Delegation Organization` = **부재**. Employment/Position(GROUND_TRUTH ABSENT)·Assignment/Authority/Delegation(ABSENT)에 종속 → 법인/조직 단위 일치 검증 없음.
  - `Actor Tenant Membership` 은 api_key/세션의 단일 tenant 로만 표현되고, 사용자가 다수 tenant 에 속하는 멤버십 모델·membership 상태(active/removed)는 없다.
  - 승인 레코드(`mapping_change_request` `Db.php:623-634`)의 tenant 와 인증 tenant 일치 검증을 Commit 시 재확인하는 로직은 없음(§30·§55).
- **관련 실위험(참조)**: `X-Act-As-Tenant` 는 과거 platform_growth act-as 전역 tenant 하이재킹 사고 이력(자동 ON→localStorage 고착)이 있어 tenant 해석 시점 검증이 민감하다.

## 3. 판정

- **Verdict: PARTIAL-PRESENT(Tenant 축 실재 · Legal Entity/Org 부재)**.
  - PRESENT: Session/Client Tenant 강제(`index.php:590-600`·`:417,437`)·api_key tenant 스코프(`Db.php:942-955`)·X-Act-As-Tenant 단일값 제한(`UserAuth.php:398`) → Cross-Tenant 세션 재사용 1차 차단 실동작.
  - ABSENT/갭: Legal Entity·Organization Membership·Approval Case Legal Entity 일치·Original/Effective tenant 보존·Commit 시 tenant 재검증.
- **선행 의존**: Legal Entity/Org 축은 Employment/Position·Assignment/Authority/Delegation(모두 ABSENT) 부재로 BLOCKED_PREREQUISITE.
- **cover: 부분** — Tenant 일치/강제는 커버(정본 `index.php:590-600`·`:398`). Legal Entity/Org 0.

## 4. 확장/구현 방향 (설계)

- **`index.php:590-600` 의 tenant 강제·`:417,437` auth_tenant 주입을 Tenant Binding 정본으로 재사용**(Golden Rule=Extend): 승인 커맨드에 request/decision tenant 를 결합하고, Commit 직전(§30·§55) 인증 tenant == approval case tenant 를 재검증(TENANT_MISMATCH 차단). 새 tenant 해석기 발명 금지.
- **X-Act-As-Tenant Original/Effective 보존**: `UserAuth.php:398` act-as 를 §5.1 대로 Original Principal tenant + Effective tenant 를 **모두 승인 레코드에 보존**(현재 반환값 미보존 갭 봉합). platform_growth 자동 ON 하이재킹 재발 방지를 위해 요청시점 tenant 해석·명시 승인 유지.
- **Legal Entity/Organization Binding 신설**: Approval Case 에 legal entity·org 를 결속하고 actor 의 membership(active)과 일치 검증. Employment/Position·Assignment/Authority/Delegation Organization(§3.4) 신설에 의존 → 그 전까지 BLOCKED_PREREQUISITE 로 명시.
- **Tenant Membership 모델화**: 단일 tenant 컬럼을 넘어 actor↔tenant membership(상태·기간)을 두어 removed 멤버십 승인을 §50 Identity Drift 로 Commit 차단.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_CLIENT_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_SCOPE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_COMMIT_BINDING]] · [[reference_platform_growth_actas_tenant_hijack]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
