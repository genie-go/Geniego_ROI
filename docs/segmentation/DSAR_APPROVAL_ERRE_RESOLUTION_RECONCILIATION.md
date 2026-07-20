# DSAR — ERRE Resolution Reconciliation (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §25 Reconciliation
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. **★PgSettlement 정산 reconciliation·Connectors roasReconciliation·Wms reconcileChannelStock ≠ resolution reconciliation**(KEEP_SEPARATE). 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Reconciliation**(SPEC §25)은 동일 주체·시점에 대한 **여러 경로의 권한 산출 결과가 일치하는지 대조·정합화**하는 축이다. 단일 PDP·결정론(deterministic)의 무결성을 사후 검증하는 최종 안전망이다.

SPEC §25가 규정하는 비교 대상은 4종이다.

- **Runtime Result** — 런타임에서 실제 적용된 결과
- **Snapshot** — 동결된 기대값(§18)
- **Cached Result** — 캐시가 서빙한 값(§21)
- **Previous Result** — 직전 산출 결과

네 경로가 불일치하면(예: 캐시 stale·스냅샷-런타임 괴리) 정합화·경고·재산출을 통해 단일 진실로 수렴시킨다. Drift(§23)가 "시간에 따른 편차 탐지"라면, Reconciliation은 "동시 다경로 결과의 정합화"다.

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (다경로 대조 로직 부재)

Drift/Revalidation/Reconciliation은 Ground-Truth ② 판정표 #5에서 **ABSENT**로 확정된다.

- **핵심 근거**: effective 권한 조정(reconciliation) 로직 grep 0(Ground-Truth ② §2 #5).
- **비교 4경로 중 3개가 부재**: Runtime Result는 매 요청 재계산(`TeamPermissions.php:393`)으로만 존재하고, Snapshot(§18)·Cached Result(§21)·Previous Result는 전부 ABSENT(Ground-Truth ② §2 #3·#4). 비교할 다경로 자체가 성립하지 않음.
- **단일 경로만 존재**: 현행은 라이브 재계산 한 경로뿐이라 "여러 경로의 결과 대조"라는 개념이 물리적으로 불가능.

### 2.2 실존 substrate (없음·비교 대상 부재)

- effective 결과를 여러 경로로 산출·보관하지 않으므로, Reconciliation이 대조할 substrate 자체가 부재. `effectiveForUser`(`TeamPermissions.php:393`)의 단일 산출값 외에 비교 대상 없음.

### 2.3 ★KEEP_SEPARATE 오흡수 경고 (reconciliation 동음이의 최다 위험 구역)

"reconciliation"은 정산·재고·채널 도메인에 실재하는 단어라 오흡수 위험이 가장 크다. 명확히 분리한다(ADR D-5).

- **`PgSettlement` 정산 reconciliation ≠ resolution reconciliation**(Ground-Truth ② §4). 결제·정산 금액 대사이며 권한 실효 대조가 아님.
- **`Connectors.php:819` roasReconciliation ≠ resolution reconciliation**. 채널 ROAS 데이터 정합(요청당1회 캐시)이며 권한 아님.
- **`Wms` reconcileChannelStock ≠ resolution reconciliation**. 채널 재고 대사이며 권한 아님.
- 위 3종은 전부 데이터·정산·재고 도메인 정합 — ERRE Reconciliation으로 오흡수·개명 금지(가짜녹색 회피).

## 3. Canonical 설계 (`ERRE_RESOLUTION_RECONCILIATION` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | reconciliation_id | 정합화 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수) |
| 3 | subject_ref | 대상 주체 |
| 4 | compared_at | 대조 실행 시각 |
| 5 | runtime_result_digest | 런타임 실적용 결과 digest(§20) |
| 6 | snapshot_expected_digest | 기대값=Snapshot(§18) digest |
| 7 | cached_result_digest | 캐시(§21) 서빙 값 digest |
| 8 | previous_result_digest | 직전 산출 결과 digest |
| 9 | mismatch_set | 불일치 경로·상세 |
| 10 | reconciliation_status | 정합화 상태(③) |
| 11 | resolved_by | 수렴 방식(재산출/캐시무효/스냅샷우선) |

### 3.1 열거형 / 타입

- **compare_target**: RUNTIME · SNAPSHOT · CACHED · PREVIOUS (SPEC §25)
- **reconciliation_status**: MATCHED · MISMATCHED · UNVERIFIABLE (설계 예약)

### 3.2 설계 원칙

- **Drift의 후속 소비자**: Drift(§23)가 산출한 편차를 정본으로 정합화하는 별개 계층 — 탐지와 겸용 금지.
- **digest 동등성 대조**: 4경로를 Digest(§20)로 O(1) 비교. 불일치 시 fail-secure 수렴(가장 좁은 권한·재산출 우선).
- **불변 Snapshot을 진실 기준**: 불일치 시 Snapshot(§18)을 신뢰 기준으로 하되, 정책 변경 미반영이면 Revalidation(§24) 재호출로 새 스냅샷 확정.
- **경고 계약**: Cache Rebuild Required·Resolution Drift(SPEC §31) 방출.
- **Tenant 격리**: 대조는 tenant 경계 내 — cross-tenant 결과 혼입 금지.

### 3.3 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **CACHE_CORRUPTED**(SPEC §30): Cached Result가 Snapshot과 불일치하면 오염 확정·캐시 무효(§22).
- **Cache Rebuild Required / Resolution Drift 경고**(SPEC §31): 다경로 불일치 유형별 경고 방출.
- **RESOLUTION_TIMEOUT**(SPEC §30): 대조·재산출이 성능 한계 초과 시 fail-secure 처리.

### 3.4 API · 인덱스 · 성능 (SPEC §32·§34·§35)

- **API**: Compare Snapshots·Validate Resolution(SPEC §32)로 4경로 digest 대조·정합 상태 반환.
- **인덱스**: Subject·Snapshot·Version 인덱스(SPEC §34)로 각 경로 결과 조회.
- **성능**: 정합화는 주기·이벤트 기반 배치(실시간 판정 경로 밖) — read path P95≤20ms(SPEC §35) 무저해. 다경로 일치율은 Deterministic 100% 검증 지표.

## 4. Kernel 매핑 (4경로 비교 소스)

| 비교 경로(SPEC §25) | 소스 | 최근접 substrate | 판정 |
|---|---|---|---|
| Runtime Result | 라이브 재계산 | `TeamPermissions.php:393` | **PARTIAL**(단일 경로만 존재) |
| Snapshot | 동결 기대값 | — | **BLOCKED_PREREQUISITE**(Snapshot §18 선행) |
| Cached Result | 캐시 서빙 값 | — | **BLOCKED_PREREQUISITE**(Cache §21 선행) |
| Previous Result | 직전 산출 | — | **ABSENT**(이력 비영속) |
| **다경로 대조 자체** | Reconciliation(§25) | — | **ABSENT** |

> Runtime Result만 `effectiveForUser`(`TeamPermissions.php:393`)로 존재하나 나머지 3경로가 부재/선행의존이므로 대조 자체가 성립 불가 — Reconciliation은 Snapshot·Cache 실구현 이후에만 의미를 가진다.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: `effectiveForUser`(`TeamPermissions.php:393`) 라이브 재계산을 Runtime Result 경로로 보존·활용하고, Snapshot/Cache/Previous 경로는 선행 엔진 완성 후 추가. 계산 로직 무변경.
- **KEEP_SEPARATE 엄수**: PgSettlement/Connectors roasReconciliation/Wms reconcileChannelStock(§2.3)의 reconciliation 코드를 **재사용·상속·개명 금지**. 이름이 같아도 권한 전용 정합화 순신규.
- **탐지-정합화 분리**: Drift(§23) 탐지 결과를 소비하는 후속 계층으로만 구현 — 겸용 금지(Part 3-6 Service Reconciliation과 동형 원칙).
- **병행 유지**: 단일 경로(라이브 재계산)만 있는 현재는 불일치가 발생할 수 없으므로 Reconciliation 부재가 회귀를 유발하지 않음 — Snapshot/Cache 도입과 함께 필요.
- **실재 과신 회피(ADR D-7)**: `Connectors` roasReconciliation·`PgSettlement`·`Wms` reconcile은 데이터 정합이지 권한 정합이 아니다 — 이름이 같아도 "이미 권한 reconciliation이 있다"로 오판 금지.
- **부재 과장 회피(ADR D-7)**: resolution reconciliation grep 0은 실측 부재. Runtime Result 경로(`:393`)만 실재하고 나머지 3경로는 선행의존 — "아무것도 없다"가 아니라 "비교 대상이 아직 없다"가 정확한 표현.

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **경로 확보**: Snapshot(§18)·Cache(§21)·Previous 이력 도입으로 4경로 성립.
2. **대조 배치**: 4경로 digest(§20) 주기 대조, 불일치 유형 분류.
3. **수렴 정책**: fail-secure 수렴(재산출/캐시무효/스냅샷우선) 확정, Drift(§23) 후속 소비자로 계층 유지.
- 각 단계는 라이브 경로를 Runtime Result로 보존, 판정 후퇴 없음.

## 6. 완료 게이트

- Reconciliation 4경로(Runtime/Snapshot/Cached/Previous) digest 대조·정합화 구축.
- 불일치 시 fail-secure 수렴(재산출/캐시무효/스냅샷우선) · reconciliation_status(MATCHED/MISMATCHED/UNVERIFIABLE) 확정.
- Drift(§23) 후속 소비자로 계층 분리 · Cache Rebuild Required 경고(SPEC §31).
- PgSettlement/Connectors/Wms reconciliation과 코드·테이블 완전 분리(오흡수 0 회귀 검증).
- Tenant 격리 회귀 0 · 다경로 일치 100%(SPEC §35 Deterministic) 검증.
- **선행 의존**: Snapshot(§18)·Cache(§21)·Digest(§20)·Drift(§23) 전부 선행. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Integration**: 4경로(Runtime/Snapshot/Cached/Previous) 인위적 불일치 주입 시 정확히 MISMATCHED 확정·수렴하는지.
- **Security(Cache Poisoning)**: Cached Result 위조를 Snapshot 대조로 잡아내는지 · fail-secure(가장 좁은 권한) 수렴.
- **Performance(RESOLUTION_TIMEOUT)**: 대조·재산출이 성능 한계 초과 시 안전 처리하는지.
- **분리 검증**: `PgSettlement`/`Connectors`/`Wms` reconciliation과 코드·테이블 완전 분리(오흡수 0).

### 6.2 인접 엔진 경계

Reconciliation은 Drift(§23)의 **후속 소비자**로, Drift가 탐지한 편차를 정본으로 정합화하는 별개 계층이다(겸용 금지, Part 3-6 Service Reconciliation 동형 원칙). 4경로는 Snapshot(§18)·Cache(§21)·Digest(§20) 위에서만 성립하므로 그 이전엔 의미가 없다. 정산·재고·채널 reconciliation은 권한 정합이 아님(§2.3) — 최다 오흡수 위험 구역.

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:393` — 라이브 재계산(유일 Runtime 경로, Ground-Truth ①)
- `backend/src/Handlers/PgSettlement.php`(정산) · `backend/src/Handlers/Connectors.php:819`(roasReconciliation) · `backend/src/Handlers/Wms.php`(reconcileChannelStock) — 전부 **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Reconciliation 거버넌스 로직·비교 경로는 **ABSENT** 또는 **BLOCKED_PREREQUISITE**(grep 0). 실 엔진은 별도 승인세션(RP-track).
