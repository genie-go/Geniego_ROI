/**
 * Inject topbar + gNav i18n keys into all 15 locale files
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/i18n/locales');

const T = {
  ko: {
    topbar: { notifications:"알림", markAllRead:"모두 읽음", noNotifications:"알림이 없습니다", editProfile:"회원정보 수정", subscription:"구독 관리", logout:"로그아웃", langSelect:"언어 선택", themeChange:"테마 변경",
      pg: { dashboard:"대시보드", adPerformance:"광고 성과", autoMarketing:"AI 마케팅 자동화", campaignManager:"캠페인 매니저", journeyBuilder:"고객 여정 빌더", budgetTracker:"예산 플래너", accountPerformance:"계정 성과", attribution:"어트리뷰션", channelKpi:"채널 KPI", graphScore:"그래프 스코어", crm:"CRM", kakaoChannel:"카카오 채널", emailMarketing:"이메일 마케팅", smsMarketing:"SMS 마케팅", influencer:"인플루언서 UGC", contentCalendar:"콘텐츠 캘린더", reviewsUgc:"리뷰 & UGC", webPopup:"웹 팝업", omniChannel:"옴니채널", catalogSync:"카탈로그 동기화", orderHub:"주문 허브", wmsManager:"WMS 관리", priceOpt:"가격 최적화", supplyChain:"공급망", returnsPortal:"반품 포털", performanceHub:"성과 허브", reportBuilder:"리포트 빌더", pnl:"손익 분석", aiInsights:"AI 인사이트", dataProduct:"데이터 프로덕트", aiRuleEngine:"AI 규칙 엔진", approvals:"승인 관리", writeback:"데이터 라이트백", onboarding:"온보딩", integrationHub:"연동 허브", dataSchema:"데이터 스키마", dataTrust:"데이터 신뢰도", settlements:"정산 관리", reconciliation:"대사 관리", pricing:"요금제", auditLog:"감사 로그", workspace:"팀 워크스페이스", operations:"운영 허브", help:"도움말", feedback:"피드백", developerHub:"개발자 허브", admin:"플랫폼 관리", dbAdmin:"DB 관리", pgConfig:"PG 설정", rollup:"롤업 대시보드", caseStudy:"사례 연구", demandForecast:"수요 예측", supplierPortal:"공급업체 포털", myCoupons:"내 쿠폰", license:"라이선스 활성화" }
    },
    gNav: { home:"홈", dashboardLabel:"대시보드", rollupLabel:"롤업 대시보드", aiMarketing:"AI 전략 & 캠페인", autoMarketingLabel:"AI 마케팅 자동화", campaignManagerLabel:"캠페인 매니저", journeyBuilderLabel:"고객 여정 빌더", adAnalytics:"광고 성과 분석", adPerformanceLabel:"광고 성과", budgetTrackerLabel:"예산 플래너", accountPerformanceLabel:"계정 성과", attributionLabel:"어트리뷰션", channelKpiLabel:"채널 KPI", graphScoreLabel:"그래프 스코어", crmLabel:"고객 & 채널", crmMainLabel:"CRM", kakaoChannelLabel:"카카오 채널", emailMarketingLabel:"이메일 마케팅", smsMarketingLabel:"SMS 마케팅", influencerLabel:"인플루언서", contentCalendarLabel:"콘텐츠 캘린더", reviewsUgcLabel:"리뷰 & UGC", webPopupLabel:"웹 팝업", commerceLabel:"커머스 & 물류", omniChannelLabel:"옴니채널", catalogLabel:"카탈로그 동기화", orderHubLabel:"주문 허브", wmsLabel:"WMS 관리", priceOptLabel:"가격 최적화", supplyChainLabel:"공급망", returnsPortalLabel:"반품 포털", analytics:"인사이트 & 리포트", performanceHubLabel:"성과 허브", reportBuilderLabel:"리포트 빌더", pnlLabel:"손익 분석", aiInsightsLabel:"AI 인사이트", dataProductLabel:"데이터 프로덕트", automation:"자동화 & 알람", aiRuleEngineLabel:"AI 규칙 엔진", approvalsLabel:"승인 관리", writebackLabel:"데이터 라이트백", onboardingLabel:"온보딩", data:"데이터 & 연동", integrationHubLabel:"연동 허브", dataSchemaLabel:"데이터 스키마", dataTrustLabel:"데이터 신뢰도", finance:"재무 & 결산", settlementsLabel:"정산 관리", reconciliationLabel:"대사 관리", pricingLabel:"요금제", auditLogLabel:"감사 로그", memberTools:"운영 & 지원", workspaceLabel:"팀 워크스페이스", operationsLabel:"운영 허브", caseStudyLabel:"사례 연구", helpLabel:"도움말", feedbackLabel:"피드백", developerHubLabel:"개발자 허브", adminSystem:"시스템 관리", platformEnvLabel:"플랫폼 환경", dbSchemaLabel:"DB 관리", paymentPgLabel:"PG 설정" }
  },
  en: {
    topbar: { notifications:"Notifications", markAllRead:"Mark all read", noNotifications:"No notifications", editProfile:"Edit Profile", subscription:"Subscription", logout:"Logout", langSelect:"Language", themeChange:"Change Theme",
      pg: { dashboard:"Dashboard", adPerformance:"Ad Performance", autoMarketing:"Auto Marketing", campaignManager:"Campaign Manager", journeyBuilder:"Journey Builder", budgetTracker:"Budget Tracker", accountPerformance:"Account Performance", attribution:"Attribution", channelKpi:"Channel KPI", graphScore:"Graph Score", crm:"CRM", kakaoChannel:"Kakao Channel", emailMarketing:"Email Marketing", smsMarketing:"SMS Marketing", influencer:"Influencer UGC", contentCalendar:"Content Calendar", reviewsUgc:"Reviews & UGC", webPopup:"Web Popup", omniChannel:"Omni Channel", catalogSync:"Catalog Sync", orderHub:"Order Hub", wmsManager:"WMS Manager", priceOpt:"Price Optimization", supplyChain:"Supply Chain", returnsPortal:"Returns Portal", performanceHub:"Performance Hub", reportBuilder:"Report Builder", pnl:"P&L Analytics", aiInsights:"AI Insights", dataProduct:"Data Product", aiRuleEngine:"AI Rule Engine", approvals:"Approvals", writeback:"Writeback", onboarding:"Onboarding", integrationHub:"Integration Hub", dataSchema:"Data Schema", dataTrust:"Data Trust", settlements:"Settlements", reconciliation:"Reconciliation", pricing:"Pricing", auditLog:"Audit Log", workspace:"Team Workspace", operations:"Operations Hub", help:"Help Center", feedback:"Feedback", developerHub:"Developer Hub", admin:"Platform Admin", dbAdmin:"DB Admin", pgConfig:"PG Config", rollup:"Rollup Dashboard", caseStudy:"Case Study", demandForecast:"Demand Forecast", supplierPortal:"Supplier Portal", myCoupons:"My Coupons", license:"License Activation" }
    },
    gNav: { home:"Home", dashboardLabel:"Dashboard", rollupLabel:"Rollup Dashboard", aiMarketing:"AI Strategy & Campaigns", autoMarketingLabel:"Auto Marketing", campaignManagerLabel:"Campaign Manager", journeyBuilderLabel:"Journey Builder", adAnalytics:"Ad Analytics", adPerformanceLabel:"Ad Performance", budgetTrackerLabel:"Budget Tracker", accountPerformanceLabel:"Account Performance", attributionLabel:"Attribution", channelKpiLabel:"Channel KPI", graphScoreLabel:"Graph Score", crmLabel:"Customer & Channels", crmMainLabel:"CRM", kakaoChannelLabel:"Kakao Channel", emailMarketingLabel:"Email Marketing", smsMarketingLabel:"SMS Marketing", influencerLabel:"Influencer", contentCalendarLabel:"Content Calendar", reviewsUgcLabel:"Reviews & UGC", webPopupLabel:"Web Popup", commerceLabel:"Commerce & Logistics", omniChannelLabel:"Omni Channel", catalogLabel:"Catalog Sync", orderHubLabel:"Order Hub", wmsLabel:"WMS Manager", priceOptLabel:"Price Optimization", supplyChainLabel:"Supply Chain", returnsPortalLabel:"Returns Portal", analytics:"Analytics & Reports", performanceHubLabel:"Performance Hub", reportBuilderLabel:"Report Builder", pnlLabel:"P&L Analytics", aiInsightsLabel:"AI Insights", dataProductLabel:"Data Product", automation:"Automation & Alerts", aiRuleEngineLabel:"AI Rule Engine", approvalsLabel:"Approvals", writebackLabel:"Writeback", onboardingLabel:"Onboarding", data:"Data & Integration", integrationHubLabel:"Integration Hub", dataSchemaLabel:"Data Schema", dataTrustLabel:"Data Trust", finance:"Finance & Settlement", settlementsLabel:"Settlements", reconciliationLabel:"Reconciliation", pricingLabel:"Pricing", auditLogLabel:"Audit Log", memberTools:"Member Tools", workspaceLabel:"Team Workspace", operationsLabel:"Operations Hub", caseStudyLabel:"Case Study", helpLabel:"Help Center", feedbackLabel:"Feedback", developerHubLabel:"Developer Hub", adminSystem:"System Admin", platformEnvLabel:"Platform Admin", dbSchemaLabel:"DB Admin", paymentPgLabel:"PG Config" }
  },
  ja: {
    topbar: { notifications:"通知", markAllRead:"すべて既読", noNotifications:"通知はありません", editProfile:"会員情報修正", subscription:"サブスクリプション管理", logout:"ログアウト", langSelect:"言語選択", themeChange:"テーマ変更",
      pg: { dashboard:"ダッシュボード", adPerformance:"広告パフォーマンス", autoMarketing:"AIマーケティング自動化", campaignManager:"キャンペーンマネージャー", journeyBuilder:"カスタマージャーニー", budgetTracker:"予算プランナー", accountPerformance:"アカウント実績", attribution:"アトリビューション", channelKpi:"チャネルKPI", graphScore:"グラフスコア", crm:"CRM", kakaoChannel:"カカオチャネル", emailMarketing:"メールマーケティング", smsMarketing:"SMSマーケティング", influencer:"インフルエンサーUGC", contentCalendar:"コンテンツカレンダー", reviewsUgc:"レビュー＆UGC", webPopup:"Webポップアップ", omniChannel:"オムニチャネル", catalogSync:"カタログ同期", orderHub:"注文ハブ", wmsManager:"WMS管理", priceOpt:"価格最適化", supplyChain:"サプライチェーン", returnsPortal:"返品ポータル", performanceHub:"パフォーマンスハブ", reportBuilder:"レポートビルダー", pnl:"損益分析", aiInsights:"AIインサイト", dataProduct:"データプロダクト", aiRuleEngine:"AIルールエンジン", approvals:"承認管理", writeback:"ライトバック", onboarding:"オンボーディング", integrationHub:"統合ハブ", dataSchema:"データスキーマ", dataTrust:"データ信頼性", settlements:"精算管理", reconciliation:"照合管理", pricing:"料金プラン", auditLog:"監査ログ", workspace:"チームワークスペース", operations:"運営ハブ", help:"ヘルプセンター", feedback:"フィードバック", developerHub:"開発者ハブ", admin:"プラットフォーム管理", dbAdmin:"DB管理", pgConfig:"PG設定", rollup:"ロールアップ", caseStudy:"ケーススタディ", demandForecast:"需要予測", supplierPortal:"サプライヤーポータル", myCoupons:"マイクーポン", license:"ライセンス認証" }
    },
    gNav: { home:"ホーム", dashboardLabel:"ダッシュボード", rollupLabel:"ロールアップ", aiMarketing:"AI戦略＆キャンペーン", autoMarketingLabel:"AIマーケティング自動化", campaignManagerLabel:"キャンペーンマネージャー", journeyBuilderLabel:"カスタマージャーニー", adAnalytics:"広告分析", adPerformanceLabel:"広告パフォーマンス", budgetTrackerLabel:"予算プランナー", accountPerformanceLabel:"アカウント実績", attributionLabel:"アトリビューション", channelKpiLabel:"チャネルKPI", graphScoreLabel:"グラフスコア", crmLabel:"顧客＆チャネル", crmMainLabel:"CRM", kakaoChannelLabel:"カカオチャネル", emailMarketingLabel:"メールマーケティング", smsMarketingLabel:"SMSマーケティング", influencerLabel:"インフルエンサー", contentCalendarLabel:"コンテンツカレンダー", reviewsUgcLabel:"レビュー＆UGC", webPopupLabel:"Webポップアップ", commerceLabel:"コマース＆物流", omniChannelLabel:"オムニチャネル", catalogLabel:"カタログ同期", orderHubLabel:"注文ハブ", wmsLabel:"WMS管理", priceOptLabel:"価格最適化", supplyChainLabel:"サプライチェーン", returnsPortalLabel:"返品ポータル", analytics:"インサイト＆レポート", performanceHubLabel:"パフォーマンスハブ", reportBuilderLabel:"レポートビルダー", pnlLabel:"損益分析", aiInsightsLabel:"AIインサイト", dataProductLabel:"データプロダクト", automation:"自動化＆アラート", aiRuleEngineLabel:"AIルールエンジン", approvalsLabel:"承認管理", writebackLabel:"ライトバック", onboardingLabel:"オンボーディング", data:"データ＆連携", integrationHubLabel:"統合ハブ", dataSchemaLabel:"データスキーマ", dataTrustLabel:"データ信頼性", finance:"財務＆決算", settlementsLabel:"精算管理", reconciliationLabel:"照合管理", pricingLabel:"料金プラン", auditLogLabel:"監査ログ", memberTools:"運営＆サポート", workspaceLabel:"チームワークスペース", operationsLabel:"運営ハブ", caseStudyLabel:"ケーススタディ", helpLabel:"ヘルプセンター", feedbackLabel:"フィードバック", developerHubLabel:"開発者ハブ", adminSystem:"システム管理", platformEnvLabel:"プラットフォーム管理", dbSchemaLabel:"DB管理", paymentPgLabel:"PG設定" }
  }
};

// For remaining languages, clone EN with wmsManager translated
const langMap = {
  zh: { wms:"WMS管理", commerce:"商务与物流", notifications:"通知", markAllRead:"全部已读", noNotifications:"暂无通知", editProfile:"编辑资料", subscription:"订阅管理", logout:"退出登录", langSelect:"语言", themeChange:"更换主题" },
  'zh-TW': { wms:"WMS管理", commerce:"商務與物流", notifications:"通知", markAllRead:"全部已讀", noNotifications:"暫無通知", editProfile:"編輯資料", subscription:"訂閱管理", logout:"登出", langSelect:"語言", themeChange:"更換主題" },
  de: { wms:"WMS-Verwaltung", commerce:"Handel & Logistik", notifications:"Benachrichtigungen", markAllRead:"Alle gelesen", noNotifications:"Keine Benachrichtigungen", editProfile:"Profil bearbeiten", subscription:"Abonnement", logout:"Abmelden", langSelect:"Sprache", themeChange:"Design ändern" },
  th: { wms:"จัดการ WMS", commerce:"การค้าและโลจิสติกส์", notifications:"การแจ้งเตือน", markAllRead:"อ่านทั้งหมด", noNotifications:"ไม่มีการแจ้งเตือน", editProfile:"แก้ไขโปรไฟล์", subscription:"การสมัครสมาชิก", logout:"ออกจากระบบ", langSelect:"ภาษา", themeChange:"เปลี่ยนธีม" },
  vi: { wms:"Quản lý WMS", commerce:"Thương mại & Logistics", notifications:"Thông báo", markAllRead:"Đọc tất cả", noNotifications:"Không có thông báo", editProfile:"Sửa hồ sơ", subscription:"Quản lý đăng ký", logout:"Đăng xuất", langSelect:"Ngôn ngữ", themeChange:"Đổi giao diện" },
  id: { wms:"Manajemen WMS", commerce:"Perdagangan & Logistik", notifications:"Notifikasi", markAllRead:"Tandai semua dibaca", noNotifications:"Tidak ada notifikasi", editProfile:"Edit Profil", subscription:"Langganan", logout:"Keluar", langSelect:"Bahasa", themeChange:"Ganti Tema" },
  es: { wms:"Gestión WMS", commerce:"Comercio y Logística", notifications:"Notificaciones", markAllRead:"Marcar todo leído", noNotifications:"Sin notificaciones", editProfile:"Editar perfil", subscription:"Suscripción", logout:"Cerrar sesión", langSelect:"Idioma", themeChange:"Cambiar tema" },
  fr: { wms:"Gestion WMS", commerce:"Commerce et Logistique", notifications:"Notifications", markAllRead:"Tout marquer lu", noNotifications:"Aucune notification", editProfile:"Modifier le profil", subscription:"Abonnement", logout:"Déconnexion", langSelect:"Langue", themeChange:"Changer le thème" },
  pt: { wms:"Gestão WMS", commerce:"Comércio e Logística", notifications:"Notificações", markAllRead:"Marcar tudo lido", noNotifications:"Sem notificações", editProfile:"Editar perfil", subscription:"Assinatura", logout:"Sair", langSelect:"Idioma", themeChange:"Mudar tema" },
  ru: { wms:"Управление WMS", commerce:"Коммерция и логистика", notifications:"Уведомления", markAllRead:"Прочитать все", noNotifications:"Нет уведомлений", editProfile:"Редактировать профиль", subscription:"Подписка", logout:"Выход", langSelect:"Язык", themeChange:"Сменить тему" },
  ar: { wms:"إدارة WMS", commerce:"التجارة والخدمات اللوجستية", notifications:"الإشعارات", markAllRead:"قراءة الكل", noNotifications:"لا توجد إشعارات", editProfile:"تعديل الملف الشخصي", subscription:"الاشتراك", logout:"تسجيل الخروج", langSelect:"اللغة", themeChange:"تغيير المظهر" },
  hi: { wms:"WMS प्रबंधन", commerce:"वाणिज्य और रसद", notifications:"सूचनाएँ", markAllRead:"सभी पढ़ें", noNotifications:"कोई सूचना नहीं", editProfile:"प्रोफ़ाइल संपादित करें", subscription:"सदस्यता", logout:"लॉग आउट", langSelect:"भाषा", themeChange:"थीम बदलें" },
};

// Build full data for non-ko/en/ja languages from EN template
for (const [lang, overrides] of Object.entries(langMap)) {
  const enTopbar = JSON.parse(JSON.stringify(T.en.topbar));
  const enGNav = JSON.parse(JSON.stringify(T.en.gNav));
  enTopbar.notifications = overrides.notifications;
  enTopbar.markAllRead = overrides.markAllRead;
  enTopbar.noNotifications = overrides.noNotifications;
  enTopbar.editProfile = overrides.editProfile;
  enTopbar.subscription = overrides.subscription;
  enTopbar.logout = overrides.logout;
  enTopbar.langSelect = overrides.langSelect;
  enTopbar.themeChange = overrides.themeChange;
  enTopbar.pg.wmsManager = overrides.wms;
  enGNav.wmsLabel = overrides.wms;
  enGNav.commerceLabel = overrides.commerce;
  T[lang] = { topbar: enTopbar, gNav: enGNav };
}

// Inject into each locale file
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let count = 0;
for (const file of files) {
  const lang = file.replace('.js', '');
  const data = T[lang];
  if (!data) { console.log(`SKIP ${lang} (no data)`); continue; }
  
  const fp = path.join(dir, file);
  let src = fs.readFileSync(fp, 'utf8');
  
  // Find the default export object and inject keys at the beginning
  // Format: export default { ... }
  // We inject after the first {
  const topbarJson = JSON.stringify(data.topbar);
  const gNavJson = JSON.stringify(data.gNav);
  
  // Check if keys already exist
  if (src.includes('"topbar"') && src.includes('"gNav"')) {
    console.log(`SKIP ${lang} (keys exist)`);
    continue;
  }
  
  // Insert after "export default {"
  const insertPoint = src.indexOf('{');
  if (insertPoint === -1) { console.log(`ERR ${lang}: no opening brace`); continue; }
  
  let injection = '';
  if (!src.includes('"topbar"')) injection += `"topbar":${topbarJson},`;
  if (!src.includes('"gNav"')) injection += `"gNav":${gNavJson},`;
  
  src = src.slice(0, insertPoint + 1) + injection + src.slice(insertPoint + 1);
  fs.writeFileSync(fp, src, 'utf8');
  console.log(`OK ${lang}`);
  count++;
}
console.log(`\nDone: ${count} files updated`);
