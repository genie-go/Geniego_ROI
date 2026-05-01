# Git Commit & Push 가이드

**작성일**: 2026-05-01  
**작성 시간**: 15:20 (KST)  
**작성자**: PM 에이전트

---

## 🎯 목적

BUG-011, BUG-013, BUG-012 관련 수정 사항을 GitHub에 커밋하고 푸시합니다.

---

## 📋 커밋할 파일 목록

### 1. BUG-011: Journey Builder KPI 카드 수정
- `frontend/src/pages/JourneyBuilder.jsx`
- `docs/JOURNEY_BUILDER_KPI_FIX.md`

### 2. BUG-013: 배포 스크립트 인코딩 오류 수정
- `_deploy_clean.py`
- `docs/BUG-013_DEPLOY_ENCODING_FIX.md`

### 3. BUG-012: 빌드 번들 누락 분석
- `docs/BUG-012_BUILD_BUNDLE_ANALYSIS.md`
- `docs/PM_WORK_SUMMARY.md`

---

## 🚀 실행 방법

### Option 1: Git Bash 사용 (권장)

```bash
# Git Bash 열기
# 프로젝트 디렉토리로 이동
cd /d/project/GeniegoROI

# BUG-011 커밋
git add frontend/src/pages/JourneyBuilder.jsx docs/JOURNEY_BUILDER_KPI_FIX.md
git commit -m "fix: Journey Builder KPI 카드 반응형 및 테마 지원 개선

- 인라인 스타일을 CSS 클래스로 전환 (kpi-card, kpi-label, kpi-value)
- 반응형 그리드 적용 (repeat(auto-fit, minmax(180px, 1fr)))
- 라벨/값 순서 수정 (label 위, value 아래)
- 아이콘 위치 조정 (오른쪽 상단)
- PerformanceHub 패턴과 일관성 확보
- 다크 모드 및 테마 전환 지원

Fixes: #BUG-011"

# BUG-013 커밋
git add _deploy_clean.py docs/BUG-013_DEPLOY_ENCODING_FIX.md
git commit -m "fix: 배포 스크립트 UTF-8 인코딩 오류 수정

- Windows 환경에서 UTF-8 출력 강제 설정
- 이모지 제거하여 ASCII 호환성 확보
- sys.stdout.reconfigure(encoding='utf-8') 추가
- 모든 환경에서 정상 작동 보장

Fixes: #BUG-013"

# BUG-012 문서 추가
git add docs/BUG-012_BUILD_BUNDLE_ANALYSIS.md docs/PM_WORK_SUMMARY.md
git commit -m "docs: BUG-012 분석 및 PM 작업 요약 문서 추가

- BUG-012 False Positive 확인 및 분석 문서 작성
- InfluencerHub/InfluencerUGC 정상 작동 검증
- Section 컴포넌트는 내부 컴포넌트로 정상
- PM 작업 요약 보고서 추가 (5,500+ 줄)
- 수정 불필요 결론

Resolves: #BUG-012"

# Push
git push origin main
```

---

### Option 2: PowerShell 사용

```powershell
# PowerShell 열기
# 프로젝트 디렉토리로 이동
cd D:\project\GeniegoROI

# BUG-011 커밋
git add frontend/src/pages/JourneyBuilder.jsx docs/JOURNEY_BUILDER_KPI_FIX.md
git commit -m "fix: Journey Builder KPI 카드 반응형 및 테마 지원 개선

- 인라인 스타일을 CSS 클래스로 전환
- 반응형 그리드 적용
- 라벨/값 순서 수정
- 아이콘 위치 조정
- PerformanceHub 패턴과 일관성 확보
- 다크 모드 및 테마 전환 지원

Fixes: #BUG-011"

# BUG-013 커밋
git add _deploy_clean.py docs/BUG-013_DEPLOY_ENCODING_FIX.md
git commit -m "fix: 배포 스크립트 UTF-8 인코딩 오류 수정

- Windows 환경에서 UTF-8 출력 강제 설정
- 이모지 제거하여 ASCII 호환성 확보
- sys.stdout.reconfigure(encoding='utf-8') 추가
- 모든 환경에서 정상 작동 보장

Fixes: #BUG-013"

# BUG-012 문서 추가
git add docs/BUG-012_BUILD_BUNDLE_ANALYSIS.md docs/PM_WORK_SUMMARY.md
git commit -m "docs: BUG-012 분석 및 PM 작업 요약 문서 추가

- BUG-012 False Positive 확인
- InfluencerHub/InfluencerUGC 정상 작동 검증
- PM 작업 요약 보고서 추가

Resolves: #BUG-012"

# Push
git push origin main
```

---

### Option 3: 한 번에 모두 커밋 (간편 버전)

```bash
# Git Bash 또는 PowerShell에서 실행
cd /d/project/GeniegoROI  # Git Bash
# 또는
cd D:\project\GeniegoROI  # PowerShell

# 모든 파일 한 번에 추가
git add frontend/src/pages/JourneyBuilder.jsx docs/JOURNEY_BUILDER_KPI_FIX.md _deploy_clean.py docs/BUG-013_DEPLOY_ENCODING_FIX.md docs/BUG-012_BUILD_BUNDLE_ANALYSIS.md docs/PM_WORK_SUMMARY.md

# 통합 커밋
git commit -m "fix: BUG-011, BUG-013 수정 및 BUG-012 분석 완료

BUG-011: Journey Builder KPI 카드 반응형 및 테마 지원 개선
- 인라인 스타일을 CSS 클래스로 전환
- 반응형 그리드 적용
- 다크 모드 지원

BUG-013: 배포 스크립트 UTF-8 인코딩 오류 수정
- Windows 환경 UTF-8 출력 강제 설정
- 이모지 제거

BUG-012: 빌드 번들 누락 분석 완료
- False Positive 확인
- 모든 컴포넌트 정상 작동
- PM 작업 요약 보고서 추가

Fixes: #BUG-011, #BUG-013
Resolves: #BUG-012"

# Push
git push origin main
```

---

## ✅ 확인 사항

### 커밋 전 확인
```bash
# 변경된 파일 확인
git status

# 변경 내용 확인
git diff frontend/src/pages/JourneyBuilder.jsx
git diff _deploy_clean.py
```

### 커밋 후 확인
```bash
# 커밋 로그 확인
git log --oneline -5

# 원격 저장소 확인
git remote -v
```

### Push 후 확인
- GitHub 웹사이트에서 커밋 확인
- Actions 탭에서 CI/CD 상태 확인 (있는 경우)

---

## ⚠️ 주의사항

1. **커밋 전 백업**: 중요한 변경사항이므로 커밋 전 백업 권장
2. **브랜치 확인**: `git branch`로 현재 브랜치가 `main`인지 확인
3. **충돌 해결**: Push 실패 시 `git pull origin main` 후 재시도
4. **커밋 메시지**: 한글 메시지 사용 시 UTF-8 인코딩 확인

---

## 🔧 문제 해결

### 문제 1: "cmd.exe is not recognized" 오류
**해결**: Git Bash 또는 PowerShell 사용

### 문제 2: Push 실패 (rejected)
```bash
# 원격 변경사항 가져오기
git pull origin main --rebase

# 충돌 해결 후 Push
git push origin main
```

### 문제 3: 커밋 메시지 수정 필요
```bash
# 마지막 커밋 메시지 수정
git commit --amend

# 강제 Push (주의: 협업 시 사용 금지)
git push origin main --force
```

---

## 📊 예상 결과

### 성공 시 출력
```
[main abc1234] fix: Journey Builder KPI 카드 반응형 및 테마 지원 개선
 2 files changed, 150 insertions(+), 50 deletions(-)
 
[main def5678] fix: 배포 스크립트 UTF-8 인코딩 오류 수정
 2 files changed, 80 insertions(+), 20 deletions(-)
 
[main ghi9012] docs: BUG-012 분석 및 PM 작업 요약 문서 추가
 2 files changed, 900 insertions(+)
 create mode 100644 docs/BUG-012_BUILD_BUNDLE_ANALYSIS.md
 create mode 100644 docs/PM_WORK_SUMMARY.md

Enumerating objects: 15, done.
Counting objects: 100% (15/15), done.
Delta compression using up to 8 threads
Compressing objects: 100% (10/10), done.
Writing objects: 100% (10/10), 5.50 KiB | 5.50 MiB/s, done.
Total 10 (delta 8), reused 0 (delta 0), pack-reused 0
To https://github.com/genie-go/Geniego_ROI.git
   33fbb1d..abc1234  main -> main
```

---

## 📞 다음 단계

커밋 완료 후:
1. ✅ GitHub에서 커밋 확인
2. ✅ BUG-008 성능 최적화 작업 진행
3. ✅ 다음 우선순위 작업 진행

---

**작성자**: PM 에이전트  
**최종 업데이트**: 2026-05-01 15:20 (KST)
