# DSAR — ERRE Effective Constraint Calculator (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §10
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-1·D-4·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_EFFECTIVE_CONSTRAINT`

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **8단계 Constraint Projection** 및 **Effective Constraint Calculator**(SPEC §10)의 거버넌스 계약을 정의한다. Effective Constraint Calculator는 Subject의 유효 권한에 **부착되는 제약조건**을 통합 산출한다. SPEC §10이 정의한 제약 차원은 Time·Device·Region·Network·Session·Amount·API·Dataset·Document·Approval Requirement 10종이다.

GeniegoROI에는 이들 제약이 **여러 파일에 분산된 PARTIAL substrate**로 실재하나(금액 승인·MFA·api_key 만료·data_scope 제약), 이를 하나의 통합 constraint 모델로 결합하는 계산기는 부재하다(ABSENT). 본 계산기는 분산 substrate를 파괴하지 않고 통합 Constraint Projection 단계의 구현체로 승격(Extend)한다.

제약은 **runtime constraint > static constraint**(SPEC §8) 우선순위를 따르며, 어떤 제약도 완화(loosen)될 수 없고 오직 강화(narrow)만 결합된다(fail-secure).

## 2. Ground-Truth 판정

### 2.1 실존 substrate (PARTIAL — Ground-Truth ② 표 #8)

Constraint substrate는 4개 파일에 **분산 실재**한다. 통합 constraint 모델은 부재하다.

| 파일:라인 | 제약 차원 | 역할 | ERRE 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/Catalog.php:1036` | **Amount** | `HIGH_VALUE_KRW = 5000000` 임계 | Constraint(amount) | PARTIAL |
| `backend/src/Handlers/Catalog.php:1159` | **Amount** | `requiresHighValueApproval()` — 임계 초과 시 승인 요구 | Approval Requirement | PARTIAL |
| `backend/src/Handlers/Catalog.php:1124` | **Amount** | `approval_type='high_value'` 승인 유형 태깅 | Approval Requirement | PARTIAL |
| `backend/src/Handlers/UserAuth.php:941` | **Session/Auth** | MFA 정적 게이트(off/admin/all) | Constraint(auth level) | PARTIAL |
| `backend/src/Handlers/Keys.php:99` | **API** | api_key scope 상한 + `expires_at` 만료 | Constraint(API·time) | PARTIAL |
| `backend/src/Handlers/TeamPermissions.php:272` | **Dataset** | `scopeValuesFor()`~`:307` data_scope 차원제약 | Constraint(dataset) | PARTIAL |

**분산의 근거**(Ground-Truth ② 표 #8): 각 제약은 자기 도메인 게이트에서 국소 강제될 뿐, "제약 집합을 통합 산출"하는 Effective Constraint 모델은 실재하지 않는다. Amount는 Catalog 도메인, MFA는 UserAuth 인증 경로, expires_at은 Keys 발급 검증, dataset은 TeamPermissions scope에 각기 격리돼 있다.

### 2.2 부재 (ABSENT — Ground-Truth ② 표 #8·§6)

- **통합 Constraint 모델 부재**: Time·Device·Region·Network를 표현·강제하는 통합 constraint 레코드/계산기 없음.
- **Constraint Cache/Snapshot ABSENT**(② 표 #3·#4): constraint 결과 불변 영속·캐시 없음(SPEC §21 Constraint Cache 신규).
- **Constraint Drift ABSENT**(② 표 #5).

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4)

- `UserAuth.php:941`~`:972` MFA 게이트는 **risk-score 없는 정적 게이트**다. Effective Risk Calculator(별도 DSAR)의 위험 기반 constraint와 혼동 금지 — 본 계산기에서는 정적 auth-level constraint로만 취급.
- `Risk.php:12`·`:81`·`:91`(churn ML)·`ModelMonitor`(model drift)·`PgSettlement`(정산 reconciliation)은 constraint substrate가 아니다(가짜녹색 회피).

## 3. Canonical 설계

### 3.1 Canonical Entity: `APPROVAL_EFFECTIVE_CONSTRAINT`

```
APPROVAL_EFFECTIVE_CONSTRAINT {
  subject_ref        : 정규화 Subject 식별자
  resolution_version : 불변 버전 바인딩 (SPEC §33)
  constraints        : {
     time     : { windows: [], timezone },     // SPEC §6 Time Window
     device    : { allow_types: [] },
     region    : { geo: [] },
     network   : { cidr: [] },
     session    : { auth_level: none|mfa, max_ttl },   // UserAuth:941 승격
     amount    : { threshold_krw, approval_required },  // Catalog:1036·:1159 승격
     api       : { scopes: [], expires_at },            // Keys:99 승격
     dataset    : { scope_dimensions },                 // TeamPermissions:272 승격
     document   : { classes: [] },
     approval    : { type, when }                       // Catalog:1124 승격
  }
  evidence          : 각 제약의 소스·병합 근거 체인 (SPEC §19 Evidence)
  digest            : 정규화 후 해시
}
```

### 3.2 결합 규칙 (SPEC §8·§10)

- **runtime > static**(SPEC §8): 런타임 제약이 정적 제약보다 우선 — 런타임이 더 좁으면 런타임 채택, 완화는 불가.
- **강화-only(fail-secure)**: 여러 소스가 같은 차원 제약을 제시하면 **가장 엄격한 값**이 채택된다. Amount 임계는 최저값, expires_at은 최단 만료, auth_level은 최상위(MFA required).
- **Approval Requirement 전파**: `requiresHighValueApproval()`(`Catalog.php:1159`)가 true면 effective constraint에 `approval.required=true`가 세팅되고 후속 Policy Evaluation(SPEC §13)이 승인 게이트를 강제.
- **deny와 정합**: 제약 위반은 곧 Effective Deny Calculator의 Runtime/Policy Deny로 승격(ADR D-4).

### 3.3 Determinism (ADR D-2)

동일 (Subject·Context·Version) → 동일 constraint 집합. constraint 결과는 Snapshot에 불변 영속, Constraint Cache(SPEC §21)로 lock-free read.

### 3.4 Snapshot·Digest·Cache 계약 (SPEC §18·§20·§21·§22)

- **Snapshot**(SPEC §18): 10차원 constraint 집합을 Resolution Version과 함께 불변 영속. 현행 금액·MFA·expires 게이트는 저장 없이 요청 시 판정하므로(② 표 #3) 영속 계층 순신규.
- **Digest**(SPEC §20): constraint 정규화 후 해시 — 동일 constraint 집합 → 동일 digest.
- **Constraint Cache**(SPEC §21): 차원별 캐시·version 키. Invalidation trigger(SPEC §22): Policy/Assignment/Scope/Runtime Context 변경.

### 3.5 Explain·Evidence·Error·Warning (SPEC §17·§19·§30·§31)

- **Explain**(SPEC §17): "어떤 제약 때문인가"를 사람이해·JSON 양형 제공. Approval Requirement가 걸린 경우 "HIGH_VALUE_KRW 초과"(`Catalog.php:1036`) 사유 명시.
- **Evidence**(SPEC §19): 각 제약의 소스·최엄격 선택 근거 기록.
- **Error**(SPEC §30): 제약 소스 조회 실패 시 `ROLE_RESOLUTION_FAILED`, 무효 컨텍스트 시 `INVALID_RUNTIME_CONTEXT`.
- **Warning**(SPEC §31): 제약이 강화되면 `Scope Narrowed`(제약 관점), 재빌드 필요 시 `Cache Rebuild Required`.

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격 대상 |
|---|---|---|
| 8. Constraint Projection | 10차원 제약 투영·병합 | Catalog:1036/:1159/:1124·UserAuth:941·Keys:99·TeamPermissions:272 |
| 12. Policy Evaluation | Approval Requirement 게이트 | `requiresHighValueApproval`(`Catalog.php:1159`) |
| 16. Snapshot Generation | 불변 constraint 스냅샷 | (신규 — ABSENT) |
| Runtime(§27) | Effective Constraint Set 노출 | (신규) |

SPEC §32 API `Resolve Constraints`가 진입점. SPEC §28 Runtime Guard가 제약 위반을 차단.

### 4.1 DB·Index·Runtime Guard 계약 (SPEC §28·§33·§34)

- **DB Constraint**(SPEC §33): constraint 스냅샷은 Immutable Version·Tenant Isolation·Version Binding. api_key `expires_at`(`Keys.php:99`)의 시간 제약은 스냅샷 version과 정합해야 함.
- **Index**(SPEC §34): Subject·Constraint·Version 인덱스로 P95 ≤ 20ms.
- **Runtime Guard**(SPEC §28): 제약 우회(예 금액 임계 미검) 차단. Approval Requirement 미충족 시 REQUIRE_APPROVAL 전이.

## 5. 무후퇴 · Extend (ADR D-1·D-7)

- **Extend-only**: `HIGH_VALUE_KRW`(`Catalog.php:1036`)·`requiresHighValueApproval`(`:1159`)·MFA 게이트(`UserAuth.php:941`)·api_key expires(`Keys.php:99`)를 파괴하지 않고 Constraint Projection 단계의 구현체로 승격.
- **실재 과신 회피**(D-7): 4개 분산 substrate는 통합 constraint 모델이 아니다. Time·Device·Region·Network 차원은 실측 부재(ABSENT)이므로 순신규.
- **부재 과장 회피**(D-7): MFA 게이트는 정적이며 risk-score 없음(② §4). 이를 위험 기반 constraint로 과장 금지.
- **병행 유지**: 현행 금액 승인·MFA·api_key 만료 게이트는 ERRE 완성 전까지 유지·병행. fail-secure(강화-only) 절대 보존.

## 6. 완료 게이트

1. 10차원 제약을 통합 Constraint 모델로 산출(강화-only 병합).
2. runtime > static·최엄격 채택 규칙 강제(SPEC §8·§10).
3. Approval Requirement 전파가 Policy Evaluation 게이트와 정합.
4. Constraint Snapshot·Digest·Version 불변 영속(SPEC §18·§20·§33).
5. Constraint Cache Hit ≥ 95%·Invalidation 정합(SPEC §21·§22·§35).
6. Regression: 현행 금액승인·MFA·expires 시나리오 100% 무후퇴(SPEC §36).
7. Security: 제약 우회(bypass) 차단(SPEC §28·§36).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: 최엄격 병합(금액 최저·expires 최단·auth 최상위)·runtime>static 우선·Approval Requirement 전파.
- **Integration**: `requiresHighValueApproval`(`Catalog.php:1159`)→Policy Evaluation REQUIRE_APPROVAL, MFA 게이트(`UserAuth.php:941`)+api_key expires(`Keys.php:99`) 동시 결합.
- **Performance**: P95 ≤ 20ms·Constraint Cache Hit ≥ 95%(SPEC §35).
- **Security**: 제약 우회·완화(loosen) 시도 차단.
- **Regression**: 현행 HIGH_VALUE_KRW 승인·MFA·api_key 만료 시나리오 100% 동일 판정.

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0.

## 7. 반날조 인용 출처

- `Catalog.php:1036·:1124·:1159`·`UserAuth.php:941`·`Keys.php:99`·`TeamPermissions.php:272~:307` — Ground-Truth ② 표 #8·§7
- SPEC §4·§6·§8·§10·§13·§18·§19·§20·§21·§22·§27·§28·§32·§33·§35·§36
- ADR D-1(Extend)·D-2(deterministic)·D-4(deny 승격)·D-7(정직 분리)
- KEEP_SEPARATE: `UserAuth.php:941~:972`(정적 MFA)·`Risk.php:12/:81/:91`·`ModelMonitor`·`PgSettlement` — Ground-Truth ② §4

**요약**: Effective Constraint Calculator = PARTIAL-substrate(금액승인·MFA·api_key expires·data_scope 분산 실재) / ABSENT-governance(통합 constraint 모델·Time/Device/Region/Network·Cache·Snapshot 순신규). Extend-only·runtime>static·강화-only(fail-secure)·Approval Requirement 전파. 코드 0·NOT_CERTIFIED·선행의존.
