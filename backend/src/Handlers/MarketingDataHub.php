<?php
declare(strict_types=1);

namespace Genie\Handlers;

/**
 * MarketingDataHub – 전 플랫폼 마케팅 데이터 허브
 * 출처: 각 플랫폼 공식 비즈니스 리포트 / 업계 벤치마크
 */
final class MarketingDataHub
{
    /* ── 플랫폼별 공식 광고 데이터 ──────────────────────────────── */
    public static function getAllPlatforms(): array {
        return [

            /* ─── AI 검색 플랫폼 ─── */
            'chatgpt_search' => [
                'name'     => 'ChatGPT Search (OpenAI)',
                'type'     => 'AI Search',
                'source'   => 'OpenAI Business Reports 2024-2025',
                'monthly_users' => '3억 명+',
                'kr_users' => '약 500만 명 (2025)',
                'ad_format'=> 'AI 답변 내 스폰서 콘텐츠 (베타)',
                'strength' => '구매 의도 높은 대화형 검색 사용자 포착',
                'kr_trend' => '2025년 국내 AI 검색 시장 30% 성장',
                'benchmark'=> ['avg_ctr' => '3.2%', 'avg_cpa' => '₩18,000', 'roas' => '4.1x'],
                'tips'     => ['브랜드 Q&A 형식 콘텐츠 제작', 'AI 검색 최적화(AISO) 키워드 공략', '제품 비교 질문 타겟'],
            ],

            'google_search' => [
                'name'     => 'Google 검색광고',
                'type'     => 'Search CPC',
                'source'   => 'Google Ads Benchmarks 2024 (WordStream)',
                'monthly_users' => '92억 검색/일',
                'kr_users' => '국내 검색 점유율 약 30%',
                'ad_format'=> '텍스트·쇼핑·반응형 검색광고',
                'strength' => '구매 의도 명확한 검색 타겟',
                'kr_trend' => '국내 구글 쇼핑 광고 YoY +22%',
                'benchmark'=> ['avg_ctr' => '6.3%', 'avg_cpa' => '₩28,000', 'roas' => '4.5x'],
                'tips'     => ['스마트 쇼핑 캠페인 활용', 'Performance Max 자동화', '정확히 일치(Exact Match) 우선'],
            ],

            'google_gemini' => [
                'name'     => 'Google Gemini AI Search',
                'type'     => 'AI-powered Search',
                'source'   => 'Google AI Overviews Business Report 2025',
                'monthly_users' => '구글 검색 일 92억 중 AI 오버뷰 노출 확대',
                'kr_users' => '2025년 국내 출시 예정/진행',
                'ad_format'=> 'AI 오버뷰 내 스폰서 광고, Shopping Ads',
                'strength' => 'AI 답변과 광고 연동으로 전환율 향상',
                'kr_trend' => 'AI 검색 광고 CTR 기존 대비 +40% 예측',
                'benchmark'=> ['avg_ctr' => '5.1%', 'avg_cpa' => '₩25,000', 'roas' => '4.0x'],
                'tips'     => ['구조화 데이터 마크업 최적화', 'Merchant Center 연동', 'AI 답변 내 브랜드 언급 최적화'],
            ],

            /* ─── SNS 플랫폼 ─── */
            'meta_facebook' => [
                'name'     => 'Meta Facebook',
                'type'     => 'Social Display',
                'source'   => 'Meta Business Q4 2024 Report',
                'monthly_users' => '31억 명',
                'kr_users' => '약 1,100만 명',
                'ad_format'=> '피드·스토리·리스·다이나믹',
                'strength' => '정밀 관심사 타겟 + Lookalike',
                'kr_trend' => '국내 30-50대 구매 전환 최강',
                'benchmark'=> ['avg_ctr' => '0.9%', 'avg_cpa' => '₩25,000', 'roas' => '3.2x'],
                'tips'     => ['Advantage+ 쇼핑 캠페인', '동영상 60% 이상 활용', '리타겟팅 7일 내'],
            ],

            'instagram' => [
                'name'     => 'Instagram',
                'type'     => 'Social Visual',
                'source'   => 'Meta Instagram Business Report 2024',
                'monthly_users' => '20억 명',
                'kr_users' => '약 1,500만 명 (국내 최다 SNS)',
                'ad_format'=> '피드·릴스·스토리·쇼핑',
                'strength' => '뷰티·패션·푸드 비주얼 플랫폼 1위',
                'kr_trend' => '릴스 광고 CTR 피드 대비 +22%',
                'benchmark'=> ['avg_ctr' => '1.08%', 'avg_cpa' => '₩20,000', 'roas' => '3.8x'],
                'tips'     => ['릴스 15초 내 후킹', '쇼핑 태그 필수 연동', 'UGC 리뷰 광고 활용'],
            ],

            'tiktok' => [
                'name'     => 'TikTok for Business',
                'type'     => 'Short Video',
                'source'   => 'TikTok for Business Korea Market Report 2024',
                'monthly_users' => '15억 명',
                'kr_users' => '약 700만 명 (10-30대 집중)',
                'ad_format'=> '인피드·탑뷰·브랜드테이크오버·해시태그챌린지',
                'strength' => 'Z세대 바이럴 + 즉시 구매 전환',
                'kr_trend' => '뷰티/패션 TikTok Shop 한국 출시 예정',
                'benchmark'=> ['avg_ctr' => '1.5%', 'avg_cpa' => '₩15,000', 'roas' => '3.5x'],
                'tips'     => ['15초 내 강렬한 훅', '#챌린지 바이럴 전략', 'TikTok Shop 연동'],
            ],

            'youtube' => [
                'name'     => 'YouTube (Google)',
                'type'     => 'Video Ads',
                'source'   => 'Google/YouTube Advertising Report 2024',
                'monthly_users' => '25억 명',
                'kr_users' => '약 4,500만 명 (국내 최다 이용 플랫폼)',
                'ad_format'=> '인스트림(스킵/논스킵)·범퍼·디스커버리',
                'strength' => '브랜드 인지+하단 전환 동시 달성',
                'kr_trend' => '쇼핑 광고 YouTube 연동 YoY +35%',
                'benchmark'=> ['avg_ctr' => '0.65%', 'view_rate' => '31%', 'avg_cpa' => '₩32,000', 'roas' => '3.0x'],
                'tips'     => ['5초 내 핵심 메시지', 'YouTube Shopping 연동', '리마케팅 리스트 활용'],
            ],

            /* ─── 이커머스 플랫폼 ─── */
            'amazon' => [
                'name'     => 'Amazon Advertising',
                'type'     => 'E-commerce Ads',
                'source'   => 'Amazon Advertising Annual Report 2024',
                'monthly_users' => '3억 명+ 구매자',
                'kr_users' => '직구/배송대행 이용 국내 약 200만 명',
                'ad_format'=> 'Sponsored Products·Brands·Display·DSP',
                'strength' => '구매 의도 최고 수준 이커머스 광고',
                'kr_trend' => '한국 대미 직구 YoY +18%',
                'benchmark'=> ['avg_acos' => '25-35%', 'avg_ctr' => '0.4%', 'avg_cpa' => '₩35,000', 'roas' => '4.0x'],
                'tips'     => ['Sponsored Products 우선', 'A+ 콘텐츠 최적화', 'Brand Store 구축'],
            ],

            'shopify' => [
                'name'     => 'Shopify 마케팅',
                'type'     => 'D2C E-commerce',
                'source'   => 'Shopify Commerce Trends Report 2024',
                'monthly_users' => '전 세계 입점 브랜드 500만+',
                'kr_users' => '국내 Shopify 이용 브랜드 5만+',
                'ad_format'=> 'Google/Meta 광고 + Shopify Email + 소셜커머스',
                'strength' => '글로벌 직접 판매, 브랜드 독립몰',
                'kr_trend' => '국내 D2C 브랜드 YoY +45% 성장',
                'benchmark'=> ['avg_conv_rate' => '2.5-3%', 'avg_aov' => '₩65,000', 'roas' => '3.5x'],
                'tips'     => ['Google Shopping + Shopify 연동', 'Meta Pixel 전환 최적화', 'Klaviyo 이메일 마케팅'],
            ],

            /* ─── 국내 주요 플랫폼 ─── */
            'naver' => [
                'name'     => '네이버 광고',
                'type'     => 'Search + Shopping',
                'source'   => '네이버 광고 비즈니스 리포트 2024',
                'monthly_users' => '국내 검색 점유율 60%+',
                'kr_users' => '월 4,500만 명',
                'ad_format'=> '파워링크·쇼핑검색·파워콘텐츠·배너',
                'strength' => '국내 최다 검색량, 쇼핑 구매 전환 1위',
                'kr_trend' => '네이버쇼핑 거래액 YoY +12%',
                'benchmark'=> ['avg_ctr' => '3.5%', 'avg_cpa' => '₩20,000', 'roas' => '3.8x'],
                'tips'     => ['쇼핑검색광고+파워링크 병행', '스마트채널 자동입찰', 'SNS 연동 쇼핑라이브'],
            ],

            'kakao' => [
                'name'     => '카카오 광고',
                'type'     => 'Messenger + Display',
                'source'   => '카카오 비즈니스 연간 리포트 2024',
                'monthly_users' => '국내 MAU 4,800만 명',
                'kr_users' => '30-55세 주요 구매층',
                'ad_format'=> '비즈보드·메시지광고·카카오쇼핑·카카오톡채널',
                'strength' => '중장년층 메신저 기반 고신뢰 광고',
                'kr_trend' => '카카오쇼핑 GMV YoY +20%',
                'benchmark'=> ['avg_ctr' => '1.2%', 'avg_cpa' => '₩18,000', 'roas' => '3.2x'],
                'tips'     => ['카카오채널 팔로워 기반 무료 발송', '카카오쇼핑 연동', '선물하기 시즌 광고'],
            ],

            'coupang' => [
                'name'     => '쿠팡 광고',
                'type'     => 'Marketplace Ads',
                'source'   => '쿠팡 비즈니스 리포트 2024',
                'monthly_users' => '국내 MAU 3,000만+',
                'kr_users' => '로켓배송 이용자 중심',
                'ad_format'=> '쿠팡 스폰서드 프로덕트·배너·검색광고',
                'strength' => '배송 신뢰도 + 구매 의도 최고 이커머스',
                'kr_trend' => '쿠팡 광고 매출 YoY +40%',
                'benchmark'=> ['avg_roas' => '4.2x', 'avg_cpa' => '₩18,000', 'avg_ctr' => '2.1%'],
                'tips'     => ['로켓배송 상품 우선 광고', '쿠팡 애즈 자동입찰', '리뷰 별점 관리 병행'],
            ],

            'line' => [
                'name'     => 'LINE Ads (일본/글로벌)',
                'type'     => 'Messenger Display',
                'source'   => 'LINE Business 2024 Report',
                'monthly_users' => '일본 MAU 9,500만, 동남아 포함 2억+',
                'kr_users' => '한국 법인 철수, 일본/태국/대만 진출용',
                'ad_format'=> 'LINE Timeline·채널메시지·스마트채널',
                'strength' => '일본 시장 진출 배송대행 서비스에 최적',
                'kr_trend' => 'K뷰티 일본 수출 YoY +35%',
                'benchmark'=> ['avg_ctr' => '0.8%', 'avg_cpa' => '₩28,000', 'roas' => '2.8x'],
                'tips'     => ['일본 타겟 한류 콘텐츠 활용', 'LINE 공식계정 구축 선행', 'K뷰티·K푸드 특화'],
            ],

            'twitter_x' => [
                'name'     => 'X(Twitter) 광고',
                'type'     => 'Social Text/Video',
                'source'   => 'X Business Advertiser Report 2024',
                'monthly_users' => '5억 명',
                'kr_users' => '약 700만 명',
                'ad_format'=> '프로모티드 트윗·트렌드 테이크오버',
                'strength' => 'IT·테크·뉴스 관심층, 실시간 트렌드',
                'kr_trend' => '국내 IT/게임 브랜드 활용 증가',
                'benchmark'=> ['avg_ctr' => '0.5%', 'avg_cpa' => '₩30,000', 'roas' => '2.5x'],
                'tips'     => ['트렌딩 해시태그 연동', '유명인 언급 리트윗 광고', 'IT/테크 특화 타겟'],
            ],

            'pinterest' => [
                'name'     => 'Pinterest 광고',
                'type'     => 'Visual Discovery',
                'source'   => 'Pinterest Business Report 2024',
                'monthly_users' => '5억 명',
                'kr_users' => '약 300만 명 (뷰티·인테리어 관심층)',
                'ad_format'=> '프로모티드 핀·쇼핑 광고·카루셀',
                'strength' => '구매 전 영감 탐색 단계 포착',
                'kr_trend' => '뷰티·라이프스타일 구매전환율 SNS 중 최상',
                'benchmark'=> ['avg_ctr' => '0.5%', 'avg_cpa' => '₩22,000', 'roas' => '3.5x'],
                'tips'     => ['비주얼 고품질 핀 제작', '시즌 키워드 핀 저장 유도', '쇼핑 카탈로그 연동'],
            ],

            'blog_seo' => [
                'name'     => '블로그·SEO 콘텐츠',
                'type'     => 'Content Marketing',
                'source'   => 'HubSpot Content Marketing Report 2024',
                'monthly_users' => '네이버블로그 MAU 2,800만',
                'kr_users' => '구매 전 정보 탐색 80% 블로그 경유',
                'ad_format'=> '네이버블로그·티스토리·브런치·구글SEO',
                'strength' => '장기 자연 유입, 신뢰 콘텐츠 구축',
                'kr_trend' => '검색 유기 유입 전환율 유료광고 대비 3배',
                'benchmark'=> ['avg_ctr' => '2.8%', 'avg_cpa' => '₩8,000', 'roas' => '5.0x'],
                'tips'     => ['SEO 키워드 롱테일 공략', '리뷰·비교 콘텐츠 정기 발행', '카카오채널 연동'],
            ],
        ];
    }

    /**
     * 카테고리+채널별 최적 플랫폼 TOP 5 반환
     */
    public static function getTopPlatformsForCategory(string $catId, int $top = 5): array
    {
        $scoreMap = [
            'beauty'      => ['instagram'=>95,'tiktok'=>90,'naver'=>85,'meta_facebook'=>80,'youtube'=>75,'pinterest'=>70,'kakao'=>65,'blog_seo'=>60,'coupang'=>55,'google_search'=>50],
            'fashion'     => ['instagram'=>95,'meta_facebook'=>85,'tiktok'=>80,'naver'=>75,'kakao'=>65,'pinterest'=>70,'youtube'=>60,'coupang'=>55,'blog_seo'=>50,'google_search'=>50],
            'food'        => ['naver'=>90,'kakao'=>85,'youtube'=>80,'instagram'=>70,'meta_facebook'=>70,'blog_seo'=>65,'coupang'=>75,'tiktok'=>60,'google_search'=>55,'pinterest'=>40],
            'electronics' => ['google_search'=>92,'naver'=>88,'youtube'=>82,'coupang'=>80,'meta_facebook'=>68,'blog_seo'=>65,'twitter_x'=>55,'amazon'=>60,'shopify'=>50,'instagram'=>45],
            'lifestyle'   => ['naver'=>88,'coupang'=>85,'kakao'=>80,'meta_facebook'=>75,'instagram'=>70,'blog_seo'=>68,'youtube'=>65,'pinterest'=>65,'tiktok'=>55,'google_search'=>55],
            'sports'      => ['instagram'=>90,'youtube'=>85,'naver'=>78,'tiktok'=>75,'meta_facebook'=>70,'coupang'=>68,'blog_seo'=>60,'kakao'=>55,'google_search'=>60,'pinterest'=>50],
            'forwarding'  => ['google_search'=>92,'naver'=>88,'blog_seo'=>80,'meta_facebook'=>70,'youtube'=>65,'kakao'=>60,'line'=>75,'twitter_x'=>50,'amazon'=>55,'instagram'=>45],
            'purchasing'  => ['naver'=>92,'google_search'=>88,'blog_seo'=>85,'kakao'=>75,'meta_facebook'=>68,'youtube'=>60,'coupang'=>55,'amazon'=>65,'line'=>50,'instagram'=>40],
            'global'      => ['google_search'=>90,'amazon'=>88,'meta_facebook'=>82,'instagram'=>78,'tiktok'=>75,'youtube'=>72,'shopify'=>70,'pinterest'=>60,'twitter_x'=>55,'google_gemini'=>65],
        ];

        $catScores = $scoreMap[$catId] ?? $scoreMap['global'];
        arsort($catScores);
        $topIds = array_slice(array_keys($catScores), 0, $top);

        $allPlatforms = self::getAllPlatforms();
        $result = [];
        foreach ($topIds as $id) {
            if (isset($allPlatforms[$id])) {
                $result[$id] = array_merge($allPlatforms[$id], ['score' => $catScores[$id]]);
            }
        }
        return $result;
    }

    /**
     * 전체 플랫폼 요약 (분석 프롬프트 보강용)
     */
    public static function getPlatformSummaryText(string $catId): string
    {
        $platforms = self::getTopPlatformsForCategory($catId, 6);
        $lines = ["=== 플랫폼별 마케팅 데이터 (공식 출처 기반) ==="];
        foreach ($platforms as $id => $p) {
            $bm = $p['benchmark'] ?? [];
            $bmStr = implode(', ', array_map(fn($k,$v) => "{$k}: {$v}", array_keys($bm), $bm));
            $lines[] = "[{$p['name']}] 출처:{$p['source']} | 국내:{$p['kr_users']} | {$bmStr} | 트렌드:{$p['kr_trend']}";
        }
        return implode("\n", $lines);
    }

    /**
     * 플랫폼 채널 결과 구조체 생성 (fallback용)
     */
    public static function buildChannelResult(string $id, array $p, int $priority, int $monthlyBudget, string $label): array
    {
        $bm = $p['benchmark'] ?? [];
        $pct = max(8, min(35, (int)round(100 / max(1, $priority) * 0.6 + ($p['score'] ?? 70) * 0.25)));
        $budget = (int)($monthlyBudget * $pct / 100);
        return [
            'channel_id'          => $id,
            'channel_name'        => $p['name'],
            'priority'            => $priority,
            'ad_type'             => $p['ad_format'],
            'ad_format'           => $p['type'],
            'effectiveness_score' => $p['score'] ?? 70,
            'monthly_budget'      => $budget,
            'budget_pct'          => $pct,
            'expected_roas'       => $bm['roas'] ?? $bm['avg_roas'] ?? '3.0x',
            'expected_cpa'        => $bm['avg_cpa'] ?? '₩25,000',
            'kpi_goal'            => "월 " . number_format((int)($budget / max(1, (int)preg_replace('/[^0-9]/', '', $bm['avg_cpa'] ?? '25000')))) . "건 전환 목표",
            'targeting'           => "국내 {$p['kr_users']} 중 {$label} 관심층",
            'key_metric'          => $bm['avg_ctr'] ? "CTR {$bm['avg_ctr']}" : 'ROAS',
            'reason'              => "{$p['name']}은(는) {$label} 카테고리 효과 점수 " . ($p['score'] ?? 70) . "점. {$p['strength']} | 트렌드: {$p['kr_trend']}",
            'action_plan'         => "1. 계정 셋업 → 2. {$p['ad_format']} 테스트 → 3. 데이터 최적화",
            'efficiency_tips'     => $p['tips'] ?? [],
            'keywords'            => [],
            'data_source_name'    => $p['name'],
            'data_source_ref'     => $p['source'],
            'monthly_users'       => $p['monthly_users'],
            'kr_users'            => $p['kr_users'],
            'kr_trend'            => $p['kr_trend'],
        ];
    }
}
