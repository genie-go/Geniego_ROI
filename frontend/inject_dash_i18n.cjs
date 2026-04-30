/**
 * inject_dash_i18n.cjs — Inject dash.* i18n keys into 6 locale files
 * Keys: es, fr, pt, ru, ar, hi
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const DASH_KEYS = {
  es: {
    "totalRev":"Ingresos Totales","totalSpend":"Gasto Total","blendedRoas":"ROAS Combinado",
    "activeCh":"Canales Activos","totalClicks":"Clics Totales","avgCtr":"CTR Promedio",
    "allChSummary":"Resumen de Todos los Canales","chRoas":"ROAS por Canal",
    "spendDistribution":"Distribución de Gastos","clickChannelHint":"Haga clic en un canal → Análisis de 5 secciones",
    "chTrend":"Tendencia del Canal","chPerfSumm":"Resumen de Rendimiento del Canal",
    "noChannelData":"No hay datos de canal disponibles","connectChannels":"Conecte canales publicitarios para ver datos de rendimiento",
    "noTrendData":"No hay datos de tendencia disponibles","clickForAnalysis":"Clic → 5 Secciones",
    "chName":"Canal","ctr":"CTR","spendBudget":"Gasto","rev":"Ingresos","convRate":"Conv.","cpc":"CPC",
    "fiveSectionAnalysis":"Análisis de 5 Secciones","adSpend":"Gasto Publicitario",
    "reachAwareness":"1. Alcance y Conciencia","impressions":"Impresiones","reach":"Alcance",
    "frequency":"Frecuencia","cpm":"CPM","engagement2":"2. Interacción","clicks":"Clics",
    "ctrLabel":"CTR","videoViews":"Vistas de Video","avgViewTime":"Tiempo Promedio de Visualización",
    "traffic2":"3. Tráfico","sessions":"Sesiones","bounceRate":"Tasa de Rebote","avgDuration":"Duración Promedio",
    "conv2":"4. Conversión","convCount":"Conversiones","cpa":"CPA","purchaseCount":"Compras",
    "signups":"Registros","cartAdds":"Agregar al Carrito","revRoi2":"5. Ingresos y ROI",
    "adRev":"Ingresos Publicitarios","netProfit":"Beneficio Neto",
    "securityAlert":"Alerta de Seguridad","threatsDetected":"amenazas detectadas",
    "reviewSecurity":"Revisar panel de seguridad","channelPerf":"📊 Rendimiento del Canal",
    "aiAdAnal":"🤖 Análisis de IA","avgRoas":"ROAS Combinado","chCount":"Canales Activos",
    "totalRevenue":"Ingresos Totales"
  },
  fr: {
    "totalRev":"Revenu Total","totalSpend":"Dépense Totale","blendedRoas":"ROAS Combiné",
    "activeCh":"Canaux Actifs","totalClicks":"Clics Totaux","avgCtr":"CTR Moyen",
    "allChSummary":"Résumé de Tous les Canaux","chRoas":"ROAS par Canal",
    "spendDistribution":"Distribution des Dépenses","clickChannelHint":"Cliquez sur un canal → Analyse en 5 sections",
    "chTrend":"Tendance du Canal","chPerfSumm":"Résumé des Performances du Canal",
    "noChannelData":"Aucune donnée de canal disponible","connectChannels":"Connectez les canaux publicitaires pour voir les données",
    "noTrendData":"Aucune donnée de tendance disponible","clickForAnalysis":"Clic → 5 Sections",
    "chName":"Canal","ctr":"CTR","spendBudget":"Dépense","rev":"Revenu","convRate":"Conv.","cpc":"CPC",
    "fiveSectionAnalysis":"Analyse en 5 Sections","adSpend":"Dépense Publicitaire",
    "reachAwareness":"1. Portée et Notoriété","impressions":"Impressions","reach":"Portée",
    "frequency":"Fréquence","cpm":"CPM","engagement2":"2. Engagement","clicks":"Clics",
    "ctrLabel":"CTR","videoViews":"Vues Vidéo","avgViewTime":"Temps de Vue Moyen",
    "traffic2":"3. Trafic","sessions":"Sessions","bounceRate":"Taux de Rebond","avgDuration":"Durée Moyenne",
    "conv2":"4. Conversion","convCount":"Conversions","cpa":"CPA","purchaseCount":"Achats",
    "signups":"Inscriptions","cartAdds":"Ajouts au Panier","revRoi2":"5. Revenu et ROI",
    "adRev":"Revenu Publicitaire","netProfit":"Bénéfice Net",
    "securityAlert":"Alerte de Sécurité","threatsDetected":"menaces détectées",
    "reviewSecurity":"Consulter le panneau de sécurité","channelPerf":"📊 Performance Canal",
    "aiAdAnal":"🤖 Analyse IA","avgRoas":"ROAS Combiné","chCount":"Canaux Actifs",
    "totalRevenue":"Revenu Total"
  },
  pt: {
    "totalRev":"Receita Total","totalSpend":"Gasto Total","blendedRoas":"ROAS Combinado",
    "activeCh":"Canais Ativos","totalClicks":"Cliques Totais","avgCtr":"CTR Médio",
    "allChSummary":"Resumo de Todos os Canais","chRoas":"ROAS por Canal",
    "spendDistribution":"Distribuição de Gastos","clickChannelHint":"Clique em um canal → Análise de 5 seções",
    "chTrend":"Tendência do Canal","chPerfSumm":"Resumo de Desempenho do Canal",
    "noChannelData":"Nenhum dado de canal disponível","connectChannels":"Conecte canais de anúncio para ver dados de desempenho",
    "noTrendData":"Nenhum dado de tendência disponível","clickForAnalysis":"Clique → 5 Seções",
    "chName":"Canal","ctr":"CTR","spendBudget":"Gasto","rev":"Receita","convRate":"Conv.","cpc":"CPC",
    "fiveSectionAnalysis":"Análise de 5 Seções","adSpend":"Gasto em Anúncios",
    "reachAwareness":"1. Alcance e Consciência","impressions":"Impressões","reach":"Alcance",
    "frequency":"Frequência","cpm":"CPM","engagement2":"2. Engajamento","clicks":"Cliques",
    "ctrLabel":"CTR","videoViews":"Visualizações de Vídeo","avgViewTime":"Tempo Médio de Visualização",
    "traffic2":"3. Tráfego","sessions":"Sessões","bounceRate":"Taxa de Rejeição","avgDuration":"Duração Média",
    "conv2":"4. Conversão","convCount":"Conversões","cpa":"CPA","purchaseCount":"Compras",
    "signups":"Cadastros","cartAdds":"Adições ao Carrinho","revRoi2":"5. Receita e ROI",
    "adRev":"Receita de Anúncios","netProfit":"Lucro Líquido",
    "securityAlert":"Alerta de Segurança","threatsDetected":"ameaças detectadas",
    "reviewSecurity":"Consultar painel de segurança","channelPerf":"📊 Desempenho do Canal",
    "aiAdAnal":"🤖 Análise de IA","avgRoas":"ROAS Combinado","chCount":"Canais Ativos",
    "totalRevenue":"Receita Total"
  },
  ru: {
    "totalRev":"Общий доход","totalSpend":"Общий расход","blendedRoas":"Средний ROAS",
    "activeCh":"Активные каналы","totalClicks":"Всего кликов","avgCtr":"Средний CTR",
    "allChSummary":"Сводка по всем каналам","chRoas":"ROAS по каналам",
    "spendDistribution":"Распределение расходов","clickChannelHint":"Нажмите на канал → Анализ в 5 разделах",
    "chTrend":"Тренд канала","chPerfSumm":"Сводка эффективности каналов",
    "noChannelData":"Нет данных по каналам","connectChannels":"Подключите рекламные каналы для просмотра данных",
    "noTrendData":"Нет данных по трендам","clickForAnalysis":"Клик → 5 разделов",
    "chName":"Канал","ctr":"CTR","spendBudget":"Расход","rev":"Доход","convRate":"Конв.","cpc":"CPC",
    "fiveSectionAnalysis":"Анализ в 5 разделах","adSpend":"Рекламный расход",
    "reachAwareness":"1. Охват и осведомлённость","impressions":"Показы","reach":"Охват",
    "frequency":"Частота","cpm":"CPM","engagement2":"2. Вовлечённость","clicks":"Клики",
    "ctrLabel":"CTR","videoViews":"Просмотры видео","avgViewTime":"Ср. время просмотра",
    "traffic2":"3. Трафик","sessions":"Сессии","bounceRate":"Показатель отказов","avgDuration":"Ср. длительность",
    "conv2":"4. Конверсия","convCount":"Конверсии","cpa":"CPA","purchaseCount":"Покупки",
    "signups":"Регистрации","cartAdds":"Добавления в корзину","revRoi2":"5. Доход и ROI",
    "adRev":"Рекламный доход","netProfit":"Чистая прибыль",
    "securityAlert":"Предупреждение безопасности","threatsDetected":"угроз обнаружено",
    "reviewSecurity":"Проверить панель безопасности","channelPerf":"📊 Эффективность каналов",
    "aiAdAnal":"🤖 AI-анализ","avgRoas":"Средний ROAS","chCount":"Активные каналы",
    "totalRevenue":"Общий доход"
  },
  ar: {
    "totalRev":"إجمالي الإيرادات","totalSpend":"إجمالي الإنفاق","blendedRoas":"ROAS المدمج",
    "activeCh":"القنوات النشطة","totalClicks":"إجمالي النقرات","avgCtr":"متوسط CTR",
    "allChSummary":"ملخص جميع القنوات","chRoas":"ROAS حسب القناة",
    "spendDistribution":"توزيع الإنفاق","clickChannelHint":"انقر على قناة → تحليل من 5 أقسام",
    "chTrend":"اتجاه القناة","chPerfSumm":"ملخص أداء القنوات",
    "noChannelData":"لا توجد بيانات قنوات","connectChannels":"اربط قنوات الإعلانات لعرض البيانات",
    "noTrendData":"لا توجد بيانات اتجاه","clickForAnalysis":"انقر → 5 أقسام",
    "chName":"القناة","ctr":"CTR","spendBudget":"الإنفاق","rev":"الإيرادات","convRate":"التحويل","cpc":"CPC",
    "fiveSectionAnalysis":"تحليل من 5 أقسام","adSpend":"الإنفاق الإعلاني",
    "reachAwareness":"1. الوصول والوعي","impressions":"مرات الظهور","reach":"الوصول",
    "frequency":"التكرار","cpm":"CPM","engagement2":"2. التفاعل","clicks":"النقرات",
    "ctrLabel":"CTR","videoViews":"مشاهدات الفيديو","avgViewTime":"متوسط وقت المشاهدة",
    "traffic2":"3. حركة المرور","sessions":"الجلسات","bounceRate":"معدل الارتداد","avgDuration":"متوسط المدة",
    "conv2":"4. التحويل","convCount":"التحويلات","cpa":"CPA","purchaseCount":"المشتريات",
    "signups":"التسجيلات","cartAdds":"إضافات للسلة","revRoi2":"5. الإيرادات والعائد",
    "adRev":"إيرادات الإعلانات","netProfit":"صافي الربح",
    "securityAlert":"تنبيه أمني","threatsDetected":"تهديدات مكتشفة",
    "reviewSecurity":"مراجعة لوحة الأمان","channelPerf":"📊 أداء القنوات",
    "aiAdAnal":"🤖 تحليل الذكاء الاصطناعي","avgRoas":"ROAS المدمج","chCount":"القنوات النشطة",
    "totalRevenue":"إجمالي الإيرادات"
  },
  hi: {
    "totalRev":"कुल राजस्व","totalSpend":"कुल खर्च","blendedRoas":"मिश्रित ROAS",
    "activeCh":"सक्रिय चैनल","totalClicks":"कुल क्लिक","avgCtr":"औसत CTR",
    "allChSummary":"सभी चैनलों का सारांश","chRoas":"चैनल अनुसार ROAS",
    "spendDistribution":"खर्च वितरण","clickChannelHint":"चैनल पर क्लिक करें → 5 खंड विश्लेषण",
    "chTrend":"चैनल रुझान","chPerfSumm":"चैनल प्रदर्शन सारांश",
    "noChannelData":"कोई चैनल डेटा उपलब्ध नहीं","connectChannels":"प्रदर्शन डेटा देखने के लिए विज्ञापन चैनल जोड़ें",
    "noTrendData":"कोई रुझान डेटा उपलब्ध नहीं","clickForAnalysis":"क्लिक → 5 खंड",
    "chName":"चैनल","ctr":"CTR","spendBudget":"खर्च","rev":"राजस्व","convRate":"रूपांतरण","cpc":"CPC",
    "fiveSectionAnalysis":"5 खंड विश्लेषण","adSpend":"विज्ञापन खर्च",
    "reachAwareness":"1. पहुंच और जागरूकता","impressions":"इंप्रेशन","reach":"पहुंच",
    "frequency":"आवृत्ति","cpm":"CPM","engagement2":"2. सहभागिता","clicks":"क्लिक",
    "ctrLabel":"CTR","videoViews":"वीडियो दृश्य","avgViewTime":"औसत देखने का समय",
    "traffic2":"3. ट्रैफ़िक","sessions":"सत्र","bounceRate":"बाउंस दर","avgDuration":"औसत अवधि",
    "conv2":"4. रूपांतरण","convCount":"रूपांतरण","cpa":"CPA","purchaseCount":"खरीदारी",
    "signups":"साइनअप","cartAdds":"कार्ट में जोड़ें","revRoi2":"5. राजस्व और ROI",
    "adRev":"विज्ञापन राजस्व","netProfit":"शुद्ध लाभ",
    "securityAlert":"सुरक्षा चेतावनी","threatsDetected":"खतरे पाए गए",
    "reviewSecurity":"सुरक्षा पैनल देखें","channelPerf":"📊 चैनल प्रदर्शन",
    "aiAdAnal":"🤖 AI विश्लेषण","avgRoas":"मिश्रित ROAS","chCount":"सक्रिय चैनल",
    "totalRevenue":"कुल राजस्व"
  }
};

for (const [lang, keys] of Object.entries(DASH_KEYS)) {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the last closing bracket of the default export object
  // Add dash namespace before the final `}`
  const dashBlock = `\n  // ── Dashboard Marketing i18n ──\n  "dash": {\n${
    Object.entries(keys).map(([k,v]) => `    "${k}": "${v.replace(/"/g, '\\"')}"`).join(',\n')
  }\n  },`;
  
  // Find the first `export default {` and add after
  const exportIdx = content.indexOf('export default {');
  if (exportIdx === -1) {
    console.log(`[SKIP] ${lang}.js — no 'export default {' found`);
    continue;
  }
  
  // Check if dash already exists
  if (content.includes('"dash"') || content.includes("'dash'")) {
    console.log(`[SKIP] ${lang}.js — dash namespace already exists`);
    continue;
  }
  
  // Insert after first `{`
  const braceIdx = content.indexOf('{', exportIdx);
  content = content.slice(0, braceIdx + 1) + dashBlock + content.slice(braceIdx + 1);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] ${lang}.js — injected ${Object.keys(keys).length} dash keys`);
}

console.log('\nDone!');
