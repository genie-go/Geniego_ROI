# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-02
> Last Commit: f6aca11 (origin/master 동기화 완료)

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

### 5월 2일 완료된 작업 (총 5차)

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

### 누적 통계
- archive된 파일 수: 89개 (8 + 15 + 7 + 17 + 42)
- archive 위치: tools/migrations/_archived/
- Cline 호출: 0회 (모든 작업 PowerShell로 처리)

### 다음 작업 후보 (우선순위 순)

1. 기타 일회성 스크립트 정리 — 권장
   - apply_*.js (약 9개)
   - smart_trans_*.js (약 4개): smart_trans_final, smart_trans_stable, smart_trans_strict, smart_trans_v5, smart_translate
   - tmp_*.js (약 5개): tmp_inject, tmp_translate, tmp_translate_api 등
   - see_*.cjs/js (약 3개): see_de_error, see_dummy, see_error
   - test_*.js/cjs (약 3개): test, test_api, test_err
   - 단발성 파일들: supreme_deploy.js, seed_demo_data.cjs, setup_demo_phase1.cjs,
     update_guide_detail.cjs, upload_assets.cjs, verify_chunk.cjs, view_ai_seg.js
   - 합계 약 30개 이상 예상
   - 카테고리별로 분리 처리 권장 (require 의존성 확인 필요)

2. i18n 누락 키 9개 추가 — 별도 신중 작업
   - ko.js에 channelKpiPage 6곳, 9개 키 누락
   - 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals, 
     tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
   - 별도 세션 권장 (구조 복잡)

3. 초고도화/엔터프라이즈급 분석 — 별도 새 세션 필수
   - 아키텍처, 인프라, 데이터, 관측성, 보안 등
   - 사전 정보 수집 후 분석 시작
   - 사전 답변 필요한 13개 질문 별도 항목 참조

### 알려진 이슈
- clean_src 폴더: nested git repo (별도 .git 보유), .gitmodules에 미등록
  - .clineignore로 차단 중이라 Cline 작업에 영향 없음
  - git status에서 modified로 항상 표시되지만 무시 가능
  - 나중에 별도로 정리 결정 필요

### 중요 분석 자료
- ko.js 인코딩: 정상 UTF-8
- jb 섹션: 95% 번역 완료, 9개 키 누락
- channelKpiPage가 ko.js에 6곳 있음 (구조 복잡)
- PowerShell Get-Content 출력 시 한글 깨짐 → VS Code 에디터로 직접 보면 정상

### 작업 흐름 (검증된 8단계 패턴)

1단계: Get-ChildItem으로 파일 목록 조사
2단계: Select-String으로 package.json 참조 검증
3단계: Select-String으로 require/import 외부 참조 검증 (-List, Where-Object 활용)
4단계: git mv로 일괄 이동 (PowerShell ForEach-Object 활용)
5단계: git status --short로 renamed 검증 (R로 시작하는 라인 카운트)
6단계: git commit -m "chore: archive N <type> scripts to tools/migrations/_archived/"
7단계: git push origin master
8단계: 인수인계서 NEXT_SESSION.md 업데이트 및 commit/push

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
- 5차에서 PowerShell만으로 42개 처리 → Cline 호출 0회 유지
- 5월 2일 누적 89개 파일 처리 / Cline 호출 0회
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

루트 정리 작업 계속:
"지난 세션 완료 작업을 확인하고 다음 진행을 추천해주세요.
PowerShell로 git log -5 부터 확인 부탁합니다."

초고도화 분석 시작:
"GeniegoROI 초고도화 분석을 시작합니다. 사전 답변 13개 질문에 답변하면서 진행하겠습니다."