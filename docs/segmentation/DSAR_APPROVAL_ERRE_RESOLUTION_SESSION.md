# DSAR — ERRE: 해석 세션 (APPROVAL_ROLE_RESOLUTION_SESSION)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_SESSION`**(SPEC §1(4)·§2 L84) — ERRE 해석 1회의 **경계 있는 실행 컨텍스트(bounded resolution execution unit)** — 를 명세한다.

주의: 여기서 "Resolution Session"은 사용자 로그인 세션(auth session)과 **다르다**. ERRE Resolution Session은 하나의 Subject+Context에 대한 실효 권한 해석 실행을 캡슐화하는 단위로, Resolution Context(SPEC §6)를 담고 Pipeline(SPEC §4) 실행을 추적하며 Evidence(SPEC §19)·Snapshot(SPEC §18)을 생성한다. 단, 로그인 세션은 Context의 한 요소(SPEC §6 "Session")이자 Subject Resolution 입력으로서 Resolution Session에 참조된다.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 Resolution Session(해석 실행 단위) = ABSENT

해석 1회를 경계 지어 추적·영속하는 실행 세션 개념은 부재하다. 현행 `effectiveForUser`(`TeamPermissions.php:393`)는 **매 요청 재계산 후 반환만 하고 저장하지 않으며**(Ground-Truth ② #3 L29), 실행 자체를 추적하는 세션 레코드가 없다. Evidence·Snapshot이 ABSENT(Ground-Truth ② #3·#6)이므로 세션 산출물도 부재.

### 2.2 로그인 세션(auth session) substrate = PARTIAL

Resolution Session이 참조할 auth session substrate는 실재한다:

| substrate (`파일:라인`) | 설명 | 판정 |
|---|---|---|
| `UserAuth.php:249` `userByToken()` | 세션 토큰→app_user 로드, plan/team_role 도출, 유휴 자동로그아웃 | PRESENT |
| `UserAuth.php:409` `authedTenant()` | 인증 세션의 격리 tenant, admin `X-Act-As-Tenant` 임퍼소네이트 제한 허용 | PRESENT |
| `index.php:423` | 세션 토큰→auth_tenant/auth_role(viewer) fallback 주입 | PRESENT |
| `index.php:99` | agency `agt_` 토큰→auth_tenant 서버바인딩 | PRESENT |

세션 토큰은 P5 보안수정으로 hash-only at-rest(평문 제거·replay 차단)로 승격된 상태(ADR D-7 재활용 대상, 재플래그 금지).

### 2.3 종합

**Resolution Session(해석 실행 캡슐) = ABSENT(순신규).** auth session substrate는 PARTIAL로 실재하나, 이는 Subject Resolution 입력이지 해석 실행 단위가 아니다. ADR D-7 정직 분리: auth session이 있다고 Resolution Session이 "이미 있다"로 오판 금지.

### 2.4 KEEP_SEPARATE

- `Alerting.php:665` "executor identity"는 알림 실행자지 **resolution executor/session이 아니다**(Ground-Truth ② §4). 비-권한·KEEP_SEPARATE.
- SecurityAudit 해시체인은 append-only audit이지 resolution session 영속이 아님 — KEEP_SEPARATE.

---

## 3. Canonical 설계 (세션 경계·Evidence·Snapshot 산출)

### 3.1 해석 세션 경계

- Resolution Session은 (Subject, Resolution Context, Policy Version) 튜플로 개시되어 Pipeline 18단계(SPEC §4)를 실행하고, 종료 시 Effective Projection(SPEC §27)+Snapshot(SPEC §18)+Evidence(SPEC §19)를 산출한다.
- 세션은 **결정적**(SPEC §16): 동일 (Subject+Context+Version)→동일 세션 산출물 100%.

### 3.2 Evidence·Snapshot 바인딩

- 세션은 Evidence Engine(SPEC §19)에 Rule Evaluation·Policy Decision·Assignment Chain·Hierarchy Chain·Scope Resolution·Risk Evaluation을 기록하여 Explain(SPEC §17)의 근거가 된다.
- 세션 산출 Snapshot은 immutable Resolution Version에 바인딩(SPEC §33) — 세션 재실행 시 이전 세션 결과와 Reconciliation(SPEC §25) 비교 가능.

### 3.3 임퍼소네이트 안전 (현행 계승)

- admin `X-Act-As-Tenant:platform_growth` 임퍼소네이트(`UserAuth.php:409`)는 Resolution Session의 Subject/Tenant 해석에 명시적으로 반영하되, 자동ON·localStorage 고착으로 인한 전역 하이재킹(과거 286차 사례)을 반복하지 않도록 세션 경계에서 명시적 opt-in만 허용.

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

Resolution Session은 파이프라인의 **실행 컨테이너**다:

- 개시: Subject Resolution(§4-1)+Identity Validation(§4-2)에 auth session substrate(`userByToken:249`·`authedTenant:409`) 소비.
- 진행: 3~15단계 실행 추적.
- 종료: Snapshot Generation(§4-16)+Cache Generation(§4-17)+Audit Logging(§4-18) 산출.

---

## 5. 무후퇴·Extend 원칙

- ADR D-1·D-7: 현행 auth session substrate(`userByToken:249`·`authedTenant:409`·`index.php:423`·`:99`)를 **파괴하지 않고** Resolution Session의 Subject/Context 입력 소스로 승격. 세션 토큰 hash-only(P5)는 그대로 재활용.
- 무후퇴: 유휴 자동로그아웃·임퍼소네이트 제한 로직 유지.

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37 "Evidence 구축"·"Snapshot 구축"의 산출 컨테이너로서 Resolution Session이 필요.
- Regression Test(SPEC §36) Approval·Audit 항목이 세션 산출물의 추적성을 검증.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `UserAuth.php`: `:249`(userByToken 세션 로드·유휴 자동로그아웃) · `:409`(authedTenant·임퍼소네이트 제한)
- `index.php`: `:99`(agency 토큰 바인딩) · `:423`(세션 fallback 주입)
- `TeamPermissions.php:393`(effectiveForUser 매요청 재계산·저장 안 함)
- KEEP_SEPARATE(비-권한, 인용 아님): `Alerting`(executor identity=알림 실행자) · `SecurityAudit`(해시체인 audit)

**판정 요약: APPROVAL_ROLE_RESOLUTION_SESSION = ABSENT(해석 실행 세션). auth session substrate만 PARTIAL 실재. 해석 세션 캡슐·Evidence/Snapshot 산출은 순신규 그린필드.**
