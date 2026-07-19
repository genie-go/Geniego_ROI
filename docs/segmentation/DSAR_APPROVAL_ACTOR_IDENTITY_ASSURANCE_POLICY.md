# DSAR — Actor Identity Assurance Policy (06-A-03-02-03-03 · §9)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §9.

## 1. 원문 전사 (Canonical Contract)

§9 POLICY 필수 필드 (원문 전사):
- `canonical subject` policy · `principal resolution` policy · `actor type` policy · `auth method` policy
- `identity assurance requirement` · `authentication assurance requirement` · `session assurance requirement` · `device assurance requirement`
- `tenant binding` · `legal entity binding` · `organization binding` · `action binding` · `resource binding` · `decision slot binding` · `command binding` · `commit binding`
- `revalidation` policy · `expiration` policy
- `delegation identity` policy · `impersonation` policy · `service account` policy · `system actor` policy
- `evidence` policy · `audit` policy · `reconciliation` policy

의미: Policy는 Registry(§7)가 선언한 지원범위 위에서 **"어떻게 canonical subject를 해석하고, principal↔actor를 어떻게 결합하며, 어느 binding·revalidation·expiration을 강제하고, delegation/impersonation/service-account/system-actor를 어떻게 취급하는가"를 데이터로 규정**하는 규칙 집합이다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **정책-as-데이터는 부재** — 위 필드를 선언·조회하는 policy 구조체 전무. 규칙은 코드에 **암묵 하드코딩**돼 있고 데이터로 버전·조회되지 않는다.
- 실존하는 **암묵 규칙 substrate**(코드 기반·정책객체 아님):
  - **canonical subject/principal resolution의 사실상 정본** — `Mapping::actorId`(`Mapping.php:36-53`): api_key→`apikey:{id}`·세션→`user:{email}`·미확인→null. **클라이언트 입력 미신뢰**(§5.11 부분충족)이나 데이터정책이 아닌 하드코딩 로직.
  - **impersonation 취급** — `UserAdmin.php:472-534`(`:493-497,499,525`): admin→대상 user 실 세션(`imp_` 2h) 발급·발급시 audit. 단 **Original Principal 미보존**(§5.8 위반)·정책객체 없음.
  - **X-Act-As-Tenant** — `UserAuth.php:398`: admin+`'platform_growth'` 단일값·effective tenant만 치환·actor는 admin 유지. tenant binding 재료이나 정책 아님.
  - **service account 취급** — api_key(`Db.php:942-955`)가 사실상 service principal이나 `service account policy`(interactive login prohibited·human impersonation prohibited) 부재.
  - **revalidation/commit binding** — `Alerting.php:572-599,601-665`(`:562`): decideAction 단일 approved·executeAction 재인증/MFA/approver≠executor/status 확인 **없음**. commit-time revalidation 정책 부재.
  - **audit** — `Mapping.php:60`·`Alerting.php:28`은 비체인 `audit_log` 기록(SecurityAudit 해시체인과 분리).
- `revalidation`/`expiration`/`session·device assurance requirement`/`delegation identity`/`impersonation`/`system actor` policy → **no hits**(데이터 선언 전무).

## 3. 판정 (Verdict)

- Verdict: **ABSENT(정책 객체 자체) · PARTIAL-substrate(resolution·impersonation·tenant 취급 로직 실재하나 정책-as-데이터 아님)**
- 선행 의존: Policy는 Registry(§7) 하위. `commit binding`/`revalidation`/`decision slot binding`/`command binding`은 **§3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation 부재**로 결합 대상(불변 Decision Record/Command) 없음 → **BLOCKED_PREREQUISITE**. `canonical subject`/`principal resolution`/`impersonation`/`tenant binding` policy는 substrate 위에 조립 가능.
- cover: **0**(정책 데이터 선언 전무). resolution 로직·impersonation 세션은 재사용 substrate.

## 4. 확장/구현 방향 (설계)

- 순신규 `actor_identity_assurance_policy` — 위 필드를 데이터로 규정. **Golden Rule=Extend**: `Mapping::actorId`(`Mapping.php:36-53`)의 서버측 도출·클라이언트 미신뢰 원칙을 `canonical subject`/`principal resolution` policy의 CANONICAL 실집행기로 승격 — 신규 도출기 신설 금지.
- **Mandatory Control(§5.12 고객설정 비활성 불가)**: Canonical Subject Resolution·Original/Effective Actor Preservation·Tenant Binding·Session Binding·Commit-time Revalidation·Disabled/Terminated Blocking·Raw Credential Storage Prohibition·Impersonation Disclosure·Identity Snapshot·Authentication Evidence·Identity Audit는 정책에서 **비활성 불가로 강제**.
- **impersonation policy(§39)**: `UserAdmin.php:472-534`의 대행 세션은 KEEP하되 **Original Principal 보존 + 기본 Approval Decision 금지**(예외=Ticket/Reason/Supervisor/Time/Action/Audit) 정책으로 감쌈. 현재 대행승인이 본인승인과 구별 불가한 위험(§2)을 정책이 차단.
- **실위험**: `Alerting`(`:33-36`·`:572-665`) 미승인·미재검증 집행은 policy의 `commit binding`/`revalidation` 강제로만 닫힘 — 단 이는 BLOCKED_SECURITY 자립수정 대상(별도 배포승인 세션). **audit policy**는 비체인 `audit_log`(`Mapping.php:60`)을 SecurityAudit 해시체인(`SecurityAudit.php:14-33`)으로 통일하도록 규정.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_REGISTRY]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_DEFINITION]] · [[DSAR_APPROVAL_CANONICAL_SUBJECT_BINDING]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
