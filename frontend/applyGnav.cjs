
    const fs = require('fs');
    function applyGnav() {
        ['ko.js', 'en.js'].forEach(lang => {
            const p = 'd:/project/GeniegoROI/frontend/src/i18n/locales/' + lang;
            let lc = fs.readFileSync(p, 'utf8');
            lc = lc.replace(/export default (en|ko);[\s\n]*$/, '');
            
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
            
            const append = `\n${lang==='ko.js'?'ko':'en'}.gNav = Object.assign(${lang==='ko.js'?'ko':'en'}.gNav || {}, ${JSON.stringify(gNavData, null, 4)});
export default ${lang==='ko.js'?'ko':'en'};
`;
            
            fs.writeFileSync(p, lc + append);
        });
    }
    applyGnav();
    