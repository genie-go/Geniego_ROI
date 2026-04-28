const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const guideKeys = {
  ko: {
    tabGuide:"📖 사용 가이드",guideTitle:"고객여정 빌더 사용 가이드",guideSubtitle:"고객의 행동에 맞춰 자동으로 메시지를 보내는 고객여정을 쉽게 만들어 보세요",guideStartBtn:"지금 바로 여정 만들기",
    guideStepsTitle:"여정 만드는 6단계",
    guideStep1Title:"새 여정 만들기",guideStep1Desc:"'+ 새 여정 만들기' 버튼을 클릭하고 여정 이름과 트리거 이벤트(예: 구매 완료, 장바구니 이탈)를 선택합니다.",
    guideStep2Title:"트리거 설정하기",guideStep2Desc:"트리거 노드를 클릭하여 여정이 시작되는 조건을 설정합니다. CRM 세그먼트를 연결하면 특정 고객 그룹만 대상으로 할 수 있습니다.",
    guideStep3Title:"채널 노드 추가하기",guideStep3Desc:"이메일, 카카오톡, LINE, SMS, WhatsApp 등 메시지 노드를 추가합니다. 연동허브에서 API 키를 등록하면 더 많은 채널을 사용할 수 있습니다.",
    guideStep4Title:"조건/대기 설정하기",guideStep4Desc:"대기(Delay) 노드로 메시지 발송 간격을 설정하고, 조건(Condition) 노드로 고객 행동에 따른 분기를 만듭니다.",
    guideStep5Title:"A/B 테스트 추가하기",guideStep5Desc:"A/B 테스트 노드를 사용하여 두 가지 메시지를 비교 테스트합니다. 최적의 메시지를 자동으로 찾아줍니다.",
    guideStep6Title:"저장 후 실행하기",guideStep6Desc:"여정을 저장하고 ▶ 버튼으로 활성화합니다. 분석 대시보드에서 실시간 성과를 모니터링할 수 있습니다.",
    guideNodesTitle:"사용 가능한 노드 종류",
    guideNodeTrigger:"여정의 시작점입니다. 회원가입, 구매, 장바구니 이탈 등의 이벤트로 트리거됩니다.",guideNodeEmail:"고객에게 이메일을 자동 발송합니다.",guideNodeKakao:"카카오 알림톡/친구톡을 발송합니다.",guideNodeLine:"LINE 메시지를 발송합니다.",guideNodeSms:"SMS 문자 메시지를 발송합니다.",guideNodeWhatsapp:"WhatsApp 메시지를 발송합니다.",guideNodeDelay:"다음 노드 실행 전 지정된 시간만큼 대기합니다.",guideNodeCondition:"고객 행동에 따라 여정을 분기합니다.",guideNodeAbTest:"고객을 두 그룹으로 나누어 비교합니다.",guideNodeWebhook:"외부 시스템에 데이터를 전송합니다.",guideNodePush:"모바일 앱 푸시 알림을 발송합니다.",guideNodeEnd:"여정의 종료 지점을 표시합니다.",
    guideTipsTitle:"유용한 팁",guideTip1:"연동허브에서 API 키를 먼저 등록하면 더 많은 채널 노드를 사용할 수 있습니다.",guideTip2:"A/B 테스트를 활용하면 최적의 메시지와 발송 시간을 찾을 수 있습니다.",guideTip3:"조건 노드를 사용하면 맞춤형 후속 메시지를 보낼 수 있습니다.",guideTip4:"여정을 복제하여 새 변형을 빠르게 만들 수 있습니다.",guideTip5:"분석 대시보드에서 진입률, 전환율, 이탈 지점을 실시간으로 모니터링하세요."
  },
  en: {
    tabGuide:"📖 User Guide",guideTitle:"Customer Journey Builder Guide",guideSubtitle:"Easily create automated customer journeys that send messages based on customer behavior",guideStartBtn:"Create Your First Journey",
    guideStepsTitle:"6 Steps to Build a Journey",
    guideStep1Title:"Create a New Journey",guideStep1Desc:"Click '+ New Journey' and choose a name and trigger event (e.g. Purchase, Cart Abandoned).",
    guideStep2Title:"Configure the Trigger",guideStep2Desc:"Click the trigger node to set the starting condition. Link a CRM segment to target specific customer groups.",
    guideStep3Title:"Add Channel Nodes",guideStep3Desc:"Add Email, KakaoTalk, LINE, SMS, or WhatsApp message nodes. Register API keys in the Integration Hub for more channels.",
    guideStep4Title:"Set Delays & Conditions",guideStep4Desc:"Use Delay nodes to space out messages, and Condition nodes to branch based on customer actions.",
    guideStep5Title:"Add A/B Tests",guideStep5Desc:"Use A/B Test nodes to compare two message variants and automatically find the optimal one.",
    guideStep6Title:"Save & Launch",guideStep6Desc:"Save your journey and click ▶ to activate it. Monitor real-time performance in the Analytics dashboard.",
    guideNodesTitle:"Available Node Types",
    guideNodeTrigger:"The starting point. Triggered by sign-up, purchase, or cart abandonment.",guideNodeEmail:"Automatically send emails to customers.",guideNodeKakao:"Send Kakao Alimtalk/Friendtalk messages.",guideNodeLine:"Send LINE messages.",guideNodeSms:"Send SMS text messages.",guideNodeWhatsapp:"Send WhatsApp messages.",guideNodeDelay:"Wait for a specified time before the next node.",guideNodeCondition:"Branch based on customer behavior.",guideNodeAbTest:"Split customers into two groups to compare.",guideNodeWebhook:"Send data to external systems.",guideNodePush:"Send mobile push notifications.",guideNodeEnd:"Marks the end of the journey.",
    guideTipsTitle:"Useful Tips",guideTip1:"Register API keys in the Integration Hub first to unlock more channels.",guideTip2:"Use A/B testing to find the optimal message and timing.",guideTip3:"Condition nodes let you send personalized follow-up messages.",guideTip4:"Clone existing journeys to quickly create new variations.",guideTip5:"Monitor entry rates, conversion rates, and drop-off points in real-time."
  },
  ja: {
    tabGuide:"📖 ガイド",guideTitle:"ジャーニービルダー使い方ガイド",guideSubtitle:"顧客の行動に応じて自動でメッセージを送るジャーニーを簡単に作成できます",guideStartBtn:"ジャーニーを作成する",
    guideStepsTitle:"ジャーニー作成の6ステップ",
    guideStep1Title:"新規ジャーニーを作成",guideStep1Desc:"'+ 新規ジャーニー'をクリックし名前とトリガーイベントを選択します。",
    guideStep2Title:"トリガーを設定",guideStep2Desc:"トリガーノードをクリックして開始条件を設定します。",
    guideStep3Title:"チャネルノードを追加",guideStep3Desc:"メール、カカオトーク、LINE、SMS、WhatsAppなどのノードを追加します。",
    guideStep4Title:"待機・条件を設定",guideStep4Desc:"待機ノードで送信間隔を設定し、条件ノードで分岐を作成します。",
    guideStep5Title:"A/Bテストを追加",guideStep5Desc:"A/Bテストノードで2つのメッセージを比較テストします。",
    guideStep6Title:"保存して実行",guideStep6Desc:"ジャーニーを保存し▶で有効化します。",
    guideNodesTitle:"利用可能なノードタイプ",
    guideNodeTrigger:"ジャーニーの開始点です。",guideNodeEmail:"メールを自動送信します。",guideNodeKakao:"カカオメッセージを送信します。",guideNodeLine:"LINEメッセージを送信します。",guideNodeSms:"SMSを送信します。",guideNodeWhatsapp:"WhatsAppメッセージを送信します。",guideNodeDelay:"指定時間待機します。",guideNodeCondition:"顧客行動で分岐します。",guideNodeAbTest:"2グループに分けて比較します。",guideNodeWebhook:"外部システムにデータを送信します。",guideNodePush:"プッシュ通知を送信します。",guideNodeEnd:"終了地点です。",
    guideTipsTitle:"役立つヒント",guideTip1:"連携ハブでAPIキーを先に登録するとより多くのチャネルが利用できます。",guideTip2:"A/Bテストで最適なメッセージを見つけましょう。",guideTip3:"条件ノードでパーソナライズされたフォローアップを送れます。",guideTip4:"既存ジャーニーを複製して新しいバリエーションを作成できます。",guideTip5:"分析ダッシュボードでリアルタイム監視しましょう。"
  },
  zh: {
    tabGuide:"📖 使用指南",guideTitle:"客户旅程构建器使用指南",guideSubtitle:"根据客户行为自动发送消息，轻松创建客户旅程",guideStartBtn:"立即创建旅程",
    guideStepsTitle:"创建旅程的6个步骤",
    guideStep1Title:"创建新旅程",guideStep1Desc:"点击 [+ 创建新旅程] 按钮，输入旅程名称并选择触发事件（如：购买完成、购物车放弃）。",
    guideStep2Title:"配置触发器",guideStep2Desc:"点击触发器节点设置旅程启动条件。关联CRM细分可以针对特定客户群体。",
    guideStep3Title:"添加渠道节点",guideStep3Desc:"添加邮件、KakaoTalk、LINE、短信、WhatsApp等消息节点。在集成中心注册API密钥可使用更多渠道。",
    guideStep4Title:"设置等待与条件",guideStep4Desc:"使用等待节点设置消息发送间隔，使用条件节点根据客户行为创建分支。",
    guideStep5Title:"添加A/B测试",guideStep5Desc:"使用A/B测试节点比较两种不同的消息效果，自动找到最优方案。",
    guideStep6Title:"保存并启动",guideStep6Desc:"保存旅程并点击▶按钮激活。在分析仪表板中实时监控旅程效果。",
    guideNodesTitle:"可用节点类型",
    guideNodeTrigger:"旅程的起始点。由注册、购买、购物车放弃等事件触发。",guideNodeEmail:"自动向客户发送电子邮件。",guideNodeKakao:"发送KakaoTalk通知消息/好友消息。",guideNodeLine:"发送LINE消息。支持文本、Flex和模板消息。",guideNodeSms:"发送短信消息。",guideNodeWhatsapp:"发送WhatsApp消息。使用预先审批的模板。",guideNodeDelay:"在执行下一个节点前等待指定时间。",guideNodeCondition:"根据客户行为（邮件点击、购买等）对旅程进行分支。",guideNodeAbTest:"将客户分为两组，比较不同消息的效果。",guideNodeWebhook:"通过HTTP请求向外部系统发送数据。",guideNodePush:"发送移动应用推送通知。",guideNodeEnd:"标记旅程的结束点。",
    guideTipsTitle:"实用技巧",guideTip1:"先在集成中心注册API密钥，可解锁更多渠道节点。",guideTip2:"利用A/B测试找到最佳消息内容和发送时间。",guideTip3:"条件节点可根据客户反馈发送个性化后续消息。",guideTip4:"克隆现有旅程可快速创建新的变体。",guideTip5:"在分析仪表板实时监控进入率、转化率和流失点。"
  },
  "zh-TW": {
    tabGuide:"📖 使用指南",guideTitle:"客戶旅程建構器使用指南",guideSubtitle:"根據客戶行為自動發送訊息，輕鬆建立客戶旅程",guideStartBtn:"立即建立旅程",
    guideStepsTitle:"建立旅程的6個步驟",
    guideStep1Title:"建立新旅程",guideStep1Desc:"點擊 [+ 建立新旅程] 按鈕，輸入旅程名稱並選擇觸發事件（如：購買完成、購物車放棄）。",
    guideStep2Title:"設定觸發器",guideStep2Desc:"點擊觸發器節點設定旅程啟動條件。關聯CRM區隔可以針對特定客戶群組。",
    guideStep3Title:"新增通路節點",guideStep3Desc:"新增電郵、KakaoTalk、LINE、簡訊、WhatsApp等訊息節點。在整合中心註冊API金鑰可使用更多通路。",
    guideStep4Title:"設定等待與條件",guideStep4Desc:"使用等待節點設定訊息發送間隔，使用條件節點根據客戶行為建立分支。",
    guideStep5Title:"新增A/B測試",guideStep5Desc:"使用A/B測試節點比較兩種不同的訊息效果，自動找到最佳方案。",
    guideStep6Title:"儲存並啟動",guideStep6Desc:"儲存旅程並點擊▶按鈕啟用。在分析儀表板中即時監控旅程效果。",
    guideNodesTitle:"可用節點類型",
    guideNodeTrigger:"旅程的起始點。由註冊、購買、購物車放棄等事件觸發。",guideNodeEmail:"自動向客戶發送電子郵件。",guideNodeKakao:"發送KakaoTalk通知訊息/好友訊息。",guideNodeLine:"發送LINE訊息。",guideNodeSms:"發送簡訊。",guideNodeWhatsapp:"發送WhatsApp訊息。",guideNodeDelay:"在執行下一個節點前等待指定時間。",guideNodeCondition:"根據客戶行為對旅程進行分支。",guideNodeAbTest:"將客戶分為兩組進行比較。",guideNodeWebhook:"透過HTTP請求向外部系統發送資料。",guideNodePush:"發送行動應用推播通知。",guideNodeEnd:"標記旅程的結束點。",
    guideTipsTitle:"實用技巧",guideTip1:"先在整合中心註冊API金鑰，可解鎖更多通路節點。",guideTip2:"利用A/B測試找到最佳訊息內容和發送時間。",guideTip3:"條件節點可根據客戶反饋發送個人化後續訊息。",guideTip4:"複製現有旅程可快速建立新的變體。",guideTip5:"在分析儀表板即時監控進入率、轉換率和流失點。"
  },
  de: {
    tabGuide:"📖 Anleitung",guideTitle:"Customer Journey Builder Anleitung",guideSubtitle:"Erstellen Sie automatisierte Journeys, die Nachrichten basierend auf Kundenverhalten senden",guideStartBtn:"Erste Journey erstellen",
    guideStepsTitle:"6 Schritte zur Journey-Erstellung",
    guideStep1Title:"Neue Journey erstellen",guideStep1Desc:"Klicken Sie auf '+ Neue Journey' und wählen Sie einen Namen und Trigger.",
    guideStep2Title:"Trigger konfigurieren",guideStep2Desc:"Klicken Sie auf den Trigger-Knoten und legen Sie die Startbedingung fest.",
    guideStep3Title:"Kanal-Knoten hinzufügen",guideStep3Desc:"Fügen Sie E-Mail, KakaoTalk, LINE, SMS oder WhatsApp Knoten hinzu.",
    guideStep4Title:"Wartezeiten & Bedingungen",guideStep4Desc:"Nutzen Sie Warte-Knoten für Zeitabstände und Bedingungs-Knoten für Verzweigungen.",
    guideStep5Title:"A/B-Tests hinzufügen",guideStep5Desc:"Vergleichen Sie zwei Nachrichtenvarianten mit A/B-Test-Knoten.",
    guideStep6Title:"Speichern & Starten",guideStep6Desc:"Speichern und aktivieren Sie die Journey mit ▶. Überwachen Sie die Leistung im Dashboard.",
    guideNodesTitle:"Verfügbare Knotentypen",
    guideNodeTrigger:"Startpunkt der Journey.",guideNodeEmail:"E-Mails automatisch senden.",guideNodeKakao:"KakaoTalk-Nachrichten senden.",guideNodeLine:"LINE-Nachrichten senden.",guideNodeSms:"SMS senden.",guideNodeWhatsapp:"WhatsApp-Nachrichten senden.",guideNodeDelay:"Wartezeit vor dem nächsten Knoten.",guideNodeCondition:"Verzweigung basierend auf Kundenverhalten.",guideNodeAbTest:"Kunden in zwei Gruppen aufteilen.",guideNodeWebhook:"Daten an externe Systeme senden.",guideNodePush:"Push-Benachrichtigungen senden.",guideNodeEnd:"Endpunkt der Journey.",
    guideTipsTitle:"Nützliche Tipps",guideTip1:"Registrieren Sie API-Schlüssel im Integration Hub für mehr Kanäle.",guideTip2:"Nutzen Sie A/B-Tests für optimale Nachrichten.",guideTip3:"Bedingungs-Knoten ermöglichen personalisierte Follow-ups.",guideTip4:"Duplizieren Sie bestehende Journeys für schnelle Variationen.",guideTip5:"Überwachen Sie Eintrittsraten und Konversionsraten in Echtzeit."
  },
  th: {
    tabGuide:"📖 คู่มือ",guideTitle:"คู่มือการใช้งานตัวสร้างเส้นทางลูกค้า",guideSubtitle:"สร้างเส้นทางอัตโนมัติที่ส่งข้อความตามพฤติกรรมลูกค้าได้อย่างง่ายดาย",guideStartBtn:"สร้างเส้นทางแรก",
    guideStepsTitle:"6 ขั้นตอนในการสร้างเส้นทาง",
    guideStep1Title:"สร้างเส้นทางใหม่",guideStep1Desc:"คลิก '+ สร้างเส้นทางใหม่' แล้วเลือกชื่อและเหตุการณ์ทริกเกอร์",
    guideStep2Title:"ตั้งค่าทริกเกอร์",guideStep2Desc:"คลิกโหนดทริกเกอร์เพื่อตั้งค่าเงื่อนไขเริ่มต้น",
    guideStep3Title:"เพิ่มโหนดช่องทาง",guideStep3Desc:"เพิ่มอีเมล KakaoTalk LINE SMS หรือ WhatsApp",
    guideStep4Title:"ตั้งค่าการรอและเงื่อนไข",guideStep4Desc:"ใช้โหนดรอเพื่อกำหนดช่วงเวลา และโหนดเงื่อนไขเพื่อแยกสาขา",
    guideStep5Title:"เพิ่ม A/B Test",guideStep5Desc:"เปรียบเทียบข้อความสองแบบด้วย A/B Test",
    guideStep6Title:"บันทึกและเริ่มต้น",guideStep6Desc:"บันทึกและเปิดใช้งานด้วย ▶",
    guideNodesTitle:"ประเภทโหนดที่ใช้ได้",
    guideNodeTrigger:"จุดเริ่มต้นของเส้นทาง",guideNodeEmail:"ส่งอีเมลอัตโนมัติ",guideNodeKakao:"ส่งข้อความ KakaoTalk",guideNodeLine:"ส่งข้อความ LINE",guideNodeSms:"ส่ง SMS",guideNodeWhatsapp:"ส่งข้อความ WhatsApp",guideNodeDelay:"รอเวลาที่กำหนด",guideNodeCondition:"แยกสาขาตามพฤติกรรม",guideNodeAbTest:"แบ่งลูกค้าเป็น 2 กลุ่ม",guideNodeWebhook:"ส่งข้อมูลไปยังระบบภายนอก",guideNodePush:"ส่งการแจ้งเตือน Push",guideNodeEnd:"จุดสิ้นสุดของเส้นทาง",
    guideTipsTitle:"เคล็ดลับ",guideTip1:"ลงทะเบียน API key ใน Integration Hub ก่อนเพื่อปลดล็อกช่องทางเพิ่มเติม",guideTip2:"ใช้ A/B test เพื่อค้นหาข้อความที่ดีที่สุด",guideTip3:"โหนดเงื่อนไขช่วยส่งข้อความที่เหมาะสม",guideTip4:"โคลนเส้นทางที่มีอยู่เพื่อสร้างรูปแบบใหม่",guideTip5:"ติดตามอัตราการเข้า อัตราการแปลง แบบเรียลไทม์"
  },
  vi: {
    tabGuide:"📖 Hướng dẫn",guideTitle:"Hướng dẫn sử dụng Trình tạo hành trình",guideSubtitle:"Dễ dàng tạo hành trình tự động gửi tin nhắn dựa trên hành vi khách hàng",guideStartBtn:"Tạo hành trình đầu tiên",
    guideStepsTitle:"6 bước tạo hành trình",
    guideStep1Title:"Tạo hành trình mới",guideStep1Desc:"Nhấp '+ Tạo hành trình mới' và chọn tên cùng sự kiện kích hoạt.",
    guideStep2Title:"Cấu hình kích hoạt",guideStep2Desc:"Nhấp vào nút kích hoạt để đặt điều kiện bắt đầu.",
    guideStep3Title:"Thêm nút kênh",guideStep3Desc:"Thêm Email, KakaoTalk, LINE, SMS hoặc WhatsApp.",
    guideStep4Title:"Đặt chờ & điều kiện",guideStep4Desc:"Dùng nút chờ để giãn cách tin nhắn và nút điều kiện để phân nhánh.",
    guideStep5Title:"Thêm A/B Test",guideStep5Desc:"So sánh hai biến thể tin nhắn với A/B Test.",
    guideStep6Title:"Lưu & Khởi chạy",guideStep6Desc:"Lưu và kích hoạt hành trình bằng ▶.",
    guideNodesTitle:"Các loại nút khả dụng",
    guideNodeTrigger:"Điểm bắt đầu hành trình.",guideNodeEmail:"Gửi email tự động.",guideNodeKakao:"Gửi tin nhắn KakaoTalk.",guideNodeLine:"Gửi tin nhắn LINE.",guideNodeSms:"Gửi tin nhắn SMS.",guideNodeWhatsapp:"Gửi tin nhắn WhatsApp.",guideNodeDelay:"Chờ thời gian trước nút tiếp theo.",guideNodeCondition:"Phân nhánh theo hành vi.",guideNodeAbTest:"Chia khách hàng thành 2 nhóm.",guideNodeWebhook:"Gửi dữ liệu đến hệ thống bên ngoài.",guideNodePush:"Gửi thông báo push.",guideNodeEnd:"Đánh dấu kết thúc hành trình.",
    guideTipsTitle:"Mẹo hữu ích",guideTip1:"Đăng ký API key tại Integration Hub để mở khóa thêm kênh.",guideTip2:"Dùng A/B test để tìm tin nhắn tối ưu.",guideTip3:"Nút điều kiện giúp gửi tin nhắn cá nhân hóa.",guideTip4:"Nhân bản hành trình để tạo biến thể nhanh.",guideTip5:"Theo dõi tỷ lệ chuyển đổi thời gian thực."
  },
  id: {
    tabGuide:"📖 Panduan",guideTitle:"Panduan Penggunaan Pembangun Perjalanan",guideSubtitle:"Buat perjalanan otomatis yang mengirim pesan berdasarkan perilaku pelanggan dengan mudah",guideStartBtn:"Buat Perjalanan Pertama",
    guideStepsTitle:"6 Langkah Membuat Perjalanan",
    guideStep1Title:"Buat Perjalanan Baru",guideStep1Desc:"Klik '+ Buat Perjalanan Baru' dan pilih nama serta event pemicu.",
    guideStep2Title:"Konfigurasi Pemicu",guideStep2Desc:"Klik node pemicu untuk mengatur kondisi awal.",
    guideStep3Title:"Tambah Node Saluran",guideStep3Desc:"Tambahkan Email, KakaoTalk, LINE, SMS, atau WhatsApp.",
    guideStep4Title:"Atur Tunggu & Kondisi",guideStep4Desc:"Gunakan node tunggu untuk jeda waktu dan node kondisi untuk percabangan.",
    guideStep5Title:"Tambah A/B Test",guideStep5Desc:"Bandingkan dua varian pesan dengan A/B Test.",
    guideStep6Title:"Simpan & Jalankan",guideStep6Desc:"Simpan dan aktifkan perjalanan dengan ▶.",
    guideNodesTitle:"Jenis Node yang Tersedia",
    guideNodeTrigger:"Titik awal perjalanan.",guideNodeEmail:"Kirim email otomatis.",guideNodeKakao:"Kirim pesan KakaoTalk.",guideNodeLine:"Kirim pesan LINE.",guideNodeSms:"Kirim pesan SMS.",guideNodeWhatsapp:"Kirim pesan WhatsApp.",guideNodeDelay:"Tunggu waktu tertentu.",guideNodeCondition:"Percabangan berdasarkan perilaku.",guideNodeAbTest:"Bagi pelanggan jadi 2 grup.",guideNodeWebhook:"Kirim data ke sistem eksternal.",guideNodePush:"Kirim notifikasi push.",guideNodeEnd:"Titik akhir perjalanan.",
    guideTipsTitle:"Tips Berguna",guideTip1:"Daftarkan API key di Integration Hub untuk membuka lebih banyak saluran.",guideTip2:"Gunakan A/B test untuk menemukan pesan terbaik.",guideTip3:"Node kondisi memungkinkan pesan tindak lanjut yang dipersonalisasi.",guideTip4:"Duplikat perjalanan yang ada untuk variasi cepat.",guideTip5:"Pantau tingkat konversi secara real-time."
  }
};

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const objStr = raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  try {
    const obj = JSON.parse(objStr);
    const keys = guideKeys[lang] || guideKeys.en;
    if (!obj.journey) obj.journey = {};
    Object.assign(obj.journey, keys);
    fs.writeFileSync(filePath, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
    console.log(`✅ [${lang}] guide keys: ${Object.keys(keys).length}, total journey: ${Object.keys(obj.journey).length}, tabGuide: "${obj.journey.tabGuide}"`);
  } catch (e) {
    console.log(`❌ [${lang}] ${e.message.substring(0, 80)}`);
  }
});
console.log('\n🎉 All 9 languages with native guide translations!');
