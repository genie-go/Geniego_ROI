// Add period.* keys to all 15 locale files
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'src/i18n/locales');

const PERIOD_KEYS = {
  ko: { today:'오늘', '7d':'7일', '14d':'14일', '30d':'30일', '90d':'90일', custom:'기간설정', customRange:'기간 직접 설정', startDate:'시작일', endDate:'종료일', apply:'적용' },
  en: { today:'Today', '7d':'7D', '14d':'14D', '30d':'30D', '90d':'90D', custom:'Custom', customRange:'Custom Date Range', startDate:'Start Date', endDate:'End Date', apply:'Apply' },
  ja: { today:'今日', '7d':'7日', '14d':'14日', '30d':'30日', '90d':'90日', custom:'期間設定', customRange:'期間を直接設定', startDate:'開始日', endDate:'終了日', apply:'適用' },
  zh: { today:'今天', '7d':'7天', '14d':'14天', '30d':'30天', '90d':'90天', custom:'自定义', customRange:'自定义日期范围', startDate:'开始日期', endDate:'结束日期', apply:'应用' },
  'zh-TW': { today:'今天', '7d':'7天', '14d':'14天', '30d':'30天', '90d':'90天', custom:'自訂', customRange:'自訂日期範圍', startDate:'開始日期', endDate:'結束日期', apply:'套用' },
  de: { today:'Heute', '7d':'7T', '14d':'14T', '30d':'30T', '90d':'90T', custom:'Benutzerdefiniert', customRange:'Benutzerdefinierter Zeitraum', startDate:'Startdatum', endDate:'Enddatum', apply:'Anwenden' },
  th: { today:'วันนี้', '7d':'7 วัน', '14d':'14 วัน', '30d':'30 วัน', '90d':'90 วัน', custom:'กำหนดเอง', customRange:'กำหนดช่วงเวลา', startDate:'วันเริ่มต้น', endDate:'วันสิ้นสุด', apply:'ใช้งาน' },
  vi: { today:'Hôm nay', '7d':'7 ngày', '14d':'14 ngày', '30d':'30 ngày', '90d':'90 ngày', custom:'Tùy chỉnh', customRange:'Tùy chỉnh khoảng thời gian', startDate:'Ngày bắt đầu', endDate:'Ngày kết thúc', apply:'Áp dụng' },
  id: { today:'Hari ini', '7d':'7 hari', '14d':'14 hari', '30d':'30 hari', '90d':'90 hari', custom:'Kustom', customRange:'Rentang Tanggal Kustom', startDate:'Tanggal Mulai', endDate:'Tanggal Selesai', apply:'Terapkan' },
  es: { today:'Hoy', '7d':'7D', '14d':'14D', '30d':'30D', '90d':'90D', custom:'Personalizado', customRange:'Rango de fechas personalizado', startDate:'Fecha de inicio', endDate:'Fecha de fin', apply:'Aplicar' },
  fr: { today:"Aujourd'hui", '7d':'7J', '14d':'14J', '30d':'30J', '90d':'90J', custom:'Personnalisé', customRange:'Plage de dates personnalisée', startDate:'Date de début', endDate:'Date de fin', apply:'Appliquer' },
  pt: { today:'Hoje', '7d':'7D', '14d':'14D', '30d':'30D', '90d':'90D', custom:'Personalizado', customRange:'Intervalo de datas personalizado', startDate:'Data de início', endDate:'Data de término', apply:'Aplicar' },
  ru: { today:'Сегодня', '7d':'7Д', '14d':'14Д', '30d':'30Д', '90d':'90Д', custom:'Свой период', customRange:'Пользовательский диапазон дат', startDate:'Дата начала', endDate:'Дата окончания', apply:'Применить' },
  ar: { today:'اليوم', '7d':'7 أيام', '14d':'14 يوم', '30d':'30 يوم', '90d':'90 يوم', custom:'مخصص', customRange:'نطاق تاريخ مخصص', startDate:'تاريخ البدء', endDate:'تاريخ الانتهاء', apply:'تطبيق' },
  hi: { today:'आज', '7d':'7 दिन', '14d':'14 दिन', '30d':'30 दिन', '90d':'90 दिन', custom:'कस्टम', customRange:'कस्टम तिथि सीमा', startDate:'प्रारंभ तिथि', endDate:'समाप्ति तिथि', apply:'लागू करें' },
};

// Also add dashboard.* keys for DashOverview KPI labels
const DASH_KEYS = {
  ko: { grossRevenue:'총 매출', adSpend:'광고비', netROAS:'Net ROAS', totalOrders:'총 주문', convRateLbl:'전환율', avgOrder:'AOV', grossRevSub:'전체 채널 합산', adSpendSub:'전체 채널 합산', netROASSub:'순수익 기준', totalOrderSub:'오늘 기준', convRateSub:'평균 전환율' },
  en: { grossRevenue:'Gross Revenue', adSpend:'Ad Spend', netROAS:'Net ROAS', totalOrders:'Total Orders', convRateLbl:'Conv. Rate', avgOrder:'AOV', grossRevSub:'All channels', adSpendSub:'All channels', netROASSub:'Net profit basis', totalOrderSub:'Today', convRateSub:'Avg conversion' },
  ja: { grossRevenue:'総売上', adSpend:'広告費', netROAS:'Net ROAS', totalOrders:'総注文', convRateLbl:'転換率', avgOrder:'AOV', grossRevSub:'全チャネル合計', adSpendSub:'全チャネル合計', netROASSub:'純利益基準', totalOrderSub:'本日基準', convRateSub:'平均転換率' },
  zh: { grossRevenue:'总销售额', adSpend:'广告费', netROAS:'Net ROAS', totalOrders:'总订单', convRateLbl:'转化率', avgOrder:'AOV', grossRevSub:'全渠道合计', adSpendSub:'全渠道合计', netROASSub:'净利润基准', totalOrderSub:'今日基准', convRateSub:'平均转化率' },
  'zh-TW': { grossRevenue:'總銷售額', adSpend:'廣告費', netROAS:'Net ROAS', totalOrders:'總訂單', convRateLbl:'轉換率', avgOrder:'AOV', grossRevSub:'全通路合計', adSpendSub:'全通路合計', netROASSub:'淨利潤基準', totalOrderSub:'今日基準', convRateSub:'平均轉換率' },
  de: { grossRevenue:'Gesamtumsatz', adSpend:'Werbekosten', netROAS:'Net ROAS', totalOrders:'Bestellungen', convRateLbl:'Conv. Rate', avgOrder:'AOV', grossRevSub:'Alle Kanäle', adSpendSub:'Alle Kanäle', netROASSub:'Nettogewinn', totalOrderSub:'Heute', convRateSub:'Ø Konversion' },
  th: { grossRevenue:'รายได้รวม', adSpend:'ค่าโฆษณา', netROAS:'Net ROAS', totalOrders:'คำสั่งซื้อทั้งหมด', convRateLbl:'อัตราการแปลง', avgOrder:'AOV', grossRevSub:'ทุกช่องทาง', adSpendSub:'ทุกช่องทาง', netROASSub:'กำไรสุทธิ', totalOrderSub:'วันนี้', convRateSub:'เฉลี่ย' },
  vi: { grossRevenue:'Tổng doanh thu', adSpend:'Chi phí QC', netROAS:'Net ROAS', totalOrders:'Tổng đơn hàng', convRateLbl:'Tỉ lệ chuyển đổi', avgOrder:'AOV', grossRevSub:'Tất cả kênh', adSpendSub:'Tất cả kênh', netROASSub:'Lợi nhuận ròng', totalOrderSub:'Hôm nay', convRateSub:'TB chuyển đổi' },
  id: { grossRevenue:'Total Pendapatan', adSpend:'Biaya Iklan', netROAS:'Net ROAS', totalOrders:'Total Pesanan', convRateLbl:'Tingkat Konversi', avgOrder:'AOV', grossRevSub:'Semua saluran', adSpendSub:'Semua saluran', netROASSub:'Laba bersih', totalOrderSub:'Hari ini', convRateSub:'Rata-rata' },
  es: { grossRevenue:'Ingresos brutos', adSpend:'Gasto publicitario', netROAS:'Net ROAS', totalOrders:'Pedidos totales', convRateLbl:'Tasa de conv.', avgOrder:'AOV', grossRevSub:'Todos los canales', adSpendSub:'Todos los canales', netROASSub:'Beneficio neto', totalOrderSub:'Hoy', convRateSub:'Conv. promedio' },
  fr: { grossRevenue:'Chiffre d\'affaires', adSpend:'Dépenses pub', netROAS:'Net ROAS', totalOrders:'Total commandes', convRateLbl:'Taux de conv.', avgOrder:'AOV', grossRevSub:'Tous les canaux', adSpendSub:'Tous les canaux', netROASSub:'Bénéfice net', totalOrderSub:'Aujourd\'hui', convRateSub:'Conv. moyenne' },
  pt: { grossRevenue:'Receita bruta', adSpend:'Gasto com anúncios', netROAS:'Net ROAS', totalOrders:'Total de pedidos', convRateLbl:'Taxa de conv.', avgOrder:'AOV', grossRevSub:'Todos os canais', adSpendSub:'Todos os canais', netROASSub:'Lucro líquido', totalOrderSub:'Hoje', convRateSub:'Conv. média' },
  ru: { grossRevenue:'Общая выручка', adSpend:'Расходы на рекламу', netROAS:'Net ROAS', totalOrders:'Всего заказов', convRateLbl:'Конверсия', avgOrder:'AOV', grossRevSub:'Все каналы', adSpendSub:'Все каналы', netROASSub:'Чистая прибыль', totalOrderSub:'Сегодня', convRateSub:'Средняя конверсия' },
  ar: { grossRevenue:'إجمالي الإيرادات', adSpend:'الإنفاق الإعلاني', netROAS:'Net ROAS', totalOrders:'إجمالي الطلبات', convRateLbl:'معدل التحويل', avgOrder:'AOV', grossRevSub:'جميع القنوات', adSpendSub:'جميع القنوات', netROASSub:'صافي الربح', totalOrderSub:'اليوم', convRateSub:'متوسط التحويل' },
  hi: { grossRevenue:'कुल राजस्व', adSpend:'विज्ञापन खर्च', netROAS:'Net ROAS', totalOrders:'कुल ऑर्डर', convRateLbl:'रूपांतरण दर', avgOrder:'AOV', grossRevSub:'सभी चैनल', adSpendSub:'सभी चैनल', netROASSub:'शुद्ध लाभ', totalOrderSub:'आज', convRateSub:'औसत रूपांतरण' },
};

// Also add dash.* keys for DashOverview
const DASH2_KEYS = {
  ko: { vsYesterday:'전일 대비', channelMix:'채널별 매출 비중', liveActivity:'실시간 활동', all:'전체', warnings:'경고', info:'정보', noActivity:'알림이 없습니다', sysStatus:'시스템 현황', securityMonitor:'보안 모니터', secureStatus:'안전', threatDetected:'위협 감지', protected:'보호', active:'활성', blocked:'차단', enforced:'적용', noSecurityIssues:'보안 이슈 없음', crossModuleSummary:'모듈 통합 요약', inventoryValue:'재고 금액', totalStock:'총 재고', lowStockItems:'부족 재고', activeCampaigns:'캠페인', pendingOrders:'대기 주문', settlementChs:'정산 채널', operatingProfit:'영업이익', grossMargin:'마진율', alertCount:'알림', moduleShortcuts:'모듈 바로가기', analyticsModules:'분석 모듈', noChannelData:'채널 데이터 없음' },
  en: { vsYesterday:'vs Yesterday', channelMix:'Channel Revenue Mix', liveActivity:'Live Activity', all:'All', warnings:'Warnings', info:'Info', noActivity:'No notifications', sysStatus:'System Status', securityMonitor:'Security Monitor', secureStatus:'Secure', threatDetected:'Threat Detected', protected:'Protected', active:'Active', blocked:'Blocked', enforced:'Enforced', noSecurityIssues:'No security issues', crossModuleSummary:'Cross-Module Summary', inventoryValue:'Inventory Value', totalStock:'Total Stock', lowStockItems:'Low Stock', activeCampaigns:'Campaigns', pendingOrders:'Pending Orders', settlementChs:'Settlement Channels', operatingProfit:'Op. Profit', grossMargin:'Margin', alertCount:'Alerts', moduleShortcuts:'Module Shortcuts', analyticsModules:'Analytics', noChannelData:'No channel data' },
  ja: { vsYesterday:'前日比', channelMix:'チャネル別売上', liveActivity:'リアルタイム活動', all:'全体', warnings:'警告', info:'情報', noActivity:'通知なし', sysStatus:'システム状況', securityMonitor:'セキュリティモニター', secureStatus:'安全', threatDetected:'脅威検出', protected:'保護', active:'有効', blocked:'ブロック', enforced:'適用', noSecurityIssues:'セキュリティ問題なし', crossModuleSummary:'モジュール統合要約', inventoryValue:'在庫金額', totalStock:'総在庫', lowStockItems:'在庫不足', activeCampaigns:'キャンペーン', pendingOrders:'保留注文', settlementChs:'決済チャネル', operatingProfit:'営業利益', grossMargin:'マージン率', alertCount:'アラート', moduleShortcuts:'モジュールショートカット', analyticsModules:'分析モジュール', noChannelData:'チャネルデータなし' },
  ar: { vsYesterday:'مقارنة بالأمس', channelMix:'توزيع إيرادات القنوات', liveActivity:'النشاط المباشر', all:'الكل', warnings:'تحذيرات', info:'معلومات', noActivity:'لا توجد إشعارات', sysStatus:'حالة النظام', securityMonitor:'مراقب الأمان', secureStatus:'آمن', threatDetected:'تم اكتشاف تهديد', protected:'محمي', active:'نشط', blocked:'محظور', enforced:'مفعّل', noSecurityIssues:'لا توجد مشاكل أمنية', crossModuleSummary:'ملخص الوحدات المتكاملة', inventoryValue:'قيمة المخزون', totalStock:'إجمالي المخزون', lowStockItems:'مخزون منخفض', activeCampaigns:'الحملات', pendingOrders:'طلبات معلقة', settlementChs:'قنوات التسوية', operatingProfit:'الربح التشغيلي', grossMargin:'هامش الربح', alertCount:'التنبيهات', moduleShortcuts:'اختصارات الوحدات', analyticsModules:'التحليلات', noChannelData:'لا توجد بيانات قنوات' },
};

let updated = 0;
const files = fs.readdirSync(LOCALE_DIR).filter(f => f.endsWith('.js'));

for (const file of files) {
  const lang = file.replace('.js', '');
  const filePath = path.join(LOCALE_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Extract the JSON object
  const match = content.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) { console.log(`SKIP ${lang}: no match`); continue; }

  let data;
  try { data = JSON.parse(match[1].replace(/;\s*$/, '')); }
  catch (e) { console.log(`SKIP ${lang}: parse error - ${e.message}`); continue; }

  let changed = false;

  // Add period keys
  const pKeys = PERIOD_KEYS[lang] || PERIOD_KEYS.en;
  if (!data.period) { data.period = {}; changed = true; }
  for (const [k, v] of Object.entries(pKeys)) {
    if (!data.period[k]) { data.period[k] = v; changed = true; }
  }

  // Add dashboard keys
  const dKeys = DASH_KEYS[lang] || DASH_KEYS.en;
  if (!data.dashboard) { data.dashboard = {}; changed = true; }
  for (const [k, v] of Object.entries(dKeys)) {
    if (!data.dashboard[k]) { data.dashboard[k] = v; changed = true; }
  }

  // Add dash keys
  const d2Keys = DASH2_KEYS[lang] || DASH2_KEYS.en;
  if (!data.dash) { data.dash = {}; changed = true; }
  for (const [k, v] of Object.entries(d2Keys)) {
    if (!data.dash[k]) { data.dash[k] = v; changed = true; }
  }

  if (changed) {
    const newContent = 'export default ' + JSON.stringify(data) + ';\n';
    fs.writeFileSync(filePath, newContent, 'utf-8');
    updated++;
    console.log(`✅ ${lang}: period + dashboard + dash keys added`);
  } else {
    console.log(`⏭️ ${lang}: already has all keys`);
  }
}

console.log(`\nDone: ${updated}/${files.length} files updated`);
