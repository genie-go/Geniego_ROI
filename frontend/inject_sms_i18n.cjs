const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "guideTitle":"SMS/LMS 마케팅 이용 가이드","guideSub":"NHN Cloud, Aligo, CoolSMS 프로바이더 연동부터 개별/일괄 발송, 통계 분석까지 전체 워크플로우를 안내합니다.",
    "guideStepsTitle":"SMS 마케팅 6단계",
    "guideStep1Title":"프로바이더 선택","guideStep1Desc":"NHN Cloud, Aligo, CoolSMS 중 프로바이더를 선택합니다.",
    "guideStep2Title":"API 키 등록","guideStep2Desc":"App Key, Secret Key, 발신번호를 등록하고 연결 테스트합니다.",
    "guideStep3Title":"SMS 작성","guideStep3Desc":"수신번호와 메시지를 입력하고 SMS/LMS를 발송합니다.",
    "guideStep4Title":"일괄 발송","guideStep4Desc":"최대 500개 번호에 동시 발송합니다.",
    "guideStep5Title":"발송 내역","guideStep5Desc":"발송 이력과 성공/실패 상태를 확인합니다.",
    "guideStep6Title":"통계 분석","guideStep6Desc":"월별 발송 건수, 성공률, 잔여 예산을 분석합니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideComposeName":"SMS 작성","guideComposeDesc":"개별 SMS/LMS 발송",
    "guideBroadcastName":"일괄 발송","guideBroadcastDesc":"최대 500건 동시 발송",
    "guideHistoryName":"발송 내역","guideHistoryDesc":"발송 이력 조회",
    "guideStatsName":"통계","guideStatsDesc":"발송 성공률 분석",
    "guideAuthName":"인증 설정","guideAuthDesc":"API 키 등록",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"90자 이하는 SMS, 초과하면 자동으로 LMS로 전환됩니다.",
    "guideTip2":"발신번호는 통신사에 사전 등록된 번호만 사용 가능합니다.",
    "guideTip3":"CRM 세그먼트와 연동하면 타겟팅 정밀도가 향상됩니다.",
    "guideTip4":"일괄 발송 시 최대 500개 번호까지 동시 발송 가능합니다.",
    "guideTip5":"모든 발송 기록은 API를 통해 실시간 추적됩니다.",
  },
  en: {
    "guideTitle":"SMS/LMS Marketing Guide","guideSub":"Complete workflow from NHN Cloud, Aligo, CoolSMS provider setup to individual/bulk sending and analytics.",
    "guideStepsTitle":"6 Steps to SMS Marketing",
    "guideStep1Title":"Select Provider","guideStep1Desc":"Choose from NHN Cloud, Aligo, or CoolSMS as your provider.",
    "guideStep2Title":"Register API Keys","guideStep2Desc":"Register App Key, Secret Key, and sender number, then run a connection test.",
    "guideStep3Title":"Compose SMS","guideStep3Desc":"Enter recipient number and message to send SMS/LMS.",
    "guideStep4Title":"Bulk Send","guideStep4Desc":"Send to up to 500 numbers simultaneously.",
    "guideStep5Title":"Send History","guideStep5Desc":"Review send history and check success/failure status.",
    "guideStep6Title":"Statistics","guideStep6Desc":"Analyze monthly send counts, success rates, and remaining budget.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideComposeName":"Compose SMS","guideComposeDesc":"Individual SMS/LMS sending",
    "guideBroadcastName":"Bulk Send","guideBroadcastDesc":"Up to 500 simultaneous sends",
    "guideHistoryName":"Send History","guideHistoryDesc":"View send records",
    "guideStatsName":"Statistics","guideStatsDesc":"Analyze success rates",
    "guideAuthName":"Auth Settings","guideAuthDesc":"Register API keys",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Messages under 90 chars are SMS; over that, they auto-convert to LMS.",
    "guideTip2":"Sender numbers must be pre-registered with your carrier.",
    "guideTip3":"CRM segment integration improves targeting precision.",
    "guideTip4":"Bulk send supports up to 500 numbers at once.",
    "guideTip5":"All send records are tracked in real-time via API.",
  },
  ja: {
    "guideTitle":"SMS/LMSマーケティングガイド","guideSub":"プロバイダー設定から送信、分析まで",
    "guideStepsTitle":"6ステップ",
    "guideStep1Title":"プロバイダー選択","guideStep1Desc":"NHN Cloud、Aligo、CoolSMSから選択します。",
    "guideStep2Title":"APIキー登録","guideStep2Desc":"App Key、Secret Key、発信番号を登録します。",
    "guideStep3Title":"SMS作成","guideStep3Desc":"受信番号とメッセージを入力して送信します。",
    "guideStep4Title":"一括送信","guideStep4Desc":"最大500件に同時送信します。",
    "guideStep5Title":"送信履歴","guideStep5Desc":"送信履歴と成功/失敗を確認します。",
    "guideStep6Title":"統計分析","guideStep6Desc":"月次送信数、成功率、残高を分析します。",
    "guideTabsTitle":"タブ別ガイド",
    "guideComposeName":"SMS作成","guideComposeDesc":"個別SMS/LMS送信",
    "guideBroadcastName":"一括送信","guideBroadcastDesc":"最大500件同時送信",
    "guideHistoryName":"送信履歴","guideHistoryDesc":"送信記録閲覧",
    "guideStatsName":"統計","guideStatsDesc":"成功率分析",
    "guideAuthName":"認証設定","guideAuthDesc":"APIキー登録",
    "guideTipsTitle":"ヒント",
    "guideTip1":"90文字以下はSMS、超過は自動でLMSに変換されます。",
    "guideTip2":"発信番号はキャリアに事前登録が必要です。",
    "guideTip3":"CRMセグメント連携でターゲティング精度が向上します。",
    "guideTip4":"一括送信は最大500件まで対応しています。",
    "guideTip5":"すべての送信記録はAPIを通じてリアルタイムで追跡されます。",
  },
  zh: {"guideTitle":"SMS/LMS营销指南","guideSub":"从服务商设置到批量发送和分析","guideStepsTitle":"6步骤","guideStep1Title":"选择服务商","guideStep1Desc":"选择NHN Cloud、Aligo或CoolSMS","guideStep2Title":"注册API密钥","guideStep2Desc":"注册App Key、Secret Key和发送号码","guideStep3Title":"编写SMS","guideStep3Desc":"输入接收号码和消息","guideStep4Title":"批量发送","guideStep4Desc":"同时发送最多500个号码","guideStep5Title":"发送记录","guideStep5Desc":"查看发送历史","guideStep6Title":"统计分析","guideStep6Desc":"分析成功率和预算","guideTabsTitle":"标签指南","guideComposeName":"编写SMS","guideComposeDesc":"单个发送","guideBroadcastName":"批量发送","guideBroadcastDesc":"最多500个","guideHistoryName":"发送记录","guideHistoryDesc":"查看记录","guideStatsName":"统计","guideStatsDesc":"成功率","guideAuthName":"认证设置","guideAuthDesc":"API密钥","guideTipsTitle":"技巧","guideTip1":"90字以下为SMS，超过自动转为LMS","guideTip2":"发送号码需预先注册","guideTip3":"CRM细分提高精准度","guideTip4":"批量最多500个号码","guideTip5":"API实时追踪所有记录"},
  "zh-TW": {"guideTitle":"SMS/LMS行銷指南","guideSub":"服務商到批量發送","guideStepsTitle":"6步驟","guideStep1Title":"選擇服務商","guideStep1Desc":"NHN Cloud/Aligo/CoolSMS","guideStep2Title":"註冊API金鑰","guideStep2Desc":"App Key、Secret Key","guideStep3Title":"編寫SMS","guideStep3Desc":"輸入號碼和訊息","guideStep4Title":"批量發送","guideStep4Desc":"最多500個","guideStep5Title":"發送記錄","guideStep5Desc":"查看歷史","guideStep6Title":"統計分析","guideStep6Desc":"分析成功率","guideTabsTitle":"標籤指南","guideComposeName":"編寫SMS","guideComposeDesc":"單個發送","guideBroadcastName":"批量發送","guideBroadcastDesc":"最多500個","guideHistoryName":"發送記錄","guideHistoryDesc":"查看記錄","guideStatsName":"統計","guideStatsDesc":"成功率","guideAuthName":"認證設定","guideAuthDesc":"API金鑰","guideTipsTitle":"技巧","guideTip1":"90字以下SMS，超過自動轉LMS","guideTip2":"發送號碼需預先註冊","guideTip3":"CRM區隔提高精準度","guideTip4":"批量最多500個","guideTip5":"API即時追蹤"},
  de: {"guideTitle":"SMS/LMS-Marketing-Anleitung","guideSub":"Vom Anbieter bis zur Analyse","guideStepsTitle":"6 Schritte","guideStep1Title":"Anbieter wählen","guideStep1Desc":"NHN Cloud, Aligo oder CoolSMS","guideStep2Title":"API-Schlüssel","guideStep2Desc":"App Key, Secret Key registrieren","guideStep3Title":"SMS verfassen","guideStep3Desc":"Nummer und Nachricht eingeben","guideStep4Title":"Massenversand","guideStep4Desc":"Bis zu 500 Nummern","guideStep5Title":"Verlauf","guideStep5Desc":"Sendungshistorie","guideStep6Title":"Statistik","guideStep6Desc":"Erfolgsrate analysieren","guideTabsTitle":"Tab-Guide","guideComposeName":"SMS verfassen","guideComposeDesc":"Einzelversand","guideBroadcastName":"Massenversand","guideBroadcastDesc":"Bis 500 gleichzeitig","guideHistoryName":"Verlauf","guideHistoryDesc":"Protokoll anzeigen","guideStatsName":"Statistik","guideStatsDesc":"Erfolgsrate","guideAuthName":"Auth-Einstellungen","guideAuthDesc":"API-Schlüssel","guideTipsTitle":"Tipps","guideTip1":"Unter 90 Zeichen=SMS, darüber automatisch LMS","guideTip2":"Absendernummer muss vorregistriert sein","guideTip3":"CRM-Segmente verbessern Targeting","guideTip4":"Massenversand bis 500 Nummern","guideTip5":"Echtzeit-Tracking via API"},
  th: {"guideTitle":"คู่มือ SMS/LMS","guideSub":"ตั้งค่าถึงวิเคราะห์","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"เลือกผู้ให้บริการ","guideStep1Desc":"NHN Cloud, Aligo, CoolSMS","guideStep2Title":"ลงทะเบียน API","guideStep2Desc":"App Key, Secret Key","guideStep3Title":"เขียน SMS","guideStep3Desc":"กรอกหมายเลขและข้อความ","guideStep4Title":"ส่งจำนวนมาก","guideStep4Desc":"สูงสุด 500 หมายเลข","guideStep5Title":"ประวัติ","guideStep5Desc":"ดูบันทึกการส่ง","guideStep6Title":"สถิติ","guideStep6Desc":"วิเคราะห์อัตราสำเร็จ","guideTabsTitle":"แท็บ","guideComposeName":"เขียน SMS","guideComposeDesc":"ส่งรายบุคคล","guideBroadcastName":"ส่งจำนวนมาก","guideBroadcastDesc":"สูงสุด 500","guideHistoryName":"ประวัติ","guideHistoryDesc":"ดูบันทึก","guideStatsName":"สถิติ","guideStatsDesc":"อัตราสำเร็จ","guideAuthName":"ตั้งค่า","guideAuthDesc":"API","guideTipsTitle":"เทคนิค","guideTip1":"ต่ำกว่า 90 ตัว=SMS เกิน=LMS อัตโนมัติ","guideTip2":"หมายเลขต้องลงทะเบียนล่วงหน้า","guideTip3":"CRM เซกเมนต์เพิ่มความแม่นยำ","guideTip4":"ส่งพร้อมกันสูงสุด 500","guideTip5":"ติดตามเรียลไทม์ผ่าน API"},
  vi: {"guideTitle":"Hướng dẫn SMS/LMS","guideSub":"Từ nhà cung cấp đến phân tích","guideStepsTitle":"6 bước","guideStep1Title":"Chọn nhà cung cấp","guideStep1Desc":"NHN Cloud, Aligo, CoolSMS","guideStep2Title":"Đăng ký API","guideStep2Desc":"App Key, Secret Key","guideStep3Title":"Soạn SMS","guideStep3Desc":"Nhập số và tin nhắn","guideStep4Title":"Gửi hàng loạt","guideStep4Desc":"Tối đa 500 số","guideStep5Title":"Lịch sử","guideStep5Desc":"Xem bản ghi","guideStep6Title":"Thống kê","guideStep6Desc":"Phân tích tỷ lệ","guideTabsTitle":"Tab","guideComposeName":"Soạn SMS","guideComposeDesc":"Gửi đơn lẻ","guideBroadcastName":"Gửi hàng loạt","guideBroadcastDesc":"Tối đa 500","guideHistoryName":"Lịch sử","guideHistoryDesc":"Xem bản ghi","guideStatsName":"Thống kê","guideStatsDesc":"Tỷ lệ thành công","guideAuthName":"Cài đặt","guideAuthDesc":"API key","guideTipsTitle":"Mẹo","guideTip1":"Dưới 90 ký tự=SMS, trên=LMS tự động","guideTip2":"Số gửi phải đăng ký trước","guideTip3":"CRM phân khúc tăng độ chính xác","guideTip4":"Gửi đồng thời tối đa 500","guideTip5":"Theo dõi real-time qua API"},
  id: {"guideTitle":"Panduan SMS/LMS","guideSub":"Dari provider hingga analisis","guideStepsTitle":"6 Langkah","guideStep1Title":"Pilih Provider","guideStep1Desc":"NHN Cloud, Aligo, CoolSMS","guideStep2Title":"Daftar API","guideStep2Desc":"App Key, Secret Key","guideStep3Title":"Tulis SMS","guideStep3Desc":"Masukkan nomor dan pesan","guideStep4Title":"Kirim Massal","guideStep4Desc":"Maksimal 500 nomor","guideStep5Title":"Riwayat","guideStep5Desc":"Lihat catatan","guideStep6Title":"Statistik","guideStep6Desc":"Analisis tingkat keberhasilan","guideTabsTitle":"Tab","guideComposeName":"Tulis SMS","guideComposeDesc":"Kirim individu","guideBroadcastName":"Kirim Massal","guideBroadcastDesc":"Maks 500","guideHistoryName":"Riwayat","guideHistoryDesc":"Lihat catatan","guideStatsName":"Statistik","guideStatsDesc":"Tingkat sukses","guideAuthName":"Pengaturan","guideAuthDesc":"API key","guideTipsTitle":"Tips","guideTip1":"Di bawah 90 karakter=SMS, lebih=LMS otomatis","guideTip2":"Nomor pengirim harus terdaftar","guideTip3":"CRM segmen meningkatkan akurasi","guideTip4":"Kirim sekaligus maks 500","guideTip5":"Tracking real-time via API"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.sms) obj.sms = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.sms, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] sms guide: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 SMS guide i18n complete!');
