const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/EmailMarketing.jsx', 'utf8');

const regexList = [
    // AB Test
    [/Sender명/g, 'Sender Name', '送信者名'],
    [/Email Body 내용/g, 'Email Body Content', 'メール本文内容'],
    [/CTA 문구/g, 'CTA Text', 'CTAテキスト'],
    [/승자 결정 기준/g, 'Winner Criteria', '勝者決定基準'],
    [/A\/B 그룹 각 Rate\(%\)/g, 'A/B Group Rate (%)', 'A/Bグループ各レート(%)'],
    [/승자전송:/g, 'Winner Target:', '勝者送信:'],
    [/승자 결정 Pending\(Time\)/g, 'Winner Decision Pending Time', '勝者決定待機時間'],
    [/A\/B Test 시뮬레이션/g, 'A/B Test Simulation', 'A/Bテストシミュレーション'],
    [/A\/B Test Start/g, 'Start A/B Test', 'A/Bテスト開始'],
    [/샘플/g, 'Sample', 'サンプル'],
    [/승자기준:/g, 'Winner Criteria:', '勝者基準:'],
    [/신뢰Count준/g, 'Confidence Level', '信頼水準'],
    [/✅ 유의함/g, '✅ Significant', '✅ 有意'],
    [/⚠️ Add 관찰 필요/g, '⚠️ Needs Observation', '⚠️ 追加観察必要'],
    [/✅ Done ·/g, '✅ Done ·', '✅ 完了 ·'],
    [/안 승/g, ' Wins', ' 勝利'],
    [/✅/g, '✅ '],
    [/안이 Clicks율/g, ' Click Rate', '案のクリック率'],
    [/우위/g, 'Advantage', '優位'],
    [/나머지/g, 'Remaining', '残り'],
    [/Recipients에게 Auto Send Done/g, 'Recipients Auto Send Complete', '受信者に自動送信完了'],

    // Block Editor
    [/구분선/g, 'Divider', '区切り線'],
    [/푸터/g, 'Footer', 'フッター'],
    [/✉️ Subject을 입력하세요/g, '✉️ Enter Subject', '✉️ 件名を入力してください'],
    [/여기에 Body을 입력하세요\./g, 'Enter Body Here.', 'ここに本文を入力してください。'],
    [/지금 Confirm하기/g, 'Confirm Now', '今すぐ確認する'],
    [/할인/g, 'Discount', '割引'],
    [/Count신거부 \| Address: 서울시 강남구/g, 'Unsubscribe | Address: Gangnam, Seoul', '配信停止 | 住所: ソウル市江南区'],
    [/Image URL 입력/g, 'Enter Image URL', '画像URL入力'],
    [/Text색/g, 'Text Color', 'テキスト色'],
    [/Background색/g, 'Bg Color', '背景色'],
    [/글자/g, 'Font', '文字'],
    [/할인내용/g, 'Discount Details', '割引内容'],
    [/푸터 Text/g, 'Footer Text', 'フッターテキスト'],
    [/봄 시즌 세일/g, 'Spring Sale', '春のセール'],
    [/좌측: Block 팔레트/g, 'Left: Block Palette', '左: ブロックパレット'],
    [/Center: 캔버스/g, 'Center: Canvas', '中央: キャンバス'],
    [/✏️ 편집/g, '✏️ Edit', '✏️ 編集'],
    [/👁 미리보기/g, '👁 Preview', '👁 プレビュー'],
    [/✅ Save됨/g, '✅ Saved', '✅ 保存済み'],
    [/← 좌측에서 Block을 Select하여 Add하세요/g, '← Select and Add Blocks from Left', '← 左からブロックを選択して追加してください'],
    [/우측: 속성 Panel/g, 'Right: Property Panel', '右: プロパティパネル'],
    [/편집:/g, 'Edit:', '編集:'],
    [/↑ 위로/g, '↑ Up', '↑ 上へ'],
    [/↓ 아래로/g, '↓ Down', '↓ 下へ'],
    [/Block을 Select하면 속성을 편집할 Count 있습니다/g, 'Select block to edit properties', 'ブロックを選択するとプロパティを編集できます'],
    [/✅ Settings이 Save되었습니다/g, '✅ Settings Saved', '✅ 設定が保存されました'],
    [/❌ Save Failed/g, '❌ Save Failed', '❌ 保存失敗'],
    [/Send 방식/g, 'Send Method', '送信方式'],
    [/SMTP 호스트/g, 'SMTP Host', 'SMTPホスト'],
    [/포트/g, 'Port', 'ポート'],
    [/User명/g, 'Username', 'ユーザー名'],
    [/웰컴/g, 'Welcome', 'ウェルカム'],
    [/Pro모션/g, 'Promotion', 'プロモーション'],
    [/장바구니 이탈/g, 'Cart Abandonment', 'カート離脱'],
    [/재구매 유도/g, 'Repurchase Encouragement', '再購入促進'],
    [/Create 폼/g, 'Create Form', '作成フォーム'],
    [/명\)/g, ' persons)', '名)'],
    [/ex\. 에어팟 Pro 4세대/g, 'ex. AirPods Pro 4th Gen', '例: AirPods Pro 第4世代'],
    [/ex\. VIP Customer, 30대 여성/g, 'ex. VIP Customer, Women in 30s', '例: VIP顧客、30代女性'],
    [/ex\. 구매 Conversion, 재구매 유도/g, 'ex. Purchase Conversion, Repurchase', '例: 購入コンバージョン、再購入誘導'],
    [/ex\. 친근하고 전문적/g, 'ex. Friendly and Professional', '例: 親しみやすく専門的'],
    [/ex\. 20% 할인, Free 배송/g, 'ex. 20% Off, Free Shipping', '例: 20%割引、送料無料'],
    [/✨ Create 결과/g, '✨ Generate Result', '✨ 作成結果'],
    [/메인 Email Marketing Page/g, 'Main Email Marketing Page', 'メインメールマーケティングページ'],
    [/발신 Email/g, 'Sender Email', '送信元メール'],
    [/💡 Mock 모드/g, '💡 Mock Mode', '💡 デモモード'],
    [/실제 Email을 Send하지 않고 DB에만 기록됩니다/g, 'Emails are not sent, recorded in DB only.', '実際のメールは送信されずDBにのみ記録されます。'],
    [/실제 Send을 원하면 SMTP 또는 AWS SES를 Select하세요/g, 'Select SMTP or AWS SES to send real emails.', '実際の送信をご希望の場合はSMTPまたはAWS SESを選択してください。'],
    [/안녕하세요/g, 'Hello', 'こんにちは'],
    [/내용을 입력하세요/g, 'Enter content', '内容を入力してください'],
    [/새 Template 작성/g, 'Create New Template', '新規テンプレート作成'],
    [/Template Edit/g, 'Edit Template', 'テンプレート編集'],

    // Remaining
    [/Delete하시겠습니까\?/g, 'Are you sure you want to delete?', '削除しますか？'],
    [/\+ 새 Template/g, '+ New Template', '+ 新規テンプレート'],
    [/HTML Body\* \(변Count:/g, 'HTML Body* (Variables:', 'HTML本文* (変数:']
];

let extraKo = {};
let extraEn = {};
let extraJa = {};
let count = 0;

regexList.forEach((r, i) => {
    let key = `e_xtra_${i}`;
    let koStr = String(r[0]).slice(1, -2).replace(/\\/g, ''); // rough extraction of korean
    // A bit hacky but works for generating the JSON mapping
    // We will just replace in the file via match
    c = c.replace(r[0], () => {
        count++;
        return `{t('crm.email_extra.${key}')}`;
    });
    extraKo[key] = koStr.replace(/\(.*?\)/g, '').trim(); 
    extraEn[key] = r[1] || koStr;
    extraJa[key] = r[2] || r[1] || koStr;
});

// Since string manipulation is messy, let's just do a big clean search & replace!
console.log('Replaced', count, 'Korean occurrences.');

const payloadKo = JSON.stringify(extraKo, null, 4);
const payloadEn = JSON.stringify(extraEn, null, 4);
const payloadJa = JSON.stringify(extraJa, null, 4);

// Write logic to inject email_extra
function inject(f, p) {
    let raw = fs.readFileSync(f, 'utf8');
    raw = raw.replace('ja.crm = {', `ja.crm = {\n  email_extra: ${p},`);
    raw = raw.replace('ko.crm = {', `ko.crm = {\n  email_extra: ${p},`);
    raw = raw.replace('en.crm = {', `en.crm = {\n  email_extra: ${p},`);
    fs.writeFileSync(f, raw, 'utf8');
}
inject('frontend/src/i18n/locales/ko.js', payloadKo);
inject('frontend/src/i18n/locales/en.js', payloadEn);
inject('frontend/src/i18n/locales/ja.js', payloadJa);

// Strip JSX braces inside strings if they ended up like placeholder={t(...)}
c = c.replace(/placeholder=\{t\((.*?)\)\}/g, "placeholder={t($1)}");
c = c.replace(/label: \"\{t\((.*?)\)\}\"/g, "label: t($1)");
c = c.replace(/text: \"\{t\((.*?)\)\}\"/g, "text: t($1)");
c = c.replace(/discount: \"\{t\((.*?)\)\}\"/g, "discount: t($1)");

fs.writeFileSync('frontend/src/pages/EmailMarketing.jsx', c, 'utf8');
console.log('Successfully injected email_extra into locales and replaced EmailMarketing.jsx');
