# DSAR — Zero Trust & Continuous Authorization: 경고 계약 (Part 3-13 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §31 Warning Contract는 **차단 이전 열화 신호**를 5종 경고로 알린다: Trust Declining · Device Becoming Untrusted · Session Aging · Threat Increasing · MFA Expiring. §24 Drift Detection·§23 Analytics와 연동해 §30 에러(차단) 전 선제 대응(step-up 유도·세션 갱신 안내)을 가능케 한다. 경고는 **비차단(non-blocking)** — 접근은 허용하되 신호를 노출한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §31 경고 | 판정 | 근거(파일:라인) |
|---|---|---|
| Session Aging | **PARTIAL(재활용)** | 세션 TTL 30일(`UserAuth.php:986`·`:990`)·유휴 `last_seen_at`/`auto_logout_min`(`:288-311`·`:302-305`). age 데이터는 있으나 **경고 방출 없음**(만료=하드컷) |
| MFA Expiring | **ABSENT(경고)** | MFA 정책 존재(`mfaPolicy` `UserAuth.php:3745-3767`)나 MFA 유효기간 만료임박 경고 부재. MFA는 로그인 1회(`:929-980`) |
| Trust Declining | **ABSENT(grep 0)** | Trust Score 부재→하락 추세 경고 대상 없음(GT② §2). `risk` 라벨(`UserAuth.php:4165`)=정적 |
| Device Becoming Untrusted | **ABSENT** | Device Trust Engine 부재·`recordSessionMeta` 기록만(`UserAuth.php:4232-4251`) |
| Threat Increasing | **ABSENT** | Threat Intelligence 부재(GT② §2). SSRF/rate-limit(`index.php:527-570`)은 방어 프리미티브 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **비차단 경고 채널 신설**: 5경고는 응답 헤더/메타(`warnings[]`)로 노출하되 접근 차단 없음. §30 에러(차단)와 명확 분리.
2. `Session Aging`은 현행 TTL/idle 데이터(`UserAuth.php:986`·`:288-311`)를 재활용해 만료 임박(임계 %) 경고 방출(Extend·하드컷 유지).
3. `MFA Expiring`은 로그인 MFA(`UserAuth.php:929-980`)를 세션 AAL/MFA-passed 저장(ADR D-2·신규)으로 확장 후 유효기간 임박 경고.
4. `Trust Declining`/`Device Becoming Untrusted`는 §14 Trust Score·Device Trust(ADR D-1·D-4)·§24 Drift Detection 신설 후 추세 경고.
5. `Threat Increasing`은 순신규 Threat Intelligence(ADR D-7) UEBA/feed 상승 시 경고.
6. **경고→차단 승격 경로**: 경고 누적·임계 초과 시 §28 Runtime Guard·§30 에러로 승격. 경고/에러 모두 SecurityAudit(`SecurityAudit.php:12-68`) 기록.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- 마케팅 trust 하락(`Mmm.php:749`·`AttributionEngine.php:246-261` blended_trust)은 어트리뷰션 신뢰도 변동이지 `Trust Declining`(authz) 아님(GT② §B-1).
- ML drift(`ModelMonitor.php:11-18`)·SPC anomaly(`AnomalyDetection.php`)·churn risk(`CustomerAI.php:10-18`)는 `Trust Declining`/`Threat Increasing`으로 오인 금지(GT② §B-2).
- device-sig(`Attribution.php:144-150`)는 `Device Becoming Untrusted` 신호 아님(GT② §B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Warning Contract = PARTIAL(Session Aging 데이터 재활용) / ABSENT(Trust Declining·Device Becoming Untrusted·Threat Increasing·MFA Expiring 경고 순신규).** 재활용: 세션 TTL/idle 데이터·로그인 MFA·SecurityAudit. 선행: Trust Score·Device Trust·Threat Intel·§24 Drift·세션 AAL 저장 신설 후 경고 방출. 경고는 비차단·§30 에러와 분리. 코드 변경 0·BLOCKED_PREREQUISITE.
