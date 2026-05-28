// 175차 Sprint 2 — i18n 개별 키 추가 (기존 root namespace 가 partial/empty)
//
// 사용법: node inject_175_i18n_keys.cjs

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'pt', 'ru', 'hi'];

// 각 namespace 안에 추가할 개별 키
// ko/en 만 정의 — 13 lang 은 en fallback
const KEYS_BY_NS = {
  recon: {
    ko: { pageTitle: '대조 & 정산', settled: '정산 완료', pending: '대기 중', adDeduction: '광고비 차감', platformCommission: '플랫폼 수수료' },
    en: { pageTitle: 'Reconciliation & Settlement', settled: 'Settled', pending: 'Pending', adDeduction: 'Ad Deduction', platformCommission: 'Platform Commission' },
  },
  operations: {
    ko: { heroTitle: '운영 허브', tabCreative: '크리에이티브', tabCreativeDesc: '광고 크리에이티브 관리', guideTitle: '운영 가이드' },
    en: { heroTitle: 'Operations Hub', tabCreative: 'Creative', tabCreativeDesc: 'Manage ad creatives', guideTitle: 'Operations Guide' },
  },
  ds: {
    ko: { heroTitle: '데이터 스키마', exportJSON: 'JSON 내보내기', tabGuide: '가이드' },
    en: { heroTitle: 'Data Schema', exportJSON: 'Export JSON', tabGuide: 'Guide' },
  },
  email: {
    ko: { noChannels: '이메일 채널이 연결되지 않았습니다.', liveSyncStatus: '실시간 동기화', heroTitle: '이메일 마케팅', tabAnalytics: '분석', tabCreative: '크리에이티브', tabGuide: '가이드' },
    en: { noChannels: 'No email channels connected.', liveSyncStatus: 'Live Sync', heroTitle: 'Email Marketing', tabAnalytics: 'Analytics', tabCreative: 'Creative', tabGuide: 'Guide' },
  },
  sms: {
    ko: { noChannels: 'SMS 채널이 연결되지 않았습니다.', liveSyncStatus: '실시간 동기화', heroTitle: 'SMS 마케팅', tabAnalytics: '분석', tabCreative: '크리에이티브', tabGuide: '가이드' },
    en: { noChannels: 'No SMS channels connected.', liveSyncStatus: 'Live Sync', heroTitle: 'SMS Marketing', tabAnalytics: 'Analytics', tabCreative: 'Creative', tabGuide: 'Guide' },
  },
  contentCal: {
    ko: { liveSyncMsg: '실시간 동기화 활성', tabGuide: '가이드', heroTitle: '콘텐츠 캘린더' },
    en: { liveSyncMsg: 'Live sync active', tabGuide: 'Guide', heroTitle: 'Content Calendar' },
  },
  dataProduct: {
    ko: { heroTitle: '데이터 프로덕트', tabGuide: '가이드', tabGuideDesc: '데이터 제품 가이드' },
    en: { heroTitle: 'Data Product', tabGuide: 'Guide', tabGuideDesc: 'Data product guide' },
  },
  approvalsPage: {
    ko: { heroTitle: '승인 워크플로우', tabGuide: '가이드' },
    en: { heroTitle: 'Approvals Workflow', tabGuide: 'Guide' },
  },
  writebackPage: {
    ko: { heroTitle: '라이트백 콘솔', tabGuide: '가이드' },
    en: { heroTitle: 'Writeback Console', tabGuide: 'Guide' },
  },
  omniChannel: {
    ko: { heroTitle: '옴니채널' },
    en: { heroTitle: 'Omni Channel' },
  },
  performance: {
    ko: { pageTitle: '성과 허브', realtimeSync: '실시간 동기화', securityNormal: '보안 정상', badgeSecurity: '보안 활성', descPerformance: '실시간 KPI 모니터링', tabPerformance: '성과', threatsDetected: '위협 감지됨' },
    en: { pageTitle: 'Performance Hub', realtimeSync: 'Live Sync', securityNormal: 'Security OK', badgeSecurity: 'Security Active', descPerformance: 'Real-time KPI monitoring', tabPerformance: 'Performance', threatsDetected: 'Threats Detected' },
  },
  gCat: {
    ko: {
      finance_label: '금융', finance_route: '/finance',
      insurance_label: '보험', insurance_route: '/insurance',
      medical_label: '의료', medical_route: '/medical',
      legal_label: '법률', legal_route: '/legal',
      education_label: '교육', education_route: '/education',
      realestate_label: '부동산', realestate_route: '/realestate',
    },
    en: {
      finance_label: 'Finance', finance_route: '/finance',
      insurance_label: 'Insurance', insurance_route: '/insurance',
      medical_label: 'Medical', medical_route: '/medical',
      legal_label: 'Legal', legal_route: '/legal',
      education_label: 'Education', education_route: '/education',
      realestate_label: 'Real Estate', realestate_route: '/realestate',
    },
  },
  menuAccess: {
    ko: { catDash: '대시보드', catAI: 'AI', catMkt: '마케팅', catCommerce: '커머스', catOps: '운영', catData: '데이터', catAdmin: '관리자', catFin: '재무' },
    en: { catDash: 'Dashboard', catAI: 'AI', catMkt: 'Marketing', catCommerce: 'Commerce', catOps: 'Operations', catData: 'Data', catAdmin: 'Admin', catFin: 'Finance' },
  },
};

// 기존 namespace block 안에 새 키 삽입.
// 접근법:
//   1. namespace 시작 줄 (^  "?ns"?\s*:\s*\{ 또는 빈 {}) 찾기
//   2. 그에 매칭되는 } 까지 사이의 텍스트에서 키 누락 검사
//   3. 누락 키만 } 직전에 삽입
function addMissingKeysToNamespace(txt, ns, valuesObj) {
  // namespace 시작 패턴
  const nsStartRx = new RegExp(`(^  "?${ns}"?\\s*:\\s*\\{)([\\s\\S]*?)(^  \\},?)`, 'm');
  const m = txt.match(nsStartRx);
  if (!m) {
    return { txt, added: 0, error: 'namespace block not found' };
  }
  const [full, openLine, body, closeLine] = m;
  const start = m.index;

  // body 안에서 이미 정의된 키 추출 (단순 정규식 — top level "key": 만)
  const existingKeys = new Set();
  const keyRx = /^\s*"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*:/gm;
  let km;
  while ((km = keyRx.exec(body)) !== null) {
    existingKeys.add(km[1]);
  }

  // 누락 키만 새로 추가
  const missing = [];
  for (const [k, v] of Object.entries(valuesObj)) {
    if (existingKeys.has(k)) continue;
    const esc = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    missing.push(`    "${k}": "${esc}"`);
  }
  if (missing.length === 0) return { txt, added: 0 };

  // 마지막 키 뒤에 , 가 없을 수 있음 — body 끝부분 처리
  const bodyTrimmed = body.replace(/\s*$/, '');
  const needsComma = bodyTrimmed.length > 0 && !/,\s*$/.test(bodyTrimmed) && !/\{\s*$/.test(bodyTrimmed);
  const sep = needsComma ? ',\n' : '\n';
  const insertion = (bodyTrimmed.length > 0 ? sep : '\n') + missing.join(',\n') + '\n  ';

  const newBlock = openLine + bodyTrimmed + insertion + closeLine;
  const newTxt = txt.slice(0, start) + newBlock + txt.slice(start + full.length);
  return { txt: newTxt, added: missing.length };
}

function processLocale(filePath, lang) {
  let txt = fs.readFileSync(filePath, 'utf-8');
  const beforeLen = txt.length;
  let totalAdded = 0;
  const errors = [];
  const details = {};

  for (const [ns, defs] of Object.entries(KEYS_BY_NS)) {
    const values = defs[lang] || defs.en;
    const r = addMissingKeysToNamespace(txt, ns, values);
    if (r.error) {
      errors.push(`${ns}: ${r.error}`);
      continue;
    }
    if (r.added > 0) {
      txt = r.txt;
      totalAdded += r.added;
      details[ns] = r.added;
    }
  }

  if (totalAdded > 0) {
    fs.writeFileSync(filePath, txt, 'utf-8');
  }
  return { totalAdded, errors, details, deltaBytes: txt.length - beforeLen };
}

console.log('[175차 S2] 개별 키 추가 (기존 root namespace 보강)\n');
const summary = {};
for (const lang of LANGS) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fpath = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fpath)) continue;
  const r = processLocale(fpath, lang);
  summary[lang] = r;
  console.log(`[${lang.padEnd(7)}] +${r.totalAdded} keys (+${r.deltaBytes} bytes)`);
  if (r.errors.length) console.log(`  errors: ${r.errors.slice(0, 3).join('; ')}`);
  if (Object.keys(r.details).length) {
    console.log('  ' + Object.entries(r.details).map(([k, v]) => `${k}:${v}`).join(' '));
  }
}

console.log('\n총 추가 키:', Object.values(summary).reduce((s, r) => s + r.totalAdded, 0));
