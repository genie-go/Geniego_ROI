const fs = require('fs');

function updateLocales() {
    const koPath = 'd:/project/GeniegoROI/frontend/src/i18n/locales/ko.js';
    const enPath = 'd:/project/GeniegoROI/frontend/src/i18n/locales/en.js';

    let koContent = fs.readFileSync(koPath, 'utf8');
    let enContent = fs.readFileSync(enPath, 'utf8');

    // For ko.js
    const koUpdates = `Object.assign(ko.dash, {
        "naverName": "네이버 검색광고",
        "chTrendKpi": "매체별 주요 KPI 트렌드",
        "chPerfDash": "채널별 퍼포먼스 대시보드",
        "colChan": "채널명",
        "colRoas": "ROAS",
        "colAchieve": "목표달성",
        "colSpend": "지출예산",
        "colCtr": "클릭률",
        "colConv": "전환율",
        "colTrend": "추이",
        "genderDist": "성별 분포",
        "ageDist": "연령별 분포",
        "topRegion": "방문 상위 지역",
        "convFunnel": "전환 퍼널 분석",
        "chIntelTitle": "채널 인텔리전스",
        "chIntelDesc1": "채널 카드 또는 테이블에서",
        "chIntelDesc2": "채널명을 클릭",
        "chIntelDesc3": "하면",
        "chIntelDesc4": "해당 채널의 상세 분석이 표시됩니다:"
    });
    `;

    // For en.js
    const enUpdates = `Object.assign(en.dash, {
        "naverName": "Naver Ads",
        "chTrendKpi": "Channel KPI Trends",
        "chPerfDash": "Channel Performance Dash",
        "colChan": "Channel",
        "colRoas": "ROAS",
        "colAchieve": "Achieve",
        "colSpend": "Spend",
        "colCtr": "CTR",
        "colConv": "CVR",
        "colTrend": "Trend",
        "genderDist": "Gender Dist.",
        "ageDist": "Age Dist.",
        "topRegion": "Top Regions",
        "convFunnel": "Conversion Funnel",
        "chIntelTitle": "Channel Intelligence",
        "chIntelDesc1": "Click on a ",
        "chIntelDesc2": "Channel Name",
        "chIntelDesc3": " to view",
        "chIntelDesc4": "detailed performance analytics:"
    });
    `;

    // We can inject it right before `export default ko;`
    koContent = koContent.replace('export default ko;', koUpdates + '\nexport default ko;');
    enContent = enContent.replace('export default en;', enUpdates + '\nexport default en;');

    fs.writeFileSync(koPath, koContent);
    fs.writeFileSync(enPath, enContent);
    console.log("Locales updated!");
}

updateLocales();
