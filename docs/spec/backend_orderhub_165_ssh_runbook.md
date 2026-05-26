# 165차 OrderHub 운영 호스트 SSH 실행 매뉴얼 v2

> **v2 변경**: (1) `--dry-run` 옵션 제거 — `bin/migrate.php`는 `both/production/demo/current` 4개 모드만 지원, dry-run 미구현 → 운영자가 그대로 실행 시 실 적용이 자동 실행되는 위험 제거. (2) **§0 사전 DB 백업 섹션 신규 추가** — mysqldump 보강 명령 (운영 + demo 양쪽) 포함. (3) SQL 사전 검토 단계는 `cat backend/migrations/*.sql` 로 대체.
> **목적**: 본 로컬 호스트(PHP 8.0.30, 확장 미가용, MySQL 클라이언트 없음)에서는 §3~§6 실행 불가 → 운영 호스트 SSH 접속 후 본 매뉴얼대로 실행하여 결과를 회신.
> **연계 문서**: `docs/spec/backend_orderhub_165_deployment_checklist.md` (11 섹션 본문)
> **선행 PASS**: §2 PHP lint 4/4 (Db.php / OrderHub.php / Migrate.php / migrate.php) — 본 로컬 검증 완료
> **준수 원칙**: U-165-A (데모 격리 절대 원칙) — 운영/데모 DB 명확히 분리 실행

---

## ⚠️ 실행 전 필수 확인

- [ ] 운영 호스트 = `php -v` ≥ 8.1
- [ ] `composer --version` 또는 `php composer.phar --version` 확인
- [ ] `mysqldump --version` 확인
- [ ] `backend/.env` 존재 + 다음 키 설정 확인:
  - `GENIE_ENV=production`
  - `GENIE_DB_*` (운영 DB 정보)
  - `GENIE_DEMO_DB_NAME` (demo DB 명칭, 운영과 다른 DB)
- [ ] **§0 백업 완료** (이하 §0 실행)
- [ ] **`git pull` 완료** — 165차 commit 4종 운영 호스트 반영 확인

---

## §0 사전 DB 백업 (migration 실행 전 의무, U-165-A + U-163-D)

```bash
# 0-1. 운영 DB 백업
mysqldump -u root -p \
  --single-transaction \
  --routines --triggers --events \
  --default-character-set=utf8mb4 \
  geniego_roi \
  | gzip > /tmp/backup_geniego_roi_before_165_$(date +%Y%m%d_%H%M%S).sql.gz

# 0-2. demo DB 백업 (§5 demo migration 도 적용 — 동시 백업 필수)
mysqldump -u root -p \
  --single-transaction \
  --routines --triggers --events \
  --default-character-set=utf8mb4 \
  geniego_roi_demo \
  | gzip > /tmp/backup_geniego_roi_demo_before_165_$(date +%Y%m%d_%H%M%S).sql.gz

# 0-3. 백업 무결성 검증
ls -lh /tmp/backup_*before_165_*.sql.gz
gunzip -t /tmp/backup_*before_165_*.sql.gz && echo "[OK] gzip integrity"
zcat /tmp/backup_geniego_roi_before_165_*.sql.gz | head -5
zcat /tmp/backup_geniego_roi_demo_before_165_*.sql.gz | head -5
```

**옵션 사유**:

| 옵션 | 사유 |
|---|---|
| `--single-transaction` | InnoDB 일관성 스냅샷, 백업 중 락 회피 (운영 무중단) |
| `--routines --triggers --events` | 스키마 객체 전체 보존 (현재 미사용이라도 안전망) |
| `--default-character-set=utf8mb4` | 한글 데이터 인코딩 안정 |
| `gzip` | 백업 용량 절감 + /tmp 디스크 부담 감소 |
| demo DB 양쪽 백업 | §5 실패 시 롤백 가능 |

**기대값**: 백업 파일 2개 생성, gzip 무결성 OK, head 5줄에 `-- MySQL dump` 헤더 보임
**회신 항목**: `ls -lh` 결과 (파일 크기) + gzip integrity 결과

⚠️ **백업 파일 크기가 0 또는 비정상적으로 작으면 즉시 중단, 검수자 보고**

---

## §1 git pull (165차 commit 4종 운영 반영)

```bash
cd /path/to/GeniegoROI  # 운영 repo root
git fetch --all
git log --oneline -5
# 다음 4 commit 확인:
# - 5898046 (backend)
# - 09c7f64 (frontend)
# - eb31acb (배포 체크리스트)
# - 73ada66 (SSH runbook v1) 또는 v2 commit
git pull origin master 2>&1 | tee /tmp/git_pull_165.log
git log --oneline -5
```

**기대값**: `Fast-forward` + 4 commit 모두 반영
**회신 항목**: pull 후 `git log` 5줄

---

## §2 PHP lint

```bash
cd /path/to/GeniegoROI
for f in backend/src/Db.php backend/src/Handlers/OrderHub.php backend/src/Migrate.php backend/bin/migrate.php; do
  echo "--- $f ---"
  php -l "$f"
done 2>&1 | tee /tmp/lint_165.log
```

**기대값**: 4 파일 모두 `No syntax errors detected`
**회신 항목**: lint 결과 4줄

---

## §3 composer dump-autoload

```bash
cd /path/to/GeniegoROI/backend

# composer 위치 확인
which composer || ls -la composer.phar

# 실행 (composer.phar 사용 시)
php composer.phar install --no-dev --optimize-autoloader 2>&1 | tee /tmp/composer_install_165.log
echo "EXIT_INSTALL=$?"

php composer.phar dump-autoload --optimize --no-dev 2>&1 | tee /tmp/composer_dump_165.log
echo "EXIT_DUMP=$?"
```

**기대값**: `Generating optimized autoload files` + 두 EXIT 모두 0
**회신 항목**: 로그 마지막 5줄 + EXIT 코드 2개

---

## §4 migration 사전 SQL 검토 (dry-run 대체)

> **중요**: `bin/migrate.php` 는 `--dry-run` 옵션 미지원. 사전 검토는 SQL 파일 직접 확인으로 대체.

```bash
cd /path/to/GeniegoROI
echo "=== migration 001: orderhub_claims ==="
cat backend/migrations/20260526_165_001_create_orderhub_claims.sql

echo ""
echo "=== migration 002: orderhub_settlements ==="
cat backend/migrations/20260526_165_002_create_orderhub_settlements.sql

echo ""
echo "=== migration 적용 이력 확인 (이미 적용된 migration 제외 검증) ==="
mysql -u root -p geniego_roi -e "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;" 2>&1 | tee /tmp/schema_migrations_prod_165.log
mysql -u root -p geniego_roi_demo -e "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;" 2>&1 | tee /tmp/schema_migrations_demo_165.log
```

**기대값**:
- SQL 파일 2개 출력 (`CREATE TABLE` 구문 확인)
- `schema_migrations` 테이블에 165차 migration 미존재 (첫 적용 확인)

**회신 항목**: SQL 출력 마지막 5줄 + schema_migrations 결과

⚠️ **이미 165차 migration이 schema_migrations에 있으면 §5/§6 스킵 (재적용 위험)**

---

## §5 migration production 적용

```bash
cd /path/to/GeniegoROI
php backend/bin/migrate.php production 2>&1 | tee /tmp/migrate_prod_165.log
echo "EXIT_PROD=$?"

# 적용 검증
mysql -u root -p geniego_roi -e "
  SHOW TABLES LIKE 'orderhub_%';
  DESCRIBE orderhub_claims;
  DESCRIBE orderhub_settlements;
  SELECT * FROM schema_migrations WHERE migration LIKE '20260526_165%';
" 2>&1 | tee /tmp/migrate_prod_verify_165.log
```

**기대값**:
- 로그에 `Applied: 20260526_165_001`, `Applied: 20260526_165_002` + `EXIT_PROD=0`
- verify = `orderhub_claims`, `orderhub_settlements` 2 테이블 표시
- `schema_migrations` 에 165차 2건 기록

**회신 항목**: EXIT 코드 + verify 결과

---

## §6 migration demo 적용 (U-165-A 핵심)

```bash
cd /path/to/GeniegoROI

# 6-1. demo DB가 운영과 물리적으로 분리되었는지 사전 확인 (U-165-A)
echo "PROD_DB=$(grep '^GENIE_DB_NAME=' backend/.env | cut -d= -f2)"
echo "DEMO_DB=$(grep '^GENIE_DEMO_DB_NAME=' backend/.env | cut -d= -f2)"
# 두 값이 반드시 달라야 함, 같으면 즉시 중단

# 6-2. demo 적용
php backend/bin/migrate.php demo 2>&1 | tee /tmp/migrate_demo_165.log
echo "EXIT_DEMO=$?"

# 6-3. demo DB 테이블 생성 검증
mysql -u root -p geniego_roi_demo -e "
  SHOW TABLES LIKE 'orderhub_%';
  SELECT * FROM schema_migrations WHERE migration LIKE '20260526_165%';
" 2>&1 | tee /tmp/migrate_demo_verify_165.log
```

**기대값**: 운영과 동일한 2 테이블이 **demo DB** 에 생성됨, `schema_migrations` 에 165차 2건 기록
**U-165-A 검증**: PROD_DB ≠ DEMO_DB 확인 필수

**회신 항목**: PROD_DB / DEMO_DB 값 (마스킹 가능, `geniego_***`) + EXIT 코드 + verify 결과

⚠️ **PROD_DB = DEMO_DB 발견 시 즉시 중단, 검수자/사용자 보고 (U-165-A 위반 = 치명적)**

---

## §7 smoke test 5 시나리오

### 준비
```bash
PROD_TOKEN="<운영 tenant 토큰>"
DEMO_TOKEN="<demo tenant 토큰>"
BASE="https://roi.geniego.com"  # 운영 도메인 확인 필요
```

### 시나리오 1~3: 운영 tenant
```bash
for ep in orders claims settlements; do
  echo "=== /v424/orderhub/$ep (prod) ==="
  curl -sS -w "\n[HTTP %{http_code}] [time %{time_total}s]\n" \
    -H "Authorization: Bearer $PROD_TOKEN" \
    "$BASE/v424/orderhub/$ep?limit=5"
done 2>&1 | tee /tmp/smoke_1_3_prod.log
```

### 시나리오 4: demo tenant (격리 검증, U-165-A 핵심)
```bash
for ep in orders claims settlements; do
  echo "=== /v424/orderhub/$ep (demo) ==="
  curl -sS -w "\n[HTTP %{http_code}]\n" \
    -H "Authorization: Bearer $DEMO_TOKEN" \
    "$BASE/v424/orderhub/$ep?limit=5"
done 2>&1 | tee /tmp/smoke_4_demo.log
```

### 시나리오 5: /api/ alias
```bash
for ep in orders claims settlements; do
  echo "=== /api/orderhub/$ep ==="
  curl -sS -w "\n[HTTP %{http_code}]\n" \
    -H "Authorization: Bearer $PROD_TOKEN" \
    "$BASE/api/orderhub/$ep?limit=5"
done 2>&1 | tee /tmp/smoke_5_alias.log
```

### 회신 양식
```
[§7 smoke test]
1. /v424/orderhub/orders (prod):       HTTP <code>, items: <n>
2. /v424/orderhub/claims (prod):       HTTP <code>, items: <n>
3. /v424/orderhub/settlements (prod):  HTTP <code>, items: <n>
4. demo tenant 3 endpoint:             HTTP <code,code,code>, 격리 OK/NG
5. /api/ alias 3 endpoint:             /v424/ 와 일치 OK/NG
```

---

## §8 회귀 검증

```bash
curl -sS -w "\n[HTTP %{http_code}]\n" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  "$BASE/v382/settlements/recent?limit=3"

curl -sS -w "\n[HTTP %{http_code}]\n" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  "$BASE/v424/auth/me"
```

**기대값**: 기존 동작 그대로 (HTTP 200)

---

## ⚠️ 실행 중 이슈 발생 시

| 증상 | 추정 원인 | 1차 대응 |
|---|---|---|
| `composer.phar` not found | 운영에 미배포 | `curl -sS https://getcomposer.org/installer | php` |
| `php -l` 실패 (PHP < 8.1) | 운영 PHP 버전 부족 | 운영자 PHP 업그레이드 필요, 본 매뉴얼 중단 |
| migration SQL 오류 | DB 권한 부족 | `CREATE`, `ALTER` 권한 확인 |
| smoke 401 | token 미발급/만료 | `/auth/login` 재발급 |
| smoke 403 | tenant gate (U-165-A 의도된 동작) | 정상, 다른 tenant 토큰으로 재시도 |
| smoke 500 | handler 내부 오류 | `backend/logs/` 확인 후 로그 전문 회신 |
| /api/ alias ≠ /v424/ | routes.php alias 누락 | 검수자에게 즉시 보고 |
| demo 결과에 운영 데이터 섞임 | **U-165-A 위반, 치명적** | **즉시 중단 + §0 백업으로 demo DB 복원 + 검수자/사용자 보고** |
| `Usage: migrate.php [both\|production\|demo\|current]` | `--dry-run` 등 unknown mode 입력 | 본 매뉴얼은 dry-run 미사용, 명령 재확인 |

---

## ⚠️ 롤백 절차 (issue 발생 시)

```bash
# orderhub_* 테이블 삭제 (재migration 가능 상태로)
mysql -u root -p geniego_roi -e "
  DROP TABLE IF EXISTS orderhub_claims;
  DROP TABLE IF EXISTS orderhub_settlements;
  DELETE FROM schema_migrations WHERE migration LIKE '20260526_165%';
"

mysql -u root -p geniego_roi_demo -e "
  DROP TABLE IF EXISTS orderhub_claims;
  DROP TABLE IF EXISTS orderhub_settlements;
  DELETE FROM schema_migrations WHERE migration LIKE '20260526_165%';
"

# 또는 §0 백업에서 복원
zcat /tmp/backup_geniego_roi_before_165_*.sql.gz | mysql -u root -p geniego_roi
zcat /tmp/backup_geniego_roi_demo_before_165_*.sql.gz | mysql -u root -p geniego_roi_demo
```

---

## 회신 최종 양식 (운영자 → 사용자 → 검수자)

```
[§0 백업]                     prod 백업 <크기>, demo 백업 <크기>, gzip OK
[§1 git pull]                 4 commit 반영 OK
[§2 PHP lint]                 4/4 PASS (운영 호스트 검증)
[§3 composer]                 EXIT_INSTALL=<n>, EXIT_DUMP=<n>
[§4 SQL 검토]                 schema_migrations 에 165차 미존재, SQL OK
[§5 production migration]     EXIT=<n>, Applied 2건, verify OK
[§6 demo migration]
  - PROD_DB ≠ DEMO_DB:        Y/N (U-165-A)
  - apply:                    EXIT=<n>
  - verify:                   2 테이블 demo DB에 생성 OK
[§7 smoke test]               1.<>, 2.<>, 3.<>, 4.<>, 5.<>
[§8 회귀]                     기존 entry OK/NG
[발견 이슈]                   <상세 또는 없음>
```

---

**본 매뉴얼 실행 결과 회신 시점 = 166차 배포 검증 완료, 후속 트랙(F2/F3/D/P/T) 결정 단계로 진입.**