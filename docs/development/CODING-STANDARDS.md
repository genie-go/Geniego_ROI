# 코딩 표준 (CODING STANDARDS)

CCIS Part004 | 실측 2026-07-22

이 문서는 **이 저장소에 실제로 존재하는 언어**에만 규칙을 정의한다.
쓰지 않는 언어의 규칙은 적지 않는다 — 지킬 수 없는 규칙은 규칙이 아니라 소음이다.

---

## 1. 적용 범위 (언어 실측)

| 언어 | 우리 코드 | 위치 | 표준 |
|------|-----------|------|------|
| **PHP** | 175개 | `backend/src`(137) · `backend/bin`(36) · `tools`(1) | §4 |
| **JavaScript / JSX** | 344개 | `frontend/src` (jsx 207 · js 137) | §3 |
| **SQL** | 21개 | `backend/migrations` | §5 |
| YAML | 소수 | `.github/workflows` · compose | §6 |
| Shell | 10개 | `scripts/**` · `backend/bin` | §7 |
| PowerShell | 2개 | `deploy.ps1` · `scripts/bootstrap` | §7.3 |

**적용 대상이 아닌 것** (검사·표준 모두 제외):

| 대상 | 사유 |
|------|------|
| `legacy_v338_pkg/` | 아카이브. `.go` 449 · `.ts` 527 · `.py` 873 · `.sql` 532 가 전부 여기 있다. 실행 경로 아님 |
| `clean_src/` | 읽기 전용 과거 미러 |
| `frontend/src/i18n/locales_backup/` | 세션 스냅샷 백업 |
| `frontend/android` 의 `.java` 3개 | Capacitor 생성물 |
| `infra/**/*.tf` 11개 | 미사용 스텁(infra/README.md) |
| `backend/vendor` · `node_modules` · `dist` | 생성물 |

> CCIS Part004 §4 는 Java/Kotlin/TypeScript/Python/Terraform 표준을 요구하지만,
> 위 실측대로 **우리가 작성·유지하는 코드에는 해당 언어가 없다.**
> 명세는 PHP 를 다루지 않으므로 §4 를 이 저장소 기준으로 신규 작성한다.

---

## 2. 공통 원칙

판단이 갈릴 때의 우선순위:

```text
정확성 → 보안 → 가독성 → 유지보수성 → 성능 → 코드 길이
```

- **Extend, Don't Replace** — 동작 중인 코드를 무단 재작성하지 않는다.
- **Raw First** — 문서보다 코드 실측이 우선이다. 고치기 전에 현재 상태를 읽는다.
- **Magic Value 금지** — 임계값·상수는 이름을 붙이고 근거를 주석에 남긴다.
- **정직한 미산출** — 값을 낼 수 없으면 `0` 이나 임의값이 아니라 **`null` + 사유**를 반환한다.
  `0` 은 "정상"으로 오독된다. 이 저장소의 `SystemMetrics`·`Mmm::frontier`·`PriceOpt` 가 그 선례다.
- **Dead Code 제거** — 쓰지 않는 코드는 주석 처리가 아니라 삭제한다(git 이 기억한다).
- **Warning 무시 금지** — 끄지 말고 고친다. 끌 수 있는 유일한 경우는 §9 처럼
  **규칙이 이 코드베이스에 적용 자체가 불가능할 때**뿐이고, 그때도 근거를 문서에 남긴다.

---

## 3. JavaScript / JSX

### 3.1 기본

- 모듈은 ES Module(`import`/`export`). CommonJS 는 `tools/*.cjs` 스크립트에만 허용.
- 세미콜론 사용. 문자열은 작은따옴표 우선(`.editorconfig`).
- `var` 금지. 재할당하지 않으면 `const`.
- 사용하지 않는 import·변수는 남기지 않는다(`no-unused-vars` — 현재 최다 위반 항목).
- 빈 `catch {}` 금지. 최소한 사유 주석 또는 로깅을 남긴다(`no-empty` — 339건).

### 3.2 React

- 함수 컴포넌트만 사용한다.
- **Hook 규칙을 우회하지 않는다.** `eslint-disable react-hooks/*` 금지 —
  이 저장소는 Hook 위반으로 화이트스크린을 6회 겪었다.
- `useEffect`/`useCallback` 의존성 배열을 임의로 비우지 않는다(`exhaustive-deps` 81건은 부채로 관리).
- `React` import 는 불필요하다(자동 JSX 런타임). 새로 추가하지 않는다.
- 페이지는 `App.jsx` 에서 `lazy()` 로 등록한다. **청크 그룹에 수동 등록하지 않는다**(§9 참조).
- 외부 링크의 `target="_blank"` 에는 반드시 `rel="noreferrer"` 를 붙인다(리버스 탭내빙).
- **동일 prop 을 두 번 쓰지 않는다.** JSX 는 뒤엣것만 남기고 앞엣것을 조용히 버린다 —
  실제로 `AuthPage` 의 `onBlur` 중복 때문에 추천코드 검증 기능이 통째로 죽어 있었다.

### 3.3 비동기

- Promise 를 방치하지 않는다. `await` 하거나, 의도적으로 기다리지 않으면 `.catch()` 를 붙인다.
- `fetch` 응답은 `res.ok` 를 확인한 뒤 사용한다. `.json()` 실패에 대비한다.
- API 호출은 `src/services/apiClient.js` 를 경유한다. 컴포넌트에서 직접 `fetch` 를 새로 만들지 않는다.

### 3.4 i18n

- 사용자에게 보이는 문자열은 `t('key', '한글 기본값')` 형태로 작성한다.
- 신규 키는 **15개 로케일 전부**에 추가한다. `ko.js` 가 원본이다.
- 로케일 파일을 통째로 열어 저장하지 않는다(공백 diff 폭발 — IDE.md §3).

---

## 4. PHP (★본 저장소의 백엔드 — 명세 미수록분 신규 작성)

측정된 현행 관행을 표준으로 승격한다. 새 코드는 아래를 따른다.

| 관행 | 채택 현황 |
|------|-----------|
| `declare(strict_types=1)` | 128개 파일 |
| `final class` | 101개 |
| Prepared Statement | 119개 파일 |
| `tenant_id` 스코프 | 핸들러 79개 |

### 4.1 파일 골격

```php
<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * 무엇을 하는 클래스인지 + 왜 이렇게 됐는지(차수 이력).
 */
final class Example {
```

- PSR-4. 네임스페이스는 `Genie\`, 핸들러는 `Genie\Handlers\`.
- 들여쓰기 4칸(`.editorconfig`).
- 상속을 전제하지 않으면 `final`.
- 핸들러 메서드는 `static` 으로 두고 `routes.php` 에 `'METHOD /path' => 'Genie\Handlers\Class::method'` 로 등록한다.
  **자동 발견되지 않는다 — 등록하지 않으면 라우트는 존재하지 않는다.**

### 4.2 테넌트 격리 (최우선 규칙)

- 테넌트는 **세션 토큰에서 해석한다.** `X-Tenant-Id` 헤더를 신뢰하지 않는다.
- 세션 조회는 **반드시 `hashToken(입력)`** 으로 한다. raw 비교는 세션 전면 실패와
  저장 해시 replay 를 동시에 만든다(실제 사고 사례).
- 모든 DML 에 `tenant_id` 조건을 넣는다. 조인 시 조인 대상에도 넣는다.
- 공용/데모 데이터는 `demo` 또는 `__shared__` 스코프로 명시 분리한다.
  공용 카탈로그를 실테넌트로 읽어 상품마다 재수집하다 502 를 낸 사례가 있다.

### 4.3 DB 접근

```php
$pdo = Db::pdo();
$st  = $pdo->prepare('SELECT id, status FROM orders WHERE tenant_id = ? AND id = ?');
$st->execute([$tenant, $id]);
```

- **DML 은 예외 없이 Prepared Statement.** 값 보간 금지.
- DDL(`ensureTables` 자가치유)에서 컬럼명을 보간하는 기존 패턴은 허용한다 —
  **단 보간 대상이 코드 내 리터럴 배열일 때만**이다. 요청 값에서 온 식별자는 절대 보간하지 않는다.
- `SELECT *` 를 쓰지 않는다. 필요한 컬럼만 나열한다.
- 반복문 안에서 쿼리·외부 API 를 호출하지 않는다(N+1 → 즉시 장애).

### 4.4 오류 처리

```php
try {
    $this->callCarrier($order);
} catch (\Throwable $e) {
    error_log('[Carrier] 예약 실패 orderId=' . $order->id . ' ' . $e->getMessage());
    return $this->json($res, ['ok' => false, 'error' => 'CARRIER_TIMEOUT'], 502);
}
```

- **빈 `catch (\Throwable $e) {}` 를 새로 만들지 않는다.** 기존 자가치유 DDL 의 빈 catch 는
  "이미 존재" 흡수라는 명확한 의도가 있는 예외다. 그 외에는 최소한 로깅한다.
- 실패를 성공처럼 반환하지 않는다. `ok => true` 고정 반환은 이 저장소에서
  14개 채널 18개소가 가짜 녹색을 내던 원인이었다.
- 응답에 스택 트레이스·SQL·내부 경로·크리덴셜을 담지 않는다.
- 오류 코드는 안정적인 식별자로 둔다(`TENANT_ACCESS_DENIED`, `ORDER_NOT_FOUND`).

### 4.5 금지

- 요청 값을 그대로 파일 경로·명령·SQL 식별자에 사용하는 것.
- 크리덴셜 하드코딩. 설정은 루트 `.env`(`GENIE_*`)에서 읽는다.
- 응답에 PII 를 불필요하게 싣는 것. 이 서비스는 집계 코호트 설계를 유지한다.

### 4.6 정적분석 (PHPStan · 290차후속 도입)

프론트 ESLint 베이스라인과 동일한 원칙을 백엔드에 적용한다 — **규칙을 끄지 않고, 레거시 기존 위반은 baseline 으로 고정하고 신규/증가분만 차단**한다.

- 도구: `phpstan/phpstan`(composer `require-dev`). 실행: `make phpstan` 또는 `cd backend && php vendor/bin/phpstan analyse --memory-limit=1G`.
- 설정: `backend/phpstan.neon` — **레벨 5**(메서드/프로퍼티 존재·인자 타입·null 접근 등 프로덕션급 타입검사), 경로 `src`·`bin`.
- 베이스라인: `backend/phpstan-baseline.neon`(도입 시점 288건 고정). `make quality`(§게이트)가 이를 대비로 검사하며, **베이스라인을 초과하는 신규 위반이 생기면 FAIL**.
- 위반을 줄인 뒤에는 `make phpstan-baseline` 으로 **하향만** 갱신한다(늘리는 방향 금지).
- ★레벨 0(미정의 심볼·중복 배열키·인자 수)은 도입 시 5건(전부 `routes.php` 중복 라우트 키, 동일 핸들러)을 수정해 **0 으로 유지**한다. 레벨 0 위반은 baseline 대상이 아니라 즉시 수정 대상이다.
- 로컬에 `composer` 가 없으면 게이트는 `[WARN]` 으로 건너뛴다(`vendor/bin/phpstan` 부재). `cd backend && composer install` 후 작동한다.

---

## 5. SQL / Migration

- `snake_case`. 테이블은 복수형(`orders`, `order_items`), 시각 컬럼은 `created_at`/`updated_at`.
- `SELECT *` 금지. 조인 조건 명시. `tenant_id` 조건 누락 금지.
- 파일명은 기존 규약을 따른다: `backend/migrations/{YYYYMMDD}_{차수}_{번호}_{설명}.sql`.
- **이미 실행된 마이그레이션 파일을 수정하지 않는다.** 되돌릴 일이 있으면 새 파일을 추가한다.
- 조건 없는 `DELETE`/`UPDATE` 금지. 운영 스크립트는 대상 `SELECT` → 트랜잭션 → 영향 행 수 확인 순서로 한다.
- 이 저장소의 마이그레이션은 172차에서 멈춰 있고 이후 스키마는 핸들러별 `ensureTables` 로 적용된다.
  **새 스키마를 추가할 때 두 경로 중 어느 쪽을 쓰는지 명시**하고, 섞지 않는다.

---

## 6. YAML / JSON

- YAML: 스페이스 들여쓰기(탭 금지), 중복 키 금지, 시크릿 직접 기록 금지.
- GitHub Actions 의 `name:` 값에 `[ ] { } & * ! | > : #` 가 들어가면 **따옴표로 감싼다.**
  `- name: [PHASE 1] ...` 는 YAML 이 리스트로 파싱해 워크플로가 조용히 죽는다(실제 사고).
- JSON: 주석 금지, 중복 키 금지, 날짜는 ISO 8601, 식별자를 숫자로 쓰지 않는다.
- Node 버전 같은 값은 한 곳에만 둔다 — 정본은 `.nvmrc`(CCIS Part003 §8.1).

---

## 7. Shell / PowerShell

### 7.1 Bash

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- 변수는 인용한다(`"$f"`). 경로에 공백이 있는 환경이다.
- 저장소 루트는 `git rev-parse --show-toplevel` 로 구한다. 절대경로 하드코딩 금지.
- 위험 명령(`rm -rf`, `DROP`, `TRUNCATE`)은 대상 출력 → 확인 → 실행 순서를 지킨다.
- **파일당 프로세스를 띄우는 반복문을 피한다.** Windows 에서 1만 회 반복은 5분을 넘긴다 —
  `git ls-tree`/`git ls-files` 처럼 한 번에 끝내는 명령으로 대체한다(실제 개선 사례).
- Windows 에서는 Git Bash 로 실행한다. PowerShell 의 `bash` 는 WSL 스텁이다.

### 7.2 검사

`bash -n` 이 품질 게이트에 포함된다. ShellCheck 는 현재 미설치이며 도입 시 별도 결정한다.

### 7.3 PowerShell

- **UTF-8 with BOM 으로 저장한다.** BOM 이 없으면 PS 5.1 이 ANSI 로 읽어 한글이 깨진다.
- `$ErrorActionPreference = 'Stop'`.
- `Get-Content | Set-Content` 파이프라인으로 텍스트를 편집하지 않는다(인코딩 왕복 손상).
  `[System.IO.File]::ReadAllText/WriteAllText` 를 쓴다.
- 로직은 `.sh` 에 두고 `.ps1` 은 런처로 유지한다. 같은 로직 2벌은 반드시 표류한다.

---

## 8. 주석 · 문서화

- 주석은 **무엇을**이 아니라 **왜**를 적는다. 특히 "왜 이 이상한 코드가 필요한가".
- 이 저장소의 관행대로 차수 표기를 남긴다: `// [289차] ...`, `/* [CCIS Part004] ... */`.
- TODO 는 소유자와 조건을 함께 적는다: `// TODO(backend, 세션토큰 통합 후): ...`.
- JSX 여는 태그 안에서는 `{/* */}` 가 아니라 **평문 `/* */`** 를 쓴다.

---

## 9. 해제한 ESLint 규칙과 근거

규칙을 끄는 것은 원칙적으로 금지다. 아래 3개는 **이 코드베이스에 적용 자체가 불가능**해
거짓 위반만 만들어내던 것들이며, 끄기 전 각각 근거를 확인했다.

| 규칙 | 해제 전 건수 | 근거 |
|------|--------------|------|
| `react/prop-types` | 3296 | 이 프로젝트는 TypeScript 도 prop-types 도 도입한 적이 없다. 전 컴포넌트가 위반 대상이 되어 실제 결함을 덮었다 |
| `react/react-in-jsx-scope` | 515 | 자동 JSX 런타임(`@vitejs/plugin-react`)을 쓰므로 `React` import 자체가 불필요하다. 규칙이 요구하는 import 는 오히려 `no-unused-vars` 를 유발한다 |
| `react/jsx-uses-react` | — | 위와 같은 이유(쌍으로 동작) |

추가로 `.eslintignore` 를 신설해 `locales_backup`(백업 40개 파일·error 2459)을 제외했다.

**해제하지 않은 것**: `no-unused-vars` · `no-empty` · `react-hooks/*` · `no-dupe-keys` ·
`react/jsx-no-duplicate-props` · `react/jsx-no-target-blank` 등 **실제 결함을 가리키는 규칙은 전부 유지**하고
베이스라인 부채로 관리한다.

---

## 10. 품질 게이트

```bash
make quality      # 통합 게이트 — 기존 위반 허용, 증가분 차단
make lint         # 원시 결과(기존 위반 958건 때문에 현재 실패한다)
make validate     # 저장소 구조 게이트
```

`make quality` 가 검사하는 것:

| 게이트 | 기준 |
|--------|------|
| ESLint | `config/quality/eslint-baseline.json` 대비 **증가 시 FAIL** |
| PHP `php -l` | 175개 전수 · **항상 0** (베이스라인 없음) |
| Shell `bash -n` | 전수 · 항상 0 |
| JSON 파싱 | 설정·계약 파일 전수 · 항상 0 |
| Git | 공백 오류 · 병합 충돌 표식 |

위반을 줄였다면 `make quality-baseline` 으로 기준을 **낮춘다**. 올리는 방향의 갱신은 금지다.

---

## 11. 관련 문서

- [CODE-REVIEW-CHECKLIST.md](CODE-REVIEW-CHECKLIST.md) — 리뷰 시 확인 항목
- [SECURE-CODING-GUIDE.md](SECURE-CODING-GUIDE.md) — 보안 코딩
- [IDE.md](IDE.md) · [SETUP.md](SETUP.md) · [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [CCIS-PART004](../ccis/CCIS-PART004-CODING-STANDARDS.md) — 본 표준의 수립 근거와 실측
