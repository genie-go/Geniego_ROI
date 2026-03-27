const fs = require('fs');

function fixAttribution() {
    const attrPath = 'd:/project/GeniegoROI/frontend/src/pages/Attribution.jsx';
    let code = fs.readFileSync(attrPath, 'utf8');

    // 1. Hero Badges
    code = code.replace(
        /<span className="badge badge-blue">Exact Shapley 2\^n<\/span>/g,
        '<span className="badge badge-blue">{t(\'attrData.badgeShapley\', \'Exact Shapley 2^n\')}</span>'
    );
    code = code.replace(
        /<span className="badge badge-purple">Bayesian MMM<\/span>/g,
        '<span className="badge badge-purple">{t(\'attrData.badgeMmm\', \'Bayesian MMM\')}</span>'
    );
    code = code.replace(
        /<span className="badge badge-teal">Double ML Uplift<\/span>/g,
        '<span className="badge badge-teal">{t(\'attrData.badgeUplift\', \'Double ML Uplift\')}</span>'
    );

    // 2. Titles & Explanations
    code = code.replace(
        /🎯 Channelper Exact Shapley 기여도/g,
        "{t('attrData.shapleyTitle', '🎯 채널별 Exact Shapley 기여도')}"
    );
    code = code.replace(
        /Bayesian Marketing Mix Model<\/strong> — Ridge-regularised OLS \+ Adstock decay \+ Hill saturation. Bootstrap 200회 posterior credible intervals./g,
        "Bayesian Marketing Mix Model</strong> — {t('attrData.mmmDescText', 'Ridge 정규화 OLS + Adstock 감쇠 + Hill 곡선 포화. 200회 부트스트랩 사후 신뢰구간.')}"
    );
    code = code.replace(
        /📈 Bayesian MMM — Channel 기여도 \(52주 시계열\)/g,
        "{t('attrData.mmmTitle', '📈 Bayesian MMM — 채널 기여도 (52주 시계열)')}"
    );
    code = code.replace(
        /📈 MMM 시뮬레이션 결과/g,
        "{t('attrData.mmmSim', '📈 MMM 시뮬레이션 결과')}"
    );
    code = code.replace(
        /Markov Chain \+ Incremental Uplift \(Double ML\)<\/strong> — Conversion 경로 Markov 전이행렬 \+ Channel 제거 효과. Incremental Uplift는 Robinson's Partial회귀로 진짜 증분 효과 산출./g,
        "Markov Chain + Incremental Uplift (Double ML)</strong> — {t('attrData.markovDescText', '전환 경로 마르코프 전이행렬 + 채널 제거 효과 및 로빈슨 편회귀를 활용한 순 증분 효과 산출.')}"
    );
    code = code.replace(
        /🔗 Markov Chain — Removal Effect/g,
        "{t('attrData.markovTitle', '🔗 Markov Chain — 제거 효과 (Removal Effect)')}"
    );
    code = code.replace(
        /📐 Incremental Uplift \(Double ML\)/g,
        "{t('attrData.upliftTitle', '📐 증분 모델 (Double ML Uplift)')}"
    );
    code = code.replace(
        /Robinson's Partial회귀 기반 순Count 증분 효과/g,
        "{t('attrData.upliftSub', '로빈슨 편회귀 기반의 순수 증분 효과')}"
    );
    code = code.replace(
        /Beta-Binomial Thompson Sampling<\/strong> — Prior Beta\(1,1\) \+ Posterior Beta\(1\+conv, 1\+fail\)\. P\(winner\) via 5,000-sample Monte-Carlo\. 95% Credible Interval 표시\./g,
        "Beta-Binomial Thompson Sampling</strong> — {t('attrData.abDescText', '사전 베타 분포 및 사후 분포 기반 5,000회 몬테카를로 시뮬레이션. 95% 신뢰구간 표시.')}"
    );
    code = code.replace(
        /📅 주차per 구매 코호트 — 리텐션\(%\)/g,
        "{t('attrData.cohortTitle', '📅 주차별 구매 코호트 — 유지율(%)')}"
    );
    code = code.replace(
        /💰 Channelper LTV vs CAC/g,
        "{t('attrData.ltvcacTitle', '💰 채널별 LTV vs CAC')}"
    );
    code = code.replace(
        /실Time 이상감지 \(Anomaly Detection\)<\/strong> — Z-score 기반 Channel Performance 이탈 모니터링\. \|Z\| &gt; 2\.0 시 Auto Notification, 7일 Move Trend Analysis\./g,
        "{t('attrData.anomalyHeadDesc', '실시간 이상감지 (Anomaly Detection)')}</strong> — {t('attrData.anomalyBodyText', 'Z-score 기반 채널 타당성 모니터링. |z| > 2.0 시 자동 알림, 7일 이동 평균 트렌드 분석.')}"
    );
    code = code.replace(
        />{alertCount}건 주의 필요</g,
        ">{alertCount}{t('attrData.alertCountSuffix', '건 주의 필요')}<"
    );
    code = code.replace(
        /모델 Compare 레이더 뷰 \+ A-Score<\/strong> — 5가지 어트리뷰션 모델\(Shapley, MMM, Markov, Last-Touch, First-Touch\)의 Channel 배분을 레이더 Chart로 Compare\. A-Score는 모델 간 합의도\(일관성\)를 0-100으로 산정합니다\./g,
        "A-Score</strong> — {t('attrData.compareDescText', '5가지 주요 어트리뷰션 모델 기여도를 레이더 차트로 비교하고, 결과 일치도를 기반으로 신뢰도(A-Score)를 산정합니다.')}"
    );
    
    // Fix missing budget adjustments
    code = code.replace(
        /Total: /g,
        "{t('attrData.totalStr', 'Total:')} "
    );

    fs.writeFileSync(attrPath, code);

    // Now let's inject missing navs to Locales (ko/en)
    const patchGnavScript = `
    const fs = require('fs');
    function applyGnav() {
        ['ko.js', 'en.js'].forEach(lang => {
            const p = 'd:/project/GeniegoROI/frontend/src/i18n/locales/' + lang;
            let lc = fs.readFileSync(p, 'utf8');
            lc = lc.replace(/export default (en|ko);[\\s\\n]*$/, '');
            
            const gNavData = {
                "accountPerformance": "Account Perf",
                "budgetTracker": "Budget Tracker",
                "attribution": "Attribution",
                "channelKpi": "Channel KPI",
                "graphScore": "Graph Score"
            };
            
            if (lang === 'ko.js') {
                gNavData.accountPerformance = "어카운트 성과";
                gNavData.budgetTracker = "예산 트래커";
                gNavData.attribution = "어트리뷰션";
                gNavData.channelKpi = "채널 KPI";
                gNavData.graphScore = "그래프 스코어";
            }
            
            const append = \`\\n\${lang==='ko.js'?'ko':'en'}.gNav = Object.assign(\${lang==='ko.js'?'ko':'en'}.gNav || {}, \${JSON.stringify(gNavData, null, 4)});\nexport default \${lang==='ko.js'?'ko':'en'};\n\`;
            
            fs.writeFileSync(p, lc + append);
        });
    }
    applyGnav();
    `;
    fs.writeFileSync('d:/project/GeniegoROI/frontend/applyGnav.cjs', patchGnavScript);
}

fixAttribution();
