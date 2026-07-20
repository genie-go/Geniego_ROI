# DSAR — Zero Trust & Continuous Authorization: 성능 요구사항 (Part 3-13 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §35는 Continuous Authorization의 지연·캐시 예산 5개를 요구한다.

| # | 지표 | 목표 |
|---|---|---|
| P1 | Trust Evaluation | ≤ 20ms |
| P2 | Continuous Authorization | ≤ 25ms |
| P3 | Step-up Trigger | ≤ 10ms |
| P4 | Threat Feed Processing | ≤ 2초 |
| P5 | Trust Cache Hit | ≥ 98% |

성능 예산은 인가가 **매 요청 재계산**(GT① §D)되는 hot path에 신뢰신호 평가를 추가해도 요청 지연이 폭증하지 않게 하는 계약이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 지표 | 판정 | 근거(파일:라인) |
|---|---|---|
| P1 Trust Evaluation | **ABSENT** (trust 평가 자체 부재) | authz trust/confidence 산출 없음(GT② §2). 측정 대상 미존재 |
| P2 Continuous Authorization | **PARTIAL** (정적 재검증 hot path 존재) | api_key 미들웨어 매 요청 DB 재조회·캐시 없음(`index.php:69-622`)·userByToken(`UserAuth.php:249-286`). 컨텍스트 재인가 아님·신뢰신호 미결합 |
| P3 Step-up Trigger | **ABSENT** (mid-session 부재) | MFA는 로그인 1회(`UserAuth.php:929-980`). mid-session step-up 트리거 미존재(GT② §2) |
| P4 Threat Feed Processing | **ABSENT** | IOC/threat feed 연계 부재(GT② §2). SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 방어 프리미티브 |
| P5 Trust Cache Hit | **ABSENT** (trust 캐시 부재·현행 무캐시) | 미들웨어 캐시 없음(`index.php:69-622` 매 요청 재조회). trust score 캐시 계층 순신규 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **P1/P2**: Trust Evaluation·Continuous Authorization을 요청별 게이트(`index.php:69-622`)에 결합하되 예산 내 유지 — 신뢰신호 조회는 §34 인덱스·§33 snapshot 기반 O(1) 근접.
- **P3**: Step-up 트리거(§12 Critical/High-risk/Admin)는 세션 AAL 상태(ADR D-2 신설) 비교로 ≤10ms.
- **P4**: Threat Feed(§8)는 비동기 처리 ≤2초 — 인가 hot path 밖(백그라운드 IOC 갱신).
- **P5**: Trust Cache Hit ≥98% — trust score 캐시 계층 순신규. 현행 무캐시 미들웨어(`index.php:69-622`)와 병행, 캐시 무효화는 재평가(§25) 트리거에 연동.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 성능 지표(`performance_metrics`·`AnomalyDetection.php` SPC·`ModelMonitor.php:11-18` ML 재학습)는 authz Trust Eval 예산과 무관(GT② §5). authz trust 캐시 ≠ 마케팅 데이터 신뢰도.
- **선행의존**: P1/P4/P5는 §33 테이블·§34 인덱스·Trust Engine 실구현 선행. Part 1~3-12 인증 후(BLOCKED_PREREQUISITE).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: P1/P3/P4/P5 = **ABSENT**(trust 평가·mid-session step-up·threat feed·trust 캐시 순신규), P2 = **PARTIAL**(정적 재검증 hot path 존재·신뢰신호 미결합).
- **RP-track 실구현 조건**: 5개 지표 벤치 통과(Trust Eval ≤20ms·Continuous Authz ≤25ms·Step-up ≤10ms·Threat Feed ≤2s·Cache Hit ≥98%)가 §37 Completion Gate "Performance Benchmark 통과" 조건. 현 단계 코드 변경 0 · **NOT_CERTIFIED**. 요청별 게이트(`index.php:69-622`) Extend-only(무후퇴).
