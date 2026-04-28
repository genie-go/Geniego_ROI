const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');

const journeyKeys = {
  ko: {
    journey: {
      pageTitle: "고객여정 빌더", pageSub: "이메일·카카오·LINE·SMS·WhatsApp 다채널 자동화 · A/B 테스트 · 실시간 연동",
      tabList: "내 여정 목록", tabAnalytics: "분석 대시보드",
      myJourneys: "내 여정 목록", newJourney: "+ 새 여정 만들기", cancel: "취소",
      journeyName: "여정 이름", journeyNamePh: "예: 신규 고객 환영 여정",
      triggerEvent: "트리거 이벤트", create: "생성", copy: "복사본",
      noJourneys: "여정이 없습니다. 새 여정을 만들어 보세요!",
      statusActive: "활성", statusPaused: "일시중지", statusDraft: "초안",
      trigger: "트리거", entered: "진입", completed: "완료", active: "활성",
      scheduled: "예약됨", lastUpdated: "최종 수정",
      edit: "편집", clone: "복제", delete: "삭제", confirmDelete: "이 여정을 삭제하시겠습니까?",
      backToList: "← 목록으로", save: "저장", saving: "저장 중...",
      nodeSettings: "노드 설정", clickToEdit: "노드를 클릭하여 편집하세요",
      nodeName: "노드 이름", triggerType: "트리거 유형", selectSegment: "세그먼트 선택",
      emailSubject: "이메일 제목", emailSubjectPh: "제목을 입력하세요",
      emailFrom: "발신자 이름", emailSenderPh: "발신자 이름을 입력하세요",
      emailTestSend: "테스트 발송", kakaoTemplate: "템플릿 코드",
      kakaoMsgType: "메시지 유형", kakaoAlimtalk: "알림톡", kakaoFriendtalk: "친구톡",
      kakaoTest: "테스트 발송", lineTemplate: "템플릿 코드",
      lineMsgType: "메시지 유형", lineMsgText: "텍스트", lineMsgFlex: "Flex 메시지", lineMsgTemplate: "템플릿",
      lineTestSend: "테스트 발송", waTemplate: "템플릿 이름", waLang: "언어 코드",
      igMessage: "DM 메시지", igMessagePh: "Instagram DM 메시지를 입력하세요",
      smsMessage: "SMS 메시지", smsMessagePh: "SMS 메시지를 입력하세요",
      webhookUrl: "Webhook URL", webhookMethod: "HTTP 메서드",
      pushTitle: "푸시 알림 제목", pushBody: "푸시 알림 내용",
      popupTemplate: "팝업 템플릿", popupTemplatePh: "팝업 템플릿 ID를 입력하세요",
      delayTime: "대기 시간", delayUnit: "시간 단위",
      minutes: "분", hours: "시간", days: "일",
      conditionField: "조건 필드",
      conditionEmailClicked: "이메일 클릭 여부", conditionEmailOpened: "이메일 열람 여부",
      conditionPurchased: "구매 여부", conditionLtvGt: "LTV 이상",
      conditionKakaoClicked: "카카오 클릭 여부", conditionLineClicked: "LINE 클릭 여부",
      conditionPageVisited: "페이지 방문 여부", conditionCartValueGt: "장바구니 금액 이상",
      abGroupA: "A 그룹 비율 (%)", abGroupB: "B 그룹",
      deleteNode: "노드 삭제", channelNotConnected: "연동허브에서 채널을 연결하세요",
      execLog: "실행 로그", connectedChannels: "연동된 채널", recentTriggers: "최근 트리거",
      emailSendSim: "이메일 발송 시뮬레이션: {{count}}명",
      kakaoSendSim: "카카오 발송 시뮬레이션: {{count}}명",
      lineSendSim: "LINE 발송 시뮬레이션: {{count}}명",
      analyticsEntered: "총 진입자", analyticsCompleted: "완료", analyticsActive: "현재 활성", analyticsConvRate: "전환율",
      noAnalyticsData: "분석 데이터가 없습니다", journeyPerformance: "여정별 성과",
      colName: "여정 이름", colStatus: "상태", colEntered: "진입", colCompleted: "완료",
      colActive: "활성", colConvRate: "전환율", colTrigger: "트리거",
      nodeTypes: {
        trigger: "트리거", email: "이메일", sms: "SMS", delay: "대기",
        condition: "조건 분기", ab_test: "A/B 테스트", tag: "태그", webhook: "웹훅",
        push: "푸시 알림", popup: "웹 팝업", end: "종료",
        kakao: "카카오톡", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM"
      },
      triggerTypes: {
        signup: "회원 가입", purchase: "구매 완료", cart_abandoned: "장바구니 이탈",
        churned: "이탈 위험", segment_entered: "세그먼트 진입", birthday: "생일",
        manual: "수동 실행", event: "커스텀 이벤트", webhook_trigger: "웹훅 트리거"
      }
    }
  },
  en: {
    journey: {
      pageTitle: "Customer Journey Builder", pageSub: "Email · Kakao · LINE · SMS · WhatsApp Multi-channel Automation · A/B Testing · Real-time Integration",
      tabList: "My Journeys", tabAnalytics: "Analytics Dashboard",
      myJourneys: "My Journeys", newJourney: "+ New Journey", cancel: "Cancel",
      journeyName: "Journey Name", journeyNamePh: "e.g. New Customer Welcome Journey",
      triggerEvent: "Trigger Event", create: "Create", copy: "Copy",
      noJourneys: "No journeys yet. Create your first journey!",
      statusActive: "Active", statusPaused: "Paused", statusDraft: "Draft",
      trigger: "Trigger", entered: "Entered", completed: "Completed", active: "Active",
      scheduled: "Scheduled", lastUpdated: "Last Updated",
      edit: "Edit", clone: "Clone", delete: "Delete", confirmDelete: "Are you sure you want to delete this journey?",
      backToList: "← Back to List", save: "Save", saving: "Saving...",
      nodeSettings: "Node Settings", clickToEdit: "Click a node to edit",
      nodeName: "Node Name", triggerType: "Trigger Type", selectSegment: "Select Segment",
      emailSubject: "Email Subject", emailSubjectPh: "Enter subject line",
      emailFrom: "Sender Name", emailSenderPh: "Enter sender name",
      emailTestSend: "Test Send", kakaoTemplate: "Template Code",
      kakaoMsgType: "Message Type", kakaoAlimtalk: "Alimtalk", kakaoFriendtalk: "Friendtalk",
      kakaoTest: "Test Send", lineTemplate: "Template Code",
      lineMsgType: "Message Type", lineMsgText: "Text", lineMsgFlex: "Flex Message", lineMsgTemplate: "Template",
      lineTestSend: "Test Send", waTemplate: "Template Name", waLang: "Language Code",
      igMessage: "DM Message", igMessagePh: "Enter Instagram DM message",
      smsMessage: "SMS Message", smsMessagePh: "Enter SMS message",
      webhookUrl: "Webhook URL", webhookMethod: "HTTP Method",
      pushTitle: "Push Notification Title", pushBody: "Push Notification Body",
      popupTemplate: "Popup Template", popupTemplatePh: "Enter popup template ID",
      delayTime: "Wait Time", delayUnit: "Time Unit",
      minutes: "Minutes", hours: "Hours", days: "Days",
      conditionField: "Condition Field",
      conditionEmailClicked: "Email Clicked", conditionEmailOpened: "Email Opened",
      conditionPurchased: "Purchased", conditionLtvGt: "LTV Greater Than",
      conditionKakaoClicked: "Kakao Clicked", conditionLineClicked: "LINE Clicked",
      conditionPageVisited: "Page Visited", conditionCartValueGt: "Cart Value Greater Than",
      abGroupA: "Group A Ratio (%)", abGroupB: "Group B",
      deleteNode: "Delete Node", channelNotConnected: "Connect channel in Integration Hub",
      execLog: "Execution Log", connectedChannels: "Connected Channels", recentTriggers: "Recent Triggers",
      emailSendSim: "Email send simulation: {{count}} recipients",
      kakaoSendSim: "Kakao send simulation: {{count}} recipients",
      lineSendSim: "LINE send simulation: {{count}} recipients",
      analyticsEntered: "Total Entered", analyticsCompleted: "Completed", analyticsActive: "Currently Active", analyticsConvRate: "Conversion Rate",
      noAnalyticsData: "No analytics data available", journeyPerformance: "Journey Performance",
      colName: "Journey Name", colStatus: "Status", colEntered: "Entered", colCompleted: "Completed",
      colActive: "Active", colConvRate: "Conv. Rate", colTrigger: "Trigger",
      nodeTypes: {
        trigger: "Trigger", email: "Email", sms: "SMS", delay: "Delay",
        condition: "Condition", ab_test: "A/B Test", tag: "Tag", webhook: "Webhook",
        push: "Push Notification", popup: "Web Popup", end: "End",
        kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM"
      },
      triggerTypes: {
        signup: "Sign Up", purchase: "Purchase", cart_abandoned: "Cart Abandoned",
        churned: "Churned", segment_entered: "Segment Entered", birthday: "Birthday",
        manual: "Manual", event: "Custom Event", webhook_trigger: "Webhook Trigger"
      }
    }
  },
  ja: {
    journey: {
      pageTitle: "カスタマージャーニービルダー", pageSub: "メール・カカオ・LINE・SMS・WhatsApp マルチチャネル自動化 · A/Bテスト · リアルタイム連携",
      tabList: "ジャーニー一覧", tabAnalytics: "分析ダッシュボード",
      myJourneys: "マイジャーニー", newJourney: "+ 新規ジャーニー作成", cancel: "キャンセル",
      journeyName: "ジャーニー名", journeyNamePh: "例：新規顧客ウェルカムジャーニー",
      triggerEvent: "トリガーイベント", create: "作成", copy: "コピー",
      noJourneys: "ジャーニーがありません。新しいジャーニーを作成しましょう！",
      statusActive: "アクティブ", statusPaused: "一時停止", statusDraft: "下書き",
      trigger: "トリガー", entered: "進入", completed: "完了", active: "アクティブ",
      scheduled: "予約済み", lastUpdated: "最終更新",
      edit: "編集", clone: "複製", delete: "削除", confirmDelete: "このジャーニーを削除しますか？",
      backToList: "← 一覧に戻る", save: "保存", saving: "保存中...",
      nodeSettings: "ノード設定", clickToEdit: "ノードをクリックして編集",
      nodeName: "ノード名", triggerType: "トリガータイプ", selectSegment: "セグメントを選択",
      emailSubject: "メール件名", emailSubjectPh: "件名を入力", emailFrom: "送信者名", emailSenderPh: "送信者名を入力",
      emailTestSend: "テスト送信", kakaoTemplate: "テンプレートコード",
      kakaoMsgType: "メッセージタイプ", kakaoAlimtalk: "アリムトーク", kakaoFriendtalk: "フレンドトーク",
      kakaoTest: "テスト送信", lineTemplate: "テンプレートコード",
      lineMsgType: "メッセージタイプ", lineMsgText: "テキスト", lineMsgFlex: "Flexメッセージ", lineMsgTemplate: "テンプレート",
      lineTestSend: "テスト送信", waTemplate: "テンプレート名", waLang: "言語コード",
      igMessage: "DMメッセージ", igMessagePh: "Instagram DMメッセージを入力",
      smsMessage: "SMSメッセージ", smsMessagePh: "SMSメッセージを入力",
      webhookUrl: "Webhook URL", webhookMethod: "HTTPメソッド",
      pushTitle: "プッシュ通知タイトル", pushBody: "プッシュ通知内容",
      popupTemplate: "ポップアップテンプレート", popupTemplatePh: "テンプレートIDを入力",
      delayTime: "待機時間", delayUnit: "時間単位", minutes: "分", hours: "時間", days: "日",
      conditionField: "条件フィールド",
      conditionEmailClicked: "メールクリック", conditionEmailOpened: "メール開封",
      conditionPurchased: "購入", conditionLtvGt: "LTV以上",
      conditionKakaoClicked: "カカオクリック", conditionLineClicked: "LINEクリック",
      conditionPageVisited: "ページ訪問", conditionCartValueGt: "カート金額以上",
      abGroupA: "Aグループ比率 (%)", abGroupB: "Bグループ",
      deleteNode: "ノードを削除", channelNotConnected: "連携ハブでチャネルを接続してください",
      execLog: "実行ログ", connectedChannels: "接続済みチャネル", recentTriggers: "最近のトリガー",
      emailSendSim: "メール送信シミュレーション: {{count}}名",
      kakaoSendSim: "カカオ送信シミュレーション: {{count}}名",
      lineSendSim: "LINE送信シミュレーション: {{count}}名",
      analyticsEntered: "総進入者", analyticsCompleted: "完了", analyticsActive: "現在アクティブ", analyticsConvRate: "コンバージョン率",
      noAnalyticsData: "分析データがありません", journeyPerformance: "ジャーニー別パフォーマンス",
      colName: "ジャーニー名", colStatus: "ステータス", colEntered: "進入", colCompleted: "完了",
      colActive: "アクティブ", colConvRate: "CVR", colTrigger: "トリガー",
      nodeTypes: { trigger: "トリガー", email: "メール", sms: "SMS", delay: "待機", condition: "条件分岐", ab_test: "A/Bテスト", tag: "タグ", webhook: "Webhook", push: "プッシュ通知", popup: "ウェブポップアップ", end: "終了", kakao: "カカオトーク", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "会員登録", purchase: "購入完了", cart_abandoned: "カート離脱", churned: "離脱リスク", segment_entered: "セグメント進入", birthday: "誕生日", manual: "手動実行", event: "カスタムイベント", webhook_trigger: "Webhookトリガー" }
    }
  },
  zh: {
    journey: {
      pageTitle: "客户旅程构建器", pageSub: "邮件·KakaoTalk·LINE·短信·WhatsApp 多渠道自动化 · A/B测试 · 实时集成",
      tabList: "我的旅程", tabAnalytics: "分析仪表板",
      myJourneys: "我的旅程", newJourney: "+ 创建新旅程", cancel: "取消",
      journeyName: "旅程名称", journeyNamePh: "例：新客户欢迎旅程",
      triggerEvent: "触发事件", create: "创建", copy: "副本",
      noJourneys: "暂无旅程。创建您的第一个旅程！",
      statusActive: "活跃", statusPaused: "已暂停", statusDraft: "草稿",
      trigger: "触发器", entered: "进入", completed: "完成", active: "活跃",
      scheduled: "已预约", lastUpdated: "最后更新",
      edit: "编辑", clone: "克隆", delete: "删除", confirmDelete: "确定要删除此旅程吗？",
      backToList: "← 返回列表", save: "保存", saving: "保存中...",
      nodeSettings: "节点设置", clickToEdit: "点击节点进行编辑",
      nodeName: "节点名称", triggerType: "触发类型", selectSegment: "选择细分",
      emailSubject: "邮件主题", emailSubjectPh: "输入主题", emailFrom: "发件人", emailSenderPh: "输入发件人名称",
      emailTestSend: "测试发送", kakaoTemplate: "模板代码",
      kakaoMsgType: "消息类型", kakaoAlimtalk: "通知消息", kakaoFriendtalk: "好友消息",
      kakaoTest: "测试发送", lineTemplate: "模板代码",
      lineMsgType: "消息类型", lineMsgText: "文本", lineMsgFlex: "Flex消息", lineMsgTemplate: "模板",
      lineTestSend: "测试发送", waTemplate: "模板名称", waLang: "语言代码",
      igMessage: "DM消息", igMessagePh: "输入Instagram DM消息",
      smsMessage: "短信消息", smsMessagePh: "输入短信内容",
      webhookUrl: "Webhook URL", webhookMethod: "HTTP方法",
      pushTitle: "推送通知标题", pushBody: "推送通知内容",
      popupTemplate: "弹窗模板", popupTemplatePh: "输入弹窗模板ID",
      delayTime: "等待时间", delayUnit: "时间单位", minutes: "分钟", hours: "小时", days: "天",
      conditionField: "条件字段",
      conditionEmailClicked: "邮件已点击", conditionEmailOpened: "邮件已打开",
      conditionPurchased: "已购买", conditionLtvGt: "LTV大于",
      conditionKakaoClicked: "KakaoTalk已点击", conditionLineClicked: "LINE已点击",
      conditionPageVisited: "页面已访问", conditionCartValueGt: "购物车金额大于",
      abGroupA: "A组比例 (%)", abGroupB: "B组",
      deleteNode: "删除节点", channelNotConnected: "请在集成中心连接渠道",
      execLog: "执行日志", connectedChannels: "已连接渠道", recentTriggers: "最近触发",
      emailSendSim: "邮件发送模拟：{{count}}人", kakaoSendSim: "KakaoTalk发送模拟：{{count}}人", lineSendSim: "LINE发送模拟：{{count}}人",
      analyticsEntered: "总进入", analyticsCompleted: "已完成", analyticsActive: "当前活跃", analyticsConvRate: "转化率",
      noAnalyticsData: "暂无分析数据", journeyPerformance: "旅程绩效",
      colName: "旅程名称", colStatus: "状态", colEntered: "进入", colCompleted: "完成", colActive: "活跃", colConvRate: "转化率", colTrigger: "触发器",
      nodeTypes: { trigger: "触发器", email: "邮件", sms: "短信", delay: "等待", condition: "条件", ab_test: "A/B测试", tag: "标签", webhook: "Webhook", push: "推送通知", popup: "网页弹窗", end: "结束", kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "注册", purchase: "购买", cart_abandoned: "购物车放弃", churned: "流失风险", segment_entered: "进入细分", birthday: "生日", manual: "手动", event: "自定义事件", webhook_trigger: "Webhook触发" }
    }
  },
  "zh-TW": {
    journey: {
      pageTitle: "客戶旅程建構器", pageSub: "電郵·KakaoTalk·LINE·簡訊·WhatsApp 多通路自動化 · A/B測試 · 即時整合",
      tabList: "我的旅程", tabAnalytics: "分析儀表板",
      myJourneys: "我的旅程", newJourney: "+ 建立新旅程", cancel: "取消",
      journeyName: "旅程名稱", journeyNamePh: "例：新客戶歡迎旅程",
      triggerEvent: "觸發事件", create: "建立", copy: "副本",
      noJourneys: "尚無旅程。建立您的第一個旅程！",
      statusActive: "啟用", statusPaused: "已暫停", statusDraft: "草稿",
      trigger: "觸發器", entered: "進入", completed: "完成", active: "啟用",
      scheduled: "已排程", lastUpdated: "最後更新",
      edit: "編輯", clone: "複製", delete: "刪除", confirmDelete: "確定要刪除此旅程嗎？",
      backToList: "← 返回列表", save: "儲存", saving: "儲存中...",
      nodeSettings: "節點設定", clickToEdit: "點擊節點進行編輯",
      nodeName: "節點名稱", triggerType: "觸發類型", selectSegment: "選擇區隔",
      emailSubject: "電郵主旨", emailSubjectPh: "輸入主旨", emailFrom: "寄件人", emailSenderPh: "輸入寄件人名稱",
      emailTestSend: "測試發送", kakaoTemplate: "範本代碼",
      kakaoMsgType: "訊息類型", kakaoAlimtalk: "通知訊息", kakaoFriendtalk: "好友訊息",
      kakaoTest: "測試發送", lineTemplate: "範本代碼",
      lineMsgType: "訊息類型", lineMsgText: "文字", lineMsgFlex: "Flex訊息", lineMsgTemplate: "範本",
      lineTestSend: "測試發送", waTemplate: "範本名稱", waLang: "語言代碼",
      igMessage: "DM訊息", igMessagePh: "輸入Instagram DM訊息",
      smsMessage: "簡訊訊息", smsMessagePh: "輸入簡訊內容",
      webhookUrl: "Webhook URL", webhookMethod: "HTTP方法",
      pushTitle: "推播通知標題", pushBody: "推播通知內容",
      popupTemplate: "彈窗範本", popupTemplatePh: "輸入彈窗範本ID",
      delayTime: "等待時間", delayUnit: "時間單位", minutes: "分鐘", hours: "小時", days: "天",
      conditionField: "條件欄位",
      conditionEmailClicked: "電郵已點擊", conditionEmailOpened: "電郵已開啟",
      conditionPurchased: "已購買", conditionLtvGt: "LTV大於",
      conditionKakaoClicked: "KakaoTalk已點擊", conditionLineClicked: "LINE已點擊",
      conditionPageVisited: "頁面已造訪", conditionCartValueGt: "購物車金額大於",
      abGroupA: "A組比例 (%)", abGroupB: "B組",
      deleteNode: "刪除節點", channelNotConnected: "請在整合中心連接通路",
      execLog: "執行日誌", connectedChannels: "已連接通路", recentTriggers: "最近觸發",
      emailSendSim: "電郵發送模擬：{{count}}人", kakaoSendSim: "KakaoTalk發送模擬：{{count}}人", lineSendSim: "LINE發送模擬：{{count}}人",
      analyticsEntered: "總進入", analyticsCompleted: "已完成", analyticsActive: "目前啟用", analyticsConvRate: "轉換率",
      noAnalyticsData: "暫無分析資料", journeyPerformance: "旅程績效",
      colName: "旅程名稱", colStatus: "狀態", colEntered: "進入", colCompleted: "完成", colActive: "啟用", colConvRate: "轉換率", colTrigger: "觸發器",
      nodeTypes: { trigger: "觸發器", email: "電郵", sms: "簡訊", delay: "等待", condition: "條件", ab_test: "A/B測試", tag: "標籤", webhook: "Webhook", push: "推播通知", popup: "網頁彈窗", end: "結束", kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "註冊", purchase: "購買", cart_abandoned: "購物車放棄", churned: "流失風險", segment_entered: "進入區隔", birthday: "生日", manual: "手動", event: "自訂事件", webhook_trigger: "Webhook觸發" }
    }
  },
  de: {
    journey: {
      pageTitle: "Customer Journey Builder", pageSub: "E-Mail · KakaoTalk · LINE · SMS · WhatsApp Multi-Kanal-Automatisierung · A/B-Test · Echtzeit-Integration",
      tabList: "Meine Journeys", tabAnalytics: "Analyse-Dashboard",
      myJourneys: "Meine Journeys", newJourney: "+ Neue Journey erstellen", cancel: "Abbrechen",
      journeyName: "Journey-Name", journeyNamePh: "z.B. Neukunden-Willkommens-Journey",
      triggerEvent: "Trigger-Ereignis", create: "Erstellen", copy: "Kopie",
      noJourneys: "Keine Journeys vorhanden. Erstellen Sie Ihre erste Journey!",
      statusActive: "Aktiv", statusPaused: "Pausiert", statusDraft: "Entwurf",
      trigger: "Trigger", entered: "Eingetreten", completed: "Abgeschlossen", active: "Aktiv",
      scheduled: "Geplant", lastUpdated: "Zuletzt aktualisiert",
      edit: "Bearbeiten", clone: "Duplizieren", delete: "Löschen", confirmDelete: "Möchten Sie diese Journey wirklich löschen?",
      backToList: "← Zurück zur Liste", save: "Speichern", saving: "Speichern...",
      nodeSettings: "Knoten-Einstellungen", clickToEdit: "Klicken Sie auf einen Knoten zum Bearbeiten",
      nodeName: "Knotenname", triggerType: "Trigger-Typ", selectSegment: "Segment auswählen",
      emailSubject: "E-Mail-Betreff", emailSubjectPh: "Betreff eingeben", emailFrom: "Absendername", emailSenderPh: "Absendername eingeben",
      emailTestSend: "Testversand", kakaoTemplate: "Vorlagencode", kakaoMsgType: "Nachrichtentyp", kakaoAlimtalk: "Alimtalk", kakaoFriendtalk: "Friendtalk",
      kakaoTest: "Testversand", lineTemplate: "Vorlagencode", lineMsgType: "Nachrichtentyp", lineMsgText: "Text", lineMsgFlex: "Flex-Nachricht", lineMsgTemplate: "Vorlage",
      lineTestSend: "Testversand", waTemplate: "Vorlagenname", waLang: "Sprachcode",
      igMessage: "DM-Nachricht", igMessagePh: "Instagram DM-Nachricht eingeben",
      smsMessage: "SMS-Nachricht", smsMessagePh: "SMS-Nachricht eingeben",
      webhookUrl: "Webhook-URL", webhookMethod: "HTTP-Methode",
      pushTitle: "Push-Benachrichtigung Titel", pushBody: "Push-Benachrichtigung Inhalt",
      popupTemplate: "Popup-Vorlage", popupTemplatePh: "Vorlagen-ID eingeben",
      delayTime: "Wartezeit", delayUnit: "Zeiteinheit", minutes: "Minuten", hours: "Stunden", days: "Tage",
      conditionField: "Bedingungsfeld",
      conditionEmailClicked: "E-Mail angeklickt", conditionEmailOpened: "E-Mail geöffnet",
      conditionPurchased: "Gekauft", conditionLtvGt: "LTV größer als",
      conditionKakaoClicked: "KakaoTalk angeklickt", conditionLineClicked: "LINE angeklickt",
      conditionPageVisited: "Seite besucht", conditionCartValueGt: "Warenkorbwert größer als",
      abGroupA: "Gruppe A Anteil (%)", abGroupB: "Gruppe B",
      deleteNode: "Knoten löschen", channelNotConnected: "Verbinden Sie den Kanal im Integration Hub",
      execLog: "Ausführungsprotokoll", connectedChannels: "Verbundene Kanäle", recentTriggers: "Letzte Trigger",
      emailSendSim: "E-Mail-Versandsimulation: {{count}} Empfänger", kakaoSendSim: "KakaoTalk-Versandsimulation: {{count}} Empfänger", lineSendSim: "LINE-Versandsimulation: {{count}} Empfänger",
      analyticsEntered: "Gesamt Eingetreten", analyticsCompleted: "Abgeschlossen", analyticsActive: "Aktuell Aktiv", analyticsConvRate: "Konversionsrate",
      noAnalyticsData: "Keine Analysedaten verfügbar", journeyPerformance: "Journey-Leistung",
      colName: "Journey-Name", colStatus: "Status", colEntered: "Eingetreten", colCompleted: "Abgeschlossen", colActive: "Aktiv", colConvRate: "Conv. Rate", colTrigger: "Trigger",
      nodeTypes: { trigger: "Trigger", email: "E-Mail", sms: "SMS", delay: "Warten", condition: "Bedingung", ab_test: "A/B-Test", tag: "Tag", webhook: "Webhook", push: "Push-Benachrichtigung", popup: "Web-Popup", end: "Ende", kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "Registrierung", purchase: "Kauf", cart_abandoned: "Warenkorb abgebrochen", churned: "Abwanderungsrisiko", segment_entered: "Segment eingetreten", birthday: "Geburtstag", manual: "Manuell", event: "Benutzerdefiniertes Ereignis", webhook_trigger: "Webhook-Trigger" }
    }
  },
  th: {
    journey: {
      pageTitle: "ตัวสร้างเส้นทางลูกค้า", pageSub: "อีเมล·KakaoTalk·LINE·SMS·WhatsApp อัตโนมัติหลายช่อง · A/B Testing · การเชื่อมต่อแบบเรียลไทม์",
      tabList: "รายการเส้นทาง", tabAnalytics: "แดชบอร์ดวิเคราะห์",
      myJourneys: "เส้นทางของฉัน", newJourney: "+ สร้างเส้นทางใหม่", cancel: "ยกเลิก",
      journeyName: "ชื่อเส้นทาง", journeyNamePh: "เช่น: เส้นทางต้อนรับลูกค้าใหม่",
      triggerEvent: "เหตุการณ์ทริกเกอร์", create: "สร้าง", copy: "สำเนา",
      noJourneys: "ยังไม่มีเส้นทาง สร้างเส้นทางแรกของคุณ!",
      statusActive: "ใช้งาน", statusPaused: "หยุดชั่วคราว", statusDraft: "แบบร่าง",
      trigger: "ทริกเกอร์", entered: "เข้า", completed: "เสร็จสิ้น", active: "ใช้งาน",
      scheduled: "กำหนดเวลา", lastUpdated: "อัปเดตล่าสุด",
      edit: "แก้ไข", clone: "โคลน", delete: "ลบ", confirmDelete: "คุณแน่ใจหรือไม่ว่าต้องการลบเส้นทางนี้?",
      backToList: "← กลับไปรายการ", save: "บันทึก", saving: "กำลังบันทึก...",
      nodeSettings: "ตั้งค่าโหนด", clickToEdit: "คลิกโหนดเพื่อแก้ไข",
      nodeName: "ชื่อโหนด", triggerType: "ประเภททริกเกอร์", selectSegment: "เลือกเซ็กเมนต์",
      emailSubject: "หัวข้ออีเมล", emailSubjectPh: "ป้อนหัวข้อ", emailFrom: "ชื่อผู้ส่ง", emailSenderPh: "ป้อนชื่อผู้ส่ง",
      emailTestSend: "ส่งทดสอบ", kakaoTemplate: "รหัสเทมเพลต", kakaoMsgType: "ประเภทข้อความ", kakaoAlimtalk: "Alimtalk", kakaoFriendtalk: "Friendtalk",
      kakaoTest: "ส่งทดสอบ", lineTemplate: "รหัสเทมเพลต", lineMsgType: "ประเภทข้อความ", lineMsgText: "ข้อความ", lineMsgFlex: "Flex Message", lineMsgTemplate: "เทมเพลต",
      lineTestSend: "ส่งทดสอบ", waTemplate: "ชื่อเทมเพลต", waLang: "รหัสภาษา",
      igMessage: "ข้อความ DM", igMessagePh: "ป้อนข้อความ Instagram DM",
      smsMessage: "ข้อความ SMS", smsMessagePh: "ป้อนข้อความ SMS",
      webhookUrl: "Webhook URL", webhookMethod: "HTTP Method",
      pushTitle: "หัวข้อการแจ้งเตือน", pushBody: "เนื้อหาการแจ้งเตือน",
      popupTemplate: "เทมเพลตป๊อปอัป", popupTemplatePh: "ป้อน ID เทมเพลต",
      delayTime: "เวลารอ", delayUnit: "หน่วยเวลา", minutes: "นาที", hours: "ชั่วโมง", days: "วัน",
      conditionField: "ฟิลด์เงื่อนไข",
      conditionEmailClicked: "คลิกอีเมล", conditionEmailOpened: "เปิดอีเมล",
      conditionPurchased: "ซื้อแล้ว", conditionLtvGt: "LTV มากกว่า",
      conditionKakaoClicked: "คลิก KakaoTalk", conditionLineClicked: "คลิก LINE",
      conditionPageVisited: "เยี่ยมชมหน้า", conditionCartValueGt: "มูลค่าตะกร้ามากกว่า",
      abGroupA: "สัดส่วนกลุ่ม A (%)", abGroupB: "กลุ่ม B",
      deleteNode: "ลบโหนด", channelNotConnected: "กรุณาเชื่อมต่อช่องทางใน Integration Hub",
      execLog: "บันทึกการทำงาน", connectedChannels: "ช่องทางที่เชื่อมต่อ", recentTriggers: "ทริกเกอร์ล่าสุด",
      emailSendSim: "จำลองส่งอีเมล: {{count}} คน", kakaoSendSim: "จำลองส่ง KakaoTalk: {{count}} คน", lineSendSim: "จำลองส่ง LINE: {{count}} คน",
      analyticsEntered: "รวมเข้า", analyticsCompleted: "เสร็จสิ้น", analyticsActive: "ใช้งานอยู่", analyticsConvRate: "อัตราการแปลง",
      noAnalyticsData: "ไม่มีข้อมูลวิเคราะห์", journeyPerformance: "ประสิทธิภาพเส้นทาง",
      colName: "ชื่อ", colStatus: "สถานะ", colEntered: "เข้า", colCompleted: "เสร็จ", colActive: "ใช้งาน", colConvRate: "อัตรา Conv.", colTrigger: "ทริกเกอร์",
      nodeTypes: { trigger: "ทริกเกอร์", email: "อีเมล", sms: "SMS", delay: "รอ", condition: "เงื่อนไข", ab_test: "A/B Test", tag: "แท็ก", webhook: "Webhook", push: "แจ้งเตือน Push", popup: "ป๊อปอัปเว็บ", end: "สิ้นสุด", kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "สมัครสมาชิก", purchase: "ซื้อ", cart_abandoned: "ตะกร้าถูกละทิ้ง", churned: "เสี่ยงออก", segment_entered: "เข้าเซ็กเมนต์", birthday: "วันเกิด", manual: "ด้วยตนเอง", event: "เหตุการณ์กำหนดเอง", webhook_trigger: "Webhook Trigger" }
    }
  },
  vi: {
    journey: {
      pageTitle: "Trình tạo hành trình khách hàng", pageSub: "Email·KakaoTalk·LINE·SMS·WhatsApp Tự động hóa đa kênh · A/B Testing · Tích hợp thời gian thực",
      tabList: "Danh sách hành trình", tabAnalytics: "Bảng phân tích",
      myJourneys: "Hành trình của tôi", newJourney: "+ Tạo hành trình mới", cancel: "Hủy",
      journeyName: "Tên hành trình", journeyNamePh: "VD: Hành trình chào đón khách hàng mới",
      triggerEvent: "Sự kiện kích hoạt", create: "Tạo", copy: "Bản sao",
      noJourneys: "Chưa có hành trình nào. Tạo hành trình đầu tiên!",
      statusActive: "Hoạt động", statusPaused: "Tạm dừng", statusDraft: "Bản nháp",
      trigger: "Kích hoạt", entered: "Đã vào", completed: "Hoàn thành", active: "Hoạt động",
      scheduled: "Đã lên lịch", lastUpdated: "Cập nhật lần cuối",
      edit: "Sửa", clone: "Nhân bản", delete: "Xóa", confirmDelete: "Bạn có chắc muốn xóa hành trình này?",
      backToList: "← Quay lại danh sách", save: "Lưu", saving: "Đang lưu...",
      nodeSettings: "Cài đặt nút", clickToEdit: "Nhấp vào nút để chỉnh sửa",
      nodeName: "Tên nút", triggerType: "Loại kích hoạt", selectSegment: "Chọn phân khúc",
      emailSubject: "Tiêu đề email", emailSubjectPh: "Nhập tiêu đề", emailFrom: "Tên người gửi", emailSenderPh: "Nhập tên người gửi",
      emailTestSend: "Gửi thử", kakaoTemplate: "Mã mẫu", kakaoMsgType: "Loại tin nhắn", kakaoAlimtalk: "Alimtalk", kakaoFriendtalk: "Friendtalk",
      kakaoTest: "Gửi thử", lineTemplate: "Mã mẫu", lineMsgType: "Loại tin nhắn", lineMsgText: "Văn bản", lineMsgFlex: "Flex Message", lineMsgTemplate: "Mẫu",
      lineTestSend: "Gửi thử", waTemplate: "Tên mẫu", waLang: "Mã ngôn ngữ",
      igMessage: "Tin nhắn DM", igMessagePh: "Nhập tin nhắn Instagram DM",
      smsMessage: "Tin nhắn SMS", smsMessagePh: "Nhập nội dung SMS",
      webhookUrl: "Webhook URL", webhookMethod: "Phương thức HTTP",
      pushTitle: "Tiêu đề thông báo push", pushBody: "Nội dung thông báo push",
      popupTemplate: "Mẫu popup", popupTemplatePh: "Nhập ID mẫu popup",
      delayTime: "Thời gian chờ", delayUnit: "Đơn vị thời gian", minutes: "Phút", hours: "Giờ", days: "Ngày",
      conditionField: "Trường điều kiện",
      conditionEmailClicked: "Đã nhấp email", conditionEmailOpened: "Đã mở email",
      conditionPurchased: "Đã mua", conditionLtvGt: "LTV lớn hơn",
      conditionKakaoClicked: "Đã nhấp KakaoTalk", conditionLineClicked: "Đã nhấp LINE",
      conditionPageVisited: "Đã truy cập trang", conditionCartValueGt: "Giá trị giỏ hàng lớn hơn",
      abGroupA: "Tỷ lệ nhóm A (%)", abGroupB: "Nhóm B",
      deleteNode: "Xóa nút", channelNotConnected: "Kết nối kênh tại Integration Hub",
      execLog: "Nhật ký thực thi", connectedChannels: "Kênh đã kết nối", recentTriggers: "Kích hoạt gần đây",
      emailSendSim: "Mô phỏng gửi email: {{count}} người", kakaoSendSim: "Mô phỏng gửi KakaoTalk: {{count}} người", lineSendSim: "Mô phỏng gửi LINE: {{count}} người",
      analyticsEntered: "Tổng đã vào", analyticsCompleted: "Hoàn thành", analyticsActive: "Đang hoạt động", analyticsConvRate: "Tỷ lệ chuyển đổi",
      noAnalyticsData: "Chưa có dữ liệu phân tích", journeyPerformance: "Hiệu suất hành trình",
      colName: "Tên", colStatus: "Trạng thái", colEntered: "Đã vào", colCompleted: "Hoàn thành", colActive: "Hoạt động", colConvRate: "Tỷ lệ Conv.", colTrigger: "Kích hoạt",
      nodeTypes: { trigger: "Kích hoạt", email: "Email", sms: "SMS", delay: "Chờ", condition: "Điều kiện", ab_test: "A/B Test", tag: "Thẻ", webhook: "Webhook", push: "Thông báo Push", popup: "Popup Web", end: "Kết thúc", kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "Đăng ký", purchase: "Mua hàng", cart_abandoned: "Bỏ giỏ hàng", churned: "Rủi ro rời bỏ", segment_entered: "Vào phân khúc", birthday: "Sinh nhật", manual: "Thủ công", event: "Sự kiện tùy chỉnh", webhook_trigger: "Webhook Trigger" }
    }
  },
  id: {
    journey: {
      pageTitle: "Pembangun Perjalanan Pelanggan", pageSub: "Email·KakaoTalk·LINE·SMS·WhatsApp Otomatisasi Multi-saluran · A/B Testing · Integrasi Real-time",
      tabList: "Daftar Perjalanan", tabAnalytics: "Dasbor Analitik",
      myJourneys: "Perjalanan Saya", newJourney: "+ Buat Perjalanan Baru", cancel: "Batal",
      journeyName: "Nama Perjalanan", journeyNamePh: "Contoh: Perjalanan Sambutan Pelanggan Baru",
      triggerEvent: "Peristiwa Pemicu", create: "Buat", copy: "Salinan",
      noJourneys: "Belum ada perjalanan. Buat perjalanan pertama Anda!",
      statusActive: "Aktif", statusPaused: "Dijeda", statusDraft: "Draf",
      trigger: "Pemicu", entered: "Masuk", completed: "Selesai", active: "Aktif",
      scheduled: "Dijadwalkan", lastUpdated: "Terakhir Diperbarui",
      edit: "Edit", clone: "Duplikat", delete: "Hapus", confirmDelete: "Apakah Anda yakin ingin menghapus perjalanan ini?",
      backToList: "← Kembali ke Daftar", save: "Simpan", saving: "Menyimpan...",
      nodeSettings: "Pengaturan Node", clickToEdit: "Klik node untuk mengedit",
      nodeName: "Nama Node", triggerType: "Jenis Pemicu", selectSegment: "Pilih Segmen",
      emailSubject: "Subjek Email", emailSubjectPh: "Masukkan subjek", emailFrom: "Nama Pengirim", emailSenderPh: "Masukkan nama pengirim",
      emailTestSend: "Kirim Uji", kakaoTemplate: "Kode Template", kakaoMsgType: "Jenis Pesan", kakaoAlimtalk: "Alimtalk", kakaoFriendtalk: "Friendtalk",
      kakaoTest: "Kirim Uji", lineTemplate: "Kode Template", lineMsgType: "Jenis Pesan", lineMsgText: "Teks", lineMsgFlex: "Flex Message", lineMsgTemplate: "Template",
      lineTestSend: "Kirim Uji", waTemplate: "Nama Template", waLang: "Kode Bahasa",
      igMessage: "Pesan DM", igMessagePh: "Masukkan pesan Instagram DM",
      smsMessage: "Pesan SMS", smsMessagePh: "Masukkan isi SMS",
      webhookUrl: "Webhook URL", webhookMethod: "Metode HTTP",
      pushTitle: "Judul Notifikasi Push", pushBody: "Isi Notifikasi Push",
      popupTemplate: "Template Popup", popupTemplatePh: "Masukkan ID template popup",
      delayTime: "Waktu Tunggu", delayUnit: "Satuan Waktu", minutes: "Menit", hours: "Jam", days: "Hari",
      conditionField: "Field Kondisi",
      conditionEmailClicked: "Email Diklik", conditionEmailOpened: "Email Dibuka",
      conditionPurchased: "Sudah Membeli", conditionLtvGt: "LTV Lebih Dari",
      conditionKakaoClicked: "KakaoTalk Diklik", conditionLineClicked: "LINE Diklik",
      conditionPageVisited: "Halaman Dikunjungi", conditionCartValueGt: "Nilai Keranjang Lebih Dari",
      abGroupA: "Rasio Grup A (%)", abGroupB: "Grup B",
      deleteNode: "Hapus Node", channelNotConnected: "Hubungkan saluran di Integration Hub",
      execLog: "Log Eksekusi", connectedChannels: "Saluran Terhubung", recentTriggers: "Pemicu Terkini",
      emailSendSim: "Simulasi kirim email: {{count}} orang", kakaoSendSim: "Simulasi kirim KakaoTalk: {{count}} orang", lineSendSim: "Simulasi kirim LINE: {{count}} orang",
      analyticsEntered: "Total Masuk", analyticsCompleted: "Selesai", analyticsActive: "Aktif Saat Ini", analyticsConvRate: "Tingkat Konversi",
      noAnalyticsData: "Belum ada data analitik", journeyPerformance: "Performa Perjalanan",
      colName: "Nama", colStatus: "Status", colEntered: "Masuk", colCompleted: "Selesai", colActive: "Aktif", colConvRate: "Conv. Rate", colTrigger: "Pemicu",
      nodeTypes: { trigger: "Pemicu", email: "Email", sms: "SMS", delay: "Tunggu", condition: "Kondisi", ab_test: "A/B Test", tag: "Tag", webhook: "Webhook", push: "Notifikasi Push", popup: "Popup Web", end: "Selesai", kakao: "KakaoTalk", line: "LINE", whatsapp: "WhatsApp", instagram: "Instagram DM" },
      triggerTypes: { signup: "Pendaftaran", purchase: "Pembelian", cart_abandoned: "Keranjang Ditinggalkan", churned: "Risiko Churn", segment_entered: "Masuk Segmen", birthday: "Ulang Tahun", manual: "Manual", event: "Event Kustom", webhook_trigger: "Webhook Trigger" }
    }
  }
};

// Also update gNav.journeyBuilder and root_pageTitle_journeyBuilder
const navUpdates = {
  ko: { gNavJB: "고객여정 빌더", rootTitle: "고객여정 빌더" },
  en: { gNavJB: "Customer Journey Builder", rootTitle: "Customer Journey Builder" },
  ja: { gNavJB: "カスタマージャーニービルダー", rootTitle: "カスタマージャーニービルダー" },
  zh: { gNavJB: "客户旅程构建器", rootTitle: "客户旅程构建器" },
  "zh-TW": { gNavJB: "客戶旅程建構器", rootTitle: "客戶旅程建構器" },
  de: { gNavJB: "Customer Journey Builder", rootTitle: "Customer Journey Builder" },
  th: { gNavJB: "ตัวสร้างเส้นทางลูกค้า", rootTitle: "ตัวสร้างเส้นทางลูกค้า" },
  vi: { gNavJB: "Hành trình khách hàng", rootTitle: "Trình tạo hành trình khách hàng" },
  id: { gNavJB: "Pembangun Perjalanan", rootTitle: "Pembangun Perjalanan Pelanggan" },
};

// Flatten nested object to dot-notation for i18n
function flattenObj(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenObj(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

const LOCALE_FILES = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id'];

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ SKIP: ${filePath} not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update gNav.journeyBuilder
  const nav = navUpdates[lang];
  if (nav) {
    // Replace gNav.journeyBuilder value
    content = content.replace(
      /("gNav"\s*:\s*\{[^}]*?"journeyBuilder"\s*:\s*")([^"]*?)(")/s,
      (m, p1, old, p3) => {
        console.log(`  [${lang}] gNav.journeyBuilder: "${old}" → "${nav.gNavJB}"`);
        return p1 + nav.gNavJB + p3;
      }
    );
    // Simple string replace for journeyBuilder in gNav
    const oldJBPattern = /"journeyBuilder":"[^"]*"/;
    if (!content.match(/"gNav"/) && content.match(oldJBPattern)) {
      content = content.replace(oldJBPattern, `"journeyBuilder":"${nav.gNavJB}"`);
    }

    // Replace root_pageTitle_journeyBuilder
    content = content.replace(
      /("root_pageTitle_journeyBuilder"\s*:\s*")([^"]*?)(")/,
      (m, p1, old, p3) => {
        console.log(`  [${lang}] root_pageTitle_journeyBuilder: "${old}" → "${nav.rootTitle}"`);
        return p1 + nav.rootTitle + p3;
      }
    );
  }

  // 2. Inject journey namespace
  const journeyData = journeyKeys[lang]?.journey || journeyKeys.en.journey;
  const flat = flattenObj(journeyData, 'journey');

  // Remove existing journey.* keys to avoid duplicates
  for (const key of Object.keys(flat)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`,"${escaped}"\\s*:\\s*"[^"]*"`, 'g');
    content = content.replace(regex, '');
    const regex2 = new RegExp(`"${escaped}"\\s*:\\s*"[^"]*",?`, 'g');
    // Only remove standalone if at start
  }

  // Build injection string
  const pairs = Object.entries(flat).map(([k, v]) => `"${k}":"${v.replace(/"/g, '\\"')}"`).join(',');

  // Find the last key before the closing }); and inject
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace > 0) {
    // Check if there's already content
    const before = content.substring(0, lastBrace).trimEnd();
    const after = content.substring(lastBrace);
    const separator = before.endsWith(',') ? '' : ',';
    content = before + separator + pairs + after;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ [${lang}] Injected ${Object.keys(flat).length} journey keys + updated nav/title`);
});

console.log('\n🎉 All 9 locale files updated with journey namespace!');
