# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-02  
> Last Commit: 3d2dfa3 (8개 fix 스크립트 archive)

---

## 새 Claude에게 보낼 메시지

아래 구분선 사이의 내용을 그대로 복사해서 새 Claude 대화에 붙여넣으세요.

---

GeniegoROI 프로젝트 작업을 이어서 진행합니다. 다음은 컨텍스트입니다.

### 프로젝트 정보
- GitHub: https://github.com/genie-go/Geniego_ROI
- 로컬 경로: D:\project\GeniegoROI
- 브랜치: master
- 환경: Windows + PowerShell + VS Code (Antigravity) + Cline 에이전트
- Cline 모델: claude-sonnet-4-5-20250929

### 프로젝트 성격
ROI 분석 통합 대시보드 (CRM, KPI, 시스템, P&L 4개 도메인).
기술 스택: Python 백엔드 + React/Vite 프론트엔드 + PostgreSQL.
다국어 지원: 15개 언어.

### 협업 방식
- Cline 토큰 절약을 위해 Claude 웹과 협업 중
- PowerShell에서 가능한 작업은 PowerShell로 (무료)
- 실제 코드 변경만 Cline에 위임
- 한 줄씩 명령어 실행 (한꺼번에 붙여넣기 금지)
- 매 단계 검증

### 지난 세션 완료 (2026-05-02)
1. .clineignore 셋업 + 검증 완료 (commit b32ba89)
2. 8개 fix 스크립트 archive (commit 3d2dfa3)
   - fix.js, fix3.js, fix4.js, fix5.js, fixComma.js
   - fix_admin_form.js, fix_admin_form2.js, fix_auth.js
   → tools/migrations/_archived/

### 다음 작업 (선택지)
1. 루트 정리 2단계: patch_*.js (약 10개)
2. 루트 정리 3단계: patch_*.cjs (약 20개)
3. 루트 정리 4단계: inject_*.cjs (약 15개)
4. 루트 정리 5단계: fix_*.cjs (약 30개)
5. i18n 누락 키 9개 추가 (별도 작업, 신중히)

### 중요 분석 자료
- ko.js 인코딩: 정상 UTF-8
- jb 섹션: 95% 번역 완료, 9개 키 누락
- 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals, tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
- channelKpiPage가 ko.js에 6곳 있음 (구조 복잡)

### 첫 요청
지난 세션 완료된 작업을 확인하고 다음 진행을 추천해주세요.
PowerShell로 git log -5 부터 확인 부탁합니다.

---

## 작업 진행 추적

### 완료
- [x] .clineignore 셋업 (b32ba89)
- [x] 8개 fix*.js archive (3d2dfa3)

### 진행 예정 (루트 정리)
- [ ] patch_*.js 정리 (약 10개)
- [ ] patch_*.cjs 정리 (약 20개)
- [ ] inject_*.cjs 정리 (약 15개)
- [ ] fix_*.cjs 정리 (약 30개)
- [ ] smart_trans*.js 정리 (5개)
- [ ] apply_*.js 정리 (약 5개)
- [ ] tmp_*.js 정리 (3개)

### 진행 예정 (i18n)
- [ ] channelKpiPage 6곳 구조 분석
- [ ] 9개 누락 키 정확한 위치 식별
- [ ] ko.js 안전 패치 작성
- [ ] Cline 정밀 작업 (좁은 범위)

---

## 주의사항 (다음 세션도 동일)

### 절대 하지 말 것
- ko.js, en.js, ja.js 전체 읽기 (토큰 폭탄)
- vite.config.js 옮기기 (빌드 깨짐)
- 한 번에 50개+ 파일 이동 (위험)
- Cline에 모호한 지시

### 항상 할 것
- PowerShell 우선 (무료)
- git mv 사용 (히스토리 보존)
- 단계별 검증 (Get-ChildItem, git status)
- 작업 전 백업 commit
- 한 줄씩 명령어 실행

---

## .clineignore 핵심 차단 패턴

- frontend/src/i18n/locales/**/*.js (모든 언어 파일)
- frontend/src/i18n/locales_backup/
- clean_src/ (서브모듈)
- legacy_v338_pkg/
- fix_*, nuke_*, smart_trans_*, supreme_deploy.js
- dict_*.json
- node_modules/, dist/, build/
- .env, *.pem, *.key

---

## 비용 추적

- 5월 2일 세션: $0.0585 (검증 1회만)
- 누적 절감: 5월 1일 $3.11 대비 약 1.9% 사용
- .clineignore 도입 효과: Cline 작업당 약 70% 절감

---

## 새 세션 시작 가이드

1. VS Code/Antigravity 열기
2. D:\project\GeniegoROI 프로젝트 열기
3. PowerShell 터미널 열기
4. Get-Content NEXT_SESSION.md 실행해서 이 문서 확인
5. 새 Claude 대화 열기
6. 위의 "새 Claude에게 보낼 메시지" 박스 내용 통째로 복사 → 붙여넣기
7. Claude가 컨텍스트 파악 후 다음 단계 안내함