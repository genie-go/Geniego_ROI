# GeniegoROI Claude Code Implementation Specification

# CCIS Part011 — API Design Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

REST API 설계·구현 표준을 수립한다.

> ★**성격(Part001~010 과 동일)**: 사용자가 Part011 명세(`/v1/` semantic versioning·`{success,data,meta,
> traceId}` 응답·JWT 인증·OpenAPI 3.1·Idempotency-Key·Cursor Pagination·Redis Rate Limiter)를
> 제공했으나 **그대로 따르지 않았다.** 실측 결과 이 저장소 API 는 **`routes.php` 문자열매핑 +
> `/v{NNN}` 버전접두 + `{ok:...}` 응답 + 세션토큰 인증**이 정본이며, JWT-메인인증·OpenAPI·traceId·
> Idempotency-Key·Cursor 는 부재/부분이다. **응답 shape·URI 변경은 프론트 전면 파괴**(§19 URL 변경
> 금지). Part001 §4 에 따라 **실측 → 매핑 → 부재 증명 → 실재 API 규약을 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 API 현실

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| URI/버전 | `/v1/orders` semantic | **`/v{NNN}/...`(v377~v428+·버전접두) + `/api/...`**. kebab-case resource. `routes.php` 문자열매핑(autodiscovery 없음) |
| 응답 성공 | `{success,data,meta,traceId}` | **`{ok:true, ...}`**(2913회·평면). `success`=5(예외) |
| 응답 실패 | `{success:false,error:{code,message},traceId}` | **`{ok:false, error:'...'}`**(문자열 or 코드) |
| traceId | 전 응답 포함 | **부재**(0) |
| 인증(메인) | JWT Bearer | **세션토큰**(`user_session`·`hashToken` 145) — ★raw 아니라 **`hashToken(입력)` 조회**(289차후속 P0) |
| 인증(프로그램) | — | **api_key**(Bearer key·SHA-256·RBAC role/scope: viewer<connector<analyst<admin) |
| JWT | 메인 인증 | **목적한정**(VAPID 웹푸시 등 41·`/creatives`)·메인 아님 |
| OAuth2 | Authorization Code/PKCE | **채널 연결·SSO**(`OAuth` 핸들러·`admin/oauth-apps`). Client Secret=DB/`.env` |
| Rate Limiting | Redis Limiter·429 | **실재(비Redis)** — OTP throttle·brute-force 가드(Approvals/DataSchema)·`SecurityGuard`. 중앙 Redis 아님 |
| Idempotency | `Idempotency-Key` 헤더 | **헤더 사실상 부재(1)** → **COALESCE dedup**(재수집이 수기 덮지 않음·290차) + 웹훅 토큰으로 대체 |
| Webhook | HTTPS+Signature+Retry | ★**서명 검증 강함**(`GENIE_WEBHOOK_SECRET`·`hash_hmac` 166)·HTTPS |
| OpenAPI 3.1 | 전 API 문서·CI 검증 | **부재**(openapi.yaml 0·`@OA` 0). 문서=챗봇 지식/라우트 |
| Pagination | Cursor 권장 | **limit/offset**(limit 72·page/size 15). cursor **0** |
| Status Code | 표준 | **준수**(200/201/401/403/404/422/429/500 사용) |
| Security | HTTPS/TLS/prepared/CORS | **준수**(prepared·CORS·API-key 미들웨어·RBAC) |
| Multi-Tenant | tenant 검증 | ★**강하게 준수**(`X-Tenant-Id` 주입·전 쿼리 tenant_id) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(RESTful/Stateless/Backward Compatible/Multi-Tenant) | **부분 준수** | Resource 중심·Stateless(토큰)·하위호환(버전접두 유지)·Multi-Tenant 준수. Trace 는 부재 |
| §4 URI(kebab·복수형·동사금지) | **준수** | kebab-case·복수형·동사 없음. 단 버전=`/v{NNN}` |
| §5 HTTP Method | **준수** | GET/POST/PUT/PATCH/DELETE |
| §6~§7 Resource/계층 | **부분** | resource 명명 준수. Controller=정적 핸들러(Part007) |
| §8~§9 Request/Response DTO | **미적용** | DTO 클래스 부재. 입력=`getQueryParams`/`getParsedBody` 배열·출력=배열→`self::json` |
| §10 Response 구조(success/data/meta/traceId) | **미적용(실 표준 상이)** | 정본 `{ok, ...}` 평면·traceId 없음. 변경=프론트 전면 파괴(§19) |
| §11 Status Code | **준수** | 표준 코드 사용 |
| §12 Validation | **부분** | 핸들러 early-return 검증(Fail Fast)·화이트리스트. DTO/Domain 이중검증 계층 아님 |
| §13 Versioning(/v1 semantic) | **상이** | `/v{NNN}` 순번접두(하위호환 stub 유지). Breaking=새 버전접두 |
| §14 Pagination(Cursor) | **부분** | limit/offset·clamp. cursor 아님 |
| §15~§16 Filtering/Sorting(화이트리스트) | **부분 준수** | 정렬/필터는 화이트리스트·바인딩(문자열 SQL 금지 준수) |
| §17 Search | **부분** | 키워드 검색은 LIKE/집계. FTS/Elasticsearch 아님 |
| §18 JWT | **부분/상이** | 메인=세션토큰. JWT=VAPID 등 한정 |
| §19 OAuth2 | **부분** | 채널 연결·SSO. PKCE 부분 |
| §20 Authorization | **★준수** | API-key RBAC(role/scope)·admin 세션·per-action isMaster·writeGuard 서버전역(289차후속) |
| §21 Idempotency-Key | **미적용(대체)** | COALESCE dedup·웹훅 토큰. 헤더 표준 아님 |
| §22 Rate Limiting | **부분(비Redis)** | OTP throttle·brute-force 가드·SecurityGuard |
| §23~§24 Upload/Download | **부분** | MediaHost(로컬)·이미지 검증. Presigned/Range 부분 |
| §25 Webhook | **★준수** | HTTPS·`hash_hmac` 서명 검증·토큰 |
| §26 OpenAPI 3.1 | **미적용** | 부재. 문서=챗봇 지식/라우트 매핑 |
| §27 API Logging | **부분** | 감사(`SecurityAudit`·`ai_call_log`)·에러 로그. traceId/구조화 로그 부분 |
| §28 API Monitoring(OpenTelemetry) | **미적용** | OTel 부재. `SystemMetrics` 프로브(정직 미산출 null) |
| §29 API Security(HTTPS/CORS/SQLi/XSS) | **준수** | prepared·CORS·입력 불신·XSS 방지 |
| §30 PHP(DTO/Transformer/PSR-12) | **부분** | PSR-4·prepared. DTO/Transformer 미사용 |
| §32 검증(openapi validate/artisan route:list) | **대상 없음** | OpenAPI/artisan 부재. phpstan·routes.php |

---

## 4. 확립된 표준 (신규 API 가 따를 정본)

- **URI**: 신규는 **최신 `/v{NNN}/` 버전접두** + 실배선 `/api/` 병기(nginx SPA 폴백 착시 회피). kebab-case·복수형·동사 금지. **기존 URL 변경 금지**(§19).
- **등록**: `routes.php` 에 `'METHOD /v{NNN}/path' => 'Genie\\Handlers\\{Name}::{action}'`(미등록=미배선).
- **응답**: **`{ok:true, ...}` / `{ok:false, error:'...'}` 평면**. 신규도 이 shape 유지(프론트 계약). `self::json($res,[...],$status)`.
- **Status**: 표준 코드(401 인증·403 권한·404·422 검증·429 rate·409 충돌).
- **인증**: 세션=`user_session` **★`hashToken(입력)` 조회**(raw 금지·289차후속 P0). 프로그램=api_key(Bearer·SHA-256·RBAC role/scope). ★공개경로는 `index.php` bypass 목록 + `/api` alias 변형 **둘 다** 등록.
- **인가**: RBAC(role/scope)·per-action 세분화(isMaster)·**writeGuard 서버 전역**(쓰기 fail-secure). ★고액/외부송출은 서버측 승인 게이트(evaluatePolicy 우회 금지·289차).
- ★**Multi-Tenant**: `X-Tenant-Id` 주입·전 쿼리 tenant_id. **요청시점 tenant 해석에 전역상태 금지**(act-as 하이재킹 트랩).
- **Webhook**: HTTPS·`hash_hmac`(`GENIE_WEBHOOK_SECRET`) 서명 검증 필수·토큰. Payload 버전 명시.
- **Idempotency**: 수집/재수집은 **COALESCE dedup**(수기 입력 덮지 않기)·웹훅 토큰. 결제/정산은 상태·유니크로 중복차단.
- **Validation**: early-return(Fail Fast)·화이트리스트·바인딩. 동적 정렬/필터는 허용컬럼만.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **`{success,data,meta,traceId}` 응답·traceId 전면 도입** — 안 함. 정본 `{ok,...}`(2913). 변경=프론트 `apiClient`·전 페이지 계약 파괴(§19). traceId 는 관측성 개선 여지(권고).
2. **JWT 메인 인증 전환** — 안 함. 세션토큰(`hashToken`)이 정본. JWT 전환=인증 전면 재작성·세션 P0 회귀 위험.
3. **OpenAPI 3.1 문서·CI 검증** — 안 함. 부재. 도입 시 라우트→스펙 생성 별도 과제(대규모).
4. **Idempotency-Key 헤더·Cursor Pagination·Redis Rate Limiter** — 안 함. COALESCE dedup·limit·비Redis throttle 로 대체. Redis 부재(Part006).
5. **Request/Response DTO·Transformer** — 안 함(Part007/008). 배열+`self::json` 정본.

★**준수하는 실 원칙**: RESTful·표준 Status·Multi-Tenant·RBAC/writeGuard·Webhook 서명·Prepared·CORS·XSS/SQLi 방지.

---

## 6. Claude Code 구현 규칙

1. 신규 API = `Handlers/{Name}` 정적 메서드 + `routes.php`(`/v{NNN}`+`/api`) 등록. **응답 `{ok,...}` shape 유지**.
2. ★**공개경로는 `index.php` bypass 목록에 추가**(+`/api` alias 변형). 그 외는 인증 필요.
3. ★**세션 조회는 `hashToken(입력)`**(raw 금지·replay 위험). 쓰기는 RBAC+writeGuard.
4. ★**전 쿼리 tenant_id·`X-Tenant-Id`**. 요청시점 tenant 전역상태 금지.
5. Webhook 은 `hash_hmac` 서명 검증. 결제/정산은 idempotent(상태/유니크/COALESCE).
6. 표준 Status Code·화이트리스트 검증·바인딩. Entity(배열) 직접 반환은 민감필드 제거 후.
7. JWT-메인인증·OpenAPI·traceId·Cursor·Redis Limiter 를 "명세에 있다"는 이유로 이식하지 않는다(기존 계약 유지).

---

## 7. Completion Criteria

- [x] API **실측**(routes.php·/v{NNN}·`{ok}` 응답·세션토큰·rate limit·webhook 서명·pagination)
- [x] 명세 §3~§32 **섹션별 매핑·판정**(JWT-메인/OpenAPI/traceId/Idempotency-Key/Cursor 부재 증명)
- [x] 실 API 규약(URI·응답·인증·인가·webhook·tenant) 성문화(§4)
- [x] Authorization(§20)·Webhook(§25)·Security(§29)·Multi-Tenant 준수 명시
- [x] 의도적 미적용 + 사유(§5)
- [x] Claude Code 규칙(§6·hashToken·bypass·tenant·writeGuard) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 `/v{NNN}` + `{ok}` + 세션토큰 API 규약의 성문화이지 JWT/OpenAPI 이식이 아니다.

---

## 다음 Part

**CCIS Part012 — Authentication, Authorization & Security (JWT/OAuth2/RBAC/ABAC/MFA/OWASP)** — ★사전 경고: 메인 인증=**세션토큰**(`user_session`·hashToken·JWT 아님). RBAC(api_key role/scope)·ABAC·MFA·writeGuard·SecurityAudit·Crypto 는 실재(287~289차). Part012 는 실측→매핑→기존 보안 스택 성문화 + 실 갭 있으면 수정(보안은 게이트가 실결함 노출한 이력 다수).
