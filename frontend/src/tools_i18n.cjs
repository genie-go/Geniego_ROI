const fs = require('fs');
const path = require('path');

const files = [
    'DashMarketing.jsx',
    'DashInfluencer.jsx',
    'DashSalesGlobal.jsx',
    'DashSystem.jsx',
    'DashChannelKPI.jsx'
];

const dict = {
    '총 매출': 't(\\\'dash.totalRev\\\', \\\'Total Rev\\\')',
    '총 광고비': 't(\\\'dash.totalSpend\\\', \\\'Total Spend\\\')',
    '평균 ROAS': 't(\\\'dash.avgRoas\\\', \\\'Avg ROAS\\\')',
    '채널 수': 't(\\\'dash.chCount\\\', \\\'Channels\\\')',
    '운영 채널': 't(\\\'dash.activeCh\\\', \\\'Active Ch.\\\')',
    '총 클릭': 't(\\\'dash.totalClicks\\\', \\\'Total Clicks\\\')',
    '평균 CTR': 't(\\\'dash.avgCtr\\\', \\\'Avg CTR\\\')',
    '전환율': 't(\\\'dash.convRate\\\', \\\'Conv. Rate\\\')',
    '전체 채널 종합': 't(\\\'dash.allChSummary\\\', \\\'All Channel Summary\\\')',
    '채널 트렌드 비교': 't(\\\'dash.chTrend\\\', \\\'Channel Trend\\\')',
    '채널별 성과 요약': 't(\\\'dash.chPerfSumm\\\', \\\'Channel Perf. Summary\\\')',
    '채널명': 't(\\\'dash.chName\\\', \\\'Channel\\\')',
    '클릭률': 't(\\\'dash.ctr\\\', \\\'CTR\\\')',
    '지출예산': 't(\\\'dash.spendBudget\\\', \\\'Spend\\\')',
    'CPC': 't(\\\'dash.cpc\\\', \\\'CPC\\\')',
    '채널별 ROAS': 't(\\\'dash.chRoas\\\', \\\'ROAS by Channel\\\')',
    '채널 카드 클릭 → 5섹션(Reach/Engagement/Traffic/Conversion/ROI) 상세 분석': 't(\\\'dash.chClickHint\\\', \\\'Click Channel Card → 5-Section Details\\\')',
    '5섹션 분석': 't(\\\'dash.sec5Anal\\\', \\\'5-Section Analysis\\\')',
    '노출 성과': 't(\\\'dash.reachPerf\\\', \\\'Reach Perf.\\\')',
    '광고비': 't(\\\'dash.adSpend\\\', \\\'Ad Spend\\\')',    
    '매출': 't(\\\'dash.rev\\\', \\\'Rev\\\')',
    '참여': 't(\\\'dash.engagement\\\', \\\'Engagement\\\')',
    '영상 조회수': 't(\\\'dash.videoViews\\\', \\\'Video Views\\\')',
    '평균 시청시간': 't(\\\'dash.avgViewTime\\\', \\\'Avg View Time\\\')',
    '트래픽': 't(\\\'dash.traffic\\\', \\\'Traffic\\\')',
    '평챕체류시간': 't(\\\'dash.avgDuration\\\', \\\'Avg Duration\\\')',
    '전환': 't(\\\'dash.conversion\\\', \\\'Conversion\\\')',
    '전환수': 't(\\\'dash.convCount\\\', \\\'Conversions\\\')',
    '구매수': 't(\\\'dash.purchaseCount\\\', \\\'Purchases\\\')',
    '회원가입': 't(\\\'dash.signups\\\', \\\'Signups\\\')',
    '장바구니': 't(\\\'dash.cartAdds\\\', \\\'Cart Adds\\\')',
    '매출 및 ROI': 't(\\\'dash.revRoi\\\', \\\'Rev & ROI\\\')',
    '광고 매출': 't(\\\'dash.adRev\\\', \\\'Ad Revenue\\\')',
    '순수익': 't(\\\'dash.netProfit\\\', \\\'Net Profit\\\')',
    '성별 분포': 't(\\\'dash.genderDist\\\', \\\'Gender Dist.\\\')',
    '여성': 't(\\\'dash.female\\\', \\\'Female\\\')',
    '남성': 't(\\\'dash.male\\\', \\\'Male\\\')',
    '연령대 분포': 't(\\\'dash.ageDist\\\', \\\'Age Dist.\\\')',
    '지역별 매출 Top5': 't(\\\'dash.topRegRev\\\', \\\'Top Regions\\\')',
    '전환 퓴널': 't(\\\'dash.convFunnel\\\', \\\'Conv. Funnel\\\')',
    '광고 유형 성과': 't(\\\'dash.adTypePerf\\\', \\\'Ad Type Perf.\\\')',
    '실시간 인플루언서 연동 활성': 't(\\\'dash.liveInf\\\', \\\'Live Influencer Sync\\\')',
    '쿠폰 연결': 't(\\\'dash.couponConn\\\', \\\'Coupons Linked\\\')',
    'P&L 영업이익': 't(\\\'dash.pnlProfit\\\', \\\'P&L Operating Profit\\\')',
    '광고비 누적': 't(\\\'dash.cumSpend\\\', \\\'Cumulative Spend\\\')',
    '크리에이터 분석': 't(\\\'dash.creatorAnal\\\', \\\'Creator Analysis\\\')'
};

for (const f of files) {
    const target = path.join('d:/project/GeniegoROI/frontend/src/components/dashboards', f);
    if (!fs.existsSync(target)) continue;
    let code = fs.readFileSync(target, 'utf8');

    // Fix NaN% division by zero safely
    code = code.replace(/\/ CHAN_LIST\.length/g, '/ (Math.max(1, CHAN_LIST.length))');
    
    // First, map straightforward Korean replacements if inside strings
    for (const [kr, trans] of Object.entries(dict)) {
        // match inside quotes 'kr' -> trans
        code = code.replace(new RegExp(`'${kr}'`, 'g'), trans);
        
        // match inside quotes "kr" -> trans
        code = code.replace(new RegExp(`"${kr}"`, 'g'), trans);
        
        // match JSX text: >kr< -> >{trans}<
        code = code.replace(new RegExp(`>${kr}<`, 'g'), `>{${trans}}<`);
        
        // template literals: \`kr\` -> \`\${trans}\`
        code = code.replace(new RegExp(`\\\`${kr}\\\``, 'g'), `\\\`\\\${${trans}}\\\``);
    }
    
    fs.writeFileSync(target, code, 'utf8');
    console.log('Processed', f);
}
