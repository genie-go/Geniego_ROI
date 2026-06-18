# SECURITY_REVIEW.md

GeniegoROI 보안/컴플라이언스/엔터프라이즈 준비도 점검 — 기준 HEAD `ec389a9` (231차)

방법: 코드 read-only 감사(index.php 미들웨어·UserAuth·Crypto·Db·ChannelCreds 등) + 본 세션 직접 검증.

## 점검 매트릭스

| # | 항목 | 상태 | 위치 | 비고 / 갭 | 우선 |
|---|------|------|------|----------|------|
| 1 | Multi-Tenant Isolation | ✅ 견고 | `index.php`(X-Tenant-Id 강제 주입·위조무시) · prod/demo DB 물리분리 | 비즈니스 40+ 테이블 tenant_id. app_user tenant_id 14명 전원(231차 검증) | 낮음 |
| 2 | RBAC | ✅ | `index.php`(api_key role viewer<connector<analyst<admin + scopes) · UserAuth(team_role owner/manager/member) · 하위관리자 admin_menus | 자원별 세밀도는 메뉴 단위 | 중 |
| 3 | 하위관리자 view/edit | ✅ 설정 | UserAuth `admin_menus`={경로:'view'\|'edit'}(231차 #4) · AuthContext `adminMenuLevel` | **페이지별 읽기전용 강제는 점진**(adminMenuLevel 제공까지) | 중 |
| 4 | ABAC | ❌ 없음 | — | 속성기반(테넌트·자원·시간) 게이트 부재 | 높음 |
| 5 | MFA | ✅ | UserAuth(TOTP+복구코드·Email/SMS/Kakao OTP, 189차) | admin 강제 활성 기본값 검토 | 중 |
| 6 | SSO Ready | ⚠ 부분 | `OAuth.php`(v425 프레임워크) | IdP(SAML/OIDC) 연동 미구현 | 높음 |
| 7 | API Key | ✅ | `index.php`(SHA-256 해시 조회·평문 미저장) | — | 낮음 |
| 8 | Credential 암호화 | ✅ 견고 | `Crypto.php`(AES-256-GCM, enc:v1: 접두·GCM 태그 변조감지) | channel_credential.key_value 등 | 낮음 |
| 9 | OAuth Token 암호화 | ⚠ 의심 | `connector_token`(access/refresh) | **평문 의심 → Crypto 적용 확인/적용 필요** | 높음 |
| 10 | 민감데이터 마스킹 | ✅ | UserAuth.maskEmail · ChannelCreds.mask(4+…+2) | 로그 출력 경로 마스킹 범위 확인 | 중 |
| 11 | PII 안전 | ✅ | Reviews/Connectors SHA-256 해시 · 집계전용(PII 미저장 설계) | — | 낮음 |
| 12 | SQLi 방어 | ✅ 견고 | 전역 PDO prepared+execute([]) · 문자열치환 0 | — | 낮음 |
| 13 | XSS 방어 | ⚠ 부분 | React 기본 escape · CORS whitelist | CSP 헤더 미확인 | 중 |
| 14 | CSRF 방어 | ⚠ 부분 | CORS preflight(OPTIONS) | **CSRF 토큰/SameSite=Strict 미적용** | 중 |
| 15 | Rate Limit | ⚠ 부분 | UserAuth(로그인 5회·계정복구 IP throttle) | **일반 API throttle 없음(DDoS)** | 높음 |
| 16 | Webhook 검증 | ✅ | `Crypto.hmacTag`(용도분리 서브키·HMAC-SHA256) | — | 낮음 |
| 17 | Audit Log | ✅ | `audit_log`+`Db::audit`(231차) · Audit.jsx(CSV·리스크등급) | **변경 전/후 diff·장기보존 정책** 미흡 | 중 |
| 18 | Agent Action/Decision Trace | ⚠ 부분 | optimization_log·audit_log | AI 에이전트 의도/근거 추적 표준화 | 중 |
| 19 | Admin 권한분리 | ✅ | master/sub · 마스터 백도어 제거(188차, env만) | sub 자원별 제어 점진 | 중 |
| 20 | 비밀번호 정책 | ✅ | UserAuth passwordPolicyError(8자+3종+사전차단, 204차) | — | 낮음 |
| 21 | 세션 쿠키 보안 | ⚠ 미확인 | user_session(토큰) | HttpOnly/Secure/SameSite 속성 확인 필요 | 높음 |
| 22 | 에러 정보노출 | ✅ | 189차 에러 trace 제거 | 로그레벨별 정책 명시 | 중 |
| 23 | API 응답 표준 | ⚠ 비표준 | `TemplateResponder`(단순 json)·경로별 혼재 | `{success,data,message,error,meta}` 봉투 미준수 | 중 |

## 강점 요약
멀티테넌트 격리(X-Tenant 강제)·AES-256-GCM 자격증명 암호화·SHA-256 API키·PDO 100%(SQLi 0)·MFA·RBAC·로그인 rate-limit·HMAC webhook·마스터 백도어 제거·비번정책.

## 우선 보강(높음)
1. **OAuth 토큰 암호화**(connector_token → Crypto::encrypt) — 평문 의심 즉시 검증.
2. **일반 API rate-limit**(index.php 미들웨어 엔드포인트 throttle).
3. **세션 쿠키 보안**(HttpOnly/Secure/SameSite) 확인·강제.
4. **CSRF 토큰 / SameSite=Strict**.
5. **ABAC / SSO Ready**(대규모 조직).

## DB/마이그레이션 안전(준수 확인)
- 본 세션 모든 변경 = backward-compatible ALTER ADD COLUMN(멱등 try/catch) 또는 SSOT 헬퍼. **DROP TABLE/컬럼삭제 0**. 락게이트 우회 방어 ALTER. → `DB_MIGRATION_NOTES.md`.

---

## 정정 (231차 OS 디렉티브 재검증 — 오탐 수정)
- **#9 OAuth Token 암호화: ✅ 이미 적용**(오탐 정정). `Connectors.php:127-130` 쓰기 시 `Crypto::encrypt`(AES-256-GCM)로 access_token/refresh_token/meta_json 암호화(225차 P1-13), 읽기 `Crypto::decrypt` passthrough(레거시 평문 호환). connector_token 평문 아님.
- **#14 CSRF / #21 세션쿠키: 사실상 무관(정정)**. 인증=Bearer 토큰(localStorage)+`Authorization` 헤더 방식(쿠키 세션 아님). 브라우저가 교차출처에 Authorization 헤더를 자동 전송하지 않으므로 CSRF 비취약. SameSite/HttpOnly 쿠키 항목 비해당. → CORS whitelist(기존)로 충분.
- **결론**: 보안 '높음' 갭 중 OAuth암호화=완료·CSRF/쿠키=무관 → 실제 잔여=일반 API rate-limit(핫패스·신중), ABAC/SSO(대규모 조직·전향적), 응답 표준봉투(점진). 보안 posture는 검증 결과 **강건**.

## 보강 적용 (231차 — nginx 레벨 일반 API rate-limit)
- **#15 일반 API rate-limit: ✅ 적용**. nginx.conf 에 이미 정의돼 있던(미적용 상태) `limit_req_zone ... zone=api_limit:10m rate=30r/s` 를 운영/데모 vhost 의 API location 2곳(`^/api(/|$)`, `^/(auth|v3..v427)`)에 `limit_req zone=api_limit burst=120 nodelay; limit_req_status 429;` 로 적용.
  - 키=`$binary_remote_addr`(IP별). 30r/s + burst120 → SPA 대량호출·동시사용 무영향, 지속 남용/DDoS만 429.
  - 기존 방어 병행: `limit_conn perip 50`(IP당 동시연결), 로그인 `login_limit`(30r/m·burst10).
  - 검증: login_limit 45동시→38×429(기구 작동 확인) · api_limit 220동시 정상요청→0차단(무후퇴) · nginx -t 통과·reload·실패시 자동복원(.bak_20260618_ratelimit).
- **실 잔여 보안(전향적)**: ABAC·SSO(SAML/OIDC)·응답 표준봉투 전면적용. (CSP 헤더는 security_headers.conf 기존 적용.)
