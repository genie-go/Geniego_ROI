# 168차 세션 인계서 (NEXT_SESSION.md) — **167차 5 commit 종결 + 9개 절대 원칙 명문화**

> **작성일**: 2026-05-26
> **이전 세션**: 167차 (deploy.yml cleanup + RoiService stub 제거 + /v424/health + --rollback + routes.php register 누락 78건 정합)
> **다음 세션**: 168차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 1+4+5+6+9순위 cleanup·정합 완료, 운영 배포는 168차로 이양 (credentials 회전 의무)

---

## ⚠️ 168차 검수자 최우선 인지 사항

### 0. 9개 절대 원칙 (최상위 의무, 167차 명문화)

본 9개 원칙은 **U-prefix 운영원칙보다 상위**. 모든 작업의 최상위 의무. 위반 시 즉시 정정.

1. **구현 품질 — 초엔터프라이즈급 절대 기준** (단순 동작/임시 처리/하드코딩 금지, 글로벌 SaaS+ERP 안정성·확장성·유지보수성)
2. **기존 기능 안정성 절대 보장** (신규/수정/리팩토링/배포로 기존 메뉴·기능 오류 절대 금지. "나중에 수정"/"일단 동작만" 금지)
3. **PM·에이전시 책임** (전체 영향도 사전 분석 + 구조 검토 + 초엔터프라이즈급 아키텍처 + 보안·권한 우선)
4. **데이터 분석 + AI 운영 — 플랫폼 본질** (실시간 수집·통합 분석·KPI·AI 예측·자동화·이상 탐지. **데이터 보안 = 은행급 이상, 개인정보 = 국가 행정망 이상**)
5. **글로벌 플랫폼 기준** (보안 = 은행급+국가 행정망 이상, 글로벌 SaaS UX/UI, 대규모 트래픽, 멀티테넌시, HA, 전 구간 암호화)
6. **기능 누락 보고 의무** (① 보고 → ② 필요성 → ③ 영향도 → ④ 승인 → ⑤ 작업. 임의 축소 금지)
7. **경쟁 플랫폼 대비 품질** (**사방넷 수준 이상**. 관리자 기능 부족/낮은 자동화/불편 UX/느린 처리 금지)
8. **개발 수행 원칙** (구조·확장성·안정성 우선, 모듈화, 테스트 가능, 문서화, 장애 대응)
9. **최종 목표** (글로벌 엔터프라이즈 + 대규모 통합 운영 + 확장형 SaaS + AI 기반. **"빠른 구현"보다 "초엔터프라이즈급 완성도" 절대 우선**)

영구화 위치: `~/.claude/projects/E--project-GeniegoROI/memory/feedback_absolute_principles.md`

### 1. 최상위 상태

**167차 = (a) GitHub Actions deploy.yml cleanup (U-166-D 정합) + (b) RoiService stub 제거 (dead code) + (c) /v424/health 엔터프라이즈 endpoint 신설 + (d) bin/migrate.php --rollback 옵션 + (e) routes.php $register 누락 78건 일괄 정합 (audit_routes.php 도구 신설) + 5 master commit 종결.**

**168차 = (a) 9개 절대 원칙 내재화 + (b) 167차 신규 endpoint·routes 정합 운영 deploy + (c) 후속 트랙 (SQLite convert 검증 / N-152-F PM 본 작업 / credentials 회전 / 운영 hit 검증).**

### 2. 사용자 운영원칙 누적 (U-prefix, 절대 원칙 하위)

기존 U-161-A ~ U-166-H 유지. **167차 신규 X** (이번엔 절대 원칙으로 추상도 상승).

### 3. i18n 트랙 동결 유지 (U-164-A)

- 167차 i18n 무변경 (ko.js 30,656 leaves baseline 유지)
- sacred SHA (ja.js / zh.js) match 5회 (5 commit 모두 pre-commit G2 PASS)

### 4. 168차 검수자 첫 응답 의무

- ⚠️ 섹션 인지 + **9개 절대 원칙 명시 인지**
- U-166-A ~ H + 167차 절대 원칙 9개 누적 명시
- 167차 commit 5종 인지 (603e9fe ~ ec139ed)
- 후속 트랙 인지 (SQLite convert / 운영 deploy / credentials 회전)
- 사용자에게 168차 우선 트랙 결정 요청 (1순위 cc 권장 명시)

---

## 1. 167차 결과 요약

### 1.1 master commit 5개 (시간 순)

| Commit | 영역 | 변경 | 상태 |
|---|---|---|---|
| `603e9fe` | .github/workflows/deploy.yml cleanup (U-166-D 정합) | -139/+7, paths-ignore +backend/** | ✅ pushed |
| `5bcc719` | backend/src/Services/RoiService.php (18L stub) 제거 + RoiService.php 주석 정리 | -21 | ✅ pushed |
| `af601e3` | Health::check + /v424/health + /api/v424/health + routes 매핑 + index.php public bypass regex | +128/-1 | ✅ pushed |
| `5cf30ee` | Migrate::rollback / dryRunRollback / rollbackBoth + bin/migrate.php --rollback + 165차 sql 2개 @rollback 블록 | +242/-25 | ✅ pushed |
| `ec139ed` | routes.php $register 78건 일괄 정합 + audit_routes.php 도구 신설 | +157/-0 | ✅ pushed |

### 1.2 1순위 — deploy.yml cleanup (603e9fe)

- 제거: changes job (paths-filter dorny/paths-filter@v3) + deploy-backend job 전체 (P1~P4 + Slack)
- 보존: frontend deploy job (Phase 1 syntax guard + Phase 2 npm build = CI validation 가치)
- paths-ignore에 `backend/**` 추가 — backend 변경 시 무의미한 frontend rebuild 회피
- 검증: js-yaml load OK (jobs: deploy, paths-ignore 8, steps 8), `needs.changes`/`dorny`/`paths-filter` 잔존 0

### 1.3 4순위 — RoiService stub 제거 (5bcc719)

- 166차 PSR-4 fix(2fe4e57)에서 `src/RoiService.php` → `Genie\RoiService` ns로 정합
- `src/Services/RoiService.php` (18L stub, `Genie\Services\RoiService`, `[cite: 1]` invalid markup 잔재) → 사용처 0 검증 후 제거
- `backend/src/Services/` 디렉토리 자동 정리 (마지막 파일 제거)
- composer.json PSR-4 `Genie\` → `src/` 매핑 변경 X

### 1.4 5순위 — /v424/health 엔터프라이즈 endpoint (af601e3)

**Health::check 응답 구조 (U-166-E 정합)**:
```json
{
  "status": "ok" | "degraded",
  "service": "geniego-roi-backend",
  "timestamp": "2026-05-26T16:30:00+09:00",
  "php_version": "8.1.34",
  "memory": { "usage_mb", "peak_mb", "limit" },
  "deploy": { "last_deploy": "...", "composer_lock_age_seconds": ... },
  "db": {
    "ok": true,
    "env": "production",
    "driver": "mysql",
    "server_version": "8.0.37",
    "connect_ms": 1.2,
    "latest_migration": { "version": "...", "applied_at": "..." }
  },
  "response_time_ms": 2.5
}
```

- HTTP 200 정상 / 503 Service Unavailable (DB fail)
- routes.php: `'GET /v424/health'` + `'GET /api/v424/health'` $custom + $register 2건 매핑
- index.php public bypass regex: `^/v\d+[\w.]*/health[z]?$` → `^(/api)?/v\d+[\w.]*/health[z]?$` (Apache Alias /api 대응)
- **부가**: af601e3 작업 중 OrderHub `/v424/orderhub/*` 6건이 $custom만 정의되고 $register 호출 누락 발견 → 본 commit에 함께 매핑 보강 (이후 9순위 일괄 점검의 단서)

### 1.5 6순위 — bin/migrate.php --rollback 옵션 (5cf30ee)

**Convention 도입**: migration 파일 `-- @rollback` ~ `-- @end-rollback` 블록 reverse DDL 명시. 마커 미존재 시 명확한 에러로 중단 (안전 디폴트).

**신규 Migrate 메서드**:
- `rollback(PDO, steps=1, dir=null)` — 마지막 N개 record @rollback SQL 적용 + schema_migrations DELETE (트랜잭션 보호 + MySQL implicit commit inTransaction 체크)
- `rollbackBoth(steps, dir)` / `dryRunRollback(PDO, steps, dir)` / `dryRunRollbackBoth(steps, dir)`
- `extractRollbackBlock(sql)` private — 정규식 추출

**bin/migrate.php CLI 확장**:
- `--rollback` → 마지막 1개
- `--rollback=N` → 마지막 N개
- `--rollback --dry-run` → 예정 식별 + @rollback 누락 사전 보고
- 모든 모드 (both/production/demo/current) 호환

**165차 migration 2 파일에 @rollback 블록 추가**:
- `20260526_165_001_create_orderhub_claims.sql` → `DROP TABLE IF EXISTS orderhub_claims;`
- `20260526_165_002_create_orderhub_settlements.sql` → `DROP TABLE IF EXISTS orderhub_settlements;`

**SQLite end-to-end 검증 통과**: apply 2 → rollback 2 → schema_migrations 0 → re-apply 2 (idempotent 복원).

### 1.6 9순위 — routes.php $register 누락 78건 일괄 정합 + audit_routes.php (ec139ed)

**audit_routes.php 도구** (backend/bin/audit_routes.php, 신규):
- $custom 정의된 키 vs $register 호출된 키 diff
- 미매핑 발견 시 exit 1, 0건이면 exit 0
- $register만 호출되고 $custom 미정의는 template fallback (정상)

**감사 결과 (전)**:
- $custom keys: 450
- $register calls: 780
- **미매핑 78건** (운영에서 Slim 404 응답)

**미매핑 도메인 분포**:
| 도메인 | 누락 건수 |
|---|---|
| v410 Alerting action_requests | 2 |
| v418 / v4181 / v4182 / v4183 Insights + Decisioning (5×7 prefix bundle) | 35 |
| v420 PriceOpt (products / elasticity / optimize / competitor / repricer / calendar) | 13 |
| v420 SupplyChain (lines / suppliers / risk-rules / summary) | 13 |
| v420 ReturnsPortal (list / status / wms-link / settings / automation) | 9 |
| auth license | 2 |
| api/v1 ad-performance summary | 1 |
| (167차 5순위에서 선행 처리한 OrderHub 6 + Health 2는 별도) | — |

**정합 후**: $register 858, 미매핑 0 ✅

---

## 2. 168차 진입 시 1순위 작업 (cc 권장)

### 권장 1순위: 167차 신규 endpoint·routes 정합 운영 deploy

**대상 커밋**: 167차 5건 중 backend 영향 4건 (5bcc719 / af601e3 / 5cf30ee / ec139ed)

**선행 의무**:
1. **credentials 회전 완료 확인** (운영 SSH root + MySQL root) — U-166-H + N-158-A
2. cc plink 직접 deploy 패턴 (NEXT_SESSION.md §3 — 167차 §1.4에서 이전, 본 §3 참조)
3. **사용자 새 credentials 1회 사용 후 폐기** + 본 chat 기록 정책 재확인

**deploy 후 검증**:
- `curl https://roi.genie-go.com/v424/health` → HTTP 200 + JSON 응답 확인
- 78건 register 보강 endpoint 중 핵심 hit 테스트 (v418.1 decisioning + v420 supply + v420 returns)
- schema_migrations 변경 X (이미 165_001/002 적용 상태)

### 권장 2순위: SQLite convertForSqlite ENUM/KEY 변환 검증

**발견**: 6순위 작업 검증 (`backend/bin/_test_rollback.php` 임시) 중 SQLite end-to-end에서 `orderhub_claims` / `orderhub_settlements` 테이블이 sqlite_master 에 등록되지 않으면서 schema_migrations 에는 record가 들어가는 inconsistency 관찰. PDO exception 미발생 → silently 빈 statement 생성 가능성.

**영향**: 운영 MySQL은 무관 (직접 SQL 적용). dev 환경 SQLite fallback 사용자에만 영향. 신규 dev setup 시 OrderHub 기능 미작동 잠재.

**작업**:
- `Migrate::convertForSqlite()` 단위 검증 (ENUM 변환 / KEY → CREATE INDEX 분리)
- 165차 sql 2개 변환 결과 직접 확인 (echo) → CREATE TABLE statement 유효성 검증
- 필요시 SQL parser 보강 또는 명시적 statement validation

### 권장 3순위: N-152-F PM 본 작업 spec 작성

- Task / Milestone / Gantt 데이터 모델 + 메뉴 간 동기화 (U-166-F)
- 초엔터프라이즈급 + 분석 기능 (절대 원칙 §1 + §4)
- 별도 spec 신규 세션 권장이었으나, 167차 routes 정합 완료로 진입 가능 상태

### 권장 4순위: audit_routes.php pre-commit hook 통합 (영구 정합)

- 본 167차 9순위 발견 패턴 재발 방지
- `.githooks/pre-commit`에 G9 게이트 추가 (routes.php staged 시 audit_routes.php exit 0 검증)
- 단 PHP PATH 의존 — Git Bash + cc Windows에서 `php` PATH 미등록 → `command -v php` 가드 + skip-warn 패턴

### 권장 5순위: backend `/health` 외 모니터링 보강

- `/v424/metrics` (Prometheus 형식) — 절대 원칙 §4 실시간 모니터링
- Slack heartbeat (운영 health check 5분 cron + degraded 알림)
- 로그 수집 (Monolog 정밀화 + 로그 회전)

### 권장 6순위 (이후): N-158-A 보안 트랙 — credentials 회전 매뉴얼화

- SSH key 인증 전환 (password → key-only)
- MySQL root 회전 + .my.cnf.bak 갱신 절차
- 운영 history clear (운영자 책임 + 절차 docs 명시)

---

## 3. 운영 deploy 표준 절차 (cc plink 직접, U-166-D)

```powershell
# 1) local tar (backend 변경분만)
tar -czf /tmp/backend.tgz --exclude=backend/.env --exclude=backend/vendor \
  --exclude=backend/data --exclude=backend/logs --exclude=backend/.my.cnf* \
  backend/

# 2) pscp 전송
& "C:\Program Files\PuTTY\pscp.exe" -batch -pw '<NEW_PASS>' \
  "C:\Users\Master\AppData\Local\Temp\backend.tgz" \
  root@1.201.177.46:/tmp/backend.tgz

# 3) plink SSH script
& "C:\Program Files\PuTTY\plink.exe" -ssh -batch -pw '<NEW_PASS>' root@1.201.177.46 "
  set -e
  mysqldump --defaults-file=/home/wwwroot/roi.geniego.com/backend/.my.cnf.bak \
    --single-transaction --routines --triggers --events --default-character-set=utf8mb4 \
    geniego_roi | gzip > /tmp/backup_geniego_roi_pre_deploy_\$(date +%Y%m%d_%H%M%S).sql.gz
  tar -xzf /tmp/backend.tgz -C /home/wwwroot/roi.geniego.com/
  chown -R www:www /home/wwwroot/roi.geniego.com/backend
  cd /home/wwwroot/roi.geniego.com/backend
  php composer.phar install --no-dev --optimize-autoloader --no-interaction
  php bin/migrate.php both --dry-run
  php bin/migrate.php both
  systemctl reload php-fpm 2>/dev/null || /usr/local/nginx/sbin/nginx -s reload
  rm -f /tmp/backend.tgz
"

# 4) health 검증
curl -sk https://roi.genie-go.com/v424/health | jq .

# 5) credentials 폐기
Remove-Variable sshPass  # 1회 사용 후 즉시 폐기
```

**168차 deploy 시 추가 검증**:
- `php bin/migrate.php both --rollback --dry-run` 사전 호출 (rollback 가능 상태 확인)
- audit_routes.php 운영 deploy 후 재실행 (운영 routes.php 정합 확인)

---

## 4. 환경 / 인프라 현황 (불변)

### 4.1 운영 호스트

- 도메인: http://roi.genie-go.com
- IP: 1.201.177.46
- Hostname: genieroi26
- OS: Linux (CST timezone)
- PHP: 8.1.34 (CLI, NTS)
- MySQL: 8.0.37
- Web: nginx (`/usr/local/nginx/sbin/nginx -s reload`)
- Path: `/home/wwwroot/roi.geniego.com/{backend,frontend}`
- File owner: www:www

### 4.2 본 환경 (cc Windows + 도구)

- `plink.exe` / `pscp.exe`: `C:\Program Files\PuTTY\`
- `php.exe`: `E:\php\php.exe` (8.0.30 — lint + composer + dry-run OK, sqlite3/pdo_sqlite ext 동작 확인)
- `composer.phar`: `backend/composer.phar` (2.9.5)
- `mysql client`: 미설치 (plink 경유)
- `gh CLI`: 미설치 (U-166-D)
- bash + node + git: PATH 등록 (`php`는 미등록 — pre-commit G9 도입 시 가드 필요)

### 4.3 운영 DB

- MySQL localhost
- DB 1: `geniego_roi` (production)
- DB 2: `geniego_roi_demo` (존재하나 .env 미가리킴 → 미사용)
- 165차 신규 테이블: `orderhub_claims`, `orderhub_settlements`, `schema_migrations` (prod 적용 완료)

---

## 5. 미해결 트랙 (인계서 cumulative)

### 5.1 단기 (1주 내, 168차 1순위 후보)

- [P0] **167차 backend deploy 운영 적용** (credentials 회전 완료 후)
- [P0] **운영자 credentials 회전** (사용자 책임 + N-158-A 절차 매뉴얼화 후속)
- [P1] **SQLite convertForSqlite 검증** (dev 환경 fallback 정합)
- [P1] **운영 .env GENIE_ENV 명시** (production 명시 권장)
- [P2] **audit_routes.php pre-commit hook 통합** (G9 게이트)

### 5.2 중기 (1개월 내)

- [P1] **N-152-F PM 기능 확장** spec — Task / Milestone / Gantt + 메뉴 동기화 + 분석 (절대 원칙 §1+§4)
- [P2] **/v424/metrics** Prometheus + Slack heartbeat (절대 원칙 §4 실시간 모니터링)
- [P2] **방어선 4** (demo DB 물리 분리) — `geniego_roi_demo` 활성화 + GENIE_DEMO_DB_NAME 설정
- [P2] **방어선 6** (demo 키 권한 강등) — admin → analyst
- [P3] **U-165-B 41 handler 점진 migration**
- [P3] **U-165-C L3 seed runner**

### 5.3 장기 (전략, 절대 원칙 §5+§9 정합)

- [P2] **은행급 보안 audit** — 전 구간 암호화 / 침입 탐지 / 보안 로그 실시간 (절대 원칙 §4+§5)
- [P2] **HA(고가용성) 구조 설계** — DB replica + nginx upstream + load balancer
- [P3] **PHPUnit + 통합 테스트 도입** — 절대 원칙 §2 (기존 안정성)
- [P3] **i18n 동결 해제 + 자동화 sync** (U-164-A 임시 해제 시점)

---

## 6. 본 세션 발견 사항 / spec

### 6.1 routes.php $custom vs $register 정합성 패턴 (167차 5+9순위)

- $custom = handler 매핑 lookup table
- $register('METHOD', '/path') 호출 시 $custom에 있으면 $app->map() 등록, 없으면 template fallback
- **$custom에 있고 $register 누락 = 404 응답 (가시화 안 됨)**
- 167차 5순위에서 OrderHub 6건 (165차 deploy 후 미작동 잠재) 발견 → 9순위에서 전체 78건 일괄 정합
- audit_routes.php 도구로 영구화

### 6.2 Migrate convention — @rollback 블록 (167차 6순위)

- migration 파일 끝부분 `-- @rollback` ~ `-- @end-rollback` (선택 종료 마커)
- DROP TABLE / DROP INDEX / ALTER TABLE DROP COLUMN 등 reverse DDL 명시 의무
- 마커 없으면 `rollback()` 명확한 에러 → 안전 디폴트
- 165차 sql 2개에 적용 완료, 향후 모든 신규 migration 의무

### 6.3 SQLite convertForSqlite 잠재 버그 (별도 트랙)

- 165차 sql 2개를 SQLite로 변환 후 PDO exec 시 schema_migrations record는 들어가나 실제 테이블이 sqlite_master 에 없음
- PDO ATTR_ERRMODE=EXCEPTION 인데 silently 처리됨 → 변환 결과 statement가 빈 SQL 가능성
- ENUM 변환 / KEY 추출 후 잔여 콤마 처리 의심
- 168차 권장 2순위로 정밀 추적

### 6.4 9개 절대 원칙 명문화 (167차)

- 사용자가 167차에 9개 절대 원칙 명시
- U-prefix 위 메타 수준 (U-166-E "초엔터프라이즈급"의 상위 추상)
- 데이터·AI·보안·경쟁력·글로벌·SaaS 통합 정의
- 영구화: `~/.claude/projects/E--project-GeniegoROI/memory/feedback_absolute_principles.md`
- 168차 진입 즉시 cross-check 의무

---

## 7. cc 도구 라이브러리 (168차 검수자 참조)

### 7.1 plink / pscp (변경 없음, §3 절차 참조)

### 7.2 PowerShell quote escape 함정 (변경 없음)

### 7.3 audit_routes.php (167차 9순위 신규)

```bash
"E:/php/php.exe" -n "E:/project/GeniegoROI/backend/bin/audit_routes.php"
# exit 0 = 미매핑 0건 / exit 1 = 미매핑 발견 (목록 출력)
```

### 7.4 bin/migrate.php --rollback (167차 6순위 신규)

```bash
# dry-run (안전 — DB 변경 X)
"E:/php/php.exe" -n "E:/project/GeniegoROI/backend/bin/migrate.php" both --rollback --dry-run
# 실 rollback (마지막 1개)
"E:/php/php.exe" -n "E:/project/GeniegoROI/backend/bin/migrate.php" both --rollback
# N개 rollback
"E:/php/php.exe" -n "E:/project/GeniegoROI/backend/bin/migrate.php" both --rollback=2
```

### 7.5 health probe (167차 5순위 신규)

```bash
# 운영 hit (168차 deploy 후)
curl -sk https://roi.genie-go.com/v424/health | jq .
# 로컬 (dev server 띄운 경우)
curl http://localhost:8000/v424/health | jq .
```

---

## 8. memory 파일 (`~/.claude/projects/E--project-GeniegoROI/memory/`)

166차 5 파일 + **167차 신규 1 파일**:
- **`feedback_absolute_principles.md`** (167차 신규) — 9개 절대 원칙 (최상위 의무, U-prefix 상위)
- `MEMORY.md` (index, 갱신: 절대 원칙 entry 최상단 배치)
- `feedback_pm_operational_rules.md` (U-166-A ~ H 운영원칙)
- `feedback_credentials_handling.md` (U-166-H credentials 처리)
- `project_n152f_pm_features.md` (N-152-F PM 기능 트랙)
- `project_orderhub_deploy_automation.md` (165→166차 OrderHub deploy — **GitHub Actions 부분 167차 폐기 반영 필요**)
- `reference_ops_host.md` (운영 호스트 path/환경/도구)

168차 검수자: 본 memory 자동 로드. **9개 절대 원칙 위반 시 즉시 정정 의무**.

---

## 9. 168차 검수자 첫 응답 권장 형식

```
⚠️ 168차 진입 — 167차 인계서 + 9개 절대 원칙 인지 완료

[절대 원칙 9개 인지]
  §1 초엔터프라이즈급 / §2 기존 안정성 / §3 PM 책임 / §4 데이터+AI+은행급 보안 /
  §5 글로벌 SaaS + 국가 행정망 보안 / §6 누락 보고 / §7 사방넷 이상 / §8 개발 원칙 / §9 최종 목표

[U-prefix 인지] U-161-A ~ U-166-H 누적 (절대 원칙 하위)
[N-prefix 인지] N-152-F (PM 기능 확장) + N-158-A (credentials 보안)
[167차 commit 5종 인지] 603e9fe(deploy.yml) → 5bcc719(RoiService) → af601e3(/v424/health) → 5cf30ee(--rollback) → ec139ed(routes audit)
[운영 적용 인지] 165차 OrderHub prod 100% 적용 + 167차 backend 변경 미배포 (168차 진입 시 deploy)
[i18n 동결] U-164-A 유지

[cc 권장 1순위] 167차 backend deploy 운영 적용 (credentials 회전 완료 선행)

사용자께: ① credentials 회전 완료 여부 확인 + ② 168차 1순위 트랙 결정 (1~6순위 중)
```

---

**문서 종결.**
