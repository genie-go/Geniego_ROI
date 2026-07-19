# DSAR — Canonical Subject Binding (06-A-03-02-03-03 · §14)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §14.
> **★`Mapping::actorId`의 `user:{email}` canonical이 실재 — 부재가 아니라 email 문자열을 Subject id로 승격해야 한다.**

## 1. 원문 전사 (Canonical Contract)

§14 CANONICAL_SUBJECT_BINDING 필수 필드 (원문 전사):
- `binding id` · `tenant` · `principal` · `canonical subject`
- `binding type` · `provider` · `binding source` · `assurance level`
- `verified_at` · `expires_at` · `previous binding` · `superseding binding` · `immutable digest`

binding type enum(원문 전사·7종): `PRIMARY` / `SECONDARY` / `FEDERATED` / `SERVICE` / `SYSTEM` / `MIGRATED` / `TEMPORARY` / `CUSTOM`.

**원문 제약**: `Email 문자열만 Binding 금지.`

의미: Canonical Subject Binding은 **Principal(§13)을 하나의 Canonical Subject에 결속**하고, 그 결속의 type·provider·assurance·유효기간·이전/승계 binding·불변 digest를 기록한다. §5.2(Email만으로 Person 식별 금지)의 실집행 지점이다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **canonical subject binding(principal↔subject 결속)은 부재** — `binding id`·`binding type`·`assurance level`·`previous/superseding binding`·`immutable digest`를 데이터로 결속하는 구조체 전무.
- 실존하는 **canonical actor 정본 substrate**(승격 대상):
  - **★`Mapping::actorId`** — `Mapping.php:36-53`: 세션→`user:{email}`·api_key→`apikey:{id}`·미확인→null. **서버측 도출·클라이언트 미신뢰**. 이는 canonical **actor 문자열**로 실재하나 정규화된 Subject id가 아닌 **email 접두 문자열**이다 — 원문 §14 제약("Email 문자열만 Binding 금지")에 **정면 저촉되는 현행 상태**.
  - **감사용 actor(약)** — `Mapping.php:56-58`(`actorId() ?? 'unknown'`). 로그전용·판정 사용 금지.
  - **user_session→app_user** — `UserAuth.php:229-264`. email이 사실상 subject key(email≠PK 승격 필요).
- **Person↔Account 분리 = ABSENT** — app_user 단일 테이블(사람/계정 미분리). canonical subject를 email 밖의 안정 식별자로 승격할 대상 테이블 없음.
- `binding type`(7종)·`provider`·`binding source`·`assurance level`·`verified/expires_at`·`previous/superseding binding`·`immutable digest` → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **PARTIAL (PRESENT-substrate·정본 저촉)** — `Mapping::actorId`의 `user:{email}` canonical actor가 **실재**하나, ①정규화 Subject id 아닌 email 문자열 ②binding type/assurance/digest 부재 ③Person↔Account 미분리로 **원문 제약(Email 문자열만 Binding 금지)에 현재 위배**.
- 선행 의존: Binding은 §13 Principal Registry(PARTIAL) 하위 + Canonical Subject(안정 식별자·Person 분리) 신설 필요. 불변 `immutable digest`는 §44 Digest·앞 단계 Hash Policy 선행. 승인 결합은 §3.3 부재로 **BLOCKED_PREREQUISITE**.
- cover: **부분** — `user:{email}`/`apikey:{id}` canonical actor 문자열이 binding의 **원시 재료로 실재**(위 §2)하나, 7종 type·assurance·digest·이전/승계 축은 전무. **PRIMARY binding의 subject가 email 문자열이라는 결함 상태로만 존재**.

## 4. 확장/구현 방향 (설계)

- 순신규 `canonical_subject_binding` — **`Mapping::actorId`(`Mapping.php:36-53`)의 `user:{email}` canonical을 Subject id로 승격**: email을 안정 canonical subject id(불변 PK)로 대체하고 email은 `binding source`(변경가능 속성)로 강등. binding type 7종·provider·assurance·이전/승계·digest 기록.
- **Golden Rule=Extend**: `Mapping::actorId`의 서버측 도출·클라이언트 미신뢰 로직은 **KEEP** — canonical subject **해석의 진입점**으로 재사용. actorId가 반환한 `user:{email}`를 binding 조회로 canonical subject id에 매핑(신규 도출기 신설 금지).
- **Mandatory Control(§5.2·원문)**: **Email 문자열만 Binding 금지** — canonical subject는 email이 아닌 안정 식별자. `PRIMARY`/`FEDERATED`(SSO)/`SERVICE`(api_key)/`MIGRATED`(Legacy Email-only) type으로 결속. `MIGRATED`는 Legacy Actor가 Email/문자열만일 때 **Mapping Confidence·Candidate·Manual Review 저장**(§84·임의 canonical 확정 금지).
- **실위험**: 현재 email이 사실상 subject key(§61 "Decision Actor를 Email로만 저장")이므로 **email 변경 시 과거 승인 actor의 동일성 재현 불가**·동명 다계정 충돌. Canonical Subject Binding이 email을 subject의 가변 속성으로 격하하여 이를 해소. Person↔Account 분리(현 ABSENT)가 선행 축.

관련: [[DSAR_APPROVAL_PRINCIPAL_REGISTRY]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_PROFILE]] · [[DSAR_APPROVAL_ACTOR_TYPE_REGISTRY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]] · [[reference_i18n_real_leak_detection]].
