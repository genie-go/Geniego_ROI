# DSAR — Zero Trust & Continuous Authorization: 에러 계약 (Part 3-13 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §30 Error Contract는 신뢰·인가 실패를 표준 에러코드 7종으로 반환한다: `TRUST_SCORE_TOO_LOW` · `DEVICE_NOT_TRUSTED` · `SESSION_INVALID` · `NETWORK_UNTRUSTED` · `STEP_UP_REQUIRED` · `REAUTH_REQUIRED` · `THREAT_BLOCKED`. §28 Runtime Guard 차단·§11 Adaptive Deny의 클라이언트 계약이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §30 코드 | 판정 | 근거(파일:라인) |
|---|---|---|
| `SESSION_INVALID` | **PARTIAL(재활용)** | `userByToken` 만료/비활성 재검증(`UserAuth.php:249-286`·`:266-268`)·유휴 무효화(`:288-311`) · api_key 만료(`index.php:506-508`). 전용 코드는 미표준화 |
| `STEP_UP_REQUIRED` | **PARTIAL(로그인)** | 로그인 MFA `mfa_required` 401(`UserAuth.php:929-980`·`:973`·`:977`). **mid-session step-up 코드 부재** |
| `TRUST_SCORE_TOO_LOW` | **ABSENT(grep 0)** | Trust Score 부재(GT② §2). `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·인가 미반영 |
| `DEVICE_NOT_TRUSTED` | **ABSENT** | Device Trust Engine 부재·`recordSessionMeta` 기록만(`UserAuth.php:4232-4251`) |
| `NETWORK_UNTRUSTED` | **ABSENT** | `clientIp` 수집만(`UserAuth.php:3443-3463`)·신뢰등급 산출 없음 |
| `REAUTH_REQUIRED` | **ABSENT** | Continuous Re-auth 개념 부재(GT② §2) |
| `THREAT_BLOCKED` | **ABSENT** | Threat Intelligence 부재. SSRF/rate-limit(`index.php:527-570`)은 방어 프리미티브·별개 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **표준 에러 봉투 단일화**: 7코드는 HTTP status + `code` + 재시도 지시(step-up/re-auth challenge URL)를 일관 반환. 요청별 게이트(`index.php:69-622`)·PDP(3-12)가 발행지점(무중복, ADR D-6).
2. `SESSION_INVALID`는 현행 `userByToken`·유휴 무효화·api_key 만료를 재활용해 코드만 표준화(Extend).
3. `STEP_UP_REQUIRED`/`REAUTH_REQUIRED`는 로그인 MFA(`UserAuth.php:929-980`)를 mid-session step-up으로 확장(ADR D-2)해 발행. 세션 AAL/Trust 저장(신규) 참조.
4. `TRUST_SCORE_TOO_LOW`/`DEVICE_NOT_TRUSTED`/`NETWORK_UNTRUSTED`는 §14 Trust Score·Device/Network Trust Engine(ADR D-1·D-4) 신설 후 발행.
5. `THREAT_BLOCKED`는 순신규 Threat Intelligence(ADR D-7·IOC/feed)에서만 발행. SSRF/rate-limit 재사용 금지.
6. **Fail-closed**: 신뢰신호 미결정은 `TRUST_SCORE_TOO_LOW` 계열로 차단(Unknown≠Trusted). 모든 에러는 SecurityAudit(`SecurityAudit.php:12-68`) 증거화.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- 마케팅 trust/confidence(`Mmm.php:749`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`)는 `TRUST_SCORE_TOO_LOW` 산출원 아님(GT② §B-1).
- 커머스 fraud/risk(`Risk.php:31-55`·`CustomerAI.php:10-18`)·device-sig(`Attribution.php:144-150`)는 `DEVICE_NOT_TRUSTED`/`THREAT_BLOCKED` 원천 아님(GT② §B-2·B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Error Contract = PARTIAL(SESSION_INVALID·STEP_UP_REQUIRED 로그인 재활용) / ABSENT(TRUST_SCORE_TOO_LOW·DEVICE_NOT_TRUSTED·NETWORK_UNTRUSTED·REAUTH_REQUIRED·THREAT_BLOCKED 순신규).** 재활용: `userByToken`·유휴 무효화·로그인 MFA 401·SecurityAudit. 선행: Trust Score·Device/Network Trust·mid-session Step-up·Threat Intel 신설 후 표준화. 코드 변경 0·BLOCKED_PREREQUISITE.
