# GeniegoROI Claude Code Implementation Specification

# CCIS Part012 — Authentication, Authorization & Security Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

인증·인가·보안 구현 표준을 수립한다.

> ★**성격(Part001~011 과 부분 상이)**: 보안은 이 저장소의 **핵심 역량**(헌법 9원칙 "은행급 보안")이며,
> 앞선 Part 들(부재 스택)과 달리 **보안 스택 대부분이 실재·강력하다.** 명세의 Zero Trust·Least
> Privilege·RBAC·MFA·SSRF/SQLi/XSS 방어·암호화·Audit 는 **대체로 준수**한다. 다만 **JWT-메인인증·
> Vault Secret Manager·traceId·OpenTelemetry** 는 설계상 다르거나 부재다. 실측 → 매핑 → 준수/미적용
> 판정 후, **명세 §33 `composer audit`(의존성 취약점 감사)를 품질 게이트에 상시 편입**했다(실 개선).

---

## 2. 실측 — 현행 보안 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| 비밀번호 | Argon2id/bcrypt·평문금지 | ★**`password_hash(PASSWORD_DEFAULT)`(bcrypt)** 93·`password_verify` 12·**평문 0** |
| 세션 인증(메인) | JWT | **세션토큰**(`user_session`) — ★**`hashToken(입력)` 조회**(raw 비교 시 전면 401+replay·289차후속 P0 수정·배포) |
| API Key | Prefix·Scope·Rotation·평문금지 | **api_key**(Bearer·**SHA-256 해시 저장**·RBAC role/scope·prefix) |
| RBAC | Role 설계 | ★**강함**(398 — `writeGuard` 서버전역·`auth_role`·viewer<connector<analyst<admin·scope) |
| ABAC | 속성 기반 | **실재**(`evaluatePolicy` 30 — 고액/외부송출 정책·289차 high_value 게이트) |
| MFA | TOTP/WebAuthn/OTP | ★**실재**(TOTP 23·WebAuthn/FIDO2 6·OTP 45·MFA 87·admin MFA 게이트) |
| OAuth2/OIDC | Auth Code/PKCE·서명검증 | **채널연결·SSO**(Google/MS·`OAuth` 핸들러) |
| Secret 관리 | Vault/SM | **`.env`(gitignore) + `Crypto`(openssl AES) 테넌트 자격증명 암호화**(Part006). Vault 아님 |
| 암호화 | TLS·AES-256 | HTTPS(TLS)·`Crypto` AES·`openssl_*`(로컬 활성화 P1) |
| SSRF 방어 | Allow-list·내부IP 차단 | ★**실재**(내부IP 차단 36·allow-list 14·279차 Alerting SSRF 수정) |
| SQLi | Prepared | ★**준수**(PDO prepared·요청값 직접 SQL 금지) |
| XSS/CSRF | Encoding·CSRF Token | XSS 방지·**토큰기반 Bearer API 라 CSRF 내성**(쿠키세션 최소·csrf 3) |
| Audit | 불변 로그 | ★**`SecurityAudit`(해시체인·`::verify()`=유일 tamper-evident 정본·tamper-proof 아님)**·`action_request`·`menu_audit_log`·`ai_call_log` |
| 의존성 취약점 | composer audit | ★**"No advisory found"(0)** — 본 차수 게이트 상시 편입 |
| Monitoring | OTel/SIEM | `SystemMetrics` 프로브(정직 미산출 null)·`Compliance` SIEM 포워더. OTel 아님 |
| traceId | 전 로그 | **부재**(Part011) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Zero Trust/Least Privilege/Fail Secure/Immutable Audit) | **대체로 준수** | 요청 불신·RBAC·`writeGuard` fail-secure·SecurityAudit. ★단 DB app 계정=root(Part009 §6 최소권한 예외) |
| §4 인증 방식 | **부분/상이** | 메인=세션토큰·api_key. JWT/mTLS 는 목적한정/부재 |
| §5 JWT | **부분** | VAPID 등 목적한정. 메인 아님 |
| §6 Refresh Token | **상이** | 세션토큰 갱신·유휴 로그아웃(262차). Refresh/Access 분리 아님 |
| §7~§8 OAuth2/OIDC | **부분 준수** | Google/MS SSO·ID Token 검증. PKCE 부분 |
| §9 API Key(SHA 저장·scope) | **★준수** | SHA-256 해시·RBAC scope·prefix |
| §10~§12 Authz/RBAC/ABAC | **★강하게 준수** | role/scope·per-action isMaster·`evaluatePolicy`·writeGuard 서버전역 |
| §13 MFA | **★준수** | TOTP/WebAuthn/OTP·admin 게이트 |
| §14 Session(HttpOnly/SameSite/fixation) | **부분** | 토큰기반(localStorage)이라 쿠키세션 최소. 유휴/자동 로그아웃·세션 격리 준수 |
| §15 Password(Argon2id/bcrypt·평문금지) | **★준수** | `password_hash` PASSWORD_DEFAULT·평문 0 |
| §16 Secret Manager | **부분(대체)** | `.env`+`Crypto`. Vault/SM 부재. 코드 하드코딩 금지 준수 |
| §17 Key Rotation | **부분** | SSH/DB 비번 회전 절차(수동·양.env 동시갱신). 자동 rotation 아님 |
| §18 암호화(TLS/AES-256) | **준수** | HTTPS·Crypto AES·openssl |
| §19 개인정보(Masking/최소노출) | **준수** | 집계 코호트 설계(PII 미저장 원칙)·로그 PII 금지 |
| §20 TLS(HSTS/리다이렉트) | **준수** | HTTPS·nginx TLS |
| §21 OWASP Top10 | **★대응 이력 다수** | 287~289차 전수감사로 SQLi/IDOR/SSRF/authz/XSS/RNG/TOCTOU 수정·배포 |
| §22 CSRF | **부분/내성** | 토큰기반 Bearer(쿠키 아님)→CSRF 내성. Origin/CORS 검증 |
| §23 XSS | **준수** | 입력검증·인코딩·sanitize |
| §24 SQLi | **★준수** | Prepared·바인딩·문자열 SQL 금지 |
| §25 SSRF | **★준수** | 내부IP 차단·allow-list(279차) |
| §26 File Upload | **부분** | MIME/확장자/size 검증·MediaHost 경로분리(278차) |
| §27~§28 Audit/Security Logging | **부분 준수** | SecurityAudit·action_request·ai_call_log. traceId/구조화 로그 부분 |
| §29 Security Monitoring | **부분** | SystemMetrics·Compliance SIEM·brute-force 가드. OTel/token-reuse 탐지 부분 |
| §30~§31 Secure Coding/PHP(strict_types·password API·middleware) | **부분 준수** | strict_types 93%·password API·API-key/CORS 미들웨어 |
| §33 검증(composer audit) | **★준수(본 차수 게이트 편입)** | `make quality` §7 에 composer audit 추가 |

---

## 4. 확립된 표준 (신규 보안코드가 따를 정본)

- **세션 인증**: `user_session` 조회는 **반드시 `hashToken(입력)`**(raw 금지 — raw/sha256 둘 다 64-hex 라 형식판별 불가·실측 필수). replay 방지.
- **API 인증**: api_key = Bearer·**SHA-256 해시 저장**·RBAC role/scope. 공개경로는 `index.php` bypass 목록(+`/api` alias 변형).
- **인가**: RBAC(role/scope) + per-action 세분화(`isMaster`) + **`writeGuard` 서버 전역**(쓰기 fail-secure). 고액/외부송출은 **서버측 `evaluatePolicy` 게이트**(직접 publish 우회 금지·289차). AdminMenu required_role↔rank 데드락 주의.
- **비밀번호**: `password_hash(…, PASSWORD_DEFAULT)`·`password_verify`. 평문·약한해시 금지.
- **Secret**: 인프라=`.env`(gitignore). 테넌트 자격증명=**`Crypto`(openssl AES) 암호화 저장·복호는 사용시점**. 하드코딩·로그노출 금지(203·credentials 정책).
- **MFA**: 관리자 TOTP/WebAuthn·OTP throttle. 헤드리스 재현 시 MFA/토큰비영속 트랩 주의.
- **SSRF**: 외부 URL 은 allow-list·내부IP(127/169.254/10.x) 차단·DNS 검증.
- **SQLi/XSS**: PDO prepared·바인딩·출력 인코딩·sanitize. 요청값 직접 SQL/경로/명령 금지.
- **Audit**: 승인/권한/보안 이벤트=`SecurityAudit`(해시체인·`::verify()`가 유일 무결성 정본). 중복 감사엔진 금지. ★해시체인은 **탐지만·차단 못함**(append-only 코드규율 의존).
- **의존성**: `composer audit` 게이트(§33) — 신규 의존성 취약점 상시 차단.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **JWT 메인 인증·Refresh/Access 분리** — 안 함. 세션토큰(`hashToken`)이 정본. JWT 전환=인증 전면 재작성·세션 P0 회귀 위험.
2. **Vault/AWS Secret Manager** — 안 함. `.env`+`Crypto` 가 정본(Part006). SM 도입=인프라 결정.
3. **자동 Key Rotation·mTLS·FIDO2 전면** — 안 함. 수동 회전 절차·TOTP/OTP 위주. 부분 WebAuthn.
4. **traceId·OpenTelemetry 분산추적** — 안 함(Part011). SystemMetrics·SIEM 부분.
5. **DB app 최소권한 계정** — 미변경(Part009 §6 — root 사용·운영변경이라 승인 대상·권고만).

★**준수하는 실 원칙(강함)**: Least Privilege(RBAC/writeGuard)·Fail Secure·Immutable Audit(해시체인)·Prepared(SQLi)·SSRF 방어·MFA·평문금지·OWASP 대응(287~289차).

---

## 6. ★실 개선 — composer audit 게이트 편입 (§33)

- `scripts/quality/check-code-quality.sh` **§7 신설**: `composer audit`(backend 의존성 CVE/advisory 감사). 취약점 발견 시 **FAIL**, composer 미설치(로컬) 시 **WARN**(CI/원격에서 작동).
- 현재 결과: **"No security vulnerability advisories found"**(취약 의존성 0). → 신규 의존성 추가 시 상시 차단.
- `make quality` 로 ESLint·PHP구문·Shell·JSON·Git·PHPStan **+ composer audit** 통합 실행.

---

## 7. Claude Code 구현 규칙

1. ★**세션 조회=`hashToken(입력)`**(raw 금지·replay). 쓰기=RBAC+`writeGuard`. 고액/외부송출=서버 `evaluatePolicy`.
2. **비밀번호=`password_hash`**·평문 금지. api_key=SHA-256 저장.
3. **Secret 하드코딩·로그노출 금지**. 테넌트 자격증명=`Crypto` 암호화. `.env` 커밋 금지(Part006).
4. **PDO prepared·바인딩**(SQLi). 출력 인코딩(XSS). 외부 URL allow-list·내부IP 차단(SSRF).
5. 감사=`SecurityAudit` 재사용(중복엔진 금지). ★해시체인=탐지용(차단 아님).
6. **인증 우회·권한검증 생략·Debug 노출·민감정보 로그 금지**. 신규 의존성은 `composer audit` 통과.
7. JWT-메인/Vault/OTel 를 "명세에 있다"는 이유로 이식하지 않는다(기존 세션·Crypto 유지).

---

## 8. Completion Criteria

- [x] 인증(세션토큰·api_key)·JWT·OAuth/OIDC·MFA **실측**
- [x] RBAC/ABAC/writeGuard/evaluatePolicy·Password·Secret(.env+Crypto)·SSRF·SQLi/XSS·Audit 실측
- [x] 명세 §3~§33 **섹션별 매핑·판정**(대체로 준수 + 설계상 미적용 사유)
- [x] ★**composer audit 게이트 편입**(§33·§6) — 취약 의존성 0 확인
- [x] 확립된 보안 표준 성문화(§4) + Claude Code 규칙(§7)
- [x] 의도적 미적용 + 사유(§5) · `make quality` 통과(8 PASS)

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 강한 보안 스택(세션 hashToken·RBAC/writeGuard·Crypto·SecurityAudit·SSRF)의 성문화 + 의존성 감사 게이트 편입이지, JWT/Vault 이식이 아니다.

---

## 다음 Part

**CCIS Part013 — Exception Handling, Error Code & Logging** — ★사전 경고: 예외=`\Throwable` catch→`{ok:false,error}`(custom exception 계층 부재·Part008). 로깅=`SecurityAudit`/`ai_call_log`/에러로그(traceId·OTel 부재·Part011). Part013 도 실측→매핑→기존 예외/로깅 규약 성문화.
