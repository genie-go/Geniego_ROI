const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

// Base CRM keys that should exist in all languages
const baseKeys = {
  ko: {
    "pageTitle":"고객 관리(CRM)","pageSub":"주문 데이터 기반 고객 관리 · AI 세그먼트 · RFM 분석",
    "tabCust":"👥 고객 목록","tabAiSeg":"🤖 AI 세그먼트","tabManSeg":"🏷 수동 세그먼트","tabRfm":"📊 RFM 분석",
    "statTot":"전체 고객","statAct":"활성 고객","statLtv":"LTV 합계","statSeg":"세그먼트",
    "fName":"이름","fEmail":"이메일","fPhone":"전화번호","fGrade":"등급","fSearch":"검색...",
    "colEmail":"이메일","colPhone":"전화번호","colGrade":"등급","colLtv":"LTV","colCnt":"구매 횟수","colLast":"최근 활동",
    "tDetail":"상세","btnRegister":"등록","btnSave":"저장","btnCancel":"취소","btnEmail":"📧 이메일 발송","btnKakao":"💬 카카오 알림",
    "formNew":"신규 고객 등록","fGradeGen":"일반",
    "gChamp":"챔피언","gLoyal":"충성","gRisk":"위험","gLost":"이탈","gNew":"신규","gNormal":"일반","gUrgent":"긴급",
    "titDetail":"고객 상세","lblPhone":"전화번호","lblAct":"활동 내역","actEmpty":"활동 내역이 없습니다.",
    "emptyCust":"고객 데이터가 없습니다.","segUnit":"명",
    "aiSum1":"AI 세그먼트","aiSum2":"대상 고객","aiSum3":"예측 매출","aiInsight":"AI 인사이트:",
    "aiBtnKakao":"💬 카카오 알림","msgEmailDone":"📧 이메일 연결!","msgKakaoDone":"💬 카카오 연결!","msgJourneyDone":"🗺️ 여정 연결!",
    "segNew":"새 세그먼트","segName":"세그먼트 이름","segDesc":"설명","segColor":"색상","segCond":"조건",
    "segAdd":"+ 조건 추가","segCreate":"세그먼트 생성","segEmpty":"생성된 세그먼트가 없습니다.","btnSaving":"저장 완료!",
    "rfmListTit":"RFM 분석 목록",
  },
  en: {
    "pageTitle":"CRM Dashboard","pageSub":"Order-based customer management · AI segments · RFM analysis",
    "tabCust":"👥 Customers","tabAiSeg":"🤖 AI Segments","tabManSeg":"🏷 Manual Segments","tabRfm":"📊 RFM Analysis",
    "statTot":"Total Customers","statAct":"Active","statLtv":"Total LTV","statSeg":"Segments",
    "fName":"Name","fEmail":"Email","fPhone":"Phone","fGrade":"Grade","fSearch":"Search...",
    "colEmail":"Email","colPhone":"Phone","colGrade":"Grade","colLtv":"LTV","colCnt":"Purchases","colLast":"Last Active",
    "tDetail":"Detail","btnRegister":"Register","btnSave":"Save","btnCancel":"Cancel","btnEmail":"📧 Send Email","btnKakao":"💬 Kakao Alert",
    "formNew":"New Customer","fGradeGen":"Normal",
    "gChamp":"Champions","gLoyal":"Loyal","gRisk":"At Risk","gLost":"Lost","gNew":"New","gNormal":"Normal","gUrgent":"Urgent",
    "titDetail":"Customer Detail","lblPhone":"Phone","lblAct":"Activity","actEmpty":"No activity history.",
    "emptyCust":"No customer data.","segUnit":"people",
    "aiSum1":"AI Segments","aiSum2":"Target Users","aiSum3":"Predicted Revenue","aiInsight":"AI Insight:",
    "aiBtnKakao":"💬 Kakao Alert","msgEmailDone":"📧 Email connected!","msgKakaoDone":"💬 Kakao connected!","msgJourneyDone":"🗺️ Journey connected!",
    "segNew":"New Segment","segName":"Segment Name","segDesc":"Description","segColor":"Color","segCond":"Conditions",
    "segAdd":"+ Add Condition","segCreate":"Create Segment","segEmpty":"No segments created.","btnSaving":"Saved!",
    "rfmListTit":"RFM Analysis List",
  },
  ja: {"pageTitle":"CRM管理","pageSub":"顧客管理","tabCust":"👥 顧客","tabAiSeg":"🤖 AI","tabManSeg":"🏷 手動","tabRfm":"📊 RFM","statTot":"全顧客","statAct":"アクティブ","statLtv":"LTV合計","statSeg":"セグメント","fName":"名前","fEmail":"メール","fPhone":"電話","fGrade":"等級","fSearch":"検索...","colEmail":"メール","colPhone":"電話","colGrade":"等級","colLtv":"LTV","colCnt":"回数","colLast":"最終","tDetail":"詳細","btnRegister":"登録","btnSave":"保存","btnCancel":"キャンセル","btnEmail":"📧 メール","btnKakao":"💬 通知","formNew":"新規顧客","fGradeGen":"一般","gChamp":"チャンピオン","gLoyal":"ロイヤル","gRisk":"リスク","gLost":"離脱","gNew":"新規","gNormal":"一般","gUrgent":"緊急","titDetail":"顧客詳細","lblPhone":"電話","lblAct":"活動","actEmpty":"活動なし","emptyCust":"データなし","segUnit":"人","aiSum1":"AIセグメント","aiSum2":"対象","aiSum3":"予測売上","aiInsight":"AI:","segNew":"新規","segName":"名前","segDesc":"説明","segColor":"色","segCond":"条件","segAdd":"+ 追加","segCreate":"作成","segEmpty":"なし","btnSaving":"保存完了","rfmListTit":"RFMリスト"},
  zh: {"pageTitle":"CRM管理","pageSub":"客户管理","tabCust":"👥 客户","tabAiSeg":"🤖 AI","tabManSeg":"🏷 手动","tabRfm":"📊 RFM","statTot":"总客户","statAct":"活跃","statLtv":"LTV","statSeg":"细分","fName":"姓名","fEmail":"邮箱","fPhone":"电话","fGrade":"等级","fSearch":"搜索...","colEmail":"邮箱","colPhone":"电话","colGrade":"等级","colLtv":"LTV","colCnt":"次数","colLast":"最近","tDetail":"详情","btnRegister":"注册","btnSave":"保存","btnCancel":"取消","btnEmail":"📧 邮件","btnKakao":"💬 通知","formNew":"新客户","fGradeGen":"普通","gChamp":"冠军","gLoyal":"忠诚","gRisk":"风险","gLost":"流失","gNew":"新","gNormal":"普通","gUrgent":"紧急","titDetail":"详情","lblPhone":"电话","lblAct":"活动","actEmpty":"无","emptyCust":"无数据","segUnit":"人","aiSum1":"AI","aiSum2":"目标","aiSum3":"预测","aiInsight":"AI:","segNew":"新建","segName":"名称","segDesc":"描述","segColor":"颜色","segCond":"条件","segAdd":"+ 添加","segCreate":"创建","segEmpty":"无","btnSaving":"已保存","rfmListTit":"RFM列表"},
  "zh-TW": {"pageTitle":"CRM管理","pageSub":"客戶管理","tabCust":"👥 客戶","tabAiSeg":"🤖 AI","tabManSeg":"🏷 手動","tabRfm":"📊 RFM","statTot":"總客戶","statAct":"活躍","statLtv":"LTV","statSeg":"區隔","fName":"姓名","fEmail":"Email","fPhone":"電話","fGrade":"等級","fSearch":"搜尋...","colEmail":"Email","colPhone":"電話","colGrade":"等級","colLtv":"LTV","colCnt":"次數","colLast":"最近","tDetail":"詳情","btnRegister":"註冊","btnSave":"儲存","btnCancel":"取消","btnEmail":"📧 郵件","btnKakao":"💬 通知","formNew":"新客戶","fGradeGen":"一般","gChamp":"冠軍","gLoyal":"忠誠","gRisk":"風險","gLost":"流失","gNew":"新","gNormal":"一般","gUrgent":"緊急","titDetail":"詳情","lblPhone":"電話","lblAct":"活動","actEmpty":"無","emptyCust":"無資料","segUnit":"人","aiSum1":"AI","aiSum2":"目標","aiSum3":"預測","aiInsight":"AI:","segNew":"新建","segName":"名稱","segDesc":"描述","segColor":"顏色","segCond":"條件","segAdd":"+ 新增","segCreate":"建立","segEmpty":"無","btnSaving":"已儲存","rfmListTit":"RFM列表"},
  de: {"pageTitle":"CRM-Dashboard","pageSub":"Kundenverwaltung","tabCust":"👥 Kunden","tabAiSeg":"🤖 AI","tabManSeg":"🏷 Manuell","tabRfm":"📊 RFM","statTot":"Gesamt","statAct":"Aktiv","statLtv":"LTV","statSeg":"Segmente","fName":"Name","fEmail":"E-Mail","fPhone":"Tel.","fGrade":"Stufe","fSearch":"Suche...","colEmail":"E-Mail","colPhone":"Tel.","colGrade":"Stufe","colLtv":"LTV","colCnt":"Käufe","colLast":"Letzte","tDetail":"Detail","btnRegister":"Anlegen","btnSave":"Speichern","btnCancel":"Abbrechen","btnEmail":"📧 E-Mail","btnKakao":"💬 Benachrichtigung","formNew":"Neuer Kunde","fGradeGen":"Normal","gChamp":"Champion","gLoyal":"Treu","gRisk":"Risiko","gLost":"Verloren","gNew":"Neu","gNormal":"Normal","gUrgent":"Dringend","titDetail":"Detail","lblPhone":"Tel.","lblAct":"Aktivität","actEmpty":"Keine","emptyCust":"Keine Daten","segUnit":"Pers.","aiSum1":"AI","aiSum2":"Ziel","aiSum3":"Prognose","aiInsight":"AI:","segNew":"Neu","segName":"Name","segDesc":"Beschreibung","segColor":"Farbe","segCond":"Bedingungen","segAdd":"+ Hinzufügen","segCreate":"Erstellen","segEmpty":"Keine","btnSaving":"Gespeichert","rfmListTit":"RFM-Liste"},
  th: {"pageTitle":"CRM","pageSub":"จัดการลูกค้า","tabCust":"👥 ลูกค้า","tabAiSeg":"🤖 AI","tabManSeg":"🏷 กำหนดเอง","tabRfm":"📊 RFM","statTot":"ทั้งหมด","statAct":"ใช้งาน","statLtv":"LTV","statSeg":"เซกเมนต์","fName":"ชื่อ","fEmail":"อีเมล","fPhone":"โทร","fGrade":"ระดับ","fSearch":"ค้นหา...","colEmail":"อีเมล","colPhone":"โทร","colGrade":"ระดับ","colLtv":"LTV","colCnt":"ครั้ง","colLast":"ล่าสุด","tDetail":"รายละเอียด","btnRegister":"ลงทะเบียน","btnSave":"บันทึก","btnCancel":"ยกเลิก","btnEmail":"📧 อีเมล","btnKakao":"💬 แจ้งเตือน","formNew":"ลูกค้าใหม่","fGradeGen":"ปกติ","gChamp":"แชมป์","gLoyal":"ภักดี","gRisk":"เสี่ยง","gLost":"หายไป","gNew":"ใหม่","gNormal":"ปกติ","gUrgent":"ด่วน","titDetail":"รายละเอียด","lblPhone":"โทร","lblAct":"กิจกรรม","actEmpty":"ไม่มี","emptyCust":"ไม่มีข้อมูล","segUnit":"คน","aiSum1":"AI","aiSum2":"เป้าหมาย","aiSum3":"พยากรณ์","aiInsight":"AI:","segNew":"ใหม่","segName":"ชื่อ","segDesc":"คำอธิบาย","segColor":"สี","segCond":"เงื่อนไข","segAdd":"+ เพิ่ม","segCreate":"สร้าง","segEmpty":"ไม่มี","btnSaving":"บันทึกแล้ว","rfmListTit":"รายการ RFM"},
  vi: {"pageTitle":"CRM","pageSub":"Quản lý khách hàng","tabCust":"👥 Khách hàng","tabAiSeg":"🤖 AI","tabManSeg":"🏷 Thủ công","tabRfm":"📊 RFM","statTot":"Tổng","statAct":"Hoạt động","statLtv":"LTV","statSeg":"Phân khúc","fName":"Tên","fEmail":"Email","fPhone":"SĐT","fGrade":"Hạng","fSearch":"Tìm...","colEmail":"Email","colPhone":"SĐT","colGrade":"Hạng","colLtv":"LTV","colCnt":"Lần","colLast":"Gần nhất","tDetail":"Chi tiết","btnRegister":"Đăng ký","btnSave":"Lưu","btnCancel":"Hủy","btnEmail":"📧 Email","btnKakao":"💬 Thông báo","formNew":"Khách mới","fGradeGen":"Bình thường","gChamp":"Champion","gLoyal":"Trung thành","gRisk":"Rủi ro","gLost":"Mất","gNew":"Mới","gNormal":"Bình thường","gUrgent":"Khẩn","titDetail":"Chi tiết","lblPhone":"SĐT","lblAct":"Hoạt động","actEmpty":"Không có","emptyCust":"Không có dữ liệu","segUnit":"người","aiSum1":"AI","aiSum2":"Mục tiêu","aiSum3":"Dự đoán","aiInsight":"AI:","segNew":"Mới","segName":"Tên","segDesc":"Mô tả","segColor":"Màu","segCond":"Điều kiện","segAdd":"+ Thêm","segCreate":"Tạo","segEmpty":"Chưa có","btnSaving":"Đã lưu","rfmListTit":"Danh sách RFM"},
  id: {"pageTitle":"CRM","pageSub":"Manajemen pelanggan","tabCust":"👥 Pelanggan","tabAiSeg":"🤖 AI","tabManSeg":"🏷 Manual","tabRfm":"📊 RFM","statTot":"Total","statAct":"Aktif","statLtv":"LTV","statSeg":"Segmen","fName":"Nama","fEmail":"Email","fPhone":"Telp","fGrade":"Grade","fSearch":"Cari...","colEmail":"Email","colPhone":"Telp","colGrade":"Grade","colLtv":"LTV","colCnt":"Jumlah","colLast":"Terakhir","tDetail":"Detail","btnRegister":"Daftar","btnSave":"Simpan","btnCancel":"Batal","btnEmail":"📧 Email","btnKakao":"💬 Notifikasi","formNew":"Pelanggan Baru","fGradeGen":"Normal","gChamp":"Champion","gLoyal":"Loyal","gRisk":"Risiko","gLost":"Hilang","gNew":"Baru","gNormal":"Normal","gUrgent":"Mendesak","titDetail":"Detail","lblPhone":"Telp","lblAct":"Aktivitas","actEmpty":"Tidak ada","emptyCust":"Tidak ada data","segUnit":"orang","aiSum1":"AI","aiSum2":"Target","aiSum3":"Prediksi","aiInsight":"AI:","segNew":"Baru","segName":"Nama","segDesc":"Deskripsi","segColor":"Warna","segCond":"Kondisi","segAdd":"+ Tambah","segCreate":"Buat","segEmpty":"Belum ada","btnSaving":"Tersimpan","rfmListTit":"Daftar RFM"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.crm) obj.crm = {};
  const k = baseKeys[lang] || baseKeys.en;
  // Merge WITHOUT overwriting existing guide keys
  Object.entries(k).forEach(([key, val]) => {
    if (!obj.crm[key]) obj.crm[key] = val;
  });
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] crm base keys patched: ${Object.keys(k).length}`);
});
console.log('\n🎉 CRM base keys patched!');
