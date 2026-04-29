// Inject CreativeStudio i18n keys
const fs=require('fs'),p=require('path');
const dir=p.resolve(__dirname,'src/i18n/locales');

const koKeys = {
  csTitle:'크리에이티브 스튜디오',csSubtitle:'다양한 플랫폼의 광고 소재를 디자인하고 관리합니다',
  csTabGallery:'갤러리',csTabCreateNew:'새로 만들기',csTabPerformance:'성과 분석',csTabBrandAssets:'브랜드 에셋',
  csKpiCreatives:'소재',csKpiFormats:'포맷',csKpiApproved:'승인됨',csKpiTopCtr:'최고 CTR',
  csFeatMultiFormat:'멀티 포맷 내보내기',csFeatAiCopy:'AI 카피 생성기',csFeatPerfAnalytics:'성과 분석 도구',csFeatBrandCheck:'브랜드 일관성 검사',
  csSystemOk:'시스템 정상 운영 중',
};
const enKeys = {
  csTitle:'Creative Studio',csSubtitle:'Design and manage ad creatives across platforms',
  csTabGallery:'Gallery',csTabCreateNew:'Create New',csTabPerformance:'Performance',csTabBrandAssets:'Brand Assets',
  csKpiCreatives:'Creatives',csKpiFormats:'Formats',csKpiApproved:'Approved',csKpiTopCtr:'Top CTR',
  csFeatMultiFormat:'Multi-format export',csFeatAiCopy:'AI copy generator',csFeatPerfAnalytics:'Performance analytics',csFeatBrandCheck:'Brand consistency check',
  csSystemOk:'System Operational',
};

function inject(lang, keys) {
  const fp = p.join(dir, lang + '.js');
  let src = fs.readFileSync(fp, 'utf8');
  const nsIdx = src.indexOf('"marketing"');
  if (nsIdx < 0) return console.log(lang + ': no marketing');
  const bi = src.indexOf('{', nsIdx);
  let adds = '';
  for (const [k, v] of Object.entries(keys)) {
    const block = src.substring(nsIdx, Math.min(src.length, nsIdx + 30000));
    if (!new RegExp(`"${k}"\\s*:`).test(block)) {
      adds += `\n    "${k}": ${JSON.stringify(v)},`;
    }
  }
  if (adds) {
    src = src.substring(0, bi + 1) + adds + src.substring(bi + 1);
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`✅ ${lang}: ${adds.split('\n').length - 1} keys`);
  } else {
    console.log(`⏭ ${lang}: exists`);
  }
}

inject('ko', koKeys);
inject('en', enKeys);
console.log('Done!');
