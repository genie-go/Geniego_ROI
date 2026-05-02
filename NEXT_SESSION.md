# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-02
> Last Commit: 443f208 (origin/master 동기화 완료)

---

## 새 Claude에게 보낼 메시지

GeniegoROI 프로젝트 작업을 이어서 진행합니다. 아래는 컨텍스트입니다.

### 프로젝트 정보
- GitHub: https://github.com/genie-go/Geniego_ROI (**Private repo**)
- 로컬 경로: D:\project\GeniegoROI
- 브랜치: master
- 환경: Windows + PowerShell + VS Code (Antigravity) + Cline 에이전트
- Cline 모델: claude-sonnet-4-5-20250929

### 프로젝트 성격
ROI 분석 통합 대시보드 (CRM, KPI, 시스템, P&L 4개 도메인)
- Python 백엔드 + React/Vite 프론트엔드 + PostgreSQL
- 다국어 15개 언어 지원
- 운영 서버: 1.201.177.46 (https://roi.genie-go.com)
- 배포 경로: /home/wwwroot/roi.geniego.com/frontend/dist

### 협업 방식
- Cline 토큰 절약을 위해 Claude 웹과 협업 중
- PowerShell로 가능한 작업은 PowerShell로 (무료)
- 실제 코드 변경만 Cline에 위임
- 한 줄씩 명령어 실행 (한꺼번에 붙여넣기 금지)
- 매 단계 검증

### 5월 2일 완료된 작업 (총 10차)

1차 (지난 세션)
- .clineignore 셋업 (commit b32ba89)
- 8개 fix 스크립트 archive (commit 3d2dfa3)
  - fix.js, fix3.js, fix4.js, fix5.js, fixComma.js
  - fix_admin_form.js, fix_admin_form2.js, fix_auth.js

2차 (이번 세션)
- 15개 patch_*.js archive (commit f71eb3a)

3차 (이번 세션)
- 7개 patch_*.cjs archive (commit c89a27c)

4차 (이번 세션)
- 17개 inject_*.cjs archive (commit 9366c04)

5차 (이번 세션)
- 42개 fix_*.cjs archive (commit f6aca11)

6차 (이번 세션)
- 33개 기타 일회성 스크립트 archive (commit 946d50a)
  - apply 9개, smart 5개, tmp 5개, see 3개, test 4개, 단발성 7개

7차 (이번 세션)
- 47개 misc 일회성 스크립트 archive (commit 8ea9bbb)
  - underscore 16개, activate 3개, add 3개, analyze/audit 등 5개, check 10개, clean 등 10개

8차 (이번 세션)
- 14개 misc 일회성 스크립트 archive (commit 4eec099)
  - rebuild 2개, refactor 2개, restore 2개, scan 2개, 단발성 6개
- deploy_* 12개는 운영 critical로 판단되어 8차에서 의도적 제외 (옵션 A)
- NEXT_SESSION.md 업데이트 commit (605e209)

9차 (이번 세션)
- 9개 deploy_* 변형 스크립트 archive (commit ca00661)
  - .cjs 7개: deploy_all, deploy_demo_direct, deploy_demo_v2, deploy_kakao,
    deploy_nginx_root, deploy_prod, deploy_scp
  - .js 2개: deploy_ssh2.js, deploy_win.js
- **보존 확정 3개** (docs에서 운영 호출 발견):
  - `deploy_demo.cjs` — JOURNEY_BUILDER_KPI_FIX.md:283 (`node deploy_demo.cjs`),
    BUG-013_DEPLOY_ENCODING_FIX.md:152
  - `deploy_node.cjs` — BUG-013_DEPLOY_ENCODING_FIX.md:151
  - `deploy_ssh2.cjs` — WORK_PROCESS.md:456 (`./deploy_ssh2.cjs --env production --approve`)
- 5단 검증 모두 통과 (package.json 0, require 0, import 0, 인프라 8개 0, docs 5개 0)
- rename 100% 인식 (9 files changed, 0 insertions, 0 deletions)
- NEXT_SESSION.md 업데이트 commit (5361d9e)

10차 (이번 세션) ⭐ NEW
- **운영 critical 스크립트 3개 보존 확정** (Track B 그룹 1):
  - `deploy.ps1` (313 bytes) — Windows 빌드+배포 orchestrator
    chain: inject_journey_ko.cjs → npm build → package_deploy.py → deploy_paramiko.py
  - `deploy.sh` (652 bytes) — Linux rsync 배포 스크립트
    REMOTE: root@1.201.177.46:/home/wwwroot/roi.geniego.com/frontend/dist
  - `deploy_gitbash.sh` (1694 bytes) — Git Bash 환경 배포 (sshpass fallback 포함)
    내용 확인 시 SSH key auth + sshpass 이중 인증 구조 확인
- **deploy_*.txt 로그 3개 git untrack + .gitignore 추가** (commit 443f208):
  - deploy_final.txt, deploy_out.txt, deploy_output.txt (각 6418 bytes)
  - 3개 모두 운영 배포 stdout 로그 (Connecting to 1.201.177.46... PUT 빌드 산출물 ...)
  - hash 모두 다름 → 3번 다른 시점 배포 결과
  - .gitignore에 `deploy_*.txt` 패턴 추가
  - git rm --cached로 추적 해제, 로컬 파일은 보존
- **deploy*.zip 2개 보존 결정** (이미 .gitignore 됨):
  - deploy.zip (3.2MB, 4/4 빌드 산출물 백업)
  - deploy_clean.zip (2.3MB, 3/31 빌드 산출물 백업)
  - .gitignore:16/17에 명시적 등록 확인
- **🚨 보안 이슈 발견 (긴급도 ❌, Private repo)**:
  - `deploy_gitbash.sh`에 평문 SSH 비밀번호 하드코딩
  - 노출 commit: `ac6b8be` (2026-05-01 15:19:44, BUG-013 docs 추가 시 같이 commit됨)
  - 해당 commit에서 deploy_gitbash.sh와 BUG-013 docs 동시 추가
  - **Private repo이므로 즉시 사고 대응은 불필요**
  - 단, 장기적으로 환경변수화 필수 (퇴사자/로컬 분실 위험)
  - 운영 비밀번호는 사용자가 의도적으로 알려주신 배포용 비밀번호임 (실사용 중)

### 누적 통계
- archive된 파일 수: **192개** (8 + 15 + 7 + 17 + 42 + 33 + 47 + 14 + 9, 10차는 archive 없음)
- archive 위치: tools/migrations/_archived/
- 10차 git untrack: 3개 (deploy_*.txt)
- 10차 보존 확정: 3개 (.ps1, .sh, _gitbash.sh)
- Cline 호출: 0회 (모든 작업 PowerShell로 처리)
- 5월 2일 단일 세션 처리량: **184개 archive + 3개 git untrack + 6개 보존 결정**

### 다음 작업 후보 (우선순위 순)

1. **🔵 비밀번호 환경변수화 — 권장 다음 작업**
   - `deploy_gitbash.sh`에서 `PASSWORD='vot@Wlroi6!'` 라인 제거
   - 환경변수 `${SSHPASS}` 또는 `.env` 파일에서 로드하도록 변경
   - `.env.example` 생성 (변수명만 명시, 실제 값 X)
   - `.gitignore`에 `.env` 패턴 확인/추가
   - README나 docs에 배포 절차 문서화 ("배포 전 .env 생성 필요")
   - 작업량 약 15-30분, Cline 호출 1회 정도 필요할 수 있음
   - **Private repo이므로 긴급도 낮음, 다음 세션에 안전하게 진행 가능**

2. **비스크립트 잡파일 정리 — 별도 트랙**
   - .txt 파일들: find_out.txt, keys_out.txt, ko_check.txt, korean_lines.txt,
     missing_keys.txt, sub_check.txt, tab_keys.txt, en_tabs.txt, en_test.txt,
     eng_lines.txt
   - .json 파일들: ko_orderHub.json, korean_map.json, kpi_keys.json,
     missing_attrData.json, orderHub_keys.json, orderHub_ko.json,
     dict_5pages.json, english_map.json
   - .py 파일들: fix_audit.py, fix_auth.py, restore_authpage.py
   - .sh 파일: ssh_test.sh
   - 7~9차에서는 .js/.cjs/.mjs만 처리, 나머지 형식은 별도 트랙

3. **i18n 누락 키 9개 추가 — 별도 신중 작업**
   - ko.js에 channelKpiPage 6곳, 9개 키 누락
   - 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals,
     tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
   - 별도 세션 권장 (구조 복잡)
   - Cline 호출 필요 (실제 코드 수정)

4. **초고도화/엔터프라이즈급 분석 — 별도 새 세션 필수**
   - 아키텍처, 인프라, 데이터, 관측성, 보안 등
   - 사전 정보 수집 후 분석 시작
   - 사전 답변 필요한 13개 질문 별도 항목 참조

### 알려진 이슈
- clean_src 폴더: nested git repo (별도 .git 보유), .gitmodules에 미등록
  - .clineignore로 차단 중이라 Cline 작업에 영향 없음
  - git status에서 modified로 항상 표시되지만 무시 가능
- scan_korean.cjs D 마크 이슈: 8차에서 archive 처리하며 자연 해소됨 (해결 완료)
- deploy_*.zip 빌드 산출물 2개: gitignore됨, 보존 결정 (10차에서 확정)

### 운영 critical 파일 보존 매트릭스 (9차+10차 통합)

#### deploy 관련 .cjs/.js (9차에서 확정)
| 파일 | 상태 | 사유 / 호출 위치 |
|------|------|-----------------|
| deploy_demo.cjs | **보존** | docs/JOURNEY_BUILDER_KPI_FIX.md:283 (운영 명령어), docs/BUG-013:152 |
| deploy_node.cjs | **보존** | docs/BUG-013_DEPLOY_ENCODING_FIX.md:151 |
| deploy_ssh2.cjs | **보존** | docs/WORK_PROCESS.md:456 (production --approve) |
| deploy_all.cjs | archived (9차) | 외부 참조 0건 |
| deploy_demo_direct.cjs | archived (9차) | 외부 참조 0건, deploy_demo.cjs 변형 |
| deploy_demo_v2.cjs | archived (9차) | 외부 참조 0건, deploy_demo.cjs 변형 |
| deploy_kakao.cjs | archived (9차) | 외부 참조 0건 |
| deploy_nginx_root.cjs | archived (9차) | 외부 참조 0건 |
| deploy_prod.cjs | archived (9차) | 외부 참조 0건 |
| deploy_scp.cjs | archived (9차) | 외부 참조 0건 |
| deploy_ssh2.js | archived (9차) | 외부 참조 0건, deploy_ssh2.cjs와 별개 파일 |
| deploy_win.js | archived (9차) | 외부 참조 0건 |

#### deploy 관련 .ps1/.sh (10차에서 확정)
| 파일 | 상태 | 사유 |
|------|------|------|
| deploy.ps1 | **보존** | Windows 빌드+배포 orchestrator (inject → build → package → paramiko) |
| deploy.sh | **보존** | Linux rsync 배포 스크립트 (root@1.201.177.46) |
| deploy_gitbash.sh | **보존** | Git Bash 환경 배포 (sshpass fallback, ⚠️ 평문 PW 환경변수화 필요) |

#### deploy 관련 잡파일 (10차에서 확정)
| 파일 | 상태 | 처리 |
|------|------|------|
| deploy_final.txt | git untrack | .gitignore에 deploy_*.txt 추가 (commit 443f208), 로컬 보존 |
| deploy_out.txt | git untrack | 동일 |
| deploy_output.txt | git untrack | 동일 |
| deploy.zip | 보존 | 이미 .gitignore:16 등록됨, 빌드 산출물 백업 (4/4) |
| deploy_clean.zip | 보존 | 이미 .gitignore:17 등록됨, 빌드 산출물 백업 (3/31) |

### 중요 분석 자료
- ko.js 인코딩: 정상 UTF-8
- jb 섹션: 95% 번역 완료, 9개 키 누락
- channelKpiPage가 ko.js에 6곳 있음 (구조 복잡)
- PowerShell Get-Content 출력 시 한글 깨짐 → VS Code 에디터로 직접 보면 정상

### 8차/9차/10차에서 검증된 인프라 파일 목록 (향후 검증 시 활용)
프로젝트 루트와 하위에 다음 인프라 파일들이 있음 (모두 보존 확정):
- `.github/workflows/deploy.yml` (GitHub Actions CI/CD)
- `frontend/Dockerfile`
- `infra/docker-compose.yml`
- `docker-compose.yml` (메인)
- `deploy.sh` (루트 배포 스크립트, 10차 보존 확정)
- `deploy_gitbash.sh` (Git Bash용 배포 스크립트, 10차 보존 확정, ⚠️ PW 환경변수화 필요)
- `deploy.ps1` (PowerShell 배포 스크립트, 10차 보존 확정)
- `ssh_test.sh`

### 작업 흐름 (검증된 8단계 패턴)

1단계: Get-ChildItem으로 파일 목록 조사
2단계: Select-String으로 package.json 참조 검증
3단계: Select-String으로 require/import 외부 참조 검증 (-List, Where-Object 활용)
4단계: git mv로 일괄 이동 (PowerShell ForEach-Object 활용)
5단계: git status --short로 renamed 검증 (R로 시작하는 라인 카운트)
6단계: git commit -m "chore: archive N <type> scripts to tools/migrations/_archived/"
7단계: git push origin master
8단계: 인수인계서 NEXT_SESSION.md 업데이트 및 commit/push

### 9차에서 확립된 5단 검증 패턴 (운영 critical 파일 검증용)

운영에 영향이 있을 가능성이 있는 파일은 일반 검증에 추가로 인프라/문서 검증이 필수:

```powershell
# 패턴을 변수에 저장 (라인 wrapping 회피)
$pattern = "deploy_(all|demo_direct|demo_v2|kakao|nginx_root|prod|scp|ssh2\.js|win)"

# 검증 1: package.json
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count

# 검증 2: require()
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./$pattern" -List | Measure-Object).Count

# 검증 3: ES module import
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./$pattern" -List | Measure-Object).Count

# 검증 4: 인프라 파일 (Test-Path로 안전 처리)
$infraFiles = @(".github/workflows/deploy.yml","frontend/Dockerfile","infra/docker-compose.yml","docker-compose.yml","deploy.sh","deploy_gitbash.sh","ssh_test.sh","deploy.ps1") | Where-Object { Test-Path $_ }
Select-String -Path $infraFiles -Pattern $pattern | Select-Object Filename, LineNumber, Line | Format-Table -AutoSize -Wrap

# 검증 5: docs 운영 가이드 (한 번에)
Get-ChildItem -Path "docs" -Filter "*.md" | Select-String -Pattern $pattern | Select-Object Filename, LineNumber, Line | Format-Table -AutoSize -Wrap
```

5개 항목 모두 0건/출력없음일 때만 archive 안전.
어느 하나라도 매칭이 발견되면 그 파일은 보존하거나 별도 분석 필요.

### 10차에서 확립된 추가 검증 패턴 (실행 가능 운영 스크립트 검증)

실행 가능한 .ps1/.sh/.bat 파일은 5단 검증 외에 **내용 직접 확인 필수**:

```powershell
# 1. 파일 메타정보 확인 (크기, 작성일이 동시에 같으면 의심)
Get-ChildItem [files] | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

# 2. 내용 직접 확인 (운영 IP/비밀번호/외부 명령 호출 여부)
Get-Content [filename]
# 확인 포인트:
# - 외부 호스트 IP, SSH 명령
# - 평문 비밀번호, API 키 (있으면 환경변수화 필요)
# - 다른 스크립트 호출 (chain되어 있으면 archive 시 운영 깨짐)
# - rsync, scp, sftp 등 배포 도구 사용
# - npm, python 등 빌드 도구 호출

# 3. 보안 정보 노출 확인
git log --all -p -S "<sensitive_string>" --source
# 비밀번호/API 키가 git history에 들어간 commit 추적
```

### 9차에서 확립된 부분 archive 패턴 (보존 + archive 혼합 시)

8차까지는 카테고리 통째로 archive였지만, 9차부터는 부분 archive가 등장.
이 경우 패턴 설계 시 주의사항:

```powershell
# Dry run으로 매칭 미리보기 (archive 전 필수)
$archivePattern = "^deploy_(all|demo_direct|demo_v2|kakao|nginx_root|prod|scp)\.cjs$|^deploy_(ssh2|win)\.js$"
Get-ChildItem -File | Where-Object { $_.Name -match $archivePattern } | Select-Object Name, Length | Format-Table -AutoSize

# 핵심: 보존 필수 파일과 이름이 겹치는 경우 anchor + 확장자로 정확히 분리
# 예: deploy_demo.cjs (보존) vs deploy_demo_direct.cjs (archive)
#     → "demo" 단독 매칭 X, "demo_direct" 명시적으로
# 예: deploy_ssh2.cjs (보존) vs deploy_ssh2.js (archive)  
#     → 확장자까지 패턴에 포함

# Dry run 결과가 정확히 의도한 파일 수와 일치할 때만 본 archive 실행
Get-ChildItem -File | Where-Object { $_.Name -match $archivePattern } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }
```

**부분 archive commit 메시지 작성 가이드 (9차에서 확립)**:
- 카테고리 통째로 처리할 때: "chore: archive N <type> scripts to ..."
- 부분 처리할 때: 보존된 파일과 사유를 commit 메시지에 명시
- 예: `chore: archive 9 deploy_* scripts to tools/migrations/_archived/ (9th batch, deploy variants only - kept deploy_demo.cjs, deploy_node.cjs, deploy_ssh2.cjs as docs reference them)`
- 이유: 미래의 Claude 세션이 git log를 봤을 때 "왜 다 안 옮기고 9개만?"이 즉시 이해됨

### 10차에서 확립된 git untrack 패턴 (gitignore 추가 + 추적 해제)

archive와 다른 처리 방식. 운영 로그/임시 파일 정리에 적합:

```powershell
# 1. .gitignore 기존 패턴 확인
Select-String -Path ".gitignore" -Pattern "^<prefix>" -SimpleMatch

# 2. .gitignore에 패턴 추가 (Add-Content)
Add-Content -Path ".gitignore" -Value "`n# <comment>`n<pattern>"

# 3. git에서 추적 해제 (로컬 파일은 유지)
git rm --cached <file1> <file2> <file3>

# 4. 변경사항 검증 (D/M 마크로 표시)
git status --short

# 5. commit
git add .gitignore
git commit -m "chore: untrack <type> files (<pattern>) - add to .gitignore"
git push origin master
```

### 6차에서 검증된 다중 카테고리 동시 처리 패턴

```powershell
# 여러 카테고리 통합 검증 (한 번에)
Select-String -Path "package.json" -Pattern "(apply_|smart_trans|tmp_|see_|test_)"
Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./(apply_|smart_trans|tmp_|see_)" -List

# 카테고리별 git mv (Where-Object regex)
Get-ChildItem -File | Where-Object { $_.Name -match '^apply_' } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }
```

### 7차/8차/9차에서 검증된 패턴 (변수 활용 + 라인 wrapping 회피)

```powershell
# 패턴이 길어질 때 변수에 저장해서 라인 wrapping 문제 회피
$pattern = "(_add_conn|_deploy|_extract|activate_stubs|...)"

# 깔끔한 카운트 출력
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count

# 결과 검증
$count = (git status --short | Select-String "^R" | Measure-Object).Count
Write-Host "Renamed: $count"

# git status 중 일부만 미리보기 (의도한 카테고리인지 검증)
git status --short | Select-String "^R" | Select-Object -First 10

# anchor를 활용한 정확한 카테고리 매칭 (8차/9차에서 확립)
# ^($pattern)\.(js|cjs|mjs)$ 처럼 시작과 확장자를 anchor로 잡아서 오매칭 방지
Get-ChildItem -File | Where-Object { $_.Name -match "^($batchPattern)\.(js|cjs|mjs)$" } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }
```

### PowerShell 사용 시 주의사항 (7차/8차/9차/10차에서 발견)

- 명령어가 너무 길면 줄바꿈되어 라인 wrapping 발생 → GUID나 OSC 시퀀스가 결과처럼 출력됨
  - 해결: 패턴을 변수에 저장 후 짧게 호출
- Write-Host와 Get-ChildItem 같은 명령어를 한 줄에 붙이지 말 것 (Enter로 분리)
- 결과 검증 시 `0`이 단독 출력되면 다음 프롬프트 `PS`의 `P`가 잘려 `0S D:\...`로 보일 수 있음 (정상)
- 두 줄 명령어 입력 시 첫 줄 Enter → 결과 확인 → 두 번째 줄 입력 (한꺼번에 입력 X)
- Test-Path로 파일 존재 여부 사전 확인 후 Select-String 실행 (9차에서 확립)
- 보존 필수 파일과 이름이 겹치는 경우 anchor + 확장자로 정확히 분리 (9차에서 확립)
- **운영 critical 의심 파일은 5단 검증에 추가로 내용 직접 확인 필수 (10차에서 확립)**
- **CRLF 경고는 Windows에서 .gitignore 수정 시 정상 동작, 무시 가능 (10차에서 확인)**

### .clineignore 핵심 차단 패턴
- frontend/src/i18n/locales/**/*.js (15개 언어 거대 파일)
- locales_backup/, clean_src/, backup/, $BACKUP_DIR/
- legacy_v338_pkg/
- fix_*, nuke_*, smart_trans_*, supreme_deploy.js
- dict_*.json
- node_modules/, dist/, build/
- .env, *.pem, *.key
- logs/, *.log

### 비용 추적
- 5월 2일 세션: 검증 1회만 사용 ($0.0585)
- 5차에서 PowerShell만으로 42개 처리 → Cline 호출 0회
- 6차에서 PowerShell만으로 33개 처리 → Cline 호출 0회
- 7차에서 PowerShell만으로 47개 처리 → Cline 호출 0회
- 8차에서 PowerShell만으로 14개 처리 → Cline 호출 0회
- 9차에서 PowerShell만으로 9개 처리 → Cline 호출 0회 (운영 critical 부분 archive)
- 10차에서 PowerShell만으로 3개 git untrack + 3개 보존 결정 → Cline 호출 0회
- 5월 2일 누적 184개 archive + 3개 untrack + 3개 보존 / Cline 호출 0회 / 비용 $0.0585 유지
- .clineignore 도입 효과: Cline 작업당 약 70% 절감

---

## 초고도화 분석 시 미리 준비할 답변

새 세션에서 초고도화 분석 시작 시, 아래 답변이 있으면 정확한 로드맵 가능.

비즈니스 컨텍스트:
1. 현재 사용자 규모: 동시 접속자 / DAU / MAU
2. 목표 규모: 1년 후 / 3년 후 예상치
3. 테넌트 구조: 단일 조직? 멀티테넌트 SaaS? B2B 몇 개?
4. 데이터 규모: 현재 DB 크기, 일 생성 데이터량
5. 예산 범위: 인프라 / 개발 인력 투자 가능 수준

기술 컨텍스트:
6. 현재 배포 환경: 로컬? 단일 서버? 클라우드?
7. 현재 성능 병목: 어디가 느린지
8. 기존 스택 만족도: Python/React/PostgreSQL 유지 의향?
9. CI/CD 상태: 자동? 수동?
10. 모니터링/로깅 현황

보안/규제:
11. 개인정보 처리: 국내? 다국가? GDPR 대상?
12. 결제/금융 데이터 처리 여부

우선순위:
13. 가장 시급한 개선 영역 (성능/안정성/확장성/보안/DX/모니터링/비용)

---

## 첫 요청 (다음 세션 시작 시 사용)

**🔵 권장: 비밀번호 환경변수화** (10차에서 발견된 보안 이슈 정리):
"지난 세션 완료 작업을 확인하고 다음 진행을 추천해주세요.
PowerShell로 git log -5 부터 확인 부탁합니다.
이번엔 deploy_gitbash.sh의 평문 비밀번호를 환경변수로 분리하는 작업을 진행하고 싶습니다.
10차에서 발견된 운영 critical 보안 이슈 정리 작업입니다.
Private repo이므로 긴급도는 낮지만 표준 관행에 맞춰 정리합니다."

비스크립트 잡파일 정리:
"GeniegoROI 루트의 .txt/.json/.py 잡파일 정리를 시작하고 싶습니다.
.js/.cjs/.mjs는 1~9차로 정리 완료, 이제 다른 형식 차례입니다."

i18n 누락 키 작업:
"GeniegoROI ko.js의 channelKpiPage 누락 키 9개 추가 작업을 시작하고 싶습니다.
구조가 복잡하니 신중하게 진행해주세요."

초고도화 분석 시작:
"GeniegoROI 초고도화 분석을 시작합니다. 사전 답변 13개 질문에 답변하면서 진행하겠습니다."