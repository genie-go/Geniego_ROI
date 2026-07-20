# DSAR — ERRE Resolution Drift Detection (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §23 Drift Detection
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. **★ModelMonitor의 model drift ≠ resolution drift**(KEEP_SEPARATE). 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Drift Detection**(SPEC §23)은 effective 권한이 **의도한 정책과 시간에 따라 벌어지는 편차(drift)를 탐지**하는 축이다. 정책·assignment는 그대로인데 실효 권한이 달라지거나, 반대로 정책은 변했는데 실효 권한이 따라가지 못한 상태를 조기 발견해 권한 상승·미회수를 막는다.

SPEC §23이 규정하는 Drift 탐지 대상은 5종이다.

- **Effective Role Drift** — 실효 role 집합의 예기치 않은 변화
- **Effective Permission Drift** — 실효 permission 편차
- **Scope Drift** — 실효 scope 축소/확장 편차
- **Runtime Drift** — 런타임 컨텍스트 기반 실효 권한 편차
- **Policy Drift** — 정책 변경 대비 실효 반영 지연/불일치

Drift는 "탐지"만 담당하고, 탐지된 편차를 정합화하는 것은 Reconciliation(별편 §25)의 몫이다(둘은 별개 계층).

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (드리프트 탐지 로직 부재)

Drift/Revalidation/Reconciliation은 Ground-Truth ② 판정표 #5에서 **ABSENT**로 확정된다.

- **핵심 근거**: effective 권한 드리프트·재검증·조정 로직 grep 0(Ground-Truth ② §2 #5).
- **비교 기준선 부재**: drift는 "기준 스냅샷 vs 현재 재계산"의 diff인데, 기준이 될 Snapshot(§18)·Digest(§20)가 ABSENT(Ground-Truth ② §2 #3)이므로 비교 자체가 불가능.
- **매 요청 재계산으로 은폐**: 항상 최신 재계산이므로 "예전 값과의 편차"라는 개념이 성립하지 않음 — 편차를 관측할 시계열 데이터가 없다.

### 2.2 실존 substrate (재클램프 = 편차 발생 지점·탐지 아님)

- `reclampTeamMembers`(`TeamPermissions.php:809`)는 팀권한 축소 시 멤버 권한을 재클램프 — 이는 편차를 **발생시키는(교정하는) write**이지 편차를 **탐지하는** 로직이 아니다.
- `effectiveForUser`(`TeamPermissions.php:393`)는 매 호출 최신값 산출 — 이전 산출과 비교하지 않음.

### 2.3 ★KEEP_SEPARATE 오흡수 경고 (drift 동음이의 최다 위험 구역)

"drift"라는 단어가 ML 도메인에 실재하여 오흡수 위험이 가장 크다. 명확히 분리한다(ADR D-5).

- **`ModelMonitor`의 model drift ≠ resolution drift**(Ground-Truth ② §4). 모델 예측 분포 편차(재학습 트리거)이며 권한 실효 편차와 무관. ERRE Drift로 오흡수 금지.
- `Risk.php:12`·`:81`·`:91`(churn/policy ML 예측·probability·drivers)은 **role 입력이 아니다**(Ground-Truth ② §4). "policy" 문자열이 겹치나 마케팅 churn 정책 ML이며 권한 정책 drift 아님.
- `AnomalyDetection`·`Decisioning`·`RuleEngine`(channel_roas/sku_stock)의 이상탐지·편차는 커머스/마케팅 도메인 — 권한 resolution drift 아님.
- `Connectors`(roasReconciliation)·`Wms`(reconcileChannelStock)·`PgSettlement`의 정합/편차는 데이터·정산 도메인.

## 3. Canonical 설계 (`ERRE_RESOLUTION_DRIFT` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift_id | 드리프트 탐지 레코드 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수) |
| 3 | subject_ref | 대상 주체 |
| 4 | drift_type | 5종 드리프트(③) |
| 5 | baseline_snapshot_ref | 비교 기준 Snapshot(§18) |
| 6 | current_digest | 현재 재계산 결과 digest(§20) |
| 7 | diff | 편차 상세(추가/제거된 role·permission·scope) |
| 8 | severity | 편차 심각도(권한 상승 여부 가중) |
| 9 | detected_at | 탐지 시각 |
| 10 | reconciliation_ref | 후속 Reconciliation(§25) 연결 |

### 3.1 열거형 / 타입

- **drift_type**: EFFECTIVE_ROLE · EFFECTIVE_PERMISSION · SCOPE · RUNTIME · POLICY (SPEC §23)

### 3.2 설계 원칙

- **탐지 전용**: Drift는 편차를 확정·경고할 뿐 교정하지 않음. 교정은 Reconciliation(§25) — 겸용 금지.
- **digest 비교 기반**: baseline Snapshot digest(§20) vs 현재 재계산 digest 동등성으로 O(1) 판정. 불일치 시 상세 diff 산출.
- **권한 상승 가중**: role/scope 확장 방향 편차는 축소 방향보다 severity 상향(fail-secure 관점).
- **경고 계약**: Resolution Drift 경고(SPEC §31 Warning Contract) 방출.
- **Tenant 격리**: 편차 비교는 tenant 경계 내.

### 3.3 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **Resolution Drift 경고**(SPEC §31): 편차 확정 시 방출 — Reconciliation(§25)·access review로 라우팅.
- **Policy Updated / Scope Narrowed 경고**(SPEC §31): 정책 변경 대비 실효 편차, scope 축소 편차 구분 방출.
- **Permission/Scope Escalation**(SPEC §28 Runtime Guard): 권한 상승 방향 편차는 Guard 차단 대상과 연동(severity CRITICAL).

### 3.4 API · 인덱스 · 성능 (SPEC §32·§34·§35)

- **API**: Compare Snapshots(SPEC §32)로 baseline vs 현재 Diff(Permission/Scope/Risk/Conflict Diff) 반환.
- **인덱스**: Subject·Snapshot·Version 인덱스(SPEC §34)로 baseline 조회 O(log n).
- **성능**: 드리프트 탐지는 배치·주기 실행 가능(실시간 판정 경로 밖) — read path P95≤20ms(SPEC §35)를 저해하지 않음.

## 4. Kernel 매핑 (드리프트 비교 소스)

| Drift 축(SPEC §23) | 비교 소스 | 최근접 substrate | 판정 |
|---|---|---|---|
| Effective Role Drift | baseline vs 현재 role | `TeamPermissions.php:393` | **ABSENT**(baseline 부재) |
| Effective Permission Drift | baseline vs 현재 permission | `TeamPermissions.php:423` | **ABSENT**(baseline 부재) |
| Scope Drift | baseline vs 현재 scope | `TeamPermissions.php:236`·`:809` | **PARTIAL**(재클램프=발생지점·탐지 아님) |
| Runtime Drift | 컨텍스트 기반 편차 | `index.php:608` | **ABSENT** |
| Policy Drift | 정책 변경 대비 실효 | `PlanPolicy.php:19` | **ABSENT**(정책 이력·버전 부재) |
| **드리프트 탐지 자체** | Drift(§23) | — | **ABSENT** |

> Scope Drift의 유일 근접물 `reclampTeamMembers`(`TeamPermissions.php:809`)는 팀권한 축소를 멤버에 **전파(교정)**하는 write이지 드리프트 탐지가 아니다 — 탐지 계층은 순신규.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: `reclampTeamMembers`(`:809`)의 재클램프 이벤트를 파괴하지 않고, 그 발생을 **드리프트 시그널로 관측**하는 계층을 추가. 재클램프 로직 자체는 무변경.
- **KEEP_SEPARATE 엄수**: ModelMonitor/Risk/AnomalyDetection의 drift/anomaly 코드를 **재사용·상속 금지**(§2.3). 이름이 겹쳐도 권한 drift 전용 로직 순신규(가짜녹색 회피).
- **탐지-교정 분리**: Drift는 탐지만, Reconciliation(§25)이 교정 — 두 편이 한 함수로 겸용되지 않도록 계층 분리.
- **병행 유지**: Snapshot/Cache 도입 후에야 baseline이 생기므로, 그 전까지 drift는 관측 대상이 없음(회귀 없음).
- **실재 과신 회피(ADR D-7)**: `reclampTeamMembers`(`:809`)는 편차를 교정하는 write이지 탐지가 아니다 — "이미 drift를 잡는다"로 오판 금지.
- **부재 과장 회피(ADR D-7)**: resolution drift grep 0은 실측 부재. `ModelMonitor`/`Risk`의 drift 코드가 존재해도 권한 drift가 아님(§2.3).

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **baseline 확보**: Snapshot(§18)·Digest(§20) 도입으로 비교 기준선 생성.
2. **탐지 배치**: baseline vs 현재 재계산 digest를 주기 비교해 편차 확정(판정 무변경).
3. **정합 연계**: 확정 편차를 Reconciliation(§25)으로 라우팅, 권한 상승 방향 우선 처리.
- 각 단계는 관측·경고만 추가하며 판정 경로 불변.

## 6. 완료 게이트

- Drift Detection 5종(Role/Permission/Scope/Runtime/Policy) 편차 탐지 구축.
- baseline Snapshot(§18) digest(§20) vs 현재 재계산 digest 비교로 편차 확정 · 권한 상승 방향 severity 가중.
- Resolution Drift 경고 계약(SPEC §31) 방출 · Reconciliation(§25) 연계.
- ModelMonitor/Risk drift와 코드·테이블 완전 분리(오흡수 0 회귀 검증).
- Tenant 격리 회귀 0.
- **선행 의존**: baseline = Snapshot(§18)·Digest(§20) 선행 필수. Reconciliation(§25) 연계. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Security(Permission/Scope Escalation)**: 권한 상승 방향 편차가 CRITICAL severity로 탐지·경고되는지 — Runtime Guard(§28)와 연동.
- **Integration**: baseline Snapshot vs 현재 재계산의 Diff(Permission/Scope/Risk/Conflict)가 정확한지.
- **Regression(RBAC/ABAC)**: 정상 권한 변경(정책·assignment 반영)을 편차로 오탐하지 않는지(false-positive 억제).
- **분리 검증**: `ModelMonitor`/`Risk` drift 코드와 물리적으로 분리되어 상호 오염 0인지(§2.3).

### 6.2 인접 엔진 경계

Drift(탐지)와 Reconciliation(§25 정합화)은 별개 계층 — Drift는 "시간에 따른 편차"를, Reconciliation은 "동시 다경로 불일치"를 다룬다. Revalidation(§24)이 재검증 중 발견한 변화를 Drift로 라우팅한다. ML drift(`ModelMonitor`)·churn ML(`Risk`)은 권한 drift가 아님(§2.3) — 최다 오흡수 위험 구역.

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:236`·`:393`·`:423`·`:809` — 계산·재클램프 substrate(Ground-Truth ①)
- `backend/src/PlanPolicy.php:19` — 정책 상수(이력·버전 없음, Ground-Truth ①)
- `backend/public/index.php:608` — runtime context 주입(Ground-Truth ①)
- `backend/src/Handlers/Risk.php:12`·`:81`·`:91` — churn/policy ML **KEEP_SEPARATE**(Ground-Truth ②)
- `ModelMonitor` · `AnomalyDetection` · `Decisioning` · `RuleEngine` · `Connectors`(roasReconciliation) · `Wms`(reconcileChannelStock) · `PgSettlement` — 전부 **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Drift 거버넌스 로직은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
