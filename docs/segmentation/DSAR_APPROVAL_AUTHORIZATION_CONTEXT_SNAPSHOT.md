# DSAR — Authorization Context Snapshot (06-A-03-02-03-04 · §20)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §20 CONTEXT_SNAPSHOT · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§20 CONTEXT_SNAPSHOT (Immutable) — 필수 필드 (원문 전사):
- `definition version` / `policy set version`
- `subject snapshot` / `identity snapshot` / `authentication snapshot`
- `resource snapshot` / `action snapshot` / `environment snapshot`
- `decision slot snapshot` / `approval case snapshot`
- `assignment snapshot` / `authority snapshot` / `delegation snapshot`
- `amount` · `currency`
- `context schema version`
- `captured time`
- `context digest`
- **`현재 Resource/Role/Policy 재조회 금지.`**

의미: Context Snapshot은 판정 시점의 Context(§19)를 **불변으로 동결**한 원본이다. §5.8(Decision=Immutable Snapshot — 현재 Role/Permission/Policy로 과거 Decision 덮어쓰기 금지)의 실체. 한 번 캡처되면 이후 subject role 변경·resource 상태 변경·policy 버전 변경이 있어도 스냅샷은 판정 시점 값을 보존한다. ★핵심 규율: 재판정·감사·재현 시 현재 Resource/Role/Policy를 **재조회하지 말고** 스냅샷 값만 사용(§5.7 과거 Decision 현재 Policy 재해석 금지).

## 2. 기존 구현 대조

- **불변 Context Snapshot 부재(순신규)**:
  - 판정 시점 Context를 동결하고 `captured time`·`context digest`로 봉인하는 불변 스냅샷 구조체 → **no hits**. 현재 인가는 매 요청 roleOf(`TeamPermissions.php:120-136`)·data_scope(`:236-322`)·tenant(`index.php:600`)를 **재조회(live lookup)** 로 재계산 — 정확히 §20이 금지하는 "현재 Resource/Role/Policy 재조회" 방식.
  - 결과: 과거 판정이 현재 역할/정책으로 사실상 재해석됨(§5.7·§5.8 위반) — 승인 당시 권한과 감사 시점 권한이 다르면 원 판정 근거를 재현 불가.
- **snapshot 대상 필드의 부재**:
  - `subject snapshot`·`identity/authentication snapshot`·`resource snapshot`·`action snapshot`·`environment snapshot`·`decision slot/approval case/assignment/authority/delegation snapshot` → 각 Contract DSAR에서 확인된 대로 **snapshot 미결합**(subject=live roleOf, resource=WHERE tenant_id·version 없음, environment=즉석 런타임). 동결 대상 자체가 live.
  - `definition version`/`policy set version`: 정책이 코드 상수(하드코딩)라 버전 없음(GROUND_TRUTH: Versioned Policy ABSENT) → 스냅샷할 버전 부재.
- **context digest / captured time**:
  - 인가 context digest → no hits. 실 append-only 해시체인은 `SecurityAudit`가 유일하나 단일 감사트레일이지 판정 시점 context 동결이 아님(인용은 Decision Integrity DSAR 소관·여기선 계상 금지).
- **긍정 substrate(패턴 재사용 대상)**:
  - tenant 강제주입(`index.php:590-593,600`)은 스냅샷 캡처 시점의 tenant 격리 기준으로 재사용 가능(cross-tenant snapshot 오염 방지).

## 3. 판정

- Verdict: **ABSENT (순신규)** — 판정 시점을 불변 동결하는 Context Snapshot 전무. 현재 방식은 매 판정 live 재조회로 §5.7/§5.8을 구조적으로 위반.
- cover: **0** (불변 스냅샷·context digest·captured time 부재. subject/resource/policy가 전부 live lookup이라 동결 대상도 미형성).
- 선행 의존: §19 Context ABSENT·각 Contract snapshot(§15~§18) 미결합·Versioned Policy(§10·§13) 부재에 연쇄 종속 — 스냅샷할 원본 자체가 없음.
- ★규율 위반 현존: live 재조회 인가는 과거 판정 재해석 금지(§5.7)·Immutable Decision(§5.8)의 정반대 — Snapshot Foundation이 이를 교정하는 핵심.

## 4. 확장/구현 방향 (설계)

- Context Snapshot 순신규 — §19 Context를 판정 시점에 동결: `definition/policy set version`·subject/identity/authentication/resource/action/environment/decision slot/approval case/assignment/authority/delegation `snapshot`·amount/currency·`context schema version`·`captured time`·`context digest`(앞 블록 §37 Hash Chain 정책). 캡처 후 불변(§61 Immutable Update 방지·§60 Snapshot 수정 API 금지).
- ★재조회 금지 규율(§5.7/§5.8): 재판정·감사·§47 Revalidation·§35 Evidence 재현은 반드시 스냅샷 값만 사용 — 현재 roleOf/data_scope/policy 재조회 경로를 스냅샷 경로로 대체(단, Commit-time 재검증 §39는 새 Decision 생성이지 과거 스냅샷 수정이 아님).
- Golden Rule=Extend:
  - 현행 live 재조회기(roleOf `TeamPermissions.php:120-136`·data_scope `:236-322`)를 **캡처 시점 1회 실행 → 스냅샷 저장** 패턴으로 재배치 — 로직 재구현이 아니라 결과를 동결.
  - tenant 강제주입(`index.php:600`) = 스냅샷 tenant 격리 기준(§5.12)로 보존.
- 무결성: context digest는 SecurityAudit류 append-only 해시체인 패턴을 CANONICAL로 재사용하되 스냅샷은 별도 store(KEEP_SEPARATE — 감사트레일≠context snapshot).
- 실 스냅샷 동결·digest·불변 store 배선 = §19 Context 및 선행 Foundation 신설 후 별도 승인세션(이번 Part=계약 명세·코드 0).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT]] · [[DSAR_APPROVAL_AUTHORIZATION_SUBJECT_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_RESOURCE_CONTRACT]] · [[DSAR_APPROVAL_DECISION_INTEGRITY_REGISTRY]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
