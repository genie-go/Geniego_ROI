# DSAR — Actor Identity Profile (06-A-03-02-03-03 · §15)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §15.
> **★team_role(owner/manager/member)은 실재하나 employment/position은 부재.**

## 1. 원문 전사 (Canonical Contract)

§15 ACTOR_IDENTITY_PROFILE 필수 필드 (원문 전사):
- `canonical subject` · `actor type`
- `identity proofing level`
- `employment status`
- `tenant membership` · `legal entity membership` · `organization membership`
- `active role assignments` · `active position incumbencies`
- `eligible auth methods` · `default assurance requirement`
- `high-risk action eligibility`
- `service actor` 여부 · `system actor` 여부 · `external actor` 여부
- `profile version`

의미: Actor Identity Profile은 canonical subject(§14) 1인의 **actor type·고용상태·테넌트/법인/조직 소속·활성 역할/직위·자격 auth method·기본 assurance·고위험 action 자격**을 통합한 신원 프로필이다. Actor Resolution(§16~§18)의 조회 대상이자, 어떤 actor가 어떤 결정을 낼 자격이 있는지의 근거다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **통합 identity profile은 부재** — canonical subject 1인의 actor type·employment·membership·role·position·assurance를 한 프로필로 통합하는 구조체 전무.
- 실존하는 **부분 재료 substrate**:
  - **team_role(active role assignments 재료)** — `TeamPermissions.php:120-136`(owner>manager>member·fail-closed member). 원문 **`active role assignments`**의 재료이나 이력·버전 없는 현재값·직위(position) 아님.
  - **RBAC rank(role 재료)** — `index.php:554`(viewer0/connector1/analyst2/admin3)·api_key role `Db.php:942-955`. role 서열이나 profile 통합 아님.
  - **tenant membership 재료** — `index.php:417,437`(auth_tenant 주입). 테넌트 귀속은 있으나 membership 상태(active/removed)·legal entity·organization 축 없음.
  - **eligible auth methods 재료** — MFA 정책 `UserAuth.php:3638-3660`·TOTP `:3459-3484`·SMS/email OTP `:3970-3976`/`:3924-3934`. 사용가능 method는 실재하나 profile별 자격목록 아님.
  - **actor type 재료** — `Mapping.php:41,47,49`(apikey:/user: 접두). §8 참조.
- **Employment/Position = ABSENT** — team_role만 존재(고용/직위 개념 없음). `employment status`·`active position incumbencies`·`legal entity membership`·`organization membership`·`identity proofing level`·`default assurance requirement`·`high-risk action eligibility`·`profile version` → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **PARTIAL (PRESENT-substrate)** — role(team_role/RBAC)·tenant 귀속·auth method 재료는 **실재**하나, employment/position/legal entity/organization membership·proofing level·profile version은 **ABSENT**.
- 선행 의존: Profile은 §14 Canonical Subject Binding(PARTIAL·email→subject 승격 필요) 하위 + Person↔Account 분리(ABSENT)·Employment Record(ABSENT) 선행. `high-risk action eligibility`는 §3.3 Decision Foundation·§12 Assurance Level Model 선행 → 그 결합부 **BLOCKED_PREREQUISITE**.
- cover: **부분** — `active role assignments`(team_role)·`tenant membership`·`eligible auth methods`가 재료로 실재(위 §2), 나머지(employment/position/legal entity/organization/proofing/assurance/version)는 전무.

## 4. 확장/구현 방향 (설계)

- 순신규 `actor_identity_profile` — canonical subject별 actor type(§8)·employment·membership·role·position·assurance·high-risk 자격 통합.
- **Golden Rule=Extend**: `team_role`(`TeamPermissions.php:120-136`)의 owner/manager/member를 **`active role assignments`의 CANONICAL 소스로 재사용** — 신규 역할 저장소 신설 금지. `eligible auth methods`는 실재 MFA 스택(`UserAuth.php:3459-3484,3638-3660`)을 참조. actor type은 §8 레지스트리 참조.
- **Mandatory Control(§5.2·§5.3)**: profile은 Account가 아닌 **Person/canonical subject 단위**. `employment status`(terminated 시 §50 Identity Drift로 Commit 차단)·`active position incumbencies`(직위 만료)를 신설 축으로 추가 — 현재 team_role은 role만이고 employment/position 부재.
- **실위험**: employment/position 부재로 **퇴직자·직위 만료자의 승인을 차단할 데이터 근거 없음**(§61 "Disabled/Terminated Decision 허용"). Profile의 `employment status`+`active position incumbencies`가 §55 Commit-time Revalidation의 입력을 제공. `high-risk action eligibility`는 §12 Level Model·§10 Definition과 결합해야 완성(선행 필요).

관련: [[DSAR_APPROVAL_CANONICAL_SUBJECT_BINDING]] · [[DSAR_APPROVAL_IDENTITY_ASSURANCE_LEVEL]] · [[DSAR_APPROVAL_ACTOR_TYPE_REGISTRY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
