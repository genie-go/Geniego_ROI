const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const dashGuideKeys = {
  ko: {
    title:"대시보드 이용 가이드",subtitle:"Geniego-ROI 대시보드의 주요 기능과 활용법을 안내합니다. 각 탭별 핵심 지표를 실시간으로 모니터링하고 데이터 기반 의사결정을 내려보세요.",
    stepsTitle:"대시보드 시작 6단계",
    step1Title:"탭 선택하기",step1Desc:"상단 탭 바에서 원하는 대시보드를 선택합니다. 통합현황, 마케팅, 채널KPI, 커머스, 매출, 인플루언서, 시스템 총 7개 대시보드를 제공합니다.",
    step2Title:"KPI 카드 확인",step2Desc:"각 대시보드 상단의 KPI 카드에서 핵심 성과 지표를 한눈에 확인할 수 있습니다. 전일 대비 변화율도 함께 표시됩니다.",
    step3Title:"차트 분석하기",step3Desc:"트렌드 차트, 채널별 비교 차트, 매출 구성 차트 등을 통해 데이터를 시각적으로 분석할 수 있습니다.",
    step4Title:"기간 필터 사용",step4Desc:"날짜 범위를 변경하여 원하는 기간의 데이터를 조회할 수 있습니다. 일간, 주간, 월간 단위로 확인 가능합니다.",
    step5Title:"실시간 동기화",step5Desc:"대시보드는 5초마다 자동으로 데이터를 갱신합니다. LIVE 배지가 표시되면 실시간 데이터가 반영 중입니다.",
    step6Title:"통화/언어 변경",step6Desc:"우측 상단에서 통화(KRW/USD/JPY 등)와 언어(9개국어)를 자유롭게 변경할 수 있습니다.",
    tabsTitle:"탭별 상세 안내",
    tabOverview:"전체 매출, 주문수, 방문자, ROAS 등 핵심 KPI를 통합적으로 보여줍니다.",
    tabMarketing:"마케팅 채널별 성과, 캠페인 ROI, 광고비 대비 매출을 분석합니다.",
    tabChannel:"검색, 소셜, 이메일, 제휴 등 채널별 KPI와 전환율을 비교합니다.",
    tabCommerce:"주문, 결제, 정산, 반품 등 커머스 운영 현황을 실시간 모니터링합니다.",
    tabSales:"글로벌 매출 현황, 국가별 매출 비중, 통화별 실적을 확인합니다.",
    tabInfluencer:"인플루언서 협업 성과, ROI, 콘텐츠 효과를 추적합니다.",
    tabSystem:"서버 상태, API 응답률, 에러율 등 시스템 상태를 모니터링합니다.",
    featuresTitle:"핵심 기능",
    feat1Title:"실시간 데이터",feat1Desc:"5초 간격으로 데이터가 자동 갱신되어 항상 최신 상태를 유지합니다.",
    feat2Title:"크로스 채널 통합",feat2Desc:"모든 마케팅 채널과 커머스 데이터를 하나의 대시보드에서 통합 관리합니다.",
    feat3Title:"9개국어 지원",feat3Desc:"한국어, 영어, 일본어, 중국어 등 9개 언어로 대시보드를 이용할 수 있습니다.",
    feat4Title:"다중 통화 지원",feat4Desc:"KRW, USD, JPY, EUR 등 주요 통화로 금액을 자동 변환하여 표시합니다.",
    feat5Title:"보안 모니터링",feat5Desc:"엔터프라이즈급 보안 감지 시스템이 실시간으로 위협을 탐지하고 알림합니다.",
    feat6Title:"반응형 디자인",feat6Desc:"데스크톱, 태블릿, 모바일 등 모든 디바이스에 최적화된 인터페이스를 제공합니다.",
    tipsTitle:"유용한 팁",
    tip1:"통합현황 탭에서 전체 비즈니스 건강도를 빠르게 파악한 후 세부 탭으로 이동하세요.",
    tip2:"KPI 카드의 변화율(%)을 주시하면 이상 징후를 조기에 발견할 수 있습니다.",
    tip3:"채널 KPI 탭에서 가장 효율적인 마케팅 채널을 식별하고 예산을 최적화하세요.",
    tip4:"시스템 탭을 정기적으로 확인하여 API 응답률과 서버 상태를 모니터링하세요.",
    tip5:"대시보드 URL에 ?view=탭ID를 추가하면 특정 탭으로 바로 이동할 수 있습니다."
  },
  en: {
    title:"Dashboard User Guide",subtitle:"Learn about the key features and how to use the Geniego-ROI dashboard. Monitor real-time KPIs across tabs and make data-driven decisions.",
    stepsTitle:"6 Steps to Get Started",
    step1Title:"Select a Tab",step1Desc:"Choose a dashboard from the tab bar. 7 dashboards are available: Overview, Marketing, Channel KPI, Commerce, Sales, Influencer, and System.",
    step2Title:"Check KPI Cards",step2Desc:"View key performance indicators at the top of each dashboard. Day-over-day changes are also displayed.",
    step3Title:"Analyze Charts",step3Desc:"Visually analyze data through trend charts, channel comparison charts, and revenue composition charts.",
    step4Title:"Use Date Filters",step4Desc:"Change the date range to view data for a specific period. Daily, weekly, and monthly views are available.",
    step5Title:"Real-time Sync",step5Desc:"The dashboard automatically refreshes every 5 seconds. The LIVE badge indicates real-time data is being reflected.",
    step6Title:"Change Currency/Language",step6Desc:"Switch currency (KRW/USD/JPY etc.) and language (9 languages) from the top-right corner.",
    tabsTitle:"Tab-by-Tab Guide",
    tabOverview:"Shows integrated KPIs including total revenue, orders, visitors, and ROAS.",
    tabMarketing:"Analyzes marketing channel performance, campaign ROI, and ad spend vs. revenue.",
    tabChannel:"Compares KPIs and conversion rates across search, social, email, and affiliate channels.",
    tabCommerce:"Monitors commerce operations including orders, payments, settlements, and returns in real-time.",
    tabSales:"View global sales status, revenue share by country, and performance by currency.",
    tabInfluencer:"Track influencer collaboration performance, ROI, and content effectiveness.",
    tabSystem:"Monitor server status, API response rates, and error rates.",
    featuresTitle:"Key Features",
    feat1Title:"Real-time Data",feat1Desc:"Data auto-refreshes every 5 seconds to always stay current.",
    feat2Title:"Cross-channel Integration",feat2Desc:"Manage all marketing channels and commerce data in one unified dashboard.",
    feat3Title:"9 Languages",feat3Desc:"Use the dashboard in Korean, English, Japanese, Chinese, and 5 more languages.",
    feat4Title:"Multi-currency",feat4Desc:"Automatically converts and displays amounts in KRW, USD, JPY, EUR, and more.",
    feat5Title:"Security Monitoring",feat5Desc:"Enterprise-grade security detection system monitors threats in real-time.",
    feat6Title:"Responsive Design",feat6Desc:"Optimized interface for desktop, tablet, and mobile devices.",
    tipsTitle:"Useful Tips",
    tip1:"Start with the Overview tab to get a quick health check of your entire business.",
    tip2:"Watch the KPI card change rates (%) to detect anomalies early.",
    tip3:"Use the Channel KPI tab to identify your most efficient marketing channels and optimize budgets.",
    tip4:"Regularly check the System tab to monitor API response rates and server health.",
    tip5:"Add ?view=tabID to the dashboard URL to jump directly to a specific tab."
  },
  ja: {
    title:"ダッシュボード利用ガイド",subtitle:"Geniego-ROIダッシュボードの主要機能と活用方法をご案内します。リアルタイムKPIを監視し、データに基づく意思決定を行いましょう。",
    stepsTitle:"ダッシュボード開始6ステップ",
    step1Title:"タブを選択",step1Desc:"タブバーから目的のダッシュボードを選択します。統合概要、マーケティング、チャネルKPI、コマース、売上、インフルエンサー、システムの7種類。",
    step2Title:"KPIカード確認",step2Desc:"各ダッシュボード上部のKPIカードで主要指標を一目で確認できます。",
    step3Title:"チャート分析",step3Desc:"トレンドチャート、チャネル比較チャートなどでデータを視覚的に分析できます。",
    step4Title:"期間フィルター",step4Desc:"日付範囲を変更して任意の期間のデータを表示できます。",
    step5Title:"リアルタイム同期",step5Desc:"5秒ごとに自動更新されます。LIVEバッジはリアルタイムデータを示します。",
    step6Title:"通貨・言語変更",step6Desc:"右上から通貨と言語を自由に切り替えられます。",
    tabsTitle:"タブ別ガイド",
    tabOverview:"売上、注文数、訪問者、ROASなどの統合KPIを表示します。",tabMarketing:"マーケティングチャネル別の成果とROIを分析します。",tabChannel:"チャネル別KPIとコンバージョン率を比較します。",tabCommerce:"注文、決済、精算などのコマース運営状況をモニタリングします。",tabSales:"グローバル売上と通貨別実績を確認します。",tabInfluencer:"インフルエンサー連携の成果とROIを追跡します。",tabSystem:"サーバー状態とAPI応答率を監視します。",
    featuresTitle:"主要機能",feat1Title:"リアルタイムデータ",feat1Desc:"5秒間隔で自動更新し常に最新の状態を維持します。",feat2Title:"クロスチャネル統合",feat2Desc:"全チャネルのデータを一つのダッシュボードで管理します。",feat3Title:"9言語対応",feat3Desc:"日本語、韓国語、英語、中国語など9言語に対応。",feat4Title:"マルチ通貨",feat4Desc:"JPY、USD、KRWなど主要通貨で自動換算表示します。",feat5Title:"セキュリティ監視",feat5Desc:"エンタープライズ級のリアルタイム脅威検知システム。",feat6Title:"レスポンシブデザイン",feat6Desc:"全デバイスに最適化されたUI。",
    tipsTitle:"役立つヒント",tip1:"まず概要タブでビジネス全体の健全性を把握しましょう。",tip2:"KPI変化率を注視して異常を早期発見しましょう。",tip3:"チャネルKPIで最も効率的なチャネルを特定しましょう。",tip4:"システムタブで定期的にAPIとサーバーを確認しましょう。",tip5:"URLに?view=tabIDを追加すると特定タブに直接移動できます。"
  },
  zh: {
    title:"仪表板使用指南",subtitle:"了解Geniego-ROI仪表板的主要功能和使用方法。实时监控各项KPI，做出数据驱动的决策。",
    stepsTitle:"仪表板入门6步",
    step1Title:"选择标签页",step1Desc:"从标签栏中选择仪表板。共有7个：统一概览、营销、渠道KPI、电商、销售、网红、系统。",
    step2Title:"查看KPI卡片",step2Desc:"在每个仪表板顶部查看关键绩效指标，同时显示日环比变化。",
    step3Title:"分析图表",step3Desc:"通过趋势图、渠道对比图、收入构成图等进行可视化数据分析。",
    step4Title:"使用日期筛选",step4Desc:"更改日期范围查看特定时段的数据，支持日/周/月视图。",
    step5Title:"实时同步",step5Desc:"仪表板每5秒自动刷新数据。LIVE标识表示正在反映实时数据。",
    step6Title:"切换货币/语言",step6Desc:"在右上角自由切换货币（KRW/USD/JPY等）和语言（9种）。",
    tabsTitle:"标签页详细说明",
    tabOverview:"展示总收入、订单数、访客数、ROAS等综合KPI。",tabMarketing:"分析各营销渠道表现、广告ROI和广告支出回报。",tabChannel:"比较搜索、社交、邮件、联盟等渠道的KPI和转化率。",tabCommerce:"实时监控订单、支付、结算、退货等电商运营。",tabSales:"查看全球销售状况、各国收入占比和各币种业绩。",tabInfluencer:"追踪网红合作绩效、ROI和内容效果。",tabSystem:"监控服务器状态、API响应率和错误率。",
    featuresTitle:"核心功能",feat1Title:"实时数据",feat1Desc:"每5秒自动刷新，始终保持最新状态。",feat2Title:"跨渠道整合",feat2Desc:"在一个仪表板中统一管理所有渠道数据。",feat3Title:"9种语言",feat3Desc:"支持中文、韩语、英语、日语等9种语言。",feat4Title:"多币种支持",feat4Desc:"自动转换并显示CNY、USD、JPY、KRW等货币。",feat5Title:"安全监控",feat5Desc:"企业级实时威胁检测系统。",feat6Title:"响应式设计",feat6Desc:"适配桌面、平板和移动设备。",
    tipsTitle:"实用技巧",tip1:"先从概览标签了解整体业务健康状况。",tip2:"关注KPI变化率以及早发现异常。",tip3:"在渠道KPI中找到最高效的营销渠道。",tip4:"定期查看系统标签监控API和服务器。",tip5:"在URL中添加?view=tabID可直接跳转到指定标签。"
  },
  "zh-TW": {
    title:"儀表板使用指南",subtitle:"了解Geniego-ROI儀表板的主要功能和使用方法。即時監控各項KPI，做出資料驅動的決策。",
    stepsTitle:"儀表板入門6步",
    step1Title:"選擇標籤頁",step1Desc:"從標籤列中選擇儀表板。共有7個：統一概覽、行銷、通路KPI、電商、銷售、網紅、系統。",
    step2Title:"查看KPI卡片",step2Desc:"在每個儀表板頂部查看關鍵績效指標。",
    step3Title:"分析圖表",step3Desc:"透過趨勢圖和比較圖進行資料分析。",
    step4Title:"使用日期篩選",step4Desc:"變更日期範圍查看特定時段的資料。",
    step5Title:"即時同步",step5Desc:"儀表板每5秒自動更新。LIVE標識表示即時資料。",
    step6Title:"切換貨幣/語言",step6Desc:"在右上角切換貨幣和語言。",
    tabsTitle:"標籤頁說明",
    tabOverview:"展示總收入、訂單數等綜合KPI。",tabMarketing:"分析行銷通路表現和ROI。",tabChannel:"比較各通路KPI和轉換率。",tabCommerce:"即時監控電商營運。",tabSales:"查看全球銷售狀況。",tabInfluencer:"追蹤網紅合作績效。",tabSystem:"監控系統狀態。",
    featuresTitle:"核心功能",feat1Title:"即時資料",feat1Desc:"每5秒更新。",feat2Title:"跨通路整合",feat2Desc:"統一管理所有通路資料。",feat3Title:"9種語言",feat3Desc:"支援9種語言。",feat4Title:"多幣種",feat4Desc:"自動轉換貨幣。",feat5Title:"安全監控",feat5Desc:"企業級威脅檢測。",feat6Title:"響應式設計",feat6Desc:"適配所有裝置。",
    tipsTitle:"實用技巧",tip1:"先從概覽了解整體健康狀況。",tip2:"關注KPI變化率。",tip3:"找到最高效的行銷通路。",tip4:"定期查看系統標籤。",tip5:"URL加?view=tabID可直接跳轉。"
  },
  de: {
    title:"Dashboard Benutzerhandbuch",subtitle:"Erfahren Sie mehr uber die Hauptfunktionen des Geniego-ROI Dashboards.",
    stepsTitle:"6 Schritte zum Start",step1Title:"Tab auswahlen",step1Desc:"Wahlen Sie ein Dashboard aus der Tab-Leiste.",step2Title:"KPI-Karten prufen",step2Desc:"Sehen Sie KPIs oben in jedem Dashboard.",step3Title:"Diagramme analysieren",step3Desc:"Daten visuell analysieren.",step4Title:"Datumsfilter nutzen",step4Desc:"Daten fur bestimmte Zeitraume anzeigen.",step5Title:"Echtzeit-Sync",step5Desc:"Automatische Aktualisierung alle 5 Sekunden.",step6Title:"Wahrung/Sprache andern",step6Desc:"Wahrung und Sprache oben rechts andern.",
    tabsTitle:"Tab-Ubersicht",tabOverview:"Zeigt integrierte KPIs.",tabMarketing:"Marketing-Performance analysieren.",tabChannel:"Kanal-KPIs vergleichen.",tabCommerce:"Commerce-Betrieb uberwachen.",tabSales:"Globale Umsatze einsehen.",tabInfluencer:"Influencer-Performance verfolgen.",tabSystem:"Systemstatus uberwachen.",
    featuresTitle:"Hauptfunktionen",feat1Title:"Echtzeitdaten",feat1Desc:"Alle 5 Sekunden aktualisiert.",feat2Title:"Multi-Kanal",feat2Desc:"Alle Kanale in einem Dashboard.",feat3Title:"9 Sprachen",feat3Desc:"9 Sprachen unterstutzt.",feat4Title:"Multi-Wahrung",feat4Desc:"Automatische Wahrungsumrechnung.",feat5Title:"Sicherheit",feat5Desc:"Enterprise-Bedrohungserkennung.",feat6Title:"Responsiv",feat6Desc:"Optimiert fur alle Gerate.",
    tipsTitle:"Nutzliche Tipps",tip1:"Starten Sie mit der Ubersicht fur einen schnellen Gesundheitscheck.",tip2:"Beobachten Sie KPI-Anderungsraten.",tip3:"Identifizieren Sie die effizientesten Kanale.",tip4:"Prufen Sie den System-Tab regelmaBig.",tip5:"Fugen Sie ?view=tabID zur URL hinzu."
  },
  th: {
    title:"คู่มือการใช้งานแดชบอร์ด",subtitle:"เรียนรู้ฟีเจอร์หลักและวิธีใช้แดชบอร์ด Geniego-ROI",
    stepsTitle:"6 ขั้นตอนเริ่มต้น",step1Title:"เลือกแท็บ",step1Desc:"เลือกแดชบอร์ดจากแถบแท็บ",step2Title:"ดู KPI Card",step2Desc:"ดูตัวชี้วัดหลักที่ด้านบน",step3Title:"วิเคราะห์กราฟ",step3Desc:"วิเคราะห์ข้อมูลด้วยกราฟ",step4Title:"ใช้ตัวกรองวันที่",step4Desc:"เปลี่ยนช่วงวันที่เพื่อดูข้อมูล",step5Title:"ซิงค์แบบเรียลไทม์",step5Desc:"ข้อมูลอัปเดตทุก 5 วินาที",step6Title:"เปลี่ยนสกุลเงิน/ภาษา",step6Desc:"เปลี่ยนที่มุมบนขวา",
    tabsTitle:"คำอธิบายแท็บ",tabOverview:"แสดง KPI รวม",tabMarketing:"วิเคราะห์ประสิทธิภาพการตลาด",tabChannel:"เปรียบเทียบ KPI ช่องทาง",tabCommerce:"ติดตามการดำเนินงาน",tabSales:"ดูยอดขายรวม",tabInfluencer:"ติดตามผลอินฟลูเอนเซอร์",tabSystem:"ตรวจสอบระบบ",
    featuresTitle:"ฟีเจอร์หลัก",feat1Title:"ข้อมูลเรียลไทม์",feat1Desc:"อัปเดตทุก 5 วินาที",feat2Title:"รวมทุกช่องทาง",feat2Desc:"จัดการในแดชบอร์ดเดียว",feat3Title:"9 ภาษา",feat3Desc:"รองรับ 9 ภาษา",feat4Title:"หลายสกุลเงิน",feat4Desc:"แปลงสกุลเงิน",feat5Title:"ความปลอดภัย",feat5Desc:"ตรวจจับภัยคุกคาม",feat6Title:"รองรับทุกอุปกรณ์",feat6Desc:"ดีไซน์ตอบสนอง",
    tipsTitle:"เคล็ดลับ",tip1:"เริ่มจากแท็บภาพรวม",tip2:"สังเกตอัตราการเปลี่ยนแปลง KPI",tip3:"ค้นหาช่องทางที่มีประสิทธิภาพสูงสุด",tip4:"ตรวจสอบแท็บระบบเป็นประจำ",tip5:"เพิ่ม ?view=tabID ใน URL"
  },
  vi: {
    title:"Huong dan su dung Dashboard",subtitle:"Tim hieu cac tinh nang chinh va cach su dung Geniego-ROI Dashboard.",
    stepsTitle:"6 buoc bat dau",step1Title:"Chon tab",step1Desc:"Chon dashboard tu thanh tab.",step2Title:"Xem the KPI",step2Desc:"Xem chi so hieu suat chinh.",step3Title:"Phan tich bieu do",step3Desc:"Phan tich du lieu truc quan.",step4Title:"Loc theo ngay",step4Desc:"Thay doi pham vi ngay.",step5Title:"Dong bo thoi gian thuc",step5Desc:"Tu dong cap nhat moi 5 giay.",step6Title:"Doi tien te/ngon ngu",step6Desc:"Chuyen doi o goc tren ben phai.",
    tabsTitle:"Huong dan tung tab",tabOverview:"Hien thi KPI tong hop.",tabMarketing:"Phan tich hieu suat marketing.",tabChannel:"So sanh KPI kenh.",tabCommerce:"Theo doi van hanh thuong mai.",tabSales:"Xem doanh so toan cau.",tabInfluencer:"Theo doi hieu suat influencer.",tabSystem:"Giam sat he thong.",
    featuresTitle:"Tinh nang chinh",feat1Title:"Du lieu thoi gian thuc",feat1Desc:"Cap nhat moi 5 giay.",feat2Title:"Tich hop da kenh",feat2Desc:"Quan ly tat ca trong mot dashboard.",feat3Title:"9 ngon ngu",feat3Desc:"Ho tro 9 ngon ngu.",feat4Title:"Da tien te",feat4Desc:"Tu dong chuyen doi tien te.",feat5Title:"Bao mat",feat5Desc:"Phat hien de doa cap doanh nghiep.",feat6Title:"Thiet ke dap ung",feat6Desc:"Toi uu cho moi thiet bi.",
    tipsTitle:"Meo huu ich",tip1:"Bat dau voi tab tong quan.",tip2:"Theo doi ty le thay doi KPI.",tip3:"Tim kenh marketing hieu qua nhat.",tip4:"Kiem tra tab he thong thuong xuyen.",tip5:"Them ?view=tabID vao URL."
  },
  id: {
    title:"Panduan Penggunaan Dashboard",subtitle:"Pelajari fitur utama dan cara menggunakan dashboard Geniego-ROI.",
    stepsTitle:"6 Langkah Memulai",step1Title:"Pilih Tab",step1Desc:"Pilih dashboard dari bar tab.",step2Title:"Lihat Kartu KPI",step2Desc:"Lihat indikator kinerja utama.",step3Title:"Analisis Grafik",step3Desc:"Analisis data secara visual.",step4Title:"Filter Tanggal",step4Desc:"Ubah rentang tanggal.",step5Title:"Sinkronisasi Real-time",step5Desc:"Pembaruan otomatis setiap 5 detik.",step6Title:"Ubah Mata Uang/Bahasa",step6Desc:"Beralih di sudut kanan atas.",
    tabsTitle:"Panduan per Tab",tabOverview:"Menampilkan KPI terintegrasi.",tabMarketing:"Analisis performa marketing.",tabChannel:"Bandingkan KPI saluran.",tabCommerce:"Pantau operasi commerce.",tabSales:"Lihat penjualan global.",tabInfluencer:"Lacak performa influencer.",tabSystem:"Pantau status sistem.",
    featuresTitle:"Fitur Utama",feat1Title:"Data Real-time",feat1Desc:"Update setiap 5 detik.",feat2Title:"Integrasi Multi-saluran",feat2Desc:"Kelola semua dalam satu dashboard.",feat3Title:"9 Bahasa",feat3Desc:"Mendukung 9 bahasa.",feat4Title:"Multi Mata Uang",feat4Desc:"Konversi mata uang otomatis.",feat5Title:"Keamanan",feat5Desc:"Deteksi ancaman enterprise.",feat6Title:"Desain Responsif",feat6Desc:"Optimal untuk semua perangkat.",
    tipsTitle:"Tips Berguna",tip1:"Mulai dari tab ikhtisar.",tip2:"Perhatikan perubahan KPI.",tip3:"Temukan saluran paling efisien.",tip4:"Periksa tab sistem secara rutin.",tip5:"Tambahkan ?view=tabID ke URL."
  }
};

// Also add tabs.guide key
const tabsGuideLabel = {
  ko:"📖 이용 가이드",en:"📖 Guide",ja:"📖 ガイド",zh:"📖 使用指南","zh-TW":"📖 使用指南",de:"📖 Anleitung",th:"📖 คู่มือ",vi:"📖 Hướng dẫn",id:"📖 Panduan"
};
const tabsGuideDesc = {
  ko:"대시보드 이용 가이드 및 기능 설명",en:"Dashboard user guide and feature overview",ja:"ダッシュボード利用ガイド",zh:"仪表板使用指南","zh-TW":"儀表板使用指南",de:"Dashboard Anleitung",th:"คู่มือการใช้งาน",vi:"Hướng dẫn sử dụng",id:"Panduan penggunaan"
};

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const objStr = raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  try {
    const obj = JSON.parse(objStr);

    // Add dashGuide namespace
    obj.dashGuide = dashGuideKeys[lang] || dashGuideKeys.en;

    // Add tabs.guide and tabs.guideDesc
    if (!obj.tabs) obj.tabs = {};
    obj.tabs.guide = tabsGuideLabel[lang] || tabsGuideLabel.en;
    obj.tabs.guideDesc = tabsGuideDesc[lang] || tabsGuideDesc.en;

    fs.writeFileSync(filePath, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
    console.log(`✅ [${lang}] dashGuide: ${Object.keys(obj.dashGuide).length} keys, tabs.guide: "${obj.tabs.guide}"`);
  } catch (e) {
    console.log(`❌ [${lang}] ${e.message.substring(0, 80)}`);
  }
});
console.log('\n🎉 Dashboard guide i18n complete!');
