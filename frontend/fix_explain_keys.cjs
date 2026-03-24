const fs = require('fs');
const path = require('path');
const localesDir = 'D:\\project\\GeniegoROI\\frontend\\src\\i18n\\locales';

// en.js에서 marketing 객체의 구조를 확인하고 올바른 위치에 키 삽입
function fixLocale(lang, keyTranslations) {
    const file = path.join(localesDir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');

    // 1단계: 이전에 잘못 삽입한 키 블록 제거 (marketing 객체 밖에 있는 것)
    // explainTitle 관련 라인들 제거
    const removePattern = /\n\s*\/\/ ── AI 추천 근거[\s\S]*?cat_explain_sports: "[^"]*",\n/g;
    c = c.replace(removePattern, '\n');

    // 2단계: marketing 객체 내부의 cat_platform 키 다음에 올바르게 삽입
    // marketing 객체 내 첫 번째 cat_platform을 찾아서 그 뒤에 삽입
    const insertAfter = /(\s+cat_platform:\s*"[^"]*",)(\s*\n\s+tag_b2b)/;
    if (c.match(insertAfter)) {
        if (!c.includes('explainTitle')) {
            const keysStr = '\n' + Object.entries(keyTranslations)
                .map(([k, v]) => `    ${k}: "${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",`)
                .join('\n');
            c = c.replace(insertAfter, `$1${keysStr}$2`);
            console.log('FIXED ' + lang + ' - inserted inside marketing object');
        } else {
            console.log('SKIP ' + lang + ' - already has explainTitle inside marketing');
        }
    } else {
        // marketing 섹션에서 cat_sports 다음 위치에 삽입 시도
        const insertAfter2 = /(\s+cat_sports:\s*"[^"]*",)/;
        if (!c.includes('explainTitle') && c.match(insertAfter2)) {
            const keysStr = '\n' + Object.entries(keyTranslations)
                .map(([k, v]) => `    ${k}: "${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",`)
                .join('\n');
            c = c.replace(insertAfter2, `$1${keysStr}`);
            console.log('FIXED ' + lang + ' - inserted after cat_sports');
        } else {
            console.log('WARN ' + lang + ' - could not find insert point');
        }
    }

    fs.writeFileSync(file, c, 'utf8');
}

const TRANSLATIONS = {
    en: {
        explainTitle: "AI Channel Recommendation Rationale",
        explainSub: "Based on your selected categories & budget",
        explainCatInsight: "Category Marketing Insights",
        explainChWhy: "Why These Channels?",
        explainEditNote: "AI recommendations only. You can manually change channel selections at any time.",
        ch_explain_meta_strength: "Massive reach · Precision targeting · Multi-format ads",
        ch_explain_meta_why: "With 2B+ users and precise demographic/interest targeting, Meta delivers the widest B2C reach across all categories. Video, image, and catalog ads cover every purchase funnel stage.",
        ch_explain_meta_tip: "Installing the retargeting pixel can increase ROAS 2-3x",
        ch_explain_tiktok_strength: "Short-form viral · Gen-Z/MZ reach · Low CPM",
        ch_explain_tiktok_why: "Lowest CPM with the strongest viral effect. Drives immediate purchase impulse among 10-30s via short-form video. Best for trendy, visually compelling products.",
        ch_explain_tiktok_tip: "Integrating TikTok Shop can boost in-app conversion by 40%",
        ch_explain_google_strength: "High-intent targeting · Search+Display+Shopping",
        ch_explain_google_why: "Captures high-intent users already considering a purchase via search keywords. Shopping ads show product images and prices directly — highest conversion rates. Especially effective for B2B SaaS.",
        ch_explain_google_tip: "Smart Shopping + remarketing combo achieves highest ROAS",
        ch_explain_naver_strength: "Korea #1 search · SmartStore direct link",
        ch_explain_naver_why: "Korea's top search engine. 60%+ of Korean consumer purchase paths start on Naver. SmartStore direct integration enables fast click-to-purchase conversion.",
        ch_explain_naver_tip: "Naver Shopping ads + Brand Search achieves awareness and conversion simultaneously",
        ch_explain_kakao_strength: "47M MAU · CRM messaging · High CTR",
        ch_explain_kakao_why: "Serves ads on KakaoTalk used by 47M daily users. KakaoTalk Channel subscriber messaging delivers outstanding retention.",
        ch_explain_kakao_tip: "KakaoTalk Channel subscribers help cut CAC 60% via direct messaging",
        ch_explain_coupang_strength: "Pre-purchase targeting · Low CPM · Rocket Delivery trust",
        ch_explain_coupang_why: "Directly targets consumers who have decided to purchase inside the Coupang app. Ads near competitor pages deliver the platform highest conversion rates.",
        ch_explain_coupang_tip: "Rocket Delivery badge + Sponsored Products combo achieves ROAS 10x in many cases",
        ch_explain_insta_strength: "Visual branding · Shopping tags · Influencer UGC",
        ch_explain_insta_why: "Communicates brand aesthetics via high-quality images and Reels, shortening discover-to-purchase with shopping tags. Trust and conversion both rise when paired with influencer content.",
        ch_explain_insta_tip: "Reels ads are 30% cheaper CPM than feed — prioritize video creative",
        cat_explain_beauty: "Beauty is driven by visual impact and emotional storytelling. SNS virality and influencer collaboration amplify results most strongly here.",
        cat_explain_fashion: "Fashion: visual trends and model imagery drive 80% of purchase decisions. Short-form video ads (Reels/Shorts) are the most efficient format.",
        cat_explain_general: "Everyday goods need price competitiveness and convenience messaging. High-intent search channels (Naver/Coupang) directly drive purchase conversion.",
        cat_explain_food: "Food requires freshness, health, and taste messaging. Naver search + Kakao CRM is most effective for driving repeat purchases.",
        cat_explain_electronics: "Electronics buyers compare specs before deciding. Google/Naver search + Coupang Sponsored Products capture high-intent targets precisely.",
        cat_explain_travel: "Travel has a long funnel: inspiration to planning to booking. Stimulate desire with emotional content (Meta/IG) then convert with Google search ads.",
        cat_explain_digital: "Digital/app services depend on free trial conversion. Google search + Meta targeting maximize app downloads and subscription conversion.",
        cat_explain_platform: "B2B SaaS/platforms require decision-maker targeting and long sales cycles. Build brand with Google + Naver Brand, then convert with Meta retargeting.",
        cat_explain_overseas_ship: "Cross-border shipping targets experienced overseas shoppers. Meta + Google search capture consumers precisely at the moment of need.",
        cat_explain_overseas_buy: "Buying proxy services catch specific overseas brand enthusiasts. Instagram visuals + Meta targeting stimulate aspirational desire for overseas products.",
        cat_explain_sports: "Sports gear uses performance and challenge emotional appeal. TikTok challenges + Instagram influencers deliver the fastest viral effect.",
    },
    ko: {
        explainTitle: "AI 광고채널 추천 근거",
        explainSub: "선택한 카테고리와 예산 기반 최적 채널 선정",
        explainCatInsight: "카테고리별 마케팅 인사이트",
        explainChWhy: "이 채널을 추천한 이유",
        explainEditNote: "AI 추천 결과입니다. 언제든지 직접 채널을 변경할 수 있습니다.",
        ch_explain_meta_strength: "광범위한 도달·정밀 타겟팅·다양한 광고 형식",
        ch_explain_meta_why: "20억+ 사용자와 정밀한 인구통계·관심사 타겟팅으로 B2C 전 카테고리 최대 도달범위. 비디오·이미지·카탈로그로 구매 퍼널 전 단계 커버.",
        ch_explain_meta_tip: "리타겟팅 픽셀 설치 시 ROAS 2~3배 상승",
        ch_explain_tiktok_strength: "숏폼 바이럴·Z세대 도달·저CPM",
        ch_explain_tiktok_why: "플랫폼 중 CPM이 가장 낮고 바이럴 효과 극대화. 10~30대에 숏폼 영상으로 즉각적인 구매 충동을 유발. 트렌디한 제품에 최적.",
        ch_explain_tiktok_tip: "TikTok Shop 연동 시 인앱 구매 전환율 40% 향상",
        ch_explain_google_strength: "고관심 타겟·검색+쇼핑+디스플레이",
        ch_explain_google_why: "구매를 고려 중인 고관심 사용자를 검색 키워드로 정확히 포착. 쇼핑 광고는 제품 이미지·가격 직접 노출로 전환율 최고. B2B SaaS에 특히 효과적.",
        ch_explain_google_tip: "스마트쇼핑 + 리마케팅 조합으로 최고 ROAS 달성",
        ch_explain_naver_strength: "국내 1위 검색·스마트스토어 직연동",
        ch_explain_naver_why: "한국 1위 검색엔진. 국내 소비자 구매 경로의 60% 이상이 네이버에서 시작. 스마트스토어 직연동으로 클릭→구매 전환이 빠름.",
        ch_explain_naver_tip: "네이버 쇼핑 광고 + 브랜드 검색 병행 시 인지도·전환 동시 달성",
        ch_explain_kakao_strength: "국내 MAU 4700만·채널 CRM·높은 CTR",
        ch_explain_kakao_why: "카카오톡 4700만 DAU 기반 친밀한 채널에서 광고 노출. 채널 팔로워 메시지 마케팅으로 리텐션 효과 탁월.",
        ch_explain_kakao_tip: "카카오 채널 구독자 확보 후 메시지 발송으로 CAC 60% 절감 가능",
        ch_explain_coupang_strength: "구매직전 타겟·저CPM·로켓배송 신뢰",
        ch_explain_coupang_why: "쿠팡 앱 내에서 구매를 결정한 소비자에게 직접 노출. 경쟁사 상품 근처 광고 배치로 플랫폼 내 전환율 최고.",
        ch_explain_coupang_tip: "로켓배송 배지 + 스폰서드 프로덕트로 ROAS 10x 달성 사례 다수",
        ch_explain_insta_strength: "비주얼 브랜딩·쇼핑 태그·인플루언서 UGC",
        ch_explain_insta_why: "고품질 이미지·릴스로 브랜드 감성 전달, 쇼핑 태그로 탐색→구매 경로 단축. 인플루언서 병행 시 신뢰도·전환율 동반 상승.",
        ch_explain_insta_tip: "릴스 광고 CPM이 피드 광고 대비 30% 저렴 — 영상 소재 우선",
        cat_explain_beauty: "뷰티·코스메틱은 비주얼 임팩트와 감성 스토리텔링이 핵심. SNS 바이럴과 인플루언서 협업 효과가 극대화.",
        cat_explain_fashion: "패션은 비주얼 트렌드와 인물 이미지가 구매 결정의 80%를 차지. 릴스·쇼츠 숏폼 영상 광고가 가장 효율적.",
        cat_explain_general: "생활용품은 가격 경쟁력과 편의성 소구가 핵심. 네이버·쿠팡 등 검색 의도 타겟으로 구매 전환 직접 공략.",
        cat_explain_food: "식품은 신선도·건강 효능·맛 소구가 중요. 네이버 검색+카카오 CRM으로 반복구매 유도가 효과적.",
        cat_explain_electronics: "전자기기는 스펙 비교 후 구매 결정. 구글·네이버 검색+쿠팡 스폰서드로 구매의향 타겟을 정확히 포착.",
        cat_explain_travel: "여행은 인스피레이션→계획→예약의 긴 퍼널. Meta/IG 감성 콘텐츠로 욕구 자극 후 구글 검색으로 전환.",
        cat_explain_digital: "디지털·앱 서비스는 무료 체험 전환이 핵심. 구글 검색+Meta 타겟팅으로 앱 다운로드·구독 전환 극대화.",
        cat_explain_platform: "B2B SaaS·플랫폼은 의사결정자 타겟팅과 긴 영업 사이클. 구글+네이버 브랜드로 인지 후 Meta 리타겟팅으로 전환.",
        cat_explain_overseas_ship: "해외배송 대행은 직구 경험자·해외 커머스 관심층 타겟. Meta·구글로 필요 시점 정확히 공략.",
        cat_explain_overseas_buy: "구매대행은 특정 해외 브랜드 관심층 포착이 핵심. Instagram+Meta로 해외 제품 선망 욕구 자극.",
        cat_explain_sports: "스포츠용품은 퍼포먼스·도전 감성 소구. TikTok 챌린지+Instagram 인플루언서가 가장 빠른 바이럴 효과.",
    },
    ja: {
        explainTitle: "AI広告チャンネル推薦の根拠",
        explainSub: "選択したカテゴリと予算に基づく最適チャンネル選定",
        explainCatInsight: "カテゴリ別マーケティングインサイト",
        explainChWhy: "このチャンネルを推薦した理由",
        explainEditNote: "AIによる推薦です。いつでも手動でチャンネルを変更できます。",
        ch_explain_meta_strength: "広範なリーチ・精密ターゲティング・多様な広告形式",
        ch_explain_meta_why: "20億以上のユーザーと精密なターゲティングで全カテゴリに最大リーチ。動画・画像・カタログ広告で購買ファネル全段階をカバー。",
        ch_explain_meta_tip: "リターゲティングピクセル導入でROAS 2〜3倍向上",
        ch_explain_tiktok_strength: "ショート動画バイラル・Z世代リーチ・低CPM",
        ch_explain_tiktok_why: "最低CPMで最強のバイラル効果。ショート動画で10〜30代に即時購買衝動を誘発。トレンド商品に最適。",
        ch_explain_tiktok_tip: "TikTok Shop連携でアプリ内コンバージョン40%向上",
        ch_explain_google_strength: "高意向ターゲット・検索+ショッピング+ディスプレイ",
        ch_explain_google_why: "購買を検討中のユーザーを検索キーワードで正確に捕捉。ショッピング広告は商品画像・価格を直接表示し最高転換率。",
        ch_explain_google_tip: "スマートショッピング+リマーケティングで最高ROAS達成",
        ch_explain_naver_strength: "韓国No.1検索・スマートストア連携",
        ch_explain_naver_why: "韓国1位の検索エンジン。韓国消費者の購買経路の60%以上がNaver検索から始まります。",
        ch_explain_naver_tip: "Naverショッピング+ブランド検索で認知度・転換を同時達成",
        ch_explain_kakao_strength: "韓国MAU 4700万・チャンネルCRM・高CTR",
        ch_explain_kakao_why: "KakaoTalkの親密なチャンネルで広告配信。フォロワー向けメッセージで高いリテンション効果。",
        ch_explain_kakao_tip: "Kakaoチャンネル登録者獲得後のメッセージでCAC 60%削減可能",
        ch_explain_coupang_strength: "購買直前ターゲット・低CPM・ロケット配送の信頼",
        ch_explain_coupang_why: "Coupangアプリ内で購買決定済みの消費者に直接配信。競合商品近くに広告配置でプラットフォーム内最高転換率。",
        ch_explain_coupang_tip: "ロケット配送バッジ+スポンサードプロダクトでROAS 10x達成事例多数",
        ch_explain_insta_strength: "ビジュアルブランディング・ショッピングタグ・インフルエンサーUGC",
        ch_explain_insta_why: "高品質画像・リールでブランド感性を伝え、ショッピングタグで発見→購買経路を短縮。インフルエンサー協業で信頼と転換率が向上。",
        ch_explain_insta_tip: "リールズ広告のCPMはフィード広告より30%低い — 動画クリエイティブを優先",
        cat_explain_beauty: "ビューティーはビジュアルと感情的ストーリーテリングが核心。SNSバイラルとインフルエンサー協業の効果が最大化するカテゴリ。",
        cat_explain_fashion: "ファッションはビジュアルトレンドと人物画像が購買決定の80%。ショート動画広告が最も効率的。",
        cat_explain_general: "日用品は価格競争力と利便性訴求が核心。Naver・Coupangの検索意図ターゲットで購買転換を直接攻略。",
        cat_explain_food: "食品は鮮度・健康効能・味訴求が重要。Naver検索+Kakao CRMでリピート購買誘導が効果的。",
        cat_explain_electronics: "電子機器はスペック比較後購買決定。Google・Naver検索+Coupangで高意向ターゲットを正確に捕捉。",
        cat_explain_travel: "旅行はインスピレーション→計画→予約の長いファネル。感性コンテンツ(Meta/IG)で欲求刺激後Google検索で転換。",
        cat_explain_digital: "デジタル・アプリは無料体験転換が核心。Google検索+Metaターゲティングでダウンロード・サブスク転換を最大化。",
        cat_explain_platform: "B2B SaaS・プラットフォームは意思決定者ターゲティングと長い営業サイクル。Google+Naverで認知後、Metaリターゲティングで転換。",
        cat_explain_overseas_ship: "海外配送代行は個人輸入経験者・越境ECへの関心層ターゲット。Meta・Googleで需要のタイミングを正確に捕捉。",
        cat_explain_overseas_buy: "購買代行は特定海外ブランドへの関心層捕捉が核心。Instagram+Metaで海外製品への憧れ欲求を刺激。",
        cat_explain_sports: "スポーツ用品はパフォーマンス・挑戦感性訴求。TikTokチャレンジ+Instagramインフルエンサーが最速のバイラル効果。",
    },
    zh: {
        explainTitle: "AI广告渠道推荐依据",
        explainSub: "基于所选类别和预算的最优渠道选择",
        explainCatInsight: "类别营销洞察",
        explainChWhy: "为何推荐这些渠道？",
        explainEditNote: "这是AI推荐结果，您可随时手动更改渠道选择。",
        ch_explain_meta_strength: "广泛覆盖·精准定向·多种广告形式",
        ch_explain_meta_why: "凭借20亿+用户和精准人口统计/兴趣定向，Meta在所有B2C类别中覆盖最广。视频、图片、目录广告覆盖购买漏斗各阶段。",
        ch_explain_meta_tip: "安装再营销像素可使ROAS提升2-3倍",
        ch_explain_tiktok_strength: "短视频病毒传播·Z世代覆盖·低CPM",
        ch_explain_tiktok_why: "CPM最低，病毒效果最强。通过短视频激发10-30岁核心消费群体的即时购买冲动。最适合趋势产品。",
        ch_explain_tiktok_tip: "接入TikTok Shop可使应用内转化率提升40%",
        ch_explain_google_strength: "高意向定向·搜索+购物+展示",
        ch_explain_google_why: "通过搜索关键词精准捕获正在考虑购买的高意向用户。购物广告直接展示产品图片和价格，转化率最高。",
        ch_explain_google_tip: "智能购物+再营销组合实现最高ROAS",
        ch_explain_naver_strength: "韩国第一搜索·SmartStore直连",
        ch_explain_naver_why: "韩国第一搜索引擎。韩国消费者60%以上的购买路径从Naver搜索开始。SmartStore直连使点击到购买转化更快。",
        ch_explain_naver_tip: "Naver购物广告+品牌搜索同时实现品牌认知和转化",
        ch_explain_kakao_strength: "韩国MAU 4700万·频道CRM·高CTR",
        ch_explain_kakao_why: "在KakaoTalk亲密沟通渠道上投放广告，覆盖4700万日活用户。频道订阅者消息营销带来出色的留存效果。",
        ch_explain_kakao_tip: "获取KakaoTalk频道订阅者后，通过消息发送可将CAC降低60%",
        ch_explain_coupang_strength: "购前定向·低CPM·火箭配送信任",
        ch_explain_coupang_why: "直接触达Coupang应用内已决定购买的消费者。在竞品页面附近投放广告，平台内转化率最高。",
        ch_explain_coupang_tip: "火箭配送标识+赞助商品组合，多案例实现ROAS 10倍",
        ch_explain_insta_strength: "视觉品牌·购物标签直购·网红UGC",
        ch_explain_insta_why: "通过高质量图片和Reels传递品牌美感，购物标签缩短发现到购买路径。配合网红合作内容，信任度和转化率双提升。",
        ch_explain_insta_tip: "Reels广告CPM比动态广告低30%——优先使用视频素材",
        cat_explain_beauty: "美妆类目的核心是视觉冲击和情感故事。SNS病毒传播和网红合作效果在该类目最为显著。",
        cat_explain_fashion: "时尚类目视觉趋势和人物形象影响80%的购买决策。短视频广告效率最高。",
        cat_explain_general: "日用品的核心是价格竞争力和便利性诉求。搜索意图定向直接促进购买转化。",
        cat_explain_food: "食品需要强调新鲜度、健康功效和口味。Naver搜索+Kakao CRM最适合促进复购。",
        cat_explain_electronics: "电子产品买家在购买前比较规格。Google/Naver搜索+Coupang赞助商品精准捕获高意向用户。",
        cat_explain_travel: "旅行有较长的购买漏斗：灵感→计划→预订。用感性内容激发欲望，再用Google搜索广告促进转化。",
        cat_explain_digital: "数字/应用服务依赖免费试用转化。Google搜索+Meta定向最大化应用下载和订阅转化。",
        cat_explain_platform: "B2B SaaS/平台需要决策者定向和较长的销售周期。用Google+Naver品牌建立认知，再用Meta再营销促进转化。",
        cat_explain_overseas_ship: "跨境物流服务面向有个人进口经验和跨境电商兴趣的用户。Meta+Google精准捕获需求时刻。",
        cat_explain_overseas_buy: "代购服务需要锁定特定海外品牌爱好者。Instagram视觉+Meta定向激发对海外产品的向往。",
        cat_explain_sports: "运动产品诉求性能和挑战精神。TikTok挑战赛+Instagram网红带来最快的病毒效果。",
    },
};
// 마케팅 객체 안에 정확히 삽입하는 함수
function insertInMarketingObject(lang, translations) {
    const file = path.join(localesDir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');

    // 이미 있으면 스킵
    if (c.includes('explainTitle:')) { console.log('SKIP ' + lang); return; }

    // marketing 섹션의 cat_sports 항목 바로 다음에 삽입
    // marketing 섹션을 찾아서 삽입 위치 결정
    const keysStr = '\n' + Object.entries(translations)
        .map(([k, v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`)
        .join('\n');

    // 정규식: marketing 객체 내에서 cat_sports 또는 tag_enterprise 다음에 삽입
    const patterns = [
        /( {4}tag_enterprise: "[^"]*",)/,
        /( {4}cat_sports: "[^"]*",)/,
        /( {4}cat_platform: "[^"]*",)/,
    ];
    
    let inserted = false;
    for (const pat of patterns) {
        if (pat.test(c)) {
            c = c.replace(pat, `$1${keysStr}`);
            inserted = true;
            break;
        }
    }
    if (!inserted) {
        console.log('WARN ' + lang + ' - no insert point found');
        return;
    }
    fs.writeFileSync(file, c, 'utf8');
    console.log('DONE ' + lang);
}

['en', 'ko', 'ja', 'zh'].forEach(lang => {
    insertInMarketingObject(lang, TRANSLATIONS[lang]);
});
console.log('All done');
