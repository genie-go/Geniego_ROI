const fs = require('fs');
const file = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\Marketing.jsx';
let c = fs.readFileSync(file, 'utf8');

// Fix 1: Replace the broken calcMetric body + missing functions/components
// The corruption starts at "sumSpend += spent;\r\n        sumImps += imps;\r\n        const eTime"
// and goes through "const m2Def = ALL_METRICS.find(m => m.id === secondaryMetricId);"

const brokenStart = '        sumSpend += spent;\r\n        sumImps += imps;\r\n        const eTime = new Date(endDate).getTime();';
const brokenEnd = "    const m2Def = ALL_METRICS.find(m => m.id === secondaryMetricId);";

const idxStart = c.indexOf(brokenStart);
const idxEnd = c.indexOf(brokenEnd);

if (idxStart < 0 || idxEnd < 0) {
    console.log('❌ Cannot find broken section. idxStart=', idxStart, 'idxEnd=', idxEnd);
    // try to find what's there
    const idx1 = c.indexOf('sumSpend += spent;');
    const idx2 = c.indexOf('sumImps += imps;');
    console.log('sumSpend at', idx1, 'sumImps at', idx2);
    console.log('Context around sumImps:', c.substring(idx2, idx2 + 200));
    process.exit(1);
}

const replacement = `        sumSpend += spent;
        sumImps += imps;
        sumClicks += cls;
        sumConv += conv;
        sumReach += rch;
        sumRev += (spent * roas);
    });

    switch(metricId) {
        case 'spend': return sumSpend;
        case 'impressions': return sumImps;
        case 'clicks': return sumClicks;
        case 'conv': return sumConv;
        case 'reach': return sumReach;
        case 'ctr': return sumImps > 0 ? (sumClicks / sumImps) * 100 : 0;
        case 'cpc': return sumClicks > 0 ? sumSpend / sumClicks : 0;
        case 'cpm': return sumImps > 0 ? (sumSpend / sumImps) * 1000 : 0;
        case 'roas': return sumSpend > 0 ? (sumRev / sumSpend) : 0;
        default: return 0;
    }
};

/* ─── Trend Data Generator (synced to selected date range + DEMO_DAILY_TRENDS) ─── */
const TREND_METRIC_MAP = {
    spend: 'adSpend', impressions: 'visitors', clicks: 'orders',
    conv: 'newCustomers', reach: 'returningCustomers', roas: 'roas',
    ctr: 'conversionRate', cpc: 'avgOrderValue', cpm: 'avgOrderValue',
};

const generateTrendData = (campaigns, startDate, endDate, metric1, metric2) => {
    const data = [];
    const sTime = new Date(startDate).getTime();
    const eTime = new Date(endDate).getTime();
    const days = Math.max(1, Math.round((eTime - sTime) / 86400000) + 1);
    const m1Total = calcMetric(campaigns, metric1);
    const m2Total = calcMetric(campaigns, metric2);

    const trendMap = {};
    if (Array.isArray(DEMO_DAILY_TRENDS)) {
        DEMO_DAILY_TRENDS.forEach(tr => { trendMap[tr.date] = tr; });
    }
    const tf1 = TREND_METRIC_MAP[metric1] || 'revenue';
    const tf2 = TREND_METRIC_MAP[metric2] || 'adSpend';
    const tSum1 = DEMO_DAILY_TRENDS.reduce((a, tr) => a + (tr[tf1] || 0), 0) || 1;
    const tSum2 = DEMO_DAILY_TRENDS.reduce((a, tr) => a + (tr[tf2] || 0), 0) || 1;
    const seed = (n) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;

    for (let i = 0; i < days; i++) {
        const d = new Date(sTime + i * 86400000);
        const dateStr = d.toISOString().slice(5, 10);
        const fullDate = d.toISOString().slice(0, 10);
        const dow = d.getDay();
        const tr = trendMap[fullDate];
        let m1Val, m2Val;
        if (tr) {
            m1Val = m1Total * ((tr[tf1] || 0) / tSum1) * DEMO_DAILY_TRENDS.length;
            m2Val = m2Total * ((tr[tf2] || 0) / tSum2) * DEMO_DAILY_TRENDS.length;
        } else {
            const wf = (dow === 0 || dow === 6) ? 0.65 + seed(i * 3) * 0.1 : 1.0;
            const wave = Math.sin(i * 0.45 + 1.2) * 0.15;
            const n1 = (seed(i * 7 + 13) - 0.5) * 0.25;
            const n2 = (seed(i * 11 + 29) - 0.5) * 0.25;
            const ramp = 1 + (i / days) * 0.12;
            m1Val = (m1Total / days) * (1 + wave + n1) * wf * ramp;
            m2Val = (m2Total / days) * (1 + wave * 0.8 + n2) * wf * ramp;
        }
        const md1 = ALL_METRICS.find(m => m.id === metric1);
        const md2 = ALL_METRICS.find(m => m.id === metric2);
        data.push({
            date: dateStr,
            [metric1]: (md1?.isRate || md1?.isMultiplier) ? parseFloat(Math.max(0, m1Val).toFixed(2)) : Math.round(Math.max(0, m1Val)),
            [metric2]: (md2?.isRate || md2?.isMultiplier) ? parseFloat(Math.max(0, m2Val).toFixed(2)) : Math.round(Math.max(0, m2Val)),
        });
    }
    return data;
};

/* ─── Amazon-Style Landing Tab ────────────────────────────────────────── */
function AmazonOverviewTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { sharedCampaigns } = useGlobalData();
    
    // Default dates: dynamic based on current month
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    
    // Multi-slots for KPI cards
    const [slots, setSlots] = useState(['spend', 'impressions', 'clicks', 'ctr', 'roas']);
    const primaryMetricId = slots[0];
    const secondaryMetricId = slots[1];

    // 1. Strict Date Filtering
    const allValidCampaigns = useMemo(() => {
        const sTime = new Date(startDate).getTime();
        const eTime = new Date(endDate).getTime();
        const valid = sharedCampaigns.filter(c => {
            const cStart = new Date(c.startDate).getTime();
            const cEnd = new Date(c.endDate).getTime();
            return cStart <= eTime && cEnd >= sTime;
        }).map(c => {
            const cStart = new Date(c.startDate).getTime();
            const cEnd = new Date(c.endDate).getTime();
            const campDays = Math.max(1, (cEnd - cStart) / 86400000);
            const oStart = Math.max(sTime, cStart);
            const oEnd = Math.min(eTime, cEnd);
            const oDays = Math.max(0, (oEnd - oStart) / 86400000);
            const ratio = Math.min(1, oDays / campDays);
            return {
                ...c,
                spent: Math.round((c.spent || 0) * ratio),
                impressions: Math.round((c.impressions || 0) * ratio),
                clicks: Math.round((c.clicks || 0) * ratio),
                reach: Math.round((c.reach || 0) * ratio),
                conv: Math.round((c.conv || 0) * ratio),
            };
        });
        if (valid.length === 0) return [];
        return valid;
    }, [startDate, endDate, sharedCampaigns]);

    // Trend chart dynamic data calculation synced to selected date range
    const chartData = useMemo(() => generateTrendData(allValidCampaigns, startDate, endDate, primaryMetricId, secondaryMetricId), [allValidCampaigns, startDate, endDate, primaryMetricId, secondaryMetricId]);
    const m1Def = ALL_METRICS.find(m => m.id === primaryMetricId);
    const m2Def = ALL_METRICS.find(m => m.id === secondaryMetricId);`;

c = c.substring(0, idxStart) + replacement + c.substring(idxEnd + brokenEnd.length);

// Fix 2: Add DEMO_DAILY_TRENDS import
if (!c.includes('DEMO_DAILY_TRENDS')) {
    c = c.replace(
        "import { useGlobalData } from '../context/GlobalDataContext.jsx';",
        "import { useGlobalData } from '../context/GlobalDataContext.jsx';\nimport { DEMO_DAILY_TRENDS } from '../data/demoSeedData.js';"
    );
}

fs.writeFileSync(file, c, 'utf8');
console.log('✅ Marketing.jsx fixed successfully!');
console.log('Lines:', c.split('\n').length);
