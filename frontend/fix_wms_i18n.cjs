const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
// Visible UI keys that need native translation per language
const T={
zh:{wmsHeroTitle:"WMS 仓库统一管理",wmsHeroDesc:"仓库注册·出入库·库存管理·捆绑·快递/特快·商业发票管理",
wmsAssetValue:"库存资产总值",wmsBadgeWh:"个仓库",wmsBadgeCarrier:"个快递/特快",wmsBadgeSku:"个SKU",wmsBadgeTotalStock:"总库存",wmsBadgeLowStock:"低库存",wmsBadgeOrders:"已关联订单",
wmsBtnSalesChannel:"销售渠道 →",wmsBtnBudget:"预算规划 →",
tabWarehouse:"WMS 仓库",tabWarehouseDesc:"库存·出入库·按仓库",tabInOut:"出入库",tabInOutDesc:"入库/出库",tabInventory:"库存状况",tabInventoryDesc:"按渠道实时库存",tabReceiving:"入库验收",tabReceivingDesc:"采购订单",tabPicking:"拣货/包装",tabPickingDesc:"同步",tabLot:"批次/保质期",tabLotDesc:"保质期",tabReplenishment:"自动采购",tabReplenishmentDesc:"自动PO",tabCarrier:"运输公司",tabCarrierDesc:"国内/国际",tabCombine:"合并包装",tabCombineDesc:"合并发货",tabTracking:"物流追踪",tabTrackingDesc:"实时",tabAudit:"库存盘点",tabAuditDesc:"库存盘点",tabInvoice:"发票",tabInvoiceDesc:"自动生成",tabBundle:"捆绑/BOM",tabBundleDesc:"BOM",tabGuide:"使用指南",tabGuideDesc:"使用方法",tabSupplier:"供应商",tabSupplierDesc:"供应商",
invTableTitle:"SKU别仓库库存现况",invColSku:"SKU",invColProduct:"商品名",invColTotal:"合计",invColSafe:"安全库存",invColStatus:"状态",invColCost:"成本",invColValue:"库存价值",invColAdj:"调整",
invSearchPh:"搜索SKU或商品名...",invLowOnly:"仅显示低库存",invNoResult:"无搜索结果",invNormal:"正常",invLow:"低库存",invOutOfStock:"缺货",invTotalStock:"总库存",invAdjTitle:"库存调整",invAdjQty:"调整数量",invAdjApply:"应用",invAdjBtn:"调整",invDemoAdj:"演示模式下无法调整库存",
ioColType:"类型",ioColWh:"仓库",ioColSku:"SKU",ioColProduct:"商品",ioColQty:"数量",ioColUnit:"单价",ioColRef:"参考",ioColBy:"操作人",ioColDate:"日期",ioSearchPh:"搜索SKU/商品/参考...",ioItems:"条",ioRegTitle:"登记出入库",ioTypeLabel:"类型",ioWhLabel:"仓库",ioSkuLabel:"SKU",ioProductLabel:"商品名",ioQtyLabel:"数量",ioUnitLabel:"单价",ioRefLabel:"参考编号",ioSaveBtn:"保存",ioRegBtn:"+ 登记",
ioFilterAll:"全部",ioFilterInbound:"入库",ioFilterOutbound:"出库",ioFilterTransfer:"调拨",ioFilterAdj:"调整",ioFilterDisposal:"报废",ioFilterRetInbound:"退货入库",ioFilterRetOutbound:"退货出库",
whListTitle:"仓库列表",whAddBtn:"+ 添加仓库",whNewTitle:"新建仓库",whEditTitle:"编辑仓库",whNameLabel:"仓库名称",whCodeLabel:"仓库代码",whAddrLabel:"地址",whAreaLabel:"面积(㎡)",whPhoneLabel:"电话",whManagerLabel:"管理员",whTempLabel:"温度类型",whTypeLabel:"仓库类型",whSaveBtn:"保存",whCancelBtn:"取消",whEditBtn:"编辑",whActive:"运营中",whInactive:"已停用",whCurrentStock:"当前库存",whResumeBtn:"恢复",whNameRequired:"请输入仓库名称",
whTempRoom:"常温",whTempCold:"冷藏",whTempFrozen:"冷冻",whTempHazard:"危险品",whTempElec:"电子产品",whTempCombi:"复合",whTypeDirect:"自营",whTypeRent:"租赁",whType3PL:"3PL委托",
csvImportBtn:"CSV导入",csvImportTitle:"CSV批量导入",csvImportDesc:"请上传包含以下列的CSV文件:",csvImportDone:"条数据导入成功",csvRowsDetected:"行数据已检测",csvExecuteBtn:"执行导入",exportCsvBtn:"导出CSV",exportExcelBtn:"导出Excel",
securityBtn:"安全监控",securityTitle:"安全检查",securityDesc:"全面安全扫描",securitySafe:"安全",securitySafeDesc:"未检测到威胁",permBtn:"权限管理",permTitle:"权限管理",permDesc:"管理用户访问权限",
pickAll:"全部",pickPending:"待处理",pickPicked:"已拣货",pickPacked:"已包装",pickShipped:"已发货",pickApprovalPending:"待审批",pickPrintBtn:"打印拣货单",pickDispatchBtn:"批量发货",
recvAllPO:"全部PO",recvInTransit:"运输中",recvReceived:"已收货",recvConfirmBtn:"确认收货",
lotExpireSoon:"即将过期",lotImminent:"紧急",lotRegBtn:"+ 登记批次",lotDaysLeft:"天",
trackTitle:"物流追踪",trackSearchTitle:"运单查询",trackNumLabel:"运单号",trackSearchBtn:"查询",
carrAddBtn:"+ 添加运输公司",carrNewTitle:"新建运输公司",carrEditTitle:"编辑运输公司",carrNameLabel:"公司名称",carrCodeLabel:"公司代码",carrTypeLabel:"类型",carrCountryLabel:"国家",
supAddBtn:"+ 添加供应商",supNewTitle:"新建供应商",supEditTitle:"编辑供应商",supNameLabel:"供应商名称",supSearchPh:"搜索供应商...",
bdlTitle:"捆绑/BOM管理",bdlNewTitle:"新建捆绑商品",bdlSkuLabel:"捆绑SKU",bdlNameLabel:"捆绑名称",
auditTitle:"库存盘点记录",
combRegTitle:"合并包装申请",combListTitle:"合并包装列表",combReqBtn:"申请合并",
guideHeroTitle:"WMS仓库管理完全指南",guideHeroSub:"从仓库注册到出库的全流程指南",guideQuickStart:"快速开始指南",
guideQS1:"注册仓库",guideQS1D:"在WMS仓库标签中先注册仓库",guideQS2:"商品入库",guideQS2D:"在入库验收标签中处理商品入库",guideQS3:"确认库存",guideQS3D:"在库存状况标签中确认实时库存",guideQS4:"出库处理",guideQS4D:"在拣货/包装标签中处理订单出库",
guideCautionTitle:"注意事项",guideStepsTitle2:"详细步骤指南",guideTabsTitle2:"功能菜单说明",guideTipsTitle2:"专家提示",
invcTitle:"商业发票",invcPrintBtn:"打印发票"},
ja:{wmsHeroTitle:"WMS 倉庫統合管理",wmsHeroDesc:"倉庫登録・入出庫・在庫管理・バンドル・宅配/特急・コマーシャルインボイス管理",
wmsAssetValue:"在庫資産総額",wmsBadgeWh:"倉庫",wmsBadgeCarrier:"運送会社/特急便",wmsBadgeSku:"SKU",wmsBadgeTotalStock:"総在庫",wmsBadgeLowStock:"低在庫",wmsBadgeOrders:"連携注文",
wmsBtnSalesChannel:"販売チャネル →",wmsBtnBudget:"予算プランナー →",
tabWarehouse:"WMS 倉庫",tabWarehouseDesc:"在庫・入出庫・倉庫別",tabInOut:"入出庫",tabInOutDesc:"入庫/出庫",tabInventory:"在庫状況",tabInventoryDesc:"チャネル別リアルタイム在庫",tabReceiving:"入庫検品",tabReceivingDesc:"発注",tabPicking:"ピッキング/梱包",tabPickingDesc:"同期",tabLot:"ロット/消費期限",tabLotDesc:"消費期限",tabReplenishment:"自動発注",tabReplenishmentDesc:"自動PO",tabCarrier:"運送会社",tabCarrierDesc:"国内/国際",tabCombine:"合包装",tabCombineDesc:"合配送",tabTracking:"配送追跡",tabTrackingDesc:"リアルタイム",tabAudit:"在庫実査",tabAuditDesc:"在庫実査",tabInvoice:"インボイス",tabInvoiceDesc:"自動生成",tabBundle:"バンドル/BOM",tabBundleDesc:"BOM",tabGuide:"利用ガイド",tabGuideDesc:"使い方",tabSupplier:"取引先",tabSupplierDesc:"取引先",
invTableTitle:"SKU別倉庫在庫状況",invColSku:"SKU",invColProduct:"商品名",invColTotal:"合計",invColSafe:"安全在庫",invColStatus:"状態",invColCost:"原価",invColValue:"在庫価値",invColAdj:"調整",
invSearchPh:"SKUまたは商品名を検索...",invLowOnly:"低在庫のみ表示",invNoResult:"検索結果がありません",invNormal:"正常",invLow:"低在庫",invOutOfStock:"欠品",invTotalStock:"総在庫",invAdjTitle:"在庫調整",invAdjQty:"調整数量",invAdjApply:"適用",invAdjBtn:"調整",invDemoAdj:"デモモードでは在庫調整できません",
ioColType:"タイプ",ioColWh:"倉庫",ioColSku:"SKU",ioColProduct:"商品",ioColQty:"数量",ioColUnit:"単価",ioColRef:"参照",ioColBy:"担当者",ioColDate:"日付",ioSearchPh:"SKU/商品/参照を検索...",ioItems:"件",ioRegTitle:"入出庫登録",ioTypeLabel:"タイプ",ioWhLabel:"倉庫",ioSkuLabel:"SKU",ioProductLabel:"商品名",ioQtyLabel:"数量",ioUnitLabel:"単価",ioRefLabel:"参照番号",ioSaveBtn:"保存",ioRegBtn:"+ 登録",
ioFilterAll:"すべて",ioFilterInbound:"入庫",ioFilterOutbound:"出庫",ioFilterTransfer:"移管",ioFilterAdj:"調整",ioFilterDisposal:"廃棄",ioFilterRetInbound:"返品入庫",ioFilterRetOutbound:"返品出庫",
whListTitle:"倉庫一覧",whAddBtn:"+ 倉庫追加",whNewTitle:"新規倉庫",whEditTitle:"倉庫編集",whNameLabel:"倉庫名",whCodeLabel:"倉庫コード",whAddrLabel:"住所",whAreaLabel:"面積(㎡)",whPhoneLabel:"電話",whManagerLabel:"管理者",whTempLabel:"温度タイプ",whTypeLabel:"倉庫タイプ",whSaveBtn:"保存",whCancelBtn:"キャンセル",whEditBtn:"編集",whActive:"運営中",whInactive:"停止中",whCurrentStock:"現在在庫",whResumeBtn:"再開",whNameRequired:"倉庫名を入力してください",
whTempRoom:"常温",whTempCold:"冷蔵",whTempFrozen:"冷凍",whTempHazard:"危険物",whTempElec:"電子製品",whTempCombi:"複合",whTypeDirect:"自社",whTypeRent:"レンタル",whType3PL:"3PL委託",
csvImportBtn:"CSVインポート",exportCsvBtn:"CSV出力",exportExcelBtn:"Excel出力",
securityBtn:"セキュリティ監視",permBtn:"権限管理",
pickAll:"すべて",pickPending:"保留中",pickPicked:"ピッキング済",pickPacked:"梱包済",pickShipped:"出荷済",
recvAllPO:"全PO",recvInTransit:"輸送中",recvReceived:"受領済",recvConfirmBtn:"入庫確認",
lotExpireSoon:"期限間近",lotRegBtn:"+ ロット登録",lotDaysLeft:"日",
trackTitle:"配送追跡",trackSearchBtn:"検索",carrAddBtn:"+ 運送会社追加",supAddBtn:"+ 取引先追加",
guideHeroTitle:"WMS倉庫管理完全ガイド",guideQuickStart:"クイックスタート",
guideCautionTitle:"注意事項",guideStepsTitle2:"ステップ別詳細ガイド",guideTabsTitle2:"メニュー別機能説明",guideTipsTitle2:"エキスパートのヒント"}
};
// Apply translations: merge native keys over EN base
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
let count=0;
for(const file of files){
  const lang=file.replace('.js','');
  const native=T[lang];
  if(!native)continue; // skip langs without native translations (they keep EN)
  const fp=path.join(dir,file);
  let src=fs.readFileSync(fp,'utf8');
  // Load current wms object
  const mod=require(fp);
  const obj=mod.default||mod;
  if(!obj.wms){console.log(`SKIP ${lang}: no wms`);continue;}
  // Merge native over EN
  const merged={...obj.wms,...native};
  const wmsStart=src.indexOf('"wms"');
  if(wmsStart===-1)continue;
  const braceStart=src.indexOf('{',wmsStart+5);
  let depth=1,pos=braceStart+1;
  while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;else if(src[pos]==='}')depth--;pos++;}
  src=src.slice(0,wmsStart)+'"wms":'+JSON.stringify(merged)+src.slice(pos);
  fs.writeFileSync(fp,src,'utf8');
  console.log(`OK ${lang}: ${Object.keys(native).length} native keys merged`);
  count++;
}
console.log(`Done: ${count} files updated with native translations`);
