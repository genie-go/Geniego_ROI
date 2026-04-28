const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');

// All language-specific reviews base keys that were merged with Korean values
const FIXES = {
ja:{bulkEscalate:"ネガティブレビュー一括エスカレーション",bulkGenReply:"一括AI返信生成",kpiTotal:"全レビュー",kpiAvgRating:"平均評価",kpiNegative:"ネガティブレビュー",kpiNegativeSub:"即時対応必要",kpiAiReply:"AI返信完了",kpiAiReplySub:"全体",unitItems:"件",unitCount:"件",inProgress:"進行中",escalationCount:"エスカレーション",channelRatingTitle:"チャネル別評価",positive:"ポジティブ",negative:"ネガティブ",totalCount:"全体",negKeywordsTitle:"ネガティブキーワードTop 5",autoAlertActive:"自動アラート有効",autoAlertDesc:"ネガティブキーワード急増時Slackに自動通知",feedTitle:"レビューフィード",feedSub:"AI返信案・CSエスカレーション",allChannel:"全チャネル",allSentiment:"全感情",filterPositive:"ポジティブ",filterNeutral:"ニュートラル",filterNegative:"ネガティブ",searchPlaceholder:"検索...",sentiment_positive:"ポジティブ",sentiment_neutral:"ニュートラル",sentiment_negative:"ネガティブ",csAssigned:"CS配置済み",foundHelpful:"人が役立った",regenReply:"AI返信再生成",draftReply:"AI返信案",csEscalate:"CSエスカレーション",hideReply:"返信を隠す",showReply:"返信を表示",aiGenerated:"AI生成返信案",copy:"コピー",aiDisclaimer:"AI生成案です。送信前に確認してください。",draftGenerated:"AI返信生成完了",copied:"コピーしました",escalated:"CSエスカレーション完了",escalationTitle:"危険レビュー確認",escalationBody:"迅速な処理が必要です。",close:"閉じる"},
zh:{bulkEscalate:"批量升级差评",bulkGenReply:"批量AI回复生成",kpiTotal:"全部评论",kpiAvgRating:"平均评分",kpiNegative:"差评",kpiNegativeSub:"需立即处理",kpiAiReply:"AI回复完成",kpiAiReplySub:"全部",unitItems:"条",unitCount:"条",inProgress:"进行中",escalationCount:"已升级",channelRatingTitle:"渠道评分概览",positive:"正面",negative:"负面",totalCount:"总计",negKeywordsTitle:"负面关键词Top 5",autoAlertActive:"自动通知已激活",autoAlertDesc:"负面关键词激增时自动发送到Slack",feedTitle:"评论动态",feedSub:"AI回复草稿·CS升级",allChannel:"全部渠道",allSentiment:"全部情感",filterPositive:"正面",filterNeutral:"中性",filterNegative:"负面",searchPlaceholder:"搜索...",sentiment_positive:"正面",sentiment_neutral:"中性",sentiment_negative:"负面",csAssigned:"CS已分配",foundHelpful:"人觉得有帮助",regenReply:"重新生成AI回复",draftReply:"AI回复草稿",csEscalate:"CS升级",hideReply:"隐藏回复",showReply:"显示回复",aiGenerated:"AI生成回复草稿",copy:"复制",aiDisclaimer:"AI生成草稿，请审核后发送。",draftGenerated:"AI回复已生成",copied:"已复制",escalated:"CS升级完成",escalationTitle:"风险评论",escalationBody:"需要紧急处理。",close:"关闭"},
"zh-TW":{bulkEscalate:"批次升級差評",bulkGenReply:"批次AI回覆生成",kpiTotal:"全部評論",kpiAvgRating:"平均評分",kpiNegative:"差評",kpiNegativeSub:"需立即處理",kpiAiReply:"AI回覆完成",kpiAiReplySub:"全部",unitItems:"條",unitCount:"條",inProgress:"進行中",escalationCount:"已升級",channelRatingTitle:"頻道評分概覽",positive:"正面",negative:"負面",totalCount:"總計",negKeywordsTitle:"負面關鍵字Top 5",autoAlertActive:"自動通知已啟用",autoAlertDesc:"負面關鍵字激增時自動發送到Slack",feedTitle:"評論動態",feedSub:"AI回覆草稿·CS升級",allChannel:"全部頻道",allSentiment:"全部情感",filterPositive:"正面",filterNeutral:"中性",filterNegative:"負面",searchPlaceholder:"搜尋...",sentiment_positive:"正面",sentiment_neutral:"中性",sentiment_negative:"負面",csAssigned:"CS已分配",foundHelpful:"人覺得有幫助",regenReply:"重新生成AI回覆",draftReply:"AI回覆草稿",csEscalate:"CS升級",hideReply:"隱藏回覆",showReply:"顯示回覆",aiGenerated:"AI生成回覆草稿",copy:"複製",aiDisclaimer:"AI生成草稿，請審核後發送。",draftGenerated:"AI回覆已生成",copied:"已複製",escalated:"CS升級完成",escalationTitle:"風險評論",escalationBody:"需要緊急處理。",close:"關閉"},
de:{bulkEscalate:"Masseneskalation negativer Bewertungen",bulkGenReply:"Massen-KI-Antwort",kpiTotal:"Alle Bewertungen",kpiAvgRating:"Durchschnittsbewertung",kpiNegative:"Negative Bewertungen",kpiNegativeSub:"Sofortige Aktion erforderlich",kpiAiReply:"KI-Antwort abgeschlossen",kpiAiReplySub:"Gesamt",unitItems:"Fälle",unitCount:" ",inProgress:"In Bearbeitung",escalationCount:"Eskaliert",channelRatingTitle:"Kanalbewertungsübersicht",positive:"Positiv",negative:"Negativ",totalCount:"Gesamt",negKeywordsTitle:"Negative Keywords Top 5",autoAlertActive:"Auto-Alert aktiv",autoAlertDesc:"Automatische Benachrichtigung bei Keyword-Anstieg",feedTitle:"Bewertungs-Feed",feedSub:"KI-Antwortentwürfe · CS-Eskalation",allChannel:"Alle Kanäle",allSentiment:"Alle Stimmungen",filterPositive:"Positiv",filterNeutral:"Neutral",filterNegative:"Negativ",searchPlaceholder:"Suchen...",sentiment_positive:"Positiv",sentiment_neutral:"Neutral",sentiment_negative:"Negativ",csAssigned:"CS zugewiesen",foundHelpful:"fanden dies hilfreich",regenReply:"KI-Antwort neu generieren",draftReply:"KI-Antwortentwurf",csEscalate:"CS-Eskalation",hideReply:"Antwort ausblenden",showReply:"Antwort anzeigen",aiGenerated:"KI-generierter Antwortentwurf",copy:"Kopieren",aiDisclaimer:"KI-generierter Entwurf. Bitte vor dem Senden prüfen.",draftGenerated:"KI-Antwort generiert",copied:"In Zwischenablage kopiert",escalated:"CS-Eskalation abgeschlossen",escalationTitle:"Kritische Bewertung",escalationBody:"Sofortige Bearbeitung erforderlich.",close:"Schließen"},
th:{bulkEscalate:"ยกระดับรีวิวเชิงลบทั้งหมด",bulkGenReply:"สร้างตอบ AI ทั้งหมด",kpiTotal:"รีวิวทั้งหมด",kpiAvgRating:"คะแนนเฉลี่ย",kpiNegative:"รีวิวเชิงลบ",kpiNegativeSub:"ต้องดำเนินการทันที",kpiAiReply:"AI ตอบเสร็จ",kpiAiReplySub:"ทั้งหมด",unitItems:"รายการ",unitCount:" ",inProgress:"กำลังดำเนินการ",escalationCount:"ยกระดับแล้ว",channelRatingTitle:"ภาพรวมคะแนนช่อง",positive:"บวก",negative:"ลบ",totalCount:"ทั้งหมด",negKeywordsTitle:"คีย์เวิร์ดเชิงลบ Top 5",autoAlertActive:"แจ้งเตือนอัตโนมัติ",autoAlertDesc:"แจ้งเตือน Slack เมื่อคีย์เวิร์ดเชิงลบเพิ่มขึ้น",feedTitle:"ฟีดรีวิว",feedSub:"ร่างตอบ AI · ยกระดับ CS",allChannel:"ทุกช่อง",allSentiment:"ทุกความรู้สึก",filterPositive:"บวก",filterNeutral:"กลาง",filterNegative:"ลบ",searchPlaceholder:"ค้นหา...",sentiment_positive:"บวก",sentiment_neutral:"กลาง",sentiment_negative:"ลบ",csAssigned:"CS ได้รับมอบหมาย",foundHelpful:"พบว่ามีประโยชน์",regenReply:"สร้าง AI ใหม่",draftReply:"ร่าง AI",csEscalate:"ยกระดับ CS",hideReply:"ซ่อนตอบ",showReply:"แสดงตอบ",aiGenerated:"ร่างตอบ AI",copy:"คัดลอก",aiDisclaimer:"ร่าง AI กรุณาตรวจสอบก่อนส่ง",draftGenerated:"สร้าง AI เสร็จ",copied:"คัดลอกแล้ว",escalated:"ยกระดับ CS เสร็จ",escalationTitle:"รีวิววิกฤต",escalationBody:"ต้องดำเนินการทันที",close:"ปิด"},
vi:{bulkEscalate:"Nâng cấp hàng loạt đánh giá tiêu cực",bulkGenReply:"Tạo trả lời AI hàng loạt",kpiTotal:"Tổng đánh giá",kpiAvgRating:"Điểm trung bình",kpiNegative:"Đánh giá tiêu cực",kpiNegativeSub:"Cần xử lý ngay",kpiAiReply:"AI đã trả lời",kpiAiReplySub:"Tổng",unitItems:"đánh giá",unitCount:" ",inProgress:"Đang xử lý",escalationCount:"Đã nâng cấp",channelRatingTitle:"Điểm kênh tổng quan",positive:"Tích cực",negative:"Tiêu cực",totalCount:"Tổng",negKeywordsTitle:"Từ khóa tiêu cực Top 5",autoAlertActive:"Cảnh báo tự động",autoAlertDesc:"Thông báo Slack khi từ khóa tiêu cực tăng",feedTitle:"Nguồn đánh giá",feedSub:"Bản nháp AI · Nâng cấp CS",allChannel:"Tất cả kênh",allSentiment:"Tất cả cảm xúc",filterPositive:"Tích cực",filterNeutral:"Trung lập",filterNegative:"Tiêu cực",searchPlaceholder:"Tìm kiếm...",sentiment_positive:"Tích cực",sentiment_neutral:"Trung lập",sentiment_negative:"Tiêu cực",csAssigned:"CS đã phân công",foundHelpful:"thấy hữu ích",regenReply:"Tạo lại AI",draftReply:"Bản nháp AI",csEscalate:"Nâng cấp CS",hideReply:"Ẩn trả lời",showReply:"Hiện trả lời",aiGenerated:"Bản nháp AI",copy:"Sao chép",aiDisclaimer:"Bản nháp AI. Vui lòng kiểm tra trước khi gửi.",draftGenerated:"Đã tạo AI",copied:"Đã sao chép",escalated:"Nâng cấp CS hoàn tất",escalationTitle:"Đánh giá nguy hiểm",escalationBody:"Cần xử lý ngay.",close:"Đóng"},
id:{bulkEscalate:"Eskalasi Massal Ulasan Negatif",bulkGenReply:"Pembuatan Balasan AI Massal",kpiTotal:"Total Ulasan",kpiAvgRating:"Peringkat Rata-rata",kpiNegative:"Ulasan Negatif",kpiNegativeSub:"Perlu Tindakan Segera",kpiAiReply:"Balasan AI Selesai",kpiAiReplySub:"Total",unitItems:"ulasan",unitCount:" ",inProgress:"Sedang Berlangsung",escalationCount:"Dieskalasi",channelRatingTitle:"Ikhtisar Peringkat Saluran",positive:"Positif",negative:"Negatif",totalCount:"Total",negKeywordsTitle:"Kata Kunci Negatif Top 5",autoAlertActive:"Peringatan Otomatis Aktif",autoAlertDesc:"Notifikasi otomatis saat kata kunci negatif melonjak",feedTitle:"Feed Ulasan",feedSub:"Draf Balasan AI · Eskalasi CS",allChannel:"Semua Saluran",allSentiment:"Semua Sentimen",filterPositive:"Positif",filterNeutral:"Netral",filterNegative:"Negatif",searchPlaceholder:"Cari...",sentiment_positive:"Positif",sentiment_neutral:"Netral",sentiment_negative:"Negatif",csAssigned:"CS Ditugaskan",foundHelpful:"merasa terbantu",regenReply:"Regenerasi Balasan AI",draftReply:"Draf Balasan AI",csEscalate:"Eskalasi CS",hideReply:"Sembunyikan Balasan",showReply:"Tampilkan Balasan",aiGenerated:"Draf Balasan AI",copy:"Salin",aiDisclaimer:"Draf AI. Harap tinjau sebelum mengirim.",draftGenerated:"Balasan AI Dibuat",copied:"Disalin ke clipboard",escalated:"Eskalasi CS Selesai",escalationTitle:"Ulasan Kritis",escalationBody:"Perlu tindakan segera.",close:"Tutup"}
};

Object.entries(FIXES).forEach(([lang, keys]) => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  let fixCount = 0;
  
  for (const [key, value] of Object.entries(keys)) {
    const keyStr = `${key}:"`;
    const keyIdx = code.indexOf(keyStr);
    if (keyIdx < 0) continue;
    
    const openQ = keyIdx + keyStr.length - 1;
    let closeQ = -1;
    for (let i = openQ + 1; i < code.length; i++) {
      if (code[i] === '\\') { i++; continue; }
      if (code[i] === '"') { closeQ = i; break; }
    }
    if (closeQ < 0) continue;
    
    const old = code.substring(openQ + 1, closeQ);
    if (old !== value) {
      code = code.substring(0, openQ + 1) + value + code.substring(closeQ);
      fixCount++;
    }
  }
  
  fs.writeFileSync(file, code, 'utf8');
  
  try {
    const fn = new Function(code.replace('export default', 'return'));
    fn();
    console.log(`✅ ${lang}: ${fixCount} keys fixed`);
  } catch (e) {
    console.log(`❌ ${lang}: ${e.message.substring(0, 80)}`);
  }
});
