const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');

const smartConnectKeys = {
  ko: {
    "sc.heroTitle": "SmartConnect — API 키 자동화 허브",
    "sc.heroDesc": "가입된 모든 채널의 API 키를 자동으로 스캔·감지·등록·연동합니다. 키가 없는 채널은 자동으로 발급신청할 수 있습니다.",
    "sc.scanning": "스캔 중...",
    "sc.scanDone": "스캔 완료",
    "sc.scanAll": "전체 자동 스캔",
    "sc.autoSyncAll": "감지된 키 전체 자동 연동",
    "sc.apiKeyMgmt": "API 키 관리 페이지",
    "sc.kpiAll": "전체 채널",
    "sc.kpiRegistered": "키 등록 완료",
    "sc.kpiFound": "키 감지됨",
    "sc.kpiLinked": "연동 활성",
    "sc.kpiMissing": "키 없음",
    "sc.kpiApplied": "발급 신청",
    "sc.kpiUnscanned": "미스캔",
    "sc.kpiAutoAvail": "자동 가능",
    "sc.filterAll": "전체",
    "sc.filterRegistered": "등록완료",
    "sc.filterFound": "감지됨",
    "sc.filterLinked": "연동중",
    "sc.filterMissing": "키없음",
    "sc.filterApplied": "신청중",
    "sc.autoIssueAvail": "자동발급 가능",
    "sc.linking": "연동 중...",
    "sc.autoSync": "자동 연동",
    "sc.run": "실행",
    "sc.linkedActive": "연동 활성",
    "sc.applying": "신청 중...",
    "sc.oauthConnect": "OAuth 연결",
    "sc.applyIssue": "발급 신청",
    "sc.appliedDone": "발급 신청 완료",
    "sc.preScan": "스캔 전",
    "sc.statusRegistered": "등록됨",
    "sc.statusFound": "키 감지",
    "sc.statusMissing": "키 없음",
    "sc.statusApplied": "신청완료",
    "sc.statusApplying": "신청중",
    "sc.statusScanning": "스캔중",
    "sc.statusUnscanned": "미스캔",
    "sc.guideTitle": "자동 획득 불가 채널 — API 키 발급 방법 안내",
    "sc.guideDesc": "개 채널은 사용자 직접 동의/발급이 필요합니다",
    "sc.collapse": "접기",
    "sc.expand": "열기",
    "sc.oauthRequired": "OAuth 2.0 로그인 필요 채널",
    "sc.oauthGuide": "아래 채널은 사용자가 직접 해당 플랫폼에 로그인하여 권한 동의를 해야 합니다.",
    "sc.oauthReason": "Geniego-ROI가 자동으로 토큰을 가져올 수 없는 이유: 개인정보보호법 및 각 플랫폼의 보안 정책상 서드파티가 사용자 자격증명을 직접 보관·전달하는 것이 금지되어 있습니다.",
    "sc.oauthSolution": "해결 방법",
    "sc.oauthStep1": "아래 채널의 \"OAuth Connect\" 버튼을 클릭 → 새 창에서 해당 플랫폼 로그인",
    "sc.oauthStep2": "권한 동의 화면에서 \"Allow\" 클릭 → 자동으로 Access Token 수신",
    "sc.oauthStep3": "Geniego-ROI가 Token을 암호화 저장하고 자동 연동 실행",
    "sc.devConsole": "개발자 콘솔",
    "sc.manualRequired": "판매자센터 직접 발급 필요 채널",
    "sc.manualGuide": "아래 채널은 각 플랫폼의 판매자센터/개발자센터에서 API 키를 직접 복사해야 합니다.",
    "sc.manualGuide2": "\"발급 신청\" 버튼을 클릭하면 Geniego-ROI가 신청을 대신 처리하고 키를 이메일로 수신합니다.",
    "sc.apply": "신청",
    "sc.issueGuide": "발급 방법",
    "sc.autoIssue": "자동 발급 가능",
    "sc.manualAcquire": "수동 획득 필요",
    "sc.activatedFeatures": "연동 시 활성화 기능",
    "sc.openDevConsole": "개발자 콘솔 열기",
    "sc.autoSyncRun": "자동 연동 실행",
    "sc.scanNotif": "API 키 스캔 완료",
    "sc.scanNotifBody": "개 채널 분석 완료 — 개 키 감지",
    "sc.syncNotif": "자동 연동 완료",
    "sc.syncNotifBody": "기능이 활성화되었습니다.",
    "sc.issueNotif": "발급 신청 완료",
    "sc.issueNotifBody": "1~3 영업일 후 이메일로 키가 발송됩니다.",
  },
  en: {
    "sc.heroTitle": "SmartConnect — API Key Automation Hub",
    "sc.heroDesc": "Automatically scan, detect, register, and integrate API keys for all your connected channels. Missing keys can be auto-requested.",
    "sc.scanning": "Scanning...",
    "sc.scanDone": "Scan Complete",
    "sc.scanAll": "Full Auto Scan",
    "sc.autoSyncAll": "Auto Sync Detected Keys",
    "sc.apiKeyMgmt": "API Key Management",
    "sc.kpiAll": "All Channels",
    "sc.kpiRegistered": "Registered",
    "sc.kpiFound": "Detected",
    "sc.kpiLinked": "Linked",
    "sc.kpiMissing": "Missing",
    "sc.kpiApplied": "Applied",
    "sc.kpiUnscanned": "Unscanned",
    "sc.kpiAutoAvail": "Auto Available",
    "sc.filterAll": "All",
    "sc.filterRegistered": "Registered",
    "sc.filterFound": "Detected",
    "sc.filterLinked": "Linked",
    "sc.filterMissing": "Missing",
    "sc.filterApplied": "Applied",
    "sc.autoIssueAvail": "Auto Issue Available",
    "sc.linking": "Linking...",
    "sc.autoSync": "Auto Sync",
    "sc.run": "Run",
    "sc.linkedActive": "Linked Active",
    "sc.applying": "Applying...",
    "sc.oauthConnect": "OAuth Connect",
    "sc.applyIssue": "Request Key",
    "sc.appliedDone": "Request Submitted",
    "sc.preScan": "Not Scanned",
    "sc.statusRegistered": "Registered",
    "sc.statusFound": "Key Detected",
    "sc.statusMissing": "No Key",
    "sc.statusApplied": "Requested",
    "sc.statusApplying": "Requesting",
    "sc.statusScanning": "Scanning",
    "sc.statusUnscanned": "Unscanned",
    "sc.guideTitle": "Channels Requiring Manual Setup — API Key Guide",
    "sc.guideDesc": "channels require manual authorization/issuance",
    "sc.collapse": "Collapse",
    "sc.expand": "Expand",
    "sc.oauthRequired": "Channels Requiring OAuth 2.0 Login",
    "sc.oauthGuide": "These channels require you to log in directly to the platform and grant permission.",
    "sc.oauthReason": "Why Geniego-ROI cannot fetch tokens automatically: Privacy regulations and platform security policies prohibit third parties from directly handling user credentials.",
    "sc.oauthSolution": "Solution",
    "sc.oauthStep1": "Click the 'OAuth Connect' button → Log in on the platform in a new window",
    "sc.oauthStep2": "Click 'Allow' on the permission screen → Access Token received automatically",
    "sc.oauthStep3": "Geniego-ROI encrypts and stores the token, then runs auto sync",
    "sc.devConsole": "Dev Console",
    "sc.manualRequired": "Channels Requiring Manual Key Issuance",
    "sc.manualGuide": "These channels require you to copy the API key directly from the seller/developer center.",
    "sc.manualGuide2": "Click 'Request Key' and Geniego-ROI will process the request and send the key via email.",
    "sc.apply": "Apply",
    "sc.issueGuide": "How to Get Key",
    "sc.autoIssue": "Auto Issue Available",
    "sc.manualAcquire": "Manual Setup Required",
    "sc.activatedFeatures": "Features Activated on Integration",
    "sc.openDevConsole": "Open Dev Console",
    "sc.autoSyncRun": "Run Auto Sync",
    "sc.scanNotif": "API Key Scan Complete",
    "sc.scanNotifBody": "channels analyzed — keys detected",
    "sc.syncNotif": "Auto Sync Complete",
    "sc.syncNotifBody": "Features have been activated.",
    "sc.issueNotif": "Key Request Submitted",
    "sc.issueNotifBody": "Key will be sent via email within 1-3 business days.",
  },
  ja: {
    "sc.heroTitle": "SmartConnect — APIキー自動化ハブ",
    "sc.heroDesc": "接続された全チャネルのAPIキーを自動でスキャン・検出・登録・連携します。",
    "sc.scanning": "スキャン中...",
    "sc.scanDone": "スキャン完了",
    "sc.scanAll": "全自動スキャン",
    "sc.autoSyncAll": "検出されたキーを全自動連携",
    "sc.apiKeyMgmt": "APIキー管理",
    "sc.kpiAll": "全チャネル",
    "sc.kpiRegistered": "登録済み",
    "sc.kpiFound": "検出済み",
    "sc.kpiLinked": "連携中",
    "sc.kpiMissing": "キーなし",
    "sc.kpiApplied": "申請済み",
    "sc.kpiUnscanned": "未スキャン",
    "sc.kpiAutoAvail": "自動可能",
    "sc.filterAll": "全て",
    "sc.filterRegistered": "登録済み",
    "sc.filterFound": "検出済み",
    "sc.filterLinked": "連携中",
    "sc.filterMissing": "キーなし",
    "sc.filterApplied": "申請中",
    "sc.autoIssueAvail": "自動発行可能",
    "sc.linking": "連携中...",
    "sc.autoSync": "自動連携",
    "sc.linkedActive": "連携アクティブ",
    "sc.devConsole": "開発者コンソール",
  },
};

// WhatsApp keys
const whatsappKeys = {
  ko: {
    "wa.sendTo": "수신 번호 (국제형식)",
    "wa.selectTemplate": "템플릿 선택",
    "wa.directInput": "직접 입력",
    "wa.messageContent": "메시지 내용",
    "wa.messagePlaceholder": "메시지를 입력하세요...",
    "wa.templateContent": "템플릿 내용",
    "wa.broadcast": "일괄 발송 (Broadcast)",
    "wa.numberList": "수신 번호 목록 (줄바꿈으로 구분, 최대 200개)",
    "wa.numberCount": "개 번호",
    "wa.template": "템플릿",
    "wa.startBroadcast": "일괄 발송 시작",
    "wa.broadcastDone": "완료",
    "wa.saveConnect": "저장 + 즉시 연결 테스트",
    "wa.tabOverview": "📊 현황",
    "wa.tabSend": "📤 발송",
    "wa.tabBroadcast": "📡 일괄 발송",
    "wa.tabTemplates": "📋 템플릿",
    "wa.tabHistory": "📜 발송 이력",
    "wa.tabSettings": "⚙️ 인증 설정",
    "wa.heroDesc": "인증키 등록 즉시 실연동 · 템플릿 메시지 · 일괄 발송 · 발송 이력 관리",
    "wa.notConnected": "미연결",
    "wa.getStarted": "시작하기:",
    "wa.getStartedDesc": "Meta Business Suite에서 Phone Number ID와 Access Token을 복사하여 ⚙️ 인증 설정에 입력하면 즉시 연동됩니다.",
    "wa.approvedTemplates": "승인된 템플릿",
    "wa.messageTemplates": "메시지 템플릿",
    "wa.contentPreview": "내용 미리보기",
    "wa.sendHistory": "발송 이력",
    "wa.recipientNo": "수신번호",
    "wa.sendTime": "발송시간",
    "wa.delivered": "수신확인",
  },
  en: {
    "wa.sendTo": "Recipient Number (International)",
    "wa.selectTemplate": "Select Template",
    "wa.directInput": "Direct Input",
    "wa.messageContent": "Message Content",
    "wa.messagePlaceholder": "Enter your message...",
    "wa.templateContent": "Template Content",
    "wa.broadcast": "Broadcast",
    "wa.numberList": "Number List (newline separated, max 200)",
    "wa.numberCount": "numbers",
    "wa.template": "Template",
    "wa.startBroadcast": "Start Broadcast",
    "wa.broadcastDone": "Complete",
    "wa.saveConnect": "Save + Test Connection",
    "wa.tabOverview": "📊 Overview",
    "wa.tabSend": "📤 Send",
    "wa.tabBroadcast": "📡 Broadcast",
    "wa.tabTemplates": "📋 Templates",
    "wa.tabHistory": "📜 History",
    "wa.tabSettings": "⚙️ Auth Settings",
    "wa.heroDesc": "Instant integration · Template messaging · Broadcast · Send history",
    "wa.notConnected": "Not Connected",
    "wa.getStarted": "Get Started:",
    "wa.getStartedDesc": "Enter your Phone Number ID and Access Token from Meta Business Suite in ⚙️ Auth Settings to connect instantly.",
    "wa.approvedTemplates": "Approved Templates",
    "wa.messageTemplates": "Message Templates",
    "wa.contentPreview": "Content Preview",
    "wa.sendHistory": "Send History",
    "wa.recipientNo": "Recipient",
    "wa.sendTime": "Sent At",
    "wa.delivered": "Delivered",
  },
  ja: {
    "wa.sendTo": "受信番号（国際形式）",
    "wa.selectTemplate": "テンプレート選択",
    "wa.directInput": "直接入力",
    "wa.messageContent": "メッセージ内容",
    "wa.messagePlaceholder": "メッセージを入力...",
    "wa.templateContent": "テンプレート内容",
    "wa.broadcast": "一括送信",
    "wa.numberList": "番号リスト（改行区切り、最大200件）",
    "wa.numberCount": "件の番号",
    "wa.template": "テンプレート",
    "wa.startBroadcast": "一括送信開始",
    "wa.broadcastDone": "完了",
    "wa.saveConnect": "保存 + 即時接続テスト",
    "wa.tabOverview": "📊 概要",
    "wa.tabSend": "📤 送信",
    "wa.tabBroadcast": "📡 一括送信",
    "wa.tabTemplates": "📋 テンプレート",
    "wa.tabHistory": "📜 送信履歴",
    "wa.tabSettings": "⚙️ 認証設定",
  },
};

const otherLangs = ['zh','zh-TW','de','th','vi','id','es','fr','pt','ru','ar','hi'];
const langs = ['ko','en','ja', ...otherLangs];

langs.forEach(lang => {
  const fpath = path.join(DIR, lang + '.js');
  if (!fs.existsSync(fpath)) return;
  let c = fs.readFileSync(fpath, 'utf8');

  let injected = 0;
  
  // Inject SmartConnect keys
  if (!c.includes('"sc":')) {
    const keys = smartConnectKeys[lang] || smartConnectKeys['en'];
    const entries = Object.entries(keys).map(([k, v]) => {
      const shortKey = k.replace('sc.', '');
      return `    "${shortKey}": "${v.replace(/"/g, '\\"')}"`;
    }).join(',\n');
    const block = `  "sc": {\n${entries}\n  },`;
    const lastBrace = c.lastIndexOf('};');
    if (lastBrace > -1) {
      c = c.substring(0, lastBrace) + block + '\n' + c.substring(lastBrace);
      injected += Object.keys(keys).length;
    }
  }

  // Inject WhatsApp keys
  if (!c.includes('"wa":')) {
    const keys = whatsappKeys[lang] || whatsappKeys['en'];
    const entries = Object.entries(keys).map(([k, v]) => {
      const shortKey = k.replace('wa.', '');
      return `    "${shortKey}": "${v.replace(/"/g, '\\"')}"`;
    }).join(',\n');
    const block = `  "wa": {\n${entries}\n  },`;
    const lastBrace = c.lastIndexOf('};');
    if (lastBrace > -1) {
      c = c.substring(0, lastBrace) + block + '\n' + c.substring(lastBrace);
      injected += Object.keys(keys).length;
    }
  }

  if (injected > 0) {
    fs.writeFileSync(fpath, c, 'utf8');
    console.log(`${lang}: injected ${injected} sc+wa keys`);
  } else {
    console.log(`${lang}: sc/wa already exist`);
  }
});
