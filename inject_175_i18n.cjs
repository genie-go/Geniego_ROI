// 175차 Sprint 2 — i18n raw key 일괄 추가
// 15 locale 파일에 missing root namespace + 부분 키 추가
//
// 사용법: node inject_175_i18n.cjs

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'pt', 'ru', 'hi'];

// ─────────────────────────────────────────────────────────────────
// FULL NEW namespaces (root level — 기존 root.* 와 충돌 X)
// ─────────────────────────────────────────────────────────────────
const FULL_NEW = {
  // /reconciliation
  recon: {
    ko: {
      pageTitle: '대조 & 정산',
      settled: '정산 완료',
      pending: '대기 중',
      adDeduction: '광고비 차감',
      platformCommission: '플랫폼 수수료',
    },
    en: {
      pageTitle: 'Reconciliation & Settlement',
      settled: 'Settled',
      pending: 'Pending',
      adDeduction: 'Ad Deduction',
      platformCommission: 'Platform Commission',
    },
  },
  // /pm
  pm: {
    ko: {
      overview: {
        title: '프로젝트 관리',
        newProject: '+ 신규 프로젝트',
        newProjectPrompt: '프로젝트 이름을 입력하세요',
        empty: '아직 프로젝트가 없습니다. 새로 만들어 시작하세요.',
      },
      kpi: {
        total: '전체',
        planning: '계획 중',
        active: '진행 중',
        completed: '완료',
      },
    },
    en: {
      overview: {
        title: 'Project Management',
        newProject: '+ New Project',
        newProjectPrompt: 'Enter project name',
        empty: 'No projects yet. Create one to get started.',
      },
      kpi: {
        total: 'Total',
        planning: 'Planning',
        active: 'Active',
        completed: 'Completed',
      },
    },
  },
  // /operations (root.ruleEnginePage.operations 와 다른 namespace)
  operations: {
    ko: {
      heroTitle: '운영 허브',
      tabCreative: '크리에이티브',
      tabCreativeDesc: '광고 크리에이티브 관리',
      guideTitle: '운영 가이드',
    },
    en: {
      heroTitle: 'Operations Hub',
      tabCreative: 'Creative',
      tabCreativeDesc: 'Manage ad creatives',
      guideTitle: 'Operations Guide',
    },
  },
  // /data-schema (root.crm.ds 와 별도)
  ds: {
    ko: {
      heroTitle: '데이터 스키마',
      exportJSON: 'JSON 내보내기',
      tabGuide: '가이드',
      secTitle: '섹션',
      secCode: '코드',
      secUnlock: '잠금 해제',
    },
    en: {
      heroTitle: 'Data Schema',
      exportJSON: 'Export JSON',
      tabGuide: 'Guide',
      secTitle: 'Section',
      secCode: 'Code',
      secUnlock: 'Unlock',
    },
  },
  // /email-marketing (root.crm.email 와 별도 — 깊이 deepGet 도달 X)
  email: {
    ko: {
      noChannels: '이메일 채널이 연결되지 않았습니다.',
      liveSyncStatus: '실시간 동기화',
      heroTitle: '이메일 마케팅',
      tabAnalytics: '분석',
      tabCreative: '크리에이티브',
      tabGuide: '가이드',
    },
    en: {
      noChannels: 'No email channels connected.',
      liveSyncStatus: 'Live Sync',
      heroTitle: 'Email Marketing',
      tabAnalytics: 'Analytics',
      tabCreative: 'Creative',
      tabGuide: 'Guide',
    },
  },
  // /sms-marketing
  sms: {
    ko: {
      noChannels: 'SMS 채널이 연결되지 않았습니다.',
      liveSyncStatus: '실시간 동기화',
      heroTitle: 'SMS 마케팅',
      tabAnalytics: '분석',
      tabCreative: '크리에이티브',
      tabGuide: '가이드',
    },
    en: {
      noChannels: 'No SMS channels connected.',
      liveSyncStatus: 'Live Sync',
      heroTitle: 'SMS Marketing',
      tabAnalytics: 'Analytics',
      tabCreative: 'Creative',
      tabGuide: 'Guide',
    },
  },
  // /content-calendar
  contentCal: {
    ko: {
      liveSyncMsg: '실시간 동기화 활성',
      tabGuide: '가이드',
      heroTitle: '콘텐츠 캘린더',
    },
    en: {
      liveSyncMsg: 'Live sync active',
      tabGuide: 'Guide',
      heroTitle: 'Content Calendar',
    },
  },
  // /data-product
  dataProduct: {
    ko: {
      heroTitle: '데이터 프로덕트',
      tabGuide: '가이드',
      tabGuideDesc: '데이터 제품 가이드',
    },
    en: {
      heroTitle: 'Data Product',
      tabGuide: 'Guide',
      tabGuideDesc: 'Data product guide',
    },
  },
  // /approvals
  approvalsPage: {
    ko: {
      heroTitle: '승인 워크플로우',
      tabGuide: '가이드',
      tabGuideDesc: '승인 가이드',
    },
    en: {
      heroTitle: 'Approvals Workflow',
      tabGuide: 'Guide',
      tabGuideDesc: 'Approvals guide',
    },
  },
  // /ai-recommend (gCat = global category)
  gCat: {
    ko: {
      finance_label: '금융',
      finance_route: '/finance',
      insurance_label: '보험',
      insurance_route: '/insurance',
      medical_label: '의료',
      medical_route: '/medical',
      legal_label: '법률',
      legal_route: '/legal',
      education_label: '교육',
      education_route: '/education',
      realestate_label: '부동산',
      realestate_route: '/realestate',
    },
    en: {
      finance_label: 'Finance',
      finance_route: '/finance',
      insurance_label: 'Insurance',
      insurance_route: '/insurance',
      medical_label: 'Medical',
      medical_route: '/medical',
      legal_label: 'Legal',
      legal_route: '/legal',
      education_label: 'Education',
      education_route: '/education',
      realestate_label: 'Real Estate',
      realestate_route: '/realestate',
    },
  },
};

// JS object → string 변환 (string 값만, indent 2 spaces, 4-space inner)
function objToJsLines(obj, indent = '    ') {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      lines.push(`${indent}${k}: {`);
      lines.push(...objToJsLines(v, indent + '  '));
      lines.push(`${indent}},`);
    } else {
      const esc = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`${indent}${k}: "${esc}",`);
    }
  }
  return lines;
}

function buildBlock(namespace, values) {
  const lines = [];
  lines.push(`  ${namespace}: {`);
  lines.push(...objToJsLines(values, '    '));
  lines.push(`  },`);
  return lines.join('\n');
}

function injectIntoLocale(filePath, lang) {
  let txt = fs.readFileSync(filePath, 'utf-8');
  const before = txt.length;

  // 종료 패턴: 마지막 root key 의 `}` 다음 빈줄, `};` close. 그 직전에 새 root namespace 들 삽입.
  const closeRx = /\n\}\s*;\s*\n?\s*$/;
  if (!closeRx.test(txt)) {
    console.log(`  ⚠️  ${lang}: close pattern 미발견 — skip`);
    return { added: 0, skipped: true };
  }

  // 이미 정의된 namespace 는 skip
  const blocks = [];
  let addedCount = 0;
  for (const [ns, defs] of Object.entries(FULL_NEW)) {
    // 정확 root level 매칭: 줄 시작 2 spaces + ns + ":"
    const exists = new RegExp(`^  "?${ns}"?\\s*:`, 'm').test(txt);
    if (exists) {
      console.log(`  · ${lang}.${ns} 이미 존재 — skip`);
      continue;
    }
    const values = defs[lang] || defs.en; // 13언어는 영어 fallback
    blocks.push(buildBlock(ns, values));
    addedCount++;
  }

  if (blocks.length === 0) return { added: 0, skipped: false };

  // close `};` 앞에 삽입
  const insertion = '\n  // [175차 S2] missing namespaces — auto-injected\n' + blocks.join('\n') + '\n';
  txt = txt.replace(closeRx, insertion + '\n};\n');

  // BOM 없이 UTF-8 저장
  fs.writeFileSync(filePath, txt, 'utf-8');
  console.log(`  ✅ ${lang}: +${addedCount} namespaces (+${txt.length - before} bytes)`);
  return { added: addedCount, skipped: false };
}

console.log('[175차 S2] i18n FULL_NEW namespace 일괄 추가\n');
const summary = {};
for (const lang of LANGS) {
  const fname = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fpath = path.join(LOCALES_DIR, fname);
  if (!fs.existsSync(fpath)) {
    console.log(`  ❌ ${lang}: 파일 없음 — ${fpath}`);
    continue;
  }
  console.log(`\n[${lang}]`);
  summary[lang] = injectIntoLocale(fpath, lang);
}

console.log('\n=== 요약 ===');
Object.entries(summary).forEach(([lang, r]) => {
  console.log(`  ${lang.padEnd(7)} +${r.added} namespace${r.skipped ? ' (skipped)' : ''}`);
});
