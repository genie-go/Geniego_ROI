# DSAR — Authorization Fail-Closed Policy (06-A-03-02-03-04 · §45)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §45 Fail-Closed Policy · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§45 Fail-Closed (원문 전사):

`Registry/Policy/Definition/Version Not Found · Policy Set Ambiguous · Context Missing · Subject/Resource/Action Invalid · Tenant/Resource Version Mismatch · Engine Timeout/Error · Cache Corruption · Digest Mismatch · Indeterminate · External Failure · Kill Switch · Tamper → Deny.`

`Read-only Low-risk Fail-open은 별도 Security Review + Versioned Policy.`
**`Approval/Payment/Settlement/Contract/Legal/Compliance/Security/Administrative는 Fail-open 금지.`**

의미: Fail-Closed는 인가 판정의 어느 단계에서든 **불확실·오류·부재·변조가 발생하면 최종 Effect를 DENY로 귀결**시키는 최상위 안전규칙이다(§5.2 Default Deny·§5.13 Fail Open 금지). Registry/Policy/Version 부재, Policy Set 모호, Context 불완전, Engine Timeout/Error, Cache 손상, Digest 불일치, Indeterminate, External Failure, Kill Switch, Tamper — 전부 Deny. Read-only 저위험만 예외적 Fail-open이 허용되나 별도 Security Review + Versioned Policy 필수. 고위험 도메인(Approval/Payment/Settlement/Contract/Legal/Compliance/Security/Administrative)은 **Fail-open 절대 금지**.

## 2. 기존 구현 대조

- **인가 코어(index.php 중앙 게이트)는 fail-closed 양호** — 실 실재하는 fail-closed idiom:
  - 키조회 예외→401 `index.php:490-493`(GROUND_TRUTH "PRESENT(양호)·fail-closed").
  - agency 위임 격리 `index.php:74-104` — agency_client_link.status='approved' 매요청 재검증·읽기전용 write 차단(fail-closed).
  - ABAC data_scope DENY_SCOPE `TeamPermissions.php:234`(effectiveScope 미해결→거부).
  - roleOf 미해결→member `TeamPermissions.php:120-131`(`:127` parent_user_id 키존재+빈값만 owner·권한상승 벡터 제거·fail-closed).
  - write 메서드 게이트 `index.php:568-578`·admin:keys `index.php:564-567`(기본 거부, 조건 충족만 허용).
- **★위험/Fail-open 실재(§45 위배 후보)**:
  - **`requireFeaturePlan` 3중 fail-open `UserAuth.php:64-84`(`:68,72,82-84`)** — plan null→allow(`:72`)·catch→allow(`:82-84`)·admin bypass(`:68`). 과금·기능 게이트가 오류/부재 시 **허용**으로 열림 → §45 "Engine Error/부재 시 Deny" 정반대. GROUND_TRUTH "위험" 등재.
  - **subjectScope catch→null `TeamPermissions.php:211,224`** — ACL 조회 실패 시 빈 scope 반환 → 상위에서 무제한 가능성(effectiveScope `:251` DENY_SCOPE로 부분 보완이나 조건부 fail-open).
  - FE writeGuard UI-only fail-open `frontend/src/services/writeGuard.js:13,61-90,73` — 클라이언트 인터셉터·서버 전역 미배선(§5.4 위배·member mutating 대다수를 UI로만 방어).
  - 레이트리밋 catch→통과 `index.php:550` — LEGACY(저위험·인증 통과 후라 무권한노출 아님).
  - `GENIE_STRICT_AUTH=1`일 때만 무테넌트 키 403 `index.php:585-587`(기본 OFF·opt-in fail-closed) — 기본값이 열려 있음.
- **선언적 Fail-Closed Policy(Registry/Policy/Version Not Found·Digest Mismatch·Tamper·Kill Switch → Deny 데이터 선언)** → no hits. fail-closed가 idiom으로 산재할 뿐 정책으로 선언·강제되지 않음. Digest Mismatch/Tamper/Kill Switch/Indeterminate 분기는 상위 구조체(§34~§46)가 ABSENT라 존재 불가.

## 3. 판정

- Verdict: **PARTIAL (인가 코어 fail-closed 양호 · 선언적 Fail-Closed Policy 부재 · 주변부 fail-open 위험 실재)**
- 근거: `index.php` 중앙 게이트와 TeamPermissions RBAC/ABAC는 예외/미해결 시 401/403/DENY_SCOPE로 닫히는 idiom을 다수 보유(양호). 그러나 이를 데이터로 선언·강제하는 Fail-Closed Policy는 부재하고, **requireFeaturePlan(`UserAuth.php:64-84`)·subjectScope catch→null(`TeamPermissions.php:224`)·writeGuard UI-only는 fail-open** — §45 고위험 Fail-open 금지에 상충하는 실 위험.
- 선행 의존: 선언적 Fail-Closed는 Registry/Policy/Version(§7~§13)·Digest(§37)·Kill Switch(§46)·Drift(§48) 상태를 분기 입력으로 소비 — 이들이 ABSENT라 "Not Found/Digest Mismatch/Tamper/Kill Switch → Deny" 분기가 아직 데이터로 성립 불가.
- cover: **부분** (fail-closed idiom substrate PRESENT · 선언적 정책·고위험 fail-open 봉인은 0).
- ★위험 등재(후속 enforcement Part): requireFeaturePlan fail-open·subjectScope catch→null·writeGuard UI-only.

## 4. 확장/구현 방향 (설계)

- 순신규 Fail-Closed Policy — Registry/Policy/Definition/Version Not Found·Policy Set Ambiguous(§43)·Context Missing·Tenant/Resource Version Mismatch·Engine Timeout/Error·Digest Mismatch(§37)·Indeterminate(§43)·Kill Switch(§46)·Tamper → 전부 **DENY**를 데이터로 선언. Profile(§14 fail closed required)이 도메인별 강제.
- Golden Rule=Extend: 기존 fail-closed idiom(`index.php:490-493`·`TeamPermissions.php:234`·roleOf `:127`)을 Canonical Fail-Closed의 실 구현 선례로 유지·정형화 — 재구현 금지.
- ★고위험 Fail-open 금지 명문화(§45·§5.13): Approval/Payment/Settlement/Contract/Legal/Compliance/Security/Administrative 도메인은 어떤 오류/부재/Timeout에서도 Fail-open 금지. **`requireFeaturePlan` 3중 fail-open(`UserAuth.php:64-84`)·subjectScope catch→null(`TeamPermissions.php:224`)을 fail-closed로 전환** — 단 과금게이트 회귀 방지 위해 후속 enforcement Part에서 Read-only Low-risk 예외를 별도 Security Review + Versioned Policy로 분리한 뒤 배선(이번 Part=설계·위험 등재만).
- §5.4 봉인: writeGuard UI-only(`frontend/src/services/writeGuard.js:13,61-90`)는 인가로 계상 금지 — 서버측 requireTeamWrite(`UserAuth.php:1088-1127` 현 11개소)를 전역 Runtime Guard(§55)로 승격해 UI 통제가 아닌 Server-side 재검증으로 대체(후속 Part).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_KILL_SWITCH]] · [[DSAR_APPROVAL_AUTHORIZATION_EVALUATION_PIPELINE]] · [[DSAR_APPROVAL_AUTHORIZATION_PROFILE]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
