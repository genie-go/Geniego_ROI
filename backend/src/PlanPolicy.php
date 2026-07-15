<?php
declare(strict_types=1);

namespace Genie;

/**
 * 203차 ⓒ — 서버측 플랜(구독 등급) 정책 정본(프론트 planMenuPolicy.js 미러).
 *
 * 심층방어(defense-in-depth): 프론트 메뉴 게이팅(hasMenuAccess/MenuAccessGuard)을 우회한
 * 직접 API 호출에 대해, 상용 기능 핸들러가 본 정책으로 테넌트 구독 등급을 서버에서 강제할 수 있다.
 * 데이터 보안은 이미 테넌트 격리 + RBAC(api_key role) 로 보장되며, 본 정책은 "구매하지 않은 기능
 * 사용 차단"(상용/패키징) 목적. fail-open(해석 불가 시 허용) 으로 레거시 api_key 통합 무중단.
 *
 * 프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(변경 시 양쪽 동시 갱신).
 */
final class PlanPolicy
{
    /** 플랜 등급(tier) 숫자 — 프론트 PLAN_TIER_RANK 정합. */
    public const RANK = [
        'free' => 0, 'demo' => 0, 'starter' => 1, 'growth' => 2,
        'pro' => 3, 'enterprise' => 4, 'admin' => 5,
    ];

    /** 상용 기능키 → 최소 요구 플랜 (프론트 planMenuPolicy.js MENU_MIN_PLAN 정합).
     *  [286차] 프론트 드리프트 수정 — report_builder/pnl_analytics/ai_insights 는 프론트에서 growth 이나
     *  종전 여기선 starter 였다(서버 저티어 통과=수익누수). marketing_advanced 키는 아예 부재였다. growth 로 정합. */
    public const FEATURE_MIN_PLAN = [
        'marketing'          => 'starter',  // 기본 광고/캠페인/CRM/이메일/카카오/여정/자동마케팅
        'auto_campaign'      => 'starter',
        'marketing_advanced' => 'growth',   // [286차] 어트리뷰션/MMM/채널KPI/예산플래너/AutoRecommend(고급 마케팅 분석)
        'report_builder'     => 'growth',    // [286차] starter→growth(프론트 정합)
        'pnl_analytics'      => 'growth',     // [286차] starter→growth
        'ai_insights'        => 'growth',      // [286차] starter→growth
        'ops'                => 'pro',       // WMS/가격최적화/공급망/반품
        'data_product'       => 'pro',
        'ai_rule_engine'     => 'pro',
        'data_schema'        => 'pro',
        'developer_hub'      => 'enterprise',
    ];

    public static function rank(string $plan): int
    {
        return self::RANK[strtolower(trim($plan))] ?? 0;
    }

    /** 미정의 기능은 fail-secure 기본(pro). */
    public static function minPlanFor(string $featureKey): string
    {
        return self::FEATURE_MIN_PLAN[$featureKey] ?? 'pro';
    }

    /** 테넌트 plan 이 feature 최소 등급 이상인지. */
    public static function allows(string $tenantPlan, string $featureKey): bool
    {
        return self::rank($tenantPlan) >= self::rank(self::minPlanFor($featureKey));
    }
}
