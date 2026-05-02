const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');

const NEW_KEYS = {
  ko: {
    ihubLinked: '채널 연동됨',
    ihubAutoDetect: '연동허브에서 자동 감지된 SMS 채널:',
    guideStep1Title: 'API 인증 설정',
    guideStep1Desc: '연동허브에서 SMS 제공자(NHN Cloud, Aligo, CoolSMS 등)의 API 키를 등록하세요. 등록된 API 키는 자동으로 SMS 마케팅 모듈과 동기화됩니다. 인증 설정 탭에서 발신번호를 등록하고 연결 테스트를 수행하세요.',
    guideStep2Title: '메시지 작성',
    guideStep2Desc: '작성 탭에서 수신자 번호를 입력하고 메시지를 작성하세요. 한글 기준 SMS는 90자, LMS는 2,000자까지 가능합니다. 메시지 길이에 따라 자동으로 SMS/LMS가 구분됩니다.',
    guideStep3Title: '템플릿 관리',
    guideStep3Desc: '자주 사용하는 메시지를 템플릿으로 저장하세요. 카테고리(프로모션, 알림, 인증, 트랜잭션)별로 분류하고 #{이름}, #{주문번호} 등의 변수를 삽입할 수 있습니다.',
    guideStep4Title: '캠페인 생성',
    guideStep4Desc: 'CRM 세그먼트를 선택하여 타겟 고객에게 대량 메시지를 보내세요. 예약 발송, 즉시 발송을 선택하고 캠페인별 성과를 실시간 추적할 수 있습니다.',
    guideStep5Title: '대량 발송',
    guideStep5Desc: '일괄 발송 탭에서 최대 500명의 수신자에게 동시 발송이 가능합니다. 쉼표 또는 줄바꿈으로 수신번호를 구분하세요.',
    guideStep6Title: '통계 & 모니터링',
    guideStep6Desc: '통계 탭에서 월별 발송량, 성공률, 잔여 포인트를 확인하세요. 모든 데이터는 30초마다 실시간 동기화되며, 다른 브라우저 탭과도 자동 동기화됩니다.',
    guideComposeName: '메시지 작성', guideComposeDesc: 'SMS/LMS 단건 발송',
    guideBroadcastName: '일괄 발송', guideBroadcastDesc: '최대 500명 대량 발송',
    guideTemplatesName: '템플릿 관리', guideTemplatesDesc: '자주 사용 메시지 저장',
    guideCampaignsName: '캠페인', guideCampaignsDesc: 'CRM 세그먼트 기반 발송',
    guideHistoryName: '발송 이력', guideHistoryDesc: '전체 발송 로그 조회',
    guideStatsName: '통계', guideStatsDesc: '발송 성과 분석',
    guideAuthName: '인증 설정', guideAuthDesc: 'API 키 및 발신번호 관리',
    guideTip1: 'API 키는 연동허브에서 등록하면 SMS 마케팅 모듈에 자동 연동됩니다.',
    guideTip2: '발신번호는 사전 등록이 필요하며 미등록 번호로는 발송이 불가합니다.',
    guideTip3: '캠페인을 예약 발송으로 설정하면 지정 시간에 자동 발송됩니다.',
    guideTip4: '변수 치환을 활용하면 개인화된 메시지를 대량 발송할 수 있습니다.',
    guideTip5: '보안 모니터링이 활성화되어 해킹 시도가 자동 감지 및 차단됩니다.',
  },
  en: {
    ihubLinked: 'Channels Linked',
    ihubAutoDetect: 'Auto-detected SMS channels from Integration Hub:',
    guideStep1Title: 'API Authentication Setup',
    guideStep1Desc: 'Register your SMS provider API keys (NHN Cloud, Aligo, CoolSMS, etc.) from the Integration Hub. Registered API keys are automatically synced with the SMS Marketing module. Go to Auth Settings to register your sender number and run a connection test.',
    guideStep2Title: 'Compose Messages',
    guideStep2Desc: 'Enter the recipient number and compose your message in the Compose tab. SMS supports up to 90 characters (Korean), while LMS supports up to 2,000 characters. The message type is automatically selected based on length.',
    guideStep3Title: 'Template Management',
    guideStep3Desc: 'Save frequently used messages as templates. Organize by category (Promotion, Notification, Verification, Transaction) and insert variables like #{name}, #{orderNumber} for personalization.',
    guideStep4Title: 'Create Campaigns',
    guideStep4Desc: 'Select CRM segments to target specific customers with bulk messaging. Choose between scheduled or immediate delivery and track campaign performance in real-time.',
    guideStep5Title: 'Bulk Sending',
    guideStep5Desc: 'Send messages to up to 500 recipients simultaneously from the Bulk Send tab. Separate phone numbers with commas or line breaks.',
    guideStep6Title: 'Statistics & Monitoring',
    guideStep6Desc: 'View monthly send volume, success rates, and remaining balance in the Stats tab. All data is synced in real-time every 30 seconds and auto-synchronized across browser tabs.',
    guideComposeName: 'Compose', guideComposeDesc: 'Send individual SMS/LMS',
    guideBroadcastName: 'Bulk Send', guideBroadcastDesc: 'Send to up to 500 recipients',
    guideTemplatesName: 'Templates', guideTemplatesDesc: 'Save frequently used messages',
    guideCampaignsName: 'Campaigns', guideCampaignsDesc: 'CRM segment-based sending',
    guideHistoryName: 'History', guideHistoryDesc: 'View all send logs',
    guideStatsName: 'Statistics', guideStatsDesc: 'Analyze send performance',
    guideAuthName: 'Auth Settings', guideAuthDesc: 'Manage API keys & sender numbers',
    guideTip1: 'API keys registered in the Integration Hub are automatically linked to the SMS Marketing module.',
    guideTip2: 'Sender numbers must be pre-registered; unregistered numbers cannot send messages.',
    guideTip3: 'Campaigns set to scheduled delivery will be sent automatically at the designated time.',
    guideTip4: 'Use variable substitution to send personalized messages in bulk.',
    guideTip5: 'Security monitoring is active — hacking attempts are automatically detected and blocked.',
  },
  ja: { ihubLinked: 'チャネル連携済み', ihubAutoDetect: '統合ハブから自動検出されたSMSチャネル：', guideStep1Title:'API認証設定', guideStep1Desc:'統合ハブからSMSプロバイダー（NHN Cloud、Aligo、CoolSMSなど）のAPIキーを登録してください。登録されたAPIキーはSMSマーケティングモジュールと自動同期されます。',guideStep2Title:'メッセージ作成',guideStep2Desc:'作成タブで受信者番号を入力しメッセージを作成。SMSは90文字、LMSは2,000文字まで対応。',guideStep3Title:'テンプレート管理',guideStep3Desc:'頻繁に使用するメッセージをテンプレートとして保存。カテゴリ別に分類し変数を挿入可能。',guideStep4Title:'キャンペーン作成',guideStep4Desc:'CRMセグメントを選択して特定顧客に一括メッセージを送信。予約・即時送信を選択可能。',guideStep5Title:'一括送信',guideStep5Desc:'最大500人の受信者に同時送信が可能。',guideStep6Title:'統計＆モニタリング',guideStep6Desc:'月別送信量、成功率、残高を確認。全データは30秒ごとにリアルタイム同期。',guideComposeName:'メッセージ作成',guideComposeDesc:'SMS/LMS個別送信',guideBroadcastName:'一括送信',guideBroadcastDesc:'最大500人に大量送信',guideTemplatesName:'テンプレート管理',guideTemplatesDesc:'頻繁使用メッセージの保存',guideCampaignsName:'キャンペーン',guideCampaignsDesc:'CRMセグメント基の送信',guideHistoryName:'送信履歴',guideHistoryDesc:'全送信ログ照会',guideStatsName:'統計',guideStatsDesc:'送信成果分析',guideAuthName:'認証設定',guideAuthDesc:'APIキー＆発信番号管理',guideTip1:'統合ハブで登録したAPIキーはSMSモジュールに自動連携。',guideTip2:'発信番号は事前登録が必要です。',guideTip3:'予約送信キャンペーンは指定時間に自動送信。',guideTip4:'変数置換でパーソナライズメッセージを一括送信可能。',guideTip5:'セキュリティモニタリング有効。ハッキング試行を自動検出・ブロック。' },
  zh: { ihubLinked: '频道已连接', ihubAutoDetect: '从集成中心自动检测到的短信频道：', guideStep1Title:'API认证设置',guideStep1Desc:'从集成中心注册短信提供商API密钥。注册的API密钥将自动与短信营销模块同步。',guideStep2Title:'编写消息',guideStep2Desc:'在编写标签中输入收件人号码并编写消息。短信最多90字符，长短信最多2,000字符。',guideStep3Title:'模板管理',guideStep3Desc:'将常用消息保存为模板。按类别分类并插入变量。',guideStep4Title:'创建营销活动',guideStep4Desc:'选择CRM细分群体向特定客户发送批量消息。',guideStep5Title:'批量发送',guideStep5Desc:'同时向最多500个收件人发送消息。',guideStep6Title:'统计与监控',guideStep6Desc:'查看月度发送量、成功率和余额。所有数据每30秒实时同步。',guideComposeName:'编写消息',guideComposeDesc:'发送单条短信',guideBroadcastName:'批量发送',guideBroadcastDesc:'向500人发送',guideTemplatesName:'模板管理',guideTemplatesDesc:'保存常用消息',guideCampaignsName:'营销活动',guideCampaignsDesc:'基于CRM细分发送',guideHistoryName:'发送历史',guideHistoryDesc:'查看发送日志',guideStatsName:'统计',guideStatsDesc:'分析发送绩效',guideAuthName:'认证设置',guideAuthDesc:'管理API密钥',guideTip1:'从集成中心注册的API密钥自动连入短信模块。',guideTip2:'发送号码需预先注册。',guideTip3:'定时活动将在指定时间自动发送。',guideTip4:'利用变量替换可批量发送个性化消息。',guideTip5:'安全监控已启用，自动检测和阻止攻击。' },
  'zh-TW': { ihubLinked: '頻道已連接', ihubAutoDetect: '從整合中心自動偵測到的簡訊頻道：', guideStep1Title:'API認證設定',guideStep1Desc:'從整合中心註冊簡訊供應商API金鑰。註冊的API金鑰將自動與簡訊行銷模組同步。',guideStep2Title:'編寫訊息',guideStep2Desc:'輸入收件人號碼並編寫訊息。簡訊最多90字元，長簡訊最多2,000字元。',guideStep3Title:'範本管理',guideStep3Desc:'將常用訊息儲存為範本。按類別分類並插入變數。',guideStep4Title:'建立行銷活動',guideStep4Desc:'選擇CRM細分群體向特定客戶發送大量訊息。',guideStep5Title:'批次發送',guideStep5Desc:'同時向最多500個收件人發送訊息。',guideStep6Title:'統計與監控',guideStep6Desc:'查看月度發送量、成功率和餘額。所有資料每30秒即時同步。',guideComposeName:'編寫訊息',guideComposeDesc:'發送單條簡訊',guideBroadcastName:'批次發送',guideBroadcastDesc:'向500人發送',guideTemplatesName:'範本管理',guideTemplatesDesc:'儲存常用訊息',guideCampaignsName:'行銷活動',guideCampaignsDesc:'基於CRM細分發送',guideHistoryName:'發送歷史',guideHistoryDesc:'查看發送日誌',guideStatsName:'統計',guideStatsDesc:'分析發送績效',guideAuthName:'認證設定',guideAuthDesc:'管理API金鑰',guideTip1:'從整合中心註冊的API金鑰自動連入簡訊模組。',guideTip2:'發送號碼需預先註冊。',guideTip3:'排程活動將在指定時間自動發送。',guideTip4:'利用變數替換可批次發送個人化訊息。',guideTip5:'安全監控已啟用，自動偵測和阻止攻擊。' },
  de: { ihubLinked: 'Kanäle verbunden', ihubAutoDetect: 'Automatisch erkannte SMS-Kanäle:', guideStep1Title:'API-Authentifizierung',guideStep1Desc:'Registrieren Sie SMS-Anbieter-API-Schlüssel im Integration Hub. Automatische Synchronisierung mit dem SMS-Marketing-Modul.',guideStep2Title:'Nachricht verfassen',guideStep2Desc:'SMS bis 90 Zeichen, LMS bis 2.000 Zeichen. Automatische Typ-Erkennung.',guideStep3Title:'Vorlagenverwaltung',guideStep3Desc:'Häufig verwendete Nachrichten als Vorlagen speichern und Variablen einfügen.',guideStep4Title:'Kampagne erstellen',guideStep4Desc:'CRM-Segmente für Massennachrichten auswählen.',guideStep5Title:'Massenversand',guideStep5Desc:'An bis zu 500 Empfänger gleichzeitig senden.',guideStep6Title:'Statistiken & Monitoring',guideStep6Desc:'Sendevolumen, Erfolgsraten und Guthaben anzeigen. Echtzeit-Sync alle 30 Sekunden.',guideComposeName:'Verfassen',guideComposeDesc:'Einzelne SMS/LMS',guideBroadcastName:'Massenversand',guideBroadcastDesc:'Bis zu 500 Empfänger',guideTemplatesName:'Vorlagen',guideTemplatesDesc:'Häufige Nachrichten',guideCampaignsName:'Kampagnen',guideCampaignsDesc:'CRM-Segment-Versand',guideHistoryName:'Verlauf',guideHistoryDesc:'Alle Protokolle',guideStatsName:'Statistiken',guideStatsDesc:'Leistungsanalyse',guideAuthName:'Auth-Einstellungen',guideAuthDesc:'API-Schlüssel verwalten',guideTip1:'API-Schlüssel vom Integration Hub werden automatisch verknüpft.',guideTip2:'Absendernummern müssen vorab registriert werden.',guideTip3:'Geplante Kampagnen werden automatisch gesendet.',guideTip4:'Variablenersetzung für personalisierte Massennachrichten.',guideTip5:'Sicherheitsmonitoring aktiv — Hacking automatisch erkannt.' },
  th: { ihubLinked: 'เชื่อมต่อแล้ว', ihubAutoDetect: 'ช่อง SMS ที่ตรวจพบอัตโนมัติ:', guideStep1Title:'ตั้งค่า API',guideStep1Desc:'ลงทะเบียน API Key จาก Integration Hub ซิงค์อัตโนมัติกับโมดูล SMS',guideStep2Title:'เขียนข้อความ',guideStep2Desc:'SMS สูงสุด90ตัวอักษร LMS สูงสุด2000ตัวอักษร เลือกประเภทอัตโนมัติ',guideStep3Title:'จัดการเทมเพลต',guideStep3Desc:'บันทึกข้อความที่ใช้บ่อยเป็นเทมเพลตและแทรกตัวแปร',guideStep4Title:'สร้างแคมเปญ',guideStep4Desc:'เลือก CRM เซ็กเมนต์เพื่อส่งข้อความแบบกลุ่ม',guideStep5Title:'ส่งจำนวนมาก',guideStep5Desc:'ส่งถึงผู้รับสูงสุด500คนพร้อมกัน',guideStep6Title:'สถิติและการตรวจสอบ',guideStep6Desc:'ดูข้อมูลรายเดือน ซิงค์ทุก30วินาที',guideComposeName:'เขียนข้อความ',guideComposeDesc:'ส่ง SMS/LMS เดี่ยว',guideBroadcastName:'ส่งจำนวนมาก',guideBroadcastDesc:'ส่งถึง500คน',guideTemplatesName:'เทมเพลต',guideTemplatesDesc:'บันทึกข้อความ',guideCampaignsName:'แคมเปญ',guideCampaignsDesc:'ส่งตาม CRM',guideHistoryName:'ประวัติ',guideHistoryDesc:'ดูบันทึกการส่ง',guideStatsName:'สถิติ',guideStatsDesc:'วิเคราะห์ประสิทธิภาพ',guideAuthName:'ตั้งค่าการยืนยัน',guideAuthDesc:'จัดการ API Key',guideTip1:'API Key จาก Integration Hub เชื่อมอัตโนมัติ',guideTip2:'หมายเลขผู้ส่งต้องลงทะเบียนล่วงหน้า',guideTip3:'แคมเปญที่ตั้งเวลาส่งอัตโนมัติ',guideTip4:'ใช้ตัวแปรเพื่อส่งข้อความส่วนตัว',guideTip5:'ระบบความปลอดภัยทำงานอยู่ ป้องกันแฮก' },
  vi: { ihubLinked: 'Kênh đã kết nối', ihubAutoDetect: 'Kênh SMS tự động phát hiện:', guideStep1Title:'Cài đặt API',guideStep1Desc:'Đăng ký API key từ Integration Hub. Tự động đồng bộ với module SMS Marketing.',guideStep2Title:'Soạn tin nhắn',guideStep2Desc:'SMS tối đa 90 ký tự, LMS tối đa 2.000 ký tự. Tự động chọn loại.',guideStep3Title:'Quản lý mẫu',guideStep3Desc:'Lưu tin nhắn thường dùng làm mẫu và chèn biến.',guideStep4Title:'Tạo chiến dịch',guideStep4Desc:'Chọn phân khúc CRM để gửi tin nhắn hàng loạt.',guideStep5Title:'Gửi hàng loạt',guideStep5Desc:'Gửi đến tối đa 500 người nhận cùng lúc.',guideStep6Title:'Thống kê & Giám sát',guideStep6Desc:'Xem lượng gửi, tỷ lệ thành công. Đồng bộ mỗi 30 giây.',guideComposeName:'Soạn tin',guideComposeDesc:'Gửi SMS/LMS đơn lẻ',guideBroadcastName:'Gửi hàng loạt',guideBroadcastDesc:'Gửi đến 500 người',guideTemplatesName:'Mẫu tin',guideTemplatesDesc:'Lưu tin nhắn thường dùng',guideCampaignsName:'Chiến dịch',guideCampaignsDesc:'Gửi theo CRM',guideHistoryName:'Lịch sử',guideHistoryDesc:'Xem nhật ký gửi',guideStatsName:'Thống kê',guideStatsDesc:'Phân tích hiệu suất',guideAuthName:'Cài đặt xác thực',guideAuthDesc:'Quản lý API key',guideTip1:'API key từ Integration Hub tự động liên kết.',guideTip2:'Số gửi phải đăng ký trước.',guideTip3:'Chiến dịch hẹn giờ tự động gửi.',guideTip4:'Sử dụng biến để gửi tin cá nhân hóa.',guideTip5:'Bảo mật hoạt động — phát hiện tấn công tự động.' },
  id: { ihubLinked: 'Saluran Terhubung', ihubAutoDetect: 'Saluran SMS terdeteksi otomatis:', guideStep1Title:'Pengaturan API',guideStep1Desc:'Daftarkan API key dari Integration Hub. Otomatis disinkronkan dengan modul SMS.',guideStep2Title:'Tulis Pesan',guideStep2Desc:'SMS hingga 90 karakter, LMS hingga 2.000 karakter. Jenis otomatis.',guideStep3Title:'Manajemen Template',guideStep3Desc:'Simpan pesan sering digunakan sebagai template dan sisipkan variabel.',guideStep4Title:'Buat Kampanye',guideStep4Desc:'Pilih segmen CRM untuk pesan massal.',guideStep5Title:'Kirim Massal',guideStep5Desc:'Kirim ke hingga 500 penerima bersamaan.',guideStep6Title:'Statistik & Pemantauan',guideStep6Desc:'Lihat volume bulanan dan tingkat keberhasilan. Sinkronisasi setiap 30 detik.',guideComposeName:'Tulis',guideComposeDesc:'Kirim SMS/LMS',guideBroadcastName:'Kirim Massal',guideBroadcastDesc:'Kirim ke 500 penerima',guideTemplatesName:'Template',guideTemplatesDesc:'Simpan pesan sering',guideCampaignsName:'Kampanye',guideCampaignsDesc:'Kirim CRM segmen',guideHistoryName:'Riwayat',guideHistoryDesc:'Lihat log kirim',guideStatsName:'Statistik',guideStatsDesc:'Analisis kinerja',guideAuthName:'Pengaturan Auth',guideAuthDesc:'Kelola API key',guideTip1:'API key dari Integration Hub otomatis terhubung.',guideTip2:'Nomor pengirim harus didaftarkan.',guideTip3:'Kampanye terjadwal terkirim otomatis.',guideTip4:'Gunakan variabel untuk pesan personal.',guideTip5:'Keamanan aktif — percobaan peretasan terdeteksi.' },
};

['ko','en','ja','zh','zh-TW','de','th','vi','id'].forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const keys = NEW_KEYS[lang] || NEW_KEYS.en;
  let added = 0;

  // Find sms block: "sms":{...}
  const smsStart = code.indexOf('"sms":{');
  if (smsStart < 0) { console.log(`❌ ${lang}: sms block not found`); return; }

  // Find closing brace of sms block
  let depth = 0, endIdx = -1;
  for (let i = smsStart + 5; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  if (endIdx < 0) { console.log(`❌ ${lang}: sms block end not found`); return; }

  // Build keys to insert
  let insertStr = '';
  for (const [k, v] of Object.entries(keys)) {
    // Check block doesn't already have this key
    const block = code.substring(smsStart, endIdx);
    if (block.includes(`"${k}":`)) continue;
    const safeV = v.replace(/"/g, '\\"');
    insertStr += `,"${k}":"${safeV}"`;
    added++;
  }

  if (insertStr) {
    code = code.substring(0, endIdx) + insertStr + code.substring(endIdx);
    fs.writeFileSync(file, code, 'utf8');
  }
  console.log(`✅ ${lang}: ${added} keys added`);
});
console.log('\n🎉 SMS guide i18n v4 patch complete!');
