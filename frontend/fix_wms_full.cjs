const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
// Full translations for remaining keys in zh (Chinese Simplified)
// Other languages will get a subset
const zhFull={
// Picking tab
pickColId:"拣货ID",pickColOrder:"订单号",pickColSku:"SKU",pickColProduct:"商品",pickColQty:"数量",pickColWh:"仓库",pickColStatus:"状态",pickColCreated:"创建时间",pickColAction:"操作",pickDispatchTitle:"出库审批",pickDispatchSub:"确认后无法撤销",pickDispatchWarn:"请确认所有商品已正确包装",pickDispatchConfirm:"确认出库",pickItems:"件",pickItemUnit:"件",
// Receiving tab
recvColPO:"采购订单号",recvColSupplier:"供应商",recvColProduct:"商品",recvColSku:"SKU",recvColQty:"数量",recvColUnit:"单价",recvColTotal:"总额",recvColOrderDate:"订单日期",recvColEta:"预计到货",recvColStatus:"状态",recvColAction:"操作",recvTotalAmt:"总金额",
// Lot tab
lotColId:"ID",lotColLotNo:"批次号",lotColSku:"SKU",lotColProduct:"商品",lotColQty:"数量",lotColMfg:"生产日期",lotColExpiry:"有效期",lotColDays:"剩余天数",lotColWarn:"预警",lotColWh:"仓库",lotRegTitle:"批次登记",lotRegDone:"批次登记成功",
// Replenishment tab
replColPO:"PO编号",replColSupplier:"供应商",replColQty:"数量",replColTotal:"金额",replColOrderDate:"订单日期",replColEta:"预计到货",replColStatus:"状态",replNeedTitle:"需要补货的商品",replFormTitle:"创建采购订单",replHistTitle:"采购历史",replCreateBtn:"创建PO",replDone:"采购订单已创建",replSupplierLabel:"供应商",replQtyLabel:"数量",replUnitLabel:"单价",replEtaLabel:"预计到货日",replClickAuto:"点击自动创建",replStockLabel:"库存",replSafeLabel:"安全库存",replTotal:"总计",
// Carrier tab columns
carrFilterAll:"全部",carrFilterDomestic:"国内快递",carrFilterIntlExpress:"国际快递",carrFilterIntlPost:"国际邮政",carrFilterFreight:"货运",carrFilterSameDay:"当日达",carrLoadingMsg:"加载中...",carrOkMsg:"保存成功",carrFailMsg:"保存失败",carrApiDone:"API已连接",carrTestBtn:"测试",carrTestLoading:"测试中...",carrTestOk:"连接成功",carrIntegOk:"已集成",carrIntegFail:"集成失败",carrNoInteg:"未集成",carrNoApi:"无API",carrShowKey:"显示密钥",carrHideKey:"隐藏密钥",carrKeyReg:"注册密钥",carrSaveKey:"保存密钥",carrApiKeyLabel:"API密钥",carrApiKeyPh:"输入API密钥",carrApiKeyRequired:"请输入API密钥",carrTrackUrlLabel:"追踪URL",carrResume:"恢复",carrInactive:"已停用",carrAllReg:"全部注册",carrActive:"运营中",
// Supplier tab
supSearchPh:"搜索供应商...",supCodeLabel:"供应商代码",supCodePh:"例: SUP-001",supContactLabel:"联系人",supPhoneLabel:"电话",supEmailLabel:"邮箱",supCountryLabel:"国家",supTypeLabel:"类型",supTypeWholesale:"批发商",supTypeManuf:"制造商",supTypeRawMat:"原材料",supTypeOverseas:"海外",supType3PL:"3PL",supLeadLabel:"交货周期",supLeadTimeLabel:"交货周期(天)",supPayLabel:"付款条件",supRatingLabel:"评分",supActive:"活跃",supInactive:"停用",supActivate:"激活",supInactivate:"停用",supEditBtn:"编辑",supActiveVendor:"活跃供应商",supRegVendor:"注册供应商",supDays:"天",supTotalPO:"总采购订单",supTotalPOLabel:"总PO数",supTotalAmt:"总金额",supTotalAmtLabel:"总金额",supPoHistory:"采购历史",supPoHistHint:"点击查看详情",supDrawerCode:"代码",supDrawerContact:"联系人",supDrawerPhone:"电话",supDrawerLeadTime:"交货周期",supDrawerPayTerms:"付款条件",supDrawerTotalPO:"总PO",supDrawerTotalAmt:"总金额",supNameRequired:"请输入供应商名称",
// Bundle tab
bdlAddBtn:"添加组件",bdlAddComp:"添加组件",bdlAssemble:"组装",bdlAvailable:"可用",bdlBomTitle:"BOM组件",bdlCostLabel:"成本",bdlMarginLabel:"利润率",bdlPriceLabel:"价格",bdlQtyLabel:"数量",bdlRegAlert:"已注册",bdlShip1:"发货",bdlShip10:"批量发货",bdlShipAlert:"发货完成",bdlSkuLabel:"捆绑SKU",bdlNameLabel:"捆绑名称",bdlNamePh:"例: 夏季套装",
// Tracking
trackCJ:"CJ物流",trackHJ:"韩进",trackLT:"乐天",trackLZ:"邮政",trackEMS:"EMS",trackCPR:"大韩通运",trackCarrierLabel:"运输公司",trackNumLabel:"运单号",trackNumPh:"输入运单号",trackNumRequired:"请输入运单号",trackSearchBtn:"查询",trackSearchTitle:"运单查询",trackSearching:"查询中...",trackStatusInTransit:"运输中",trackDemoTag:"演示",trackEtaToday:"今日到达",trackDesc:"状态描述",trackDesc1:"已揽收",trackDesc2:"运输中",trackDesc3:"派送中",trackDesc4:"已签收",trackLoc1:"首尔分拨中心",trackLoc2:"大田中转站",trackLoc3:"釜山营业所",trackLoc4:"配送完成",
// Audit
auditTitle:"库存盘点记录",auditTotalDiff:"差异合计",
// Invoice
invcBasicInfo:"基本信息",invcNoLabel:"发票号",invcDateLabel:"日期",invcCurrLabel:"币种",invcExRateLabel:"汇率",invcExRateShort:"汇率",invcIncotermLabel:"贸易条款",invcCarrierLabel:"运输公司",invcTrackLabel:"运单号",invcRemarkLabel:"备注",invcRemarkPh:"输入备注...",invcShipperTitle:"发货人信息",invcConsigneeTitle:"收货人信息",invcCompanyName:"公司名称",invcCompany:"公司",invcAddress:"地址",invcPhone:"电话",invcItemsTitle:"商品明细",invcColNo:"序号",invcColDesc:"商品描述",invcColHs:"HS编码",invcColOrigin:"原产地",invcColQty:"数量",invcColUnit:"单价",invcColAmt:"金额",invcColDel:"删除",invcAddItem:"添加商品",invcTotal:"合计金额",invcCopyNo:"复制发票号",invcDesc:"商业发票",invcPrintBtn:"打印发票",
// Scan
scanBtn:"扫描",scanTitle:"条码扫描",scanScanning:"扫描中...",scanDetected:"已检测到",scanApply:"应用",scanCamError:"相机错误",
// Permission
permAddBtn:"添加用户",permColUser:"用户",permColRole:"角色",permColAction:"操作",permEmpty:"无用户",permRoleAdmin:"管理员",permRoleManager:"经理",permRoleOperator:"操作员",permRoleViewer:"查看者",permRoleLabel:"角色",permUserLabel:"用户",
// IO bulk
ioBulkBtn:"批量上传",ioBulkTitle:"Excel批量导入",ioBulkInfo:"下载样本文件后按格式填写上传",ioBulkSelectBtn:"选择文件",ioBulkSampleBtn:"下载样本",ioBulkPreview:"预览",ioBulkExecBtn:"执行导入",ioBulkDone:"导入完成",bulkXlsxError:"文件格式错误",ioDemoMsg:"演示模式",ioSkuRequired:"请输入SKU",ioRefPh:"例: PO-20240301",ioMemoLabel:"备注",ioTransferDest:"目标仓库",ioReturnReason:"退货原因",ioReturnReasonPh:"输入退货原因",
// Guide - full steps
guideTitle:"📦 WMS仓库统一管理使用指南",guideSub:"从仓库注册到出入库、库存管理、物流追踪、发票开具，在本指南中查看WMS的所有功能。",guideStepsTitle:"📚 详细步骤指南",guideTipsTitle:"💡 专家运营提示",
guideStep1Title:"注册和设置仓库",guideStep1Desc:"在'WMS仓库'标签中点击[+添加仓库]按钮。输入仓库名称、代码、地址、面积、温度类型、运营类型和管理员联系方式后保存。",
guideStep2Title:"出入库登记和管理",guideStep2Desc:"在'出入库'标签中点击[登记]按钮，登记入库、出库、退货入库、退货出库、仓库间调拨、库存调整、报废等7种类型。",
guideStep3Title:"实时库存查询",guideStep3Desc:"在'库存状况'标签中按仓库、SKU查询全部库存。低于安全库存的商品会以红色标注。支持CSV/Excel导出导入。",
guideStep4Title:"入库验收流程",guideStep4Desc:"在'入库验收'标签中基于采购订单(PO)验收入库商品的数量和质量。验收完成后自动反映到库存中。",
guideStep5Title:"拣货/包装列表管理",guideStep5Desc:"在'拣货/包装'标签中创建和管理基于订单的拣货列表。订单下达后自动生成拣货列表，并提供基于仓库位置的最优路线。",
guideStep6Title:"批次/保质期追踪",guideStep6Desc:"在'批次/保质期'标签中登记和追踪批次号和保质期。自动应用FIFO(先进先出)，保质期临近的商品优先出库。",
guideStep7Title:"自动采购(PO)系统",guideStep7Desc:"在'自动采购'标签中基于安全库存设置自动采购。库存低于安全库存时自动创建采购申请。",
guideStep8Title:"合并包装管理",guideStep8Desc:"在'合并包装'标签中将同一买家的多个订单合并到一个包裹中发货，节省运费。",
guideStep9Title:"运输公司管理和API集成",guideStep9Desc:"在'运输公司'标签中注册国内/国际快递公司并集成API。在集成中心注册API密钥后自动同步。",
guideStep10Title:"商业发票",guideStep10Desc:"在'发票'标签中自动生成国际发货用商业发票，支持INCOTERMS、HS编码和多币种。",
guideStep11Title:"捆绑/BOM管理",guideStep11Desc:"通过BOM(物料清单)创建商品捆绑。追踪组件库存并组装/发运捆绑套装。",
guideStep12Title:"供应商管理",guideStep12Desc:"注册和管理供应商的联系方式、付款条件、交货周期和评分。追踪各供应渠道的采购历史。",
guideStep13Title:"库存盘点",guideStep13Desc:"盘点实际库存。对比账面库存和实际库存，识别差异并生成差异报告。",
guideStep14Title:"审计历史和安全",guideStep14Desc:"通过[移动历史]按钮查看所有仓库活动的审计追踪日志。通过[安全监控]按钮实时监控安全威胁。",
guideTabsTitle:"标签详细说明",
guideTabWhDesc:"注册物理仓库并设置温度/类型/面积/管理员。运营多个仓库并按用户管理访问权限。",
guideTabInOutDesc:"登记入库/出库/退货/调拨/调整/报废等7种类型的库存移动。支持Excel批量上传和条码扫描。",
guideTabInvDesc:"按仓库/SKU查询全部库存，筛选低于安全库存的商品。提供CSV/Excel导出和库存价值自动计算。",
guideTabRecvDesc:"基于采购订单(PO)验收入库商品的数量和质量。验收完成后自动反映到库存。",
guideTabPickDesc:"创建基于订单的拣货列表，按最优路线拣货后与包装和运单连接。",
guideTabLotDesc:"登记批次号和保质期，自动应用FIFO，提供保质期临近警报和批次追踪。",
guideTabReplDesc:"基于安全库存设置自动采购。自动计算各供应商的交货周期和最小订购量。",
guideTabCombDesc:"将同一买家的多个订单合并包装发货以节省运费。",
guideTabCarrDesc:"注册国内/国际快递公司并集成API。在集成中心自动同步。",
guideTabTrackDesc:"通过运单号实时查询发货状态。管理配送完成/延迟/丢失状态。",
guideTabInvcDesc:"自动生成国际发货用商业发票，支持INCOTERMS、HS编码和多币种。",
guideTabBdlDesc:"通过BOM(物料清单)创建捆绑商品并追踪组件库存。",
guideTabSupDesc:"管理供应商联系方式、付款条件、交货周期和评分，追踪采购历史。",
guideTabAuditDesc:"对比账面库存和实际库存，生成差异报告并自动调整。",
guideTip1:"在集成中心注册API密钥后，快递公司和销售渠道会自动同步到WMS。",
guideTip2:"设置安全库存阈值后，自动采购功能可以预防缺货。请为每个SKU设置不同的阈值。",
guideTip3:"使用Excel批量上传功能一次处理数百条出入库记录。",
guideTip4:"启用批次/保质期管理后，FIFO自动应用可最大限度减少报废损失。",
guideTip5:"定期执行库存盘点(建议每月1次)可最大限度减少账面和实物差异。",
guideCt:"注意",
};
// Build translation sets for other languages (subset of visible guide steps)
const jaGuide={
guideTitle:"📦 WMS倉庫統合管理利用ガイド",guideSub:"倉庫登録から入出庫、在庫管理、配送追跡、インボイス発行まで、WMSの全機能をご確認ください。",guideStepsTitle:"📚 ステップ別詳細ガイド",guideTipsTitle:"💡 エキスパート運営ヒント",
guideStep1Title:"倉庫の登録と設定",guideStep1Desc:"'WMS倉庫'タブで[+倉庫追加]ボタンをクリック。倉庫名、コード、住所、面積、温度タイプ、運営タイプ、管理者連絡先を入力して保存します。",
guideStep2Title:"入出庫登録と管理",guideStep2Desc:"'入出庫'タブで[登録]ボタンをクリックし、入庫、出庫、返品入庫、返品出庫、倉庫間移動、在庫調整、廃棄の7種類を登録します。",
guideStep3Title:"リアルタイム在庫照会",guideStep3Desc:"'在庫状況'タブで全在庫を倉庫別、SKU別に照会します。安全在庫以下の品目は赤で表示されます。",
guideStep4Title:"入庫検品プロセス",guideStep4Desc:"'入庫検品'タブで発注(PO)に基づいて入庫商品の数量と品質を検品します。",
guideStep5Title:"ピッキング/梱包リスト管理",guideStep5Desc:"'ピッキング/梱包'タブで注文ベースのピッキングリストを作成・管理します。",
guideStep6Title:"ロット/消費期限追跡",guideStep6Desc:"'ロット/消費期限'タブでロット番号と消費期限を登録・追跡します。FIFO自動適用。",
guideStep7Title:"自動発注(PO)システム",guideStep7Desc:"'自動発注'タブで安全在庫基準で自動発注を設定します。",
guideStep8Title:"合包装管理",guideStep8Desc:"'合包装'タブで同一購入者の複数注文を1つの箱にまとめて配送します。",
guideStep9Title:"運送会社管理とAPI連携",guideStep9Desc:"'運送会社'タブで国内/国際宅配業者を登録しAPIを連携します。",
guideStep10Title:"コマーシャルインボイス",guideStep10Desc:"'インボイス'タブで国際配送用コマーシャルインボイスを自動生成します。",
guideStep11Title:"バンドル/BOM管理",guideStep11Desc:"BOM(部品表)でバンドル商品を作成し、構成品在庫を追跡します。",
guideStep12Title:"取引先管理",guideStep12Desc:"サプライヤーの連絡先、支払条件、リードタイム、評価を管理します。",
guideStep13Title:"在庫実査",guideStep13Desc:"帳簿在庫と実物在庫を比較し、差異レポートを生成して自動調整します。",
guideStep14Title:"監査履歴とセキュリティ",guideStep14Desc:"すべての倉庫活動の監査追跡ログを確認し、セキュリティ脅威をリアルタイム監視します。",
guideTip1:"統合ハブでAPIキーを登録すると、宅配業者と販売チャネルがWMSに自動同期されます。",
guideTip2:"安全在庫閾値を設定すると自動発注機能で品切れを予防できます。",
guideTip3:"Excel一括アップロード機能で数百件の入出庫を一度に処理できます。",
guideTip4:"ロット/消費期限管理を有効にするとFIFO自動適用で廃棄ロスを最小化できます。",
guideTip5:"定期的な在庫実査(月1回推奨)で帳簿と実物の差異を最小化できます。",
// Picking
pickColId:"ピックID",pickColOrder:"注文番号",pickColProduct:"商品",pickColQty:"数量",pickColWh:"倉庫",pickColStatus:"状態",pickColCreated:"作成日",pickColAction:"操作",pickItems:"件",pickItemUnit:"件",pickDispatchTitle:"出庫承認",pickDispatchConfirm:"出庫確認",
// Receiving
recvColPO:"PO番号",recvColSupplier:"取引先",recvColProduct:"商品",recvColQty:"数量",recvColTotal:"合計",recvColOrderDate:"発注日",recvColEta:"入荷予定",recvColStatus:"状態",recvTotalAmt:"合計金額",
// Lot
lotColLotNo:"ロット番号",lotColProduct:"商品",lotColQty:"数量",lotColMfg:"製造日",lotColExpiry:"消費期限",lotColDays:"残日数",
// Repl
replColPO:"PO番号",replColSupplier:"取引先",replColQty:"数量",replColTotal:"金額",replCreateBtn:"PO作成",replStockLabel:"在庫",replSafeLabel:"安全在庫",
};

// Apply to locale files
const langs={zh:zhFull,ja:jaGuide};
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
for(const file of files){
  const lang=file.replace('.js','');
  const native=langs[lang];
  if(!native)continue;
  const fp=path.join(dir,file);
  let src=fs.readFileSync(fp,'utf8');
  delete require.cache[require.resolve(fp)];
  const obj=(require(fp).default||require(fp));
  if(!obj.wms)continue;
  const merged={...obj.wms,...native};
  const idx=src.indexOf('"wms"');
  if(idx===-1)continue;
  const bs=src.indexOf('{',idx+5);
  let d=1,p=bs+1;
  while(d>0&&p<src.length){if(src[p]==='{')d++;else if(src[p]==='}')d--;p++;}
  src=src.slice(0,idx)+'"wms":'+JSON.stringify(merged)+src.slice(p);
  fs.writeFileSync(fp,src,'utf8');
  console.log(`OK ${lang}: ${Object.keys(native).length} keys merged`);
}
console.log('Done');
