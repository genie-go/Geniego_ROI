const fs = require('fs');
const path = require('path');

/**
 * [환경 설정]
 * 프로젝트의 styles.css 경로가 정확한지 확인하세요.
 */
const FILE_PATH = 'd:/project/GeniegoROI/frontend/src/styles.css';

// 업데이트 관리를 위한 고유 식별 태그 (중복 삽입 방지 및 관리용)
const START_TAG = '/* @geniego-autogrid-system-v2-start */';
const END_TAG = '/* @geniego-autogrid-system-v2-end */';

// 고도화된 모바일 그리드 및 텍스트 최적화 CSS
const optimizedCSS = `
${START_TAG}
/* GeniegoROI Mobile Grid System V2 
   - 모든 인라인 그리드(repeat)를 반응형 auto-fill로 통합 전환
   - 유동적 폰트 시스템 (Clamp) 적용으로 가독성 극대화
   - 중복 실행 방지 로직 포함
*/
@media (max-width: 768px) {
  /* 1. KPI 카드 컴포넌트 최적화 */
  .card.card-glass {
    padding: 10px 12px !important;
    gap: 8px !important;
  }

  /* KPI 카드 내부 텍스트 계층 구조 최적화 */
  .card.card-glass > div:first-child { font-size: 0.65rem !important; opacity: 0.8; } 
  .card.card-glass > div:nth-child(2) { font-size: 1.1rem !important; font-weight: 700 !important; }
  .card.card-glass > div:nth-child(3) { font-size: 0.6rem !important; }

  /* 2. [핵심] 모든 인라인 그리드 오버라이드 */
  /* 띄어쓰기에 상관없이 grid-template-columns 내 repeat 패턴 감지 */
  [style*="grid-template-columns"] {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 130px), 1fr)) !important;
    gap: 12px !important;
  }

  /* 비대칭 레이아웃(1:2, 2:1 등)을 모바일에서 1열로 강제 전환 */
  [style*="1fr 2fr"], [style*="2fr 1fr"], [style*="200px 1fr"], [style*="1fr 200px"] {
    grid-template-columns: 1fr !important;
  }

  /* 3. 유동적 폰트 시스템 (clamp 함수 사용) */
  /* 큰 숫자 및 강조 텍스트 (최소 14px ~ 최대 22px 사이 자동 조절) */
  [style*="font-size: 2"], [style*="fontSize: 2"],
  [style*="font-size: 3"], [style*="fontSize: 3"] {
    font-size: clamp(14px, 4vw, 22px) !important;
    letter-spacing: -0.02em;
    line-height: 1.2 !important;
  }

  .hero-title { font-size: clamp(1.2rem, 5vw, 1.6rem) !important; font-weight: 800 !important; }
  .hero-desc { font-size: clamp(0.75rem, 3vw, 0.85rem) !important; opacity: 0.9; }

  /* 4. UI 요소 보정 */
  .badge, [class*="badge"], [class*="chip"] {
    white-space: normal !important;
    word-break: keep-all !important; /* 한국어 단어 깨짐 방지 */
    padding: 2px 6px !important;
    font-size: 0.65rem !important;
  }

  [role="tab"] {
    font-size: 11px !important;
    padding: 8px 6px !important;
  }

  /* 슬라이더 전체 너비 */
  input[type="range"] { width: 100% !important; }
}

/* 초소형 모바일 기기 추가 보정 */
@media (max-width: 480px) {
  [style*="grid-template-columns"] {
    grid-template-columns: repeat(auto-fill, minmax(115px, 1fr)) !important;
  }
}
${END_TAG}`;

function applyOptimization() {
    try {
        // 1. 파일 존재 여부 확인
        if (!fs.existsSync(FILE_PATH)) {
            console.error(\`❌ 에러: 파일을 찾을 수 없습니다 -> \${FILE_PATH}\`);
            return;
        }

        let content = fs.readFileSync(FILE_PATH, 'utf8');

        // 2. 기존 최적화 코드 블록 확인 및 교체
        const startIndex = content.indexOf(START_TAG);
        const endIndex = content.indexOf(END_TAG);

        if (startIndex !== -1 && endIndex !== -1) {
            // 이미 존재하면 해당 부분만 업데이트 (중복 방지 핵심 로직)
            const before = content.substring(0, startIndex);
            const after = content.substring(endIndex + END_TAG.length);
            content = before + optimizedCSS.trim() + after;
            console.log('🔄 UPDATE: 기존 모바일 최적화 영역을 최신 버전으로 갱신했습니다.');
        } else {
            // 없으면 파일 맨 뒤에 새로 추가
            content = content.trim() + '\\n\\n' + optimizedCSS.trim();
            console.log('✅ SUCCESS: 모바일 최적화 코드를 파일 끝에 성공적으로 추가했습니다.');
        }

        // 3. 파일 저장
        fs.writeFileSync(FILE_PATH, content, 'utf8');
        console.log(\`📊 styles.css 현재 크기: \${content.length} bytes\`);

    } catch (error) {
        console.error('❌ 실행 중 치명적 오류 발생:', error.message);
    }
}

applyOptimization();