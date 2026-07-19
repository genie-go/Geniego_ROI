# DSAR — Service Account Identity (06-A-03-02-03-03 · §36)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§36 Service Account Identity** — 사람이 아닌 서비스 주체(service principal)의 신원 계약. 필수 필드:
`canonical subject` · `owning team / system` · `business / technical owner`(업무·기술 책임자) · `tenant / legal entity scope` · `allowed clients / actions / resources`(허용 클라이언트·액션·리소스) · `interactive login prohibited`(대화형 로그인 금지) · `human impersonation prohibited`(사람 가장 금지) · `credential rotation ref` · `cert binding` · `expiration`.

★ **일반 UI 승인 금지**(§5.9·§37). Service Account는 사람처럼 UI에서 승인할 수 없으며, 명시적 System/Service Decision Policy와 제한된 Action Scope 안에서만 동작. 사람 가장(interactive login·human impersonation) 금지.

## 2. 기존 구현 대조

- **api_key = service principal substrate 실재, governance 규약 부재** — Mapping은 api_key 인증 시 actor를 `apikey:{id}`로 도출한다(`Mapping.php:36-53`). api_key 발급/스키마(`UserAuth.php:4240-4246`·`Db.php:942`)는 sha256 저장·scopes_json·role·expires_at·테넌트 인덱스를 갖춰 **service principal의 표기·인증 substrate로 실재**한다(GROUND_TRUTH §13 Principal Type `SERVICE_PRINCIPAL`/`API_CLIENT`에 대응).
- ★ **그러나 §36 governance 축이 전무** — `business/technical owner`·`owning team/system`·`interactive login prohibited`·`human impersonation prohibited`·`allowed actions/resources` 결합·`credential rotation ref` 규약이 없다. api_key는 RBAC scopes(`index.php:553-587`)로 write 권한을 갖지만, 그것이 "사람 승인이 아님"을 명시하는 정책이 없다.
- **interactive login 금지 규약 부재** — api_key로 로그인 UI에 진입하는 것을 금지하거나, api_key actor가 maker-checker 승인(`Mapping.php:186-190,246-250,268`)의 승인자로 계상되는 것을 차단하는 규약이 없다. api_key가 사람 승인자처럼 정족수 2(`Mapping.php:287`)에 계상될 수 있는지 정책적 경계 미정.

## 3. 판정

- **Verdict: PARTIAL(substrate PRESENT·governance 부재)** — service principal 인증/표기 substrate는 실재(`Mapping.php:36-53`·`UserAuth.php:4240-4246`·`Db.php:942`)하나, §36 Service Account governance(owner·interactive login 금지·human 금지·action scope 결합)는 **전무**.
- **선행 의존**: §3.1 Canonical Identity의 Service Account subject 부재 + §3.3 Decision Binding ABSENT — 승인 결합부 BLOCKED_PREREQUISITE.
- **cover: 부분** — service principal 표기·인증·scopes는 `Mapping.php:36-53`·`index.php:553-587`·`Db.php:942`로 커버. owner/interactive login 금지/human 금지/rotation/action scope governance는 0.

## 4. 확장·구현 방향 (설계)

- **api_key를 Service Account Identity의 정본 substrate로 승격(Golden Rule=Extend)** — 기존 api_key(`UserAuth.php:4240-4246`·`Db.php:942`)에 `canonical subject`·`owning team/system`·`business/technical owner`·`allowed clients/actions/resources`·`credential rotation ref`·`expiration` governance 필드 확장. 중복 service registry 신설 금지.
- ★ **interactive login prohibited·human impersonation prohibited Mandatory Control** — api_key actor(`apikey:{id}`)를 로그인 UI·사람 승인자로 계상 금지(§62 Lint "Service/System Actor Human Mapping"). maker-checker 정족수(`Mapping.php:287`)에서 service actor를 human approver로 오계상 차단.
- **명시 Service Decision Policy** — service account가 승인할 수 있는 action은 System Actor Policy(§37)와 동일하게 제한 scope·정책 안에서만. 일반 UI 승인 금지(§5.9).
- **credential rotation·cert binding** — sha256 저장(`Db.php:942`)에 rotation state·cert binding(§34) 참조 결합, raw key 비저장 유지.
- **선행 필수**: Canonical Subject Binding·Decision Binding 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_SYSTEM_ACTOR_IDENTITY]] · [[DSAR_APPROVAL_CERTIFICATE_IDENTITY_FOUNDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
