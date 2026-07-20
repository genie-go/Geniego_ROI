# DSAR — ERRE Runtime Enforcement Contract (PEP) (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §1-25(Runtime Enforcement Contract 목표) · §27(Projection) · §28(Runtime Guard)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: "모든 접근 제어는 반드시 본 엔진을 통과"(SPEC §0) — 단일 PEP·우회 금지 · **반날조**: `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · 289차 확정분(P1~P5) 재플래그 금지

---

## 1. 목적

**Runtime Enforcement Contract**(SPEC §1 목표 25번)은 ERRE가 산출한 Runtime Authorization Projection(§27)을 **실제 요청 시점에 강제하는 계약(PEP, Policy Enforcement Point)**이다. SPEC §0의 최상위 명령 — "모든 접근 제어는 반드시 본 엔진을 통과해야 한다" — 의 런타임 구현이다.

Enforcement Contract는 다음을 규정한다.

- **강제 지점(PEP)**: 요청이 어디서 권한 검사를 받는가(미들웨어·핸들러·FE 게이트).
- **강제 입력**: PEP는 ERRE Projection(§27 6 output set)을 참조해 허용/거부를 결정.
- **우회 금지**: PEP를 우회하는 하드코딩 authz(233개소)는 Static Lint(§29·별편)로 수렴.
- **fail-secure**: 모호·미해석 시 거부 우선(Deny beats Allow, ADR D-4).

본 편의 핵심은 현행 **직교 병렬 3-게이트**(api_key 미들웨어→guardTeamWrite→핸들러 requirePlan)를 substrate로 삼아, 이를 **단일 통과 계약(single PEP)**으로 통합하는 방향을 정직 판정하는 것이다.

## 2. Ground-Truth (PEP substrate / PARTIAL)

### 2.1 판정 요약 — **PARTIAL (다층 게이트 실존·단일 계약 부재)**

강제 지점은 **실재**한다 — 미들웨어 RBAC·전역 guardTeamWrite·핸들러 plan 게이트가 요청을 실제 차단한다. 그러나 이들은 **직교 병렬 layering**으로, 하나의 canonical PDP 결과를 참조하는 단일 PEP 계약이 아니다(Ground-Truth ① §4 "통합 PDP 부재"). 강제는 하나 계약은 분산.

### 2.2 PEP substrate 대조표

| 강제 지점(PEP) | 판정 | 실 substrate / 근거 |
|---|---|---|
| api_key RBAC 미들웨어(rank+scope) | **PRESENT(차원 한정)** | `index.php:573`(roleRank)·`:583`(admin:keys)·`:587`(write→rank≥2/ingest≥1)·`:608`(context 주입) — api_key 차원만 |
| 전역 team_role 쓰기 게이트 | **PRESENT** | `guardTeamWrite`(`UserAuth.php:1167`)+`index.php:82` — mutating 요청 라우팅 전 member 쓰기 차단(`/auth/*` 예외) |
| 핸들러 plan 게이트 | **PRESENT** | `requirePlan`(`UserAuth.php:364` PlanPolicy::RANK 단일소스)·`requireFeaturePlan`(`:77` 미해석→free fail-secure) |
| 핸들러 team 쓰기 게이트 | **PRESENT** | `requireTeamWrite`(`UserAuth.php:1134`)·`teamCanWrite`(`:1125`)·owner-only(`:1204` `requireTenantSecurityWrite` "plan과 직교" 명시) |
| scope 강제(데이터 행 필터) | **PRESENT** | `effectiveScope`(`:236`)→`scopeSql`(`:286` `AND 1=0`)·`scopeChannelProduct`(`:315`) |
| FE 쓰기 가드 | **PRESENT(심층방어)** | `writeGuard.js:61`(guardWrite)·`teamRolePolicy.js` — 서버 강제의 클라 미러 |
| tenant 격리 강제 | **PRESENT** | `authedTenant`(`:409`)·X-Tenant-Id 주입(`index.php:608` 위조차단) |

### 2.3 단일 계약 부재 근거 (Ground-Truth ① §4)

- 세 게이트는 **직교 병렬 통과**: 미들웨어(api_key role)→guardTeamWrite(team_role)→핸들러 requirePlan(plan)+effectiveScope(team_role scope)가 각기 독립 통과. `requireTenantSecurityWrite`(`UserAuth.php:1204`)가 "plan 게이트와 직교" 명시 — 의도적 layering.
- api_key 경로와 세션(team_role) 경로는 **상호배타** — 한 요청에서 세 rank 동시해석 안 됨.
- 하나의 PEP가 통합 Projection(§27) 6 output set을 참조해 단일 결정을 내리는 계약은 **부재**.

### 2.4 우회 리스크 — 하드코딩 authz 233개소 (PEP 미강제)

Ground-Truth ② §3: `=== 'admin'`·`role == 'owner'` 등 **233개소(BE 106/FE 127)**가 PEP를 거치지 않고 개별 인라인 판정. 이는 단일 계약을 우회하는 god-role 산재로, Enforcement Contract가 수렴해야 할 대상이다(Static Lint 별편).

### 2.5 KEEP_SEPARATE

- `Alerting.php:665`("executor identity") — 알림 실행자이지 PEP executor 아님.
- `SecurityAudit.php`(hash chain) — 감사이지 강제 계약 아님.

## 3. Canonical 설계

### 3.1 단일 PEP 통과 계약(SPEC §0)

모든 mutating/read 요청은 **단일 PEP**를 통과한다. PEP는 다음을 수행:

1. Subject+Context 확정(§4-1·6) → Resolution Snapshot(§18) 조회(캐시 우선).
2. Projection(§27) 6 output set 참조 → 요청 (action, scope, constraint)이 Effective Permission/Scope/Constraint Set 내인지 검사.
3. Effective Deny Set에 걸리면 즉시 거부(Deny beats Allow, ADR D-4).
4. Runtime Guard(§28) 8종 위반 시 차단(별편).
5. 결정+근거를 Evidence(§19)·Audit(§4-18) 기록.

### 3.2 fail-secure 계약

- 모호(무-tenant·미해석 plan)·미인증·스냅샷 부재 → **거부 우선**(현행 `GENIE_STRICT_AUTH` `index.php:604`·`requireFeaturePlan` free fail-secure `:77` 승격).
- UNKNOWN Permit 금지 — 판정 불가는 거부.

### 3.3 우회 금지 계약

PEP를 우회하는 직접 authz(233개소)는 점진적으로 PEP 위임으로 전환. Static Lint(§29)가 신규 우회 유입을 차단(무후퇴 수렴).

## 4. Kernel 매핑 (3-게이트→단일 PEP)

| 현행 게이트 | 통합 PEP 단계 | substrate |
|---|---|---|
| api_key 미들웨어 rank/scope | Subject Resolution + Permission Projection | `index.php:573`·`:587`·`:608` |
| guardTeamWrite | Deny Projection(team_role) | `UserAuth.php:1167`+`index.php:82` |
| requirePlan/requireFeaturePlan | Policy Evaluation(plan) | `UserAuth.php:364`·`:77`·`PlanPolicy.php:53` |
| requireTeamWrite/owner-only | Permission Projection(team_role) | `UserAuth.php:1125`·`:1134`·`:1204` |
| effectiveScope/scopeSql | Scope Projection 강제 | `TeamPermissions.php:236`·`:286` |
| writeGuard(FE) | 심층방어 미러 | `writeGuard.js:61` |

즉 3-게이트를 삭제하지 않고 **단일 PEP의 각 Projection 참조 단계로 재배치**한다.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1·D-7)**: 미들웨어 RBAC·guardTeamWrite·requirePlan·effectiveScope는 **파괴하지 않고** 단일 PEP 계약의 강제 지점으로 통합. 현행 강제력은 100% 보존.
- **무후퇴(ADR 무후퇴)**: "기존 게이트는 ERRE 완성까지 유지·병행. Extend-only." 단일 PEP는 기존 게이트를 대체하는 것이 아니라 그 위에 통합 계약 레이어를 얹는다.
- **P1~P5 재활용(ADR D-7)**: 289차 writeGuard 서버 전역 강제·admin SSOT(`resolveAdminByToken` `UserAuth.php:2998`)·plan fail-secure(`:77`)는 PEP의 Subject Resolution·Deny Projection 실 substrate로 재활용(재플래그 금지).
- **우회 수렴 무후퇴**: 233개소를 급진 삭제하지 않고 Static Lint로 점진 수렴 — 개별 게이트 안전성은 전환 완료까지 유지.

## 6. 완료 게이트

- [ ] 단일 PEP 통과 계약 실 구현(모든 요청 ERRE 통과·SPEC §0)
- [ ] PEP가 Projection(§27) 6 output set 참조·Deny beats Allow(ADR D-4) 강제
- [ ] fail-secure(모호/미인증/스냅샷 부재→거부) 계약 강제
- [ ] 3-게이트 통합·현행 강제력 100% 보존 회귀 검증(무후퇴)
- [ ] 233개소 우회 점진 수렴·Static Lint(§29) 연동
- [ ] Runtime Guard(§28) 8종 연동·Evidence/Audit 기록
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 foundation(Part 1~3-6)·Projection/Snapshot 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §0(모든 접근 제어 엔진 통과)·§1 목표25(Enforcement Contract)·§4(Pipeline)·§19(Evidence)·§27(Projection)·§28(Runtime Guard)·§29(Static Lint)
- ADR D-1(Extend)·D-2(단일 PDP)·D-4(Deny 우선)·D-6(Static Lint 233개소)·D-7(정직·P1~P5 재활용)·§4(무후퇴 병행)
- Ground-Truth ① §2-A(`TeamPermissions.php:236`·`:286`·`:315`)·§2-B(`index.php:82`·`:573`·`:583`·`:587`·`:604`·`:608`)·§2-C(`UserAuth.php:77`·`:364`·`:409`·`:1125`·`:1134`·`:1167`·`:1204`·`:2998`)·§2-D(`PlanPolicy.php:53`)·§4(통합 PDP 부재·직교 병렬)
- Ground-Truth ② §3(하드코딩 authz 233개소)·§2 #10(Guard PARTIAL `writeGuard.js:61`)·§4(`Alerting.php:665`·SecurityAudit = KEEP_SEPARATE)
