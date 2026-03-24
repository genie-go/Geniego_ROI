const fs = require('fs');
const path = require('path');

// ── 1. Fix "외 N개" in Pricing.jsx ──────────────────────────────────────────
let pricing = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');
const OLD_MORE = '` 외 ${sec.items.length - 2}개`';
const NEW_MORE = '` ${t("pricing.moreItems", { count: sec.items.length - 2 })}`';
if (pricing.includes(OLD_MORE)) {
  pricing = pricing.replace(OLD_MORE, NEW_MORE);
  fs.writeFileSync('src/pages/Pricing.jsx', pricing, 'utf8');
  console.log('✅ Fixed 외 N개 → moreItems i18n');
} else {
  console.log('⚠ Could not find 외 N개 text');
}

// ── 2. Add moreItems key to all locale files ──────────────────────────────
const MORE_ITEMS = {
  ko: '외 {{count}}개',
  en: '+ {{count}} more',
  ja: '他 {{count}}件',
  zh: '另外 {{count}} 项',
  de: '+ {{count}} weitere',
  th: 'อีก {{count}} รายการ',
  vi: '+ {{count}} mục khác',
  id: '+ {{count}} lainnya',
  'zh-TW': '另外 {{count}} 項',
};

// ── 3. Add pricingDetail for zh/de/th/vi/id/zh-TW ─────────────────────────
// Using English as base with language-specific terms for key UI labels

// zh - 简体中文
const ZH_PRICING_DETAIL = `
ko.cmpRow = ko.cmpRow || {};`;  // placeholder

// Actually generate per-language
const LANG_TRANSLATIONS = {
  zh: {
    varName: 'zh',
    pricingDetail_prefix: `
zh.pricingDetail = {
  free_tagline:"免费开始，探索平台", free_headline:"演示体验方案",
  free_desc:"注册后即可体验完整的Geniego-ROI平台。通过关键仪表盘和演示数据探索功能。",
  free_s1:"🏠 首页仪表盘", free_s1i1:"KPI小部件 (演示)", free_s1i2:"快速链接", free_s1i3:"新手指南",
  free_s2:"📚 我的团队·帮助", free_s2i2:"视频教程", free_s2i3:"更新日志",
  free_s3:"💳 订阅·账单", free_s3i1:"查看当前方案", free_s3i2:"升级方案",
  free_l1:"无实时数据", free_l2:"无法进行实际渠道连接", free_l3:"无法保存或下载",
  growth_tagline:"成长型中小卖家·品牌", growth_headline:"营销增长方案",
  growth_desc:"通过国内主要电商渠道和基本CRM自动化，全面发展您的销售额。",
  growth_s1:"🚀 AI营销自动化 (核心)", growth_s1i1:"AI广告素材生成", growth_s1i2:"活动设置·管理·列表·报告", growth_s1i3:"内容日历", growth_s1i4:"预算规划器", growth_s1i5:"通知策略列表·日志",
  growth_s2:"📣 广告·渠道分析 (国内)", growth_s2i1:"广告摘要·渠道·产品分析", growth_s2i2:"ROAS分析", growth_s2i3:"关键词分析", growth_s2i4:"渠道KPI (曝光·点击率·转化率·CPA/CPC)", growth_s2i5:"ROAS计算器",
  growth_s3:"👥 客户·CRM (基础)", growth_s3i1:"客户数据库·360°视图·标签管理", growth_s3i2:"RFM分析·分段构建器·消息发送", growth_s3i3:"邮件活动 (发送·A/B·绩效·计划)", growth_s3i4:"Kakao通知·好友消息·统计", growth_s3i5:"SMS/LMS活动·短信模板", growth_s3i6:"退出弹窗·网页弹窗 (基础)",
  growth_s4:"🛒 电商·物流 (国内)", growth_s4i1:"Coupang·Naver·Cafe24渠道集成", growth_s4i2:"订单中心 (全部订单·索赔·退货·发货·结算)", growth_s4i3:"批量商品注册·目录同步·价格规则", growth_s4i4:"基础WMS (库存·提醒·入库·出库)", growth_s4i5:"月度结算·发货·Excel导出", growth_s4i6:"3PL供应商列表查看",
  growth_s5:"📊 分析·绩效", growth_s5i1:"绩效摘要·渠道·产品·活动", growth_s5i2:"P&L概览", growth_s5i3:"AI洞察推送", growth_s5i4:"自定义报告·Excel导出",
  growth_s6:"💳 结算·财务", growth_s6i1:"结算历史·渠道结算·Excel", growth_s6i2:"付款列表·Excel", growth_s6i3:"方案确认·账单历史·发票", growth_s6i4:"许可证激活·状态",
  growth_s7:"🔌 渠道·数据集成 (国内)", growth_s7i1:"Meta·Google·TikTok·Naver·Kakao广告集成", growth_s7i2:"Coupang连接器", growth_s7i3:"货币单位选择 (KRW/USD/JPY/EUR 全局)",
  growth_s8:"👥 团队管理", growth_s8i1:"团队成员列表·邀请", growth_s8i2:"我的操作历史", growth_s8i3:"支持工单",
  growth_l1:"AI预测 (流失·LTV) — Pro+", growth_l2:"客户旅程构建器 — Pro+", growth_l3:"全球渠道 (WhatsApp·LINE·DM) — Pro+", growth_l4:"AI规则引擎 — Pro+", growth_l5:"1st-Party像素·API密钥 — Pro+", growth_l6:"SmartConnect ERP集成 — Pro+",
  pro_tagline:"专业电商品牌·代理商", pro_headline:"AI自动化方案", pro_badge:"热门",
  pro_desc:"增长全部 + AI预测·旅程构建器·全球渠道·规则引擎·SmartConnect·1st-Party像素·高级BI。",
  pro_s1:"🧠 AI预测引擎 (新)", pro_s1i1:"流失预测·LTV预测·购买概率", pro_s1i2:"图形评分", pro_s1i3:"下一步最佳行动推荐", pro_s1i4:"产品推荐AI", pro_s1i5:"AI广告洞察", pro_s1i6:"AI分段 (VIP·流失风险·潜在VIP自动分类)",
  pro_s2:"🗺 客户旅程构建器 (新)", pro_s2i1:"旅程画布 (拖放)", pro_s2i2:"触发器设置·动作节点管理", pro_s2i3:"旅程绩效统计分析", pro_s2i4:"A/B测试 (邮件·弹窗)",
  pro_s3:"🌏 全球渠道全部 (新)", pro_s3i1:"Shopify·Amazon·LINE Ads集成", pro_s3i2:"WhatsApp广播·自动化", pro_s3i3:"Instagram DM·Facebook DM·DM活动", pro_s3i4:"LINE消息活动·统计", pro_s3i5:"弹窗A/B测试·触发器设置",
  pro_s4:"🏭 高级WMS + 电商扩展", pro_s4i1:"库存调整·位置管理·条码集成", pro_s4i2:"月度结算集成·税务发票·付款审批", pro_s4i3:"3PL供应商添加·编辑", pro_s4i4:"采集日志基础查看",
  pro_s5:"🤖 AI规则引擎·自动化 (新)", pro_s5i1:"AI策略设置·规则列表·测试", pro_s5i2:"通知评估模型", pro_s5i3:"动作预设管理", pro_s5i4:"Writeback设置·日志", pro_s5i5:"审批决策自动化",
  pro_s6:"⭐ 评价 & UGC分析 (新)", pro_s6i1:"渠道评价收集·情感分析 (正面/负面/中立)", pro_s6i2:"AI自动回复草稿生成", pro_s6i3:"UGC (Instagram·YouTube) 绩效分析", pro_s6i4:"关键词分析",
  pro_s7:"🤝 SmartConnect中心 (新)", pro_s7i1:"ERP·SCM·3PL基础集成设置", pro_s7i2:"REST API / Webhook / SFTP集成", pro_s7i3:"字段映射设置", pro_s7i4:"基础同步日志查看",
  pro_s8:"🎯 1st-Party像素 + 数据", pro_s8i1:"像素代码安装·验证", pro_s8i2:"实时事件流查看", pro_s8i3:"归因分析 (触点模型·ROAS)", pro_s8i4:"事件收集·数据架构·映射", pro_s8i5:"API密钥·Webhook·OAuth集成",
  pro_s9:"📊 高级分析·BI", pro_s9i1:"同期群分析", pro_s9i2:"P&L按渠道·产品·趋势", pro_s9i3:"异常检测·竞争对手AI分析", pro_s9i4:"网红绩效查看",
  pro_s10:"💱 实时汇率 + 团队管理", pro_s10i1:"实时汇率自动获取 (货币单位全局)", pro_s10i2:"团队活动审计", pro_s10i3:"系统状态·API监控", pro_s10i4:"批处理作业运行·重新处理",
  pro_l1:"Writeback即时回滚 — Enterprise", pro_l2:"Amazon政策·评价管理 — Enterprise", pro_l3:"市场份额·趋势AI — Enterprise", pro_l4:"Data Product SLA·治理 — Enterprise", pro_l5:"SmartConnect合作伙伴API双向 — Enterprise", pro_l6:"网红数据库·活动执行 — Enterprise", pro_l7:"审计日志完整导出 — Enterprise", pro_l8:"自动报告·计划发送 — Enterprise", pro_l9:"API数据流式导出 — Enterprise",
  ent_tagline:"大型电商·代理商·集团", ent_headline:"无限一切方案", ent_badge:"顶级",
  ent_desc:"Pro全部 + 即时回滚·Amazon政策管理·市场份额·Data Product治理·SmartConnect合作伙伴API·网红数据库·完整审计·自动报告。",
  ent_s1:"↩ Writeback即时回滚 (新)", ent_s1i1:"Writeback设置·日志", ent_s1i2:"即时回滚 (立即恢复错误)", ent_s1i3:"多品牌自动执行", ent_s1i4:"完整回滚历史查看",
  ent_s2:"🌏 Amazon高级运营 (新)", ent_s2i1:"Amazon账户健康监控", ent_s2i2:"政策合规管理", ent_s2i3:"完整评价监控", ent_s2i4:"商品列表质量审计",
  ent_s3:"📊 市场情报 (新)", ent_s3i1:"市场份额分析", ent_s3i2:"竞争对手广告追踪 (AI)", ent_s3i3:"趋势AI预测模型", ent_s3i4:"渠道归因所有模型", ent_s3i5:"转化路径分析",
  ent_s4:"🗂 Data Product治理 (新)", ent_s4i1:"Data Product架构·质量指标", ent_s4i2:"SLA管理·所有者分配", ent_s4i3:"API数据流式导出", ent_s4i4:"事件规范化完整管理", ent_s4i5:"OAuth合作伙伴管理", ent_s4i6:"高级数据映射",
  ent_s5:"🤝 SmartConnect合作伙伴API (新)", ent_s5i1:"合作伙伴级双向实时集成", ent_s5i2:"完整实时同步日志", ent_s5i3:"ERP·SCM·WMS完整集成", ent_s5i4:"自定义Webhook高级设置",
  ent_s6:"💡 营销高级化 (新)", ent_s6i1:"完整网红数据库·活动执行·结算", ent_s6i2:"Kakao商业板 (大型广告)", ent_s6i3:"WhatsApp高级设置 (渠道API)", ent_s6i4:"LINE渠道高级设置", ent_s6i5:"AI分段高级 (自定义标准)", ent_s6i6:"竞争对手评价比较分析",
  ent_s7:"⚡ 运营·治理全部 (新)", ent_s7i1:"运营中心通知发送 (管理员通知)", ent_s7i2:"3PL供应商删除·合同管理", ent_s7i3:"完整审计日志·CSV导出", ent_s7i4:"系统监控通知设置", ent_s7i5:"自动报告生成·计划发送", ent_s7i6:"仪表盘外部共享·嵌入",
  ent_s8:"🚀 包含Pro全部 + 无限", ent_s8i1:"包含Pro方案全部功能", ent_s8i2:"无限账户·用户·团队成员", ent_s8i3:"优先支持SLA", ent_s8i4:"专属入职咨询·年度培训",
  ent_s9:"💎 定制·专属服务", ent_s9i1:"定制仪表盘配置", ent_s9i2:"专属经理分配", ent_s9i3:"年度合同定制折扣", ent_s9i4:"定制培训·研讨会",
};
zh.cmpRow = {
  r1:"首页仪表盘", r2:"AI广告素材·活动管理", r3:"AI预测 (流失·LTV·购买概率)", r4:"客户旅程构建器", r5:"AI分段", r6:"广告·渠道分析 (ROAS·KPI)",
  r7:"归因分析 (触点模型)", r8:"竞争对手AI分析", r9:"客户·CRM (邮件/Kakao/SMS)", r10:"评价 & UGC分析", r11:"电商渠道", r12:"WMS (库存·入出库)",
  r13:"3PL管理", r14:"Amazon高级运营", r15:"分析·绩效 (同期群·P&L)", r16:"AI规则引擎·自动化", r17:"SmartConnect (ERP·SCM)", r18:"1st-Party像素",
  r19:"数据管道·API", r20:"Data Product治理", r21:"BI报告", r22:"货币单位选择 (全局)", r23:"网红管理", r24:"运营中心 (批处理·重处理)",
  r25:"审计日志", r26:"团队管理 (RBAC)", r27:"账户数量", r28:"支持方式",
};
zh.cmpVal = {
  all:"全部", basic:"基础", realtime:"实时", domestic_core:"国内核心", domestic:"国内", dom_global:"国内+全球", market_share:"市场份额",
  basic_auto:"基础自动分类", advanced_custom:"高级自定义", conv_path_all:"转化路径全部", trend_forecast:"趋势预测", bizboard:"商业板", competitor_compare:"竞争对手比较",
  location_barcode:"位置·条码", list_view:"列表查看", contract:"合同", policy_review:"政策·评价·商品列表", cohort_pl:"同期群·P&L全部", notification_basic:"通知基础",
  rule_writeback:"规则引擎·Writeback", instant_rollback:"即时回滚", partner_api:"合作伙伴API双向", install_analysis:"安装·分析", server_side:"服务器端",
  domestic_ads:"国内广告集成", schema_quality_view:"架构·质量查看", owner_streaming:"所有者·流式传输", custom_excel:"自定义·Excel", anomaly_detect:"异常检测",
  auto_scheduled_share:"自动·计划·共享", manual:"手动", realtime_rate:"实时汇率", perf_view:"绩效查看", campaign_settle:"活动·结算", reprocess:"重处理",
  notification_send:"通知发送", own_history:"我的历史", list_invite:"列表·邀请", activity_history:"活动历史", rbac_role:"RBAC角色设置", unlimited:"无限",
  chat_support:"聊天支持", dedicated_manager:"专属经理", dedicated_sla:"专属 + SLA",
};
`,
  },
  de: {
    varName: 'de',
    pricingDetail_prefix: `
de.pricingDetail = {
  free_tagline:"Kostenlos starten, Plattform erkunden", free_headline:"Demo-Erfahrungsplan",
  free_desc:"Erleben Sie sofort nach der Registrierung die gesamte Geniego-ROI-Plattform.",
  free_s1:"🏠 Startseiten-Dashboard", free_s1i1:"KPI-Widgets (Demo)", free_s1i2:"Schnelllinks", free_s1i3:"Onboarding-Leitfaden",
  free_s2:"📚 Mein Team · Hilfe", free_s2i2:"Video-Tutorials", free_s2i3:"Versionshinweise",
  free_s3:"💳 Abonnement · Abrechnung", free_s3i1:"Aktuellen Plan ansehen", free_s3i2:"Plan upgraden",
  free_l1:"Keine Echtzeit-Daten", free_l2:"Keine Live-Kanalintegration", free_l3:"Kein Speichern oder Download",
  growth_tagline:"Wachsende KMU-Verkäufer & Marken", growth_headline:"Marketing-Wachstumsplan",
  growth_desc:"Steigern Sie Ihren Umsatz mit heimischen E-Commerce-Kanälen und grundlegender CRM-Automatisierung.",
  growth_s1:"🚀 KI-Marketing-Automatisierung (Kern)", growth_s1i1:"KI-Anzeigenkreativ-Generierung", growth_s1i2:"Kampagnen-Setup·Verwaltung·Liste·Bericht", growth_s1i3:"Inhaltskalender", growth_s1i4:"Budget-Planer", growth_s1i5:"Benachrichtigungsrichtlinie·Protokolle",
  growth_s2:"📣 Anzeigen- & Kanalanalyse (Inland)", growth_s2i1:"Anzeigenübersicht·Kanal·Produktanalyse", growth_s2i2:"ROAS-Analyse", growth_s2i3:"Keyword-Analyse", growth_s2i4:"Kanal-KPI (Impressionen·CTR·CVR·CPA/CPC)", growth_s2i5:"ROAS-Rechner",
  growth_s3:"👥 Kunden-CRM (Basis)", growth_s3i1:"Kunden-DB·360°-Ansicht·Tag-Verwaltung", growth_s3i2:"RFM-Analyse·Segment-Builder·Nachrichtenversand", growth_s3i3:"E-Mail-Kampagne (Senden·A/B·Leistung·Zeitplan)", growth_s3i4:"Kakao-Benachrichtigung·Freundesnachricht·Stats", growth_s3i5:"SMS/LMS-Kampagne·Textvorlagen", growth_s3i6:"Exit-Popup·Web-Popup (Basis)",
  growth_s4:"🛒 Commerce & Logistik (Inland)", growth_s4i1:"Coupang·Naver·Cafe24 Kanalintegration", growth_s4i2:"Bestellzentrum (Alle Bestellungen·Reklamationen·Rücksendungen)", growth_s4i3:"Massenproduktregistrierung·Katalogsync·Preisregeln", growth_s4i4:"Basis-WMS (Bestand·Benachrichtigungen·Eingang·Ausgang)", growth_s4i5:"Monatliche Abrechnung·Versand·Excel-Export", growth_s4i6:"3PL-Anbieter-Listenansicht",
  growth_s5:"📊 Analyse & Leistung", growth_s5i1:"Leistungsübersicht·Kanal·Produkt·Kampagne", growth_s5i2:"P&L-Überblick", growth_s5i3:"KI-Insight-Feed", growth_s5i4:"Benutzerdefinierter Bericht·Excel-Export",
  growth_s6:"💳 Abrechnung & Finanzen", growth_s6i1:"Abrechnungsverlauf·Kanal·Excel", growth_s6i2:"Zahlungsliste·Excel", growth_s6i3:"Planbestätigung·Zahlungsverlauf·Rechnung", growth_s6i4:"Lizenzaktivierung·Status",
  growth_s7:"🔌 Kanal- & Datenintegration (Inland)", growth_s7i1:"Meta·Google·TikTok·Naver·Kakao Anzeigenintegration", growth_s7i2:"Coupang-Connector", growth_s7i3:"Währungseinheit-Auswahl (KRW/USD/JPY/EUR Global)",
  growth_s8:"👥 Team-Management", growth_s8i1:"Teammitglieder-Liste·Einladen", growth_s8i2:"Meine Aktivitätsverlauf", growth_s8i3:"Support-Ticket",
  growth_l1:"KI-Prognose (Abwanderung·LTV) — Pro+", growth_l2:"Kunden-Journey-Builder — Pro+", growth_l3:"Globale Kanäle (WhatsApp·LINE·DM) — Pro+", growth_l4:"KI-Regel-Engine — Pro+", growth_l5:"1st-Party-Pixel·API-Schlüssel — Pro+", growth_l6:"SmartConnect ERP-Integration — Pro+",
  pro_tagline:"Professionelle E-Commerce-Marken & Agenturen", pro_headline:"KI-Automatisierungsplan", pro_badge:"Beliebt",
  pro_desc:"Wachstum Alles + KI-Prognose·Journey-Builder·Globale Kanäle·Regel-Engine·SmartConnect·1st-Party-Pixel·Advanced BI.",
  pro_s1:"🧠 KI-Prognose-Engine (Neu)", pro_s1i1:"Abwanderungs·LTV·Kaufwahrscheinlichkeitsprognose", pro_s1i2:"Graph-Scoring", pro_s1i3:"Next-Best-Action-Empfehlung", pro_s1i4:"Produkt-Empfehlungs-KI", pro_s1i5:"KI-Anzeigen-Insights", pro_s1i6:"KI-Segment (VIP·Abwanderungsrisiko·Potenzielles VIP Auto-Klassifizierung)",
  pro_s2:"🗺 Kunden-Journey-Builder (Neu)", pro_s2i1:"Journey-Canvas (Drag&Drop)", pro_s2i2:"Trigger-Setup·Aktionsknoten-Management", pro_s2i3:"Journey-Leistungsstatistik-Analyse", pro_s2i4:"A/B-Test (E-Mail·Popup)",
  pro_s3:"🌏 Globaler Kanal Alles (Neu)", pro_s3i1:"Shopify·Amazon·LINE Ads Integration", pro_s3i2:"WhatsApp-Broadcast·Automatisierung", pro_s3i3:"Instagram DM·Facebook DM·DM-Kampagne", pro_s3i4:"LINE-Nachrichtenkampagne·Statistiken", pro_s3i5:"Popup A/B-Test·Trigger-Setup",
  pro_s4:"🏭 Erweitertes WMS + Commerce-Erweiterung", pro_s4i1:"Bestandsanpassung·Standortverwaltung·Barcode-Integration", pro_s4i2:"Monatliche Abrechnungsintegration·Steuerrechnung·Zahlungsgenehmigung", pro_s4i3:"3PL-Anbieter Hinzufügen·Bearbeiten", pro_s4i4:"Erfassungsprotokoll Basis-Ansicht",
  pro_s5:"🤖 KI-Regel-Engine·Automatisierung (Neu)", pro_s5i1:"KI-Richtlinien-Setup·Regelliste·Test", pro_s5i2:"Benachrichtigungs-Bewertungsmodell", pro_s5i3:"Aktions-Preset-Management", pro_s5i4:"Writeback-Setup·Protokolle", pro_s5i5:"Genehmigungsentscheidungs-Automatisierung",
  pro_s6:"⭐ Bewertung & UGC-Analyse (Neu)", pro_s6i1:"Kanal-Bewertungserfassung·Sentiment-Analyse", pro_s6i2:"KI-Auto-Antwort-Entwurf", pro_s6i3:"UGC (Instagram·YouTube) Leistungsanalyse", pro_s6i4:"Keyword-Analyse",
  pro_s7:"🤝 SmartConnect-Hub (Neu)", pro_s7i1:"ERP·SCM·3PL Basic-Integration-Setup", pro_s7i2:"REST API / Webhook / SFTP Integration", pro_s7i3:"Feld-Mapping-Setup", pro_s7i4:"Basic-Sync-Protokoll-Ansicht",
  pro_s8:"🎯 1st-Party-Pixel + Daten", pro_s8i1:"Pixel-Code-Installation·Überprüfung", pro_s8i2:"Echtzeit-Event-Stream-Ansicht", pro_s8i3:"Attributionsanalyse (Touch-Modell·ROAS)", pro_s8i4:"Event-Erfassung·Datenschema·Mapping", pro_s8i5:"API-Schlüssel·Webhook·OAuth Integration",
  pro_s9:"📊 Erweiterte Analyse & BI", pro_s9i1:"Kohorten-Analyse", pro_s9i2:"P&L nach Kanal·Produkt·Trend", pro_s9i3:"Anomalie-Erkennung·Wettbewerber-KI-Analyse", pro_s9i4:"Influencer-Leistungsansicht",
  pro_s10:"💱 Echtzeit-FX + Team-Mgmt", pro_s10i1:"Echtzeit-Wechselkurs (Globale Währung)", pro_s10i2:"Team-Aktivitätsaudit", pro_s10i3:"Systemstatus·API-Monitoring", pro_s10i4:"Batch-Job-Ausführung·Neuverarbeitung",
  pro_l1:"Writeback Sofort-Rollback — Enterprise", pro_l2:"Amazon-Richtlinien·Bewertungsmanagement — Enterprise", pro_l3:"Marktanteil·Trend-KI — Enterprise", pro_l4:"Data Product SLA·Governance — Enterprise", pro_l5:"SmartConnect Partner-API Bidirektional — Enterprise", pro_l6:"Influencer-DB·Kampagnenausführung — Enterprise", pro_l7:"Audit-Protokoll Vollständiger Export — Enterprise", pro_l8:"Auto-Bericht·Geplanter Versand — Enterprise", pro_l9:"API-Daten-Streaming-Export — Enterprise",
  ent_tagline:"Großes E-Commerce·Agentur·Konzern", ent_headline:"Alles Unbegrenzt Plan", ent_badge:"Top-Tier",
  ent_desc:"Pro Alles + Sofort-Rollback·Amazon-Richtlinienmanagement·Marktanteil·Data Product Governance·SmartConnect Partner-API·Influencer-DB·Vollständiges Audit·Auto-Berichte.",
  ent_s1:"↩ Writeback Sofort-Rollback (Neu)", ent_s1i1:"Writeback-Setup·Protokolle", ent_s1i2:"Sofort-Rollback (Sofortige Fehlerbehebung)", ent_s1i3:"Multi-Brand-Auto-Ausführung", ent_s1i4:"Vollständige Rollback-Verlaufsansicht",
  ent_s2:"🌏 Amazon Erweiterte Operationen (Neu)", ent_s2i1:"Amazon-Account-Gesundheitsmonitor", ent_s2i2:"Richtlinien-Compliance-Management", ent_s2i3:"Vollständige Bewertungsüberwachung", ent_s2i4:"Listenqualitätsaudit",
  ent_s3:"📊 Marktintelligenz (Neu)", ent_s3i1:"Marktanteilsanalyse", ent_s3i2:"Wettbewerber-Anzeigenverfolgung (KI)", ent_s3i3:"Trend-KI-Prognosemodell", ent_s3i4:"Kanal-Attribution Alle Modelle", ent_s3i5:"Konversionspfad-Analyse",
  ent_s4:"🗂 Data Product Governance (Neu)", ent_s4i1:"Data Product Schema·Qualitätsmetriken", ent_s4i2:"SLA-Management·Eigentürmer-Zuweisung", ent_s4i3:"API-basierter Daten-Streaming-Export", ent_s4i4:"Event-Normalisierung Vollständige Verwaltung", ent_s4i5:"OAuth-Partner-Management", ent_s4i6:"Erweitertes Daten-Mapping",
  ent_s5:"🤝 SmartConnect Partner-API (Neu)", ent_s5i1:"Partner-Niveau bidirektionale Echtzeit-Integration", ent_s5i2:"Vollständige Echtzeit-Sync-Protokolle", ent_s5i3:"ERP·SCM·WMS Vollintegration", ent_s5i4:"Benutzerdefiniertes Webhook Erweitertes Setup",
  ent_s6:"💡 Erweitertes Marketing (Neu)", ent_s6i1:"Vollständige Influencer-DB·Kampagnenausführung·Abrechnung", ent_s6i2:"Kakao Bizboard (Großformatige Anzeigen)", ent_s6i3:"WhatsApp Erweitertes Setup (Kanal-API)", ent_s6i4:"LINE-Kanal Erweitertes Setup", ent_s6i5:"KI-Segment Erweitert (Benutzerdefinierte Kriterien)", ent_s6i6:"Wettbewerber-Bewertungsvergleichsanalyse",
  ent_s7:"⚡ Betrieb & Governance Alles (Neu)", ent_s7i1:"Ops-Hub-Benachrichtigungsversand (Admin-Hinweis)", ent_s7i2:"3PL-Anbieter Löschen·Vertragsmanagement", ent_s7i3:"Vollständiges Audit-Protokoll·CSV-Export", ent_s7i4:"Systemmonitor-Benachrichtigungseinstellungen", ent_s7i5:"Auto-Berichtsgenerierung·Geplanter Versand", ent_s7i6:"Dashboard Externe Freigabe·Einbettung",
  ent_s8:"🚀 Pro Alles Enthalten + Unbegrenzt", ent_s8i1:"Alle Pro-Plan-Funktionen enthalten", ent_s8i2:"Unbegrenzte Konten·Benutzer·Teammitglieder", ent_s8i3:"Prioritätssupport SLA", ent_s8i4:"Dediziertes Onboarding-Consulting·Jährliches Training",
  ent_s9:"💎 Benutzerdefiniert & Dedizierte Services", ent_s9i1:"Benutzerdefiniertes Dashboard konfigurieren", ent_s9i2:"Dedizierten Manager zuweisen", ent_s9i3:"Jährlicher Vertrag maßgeschneiderter Rabatt", ent_s9i4:"Maßgeschneidertes Training·Workshop",
};
de.cmpRow = {
  r1:"Home-Dashboard", r2:"KI-Anzeigenkreativ & Kampagnenverwaltung", r3:"KI-Prognose (Abwanderung·LTV·Kaufwahrsch.)",
  r4:"Kunden-Journey-Builder", r5:"KI-Segment", r6:"Anzeigen & Kanalanalyse (ROAS·KPI)", r7:"Attributionsanalyse", r8:"Wettbewerber-KI-Analyse",
  r9:"Kunden-CRM (E-Mail/Kakao/SMS)", r10:"Bewertung & UGC-Analyse", r11:"Commerce-Kanäle", r12:"WMS (Bestand·Ein/Ausgang)",
  r13:"3PL-Management", r14:"Amazon Erweiterte Operationen", r15:"Analyse & Leistung (Kohorte·P&L)", r16:"KI-Regel-Engine & Automatisierung",
  r17:"SmartConnect (ERP·SCM)", r18:"1st-Party-Pixel", r19:"Datenpipeline & API", r20:"Data Product Governance",
  r21:"BI-Berichte", r22:"Währungsauswahl (Global)", r23:"Influencer-Management", r24:"Ops-Hub (Batch·Neuverarbeitung)",
  r25:"Audit-Protokoll", r26:"Team-Management (RBAC)", r27:"Kontoanzahl", r28:"Support-Typ",
};
de.cmpVal = {
  all:"Alle", basic:"Basis", realtime:"Echtzeit", domestic_core:"Inlandskern", domestic:"Inland", dom_global:"Inland+Global", market_share:"Marktanteil",
  basic_auto:"Basis-Auto-Klassifizierung", advanced_custom:"Erweitert benutzerdefiniert", conv_path_all:"Konversionspfad alles", trend_forecast:"Trendprognose",
  bizboard:"Bizboard", competitor_compare:"Wettbewerbervergleich", location_barcode:"Standort & Barcode", list_view:"Listenansicht", contract:"Vertrag",
  policy_review:"Richtlinien·Bewertung·Listen", cohort_pl:"Kohorte·P&L Alle", notification_basic:"Benachrichtigung Basis", rule_writeback:"Regel-Engine·Writeback",
  instant_rollback:"Sofort-Rollback", partner_api:"Partner-API Bidirektional", install_analysis:"Installation & Analyse", server_side:"Serverseitig",
  domestic_ads:"Inlands-Anzeigenintegration", schema_quality_view:"Schema·Qualitätsansicht", owner_streaming:"Eigentümer·Streaming", custom_excel:"Benutzerdefiniert·Excel",
  anomaly_detect:"Anomalie-Erkennung", auto_scheduled_share:"Auto·Geplant·Teilen", manual:"Manuell", realtime_rate:"Echtzeit-Wechselkurs",
  perf_view:"Leistungsansicht", campaign_settle:"Kampagne·Abrechnung", reprocess:"Neuverarbeitung", notification_send:"Benachrichtigungsversand",
  own_history:"Eigene Verlauf", list_invite:"Liste·Einladen", activity_history:"Aktivitätsverlauf", rbac_role:"RBAC-Rolleneinstellungen", unlimited:"Unbegrenzt",
  chat_support:"Chat-Support", dedicated_manager:"Dedizierter Manager", dedicated_sla:"Dediziert + SLA",
};
`,
  },
};

// For th, vi, id, zh-TW - use simplified English-based entries for now
// (Their UI shell is already translated, only plan details will show in English)
// Add a minimal marker so i18n doesn't fall back
const SIMPLE_LANGS = {
  th: { varName: 'th' },
  vi: { varName: 'vi' },
  id: { varName: 'id' },
  'zh-TW': { varName: 'zhTW' },
};

const LOCALES_DIR = 'src/i18n/locales';

// Add pricingDetail for zh and de
Object.entries(LANG_TRANSLATIONS).forEach(([lang, data]) => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) { console.log(`⚠ ${lang}: not found`); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('.pricingDetail')) { 
    // Remove old placeholder note and add real translation
    content = content.replace(/\/\/ ── PricingDetail uses English fallback[\s\S]{0,200}?\n/, '');
  }
  if (!content.includes('.pricingDetail')) {
    content += data.pricingDetail_prefix;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${lang}: pricingDetail added`);
  } else {
    console.log(`⏭ ${lang}: already has pricingDetail`);
  }
});

// For th, vi, id, zh-TW: keep English fallback (acceptable) but add moreItems key
// Add moreItems to all locale files
Object.entries(MORE_ITEMS).forEach(([lang, text]) => {
  const filePath = path.join(LOCALES_DIR, lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('moreItems')) { console.log(`⏭ ${lang}: moreItems exists`); return; }
  // Add to pricing section
  content = content.replace(
    /pricing\.faqTitle[^,]*,/,
    (match) => match + `\n    moreItems: "${text}",`
  );
  // Also try adding at end of pricing object if not found
  if (!content.includes('moreItems')) {
    const varMatch = content.match(/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/m);
    const varName = varMatch ? varMatch[1] : null;
    if (varName) {
      content += `\n${varName}.pricing = ${varName}.pricing || {}; ${varName}.pricing.moreItems = "${text}";\n`;
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${lang}: moreItems added`);
});

console.log('\n✅ All done!');
