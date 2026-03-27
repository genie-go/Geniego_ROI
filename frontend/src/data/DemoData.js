// ----------------------------------------------------------------------------------
// GeniegoROI Enterprise Demo Data Store (Cosmetics Brand: e.g. Dr.Jart+ Benchmark)
// Ensures complete consistency across all dashboards for free/demo users.
// ----------------------------------------------------------------------------------

export const DEMO_GLOBAL = {
    totalRevenue: 1258400000,
    totalSpend: 185000000,
    totalImpressions: 485002000,
    totalReach: 132100000,
    totalConversions: 108520,
    roas: 680.2,
    cpa: 1704,
    activeCampaigns: 42,
    totalCustomers: 450500,
    activeMembers: 110200,
    kakaoFriends: 85000,
    npsScore: 78
};

// 30 Days of realistic D2C + Amazon multi-channel trends
export const DEMO_DAILY_TRENDS = Array.from({length: 30}).map((_, i) => {
    const day = i + 1;
    const isWeekend = (day % 7 === 6 || day % 7 === 0);
    const baseSpend = 5000000;
    const bump = isWeekend ? 1.4 : 1.0;
    const spend = Math.round(baseSpend * bump * (1 + (Math.random()*0.2 - 0.1)));
    const roas = 550 + Math.random()*200;
    const revenue = Math.round(spend * (roas/100));
    
    return {
        date: `03.${day.toString().padStart(2, '0')}`,
        impr: Math.round(spend / 4.5),
        reach: Math.round(spend / 6.2),
        spend: spend,
        clicks: Math.round(spend / 150),
        ctr: (1.5 + Math.random()*1.5).toFixed(2),
        cpc: Math.round(150 + Math.random()*50),
        cpm: Math.round(3500 + Math.random()*1500),
        conv: Math.round(revenue / 45000),
        roas: Math.round(roas),
        revenue: revenue,
        budget: 6000000
    };
});

// Deep Hierarchy Campaigns
export const DEMO_CAMPAIGNS = [
    {
        id: 'c1', name: "S/S 시카페어(Cicapair) 진정 글로우 캠페인 (KR+US)", status: "mktStatActive", budget: "₩55,000,000", spend: 42500000, impr: 125000000, reach: 45000000, clicks: 850000, conv: 14200, cpa: "₩2,992", roas: "750%",
        adsets: [
            { id: 's1', name: "[KR] 뷰티 인플루언서 리뷰 (Meta/TT)", status: "mktStatActive", budget: "₩25,000,000", spend: 18000500, impr: 45000000, reach: 18000000, clicks: 350000, conv: 5890, cpa: "₩3,056", roas: "610%",
                ads: [
                    { id: 'a1', name: "@Pony_Makeup_Review_V1", status: "mktStatActive", budget: "₩10,000,000", spend: 8000000, impr: 25000000, reach: 12000000, clicks: 184500, conv: 3500, cpa: "₩2,285", roas: "880%" },
                    { id: 'a2', name: "@Risabae_Unboxing_V2", status: "mktStatActive", budget: "₩8,000,000", spend: 6500000, impr: 12000000, reach: 4500000, clicks: 91500, conv: 1620, cpa: "₩4,012", roas: "440%" },
                    { id: 'a3', name: "Micro-fluencer Compilation", status: "mktStatActive", budget: "₩7,000,000", spend: 3500500, impr: 8000000, reach: 1500000, clicks: 74000, conv: 770, cpa: "₩4,546", roas: "390%" }
                ]
            },
            { id: 's2', name: "[US] Amazon Prime Day DPA", status: "mktStatActive", budget: "₩30,000,000", spend: 24499500, impr: 80000000, reach: 27000000, clicks: 500000, conv: 8310, cpa: "₩2,948", roas: "852%",
                ads: [
                    { id: 'a4', name: "Amazon_Sponsored_Products_Cica", status: "mktStatActive", budget: "₩15,000,000", spend: 12000000, impr: 45000000, reach: 15000000, clicks: 300000, conv: 5120, cpa: "₩2,343", roas: "950%" },
                    { id: 'a5', name: "US_Target_CartAbandon", status: "mktStatActive", budget: "₩15,000,000", spend: 12499500, impr: 35000000, reach: 12000000, clicks: 200000, conv: 3190, cpa: "₩3,918", roas: "750%" }
                ]
            }
        ]
    },
    {
        id: 'c2', name: "세라마이딘(Ceramidin) 겨울철 보습 캠페인", status: "mktStatEnded", budget: "₩45,000,000", spend: 45000000, impr: 98000000, reach: 35000000, clicks: 650000, conv: 11200, cpa: "₩4,017", roas: "520%",
        adsets: [
            { id: 's3', name: "올리브영 연계 프로모션", status: "mktStatEnded", budget: "₩20,000,000", spend: 20000000, impr: 48000000, reach: 18000000, clicks: 350000, conv: 6900, cpa: "₩2,898", roas: "635%", ads: [] },
            { id: 's4', name: "자사몰(D2C) 신규 가입 유도", status: "mktStatEnded", budget: "₩25,000,000", spend: 25000000, impr: 50000000, reach: 17000000, clicks: 300000, conv: 4300, cpa: "₩5,813", roas: "405%", ads: [] }
        ]
    },
    {
        id: 'c3', name: "바이탈 하이드라(Vital Hydra) 남성 타겟팅 확장", status: "mktStatWait", budget: "₩20,000,000", spend: 0, impr: 0, reach: 0, clicks: 0, conv: 0, cpa: "-", roas: "-",
        adsets: [
            { id: 's5', name: "유튜브 인스트림", status: "mktStatWait", budget: "₩10,000,000", spend: 0, impr: 0, reach: 0, clicks: 0, conv: 0, cpa: "-", roas: "-", ads: [] },
            { id: 's6', name: "구글 디스플레이 네트워크", status: "mktStatWait", budget: "₩10,000,000", spend: 0, impr: 0, reach: 0, clicks: 0, conv: 0, cpa: "-", roas: "-", ads: [] }
        ]
    }
];

// 4. CHANNELS
export const DEMO_CHANNELS = [
    { id: 'meta', name: "Meta (Facebook/IG)", spend: 65000000, revenue: 380500000, roas: 585, clicks: 425000, conv: 12500 },
    { id: 'google', name: "Google Ads (PMax)", spend: 45000000, revenue: 355000000, roas: 788, clicks: 315000, conv: 11100 },
    { id: 'tiktok', name: "TikTok Ads", spend: 18000000, revenue: 45000000, roas: 250, clicks: 185000, conv: 1850 },
    { id: 'amazon', name: "Amazon SPA/DSP", spend: 35000000, revenue: 315000000, roas: 900, clicks: 202000, conv: 14150 },
    { id: 'naver', name: "Naver GFA/SA", spend: 22000000, revenue: 162900000, roas: 740, clicks: 120000, conv: 8200 }
];

// 5. BUDGET OVERVIEW (For BudgetTracker)
export const DEMO_BUDGET = {
    totalAllocated: 350000000,
    totalSpent: 185000000,
    balance: 165000000,
    burnRate: 52.8,
    projectedSpend: 342000000,
    categories: [
        { name: "퍼포먼스 소셜 (Meta/TT)", value: 45, color: "#a855f7" },
        { name: "리테일 미디어 (Amazon/OliveYoung)", value: 25, color: "#f97316" },
        { name: "검색 광고 (Google/Naver SA)", value: 20, color: "#3b82f6" },
        { name: "리타겟팅 및 기타 (CRM)", value: 10, color: "#22c55e" }
    ]
};
