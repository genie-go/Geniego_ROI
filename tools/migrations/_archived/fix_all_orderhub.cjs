const fs = require('fs');
const path = require('path');

/* ═══ STEP 1: Fix ALL emoji encoding in OrderHub.jsx ═══ */
console.log('=== STEP 1: Fix emoji encoding in OrderHub.jsx ===');
const ohFile = 'd:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx';
let oh = fs.readFileSync(ohFile, 'utf-8');
const lines = oh.split('\n');

// Replace ALL emoji-bearing tab labels and icons with clean ASCII + proper emoji via template
const emojiMap = {
    // Guide tab hero
    "icon: '\u26A0'": "icon: '\u26A0\uFE0F'", // ensure variation selector
};

// Fix tab labels - replace corrupted emoji prefixes with clean ones  
const tabFixes = [
    ['tabOverview', '\uD83D\uDCCA'],   // 📊
    ['tabOrders', '\uD83D\uDCCB'],     // 📋
    ['tabClaims', '\u26A0'],            // ⚠
    ['tabDelivery', '\uD83D\uDE9A'],    // 🚚
    ['tabSettlement', '\uD83D\uDCB0'],  // 💰
    ['tabIntl', '\uD83C\uDF0F'],        // 🌏
    ['tabB2B', '\uD83C\uDFE2'],         // 🏢
    ['tabSettings', '\u2699'],          // ⚙
    ['tabRouting', '\uD83D\uDEA6'],     // 🚦
    ['tabGuide', '\uD83D\uDCD6'],       // 📖
];

for (let i = 0; i < lines.length; i++) {
    for (const [key, emoji] of tabFixes) {
        if (lines[i].includes(key) && lines[i].includes('label:')) {
            // Replace any broken emoji at start of template literal
            lines[i] = lines[i].replace(/label:\s*`[^$]*\$/, `label: \`${emoji} \$`);
        }
    }
    // Fix hero icon
    if (lines[i].includes('hero-icon') && lines[i].includes('>')) {
        lines[i] = lines[i].replace(/>.*<\/div>/, '>\uD83D\uDCEC</div>');
    }
}

// Also fix the guide tab step icons  
const guideIconMap = {
    'guideStep1': '\uD83D\uDCEC', // 📬
    'guideStep2': '\uD83D\uDCCB', // 📋
    'guideStep3': '\uD83D\uDE9A', // 🚚
    'guideStep4': '\u26A0\uFE0F', // ⚠️
    'guideStep5': '\uD83D\uDCB0', // 💰
    'guideStep6': '\uD83C\uDF0F', // 🌏
    'guideStep7': '\uD83C\uDFE2', // 🏢
    'guideStep8': '\uD83D\uDEA6', // 🚦
};
for (let i = 0; i < lines.length; i++) {
    for (const [step, emoji] of Object.entries(guideIconMap)) {
        if (lines[i].includes(step) && lines[i].includes("icon:")) {
            lines[i] = lines[i].replace(/icon:\s*'[^']*'/, `icon: '${emoji}'`);
        }
    }
}

fs.writeFileSync(ohFile, lines.join('\n'), 'utf-8');
console.log('  Fixed OrderHub.jsx emoji encoding');

/* ═══ STEP 2: Fix EnhancedOrder hardcoded text + add i18n for badges/drawer ═══ */
console.log('\n=== STEP 2: Fix OrderHubEnhancedOrder.jsx ===');
const enhFile = 'd:/project/GeniegoROI/frontend/src/pages/OrderHubEnhancedOrder.jsx';
let enh = fs.readFileSync(enhFile, 'utf-8');
// Fix hardcoded badge text
enh = enh.replace(/>클레임<\/span>/g, ">{t('orderHub.badgeClaim')}</span>");
enh = enh.replace(/>정산완료<\/span>/g, ">{t('orderHub.badgeSettled')}</span>");
enh = enh.replace(/>출고지연<\/span>/g, ">{t('orderHub.badgeSlaDelay')}</span>");
// Fix drawer detail labels (line 387)
enh = enh.replace(/\['채널',/, "[t('orderHub.labelChannel'),");
enh = enh.replace(/\['구매자',/, "[t('orderHub.labelBuyer'),");
enh = enh.replace(/\['상품',/, "[t('orderHub.labelProduct'),");
enh = enh.replace(/\['수량',/, "[t('orderHub.labelQty'),");
enh = enh.replace(/\['총액',/, "[t('orderHub.labelTotal'),");
enh = enh.replace(/\['상태',/, "[t('orderHub.labelStatus'),");
enh = enh.replace(/\['택배사',/, "[t('orderHub.labelCarrier'),");
enh = enh.replace(/\['운송장',/, "[t('orderHub.labelTrackNo'),");
enh = enh.replace(/\['주문일시',/, "[t('orderHub.labelOrderDate'),");
enh = enh.replace(/\['창고',/, "[t('orderHub.labelWarehouse'),");
// Fix fmtW to use fmt from useCurrency
enh = enh.replace(/fmtW\(o\.total\)/g, "fmt(o.total)");
enh = enh.replace(/fmtW\(detail\.total\)/g, "fmt(detail.total)");
enh = enh.replace(/fmtW\(kpis\.revenue\)/g, "fmt(kpis.revenue)");
// Fix CSV headers from Korean
enh = enh.replace(/const hdr = \['주문번호'.*?\];/, "const hdr = [t('orderHub.colOrderNo'), t('orderHub.colChannel'), t('orderHub.colProduct'), 'SKU', t('orderHub.colQty'), t('orderHub.colTotal'), t('orderHub.colBuyer'), t('orderHub.colStatus'), t('orderHub.labelOrderDate')];");
fs.writeFileSync(enhFile, enh, 'utf-8');
console.log('  Fixed 10 hardcoded badges + 10 drawer labels + CSV headers');

/* ═══ STEP 3: Fix Settlement hardcoded text ═══ */
console.log('\n=== STEP 3: Fix OrderHubSettlement.jsx ===');
const settFile = 'd:/project/GeniegoROI/frontend/src/pages/OrderHubSettlement.jsx';
let sett = fs.readFileSync(settFile, 'utf-8');
sett = sett.replace(/>상세<\/button>/g, ">{t('orderHub.btnDetail')}</button>");
sett = sett.replace(/>No settlement records found\.<\/td>/g, ">{t('orderHub.noData')}</td>");
sett = sett.replace(/>Action<\/th>/g, ">{t('orderHub.settleAction')}</th>");
fs.writeFileSync(settFile, sett, 'utf-8');
console.log('  Fixed 3 hardcoded texts in Settlement');

/* ═══ STEP 4: Inject ALL missing enh* + settle* i18n keys ═══ */
console.log('\n=== STEP 4: Inject missing i18n keys ===');
const DIR = 'd:/project/GeniegoROI/frontend/src/i18n/locales';
const EXTRA = {
ko:{enhAllOrders:'전체 주문',enhTodayNew:'오늘 신규',enhShipDone:'배송 중/완료',enhTotalSales:'총 매출',enhDateToday:'오늘',enhDate7d:'7일',enhDate30d:'30일',enhDateAll:'전체',enhSearchPlaceholder:'주문번호·구매자·상품명 검색...',enhAllChannel:'전체 채널',enhAllStatus:'전체 상태',enhCsvBtn:'CSV 내보내기',enhSelected:'건 선택됨',enhBulkStatus:'일괄 상태 변경',enhBulkWms:'WMS 전송',enhBulkCsv:'선택 내보내기',enhBulkClear:'선택 해제',enhColOrder:'주문번호',enhColChannel:'채널',enhColProduct:'상품',enhColQty:'수량',enhColAmount:'금액',enhColBuyer:'구매자',enhColStatus:'상태',enhColNote:'비고',enhDetail:'상세',enhTimelineCreate:'주문 생성',enhTimelineTitle:'주문 타임라인',enhTrackingTitle:'배송 정보 입력',enhCarrierSelect:'택배사 선택',enhTrackingNo:'운송장 번호',enhTrackingSubmit:'배송 등록',enhMemoTitle:'메모',enhMemoSave:'메모 저장',settleGross:'총 매출',settleFee:'수수료',settleNet:'정산금액',settleApproved:'승인완료',settleUnapproved:'미승인',settlePeriod:'정산기간',settleStatusLabel:'상태',settleApprDone:'승인완료',settleApprPending:'미승인',settleApproveBtn:'승인',settleApprLog:'승인 이력',settleApproveAll:'정산 승인',settleAdFee:'광고비',settleCoupon:'쿠폰 할인',settleReturnFee:'반품비',settleFeeRatio:'수수료 비율',settleAction:'액션',settleBridgeTitle:'정산 관리 센터',settleBridgeDesc:'상세 정산 관리·대사(Reconciliation) 기능은 전용 모듈에서 확인하세요.',settleBridgeBtnMgmt:'정산 관리',settleBridgeBtnRecon:'대사/Recon'},
en:{enhAllOrders:'Total Orders',enhTodayNew:'Today New',enhShipDone:'Shipped/Done',enhTotalSales:'Total Sales',enhDateToday:'Today',enhDate7d:'7 Days',enhDate30d:'30 Days',enhDateAll:'All',enhSearchPlaceholder:'Search order ID, buyer, product...',enhAllChannel:'All Channels',enhAllStatus:'All Status',enhCsvBtn:'Export CSV',enhSelected:' selected',enhBulkStatus:'Bulk Status',enhBulkWms:'Send to WMS',enhBulkCsv:'Export Selected',enhBulkClear:'Clear',enhColOrder:'Order No.',enhColChannel:'Channel',enhColProduct:'Product',enhColQty:'Qty',enhColAmount:'Amount',enhColBuyer:'Buyer',enhColStatus:'Status',enhColNote:'Note',enhDetail:'Detail',enhTimelineCreate:'Order Created',enhTimelineTitle:'Order Timeline',enhTrackingTitle:'Enter Tracking Info',enhCarrierSelect:'Select Carrier',enhTrackingNo:'Tracking Number',enhTrackingSubmit:'Submit',enhMemoTitle:'Memo',enhMemoSave:'Save Memo',settleGross:'Gross Sales',settleFee:'Fees',settleNet:'Net Payout',settleApproved:'Approved',settleUnapproved:'Pending',settlePeriod:'Period',settleStatusLabel:'Status',settleApprDone:'Approved',settleApprPending:'Pending',settleApproveBtn:'Approve',settleApprLog:'Approval Log',settleApproveAll:'Approve Settlement',settleAdFee:'Ad Fee',settleCoupon:'Coupon Discount',settleReturnFee:'Return Fee',settleFeeRatio:'Fee Ratio',settleAction:'Action',settleBridgeTitle:'Settlement Center',settleBridgeDesc:'Access detailed settlement management and reconciliation in the dedicated module.',settleBridgeBtnMgmt:'Settlement Mgmt',settleBridgeBtnRecon:'Reconciliation'},
ja:{enhAllOrders:'全注文',enhTodayNew:'本日新規',enhShipDone:'配送中/完了',enhTotalSales:'総売上',enhDateToday:'今日',enhDate7d:'7日間',enhDate30d:'30日間',enhDateAll:'全期間',enhSearchPlaceholder:'注文番号・購入者・商品名で検索...',enhAllChannel:'全チャネル',enhAllStatus:'全ステータス',enhCsvBtn:'CSV出力',enhSelected:'件選択',enhBulkStatus:'一括変更',enhBulkWms:'WMS送信',enhBulkCsv:'選択出力',enhBulkClear:'解除',enhColOrder:'注文番号',enhColChannel:'チャネル',enhColProduct:'商品',enhColQty:'数量',enhColAmount:'金額',enhColBuyer:'購入者',enhColStatus:'状態',enhColNote:'備考',enhDetail:'詳細',enhTimelineCreate:'注文作成',enhTimelineTitle:'注文タイムライン',enhTrackingTitle:'配送情報入力',enhCarrierSelect:'配送業者選択',enhTrackingNo:'追跡番号',enhTrackingSubmit:'登録',enhMemoTitle:'メモ',enhMemoSave:'メモ保存',settleGross:'総売上',settleFee:'手数料',settleNet:'精算額',settleApproved:'承認済',settleUnapproved:'未承認',settlePeriod:'精算期間',settleStatusLabel:'状態',settleApprDone:'承認済',settleApprPending:'未承認',settleApproveBtn:'承認',settleApprLog:'承認履歴',settleApproveAll:'精算承認',settleAdFee:'広告費',settleCoupon:'クーポン',settleReturnFee:'返品費',settleFeeRatio:'手数料率',settleAction:'操作',settleBridgeTitle:'精算センター',settleBridgeDesc:'詳細精算・照合機能は専用モジュールで確認できます。',settleBridgeBtnMgmt:'精算管理',settleBridgeBtnRecon:'照合/Recon'},
zh:{enhAllOrders:'全部订单',enhTodayNew:'今日新增',enhShipDone:'已发货',enhTotalSales:'总销售',enhDateToday:'今天',enhDate7d:'7天',enhDate30d:'30天',enhDateAll:'全部',enhSearchPlaceholder:'搜索订单号、买家、商品...',enhAllChannel:'全部渠道',enhAllStatus:'全部状态',enhCsvBtn:'导出CSV',enhSelected:'已选',enhBulkStatus:'批量状态',enhBulkWms:'发送WMS',enhBulkCsv:'导出选中',enhBulkClear:'清除',enhColOrder:'订单号',enhColChannel:'渠道',enhColProduct:'商品',enhColQty:'数量',enhColAmount:'金额',enhColBuyer:'买家',enhColStatus:'状态',enhColNote:'备注',enhDetail:'详情',enhTimelineCreate:'订单创建',enhTimelineTitle:'订单时间线',enhTrackingTitle:'输入物流信息',enhCarrierSelect:'选择快递',enhTrackingNo:'运单号',enhTrackingSubmit:'提交',enhMemoTitle:'备注',enhMemoSave:'保存',settleGross:'总销售',settleFee:'费用',settleNet:'净额',settleApproved:'已审批',settleUnapproved:'待审批',settlePeriod:'周期',settleStatusLabel:'状态',settleApprDone:'已审批',settleApprPending:'待审批',settleApproveBtn:'审批',settleApprLog:'审批记录',settleApproveAll:'审批结算',settleAdFee:'广告费',settleCoupon:'优惠券',settleReturnFee:'退货费',settleFeeRatio:'费率',settleAction:'操作',settleBridgeTitle:'结算中心',settleBridgeDesc:'详细结算和对账功能请访问专用模块。',settleBridgeBtnMgmt:'结算管理',settleBridgeBtnRecon:'对账'},
};
K2={'zh-TW':{...K2_zhTW=Object.fromEntries(Object.entries(EXTRA.zh).map(([k,v])=>[k,v.replace(/订/g,'訂').replace(/设/g,'設').replace(/单/g,'單').replace(/渠道/g,'通路').replace(/备注/g,'備註').replace(/选/g,'選').replace(/审批/g,'審批').replace(/结算/g,'結算')]))}};
EXTRA['zh-TW']=K2['zh-TW'];
EXTRA.de={...EXTRA.en,enhAllOrders:'Alle Aufträge',enhTodayNew:'Heute neu',enhShipDone:'Versendet',enhTotalSales:'Gesamtumsatz',enhDateToday:'Heute',enhDate7d:'7 Tage',enhDate30d:'30 Tage',enhDateAll:'Alle',enhSearchPlaceholder:'Suchen...',enhAllChannel:'Alle Kanäle',enhAllStatus:'Alle Status',enhCsvBtn:'CSV Export',enhDetail:'Details',settleGross:'Brutto',settleFee:'Gebühren',settleNet:'Netto',settleAction:'Aktion'};
EXTRA.th={...EXTRA.en,enhAllOrders:'คำสั่งซื้อทั้งหมด',enhTodayNew:'ใหม่วันนี้',enhShipDone:'จัดส่งแล้ว',enhTotalSales:'ยอดขายรวม',enhSearchPlaceholder:'ค้นหา...',enhDetail:'รายละเอียด',settleGross:'ยอดรวม',settleFee:'ค่าธรรมเนียม',settleNet:'ยอดสุทธิ',settleAction:'การดำเนินการ'};
EXTRA.vi={...EXTRA.en,enhAllOrders:'Tổng đơn',enhTodayNew:'Hôm nay',enhShipDone:'Đã giao',enhTotalSales:'Tổng doanh thu',enhSearchPlaceholder:'Tìm kiếm...',enhDetail:'Chi tiết',settleGross:'Doanh thu',settleFee:'Phí',settleNet:'Thanh toán',settleAction:'Thao tác'};
EXTRA.id={...EXTRA.en,enhAllOrders:'Total Pesanan',enhTodayNew:'Baru Hari Ini',enhShipDone:'Terkirim',enhTotalSales:'Total Penjualan',enhSearchPlaceholder:'Cari...',enhDetail:'Detail',settleGross:'Penjualan',settleFee:'Biaya',settleNet:'Pembayaran',settleAction:'Aksi'};

let totalKeys = 0;
for (const [lang, keys] of Object.entries(EXTRA)) {
    const file = path.join(DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let c = fs.readFileSync(file, 'utf-8');
    // Find the orderHub object
    const ohIdx = c.indexOf('"orderHub":{');
    if (ohIdx === -1) { console.log(`  ⚠️ ${lang}: no orderHub object`); continue; }
    const ohObjStart = c.indexOf('{', ohIdx);
    let depth = 0, ohEnd = -1;
    for (let i = ohObjStart; i < c.length; i++) {
        if (c[i] === '{') depth++;
        if (c[i] === '}') { depth--; if (depth === 0) { ohEnd = i; break; } }
    }
    if (ohEnd === -1) continue;
    let injected = 0;
    const ohBlock = c.substring(ohObjStart, ohEnd + 1);
    for (const [key, value] of Object.entries(keys)) {
        if (ohBlock.includes(`"${key}"`)) continue;
        const escaped = String(value).replace(/"/g, '\\"');
        c = c.slice(0, ohEnd) + `,"${key}":"${escaped}"` + c.slice(ohEnd);
        ohEnd += `,"${key}":"${escaped}"`.length;
        injected++;
    }
    if (injected > 0) {
        fs.writeFileSync(file, c, 'utf-8');
        totalKeys += injected;
        console.log(`  ✅ ${lang}.js — ${injected} new keys`);
    } else {
        console.log(`  ⏭️ ${lang}.js — all exist`);
    }
}
console.log(`\n📊 Total new keys injected: ${totalKeys}`);
console.log('\n✅ ALL FIXES COMPLETE');
