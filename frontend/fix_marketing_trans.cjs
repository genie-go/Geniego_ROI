const fs = require('fs');

// Fix marketing locale keys that are in English in non-English locales
// Also add missing CampaignTab KPI keys to all locales

const MARKETING_TRANSLATIONS = {
  ko: {
    aiHubTitle: "AI 마케팅 허브 먼저 확인하세요",
    aiHubDesc1: "재고, 주문, CRM, 정산 데이터를 자동 분석하여 ",
    aiHubDesc2: "ROI 기반 즉시 실행 가능한 추천",
    aiHubDesc3: "을 제공합니다.",
    aiHubDesc4: "직접 전략을 설계하려면 아래 설정을 진행하세요.",
    aiHubBtn: "AI 마케팅 허브",
    creativeAutoSync: "AI 광고소재 카테고리 → 캠페인 설정 자동 연동",
    creativeSyncDesc1: "카테고리를 선택하고 ",
    creativeSyncBtn: "캠페인 설정으로 이동",
    creativeSyncDesc2: " 버튼을 클릭하면 선택한 카테고리가 ",
    creativeSyncDesc3: "자동으로 연동",
    creativeSyncDesc4: "됩니다.",
    creativeGoSetup: "캠페인 설정으로 이동",
    aiRecommendBadge: "AI 추천 채널 자동 선택 · 직접 변경 가능",
    colTotalAdSpend: "총 광고비",
    colBlendedRoas: "통합 ROAS",
    colTotalConv: "총 전환수",
    colActivePlatforms: "활성 플랫폼",
  },
  en: {
    aiHubTitle: "Check AI Marketing Hub First",
    aiHubDesc1: "Automatically analyzes inventory, orders, CRM, and settlement data to provide ",
    aiHubDesc2: "ROI-based immediately actionable recommendations",
    aiHubDesc3: ".",
    aiHubDesc4: "To design your own strategy, proceed with the settings below.",
    aiHubBtn: "AI Marketing Hub",
    creativeAutoSync: "AI Ad Creative Category → Campaign Setup Auto-Sync",
    creativeSyncDesc1: "Select a category and click the ",
    creativeSyncBtn: "Go to Campaign Setup",
    creativeSyncDesc2: " button and the selected category will be ",
    creativeSyncDesc3: "automatically synced",
    creativeSyncDesc4: " to the campaign setup.",
    creativeGoSetup: "Go to Campaign Setup",
    aiRecommendBadge: "AI Recommended Channels Auto-Selected · You Can Modify",
    colTotalAdSpend: "Total Ad Spend",
    colBlendedRoas: "Blended ROAS",
    colTotalConv: "Total Conversions",
    colActivePlatforms: "Active Platforms",
  },
  ja: {
    aiHubTitle: "AIマーケティングハブを先に確認してください",
    aiHubDesc1: "在庫、注文、CRM、精算データを自動分析して",
    aiHubDesc2: "ROI ベースの即実行可能な推薦",
    aiHubDesc3: "を提供します。",
    aiHubDesc4: "自分で戦略を設計する場合は、以下の設定を進めてください。",
    aiHubBtn: "AIマーケティングハブ",
    creativeAutoSync: "AI広告クリエイティブカテゴリ → キャンペーン設定自動連携",
    creativeSyncDesc1: "カテゴリを選択して ",
    creativeSyncBtn: "キャンペーン設定へ移動",
    creativeSyncDesc2: " ボタンをクリックすると、選択したカテゴリが ",
    creativeSyncDesc3: "自動的に連携",
    creativeSyncDesc4: "されます。",
    creativeGoSetup: "キャンペーン設定へ移動",
    aiRecommendBadge: "AIおすすめチャネル自動選択 · 変更可能",
    colTotalAdSpend: "広告費合計",
    colBlendedRoas: "統合ROAS",
    colTotalConv: "総コンバージョン",
    colActivePlatforms: "稼働プラットフォーム",
  },
  zh: {
    aiHubTitle: "请先查看AI营销中心",
    aiHubDesc1: "自动分析库存、订单、CRM和结算数据，提供",
    aiHubDesc2: "基于ROI的即时可执行建议",
    aiHubDesc3: "。",
    aiHubDesc4: "如需自行设计策略，请继续下方设置。",
    aiHubBtn: "AI营销中心",
    creativeAutoSync: "AI广告素材类目 → 广告活动设置自动同步",
    creativeSyncDesc1: "选择类目并点击",
    creativeSyncBtn: "前往广告活动设置",
    creativeSyncDesc2: "按钮，所选类目将",
    creativeSyncDesc3: "自动同步",
    creativeSyncDesc4: "到广告活动设置。",
    creativeGoSetup: "前往广告活动设置",
    aiRecommendBadge: "AI推荐渠道已自动选择 · 可手动修改",
    colTotalAdSpend: "广告总费用",
    colBlendedRoas: "综合ROAS",
    colTotalConv: "总转化数",
    colActivePlatforms: "活跃平台数",
  },
  de: {
    aiHubTitle: "Zuerst AI Marketing Hub prüfen",
    aiHubDesc1: "Analysiert automatisch Inventar, Bestellungen, CRM und Abrechnungsdaten, um ",
    aiHubDesc2: "ROI-basierte sofort umsetzbare Empfehlungen",
    aiHubDesc3: " bereitzustellen.",
    aiHubDesc4: "Um Ihre eigene Strategie zu entwickeln, fahren Sie mit den Einstellungen unten fort.",
    aiHubBtn: "AI Marketing Hub",
    creativeAutoSync: "KI-Anzeigenkreativ-Kategorie → Kampagneneinrichtung Auto-Sync",
    creativeSyncDesc1: "Kategorie auswählen und auf ",
    creativeSyncBtn: "Zur Kampagneneinrichtung",
    creativeSyncDesc2: " klicken – die gewählte Kategorie wird ",
    creativeSyncDesc3: "automatisch synchronisiert",
    creativeSyncDesc4: ".",
    creativeGoSetup: "Zur Kampagneneinrichtung",
    aiRecommendBadge: "KI-empfohlene Kanäle automatisch ausgewählt · Anpassbar",
    colTotalAdSpend: "Gesamte Werbeausgaben",
    colBlendedRoas: "Gemischter ROAS",
    colTotalConv: "Gesamte Konversionen",
    colActivePlatforms: "Aktive Plattformen",
  },
  th: {
    aiHubTitle: "ตรวจสอบ AI Marketing Hub ก่อน",
    aiHubDesc1: "วิเคราะห์ข้อมูลสินค้าคงคลัง คำสั่งซื้อ CRM และการชำระเงินโดยอัตโนมัติ เพื่อให้",
    aiHubDesc2: "คำแนะนำที่ดำเนินการได้ทันทีตาม ROI",
    aiHubDesc3: ".",
    aiHubDesc4: "หากต้องการออกแบบกลยุทธ์ของคุณเอง ดำเนินการตั้งค่าด้านล่าง",
    aiHubBtn: "AI Marketing Hub",
    creativeAutoSync: "หมวดหมู่ครีเอทีฟโฆษณา AI → ซิงก์อัตโนมัติกับการตั้งค่าแคมเปญ",
    creativeSyncDesc1: "เลือกหมวดหมู่และคลิก ",
    creativeSyncBtn: "ไปที่การตั้งค่าแคมเปญ",
    creativeSyncDesc2: " หมวดหมู่ที่เลือกจะถูก",
    creativeSyncDesc3: "ซิงก์โดยอัตโนมัติ",
    creativeSyncDesc4: "ไปยังการตั้งค่าแคมเปญ",
    creativeGoSetup: "ไปที่การตั้งค่าแคมเปญ",
    aiRecommendBadge: "ช่องทางที่แนะนำโดย AI ถูกเลือกอัตโนมัติ · แก้ไขได้",
    colTotalAdSpend: "ค่าโฆษณารวม",
    colBlendedRoas: "ROAS รวม",
    colTotalConv: "Conversion ทั้งหมด",
    colActivePlatforms: "แพลตฟอร์มที่ใช้งาน",
  },
  vi: {
    aiHubTitle: "Kiểm tra AI Marketing Hub trước",
    aiHubDesc1: "Tự động phân tích dữ liệu kho, đơn hàng, CRM và thanh toán để cung cấp ",
    aiHubDesc2: "đề xuất có thể thực hiện ngay dựa trên ROI",
    aiHubDesc3: ".",
    aiHubDesc4: "Để tự thiết kế chiến lược, hãy tiếp tục với các cài đặt bên dưới.",
    aiHubBtn: "AI Marketing Hub",
    creativeAutoSync: "Danh mục quảng cáo AI → Đồng bộ tự động cài đặt chiến dịch",
    creativeSyncDesc1: "Chọn danh mục và nhấp ",
    creativeSyncBtn: "Đến Cài đặt Chiến dịch",
    creativeSyncDesc2: " nút, danh mục đã chọn sẽ được ",
    creativeSyncDesc3: "tự động đồng bộ",
    creativeSyncDesc4: " vào cài đặt chiến dịch.",
    creativeGoSetup: "Đến Cài đặt Chiến dịch",
    aiRecommendBadge: "Kênh được AI đề xuất đã tự động chọn · Có thể thay đổi",
    colTotalAdSpend: "Tổng chi phí quảng cáo",
    colBlendedRoas: "ROAS tổng hợp",
    colTotalConv: "Tổng chuyển đổi",
    colActivePlatforms: "Nền tảng đang hoạt động",
  },
  id: {
    aiHubTitle: "Periksa AI Marketing Hub Terlebih Dahulu",
    aiHubDesc1: "Secara otomatis menganalisis inventaris, pesanan, CRM, dan data penyelesaian untuk memberikan ",
    aiHubDesc2: "rekomendasi ROI yang dapat segera ditindaklanjuti",
    aiHubDesc3: ".",
    aiHubDesc4: "Untuk merancang strategi Anda sendiri, lanjutkan dengan pengaturan di bawah.",
    aiHubBtn: "AI Marketing Hub",
    creativeAutoSync: "Kategori Kreatif Iklan AI → Sinkronisasi Otomatis Pengaturan Kampanye",
    creativeSyncDesc1: "Pilih kategori dan klik ",
    creativeSyncBtn: "Buka Pengaturan Kampanye",
    creativeSyncDesc2: " tombol, kategori yang dipilih akan ",
    creativeSyncDesc3: "otomatis disinkronkan",
    creativeSyncDesc4: " ke pengaturan kampanye.",
    creativeGoSetup: "Buka Pengaturan Kampanye",
    aiRecommendBadge: "Saluran yang Direkomendasikan AI Dipilih Otomatis · Dapat Diubah",
    colTotalAdSpend: "Total Belanja Iklan",
    colBlendedRoas: "ROAS Gabungan",
    colTotalConv: "Total Konversi",
    colActivePlatforms: "Platform Aktif",
  },
  'zh-TW': {
    aiHubTitle: "請先查看AI行銷中心",
    aiHubDesc1: "自動分析庫存、訂單、CRM和結算資料，提供",
    aiHubDesc2: "基於ROI的即時可執行建議",
    aiHubDesc3: "。",
    aiHubDesc4: "如需自行設計策略，請繼續下方設定。",
    aiHubBtn: "AI行銷中心",
    creativeAutoSync: "AI廣告素材類別 → 廣告活動設定自動同步",
    creativeSyncDesc1: "選擇類別並點擊",
    creativeSyncBtn: "前往廣告活動設定",
    creativeSyncDesc2: "按鈕，所選類別將",
    creativeSyncDesc3: "自動同步",
    creativeSyncDesc4: "到廣告活動設定。",
    creativeGoSetup: "前往廣告活動設定",
    aiRecommendBadge: "AI推薦頻道已自動選擇 · 可手動修改",
    colTotalAdSpend: "廣告總費用",
    colBlendedRoas: "綜合ROAS",
    colTotalConv: "總轉化數",
    colActivePlatforms: "活躍平台數",
  },
};

const LOCALE_FILES = {
  ko: 'src/i18n/locales/ko.js',
  en: 'src/i18n/locales/en.js',
  ja: 'src/i18n/locales/ja.js',
  zh: 'src/i18n/locales/zh.js',
  de: 'src/i18n/locales/de.js',
  th: 'src/i18n/locales/th.js',
  vi: 'src/i18n/locales/vi.js',
  id: 'src/i18n/locales/id.js',
  'zh-TW': 'src/i18n/locales/zh-TW.js',
};

const VAR_NAMES = {
  ko:'ko', en:'en', ja:'ja', zh:'zh', de:'de', th:'th', vi:'vi', id:'id', 'zh-TW':'zhTW'
};

for (const [lang, trans] of Object.entries(MARKETING_TRANSLATIONS)) {
  const fp = LOCALE_FILES[lang];
  const v = VAR_NAMES[lang];
  if (!fp || !fs.existsSync(fp)) continue;
  
  let c = fs.readFileSync(fp, 'utf8');
  let changed = false;
  
  for (const [key, value] of Object.entries(trans)) {
    // Check if key exists in marketing object with the right value
    // Pattern: "aiHubTitle": "..." or 'aiHubTitle': '...'
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexDQ = new RegExp(`("${escapedKey}"\\s*:\\s*)"[^"]*"`, 'g');
    const regexSQ = new RegExp(`('${escapedKey}'\\s*:\\s*)'[^']*'`, 'g');
    
    if (regexDQ.test(c)) {
      c = c.replace(new RegExp(`("${escapedKey}"\\s*:\\s*)"[^"]*"`, 'g'), `$1"${value}"`);
      changed = true;
    } else if (regexSQ.test(c)) {
      c = c.replace(new RegExp(`('${escapedKey}'\\s*:\\s*)'[^']*'`, 'g'), `$1'${value}'`);
      changed = true;
    }
    // Key doesn't exist - will be added later via Object.assign
  }
  
  // Also build a patch for any missing keys
  const missingEntries = Object.entries(trans).filter(([key]) => {
    return !c.includes('"'+key+'"') && !c.includes("'"+key+"'");
  });
  
  if (missingEntries.length > 0) {
    // Add as marketing Object.assign before export default
    const patch = `\n${v}.marketing = Object.assign(${v}.marketing || {}, {\n` +
      missingEntries.map(([k, val]) => `    "${k}": "${val.replace(/"/g, '\\"')}"`).join(',\n') +
      '\n});\n';
    
    const expIdx = c.lastIndexOf(`\nexport default ${v}`);
    if (expIdx >= 0) {
      c = c.slice(0, expIdx) + patch + c.slice(expIdx);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`✅ ${lang}: updated (${missingEntries.length} added, ${Object.keys(trans).length - missingEntries.length} updated)`);
  } else {
    console.log(`⏭ ${lang}: no changes needed`);
  }
}

console.log('\nDone!');
