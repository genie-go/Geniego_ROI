/**
 * patch_all_ui.cjs  
 * UI에 노출되는 모든 파일의 한국어를 영어로 직접 치환
 * 주석(// /* *)에 있는 한국어는 유지
 */
const fs = require('fs');
const path = require('path');

const PATCHES = {
  // ─── PerformanceHub.jsx ─────────────────────────
  'src/pages/PerformanceHub.jsx': [
    ['코호트(월)', 'Cohort(Mon)'],
    ['신규', 'New'],
  ],

  // ─── AuthPage.jsx ─────────────────────────────────
  'src/pages/AuthPage.jsx': [
    ['/월"', '/mo"'],
    ['"/월"', '"/mo"'],
    ['"문의"', '"Contact Us"'],
    ['+ "/월"', '+ "/mo"'],
  ],

  // ─── ProGate.jsx ─────────────────────────────────
  'src/components/ProGate.jsx': [
    ['feature = "이 기능"', 'feature = "This feature"'],
    ['은 Pro Plan 전용입니다', 'is for Pro Plan only'],
    ['${feature}은 Pro Plan 전용입니다', '${feature} is for Pro Plan only'],
  ],

  // ─── ErrorGuideCard.jsx ─────────────────────────────
  'src/components/ErrorGuideCard.jsx': [
    ['해결 가이드', 'Troubleshooting Guide'],
    ['동일한 Error가 반복되면: 토큰/권한 → 필수값 → 정책/쿼터 → 일시장애 순으로 Confirm하세요.',
     'If the same error repeats: Check token/permissions → required fields → policy/quota → temporary outage.'],
  ],

  // ─── Writeback.jsx ─────────────────────────────────
  'src/pages/Writeback.jsx': [
    ['샘플 Product Name', 'Sample Product Name'],
    ['바로 Test Available 샘플 Product Description', 'Ready-to-test sample product description'],
    ['"사이즈"', '"Size"'],
  ],

  // ─── AIPolicy.jsx ─────────────────────────────────
  'src/pages/AIPolicy.jsx': [
    ['<th className="text-left p-1">항목</th>', '<th className="text-left p-1">Item</th>'],
    ['<th className="text-left p-1">기준</th>', '<th className="text-left p-1">Criteria</th>'],
    ['<td className="p-1">{r["항목"]}</td>', '<td className="p-1">{r["Item"]}</td>'],
    ['"항목"', '"Item"'],
    ['"기준"', '"Criteria"'],
  ],

  // ─── PaymentFail.jsx ─────────────────────────────
  'src/pages/PaymentFail.jsx': [
    ['Payment가 Cancel되었거나 Error가 발생했습니다', 'Payment was cancelled or an error occurred'],
    ['>다시 시도</button>', '>Try Again</button>'],
  ],

  // ─── DLQ.jsx ─────────────────────────────────────
  'src/pages/DLQ.jsx': [
    ['Retry 정책에서 최종 Failed한 요청이 JSONL로 누적됩니다. 토큰을 넣고 Replay 하면 동일 요청을 다시 호출합니다.',
     'Requests that finally failed the retry policy accumulate as JSONL. Insert token and Replay to re-call the same requests.'],
    ['(Delete는 DLQ File을 재작성합니다. Delete 후 ID가 재Sort됩니다)', 
     '(Delete rewrites the DLQ file. IDs will be re-sorted after deletion)'],
    ['서버에서 ENABLE_NIGHTLY_DLQ_REPLAY=1 이면 Activate됩니다.',
     'Activated when ENABLE_NIGHTLY_DLQ_REPLAY=1 on the server.'],
  ],

  // ─── i18n/locales/en.js ──────────────────────────
  'src/i18n/locales/en.js': [
    ['💡 {{ch}} example columns: 주문번호, 정산금액, 수수료, 쿠폰할인, 판매금액',
     '💡 {{ch}} example columns: Order No., Settlement Amount, Fee, Coupon Discount, Sales Amount'],
  ],

  // ─── ThemeContext.jsx ─────────────────────────────
  'src/theme/ThemeContext.jsx': [
    ['심우주 네뷸라 · 기본 테마', 'Deep Space Nebula · Default Theme'],
    ['북극 오로라 · 그린 & 퍼플', 'Arctic Aurora · Green & Purple'],
    ['골드 프리미엄 · 럭셔리 다크', 'Gold Premium · Luxury Dark'],
  ],

  // ─── campaignConstants.js (remaining) ──────────────
  'src/pages/campaignConstants.js': [
    ['Wireless Noise-Cancelling 헤드폰', 'Wireless Noise-Cancelling Headphones'],
    ['🇰🇷 한국→🌏 해외', '🇰🇷 Korea→🌏 Overseas'],
    ['🌏 해외→🇰🇷 한국', '🌏 Overseas→🇰🇷 Korea'],
  ],

  // ─── LINEChannel.jsx ──────────────────────────────
  'src/pages/LINEChannel.jsx': [
    ['템플릿 미리보기', 'Template Preview'],
  ],

  // ─── CurrencyContext.jsx ──────────────────────────
  'src/contexts/CurrencyContext.jsx': [
    ['}.toFixed(1)}억`', '}.toFixed(1)}B`'],
    ['}.toFixed(0)}만`', '}.toFixed(0)}M`'],
  ],

  // ─── AIPrediction.jsx (remaining after patch) ─────
  'src/pages/AIPrediction.jsx': [
    ['챔피언스', 'Champions'],
    ['충성Customer', 'Loyal'],
    ['신규', 'New'],
    ['이탈', 'Churned'],
    ['이탈위험', 'Churn Risk'],
    ['일 전`', ' days ago`'],
    ['₩${Math.round((val || 0) / 10000)}만', '₩${((val || 0) / 10000).toFixed(0)}M'],
    ['명\u003c/span\u003e', ' customers</span>'],
    ['명`', ' customers`'],
    ['명"', ' customers"'],
    ['개`', ' units`'],
    ['회`', ' times`'],
    ['건`', ' records`'],
  ],

  // ─── ResultSection.jsx (if exists) ────────────────
  'src/pages/ResultSection.jsx': [
    ['월 예산', 'Monthly Budget'],
    ['연 예산', 'Annual Budget'],
    ['예상 ROAS', 'Expected ROAS'],
    ['원본:', 'Original:'],
    ['되돌리기', 'Reset'],
    ['월', 'Monthly'],
    ['효과 ', 'Effectiveness '],
    ['점', 'pts'],
    ['재생성', 'Regenerate'],
    ['PNG 저장', 'Save PNG'],
    ['운영 팁:', 'Tip:'],
  ],

  // ─── Approvals.jsx ───────────────────────────────
  'src/pages/Approvals.jsx': [
    ['"approved"', '"approved"'],
    ['"budget_cut"', '"budget_cut"'],
    ['"price_change"', '"price_change"'],
    ['"pause_campaign"', '"pause_campaign"'],
    ['"rejected"', '"rejected"'],
  ],
};

function applyPatches(content, patches) {
  let result = content;
  for (const [from, to] of patches) {
    result = result.split(from).join(to);
  }
  return result;
}

const BASE = path.join(__dirname);
let totalChanged = 0;

for (const [relPath, patches] of Object.entries(PATCHES)) {
  const filePath = path.join(BASE, relPath);
  if (!fs.existsSync(filePath)) { console.log(`SKIP (not found): ${relPath}`); continue; }
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  content = applyPatches(content, patches);
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ CHANGED: ${relPath}`);
    totalChanged++;
  } else {
    console.log(`- UNCHANGED: ${relPath}`);
  }
}
console.log(`\nDone! ${totalChanged} files updated.`);
