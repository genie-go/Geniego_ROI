const fs = require('fs');

const D = {
    email: {
        "title": "メールマーケティング",
        "subTitle": "テンプレート作成・セグメント配信・CRM自動同期",
        "tabCamp": "📊 キャンペーン",
        "tabAi": "🤖 AI生成",
        "tabAb": "🧪 A/Bテスト",
        "tabEditor": "🎨 ブロックビルダー",
        "tabTpl": "📝 テンプレート",
        "tabSettings": "⚙️ 設定",
        "cNew": "✉️ 新規キャンペーン",
        "fName": "キャンペーン名*",
        "fTpl": "テンプレート",
        "fTarget": "ターゲット（未選択時：全体）",
        "optSel": "-- 選択 --",
        "optAll": "全顧客",
        "btnCreate": "キャンペーン作成",
        "cStat": "📊 キャンペーンステータス",
        "colName": "キャンペーン名",
        "colTpl": "テンプレート",
        "colTarget": "セグメント",
        "colSent": "送信数",
        "colOpen": "開封率",
        "colStatus": "ステータス",
        "colAction": "アクション",
        "emptyCamp": "進行中のキャンペーンはありません",
        "btnSend": "📤 送信",
        "btnSending": "送信中...",
        "msgSendConfirm": "送信してもよろしいですか？",
        "msgSendSucc": "送信完了（成功：",
        "msgSendFail": "失敗：",
        "msgSendErr": "送信失敗",
        "sSent": "送信完了",
        "sSched": "送信予定",
        "sDraft": "下書き",
        "crmLinked": "🔗 CRMセグメント連動キャンペーン",
        "aiMode": "🤖 AIメール生成 — デモ",
        "aiDesc": "APIキーなしでAIサンプルメールを生成",
        "aiProd": "商品/サービス",
        "aiProdPh": "例: AirPods Pro",
        "aiAud": "対象顧客",
        "aiAudPh": "例: VIP顧客",
        "aiGoal": "目標",
        "aiGoalPh": "例: 購入コンバージョン",
        "aiTone": "トーン＆スタイル",
        "aiTonePh": "例: 親しみやすく専門的",
        "aiPromo": "プロモーション",
        "aiPromoPh": "例: 20%割引",
        "btnAiCreate": "✨ AIメール生成",
        "btnAiCreating": "⏳ 生成中...",
        "tplNew": "+ 新規テンプレート",
        "tplEdit": "テンプレート編集",
        "tplCreate": "新規テンプレート作成",
        "tfName": "テンプレート名*",
        "tfCat": "カテゴリ",
        "tfSubj": "件名*",
        "tfBody": "HTML本文* (変数: {{name}})",
        "btnSave": "保存する",
        "btnTplSave": "テンプレート保存",
        "btnEditSave": "編集保存",
        "abTitle": "🧪 メール A/B テスト",
        "abDesc": "件名・送信者・本文・CTAのA/B比較と統計的有意性分析",
        "abNew": "+ 新規 A/Bテスト",
        "abCancel": "キャンセル",
        "setSmtp": "SMTP 設定",
        "setSaveBtn": "設定保存"
    },
    kakao: {
        "title": "カカオチャンネル",
        "subTitle": "カカオトークのメッセージ送信、Alimtalk / Friendtalk 統合管理",
        "tabCamp": "📊 キャンペーン",
        "tabTpl": "📝 テンプレート",
        "tabSettings": "⚙️ 設定",
        "cNew": "✉️ 新規キャンペーン",
        "fName": "キャンペーン名*",
        "fType": "キャンペーンタイプ",
        "optAlim": "Alimtalk (情報送信)",
        "optFriend": "Friendtalk (広告/プロモ)",
        "fTpl": "テンプレート",
        "fTarget": "ターゲットセグメント",
        "optSel": "-- 選択 --",
        "optAll": "全顧客",
        "btnCreate": "キャンペーン作成",
        "cStat": "📊 キャンペーンステータス",
        "colName": "キャンペーン名",
        "colType": "タイプ",
        "colTpl": "テンプレート",
        "colTarget": "セグメント",
        "colSent": "送信数",
        "colOpen": "開封率",
        "colConv": "コンバージョン",
        "colRevenue": "収益",
        "colStatus": "ステータス",
        "colAction": "アクション",
        "emptyCamp": "進行中のキャンペーンはありません。",
        "btnSend": "📤 送信",
        "btnSending": "送信中...",
        "tplNew": "+ 新規テンプレート",
        "tplCreate": "新規テンプレート作成",
        "tfName": "テンプレート名*",
        "tfCat": "カテゴリ",
        "tfType": "タイプ",
        "tfMsg": "本文メッセージ* (変数: {{name}})",
        "tfBtn": "ボタン名 (任意)",
        "tfLink": "リンクURL (任意)",
        "btnSave": "テンプレート保存",
        "setBiz": "Bizメッセージ設定",
        "setPfToken": "プロファイルトークン",
        "setSender": "送信者番号",
        "setSave": "設定保存"
    }
};

let ja = fs.readFileSync('frontend/src/i18n/locales/ja.js', 'utf8');

// 1. Remove previously wrongly injected email object at the top!
ja = ja.replace(/email:\s*\{[\s\S]*?(?=},\s*crm)/, ''); 
// The above regex might be fragile if 'crm' is not following it verbatim. 
// A simpler way: we don't care about garbage inside `crm:` at the root anyway, since `ja.crm = ` overwrites it all.

// 2. Inject email and kakao into `ja.crm = {`
const payload = "ja.crm = {\n" + 
    "  email: " + JSON.stringify(D.email, null, 4) + ",\n" +
    "  kakao: " + JSON.stringify(D.kakao, null, 4) + ",";

ja = ja.replace("ja.crm = {", payload);

fs.writeFileSync('frontend/src/i18n/locales/ja.js', ja, 'utf8');
console.log('Injected email and kakao directly into ja.crm = { at the end of ja.js!');
