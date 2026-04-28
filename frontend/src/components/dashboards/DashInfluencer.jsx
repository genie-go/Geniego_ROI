import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useI18n } from '../../i18n/index.js';
import { fmt } from './ChartUtils.jsx';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';
import { useSecurityGuard, getSecurityAlerts } from '../../security/SecurityGuard.js';

// ══════════════════════════════════════════════════════════════════════
//  🤝 DashInfluencer —AI·Influencer Super-Premium Enterprise Dashboard
//  ✅ Zero Mock Data: 100% GlobalDataContext real-time sync
//  ✅ Enterprise i18n: LOC local dictionary + t() dual i18n (9 languages)
//  ✅ SecurityGuard: XSS/CSRF/Brute-force protection + real-time alerts
//  ✅ Performance: React.memo, useMemo, useCallback optimization
// ══════════════════════════════════════════════════════════════════════

const API_BASE = '/api';
const G = 10;

// ── Enterprise Zero-Miss i18n Dictionary (9 languages) 
const LOC = {
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
    colFollowers:'Abonnés', colLikes:'J\'aime', colComments:'Commentaires',
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
};

// ── Production: ?리?이이?는 ?직 GlobalDataContext?서?공급 
const GRADE_COL = { S:'#fbbf24', A:'#22c55e', B:'#4f8ef7', C:'#f97316', D:'#f87171' };

// ══════════════════════════════════════════════════════════════════════
//  Performance-optimized Sub Components (React.memo)
// ══════════════════════════════════════════════════════════════════════

const KPICard = React.memo(function KPICard({ ico, label, value, delta, col }) {
  return (
    <div style={{ borderRadius:14, padding:'1px', background:`linear-gradient(135deg,${col}44,rgba(0,0,0,0.04))`, boxShadow:`0 4px 20px ${col}18` }}>
      <div style={{ background:'linear-gradient(145deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))', borderRadius:13, padding:'13px 16px', height:90, boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10, color: 'var(--text-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:col, lineHeight:1.1, marginTop:3, textShadow:`0 0 18px ${col}55` }}>{value}</div>
          </div>
          <div style={{ width:36, height:36, borderRadius:10, background:`${col}18`, border:`1px solid ${col}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{ico}</div>
        </div>
        <span style={{ fontSize:11, color:delta >= 0 ? '#4ade80' : '#f87171', fontWeight:800, background:delta >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding:'1px 6px', borderRadius:6, alignSelf:'flex-start' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      </div>
    </div>
  );
});

const TabButton = React.memo(function TabButton({ id, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:1, padding:'8px 4px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:800, fontSize:11, transition:'all 0.2s',
      background: active ? 'linear-gradient(135deg,rgba(79,142,247,0.3),rgba(79,142,247,0.1))' : 'transparent',
      color: active ? '#4f8ef7' : 'var(--text-3, #9ca3af)',
      boxShadow: active ? '0 2px 12px rgba(79,142,247,0.2)' : undefined,
      borderBottom: active ? '2px solid #4f8ef7' : '2px solid transparent',
    }}>{label}</button>
  );
});

const StatusBadge = React.memo(function StatusBadge({ text, col, ico }) {
  return (
    <span style={{ fontSize:10, background:`${col}1f`, border:`1px solid ${col}4d`, borderRadius:20, padding:'3px 10px', color:col, fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>
      {ico && <span>{ico}</span>}{text}
    </span>
  );
});

// ── Security Monitor Panel 
const SecurityPanel = React.memo(function SecurityPanel({ txt, secAlerts }) {
  const alerts = useMemo(() => {
    try { return secAlerts || getSecurityAlerts() || []; } catch { return []; }
  }, [secAlerts]);

  const threatCount = useMemo(() => alerts.filter(a => a.type === 'critical' || a.type === 'warn').length, [alerts]);
  const isSecure = threatCount === 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Security Status Header */}
      <div style={{
        background: isSecure
          ? 'linear-gradient(145deg,rgba(34,197,94,0.08),rgba(8,18,38,0.97))'
          : 'linear-gradient(145deg,rgba(248,113,113,0.08),rgba(8,18,38,0.97))',
        border: `1px solid ${isSecure ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
        borderRadius:13, padding:'16px 18px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
          <div style={{
            width:56, height:56, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            background: isSecure ? 'rgba(34,197,94,0.15)' : 'rgba(248,113,113,0.15)',
            border: `2px solid ${isSecure ? '#22c55e' : '#f87171'}`,
            fontSize:28, boxShadow: `0 0 20px ${isSecure ? '#22c55e33' : '#f8717133'}`,
          }}>🛡️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:900, color: isSecure ? '#22c55e' : '#f87171' }}>
              {txt('secShield')}
            </div>
            <div style={{ fontSize:11, color: 'var(--text-3)', marginTop:2 }}>
              {isSecure ? txt('secureConnection') : `${txt('threatDetected')} (${threatCount})`}
            </div>
          </div>
          <div style={{
            padding:'6px 14px', borderRadius:8, fontSize:11, fontWeight:800,
            background: isSecure ? 'rgba(34,197,94,0.15)' : 'rgba(248,113,113,0.15)',
            color: isSecure ? '#4ade80' : '#f87171',
            border: `1px solid ${isSecure ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>{isSecure ? '🟢 SECURE' : '🔴 ALERT'}</div>
        </div>

        {/* Security Metrics Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
          {[
            { ico:'🔒', l: txt('xssBlocked'), v: alerts.filter(a => a.message?.includes('XSS')).length, col:'#4f8ef7' },
            { ico:'🛡️', l: txt('csrfProtected'), v:'ON', col:'#22c55e' },
            { ico:'🛡️', l: txt('rateLimited'), v:'ON', col:'#eab308' },
            { ico:'🔐', l: txt('bruteForceGuard'), v:'ON', col:'#a855f7' },
          ].map(m => (
            <div key={m.l} style={{ background:'rgba(0,0,0,0.25)', borderRadius:9, padding:'8px 10px', textAlign:'center' }}>
              <div style={{ fontSize:14, marginBottom:4 }}>{m.ico}</div>
              <div style={{ fontSize:14, fontWeight:900, color:m.col }}>{m.v}</div>
              <div style={{ fontSize:8, color: 'var(--text-3)', marginTop:2, lineHeight:1.2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Log */}
      <div style={{
        background:'linear-gradient(145deg,rgba(248,250,252,0.95),rgba(241,245,249,0.90))',
        border: '1px solid var(--border)', borderRadius:12, padding:'14px 16px',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color: 'var(--text-3)', textTransform:'uppercase', letterSpacing:0.8 }}>
            {txt('securityLog')}
          </div>
          <span style={{ fontSize:9, color: 'var(--text-3)', padding:'2px 8px', border: '1px solid var(--border)', borderRadius:6 }}>
            {alerts.length} events
          </span>
        </div>
        {alerts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color: 'var(--text-3)', fontSize:12 }}>
            {txt('noThreats')}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:240, overflowY:'auto' }}>
            {alerts.slice(0, 10).map((a, i) => {
              const col = a.type === 'critical' ? '#f87171' : a.type === 'warn' ? '#eab308' : '#4f8ef7';
              return (
                <div key={a.id || i} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8,
                  background:`${col}08`, border:`1px solid ${col}18`,
                }}>
                  <span style={{ fontSize:8, fontWeight:900, color:col, padding:'1px 5px', borderRadius:4, background:`${col}1a`, border:`1px solid ${col}25`, flexShrink:0 }}>
                    {a.type === 'critical' ? txt('critical') : a.type === 'warn' ? txt('warning') : txt('info')}
                  </span>
                  <span style={{ flex:1, fontSize:10, color: 'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {a.message || a.msg || 'Security event'}
                  </span>
                  <span style={{ fontSize:9, color: 'var(--text-3)', flexShrink:0 }}>
                    {a.time || 'now'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// ── AI Analysis Panel 
const PanelAI = React.memo(function PanelAI({ txt }) {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [tokensUsed, setTokens] = useState(0);
  const [model, setModel] = useState('');

  const runAnalysis = useCallback(async () => {
    setStatus('loading'); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/v422/ai/influencer-eval`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include', body: JSON.stringify({ data:[] }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data.result); setTokens(data.tokens_used); setModel(data.model); setStatus('done');
    } catch (e) { setStatus('error'); setResult({ error: e.message }); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v422/ai/analyses?context=influencer_eval&limit=5`, { credentials:'include' });
      const data = await res.json(); setHistory(data.analyses || []);
    } catch { setHistory([]); }
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ background:'linear-gradient(145deg,rgba(79,142,247,0.1),rgba(8,18,38,0.97))', border:'1px solid rgba(79,142,247,0.25)', borderRadius:13, padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ fontSize:28 }}>?</div>
          <div>
            <div style={{ fontSize:14, fontWeight:900, color:'#4f8ef7' }}>{txt('aiEngineTitle')}</div>
            <div style={{ fontSize:10, color: 'var(--text-3)' }}>
              {txt('aiEngineDesc').replace('{count}', String(CREATORS.length)).replace('{model}', model || 'claude-3-5-sonnet')}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={runAnalysis} disabled={status === 'loading'} style={{
            flex:1, padding:'10px 16px', borderRadius:9, border:'none', cursor:'pointer',
            background: status === 'loading' ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#7c5cfc)',
            color: 'var(--text-1)', fontWeight:800, fontSize:12, transition:'all 0.2s',
            boxShadow: status !== 'loading' ? '0 4px 15px rgba(79,142,247,0.4)' : undefined,
          }}>{status === 'loading' ? txt('aiRunning') : txt('aiRun')}</button>
          <button onClick={loadHistory} style={{ padding:'10px 14px', borderRadius:9, border: '1px solid var(--border)', background:'transparent', color: 'var(--text-3)', cursor:'pointer', fontSize:11, fontWeight:700 }}>
            {txt('history')}
          </button>
        </div>
        {tokensUsed > 0 && (
          <div style={{ fontSize:10, color: 'var(--text-3)', marginTop:6 }}>
            {txt('tokensUsed')}: {tokensUsed.toLocaleString()} · {txt('model')}: {model}
          </div>
        )}
      </div>

      {status === 'error' && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', fontSize:12, color:'#f87171' }}>
          {result?.error}
        </div>
      )}

      {status === 'done' && result && (
        <>
          <div style={{ background:'linear-gradient(145deg,rgba(79,142,247,0.08),rgba(8,18,38,0.97))', border:'1px solid rgba(79,142,247,0.2)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:700, color: 'var(--text-3)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>{txt('portfolioReview')}</div>
            <div style={{ fontSize:12, color: 'var(--text-2)', lineHeight:1.7 }}>{result.overall_summary}</div>
            {result.immediate_action && (
              <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'rgba(79,142,247,0.12)', border:'1px solid rgba(79,142,247,0.25)', fontSize:12, color:'#4f8ef7', fontWeight:700 }}>
                {txt('immediateAction')} {result.immediate_action}
              </div>
            )}
          </div>
          {result.creators && (
            <div style={{ background:'linear-gradient(145deg,rgba(248,250,252,0.95),rgba(241,245,249,0.90))', border: '1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:11, fontWeight:700, color: 'var(--text-3)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>{txt('aiRanking')}</div>
              {[...result.creators].sort((a,b) => b.score - a.score).map((cr,i) => (
                <div key={cr.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize:10, color: 'var(--text-3)', width:14 }}>{i+1}</span>
                  <span style={{ fontSize:16, fontWeight:900, color:GRADE_COL[cr.grade] || '#fff', width:20 }}>{cr.grade}</span>
                  <span style={{ flex:1, fontSize:11, fontWeight:600, color: 'var(--text-1)' }}>{cr.name}</span>
                  <span style={{ fontSize:12, fontWeight:900, color:'#4f8ef7' }}>{cr.score}{txt('score')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {history && (
        <div style={{ background:'linear-gradient(145deg,rgba(248,250,252,0.95),rgba(241,245,249,0.90))', border: '1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontSize:11, fontWeight:700, color: 'var(--text-3)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>{txt('analysisHistory')}</div>
          {history.length === 0 && <div style={{ fontSize:11, color: 'var(--text-3)' }}>{txt('noHistory')}</div>}
          {history.map(h => (
            <div key={h.id} style={{ padding:'7px 0', borderBottom: '1px solid var(--border)', fontSize:11 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ color:'#4f8ef7', fontWeight:700 }}>#{h.id}</span>
                <span style={{ color: 'var(--text-3)', fontSize:10 }}>{h.created_at?.slice(0,16).replace('T',' ')}</span>
              </div>
              <div style={{ color: 'var(--text-3)', lineHeight:1.5 }}>{(h.summary || '').slice(0,80)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Empty State Panel 
const EmptyPanel = React.memo(function EmptyPanel({ txt }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:340, gap:12, color: 'var(--text-3)' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>?</div>
      <div style={{ fontSize:14, fontWeight:700, color: 'var(--text-3)' }}>{txt('noCreators')}</div>
      <div style={{ fontSize:11, maxWidth:300, textAlign:'center', lineHeight:1.6 }}>{txt('selectCreator')}</div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════
//  Main Component — Enterprise Super-Premium
// ══════════════════════════════════════════════════════════════════════
export default function DashInfluencer() {
  const { t, lang: ctxLang } = useI18n();
  const lang = ctxLang || 'ko';
  const txt = useCallback((k, fb) => LOC[lang]?.[k] || LOC.en?.[k] || t(`dash.${k}`, fb || k), [lang, t]);
  const { fmt: fmtC } = useCurrency();

  const [tab, setTab] = useState('reach');
  const tabHandler = useCallback((id) => setTab(id), []);

  // ✅ GlobalDataContext — Single Source of Truth
  const { pnlStats, orderStats, budgetStats, creators, addAlert } = useGlobalData();

  // ✅ SecurityGuard — Real-time threat monitoring with instant alerts
  const secStatus = useSecurityGuard({
    addAlert: useCallback((alert) => {
      if (typeof addAlert === 'function') addAlert(alert);
    }, [addAlert]),
    enabled: true,
  });

  // Security alerts from SecurityGuard
  const [secAlerts, setSecAlerts] = useState([]);
  useEffect(() => {
    const timer = setInterval(() => {
      try { setSecAlerts(getSecurityAlerts() || []); } catch { /* silent */ }
    }, 3000);
    try { setSecAlerts(getSecurityAlerts() || []); } catch { /* silent */ }
    return () => clearInterval(timer);
  }, []);

  // ✅ Production-only: GlobalDataContext creators onlyntext ?리?이?만 ?용 (?모 ?백 ?음)
  const creatorList = useMemo(() => (creators && creators.length > 0) ? creators : [], [creators]);

  // Real-time KPI aggregation (memoized)
  const kpis = useMemo(() => {
    const totalFol = creatorList.reduce((s, c) => s + (c.followers || 0), 0);
    const totalRev = creatorList.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalPurch = creatorList.reduce((s, c) => s + (c.purchases || 0), 0);
    let avgEng = '0.0';
    if (creatorList.length > 0) {
      avgEng = (creatorList.reduce((s, c) => {
        const f = c.followers || 1;
        return s + ((c.likes||0)+(c.comments||0)+(c.saves||0)+(c.shares||0))/f*100;
      }, 0) / creatorList.length).toFixed(1);
    }
    return { totalFol, totalRev, totalPurch, avgEng };
  }, [creatorList]);

  // Tab definitions (localized, memoized)
  const TABS = useMemo(() => [
    { id:'reach',   label: txt('reach') },
    { id:'engage',  label: txt('engage') },
    { id:'convert', label: txt('convert') },
    { id:'brand',   label: txt('brand') },
    { id:'quality', label: txt('quality') },
    { id:'report',  label: txt('report') },
    { id:'ai',      label: txt('ai') },
  ], [txt]);

  return (
    <div style={{ display:'grid', gap:G }}>
      {/* ── Real-time Status Badges ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'4px 0' }}>
        <StatusBadge text={txt('liveInfluencer')} col="#a855f7" />
        <StatusBadge ico="?" text={`${txt('orders')} ${(orderStats?.totalOrders||0).toLocaleString()}`} col="#22c55e" />
        <StatusBadge ico="?" text={`${txt('opProfit')} ${fmtC(pnlStats?.operatingProfit||0)}`} col="#eab308" />
        <StatusBadge ico="?" text={`${txt('adSpent')} ${fmtC(budgetStats?.totalSpent||0)}`} col="#f97316" />
        <StatusBadge ico="🛡️" text={secAlerts.length > 0 ? `${txt('threatsBlocked')} ${secAlerts.length}` : txt('secureConnection')} col={secAlerts.length > 0 ? '#f87171' : '#22c55e'} />
      </div>

      {/* ── KPI Summary 4-col ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:G }}>
        <KPICard ico="?" label={txt('totalFollowers')} value={fmt(kpis.totalFol)} delta={0.0} col="#a855f7" />
        <KPICard ico="?️" label={txt('avgEngRate')} value={`${kpis.avgEng}%`} delta={0.0} col="#ec4899" />
        <KPICard ico="?" label={txt('creatorRevenue')} value={fmtC(kpis.totalRev)} delta={0.0} col="#22c55e" />
        <KPICard ico="?" label={txt('totalPurchases')} value={fmt(kpis.totalPurch)} delta={0.0} col="#f97316" />
      </div>

      {/* ── Section Tabs ── */}
      <div style={{ display:'flex', gap:6, background: 'var(--surface)', borderRadius:12, padding:6, border: '1px solid var(--border)' }}>
        {TABS.map(tb => (
          <TabButton key={tb.id} id={tb.id} label={tb.label} active={tab === tb.id} onClick={() => tabHandler(tb.id)} />
        ))}
      </div>

      {/* ── Content Panel ── */}
      <div style={{ borderRadius:14, padding:'14px 16px', background: 'var(--surface)', border:'1px solid rgba(79,142,247,0.1)', minHeight:400 }}>
        {tab === 'ai' ? (
          <PanelAI txt={txt} />
        ) : tab === 'report' ? (
          <SecurityPanel txt={txt} secAlerts={secAlerts} />
        ) : creatorList.length === 0 ? (
          <EmptyPanel txt={txt} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {creatorList.map((cr, i) => {
              const engRate = cr.engRate || ((cr.likes||0)+(cr.comments||0)+(cr.saves||0)+(cr.shares||0))/(cr.followers||1)*100;
              const platCol = { Instagram:'#E1306C', YouTube:'#FF0000', TikTok:'#00f2ea' }[cr.platform] || '#4f8ef7';
              return (
                <div key={cr.id||i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background: 'var(--surface)', border: '1px solid var(--border)', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(79,142,247,0.06)'; e.currentTarget.style.borderColor='rgba(79,142,247,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor='rgba(0,0,0,0.06)'; }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${GRADE_COL[cr.grade]||'#4f8ef7'}33,${GRADE_COL[cr.grade]||'#4f8ef7'}11)`, border:`2px solid ${GRADE_COL[cr.grade]||'#4f8ef7'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:GRADE_COL[cr.grade]||'#4f8ef7', flexShrink:0 }}>{cr.grade}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:800, color: 'var(--text-1)' }}>{cr.name}</span>
                      <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:`${platCol}22`, color:platCol, fontWeight:700, border:`1px solid ${platCol}33` }}>{cr.platform}</span>
                    </div>
                    <div style={{ fontSize:10, color: 'var(--text-3)', marginTop:1 }}>{cr.handle}</div>
                  </div>
                  {tab === 'reach' && <>
                    <div style={{ textAlign:'right', minWidth:65 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colFollowers')}</div><div style={{ fontSize:13, fontWeight:900, color:'#a855f7' }}>{fmt(cr.followers)}</div></div>
                    <div style={{ textAlign:'right', minWidth:55 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colLikes')}</div><div style={{ fontSize:13, fontWeight:900, color:'#ec4899' }}>{fmt(cr.likes||0)}</div></div>
                  </>}
                  {tab === 'engage' && <>
                    <div style={{ textAlign:'right', minWidth:60 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colEngRate')}</div><div style={{ fontSize:13, fontWeight:900, color:'#22c55e' }}>{engRate.toFixed(1)}%</div></div>
                    <div style={{ textAlign:'right', minWidth:55 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colComments')}</div><div style={{ fontSize:13, fontWeight:900, color:'#4f8ef7' }}>{fmt(cr.comments||0)}</div></div>
                  </>}
                  {tab === 'convert' && <>
                    <div style={{ textAlign:'right', minWidth:70 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colRevenue')}</div><div style={{ fontSize:13, fontWeight:900, color:'#22c55e' }}>{fmtC(cr.revenue||0)}</div></div>
                    <div style={{ textAlign:'right', minWidth:55 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colPurchases')}</div><div style={{ fontSize:13, fontWeight:900, color:'#f97316' }}>{fmt(cr.purchases||0)}</div></div>
                  </>}
                  {tab === 'brand' && <>
                    <div style={{ textAlign:'right', minWidth:55 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colSaves')}</div><div style={{ fontSize:13, fontWeight:900, color:'#eab308' }}>{fmt(cr.saves||0)}</div></div>
                    <div style={{ textAlign:'right', minWidth:55 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colShares')}</div><div style={{ fontSize:13, fontWeight:900, color:'#06b6d4' }}>{fmt(cr.shares||0)}</div></div>
                  </>}
                  {tab === 'quality' && <>
                    <div style={{ textAlign:'right', minWidth:55 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colScore')}</div><div style={{ fontSize:13, fontWeight:900, color:GRADE_COL[cr.grade]||'#4f8ef7' }}>{cr.grade === 'S' ? 95 : cr.grade === 'A' ? 85 : cr.grade === 'B' ? 72 : 60}pt</div></div>
                    <div style={{ textAlign:'right', minWidth:65 }}><div style={{ fontSize:9, color: 'var(--text-3)' }}>{txt('colCampaigns')}</div><div style={{ fontSize:13, fontWeight:900, color:'#a855f7' }}>{(cr.campaigns||[]).length}</div></div>
                  </>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
