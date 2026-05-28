// 175차 S5.3 — long-tail i18n 후속 보강 (audit 잔존 raw-key 대응)
const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'pt', 'ru', 'hi'];

const KEYS_BY_NS = {
  recon: {
    ko: { pageDesc: '채널 정산 데이터를 업로드하여 수수료 규칙과 자동 매칭합니다.', viewPnl: 'P&L 대시보드 확인', tabUpload: '데이터 업로드', tabRecon: '대조 실행', tabReports: '리포트', tabTickets: '티켓 대응', tabGuide: '가이드' },
    en: { pageDesc: 'Upload channel settlement data and auto-match against fee rules.', viewPnl: 'View P&L Dashboard', tabUpload: 'Upload', tabRecon: 'Reconcile', tabReports: 'Reports', tabTickets: 'Tickets', tabGuide: 'Guide' },
  },
  performance: {
    ko: { pageSub: '실시간 KPI 모니터링 · 이상 감지 · 크로스채널 분석', tabSettlement: '정산', tabCreator: '크리에이터', tabSkuProfit: 'SKU 수익성', tabCohort: '코호트', tabAccountPerformance: '계정 성과' },
    en: { pageSub: 'Real-time KPI · Anomaly Detection · Cross-channel Analytics', tabSettlement: 'Settlement', tabCreator: 'Creator', tabSkuProfit: 'SKU Profit', tabCohort: 'Cohort', tabAccountPerformance: 'Account Performance' },
  },
  ds: {
    ko: { exportCSV: 'CSV 내보내기', tabGuideDesc: '데이터 스키마 가이드' },
    en: { exportCSV: 'Export CSV', tabGuideDesc: 'Data schema guide' },
  },
  menuAccess: {
    ko: { item_dashboard: '대시보드', item_rollup: '롤업', item_marketing: '마케팅', item_attribution: '어트리뷰션', item_crm: 'CRM', item_omni: '옴니채널', item_orderhub: '주문허브', item_wms: 'WMS', item_performance: '성과', item_pnl: 'P&L', item_ai: 'AI', item_admin: '관리자' },
    en: { item_dashboard: 'Dashboard', item_rollup: 'Rollup', item_marketing: 'Marketing', item_attribution: 'Attribution', item_crm: 'CRM', item_omni: 'Omni Channel', item_orderhub: 'OrderHub', item_wms: 'WMS', item_performance: 'Performance', item_pnl: 'P&L', item_ai: 'AI', item_admin: 'Admin' },
  },
  gCat: {
    ko: { tax_label: '세무', tax_route: '/tax', etc_service_label: '기타 서비스', etc_service_route: '/etc' },
    en: { tax_label: 'Tax', tax_route: '/tax', etc_service_label: 'Other Service', etc_service_route: '/etc' },
  },
  gAiRec: {
    ko: { channel_NaverShopping: '네이버 쇼핑', channel_Coupang: '쿠팡', channel_Amazon: '아마존', channel_Shopify: 'Shopify', channel_TikTok: 'TikTok', channel_Meta: 'Meta', channel_Google: 'Google', monthlyRecBudget: '월 추천 예산', edit: '편집', original: '원래값', reset: '초기화', annualRecBudget: '연간 추천 예산', autoYear: '자동 연간', expectedRoas: '예상 ROAS', monthly: '월간', annual: '연간', effectiveness: '효과', regen: '재생성', savePng: 'PNG 저장', deliveryDefault: '기본 배송', adDefault: '기본 광고', tip: '팁', title: 'AI 추천', subtitle: 'AI 기반 마케팅 추천', salesInfo: '매출 정보', catalogAuto: '카탈로그 자동', skuCount: 'SKU 수', units: '단위', monthlyQty: '월 수량', avgPrice: '평균 가격', currencyWon: '₩', marginRate: '마진율', goalRevenue: '목표 매출', period: '기간', mainChannels: '주요 채널', searchPlaceholder: '검색...', aiAnalysis: 'AI 분석', recommend: '추천', analysisProgress: '분석 진행 중', analyzingBest: '최적 분석 중', gatheringData: '데이터 수집 중' },
    en: { channel_NaverShopping: 'Naver Shopping', channel_Coupang: 'Coupang', channel_Amazon: 'Amazon', channel_Shopify: 'Shopify', channel_TikTok: 'TikTok', channel_Meta: 'Meta', channel_Google: 'Google', monthlyRecBudget: 'Monthly Recommended Budget', edit: 'Edit', original: 'Original', reset: 'Reset', annualRecBudget: 'Annual Recommended Budget', autoYear: 'Auto Year', expectedRoas: 'Expected ROAS', monthly: 'Monthly', annual: 'Annual', effectiveness: 'Effectiveness', regen: 'Regenerate', savePng: 'Save PNG', deliveryDefault: 'Default Delivery', adDefault: 'Default Ad', tip: 'Tip', title: 'AI Recommend', subtitle: 'AI-powered marketing recommendations', salesInfo: 'Sales Info', catalogAuto: 'Catalog Auto', skuCount: 'SKU Count', units: 'units', monthlyQty: 'Monthly Qty', avgPrice: 'Avg Price', currencyWon: '₩', marginRate: 'Margin Rate', goalRevenue: 'Goal Revenue', period: 'Period', mainChannels: 'Main Channels', searchPlaceholder: 'Search...', aiAnalysis: 'AI Analysis', recommend: 'Recommend', analysisProgress: 'Analysis in progress', analyzingBest: 'Analyzing best...', gatheringData: 'Gathering data...' },
  },
};

function addMissingKeysToNamespace(txt, ns, valuesObj) {
  const nsStartRx = new RegExp(`(^  "?${ns}"?\\s*:\\s*\\{)([\\s\\S]*?)(^  \\},?)`, 'm');
  const m = txt.match(nsStartRx);
  if (!m) return { txt, added: 0, error: 'namespace not found' };
  const [full, openLine, body, closeLine] = m;
  const start = m.index;
  const existing = new Set();
  const keyRx = /^\s*"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*:/gm;
  let km;
  while ((km = keyRx.exec(body)) !== null) existing.add(km[1]);
  const missing = [];
  for (const [k, v] of Object.entries(valuesObj)) {
    if (existing.has(k)) continue;
    const esc = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    missing.push(`    "${k}": "${esc}"`);
  }
  if (missing.length === 0) return { txt, added: 0 };
  const bodyTrimmed = body.replace(/\s*$/, '');
  const needsComma = bodyTrimmed.length > 0 && !/,\s*$/.test(bodyTrimmed) && !/\{\s*$/.test(bodyTrimmed);
  const sep = needsComma ? ',\n' : '\n';
  const insertion = (bodyTrimmed.length > 0 ? sep : '\n') + missing.join(',\n') + '\n  ';
  const newBlock = openLine + bodyTrimmed + insertion + closeLine;
  return { txt: txt.slice(0, start) + newBlock + txt.slice(start + full.length), added: missing.length };
}

for (const lang of LANGS) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fpath = path.join(LOCALES_DIR, fname);
  let txt = fs.readFileSync(fpath, 'utf-8');
  let total = 0;
  const details = {};
  for (const [ns, defs] of Object.entries(KEYS_BY_NS)) {
    const values = defs[lang] || defs.en;
    const r = addMissingKeysToNamespace(txt, ns, values);
    if (r.added > 0) { txt = r.txt; total += r.added; details[ns] = r.added; }
  }
  if (total > 0) fs.writeFileSync(fpath, txt, 'utf-8');
  console.log(`[${lang.padEnd(7)}] +${total} keys ${Object.entries(details).map(([k,v]) => `${k}:${v}`).join(' ')}`);
}
