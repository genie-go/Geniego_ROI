const fs = require('fs');

function installAttrData() {
    const koMap = {
        "badgeShapley": "Exact Shapley 2^n",
        "badgeMmm": "Bayesian MMM",
        "badgeUplift": "Double ML Uplift",
        "shapleyTitle": "🎯 채널별 Exact Shapley 기여도",
        "mmmDescText": "Ridge 정규화 OLS + Adstock 감쇠 + Hill 곡선 포화. 200회 부트스트랩 사후 신뢰구간.",
        "mmmTitle": "📈 Bayesian MMM — 채널 기여도 (52주 시계열)",
        "mmmSim": "📈 MMM 시뮬레이션 결과",
        "markovDescText": "전환 경로 마르코프 전이행렬 + 채널 제거 효과 및 로빈슨 편회귀를 활용한 순 증분 효과 산출.",
        "markovTitle": "🔗 Markov Chain — 제거 효과 (Removal Effect)",
        "upliftTitle": "📐 증분 모델 (Double ML Uplift)",
        "upliftSub": "로빈슨 편회귀 기반의 순수 증분 효과",
        "abDescText": "사전 베타 분포 및 사후 분포 기반 5,000회 몬테카를로 시뮬레이션. 95% 신뢰구간 표시.",
        "cohortTitle": "📅 주차별 구매 코호트 — 유지율(%)",
        "ltvcacTitle": "💰 채널별 LTV vs CAC",
        "anomalyHeadDesc": "실시간 이상감지 (Anomaly Detection)",
        "anomalyBodyText": "Z-score 기반 채널 타당성 모니터링. |z| > 2.0 시 자동 알림, 7일 이동 평균 트렌드 분석.",
        "alertCountSuffix": "건 주의 필요",
        "compareDescText": "5가지 주요 어트리뷰션 모델 기여도를 레이더 차트로 비교하고, 결과 일치도를 기반으로 신뢰도(A-Score)를 산정합니다.",
        "totalStr": "Total:"
    };

    const enMap = {
        "badgeShapley": "Exact Shapley 2^n",
        "badgeMmm": "Bayesian MMM",
        "badgeUplift": "Double ML Uplift",
        "shapleyTitle": "🎯 Channel Exact Shapley Contribution",
        "mmmDescText": "Ridge-regularised OLS + Adstock decay + Hill saturation. Bootstrap 200 iterations for posterior credible intervals.",
        "mmmTitle": "📈 Bayesian MMM — Channel Contribution (52w Timeseries)",
        "mmmSim": "📈 MMM Simulation Results",
        "markovDescText": "Markov Transition Matrix for Conversion Paths + Channel Removal Effect. Robinson's Partial Regression for real incremental uplift.",
        "markovTitle": "🔗 Markov Chain — Removal Effect",
        "upliftTitle": "📐 Incremental Uplift (Double ML)",
        "upliftSub": "Pure incremental effect via Robinson's Partial Regression",
        "abDescText": "Prior Beta(1,1) → Posterior Beta(1+conv, 1+fail). 5k-sample Monte-Carlo. 95% CI displayed.",
        "cohortTitle": "📅 Weekly Purchase Cohort — Retention(%)",
        "ltvcacTitle": "💰 Channel LTV vs CAC",
        "anomalyHeadDesc": "Realtime Anomaly Detection",
        "anomalyBodyText": "Z-score anomaly monitoring. Auto-notifications triggered for |Z| > 2.0, with 7-day moving trend analysis.",
        "alertCountSuffix": " Alerts Requires Action",
        "compareDescText": "Compare resource allocation from 5 attribution models via radar chart. A-Score evaluates model agreement and consistency (0-100).",
        "totalStr": "Total:"
    };

    const runLocaleObj = (lang, mapObj) => {
        const p = 'd:/project/GeniegoROI/frontend/src/i18n/locales/' + lang + '.js';
        let code = fs.readFileSync(p, 'utf8');
        code = code.replace(new RegExp("export default " + lang + ";[\\s\\n]*$"), '');
        
        const append = '\\n' + lang + '.attrData = Object.assign(' + lang + '.attrData || {}, ' + JSON.stringify(mapObj, null, 4) + ');\n\nexport default ' + lang + ';\n';
        fs.writeFileSync(p, code + append);
    };

    runLocaleObj('ko', koMap);
    runLocaleObj('en', enMap);

    console.log('AttrData successfully patched');
}

installAttrData();
