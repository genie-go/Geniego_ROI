# DSAR — Authorization Profile (06-A-03-02-03-04 · §14)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §14 PROFILE · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§14 PROFILE — PROFILE enum (원문 전사):
`STANDARD` / `LOW_RISK` / `MEDIUM_RISK` / `HIGH_RISK` / `FINANCIAL_HIGH` / `PAYMENT` / `SETTLEMENT` / `CONTRACT` / `LEGAL` / `SECURITY` / `COMPLIANCE` / `ADMINISTRATIVE_CRITICAL` / `SYSTEM_ACTOR` / `SERVICE_ACCOUNT_RESTRICTED` / `CUSTOM`. (15종)

필수 필드 (원문 전사):
- `risk level`
- `default effect`
- `combining algorithm`
- `fail closed required`
- `explicit deny priority`
- `commit revalidation required`
- `cache allowed`
- `max cache duration`
- `max authorization age`
- `snapshot required` / `evidence required`
- `audit level`
- `challenge supported` / `override supported` / `exception supported`
- `manual review threshold`
- `kill switch behavior`

의미: Profile은 위험도 등급별로 인가 판정의 **안전 파라미터 묶음을 데이터로 선언**하는 재사용 프리셋이다. Definition(§12)·Version(§13)이 프로파일을 참조해 default effect·combining algorithm(고위험=DENY_OVERRIDES §11)·fail-closed 강제(§45)·commit 재검증 요구(§5.10)·cache 허용/최대수명/최대 authorization age(§49·§41)·snapshot/evidence 필수(§5.9)·kill switch behavior(§46)를 일괄 결정한다. §5.15 "고객설정 비활성 불가"(Default Deny·Fail-closed·Snapshot·Evidence 등)의 강제치를 프로파일 레벨에서 봉인한다.

## 2. 기존 구현 대조

- **위험도 등급별 인가 안전 파라미터를 데이터로 선언하는 Profile 구조체는 부재** — `risk level`·`default effect`·`fail closed required`·`commit revalidation required`·`max cache duration`·`max authorization age`·`kill switch behavior`를 프리셋으로 선언·참조하는 등록체 전무.
- 실존하는 유사 자산(코드 상수 기반 판정, 프로파일 아님):
  - 중앙 RBAC roleRank 하드코딩 맵 `index.php:554`(viewer0/connector1/analyst2/admin3) — 위험도가 아니라 역할 서열 상수. 프로파일 파라미터(cache/age/kill switch)와 무관.
  - write 메서드 게이트 `index.php:568-578`(POST/PUT/PATCH/DELETE에 analyst rank≥2 요구) — action 위험도의 조잡한 대리이나, `HIGH_RISK`/`FINANCIAL_HIGH` 같은 등급 선언도 그에 결합된 combining algorithm/fail-closed 파라미터도 없다.
  - `TeamPermissions.php:39,152-159,325-336` acl_permission 매트릭스(8action·manage 슈퍼셋) — 동작별 허용/거부만, 위험 프로파일 없음.
- **`fail closed required` / `default effect` 선언** → no hits(프로파일로서). 실 fail-closed는 idiom(DENY_SCOPE `TeamPermissions.php:234`·키조회 예외→401 `index.php:490-493`)으로 산재하나 프로파일 파라미터가 아니다. 반대로 `UserAuth.php:64-84`(`:68,72,82-84`)의 `requireFeaturePlan`은 plan null→allow·catch→allow **fail-open** — 프로파일이 강제할 `fail closed required`의 정반대.
- **`commit revalidation required`** → no hits. Validation↔Commit 분리 재검증(§5.10) 개념 자체 부재.
- **`max cache duration` / `max authorization age` / `cache allowed`** → no hits. 인가 판정 캐시 계층 자체 부재.
- **`kill switch behavior`** → no hits. Kill Switch 미구현(§46 별도 DSAR).
- **`explicit deny priority`** → no hits. Explicit Deny 우선(§5.3) 선언체 부재(DENY_SCOPE idiom만).

## 3. 판정

- Verdict: **ABSENT (순신규)**
- 부분 substrate: 역할 서열(`index.php:554`)·write 게이트(`index.php:568-578`)·acl_permission(`TeamPermissions.php:39`)는 "동작 위험의 조잡한 대리"로 존재하나, 위험도 등급 선언·그에 결합된 default effect/combining/fail-closed/cache/age/kill-switch 파라미터는 전무 → 프로파일 개념 부재.
- 선행 의존: Profile은 Registry(§7)·Definition(§12)·Version(§13)의 파라미터 프리셋 — 상위 Registry ABSENT에 연쇄 종속. 또한 §46 Kill Switch·§49 Cache·§41 Expiration이 전부 ABSENT라 프로파일이 참조할 강제치의 실 대상도 부재.
- cover: **0** (위험도별 인가 안전 파라미터 데이터 선언 전무. RBAC 상수는 역할 서열이지 위험 프로파일 아님·KEEP_SEPARATE).
- ★위험(후속 enforcement Part): `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)은 프로파일이 강제해야 할 `fail closed required`와 상충 — 정책엔진 도입 시 fail-closed 전환 대상.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_profile` 프리셋 — 15종 PROFILE enum별로 `risk level`·`default effect`(전부 DENY 기본)·`combining algorithm`(HIGH_RISK/FINANCIAL_HIGH/PAYMENT/SETTLEMENT/CONTRACT/LEGAL/SECURITY/COMPLIANCE=DENY_OVERRIDES §11)·`fail closed required`(고위험 전부 TRUE §45)·`commit revalidation required`·`cache allowed`/`max cache duration`/`max authorization age`·`snapshot/evidence required`·`kill switch behavior`를 데이터로 선언. Definition(§12)/Version(§13)이 profile_id로 참조.
- Golden Rule=Extend: 기존 위험 대리 상수(`index.php:554` roleRank·`:568-578` write 게이트·`TeamPermissions.php:39` acl 8action)를 프로파일의 초기 매핑 입력으로 흡수 — 재구현 금지, 프로파일 파라미터로 정형화.
- §5.15 봉인: `STANDARD` 최소 프로파일조차 Default Deny·Fail-closed·Snapshot·Evidence·Audit·Cross-tenant Isolation을 강제(고객설정 비활성 불가)하도록 프로파일 필드 기본값을 하드 봉인.
- 실위험(무후퇴 예외=개선): `requireFeaturePlan` 3중 fail-open(`UserAuth.php:64-84`)을 프로파일의 `fail closed required=TRUE`로 대체 — 단, 과금게이트 회귀 방지 위해 후속 enforcement Part에서 배선(이번 Part=설계만).
- Part5 Authority·Part8 Dual-Control이 프로파일의 `manual review threshold`·`challenge/override/exception supported`를 소비 — 이번 Part는 확장 포인트만 선언.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
