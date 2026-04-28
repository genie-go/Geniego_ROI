// Fix Supply Chain i18n: Replace Korean fallbacks with proper translations for all 13 non-ko/en languages
const fs=require('fs');
const DIR='src/i18n/locales/';

// Complete translations for ALL keys that were left in Korean
const TR={
ja:{
kpiLines:'供給ライン',kpiSuppliers:'サプライヤー',kpiHighRisk:'高リスク',kpiAvgLead:'平均リードタイム',kpiTotalCost:'総コスト',kpiOnTime:'納期遵守率',
productName:'製品名',supplier:'サプライヤー',labelSku:'SKU',leadTime:'リードタイム',days:'日',country:'国',category:'カテゴリ',delayRate:'遅延率',contact:'連絡先',reliability:'信頼性',orderCount:'注文数',
addLine:'ライン追加',addSupplier:'サプライヤー追加',register:'登録',cancel:'キャンセル',confirmDelete:'削除しますか？',
normal:'正常',highRisk:'高リスク',supplyRisk:'供給リスク',contactSupplier:'サプライヤーに連絡',altSupplierSearch:'代替サプライヤー検索',slackNotify:'Slack通知',autoRiskRules:'自動リスクルール',addRule:'ルール追加',ruleName:'ルール名',ruleAction:'アクション',noRisk:'検出されたリスクはありません。',
invTotal:'総在庫',invTransit:'輸送中',invWarehouse:'倉庫',invSupplier:'サプライヤー',invQty:'数量',invStatus:'状態',invLocation:'場所',invUpdated:'更新日',
tabPOTitle:'発注管理',poCreate:'発注作成',poSelectSupplier:'サプライヤー選択',poUnitCost:'単価',poTotalCost:'合計',poNotes:'備考',poDate:'日付',
poStatusDraft:'下書き',poStatusPending:'承認待ち',poStatusApproved:'承認済み',poStatusShipped:'出荷済み',poStatusReceived:'受領済み',poStatusCancelled:'キャンセル済み',
lcProductCost:'製品原価',lcShipping:'送料',lcCustoms:'関税',lcInsurance:'保険料',lcHandling:'取扱費',lcOther:'その他',lcCalculate:'計算する',lcResult:'分析結果',lcDesc:'輸入製品の総着地原価を計算します。',
securityAlert:'セキュリティ脅威検出',securityDesc:'悪意のある入力がブロックされました。',securityDismiss:'確認してブロック',totalPO:'総発注額',
guideTitle:'サプライチェーン管理ガイド',guideSub:'このガイドに従えば、初心者でもサプライチェーン管理システムを完璧に活用できます。',
guideStepsTitle:'ステップバイステップガイド',guideTipsTitle:'エキスパートのヒント',guideTabsTitle:'タブ別機能ガイド',
guideBeginnerBadge:'初心者ガイド',guideTimeBadge:'10分',guideLangBadge:'12言語対応',
guideWhereToStart:'どこから始めますか？',guideWhereToStartDesc:'1. サプライヤー管理タブで取引先を登録します。2. 供給タイムラインタブで供給ラインを作成します。3. 発注管理タブで発注書を作成します。4. 在庫状況タブで在庫を監視します。5. リスク検出タブで自動アラートルールを設定します。',
guideStep1Title:'サプライヤー登録',guideStep1Desc:'サプライヤー管理タブで取引先情報（会社名、国、カテゴリ、リードタイム、連絡先）を入力してサプライヤーを登録します。',
guideStep2Title:'供給ライン作成',guideStep2Desc:'供給タイムラインタブで製品別供給ラインを作成し、各段階（発注→生産→検査→出荷→輸送→入庫）を追跡します。',
guideStep3Title:'発注書作成',guideStep3Desc:'発注管理タブでサプライヤーを選択し、製品、数量、単価を入力して発注書を作成します。',
guideStep4Title:'在庫モニタリング',guideStep4Desc:'在庫状況タブで全在庫、輸送中、倉庫、サプライヤー別在庫数量をリアルタイムで確認します。',
guideStep5Title:'リードタイム分析',guideStep5Desc:'リードタイム分析タブで各供給ラインの段階別所要時間と遅延率を分析します。',
guideStep6Title:'リスク検出設定',guideStep6Desc:'リスク検出タブで高リスク供給ラインを確認し、自動アラートルールを設定します。',
guideStep7Title:'原価分析活用',guideStep7Desc:'原価分析タブで製品原価、送料、関税、保険料等を入力して総着地原価を計算します。',
guideStep8Title:'サプライヤー評価',guideStep8Desc:'サプライヤーの信頼性、遅延率、注文数に基づいてパフォーマンスを評価します。',
guideStep9Title:'リアルタイム同期確認',guideStep9Desc:'すべての変更はリアルタイムで同期されます。発注作成時に在庫とタイムラインが自動更新されます。',
guideStep10Title:'ダッシュボード総合確認',guideStep10Desc:'KPIカードを定期的に確認します。',
guideStep11Title:'リスク対応プロセス',guideStep11Desc:'高リスク検出時：①サプライヤー連絡→②代替検索→③Slackアラート→④発注調整。',
guideStep12Title:'原価最適化戦略',guideStep12Desc:'定期的に原価分析を実行し、最適な物流経路と通関戦略を策定します。',
guideStep13Title:'期間別データ照会',guideStep13Desc:'各タブで期間選択機能を使用してデータをフィルタリングし、トレンドを分析します。',
guideStep14Title:'セキュリティ管理',guideStep14Desc:'システムはすべての入力に対してXSS、SQLインジェクション等のセキュリティ脅威を自動検出しブロックします。',
guideStep15Title:'最終点検とルーチン化',guideStep15Desc:'毎週月曜日：KPI確認→高リスクレビュー→発注状況点検→原価分析。',
guideTip1:'サプライヤー信頼性が85%未満の場合、代替サプライヤーを確保してください。',
guideTip2:'リードタイムが14日以上のラインは安全在庫を増やす必要があります。',
guideTip3:'原価分析時に関税と保険料を漏らすと実際の原価と大きな差が生じます。',
guideTip4:'高リスクラインが3個以上あればサプライチェーン多様化戦略を検討してください。',
guideTip5:'納期遵守率95%以上を目標に管理すれば在庫不足リスクを最小化できます。',
guideTabTimelineDesc:'供給ライン別段階追跡と進行状況を視覚的に管理します。',
guideTabSuppliersDesc:'サプライヤー登録、評価、連絡先管理を行います。',
guideTabInventoryDesc:'全在庫を場所別にリアルタイム監視します。',
guideTabPODesc:'発注書作成、状態追跡、費用管理を行います。',
guideTabLeadTimeDesc:'供給ライン別リードタイムを分析します。',
guideTabRiskDesc:'高リスク供給ライン検出と自動アラート管理。',
guideTabLandedCostDesc:'輸入製品の総着地原価を計算します。',
guideTabGuideDesc:'初心者向け詳細ガイドとエキスパートのヒント。',
guideReadyTitle:'準備完了！サプライチェーン管理を始めましょう',guideReadyDesc:'サプライヤー管理タブで最初のサプライヤーを登録してください。',
guideFaqTitle:'よくある質問',
guideFaq1Q:'データが表示されません',guideFaq1A:'まずサプライヤー管理タブでサプライヤーを登録し、供給ラインを作成してください。',
guideFaq2Q:'リスク検出が動作しません',guideFaq2A:'供給ラインのリスク属性が"high"の場合のみ表示されます。',
guideFaq3Q:'発注書の状態を変更するには？',guideFaq3A:'発注書の状態は作成時に自動で"下書き"に設定されます。',
guideFaq4Q:'原価分析結果が0円です',guideFaq4A:'各費用項目に金額を入力後「計算する」ボタンをクリックしてください。',
guideFaq5Q:'リアルタイム同期されません',guideFaq5A:'30秒間隔で自動同期されます。即時反映はページ更新してください。',
periodLabel:'期間',periodFrom:'開始日',periodTo:'終了日'
},
zh:{
kpiLines:'供应线',kpiSuppliers:'供应商',kpiHighRisk:'高风险',kpiAvgLead:'平均交期',kpiTotalCost:'总成本',kpiOnTime:'准时率',
productName:'产品名',supplier:'供应商',labelSku:'SKU',leadTime:'交期',days:'天',country:'国家',category:'类别',delayRate:'延迟率',contact:'联系方式',reliability:'可靠性',orderCount:'订单数',
addLine:'添加线路',addSupplier:'添加供应商',register:'注册',cancel:'取消',confirmDelete:'确定删除？',
normal:'正常',highRisk:'高风险',supplyRisk:'供应风险',contactSupplier:'联系供应商',altSupplierSearch:'搜索替代供应商',slackNotify:'Slack通知',autoRiskRules:'自动风险规则',addRule:'添加规则',ruleName:'规则名',ruleAction:'操作',noRisk:'未检测到风险。',
invTotal:'总库存',invTransit:'运输中',invWarehouse:'仓库',invSupplier:'供应商',invQty:'数量',invStatus:'状态',invLocation:'位置',invUpdated:'更新时间',
tabPOTitle:'采购管理',poCreate:'创建采购单',poSelectSupplier:'选择供应商',poUnitCost:'单价',poTotalCost:'总计',poNotes:'备注',poDate:'日期',
poStatusDraft:'草稿',poStatusPending:'待审批',poStatusApproved:'已批准',poStatusShipped:'已发货',poStatusReceived:'已收货',poStatusCancelled:'已取消',
lcProductCost:'产品成本',lcShipping:'运费',lcCustoms:'关税',lcInsurance:'保险费',lcHandling:'处理费',lcOther:'其他费用',lcCalculate:'计算',lcResult:'分析结果',lcDesc:'计算进口产品的总到岸成本。',
securityAlert:'安全威胁检测',securityDesc:'恶意输入已被拦截。',securityDismiss:'确认并拦截',totalPO:'采购总额',
guideTitle:'供应链管理指南',guideSub:'按照本指南操作，即使是初学者也能完美使用供应链管理系统。',
guideStepsTitle:'分步指南',guideTipsTitle:'专家建议',guideTabsTitle:'标签功能说明',
guideBeginnerBadge:'初学者指南',guideTimeBadge:'10分钟',guideLangBadge:'12种语言',
guideWhereToStart:'从哪里开始？',guideWhereToStartDesc:'1. 在供应商管理标签中注册供应商。2. 在供应时间线标签中创建供应线。3. 在采购管理标签中创建采购单。4. 在库存标签中监控库存。5. 在风险检测标签中设置自动警报规则。',
guideStep1Title:'注册供应商',guideStep1Desc:'在供应商管理标签中输入供应商信息进行注册。',
guideStep2Title:'创建供应线',guideStep2Desc:'在供应时间线标签中创建产品供应线，跟踪各阶段。',
guideStep3Title:'创建采购单',guideStep3Desc:'在采购管理标签中选择供应商，输入产品、数量和单价创建采购单。',
guideStep4Title:'库存监控',guideStep4Desc:'在库存标签中实时查看总库存、运输中和仓库库存。',
guideStep5Title:'交期分析',guideStep5Desc:'在交期分析标签中分析各供应线的阶段所需时间和延迟率。',
guideStep6Title:'风险检测设置',guideStep6Desc:'在风险检测标签中查看高风险供应线并设置自动警报规则。',
guideStep7Title:'成本分析',guideStep7Desc:'在成本分析标签中输入各项费用计算总到岸成本。',
guideStep8Title:'供应商评估',guideStep8Desc:'根据可靠性、延迟率和订单数评估供应商绩效。',
guideStep9Title:'实时同步确认',guideStep9Desc:'所有更改实时同步。创建采购单时库存和时间线自动更新。',
guideStep10Title:'仪表板综合检查',guideStep10Desc:'定期检查KPI卡片。',
guideStep11Title:'风险应对流程',guideStep11Desc:'高风险检测时：①联系供应商→②搜索替代→③Slack警报→④调整采购。',
guideStep12Title:'成本优化策略',guideStep12Desc:'定期执行成本分析，制定最优物流路线和通关策略。',
guideStep13Title:'按期间查询数据',guideStep13Desc:'使用各标签的期间选择功能筛选数据并分析趋势。',
guideStep14Title:'安全管理',guideStep14Desc:'系统自动检测并拦截XSS、SQL注入等安全威胁。',
guideStep15Title:'最终检查与常规化',guideStep15Desc:'每周一：KPI检查→高风险审查→采购状况检查→成本分析。',
guideTip1:'供应商可靠性低于85%时，务必确保替代供应商。',guideTip2:'交期超过14天的线路需提高安全库存水平。',guideTip3:'成本分析时遗漏关税和保险费会导致实际成本差异大。',guideTip4:'高风险线路超过3条时应立即检讨供应链多元化策略。',guideTip5:'将准时率目标定为95%以上可最大限度降低缺货风险。',
guideTabTimelineDesc:'供应线各阶段追踪和进度可视化管理。',guideTabSuppliersDesc:'供应商注册、评估和联系方式管理。',guideTabInventoryDesc:'按位置分类实时监控全部库存。',guideTabPODesc:'采购单创建、状态跟踪和费用管理。',guideTabLeadTimeDesc:'分析各供应线的交期。',guideTabRiskDesc:'高风险供应线检测和自动警报管理。',guideTabLandedCostDesc:'计算进口产品的总到岸成本。',guideTabGuideDesc:'初学者详细指南和专家建议。',
guideReadyTitle:'准备就绪！开始供应链管理',guideReadyDesc:'前往供应商管理标签注册您的第一个供应商。',guideFaqTitle:'常见问题',
guideFaq1Q:'数据未显示',guideFaq1A:'请先在供应商管理标签中注册供应商并创建供应线。',guideFaq2Q:'风险检测不工作',guideFaq2A:'仅在供应线风险属性设为"high"时显示。',guideFaq3Q:'如何更改采购单状态？',guideFaq3A:'采购单创建时自动设为"草稿"状态。',guideFaq4Q:'成本分析结果为0',guideFaq4A:'请在各费用项目中输入金额后点击"计算"按钮。',guideFaq5Q:'实时同步不工作',guideFaq5A:'每30秒自动同步。需要即时更新请刷新页面。',
periodLabel:'期间',periodFrom:'开始日期',periodTo:'结束日期'
},
'zh-TW':{
kpiLines:'供應線',kpiSuppliers:'供應商',kpiHighRisk:'高風險',kpiAvgLead:'平均交期',kpiTotalCost:'總成本',kpiOnTime:'準時率',
productName:'產品名',supplier:'供應商',labelSku:'SKU',leadTime:'交期',days:'天',country:'國家',category:'類別',delayRate:'延遲率',contact:'聯絡方式',reliability:'可靠性',orderCount:'訂單數',
addLine:'新增線路',addSupplier:'新增供應商',register:'註冊',cancel:'取消',confirmDelete:'確定刪除？',
normal:'正常',highRisk:'高風險',supplyRisk:'供應風險',contactSupplier:'聯絡供應商',altSupplierSearch:'搜尋替代供應商',slackNotify:'Slack通知',autoRiskRules:'自動風險規則',addRule:'新增規則',ruleName:'規則名',ruleAction:'動作',noRisk:'未偵測到風險。',
invTotal:'總庫存',invTransit:'運輸中',invWarehouse:'倉庫',invSupplier:'供應商',invQty:'數量',invStatus:'狀態',invLocation:'位置',invUpdated:'更新時間',
tabPOTitle:'採購管理',poCreate:'建立採購單',poSelectSupplier:'選擇供應商',poUnitCost:'單價',poTotalCost:'總計',poNotes:'備註',poDate:'日期',
poStatusDraft:'草稿',poStatusPending:'待審核',poStatusApproved:'已核准',poStatusShipped:'已出貨',poStatusReceived:'已收貨',poStatusCancelled:'已取消',
lcProductCost:'產品成本',lcShipping:'運費',lcCustoms:'關稅',lcInsurance:'保險費',lcHandling:'處理費',lcOther:'其他費用',lcCalculate:'計算',lcResult:'分析結果',lcDesc:'計算進口產品的總到岸成本。',
securityAlert:'安全威脅偵測',securityDesc:'惡意輸入已被攔截。',securityDismiss:'確認並攔截',totalPO:'採購總額',
guideTitle:'供應鏈管理指南',guideSub:'按照本指南操作，即使初學者也能完美使用供應鏈管理系統。',
guideStepsTitle:'分步指南',guideTipsTitle:'專家建議',guideTabsTitle:'標籤功能說明',guideBeginnerBadge:'初學者指南',guideTimeBadge:'10分鐘',guideLangBadge:'12種語言',
guideWhereToStart:'從哪裡開始？',guideWhereToStartDesc:'1. 在供應商管理標籤中註冊供應商。2. 在供應時間線標籤中建立供應線。3. 在採購管理標籤中建立採購單。4. 在庫存標籤中監控庫存。5. 在風險偵測標籤中設定自動警報規則。',
guideStep1Title:'註冊供應商',guideStep1Desc:'在供應商管理標籤中輸入供應商資訊進行註冊。',guideStep2Title:'建立供應線',guideStep2Desc:'在供應時間線標籤中建立產品供應線，追蹤各階段。',guideStep3Title:'建立採購單',guideStep3Desc:'選擇供應商，輸入產品、數量和單價建立採購單。',guideStep4Title:'庫存監控',guideStep4Desc:'實時查看總庫存、運輸中和倉庫庫存。',guideStep5Title:'交期分析',guideStep5Desc:'分析各供應線的階段所需時間和延遲率。',guideStep6Title:'風險偵測設定',guideStep6Desc:'查看高風險供應線並設定自動警報規則。',guideStep7Title:'成本分析',guideStep7Desc:'輸入各項費用計算總到岸成本。',guideStep8Title:'供應商評估',guideStep8Desc:'根據可靠性、延遲率和訂單數評估供應商績效。',guideStep9Title:'即時同步確認',guideStep9Desc:'所有變更即時同步。',guideStep10Title:'儀表板綜合檢查',guideStep10Desc:'定期檢查KPI卡片。',guideStep11Title:'風險應對流程',guideStep11Desc:'高風險偵測時：①聯絡供應商→②搜尋替代→③Slack警報→④調整採購。',guideStep12Title:'成本最佳化策略',guideStep12Desc:'定期執行成本分析，制定最佳物流路線。',guideStep13Title:'按期間查詢資料',guideStep13Desc:'使用期間選擇功能篩選資料並分析趨勢。',guideStep14Title:'安全管理',guideStep14Desc:'系統自動偵測並攔截安全威脅。',guideStep15Title:'最終檢查與常規化',guideStep15Desc:'每週一：KPI檢查→高風險審查→採購狀況檢查→成本分析。',
guideTip1:'供應商可靠性低於85%時務必確保替代供應商。',guideTip2:'交期超過14天需提高安全庫存水平。',guideTip3:'成本分析時遺漏關稅和保險費會導致差異。',guideTip4:'高風險線路超過3條應檢討多元化策略。',guideTip5:'準時率目標95%以上可降低缺貨風險。',
guideTabTimelineDesc:'供應線各階段追蹤和進度管理。',guideTabSuppliersDesc:'供應商註冊、評估和聯絡管理。',guideTabInventoryDesc:'按位置分類即時監控庫存。',guideTabPODesc:'採購單建立、狀態追蹤和費用管理。',guideTabLeadTimeDesc:'分析各供應線的交期。',guideTabRiskDesc:'高風險供應線偵測和自動警報管理。',guideTabLandedCostDesc:'計算進口產品的總到岸成本。',guideTabGuideDesc:'初學者詳細指南和專家建議。',
guideReadyTitle:'準備就緒！開始供應鏈管理',guideReadyDesc:'前往供應商管理標籤註冊您的第一個供應商。',guideFaqTitle:'常見問題',
guideFaq1Q:'資料未顯示',guideFaq1A:'請先註冊供應商並建立供應線。',guideFaq2Q:'風險偵測不工作',guideFaq2A:'僅在風險屬性設為"high"時顯示。',guideFaq3Q:'如何變更採購單狀態？',guideFaq3A:'採購單建立時自動設為"草稿"。',guideFaq4Q:'成本分析結果為0',guideFaq4A:'請輸入金額後點擊"計算"按鈕。',guideFaq5Q:'即時同步不工作',guideFaq5A:'每30秒自動同步。需即時更新請重新整理頁面。',
periodLabel:'期間',periodFrom:'開始日期',periodTo:'結束日期'
}
};

// Apply translations
Object.keys(TR).forEach(lang=>{
  const path=DIR+lang+'.js';
  let src=fs.readFileSync(path,'utf8');
  const block=src.match(/supplyChain\s*:\s*\{[\s\S]*?\n\s{0,2}\}/);
  if(!block){console.log('SKIP',lang,'- no supplyChain block');return;}
  let b=block[0];
  const t=TR[lang];
  Object.keys(t).forEach(k=>{
    // Replace existing key value
    const re=new RegExp("'"+k+"'\\s*:\\s*'[^']*'");
    if(b.match(re)){
      b=b.replace(re,"'"+k+"': '"+t[k].replace(/'/g,"\\'")+"'");
    }
  });
  src=src.replace(block[0],b);
  fs.writeFileSync(path,src,'utf8');
  console.log('FIXED:',lang);
});
console.log('Part 1 done: ja, zh, zh-TW');
