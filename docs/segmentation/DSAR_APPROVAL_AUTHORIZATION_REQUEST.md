# DSAR — Authorization Request (06-A-03-02-03-04 Part 1 · §21)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §21)

`APPROVAL_AUTHORIZATION_REQUEST` 필수 필드 (원문 전사):
- `source` · `type` · `subject` · `resource(+version)` · `action` · `context`
- `decision command` · `requested at`
- `expected definition version` · `expected policy version` · `expected resource version`
- `idempotency` · `correlation` · `causation` · `request digest`

TYPE enum (11종): `VALIDATION` / `PREVIEW` / `COMMIT` / `READ` / `API_ACCESS` / `UI_HINT` / `BATCH` / `SYSTEM` / `SIMULATION` / `RECONCILIATION` / `CUSTOM`.

의미: Request는 "누가(subject/effective actor)·무엇을(resource+version)·어떤 Action을·어떤 목적(type)으로 인가받으려는가"를 담는 **인가판정 입력 봉투**다. Evaluation(§22)의 입력이자 Decision(§24)의 상위 결합 키다. 핵심 규율: (a) `expected definition/policy/resource version`을 요청자가 명시해 Validation↔Commit 사이 Version Drift(§44)를 탐지하고, (b) **`UI_HINT` type은 버튼 표시/비활성 등 클라이언트 보조정보일 뿐 Server-side Authorization을 대체하지 못한다**(§5.4·§21). 모든 중요 Action은 `COMMIT` Request로 서버에서 재검증돼야 한다.

## 2. 기존 구현 대조

- **선언적 Authorization Request 객체는 부재(ABSENT)**. 현재 서버는 PSR-7 HTTP 요청을 중앙 RBAC 미들웨어(`index.php:553-603`)가 절차적으로 검사한다: write 메서드 게이트(`index.php:568-578`)·admin:keys scope(`index.php:564-567`)·tenant 강제주입(`index.php:590-593,600`). 이는 요청을 **판정 입력 구조체로 정형화하지 않고** 그 자리에서 즉시 401/403을 반환하는 미들웨어 코드다 — `type`/`subject`/`resource+version`/`action`/`expected version`/`request digest` 필드로 구조화된 Request 객체가 없다.
- **`type` 11종 구분 부재**: VALIDATION/PREVIEW/COMMIT/UI_HINT/SIMULATION 등의 목적 구분이 없다. 현재는 HTTP 메서드(GET vs POST/PUT/PATCH/DELETE)만으로 read/write를 이분(`index.php:568-578`)한다. COMMIT 시점 재검증(§5.10) 개념이 request 수준에서 없다.
- **`expected definition/policy/resource version` 부재**: 인가규칙이 코드 상수(하드코딩 roleRank `index.php:554`)라 버전이 없고, 요청자가 기대 버전을 선언해 Drift를 탐지하는 substrate가 전무하다.
- **★`UI_HINT` ≠ Server Authorization 원칙의 실위험 실재**: FE `writeGuard.js:13,61-90` 는 apiClient 인터셉터로 member 쓰기를 UI에서만 차단하며 스스로 fail-open·"Phase3b 후속"을 자인(`writeGuard.js:73`)한다. 대응하는 서버측 강제 `requireTeamWrite`는 **11개소뿐**(`UserAuth.php:1088-1127`)이라, 116페이지 mutating의 대다수가 member read-only를 UI(=UI_HINT 성격)로만 방어한다(§5.4·GROUND_TRUTH §5·§0-5). 즉 현행 시스템은 원문이 금지하는 "UI_HINT가 서버 authorization을 대체" 상태를 부분적으로 실현하고 있다.
- `idempotency`/`correlation`/`causation`/`request digest`를 요청 단위로 보존하는 구조 → 인가 도메인에는 부재.

## 3. 판정

- Verdict: **ABSENT** (선언적 Authorization Request 구조체 순신규). 미들웨어 절차코드(`index.php:553-603`)는 PRESENT-substrate(요청 수신·tenant/role attach) 이나 Request **판정 입력 봉투**로서는 부재.
- cover: **0** — request type/expected version/request digest 데이터 선언 전무.
- 선행 의존: §3.1 Actor Identity Foundation(subject/effective actor)·§3.2 Decision Foundation(decision command)·§3.3 Resource Version 부재에 종속 → 상위 결합 일부 공회전(BLOCKED_PREREQUISITE).
- ★위험 등재: `UI_HINT` 성격의 FE writeGuard가 서버 전역 미배선(`UserAuth.php:1088-1127` 11개소 한정)인 채 사실상 authorization을 대신함 — 후속 enforcement Part에서 COMMIT Request 서버 재검증으로 폐쇄 필요.

## 4. 확장/구현 방향 (설계)

- 순신규 `authorization_request` 입력 봉투 — `type`(11종)·`subject`(§15 Subject Contract 참조·Actor Identity Foundation 바인딩)·`resource(+version)`·`action`(Canonical Code §17)·`expected definition/policy/resource version`·`idempotency/correlation/causation`·`request digest`. Evaluation(§22)의 유일 입력으로 표준화.
- Golden Rule=Extend: `index.php:553-603` 중앙 RBAC가 수신하는 요청 컨텍스트(auth_tenant/auth_role attach·tenant 강제주입 `index.php:600`)를 Request 봉투 생성의 1차 substrate로 재사용하되, 즉시 401/403 반환 대신 Request→Evaluation→Decision 파이프라인(§42)으로 흘려 판정을 데이터화.
- **UI_HINT 봉인**: `type=UI_HINT` 응답은 표시용 hint만 반환하고, 모든 mutating은 `type=COMMIT` Request로 서버 재평가하도록 계약. FE `writeGuard.js`(UI_ONLY·fail-open)는 hint 생산자로 격하하고, 실 강제는 서버 COMMIT Request가 담당 — `requireTeamWrite`(`UserAuth.php:1088-1127`) 11개소 한정 배선을 전역 COMMIT Request 게이트로 승격(실 배선은 후속 enforcement Part).
- **Version Drift 대비**: `expected definition/policy/resource version`을 요청자가 명시 → Validation↔Commit Version Resolution(§44)에서 불일치 시 `POLICY_VERSION_MISMATCH`/`RESOURCE_VERSION_MISMATCH`(§25) Deny. 성능 이유로 이 검증 생략 금지(§64).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EVALUATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
