const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'src/i18n/locales');
function apply(locale,trans){
    const fp=path.join(DIR,locale+'.js');
    const c=fs.readFileSync(fp,'utf8');
    const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    const obj=eval('('+m[1]+')');
    if(!obj.wms)obj.wms={};
    Object.entries(trans).forEach(([k,v])=>{obj.wms[k]=v;});
    const out='export default '+JSON.stringify(obj)+'\n';
    fs.writeFileSync(fp,out);
    try{eval('('+JSON.stringify(obj)+')');console.log(locale+': '+Object.keys(trans).length+' keys OK');}
    catch(e){console.log(locale+': BROKEN');}
}
const ZH={
securityBtn:'🛡️ 安全监控',securityTitle:'安全威胁检测监控',securityDesc:'实时安全威胁检测与拦截',securitySafe:'安全状态：安全',securitySafeDesc:'未检测到安全威胁。',
permBtn:'🔑 权限管理',permTitle:'仓库用户权限管理',permDesc:'按用户管理仓库访问权限。不同角色权限不同。',permUserLabel:'用户邮箱',permRoleLabel:'角色',permAddBtn:'添加权限',permColUser:'用户',permColRole:'角色',permColAction:'管理',permRoleAdmin:'管理员',permRoleManager:'经理',permRoleOperator:'操作员',permRoleViewer:'查看者',permEmpty:'暂无权限记录，请添加用户。',
auditLogBtn:'📋 移动记录',auditLogTitle:'📋 库存移动记录（审计追踪）',auditLogDesc:'所有库存变动的不可变日志，最多500条。',auditLogEmpty:'暂无移动记录。',auditLogClearBtn:'🗑 删除记录',auditLogClearConfirm:'确定删除所有记录？此操作不可撤销。',
exportCsvBtn:'📥 导出CSV',exportExcelBtn:'📋 导出Excel',
csvImportBtn:'📥 CSV批量导入',csvImportTitle:'CSV批量导入',csvImportDesc:'通过CSV文件批量注册SKU/库存。必填列：',csvRowsDetected:'条记录已检测',csvMoreRows:'更多行',csvExecuteBtn:'执行批量注册',csvImportDone:'条已导入！',
scanBtn:'📷 扫描条码',scanTitle:'条码扫描器',scanScanning:'将条码对准扫描区域...',scanDetected:'条码已检测！',scanApply:'应用此SKU',scanCamError:'摄像头访问被拒绝，请检查浏览器权限。',
whTitle:'📦 仓库列表',whEmpty:'暂无仓库。点击 [+ 添加仓库] 按钮注册。',whAddBtn:'+ 添加仓库',whFormTitle:'仓库信息录入',whNameLabel:'仓库名',whCodeLabel:'仓库代码',whAddrLabel:'地址',whTypeLabel:'类型',whAreaLabel:'面积(㎡)',whManagerLabel:'管理员',whTypeNormal:'常温',whTypeCold:'冷藏',whTypeFrozen:'冷冻',whSaveBtn:'保存',whCancelBtn:'取消',whDeleteConfirm:'确定删除此仓库？',
invTableTitle:'📦 SKU别仓库库存现况',invColSku:'SKU',invColProduct:'商品名',invColTotal:'合计',invColSafe:'安全库存',invColStatus:'状态',invColCost:'单价',invColValue:'库存价值',invColAdj:'调整',invSearchPh:'按SKU或商品名搜索',invLowOnly:'⚠️ 仅显示库存不足',invTotalStock:'总库存',invNoResult:'🔍 无搜索结果。',invOutOfStock:'缺货',invLow:'不足',invNormal:'正常',invAdjTitle:'库存调整',invAdjQty:'调整数量',invAdjApply:'应用调整',invAdjBtn:'调整',invDemoAdj:'演示模式：无法进行库存调整。',
ioSearchPh:'按SKU·商品名·参考编号搜索',ioItems:'条',ioRegTitle:'📝 入出库登记',ioTypeLabel:'入出库类型',ioWhLabel:'仓库',ioTransferDest:'目标仓库',ioSkuLabel:'SKU',ioProductLabel:'商品名',ioQtyLabel:'数量',ioUnitLabel:'单价',ioRefLabel:'参考编号',ioRefPh:'PO-2024-001',ioMemoLabel:'备注',ioReturnReason:'退货原因',ioReturnReasonPh:'请输入退货原因',ioSaveBtn:'✅ 登记',ioColType:'类型',ioColWh:'仓库',ioColSku:'SKU',ioColProduct:'商品名',ioColQty:'数量',ioColUnit:'单价',ioColRef:'参考',ioColBy:'操作人',ioColDate:'日期',ioRegBtn:'+ 入出库登记',ioExportBtn:'📥 CSV下载',ioTypeInbound:'入库',ioTypeOutbound:'出库',ioTypeReturnsIn:'退货入库',ioTypeReturnsOut:'退货出库',ioTypeTransfer:'仓间调拨',ioTypeAdjust:'调整',ioTypeDisposal:'报废',ioEmpty:'暂无入出库记录。',
recvTitle:'📋 入库检验',recvSearchPh:'按PO号或SKU搜索',recvPoNumber:'PO编号',recvSku:'SKU',recvProduct:'商品名',recvExpected:'预计数量',recvActual:'实收数量',recvStatus:'状态',recvAction:'操作',recvBtnAccept:'验收完成',recvBtnPartial:'部分入库',recvBtnReject:'拒收',recvStatusPending:'待检验',recvStatusAccepted:'验收完成',recvStatusPartial:'部分入库',recvStatusRejected:'已拒收',recvEmpty:'暂无待检验入库。',
pickTitle:'📋 拣货/包装',pickSearchPh:'按订单号或SKU搜索',pickOrderNo:'订单号',pickSku:'SKU',pickProduct:'商品名',pickQty:'数量',pickStatus:'状态',pickAction:'操作',pickBtnPick:'拣货',pickBtnPack:'包装',pickBtnShip:'出库',pickStatusReady:'准备中',pickStatusPicking:'拣货中',pickStatusPacked:'包装完成',pickStatusShipped:'已出库',pickEmpty:'暂无拣货订单。',
lotTitle:'📋 批次/有效期管理',lotSearchPh:'按批号或SKU搜索',lotColLot:'批号',lotColSku:'SKU',lotColProduct:'商品名',lotColExpiry:'有效期',lotColQty:'数量',lotColStatus:'状态',lotExpired:'已过期',lotExpiringSoon:'即将过期',lotActive:'有效',lotEmpty:'暂无批次信息。',
replTitle:'📋 自动采购(PO)管理',replSearchPh:'按SKU或商品名搜索',replColSku:'SKU',replColProduct:'商品名',replColCurrent:'当前库存',replColSafe:'安全库存',replColReorder:'补货点',replColStatus:'状态',replColAction:'操作',replBtnOrder:'下单',replStatusAuto:'自动采购',replStatusManual:'手动',replEmpty:'暂无需补货商品。',
combTitle:'📋 合包装管理',combSearchPh:'按订单号搜索',combColOrder:'订单号',combColItems:'商品数',combColWeight:'总重量',combColStatus:'状态',combColAction:'操作',combBtnCombine:'合包装',combStatusReady:'准备中',combStatusCombined:'已合包',combEmpty:'暂无合包装对象。',combTracking:'📦 追踪',
carrTitle:'📋 运输商管理',carrSearchPh:'按运输商名搜索',carrColName:'运输商名',carrColCode:'代码',carrColType:'类型',carrColApi:'API连接',carrColStatus:'状态',carrBtnAdd:'+ 添加运输商',carrTypeDomestic:'国内',carrTypeInternational:'国际',carrApiConnected:'已连接',carrApiDisconnected:'未连接',carrEmpty:'暂无运输商。',
trackTitle:'📋 物流追踪',trackSearchTitle:'🔍 按运单号追踪',trackSearchPh:'输入运单号',trackSearchBtn:'追踪',trackSearching:'搜索中...',trackNumPh:'输入运单号',trackNoResult:'未找到追踪结果。',trackCJ:'CJ大韩通运',trackHJ:'韩进快递',trackLT:'乐天快递',trackEMS:'韩国邮政',trackCPR:'酷澎火箭配送',trackLZ:'Logen快递',trackStatusInTransit:'配送中',trackEtaToday:'预计到达：今天下午',trackLoc1:'首尔江南配送中心',trackDesc1:'已发出',trackLoc2:'首都圈Hub',trackDesc2:'分拣完成',trackLoc3:'仁川物流中心',trackDesc3:'干线到达',trackLoc4:'釜山发货中心',trackDesc4:'发送',
invcTitle:'📋 商业发票',invcSearchPh:'按发票号搜索',invcColNo:'编号',invcColDate:'日期',invcColBuyer:'购买者',invcColTotal:'总金额',invcColCurrency:'货币',invcColStatus:'状态',invcBtnCreate:'+ 创建发票',invcStatusDraft:'草稿',invcStatusIssued:'已开具',invcStatusPaid:'已付款',invcEmpty:'暂无发票。',
bdlTitle:'📋 捆绑/BOM管理',bdlSearchPh:'按捆绑名搜索',bdlColName:'捆绑名',bdlColSku:'SKU',bdlColComponents:'组件',bdlColStock:'库存',bdlColStatus:'状态',bdlBtnAdd:'+ 添加捆绑',bdlEmpty:'暂无捆绑。',bdlShipAlert:'捆绑出货：',bdlRegAlert:'捆绑登记完成：',bdlNamePh:'输入捆绑名',bdlQtyLabel:'数量',
supTitle:'📋 供应商管理',supSearchPh:'按供应商名搜索',supColName:'供应商名',supColContact:'联系方式',supColLeadTime:'交货周期',supColRating:'评级',supColAction:'操作',supBtnAdd:'+ 添加供应商',supEmpty:'暂无供应商。',
auditTitle:'📋 库存盘点',auditSearchPh:'按SKU或仓库搜索',auditColSku:'SKU',auditColProduct:'商品名',auditColSystem:'账面库存',auditColPhysical:'实物库存',auditColDiff:'差异',auditColAction:'操作',auditBtnCount:'盘点',auditBtnAdjust:'调整',auditEmpty:'暂无盘点对象。',auditAdjAlert:'库存调整完成',auditAllSku:'全部SKU',
pageSub:'入库·配送·库存·拣货·包装·退货统一管理',totalStock:'总库存',returnRate:'退货率',pendingReceive:'待入库',pendingShip:'待发货',registerReceipt:'入库登记',processShipment:'出库处理',adjustInventory:'库存调整',sku:'SKU',quantity:'数量',location:'位置',warehouse:'仓库',status:'状态',actions:'操作',bulkXlsxError:'Excel文件解析失败，请检查格式。'
};
apply('zh',ZH);

// zh-TW
const ZH_TW={};
Object.entries(ZH).forEach(([k,v])=>{
    // Convert simplified to traditional for common chars
    ZH_TW[k]=v.replace(/仓库/g,'倉庫').replace(/删除/g,'刪除').replace(/记录/g,'記錄').replace(/导出/g,'匯出').replace(/导入/g,'匯入').replace(/检测/g,'偵測').replace(/检验/g,'檢驗').replace(/搜索/g,'搜尋').replace(/创建/g,'建立').replace(/库存/g,'庫存').replace(/调整/g,'調整').replace(/管理/g,'管理').replace(/数量/g,'數量').replace(/编号/g,'編號').replace(/发/g,'發').replace(/运/g,'運').replace(/订单/g,'訂單').replace(/预计/g,'預計').replace(/备注/g,'備註').replace(/确定/g,'確定').replace(/状态/g,'狀態').replace(/处理/g,'處理').replace(/单价/g,'單價').replace(/总/g,'總').replace(/无/g,'無').replace(/暂/g,'暫').replace(/对/g,'對').replace(/过/g,'過').replace(/拒/g,'拒').replace(/类型/g,'類型').replace(/连接/g,'連接').replace(/商品/g,'商品').replace(/价值/g,'價值').replace(/不足/g,'不足').replace(/输入/g,'輸入').replace(/选/g,'選').replace(/权限/g,'權限').replace(/不可/g,'不可').replace(/条/g,'條').replace(/显示/g,'顯示').replace(/实/g,'實').replace(/济/g,'濟').replace(/级/g,'級').replace(/联系/g,'聯繫').replace(/评/g,'評');
});
apply('zh-TW',ZH_TW);
console.log('Done!');
