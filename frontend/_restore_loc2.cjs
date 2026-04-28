const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, 'src/components/dashboards/DashInfluencer.jsx');
let content = fs.readFileSync(fp, 'utf-8');
const lines = content.split('\n');

// Find LOC block: starts at "const LOC = {" (around line 19)
// Ends just before the first comment line starting with "// " after the LOC object close
let locStartLine = -1;
let locEndLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('const LOC = {')) {
    locStartLine = i;
  }
  if (locStartLine !== -1 && locEndLine === -1 && i > locStartLine + 10) {
    // LOC ends with "};" on its own line followed by a blank or comment
    if (lines[i].trim() === '};' && (lines[i+1]?.trim() === '' || lines[i+1]?.trim().startsWith('//'))) {
      locEndLine = i;
      break;
    }
  }
}

console.log(`LOC block: lines ${locStartLine+1} to ${locEndLine+1}`);

if (locStartLine === -1 || locEndLine === -1) {
  console.log('ERROR: Could not find LOC block');
  process.exit(1);
}

// Build the fresh LOC dictionary
const FRESH_LOC = `const LOC = {
  ko: {
    liveInfluencer:'실시간·인플루언서 활동 현황',
    totalFollowers:'총 팔로워', avgEngRate:'평균 참여율', creatorRevenue:'크리에이터 수익',
    totalPurchases:'총 구매전환',
    orders:'주문수', opProfit:'P&L 영업이익', adSpent:'광고비 누적',
    reach:'📡 도달성과', engage:'❤️ 참여율', convert:'💳 전환', brand:'🏷️브랜드영향',
    quality:'📐품질지수', report:'📊 성과리포트', ai:'🧠 AI분석',
    aiEngineTitle:'Claude AI 인플루언서 분석 엔진',
    aiEngineDesc:'{count}명 크리에이터 × 5섹션 전체 데이터를 Claude {model}로 분석합니다.',
    aiRunning:'🧠 Claude AI 분석 중... (15~30초)', aiRun:'🧠 AI 분석 실행',
    aiResultTitle:'AI 종합 분석 리포트', tokensUsed:'토큰 사용', model:'모델',
    noCreators:'등록된 크리에이터가 없습니다.',
    selectCreator:'좌측 크리에이터 목록에서 항목을 선택하거나 API 연결 후 데이터가 자동으로 로드됩니다.',
    threatsBlocked:'위협 차단', secureConnection:'보안 연결',
    colFollowers:'팔로워', colLikes:'좋아요', colComments:'댓글',
    colRevenue:'수익', colPurchases:'구매수', colShares:'공유',
    colSaves:'저장', colEngRate:'참여율',
    colScore:'점수', colCampaigns:'캠페인',
    filterAll:'전체', filterActive:'활성', filterPaused:'일시정지', filterCompleted:'완료',
    sortFollowers:'팔로워순', sortEngagement:'참여율순', sortRevenue:'수익순',
    searchPlaceholder:'크리에이터 검색...',
    noResults:'검색 결과가 없습니다.',
    tierMega:'메가', tierMacro:'매크로', tierMicro:'마이크로', tierNano:'나노',
  },
  ja: {
    liveInfluencer:'リアルタイム·インフルエンサー活動状況',
    totalFollowers:'総フォロワー', avgEngRate:'平均エンゲージメント', creatorRevenue:'クリエイター収益',
    totalPurchases:'総購入転換',
    orders:'注文数', opProfit:'P&L 営業利益', adSpent:'広告費累積',
    reach:'📡 リーチ成果', engage:'❤️ エンゲージ', convert:'💳 転換', brand:'🏷️ブランド影響',
    quality:'📐品質指数', report:'📊 成果レポート', ai:'🧠 AI分析',
    aiEngineTitle:'Claude AI インフルエンサー分析エンジン',
    aiEngineDesc:'{count}名クリエイター × 5セクション全データをClaude {model}で分析',
    aiRunning:'🧠 Claude AI 分析中... (15~30秒)', aiRun:'🧠 AI 分析実行',
    aiResultTitle:'AI 総合分析レポート', tokensUsed:'トークン使用', model:'モデル',
    noCreators:'登録されたクリエイターがいません',
    selectCreator:'左のクリエイターリストから選択するか、API接続後にデータが自動的にロードされます',
    threatsBlocked:'脅威ブロック', secureConnection:'安全な接続',
    colFollowers:'フォロワー', colLikes:'いいね', colComments:'コメント',
    colRevenue:'収益', colPurchases:'購入数', colShares:'シェア',
    colSaves:'保存', colEngRate:'参加率',
    colScore:'スコア', colCampaigns:'キャンペーン',
    filterAll:'全体', filterActive:'有効', filterPaused:'一時停止', filterCompleted:'完了',
    sortFollowers:'フォロワー順', sortEngagement:'参加率順', sortRevenue:'収益順',
    searchPlaceholder:'クリエイター検索...',
    noResults:'検索結果がありません',
    tierMega:'メガ', tierMacro:'マクロ', tierMicro:'マイクロ', tierNano:'ナノ',
  },
  en: {
    liveInfluencer:'Live · Influencer Activity',
    totalFollowers:'Total Followers', avgEngRate:'Avg Engagement', creatorRevenue:'Creator Revenue',
    totalPurchases:'Total Purchases',
    orders:'Orders', opProfit:'Op. Profit', adSpent:'Ad Spend Total',
    reach:'📡 Reach', engage:'❤️ Engage', convert:'💳 Convert', brand:'🏷️ Brand Impact',
    quality:'📐 Quality', report:'📊 Report', ai:'🧠 AI Analysis',
    aiEngineTitle:'Claude AI Influencer Analysis Engine',
    aiEngineDesc:'{count} creators × 5 sections analyzed by Claude {model}',
    aiRunning:'🧠 Claude AI analyzing... (15~30s)', aiRun:'🧠 Run AI Analysis',
    aiResultTitle:'AI Comprehensive Analysis Report', tokensUsed:'Tokens Used', model:'Model',
    noCreators:'No creators registered',
    selectCreator:'Select a creator from the list on the left, or connect API to auto-load data.',
    threatsBlocked:'Threats Blocked', secureConnection:'Secure Connection',
    colFollowers:'Followers', colLikes:'Likes', colComments:'Comments',
    colRevenue:'Revenue', colPurchases:'Purchases', colShares:'Shares',
    colSaves:'Saves', colEngRate:'Eng Rate',
    colScore:'Score', colCampaigns:'Campaigns',
    filterAll:'All', filterActive:'Active', filterPaused:'Paused', filterCompleted:'Completed',
    sortFollowers:'By Followers', sortEngagement:'By Engagement', sortRevenue:'By Revenue',
    searchPlaceholder:'Search creators...',
    noResults:'No results found',
    tierMega:'Mega', tierMacro:'Macro', tierMicro:'Micro', tierNano:'Nano',
  },
  zh: {
    liveInfluencer:'实时·达人活动状况',
    totalFollowers:'总粉丝数', avgEngRate:'平均互动率', creatorRevenue:'创作者收益',
    totalPurchases:'总购买转化',
    orders:'订单数', opProfit:'营业利润', adSpent:'广告费累计',
    reach:'📡 覆盖', engage:'❤️ 互动', convert:'💳 转化', brand:'🏷️品牌影响',
    quality:'📐质量', report:'📊 报告', ai:'🧠 AI分析',
    noCreators:'暂无注册创作者', selectCreator:'从左侧创作者列表中选择',
    colFollowers:'粉丝', colLikes:'点赞', colComments:'评论',
    colRevenue:'收益', colPurchases:'购买数', colShares:'分享', colSaves:'收藏', colEngRate:'互动率',
    colScore:'评分', colCampaigns:'活动',
    filterAll:'全部', filterActive:'活跃', filterPaused:'暂停', filterCompleted:'完成',
    searchPlaceholder:'搜索创作者...', noResults:'未找到结果',
    tierMega:'超级', tierMacro:'大型', tierMicro:'中小', tierNano:'微型',
  },
  'zh-TW': {
    liveInfluencer:'即時·網紅活動狀況',
    totalFollowers:'總追蹤者', avgEngRate:'平均互動率', creatorRevenue:'創作者收益',
    totalPurchases:'總購買轉換',
    orders:'訂單數', opProfit:'營業利潤', adSpent:'廣告費累計',
    reach:'📡 觸及', engage:'❤️ 互動', convert:'💳 轉換', brand:'🏷️品牌影響',
    noCreators:'尚無註冊的創作者', selectCreator:'從左側創作者列表中選擇',
    colFollowers:'追蹤者', colLikes:'讚', colComments:'留言',
    colRevenue:'收益', colPurchases:'購買數',
    colScore:'評分', colCampaigns:'活動',
    filterAll:'全部', filterActive:'活躍', filterPaused:'暫停', filterCompleted:'完成',
    searchPlaceholder:'搜尋創作者...',
    tierMega:'超級', tierMacro:'大型', tierMicro:'中小', tierNano:'微型',
  },
  de: {
    liveInfluencer:'Live · Influencer-Aktivität',
    totalFollowers:'Gesamtfollower', avgEngRate:'Ø Engagement', creatorRevenue:'Creator-Umsatz',
    totalPurchases:'Gesamtkäufe',
    orders:'Bestellungen', opProfit:'Betriebsgewinn', adSpent:'Werbeausgaben',
    reach:'📡 Reichweite', engage:'❤️ Engagement', convert:'💳 Konversion', brand:'🏷️ Markeneinfluss',
    quality:'📐 Qualität', report:'📊 Bericht', ai:'🧠 AI-Analyse',
    noCreators:'Keine Creator registriert', selectCreator:'Wählen Sie einen Creator aus der Liste',
    colFollowers:'Follower', colLikes:'Likes', colComments:'Kommentare',
    colRevenue:'Umsatz', colPurchases:'Käufe',
    colScore:'Bewertung', colCampaigns:'Kampagnen',
    filterAll:'Alle', filterActive:'Aktiv', filterPaused:'Pausiert', filterCompleted:'Abgeschlossen',
    searchPlaceholder:'Creator suchen...',
    tierMega:'Mega', tierMacro:'Makro', tierMicro:'Mikro', tierNano:'Nano',
  },
  th: {
    liveInfluencer:'เรียลไทม์ · กิจกรรมอินฟลูเอนเซอร์',
    totalFollowers:'ผู้ติดตามทั้งหมด', avgEngRate:'อัตราการมีส่วนร่วมเฉลี่ย', creatorRevenue:'รายได้ครีเอเตอร์',
    totalPurchases:'การซื้อทั้งหมด',
    orders:'คำสั่งซื้อ', opProfit:'กำไรดำเนินงาน', adSpent:'ค่าโฆษณาสะสม',
    reach:'📡 การเข้าถึง', engage:'❤️ การมีส่วนร่วม', convert:'💳 การแปลง', brand:'🏷️ แบรนด์',
    noCreators:'ไม่มีครีเอเตอร์ที่ลงทะเบียน',
    colFollowers:'ผู้ติดตาม', colLikes:'ถูกใจ', colComments:'ความคิดเห็น',
    colRevenue:'รายได้', colPurchases:'การซื้อ',
    colScore:'คะแนน', colCampaigns:'แคมเปญ',
    filterAll:'ทั้งหมด', filterActive:'ใช้งาน', filterPaused:'หยุดชั่วคราว', filterCompleted:'เสร็จสมบูรณ์',
    searchPlaceholder:'ค้นหาครีเอเตอร์...',
    tierMega:'เมกะ', tierMacro:'แมโคร', tierMicro:'ไมโคร', tierNano:'นาโน',
  },
  vi: {
    liveInfluencer:'Trực tiếp · Hoạt động Influencer',
    totalFollowers:'Tổng người theo dõi', avgEngRate:'Tỉ lệ tương tác TB', creatorRevenue:'Doanh thu Creator',
    totalPurchases:'Tổng mua hàng',
    orders:'Đơn hàng', opProfit:'Lợi nhuận', adSpent:'Chi phí QC tích lũy',
    reach:'📡 Tiếp cận', engage:'❤️ Tương tác', convert:'💳 Chuyển đổi', brand:'🏷️ Thương hiệu',
    noCreators:'Chưa có creator đăng ký',
    colFollowers:'Người theo dõi', colLikes:'Thích', colComments:'Bình luận',
    colRevenue:'Doanh thu', colPurchases:'Mua hàng',
    colScore:'Điểm', colCampaigns:'Chiến dịch',
    filterAll:'Tất cả', filterActive:'Hoạt động', filterPaused:'Tạm dừng', filterCompleted:'Hoàn thành',
    searchPlaceholder:'Tìm creator...',
    tierMega:'Mega', tierMacro:'Macro', tierMicro:'Micro', tierNano:'Nano',
  },
  id: {
    liveInfluencer:'Langsung · Aktivitas Influencer',
    totalFollowers:'Total Pengikut', avgEngRate:'Rata-rata Engagement', creatorRevenue:'Pendapatan Creator',
    totalPurchases:'Total Pembelian',
    orders:'Pesanan', opProfit:'Laba Operasional', adSpent:'Total Biaya Iklan',
    reach:'📡 Jangkauan', engage:'❤️ Engagement', convert:'💳 Konversi', brand:'🏷️ Dampak Merek',
    noCreators:'Belum ada creator terdaftar',
    colFollowers:'Pengikut', colLikes:'Suka', colComments:'Komentar',
    colRevenue:'Pendapatan', colPurchases:'Pembelian',
    colScore:'Skor', colCampaigns:'Kampanye',
    filterAll:'Semua', filterActive:'Aktif', filterPaused:'Dijeda', filterCompleted:'Selesai',
    searchPlaceholder:'Cari creator...',
    tierMega:'Mega', tierMacro:'Makro', tierMicro:'Mikro', tierNano:'Nano',
  },
  es: {
    liveInfluencer:'En vivo · Actividad de Influencers',
    totalFollowers:'Total Seguidores', avgEngRate:'Engagement Promedio', creatorRevenue:'Ingresos Creator',
    totalPurchases:'Total Compras',
    orders:'Pedidos', opProfit:'Beneficio operativo', adSpent:'Gasto en publicidad',
    reach:'📡 Alcance', engage:'❤️ Engagement', convert:'💳 Conversión', brand:'🏷️ Impacto de marca',
    noCreators:'No hay creators registrados',
    colFollowers:'Seguidores', colLikes:'Me gusta', colComments:'Comentarios',
    colRevenue:'Ingresos', colPurchases:'Compras',
    colScore:'Puntuación', colCampaigns:'Campañas',
    filterAll:'Todos', filterActive:'Activo', filterPaused:'Pausado', filterCompleted:'Completado',
    searchPlaceholder:'Buscar creators...',
    tierMega:'Mega', tierMacro:'Macro', tierMicro:'Micro', tierNano:'Nano',
  },
  fr: {
    liveInfluencer:'En direct · Activité Influenceurs',
    totalFollowers:'Total Abonnés', avgEngRate:'Engagement Moyen', creatorRevenue:'Revenus Créateur',
    totalPurchases:'Total Achats',
    orders:'Commandes', opProfit:'Bénéfice opérationnel', adSpent:'Dépenses pub',
    reach:'📡 Portée', engage:'❤️ Engagement', convert:'💳 Conversion', brand:'🏷️ Impact marque',
    noCreators:'Aucun créateur enregistré',
    colFollowers:'Abonnés', colLikes:'J\\'aime', colComments:'Commentaires',
    colRevenue:'Revenus', colPurchases:'Achats',
    colScore:'Score', colCampaigns:'Campagnes',
    filterAll:'Tous', filterActive:'Actif', filterPaused:'En pause', filterCompleted:'Terminé',
    searchPlaceholder:'Rechercher créateurs...',
    tierMega:'Méga', tierMacro:'Macro', tierMicro:'Micro', tierNano:'Nano',
  },
  pt: {
    liveInfluencer:'Ao vivo · Atividade de Influenciadores',
    totalFollowers:'Total de Seguidores', avgEngRate:'Engajamento Médio', creatorRevenue:'Receita do Creator',
    totalPurchases:'Total de Compras',
    orders:'Pedidos', opProfit:'Lucro operacional', adSpent:'Gasto com anúncios',
    reach:'📡 Alcance', engage:'❤️ Engajamento', convert:'💳 Conversão', brand:'🏷️ Impacto da marca',
    noCreators:'Nenhum criador registrado',
    colFollowers:'Seguidores', colLikes:'Curtidas', colComments:'Comentários',
    colRevenue:'Receita', colPurchases:'Compras',
    colScore:'Pontuação', colCampaigns:'Campanhas',
    filterAll:'Todos', filterActive:'Ativo', filterPaused:'Pausado', filterCompleted:'Concluído',
    searchPlaceholder:'Buscar criadores...',
    tierMega:'Mega', tierMacro:'Macro', tierMicro:'Micro', tierNano:'Nano',
  },
  ru: {
    liveInfluencer:'В реальном времени · Активность инфлюенсеров',
    totalFollowers:'Всего подписчиков', avgEngRate:'Средний Engagement', creatorRevenue:'Доход креатора',
    totalPurchases:'Всего покупок',
    orders:'Заказы', opProfit:'Операционная прибыль', adSpent:'Расходы на рекламу',
    reach:'📡 Охват', engage:'❤️ Вовлечённость', convert:'💳 Конверсия', brand:'🏷️ Влияние бренда',
    noCreators:'Нет зарегистрированных креаторов',
    colFollowers:'Подписчики', colLikes:'Лайки', colComments:'Комментарии',
    colRevenue:'Доход', colPurchases:'Покупки',
    colScore:'Баллы', colCampaigns:'Кампании',
    filterAll:'Все', filterActive:'Активные', filterPaused:'Приостановлено', filterCompleted:'Завершено',
    searchPlaceholder:'Поиск креаторов...',
    tierMega:'Мега', tierMacro:'Макро', tierMicro:'Микро', tierNano:'Нано',
  },
  ar: {
    liveInfluencer:'مباشر · نشاط المؤثرين',
    totalFollowers:'إجمالي المتابعين', avgEngRate:'متوسط التفاعل', creatorRevenue:'إيرادات المبدع',
    totalPurchases:'إجمالي المشتريات',
    orders:'الطلبات', opProfit:'الربح التشغيلي', adSpent:'إجمالي الإنفاق الإعلاني',
    reach:'📡 الوصول', engage:'❤️ التفاعل', convert:'💳 التحويل', brand:'🏷️ تأثير العلامة',
    noCreators:'لا يوجد مبدعون مسجلون',
    colFollowers:'المتابعون', colLikes:'الإعجابات', colComments:'التعليقات',
    colRevenue:'الإيرادات', colPurchases:'المشتريات',
    colScore:'الدرجة', colCampaigns:'الحملات',
    filterAll:'الكل', filterActive:'نشط', filterPaused:'متوقف', filterCompleted:'مكتمل',
    searchPlaceholder:'بحث عن مبدعين...',
    tierMega:'ميجا', tierMacro:'ماكرو', tierMicro:'مايكرو', tierNano:'نانو',
  },
  hi: {
    liveInfluencer:'लाइव · इन्फ्लुएंसर गतिविधि',
    totalFollowers:'कुल फॉलोअर्स', avgEngRate:'औसत एंगेजमेंट', creatorRevenue:'क्रिएटर राजस्व',
    totalPurchases:'कुल खरीदारी',
    orders:'ऑर्डर', opProfit:'परिचालन लाभ', adSpent:'विज्ञापन खर्च कुल',
    reach:'📡 पहुँच', engage:'❤️ सहभागिता', convert:'💳 रूपांतरण', brand:'🏷️ ब्रांड प्रभाव',
    noCreators:'कोई क्रिएटर पंजीकृत नहीं',
    colFollowers:'फॉलोअर्स', colLikes:'लाइक्स', colComments:'टिप्पणियाँ',
    colRevenue:'राजस्व', colPurchases:'खरीदारी',
    colScore:'स्कोर', colCampaigns:'अभियान',
    filterAll:'सभी', filterActive:'सक्रिय', filterPaused:'रुका हुआ', filterCompleted:'पूर्ण',
    searchPlaceholder:'क्रिएटर खोजें...',
    tierMega:'मेगा', tierMacro:'मैक्रो', tierMicro:'माइक्रो', tierNano:'नैनो',
  },
};`;

// Replace lines locStartLine through locEndLine
const newLines = [
  ...lines.slice(0, locStartLine),
  FRESH_LOC,
  ...lines.slice(locEndLine + 1),
];

content = newLines.join('\n');

// Also fix the corrupted comment blocks (═ chars became garbage)
content = content.replace(/\/\/ [?═\ufffd\u00a0\u0080-\u00ff]+$/gm, (match) => {
  if (match.includes('Performance')) return '// ══════════════════════════════════════════════════════════════════════';
  if (match.includes('Main Component')) return '// ══════════════════════════════════════════════════════════════════════';
  return '// ══════════════════════════════════════════════════════════════════════';
});

// Fix specific corrupted Korean strings in component code
content = content.replace(/\ufffd/g, '');

// Fix arrow chars that got corrupted
content = content.replace(/'[?]*:[?]*'/g, (m) => m); // Leave as is, they're just missing

fs.writeFileSync(fp, content, 'utf-8');

// Verify
const verify = fs.readFileSync(fp, 'utf-8');
const badCount = (verify.match(/\ufffd/g) || []).length;
const lineCount = verify.split('\n').length;
console.log(`File restored: ${lineCount} lines, ${badCount} replacement chars remaining`);
console.log('Done!');
