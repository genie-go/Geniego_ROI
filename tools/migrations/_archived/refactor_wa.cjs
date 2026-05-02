const fs = require('fs');
const fpath = 'frontend/src/pages/WhatsApp.jsx';
let c = fs.readFileSync(fpath, 'utf8');

const replacements = [
  // Tabs
  ["{ id: 'overview', label: '📊 현황' }", "{ id: 'overview', label: t('wa.tabOverview', '📊 Overview') }"],
  ["{ id: 'send', label: '📤 Send' }", "{ id: 'send', label: t('wa.tabSend', '📤 Send') }"],
  ["{ id: 'broadcast', label: '📡 일괄 Send' }", "{ id: 'broadcast', label: t('wa.tabBroadcast', '📡 Broadcast') }"],
  ["{ id: 'templates', label: '📋 템플릿' }", "{ id: 'templates', label: t('wa.tabTemplates', '📋 Templates') }"],
  ["{ id: 'history', label: '📜 Send History' }", "{ id: 'history', label: t('wa.tabHistory', '📜 History') }"],
  ["{ id: 'settings', label: '⚙️ Auth Settings' }", "{ id: 'settings', label: t('wa.tabSettings', '⚙️ Auth Settings') }"],
  
  // Hero
  [">Auth키 Register 즉시 실Integration · 템플릿 Message · 일괄 Send · Send History Management<", ">{t('wa.heroDesc', 'Instant integration · Template messaging · Broadcast · Send history')}<"],
  
  // Status tags
  ["'○ 미Connect'", "t('wa.notConnected','Not Connected')"],
  
  // Overview tab
  [">Approval된 템플릿 ({templates.length}개)<", ">{t('wa.approvedTemplates','Approved Templates')} ({templates.length})<"],
  [">📋 Message 템플릿<", ">{t('wa.messageTemplates','Message Templates')}<"],
  [">📜 Send History<", ">{t('wa.sendHistory','Send History')}<"],
  
  // Send panel
  [">📤 Message Send<", ">{t('wa.tabSend','📤 Send')}<"],
  [">Count신 번호 (국제형식)<", ">{t('wa.sendTo','Recipient Number')}<"],
  [">템플릿 Select<", ">{t('wa.selectTemplate','Select Template')}<"],
  [">직접 입력<", ">{t('wa.directInput','Direct Input')}<"],
  [">Message 내용<", ">{t('wa.messageContent','Message Content')}<"],
  
  // Broadcast panel
  [">📡 일괄 Send (Broadcast)<", ">{t('wa.broadcast','📡 Broadcast')}<"],
  [">Count신 번호 List (줄바꿈으로 구분, Max 200개)<", ">{t('wa.numberList','Number List (newline separated, max 200)')}<"],
  [">템플릿<", ">{t('wa.template','Template')}<"],
  
  // Table headers
  [">Count신번호<", ">{t('wa.recipientNo','Recipient')}<"],
  [">내용 미리보기<", ">{t('wa.contentPreview','Content Preview')}<"],
  [">SendTime<", ">{t('wa.sendTime','Sent At')}<"],
  [">Count신Confirm<", ">{t('wa.delivered','Delivered')}<"],
  
  // Auth panel button
  ["'💾 Save + 즉시 Connect Test'", "('💾 ' + t('wa.saveConnect','Save + Test Connection'))"],
  
  // Broadcast button
  ["'📡 일괄 Send Start'", "('📡 ' + t('wa.startBroadcast','Start Broadcast'))"],
  
  // Template content fallback
  ["'템플릿 내용'", "t('wa.templateContent','Template Content')"],
  
  // Message placeholder
  ["placeholder=\"Message를 입력하세요...\"", "placeholder={t('wa.messagePlaceholder','Enter your message...')}"],
];

let count = 0;
for (const [from, to] of replacements) {
  if (c.includes(from)) {
    c = c.replace(from, to);
    count++;
  }
}

// Number count
c = c.replace("{numbers.split('\\n').filter(Boolean).length}개 번호", "{numbers.split('\\n').filter(Boolean).length} {t('wa.numberCount','numbers')}");
count++;

// Get Started
c = c.replace(">Start하기:</strong>", ">{t('wa.getStarted','Get Started:')}</strong>");
count++;

c = c.replace("Meta Business Suite에서 Phone Number ID와 Access Token을 Copy하여 ⚙️ Auth Settings에 입력하면 즉시 Integration됩니다.", "{t('wa.getStartedDesc','Enter Phone Number ID and Access Token from Meta Business Suite in Auth Settings.')}");
count++;

fs.writeFileSync(fpath, c, 'utf8');
console.log('WhatsApp.jsx: ' + count + ' replacements applied');
