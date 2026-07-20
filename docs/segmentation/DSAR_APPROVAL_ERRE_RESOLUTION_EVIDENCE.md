# DSAR — ERRE Resolution Evidence Engine (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §19 Evidence Engine
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. KEEP_SEPARATE(SecurityAudit 해시체인·Risk·PM/Dependencies·GraphScore·RuleEngine·Decisioning·AnomalyDetection·Alerting·ModelMonitor 등)는 권한 resolution이 아니므로 오흡수 금지. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Evidence Engine**(SPEC §19)은 effective 권한 계산의 **모든 결정 근거를 append-only 증거로 영속**하는 축이다. 단일 PDP가 "왜 이 주체가 이 권한을 갖는가"를 사후에 재구성·감사·설명할 수 있도록, Resolution Pipeline의 각 단계가 소비·산출한 판단 요소를 구조화 증거로 남긴다.

SPEC §19가 규정하는 Evidence 저장 대상은 6종이다.

- **Rule Evaluation** — Dynamic/ABAC 규칙 평가 결과
- **Policy Decision** — RBAC/ABAC/Scope/Runtime/Emergency/Break-Glass/Organization 정책의 개별 판정(SPEC §13)
- **Assignment Chain** — Direct/Group/Organization Assignment 수집 경로(SPEC §3)
- **Hierarchy Chain** — Role 상속·Composite 전개 경로(SPEC §4 단계 4·5)
- **Scope Resolution** — Scope Projection·교집합·narrow>wide 확정 경로(SPEC §9)
- **Risk Evaluation** — Effective Risk Calculator 입력·출력(SPEC §12)

Evidence는 Snapshot(별편 §18)이 "결과의 동결"이라면, **"결과에 도달한 추론 과정의 동결"**이다. Explain Engine(SPEC §17)이 사람·JSON 양형으로 근거를 제시할 수 있는 것은 이 Evidence가 영속되어 있어야만 가능하다.

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (거버넌스 계층 순신규)

Resolution Evidence Engine은 Ground-Truth ② 거버넌스 판정표에서 **Simulation/Explain(XAI)·Snapshot 계열과 동일하게 ABSENT**로 확정된다. resolution의 추론 근거를 구조화해 영속하는 로직은 백엔드 실코드 grep 0이다.

- **Snapshot/Digest/Version(immutable) ABSENT**: `effectiveForUser`(`TeamPermissions.php:393`)는 effective 결과를 **반환만 하고 저장하지 않는다**(Ground-Truth ② §2 #3). 결과조차 남지 않으므로 그 근거(Evidence)는 더더욱 부재.
- **Simulation/Explain(XAI) ABSENT**: "왜 이 role이 활성인가" 설명 로직 grep 0(Ground-Truth ② §2 #6). Evidence는 Explain의 데이터 원천이므로 함께 부재.
- **매 요청 재계산·비영속**: 권한 계산 결과는 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)로 즉석 산출되고, 근거 로그·추론 트레이스가 남지 않는다(Ground-Truth ② §1).

### 2.2 실존 substrate (PARTIAL·근거의 "재료"만 존재)

Evidence로 **동결될 재료**는 라이브 계산 substrate 안에 인라인으로 흘러가나, 이를 증거로 채취·영속하는 계층은 없다.

- Rule/Policy 판정 재료: `requireFeaturePlan`(`UserAuth.php:77`)·`requirePlan`(`UserAuth.php:364`)·`PlanPolicy::allows`(`PlanPolicy.php:53`)의 통과/차단 사실은 계산되나 증거로 남지 않음.
- Assignment Chain 재료: `subjectPerms`(`TeamPermissions.php:202`)·`subjectScope`(`TeamPermissions.php:215`)가 조회한 grant 행은 request-time에만 존재.
- Scope Resolution 재료: `effectiveScope`(`TeamPermissions.php:236`)·`clampActions`(`TeamPermissions.php:423`)의 교집합 판단은 인라인 소멸.

### 2.3 ★KEEP_SEPARATE 오흡수 경고

이름이 "근거·로그·체인"으로 유사하나 **권한 resolution 근거가 아닌** 인접물 — Evidence Engine에 흡수·개명 금지(가짜녹색 회피, ADR D-5).

- `SecurityAudit.php:25`~`:31`·`:56`~`:64` **append-only 해시체인은 audit 로그이지 resolution snapshot/evidence가 아니다**(Ground-Truth ② §4). 결정 근거의 구조화 증거가 아니라 이벤트 무결성 체인이며, resolution 추론 트레이스를 담지 않는다. 재활용은 감사 계층 참조까지만 허용, ERRE Evidence 스토어로 병합 금지.
- `Alerting.php:665` "executor identity"는 알림 실행자 식별이지 resolution executor 근거가 아니다.

## 3. Canonical 설계 (`ERRE_RESOLUTION_EVIDENCE` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | evidence_id | 증거 레코드 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수 · 전역 증거 금지) |
| 3 | resolution_session_ref | 산출 세션 참조(SPEC §1 Resolution Session) |
| 4 | subject_ref | 대상 주체(user/api_key/service identity) |
| 5 | resolution_version | 결정적 결과의 바인딩 버전(SPEC §33 Version Binding) |
| 6 | rule_evaluation[] | Dynamic/ABAC 규칙 평가 결과(입력·출력·매칭여부) |
| 7 | policy_decision[] | 정책별 판정(policy_type, decision, 근거) — SPEC §13 |
| 8 | assignment_chain[] | Direct/Group/Org Assignment 수집 경로 |
| 9 | hierarchy_chain[] | Role 상속·Composite 전개 경로(DAG 노드열) |
| 10 | scope_resolution | Scope Projection·교집합·deny 확정 경로 |
| 11 | risk_evaluation | Effective Risk 입력요소·출력등급(LOW/MED/HIGH/CRIT) |
| 12 | captured_at | 증거 채취 시각 |
| 13 | evidence_digest | 무결성 다이제스트(별편 Digest §20 참조) |

### 3.1 열거형 / 타입

- **policy_type**: RBAC · ABAC · Scope · Runtime · Emergency · Break-Glass · Organization (SPEC §13)
- **decision**: ALLOW · DENY · NOT_APPLICABLE
- **risk_level**: LOW · MEDIUM · HIGH · CRITICAL (SPEC §12)

### 3.2 설계 원칙

- **Append-only 불변**: Evidence는 생성 후 수정 금지 — 변경은 새 레코드. Snapshot(§18)·Digest(§20)와 동일 불변 계열.
- **Explain의 유일 데이터 원천**: SPEC §17 Explain Engine의 "왜/어떤 Assignment/어떤 Rule/어떤 Scope/어떤 Policy/어떤 Deny"는 이 6종 chain을 조회해 사람·JSON 양형으로 렌더한다.
- **Tenant 격리 절대**: 모든 증거는 `tenant` 필수(현행 라이브 계산의 `WHERE tenant_id=?` 격리 규율 계승, Ground-Truth ② §5).
- **결정론 보증의 관측자**: 동일 입력→동일 출력(SPEC §35 Deterministic 100%)이 실제 성립함을 Evidence가 사후 증명. 결정성이 깨진 경우(비결정 규칙·경합) Evidence chain의 불일치로 드러난다.
- **Pipeline 단계 일대일 대응**: Evidence의 6종 chain은 Pipeline(SPEC §4) 단계 3(Assignment)·4·5(Hierarchy/Composite)·6(Dynamic)·7(Scope)·10(Risk)·12(Policy)·13(Conflict)에 일대일 사상 — 어느 단계도 증거 없이 통과 불가.

### 3.3 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **POLICY_EVALUATION_FAILED**(SPEC §30): 정책 판정 중 예외 시 Evidence는 실패 사실·부분 chain을 기록하고 fail-secure(DENY)로 귀결. 증거 없는 성공 판정 금지.
- **Resolution Drift 경고**(SPEC §31): Evidence chain 비교로 편차 관측 시 Drift Engine(§23)에 시그널 전달.
- **Missing Explain / Missing Audit**(SPEC §29 Static Lint): Evidence를 남기지 않는 resolution 경로는 정적 위반으로 탐지 — 233개소 하드코딩 authz(Ground-Truth ② §3)가 우선 수렴 대상.

### 3.4 API 표면 (SPEC §32 중 본 축 해당분)

- **Explain Authorization**: 특정 resolution_session의 Evidence 6종 chain을 사람·JSON 양형 반환.
- **Validate Resolution**: Evidence 무결성(Digest §20 검증)·chain 완결성 확인.
- 두 API는 **읽기 전용** — Evidence는 쓰기 API로 변조 불가(append-only, Cache Poisoning 방어와 동일 계열).

### 3.5 DB 제약 · 인덱스 · 성능 (SPEC §33·§34·§35)

- **DB 제약**: Snapshot Integrity·Digest Validation·Tenant Isolation·Version Binding(SPEC §33) — Evidence는 Snapshot과 동일 `resolution_version`으로 바인딩.
- **인덱스**: Subject·Snapshot·Version 인덱스(SPEC §34)로 Explain 조회 O(log n).
- **성능**: 증거 side-emit은 write path 부수작업이며, read(Explain)는 lock-free(SPEC §35). 실시간 판정 경로(P95≤20ms)를 저해하지 않도록 비동기 append 허용.

## 4. Kernel 매핑 (Resolution Pipeline 단계별 증거 소스)

| Evidence 축(SPEC §19) | Pipeline 단계(SPEC §4) | 최근접 substrate | 판정 |
|---|---|---|---|
| Rule Evaluation | Dynamic Evaluation(6) | Part 3-5 Dynamic/ABAC(선행) | **BLOCKED_PREREQUISITE** |
| Policy Decision | Policy Evaluation(12) | `PlanPolicy.php:53`·`UserAuth.php:77`·`:364`·`index.php:583`·`:587` | **PARTIAL**(판정만·증거영속 없음) |
| Assignment Chain | Assignment Collection(3) | `TeamPermissions.php:202`·`:215` | **PARTIAL**(조회만·체인영속 없음) |
| Hierarchy Chain | Hierarchy/Composite Expansion(4·5) | Part 3-2 Hierarchy(선행) | **BLOCKED_PREREQUISITE** |
| Scope Resolution | Scope Projection(7) | `TeamPermissions.php:236`·`:272`·`:286`·`:423` | **PARTIAL**(계산만·근거영속 없음) |
| Risk Evaluation | Risk Projection(10) | Effective Risk Calculator | **ABSENT**(Ground-Truth ② §2 #7) |
| **증거 채취·영속 자체** | Audit Logging(18) | — | **ABSENT** |

> Risk Evaluation 근거는 Effective Risk Calculator가 ABSENT이므로(§2.3) 산출 자체가 부재. `Risk.php:12`·`:81`·`:91`(churn/policy ML)은 **role 입력 위험계산기가 아니며**(Ground-Truth ② §4 KEEP_SEPARATE) risk_evaluation 증거 소스로 오흡수 금지.

## 5. 무후퇴 · Extend

- **Golden Rule(Replace가 아니라 Extend)**: `effectiveForUser`(`TeamPermissions.php:393`)의 인라인 판단 흐름을 파괴하지 않고, Pipeline 각 단계가 **판단 직후 Evidence를 부수 산출(side-emit)**하도록 확장한다. 계산 로직 자체는 승격 대상(ADR D-1)이지 재작성 대상이 아니다.
- **중복 스토어 금지**: `SecurityAudit`(§2.3)·기존 감사 로그와 별도로, Evidence는 resolution 전용 append-only 스토어로 분리 신설 — 단, 감사 체인과 **혼합 금지·개명 금지**.
- **forward-only**: 시행일 이후 전방 축적만. 소급 증거 생성 불가(과거 요청은 재계산 근거를 복원할 수 없음).
- **병행 유지**: ERRE 완성까지 현행 게이트(미들웨어 RBAC·`guardTeamWrite`·`requirePlan`·`effectiveScope`)는 그대로 동작하며, Evidence는 관측(observe)만 추가하고 판정을 바꾸지 않는다.
- **실재 과신 회피(ADR D-7)**: 현행 `subjectPerms`/`subjectScope` 조회 결과는 "재료"이지 Evidence가 아니다 — request-time에 소멸하는 조회를 "이미 증거가 남는다"로 오판 금지.
- **부재 과장 회피(ADR D-7)**: Evidence 관련 grep 0은 실측 부재이지 "숨겨진 구현"이 아니다. 반대로 `SecurityAudit` 해시체인이 존재한다고 해서 "resolution 증거가 이미 있다"로 확대해석 금지.

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **관측 단계**: Pipeline 단계에 Evidence side-emit 추가(판정 무변경, shadow 기록).
2. **검증 단계**: Explain API로 Evidence만으로 판정을 100% 재구성 가능함을 확인.
3. **강제 단계**: Static Lint(§29)로 Evidence 미기록 경로(233개소 하드코딩 authz)를 점진 수렴.
- 각 단계는 이전 게이트를 유지한 채 겹쳐 쌓이며, 어느 단계도 기존 판정을 후퇴시키지 않는다.

## 6. 완료 게이트

- Evidence Engine 6종 chain(Rule/Policy/Assignment/Hierarchy/Scope/Risk) append-only 영속 구축.
- Explain Engine(§17)이 Evidence만으로 사람·JSON 양형 설명을 재구성 가능(설명 100% 재현).
- Snapshot(§18)·Digest(§20)와 version 바인딩 정합 — 동일 `resolution_version`으로 상호참조.
- Tenant 격리 회귀 0 · 성능 요구(SPEC §35 P95≤20ms) 하에서 증거 side-emit 오버헤드가 read path(lock-free)를 저해하지 않음.
- Static Lint(§29)가 "Missing Audit/Missing Explain" 위반을 탐지 — Evidence 미기록 resolution 경로 0.
- **선행 의존**: Rule/Hierarchy 증거는 Part 3-2·3-5 실구현 후. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Unit(Explain)**: 임의 Pipeline 판정에 대해 6종 chain이 빠짐없이 기록되는지 · Explain이 사람·JSON 양형을 동일 근거로 재구성하는지.
- **Integration(Assignment·Scope·Policy)**: `subjectPerms`/`subjectScope`/policy 게이트 통과·차단이 Evidence에 정확히 사상되는지.
- **Security(Authorization Bypass)**: Evidence 없이 통과하는 resolution 경로가 0인지(하드코딩 authz 233개소 수렴 검증).
- **Regression(Audit)**: 기존 감사·판정 동작 무변경 하에 Evidence side-emit이 부수 추가만 되는지(무후퇴).

### 6.2 인접 엔진 경계

Evidence는 Snapshot(§18 결과 동결)·Digest(§20 지문)와 **불변 3형제**이나 역할이 다르다 — Snapshot=결과, Digest=지문, Evidence=추론 근거. Explain(§17)의 유일 원천이며, Drift(§23)·Reconciliation(§25)이 불일치 원인을 소급 추적할 때 참조한다. 혼합·겸용 금지.

## 7. 반날조 인용 출처

본 편이 인용한 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php:202`·`:215`·`:236`·`:272`·`:286`·`:393`·`:423` — 계산·조회 substrate(Ground-Truth ①)
- `backend/src/Handlers/UserAuth.php:77`·`:364` — plan 정책 판정(Ground-Truth ①)
- `backend/src/PlanPolicy.php:53` — plan allows(Ground-Truth ①)
- `backend/public/index.php:583`·`:587` — api_key 권한 판정(Ground-Truth ①)
- `backend/src/Handlers/SecurityAudit.php:25`~`:31`·`:56`~`:64` — 해시체인 **KEEP_SEPARATE**(Ground-Truth ②)
- `backend/src/Handlers/Alerting.php:665` — executor identity **KEEP_SEPARATE**(Ground-Truth ②)
- `backend/src/Handlers/Risk.php:12`·`:81`·`:91` — churn ML **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Evidence 거버넌스 로직은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
