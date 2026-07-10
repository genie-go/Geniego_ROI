<?php

declare(strict_types=1);

namespace Genie\Handlers;

/**
 * [현 차수] 채널 이미지 능력(capability) 레지스트리 + 해석기.
 *
 * ── 왜 이 클래스가 필요한가 ────────────────────────────────────────────────
 * 277차까지 이미지를 실제로 전송하는 어댑터는 naver·shopify 둘뿐이었다. 나머지 17개는 이미지를 아예
 * 보내지 않았고, 그 사실이 어디에도 드러나지 않아 "동기화했는데 이미지가 없다"로 나타났다.
 * 근본원인은 어댑터마다 이미지 처리를 각자 (안) 하고 있었다는 것 — 새 채널을 붙일 때마다 같은 누락이 반복된다.
 *
 * 그래서 "이 채널이 이미지를 **어떤 형태로** 받는가"를 어댑터 밖에서 **선언**한다.
 *   MODE_URL   — 공개 URL 을 그대로 받는다(채널이 가져가 자기 CDN 에 복사). 가장 흔하다.
 *   MODE_BLOB  — URL 이 아니라 파일 본문(base64/multipart)을 요구한다.
 *   MODE_ID    — 채널 미디어 서버에 먼저 업로드해 받은 식별자(image_id)를 상품 API 에 넣는다.
 *   MODE_SPEC_REQUIRED — 이미지 규격을 아직 확정하지 못했다. **추측해서 보내지 않는다**(추측 = 400 의 원인).
 *                        등록은 진행하되 "이미지가 빠졌고 왜 빠졌는지"를 결과에 실어 보낸다.
 *
 * ── 새 채널을 추가할 때 ────────────────────────────────────────────────────
 *   ① CAPS 에 한 줄 선언한다. 선언이 없으면 MODE_SPEC_REQUIRED 로 취급되어 **조용한 누락 대신 경고**가 뜬다.
 *   ② 어댑터는 필요한 형태만 요청한다: urls() / blobs() / ids().
 *   이 두 가지가 규율이다. 어댑터 안에서 이미지 규칙을 새로 만들지 않는다.
 *
 * ★날조 금지 원칙: 확인되지 않은 채널의 필드명을 지어내느니 이미지를 빼고 사유를 노출한다.
 *   MODE_SPEC_REQUIRED 는 "미구현"이 아니라 "확인 전에는 보내지 않는다"는 **의도된 안전 상태**다.
 */
final class ChannelImage
{
    public const MODE_URL  = 'url';
    public const MODE_BLOB = 'blob';
    public const MODE_ID   = 'id';
    public const MODE_SPEC_REQUIRED = 'spec_required';

    /**
     * 채널별 이미지 능력. `max` = 채널이 허용하는 장수 상한.
     * `reason` 은 MODE_SPEC_REQUIRED 일 때 사용자에게 보여줄 사유(무엇을 확인해야 하는지).
     */
    private const CAPS = [
        // ── 공개 URL 직접 수용 (채널이 URL 을 가져가 자기 CDN 에 복사) ──
        //   `live` = 실 자격증명으로 등록까지 검증된 채널. false 는 코드 완성·문서 기준(첫 등록 시 스모크 필요).
        'naver'            => ['mode' => self::MODE_ID,  'max' => 10, 'live' => true],  // product-images/upload → URL
        'naver_smartstore' => ['mode' => self::MODE_ID,  'max' => 10, 'live' => true],
        'coupang'          => ['mode' => self::MODE_URL, 'max' => 10, 'live' => false], // items[].images[].vendorPath
        'cafe24'           => ['mode' => self::MODE_URL, 'max' => 10, 'live' => false], // detail/list/tiny/small_image + additional_image[]
        'woocommerce'      => ['mode' => self::MODE_URL, 'max' => 10, 'live' => false], // images[].src
        'ebay'             => ['mode' => self::MODE_URL, 'max' => 12, 'live' => false], // product.imageUrls[]
        '11st'             => ['mode' => self::MODE_URL, 'max' => 10, 'live' => false], // prdImage01..10
        'st11'             => ['mode' => self::MODE_URL, 'max' => 10, 'live' => false],
        'qoo10'            => ['mode' => self::MODE_URL, 'max' => 1,  'live' => false], // StandardImage(단일)
        'godomall'         => ['mode' => self::MODE_URL, 'max' => 1,  'live' => false], // goodsImg(단일)
        'amazon'           => ['mode' => self::MODE_URL, 'max' => 9,  'live' => false], // main/other_product_image_locator
        'amazon_spapi'     => ['mode' => self::MODE_URL, 'max' => 9,  'live' => false],
        // Lazada 는 외부 URL 을 거부한다 → 어댑터가 /image/migrate 로 Lazada CDN 에 복사한 뒤 그 URL 을 쓴다.
        'lazada'           => ['mode' => self::MODE_URL, 'max' => 8,  'live' => false],

        // ── 파일 본문(base64/multipart) 요구 ──
        'shopify'          => ['mode' => self::MODE_BLOB, 'max' => 250, 'live' => false], // attachment(base64)·src(URL) 모두 가능
        'magento'          => ['mode' => self::MODE_BLOB, 'max' => 8,   'live' => false], // media_gallery_entries[].content

        // ── 채널 미디어 서버 선업로드 → id ──
        'shopee'           => ['mode' => self::MODE_ID, 'max' => 9,  'live' => false],    // media_space/upload_image → image_id
        'etsy'             => ['mode' => self::MODE_ID, 'max' => 10, 'live' => false],    // 등록 후 uploadListingImage(listing_id, rank)

        // ── 규격 미확정: 확인 전까지 전송하지 않는다(추측해 보내면 채널이 등록을 거부한다) ──
        //   자격증명을 등록하면 첫 등록에서 이 경고가 뜬다 → 그때 해당 채널 문서로 CAPS 를 채우고 어댑터에 emit 한다.
        'tiktok'       => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'TikTok Shop 이미지 업로드(img_id) 규격 확인 필요'],
        'tiktok_shop'  => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'TikTok Shop 이미지 업로드(img_id) 규격 확인 필요'],
        'walmart'      => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'Walmart 상품 피드(MP_ITEM) 이미지 규격 확인 필요'],
        'rakuten'      => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'Rakuten 캐비닛(이미지 서버) 업로드 규격 확인 필요'],
        'yahoo_jp'     => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'Yahoo! JAPAN 이미지 업로드 규격 확인 필요'],
        'gmarket'      => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'ESM(G마켓) 이미지 서버 업로드 규격 확인 필요'],
        'auction'      => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => 'ESM(옥션) 이미지 서버 업로드 규격 확인 필요'],
        'lotteon'      => ['mode' => self::MODE_SPEC_REQUIRED, 'reason' => '롯데온 이미지 업로드 규격 확인 필요'],
    ];

    /** 선언되지 않은 신규 채널은 "확인 필요"로 떨어진다 — 조용한 누락보다 시끄러운 경고가 낫다. */
    public static function cap(string $channel): array
    {
        $ch = strtolower(trim($channel));
        return self::CAPS[$ch] ?? [
            'mode' => self::MODE_SPEC_REQUIRED,
            'reason' => "채널 '{$ch}' 의 이미지 규격이 선언되지 않았습니다 — ChannelImage::CAPS 에 추가하세요",
        ];
    }

    public static function mode(string $channel): string
    {
        return (string)self::cap($channel)['mode'];
    }

    /** 채널 상한을 적용한 공개 URL 목록. MODE_URL 어댑터가 그대로 payload 에 넣는다. */
    public static function urls(string $channel, array $product): array
    {
        $cap = self::cap($channel);
        return ChannelSync::imageUrls($product, (int)($cap['max'] ?? 10));
    }

    /**
     * 파일 본문 목록(MODE_BLOB). 각 원소 = ['bin'=>..., 'mime'=>..., 'ext'=>...].
     * 읽지 못한 장은 조용히 건너뛴다(부분 성공 우선 — 이미지 하나 때문에 등록 전체를 실패시키지 않는다).
     */
    public static function blobs(string $channel, array $product): array
    {
        $out = [];
        foreach (self::urls($channel, $product) as $u) {
            $b = ChannelSync::imageBytes($u);
            if ($b !== null) $out[] = $b;
        }
        return $out;
    }

    /**
     * MODE_SPEC_REQUIRED 채널에서 결과에 붙일 경고. 보낼 이미지가 없으면 경고할 것도 없으므로 null.
     * 등록 자체는 막지 않는다 — 이미지 없는 등록이 등록 실패보다 낫다. 다만 **반드시 보인다**.
     */
    public static function warning(string $channel, array $product): ?string
    {
        $cap = self::cap($channel);
        if (($cap['mode'] ?? '') !== self::MODE_SPEC_REQUIRED) return null;
        if (!ChannelSync::imageUrls($product, 1)) return null;
        $why = (string)($cap['reason'] ?? '이미지 규격 미확정');
        return "이미지를 채널에 첨부하지 않았습니다 — {$why}. (잘못된 형식을 추측해 보내면 채널이 상품 등록을 거부합니다.)";
    }
}
