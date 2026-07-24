# CWIS-P004-U04-WS01-SP01-TK001-ST06 — Test, Package & Dependency Search Report

| 항목 | 값 |
|---|---|
| **Specification ID** | `CWIS-P004-U04-WS01-SP01-TK001-ST06` |
| 선행 Step | ST01~ST05 전부 `READY` / `READY_WITH_LIMITATIONS` |
| Git Branch | `feat/n236-admin-growth-automation` |
| Git Revision (직전) | `eef2c555883` |
| 검색 엔진 | PHP native (정적 — 테스트 미실행 · 패키지 미변경 · DB/네트워크 0) |
| 실행 시간 | 약 1.7초 |
| **완료 상태** | **READY_WITH_LIMITATIONS** |
| 사유 | `NO_STANDARD_TEST_RUNNER` — 표준 러너 부재로 테스트 케이스 추출이 관례 기반 |

---

## 1. ★핵심 결론

> **즐겨찾기 기능은 테스트 커버리지가 사실상 0이다.**
> **동시에 ST04 통합 실행분이 놓쳤던 실제 테스트 자산 3종과 CI 테스트 스테이지를 발견해 정정했다.**

- 테스트 케이스 **143건 중 즐겨찾기 관련 1건** — 그마저 본 CWIS 작업이 만든 Alias 보존 검증
- ST03 이 확인한 즐겨찾기 구현 2곳(`Sidebar.jsx`, `CaseStudy.jsx`)에 대한 테스트 **0건**
- E2E 3종에도 즐겨찾기 키워드 **0건**
- 표준 러너(PHPUnit/Pest/Vitest/Jest/Cypress/Playwright) **전부 미설치**

---

## 2. ★ST04 통합 실행분의 누락 발견·정정

ST04 에서 ST06 을 통합 실행할 때 `*selftest*` 글롭만 사용해 **두 가지를 놓쳤다**.

| 누락 | 실체 | 영향 |
|---|---|---|
| **`tools/e2e/` 3종** | `smoke.mjs`(184줄) · `render.mjs`(158줄) · `scenarios.mjs`(134줄) — 266차 신설 E2E | 저장소의 **실질적 최대 테스트 자산**을 통째로 미집계 |
| **CI 테스트 스테이지** | `.github/workflows/deploy.yml:75` — `node tools/e2e/smoke.mjs` (Phase 6, `HAS_TEST_SECRETS` 게이트) | "CI 에 테스트가 없다"는 **오결론 위험** |

본 Step 이 전수 재수집했다. 검증기가 두 항목의 포함을 **기계적으로 강제**한다
(`★ST04 가 놓친 tools/e2e 를 포함한다`, `★CI 테스트 스테이지를 포착했다`).

---

## 3. 필요성 판정 (상시 원칙 적용)

| 명세 요구 | 판정 | 사유 |
|---|---|---|
| 테스트/패키지 검색 실행 | **IMPLEMENT** | ST04 누락 정정 + Gap 근거 확보. 실제로 새 사실 2건 발견 |
| **패키지 실사용 검증** | **IMPLEMENT (핵심)** | 명세 §35 *"선언만으로 사용 중이라 판정하지 말라"* — 실제로 오탐이 대량 발생했다(§5) |
| §7 `tests/` `spec/` `__tests__/` `cypress/` `playwright/` `database/factories` 등 **17개 경로** | **SKIP** | **전부 부재**(실측 17/17) |
| PHPUnit/Pest/Vitest/Jest/Cypress/Playwright 파서 | **SKIP** | 설정 파일 11개 중 10개 부재(`backend/phpstan.neon` 만 존재) |
| Mockery/Prophecy/Faker/MSW/axe/Storybook 검색 | **부재 기록** | 전부 미설치 — Asset 인벤토리에 `absent_asset_types` 로 사유 기록 |
| §40 Mutation Test | **SKIP** | Infection 미설치 |
| §41 Architecture Test | **SKIP** | arch 테스트 프레임워크 부재 |
| §37 Package 보안 분석 | **금지 준수** | `composer audit`/`npm audit`/Registry 접속 **일절 없음** |

---

## 4. 탐지된 테스트 기술 스택 (실측)

| 구분 | 결과 |
|---|---|
| PHPUnit / Pest | **미설치** |
| Vitest / Jest | **미설치** |
| Cypress / Playwright | **미설치** |
| Mockery / Prophecy / Faker | **미설치** |
| axe / jest-axe / MSW / Storybook / Infection | **미설치** |
| **Static Analysis** | **PHPStan 2.x** (`backend/phpstan.neon` · level 5 + baseline) |
| **실제 테스트 자산** | **자체 검증 6종** — `tools/e2e/*.mjs`(3) + `tools/*_selftest.mjs`(1) + `backend/bin/*_selftest.php`(2) |
| Package Manager | Composer(backend) + NPM(frontend/ + root) |

---

## 5. ★패키지 실사용 검증 — 오탐 4회 반복 정정

명세 §35 가 *"선언만으로 USED 판정 금지"* 를 요구했는데, **반대로 미사용 판정도 오탐이 쉽다**.
초기 실행에서 **13건**을 `DECLARED_NOT_FOUND` 로 잘못 지목했고, 4단계에 걸쳐 **4건**으로 수렴했다.

| 단계 | 미사용 판정 | 정정 내용 |
|---|---|---|
| 초기 | **13** | `from` / `require(` 만 탐지 |
| ① | **9** | ★**동적 `import()` 누락** — `const XLSX = (await import('xlsx')).default` 가 이 저장소의 주 사용 형태(`PriceOpt.jsx` 5곳). `xlsx` `hls.js` `jquery` `summernote` 회복 |
| ② | **7** | ★**스캔 범위 결함** — `frontend/` 루트의 배포 스크립트(`upload_*.cjs`)와 `vite.config.js` 누락. `ssh2-sftp-client`(3파일) `archiver`(2파일) 회복 |
| ③ | **4** | ★**CONFIG_ONLY / TRANSITIVE_ONLY 오분류** — `isomorphic-dompurify` 는 `vite.config.js` 의 **별칭 키**(import 아님), `d3-geo`·`topojson-client` 는 `react-simple-maps` 의 dependencies(node_modules 실측) |

### 5.1 최종 판정

| 상태 | 수 | 내용 |
|---|---|---|
| USED | 30 | 실제 import/use 사이트 확인 |
| CONFIG_ONLY | 8 | 빌드 설정에만 등장 |
| **TRANSITIVE_ONLY** | **2** | `d3-geo`·`topojson-client` ← `react-simple-maps` |
| DEV_ONLY | 3 | |
| **DECLARED_NOT_FOUND** | **4** | 아래 |
| UNKNOWN | 1 | |

### 5.2 ★진짜 미사용 4건 (전부 Composer 프로덕션 의존성)

| 패키지 | 선언 | 탐지 네임스페이스 | 실제 |
|---|---|---|---|
| `php-di/php-di` | `^7.0` | `DI\` | Slim 기본 컨테이너 사용 · `ContainerBuilder` 0건 |
| `vlucas/phpdotenv` | `^5.5` | `Dotenv\` | `Db::loadEnvFile` 이 `.env` 를 **직접 파싱** |
| `illuminate/database` | `^10.0` | `Illuminate\Database` | raw PDO 사용 · `extends Model` 0건 |
| `monolog/monolog` | `^3.0` | `Monolog\` | 로깅에 미사용 |

**백엔드 프로덕션 의존성 7개 중 4개가 코드에서 전혀 쓰이지 않는다.**
검증기가 이 4건에 대해 **전 PHP 소스를 독립 재스캔해 사용처 0건을 재확인**한다(오탐 방지 이중 잠금).

> 제거 권고는 하지 않는다(ST06 범위 밖). `PACKAGE_DECLARED_WITHOUT_USAGE` Gap 후보로만 기록했다.

---

## 6. 테스트 통계

| 항목 | 값 |
|---|---|
| 테스트 파일 | **6** |
| **테스트 케이스** | **143** |
| **즐겨찾기 케이스** | **1** |
| Unit(자체 검증) | 116 |
| **E2E** | 27 |
| Feature / Integration / API / Component / Security | **0** (해당 개념 부재) |
| 테스트 자산(재사용 후보) | 3 |
| CI Test Job | **1** |
| Coverage 설정 | **없음** |
| Mutation Test | **없음** |

### 6.1 신호별 케이스 수

| 신호 | 수 |
|---|---|
| Authorization | 30 |
| Tenant 격리 | 15 |
| Cache | 12 |
| Ordering | 11 |
| Accessibility | 9 |
| Event | 7 |
| Duplicate 방지 | 6 |
| Mobile | 5 |
| Optimistic/Rollback | 4 |
| Pagination | 3 |
| Queue | 2 |
| Architecture | 0 |

★이 신호들은 **전부 내비게이션(Part004-01~03) 검증분**이다. 즐겨찾기 대상은 0건이다.

### 6.2 재사용 가능한 테스트 자산 3종

| 자산 | 유형 | 재사용 가치 |
|---|---|---|
| `navigation_context_selftest.php` 인메모리 SQLite 픽스처 | FIXTURE | **즐겨찾기 테이블 검증에 그대로 재사용 가능** |
| 합성 레지스트리 빌더(`$mkItem` / `$REG`) | HELPER | 픽스처 조립 패턴 |
| Reflection 테스트 seam(`injectRegistryForTest`, `setAccessible`) | FAKE | private static 주입 |

**부재 자산 8종**은 사유와 함께 기록했다(Factory·Fixture 파일·Mock·Stub·Spy·API Mock·Dataset·Base TestCase).

---

## 7. CI 테스트 스테이지

| 워크플로 | 명령 | Coverage |
|---|---|---|
| `.github/workflows/deploy.yml` | `node tools/e2e/smoke.mjs` (Phase 6, `HAS_TEST_SECRETS` 게이트) | 없음 |

`security-scan.yml` 은 `coverage: none` 으로 PHP 설정만 하고 테스트는 실행하지 않는다.

---

## 8. Test Gap 후보 6건 (근거 기반 — 추측 생성 금지)

| Gap Type | 수 | 근거 |
|---|---|---|
| `SOURCE_WITHOUT_TEST` | 1 | ST03 실측 즐겨찾기 구현 2곳 존재 + 본 Step 실측 즐겨찾기 케이스 0건 + E2E 키워드 0건 |
| `ACCESSIBILITY_WITHOUT_A11Y_TEST` | 1 | ST03 실측 `aria-pressed` 0건 + axe/jest-axe 미설치 |
| `PACKAGE_DECLARED_WITHOUT_USAGE` | **4** | §5.2 — 각 패키지의 탐지 네임스페이스와 사용처 0건 |

`severity_candidate` 는 전부 `UNKNOWN` 유지(ST10 소관).
검증기가 **`PACKAGE_DECLARED_WITHOUT_USAGE` Gap 수 == `DECLARED_NOT_FOUND` 패키지 수** 를 강제한다.

---

## 9. 생성 파일

| 파일 | 내용 |
|---|---|
| `tools/cwis/navigation/scripts/search-favorites-tests-dependencies.php` | 재실행 가능한 정적 검색기 |
| `…/output/favorites-test-dependency-raw-results.json` | 원본 + 스택/신호 통계 |
| `…/favorites-test-inventory.json` | 케이스 143건 |
| `…/favorites-test-asset-inventory.json` | 자산 3 + **부재 8종 사유** |
| `…/favorites-package-inventory.json` | 패키지 48 + 실사용 상태 |
| `…/favorites-dependency-usage-inventory.json` | 사용처 670건 |
| `…/favorites-test-gap-candidates.json` | Gap 6건 |
| `…/favorites-ci-test-inventory.json` | CI Job 1건 |
| `docs/cwis/part004-04/…-st06-test-package-search-report.md` | 본 보고서 |

---

## 10. 검증 결과

**23 passed, 0 failed** (+ 명세 §62 `php -r json_decode(JSON_THROW_ON_ERROR)` **VALID**)

| 검증 | 결과 |
|---|---|
| JSON 7개 구문 (§62) | PASS |
| **모든 ID 형식 + 고유** (§63) | PASS (7종 ID 체계) |
| **file_path 상대·내부·실재** (§64) | PASS |
| Test Inventory 정합 · **라인 정합** (§65) | PASS |
| **Composer/NPM 패키지가 실제 manifest 에 존재** (§66) | PASS |
| `usage_status` 허용값 · 집계 정합 | PASS |
| **USED 판정은 실제 사용처를 동반** | PASS |
| **★DECLARED_NOT_FOUND 독립 재스캔 재확인**(오탐 방지) | PASS |
| **TRANSITIVE_ONLY 는 상위 패키지 명시** | PASS |
| **Gap 은 근거 동반**(§67) | PASS |
| **Gap 수 == 미사용 패키지 수** | PASS |
| **CI 인벤토리가 실제 워크플로/명령 반영** | PASS |
| 토큰·이메일·전화·시크릿 원문 없음 (§68) | PASS (7패턴) |
| 절대경로·개인 디렉터리 없음 | PASS |
| **★ST04 누락분(tools/e2e) 포함** | PASS |
| **★CI 테스트 스테이지 포착** | PASS |
| **운영 코드 무변경** (§69) | PASS |
| **★테스트/패키지 미실행·미변경** | PASS (`shell_exec`·`exec(`·`new PDO`·`composer install` 등 부재) |
| **★Lock/Manifest 무변경** | PASS |

---

## 11. 결함 3건 발견·수정

| # | 결함 | 영향 | 수정 |
|---|---|---|---|
| 1 | **docblock 안 `*/`** — `vendor/*/composer.json` 이 주석을 조기 종료 | PHP Parse Error | 한 줄 주석으로 변경 |
| 2 | **루트 세션 스크립트 수백 개 로드** → 메모리 128MB 초과 | Fatal Error | `session*`/`fix_*`/`patch_*` 등 과거 패치 제외 + 256KB 상한 |
| 3 | **E2E 케이스 추출 실패** — `t('…')` 패턴만 봐서 선형 스크립트의 `ok()`/`bad()` 단언을 놓침 | E2E 27건 미집계 | 패턴 확장(검증기가 강제) |

---

## 12. 제한 사항

1. **표준 러너 부재 → 케이스 추출이 관례 기반** — `t()` / `ok()` / `bad()` 호출을 케이스로 간주했다.
   PHPUnit `test_*` 메서드 같은 표준 규약이 없어 정확도가 프레임워크 기반보다 낮다.
2. **`source_under_test` 미연결** — 자체 검증 스크립트가 대상 클래스를 명시하지 않아 전부
   `UNKNOWN_REFERENCE` 다. 명세 §65 가 허용한 상태값이다.
3. **Lock 파일 Resolved Version 부분적** — `frontend/package-lock.json` 에서만 해석했고
   `backend/composer.lock` 은 존재하나 일부 패키지가 `UNKNOWN` 이다.
4. **외부 취약점 조회 없음**(§37 준수) — `abandoned` 표시만 lock 에서 읽었다(해당 0건).

---

## 13. 다음 Step 진행 가능 여부

**READY_WITH_LIMITATIONS** (`NO_STANDARD_TEST_RUNNER`)

필수 JSON 7개 + 보고서 생성, 검증 23/23 통과, 운영 코드·Lock·Manifest 변경 0건, 테스트 미실행.

### 13.1 Task001 최종 확정 사실 (ST07~ST11 입력)

| # | 사실 | 근거 |
|---|---|---|
| 1 | 백엔드 즐겨찾기 구현 **0** | ST02 (179 파일) |
| 2 | 프런트 구현 **2개** (저장 정책 분열: 디바이스 전역 vs 테넌트 스코프) | ST03 |
| 3 | 프런트 → 서버 API 호출 **0** | ST03 |
| 4 | DB 테이블 **0** / 321 중 | ST04 |
| 5 | 서버 라우트 **0** / 1,511 중 | ST05 |
| 6 | **테스트 커버리지 0** / 143 케이스 중 | **ST06** |
| 7 | 재사용 가능 Polymorphic 인프라 **0** | ST02·ST04 |
| 8 | 선례 `saved_report` 는 `user_scoped=NO` + `requirePlan('growth')` | ST04·ST05 |
| 9 | `aria-pressed` **0** | ST03 |
| 10 | **표준 테스트 러너 부재** — 즐겨찾기 테스트를 쓰려면 러너 도입이 선행 | **ST06** |
| 11 | **백엔드 프로덕션 의존성 7개 중 4개 미사용** | **ST06** |

### 13.2 재사용 가능 자산 (Part004-04 구현 시)

- Part004-02 정본 `menu_key` + Alias 105건 (경로 → 키 무손실 이관)
- `tGetJSON`/`tSetJSON` 테넌트 스코프 저장 패턴
- **인메모리 SQLite 픽스처**(`navigation_context_selftest.php`) — 즐겨찾기 테이블 검증에 즉시 재사용
- PM 세션 bypass 경로(`/v425/pm/*`) — RBAC `analyst+` 쓰기 제약 회피

### 13.3 남은 작업

**ST07~ST11 통합 1개 Step**(정규화 · 분류 · 의존/재사용 매핑 · 갭 분석 · 최종 검증)만 남았다.
