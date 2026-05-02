# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-02
> Last Commit: 4eec099 (origin/master 동기화 완료)

---

## 새 Claude에게 보낼 메시지

GeniegoROI 프로젝트 작업을 이어서 진행합니다. 아래는 컨텍스트입니다.

### 프로젝트 정보
- GitHub: https://github.com/genie-go/Geniego_ROI
- 로컬 경로: D:\project\GeniegoROI
- 브랜치: master
- 환경: Windows + PowerShell + VS Code (Antigravity) + Cline 에이전트
- Cline 모델: claude-sonnet-4-5-20250929

### 프로젝트 성격
ROI 분석 통합 대시보드 (CRM, KPI, 시스템, P&L 4개 도메인)
- Python 백엔드 + React/Vite 프론트엔드 + PostgreSQL
- 다국어 15개 언어 지원

### 협업 방식
- Cline 토큰 절약을 위해 Claude 웹과 협업 중
- PowerShell로 가능한 작업은 PowerShell로 (무료)
- 실제 코드 변경만 Cline에 위임
- 한 줄씩 명령어 실행 (한꺼번에 붙여넣기 금지)
- 매 단계 검증

### 5월 2일 완료된 작업 (총 8차)

1차 (지난 세션)
- .clineignore 셋업 (commit b32ba89)
- 8개 fix 스크립트 archive (commit 3d2dfa3)
  - fix.js, fix3.js, fix4.js, fix5.js, fixComma.js
  - fix_admin_form.js, fix_admin_form2.js, fix_auth.js

2차 (이번 세션)
- 15개 patch_*.js archive (commit f71eb3a)
  - patch_account.js, patch_acct.js, patch_email_i18n.js, patch_email_jsx.js
  - patch_extra_korean.js, patch_i18n.js, patch_i18n_kakao.js, patch_i18n_locales.js
  - patch_ja_email.js, patch_ja_properly.js, patch_kakao.js, patch_ko.js
  - patch_kpi_i18n.js, patch_kpi_setup.js, patch_sidebar_i18n.js

3차 (이번 세션)
- 7개 patch_*.cjs archive (commit c89a27c)
  - patch_demo_tenant.cjs, patch_i18n_marketing.cjs, patch_influencer_i18n.cjs
  - patch_sms_i18n.cjs, patch_sms_v2.cjs, patch_sms_v3.cjs, patch_sms_v4.cjs

4차 (이번 세션)
- 17개 inject_*.cjs archive (commit 9366c04)
  - 9:59:14 그룹 (13개): inject_comm_i18n, inject_contentcal_i18n, inject_csv_schedule_i18n,
    inject_excel_i18n, inject_oh_v2, inject_omni_comm_i18n, inject_omni_i18n,
    inject_omni_i18n_final, inject_orderhub_i18n, inject_reviews_i18n, inject_reviews_v2,
    inject_vat_i18n, inject_webpopup_i18n
  - 10:01:00 그룹 (4개): inject_demo_guard, inject_error_handling, inject_profile_keys, inject_sc_wa_keys
  - 주의: inject_reviews_v2.cjs는 inject_reviews_i18n.cjs를 require함 (둘 다 함께 archive해서 안전)

5차 (이번 세션)
- 42개 fix_*.cjs archive (commit f6aca11)
  - fix_all_emoji, fix_all_final, fix_all_locale, fix_all_orderhub, fix_all_reviews_langs
  - fix_and_build, fix_braces, fix_braces2, fix_braces_final
  - fix_commas, fix_commas2, fix_comprehensive
  - fix_dark_colors, fix_dark_colors_v2, fix_dark_colors_v3, fix_dark_colors_v4,
    fix_dark_colors_v5, fix_dark_colors_v6
  - fix_demo_complete, fix_demo_final, fix_demo_tenant
  - fix_deploy, fix_emoji, fix_en_reviews, fix_excess_braces, fix_export_dupes
  - fix_final_build, fix_hero_title
  - fix_locale, fix_locale_deep, fix_locale_final, fix_nested
  - fix_nginx, fix_nginx_demo, fix_omni_syntax
  - fix_path, fix_php_syntax, fix_remaining_guard, fix_reviews_title
  - fix_rollup_format, fix_truncated, fix_user_plan
  - 검증: package.json 참조 0건, require/import 외부 참조 0건 확인 후 일괄 처리
  - rename 100% 인식 (히스토리 보존됨)

6차 (이번 세션)
- 33개 기타 일회성 스크립트 archive (commit 946d50a)
  - apply (9개): apply_all_fixes, apply_apikeys_fix, apply_demo_tenant_fix,
    apply_dp_fix, apply_init_globals, apply_init_globals_perfect,
    apply_perfect_fixes, apply_perfect_parser, apply_ranges
  - smart (5개): smart_trans_final, smart_trans_stable, smart_trans_strict,
    smart_trans_v5, smart_translate
  - tmp (5개): tmp_dict.json, tmp_dict_api_keys.json, tmp_inject.js,
    tmp_translate.js, tmp_translate_api.js
  - see (3개): see_de_error, see_dummy, see_error
  - test (4개): test.js, test_api.cjs, test_err.js, test_out.txt
  - 단발성 (7개): seed_demo_data, setup_demo_phase1, supreme_deploy,
    update_guide_detail, upload_assets, verify_chunk, view_ai_seg
  - 검증: package.json 참조 0건, 외부 require/import 0건 확인 후 일괄 처리
  - 주의: tmp 5개는 닫힌 파이프라인 (자기들끼리 read/write)
    - tmp_translate.js → tmp_dict.json 작성
    - tmp_translate_api.js → tmp_dict_api_keys.json 작성
    - tmp_inject.js → tmp_dict_api_keys.json 읽음
    - 외부 코드는 이 5개를 참조하지 않음 → 묶어서 archive 안전

7차 (이번 세션)
- 47개 misc 일회성 스크립트 archive (commit 8ea9bbb)
  - underscore (16개): _add_conn_i18n.js, _deploy_demo.cjs, _deploy_ssh.cjs,
    _extract_conn_i18n.js, _find_conn.js, _find_jb_section.cjs, _test_wms.mjs,
    _tmp_check_de.mjs, _tmp_check_en.mjs, _tmp_check_id.mjs, _tmp_check_ja.mjs,
    _tmp_check_ko.mjs, _tmp_check_th.mjs, _tmp_check_vi.mjs, _tmp_check_zh.mjs,
    _tmp_check_zh-TW.mjs
  - activate (3개): activate_stubs.cjs, activate_stubs2.cjs, activate_stubs3.cjs
  - add (3개): add_link_keys.cjs, add_locales.js, add_platform_keys.cjs
  - analyze/audit/auto/backend/bust (5개): analyze_platform.cjs, audit_extended.cjs,
    auto_translate.js, backend_fixer.js, bust_sw.cjs
  - check (10개): check_and_build.cjs, check_api.cjs, check_demo.cjs,
    check_demo_data.cjs, check_deploy.cjs, check_locale.cjs, check_nginx.cjs,
    check_routes.cjs, check_server.cjs, check_sms.cjs
  - clean/convert/deep/diagnose/esm/extract/final/find (10개): clean_deploy.cjs,
    convert_remaining.js, deep_audit.cjs, diagnose_locale.cjs, esm_check.cjs,
    extract_kpi.js, final_verify.cjs, find_comma_issue.cjs, find_error_pos.cjs,
    find_exact_error.cjs
  - 검증: package.json 참조 0건, require/import 외부 참조 0건 확인 후 일괄 처리
  - rename 100% 인식 (47 files changed, 0 insertions, 0 deletions)
  - 주의: `_` prefix 16개 중 _tmp_check_*.mjs 9개는 다국어 검증 일회성 도구 (de, en, id, ja, ko, th, vi, zh, zh-TW)

8차 (이번 세션)
- 14개 misc 일회성 스크립트 archive (commit 4eec099)
  - rebuild (2개): rebuild_omni_i18n.cjs, rebuild_webpopup_i18n.cjs
  - refactor (2개): refactor_sc.cjs, refactor_wa.cjs
  - restore (2개): restore_and_fix.cjs, restore_locales.cjs
  - scan (2개): scan_jsx.js, scan_korean.cjs
  - 단발성 (6개): merge_reviews_blocks.cjs, production_guard.cjs,
    purge_email_jsx.js, replace_remaining.js, run_crm_fix.js, safe_patch_demo.cjs
  - 검증 5개 항목 모두 통과: package.json, require, import, 인프라 파일(.sh/.yml/Dockerfile), 전체 .md 문서
  - rename 100% 인식 (14 files changed, 0 insertions, 0 deletions)
  - 주의: scan_korean.cjs의 D 마크 자연 해소 확인됨 (인수인계서 예측 적중)
- deploy_* 12개는 운영 critical로 판단되어 8차에서 의도적 제외 (옵션 A 결정)
  - docs/WORK_PROCESS.md:456에서 `./deploy_ssh2.cjs --env production --approve` 운영 명령어 발견
  - docs/BUG-013_DEPLOY_ENCODING_FIX.md에서 deploy_node.cjs, deploy_demo.cjs 언급
  - docs/JOURNEY_BUILDER_KPI_FIX.md:283에서 `node deploy_demo.cjs` 실행 명령어 발견
  - deploy_*는 별도 9차에서 신중 처리 필요 (운영 절차 문서 정독 후)

### 누적 통계
- archive된 파일 수: 183개 (8 + 15 + 7 + 17 + 42 + 33 + 47 + 14)
- archive 위치: tools/migrations/_archived/
- Cline 호출: 0회 (모든 작업 PowerShell로 처리)
- 5월 2일 단일 세션 처리량: 175개 (1차 8개 제외)

### 다음 작업 후보 (우선순위 순)

1. 루트 정리 9차 — deploy_* 12개 신중 처리 (가장 위험도 높음)
   - 8차 후 루트에 deploy_*.cjs/.js 12개 + vite.config.js 1개 잔존
   - deploy_* 12개 목록:
     - deploy_all.cjs, deploy_demo.cjs, deploy_demo_direct.cjs, deploy_demo_v2.cjs
     - deploy_kakao.cjs, deploy_nginx_root.cjs, deploy_node.cjs, deploy_prod.cjs
     - deploy_scp.cjs, deploy_ssh2.cjs, deploy_ssh2.js, deploy_win.js
   - ⚠️ 운영 critical: 8차 검증 시 docs/ 운영 가이드에서 호출 사례 다수 발견됨
     - docs/WORK_PROCESS.md:456 → `./deploy_ssh2.cjs --env production --approve` (운영 절차)
     - docs/BUG-013_DEPLOY_ENCODING_FIX.md → deploy_node.cjs, deploy_demo.cjs 언급
     - docs/JOURNEY_BUILDER_KPI_FIX.md:283 → `node deploy_demo.cjs` 실행 명령어
   - 권장 접근:
     - docs/WORK_PROCESS.md, docs/BUG-013_DEPLOY_ENCODING_FIX.md, docs/JOURNEY_BUILDER_KPI_FIX.md 정독 후 시작
     - 보존 필수 후보: deploy_ssh2.cjs (운영 명령어), deploy_node.cjs, deploy_demo.cjs
     - archive 가능 후보 (단순 변형/구버전 추정): deploy_demo_direct.cjs, deploy_demo_v2.cjs,
       deploy_all.cjs, deploy_kakao.cjs, deploy_nginx_root.cjs, deploy_prod.cjs, deploy_scp.cjs,
       deploy_ssh2.js (cjs 버전과 다름), deploy_win.js
     - 단, 위 archive 후보들도 docs 정독 후 개별 확인 필수
   - 검증 패턴 (8차에서 확립): require, import, 인프라(.sh/.yml/Dockerfile), 전체 .md 문서 5개 항목
   - 부분 archive 가능성 높음 — 카테고리 통째로 처리 안 됨

2. 비스크립트 잡파일 정리 — 별도 트랙
   - .txt 파일들: find_out.txt, keys_out.txt, ko_check.txt, korean_lines.txt,
     missing_keys.txt, sub_check.txt, tab_keys.txt
   - .json 파일들: ko_orderHub.json, korean_map.json, kpi_keys.json,
     missing_attrData.json, orderHub_keys.json, orderHub_ko.json
   - .py 파일들: fix_audit.py, fix_auth.py, restore_authpage.py
   - .sh 파일: ssh_test.sh
   - 7차에서는 .js/.cjs/.mjs만 처리, 나머지 형식은 9차 이후 또는 별도 트랙

3. i18n 누락 키 9개 추가 — 별도 신중 작업
   - ko.js에 channelKpiPage 6곳, 9개 키 누락
   - 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals,
     tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
   - 별도 세션 권장 (구조 복잡)
   - Cline 호출 필요 (실제 코드 수정)

4. 초고도화/엔터프라이즈급 분석 — 별도 새 세션 필수
   - 아키텍처, 인프라, 데이터, 관측성, 보안 등
   - 사전 정보 수집 후 분석 시작
   - 사전 답변 필요한 13개 질문 별도 항목 참조

### 알려진 이슈
- clean_src 폴더: nested git repo (별도 .git 보유), .gitmodules에 미등록
  - .clineignore로 차단 중이라 Cline 작업에 영향 없음
  - git status에서 modified로 항상 표시되지만 무시 가능
  - 나중에 별도로 정리 결정 필요
- scan_korean.cjs D 마크 이슈: 8차에서 archive 처리하며 자연 해소됨 (해결 완료)

### 중요 분석 자료
- ko.js 인코딩: 정상 UTF-8
- jb 섹션: 95% 번역 완료, 9개 키 누락
- channelKpiPage가 ko.js에 6곳 있음 (구조 복잡)
- PowerShell Get-Content 출력 시 한글 깨짐 → VS Code 에디터로 직접 보면 정상

### 8차에서 발견된 인프라 파일 목록 (9차 검증 시 활용)
프로젝트 루트와 하위에 다음 인프라 파일들이 있어 deploy_* 검증 시 반드시 확인 필요:
- .github/workflows/deploy.yml (GitHub Actions CI/CD)
- frontend/Dockerfile
- infra/docker-compose.yml
- docker-compose.yml (메인)
- deploy.sh (루트 배포 스크립트)
- deploy_gitbash.sh (Git Bash용 배포 스크립트)
- ssh_test.sh

8차 검증 결과: 위 파일 중 어느 것도 8차 archive 대상 14개를 참조하지 않음.
9차에서는 deploy_* 12개에 대해 동일 검증 필수.

### 작업 흐름 (검증된 8단계 패턴)

1단계: Get-ChildItem으로 파일 목록 조사
2단계: Select-String으로 package.json 참조 검증
3단계: Select-String으로 require/import 외부 참조 검증 (-List, Where-Object 활용)
   - .json 파일이 포함된 경우 require('./파일명')와 readFileSync 패턴 둘 다 검증
4단계: git mv로 일괄 이동 (PowerShell ForEach-Object 활용)
5단계: git status --short로 renamed 검증 (R로 시작하는 라인 카운트)
6단계: git commit -m "chore: archive N <type> scripts to tools/migrations/_archived/"
   - 카테고리별 개수를 메시지에 명시하면 git log 가독성 좋음
7단계: git push origin master
8단계: 인수인계서 NEXT_SESSION.md 업데이트 및 commit/push

### 8차에서 확립된 5단 검증 패턴 (운영 critical 파일 검증용)

운영에 영향이 있을 가능성이 있는 파일(예: deploy_*)은 일반 검증에 추가로 인프라/문서 검증이 필수:

```powershell
# 패턴을 변수에 저장
$pattern = "(deploy_all|deploy_demo|...)"

# 검증 1: package.json
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count

# 검증 2: require()
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./$pattern" -List | Measure-Object).Count

# 검증 3: ES module import
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./$pattern" -List | Measure-Object).Count

# 검증 4: 인프라 파일 (운영 호출)
Select-String -Path ".github/workflows/deploy.yml","frontend/Dockerfile","infra/docker-compose.yml","docker-compose.yml","deploy.sh","deploy_gitbash.sh","ssh_test.sh" -Pattern $pattern

# 검증 5: 전체 문서 (운영 가이드)
Get-ChildItem -Recurse -File -Filter "*.md" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|_archived|clean_src|legacy|NEXT_SESSION' } | Select-String -Pattern $pattern
```

5개 항목 모두 0건/출력없음일 때만 archive 안전.
어느 하나라도 매칭이 발견되면 그 파일은 보존하거나 별도 분석 필요.

### 5차에서 검증된 일괄 처리 PowerShell 패턴

```powershell
# 1단계: 개수 확인
Get-ChildItem -File -Filter "PATTERN_*.cjs" | Measure-Object | Select-Object -ExpandProperty Count

# 2단계: package.json 참조 확인
Select-String -Path "package.json" -Pattern "PATTERN_.*\.cjs"

# 3단계: 외부 참조 확인
Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./PATTERN_" -List
Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./PATTERN_" -List

# 4단계: 일괄 이동
Get-ChildItem -File -Filter "PATTERN_*.cjs" | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }

# 5단계: rename 검증
git status --short | Select-String "^R" | Measure-Object | Select-Object -ExpandProperty Count
```

### 6차에서 검증된 다중 카테고리 동시 처리 패턴

```powershell
# 여러 카테고리 통합 검증 (한 번에)
Select-String -Path "package.json" -Pattern "(apply_|smart_trans|tmp_|see_|test_)"
Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./(apply_|smart_trans|tmp_|see_)" -List

# 카테고리별 git mv (Where-Object regex)
Get-ChildItem -File | Where-Object { $_.Name -match '^apply_' } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }
Get-ChildItem -File | Where-Object { $_.Name -match '^smart_' } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }
# (다른 카테고리도 동일 패턴)

# .json 의존성 별도 검증 (tmp_dict.json 같은 데이터 덤프)
Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "PATTERN.*\.json" -List
```

### 7차/8차에서 추가로 검증된 패턴 (변수 활용 + 라인 wrapping 회피)

```powershell
# 패턴이 길어질 때 변수에 저장해서 라인 wrapping 문제 회피
$pattern = "(_add_conn|_deploy|_extract|activate_stubs|add_link_keys|check_|clean_|deep_|find_)"

# 깔끔한 카운트 출력
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./$pattern" -List | Measure-Object).Count
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./$pattern" -List | Measure-Object).Count

# 명확한 결과 표시 (Write-Host 단독 사용 - 다른 명령어와 한 줄에 붙이지 말 것)
$count = (git status --short | Select-String "^R" | Measure-Object).Count
Write-Host "Renamed: $count"

# git status 중 일부만 미리보기 (의도한 카테고리인지 검증)
git status --short | Select-String "^R" | Select-Object -First 10

# 8차에서 확립: anchor를 활용한 정확한 카테고리 매칭
# ^($pattern)\.(js|cjs|mjs)$ 처럼 시작과 확장자를 anchor로 잡아서 오매칭 방지
Get-ChildItem -File | Where-Object { $_.Name -match "^($batchPattern)\.(js|cjs|mjs)$" } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }

# `_` prefix는 정규식에서 escape 불필요 (^_ 그대로 사용 가능)
Get-ChildItem -File | Where-Object { $_.Name -match '^_' -and $_.Name -match '\.(js|cjs|mjs)$' } | ForEach-Object { git mv $_.Name "tools/migrations/_archived/$($_.Name)" }
```

### PowerShell 사용 시 주의사항 (7차/8차에서 발견)

- 명령어가 너무 길면 줄바꿈되어 라인 wrapping 발생 → GUID나 OSC 시퀀스가 결과처럼 출력됨
  - 해결: 패턴을 변수에 저장 후 짧게 호출
- Write-Host와 Get-ChildItem 같은 명령어를 한 줄에 붙이지 말 것 (Enter로 분리)
- 결과 검증 시 `0`이 단독 출력되면 다음 프롬프트 `PS`의 `P`가 잘려 `0S D:\...`로 보일 수 있음 (정상)
- Clear-Host로 화면 정리 후 다시 명령어 실행하면 가독성 향상
- 두 줄 명령어 입력 시 첫 줄 Enter → 결과 확인 → 두 번째 줄 입력 (한꺼번에 입력 X)

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
- 5월 2일 누적 175개 파일 처리 / Cline 호출 0회 / 비용 $0.0585 유지
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

루트 정리 9차 (deploy_* 신중 처리, 권장 시작점):
"지난 세션 완료 작업을 확인하고 다음 진행을 추천해주세요.
PowerShell로 git log -5 부터 확인 부탁합니다.
이번엔 루트 정리 9차로 deploy_* 12개 점검을 진행하고 싶습니다.
8차 검증에서 docs/WORK_PROCESS.md, docs/BUG-013, docs/JOURNEY_BUILDER_KPI_FIX에서
deploy_ssh2.cjs/deploy_node.cjs/deploy_demo.cjs 운영 호출이 발견되었으니
이 3개 docs 파일을 먼저 정독한 후 archive 가능/보존 필수를 분리해주세요."

i18n 누락 키 작업:
"GeniegoROI ko.js의 channelKpiPage 누락 키 9개 추가 작업을 시작하고 싶습니다.
구조가 복잡하니 신중하게 진행해주세요."

초고도화 분석 시작:
"GeniegoROI 초고도화 분석을 시작합니다. 사전 답변 13개 질문에 답변하면서 진행하겠습니다."