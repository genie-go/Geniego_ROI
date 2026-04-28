// Fix all missing LOC keys in DashInfluencer.jsx
const fs = require('fs');
const filePath = './src/components/dashboards/DashInfluencer.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Missing keys per language (translations)
const FIXES = {
  'zh-TW': {
    // Add entire zh-TW section after zh
    full: `  'zh-TW': {
    liveInfluencer:'● 即時·網紅聯動現況', totalFollowers:'總粉絲數', avgEngRate:'平均互動率',
    creatorRevenue:'創作者收益', totalPurchases:'總購買轉換', orders:'訂單量',
    opProfit:'P&L 營業利潤', adSpent:'廣告費累計',
    reach:'📡 觸達成果', engage:'❤️ 互動率', convert:'💳 轉換', brand:'🏷️ 品牌影響力',
    quality:'⭐ 品質評估', report:'📊 成果報告', ai:'🤖 AI分析',
    aiEngineTitle:'Claude AI 網紅分析引擎',
    aiEngineDesc:'{count}位創作者 × 5個維度全數據由Claude {model}分析',
    aiRunning:'⏳ Claude AI 分析中... (15~30秒)', aiRun:'🚀 執行AI分析',
    history:'📜 歷史紀錄', tokensUsed:'使用Token', model:'模型',
    portfolioReview:'📋 組合總評', immediateAction:'⚡ 即時行動:',
    aiEval:'AI評價', score:'分', strengths:'💪 優勢', weaknesses:'⚠️ 劣勢',
    aiRanking:'🏆 AI總排名', analysisHistory:'📜 分析歷史 (最近5條)',
    noHistory:'無歷史紀錄', noCreators:'尚無註冊創作者',
    selectCreator:'註冊創作者後即時數據將在此顯示',
    securityStatus:'🛡️ 安全狀態', secureConnection:'安全連線已啟用',
    threatDetected:'⚠️ 偵測到威脅', threatsBlocked:'已攔截威脅', activeMonitoring:'即時監控',
    securityLevel:'安全等級', lastScan:'最近掃描', noThreats:'無威脅',
    xssBlocked:'XSS攔截', csrfProtected:'CSRF防護已啟用',
    rateLimited:'請求限制已啟用', bruteForceGuard:'暴力破解防禦',
    securityLog:'安全日誌', viewAll:'查看全部',
    critical:'嚴重', warning:'警告', info:'資訊', safe:'安全', secShield:'安全防護',
    colFollowers:'粉絲', colLikes:'按讚', colEngRate:'互動率', colComments:'留言',
    colRevenue:'收益', colPurchases:'購買', colSaves:'收藏', colShares:'分享',
    colScore:'評分', colCampaigns:'活動', currPrefix:'NT$',
  },`,
  },
  zh: {
    keys: {
      threatDetected:"'⚠️ 检测到威胁'", activeMonitoring:"'实时监控'",
      securityLevel:"'安全等级'", lastScan:"'最近扫描'", viewAll:"'查看全部'", safe:"'安全'",
    }
  },
  de: {
    keys: {
      threatDetected:"'⚠️ Bedrohung erkannt'", activeMonitoring:"'Aktive Überwachung'",
      securityLevel:"'Sicherheitsstufe'", lastScan:"'Letzter Scan'", viewAll:"'Alle anzeigen'", safe:"'Sicher'",
    }
  },
  th: {
    keys: {
      aiEngineDesc:"'{count} ครีเอเตอร์ × 5 ส่วน วิเคราะห์โดย Claude {model}'",
      aiRunning:"'⏳ กำลังวิเคราะห์... (15-30 วินาที)'",
      tokensUsed:"'โทเค็นที่ใช้'", model:"'โมเดล'",
      portfolioReview:"'📋 สรุปพอร์ตโฟลิโอ'", immediateAction:"'⚡ ดำเนินการทันที:'",
      aiEval:"'การประเมิน AI'", score:"'คะแนน'", strengths:"'💪 จุดแข็ง'", weaknesses:"'⚠️ จุดอ่อน'",
      aiRanking:"'🏆 อันดับ AI โดยรวม'", analysisHistory:"'📜 ประวัติการวิเคราะห์ (5 ล่าสุด)'",
      threatDetected:"'⚠️ ตรวจพบภัยคุกคาม'", activeMonitoring:"'การเฝ้าระวังเชิงรุก'",
      securityLevel:"'ระดับความปลอดภัย'", lastScan:"'สแกนล่าสุด'",
      xssBlocked:"'บล็อก XSS'", csrfProtected:"'CSRF ป้องกันแล้ว'",
      rateLimited:"'จำกัดอัตรา'", bruteForceGuard:"'ป้องกัน Brute Force'",
      viewAll:"'ดูทั้งหมด'", safe:"'ปลอดภัย'", secShield:"'โล่ความปลอดภัย'",
    }
  },
  vi: {
    keys: {
      aiEngineDesc:"'{count} creator × 5 mục được Claude {model} phân tích'",
      aiRunning:"'⏳ Đang phân tích... (15-30 giây)'",
      tokensUsed:"'Token đã dùng'", model:"'Mô hình'",
      portfolioReview:"'📋 Tổng quan danh mục'", immediateAction:"'⚡ Hành động ngay:'",
      aiEval:"'Đánh giá AI'", score:"'điểm'", strengths:"'💪 Điểm mạnh'", weaknesses:"'⚠️ Điểm yếu'",
      aiRanking:"'🏆 Xếp hạng AI tổng thể'", analysisHistory:"'📜 Lịch sử phân tích (5 gần nhất)'",
      threatDetected:"'⚠️ Phát hiện mối đe dọa'", activeMonitoring:"'Giám sát chủ động'",
      securityLevel:"'Mức bảo mật'", lastScan:"'Quét gần nhất'",
      xssBlocked:"'Chặn XSS'", csrfProtected:"'Bảo vệ CSRF'",
      rateLimited:"'Giới hạn tốc độ'", bruteForceGuard:"'Chống Brute Force'",
      viewAll:"'Xem tất cả'", safe:"'An toàn'", secShield:"'Lá chắn bảo mật'",
    }
  },
  id: {
    keys: {
      aiEngineDesc:"'{count} kreator × 5 bagian dianalisis oleh Claude {model}'",
      aiRunning:"'⏳ Menganalisis... (15-30 detik)'",
      tokensUsed:"'Token Digunakan'", model:"'Model'",
      portfolioReview:"'📋 Ringkasan Portofolio'", immediateAction:"'⚡ Tindakan Segera:'",
      aiEval:"'Evaluasi AI'", score:"'poin'", strengths:"'💪 Kekuatan'", weaknesses:"'⚠️ Kelemahan'",
      aiRanking:"'🏆 Peringkat AI Keseluruhan'", analysisHistory:"'📜 Riwayat Analisis (5 Terakhir)'",
      threatDetected:"'⚠️ Ancaman Terdeteksi'", activeMonitoring:"'Pemantauan Aktif'",
      securityLevel:"'Level Keamanan'", lastScan:"'Pemindaian Terakhir'",
      xssBlocked:"'XSS Diblokir'", csrfProtected:"'Perlindungan CSRF'",
      rateLimited:"'Pembatasan Rate'", bruteForceGuard:"'Perlindungan Brute Force'",
      viewAll:"'Lihat Semua'", safe:"'Aman'", secShield:"'Perisai Keamanan'",
    }
  },
  es: {
    keys: {
      aiEngineDesc:"'{count} creadores × 5 secciones analizados por Claude {model}'",
      aiRunning:"'⏳ Analizando... (15-30s)'",
      tokensUsed:"'Tokens Usados'", model:"'Modelo'",
      portfolioReview:"'📋 Resumen del Portafolio'", immediateAction:"'⚡ Acción Inmediata:'",
      aiEval:"'Evaluación IA'", score:"'pts'", strengths:"'💪 Fortalezas'", weaknesses:"'⚠️ Debilidades'",
      aiRanking:"'🏆 Ranking General IA'", analysisHistory:"'📜 Historial de Análisis (Últimos 5)'",
      threatDetected:"'⚠️ Amenaza Detectada'", activeMonitoring:"'Monitoreo Activo'",
      securityLevel:"'Nivel de Seguridad'", lastScan:"'Último Escaneo'",
      xssBlocked:"'XSS Bloqueado'", csrfProtected:"'Protección CSRF'",
      rateLimited:"'Limitación de Tasa'", bruteForceGuard:"'Protección Fuerza Bruta'",
      viewAll:"'Ver Todo'", safe:"'Seguro'", secShield:"'Escudo de Seguridad'",
    }
  },
  fr: {
    keys: {
      aiEngineDesc:"'{count} créateurs × 5 sections analysés par Claude {model}'",
      aiRunning:"'⏳ Analyse en cours... (15-30s)'",
      tokensUsed:"'Tokens Utilisés'", model:"'Modèle'",
      portfolioReview:"'📋 Résumé du Portefeuille'", immediateAction:"'⚡ Action Immédiate :'",
      aiEval:"'Évaluation IA'", score:"'pts'", strengths:"'💪 Forces'", weaknesses:"'⚠️ Faiblesses'",
      aiRanking:"'🏆 Classement IA Global'", analysisHistory:"'📜 Historique d\\'Analyse (5 Derniers)'",
      threatDetected:"'⚠️ Menace Détectée'", activeMonitoring:"'Surveillance Active'",
      securityLevel:"'Niveau de Sécurité'", lastScan:"'Dernier Scan'",
      xssBlocked:"'XSS Bloqué'", csrfProtected:"'Protection CSRF'",
      rateLimited:"'Limitation de Débit'", bruteForceGuard:"'Protection Force Brute'",
      viewAll:"'Voir Tout'", safe:"'Sûr'", secShield:"'Bouclier de Sécurité'",
    }
  },
  pt: {
    keys: {
      aiEngineDesc:"'{count} criadores × 5 seções analisados por Claude {model}'",
      aiRunning:"'⏳ Analisando... (15-30s)'",
      tokensUsed:"'Tokens Usados'", model:"'Modelo'",
      portfolioReview:"'📋 Resumo do Portfólio'", immediateAction:"'⚡ Ação Imediata:'",
      aiEval:"'Avaliação IA'", score:"'pts'", strengths:"'💪 Pontos Fortes'", weaknesses:"'⚠️ Pontos Fracos'",
      aiRanking:"'🏆 Ranking Geral IA'", analysisHistory:"'📜 Histórico de Análise (Últimos 5)'",
      threatDetected:"'⚠️ Ameaça Detectada'", activeMonitoring:"'Monitoramento Ativo'",
      securityLevel:"'Nível de Segurança'", lastScan:"'Última Varredura'",
      xssBlocked:"'XSS Bloqueado'", csrfProtected:"'Proteção CSRF'",
      rateLimited:"'Limitação de Taxa'", bruteForceGuard:"'Proteção Força Bruta'",
      viewAll:"'Ver Tudo'", safe:"'Seguro'", secShield:"'Escudo de Segurança'",
    }
  },
  ru: {
    keys: {
      aiEngineDesc:"'{count} авторов × 5 разделов анализирует Claude {model}'",
      aiRunning:"'⏳ Анализ... (15-30 сек)'",
      tokensUsed:"'Использовано токенов'", model:"'Модель'",
      portfolioReview:"'📋 Обзор портфеля'", immediateAction:"'⚡ Немедленное действие:'",
      aiEval:"'Оценка AI'", score:"'баллы'", strengths:"'💪 Сильные стороны'", weaknesses:"'⚠️ Слабые стороны'",
      aiRanking:"'🏆 Общий рейтинг AI'", analysisHistory:"'📜 История анализа (Последние 5)'",
      threatDetected:"'⚠️ Обнаружена угроза'", activeMonitoring:"'Активный мониторинг'",
      securityLevel:"'Уровень безопасности'", lastScan:"'Последнее сканирование'",
      xssBlocked:"'XSS заблокировано'", csrfProtected:"'Защита CSRF'",
      rateLimited:"'Ограничение скорости'", bruteForceGuard:"'Защита от перебора'",
      viewAll:"'Показать все'", safe:"'Безопасно'", secShield:"'Щит безопасности'",
    }
  },
  hi: {
    keys: {
      aiEngineDesc:"'{count} क्रिएटर × 5 खंड Claude {model} द्वारा विश्लेषित'",
      aiRunning:"'⏳ विश्लेषण हो रहा है... (15-30 सेकंड)'",
      tokensUsed:"'उपयोग किए गए टोकन'", model:"'मॉडल'",
      portfolioReview:"'📋 पोर्टफोलियो सारांश'", immediateAction:"'⚡ तत्काल कार्रवाई:'",
      aiEval:"'AI मूल्यांकन'", score:"'अंक'", strengths:"'💪 ताकत'", weaknesses:"'⚠️ कमजोरियां'",
      aiRanking:"'🏆 AI समग्र रैंकिंग'", analysisHistory:"'📜 विश्लेषण इतिहास (अंतिम 5)'",
      threatDetected:"'⚠️ खतरा पाया गया'", activeMonitoring:"'सक्रिय निगरानी'",
      securityLevel:"'सुरक्षा स्तर'", lastScan:"'अंतिम स्कैन'",
      xssBlocked:"'XSS अवरोधित'", csrfProtected:"'CSRF सुरक्षा'",
      rateLimited:"'दर सीमित'", bruteForceGuard:"'ब्रूट फोर्स सुरक्षा'",
      viewAll:"'सभी देखें'", safe:"'सुरक्षित'", secShield:"'सुरक्षा कवच'",
    }
  },
};

// Apply fixes
for (const [lang, fix] of Object.entries(FIXES)) {
  if (fix.full) {
    // Insert zh-TW after zh block
    const zhEndMarker = "    colScore:'評分', colCampaigns:'活動', currPrefix:'NT$',\n  },";
    if (content.includes(zhEndMarker)) {
      content = content.replace(zhEndMarker, zhEndMarker + '\n' + fix.full);
      console.log(`✅ Added full ${lang} block`);
    } else {
      console.log(`⚠️  Could not find zh-TW insertion point`);
    }
  }
  if (fix.keys) {
    // Find the closing }, of this language's block and insert missing keys before it
    const langPattern = `${lang}: {`;
    const langStart = content.indexOf(langPattern);
    if (langStart === -1) { 
      // Handle quoted lang key
      const altPattern = `'${lang}': {`;
      const altStart = content.indexOf(altPattern);
      if (altStart === -1) { console.log(`⚠️  Could not find ${lang} block`); continue; }
    }

    // Find the closing currPrefix line of this lang
    const searchStart = content.indexOf(langPattern) !== -1 ? content.indexOf(langPattern) : content.indexOf(`'${lang}': {`);
    const currPrefixIdx = content.indexOf("currPrefix:", searchStart);
    if (currPrefixIdx === -1) { console.log(`⚠️  No currPrefix for ${lang}`); continue; }
    
    // Find the end of the currPrefix line
    const lineEnd = content.indexOf('\n', currPrefixIdx);
    const currPrefixLine = content.substring(currPrefixIdx, lineEnd);
    
    // Build new keys string
    const newKeys = Object.entries(fix.keys).map(([k, v]) => `    ${k}:${v}`).join(',\n');
    
    // Insert before currPrefix
    const insertPoint = content.lastIndexOf('\n', currPrefixIdx);
    content = content.substring(0, insertPoint) + '\n' + newKeys + ',' + content.substring(insertPoint);
    console.log(`✅ Added ${Object.keys(fix.keys).length} keys to ${lang}`);
  }
}

fs.writeFileSync(filePath, content);
console.log('\n✅ All LOC fixes applied!');
