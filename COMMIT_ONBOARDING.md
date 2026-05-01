# 온보딩 투어 커밋 가이드

## 변경된 파일
1. `frontend/src/components/OnboardingTour.jsx` (신규)
2. `frontend/src/App.jsx` (수정)
3. `frontend/src/i18n/onboarding_tour_i18n.js` (신규)

## Git 명령어

```bash
git add frontend/src/components/OnboardingTour.jsx frontend/src/App.jsx frontend/src/i18n/onboarding_tour_i18n.js

git commit -m "✨ feat: 첫 방문자 온보딩 투어 시스템 추가

- OnboardingTour 컴포넌트 생성 (인터랙티브 가이드)
- App.jsx에 온보딩 투어 통합
- 4개 언어 번역 추가 (ko, en, ja, zh)
- 모바일 최적화 포함
- localStorage 기반 첫 방문 감지"

git push origin master
```

## 변경 사항 요약

### 1. OnboardingTour.jsx (신규 생성)
- 첫 방문자를 위한 인터랙티브 온보딩 투어
- 5단계 가이드 (환영 → 대시보드 → 마케팅 → 연동 → 완료)
- 진행률 표시 및 단계 인디케이터
- 모바일 반응형 디자인
- localStorage 기반 첫 방문 감지

### 2. App.jsx (수정)
- OnboardingTour 컴포넌트 import 추가
- AppLayout에 OnboardingTour 통합

### 3. onboarding_tour_i18n.js (신규 생성)
- 4개 언어 번역 (한국어, 영어, 일본어, 중국어)
- 각 단계별 제목과 설명
- 버튼 텍스트 (건너뛰기, 다음, 시작하기)
