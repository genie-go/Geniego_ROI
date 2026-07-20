# DSAR — ERRE Effective Result Dedupe & Canonical Ordering (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §7·§8
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-2·D-1·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_EFFECTIVE_ROLE` · `APPROVAL_EFFECTIVE_PERMISSION`

---

## 1. 목적

본 DSAR은 ERRE Effective Role Calculator(SPEC §7)와 Effective Permission Calculator(SPEC §8)의 **결과 중복 제거(dedupe) + Canonical Ordering** 거버넌스 계약을 정의한다. SPEC §7은 "최종 결과는 중복 제거 후 Canonical Ordering 적용"을, SPEC §8은 Permission Merge Rule(Explicit Deny > Allow·Narrow Scope > Wide Scope·Runtime Constraint > Static Constraint)을 요구한다.

Canonical Ordering·dedupe는 **결정성(determinism·ADR D-2)의 필수 전제**다. 동일 입력이 항상 동일 순서·동일 집합의 effective role/permission을 산출해야 Snapshot·Digest·Cache가 안정적으로 일치한다. GeniegoROI에는 이 규칙이 **팀 permission 차원에 한정된 PARTIAL substrate**(`normActions`·`array_unique`)로 실재하나, cross-차원(plan/role/scope) 통합 canonical ordering은 부재하다.

## 2. Ground-Truth 판정

### 2.1 실존 substrate (PARTIAL — Ground-Truth ① §2.A·E, §3)

| 파일:라인 | 역할 | dedupe/ordering 성격 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:182` | `normActions()` — 입력→ACTIONS 부분집합 정렬(ACTIONS 정의순), 비어있지 않으면 view 자동포함, `$set[$a]=true` 해시 dedupe | **canonical ordering + dedupe(팀 permission)** | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:39` | `ACTIONS` 8동작 상수(view..manage) — 정렬 기준 vocabulary | ordering 기준 | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:194` | `actionsCover()` — manage 슈퍼셋 판정 | 정규화 보조 | PRESENT |
| `backend/src/Handlers/Keys.php:99` | 클라 scopes 상한 교차검증 + `array_unique`(:102) dedupe | scope dedupe(api_key) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:694` | `effectivePermissions()` — `$result + ['role'=>...]` 유일한 merge 유사 | merge(부분) | PARTIAL |

**결합 로직 실측**(Ground-Truth ① §3):
- **canonical ordering PARTIAL**: `normActions()`(`:182`)가 ACTIONS 정의순으로 재정렬(결정적·view 선두). 그러나 **cross-차원(plan/role/scope) 간 canonical evaluation ordering 부재**.
- **dedupe PRESENT**: `normActions`의 `$set[$a]=true` 해시(`:182`)·`Keys.php:99` `array_unique`. 단 **전역 dedupe 유틸 부재**.
- **combine/merge 함수**: 명시적 명명 함수 **부재**. 결합은 `effectiveForUser`(`:393`) 내부 인라인. `$result + ['role'=>...]`(`effectivePermissions:694`)가 유일한 merge 유사.

### 2.2 부재 (ABSENT — Ground-Truth ① §3, ② 표 #3)

- **cross-차원 canonical ordering 부재**: plan·api_key·team_role 차원을 가로지르는 결정적 평가 순서 없음.
- **전역 dedupe 유틸·combine 함수 부재**: 도메인별 인라인만.
- **Digest 안정성 전제 부재**: canonical 정규화 없이는 Snapshot/Digest(SPEC §20) 해시 불안정.

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4)

없음(본 엔티티는 순수 정규화 로직). 단, `GraphScore`/`ChannelRegistry`의 정렬·dedupe는 마케팅 도메인이므로 인용 금지.

## 3. Canonical 설계

### 3.1 Effective Role Calculator dedupe+ordering (SPEC §7)

계산 대상(SPEC §7): Assigned·Expanded·Composite·Dynamic·Temporary·Emergency·Delegated·Service Roles.

```
EFFECTIVE_ROLE_SET (canonical) {
  roles      : [ 정규화·정렬·중복제거된 role 목록 ]
  ordering   : 결정적 정렬 키 (rank desc → name asc 등 고정 규칙)
  dedupe_by  : (role_id, source) 정규화 키
}
```

최종 결과는 **중복 제거 후 Canonical Ordering 적용**(SPEC §7). 동일 role이 여러 소스(direct/group/composite)에서 오면 하나로 병합하되 evidence는 소스별 보존(Explain).

### 3.2 Effective Permission Calculator merge+ordering (SPEC §8)

계산 대상: Direct·Inherited·Composite·Dynamic·Runtime·Service Permission.

**Permission Merge Rule**(SPEC §8):
1. **Explicit Deny > Allow** — Deny Calculator(ADR D-4) 정합.
2. **Narrow Scope > Wide Scope** — Scope Calculator intersection 정합.
3. **Runtime Constraint > Static Constraint** — Constraint Calculator 정합.

`normActions()`(`TeamPermissions.php:182`)의 ACTIONS 정의순 정렬·view 자동포함·해시 dedupe를 **canonical ordering 구현체로 승격**하고, action vocabulary(`ACTIONS`(`:39`))를 cross-차원 정렬 기준으로 확장.

### 3.3 결정성 보장 (ADR D-2)

- **고정 정렬 키**: role은 (rank, name), permission은 (menu_key, ACTIONS 정의순)으로 고정 — 입력 순서 무관 동일 출력.
- **정규화 후 Digest**: canonical 정규화가 끝난 집합만 Digest(SPEC §20) 입력 → 동일 effective → 동일 해시 → Cache/Snapshot 일치.
- **전역 dedupe 유틸 신설**: 현행 도메인별 인라인(`$set[$a]=true`·`array_unique`)을 단일 정규화 유틸로 통합.

### 3.4 Digest 안정성과의 결합 (SPEC §20·§25)

Canonical ordering·dedupe는 Digest Engine(SPEC §20)의 **선결 조건**이다. 정규화되지 않은 집합은 원소 순서에 따라 다른 해시를 내므로 Cache 오적중·Reconciliation(SPEC §25) 오차이를 유발한다. 따라서 본 계산기는 Digest 입력 직전 반드시 canonical 정규화를 강제한다:
1. role/permission 집합을 고정 정렬 키로 정렬.
2. dedupe(정규화 키 기준).
3. 정규화 결과만 Digest·Snapshot·Cache 키로 사용.

### 3.5 Explain·Error·Warning (SPEC §17·§30·§31)

- **Explain**(SPEC §17): 병합·중복제거로 사라진 항목의 근거를 evidence로 보존(어떤 소스가 dedupe되었는지).
- **Error**(SPEC §30): 정렬 기준(vocabulary) 누락 시 `ROLE_RESOLUTION_FAILED`. 캐시 해시 불일치 시 `CACHE_CORRUPTED`.
- **Warning**(SPEC §31): canonical 규칙 변경으로 재빌드 필요 시 `Cache Rebuild Required`.

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격 대상 |
|---|---|---|
| 11. Permission Projection | action 정규화·정렬 | `normActions()`(`:182`)·`ACTIONS`(`:39`) |
| 14. Effective Role Generation | role dedupe+ordering | (전역 유틸 신설) |
| 15. Effective Permission Generation | permission merge+ordering | `normActions`·`actionsCover`(`:194`) |
| 16. Snapshot / 17. Cache | 정규화 후 안정 해시 | `array_unique`(`Keys.php:102`) |

SPEC §15 Resolution Optimizer(Duplicate Removal·Permission Merge)와 직접 연동. SPEC §20 Digest 입력의 전제.

### 4.1 Optimizer·Cache 계약 (SPEC §15·§21)

- **Optimizer**(SPEC §15): Duplicate Removal·Permission Merge·Scope Compression은 본 계산기의 canonical 정규화를 재사용한다. `normActions`(`:182`)의 해시 dedupe가 Duplicate Removal의 부분 선행 구현.
- **Cache**(SPEC §21): canonical 정규화가 안정적이어야 Effective Role/Permission Cache 키가 결정적. 정규화 불안정=Cache Hit 저하(SPEC §35 ≥ 95% 미달 위험).

## 5. 무후퇴 · Extend (ADR D-1·D-2·D-7)

- **Extend-only**: `normActions()`(`:182`)의 결정적 정렬·view 선두·해시 dedupe와 `array_unique`(`Keys.php:102`)를 파괴하지 않고 전역 canonical ordering/dedupe 유틸의 구현체로 승격. `ACTIONS`(`:39`) vocabulary를 정렬 기준으로 확장.
- **실재 과신 회피**(D-7): `normActions`는 팀 permission 차원 한정 정렬이다. cross-차원 canonical ordering으로 오판 금지. combine 함수는 부재(인라인만).
- **부재 과장 회피**(D-7): 전역 dedupe 유틸·cross-차원 ordering grep 0은 실측 부재.
- **병행 유지**: 현행 `normActions`·`array_unique` 팀/api_key 정규화는 유지·병행. view 자동포함·정의순 정렬 시맨틱 보존.

## 6. 완료 게이트

1. Effective Role/Permission 결과가 dedupe 후 canonical ordering 적용(SPEC §7·§8).
2. Permission Merge Rule 3원(deny>allow·narrow>wide·runtime>static) 강제(SPEC §8·ADR D-4).
3. 입력 순서 무관 동일 출력(deterministic 100%·SPEC §35).
4. 정규화 후 Digest 안정 — 동일 effective→동일 해시(SPEC §20).
5. 전역 dedupe/ordering 유틸이 팀·api_key·plan 차원 통합.
6. Regression: 현행 `normActions`(view 선두·정의순)·`array_unique` 100% 무후퇴(SPEC §36).
7. Cache Hit ≥ 95%(canonical 안정성 전제·SPEC §35).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: 입력 순서 셔플 후 동일 출력·`normActions`(`:182`) view 자동포함·ACTIONS 정의순 정렬·해시 dedupe.
- **Integration**: role/permission cross-차원 통합 정렬, 정규화→Digest→Cache 키 일치, `array_unique`(`Keys.php:102`) 승계.
- **Performance**: 1M permission projection에서 정규화 오버헤드가 P95 ≤ 20ms 유지(SPEC §35).
- **Regression**: 현행 `normActions`(view 선두)·`Keys` array_unique 출력 100% 동일.
- **Security**: 정규화 우회를 통한 permission 중복 삽입(cache poisoning) 차단(SPEC §36).

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0.

## 7. 반날조 인용 출처

- `TeamPermissions.php:39·:182·:194·:393·:694`·`Keys.php:99·:102` — Ground-Truth ① §2.A·E·§3
- SPEC §4·§7·§8·§15·§20·§35·§36
- ADR D-1(Extend)·D-2(deterministic 전제)·D-4(deny>allow merge)·D-7(정직 분리)
- (KEEP_SEPARATE 인용 없음 — 순수 정규화 로직)

**요약**: Canonical Ordering/Dedupe = PARTIAL-substrate(`normActions` 팀 permission 결정적 정렬+view 선두+해시 dedupe·`array_unique` api_key) / ABSENT-governance(cross-차원 canonical ordering·전역 dedupe/combine 유틸 순신규). determinism·Digest 안정의 필수 전제. Extend-only. 코드 0·NOT_CERTIFIED·선행의존.
