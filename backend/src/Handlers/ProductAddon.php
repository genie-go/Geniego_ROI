<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\PlanLimits;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * [251차] 상품등록 추가팩(종량 과금) — 기본 제공 수(plan_config, admin설정·불변) 초과 시 추가팩 구매로 상한 확장.
 *
 *   배경: 상품등록 시 이미지가 함께 업로드되어 서버 스토리지/운영 부하 발생 → 무제한 등록은 적자 리스크.
 *   설계: 기본 제공 수는 그대로 두고, 초과분만 월 정기 추가팩으로 종량 과금(즉시 entitlement·계정수 무관).
 *
 *   추가팩 SSOT: product_addon_pack(pack_size, price_usd) — admin 편집 가능.
 *   구매 내역  : tenant_product_addon(tenant_id, pack_size, extra_count, price_usd, status) — status='active' 합산이 유효 추가분.
 *   유효 한도  : PlanLimits::effectiveProductsLimit = 기본 + Σ active extra. 초과 시 Catalog 등록 402 + 추가팩/거부 선택.
 *
 *   Endpoints(세션 self-auth):
 *     GET  /v424/plan/product-usage              — 사용량/한도/추가팩 옵션
 *     POST /v424/plan/product-addon/purchase     — {pack_size} 추가팩 구매(결제수단 필수·즉시 적용)
 *     POST /v424/plan/product-addon/cancel       — {id} 추가팩 해지(거부 권한)
 *     GET  /v424/admin/plan/product-addon-packs  — 추가팩 가격표(admin)
 *     PUT  /v424/admin/plan/product-addon-packs  — 추가팩 가격 수정(admin SSOT)
 */
final class ProductAddon
{
    /** 기본 추가팩 시드(사용자 확정: 월 정기 USD). admin 이 가격 수정 가능. */
    private const SEED_PACKS = [
        [50, 5.00], [100, 8.00], [200, 13.00], [300, 17.00], [500, 25.00], [1000, 40.00],
    ];

    public static function ensureTables(PDO $pdo): void
    {
        $drv = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $AI = ($drv === 'mysql') ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        // SSOT 가격표 — pack_size 가 PK(중복 방지). ★MySQL TEXT PK 거부 트랩 회피=INT PK.
        $pdo->exec("CREATE TABLE IF NOT EXISTS product_addon_pack (
            pack_size INTEGER PRIMARY KEY,
            price_usd REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            updated_at VARCHAR(32)
        )");
        // 테넌트 구매 내역(월 정기). status active 합산 = 유효 추가 허용 수.
        $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_product_addon (
            id $AI,
            tenant_id VARCHAR(64) NOT NULL,
            pack_size INTEGER DEFAULT 0,
            extra_count INTEGER DEFAULT 0,
            price_usd REAL DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            paddle_ref VARCHAR(128),
            created_by VARCHAR(120),
            created_at VARCHAR(32),
            canceled_at VARCHAR(32)
        )");
        try {
            $cnt = (int)$pdo->query("SELECT COUNT(*) FROM product_addon_pack")->fetchColumn();
            if ($cnt === 0) {
                $now = gmdate('c'); $i = 0;
                $ins = $pdo->prepare("INSERT INTO product_addon_pack(pack_size,price_usd,is_active,display_order,updated_at) VALUES(?,?,1,?,?)");
                foreach (self::SEED_PACKS as $p) { $ins->execute([(int)$p[0], (float)$p[1], $i++, $now]); }
            }
        } catch (\Throwable $e) { /* 시드 실패는 폴백 */ }
    }

    /** 활성 추가팩 목록(SSOT) — PlanLimits/프론트 공용. [{size,price}] 오름차순. */
    public static function packList(PDO $pdo): array
    {
        try {
            self::ensureTables($pdo);
            $rows = $pdo->query("SELECT pack_size, price_usd FROM product_addon_pack WHERE is_active=1 ORDER BY pack_size ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
            return array_map(fn($r) => ['size' => (int)$r['pack_size'], 'price_usd' => round((float)$r['price_usd'], 2)], $rows);
        } catch (\Throwable $e) { return []; }
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b['data'] ?? $b;
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t === null || $t === '' || strtolower((string)$t) === 'unknown') ? '' : (string)$t;
    }

    /** GET /v424/plan/product-usage — 사용량·유효한도·추가팩 옵션. */
    public static function usage(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $plan = PlanLimits::tenantPlan($pdo, $tenant);
        $base = PlanLimits::limitFor($pdo, $plan, 'products');
        $addon = PlanLimits::productAddonExtra($pdo, $tenant);
        $used = PlanLimits::productCount($pdo, $tenant);
        $eff = $base < 0 ? -1 : ($base + $addon);
        // [251차] 이미지 호스팅 — 기본 상품수에 연동(상품당 5MB) + 추가팩 상품수 용량.
        $imgGb = PlanLimits::effectiveImageHostingGb($pdo, $tenant, $plan);
        return self::json($res, [
            'ok' => true, 'plan' => $plan, 'used' => $used,
            'base' => $base, 'addon' => $addon, 'effective_limit' => $eff,
            'remaining' => $eff < 0 ? -1 : max(0, $eff - $used),
            'unlimited' => $eff < 0,
            'exceeded' => $eff >= 0 && $used >= $eff,
            'image_hosting' => [
                'mb_per_product' => PlanLimits::MB_PER_PRODUCT,
                'effective_gb' => $imgGb,           // -1 = 무제한
                'est_used_gb' => round($used * PlanLimits::MB_PER_PRODUCT / 1024, 2),
            ],
            'packs' => self::packList($pdo),
            'addons' => self::tenantAddons($pdo, $tenant),
        ]);
    }

    private static function tenantAddons(PDO $pdo, string $tenant): array
    {
        try {
            $st = $pdo->prepare("SELECT id, pack_size, extra_count, price_usd, status, created_at FROM tenant_product_addon WHERE tenant_id=? AND status='active' ORDER BY id DESC");
            $st->execute([$tenant]);
            return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return []; }
    }

    /** POST /v424/plan/product-addon/purchase — {pack_size} 추가팩 구매. 결제수단 필수·즉시 적용(entitlement). */
    public static function purchase(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $size = (int)($b['pack_size'] ?? 0);
        // SSOT 가격표에서 유효 팩만 허용(임의 수량·가격 위조 차단).
        $pack = null;
        foreach (self::packList($pdo) as $p) { if ($p['size'] === $size) { $pack = $p; break; } }
        if (!$pack) return self::json($res, ['ok' => false, 'error' => 'invalid_pack', 'message' => '유효하지 않은 추가팩입니다.'], 422);
        // ★결제수단(카드) 필수 — 종량 과금 수금 가능성 보장. 데모는 카드 게이트 면제(시뮬레이션).
        $isReal = ($tenant !== 'demo' && strncmp($tenant, 'demo', 4) !== 0);
        if ($isReal) {
            try {
                if (!\Genie\Handlers\BillingMethod::hasActiveMethod($pdo, $tenant)) {
                    return self::json($res, ['ok' => false, 'error' => 'billing_required',
                        'message' => '추가팩 결제를 위해 결제수단(카드)을 먼저 등록하세요. [재무·정산 > 결제수단]'], 402);
                }
            } catch (\Throwable $e) { /* BillingMethod 부재 시 게이트 생략(가용성 우선) */ }
        }
        $now = gmdate('c');
        $actor = '';
        try { $u = UserAuth::authedUser($req); $actor = (string)($u['email'] ?? ''); } catch (\Throwable $e) {}
        $pdo->prepare("INSERT INTO tenant_product_addon(tenant_id,pack_size,extra_count,price_usd,status,created_by,created_at) VALUES(?,?,?,?, 'active', ?, ?)")
            ->execute([$tenant, $size, $size, $pack['price_usd'], $actor, $now]);
        $id = (int)$pdo->lastInsertId();
        try { Db::audit($pdo, $tenant, 'product_addon.purchase', ['id' => $id, 'pack_size' => $size, 'price_usd' => $pack['price_usd'], 'by' => $actor]); } catch (\Throwable $e) {}
        $eff = PlanLimits::effectiveProductsLimit($pdo, $tenant);
        // [286차] ★거짓 청구 표기 정직화 — 종전 "월 $X 청구"는 실제 결제사 청구를 만들지 않아(paddle_ref NULL) 거짓이었다(매출누수).
        //   권한(등록 한도 확대)은 즉시 부여하되, 청구는 '예정/결제 연동 후 반영'으로 정직 표기(실제 반복청구 배선 시 갱신).
        return self::json($res, [
            'ok' => true, 'id' => $id, 'pack_size' => $size, 'price_usd' => $pack['price_usd'],
            'billing_status' => 'pending',
            'effective_limit' => $eff, 'used' => PlanLimits::productCount($pdo, $tenant),
            'message' => "+{$size}건 추가팩이 적용되었습니다(예정 청구액 월 \${$pack['price_usd']} — 실제 청구는 결제 연동 후 반영). 바로 계속 등록할 수 있습니다.",
        ]);
    }

    /** POST /v424/plan/product-addon/cancel — {id} 추가팩 해지(구독회원 거부/해지 권한). */
    public static function cancel(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $id = (int)($b['id'] ?? 0);
        if ($id <= 0) return self::json($res, ['ok' => false, 'error' => 'id required'], 422);
        // 본인 테넌트 소유 + active 만 해지(교차 테넌트 차단).
        $st = $pdo->prepare("UPDATE tenant_product_addon SET status='canceled', canceled_at=? WHERE id=? AND tenant_id=? AND status='active'");
        $st->execute([gmdate('c'), $id, $tenant]);
        $affected = $st->rowCount();
        if ($affected === 0) return self::json($res, ['ok' => false, 'error' => 'not_found', 'message' => '해당 추가팩을 찾을 수 없습니다.'], 404);
        try { Db::audit($pdo, $tenant, 'product_addon.cancel', ['id' => $id]); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'id' => $id, 'effective_limit' => PlanLimits::effectiveProductsLimit($pdo, $tenant),
            'message' => '추가팩이 해지되었습니다(다음 결제부터 미청구). 한도 초과 상태면 신규 등록은 제한됩니다.']);
    }

    // ─────────────────────────────────────────── admin SSOT 가격 편집 ───────────────

    private static function adminGate(Request $req, Response $res): ?Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        return $gate;
    }

    /** GET /v424/admin/plan/product-addon-packs — 추가팩 가격표(admin). */
    public static function adminPacks(Request $req, Response $res): Response
    {
        $g = self::adminGate($req, $res); if ($g !== null) return $g;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $rows = $pdo->query("SELECT pack_size, price_usd, is_active, display_order FROM product_addon_pack ORDER BY pack_size ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return self::json($res, ['ok' => true, 'packs' => $rows]);
    }

    /** PUT /v424/admin/plan/product-addon-packs — {packs:[{pack_size,price_usd,is_active?}]} 가격 수정(SSOT). */
    public static function adminPacksSave(Request $req, Response $res): Response
    {
        $g = self::adminGate($req, $res); if ($g !== null) return $g;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $items = (array)($b['packs'] ?? []);
        if (empty($items)) return self::json($res, ['ok' => false, 'error' => 'packs[] required'], 422);
        $drv = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $now = gmdate('c'); $n = 0;
        foreach ($items as $it) {
            $size = (int)($it['pack_size'] ?? 0);
            if ($size <= 0) continue;
            $price = max(0.0, (float)($it['price_usd'] ?? 0));
            $active = isset($it['is_active']) ? (!empty($it['is_active']) ? 1 : 0) : 1;
            if ($drv === 'mysql') {
                $pdo->prepare("INSERT INTO product_addon_pack(pack_size,price_usd,is_active,display_order,updated_at) VALUES(?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE price_usd=VALUES(price_usd),is_active=VALUES(is_active),updated_at=VALUES(updated_at)")
                    ->execute([$size, $price, $active, $size, $now]);
            } else {
                $pdo->prepare("INSERT INTO product_addon_pack(pack_size,price_usd,is_active,display_order,updated_at) VALUES(?,?,?,?,?)
                    ON CONFLICT(pack_size) DO UPDATE SET price_usd=excluded.price_usd,is_active=excluded.is_active,updated_at=excluded.updated_at")
                    ->execute([$size, $price, $active, $size, $now]);
            }
            $n++;
        }
        try { Db::audit($pdo, 'platform', 'product_addon.pricing_update', ['updated' => $n]); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'updated' => $n, 'packs' => self::packList($pdo)]);
    }
}
