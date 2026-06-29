<?php
declare(strict_types=1);

namespace Genie;

use PDO;

/**
 * 212차 #3: 플랜 한도 중앙 강제 (plan_config.limits_json 기준).
 *
 * 8차원: channels / orders_monthly / products / users / suppliers / logistics / warehouses / image_hosting_gb.
 *   -1 = 무제한. admin 이 PlanPricing(plan_config) 에서 설정한 값을 존중(유료플랜 포함).
 *   plan_config 부재 시 폴백: 유료(starter+)/admin 무제한, free 기본값.
 *
 * 사용: 자원 생성 직전 `PlanLimits::exceeded($pdo,$plan,'warehouses',$current)` 가
 *   배열을 반환하면 402 로 응답(업그레이드 유도 메시지 포함), null 이면 통과.
 */
final class PlanLimits
{
    private const DEFAULTS = [
        'channels' => 3, 'orders_monthly' => 500, 'products' => 100, 'users' => 1,
        'suppliers' => 3, 'logistics' => 1, 'warehouses' => 1, 'image_hosting_gb' => 1,
    ];

    private const DIM_LABELS = [
        'channels' => '판매·마케팅 채널', 'orders_monthly' => '월 주문 수', 'products' => '상품 DB',
        'users' => '사용자(계정) 수', 'suppliers' => '매입처', 'logistics' => '물류처',
        'warehouses' => '창고', 'image_hosting_gb' => '이미지 호스팅(GB)',
    ];

    /** 테넌트 소유자(최상위 계정)의 구독 플랜. /v4xx(api_key) 등 plan 미상 요청의 한도 판정용. */
    public static function tenantPlan(PDO $pdo, string $tenant): string
    {
        if ($tenant === '' || $tenant === 'unknown') return 'free';
        try {
            // 소유자(parent_user_id NULL) 우선, 없으면 최초 계정
            $st = $pdo->prepare("SELECT COALESCE(plans,plan,'free') FROM app_user WHERE tenant_id=? ORDER BY (parent_user_id IS NULL) DESC, id ASC LIMIT 1");
            $st->execute([$tenant]);
            $p = $st->fetchColumn();
            return $p ? strtolower((string)$p) : 'free';
        } catch (\Throwable $e) { return 'free'; }
    }

    /** 차원별 한도. -1=무제한. */
    public static function limitFor(PDO $pdo, string $plan, string $dimension): int
    {
        $plan = strtolower(trim($plan)) ?: 'free';
        // plan_config 우선 — admin 설정값 존중(유료플랜 capped 차원 포함)
        try {
            $st = $pdo->prepare('SELECT limits_json FROM plan_config WHERE plan_id=? LIMIT 1');
            $st->execute([$plan]);
            $lj = $st->fetchColumn();
            if ($lj) {
                $lim = json_decode((string)$lj, true);
                if (is_array($lim) && isset($lim[$dimension]) && is_numeric($lim[$dimension])) {
                    return (int)$lim[$dimension];
                }
            }
        } catch (\Throwable $e) { /* plan_config 부재 → 폴백 */ }
        if (in_array($plan, ['starter', 'growth', 'pro', 'enterprise', 'admin'], true)) return -1;
        return self::DEFAULTS[$dimension] ?? -1;
    }

    /**
     * 한도 초과 검사. 초과면 402 payload 배열, 통과면 null.
     * @param int $currentCount 현재 보유 수(신규 1건 추가 직전).
     */
    public static function exceeded(PDO $pdo, string $plan, string $dimension, int $currentCount): ?array
    {
        $limit = self::limitFor($pdo, $plan, $dimension);
        if ($limit < 0) return null; // 무제한
        if ($currentCount >= $limit) {
            $label = self::DIM_LABELS[$dimension] ?? $dimension;
            return [
                'ok'        => false,
                'error'     => 'plan_limit_reached',
                'dimension' => $dimension,
                'limit'     => $limit,
                'current'   => $currentCount,
                'message'   => "현재 플랜의 {$label} 한도({$limit}개)에 도달했습니다. 더 추가하려면 플랜을 업그레이드하세요.",
            ];
        }
        return null;
    }

    // ─────────────────────────────────────────── [251차] 상품등록 추가팩(종량) ───────────
    //   기본 제공 수(plan_config.limits.products = admin 설정·★불변)에 구매한 추가팩을 합산해 유효 한도 산출.
    //   초과 시 Catalog 등록을 402 로 차단하고 추가팩 구매(즉시 결제)·또는 거부 선택지를 프론트에 전달.

    /** 테넌트 보유 상품 수 — catalog_listing 의 DISTINCT sku(채널 중복 제외 = 실제 등록 상품 수). */
    public static function productCount(PDO $pdo, string $tenant): int
    {
        if ($tenant === '' || $tenant === 'unknown') return 0;
        try {
            $st = $pdo->prepare("SELECT COUNT(DISTINCT sku) FROM catalog_listing WHERE tenant_id=? AND sku IS NOT NULL AND sku<>''");
            $st->execute([$tenant]);
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    /** 구매한 추가팩 합산 추가 허용 수(status='active'). 테이블 부재 시 0(회귀 없음). */
    public static function productAddonExtra(PDO $pdo, string $tenant): int
    {
        if ($tenant === '' || $tenant === 'unknown') return 0;
        try {
            $st = $pdo->prepare("SELECT COALESCE(SUM(extra_count),0) FROM tenant_product_addon WHERE tenant_id=? AND status='active'");
            $st->execute([$tenant]);
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    /** 유효 상품 한도 = 기본(admin설정·불변) + 추가팩. 기본 -1(무제한)이면 -1 유지. */
    public static function effectiveProductsLimit(PDO $pdo, string $tenant, ?string $plan = null): int
    {
        $plan = $plan ?: self::tenantPlan($pdo, $tenant);
        $base = self::limitFor($pdo, $plan, 'products');
        if ($base < 0) return -1;
        return $base + self::productAddonExtra($pdo, $tenant);
    }

    /** [251차] 상품 1건당 이미지 호스팅 환산(MB) — 대표·상세·썸네일 평균(웹최적화 후). 이미지 용량 ↔ 상품수 연동 기준. */
    public const MB_PER_PRODUCT = 5;

    /** 상품수 → 권장 이미지 호스팅(GB, 올림). 0건/음수 안전. */
    public static function imageGbForProducts(int $products): int
    {
        if ($products <= 0) return 0;
        return (int)ceil($products * self::MB_PER_PRODUCT / 1024);
    }

    /**
     * 유효 이미지 호스팅 한도(GB) = 기본 제공 상품수 기준 용량(plan_config.image_hosting_gb 와 큰 값) + 추가팩 상품수 용량.
     *   ★기본 상품수(admin설정·불변)에 자동 정합 — 상품을 그만큼 등록하면 이미지도 그만큼 수용. 기본 -1(무제한)=−1.
     */
    public static function effectiveImageHostingGb(PDO $pdo, string $tenant, ?string $plan = null): int
    {
        $plan = $plan ?: self::tenantPlan($pdo, $tenant);
        $baseProducts = self::limitFor($pdo, $plan, 'products');
        if ($baseProducts < 0) return -1; // 무제한 상품 → 무제한 이미지
        // 기본 이미지GB = max(admin설정 image_hosting_gb, 기본 상품수 환산) — 부족하지 않게 정합(축소 없음).
        $cfgGb = self::limitFor($pdo, $plan, 'image_hosting_gb');
        $baseGb = max($cfgGb < 0 ? 0 : $cfgGb, self::imageGbForProducts($baseProducts));
        $addonGb = self::imageGbForProducts(self::productAddonExtra($pdo, $tenant));
        return $baseGb + $addonGb;
    }

    /** [251차] 테넌트 광고디자인(ad_design) 저장 수 — svg(이미지) 저장이라 상품과 동일 이미지 자원. */
    public static function adDesignCount(PDO $pdo, string $tenant): int
    {
        if ($tenant === '' || $tenant === 'unknown') return 0;
        try {
            $st = $pdo->prepare("SELECT COUNT(*) FROM ad_design WHERE tenant_id=?");
            $st->execute([$tenant]);
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    /**
     * 광고디자인 저장 직전 초과 검사 — 한도 = 유효 상품 한도(기본+추가팩)와 동일(상품·이미지·디자인 일원화).
     *   초과면 402 payload(추가팩 옵션·거부 가능), 통과면 null. 무제한 플랜은 null.
     */
    public static function adDesignOverage(PDO $pdo, string $tenant, int $currentCount): ?array
    {
        $eff = self::effectiveProductsLimit($pdo, $tenant); // 상품과 동일 풀(추가팩이 둘 다 확장)
        if ($eff < 0) return null;
        if ($currentCount < $eff) return null;
        $plan = self::tenantPlan($pdo, $tenant);
        return [
            'ok'        => false,
            'error'     => 'ad_design_limit_reached',
            'dimension' => 'ad_designs',
            'plan'      => $plan,
            'limit'     => $eff,
            'current'   => $currentCount,
            'packs'     => \Genie\Handlers\ProductAddon::packList($pdo),
            'message'   => "광고디자인 저장 한도({$eff}개)에 도달했습니다. 추가팩을 구매하면 상품·디자인 한도가 함께 늘어납니다.",
        ];
    }

    /**
     * 상품 등록 직전 초과 검사(신규 상품 1건 추가 기준). 초과면 402 payload(추가팩 옵션 포함), 통과면 null.
     * @param int $currentCount 현재 보유 상품 수
     */
    public static function productOverage(PDO $pdo, string $tenant, int $currentCount): ?array
    {
        $eff = self::effectiveProductsLimit($pdo, $tenant);
        if ($eff < 0) return null; // 무제한
        if ($currentCount < $eff) return null; // 여유 있음
        $plan = self::tenantPlan($pdo, $tenant);
        $base = self::limitFor($pdo, $plan, 'products');
        return [
            'ok'        => false,
            'error'     => 'product_limit_reached',
            'dimension' => 'products',
            'plan'      => $plan,
            'base'      => $base,
            'addon'     => self::productAddonExtra($pdo, $tenant),
            'limit'     => $eff,
            'current'   => $currentCount,
            'packs'     => \Genie\Handlers\ProductAddon::packList($pdo), // 구매 가능한 추가팩(SSOT)
            'message'   => "기본 제공 상품등록 수({$eff}건)를 모두 사용했습니다. 추가팩을 구매하면 즉시 계속 등록할 수 있습니다.",
        ];
    }
}
