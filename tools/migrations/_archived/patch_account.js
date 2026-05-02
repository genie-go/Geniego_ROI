const fs = require('fs');
let lines = fs.readFileSync('frontend/src/pages/AccountPerformance.jsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('const { AdCampaigns } = useGlobalData();'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('}, [currentCampaigns, t]);'));

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `    const { sharedCampaigns, AdCampaigns } = useGlobalData();
    const currentCampaigns = sharedCampaigns || (isDemo ? AdCampaigns : realCampaigns);

    const ACTIVE_META_DATA = useMemo(() => {
        let mapped = [];
        if (currentCampaigns && currentCampaigns.length > 0) {
            mapped = currentCampaigns.map((c, idx) => {
                const teams = [t("marketing.teamA") || "A팀_퍼포먼스", t("marketing.teamB") || "B팀_리타게팅", t("marketing.teamC") || "C팀_세일즈", t("marketing.teamD") || "D팀_브랜딩"];
                let objective = "Awareness";
                if (c.name?.includes("보습") || c.name?.includes("Traffic") || c.name?.includes("트래픽")) objective = "Consideration";
                if (c.name?.includes("프로모션") || c.name?.includes("Conversion") || c.name?.includes("세일") || c.name?.includes("전환")) objective = "Conversion";
                let tIdx = idx % teams.length;
                return {
                    ...c,
                    account_team: teams[tIdx],
                    objective: objective,
                    roas: typeof c.roas === 'string' ? parseFloat(c.roas.replace(/[^0-9.]/g, '')) : (c.roas || c.kpi?.actualRoas || 3.5),
                    spend: c.spend || c.spent || c.budget || 0,
                    allocated: c.budget ? (typeof c.budget === 'string' ? parseFloat(c.budget.replace(/[^0-9.]/g, '')) : c.budget) : ((c.spend || c.spent || 0) * 1.5),
                    impressions: c.impressions || Math.floor((c.spend || c.spent || c.budget || 0) / 8),
                    clicks: c.clicks || Math.floor((c.spend || c.spent || c.budget || 0) / 800),
                    ctr: c.ctr || 1.5,
                    conv: c.conv || c.kpi?.actualConv || Math.floor((c.spend || c.spent || c.budget || 0) / 25000),
                    adSets: c.adsets || []
                };
            });
        }
        return mapped;
    }, [currentCampaigns, t]);

    useEffect(() => {
        if (!ACTIVE_META_DATA || !ACTIVE_META_DATA.length) {
            setChartData([]);
            return;
        }
        const data = [];
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const dStr = new Date(now.getTime() - i * 864e5).toISOString().slice(5, 10);
            let aw = 0, cons = 0, cv = 0;
            ACTIVE_META_DATA.forEach(c => {
                const step = (c.spend / 14) * (0.8 + Math.random() * 0.4);
                if (c.objective === 'Awareness') aw += step;
                if (c.objective === 'Consideration') cons += step;
                if (c.objective === 'Conversion') cv += step;
            });
            data.push({ date: dStr, awareness: Math.floor(aw), consideration: Math.floor(cons), conversion: Math.floor(cv) });
        }
        setChartData(data);
    }, [ACTIVE_META_DATA]);`.split('\n');

    lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
    fs.writeFileSync('frontend/src/pages/AccountPerformance.jsx', lines.join('\n'));
    console.log("Patched successfully!");
} else {
    console.log("Could not find start or end index.");
}
