# DSAR — ERRE: 해석 플래너 (APPROVAL_ROLE_RESOLUTION_PLANNER)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_PLANNER`**(SPEC §1(6)) — ERRE 해석의 **실행 계획 수립기(query/traversal planner)** — 를 명세한다.

Planner는 파이프라인 18단계(SPEC §4) 실행 전에 **무엇을·어떤 순서로·어떤 소스에서** 수집·평가할지 결정한다. Resolution Graph(SPEC §5) 순회 계획, Assignment 수집 소스 선택(SPEC §3 22종 입력), Incremental Evaluation(SPEC §15) 여부, Cache 재사용(SPEC §15 "Cache Reuse") 판단을 산출하여 Optimizer·Executor에 넘긴다. Planner는 성능 계약(SPEC §35 P95≤20ms·Incremental Recalculation)을 달성하는 핵심이다.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 Planner = ABSENT

Ground-Truth ② #1(L27)이 실측: `ResolutionPipeline|resolveGraph|Planner|Optimizer|Executor` **백엔드 실코드 0.** 실행 계획 수립·순회 경로 산정·증분 평가 판단을 담당하는 Planner는 존재하지 않는다.

현행은 계획 단계 없이 `effectiveForUser`(`TeamPermissions.php:393`)가 매 요청 **고정된 if/switch 경로**를 그대로 실행한다. 어떤 소스를 읽을지·캐시를 쓸지 계획하는 로직이 없고, `subjectPerms()`(`:202`)·`subjectScope()`(`:215`)를 **매 요청 무조건 DB 재조회**한다(Ground-Truth ② #4 L30 — 캐시·계획 없음).

### 2.2 계획 유사물 부재

- Incremental Evaluation·Cache Reuse 판단(SPEC §15)은 Cache 자체가 ABSENT(Ground-Truth ② #4)이므로 계획 대상도 없다.
- Resolution Graph가 ABSENT(Ground-Truth ② #2)이므로 그래프 순회 계획도 부재.

### 2.3 종합

**Planner = ABSENT(순신규 그린필드).** 계획 없이 고정 경로 실행. Cache·Graph 부재로 계획 대상 자체가 미형성.

### 2.4 KEEP_SEPARATE

- `Connectors.php:819`(요청당 1회 채널캐시)·roasReconciliation은 **채널 데이터 캐시/정합**이지 권한 resolution 계획이 아니다(Ground-Truth ② §4). 비-권한·KEEP_SEPARATE — Planner의 Cache Reuse substrate로 인용 금지.
- `Decisioning`·`RuleEngine`의 실행 계획류는 마케팅 의사결정이지 권한 계획 아님 — KEEP_SEPARATE.

---

## 3. Canonical 설계 (실행 계획·증분·캐시 재사용 판단)

### 3.1 Planner 책임

- **소스 선택**: SPEC §3의 22종 입력(Direct/Group/Org Assignment·Composite·Hierarchical·Dynamic·Session·Service·Temporary·Emergency·Delegated·Scoped Role·Permission Policy·Explicit Deny·Runtime Policy·Environment·Context·Time·Risk) 중 해당 Subject·Context에 필요한 소스만 선별.
- **순회 계획**: Resolution Graph(SPEC §5) DAG 순회 경로 수립 — Hierarchy/Composite Expansion(SPEC §4-4·5) 최소 비용 경로.
- **증분 판단**: 이전 Snapshot 대비 변경분만 재계산(SPEC §15 Incremental Evaluation·§35 Incremental Recalculation)할지, 전체 재계산할지 결정.
- **캐시 재사용**: 유효 Cache(SPEC §21 Version 기반) 존재 시 재사용, Cache Invalidation Trigger(SPEC §22) 발생 시 재계산.

### 3.2 결정성·성능 계약

- Planner 산출 계획은 결정적(SPEC §16) — 동일 입력→동일 계획.
- 계획은 P95≤20ms·Cache Hit≥95%(SPEC §35) 달성을 목표로 lock-free read path 우선.

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

Planner는 파이프라인 **실행 전 계획 단계**로, 18단계 실행을 감독한다. Assignment Collection(§4-3)·Hierarchy/Composite Expansion(§4-4·5)의 수집·순회 전략을 결정하고, Cache Generation(§4-17) 재사용 여부를 사전 판단한다. Optimizer(SPEC §15)와 협업하되 Planner=계획·Optimizer=최적화로 역할 분리.

---

## 5. 무후퇴·Extend 원칙

- ADR D-1: 현행 `effectiveForUser`(`:393`)의 고정 경로 실행을 **파괴하지 않고**, 그 앞단에 Planner 계층을 신설하여 계획 기반 실행으로 승격. 팀 한정 소스 수집(`subjectPerms:202`·`subjectScope:215`)을 plan·api_key 소스까지 확장 계획에 포함.
- 무후퇴: Planner 미완성 구간은 현행 매요청 재조회 경로가 병행 유지(성능 저하는 있으나 정확성 후퇴 없음).

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37에 Planner 전용 완료 항목은 명시되지 않으나, "Resolution Engine 구축" 및 Performance Benchmark 통과(SPEC §35 Incremental Recalculation·Cache Hit≥95%)의 실질 전제.
- Performance Test(SPEC §36) "Incremental Cache Refresh"·"100K Concurrent Resolution" 통과가 Planner 품질을 검증.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `TeamPermissions.php:393`(effectiveForUser 고정 경로 실행) · `:202`(subjectPerms 매요청 조회) · `:215`(subjectScope 매요청 조회)
- KEEP_SEPARATE(비-권한, substrate 인용 아님): `Connectors.php:819`(채널캐시·roasReconciliation) · `Decisioning`·`RuleEngine`(마케팅 실행 계획)

**판정 요약: APPROVAL_ROLE_RESOLUTION_PLANNER = ABSENT(순신규 그린필드). 계획 없이 고정 if/switch 경로 실행·매요청 DB 재조회. Cache/Graph 부재로 계획 대상 미형성. Planner 계층은 순신규.**
