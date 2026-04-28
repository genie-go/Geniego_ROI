const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'src/i18n/locales');
const T={
ja:{title:"カカオチャネルマーケティング",subTitle:"キャンペーン・テンプレート・設定 統合カカオマーケティングシステム",tabCamp:"📋 キャンペーン管理",tabTpl:"📝 テンプレート管理",tabSet:"⚙️ チャネル設定",tabCreative:"クリエイティブスコア",tabGuide:"利用ガイド",noChannels:"接続されたカカオチャネルがありません。連携ハブでAPIキーを登録してください。",goHub:"連携ハブへ移動",connectedChannels:"連携チャネル",secLockTitle:"セキュリティ警告検出",secLockDesc:"異常なアクセスが検出されブロックされました。",dismiss:"確認",msgSaveDone:"保存完了",msgSaveFail:"保存失敗",errGeneral:"エラーが発生しました",setTit:"チャネル設定",setDesc:"カカオアラートトークを使用するには、カカオビジネスでチャネルを開設しSender Keyを登録してください。",fName:"キャンペーン名*",pName:"キャンペーン名を入力",fId:"カカオチャネルID",pId:"@ハンドル",fSender:"送信プロフィールキー",pSender:"送信キーを入力",fApi:"APIキー",pApi:"APIキーを入力",btnSaving:"保存中...",btnSave:"💾 保存",msgTplReq:"必須項目を入力してください",msgTestPhone:"電話番号を入力してください",btnDelConfirm:"削除しますか？",tplRegTit:"テンプレート登録",fTplCode:"テンプレートコード",pTplCode:"コードを入力",fTplName:"テンプレート名*",pTplName:"テンプレート名を入力",fMsgType:"メッセージタイプ",optAt:"アラートトーク(AT)",optFt:"フレンドトーク(FT)",fContent:"内容",pContent:"メッセージ内容を入力",btnTplSave:"テンプレート保存",testTit:"テスト送信",pPhone:"010-0000-0000",pCustName:"受信者名",msgTestDone:"送信完了",lblContent:"内容",lblCode:"コード",lblType:"タイプ",testBtnIng:"...",testBtn:"テスト",testBtnDel:"削除",emptyTpl:"登録されたテンプレートがありません",msgCampDone:"キャンペーンが作成されました！",msgSendConfirm:"このキャンペーンを全対象に送信しますか？",msgSendSucc:"送信成功",msgSendFail2:"失敗: ",msgSendFailT:"❌ 送信失敗",delConfirm:"このキャンペーンを削除しますか？",colName:"キャンペーン名",colTpl:"テンプレート",colTarget:"対象",colSendCnt:"送信数",colSucc:"成功",colFail:"失敗",colStat:"状態",colAction:"アクション",valAll:"全体",campNew:"新規キャンペーン",fCampName:"キャンペーン名",fCampTpl:"テンプレート選択",optSel:"選択",fTarget:"セグメント",optAll:"全体",btnCampCreate:"キャンペーン作成",exportCsv:"CSVエクスポート",campStat:"キャンペーン現況",btnSending:"送信中...",btnSend:"送信",btnDel:"削除",emptyCamp:"キャンペーンがありません。上で最初のキャンペーンを作成してください。",guideTitle:"カカオチャネルガイド",guideSub:"カカオアラートトーク/フレンドトークキャンペーン作成、テンプレート管理、チャネル設定方法をステップバイステップで案内します。",guideStepsTitle:"活用ステップ",guideStep1Title:"チャネル設定",guideStep1Desc:"カカオビジネスでチャネルを開設しAPIキー、送信プロフィールキーを登録します。",guideStep2Title:"テンプレート登録",guideStep2Desc:"アラートトーク(AT)またはフレンドトーク(FT)メッセージテンプレートを登録しテストします。",guideStep3Title:"キャンペーン作成",guideStep3Desc:"キャンペーン名、テンプレート、ターゲットセグメントを選択してキャンペーンを作成します。",guideStep4Title:"送信＆成果確認",guideStep4Desc:"キャンペーンを送信し成功/失敗状況をリアルタイムでモニタリングします。",guideStep5Title:"予約送信活用",guideStep5Desc:"最適な時間にメッセージが送信されるよう予約送信を設定します。",guideStep6Title:"費用分析",guideStep6Desc:"件あたり費用と総費用を追跡しROIを最適化します。",guideTabsTitle:"タブ別ガイド",guideCampName:"キャンペーン管理",guideCampDesc:"キャンペーンを作成・送信し成果テーブルを管理します。",guideTplName:"テンプレート管理",guideTplDesc:"アラートトーク/フレンドトークテンプレートを登録しテストします。",guideSetName:"チャネル設定",guideSetDesc:"カカオAPIキー、Senderキー、送信モードを設定します。",guideCreativeName:"🎨 クリエイティブ",guideCreativeDesc:"カカオ広告クリエイティブを管理し効果を分析します。",guideTipsTitle:"エキスパートのヒント",guideTip1:"アラートトーク(AT)は情報メッセージ、フレンドトーク(FT)はマーケティングメッセージに適しています。",guideTip2:"テスト送信後必ず受信確認をしてください。",guideTip3:"セグメント別にメッセージを差別化するとクリック率が大幅に向上します。",guideTip4:"予約送信で午前10時〜午後2時のゴールデンタイムに送信してください。",guideTip5:"すべての送信データはCRMおよびジャーニーとリアルタイム同期されます。",liveSyncStatus:"リアルタイムクロスタブ同期アクティブ",syncNow:"今すぐ同期",statCamp:"総キャンペーン",statSent:"総送信",statSucc:"成功",statFail:"失敗"},
zh:{title:"Kakao频道营销",subTitle:"活动·模板·设置 统一Kakao营销系统",tabCamp:"📋 活动管理",tabTpl:"📝 模板管理",tabSet:"⚙️ 频道设置",tabCreative:"创意评分",tabGuide:"使用指南",noChannels:"未连接Kakao频道。请在集成中心注册API密钥。",goHub:"前往集成中心",connectedChannels:"已连接频道",secLockTitle:"安全警告",secLockDesc:"检测到异常访问并已阻止。",dismiss:"确认",msgSaveDone:"保存完成",msgSaveFail:"保存失败",errGeneral:"发生错误",setTit:"频道设置",setDesc:"要使用Kakao通知消息,请在Kakao Business开设频道并注册Sender Key。",fName:"活动名称*",pName:"请输入活动名称",fId:"Kakao频道ID",pId:"@句柄",fSender:"发送配置文件密钥",pSender:"请输入发送密钥",fApi:"API密钥",pApi:"请输入API密钥",btnSaving:"保存中...",btnSave:"💾 保存",msgTplReq:"请填写必填项",msgTestPhone:"请输入电话号码",btnDelConfirm:"确定要删除吗？",tplRegTit:"模板注册",fTplCode:"模板代码",pTplCode:"请输入代码",fTplName:"模板名称*",pTplName:"请输入模板名称",fMsgType:"消息类型",optAt:"通知消息(AT)",optFt:"好友消息(FT)",fContent:"内容",pContent:"请输入消息内容",btnTplSave:"保存模板",testTit:"测试发送",pPhone:"010-0000-0000",pCustName:"收件人姓名",msgTestDone:"发送完成",lblContent:"内容",lblCode:"代码",lblType:"类型",testBtnIng:"...",testBtn:"测试",testBtnDel:"删除",emptyTpl:"没有已注册的模板",msgCampDone:"活动已创建！",msgSendConfirm:"确定要向所有目标发送此活动吗？",msgSendSucc:"发送成功",msgSendFail2:"失败: ",msgSendFailT:"❌ 发送失败",delConfirm:"确定要删除此活动吗？",colName:"活动名称",colTpl:"模板",colTarget:"目标",colSendCnt:"发送数",colSucc:"成功",colFail:"失败",colStat:"状态",colAction:"操作",valAll:"全部",campNew:"新建活动",fCampName:"活动名称",fCampTpl:"选择模板",optSel:"选择",fTarget:"细分",optAll:"全部",btnCampCreate:"创建活动",exportCsv:"导出CSV",campStat:"活动状态",btnSending:"发送中...",btnSend:"发送",btnDel:"删除",emptyCamp:"没有活动。请在上方创建第一个活动。",guideTitle:"Kakao频道指南",guideSub:"逐步指导Kakao通知消息/好友消息活动创建、模板管理和频道设置方法。",guideStepsTitle:"使用步骤",guideStep1Title:"频道设置",guideStep1Desc:"在Kakao Business开设频道并注册API密钥和发送配置文件密钥。",guideStep2Title:"模板注册",guideStep2Desc:"注册并测试通知消息(AT)或好友消息(FT)模板。",guideStep3Title:"创建活动",guideStep3Desc:"选择活动名称、模板和目标细分来创建活动。",guideStep4Title:"发送和绩效确认",guideStep4Desc:"发送活动并实时监控成功/失败状态。",guideStep5Title:"预约发送",guideStep5Desc:"设置预约发送以在最佳时间发送消息。",guideStep6Title:"成本分析",guideStep6Desc:"跟踪每条消息成本和总成本以优化ROI。",guideTabsTitle:"标签指南",guideCampName:"活动管理",guideCampDesc:"创建和发送活动并管理绩效表。",guideTplName:"模板管理",guideTplDesc:"注册和测试通知消息/好友消息模板。",guideSetName:"频道设置",guideSetDesc:"设置Kakao API密钥、Sender密钥和发送模式。",guideCreativeName:"🎨 创意",guideCreativeDesc:"管理Kakao广告创意并分析效果。",guideTipsTitle:"专家提示",guideTip1:"通知消息(AT)适合信息性消息,好友消息(FT)适合营销消息。",guideTip2:"测试发送后务必确认接收。",guideTip3:"按细分差异化消息可大幅提高点击率。",guideTip4:"使用预约发送在上午10点至下午2点的黄金时段发送。",guideTip5:"所有发送数据与CRM和旅程实时同步。",liveSyncStatus:"实时跨标签同步已激活",syncNow:"立即同步",statCamp:"总活动",statSent:"总发送",statSucc:"成功",statFail:"失败"},
};
// Generate other languages from English base
const en=require('./src/i18n/locales/en.js').default||require('./src/i18n/locales/en.js');
const enK=en.kakao||{};
const langs=['de','es','fr','pt','ru','ar','hi','id','th','vi','zh-TW'];
// For languages without specific translations, use English as base
langs.forEach(lang=>{
  if(!T[lang]) T[lang]={...enK};
});
// zh-TW from zh simplified
if(T.zh) T['zh-TW']={...T.zh,title:"Kakao頻道行銷",subTitle:"活動·範本·設定 統一Kakao行銷系統",tabCamp:"📋 活動管理",tabTpl:"📝 範本管理",tabSet:"⚙️ 頻道設定",tabGuide:"使用指南"};

// Now inject into each locale file
Object.keys(T).forEach(lang=>{
  const fp=path.join(dir,`${lang}.js`);
  if(!fs.existsSync(fp)){console.log(`SKIP ${lang} - file not found`);return;}
  let src=fs.readFileSync(fp,'utf8');
  // Check if kakao section already exists
  if(src.includes('"kakao":{') || src.includes('"kakao":{')){
    // Replace existing kakao section
    const kakaoJson=JSON.stringify(T[lang]);
    src=src.replace(/"kakao":\{[^}]*(?:\{[^}]*\}[^}]*)*\}/,`"kakao":${kakaoJson}`);
  } else {
    // Add kakao section before the last closing brace
    const kakaoJson=JSON.stringify(T[lang]);
    const lastBrace=src.lastIndexOf('}');
    if(lastBrace>0){
      src=src.slice(0,lastBrace)+`,"kakao":${kakaoJson}`+src.slice(lastBrace);
    }
  }
  fs.writeFileSync(fp,src,'utf8');
  console.log(`✅ ${lang}.js - kakao section injected (${Object.keys(T[lang]).length} keys)`);
});
console.log('ALL DONE');
