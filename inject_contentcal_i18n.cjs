/**
 * Inject contentCal i18n keys into all 9 locale files.
 * Uses the same unquoted key format as the minified bundle.
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const KEYS = {
ko: {
title:"콘텐츠 캘린더",subtitle:"콘텐츠 일정 관리 · 팀 협업 · 멀티채널 퍼블리싱 · AI 분석",
tabCalendar:"캘린더",tabList:"리스트",tabAi:"AI 분석",tabGuide:"가이드",
btnRegister:"콘텐츠 등록",btnPrev:"이전",btnNext:"다음",btnCancel:"취소",btnSave:"저장",
statusLabel:"상태",filterAll:"전체",
st_draft:"초안",st_review:"검토중",st_scheduled:"예약완료",st_published:"발행완료",st_cancelled:"취소됨",
daySun:"일",dayMon:"월",dayTue:"화",dayWed:"수",dayThu:"목",dayFri:"금",daySat:"토",
yearSuffix:"년",
monthJan:"1월",monthFeb:"2월",monthMar:"3월",monthApr:"4월",monthMay:"5월",monthJun:"6월",
monthJul:"7월",monthAug:"8월",monthSep:"9월",monthOct:"10월",monthNov:"11월",monthDec:"12월",
noContent:"등록된 콘텐츠가 없습니다. + 콘텐츠 등록 버튼으로 시작하세요.",
noEventsMonth:"이 달에 등록된 콘텐츠가 없습니다.",
noChannelData:"연동된 채널 데이터가 없습니다",noChannelDataSub:"연동허브에서 API 키를 등록하면 채널 분석 데이터가 자동으로 표시됩니다.",
untitled:"제목 없음",
registerTitle:"콘텐츠 등록",fieldTitle:"제목",fieldCreator:"크리에이터",fieldCampaign:"캠페인",fieldDate:"날짜",fieldPlatform:"플랫폼",fieldStatus:"상태",
guideTitle:"콘텐츠 캘린더 이용 가이드",
guideSub:"콘텐츠 기획부터 발행, 성과 분석, AI 최적화까지 전체 워크플로우를 체계적으로 안내합니다.",
guideStepsTitle:"콘텐츠 관리 6단계",
guideStep1Title:"콘텐츠 기획",guideStep1Desc:"캠페인 목표에 맞춰 콘텐츠를 기획합니다. 타깃 플랫폼, 크리에이터, 일정을 설정하고 팀원과 협업하여 초안을 작성합니다.",
guideStep2Title:"일정 등록",guideStep2Desc:"캘린더에 콘텐츠를 등록합니다. 날짜, 플랫폼, 상태를 지정하고 시즌 이벤트와 연계하여 최적의 발행 시점을 결정합니다.",
guideStep3Title:"리뷰 & 승인",guideStep3Desc:"팀 내부 검토를 거쳐 콘텐츠를 승인합니다. Draft → Review → Scheduled 워크플로우로 품질을 관리합니다.",
guideStep4Title:"멀티채널 발행",guideStep4Desc:"승인된 콘텐츠를 여러 채널(Instagram, YouTube, TikTok, Blog 등)에 동시 발행합니다. 연동허브의 API 키로 자동 연동됩니다.",
guideStep5Title:"성과 모니터링",guideStep5Desc:"발행된 콘텐츠의 조회수, 참여율, 전환율을 실시간으로 추적합니다. 채널별 비교 분석이 가능합니다.",
guideStep6Title:"AI 최적화",guideStep6Desc:"AI가 콘텐츠 성과를 분석하여 최적 발행 시간, 효과적인 플랫폼, 추천 키워드를 제안합니다.",
guideTabsTitle:"탭별 기능 안내",
guideCalName:"캘린더 뷰",guideCalDesc:"월별 콘텐츠 일정을 한눈에 확인",
guideListName:"리스트 뷰",guideListDesc:"상태별 필터링 및 상세 정보 확인",
guideAiName:"AI 분석",guideAiDesc:"채널별 성과 분석 및 AI 인사이트",
guideGuideName:"이용 가이드",guideGuideDesc:"콘텐츠 관리 워크플로우 안내",
guideTipsTitle:"팁 & 모범 사례",
guideTip1:"콘텐츠는 최소 1주일 전에 등록하면 팀 리뷰 시간을 충분히 확보할 수 있습니다.",
guideTip2:"시즌 이벤트(블랙프라이데이, 설날 등)에 맞춰 콘텐츠를 사전에 기획하세요.",
guideTip3:"멀티채널 발행 시 각 플랫폼 특성에 맞게 콘텐츠를 최적화하면 참여율이 2~3배 높아집니다.",
guideTip4:"AI 분석 탭에서 채널별 성과를 주기적으로 확인하고 저성과 채널의 전략을 조정하세요.",
guideTip5:"콘텐츠 상태를 적극적으로 업데이트하면 팀 전체의 진행 상황을 실시간으로 파악할 수 있습니다."
},
en: {
title:"Content Calendar",subtitle:"Content scheduling · Team collaboration · Multi-channel publishing · AI analytics",
tabCalendar:"Calendar",tabList:"List",tabAi:"AI Analysis",tabGuide:"Guide",
btnRegister:"Register Content",btnPrev:"Previous",btnNext:"Next",btnCancel:"Cancel",btnSave:"Save",
statusLabel:"Status",filterAll:"All",
st_draft:"Draft",st_review:"In Review",st_scheduled:"Scheduled",st_published:"Published",st_cancelled:"Cancelled",
daySun:"Sun",dayMon:"Mon",dayTue:"Tue",dayWed:"Wed",dayThu:"Thu",dayFri:"Fri",daySat:"Sat",
yearSuffix:"",
monthJan:"January",monthFeb:"February",monthMar:"March",monthApr:"April",monthMay:"May",monthJun:"June",
monthJul:"July",monthAug:"August",monthSep:"September",monthOct:"October",monthNov:"November",monthDec:"December",
noContent:"No content registered yet. Click + Register Content to get started.",
noEventsMonth:"No content scheduled for this month.",
noChannelData:"No connected channel data",noChannelDataSub:"Register API keys in the Integration Hub to see channel analytics automatically.",
untitled:"Untitled",
registerTitle:"Register Content",fieldTitle:"Title",fieldCreator:"Creator",fieldCampaign:"Campaign",fieldDate:"Date",fieldPlatform:"Platform",fieldStatus:"Status",
guideTitle:"Content Calendar User Guide",
guideSub:"A complete workflow guide from content planning to publishing, performance monitoring, and AI optimization.",
guideStepsTitle:"Content Management 6 Steps",
guideStep1Title:"Content Planning",guideStep1Desc:"Plan content aligned with campaign goals. Set target platforms, creators, and schedules. Collaborate with team members to draft content.",
guideStep2Title:"Schedule Registration",guideStep2Desc:"Register content on the calendar. Set dates, platforms, and statuses. Align with seasonal events for optimal publishing timing.",
guideStep3Title:"Review & Approval",guideStep3Desc:"Internal team review and approval process. Manage quality through Draft → Review → Scheduled workflow.",
guideStep4Title:"Multi-Channel Publishing",guideStep4Desc:"Publish approved content across multiple channels (Instagram, YouTube, TikTok, Blog, etc.) simultaneously via Integration Hub API keys.",
guideStep5Title:"Performance Monitoring",guideStep5Desc:"Track views, engagement rates, and conversion rates of published content in real-time. Compare performance across channels.",
guideStep6Title:"AI Optimization",guideStep6Desc:"AI analyzes content performance to recommend optimal publishing times, effective platforms, and suggested keywords.",
guideTabsTitle:"Tab Features",
guideCalName:"Calendar View",guideCalDesc:"View monthly content schedule at a glance",
guideListName:"List View",guideListDesc:"Filter by status and view detailed information",
guideAiName:"AI Analysis",guideAiDesc:"Channel performance analysis and AI insights",
guideGuideName:"User Guide",guideGuideDesc:"Content management workflow guide",
guideTipsTitle:"Tips & Best Practices",
guideTip1:"Register content at least 1 week in advance to ensure adequate team review time.",
guideTip2:"Plan content ahead for seasonal events (Black Friday, New Year, etc.).",
guideTip3:"Optimizing content for each platform's characteristics can increase engagement by 2-3x.",
guideTip4:"Regularly check channel performance in the AI Analysis tab and adjust strategies for underperforming channels.",
guideTip5:"Actively updating content statuses helps the entire team track progress in real-time."
},
ja: {
title:"コンテンツカレンダー",subtitle:"コンテンツスケジュール管理 · チーム協業 · マルチチャネル配信 · AI分析",
tabCalendar:"カレンダー",tabList:"リスト",tabAi:"AI分析",tabGuide:"ガイド",
btnRegister:"コンテンツ登録",btnPrev:"前へ",btnNext:"次へ",btnCancel:"キャンセル",btnSave:"保存",
statusLabel:"ステータス",filterAll:"すべて",
st_draft:"下書き",st_review:"レビュー中",st_scheduled:"予約済み",st_published:"公開済み",st_cancelled:"キャンセル",
daySun:"日",dayMon:"月",dayTue:"火",dayWed:"水",dayThu:"木",dayFri:"金",daySat:"土",
yearSuffix:"年",
monthJan:"1月",monthFeb:"2月",monthMar:"3月",monthApr:"4月",monthMay:"5月",monthJun:"6月",
monthJul:"7月",monthAug:"8月",monthSep:"9月",monthOct:"10月",monthNov:"11月",monthDec:"12月",
noContent:"登録されたコンテンツがありません。+ コンテンツ登録ボタンで開始してください。",
noEventsMonth:"今月のコンテンツはありません。",
noChannelData:"接続されたチャネルデータがありません",noChannelDataSub:"統合ハブでAPIキーを登録すると、チャネル分析データが自動的に表示されます。",
untitled:"無題",
registerTitle:"コンテンツ登録",fieldTitle:"タイトル",fieldCreator:"クリエイター",fieldCampaign:"キャンペーン",fieldDate:"日付",fieldPlatform:"プラットフォーム",fieldStatus:"ステータス",
guideTitle:"コンテンツカレンダー利用ガイド",
guideSub:"コンテンツ企画から配信、パフォーマンス分析、AI最適化までの完全なワークフローを案内します。",
guideStepsTitle:"コンテンツ管理6ステップ",
guideStep1Title:"コンテンツ企画",guideStep1Desc:"キャンペーン目標に合わせてコンテンツを企画します。ターゲットプラットフォーム、クリエイター、スケジュールを設定します。",
guideStep2Title:"スケジュール登録",guideStep2Desc:"カレンダーにコンテンツを登録します。日付、プラットフォーム、ステータスを指定します。",
guideStep3Title:"レビュー＆承認",guideStep3Desc:"チーム内レビューを経てコンテンツを承認します。Draft → Review → Scheduledワークフローで品質を管理します。",
guideStep4Title:"マルチチャネル配信",guideStep4Desc:"承認されたコンテンツを複数チャネルに同時配信します。統合ハブのAPIキーで自動連携されます。",
guideStep5Title:"パフォーマンス監視",guideStep5Desc:"配信コンテンツの閲覧数、エンゲージメント率、コンバージョン率をリアルタイムで追跡します。",
guideStep6Title:"AI最適化",guideStep6Desc:"AIがコンテンツパフォーマンスを分析し、最適な配信時間、効果的なプラットフォーム、推奨キーワードを提案します。",
guideTabsTitle:"タブ別機能案内",
guideCalName:"カレンダービュー",guideCalDesc:"月別コンテンツスケジュールを一目で確認",
guideListName:"リストビュー",guideListDesc:"ステータス別フィルタリングと詳細情報確認",
guideAiName:"AI分析",guideAiDesc:"チャネル別パフォーマンス分析とAIインサイト",
guideGuideName:"利用ガイド",guideGuideDesc:"コンテンツ管理ワークフロー案内",
guideTipsTitle:"ヒントとベストプラクティス",
guideTip1:"コンテンツは最低1週間前に登録すると、チームレビュー時間を十分に確保できます。",
guideTip2:"シーズンイベントに合わせてコンテンツを事前に企画してください。",
guideTip3:"各プラットフォームの特性に合わせてコンテンツを最適化すると、エンゲージメントが2〜3倍向上します。",
guideTip4:"AI分析タブでチャネル別パフォーマンスを定期的に確認し、低パフォーマンスチャネルの戦略を調整してください。",
guideTip5:"コンテンツステータスを積極的に更新すると、チーム全体の進捗をリアルタイムで把握できます。"
},
zh: {
title:"内容日历",subtitle:"内容排程管理 · 团队协作 · 多渠道发布 · AI分析",
tabCalendar:"日历",tabList:"列表",tabAi:"AI分析",tabGuide:"指南",
btnRegister:"注册内容",btnPrev:"上一月",btnNext:"下一月",btnCancel:"取消",btnSave:"保存",
statusLabel:"状态",filterAll:"全部",
st_draft:"草稿",st_review:"审核中",st_scheduled:"已排期",st_published:"已发布",st_cancelled:"已取消",
daySun:"日",dayMon:"一",dayTue:"二",dayWed:"三",dayThu:"四",dayFri:"五",daySat:"六",
yearSuffix:"年",
monthJan:"1月",monthFeb:"2月",monthMar:"3月",monthApr:"4月",monthMay:"5月",monthJun:"6月",
monthJul:"7月",monthAug:"8月",monthSep:"9月",monthOct:"10月",monthNov:"11月",monthDec:"12月",
noContent:"暂无注册内容。请点击 + 注册内容按钮开始。",
noEventsMonth:"本月暂无内容排程。",
noChannelData:"暂无已连接的渠道数据",noChannelDataSub:"在集成中心注册API密钥后，渠道分析数据将自动显示。",
untitled:"无标题",
registerTitle:"注册内容",fieldTitle:"标题",fieldCreator:"创作者",fieldCampaign:"活动",fieldDate:"日期",fieldPlatform:"平台",fieldStatus:"状态",
guideTitle:"内容日历使用指南",guideSub:"从内容策划到发布、绩效监控和AI优化的完整工作流程指南。",
guideStepsTitle:"内容管理6步骤",
guideStep1Title:"内容策划",guideStep1Desc:"根据活动目标策划内容，设置目标平台、创作者和排程。",
guideStep2Title:"排程注册",guideStep2Desc:"在日历上注册内容，指定日期、平台和状态。",
guideStep3Title:"审核与批准",guideStep3Desc:"通过团队内部审核流程。通过草稿→审核→排期工作流程管理质量。",
guideStep4Title:"多渠道发布",guideStep4Desc:"将已批准的内容同时发布到多个渠道。通过集成中心的API密钥自动连接。",
guideStep5Title:"绩效监控",guideStep5Desc:"实时跟踪已发布内容的浏览量、参与率和转化率。",
guideStep6Title:"AI优化",guideStep6Desc:"AI分析内容绩效，推荐最佳发布时间、有效平台和建议关键词。",
guideTabsTitle:"标签功能说明",guideCalName:"日历视图",guideCalDesc:"一览月度内容排程",
guideListName:"列表视图",guideListDesc:"按状态筛选和查看详细信息",
guideAiName:"AI分析",guideAiDesc:"渠道绩效分析和AI洞察",
guideGuideName:"使用指南",guideGuideDesc:"内容管理工作流程指南",
guideTipsTitle:"技巧与最佳实践",
guideTip1:"提前至少1周注册内容，确保充足的团队审核时间。",
guideTip2:"提前规划季节性活动内容。",
guideTip3:"针对各平台特性优化内容可将参与度提高2-3倍。",
guideTip4:"定期在AI分析标签中查看渠道绩效，调整低效渠道策略。",
guideTip5:"积极更新内容状态，帮助团队实时了解整体进度。"
},
"zh-TW": {
title:"內容日曆",subtitle:"內容排程管理 · 團隊協作 · 多頻道發佈 · AI分析",
tabCalendar:"日曆",tabList:"列表",tabAi:"AI分析",tabGuide:"指南",
btnRegister:"註冊內容",btnPrev:"上一月",btnNext:"下一月",btnCancel:"取消",btnSave:"儲存",
statusLabel:"狀態",filterAll:"全部",
st_draft:"草稿",st_review:"審核中",st_scheduled:"已排程",st_published:"已發佈",st_cancelled:"已取消",
daySun:"日",dayMon:"一",dayTue:"二",dayWed:"三",dayThu:"四",dayFri:"五",daySat:"六",
yearSuffix:"年",
monthJan:"1月",monthFeb:"2月",monthMar:"3月",monthApr:"4月",monthMay:"5月",monthJun:"6月",
monthJul:"7月",monthAug:"8月",monthSep:"9月",monthOct:"10月",monthNov:"11月",monthDec:"12月",
noContent:"尚無註冊內容。請點擊 + 註冊內容按鈕開始。",
noEventsMonth:"本月無內容排程。",
noChannelData:"無已連接的頻道數據",noChannelDataSub:"在整合中心註冊API金鑰後，頻道分析數據將自動顯示。",
untitled:"無標題",
registerTitle:"註冊內容",fieldTitle:"標題",fieldCreator:"創作者",fieldCampaign:"活動",fieldDate:"日期",fieldPlatform:"平台",fieldStatus:"狀態",
guideTitle:"內容日曆使用指南",guideSub:"從內容企劃到發佈、績效監控和AI優化的完整工作流程指南。",
guideStepsTitle:"內容管理6步驟",
guideStep1Title:"內容企劃",guideStep1Desc:"根據活動目標企劃內容，設定目標平台、創作者和排程。",
guideStep2Title:"排程註冊",guideStep2Desc:"在日曆上註冊內容，指定日期、平台和狀態。",
guideStep3Title:"審核與批准",guideStep3Desc:"通過團隊內部審核流程。通過草稿→審核→排程工作流程管理品質。",
guideStep4Title:"多頻道發佈",guideStep4Desc:"將已批准的內容同時發佈到多個頻道。通過整合中心的API金鑰自動連接。",
guideStep5Title:"績效監控",guideStep5Desc:"即時追蹤已發佈內容的瀏覽量、參與率和轉化率。",
guideStep6Title:"AI優化",guideStep6Desc:"AI分析內容績效，推薦最佳發佈時間、有效平台和建議關鍵字。",
guideTabsTitle:"標籤功能說明",guideCalName:"日曆視圖",guideCalDesc:"一覽月度內容排程",
guideListName:"列表視圖",guideListDesc:"按狀態篩選和查看詳細資訊",
guideAiName:"AI分析",guideAiDesc:"頻道績效分析和AI洞察",
guideGuideName:"使用指南",guideGuideDesc:"內容管理工作流程指南",
guideTipsTitle:"技巧與最佳實踐",
guideTip1:"提前至少1週註冊內容，確保充足的團隊審核時間。",
guideTip2:"提前規劃季節性活動內容。",
guideTip3:"針對各平台特性優化內容可將參與度提高2-3倍。",
guideTip4:"定期在AI分析標籤中查看頻道績效，調整低效頻道策略。",
guideTip5:"積極更新內容狀態，幫助團隊即時了解整體進度。"
},
de: {
title:"Inhaltskalender",subtitle:"Inhaltsplanung · Teamzusammenarbeit · Multi-Kanal-Veröffentlichung · KI-Analyse",
tabCalendar:"Kalender",tabList:"Liste",tabAi:"KI-Analyse",tabGuide:"Anleitung",
btnRegister:"Inhalt registrieren",btnPrev:"Zurück",btnNext:"Weiter",btnCancel:"Abbrechen",btnSave:"Speichern",
statusLabel:"Status",filterAll:"Alle",
st_draft:"Entwurf",st_review:"In Prüfung",st_scheduled:"Geplant",st_published:"Veröffentlicht",st_cancelled:"Abgesagt",
daySun:"So",dayMon:"Mo",dayTue:"Di",dayWed:"Mi",dayThu:"Do",dayFri:"Fr",daySat:"Sa",
yearSuffix:"",
monthJan:"Januar",monthFeb:"Februar",monthMar:"März",monthApr:"April",monthMay:"Mai",monthJun:"Juni",
monthJul:"Juli",monthAug:"August",monthSep:"September",monthOct:"Oktober",monthNov:"November",monthDec:"Dezember",
noContent:"Noch keine Inhalte registriert. Klicken Sie auf + Inhalt registrieren.",
noEventsMonth:"Keine Inhalte für diesen Monat geplant.",
noChannelData:"Keine verbundenen Kanaldaten",noChannelDataSub:"Registrieren Sie API-Schlüssel im Integration Hub, um Kanalanalysedaten automatisch anzuzeigen.",
untitled:"Ohne Titel",
registerTitle:"Inhalt registrieren",fieldTitle:"Titel",fieldCreator:"Ersteller",fieldCampaign:"Kampagne",fieldDate:"Datum",fieldPlatform:"Plattform",fieldStatus:"Status",
guideTitle:"Inhaltskalender Benutzerhandbuch",guideSub:"Vollständiger Workflow von Inhaltsplanung bis KI-Optimierung.",
guideStepsTitle:"Inhaltsverwaltung 6 Schritte",
guideStep1Title:"Inhaltsplanung",guideStep1Desc:"Planen Sie Inhalte basierend auf Kampagnenzielen. Legen Sie Plattformen, Ersteller und Zeitpläne fest.",
guideStep2Title:"Zeitplan-Registrierung",guideStep2Desc:"Registrieren Sie Inhalte im Kalender mit Datum, Plattform und Status.",
guideStep3Title:"Überprüfung & Genehmigung",guideStep3Desc:"Teaminterner Überprüfungsprozess. Qualitätsmanagement durch Entwurf → Prüfung → Geplant.",
guideStep4Title:"Multi-Kanal-Veröffentlichung",guideStep4Desc:"Veröffentlichen Sie genehmigte Inhalte gleichzeitig auf mehreren Kanälen.",
guideStep5Title:"Leistungsüberwachung",guideStep5Desc:"Verfolgen Sie Aufrufe, Engagement und Konversionsraten in Echtzeit.",
guideStep6Title:"KI-Optimierung",guideStep6Desc:"KI analysiert die Inhaltsleistung und empfiehlt optimale Veröffentlichungszeiten.",
guideTabsTitle:"Tab-Funktionen",guideCalName:"Kalenderansicht",guideCalDesc:"Monatlichen Inhaltsplan auf einen Blick",
guideListName:"Listenansicht",guideListDesc:"Nach Status filtern und Details anzeigen",
guideAiName:"KI-Analyse",guideAiDesc:"Kanalleistungsanalyse und KI-Einblicke",
guideGuideName:"Benutzerhandbuch",guideGuideDesc:"Workflow-Leitfaden für Inhaltsverwaltung",
guideTipsTitle:"Tipps & Best Practices",
guideTip1:"Registrieren Sie Inhalte mindestens 1 Woche im Voraus.",
guideTip2:"Planen Sie Inhalte für saisonale Events im Voraus.",
guideTip3:"Plattformspezifische Optimierung kann das Engagement um das 2-3-fache steigern.",
guideTip4:"Überprüfen Sie regelmäßig die Kanalleistung im KI-Analyse-Tab.",
guideTip5:"Aktives Aktualisieren des Inhaltsstatus hilft dem Team, den Fortschritt in Echtzeit zu verfolgen."
},
th: {
title:"ปฏิทินเนื้อหา",subtitle:"การจัดการตารางเนื้อหา · การทำงานร่วมกัน · การเผยแพร่หลายช่องทาง · การวิเคราะห์ AI",
tabCalendar:"ปฏิทิน",tabList:"รายการ",tabAi:"วิเคราะห์ AI",tabGuide:"คู่มือ",
btnRegister:"ลงทะเบียนเนื้อหา",btnPrev:"ก่อนหน้า",btnNext:"ถัดไป",btnCancel:"ยกเลิก",btnSave:"บันทึก",
statusLabel:"สถานะ",filterAll:"ทั้งหมด",
st_draft:"ร่าง",st_review:"กำลังตรวจสอบ",st_scheduled:"กำหนดแล้ว",st_published:"เผยแพร่แล้ว",st_cancelled:"ยกเลิกแล้ว",
daySun:"อา",dayMon:"จ",dayTue:"อ",dayWed:"พ",dayThu:"พฤ",dayFri:"ศ",daySat:"ส",
yearSuffix:"",
monthJan:"มกราคม",monthFeb:"กุมภาพันธ์",monthMar:"มีนาคม",monthApr:"เมษายน",monthMay:"พฤษภาคม",monthJun:"มิถุนายน",
monthJul:"กรกฎาคม",monthAug:"สิงหาคม",monthSep:"กันยายน",monthOct:"ตุลาคม",monthNov:"พฤศจิกายน",monthDec:"ธันวาคม",
noContent:"ยังไม่มีเนื้อหาที่ลงทะเบียน คลิก + ลงทะเบียนเนื้อหาเพื่อเริ่มต้น",
noEventsMonth:"ไม่มีเนื้อหาที่กำหนดในเดือนนี้",
noChannelData:"ไม่มีข้อมูลช่องที่เชื่อมต่อ",noChannelDataSub:"ลงทะเบียนคีย์ API ในศูนย์รวมเพื่อดูข้อมูลวิเคราะห์ช่องอัตโนมัติ",
untitled:"ไม่มีชื่อ",
registerTitle:"ลงทะเบียนเนื้อหา",fieldTitle:"ชื่อ",fieldCreator:"ผู้สร้าง",fieldCampaign:"แคมเปญ",fieldDate:"วันที่",fieldPlatform:"แพลตฟอร์ม",fieldStatus:"สถานะ",
guideTitle:"คู่มือการใช้งานปฏิทินเนื้อหา",guideSub:"คู่มือเวิร์กโฟลว์ครบวงจรจากการวางแผนเนื้อหาถึงการเผยแพร่และการวิเคราะห์ AI",
guideStepsTitle:"6 ขั้นตอนการจัดการเนื้อหา",
guideStep1Title:"การวางแผนเนื้อหา",guideStep1Desc:"วางแผนเนื้อหาตามเป้าหมายแคมเปญ กำหนดแพลตฟอร์มเป้าหมาย ผู้สร้าง และตาราง",
guideStep2Title:"การลงทะเบียนตาราง",guideStep2Desc:"ลงทะเบียนเนื้อหาในปฏิทิน กำหนดวันที่ แพลตฟอร์ม และสถานะ",
guideStep3Title:"การตรวจสอบและอนุมัติ",guideStep3Desc:"ผ่านกระบวนการตรวจสอบภายในทีม จัดการคุณภาพผ่านเวิร์กโฟลว์",
guideStep4Title:"การเผยแพร่หลายช่องทาง",guideStep4Desc:"เผยแพร่เนื้อหาที่ได้รับอนุมัติพร้อมกันหลายช่องทาง",
guideStep5Title:"การติดตามประสิทธิภาพ",guideStep5Desc:"ติดตามยอดดู อัตราการมีส่วนร่วม และอัตราการแปลงแบบเรียลไทม์",
guideStep6Title:"การปรับปรุง AI",guideStep6Desc:"AI วิเคราะห์ประสิทธิภาพเนื้อหาและแนะนำเวลาเผยแพร่ที่ดีที่สุด",
guideTabsTitle:"ฟีเจอร์แท็บ",guideCalName:"มุมมองปฏิทิน",guideCalDesc:"ดูตารางเนื้อหารายเดือนในครั้งเดียว",
guideListName:"มุมมองรายการ",guideListDesc:"กรองตามสถานะและดูข้อมูลรายละเอียด",
guideAiName:"วิเคราะห์ AI",guideAiDesc:"วิเคราะห์ประสิทธิภาพช่องและข้อมูลเชิงลึก AI",
guideGuideName:"คู่มือการใช้งาน",guideGuideDesc:"คู่มือเวิร์กโฟลว์การจัดการเนื้อหา",
guideTipsTitle:"เคล็ดลับและแนวปฏิบัติที่ดี",
guideTip1:"ลงทะเบียนเนื้อหาล่วงหน้าอย่างน้อย 1 สัปดาห์",
guideTip2:"วางแผนเนื้อหาสำหรับกิจกรรมตามฤดูกาลล่วงหน้า",
guideTip3:"การปรับเนื้อหาให้เหมาะกับแต่ละแพลตฟอร์มสามารถเพิ่มการมีส่วนร่วม 2-3 เท่า",
guideTip4:"ตรวจสอบประสิทธิภาพช่องในแท็บวิเคราะห์ AI เป็นประจำ",
guideTip5:"การอัปเดตสถานะเนื้อหาอย่างสม่ำเสมอช่วยให้ทีมติดตามความคืบหน้าแบบเรียลไทม์"
},
vi: {
title:"Lịch Nội dung",subtitle:"Quản lý lịch nội dung · Cộng tác nhóm · Xuất bản đa kênh · Phân tích AI",
tabCalendar:"Lịch",tabList:"Danh sách",tabAi:"Phân tích AI",tabGuide:"Hướng dẫn",
btnRegister:"Đăng ký nội dung",btnPrev:"Trước",btnNext:"Tiếp",btnCancel:"Hủy",btnSave:"Lưu",
statusLabel:"Trạng thái",filterAll:"Tất cả",
st_draft:"Bản nháp",st_review:"Đang xét duyệt",st_scheduled:"Đã lên lịch",st_published:"Đã xuất bản",st_cancelled:"Đã hủy",
daySun:"CN",dayMon:"T2",dayTue:"T3",dayWed:"T4",dayThu:"T5",dayFri:"T6",daySat:"T7",
yearSuffix:"",
monthJan:"Tháng 1",monthFeb:"Tháng 2",monthMar:"Tháng 3",monthApr:"Tháng 4",monthMay:"Tháng 5",monthJun:"Tháng 6",
monthJul:"Tháng 7",monthAug:"Tháng 8",monthSep:"Tháng 9",monthOct:"Tháng 10",monthNov:"Tháng 11",monthDec:"Tháng 12",
noContent:"Chưa có nội dung nào được đăng ký. Nhấn + Đăng ký nội dung để bắt đầu.",
noEventsMonth:"Không có nội dung nào được lên lịch trong tháng này.",
noChannelData:"Không có dữ liệu kênh đã kết nối",noChannelDataSub:"Đăng ký khóa API trong Integration Hub để tự động hiển thị dữ liệu phân tích kênh.",
untitled:"Không có tiêu đề",
registerTitle:"Đăng ký nội dung",fieldTitle:"Tiêu đề",fieldCreator:"Người tạo",fieldCampaign:"Chiến dịch",fieldDate:"Ngày",fieldPlatform:"Nền tảng",fieldStatus:"Trạng thái",
guideTitle:"Hướng dẫn sử dụng Lịch Nội dung",guideSub:"Hướng dẫn quy trình làm việc đầy đủ từ lập kế hoạch nội dung đến xuất bản và phân tích AI.",
guideStepsTitle:"6 Bước Quản lý Nội dung",
guideStep1Title:"Lập kế hoạch nội dung",guideStep1Desc:"Lập kế hoạch nội dung theo mục tiêu chiến dịch. Đặt nền tảng, người tạo và lịch trình.",
guideStep2Title:"Đăng ký lịch trình",guideStep2Desc:"Đăng ký nội dung trên lịch. Đặt ngày, nền tảng và trạng thái.",
guideStep3Title:"Xét duyệt & Phê duyệt",guideStep3Desc:"Quy trình xét duyệt nội bộ nhóm. Quản lý chất lượng qua quy trình làm việc.",
guideStep4Title:"Xuất bản đa kênh",guideStep4Desc:"Xuất bản nội dung đã phê duyệt đồng thời trên nhiều kênh.",
guideStep5Title:"Giám sát hiệu suất",guideStep5Desc:"Theo dõi lượt xem, tỷ lệ tương tác và tỷ lệ chuyển đổi theo thời gian thực.",
guideStep6Title:"Tối ưu hóa AI",guideStep6Desc:"AI phân tích hiệu suất nội dung và đề xuất thời gian xuất bản tối ưu.",
guideTabsTitle:"Tính năng Tab",guideCalName:"Xem Lịch",guideCalDesc:"Xem lịch nội dung hàng tháng",
guideListName:"Xem Danh sách",guideListDesc:"Lọc theo trạng thái và xem chi tiết",
guideAiName:"Phân tích AI",guideAiDesc:"Phân tích hiệu suất kênh và thông tin AI",
guideGuideName:"Hướng dẫn sử dụng",guideGuideDesc:"Hướng dẫn quy trình quản lý nội dung",
guideTipsTitle:"Mẹo & Thực tiễn tốt nhất",
guideTip1:"Đăng ký nội dung ít nhất 1 tuần trước.",
guideTip2:"Lập kế hoạch nội dung trước cho các sự kiện theo mùa.",
guideTip3:"Tối ưu hóa nội dung cho từng nền tảng có thể tăng tương tác 2-3 lần.",
guideTip4:"Thường xuyên kiểm tra hiệu suất kênh trong tab Phân tích AI.",
guideTip5:"Cập nhật trạng thái nội dung giúp toàn nhóm theo dõi tiến độ thời gian thực."
},
id: {
title:"Kalender Konten",subtitle:"Manajemen jadwal konten · Kolaborasi tim · Penerbitan multi-saluran · Analisis AI",
tabCalendar:"Kalender",tabList:"Daftar",tabAi:"Analisis AI",tabGuide:"Panduan",
btnRegister:"Daftarkan Konten",btnPrev:"Sebelumnya",btnNext:"Selanjutnya",btnCancel:"Batal",btnSave:"Simpan",
statusLabel:"Status",filterAll:"Semua",
st_draft:"Draf",st_review:"Dalam Tinjauan",st_scheduled:"Dijadwalkan",st_published:"Diterbitkan",st_cancelled:"Dibatalkan",
daySun:"Min",dayMon:"Sen",dayTue:"Sel",dayWed:"Rab",dayThu:"Kam",dayFri:"Jum",daySat:"Sab",
yearSuffix:"",
monthJan:"Januari",monthFeb:"Februari",monthMar:"Maret",monthApr:"April",monthMay:"Mei",monthJun:"Juni",
monthJul:"Juli",monthAug:"Agustus",monthSep:"September",monthOct:"Oktober",monthNov:"November",monthDec:"Desember",
noContent:"Belum ada konten terdaftar. Klik + Daftarkan Konten untuk memulai.",
noEventsMonth:"Tidak ada konten yang dijadwalkan bulan ini.",
noChannelData:"Tidak ada data saluran yang terhubung",noChannelDataSub:"Daftarkan kunci API di Integration Hub untuk menampilkan data analitik saluran secara otomatis.",
untitled:"Tanpa Judul",
registerTitle:"Daftarkan Konten",fieldTitle:"Judul",fieldCreator:"Kreator",fieldCampaign:"Kampanye",fieldDate:"Tanggal",fieldPlatform:"Platform",fieldStatus:"Status",
guideTitle:"Panduan Pengguna Kalender Konten",guideSub:"Panduan alur kerja lengkap dari perencanaan konten hingga penerbitan dan analisis AI.",
guideStepsTitle:"6 Langkah Manajemen Konten",
guideStep1Title:"Perencanaan Konten",guideStep1Desc:"Rencanakan konten sesuai tujuan kampanye. Tetapkan platform, kreator, dan jadwal.",
guideStep2Title:"Pendaftaran Jadwal",guideStep2Desc:"Daftarkan konten di kalender. Tetapkan tanggal, platform, dan status.",
guideStep3Title:"Tinjauan & Persetujuan",guideStep3Desc:"Proses tinjauan internal tim. Kelola kualitas melalui alur kerja.",
guideStep4Title:"Penerbitan Multi-Saluran",guideStep4Desc:"Terbitkan konten yang disetujui secara bersamaan di beberapa saluran.",
guideStep5Title:"Pemantauan Kinerja",guideStep5Desc:"Lacak tampilan, tingkat keterlibatan, dan tingkat konversi secara real-time.",
guideStep6Title:"Optimasi AI",guideStep6Desc:"AI menganalisis kinerja konten dan merekomendasikan waktu penerbitan optimal.",
guideTabsTitle:"Fitur Tab",guideCalName:"Tampilan Kalender",guideCalDesc:"Lihat jadwal konten bulanan sekilas",
guideListName:"Tampilan Daftar",guideListDesc:"Filter berdasarkan status dan lihat detail",
guideAiName:"Analisis AI",guideAiDesc:"Analisis kinerja saluran dan wawasan AI",
guideGuideName:"Panduan Pengguna",guideGuideDesc:"Panduan alur kerja manajemen konten",
guideTipsTitle:"Tips & Praktik Terbaik",
guideTip1:"Daftarkan konten setidaknya 1 minggu sebelumnya.",
guideTip2:"Rencanakan konten untuk acara musiman di muka.",
guideTip3:"Mengoptimalkan konten untuk setiap platform dapat meningkatkan keterlibatan 2-3 kali.",
guideTip4:"Periksa kinerja saluran secara berkala di tab Analisis AI.",
guideTip5:"Memperbarui status konten secara aktif membantu seluruh tim memantau kemajuan secara real-time."
}
};

function findBlockEnd(code, startBrace) {
  let depth = 0, inStr = false;
  for (let i = startBrace; i < code.length; i++) {
    if (inStr) { if (code[i] === '\\') { i++; continue; } if (code[i] === '"') { inStr = false; continue; } continue; }
    if (code[i] === '"') { inStr = true; continue; }
    if (code[i] === '{') depth++;
    if (code[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  
  // Check if contentCal block already exists
  if (code.includes('contentCal:{')) {
    console.log(`${lang}: contentCal block already exists, replacing...`);
    const idx = code.indexOf('contentCal:{');
    const endIdx = findBlockEnd(code, idx + 11);
    if (endIdx > 0) {
      // Remove existing block including leading comma
      let removeStart = idx;
      if (removeStart > 0 && code[removeStart - 1] === ',') removeStart--;
      code = code.substring(0, removeStart) + code.substring(endIdx + 1);
    }
  }
  
  // Find the last } before the end of the export
  // Insert before the final closing }
  const lastBrace = code.lastIndexOf('}');
  if (lastBrace < 0) {
    console.log(`❌ ${lang}: no closing brace found`);
    return;
  }
  
  const keys = KEYS[lang] || KEYS.en;
  const block = ',contentCal:{' + Object.entries(keys)
    .map(([k, v]) => `${k}:"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',') + '}';
  
  code = code.substring(0, lastBrace) + block + code.substring(lastBrace);
  fs.writeFileSync(file, code, 'utf8');
  
  // Verify
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const obj = fn();
    const ccKeys = obj.contentCal ? Object.keys(obj.contentCal).length : 0;
    console.log(`✅ ${lang}: ${ccKeys} contentCal keys (valid JS)`);
  } catch (e) {
    console.log(`❌ ${lang}: ${e.message.substring(0, 80)}`);
  }
});
