/**
 * patch_remaining.cjs  
 * 잔존 한국어: 단위(개/원), 채널명, 만/억 단위 수정
 */
const fs = require('fs');
const path = require('path');

function patch(filePath, replacements) {
  if (!fs.existsSync(filePath)) { console.log('SKIP:', filePath); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('CHANGED:', path.relative(process.cwd(), filePath));
  } else {
    console.log('UNCHANGED:', path.relative(process.cwd(), filePath));
  }
}

// 1. AIRecommendTab.jsx
patch('src/pages/AIRecommendTab.jsx', [
  // 입력 필드 단위
  ["['Product Name/SKU Count', 'skuCount', '\uAC1C']", "['Product Name/SKU Count', 'skuCount', 'units']"],
  ["['\uC6D4 \uD310\uB9E4 Goal', 'monthlyQty', '\uAC1C']", "['Monthly Sales Goal', 'monthlyQty', 'units']"],
  ["['Average \uB2E8\uAC00', 'avgPrice', '\uC6D0']", "['Avg. Unit Price', 'avgPrice', '\u20A9']"],
  ["['\uB9C8\uC9C4\uC728', 'marginRate', '%']", "['Margin Rate', 'marginRate', '%']"],
  ["['Goal Revenue', 'targetRevenue', '\uC6D0']", "['Goal Revenue', 'targetRevenue', '\u20A9']"],
  // 채널명
  ["'Naver\uC1FC\uD551'", "'Naver Shopping'"],
  ["'\uC790\uCCB4\uBAB0'", "'Own Mall'"],
  ["'Kakao\uC1FC\uD551'", "'Kakao Shopping'"],
  ["'\uC544\uB9C8\uC874'", "'Amazon'"],
  ["'\uB77C\uCFE0\uD150'", "'Rakuten'"],
  // 이미 patch했지만 혹시 남아있을 수 있는 것들
  ["\uC8FC\uC694 \uD310\uB9E4 Channel (\uBCF5Count Select)", "Main Sales Channels (multi-select)"],
  ["\uCE74\uD0C8\uB85C\uADF8 Auto Aggregate", "Catalog Auto-filled"],
  ["\uD310\uB9E4 Product Info \uC785\uB825", "Sales Product Info"],
]);

// 2. AIPrediction.jsx - 만/억 단위, 명/일/회/건 단위
patch('src/pages/AIPrediction.jsx', [
  // LTV 만 단위 (template literal patterns)
  ['\u20A9${Math.round((seg.avg_ltv || 0) / 10000)}\uB9CC', '\u20A9${((seg.avg_ltv || 0) / 10000).toFixed(0)}M'],
  ['\u20A9${Math.round((seg.total_ltv || 0) / 100000000)}\uC5B5', '\u20A9${((seg.total_ltv || 0) / 100000000).toFixed(1)}B'],
  ['\u20A9${Math.round((seg.max_ltv || 0) / 10000)}\uB9CC', '\u20A9${((seg.max_ltv || 0) / 10000).toFixed(0)}M'],
  ['\u20A9${Math.round((c.ltv_12m || 0) / 10000)}\uB9CC', '\u20A9${((c.ltv_12m || 0) / 10000).toFixed(0)}M'],
  // 명 단위
  [`\${(summary.total || 0).toLocaleString()}\uBA85`, '${(summary.total || 0).toLocaleString()} users'],
  [`\${(summary.high_risk || 0).toLocaleString()}\uBA85`, '${(summary.high_risk || 0).toLocaleString()} users'],
  [`\${(ltvSegments[0]?.customer_count || 847).toLocaleString()}\uBA85`, '${(ltvSegments[0]?.customer_count || 847).toLocaleString()} users'],
  // customer count 명 in LTV tab
  ['\uBA85\u003C/span\u003E\u003C/div\u003E\n                                ]\u003C/div\u003E', 
   ' users</span></div>\n                                ]</div>'],
  ['>}\uBA85\u003C/span', '> users</span'],
  // 일 단위 overview
  ['`${c.days_since_purchase || 0}\uC77C \uC804`', '`${c.days_since_purchase || 0} days ago`'],
  // 회 단위
  ['`${c.purchase_count || 0}\uD69F`', '`${c.purchase_count || 0} times`'],
  // 건 단위
  ['.toLocaleString()}\uAC74', '.toLocaleString()} records'],
  // 점수 grade
  ['"\uCC94\uD53C\uC5B8\uC2A4"', '"Champions"'],
  ['"\uCDA9\uC131Customer"', '"Loyal"'], 
  ['"\uC2E0\uADDC"', '"New"'],
  ['"\uC774\uD0C8\uC704\uD5D8"', '"Churn Risk"'],
  ['"\uC774\uD0C8"', '"Churned"'],
]);

// 3. DemoDataLayer.js grades
patch('src/utils/DemoDataLayer.js', [
  ['"\uCC94\uD53C\uC5B8\uC2A4"', '"Champions"'],
  ['"\uCDA9\uC131Customer"', '"Loyal"'],
  ['"\uC2E0\uADDC"', '"New"'],
  ['"\uC774\uD0C8\uC704\uD5D8"', '"Churn Risk"'],
  ['"\uC774\uD0C8"', '"Churned"'],
]);

// 4. CurrencyContext.jsx - 만/억 단위 (CurrencyContext 경로 재확인)
const cc1 = 'src/contexts/CurrencyContext.jsx';
const cc2 = 'src/context/CurrencyContext.jsx';
const ccPath = fs.existsSync(cc1) ? cc1 : cc2;
patch(ccPath, [
  ['.toFixed(1)}\uC5B5`', '.toFixed(1)}B`'],
  ['.toFixed(0)}\uB9CC`', '.toFixed(0)}M`'],
]);

console.log('\nDone!');
