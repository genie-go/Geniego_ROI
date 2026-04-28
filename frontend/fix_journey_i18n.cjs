const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');

// Build NESTED journey object per language
const journeyNested = {
  ko: {
    pageTitle:"고객여정 빌더",pageSub:"이메일·카카오·LINE·SMS·WhatsApp 다채널 자동화 · A/B 테스트 · 실시간 연동",
    tabList:"내 여정 목록",tabAnalytics:"분석 대시보드",
    myJourneys:"내 여정 목록",newJourney:"+ 새 여정 만들기",cancel:"취소",
    journeyName:"여정 이름",journeyNamePh:"예: 신규 고객 환영 여정",
    triggerEvent:"트리거 이벤트",create:"생성",copy:"복사본",
    noJourneys:"여정이 없습니다. 새 여정을 만들어 보세요!",
    statusActive:"활성",statusPaused:"일시중지",statusDraft:"초안",
    trigger:"트리거",entered:"진입",completed:"완료",active:"활성",
    scheduled:"예약됨",lastUpdated:"최종 수정",
    edit:"편집",clone:"복제",delete:"삭제",confirmDelete:"이 여정을 삭제하시겠습니까?",
    backToList:"← 목록으로",save:"저장",saving:"저장 중...",
    nodeSettings:"노드 설정",clickToEdit:"노드를 클릭하여 편집하세요",
    nodeName:"노드 이름",triggerType:"트리거 유형",selectSegment:"세그먼트 선택",
    emailSubject:"이메일 제목",emailSubjectPh:"제목을 입력하세요",
    emailFrom:"발신자 이름",emailSenderPh:"발신자 이름을 입력하세요",
    emailTestSend:"테스트 발송",kakaoTemplate:"템플릿 코드",
    kakaoMsgType:"메시지 유형",kakaoAlimtalk:"알림톡",kakaoFriendtalk:"친구톡",
    kakaoTest:"테스트 발송",lineTemplate:"템플릿 코드",
    lineMsgType:"메시지 유형",lineMsgText:"텍스트",lineMsgFlex:"Flex 메시지",lineMsgTemplate:"템플릿",
    lineTestSend:"테스트 발송",waTemplate:"템플릿 이름",waLang:"언어 코드",
    igMessage:"DM 메시지",igMessagePh:"Instagram DM 메시지를 입력하세요",
    smsMessage:"SMS 메시지",smsMessagePh:"SMS 메시지를 입력하세요",
    webhookUrl:"Webhook URL",webhookMethod:"HTTP 메서드",
    pushTitle:"푸시 알림 제목",pushBody:"푸시 알림 내용",
    popupTemplate:"팝업 템플릿",popupTemplatePh:"팝업 템플릿 ID를 입력하세요",
    delayTime:"대기 시간",delayUnit:"시간 단위",minutes:"분",hours:"시간",days:"일",
    conditionField:"조건 필드",
    conditionEmailClicked:"이메일 클릭 여부",conditionEmailOpened:"이메일 열람 여부",
    conditionPurchased:"구매 여부",conditionLtvGt:"LTV 이상",
    conditionKakaoClicked:"카카오 클릭 여부",conditionLineClicked:"LINE 클릭 여부",
    conditionPageVisited:"페이지 방문 여부",conditionCartValueGt:"장바구니 금액 이상",
    abGroupA:"A 그룹 비율 (%)",abGroupB:"B 그룹",
    deleteNode:"노드 삭제",channelNotConnected:"연동허브에서 채널을 연결하세요",
    execLog:"실행 로그",connectedChannels:"연동된 채널",recentTriggers:"최근 트리거",
    emailSendSim:"이메일 발송 시뮬레이션: {{count}}명",
    kakaoSendSim:"카카오 발송 시뮬레이션: {{count}}명",
    lineSendSim:"LINE 발송 시뮬레이션: {{count}}명",
    analyticsEntered:"총 진입자",analyticsCompleted:"완료",analyticsActive:"현재 활성",analyticsConvRate:"전환율",
    noAnalyticsData:"분석 데이터가 없습니다",journeyPerformance:"여정별 성과",
    colName:"여정 이름",colStatus:"상태",colEntered:"진입",colCompleted:"완료",
    colActive:"활성",colConvRate:"전환율",colTrigger:"트리거",
    nodeTypes:{trigger:"트리거",email:"이메일",sms:"SMS",delay:"대기",condition:"조건 분기",ab_test:"A/B 테스트",tag:"태그",webhook:"웹훅",push:"푸시 알림",popup:"웹 팝업",end:"종료",kakao:"카카오톡",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"회원 가입",purchase:"구매 완료",cart_abandoned:"장바구니 이탈",churned:"이탈 위험",segment_entered:"세그먼트 진입",birthday:"생일",manual:"수동 실행",event:"커스텀 이벤트",webhook_trigger:"웹훅 트리거"}
  },
  en: {
    pageTitle:"Customer Journey Builder",pageSub:"Email · Kakao · LINE · SMS · WhatsApp Multi-channel Automation · A/B Testing · Real-time Integration",
    tabList:"My Journeys",tabAnalytics:"Analytics Dashboard",
    myJourneys:"My Journeys",newJourney:"+ New Journey",cancel:"Cancel",
    journeyName:"Journey Name",journeyNamePh:"e.g. New Customer Welcome Journey",
    triggerEvent:"Trigger Event",create:"Create",copy:"Copy",
    noJourneys:"No journeys yet. Create your first journey!",
    statusActive:"Active",statusPaused:"Paused",statusDraft:"Draft",
    trigger:"Trigger",entered:"Entered",completed:"Completed",active:"Active",
    scheduled:"Scheduled",lastUpdated:"Last Updated",
    edit:"Edit",clone:"Clone",delete:"Delete",confirmDelete:"Are you sure you want to delete this journey?",
    backToList:"← Back to List",save:"Save",saving:"Saving...",
    nodeSettings:"Node Settings",clickToEdit:"Click a node to edit",
    nodeName:"Node Name",triggerType:"Trigger Type",selectSegment:"Select Segment",
    emailSubject:"Email Subject",emailSubjectPh:"Enter subject line",
    emailFrom:"Sender Name",emailSenderPh:"Enter sender name",
    emailTestSend:"Test Send",kakaoTemplate:"Template Code",
    kakaoMsgType:"Message Type",kakaoAlimtalk:"Alimtalk",kakaoFriendtalk:"Friendtalk",
    kakaoTest:"Test Send",lineTemplate:"Template Code",
    lineMsgType:"Message Type",lineMsgText:"Text",lineMsgFlex:"Flex Message",lineMsgTemplate:"Template",
    lineTestSend:"Test Send",waTemplate:"Template Name",waLang:"Language Code",
    igMessage:"DM Message",igMessagePh:"Enter Instagram DM message",
    smsMessage:"SMS Message",smsMessagePh:"Enter SMS message",
    webhookUrl:"Webhook URL",webhookMethod:"HTTP Method",
    pushTitle:"Push Notification Title",pushBody:"Push Notification Body",
    popupTemplate:"Popup Template",popupTemplatePh:"Enter popup template ID",
    delayTime:"Wait Time",delayUnit:"Time Unit",minutes:"Minutes",hours:"Hours",days:"Days",
    conditionField:"Condition Field",
    conditionEmailClicked:"Email Clicked",conditionEmailOpened:"Email Opened",
    conditionPurchased:"Purchased",conditionLtvGt:"LTV Greater Than",
    conditionKakaoClicked:"Kakao Clicked",conditionLineClicked:"LINE Clicked",
    conditionPageVisited:"Page Visited",conditionCartValueGt:"Cart Value Greater Than",
    abGroupA:"Group A Ratio (%)",abGroupB:"Group B",
    deleteNode:"Delete Node",channelNotConnected:"Connect channel in Integration Hub",
    execLog:"Execution Log",connectedChannels:"Connected Channels",recentTriggers:"Recent Triggers",
    emailSendSim:"Email send simulation: {{count}} recipients",
    kakaoSendSim:"Kakao send simulation: {{count}} recipients",
    lineSendSim:"LINE send simulation: {{count}} recipients",
    analyticsEntered:"Total Entered",analyticsCompleted:"Completed",analyticsActive:"Currently Active",analyticsConvRate:"Conversion Rate",
    noAnalyticsData:"No analytics data available",journeyPerformance:"Journey Performance",
    colName:"Journey Name",colStatus:"Status",colEntered:"Entered",colCompleted:"Completed",
    colActive:"Active",colConvRate:"Conv. Rate",colTrigger:"Trigger",
    nodeTypes:{trigger:"Trigger",email:"Email",sms:"SMS",delay:"Delay",condition:"Condition",ab_test:"A/B Test",tag:"Tag",webhook:"Webhook",push:"Push Notification",popup:"Web Popup",end:"End",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"Sign Up",purchase:"Purchase",cart_abandoned:"Cart Abandoned",churned:"Churned",segment_entered:"Segment Entered",birthday:"Birthday",manual:"Manual",event:"Custom Event",webhook_trigger:"Webhook Trigger"}
  },
  ja: {
    pageTitle:"カスタマージャーニービルダー",pageSub:"メール・カカオ・LINE・SMS・WhatsApp マルチチャネル自動化 · A/Bテスト · リアルタイム連携",
    tabList:"ジャーニー一覧",tabAnalytics:"分析ダッシュボード",myJourneys:"マイジャーニー",newJourney:"+ 新規ジャーニー",cancel:"キャンセル",
    journeyName:"ジャーニー名",journeyNamePh:"例：新規顧客ウェルカムジャーニー",triggerEvent:"トリガーイベント",create:"作成",copy:"コピー",
    noJourneys:"ジャーニーがありません。新しいジャーニーを作成しましょう！",
    statusActive:"アクティブ",statusPaused:"一時停止",statusDraft:"下書き",trigger:"トリガー",entered:"進入",completed:"完了",active:"アクティブ",
    scheduled:"予約済み",lastUpdated:"最終更新",edit:"編集",clone:"複製",delete:"削除",confirmDelete:"このジャーニーを削除しますか？",
    backToList:"← 一覧に戻る",save:"保存",saving:"保存中...",nodeSettings:"ノード設定",clickToEdit:"ノードをクリックして編集",
    nodeName:"ノード名",triggerType:"トリガータイプ",selectSegment:"セグメントを選択",
    emailSubject:"メール件名",emailSubjectPh:"件名を入力",emailFrom:"送信者名",emailSenderPh:"送信者名を入力",
    emailTestSend:"テスト送信",kakaoTemplate:"テンプレートコード",kakaoMsgType:"メッセージタイプ",kakaoAlimtalk:"アリムトーク",kakaoFriendtalk:"フレンドトーク",
    kakaoTest:"テスト送信",lineTemplate:"テンプレートコード",lineMsgType:"メッセージタイプ",lineMsgText:"テキスト",lineMsgFlex:"Flexメッセージ",lineMsgTemplate:"テンプレート",
    lineTestSend:"テスト送信",waTemplate:"テンプレート名",waLang:"言語コード",
    igMessage:"DMメッセージ",igMessagePh:"Instagram DMメッセージを入力",smsMessage:"SMSメッセージ",smsMessagePh:"SMSメッセージを入力",
    webhookUrl:"Webhook URL",webhookMethod:"HTTPメソッド",pushTitle:"プッシュ通知タイトル",pushBody:"プッシュ通知内容",
    popupTemplate:"ポップアップテンプレート",popupTemplatePh:"テンプレートIDを入力",
    delayTime:"待機時間",delayUnit:"時間単位",minutes:"分",hours:"時間",days:"日",
    conditionField:"条件フィールド",conditionEmailClicked:"メールクリック",conditionEmailOpened:"メール開封",conditionPurchased:"購入",conditionLtvGt:"LTV以上",
    conditionKakaoClicked:"カカオクリック",conditionLineClicked:"LINEクリック",conditionPageVisited:"ページ訪問",conditionCartValueGt:"カート金額以上",
    abGroupA:"Aグループ比率 (%)",abGroupB:"Bグループ",deleteNode:"ノードを削除",channelNotConnected:"連携ハブでチャネルを接続してください",
    execLog:"実行ログ",connectedChannels:"接続済みチャネル",recentTriggers:"最近のトリガー",
    emailSendSim:"メール送信シミュレーション: {{count}}名",kakaoSendSim:"カカオ送信シミュレーション: {{count}}名",lineSendSim:"LINE送信シミュレーション: {{count}}名",
    analyticsEntered:"総進入者",analyticsCompleted:"完了",analyticsActive:"現在アクティブ",analyticsConvRate:"コンバージョン率",
    noAnalyticsData:"分析データがありません",journeyPerformance:"ジャーニー別パフォーマンス",
    colName:"ジャーニー名",colStatus:"ステータス",colEntered:"進入",colCompleted:"完了",colActive:"アクティブ",colConvRate:"CVR",colTrigger:"トリガー",
    nodeTypes:{trigger:"トリガー",email:"メール",sms:"SMS",delay:"待機",condition:"条件分岐",ab_test:"A/Bテスト",tag:"タグ",webhook:"Webhook",push:"プッシュ通知",popup:"ウェブポップアップ",end:"終了",kakao:"カカオトーク",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"会員登録",purchase:"購入完了",cart_abandoned:"カート離脱",churned:"離脱リスク",segment_entered:"セグメント進入",birthday:"誕生日",manual:"手動実行",event:"カスタムイベント",webhook_trigger:"Webhookトリガー"}
  },
  zh: {
    pageTitle:"客户旅程构建器",pageSub:"邮件·KakaoTalk·LINE·短信·WhatsApp 多渠道自动化 · A/B测试 · 实时集成",
    tabList:"我的旅程",tabAnalytics:"分析仪表板",myJourneys:"我的旅程",newJourney:"+ 创建新旅程",cancel:"取消",
    journeyName:"旅程名称",journeyNamePh:"例：新客户欢迎旅程",triggerEvent:"触发事件",create:"创建",copy:"副本",
    noJourneys:"暂无旅程。创建您的第一个旅程！",statusActive:"活跃",statusPaused:"已暂停",statusDraft:"草稿",
    trigger:"触发器",entered:"进入",completed:"完成",active:"活跃",scheduled:"已预约",lastUpdated:"最后更新",
    edit:"编辑",clone:"克隆",delete:"删除",confirmDelete:"确定要删除此旅程吗？",
    backToList:"← 返回列表",save:"保存",saving:"保存中...",nodeSettings:"节点设置",clickToEdit:"点击节点进行编辑",
    nodeName:"节点名称",triggerType:"触发类型",selectSegment:"选择细分",
    emailSubject:"邮件主题",emailSubjectPh:"输入主题",emailFrom:"发件人",emailSenderPh:"输入发件人名称",
    emailTestSend:"测试发送",kakaoTemplate:"模板代码",kakaoMsgType:"消息类型",kakaoAlimtalk:"通知消息",kakaoFriendtalk:"好友消息",
    kakaoTest:"测试发送",lineTemplate:"模板代码",lineMsgType:"消息类型",lineMsgText:"文本",lineMsgFlex:"Flex消息",lineMsgTemplate:"模板",
    lineTestSend:"测试发送",waTemplate:"模板名称",waLang:"语言代码",
    igMessage:"DM消息",igMessagePh:"输入Instagram DM消息",smsMessage:"短信消息",smsMessagePh:"输入短信内容",
    webhookUrl:"Webhook URL",webhookMethod:"HTTP方法",pushTitle:"推送通知标题",pushBody:"推送通知内容",
    popupTemplate:"弹窗模板",popupTemplatePh:"输入弹窗模板ID",
    delayTime:"等待时间",delayUnit:"时间单位",minutes:"分钟",hours:"小时",days:"天",
    conditionField:"条件字段",conditionEmailClicked:"邮件已点击",conditionEmailOpened:"邮件已打开",conditionPurchased:"已购买",conditionLtvGt:"LTV大于",
    conditionKakaoClicked:"KakaoTalk已点击",conditionLineClicked:"LINE已点击",conditionPageVisited:"页面已访问",conditionCartValueGt:"购物车金额大于",
    abGroupA:"A组比例 (%)",abGroupB:"B组",deleteNode:"删除节点",channelNotConnected:"请在集成中心连接渠道",
    execLog:"执行日志",connectedChannels:"已连接渠道",recentTriggers:"最近触发",
    emailSendSim:"邮件发送模拟：{{count}}人",kakaoSendSim:"KakaoTalk发送模拟：{{count}}人",lineSendSim:"LINE发送模拟：{{count}}人",
    analyticsEntered:"总进入",analyticsCompleted:"已完成",analyticsActive:"当前活跃",analyticsConvRate:"转化率",
    noAnalyticsData:"暂无分析数据",journeyPerformance:"旅程绩效",
    colName:"旅程名称",colStatus:"状态",colEntered:"进入",colCompleted:"完成",colActive:"活跃",colConvRate:"转化率",colTrigger:"触发器",
    nodeTypes:{trigger:"触发器",email:"邮件",sms:"短信",delay:"等待",condition:"条件",ab_test:"A/B测试",tag:"标签",webhook:"Webhook",push:"推送通知",popup:"网页弹窗",end:"结束",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"注册",purchase:"购买",cart_abandoned:"购物车放弃",churned:"流失风险",segment_entered:"进入细分",birthday:"生日",manual:"手动",event:"自定义事件",webhook_trigger:"Webhook触发"}
  },
};

// Copy zh to zh-TW/de/th/vi/id with lang-specific overrides
journeyNested["zh-TW"] = {...journeyNested.zh, pageTitle:"客戶旅程建構器",pageSub:"電郵·KakaoTalk·LINE·簡訊·WhatsApp 多通路自動化 · A/B測試 · 即時整合",tabList:"我的旅程",tabAnalytics:"分析儀表板",newJourney:"+ 建立新旅程",create:"建立",noJourneys:"尚無旅程。建立您的第一個旅程！",statusActive:"啟用",statusDraft:"草稿",backToList:"← 返回列表",save:"儲存",saving:"儲存中...",nodeSettings:"節點設定",clickToEdit:"點擊節點進行編輯",deleteNode:"刪除節點",
    nodeTypes:{trigger:"觸發器",email:"電郵",sms:"簡訊",delay:"等待",condition:"條件",ab_test:"A/B測試",tag:"標籤",webhook:"Webhook",push:"推播通知",popup:"網頁彈窗",end:"結束",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"註冊",purchase:"購買",cart_abandoned:"購物車放棄",churned:"流失風險",segment_entered:"進入區隔",birthday:"生日",manual:"手動",event:"自訂事件",webhook_trigger:"Webhook觸發"}};
journeyNested.de = {...journeyNested.en, pageTitle:"Customer Journey Builder",pageSub:"E-Mail · KakaoTalk · LINE · SMS · WhatsApp Multi-Kanal-Automatisierung · A/B-Test · Echtzeit-Integration",tabList:"Meine Journeys",tabAnalytics:"Analyse-Dashboard",myJourneys:"Meine Journeys",newJourney:"+ Neue Journey",cancel:"Abbrechen",create:"Erstellen",copy:"Kopie",noJourneys:"Keine Journeys vorhanden. Erstellen Sie Ihre erste Journey!",statusActive:"Aktiv",statusPaused:"Pausiert",statusDraft:"Entwurf",edit:"Bearbeiten",clone:"Duplizieren",delete:"Löschen",save:"Speichern",saving:"Speichern...",backToList:"← Zurück zur Liste",nodeSettings:"Knoten-Einstellungen",deleteNode:"Knoten löschen",
    nodeTypes:{trigger:"Trigger",email:"E-Mail",sms:"SMS",delay:"Warten",condition:"Bedingung",ab_test:"A/B-Test",tag:"Tag",webhook:"Webhook",push:"Push-Benachrichtigung",popup:"Web-Popup",end:"Ende",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"Registrierung",purchase:"Kauf",cart_abandoned:"Warenkorb abgebrochen",churned:"Abwanderungsrisiko",segment_entered:"Segment eingetreten",birthday:"Geburtstag",manual:"Manuell",event:"Benutzerdefiniertes Ereignis",webhook_trigger:"Webhook-Trigger"}};
journeyNested.th = {...journeyNested.en, pageTitle:"ตัวสร้างเส้นทางลูกค้า",tabList:"รายการเส้นทาง",tabAnalytics:"แดชบอร์ดวิเคราะห์",myJourneys:"เส้นทางของฉัน",newJourney:"+ สร้างเส้นทางใหม่",cancel:"ยกเลิก",create:"สร้าง",noJourneys:"ยังไม่มีเส้นทาง สร้างเส้นทางแรกของคุณ!",statusActive:"ใช้งาน",statusPaused:"หยุดชั่วคราว",statusDraft:"แบบร่าง",edit:"แก้ไข",save:"บันทึก",saving:"กำลังบันทึก...",backToList:"← กลับไปรายการ",deleteNode:"ลบโหนด",
    nodeTypes:{trigger:"ทริกเกอร์",email:"อีเมล",sms:"SMS",delay:"รอ",condition:"เงื่อนไข",ab_test:"A/B Test",tag:"แท็ก",webhook:"Webhook",push:"แจ้งเตือน Push",popup:"ป๊อปอัปเว็บ",end:"สิ้นสุด",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"สมัครสมาชิก",purchase:"ซื้อ",cart_abandoned:"ตะกร้าถูกละทิ้ง",churned:"เสี่ยงออก",segment_entered:"เข้าเซ็กเมนต์",birthday:"วันเกิด",manual:"ด้วยตนเอง",event:"เหตุการณ์กำหนดเอง",webhook_trigger:"Webhook Trigger"}};
journeyNested.vi = {...journeyNested.en, pageTitle:"Trình tạo hành trình khách hàng",tabList:"Danh sách hành trình",tabAnalytics:"Bảng phân tích",myJourneys:"Hành trình của tôi",newJourney:"+ Tạo hành trình mới",cancel:"Hủy",create:"Tạo",noJourneys:"Chưa có hành trình nào. Tạo hành trình đầu tiên!",statusActive:"Hoạt động",statusPaused:"Tạm dừng",statusDraft:"Bản nháp",edit:"Sửa",save:"Lưu",saving:"Đang lưu...",backToList:"← Quay lại danh sách",deleteNode:"Xóa nút",
    nodeTypes:{trigger:"Kích hoạt",email:"Email",sms:"SMS",delay:"Chờ",condition:"Điều kiện",ab_test:"A/B Test",tag:"Thẻ",webhook:"Webhook",push:"Thông báo Push",popup:"Popup Web",end:"Kết thúc",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"Đăng ký",purchase:"Mua hàng",cart_abandoned:"Bỏ giỏ hàng",churned:"Rủi ro rời bỏ",segment_entered:"Vào phân khúc",birthday:"Sinh nhật",manual:"Thủ công",event:"Sự kiện tùy chỉnh",webhook_trigger:"Webhook Trigger"}};
journeyNested.id = {...journeyNested.en, pageTitle:"Pembangun Perjalanan Pelanggan",tabList:"Daftar Perjalanan",tabAnalytics:"Dasbor Analitik",myJourneys:"Perjalanan Saya",newJourney:"+ Buat Perjalanan Baru",cancel:"Batal",create:"Buat",noJourneys:"Belum ada perjalanan. Buat perjalanan pertama Anda!",statusActive:"Aktif",statusPaused:"Dijeda",statusDraft:"Draf",edit:"Edit",save:"Simpan",saving:"Menyimpan...",backToList:"← Kembali ke Daftar",deleteNode:"Hapus Node",
    nodeTypes:{trigger:"Pemicu",email:"Email",sms:"SMS",delay:"Tunggu",condition:"Kondisi",ab_test:"A/B Test",tag:"Tag",webhook:"Webhook",push:"Notifikasi Push",popup:"Popup Web",end:"Selesai",kakao:"KakaoTalk",line:"LINE",whatsapp:"WhatsApp",instagram:"Instagram DM"},
    triggerTypes:{signup:"Pendaftaran",purchase:"Pembelian",cart_abandoned:"Keranjang Ditinggalkan",churned:"Risiko Churn",segment_entered:"Masuk Segmen",birthday:"Ulang Tahun",manual:"Manual",event:"Event Kustom",webhook_trigger:"Webhook Trigger"}};

const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove ALL old flat "journey.xxx" keys injected previously
  content = content.replace(/,"journey\.[^"]*":"[^"]*"/g, '');

  // 2. Remove any existing "journey":{...} nested object
  content = content.replace(/,"journey":\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, '');

  // 3. Inject new nested "journey":{...} object before the final }
  const data = journeyNested[lang] || journeyNested.en;
  const journeyJSON = JSON.stringify(data);

  // Find the very last } in the export default {...}
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace > 0) {
    const before = content.substring(0, lastBrace);
    const after = content.substring(lastBrace);
    const sep = before.trimEnd().endsWith(',') ? '' : ',';
    content = before + sep + '"journey":' + journeyJSON + after;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ [${lang}] Injected nested journey object (${Object.keys(data).length} keys)`);
});

console.log('\n🎉 All locale files updated with NESTED journey objects!');
