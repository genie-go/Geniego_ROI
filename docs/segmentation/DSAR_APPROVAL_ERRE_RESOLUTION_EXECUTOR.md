# DSAR — ERRE: 해석 실행기 (APPROVAL_ROLE_RESOLUTION_EXECUTOR)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_EXECUTOR`**(SPEC §1(8)·§16) — ERRE 파이프라인의 **결정적 실행기** — 를 명세한다.

SPEC §16(L347~353) Executor는 반드시 다음 3특성을 가져야 한다:

- **Thread Safe** (스레드 안전)
- **Stateless** (무상태)
- **Deterministic** (결정적)

Executor는 Planner가 수립한 계획·Optimizer가 최적화한 경로에 따라 파이프라인 18단계(SPEC §4)를 실제로 실행하여 Runtime Authorization Projection(SPEC §27)을 산출한다. 성능 계약(SPEC §35 P95≤20ms·Lock-Free Read Path·Horizontal Scale·Deterministic 100%)을 만족해야 한다.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 통합 Executor = ABSENT

Ground-Truth ② #1(L27)이 실측: `Executor` 백엔드 실코드 0. 파이프라인을 thread-safe·stateless·deterministic으로 실행하는 통합 실행기는 부재하다.

### 2.2 결정적·무상태 substrate (PARTIAL·부분 특성)

현행 `effectiveForUser`(`TeamPermissions.php:393`)는 Executor의 일부 특성을 우연히 만족한다:

- **Stateless(부분 PRESENT)**: 매 요청 재계산 후 반환만·저장 안 함(Ground-Truth ② #3 L29) — 내부 상태를 유지하지 않는 무상태 재계산. 단, 이는 캐시 부재의 부작용이지 설계된 무상태성이 아니다.
- **Deterministic(부분 PARTIAL)**: 동일 입력(같은 DB 행)→같은 결과를 산출하나, 통합 결정성 계약(SPEC §35 100%)이나 canonical evaluation ordering(cross-차원)은 부재(Ground-Truth ① §3 L120).
- **Thread Safe(미검증)**: 요청 스코프 실행·공유 가변 상태 없음으로 보이나, thread-safety를 명시 보장·검증하는 계약은 부재.

### 2.3 종합

**Executor = ABSENT(통합 실행기).** `effectiveForUser`가 무상태 재계산이라는 점에서 Stateless는 우연히 부분 PRESENT, Deterministic은 팀 차원 부분 PARTIAL, Thread Safe·성능 계약(lock-free·P95≤20ms)은 미검증/ABSENT. 통합 실행기는 순신규 그린필드.

### 2.4 정직 분리 (ADR D-7)

`effectiveForUser`가 매요청 재계산·무상태라는 이유로 "Executor가 이미 있다"로 오판 금지. 이는 팀 한정 인라인 계산기이지 계획·최적화·스냅샷·감사를 통합 실행하는 결정적 Executor가 아니다.

### 2.5 KEEP_SEPARATE

- `Alerting.php:665` "executor identity"는 **알림 실행자**지 resolution executor가 아니다(Ground-Truth ② §4 L54). 이름만 유사 — 비-권한·KEEP_SEPARATE. Executor substrate로 인용 절대 금지(가짜녹색 회피).
- `Decisioning`·`RuleEngine`의 실행 로직은 마케팅 자동제어 — KEEP_SEPARATE.

---

## 3. Canonical 설계 (Thread-Safe·Stateless·Deterministic)

### 3.1 3대 특성 계약 (SPEC §16)

- **Thread Safe**: 공유 가변 상태 없이 동시 100K 해석(SPEC §36 Performance)을 안전 실행. Lock-Free Read Path(SPEC §35)로 스냅샷 참조.
- **Stateless**: 실행 간 상태 미보존 — 모든 입력은 Resolution Context(SPEC §6)+Session(SPEC §1-4)으로 명시 주입. 현행 `effectiveForUser`의 무상태 재계산 특성을 설계된 계약으로 승격.
- **Deterministic**: 동일 (Subject+Context+Version)→동일 출력 100%(SPEC §35·ADR D-2). Canonical Ordering(SPEC §7)·순서 불변 파이프라인(SPEC §4 L156)으로 보장.

### 3.2 실행 산출

- Executor는 Runtime Authorization Projection(SPEC §27): Effective Role/Permission/Scope/Constraint/Deny Set + Risk Level을 산출.
- 산출 즉시 Snapshot(SPEC §18)+Digest(SPEC §20)로 불변화, Cache(SPEC §21) 적재, Audit(SPEC §4-18) 기록.

### 3.3 Runtime Guard 연동 (SPEC §28)

- 실행 중 Invalid Graph·Cyclic Dependency·Missing Snapshot/Version·Permission/Scope Escalation 발견 시 Runtime Guard가 차단·`RESOLUTION_TIMEOUT`/`INVALID_RESOLUTION_GRAPH`(SPEC §30) 발생.

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

Executor는 파이프라인 **18단계 전체의 실제 실행 주체**다. Planner(계획)→Optimizer(최적화)→**Executor(실행)** 순으로 협업하며, ERRE Engine(`APPROVAL_EFFECTIVE_ROLE_ENGINE`) 커널이 이를 오케스트레이션한다. 현행 `effectiveForUser`의 인라인 실행은 Executor 실행 경로의 Effective Generation(§4-14·15) 구현체로 승격된다.

---

## 5. 무후퇴·Extend 원칙

- ADR D-1: `effectiveForUser`(`:393`)의 무상태 재계산 로직을 **파괴하지 않고** Executor 실행 경로에 통합. 팀 한정 계산을 plan·api_key 차원까지 확장하되 결정성·무상태성은 계약으로 강화.
- ADR D-7: 무상태 재계산이 우연히 만족하는 특성을 설계된 계약으로 승격(재플래그 아닌 승격).
- 무후퇴: Executor 미완성 구간은 현행 인라인 실행이 병행 유지 — 정확성 후퇴 없음.

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37 "Resolution Engine 구축"의 실행 주체로서 필수.
- Performance Benchmark(SPEC §35 Deterministic 100%·P95≤20ms·Lock-Free)·Security Test(SPEC §36 Authorization Bypass·Permission/Scope Escalation)·Performance Test(100K Concurrent Resolution) 통과가 Executor 인증 조건.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `TeamPermissions.php:393`(effectiveForUser 무상태 재계산·인라인 실행)
- (Ground-Truth ① §3 canonical ordering 부재 근거: `TeamPermissions.php:182` normActions 팀 차원 한정)
- KEEP_SEPARATE(비-권한, substrate 인용 절대 금지·이름만 언급): `Alerting.php:665`(executor identity=알림 실행자) · `Decisioning`·`RuleEngine`(마케팅 실행)

**판정 요약: APPROVAL_ROLE_RESOLUTION_EXECUTOR = ABSENT(통합 실행기). effectiveForUser의 무상태 재계산으로 Stateless 부분 PRESENT·Deterministic 팀 차원 부분 PARTIAL·Thread Safe/성능 계약 미검증. Alerting executor identity는 비-권한·KEEP_SEPARATE. 결정적 통합 Executor는 순신규 그린필드.**
