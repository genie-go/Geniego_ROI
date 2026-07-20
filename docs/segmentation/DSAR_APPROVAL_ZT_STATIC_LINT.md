# DSAR — Zero Trust & Continuous Authorization: 정적 린트 (Part 3-13 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §29 Static Lint는 소스에서 Zero Trust 위반 패턴을 **정적 탐지**하는 6개 규칙이다: Missing Continuous Verification · Hardcoded Trust · Disabled MFA · Missing Re-authentication · Policy Bypass · Session Ignore. 신뢰 우회·검증 누락 코드를 CI 게이트에서 차단해 "Always Verify"를 코드 레벨로 보증한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

★핵심: ZT Static Lint 규칙 6종은 전부 **ABSENT(grep 0)** — 신뢰기반 lint 자체가 부재(GT② §2 "ZT Runtime Guard / Static Lint = ABSENT").

| SPEC §29 규칙 | 판정 | 근거(파일:라인) |
|---|---|---|
| Missing Continuous Verification | **ABSENT** | continuous 재인가 트리거 부재(GT② §2). 근접=agency 재검증(`index.php:96-122`)·유휴 로그아웃(`UserAuth.php:288-311`) authn뿐 |
| Hardcoded Trust | **ABSENT** | Trust Score 부재로 하드코딩 신뢰 lint 대상 자체 없음. 신뢰=암묵(로그인 통과=신뢰, GT② §2) |
| Disabled MFA | **ABSENT(lint)** | MFA 정책 런타임 강제는 존재(`mfaPolicy` `UserAuth.php:3745-3767`·완화불가 `:3754-3757`)나 **정적 lint 규칙은 부재** |
| Missing Re-authentication | **ABSENT** | mid-session re-auth 개념 부재(MFA는 로그인 1회 `UserAuth.php:929-980`, GT② §2) |
| Policy Bypass | **ABSENT(lint)** | break-glass(`UserAuth.php:793-798`·`:995-999`)는 감사기록 있으나 정적 bypass-탐지 lint 없음 |
| Session Ignore | **ABSENT** | 세션 무시 코드패턴 탐지 lint 부재. 세션 검증 substrate(`userByToken` `UserAuth.php:249-286`)는 런타임뿐 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **순신규 CI lint 계층**: 6개 규칙은 소스 정적 분석기(신규)로 구현. 실 substrate가 없으므로 재활용 대상은 lint가 검사할 **런타임 프리미티브**(`mfaPolicy`·`guardTeamWrite`·`userByToken`)이지 lint 자체가 아니다.
2. **Missing Continuous Verification**: 요청별 게이트(`index.php:69-622`)를 우회해 핸들러가 직접 자원 접근하는 경로 탐지→§10 Continuous Verification 강제.
3. **Hardcoded Trust**: Trust Score(§14) 도입 후, 신뢰값 상수화·`true` 고정 판정 탐지.
4. **Disabled MFA / Missing Re-auth**: `mfaPolicy` 완화불가 규칙(`UserAuth.php:3754-3757`) 우회·민감작업 step-up 누락(§12) 탐지.
5. **Policy Bypass / Session Ignore**: break-glass 외 무감사 우회·`userByToken` 미경유 접근 탐지.
6. **CI 게이트화**: 위반은 빌드 실패. 정본 lint는 단일 엔진(중복 금지, ADR D-6).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- 마케팅 trust/confidence(`Mmm.php:749`·`:939`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`)는 authz 신뢰 아님 — Hardcoded Trust lint 대상 아님(GT② §B-1).
- 마케팅 drift/anomaly(`ModelMonitor.php:11-18`·`AnomalyDetection.php`)는 ML 드리프트·SPC이지 Static Lint 대상 아님(GT② §B-2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Static Lint = ABSENT(6개 규칙 전부 grep 0·순신규 CI 계층).** 런타임 프리미티브(`mfaPolicy`·`guardTeamWrite`·`userByToken`·break-glass 감사)는 존재하나 이를 검사하는 정적 lint는 전무. 선행: Trust Score(§14)·Continuous Verification(§10)·mid-session Step-up(§12) 신설 후에야 lint 규칙이 검사 대상을 갖는다. 코드 변경 0·BLOCKED_PREREQUISITE.
