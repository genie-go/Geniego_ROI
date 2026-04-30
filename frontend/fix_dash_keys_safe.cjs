/**
 * fix_dash_keys_safe.cjs — Fix English fallback dash keys in 5 locale files (Node.js safe)
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const FIXES = {
  es: [
    ['"totalRev": "Total Revenue"', '"totalRev": "Ingresos Totales"'],
    ['"totalSpend": "Total Spend"', '"totalSpend": "Gasto Total"'],
    ['"blendedRoas": "Blended ROAS"', '"blendedRoas": "ROAS Combinado"'],
    ['"activeCh": "Active Channels"', '"activeCh": "Canales Activos"'],
    ['"totalClicks": "Total Clicks"', '"totalClicks": "Clics Totales"'],
    ['"avgCtr": "Avg CTR"', '"avgCtr": "CTR Promedio"'],
    ['"allChSummary": "All Channel Summary"', '"allChSummary": "Resumen de Canales"'],
    ['"allChSummary": "ALL CHANNEL SUMMARY"', '"allChSummary": "Resumen de Canales"'],
    ['"chTrend": "Channel Trend"', '"chTrend": "Tendencia del Canal"'],
    ['"chPerfSumm": "Channel Performance Summary"', '"chPerfSumm": "Rendimiento del Canal"'],
    ['"chName": "CHANNEL"', '"chName": "Canal"'],
    ['"rev": "Revenue"', '"rev": "Ingresos"'],
    ['"convRate": "Conv. Rate"', '"convRate": "Tasa Conv."'],
    ['"female": "Female"', '"female": "Femenino"'],
    ['"male": "Male"', '"male": "Masculino"'],
    ['"adSpend": "Ad Spend"', '"adSpend": "Gasto Publicitario"'],
    ['"netProfit": "Net Profit"', '"netProfit": "Beneficio Neto"'],
    ['"noChannelData": "No channel data"', '"noChannelData": "Sin datos de canal"'],
    ['"noTrendData": "No trend data available"', '"noTrendData": "Sin datos de tendencia"'],
    ['"noTrendData": "No trend data"', '"noTrendData": "Sin datos de tendencia"'],
  ],
  fr: [
    ['"totalRev": "Total Revenue"', '"totalRev": "Revenu Total"'],
    ['"totalSpend": "Total Spend"', '"totalSpend": "Dépense Totale"'],
    ['"blendedRoas": "Blended ROAS"', '"blendedRoas": "ROAS Combiné"'],
    ['"activeCh": "Active Channels"', '"activeCh": "Canaux Actifs"'],
    ['"totalClicks": "Total Clicks"', '"totalClicks": "Clics Totaux"'],
    ['"avgCtr": "Avg CTR"', '"avgCtr": "CTR Moyen"'],
    ['"allChSummary": "All Channel Summary"', '"allChSummary": "Résumé des Canaux"'],
    ['"allChSummary": "ALL CHANNEL SUMMARY"', '"allChSummary": "Résumé des Canaux"'],
    ['"chTrend": "Channel Trend"', '"chTrend": "Tendance du Canal"'],
    ['"chPerfSumm": "Channel Performance Summary"', '"chPerfSumm": "Performance des Canaux"'],
    ['"chName": "CHANNEL"', '"chName": "Canal"'],
    ['"rev": "Revenue"', '"rev": "Revenu"'],
    ['"convRate": "Conv. Rate"', '"convRate": "Taux Conv."'],
    ['"female": "Female"', '"female": "Femme"'],
    ['"male": "Male"', '"male": "Homme"'],
    ['"adSpend": "Ad Spend"', '"adSpend": "Dépense Pub."'],
    ['"netProfit": "Net Profit"', '"netProfit": "Bénéfice Net"'],
    ['"noChannelData": "No channel data"', '"noChannelData": "Aucune donnée"'],
    ['"noTrendData": "No trend data available"', '"noTrendData": "Aucune donnée de tendance"'],
    ['"noTrendData": "No trend data"', '"noTrendData": "Aucune donnée de tendance"'],
  ],
  pt: [
    ['"totalRev": "Total Revenue"', '"totalRev": "Receita Total"'],
    ['"totalSpend": "Total Spend"', '"totalSpend": "Gasto Total"'],
    ['"blendedRoas": "Blended ROAS"', '"blendedRoas": "ROAS Combinado"'],
    ['"activeCh": "Active Channels"', '"activeCh": "Canais Ativos"'],
    ['"totalClicks": "Total Clicks"', '"totalClicks": "Cliques Totais"'],
    ['"avgCtr": "Avg CTR"', '"avgCtr": "CTR Médio"'],
    ['"allChSummary": "All Channel Summary"', '"allChSummary": "Resumo dos Canais"'],
    ['"allChSummary": "ALL CHANNEL SUMMARY"', '"allChSummary": "Resumo dos Canais"'],
    ['"chTrend": "Channel Trend"', '"chTrend": "Tendência do Canal"'],
    ['"chPerfSumm": "Channel Performance Summary"', '"chPerfSumm": "Desempenho dos Canais"'],
    ['"chName": "CHANNEL"', '"chName": "Canal"'],
    ['"rev": "Revenue"', '"rev": "Receita"'],
    ['"convRate": "Conv. Rate"', '"convRate": "Taxa Conv."'],
    ['"female": "Female"', '"female": "Feminino"'],
    ['"male": "Male"', '"male": "Masculino"'],
    ['"adSpend": "Ad Spend"', '"adSpend": "Gasto em Anúncios"'],
    ['"netProfit": "Net Profit"', '"netProfit": "Lucro Líquido"'],
    ['"noChannelData": "No channel data"', '"noChannelData": "Sem dados de canal"'],
    ['"noTrendData": "No trend data available"', '"noTrendData": "Sem dados de tendência"'],
    ['"noTrendData": "No trend data"', '"noTrendData": "Sem dados de tendência"'],
  ],
  ru: [
    ['"totalRev": "Total Revenue"', '"totalRev": "Общий доход"'],
    ['"totalSpend": "Total Spend"', '"totalSpend": "Общий расход"'],
    ['"blendedRoas": "Blended ROAS"', '"blendedRoas": "Средний ROAS"'],
    ['"activeCh": "Active Channels"', '"activeCh": "Активные каналы"'],
    ['"totalClicks": "Total Clicks"', '"totalClicks": "Всего кликов"'],
    ['"avgCtr": "Avg CTR"', '"avgCtr": "Средний CTR"'],
    ['"allChSummary": "All Channel Summary"', '"allChSummary": "Сводка каналов"'],
    ['"allChSummary": "ALL CHANNEL SUMMARY"', '"allChSummary": "Сводка каналов"'],
    ['"chTrend": "Channel Trend"', '"chTrend": "Тренд канала"'],
    ['"chPerfSumm": "Channel Performance Summary"', '"chPerfSumm": "Эффективность каналов"'],
    ['"chName": "CHANNEL"', '"chName": "Канал"'],
    ['"rev": "Revenue"', '"rev": "Доход"'],
    ['"convRate": "Conv. Rate"', '"convRate": "Конв."'],
    ['"female": "Female"', '"female": "Женский"'],
    ['"male": "Male"', '"male": "Мужской"'],
    ['"adSpend": "Ad Spend"', '"adSpend": "Расход на рекламу"'],
    ['"netProfit": "Net Profit"', '"netProfit": "Чистая прибыль"'],
    ['"noChannelData": "No channel data"', '"noChannelData": "Нет данных"'],
    ['"noTrendData": "No trend data available"', '"noTrendData": "Нет данных по трендам"'],
    ['"noTrendData": "No trend data"', '"noTrendData": "Нет данных по трендам"'],
  ],
  hi: [
    ['"totalRev": "Total Revenue"', '"totalRev": "कुल राजस्व"'],
    ['"totalSpend": "Total Spend"', '"totalSpend": "कुल खर्च"'],
    ['"blendedRoas": "Blended ROAS"', '"blendedRoas": "मिश्रित ROAS"'],
    ['"activeCh": "Active Channels"', '"activeCh": "सक्रिय चैनल"'],
    ['"totalClicks": "Total Clicks"', '"totalClicks": "कुल क्लिक"'],
    ['"avgCtr": "Avg CTR"', '"avgCtr": "औसत CTR"'],
    ['"allChSummary": "All Channel Summary"', '"allChSummary": "सभी चैनलों का सारांश"'],
    ['"allChSummary": "ALL CHANNEL SUMMARY"', '"allChSummary": "सभी चैनलों का सारांश"'],
    ['"chTrend": "Channel Trend"', '"chTrend": "चैनल रुझान"'],
    ['"chPerfSumm": "Channel Performance Summary"', '"chPerfSumm": "चैनल प्रदर्शन सारांश"'],
    ['"chName": "CHANNEL"', '"chName": "चैनल"'],
    ['"rev": "Revenue"', '"rev": "राजस्व"'],
    ['"convRate": "Conv. Rate"', '"convRate": "रूपांतरण"'],
    ['"female": "Female"', '"female": "महिला"'],
    ['"male": "Male"', '"male": "पुरुष"'],
    ['"adSpend": "Ad Spend"', '"adSpend": "विज्ञापन खर्च"'],
    ['"netProfit": "Net Profit"', '"netProfit": "शुद्ध लाभ"'],
    ['"noChannelData": "No channel data"', '"noChannelData": "कोई चैनल डेटा नहीं"'],
    ['"noTrendData": "No trend data available"', '"noTrendData": "कोई रुझान डेटा नहीं"'],
    ['"noTrendData": "No trend data"', '"noTrendData": "कोई रुझान डेटा नहीं"'],
  ],
};

for (const [lang, pairs] of Object.entries(FIXES)) {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  
  for (const [from, to] of pairs) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      count++;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] ${lang}.js — ${count} fixes`);
}

console.log('\nDone!');
