# DSAR — ERRE: 해석 최적화기 (APPROVAL_ROLE_RESOLUTION_OPTIMIZER)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_OPTIMIZER`**(SPEC §1(7)·§15) — ERRE 해석 결과의 **최적화기** — 를 명세한다.

SPEC §15(L336~341) 최적화 대상:

1. Duplicate Removal
2. Permission Merge
3. Scope Compression
4. Graph Optimization
5. Cache Reuse
6. Incremental Evaluation

Optimizer는 Effective Role/Permission/Scope 계산 결과에서 중복을 제거하고, 권한을 병합하며, scope를 압축하고, 그래프 순회·캐시 재사용·증분 평가로 비용을 절감한다. 이는 SPEC §35 성능 계약(P95≤20ms·Cache Hit≥95%·Lock-Free Read Path)의 실현 수단이다.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 통합 Optimizer = ABSENT

Ground-Truth ② #1(L27)이 실측: `Optimizer` 백엔드 실코드 0. 6개 최적화를 통합 담당하는 Optimizer는 부재하다. 그러나 개별 최적화 **primitive**는 `TeamPermissions`에 분산 실재한다(아래 PARTIAL).

### 2.2 최적화 primitive substrate (PARTIAL·분산)

| SPEC §15 항목 | 현행 substrate (`파일:라인`) | 판정 |
|---|---|---|
| Duplicate Removal | `normActions()` `TeamPermissions.php:182`(`$set[$a]=true` 해시 dedupe) · `Keys.php:99` `array_unique`(:102) | PARTIAL(국소) |
| Permission Merge | 명시적 combine/merge 함수 **부재**. 결합은 `effectiveForUser`(`:393`) 내부 인라인(role분기+clamp+scope상속)·`$result + ['role'=>...]`(`effectivePermissions:694`)가 유일 merge 유사 | ABSENT(통합 merge) |
| Scope Compression | `clampActions()` `:423`(want∩cap) · `scopeWithinCap()` `:356`(부분집합 검증) · intersection clamp | PARTIAL(clamp만) |
| Graph Optimization | ABSENT(Resolution Graph 자체 부재) | ABSENT |
| Cache Reuse | ABSENT(권한계산 캐시 0·매요청 재조회 `:202`·`:215`) | ABSENT |
| Incremental Evaluation | ABSENT(증분 평가 없음·전체 재계산) | ABSENT |

### 2.3 canonical ordering

`normActions()`(`TeamPermissions.php:182`)가 ACTIONS 정의순 재정렬(결정적·view 선두)하나, cross-차원(plan/role/scope) 간 canonical evaluation ordering은 부재(Ground-Truth ① §3 L120). Duplicate Removal 후 Canonical Ordering(SPEC §7 L213)은 팀 action 차원만 PARTIAL.

### 2.4 종합

6개 최적화 중 **PARTIAL 2(Duplicate Removal·Scope Compression) · ABSENT 4(Permission Merge·Graph Opt·Cache Reuse·Incremental).** dedupe·clamp primitive는 국소 존재하나 통합 Optimizer는 순신규.

### 2.5 KEEP_SEPARATE

- `PriceOpt::simulate`·`AdminGrowth.php:1239`(campaign simulate)·`CustomerAI`(mode:simulated)의 최적화/시뮬레이션은 **비-권한**(Ground-Truth ② §4). Optimizer substrate로 인용 금지.
- `ModelMonitor`(model drift)·`PgSettlement`(정산 reconciliation)의 최적화류도 KEEP_SEPARATE.

---

## 3. Canonical 설계 (6대 최적화·결정성 보존)

### 3.1 최적화 계약

- **Duplicate Removal**: Effective Role/Permission 집합 중복 제거 후 Canonical Ordering(SPEC §7 L213) 적용. 현행 `normActions` dedupe를 전역 유틸로 승격.
- **Permission Merge**: Explicit Deny > Allow · Narrow Scope > Wide Scope · Runtime Constraint > Static Constraint(SPEC §8 L230~232) 규칙으로 병합. **신규 통합 merge 함수** — 현행 인라인 결합 대체가 아닌 승격.
- **Scope Compression**: Intersection 기본(SPEC §9 L246)·`scopeWithinCap` 부분집합 계승.
- **Graph Optimization / Cache Reuse / Incremental Evaluation**: Resolution Graph·Cache 신설 후 순신규.

### 3.2 결정성 불변 (ADR D-2·SPEC §16)

- 모든 최적화는 결정성을 **보존**해야 한다 — 최적화 전후 effective 결과가 의미적으로 동일(동일 입력→동일 출력 100%, SPEC §35).
- 최적화는 성능만 개선하고 authorization 결과를 바꾸지 않는다(무후퇴·의미 불변).

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

Optimizer는 Effective Role Generation(§4-14)·Effective Permission Generation(§4-15) 산출물에 적용되며, Snapshot Generation(§4-16)·Cache Generation(§4-17) 전에 결과를 정규·압축한다. Planner(SPEC §1-6)의 계획을 받아 실제 비용 절감을 수행하며, Executor(SPEC §16) 실행 경로에 통합된다.

---

## 5. 무후퇴·Extend 원칙

- ADR D-1: 현행 dedupe/clamp primitive(`normActions:182`·`clampActions:423`·`scopeWithinCap:356`·`Keys.php:99` array_unique)를 **파괴하지 않고** Optimizer의 Duplicate Removal·Scope Compression 구현체로 승격.
- ADR D-4: Permission Merge는 국소 `__deny__` 센티넬(`:234`)을 전역 "Deny > Allow" 규칙으로 승격 — 대체가 아닌 확장.
- 무후퇴: 최적화 의미 불변 — authorization 결과 후퇴 금지.

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37에 Optimizer 전용 항목은 없으나, Performance Benchmark 통과(SPEC §35)·"Cache 구축"의 실질 수단.
- Unit Test(SPEC §36) "Optimizer" 항목 통과 필수. Performance Test "Incremental Cache Refresh" 검증.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `TeamPermissions.php`: `:182`(normActions dedupe·ordering) · `:234`(DENY_SCOPE 센티넬) · `:356`(scopeWithinCap) · `:393`(effectiveForUser 인라인 결합) · `:423`(clampActions intersection) · `:694`(effectivePermissions merge 유사)
- `Keys.php:99`(array_unique dedupe·:102)
- KEEP_SEPARATE(비-권한, 인용 아님): `PriceOpt`(simulate) · `AdminGrowth.php:1239`(campaign simulate) · `CustomerAI`(simulated) · `ModelMonitor`(drift) · `PgSettlement`(정산 reconciliation)

**판정 요약: APPROVAL_ROLE_RESOLUTION_OPTIMIZER = ABSENT(통합 Optimizer). 6대 최적화 중 PARTIAL 2(dedupe·clamp primitive)·ABSENT 4. Permission Merge·Graph Opt·Cache Reuse·Incremental은 순신규 그린필드.**
