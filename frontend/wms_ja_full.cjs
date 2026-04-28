// Generate complete WMS translations for Japanese (ja) 
// Apply them via direct JSON object manipulation
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'src/i18n/locales');
const fp=path.join(DIR,'ja.js');
const c=fs.readFileSync(fp,'utf8');
const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const obj=eval('('+m[1]+')');

// Complete Japanese WMS translations
const JA={
// Security/Permission/Audit UI
securityBtn:'🛡️ セキュリティモニター',securityTitle:'セキュリティ脅威検知モニター',securityDesc:'リアルタイムセキュリティ脅威検知・ブロック',securitySafe:'セキュリティステータス：安全',securitySafeDesc:'セキュリティ脅威は検出されていません。',
permBtn:'🔑 権限管理',permTitle:'倉庫別ユーザー権限管理',permDesc:'ユーザー別の倉庫アクセス権限を管理します。役割によって権限が異なります。',permUserLabel:'ユーザーメール',permRoleLabel:'役割',permAddBtn:'権限追加',permColUser:'ユーザー',permColRole:'役割',permColAction:'管理',permRoleAdmin:'管理者',permRoleManager:'マネージャー',permRoleOperator:'作業者',permRoleViewer:'閲覧者',permEmpty:'権限が登録されていません。ユーザーを追加してください。',
auditLogBtn:'📋 移動履歴',auditLogTitle:'📋 在庫移動履歴（監査証跡）',auditLogDesc:'すべての在庫変動の不変ログ。最大500件。',auditLogEmpty:'移動履歴はありません。',auditLogClearBtn:'🗑 履歴削除',auditLogClearConfirm:'すべての履歴を削除しますか？元に戻せません。',
exportCsvBtn:'📥 CSVエクスポート',exportExcelBtn:'📋 Excelエクスポート',
// CSV Import
csvImportBtn:'📥 CSV一括インポート',csvImportTitle:'CSV一括インポート',csvImportDesc:'CSVファイルでSKU/在庫を一括登録します。必須列：',csvRowsDetected:'件検出',csvMoreRows:'さらに表示',csvExecuteBtn:'一括登録実行',csvImportDone:'件インポート完了！',
// Barcode Scanner
scanBtn:'📷 バーコードスキャン',scanTitle:'バーコードスキャナー',scanScanning:'バーコードをスキャンエリアに合わせてください...',scanDetected:'バーコード検出！',scanApply:'このSKUを適用',scanCamError:'カメラアクセスが拒否されました。ブラウザの権限を確認してください。',
// Warehouse tab
whTitle:'📦 倉庫一覧',whEmpty:'倉庫が未登録です。[+ 倉庫追加] ボタンで登録してください。',whAddBtn:'+ 倉庫追加',whFormTitle:'倉庫情報入力',whNameLabel:'倉庫名',whCodeLabel:'倉庫コード',whAddrLabel:'住所',whTypeLabel:'タイプ',whAreaLabel:'面積(㎡)',whManagerLabel:'管理者',whTypeNormal:'常温',whTypeCold:'冷蔵',whTypeFrozen:'冷凍',whSaveBtn:'保存',whCancelBtn:'キャンセル',whDeleteConfirm:'この倉庫を削除しますか？',
// Inventory tab
invTableTitle:'📦 SKU別倉庫在庫現況',invColSku:'SKU',invColProduct:'商品名',invColTotal:'合計',invColSafe:'安全在庫',invColStatus:'状態',invColCost:'単価',invColValue:'在庫価値',invColAdj:'調整',invSearchPh:'SKUまたは商品名で検索',invLowOnly:'⚠️ 在庫不足のみ',invTotalStock:'総在庫',invNoResult:'🔍 検索結果がありません。',invOutOfStock:'品切れ',invLow:'不足',invNormal:'正常',invAdjTitle:'在庫調整',invAdjQty:'調整数量',invAdjApply:'調整適用',invAdjBtn:'調整',invDemoAdj:'デモモード：在庫調整はできません。',
// InOut tab
ioSearchPh:'SKU・商品名・参照番号で検索',ioItems:'件',ioRegTitle:'📝 入出庫登録',ioTypeLabel:'入出庫タイプ',ioWhLabel:'倉庫',ioTransferDest:'移動先倉庫',ioSkuLabel:'SKU',ioProductLabel:'商品名',ioQtyLabel:'数量',ioUnitLabel:'単価',ioRefLabel:'参照番号',ioRefPh:'PO-2024-001',ioMemoLabel:'メモ',ioReturnReason:'返品理由',ioReturnReasonPh:'返品理由を入力',ioSaveBtn:'✅ 登録',ioColType:'タイプ',ioColWh:'倉庫',ioColSku:'SKU',ioColProduct:'商品名',ioColQty:'数量',ioColUnit:'単価',ioColRef:'参照',ioColBy:'担当者',ioColDate:'日付',
ioRegBtn:'+ 入出庫登録',ioExportBtn:'📥 CSVダウンロード',
ioTypeInbound:'入庫',ioTypeOutbound:'出庫',ioTypeReturnsIn:'返品入庫',ioTypeReturnsOut:'返品出庫',ioTypeTransfer:'倉庫間移動',ioTypeAdjust:'調整',ioTypeDisposal:'廃棄',
ioEmpty:'入出庫記録がありません。',
// Receiving tab
recvTitle:'📋 入庫検収',recvSearchPh:'PO番号またはSKUで検索',recvPoNumber:'PO番号',recvSku:'SKU',recvProduct:'商品名',recvExpected:'予定数量',recvActual:'実受入数',recvStatus:'状態',recvAction:'処理',recvBtnAccept:'検収完了',recvBtnPartial:'部分入庫',recvBtnReject:'拒否',recvStatusPending:'検収待ち',recvStatusAccepted:'検収完了',recvStatusPartial:'部分入庫',recvStatusRejected:'拒否',recvEmpty:'検収待ちの入庫がありません。',
// Picking/Packing tab
pickTitle:'📋 ピッキング/パッキング',pickSearchPh:'注文番号またはSKUで検索',pickOrderNo:'注文番号',pickSku:'SKU',pickProduct:'商品名',pickQty:'数量',pickStatus:'状態',pickAction:'処理',pickBtnPick:'ピッキング',pickBtnPack:'パッキング',pickBtnShip:'出荷',pickStatusReady:'準備中',pickStatusPicking:'ピッキング中',pickStatusPacked:'パッキング完了',pickStatusShipped:'出荷済み',pickEmpty:'ピッキング注文がありません。',
// Lot/Expiry tab
lotTitle:'📋 ロット/有効期限管理',lotSearchPh:'ロット番号またはSKUで検索',lotColLot:'ロット番号',lotColSku:'SKU',lotColProduct:'商品名',lotColExpiry:'有効期限',lotColQty:'数量',lotColStatus:'状態',lotExpired:'期限切れ',lotExpiringSoon:'期限間近',lotActive:'有効',lotEmpty:'ロット情報がありません。',
// Replenishment tab (Auto PO)
replTitle:'📋 自動発注(PO)管理',replSearchPh:'SKUまたは商品名で検索',replColSku:'SKU',replColProduct:'商品名',replColCurrent:'現在庫',replColSafe:'安全在庫',replColReorder:'発注点',replColStatus:'状態',replColAction:'処理',replBtnOrder:'発注',replStatusAuto:'自動発注',replStatusManual:'手動',replEmpty:'発注対象の商品がありません。',
// Combine (合包装) tab
combTitle:'📋 合包装管理',combSearchPh:'注文番号で検索',combColOrder:'注文番号',combColItems:'商品数',combColWeight:'総重量',combColStatus:'状態',combColAction:'処理',combBtnCombine:'合包装',combStatusReady:'準備中',combStatusCombined:'合包済み',combEmpty:'合包装対象がありません。',combTracking:'📦 追跡',
// Carrier tab
carrTitle:'📋 運送会社管理',carrSearchPh:'運送会社名で検索',carrColName:'運送会社名',carrColCode:'コード',carrColType:'タイプ',carrColApi:'API連携',carrColStatus:'状態',carrBtnAdd:'+ 運送会社追加',carrTypeDomestic:'国内',carrTypeInternational:'国際',carrApiConnected:'連携済み',carrApiDisconnected:'未連携',carrEmpty:'運送会社が登録されていません。',
// Tracking tab
trackTitle:'📋 配送追跡',trackSearchTitle:'🔍 運送状番号で追跡',trackSearchPh:'運送状番号を入力',trackSearchBtn:'追跡する',trackSearching:'検索中...',trackNumPh:'運送状番号を入力',trackNoResult:'追跡結果が見つかりません。',
trackCJ:'CJ大韓通運',trackHJ:'韓進宅配',trackLT:'ロッテ宅配',trackEMS:'郵便局宅配',trackCPR:'クーパンロケット配送',trackLZ:'ロジェン宅配',
trackStatusInTransit:'配送中',trackEtaToday:'到着予定：本日午後',
trackLoc1:'ソウル江南配送センター',trackDesc1:'発送済み',trackLoc2:'首都圏ハブ',trackDesc2:'仕分け完了',trackLoc3:'仁川物流センター',trackDesc3:'幹線到着',trackLoc4:'釜山発送センター',trackDesc4:'発送',
// Invoice tab
invcTitle:'📋 コマーシャルインボイス',invcSearchPh:'インボイス番号で検索',invcColNo:'番号',invcColDate:'日付',invcColBuyer:'購入者',invcColTotal:'合計金額',invcColCurrency:'通貨',invcColStatus:'状態',invcBtnCreate:'+ インボイス作成',invcStatusDraft:'下書き',invcStatusIssued:'発行済み',invcStatusPaid:'支払済み',invcEmpty:'インボイスがありません。',
// Bundle/BOM tab
bdlTitle:'📋 バンドル/BOM管理',bdlSearchPh:'バンドル名で検索',bdlColName:'バンドル名',bdlColSku:'SKU',bdlColComponents:'構成品',bdlColStock:'在庫',bdlColStatus:'状態',bdlBtnAdd:'+ バンドル追加',bdlEmpty:'バンドルが登録されていません。',
bdlShipAlert:'バンドル出荷：',bdlRegAlert:'バンドル登録完了：',bdlNamePh:'バンドル名を入力',bdlQtyLabel:'数量',
// Supplier tab
supTitle:'📋 取引先管理',supSearchPh:'取引先名で検索',supColName:'取引先名',supColContact:'連絡先',supColLeadTime:'リードタイム',supColRating:'評価',supColAction:'処理',supBtnAdd:'+ 取引先追加',supEmpty:'取引先が登録されていません。',
// Audit (実査) tab
auditTitle:'📋 在庫実査',auditSearchPh:'SKUまたは倉庫で検索',auditColSku:'SKU',auditColProduct:'商品名',auditColSystem:'帳簿在庫',auditColPhysical:'実物在庫',auditColDiff:'差異',auditColAction:'処理',auditBtnCount:'実査',auditBtnAdjust:'調整',auditEmpty:'実査対象がありません。',
auditAdjAlert:'在庫調整完了',auditAllSku:'全SKU',
// Misc/shared
pageSub:'入庫・配送・在庫・ピッキング・パッキング・返品統合管理',
totalStock:'総在庫',returnRate:'返品率',pendingReceive:'入庫待ち',pendingShip:'出荷保留',
registerReceipt:'入庫登録',processShipment:'出荷処理',adjustInventory:'在庫調整',
sku:'SKU',quantity:'数量',location:'場所',warehouse:'倉庫',status:'状態',actions:'操作',
bulkXlsxError:'Excelファイルの解析に失敗しました。形式を確認してください。',
// Warehouse List
whListTitle:'📦 倉庫一覧',
// Guide missing keys
guideS1T:'倉庫登録',guideS1D:'WMS倉庫タブで新しい倉庫を登録します。倉庫名、住所、タイプ、管理者を入力します。',
guideS2T:'ゾーン設定',guideS2D:'倉庫内にゾーンとロケーションを設定して体系的に在庫を管理します。',
guideS3T:'商品マスター登録',guideS3D:'在庫タブでSKU、商品名、安全在庫を登録します。',
guideS4T:'入庫検収',guideS4D:'入庫検収タブで到着した商品の数量と品質を検査します。',
guideS5T:'在庫確認',guideS5D:'在庫現況タブでSKU別のリアルタイム在庫、安全在庫状態、在庫価値を確認します。',
guideS6T:'入出庫履歴',guideS6D:'すべての入出庫トランザクションを照会しCSVでエクスポートします。',
guideS7T:'ピッキングリスト作成',guideS7D:'ピッキング/パッキングタブで注文からピッキングリストを作成し出庫プロセスを管理します。',
guideS8T:'パッキング・出荷',guideS8D:'ピッキング完了後、梱包して送り状を貼付して出荷処理を行います。',
guideS9T:'ロット/有効期限管理',guideS9D:'ロット番号と有効期限を登録し、FIFOを自動適用します。',
guideS10T:'自動発注設定',guideS10D:'安全在庫に基づいて自動発注を設定します。',
guideS11T:'合包装管理',guideS11D:'複数SKUを1つの箱に合包装するルールを設定します。',
guideS12T:'運送会社管理',guideS12D:'宅配/特急便会社を登録しAPI連携を設定します。',
guideS13T:'配送追跡',guideS13D:'送り状番号でリアルタイム配送状況を追跡します。',
guideS14T:'インボイス発行',guideS14D:'出荷に対するコマーシャルインボイスを自動生成します。',
guideS15T:'バンドル/BOM',guideS15D:'セット商品のBOM構成を登録し在庫を連動します。',
guideS16T:'取引先管理',guideS16D:'取引先情報を登録し発注履歴を管理します。',
guideS17T:'在庫実査',guideS17D:'実物在庫とシステム在庫を比較し差異を調整します。',
guideS18T:'セキュリティ監視',guideS18D:'XSS/SQLインジェクションなどのセキュリティ脅威をリアルタイム監視します。',
guideS19T:'監査証跡',guideS19D:'すべての倉庫操作の監査ログを確認しCSVでエクスポートします。',
guideS20T:'運営最適化',guideS20D:'すべてのデータを分析し在庫回転率、適正在庫、出庫効率を継続改善します。',
guideQS1D:'WMS倉庫タブで倉庫を先に登録してください',guideQS2D:'入庫検収タブで商品を入庫処理します',guideQS3D:'在庫現況タブでリアルタイム在庫を確認します',guideQS4D:'ピッキング/パッキングタブで注文出庫を処理します',
};

// Apply to wms namespace
if(!obj.wms) obj.wms={};
Object.entries(JA).forEach(([k,v])=>{ obj.wms[k]=v; });

const output='export default '+JSON.stringify(obj)+'\n';
fs.writeFileSync(fp,output);
console.log('ja.js: '+Object.keys(JA).length+' WMS keys translated to Japanese');

// Validate
try{
    const m2=output.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    eval('('+m2[1]+')');
    console.log('ja.js: VALID');
}catch(e){
    console.log('ja.js: BROKEN -',e.message.slice(0,100));
}
