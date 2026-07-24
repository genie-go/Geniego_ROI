# CWIS-P004-U04-WS01-SP01-TK001-ST05 — Route & API Search Report

| 항목 | 값 |
|---|---|
| **Specification ID** | `CWIS-P004-U04-WS01-SP01-TK001-ST05` |
| 작업명 | Favorites Existing System Analysis — Route & API Search |
| 선행 Step | ST01~ST04 전부 `READY` / `READY_WITH_LIMITATIONS` |
| Git Branch | `feat/n236-admin-growth-automation` |
| Git Revision (직전) | `423e9e16db3` |
| 검색 엔진 | PHP native (정적 정규식 — 실행·DB·네트워크 0) |
| **완료 상태** | **READY** |

---

## 1. ★핵심 결론

> **즐겨찾기 직접 API 는 0건이다.**
> **다만 ST04 와의 결과 불일치를 발견해 정정했고, 그 과정에서 `saved_report` 의 CRUD 계약 3건을 확보했다.**

- `routes.php` **1,511개 라우트 전수** 파싱 → 즐겨찾기 **직접** 라우트 **0건**
- Handler **119 파일 / 1,423 액션** 전수 스캔 → 즐겨찾기 액션 **0건**
- FormRequest · JsonResource · OpenAPI — **스택에 개념 자체가 부재**(사유 기록)
- **부가 확보**: 신규 즐겨찾기 API 가 통과해야 할 **실제 미들웨어 7단 + 인가 게이트 2종** 인벤토리

---

## 2. ★ST04 ↔ ST05 불일치 발견·정정

ST04 는 즐겨찾기 라우트 **0건**, ST05 초기 실행은 **3건**을 보고했다. 원인을 추적해 정정했다.

| | ST04 패턴 | ST05 패턴 |
|---|---|---|
| `saved` 처리 | `saved(-\|_)?items?` — **접미사 필수** | `saved(?:[-_]items?)?` — **단독 허용** |
| 결과 | 0건 | 3건 (`/reports/saved`) |

**판정**: 명세 §Route 검색 키워드가 `saved` 를 **단독 등재**했으므로 **ST05 패턴이 명세에 충실**하다.
다만 `/reports/saved` 는 **BI 리포트 정의 저장**이지 즐겨찾기가 아니다.

→ `relation` 필드를 도입해 **DIRECT_FAVORITES / RELATED_INFRASTRUCTURE** 로 분리했다.

```
direct_favorites_routes        = 0   ← ST04 결과와 일치(정합 회복)
related_infrastructure_routes  = 3
```

검증기가 **`ST04.favorites_routes === ST05.direct_favorites_routes`** 를 기계적으로 강제한다.
두 Step 이 다시 어긋나면 자동으로 실패한다.

### 2.1 확보한 RELATED 계약 — `/reports/saved`

| Method | URI | Handler | 비고 |
|---|---|---|---|
| GET | `/reports/saved` | `Reports::savedList` | `requirePlan('growth')` · `WHERE tenant_id=?` |
| POST | `/reports/saved` | `Reports::savedCreate` | |
| DELETE | `/reports/saved/{id}` | `Reports::savedDelete` | |

★**설계 시사점**: ST04 가 `saved_report` 테이블에 `user_id` 가 없음을 확인했는데,
API 도 `WHERE tenant_id=?` 만 걸어 **테넌트 전원이 서로의 저장 리포트를 본다**.
게다가 `requirePlan('growth')` 로 **구독 등급 게이트**가 걸려 있다.
즐겨찾기는 **개인 소유 + 등급 무관**이어야 하므로 이 계약을 그대로 따르면 안 된다(ST10 입력).

---

## 3. 필요성 판정 (상시 원칙 적용)

| 명세 요구 | 판정 | 사유 |
|---|---|---|
| Route/Controller 검색 실행 | **IMPLEMENT** | 1,511 라우트 · 1,423 액션 전수가 곧 증거 |
| **Middleware / Authorization 인벤토리** | **IMPLEMENT (확장)** | 즐겨찾기 API 는 0건이나 **신규 API 의 통합 계약**은 실재한다. 이것이 ST05 의 최대 가치 |
| Controller 인벤토리 | **IMPLEMENT** | Handler 가 Controller 등가물. 결과 0이지만 분모(119/1,423)가 증거 |
| `routes/` `app/Http/` `src/Controller/` `modules/` `packages/` `plugins/` `docs/api/` `openapi/` `swagger/` 검색 | **SKIP** | **12개 중 10개 부재**(실측) |
| `Route::get/post/resource` 파서 | **SKIP** | `Route::` 0건. 라우트 정본은 문자열 맵 |
| FormRequest / Validation Rule 인벤토리 | **부재 기록** | `extends FormRequest` **0건**. 검증은 핸들러 인라인 + 422 |
| API Resource / JsonResource 인벤토리 | **부재 기록** | `JsonResource` **0건**. 응답은 배열 → `Shared::json()` (래퍼 봉투 없음) |
| OpenAPI / Swagger 인벤토리 | **부재 기록** | 활성 코드 0건 · `@OA\` 0건. `legacy_v338_pkg` 아카이브에만 존재(scope 제외) |

★**빈 배열로 침묵하지 않았다.** 세 부재 인벤토리는 `available:false` + `reason` + `explanation` + `evidence` 를
담는다. 검증기가 이 4개 필드의 존재를 강제한다.

---

## 4. 실제 API 표면 (실측)

| 명세 전제 경로 | 상태 |
|---|---|
| `routes/` `routes/api.php` `routes/web.php` `routes/admin.php` | **ABSENT** |
| `app/Http` `app/Controllers` `app/Http/Controllers` `src/Controller` | **ABSENT** |
| `modules` `packages` `plugins` | **ABSENT** |
| `docs/api` `openapi` `swagger` | **ABSENT** |

| 실제 표면 | 내용 |
|---|---|
| Router | `backend/src/routes.php` — `'METHOD /path' => 'Class::method'` 문자열 맵 + `$register()` 2블록 |
| Controller | `backend/src/Handlers/**` — **119 파일**, `public static function` = Action (**1,423개**) |
| Middleware | `backend/public/index.php` **인라인 클로저**(미들웨어 클래스 아님) |
| Response | 핸들러가 만든 배열을 `json_encode` — **래퍼 봉투 없음** |
| Rate Limit | **PRESENT** — `api_rate_limit` 테이블 · api_key 별 분당 · fail-open |

---

## 5. ★신규 API 통합 계약 (Part004-04 입력)

### 5.1 미들웨어 체인 7단 (`backend/public/index.php`)

| # | 미들웨어 | 내용 |
|---|---|---|
| 1 | `body_parsing` | Slim `addBodyParsingMiddleware()` |
| 2 | `cors` | `GENIE_ALLOWED_ORIGINS` 인라인 클로저 |
| 3 | `api_key_auth` | SHA-256 해시 → `api_key` 테이블 조회. **★PM 계열(`/v425/pm/*`)은 세션 토큰 bypass** — 즐겨찾기 API 가 세션 인증을 쓰려면 bypass 목록 등재 필요 |
| 4 | `rbac` | `viewer<connector<analyst<admin` + scopes. **★쓰기는 analyst+ 요구** |
| 5 | `rate_limit` | `api_rate_limit` 자가치유 테이블 · 429 + `Retry-After` + `X-RateLimit-Limit` · **fail-open** |
| 6 | `tenant_injection` | `auth_tenant` 속성 + `X-Tenant-Id` 헤더 보강 |
| 7 | `error_middleware` | `addErrorMiddleware(false,true,true)` |

★**설계 경고**: ④ RBAC 이 쓰기(POST/DELETE)에 `analyst+` 를 요구한다.
즐겨찾기는 **일반 사용자가 자기 것을 만드는 개인 기능**이므로, api_key 경로를 쓰면
`viewer` 등급 사용자가 자기 즐겨찾기를 못 만드는 문제가 생긴다.
→ **PM 계열 세션 bypass 경로(`/v425/pm/*`)를 쓰는 것이 정합적**이다.

### 5.2 인가 게이트 2종

| 메커니즘 | 내용 |
|---|---|
| `PM\Shared::gate($req,$resp,$minRole)` | 세션 자체 인증 · **테넌트 격리** · 역할 랭크. **★Part003 이 guest/partner 를 PM 리소스 전면 Default Deny** — 즐겨찾기가 PM 계열이면 외부 협업자 자동 차단 |
| `PlanPolicy` + `plan_menu_access` | 메뉴 단위 구독 등급 게이트. 즐겨찾기는 메뉴가 아니라 개인 설정이므로 **적용 대상인지 판단 필요** |

---

## 6. 검색 통계

| 항목 | 값 |
|---|---|
| `routes.php` 총 라우트(`$custom` 맵) | **1,511** |
| `$register()` 호출 | 3,081 |
| **즐겨찾기 직접 라우트** | **0** |
| RELATED 라우트 | 3 (`/reports/saved`) |
| Handler 파일 | **119** |
| Handler 액션(`public static function`) | **1,423** |
| **즐겨찾기 Controller** | **0** |
| 미들웨어 | 7 (전부 탐지 확인) |
| 인가 게이트 | 2 |
| Raw 매치 | 6 |
| 민감정보 마스킹 | 0 (대상 없음) |

---

## 7. 생성 파일

| 파일 | 내용 |
|---|---|
| `tools/cwis/navigation/scripts/search-favorites-api.php` | 재실행 가능한 정적 검색기 |
| `…/output/favorites-api-raw-results.json` | 원본 6건 + 스택 사실 |
| `…/favorites-route-inventory.json` | 라우트 3건 + DIRECT/RELATED 분리 |
| `…/favorites-controller-inventory.json` | **0건** + 분모(119 파일/1,423 액션) |
| `…/favorites-request-inventory.json` | **부재 + 사유·증거** |
| `…/favorites-response-inventory.json` | **부재 + 사유·증거** |
| `…/favorites-middleware-inventory.json` | **미들웨어 7 + 인가 2 (실재)** |
| `…/favorites-openapi-inventory.json` | **부재 + 사유·증거** |
| `docs/cwis/part004-04/…-st05-api-search-report.md` | 본 보고서 |

---

## 8. 검증 결과

**20 passed, 0 failed**

| 검증 | 결과 |
|---|---|
| JSON 7개 구문 | PASS |
| Route/Raw ID 형식 + **고유성** | PASS |
| **Route 중복 없음** (method+uri) | PASS |
| **Controller 중복 없음** | PASS |
| **Route → Controller 클래스·액션이 실제 존재** | PASS (파일 + `function` 선언 대조) |
| **Route 가 routes.php 해당 줄에 실제 존재**(라인 정합) | PASS |
| file_path 상대·내부·실재 | PASS |
| **Request/Response/OpenAPI 부재가 사유+증거와 함께 기록** | PASS |
| **Middleware 가 실제 탐지된 것만 기록**(`detected=true` 강제) | PASS |
| **Middleware line_number 가 실제 소스 범위 내** | PASS |
| Authorization 게이트가 실제 파일과 연결 | PASS |
| **★ST04 ↔ ST05 정합**(`favorites_routes === direct_favorites_routes`) | PASS |
| **★routes.php 전수 파싱**(총 라우트 독립 재계산) | PASS |
| **★Handler 전수 스캔**(119 = 실제 파일 수) | PASS |
| 토큰/쿠키/시크릿 원문 없음 | PASS (6패턴) |
| 절대경로·개인 디렉터리 없음 | PASS |
| `matched_text` 300자 이하 | PASS |
| **운영 코드 무변경** | PASS |
| **★스크립트가 실행·DB·네트워크를 하지 않음** | PASS (`new PDO`·`curl_exec`·`eval`·`shell_exec` 등 부재) |

---

## 9. 버그 1건 수정

**PHP 변수 캡처 오류** — `$GLOBALS['__FAV_ACTION_RE']` 를 사용처 **뒤에서** 대입해
`preg_match(NULL, ...)` Fatal Error 가 발생했다. arrow function 자동 캡처(`$FAV_ACTION_RE`)로 교체.
`$GLOBALS` 우회 자체가 불필요했다.

---

## 10. 제한 사항

1. **동적 라우트 미탐지** — 라우트가 변수로 조립되면 문자열 맵 파싱이 놓친다.
   본 저장소는 전부 리터럴이라 현재 영향 없음(`$register()` 3,081건도 리터럴 확인).
2. **Permission 이 `UNKNOWN`** — 라우트 단위 권한은 핸들러 내부 `gate()` 호출에 있어
   라우트 정의만으로는 확정 불가. §5.2 에 게이트 메커니즘을 별도 기록했다.
3. **미들웨어 순서는 코드 등장 순서 기준** — Slim 의 실제 실행 순서(LIFO)와 다를 수 있다.
   신규 API 설계 시 실행 순서 재확인 권장.

---

## 11. 다음 Step 진행 가능 여부

**READY**

필수 인벤토리 7종 + Raw + 보고서 생성, 검증 20/20 통과, 운영 코드 변경 0건.

### 11.1 ST06 관련

**ST06(Test·Package·Dependency)은 ST04 실행 시 이미 통합 수행**되어
`favorites-package-test-inventory.json` 이 생성돼 있다 — 즐겨찾기 관련 패키지 **0**,
테스트 러너 **부재**, 자체 검증 스크립트 3종. 명세대로 별도 진행을 원하시면 추가 실행하겠다.

### 11.2 남은 작업

압축 계획상 **ST07~ST11 통합 1개 Step**(정규화 · 분류 · 의존/재사용 매핑 · 갭 분석 · 최종 검증)만 남았다.
