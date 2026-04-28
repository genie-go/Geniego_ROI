const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    pageTitle:"마케팅 & 광고 성과 (Overview)", pageSub:"AI 매체 통합 분석 - 종합 광고 성과 분석 지표 관리",
    tabOverview:"성과 요약", tabAdStatus:"매체별 상세", tabCreative:"크리에이티브 분석", tabCompare:"캠페인 비교", tabGuide:"이용 가이드",
    strictDateFilter:"📅 캠페인 활성 기간 (엄격한 기간 필터)", strictDateDesc:"캐시를 무시하고 실시간 연동 운영 데이터를 즉시 불러옵니다.",
    leftAxis:"(좌측 축 데이터)", rightAxis:"(우측 축 데이터)",
    metImpressions:"노출수", metReach:"도달수", metSpend:"총 지출액", metClicks:"클릭수", metCtr:"클릭률 (%)", metCpc:"CPC", metCpm:"CPM", metConv:"전환수", metRoas:"ROAS (투자수익률)",
    connectedChannels:"연동된 광고 채널", noConnectedChannels:"연동허브에서 API 키를 등록하면 채널이 자동으로 표시됩니다.", connected:"연동됨",
    noCreativeData:"크리에이티브 데이터 없음", noCreativeDesc:"AI 오토 마케팅에서 캠페인을 생성하면 소재별 성과가 여기에 표시됩니다.",
    creativePerformance:"소재별 클릭·전환 분석", creativeTable:"소재별 상세 성과 테이블", colCreativeName:"소재 / 캠페인명",
    selectCampaigns:"캠페인 선택 (최대 4개)", selectCampaignsDesc:"비교할 캠페인을 2개 이상 선택하세요. 레이더 차트와 KPI 비교 테이블이 표시됩니다.",
    noCampaigns:"등록된 캠페인이 없습니다. AI 오토 마케팅에서 캠페인을 먼저 생성해 주세요.",
    radarCompare:"레이더 차트 비교 분석", kpiCompare:"KPI 비교 테이블", selectAtLeast2:"2개 이상의 캠페인을 선택하면 비교 분석이 표시됩니다.",
    guideTitle:"광고성과 분석 이용 가이드", guideSub:"광고 매체별 성과 분석, 크리에이티브 비교, 캠페인 비교까지 광고 분석의 모든 것을 안내합니다.",
    guideStepsTitle:"광고성과 분석 6단계",
    guideStep1Title:"기간 설정", guideStep1Desc:"상단 날짜 필터로 분석 기간을 설정합니다. 실시간 데이터가 즉시 반영됩니다.",
    guideStep2Title:"KPI 확인", guideStep2Desc:"5개 KPI 카드에서 지출액, 노출수, 클릭수, CTR, ROAS를 한눈에 확인합니다.",
    guideStep3Title:"트렌드 분석", guideStep3Desc:"듀얼 축 차트에서 두 가지 지표를 동시에 비교합니다. 드롭다운으로 지표를 변경할 수 있습니다.",
    guideStep4Title:"매체별 상세", guideStep4Desc:"상세 탭에서 캠페인/광고세트별 성과를 테이블로 분석합니다.",
    guideStep5Title:"크리에이티브 분석", guideStep5Desc:"소재별 CTR, CVR, ROAS를 비교하여 최적 소재를 파악합니다.",
    guideStep6Title:"캠페인 비교", guideStep6Desc:"2~4개 캠페인을 선택하여 레이더 차트와 KPI 테이블로 성과를 비교합니다.",
    guideTabsTitle:"탭별 상세 안내",
    guideTabOverviewName:"성과 요약", guideTabOverviewDesc:"KPI 카드와 듀얼 축 트렌드 차트로 전체 성과를 한눈에 파악합니다.",
    guideTabStatusName:"매체별 상세", guideTabStatusDesc:"캠페인·광고세트 계층별 상세 성과 테이블과 차트를 분석합니다.",
    guideTabCreativeName:"크리에이티브 분석", guideTabCreativeDesc:"연동된 채널의 광고 소재별 클릭·전환·ROAS를 비교 분석합니다.",
    guideTabCompareName:"캠페인 비교", guideTabCompareDesc:"2~4개 캠페인을 레이더 차트와 KPI 테이블로 비교합니다.",
    guideTipsTitle:"유용한 팁",
    guideTip1:"KPI 카드의 드롭다운을 변경하면 차트의 좌/우축 데이터가 자동으로 변경됩니다.",
    guideTip2:"연동허브에서 API 키를 등록하면 해당 채널의 광고 데이터가 자동으로 연동됩니다.",
    guideTip3:"크리에이티브 분석에서 CTR이 높은 소재를 파악하여 예산을 집중하세요.",
    guideTip4:"캠페인 비교 탭에서 ROAS 차이가 큰 캠페인을 발견하면 예산 재배분을 검토하세요.",
    guideTip5:"모든 데이터는 실시간 동기화되어 새로고침 없이 최신 상태가 유지됩니다.",
  },
  en: {
    pageTitle:"Marketing & Ad Performance (Overview)", pageSub:"AI Integrated Analysis - Comprehensive Ad Performance Metrics",
    tabOverview:"Summary", tabAdStatus:"Media Detail", tabCreative:"Creative Analysis", tabCompare:"Campaign Compare", tabGuide:"Guide",
    strictDateFilter:"📅 Campaign Active Period (Strict Filter)", strictDateDesc:"Bypasses cache and fetches live operational data instantly.",
    leftAxis:"(Left Axis)", rightAxis:"(Right Axis)",
    metImpressions:"Impressions", metReach:"Reach", metSpend:"Spend", metClicks:"Clicks", metCtr:"CTR (%)", metCpc:"CPC", metCpm:"CPM", metConv:"Conversions", metRoas:"ROAS",
    connectedChannels:"Connected Ad Channels", noConnectedChannels:"Register API keys in Integration Hub to auto-display channels.", connected:"Connected",
    noCreativeData:"No Creative Data", noCreativeDesc:"Create campaigns in AI Auto Marketing to see creative performance here.",
    creativePerformance:"Creative Click & Conversion Analysis", creativeTable:"Creative Performance Table", colCreativeName:"Creative / Campaign",
    selectCampaigns:"Select Campaigns (max 4)", selectCampaignsDesc:"Select 2+ campaigns to compare via radar chart and KPI table.",
    noCampaigns:"No campaigns found. Create campaigns in AI Auto Marketing first.",
    radarCompare:"Radar Chart Comparison", kpiCompare:"KPI Comparison Table", selectAtLeast2:"Select 2 or more campaigns to see comparison analysis.",
    guideTitle:"Ad Performance Analysis Guide", guideSub:"Learn how to analyze ad media performance, compare creatives, and benchmark campaigns.",
    guideStepsTitle:"6 Steps to Analyze",
    guideStep1Title:"Set Period", guideStep1Desc:"Set analysis period with the date filter. Real-time data reflects instantly.",
    guideStep2Title:"Check KPIs", guideStep2Desc:"View spend, impressions, clicks, CTR, and ROAS at a glance in 5 KPI cards.",
    guideStep3Title:"Trend Analysis", guideStep3Desc:"Compare two metrics simultaneously on the dual-axis chart. Change via dropdown.",
    guideStep4Title:"Media Detail", guideStep4Desc:"Analyze campaign/ad set performance in the detail table.",
    guideStep5Title:"Creative Analysis", guideStep5Desc:"Compare CTR, CVR, and ROAS by creative to find top performers.",
    guideStep6Title:"Campaign Compare", guideStep6Desc:"Select 2-4 campaigns to compare via radar chart and KPI table.",
    guideTabsTitle:"Tab-by-Tab Guide",
    guideTabOverviewName:"Summary", guideTabOverviewDesc:"Overview with KPI cards and dual-axis trend chart.",
    guideTabStatusName:"Media Detail", guideTabStatusDesc:"Campaign/ad set hierarchy with detailed performance table.",
    guideTabCreativeName:"Creative Analysis", guideTabCreativeDesc:"Compare click/conversion/ROAS by connected channel creatives.",
    guideTabCompareName:"Campaign Compare", guideTabCompareDesc:"Compare 2-4 campaigns via radar chart and KPI table.",
    guideTipsTitle:"Useful Tips",
    guideTip1:"Changing KPI card dropdowns automatically updates chart axes.",
    guideTip2:"Register API keys in Integration Hub to auto-sync ad data.",
    guideTip3:"Find high-CTR creatives and concentrate budget on them.",
    guideTip4:"Discover ROAS gaps in Campaign Compare to reallocate budget.",
    guideTip5:"All data syncs in real-time without page refresh.",
  },
  ja: { pageTitle:"マーケティング＆広告成果",pageSub:"AI統合分析 - 広告成果指標管理",tabOverview:"成果概要",tabAdStatus:"媒体別詳細",tabCreative:"クリエイティブ分析",tabCompare:"キャンペーン比較",tabGuide:"ガイド",strictDateFilter:"📅 キャンペーン期間フィルター",strictDateDesc:"リアルタイムデータを即座に取得",leftAxis:"(左軸)",rightAxis:"(右軸)",metImpressions:"インプレッション",metReach:"リーチ",metSpend:"支出",metClicks:"クリック",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"コンバージョン",metRoas:"ROAS",connectedChannels:"連携チャネル",noConnectedChannels:"連携ハブでAPIキーを登録してください",connected:"連携済",noCreativeData:"クリエイティブデータなし",noCreativeDesc:"AIオートマーケティングでキャンペーンを作成してください",creativePerformance:"素材別クリック・CV分析",creativeTable:"素材別成果テーブル",colCreativeName:"素材/キャンペーン名",selectCampaigns:"キャンペーン選択(最大4)",selectCampaignsDesc:"2つ以上選択して比較",noCampaigns:"キャンペーンがありません",radarCompare:"レーダー比較",kpiCompare:"KPI比較",selectAtLeast2:"2つ以上選択してください",guideTitle:"広告成果分析ガイド",guideSub:"広告分析のすべてをご案内します",guideStepsTitle:"分析6ステップ",guideStep1Title:"期間設定",guideStep1Desc:"日付フィルターで期間設定",guideStep2Title:"KPI確認",guideStep2Desc:"5つのKPIカードで確認",guideStep3Title:"トレンド分析",guideStep3Desc:"デュアル軸チャートで比較",guideStep4Title:"媒体別詳細",guideStep4Desc:"テーブルで分析",guideStep5Title:"クリエイティブ分析",guideStep5Desc:"素材別CTR/CVR/ROAS比較",guideStep6Title:"キャンペーン比較",guideStep6Desc:"レーダーチャートで比較",guideTabsTitle:"タブ別ガイド",guideTabOverviewName:"成果概要",guideTabOverviewDesc:"KPIとトレンドチャート",guideTabStatusName:"媒体別詳細",guideTabStatusDesc:"キャンペーン/広告セット分析",guideTabCreativeName:"クリエイティブ",guideTabCreativeDesc:"素材別成果比較",guideTabCompareName:"比較分析",guideTabCompareDesc:"レーダーチャートとKPI比較",guideTipsTitle:"ヒント",guideTip1:"KPIドロップダウンでチャート軸が自動変更",guideTip2:"APIキー登録でデータ自動連携",guideTip3:"高CTR素材を発見して予算集中",guideTip4:"ROAS差異を発見して予算再配分",guideTip5:"リアルタイム同期で常に最新" },
  zh: { pageTitle:"营销与广告效果",pageSub:"AI综合分析 - 广告效果指标管理",tabOverview:"效果摘要",tabAdStatus:"媒体详情",tabCreative:"创意分析",tabCompare:"活动对比",tabGuide:"使用指南",strictDateFilter:"📅 活动期间筛选",strictDateDesc:"跳过缓存实时获取数据",leftAxis:"(左轴)",rightAxis:"(右轴)",metImpressions:"展示量",metReach:"触达量",metSpend:"支出",metClicks:"点击量",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"转化量",metRoas:"ROAS",connectedChannels:"已连接渠道",noConnectedChannels:"在集成中心注册API密钥",connected:"已连接",noCreativeData:"无创意数据",noCreativeDesc:"在AI自动营销中创建活动",creativePerformance:"创意点击转化分析",creativeTable:"创意效果表",colCreativeName:"创意/活动名",selectCampaigns:"选择活动(最多4个)",selectCampaignsDesc:"选择2个以上进行对比",noCampaigns:"没有活动",radarCompare:"雷达图对比",kpiCompare:"KPI对比表",selectAtLeast2:"请选择2个以上",guideTitle:"广告效果分析指南",guideSub:"广告分析全流程指南",guideStepsTitle:"分析6步",guideStep1Title:"设置期间",guideStep1Desc:"设置日期筛选",guideStep2Title:"查看KPI",guideStep2Desc:"5个KPI卡一目了然",guideStep3Title:"趋势分析",guideStep3Desc:"双轴图表对比",guideStep4Title:"媒体详情",guideStep4Desc:"表格分析",guideStep5Title:"创意分析",guideStep5Desc:"对比CTR/CVR/ROAS",guideStep6Title:"活动对比",guideStep6Desc:"雷达图对比",guideTabsTitle:"标签说明",guideTabOverviewName:"摘要",guideTabOverviewDesc:"KPI和趋势图",guideTabStatusName:"详情",guideTabStatusDesc:"活动/组分析",guideTabCreativeName:"创意",guideTabCreativeDesc:"素材效果对比",guideTabCompareName:"对比",guideTabCompareDesc:"雷达图KPI对比",guideTipsTitle:"技巧",guideTip1:"下拉更改自动更新图表",guideTip2:"注册API自动同步数据",guideTip3:"找到高CTR素材集中预算",guideTip4:"发现ROAS差异重新分配",guideTip5:"实时同步无需刷新" },
  "zh-TW": { pageTitle:"行銷與廣告成效",pageSub:"AI綜合分析 - 廣告成效指標管理",tabOverview:"成效摘要",tabAdStatus:"媒體詳情",tabCreative:"創意分析",tabCompare:"活動比較",tabGuide:"使用指南",strictDateFilter:"📅 活動期間篩選",strictDateDesc:"即時取得數據",leftAxis:"(左軸)",rightAxis:"(右軸)",metImpressions:"曝光量",metReach:"觸及量",metSpend:"支出",metClicks:"點擊量",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"轉換量",metRoas:"ROAS",connectedChannels:"已連接頻道",noConnectedChannels:"在整合中心註冊API",connected:"已連接",noCreativeData:"無創意數據",noCreativeDesc:"請先建立活動",creativePerformance:"素材點擊轉換分析",creativeTable:"素材成效表",colCreativeName:"素材/活動名",selectCampaigns:"選擇活動(最多4)",selectCampaignsDesc:"選擇2個以上比較",noCampaigns:"沒有活動",radarCompare:"雷達圖比較",kpiCompare:"KPI比較表",selectAtLeast2:"請選擇2個以上",guideTitle:"廣告成效分析指南",guideSub:"廣告分析全流程",guideStepsTitle:"分析6步",guideStep1Title:"設定期間",guideStep1Desc:"日期篩選",guideStep2Title:"查看KPI",guideStep2Desc:"KPI一覽",guideStep3Title:"趨勢分析",guideStep3Desc:"雙軸對比",guideStep4Title:"媒體詳情",guideStep4Desc:"表格分析",guideStep5Title:"創意分析",guideStep5Desc:"比較素材",guideStep6Title:"活動比較",guideStep6Desc:"雷達圖",guideTabsTitle:"標籤說明",guideTabOverviewName:"摘要",guideTabOverviewDesc:"KPI和趨勢",guideTabStatusName:"詳情",guideTabStatusDesc:"分析",guideTabCreativeName:"創意",guideTabCreativeDesc:"素材比較",guideTabCompareName:"比較",guideTabCompareDesc:"雷達比較",guideTipsTitle:"技巧",guideTip1:"下拉更改更新圖表",guideTip2:"API自動同步",guideTip3:"高CTR集中預算",guideTip4:"ROAS差異重新分配",guideTip5:"即時同步" },
  de: { pageTitle:"Marketing & Anzeigenleistung",pageSub:"AI-integrierte Analyse",tabOverview:"Übersicht",tabAdStatus:"Mediendetails",tabCreative:"Kreativanalyse",tabCompare:"Kampagnenvergleich",tabGuide:"Anleitung",strictDateFilter:"📅 Kampagnenzeitraum",strictDateDesc:"Echtzeit-Daten",leftAxis:"(Links)",rightAxis:"(Rechts)",metImpressions:"Impressionen",metReach:"Reichweite",metSpend:"Ausgaben",metClicks:"Klicks",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"Conversions",metRoas:"ROAS",connectedChannels:"Verbundene Kanäle",noConnectedChannels:"API-Schlüssel registrieren",connected:"Verbunden",noCreativeData:"Keine Kreativdaten",noCreativeDesc:"Erstellen Sie Kampagnen",creativePerformance:"Kreativ-Klick/CV-Analyse",creativeTable:"Kreativ-Tabelle",colCreativeName:"Kreativ/Kampagne",selectCampaigns:"Kampagnen wählen(max 4)",selectCampaignsDesc:"2+ zum Vergleich wählen",noCampaigns:"Keine Kampagnen",radarCompare:"Radar-Vergleich",kpiCompare:"KPI-Vergleich",selectAtLeast2:"2+ wählen",guideTitle:"Anzeigenleistung Anleitung",guideSub:"Analyseanleitung",guideStepsTitle:"6 Schritte",guideStep1Title:"Zeitraum",guideStep1Desc:"Datum wählen",guideStep2Title:"KPIs",guideStep2Desc:"5 KPI-Karten",guideStep3Title:"Trends",guideStep3Desc:"Dual-Achsen",guideStep4Title:"Details",guideStep4Desc:"Tabelle",guideStep5Title:"Kreative",guideStep5Desc:"CTR/CVR vergleichen",guideStep6Title:"Vergleich",guideStep6Desc:"Radar-Diagramm",guideTabsTitle:"Tab-Guide",guideTabOverviewName:"Übersicht",guideTabOverviewDesc:"KPIs und Trends",guideTabStatusName:"Details",guideTabStatusDesc:"Kampagnenanalyse",guideTabCreativeName:"Kreative",guideTabCreativeDesc:"Kreativvergleich",guideTabCompareName:"Vergleich",guideTabCompareDesc:"Radar+KPI",guideTipsTitle:"Tipps",guideTip1:"Dropdown ändert Achsen",guideTip2:"API-Sync",guideTip3:"Hohe CTR priorisieren",guideTip4:"ROAS-Unterschiede nutzen",guideTip5:"Echtzeit-Sync" },
  th: { pageTitle:"การตลาดและผลโฆษณา",pageSub:"AI วิเคราะห์รวม",tabOverview:"สรุป",tabAdStatus:"รายละเอียด",tabCreative:"วิเคราะห์ครีเอทีฟ",tabCompare:"เปรียบเทียบ",tabGuide:"คู่มือ",strictDateFilter:"📅 ช่วงเวลา",strictDateDesc:"ข้อมูลเรียลไทม์",leftAxis:"(ซ้าย)",rightAxis:"(ขวา)",metImpressions:"การแสดงผล",metReach:"การเข้าถึง",metSpend:"ค่าใช้จ่าย",metClicks:"คลิก",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"Conversion",metRoas:"ROAS",connectedChannels:"ช่องทางที่เชื่อมต่อ",noConnectedChannels:"ลงทะเบียน API",connected:"เชื่อมต่อแล้ว",noCreativeData:"ไม่มีข้อมูล",noCreativeDesc:"สร้างแคมเปญก่อน",creativePerformance:"วิเคราะห์คลิก/CV",creativeTable:"ตารางครีเอทีฟ",colCreativeName:"ชื่อ",selectCampaigns:"เลือกแคมเปญ",selectCampaignsDesc:"เลือก 2+ เปรียบเทียบ",noCampaigns:"ไม่มีแคมเปญ",radarCompare:"เรดาร์",kpiCompare:"KPI",selectAtLeast2:"เลือก 2+",guideTitle:"คู่มือวิเคราะห์โฆษณา",guideSub:"คู่มือการวิเคราะห์",guideStepsTitle:"6 ขั้นตอน",guideStep1Title:"ตั้งช่วง",guideStep1Desc:"ตั้งวันที่",guideStep2Title:"ดู KPI",guideStep2Desc:"5 การ์ด",guideStep3Title:"แนวโน้ม",guideStep3Desc:"กราฟ 2 แกน",guideStep4Title:"รายละเอียด",guideStep4Desc:"ตาราง",guideStep5Title:"ครีเอทีฟ",guideStep5Desc:"เปรียบเทียบ",guideStep6Title:"เปรียบเทียบ",guideStep6Desc:"เรดาร์",guideTabsTitle:"คำอธิบายแท็บ",guideTabOverviewName:"สรุป",guideTabOverviewDesc:"KPI",guideTabStatusName:"รายละเอียด",guideTabStatusDesc:"ตาราง",guideTabCreativeName:"ครีเอทีฟ",guideTabCreativeDesc:"เปรียบเทียบ",guideTabCompareName:"เปรียบเทียบ",guideTabCompareDesc:"เรดาร์",guideTipsTitle:"เคล็ดลับ",guideTip1:"เปลี่ยนแกนอัตโนมัติ",guideTip2:"API ซิงค์",guideTip3:"CTR สูง",guideTip4:"ROAS ต่าง",guideTip5:"ซิงค์เรียลไทม์" },
  vi: { pageTitle:"Marketing & Hiệu suất QC",pageSub:"Phân tích AI tích hợp",tabOverview:"Tổng quan",tabAdStatus:"Chi tiết",tabCreative:"Phân tích sáng tạo",tabCompare:"So sánh",tabGuide:"Hướng dẫn",strictDateFilter:"📅 Kỳ chiến dịch",strictDateDesc:"Dữ liệu thời gian thực",leftAxis:"(Trái)",rightAxis:"(Phải)",metImpressions:"Hiển thị",metReach:"Tiếp cận",metSpend:"Chi tiêu",metClicks:"Nhấp",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"Chuyển đổi",metRoas:"ROAS",connectedChannels:"Kênh đã kết nối",noConnectedChannels:"Đăng ký API",connected:"Đã kết nối",noCreativeData:"Không có dữ liệu",noCreativeDesc:"Tạo chiến dịch trước",creativePerformance:"Phân tích nhấp/CV",creativeTable:"Bảng sáng tạo",colCreativeName:"Tên",selectCampaigns:"Chọn chiến dịch",selectCampaignsDesc:"Chọn 2+ để so sánh",noCampaigns:"Không có chiến dịch",radarCompare:"Radar",kpiCompare:"KPI",selectAtLeast2:"Chọn 2+",guideTitle:"Hướng dẫn phân tích QC",guideSub:"Hướng dẫn phân tích",guideStepsTitle:"6 bước",guideStep1Title:"Đặt kỳ",guideStep1Desc:"Chọn ngày",guideStep2Title:"Xem KPI",guideStep2Desc:"5 thẻ",guideStep3Title:"Xu hướng",guideStep3Desc:"Biểu đồ 2 trục",guideStep4Title:"Chi tiết",guideStep4Desc:"Bảng",guideStep5Title:"Sáng tạo",guideStep5Desc:"So sánh",guideStep6Title:"So sánh",guideStep6Desc:"Radar",guideTabsTitle:"Hướng dẫn tab",guideTabOverviewName:"Tổng quan",guideTabOverviewDesc:"KPI",guideTabStatusName:"Chi tiết",guideTabStatusDesc:"Bảng",guideTabCreativeName:"Sáng tạo",guideTabCreativeDesc:"So sánh",guideTabCompareName:"So sánh",guideTabCompareDesc:"Radar",guideTipsTitle:"Mẹo",guideTip1:"Dropdown thay đổi trục",guideTip2:"API đồng bộ",guideTip3:"CTR cao tập trung",guideTip4:"ROAS khác biệt",guideTip5:"Đồng bộ thời gian thực" },
  id: { pageTitle:"Marketing & Kinerja Iklan",pageSub:"Analisis AI Terintegrasi",tabOverview:"Ringkasan",tabAdStatus:"Detail Media",tabCreative:"Analisis Kreatif",tabCompare:"Bandingkan",tabGuide:"Panduan",strictDateFilter:"📅 Periode Kampanye",strictDateDesc:"Data real-time",leftAxis:"(Kiri)",rightAxis:"(Kanan)",metImpressions:"Tayangan",metReach:"Jangkauan",metSpend:"Belanja",metClicks:"Klik",metCtr:"CTR(%)",metCpc:"CPC",metCpm:"CPM",metConv:"Konversi",metRoas:"ROAS",connectedChannels:"Saluran Terhubung",noConnectedChannels:"Daftar API",connected:"Terhubung",noCreativeData:"Tidak ada data",noCreativeDesc:"Buat kampanye dulu",creativePerformance:"Analisis klik/CV",creativeTable:"Tabel kreatif",colCreativeName:"Nama",selectCampaigns:"Pilih kampanye",selectCampaignsDesc:"Pilih 2+ untuk membandingkan",noCampaigns:"Tidak ada kampanye",radarCompare:"Radar",kpiCompare:"KPI",selectAtLeast2:"Pilih 2+",guideTitle:"Panduan Analisis Iklan",guideSub:"Panduan analisis",guideStepsTitle:"6 Langkah",guideStep1Title:"Atur Periode",guideStep1Desc:"Pilih tanggal",guideStep2Title:"Lihat KPI",guideStep2Desc:"5 kartu",guideStep3Title:"Tren",guideStep3Desc:"Grafik 2 sumbu",guideStep4Title:"Detail",guideStep4Desc:"Tabel",guideStep5Title:"Kreatif",guideStep5Desc:"Bandingkan",guideStep6Title:"Bandingkan",guideStep6Desc:"Radar",guideTabsTitle:"Panduan Tab",guideTabOverviewName:"Ringkasan",guideTabOverviewDesc:"KPI",guideTabStatusName:"Detail",guideTabStatusDesc:"Tabel",guideTabCreativeName:"Kreatif",guideTabCreativeDesc:"Bandingkan",guideTabCompareName:"Bandingkan",guideTabCompareDesc:"Radar",guideTipsTitle:"Tips",guideTip1:"Dropdown ubah sumbu",guideTip2:"API sinkron",guideTip3:"CTR tinggi prioritas",guideTip4:"ROAS berbeda alokasi",guideTip5:"Sinkron real-time" }
};

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const objStr = raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  try {
    const obj = JSON.parse(objStr);
    if (!obj.marketing) obj.marketing = {};
    const k = keys[lang] || keys.en;
    Object.assign(obj.marketing, k);
    fs.writeFileSync(filePath, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
    console.log(`✅ [${lang}] marketing full: ${Object.keys(k).length} keys`);
  } catch (e) { console.log(`❌ [${lang}] ${e.message.slice(0,80)}`); }
});
console.log('\n🎉 Marketing full i18n complete!');
