const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'src/i18n/locales');
const emailKo={
title:"📧 이메일 마케팅",subTitle:"캠페인 생성 · 템플릿 관리 · 분석 — 통합 이메일 마케팅 시스템",
tabCamp:"🚀 캠페인",tabTpl:"📝 템플릿",tabAnalytics:"📊 분석",tabCreative:"🎨 크리에이티브",tabSettings:"⚙️ 설정",tabGuide:"📖 이용 가이드",
noChannels:"연결된 이메일 채널이 없습니다. 연동허브에서 API 키를 등록하세요.",goHub:"연동허브로 이동",connectedChannels:"연결된 채널",
secLockTitle:"보안 경고",secLockDesc:"비정상적인 접근이 감지되어 차단되었습니다.",dismiss:"확인",
liveSyncStatus:"실시간 크로스탭 동기화 활성",syncNow:"지금 동기화",
setTitle:"이메일 발송 설정",lblProvider:"발송 서비스",lblSmtpHost:"SMTP 호스트",lblSmtpPort:"SMTP 포트",lblSmtpUser:"SMTP 사용자",lblPassword:"비밀번호",fromEmail:"발신 이메일",fromName:"발신자 이름",awsRegion:"AWS 리전",
aiSetSaved:"설정이 저장되었습니다",saving:"저장 중...",setSaveBtn:"💾 설정 저장",
tplNew:"새 템플릿",tplCreate:"템플릿 만들기",tplEdit:"템플릿 편집",lblTplName:"템플릿 이름",lblCategory:"카테고리",lblSubject:"제목",subjPh:"제목을 입력하세요...",tfBody:"HTML 본문",
catGeneral:"일반",catWelcome:"환영",catPromo:"프로모션",catRetention:"리텐션",catTxn:"트랜잭션",
noTemplates:"아직 템플릿이 없습니다. 새로 만들어보세요.",btnTplSave:"💾 템플릿 저장",btnEditSave:"💾 변경 저장",saved:"저장됨",msgDelConfirm:"삭제하시겠습니까?",
cNew:"새 캠페인",fName:"캠페인명*",fTpl:"템플릿",fTarget:"타깃 세그먼트",optSel:"-- 선택 --",optAll:"전체",
kpiTotal:"총 캠페인",kpiSent:"발송됨",kpiEmails:"총 발송 수",kpiOpen:"평균 오픈율",kpiClick:"평균 클릭율",
msgCampDone:"캠페인이 생성되었습니다!",msgSendConfirm:"이 캠페인을 전체 대상에게 발송하시겠습니까?",msgSendDone:"발송 완료!",
btnCreate:"🚀 캠페인 생성",btnSending:"발송 중...",btnSend:"발송",
cStat:"캠페인 현황",colName:"캠페인명",colTpl:"템플릿",colTarget:"세그먼트",colSent:"발송",colOpen:"오픈율",colClick:"클릭율",colStatus:"상태",colAction:"액션",
emptyCamp:"아직 캠페인이 없습니다. 위에서 첫 캠페인을 생성하세요.",
anTotalSent:"총 발송",anOpenRate:"오픈율",anClickRate:"클릭율",anDelivery:"도달율",anSegPerf:"세그먼트별 성과",anNoData:"아직 분석할 발송 데이터가 없습니다.",anCamps:"캠페인 수",
guideTitle:"이메일 마케팅 이용 가이드",guideSub:"이메일 캠페인 생성부터 분석, 템플릿 관리, 발송 설정까지 단계별로 상세히 안내합니다.",
guideStepsTitle:"활용 단계",
guideStep1Title:"1단계: 발송 설정 구성",guideStep1Desc:"설정 탭에서 SMTP 또는 AWS SES 발송 서비스를 선택하고 호스트, 포트, 인증 정보를 입력합니다.",
guideStep2Title:"2단계: 발신자 정보 설정",guideStep2Desc:"발신 이메일 주소와 발신자 이름을 설정합니다. 수신자에게 표시되는 정보입니다.",
guideStep3Title:"3단계: 템플릿 만들기",guideStep3Desc:"템플릿 탭에서 카테고리를 선택하고 제목, HTML 본문을 작성하여 재사용 가능한 이메일 템플릿을 생성합니다.",
guideStep4Title:"4단계: 템플릿 테스트",guideStep4Desc:"작성한 템플릿이 올바르게 렌더링되는지 미리보기로 확인하고 필요시 수정합니다.",
guideStep5Title:"5단계: 대상 세그먼트 확인",guideStep5Desc:"CRM 고객 관리에서 설정한 세그먼트를 확인하고 캠페인 대상 그룹을 선정합니다.",
guideStep6Title:"6단계: 캠페인 생성",guideStep6Desc:"캠페인 탭에서 캠페인명, 템플릿, 타깃 세그먼트를 선택하고 '캠페인 생성' 버튼을 클릭합니다.",
guideStep7Title:"7단계: 캠페인 발송",guideStep7Desc:"생성된 캠페인의 '발송' 버튼을 클릭하여 선택한 세그먼트의 전체 고객에게 이메일을 발송합니다.",
guideStep8Title:"8단계: 발송 결과 확인",guideStep8Desc:"캠페인 현황 테이블에서 발송 수, 오픈율, 클릭율, 상태를 실시간으로 모니터링합니다.",
guideStep9Title:"9단계: 분석 탭 활용",guideStep9Desc:"분석 탭에서 전체 발송 데이터의 오픈율, 클릭율, 도달율을 종합적으로 확인합니다.",
guideStep10Title:"10단계: 세그먼트별 성과 분석",guideStep10Desc:"분석 탭의 세그먼트별 성과에서 어떤 고객 그룹이 가장 반응이 좋은지 파악합니다.",
guideStep11Title:"11단계: 크리에이티브 관리",guideStep11Desc:"크리에이티브 탭에서 이메일 디자인 에셋을 관리하고 효과를 분석합니다.",
guideStep12Title:"12단계: A/B 테스트 활용",guideStep12Desc:"동일 세그먼트에 다른 제목이나 본문의 캠페인을 생성하여 어떤 버전이 더 효과적인지 비교합니다.",
guideStep13Title:"13단계: 캠페인 최적화",guideStep13Desc:"분석 데이터를 기반으로 발송 시간, 제목, 본문을 개선하여 캠페인 효과를 극대화합니다.",
guideStep14Title:"14단계: CSV 데이터 활용",guideStep14Desc:"캠페인 결과를 CSV로 내보내어 외부 분석 도구에서 심층 분석을 수행합니다.",
guideStep15Title:"15단계: 지속적 운영 및 개선",guideStep15Desc:"정기적으로 캠페인을 운영하고 분석 결과를 반영하여 이메일 마케팅 ROI를 지속적으로 향상시킵니다.",
guideTabsTitle:"탭별 안내",guideCampName:"캠페인 관리",guideCampDesc:"이메일 캠페인 생성, 발송, 성과 테이블 관리.",guideTplName:"템플릿 관리",guideTplDesc:"이메일 템플릿 생성, 편집, 카테고리 분류.",guideAnalyticsName:"분석",guideAnalyticsDesc:"오픈율, 클릭율, 도달율 종합 분석 및 세그먼트별 성과 비교.",guideCreativeName:"🎨 크리에이티브",guideCreativeDesc:"이메일 디자인 에셋 관리 및 효과 분석.",guideSetName:"설정",guideSetDesc:"SMTP/AWS SES 발송 서비스 구성 및 발신자 정보 설정.",
guideTipsTitle:"전문가 팁",
guideTip1:"제목은 30자 이내로 핵심 메시지를 전달하면 오픈율이 크게 향상됩니다.",
guideTip2:"발송 전 반드시 테스트 이메일을 보내 디자인과 링크를 확인하세요.",
guideTip3:"세그먼트별로 맞춤 메시지를 보내면 클릭율이 2~3배 증가합니다.",
guideTip4:"골든타임(오전 10시~오후 2시) 발송 시 오픈율이 가장 높습니다.",
guideTip5:"CRM 데이터와 연동하여 고객 행동 기반 자동 이메일을 설정하세요.",
guideTip6:"구독 취소 링크는 반드시 포함해야 스팸 필터를 통과합니다.",
guideTip7:"A/B 테스트를 정기적으로 실행하여 최적의 제목과 본문을 찾으세요.",
};
// Inject into ko.js
const koPath=path.join(dir,'ko.js');
let koSrc=fs.readFileSync(koPath,'utf8');
const kStr=JSON.stringify(emailKo);
if(koSrc.includes('"email"'))koSrc=koSrc.replace(/"email":\{[^}]*(?:\{[^}]*\}[^}]*)*\}/,`"email":${kStr}`);
else{const i=koSrc.lastIndexOf('}');koSrc=koSrc.slice(0,i)+`,"email":${kStr}`+koSrc.slice(i);}
fs.writeFileSync(koPath,koSrc);
console.log('✅ ko:', Object.keys(emailKo).length, 'keys');

// English
const emailEn={
title:"📧 Email Marketing",subTitle:"Campaign · Template · Analytics — Unified Email Marketing System",
tabCamp:"🚀 Campaigns",tabTpl:"📝 Templates",tabAnalytics:"📊 Analytics",tabCreative:"🎨 Creative",tabSettings:"⚙️ Settings",tabGuide:"📖 Usage Guide",
noChannels:"No email channels connected. Register API keys in the Integration Hub.",goHub:"Go to Integration Hub",connectedChannels:"Connected Channels",
secLockTitle:"Security Alert",secLockDesc:"Abnormal access detected and blocked.",dismiss:"Confirm",
liveSyncStatus:"Real-time cross-tab sync active",syncNow:"Sync Now",
setTitle:"Email Provider Settings",lblProvider:"Provider",lblSmtpHost:"SMTP Host",lblSmtpPort:"SMTP Port",lblSmtpUser:"SMTP User",lblPassword:"Password",fromEmail:"From Email",fromName:"From Name",awsRegion:"AWS Region",
aiSetSaved:"Settings saved",saving:"Saving...",setSaveBtn:"💾 Save Settings",
tplNew:"New Template",tplCreate:"Create Template",tplEdit:"Edit Template",lblTplName:"Template Name",lblCategory:"Category",lblSubject:"Subject Line",subjPh:"Enter subject...",tfBody:"HTML Body",
catGeneral:"General",catWelcome:"Welcome",catPromo:"Promotion",catRetention:"Retention",catTxn:"Transactional",
noTemplates:"No templates yet. Create one to get started.",btnTplSave:"💾 Save Template",btnEditSave:"💾 Save Changes",saved:"Saved",msgDelConfirm:"Delete this template?",
cNew:"New Campaign",fName:"Campaign Name*",fTpl:"Template",fTarget:"Target Segment",optSel:"-- Select --",optAll:"All",
kpiTotal:"Total Campaigns",kpiSent:"Sent",kpiEmails:"Total Emails",kpiOpen:"Avg Open%",kpiClick:"Avg Click%",
msgCampDone:"Campaign created!",msgSendConfirm:"Send this campaign to all targets?",msgSendDone:"Sent successfully!",
btnCreate:"🚀 Create Campaign",btnSending:"Sending...",btnSend:"Send",
cStat:"Campaign Status",colName:"Name",colTpl:"Template",colTarget:"Segment",colSent:"Sent",colOpen:"Open%",colClick:"Click%",colStatus:"Status",colAction:"Action",
emptyCamp:"No campaigns yet. Create your first campaign above.",
anTotalSent:"Total Sent",anOpenRate:"Open Rate",anClickRate:"Click Rate",anDelivery:"Delivery Rate",anSegPerf:"Performance by Segment",anNoData:"No sent campaigns to analyze yet.",anCamps:"Campaigns",
guideTitle:"Email Marketing Guide",guideSub:"Step-by-step guide from creating email campaigns to analytics, template management, and delivery settings.",
guideStepsTitle:"Usage Steps",
guideStep1Title:"Step 1: Configure Delivery",guideStep1Desc:"Select SMTP or AWS SES in Settings and enter host, port, and auth credentials.",
guideStep2Title:"Step 2: Set Sender Info",guideStep2Desc:"Configure sender email and display name shown to recipients.",
guideStep3Title:"Step 3: Create Templates",guideStep3Desc:"Create reusable email templates with category, subject, and HTML body.",
guideStep4Title:"Step 4: Test Templates",guideStep4Desc:"Preview templates to verify rendering and fix any issues.",
guideStep5Title:"Step 5: Review Segments",guideStep5Desc:"Check CRM segments to select the right target audience.",
guideStep6Title:"Step 6: Create Campaign",guideStep6Desc:"Set campaign name, template, and target segment, then click Create.",
guideStep7Title:"Step 7: Send Campaign",guideStep7Desc:"Click Send to deliver emails to all contacts in the selected segment.",
guideStep8Title:"Step 8: Monitor Results",guideStep8Desc:"Track sent count, open rate, click rate, and status in real-time.",
guideStep9Title:"Step 9: Use Analytics",guideStep9Desc:"Review comprehensive open rate, click rate, and delivery metrics.",
guideStep10Title:"Step 10: Segment Analysis",guideStep10Desc:"Identify which customer segments respond best to your campaigns.",
guideStep11Title:"Step 11: Manage Creatives",guideStep11Desc:"Manage email design assets and analyze their effectiveness.",
guideStep12Title:"Step 12: A/B Testing",guideStep12Desc:"Create variant campaigns to compare subject lines and content.",
guideStep13Title:"Step 13: Optimize Campaigns",guideStep13Desc:"Use analytics data to improve send timing, subjects, and content.",
guideStep14Title:"Step 14: Export Data",guideStep14Desc:"Export campaign results to CSV for deeper external analysis.",
guideStep15Title:"Step 15: Continuous Improvement",guideStep15Desc:"Run campaigns regularly and apply insights to continuously improve ROI.",
guideTabsTitle:"Tab Guide",guideCampName:"Campaigns",guideCampDesc:"Create, send, and manage email campaign performance.",guideTplName:"Templates",guideTplDesc:"Create and edit reusable email templates by category.",guideAnalyticsName:"Analytics",guideAnalyticsDesc:"Comprehensive open, click, delivery rate analysis.",guideCreativeName:"🎨 Creative",guideCreativeDesc:"Manage email design assets and effectiveness.",guideSetName:"Settings",guideSetDesc:"Configure SMTP/AWS SES delivery and sender info.",
guideTipsTitle:"Expert Tips",
guideTip1:"Keep subject lines under 30 characters for higher open rates.",
guideTip2:"Always send a test email before launching to check design and links.",
guideTip3:"Segmented messages increase click rates by 2-3x.",
guideTip4:"Send during golden hours (10AM-2PM) for highest open rates.",
guideTip5:"Integrate CRM data for behavior-based automated emails.",
guideTip6:"Always include an unsubscribe link to pass spam filters.",
guideTip7:"Run A/B tests regularly to find optimal subject lines and content.",
};
const enPath=path.join(dir,'en.js');
let enSrc=fs.readFileSync(enPath,'utf8');
const eStr=JSON.stringify(emailEn);
if(enSrc.includes('"email"'))enSrc=enSrc.replace(/"email":\{[^}]*(?:\{[^}]*\}[^}]*)*\}/,`"email":${eStr}`);
else{const i=enSrc.lastIndexOf('}');enSrc=enSrc.slice(0,i)+`,"email":${eStr}`+enSrc.slice(i);}
fs.writeFileSync(enPath,enSrc);
console.log('✅ en:', Object.keys(emailEn).length, 'keys');
