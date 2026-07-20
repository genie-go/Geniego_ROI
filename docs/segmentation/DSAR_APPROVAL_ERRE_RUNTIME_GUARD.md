# DSAR — ERRE Runtime Guard (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §28(Runtime Guard · 차단 8종)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure(모호 시 차단) · 무후퇴 · **반날조**: `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

---

## 1. 목적

**Runtime Guard**(SPEC §28)는 ERRE resolution·enforcement 과정에서 **무결성 위반·권한상승 시도를 매 요청 시점 차단**하는 안전장치다. SPEC §28 원문이 정의하는 차단 항목은 다음 8종이다.

1. **Invalid Graph** — 무효 Resolution Graph
2. **Cyclic Dependency** — 순환 의존(DAG 위반)
3. **Missing Snapshot** — 스냅샷 부재
4. **Missing Version** — 버전 부재
5. **Invalid Policy** — 무효 정책
6. **Unknown Runtime Context** — 미지 런타임 컨텍스트
7. **Permission Escalation** — 권한 상승
8. **Scope Escalation** — 범위 상승

이 8 Guard는 Enforcement Contract(§27·별편)와 결합해 fail-secure를 완성한다. 목적은 resolution 결과가 조작·손상·우회되어 부당 접근이 발생하는 것을 방지하는 것이다. 본 편은 8종 각각을 실 substrate와 대조해 **PARTIAL(#7·8 근접 실재)·ABSENT(#1~6 순신규)**를 정직 판정한다.

## 2. Ground-Truth (8 Guard substrate / PARTIAL / ABSENT)

### 2.1 판정 요약 — **PARTIAL (Guard substrate 실재·Escalation 2종 근접, Graph/Snapshot 계열 ABSENT)**

Ground-Truth ② §2 표 #10: **"Runtime Guard / Static Lint = PARTIAL (Guard만)."** Guard substrate는 실재한다 — `writeGuard.js:61`·`guardTeamWrite`(`UserAuth.php:1167`)·`Wms.php:557`(guardWarehouse)·`Keys.php:99`(scope 권한상승 차단)·`PlanPolicy.php:9`(메뉴 심층방어). 그러나 이들은 **권한상승/scope 차단**에 근접할 뿐, Graph/Snapshot/Version/Context 무결성 차단(#1~6)은 대상 개념 자체가 부재하다(Snapshot #3·Version은 §2 #3 ABSENT·Graph #1·2는 §2 #2 ABSENT).

### 2.2 8 Guard 대조표

| # | SPEC §28 차단 항목 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 1 | Invalid Graph | **ABSENT** | Resolution Graph 자체 부재(Ground-Truth ② §2 #2 grep 0) → 무효 그래프 차단 대상 없음 |
| 2 | Cyclic Dependency | **ABSENT(권한)** | role↔role 순환탐지 부재(§2 #2). menu_tree `wouldCycle`(`AdminMenu.php:504`·`:551`)·PM DFS(`:77~:90`)는 **KEEP_SEPARATE**(비-권한 순환) |
| 3 | Missing Snapshot | **ABSENT** | effective 스냅샷 자체 부재(§2 #3) → 부재 감지 대상 없음. 현행 `effectiveForUser`(`:393`)는 매 요청 재계산 |
| 4 | Missing Version | **ABSENT** | version binding 부재(§2 #12·acl_permission UPDATE in-place·이력 없음) |
| 5 | Invalid Policy | **PARTIAL(근접)** | `requireFeaturePlan`(`UserAuth.php:77`) 미해석 plan→free fail-secure·`minPlanFor`(`PlanPolicy.php:47`) 미정의→'pro' fail-secure — 정책 무효 시 안전 강등이나 통합 policy 검증기 아님 |
| 6 | Unknown Runtime Context | **PARTIAL(근접)** | `GENIE_STRICT_AUTH`(`index.php:604`) 무-tenant→403(모호 시 deny, 기본 OFF)·X-Tenant-Id 위조차단 주입(`:608`) — 통합 Runtime Context 부재 |
| 7 | Permission Escalation | **PARTIAL(실재)** | `Keys.php:99`(클라 scopes>상한→422 권한상승 차단)·`clampActions`(`TeamPermissions.php:423` want∩cap)·`putMemberPermissions`(`:641` assignable 초과→403 DELEGATION_EXCEEDED) |
| 8 | Scope Escalation | **PARTIAL(실재)** | `scopeWithinCap`(`TeamPermissions.php:356` 요청 scope⊆manager scope·교차차원/무제한/전사=fail-closed)·`__deny__`(`:234`→`:286`)·member 전역 read-only(`guardTeamWrite` `UserAuth.php:1167`) |

### 2.3 Guard substrate 정리

- **#7·8(Escalation)**: **실재·근접**. api_key scope 상한(`Keys.php:99`)·team scope cap(`scopeWithinCap` `:356`)·action clamp(`clampActions` `:423`)·위임 상한(`putMemberPermissions` `:641`)이 권한/범위 상승을 기능적으로 차단. 단 팀/api_key 차원 한정.
- **#5·6(Policy/Context)**: **부분 근접**. fail-secure 강등(`requireFeaturePlan` `:77`)·모호 deny(`index.php:604`)는 존재하나 통합 검증기 아님.
- **#1~4(Graph/Snapshot/Version)**: **완전 ABSENT**. 대상 개념(그래프·스냅샷·버전) 자체가 순신규이므로 차단 대상이 존재하지 않음. 날조 금지.

### 2.4 KEEP_SEPARATE — 비-권한 Guard/순환탐지 (오흡수 금지)

- `AdminMenu.php:504`·`:551`(`wouldCycle`) — menu_tree 순환탐지. **#2 Cyclic Dependency로 오흡수 금지**(비-권한 그래프).
- `PM/Dependencies.php:77`~`:90`(task DFS) — PM 순환탐지. **권한 아님.**
- `Wms.php:557`(guardWarehouse) — 창고 접근 가드로 Guard 계열 substrate이나, WMS 도메인 특화 게이트(EXISTING §참조). Escalation 근접 substrate로만 참조하고 ERRE Guard로 개명·통합 금지.
- `Risk.php:12`·`:81`·`:91`(churn ML) — Risk 기반 차단으로 오흡수 금지.

## 3. Canonical 설계

### 3.1 8 Guard 발동 계약

Runtime Guard는 Enforcement Contract(§27) PEP 통과 시 매 요청 발동. 위반 시 대응 Error(§30) 반환·차단.

| Guard | 발동 조건 | 대응 Error(§30) |
|---|---|---|
| Invalid Graph | Resolution Graph 구조 무효 | `INVALID_RESOLUTION_GRAPH` |
| Cyclic Dependency | Hierarchy/Composite 엣지 순환 | `INVALID_RESOLUTION_GRAPH` |
| Missing Snapshot | subject 스냅샷 부재 | `ROLE_RESOLUTION_FAILED` |
| Missing Version | 스냅샷 version 부재 | `ROLE_RESOLUTION_FAILED` |
| Invalid Policy | 정책 평가 실패 | `POLICY_EVALUATION_FAILED` |
| Unknown Runtime Context | 미지 컨텍스트 | `INVALID_RUNTIME_CONTEXT` |
| Permission Escalation | effective 초과 권한 요청 | 차단(403) |
| Scope Escalation | cap 초과 scope 요청 | 차단(403) |

### 3.2 fail-secure 원칙

- 모호·판정불가·스냅샷/버전 부재 → **차단 우선**(ADR D-4·D-7 UNKNOWN 거부).
- Escalation(#7·8)은 현행 clamp/cap 로직을 전역 Guard로 승격 — 팀/api_key 한정을 3차원 통합.

## 4. Kernel 매핑 (현행 Guard→8 Guard)

| §28 Guard | 승격 대상 substrate | 판정 |
|---|---|---|
| Invalid Graph(#1) | **ABSENT**(Graph 순신규) | 신규 |
| Cyclic Dependency(#2) | **ABSENT**(menu_tree wouldCycle=KEEP_SEPARATE) | 신규 |
| Missing Snapshot(#3) | **ABSENT**(Snapshot 순신규) | 신규 |
| Missing Version(#4) | **ABSENT**(version binding 순신규) | 신규 |
| Invalid Policy(#5) | `requireFeaturePlan`(`UserAuth.php:77`)·`minPlanFor`(`PlanPolicy.php:47`) fail-secure | 승격 |
| Unknown Runtime Context(#6) | `GENIE_STRICT_AUTH`(`index.php:604`)·`:608` | 승격 |
| Permission Escalation(#7) | `Keys.php:99`·`clampActions`(`:423`)·`putMemberPermissions`(`:641`) | 승격(3차원 통합) |
| Scope Escalation(#8) | `scopeWithinCap`(`:356`)·`__deny__`(`:234`)·`guardTeamWrite`(`UserAuth.php:1167`) | 승격(3차원 통합) |

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1·D-7)**: Escalation Guard(#7·8)는 현행 `scopeWithinCap`·`clampActions`·`Keys.php:99` scope 상한을 **삭제·재구현하지 않고** 전역 Runtime Guard로 승격. 현행 차단력 100% 보존.
- **부재 정직(ADR D-7)**: #1~4는 대상 개념(Graph/Snapshot/Version) grep 0 실측 ABSENT — "숨겨진 구현"으로 과장 금지. menu_tree wouldCycle을 #2로 오흡수 금지.
- **무후퇴**: 8 Guard 도입은 현행 게이트를 대체하지 않고 통합 fail-secure 레이어로 추가. ERRE 완성까지 개별 Guard(writeGuard·guardTeamWrite·guardWarehouse) 병행.
- **P1~P5 재활용**: 289차 writeGuard 서버 전역 강제는 #7·8 Escalation Guard의 실 substrate로 재활용(재플래그 금지).
- **KEEP_SEPARATE 유지**: menu_tree wouldCycle·PM DFS·guardWarehouse·Risk ML은 각 도메인 존치.

## 6. 완료 게이트

- [ ] 8 Guard 발동 계약·대응 Error(§30) 실 구현
- [ ] Escalation Guard(#7·8) = 현행 clamp/cap 승격·3차원 통합·현행 차단력 보존 회귀
- [ ] Policy/Context Guard(#5·6) = fail-secure 승격·통합 검증기
- [ ] Graph/Snapshot/Version Guard(#1~4) = 선행 Graph/Snapshot 실구현 후 신규
- [ ] fail-secure(모호→차단)·UNKNOWN 거부 계약
- [ ] KEEP_SEPARATE(menu_tree wouldCycle/PM DFS/guardWarehouse/Risk ML) 미흡수 회귀
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 Graph(§5)·Snapshot(§18)·Version 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §28(Runtime Guard 8종)·§5(Graph)·§18(Snapshot)·§27(Projection)·§30(Error Contract)
- ADR D-1(Extend)·D-4(Deny/fail-secure)·D-5(KEEP_SEPARATE)·D-7(정직·P1~P5 재활용)
- Ground-Truth ① §2-A(`TeamPermissions.php:234`·`:286`·`:356`·`:393`·`:423`·`:641`)·§2-B(`index.php:604`·`:608`)·§2-C(`UserAuth.php:77`·`:1167`)·§2-D(`PlanPolicy.php:9`·`:47`)·§2-E(`Keys.php:99`)
- Ground-Truth ② §2 #2(Graph/Cycle ABSENT)·#3(Snapshot ABSENT)·#10(Guard PARTIAL·`writeGuard.js:61`·`Wms.php:557`)·#12(version 부재)·§4(`AdminMenu.php:504`/`:551`·`PM/Dependencies.php:77~:90`·`Risk.php:12`/`:81`/`:91` = KEEP_SEPARATE)
- #1~4는 grep 0 실측 ABSENT — 비-권한 Guard로 채우기 금지.
