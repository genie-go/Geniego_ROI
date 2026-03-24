const fs = require('fs');

// Fix: re-add cat_*, tag_*, sc_* keys to zh.marketing via Object.assign
// (they were lost when zh.marketing = {...} was used directly on line 609)

const CAT_KEYS = {
  ko: {
    "cat_beauty":"뷰티·코스메틱","cat_fashion":"패션·어패럴","cat_general":"생활잡화","cat_food":"식품·헬스",
    "cat_electronics":"전자·IT","cat_travel":"여행·숙박","cat_digital":"디지털·앱","cat_platform":"플랫폼·소프트웨어",
    "cat_overseas_ship":"해외배송·대행","cat_overseas_buy":"해외직구","cat_sports":"스포츠·레저",
    "tag_skincare":"스킨케어","tag_makeup":"메이크업","tag_perfume":"향수","tag_haircare":"헤어케어",
    "tag_womens":"여성의류","tag_mens":"남성의류","tag_outer":"아우터","tag_accessories":"액세서리",
    "tag_kitchen":"주방","tag_cleaning":"청소","tag_interior":"인테리어","tag_small":"소형가전",
    "tag_health":"건강기능식품","tag_processed":"가공식품","tag_organic":"유기농식품",
    "tag_phone_acc":"스마트폰액세서리","tag_appliance":"가전","tag_computer":"컴퓨터",
    "tag_hotel":"호텔","tag_flight":"항공","tag_tour":"투어","tag_leisure":"레저",
    "tag_app":"앱","tag_saas":"SaaS","tag_content":"컨텐츠","tag_subscription":"구독",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"엔터프라이즈",
    "tag_proxy_ship":"배송대행","tag_overseas_delivery":"해외배송","tag_customs":"통관",
    "tag_us_direct":"미국직구","tag_jp_direct":"일본직구","tag_cn_direct":"중국직구",
    "tag_fitness":"피트니스","tag_outdoor":"아웃도어","tag_sportswear":"스포츠웨어",
    "sc_coupang":"쿠팡","sc_naver_smart":"네이버스마트스토어","sc_11st":"11번가",
    "sc_gmarket":"G마켓","sc_kakao_shop":"카카오쇼핑","sc_tiktok_shop":"틱톡쇼핑",
    "ch_meta":"Meta 광고","ch_tiktok":"TikTok 광고","ch_google":"Google 광고",
    "ch_naver":"네이버 광고","ch_kakao":"카카오 광고","ch_coupang_ads":"쿠팡 광고","ch_instagram":"Instagram 광고",
  },
  en: {
    "cat_beauty":"Beauty & Cosmetics","cat_fashion":"Fashion & Apparel","cat_general":"General Goods",
    "cat_food":"Food & Health","cat_electronics":"Electronics & IT","cat_travel":"Travel & Accommodation",
    "cat_digital":"Digital & Apps","cat_platform":"Platform & Software","cat_overseas_ship":"Shipping Proxy",
    "cat_overseas_buy":"Buying Proxy","cat_sports":"Sports & Leisure",
    "tag_skincare":"Skincare","tag_makeup":"Makeup","tag_perfume":"Perfume","tag_haircare":"Haircare",
    "tag_womens":"Women's","tag_mens":"Men's","tag_outer":"Outer","tag_accessories":"Accessories",
    "tag_kitchen":"Kitchen","tag_cleaning":"Cleaning","tag_interior":"Interior","tag_small":"Small Appliances",
    "tag_health":"Health Supplements","tag_processed":"Processed Food","tag_organic":"Organic",
    "tag_phone_acc":"Phone Accessories","tag_appliance":"Appliances","tag_computer":"Computer",
    "tag_hotel":"Hotel","tag_flight":"Flight","tag_tour":"Tour","tag_leisure":"Leisure",
    "tag_app":"App","tag_saas":"SaaS","tag_content":"Content","tag_subscription":"Subscription",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"Enterprise",
    "tag_proxy_ship":"Shipping Proxy","tag_overseas_delivery":"Overseas Delivery","tag_customs":"Customs",
    "tag_us_direct":"US Direct","tag_jp_direct":"Japan Direct","tag_cn_direct":"China Direct",
    "tag_fitness":"Fitness","tag_outdoor":"Outdoor","tag_sportswear":"Sportswear",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver Smart Store","sc_11st":"11Street",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao Shopping","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta Ads","ch_tiktok":"TikTok Ads","ch_google":"Google Ads",
    "ch_naver":"Naver Ads","ch_kakao":"Kakao Ads","ch_coupang_ads":"Coupang Ads","ch_instagram":"Instagram Ads",
  },
  ja: {
    "cat_beauty":"ビューティ·コスメ","cat_fashion":"ファッション·アパレル","cat_general":"生活雑貨",
    "cat_food":"食品·ヘルス","cat_electronics":"電子·IT","cat_travel":"旅行·宿泊",
    "cat_digital":"デジタル·アプリ","cat_platform":"プラットフォーム·ソフト","cat_overseas_ship":"海外配送代行",
    "cat_overseas_buy":"海外直購入","cat_sports":"スポーツ·レジャー",
    "tag_skincare":"スキンケア","tag_makeup":"メイクアップ","tag_perfume":"香水","tag_haircare":"ヘアケア",
    "tag_womens":"レディース","tag_mens":"メンズ","tag_outer":"アウター","tag_accessories":"アクセサリー",
    "tag_kitchen":"キッチン","tag_cleaning":"掃除","tag_interior":"インテリア","tag_small":"小型家電",
    "tag_health":"健康食品","tag_processed":"加工食品","tag_organic":"オーガニック",
    "tag_phone_acc":"スマホアクセサリー","tag_appliance":"家電","tag_computer":"コンピューター",
    "tag_hotel":"ホテル","tag_flight":"フライト","tag_tour":"ツアー","tag_leisure":"レジャー",
    "tag_app":"アプリ","tag_saas":"SaaS","tag_content":"コンテンツ","tag_subscription":"サブスク",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"エンタープライズ",
    "tag_proxy_ship":"配送代行","tag_overseas_delivery":"海外配送","tag_customs":"通関",
    "tag_us_direct":"米国直購入","tag_jp_direct":"日本直購入","tag_cn_direct":"中国直購入",
    "tag_fitness":"フィットネス","tag_outdoor":"アウトドア","tag_sportswear":"スポーツウェア",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver スマートストア","sc_11st":"11Street",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakaoショッピング","sc_tiktok_shop":"TikTokショップ",
    "ch_meta":"Meta広告","ch_tiktok":"TikTok広告","ch_google":"Google広告",
    "ch_naver":"Naver広告","ch_kakao":"Kakao広告","ch_coupang_ads":"Coupang広告","ch_instagram":"Instagram広告",
  },
  zh: {
    "cat_beauty":"美妆·护肤","cat_fashion":"时尚·服装","cat_general":"生活杂货",
    "cat_food":"食品·健康","cat_electronics":"电子·IT","cat_travel":"旅行·住宿",
    "cat_digital":"数字·应用","cat_platform":"平台·软件","cat_overseas_ship":"海外转运",
    "cat_overseas_buy":"海外直购","cat_sports":"运动·休闲",
    "tag_skincare":"护肤","tag_makeup":"彩妆","tag_perfume":"香水","tag_haircare":"护发",
    "tag_womens":"女装","tag_mens":"男装","tag_outer":"外套","tag_accessories":"配饰",
    "tag_kitchen":"厨房","tag_cleaning":"清洁","tag_interior":"室内设计","tag_small":"小家电",
    "tag_health":"保健品","tag_processed":"加工食品","tag_organic":"有机",
    "tag_phone_acc":"手机配件","tag_appliance":"家电","tag_computer":"电脑",
    "tag_hotel":"酒店","tag_flight":"机票","tag_tour":"旅游","tag_leisure":"休闲",
    "tag_app":"应用","tag_saas":"SaaS","tag_content":"内容","tag_subscription":"订阅",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"企业",
    "tag_proxy_ship":"转运","tag_overseas_delivery":"海外配送","tag_customs":"清关",
    "tag_us_direct":"美国直购","tag_jp_direct":"日本直购","tag_cn_direct":"中国直购",
    "tag_fitness":"健身","tag_outdoor":"户外","tag_sportswear":"运动服",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver智能店铺","sc_11st":"11街",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao购物","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta广告","ch_tiktok":"TikTok广告","ch_google":"Google广告",
    "ch_naver":"Naver广告","ch_kakao":"Kakao广告","ch_coupang_ads":"Coupang广告","ch_instagram":"Instagram广告",
  },
  de: {
    "cat_beauty":"Beauty & Kosmetik","cat_fashion":"Mode & Bekleidung","cat_general":"Haushaltswaren",
    "cat_food":"Lebensmittel & Gesundheit","cat_electronics":"Elektronik & IT","cat_travel":"Reisen & Unterkunft",
    "cat_digital":"Digital & Apps","cat_platform":"Plattform & Software","cat_overseas_ship":"Versandagentur",
    "cat_overseas_buy":"Direktkauf aus Übersee","cat_sports":"Sport & Freizeit",
    "tag_skincare":"Hautpflege","tag_makeup":"Make-up","tag_perfume":"Parfüm","tag_haircare":"Haarpflege",
    "tag_womens":"Damen","tag_mens":"Herren","tag_outer":"Oberbekleidung","tag_accessories":"Accessoires",
    "tag_kitchen":"Küche","tag_cleaning":"Reinigung","tag_interior":"Inneneinrichtung","tag_small":"Kleingeräte",
    "tag_health":"Nahrungsergänzung","tag_processed":"Verarbeitete Lebensmittel","tag_organic":"Bio",
    "tag_phone_acc":"Handy-Zubehör","tag_appliance":"Haushaltsgeräte","tag_computer":"Computer",
    "tag_hotel":"Hotel","tag_flight":"Flug","tag_tour":"Tour","tag_leisure":"Freizeit",
    "tag_app":"App","tag_saas":"SaaS","tag_content":"Inhalte","tag_subscription":"Abonnement",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"Unternehmen",
    "tag_proxy_ship":"Versandagentur","tag_overseas_delivery":"Auslandslieferung","tag_customs":"Zoll",
    "tag_us_direct":"US-Direktkauf","tag_jp_direct":"Japan-Direktkauf","tag_cn_direct":"China-Direktkauf",
    "tag_fitness":"Fitness","tag_outdoor":"Outdoor","tag_sportswear":"Sportbekleidung",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver Smart Store","sc_11st":"11Street",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao Shopping","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta Ads","ch_tiktok":"TikTok Ads","ch_google":"Google Ads",
    "ch_naver":"Naver Ads","ch_kakao":"Kakao Ads","ch_coupang_ads":"Coupang Ads","ch_instagram":"Instagram Ads",
  },
  th: {
    "cat_beauty":"ความงาม·เครื่องสำอาง","cat_fashion":"แฟชั่น·เครื่องแต่งกาย","cat_general":"สินค้าทั่วไป",
    "cat_food":"อาหาร·สุขภาพ","cat_electronics":"อิเล็กทรอนิกส์·IT","cat_travel":"การเดินทาง·ที่พัก",
    "cat_digital":"ดิจิทัล·แอป","cat_platform":"แพลตฟอร์ม·ซอฟต์แวร์","cat_overseas_ship":"บริการส่งสินค้าต่างประเทศ",
    "cat_overseas_buy":"ซื้อสินค้าต่างประเทศ","cat_sports":"กีฬา·นันทนาการ",
    "tag_skincare":"ดูแลผิว","tag_makeup":"เมคอัพ","tag_perfume":"น้ำหอม","tag_haircare":"ดูแลเส้นผม",
    "tag_womens":"เสื้อผ้าผู้หญิง","tag_mens":"เสื้อผ้าผู้ชาย","tag_outer":"เสื้อคลุม","tag_accessories":"เครื่องประดับ",
    "tag_kitchen":"ครัว","tag_cleaning":"ทำความสะอาด","tag_interior":"ตกแต่งภายใน","tag_small":"เครื่องใช้ไฟฟ้าขนาดเล็ก",
    "tag_health":"อาหารเสริม","tag_processed":"อาหารแปรรูป","tag_organic":"ออร์แกนิค",
    "tag_phone_acc":"อุปกรณ์เสริมโทรศัพท์","tag_appliance":"เครื่องใช้ไฟฟ้า","tag_computer":"คอมพิวเตอร์",
    "tag_hotel":"โรงแรม","tag_flight":"เที่ยวบิน","tag_tour":"ทัวร์","tag_leisure":"นันทนาการ",
    "tag_app":"แอป","tag_saas":"SaaS","tag_content":"คอนเทนต์","tag_subscription":"สมัครสมาชิก",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"องค์กร",
    "tag_proxy_ship":"ตัวแทนขนส่ง","tag_overseas_delivery":"จัดส่งต่างประเทศ","tag_customs":"ศุลกากร",
    "tag_us_direct":"ซื้อตรงจากสหรัฐฯ","tag_jp_direct":"ซื้อตรงจากญี่ปุ่น","tag_cn_direct":"ซื้อตรงจากจีน",
    "tag_fitness":"ฟิตเนส","tag_outdoor":"กลางแจ้ง","tag_sportswear":"เสื้อผ้าออกกำลังกาย",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver Smart Store","sc_11st":"11Street",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao Shopping","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta Ads","ch_tiktok":"TikTok Ads","ch_google":"Google Ads",
    "ch_naver":"Naver Ads","ch_kakao":"Kakao Ads","ch_coupang_ads":"Coupang Ads","ch_instagram":"Instagram Ads",
  },
  vi: {
    "cat_beauty":"Làm đẹp·Mỹ phẩm","cat_fashion":"Thời trang·May mặc","cat_general":"Hàng gia dụng",
    "cat_food":"Thực phẩm·Sức khỏe","cat_electronics":"Điện tử·IT","cat_travel":"Du lịch·Lưu trú",
    "cat_digital":"Kỹ thuật số·Ứng dụng","cat_platform":"Nền tảng·Phần mềm","cat_overseas_ship":"Dịch vụ vận chuyển quốc tế",
    "cat_overseas_buy":"Mua sắm quốc tế","cat_sports":"Thể thao·Giải trí",
    "tag_skincare":"Chăm sóc da","tag_makeup":"Trang điểm","tag_perfume":"Nước hoa","tag_haircare":"Chăm sóc tóc",
    "tag_womens":"Thời trang nữ","tag_mens":"Thời trang nam","tag_outer":"Áo khoác","tag_accessories":"Phụ kiện",
    "tag_kitchen":"Nhà bếp","tag_cleaning":"Vệ sinh","tag_interior":"Nội thất","tag_small":"Thiết bị nhỏ",
    "tag_health":"Thực phẩm chức năng","tag_processed":"Thực phẩm chế biến","tag_organic":"Hữu cơ",
    "tag_phone_acc":"Phụ kiện điện thoại","tag_appliance":"Đồ gia dụng","tag_computer":"Máy tính",
    "tag_hotel":"Khách sạn","tag_flight":"Chuyến bay","tag_tour":"Tour du lịch","tag_leisure":"Giải trí",
    "tag_app":"Ứng dụng","tag_saas":"SaaS","tag_content":"Nội dung","tag_subscription":"Đăng ký",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"Doanh nghiệp",
    "tag_proxy_ship":"Dịch vụ vận chuyển","tag_overseas_delivery":"Giao hàng quốc tế","tag_customs":"Hải quan",
    "tag_us_direct":"Mua trực tiếp từ Mỹ","tag_jp_direct":"Mua trực tiếp từ Nhật","tag_cn_direct":"Mua trực tiếp từ Trung Quốc",
    "tag_fitness":"Thể dục","tag_outdoor":"Ngoài trời","tag_sportswear":"Trang phục thể thao",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver Smart Store","sc_11st":"11Street",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao Shopping","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta Ads","ch_tiktok":"TikTok Ads","ch_google":"Google Ads",
    "ch_naver":"Naver Ads","ch_kakao":"Kakao Ads","ch_coupang_ads":"Coupang Ads","ch_instagram":"Instagram Ads",
  },
  id: {
    "cat_beauty":"Kecantikan·Kosmetik","cat_fashion":"Mode·Pakaian","cat_general":"Barang Rumah Tangga",
    "cat_food":"Makanan·Kesehatan","cat_electronics":"Elektronik·IT","cat_travel":"Perjalanan·Akomodasi",
    "cat_digital":"Digital·Aplikasi","cat_platform":"Platform·Perangkat Lunak","cat_overseas_ship":"Jasa Pengiriman Internasional",
    "cat_overseas_buy":"Pembelian Internasional","cat_sports":"Olahraga·Rekreasi",
    "tag_skincare":"Perawatan Kulit","tag_makeup":"Makeup","tag_perfume":"Parfum","tag_haircare":"Perawatan Rambut",
    "tag_womens":"Pakaian Wanita","tag_mens":"Pakaian Pria","tag_outer":"jaket","tag_accessories":"Aksesori",
    "tag_kitchen":"Dapur","tag_cleaning":"Kebersihan","tag_interior":"Interior","tag_small":"Peralatan Kecil",
    "tag_health":"Suplemen Kesehatan","tag_processed":"Makanan Olahan","tag_organic":"Organik",
    "tag_phone_acc":"Aksesori Ponsel","tag_appliance":"Peralatan Rumah Tangga","tag_computer":"Komputer",
    "tag_hotel":"Hotel","tag_flight":"Penerbangan","tag_tour":"Tur","tag_leisure":"Rekreasi",
    "tag_app":"Aplikasi","tag_saas":"SaaS","tag_content":"Konten","tag_subscription":"Langganan",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"Perusahaan",
    "tag_proxy_ship":"Jasa Pengiriman","tag_overseas_delivery":"Pengiriman Internasional","tag_customs":"Bea Cukai",
    "tag_us_direct":"Beli Langsung dari AS","tag_jp_direct":"Beli Langsung dari Jepang","tag_cn_direct":"Beli Langsung dari China",
    "tag_fitness":"Kebugaran","tag_outdoor":"Luar Ruangan","tag_sportswear":"Pakaian Olahraga",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver Smart Store","sc_11st":"11Street",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao Shopping","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta Ads","ch_tiktok":"TikTok Ads","ch_google":"Google Ads",
    "ch_naver":"Naver Ads","ch_kakao":"Kakao Ads","ch_coupang_ads":"Coupang Ads","ch_instagram":"Instagram Ads",
  },
  'zh-TW': {
    "cat_beauty":"美妝·護膚","cat_fashion":"時尚·服裝","cat_general":"生活雜貨",
    "cat_food":"食品·健康","cat_electronics":"電子·IT","cat_travel":"旅行·住宿",
    "cat_digital":"數位·應用","cat_platform":"平台·軟體","cat_overseas_ship":"海外轉運",
    "cat_overseas_buy":"海外直購","cat_sports":"運動·休閒",
    "tag_skincare":"護膚","tag_makeup":"彩妝","tag_perfume":"香水","tag_haircare":"護髮",
    "tag_womens":"女裝","tag_mens":"男裝","tag_outer":"外套","tag_accessories":"配飾",
    "tag_kitchen":"廚房","tag_cleaning":"清潔","tag_interior":"室內設計","tag_small":"小家電",
    "tag_health":"保健品","tag_processed":"加工食品","tag_organic":"有機",
    "tag_phone_acc":"手機配件","tag_appliance":"家電","tag_computer":"電腦",
    "tag_hotel":"飯店","tag_flight":"機票","tag_tour":"旅遊","tag_leisure":"休閒",
    "tag_app":"應用","tag_saas":"SaaS","tag_content":"內容","tag_subscription":"訂閱",
    "tag_b2b":"B2B","tag_api":"API","tag_enterprise":"企業",
    "tag_proxy_ship":"轉運","tag_overseas_delivery":"海外配送","tag_customs":"清關",
    "tag_us_direct":"美國直購","tag_jp_direct":"日本直購","tag_cn_direct":"中國直購",
    "tag_fitness":"健身","tag_outdoor":"戶外","tag_sportswear":"運動服",
    "sc_coupang":"Coupang","sc_naver_smart":"Naver智能店鋪","sc_11st":"11街",
    "sc_gmarket":"Gmarket","sc_kakao_shop":"Kakao購物","sc_tiktok_shop":"TikTok Shop",
    "ch_meta":"Meta廣告","ch_tiktok":"TikTok廣告","ch_google":"Google廣告",
    "ch_naver":"Naver廣告","ch_kakao":"Kakao廣告","ch_coupang_ads":"Coupang廣告","ch_instagram":"Instagram廣告",
  },
};

const LOCALE_FILES = {
  ko: 'src/i18n/locales/ko.js',
  en: 'src/i18n/locales/en.js',
  ja: 'src/i18n/locales/ja.js',
  zh: 'src/i18n/locales/zh.js',
  de: 'src/i18n/locales/de.js',
  th: 'src/i18n/locales/th.js',
  vi: 'src/i18n/locales/vi.js',
  id: 'src/i18n/locales/id.js',
  'zh-TW': 'src/i18n/locales/zh-TW.js',
};

const VAR_NAMES = {
  ko:'ko', en:'en', ja:'ja', zh:'zh', de:'de', th:'th', vi:'vi', id:'id', 'zh-TW':'zhTW'
};

for (const [lang, keys] of Object.entries(CAT_KEYS)) {
  const fp = LOCALE_FILES[lang];
  const v = VAR_NAMES[lang];
  if (!fp || !fs.existsSync(fp)) continue;
  
  let c = fs.readFileSync(fp, 'utf8');
  
  // Add all cat_* tag_* sc_* ch_* keys as Object.assign on zh.marketing BEFORE export default
  const patch = `\n${v}.marketing = Object.assign(${v}.marketing || {}, {\n` +
    Object.entries(keys).map(([k, val]) => `    "${k}": "${val.replace(/"/g, '\\"')}"`).join(',\n') +
    '\n});\n';
  
  const expIdx = c.lastIndexOf(`\nexport default ${v}`);
  if (expIdx >= 0) {
    c = c.slice(0, expIdx) + patch + c.slice(expIdx);
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`✅ ${lang}: ${Object.keys(keys).length} cat/tag/sc/ch keys added`);
  } else {
    console.log(`❌ ${lang}: export not found`);
  }
}
console.log('Done!');
