/**
 * fix_priceopt_theme.cjs — PriceOpt.jsx 다크모드 인라인 스타일 일괄 라이트모드 변환
 * 
 * 작업 범위:
 * 1. 배경색: #0f172a/#0d1117/#1c2842/rgba(0,0,0,...) → 라이트 색상
 * 2. 텍스트색: #fff/#e2e8f0 → 다크 텍스트
 * 3. 테두리: #1c2842 → 라이트 보더
 * 4. CSS 변수: var(--bg-1), var(--surface), var(--text-2) → 고정 색상
 * 5. sticky 탭바 다크모드 제거
 * 6. ScoreBar 다크 배경 제거
 * 7. input/select 다크 스타일 제거
 */
const fs = require('fs');
const fp = require('path').join(__dirname, 'src/pages/PriceOpt.jsx');
let src = fs.readFileSync(fp, 'utf8');

// === 1. Hero/Title 영역 ===
// hero className → 제거하고 라이트 스타일
// "background: \"var(--bg-1, #0d1117)\"" → 라이트
src = src.replace(/background:\s*["']var\(--bg-1,\s*#0d1117\)["']/g, 'background: "#f8fafc"');
// "background: \"rgba(0,0,0,0.35)\"" (탭바 배경)
src = src.replace(/background:\s*["']rgba\(0,0,0,0\.35\)["']/g, 'background: "rgba(241,245,249,0.95)"');
// "backdropFilter: \"blur(16px)\"" → keep
// "color: tab === tb.id ? \"#fff\" : \"var(--text-2)\"" → 선택시 흰색, 비선택시 어두운색
src = src.replace(/color:\s*tab\s*===\s*tb\.id\s*\?\s*["']#fff["']\s*:\s*["']var\(--text-2\)["']/g, 
    'color: tab === tb.id ? "#fff" : "#374151"');

// === 2. Card/Surface 다크 배경 ===
// ScoreBar 배경
src = src.replace(/background:\s*["']#1c2842["']/g, 'background: "#e2e8f0"');
// input/select 배경
src = src.replace(/background:\s*["']#0f172a["']/g, 'background: "#f1f5f9"');
// border 색상
src = src.replace(/border:\s*["']1px solid #1c2842["']/g, 'border: "1px solid #e2e8f0"');
// borderBottom 다크 색상
src = src.replace(/borderBottom:\s*["']1px solid #1c2842["']/g, 'borderBottom: "1px solid #e5e7eb"');
src = src.replace(/borderBottom:\s*["']1px solid #0f172a["']/g, 'borderBottom: "1px solid #f1f5f9"');
// input color: '#fff' → 다크 텍스트
src = src.replace(/color:\s*['"]#fff['"]\s*,\s*padding:\s*["']5px 8px["']/g, 'color: "#1e293b", padding: "5px 8px"');

// === 3. CSS 변수 제거 ===
src = src.replace(/var\(--surface\)/g, '#ffffff');
src = src.replace(/var\(--text-2\)/g, '#64748b');
src = src.replace(/var\(--bg-1,\s*#0d1117\)/g, '#f8fafc');
src = src.replace(/var\(--bg-1\)/g, '#f8fafc');
src = src.replace(/var\(--text-1,\s*[^)]+\)/g, '#1e293b');
src = src.replace(/var\(--text-1\)/g, '#1e293b');
src = src.replace(/var\(--border\)/g, '#e2e8f0');

// === 4. 특정 텍스트 색상 수정 (다크모드 전용) ===
// channel card의 금액 색상 #fff → 고대비
src = src.replace(/fontWeight:\s*800,\s*fontSize:\s*15,\s*color:\s*['"]#fff['"]/g, 
    'fontWeight: 800, fontSize: 15, color: "#1e293b"');
// product name 텍스트
src = src.replace(/fontWeight:\s*700,\s*marginBottom:\s*4\s*\}\s*>/g, 
    'fontWeight: 700, marginBottom: 4, color: "#1e293b" }>');
// base price label
src = src.replace(/color:\s*['"]#fff['"]\s*\}\s*>\s*\{fmt\(p\.base_price\)\}/g, 
    'color: "#1e293b" }>{fmt(p.base_price)}');

// === 5. product list item 배경 ===
// padding: "10px 12px", background: "#0f172a" (이미 #f1f5f9로 변환됨)

// === 6. Guide 탭 다크 색상 ===
src = src.replace(/color:\s*['"]#fff['"]\s*,\s*marginBottom:\s*14/g, 'color: "#1e293b", marginBottom: 14');
src = src.replace(/color:\s*['"]#fff['"]\s*,\s*marginBottom:\s*10/g, 'color: "#1e293b", marginBottom: 10');

// === 7. 선택/비선택 탭 색상 안전하게 재적용 (이전 변환에서 누락된 경우) ===
// 이미 위에서 처리됨

fs.writeFileSync(fp, src, 'utf8');

// 변환 결과 카운트
const darkPatterns = ['#0f172a','#0d1117','#1c2842','var(--bg-1','var(--surface','var(--text-2'];
darkPatterns.forEach(p => {
    const count = (src.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > 0) console.log(`⚠️ Remaining: ${p} → ${count} instances`);
});
console.log('✅ PriceOpt.jsx dark mode removal complete');
