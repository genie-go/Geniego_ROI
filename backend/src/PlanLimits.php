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
}
