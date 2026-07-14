<?php

declare(strict_types=1);

namespace Genie\Handlers;

/**
 * [현 차수] 채널별 상품등록 **필수 계약** 선언 + 전송 전 일괄 검증(preflight).
 *
 * ── 왜 필요한가 (네이버에서 배운 것) ──────────────────────────────────────
 * 네이버 스마트스토어 연동은 수정이 여러 차수에 걸쳐 반복됐다. 이유는 실력이 아니라 **피드백 구조**다:
 * 채널은 요청을 받아야 오류를 알려주고, 그것도 **한 번에 하나씩** 알려준다.
 *   1차 등록 → "leafCategoryId 없음" → 고침 → 2차 → "상품정보제공고시 없음" → 고침 → 3차 → "배송비 없음"
 *   → 4차 → "AS 안내 없음" → 5차 → "원산지 없음" → 6차 → "대표이미지 없음" …
 * 채널 하나당 이 왕복이 6번이면, 남은 17개 채널에서 100번 반복된다. 이것이 사용자가 겪은 고통의 구조다.
 *
 * ── 해법 ───────────────────────────────────────────────────────────────
 * 채널이 요구하는 것을 **우리가 먼저 안다**. 각 채널의 필수 필드를 선언해 두고, 전송 **전에** 전부 검사해
 * 빠진 것을 **한 번에 모두** 한국어로 알려준다. 왕복이 6번에서 1번으로 준다.
 *   - 채널 API 를 부르기 전에 잡으므로 실패 카운트·페널티·중복 등록이 생기지 않는다.
 *   - 필드명을 지어내지 않는다. 여기 적힌 것은 각 어댑터가 **실제로 payload 에 넣는 키**뿐이다.
 *
 * ── 새 채널 추가 시 ────────────────────────────────────────────────────
 *   REQUIRED 에 한 줄 선언한다. 선언이 없으면 공통 필수(이름·SKU·가격)만 검사하고 통과시킨다
 *   (알지 못하는 것을 요구하지 않는다 — 거짓 차단 금지).
 */
final class ChannelContract
{
    /** 모든 채널 공통 — 이게 없으면 어느 채널도 상품을 만들 수 없다. */
    private const COMMON = [
        ['key' => 'name',  'label' => '상품명',   'hint' => '상품등록에서 상품명을 입력하세요'],
        ['key' => 'sku',   'label' => 'SKU',      'hint' => '상품등록에서 SKU(자체 상품코드)를 입력하세요'],
        ['key' => 'price', 'label' => '판매가',   'hint' => '상품등록에서 판매가를 0보다 크게 입력하세요', 'positive' => true],
    ];

    /**
     * 채널별 추가 필수. `key` 는 어댑터가 실제로 읽는 payload 키다(추측 아님 — 어댑터 코드와 1:1).
     * `image` => true 는 "대표 이미지 최소 1장" 을 뜻한다.
     */
    private const REQUIRED = [
        'naver' => [
            ['key' => 'category_code', 'label' => '네이버 리프 카테고리', 'hint' => '카테고리 매핑 탭에서 지정하거나 자동매칭 후보를 선택하세요'],
            ['image' => true],
        ],
        'naver_smartstore' => [
            ['key' => 'category_code', 'label' => '네이버 리프 카테고리', 'hint' => '카테고리 매핑 탭에서 지정하거나 자동매칭 후보를 선택하세요'],
            ['image' => true],
        ],
        'coupang' => [
            ['key' => 'category_code', 'label' => '쿠팡 노출카테고리코드(displayCategoryCode)', 'hint' => '카테고리 매핑에서 쿠팡 코드를 지정하세요', 'numeric' => true],
            ['image' => true],
        ],
        '11st' => [['key' => 'category_code', 'label' => '11번가 표시카테고리(dispCtgrNo)', 'hint' => '카테고리 매핑에서 11번가 카테고리번호를 지정하세요']],
        'st11' => [['key' => 'category_code', 'label' => '11번가 표시카테고리(dispCtgrNo)', 'hint' => '카테고리 매핑에서 11번가 카테고리번호를 지정하세요']],
        'gmarket' => [['key' => 'category_code', 'label' => 'G마켓 카테고리코드', 'hint' => '카테고리 매핑에서 ESM 카테고리코드를 지정하세요']],
        'auction' => [['key' => 'category_code', 'label' => '옥션 카테고리코드', 'hint' => '카테고리 매핑에서 ESM 카테고리코드를 지정하세요']],
        'lotteon' => [['key' => 'category_code', 'label' => '롯데온 카테고리코드', 'hint' => '카테고리 매핑에서 롯데온 카테고리코드를 지정하세요']],
        'amazon' => [['key' => 'category_code', 'label' => 'Amazon productType', 'hint' => '카테고리 매핑에서 productType(예: LUGGAGE)을 지정하세요']],
        'amazon_spapi' => [['key' => 'category_code', 'label' => 'Amazon productType', 'hint' => '카테고리 매핑에서 productType(예: LUGGAGE)을 지정하세요']],
        'shopee' => [['key' => 'category_id', 'label' => 'Shopee 카테고리 ID', 'hint' => '카테고리 매핑에서 Shopee category_id 를 지정하세요', 'numeric' => true]],
        'lazada' => [['key' => 'category_id', 'label' => 'Lazada PrimaryCategory', 'hint' => '카테고리 매핑에서 Lazada category_id 를 지정하세요']],
        'etsy'   => [['key' => 'taxonomy_id', 'label' => 'Etsy taxonomy_id', 'hint' => '카테고리 매핑에서 Etsy taxonomy_id 를 지정하세요']],
        'magento' => [], // SKU(공통) 만으로 등록 가능
        'ebay'    => [], // SKU(공통) 만으로 inventory_item 생성 가능
        'shopify' => [],
        'woocommerce' => [],
        'cafe24'  => [],
        'qoo10'   => [['key' => 'category_code', 'label' => 'Qoo10 카테고리', 'hint' => '카테고리 매핑에서 Qoo10 카테고리를 지정하세요']],
        'godomall' => [['key' => 'category_code', 'label' => '고도몰 카테고리', 'hint' => '카테고리 매핑에서 고도몰 카테고리를 지정하세요']],
        'yahoo_jp' => [['key' => 'category_code', 'label' => 'Yahoo! JAPAN 카테고리', 'hint' => '카테고리 매핑에서 Yahoo 카테고리를 지정하세요']],
        'walmart'  => [['key' => 'category_code', 'label' => 'Walmart 카테고리', 'hint' => '카테고리 매핑에서 Walmart 카테고리를 지정하세요']],
        'rakuten'  => [],
        'tiktok'   => [['key' => 'category_id', 'label' => 'TikTok Shop 카테고리 ID', 'hint' => '카테고리 매핑에서 TikTok category_id 를 지정하세요']],
        'tiktok_shop' => [['key' => 'category_id', 'label' => 'TikTok Shop 카테고리 ID', 'hint' => '카테고리 매핑에서 TikTok category_id 를 지정하세요']],
    ];

    /**
     * 전송 전 검사. 빠진 것을 **전부** 모아 돌려준다(하나씩 알려주지 않는다).
     *   신규 등록(register)에만 전체 계약을 적용한다. 수정(update)은 부분 payload 가 정상이며,
     *   판매중지(unregister)는 상품 식별자만 있으면 된다.
     * @return array{ok:bool, missing:array<int,string>, error:string}
     */
    public static function preflight(string $channel, array $p, string $op): array
    {
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') return ['ok' => true, 'missing' => [], 'error' => ''];
        // 이미 채널에 있는 상품의 수정이면 부분 갱신이 정상이다.
        $isRegister = ($op === 'register' || $op === 'publish' || $op === '');

        $ch = strtolower(trim($channel));
        if (!$isRegister) {
            // ★수정(update)에 공통 필수를 걸면 안 된다: 가격만 바꾸는 리프라이서 writeback 은 name 을 싣지 않는다.
            //   상품을 특정할 SKU 만 있으면 되고, 나머지는 채널의 기존 값이 유지된다(부분 갱신이 정상).
            $rules = [self::COMMON[1]];   // sku
            /* ★[283차 R2 P0-3] 단, **가격을 싣고 있는 수정**에는 price>0 을 강제한다.
               종전에 update 규칙이 SKU 하나만 검사했기 때문에, 0원 판매가가 이 게이트를 그대로 통과해
               채널에 도달했다(11번가 <sellPrc>0</sellPrc>·쿠팡 salePrice:0·ESM 은 어댑터 방어도 없다).
               채널의 기존 정상가는 복구 불가하므로, 전송 **전에** 막는 것이 유일한 방어선이다.
               ★가격 키가 아예 없는 부분 갱신(재고 전용 stock_sync 등)은 검사하지 않는다 — 거짓 차단 금지. */
            if (array_key_exists('price', $p) && $p['price'] !== null && $p['price'] !== '') {
                $rules[] = self::COMMON[2];   // price(positive)
            }
        } else {
            $rules = array_merge(self::COMMON, self::REQUIRED[$ch] ?? []);
        }

        $missing = [];
        foreach ($rules as $r) {
            if (!empty($r['image'])) {
                if (!ChannelSync::imageUrls($p, 1)) {
                    $missing[] = '대표 이미지 — 상품등록에서 이미지를 1장 이상 추가하세요';
                }
                continue;
            }
            $key = (string)$r['key'];
            $v = $p[$key] ?? null;
            $empty = ($v === null || $v === '' || (is_array($v) && !$v));
            if (!$empty && !empty($r['positive']) && (float)$v <= 0) $empty = true;
            if (!$empty && !empty($r['numeric']) && (int)preg_replace('/\D/', '', (string)$v) <= 0) $empty = true;
            if ($empty) $missing[] = $r['label'] . ' — ' . $r['hint'];
        }

        if (!$missing) return ['ok' => true, 'missing' => [], 'error' => ''];
        $n = count($missing);
        $err = "채널 등록에 필요한 항목 {$n}개가 비어 있습니다: " . implode(' / ', $missing);
        return ['ok' => false, 'missing' => $missing, 'error' => $err];
    }
}
