# 165차 OrderHub 운영 호스트 SSH 실행 매뉴얼

> **목적**: 본 로컬 호스트(PHP 8.0.30, 확장 미가용, MySQL 클라이언트 없음)에서는 §3~§6 실행 불가 → 운영 호스트 SSH 접속 후 본 매뉴얼대로 실행하여 결과를 회신.
> **연계 문서**: `docs/spec/backend_orderhub_165_deployment_checklist.md` (11 섹션 본문)
> **선행 PASS**: §2 PHP lint 4/4 (Db.php / OrderHub.php / Migrate.php / migrate.php) — 본 호스트에서 검증 완료
> **준수 원칙**: U-165-A (데모 격리 절대 원칙) — 운영/데모 DB 명확히 분리 실행

---

## ⚠️ 실행 전 필수 확인

- [ ] 운영 호스트 = `php -v` ≥ 8.1
- [ ] `composer --version` 확인
- [ ] `mysql --version` 또는 운영 DB 접근 가능 클라이언트 확인
- [ ] `backend/.env` 존재 + 다음 키 설정 확인:
  - `GENIE_ENV=production`
  - `GENIE_DB_*` (운영 DB 정보)
  - `GENIE_DEMO_DB_NAME` (demo DB 명칭, 운영과 다른 DB)
- [ ] 운영 DB 백업 완료 (migration 실행 전 의무)

---

## §3 composer dump-autoload

```bash
cd /home/wwwroot/roi.geniego.com/backend
composer dump-autoload --optimize --no-dev 2>&1 | tee /tmp/composer_dump_165.log
echo "EXIT=$?"
```

**기대값**: `Generating optimized autoload files` + `EXIT=0`
**회신 항목**: 로그 마지막 5줄 + EXIT 코드

---

## §4 migration (production)

```bash
cd /home/wwwroot/roi.geniego.com

# 4-1. dry-run (실제 적용 전 SQL 확인)
php backend/bin/migrate.php production --dry-run 2>&1 | tee /tmp/migrate_prod_dryrun_165.log
echo "EXIT_DRYRUN=$?"

# 4-2. dry-run 결과 확인 후 사용자 승인 받고 실 적용
php backend/bin/migrate.php production 2>&1 | tee /tmp/migrate_prod_165.log
echo "EXIT_APPLY=$?"

# 4-3. 테이블 생성 검증
mysql -h <host> -u <user> -p<password> <prod_db> -e "
  SHOW TABLES LIKE 'orderhub_%';
  DESCRIBE orderhub_claims;
  DESCRIBE orderhub_settlements;
" 2>&1 | tee /tmp/migrate_prod_verify_165.log
```

**기대값**:
- dry-run = SQL 출력 + 적용 예정 migration 2건 표시
- apply = `Applied: 20260526_165_001`, `Applied: 20260526_165_002` + `EXIT_APPLY=0`
- verify = `orderhub_claims`, `orderhub_settlements` 2 테이블 표시

**회신 항목**: 각 EXIT 코드 + verify 결과 + 오류 시 로그 전문

---

## §5 migration (demo, U-165-A 핵심)

```bash
cd /home/wwwroot/roi.geniego.com

# 5-1. demo DB가 운영과 물리적으로 분리되었는지 사전 확인
echo "PROD_DB=$(grep GENIE_DB_NAME backend/.env | cut -d= -f2)"
echo "DEMO_DB=$(grep GENIE_DEMO_DB_NAME backend/.env | cut -d= -f2)"
# 두 값이 반드시 달라야 함 (U-165-A)

# 5-2. demo dry-run
php backend/bin/migrate.php demo --dry-run 2>&1 | tee /tmp/migrate_demo_dryrun_165.log

# 5-3. demo 실 적용
php backend/bin/migrate.php demo 2>&1 | tee /tmp/migrate_demo_165.log
echo "EXIT_DEMO=$?"

# 5-4. demo DB 테이블 생성 검증
mysql -h <host> -u <user> -p<password> <demo_db> -e "
  SHOW TABLES LIKE 'orderhub_%';
" 2>&1 | tee /tmp/migrate_demo_verify_165.log
```

**기대값**: 운영과 동일한 2 테이블이 **demo DB** 에 생성됨
**U-165-A 검증**: PROD_DB ≠ DEMO_DB 확인 필수

**회신 항목**: PROD_DB / DEMO_DB 값 (마스킹 가능) + EXIT 코드 + verify 결과

---

## §6 smoke test 5 시나리오

### 준비
```bash
# 운영 호스트 IP, 운영 tenant ID, demo tenant ID 확인
# 토큰 발급 (또는 기존 토큰 활용)
PROD_TOKEN="<운영 tenant 토큰>"
DEMO_TOKEN="<demo tenant 토큰>"
BASE="https://<운영 도메인>"
```

### 시나리오 1: 운영 tenant + /v424/orderhub/orders
```bash
curl -sS -w "\n[HTTP %{http_code}] [time %{time_total}s]\n" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  "$BASE/v424/orderhub/orders?limit=5" 2>&1 | tee /tmp/smoke_1_orders_prod.log
```
**기대값**: HTTP 200 + JSON `{orders: [...]}` (운영 데이터)

### 시나리오 2: 운영 tenant + /v424/orderhub/claims
```bash
curl -sS -w "\n[HTTP %{http_code}]\n" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  "$BASE/v424/orderhub/claims?limit=5" 2>&1 | tee /tmp/smoke_2_claims_prod.log
```
**기대값**: HTTP 200 + JSON `{claims: [...]}` (빈 배열 가능, 165차 신규 테이블)

### 시나리오 3: 운영 tenant + /v424/orderhub/settlements
```bash
curl -sS -w "\n[HTTP %{http_code}]\n" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  "$BASE/v424/orderhub/settlements?limit=5" 2>&1 | tee /tmp/smoke_3_settlements_prod.log
```
**기대값**: HTTP 200 + JSON `{settlements: [...]}` (빈 배열 가능)

### 시나리오 4: demo tenant + 3 endpoint (격리 검증, U-165-A 핵심)
```bash
for ep in orders claims settlements; do
  echo "=== demo $ep ==="
  curl -sS -w "\n[HTTP %{http_code}]\n" \
    -H "Authorization: Bearer $DEMO_TOKEN" \
    "$BASE/v424/orderhub/$ep?limit=5"
done 2>&1 | tee /tmp/smoke_4_demo.log
```
**기대값**:
- HTTP 200 모두
- 응답 데이터가 운영과 **물리적으로 다른 DB** 에서 옴 (DB 분리 확인)
- demo 데이터에 `__demo` flag 또는 demo 식별자 포함 (코드 확인 필요)

### 시나리오 5: /api/ alias 동일 동작
```bash
for ep in orders claims settlements; do
  echo "=== /api/orderhub/$ep ==="
  curl -sS -w "\n[HTTP %{http_code}]\n" \
    -H "Authorization: Bearer $PROD_TOKEN" \
    "$BASE/api/orderhub/$ep?limit=5"
done 2>&1 | tee /tmp/smoke_5_alias.log
```
**기대값**: 시나리오 1~3 과 동일한 HTTP 코드 + 동일 구조 응답

### 회신 양식
```
[§6 smoke test]
1. /v424/orderhub/orders (prod):       HTTP <code>, items: <n>
2. /v424/orderhub/claims (prod):       HTTP <code>, items: <n>
3. /v424/orderhub/settlements (prod):  HTTP <code>, items: <n>
4. demo tenant 3 endpoint:             HTTP <code,code,code>, 격리 OK/NG
5. /api/ alias 3 endpoint:             /v424/ 와 일치 OK/NG

[발견 이슈]: <없음 / 상세>
[로그 snippet]: <오류 시 전문>
```

---

## §7 사후 회귀 검증

```bash
# 165차 변경이 기존 entry에 회귀 없는지 sanity check
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
| `composer dump-autoload` 실패 | PHP < 8.1 | 운영 PHP 버전 확인, 업그레이드 필요 |
| migration 적용 중 SQL 오류 | DB 권한 부족 | `CREATE`, `ALTER` 권한 확인 |
| smoke 401 | token 미발급/만료 | `/auth/login` 으로 재발급 |
| smoke 403 | tenant gate (U-165-A 의도된 동작) | 정상, 다른 tenant 토큰으로 재시도 |
| smoke 500 | handler 내부 오류 | `backend/logs/` 확인 후 로그 전문 회신 |
| /api/ alias 와 /v424/ 결과 다름 | routes.php alias 누락 | 검수자에게 즉시 보고 |
| demo 결과에 운영 데이터 섞임 | **U-165-A 위반, 치명적** | **즉시 중단 + 검수자/사용자 보고** |

---

## 회신 최종 양식 (검수자 → 사용자 → 검수자)

```
[§2 PHP lint]                 4/4 PASS (본 로컬 검증 완료)
[§3 composer dump-autoload]   EXIT=<n>, <성공/실패>
[§4 production migration]
  - dry-run:                  EXIT=<n>
  - apply:                    EXIT=<n>, Applied: 2건
  - verify:                   orderhub_claims OK, orderhub_settlements OK
[§5 demo migration]
  - PROD_DB ≠ DEMO_DB:        Y/N (U-165-A)
  - apply:                    EXIT=<n>
  - verify:                   2 테이블 demo DB에 생성 OK
[§6 smoke test]               1.<>, 2.<>, 3.<>, 4.<>, 5.<>
[§7 회귀]                     기존 entry OK/NG
[발견 이슈]                   <상세>
```

---

**본 매뉴얼 실행 결과 회신 시점 = 166차 배포 검증 완료, 후속 트랙(F2/F3/D/P/T) 결정 단계로 진입.**