/**
 * DemoDataLayer.js
 * 데모 유저가 체험할 수 있는 가상(Mock) 데이터 모음.
 * 실제 API 응답과 동일한 구조를 사용하여 코드 분기를 최소화합니다.
 */

// ────────────────────────────────────────────────────────
// Connectors — 모든 플랫폼 Connected 상태
// ────────────────────────────────────────────────────────
export const DEMO_CONNECTOR_STATE = {
    meta: { status: "connected", accessToken: "ya29.demo_meta_access_abc123xyz", refreshToken: "1//demo_meta_refresh_xyz789", grantedScopes: ["ads_read", "ads_management", "business_management"], expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(), tokenAge: Date.now(), webhookEvents: ["ad_account_update", "leadgen"], lastEvent: null, apiKey: "", apiSecret: "", webhookUrl: "https://roi.genie-go.com/webhooks/meta", webhookSecret: "whsec_demo_meta_k2j9" },
    tiktok: { status: "connected", accessToken: "tt_demo_access_456def789ghi", refreshToken: "tt_demo_refresh_jkl012", grantedScopes: ["ad.read", "report.read"], expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(), tokenAge: Date.now(), webhookEvents: ["ad_account.update", "conversion"], lastEvent: null, apiKey: "", apiSecret: "", webhookUrl: "https://roi.genie-go.com/webhooks/tiktok", webhookSecret: "whsec_demo_tiktok_p3q8" },
    google: { status: "connected", accessToken: "ya29.demo_google_access_mno345pqr", refreshToken: "1//demo_google_refresh_stuvwx", grantedScopes: ["https://www.googleapis.com/auth/adwords"], expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), tokenAge: Date.now(), webhookEvents: ["conversion_upload"], lastEvent: null, apiKey: "", apiSecret: "", webhookUrl: "https://roi.genie-go.com/webhooks/google", webhookSecret: "whsec_demo_google_r7k1" },
    amazon: { status: "connected", accessToken: "Atna|demo_amazon_lwa_yz567abc", refreshToken: "Atzr|demo_amazon_refresh_def890", grantedScopes: ["sellingpartnerapi:orders:read", "sellingpartnerapi:reports:read"], expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), tokenAge: Date.now(), webhookEvents: ["ORDER_CHANGE"], lastEvent: null, apiKey: "", apiSecret: "", webhookUrl: "https://roi.genie-go.com/webhooks/amazon", webhookSecret: "whsec_demo_amazon_s5n2" },
    coupang: { status: "connected", apiKey: "demo-coupang-access-DEMO12345", apiSecret: "demo-coupang-secret-XYZ98765", grantedScopes: ["products:read", "orders:read", "settlement:read"], expiresAt: null, tokenAge: Date.now(), webhookEvents: ["order.created", "order.shipped"], lastEvent: null, accessToken: "", refreshToken: "", webhookUrl: "https://roi.genie-go.com/webhooks/coupang", webhookSecret: "whsec_demo_coupang_t4m6" },
    naver: { status: "connected", apiKey: "demo-naver-client-NAVER67890", apiSecret: "demo-naver-secret-ABCDE12345", grantedScopes: ["products.read", "orders.read", "settlement.read"], expiresAt: null, tokenAge: Date.now(), webhookEvents: ["ecom.order", "ecom.settlement"], lastEvent: null, accessToken: "", refreshToken: "", webhookUrl: "https://roi.genie-go.com/webhooks/naver", webhookSecret: "whsec_demo_naver_u8p3" },
    shopify: { status: "connected", accessToken: "shpat_demo_shopify_offline_abc", refreshToken: "", grantedScopes: ["read_products", "read_orders", "read_customers"], expiresAt: null, tokenAge: Date.now(), webhookEvents: ["orders/create", "products/update"], lastEvent: null, apiKey: "", apiSecret: "", webhookUrl: "https://roi.genie-go.com/webhooks/shopify", webhookSecret: "whsec_demo_shopify_v2w7" },
    "11st": { status: "connected", apiKey: "demo-11st-api-KEY11ST0001", apiSecret: "demo-11st-secret-SEC11ST9999", grantedScopes: ["order:read", "product:read", "settlement:read"], expiresAt: null, tokenAge: Date.now(), webhookEvents: ["order.new", "order.cancel"], lastEvent: null, accessToken: "", refreshToken: "", webhookUrl: "https://roi.genie-go.com/webhooks/11st", webhookSecret: "whsec_demo_11st_x9y1" },
    rakuten: { status: "connected", apiKey: "demo-rakuten-api-RAKI12345", apiSecret: "demo-rakuten-secret-RAKISEC9999", grantedScopes: ["item:read", "order:read", "settlement:read", "review:read", "shop:read"], expiresAt: null, tokenAge: Date.now(), webhookEvents: ["order.new", "order.shipped", "settlement.created"], lastEvent: null, accessToken: "", refreshToken: "", webhookUrl: "https://roi.genie-go.com/webhooks/rakuten", webhookSecret: "whsec_demo_rakuten_j1p5" },
    yahoo_jp: { status: "connected", accessToken: "demo_yahoo_jp_access_yj789abc", refreshToken: "demo_yahoo_jp_refresh_xyz", grantedScopes: ["openid", "bb.order.read", "bb.item.read"], expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), tokenAge: Date.now(), webhookEvents: ["order.payment_settled", "order.shipped"], lastEvent: null, apiKey: "", apiSecret: "", webhookUrl: "https://roi.genie-go.com/webhooks/yahoo_jp", webhookSecret: "whsec_demo_yahoo_jp_k3q7" },
};


// ────────────────────────────────────────────────────────
// CRM — 가상 고객 50명, 세그먼트, RFM
// ────────────────────────────────────────────────────────
const NAMES = ["Alex Kim", "Sarah Lee", "James Park", "Emily Choi", "David Jung", "Yuna Chen", "Kevin Kang", "Rachel Jo", "Daniel Lim", "Sofia Han", "Owen Oh", "Grace Seo", "Marcus Kwon", "Lily Bae", "Aaron Shin", "Mia Ryu", "Hannah Seok", "Ethan Moon", "Chloe Ko", "Nathan Nam", "Zoe Hwang", "Lucas Song", "Ava Ahn", "Ryan Hong", "Isabella Noh", "Mason Gu", "Ella Yu", "Noah Jin", "Avery Jeon", "Layla Bang", "Carter Ma", "Nora Nang", "Elijah Gong", "Scarlett Shim", "Hudson Byun", "Aria Won", "Hudson Cha", "Leo Joo", "Victoria Bong", "Jackson Na", "Luna Bu", "Oliver Tak", "Charlotte So", "Liam Do", "Amelia Woo", "Emma Eun", "Benjamin Bong", "Cora Jin", "Wyatt Won", "Stella Seol"];
const SEGS = ["VIP Buyer", "Repurchase Candidate", "Dormant Return", "New Member", "Churn Risk"];

export const DEMO_CRM_CUSTOMERS = Array.from({ length: 50 }, (_, i) => {
    const orders = Math.floor(Math.random() * 20) + 1;
    const ltv = orders * (Math.floor(Math.random() * 80000) + 30000);
    const days = Math.floor(Math.random() * 180);
    return {
        id: 1000 + i,
        name: NAMES[i % NAMES.length],
        email: `user${1000 + i}@example.kr`,
        phone: `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        segment: SEGS[i % SEGS.length],
        total_orders: orders,
        ltv,
        last_purchase_days: days,
        churn_risk: days > 90 ? "high" : days > 45 ? "medium" : "low",
        plan_channel: ["Coupang", "Naver", "Kakao Gift", "Own Mall", "11Street"][i % 5],
        created_at: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
    };
});

export const DEMO_CRM_SEGMENTS = [
    { id: 1, name: "VIP Buyer", count: 12, condition: "ltv > 1,000,000", color: "#f59e0b" },
    { id: 2, name: "Repurchase Candidate", count: 18, condition: "orders >= 3 AND last_30d", color: "#22c55e" },
    { id: 3, name: "Dormant Return", count: 7, condition: "last_purchase > 90d", color: "#a855f7" },
    { id: 4, name: "New Member", count: 9, condition: "created_at < 30d", color: "#4f8ef7" },
    { id: 5, name: "Churn Risk", count: 4, condition: "churn_score > 0.7", color: "#ef4444" },
];

export const DEMO_RFM = {
    champions: 12, loyalists: 18, potential: 9, new_customers: 7,
    at_risk: 4, total: 50,
    avg_ltv: 780000, avg_orders: 6.2, retention_rate: 71,
};

// ────────────────────────────────────────────────────────
// Email Marketing — 캠페인 3개, 템플릿 5개
// ────────────────────────────────────────────────────────
export const DEMO_EMAIL_CAMPAIGNS = [
    { id: 1, name: "March Spring Season Promotion", status: "sent", sent: 4821, open_rate: 38.4, click_rate: 12.7, revenue: 4820000, sent_at: "2026-03-07 10:00" },
    { id: 2, name: "VIP Customer Appreciation Email", status: "sent", sent: 312, open_rate: 64.1, click_rate: 28.3, revenue: 2150000, sent_at: "2026-03-03 14:00" },
    { id: 3, name: "Churned Customer Reactivation", status: "scheduled", sent: 0, open_rate: 0, click_rate: 0, revenue: 0, scheduled_at: "2026-03-14 09:00" },
];

export const DEMO_EMAIL_TEMPLATES = [
    { id: 1, name: "Spring Season Sale Banner", category: "Promotion", preview_img: null },
    { id: 2, name: "VIP Appreciation Message", category: "Relationship", preview_img: null },
    { id: 3, name: "Repurchase Coupon", category: "Retention", preview_img: null },
    { id: 4, name: "New Member Welcome", category: "Onboarding", preview_img: null },
    { id: 5, name: "Cart Abandonment Recovery", category: "Conversion", preview_img: null },
];

export const DEMO_EMAIL_STATS = {
    total_sent: 5133, avg_open: 42.1, avg_click: 15.6, total_revenue: 6970000,
    deliverability: 99.2, unsubscribe_rate: 0.18,
};

export const DEMO_EMAIL_SETTINGS = {
    smtp_host: "smtp.demo.genie-roi.com",
    smtp_port: 587,
    sender_name: "Geniego Team",
    sender_email: "no-reply@genie-demo.com",
    reply_to: "support@genie-demo.com",
    status: "connected",
};

// ────────────────────────────────────────────────────────
// Kakao Channel — Notification톡 캠페인, 템플릿
// ────────────────────────────────────────────────────────
export const DEMO_KAKAO_CAMPAIGNS = [
    { id: 1, name: "Order Confirmation Alimtalk", type: "transactional", status: "active", sent: 12483, open_rate: 91.2, click_rate: 34.7, template_name: "ORDER_CONFIRM_01" },
    { id: 2, name: "Shipping Departure Notice", type: "transactional", status: "active", sent: 9201, open_rate: 88.4, click_rate: 22.1, template_name: "SHIP_CONFIRM_01" },
    { id: 3, name: "Spring Season Add Friend Event", type: "marketing", status: "scheduled", sent: 0, open_rate: 0, click_rate: 0, template_name: "SPRING_PROMO_01" },
];

export const DEMO_KAKAO_TEMPLATES = [
    { id: 1, name: "ORDER_CONFIRM_01", category: "Order", status: "approved", inspected_at: "2026-02-01" },
    { id: 2, name: "SHIP_CONFIRM_01", category: "Delivery", status: "approved", inspected_at: "2026-02-01" },
    { id: 3, name: "SPRING_PROMO_01", category: "Marketing", status: "pending", inspected_at: null },
];

export const DEMO_KAKAO_SETTINGS = {
    sender_key: "demo_kakao_sender_key_SK123456",
    phone: "0215991234",
    channel_id: "@genie-demo-shop",
    status: "connected",
};

// ────────────────────────────────────────────────────────
// Dashboard — KPI 요약
// ────────────────────────────────────────────────────────
export const DEMO_DASHBOARD_KPI = {
    revenue_7d: 28450000, revenue_prev: 24100000,
    orders_7d: 1234, orders_prev: 1058,
    new_customers: 89, roas_avg: 4.21,
    top_channel: "Coupang", top_channel_revenue: 12300000,
};

// ────────────────────────────────────────────────────────
// LINE Channel — 일본 메시지 Channel (Kakao 역할)
// ────────────────────────────────────────────────────────
export const DEMO_LINE_CAMPAIGNS = [
    { id: 1, name: "注文完了通知", type: "transactional", status: "active", sent: 18342, open_rate: 94.1, click_rate: 41.2, template_name: "ORDER_CONFIRM_JP" },
    { id: 2, name: "発送完了のお知らせ", type: "transactional", status: "active", sent: 14821, open_rate: 91.8, click_rate: 29.4, template_name: "SHIP_CONFIRM_JP" },
    { id: 3, name: "春セール特別クーポン", type: "marketing", status: "scheduled", sent: 0, open_rate: 0, click_rate: 0, template_name: "SPRING_SALE_JP" },
    { id: 4, name: "VIP会員限定キャンペーン", type: "marketing", status: "active", sent: 4213, open_rate: 88.7, click_rate: 52.3, template_name: "VIP_MEMBER_JP" },
];

export const DEMO_LINE_TEMPLATES = [
    { id: 1, name: "ORDER_CONFIRM_JP", category: "注文", status: "approved", preview: "ご注文ありがとうございます。\n商品：{item_name}\n数量：{qty}個\nご注文金額：¥{amount}" },
    { id: 2, name: "SHIP_CONFIRM_JP", category: "配送", status: "approved", preview: "商品を発送しました。\n追跡番号：{tracking_no}\n配送会社：{carrier}" },
    { id: 3, name: "SPRING_SALE_JP", category: "マーケティング", status: "pending", preview: "春のセールが始まりました！\n今すぐショップへ → {shop_url}" },
    { id: 4, name: "VIP_MEMBER_JP", category: "VIP", status: "approved", preview: "VIP会員様へ特別クーポンをお届けします。\nクーポンコード：{coupon_code}" },
];

export const DEMO_LINE_SETTINGS = {
    channel_id: "demo-line-channel-1234567890",
    channel_secret: "demo_line_secret_abc123xyz",
    channel_access_token: "DemoLINEAccessTokenxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    line_id: "@genie-demo-jp",
    followers: 12483,
    status: "connected",
};

export const DEMO_LINE_STATS = {
    total_followers: 12483, monthly_sent: 37376, avg_open_rate: 91.2, avg_click_rate: 37.8,
};

// ────────────────────────────────────────────────────────
// Rakuten Japan 커넥터
// ────────────────────────────────────────────────────────
export const DEMO_RAKUTEN_STATE = {
    status: "connected",
    apiKey: "demo-rakuten-api-RAKI12345",
    apiSecret: "demo-rakuten-secret-XYZ98765",
    shopId: "demo-rakuten-shop",
    grantedScopes: ["item:read", "order:read", "settlement:read", "review:read"],
    monthlySales: 4820000, orders: 312, avgRating: 4.7,
    lastSync: new Date(Date.now() - 30 * 60000).toISOString(),
};

// ────────────────────────────────────────────────────────
// Journey Builder — 데모 여정 목록
// ────────────────────────────────────────────────────────
export const DEMO_JOURNEYS = [
    {
        id: "j_001", name: "Cart Abandonment Recovery", trigger_type: "cart_abandoned", status: "active",
        stats_entered: 843, stats_completed: 312, active_count: 87,
        updated_at: "2026-03-08T14:30:00",
        nodes: [
            { id: "t1", type: "trigger", label: "Cart Abandoned", x: 200, y: 20, config: { type: "cart_abandoned" } },
            { id: "d1", type: "delay", label: "Wait 1 Hour", x: 200, y: 140, config: { value: 1, unit: "hours" } },
            { id: "e1", type: "email", label: "Recovery Email", x: 200, y: 260, config: { subject: "You have items left in your cart!", from_name: "Geniego Shop" } },
            { id: "c1", type: "condition", label: "Email Clicked?", x: 200, y: 380, config: { field: "email_clicked" } },
            { id: "k1", type: "kakao", label: "Coupon Notification", x: 80, y: 500, config: { template_code: "CART_COUPON_01", msg_type: "Alimtalk" } },
            { id: "end1", type: "end", label: "Done", x: 320, y: 500, config: {} },
        ],
        edges: [
            { from: "t1", to: "d1" }, { from: "d1", to: "e1" }, { from: "e1", to: "c1" },
            { from: "c1", to: "end1", label: "yes" }, { from: "c1", to: "k1", label: "no" }, { from: "k1", to: "end1" },
        ],
    },
    {
        id: "j_002", name: "VIP Customer Care", trigger_type: "purchase", status: "active",
        stats_entered: 312, stats_completed: 298, active_count: 14,
        updated_at: "2026-03-05T09:00:00",
        nodes: [
            { id: "t2", type: "trigger", label: "Purchase Complete (LTV > 1M)", x: 200, y: 20, config: { type: "purchase" } },
            { id: "e2", type: "email", label: "VIP Thank You Email", x: 200, y: 140, config: { subject: "Thank you, VIP Customer", from_name: "Geniego VIP" } },
            { id: "ab1", type: "ab_test", label: "A/B Test", x: 200, y: 260, config: { split_a: 50 } },
            { id: "k2", type: "kakao", label: "Exclusive Discount Alert", x: 80, y: 380, config: { template_code: "VIP_DISCOUNT_01", msg_type: "Friendtalk" } },
            { id: "l1", type: "line", label: "LINE VIP Notification", x: 320, y: 380, config: { template_code: "VIP_MEMBER_JP", message_type: "flex" } },
            { id: "end2", type: "end", label: "Done", x: 200, y: 500, config: {} },
        ],
        edges: [
            { from: "t2", to: "e2" }, { from: "e2", to: "ab1" },
            { from: "ab1", to: "k2", label: "yes" }, { from: "ab1", to: "l1", label: "no" },
            { from: "k2", to: "end2" }, { from: "l1", to: "end2" },
        ],
    },
    {
        id: "j_003", name: "New Member Onboarding", trigger_type: "signup", status: "draft",
        stats_entered: 0, stats_completed: 0, active_count: 0,
        updated_at: "2026-03-10T18:00:00",
        nodes: [
            { id: "t3", type: "trigger", label: "New Signup", x: 200, y: 20, config: { type: "signup" } },
            { id: "e3", type: "email", label: "Welcome Email", x: 200, y: 140, config: { subject: "Welcome to Geniego!", from_name: "Geniego Team" } },
            { id: "d3", type: "delay", label: "Wait 3 Days", x: 200, y: 260, config: { value: 3, unit: "days" } },
            { id: "k3", type: "kakao", label: "First Purchase Coupon", x: 200, y: 380, config: { template_code: "WELCOME_COUPON_01", msg_type: "Alimtalk" } },
            { id: "end3", type: "end", label: "Done", x: 200, y: 500, config: {} },
        ],
        edges: [
            { from: "t3", to: "e3" }, { from: "e3", to: "d3" }, { from: "d3", to: "k3" }, { from: "k3", to: "end3" },
        ],
    },
];

export const DEMO_JOURNEY_TEMPLATES = [
    { id: "tpl1", tplKey: "cart", name: "Cart Abandonment Recovery", description: "Re-engage churned customers via Email + Kakao", trigger_type: "cart_abandoned", estimated_duration: "3 days", nodes_count: 5 },
    { id: "tpl2", tplKey: "onboard", name: "New Member Onboarding", description: "3-step automated care after signup", trigger_type: "signup", estimated_duration: "7 days", nodes_count: 4 },
    { id: "tpl3", tplKey: "vip", name: "VIP Customer Retention", description: "Auto care for VIP segment", trigger_type: "segment_entered", estimated_duration: "14 days", nodes_count: 6 },
    { id: "tpl4", tplKey: "churn", name: "Churn Prevention Campaign", description: "Auto stop high-risk churn customers", trigger_type: "churned", estimated_duration: "30 days", nodes_count: 7 },
    { id: "tpl5", tplKey: "bday", name: "Birthday Coupon", description: "Auto coupon for birthday customers", trigger_type: "birthday", estimated_duration: "1 day", nodes_count: 3 },
];

// ────────────────────────────────────────────────────────
// Email Editor — 블록 에디터 데모 템플릿
// ────────────────────────────────────────────────────────
export const DEMO_EMAIL_BLOCKS = [
    {
        id: "tpl_spring", name: "Spring Season Sale", blocks: [
            { id: "b1", type: "header", content: { text: "🌸 Spring Season Special Discount", fontSize: 28, align: "center", color: "#f59e0b", bgColor: "#0d1829" } },
            { id: "b2", type: "image", content: { url: "", alt: "Spring banner image", width: "100%" } },
            { id: "b3", type: "text", content: { text: "Enjoy up to 40% off all products this spring.\nDon't miss this opportunity!", align: "center", color: "#e8eaf0" } },
            { id: "b4", type: "button", content: { text: "Shop Now", url: "https://shop.example.kr", bgColor: "#4f8ef7", textColor: "#fff", borderRadius: 8 } },
            { id: "b5", type: "divider", content: {} },
            { id: "b6", type: "footer", content: { text: "Unsubscribe | Address: Seoul, Korea", color: "rgba(255,255,255,0.3)" } },
        ]
    },
    {
        id: "tpl_vip", name: "VIP Appreciation Message", blocks: [
            { id: "b1", type: "header", content: { text: "💎 To Our VIP Customers", fontSize: 24, align: "center", color: "#f59e0b", bgColor: "#1a0a02" } },
            { id: "b2", type: "text", content: { text: "Thank you for always using Geniego Shop.\nWe have prepared a special benefit exclusively for our VIP customers.", align: "center", color: "#e8eaf0" } },
            { id: "b3", type: "coupon", content: { code: "VIP30OFF", discount: "30% Off", expires: "2026-04-30" } },
            { id: "b4", type: "button", content: { text: "Apply Benefit", url: "https://shop.example.kr/vip", bgColor: "#f59e0b", textColor: "#000", borderRadius: 8 } },
            { id: "b5", type: "footer", content: { text: "Unsubscribe | VIP Membership Info", color: "rgba(255,255,255,0.3)" } },
        ]
    },
];
