# 165차 OrderHub Aggregator 배포 체크리스트

> **작성일**: 2026-05-26
> **세션**: 165차 백엔드 트랙
> **대상 commit**: `5898046` (backend) + `09c7f64` (frontend)
> **저장 위치**: `docs/spec/backend_orderhub_165_deployment_checklist.md`
> **목적**: 본 세션 산출물 (운영 배포 가능 상태) 의 호스트 환경 검증 + 운영 적용 절차

---

## 0. 사전 인지

- 본 세션 작업 = repo 내 코드/spec/migration 적용 완료 (commit 5898046, 09c7f64)
- 호스트 환경 부재로 **deferred** 된 작업이 본 문서의 검증 대상
- 운영 배포 시 본 체크리스트를 **순서대로** 따라 실행
- 단계 별 실패 시 → 해당 step 에서 중단, 원인 파악 후 재시도

---

## 1. 사전 점검 (deploy 전, 모든 환경 공통)

### 1.1 PHP 버전 확인

```bash
php --version
```

**기대값**: PHP 8.1 이상 (Slim 4 + 본 spec 의 strict_types=1 + str_starts_with 요구).

### 1.2 Composer 확인

```bash
cd backend && php composer.phar --version
```

**기대값**: Composer 2.x.

### 1.3 환경 변수 확인 (.env 또는 시스템 env)

```bash
cd backend
grep -E '^(GENIE_ENV|GENIE_DB_NAME|GENIE_DEMO_DB_NAME)=' .env
```

**기대값**:
- 운영 서버: `GENIE_ENV=production`, `GENIE_DB_NAME=geniego_roi`
- demo 서버: `GENIE_ENV=demo`, `GENIE_DEMO_DB_NAME=geniego_roi_demo` (또는 `GENIE_DB_NAME` 동일 fallback)

**.env 부재 시**: `cp .env.example .env` 후 위 값 명시.

---

## 2. PHP syntax 검증 (deferred 해소)

### 2.1 신규/수정 PHP 파일 lint

```bash
cd /path/to/GeniegoROI

php -l backend/src/Db.php
php -l backend/src/Handlers/OrderHub.php
php -l backend/src/Migrate.php
php -l backend/bin/migrate.php
```

**기대값** (각 파일): `No syntax errors detected in <path>`

**실패 시**:
- 에러 메시지 캡처 → 본 세션 브레이스/괄호 balance 검증 결과와 대조
- 본 세션 검증 = brace/paren/bracket 모두 균형 → 호스트 PHP 8.1+ 가정 + 함수 시그니처/use 문 호환성 확인
- `str_starts_with` 미지원 (PHP 8.0 이하) → PHP 8.1+ 업그레이드 필수

---

## 3. Composer autoload 갱신

### 3.1 dump-autoload

```bash
cd backend && php composer.phar dump-autoload --optimize
```

**기대값**:
- `Generating optimized autoload files`
- `Generated optimized autoload files containing N classes` (N 은 환경별 상이)

**효과**: PSR-4 (`Genie\\` → `src/`) classmap 에 신규 `Genie\Handlers\OrderHub`, `Genie\Migrate` 등록.

---

## 4. Migration 실행 (U-165-C L2 동기화 핵심)

### 4.1 운영 + demo 동시 적용 (권장)

```bash
cd /path/to/GeniegoROI
php backend/bin/migrate.php both
```

**기대 출력**:
```
=== Production ===
Applied: 2
  + 20260526_165_001_create_orderhub_claims.sql
  + 20260526_165_002_create_orderhub_settlements.sql
Skipped: 0

=== Demo ===
Applied: 2
  + 20260526_165_001_create_orderhub_claims.sql
  + 20260526_165_002_create_orderhub_settlements.sql
Skipped: 0
```

### 4.2 재실행 idempotent 검증

```bash
php backend/bin/migrate.php both
```

**기대 출력**:
```
=== Production ===
Applied: 0
Skipped: 2

=== Demo ===
Applied: 0
Skipped: 2
```

### 4.3 schema 동기화 검증 (MySQL)

```bash
mysql -u root -e "USE geniego_roi; SHOW TABLES LIKE 'orderhub_%'; SELECT filename FROM schema_migrations ORDER BY filename;"
mysql -u root -e "USE geniego_roi_demo; SHOW TABLES LIKE 'orderhub_%'; SELECT filename FROM schema_migrations ORDER BY filename;"
```

**기대값** (양쪽 동일):
- `orderhub_claims`, `orderhub_settlements` 2 테이블 존재
- `schema_migrations` 에 본 세션 2 migration 기록

**불일치 시**: U-165-C L2 동기화 실패 → 누락 환경에 `migrate.php production` 또는 `migrate.php demo` 개별 실행.

### 4.4 단일 환경 적용 (긴급 케이스)

운영만 또는 demo 만 적용 필요 시:

```bash
php backend/bin/migrate.php production
php backend/bin/migrate.php demo
php backend/bin/migrate.php current     # GENIE_ENV 에 따라 자동 선택
```

---

## 5. Backend 기동 + Route 등록 확인

### 5.1 backend 서버 기동 (로컬 검증)

```bash
cd /path/to/GeniegoROI/backend
php -S 0.0.0.0:8000 -t public
```

운영 배포 시 = 기존 PHP-FPM / nginx 구성 그대로 (별도 기동 명령 없음).

### 5.2 route 등록 grep 확인

```bash
grep -nE "v424/orderhub" backend/src/routes.php
```

**기대값**: 6 라인 (3 endpoint × 2 alias `/v424/...` + `/api/v424/...`)

### 5.3 health endpoint

```bash
curl -s http://localhost:8000/ | head -20
```

**기대값**: 200 OK + JSON 응답 (현 health 응답 형식 유지).

---

## 6. Smoke Test (spec v3 §9 + middleware 정합)

### 6.1 API key 준비

- **운영 키**: 운영 DB 의 `api_key` 테이블에서 `tenant_id` 가 'demo' 가 아닌 활성 키 1개
- **demo 키**: `genie_live_demo_key_00000000` (public health 응답에 노출되는 demo admin 키)

```bash
export KEY_PROD='<운영 api_key plaintext>'
export KEY_DEMO='genie_live_demo_key_00000000'
```

### 6.2 5 시나리오 매트릭스

#### (1) 운영 환경 + 운영 키 → 200

```bash
GENIE_ENV=production curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" \
  -H "Authorization: Bearer $KEY_PROD" | jq .
```

**기대값**:
```json
{"ok":true,"items":[...],"total":N,"limit":5,"offset":0,"_env":"production","_isDemo":false}
```

#### (2) 운영 환경 + demo 키 → 403 `demo_blocked_in_production`

```bash
GENIE_ENV=production curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" \
  -H "Authorization: Bearer $KEY_DEMO" | jq .
```

**기대값**:
```json
{"ok":false,"error":"demo_blocked_in_production"}
```

HTTP status: 403.

#### (3) 키 없음 → 401 (middleware 차단)

```bash
curl -s -w "\nHTTP: %{http_code}\n" "http://localhost:8000/v424/orderhub/orders?limit=5"
```

**기대값**: 401 + middleware 의 unauthorized 응답.

#### (4) demo 환경 + demo 키 → 200

```bash
GENIE_ENV=demo curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" \
  -H "Authorization: Bearer $KEY_DEMO" | jq .
```

**기대값**:
```json
{"ok":true,"items":[...],"total":N,"limit":5,"offset":0,"_env":"demo","_isDemo":true}
```

#### (5) demo 환경 + 운영 키 → 403 `production_blocked_in_demo`

```bash
GENIE_ENV=demo curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" \
  -H "Authorization: Bearer $KEY_PROD" | jq .
```

**기대값**:
```json
{"ok":false,"error":"production_blocked_in_demo"}
```

### 6.3 claims / settlements endpoint 동일 시나리오

orders 와 동일 패턴으로 (1)~(5) 반복:

```bash
curl -s "http://localhost:8000/v424/orderhub/claims?limit=5" -H "Authorization: Bearer $KEY_PROD" | jq .
curl -s "http://localhost:8000/v424/orderhub/settlements?limit=5" -H "Authorization: Bearer $KEY_PROD" | jq .
```

claims/settlements 는 신규 테이블이므로 첫 호출 시 빈 결과 정상:
```json
{"ok":true,"items":[],"total":0,"limit":5,"offset":0,"_env":"production","_isDemo":false}
```

---

## 7. Frontend 검증

### 7.1 Build 확인

본 세션에서 vite build 15.00s green 검증 완료. 운영 배포 시:

```bash
cd /path/to/GeniegoROI
npm run build
```

**기대값**: `✓ built in ~15s`, 75 page chunks emit.

### 7.2 Demo 모드 동작 검증

브라우저:
- demo 호스트 (예: `https://roidemo.genie-go.com`) 접속 → OrderHub 페이지
- Mock 데이터 (DEMO_ORDERS / DEMO_SETTLEMENT) 표시 확인
- 콘솔 에러 0

### 7.3 운영 모드 동작 검증

브라우저:
- 운영 호스트 (예: `https://roi.genie-go.com`) 접속 → OrderHub 페이지
- 빈 상태 또는 backend 로부터 fetch 된 데이터 표시
- Network 탭: `/api/v424/orderhub/orders|claims|settlements` 호출 확인
- Authorization 헤더 = Bearer + 운영 token
- 응답 200 OK + `_env: production` / `_isDemo: false`

### 7.4 환경 cross-check 격리 검증

- 운영 호스트에서 demo token 으로 로그인 시도 → 403 `demo_blocked_in_production`
- demo 호스트에서 운영 token 으로 로그인 시도 → 403 `production_blocked_in_demo`

---

## 8. 회귀 검증 (U-164-A i18n 동결 준수)

### 8.1 ko.js + locale 무변경 확인

```bash
git diff HEAD~2 -- frontend/src/i18n/ | wc -l
```

**기대값**: 0 (commit 5898046 + 09c7f64 모두 i18n 무변경).

### 8.2 leaf count 무변경

```bash
node tools/leaf_count.mjs frontend/src/i18n/ko.js
```

**기대값**: 30,656 (164차 종결 시점 baseline 유지).

### 8.3 sacred SHA (ja.js / zh.js) 무변경

pre-commit hook G2 가 자동 검증. 본 세션 2 commit 모두 ✅ G2 sacred SHA match 통과 확인.

---

## 9. 트러블슈팅

### 9.1 migration "Empty/unreadable migration" 에러

**원인**: SQL 파일이 비어있거나 권한 문제.

**해결**: `ls -la backend/migrations/` + 파일 내용 확인.

### 9.2 "table or view already exists" (재실행 안전성 위반)

**원인**: 이전 ensureSchema (v2) 가 이미 테이블 생성 → schema_migrations 미기록 상태.

**해결** (운영):
```sql
INSERT INTO schema_migrations (filename, applied_at) VALUES
  ('20260526_165_001_create_orderhub_claims.sql', NOW()),
  ('20260526_165_002_create_orderhub_settlements.sql', NOW());
```

이후 `migrate.php` 재실행 → Skipped: 2.

### 9.3 SQLite fallback 진입 시 ENUM/KEY 변환 에러

**원인**: `convertForSqlite` 정규식이 특정 케이스에서 실패.

**해결**: 본 spec migration SQL 은 단순 케이스만 가정. 복잡한 SQL 추가 시 driver 별 디렉터리 분리 검토 (spec v3 §13.7).

### 9.4 frontend fetch 401 응답 (운영 모드)

**원인**:
- localStorage 의 `genie_token` 미설정 또는 만료
- `getJsonAuth` 가 Bearer 헤더 전송했으나 middleware 가 거부

**해결**:
- `/auth/login` 으로 token 재발급
- 또는 X-Tenant-ID 헤더 확인 (apiClient.js defaultHeaders())

### 9.5 frontend fetch 403 응답 (운영 모드)

**원인**: 사용자가 demo tenant 의 api_key 로 운영 환경 호출.

**해결**: 운영 tenant 의 api_key 발급 후 재로그인.

---

## 10. 운영 적용 결과 보고 양식

배포 완료 후 다음 형식으로 결과 기록:

```
배포 일시: YYYY-MM-DD HH:MM
배포 환경: production / demo / both
적용 commit: 5898046 + 09c7f64
실행 결과:
  - php -l: 4/4 PASS
  - composer dump-autoload: PASS (N classes)
  - migrate.php both: applied 2+2, skipped 0+0
  - smoke test 5 시나리오: 5/5 PASS
  - frontend build: PASS (15s)
  - 회귀 검증 (i18n / sacred SHA): PASS
이슈: (없음 또는 발견 사항)
다음 작업: (별도 트랙 또는 본 spec 미적용 항목)
```

---

## 11. 본 체크리스트 적용 범위 외 (별도 트랙)

- **U-165-B (점진 migration)**: 기존 41 handler 의 격리 강화 트랙
- **U-165-C L3 (seed)**: demo 데이터 seed runner 인프라
- **방어선 4 (DB 물리 분리)**: 운영/demo DB 별도 서버 또는 별도 인스턴스 분리
- **방어선 6 (demo 키 권한 강등)**: demo api_key 의 admin role → analyst role 강등
- **CI 자동 migration**: deploy hook 에 `migrate.php both` 통합
- **PM 기능 확장 (Task/Milestone/Gantt 등)**: 신규 spec 트랙 (N-152-F 본 작업급)

---

**문서 종결.**