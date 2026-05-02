/**
 * Inject reviews guide/tab/settings i18n keys into all 9 locale files.
 * The existing 49 reviews keys are preserved; new keys are added.
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const NEW_KEYS = {
ko: {
tabDashboard:"대시보드",tabFeed:"리뷰 관리",tabTrend:"트렌드",tabSettings:"설정",tabGuide:"가이드",
kpiTotalSub2:"연동 채널 합산",kpiAvgRatingSub2:"전 채널 가중 평균",
noData:"데이터가 없습니다",close:"닫기",
noTrendData:"트렌드 데이터가 없습니다",noTrendDataSub:"리뷰 데이터가 쌓이면 감성 분석 트렌드가 자동으로 표시됩니다.",
trendTitle:"감성 분석 트렌드",sentimentBar:"감성 비율 분석",
settingsTitle:"리뷰 관리 설정",aiToneLabel:"AI 답변 톤 설정",toneProfessional:"프로페셔널",toneFriendly:"친근한",toneFormal:"격식체",
autoEscalateLabel:"자동 에스컬레이션",autoEscalateDesc:"부정 리뷰 1★ 자동 에스컬레이션 활성화",
slackWebhookLabel:"Slack 알림 Webhook",slackWebhookSub:"부정 키워드 급증 시 자동 알림을 받을 Slack Webhook URL을 입력하세요.",
guideTitle:"리뷰 & UGC 관리 이용 가이드",
guideSub:"리뷰 수집부터 AI 감성 분석, 자동 답변, CS 에스컬레이션, 트렌드 모니터링까지 전체 워크플로우를 안내합니다.",
guideStepsTitle:"리뷰 관리 6단계",
guideStep1Title:"리뷰 수집",guideStep1Desc:"판매 채널(쿠팡, 네이버, Amazon 등)에서 리뷰를 자동으로 수집합니다. 연동허브에서 API 키를 등록하면 채널이 자동으로 추가됩니다.",
guideStep2Title:"AI 감성 분석",guideStep2Desc:"수집된 리뷰를 AI가 긍정/중립/부정으로 자동 분류합니다. 부정 키워드를 실시간으로 모니터링합니다.",
guideStep3Title:"AI 답변 초안",guideStep3Desc:"각 리뷰에 대해 AI가 톤과 맥락에 맞는 답변 초안을 자동 생성합니다. 검토 후 복사하여 사용할 수 있습니다.",
guideStep4Title:"CS 에스컬레이션",guideStep4Desc:"심각한 부정 리뷰를 CS팀에 자동 에스컬레이션합니다. Slack 알림과 연동하여 즉시 대응할 수 있습니다.",
guideStep5Title:"트렌드 분석",guideStep5Desc:"시간대별 감성 비율 변화를 추적합니다. 부정 키워드 급증을 자동 감지하여 알림을 보냅니다.",
guideStep6Title:"성과 리포트",guideStep6Desc:"채널별 평점, 응답률, 에스컬레이션 처리율을 종합 분석합니다. 개선 방향을 AI가 제안합니다.",
guideTabsTitle:"탭별 기능 안내",
guideDashName:"대시보드",guideDashDesc:"KPI 요약, 채널별 평점, 부정 키워드 모니터링",
guideFeedName:"리뷰 관리",guideFeedDesc:"리뷰 필터링, AI 답변 생성, CS 에스컬레이션",
guideTrendName:"트렌드",guideTrendDesc:"감성 비율 분석 및 시계열 트렌드",
guideSettingsName:"설정",guideSettingsDesc:"AI 톤 설정, 자동 에스컬레이션, Slack 알림",
guideGuideName:"이용 가이드",guideGuideDesc:"리뷰 관리 워크플로우 안내",
guideTipsTitle:"팁 & 모범 사례",
guideTip1:"부정 리뷰에는 24시간 내 응답하면 고객 만족도가 크게 향상됩니다.",
guideTip2:"AI 답변 초안은 반드시 검토 후 발송하세요. 개인화된 수정이 응답 품질을 높입니다.",
guideTip3:"부정 키워드 Top 5를 주기적으로 확인하여 제품/서비스 개선에 활용하세요.",
guideTip4:"Slack Webhook을 설정하면 부정 리뷰 급증 시 즉시 알림을 받을 수 있습니다.",
guideTip5:"채널별 평점을 비교하여 특정 채널에서 반복되는 불만 사항을 파악하세요."
},
en: {
tabDashboard:"Dashboard",tabFeed:"Review Feed",tabTrend:"Trends",tabSettings:"Settings",tabGuide:"Guide",
kpiTotalSub2:"Connected channels total",kpiAvgRatingSub2:"Weighted average across all channels",
noData:"No data available",close:"Close",
noTrendData:"No trend data available",noTrendDataSub:"Sentiment analysis trends will appear automatically as review data accumulates.",
trendTitle:"Sentiment Analysis Trends",sentimentBar:"Sentiment Ratio Analysis",
settingsTitle:"Review Management Settings",aiToneLabel:"AI Reply Tone",toneProfessional:"Professional",toneFriendly:"Friendly",toneFormal:"Formal",
autoEscalateLabel:"Auto Escalation",autoEscalateDesc:"Enable automatic escalation for 1★ negative reviews",
slackWebhookLabel:"Slack Notification Webhook",slackWebhookSub:"Enter your Slack Webhook URL to receive automatic alerts when negative keywords spike.",
guideTitle:"Reviews & UGC Management Guide",
guideSub:"Complete workflow from review collection to AI sentiment analysis, auto-replies, CS escalation, and trend monitoring.",
guideStepsTitle:"Review Management 6 Steps",
guideStep1Title:"Review Collection",guideStep1Desc:"Automatically collect reviews from sales channels (Coupang, Naver, Amazon, etc.). Channels are auto-added when API keys are registered in the Integration Hub.",
guideStep2Title:"AI Sentiment Analysis",guideStep2Desc:"AI automatically classifies collected reviews as positive/neutral/negative. Negative keywords are monitored in real-time.",
guideStep3Title:"AI Reply Drafts",guideStep3Desc:"AI generates context-appropriate reply drafts for each review. Review and copy to use.",
guideStep4Title:"CS Escalation",guideStep4Desc:"Automatically escalate severe negative reviews to the CS team. Integrates with Slack notifications for immediate response.",
guideStep5Title:"Trend Analysis",guideStep5Desc:"Track sentiment ratio changes over time. Automatically detect and alert on negative keyword spikes.",
guideStep6Title:"Performance Report",guideStep6Desc:"Comprehensive analysis of channel ratings, response rates, and escalation handling. AI suggests improvement directions.",
guideTabsTitle:"Tab Features",
guideDashName:"Dashboard",guideDashDesc:"KPI summary, channel ratings, negative keyword monitoring",
guideFeedName:"Review Feed",guideFeedDesc:"Review filtering, AI reply generation, CS escalation",
guideTrendName:"Trends",guideTrendDesc:"Sentiment ratio analysis and time-series trends",
guideSettingsName:"Settings",guideSettingsDesc:"AI tone settings, auto-escalation, Slack alerts",
guideGuideName:"User Guide",guideGuideDesc:"Review management workflow guide",
guideTipsTitle:"Tips & Best Practices",
guideTip1:"Responding to negative reviews within 24 hours significantly improves customer satisfaction.",
guideTip2:"Always review AI reply drafts before sending. Personalized edits improve response quality.",
guideTip3:"Regularly check the Top 5 negative keywords to identify product/service improvements.",
guideTip4:"Set up a Slack Webhook to receive instant alerts when negative reviews spike.",
guideTip5:"Compare ratings across channels to identify recurring complaints on specific platforms."
},
ja: {
tabDashboard:"ダッシュボード",tabFeed:"レビュー管理",tabTrend:"トレンド",tabSettings:"設定",tabGuide:"ガイド",
kpiTotalSub2:"接続チャネル合計",kpiAvgRatingSub2:"全チャネル加重平均",
noData:"データがありません",close:"閉じる",
noTrendData:"トレンドデータがありません",noTrendDataSub:"レビューデータが蓄積されると感情分析トレンドが自動的に表示されます。",
trendTitle:"感情分析トレンド",sentimentBar:"感情比率分析",
settingsTitle:"レビュー管理設定",aiToneLabel:"AI返信トーン",toneProfessional:"プロフェッショナル",toneFriendly:"フレンドリー",toneFormal:"フォーマル",
autoEscalateLabel:"自動エスカレーション",autoEscalateDesc:"1★のネガティブレビューを自動エスカレーション",
slackWebhookLabel:"Slack通知Webhook",slackWebhookSub:"ネガティブキーワード急増時に自動通知を受け取るSlack Webhook URLを入力してください。",
guideTitle:"レビュー & UGC管理ガイド",guideSub:"レビュー収集からAI感情分析、自動返信、CSエスカレーション、トレンド監視までの完全なワークフロー。",
guideStepsTitle:"レビュー管理6ステップ",
guideStep1Title:"レビュー収集",guideStep1Desc:"販売チャネルからレビューを自動収集します。統合ハブでAPIキーを登録するとチャネルが自動追加されます。",
guideStep2Title:"AI感情分析",guideStep2Desc:"収集されたレビューをAIがポジティブ/ニュートラル/ネガティブに自動分類します。",
guideStep3Title:"AI返信案",guideStep3Desc:"各レビューに対してAIがコンテキストに合った返信案を自動生成します。",
guideStep4Title:"CSエスカレーション",guideStep4Desc:"深刻なネガティブレビューをCSチームに自動エスカレーションします。",
guideStep5Title:"トレンド分析",guideStep5Desc:"時間帯別の感情比率変化を追跡します。ネガティブキーワード急増を自動検出します。",
guideStep6Title:"パフォーマンスレポート",guideStep6Desc:"チャネル別評価、応答率、エスカレーション処理率を総合分析します。",
guideTabsTitle:"タブ別機能案内",
guideDashName:"ダッシュボード",guideDashDesc:"KPI要約、チャネル別評価、ネガティブキーワード監視",
guideFeedName:"レビュー管理",guideFeedDesc:"レビューフィルタリング、AI返信生成、CSエスカレーション",
guideTrendName:"トレンド",guideTrendDesc:"感情比率分析と時系列トレンド",
guideSettingsName:"設定",guideSettingsDesc:"AIトーン設定、自動エスカレーション、Slackアラート",
guideGuideName:"利用ガイド",guideGuideDesc:"レビュー管理ワークフロー案内",
guideTipsTitle:"ヒントとベストプラクティス",
guideTip1:"ネガティブレビューには24時間以内に回答すると顧客満足度が大幅に向上します。",
guideTip2:"AI返信案は必ず確認してから送信してください。",
guideTip3:"ネガティブキーワードTop 5を定期的に確認して製品改善に活用してください。",
guideTip4:"Slack Webhookを設定するとネガティブレビュー急増時に即座にアラートを受けられます。",
guideTip5:"チャネル別評価を比較して特定チャネルでの繰り返し不満を把握してください。"
},
zh: {tabDashboard:"仪表盘",tabFeed:"评论管理",tabTrend:"趋势",tabSettings:"设置",tabGuide:"指南",kpiTotalSub2:"已连接渠道总计",kpiAvgRatingSub2:"所有渠道加权平均",noData:"暂无数据",close:"关闭",noTrendData:"暂无趋势数据",noTrendDataSub:"随着评论数据积累，情感分析趋势将自动显示。",trendTitle:"情感分析趋势",sentimentBar:"情感比例分析",settingsTitle:"评论管理设置",aiToneLabel:"AI回复语气",toneProfessional:"专业",toneFriendly:"友好",toneFormal:"正式",autoEscalateLabel:"自动升级",autoEscalateDesc:"启用1★差评自动升级",slackWebhookLabel:"Slack通知Webhook",slackWebhookSub:"输入Slack Webhook URL以在负面关键词激增时接收自动通知。",guideTitle:"评论与UGC管理指南",guideSub:"从评论收集到AI情感分析、自动回复、CS升级和趋势监控的完整工作流程。",guideStepsTitle:"评论管理6步骤",guideStep1Title:"评论收集",guideStep1Desc:"自动从销售渠道收集评论。在集成中心注册API密钥后渠道会自动添加。",guideStep2Title:"AI情感分析",guideStep2Desc:"AI自动将评论分类为正面/中性/负面。",guideStep3Title:"AI回复草稿",guideStep3Desc:"AI为每条评论生成适合语境的回复草稿。",guideStep4Title:"CS升级",guideStep4Desc:"自动将严重差评升级到CS团队。",guideStep5Title:"趋势分析",guideStep5Desc:"追踪情感比例随时间的变化。",guideStep6Title:"绩效报告",guideStep6Desc:"综合分析渠道评分、响应率和升级处理率。",guideTabsTitle:"标签功能说明",guideDashName:"仪表盘",guideDashDesc:"KPI摘要、渠道评分、负面关键词监控",guideFeedName:"评论管理",guideFeedDesc:"评论筛选、AI回复生成、CS升级",guideTrendName:"趋势",guideTrendDesc:"情感比例分析和时间序列趋势",guideSettingsName:"设置",guideSettingsDesc:"AI语气设置、自动升级、Slack通知",guideGuideName:"使用指南",guideGuideDesc:"评论管理工作流程指南",guideTipsTitle:"技巧与最佳实践",guideTip1:"在24小时内回复差评可显著提高客户满意度。",guideTip2:"发送前请务必审核AI回复草稿。",guideTip3:"定期检查负面关键词Top 5以改善产品和服务。",guideTip4:"设置Slack Webhook可在差评激增时即时收到通知。",guideTip5:"比较各渠道评分以发现特定平台的反复投诉。"},
"zh-TW": {tabDashboard:"儀表板",tabFeed:"評論管理",tabTrend:"趨勢",tabSettings:"設定",tabGuide:"指南",kpiTotalSub2:"已連接頻道總計",kpiAvgRatingSub2:"所有頻道加權平均",noData:"暫無資料",close:"關閉",noTrendData:"暫無趨勢資料",noTrendDataSub:"隨著評論資料累積，情感分析趨勢將自動顯示。",trendTitle:"情感分析趨勢",sentimentBar:"情感比例分析",settingsTitle:"評論管理設定",aiToneLabel:"AI回覆語氣",toneProfessional:"專業",toneFriendly:"友善",toneFormal:"正式",autoEscalateLabel:"自動升級",autoEscalateDesc:"啟用1★差評自動升級",slackWebhookLabel:"Slack通知Webhook",slackWebhookSub:"輸入Slack Webhook URL以在負面關鍵字激增時接收自動通知。",guideTitle:"評論與UGC管理指南",guideSub:"從評論收集到AI情感分析、自動回覆、CS升級和趨勢監控的完整工作流程。",guideStepsTitle:"評論管理6步驟",guideStep1Title:"評論收集",guideStep1Desc:"自動從銷售頻道收集評論。在整合中心註冊API金鑰後頻道會自動新增。",guideStep2Title:"AI情感分析",guideStep2Desc:"AI自動將評論分類為正面/中性/負面。",guideStep3Title:"AI回覆草稿",guideStep3Desc:"AI為每條評論生成適合語境的回覆草稿。",guideStep4Title:"CS升級",guideStep4Desc:"自動將嚴重差評升級到CS團隊。",guideStep5Title:"趨勢分析",guideStep5Desc:"追蹤情感比例隨時間的變化。",guideStep6Title:"績效報告",guideStep6Desc:"綜合分析頻道評分、回應率和升級處理率。",guideTabsTitle:"標籤功能說明",guideDashName:"儀表板",guideDashDesc:"KPI摘要、頻道評分、負面關鍵字監控",guideFeedName:"評論管理",guideFeedDesc:"評論篩選、AI回覆生成、CS升級",guideTrendName:"趨勢",guideTrendDesc:"情感比例分析和時間序列趨勢",guideSettingsName:"設定",guideSettingsDesc:"AI語氣設定、自動升級、Slack通知",guideGuideName:"使用指南",guideGuideDesc:"評論管理工作流程指南",guideTipsTitle:"技巧與最佳實踐",guideTip1:"在24小時內回覆差評可顯著提高客戶滿意度。",guideTip2:"發送前請務必審核AI回覆草稿。",guideTip3:"定期檢查負面關鍵字Top 5以改善產品和服務。",guideTip4:"設定Slack Webhook可在差評激增時即時收到通知。",guideTip5:"比較各頻道評分以發現特定平台的反覆投訴。"},
de: {tabDashboard:"Dashboard",tabFeed:"Bewertungen",tabTrend:"Trends",tabSettings:"Einstellungen",tabGuide:"Anleitung",kpiTotalSub2:"Verbundene Kanäle gesamt",kpiAvgRatingSub2:"Gewichteter Durchschnitt aller Kanäle",noData:"Keine Daten verfügbar",close:"Schließen",noTrendData:"Keine Trenddaten verfügbar",noTrendDataSub:"Stimmungsanalyse-Trends werden automatisch angezeigt.",trendTitle:"Stimmungsanalyse-Trends",sentimentBar:"Stimmungsverhältnis-Analyse",settingsTitle:"Bewertungsverwaltung Einstellungen",aiToneLabel:"KI-Antwortton",toneProfessional:"Professionell",toneFriendly:"Freundlich",toneFormal:"Formell",autoEscalateLabel:"Auto-Eskalation",autoEscalateDesc:"Automatische Eskalation für 1★ negative Bewertungen",slackWebhookLabel:"Slack-Benachrichtigung Webhook",slackWebhookSub:"Geben Sie Ihre Slack Webhook-URL ein.",guideTitle:"Bewertungs- & UGC-Verwaltungsanleitung",guideSub:"Vollständiger Workflow von der Bewertungssammlung bis zur KI-Analyse.",guideStepsTitle:"Bewertungsverwaltung 6 Schritte",guideStep1Title:"Bewertungssammlung",guideStep1Desc:"Automatische Sammlung von Bewertungen aus Verkaufskanälen.",guideStep2Title:"KI-Stimmungsanalyse",guideStep2Desc:"KI klassifiziert Bewertungen automatisch als positiv/neutral/negativ.",guideStep3Title:"KI-Antwortentwürfe",guideStep3Desc:"KI generiert kontextgerechte Antwortentwürfe.",guideStep4Title:"CS-Eskalation",guideStep4Desc:"Automatische Eskalation schwerer negativer Bewertungen.",guideStep5Title:"Trendanalyse",guideStep5Desc:"Verfolgung der Stimmungsveränderungen über die Zeit.",guideStep6Title:"Leistungsbericht",guideStep6Desc:"Umfassende Analyse der Kanalbewertungen und Antwortquoten.",guideTabsTitle:"Tab-Funktionen",guideDashName:"Dashboard",guideDashDesc:"KPI-Zusammenfassung und Kanalübersicht",guideFeedName:"Bewertungen",guideFeedDesc:"Bewertungsfilterung und KI-Antworten",guideTrendName:"Trends",guideTrendDesc:"Stimmungsanalyse und Zeitreihen",guideSettingsName:"Einstellungen",guideSettingsDesc:"KI-Ton, Auto-Eskalation, Slack",guideGuideName:"Anleitung",guideGuideDesc:"Workflow-Anleitung",guideTipsTitle:"Tipps & Best Practices",guideTip1:"Antworten Sie auf negative Bewertungen innerhalb von 24 Stunden.",guideTip2:"Überprüfen Sie KI-Antwortentwürfe vor dem Versand.",guideTip3:"Prüfen Sie regelmäßig die Top-5 negativen Schlüsselwörter.",guideTip4:"Richten Sie Slack-Webhooks für sofortige Benachrichtigungen ein.",guideTip5:"Vergleichen Sie Kanalbewertungen zur Problemerkennung."},
th: {tabDashboard:"แดชบอร์ด",tabFeed:"จัดการรีวิว",tabTrend:"เทรนด์",tabSettings:"การตั้งค่า",tabGuide:"คู่มือ",kpiTotalSub2:"รวมช่องที่เชื่อมต่อ",kpiAvgRatingSub2:"ค่าเฉลี่ยถ่วงน้ำหนักทุกช่อง",noData:"ไม่มีข้อมูล",close:"ปิด",noTrendData:"ไม่มีข้อมูลเทรนด์",noTrendDataSub:"เทรนด์การวิเคราะห์ความรู้สึกจะแสดงอัตโนมัติเมื่อมีข้อมูลรีวิว",trendTitle:"เทรนด์การวิเคราะห์ความรู้สึก",sentimentBar:"การวิเคราะห์สัดส่วนความรู้สึก",settingsTitle:"การตั้งค่าจัดการรีวิว",aiToneLabel:"โทนการตอบ AI",toneProfessional:"มืออาชีพ",toneFriendly:"เป็นกันเอง",toneFormal:"ทางการ",autoEscalateLabel:"การยกระดับอัตโนมัติ",autoEscalateDesc:"เปิดใช้งานการยกระดับอัตโนมัติสำหรับรีวิว 1★",slackWebhookLabel:"Slack Webhook",slackWebhookSub:"ป้อน URL Slack Webhook เพื่อรับการแจ้งเตือนอัตโนมัติ",guideTitle:"คู่มือจัดการรีวิวและ UGC",guideSub:"เวิร์กโฟลว์ครบวงจรจากการรวบรวมรีวิวถึงการวิเคราะห์ AI",guideStepsTitle:"6 ขั้นตอนจัดการรีวิว",guideStep1Title:"รวบรวมรีวิว",guideStep1Desc:"รวบรวมรีวิวจากช่องทางขายอัตโนมัติ",guideStep2Title:"วิเคราะห์ความรู้สึก AI",guideStep2Desc:"AI จัดประเภทรีวิวเป็นบวก/กลาง/ลบ อัตโนมัติ",guideStep3Title:"ร่างตอบ AI",guideStep3Desc:"AI สร้างร่างตอบที่เหมาะสมกับบริบท",guideStep4Title:"การยกระดับ CS",guideStep4Desc:"ยกระดับรีวิวเชิงลบอัตโนมัติไปยังทีม CS",guideStep5Title:"วิเคราะห์เทรนด์",guideStep5Desc:"ติดตามการเปลี่ยนแปลงสัดส่วนความรู้สึกตามเวลา",guideStep6Title:"รายงานประสิทธิภาพ",guideStep6Desc:"วิเคราะห์คะแนนช่อง อัตราตอบ และการจัดการยกระดับ",guideTabsTitle:"ฟีเจอร์แท็บ",guideDashName:"แดชบอร์ด",guideDashDesc:"สรุป KPI คะแนนช่อง คีย์เวิร์ดเชิงลบ",guideFeedName:"จัดการรีวิว",guideFeedDesc:"กรองรีวิว สร้างตอบ AI ยกระดับ CS",guideTrendName:"เทรนด์",guideTrendDesc:"วิเคราะห์สัดส่วนความรู้สึก",guideSettingsName:"การตั้งค่า",guideSettingsDesc:"โทน AI การยกระดับอัตโนมัติ Slack",guideGuideName:"คู่มือ",guideGuideDesc:"คู่มือเวิร์กโฟลว์จัดการรีวิว",guideTipsTitle:"เคล็ดลับ",guideTip1:"ตอบรีวิวเชิงลบภายใน 24 ชม. เพิ่มความพึงพอใจลูกค้า",guideTip2:"ตรวจสอบร่างตอบ AI ก่อนส่งเสมอ",guideTip3:"ตรวจสอบคีย์เวิร์ดเชิงลบ Top 5 เป็นประจำ",guideTip4:"ตั้งค่า Slack Webhook เพื่อรับการแจ้งเตือนทันที",guideTip5:"เปรียบเทียบคะแนนข้ามช่องเพื่อหาปัญหาซ้ำ"},
vi: {tabDashboard:"Bảng điều khiển",tabFeed:"Quản lý đánh giá",tabTrend:"Xu hướng",tabSettings:"Cài đặt",tabGuide:"Hướng dẫn",kpiTotalSub2:"Tổng kênh đã kết nối",kpiAvgRatingSub2:"Trung bình có trọng số",noData:"Không có dữ liệu",close:"Đóng",noTrendData:"Không có dữ liệu xu hướng",noTrendDataSub:"Xu hướng phân tích cảm xúc sẽ hiển thị tự động khi có dữ liệu.",trendTitle:"Xu hướng phân tích cảm xúc",sentimentBar:"Phân tích tỷ lệ cảm xúc",settingsTitle:"Cài đặt quản lý đánh giá",aiToneLabel:"Giọng văn AI",toneProfessional:"Chuyên nghiệp",toneFriendly:"Thân thiện",toneFormal:"Trang trọng",autoEscalateLabel:"Tự động nâng cấp",autoEscalateDesc:"Bật tự động nâng cấp cho đánh giá 1★",slackWebhookLabel:"Slack Webhook",slackWebhookSub:"Nhập URL Slack Webhook để nhận thông báo tự động.",guideTitle:"Hướng dẫn quản lý Đánh giá & UGC",guideSub:"Quy trình hoàn chỉnh từ thu thập đánh giá đến phân tích AI.",guideStepsTitle:"6 Bước quản lý đánh giá",guideStep1Title:"Thu thập đánh giá",guideStep1Desc:"Tự động thu thập từ kênh bán hàng. Kênh tự động thêm khi đăng ký API.",guideStep2Title:"Phân tích cảm xúc AI",guideStep2Desc:"AI tự động phân loại đánh giá thành tích cực/trung lập/tiêu cực.",guideStep3Title:"Bản nháp trả lời AI",guideStep3Desc:"AI tạo bản nháp phù hợp ngữ cảnh cho mỗi đánh giá.",guideStep4Title:"Nâng cấp CS",guideStep4Desc:"Tự động nâng cấp đánh giá tiêu cực nghiêm trọng cho CS.",guideStep5Title:"Phân tích xu hướng",guideStep5Desc:"Theo dõi thay đổi tỷ lệ cảm xúc theo thời gian.",guideStep6Title:"Báo cáo hiệu suất",guideStep6Desc:"Phân tích toàn diện điểm kênh và tỷ lệ phản hồi.",guideTabsTitle:"Tính năng Tab",guideDashName:"Bảng điều khiển",guideDashDesc:"Tóm tắt KPI và điểm kênh",guideFeedName:"Quản lý đánh giá",guideFeedDesc:"Lọc đánh giá, tạo trả lời AI",guideTrendName:"Xu hướng",guideTrendDesc:"Phân tích tỷ lệ cảm xúc",guideSettingsName:"Cài đặt",guideSettingsDesc:"Giọng AI, tự động nâng cấp, Slack",guideGuideName:"Hướng dẫn",guideGuideDesc:"Hướng dẫn quy trình làm việc",guideTipsTitle:"Mẹo & Thực tiễn",guideTip1:"Trả lời đánh giá tiêu cực trong 24 giờ tăng sự hài lòng.",guideTip2:"Luôn kiểm tra bản nháp AI trước khi gửi.",guideTip3:"Kiểm tra từ khóa tiêu cực Top 5 thường xuyên.",guideTip4:"Thiết lập Slack Webhook để nhận thông báo tức thì.",guideTip5:"So sánh điểm giữa các kênh để phát hiện vấn đề."},
id: {tabDashboard:"Dashboard",tabFeed:"Ulasan",tabTrend:"Tren",tabSettings:"Pengaturan",tabGuide:"Panduan",kpiTotalSub2:"Total saluran terhubung",kpiAvgRatingSub2:"Rata-rata tertimbang semua saluran",noData:"Tidak ada data",close:"Tutup",noTrendData:"Tidak ada data tren",noTrendDataSub:"Tren analisis sentimen akan muncul otomatis saat data terakumulasi.",trendTitle:"Tren Analisis Sentimen",sentimentBar:"Analisis Rasio Sentimen",settingsTitle:"Pengaturan Manajemen Ulasan",aiToneLabel:"Nada Balasan AI",toneProfessional:"Profesional",toneFriendly:"Ramah",toneFormal:"Formal",autoEscalateLabel:"Eskalasi Otomatis",autoEscalateDesc:"Aktifkan eskalasi otomatis untuk ulasan 1★",slackWebhookLabel:"Slack Webhook",slackWebhookSub:"Masukkan URL Slack Webhook untuk notifikasi otomatis.",guideTitle:"Panduan Manajemen Ulasan & UGC",guideSub:"Alur kerja lengkap dari pengumpulan ulasan hingga analisis AI.",guideStepsTitle:"6 Langkah Manajemen Ulasan",guideStep1Title:"Pengumpulan Ulasan",guideStep1Desc:"Kumpulkan ulasan otomatis dari saluran penjualan.",guideStep2Title:"Analisis Sentimen AI",guideStep2Desc:"AI mengelompokkan ulasan secara otomatis.",guideStep3Title:"Draf Balasan AI",guideStep3Desc:"AI menghasilkan draf balasan yang sesuai konteks.",guideStep4Title:"Eskalasi CS",guideStep4Desc:"Eskalasi otomatis ulasan negatif serius ke tim CS.",guideStep5Title:"Analisis Tren",guideStep5Desc:"Lacak perubahan rasio sentimen dari waktu ke waktu.",guideStep6Title:"Laporan Kinerja",guideStep6Desc:"Analisis komprehensif peringkat saluran dan tingkat respons.",guideTabsTitle:"Fitur Tab",guideDashName:"Dashboard",guideDashDesc:"Ringkasan KPI dan peringkat saluran",guideFeedName:"Ulasan",guideFeedDesc:"Filter ulasan, balasan AI, eskalasi CS",guideTrendName:"Tren",guideTrendDesc:"Analisis rasio sentimen",guideSettingsName:"Pengaturan",guideSettingsDesc:"Nada AI, eskalasi otomatis, Slack",guideGuideName:"Panduan",guideGuideDesc:"Panduan alur kerja ulasan",guideTipsTitle:"Tips & Praktik Terbaik",guideTip1:"Balas ulasan negatif dalam 24 jam meningkatkan kepuasan pelanggan.",guideTip2:"Selalu tinjau draf AI sebelum mengirim.",guideTip3:"Periksa kata kunci negatif Top 5 secara berkala.",guideTip4:"Atur Slack Webhook untuk notifikasi instan.",guideTip5:"Bandingkan peringkat antar saluran untuk identifikasi masalah."}
};

function findBlockEnd(code, startBrace) {
  let depth = 0, inStr = false;
  for (let i = startBrace; i < code.length; i++) {
    if (inStr) { if (code[i] === '\\') { i++; continue; } if (code[i] === '"') { inStr = false; } continue; }
    if (code[i] === '"') { inStr = true; continue; }
    if (code[i] === '{') depth++;
    if (code[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  
  // Find reviews:{ block
  const revIdx = code.indexOf('reviews:{');
  if (revIdx < 0) { console.log(`❌ ${lang}: no reviews block`); return; }
  
  const endIdx = findBlockEnd(code, revIdx + 8);
  if (endIdx < 0) { console.log(`❌ ${lang}: cannot find end of reviews block`); return; }
  
  // Build insert string - only new keys that don't already exist
  const keys = NEW_KEYS[lang] || NEW_KEYS.en;
  const existingBlock = code.substring(revIdx, endIdx + 1);
  const newEntries = [];
  for (const [k, v] of Object.entries(keys)) {
    if (!existingBlock.includes(k + ':')) {
      newEntries.push(`${k}:"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    }
  }
  
  if (newEntries.length === 0) {
    console.log(`✅ ${lang}: all keys already present`);
    return;
  }
  
  const insertStr = ',' + newEntries.join(',');
  code = code.substring(0, endIdx) + insertStr + code.substring(endIdx);
  fs.writeFileSync(file, code, 'utf8');
  
  // Verify
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const obj = fn();
    const count = obj.reviews ? Object.keys(obj.reviews).length : 0;
    console.log(`✅ ${lang}: ${count} reviews keys, guideTitle=${!!obj.reviews?.guideTitle}`);
  } catch (e) {
    console.log(`❌ ${lang}: ${e.message.substring(0, 80)}`);
  }
});
