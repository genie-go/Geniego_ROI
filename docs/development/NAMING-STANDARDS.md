# 명명 & 패키지 표준 (실행 규약)

> 정본·근거·명세 매핑은 [`docs/ccis/CCIS-PART005-NAMING-PACKAGE-STANDARDS.md`](../ccis/CCIS-PART005-NAMING-PACKAGE-STANDARDS.md).
> 본 문서는 **신규 코드가 바로 따르는 규약**만 간결히 정리한다. 실측 저장소 관례(추정 아님)다.

## Backend (PHP · Slim 4 · PSR-4)

- **Namespace**: `Genie\`. (★`GenieGoROI\` 아님 — 허구)
  - 핸들러 `Genie\Handlers\{Name}` · PM 확장 `Genie\Handlers\PM\` · 유틸 `Genie\Utils\` · 공용 `Genie\{Name}`(`Db`·`Crypto`·`Mailer`·`NotifyEngine`…).
- **핸들러**: `src/Handlers/{Name}.php` → `class {Name}` → `public static function {action}(Request $req, Response $res, array $args = []): Response`.
  - ★**`src/routes.php` 에 등록해야 배선된다**(autodiscovery 없음): `'METHOD /v{NNN}/path' => 'Genie\\Handlers\\{Name}::{action}'`.
- **파일 골격**:
  ```php
  <?php
  declare(strict_types=1);
  namespace Genie\Handlers;
  ```
- **함수/변수**: `camelCase`. boolean 반환은 `is*/has*/can*`. 약어 남용 금지(`$amt`·`$tmp1` 등).
- **클래스**: `PascalCase`. 예외는 `{X}Exception`.
- **PSR-4 준수**: 네임스페이스 ↔ 디렉터리 일치. `composer dump-autoload` 로 확인.

## API URL

- 신규 엔드포인트는 **최신 버전 접두** `/v{NNN}/...`. 실배선은 `/api/` 접두 병기(nginx SPA HTML 폴백 착시 회피).
- 복수형 리소스·표준 메서드(`GET /orders/{id}`·`POST /orders`). 동사형 경로(`/getOrder`) 금지.
- ★**기존 URL 변경 금지**(하위호환·회귀 라우팅).

## Database (MySQL 8 · SQLite 폴백)

- `snake_case`. 테이블 복수형. 시각 `created_at`/`updated_at`. boolean `is_active`/`is_deleted`. FK `{entity}_id`.
- ★**모든 테이블·모든 쿼리에 `tenant_id` 격리**(헌법 — 테넌트 격리 절대).
- `SELECT *` 지양·조인 조건 명시. 신규 스키마는 **마이그레이션 vs 핸들러 `ensureTables` 중 어느 쪽인지 명시**(섞지 않기).

## 환경변수

- **`GENIE_*`** (루트 `.env`). 예: `GENIE_DB_HOST`·`GENIE_DB_NAME`·`GENIE_DB_USER`·`GENIE_DB_PASS`·`GENIE_DB_PORT`.
- ★`GENIEGOROI_*` **금지**(어느 코드도 안 읽는 허구 키).

## 품질 게이트

- 정적분석: `make phpstan`(레벨5·baseline). 신규 위반 시 FAIL.
- 통합: `make quality`(ESLint·PHP구문·Shell·JSON·Git·PHPStan).
- ★**신규 파일도 게이트 통과 필수** — 특히 `declare(strict_types=1)`·`tenant_id` 격리·`routes.php` 등록.

## 미사용/부재 (혼동 주의)

- **Interface/Trait/Enum·Repository/Service/DTO/Policy/Job/Queue/Event/Listener 패턴 = 이 저장소에 없음**. 명세에 있어도 이식하지 말 것(Slim+정적핸들러 구조).
- Docker/k8s = 미사용 스텁. 배포 = 수동 pscp/plink.
- 포매터(cs-fixer/pint)·Pest/PHPUnit = 미설치.
