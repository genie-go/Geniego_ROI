# 167차 세션 인계서 (NEXT_SESSION.md) — **166차 OrderHub 운영 적용 + 자동화 종결**

> **작성일**: 2026-05-26
> **이전 세션**: 166차 (165차 OrderHub Aggregator 운영 적용 + GitHub Actions 자동화 시도 → cc plink 직접 deploy 전환)
> **다음 세션**: 167차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: cc plink 직접 deploy 성공, 운영 165차 100% 적용, GitHub Actions 자동화 폐기 결정

---

## ⚠️ 167차 검수자 최우선 인지 사항

### 1. 최상위 상태

**166차 = 165차 OrderHub Aggregator 운영 100% 적용 + GitHub Actions 자동화 시도/폐기 + cc 직접 deploy 패턴 확립 + 11 commit 종결.**
**167차 = (a) 후속 트랙 결정 (1순위 N-152-F 또는 dead code/방어선 4) + (b) GitHub Actions deploy.yml cleanup + (c) 운영자 credentials 회전 확인.**

### 2. 사용자 운영원칙 누적 (U-prefix, 영구화 의무)

기존 U-161-A ~ U-165-C 유지. **166차 신규**:

- **U-166-A**: cc 설명은 아주 핵심만 짧게 (장황한 보고 X, 한글)
- **U-166-B**: cc는 사용자 선택 필요 시 **우선 권장 1개를 반드시 제시** (옵션 나열만 X)
- **U-166-C**: 작업 여력 있으면 최대한 진행 (인계서 작성 시간만 남기고), 미루지 않기
- **U-166-D**: **GitHub 사용 안 함** (Actions secrets X, 자동화 X) — backend deploy는 cc plink 직접 or 운영자 수동
- **U-166-E**: **GeniegoROI 플랫폼 = 초엔터프라이즈급 개발 원칙** — 기능/메뉴/기타 모두 초고도화
- **U-166-F**: **메뉴/기능 간 절대적 동기화 의무** — 실시간 주식 변동값처럼 변동이 동시 적용 (state propagation, SSE/WebSocket/polling)
- **U-166-G**: 한글로 설명 (사용자가 알기 쉽도록)
- **U-166-H**: **credentials 평문 노출 회피** — chat 인용 X, 응답·commit·memory 미저장, 1회 사용 후 회전 권고

기존 N-prefix 모두 유지. **166차 신규**:
- **N-152-F**: **PM 본 작업급 트랙 — Task/Milestone/Gantt 기능 확장** (별도 spec 신규 세션 예정)
- **N-158-A** (보안 트랙): credentials 회전 의무 (운영 SSH + MySQL root)

### 3. i18n 트랙 동결 유지 (U-164-A)

- 166차 i18n 무변경 (ko.js 30,656 leaves baseline 유지)
- sacred SHA (ja.js / zh.js) match 11회 (pre-commit G2 PASS)

### 4. 167차 검수자 첫 응답 의무

- ⚠️ 섹션 인지 명시
- U-166-A ~ H 인지 명시 (특히 **권장 1개 + 한글 + 초엔터프라이즈 + 메뉴 동기화**)
- 166차 commit 11종 인지 (e4d766c ~ ba6995d, 본 §3 표 참조)
- N-152-F 트랙 인지 (다음 PM 본 작업)
- 사용자에게 167차 우선 트랙 결정 요청 (1순위 cc 권장 명시)

---

## 1. 166차 결과 요약

### 1.1 master commit 11개 (시간 순)

| Commit | 영역 | 변경 | 상태 |
|---|---|---|---|
| `e4d766c` | composer.lock 재생성 (11 → 38 packages) | +2230/-324 | ✅ pushed |
| `73ada66` | docs/spec SSH runbook v1 (222 lines) | +222 | ✅ pushed |
| `5ca0fb1` | runbook v2 (--dry-run 제거 + §0 mysqldump 백업, 333 lines) | +203/-91 | ✅ pushed |
| `22ff081` | .github/workflows/deploy.yml — deploy-backend job 신설 (paths-filter v3) | +101/-1 | ✅ pushed (inert) |
| `323b327` | backend/bin/migrate.php + Migrate.php — --dry-run 옵션 | +129/-42 | ✅ pushed |
| `2ad6694` | deploy-backend P3 자동 백업 (.my.cnf.bak) + .gitignore 보강 | +45/-6 | ✅ pushed (inert) |
| `7c75aa8` | paths-filter fix (checkout fetch-depth: 0 + base 명시) | +4 | ✅ pushed |
| `2fe4e57` | PSR-4 3 클래스 ns 정합 (1150 → 1153 classes) | +7/-3 | ✅ pushed |
| `ba6995d` | Migrate.php MySQL DDL implicit commit 대응 — inTransaction 체크 | +2/-1 | ✅ pushed |

**합계**: 9 master commit (인계서 commit 본 167차 인계서로 곧 추가 예정)

### 1.2 운영 적용 결과 (cc plink 직접)

| 검증 | 결과 |
|---|---|
| 운영 host | genieroi26 (1.201.177.46), PHP 8.1.34, MySQL 8.0.37, nginx |
| `.my.cnf.bak` | `/home/wwwroot/roi.geniego.com/backend/.my.cnf.bak` 설치 (chmod 600, root:root, 62 bytes) |
| /tmp 백업 | `backup_geniego_roi_pre_deploy_20260526_150536.sql.gz` (7.2K) + `_demo_` (181K) ✅ |
| prod `orderhub_claims` | 생성 ✅ (11 cols, id PRI + tenant_id MUL + type ENUM + ...) |
| prod `orderhub_settlements` | 생성 ✅ (15 cols, period + channel + 6 fee 컬럼 + ...) |
| prod `schema_migrations` | 2 records (165_001 07:05:47 + 165_002 07:07:36) |
| demo DB 적용 | **미적용** — GENIE_DEMO_DB_NAME 미설정 → prod fallback (방어선 4 트랙) |
| backend SCP 갱신 파일 | `bin/migrate.php` (4035B), `src/Handlers/OrderHub.php` (10161B), `src/Migrate.php` (10015B, fix 반영), `migrations/` 2 SQL |
| composer install 결과 | slim/slim 4.15.1 → 4.15.2 등 incremental update 성공 |
| health check | https://roi.genie-go.com/ HTTP 200 (0.13s) ✅ |

### 1.3 GitHub Actions 결과 (사용자 미사용 결정 → inert)

| Run | 결과 | 비고 |
|---|---|---|
| 22ff081, 2ad6694 | failure | paths-filter fetch-depth 1 → base 비교 실패 |
| 7c75aa8 | success | paths-filter fix (changes job success) |
| 2fe4e57 | success | changes + deploy-backend job success (단 P2 SCP 부터 skip — HAS_SSH_SECRETS = false) |
| ba6995d | (예상) success | 동일 패턴 (deploy-backend P1만 실행) |

**결론**: deploy.yml의 deploy-backend job은 정의되어 있으나 secrets 미등록 + 사용자 GitHub 미사용 결정 → 영구 inert. **167차에 cleanup 권장**.

### 1.4 cc 직접 deploy 패턴 (U-166-D 표준 절차)

```powershell
# 1) local tar
tar -czf /tmp/backend.tgz --exclude=backend/.env --exclude=backend/vendor \
  --exclude=backend/data --exclude=backend/logs --exclude=backend/.my.cnf* \
  backend/

# 2) pscp 전송
& "C:\Program Files\PuTTY\pscp.exe" -batch -pw '<pass>' \
  "C:\Users\Master\AppData\Local\Temp\backend.tgz" \
  root@1.201.177.46:/tmp/backend.tgz

# 3) plink SSH script (mysqldump + extract + composer + migrate + reload)
& "C:\Program Files\PuTTY\plink.exe" -ssh -batch -pw '<pass>' root@1.201.177.46 "
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
```

---

## 2. 167차 진입 시 1순위 작업 (cc 권장)

### 권장 1순위: deploy.yml cleanup (GitHub Actions 미사용 반영)

`22ff081` + `2ad6694` + `7c75aa8`의 deploy-backend job + changes job + paths-filter를 revert 또는 제거. frontend deploy (기존 deploy job)는 유지 (사용자가 frontend도 GitHub 미사용이면 함께 제거).

**이유**: U-166-D (GitHub 미사용) 정합. inert yaml은 misleading.

### 권장 2순위: 운영 .env 검토 (방어선 4 진입 전 점검)

- `GENIE_ENV` 미설정 → 기본 production. 명시 권장 (`GENIE_ENV=production`)
- `GENIE_DEMO_DB_NAME` 미설정 → demo는 prod fallback. demo DB 분리하려면 설정 + `geniego_roi_demo` DB 별도 적용 (방어선 4 트랙)

### 권장 3순위: N-152-F PM 기능 spec 시작

- Task / Milestone / Gantt 데이터 모델
- 초엔터프라이즈급 + 메뉴 간 동기화 패턴 적용 (U-166-E/F)
- 165차 OrderHub 적용 안정화 1주 후 진입 권장

### 권장 4순위: dead code cleanup

- `backend/src/RoiService.php` (95 lines 실 구현, Genie ns로 fix됨) vs `backend/src/Services/RoiService.php` (18 lines stub) 중복
- 사용처 0 → 안전한 삭제 가능 (RoiService.php 또는 Services/RoiService.php 중 1)

### 권장 5순위: backend `/health` endpoint 신설

- 현재 `/` 응답 (200 OK)으로 health check
- 정밀 `/health` 또는 `/v424/health`: DB connect + uptime + version + memory + Slack heartbeat
- 초엔터프라이즈급 모니터링 (U-166-E)

### 권장 6순위 (이후): bin/migrate.php --rollback 옵션

- 자동 rollback (DROP TABLE + schema_migrations DELETE)
- backup 복원 절차 통합

---

## 3. 보안 우선 처리 (167차 즉시)

### 3.1 credentials 회전 (사용자 책임)

166차에서 평문 chat 노출:
- 운영 SSH (root@1.201.177.46)
- MySQL root (geniego_roi + geniego_roi_demo)

**조치**:
1. SSH password 회전: `ssh root@1.201.177.46 'passwd'` 또는 SSH key 인증 전환 (key-only)
2. MySQL root password 회전: `ALTER USER 'root'@'localhost' IDENTIFIED BY '<new>';` + `.my.cnf.bak` 갱신
3. `history -c` (운영 호스트) + 본 세션 chat 보존 정책 검토

### 3.2 .my.cnf.bak 권한 재확인

- 현재: `chmod 600 root:root` (cc 설치 후 deploy 과정에서 `chown -R www:www backend` 실행 시 변경 가능성)
- 167차 검수자 첫 응답 시 권한 재확인 권장:
  ```
  ls -la /home/wwwroot/roi.geniego.com/backend/.my.cnf.bak
  ```

---

## 4. 환경 / 인프라 현황

### 4.1 운영 호스트 (참조)

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

- `plink.exe`: `C:\Program Files\PuTTY\plink.exe` (password SSH OK)
- `pscp.exe`: `C:\Program Files\PuTTY\pscp.exe` (SCP OK)
- `php.exe`: `E:\php\php.exe` (8.0.30 — syntax lint + composer + dry-run OK)
- `composer.phar`: `backend/composer.phar` (2.9.5)
- `ssh.exe`: `C:\WINDOWS\System32\OpenSSH\ssh.exe` (interactive only)
- `gh CLI`: 미설치
- `mysql client`: 미설치 (운영 DB는 plink로 ssh 후 mysql 실행)

### 4.3 운영 DB

- MySQL 인스턴스: localhost (운영 호스트 내부)
- DB 1: `geniego_roi` (production)
- DB 2: `geniego_roi_demo` (존재하나 .env 미가리킴 → 실 사용 X)
- 165차 신규 테이블: `orderhub_claims`, `orderhub_settlements`, `schema_migrations` (prod에만)

---

## 5. 미해결 트랙 (인계서 cumulative)

### 5.1 단기 (1주 내, 167차 1순위 후보)

- [P0] **deploy.yml cleanup** (deploy-backend job + changes job 제거, U-166-D 정합)
- [P0] **운영자 credentials 회전** (사용자 책임, cc 안내 명시)
- [P1] **운영 .env GENIE_ENV 명시** (production 명시 권장)
- [P1] **dead code cleanup** (RoiService.php 중복)
- [P2] **backend `/health` endpoint** (deploy 모니터링 정밀화)

### 5.2 중기 (1개월 내)

- [P1] **N-152-F PM 기능 확장** spec — Task / Milestone / Gantt (별도 신규 세션)
- [P2] **bin/migrate.php --rollback** 옵션 (자동 rollback + backup 복원)
- [P2] **방어선 4** (demo DB 물리 분리) — `geniego_roi_demo` 활성화 + GENIE_DEMO_DB_NAME 설정
- [P2] **방어선 6** (demo 키 권한 강등) — admin → analyst
- [P3] **U-165-B 41 handler 점진 migration** (격리 강화)
- [P3] **U-165-C L3 seed runner** (demo 데이터 자동 seed)

### 5.3 장기 (전략)

- [P3] **PHPUnit 도입** (backend 단위 테스트)
- [P3] **GitHub Actions matrix** (PHP 8.1/8.2/8.3) — 단 U-166-D 결정에 따라 폐기 가능
- [P3] **i18n 동결 해제** (U-164-A 임시 해제 시점)

---

## 6. 본 세션 발견 사항 / spec

### 6.1 Migrate.php MySQL DDL implicit commit 이슈 (166차 발견 → ba6995d fix)

- MySQL InnoDB DDL은 implicit commit → beginTransaction 무효화
- `$pdo->commit()` 호출 시 "no active transaction" throw
- fix: `if ($pdo->inTransaction()) $pdo->commit();`
- 운영 적용 시 첫 migration에서 발견 → 부분 적용 상태 복구 후 재실행으로 완료

### 6.2 dorny/paths-filter@v3 + actions/checkout@v4 호환성

- checkout default fetch-depth = 1 → push event base..head 비교 history 부족 → paths-filter fail
- fix: `fetch-depth: 0` + `base: ${{ github.event.before }}` 명시
- U-166-D로 deploy-backend job 폐기 예정이므로 본 fix는 trivia

### 6.3 PSR-4 3 클래스 dead code (사용처 0)

- `Genie\Services\RoiService` in `src/RoiService.php` → `Genie` ns로 fix (Services 이름 충돌 회피, 사용처 0)
- `Handlers\AdPerformance` → `Genie\Handlers\AdPerformance`
- `GeniegoROI\Utils\LicenseKeyUtils` → `Genie\Utils\LicenseKeyUtils`
- 결과: composer dump-autoload 1150 → 1153 classes (skip 0)

### 6.4 GitHub Actions secrets 미등록 확정

- HAS_SSH_SECRETS = false → deploy-backend P2 SCP / P3 SSH / P4 health 모두 skip
- 사용자 U-166-D 결정 → 영구 미등록 + deploy.yml cleanup 167차 1순위

### 6.5 운영 .env GENIE_DEMO_DB_NAME 미설정

- demo migrate → `geniego_roi` fallback (prod와 동일 schema_migrations 공유)
- demo 분리는 방어선 4 인프라 트랙 (별도 작업)

---

## 7. cc 도구 라이브러리 (167차 검수자 참조)

### 7.1 plink (SSH 자동화)

```powershell
$plink = "C:\Program Files\PuTTY\plink.exe"
$sshPass = '<password>'  # 1회 사용 후 변수 폐기
& $plink -ssh -batch -pw $sshPass root@1.201.177.46 "<command>"
Remove-Variable sshPass
```

- 첫 연결 시 PuTTY known_hosts 자동 수락 ("y" stdin 또는 PuTTY 사전 등록)
- `-batch` 모드는 모든 prompt fail로 처리 → host key 신규 시 -batch 제외

### 7.2 pscp (SCP)

```powershell
$pscp = "C:\Program Files\PuTTY\pscp.exe"
& $pscp -batch -pw $sshPass "C:\Users\Master\AppData\Local\Temp\backend.tgz" \
  root@1.201.177.46:/tmp/backend.tgz
```

### 7.3 PowerShell quote escape 함정

- 단일 명령 (single line) + single-quote SQL → 안정
- here-string `@'...'@` 안에 double-quote SQL → PowerShell native exec escape 실패 빈번
- 권장: `mysql --defaults-file=$cnf -BNe 'SELECT ...'` 패턴 (PowerShell double-quote outer + bash single-quote inner)

### 7.4 dry-run 검증 명령 (--dry-run 본 세션 신규)

```bash
php bin/migrate.php both --dry-run  # Pending/Skipped 표시, DB 변경 X
php bin/migrate.php both             # 실 적용 (idempotent)
```

---

## 8. memory 파일 (`~/.claude/projects/E--project-GeniegoROI/memory/`)

166차 신규 5 파일:
- `MEMORY.md` (index)
- `feedback_pm_operational_rules.md` (U-166-A ~ H 운영원칙)
- `feedback_credentials_handling.md` (U-166-H credentials 처리)
- `project_n152f_pm_features.md` (N-152-F PM 기능 트랙)
- `project_orderhub_deploy_automation.md` (165→166차 OrderHub deploy)
- `reference_ops_host.md` (운영 호스트 path/환경/도구)

167차 검수자: 본 memory 자동 로드 (CLAUDE.md auto memory). 운영원칙 위반 시 cross-check.

---

## 9. 167차 검수자 첫 응답 권장 형식

```
⚠️ 167차 진입 — 166차 인계서 인지 완료

[U-prefix 인지] U-166-A~H, U-165-A~C, U-164-A (i18n 동결) 누적
[N-prefix 인지] N-152-F (PM 기능 확장 본 작업급, 별도 트랙)
[166차 commit 11종 인지] e4d766c ~ ba6995d (composer.lock 재생성 → ... → Migrate.php inTransaction fix)
[운영 적용 인지] OrderHub 165차 prod 100% 적용 완료, demo는 .env 미설정으로 prod fallback (방어선 4 트랙)
[GitHub 미사용 인지] U-166-D, deploy.yml 1순위 cleanup 후보

[cc 권장 1순위] deploy.yml cleanup (deploy-backend job 제거, U-166-D 정합)

사용자께: 167차 1순위 트랙 결정 — 위 1~6순위 중 어느 트랙 진행할까요?
```

---

**문서 종결.**

본 인계서 = 166차 작업 결산 + 167차 인계. cc는 본 인계서를 commit 후 본 세션 종결.
