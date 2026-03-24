const fs = require('fs');
const file = 'D:/project/GeniegoROI/frontend/src/styles.css';
let c = fs.readFileSync(file, 'utf8');

const mobileCSS = `

/* ═══════════════════════════════════════════════════
   MOBILE RESPONSIVE - Dashboard & Channel Cards
   ═══════════════════════════════════════════════════ */
@media (max-width: 768px) {

  /* 1. 채널 KPI 카드: 7열 → 2열 */
  [style*="repeat(7,1fr)"],
  [style*="repeat(7, 1fr)"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* 2. 채널 성과 카드: 5열 → 2열 (내부 채널 카드) */
  [style*="repeat(5,1fr)"],
  [style*="repeat(5, 1fr)"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* 3. 3열 그리드 → 2열 */
  [style*="repeat(3,1fr)"],
  [style*="repeat(3, 1fr)"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* 4. 채널 성과 테이블(고정폭 그리드) → 모바일 카드형 */
  [style*="110px 56px 56px 72px 64px 56px 54px"] {
    grid-template-columns: 1fr 1fr !important;
    gap: 4px !important;
  }

  /* 5. 3fr 2fr 2단 레이아웃 → 1열 */
  [style*="3fr 2fr"] {
    grid-template-columns: 1fr !important;
  }

  /* 6. 탑바 버튼 텍스트 숨김 (강화) */
  .topbar-btn-text { display: none !important; }
  .topbar-btn-kbd  { display: none !important; }
  .topbar-logo-pc  { display: none !important; }

  /* 7. 라인차트 오버플로우 방지 */
  canvas { max-width: 100% !important; }

  /* 8. 모바일 카드 패딩 축소 */
  [style*="padding: '16px 18px'"] {
    padding: 10px 12px !important;
  }

  /* 9. 통화 셀렉터 축소 */
  .currency-selector {
    max-width: 60px !important;
    font-size: 10px !important;
    padding: 3px 16px 3px 5px !important;
  }
}
`;

// 이미 들어있으면 추가하지 않음
if (!c.includes('MOBILE RESPONSIVE - Dashboard')) {
  c += mobileCSS;
  fs.writeFileSync(file, c, 'utf8');
  console.log('CSS added OK');
} else {
  // 기존 내용 교체
  const start = c.indexOf('/* ═══════════════════════════════════════════════════\n   MOBILE RESPONSIVE');
  const end = c.lastIndexOf('}') + 1;
  c = c.substring(0, start) + mobileCSS;
  fs.writeFileSync(file, c, 'utf8');
  console.log('CSS updated OK');
}
