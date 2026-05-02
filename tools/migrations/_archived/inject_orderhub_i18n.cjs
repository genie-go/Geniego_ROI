const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');

/* All NEW orderHub i18n keys for 9 languages */
const KEYS_BY_LANG = {
ko: {
heroTitle:'주문 데이터 허브',noData:'데이터가 없습니다.',
statusPaid:'결제완료',statusPreparing:'상품준비중',statusShipping:'배송중',statusDelivered:'배송완료',statusConfirmed:'구매확정',
statusSettled:'정산완료',statusProcessing:'처리중',
kpiAllOrders:'전체 주문',kpiTodayNew:'오늘 신규',kpiShippedDone:'배송 중/완료',kpiClaimCount:'클레임',
searchPlaceholder:'주문번호·구매자·상품명 검색...',allChannels:'전체 채널',allStatus:'전체 상태',
colOrderNo:'주문번호',colChannel:'채널',colProduct:'주문상품',colQty:'수량',colTotal:'총액',colBuyer:'구매자',colStatus:'상태',colNote:'비고',
badgeClaim:'클레임',badgeSettled:'정산완료',badgeSlaDelay:'출고지연',btnDetail:'상세',
labelChannel:'채널',labelBuyer:'구매자',labelProduct:'상품',labelQty:'수량',labelTotal:'총액',labelStatus:'상태',labelCarrier:'택배사',labelTrackNo:'운송장',labelOrderDate:'주문일시',labelWarehouse:'창고',
settleColChannel:'채널',settleColPeriod:'정산기간',settleColGross:'총매출',settleColFee:'플랫폼 수수료',settleColNet:'정산금액',
intlColCountry:'국가',intlEstDuty:'예상 관세',
claimCancel:'취소',claimReturn:'반품',claimExchange:'교환',claimRefund:'환불',
claimStatusReceived:'접수완료',claimStatusProcessing:'처리중',claimStatusDone:'완료',claimStatusRejected:'반려',
settingsAutoCollect:'자동 수집',settingsAutoCollectDesc:'연동된 채널에서 주문 데이터를 실시간으로 자동 수집합니다.',
settingsSlaMonitor:'SLA 모니터링',settingsSlaMonitorDesc:'채널별 출고 SLA 기준시간을 모니터링하고 위반 시 즉시 알림합니다.',
settingsNotification:'알림 설정',settingsNotifDesc:'신규 주문, 클레임 접수, SLA 위반 시 Slack/Email 알림을 전송합니다.',
tabGuide:'이용 가이드',routingNoRules:'등록된 라우팅 규칙이 없습니다. 규칙을 추가해 주세요.',
b2bSku:'종',
guideTitle:'주문허브 이용 가이드',guideSub:'주문 수집부터 정산까지 모든 프로세스를 한눈에 관리하는 방법을 안내합니다.',
guideStepsTitle:'단계별 가이드',
guideStep1Title:'주문 데이터 자동 수집',guideStep1Desc:'연동허브에서 API 키를 등록하면 해당 채널의 주문이 실시간으로 자동 수집됩니다. 쿠팡, 네이버, 아마존 등 국내외 채널을 지원합니다.',
guideStep2Title:'주문 관리 및 검색',guideStep2Desc:'주문번호, 구매자, 상품명으로 빠른 검색이 가능합니다. 채널별/상태별 필터로 원하는 주문을 즉시 찾을 수 있습니다.',
guideStep3Title:'배송 추적',guideStep3Desc:'택배사별 운송장 번호로 실시간 배송 상태를 추적합니다. SLA 위반 주문은 자동 알림됩니다.',
guideStep4Title:'클레임/반품 관리',guideStep4Desc:'취소, 반품, 교환, 환불 등 모든 클레임을 통합 관리합니다. 접수부터 처리 완료까지 상태를 추적합니다.',
guideStep5Title:'정산 관리',guideStep5Desc:'채널별 매출, 수수료, 정산 금액을 자동 집계합니다. 정산 기간별로 상세 내역을 확인할 수 있습니다.',
guideStep6Title:'국제 주문',guideStep6Desc:'해외 마켓플레이스 주문을 별도 관리합니다. HS코드, 관세 예상액, 인코텀즈(DDP/DDU) 정보를 제공합니다.',
guideStep7Title:'B2B 도매 주문',guideStep7Desc:'대량 도매 주문을 전용 탭에서 관리합니다. B2B 태그가 지정된 주문을 자동 분류합니다.',
guideStep8Title:'자동 라우팅',guideStep8Desc:'조건별 자동 배송 라우팅 규칙을 설정합니다. 지역, 무게, 채널 등 조건에 따라 최적 창고를 자동 배정합니다.',
guideTipsTitle:'운영 팁',
guideTip1:'연동허브에서 채널 API 키를 등록하면 주문이 자동으로 수집됩니다.',
guideTip2:'SLA 모니터링은 Overview 탭에서 실시간으로 확인할 수 있습니다.',
guideTip3:'클레임 발생 시 CRM과 자동 동기화되어 고객 이력에 반영됩니다.',
guideTip4:'자동 라우팅 규칙을 등록하면 물류 비용을 절감할 수 있습니다.',
guideTip5:'정산 데이터는 모든 관련 메뉴(대시보드, 분석 등)와 실시간 동기화됩니다.',
},
en: {
heroTitle:'Order Data Hub',noData:'No data available.',
statusPaid:'Paid',statusPreparing:'Preparing',statusShipping:'Shipping',statusDelivered:'Delivered',statusConfirmed:'Confirmed',
statusSettled:'Settled',statusProcessing:'Processing',
kpiAllOrders:'Total Orders',kpiTodayNew:'Today New',kpiShippedDone:'Shipped/Done',kpiClaimCount:'Claims',
searchPlaceholder:'Search order ID, buyer, product...',allChannels:'All Channels',allStatus:'All Status',
colOrderNo:'Order No.',colChannel:'Channel',colProduct:'Product',colQty:'Qty',colTotal:'Total',colBuyer:'Buyer',colStatus:'Status',colNote:'Note',
badgeClaim:'Claim',badgeSettled:'Settled',badgeSlaDelay:'SLA Delay',btnDetail:'Detail',
labelChannel:'Channel',labelBuyer:'Buyer',labelProduct:'Product',labelQty:'Quantity',labelTotal:'Total',labelStatus:'Status',labelCarrier:'Carrier',labelTrackNo:'Tracking No.',labelOrderDate:'Order Date',labelWarehouse:'Warehouse',
settleColChannel:'Channel',settleColPeriod:'Period',settleColGross:'Gross Sales',settleColFee:'Platform Fee',settleColNet:'Net Payout',
intlColCountry:'Country',intlEstDuty:'Est. Duty',
claimCancel:'Cancel',claimReturn:'Return',claimExchange:'Exchange',claimRefund:'Refund',
claimStatusReceived:'Received',claimStatusProcessing:'Processing',claimStatusDone:'Done',claimStatusRejected:'Rejected',
settingsAutoCollect:'Auto Collection',settingsAutoCollectDesc:'Automatically collects order data in real-time from connected channels.',
settingsSlaMonitor:'SLA Monitoring',settingsSlaMonitorDesc:'Monitors channel-specific SLA fulfillment deadlines and alerts on violations.',
settingsNotification:'Notification Settings',settingsNotifDesc:'Sends Slack/Email alerts for new orders, claims, and SLA violations.',
tabGuide:'User Guide',routingNoRules:'No routing rules found. Please add a rule.',
b2bSku:' types',
guideTitle:'Order Hub User Guide',guideSub:'A complete guide to managing your entire order lifecycle — from collection to settlement.',
guideStepsTitle:'Step-by-Step Guide',
guideStep1Title:'Automatic Order Collection',guideStep1Desc:'Register API keys in Integration Hub to automatically collect orders from connected channels in real-time. Supports Coupang, Naver, Amazon, Shopify, and more.',
guideStep2Title:'Order Management & Search',guideStep2Desc:'Quickly search by order ID, buyer name, or product. Use channel and status filters to find exactly what you need.',
guideStep3Title:'Delivery Tracking',guideStep3Desc:'Track shipments in real-time by carrier and tracking number. SLA-violating orders are automatically flagged.',
guideStep4Title:'Claims & Returns Management',guideStep4Desc:'Manage all claims including cancellations, returns, exchanges, and refunds in one unified view. Track status from receipt to resolution.',
guideStep5Title:'Settlement Management',guideStep5Desc:'Automatically aggregates sales, fees, and net payouts by channel. View detailed breakdowns by settlement period.',
guideStep6Title:'International Orders',guideStep6Desc:'Manage overseas marketplace orders separately. Provides HS codes, estimated duties, and Incoterms (DDP/DDU) information.',
guideStep7Title:'B2B Wholesale Orders',guideStep7Desc:'Manage bulk wholesale orders in a dedicated tab. Orders tagged as B2B are automatically classified.',
guideStep8Title:'Auto Routing',guideStep8Desc:'Set up condition-based auto-routing rules for shipments. Automatically assign optimal warehouses based on region, weight, channel, and more.',
guideTipsTitle:'Operational Tips',
guideTip1:'Register channel API keys in Integration Hub for automatic order collection.',
guideTip2:'Monitor SLA compliance in real-time from the Overview tab.',
guideTip3:'Claims are auto-synced with CRM to reflect in customer history.',
guideTip4:'Setting up auto-routing rules can significantly reduce logistics costs.',
guideTip5:'Settlement data is synchronized in real-time with all related menus (Dashboard, Analytics, etc.).',
},
ja: {
heroTitle:'注文データハブ',noData:'データがありません。',
statusPaid:'決済完了',statusPreparing:'準備中',statusShipping:'配送中',statusDelivered:'配送完了',statusConfirmed:'購入確定',
statusSettled:'精算完了',statusProcessing:'処理中',
kpiAllOrders:'全注文',kpiTodayNew:'本日新規',kpiShippedDone:'配送中/完了',kpiClaimCount:'クレーム',
searchPlaceholder:'注文番号・購入者・商品名で検索...',allChannels:'全チャネル',allStatus:'全ステータス',
colOrderNo:'注文番号',colChannel:'チャネル',colProduct:'商品',colQty:'数量',colTotal:'合計',colBuyer:'購入者',colStatus:'状態',colNote:'備考',
badgeClaim:'クレーム',badgeSettled:'精算済',badgeSlaDelay:'出荷遅延',btnDetail:'詳細',
labelChannel:'チャネル',labelBuyer:'購入者',labelProduct:'商品',labelQty:'数量',labelTotal:'合計',labelStatus:'状態',labelCarrier:'配送業者',labelTrackNo:'追跡番号',labelOrderDate:'注文日時',labelWarehouse:'倉庫',
settleColChannel:'チャネル',settleColPeriod:'精算期間',settleColGross:'総売上',settleColFee:'手数料',settleColNet:'精算金額',
intlColCountry:'国',intlEstDuty:'関税予想',
claimCancel:'キャンセル',claimReturn:'返品',claimExchange:'交換',claimRefund:'返金',
claimStatusReceived:'受付完了',claimStatusProcessing:'処理中',claimStatusDone:'完了',claimStatusRejected:'却下',
settingsAutoCollect:'自動収集',settingsAutoCollectDesc:'連携チャネルから注文データをリアルタイムで自動収集します。',
settingsSlaMonitor:'SLAモニタリング',settingsSlaMonitorDesc:'チャネル別出荷SLA基準時間を監視し、違反時に即座に通知します。',
settingsNotification:'通知設定',settingsNotifDesc:'新規注文、クレーム受付、SLA違反時にSlack/Emailで通知します。',
tabGuide:'利用ガイド',routingNoRules:'ルーティングルールがありません。ルールを追加してください。',
b2bSku:'種',
guideTitle:'注文ハブ利用ガイド',guideSub:'注文収集から精算まで、すべてのプロセスを一元管理する方法をご案内します。',
guideStepsTitle:'ステップガイド',
guideStep1Title:'注文データ自動収集',guideStep1Desc:'連携ハブでAPIキーを登録すると、該当チャネルの注文がリアルタイムで自動収集されます。',
guideStep2Title:'注文管理と検索',guideStep2Desc:'注文番号、購入者、商品名で素早く検索できます。チャネル別・状態別フィルターで注文を即座に見つけられます。',
guideStep3Title:'配送追跡',guideStep3Desc:'配送業者・追跡番号でリアルタイムの配送状況を追跡します。SLA違反注文は自動通知されます。',
guideStep4Title:'クレーム・返品管理',guideStep4Desc:'キャンセル、返品、交換、返金など全てのクレームを統合管理します。',
guideStep5Title:'精算管理',guideStep5Desc:'チャネル別売上、手数料、精算金額を自動集計します。',
guideStep6Title:'国際注文',guideStep6Desc:'海外マーケットプレイスの注文を別途管理します。HSコード、関税予想額、インコタームズ情報を提供します。',
guideStep7Title:'B2B卸売注文',guideStep7Desc:'大量卸売注文を専用タブで管理します。',
guideStep8Title:'自動ルーティング',guideStep8Desc:'条件別自動配送ルーティング規則を設定します。',
guideTipsTitle:'運用Tips',
guideTip1:'連携ハブでチャネルAPIキーを登録すると注文が自動収集されます。',
guideTip2:'SLAモニタリングはOverviewタブでリアルタイムに確認できます。',
guideTip3:'クレーム発生時、CRMと自動同期され顧客履歴に反映されます。',
guideTip4:'自動ルーティング規則を登録すると物流コストを削減できます。',
guideTip5:'精算データは関連メニュー全てとリアルタイム同期されます。',
},
zh: {heroTitle:'订单数据中心',noData:'暂无数据。',statusPaid:'已付款',statusPreparing:'准备中',statusShipping:'配送中',statusDelivered:'已送达',statusConfirmed:'已确认',statusSettled:'已结算',statusProcessing:'处理中',kpiAllOrders:'全部订单',kpiTodayNew:'今日新增',kpiShippedDone:'配送中/完成',kpiClaimCount:'投诉',searchPlaceholder:'搜索订单号、买家、商品...',allChannels:'全部渠道',allStatus:'全部状态',colOrderNo:'订单号',colChannel:'渠道',colProduct:'商品',colQty:'数量',colTotal:'总额',colBuyer:'买家',colStatus:'状态',colNote:'备注',badgeClaim:'投诉',badgeSettled:'已结算',badgeSlaDelay:'延迟发货',btnDetail:'详情',labelChannel:'渠道',labelBuyer:'买家',labelProduct:'商品',labelQty:'数量',labelTotal:'总额',labelStatus:'状态',labelCarrier:'快递',labelTrackNo:'运单号',labelOrderDate:'下单时间',labelWarehouse:'仓库',settleColChannel:'渠道',settleColPeriod:'结算周期',settleColGross:'总销售额',settleColFee:'平台费用',settleColNet:'结算金额',intlColCountry:'国家',intlEstDuty:'预估关税',claimCancel:'取消',claimReturn:'退货',claimExchange:'换货',claimRefund:'退款',claimStatusReceived:'已受理',claimStatusProcessing:'处理中',claimStatusDone:'完成',claimStatusRejected:'驳回',settingsAutoCollect:'自动采集',settingsAutoCollectDesc:'从已连接渠道实时自动采集订单数据。',settingsSlaMonitor:'SLA监控',settingsSlaMonitorDesc:'监控各渠道发货SLA并在违规时发出警报。',settingsNotification:'通知设置',settingsNotifDesc:'新订单、投诉和SLA违规时发送Slack/邮件通知。',tabGuide:'使用指南',routingNoRules:'暂无路由规则。请添加规则。',b2bSku:'种',guideTitle:'订单中心使用指南',guideSub:'从订单采集到结算的全流程管理指南。',guideStepsTitle:'分步指南',guideStep1Title:'自动订单采集',guideStep1Desc:'在集成中心注册API密钥后，订单将从连接的渠道实时自动采集。',guideStep2Title:'订单管理与搜索',guideStep2Desc:'按订单号、买家或商品快速搜索。使用渠道和状态筛选器精确查找。',guideStep3Title:'物流追踪',guideStep3Desc:'按快递公司和运单号实时追踪配送状态。',guideStep4Title:'投诉与退货管理',guideStep4Desc:'统一管理取消、退货、换货和退款等所有投诉。',guideStep5Title:'结算管理',guideStep5Desc:'按渠道自动汇总销售额、费用和结算金额。',guideStep6Title:'国际订单',guideStep6Desc:'单独管理海外市场订单，提供HS编码和关税信息。',guideStep7Title:'B2B批发订单',guideStep7Desc:'在专用选项卡中管理批发订单。',guideStep8Title:'自动路由',guideStep8Desc:'根据条件设置自动配送路由规则。',guideTipsTitle:'运营建议',guideTip1:'在集成中心注册渠道API密钥即可自动采集订单。',guideTip2:'在概览选项卡中实时监控SLA合规性。',guideTip3:'投诉发生时自动同步到CRM客户历史。',guideTip4:'设置自动路由规则可显著降低物流成本。',guideTip5:'结算数据与所有相关菜单实时同步。'},
'zh-TW': {heroTitle:'訂單數據中心',noData:'暫無資料。',statusPaid:'已付款',statusPreparing:'準備中',statusShipping:'配送中',statusDelivered:'已送達',statusConfirmed:'已確認',statusSettled:'已結算',statusProcessing:'處理中',kpiAllOrders:'全部訂單',kpiTodayNew:'今日新增',kpiShippedDone:'配送中/完成',kpiClaimCount:'申訴',searchPlaceholder:'搜尋訂單號、買家、商品...',allChannels:'全部通路',allStatus:'全部狀態',colOrderNo:'訂單號',colChannel:'通路',colProduct:'商品',colQty:'數量',colTotal:'總額',colBuyer:'買家',colStatus:'狀態',colNote:'備註',badgeClaim:'申訴',badgeSettled:'已結算',badgeSlaDelay:'延遲出貨',btnDetail:'詳情',labelChannel:'通路',labelBuyer:'買家',labelProduct:'商品',labelQty:'數量',labelTotal:'總額',labelStatus:'狀態',labelCarrier:'物流',labelTrackNo:'追蹤號',labelOrderDate:'下單時間',labelWarehouse:'倉庫',settleColChannel:'通路',settleColPeriod:'結算週期',settleColGross:'總銷售額',settleColFee:'平台費用',settleColNet:'結算金額',intlColCountry:'國家',intlEstDuty:'預估關稅',claimCancel:'取消',claimReturn:'退貨',claimExchange:'換貨',claimRefund:'退款',claimStatusReceived:'已受理',claimStatusProcessing:'處理中',claimStatusDone:'完成',claimStatusRejected:'駁回',settingsAutoCollect:'自動採集',settingsAutoCollectDesc:'從已連接通路即時自動採集訂單資料。',settingsSlaMonitor:'SLA監控',settingsSlaMonitorDesc:'監控各通路出貨SLA並在違規時發出警報。',settingsNotification:'通知設定',settingsNotifDesc:'新訂單、申訴和SLA違規時發送通知。',tabGuide:'使用指南',routingNoRules:'無路由規則。請新增規則。',b2bSku:'種',guideTitle:'訂單中心使用指南',guideSub:'從訂單採集到結算的全流程管理指南。',guideStepsTitle:'步驟指南',guideStep1Title:'自動訂單採集',guideStep1Desc:'在整合中心註冊API金鑰後，訂單將即時自動採集。',guideStep2Title:'訂單管理與搜尋',guideStep2Desc:'按訂單號、買家或商品快速搜尋。',guideStep3Title:'物流追蹤',guideStep3Desc:'即時追蹤配送狀態。',guideStep4Title:'申訴與退貨管理',guideStep4Desc:'統一管理所有申訴。',guideStep5Title:'結算管理',guideStep5Desc:'按通路自動彙總結算資料。',guideStep6Title:'國際訂單',guideStep6Desc:'單獨管理海外市場訂單。',guideStep7Title:'B2B批發訂單',guideStep7Desc:'在專用頁籤管理批發訂單。',guideStep8Title:'自動路由',guideStep8Desc:'設定條件式自動配送路由規則。',guideTipsTitle:'營運建議',guideTip1:'在整合中心註冊API金鑰即可自動採集訂單。',guideTip2:'在總覽頁籤即時監控SLA。',guideTip3:'申訴時自動同步到CRM。',guideTip4:'設定路由規則可降低物流成本。',guideTip5:'結算資料與所有相關選單即時同步。'},
de: {heroTitle:'Auftrags-Datenhub',noData:'Keine Daten verfügbar.',statusPaid:'Bezahlt',statusPreparing:'In Vorbereitung',statusShipping:'In Zustellung',statusDelivered:'Zugestellt',statusConfirmed:'Bestätigt',statusSettled:'Abgerechnet',statusProcessing:'In Bearbeitung',kpiAllOrders:'Alle Aufträge',kpiTodayNew:'Heute neu',kpiShippedDone:'Versendet/Fertig',kpiClaimCount:'Reklamationen',searchPlaceholder:'Auftragsnr., Käufer, Produkt suchen...',allChannels:'Alle Kanäle',allStatus:'Alle Status',colOrderNo:'Auftragsnr.',colChannel:'Kanal',colProduct:'Produkt',colQty:'Menge',colTotal:'Gesamt',colBuyer:'Käufer',colStatus:'Status',colNote:'Notiz',badgeClaim:'Reklamation',badgeSettled:'Abgerechnet',badgeSlaDelay:'SLA-Verzug',btnDetail:'Details',labelChannel:'Kanal',labelBuyer:'Käufer',labelProduct:'Produkt',labelQty:'Menge',labelTotal:'Gesamt',labelStatus:'Status',labelCarrier:'Spediteur',labelTrackNo:'Sendungsnr.',labelOrderDate:'Bestelldatum',labelWarehouse:'Lager',settleColChannel:'Kanal',settleColPeriod:'Abrechnungszeitraum',settleColGross:'Bruttoumsatz',settleColFee:'Plattformgebühr',settleColNet:'Nettoauszahlung',intlColCountry:'Land',intlEstDuty:'Geschätzte Zölle',claimCancel:'Stornierung',claimReturn:'Rücksendung',claimExchange:'Umtausch',claimRefund:'Erstattung',claimStatusReceived:'Eingegangen',claimStatusProcessing:'In Bearbeitung',claimStatusDone:'Erledigt',claimStatusRejected:'Abgelehnt',settingsAutoCollect:'Automatische Erfassung',settingsAutoCollectDesc:'Erfasst Bestelldaten automatisch in Echtzeit von verbundenen Kanälen.',settingsSlaMonitor:'SLA-Überwachung',settingsSlaMonitorDesc:'Überwacht kanalspezifische SLA-Fristen und warnt bei Verstößen.',settingsNotification:'Benachrichtigungen',settingsNotifDesc:'Sendet Slack/E-Mail-Benachrichtigungen bei neuen Aufträgen, Reklamationen und SLA-Verstößen.',tabGuide:'Benutzerhandbuch',routingNoRules:'Keine Routing-Regeln vorhanden.',b2bSku:' Arten',guideTitle:'Order Hub Benutzerhandbuch',guideSub:'Vollständige Anleitung zur Verwaltung des gesamten Auftragslebenszyklus.',guideStepsTitle:'Schritt-für-Schritt-Anleitung',guideStep1Title:'Automatische Auftragserfassung',guideStep1Desc:'Registrieren Sie API-Schlüssel im Integration Hub für automatische Echtzeit-Auftragserfassung.',guideStep2Title:'Auftragsverwaltung & Suche',guideStep2Desc:'Schnelle Suche nach Auftragsnummer, Käufer oder Produkt.',guideStep3Title:'Lieferverfolgung',guideStep3Desc:'Echtzeit-Sendungsverfolgung nach Spediteur und Sendungsnummer.',guideStep4Title:'Reklamationsverwaltung',guideStep4Desc:'Alle Reklamationen einheitlich verwalten.',guideStep5Title:'Abrechnungsverwaltung',guideStep5Desc:'Automatische Zusammenfassung nach Kanal.',guideStep6Title:'Internationale Aufträge',guideStep6Desc:'Übersee-Marktplatz-Aufträge separat verwalten.',guideStep7Title:'B2B-Großhandelsaufträge',guideStep7Desc:'Großhandelsaufträge in eigenem Tab verwalten.',guideStep8Title:'Auto-Routing',guideStep8Desc:'Bedingungsbasierte automatische Versandregeln einrichten.',guideTipsTitle:'Betriebstipps',guideTip1:'API-Schlüssel im Integration Hub registrieren für automatische Auftragserfassung.',guideTip2:'SLA-Monitoring im Overview-Tab in Echtzeit prüfen.',guideTip3:'Bei Reklamationen automatische CRM-Synchronisierung.',guideTip4:'Auto-Routing-Regeln senken Logistikkosten.',guideTip5:'Abrechnungsdaten werden mit allen verwandten Menüs synchronisiert.'},
th: {heroTitle:'ศูนย์ข้อมูลคำสั่งซื้อ',noData:'ไม่มีข้อมูล',statusPaid:'ชำระแล้ว',statusPreparing:'กำลังเตรียม',statusShipping:'กำลังจัดส่ง',statusDelivered:'จัดส่งแล้ว',statusConfirmed:'ยืนยันแล้ว',statusSettled:'ชำระบัญชีแล้ว',statusProcessing:'กำลังดำเนินการ',kpiAllOrders:'คำสั่งซื้อทั้งหมด',kpiTodayNew:'ใหม่วันนี้',kpiShippedDone:'จัดส่ง/เสร็จสิ้น',kpiClaimCount:'เรื่องร้องเรียน',searchPlaceholder:'ค้นหาหมายเลขคำสั่งซื้อ, ผู้ซื้อ, สินค้า...',allChannels:'ทุกช่องทาง',allStatus:'ทุกสถานะ',colOrderNo:'หมายเลขคำสั่งซื้อ',colChannel:'ช่องทาง',colProduct:'สินค้า',colQty:'จำนวน',colTotal:'ยอดรวม',colBuyer:'ผู้ซื้อ',colStatus:'สถานะ',colNote:'หมายเหตุ',badgeClaim:'ร้องเรียน',badgeSettled:'ชำระแล้ว',badgeSlaDelay:'ส่งล่าช้า',btnDetail:'รายละเอียด',labelChannel:'ช่องทาง',labelBuyer:'ผู้ซื้อ',labelProduct:'สินค้า',labelQty:'จำนวน',labelTotal:'ยอดรวม',labelStatus:'สถานะ',labelCarrier:'ผู้ขนส่ง',labelTrackNo:'หมายเลขติดตาม',labelOrderDate:'วันที่สั่ง',labelWarehouse:'คลังสินค้า',settleColChannel:'ช่องทาง',settleColPeriod:'รอบชำระ',settleColGross:'ยอดขายรวม',settleColFee:'ค่าธรรมเนียม',settleColNet:'ยอดสุทธิ',intlColCountry:'ประเทศ',intlEstDuty:'ภาษีประมาณ',claimCancel:'ยกเลิก',claimReturn:'คืนสินค้า',claimExchange:'เปลี่ยนสินค้า',claimRefund:'คืนเงิน',claimStatusReceived:'รับเรื่องแล้ว',claimStatusProcessing:'กำลังดำเนินการ',claimStatusDone:'เสร็จสิ้น',claimStatusRejected:'ปฏิเสธ',settingsAutoCollect:'เก็บอัตโนมัติ',settingsAutoCollectDesc:'เก็บข้อมูลคำสั่งซื้อแบบเรียลไทม์จากช่องทางที่เชื่อมต่อ',settingsSlaMonitor:'ตรวจสอบ SLA',settingsSlaMonitorDesc:'ตรวจสอบ SLA และแจ้งเตือนเมื่อมีการละเมิด',settingsNotification:'การแจ้งเตือน',settingsNotifDesc:'ส่ง Slack/อีเมลเมื่อมีคำสั่งซื้อใหม่',tabGuide:'คู่มือการใช้งาน',routingNoRules:'ไม่มีกฎเส้นทาง',b2bSku:' ประเภท',guideTitle:'คู่มือใช้งาน Order Hub',guideSub:'คู่มือจัดการวงจรคำสั่งซื้อครบวงจร',guideStepsTitle:'คู่มือทีละขั้นตอน',guideStep1Title:'เก็บคำสั่งซื้ออัตโนมัติ',guideStep1Desc:'ลงทะเบียน API key เพื่อเก็บคำสั่งซื้ออัตโนมัติ',guideStep2Title:'จัดการและค้นหาคำสั่งซื้อ',guideStep2Desc:'ค้นหาด้วยหมายเลข ผู้ซื้อ หรือสินค้า',guideStep3Title:'ติดตามการจัดส่ง',guideStep3Desc:'ติดตามสถานะจัดส่งแบบเรียลไทม์',guideStep4Title:'จัดการเรื่องร้องเรียน',guideStep4Desc:'จัดการการยกเลิก คืนสินค้า เปลี่ยน คืนเงิน',guideStep5Title:'จัดการชำระบัญชี',guideStep5Desc:'สรุปยอดขายและค่าธรรมเนียมตามช่องทาง',guideStep6Title:'คำสั่งซื้อระหว่างประเทศ',guideStep6Desc:'จัดการคำสั่งซื้อต่างประเทศ',guideStep7Title:'คำสั่งซื้อ B2B',guideStep7Desc:'จัดการคำสั่งซื้อขายส่ง',guideStep8Title:'เส้นทางอัตโนมัติ',guideStep8Desc:'ตั้งกฎเส้นทางจัดส่งอัตโนมัติ',guideTipsTitle:'เคล็ดลับการดำเนินงาน',guideTip1:'ลงทะเบียน API key เพื่อเก็บคำสั่งซื้ออัตโนมัติ',guideTip2:'ตรวจสอบ SLA ที่แท็บ Overview',guideTip3:'เรื่องร้องเรียนจะซิงค์กับ CRM อัตโนมัติ',guideTip4:'กฎเส้นทางช่วยลดค่าขนส่ง',guideTip5:'ข้อมูลชำระบัญชีซิงค์กับเมนูที่เกี่ยวข้องทั้งหมด'},
vi: {heroTitle:'Trung tâm Dữ liệu Đơn hàng',noData:'Chưa có dữ liệu.',statusPaid:'Đã thanh toán',statusPreparing:'Đang chuẩn bị',statusShipping:'Đang giao',statusDelivered:'Đã giao',statusConfirmed:'Đã xác nhận',statusSettled:'Đã đối soát',statusProcessing:'Đang xử lý',kpiAllOrders:'Tổng đơn',kpiTodayNew:'Hôm nay',kpiShippedDone:'Đang giao/Hoàn',kpiClaimCount:'Khiếu nại',searchPlaceholder:'Tìm mã đơn, người mua, sản phẩm...',allChannels:'Tất cả kênh',allStatus:'Tất cả',colOrderNo:'Mã đơn',colChannel:'Kênh',colProduct:'Sản phẩm',colQty:'SL',colTotal:'Tổng',colBuyer:'Người mua',colStatus:'Trạng thái',colNote:'Ghi chú',badgeClaim:'Khiếu nại',badgeSettled:'Đã đối soát',badgeSlaDelay:'Trễ SLA',btnDetail:'Chi tiết',labelChannel:'Kênh',labelBuyer:'Người mua',labelProduct:'Sản phẩm',labelQty:'Số lượng',labelTotal:'Tổng',labelStatus:'Trạng thái',labelCarrier:'Nhà vận chuyển',labelTrackNo:'Mã vận đơn',labelOrderDate:'Ngày đặt',labelWarehouse:'Kho',settleColChannel:'Kênh',settleColPeriod:'Kỳ đối soát',settleColGross:'Doanh thu',settleColFee:'Phí nền tảng',settleColNet:'Thanh toán',intlColCountry:'Quốc gia',intlEstDuty:'Thuế ước tính',claimCancel:'Hủy',claimReturn:'Trả hàng',claimExchange:'Đổi hàng',claimRefund:'Hoàn tiền',claimStatusReceived:'Đã tiếp nhận',claimStatusProcessing:'Đang xử lý',claimStatusDone:'Hoàn thành',claimStatusRejected:'Từ chối',settingsAutoCollect:'Thu thập tự động',settingsAutoCollectDesc:'Tự động thu thập đơn hàng từ các kênh đã kết nối.',settingsSlaMonitor:'Giám sát SLA',settingsSlaMonitorDesc:'Giám sát SLA theo kênh và cảnh báo khi vi phạm.',settingsNotification:'Cài đặt thông báo',settingsNotifDesc:'Gửi thông báo Slack/Email khi có đơn mới, khiếu nại hoặc vi phạm SLA.',tabGuide:'Hướng dẫn',routingNoRules:'Chưa có quy tắc định tuyến.',b2bSku:' loại',guideTitle:'Hướng dẫn sử dụng',guideSub:'Hướng dẫn quản lý toàn bộ quy trình đơn hàng.',guideStepsTitle:'Hướng dẫn từng bước',guideStep1Title:'Tự động thu thập đơn',guideStep1Desc:'Đăng ký API key để tự động thu thập đơn hàng.',guideStep2Title:'Quản lý và tìm kiếm',guideStep2Desc:'Tìm nhanh theo mã đơn, người mua hoặc sản phẩm.',guideStep3Title:'Theo dõi vận chuyển',guideStep3Desc:'Theo dõi trạng thái giao hàng theo thời gian thực.',guideStep4Title:'Quản lý khiếu nại',guideStep4Desc:'Quản lý hủy, trả, đổi và hoàn tiền.',guideStep5Title:'Quản lý đối soát',guideStep5Desc:'Tổng hợp doanh thu và phí theo kênh.',guideStep6Title:'Đơn quốc tế',guideStep6Desc:'Quản lý đơn hàng nước ngoài.',guideStep7Title:'Đơn B2B',guideStep7Desc:'Quản lý đơn sỉ trong tab riêng.',guideStep8Title:'Định tuyến tự động',guideStep8Desc:'Thiết lập quy tắc định tuyến giao hàng tự động.',guideTipsTitle:'Mẹo vận hành',guideTip1:'Đăng ký API key để tự động thu thập đơn.',guideTip2:'Giám sát SLA tại tab Tổng quan.',guideTip3:'Khiếu nại tự động đồng bộ với CRM.',guideTip4:'Quy tắc định tuyến giúp giảm chi phí vận chuyển.',guideTip5:'Dữ liệu đối soát đồng bộ với tất cả menu liên quan.'},
id: {heroTitle:'Pusat Data Pesanan',noData:'Tidak ada data.',statusPaid:'Dibayar',statusPreparing:'Persiapan',statusShipping:'Pengiriman',statusDelivered:'Terkirim',statusConfirmed:'Dikonfirmasi',statusSettled:'Diselesaikan',statusProcessing:'Diproses',kpiAllOrders:'Total Pesanan',kpiTodayNew:'Baru Hari Ini',kpiShippedDone:'Dikirim/Selesai',kpiClaimCount:'Klaim',searchPlaceholder:'Cari no. pesanan, pembeli, produk...',allChannels:'Semua Saluran',allStatus:'Semua Status',colOrderNo:'No. Pesanan',colChannel:'Saluran',colProduct:'Produk',colQty:'Jml',colTotal:'Total',colBuyer:'Pembeli',colStatus:'Status',colNote:'Catatan',badgeClaim:'Klaim',badgeSettled:'Selesai',badgeSlaDelay:'Keterlambatan',btnDetail:'Detail',labelChannel:'Saluran',labelBuyer:'Pembeli',labelProduct:'Produk',labelQty:'Jumlah',labelTotal:'Total',labelStatus:'Status',labelCarrier:'Kurir',labelTrackNo:'No. Resi',labelOrderDate:'Tgl Pesanan',labelWarehouse:'Gudang',settleColChannel:'Saluran',settleColPeriod:'Periode',settleColGross:'Penjualan',settleColFee:'Biaya Platform',settleColNet:'Pembayaran',intlColCountry:'Negara',intlEstDuty:'Estimasi Bea',claimCancel:'Pembatalan',claimReturn:'Pengembalian',claimExchange:'Penukaran',claimRefund:'Pengembalian Dana',claimStatusReceived:'Diterima',claimStatusProcessing:'Diproses',claimStatusDone:'Selesai',claimStatusRejected:'Ditolak',settingsAutoCollect:'Pengumpulan Otomatis',settingsAutoCollectDesc:'Mengumpulkan data pesanan secara otomatis dari saluran yang terhubung.',settingsSlaMonitor:'Pemantauan SLA',settingsSlaMonitorDesc:'Memantau SLA per saluran dan memberi peringatan saat pelanggaran.',settingsNotification:'Pengaturan Notifikasi',settingsNotifDesc:'Mengirim notifikasi Slack/Email untuk pesanan baru dan klaim.',tabGuide:'Panduan Pengguna',routingNoRules:'Belum ada aturan routing.',b2bSku:' jenis',guideTitle:'Panduan Order Hub',guideSub:'Panduan lengkap mengelola siklus pesanan.',guideStepsTitle:'Panduan Langkah',guideStep1Title:'Pengumpulan Otomatis',guideStep1Desc:'Daftarkan API key untuk mengumpulkan pesanan otomatis.',guideStep2Title:'Manajemen & Pencarian',guideStep2Desc:'Cari cepat berdasarkan no. pesanan, pembeli, atau produk.',guideStep3Title:'Pelacakan Pengiriman',guideStep3Desc:'Lacak status pengiriman secara real-time.',guideStep4Title:'Manajemen Klaim',guideStep4Desc:'Kelola semua klaim secara terpadu.',guideStep5Title:'Manajemen Penyelesaian',guideStep5Desc:'Ringkasan penjualan dan biaya per saluran.',guideStep6Title:'Pesanan Internasional',guideStep6Desc:'Kelola pesanan marketplace luar negeri.',guideStep7Title:'Pesanan B2B',guideStep7Desc:'Kelola pesanan grosir di tab khusus.',guideStep8Title:'Routing Otomatis',guideStep8Desc:'Atur aturan routing pengiriman otomatis.',guideTipsTitle:'Tips Operasional',guideTip1:'Daftarkan API key untuk pengumpulan otomatis.',guideTip2:'Pantau SLA di tab Overview.',guideTip3:'Klaim otomatis tersinkron dengan CRM.',guideTip4:'Aturan routing mengurangi biaya logistik.',guideTip5:'Data penyelesaian tersinkron dengan semua menu terkait.'},
};

let total = 0;
for (const [lang, keys] of Object.entries(KEYS_BY_LANG)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Find the orderHub section
    const ohStart = content.indexOf('"orderHub"');
    if (ohStart === -1) { console.log(`⚠️ ${lang}.js: no orderHub section`); continue; }
    
    const ohObjStart = content.indexOf('{', ohStart);
    let depth = 0, ohObjEnd = -1;
    for (let i = ohObjStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') { depth--; if (depth === 0) { ohObjEnd = i; break; } }
    }
    if (ohObjEnd === -1) continue;
    
    let injected = 0;
    const ohBlock = content.substring(ohObjStart, ohObjEnd + 1);
    
    for (const [key, value] of Object.entries(keys)) {
        if (ohBlock.includes(`"${key}"`)) continue;
        const escaped = String(value).replace(/"/g, '\\"');
        const insertion = `,"${key}":"${escaped}"`;
        content = content.slice(0, ohObjEnd) + insertion + content.slice(ohObjEnd);
        ohObjEnd += insertion.length;
        injected++;
    }
    
    if (injected > 0) {
        fs.writeFileSync(file, content, 'utf-8');
        total += injected;
        console.log(`✅ ${lang}.js — ${injected} keys`);
    } else {
        console.log(`⏭️ ${lang}.js — all keys exist`);
    }
}
console.log(`\n📊 Total: ${total} keys injected across 9 languages`);
