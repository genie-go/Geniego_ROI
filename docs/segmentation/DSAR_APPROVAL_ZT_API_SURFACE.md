# DSAR — Zero Trust & Continuous Authorization: API 표면 (Part 3-13 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §32 API는 최소 7개 표면을 정의한다: Evaluate Trust · Evaluate Continuous Authorization · Step-up Request · Re-authentication · Trust Analytics · Trust Simulation · Threat Status 조회. §3~§27 엔진의 외부 계약이며, PDP(3-12)에 신뢰신호를 주입하는 진입점이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §32 API | 판정 | 근거(파일:라인) |
|---|---|---|
| Step-up Request | **PARTIAL(로그인)** | 로그인 OTP 발급/챌린지(`issueLoginOtp` `UserAuth.php:972`·`:3997`·`mfa_required` `:973`·`:977`)·TOTP(`:3566-3592`)·복구코드(`:3600-3634`). **mid-session step-up API 부재** |
| Re-authentication | **PARTIAL(재활용)** | 로그인 재인증 경로(`UserAuth.php:929-980`)만. mid-session re-auth 엔드포인트 부재 |
| (세션 조회 근접) | **PARTIAL** | `listSessions`/`revokeOtherSessions`(`UserAuth.php:4253-4298`) 동시세션 목록·수동폐기. Trust 평가 API 아님 |
| Evaluate Trust | **ABSENT(grep 0)** | Trust Score/Engine 부재(GT② §2). identity/device/session/network 종합 산출 API 없음 |
| Evaluate Continuous Authorization | **ABSENT** | 재인가 트리거 부재. 근접=agency 재검증(`index.php:96-122`)·요청별 게이트(`index.php:69-622`)=정적 |
| Trust Analytics | **ABSENT** | §23 지표(avg trust/high-risk sessions) 산출원 부재. `auth_audit_log`(`UserAuth.php:4165`)=정적 감사만 |
| Trust Simulation | **ABSENT** | §27 what-if(device compromise/threat 증가) 시뮬레이터 전무 |
| Threat Status 조회 | **ABSENT** | Threat Intelligence 부재. SSRF/rate-limit(`index.php:527-570`)은 방어 프리미티브·별개 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **버전 프리픽스·`/api` 정합**: 신규 7 API는 최신 버전 프리픽스 + `/api` alias 정합(index.php basePath 자동감지). RBAC(admin/analyst)·tenant 격리(`index.php:573-597`) 준수.
2. `Step-up Request`/`Re-authentication`은 로그인 MFA(`UserAuth.php:929-980`·`issueLoginOtp` `:972`·TOTP `:3566-3592`)를 mid-session 컨텍스트로 확장(ADR D-2). 세션 AAL/Trust 저장(신규) 갱신.
3. `Evaluate Trust`/`Evaluate Continuous Authorization`은 §14 Trust Score·§9~§10 엔진(ADR D-3·D-4) 신설 후 PDP(3-12)에 신뢰신호 주입(무중복 ADR D-6). PDP 재구현 금지.
4. `Trust Analytics`는 §23 지표를 SecurityAudit/세션 데이터에서 집계(신규). `listSessions`(`UserAuth.php:4253-4298`) 재활용 가능.
5. `Trust Simulation`은 §27 what-if 전용(읽기)·운영 상태 불변.
6. `Threat Status 조회`는 순신규 Threat Intelligence(ADR D-7)에서만. SSRF/rate-limit 재사용 금지.
7. 모든 API 호출·결정은 SecurityAudit 해시체인(`SecurityAudit.php:12-68`) 증거화(ADR D-5).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- 마케팅 trust/confidence API(`Mmm.php:749`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`)는 `Evaluate Trust`/`Trust Analytics` 대상 아님(GT② §B-1).
- ML drift/anomaly(`ModelMonitor.php:11-18`·`AnomalyDetection.php`)·fraud(`Risk.php:31-55`)·churn(`CustomerAI.php:10-18`)·device-sig(`Attribution.php:144-150`)는 `Threat Status`/`Trust Simulation` 원천 아님(GT② §B-2·B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**API Surface = PARTIAL(Step-up·Re-authentication 로그인 재활용·세션조회 근접) / ABSENT(Evaluate Trust·Evaluate Continuous Authorization·Trust Analytics·Trust Simulation·Threat Status 순신규).** 재활용: 로그인 MFA/OTP/TOTP·`listSessions`·요청별 게이트·SecurityAudit. 선행: Part 1~3-12(PDP/PEP) 인증·Trust Score·Device/Network Trust·Threat Intel·세션 AAL 저장 신설 후 구현. PDP 무중복 주입. 코드 변경 0·BLOCKED_PREREQUISITE.
