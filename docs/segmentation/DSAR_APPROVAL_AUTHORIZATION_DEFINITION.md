# DSAR — Authorization Definition (§12)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§12 `APPROVAL_AUTHORIZATION_DEFINITION` 필수 필드 (원문 전사):

- `registry` · `code` · `name` · `domain`
- `applicable decision definitions` / `resource types` / `action types` / `actor types`
- **`policy set`**
- `subject contract version` / `resource contract version` / `action contract version` / `environment contract version`
- **`context schema version`**
- **`evaluation strategy`** · `default effect`
- **`fail closed policy`** · `snapshot policy` · `evidence policy` · `audit policy` · `cache policy` · `revalidation policy` · `drift policy` · `exception policy` · `override policy`
- `current version`

의미: Definition은 **하나의 인가 평가 계약(Evaluation Contract)**이다 — 어느 Domain·Decision Definition·Resource/Action/Actor Type에 대해 어떤 `policy set`을 어떤 `context schema version`·`evaluation strategy`·`fail closed policy`로 평가하는지를 데이터로 묶어, §22 Evaluation Pipeline의 진입 계약이 된다. Version(§13)이 이 계약의 불변 스냅샷을 관리한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 평가 계약(Definition) 구조체는 부재** — GROUND_TRUTH §1 **Authorization Registry/Definition = ABSENT**(`정책 데이터 선언 구조체 부재`). `policy set`/`context schema version`/`evaluation strategy`/`fail closed policy`/`current version`을 묶는 계약 전무.
- 실존하는 **암묵적 평가 진입점**(코드 미들웨어, 계약 선언 아님):
  - **중앙 평가 진입** = `index.php:553-603` — 요청마다 roleRank∧scope∧write-method∧tenant를 순차 평가하는 사실상의 평가 파이프라인이나, `policy set`/`context schema`/`fail closed policy` 미선언·버전 없음.
  - **팀 평가 진입** = `TeamPermissions.php:120-136`(roleOf/isAdmin 서열)+`:236-322`(data_scope) — 팀 도메인 평가 계약의 코드형.
  - **admin 평가 진입** = `UserAdmin.php:33-62`·requireAdminUser(`UserAuth.php:2920`).
- `evaluation strategy`·`context schema version`·`policy set` 참조·`fail closed policy`·contract version(subject/resource/action/environment)·`current version` → **no hits**. 평가 계약이 데이터 아닌 미들웨어 코드.
- **Context Schema/Contract Version 결속 부재** — 선행 §3.1 Actor Identity(Subject Contract)만 부분 substrate, Resource/Action/Environment Contract Version은 미실재.

## 3. 판정

- **Verdict: ABSENT** (평가 계약 선언체 부재). 중앙/팀/admin 미들웨어가 **암묵 평가 파이프라인으로 실재**(PARTIAL-substrate).
- **선행 의존**: Definition은 §11 Policy Set·§13 Version·§15~18 Contract·§19 Context Schema에 결속 — Policy Set/Contract/Context Schema 선언체 부재로 계약 조립이 **BLOCKED_PREREQUISITE**. 미들웨어 진입점만 substrate PRESENT.
- **cover: 0** (평가 계약 데이터 선언·버전·context schema 전무).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_definition` — Domain·Actor/Resource/Action Type·`policy set`·`context schema version`·`evaluation strategy`·`fail closed policy`를 계약으로 선언. **암묵 미들웨어 파이프라인(`index.php:553-603`·`TeamPermissions.php:120-322`)을 Definition이 관장하는 명시적 Evaluation Contract로 정형화** — 미들웨어를 대체가 아니라 계약 데이터에 결속(중복 평가 엔진 신설 금지).
- **Mandatory Control**: `fail closed policy`를 Definition 레벨에서 강제(§45·§5.13)·`context schema version` 미충족 시 §55 Runtime Guard로 Context Missing→Deny·`default effect`=DENY. 현재 평가 진입점은 fail-closed가 tenant 축(`index.php:600`)·DENY_SCOPE(`TeamPermissions.php:234`)에만 국지적.
- **실위험**: ① 평가 계약이 미들웨어에 하드코딩돼 Definition 버전·context schema 추적 불가 → 과거 Decision을 현재 코드로 재해석(§5.7 위반) 위험, Definition Version(§13)으로 고정. ② `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)이 Definition `fail closed policy` 미결속으로 계약 밖에서 allow — 계약 편입 시 fail-closed. ③ 3~4중 중복 게이트(isAdmin/requireAdmin)가 각기 다른 암묵 계약을 형성 → 단일 Definition으로 수렴(설계, 배선 후속).

관련: [[DSAR_APPROVAL_AUTHORIZATION_DEFINITION_VERSION]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY_SET]] · [[DSAR_APPROVAL_AUTHORIZATION_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
