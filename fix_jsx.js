const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Attribution.jsx', 'utf8');

c = c.replace(/const baseROAS = \{[^}]+\};/g, "const baseROAS = { 'Meta Ads': 0, 'Naver Ads': 0, 'Google Ads': 0, 'TikTok': 0, 'Kakao': 0, 'Email': 0 };");
c = c.replace(/r\.share\.toFixed\(1\)/g, "(isNaN(r.share) ? 0 : r.share).toFixed(1)");
c = c.replace(/r\.ci95\[0\]\.toFixed\(2\)/g, "(!isNaN(r.ci95[0]) ? r.ci95[0].toFixed(2) : 0)");
c = c.replace(/r\.ci95\[1\]\.toFixed\(2\)/g, "(!isNaN(r.ci95[1]) ? r.ci95[1].toFixed(2) : 0)");
c = c.replace(/r\.saturation \* 100/g, "(!isNaN(r.saturation) ? r.saturation * 100 : 0)");
c = c.replace(/r\.ci95 && /g, "r.ci95 && !isNaN(r.ci95[0]) && ");

// Add zero-state safeguard rendering
c = c.replace(
  /export function bayesianMMM\(channelData, revenue, config = \{\}\) \{/,
  "export function bayesianMMM(channelData, revenue, config = {}) {\n  const isAllZero = revenue.every(r => r === 0);\n"
);

fs.writeFileSync('frontend/src/pages/Attribution.jsx', c);
console.log('done');
