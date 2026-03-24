// patch_en_wms_outer.cjs - en.js outer en.wms에 WmsManager 탭 키 추가
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'i18n', 'locales', 'en.js');
let content = fs.readFileSync(enPath, 'utf8');

// en.wms = {...}; 블록에서 마지막 "Actions\",\n};" 를 찾아서 탭 키 추가
const targetLine = '    warehouse: "Warehouse", status: "Status", actions: "Actions",\n};';
const replaceLine = '    warehouse: "Warehouse", status: "Status", actions: "Actions",\n    // ── WmsManager Tab Keys ──\n    tabWarehouse: "🏭 Warehouse", tabWarehouseDesc: "Register · Edit",\n    tabInOut: "📦 In·Out", tabInOutDesc: "Inbound · Outbound",\n    tabInventory: "📊 Inventory", tabInventoryDesc: "By SKU",\n    tabReceiving: "📝 Receiving", tabLot: "🔗 Lot/Expiry",\n    tabReplenishment: "⚡ Auto PO", tabCombine: "🎁 Kit/Bundle",\n    tabCombineDesc: "Combined Shipping", tabCarrier: "🚚 Carriers",\n    tabCarrierDesc: "Domestic · International", tabInvoice: "🧾 Invoice",\n    tabInvoiceDesc: "Auto-generate", tabBundle: "📦 Bundle·BOM",\n    tabSupplier: "🏢 Suppliers", tabAudit: "📋 Stock Count",\n    tabTracking: "🔍 Tracking", tabTrackingDesc: "Real-time",\n};';

// 이미 tabWarehouse 있는 지 확인
if (content.includes('tabWarehouse: "🏭 Warehouse"') && content.indexOf('tabWarehouse') !== content.lastIndexOf('tabWarehouse')) {
  console.log('tabWarehouse already added in outer wms, skipping');
} else if (content.includes(targetLine)) {
  content = content.replace(targetLine, replaceLine);
  console.log('Tab keys added to outer en.wms');
  fs.writeFileSync(enPath, content, 'utf8');
} else {
  // targetLine을 못 찾으면 다른 방법으로 찾기
  // "warehouse: "Warehouse", status: "Status", actions: "Actions"," 로 끝나는 en.wms 찾기
  const enWmsEnd = content.indexOf('\n    warehouse: "Warehouse", status: "Status", actions: "Actions",\n};');
  if (enWmsEnd >= 0) {
    const insertPos = content.indexOf('};\n', enWmsEnd) + 1; // }; 위치
    const before = content.substring(0, enWmsEnd + '\n    warehouse: "Warehouse", status: "Status", actions: "Actions",'.length);
    const middle = '\n    // ── WmsManager Tab Keys ──\n    tabWarehouse: "\ud83c\udfed Warehouse", tabWarehouseDesc: "Register · Edit",\n    tabInOut: "\ud83d\udce6 In·Out", tabInOutDesc: "Inbound · Outbound",\n    tabInventory: "\ud83d\udcca Inventory", tabInventoryDesc: "By SKU",\n    tabReceiving: "\ud83d\udcdd Receiving", tabLot: "\ud83d\udd17 Lot/Expiry",\n    tabReplenishment: "\u26a1 Auto PO", tabCombine: "\ud83c\udf81 Kit/Bundle",\n    tabCombineDesc: "Combined Shipping", tabCarrier: "\ud83d\ude9a Carriers",\n    tabCarrierDesc: "Domestic · International", tabInvoice: "\ud83e\uddfe Invoice",\n    tabInvoiceDesc: "Auto-generate", tabBundle: "\ud83d\udce6 Bundle·BOM",\n    tabSupplier: "\ud83c\udfe2 Suppliers", tabAudit: "\ud83d\udccb Stock Count",\n    tabTracking: "\ud83d\udd0d Tracking", tabTrackingDesc: "Real-time",';
    const after = content.substring(enWmsEnd + '\n    warehouse: "Warehouse", status: "Status", actions: "Actions",'.length);
    content = before + middle + after;
    fs.writeFileSync(enPath, content, 'utf8');
    console.log('Tab keys inserted via alternate method');
  } else {
    console.error('Could not find en.wms section. Please check manually.');
  }
}

// 검증
const updated = fs.readFileSync(enPath, 'utf8');
const hasTabWarehouse = updated.includes('tabWarehouse: "\ud83c\udfed Warehouse"');
console.log('Verification: tabWarehouse in outer en.wms:', hasTabWarehouse ? 'YES' : 'NO');
