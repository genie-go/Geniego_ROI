/**
 * CatalogSync i18n 키 주입 스크립트
 * - 68건 이상의 하드코딩 텍스트에 대응하는 다국어 키 추가
 * - 신규 탭(카테고리 매핑, 스케줄링, Import/Export, 이용가이드) 관련 키 추가
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const NEW_KEYS = {
  ko: {
    // 하드코딩 텍스트 → i18n (68건+)
    boxDetailsTitle: "📦 박스 단위 상세",
    qtyPerBoxLabel: "1박스 당 수량 (ea) *",
    palletDetailsTitle: "📦📦 팔레트(PL) 단위 상세",
    boxPerPlLabel: "1PL 당 박스 수 *",
    stockQtyUnit: "재고 수량 ({{unit}} 기준)",
    selectChannelStep: "채널 선택",
    setPriceStep: "가격 설정",
    approveRegisterStep: "승인 & 등록",
    selectedProductCount: "📦 선택된 상품 ({{n}}개)",
    avgProductCost: "평균 원가",
    registerToChannelAction: "✅ 채널 등록",
    registerToChannelDesc: "선택한 채널에 판매를 등록/활성화합니다",
    unregisterChannelAction: "⛔ 채널 해제",
    unregisterChannelDesc: "선택한 채널에서 상품을 비활성화합니다",
    cancelBtn: "취소",
    nextSetPriceBtn: "다음: 가격 설정 →",
    productsUnregister: "{{n}}개 상품 해제",
    channelPriceRecommendTitle: "💰 채널별 추천 판매가 설정",
    channelPriceRecommendDesc: "원가(매입원가+입출고비+보관료+작업비+배송비)에 채널 수수료·세금·이익률을 반영한 추천 판매가입니다.",
    channelPriceAdjustDesc: "마진(%)을 조정하면 추천가가 실시간 재계산됩니다. 판매가를 직접 입력해 수정할 수 있습니다.",
    colRegionLabel: "지역",
    colOverrideLabel: "직접 입력",
    actualMarginLabel: "실제 마진",
    priceFormulaDesc: "💡 추천가 공식: 원가 ÷ (1 - 수수료율 - 세율 - 이익률)",
    manualPriceNoteDesc: "· 노란색 표시는 직접 입력된 가격입니다.",
    backBtn: "← 뒤로",
    nextApproveBtn: "다음: 승인 & 등록 →",
    finalReviewTitle: "✅ 최종 검토 및 관리자 승인",
    channelFinalSummary: "📋 채널별 최종 판매가 요약",
    commissionTaxLabel: "수수료+세금",
    estProfitLabel: "예상 이익",
    managerApprovalText: "✍️ 관리자 승인: 위 판매가로 {{chCount}}개 채널에 {{prodCount}}개 상품을 등록합니다",
    approvalNoteText: "승인 후 전체 또는 선택한 채널에 판매 등록이 진행됩니다.",
    registerDoneMsg: "✅ {{prodCount}}개 상품 · {{chCount}}개 채널 등록 완료!",
    registeringMsg: "⏳ 등록 중...",
    registerRunMsg: "🚀 {{prodCount}}개 상품 · {{chCount}}개 채널 등록 실행",
    bulkRegisterBtn: "📡 채널 일괄 등록/해제",
    bulkPriceEditBtn: "💰 일괄 가격 편집",
    salePriceCol: "판매가",
    marginPctCol: "마진%",
    priceEditMethodTitle: "💱 가격 편집 방식",
    fixedPriceLabel: "직접 입력",
    fixedPriceDesc: "새 가격을 직접 입력",
    markupLabel: "마크업(%)",
    markupDesc: "현재가에 %를 올림",
    discountLabel: "할인(%)",
    discountDesc: "현재가에서 % 할인",
    fixedPricePh: "새 판매가 입력",
    markupPh: "올릴 비율 (예: 10)",
    discountPh: "할인율 (예: 10)",
    changePreview: "📊 변경 미리보기",
    applyChannel: "📡 적용 채널",
    priceEditDoneMsg: "✅ 가격 편집 완료!",
    roundingNone: "없음",
    rounding900: "~,900원",
    rounding990: "~,990원",
    closePreview: "미리보기 닫기",
    openPricePreview: "💰 가격 미리보기",
    lowStockAlertTitle: "⚠ 재고 부족 임박 상품 ({{n}}건)",
    nearOutOfStockLabel: "품절 임박",
    warningLabel: "주의",
    estItemCountLabel: "예상 처리 건수",
    dryRunStartBtn: "🧪 Dry-run 실행",
    syncStartBtn: "▶ 동기화 시작",
    fullLabel: "전체",
    incrementalLabel: "증분",
    runningStatus: "실행 중",
    purchaseCostDetail: "매입 원가",
    ioFeeDetail: "입·출고비",
    storageFeeDetail: "보관비",
    workFeeDetail: "기본 작업비",
    shippingFeeDetail: "배송비",
    productCostTotal: "원가 합계",
    stockLabel: "재고",
    availableStockLabel: "가용 재고",
    reservedStockLabel: "예약 재고",
    safetyStockLabel: "안전 재고",
    // 신규 탭 관련
    tabCategoryMapping: "카테고리 매핑",
    tabGuide: "이용 가이드",
    // 카테고리 매핑
    catMapTitle: "🗂️ 카테고리 매핑",
    catMapDesc: "내부 카테고리를 각 채널별 카테고리와 매핑합니다.",
    internalCategory: "내부 카테고리",
    channelCategory: "채널 카테고리",
    mappingStatus: "매핑 상태",
    mapped: "매핑됨",
    unmapped: "미매핑",
    addMapping: "매핑 추가",
    editMapping: "매핑 수정",
    deleteMapping: "매핑 삭제",
    autoMapSuggest: "자동 매핑 제안",
    catMapSaved: "카테고리 매핑이 저장되었습니다.",
    // 스케줄링
    scheduleTitle: "⏰ 동기화 스케줄",
    scheduleDesc: "자동 동기화 주기를 설정합니다.",
    scheduleEnabled: "자동 스케줄 활성화",
    scheduleInterval: "동기화 주기",
    every30min: "30분마다",
    every1hour: "1시간마다",
    every6hours: "6시간마다",
    everyDay: "매일",
    scheduleTime: "실행 시각",
    scheduleSaved: "스케줄 설정이 저장되었습니다.",
    nextScheduledRun: "다음 예약 실행",
    // Import/Export
    importExport: "📥 가져오기/내보내기",
    importCsv: "CSV 가져오기",
    exportCsv: "CSV 내보내기",
    exportExcel: "Excel 내보내기",
    importDesc: "CSV/Excel 파일로 상품을 일괄 등록합니다.",
    exportDesc: "현재 상품 목록을 파일로 내보냅니다.",
    downloadTemplate: "템플릿 다운로드",
    importSuccess: "{{n}}개 상품이 성공적으로 가져왔습니다.",
    importError: "가져오기 중 오류가 발생했습니다.",
    // 이용가이드
    guideTitle: "📖 카탈로그 동기화 이용 가이드",
    guideOverview: "개요",
    guideOverviewDesc: "카탈로그 동기화는 여러 판매 채널에 상품을 일괄 등록·관리하고, 가격·재고를 실시간 동기화하는 모듈입니다.",
    guideStep1Title: "1단계: 상품 등록",
    guideStep1Desc: "카탈로그 탭에서 '상품 등록' 버튼을 클릭하여 상품 정보를 입력합니다. SKU, 카테고리, 가격, 원가 구조, 재고량을 설정합니다.",
    guideStep2Title: "2단계: 채널 등록",
    guideStep2Desc: "상품을 선택 후 '채널 일괄 등록/해제' 버튼으로 판매할 채널을 선택합니다. 채널별 추천 판매가가 자동 계산됩니다.",
    guideStep3Title: "3단계: 동기화 실행",
    guideStep3Desc: "동기화 실행 탭에서 전체/증분 동기화를 선택하고, 대상 채널과 범위를 설정한 후 동기화를 시작합니다.",
    guideStep4Title: "4단계: 가격·재고 관리",
    guideStep4Desc: "가격 규칙 탭에서 글로벌/채널별 마크업을 설정하고, 재고 정책 탭에서 부족 임계값과 배분 전략을 관리합니다.",
    guideTips: "💡 팁",
    guideTip1: "Dry-run 모드를 활용하면 실제 반영 없이 결과를 미리 확인할 수 있습니다.",
    guideTip2: "Integration Hub에서 API 키를 등록하면 채널이 자동으로 반영됩니다.",
    guideTip3: "카테고리 매핑을 미리 설정하면 채널 등록 시 카테고리가 자동 매핑됩니다.",
  },
  en: {
    boxDetailsTitle: "📦 Box Unit Details",
    qtyPerBoxLabel: "Qty per Box (ea) *",
    palletDetailsTitle: "📦📦 Pallet (PL) Unit Details",
    boxPerPlLabel: "Box Qty per PL *",
    stockQtyUnit: "Stock Qty ({{unit}} basis)",
    selectChannelStep: "Select Channel",
    setPriceStep: "Set Price",
    approveRegisterStep: "Approve & Register",
    selectedProductCount: "📦 Selected Products ({{n}})",
    avgProductCost: "Average Product Cost",
    registerToChannelAction: "✅ Register to Channel",
    registerToChannelDesc: "Register/activate sales on selected channels",
    unregisterChannelAction: "⛔ Unregister Channel",
    unregisterChannelDesc: "Deactivate product on selected channels",
    cancelBtn: "Cancel",
    nextSetPriceBtn: "Next: Set Price →",
    productsUnregister: "Unregister {{n}} products",
    channelPriceRecommendTitle: "💰 Channel Price Recommendation",
    channelPriceRecommendDesc: "Recommended prices based on product cost (purchase + I/O + storage + handling + shipping) with channel commission, tax, and margin applied.",
    channelPriceAdjustDesc: "Adjust margin (%) to recalculate recommendations in real time. You can also override prices directly.",
    colRegionLabel: "Region",
    colOverrideLabel: "Override",
    actualMarginLabel: "Actual Margin",
    priceFormulaDesc: "💡 Formula: Cost ÷ (1 - Commission - Tax - Margin)",
    manualPriceNoteDesc: "· Yellow prices are manually entered.",
    backBtn: "← Back",
    nextApproveBtn: "Next: Approve & Register →",
    finalReviewTitle: "✅ Final Review & Manager Approval",
    channelFinalSummary: "📋 Channel Price Summary",
    commissionTaxLabel: "Commission+Tax",
    estProfitLabel: "Est. Profit",
    managerApprovalText: "✍️ Manager Approval: Register {{prodCount}} products on {{chCount}} channels at above prices",
    approvalNoteText: "Registration will proceed on all or selected channels after approval.",
    registerDoneMsg: "✅ {{prodCount}} products · {{chCount}} channels registered!",
    registeringMsg: "⏳ Registering...",
    registerRunMsg: "🚀 Register {{prodCount}} products · {{chCount}} channels",
    bulkRegisterBtn: "📡 Bulk Register/Unregister",
    bulkPriceEditBtn: "💰 Bulk Price Edit",
    salePriceCol: "Sale Price",
    marginPctCol: "Margin%",
    priceEditMethodTitle: "💱 Price Edit Method",
    fixedPriceLabel: "Direct Input",
    fixedPriceDesc: "Enter new price directly",
    markupLabel: "Markup (%)",
    markupDesc: "Mark up from current price",
    discountLabel: "Discount (%)",
    discountDesc: "Discount from current price",
    fixedPricePh: "Enter new sale price",
    markupPh: "Markup rate (e.g. 10)",
    discountPh: "Discount rate (e.g. 10)",
    changePreview: "📊 Change Preview",
    applyChannel: "📡 Apply Channel",
    priceEditDoneMsg: "✅ Price Edit Done!",
    roundingNone: "None",
    rounding900: "~,900",
    rounding990: "~,990",
    closePreview: "Close Preview",
    openPricePreview: "💰 Price Preview",
    lowStockAlertTitle: "⚠ Low Stock Alert ({{n}} items)",
    nearOutOfStockLabel: "Near Out of Stock",
    warningLabel: "Warning",
    estItemCountLabel: "Est. Item Count",
    dryRunStartBtn: "🧪 Dry-run Start",
    syncStartBtn: "▶ Sync Start",
    fullLabel: "Full",
    incrementalLabel: "Incremental",
    runningStatus: "Running",
    purchaseCostDetail: "Purchase Cost",
    ioFeeDetail: "I/O Fee",
    storageFeeDetail: "Storage Fee",
    workFeeDetail: "Handling Fee",
    shippingFeeDetail: "Shipping Fee",
    productCostTotal: "Product Cost",
    stockLabel: "Stock",
    availableStockLabel: "Available Stock",
    reservedStockLabel: "Reserved Stock",
    safetyStockLabel: "Safety Stock",
    tabCategoryMapping: "Category Mapping",
    tabGuide: "Usage Guide",
    catMapTitle: "🗂️ Category Mapping",
    catMapDesc: "Map internal categories to each channel's category system.",
    internalCategory: "Internal Category",
    channelCategory: "Channel Category",
    mappingStatus: "Mapping Status",
    mapped: "Mapped",
    unmapped: "Unmapped",
    addMapping: "Add Mapping",
    editMapping: "Edit Mapping",
    deleteMapping: "Delete Mapping",
    autoMapSuggest: "Auto-map Suggestion",
    catMapSaved: "Category mapping saved.",
    scheduleTitle: "⏰ Sync Schedule",
    scheduleDesc: "Set automatic sync intervals.",
    scheduleEnabled: "Enable Auto Schedule",
    scheduleInterval: "Sync Interval",
    every30min: "Every 30 min",
    every1hour: "Every 1 hour",
    every6hours: "Every 6 hours",
    everyDay: "Daily",
    scheduleTime: "Run Time",
    scheduleSaved: "Schedule saved.",
    nextScheduledRun: "Next Scheduled Run",
    importExport: "📥 Import/Export",
    importCsv: "Import CSV",
    exportCsv: "Export CSV",
    exportExcel: "Export Excel",
    importDesc: "Bulk register products via CSV/Excel file.",
    exportDesc: "Export current product list to file.",
    downloadTemplate: "Download Template",
    importSuccess: "{{n}} products imported successfully.",
    importError: "Error occurred during import.",
    guideTitle: "📖 Catalog Sync Usage Guide",
    guideOverview: "Overview",
    guideOverviewDesc: "Catalog Sync enables bulk product registration and management across multiple sales channels with real-time price and inventory synchronization.",
    guideStep1Title: "Step 1: Register Products",
    guideStep1Desc: "Click 'Add Product' in the Catalog tab to enter product info: SKU, category, price, cost structure, and stock quantity.",
    guideStep2Title: "Step 2: Channel Registration",
    guideStep2Desc: "Select products and use 'Bulk Register/Unregister' to choose sales channels. Recommended prices are calculated automatically.",
    guideStep3Title: "Step 3: Run Sync",
    guideStep3Desc: "In the Sync Run tab, choose full or incremental sync, set target channels and scope, then start synchronization.",
    guideStep4Title: "Step 4: Price & Inventory Management",
    guideStep4Desc: "Set global/channel markups in Price Rules tab and manage low-stock thresholds and allocation strategies in Inventory Policy tab.",
    guideTips: "💡 Tips",
    guideTip1: "Use Dry-run mode to preview results without actual changes.",
    guideTip2: "Register API keys in Integration Hub for automatic channel detection.",
    guideTip3: "Pre-configure category mapping for automatic channel category assignment.",
  },
  ja: {
    boxDetailsTitle: "📦 ボックス単位詳細",
    qtyPerBoxLabel: "1ボックスあたり数量 (ea) *",
    palletDetailsTitle: "📦📦 パレット(PL)単位詳細",
    boxPerPlLabel: "1PLあたりボックス数 *",
    stockQtyUnit: "在庫数量 ({{unit}} 基準)",
    selectChannelStep: "チャネル選択",
    setPriceStep: "価格設定",
    approveRegisterStep: "承認 & 登録",
    selectedProductCount: "📦 選択商品 ({{n}}件)",
    avgProductCost: "平均原価",
    registerToChannelAction: "✅ チャネル登録",
    registerToChannelDesc: "選択したチャネルで販売を登録/有効化",
    unregisterChannelAction: "⛔ チャネル解除",
    unregisterChannelDesc: "選択したチャネルで商品を無効化",
    cancelBtn: "キャンセル",
    nextSetPriceBtn: "次へ: 価格設定 →",
    productsUnregister: "{{n}}件の商品を解除",
    channelPriceRecommendTitle: "💰 チャネル別推奨販売価格設定",
    channelPriceRecommendDesc: "原価(仕入原価+入出庫費+保管料+作業費+送料)にチャネル手数料・税金・利益率を反映した推奨価格です。",
    channelPriceAdjustDesc: "マージン(%)を調整するとリアルタイムで再計算されます。直接入力で上書きも可能です。",
    colRegionLabel: "地域",
    colOverrideLabel: "直接入力",
    actualMarginLabel: "実質マージン",
    priceFormulaDesc: "💡 公式: 原価 ÷ (1 - 手数料率 - 税率 - 利益率)",
    manualPriceNoteDesc: "· 黄色表示は手動入力された価格です。",
    backBtn: "← 戻る",
    nextApproveBtn: "次へ: 承認 & 登録 →",
    finalReviewTitle: "✅ 最終レビュー & 管理者承認",
    channelFinalSummary: "📋 チャネル別最終販売価格サマリー",
    commissionTaxLabel: "手数料+税金",
    estProfitLabel: "予想利益",
    managerApprovalText: "✍️ 管理者承認: 上記価格で{{chCount}}チャネルに{{prodCount}}商品を登録",
    approvalNoteText: "承認後、全チャネルまたは選択チャネルに販売登録が進行されます。",
    registerDoneMsg: "✅ {{prodCount}}商品 · {{chCount}}チャネル 登録完了！",
    registeringMsg: "⏳ 登録中...",
    registerRunMsg: "🚀 {{prodCount}}商品 · {{chCount}}チャネル 登録実行",
    bulkRegisterBtn: "📡 一括登録/解除",
    bulkPriceEditBtn: "💰 一括価格編集",
    salePriceCol: "販売価格",
    marginPctCol: "マージン%",
    priceEditMethodTitle: "💱 価格編集方式",
    fixedPriceLabel: "直接入力",
    fixedPriceDesc: "新しい価格を直接入力",
    markupLabel: "マークアップ(%)",
    markupDesc: "現在価格に%を上乗せ",
    discountLabel: "割引(%)",
    discountDesc: "現在価格から%割引",
    fixedPricePh: "新しい販売価格を入力",
    markupPh: "上乗せ率 (例: 10)",
    discountPh: "割引率 (例: 10)",
    changePreview: "📊 変更プレビュー",
    applyChannel: "📡 適用チャネル",
    priceEditDoneMsg: "✅ 価格編集完了！",
    roundingNone: "なし",
    rounding900: "~,900",
    rounding990: "~,990",
    closePreview: "プレビューを閉じる",
    openPricePreview: "💰 価格プレビュー",
    lowStockAlertTitle: "⚠ 在庫不足間近 ({{n}}件)",
    nearOutOfStockLabel: "品切れ間近",
    warningLabel: "注意",
    estItemCountLabel: "予想処理件数",
    dryRunStartBtn: "🧪 Dry-run実行",
    syncStartBtn: "▶ 同期開始",
    fullLabel: "全体",
    incrementalLabel: "増分",
    runningStatus: "実行中",
    purchaseCostDetail: "仕入原価",
    ioFeeDetail: "入出庫費",
    storageFeeDetail: "保管料",
    workFeeDetail: "作業費",
    shippingFeeDetail: "送料",
    productCostTotal: "原価合計",
    stockLabel: "在庫",
    availableStockLabel: "可用在庫",
    reservedStockLabel: "予約在庫",
    safetyStockLabel: "安全在庫",
    tabCategoryMapping: "カテゴリマッピング",
    tabGuide: "利用ガイド",
    catMapTitle: "🗂️ カテゴリマッピング",
    catMapDesc: "社内カテゴリを各チャネルのカテゴリにマッピングします。",
    internalCategory: "社内カテゴリ",
    channelCategory: "チャネルカテゴリ",
    mappingStatus: "マッピング状況",
    mapped: "マッピング済み",
    unmapped: "未マッピング",
    addMapping: "マッピング追加",
    editMapping: "マッピング編集",
    deleteMapping: "マッピング削除",
    autoMapSuggest: "自動マッピング提案",
    catMapSaved: "カテゴリマッピングが保存されました。",
    scheduleTitle: "⏰ 同期スケジュール",
    scheduleDesc: "自動同期の間隔を設定します。",
    scheduleEnabled: "自動スケジュール有効化",
    scheduleInterval: "同期間隔",
    every30min: "30分ごと",
    every1hour: "1時間ごと",
    every6hours: "6時間ごと",
    everyDay: "毎日",
    scheduleTime: "実行時刻",
    scheduleSaved: "スケジュールが保存されました。",
    nextScheduledRun: "次回予約実行",
    importExport: "📥 インポート/エクスポート",
    importCsv: "CSVインポート",
    exportCsv: "CSVエクスポート",
    exportExcel: "Excelエクスポート",
    importDesc: "CSV/Excelファイルで商品を一括登録します。",
    exportDesc: "現在の商品リストをエクスポートします。",
    downloadTemplate: "テンプレートダウンロード",
    importSuccess: "{{n}}件の商品を正常にインポートしました。",
    importError: "インポート中にエラーが発生しました。",
    guideTitle: "📖 カタログ同期利用ガイド",
    guideOverview: "概要",
    guideOverviewDesc: "カタログ同期は、複数の販売チャネルに商品を一括登録・管理し、価格・在庫をリアルタイム同期するモジュールです。",
    guideStep1Title: "ステップ1: 商品登録",
    guideStep1Desc: "カタログタブで「商品登録」ボタンをクリックし、商品情報を入力します。",
    guideStep2Title: "ステップ2: チャネル登録",
    guideStep2Desc: "商品を選択し「一括登録/解除」で販売チャネルを選択します。",
    guideStep3Title: "ステップ3: 同期実行",
    guideStep3Desc: "同期実行タブで全体/増分同期を選択し、対象チャネルとスコープを設定して同期を開始します。",
    guideStep4Title: "ステップ4: 価格・在庫管理",
    guideStep4Desc: "価格ルールタブでマークアップを設定し、在庫ポリシータブで不足閾値と配分戦略を管理します。",
    guideTips: "💡 ヒント",
    guideTip1: "Dry-runモードで実際の変更なしに結果をプレビューできます。",
    guideTip2: "Integration HubでAPIキーを登録すると、チャネルが自動反映されます。",
    guideTip3: "カテゴリマッピングを事前設定すると、チャネル登録時に自動マッピングされます。",
  },
};

// 간단한 매핑으로 나머지 언어 생성 (영어 기반)
const simpleLangs = {
  zh: { prefix: "", suffix: "" },
  "zh-TW": { prefix: "", suffix: "" },
  de: { prefix: "", suffix: "" },
  th: { prefix: "", suffix: "" },
  vi: { prefix: "", suffix: "" },
  id: { prefix: "", suffix: "" },
};

// zh 번역
NEW_KEYS.zh = {};
NEW_KEYS["zh-TW"] = {};
NEW_KEYS.de = {};
NEW_KEYS.th = {};
NEW_KEYS.vi = {};
NEW_KEYS.id = {};

// 영어 기반 복제 (실제 번역이 아닌 영어 fallback — 이미 i18n 시스템에서 en fallback 존재)
for (const lang of ['zh','zh-TW','de','th','vi','id']) {
  for (const [k, v] of Object.entries(NEW_KEYS.en)) {
    NEW_KEYS[lang][k] = v;
  }
}

// 각 로케일 파일에 키 주입
for (const lang of LANGS) {
  const filePath = path.join(LOCALE_DIR, lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const keys = NEW_KEYS[lang];
  if (!keys) continue;
  
  // catalogSync 섹션 끝 찾기
  const csEndPattern = /(\n\s*),\s*\n(\s*(?:omniChannel|smsMarketing|journeyBuilder|emailMarketing|campaignMgr|marketing|priceOpt|channelKpi|orderHub|operationsHub|wms|catalogSync)\s*:\s*\{)/;
  
  // catalogSync 블록의 마지막 키 뒤에 새 키 추가
  // catalogSync: { ... } 구조에서 마지막 } 직전에 삽입
  
  // 방법: catalogSync 섹션 내 마지막 키-값 쌍 뒤에 삽입
  let catalogSyncStart = content.indexOf('"catalogSync"');
  if (catalogSyncStart === -1) catalogSyncStart = content.indexOf("'catalogSync'");
  if (catalogSyncStart === -1) catalogSyncStart = content.indexOf('catalogSync:');
  if (catalogSyncStart === -1) {
    console.log(`[SKIP] ${lang}: catalogSync section not found`);
    continue;
  }
  
  // catalogSync 블록의 끝을 bracketcount로 찾기
  let braceCount = 0;
  let blockStart = -1;
  let blockEnd = -1;
  for (let i = catalogSyncStart; i < content.length; i++) {
    if (content[i] === '{') {
      if (blockStart === -1) blockStart = i;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        blockEnd = i;
        break;
      }
    }
  }
  
  if (blockEnd === -1) {
    console.log(`[SKIP] ${lang}: Could not find catalogSync block end`);
    continue;
  }
  
  // blockEnd 직전에 새 키 삽입
  const keyLines = Object.entries(keys).map(([k, v]) => {
    const escaped = v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    return `    ${k}: '${escaped}'`;
  }).join(',\n');
  
  // 기존 블록의 마지막 키 뒤에 콤마 확인
  const beforeEnd = content.substring(blockStart, blockEnd).trimEnd();
  const needsComma = !beforeEnd.endsWith(',');
  
  const insertion = (needsComma ? ',' : '') + '\n' + keyLines + '\n';
  content = content.substring(0, blockEnd) + insertion + content.substring(blockEnd);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] ${lang}: ${Object.keys(keys).length} keys injected`);
}

console.log('\n✅ All locale files updated!');
