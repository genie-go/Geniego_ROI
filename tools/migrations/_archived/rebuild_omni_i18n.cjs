const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const FULL_KEYS={
ko:{
heroTitle:"멀티채널 통합 커머스 허브",heroDesc:"인증키 등록만으로 상품 자동 등록 · 구매/반품/배송 실시간 수집 · 재고 동기화",
badgeChannelCount:"{{n}}개 채널 지원",badgeRegion:"국내·글로벌·일본",badgeProInteg:"Pro 실연동",badgeFree:"무료 체험",badgeOrderMgmt:"주문 {{n}}건 관리 중",
unifiedRevenue:"통합 수집 매출",warehouseStock:"창고 재고 확인 →",
tabChannels:"채널 연동",tabChannelsDesc:"인증키 입력 → 동기화",tabProducts:"수집 상품",tabProductsDesc:"자동 등록된 상품 목록",
tabOrders:"수집 주문",tabOrdersDesc:"구매·반품·배송 통합",tabInventory:"재고 현황",tabInventoryDesc:"채널별 실시간 재고",
tabOverview:"통합 현황",tabOverviewDesc:"KPI 대시보드",tabGuide:"가이드",tabGuideDesc:"이용 방법 안내",
kpiAllChannel:"전체 채널",kpiIntegDone:"연동 완료",kpiProducts:"수집 상품",kpiOrders:"수집 주문",
kpiIntegChannels:"연동 채널 수",kpiTotalProducts:"총 수집 상품",kpiTotalOrders:"총 수집 주문",kpiTotalRevenue:"총 수집 매출",
groupGlobal:"글로벌 채널",groupJapan:"일본 채널",groupDomestic:"국내 채널",
statusIntegrated:"연동 완료",statusError:"연동 오류",statusUntested:"미검증",statusNotConfig:"미설정",
authTitle:"인증키 등록",btnConnTest:"연결 테스트",btnSaveSync:"저장 & 동기화",btnSync:"동기화",btnClose:"닫기",btnAuthKey:"인증키 입력",btnRefresh:"새로고침",
savingProgress:"저장 중...",integSuccess:"연동 성공: 상품 {{products}}건, 주문 {{orders}}건 동기화",integFail:"연동 실패. 인증 정보를 확인하세요.",
demoSaveMsg:"체험 모드에서는 저장할 수 없습니다",demoTestMsg:"체험 모드에서는 테스트할 수 없습니다",demoStatusMsg:"체험 모드에서는 상태를 변경할 수 없습니다",
planPro:"Pro 플랜: 모든 채널 실연동 가능",planFree:"무료 체험: 실제 데이터 연동은 Pro 구독 시 이용 가능합니다",
searchPlaceholder:"상품명 또는 SKU 검색...",allChannel:"전체 채널",productCount:"총 {{n}}건",items:"총 {{n}}건",loading:"로딩 중...",noData:"데이터 없음",
colChannel:"채널",colId:"상품ID",colProductName:"상품명",colSku:"SKU",colSalePrice:"판매가",colStock:"재고",colCategory:"카테고리",colStatus:"상태",
colOrderNo:"주문번호",colBuyer:"구매자",colProduct:"상품",colQuantity:"수량",colAmount:"금액",colCarrier:"배송사",colOrderDate:"주문일",
colAvailStock:"가용재고",colReserved:"예약",colWarehouse:"창고",colSync:"동기화",colType:"유형",colRevenue:"매출",colRevenueShare:"매출 점유율",
statusConfirm:"주문확인",statusShipPending:"배송준비",statusShipping:"배송중",statusDelivered:"배송완료",statusCancelReq:"취소요청",statusReturnRecv:"반품접수",
stockLow:"재고 부족",stockNormal:"정상",overviewTitle:"채널별 종합 현황",
autoSyncTitle:"연동허브 자동 연계",autoSyncDesc:"Integration Hub에서 등록된 API 키가 자동으로 반영됩니다",autoSyncActive:"자동 동기화 활성",autoSyncChannels:"연동된 채널",
guideTitle:"옴니채널 이용 가이드",guideSub:"멀티채널 커머스 통합의 모든 것: 채널 연동부터 재고 동기화, 주문 관리까지 한눈에 안내합니다.",guideStepsTitle:"옴니채널 6단계",
guideStep1Title:"채널 등록",guideStep1Desc:"채널 연동 탭에서 원하는 판매 채널의 '인증키 입력' 버튼을 클릭합니다. Shopify, Amazon, eBay, TikTok Shop 등 글로벌 채널부터 쿠팡, 네이버 스마트스토어 등 국내 채널까지 13개 채널의 API 키를 등록합니다. 연결 테스트로 인증 상태를 즉시 확인할 수 있습니다.",
guideStep2Title:"상품 수집",guideStep2Desc:"채널 연동이 완료되면 수집 상품 탭에서 각 채널에 등록된 상품이 자동으로 수집됩니다. 상품명, SKU, 판매가, 재고, 카테고리 등이 통합 관리되며, 채널별 필터와 검색으로 원하는 상품을 빠르게 찾을 수 있습니다.",
guideStep3Title:"주문 관리",guideStep3Desc:"수집 주문 탭에서 모든 채널의 주문을 통합 관리합니다. 주문확인 → 배송준비 → 배송중 → 배송완료 순으로 상태를 변경할 수 있으며, 취소요청/반품접수 처리도 가능합니다. GlobalDataContext를 통해 Order Hub와 실시간 동기화됩니다.",
guideStep4Title:"재고 동기화",guideStep4Desc:"재고 현황 탭에서 채널별 가용재고, 예약재고, 창고 정보를 실시간으로 모니터링합니다. 재고 부족 상품은 빨간색으로 표시되어 즉시 확인 가능하며, WMS Manager와 연동되어 창고 재고까지 통합 관리됩니다.",
guideStep5Title:"통합 대시보드",guideStep5Desc:"통합 현황 탭에서 연동된 모든 채널의 KPI를 한눈에 확인합니다. 연동 채널 수, 총 상품수, 총 주문수, 총 매출은 물론 채널별 매출 점유율 차트까지 제공됩니다. 채널 성과를 비교하여 최적의 판매 전략을 수립하세요.",
guideStep6Title:"연동허브 연계",guideStep6Desc:"Integration Hub에서 API 키가 등록되면 옴니채널에 자동으로 해당 채널이 활성화됩니다. 별도의 추가 설정 없이 GlobalDataContext를 통해 실시간으로 채널 상태가 동기화되며, 모든 변경사항이 즉시 반영됩니다.",
guideTabsTitle:"탭 기능 안내",guideDashName:"채널 연동",guideDashDesc:"API 키 등록 및 연결",guideFeedName:"수집 상품",guideFeedDesc:"채널별 상품 통합 조회",guideTrendName:"수집 주문",guideTrendDesc:"주문 상태 통합 관리",guideSettingsName:"재고 현황",guideSettingsDesc:"실시간 재고 모니터링",guideGuideName:"통합 현황",guideGuideDesc:"채널 KPI 대시보드",
guideTipsTitle:"최적화 팁",guideTip1:"채널 연동 시 연결 테스트를 먼저 수행하면 인증 오류를 사전에 방지할 수 있습니다.",guideTip2:"재고 부족 알림을 활용하여 품절 전에 미리 재고를 보충하면 매출 손실을 방지할 수 있습니다.",guideTip3:"통합 대시보드의 매출 점유율을 분석하여 고수익 채널에 마케팅을 집중하면 ROI가 극대화됩니다.",guideTip4:"주문 상태 변경 시 GlobalDataContext를 통해 다른 메뉴와 즉시 동기화되므로 별도 새로고침이 필요 없습니다.",guideTip5:"Integration Hub에서 API 키 관리를 일원화하면 보안 관리가 더 편리해집니다.",
},
en:{
heroTitle:"Multi-Channel Commerce Hub",heroDesc:"Auto-register products with API keys · Real-time order/return/shipping collection · Inventory sync",
badgeChannelCount:"{{n}} Channels",badgeRegion:"Domestic · Global · Japan",badgeProInteg:"Pro Integration",badgeFree:"Free Trial",badgeOrderMgmt:"{{n}} Orders Managed",
unifiedRevenue:"Unified Revenue",warehouseStock:"Warehouse Stock →",
tabChannels:"Channel Integration",tabChannelsDesc:"Enter API key → Sync",tabProducts:"Products",tabProductsDesc:"Auto-collected products",
tabOrders:"Order Management",tabOrdersDesc:"Purchase · Return · Shipping",tabInventory:"Inventory Status",tabInventoryDesc:"Real-time by channel",
tabOverview:"Campaign Status",tabOverviewDesc:"KPI Dashboard",tabGuide:"Guide",tabGuideDesc:"How to use",
kpiAllChannel:"All Channels",kpiIntegDone:"Integration Complete",kpiProducts:"Collected Products",kpiOrders:"Total Orders",
kpiIntegChannels:"Integrated Channels",kpiTotalProducts:"Total Products",kpiTotalOrders:"Total Orders",kpiTotalRevenue:"Total Revenue",
groupGlobal:"Global Channels",groupJapan:"Japan Channels",groupDomestic:"Domestic Channels",
statusIntegrated:"Integrated",statusError:"Error",statusUntested:"Untested",statusNotConfig:"Not Configured",
authTitle:"API Key Registration",btnConnTest:"Connection Test",btnSaveSync:"Save & Sync",btnSync:"Sync",btnClose:"Close",btnAuthKey:"Enter API Key",btnRefresh:"Refresh",
savingProgress:"Saving...",integSuccess:"Integration success: {{products}} products, {{orders}} orders synced",integFail:"Integration failed. Check your credentials.",
demoSaveMsg:"Cannot save in demo mode",demoTestMsg:"Cannot test in demo mode",demoStatusMsg:"Cannot change status in demo mode",
planPro:"Pro Plan: Full integration for all channels",planFree:"Free Trial: Real data integration available with Pro subscription",
searchPlaceholder:"Search by product name or SKU...",allChannel:"All Channels",productCount:"{{n}} items",items:"{{n}} items",loading:"Loading...",noData:"No data available",
colChannel:"Channel",colId:"Product ID",colProductName:"Product Name",colSku:"SKU",colSalePrice:"Sale Price",colStock:"Stock",colCategory:"Category",colStatus:"Status",
colOrderNo:"Order No.",colBuyer:"Buyer",colProduct:"Product",colQuantity:"Qty",colAmount:"Amount",colCarrier:"Carrier",colOrderDate:"Order Date",
colAvailStock:"Available",colReserved:"Reserved",colWarehouse:"Warehouse",colSync:"Synced",colType:"Type",colRevenue:"Revenue",colRevenueShare:"Revenue Share",
statusConfirm:"Confirmed",statusShipPending:"Ready to Ship",statusShipping:"In Transit",statusDelivered:"Delivered",statusCancelReq:"Cancel Request",statusReturnRecv:"Return Received",
stockLow:"Low Stock",stockNormal:"Normal",overviewTitle:"Channel Overview",
autoSyncTitle:"Integration Hub Auto-Sync",autoSyncDesc:"API keys registered in Integration Hub are automatically reflected",autoSyncActive:"Auto-sync Active",autoSyncChannels:"Connected Channels",
guideTitle:"Omni-Channel User Guide",guideSub:"Complete guide to multi-channel commerce: from channel integration to inventory sync and order management.",guideStepsTitle:"6-Step Omni-Channel Guide",
guideStep1Title:"Register Channels",guideStep1Desc:"Click 'Enter API Key' for your desired sales channel in the Channel Integration tab. Register API keys for 13 channels — from global platforms like Shopify, Amazon, eBay, and TikTok Shop to domestic channels like Coupang and Naver Smartstore. Verify authentication instantly with connection testing.",
guideStep2Title:"Collect Products",guideStep2Desc:"Once connected, products from each channel are automatically collected in the Products tab. Product name, SKU, price, inventory, and category are managed in a unified view. Use channel filters and search to quickly find specific products.",
guideStep3Title:"Manage Orders",guideStep3Desc:"Manage all channel orders in one place via the Order Management tab. Change status from Confirmed → Ready to Ship → In Transit → Delivered, and handle cancellations/returns. Real-time sync with Order Hub via GlobalDataContext.",
guideStep4Title:"Sync Inventory",guideStep4Desc:"Monitor available stock, reserved stock, and warehouse info per channel in real-time. Low-stock items are highlighted in red for immediate attention. Integrated with WMS Manager for complete warehouse management.",
guideStep5Title:"Unified Dashboard",guideStep5Desc:"View all integrated channel KPIs at a glance in the Campaign Status tab: channel count, total products, orders, revenue, and per-channel revenue share charts. Compare channel performance to optimize your sales strategy.",
guideStep6Title:"Hub Integration",guideStep6Desc:"When API keys are registered in the Integration Hub, channels are automatically activated in Omni-Channel. No additional configuration needed — channel status syncs in real-time via GlobalDataContext, with all changes reflected instantly.",
guideTabsTitle:"Tab Features",guideDashName:"Channels",guideDashDesc:"API key registration",guideFeedName:"Products",guideFeedDesc:"Unified product view",guideTrendName:"Orders",guideTrendDesc:"Unified order management",guideSettingsName:"Inventory",guideSettingsDesc:"Real-time stock monitoring",guideGuideName:"Overview",guideGuideDesc:"Channel KPI dashboard",
guideTipsTitle:"Optimization Tips",guideTip1:"Run a connection test before saving API keys to prevent authentication errors proactively.",guideTip2:"Use low-stock alerts to replenish inventory before stockouts and prevent revenue loss.",guideTip3:"Analyze revenue share in the dashboard to focus marketing on high-revenue channels for maximum ROI.",guideTip4:"Order status changes sync instantly with other menus via GlobalDataContext — no manual refresh needed.",guideTip5:"Centralizing API key management in Integration Hub makes security management more convenient.",
},
ja:{
heroTitle:"マルチチャネル統合コマースハブ",heroDesc:"API認証キー登録で商品自動登録・注文/返品/配送リアルタイム収集・在庫同期",
badgeChannelCount:"{{n}}チャネル対応",badgeRegion:"国内·グローバル·日本",badgeProInteg:"Pro実連携",badgeFree:"無料体験",badgeOrderMgmt:"注文 {{n}}件管理中",
unifiedRevenue:"統合収集売上",warehouseStock:"倉庫在庫確認→",
tabChannels:"チャネル連携",tabChannelsDesc:"認証キー入力→同期",tabProducts:"収集商品",tabProductsDesc:"自動登録商品一覧",
tabOrders:"注文管理",tabOrdersDesc:"購入・返品・配送統合",tabInventory:"在庫状況",tabInventoryDesc:"チャネル別リアルタイム在庫",
tabOverview:"統合状況",tabOverviewDesc:"KPIダッシュボード",tabGuide:"ガイド",tabGuideDesc:"利用方法案内",
kpiAllChannel:"全チャネル",kpiIntegDone:"連携完了",kpiProducts:"収集商品",kpiOrders:"収集注文",
kpiIntegChannels:"連携チャネル数",kpiTotalProducts:"総商品数",kpiTotalOrders:"総注文数",kpiTotalRevenue:"総売上",
groupGlobal:"グローバルチャネル",groupJapan:"日本チャネル",groupDomestic:"国内チャネル",
statusIntegrated:"連携済み",statusError:"エラー",statusUntested:"未検証",statusNotConfig:"未設定",
authTitle:"認証キー登録",btnConnTest:"接続テスト",btnSaveSync:"保存＆同期",btnSync:"同期",btnClose:"閉じる",btnAuthKey:"認証キー入力",btnRefresh:"更新",
savingProgress:"保存中...",integSuccess:"連携成功: 商品{{products}}件、注文{{orders}}件同期",integFail:"連携失敗。認証情報を確認してください。",
demoSaveMsg:"体験モードでは保存できません",demoTestMsg:"体験モードではテストできません",demoStatusMsg:"体験モードでは変更できません",
planPro:"Proプラン: 全チャネル実連携可能",planFree:"無料体験: Pro契約時にデータ連携利用可能",
searchPlaceholder:"商品名またはSKU検索...",allChannel:"全チャネル",productCount:"計{{n}}件",items:"計{{n}}件",loading:"読み込み中...",noData:"データなし",
colChannel:"チャネル",colId:"商品ID",colProductName:"商品名",colSku:"SKU",colSalePrice:"販売価格",colStock:"在庫",colCategory:"カテゴリ",colStatus:"状態",
colOrderNo:"注文番号",colBuyer:"購入者",colProduct:"商品",colQuantity:"数量",colAmount:"金額",colCarrier:"配送業者",colOrderDate:"注文日",
colAvailStock:"利用可能",colReserved:"予約済み",colWarehouse:"倉庫",colSync:"同期",colType:"タイプ",colRevenue:"売上",colRevenueShare:"売上シェア",
statusConfirm:"注文確認",statusShipPending:"発送準備",statusShipping:"配送中",statusDelivered:"配送完了",statusCancelReq:"キャンセル",statusReturnRecv:"返品受付",
stockLow:"在庫不足",stockNormal:"正常",overviewTitle:"チャネル別総合状況",
autoSyncTitle:"連携ハブ自動同期",autoSyncDesc:"Integration HubのAPIキーが自動反映",autoSyncActive:"自動同期有効",autoSyncChannels:"連携チャネル",
guideTitle:"オムニチャネル利用ガイド",guideSub:"マルチチャネルコマースの完全ガイド",guideStepsTitle:"6ステップガイド",
guideStep1Title:"チャネル登録",guideStep1Desc:"チャネル連携タブで希望チャネルの認証キーを登録。13チャネル対応で接続テストで即時認証確認。",
guideStep2Title:"商品収集",guideStep2Desc:"連携完了後、各チャネルの商品が自動収集。商品名・SKU・価格・在庫を統合管理。",
guideStep3Title:"注文管理",guideStep3Desc:"全チャネルの注文を統合管理。状態変更はGlobalDataContextでOrder Hubとリアルタイム同期。",
guideStep4Title:"在庫同期",guideStep4Desc:"チャネル別の在庫をリアルタイム監視。在庫不足は赤色表示でWMS Managerと連携。",
guideStep5Title:"統合ダッシュボード",guideStep5Desc:"全連携チャネルのKPIを一覧表示。売上シェアチャートで最適な販売戦略を策定。",
guideStep6Title:"ハブ連携",guideStep6Desc:"Integration HubのAPIキー登録で自動的にチャネル有効化。追加設定不要でリアルタイム同期。",
guideTabsTitle:"タブ機能案内",guideDashName:"チャネル連携",guideDashDesc:"APIキー登録",guideFeedName:"収集商品",guideFeedDesc:"統合商品表示",guideTrendName:"注文管理",guideTrendDesc:"統合注文管理",guideSettingsName:"在庫状況",guideSettingsDesc:"リアルタイム在庫",guideGuideName:"統合状況",guideGuideDesc:"チャネルKPI",
guideTipsTitle:"最適化ヒント",guideTip1:"APIキー保存前に接続テストで認証エラーを事前防止。",guideTip2:"在庫不足アラートで品切れ前に補充し売上損失を防止。",guideTip3:"売上シェア分析で高収益チャネルにマーケティング集中。",guideTip4:"状態変更はGlobalDataContextで即時同期、手動更新不要。",guideTip5:"Integration HubでAPIキー一元管理しセキュリティ強化。",
},
zh:{
heroTitle:"多渠道统一商务中心",heroDesc:"API密钥注册即可自动上架商品·实时采集订单/退货/配送·库存同步",
badgeChannelCount:"支持{{n}}个渠道",badgeRegion:"国内·全球·日本",badgeProInteg:"Pro集成",badgeFree:"免费试用",badgeOrderMgmt:"管理{{n}}个订单",
unifiedRevenue:"统一收入",warehouseStock:"仓库库存→",
tabChannels:"渠道对接",tabChannelsDesc:"输入密钥→同步",tabProducts:"采集商品",tabProductsDesc:"自动注册商品",
tabOrders:"订单管理",tabOrdersDesc:"采购·退货·配送",tabInventory:"库存状态",tabInventoryDesc:"按渠道实时库存",
tabOverview:"综合状况",tabOverviewDesc:"KPI仪表板",tabGuide:"指南",tabGuideDesc:"使用方法",
kpiAllChannel:"全部渠道",kpiIntegDone:"对接完成",kpiProducts:"采集商品",kpiOrders:"采集订单",
kpiIntegChannels:"对接渠道",kpiTotalProducts:"总商品",kpiTotalOrders:"总订单",kpiTotalRevenue:"总营收",
groupGlobal:"全球渠道",groupJapan:"日本渠道",groupDomestic:"国内渠道",
statusIntegrated:"已对接",statusError:"错误",statusUntested:"未验证",statusNotConfig:"未配置",
authTitle:"API密钥注册",btnConnTest:"连接测试",btnSaveSync:"保存同步",btnSync:"同步",btnClose:"关闭",btnAuthKey:"输入密钥",btnRefresh:"刷新",
savingProgress:"保存中...",integSuccess:"对接成功: {{products}}个商品, {{orders}}个订单已同步",integFail:"对接失败，请检查认证信息",
demoSaveMsg:"演示模式无法保存",demoTestMsg:"演示模式无法测试",demoStatusMsg:"演示模式无法更改",
planPro:"Pro版: 所有渠道实时集成",planFree:"免费试用: Pro订阅后可用数据集成",
searchPlaceholder:"搜索商品名或SKU...",allChannel:"全部渠道",productCount:"共{{n}}条",items:"共{{n}}条",loading:"加载中...",noData:"暂无数据",
colChannel:"渠道",colId:"商品ID",colProductName:"商品名",colSku:"SKU",colSalePrice:"售价",colStock:"库存",colCategory:"分类",colStatus:"状态",
colOrderNo:"订单号",colBuyer:"买家",colProduct:"商品",colQuantity:"数量",colAmount:"金额",colCarrier:"承运商",colOrderDate:"下单日期",
colAvailStock:"可用库存",colReserved:"预留",colWarehouse:"仓库",colSync:"同步",colType:"类型",colRevenue:"营收",colRevenueShare:"营收占比",
statusConfirm:"已确认",statusShipPending:"待发货",statusShipping:"运输中",statusDelivered:"已送达",statusCancelReq:"取消申请",statusReturnRecv:"退货受理",
stockLow:"库存不足",stockNormal:"正常",overviewTitle:"渠道综合概览",
autoSyncTitle:"集成中心自动同步",autoSyncDesc:"集成中心注册的API密钥自动反映",autoSyncActive:"自动同步",autoSyncChannels:"已连接渠道",
guideTitle:"全渠道使用指南",guideSub:"多渠道商务集成完全指南",guideStepsTitle:"6步骤指南",
guideStep1Title:"渠道注册",guideStep1Desc:"在渠道对接中注册API密钥,支持13个渠道,连接测试即时验证。",
guideStep2Title:"商品采集",guideStep2Desc:"对接后自动采集商品,统一管理名称·SKU·价格·库存。",
guideStep3Title:"订单管理",guideStep3Desc:"统一管理全渠道订单,通过GlobalDataContext与Order Hub同步。",
guideStep4Title:"库存同步",guideStep4Desc:"实时监控各渠道库存,不足商品红色标注,与WMS联动。",
guideStep5Title:"统一仪表板",guideStep5Desc:"一览所有渠道KPI,含营收占比图表,制定最优销售策略。",
guideStep6Title:"中心联动",guideStep6Desc:"集成中心注册密钥后自动激活渠道,无需额外配置。",
guideTabsTitle:"功能介绍",guideDashName:"渠道对接",guideDashDesc:"API密钥注册",guideFeedName:"商品",guideFeedDesc:"统一商品视图",guideTrendName:"订单",guideTrendDesc:"统一订单管理",guideSettingsName:"库存",guideSettingsDesc:"实时库存监控",guideGuideName:"概览",guideGuideDesc:"渠道KPI面板",
guideTipsTitle:"优化建议",guideTip1:"保存前先测试连接,预防认证错误。",guideTip2:"利用库存不足提醒及时补货防止损失。",guideTip3:"分析营收占比集中投放高收益渠道。",guideTip4:"状态变更通过GlobalDataContext即时同步,无需刷新。",guideTip5:"在集成中心统一管理API密钥更安全便捷。",
}
};
FULL_KEYS['zh-TW']={...FULL_KEYS.zh,heroTitle:"多渠道統一商務中心",heroDesc:"API金鑰註冊即可自動上架商品·即時採集訂單/退貨/配送·庫存同步",tabGuide:"指南",guideTitle:"全渠道使用指南"};
FULL_KEYS.de={...FULL_KEYS.en,heroTitle:"Multi-Kanal Commerce Hub",tabGuide:"Anleitung",guideTitle:"Omni-Channel Benutzerhandbuch"};
FULL_KEYS.th={...FULL_KEYS.en,heroTitle:"ศูนย์กลางการค้าหลายช่องทาง",tabGuide:"คู่มือ",guideTitle:"คู่มือ Omni-Channel"};
FULL_KEYS.vi={...FULL_KEYS.en,heroTitle:"Trung tâm Thương mại Đa kênh",tabGuide:"Hướng dẫn",guideTitle:"Hướng dẫn Omni-Channel"};
FULL_KEYS.id={...FULL_KEYS.en,heroTitle:"Hub Perdagangan Multi-Saluran",tabGuide:"Panduan",guideTitle:"Panduan Omni-Channel"};

function findBlockEnd(code,startBrace){let d=0,s=false,e=false;for(let i=startBrace;i<code.length;i++){const c=code[i];if(e){e=false;continue}if(c==='\\'&&s){e=true;continue}if(s){if(c==='"')s=false;continue}if(c==='"'){s=true;continue}if(c==='{')d++;if(c==='}'){d--;if(d===0)return i}}return -1}

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  const keys=FULL_KEYS[lang]||FULL_KEYS.en;
  
  // Remove ALL existing omniChannel blocks
  let wpIdx=code.indexOf('omniChannel:{');
  while(wpIdx>=0){
    const braceStart=wpIdx+13;
    const braceEnd=findBlockEnd(code,braceStart);
    if(braceEnd<0)break;
    let rmStart=wpIdx;
    if(rmStart>0&&code[rmStart-1]===',')rmStart--;
    code=code.substring(0,rmStart)+code.substring(braceEnd+1);
    wpIdx=code.indexOf('omniChannel:{');
  }
  
  // Build new block
  const entries=Object.entries(keys).map(([k,v])=>`${k}:"${v.replace(/"/g,'\\"')}"`).join(',');
  const block=`omniChannel:{${entries}}`;
  
  // Insert before last }
  const lastBrace=code.lastIndexOf('}');
  code=code.substring(0,lastBrace)+','+block+code.substring(lastBrace);
  
  fs.writeFileSync(file,code,'utf8');
  try{
    const fn=new Function(code.replace('export default','return'));
    const o=fn();
    const oc=o.omniChannel||{};
    console.log(`✅ ${lang}: ${Object.keys(oc).length} keys, hero="${(oc.heroTitle||'').substring(0,30)}", guide=${!!oc.guideTitle}`);
  }catch(e){console.log(`❌ ${lang}: ${e.message.substring(0,80)}`)}
});
