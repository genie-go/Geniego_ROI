const fs=require('fs'),path=require('path'),dir=__dirname+'/src/i18n/locales/';
function addBlock(f,d){const p=path.join(dir,f);let s=fs.readFileSync(p,'utf8');
    const ei=s.indexOf('"influencer":{');
    if(ei>0){
        // Merge into existing block
        let dd=0,i=s.indexOf('{',ei+12);
        for(;i<s.length;i++){if(s[i]==='{')dd++;else if(s[i]==='}'){dd--;if(dd===0)break;}}
        const existBlock=s.substring(ei,i);
        const keysToAdd=[];
        for(const[k,v] of Object.entries(d)){
            if(!existBlock.includes(`"${k}"`)){keysToAdd.push(`"${k}":${JSON.stringify(v)}`);}
        }
        if(keysToAdd.length>0){
            s=s.substring(0,i)+','+keysToAdd.join(',')+s.substring(i);
        }
    } else {
        // Create new block
        const lb=s.lastIndexOf('}');
        s=s.substring(0,lb)+',"influencer":'+JSON.stringify(d)+s.substring(lb);
    }
    fs.writeFileSync(p,s);
    try{delete require.cache[require.resolve(p)];require(p);console.log('OK',f);}catch(e){console.log('ERR',f,e.message.slice(0,80));}
}

// Base keys that every language needs (from ko.js existing keys + guide expansion)
const base={
    title:"Influencer & UGC Hub",subtitle:"Creator identity unification · Modular contracts · Auto settlement · ROI ranking · Content reuse",
    tab_identity:"🧑 Creator Unified",tab_contract:"📝 Contracts",tab_settle:"💰 Settlement",tab_roi:"🏆 ROI Ranking",tab_ugc:"⭐ UGC Reviews",tab_ai_eval:"🤖 AI Evaluation",tab_guide:"📖 Guide",
    liveSyncMsg:"Real-time cross-tab sync active",reviewReq:"🔴 Review Required ",reviewSub:" items — Pending signature · Expired rights · Settlement anomaly",
    totalCreators:"Total Creators",dupSuspected:"Duplicate Suspected",dupSub:"Multi-handle detection",unverifiedChannels:"Unverified Channels",connectedPlatforms:"Connected Platforms",
    dupAlert:"⚠ Impersonation detected — ",reviewRequired:"Immediate review required",
    tagDup:"⚠ Action Required",btnCollapse:"▲ Collapse",btnChannelDetails:"▼ Channel Info",verified:"✓ Verified",unverified:"Unverified",
    unitCases:" cases",unitPersons:" persons",viewsPerOrder:"views/order",
    fixed:"Fixed",performance:"Performance",fixedPerf:"Fixed+Perf",
    expired:"Expired",daysLeft:"days left",signed:"✓ Signed",pending:"⏳ Pending",rejected:"✗ Rejected",
    stPaid:"Done",stPartial:"Partial",stUnpaid:"Unpaid",stOverpaid:"Overpaid",
    perContract:"Per contract",actualPaid:"Actual Paid",difference:"Difference",recover:"Recover",payRemaining:"Pay Remaining",
    roiRanking:"ROI Ranking",hvlsDesc:"High views but low conversion content — review CTA placement and product relevance",
    contentReuseSub:"High engagement content suitable for ad creative or product page reuse",
    adReady:"Ad Ready",checkRights:"Check Rights",engagement:"Engagement",adCreative:"Ad Creative",productPage:"Product Page",
    positive:"Positive",neutral:"Neutral",negative:"Negative",
    kpiAllReviews:"Total Reviews",kpiAllReviewsSub:"All channels combined",kpiAvgRating:"Avg Rating",kpiAvgRatingSub:"Weighted average",
    kpiNegReviews:"Negative Reviews",kpiNegReviewsSub:"Requires attention",kpiPosRate:"Positive Rate",kpiPosRateSub:"Positive/Total",
    channelRatingTitle:"Channel Rating Analysis",negKeywordTitle:"Negative Keywords",posLabel:"Positive",negLabel:"Negative",totalItems:"Total",
    settleContractAmt:"Contract Amount",settleActualPaid:"Actual Paid",settleDiff:"Difference",settleMatchLabel:"Match",
    settleDocs:"Documents",settleNoDocs:"No documents",settleActualPaidLabel:"Actual Paid:",settleContractLabel:"Contract",
    // Guide 15 steps
    guideTitle:"Influencer & UGC Management Guide",guideSub:"Complete workflow from creator identity unification to AI evaluation and settlement.",
    guideStepsTitle:"Usage Steps",
    guideStep1Title:"Creator Channel Registration",guideStep1Desc:"Register creator social media channels and verify identity.",
    guideStep2Title:"Duplicate Detection",guideStep2Desc:"Detect duplicate/impersonation accounts and handle merge/block.",
    guideStep3Title:"Contract Setup",guideStep3Desc:"Set up contracts with fixed fees, performance rates, and rights scope.",
    guideStep4Title:"e-Signature Process",guideStep4Desc:"Send electronic signature requests and track signing status.",
    guideStep5Title:"Whitelist Management",guideStep5Desc:"Manage ad conversion rights (whitelist) and monitor expiration.",
    guideStep6Title:"Settlement & Auto-Audit",guideStep6Desc:"Auto-calculate payables with tax deduction and detect anomalies.",
    guideStep7Title:"Content Performance Analysis",guideStep7Desc:"Analyze views, engagement rate, and order conversion for each content.",
    guideStep8Title:"High View/Low Sale Analysis",guideStep8Desc:"Identify high-view but low-sale content and analyze root causes.",
    guideStep9Title:"Content Reuse Strategy",guideStep9Desc:"Reuse high-engagement content as ad creatives or product page materials.",
    guideStep10Title:"UGC Review Collection",guideStep10Desc:"Automatically collect UGC reviews by channel and perform sentiment analysis.",
    guideStep11Title:"Negative Keyword Monitoring",guideStep11Desc:"Track negative keyword trends to manage brand reputation risks.",
    guideStep12Title:"AI Creator Evaluation",guideStep12Desc:"AI automatically evaluates creator performance, engagement, and ROI.",
    guideStep13Title:"Renewal Decision",guideStep13Desc:"Review AI-based renewal recommendations before re-contracting.",
    guideStep14Title:"Settlement Report Generation",guideStep14Desc:"Auto-generate settlement statements with tax calculations for download.",
    guideStep15Title:"Monthly Influencer Report",guideStep15Desc:"Compile monthly reports covering all influencer ROI, revenue contribution, and content performance.",
    guideTabsTitle:"Tab Features",guideIdentName:"Creator Unified",guideIdentDesc:"Identity verification and duplicate management",
    guideContractName:"Contracts",guideContractDesc:"Fixed/performance contracts and rights management",
    guideSettleName:"Settlement",guideSettleDesc:"Auto-settlement and anomaly detection",
    guideRoiName:"ROI Ranking",guideRoiDesc:"Performance-based creator ranking",
    guideUgcName:"UGC Reviews",guideUgcDesc:"Cross-channel review and sentiment analysis",
    guideAiName:"AI Evaluation",guideAiDesc:"AI-powered creator scoring and recommendations",
    guideGuideName:"Guide",guideGuideDesc:"Complete usage guide",
    guideTipsTitle:"Tips & Best Practices",
    guideTip1:"Always verify creator identity before signing contracts.",
    guideTip2:"Set whitelist expiry alerts at least 90 days in advance.",
    guideTip3:"Use AI evaluation scores as a baseline, not the sole decision factor.",
    guideTip4:"Regularly review high-view/low-sale content for CTA optimization.",
    guideTip5:"Keep settlement documents organized for audit compliance.",
    guideTip6:"Start whitelist renewal process at least 30 days before expiry.",
    guideTip7:"Creators with AI evaluation scores below 70 require in-depth review before renewal."
};

// Language-specific overrides
const overrides={
    ar:{title:"مركز المؤثرين وUGC",subtitle:"توحيد هوية المبدع · العقود · التسوية · تصنيف ROI",
        tab_identity:"🧑 توحيد المبدعين",tab_contract:"📝 العقود",tab_settle:"💰 التسوية",tab_roi:"🏆 تصنيف ROI",tab_ugc:"⭐ مراجعات UGC",tab_ai_eval:"🤖 تقييم AI",tab_guide:"📖 الدليل",
        liveSyncMsg:"المزامنة عبر التبويبات نشطة",guideTitle:"دليل إدارة المؤثرين",guideSub:"سير عمل شامل من توحيد الهوية إلى التقييم والتسوية",
        guideStep7Title:"تحليل أداء المحتوى",guideStep8Title:"تحليل المشاهدات العالية/المبيعات المنخفضة",guideStep9Title:"استراتيجية إعادة استخدام المحتوى",
        guideStep10Title:"جمع مراجعات UGC",guideStep11Title:"مراقبة الكلمات السلبية",guideStep12Title:"تقييم المبدعين بالذكاء الاصطناعي",
        guideStep13Title:"قرار التجديد",guideStep14Title:"إنشاء تقرير التسوية",guideStep15Title:"تقرير المؤثرين الشهري"},
    zh:{title:"网红与UGC中心",tab_identity:"🧑 创作者统一",guideTitle:"网红管理指南",guideSub:"从创作者身份统一到AI评估和结算的完整流程",
        guideStep7Title:"内容绩效分析",guideStep8Title:"高浏览/低销售分析",guideStep9Title:"内容复用策略",guideStep10Title:"UGC评论收集",
        guideStep11Title:"负面关键词监控",guideStep12Title:"AI创作者评估",guideStep13Title:"续约决策",guideStep14Title:"结算报告生成",guideStep15Title:"月度网红报告"},
    "zh-TW":{title:"網紅與UGC中心",guideTitle:"網紅管理指南",guideSub:"從創作者身份統一到AI評估和結算的完整流程",
        guideStep7Title:"內容績效分析",guideStep8Title:"高瀏覽/低銷售分析",guideStep9Title:"內容複用策略",guideStep10Title:"UGC評論收集",
        guideStep11Title:"負面關鍵詞監控",guideStep12Title:"AI創作者評估",guideStep13Title:"續約決策",guideStep14Title:"結算報告生成",guideStep15Title:"月度網紅報告"},
    de:{title:"Influencer & UGC Hub",guideTitle:"Influencer-Management Leitfaden",guideSub:"Vollständiger Workflow von der Identitätsvereinheitlichung bis zur KI-Bewertung",
        guideStep7Title:"Content-Performance-Analyse",guideStep8Title:"Hohe Aufrufe/Geringe Verkäufe",guideStep9Title:"Content-Wiederverwertung",
        guideStep10Title:"UGC-Bewertungen sammeln",guideStep11Title:"Negative Keywords überwachen",guideStep12Title:"KI-Creator-Bewertung",
        guideStep13Title:"Verlängerungsentscheidung",guideStep14Title:"Abrechnungsbericht",guideStep15Title:"Monatlicher Influencer-Bericht"},
    es:{title:"Centro Influencer y UGC",guideTitle:"Guía de Gestión de Influencers",guideSub:"Flujo completo desde la unificación de identidad hasta la evaluación y liquidación",
        guideStep7Title:"Análisis de rendimiento",guideStep8Title:"Alto vistas/Bajas ventas",guideStep9Title:"Estrategia de reutilización",
        guideStep10Title:"Recopilación de reseñas UGC",guideStep11Title:"Monitoreo de palabras negativas",guideStep12Title:"Evaluación IA de creadores",
        guideStep13Title:"Decisión de renovación",guideStep14Title:"Informe de liquidación",guideStep15Title:"Informe mensual de influencers"},
    fr:{title:"Hub Influenceur & UGC",guideTitle:"Guide de gestion des Influenceurs",guideSub:"Flux complet de l'unification d'identité à l'évaluation et règlement",
        guideStep7Title:"Analyse des performances du contenu",guideStep8Title:"Vues élevées/Ventes faibles",guideStep9Title:"Stratégie de réutilisation",
        guideStep10Title:"Collecte d'avis UGC",guideStep11Title:"Surveillance des mots négatifs",guideStep12Title:"Évaluation IA des créateurs",
        guideStep13Title:"Décision de renouvellement",guideStep14Title:"Rapport de règlement",guideStep15Title:"Rapport mensuel des influenceurs"},
    pt:{title:"Hub Influenciador & UGC",guideTitle:"Guia de Gestão de Influenciadores",guideSub:"Fluxo completo da unificação de identidade à avaliação e liquidação"},
    ru:{title:"Хаб Инфлюенсеров и UGC",guideTitle:"Руководство по управлению инфлюенсерами",guideSub:"Полный рабочий процесс от унификации до оценки и расчётов"},
    hi:{title:"इन्फ्लुएंसर और UGC हब",guideTitle:"इन्फ्लुएंसर प्रबंधन गाइड",guideSub:"क्रिएटर पहचान एकीकरण से AI मूल्यांकन तक संपूर्ण वर्कफ़्लो"},
    th:{title:"ศูนย์อินฟลูเอนเซอร์และ UGC",guideTitle:"คู่มือการจัดการอินฟลูเอนเซอร์",guideSub:"เวิร์กโฟลว์ครบวงจรจากการรวมตัวตนถึงการประเมิน AI"},
    vi:{title:"Trung tâm Influencer & UGC",guideTitle:"Hướng dẫn quản lý Influencer",guideSub:"Quy trình hoàn chỉnh từ thống nhất danh tính đến đánh giá AI"},
    id:{title:"Hub Influencer & UGC",guideTitle:"Panduan Manajemen Influencer",guideSub:"Alur kerja lengkap dari penyatuan identitas hingga evaluasi AI"}
};

const files=['ar','zh','zh-TW','de','es','fr','pt','ru','hi','th','vi','id'];
for(const lang of files){
    const data={...base,...(overrides[lang]||{})};
    addBlock(lang+'.js',data);
}
console.log('Influencer full i18n: 12 remaining languages done');
