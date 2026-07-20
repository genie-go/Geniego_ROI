# DSAR — PDP/PEP Governance: 성능 요구사항 (P95≤15ms·P99≤40ms·Cache≥98%·Explain≤100ms·500K/sec·Horizontal Scale) (Part 3-12 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §32는 6개 성능 목표를 요구한다: **P95 Decision ≤ 15ms**·**P99 Decision ≤ 40ms**·**Cache Hit ≥ 98%**·**Explain Generation ≤ 100ms**·**500K Decisions/sec**·**Horizontal Scale 지원**. 이는 중앙 PDP가 매 접근요청 경로(§0 PIP→PDP→Cache→PEP)에 위치하므로, 결정 지연이 전 요청 지연에 직접 가산됨을 전제한 것이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 성능 목표 | 판정 | 근거(파일:라인) |
|---|---|---|
| P95≤15ms / P99≤40ms Decision | **미측정(ABSENT)** | 통합 PDP 부재로 결정 지연 계측 지점 없음. proto-PDP `effectiveForUser`(`TeamPermissions.php:393-421`)는 매 호출 DB 조회(`:202-225`) |
| Cache Hit ≥ 98% | **ABSENT** | Runtime Decision Cache 전무(subject/resource/action/context-hash→decision·`TeamPermissions.php:202-225` **매 호출 DB 재계산**, GT②§2·ADR§D-3). 캐시 히트율 정의 불가 |
| Explain Generation ≤ 100ms | **ABSENT** | Decision Explain 생성기 부재(`$violations` `TeamPermissions.php:656-674`는 위임 위반 나열만·설명 생성 아님, GT②§2) |
| 500K Decisions/sec | **미검증(ABSENT)** | 결정 처리량 벤치 대상 통합 엔진 부재 |
| Horizontal Scale | **PARTIAL(무상태 substrate)** | 현행 결정은 요청별 DB 재계산(`:202-225`)·무상태 근접이나 캐시/샤딩 계층 부재 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **P95≤15ms/P99≤40ms**: Decision Pipeline(§8 12단계) 각 단계 지연 예산 배분. 핫패스=Decision Cache(§14) 히트. 현행 매 요청 재계산(`TeamPermissions.php:202-225`)을 캐시로 제거(ADR§D-3).
- **Cache Hit ≥ 98%**: `(subject, resource, action, context_hash)` 키·TTL·Invalidation(§15 Policy/Assignment/Session/Context/Risk 변경 시). 순신규.
- **Explain≤100ms**: Explain(§16)은 캐시된 Evidence(§23 rule/scope trace)에서 조립 — SecurityAudit 체인(`SecurityAudit.php:12-53`) 확장 재활용(ADR§D-5). `$violations`(`:656-674`) 패턴 확장.
- **500K/sec·Horizontal Scale**: PDP 무상태·Decision Cache 분산·읽기 전용 PIP(`UserAuth.php:256-268`·`TeamPermissions.php:39-41`) 복제. 성능 벤치는 §33 Performance 테스트(500K/sec·100M cache·5M session)로 검증.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE(GT②§5)**: `attribution_model_cache`(마케팅 캐시)·ModelMonitor(`ModelMonitor.php:220-335`) 성능지표는 authz decision 성능 아님. 흡수 금지.
- **선행의존**: 성능 목표는 §14 Decision Cache·§31 Index 신설 후에만 측정 가능. Part 1~3-11 인증·§30 DB Constraint 선행(BLOCKED_PREREQUISITE·ADR§4).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**6개 성능 목표 전부 미측정/ABSENT** — Decision Cache·Explain 생성기 부재로 P95/P99·Cache Hit·Explain 지연 정의 자체가 불가. 현행 proto-PDP는 매 요청 DB 재계산(`TeamPermissions.php:202-225`·`:393-421`)으로 캐시 없음. Performance Benchmark 통과(§34 Completion Gate)는 §14 캐시·§31 인덱스 신설 후 **RP-track 실구현 조건**(코드0·NOT_CERTIFIED). 마케팅 캐시 성능 흡수 금지.
