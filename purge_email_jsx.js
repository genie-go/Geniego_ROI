const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/EmailMarketing.jsx', 'utf8');

// 1. Permanently remove the `isDemo` logic block
const isDemoStart = c.indexOf('{/* : Virtual Data 직접 렌더 */}');
const isDemoMid = c.indexOf(') : (', isDemoStart);
if (isDemoStart > 0 && isDemoMid > 0) {
    // Delete from isDemoStart to the end of `) : (` which is just before `<>`
    const textToRemove = c.slice(isDemoStart, isDemoMid + 5);
    c = c.replace(textToRemove, '');
    
    // Also remove the closing `)}` at the end of the component
    const endTplTabs = c.lastIndexOf(')}');
    c = c.slice(0, endTplTabs) + c.slice(endTplTabs + 2);

    // And remove `const isDemo = false;`
    c = c.replace(/const isDemo = false;\n\s*/g, '');
}

// 2. Fix the untranslated strings in SettingsTab
c = c.replace(/\"발신 Email\"/g, 't("crm.email.fromEmail")');
c = c.replace(/\"Sender명\"/g, 't("crm.email.fromName")');
c = c.replace(/\"AWS 리전\"/g, 't("crm.email.awsRegion")');
c = c.replace(/💡 Mock 모드:\s*실제 Email을 Send하지 않고 DB에만 기록됩니다\.\s*실제 Send을 원하면 SMTP 또는 AWS SES를 Select하세요\./g, '{t("crm.email.mockMode")}');
c = c.replace(/\"✅ Save in progress\.\.\.\"/g, 't("crm.email.saving")');

// 3. Fix TemplatesTab
c = c.replace(/\"Delete하시겠습니까\?\"/g, 't("crm.email.msgDelConfirm")');
c = c.replace(/name: \"\", subject: \"\", html_body: `<h2>안녕하세요 \{\{name\}\}님,<\/h2>\\n<p>내용을 입력하세요\.<\/p>`, category: \"general\"/g, 
              'name: "", subject: "", html_body: t("crm.email.htmlFallback"), category: "general"');
c = c.replace(/\+ 새 Template/g, '{t("crm.email.tplNew")}');
c = c.replace(/\"새 Template 작성\"/g, 't("crm.email.tplCreate")');
c = c.replace(/\"Template Edit\"/g, 't("crm.email.tplEdit")');
c = c.replace(/\"웰컴\"/g, 't("crm.email.catWelcome")');
c = c.replace(/\"Pro모션\"/g, 't("crm.email.catPromo")');
c = c.replace(/\"장바구니 이탈\"/g, 't("crm.email.catAbandon")');
c = c.replace(/\"재구매 유도\"/g, 't("crm.email.catRepurchase")');
c = c.replace(/\"Template Name\*\"/g, 't("crm.email.tfName")');
c = c.replace(/\"Category\"/g, 't("crm.email.tfCat")');
c = c.replace(/\"Subject\*\"/g, 't("crm.email.tfSubj")');
c = c.replace(/HTML Body\* \(변Count: \{\"\{\{name\}\}\"\} 사용 가능\)/g, '{t("crm.email.tfBody")}');
c = c.replace(/\"\{\{name\}\}님, 특per 혜택을 Confirm하세요!\"/g, 't("crm.email.subjPh")');
c = c.replace(/\"Template Save\"/g, 't("crm.email.btnTplSave")');
c = c.replace(/\"Edit Save\"/g, 't("crm.email.btnEditSave")');

// 4. Fix CampaignsTab
c = c.replace(/\"Send하시겠습니까\?\"/g, 't("crm.email.msgSendConfirm")');
c = c.replace(/캠페인 생성/g, '{t("crm.email.btnCreate")}');

// 5. Fix AI Generate Fallbacks
c = c.replace(/'🔥 ' \+ \(product \|\| 'Product'\) \+ ' 지금 구매하면 특per 혜택!'/g, "t('crm.email.aiSubj1', { product })");
c = c.replace(/'⏰ ' \+ \(product \|\| 'Product'\) \+ ' 한정 특가 마감 임박'/g, "t('crm.email.aiSubj2', { product })");
c = c.replace(/'\[' \+ \(product \|\| 'Product'\) \+ '\] 당신을 위한 맞춤 제안'/g, "t('crm.email.aiSubj3', { product })");
c = c.replace(/'지금 Confirm하지 않으면 놓치는 기회!'/g, "t('crm.email.aiPrev')");
c = c.replace(/'안녕하세요, \{\{Customer명\}\}님 👋'/g, "t('crm.email.aiGreet')");
c = c.replace(/\(product \|\| 'Product'\) \+ '을 찾고 계셨나요\?\\n\\n저희가 특per히 준비한 혜택을 Confirm해보세요\. 기존 Customer님들께서 Average 4\.8점을 주신 제품을 지금 가장 좋은 조건으로 만나보실 Count 있습니다\.'/g, "t('crm.email.aiMain', { product })");
c = c.replace(/'지금 바로 Confirm하기 →'/g, "t('crm.email.aiCta')");
c = c.replace(/'P\.S\. 이 혜택은 48Time 한정입니다\. 서두르세요! ⏰'/g, "t('crm.email.aiPs')");
c = c.replace(/'💡 ' \+ \(product \|\| 'Product'\) \+ ' Today만 특가!'/g, "t('crm.email.aiA_subj', { product })");
c = c.replace(/'특가 Confirm하기'/g, "t('crm.email.aiA_cta')");
c = c.replace(/\(product \|\| 'Product'\) \+ ' Customer 후기 98%가 만족한 이유'/g, "t('crm.email.aiB_subj', { product })");
c = c.replace(/'후기 보러가기'/g, "t('crm.email.aiB_cta')");

// Fix generic AI texts inside the UI itself that have strange Korean
c = c.replace(/Claude API Key 없이도 AI 샘플 Email을 Create할 Count 있습니다\./g, '{t("crm.email.aiDesc")}');
c = c.replace(/'Product\/서비스명'/g, "t('crm.email.aiProd')");
c = c.replace(/'대상 Customer'/g, "t('crm.email.aiAud')");
c = c.replace(/'친근하고 전문적'/g, "t('crm.email.aiTonePh')");
c = c.replace(/'Pro모션 \(Select\)'/g, "t('crm.email.aiPromo')");
c = c.replace(/'✨ Create 결과'/g, "t('crm.email.aiResTitle')");
c = c.replace(/Subject 후보 \(3개\)/g, "{t('crm.email.aiSubjCands')}");
c = c.replace(/title=\"Clicks 시 Copy\"/g, "title={t('crm.email.aiCopy')}");
c = c.replace(/📧 Body 미리보기/g, "{t('crm.email.aiPreview')}");
c = c.replace(/'A 변형'/g, "t('crm.email.aiVarA')");
c = c.replace(/'B 변형'/g, "t('crm.email.aiVarB')");
c = c.replace(/Left에서 조건을 입력하고<br \/>AI Create Button을 Clicks하세요/g, "{t('crm.email.aiInputPrompt')}");
c = c.replace(/API Key 없이도 샘플 Email을<br \/>즉시 Create합니다/g, "{t('crm.email.aiNoKeyDesc')}");
c = c.replace(/Claude AI가 Subject 3가지 \+ Body \+ A\/B 변형을<br \/>Auto으로 작성합니다/g, "{t('crm.email.aiAutoDesc')}");
c = c.replace(/🔑 Claude API Key \(Select — 없으면  Create\)/g, "{t('crm.email.aiKeyPrompt')}");
c = c.replace(/'✅ Save됨'/g, "t('crm.email.aiKeySaved')");
c = c.replace(/'Save'/g, "t('crm.email.aiKeySave')");
c = c.replace(/🤖 AI Email Create 조건 입력/g, "{t('crm.email.aiCondPrompt')}");
c = c.replace(/'🇰🇷 한국어'/g, "t('crm.email.aiLangKo')");
c = c.replace(/'🇨🇳 中文'/g, "t('crm.email.aiLangZh')");
c = c.replace(/'🇯🇵 日本語'/g, "t('crm.email.aiLangJa')");

// Also there is a CRM Segment label
c = c.replace(/🔗 CRM Segment Integration Campaign/g, "{t('crm.email.crmLinked')}");
c = c.replace(/전송Done/g, "{t('crm.email.sSent')}");
c = c.replace(/Send예정/g, "{t('crm.email.sSched')}");
c = c.replace(/초안/g, "{t('crm.email.sDraft')}");

// Also some random placeholders
c = c.replace(/'ex\. 에어팟 Pro Max'/g, "t('crm.email.aiProdPh')");
c = c.replace(/'ex\. 구매 Conversion'/g, "t('crm.email.aiGoalPh')");
c = c.replace(/'ex\. VIP Customer'/g, "t('crm.email.aiAudPh')");

fs.writeFileSync('frontend/src/pages/EmailMarketing.jsx', c, 'utf8');
console.log('EmailMarketing.jsx successfully purged of Korean syntax errors and demo blocks!');
