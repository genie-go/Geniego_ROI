const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');

// Guide keys per language
const guideKeys = {
  ko: {
    tabGuide:"📖 사용 가이드",
    guideTitle:"고객여정 빌더 사용 가이드",guideSubtitle:"고객의 행동에 맞춰 자동으로 메시지를 보내는 고객여정을 쉽게 만들어 보세요",guideStartBtn:"지금 바로 여정 만들기",
    guideStepsTitle:"여정 만드는 6단계",
    guideStep1Title:"새 여정 만들기",guideStep1Desc:"'+ 새 여정 만들기' 버튼을 클릭하고 여정 이름과 트리거 이벤트(예: 구매 완료, 장바구니 이탈)를 선택합니다.",
    guideStep2Title:"트리거 설정하기",guideStep2Desc:"트리거 노드를 클릭하여 여정이 시작되는 조건을 설정합니다. CRM 세그먼트를 연결하면 특정 고객 그룹만 대상으로 할 수 있습니다.",
    guideStep3Title:"채널 노드 추가하기",guideStep3Desc:"이메일, 카카오톡, LINE, SMS, WhatsApp 등 메시지 노드를 추가합니다. 연동허브에서 API 키를 등록하면 더 많은 채널을 사용할 수 있습니다.",
    guideStep4Title:"조건/대기 설정하기",guideStep4Desc:"대기(Delay) 노드로 메시지 발송 간격을 설정하고, 조건(Condition) 노드로 고객 행동에 따른 분기를 만듭니다.",
    guideStep5Title:"A/B 테스트 추가하기",guideStep5Desc:"A/B 테스트 노드를 사용하여 두 가지 메시지를 비교 테스트합니다. 최적의 메시지를 자동으로 찾아줍니다.",
    guideStep6Title:"저장 후 실행하기",guideStep6Desc:"여정을 저장하고 ▶ 버튼으로 활성화합니다. 분석 대시보드에서 실시간 성과를 모니터링할 수 있습니다.",
    guideNodesTitle:"사용 가능한 노드 종류",
    guideNodeTrigger:"여정의 시작점입니다. 회원가입, 구매, 장바구니 이탈 등의 이벤트로 트리거됩니다.",
    guideNodeEmail:"고객에게 이메일을 자동 발송합니다. 제목과 발신자를 설정할 수 있습니다.",
    guideNodeKakao:"카카오 알림톡/친구톡을 발송합니다. 등록된 템플릿 코드를 사용합니다.",
    guideNodeLine:"LINE 메시지를 발송합니다. 텍스트, Flex, 템플릿 메시지를 지원합니다.",
    guideNodeSms:"SMS 문자 메시지를 발송합니다.",
    guideNodeWhatsapp:"WhatsApp 메시지를 발송합니다. 사전 승인된 템플릿을 사용합니다.",
    guideNodeDelay:"다음 노드 실행 전 지정된 시간만큼 대기합니다 (분/시간/일).",
    guideNodeCondition:"고객 행동(이메일 클릭, 구매 여부 등)에 따라 여정을 분기합니다.",
    guideNodeAbTest:"고객을 두 그룹으로 나누어 서로 다른 메시지 효과를 비교합니다.",
    guideNodeWebhook:"외부 시스템에 데이터를 전송합니다 (HTTP POST/GET).",
    guideNodePush:"모바일 앱 푸시 알림을 발송합니다.",
    guideNodeEnd:"여정의 종료 지점을 표시합니다.",
    guideTipsTitle:"유용한 팁",
    guideTip1:"연동허브에서 API 키를 먼저 등록하면 카카오, LINE, WhatsApp 등 더 많은 채널 노드를 사용할 수 있습니다.",
    guideTip2:"A/B 테스트를 활용하면 최적의 메시지와 발송 시간을 찾을 수 있습니다.",
    guideTip3:"조건 노드를 사용하면 고객의 반응에 따라 맞춤형 후속 메시지를 보낼 수 있습니다.",
    guideTip4:"여정을 복제(📋)하여 기존 여정을 기반으로 새 변형을 빠르게 만들 수 있습니다.",
    guideTip5:"분석 대시보드에서 진입률, 전환율, 이탈 지점을 실시간으로 모니터링하세요."
  },
  en: {
    tabGuide:"📖 User Guide",
    guideTitle:"Customer Journey Builder Guide",guideSubtitle:"Easily create automated customer journeys that send messages based on customer behavior",guideStartBtn:"Create Your First Journey",
    guideStepsTitle:"6 Steps to Build a Journey",
    guideStep1Title:"Create a New Journey",guideStep1Desc:"Click '+ New Journey' and choose a name and trigger event (e.g. Purchase, Cart Abandoned).",
    guideStep2Title:"Configure the Trigger",guideStep2Desc:"Click the trigger node to set the starting condition. Link a CRM segment to target specific customer groups.",
    guideStep3Title:"Add Channel Nodes",guideStep3Desc:"Add Email, KakaoTalk, LINE, SMS, or WhatsApp message nodes. Register API keys in the Integration Hub for more channels.",
    guideStep4Title:"Set Delays & Conditions",guideStep4Desc:"Use Delay nodes to space out messages, and Condition nodes to branch based on customer actions.",
    guideStep5Title:"Add A/B Tests",guideStep5Desc:"Use A/B Test nodes to compare two message variants and automatically find the optimal one.",
    guideStep6Title:"Save & Launch",guideStep6Desc:"Save your journey and click ▶ to activate it. Monitor real-time performance in the Analytics dashboard.",
    guideNodesTitle:"Available Node Types",
    guideNodeTrigger:"The starting point of your journey. Triggered by events like sign-up, purchase, or cart abandonment.",
    guideNodeEmail:"Automatically send emails to customers. Configure subject and sender name.",
    guideNodeKakao:"Send Kakao Alimtalk/Friendtalk messages using registered template codes.",
    guideNodeLine:"Send LINE messages. Supports text, Flex, and template messages.",
    guideNodeSms:"Send SMS text messages to customers.",
    guideNodeWhatsapp:"Send WhatsApp messages using pre-approved templates.",
    guideNodeDelay:"Wait for a specified time before executing the next node (minutes/hours/days).",
    guideNodeCondition:"Branch the journey based on customer behavior (email clicked, purchased, etc.).",
    guideNodeAbTest:"Split customers into two groups to compare different message effectiveness.",
    guideNodeWebhook:"Send data to external systems via HTTP POST/GET requests.",
    guideNodePush:"Send mobile app push notifications.",
    guideNodeEnd:"Marks the end of the journey.",
    guideTipsTitle:"Useful Tips",
    guideTip1:"Register API keys in the Integration Hub first to unlock more channel nodes like Kakao, LINE, and WhatsApp.",
    guideTip2:"Use A/B testing to find the optimal message content and send timing.",
    guideTip3:"Condition nodes let you send personalized follow-up messages based on customer responses.",
    guideTip4:"Clone (📋) existing journeys to quickly create new variations.",
    guideTip5:"Monitor entry rates, conversion rates, and drop-off points in real-time via the Analytics dashboard."
  },
  ja: {
    tabGuide:"📖 ガイド",
    guideTitle:"ジャーニービルダー使い方ガイド",guideSubtitle:"顧客の行動に応じて自動でメッセージを送るジャーニーを簡単に作成できます",guideStartBtn:"ジャーニーを作成する",
    guideStepsTitle:"ジャーニー作成の6ステップ",
    guideStep1Title:"新規ジャーニーを作成",guideStep1Desc:"'+ 新規ジャーニー'をクリックし、名前とトリガーイベント(購入完了、カート離脱など)を選択します。",
    guideStep2Title:"トリガーを設定",guideStep2Desc:"トリガーノードをクリックして開始条件を設定。CRMセグメントを連携すると特定の顧客グループを対象にできます。",
    guideStep3Title:"チャネルノードを追加",guideStep3Desc:"メール、カカオトーク、LINE、SMS、WhatsAppなどのノードを追加。連携ハブでAPIキーを登録するとより多くのチャネルが使えます。",
    guideStep4Title:"待機・条件を設定",guideStep4Desc:"待機ノードで送信間隔を設定し、条件ノードで顧客の行動に基づく分岐を作成します。",
    guideStep5Title:"A/Bテストを追加",guideStep5Desc:"A/Bテストノードで2つのメッセージを比較テスト。最適なメッセージを自動で見つけます。",
    guideStep6Title:"保存して実行",guideStep6Desc:"ジャーニーを保存し▶で有効化。分析ダッシュボードでリアルタイム成果を確認できます。",
    guideNodesTitle:"利用可能なノードタイプ",
    guideNodeTrigger:"ジャーニーの開始点です。会員登録、購入、カート離脱などのイベントでトリガーされます。",
    guideNodeEmail:"顧客に自動でメールを送信します。件名と送信者名を設定できます。",
    guideNodeKakao:"カカオアリムトーク/フレンドトークを送信。登録済みテンプレートコードを使用します。",
    guideNodeLine:"LINEメッセージを送信。テキスト、Flex、テンプレートメッセージに対応。",
    guideNodeSms:"SMS テキストメッセージを送信します。",
    guideNodeWhatsapp:"WhatsAppメッセージを送信。事前承認済みテンプレートを使用します。",
    guideNodeDelay:"次のノード実行前に指定時間待機します（分/時間/日）。",
    guideNodeCondition:"顧客の行動（メールクリック、購入など）に基づきジャーニーを分岐します。",
    guideNodeAbTest:"顧客を2グループに分けて異なるメッセージの効果を比較します。",
    guideNodeWebhook:"外部システムにデータを送信します（HTTP POST/GET）。",
    guideNodePush:"モバイルアプリのプッシュ通知を送信します。",
    guideNodeEnd:"ジャーニーの終了地点を示します。",
    guideTipsTitle:"役立つヒント",
    guideTip1:"連携ハブでAPIキーを先に登録すると、カカオ、LINE、WhatsAppなどより多くのチャネルノードが利用できます。",
    guideTip2:"A/Bテストを活用して最適なメッセージと送信タイミングを見つけましょう。",
    guideTip3:"条件ノードを使えば、顧客の反応に応じたパーソナライズされたフォローアップメッセージを送れます。",
    guideTip4:"既存ジャーニーを複製(📋)して、新しいバリエーションを素早く作成できます。",
    guideTip5:"分析ダッシュボードで進入率、コンバージョン率、離脱ポイントをリアルタイムで監視しましょう。"
  }
};
// Use en as fallback for zh/zh-TW/de/th/vi/id
['zh','zh-TW','de','th','vi','id'].forEach(lang => {
  if (!guideKeys[lang]) guideKeys[lang] = guideKeys.en;
});

const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the "journey":{...} object and add guide keys inside it
  const journeyStart = content.indexOf('"journey":{');
  if (journeyStart < 0) {
    console.log(`⚠ [${lang}] No journey object found, skipping`);
    return;
  }

  // Find the matching closing brace for "journey":{
  let braceCount = 0;
  let journeyEnd = -1;
  for (let i = journeyStart + 10; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      if (braceCount === 0) { journeyEnd = i; break; }
      braceCount--;
    }
  }

  if (journeyEnd < 0) {
    console.log(`⚠ [${lang}] Could not find journey object end`);
    return;
  }

  // Build the guide keys JSON string (without outer braces)
  const keys = guideKeys[lang] || guideKeys.en;
  const pairs = Object.entries(keys).map(([k,v]) => `"${k}":"${v.replace(/"/g,'\\"')}"`).join(',');

  // Insert before the closing brace of "journey":{...}
  content = content.substring(0, journeyEnd) + ',' + pairs + content.substring(journeyEnd);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ [${lang}] Added ${Object.keys(keys).length} guide keys to journey object`);
});

console.log('\n🎉 Guide keys injected into all locale files!');
