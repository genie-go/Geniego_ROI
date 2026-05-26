// campaignConstants.js
// CampaignManager.jsx 와 AIRecommendTab.jsx 공통 상Count

const IS_ = () => typeof window !== 'undefined' && localStorage.getItem('genie_has_real_keys') !== '1';

export const PRODUCT_CATALOG = [];

export const CAT_TO_PRODUCT = {
    electronics: ['Electronics/Audio', 'Electronics/Input', 'Electronics/Peripherals', 'Electronics/Camera', 'Electronics/Charging'],
    beauty: ['Beauty/Skincare', 'Beauty/Makeup'],
    fashion: ['Fashion/Apparel', 'Fashion/Accessories'],
    food: ['Food/Health'],
    general: ['Household/Kitchen'],
    sports: ['Sports/Equipment'],
    travel: ['Travel/Accommodation', 'Travel/Aviation', 'Travel/Tours'],
    digital: ['Digital/Apps', 'Digital/SaaS', 'Digital/Content'],
    forwarding: [],
    purchasing: [],
    finance: ['Finance/Loan', 'Finance/Card', 'Finance/Investment', 'Finance/Account'],
    insurance: ['Insurance/Life', 'Insurance/Health', 'Insurance/Auto', 'Insurance/Property'],
    medical: ['Medical/Clinic', 'Medical/Telemed', 'Medical/HealthCheck', 'Medical/Specialty'],
    tax: ['Tax/Income', 'Tax/Corporate', 'Tax/VAT', 'Tax/Accounting'],
    legal: ['Legal/Civil', 'Legal/Corporate', 'Legal/Criminal', 'Legal/Family'],
    etc_service: ['Service/Consulting', 'Service/Education', 'Service/Repair', 'Service/Misc'],
};

export const CAT_OPTIONS = [
    {
        id: 'beauty', catKey: 'beauty', label: '💄 Beauty & Cosmetics', route: 'Beauty products (domestic & global)',
        color: '#ec4899', icon: '💄',
        context: 'Skincare, makeup, fragrance, haircare K-beauty brands',
        suggestions: ['Beauty brand Instagram ad strategy', 'Skincare SNS marketing recommendations', 'Cosmetic targeting ad effectiveness', 'Beauty TikTok ad budget allocation'],
    },
    {
        id: 'fashion', catKey: 'fashion', label: '👗 Fashion & Apparel', route: 'Fashion products (domestic & global)',
        color: '#a855f7', icon: '👗',
        context: `Women's, men's wear, outerwear, accessories fashion brands`,
        suggestions: ['Fashion brand SNS ad strategy', 'Apparel shopping mall ad channel recommendations', 'Fashion influencer marketing effectiveness', 'Seasonal fashion ad budget allocation'],
    },
    {
        id: 'general', catKey: 'general', label: '🛍 General & Household', route: 'Household goods e-commerce',
        color: '#22c55e', icon: '🛍',
        context: 'Kitchen, cleaning, interior, lifestyle goods e-commerce',
        suggestions: ['Household goods Naver Shopping ad', 'General goods Coupang vs Naver ad comparison', 'Home interior Kakao ad strategy', 'Household goods per-channel budget recommendations'],
    },
    {
        id: 'food', catKey: 'food', label: '🥗 Food & Health', route: 'Food and health supplement sales',
        color: '#f97316', icon: '🥗',
        context: 'Health supplements, processed foods, organic food brands',
        suggestions: ['Health supplement ad marketing recommendations', 'Food brand YouTube ad effectiveness', 'Organic food SNS marketing strategy', 'Food Coupang vs Naver Shopping comparison'],
    },
    {
        id: 'electronics', catKey: 'electronics', label: '📱 Electronics & IT', route: 'Electronics and IT devices sales',
        color: '#3b82f6', icon: '📱',
        context: 'Smartphone accessories, home appliances, computers, IT devices',
        suggestions: ['Electronics Google ad effectiveness', 'IT devices YouTube ad strategy', 'Electronics brand per-channel budget allocation', 'Smart device ad marketing recommendations'],
    },
    {
        id: 'forwarding', catKey: 'forwarding', label: '🚢 Freight Forwarding', route: '🇰🇷 Korea→🌏 Overseas',
        color: '#4f8ef7', icon: '🚢',
        context: 'Korea → Overseas international freight forwarding service',
        suggestions: ['Forwarding ad effectiveness', 'Overseas forwarding marketing strategy', 'International courier SNS ad', 'Forwarding Naver vs Google comparison', 'Overseas shipping keyword ad'],
    },
    {
        id: 'purchasing', catKey: 'purchasing', label: '🛒 Personal Shopping', route: '🌏 Overseas→🇰🇷 Korea',
        color: '#a855f7', icon: '🛒',
        context: 'Overseas → Korea personal shopping & customs clearance service',
        suggestions: ['Personal shopping ad marketing strategy', 'Overseas direct purchase SNS ad', 'Personal shopping Instagram ad', 'US purchase agent keyword ad'],
    },
    {
        id: 'travel', catKey: 'travel', label: '✈️ Travel & Accommodation', route: 'Travel, tourism & accommodation services',
        color: '#06b6d4', icon: '✈️',
        context: 'Domestic/overseas travel packages, hotels, flights, tours, leisure',
        suggestions: ['Travel product Google ad strategy', 'Accommodation Meta ad targeting', 'Flight search ad optimization', 'Travel season SNS ad budget allocation', 'Hotel Instagram ad effectiveness'],
    },
    {
        id: 'digital', catKey: 'digital', label: '💻 Digital & Apps', route: 'SaaS, apps, digital content',
        color: '#8b5cf6', icon: '💻',
        context: 'SaaS, mobile apps, digital content, subscription services',
        suggestions: ['App Google UAC ad strategy', 'SaaS marketing channel recommendations', 'Digital service retargeting ad', 'App install ad budget allocation', 'Subscription service ad ROI'],
    },
    {
        id: 'sports', catKey: 'sports', label: '⚽ Sports & Leisure', route: 'Sports and leisure goods sales',
        color: '#14b8a6', icon: '⚽',
        context: 'Fitness, yoga, outdoor, sportswear brands',
        suggestions: ['Sports brand ad channel recommendations', 'Sports goods Instagram ad effectiveness', 'Outdoor brand YouTube ad', 'Sports & leisure ad budget allocation'],
    },
    {
        id: 'finance', catKey: 'finance', label: '💰 Finance', route: 'Loan, card, investment, account services',
        color: '#10b981', icon: '💰',
        context: 'Banking, loan, credit card, investment, and account services for B2C',
        suggestions: ['Finance lead-gen Google ad strategy', 'Loan/card Naver SA budget allocation', 'Investment app TikTok ad targeting', 'Finance brand trust-building KPI'],
    },
    {
        id: 'insurance', catKey: 'insurance', label: '🛡 Insurance', route: 'Life, health, auto, property insurance',
        color: '#0ea5e9', icon: '🛡',
        context: 'Life, health, auto and property insurance products',
        suggestions: ['Insurance lead Naver SA strategy', 'Auto insurance Google Performance Max', 'Health insurance Kakao Channel ad', 'Insurance comparison-platform partnership'],
    },
    {
        id: 'medical', catKey: 'medical', label: '🏥 Medical Services', route: 'Clinic, telemedicine, checkup, specialty',
        color: '#ef4444', icon: '🏥',
        context: 'Clinics, telemedicine, health checkup and specialty medical services',
        suggestions: ['Local clinic Naver Place + SA', 'Telemedicine app Instagram ad', 'Health checkup season Google ad', 'Medical service compliance ad gating'],
    },
    {
        id: 'tax', catKey: 'tax', label: '📊 Tax & Accounting', route: 'Income, corporate, VAT, accounting',
        color: '#f59e0b', icon: '📊',
        context: 'Tax filing, corporate accounting, VAT and bookkeeping services',
        suggestions: ['Tax-season Naver SA peak strategy', 'Corp accounting B2B LinkedIn ad', 'VAT filing Kakao Channel CRM', 'Accounting firm long-tail SEO'],
    },
    {
        id: 'legal', catKey: 'legal', label: '⚖️ Legal Services', route: 'Civil, corporate, criminal, family law',
        color: '#6366f1', icon: '⚖️',
        context: 'Civil, corporate, criminal and family law consulting services',
        suggestions: ['Legal consult Google search ad', 'Law firm Naver SA brand keyword', 'Family law Instagram education content', 'Legal service compliance ad gating'],
    },
    {
        id: 'etc_service', catKey: 'etc_service', label: '🧩 Other Services', route: 'Consulting, education, repair, misc',
        color: '#94a3b8', icon: '🧩',
        context: 'Other professional services — consulting, education, repair, misc',
        suggestions: ['Service business Meta ad strategy', 'Education category YouTube ad', 'Repair service Naver Place ad', 'Misc service per-channel budget'],
    },
];
