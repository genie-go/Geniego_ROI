# DSAR — ERRE Resolution Digest Engine (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §20 Digest Engine
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. **SecurityAudit 해시체인의 해시 ≠ resolution digest**(KEEP_SEPARATE). 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Digest Engine**(SPEC §20)은 effective 계산 결과를 **결정론적 지문(deterministic fingerprint)**으로 압축하는 축이다. Snapshot(§18)의 무결성 검증, Cache(§21) 키, Drift(§23) 비교, Reconciliation(§25) 동일성 판정이 모두 이 digest의 동등성(equality) 위에서 성립한다.

SPEC §20이 규정하는 Digest 입력은 7종이며, 동일 입력 → 동일 digest(deterministic)를 보장해야 한다.

- **Subject** — 주체 식별
- **Role Set** — effective role 집합(canonical ordering 후)
- **Permission Set** — effective permission 집합
- **Scope Set** — effective scope 집합
- **Policy Version** — 적용 정책 버전
- **Runtime Context** — tenant/env/session 등 컨텍스트(SPEC §6)
- **Snapshot Version** — 대상 스냅샷 버전(SPEC §33)

Digest의 존재 이유는 "두 resolution 결과가 같은가"를 O(1)로 판정하는 것이다. Cache Hit 판정·Drift diff 여부·Reconciliation MATCH 판정이 전부 digest 비교로 환원된다.

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (결과 해시·지문 부재)

Digest는 Snapshot/Version과 한 묶음으로 Ground-Truth ② 판정표 #3에서 **ABSENT**로 확정된다.

- **결과 해시 부재**: effective 결과를 해시/지문으로 압축하는 로직 grep 0(Ground-Truth ② §2 #3 "불변 스냅샷/해시/버전 영속 0").
- **비영속·비교 불가**: `effectiveForUser`(`TeamPermissions.php:393`)는 결과를 반환만 하므로, 두 시점의 결과를 지문으로 비교할 수단 자체가 없다.
- **canonical ordering은 부분 존재**: digest의 전제인 결정적 정렬은 `normActions`(`TeamPermissions.php:182`)가 action 차원에서만 수행 — cross-차원(plan/role/scope) canonical evaluation ordering은 부재(Ground-Truth ① §3). 즉 digest의 입력 정규화조차 팀 action 차원 국소.

### 2.2 실존 substrate (dedupe 재료만 부분)

- dedupe: `normActions`의 `$set[$a]=true` 해시(`TeamPermissions.php:182`)·`Keys.php:99` `array_unique`(전수조사 ① §3). 전역 dedupe 유틸 부재.
- 이들은 digest 입력을 정규화하는 재료일 뿐, 결과 전체를 지문화하는 함수가 아니다.

### 2.3 ★KEEP_SEPARATE 오흡수 경고

- `SecurityAudit.php:25`~`:31`·`:56`~`:64` **해시체인의 해시는 이벤트 무결성용이지 resolution 결과 지문이 아니다**(Ground-Truth ② §4). 체인의 prev-hash 연결은 감사 append-only 보증이며, "동일 effective 결과 → 동일 digest"의 결정론적 지문 시맨틱과 다르다. Digest Engine으로 병합·개명 금지(ADR D-5).
- `Db.php`의 credential 해시·`api_key` SHA-256(index.php 미들웨어 인증)은 인증 자격증명 해시이지 resolution digest 아님 — 오흡수 금지.

## 3. Canonical 설계 (`ERRE_RESOLUTION_DIGEST` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | digest_id | digest 레코드 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수) |
| 3 | subject_ref | 주체 참조(digest 입력) |
| 4 | role_set_hash | canonical ordering 후 role 집합 지문 |
| 5 | permission_set_hash | permission 집합 지문 |
| 6 | scope_set_hash | scope 집합 지문 |
| 7 | policy_version | 적용 정책 버전(digest 입력) |
| 8 | runtime_context_hash | tenant/env/session 컨텍스트 지문 |
| 9 | snapshot_version | 대상 스냅샷 버전 |
| 10 | resolution_digest | 위 요소 결합 최종 결정론적 digest |
| 11 | computed_at | 계산 시각 |

### 3.1 설계 원칙

- **결정론적(deterministic)**: 동일 입력 → 동일 digest 100%(SPEC §35). 입력은 canonical ordering·dedupe 후여야 함(순서 비의존).
- **Snapshot 무결성 앵커**: Snapshot(§18)의 `snapshot_digest`는 이 엔진 산출. Digest Validation(SPEC §33 DB 제약)의 기준.
- **비교의 단일 통화(currency)**: Cache Hit·Drift diff·Reconciliation MATCH가 모두 digest 동등성으로 판정 — 각기 다른 비교 로직 난립 금지.
- **Tenant 격리**: digest는 tenant별 — cross-tenant digest 충돌·재사용 금지.

### 3.2 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **CACHE_CORRUPTED**(SPEC §30): Cache(§21)가 서빙한 값의 digest가 Snapshot digest와 불일치하면 오염 판정·재빌드.
- **INVALID_RESOLUTION_GRAPH**(SPEC §30): digest 입력의 Role/Permission Set이 DAG 위반(순환)에서 비롯되면 digest 산출 거부.
- **Cache Rebuild Required 경고**(SPEC §31): digest 불일치 관측 시 캐시 재빌드 시그널.

### 3.3 API 표면 (SPEC §32 중 본 축 해당분)

- **Compare Snapshots**: 두 스냅샷의 digest 동등성으로 변경 여부 O(1) 판정 후, 불일치 시 상세 Diff.
- **Validate Resolution**: Digest Validation(SPEC §33 DB 제약)으로 Snapshot 무결성 검증.

### 3.4 인덱스 · 성능 (SPEC §34·§35)

- **인덱스**: Version·Snapshot 인덱스(SPEC §34)에 digest 컬럼 결합 — 캐시 키 조회 O(1).
- **성능**: digest 계산은 결정적·저비용이어야 함(SPEC §35 Deterministic 100%). 입력 canonical ordering은 write path에서 1회, digest 비교는 read path에서 O(1).

## 4. Kernel 매핑 (Digest 입력의 계산 소스)

| Digest 입력(SPEC §20) | 계산 소스 | 최근접 substrate | 판정 |
|---|---|---|---|
| Subject | Subject Resolution(1) | `TeamPermissions.php:120`·`UserAuth.php:249` | **PARTIAL**(식별만) |
| Role Set | Effective Role Generation(14) | `TeamPermissions.php:393`·`:182` | **PARTIAL**(action 차원 ordering만) |
| Permission Set | Permission Generation(15) | `TeamPermissions.php:423` | **PARTIAL**(값만) |
| Scope Set | Scope Projection(7) | `TeamPermissions.php:236`·`:286` | **PARTIAL**(값만) |
| Policy Version | Policy Evaluation(12) | `PlanPolicy.php:19`·`:27` | **PARTIAL**(정적 상수·버전 없음) |
| Runtime Context | Resolution Context(§6) | `index.php:608`(tenant 주입) | **PARTIAL**(주입만) |
| Snapshot Version | Snapshot Generation(16) | — | **ABSENT**(Snapshot 부재) |
| **결과 지문화 자체** | Digest Engine(§20) | — | **ABSENT** |

> Policy Version은 `PlanPolicy::RANK`(`PlanPolicy.php:19`)·`FEATURE_MIN_PLAN`(`:27`)이 정적 상수로만 존재하며 **버전 필드가 없다** — digest 입력의 Policy Version 축은 version binding 신설 필요(ADR D-8 부채).

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: 기존 `normActions`(`TeamPermissions.php:182`)·`array_unique`(`Keys.php:99`) dedupe를 파괴하지 않고, 이를 digest **입력 정규화 단계**로 승격. cross-차원 canonical ordering을 추가 신설해 digest 결정성 확보.
- **중복 해시 함수 금지**: `SecurityAudit` 체인 해시(§2.3)·`api_key` SHA-256 인증 해시와 **별도**로 resolution digest 함수 신설 — 기존 해시 유틸 재사용은 가능하나 시맨틱 혼합·개명 금지.
- **forward-only**: 시행일 이후 산출분만. 과거 결과는 지문화 불가(원본 결과 비영속).
- **병행 유지**: digest는 캐시/비교 최적화를 추가할 뿐 현행 판정 경로를 바꾸지 않음.
- **실재 과신 회피(ADR D-7)**: `normActions`의 dedupe 해시(`:182`)는 action 차원 정규화이지 결과 전체의 결정론적 지문이 아니다 — "이미 digest가 있다"로 오판 금지.
- **부재 과장 회피(ADR D-7)**: `SecurityAudit` 체인 해시가 존재한다고 결과 지문이 있는 것은 아니다(시맨틱 상이) — grep 0을 실측 부재로 정직 유지.

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **입력 정규화**: cross-차원 canonical ordering 신설로 digest 입력의 결정성 확보(action 차원 `normActions` 재사용·확장).
2. **지문 산출**: Snapshot(§18) 생성 시 digest 부수 계산·`snapshot_digest` 채움.
3. **비교 통화 통일**: Cache/Drift/Reconciliation의 비교를 digest 동등성으로 단일화(각기 다른 비교 로직 난립 방지).
- 각 단계는 판정 무변경·순수 계산 계층 추가.

## 6. 완료 게이트

- Digest Engine 7종 입력(Subject/Role/Permission/Scope/Policy Version/Runtime Context/Snapshot Version) 결정론적 지문화 구축.
- 동일 입력 → 동일 digest 100% · 입력 순서 비의존(canonical ordering·dedupe 선행).
- Snapshot Integrity(§18)·Cache 키(§21)·Drift diff(§23)·Reconciliation MATCH(§25)가 모두 digest 동등성으로 판정 가능.
- Policy Version 축의 version binding 신설(ADR D-8 부채 정합).
- Tenant 격리 회귀 0 · 성능(SPEC §35) 하에서 digest 계산이 read path 저해 없음.
- **선행 의존**: Snapshot Version 축은 Snapshot Engine(§18) 실구현 후. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Unit(Digest)**: 동일 입력→동일 digest 100% · 입력 순서 변경에 불변(canonical ordering 선행) · dedupe 후 동일성.
- **Integration(Snapshot)**: `snapshot_digest`가 스냅샷 무결성 검증(SPEC §33)에 실제로 쓰이는지.
- **Security(Cache Poisoning)**: 위조 digest로 캐시 Hit를 유도할 수 없는지 · 충돌 저항.
- **Regression**: digest 도입이 판정 결과를 바꾸지 않는지(순수 계산 계층).

### 6.2 인접 엔진 경계

Digest는 Snapshot(§18) 무결성 앵커이자 Cache(§21) 키이며 Drift(§23)·Reconciliation(§25) 비교의 "단일 통화(currency)"다. `SecurityAudit` 체인 해시(감사 무결성)·`api_key` 인증 해시와 시맨틱이 다르므로 재사용 시에도 개명·혼합 금지(§2.3).

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:120`·`:182`·`:236`·`:286`·`:393`·`:423` — 계산·dedupe·ordering substrate(Ground-Truth ①)
- `backend/src/Handlers/UserAuth.php:249` — subject 식별(Ground-Truth ①)
- `backend/src/Handlers/Keys.php:99` — array_unique dedupe(Ground-Truth ①)
- `backend/src/PlanPolicy.php:19`·`:27` — 정책 상수(버전 없음, Ground-Truth ①)
- `backend/public/index.php:608` — runtime context tenant 주입(Ground-Truth ①)
- `backend/src/Handlers/SecurityAudit.php:25`~`:31`·`:56`~`:64` — 해시체인 **KEEP_SEPARATE**(Ground-Truth ②)
- `backend/src/Db.php` — 인증 자격증명 해시(KEEP_SEPARATE 참조, Ground-Truth ②)

그 밖의 모든 Digest 거버넌스 로직은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
