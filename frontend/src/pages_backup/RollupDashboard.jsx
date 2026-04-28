import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';

// ══════════════════════════════════════════════════════════════════════
//  📈 RollupDashboard — Enterprise i18n (9 Languages) + Zero Mock Data
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
    periodDaily:'일별', periodWeekly:'주별', periodMonthly:'월별',
    periodYearly:'연간', periodSeasonal:'시즌별',
    unitDay:'일', unitWeek:'주', unitMonth:'개월', unitYear:'년', unitSeason:'시즌',
    segGroups:['오디언스','카테고리','크리에이티브'], sortHint:'컬럼 클릭 정렬',
    segRoasChart:'세그먼트별 ROAS 히트맵', segDetail:'세그먼트 상세',
    highEff:'고효율 세그먼트 (ROAS ≥ 4x)', lowEff:'저효율 세그먼트 (ROAS < 2.5x)',
    none:'해당 없음', allNormal:'모두 정상 범위', wasteEst:'손실 추정', grossMarginLabel:'매출총이익률',
    riskLossEst:'리스크 손실 추정', settleDeductSum:'정산 공제 합계', returnLossSum:'반품 손실 합계', grossProfitTotal:'매출총이익 합계',
    campaignPnlRisk:'캠페인 P&L 리스크', settleDeductWord:'정산공제', returnRateWord:'반품율',
    lossEstWarning:'₩{amount}M 손실 추정',
    pnlStructure:'P&L 구조', pnlDesc:'매출에서 비용을 차감한 순이익 구조',
    pnlTotalRev:'총 매출', pnlSettle:'정산 공제', pnlNetRev:'순 매출', pnlCogs:'매출원가',
    pnlReturnLoss:'반품 손실', pnlAdSpend:'광고비', pnlFxLoss:'환차손', pnlGrossProfit:'매출총이익',
    riskWarn:'⚠ 리스크 경고', budgetRemaining:'남은 예산', settlePct:'정산공제율',
    returnPct:'반품율', cogsPct:'매출원가율',
    riskStatus:{ danger:'위험', caution:'주의', normal:'정상' },
    noSegData:'세그먼트 데이터가 없습니다', noRiskData:'리스크 데이터가 없습니다',
    connectSegment:'세그먼트 데이터를 연동하면 분석이 표시됩니다', connectRisk:'캠페인 데이터를 연동하면 P&L 분석이 표시됩니다',
    tabGuide:'📖 이용 가이드',
    guideTitle:'통합현황 이용 가이드', guideSubtitle:'SKU · 캠페인 · 크리에이터 · 플랫폼별 집계 데이터를 분석하는 방법을 안내합니다.',
    guideStepsTitle:'통합현황 시작 6단계',
    guideStep1Title:'기간 선택하기', guideStep1Desc:'우측 상단에서 일별/주별/월별/연간/시즌별 집계 기간을 선택합니다.',
    guideStep2Title:'요약 탭 확인', guideStep2Desc:'총 매출, 광고비, 주문수, ROAS 등 핵심 KPI를 한눈에 확인합니다.',
    guideStep3Title:'SKU 분석', guideStep3Desc:'SKU 탭에서 상품별 매출, 반품률, ROAS 추이를 확인합니다.',
    guideStep4Title:'캠페인 비교', guideStep4Desc:'캠페인 탭에서 광고 성과를 비교하고 CPA, 전환율을 분석합니다.',
    guideStep5Title:'크리에이터 추적', guideStep5Desc:'크리에이터 탭에서 인플루언서별 ROI와 조회수 대비 매출을 분석합니다.',
    guideStep6Title:'리스크 예산 관리', guideStep6Desc:'리스크 예산 탭에서 P&L 구조, 정산공제, 반품 손실을 모니터링합니다.',
    guideTabsTitle:'탭별 상세 안내',
    guideTabSummary:'총 매출, 총 광고비, 총 주문수, 평균 ROAS 등 핵심 KPI와 플랫폼별 매출, Top SKU를 한눈에 확인합니다.',
    guideTabSku:'SKU별 매출, ROAS, 반품률 추이를 분석합니다. 클릭하면 상세 시계열 데이터를 확인할 수 있습니다.',
    guideTabCampaign:'캠페인별 매출, 광고비, ROAS, CPA를 비교합니다. 노출수, 클릭수, 전환수 추이도 확인 가능합니다.',
    guideTabCreator:'크리에이터의 팔로워, 매출, ROI를 비교합니다. 조회수 대비 매출 효율을 분석합니다.',
    guideTabPlatform:'Meta, Google, TikTok, Naver 등 플랫폼별 매출 점유율과 ROAS를 비교합니다.',
    guideTabSegment:'오디언스, 카테고리, 크리에이티브별 세그먼트 ROAS를 히트맵으로 분석합니다.',
    guideTabRisk:'캠페인 P&L 리스크를 모니터링합니다. 정산공제, 반품 손실, 매출원가를 포함한 손익 구조를 확인합니다.',
    guideTipsTitle:'유용한 팁',
    guideTip1:'요약 탭에서 전체 현황을 파악한 후 세부 탭으로 이동하세요.',
    guideTip2:'기간을 변경하면 모든 탭의 데이터가 자동으로 갱신됩니다.',
    guideTip3:'컬럼을 클릭하면 정렬할 수 있습니다.',
    guideTip4:'SKU 테이블에서 행을 클릭하면 우측에 상세 차트가 표시됩니다.',
    guideTip5:'리스크 탭의 P&L 구조에서 각 비용 항목의 비율을 확인하세요.',
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
    segGroups:['オーディエンス','カテゴリ','クリエイティブ'], sortHint:'列クリックで並替',
    segRoasChart:'セグメント別ROASヒートマップ', segDetail:'セグメント詳細',
    highEff:'高効率セグメント (ROAS ≥ 4x)', lowEff:'低効率セグメント (ROAS < 2.5x)',
    none:'該当なし', allNormal:'すべて正常', wasteEst:'損失推定', grossMarginLabel:'粗利率',
    riskLossEst:'リスク損失推定', settleDeductSum:'精算控除合計', returnLossSum:'返品損失合計', grossProfitTotal:'粗利合計',
    campaignPnlRisk:'キャンペーンP&Lリスク', settleDeductWord:'精算控除', returnRateWord:'返品率',
    lossEstWarning:'₩{amount}M 損失推定',
    pnlStructure:'P&L構造', pnlDesc:'売上からコストを差し引いた純利益構造',
    pnlTotalRev:'総売上', pnlSettle:'精算控除', pnlNetRev:'純売上', pnlCogs:'売上原価',
    pnlReturnLoss:'返品損失', pnlAdSpend:'広告費', pnlFxLoss:'為替差損', pnlGrossProfit:'粗利益',
    riskWarn:'⚠ リスク警告', budgetRemaining:'残り予算', settlePct:'精算控除率', returnPct:'返品率', cogsPct:'原価率',
    riskStatus:{ danger:'危険', caution:'注意', normal:'正常' },
    noSegData:'セグメントデータがありません', noRiskData:'リスクデータがありません',
    connectSegment:'セグメントデータを連動すると分析が表示されます', connectRisk:'キャンペーンデータを連動するとP&L分析が表示されます',
    tabGuide:'📖 ガイド',
    guideTitle:'統合現況ガイド', guideSubtitle:'SKU・キャンペーン・クリエイター・プラットフォーム別集計データの分析方法をご案内します。',
    guideStepsTitle:'統合現況開始6ステップ',
    guideStep1Title:'期間選択', guideStep1Desc:'右上から日次/週次/月次/年次/季節別の集計期間を選択します。',
    guideStep2Title:'サマリー確認', guideStep2Desc:'総売上、広告費、注文数、ROASなどの主要KPIを一目で確認します。',
    guideStep3Title:'SKU分析', guideStep3Desc:'SKUタブで商品別の売上、返品率、ROASトレンドを確認します。',
    guideStep4Title:'キャンペーン比較', guideStep4Desc:'キャンペーンタブで広告成果を比較しCPA、CVRを分析します。',
    guideStep5Title:'クリエイター追跡', guideStep5Desc:'クリエイタータブでインフルエンサー別ROIとビュー対売上を分析します。',
    guideStep6Title:'リスク予算管理', guideStep6Desc:'リスク予算タブでP&L構造、精算控除、返品損失を監視します。',
    guideTabsTitle:'タブ別ガイド',
    guideTabSummary:'総売上、広告費、注文数、ROAS等のKPIとプラットフォーム別売上を確認。',
    guideTabSku:'SKU別売上、ROAS、返品率トレンドを分析。行クリックで詳細データ表示。',
    guideTabCampaign:'キャンペーン別売上、広告費、ROAS、CPAを比較。',
    guideTabCreator:'クリエイターのフォロワー、売上、ROIを比較。',
    guideTabPlatform:'プラットフォーム別売上シェアとROASを比較。',
    guideTabSegment:'セグメント別ROASヒートマップを分析。',
    guideTabRisk:'キャンペーンP&Lリスクを監視。精算控除、返品損失を含む損益構造を確認。',
    guideTipsTitle:'役立つヒント',
    guideTip1:'まずサマリータブで全体を把握してから詳細タブへ。',guideTip2:'期間変更で全タブのデータが自動更新されます。',guideTip3:'列クリックでソートできます。',guideTip4:'SKUの行をクリックすると右側に詳細チャートが表示されます。',guideTip5:'リスクタブのP&L構造で各コスト比率を確認しましょう。',
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
    segGroups:['Audience','Category','Creative'], sortHint:'Click column to sort',
    segRoasChart:'Segment ROAS Heatmap', segDetail:'Segment Detail',
    highEff:'High Efficiency (ROAS ≥ 4x)', lowEff:'Low Efficiency (ROAS < 2.5x)',
    none:'None', allNormal:'All normal', wasteEst:'est. waste', grossMarginLabel:'Gross Margin',
    riskLossEst:'Risk Loss Est.', settleDeductSum:'Settlement Ded.', returnLossSum:'Return Loss', grossProfitTotal:'Gross Profit',
    campaignPnlRisk:'Campaign P&L Risk', settleDeductWord:'Settle', returnRateWord:'Return',
    lossEstWarning:'₩{amount}M loss est.',
    pnlStructure:'P&L Structure', pnlDesc:'Net profit after costs', pnlTotalRev:'Revenue', pnlSettle:'Settle Ded.',
    pnlNetRev:'Net Revenue', pnlCogs:'COGS', pnlReturnLoss:'Return Loss', pnlAdSpend:'Ad Spend',
    pnlFxLoss:'FX Loss', pnlGrossProfit:'Gross Profit', riskWarn:'⚠ Risk Warning',
    budgetRemaining:'Budget Left', settlePct:'Settle %', returnPct:'Return %', cogsPct:'COGS %',
    riskStatus:{ danger:'Danger', caution:'Caution', normal:'Normal' },
    noSegData:'No segment data', noRiskData:'No risk data',
    connectSegment:'Connect segment data to see analysis', connectRisk:'Connect campaign data to see P&L analysis',
    tabGuide:'📖 Guide',
    guideTitle:'Rollup Dashboard Guide', guideSubtitle:'Learn how to analyze aggregated data by SKU, Campaign, Creator, and Platform.',
    guideStepsTitle:'6 Steps to Get Started',
    guideStep1Title:'Select Period', guideStep1Desc:'Choose Daily/Weekly/Monthly/Annual/Seasonal from the top-right controls.',
    guideStep2Title:'Check Summary', guideStep2Desc:'View total revenue, ad spend, orders, and ROAS at a glance.',
    guideStep3Title:'Analyze SKUs', guideStep3Desc:'Check revenue, return rates, and ROAS trends per product in the SKU tab.',
    guideStep4Title:'Compare Campaigns', guideStep4Desc:'Compare ad performance, CPA, and conversion rates in the Campaign tab.',
    guideStep5Title:'Track Creators', guideStep5Desc:'Analyze influencer ROI and views-to-revenue ratio in the Creator tab.',
    guideStep6Title:'Manage Risk Budget', guideStep6Desc:'Monitor P&L structure, settlement deductions, and return losses in the Risk tab.',
    guideTabsTitle:'Tab-by-Tab Guide',
    guideTabSummary:'View integrated KPIs: total revenue, ad spend, orders, ROAS, and platform revenue breakdown.',
    guideTabSku:'Analyze SKU-level revenue, ROAS, and return rate trends. Click a row for detailed time-series data.',
    guideTabCampaign:'Compare campaigns by revenue, spend, ROAS, and CPA with detailed impression/click/conversion data.',
    guideTabCreator:'Compare creator followers, revenue, and ROI. Analyze views-to-revenue efficiency.',
    guideTabPlatform:'Compare revenue share and ROAS across Meta, Google, TikTok, Naver, and more.',
    guideTabSegment:'Analyze segment ROAS heatmaps across audience, category, and creative segments.',
    guideTabRisk:'Monitor campaign P&L risk including settlement deductions, return losses, and COGS.',
    guideTipsTitle:'Useful Tips',
    guideTip1:'Start with the Summary tab for a quick overview before diving into details.',
    guideTip2:'Changing the period automatically refreshes all tab data.',
    guideTip3:'Click column headers to sort table data.',
    guideTip4:'Click a row in SKU/Campaign/Creator tables to see detailed charts on the right.',
    guideTip5:'Check the P&L structure in the Risk tab to see cost ratios at a glance.',
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
    segGroups:['受众','类别','创意'], sortHint:'点击列排序',
    segRoasChart:'细分ROAS热力图', segDetail:'细分详情',
    highEff:'高效率细分 (ROAS ≥ 4x)', lowEff:'低效率细分 (ROAS < 2.5x)',
    none:'无', allNormal:'全部正常', wasteEst:'损失估算', grossMarginLabel:'毛利率',
    riskLossEst:'风险损失估算', settleDeductSum:'结算扣减合计', returnLossSum:'退货损失合计', grossProfitTotal:'毛利合计',
    campaignPnlRisk:'广告P&L风险', settleDeductWord:'结算扣减', returnRateWord:'退货率',
    lossEstWarning:'₩{amount}M 损失估算',
    pnlStructure:'P&L结构', pnlDesc:'收入扣除成本后的净利润结构',
    pnlTotalRev:'总收入', pnlSettle:'结算扣减', pnlNetRev:'净收入', pnlCogs:'销售成本',
    pnlReturnLoss:'退货损失', pnlAdSpend:'广告费', pnlFxLoss:'汇兑损失', pnlGrossProfit:'毛利',
    riskWarn:'⚠ 风险警告', budgetRemaining:'剩余预算', settlePct:'结算扣减率', returnPct:'退货率', cogsPct:'成本率',
    riskStatus:{ danger:'危险', caution:'注意', normal:'正常' },
    noSegData:'暂无细分数据', noRiskData:'暂无风险数据',
    connectSegment:'连接细分数据后将显示分析', connectRisk:'连接广告数据后将显示P&L分析',
    tabGuide:'📖 使用指南',
    guideTitle:'统合概况使用指南', guideSubtitle:'了解如何按SKU、广告活动、创作者、平台分析汇总数据。',
    guideStepsTitle:'概况入门6步',
    guideStep1Title:'选择期间', guideStep1Desc:'从右上角选择日/周/月/年/季节汇总期间。',
    guideStep2Title:'查看概要', guideStep2Desc:'总收入、广告费、订单数、ROAS等核心KPI一目了然。',
    guideStep3Title:'SKU分析', guideStep3Desc:'在SKU标签中查看产品收入、退货率、ROAS趋势。',
    guideStep4Title:'广告活动比较', guideStep4Desc:'在广告活动标签中比较广告效果和CPA。',
    guideStep5Title:'创作者追踪', guideStep5Desc:'在创作者标签中分析网红ROI和浏览量对比收入。',
    guideStep6Title:'风险预算管理', guideStep6Desc:'在风险预算标签中监控P&L结构和退货损失。',
    guideTabsTitle:'标签页详解',
    guideTabSummary:'查看综合KPI和平台收入。',guideTabSku:'分析SKU级收入、ROAS和退货率。',guideTabCampaign:'比较广告活动的收入和ROAS。',guideTabCreator:'比较创作者粉丝和ROI。',guideTabPlatform:'比较平台收入份额。',guideTabSegment:'分析细分ROAS热力图。',guideTabRisk:'监控P&L风险和退货损失。',
    guideTipsTitle:'实用技巧',
    guideTip1:'先从概要了解全貌再查看详情。',guideTip2:'更改期间自动刷新所有数据。',guideTip3:'点击列头可排序。',guideTip4:'点击行查看详细图表。',guideTip5:'在风险标签查看P&L成本比率。',
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
    segGroups:['受眾','類別','創意'], sortHint:'點擊列排序',
    segRoasChart:'區分ROAS熱力圖', segDetail:'區分詳情',
    highEff:'高效率區分 (ROAS ≥ 4x)', lowEff:'低效率區分 (ROAS < 2.5x)',
    none:'無', allNormal:'全部正常', wasteEst:'損失估算', grossMarginLabel:'毛利率',
    riskLossEst:'風險損失估算', settleDeductSum:'結算扣減合計', returnLossSum:'退貨損失合計', grossProfitTotal:'毛利合計',
    campaignPnlRisk:'廣告P&L風險', settleDeductWord:'結算扣減', returnRateWord:'退貨率',
    lossEstWarning:'₩{amount}M 損失估算',
    pnlStructure:'P&L結構', pnlDesc:'收入扣除成本後的淨利潤結構',
    pnlTotalRev:'總收入', pnlSettle:'結算扣減', pnlNetRev:'淨收入', pnlCogs:'銷售成本',
    pnlReturnLoss:'退貨損失', pnlAdSpend:'廣告費', pnlFxLoss:'匯差損失', pnlGrossProfit:'毛利',
    riskWarn:'⚠ 風險警告', budgetRemaining:'剩餘預算', settlePct:'結算扣減率', returnPct:'退貨率', cogsPct:'成本率',
    riskStatus:{ danger:'危險', caution:'注意', normal:'正常' },
    noSegData:'尚無區分資料', noRiskData:'尚無風險資料',
    connectSegment:'連接區分資料後將顯示分析', connectRisk:'連接廣告資料後將顯示P&L分析',
    tabGuide:'📖 使用指南',
    guideTitle:'統合概況完整使用指南', guideSubtitle:'本指南詳細說明如何使用統合概況功能，按SKU、廣告活動、創作者和平台維度分析匯總資料，幫助您全面掌握業務績效。',
    guideStepsTitle:'開始使用統合概況的6個步驟',
    guideStep1Title:'選擇期間', guideStep1Desc:'在頁面右上角選擇日/週/月/年/季節等不同的彙總期間。選擇後，所有標籤頁的數據將自動刷新為相應期間的匯總結果。',
    guideStep2Title:'查看摘要', guideStep2Desc:'在摘要標籤頁中，一目了然地查看總收入、總廣告支出、總訂單量、平均ROAS等核心KPI指標，以及按平台劃分的收入分佈圖和Top SKU排名。',
    guideStep3Title:'SKU分析', guideStep3Desc:'在SKU標籤頁中，查看各產品的收入、ROAS和退貨率趨勢。點擊表格中的任何一行，右側將顯示該SKU的詳細時間序列數據和收入趨勢圖。',
    guideStep4Title:'廣告活動比較', guideStep4Desc:'在廣告活動標籤頁中，跨平台比較各廣告活動的收入、廣告支出、ROAS和CPA。點擊行可查看詳細的展示次數、點擊數和轉換數據。',
    guideStep5Title:'創作者追蹤', guideStep5Desc:'在創作者標籤頁中，分析各網紅的粉絲數、收入和ROI表現。比較瀏覽量與收入的效率比，評估合作的投資回報。',
    guideStep6Title:'風險預算管理', guideStep6Desc:'在風險預算標籤頁中，監控每個廣告活動的P\u0026L結構。查看結算扣減、退貨損失、銷售成本等各項成本比率，及時發現潛在風險。',
    guideTabsTitle:'標籤頁說明',
    guideTabSummary:'查看綜合KPI：總收入、廣告支出、訂單量、ROAS，以及按平台劃分的收入佔比和Top SKU排名。所有數據根據所選期間自動更新。',guideTabSku:'分析SKU級別的收入、ROAS和退貨率趨勢。點擊表格行可在右側查看詳細的時間序列數據圖表，包括收入趨勢和ROAS變化。',guideTabCampaign:'跨平台比較廣告活動的收入、廣告支出、ROAS和CPA。查看每日展示次數、點擊數、轉換數，評估廣告投放效果。',guideTabCreator:'比較創作者（網紅）的粉絲數、累計收入和ROI。分析瀏覽量對比收入的效率，選擇最具性價比的合作對象。',guideTabPlatform:'比較Meta、Google、TikTok、Naver等各平台的收入份額和ROAS。直觀展示各平台的收入佔比和趨勢。',guideTabSegment:'使用ROAS熱力圖分析受眾、類別和創意等不同細分維度的表現。識別高效率和低效率的細分市場。',guideTabRisk:'監控廣告活動的P\u0026L風險，包括結算扣減、退貨損失和銷售成本。使用瀑布圖直觀展示從總收入到淨利潤的損益結構。',
    guideTipsTitle:'實用技巧',
    guideTip1:'建議先從摘要標籤了解全局概況，然後再深入各詳細標籤頁分析具體數據。',guideTip2:'更改右上角的期間設置後，所有標籤頁的數據會同步自動刷新，無需手動切換。',guideTip3:'表格的列標題支持點擊排序功能。再次點擊可切換升序/降序排列。',guideTip4:'在SKU、廣告活動或創作者表格中點擊任何一行，右側面板將顯示該項目的詳細圖表和分析。',guideTip5:'在風險標籤的P\u0026L結構圖中，查看各項成本佔總收入的比率，及時識別成本過高的項目。',
  },
  de: {
    title:'Rollup Aggregationsschicht', subtitle:'SKU · Kampagne · Creator · Plattform × Täglich/Wöchentlich/Monatlich/Jährlich/Saisonal',
    loading:'Laden...', totalRevenue:'Gesamtumsatz', totalSpend:'Gesamtwerbeausgaben', totalOrders:'Gesamtbestellungen',
    avgRoas:'Ø ROAS', revenuePerOrder:'Umsatz/Bestellung', platformRevenue:'Umsatz nach Plattform',
    topSku:'Top SKU Status', alerts:'Warnungen', colProduct:'Produkt', colRevenue:'Umsatz', colOrders:'Bestellungen',
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
    segGroups:['Zielgruppe','Kategorie','Kreativ'], sortHint:'Spalte klicken zum Sortieren',
    segRoasChart:'Segment-ROAS-Heatmap', segDetail:'Segmentdetails',
    highEff:'Hocheffizient (ROAS ≥ 4x)', lowEff:'Niedrigeffizient (ROAS < 2.5x)',
    none:'Keine', allNormal:'Alle normal', wasteEst:'gesch. Verlust', grossMarginLabel:'Bruttomarge',
    riskLossEst:'Risikoverlust-Schätz.', settleDeductSum:'Abrechnungsabzug', returnLossSum:'Retourenverlust', grossProfitTotal:'Bruttogewinn',
    campaignPnlRisk:'Kampagnen-P&L-Risiko', settleDeductWord:'Abrechnung', returnRateWord:'Retoure',
    lossEstWarning:'₩{amount}M Verlust gesch.',
    pnlStructure:'P&L-Struktur', pnlDesc:'Nettogewinn nach Kosten',
    pnlTotalRev:'Umsatz', pnlSettle:'Abrechnungsabzug', pnlNetRev:'Nettoumsatz', pnlCogs:'Herstellkosten',
    pnlReturnLoss:'Retourenverlust', pnlAdSpend:'Werbeausgaben', pnlFxLoss:'Währungsverlust', pnlGrossProfit:'Bruttogewinn',
    riskWarn:'⚠ Risikowarnung', budgetRemaining:'Restbudget', settlePct:'Abrechnung %', returnPct:'Retoure %', cogsPct:'Kosten %',
    riskStatus:{ danger:'Gefahr', caution:'Warnung', normal:'Normal' },
    noSegData:'Keine Segmentdaten', noRiskData:'Keine Risikodaten',
    connectSegment:'Segmentdaten verbinden für Analyse', connectRisk:'Kampagnendaten verbinden für P&L-Analyse',
    tabGuide:'📖 Anleitung',
    guideTitle:'Vollständige Anleitung zum Rollup-Dashboard', guideSubtitle:'Diese Anleitung erklärt ausführlich, wie Sie das Rollup-Dashboard nutzen, um aggregierte Daten nach SKU, Kampagne, Creator und Plattform zu analysieren und Ihre Geschäftsleistung umfassend zu verstehen.',
    guideStepsTitle:'6 Schritte zum Einstieg in das Rollup-Dashboard',
    guideStep1Title:'Zeitraum auswählen', guideStep1Desc:'Wählen Sie oben rechts zwischen täglichen, wöchentlichen, monatlichen, jährlichen oder saisonalen Aggregationszeiträumen. Nach der Auswahl werden alle Tab-Daten automatisch für den gewählten Zeitraum aktualisiert.',
    guideStep2Title:'Übersicht prüfen', guideStep2Desc:'Im Übersicht-Tab sehen Sie auf einen Blick Gesamtumsatz, Werbeausgaben, Bestellungen, durchschnittlichen ROAS sowie die Umsatzverteilung nach Plattform und Top-SKU-Rankings.',
    guideStep3Title:'SKUs analysieren', guideStep3Desc:'Im SKU-Tab analysieren Sie Umsatz, ROAS und Retourenquoten pro Produkt. Klicken Sie auf eine Zeile, um rechts detaillierte Zeitreihendaten und Trenddiagramme anzuzeigen.',
    guideStep4Title:'Kampagnen vergleichen', guideStep4Desc:'Im Kampagnen-Tab vergleichen Sie plattformübergreifend Umsatz, Ausgaben, ROAS und CPA. Detaillierte Impressions-, Klick- und Konversionsdaten sind pro Kampagne verfügbar.',
    guideStep5Title:'Creators verfolgen', guideStep5Desc:'Im Creator-Tab analysieren Sie Follower, Umsatz und ROI jedes Influencers. Vergleichen Sie die Effizienz von Aufrufen zu Umsatz für optimale Partnerwahl.',
    guideStep6Title:'Risikobudget verwalten', guideStep6Desc:'Im Risiko-Tab überwachen Sie die P\u0026L-Struktur jeder Kampagne. Prüfen Sie Abrechnungsabzüge, Retourenverluste und Herstellkosten, um Risiken frühzeitig zu erkennen.',
    guideTabsTitle:'Detaillierte Tab-Beschreibungen',
    guideTabSummary:'Zeigt integrierte KPIs: Gesamtumsatz, Werbeausgaben, Bestellungen, ROAS und Plattform-Umsatzverteilung. Alle Daten aktualisieren sich automatisch bei Zeitraumänderung.',guideTabSku:'Analysiert SKU-Umsatz, ROAS und Retourenquoten. Klicken Sie eine Zeile an, um rechts detaillierte Zeitreihen-Charts mit Umsatz- und ROAS-Trends zu sehen.',guideTabCampaign:'Vergleicht Kampagnen plattformübergreifend nach Umsatz, Ausgaben, ROAS und CPA. Tägliche Impressions, Klicks und Konversionen sind einsehbar.',guideTabCreator:'Vergleicht Creator-Follower, Umsatz und ROI. Analysiert die Effizienz von Aufrufen zu Umsatz für die beste Investitionsentscheidung.',guideTabPlatform:'Vergleicht Umsatzanteile und ROAS über Meta, Google, TikTok, Naver und weitere Plattformen. Visualisiert Trends und Marktanteile.',guideTabSegment:'Analysiert Segment-ROAS-Heatmaps über Zielgruppen, Kategorien und Kreative. Identifiziert hoch- und niedrigeffiziente Segmente.',guideTabRisk:'Überwacht Kampagnen-P\u0026L-Risiken inkl. Abrechnungsabzüge, Retourenverluste und COGS. Wasserfalldiagramm zeigt die Gewinnstruktur.',
    guideTipsTitle:'Tipps',
    guideTip1:'Beginnen Sie mit dem Übersicht-Tab für einen Gesamtüberblick, bevor Sie in die Detailtabs eintauchen.',guideTip2:'Eine Zeitraumänderung aktualisiert automatisch alle Tabs – kein manuelles Wechseln nötig.',guideTip3:'Klicken Sie auf Spaltenüberschriften zum Sortieren. Erneutes Klicken wechselt zwischen aufsteigend/absteigend.',guideTip4:'Klicken Sie auf eine Zeile in SKU/Kampagne/Creator-Tabellen, um rechts detaillierte Charts anzuzeigen.',guideTip5:'Im Risiko-Tab die P\u0026L-Struktur prüfen, um Kostenquoten zu identifizieren und überhöhte Ausgaben frühzeitig zu erkennen.',
  },
  th: {
    title:'Rollup ชั้นรวม', subtitle:'SKU · แคมเปญ · ครีเอเตอร์ · แพลตฟอร์ม × รายวัน/สัปดาห์/เดือน/ปี/ฤดูกาล',
    loading:'กำลังโหลด...', totalRevenue:'รายรับรวม', totalSpend:'ค่าโฆษณารวม', totalOrders:'คำสั่งซื้อรวม',
    avgRoas:'ROAS เฉลี่ย', revenuePerOrder:'รายรับ/คำสั่งซื้อ', platformRevenue:'รายรับตามแพลตฟอร์ม',
    topSku:'Top SKU', alerts:'แจ้งเตือน', colProduct:'สินค้า', colRevenue:'รายรับ', colOrders:'คำสั่งซื้อ',
    colReturnRate:'อัตราคืน', colTrend:'แนวโน้ม', colDate:'วันที่', colTotalRevenue:'รายรับรวม', colTotalSpend:'ค่าใช้จ่ายรวม',
    colPlatform:'แพลตฟอร์ม', colShare:'สัดส่วน', colCampaign:'แคมเปญ', colCpa:'CPA', colConversions:'Conversion',
    colImpressions:'การแสดง', colClicks:'คลิก', colCpc:'CPC', colSpend:'ค่าโฆษณา',
    colHandle:'แฮนเดิล', colTier:'ระดับ', colFollowers:'ผู้ติดตาม', colRoi:'ROI', colViews:'ยอดดู',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'ค่าโฆษณาจริง',
    skuAgg:'การวิเคราะห์รวม SKU', campaignAgg:'การวิเคราะห์รวมแคมเปญ', creatorAgg:'การวิเคราะห์รวมครีเอเตอร์',
    platformAgg:'การวิเคราะห์รวมแพลตฟอร์ม', platformDetail:'รายละเอียด', dailyRevenue:'รายรับรายวัน',
    revTrend:'แนวโน้มรายรับ', roasTrend:'แนวโน้ม ROAS', roasScale:'*ROAS สเกล ×1M',
    unitPrice:'ราคาต่อหน่วย', commissionPerPost:'ค่าคอมมิชชั่น/โพสต์', viewsVsRevenue:'ยอดดู vs รายรับ',
    revenueVsSpend:'รายรับ vs ค่าโฆษณา', unitTenThousand:'หมื่น',
    tabSummary:'สรุป', tabCampaign:'แคมเปญ', tabCreator:'ครีเอเตอร์',
    tabPlatform:'แพลตฟอร์ม', tabSegment:'กลุ่ม', tabRisk:'งบเสี่ยง',
    periodDaily:'รายวัน', periodWeekly:'รายสัปดาห์', periodMonthly:'รายเดือน', periodYearly:'รายปี', periodSeasonal:'ตามฤดูกาล',
    unitDay:'วัน', unitWeek:'สัปดาห์', unitMonth:'เดือน', unitYear:'ปี', unitSeason:'ฤดูกาล',
    segGroups:['กลุ่มเป้าหมาย','หมวดหมู่','ครีเอทีฟ'], sortHint:'คลิกคอลัมน์เพื่อเรียงลำดับ',
    segRoasChart:'Heatmap ROAS ตามกลุ่ม', segDetail:'รายละเอียดกลุ่ม',
    highEff:'กลุ่มประสิทธิภาพสูง (ROAS ≥ 4x)', lowEff:'กลุ่มประสิทธิภาพต่ำ (ROAS < 2.5x)',
    none:'ไม่มี', allNormal:'ทั้งหมดปกติ', wasteEst:'ประมาณการสูญเสีย', grossMarginLabel:'อัตรากำไรขั้นต้น',
    riskLossEst:'ประมาณการขาดทุน', settleDeductSum:'หักค่าชำระ', returnLossSum:'ขาดทุนจากการคืน', grossProfitTotal:'กำไรขั้นต้น',
    campaignPnlRisk:'ความเสี่ยง P&L แคมเปญ', settleDeductWord:'หักชำระ', returnRateWord:'อัตราคืน',
    lossEstWarning:'₩{amount}M ขาดทุนโดยประมาณ',
    pnlStructure:'โครงสร้าง P&L', pnlDesc:'กำไรสุทธิหลังหักค่าใช้จ่าย',
    pnlTotalRev:'รายรับรวม', pnlSettle:'หักค่าชำระ', pnlNetRev:'รายรับสุทธิ', pnlCogs:'ต้นทุนขาย',
    pnlReturnLoss:'ขาดทุนจากการคืน', pnlAdSpend:'ค่าโฆษณา', pnlFxLoss:'ขาดทุนจากอัตราแลกเปลี่ยน', pnlGrossProfit:'กำไรขั้นต้น',
    riskWarn:'⚠ เตือนความเสี่ยง', budgetRemaining:'งบคงเหลือ', settlePct:'อัตราหักชำระ', returnPct:'อัตราคืน', cogsPct:'อัตราต้นทุน',
    riskStatus:{ danger:'อันตราย', caution:'ระวัง', normal:'ปกติ' },
    noSegData:'ไม่มีข้อมูลกลุ่ม', noRiskData:'ไม่มีข้อมูลความเสี่ยง',
    connectSegment:'เชื่อมต่อข้อมูลเพื่อดูการวิเคราะห์', connectRisk:'เชื่อมต่อข้อมูลแคมเปญเพื่อดู P&L',
    tabGuide:'📖 คู่มือ',
    guideTitle:'คู่มือการใช้งานภาพรวมแบบครบถ้วน', guideSubtitle:'คู่มือนี้อธิบายวิธีใช้หน้าภาพรวมเพื่อวิเคราะห์ข้อมูลรวมตาม SKU แคมเปญ ครีเอเตอร์ และแพลตฟอร์ม เพื่อทำความเข้าใจผลงานธุรกิจอย่างครอบคลุม',
    guideStepsTitle:'6 ขั้นตอนเริ่มต้นใช้งานภาพรวม',
    guideStep1Title:'เลือกช่วงเวลา', guideStep1Desc:'เลือกช่วงเวลาที่ต้องการจากมุมขวาบน (รายวัน/สัปดาห์/เดือน/ปี/ฤดูกาล) เมื่อเลือกแล้ว ข้อมูลในทุกแท็บจะถูกอัปเดตอัตโนมัติตามช่วงเวลาที่เลือก',
    guideStep2Title:'ดูสรุป', guideStep2Desc:'ในแท็บสรุป ดูรายรับรวม ค่าโฆษณารวม คำสั่งซื้อรวม ROAS เฉลี่ย และการกระจายรายรับตามแพลตฟอร์ม รวมถึงอันดับ Top SKU ในมุมมองเดียว',
    guideStep3Title:'วิเคราะห์ SKU', guideStep3Desc:'ในแท็บ SKU วิเคราะห์รายรับ ROAS และอัตราคืนสินค้าของแต่ละผลิตภัณฑ์ คลิกที่แถวใดก็ได้เพื่อดูข้อมูลรายละเอียดแบบอนุกรมเวลาและกราฟแนวโน้มทางด้านขวา',
    guideStep4Title:'เปรียบเทียบแคมเปญ', guideStep4Desc:'ในแท็บแคมเปญ เปรียบเทียบรายรับ ค่าโฆษณา ROAS และ CPA ข้ามแพลตฟอร์ม ดูข้อมูลการแสดงผล คลิก และคอนเวอร์ชันรายวันของแต่ละแคมเปญ',
    guideStep5Title:'ติดตามครีเอเตอร์', guideStep5Desc:'ในแท็บครีเอเตอร์ วิเคราะห์จำนวนผู้ติดตาม รายรับ และ ROI ของอินฟลูเอนเซอร์แต่ละคน เปรียบเทียบประสิทธิภาพยอดดูต่อรายรับเพื่อเลือกพาร์ทเนอร์ที่คุ้มค่าที่สุด',
    guideStep6Title:'จัดการงบเสี่ยง', guideStep6Desc:'ในแท็บงบเสี่ยง ติดตามโครงสร้าง P\u0026L ของแต่ละแคมเปญ ตรวจสอบอัตราหักค่าชำระ ขาดทุนจากการคืนสินค้า และต้นทุนขาย เพื่อระบุความเสี่ยงก่อนเวลา',
    guideTabsTitle:'คำอธิบายรายละเอียดแต่ละแท็บ',
    guideTabSummary:'ดู KPI รวม: รายรับรวม ค่าโฆษณา คำสั่งซื้อ ROAS และสัดส่วนรายรับตามแพลตฟอร์ม รวมถึง Top SKU ข้อมูลอัปเดตอัตโนมัติตามช่วงเวลาที่เลือก',guideTabSku:'วิเคราะห์รายรับ ROAS และอัตราคืนสินค้าระดับ SKU คลิกแถวเพื่อดูกราฟรายละเอียดแบบอนุกรมเวลา ทั้งแนวโน้มรายรับและ ROAS',guideTabCampaign:'เปรียบเทียบแคมเปญข้ามแพลตฟอร์มตามรายรับ ค่าโฆษณา ROAS และ CPA ดูการแสดงผล คลิก และคอนเวอร์ชันรายวัน',guideTabCreator:'เปรียบเทียบจำนวนผู้ติดตาม รายรับสะสม และ ROI ของครีเอเตอร์ วิเคราะห์ยอดดูต่อรายรับเพื่อคัดเลือกพาร์ทเนอร์',guideTabPlatform:'เปรียบเทียบส่วนแบ่งรายรับและ ROAS ของ Meta Google TikTok Naver และอื่นๆ แสดงแนวโน้มและสัดส่วนตลาด',guideTabSegment:'วิเคราะห์ Heatmap ROAS ตามกลุ่มเป้าหมาย หมวดหมู่ และครีเอทีฟ ระบุกลุ่มที่มีประสิทธิภาพสูงและต่ำ',guideTabRisk:'ติดตามความเสี่ยง P\u0026L ของแคมเปญ รวมถึงหักค่าชำระ ขาดทุนจากการคืน และต้นทุนขาย กราฟ Waterfall แสดงโครงสร้างกำไรขาดทุน',
    guideTipsTitle:'เคล็ดลับ',
    guideTip1:'แนะนำให้เริ่มจากแท็บสรุปเพื่อเข้าใจภาพรวม ก่อนลงลึกไปที่แท็บรายละเอียด',guideTip2:'เมื่อเปลี่ยนช่วงเวลา ทุกแท็บจะอัปเดตข้อมูลอัตโนมัติ ไม่ต้องสลับแท็บเอง',guideTip3:'คลิกที่หัวคอลัมน์ตารางเพื่อจัดเรียงข้อมูล คลิกซ้ำเพื่อสลับระหว่างน้อยไปมาก/มากไปน้อย',guideTip4:'คลิกที่แถวใดก็ได้ในตาราง SKU แคมเปญ หรือครีเอเตอร์ เพื่อดูกราฟและการวิเคราะห์รายละเอียดทางด้านขวา',guideTip5:'ตรวจสอบโครงสร้าง P\u0026L ในแท็บเสี่ยง เพื่อระบุรายการค่าใช้จ่ายที่สูงเกินไป และดำเนินการแก้ไขทันเวลา',
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
    segGroups:['Đối tượng','Danh mục','Sáng tạo'], sortHint:'Nhấn cột để sắp xếp',
    segRoasChart:'Bản đồ nhiệt ROAS', segDetail:'Chi tiết phân khúc',
    highEff:'Hiệu quả cao (ROAS ≥ 4x)', lowEff:'Hiệu quả thấp (ROAS < 2.5x)',
    none:'Không có', allNormal:'Tất cả bình thường', wasteEst:'ước tính lãng phí', grossMarginLabel:'Biên lợi nhuận gộp',
    riskLossEst:'Ước tính thua lỗ', settleDeductSum:'Khấu trừ thanh toán', returnLossSum:'Tổn thất hoàn trả', grossProfitTotal:'Lợi nhuận gộp',
    campaignPnlRisk:'Rủi ro P&L chiến dịch', settleDeductWord:'Khấu trừ', returnRateWord:'Tỷ lệ trả',
    lossEstWarning:'₩{amount}M thua lỗ ước tính',
    pnlStructure:'Cấu trúc P&L', pnlDesc:'Lợi nhuận ròng sau chi phí',
    pnlTotalRev:'Doanh thu', pnlSettle:'Khấu trừ', pnlNetRev:'Doanh thu ròng', pnlCogs:'Giá vốn',
    pnlReturnLoss:'Tổn thất hoàn trả', pnlAdSpend:'Chi phí QC', pnlFxLoss:'Lỗ tỷ giá', pnlGrossProfit:'Lợi nhuận gộp',
    riskWarn:'⚠ Cảnh báo rủi ro', budgetRemaining:'Ngân sách còn lại', settlePct:'Tỷ lệ khấu trừ', returnPct:'Tỷ lệ trả', cogsPct:'Tỷ lệ giá vốn',
    riskStatus:{ danger:'Nguy hiểm', caution:'Cảnh báo', normal:'Bình thường' },
    noSegData:'Chưa có dữ liệu phân khúc', noRiskData:'Chưa có dữ liệu rủi ro',
    connectSegment:'Kết nối dữ liệu phân khúc để xem phân tích', connectRisk:'Kết nối dữ liệu chiến dịch để xem P&L',
    tabGuide:'📖 Hướng dẫn',
    guideTitle:'Hướng dẫn sử dụng Tổng hợp chi tiết', guideSubtitle:'Hướng dẫn này giải thích cách sử dụng trang Tổng hợp để phân tích dữ liệu theo SKU, chiến dịch, nhà sáng tạo và nền tảng, giúp bạn nắm bắt toàn diện hiệu quả kinh doanh.',
    guideStepsTitle:'6 bước bắt đầu sử dụng Tổng hợp',
    guideStep1Title:'Chọn kỳ', guideStep1Desc:'Chọn kỳ tổng hợp (ngày/tuần/tháng/năm/mùa) ở góc trên bên phải. Sau khi chọn, dữ liệu trên tất cả các tab sẽ tự động cập nhật theo kỳ đã chọn.',
    guideStep2Title:'Xem tóm tắt', guideStep2Desc:'Trong tab Tóm tắt, xem tổng doanh thu, tổng chi phí quảng cáo, tổng đơn hàng, ROAS trung bình và phân bổ doanh thu theo nền tảng, cùng bảng xếp hạng Top SKU.',
    guideStep3Title:'Phân tích SKU', guideStep3Desc:'Trong tab SKU, phân tích doanh thu, ROAS và tỷ lệ trả hàng của từng sản phẩm. Nhấp vào bất kỳ hàng nào để xem dữ liệu chuỗi thời gian chi tiết và biểu đồ xu hướng ở bên phải.',
    guideStep4Title:'So sánh chiến dịch', guideStep4Desc:'Trong tab Chiến dịch, so sánh doanh thu, chi phí quảng cáo, ROAS và CPA giữa các nền tảng. Xem lượt hiển thị, nhấp chuột và chuyển đổi hàng ngày của từng chiến dịch.',
    guideStep5Title:'Theo dõi nhà sáng tạo', guideStep5Desc:'Trong tab Nhà sáng tạo, phân tích người theo dõi, doanh thu và ROI của từng influencer. So sánh hiệu quả lượt xem so với doanh thu để chọn đối tác tối ưu nhất.',
    guideStep6Title:'Quản lý rủi ro', guideStep6Desc:'Trong tab Ngân sách rủi ro, giám sát cấu trúc P\u0026L của từng chiến dịch. Kiểm tra khấu trừ thanh toán, tổn thất hoàn trả và giá vốn để phát hiện rủi ro kịp thời.',
    guideTabsTitle:'Hướng dẫn chi tiết từng tab',
    guideTabSummary:'Xem KPI tổng hợp: tổng doanh thu, chi phí quảng cáo, đơn hàng, ROAS và phân bổ doanh thu theo nền tảng. Dữ liệu tự động cập nhật khi thay đổi kỳ.',guideTabSku:'Phân tích doanh thu, ROAS và tỷ lệ trả hàng cấp SKU. Nhấp vào hàng để xem biểu đồ chuỗi thời gian chi tiết bao gồm xu hướng doanh thu và ROAS.',guideTabCampaign:'So sánh chiến dịch đa nền tảng theo doanh thu, chi phí, ROAS và CPA. Xem lượt hiển thị, nhấp chuột và chuyển đổi hàng ngày.',guideTabCreator:'So sánh người theo dõi, doanh thu tích lũy và ROI của nhà sáng tạo. Phân tích tỷ lệ lượt xem/doanh thu để đánh giá hiệu quả đầu tư.',guideTabPlatform:'So sánh tỷ trọng doanh thu và ROAS của Meta, Google, TikTok, Naver. Trực quan hóa xu hướng và thị phần.',guideTabSegment:'Phân tích bản đồ nhiệt ROAS theo đối tượng, danh mục và sáng tạo. Xác định phân khúc hiệu quả cao và thấp.',guideTabRisk:'Giám sát rủi ro P\u0026L chiến dịch bao gồm khấu trừ, tổn thất hoàn trả và giá vốn. Biểu đồ thác nước hiển thị cấu trúc lãi lỗ.',
    guideTipsTitle:'Mẹo hữu ích',
    guideTip1:'Nên bắt đầu từ tab Tóm tắt để nắm bắt tổng quan trước khi đi sâu vào các tab chi tiết.',guideTip2:'Khi thay đổi kỳ, tất cả dữ liệu tab sẽ tự động cập nhật mà không cần chuyển tab thủ công.',guideTip3:'Nhấp vào tiêu đề cột bảng để sắp xếp dữ liệu. Nhấp lại để chuyển đổi tăng/giảm dần.',guideTip4:'Nhấp vào bất kỳ hàng nào trong bảng SKU, chiến dịch hoặc nhà sáng tạo để xem biểu đồ chi tiết ở bên phải.',guideTip5:'Kiểm tra cấu trúc P\u0026L trong tab rủi ro để xác định các khoản chi phí vượt mức và xử lý kịp thời.',
  },
  id: {
    title:'Rollup Lapisan Agregasi', subtitle:'SKU · Kampanye · Kreator · Platform × Harian/Mingguan/Bulanan/Tahunan/Musiman',
    loading:'Memuat...', totalRevenue:'Total Pendapatan', totalSpend:'Total Belanja Iklan', totalOrders:'Total Pesanan',
    avgRoas:'Rata-rata ROAS', revenuePerOrder:'Pendapatan/Pesanan', platformRevenue:'Pendapatan per Platform',
    topSku:'Top SKU', alerts:'Peringatan', colProduct:'Produk', colRevenue:'Pendapatan', colOrders:'Pesanan',
    colReturnRate:'Tingkat Retur', colTrend:'Tren', colDate:'Tanggal', colTotalRevenue:'Total Pendapatan', colTotalSpend:'Total Belanja',
    colPlatform:'Platform', colShare:'Pangsa', colCampaign:'Kampanye', colCpa:'CPA', colConversions:'Konversi',
    colImpressions:'Tayangan', colClicks:'Klik', colCpc:'CPC', colSpend:'Belanja Iklan',
    colHandle:'Akun', colTier:'Tingkat', colFollowers:'Pengikut', colRoi:'ROI', colViews:'Tayangan',
    colCtr:'CTR', colCvr:'CVR', colRoiPct:'ROI%', colActSpend:'Belanja Aktual',
    skuAgg:'Agregasi SKU', campaignAgg:'Agregasi Kampanye', creatorAgg:'Agregasi Kreator',
    platformAgg:'Agregasi Platform', platformDetail:'Detail', dailyRevenue:'Pendapatan Harian',
    revTrend:'Tren Pendapatan', roasTrend:'Tren ROAS', roasScale:'*ROAS Skala ×1M',
    unitPrice:'Harga Satuan', commissionPerPost:'Biaya/Post', viewsVsRevenue:'Tayangan vs Pendapatan',
    revenueVsSpend:'Pendapatan vs Belanja', unitTenThousand:'rb',
    tabSummary:'Ringkasan', tabCampaign:'Kampanye', tabCreator:'Kreator',
    tabPlatform:'Platform', tabSegment:'Segmen', tabRisk:'Anggaran Risiko',
    periodDaily:'Harian', periodWeekly:'Mingguan', periodMonthly:'Bulanan', periodYearly:'Tahunan', periodSeasonal:'Musiman',
    unitDay:'hari', unitWeek:'minggu', unitMonth:'bulan', unitYear:'tahun', unitSeason:'musim',
    segGroups:['Audiens','Kategori','Kreatif'], sortHint:'Klik kolom untuk mengurutkan',
    segRoasChart:'Heatmap ROAS Segmen', segDetail:'Detail Segmen',
    highEff:'Efisiensi Tinggi (ROAS ≥ 4x)', lowEff:'Efisiensi Rendah (ROAS < 2.5x)',
    none:'Tidak ada', allNormal:'Semua normal', wasteEst:'perkiraan kerugian', grossMarginLabel:'Margin Kotor',
    riskLossEst:'Perkiraan Kerugian Risiko', settleDeductSum:'Potongan Penyelesaian', returnLossSum:'Kerugian Retur', grossProfitTotal:'Laba Kotor',
    campaignPnlRisk:'Risiko P&L Kampanye', settleDeductWord:'Potongan', returnRateWord:'Tingkat Retur',
    lossEstWarning:'₩{amount}M perkiraan kerugian',
    pnlStructure:'Struktur P&L', pnlDesc:'Laba bersih setelah biaya',
    pnlTotalRev:'Pendapatan', pnlSettle:'Potongan', pnlNetRev:'Pendapatan Bersih', pnlCogs:'HPP',
    pnlReturnLoss:'Kerugian Retur', pnlAdSpend:'Belanja Iklan', pnlFxLoss:'Rugi Kurs', pnlGrossProfit:'Laba Kotor',
    riskWarn:'⚠ Peringatan Risiko', budgetRemaining:'Sisa Anggaran', settlePct:'Potongan %', returnPct:'Retur %', cogsPct:'HPP %',
    riskStatus:{ danger:'Bahaya', caution:'Peringatan', normal:'Normal' },
    noSegData:'Belum ada data segmen', noRiskData:'Belum ada data risiko',
    connectSegment:'Hubungkan data segmen untuk analisis', connectRisk:'Hubungkan data kampanye untuk analisis P&L',
    tabGuide:'📖 Panduan',
    guideTitle:'Panduan Lengkap Penggunaan Ringkasan Terpadu', guideSubtitle:'Panduan ini menjelaskan secara detail cara menggunakan halaman Ringkasan Terpadu untuk menganalisis data agregat berdasarkan SKU, kampanye, kreator, dan platform demi pemahaman kinerja bisnis yang komprehensif.',
    guideStepsTitle:'6 Langkah Memulai Ringkasan Terpadu',
    guideStep1Title:'Pilih Periode', guideStep1Desc:'Pilih periode agregasi (harian/mingguan/bulanan/tahunan/musiman) di pojok kanan atas. Setelah memilih, data di semua tab akan otomatis diperbarui sesuai periode yang dipilih.',
    guideStep2Title:'Lihat Ringkasan', guideStep2Desc:'Di tab Ringkasan, lihat total pendapatan, total belanja iklan, total pesanan, rata-rata ROAS, dan distribusi pendapatan per platform serta peringkat Top SKU dalam satu tampilan.',
    guideStep3Title:'Analisis SKU', guideStep3Desc:'Di tab SKU, analisis pendapatan, ROAS, dan tingkat retur per produk. Klik baris mana pun untuk melihat data time-series detail dan grafik tren di panel kanan.',
    guideStep4Title:'Bandingkan Kampanye', guideStep4Desc:'Di tab Kampanye, bandingkan pendapatan, belanja iklan, ROAS, dan CPA lintas platform. Lihat tayangan, klik, dan konversi harian setiap kampanye.',
    guideStep5Title:'Lacak Kreator', guideStep5Desc:'Di tab Kreator, analisis pengikut, pendapatan, dan ROI setiap influencer. Bandingkan efisiensi tontonan terhadap pendapatan untuk memilih mitra optimal.',
    guideStep6Title:'Kelola Risiko', guideStep6Desc:'Di tab Anggaran Risiko, pantau struktur P\u0026L setiap kampanye. Periksa potongan penyelesaian, kerugian retur, dan HPP untuk mengidentifikasi risiko secara dini.',
    guideTabsTitle:'Panduan Detail per Tab',
    guideTabSummary:'Lihat KPI terintegrasi: total pendapatan, belanja iklan, pesanan, ROAS, dan proporsi pendapatan per platform. Data diperbarui otomatis saat periode berubah.',guideTabSku:'Analisis pendapatan, ROAS, dan tingkat retur level SKU. Klik baris untuk melihat grafik time-series detail termasuk tren pendapatan dan ROAS.',guideTabCampaign:'Bandingkan kampanye lintas platform berdasarkan pendapatan, belanja, ROAS, dan CPA. Lihat tayangan, klik, dan konversi harian.',guideTabCreator:'Bandingkan pengikut, pendapatan kumulatif, dan ROI kreator. Analisis rasio tontonan/pendapatan untuk evaluasi investasi.',guideTabPlatform:'Bandingkan pangsa pendapatan dan ROAS Meta, Google, TikTok, Naver. Visualisasikan tren dan pangsa pasar.',guideTabSegment:'Analisis heatmap ROAS segmen berdasarkan audiens, kategori, dan kreatif. Identifikasi segmen efisiensi tinggi dan rendah.',guideTabRisk:'Pantau risiko P\u0026L kampanye termasuk potongan, kerugian retur, dan HPP. Grafik waterfall menampilkan struktur laba rugi.',
    guideTipsTitle:'Tips',
    guideTip1:'Disarankan mulai dari tab Ringkasan untuk memahami gambaran umum sebelum mendalami tab detail.',guideTip2:'Saat mengubah periode, semua data tab akan otomatis diperbarui tanpa perlu berpindah tab manual.',guideTip3:'Klik header kolom tabel untuk mengurutkan data. Klik lagi untuk beralih antara naik/turun.',guideTip4:'Klik baris mana pun di tabel SKU, kampanye, atau kreator untuk melihat grafik dan analisis detail di kanan.',guideTip5:'Periksa struktur P\u0026L di tab risiko untuk mengidentifikasi item biaya berlebihan dan mengambil tindakan tepat waktu.',
  },
};
// ── Helpers ─────────────────────────────────────────────
// Session Token Priority, if not exists  API key fallback
const _API_KEY = "process.env.API_KEY || ''";
const getAuthToken = () => localStorage.getItem("genie_token") || localStorage.getItem("genie_auth_token") || _API_KEY;
const API = async (path) => {
    try {
        const res = await fetch(path, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("API Error for path:", path, err);
        // Empty response fallback (no mock data)
        if (path.includes('sku') || path.includes('campaign') || path.includes('creator') || path.includes('platform')) {
            return { rows: [] };
        }
        return { kpi: {}, by_platform: {}, top_skus: [], alerts: [] };
    }
};

const fmt = {
    num: (v) => v?.toLocaleString("ko-KR") ?? "-",
    won: (v) => v == null ? "-" : "₩" + Math.round(v).toLocaleString("ko-KR"),
    pct: (v) => v == null ? "-" : v.toFixed(1) + "%",
    roas: (v) => v == null ? "-" : v.toFixed(2) + "x",
};
// Currency-aware formatter (uses useCurrency context)
function useFmtC() {
    const { fmt: cFmt, symbol, rate } = useCurrency();
    return useMemo(() => ({
        c: (v) => v == null ? '-' : cFmt(v),
        num: fmt.num,
        pct: fmt.pct,
        roas: fmt.roas,
        symbol: symbol || '₩',
        rate,
    }), [cFmt, symbol, rate]);
}

const PLATFORM_COLOR = { Meta: "#1877F2", Google: "#EA4335", TikTok: "#000", Naver: "#03C75A", Coupang: "#E51937", YouTube: "#FF0000", Instagram: "#C13584" };
const pcol = (p) => PLATFORM_COLOR[p] ?? "#888";

// ── Mini Bar Chart ───────────────────────────────────────
function MiniBar({ data, key1 = "revenue", key2 }) {
    const max = Math.max(...data.map((d) => d[key1] ?? 0));
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 40, width: "100%" }}>
            {data.slice(-28).map((d, i) => {
                const h = max > 0 ? ((d[key1] ?? 0) / max) * 38 : 2;
                return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                        <div style={{ width: "100%", background: "var(--accent, #6366f1)", borderRadius: 2, height: h }} title={`${d.date}: ${fmt.won(d[key1])}`} />
                
                
);
         
   })}
    </div>
 "#6366f1" }) {
    if (!data || data.length < 2) return null;
    const vals = data.map((d) => d[field] ?? 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const W = 80, H = 30;
    const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / range) * H;
        return `${x},${y}`;
    });
    const trend = vals[vals.length - 1] - vals[0];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <svg width={W} height={H} style={{ overflow: "visible" }}>
                <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: 10, color: trend >= 0 ? "#22c55e" : "#ef4444" }}>
                {trend >= 0 ? "▲" : "▼"}
            </span>
        </span>
    );
}


function KpiCard({ label, value, sub, color }) {
    return (
        <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${color ?? "#6366f1"}` }}>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{sub}</div>}
    </div>
);
}


function Badge({ str }) {
    const colors = { warn: "#ef4444", info: "#6366f1", ok: "#22c55e" };
    const type = str?.type ?? "info";
    return (
        <span style={{ background: colors[type] + "22", color: colors[type], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
            {str?.msg ?? str}
        </span>
    );
}


function SummaryTab({ period, n }) {
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const fc = useFmtC();
    const [data, setData] = useState(null);
    useEffect(() => {
        API(`/api/v423/rollup/summary?period=${period}&n=${n}`).then(setData).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{txt('loading')}</div>;

    const kpi = data.kpi ?? {};
    const byPlatform = data.by_platform ?? {};
    const maxRev = Math.max(...Object.values(byPlatform));

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <KpiCard label={txt('totalRevenue')} value={fc.c(kpi.total_revenue)} color="#6366f1" />
                <KpiCard label={txt('totalSpend')} value={fc.c(kpi.total_spend)} color="#ef4444" />
                <KpiCard label={txt('totalOrders')} value={fc.num(kpi.total_orders)} color="#f59e0b" />
                <KpiCard label={txt('avgRoas')} value={fc.roas(kpi.avg_roas)} color="#22c55e" />
                <KpiCard label={txt('revenuePerOrder')} value={fc.c(kpi.revenue_per_order)} color="#06b6d4" />

            {/* Platform Revenue Bar */}
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>🛡️ {txt('platformRevenue')}</div>
                {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([pf, rev]) => (
                    <div key={pf} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 70, fontSize: 12, color: pcol(pf), fontWeight: 700 }}>{pf}</div>
                        <div style={{ flex: 1, background: "#2a2a3e", borderRadius: 4, height: 20, overflow: "hidden" }}>
                            <div style={{ width: `${maxRev > 0 ? rev / maxRev * 100 : 0}%`, height: "100%", background: pcol(pf), borderRadius: 4, transition: "width 0.5s" }} />
                        <div style={{ width: 100, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{fc.c(rev)}</div>
                ))}

            {/* Top SKUs + Alerts */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('topSku')}</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["SKU", txt('colProduct'), txt('colRevenue'), txt('colOrders'), "ROAS", txt('colReturnRate')].map((h) => (
                                    <th key={h} style={{ padding: "4px 8px", textAlign: "right", color: "#888", fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(data.top_skus ?? []).map((s) => (
                                <tr key={s.sku_id} style={{ borderBottom: "1px solid #222" }}>
                                    <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 12 }}>{s.sku_id}</td>
                                    <td style={{ padding: "6px 8px" }}>{s.name}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fc.c(s.revenue)}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fc.num(s.orders)}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: (s.roas ?? 0) >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(s.roas)}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: (s.return_rate ?? 0) > 12 ? "#ef4444" : "#22c55e" }}>{fc.pct(s.return_rate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>🔔 {txt('alerts')}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(data.alerts ?? []).map((a, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <Badge str={a} />
                        ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}


function SkuTab({ period, n }) {
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/api/v423/rollup/sku?period=${period}&n=${n}`).then((d) => {
            setData(d);
            if (d.rows?.[0]) setSelected(d.rows[0].sku_id);
        }).catch(console.error);
    }, [period, n]);

    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const fc = useFmtC();
    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{txt('loading')}</div>;

    const selRow = data.rows?.find((r) => r.sku_id === selected);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left: table */}
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('skuAgg')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["SKU", txt('colProduct'), txt('colTotalRevenue'), "ROAS", txt('colReturnRate'), txt('colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.sku_id}
                                onClick={() => setSelected(r.sku_id)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.sku_id ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", fontFamily: "monospace" }}>{r.sku_id}</td>
                                <td style={{ padding: "6px 6px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fc.c(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roas >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(r.avg_roas)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_return_rate > 12 ? "#ef4444" : "#22c55e" }}>{fc.pct(r.avg_return_rate)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>
                                    <Sparkline data={r.series} field="revenue" color="#6366f1" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            {/* Right: series chart */}
            {selRow && (
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selRow.sku_id} — {selRow.name}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        {[[txt('colPlatform'), selRow.platform], [txt('unitPrice'), fc.c(selRow.unit_price)], ["ROAS", fc.roas(selRow.avg_roas)], [txt('colReturnRate'), fc.pct(selRow.avg_return_rate)]].map(([k, v]) => (
                            <span key={k} style={{ background: "#2a2a3e", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                                <span style={{ color: "#888" }}>{k}: </span><span style={{ fontWeight: 700 }}>{v}</span>
                            </span>
                        ))}
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{txt('revTrend')}</div>
                    <MiniBar data={selRow.series} key1="revenue" />
                    <div style={{ fontWeight: 600, fontSize: 13, margin: "14px 0 6px", color: "#aaa" }}>{txt('roasTrend')}</div>
                    <MiniBar data={selRow.series.map(s => ({ ...s, revenue: s.roas * 1000000 }))} key1="revenue" />
                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{txt('roasScale')}</div>

                    {/* mini table */}
                    <div style={{ marginTop: 16, maxHeight: 200, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-card, #1e1e2e)" }}>
                                    {[txt('colDate'), txt('colOrders'), txt('colRevenue'), "ROAS", txt('colReturnRate')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.orders)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.c(s.revenue)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roas >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(s.roas)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.return_rate > 12 ? "#ef4444" : "#22c55e" }}>{fc.pct(s.return_rate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>)}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}


function CampaignTab({ period, n }) {
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const fc = useFmtC();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/api/v423/rollup/campaign?period=${period}&n=${n}`).then((d) => {
            setData(d); if (d.rows?.[0]) setSelected(d.rows[0].campaign_id);
        }).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{txt('loading')}</div>;
    const selRow = data.rows?.find((r) => r.campaign_id === selected);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('campaignAgg')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {[txt('colCampaign'), txt('colPlatform'), txt('colTotalRevenue'), txt('colTotalSpend'), "ROAS", txt('colCpa'), txt('colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.campaign_id} onClick={() => setSelected(r.campaign_id)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.campaign_id ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                                <td style={{ padding: "6px 6px", color: pcol(r.platform), fontWeight: 700 }}>{r.platform}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fc.c(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: "#ef4444" }}>{fc.c(r.total_spend)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roas >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(r.avg_roas)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fc.c(r.avg_cpa)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            {selRow && (
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selRow.name}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        {[[txt('colPlatform'), selRow.platform], ["ROAS", fc.roas(selRow.avg_roas)], ["CPA", fc.c(selRow.avg_cpa)], [txt('colConversions'), fc.num(selRow.total_conversions)]].map(([k, v]) => (
                            <span key={k} style={{ background: "#2a2a3e", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                                <span style={{ color: "#888" }}>{k}: </span><span style={{ fontWeight: 700 }}>{v}</span>
                            </span>
                        ))}
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{txt('revenueVsSpend')}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{txt('colRevenue')}</div>
                            <MiniBar data={selRow.series} key1="revenue" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 4 }}>{txt('colTotalSpend')}</div>
                            <MiniBar data={selRow.series} key1="spend" />
                    </div>
                    <div style={{ marginTop: 16, maxHeight: 200, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-card, #1e1e2e)" }}>
                                    {[txt('colDate'), txt('colImpressions'), txt('colClicks'), txt('colConversions'), "ROAS", txt('colCpc')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.impressions)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.clicks)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.conversions)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roas >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(s.roas)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.c(s.cpc)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}


function CreatorTab({ period, n }) {
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const fc = useFmtC();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/api/v423/rollup/creator?period=${period}&n=${n}`).then((d) => {
            setData(d); if (d.rows?.[0]) setSelected(d.rows[0].creator_id);
        }).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{txt('loading')}</div>;
    const selRow = data.rows?.find((r) => r.creator_id === selected);
    const TIER_COLOR = { Mega: "#a855f7", Macro: "#6366f1", Micro: "#06b6d4" };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('creatorAgg')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {[txt('colHandle'), txt('colPlatform'), txt('colTier'), txt('colFollowers'), txt('colTotalRevenue'), txt('colRoi'), txt('colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.creator_id} onClick={() => setSelected(r.creator_id)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.creator_id ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", fontFamily: "monospace", fontSize: 11 }}>{r.handle}</td>
                                <td style={{ padding: "6px 6px", color: pcol(r.platform), fontWeight: 700 }}>{r.platform}</td>
                                <td style={{ padding: "6px 6px" }}>
                                    <span style={{ background: TIER_COLOR[r.tier] + "22", color: TIER_COLOR[r.tier], borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>{r.tier}</span>
                                </td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{(r.followers / 10000).toFixed(1)}{txt('unitTenThousand')}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fc.c(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roi_pct >= 0 ? "#22c55e" : "#ef4444" }}>{fc.pct(r.avg_roi_pct)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            {selRow && (
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selRow.handle}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        {[[txt('colPlatform'), selRow.platform], [txt('colTier'), selRow.tier], [txt('colFollowers'), (selRow.followers / 10000).toFixed(1) + txt('unitTenThousand')],
                        [txt('commissionPerPost'), fc.c(selRow.fee_per_post)], ["ROI", fc.pct(selRow.avg_roi_pct)]].map(([k, v]) => (
                            <span key={k} style={{ background: "#2a2a3e", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                                <span style={{ color: "#888" }}>{k}: </span><span style={{ fontWeight: 700 }}>{v}</span>
                            </span>
                        ))}
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{txt('viewsVsRevenue')}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{txt('colViews')}</div>
                            <MiniBar data={selRow.series} key1="views" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 4 }}>{txt('colRevenue')}</div>
                            <MiniBar data={selRow.series} key1="revenue" />
                    </div>
                    <div style={{ marginTop: 16, maxHeight: 200, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-card, #1e1e2e)" }}>
                                    {[txt('colDate'), txt('colViews'), txt('colClicks'), txt('colConversions'), txt('colCtr'), txt('colCvr'), txt('colRoiPct')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.views)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.clicks)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.num(s.conversions)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.pct(s.ctr)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.pct(s.cvr)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roi_pct >= 0 ? "#22c55e" : "#ef4444" }}>{fc.pct(s.roi_pct)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}


function PlatformTab({ period, n }) {
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const fc = useFmtC();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/api/v423/rollup/platform?period=${period}&n=${n}`).then((d) => {
            setData(d); if (d.rows?.[0]) setSelected(d.rows[0].platform);
        }).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{txt('loading')}</div>;
    const selRow = data.rows?.find((r) => r.platform === selected);

    const totalRev = data.rows?.reduce((s, r) => s + r.total_revenue, 0) ?? 1;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Platform donut-ish + table */}
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('platformAgg')}</div>
                {/* Stacked share bar */}
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 20, marginBottom: 16 }}>
                    {(data.rows ?? []).map((r) => (
                        <div key={r.platform}
                            title={`${r.platform}: ${fc.pct(r.total_revenue / totalRev * 100)}`}
                            style={{ width: `${r.total_revenue / totalRev * 100}%`, background: pcol(r.platform), transition: "width 0.5s" }} />
                    ))}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {[txt('colPlatform'), txt('colTotalRevenue'), txt('colShare'), txt('colTotalSpend'), "ROAS", txt('colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.platform} onClick={() => setSelected(r.platform)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.platform ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", color: pcol(r.platform), fontWeight: 700 }}>{r.platform}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fc.c(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: "#888" }}>{fc.pct(r.total_revenue / totalRev * 100)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: "#ef4444" }}>{fc.c(r.total_spend)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roas >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(r.avg_roas)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            {selRow && (
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: pcol(selRow.platform) }}>{selRow.platform} {txt('platformDetail')}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        <KpiCard label={txt('totalRevenue')} value={fc.c(selRow.total_revenue)} color={pcol(selRow.platform)} />
                        <KpiCard label="ROAS" value={fc.roas(selRow.avg_roas)} color={selRow.avg_roas >= 3 ? "#22c55e" : "#ef4444"} />
                        <KpiCard label={txt('totalOrders')} value={fc.num(selRow.total_orders)} color="#f59e0b" />
                        <KpiCard label={txt('totalSpend')} value={fc.c(selRow.total_spend)} color="#ef4444" />
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{txt('dailyRevenue')}</div>
                    <MiniBar data={selRow.series} key1="revenue" />
                    <div style={{ marginTop: 12, maxHeight: 170, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-card, #1e1e2e)" }}>
                                    {[txt('colDate'), txt('colRevenue'), "ROAS", txt('colCtr'), txt('colCpc')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.c(s.revenue)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roas >= 3 ? "#22c55e" : "#ef4444" }}>{fc.roas(s.roas)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.pct(s.ctr)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fc.c(s.cpc)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}


// ── Tab: Segment ──────────────────────────────────

// ── REMOVED: SEG_AUDIENCE hardcoded array — now API-driven ──

function SegmentTab() {
    const { fmt } = useCurrency();
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const segGroups = LOC[lang]?.segGroups || LOC.en.segGroups;
    const [grp, setGrp] = useState(segGroups[0]);
    const [sortBy, setSortBy] = useState("roas");
    const [sortDir, setSortDir] = useState(-1);

    // Sync grp label when language changes
    useEffect(() => { setGrp(segGroups[0]); }, [lang]);

    // ✅ API-driven data (zero mock)
    const [segData, setSegData] = useState([]);
    useEffect(() => {
        API('/api/v423/rollup/segment').then(d => setSegData(d.rows ?? [])).catch(() => setSegData([]));
    }, []);

    const groups = segGroups;
    const filtered = segData.filter(r => r.grp === grp);
    const sorted = [...filtered].sort((a, b) => sortDir * ((b[sortBy] ?? 0) - (a[sortBy] ?? 0)));
    const maxRev = Math.max(...filtered.map(r => r.revenue), 1);
    const maxRoas = Math.max(...filtered.map(r => r.roas), 1);

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => -d);
        else { setSortBy(col); setSortDir(-1); }
    };

    const roasColor = (v) => v >= 4 ? "#22c55e" : v >= 2.5 ? "#eab308" : "#ef4444";

    const cols = [
        { key: "seg", label: `${grp}` },
        { key: "impr", label: txt('colImpressions'), fmt: v => (v / 1e6).toFixed(1) + "M" },
        { key: "clicks", label: txt('colClicks'), fmt: v => (v / 1e3).toFixed(0) + "K" },
        { key: "ctr", label: "CTR%", fmt: v => v.toFixed(1) + "%" },
        { key: "conv", label: txt('colConversions'), fmt: v => v.toLocaleString() },
        { key: "cvr", label: "CVR%", fmt: v => v.toFixed(1) + "%" },
        { key: "spend", label: txt('colSpend'), fmt: v => fc.symbol + (v / 1e6).toFixed(1) + "M" },
        { key: "revenue", label: txt('colRevenue'), fmt: v => fc.symbol + (v / 1e6).toFixed(1) + "M" },
        { key: "roas", label: "ROAS", fmt: v => v.toFixed(2) + "x" },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Segment Type Select */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {groups.map((g, i) => (
                    <button key={g} onClick={() => setGrp(g)} style={{
                        padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                        background: grp === g ? "#6366f1" : "#2a2a3e", color: grp === g ? "#fff" : "#aaa", transition: "all 0.2s",
                    }}>{i === 0 ? `👥 ${g}` : i === 1 ? `📦 ${g}` : `🎨 ${g}`}</button>
                ))}
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{txt('sortHint')}</div>

            {/* ROAS Heatmap */}
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#aaa", marginBottom: 12 }}>📊 {txt('segRoasChart')}</div>
                <div style={{ display: "grid", gap: 8 }}>
                    {sorted.map(r => (
                        <div key={r.seg} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 100, fontSize: 11, fontWeight: 600, color: "#ccc", flexShrink: 0 }}>{r.seg}</div>
                            <div style={{ flex: 1, background: "#2a2a3e", borderRadius: 4, height: 18, overflow: "hidden" }}>
                                <div style={{ width: `${(r.roas / maxRoas) * 100}%`, height: "100%", background: roasColor(r.roas), borderRadius: 4, transition: "width 0.5s" }} />
                            <div style={{ width: 55, textAlign: "right", fontSize: 12, fontWeight: 800, color: roasColor(r.roas) }}>{r.roas.toFixed(2)}x</div>
                            <div style={{ width: 70, textAlign: "right", fontSize: 11, color: "#888" }}>{fc.symbol}{(r.revenue / 1e6).toFixed(1)}M</div>
                    ))}
            </div>

            {/* Data Table */}
            <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('segDetail')} ({grp})</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {cols.map(c => (
                                <th key={c.key} onClick={() => c.key !== "seg" && handleSort(c.key)}
                                    style={{ padding: "6px 8px", color: sortBy === c.key ? "#6366f1" : "#888", textAlign: c.key === "seg" ? "left" : "right", fontWeight: 700, cursor: c.key !== "seg" ? "pointer" : "default", whiteSpace: "nowrap", userSelect: "none" }}>
                                    {c.label}{sortBy === c.key ? (sortDir < 0 ? " ▼" : " ▲") : ""}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r, idx) => (
                            <tr key={r.seg} style={{ borderBottom: "1px solid #222", background: idx % 2 === 0 ? "transparent" : "rgba(99,102,241,0.03)" }}>
                                {cols.map(c => (
                                    <td key={c.key} style={{
                                        padding: "8px 8px", textAlign: c.key === "seg" ? "left" : "right",
                                        fontWeight: c.key === "roas" ? 800 : 500,
                                        color: c.key === "roas" ? roasColor(r.roas) : c.key === "spend" ? "#ef4444" : c.key === "revenue" ? "#22c55e" : "#ddd",
                                    }}>
                                        {c.fmt ? c.fmt(r[c.key]) : r[c.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

            {/* Analysis Insights */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#22c55e", marginBottom: 10 }}>✅ {txt("highEff")}</div>
                    {sorted.filter(r => r.roas >= 4).map(r => (
                        <div key={r.seg} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #2a2a3e", fontSize: 12 }}>
                            <span style={{ color: "#ccc" }}>{r.seg}</span>
                            <span style={{ color: "#22c55e", fontWeight: 700 }}>{r.roas.toFixed(2)}x</span>
                    ))}
                    {sorted.filter(r => r.roas >= 4).length === 0 && <div style={{ color: "#666", fontSize: 11 }}>{txt('none')}</div>}
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 10 }}>?️ {txt('lowEff')}</div>
                    {sorted.filter(r => r.roas < 2.5).map(r => (
                        <div key={r.seg} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #2a2a3e", fontSize: 12 }}>
                            <span style={{ color: "#ccc" }}>{r.seg}</span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>{r.roas.toFixed(2)}x — {fc.symbol}{(r.spend / 1e6).toFixed(1)}M {txt("wasteEst")}</span>
                    ))}
                    {sorted.filter(r => r.roas < 2.5).length === 0 && <div style={{ color: "#666", fontSize: 11 }}>{txt('allNormal')}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
);
}


// ── Tab: Risk Budget ──────────────────────────────

// ── REMOVED: RISK_DATA hardcoded array — now API-driven ──

function calcPnL(r) {
    const gross_revenue = r.revenue;
    const settle_deduction = gross_revenue * (r.settle_deduction_pct / 100);
    const net_revenue = gross_revenue - settle_deduction;
    const cogs = gross_revenue * (r.cost_of_goods_pct / 100);
    const return_loss = r.orders * (r.return_rate / 100) * r.return_cost_per_unit;
    const fx_loss = r.spend * (r.fx_exposure / 100);
    const gross_profit = net_revenue - cogs - return_loss - fx_loss - r.spend;
    const gross_margin = (gross_profit / gross_revenue) * 100;
    // Risk level calculation
    const roas_gap = r.roas - r.risk_threshold_roas;
    const risk_loss_est = roas_gap < 0 ? Math.abs(roas_gap) * r.spend : 0;
    return { gross_revenue, settle_deduction, net_revenue, cogs, return_loss, fx_loss, gross_profit, gross_margin, risk_loss_est };
}

function RiskBudgetTab() {
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k), [lang, t]);
    const fc = useFmtC();
    const [selected, setSelected] = useState(null);
    const [showDeduction, setShowDeduction] = useState(true);

    // ✅ API-driven data (zero mock)
    const [riskData, setRiskData] = useState([]);
    useEffect(() => {
        API('/api/v423/rollup/risk').then(d => {
            const rows = d.rows ?? [];
            setRiskData(rows);
            if (rows[0]) setSelected(rows[0].campaign);
        }).catch(() => setRiskData([]));
    }, []);

    const selRow = riskData.find(r => r.campaign === selected);
    const pnl = selRow ? calcPnL(selRow) : null;

    const totalRiskLoss = riskData.reduce((s, r) => s + calcPnL(r).risk_loss_est, 0);
    const totalSettleDeduction = riskData.reduce((s, r) => s + calcPnL(r).settle_deduction, 0);
    const totalGrossProfit = riskData.reduce((s, r) => s + calcPnL(r).gross_profit, 0);
    const totalReturnLoss = riskData.reduce((s, r) => s + calcPnL(r).return_loss, 0);

    const riskLevel = (r) => {
        const p = calcPnL(r);
        if (r.roas < 2.5 || p.gross_profit < 0) return { label: txt('riskStatus.danger'), color: "#ef4444" };
        if (r.roas < 3.0) return { label: txt('riskStatus.caution'), color: "#eab308" };
        return { label: txt('riskStatus.normal'), color: "#22c55e" };
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* All Summary KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                    { l: txt("riskLossEst"), v: fc.symbol + (totalRiskLoss / 1e6).toFixed(1) + "M", c: "#ef4444", i: "🔴" },
                    { l: txt("settleDeductSum"), v: fc.symbol + (totalSettleDeduction / 1e6).toFixed(1) + "M", c: "#f97316", i: "💸" },
                    { l: txt("returnLossSum"), v: fc.symbol + (totalReturnLoss / 1e6).toFixed(1) + "M", c: "#eab308", i: "↩" },
                    { l: txt("grossProfitTotal"), v: fc.symbol + (totalGrossProfit / 1e6).toFixed(1) + "M", c: totalGrossProfit >= 0 ? "#22c55e" : "#ef4444", i: "💰" },
                ].map(({ l, v, c, i }) => (
                    <div key={l} style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${c}` }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{i} {l}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
                ))}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
                {/* Campaign Risk List */}
                <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>{txt('campaignPnlRisk')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {riskData.map(r => {
                            const p = calcPnL(r);
                            const rl = riskLevel(r);
                            return (
                                <div key={r.campaign} onClick={() => setSelected(r.campaign)}
                                    style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${selected === r.campaign ? "#6366f1" : "#2a2a3e"}`, background: selected === r.campaign ? "rgba(99,102,241,0.08)" : "rgba(42,42,62,0.5)", transition: "all 0.2s" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: pcol(r.platform) }}>{r.platform}</div>
                                            <div style={{ fontSize: 11, color: "#888" }}>{r.campaign}</div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: rl.color, background: rl.color + "18", padding: "2px 8px", borderRadius: 6 }}>{rl.label}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                                        <div style={{ color: "#888" }}>ROAS <span style={{ color: r.roas >= 3 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{r.roas.toFixed(2)}x</span></div>
                                        <div style={{ color: "#888" }}>{txt('settleDeductWord')} <span style={{ color: "#f97316", fontWeight: 700 }}>{r.settle_deduction_pct}%</span></div>
                                        <div style={{ color: "#888" }}>{txt('returnRateWord')} <span style={{ color: r.return_rate > 10 ? "#ef4444" : "#eab308", fontWeight: 700 }}>{r.return_rate}%</span></div>
                                    {p.risk_loss_est > 0 && (
                                        <div style={{ marginTop: 6, fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠ {txt("lossEstWarning").replace("{amount}", (p.risk_loss_est / 1e6).toFixed(1))}</div>
                                    )}
                            
                                    </div>
                                  </div>
                                </div>
                              </div>
    </div>
);
                        })}
                </div>

                {/* Analysis Insights */}
                {pnl && selRow && (
                    <div style={{ background: "var(--bg-card, #1e1e2e)", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, color: pcol(selRow.platform) }}>{selRow.campaign} — {txt("pnlStructure")}</div>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>{txt('pnlDesc')}</div>

                        {/* Waterfall Chart (CSS) */}
                        <div style={{ display: "grid", gap: 0, marginBottom: 20 }}>
                            {[
                                { label: txt('pnlTotalRev'), value: pnl.gross_revenue, color: "#6366f1", bar: true, positive: true },
                                { label: `${txt("pnlSettle")} (−${selRow.settle_deduction_pct}%)`, value: -pnl.settle_deduction, color: "#f97316", bar: true, positive: false },
                                { label: txt('pnlNetRev'), value: pnl.net_revenue, color: "#4f8ef7", bar: false, divider: true },
                                { label: `${txt("pnlCogs")} (−${selRow.cost_of_goods_pct}%)`, value: -pnl.cogs, color: "#ef4444", bar: true, positive: false },
                                { label: `${txt('pnlReturnLoss')} (${txt('returnRateWord')} ${selRow.return_rate}%)`, value: -pnl.return_loss, color: "#eab308", bar: true, positive: false },
                                { label: txt('pnlAdSpend'), value: -selRow.spend, color: "#ef4444", bar: true, positive: false },
                                selRow.fx_exposure > 0 ? { label: `${txt('pnlFxLoss')} (${selRow.fx_exposure}%)`, value: -pnl.fx_loss, color: "#a855f7", bar: true, positive: false } : null,
                            ].filter(Boolean).map(item => (
                                <div key={item.label} style={{ padding: "7px 0", borderBottom: item.divider ? "2px solid #333" : "1px solid #2a2a3e" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: item.bar ? 4 : 0 }}>
                                        <span style={{ fontSize: 12, color: item.divider ? "#fff" : "#ccc", fontWeight: item.divider ? 700 : 400 }}>{item.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: item.value >= 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace" }}>
                                            {item.value >= 0 ? "+" : "-"}{fc.symbol}{(Math.abs(item.value) / 1e6).toFixed(2)}M
                                        </span>
                                    {item.bar && (
                                        <div style={{ height: 5, background: "#2a2a3e", borderRadius: 4, overflow: "hidden" }}>
                                            <div style={{ width: `${Math.min(100, (Math.abs(item.value) / pnl.gross_revenue) * 100)}%`, height: "100%", background: item.color, borderRadius: 4, transition: "width 0.5s" }} />
                                    )}
                            ))}
                            {/* 최종 Profit */}
                            <div style={{ padding: "12px 0 0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 14, fontWeight: 900 }}>💰</span>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: pnl.gross_profit >= 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace" }}>
                                        {pnl.gross_profit >= 0 ? "+" : ""}{fc.symbol}{(pnl.gross_profit / 1e6).toFixed(2)}M
                                    </span>
                                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{txt("grossMarginLabel")}: <span style={{ color: pnl.gross_margin >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{pnl.gross_margin.toFixed(1)}%</span></div>
                        </div>

                        {/* Risk Budget Alert */}
                        {pnl.risk_loss_est > 0 && (
                            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 12 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 4 }}>{txt('riskWarn')}</div>
                                <div style={{ fontSize: 11, color: "#ddd" }}>ROAS {selRow.roas.toFixed(2)}x ({selRow.risk_threshold_roas}x)</div>
                                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginTop: 4 }}>{fc.symbol}{(pnl.risk_loss_est / 1e6).toFixed(2)}M</div>
                                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{fc.symbol}{((selRow.spend - (pnl.gross_profit < 0 ? Math.abs(pnl.gross_profit) : 0)) / 1e6).toFixed(1)}M)}

                        {/* Key Metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[
                                [txt("budgetRemaining"), "₩" + (selRow.budget / 1e6).toFixed(1) + "M", "#888"],
                                [txt("colActSpend"), "₩" + (selRow.spend / 1e6).toFixed(1) + "M", "#ef4444"],
                                [txt('settlePct'), selRow.settle_deduction_pct + "%", "#f97316"],
                                [txt('returnPct'), selRow.return_rate + "%", selRow.return_rate > 10 ? "#ef4444" : "#eab308"],
                                [txt('cogsPct'), selRow.cost_of_goods_pct + "%", "#a855f7"],
                                ["ROAS", selRow.roas.toFixed(2) + "x", selRow.roas >= 3 ? "#22c55e" : "#ef4444"],
                            ].map(([l, v, c]) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "#2a2a3e", borderRadius: 6, fontSize: 11 }}>
                                    <span style={{ color: "#888" }}>{l}</span>
                                    <span style={{ fontWeight: 700, color: c }}>{v}</span>
                            ))})}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
", border: "var(--border)", text: "var(--text-1)", muted: "var(--text-3)", accent:'#6366f1', green:'#22c55e', yellow:'#f59e0b', purple:'#a855f7', orange:'#f97316', cyan:'#06b6d4', pink:'#ec4899' };
    const CARD = { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20 };
    const steps = [
        { n:'1️⃣', title:txt('guideStep1Title'), desc:txt('guideStep1Desc'), c:C.accent },
        { n:'2️⃣', title:txt('guideStep2Title'), desc:txt('guideStep2Desc'), c:C.green },
        { n:'3️⃣', title:txt('guideStep3Title'), desc:txt('guideStep3Desc'), c:C.yellow },
        { n:'4️⃣', title:txt('guideStep4Title'), desc:txt('guideStep4Desc'), c:C.purple },
        { n:'5️⃣', title:txt('guideStep5Title'), desc:txt('guideStep5Desc'), c:C.orange },
        { n:'6️⃣', title:txt('guideStep6Title'), desc:txt('guideStep6Desc'), c:C.cyan },
    ];
    const tabs = [
        { icon:'📊', name:txt('tabSummary'), desc:txt('guideTabSummary'), c:C.accent },
        { icon:'📦', name:'SKU', desc:txt('guideTabSku'), c:C.yellow },
        { icon:'📣', name:txt('tabCampaign'), desc:txt('guideTabCampaign'), c:C.pink },
        { icon:'🎬', name:txt('tabCreator'), desc:txt('guideTabCreator'), c:C.purple },
        { icon:'🌐', name:txt('tabPlatform'), desc:txt('guideTabPlatform'), c:C.green },
        { icon:'🔬', name:txt('tabSegment'), desc:txt('guideTabSegment'), c:C.orange },
        { icon:'⚠️', name:txt('tabRisk'), desc:txt('guideTabRisk'), c:'#ef4444' },
    ];
    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ ...CARD, background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(168,85,247,0.08))', borderColor:C.accent+'40', textAlign:'center', padding:32 }}>
                <div style={{ fontSize:44 }}>📈</div>
                <div style={{ fontWeight:900, fontSize:22, marginTop:8, color:C.text }}>{txt('guideTitle')}</div>
                <div style={{ fontSize:13, color:C.muted, marginTop:6, maxWidth:560, margin:'6px auto 0', lineHeight:1.7 }}>{txt('guideSubtitle')}</div>
            <div style={CARD}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:C.text }}>{txt('guideStepsTitle')}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                    {steps.map((s,i) => (
                        <div key={i} style={{ background:s.c+'0a', border:`1px solid ${s.c}25`, borderRadius:12, padding:16 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                <span style={{ fontSize:20 }}>{s.n}</span>
                                <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{s.title}</span>
                            <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>{s.desc}</div>
                    ))}
            </div>
            <div style={CARD}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:C.text }}>{txt('guideTabsTitle')}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                    {tabs.map((tab,i) => (
                        <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px', background: 'var(--surface)', borderRadius:10, border:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:22, flexShrink:0 }}>{tab.icon}</span>
                            <div>
                                <div style={{ fontWeight:700, fontSize:13, color:tab.c }}>{tab.name}</div>
                                <div style={{ fontSize:11, color:C.muted, marginTop:3, lineHeight:1.6 }}>{tab.desc}</div>
                        </div>
                    ))}
            </div>
            <div style={{ ...CARD, background:'rgba(34,197,94,0.05)', borderColor:C.green+'30' }}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:12, color:C.text }}>💡 {txt('guideTipsTitle')}</div>
                <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:C.muted, lineHeight:2.2 }}>
                    <li>{txt('guideTip1')}</li>
                    <li>{txt('guideTip2')}</li>
                    <li>{txt('guideTip3')}</li>
                    <li>{txt('guideTip4')}</li>
                    <li>{txt('guideTip5')}</li>
                </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
);
}

export default function RollupDashboard() {
    const { t, lang: ctxLang } = useI18n();
    const lang = ctxLang || 'ko';
    const txt = useCallback((k, fb) => {
        return LOC[lang]?.[k] ?? LOC.en?.[k] ?? t(`rollup.${k}`, fb || k);
    }, [lang, t]);

    // SecurityGuard integration
    const { addAlert } = useGlobalData();
    useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

    const [tab, setTab] = useState("summary");
    const TABS = [
        { id: "summary", label: `📊 ${txt("tabSummary")}` },
        { id: "sku", label: `📦 SKU` },
        { id: "campaign", label: `📣 ${txt("tabCampaign")}` },
        { id: "creator", label: `🎬 ${txt("tabCreator")}` },
        { id: "platform", label: `🌐 ${txt("tabPlatform")}` },
        { id: "segment", label: `🔬 ${txt("tabSegment")}` },
        { id: "risk", label: `⚠️ ${txt("tabRisk")}` },
        { id: "guide", label: txt("tabGuide") || '📖 Guide' },
    ];
    const [period, setPeriod] = useState("daily");
    const [n, setN] = useState(14);

    const tabStyle = (id) => ({
        padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
        background: tab === id ? "#6366f1" : "#2a2a3e",
        color: tab === id ? "#fff" : "#aaa",
        border: "none", transition: "all 0.2s",
    });

    const uDay = txt('unitDay'); const uWeek = txt('unitWeek');
    const uMonth = txt('unitMonth'); const uYear = txt('unitYear'); const uSeason = txt('unitSeason');

    return (
<div style={{ display: "grid", gap: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📈 {txt('title')}</h2>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{txt('subtitle')}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Period toggle */}
                    <div style={{ display: "flex", background: "#2a2a3e", borderRadius: 8, padding: 3, flexWrap: "wrap" }}>
                        {[["daily", txt('periodDaily')], ["weekly", txt('periodWeekly')], ["monthly", txt('periodMonthly')], ["yearly", txt('periodYearly')], ["seasonal", txt('periodSeasonal')]].map(([val, lbl]) => (
                            <button key={val} onClick={() => {
                                setPeriod(val);
                                setN(val === "daily" ? 14 : val === "weekly" ? 8 : val === "monthly" ? 6 : val === "yearly" ? 3 : 4);
                            }}
                                style={{
                                    padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
                                    background: period === val ? "#6366f1" : "transparent", color: period === val ? "#fff" : "#aaa"
                                }}>
                                {lbl}
                            </button>
                        ))}
                    {/* N selector */}
                    <select value={n} onChange={(e) => setN(Number(e.target.value))}
                        style={{ background: "#2a2a3e", border: "1px solid #444", borderRadius: 8, padding: "5px 10px", color: 'var(--text-1)', fontSize: 12 }}>
                        {period === "daily"
                            ? [7, 14, 30, 60].map(v => <option key={v} value={v}>{v}{uDay}</option>)
                            : period === "weekly"
                                ? [4, 8, 12, 24].map(v => <option key={v} value={v}>{v}{uWeek}</option>)
                                : period === "monthly"
                                    ? [3, 6, 12, 24].map(v => <option key={v} value={v}>{v}{uMonth}</option>)
                                    : period === "yearly"
                                        ? [2, 3, 5].map(v => <option key={v} value={v}>{v}{uYear}</option>)
                                        : [4, 6, 8].map(v => <option key={v} value={v}>{v}{uSeason}</option>)}
                    </select>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TABS.map((tb) => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={tabStyle(tb.id)}>{tb.label}</button>
                ))}

            {/* Tab Content */}
            {tab === "summary" && <SummaryTab period={period} n={n} />}
            {tab === "sku" && <SkuTab period={period} n={n} />}
            {tab === "campaign" && <CampaignTab period={period} n={n} />}
            {tab === "creator" && <CreatorTab period={period} n={n} />}
            {tab === "platform" && <PlatformTab period={period} n={n} />}
            {tab === "segment" && <SegmentTab />}
            {tab === "risk" && <RiskBudgetTab />}
            {tab === "guide" && <RollupGuideTab txt={txt} />}
      </div>
      </div>
      </div>
      </div>
      </div>
);
}

