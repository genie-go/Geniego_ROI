// campaignConstants.js
// CampaignManager.jsx 와 AIRecommendTab.jsx 공통 상Count

const IS_DEMO = () => typeof window !== 'undefined' && localStorage.getItem('genie_has_real_keys') !== '1';

export const PRODUCT_CATALOG = !IS_DEMO() ? [] : Array.from({ length: 24 }, (_, i) => {
    const names = ['시카페어 인텐시브 리페어 크림', '세라마이딘 스킨 베리어 크림', '바이탈 하이드라 콜라겐 앰플', '더마클리어 마이크로 폼 수딩 젤', '크라이오 고무 마스크 워터풀', 'V7 핑크 토닝 라이트 V3'];
    const skus = ['JART-CICA-50', 'JART-CERA-100', 'JART-VHYD-30', 'JART-DERMA-150', 'JART-CRYO-01', 'JART-V7-50'];
    const cats = ['Beauty/Skincare', 'Beauty/Skincare', 'Beauty/Skincare', 'Beauty/Skincare', 'Beauty/Skincare', 'Beauty/Makeup'];
    const idx = i % 6;
    const priceBase = [89000, 149000, 49000, 129000, 69000, 39000][idx];
    const cost = Math.round(priceBase * 0.45);
    const inv = 50 + (i * 17) % 300;
    const qty = 20 + (i * 13) % 180;
    return {
        id: `P${String(i + 1).padStart(4, '0')}`, sku: `${skus[idx]}-${String(i + 1).padStart(2, '0')}`,
        name: names[idx], category: cats[idx], price: priceBase + (i % 4) * 5000,
        productCost: cost, inventory: inv, monthlySales: qty,
        margin: Math.round(((priceBase - cost) / priceBase) * 100),
    };
});

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
];
