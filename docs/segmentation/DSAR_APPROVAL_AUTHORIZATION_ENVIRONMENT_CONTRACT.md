# DSAR — Authorization Environment Contract (06-A-03-02-03-04 · §18)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §18 Environment Contract · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§18 Environment Contract — 필수 필드 (원문 전사):
- `request time` / `effective time` / `commit time` · `timezone`
- `channel` · `application` · `client` · `device` · `session`
- `network` · `source system`
- `execution mode`
- `transaction` · `correlation` · `causation` · `idempotency key`
- `feature release` / `policy runtime version`
- `maintenance state` / `incident state` / `kill switch state` / `emergency state`
- `trusted time`
- **`시점 Snapshot 보존.`**

의미: Environment Contract는 "어떤 상황에서(when/where/how)" 인가 판정하는지를 **판정 시점의 환경 스냅샷**으로 봉인한다. request/effective/commit time 3분리로 Validation↔Commit 시간차 검증(§5.10·§39)·kill switch/incident/maintenance state를 판정에 결합(§45·§46)·trusted time으로 시각 위조 방지·correlation/causation/idempotency로 재현·중복 차단. ★시점 snapshot 보존 = 과거 판정을 현재 환경으로 재해석 금지(§5.8).

## 2. 기존 구현 대조

- **★시점 snapshot 부재(핵심)**:
  - `request time`·`effective time`·`commit time` 3분리·`policy runtime version`·`kill switch state`·`incident state`·`maintenance state`·`trusted time`·`correlation`·`causation`·`idempotency key`를 판정에 결합·보존하는 environment 계약 → **no hits**(인가 결합체로서). 현재 인가는 요청 시점 런타임 상태만 즉석 사용하고 불변 환경 snapshot을 남기지 않음.
  - 결과: Validation 시점과 Commit 시점의 환경(정책 런타임 버전·kill switch 상태) 변경을 인가 계층이 탐지 불가(§48 Environment Drift 기반 없음).
- **partial substrate(환경 축의 산재)**:
  - `session`/`client`: api_key 인증(SHA-256 조회 `index.php:490-493`)·auth_role/auth_tenant attach(`index.php:590-593`) = session/client 식별 substrate이나 environment snapshot 아님.
  - `channel`: agency 경로(`index.php:74-104`)·basePath /api(`index.php:32-33`)로 요청 경로 구분은 있으나 canonical channel 필드 아님.
  - `execution mode`/`strict`: `index.php:585-587`(GENIE_STRICT_AUTH=1일 때만 무테넌트 키 403·기본 OFF) = 환경 플래그의 조잡한 예이나 opt-in·판정 결합 안 됨.
- **kill switch / incident / maintenance state**:
  - Kill Switch 자체 미구현(§46 별도 DSAR ABSENT) → environment의 `kill switch state` 결합 대상 부재.
  - incident/maintenance state를 인가 판정에 결합 → no hits.
- **trusted time**:
  - 서버 UTC 시각 사용은 있으나(도메인 산재) 인가 environment `trusted time`으로 결합·위조방지 계약 → no hits.
- **feature release / policy runtime version**:
  - `requireFeaturePlan`(`UserAuth.php:64-84`·`:68,72,82-84`)은 feature/plan 게이트이나 **fail-open**(plan null→allow·catch→allow) — environment의 `feature release` 결합 대상이나 정책 런타임 버전 개념 없고 fail-open이라 §18 시점 snapshot 원칙과 상충.

## 3. 판정

- Verdict: **ABSENT (시점 snapshot 부재)** — session/client/channel 식별 파편은 실재하나, request/effective/commit time 3분리·policy runtime version·kill switch/incident state·trusted time·correlation/causation을 결합·보존하는 environment snapshot은 전무.
- cover: **~10%** (session/client 식별·strict 플래그·channel 구분 파편만. 시점 3분리·런타임 버전·kill switch/incident 결합·trusted time·불변 snapshot은 0).
- 선행 의존: `commit time`·`policy runtime version`은 §3.2 Decision Foundation(Commit)·§13 Definition Version·§39 Commit Binding에 종속; `kill switch state`는 §46(ABSENT)에 종속 — 상위 결합 공회전.
- ★위험: `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)은 environment feature 결합의 fail-closed(§5.13) 원칙과 정면 상충.

## 4. 확장/구현 방향 (설계)

- Environment Contract 순신규 — `request/effective/commit time` 3분리·`timezone`·`channel`·`client`·`device`·`session`·`policy runtime version`·`kill switch/incident/maintenance/emergency state`·`trusted time`·`correlation/causation/idempotency key`를 판정 입력으로 결합, 시점 environment snapshot을 불변 보존.
- Golden Rule=Extend:
  - api_key 인증(`index.php:490-493`)·auth attach(`index.php:590-593`) = `session`/`client` substrate로 재사용.
  - agency/basePath 경로 구분(`index.php:74-104`·`:32-33`) = `channel` 정규화 입력.
  - `GENIE_STRICT_AUTH`(`index.php:585-587`) = `execution mode`/fail-closed 강제의 초기 플래그로 흡수(단, 기본 OFF→고위험 도메인은 강제 ON 설계).
- ★시점 3분리: request time(요청)·effective time(정책 적용 기준)·commit time(집행)을 분리 기록해 §39 Commit Binding·§48 Environment Drift·§5.10 Validation↔Commit 재검증의 시간축 기반 제공. trusted time으로 시각 위조 차단.
- kill switch/incident state 결합은 §46 Kill Switch 신설에 종속 — environment는 그 상태를 read해 §45 fail-closed로 blocked action 차단(설계 인터페이스만).
- fail-open 정정: `requireFeaturePlan`(`UserAuth.php:64-84`) 3중 fail-open을 environment `feature release`+profile `fail closed required`(§14)로 대체 — 실 배선은 후속(과금게이트 회귀 방지).
- 실 environment snapshot 결합·trusted time·commit time 배선 = §3.2/§46 신설 후 별도 승인세션(이번 Part=계약 명세·코드 0).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_ACTION_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT_SNAPSHOT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
