import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';

// ══════════════════════════════════════════════════════════════════════
//  📈 RollupDashboard — Enterprise i18n (15 Languages) + Zero Mock Data
//     Arctic White / Dark Glass dual-theme compatible
// ══════════════════════════════════════════════════════════════════════
const LOC = {
  ko: {
    title:'Rollup 집계 레이어', subtitle:'SKU · 캠페인 · 크리에이터 · 플랫폼 × 일별/주별/월별/연간/시즌별 집계',
    loading:'데이터 로딩 중...', totalRevenue:'총 매출', totalSpend:'총 광고비', totalOrders:'총 주문수',
    avgRoas:'평균 ROAS', revenuePerOrder:'주문당 매출', platformRevenue:'플랫폼별 매출',
    topSku:'Top SKU 현황', alerts:'알림', colProduct:'상품', colRevenue:'매출', colOrders:'주문수',
    colReturnRate:'반품율', colTrend:'추세', colDate:'날짜', colTotalRevenue:'총매출', colTotalSpend:'총광고비',
    colPlatform:'플랫폼', colShare:'점유율', colCampaign:'캠페인', colCpa:'CPA', colConversions:'전환수',
    colImpressions:'노출수', colClicks:'클릭수', colCpc:'CPC', colSpend:'광고비',
    colHandle:'핸들', colTier:'등급', colFollowers:'팔로워', colRoi:'ROI', colViews:'조회수',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'실집행 광고비',
    skuAgg:'SKU 집계 분석', campaignAgg:'캠페인 집계 분석', creatorAgg:'크리에이터 집계 분석',
    platformAgg:'플랫폼 집계 분석', platformDetail:'상세 분석', dailyRevenue:'일별 매출 추이',
    revTrend:'매출 추이', roasTrend:'ROAS 추이', roasScale:'*ROAS 스케일 ×1M',
    unitPrice:'단가', commissionPerPost:'건당 수수료', viewsVsRevenue:'조회수 vs 매출',
    revenueVsSpend:'매출 vs 광고비', unitTenThousand:'만',
    tabSummary:'요약', tabCampaign:'캠페인', tabCreator:'크리에이터',
    tabPlatform:'플랫폼', tabSegment:'세그먼트', tabRisk:'리스크 예산',
    periodDaily:'일별', periodWeekly:'주별', periodMonthly:'월별', periodYearly:'연간', periodSeasonal:'시즌별',
    unitDay:'일', unitWeek:'주', unitMonth:'개월', unitYear:'년', unitSeason:'시즌',
    noData:'연동된 데이터가 없습니다', connectData:'채널을 연동하면 실시간 데이터가 표시됩니다',
    tabGuide:'📖 이용 가이드',
    guideTitle:'통합현황(Rollup) 이용 가이드',
    guideSubtitle:'SKU · 캠페인 · 크리에이터 · 플랫폼별 집계 데이터를 분석하는 방법을 단계별로 안내합니다.',
    guideSteps:[
      '기간 선택하기 — 우측 상단에서 일별/주별/월별/연간/시즌별 집계 기간을 선택합니다.',
      '요약 탭 확인 — 핵심 KPI(총 매출, 광고비, ROAS, 주문수)를 한눈에 확인합니다.',
      'SKU 분석 — 상품별 매출, ROAS, 반품율 추이를 분석합니다. 행 클릭으로 상세 차트를 확인합니다.',
      '캠페인 비교 — 광고 캠페인별 매출/광고비/ROAS/CPA를 비교하고 트렌드를 확인합니다.',
      '크리에이터 추적 — 인플루언서별 매출, 조회수, ROI를 분석합니다.',
      '플랫폼 현황 — 플랫폼별 매출 점유율과 성과를 비교합니다.',
      '기간 범위 조절 — 우측 드롭다운에서 분석 범위(7일, 14일, 30일 등)를 세부 조절합니다.',
      '통화 전환 — 상단 통화 설정에서 원화 외 다른 통화로 환산된 데이터를 확인합니다.',
      '다국어 전환 — 언어 설정을 변경하면 모든 라벨이 즉시 해당 언어로 전환됩니다.',
      '데이터 연동 — Integration Hub에서 채널을 연동하면 실시간으로 데이터가 업데이트됩니다.',
    ],
    guideFaq:[
      {q:'데이터가 비어 있는 이유는?', a:'채널이 연동되지 않았거나 선택한 기간에 데이터가 없을 수 있습니다. Integration Hub에서 연동 상태를 확인하세요.'},
      {q:'ROAS가 표시되지 않으면?', a:'광고비(Spend) 데이터가 없으면 ROAS를 계산할 수 없습니다. 광고 채널 연동을 확인하세요.'},
      {q:'실시간 업데이트 주기는?', a:'연동된 채널에 따라 5분~1시간 단위로 자동 업데이트됩니다.'},
      {q:'여러 플랫폼 데이터를 동시에 비교할 수 있나요?', a:'네, 플랫폼 탭에서 모든 연동 플랫폼의 매출 점유율과 ROAS를 한눈에 비교할 수 있습니다.'},
      {q:'기간별 데이터 차이가 큰 이유는?', a:'일별/주별/월별 집계 방식이 다르므로 자연스러운 현상입니다. 비교 시 동일 기간 단위를 사용하세요.'},
    ],
    guideTips:['SKU 탭에서 반품율이 12%를 초과하는 상품은 빨간색으로 표시됩니다 — 즉시 원인을 분석하세요.','캠페인 탭에서 ROAS 3.0x 이상은 초록색, 미만은 빨간색으로 표시됩니다.','시즌별 집계를 활용하면 분기별 패턴을 파악할 수 있습니다.'],
    guideCautions:['데모/가상 데이터는 운영 시스템에 유입되지 않습니다.','데이터 수집이 진행 중인 채널은 일시적으로 불완전한 수치가 표시될 수 있습니다.','반품율 계산은 주문 확정 이후 기준이며, 미확정 주문은 포함되지 않습니다.'],
    guideTabRef:'각 탭 설명',
    guideTabDesc:{
      summary:'총 매출, 광고비, ROAS, 주문수 등 핵심 KPI를 요약합니다.',
      sku:'상품(SKU)별 매출, ROAS, 반품율을 분석합니다.',
      campaign:'광고 캠페인별 매출, 광고비, CPA, 전환수를 비교합니다.',
      creator:'인플루언서/크리에이터별 매출, 조회수, ROI를 추적합니다.',
      platform:'플랫폼별 매출 점유율과 성과를 비교합니다.',
    },
    faqTitle:'자주 묻는 질문 (FAQ)',
    tipsTitle:'전문가 팁',
    cautionsTitle:'주의사항',
  },
  en: {
    title:'Rollup Aggregate Layer', subtitle:'SKU · Campaign · Creator · Platform × Daily/Weekly/Monthly/Annual/Seasonal',
    loading:'Loading...', totalRevenue:'Total Revenue', totalSpend:'Total Ad Spend', totalOrders:'Total Orders',
    avgRoas:'Avg ROAS', revenuePerOrder:'Revenue / Order', platformRevenue:'Revenue by Platform',
    topSku:'Top SKU Status', alerts:'Alerts', colProduct:'Product', colRevenue:'Revenue', colOrders:'Orders',
    colReturnRate:'Return Rate', colTrend:'Trend', colDate:'Date', colTotalRevenue:'Total Revenue', colTotalSpend:'Total Spend',
    colPlatform:'Platform', colShare:'Share', colCampaign:'Campaign', colCpa:'CPA', colConversions:'Conversions',
    colImpressions:'Impressions', colClicks:'Clicks', colCpc:'CPC', colSpend:'Spend',
    colHandle:'Handle', colTier:'Tier', colFollowers:'Followers', colRoi:'ROI', colViews:'Views',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Actual Spend',
    skuAgg:'SKU Aggregation', campaignAgg:'Campaign Aggregation', creatorAgg:'Creator Aggregation',
    platformAgg:'Platform Aggregation', platformDetail:'Detail', dailyRevenue:'Daily Revenue',
    revTrend:'Revenue Trend', roasTrend:'ROAS Trend', roasScale:'*ROAS Scale ×1M',
    unitPrice:'Unit Price', commissionPerPost:'Fee/Post', viewsVsRevenue:'Views vs Revenue',
    revenueVsSpend:'Revenue vs Spend', unitTenThousand:'0K',
    tabSummary:'Summary', tabCampaign:'Campaign', tabCreator:'Creator',
    tabPlatform:'Platform', tabSegment:'Segment', tabRisk:'Risk Budget',
    periodDaily:'Daily', periodWeekly:'Weekly', periodMonthly:'Monthly', periodYearly:'Annual', periodSeasonal:'Seasonal',
    unitDay:'d', unitWeek:'w', unitMonth:'mo', unitYear:'yr', unitSeason:'Season',
    noData:'No data available', connectData:'Connect your channels to see real-time data',
    tabGuide:'📖 Guide',
    guideTitle:'Rollup Dashboard Guide',
    guideSubtitle:'Step-by-step instructions for analyzing aggregated data by SKU, Campaign, Creator, and Platform.',
    guideSteps:[
      'Select Period — Choose Daily/Weekly/Monthly/Annual/Seasonal aggregation from top-right controls.',
      'Check Summary — View core KPIs (Revenue, Spend, ROAS, Orders) at a glance.',
      'Analyze SKUs — Review per-product revenue, ROAS, and return rate trends. Click a row for details.',
      'Compare Campaigns — Compare ad campaigns by revenue/spend/ROAS/CPA with trend charts.',
      'Track Creators — Analyze influencer revenue, views, and ROI.',
      'Platform Overview — Compare revenue share and performance across platforms.',
      'Adjust Range — Fine-tune analysis range (7d, 14d, 30d, etc.) from the right dropdown.',
      'Currency Switch — View currency-converted data via top currency settings.',
      'Language Switch — Labels update instantly when language setting is changed.',
      'Data Integration — Connect channels via Integration Hub for real-time updates.',
    ],
    guideFaq:[
      {q:'Why is data empty?', a:'Channels may not be connected or no data exists for the selected period. Check Integration Hub.'},
      {q:'Why is ROAS not showing?', a:'ROAS requires Spend data. Verify ad channel integration.'},
      {q:'How often does data update?', a:'Auto-updates every 5 min to 1 hour depending on the connected channel.'},
      {q:'Can I compare multiple platforms?', a:'Yes, the Platform tab shows revenue share and ROAS across all connected platforms.'},
      {q:'Why does data differ by period?', a:'Daily/Weekly/Monthly aggregation methods differ naturally. Use the same period unit for fair comparison.'},
    ],
    guideTips:['Products with return rates above 12% are highlighted red in the SKU tab — investigate immediately.','ROAS above 3.0x shows green, below shows red in Campaign tab.','Use Seasonal aggregation to identify quarterly patterns.'],
    guideCautions:['Demo/virtual data never enters the production system.','Channels still collecting data may show temporarily incomplete figures.','Return rates are calculated based on confirmed orders only.'],
    guideTabRef:'Tab Descriptions',
    guideTabDesc:{
      summary:'Summarizes core KPIs: Revenue, Spend, ROAS, Orders.',
      sku:'Analyzes per-SKU revenue, ROAS, and return rates.',
      campaign:'Compares campaigns by revenue, spend, CPA, conversions.',
      creator:'Tracks influencer/creator revenue, views, ROI.',
      platform:'Compares revenue share and performance by platform.',
    },
    faqTitle:'Frequently Asked Questions',
    tipsTitle:'Expert Tips',
    cautionsTitle:'Cautions',
  },
  ja: {
    title:'Rollup 集計レイヤー', subtitle:'SKU・キャンペーン・クリエイター・プラットフォーム × 日次/週次/月次/年次/季節別集計',
    loading:'データ読み込み中...', totalRevenue:'総売上', totalSpend:'総広告費', totalOrders:'総注文数',
    avgRoas:'平均ROAS', revenuePerOrder:'注文単価', platformRevenue:'プラットフォーム別売上',
    topSku:'Top SKU状況', alerts:'アラート', colProduct:'商品', colRevenue:'売上', colOrders:'注文数',
    colReturnRate:'返品率', colTrend:'トレンド', colDate:'日付', colTotalRevenue:'総売上', colTotalSpend:'総広告費',
    colPlatform:'プラットフォーム', colShare:'シェア', colCampaign:'キャンペーン', colCpa:'CPA', colConversions:'CV数',
    colImpressions:'インプレッション', colClicks:'クリック', colCpc:'CPC', colSpend:'広告費',
    colHandle:'ハンドル', colTier:'ティア', colFollowers:'フォロワー', colRoi:'ROI', colViews:'ビュー',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'実広告費',
    skuAgg:'SKU集計分析', campaignAgg:'キャンペーン集計分析', creatorAgg:'クリエイター集計分析',
    platformAgg:'プラットフォーム集計分析', platformDetail:'詳細分析', dailyRevenue:'日別売上推移',
    revTrend:'売上推移', roasTrend:'ROAS推移', roasScale:'*ROASスケール ×1M',
    unitPrice:'単価', commissionPerPost:'投稿単価', viewsVsRevenue:'ビュー vs 売上',
    revenueVsSpend:'売上 vs 広告費', unitTenThousand:'万',
    tabSummary:'サマリー', tabCampaign:'キャンペーン', tabCreator:'クリエイター',
    tabPlatform:'プラットフォーム', tabSegment:'セグメント', tabRisk:'リスク予算',
    periodDaily:'日次', periodWeekly:'週次', periodMonthly:'月次', periodYearly:'年次', periodSeasonal:'季節別',
    unitDay:'日', unitWeek:'週', unitMonth:'ヶ月', unitYear:'年', unitSeason:'シーズン',
    noData:'データがありません', connectData:'チャネルを連携すると分析が表示されます',
    tabGuide:'📖 ガイド',
    guideTitle:'統合現況ガイド', guideSubtitle:'集計データの分析方法をステップバイステップでご案内します。',
    guideSteps:['期間選択 — 日次/週次/月次/年次/季節別を選択します。','サマリー確認 — 主要KPIを確認します。','SKU分析 — 商品別売上・ROAS・返品率を分析します。','キャンペーン比較 — 広告成果とCPAを比較します。','クリエイター追跡 — インフルエンサーのROIを分析します。','プラットフォーム概況 — プラットフォーム別シェアを比較します。','範囲調整 — 分析範囲を調整します。','通貨切替 — 他通貨換算を確認します。','言語切替 — ラベルが即時切替されます。','データ連携 — チャネルを連携して分析開始します。'],
    guideFaq:[
      {q:'データが空の理由は？', a:'チャネル未連携か期間内データなしの可能性があります。'},
      {q:'ROASが表示されない場合は？', a:'広告費データが必要です。広告チャネルの連携を確認してください。'},
      {q:'更新頻度は？', a:'チャネルに応じて5分〜1時間で自動更新されます。'},
      {q:'複数プラットフォームの比較は？', a:'プラットフォームタブで全連携先のシェアとROASを比較できます。'},
      {q:'期間別のデータ差は？', a:'集計方式の違いによるものです。同じ期間単位で比較してください。'},
    ],
    guideTips:['返品率12%超はSKUタブで赤表示されます。','ROAS 3.0x以上は緑、未満は赤で表示されます。','季節別集計で四半期パターンを把握できます。'],
    guideCautions:['デモデータは本番に流入しません。','収集中のチャネルは一時的に不完全な場合があります。','返品率は確定注文ベースです。'],
    guideTabRef:'各タブ説明', guideTabDesc:{summary:'主要KPIのサマリー。',sku:'SKU別売上・ROAS分析。',campaign:'キャンペーン別比較。',creator:'クリエイター別追跡。',platform:'プラットフォーム別比較。'},
    faqTitle:'よくある質問', tipsTitle:'専門家のヒント', cautionsTitle:'注意事項',
  },
  zh: {
    title:'Rollup 聚合层', subtitle:'SKU · 广告活动 · 创作者 · 平台 × 日/周/月/年/季节聚合',
    loading:'加载中...', totalRevenue:'总收入', totalSpend:'总广告支出', totalOrders:'总订单量',
    avgRoas:'平均ROAS', revenuePerOrder:'订单均价', platformRevenue:'按平台收入',
    topSku:'Top SKU状态', alerts:'警报', colProduct:'产品', colRevenue:'收入', colOrders:'订单',
    colReturnRate:'退货率', colTrend:'趋势', colDate:'日期', colTotalRevenue:'总收入', colTotalSpend:'总支出',
    colPlatform:'平台', colShare:'占比', colCampaign:'广告活动', colCpa:'CPA', colConversions:'转化数',
    colImpressions:'曝光量', colClicks:'点击量', colCpc:'CPC', colSpend:'广告费',
    colHandle:'账号', colTier:'等级', colFollowers:'粉丝', colRoi:'ROI', colViews:'浏览量',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'实际广告费',
    skuAgg:'SKU聚合分析', campaignAgg:'广告活动聚合分析', creatorAgg:'创作者聚合分析',
    platformAgg:'平台聚合分析', platformDetail:'详细分析', dailyRevenue:'日收入趋势',
    revTrend:'收入趋势', roasTrend:'ROAS趋势', roasScale:'*ROAS缩放 ×1M',
    unitPrice:'单价', commissionPerPost:'每帖佣金', viewsVsRevenue:'浏览 vs 收入',
    revenueVsSpend:'收入 vs 广告费', unitTenThousand:'万',
    tabSummary:'概要', tabCampaign:'广告活动', tabCreator:'创作者',
    tabPlatform:'平台', tabSegment:'细分', tabRisk:'风险预算',
    periodDaily:'日度', periodWeekly:'周度', periodMonthly:'月度', periodYearly:'年度', periodSeasonal:'季度',
    unitDay:'天', unitWeek:'周', unitMonth:'月', unitYear:'年', unitSeason:'季度',
    noData:'暂无数据', connectData:'连接渠道后将显示实时数据',
    tabGuide:'📖 使用指南',
    guideTitle:'聚合概况使用指南', guideSubtitle:'逐步了解如何分析汇总数据。',
    guideSteps:['选择期间 — 选择日/周/月/年/季汇总期间。','查看概要 — 核心KPI一目了然。','SKU分析 — 产品收入及ROAS趋势。','广告活动比较 — 比较广告效果和CPA。','创作者追踪 — 分析网红ROI。','平台概览 — 比较平台份额。','调整范围 — 精调分析范围。','货币切换 — 查看其他货币换算。','语言切换 — 标签即时切换。','数据集成 — 连接渠道开始分析。'],
    guideFaq:[{q:'数据为空？',a:'渠道未连接或期间无数据。'},{q:'ROAS不显示？',a:'需要广告费数据。'},{q:'更新频率？',a:'5分钟至1小时自动更新。'},{q:'可以比较多平台？',a:'是的，平台标签页可比较。'},{q:'期间差异？',a:'聚合方式不同导致。'}],
    guideTips:['退货率超12%在SKU标签页显示红色。','ROAS 3.0x以上绿色，以下红色。','季度聚合可识别季节性模式。'],
    guideCautions:['演示数据不会进入生产系统。','正在收集的渠道可能暂时不完整。','退货率基于已确认订单。'],
    guideTabRef:'标签页说明', guideTabDesc:{summary:'核心KPI摘要。',sku:'SKU收入分析。',campaign:'广告活动比较。',creator:'创作者追踪。',platform:'平台份额比较。'},
    faqTitle:'常见问题', tipsTitle:'专家提示', cautionsTitle:'注意事项',
  },
  'zh-TW': {
    title:'Rollup 聚合層', subtitle:'SKU · 廣告活動 · 創作者 · 平台 × 日/週/月/年/季節聚合',
    loading:'載入中...', totalRevenue:'總收入', totalSpend:'總廣告支出', totalOrders:'總訂單量',
    avgRoas:'平均ROAS', revenuePerOrder:'訂單均價', platformRevenue:'按平台收入',
    topSku:'Top SKU狀態', alerts:'警報', colProduct:'產品', colRevenue:'收入', colOrders:'訂單',
    colReturnRate:'退貨率', colTrend:'趨勢', colDate:'日期', colTotalRevenue:'總收入', colTotalSpend:'總支出',
    colPlatform:'平台', colShare:'佔比', colCampaign:'廣告活動', colCpa:'CPA', colConversions:'轉換數',
    colImpressions:'曝光量', colClicks:'點擊量', colCpc:'CPC', colSpend:'廣告費',
    colHandle:'帳號', colTier:'等級', colFollowers:'粉絲', colRoi:'ROI', colViews:'瀏覽量',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'實際廣告費',
    skuAgg:'SKU聚合分析', campaignAgg:'廣告活動聚合分析', creatorAgg:'創作者聚合分析',
    platformAgg:'平台聚合分析', platformDetail:'詳細分析', dailyRevenue:'日收入趨勢',
    revTrend:'收入趨勢', roasTrend:'ROAS趨勢', roasScale:'*ROAS縮放 ×1M',
    unitPrice:'單價', commissionPerPost:'每帖佣金', viewsVsRevenue:'瀏覽 vs 收入',
    revenueVsSpend:'收入 vs 廣告費', unitTenThousand:'萬',
    tabSummary:'摘要', tabCampaign:'廣告活動', tabCreator:'創作者',
    tabPlatform:'平台', tabSegment:'區分', tabRisk:'風險預算',
    periodDaily:'日', periodWeekly:'週', periodMonthly:'月', periodYearly:'年', periodSeasonal:'季',
    unitDay:'天', unitWeek:'週', unitMonth:'月', unitYear:'年', unitSeason:'季',
    noData:'尚無資料', connectData:'連接渠道後將顯示即時資料',
    tabGuide:'📖 使用指南',
    guideTitle:'統合概況使用指南', guideSubtitle:'逐步了解如何分析匯總資料。',
    guideSteps:[
      '選擇期間 — 從右上方的控制項選擇日/週/月/年/季等匯總期間。',
      '查看摘要 — 在摘要標籤中一覽核心 KPI（收入、廣告費、ROAS、訂單數）。',
      'SKU 分析 — 在 SKU 標籤中查看各商品的收入、ROAS 和退貨率趨勢，點擊列可查看詳情。',
      '廣告活動比較 — 在廣告活動標籤中依收入/廣告費/ROAS/CPA 比較各廣告活動及趨勢圖表。',
      '創作者追蹤 — 在創作者標籤中分析網紅/創作者的收入、觀看數和 ROI。',
      '平台概覽 — 在平台標籤中比較各平台的收入佔比和績效。',
      '調整範圍 — 從右側下拉選單微調分析範圍（7天、14天、30天等）。',
      '貨幣切換 — 透過頂部的貨幣設定查看不同貨幣的換算數據。',
      '語言切換 — 當語言設定更改時，所有標籤和介面文字會即時切換。',
      '資料整合 — 在整合中心連接您的銷售/廣告渠道，即可開始接收即時數據。',
    ],
    guideFaq:[
      {q:'資料為何是空的？',a:'可能是銷售或廣告渠道尚未連接，或所選期間內沒有資料。請前往整合中心檢查連接狀態。'},
      {q:'為何沒有顯示 ROAS？',a:'ROAS 計算需要廣告費數據。請確認廣告渠道已正確連接並傳輸費用資料。'},
      {q:'資料多久更新一次？',a:'依連接的渠道而定，自動更新頻率為 5 分鐘到 1 小時。'},
      {q:'可以比較多個平台嗎？',a:'是的，平台標籤會顯示所有已連接平台的收入佔比和 ROAS 比較。'},
      {q:'不同期間的資料為何有差異？',a:'日/週/月等匯總方式不同，自然會產生差異。建議使用相同期間單位進行公平比較。'},
    ],
    guideTips:['退貨率超過 12% 的商品在 SKU 標籤中會以紅色標示，請立即調查原因。','ROAS 達到 3.0x 以上顯示為綠色，低於則顯示為紅色，便於快速識別高效/低效廣告。','使用季度匯總可幫助您識別季節性消費模式和銷售週期。'],
    guideCautions:['展示/虛擬資料絕不會進入正式生產系統，兩者完全隔離。','正在收集數據的新連接渠道可能暫時顯示不完整的數字，待同步完成後會恢復正常。','退貨率僅基於已確認的訂單計算，待處理訂單不計入統計。'],
    guideTabRef:'各標籤頁功能說明',
    guideTabDesc:{
      summary:'匯總核心 KPI 指標：總收入、廣告費、ROAS、訂單數，並以圖表呈現趨勢走向。',
      sku:'以商品（SKU）為維度分析收入、ROAS 和退貨率，可排序和篩選以發現問題商品。',
      campaign:'依廣告活動比較收入、廣告費、CPA 和轉換數，附帶趨勢圖便於效果追蹤。',
      creator:'追蹤網紅/創作者帶來的收入、觀看數和 ROI，評估合作效益。',
      platform:'比較各銷售平台（如 Coupang、Naver 等）的收入佔比和整體表現。',
    },
    faqTitle:'常見問題 (FAQ)', tipsTitle:'專家提示', cautionsTitle:'重要注意事項',
  },
  de: {
    title:'Rollup Aggregationsschicht', subtitle:'SKU · Kampagne · Creator · Plattform × Täglich/Wöchentlich/Monatlich/Jährlich/Saisonal',
    loading:'Laden...', totalRevenue:'Gesamtumsatz', totalSpend:'Gesamtwerbeausgaben', totalOrders:'Gesamtbestellungen',
    avgRoas:'Ø ROAS', revenuePerOrder:'Umsatz/Bestellung', platformRevenue:'Umsatz nach Plattform',
    topSku:'Top SKU', alerts:'Warnungen', colProduct:'Produkt', colRevenue:'Umsatz', colOrders:'Bestellungen',
    colReturnRate:'Retourenquote', colTrend:'Trend', colDate:'Datum', colTotalRevenue:'Gesamtumsatz', colTotalSpend:'Gesamtausgaben',
    colPlatform:'Plattform', colShare:'Anteil', colCampaign:'Kampagne', colCpa:'CPA', colConversions:'Conversions',
    colImpressions:'Impressionen', colClicks:'Klicks', colCpc:'CPC', colSpend:'Ausgaben',
    colHandle:'Handle', colTier:'Stufe', colFollowers:'Follower', colRoi:'ROI', colViews:'Aufrufe',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Tatsächliche Ausgaben',
    skuAgg:'SKU-Aggregation', campaignAgg:'Kampagnen-Aggregation', creatorAgg:'Creator-Aggregation',
    platformAgg:'Plattform-Aggregation', platformDetail:'Details', dailyRevenue:'Tagesumsatz',
    revTrend:'Umsatztrend', roasTrend:'ROAS-Trend', roasScale:'*ROAS Skala ×1M',
    unitPrice:'Stückpreis', commissionPerPost:'Gebühr/Post', viewsVsRevenue:'Aufrufe vs Umsatz',
    revenueVsSpend:'Umsatz vs Ausgaben', unitTenThousand:'Tsd',
    tabSummary:'Übersicht', tabCampaign:'Kampagne', tabCreator:'Creator',
    tabPlatform:'Plattform', tabSegment:'Segment', tabRisk:'Risikobudget',
    periodDaily:'Täglich', periodWeekly:'Wöchentlich', periodMonthly:'Monatlich', periodYearly:'Jährlich', periodSeasonal:'Saisonal',
    unitDay:'T', unitWeek:'W', unitMonth:'M', unitYear:'J', unitSeason:'Saison',
    noData:'Keine Daten verfügbar', connectData:'Kanäle verbinden für Echtzeitdaten',
    tabGuide:'📖 Anleitung',
    guideTitle:'Rollup-Dashboard Anleitung', guideSubtitle:'Schritt-für-Schritt-Anleitung zur Analyse aggregierter Daten.',
    guideSteps:['Zeitraum wählen — Wählen Sie oben rechts Täglich/Wöchentlich/Monatlich/Jährlich/Saisonal als Aggregationszeitraum.','Übersicht prüfen — Prüfen Sie die Kern-KPIs (Umsatz, Werbeausgaben, ROAS, Bestellungen) auf einen Blick.','SKUs analysieren — Überprüfen Sie pro Produkt Umsatz, ROAS und Retourenquoten-Trends. Klicken Sie auf eine Zeile für Details.','Kampagnen vergleichen — Vergleichen Sie Werbekampagnen nach Umsatz/Ausgaben/ROAS/CPA mit Trenddiagrammen.','Creators verfolgen — Analysieren Sie Influencer-Umsatz, Aufrufe und ROI.','Plattform-Übersicht — Vergleichen Sie Umsatzanteile und Leistung über alle Plattformen.','Bereich anpassen — Passen Sie den Analysezeitraum (7T, 14T, 30T etc.) über das Dropdown rechts an.','Währung wechseln — Sehen Sie währungsumgerechnete Daten über die Währungseinstellungen oben.','Sprache wechseln — Labels aktualisieren sich sofort bei Sprachwechsel.','Daten integrieren — Verbinden Sie Kanäle über den Integration Hub für Echtzeit-Updates.'],
    guideFaq:[{q:'Warum sind keine Daten vorhanden?',a:'Möglicherweise sind Ihre Vertriebs- oder Werbekanäle noch nicht verbunden, oder es liegen keine Daten im gewählten Zeitraum vor. Prüfen Sie den Integration Hub.'},{q:'Warum wird ROAS nicht angezeigt?',a:'Für die ROAS-Berechnung werden Werbeausgaben benötigt. Stellen Sie sicher, dass der Werbekanal korrekt verbunden ist.'},{q:'Wie oft werden Daten aktualisiert?',a:'Je nach Kanal automatisch alle 5 Minuten bis 1 Stunde.'},{q:'Kann ich mehrere Plattformen vergleichen?',a:'Ja, der Plattform-Tab zeigt Umsatzanteile und ROAS aller verbundenen Plattformen.'},{q:'Warum unterscheiden sich Daten je nach Zeitraum?',a:'Tägliche/wöchentliche/monatliche Aggregationsmethoden unterscheiden sich naturgemäß. Verwenden Sie die gleiche Zeiteinheit für faire Vergleiche.'}],
    guideTips:['Produkte mit Retourenquoten über 12% werden im SKU-Tab rot markiert — untersuchen Sie die Ursache sofort.','ROAS ab 3.0x wird grün angezeigt, darunter rot — so erkennen Sie effiziente und ineffiziente Kampagnen auf einen Blick.','Nutzen Sie die saisonale Aggregation, um Quartalsmuster und saisonale Verkaufszyklen zu identifizieren.'],
    guideCautions:['Demo-/Testdaten gelangen niemals in das Produktionssystem — beide Umgebungen sind vollständig isoliert.','Neu verbundene Kanäle, die noch Daten sammeln, können vorübergehend unvollständige Zahlen anzeigen. Nach Abschluss der Synchronisation normalisiert sich dies.','Die Retourenquote wird ausschließlich auf Basis bestätigter Bestellungen berechnet — offene Bestellungen fließen nicht ein.'],
    guideTabRef:'Tab-Beschreibungen', guideTabDesc:{summary:'Fasst Kern-KPIs zusammen: Gesamtumsatz, Werbeausgaben, ROAS, Bestellungen mit Trenddiagrammen.',sku:'Analysiert Umsatz, ROAS und Retourenquoten pro SKU — sortier- und filterbar zur Problemerkennung.',campaign:'Vergleicht Kampagnen nach Umsatz, Ausgaben, CPA und Conversions mit Trenddiagrammen.',creator:'Verfolgt Influencer-/Creator-Umsatz, Aufrufe und ROI zur Bewertung der Zusammenarbeit.',platform:'Vergleicht Umsatzanteile und Gesamtleistung aller verbundenen Verkaufsplattformen.'},
    faqTitle:'Häufige Fragen', tipsTitle:'Expertentipps', cautionsTitle:'Hinweise',
  },
  fr: {
    title:'Couche d\'agrégation Rollup', subtitle:'SKU · Campagne · Créateur · Plateforme × Jour/Semaine/Mois/An/Saison',
    loading:'Chargement...', totalRevenue:'Revenu total', totalSpend:'Dépenses pub totales', totalOrders:'Commandes totales',
    avgRoas:'ROAS moyen', revenuePerOrder:'Revenu/Commande', platformRevenue:'Revenu par plateforme',
    topSku:'Top SKU', alerts:'Alertes', colProduct:'Produit', colRevenue:'Revenu', colOrders:'Commandes',
    colReturnRate:'Taux retour', colTrend:'Tendance', colDate:'Date', colTotalRevenue:'Revenu total', colTotalSpend:'Dépenses totales',
    colPlatform:'Plateforme', colShare:'Part', colCampaign:'Campagne', colCpa:'CPA', colConversions:'Conversions',
    colImpressions:'Impressions', colClicks:'Clics', colCpc:'CPC', colSpend:'Dépenses',
    colHandle:'Compte', colTier:'Niveau', colFollowers:'Abonnés', colRoi:'ROI', colViews:'Vues',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Dépenses réelles',
    skuAgg:'Agrégation SKU', campaignAgg:'Agrégation campagne', creatorAgg:'Agrégation créateur',
    platformAgg:'Agrégation plateforme', platformDetail:'Détails', dailyRevenue:'Revenu quotidien',
    revTrend:'Tendance revenu', roasTrend:'Tendance ROAS', roasScale:'*Échelle ROAS ×1M',
    unitPrice:'Prix unitaire', commissionPerPost:'Frais/Post', viewsVsRevenue:'Vues vs Revenu',
    revenueVsSpend:'Revenu vs Dépenses', unitTenThousand:'K',
    tabSummary:'Résumé', tabCampaign:'Campagne', tabCreator:'Créateur',
    tabPlatform:'Plateforme', tabSegment:'Segment', tabRisk:'Budget risque',
    periodDaily:'Quotidien', periodWeekly:'Hebdomadaire', periodMonthly:'Mensuel', periodYearly:'Annuel', periodSeasonal:'Saisonnier',
    unitDay:'j', unitWeek:'sem', unitMonth:'mois', unitYear:'an', unitSeason:'Saison',
    noData:'Aucune donnée disponible', connectData:'Connectez vos canaux pour voir les données en temps réel',
    tabGuide:'📖 Guide',
    guideTitle:'Guide du tableau Rollup', guideSubtitle:'Instructions étape par étape.',
    guideSteps:['Sélectionner la période — Choisissez Quotidien/Hebdomadaire/Mensuel/Annuel/Saisonnier en haut à droite.','Vérifier le résumé — Consultez les KPI clés (Revenu, Dépenses, ROAS, Commandes) d\'un coup d\'œil.','Analyser les SKUs — Examinez le revenu, le ROAS et les tendances de retour par produit. Cliquez sur une ligne pour les détails.','Comparer les campagnes — Comparez les campagnes publicitaires par revenu/dépenses/ROAS/CPA avec des graphiques de tendance.','Suivre les créateurs — Analysez le revenu, les vues et le ROI des influenceurs/créateurs.','Aperçu des plateformes — Comparez les parts de revenu et les performances entre toutes les plateformes.','Ajuster la plage — Affinez la plage d\'analyse (7j, 14j, 30j, etc.) via le menu déroulant à droite.','Changer la devise — Visualisez les données converties en devise via les paramètres de devise en haut.','Changer la langue — Les libellés se mettent à jour instantanément lors du changement de langue.','Intégrer les données — Connectez vos canaux via le Hub d\'intégration pour des mises à jour en temps réel.'],
    guideFaq:[{q:'Pourquoi les données sont-elles vides ?',a:'Vos canaux de vente ou publicitaires ne sont peut-être pas connectés, ou il n\'y a pas de données pour la période sélectionnée. Vérifiez le Hub d\'intégration.'},{q:'Pourquoi le ROAS n\'apparaît-il pas ?',a:'Le calcul du ROAS nécessite des données de dépenses publicitaires. Vérifiez que le canal publicitaire est correctement connecté.'},{q:'À quelle fréquence les données sont-elles mises à jour ?',a:'Automatiquement toutes les 5 minutes à 1 heure selon le canal connecté.'},{q:'Peut-on comparer plusieurs plateformes ?',a:'Oui, l\'onglet Plateforme affiche les parts de revenu et le ROAS de toutes les plateformes connectées.'},{q:'Pourquoi les données diffèrent-elles selon la période ?',a:'Les méthodes d\'agrégation quotidienne/hebdomadaire/mensuelle diffèrent naturellement. Utilisez la même unité pour une comparaison équitable.'}],
    guideTips:['Les produits avec un taux de retour supérieur à 12% sont marqués en rouge dans l\'onglet SKU — à investiguer immédiatement.','Un ROAS de 3.0x ou plus s\'affiche en vert, en dessous en rouge — pour identifier rapidement les campagnes performantes.','Utilisez l\'agrégation saisonnière pour identifier les tendances trimestrielles et les cycles de vente.'],
    guideCautions:['Les données de démonstration/test n\'entrent jamais dans le système de production — les deux environnements sont totalement isolés.','Les canaux nouvellement connectés en cours de collecte peuvent afficher temporairement des chiffres incomplets.','Le taux de retour est calculé uniquement sur les commandes confirmées — les commandes en attente ne sont pas incluses.'],
    guideTabRef:'Description des onglets', guideTabDesc:{summary:'Résume les KPI clés : revenu total, dépenses, ROAS, commandes avec graphiques de tendance.',sku:'Analyse le revenu, ROAS et taux de retour par SKU — triable et filtrable.',campaign:'Compare les campagnes par revenu, dépenses, CPA et conversions avec graphiques.',creator:'Suit le revenu, les vues et le ROI des influenceurs/créateurs.',platform:'Compare les parts de revenu et performances de toutes les plateformes connectées.'},
    faqTitle:'Questions fréquentes', tipsTitle:'Conseils d\'experts', cautionsTitle:'Précautions',
  },
  es: {
    title:'Capa de agregación Rollup', subtitle:'SKU · Campaña · Creador · Plataforma × Diario/Semanal/Mensual/Anual/Estacional',
    loading:'Cargando...', totalRevenue:'Ingreso total', totalSpend:'Gasto pub. total', totalOrders:'Pedidos totales',
    avgRoas:'ROAS promedio', revenuePerOrder:'Ingreso/Pedido', platformRevenue:'Ingreso por plataforma',
    topSku:'Top SKU', alerts:'Alertas', colProduct:'Producto', colRevenue:'Ingreso', colOrders:'Pedidos',
    colReturnRate:'Tasa devolución', colTrend:'Tendencia', colDate:'Fecha', colTotalRevenue:'Ingreso total', colTotalSpend:'Gasto total',
    colPlatform:'Plataforma', colShare:'Cuota', colCampaign:'Campaña', colCpa:'CPA', colConversions:'Conversiones',
    colImpressions:'Impresiones', colClicks:'Clics', colCpc:'CPC', colSpend:'Gasto',
    colHandle:'Cuenta', colTier:'Nivel', colFollowers:'Seguidores', colRoi:'ROI', colViews:'Vistas',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Gasto real',
    skuAgg:'Agregación SKU', campaignAgg:'Agregación campaña', creatorAgg:'Agregación creador',
    platformAgg:'Agregación plataforma', platformDetail:'Detalle', dailyRevenue:'Ingreso diario',
    revTrend:'Tendencia ingreso', roasTrend:'Tendencia ROAS', roasScale:'*Escala ROAS ×1M',
    unitPrice:'Precio unit.', commissionPerPost:'Tarifa/Post', viewsVsRevenue:'Vistas vs Ingreso',
    revenueVsSpend:'Ingreso vs Gasto', unitTenThousand:'K',
    tabSummary:'Resumen', tabCampaign:'Campaña', tabCreator:'Creador',
    tabPlatform:'Plataforma', tabSegment:'Segmento', tabRisk:'Presupuesto riesgo',
    periodDaily:'Diario', periodWeekly:'Semanal', periodMonthly:'Mensual', periodYearly:'Anual', periodSeasonal:'Estacional',
    unitDay:'d', unitWeek:'sem', unitMonth:'mes', unitYear:'año', unitSeason:'Temp.',
    noData:'No hay datos disponibles', connectData:'Conecte sus canales para ver datos en tiempo real',
    tabGuide:'📖 Guía',
    guideTitle:'Guía del Rollup', guideSubtitle:'Instrucciones paso a paso.',
    guideSteps:['Seleccionar período — Elija Diario/Semanal/Mensual/Anual/Estacional en los controles superiores derecha.','Verificar resumen — Consulte los KPIs clave (Ingreso, Gasto, ROAS, Pedidos) de un vistazo.','Analizar SKUs — Revise ingresos, ROAS y tendencias de devolución por producto. Haga clic en una fila para más detalles.','Comparar campañas — Compare campañas publicitarias por ingreso/gasto/ROAS/CPA con gráficos de tendencia.','Seguir creadores — Analice ingresos, vistas y ROI de influencers/creadores.','Vista de plataformas — Compare cuotas de ingreso y rendimiento en todas las plataformas.','Ajustar rango — Ajuste el rango de análisis (7d, 14d, 30d, etc.) desde el menú desplegable derecho.','Cambiar moneda — Vea datos convertidos a otra moneda mediante la configuración de moneda superior.','Cambiar idioma — Las etiquetas se actualizan instantáneamente al cambiar el idioma.','Integrar datos — Conecte sus canales a través del Hub de Integración para actualizaciones en tiempo real.'],
    guideFaq:[{q:'¿Por qué los datos están vacíos?',a:'Es posible que sus canales de venta o publicidad no estén conectados, o no haya datos en el período seleccionado. Verifique el Hub de Integración.'},{q:'¿Por qué no aparece el ROAS?',a:'El cálculo de ROAS requiere datos de gasto publicitario. Verifique que el canal publicitario esté conectado correctamente.'},{q:'¿Con qué frecuencia se actualizan los datos?',a:'Automáticamente cada 5 minutos a 1 hora según el canal conectado.'},{q:'¿Se pueden comparar varias plataformas?',a:'Sí, la pestaña Plataforma muestra cuotas de ingreso y ROAS de todas las plataformas conectadas.'},{q:'¿Por qué difieren los datos según el período?',a:'Los métodos de agregación diaria/semanal/mensual difieren naturalmente. Use la misma unidad de tiempo para comparaciones justas.'}],
    guideTips:['Productos con tasa de devolución superior al 12% se marcan en rojo en la pestaña SKU — investigue la causa de inmediato.','ROAS de 3.0x o más se muestra en verde, por debajo en rojo — identifique rápidamente campañas eficientes e ineficientes.','Use la agregación estacional para identificar patrones trimestrales y ciclos de venta.'],
    guideCautions:['Los datos de demostración/prueba nunca entran al sistema de producción — ambos entornos están completamente aislados.','Los canales recién conectados que aún recopilan datos pueden mostrar cifras temporalmente incompletas.','La tasa de devolución se calcula solo con pedidos confirmados — los pedidos pendientes no se incluyen.'],
    guideTabRef:'Descripción de pestañas', guideTabDesc:{summary:'Resume KPIs clave: ingreso total, gasto, ROAS, pedidos con gráficos de tendencia.',sku:'Analiza ingreso, ROAS y tasa de devolución por SKU — ordenable y filtrable.',campaign:'Compara campañas por ingreso, gasto, CPA y conversiones con gráficos.',creator:'Rastrea ingreso, vistas y ROI de influencers/creadores.',platform:'Compara cuotas de ingreso y rendimiento de todas las plataformas conectadas.'},
    faqTitle:'Preguntas frecuentes', tipsTitle:'Consejos expertos', cautionsTitle:'Precauciones',
  },
  pt: {
    title:'Camada de agregação Rollup', subtitle:'SKU · Campanha · Criador · Plataforma × Diário/Semanal/Mensal/Anual/Sazonal',
    loading:'Carregando...', totalRevenue:'Receita total', totalSpend:'Gasto pub. total', totalOrders:'Pedidos totais',
    avgRoas:'ROAS médio', revenuePerOrder:'Receita/Pedido', platformRevenue:'Receita por plataforma',
    topSku:'Top SKU', alerts:'Alertas', colProduct:'Produto', colRevenue:'Receita', colOrders:'Pedidos',
    colReturnRate:'Taxa devolução', colTrend:'Tendência', colDate:'Data', colTotalRevenue:'Receita total', colTotalSpend:'Gasto total',
    colPlatform:'Plataforma', colShare:'Participação', colCampaign:'Campanha', colCpa:'CPA', colConversions:'Conversões',
    colImpressions:'Impressões', colClicks:'Cliques', colCpc:'CPC', colSpend:'Gasto',
    colHandle:'Conta', colTier:'Nível', colFollowers:'Seguidores', colRoi:'ROI', colViews:'Visualizações',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Gasto real',
    skuAgg:'Agregação SKU', campaignAgg:'Agregação campanha', creatorAgg:'Agregação criador',
    platformAgg:'Agregação plataforma', platformDetail:'Detalhes', dailyRevenue:'Receita diária',
    revTrend:'Tendência receita', roasTrend:'Tendência ROAS', roasScale:'*Escala ROAS ×1M',
    unitPrice:'Preço unit.', commissionPerPost:'Taxa/Post', viewsVsRevenue:'Visualiz. vs Receita',
    revenueVsSpend:'Receita vs Gasto', unitTenThousand:'K',
    tabSummary:'Resumo', tabCampaign:'Campanha', tabCreator:'Criador',
    tabPlatform:'Plataforma', tabSegment:'Segmento', tabRisk:'Orçamento risco',
    periodDaily:'Diário', periodWeekly:'Semanal', periodMonthly:'Mensal', periodYearly:'Anual', periodSeasonal:'Sazonal',
    unitDay:'d', unitWeek:'sem', unitMonth:'mês', unitYear:'ano', unitSeason:'Temp.',
    noData:'Nenhum dado disponível', connectData:'Conecte seus canais para ver dados em tempo real',
    tabGuide:'📖 Guia',
    guideTitle:'Guia do Rollup', guideSubtitle:'Instruções passo a passo.',
    guideSteps:['Selecionar período — Escolha Diário/Semanal/Mensal/Anual/Sazonal nos controles do canto superior direito.','Verificar resumo — Consulte os KPIs principais (Receita, Gastos, ROAS, Pedidos) de relance.','Analisar SKUs — Revise receita, ROAS e tendências de devolução por produto. Clique em uma linha para detalhes.','Comparar campanhas — Compare campanhas publicitárias por receita/gastos/ROAS/CPA com gráficos de tendência.','Rastrear criadores — Analise receita, visualizações e ROI de influenciadores/criadores.','Visão das plataformas — Compare participação de receita e desempenho entre todas as plataformas.','Ajustar intervalo — Ajuste o intervalo de análise (7d, 14d, 30d, etc.) pelo menu suspenso à direita.','Trocar moeda — Visualize dados convertidos em outra moeda pelas configurações de moeda no topo.','Trocar idioma — Os rótulos são atualizados instantaneamente ao trocar o idioma.','Integrar dados — Conecte seus canais pelo Hub de Integração para atualizações em tempo real.'],
    guideFaq:[{q:'Por que os dados estão vazios?',a:'Seus canais de venda ou publicidade podem não estar conectados, ou não há dados no período selecionado. Verifique o Hub de Integração.'},{q:'Por que o ROAS não aparece?',a:'O cálculo do ROAS requer dados de gastos publicitários. Verifique se o canal publicitário está conectado corretamente.'},{q:'Com que frequência os dados são atualizados?',a:'Automaticamente a cada 5 minutos a 1 hora, dependendo do canal conectado.'},{q:'É possível comparar várias plataformas?',a:'Sim, a aba Plataforma mostra participação de receita e ROAS de todas as plataformas conectadas.'},{q:'Por que os dados diferem por período?',a:'Os métodos de agregação diária/semanal/mensal diferem naturalmente. Use a mesma unidade de tempo para comparações justas.'}],
    guideTips:['Produtos com taxa de devolução acima de 12% são marcados em vermelho na aba SKU — investigue a causa imediatamente.','ROAS de 3.0x ou mais é exibido em verde, abaixo em vermelho — identifique rapidamente campanhas eficientes e ineficientes.','Use a agregação sazonal para identificar padrões trimestrais e ciclos de vendas.'],
    guideCautions:['Dados de demonstração/teste nunca entram no sistema de produção — os dois ambientes são completamente isolados.','Canais recém-conectados que ainda coletam dados podem exibir números temporariamente incompletos.','A taxa de devolução é calculada apenas com pedidos confirmados — pedidos pendentes não são incluídos.'],
    guideTabRef:'Descrição das abas', guideTabDesc:{summary:'Resume KPIs principais: receita total, gastos, ROAS, pedidos com gráficos de tendência.',sku:'Analisa receita, ROAS e taxa de devolução por SKU — ordenável e filtrável.',campaign:'Compara campanhas por receita, gastos, CPA e conversões com gráficos.',creator:'Rastreia receita, visualizações e ROI de influenciadores/criadores.',platform:'Compara participação de receita e desempenho de todas as plataformas conectadas.'},
    faqTitle:'Perguntas frequentes', tipsTitle:'Dicas de especialistas', cautionsTitle:'Precauções',
  },
  ru: {
    title:'Rollup Агрегационный слой', subtitle:'SKU · Кампания · Автор · Платформа × День/Неделя/Месяц/Год/Сезон',
    loading:'Загрузка...', totalRevenue:'Общий доход', totalSpend:'Общие расходы на рекламу', totalOrders:'Всего заказов',
    avgRoas:'Средний ROAS', revenuePerOrder:'Доход/Заказ', platformRevenue:'Доход по платформам',
    topSku:'Топ SKU', alerts:'Оповещения', colProduct:'Продукт', colRevenue:'Доход', colOrders:'Заказы',
    colReturnRate:'Возврат %', colTrend:'Тренд', colDate:'Дата', colTotalRevenue:'Общий доход', colTotalSpend:'Общие расходы',
    colPlatform:'Платформа', colShare:'Доля', colCampaign:'Кампания', colCpa:'CPA', colConversions:'Конверсии',
    colImpressions:'Показы', colClicks:'Клики', colCpc:'CPC', colSpend:'Расходы',
    colHandle:'Аккаунт', colTier:'Уровень', colFollowers:'Подписчики', colRoi:'ROI', colViews:'Просмотры',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Факт. расходы',
    skuAgg:'Агрегация SKU', campaignAgg:'Агрегация кампаний', creatorAgg:'Агрегация авторов',
    platformAgg:'Агрегация платформ', platformDetail:'Подробности', dailyRevenue:'Дневной доход',
    revTrend:'Тренд дохода', roasTrend:'Тренд ROAS', roasScale:'*Масштаб ROAS ×1M',
    unitPrice:'Цена за ед.', commissionPerPost:'Комиссия/Пост', viewsVsRevenue:'Просмотры vs Доход',
    revenueVsSpend:'Доход vs Расходы', unitTenThousand:'тыс',
    tabSummary:'Обзор', tabCampaign:'Кампании', tabCreator:'Авторы',
    tabPlatform:'Платформы', tabSegment:'Сегменты', tabRisk:'Бюджет рисков',
    periodDaily:'День', periodWeekly:'Неделя', periodMonthly:'Месяц', periodYearly:'Год', periodSeasonal:'Сезон',
    unitDay:'д', unitWeek:'нед', unitMonth:'мес', unitYear:'г', unitSeason:'Сезон',
    noData:'Нет данных', connectData:'Подключите каналы для данных в реальном времени',
    tabGuide:'📖 Руководство',
    guideTitle:'Руководство Rollup', guideSubtitle:'Пошаговая инструкция.',
    guideSteps:['Выбрать период — Выберите Ежедневно/Еженедельно/Ежемесячно/Ежегодно/Сезонно в верхнем правом углу.','Проверить обзор — Просмотрите ключевые KPI (Доход, Расходы, ROAS, Заказы) одним взглядом.','Анализ SKU — Изучите доход, ROAS и тренды возвратов по каждому продукту. Нажмите на строку для деталей.','Сравнить кампании — Сравните рекламные кампании по доходу/расходам/ROAS/CPA с графиками трендов.','Отслеживать авторов — Анализируйте доход, просмотры и ROI инфлюенсеров/создателей контента.','Обзор платформ — Сравните доли дохода и эффективность всех платформ.','Настроить диапазон — Настройте диапазон анализа (7д, 14д, 30д и т.д.) через выпадающее меню справа.','Сменить валюту — Просматривайте данные в другой валюте через настройки валюты вверху.','Сменить язык — Все надписи обновляются мгновенно при смене языка.','Интеграция данных — Подключите каналы через Центр интеграции для обновлений в реальном времени.'],
    guideFaq:[{q:'Почему данные пустые?',a:'Возможно, каналы продаж или рекламы ещё не подключены, или нет данных за выбранный период. Проверьте Центр интеграции.'},{q:'Почему не отображается ROAS?',a:'Для расчёта ROAS необходимы данные о рекламных расходах. Убедитесь, что рекламный канал подключён корректно.'},{q:'Как часто обновляются данные?',a:'Автоматически каждые 5 минут — 1 час в зависимости от канала.'},{q:'Можно ли сравнивать несколько платформ?',a:'Да, вкладка Платформы показывает доли дохода и ROAS всех подключённых платформ.'},{q:'Почему данные различаются по периодам?',a:'Методы ежедневной/еженедельной/ежемесячной агрегации естественно различаются. Используйте одинаковые единицы для корректного сравнения.'}],
    guideTips:['Товары с процентом возврата выше 12% выделяются красным во вкладке SKU — немедленно исследуйте причину.','ROAS от 3.0x и выше отображается зелёным, ниже — красным, для быстрого выявления эффективных и неэффективных кампаний.','Используйте сезонную агрегацию для выявления квартальных паттернов и циклов продаж.'],
    guideCautions:['Демонстрационные/тестовые данные никогда не попадают в производственную систему — среды полностью изолированы.','Недавно подключённые каналы, ещё собирающие данные, могут временно показывать неполные цифры.','Процент возвратов рассчитывается только по подтверждённым заказам — ожидающие заказы не учитываются.'],
    guideTabRef:'Описание вкладок', guideTabDesc:{summary:'Сводка ключевых KPI: общий доход, расходы, ROAS, заказы с графиками трендов.',sku:'Анализирует доход, ROAS и процент возвратов по каждому SKU — сортировка и фильтрация.',campaign:'Сравнивает кампании по доходу, расходам, CPA и конверсиям с графиками.',creator:'Отслеживает доход, просмотры и ROI инфлюенсеров/создателей.',platform:'Сравнивает доли дохода и общую эффективность всех подключённых платформ.'},
    faqTitle:'Часто задаваемые вопросы', tipsTitle:'Советы экспертов', cautionsTitle:'Предупреждения',
  },
  ar: {
    title:'طبقة التجميع Rollup', subtitle:'SKU · الحملة · المنشئ · المنصة × يوميًا/أسبوعيًا/شهريًا/سنويًا/موسميًا',
    loading:'جاري التحميل...', totalRevenue:'إجمالي الإيرادات', totalSpend:'إجمالي الإنفاق الإعلاني', totalOrders:'إجمالي الطلبات',
    avgRoas:'متوسط ROAS', revenuePerOrder:'الإيرادات/الطلب', platformRevenue:'الإيرادات حسب المنصة',
    topSku:'أفضل SKU', alerts:'التنبيهات', colProduct:'المنتج', colRevenue:'الإيرادات', colOrders:'الطلبات',
    colReturnRate:'معدل الإرجاع', colTrend:'الاتجاه', colDate:'التاريخ', colTotalRevenue:'إجمالي الإيرادات', colTotalSpend:'إجمالي الإنفاق',
    colPlatform:'المنصة', colShare:'الحصة', colCampaign:'الحملة', colCpa:'CPA', colConversions:'التحويلات',
    colImpressions:'مرات الظهور', colClicks:'النقرات', colCpc:'CPC', colSpend:'الإنفاق',
    colHandle:'الحساب', colTier:'المستوى', colFollowers:'المتابعون', colRoi:'ROI', colViews:'المشاهدات',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'الإنفاق الفعلي',
    skuAgg:'تجميع SKU', campaignAgg:'تجميع الحملات', creatorAgg:'تجميع المنشئين',
    platformAgg:'تجميع المنصات', platformDetail:'التفاصيل', dailyRevenue:'الإيرادات اليومية',
    revTrend:'اتجاه الإيرادات', roasTrend:'اتجاه ROAS', roasScale:'*مقياس ROAS ×1M',
    unitPrice:'سعر الوحدة', commissionPerPost:'رسوم/منشور', viewsVsRevenue:'المشاهدات مقابل الإيرادات',
    revenueVsSpend:'الإيرادات مقابل الإنفاق', unitTenThousand:'ألف',
    tabSummary:'الملخص', tabCampaign:'الحملات', tabCreator:'المنشئون',
    tabPlatform:'المنصات', tabSegment:'الشرائح', tabRisk:'ميزانية المخاطر',
    periodDaily:'يومي', periodWeekly:'أسبوعي', periodMonthly:'شهري', periodYearly:'سنوي', periodSeasonal:'موسمي',
    unitDay:'يوم', unitWeek:'أسبوع', unitMonth:'شهر', unitYear:'سنة', unitSeason:'موسم',
    noData:'لا توجد بيانات متاحة', connectData:'قم بربط قنواتك لرؤية البيانات في الوقت الفعلي',
    tabGuide:'📖 الدليل',
    guideTitle:'دليل Rollup', guideSubtitle:'تعليمات خطوة بخطوة.',
    guideSteps:['اختيار الفترة — اختر يومي/أسبوعي/شهري/سنوي/موسمي من عناصر التحكم أعلى اليسار.','مراجعة الملخص — اطلع على مؤشرات الأداء الرئيسية (الإيرادات، الإنفاق، ROAS، الطلبات) بنظرة واحدة.','تحليل SKU — راجع الإيرادات وROAS واتجاهات الإرجاع لكل منتج. انقر على صف للتفاصيل.','مقارنة الحملات — قارن الحملات الإعلانية حسب الإيرادات/الإنفاق/ROAS/CPA مع رسوم بيانية للاتجاهات.','تتبع المنشئين — حلل إيرادات المؤثرين/المنشئين وعدد المشاهدات والعائد على الاستثمار.','نظرة عامة المنصات — قارن حصص الإيرادات والأداء عبر جميع المنصات المتصلة.','ضبط النطاق — اضبط نطاق التحليل (7 أيام، 14 يومًا، 30 يومًا، إلخ) من القائمة المنسدلة على اليسار.','تغيير العملة — اعرض البيانات المحولة بعملة أخرى عبر إعدادات العملة في الأعلى.','تغيير اللغة — تتحدث جميع التسميات والنصوص فوريًا عند تغيير إعداد اللغة.','تكامل البيانات — قم بتوصيل قنواتك عبر مركز التكامل للحصول على تحديثات فورية.'],
    guideFaq:[{q:'لماذا لا توجد بيانات؟',a:'قد لا تكون قنوات المبيعات أو الإعلانات متصلة، أو لا توجد بيانات للفترة المحددة. تحقق من مركز التكامل.'},{q:'لماذا لا يظهر ROAS؟',a:'يتطلب حساب ROAS بيانات الإنفاق الإعلاني. تأكد من اتصال القناة الإعلانية بشكل صحيح.'},{q:'كم مرة يتم تحديث البيانات؟',a:'تلقائيًا كل 5 دقائق إلى ساعة واحدة حسب القناة المتصلة.'},{q:'هل يمكن مقارنة عدة منصات؟',a:'نعم، يعرض تبويب المنصات حصص الإيرادات وROAS لجميع المنصات المتصلة.'},{q:'لماذا تختلف البيانات حسب الفترة؟',a:'تختلف طرق التجميع اليومية/الأسبوعية/الشهرية بطبيعتها. استخدم نفس وحدة الوقت للمقارنة العادلة.'}],
    guideTips:['المنتجات ذات معدل إرجاع أعلى من 12% تُميَّز باللون الأحمر في تبويب SKU — يجب التحقيق في السبب فورًا.','ROAS بقيمة 3.0x أو أعلى يظهر بالأخضر، وأقل من ذلك بالأحمر — لتحديد الحملات الفعالة وغير الفعالة بسرعة.','استخدم التجميع الموسمي لتحديد أنماط الربع السنوي ودورات المبيعات الموسمية.'],
    guideCautions:['بيانات العرض/الاختبار لا تدخل أبدًا في نظام الإنتاج — البيئتان معزولتان تمامًا.','القنوات المتصلة حديثًا التي لا تزال تجمع البيانات قد تعرض أرقامًا غير مكتملة مؤقتًا حتى اكتمال المزامنة.','يُحسب معدل الإرجاع فقط بناءً على الطلبات المؤكدة — الطلبات المعلقة لا تُدرج في الإحصاءات.'],
    guideTabRef:'وصف التبويبات', guideTabDesc:{summary:'يلخص مؤشرات الأداء الرئيسية: إجمالي الإيرادات والإنفاق وROAS والطلبات مع رسوم بيانية للاتجاهات.',sku:'يحلل الإيرادات وROAS ومعدل الإرجاع لكل SKU — قابل للفرز والتصفية لاكتشاف المنتجات المشكلة.',campaign:'يقارن الحملات حسب الإيرادات والإنفاق وCPA والتحويلات مع رسوم بيانية.',creator:'يتتبع إيرادات المؤثرين/المنشئين وعدد المشاهدات والعائد على الاستثمار.',platform:'يقارن حصص الإيرادات والأداء العام لجميع منصات البيع المتصلة.'},
    faqTitle:'الأسئلة الشائعة', tipsTitle:'نصائح الخبراء', cautionsTitle:'تنبيهات',
  },
  vi: {
    title:'Rollup Tầng Tổng hợp', subtitle:'SKU · Chiến dịch · Nhà sáng tạo · Nền tảng × Ngày/Tuần/Tháng/Năm/Mùa',
    loading:'Đang tải...', totalRevenue:'Tổng doanh thu', totalSpend:'Tổng chi quảng cáo', totalOrders:'Tổng đơn hàng',
    avgRoas:'ROAS TB', revenuePerOrder:'Doanh thu/Đơn', platformRevenue:'Doanh thu theo nền tảng',
    topSku:'Top SKU', alerts:'Cảnh báo', colProduct:'Sản phẩm', colRevenue:'Doanh thu', colOrders:'Đơn hàng',
    colReturnRate:'Tỷ lệ trả', colTrend:'Xu hướng', colDate:'Ngày', colTotalRevenue:'Tổng DT', colTotalSpend:'Tổng chi',
    colPlatform:'Nền tảng', colShare:'Tỷ trọng', colCampaign:'Chiến dịch', colCpa:'CPA', colConversions:'Chuyển đổi',
    colImpressions:'Lượt hiển thị', colClicks:'Lượt click', colCpc:'CPC', colSpend:'Chi phí QC',
    colHandle:'Tài khoản', colTier:'Hạng', colFollowers:'Người theo dõi', colRoi:'ROI', colViews:'Lượt xem',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Chi thực tế',
    skuAgg:'Tổng hợp SKU', campaignAgg:'Tổng hợp chiến dịch', creatorAgg:'Tổng hợp nhà sáng tạo',
    platformAgg:'Tổng hợp nền tảng', platformDetail:'Chi tiết', dailyRevenue:'Doanh thu ngày',
    revTrend:'Xu hướng doanh thu', roasTrend:'Xu hướng ROAS', roasScale:'*ROAS tỷ lệ ×1M',
    unitPrice:'Đơn giá', commissionPerPost:'Phí/Bài', viewsVsRevenue:'Lượt xem vs Doanh thu',
    revenueVsSpend:'Doanh thu vs Chi phí', unitTenThousand:'vạn',
    tabSummary:'Tóm tắt', tabCampaign:'Chiến dịch', tabCreator:'Nhà sáng tạo',
    tabPlatform:'Nền tảng', tabSegment:'Phân khúc', tabRisk:'Ngân sách rủi ro',
    periodDaily:'Ngày', periodWeekly:'Tuần', periodMonthly:'Tháng', periodYearly:'Năm', periodSeasonal:'Mùa',
    unitDay:'ngày', unitWeek:'tuần', unitMonth:'tháng', unitYear:'năm', unitSeason:'mùa',
    noData:'Chưa có dữ liệu', connectData:'Kết nối kênh để xem dữ liệu thời gian thực',
    tabGuide:'📖 Hướng dẫn',
    guideTitle:'Hướng dẫn Rollup', guideSubtitle:'Hướng dẫn từng bước.',
    guideSteps:['Chọn kỳ — Chọn Ngày/Tuần/Tháng/Năm/Mùa từ các điều khiển phía trên bên phải.','Xem tóm tắt — Xem các KPI chính (Doanh thu, Chi phí, ROAS, Đơn hàng) trong một cái nhìn.','Phân tích SKU — Xem doanh thu, ROAS và xu hướng trả hàng theo từng sản phẩm. Nhấp vào hàng để xem chi tiết.','So sánh chiến dịch — So sánh các chiến dịch quảng cáo theo doanh thu/chi phí/ROAS/CPA với biểu đồ xu hướng.','Theo dõi nhà sáng tạo — Phân tích doanh thu, lượt xem và ROI của influencer/nhà sáng tạo.','Tổng quan nền tảng — So sánh tỷ trọng doanh thu và hiệu suất trên tất cả các nền tảng.','Điều chỉnh phạm vi — Tinh chỉnh phạm vi phân tích (7 ngày, 14 ngày, 30 ngày, v.v.) từ menu thả xuống bên phải.','Đổi tiền tệ — Xem dữ liệu chuyển đổi tiền tệ qua cài đặt tiền tệ phía trên.','Đổi ngôn ngữ — Tất cả nhãn và văn bản cập nhật ngay khi thay đổi cài đặt ngôn ngữ.','Tích hợp dữ liệu — Kết nối kênh bán hàng/quảng cáo qua Trung tâm Tích hợp để nhận cập nhật thời gian thực.'],
    guideFaq:[{q:'Tại sao dữ liệu trống?',a:'Có thể kênh bán hàng hoặc quảng cáo chưa được kết nối, hoặc không có dữ liệu trong kỳ đã chọn. Kiểm tra Trung tâm Tích hợp.'},{q:'Tại sao ROAS không hiển thị?',a:'Tính toán ROAS cần dữ liệu chi tiêu quảng cáo. Đảm bảo kênh quảng cáo đã kết nối đúng cách.'},{q:'Dữ liệu cập nhật bao lâu một lần?',a:'Tự động mỗi 5 phút đến 1 giờ tùy theo kênh kết nối.'},{q:'Có thể so sánh nhiều nền tảng không?',a:'Có, tab Nền tảng hiển thị tỷ trọng doanh thu và ROAS của tất cả nền tảng đã kết nối.'},{q:'Tại sao dữ liệu khác nhau theo kỳ?',a:'Phương pháp tổng hợp ngày/tuần/tháng khác nhau tự nhiên. Sử dụng cùng đơn vị thời gian để so sánh công bằng.'}],
    guideTips:['Sản phẩm có tỷ lệ trả hàng trên 12% được đánh dấu đỏ trong tab SKU — hãy điều tra nguyên nhân ngay.','ROAS từ 3.0x trở lên hiển thị xanh, dưới mức đó hiển thị đỏ — giúp nhận diện nhanh chiến dịch hiệu quả và kém hiệu quả.','Sử dụng tổng hợp theo mùa để nhận diện xu hướng theo quý và chu kỳ bán hàng theo mùa.'],
    guideCautions:['Dữ liệu demo/thử nghiệm không bao giờ đi vào hệ thống sản xuất — hai môi trường hoàn toàn cách ly.','Các kênh mới kết nối đang thu thập dữ liệu có thể hiển thị số liệu chưa đầy đủ tạm thời cho đến khi đồng bộ hoàn tất.','Tỷ lệ trả hàng chỉ tính trên đơn hàng đã xác nhận — đơn hàng đang chờ xử lý không được tính vào thống kê.'],
    guideTabRef:'Mô tả tab', guideTabDesc:{summary:'Tổng hợp các KPI chính: tổng doanh thu, chi phí quảng cáo, ROAS, đơn hàng với biểu đồ xu hướng.',sku:'Phân tích doanh thu, ROAS và tỷ lệ trả hàng theo từng SKU — có thể sắp xếp và lọc.',campaign:'So sánh chiến dịch theo doanh thu, chi phí, CPA và chuyển đổi với biểu đồ.',creator:'Theo dõi doanh thu, lượt xem và ROI của influencer/nhà sáng tạo.',platform:'So sánh tỷ trọng doanh thu và hiệu suất tổng thể của tất cả nền tảng đã kết nối.'},
    faqTitle:'Câu hỏi thường gặp', tipsTitle:'Mẹo chuyên gia', cautionsTitle:'Lưu ý',
  },
  th: {
    title:'Rollup ชั้นรวมข้อมูล', subtitle:'SKU · แคมเปญ · ครีเอเตอร์ · แพลตฟอร์ม × รายวัน/สัปดาห์/เดือน/ปี/ฤดูกาล',
    loading:'กำลังโหลด...', totalRevenue:'รายได้รวม', totalSpend:'ค่าโฆษณารวม', totalOrders:'คำสั่งซื้อรวม',
    avgRoas:'ROAS เฉลี่ย', revenuePerOrder:'รายได้/คำสั่งซื้อ', platformRevenue:'รายได้ตามแพลตฟอร์ม',
    topSku:'Top SKU', alerts:'แจ้งเตือน', colProduct:'สินค้า', colRevenue:'รายได้', colOrders:'คำสั่งซื้อ',
    colReturnRate:'อัตราคืน', colTrend:'แนวโน้ม', colDate:'วันที่', colTotalRevenue:'รายได้รวม', colTotalSpend:'ค่าใช้จ่ายรวม',
    colPlatform:'แพลตฟอร์ม', colShare:'ส่วนแบ่ง', colCampaign:'แคมเปญ', colCpa:'CPA', colConversions:'Conversions',
    colImpressions:'แสดงผล', colClicks:'คลิก', colCpc:'CPC', colSpend:'ค่าโฆษณา',
    colHandle:'บัญชี', colTier:'ระดับ', colFollowers:'ผู้ติดตาม', colRoi:'ROI', colViews:'ยอดดู',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'ค่าใช้จ่ายจริง',
    skuAgg:'วิเคราะห์ SKU', campaignAgg:'วิเคราะห์แคมเปญ', creatorAgg:'วิเคราะห์ครีเอเตอร์',
    platformAgg:'วิเคราะห์แพลตฟอร์ม', platformDetail:'รายละเอียด', dailyRevenue:'รายได้รายวัน',
    revTrend:'แนวโน้มรายได้', roasTrend:'แนวโน้ม ROAS', roasScale:'*ROAS สเกล ×1M',
    unitPrice:'ราคาต่อหน่วย', commissionPerPost:'ค่าคอมมิชชัน/โพสต์', viewsVsRevenue:'ยอดดู vs รายได้',
    revenueVsSpend:'รายได้ vs ค่าโฆษณา', unitTenThousand:'หมื่น',
    tabSummary:'สรุป', tabCampaign:'แคมเปญ', tabCreator:'ครีเอเตอร์',
    tabPlatform:'แพลตฟอร์ม', tabSegment:'Segment', tabRisk:'งบความเสี่ยง',
    periodDaily:'รายวัน', periodWeekly:'รายสัปดาห์', periodMonthly:'รายเดือน', periodYearly:'รายปี', periodSeasonal:'ตามฤดูกาล',
    unitDay:'วัน', unitWeek:'สัปดาห์', unitMonth:'เดือน', unitYear:'ปี', unitSeason:'ฤดูกาล',
    noData:'ไม่มีข้อมูล', connectData:'เชื่อมต่อช่องทางเพื่อดูข้อมูลแบบเรียลไทม์',
    tabGuide:'📖 คู่มือ',
    guideTitle:'คู่มือ Rollup', guideSubtitle:'คำแนะนำทีละขั้นตอน',
    guideSteps:['เลือกช่วงเวลา — เลือกรายวัน/สัปดาห์/เดือน/ปี/ฤดูกาลจากตัวควบคุมมุมบนขวา','ตรวจสอบสรุป — ดู KPI หลัก (รายได้, ค่าโฆษณา, ROAS, คำสั่งซื้อ) ได้ในพริบตา','วิเคราะห์ SKU — ตรวจสอบรายได้, ROAS และแนวโน้มการคืนสินค้าแต่ละผลิตภัณฑ์ คลิกแถวเพื่อดูรายละเอียด','เปรียบเทียบแคมเปญ — เปรียบเทียบแคมเปญโฆษณาตามรายได้/ค่าใช้จ่าย/ROAS/CPA พร้อมกราฟแนวโน้ม','ติดตามครีเอเตอร์ — วิเคราะห์รายได้ ยอดดู และ ROI ของอินฟลูเอนเซอร์/ครีเอเตอร์','ภาพรวมแพลตฟอร์ม — เปรียบเทียบส่วนแบ่งรายได้และประสิทธิภาพทุกแพลตฟอร์ม','ปรับช่วง — ปรับช่วงการวิเคราะห์ (7 วัน, 14 วัน, 30 วัน ฯลฯ) จากเมนูดรอปดาวน์ขวา','สลับสกุลเงิน — ดูข้อมูลแปลงสกุลเงินผ่านการตั้งค่าสกุลเงินด้านบน','สลับภาษา — ป้ายกำกับทั้งหมดอัปเดตทันทีเมื่อเปลี่ยนการตั้งค่าภาษา','เชื่อมข้อมูล — เชื่อมต่อช่องทางผ่านศูนย์การรวมระบบเพื่อรับข้อมูลแบบเรียลไทม์'],
    guideFaq:[{q:'ทำไมข้อมูลจึงว่างเปล่า?',a:'ช่องทางขายหรือโฆษณาอาจยังไม่ได้เชื่อมต่อ หรือไม่มีข้อมูลในช่วงเวลาที่เลือก ตรวจสอบศูนย์การรวมระบบ'},{q:'ทำไม ROAS ไม่แสดง?',a:'การคำนวณ ROAS ต้องมีข้อมูลค่าโฆษณา ตรวจสอบว่าช่องทางโฆษณาเชื่อมต่อถูกต้อง'},{q:'ข้อมูลอัปเดตบ่อยแค่ไหน?',a:'อัตโนมัติทุก 5 นาที ถึง 1 ชั่วโมง ขึ้นอยู่กับช่องทางที่เชื่อมต่อ'},{q:'สามารถเปรียบเทียบหลายแพลตฟอร์มได้ไหม?',a:'ได้ แท็บแพลตฟอร์มแสดงส่วนแบ่งรายได้และ ROAS ของทุกแพลตฟอร์มที่เชื่อมต่อ'},{q:'ทำไมข้อมูลต่างกันตามช่วงเวลา?',a:'วิธีการรวมข้อมูลรายวัน/สัปดาห์/เดือนแตกต่างกันตามธรรมชาติ ใช้หน่วยเวลาเดียวกันเพื่อเปรียบเทียบอย่างยุติธรรม'}],
    guideTips:['สินค้าที่มีอัตราคืนสินค้าเกิน 12% จะถูกทำเครื่องหมายสีแดงในแท็บ SKU — ควรตรวจสอบสาเหตุทันที','ROAS ตั้งแต่ 3.0x ขึ้นไปแสดงเป็นสีเขียว ต่ำกว่าแสดงเป็นสีแดง — ช่วยระบุแคมเปญที่มีประสิทธิภาพและไม่มีประสิทธิภาพได้อย่างรวดเร็ว','ใช้การรวมตามฤดูกาลเพื่อระบุรูปแบบรายไตรมาสและวงจรการขายตามฤดูกาล'],
    guideCautions:['ข้อมูลสาธิต/ทดสอบไม่มีทางเข้าสู่ระบบการผลิตจริง — ทั้งสองสภาพแวดล้อมแยกจากกันอย่างสมบูรณ์','ช่องทางที่เพิ่งเชื่อมต่อซึ่งยังเก็บข้อมูลอยู่อาจแสดงตัวเลขไม่สมบูรณ์ชั่วคราว จนกว่าการซิงค์จะเสร็จสมบูรณ์','อัตราคืนสินค้าคำนวณจากคำสั่งซื้อที่ยืนยันแล้วเท่านั้น — คำสั่งซื้อที่รอดำเนินการไม่รวมในสถิติ'],
    guideTabRef:'คำอธิบายแท็บ', guideTabDesc:{summary:'สรุป KPI หลัก: รายได้รวม ค่าโฆษณา ROAS คำสั่งซื้อ พร้อมกราฟแนวโน้ม',sku:'วิเคราะห์รายได้ ROAS และอัตราคืนสินค้าตาม SKU — เรียงลำดับและกรองได้',campaign:'เปรียบเทียบแคมเปญตามรายได้ ค่าใช้จ่าย CPA และ Conversions พร้อมกราฟ',creator:'ติดตามรายได้ ยอดดู และ ROI ของอินฟลูเอนเซอร์/ครีเอเตอร์',platform:'เปรียบเทียบส่วนแบ่งรายได้และประสิทธิภาพรวมของทุกแพลตฟอร์มที่เชื่อมต่อ'},
    faqTitle:'คำถามที่พบบ่อย', tipsTitle:'เคล็ดลับผู้เชี่ยวชาญ', cautionsTitle:'ข้อควรระวัง',
  },
  id: {
    title:'Rollup Lapisan Agregasi', subtitle:'SKU · Kampanye · Kreator · Platform × Harian/Mingguan/Bulanan/Tahunan/Musiman',
    loading:'Memuat...', totalRevenue:'Total Pendapatan', totalSpend:'Total Belanja Iklan', totalOrders:'Total Pesanan',
    avgRoas:'Rata-rata ROAS', revenuePerOrder:'Pendapatan/Pesanan', platformRevenue:'Pendapatan per Platform',
    topSku:'Top SKU', alerts:'Peringatan', colProduct:'Produk', colRevenue:'Pendapatan', colOrders:'Pesanan',
    colReturnRate:'Tingkat Retur', colTrend:'Tren', colDate:'Tanggal', colTotalRevenue:'Total Pendapatan', colTotalSpend:'Total Pengeluaran',
    colPlatform:'Platform', colShare:'Pangsa', colCampaign:'Kampanye', colCpa:'CPA', colConversions:'Konversi',
    colImpressions:'Tayangan', colClicks:'Klik', colCpc:'CPC', colSpend:'Pengeluaran',
    colHandle:'Akun', colTier:'Tingkat', colFollowers:'Pengikut', colRoi:'ROI', colViews:'Tampilan',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Pengeluaran Aktual',
    skuAgg:'Agregasi SKU', campaignAgg:'Agregasi Kampanye', creatorAgg:'Agregasi Kreator',
    platformAgg:'Agregasi Platform', platformDetail:'Detail', dailyRevenue:'Pendapatan Harian',
    revTrend:'Tren Pendapatan', roasTrend:'Tren ROAS', roasScale:'*Skala ROAS ×1M',
    unitPrice:'Harga Satuan', commissionPerPost:'Biaya/Post', viewsVsRevenue:'Tampilan vs Pendapatan',
    revenueVsSpend:'Pendapatan vs Pengeluaran', unitTenThousand:'rb',
    tabSummary:'Ringkasan', tabCampaign:'Kampanye', tabCreator:'Kreator',
    tabPlatform:'Platform', tabSegment:'Segmen', tabRisk:'Anggaran Risiko',
    periodDaily:'Harian', periodWeekly:'Mingguan', periodMonthly:'Bulanan', periodYearly:'Tahunan', periodSeasonal:'Musiman',
    unitDay:'hari', unitWeek:'minggu', unitMonth:'bulan', unitYear:'tahun', unitSeason:'Musim',
    noData:'Tidak ada data', connectData:'Hubungkan saluran untuk data real-time',
    tabGuide:'📖 Panduan',
    guideTitle:'Panduan Rollup', guideSubtitle:'Petunjuk langkah demi langkah.',
    guideSteps:['Pilih periode — Pilih Harian/Mingguan/Bulanan/Tahunan/Musiman dari kontrol kanan atas.','Periksa ringkasan — Lihat KPI utama (Pendapatan, Pengeluaran, ROAS, Pesanan) sekilas.','Analisis SKU — Tinjau pendapatan, ROAS, dan tren retur per produk. Klik baris untuk detail.','Bandingkan kampanye — Bandingkan kampanye iklan berdasarkan pendapatan/pengeluaran/ROAS/CPA dengan grafik tren.','Lacak kreator — Analisis pendapatan, tampilan, dan ROI influencer/kreator.','Ikhtisar platform — Bandingkan pangsa pendapatan dan kinerja semua platform.','Sesuaikan rentang — Sesuaikan rentang analisis (7 hari, 14 hari, 30 hari, dll.) dari dropdown kanan.','Ganti mata uang — Lihat data konversi mata uang melalui pengaturan mata uang di atas.','Ganti bahasa — Semua label diperbarui secara instan saat bahasa diubah.','Integrasi data — Hubungkan saluran penjualan/iklan melalui Hub Integrasi untuk pembaruan waktu nyata.'],
    guideFaq:[{q:'Mengapa data kosong?',a:'Saluran penjualan atau iklan mungkin belum terhubung, atau tidak ada data untuk periode yang dipilih. Periksa Hub Integrasi.'},{q:'Mengapa ROAS tidak muncul?',a:'Perhitungan ROAS memerlukan data pengeluaran iklan. Pastikan saluran iklan terhubung dengan benar.'},{q:'Seberapa sering data diperbarui?',a:'Otomatis setiap 5 menit hingga 1 jam tergantung saluran yang terhubung.'},{q:'Bisakah membandingkan beberapa platform?',a:'Ya, tab Platform menampilkan pangsa pendapatan dan ROAS semua platform yang terhubung.'},{q:'Mengapa data berbeda menurut periode?',a:'Metode agregasi harian/mingguan/bulanan berbeda secara alami. Gunakan unit waktu yang sama untuk perbandingan yang adil.'}],
    guideTips:['Produk dengan tingkat retur di atas 12% ditandai merah di tab SKU — segera selidiki penyebabnya.','ROAS 3.0x ke atas ditampilkan hijau, di bawahnya merah — untuk mengidentifikasi kampanye efektif dan tidak efektif dengan cepat.','Gunakan agregasi musiman untuk mengidentifikasi pola triwulanan dan siklus penjualan musiman.'],
    guideCautions:['Data demo/uji coba tidak pernah masuk ke sistem produksi — kedua lingkungan sepenuhnya terisolasi.','Saluran yang baru terhubung dan masih mengumpulkan data mungkin menampilkan angka yang belum lengkap sementara hingga sinkronisasi selesai.','Tingkat retur dihitung hanya berdasarkan pesanan yang terkonfirmasi — pesanan yang menunggu tidak termasuk dalam statistik.'],
    guideTabRef:'Deskripsi tab', guideTabDesc:{summary:'Meringkas KPI utama: total pendapatan, pengeluaran, ROAS, pesanan dengan grafik tren.',sku:'Menganalisis pendapatan, ROAS, dan tingkat retur per SKU — dapat diurutkan dan difilter.',campaign:'Membandingkan kampanye berdasarkan pendapatan, pengeluaran, CPA, dan konversi dengan grafik.',creator:'Melacak pendapatan, tampilan, dan ROI influencer/kreator.',platform:'Membandingkan pangsa pendapatan dan kinerja keseluruhan semua platform yang terhubung.'},
    faqTitle:'FAQ', tipsTitle:'Tips Ahli', cautionsTitle:'Perhatian',
  },
  hi: {
    title:'Rollup समेकन परत', subtitle:'SKU · अभियान · क्रिएटर · प्लेटफ़ॉर्म × दैनिक/साप्ताहिक/मासिक/वार्षिक/मौसमी',
    loading:'लोड हो रहा है...', totalRevenue:'कुल राजस्व', totalSpend:'कुल विज्ञापन व्यय', totalOrders:'कुल ऑर्डर',
    avgRoas:'औसत ROAS', revenuePerOrder:'राजस्व/ऑर्डर', platformRevenue:'प्लेटफ़ॉर्म अनुसार राजस्व',
    topSku:'Top SKU', alerts:'अलर्ट', colProduct:'उत्पाद', colRevenue:'राजस्व', colOrders:'ऑर्डर',
    colReturnRate:'वापसी दर', colTrend:'रुझान', colDate:'तारीख', colTotalRevenue:'कुल राजस्व', colTotalSpend:'कुल व्यय',
    colPlatform:'प्लेटफ़ॉर्म', colShare:'हिस्सा', colCampaign:'अभियान', colCpa:'CPA', colConversions:'रूपांतरण',
    colImpressions:'इम्प्रेशन', colClicks:'क्लिक', colCpc:'CPC', colSpend:'व्यय',
    colHandle:'खाता', colTier:'स्तर', colFollowers:'फ़ॉलोअर', colRoi:'ROI', colViews:'दृश्य',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'वास्तविक व्यय',
    skuAgg:'SKU समेकन', campaignAgg:'अभियान समेकन', creatorAgg:'क्रिएटर समेकन',
    platformAgg:'प्लेटफ़ॉर्म समेकन', platformDetail:'विवरण', dailyRevenue:'दैनिक राजस्व',
    revTrend:'राजस्व रुझान', roasTrend:'ROAS रुझान', roasScale:'*ROAS स्केल ×1M',
    unitPrice:'इकाई मूल्य', commissionPerPost:'शुल्क/पोस्ट', viewsVsRevenue:'दृश्य vs राजस्व',
    revenueVsSpend:'राजस्व vs व्यय', unitTenThousand:'हज़ार',
    tabSummary:'सारांश', tabCampaign:'अभियान', tabCreator:'क्रिएटर',
    tabPlatform:'प्लेटफ़ॉर्म', tabSegment:'सेगमेंट', tabRisk:'जोखिम बजट',
    periodDaily:'दैनिक', periodWeekly:'साप्ताहिक', periodMonthly:'मासिक', periodYearly:'वार्षिक', periodSeasonal:'मौसमी',
    unitDay:'दिन', unitWeek:'सप्ताह', unitMonth:'महीना', unitYear:'वर्ष', unitSeason:'मौसम',
    noData:'कोई डेटा उपलब्ध नहीं', connectData:'रीयल-टाइम डेटा के लिए चैनल कनेक्ट करें',
    tabGuide:'📖 गाइड',
    guideTitle:'Rollup गाइड', guideSubtitle:'चरण-दर-चरण निर्देश।',
    guideSteps:['अवधि चुनें — ऊपर दाईं ओर से दैनिक/साप्ताहिक/मासिक/वार्षिक/मौसमी एकत्रीकरण चुनें।','सारांश जांचें — मुख्य KPI (राजस्व, व्यय, ROAS, ऑर्डर) एक नज़र में देखें।','SKU विश्लेषण — प्रत्येक उत्पाद का राजस्व, ROAS और वापसी दर रुझान देखें। विवरण के लिए पंक्ति पर क्लिक करें।','अभियान तुलना — राजस्व/व्यय/ROAS/CPA के आधार पर विज्ञापन अभियानों की तुलना ट्रेंड चार्ट के साथ करें।','क्रिएटर ट्रैकिंग — इन्फ्लुएंसर/क्रिएटर का राजस्व, दृश्य और ROI विश्लेषण करें।','प्लेटफ़ॉर्म अवलोकन — सभी प्लेटफ़ॉर्म पर राजस्व हिस्सेदारी और प्रदर्शन की तुलना करें।','रेंज समायोजित करें — दाईं ओर ड्रॉपडाउन से विश्लेषण सीमा (7 दिन, 14 दिन, 30 दिन आदि) समायोजित करें।','मुद्रा बदलें — शीर्ष पर मुद्रा सेटिंग्स से अन्य मुद्रा में परिवर्तित डेटा देखें।','भाषा बदलें — भाषा सेटिंग बदलने पर सभी लेबल तुरंत अपडेट हो जाते हैं।','डेटा एकीकरण — रियल-टाइम अपडेट के लिए इंटीग्रेशन हब से चैनल कनेक्ट करें।'],
    guideFaq:[{q:'डेटा खाली क्यों है?',a:'आपके बिक्री या विज्ञापन चैनल कनेक्ट नहीं हो सकते, या चयनित अवधि में कोई डेटा नहीं है। इंटीग्रेशन हब की जाँच करें।'},{q:'ROAS क्यों नहीं दिखता?',a:'ROAS गणना के लिए विज्ञापन व्यय डेटा आवश्यक है। सुनिश्चित करें कि विज्ञापन चैनल सही ढंग से कनेक्ट है।'},{q:'डेटा कितनी बार अपडेट होता है?',a:'कनेक्टेड चैनल के आधार पर हर 5 मिनट से 1 घंटे में स्वचालित अपडेट।'},{q:'क्या कई प्लेटफ़ॉर्म की तुलना कर सकते हैं?',a:'हाँ, प्लेटफ़ॉर्म टैब सभी कनेक्टेड प्लेटफ़ॉर्म का राजस्व हिस्सा और ROAS दिखाता है।'},{q:'अवधि के अनुसार डेटा अलग क्यों है?',a:'दैनिक/साप्ताहिक/मासिक समेकन विधियाँ स्वाभाविक रूप से भिन्न होती हैं। निष्पक्ष तुलना के लिए समान इकाई का उपयोग करें।'}],
    guideTips:['12% से अधिक वापसी दर वाले उत्पाद SKU टैब में लाल रंग से चिह्नित होते हैं — तुरंत कारण की जाँच करें।','3.0x या अधिक का ROAS हरे रंग में, उससे कम लाल रंग में दिखता है — कुशल और अक्षम अभियानों की तुरंत पहचान।','त्रैमासिक पैटर्न और मौसमी बिक्री चक्रों की पहचान के लिए मौसमी समेकन का उपयोग करें।'],
    guideCautions:['डेमो/परीक्षण डेटा कभी भी उत्पादन प्रणाली में प्रवेश नहीं करता — दोनों वातावरण पूरी तरह अलग-थलग हैं।','नए कनेक्टेड चैनल जो अभी डेटा एकत्र कर रहे हैं, सिंक पूरा होने तक अस्थायी रूप से अपूर्ण आंकड़े दिखा सकते हैं।','वापसी दर केवल पुष्ट ऑर्डर के आधार पर गणना की जाती है — लंबित ऑर्डर सांख्यिकी में शामिल नहीं हैं।'],
    guideTabRef:'टैब विवरण', guideTabDesc:{summary:'मुख्य KPI का सारांश: कुल राजस्व, व्यय, ROAS, ऑर्डर ट्रेंड चार्ट के साथ।',sku:'प्रत्येक SKU का राजस्व, ROAS और वापसी दर विश्लेषण — छाँटने और फ़िल्टर करने योग्य।',campaign:'राजस्व, व्यय, CPA और रूपांतरण के आधार पर अभियानों की तुलना चार्ट के साथ।',creator:'इन्फ्लुएंसर/क्रिएटर का राजस्व, दृश्य और ROI ट्रैक करता है।',platform:'सभी कनेक्टेड प्लेटफ़ॉर्म का राजस्व हिस्सा और समग्र प्रदर्शन तुलना।'},
    faqTitle:'अक्सर पूछे जाने वाले प्रश्न', tipsTitle:'विशेषज्ञ सुझाव', cautionsTitle:'सावधानियाँ',
  },
};

// ── Helpers ─────────────────────────────────────────────
const getAuthToken = () => localStorage.getItem("genie_token") || localStorage.getItem("genie_auth_token") || '';
const API = async (path) => {
  try {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    if (path.includes('sku') || path.includes('campaign') || path.includes('creator') || path.includes('platform')) return { rows: [] };
    return { kpi: {}, by_platform: {}, top_skus: [], alerts: [] };
  }
};

const fmt = {
  num: (v) => v?.toLocaleString(undefined) ?? "-",
  pct: (v) => v == null ? "-" : v.toFixed(1) + "%",
  roas: (v) => v == null ? "-" : v.toFixed(2) + "x",
};

function useFmtC() {
  const { fmt: cFmt, symbol, rate } = useCurrency();
  return useMemo(() => ({
    c: (v) => v == null ? '-' : cFmt(v),
    num: fmt.num, pct: fmt.pct, roas: fmt.roas, symbol: symbol || '', rate,
  }), [cFmt, symbol, rate]);
}

const PLAT_CLR = { Meta:"#1877F2", Google:"#EA4335", TikTok:"#000", Naver:"#03C75A", Coupang:"#E51937", YouTube:"#FF0000", Instagram:"#C13584" };
const pcol = (p) => PLAT_CLR[p] ?? "#888";

// ── Enterprise Arctic White Style System — Zero CSS Variable Dependencies ──
const S = {
  card: { background:'rgba(255,255,255,0.95)', borderRadius:14, padding:'20px 22px', border:'1px solid rgba(99,140,255,0.12)' },
  label: { fontSize:11, color:'#64748b', marginBottom:4, fontWeight:700, letterSpacing:'0.3px', textTransform:'uppercase' },
  value: { fontSize:22, fontWeight:800, color:'#1e293b' },
  subText: { fontSize:11, color:'#94a3b8', marginTop:2 },
  thCell: { padding:'6px 8px', textAlign:'right', color:'#64748b', fontWeight:700, fontSize:11, whiteSpace:'nowrap', letterSpacing:'0.3px', textTransform:'uppercase' },
  tdCell: { padding:'8px', fontSize:13, color:'#1e293b' },
  rowBorder: { borderBottom:'1px solid #e2e8f0' },
  sectionTitle: { fontWeight:800, fontSize:14, marginBottom:14, color:'#1e293b' },
  barBg: { background:'#e2e8f0' },
  chip: { background:'rgba(241,245,249,0.9)', borderRadius:8, padding:'4px 12px', fontSize:12 },
};

// ── UI Components ────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ ...S.card, borderLeft:`4px solid ${color??"#6366f1"}`, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={S.label}>{label}</div>
      <div style={S.value}>{value}</div>
      {sub && <div style={S.subText}>{sub}</div>}
    </div>
  );
}

function Sparkline({ data, field="revenue", color="#6366f1" }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d[field] ?? 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W=80, H=30;
  const pts = vals.map((v,i) => `${(i/(vals.length-1))*W},${H-((v-min)/range)*H}`);
  const trend = vals[vals.length-1] - vals[0];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} style={{ overflow:"visible" }}>
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
      <span style={{ fontSize:10, color:trend>=0?"#22c55e":"#ef4444" }}>{trend>=0?"▲":"▼"}</span>
    </span>
  );
}

function MiniBar({ data, key1="revenue" }) {
  const max = Math.max(...data.map(d => d[key1]??0));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:1, height:40, width:"100%" }}>
      {data.slice(-28).map((d,i) => {
        const h = max > 0 ? ((d[key1]??0)/max)*38 : 2;
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%" }}>
            <div style={{ width:"100%", background:"#4f8ef7", borderRadius:2, height:h, opacity:0.85 }} title={`${d.date}: ${d[key1]?.toLocaleString() ?? '-'}`} />
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ txt }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, borderRadius:16, ...S.card, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
        <div style={{ fontSize:16, fontWeight:800, color:'#1e293b', marginBottom:8 }}>{txt('noData')}</div>
        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7 }}>{txt('connectData')}</div>
      </div>
    </div>
  );
}

// ── Tab: Summary ─────────────────────────────────────────
function SummaryTab({ period, n, txt, fc }) {
  const [data, setData] = useState(null);
  useEffect(() => { API(`/api/v423/rollup/summary?period=${period}&n=${n}`).then(setData).catch(()=>{}); }, [period, n]);
  if (!data) return <div style={{ color:'#64748b', padding:32 }}>{txt('loading')}</div>;

  const kpi = data.kpi ?? {};
  const byPlatform = data.by_platform ?? {};
  const maxRev = Math.max(...Object.values(byPlatform), 1);
  const hasData = kpi.total_revenue > 0 || Object.keys(byPlatform).length > 0;
  if (!hasData) return <EmptyState txt={txt} />;

  return (
    <div style={{ display:"grid", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 }}>
        <KpiCard label={txt('totalRevenue')} value={fc.c(kpi.total_revenue)} color="#4f8ef7" />
        <KpiCard label={txt('totalSpend')} value={fc.c(kpi.total_spend)} color="#ef4444" />
        <KpiCard label={txt('totalOrders')} value={fc.num(kpi.total_orders)} color="#f59e0b" />
        <KpiCard label={txt('avgRoas')} value={fc.roas(kpi.avg_roas)} color="#22c55e" />
        <KpiCard label={txt('revenuePerOrder')} value={fc.c(kpi.revenue_per_order)} color="#06b6d4" />
      </div>
      <div style={S.card}>
        <div style={S.sectionTitle}>🛡️ {txt('platformRevenue')}</div>
        {Object.entries(byPlatform).sort((a,b)=>b[1]-a[1]).map(([pf,rev])=>(
          <div key={pf} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:80, fontSize:12, color:pcol(pf), fontWeight:700 }}>{pf}</div>
            <div style={{ flex:1, ...S.barBg, borderRadius:4, height:22, overflow:"hidden" }}>
              <div style={{ width:`${maxRev>0?rev/maxRev*100:0}%`, height:"100%", background:pcol(pf), borderRadius:4, transition:"width 0.5s" }} />
            </div>
            <div style={{ width:110, textAlign:"right", fontSize:13, fontWeight:700, color: '#1e293b' }}>{fc.c(rev)}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:16 }}>
        <div style={S.card}>
          <div style={S.sectionTitle}>{txt('topSku')}</div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={S.rowBorder}>
              {["SKU", txt('colProduct'), txt('colRevenue'), txt('colOrders'), "ROAS", txt('colReturnRate')].map(h => (
                <th key={h} style={S.thCell}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(data.top_skus ?? []).map(s => (
                <tr key={s.sku_id} style={S.rowBorder}>
                  <td style={{ ...S.tdCell, fontFamily:"monospace", fontSize:12 }}>{s.sku_id}</td>
                  <td style={S.tdCell}>{s.name}</td>
                  <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.c(s.revenue)}</td>
                  <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.num(s.orders)}</td>
                  <td style={{ ...S.tdCell, textAlign:"right", color:(s.roas??0)>=3?"#22c55e":"#ef4444" }}>{fc.roas(s.roas)}</td>
                  <td style={{ ...S.tdCell, textAlign:"right", color:(s.return_rate??0)>12?"#ef4444":"#22c55e" }}>{fc.pct(s.return_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>🔔 {txt('alerts')}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(data.alerts ?? []).map((a,i) => (
              <span key={i} style={{ background:"rgba(79,142,247,0.08)", color:"#4f8ef7", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, border:'1px solid rgba(79,142,247,0.18)' }}>{a?.msg ?? a}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: SKU ─────────────────────────────────────────────
function SkuTab({ period, n, txt, fc }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    API(`/api/v423/rollup/sku?period=${period}&n=${n}`).then(d => { setData(d); if(d.rows?.[0]) setSelected(d.rows[0].sku_id); }).catch(()=>{});
  }, [period, n]);
  if (!data) return <div style={{ color:'#64748b', padding:32 }}>{txt('loading')}</div>;
  if (!data.rows?.length) return <EmptyState txt={txt} />;
  const selRow = data.rows?.find(r => r.sku_id === selected);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <div style={{ ...S.card, overflowX:"auto" }}>
        <div style={S.sectionTitle}>{txt('skuAgg')}</div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={S.rowBorder}>
            {["SKU", txt('colProduct'), txt('colTotalRevenue'), "ROAS", txt('colReturnRate'), txt('colTrend')].map(h => (
              <th key={h} style={S.thCell}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(data.rows ?? []).map(r => (
              <tr key={r.sku_id} onClick={()=>setSelected(r.sku_id)}
                style={{ ...S.rowBorder, cursor:"pointer", background:selected===r.sku_id?"rgba(79,142,247,0.06)":"transparent", transition:'background 150ms' }}>
                <td style={{ ...S.tdCell, fontFamily:"monospace", fontSize:12 }}>{r.sku_id}</td>
                <td style={{ ...S.tdCell, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</td>
                <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.c(r.total_revenue)}</td>
                <td style={{ ...S.tdCell, textAlign:"right", color:r.avg_roas>=3?"#22c55e":"#ef4444" }}>{fc.roas(r.avg_roas)}</td>
                <td style={{ ...S.tdCell, textAlign:"right", color:r.avg_return_rate>12?"#ef4444":"#22c55e" }}>{fc.pct(r.avg_return_rate)}</td>
                <td style={{ ...S.tdCell, textAlign:"right" }}><Sparkline data={r.series} field="revenue" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selRow && (
        <div style={S.card}>
          <div style={S.sectionTitle}>{selRow.sku_id} — {selRow.name}</div>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {[[txt('colPlatform'),selRow.platform],[txt('unitPrice'),fc.c(selRow.unit_price)],["ROAS",fc.roas(selRow.avg_roas)],[txt('colReturnRate'),fc.pct(selRow.avg_return_rate)]].map(([k,v])=>(
              <span key={k} style={S.chip}>
                <span style={{ color: '#374151', fontWeight:700 }} >{k}: </span><span>{v}</span>
              </span>
            ))}
          </div>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:6, color:'#64748b' }}>{txt('revTrend')}</div>
          <MiniBar data={selRow.series || []} key1="revenue" />
          <div style={{ fontWeight:700, fontSize:12, margin:"14px 0 6px", color:'#64748b' }}>{txt('roasTrend')}</div>
          <MiniBar data={(selRow.series||[]).map(s=>({...s,revenue:s.roas*1000000}))} key1="revenue" />
          <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{txt('roasScale')}</div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Campaign ────────────────────────────────────────
function CampaignTab({ period, n, txt, fc }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    API(`/api/v423/rollup/campaign?period=${period}&n=${n}`).then(d => { setData(d); if(d.rows?.[0]) setSelected(d.rows[0].campaign_id); }).catch(()=>{});
  }, [period, n]);
  if (!data) return <div style={{ color:'#64748b', padding:32 }}>{txt('loading')}</div>;
  if (!data.rows?.length) return <EmptyState txt={txt} />;
  const selRow = data.rows?.find(r => r.campaign_id === selected);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <div style={{ ...S.card, overflowX:"auto" }}>
        <div style={S.sectionTitle}>{txt('campaignAgg')}</div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={S.rowBorder}>
            {[txt('colCampaign'),txt('colPlatform'),txt('colTotalRevenue'),txt('colTotalSpend'),"ROAS",txt('colCpa'),txt('colTrend')].map(h=>(
              <th key={h} style={S.thCell}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(data.rows??[]).map(r=>(
              <tr key={r.campaign_id} onClick={()=>setSelected(r.campaign_id)}
                style={{ ...S.rowBorder, cursor:"pointer", background:selected===r.campaign_id?"rgba(79,142,247,0.06)":"transparent", transition:'background 150ms' }}>
                <td style={{ ...S.tdCell, maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</td>
                <td style={{ ...S.tdCell, color:pcol(r.platform), fontWeight:700 }}>{r.platform}</td>
                <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.c(r.total_revenue)}</td>
                <td style={{ ...S.tdCell, textAlign:"right", color:"#ef4444" }}>{fc.c(r.total_spend)}</td>
                <td style={{ ...S.tdCell, textAlign:"right", color:r.avg_roas>=3?"#22c55e":"#ef4444" }}>{fc.roas(r.avg_roas)}</td>
                <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.c(r.avg_cpa)}</td>
                <td style={{ ...S.tdCell, textAlign:"right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selRow && (
        <div style={S.card}>
          <div style={S.sectionTitle}>{selRow.name}</div>
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
            {[[txt('colPlatform'),selRow.platform],["ROAS",fc.roas(selRow.avg_roas)],["CPA",fc.c(selRow.avg_cpa)],[txt('colConversions'),fc.num(selRow.total_conversions)]].map(([k,v])=>(
              <span key={k} style={S.chip}>
                <span style={{ color: '#374151', fontWeight:700 }} >{k}: </span><span>{v}</span>
              </span>
            ))}
          </div>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:6, color:'#64748b' }}>{txt('revenueVsSpend')}</div>
          <MiniBar data={selRow.series||[]} key1="revenue" />
        </div>
      )}
    </div>
  );
}

// ── Tab: Creator ─────────────────────────────────────────
function CreatorTab({ period, n, txt, fc }) {
  const [data, setData] = useState(null);
  useEffect(() => { API(`/api/v423/rollup/creator?period=${period}&n=${n}`).then(setData).catch(()=>{}); }, [period, n]);
  if (!data) return <div style={{ color:'#64748b', padding:32 }}>{txt('loading')}</div>;
  if (!data.rows?.length) return <EmptyState txt={txt} />;
  return (
    <div style={{ ...S.card, overflowX:"auto" }}>
      <div style={S.sectionTitle}>{txt('creatorAgg')}</div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr style={S.rowBorder}>
          {[txt('colHandle'),txt('colTier'),txt('colFollowers'),txt('colRevenue'),txt('colViews'),"ROI",txt('colTrend')].map(h=>(
            <th key={h} style={S.thCell}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {(data.rows??[]).map(r=>(
            <tr key={r.handle} style={S.rowBorder}>
              <td style={{ ...S.tdCell, fontWeight:700 }}>@{r.handle}</td>
              <td style={S.tdCell}>{r.tier}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.num(r.followers)}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.c(r.total_revenue)}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.num(r.total_views)}</td>
              <td style={{ ...S.tdCell, textAlign:"right", color:r.roi>=3?"#22c55e":"#ef4444" }}>{fc.roas(r.roi)}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}><Sparkline data={r.series} field="revenue" color="#a855f7" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Platform ────────────────────────────────────────
function PlatformTab({ period, n, txt, fc }) {
  const [data, setData] = useState(null);
  useEffect(() => { API(`/api/v423/rollup/platform?period=${period}&n=${n}`).then(setData).catch(()=>{}); }, [period, n]);
  if (!data) return <div style={{ color:'#64748b', padding:32 }}>{txt('loading')}</div>;
  if (!data.rows?.length) return <EmptyState txt={txt} />;
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>{txt('platformAgg')}</div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr style={S.rowBorder}>
          {[txt('colPlatform'),txt('colTotalRevenue'),txt('colTotalSpend'),"ROAS",txt('colShare'),txt('colTrend')].map(h=>(
            <th key={h} style={S.thCell}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {(data.rows??[]).map(r=>(
            <tr key={r.platform} style={S.rowBorder}>
              <td style={{ ...S.tdCell, color:pcol(r.platform), fontWeight:700 }}>{r.platform}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.c(r.total_revenue)}</td>
              <td style={{ ...S.tdCell, textAlign:"right", color:"#ef4444" }}>{fc.c(r.total_spend)}</td>
              <td style={{ ...S.tdCell, textAlign:"right", color:r.avg_roas>=3?"#22c55e":"#ef4444" }}>{fc.roas(r.avg_roas)}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}>{fc.pct(r.share)}</td>
              <td style={{ ...S.tdCell, textAlign:"right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Guide (Enterprise) ──────────────────────────────
function GuideTab({ txt }) {
  const loc = LOC[txt._lang] ?? LOC.en;
  const steps = loc.guideSteps ?? LOC.en.guideSteps;
  const faq = loc.guideFaq ?? LOC.en.guideFaq;
  const tips = loc.guideTips ?? LOC.en.guideTips;
  const cautions = loc.guideCautions ?? LOC.en.guideCautions;
  const tabDesc = loc.guideTabDesc ?? LOC.en.guideTabDesc;

  return (
    <div style={{ display:'grid', gap:20 }}>
      {/* Header */}
      <div style={S.card}>
        <div style={{ fontSize:22, fontWeight:900, marginBottom:6, color:'#1e293b' }}>📖 {txt('guideTitle')}</div>
        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7 }}>{txt('guideSubtitle')}</div>
      </div>

      {/* Steps */}
      <div style={{ display:'grid', gap:10 }}>
        {steps.map((s,i) => (
          <div key={i} style={{ display:'flex', gap:14, padding:'16px 18px', borderRadius:14, ...S.card }}>
            <div data-step-badge="true" style={{ width:36, height:36, borderRadius:12, backgroundColor:'#4f8ef7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:'0 2px 8px rgba(79,142,247,0.4)' }}>{i+1}</div>
            <div style={{ fontSize:13, color:'#1e293b', lineHeight:1.7, fontWeight:500, alignSelf:'center' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Tab Reference */}
      <div style={S.card}>
        <div style={S.sectionTitle}>📋 {txt('guideTabRef') || loc.guideTabRef}</div>
        <div style={{ display:'grid', gap:8 }}>
          {Object.entries(tabDesc).map(([k,v]) => (
            <div key={k} style={{ display:'flex', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(241,245,249,0.9)' }}>
              <span style={{ fontWeight:800, color:'#4f8ef7', fontSize:13, minWidth:90, textTransform:'capitalize' }}>{k}</span>
              <span style={{ fontSize:13, color:'#475569' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expert Tips */}
      <div style={S.card}>
        <div style={S.sectionTitle}>💡 {txt('tipsTitle') || loc.tipsTitle}</div>
        <div style={{ display:'grid', gap:8 }}>
          {tips.map((t,i) => (
            <div key={i} style={{ padding:'12px 16px', borderRadius:10, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)', fontSize:13, color:'#1e293b', lineHeight:1.6 }}>
              <span style={{ color:'#22c55e', fontWeight:800 }}>TIP {i+1}: </span>{t}
            </div>
          ))}
        </div>
      </div>

      {/* Cautions */}
      <div style={S.card}>
        <div style={S.sectionTitle}>⚠️ {txt('cautionsTitle') || loc.cautionsTitle}</div>
        <div style={{ display:'grid', gap:8 }}>
          {cautions.map((c,i) => (
            <div key={i} style={{ padding:'12px 16px', borderRadius:10, background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', fontSize:13, color:'#1e293b', lineHeight:1.6 }}>
              <span style={{ color:'#f97316', fontWeight:800 }}>⚠ </span>{c}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={S.card}>
        <div style={S.sectionTitle}>❓ {txt('faqTitle') || loc.faqTitle}</div>
        <div style={{ display:'grid', gap:12 }}>
          {faq.map((f,i) => (
            <div key={i} style={{ padding:'14px 16px', borderRadius:12, background:'rgba(248,250,252,0.95)', border:'1px solid #e2e8f0' }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:6 }}>Q{i+1}. {f.q}</div>
              <div style={{ fontSize:13, color:'#475569', lineHeight:1.6, paddingLeft:4 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════════════════
export default function RollupDashboard() {
  const { t, lang: ctxLang } = useI18n();
  const lang = ctxLang || 'ko';
  const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
  txt._lang = lang;

  const { addAlert, isDemo } = useGlobalData();
  const fc = useFmtC();

  const [tab, setTab] = useState("summary");
  const TABS = [
    { id:"summary", label:`📊 ${txt("tabSummary")}` },
    { id:"sku", label:"📦 SKU" },
    { id:"campaign", label:`📣 ${txt("tabCampaign")}` },
    { id:"creator", label:`🎬 ${txt("tabCreator")}` },
    { id:"platform", label:`🌐 ${txt("tabPlatform")}` },
    { id:"guide", label:txt("tabGuide")||'📖 Guide' },
  ];
  const [period, setPeriod] = useState("daily");
  const [n, setN] = useState(14);

  const isRTL = lang === 'ar';

  // ── Scroll isolation: Dashboard manages its own vertical scroll ──
  // The parent in App.jsx has overflowY:'auto'. We must suppress it so
  // that our internal scroll container (the content div below sub-tabs) is
  // the one that scrolls, making position:sticky work on the sub-tab bar.
  useEffect(() => {
    // Find the App layout scroll container
    const appContent = document.querySelector('.app-content-area');
    const parent = appContent?.parentElement;
    if (parent) {
      const prevOF = parent.style.overflowY;
      parent.style.overflowY = 'hidden';
      return () => { parent.style.overflowY = prevOF; };
    }
  }, []);

  const TAB_COLORS = {
    summary: '#4f8ef7',
    sku: '#f59e0b',
    campaign: '#ec4899',
    creator: '#a855f7',
    platform: '#22c55e',
    guide: '#6366f1',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', color:'#1e293b', direction: isRTL ? 'rtl' : 'ltr', height: 'calc(100vh - 54px)', /* topbar ~54px */
      overflow: 'hidden', /* prevent this wrapper itself from scrolling */
      background:'#f5f7fa' }}>
      {/* ═══ TITLE CONTAINER BOX (scrolls with content) ═══ */}
      {/* ═══ SUB-TAB MENU (sticky-fixed, never scrolls away) ═══ */}
      {/* ═══ CONTENT BOX (scrolls beneath sub-tab boundary) ═══ */}

      {/* ── Sticky wrapper: sub-tab stays fixed, title scrolls ── */}
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, background:'#f5f7fa' }}>
        {/* ── Sub-Tab Navigation (always visible, never covered) ── */}
        <div className="sub-tab-nav" style={{ padding: '8px 16px', background:'#f5f7fa', borderBottom: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background:'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: 12, padding: '6px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {TABS.map(tb => {
              const isActive = tab === tb.id;
              const clr = TAB_COLORS[tb.id] || '#6366f1';
              return (
                <button key={tb.id} onClick={() => setTab(tb.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                    background: isActive ? clr : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-2, #475569)',
                    boxShadow: isActive ? `0 3px 16px ${clr}45` : 'none',
                    transform: isActive ? 'translateY(-1px)' : 'none' }}>
                  {tb.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ SCROLLABLE CONTENT (scrolls beneath sub-tab) ═══ */}
      <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0' }}>
        {/* ── Hero: Title (left) + Period Selector (right) ── */}
        <div className="hero" style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e2e8f0', background:'rgba(255,255,255,0.95)', margin: '0 0 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Left: Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `linear-gradient(135deg, ${TAB_COLORS[tab]}44, ${TAB_COLORS[tab]}18)`,
                border: `1px solid ${TAB_COLORS[tab]}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                flexShrink: 0 }}>📈</div>
              <div style={{ minWidth: 0 }}>
                <div className="hero-title" style={{ fontSize: 20, fontWeight: 900, color: TAB_COLORS[tab], letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                  {txt('title')}
                </div>
                <div className="hero-desc" style={{ fontSize: 11, color:'#64748b', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {txt('subtitle')}
                </div>
              </div>
            </div>

            {/* Right: Period Selector */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ display: 'flex', background:'rgba(241,245,249,0.9)', border: '1px solid #e2e8f0', borderRadius: 10, padding: 3 }}>
                {[["daily",txt('periodDaily')],["weekly",txt('periodWeekly')],["monthly",txt('periodMonthly')],["yearly",txt('periodYearly')],["seasonal",txt('periodSeasonal')]].map(([val,lbl])=>(
                  <button key={val} onClick={()=>{setPeriod(val);setN(val==="daily"?14:val==="weekly"?8:val==="monthly"?6:val==="yearly"?3:4); }} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all 0.2s', background: period===val ? '#4f8ef7' : 'transparent', color: period===val ? '#fff' : 'var(--text-2, #475569)', boxShadow: period===val ? '0 2px 10px rgba(79,142,247,0.35)' : 'none' }}>
                    {lbl}
                  </button>
                ))}
              </div>
              <select value={n} onChange={e=>setN(Number(e.target.value))}
                style={{ background:'rgba(241,245,249,0.9)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', color:'#1e293b', fontSize: 11 }}>
                {period==="daily"?[7,14,30,60].map(v=><option key={v} value={v}>{v}{txt('unitDay')}</option>)
                :period==="weekly"?[4,8,12,24].map(v=><option key={v} value={v}>{v}{txt('unitWeek')}</option>)
                :period==="monthly"?[3,6,12,24].map(v=><option key={v} value={v}>{v}{txt('unitMonth')}</option>)
                :period==="yearly"?[2,3,5].map(v=><option key={v} value={v}>{v}{txt('unitYear')}</option>)
                :[4,6,8].map(v=><option key={v} value={v}>{v}{txt('unitSeason')}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Content panels ── */}
        <div style={{ padding: '16px 14px 28px' }}>
          {tab==="summary" && <SummaryTab period={period} n={n} txt={txt} fc={fc} />}
          {tab==="sku" && <SkuTab period={period} n={n} txt={txt} fc={fc} />}
          {tab==="campaign" && <CampaignTab period={period} n={n} txt={txt} fc={fc} />}
          {tab==="creator" && <CreatorTab period={period} n={n} txt={txt} fc={fc} />}
          {tab==="platform" && <PlatformTab period={period} n={n} txt={txt} fc={fc} />}
          {tab==="guide" && <GuideTab txt={txt} />}
        </div>
      </div>
    </div>
  );
}
