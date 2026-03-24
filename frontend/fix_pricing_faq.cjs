const fs = require('fs');
let c = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');

// Find and replace the FAQ hardcoded array
const oldFAQ = `          [
          ["플랜을 언제든지 변경할 수 있나요?", "네, 언제든지 상위/하위 플랜으로 즉시 전환 가능합니다. 일할 계산으로 차액이 조정됩니다."],
          ["Account 수는 무엇을 의미하나요?", "동시에 접속 가능한 독립 사용자 Account 수입니다. Enterprise는 무제한입니다."],
          ["구독 Cancel 시 환불은 어떻게 되나요?", "Monthly은 당일 Cancel 시 100% 환불, Quarter/Half-year/Annual은 나머지 기간 비율로 환불됩니다."],
          ["Free 플랜과 유료 플랜의 차이는?", "Free는 데모 데이터 기반 체험 플랜입니다. 실제 Channel 연동, 실시간 데이터, AI 자동화는 Growth 이상에서 제공됩니다."],
          ["요금이 'Register 예정'으로 표시되는 이유는?", "관리자 센터에서 해당 플랜·주기의 요금이 아직 Register되지 않은 Status입니다. 곧 Update됩니다."],
          ["Enterprise 플랜 구매 방법은?", "Enterprise는 별도 상담 후 맞춤 계약을 진행합니다. contact@genie-roi.com으로 문의주세요."],
        ].map(([q, a], i) => (`;

const newFAQ = `          [
          [t("pricing.faq1q"), t("pricing.faq1a")],
          [t("pricing.faq2q"), t("pricing.faq2a")],
          [t("pricing.faq3q"), t("pricing.faq3a")],
          [t("pricing.faq4q"), t("pricing.faq4a")],
          [t("pricing.faq5q"), t("pricing.faq5a")],
          [t("pricing.faq6q"), t("pricing.faq6a")],
        ].map(([q, a], i) => (`;

if (c.includes(oldFAQ)) {
  c = c.replace(oldFAQ, newFAQ);
  console.log('✅ FAQ array replaced with t() calls');
} else {
  // Try with CRLF
  const oldFAQcrlf = oldFAQ.replace(/\n/g, '\r\n');
  const newFAQcrlf = newFAQ.replace(/\n/g, '\r\n');
  if (c.includes(oldFAQcrlf)) {
    c = c.replace(oldFAQcrlf, newFAQcrlf);
    console.log('✅ FAQ array replaced (CRLF)');
  } else {
    console.log('⚠ FAQ array not found exactly - trying partial match...');
    // Try to find it differently
    const faqIdx = c.indexOf('플랜을 언제든지 변경할 수');
    if (faqIdx >= 0) {
      console.log('Found FAQ content at:', faqIdx);
      const before = c.slice(Math.max(0, faqIdx-200), faqIdx);
      const after = c.slice(faqIdx, faqIdx+800);
      console.log('Before:', before);
      console.log('After:', after);
    } else {
      console.log('❌ FAQ content not found at all');
    }
  }
}

fs.writeFileSync('src/pages/Pricing.jsx', c, 'utf8');
console.log('✅ File saved');

// Verify
const check = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');
console.log('faq1q count:', (check.match(/faq1q/g)||[]).length);
console.log('한국어 FAQ count:', (check.match(/플랜을 언제든지/g)||[]).length);
