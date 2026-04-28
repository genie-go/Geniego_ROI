const fs=require('fs');
const DIR='src/i18n/locales';

const GUIDE_KEYS={
ko:{
guideStep1Title:'캠페인 생성',guideStep1Desc:'AI 오토 마케팅 또는 통합 AI 캠페인 빌더에서 캠페인을 생성합니다. 예산, 타겟 ROAS, 기간을 설정하고 광고 채널을 선택합니다. 생성된 캠페인은 "예약됨" 상태로 등록되며, 승인 후 활성화됩니다.',
guideStep2Title:'캠페인 승인',guideStep2Desc:'예약된 캠페인 카드의 "✅ 활성화 승인" 버튼을 클릭합니다. 승인 모달에서 캠페인 정보를 확인하고 메모를 입력한 후 승인합니다. 승인 즉시 캠페인이 "운영중" 상태로 전환됩니다.',
guideStep3Title:'실시간 모니터링',guideStep3Desc:'모니터링 탭에서 활성 캠페인의 실시간 KPI를 확인합니다. 소진율, 일일 예산, 전환 수, CPA를 실시간으로 추적하며 목표 대비 실제 성과를 비교합니다.',
guideStep4Title:'예산 알림 관리',guideStep4Desc:'예산 소진율 70% 이상 시 자동 알림이 발생합니다. 95% 이상은 자동 일시정지, 85-95%는 경고 알림, 70-85%는 모니터링 단계로 분류됩니다. 알림 수준별 적절한 조치를 취합니다.',
guideStep5Title:'ROI 분석',guideStep5Desc:'ROI 분석 탭에서 캠페인별 ROAS, ROI, 소진 금액을 종합 비교합니다. 상위 3개 캠페인은 하이라이트되며, 평균 ROAS와 평균 CPA 지표로 전체 마케팅 효율을 평가합니다.',
guideStep6Title:'AI 카피 생성',guideStep6Desc:'AI 카피라이터 탭에서 광고 카피를 자동 생성합니다. 채널(Meta, Google, TikTok 등)과 톤(전문적, 캐주얼, 긴급 등)을 선택하고 프롬프트를 입력하면 AI가 헤드라인, 본문, CTA를 생성합니다.',
guideTabOverviewName:'캠페인 현황',guideTabOverviewDesc:'전체 캠페인 목록을 카드 형태로 표시합니다. 상태별 필터링, 예산 소진율, ROAS 실적을 한눈에 확인할 수 있습니다.',
guideTabAbName:'A/B 테스트',guideTabAbDesc:'이메일 마케팅과 어트리뷰션에서 진행된 A/B 테스트 결과를 통합 조회합니다. 승자 변형과 신뢰도를 확인합니다.',
guideTabDetailName:'상세 분석',guideTabDetailDesc:'선택한 캠페인의 KPI 목표 vs 실적, 채널별 예산 배분, 인플루언서 목록 등 세부 정보를 확인합니다.',
guideTabGanttName:'일정 관리',guideTabGanttDesc:'간트 차트로 캠페인 일정을 시각화합니다. 기간 중복, 예산 소진 진행률을 타임라인으로 확인합니다.',
guideTabCrmName:'CRM 채널',guideTabCrmDesc:'이메일 마케팅과 카카오톡 채널의 캠페인 현황을 통합 조회합니다. 발송 수, 오픈율, 성공/실패 현황을 확인합니다.',
guideTabRoiName:'ROI 분석',guideTabRoiDesc:'전체 캠페인의 ROI를 종합 분석합니다. 총 지출, 총 수익, 평균 ROAS, 평균 CPA를 표시하고 캠페인별 랭킹을 제공합니다.',
guideTabMonitorName:'실시간 모니터링',guideTabMonitorDesc:'활성 캠페인의 실시간 KPI를 모니터링합니다. 소진율, 일일 예산, 전환 수, CPA, 남은 일수를 실시간으로 추적합니다.',
guideTabBudgetName:'예산 알림',guideTabBudgetDesc:'예산 소진율 기준 자동 알림 시스템입니다. 95% 이상 자동 일시정지, 85-95% 경고, 70-85% 주의 단계로 운영합니다.',
guideTabCopyName:'AI 카피',guideTabCopyDesc:'AI 기반 광고 카피 자동 생성기입니다. 채널과 톤을 선택하고 프롬프트를 입력하면 헤드라인, 본문, CTA를 생성합니다.',
tabCreative:'AI 광고 소재',
creativeTitle:'AI 광고 크리에이티브 생성기',
creativeSub:'자연어 프롬프트를 입력하면 AI가 내용을 분석하여 캠페인에 맞는 광고 디자인을 자동 생성합니다.',
guideTabCreativeName:'AI 광고 소재',guideTabCreativeDesc:'자연어 프롬프트 기반 AI 광고 이미지 생성기입니다. 해변, 파티, 패션 등 16가지 씬을 자동 감지하여 맞춤형 광고 디자인을 생성합니다.',
channelFee:'수수료',channelFeeRate:'수수료율',noFeeData:'수수료 정보 없음',
},
en:{
guideStep1Title:'Create Campaign',guideStep1Desc:'Create campaigns from AI Auto Marketing or the Unified AI Campaign Builder. Set budget, target ROAS, duration, and select ad channels. Created campaigns are registered as "Scheduled" and activated after approval.',
guideStep2Title:'Approve Campaign',guideStep2Desc:'Click the "✅ Activate & Approve" button on the scheduled campaign card. Review campaign details in the approval modal, add notes, and approve. The campaign immediately transitions to "Active" status.',
guideStep3Title:'Real-time Monitoring',guideStep3Desc:'Monitor real-time KPIs of active campaigns in the Monitor tab. Track burn rate, daily budget, conversions, and CPA in real-time, comparing actual performance against targets.',
guideStep4Title:'Budget Alert Management',guideStep4Desc:'Automatic alerts trigger when budget burn exceeds 70%. Above 95% triggers auto-pause, 85-95% triggers warning alerts, and 70-85% enters monitoring phase. Take appropriate action based on alert level.',
guideStep5Title:'ROI Analysis',guideStep5Desc:'Compare ROAS, ROI, and spend across campaigns in the ROI Analysis tab. Top 3 campaigns are highlighted, with average ROAS and CPA metrics for overall marketing efficiency evaluation.',
guideStep6Title:'AI Copy Generation',guideStep6Desc:'Auto-generate ad copy in the AI Copywriter tab. Select channel (Meta, Google, TikTok, etc.) and tone (Professional, Casual, Urgent, etc.), enter a prompt, and AI generates headline, body text, and CTA.',
guideTabOverviewName:'Campaign Overview',guideTabOverviewDesc:'Displays all campaigns as cards with status filtering, budget burn rate, and ROAS performance at a glance.',
guideTabAbName:'A/B Testing',guideTabAbDesc:'View integrated A/B test results from Email Marketing and Attribution. Check winning variants and confidence levels.',
guideTabDetailName:'Detail Analysis',guideTabDetailDesc:'View selected campaign KPI targets vs actuals, channel budget allocation, and influencer lists.',
guideTabGanttName:'Schedule',guideTabGanttDesc:'Visualize campaign schedules with Gantt charts. Check timeline overlaps and budget burn progress.',
guideTabCrmName:'CRM Channels',guideTabCrmDesc:'View integrated Email and KakaoTalk campaign status including send counts, open rates, and success/failure metrics.',
guideTabRoiName:'ROI Analysis',guideTabRoiDesc:'Comprehensive ROI analysis across all campaigns. Shows total spend, revenue, average ROAS, CPA, and campaign rankings.',
guideTabMonitorName:'Real-time Monitor',guideTabMonitorDesc:'Live monitoring of active campaign KPIs: burn rate, daily budget, conversions, CPA, and remaining days.',
guideTabBudgetName:'Budget Alerts',guideTabBudgetDesc:'Automatic alert system based on budget burn rate. Auto-pause above 95%, warning at 85-95%, caution at 70-85%.',
guideTabCopyName:'AI Copywriter',guideTabCopyDesc:'AI-powered ad copy generator. Select channel and tone, enter a prompt, and get auto-generated headlines, body text, and CTAs.',
tabCreative:'AI Creative',
creativeTitle:'AI Ad Creative Generator',
creativeSub:'Enter a natural language prompt and AI will analyze the content to auto-generate campaign-specific ad designs.',
guideTabCreativeName:'AI Creative',guideTabCreativeDesc:'Natural language prompt-based AI ad image generator. Auto-detects 16 scene types including beach, party, fashion for custom ad designs.',
channelFee:'Fee',channelFeeRate:'Fee Rate',noFeeData:'No fee data',
},
ja:{
guideStep1Title:'キャンペーン作成',guideStep1Desc:'AIオートマーケティングまたは統合AIキャンペーンビルダーからキャンペーンを作成します。予算、目標ROAS、期間を設定し、広告チャネルを選択します。作成されたキャンペーンは「予約済み」として登録され、承認後に有効化されます。',
guideStep2Title:'キャンペーン承認',guideStep2Desc:'予約済みキャンペーンカードの「✅有効化承認」ボタンをクリックします。承認モーダルでキャンペーン情報を確認し、メモを入力して承認します。承認と同時にキャンペーンが「運用中」に移行します。',
guideStep3Title:'リアルタイム監視',guideStep3Desc:'モニタリングタブでアクティブキャンペーンのリアルタイムKPIを確認します。消化率、日次予算、コンバージョン数、CPAをリアルタイムで追跡します。',
guideStep4Title:'予算アラート管理',guideStep4Desc:'予算消化率70%以上で自動アラートが発生します。95%以上は自動一時停止、85-95%は警告、70-85%は監視段階に分類されます。',
guideStep5Title:'ROI分析',guideStep5Desc:'ROI分析タブでキャンペーン別ROAS、ROI、消化額を総合比較します。上位3キャンペーンがハイライトされます。',
guideStep6Title:'AIコピー生成',guideStep6Desc:'AIコピーライタータブで広告コピーを自動生成します。チャネルとトーンを選択し、プロンプトを入力するとAIがヘッドライン、本文、CTAを生成します。',
guideTabOverviewName:'キャンペーン概要',guideTabOverviewDesc:'全キャンペーンをカード形式で表示。ステータスフィルタリング、予算消化率、ROAS実績を一目で確認できます。',
guideTabAbName:'A/Bテスト',guideTabAbDesc:'メールマーケティングとアトリビューションのA/Bテスト結果を統合表示します。',
guideTabDetailName:'詳細分析',guideTabDetailDesc:'選択したキャンペーンのKPI目標vs実績、チャネル別予算配分、インフルエンサー情報を確認します。',
guideTabGanttName:'スケジュール',guideTabGanttDesc:'ガントチャートでキャンペーンスケジュールを視覚化します。',
guideTabCrmName:'CRMチャネル',guideTabCrmDesc:'メールとKakaoTalkの統合キャンペーン状況を確認します。',
guideTabRoiName:'ROI分析',guideTabRoiDesc:'全キャンペーンのROIを総合分析。総支出、総収益、平均ROAS、平均CPAを表示します。',
guideTabMonitorName:'リアルタイム監視',guideTabMonitorDesc:'アクティブキャンペーンのリアルタイムKPI監視。消化率、日次予算、CV数、CPAを追跡します。',
guideTabBudgetName:'予算アラート',guideTabBudgetDesc:'予算消化率基準の自動アラートシステム。95%以上で自動停止、85-95%で警告。',
guideTabCopyName:'AIコピー',guideTabCopyDesc:'AI広告コピー自動生成ツール。チャネルとトーンを選択し、プロンプトからコピーを生成します。',
tabCreative:'AI広告素材',creativeTitle:'AI広告クリエイティブ生成',creativeSub:'自然言語プロンプトでAIがキャンペーン向け広告デザインを自動生成します。',
guideTabCreativeName:'AI広告素材',guideTabCreativeDesc:'自然言語プロンプト基盤のAI広告画像生成。16種類のシーンを自動検出してカスタムデザインを生成します。',
channelFee:'手数料',channelFeeRate:'手数料率',noFeeData:'手数料情報なし',
},
zh:{
guideStep1Title:'创建活动',guideStep1Desc:'从AI自动营销或统合AI活动构建器创建活动。设置预算、目标ROAS、期限并选择广告渠道。创建的活动以"已预约"状态注册，审批后激活。',
guideStep2Title:'审批活动',guideStep2Desc:'点击预约活动卡片上的"✅激活审批"按钮。在审批窗口确认活动信息、输入备注后批准。审批后活动立即转为"运营中"状态。',
guideStep3Title:'实时监控',guideStep3Desc:'在监控标签页查看活动KPI的实时数据。追踪消耗率、每日预算、转化数、CPA。',
guideStep4Title:'预算告警管理',guideStep4Desc:'预算消耗率超过70%时自动触发告警。95%以上自动暂停，85-95%警告，70-85%监控。',
guideStep5Title:'ROI分析',guideStep5Desc:'在ROI分析标签页综合比较各活动的ROAS、ROI和消耗金额。前3名活动高亮显示。',
guideStep6Title:'AI文案生成',guideStep6Desc:'在AI文案标签页自动生成广告文案。选择渠道和语气，输入提示，AI将生成标题、正文和CTA。',
guideTabOverviewName:'活动概览',guideTabOverviewDesc:'以卡片形式展示所有活动。可按状态筛选并查看预算消耗率和ROAS。',
guideTabAbName:'A/B测试',guideTabAbDesc:'统合查看邮件营销和归因分析的A/B测试结果。',
guideTabDetailName:'详细分析',guideTabDetailDesc:'查看所选活动的KPI目标与实际比较、渠道预算分配和KOL信息。',
guideTabGanttName:'日程管理',guideTabGanttDesc:'用甘特图可视化活动日程。查看时间线重叠和预算消耗进度。',
guideTabCrmName:'CRM渠道',guideTabCrmDesc:'统合查看电子邮件和KakaoTalk渠道的活动状况。',
guideTabRoiName:'ROI分析',guideTabRoiDesc:'综合分析所有活动ROI。显示总支出、总收入、平均ROAS和CPA。',
guideTabMonitorName:'实时监控',guideTabMonitorDesc:'实时监控活动KPI：消耗率、每日预算、转化数、CPA。',
guideTabBudgetName:'预算告警',guideTabBudgetDesc:'基于预算消耗率的自动告警系统。95%以上自动暂停，85-95%警告。',
guideTabCopyName:'AI文案',guideTabCopyDesc:'AI广告文案自动生成工具。选择渠道和语气，从提示生成文案。',
tabCreative:'AI广告素材',creativeTitle:'AI广告创意生成器',creativeSub:'输入自然语言提示，AI分析内容自动生成适合活动的广告设计。',
guideTabCreativeName:'AI广告素材',guideTabCreativeDesc:'基于自然语言提示的AI广告图像生成器。自动检测16种场景类型生成定制广告设计。',
channelFee:'手续费',channelFeeRate:'费率',noFeeData:'无费用数据',
},
'zh-TW':{
guideStep1Title:'建立活動',guideStep1Desc:'從AI自動行銷或統合AI活動建構器建立活動。設定預算、目標ROAS、期限並選擇廣告頻道。建立的活動以「已預約」狀態註冊，核准後啟用。',
guideStep2Title:'核准活動',guideStep2Desc:'點擊預約活動卡片上的「✅啟用核准」按鈕。在核准視窗確認活動資訊、輸入備註後批准。',
guideStep3Title:'即時監控',guideStep3Desc:'在監控標籤頁查看活動KPI的即時數據。追蹤消耗率、每日預算、轉換數、CPA。',
guideStep4Title:'預算警報管理',guideStep4Desc:'預算消耗率超過70%時自動觸發警報。95%以上自動暫停，85-95%警告，70-85%監控。',
guideStep5Title:'ROI分析',guideStep5Desc:'在ROI分析標籤頁綜合比較各活動的ROAS、ROI和消耗金額。',
guideStep6Title:'AI文案生成',guideStep6Desc:'在AI文案標籤頁自動生成廣告文案。選擇頻道和語氣，輸入提示，AI生成標題、正文和CTA。',
guideTabOverviewName:'活動概覽',guideTabOverviewDesc:'以卡片形式展示所有活動，可按狀態篩選並查看預算消耗率。',
guideTabAbName:'A/B測試',guideTabAbDesc:'統合查看郵件行銷和歸因分析的A/B測試結果。',
guideTabDetailName:'詳細分析',guideTabDetailDesc:'查看所選活動的KPI目標與實際比較、頻道預算分配。',
guideTabGanttName:'日程管理',guideTabGanttDesc:'用甘特圖視覺化活動日程，查看時間軸重疊和預算消耗進度。',
guideTabCrmName:'CRM頻道',guideTabCrmDesc:'統合查看電子郵件和KakaoTalk頻道的活動狀況。',
guideTabRoiName:'ROI分析',guideTabRoiDesc:'綜合分析所有活動ROI，顯示總支出、總收入、平均ROAS和CPA。',
guideTabMonitorName:'即時監控',guideTabMonitorDesc:'即時監控活動KPI：消耗率、每日預算、轉換數、CPA。',
guideTabBudgetName:'預算警報',guideTabBudgetDesc:'基於預算消耗率的自動警報系統。95%以上自動暫停。',
guideTabCopyName:'AI文案',guideTabCopyDesc:'AI廣告文案自動生成工具。',
tabCreative:'AI廣告素材',creativeTitle:'AI廣告創意生成器',creativeSub:'輸入自然語言提示，AI分析內容自動生成適合活動的廣告設計。',
guideTabCreativeName:'AI廣告素材',guideTabCreativeDesc:'基於自然語言提示的AI廣告影像生成器，自動偵測16種場景類型。',
channelFee:'手續費',channelFeeRate:'費率',noFeeData:'無費用資料',
},
th:{
guideStep1Title:'สร้างแคมเปญ',guideStep1Desc:'สร้างแคมเปญจาก AI Auto Marketing หรือ Unified AI Campaign Builder ตั้งค่างบ, เป้า ROAS, ระยะเวลา และเลือกช่องทางโฆษณา แคมเปญที่สร้างจะลงทะเบียนเป็น "กำหนดแล้ว" และเปิดใช้งานหลังอนุมัติ',
guideStep2Title:'อนุมัติแคมเปญ',guideStep2Desc:'คลิกปุ่ม "✅ เปิดใช้งาน" บนการ์ดแคมเปญที่กำหนดไว้ ตรวจสอบข้อมูลในหน้าต่างอนุมัติ เพิ่มหมายเหตุ และอนุมัติ',
guideStep3Title:'ติดตามเรียลไทม์',guideStep3Desc:'ติดตาม KPI ของแคมเปญที่ใช้งานอยู่แบบเรียลไทม์ในแท็บมอนิเตอร์ ติดตามอัตราการใช้จ่าย งบรายวัน การแปลง และ CPA',
guideStep4Title:'การจัดการแจ้งเตือนงบ',guideStep4Desc:'แจ้งเตือนอัตโนมัติเมื่ออัตราใช้จ่ายเกิน 70% เกิน 95% หยุดอัตโนมัติ 85-95% คำเตือน 70-85% เฝ้าระวัง',
guideStep5Title:'การวิเคราะห์ ROI',guideStep5Desc:'เปรียบเทียบ ROAS, ROI และค่าใช้จ่ายของแคมเปญทั้งหมดในแท็บ ROI Analysis แคมเปญ 3 อันดับแรกจะถูกไฮไลท์',
guideStep6Title:'สร้างสำเนา AI',guideStep6Desc:'สร้างสำเนาโฆษณาอัตโนมัติในแท็บ AI Copywriter เลือกช่องทางและโทน ป้อนพรอมต์ AI จะสร้างหัวข้อ เนื้อหา และ CTA',
guideTabOverviewName:'ภาพรวมแคมเปญ',guideTabOverviewDesc:'แสดงแคมเปญทั้งหมดเป็นการ์ด กรองตามสถานะ ดูอัตราใช้จ่ายและ ROAS',
guideTabAbName:'การทดสอบ A/B',guideTabAbDesc:'ดูผลการทดสอบ A/B จาก Email Marketing และ Attribution',
guideTabDetailName:'การวิเคราะห์รายละเอียด',guideTabDetailDesc:'ดูเป้า KPI เทียบกับจริง การจัดสรรงบแต่ละช่องทาง',
guideTabGanttName:'ตารางเวลา',guideTabGanttDesc:'แสดงตารางแคมเปญด้วย Gantt Chart',
guideTabCrmName:'ช่อง CRM',guideTabCrmDesc:'ดูสถานะแคมเปญ Email และ KakaoTalk แบบรวม',
guideTabRoiName:'วิเคราะห์ ROI',guideTabRoiDesc:'วิเคราะห์ ROI ทุกแคมเปญแบบรวม',
guideTabMonitorName:'มอนิเตอร์เรียลไทม์',guideTabMonitorDesc:'ติดตาม KPI แบบเรียลไทม์',
guideTabBudgetName:'แจ้งเตือนงบ',guideTabBudgetDesc:'ระบบแจ้งเตือนอัตโนมัติตามอัตราใช้จ่ายงบ',
guideTabCopyName:'AI Copywriter',guideTabCopyDesc:'เครื่องมือสร้างสำเนาโฆษณาด้วย AI',
tabCreative:'AI สื่อโฆษณา',creativeTitle:'เครื่องมือสร้างครีเอทีฟ AI',creativeSub:'ป้อนพรอมต์ภาษาธรรมชาติ AI จะวิเคราะห์และสร้างดีไซน์โฆษณาอัตโนมัติ',
guideTabCreativeName:'AI สื่อโฆษณา',guideTabCreativeDesc:'เครื่องมือสร้างภาพโฆษณา AI ตามพรอมต์ภาษาธรรมชาติ ตรวจจับ 16 ประเภทฉากอัตโนมัติ',
channelFee:'ค่าธรรมเนียม',channelFeeRate:'อัตราค่าธรรมเนียม',noFeeData:'ไม่มีข้อมูลค่าธรรมเนียม',
},
vi:{
guideStep1Title:'Tạo chiến dịch',guideStep1Desc:'Tạo chiến dịch từ AI Auto Marketing hoặc Unified Builder. Đặt ngân sách, ROAS mục tiêu, thời gian và chọn kênh quảng cáo. Chiến dịch được đăng ký ở trạng thái "Đã lên lịch" và kích hoạt sau khi phê duyệt.',
guideStep2Title:'Phê duyệt chiến dịch',guideStep2Desc:'Nhấn nút "✅ Kích hoạt" trên thẻ chiến dịch đã lên lịch. Xem thông tin trong hộp thoại phê duyệt, thêm ghi chú và phê duyệt.',
guideStep3Title:'Giám sát thời gian thực',guideStep3Desc:'Theo dõi KPI chiến dịch đang hoạt động theo thời gian thực. Tỷ lệ tiêu hao, ngân sách hàng ngày, chuyển đổi, CPA.',
guideStep4Title:'Quản lý cảnh báo ngân sách',guideStep4Desc:'Cảnh báo tự động khi tỷ lệ chi tiêu vượt 70%. Trên 95% tự động tạm dừng, 85-95% cảnh báo, 70-85% theo dõi.',
guideStep5Title:'Phân tích ROI',guideStep5Desc:'So sánh ROAS, ROI và chi tiêu của tất cả chiến dịch trong tab ROI. Top 3 được đánh dấu.',
guideStep6Title:'Tạo bản sao AI',guideStep6Desc:'Tự động tạo bản sao quảng cáo trong tab AI Copywriter. Chọn kênh, giọng điệu và nhập prompt.',
guideTabOverviewName:'Tổng quan chiến dịch',guideTabOverviewDesc:'Hiển thị tất cả chiến dịch dạng thẻ. Lọc theo trạng thái, xem tỷ lệ chi tiêu.',
guideTabAbName:'Thử nghiệm A/B',guideTabAbDesc:'Xem kết quả A/B test từ Email Marketing và Attribution.',
guideTabDetailName:'Phân tích chi tiết',guideTabDetailDesc:'Xem KPI mục tiêu vs thực tế, phân bổ ngân sách theo kênh.',
guideTabGanttName:'Lịch trình',guideTabGanttDesc:'Trực quan hóa lịch trình chiến dịch bằng biểu đồ Gantt.',
guideTabCrmName:'Kênh CRM',guideTabCrmDesc:'Xem tình trạng chiến dịch Email và KakaoTalk.',
guideTabRoiName:'Phân tích ROI',guideTabRoiDesc:'Phân tích ROI toàn diện cho tất cả chiến dịch.',
guideTabMonitorName:'Giám sát thời gian thực',guideTabMonitorDesc:'Theo dõi KPI chiến dịch theo thời gian thực.',
guideTabBudgetName:'Cảnh báo ngân sách',guideTabBudgetDesc:'Hệ thống cảnh báo tự động dựa trên tỷ lệ tiêu ngân sách.',
guideTabCopyName:'AI Copywriter',guideTabCopyDesc:'Công cụ tạo bản sao quảng cáo bằng AI.',
tabCreative:'AI Sáng tạo',creativeTitle:'Trình tạo quảng cáo AI',creativeSub:'Nhập prompt ngôn ngữ tự nhiên, AI sẽ phân tích và tạo thiết kế quảng cáo tự động.',
guideTabCreativeName:'AI Sáng tạo',guideTabCreativeDesc:'Trình tạo hình ảnh quảng cáo AI dựa trên prompt. Tự động phát hiện 16 loại cảnh.',
channelFee:'Phí',channelFeeRate:'Tỷ lệ phí',noFeeData:'Không có dữ liệu phí',
},
de:{
guideStep1Title:'Kampagne erstellen',guideStep1Desc:'Erstellen Sie Kampagnen über AI Auto Marketing oder den Unified AI Campaign Builder. Setzen Sie Budget, Ziel-ROAS, Laufzeit und wählen Sie Werbekanäle. Erstellte Kampagnen werden als "Geplant" registriert und nach Genehmigung aktiviert.',
guideStep2Title:'Kampagne genehmigen',guideStep2Desc:'Klicken Sie auf "✅ Aktivieren & Genehmigen" auf der geplanten Kampagnenkarte. Überprüfen Sie die Details im Genehmigungsdialog und genehmigen Sie.',
guideStep3Title:'Echtzeit-Monitoring',guideStep3Desc:'Überwachen Sie KPIs aktiver Kampagnen in Echtzeit: Verbrauchsrate, Tagesbudget, Conversions und CPA.',
guideStep4Title:'Budget-Alarm-Management',guideStep4Desc:'Automatische Benachrichtigung bei Verbrauchsrate über 70%. Über 95% Auto-Pause, 85-95% Warnung, 70-85% Beobachtung.',
guideStep5Title:'ROI-Analyse',guideStep5Desc:'Vergleichen Sie ROAS, ROI und Ausgaben aller Kampagnen im ROI-Tab. Top 3 werden hervorgehoben.',
guideStep6Title:'AI-Copy-Generierung',guideStep6Desc:'Generieren Sie automatisch Werbetexte im AI Copywriter Tab. Wählen Sie Kanal und Ton, geben Sie einen Prompt ein.',
guideTabOverviewName:'Kampagnenübersicht',guideTabOverviewDesc:'Zeigt alle Kampagnen als Karten mit Statusfilterung und Verbrauchsrate.',
guideTabAbName:'A/B-Tests',guideTabAbDesc:'Zeigt integrierte A/B-Testergebnisse aus E-Mail-Marketing und Attribution.',
guideTabDetailName:'Detailanalyse',guideTabDetailDesc:'KPI-Ziele vs. Ist-Werte, Kanalbudget-Verteilung der ausgewählten Kampagne.',
guideTabGanttName:'Zeitplan',guideTabGanttDesc:'Visualisierung des Kampagnenzeitplans mit Gantt-Diagramm.',
guideTabCrmName:'CRM-Kanäle',guideTabCrmDesc:'Integrierte E-Mail- und KakaoTalk-Kampagnenstatus.',
guideTabRoiName:'ROI-Analyse',guideTabRoiDesc:'Umfassende ROI-Analyse aller Kampagnen.',
guideTabMonitorName:'Echtzeit-Monitor',guideTabMonitorDesc:'Live-Monitoring aktiver Kampagnen-KPIs.',
guideTabBudgetName:'Budget-Alarms',guideTabBudgetDesc:'Automatisches Alarmsystem basierend auf der Budgetverbrauchsrate.',
guideTabCopyName:'AI-Texter',guideTabCopyDesc:'KI-gestützter Werbetexter.',
tabCreative:'AI-Werbematerial',creativeTitle:'AI-Werbematerial-Generator',creativeSub:'Geben Sie einen natürlichsprachigen Prompt ein, und AI generiert automatisch kampagnenspezifische Werbedesigns.',
guideTabCreativeName:'AI-Werbematerial',guideTabCreativeDesc:'KI-Bildgenerator basierend auf natürlichsprachigen Prompts mit 16 Szenentypen.',
channelFee:'Gebühr',channelFeeRate:'Gebührenrate',noFeeData:'Keine Gebührendaten',
},
fr:{
guideStep1Title:'Créer une campagne',guideStep1Desc:'Créez des campagnes depuis AI Auto Marketing ou le Constructeur unifié. Définissez le budget, ROAS cible, durée et sélectionnez les canaux. Les campagnes sont enregistrées en "Planifié" et activées après approbation.',
guideStep2Title:'Approuver la campagne',guideStep2Desc:'Cliquez sur "✅ Activer" sur la carte campagne planifiée. Vérifiez les détails dans la fenêtre d\'approbation et approuvez.',
guideStep3Title:'Surveillance en temps réel',guideStep3Desc:'Surveillez les KPI des campagnes actives en temps réel: taux de dépense, budget quotidien, conversions et CPA.',
guideStep4Title:'Gestion des alertes budget',guideStep4Desc:'Alerte automatique quand le taux de dépense dépasse 70%. Au-dessus de 95% pause auto, 85-95% avertissement, 70-85% surveillance.',
guideStep5Title:'Analyse ROI',guideStep5Desc:'Comparez ROAS, ROI et dépenses de toutes les campagnes dans l\'onglet ROI. Les 3 premières sont mises en avant.',
guideStep6Title:'Génération de copies AI',guideStep6Desc:'Générez automatiquement des copies publicitaires dans l\'onglet AI Copywriter. Sélectionnez le canal et le ton, entrez un prompt.',
guideTabOverviewName:'Aperçu des campagnes',guideTabOverviewDesc:'Affiche toutes les campagnes en cartes avec filtrage par statut.',
guideTabAbName:'Tests A/B',guideTabAbDesc:'Résultats intégrés des tests A/B de l\'Email Marketing et de l\'Attribution.',
guideTabDetailName:'Analyse détaillée',guideTabDetailDesc:'KPI cibles vs réels, répartition du budget par canal.',
guideTabGanttName:'Planning',guideTabGanttDesc:'Visualisation du planning des campagnes en diagramme de Gantt.',
guideTabCrmName:'Canaux CRM',guideTabCrmDesc:'Statut intégré des campagnes Email et KakaoTalk.',
guideTabRoiName:'Analyse ROI',guideTabRoiDesc:'Analyse ROI complète de toutes les campagnes.',
guideTabMonitorName:'Surveillance temps réel',guideTabMonitorDesc:'Surveillance en direct des KPI des campagnes actives.',
guideTabBudgetName:'Alertes budget',guideTabBudgetDesc:'Système d\'alerte automatique basé sur le taux de consommation du budget.',
guideTabCopyName:'AI Rédacteur',guideTabCopyDesc:'Générateur de copies publicitaires alimenté par l\'IA.',
tabCreative:'AI Créatif',creativeTitle:'Générateur créatif AI',creativeSub:'Entrez un prompt en langage naturel et l\'AI génère automatiquement des designs publicitaires.',
guideTabCreativeName:'AI Créatif',guideTabCreativeDesc:'Générateur d\'images AI basé sur prompt en langage naturel avec 16 types de scènes.',
channelFee:'Frais',channelFeeRate:'Taux de frais',noFeeData:'Pas de données de frais',
},
es:{
guideStep1Title:'Crear campaña',guideStep1Desc:'Cree campañas desde AI Auto Marketing o el Constructor unificado. Configure presupuesto, ROAS objetivo, duración y seleccione canales. Las campañas se registran como "Programada" y se activan tras aprobación.',
guideStep2Title:'Aprobar campaña',guideStep2Desc:'Haga clic en "✅ Activar" en la tarjeta de campaña programada. Revise los detalles en el diálogo de aprobación y apruebe.',
guideStep3Title:'Monitoreo en tiempo real',guideStep3Desc:'Monitoree KPIs de campañas activas en tiempo real: tasa de gasto, presupuesto diario, conversiones y CPA.',
guideStep4Title:'Gestión de alertas de presupuesto',guideStep4Desc:'Alerta automática cuando la tasa de gasto supera 70%. Sobre 95% pausa automática, 85-95% advertencia, 70-85% vigilancia.',
guideStep5Title:'Análisis ROI',guideStep5Desc:'Compare ROAS, ROI y gasto de todas las campañas en la pestaña ROI. Los 3 primeros se destacan.',
guideStep6Title:'Generación de copies AI',guideStep6Desc:'Genere automáticamente copies publicitarios en la pestaña AI Copywriter. Seleccione canal y tono, ingrese un prompt.',
guideTabOverviewName:'Resumen de campañas',guideTabOverviewDesc:'Muestra todas las campañas como tarjetas con filtrado por estado.',
guideTabAbName:'Pruebas A/B',guideTabAbDesc:'Resultados integrados de pruebas A/B de Email Marketing y Attribution.',
guideTabDetailName:'Análisis detallado',guideTabDetailDesc:'KPI objetivos vs reales, distribución de presupuesto por canal.',
guideTabGanttName:'Cronograma',guideTabGanttDesc:'Visualización del cronograma de campañas en diagrama de Gantt.',
guideTabCrmName:'Canales CRM',guideTabCrmDesc:'Estado integrado de campañas Email y KakaoTalk.',
guideTabRoiName:'Análisis ROI',guideTabRoiDesc:'Análisis ROI completo de todas las campañas.',
guideTabMonitorName:'Monitor en tiempo real',guideTabMonitorDesc:'Monitoreo en vivo de KPIs de campañas activas.',
guideTabBudgetName:'Alertas de presupuesto',guideTabBudgetDesc:'Sistema de alerta automática basado en la tasa de consumo del presupuesto.',
guideTabCopyName:'AI Redactor',guideTabCopyDesc:'Generador de copies publicitarios impulsado por IA.',
tabCreative:'AI Creativo',creativeTitle:'Generador creativo AI',creativeSub:'Ingrese un prompt en lenguaje natural y la IA generará automáticamente diseños publicitarios.',
guideTabCreativeName:'AI Creativo',guideTabCreativeDesc:'Generador de imágenes AI basado en prompt con 16 tipos de escenas.',
channelFee:'Comisión',channelFeeRate:'Tasa de comisión',noFeeData:'Sin datos de comisión',
},
id:{
guideStep1Title:'Buat Kampanye',guideStep1Desc:'Buat kampanye dari AI Auto Marketing atau Unified Builder. Atur anggaran, target ROAS, durasi, dan pilih saluran iklan. Kampanye terdaftar sebagai "Terjadwal" dan aktif setelah disetujui.',
guideStep2Title:'Setujui Kampanye',guideStep2Desc:'Klik tombol "✅ Aktifkan" pada kartu kampanye terjadwal. Periksa detail di dialog persetujuan dan setujui.',
guideStep3Title:'Pemantauan Real-time',guideStep3Desc:'Pantau KPI kampanye aktif secara real-time: tingkat pengeluaran, anggaran harian, konversi, dan CPA.',
guideStep4Title:'Manajemen Peringatan Anggaran',guideStep4Desc:'Peringatan otomatis saat tingkat pengeluaran melebihi 70%. Di atas 95% jeda otomatis, 85-95% peringatan, 70-85% pemantauan.',
guideStep5Title:'Analisis ROI',guideStep5Desc:'Bandingkan ROAS, ROI, dan pengeluaran semua kampanye di tab ROI. 3 teratas disorot.',
guideStep6Title:'Pembuatan Copy AI',guideStep6Desc:'Buat copy iklan otomatis di tab AI Copywriter. Pilih saluran dan nada, masukkan prompt.',
guideTabOverviewName:'Ikhtisar Kampanye',guideTabOverviewDesc:'Menampilkan semua kampanye sebagai kartu dengan pemfilteran status.',
guideTabAbName:'Pengujian A/B',guideTabAbDesc:'Lihat hasil tes A/B dari Email Marketing dan Attribution.',
guideTabDetailName:'Analisis Detail',guideTabDetailDesc:'Lihat target KPI vs aktual, alokasi anggaran per saluran.',
guideTabGanttName:'Jadwal',guideTabGanttDesc:'Visualisasi jadwal kampanye dengan bagan Gantt.',
guideTabCrmName:'Saluran CRM',guideTabCrmDesc:'Status kampanye Email dan KakaoTalk terintegrasi.',
guideTabRoiName:'Analisis ROI',guideTabRoiDesc:'Analisis ROI komprehensif untuk semua kampanye.',
guideTabMonitorName:'Monitor Real-time',guideTabMonitorDesc:'Pemantauan KPI kampanye secara langsung.',
guideTabBudgetName:'Peringatan Anggaran',guideTabBudgetDesc:'Sistem peringatan otomatis berdasarkan tingkat konsumsi anggaran.',
guideTabCopyName:'AI Copywriter',guideTabCopyDesc:'Alat pembuat copy iklan bertenaga AI.',
tabCreative:'AI Kreatif',creativeTitle:'Generator Kreatif AI',creativeSub:'Masukkan prompt bahasa alami dan AI akan menghasilkan desain iklan kampanye secara otomatis.',
guideTabCreativeName:'AI Kreatif',guideTabCreativeDesc:'Generator gambar iklan AI berbasis prompt bahasa alami dengan 16 tipe adegan.',
channelFee:'Biaya',channelFeeRate:'Tarif Biaya',noFeeData:'Tidak ada data biaya',
},
};

const locales=['ko','en','ja','zh','zh-TW','th','vi','de','fr','es','id'];
let ok=0,fail=0;
for(const lang of locales){
  const file=`${DIR}/${lang}.js`;
  let src=fs.readFileSync(file,'utf8');
  const keys=GUIDE_KEYS[lang]||GUIDE_KEYS.en;
  let injected=0;
  for(const[k,v]of Object.entries(keys)){
    const pat=`campaignMgr`;
    if(src.includes(`"${k}":`)||src.includes(`${k}:`)){
      // check if already exists in campaignMgr block
      continue;
    }
    // find last key in campaignMgr block and inject before closing
    const re=/(campaignMgr\s*:\s*\{[^}]*?)([\s,]*\})/;
    // simpler: find the campaignMgr section and add keys
    const idx=src.lastIndexOf(`"guideTipsTitle"`);
    if(idx===-1){
      // find guideTip5 or last known key
      const idx2=src.lastIndexOf(`"guideTip5"`);
      if(idx2===-1){
        // inject after the last key before campaignMgr closing
      }
    }
    injected++;
  }
  // Use a different approach: find campaignMgr object and append keys
  const marker='"guideTip5"';
  const markerIdx=src.indexOf(marker);
  if(markerIdx===-1){
    console.log(`[${lang}] WARN: guideTip5 not found, trying alternate approach`);
    // Find the campaignMgr section end
    const cmStart=src.indexOf('"campaignMgr"');
    if(cmStart===-1){console.log(`[${lang}] ERROR: campaignMgr not found`);fail++;continue;}
    // Find matching closing brace - count braces
    let depth=0,cmEnd=-1;
    for(let i=src.indexOf('{',cmStart);i<src.length;i++){
      if(src[i]==='{')depth++;
      if(src[i]==='}'){depth--;if(depth===0){cmEnd=i;break;}}
    }
    if(cmEnd===-1){console.log(`[${lang}] ERROR: campaignMgr end not found`);fail++;continue;}
    const inject=','+Object.entries(keys).map(([k,v])=>`"${k}":${JSON.stringify(v)}`).join(',');
    src=src.slice(0,cmEnd)+inject+src.slice(cmEnd);
  } else {
    // Find the value after guideTip5
    let searchFrom=markerIdx+marker.length;
    // Find the comma or end of the value
    let afterVal=src.indexOf(',',searchFrom);
    if(afterVal===-1)afterVal=src.indexOf('}',searchFrom);
    // Find the end of the guideTip5 value (quoted string)
    const q1=src.indexOf('"',searchFrom+1);// colon
    const q2=src.indexOf(':',q1);
    const q3=src.indexOf('"',q2+1);
    let q4=q3+1;
    while(q4<src.length){
      if(src[q4]==='"'&&src[q4-1]!=='\\')break;
      q4++;
    }
    const insertAt=q4+1;
    const inject=','+Object.entries(keys).map(([k,v])=>`"${k}":${JSON.stringify(v)}`).join(',');
    src=src.slice(0,insertAt)+inject+src.slice(insertAt);
  }
  fs.writeFileSync(file,src,'utf8');
  console.log(`[${lang}] ✅ Injected ${Object.keys(keys).length} guide keys`);
  ok++;
}
console.log(`\nDone: ${ok} OK, ${fail} FAIL`);
