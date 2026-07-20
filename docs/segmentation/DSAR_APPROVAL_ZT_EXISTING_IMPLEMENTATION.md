# DSAR — Zero Trust & Continuous Authorization: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> 본 문서는 Part 3-13 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/public/index.php`·`backend/src/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: session/device/network/environment trust·MFA/step-up/reauth·continuous·trust score·threat·behavior·risk 다중 grep + 인증 코어(UserAuth/index.php/Db) 정독. 2 Explore 스레드(35 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**Zero Trust "Never Trust, Always Verify" 지속 인가(Continuous Authorization)는 부재(ABSENT)다.** 현 substrate는 **로그인 경계(perimeter-at-login) 인증 + 요청별 정적 RBAC/ABAC 재검증** 모델이다.

- **인가는 요청마다 재계산**되나(세션캐시 고정 아님·`index.php:69-622`·`userByToken`), **재계산 입력은 자격증명·plan tier·team_role·api_key scope로 국한**된다. **컨텍스트 변화(risk/device/threat/behavior)가 인가 결정에 진입하는 지점 없음.**
- **부재**: Trust Score·Device Trust·Network 신뢰등급·Threat Intelligence·Adaptive/Risk-based Authorization·위험기반 mid-session step-up·Continuous re-authentication·세션 AAL 저장·Behavior UEBA(authz).
- **재활용 substrate**: 세션(TTL/idle/MFA)·step-up MFA(로그인 OTP/TOTP/복구코드)·recordSessionMeta(ip/ua raw)·break-glass·SecurityAudit(증거)·agency 링크 매요청 재검증(continuous verification 선례). 실 엔진은 이 위에 신뢰신호 결합 trust engine을 **신설(Extend)** 한다.

## 2. 실존 substrate 카탈로그

### A. Session Trust (PRESENT/PARTIAL — 신선도 재검증)

| 파일:라인 | 심볼 | 설명 | ZT 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:249-286` · `:266-268` | `userByToken`(user_session JOIN·`expires_at>now AND is_active=1`) | 매 요청 토큰·세션·계정활성 재검증(토큰 해시저장) | Session Trust(freshness) |
| `backend/src/Handlers/UserAuth.php:986` · `:606` · `:990` · `:609` · `:989` · `:4261` | 세션 TTL 30일·발급·만료삭제 | Session Age/TTL | Session Trust |
| `backend/src/Handlers/UserAuth.php:206-213` · `:288-311` · `:302-305` · `:308-310` | 유휴 자동로그아웃(`last_seen_at`·`auto_logout_min`·60s throttle) | 서버측 idle 무효화(유일 "지속검증" 성격·authn) | Continuous Verification(부분) |
| `backend/src/Handlers/UserAuth.php:4232-4251` · `:4247` | `recordSessionMeta`/`ensureSessionMeta`(ip/ua/last_seen) | ip=clientIp·ua 255자 **기록만·authz 미반영** | Device/Network raw material |
| `backend/src/Handlers/UserAuth.php:4253-4298` | `listSessions`·`revokeOtherSessions`(토큰 마스킹·타기기 폐기) | 동시세션 목록/수동폐기(**제한/차단 없음**) | Concurrent Session(부분) |

### B. Step-up / MFA (PRESENT — 로그인 시점)

| 파일:라인 | 심볼 | 설명 | ZT 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:929-980` · `:941` · `:957` · `:973` · `:977` | 로그인 MFA·`mfaPolicy`·OTP 챌린지·`mfa_required` 401·`issueLoginOtp`(`:972`·`:3997`) | 로그인 시점 step-up(락아웃 방지 `:968-970`) | Step-up Auth(로그인) |
| `backend/src/Handlers/UserAuth.php:3566-3592` · `:955-964` · `:3863-3925` · `:3878` · `:959` | `totpAt`/`verifyTotp`(±window)·AES-256-GCM 봉투암호화 | TOTP(RFC6238) | Authentication Strength |
| `backend/src/Handlers/UserAuth.php:3600-3634` · `:961` · `:975` | `mfa_recovery`·`consumeRecoveryCode`(1회성) | 복구코드 | Authentication |
| `backend/src/Handlers/UserAuth.php:3745-3767` · `:942-945` · `:3754-3757` · `:3764-3766` | `mfaPolicy`(max global,tenant·admin/all·완화불가) | 테넌트 MFA 정책 | MFA Status(정책) |
| `backend/src/Handlers/UserAuth.php:793-798` · `:930` · `:945` · `:995-999` · `:998` | break-glass(`GENIE_BREAKGLASS_PW` env·MFA 우회·`auth.breakglass` 감사) | 비상경로 | (예외) |

### C. Network / Environment (PARTIAL — 수집만·비authz)

| 파일:라인 | 심볼 | 설명 | ZT 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:3443-3463` | `clientIp`(X-Real-IP→REMOTE_ADDR→XFF 마지막홉·스푸핑 하드닝) | IP 수집(rate-limit 식별·세션메타·**신뢰등급 산출 없음**) | Network Trust(raw) |
| `backend/src/Db.php:41-60` · `:53` · `:56-60` | `env`/`envLabel`(production/demo) | OTP dev_code 게이트(`UserAuth.php:966`·`:2647`·`:4000`)·데모시드(`Db.php:999`·`:1214`)·**authz 아님**(`:53` 주석 "게이트에 envLabel 금지") | Environment(비authz) |

### D. Runtime 인가 게이트 (요청별 정적 재검증 — PRESENT)

| 파일:라인 | 심볼 | 설명 | ZT 매핑 |
|---|---|---|---|
| `backend/public/index.php:69-622` · `:506-508` · `:518-520` · `:573-597` · `:608-619` | api_key 미들웨어(해시조회·만료·RBAC rank/scope·tenant 주입) | 매 요청 DB 재조회(캐시 없음) | Continuous(재계산·컨텍스트 미반영) |
| `backend/src/Handlers/UserAuth.php:364-374` | `requirePlan`(핸들러마다 userByToken) | plan tier 재검증 | Continuous(authn 신선도) |
| `backend/public/index.php:96-122` | agency 링크 매요청 `status='approved'` 재확인(fail-closed) | 철회 즉시 403 | **Continuous Verification 선례** |
| `backend/public/index.php:72-89` · `UserAuth.php:1134-1167` | `guardTeamWrite`/`requireTeamWrite`(정적 team_role read-only) | 고정 RBAC 게이트(신뢰/드리프트 무관) | Runtime Guard(정적) |

### E. Evidence / Risk 라벨 (PARTIAL — 감사용)

| 파일:라인 | 심볼 | 설명 | ZT 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:4165` · `:4174` · `:4190-4191` · `:4172` · `:4193` | `auth_audit_log.risk`(정적 문자열·`audit()`·`if risk==='high'`→SIEM) | risk=caller 하드코딩 라벨·**인가 결정 미반영**(SIEM 라우팅만) | Risk(비-adaptive) |
| `backend/src/SecurityAudit.php:12-53` · `:56-68` | 해시체인 append-only·verify | tamper-evident 증거 | Trust Evidence(확장 대상) |
| `backend/src/Handlers/Alerting.php:786` · `Compliance.php:411` · `DataExport.php:624` | SSRF 가드(`isSafeWebhookUrl`/`isSafeSiemUrl`/`isPublicHttpsUrl`) | egress 하드닝(**IOC/threat feed 아님**) | (방어 프리미티브·threat intel 아님) |
| `backend/public/index.php:527-570` | rate-limit(api_key 1200/min 정적 카운터) | 남용 차단(**위협 인텔 아님**) | (방어) |

## 3. 종합 판정

**Zero Trust = ABSENT-continuous / PARTIAL-substrate(로그인 경계).** Continuous Authorization/Verification 재인가 트리거·Trust Score·Identity/Device/Session/Network/Environment Trust Engine·Threat Intelligence·Adaptive/Risk-based Authorization·Step-up(mid-session)·Continuous Re-auth·Trust Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Reconciliation·ZT Runtime Guard/Static Lint 전부 순신규. 재활용: 세션(§A)·MFA/TOTP/복구코드(§B)·clientIp/env(§C·비authz)·요청별 게이트·**agency 링크 재검증(continuous 선례·§D)**·SecurityAudit 증거(§E)·risk 라벨(§E·정적). 실 엔진은 recordSessionMeta(ip/ua)를 Device/Network Trust 입력으로 승격하고, 로그인 MFA를 위험기반 mid-session step-up으로 확장하며, 세션에 AAL/Trust Score를 저장해 요청별 게이트에 결합한다(Extend). 마케팅 trust/anomaly/risk(GT②)는 **흡수 금지**.
