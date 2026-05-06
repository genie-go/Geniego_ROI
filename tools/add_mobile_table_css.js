const fs = require('fs');
const path = require('path');

/**
 * [환경 설정] styles.css 경로 확인
 */
const FILE_PATH = 'd:/project/GeniegoROI/frontend/src/styles.css';

// 업데이트 관리를 위한 전용 식별 태그
const START_TAG = '/* @geniego-native-ultra-v1-start */';
const END_TAG = '/* @geniego-native-ultra-v1-end */';

const nativeUltraCSS = `
${START_TAG}
/**
 * GeniegoROI Native App (iOS/Android) Ultra Optimization System
 * 통합 모바일 반응형 엔진 V1
 */

/* 1. 기본 앱 환경 설정 */
:root {
  --app-safe-top: env(safe-area-inset-top, 0px);
  --app-safe-bottom: env(safe-area-inset-bottom, 0px);
  --primary-blue: #4f8ef7;
}

@media (max-width: 768px) {
  /* [전역 환경] 스크롤 바운스 및 터치 감도 개선 */
  html, body {
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  /* [상단바/하단바] 네이티브 노치 대응 */
  .topbar, header {
    padding-top: calc(10px + var(--app-safe-top)) !important;
  }
  footer, .bottom-nav {
    padding-bottom: calc(10px + var(--app-safe-bottom)) !important;
  }

  /* 2. 지능형 그리드 엔진 (Inline Style 오버라이드) */
  [style*="grid-template-columns"] {
    display: grid !important;
    /* 최소 140px 보장, 공간 부족 시 자동 줄바꿈 */
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 145px), 1fr)) !important;
    gap: 12px !important;
  }

  /* 비대칭 레이아웃 강제 해제 */
  [style*="1fr 2fr"], [style*="2fr 1fr"], [style*="200px 1fr"] {
    grid-template-columns: 1fr !important;
  }

  /* 3. Native 감각의 카드 UI */
  .card, .card-glass, [class*="card"] {
    padding: 16px !important;
    margin-bottom: 8px !important;
    border-radius: 16px !important; /* 더 둥근 모서리로 네이티브 느낌 부여 */
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
    overflow: hidden !important;
  }

  /* KPI 수치 텍스트 최적화 */
  .card > div:nth-child(2) {
    font-size: clamp(1.2rem, 5vw, 1.5rem) !important;
    font-weight: 800 !important;
    letter-spacing: -0.5px !important;
  }

  /* 4. 테이블 가로 스크롤 & 고정 레이아웃 */
  div:has(> table), .table-container {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    border-radius: 12px;
    background: rgba(255,255,255,0.05);
  }

  table {
    width: max-content !important;
    min-width: 100% !important;
    font-size: 11px !important;
  }

  th, td {
    padding: 12px 10px !important;
    white-space: nowrap !important;
    border-bottom: 1px solid rgba(0,0,0,0.05) !important;
  }

  /* 5. 폼 요소 및 버튼 (터치 영역 확대) */
  button, .btn, [role="button"] {
    min-height: 44px; /* iOS 추천 최소 터치 영역 */
    border-radius: 12px !important;
    font-weight: 600 !important;
  }

  input[type="range"] {
    height: 20px;
    width: 100% !important;
  }

  /* 6. 모달/다이얼로그 (Full Screen 가깝게 조정) */
  [class*="modal"], [class*="Modal"] {
    width: 94vw !important;
    max-height: 80vh !important;
    margin: 3vw !important;
    border-radius: 24px 24px 0 0 !important; /* Bottom Sheet 느낌 */
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
  }

  /* 7. 텍스트 가독성 고도화 */
  h1, .hero-title { font-size: clamp(1.4rem, 6vw, 1.8rem) !important; line-height: 1.2 !important; }
  p, .hero-desc { font-size: 0.9rem !important; line-height: 1.5 !important; opacity: 0.8; }
  
  .badge {
    padding: 4px 8px !important;
    font-size: 10px !important;
    word-break: keep-all !important;
  }
}

/* 초소형 모바일 대응 (iPhone SE 등) */
@media (max-width: 480px) {
  [style*="grid-template-columns"] {
    grid-template-columns: 1fr !important; /* 좁은 화면에선 무조건 1열 */
  }
  .card { padding: 12px !important; }
}
${END_TAG}`;

function run() {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            console.error('❌ 파일을 찾을 수 없습니다:', FILE_PATH);
            return;
        }

        let content = fs.readFileSync(FILE_PATH, 'utf8');
        const startIndex = content.indexOf(START_TAG);
        const endIndex = content.indexOf(END_TAG);

        if (startIndex !== -1 && endIndex !== -1) {
            const before = content.substring(0, startIndex);
            const after = content.substring(endIndex + END_TAG.length);
            content = before + nativeUltraCSS.trim() + after;
            console.log('🔄 UPDATE: Native 최적화 엔진이 최신 버전으로 갱신되었습니다.');
        } else {
            content = content.trim() + '\\n\\n' + nativeUltraCSS.trim();
            console.log('✅ SUCCESS: Native 최적화 엔진이 성공적으로 설치되었습니다.');
        }

        fs.writeFileSync(FILE_PATH, content, 'utf8');
    } catch (err) {
        console.error('❌ 오류 발생:', err.message);
    }
}

run();