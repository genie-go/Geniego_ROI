# DSAR — Authorization API Contract (§60)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§60 API 표면(범주)**: Registry · Policy · Definition · Evaluation · Binding · Exception·Override · Snapshot · Evidence · Simulation · Reconciliation.

**공통 규약(모든 API 필수)**: `Tenant` · `AuthN/Z` · `Expected Version` · `Idempotency` · `Correlation/Causation` · `Rate Limit` · `Sensitive Redaction` · `Audit` · `Evidence` · `Pagination` · `Error Contract` · **`Server-side Enforcement`**.

**절대 금지(§60·§59·§5.8)**: **Decision / Snapshot / Evidence / Audit 수정 API 금지** — 판정결과·불변 스냅샷·증거·감사이벤트는 append/read-only, 갱신·삭제 엔드포인트를 두지 않는다.

의미: 인가 API는 정책 데이터(Registry/Policy/Definition)의 CRUD·활성화, 판정(Evaluation), Commit 검증(Binding), 예외/오버라이드 발급, 스냅샷/증거 조회, 시뮬레이션·정합(Reconciliation)을 노출하되, **모든 판정은 서버측에서만 종결**(§5.4·§5.5)되고 UI/클라이언트는 힌트(§21 UI_HINT)만 받는다. 판정 산출물은 불변이며 수정 API는 존재하지 않는다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **선언적 인가 API 표면은 부재** — Registry/Policy/Definition/Evaluation/Binding을 노출하는 엔드포인트 전무. GROUND_TRUTH §0.1은 인가가 **핸들러 내장 게이트**(`index.php:553-603` 중앙 RBAC 미들웨어)로만 존재함을 확정. 현재 authorization API 표면 = 없음(미들웨어 강제만).
- 실존하는 인접 API/게이트(정책 CRUD 아님):
  - **키·스코프 관리 API** = `Keys.php:99-113,198-206`(scope 화이트리스트+역할상한·owner-only CRUD)·`/v421/keys` admin:keys 게이트(`index.php:564-567`)·`UserAuth.php:4204-4290`. api_key scopes는 실 관리표면이나 **정책 데이터 API가 아니다.**
  - **admin/plan 관리** = `UserAdmin.php:33-62`(세션 admin 게이트)·`AdminPlans.php:393`(plan_menu_access) — 인가 데이터 일부를 다루나 Registry/Policy 계약 미준수(버전·Expected Version·Digest 없음).
  - **공통 규약 substrate**: Tenant 강제주입(`index.php:590-593,600`)·AuthN/Z(`index.php:553-603`)·Rate Limit(`index.php:550` 단, fail-open)·agency 위임 재검증(`index.php:74-104`) — 공통 규약의 일부가 미들웨어 수준에 실재하나 API 계약으로 표준화되진 않음.
- **★수정 API 금지 원칙 대비 위험**: 승인 결과가 **가변 append**로 관리됨 — Mapping approve `approvals_json`(`Mapping.php:288`)·Alerting decideAction `approvals_json`(`Alerting.php:653`). 이는 인가 Decision이 아닌 승인 워크플로 상태이나, Authorization Decision을 여기 얹으면 §34 Immutable Snapshot 위반 위험 → 신규 Decision/Snapshot/Evidence는 **반드시 별도 append/read-only 표면**으로 분리.
- `Expected Version`/`Idempotency`/`Sensitive Redaction`/`Evidence` 를 강제하는 인가 API → **no hits**(버전화·Idempotency·Evidence 개념 부재).

## 3. 판정

- **Verdict: ABSENT** (인가 API 표면 부재, 핸들러 내장 게이트만). 공통 규약(Tenant/AuthN/Z/Rate Limit)은 미들웨어 substrate로 **PARTIAL-PRESENT**.
- **선행 의존**: API는 Registry(§7)·Policy(§10)·Decision(§24)·Evidence(§35)의 노출 계층 — 상위 데이터체가 ABSENT이므로 API도 순신규. Binding/Reconciliation은 선행 §3.2 Decision·§3.3 Governance 부재로 BLOCKED_PREREQUISITE.
- **cover: 0** (인가 정책/판정 API 전무). Keys/AdminPlans는 인접 관리표면일 뿐 Registry/Policy/Decision API 대체 아님 — KEEP_SEPARATE(관심사 상이), 상위 Definition에서 조합.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 인가 API 10범주(Registry/Policy/Definition/Evaluation/Binding/Exception·Override/Snapshot/Evidence/Simulation/Reconciliation)를 최신 버전 접두(`/vNNN/authz/*`) 하에 정의하고 `routes.php` 등록. **중복 미들웨어/Resolver 신설 금지** — 판정은 기존 중앙 RBAC(`index.php:553-603`)를 대체가 아니라 **Registry/Policy 데이터를 소비하는 Evaluation API로 승격**하고, 미들웨어는 그 판정을 호출하는 Adapter로 위임.
- **공통 규약 강제**: 모든 API에 Tenant(`index.php:600` 강제주입 재사용)·AuthN/Z·Expected Version(§44 Version Resolution)·Idempotency·Correlation/Causation·Rate Limit·Sensitive Redaction·Audit·Evidence·Pagination·`APPROVAL_AUTHORIZATION_*` Error Contract·**Server-side Enforcement**을 필수화. `/api` 별칭 경로도 동시 등록(GROUND_TRUTH §1 basePath strip `index.php:32-33`).
- **수정 API 절대 금지(§34·§5.8)**: Decision/Snapshot/Evidence/Audit은 **append/read-only 전용** — POST(생성)·GET(조회)만, PUT/PATCH/DELETE 미제공. 승인 워크플로의 가변 append(`Mapping.php:288`·`Alerting.php:653`)와 물리적으로 분리해 불변성 확보.
- **UI_HINT ≠ 서버판정(§5.4·§21)**: Evaluation API의 `REQUEST.type=UI_HINT`는 버튼 표시용 보조정보로만 반환하고, 실제 mutating action은 서버측 COMMIT 재평가를 강제. FE writeGuard(`writeGuard.js:13,61-90`)의 UI-only·fail-open은 이 API가 서버 정본으로 대체(Reconciliation §51 UI Hint vs Server). 실 배선은 후속 enforcement Part.
- **Simulation/Reconciliation은 비파괴**: Simulation은 실 Permit/Exception/Override/Commit 생성 금지(§50), Reconciliation은 조회·차이보고만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_AUTHORIZATION_CACHE_POLICY]].
