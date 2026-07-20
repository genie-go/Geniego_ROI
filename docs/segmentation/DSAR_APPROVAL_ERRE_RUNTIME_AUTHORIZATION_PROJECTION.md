# DSAR — ERRE Runtime Authorization Projection (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §27(Runtime Authorization Projection · 6 output set)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: 단일 PDP·결정적·불변 스냅샷 참조(lock-free) · **반날조**: `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · 289차 확정분 재플래그 금지

---

## 1. 목적

**Runtime Authorization Projection**(SPEC §27)은 ERRE Resolution Pipeline이 산출한 effective 결과를 **런타임이 소비하는 최종 출력 형태(projection)**로 투영한 것이다. SPEC §27 원문이 정의하는 출력은 다음 6개 집합이다.

1. **Effective Role Set** — 최종 활성 role 집합
2. **Effective Permission Set** — 최종 permission 집합
3. **Effective Scope Set** — 최종 데이터 범위 집합
4. **Effective Constraint Set** — 최종 제약 집합
5. **Effective Deny Set** — 최종 거부 집합
6. **Effective Risk Level** — 최종 risk 등급(LOW/MEDIUM/HIGH/CRITICAL)

이 6 출력이 모든 접근 제어 지점(PEP)이 참조하는 canonical 권한 표상이다. 목적은 request-time 라이브 재계산을 **불변 스냅샷 참조(lock-free read path, ADR D-2·SPEC §35)**로 승격해, 결정적·고성능·설명가능한 단일 권한 출력을 제공하는 것이다.

## 2. Ground-Truth (6 output substrate / PARTIAL / ABSENT)

### 2.1 판정 요약 — **PARTIAL (3/6 실존·팀 한정, 나머지 ABSENT·비영속)**

현행 유일한 projection substrate는 `TeamPermissions::effectiveForUser`(`TeamPermissions.php:393`)의 **반환 구조**다. 이는 role/permission/scope를 request-time 산출·반환하나, **팀 도메인 한정**이며 **영속·버전·캐시·스냅샷이 전무**하다(Ground-Truth ② §2 #3·#4 ABSENT). Constraint/Deny는 분산 partial, Risk는 완전 ABSENT.

### 2.2 6 output set substrate 대조표

| # | SPEC §27 출력 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 1 | Effective Role Set | **PARTIAL(팀 한정·비영속)** | `effectiveForUser`(`TeamPermissions.php:393`) role 분기(owner/manager/member)·`effectivePermissions`(`:694`) `$result+['role'=>...]` 반환 — plan/api_key rank 미통합 |
| 2 | Effective Permission Set | **PARTIAL(팀 한정)** | `effectiveForUser`(`:393`)가 menu_key⇒actions 맵 반환·`clampActions`(`:423`) 교집합·`normActions`(`:182`) canonical ordering — 반환만·저장 안 함 |
| 3 | Effective Scope Set | **PARTIAL(팀 한정)** | `effectiveScope`(`:236`) owner→null(무제한)/실패→`__deny__`/user·team 상속·`scopeChannelProduct`(`:315`) 다차원 | — |
| 4 | Effective Constraint Set | **PARTIAL(분산·미통합)** | amount(`Catalog.php:1036`)·MFA(`UserAuth.php:941`)·api_key expires(`Keys.php:99`)·data_scope 제약(`:272`) — 통합 constraint set 부재 |
| 5 | Effective Deny Set | **PARTIAL(센티넬)** | `__deny__`(`:234`→`:286` `AND 1=0`)·member 전역차단(`guardTeamWrite` `UserAuth.php:1167`+`index.php:82`) — negative-ACL 레코드 부재·통합 deny set 없음 |
| 6 | Effective Risk Level | **ABSENT** | role→LOW/MED/HIGH/CRIT 계산기 부재(Ground-Truth ② §2 #7 grep 0). MFA 정적게이트(`UserAuth.php:941`)는 risk-score 없음 |

### 2.3 결정적 부재 — 영속·스냅샷·캐시

- **스냅샷 부재**: `effectiveForUser`(`:393`)는 결과를 **반환만** 하고 immutable snapshot으로 저장하지 않음(Ground-Truth ② §2 #3 ABSENT).
- **캐시 부재**: 매 요청 DB 재조회(`subjectPerms` `:202`·`subjectScope` `:215`), version 기반 캐시 없음(Ground-Truth ② §2 #4 ABSENT).
- 따라서 현행 projection은 **매 요청 라이브 재계산·팀 한정·비영속**으로, SPEC §27이 요구하는 "불변 스냅샷 참조" 출력이 아니다.

### 2.4 KEEP_SEPARATE

- `Risk.php:12`·`:81`·`:91`(churn ML) — Risk Level 출력으로 오흡수 금지(마케팅 이탈예측). #6 Risk Level을 이것으로 채우면 가짜녹색.

## 3. Canonical 설계

### 3.1 Canonical 6 output set 계약

Resolution Pipeline(§4) 최종 단계(Effective Generation→Snapshot→Cache)가 6 output set을 canonical 형태로 확정하고 **immutable snapshot+digest+version**으로 영속한다(SPEC §18·§20). 런타임 PEP는 이 스냅샷을 참조(lock-free read).

| 출력 | 산출 Calculator | 영속 |
|---|---|---|
| Effective Role Set | Effective Role Calculator(§7) — 중복제거+Canonical Ordering | snapshot |
| Effective Permission Set | Effective Permission Calculator(§8) — Deny>Allow·narrow>wide 병합 | snapshot |
| Effective Scope Set | Effective Scope Calculator(§9) — intersection 기본 | snapshot |
| Effective Constraint Set | Effective Constraint Calculator(§10) — time/device/region/amount/API/dataset 통합 | snapshot |
| Effective Deny Set | Effective Deny Calculator(§11) — Explicit/Runtime/Risk/Policy/Environment Deny | snapshot |
| Effective Risk Level | Effective Risk Calculator(§12) — LOW/MED/HIGH/CRIT | snapshot |

### 3.2 결정성·불변성

- **결정적(§35)**: 동일 (Subject+Context+Version) → 동일 6 output 100%.
- **불변 스냅샷(ADR D-2)**: projection은 immutable snapshot으로 영속, 런타임은 참조만. 변경 시 새 version 스냅샷 생성(in-place 수정 금지).
- **lock-free read path(§35)**: 런타임 PEP는 스냅샷을 잠금 없이 읽어 P95≤20ms·Cache Hit≥95% 달성.

## 4. Kernel 매핑 (현행 반환→canonical projection)

| output set | 현행 반환 substrate | 승격 방향 |
|---|---|---|
| Role Set | `effectiveForUser` role(`:393`)·`effectivePermissions`(`:694`) | 팀 한정→plan/api_key 3차원 통합·snapshot 영속 |
| Permission Set | `effectiveForUser` actions map(`:393`)·`normActions`(`:182`) | 라이브 반환→snapshot 참조 |
| Scope Set | `effectiveScope`(`:236`)·`scopeChannelProduct`(`:315`) | 라이브 반환→snapshot 참조 |
| Constraint Set | 분산(`Catalog.php:1036`·`UserAuth.php:941`·`Keys.php:99`·`:272`) | 통합 constraint set 신설 |
| Deny Set | `__deny__`(`:234`)·`guardTeamWrite`(`UserAuth.php:1167`) | negative-ACL 통합 deny set 신설 |
| Risk Level | **ABSENT** | 순신규 Risk Calculator |

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1)**: `effectiveForUser`/`effectiveScope`의 반환 구조를 **파괴하지 않고** canonical 6 output set의 산출 로직으로 승격. 팀 한정을 3차원(plan·api_key·team_role) 통합 PDP로 확장.
- **무후퇴**: projection 통합은 기존 게이트 결과를 바꾸지 않는다 — 동일 권한을 canonical set으로 재표현·영속할 뿐. ERRE 완성까지 현행 라이브 재계산 경로 병행(ADR 무후퇴).
- **lock-free 승격**: 라이브 재계산(매 요청 DB 조회)을 스냅샷 참조로 승격해 성능 개선. 단 스냅샷 무효화(§22)·드리프트(§23)로 정합 유지.
- **KEEP_SEPARATE 유지**: Risk churn ML은 Risk Level 출력으로 흡수 금지.

## 6. 완료 게이트

- [ ] 6 output set canonical 확정·immutable snapshot(§18)+digest(§20)+version 영속
- [ ] Role/Permission/Scope Set = `effectiveForUser` 승격·3차원 통합
- [ ] Constraint Set = 분산 substrate 통합 신설
- [ ] Deny Set = negative-ACL 통합·Explicit Deny>Allow 전역(ADR D-4)
- [ ] Risk Level = 순신규 Effective Risk Calculator(§12)
- [ ] lock-free read path·P95≤20ms·Cache Hit≥95%(§35) 벤치 통과
- [ ] SPEC §32 API `Resolve Effective Roles/Permissions/Scope` 배선
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 foundation(Part 1~3-6)·Snapshot/Cache(별편) 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §27(6 output set)·§7~§12(Calculator)·§18(Snapshot)·§20(Digest)·§22(Cache Invalidation)·§23(Drift)·§32(API)·§35(성능·lock-free)
- ADR D-1(Extend)·D-2(불변 스냅샷·lock-free)·D-4(Deny 우선)·D-7(정직 분리)
- Ground-Truth ① §2-A(`TeamPermissions.php:182`·`:202`·`:215`·`:234`·`:236`·`:272`·`:286`·`:315`·`:393`·`:423`·`:694`)·§2-C(`UserAuth.php:941`·`:1167`)·§2-E(`Keys.php:99`)·§3(deny 센티넬·combine 부재)
- Ground-Truth ② §2 #3(Snapshot ABSENT)·#4(Cache ABSENT)·#7(Risk ABSENT)·#8(Constraint PARTIAL `Catalog.php:1036`)·§4(Risk `:12`/`:81`/`:91` = KEEP_SEPARATE)
- Risk Level은 grep 0 실측 ABSENT — churn ML로 채우기 금지.
