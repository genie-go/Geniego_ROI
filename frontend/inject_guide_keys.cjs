// Inject 15-step guide i18n keys into ko.js
const fs=require('fs'),p=require('path');
const dir=p.resolve(__dirname,'src/i18n/locales');

const guideKeys = {
  guideFullTitle: '📋 시작부터 마무리까지 — 완전 가이드',
  guideFullSub: 'AI 마케팅 자동화 플랫폼의 전체 워크플로우를 단계별로 안내합니다.',
  guidePhaseA: 'Phase A — 시작 준비',
  guidePhaseB: 'Phase B — 캠페인 설계',
  guidePhaseC: 'Phase C — AI 전략 & 소재 생성',
  guidePhaseD: 'Phase D — 실행 & 모니터링',
  guidePhaseE: 'Phase E — 최적화 & 마무리',
  gf1Title: '로그인 & 환경 확인', gf1Desc: '플랫폼에 로그인한 후, 좌측 사이드바에서 "AI 마케팅 → 자동화 전략" 메뉴를 클릭합니다. Production/Demo 환경을 확인하세요.',
  gf2Title: 'API 채널 연동', gf2Desc: '연동 허브(Integration Hub)에서 Meta, Google, Naver 등 광고 채널 API Key를 등록합니다. 연동된 채널만 캠페인에 사용 가능합니다.',
  gf3Title: '대시보드 현황 파악', gf3Desc: '홈 대시보드에서 현재 KPI, 활성 캠페인 수, 채널별 ROAS를 확인합니다. 이 데이터가 AI 추천의 기반이 됩니다.',
  gf4Title: '월 예산 설정', gf4Desc: '"② 캠페인 설정" 탭에서 월 광고 예산을 선택하거나 직접 입력합니다. 예산 구간에 따라 AI가 최적 채널을 자동 추천합니다.',
  gf5Title: '상품 카테고리 선택', gf5Desc: '뷰티, 패션, 식품 등 11개 카테고리 중 해당하는 항목을 선택합니다. 복수 선택 시 교차 분석으로 정밀도가 높아집니다.',
  gf6Title: '광고 채널 선택', gf6Desc: 'AI가 카테고리+예산을 분석하여 최적 채널 조합을 추천합니다. 직접 채널을 추가/제거할 수도 있습니다.',
  gf7Title: '타겟 & 기간 설정', gf7Desc: '캠페인명, 집행 기간(월/분기/반기), 타겟 오디언스를 설정합니다. AI가 채널별 최적 타겟팅을 자동 제안합니다.',
  gf8Title: 'AI 전략 시뮬레이션', gf8Desc: '"AI 전략 생성" 버튼을 클릭하면 AI가 채널별 예산 배분, 예상 노출/클릭/전환/ROAS를 자동 계산합니다.',
  gf9Title: '크리에이티브 소재 제작', gf9Desc: '"① 캠페인 설정" 탭의 Creative Studio에서 AI가 채널별 최적 광고 소재를 자동 생성합니다. 텍스트, 이미지, 영상 포맷을 지원합니다.',
  gf10Title: '전략 미리보기 & 수정', gf10Desc: '"③ AI 전략 미리보기" 탭에서 채널별 배분액, 예상 KPI를 확인합니다. 슬라이더로 배분 비율을 직접 조정할 수 있습니다.',
  gf11Title: '관리자 승인 제출', gf11Desc: '전략을 확정하면 "승인 요청" 버튼을 클릭합니다. 관리자 승인 모달에서 예산, ROAS, 채널을 최종 확인 후 제출합니다.',
  gf12Title: '캠페인 매니저 모니터링', gf12Desc: '제출된 캠페인은 "캠페인 관리" 페이지에서 실시간 추적됩니다. 상태(대기/승인/활성/일시정지)를 모니터링합니다.',
  gf13Title: 'AI 자동 최적화', gf13Desc: 'AI가 실시간 데이터를 분석하여 성과가 낮은 채널의 예산을 성과 높은 채널로 자동 재배분합니다.',
  gf14Title: '성과 리포트 분석', gf14Desc: '캠페인 종료 후 채널별 ROAS, CPA, CTR 등 핵심 지표를 분석합니다. AI가 다음 캠페인을 위한 개선 포인트를 제안합니다.',
  gf15Title: '다음 캠페인 반복', gf15Desc: '분석 결과를 바탕으로 예산/카테고리/채널을 조정하여 새 캠페인을 생성합니다. 반복할수록 AI 학습이 강화됩니다.',
  guideTabGuideName: '📖 이용 가이드',
  guideTabGuideDesc: '플랫폼 사용법과 전체 워크플로우를 단계별로 안내합니다.',
  guideTip6: 'AI 추천 채널과 직접 선택 채널을 비교하여 최적 조합을 찾으세요.',
  guideTip7: '캠페인 실행 전 반드시 관리자 승인을 거치면 예산 초과를 방지할 수 있습니다.',
};

// Inject into ko.js
const fp = p.join(dir, 'ko.js');
let src = fs.readFileSync(fp, 'utf8');
const nsIdx = src.indexOf('"marketing"');
if (nsIdx < 0) { console.log('marketing namespace not found'); process.exit(1); }
const braceIdx = src.indexOf('{', nsIdx);
let additions = '';
for (const [k, v] of Object.entries(guideKeys)) {
  const pat = new RegExp(`"${k}"\\s*:`);
  const block = src.substring(nsIdx, Math.min(src.length, nsIdx + 30000));
  if (!pat.test(block)) {
    additions += `\n    "${k}": ${JSON.stringify(v)},`;
  }
}
if (additions) {
  src = src.substring(0, braceIdx + 1) + additions + src.substring(braceIdx + 1);
  fs.writeFileSync(fp, src, 'utf8');
  console.log(`✅ ko.js: ${additions.split('\n').length - 1} keys added`);
} else {
  console.log('⏭ ko.js: all keys exist');
}

// Also inject into en.js
const enKeys = {
  guideFullTitle: '📋 Complete Guide — From Start to Finish',
  guideFullSub: 'Step-by-step guide to the full AI Marketing Automation workflow.',
  guidePhaseA: 'Phase A — Getting Started',
  guidePhaseB: 'Phase B — Campaign Design',
  guidePhaseC: 'Phase C — AI Strategy & Creative',
  guidePhaseD: 'Phase D — Execution & Monitoring',
  guidePhaseE: 'Phase E — Optimization & Wrap-up',
  gf1Title: 'Login & Environment Check', gf1Desc: 'Log in and navigate to "AI Marketing → Auto Strategy" from the sidebar. Verify your Production/Demo environment.',
  gf2Title: 'Connect API Channels', gf2Desc: 'Register API Keys for Meta, Google, Naver, etc. in the Integration Hub. Only connected channels can be used in campaigns.',
  gf3Title: 'Review Dashboard KPIs', gf3Desc: 'Check current KPIs, active campaigns, and channel ROAS on the Home Dashboard. This data powers AI recommendations.',
  gf4Title: 'Set Monthly Budget', gf4Desc: 'In the "② Campaign Setup" tab, select or enter your monthly ad budget. AI optimizes channel recommendations based on your budget tier.',
  gf5Title: 'Select Product Categories', gf5Desc: 'Choose from 11 categories (Beauty, Fashion, Food, etc.). Multi-select enables cross-analysis for higher precision.',
  gf6Title: 'Choose Ad Channels', gf6Desc: 'AI recommends optimal channel combinations based on category + budget analysis. You can manually add or remove channels.',
  gf7Title: 'Set Target & Period', gf7Desc: 'Configure campaign name, execution period (monthly/quarterly/semi-annual), and target audience. AI suggests optimal targeting per channel.',
  gf8Title: 'AI Strategy Simulation', gf8Desc: 'Click "Generate AI Strategy" to auto-calculate per-channel budget allocation, estimated impressions, clicks, conversions, and ROAS.',
  gf9Title: 'Create Ad Creatives', gf9Desc: 'In the "① Creative Studio" tab, AI auto-generates optimized ad creatives per channel. Supports text, image, and video formats.',
  gf10Title: 'Preview & Adjust Strategy', gf10Desc: 'In the "③ AI Preview" tab, review per-channel allocations and estimated KPIs. Use sliders to manually adjust allocation ratios.',
  gf11Title: 'Submit for Approval', gf11Desc: 'Finalize your strategy and click "Request Approval." Review budget, ROAS, and channels in the approval modal before submitting.',
  gf12Title: 'Monitor in Campaign Manager', gf12Desc: 'Submitted campaigns are tracked in real-time on the Campaign Manager page. Monitor status (pending/approved/active/paused).',
  gf13Title: 'AI Auto-Optimization', gf13Desc: 'AI analyzes real-time data and automatically reallocates budget from underperforming channels to high-performing ones.',
  gf14Title: 'Analyze Performance Reports', gf14Desc: 'After campaign completion, analyze per-channel ROAS, CPA, CTR, and other key metrics. AI suggests improvements for next campaigns.',
  gf15Title: 'Iterate Next Campaign', gf15Desc: 'Based on analysis results, adjust budget/categories/channels to create a new campaign. AI learning improves with each iteration.',
  guideTabGuideName: '📖 User Guide',
  guideTabGuideDesc: 'Step-by-step guide to platform features and complete workflow.',
  guideTip6: 'Compare AI-recommended channels with manual selections to find the optimal mix.',
  guideTip7: 'Always submit for manager approval before execution to prevent budget overruns.',
};

const fpEn = p.join(dir, 'en.js');
let srcEn = fs.readFileSync(fpEn, 'utf8');
const nsIdxEn = srcEn.indexOf('"marketing"');
if (nsIdxEn < 0) { console.log('en: marketing not found'); process.exit(1); }
const braceIdxEn = srcEn.indexOf('{', nsIdxEn);
let additionsEn = '';
for (const [k, v] of Object.entries(enKeys)) {
  const block = srcEn.substring(nsIdxEn, Math.min(srcEn.length, nsIdxEn + 30000));
  if (!new RegExp(`"${k}"\\s*:`).test(block)) {
    additionsEn += `\n    "${k}": ${JSON.stringify(v)},`;
  }
}
if (additionsEn) {
  srcEn = srcEn.substring(0, braceIdxEn + 1) + additionsEn + srcEn.substring(braceIdxEn + 1);
  fs.writeFileSync(fpEn, srcEn, 'utf8');
  console.log(`✅ en.js: ${additionsEn.split('\n').length - 1} keys added`);
} else {
  console.log('⏭ en.js: all keys exist');
}

console.log('Done!');
