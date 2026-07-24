# CWIS-P004-U04-WS01-SP01-TK001-ST01 — Search Scope Definition Report

| 항목 | 값 |
|---|---|
| **Specification ID** | `CWIS-P004-U04-WS01-SP01-TK001-ST01` |
| 작업명 | Favorites Existing System Analysis — Search Scope Definition |
| 실행 일시 | 2026-07-24 |
| Git Branch | `feat/n236-admin-growth-automation` |
| Git Revision (직전) | `424ecc628a5` |
| **완료 상태** | **READY_WITH_LIMITATIONS** |

---

## 1. 선행 보고서 확인 (§4)

| 문서 | 상태 |
|---|---|
| `docs/cwis/part004-01-implementation-report.md` | **FOUND** (294행) |
| `docs/cwis/part004-02-implementation-report.md` | **FOUND** (333행) |
| `docs/cwis/part004-03-implementation-report.md` | **FOUND** (301행) |

세 문서 모두 존재하며 판정은 전부 `COMPLETED_WITH_LIMITATIONS`. 누락 없음.

---

## 2. 기술 스택 탐지 결과 (§5)

명세 §5 가 나열한 후보 중 **실제로 존재하는 것만** 기록한다.

### 2.1 Backend

| 탐지 항목 | 결과 |
|---|---|
| PHP | `>=8.1` 선언 (운영 실측 8.1.34) |
| Framework | **Slim 4** (`slim/slim ^4.12`, `slim/psr7`, `php-di/php-di ^7`) |
| Laravel / Symfony | **부재** — `artisan`·`symfony.lock`·루트 `composer.json` 모두 없음 |
| ORM | **raw PDO 싱글턴**(`backend/src/Db.php`). `illuminate/database ^10` 이 의존성으로 선언돼 있으나 코드 경로는 PDO |
| Doctrine | 부재 |
| Autoload | PSR-4 `Genie\` → `backend/src/` |
| Queue Driver | **부재** (cron 스크립트 `backend/bin/*_cron.php`) |
| Cache Driver | **부재** (Redis/predis 0건) |
| Event Bus | 부재 |
| Testing Framework | **부재** (PHPUnit/Pest 없음) — `backend/bin/*_selftest.php` 자체 검증 |
| Static Analysis | **PHPStan 2.x** (`backend/phpstan.neon`, level 5 + baseline) |
| Coding Standard Tool | 부재 (phpcs/pint 없음) |

### 2.2 Frontend

| 탐지 항목 | 결과 |
|---|---|
| Framework | **React 18.3 + Vite 5.4** |
| Router | `react-router-dom ^6.26` |
| Vue / Inertia / Blade / Twig / Alpine | **전부 부재** |
| TypeScript | **부재** (JSX만) |
| State | **React Context API** — Pinia/Vuex/Redux/Zustand/TanStack Query **전부 부재** |
| HTTP | `fetch` 래퍼 `frontend/src/services/apiClient.js` (Axios 부재) |
| 기타 | `dompurify`, `recharts`, Capacitor(모바일 셸) |

### 2.3 Database / Cache / Search

| 탐지 항목 | 결과 |
|---|---|
| Primary DB | **MySQL 8.0.37** (라이브 실측 `driver=mysql`) |
| Fallback | **SQLite** (`backend/src/Db.php`) |
| PostgreSQL | **미사용** — §3 트랩 참조 |
| Redis | **부재** |
| Elasticsearch / OpenSearch / Vector DB | **부재** |

> `.env` 실제 값은 본 보고서에 기록하지 않는다(§21 준수).

---

## 3. ★탐지 트랩 (후속 Step 오도 방지)

| 트랩 | 실체 | 후속 Step 조치 |
|---|---|---|
| **`docker-compose.yml`** 이 `postgres:16-alpine` + `postgresql+psycopg2://` (Python DSN) 를 선언 | **초기 커밋 `98abb366e60`(2026-04-28) 이후 미갱신 스텁.** 실제 백엔드는 PHP/Slim + MySQL. `backend/composer.json` 에 pgsql 요구 없고 `Db.php` 는 mysql/sqlite DSN 만 생성 | ST04 에서 PostgreSQL 마이그레이션을 찾지 말 것. 관련 히트는 `FALSE_POSITIVE` |
| **`config/`** 가 프레임워크 설정처럼 보임 | 실제 내용은 `config/quality/eslint-baseline.json` **1개** | 설정 소스는 `backend/.env`·`frontend/.env*`·`vite.config.js` 로 취급 |
| **`backend/migrations/`** 가 스키마 정본처럼 보임 | **세션 172 에서 동결.** 이후 스키마는 핸들러의 `ensureTables()` 자가치유로 생성 | ST04 는 `migrations/*.sql` **과** `backend/src/**/*.php` 의 `CREATE TABLE` 문자열을 **모두** 검색해야 함 |
| **`frontend/src/i18n/locales`** | ko.js 약 1MB × 15개 언어. 한국어 키워드 대량 매칭 | `noisy_paths` 로 분리, 기본 분류 `UI_ONLY` |

---

## 4. 검색 범위 (§6·§7)

### 4.1 포함 디렉터리 — 실재 확인 완료 (9개)

```
backend/src        backend/bin        backend/migrations   backend/data
frontend/src       frontend/public
tools              docs               config
```

**명세 §6 후보 중 부재로 제외된 경로**:
`app/` `src/` `routes/` `resources/` `templates/` `database/` `migrations/` `tests/`
`packages/` `modules/` `plugins/` `public/` `spec/` `__tests__/`
`resources/js` `resources/ts` `frontend/src/stores` `database/migrations`

→ 명세는 Laravel/Symfony 레이아웃을 전제했으나 본 저장소는 **모노레포(`backend/` + `frontend/`)** 구조다.

### 4.2 포함 개별 파일 (8개)

`backend/composer.json` `backend/composer.lock` `frontend/package.json` `frontend/package-lock.json`
`package.json` `package-lock.json` `frontend/vite.config.js` `vite.config.js`

### 4.3 제외 디렉터리 (23개)

```
.git .github .idea .vscode .playwright-mcp
node_modules  backend/vendor  frontend/node_modules  frontend/dist
frontend/src/i18n/locales_backup
clean_src  backup  legacy_v338_pkg
dist  build  coverage  .cache  tmp  temp  logs
storage/logs  storage/framework  public/build
```

**제외 glob**: `**/*.min.js` `**/*.map` `**/*.bak*` `_be_*/**` `_dist_*/**` `_build_*.log` `Screen capture/**` 등

> 저장소 루트에 세션 산출물(`_be_*`, `_dist_*`, `*.tgz`, `_build_*.log`)이 다수 있으나
> **루트 자체를 포함 디렉터리로 넣지 않아** 자연 제외된다. 필요한 매니페스트만 §4.2 로 개별 지정했다.
> **`public/assets` 예외 케이스는 본 저장소에 해당 없음**(해당 경로 자체가 부재).

### 4.4 파일 확장자 (§8)

| 그룹 | 확장자 |
|---|---|
| backend | `php sql json yaml yml neon` |
| frontend | `js jsx mjs cjs json css html` |
| database | `sql php` |
| configuration | `json yaml yml env neon conf` |
| documentation | `md txt` |

**제외**: 이미지·폰트·아카이브·바이너리·`sqlite`/`db` 등 24종.
명세가 언급한 `vue` `svelte` `twig` `blade.php` `ts` `tsx` 는 **저장소에 해당 파일이 0건**이라 등재하지 않았다.

---

## 5. 검색어 사전 (§9~§14)

| 그룹 | 개수 | 비고 |
|---|---|---|
| 1차 영문 | 15 | `favorite/favourite/bookmark/starred/pin/saved_item` 계열 |
| **1차 한국어** | 8 | `즐겨찾기` `북마크` `저장한 항목` `별표` `고정` `핀` 등 |
| 2차 연관 | 15 | `recent/history/quick_link/preference/user_setting` 계열 |
| **2차 한국어** | 9 | `최근 항목` `최근 방문` `사이드바 설정` `바로가기` 등 |
| 코드 패턴 | 27 | Service/Repository/Controller/Policy/DTO + 메서드 + Boolean 속성 |
| DB 테이블 | 11 | `favorites` `user_favorites` `pinned_items` 등 |
| DB 컬럼 | 16 | `favoritable_type` `resource_id` `sort_order` `pinned_at` 등 |
| API 경로 | 11 | `/favorites` `/bookmarks` `/star` 등 |
| Frontend 컴포넌트 | 11 | `FavoriteButton` `PinnedItems` 등 |
| Frontend 훅/스토어 | 8 | `useFavorites` `favoriteStore` 등 |

### 5.1 ★`known_repo_symbols` — 본 Step의 핵심 부가가치

일반 키워드만으로는 **놓칠 수 있는** 기존 구현의 실제 식별자를 Part004-01~03 실측 결과에서 뽑아 명시 고정했다.
ST02/ST03 이 이것들을 히트하지 못하면 **검색 범위 자체가 잘못된 것**이다(검증 항목으로 강제).

| 그룹 | 식별자 |
|---|---|
| 저장소 키 | `g_sidebar_favs` `g_sidebar_recents` `g_user_menu_visibility` `g_admin_menu_tree_cache` `g_sidebar_ui_state` |
| 프론트 심볼 | `useFavorites` `useRecentVisits` `QuickAccessPanel` `toggleFav` `MenuVisibilityContext` `UserMenuPreferences` `tScopedKey` `tGetJSON` `currentTenant` |
| 백엔드 심볼 | `collaboration_user_contexts` `navigation_overrides` `is_default` `tenant_kv` `WorkspaceState` `plan_menu_access` `menu_tree` |
| 레지스트리 앵커 | `menu_key` `alias_key` `target_menu_key` `legacy_permission_key` `navigation_registry.json` |

### 5.2 오탐 주의 목록

`star`(별점/CSS 글리프) · `pin`(PIN 번호/pinned dependency) · `history`(브라우저·git) ·
`preference`(**`PreferenceCenter` = 마케팅 수신동의**, 내비게이션과 무관) · `recent`(도메인 데이터 정렬) ·
`docker-compose.yml` PostgreSQL 히트 · `docs/cwis/**` 명세 문구 자체.

---

## 6. 분류 체계 (§16·§17·§18)

- **Classification 12종**: `DIRECT_IMPLEMENTATION` `PARTIAL_IMPLEMENTATION` `RELATED_INFRASTRUCTURE`
  `UI_ONLY` `BACKEND_ONLY` `DATABASE_ONLY` `LEGACY_IMPLEMENTATION` `DEPRECATED_IMPLEMENTATION`
  `TEST_ONLY` `DOCUMENTATION_ONLY` `FALSE_POSITIVE` `UNKNOWN`
- **Layer 14종**: `DOMAIN` `APPLICATION` `INFRASTRUCTURE` `HTTP_API` `FRONTEND` `DATABASE`
  `CONFIGURATION` `SECURITY` `EVENT` `QUEUE` `CACHE` `TEST` `DOCUMENTATION` `UNKNOWN`
- **결과 메타데이터 16필드**: `result_id` `keyword` `matched_text` `file_path` `line_number` `language`
  `layer` `classification` `symbol_name` `related_resource` `tenant_aware` `user_scoped`
  `workspace_scoped` `permission_detected` `test_detected` `notes`

---

## 7. 민감정보 보호 규칙 (§21)

| 규칙 | 내용 |
|---|---|
| 마스킹 대상 | `password` `secret` `token` `api_key` `private_key` `authorization` `bearer` `cookie` `session` `client_secret` `access_key` + 저장소 고유 `GENIE_DB_PASS` `APP_KEY` `PG_ENC_KEY` |
| 방식 | `mask_value_keep_key` — 키는 남기고 값만 `[REDACTED]` |
| 길이 제한 | `matched_text` 최대 200자 |
| 경로 정책 | **저장소 루트 기준 상대 경로만** 기록 (절대 경로·개인 디렉터리명 금지) |
| 절대 저장 금지 | `.env` 전체 · 토큰/비밀번호/세션ID/쿠키 원문 · Private Key · 개인정보 Payload |
| 검색 대상에서 제외 | `.env` 계열 · `logs/` |

---

## 8. 생성 파일 (§24)

| 파일 | 내용 |
|---|---|
| `tools/cwis/navigation/favorites-search-scope.json` | 검색 범위·키워드·분류·마스킹 규칙 정본 |
| `tools/cwis/navigation/schema/favorites-search-scope.schema.json` | JSON Schema (draft-07) — 필수/배열/중복/상대경로/traversal 계약 |
| `tools/cwis/navigation/favorites-search-commands.md` | Bash·PowerShell·Git Bash 명령 템플릿 + JSON 변환 + 마스킹 주의 |
| `docs/cwis/part004-04/part004-04-ws01-sp01-tk001-st01-search-scope-report.md` | 본 보고서 |

---

## 9. 검증 결과 (§26)

**26 passed, 0 failed** (자체 검증 스크립트 — 신규 패키지 설치 없음)

| 검증 | 결과 |
|---|---|
| scope / schema JSON 구문 | PASS (Node + `php -r json_decode(JSON_THROW_ON_ERROR)` 이중) |
| schema 필수 필드 존재 | PASS |
| `specification_id` const 일치 | PASS |
| 배열 타입 · **중복 금지** | PASS (초기 실행에서 `isFavorite` 중복 1건 검출 → 제거 후 재통과) |
| `primary_keywords` 비어있지 않음 | PASS |
| include 경로 **전부 실재** | PASS (9/9 디렉터리, 8/8 파일) |
| **Directory Traversal / 절대경로 / 홈확장 없음** | PASS |
| 모든 경로가 루트 내부로 해석 | PASS (`realpath` 대조) |
| **포함 ↔ 제외 충돌 없음** | PASS (동일·하위 관계 모두 검사) |
| `noisy_paths` 가 include 하위 | PASS |
| Classification / Layer / HTTP 메서드 enum 정합 | PASS |
| 민감 패턴 규칙 완비 | PASS |
| **scope 파일 자체에 비밀값·절대경로 없음** | PASS |
| `prerequisite_reports` 상태가 실제 파일과 일치 | PASS |
| **`known_repo_symbols` 가 include 범위에서 실제 발견됨** | PASS (범위 결함 방지) |

> JSON Schema Validator 패키지가 저장소에 없고 신규 설치가 금지되어(§26), Schema 의 핵심 제약을
> Node 표준 모듈만으로 직접 검증했다. 검증 스크립트는 일회성이므로 저장소에 커밋하지 않는다.

---

## 10. Git 변경 범위 (§27)

허용 범위 내에서만 변경했다.

```
tools/cwis/navigation/**        (신규 3)
docs/cwis/part004-04/**         (신규 1)
```

**운영 코드 변경 0건** — `backend/src`, `frontend/src`, `backend/migrations`, `config`,
`composer.json`, `package.json`, `.env` 모두 미변경. 패키지 설치 0건. Migration 생성 0건.

---

## 11. 제한 사항

1. **JSON Schema 를 표준 Validator 로 검증하지 못했다** — 저장소에 validator 가 없고 설치가 금지되어
   자체 스크립트로 핵심 제약만 검증했다. `$ref`/`allOf` 등 Schema 문법 자체의 정합성은 구문 검증 수준이다.
2. **명세 §5 의 다수 탐지 항목이 "부재"로 귀결** — Laravel/Symfony/Doctrine/CQRS/Queue/Cache/
   Search Engine/TypeScript/Pinia 등. 이는 결함이 아니라 스택 차이다.
3. **`config/` 를 include 에 넣었으나 실효 내용은 eslint baseline 1개** — 검색 수익이 거의 없다.
4. **검색을 실제 실행하지 않았다** (§3 범위 규정). 범위 정의만 완료.

---

## 12. ★범위 판단 — 후속 Step 필요성 재평가

> 사용자 지시: *"필요한 것만 구현하고, 불필요한 기능은 구현하지 말 것."* 이 원칙을 본 Task 에 적용한다.

명세 §32 는 ST02~ST11 (10개 Step) 을 예고한다. 그러나 **Part004-01 이 이미 즐겨찾기 실태 조사를
완료했고 그 결과가 문서·JSON 으로 남아 있다**:

- `docs/cwis/part004-01-implementation-report.md` §5.4 — 사용자 설정 저장 구조 5종 표
- `docs/cwis/part004-01-context-and-preferences.json` — `preference_stores` 기계 판독 인벤토리
- Part004-01 실측 결론: **즐겨찾기 구현은 `frontend/src/layout/Sidebar.jsx` 의
  `useFavorites`(localStorage `g_sidebar_favs`) + `QuickAccessPanel` 뿐이며, 백엔드·DB·API 는 0건**

즉 ST02(Backend)·ST04(DB)·ST05(API) 는 **결과가 이미 "0건"으로 확정된 검색**이다.

**권장(다음 지시 시 판단 바랍니다)**:

| Step | 판정 | 근거 |
|---|---|---|
| ST02 Backend Search | **압축 권장** | Part004-01 이 백엔드 0건 확정. 재확인 1회 실행이면 충분 |
| ST03 Frontend Search | **필요** | 실제 구현이 여기에만 있으므로 정밀 조사 가치 있음 |
| ST04 DB/Migration Search | **압축 권장** | 테이블 0건 확정. `ensureTables` 전수만 1회 확인 |
| ST05 Route/API Search | **압축 권장** | `routes.php` 에 favorites 경로 0건 확정 |
| ST06 Test/Package Search | **압축 권장** | 테스트 러너 부재 · 관련 패키지 없음 |
| ST07~ST11 정규화·분류·갭분석 | **1개로 통합 권장** | 대상 결과가 소수라 별도 Step 유지 비용이 산출물 가치를 초과 |

→ **ST02~ST06 을 "1회 전수 검증 실행 + 결과 확정" 1개 Step 으로, ST07~ST11 을 "갭 분석 + 설계 확정"
1개 Step 으로 압축**하면 동일한 품질을 2 Step 으로 달성할 수 있다. 원하시면 명세대로 10개를 그대로
진행할 수도 있으니 지시해 주십시오.

또한 **Part004-04 본 구현 시 반드시 반영해야 할 선행 결정 2건**(Part004-03 보고서 §17 기재):

1. 즐겨찾기를 서버 영속으로 올리는 것은 `tenantStorage.js` 가 명시한
   *"UI 프리퍼런스는 디바이스 단위"* 설계를 **뒤집는 정책 변경**이다 — 명시적 승인 필요.
2. 저장 키는 경로가 아니라 **Part004-02 정본 `menu_key`** 로 해야 한다
   (Alias 105건이 기존 경로를 흡수하므로 무손실 이관 가능).

---

## 13. 다음 Step 진행 가능 여부

**READY_WITH_LIMITATIONS**

- 검색 범위·규칙·명령 템플릿·검증이 모두 완료되어 ST02 를 즉시 실행할 수 있다.
- 제한: §11 의 Schema Validator 부재, §12 의 후속 Step 압축 권장.

**다음 예정**: `CWIS-P004-U04-WS01-SP01-TK001-ST02` — Backend Favorites Keyword Search
(단, §12 권장에 따른 범위 조정 여부를 먼저 지시받는 편이 효율적입니다.)
