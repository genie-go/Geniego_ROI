<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * OrderHub Aggregator v3 (165차, U-165-A 격리 + U-165-C L2 schema migration).
 *
 * spec: docs/spec/backend_orderhub_aggregator_165_v3.md
 * - middleware auth_tenant 신뢰 (handler fallback 제거)
 * - 환경 ↔ tenant 종류 cross-check (gate/guardEnv)
 * - Db::pdoFor(isDemo) 로 환경 분리 DB 사용
 * - schema 생성은 backend/migrations/ + Migrate runner 가 담당 (ensureSchema 제거)
 */
final class OrderHub
{
    /**
     * middleware 가 검증한 tenant 만 신뢰. fallback 없음.
     * 호출 전제: public/index.php 의 API-key middleware 가 auth_tenant 속성을 설정.
     */
    private static function tenantContext(Request $req): ?array
    {
        $tenant = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($tenant === '') return null;
        return [
            'tenant' => $tenant,
            'isDemo' => self::isDemoTenant($tenant),
        ];
    }

    /**
     * demo tenant 식별 규칙. 추후 api_key 테이블에 is_demo 컬럼 추가 후 DB 조회 방식으로 교체 권장.
     */
    private static function isDemoTenant(string $tenant): bool
    {
        return $tenant === 'demo' || str_starts_with($tenant, 'demo_');
    }

    /**
     * 환경 ↔ tenant 종류 cross-check. 누수/오라우팅 차단.
     */
    private static function guardEnv(bool $isDemo): ?array
    {
        $env = Db::env();
        if ($env === 'production' && $isDemo) {
            return ['ok' => false, 'error' => 'demo_blocked_in_production'];
        }
        if ($env === 'demo' && !$isDemo) {
            return ['ok' => false, 'error' => 'production_blocked_in_demo'];
        }
        return null;
    }

    private static function pdo(bool $isDemo): \PDO
    {
        return Db::pdoFor($isDemo);
    }

    private static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)
                    ->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    private static function clampLimit(Request $req): array
    {
        $q = $req->getQueryParams();
        $limit = max(1, min(1000, (int)($q['limit'] ?? 200)));
        $offset = max(0, (int)($q['offset'] ?? 0));
        return [$limit, $offset];
    }

    /**
     * [현 차수] 취소/반품 캐논 SSOT(public) — Rollup·ChannelSync·프론트 CANCELLED_STATUSES 가 참조.
     * 매출/주문수 집계는 취소주문을 제외해야 정본(ordersStats·Rollup·대시보드)과 정합한다.
     * 반품(RETURN_TOKENS)은 매출 포함(반품률·returnFee로만 반영) → 취소 제외 대상 아님.
     * ★219 감사 하드닝: RETURN_TOKENS 가 OrderHub/Rollup 에 따로 정의돼 드리프트(반품Done/반품입고/return/
     *   반품요청 일부 누락)했던 것을 본 const 로 통합(union). 한 곳만 수정하면 전 집계가 정합.
     */
    public const CANCEL_TOKENS = ['CancelDone','Cancel요청','cancelled','canceled','취소완료','취소요청','취소접수','취소','주문취소'];
    public const RETURN_TOKENS = ['returned','refunded','return','반품완료','반품요청','반품접수','반품','환불완료','반품Done','반품입고'];
    // [커머스 보강] 교환(EXCHANGE) 캐논 — 취소(매출제외)·반품(매출포함+returnFee)과 구분된 매출중립 스왑 라이프사이클.
    //   교환은 cancel/return 어느 토큰에도 들지 않아 매출 SSOT 에 안전(자연 중립). 재발송 상태머신은 freeform status.
    public const EXCHANGE_TOKENS = ['exchange','exchanged','swap','교환','교환요청','교환접수','교환완료','교환Done','교환재발송','맞교환'];

    /** [커머스 보강] 채널 네이티브 상태문자열 → 캐논 클레임 유형(cancel|return|exchange|null). 오픈마켓 상태머신 정규화 SSOT.
     *   exchange 를 return 보다 먼저 판정(일부 채널이 '교환반품' 혼용 표기 — 교환 우선). 매칭 없으면 null. */
    public static function claimType(?string $status): ?string
    {
        $s = trim((string)$status);
        if ($s === '') return null;
        $sl = mb_strtolower($s);
        $hit = function (array $toks) use ($s, $sl): bool {
            foreach ($toks as $t) { if ($s === $t || mb_strpos($sl, mb_strtolower($t)) !== false) return true; }
            return false;
        };
        if ($hit(self::EXCHANGE_TOKENS)) return 'exchange';   // 교환 우선(교환반품 혼용 방어)
        if ($hit(self::CANCEL_TOKENS))   return 'cancel';
        if ($hit(self::RETURN_TOKENS))   return 'return';
        return null;
    }

    /** 취소주문 제외용 SQL 단편 + 바인드 파라미터(NULL-safe). @return array{0:string,1:array}
     *  [현 차수] public — Reports(BI 커머스 소스)가 동일 취소 SSOT 재사용(드리프트 제거).
     *  @param string $alias channel_orders 가 별칭으로 조인된 쿼리용 접두(예 'co'). 미지정 시 기존과 동일. */
    public static function cancelExclusion(string $alias = ''): array
    {
        $p  = $alias === '' ? '' : $alias . '.';
        $ph = implode(',', array_fill(0, count(self::CANCEL_TOKENS), '?'));
        $sql = "(COALESCE({$p}event_type,'order') = 'cancel' OR COALESCE({$p}status,'') IN ($ph))";
        return [$sql, self::CANCEL_TOKENS];
    }

    /** 광고성과 대조·탄력성·수요예측 등 '관측' 쿼리용 제외절 — 취소(2축: event_type+status) + 반품(event_type).
     *  머니경로(Pnl/ordersStats)는 반품을 매출에 포함(returnFee 로 반영)하므로 이 헬퍼를 쓰지 않는다.
     *  [현 차수] 인라인 `event_type NOT IN ('cancel','return')` 드리프트 제거(status 토큰 취소 누락 해소). */
    public static function observedExclusion(string $alias = ''): array
    {
        $p = $alias === '' ? '' : $alias . '.';
        [$cancelSql, $tokens] = self::cancelExclusion($alias);
        return ["($cancelSql OR COALESCE({$p}event_type,'order') = 'return')", $tokens];
    }

    /**
     * [현 차수] 파라미터 없는 인라인 취소/반품 제외절 — named/positional 파라미터 방식과 무관하게 어느 쿼리에도 삽입 가능.
     *   CANCEL/RETURN_TOKENS 는 사용자 입력이 아닌 **고정 클래스 상수(단일따옴표 미포함)** 라 인라인 리터럴이 주입 안전하다.
     *   반환값은 "행이 취소(2축) 또는 반품임" 을 뜻하는 참식 → 제외하려면 호출측에서 `AND NOT (...)` 로 감싼다.
     *   named 파라미터(:t) 쿼리에서 positional(?) 토큰과의 혼용 불가 문제를 우회하기 위한 SSOT 정합 변형.
     */
    public static function observedExclusionInline(string $alias = ''): string
    {
        $p = $alias === '' ? '' : $alias . '.';
        $lit = static function (array $toks): string {
            return implode(',', array_map(static fn($x) => "'" . $x . "'", $toks));
        };
        $cancel = "(COALESCE({$p}event_type,'order') = 'cancel' OR COALESCE({$p}status,'') IN (" . $lit(self::CANCEL_TOKENS) . "))";
        return "($cancel OR COALESCE({$p}event_type,'order') = 'return')";
    }

    /**
     * [P&L SSOT] 서버측 COGS 집계 — ordersStats·Pnl 공용 단일소스(중복 divergence 방지).
     *   원가 소싱 우선순위(주문 단위):
     *     ① FEFO lot-layer 실원가 — wms_lot_consumptions(ref='CHS-{channel}-{channel_order_id}',
     *        Wms::consumeLotsFefo 가 출고 시 적재)에 소비원장이 있으면 그 lot 원가 합계를 사용.
     *     ② WAC 폴백 — 소비원장이 없으면 기존 channel_inventory WAC(Σ(cost×available)/Σavailable,
     *        cost>0 행만; 재고0이면 비영 cost 평균)를 사용.
     *   즉 per-order COALESCE(FEFO cost_total, WAC(qty×cost)). 원가 미등록분은 uncosted units 로
     *   정직 노출(WAC 기준 유지 — FEFO 유무와 무관하게 costed/uncosted 정의 불변).
     *   ★무회귀 보장: wms_lot_consumptions 가 비어있으면(현 상태 — 라이브 FEFO 데이터 이전) FEFO LEFT JOIN
     *     이 매칭 0행 → fc.fefo_cost 전부 NULL → COALESCE 가 항상 WAC 를 택해 출력이 기존 WAC 와 byte-identical.
     *     FEFO 조인 자체가 실패(예: 원장 테이블 부재)하면 원본 WAC 쿼리로 폴백(동일 결과).
     *   호출측이 이미 만든 baseSql/baseArgs/cancelExpr/cancelTokens 를 그대로 받아 SQL 을 완전 동일하게 유지.
     *   @return array{0:?float,1:?int,2:?int} [cogs, uncostedUnits, costedUnits]. 실패 시 [null,null,null](프론트 배열 폴백).
     */
    public static function aggregateCogs(\PDO $pdo, string $tenant, string $baseSql, array $baseArgs, string $cancelExpr, array $cancelTokens): array
    {
        // channel_inventory WAC 서브쿼리 — FEFO/폴백 경로가 동일하게 재사용(드리프트 제거).
        $icJoin =
            "LEFT JOIN (
                        SELECT tenant_id, sku,
                            CASE WHEN SUM(CASE WHEN cost>0 THEN available ELSE 0 END) > 0
                                 THEN SUM(CASE WHEN cost>0 THEN cost*available ELSE 0 END)*1.0 / SUM(CASE WHEN cost>0 THEN available ELSE 0 END)
                                 ELSE AVG(NULLIF(cost,0)) END AS cost
                          FROM channel_inventory WHERE tenant_id=? GROUP BY tenant_id, sku
                   ) ic ON ic.tenant_id = o.tenant_id AND ic.sku = o.sku";
        // uncosted/costed 정의는 WAC 원가 등록 여부 기준으로 불변(FEFO 유무와 독립).
        $uncostedExpr = "COALESCE(SUM(CASE WHEN ic.cost IS NULL OR ic.cost<=0 THEN o.qty ELSE 0 END),0) AS uncosted";
        $costedExpr   = "COALESCE(SUM(CASE WHEN ic.cost>0 THEN o.qty ELSE 0 END),0) AS costed";

        try {
            // 판매/출고 ref 규약 'CHS-{channel}-{channel_order_id}' 를 DB 별 문자열결합으로 재구성.
            //   (MySQL 기본 sql_mode 는 '||'=논리 OR 이므로 CONCAT 필수, SQLite 는 '||' 만 지원.)
            $isMy = false;
            try { $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql'; } catch (\Throwable $e) {}
            $refExpr = $isMy
                ? "CONCAT('CHS-', o.channel, '-', o.channel_order_id)"
                : "('CHS-' || o.channel || '-' || o.channel_order_id)";
            // [현 차수 잔여] ★부분출고 COGS 보전 — FEFO 가 주문수량보다 적게 소비(재고부족 부분출고)한 경우
            //   기존 COALESCE(fefo_cost, qty×WAC) 는 fefo_cost(부분분)만 택해 COGS 과소·마진 과대였다.
            //   COGS = FEFO실원가 + (주문수량 − FEFO소비수량)×WAC 로 부족분을 WAC 보전. 원장 없으면 fefo_qty=0
            //   → 전량 WAC(기존과 byte-identical, 무회귀). uncosted(WAC 미등록)면 보전분×0=0(정의 불변).
            $shortExpr = $isMy ? 'GREATEST(0, o.qty - COALESCE(fc.fefo_qty,0))' : 'MAX(0, o.qty - COALESCE(fc.fefo_qty,0))';
            $stCogs = $pdo->prepare(
                "SELECT
                    COALESCE(SUM(COALESCE(fc.fefo_cost,0) + ($shortExpr) * COALESCE(ic.cost,0)),0) AS cogs,
                    $uncostedExpr,
                    $costedExpr
                   FROM channel_orders o
                   $icJoin
                   LEFT JOIN (
                        SELECT ref, SUM(cost_total) AS fefo_cost, SUM(qty) AS fefo_qty
                          FROM wms_lot_consumptions WHERE tenant_id=? GROUP BY ref
                   ) fc ON fc.ref = $refExpr
                  WHERE o.$baseSql AND NOT $cancelExpr"
            );
            // 바인드 순서 = SQL 등장순: ic.tenant, fc.tenant, baseArgs, cancelTokens.
            $stCogs->execute(array_merge([$tenant, $tenant], $baseArgs, $cancelTokens));
            $cogsRow = $stCogs->fetch(\PDO::FETCH_ASSOC) ?: [];
            return [(float)($cogsRow['cogs'] ?? 0), (int)($cogsRow['uncosted'] ?? 0), (int)($cogsRow['costed'] ?? 0)];
        } catch (\Throwable $e) {
            // FEFO 조인 실패(원장 테이블 부재 등) → 원본 WAC 쿼리로 폴백(무회귀 보장: 기존 결과와 동일).
            try {
                $stW = $pdo->prepare(
                    "SELECT
                        COALESCE(SUM(o.qty * ic.cost),0) AS cogs,
                        $uncostedExpr,
                        $costedExpr
                       FROM channel_orders o
                       $icJoin
                      WHERE o.$baseSql AND NOT $cancelExpr"
                );
                $stW->execute(array_merge([$tenant], $baseArgs, $cancelTokens));
                $r = $stW->fetch(\PDO::FETCH_ASSOC) ?: [];
                return [(float)($r['cogs'] ?? 0), (int)($r['uncosted'] ?? 0), (int)($r['costed'] ?? 0)];
            } catch (\Throwable $e2) {
                return [null, null, null]; // 프론트가 클라 배열 COGS 로 폴백
            }
        }
    }

    /**
     * 공통 진입 가드 — 모든 endpoint method 가 호출.
     * 반환: 정상 시 ['tenant','isDemo','pdo'], 실패 시 ['error' => Response].
     */
    private static function gate(Request $req, Response $resp): array
    {
        $ctx = self::tenantContext($req);
        if ($ctx === null) {
            return ['error' => self::json($resp, ['ok' => false, 'error' => 'no_tenant'], 401)];
        }
        $envCheck = self::guardEnv($ctx['isDemo']);
        if ($envCheck !== null) {
            return ['error' => self::json($resp, $envCheck, 403)];
        }
        $pdo = self::pdo($ctx['isDemo']);
        return ['tenant' => $ctx['tenant'], 'isDemo' => $ctx['isDemo'], 'pdo' => $pdo];
    }

    public static function orders(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $status = isset($q['status']) ? (string)$q['status'] : null;
        $channel = isset($q['channel']) ? (string)$q['channel'] : null;

        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($status !== null) { $where[] = 'status = ?'; $args[] = $status; }
        if ($channel !== null) { $where[] = 'channel = ?'; $args[] = $channel; }
        $whereSql = implode(' AND ', $where);
        // [현 차수 P2] ABAC 차원강제 — 채널/상품(브랜드=상품집합) 스코프 사용자는 허용 행만 조회(무제한=무필터·무회귀).
        [$scW, $scP] = \Genie\Handlers\TeamPermissions::scopeChannelProduct($req, 'channel', 'sku');
        if ($scW !== '') { $whereSql .= $scW; foreach ($scP as $sp) $args[] = $sp; }

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM channel_orders WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM channel_orders WHERE $whereSql ORDER BY id DESC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        // 189차+ 운영버그: 프론트(OrderHub.jsx)가 o.ch/sku/price/carrier/trackingNo/at/wh 를 읽으나
        //   기존 매핑이 이를 누락 → 운영 주문테이블 빈칸 + 검색 시 r.sku.includes TypeError. 필드 보강(안전 폴백).
        $items = array_map(fn($r) => [
            'id'         => (string)($r['id'] ?? $r['order_id'] ?? ''),
            'buyer'      => (string)($r['buyer'] ?? ''),
            'channel'    => (string)($r['channel'] ?? $r['ch'] ?? ''),
            'ch'         => (string)($r['channel'] ?? $r['ch'] ?? ''),
            'sku'        => (string)($r['sku'] ?? $r['product_sku'] ?? ''),
            'name'       => (string)($r['name'] ?? $r['product_name'] ?? ''),
            'qty'        => (int)($r['qty'] ?? $r['quantity'] ?? 0),
            'price'      => (float)($r['price'] ?? $r['unit_price'] ?? 0),
            'total'      => (float)($r['total'] ?? $r['total_price'] ?? 0),
            'status'     => (string)($r['status'] ?? ''),
            'carrier'    => (string)($r['carrier'] ?? ''),
            'trackingNo' => (string)($r['tracking_no'] ?? $r['trackingNo'] ?? ''),
            'at'         => (string)($r['ordered_at'] ?? $r['created_at'] ?? $r['at'] ?? ''),
            'wh'         => (string)($r['warehouse'] ?? $r['wh'] ?? ''),
            // [현 차수] 인플루언서 귀속: 주문에 박힌 쿠폰코드/UTM/크리에이터ID 를 노출 →
            //   프론트 applyAttribution 이 크리에이터별 실측 주문/매출을 자동 산출(운영 실데이터).
            'attribution' => self::extractAttribution($r),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            '_env' => Db::envLabel(),
            '_isDemo' => $isDemo,
        ]);
    }

    /**
     * [현 차수] 주문 행에서 인플루언서 귀속 식별자 추출(쿠폰코드/UTM source/크리에이터ID).
     *   우선순위: 전용 컬럼(coupon_code/utm_source/creator_id) → raw_json 내 채널 제공 값.
     *   채널 API 마다 쿠폰/할인 필드명이 달라 best-effort 로 여러 키를 탐색한다.
     *   하나도 없으면 null(귀속 미발생 주문) → 프론트가 무시.
     */
    private static function extractAttribution(array $r): ?array
    {
        $raw = [];
        if (!empty($r['raw_json'])) {
            $d = json_decode((string)$r['raw_json'], true);
            if (is_array($d)) $raw = $d;
        }
        $pick = function (array $keys) use ($r, $raw) {
            foreach ($keys as $k) {
                if (isset($r[$k]) && $r[$k] !== '' && $r[$k] !== null) return (string)$r[$k];
            }
            foreach ($keys as $k) {
                if (isset($raw[$k]) && $raw[$k] !== '' && $raw[$k] !== null && !is_array($raw[$k])) return (string)$raw[$k];
            }
            return null;
        };
        $coupon = $pick(['coupon_code', 'couponCode', 'coupon', 'discount_code', 'promo_code', 'promotion_code']);
        if ($coupon === null && isset($raw['discount']['code'])) $coupon = (string)$raw['discount']['code'];
        $utm = $pick(['utm_source', 'utmSource']);
        if ($utm === null && isset($raw['utm']['source'])) $utm = (string)$raw['utm']['source'];
        $cid = $pick(['creator_id', 'creatorId', 'influencer_id', 'influencerId']);

        $out = [];
        if ($coupon !== null) $out['couponCode'] = $coupon;
        if ($utm !== null) $out['utmSource'] = $utm;
        if ($cid !== null) $out['influencerId'] = $cid;
        return $out ?: null;
    }

    /**
     * [현 차수] 주문 수동 귀속 태깅 — 채널이 쿠폰/UTM 을 제공하지 않는 주문을 운영자가
     *   특정 크리에이터에 직접 연결한다. creator_id/coupon_code/utm_source 를 영속.
     *   POST /v424/orderhub/orders/attribution  body: { id, creatorId?, couponCode?, utmSource? }
     */
    public static function setAttribution(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $body = (array)($req->getParsedBody() ?? []);
        $id = (string)($body['id'] ?? '');
        if ($id === '') return self::json($resp, ['ok' => false, 'error' => 'id_required'], 400);

        $map = [['creatorId', 'creator_id'], ['couponCode', 'coupon_code'], ['utmSource', 'utm_source']];
        $sets = [];
        $vals = [];
        foreach ($map as [$k, $col]) {
            if (array_key_exists($k, $body)) { $sets[] = "$col = ?"; $vals[] = $body[$k] === null ? null : (string)$body[$k]; }
        }
        // [227차] 쿠폰 할인액 수동 태깅(정산 반영) — 채널 미제공 주문을 운영자가 직접 입력.
        if (array_key_exists('couponDiscount', $body)) { $sets[] = "coupon_discount = ?"; $vals[] = (float)($body['couponDiscount'] ?? 0); }
        if (!$sets) return self::json($resp, ['ok' => false, 'error' => 'no_fields'], 400);

        try {
            self::ensureAttributionColumns($pdo);
            $sql = "UPDATE channel_orders SET " . implode(', ', $sets)
                . " WHERE tenant_id = ? AND (id = ? OR channel_order_id = ? OR order_no = ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_merge($vals, [$tenant, $id, $id, $id]));
            return self::json($resp, ['ok' => true, 'updated' => $stmt->rowCount()]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
    }

    /** channel_orders 에 귀속 컬럼(coupon_code/utm_source/utm_campaign/creator_id)을 idempotent 보강. */
    private static function ensureAttributionColumns(\PDO $pdo): void
    {
        $isMy = false;
        try { $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql'; } catch (\Throwable $e) {}
        foreach (['coupon_code', 'utm_source', 'utm_campaign', 'creator_id'] as $c) {
            try { $pdo->exec("ALTER TABLE channel_orders ADD COLUMN {$c} " . ($isMy ? 'VARCHAR(190)' : 'TEXT')); }
            catch (\Throwable $e) { /* 이미 존재 */ }
        }
        // [227차] 쿠폰 할인액(정산 반영용) 숫자 컬럼. 채널 제공값 또는 운영자 수동 태깅.
        try { $pdo->exec("ALTER TABLE channel_orders ADD COLUMN coupon_discount " . ($isMy ? 'DOUBLE NOT NULL DEFAULT 0' : 'REAL DEFAULT 0')); }
        catch (\Throwable $e) { /* 이미 존재 */ }
    }

    /**
     * [227차] 주문 raw_json 에서 채널 제공 쿠폰/할인액 best-effort 추출(정산 coupon_discount 소급 집계용).
     *   채널마다 필드명이 달라 여러 키를 탐색한다. 발견 못하면 0.
     */
    private static function extractOrderDiscount(?string $rawJson): float
    {
        if ($rawJson === null || $rawJson === '') return 0.0;
        $d = json_decode($rawJson, true);
        if (!is_array($d)) return 0.0;
        foreach (['coupon_discount', 'couponDiscount', 'discount_amount', 'discountAmount',
                  'seller_discount', 'sellerDiscount', 'promotion_discount', 'promotionDiscount'] as $k) {
            if (isset($d[$k]) && is_numeric($d[$k]) && (float)$d[$k] > 0) return (float)$d[$k];
        }
        if (isset($d['discount']) && is_array($d['discount'])) {
            foreach (['amount', 'value', 'coupon'] as $k) {
                if (isset($d['discount'][$k]) && is_numeric($d['discount'][$k]) && (float)$d['discount'][$k] > 0) return (float)$d['discount'][$k];
            }
        }
        return 0.0;
    }

    /**
     * [227차] 기간·취소제외 채널별 쿠폰 할인액 집계. 명시 컬럼(coupon_discount>0) 우선, 없으면 raw_json 추출.
     *   기존 rollup 의 coupon_discount=0 하드코딩을 대체 — 쿠폰 할인이 정산/영업이익(P&L)에 반영된다.
     */
    private static function couponDiscountByChannel(\PDO $pdo, string $tenant, string $period, string $cancelExpr, array $cancelTokens): array
    {
        $hasCol = false;
        try { $hasCol = ($pdo->query("SELECT coupon_discount FROM channel_orders LIMIT 0") !== false); }
        catch (\Throwable $e) { $hasCol = false; }
        $cols = "channel, raw_json" . ($hasCol ? ", coupon_discount" : "");
        try {
            $stmt = $pdo->prepare("SELECT $cols FROM channel_orders WHERE tenant_id=? AND SUBSTR(ordered_at,1,7)=? AND NOT $cancelExpr");
            $stmt->execute(array_merge([$tenant, $period], $cancelTokens));
        } catch (\Throwable $e) { return []; }
        $map = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $ch = (string)($r['channel'] ?? '');
            if ($ch === '') continue;
            $amt = ($hasCol && isset($r['coupon_discount']) && (float)$r['coupon_discount'] > 0)
                ? (float)$r['coupon_discount']
                : self::extractOrderDiscount($r['raw_json'] ?? null);
            if ($amt > 0) $map[$ch] = ($map[$ch] ?? 0.0) + $amt;
        }
        return $map;
    }

    /**
     * [현 차수] P1: 주문 상태 수동 변경 — 운영자가 내부 처리 상태(준비/출고/완료/취소 등)를 전이.
     *   POST /v424/orderhub/orders/status  { id, status }
     *   ★채널이 주문의 진실원천이므로 이후 채널 폴링이 채널 status 로 덮어쓸 수 있음(채널 동기 주문).
     *     채널이 제공하지 않는 내부 처리 상태는 수동 값이 유지된다.
     */
    public static function setOrderStatus(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $body = (array)($req->getParsedBody() ?? []);
        $id = (string)($body['id'] ?? '');
        $status = trim((string)($body['status'] ?? ''));
        if ($id === '' || $status === '') return self::json($resp, ['ok' => false, 'error' => 'id_and_status_required'], 400);
        if (mb_strlen($status) > 40) return self::json($resp, ['ok' => false, 'error' => 'status_too_long'], 400);

        $force = !empty($body['force']);
        // [227차 감사 P0] id 매칭 strict-safe — id 는 INT 컬럼이라 비숫자 id(channel_order_id)를 비교하면
        //   MySQL strict 모드에서 1292 에러. 숫자일 때만 id 포함(잠재 결함 동시 해소).
        $idNum = ctype_digit($id);
        $idClause = $idNum ? "(id = ? OR channel_order_id = ? OR order_no = ?)" : "(channel_order_id = ? OR order_no = ?)";
        $idParams = $idNum ? [$id, $id, $id] : [$id, $id];
        try {
            // [227차 감사 P0] 상태전이 가드 — 기존엔 status 만 UPDATE 해, 수동취소(status='cancelled')된 주문을
            //   'delivered' 로 바꾸면 event_type='order'+status비취소 → 매출 재진입(cancelExclusion 무력화)됐다.
            //   ① 취소/반품 status 전이 시 event_type 도 sticky 분류(채널폴링 saveOrders 정규화와 정합).
            //   ② 취소/반품(event_type) 주문을 활성으로 되돌리는 역전이는 차단(force=true 로만 강제, un-cancel).
            $sel = $pdo->prepare("SELECT event_type, channel, channel_order_id, sku, qty, total_price, buyer_email, buyer_name, product_name FROM channel_orders WHERE tenant_id=? AND $idClause LIMIT 1");
            $sel->execute(array_merge([$tenant], $idParams));
            $curRow = $sel->fetch(\PDO::FETCH_ASSOC) ?: [];
            $curEvt = (string)($curRow['event_type'] ?? 'order');
            $wasCR = in_array($curEvt, ['cancel', 'return'], true);
            // [커머스 보강] 캐논 claimType(cancel|return|exchange) 우선 → 폴백 정규식. 교환=매출중립(취소/반품 어디에도 미산입).
            $newEvt = self::claimType($status);
            if ($newEvt === null) {
                $newEvt = preg_match('/cancel|취소|void/iu', $status) ? 'cancel'
                        : (preg_match('/exchange|교환|swap/iu', $status) ? 'exchange'
                        : (preg_match('/return|refund|반품|환불/iu', $status) ? 'return' : null));
            }
            if ($newEvt === null && $wasCR && !$force) {
                return self::json($resp, ['ok' => false, 'error' => 'cancelled_or_returned_cannot_reactivate',
                    'message' => '취소/반품된 주문은 활성 상태로 되돌릴 수 없습니다. (force=true 로 강제)'], 409);
            }
            // event_type: 취소/반품 status→sticky 분류 / force 활성복구→'order' / 그 외 기존 유지.
            $setEvt = $newEvt ?? (($force && $wasCR) ? 'order' : $curEvt);
            $stmt = $pdo->prepare("UPDATE channel_orders SET status = ?, event_type = ? WHERE tenant_id = ? AND $idClause");
            $stmt->execute(array_merge([$status, $setEvt, $tenant], $idParams));
            // [현 차수 P1] 운영자 수동 활성→취소/반품 전이 → 자동 폴링/웹훅과 대칭 부수효과(CRM LTV 역분개·채널/물리재고 복원·
            //   claim(returnFee)·order.cancelled emit·반품포탈). 기존엔 정산 재롤업만 해 LTV/RFM/예측CLV·재고가 과대 잔존
            //   (263/265차가 자동경로에서 근절한 결함의 수동경로 잔존). event_type 을 위에서 sticky 전이시켰으므로 이후 폴링
            //   재발화 없음 → 1회 수행 안전. 전부 멱등(order_id/CLM-/CHR- dedup).
            if (!$wasCR && in_array($newEvt, ['cancel', 'return'], true)) {
                try {
                    \Genie\Handlers\ChannelSync::applyManualCancelReturn(
                        $pdo, $tenant, (string)($curRow['channel'] ?? ''), (string)($curRow['channel_order_id'] ?? ''), $newEvt,
                        (string)($curRow['buyer_email'] ?? ''), (string)($curRow['buyer_name'] ?? ''),
                        (float)($curRow['total_price'] ?? 0), (string)($curRow['sku'] ?? ''),
                        (int)($curRow['qty'] ?? 0), (string)($curRow['product_name'] ?? '')
                    );
                } catch (\Throwable $e) { error_log('[OrderHub.setOrderStatus.sideEffects] ' . $e->getMessage()); }
            }
            // [현 차수 D] 정산 stale-table 신선도 — 정산 읽기(settlementsStats)는 orderhub_settlements 저장본을
            //   직독하므로, 주문 상태변경(취소/반품 전이·force 활성복구 포함)이 재롤업 전까지 옛 매출/취소를 노출한다.
            //   ingestClaims 와 동일 패턴으로 해당 주문 월(YYYY-MM)을 즉시 재롤업해 정산을 실시간 일치시킨다(비치명).
            $rerolled = null;
            try {
                $pp = $pdo->prepare("SELECT SUBSTR(ordered_at,1,7) FROM channel_orders WHERE tenant_id=? AND $idClause LIMIT 1");
                $pp->execute(array_merge([$tenant], $idParams));
                $pm = (string)($pp->fetchColumn() ?: '');
                if (preg_match('/^\d{4}-\d{2}$/', $pm)) { self::rollupSettlementsCore($pdo, $tenant, $pm, null, gmdate('Y-m-d H:i:s')); $rerolled = $pm; }
            } catch (\Throwable $e) {}
            return self::json($resp, ['ok' => true, 'updated' => $stmt->rowCount(), 'status' => $status, 'event_type' => $setEvt, 'rerolled' => $rerolled]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * [현 차수] P1: 반품/클레임 상태 수동 변경 — 운영자가 반품 처리 상태(접수/검수/승인/환불/입고완료)를 전이.
     *   POST /v424/orderhub/claims/status  { id, status }
     *   반품 등록은 기존 ingestClaims(POST /v424/orderhub/claims, items:[1건]) 재사용.
     */
    public static function setClaimStatus(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $body = (array)($req->getParsedBody() ?? []);
        $id = (string)($body['id'] ?? '');
        $status = trim((string)($body['status'] ?? ''));
        if ($id === '' || $status === '') return self::json($resp, ['ok' => false, 'error' => 'id_and_status_required'], 400);
        if (mb_strlen($status) > 40) return self::json($resp, ['ok' => false, 'error' => 'status_too_long'], 400);

        try {
            // [227차 감사 P0] 반품 클레임 복원-status 전이 시 물리재고 복원 — claim 은 sku/qty 미보유라 원주문(channel_orders) 조인.
            //   ReturnsPortal 과 동일 restockRef(CHR-{channel}-{order_id}) → 양 경로 전역 dedup. reflectChannelRestock
            //   대칭가드(원판매 Outbound 있을 때만·차감분 초과/이중복원 방지)로 order_id 불일치/중복 시 안전 no-op.
            $row = null;
            try {
                $cs = $pdo->prepare("SELECT c.order_id, c.channel, c.type, o.sku, o.product_name AS name, o.qty, SUBSTR(o.ordered_at,1,7) AS period
                    FROM orderhub_claims c LEFT JOIN channel_orders o
                      ON o.tenant_id=c.tenant_id AND (o.channel_order_id=c.order_id OR o.order_no=c.order_id)
                    WHERE c.id=? AND c.tenant_id=? LIMIT 1");
                $cs->execute([$id, $tenant]);
                $row = $cs->fetch(\PDO::FETCH_ASSOC) ?: null;
            } catch (\Throwable $e) {}

            $stmt = $pdo->prepare("UPDATE orderhub_claims SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?");
            $stmt->execute([$status, gmdate('Y-m-d H:i:s'), $id, $tenant]);

            // [현 차수 D] 정산 stale-table 신선도 — 클레임(반품/취소) 상태변경은 원주문 월의 returnFee/net_payout 을
            //   바꾸지만 정산 저장본은 재롤업 전까지 옛 값을 노출한다 → 해당 원주문 월(YYYY-MM) 즉시 재롤업.
            $rerolled = null;
            try {
                $pm = (string)($row['period'] ?? '');
                if (preg_match('/^\d{4}-\d{2}$/', $pm)) { self::rollupSettlementsCore($pdo, $tenant, $pm, null, gmdate('Y-m-d H:i:s')); $rerolled = $pm; }
            } catch (\Throwable $e) {}

            $restored = false;
            if (!$isDemo && $row && (string)($row['sku'] ?? '') !== ''
                && in_array((string)($row['type'] ?? ''), ['return', 'cancel'], true)
                && preg_match('/restock|입고/iu', $status)) {
                try {
                    $ref = (string)($row['channel'] ?? '') . '-' . (string)($row['order_id'] ?? '');
                    $restored = Wms::reflectChannelRestock($tenant, (string)$row['sku'], (string)($row['name'] ?? ''), (float)($row['qty'] ?? 0), 'CHS-' . $ref, 'CHR-' . $ref);
                } catch (\Throwable $e) {}
            }
            return self::json($resp, ['ok' => true, 'updated' => $stmt->rowCount(), 'status' => $status, 'restored' => $restored, 'rerolled' => $rerolled]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
    }

    /* ── [289차 후속] 반품 검수등급 · 환불수단 ────────────────────────────────────
     * 종전 `orderhub_claims` 는 status/amount 만 보유해 **검수등급(insp_grade)·환불수단
     * (refund_method) 을 저장할 곳이 아예 없었다**. 프론트 반품 포털의 검수/환불/재입고
     * 탭은 이 두 값을 기준으로 행을 필터했으므로 운영에서 영구히 0행이었다(데모 시드에서만
     * 값이 만들어졌다). 아래 3요소로 실 저장 경로를 개통한다:
     *   ① ensureClaimColumns  — 기존 테이블에도 멱등 추가(자가치유)
     *   ② claims() 응답에 inspGrade/refundMethod 포함
     *   ③ setClaimMeta        — 값 기록 엔드포인트
     */

    /** 허용 검수등급 — 프론트 뱃지(gradeA~F)와 1:1. */
    private const INSP_GRADES   = ['A', 'B', 'C', 'F'];
    /** 허용 환불수단 — 프론트 라벨(refundCard/refundBank/refundOriginal)과 1:1. */
    private const REFUND_METHODS = ['card', 'bank', 'original'];

    /**
     * 반품 부가필드 자가치유(멱등). 마이그레이션은 172차에서 멈췄고 이후 스키마는 핸들러
     * 자가치유가 정본이므로 동일 패턴(ALTER + try/catch)을 따른다.
     * ★PDO 객체 단위로 1회만 — 운영/데모 PDO 가 한 프로세스에 공존해도 각각 보장된다.
     */
    private static function ensureClaimColumns(\PDO $pdo): void
    {
        static $done = [];
        $k = spl_object_id($pdo);
        if (isset($done[$k])) return;
        $done[$k] = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        foreach ([
            'insp_grade'    => $isMy ? 'VARCHAR(4)'  : 'TEXT',
            'refund_method' => $isMy ? 'VARCHAR(16)' : 'TEXT',
        ] as $col => $type) {
            // 이미 있으면 예외 → 무시(멱등). 컬럼 유무 선조회보다 드라이버 중립적이다.
            try { $pdo->exec("ALTER TABLE orderhub_claims ADD COLUMN {$col} {$type}"); } catch (\Throwable $e) {}
        }
    }

    /**
     * POST /v424/orderhub/claims/meta  { id, insp_grade?, refund_method? }
     * 반품 검수등급·환불수단 기록. 상태 전이(setClaimStatus)와 **의도적으로 분리**한다 —
     * 상태 전이는 재고복원·정산 재롤업 같은 부수효과를 동반하지만 이 두 값은 순수 메타다.
     * ★null/'' 전달 = 해당 필드 해제(미측정으로 되돌림). 미전달 필드는 건드리지 않는다.
     */
    public static function setClaimMeta(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        self::ensureClaimColumns($pdo);

        $body = (array)($req->getParsedBody() ?? []);
        $id = trim((string)($body['id'] ?? ''));
        if ($id === '') return self::json($resp, ['ok' => false, 'error' => 'id_required'], 400);

        $sets = []; $args = [];
        if (array_key_exists('insp_grade', $body)) {
            $v = strtoupper(trim((string)($body['insp_grade'] ?? '')));
            if ($v !== '' && !in_array($v, self::INSP_GRADES, true)) {
                return self::json($resp, ['ok' => false, 'error' => 'invalid_insp_grade', 'allowed' => self::INSP_GRADES], 400);
            }
            $sets[] = 'insp_grade = ?'; $args[] = ($v === '' ? null : $v);
        }
        if (array_key_exists('refund_method', $body)) {
            $v = strtolower(trim((string)($body['refund_method'] ?? '')));
            if ($v !== '' && !in_array($v, self::REFUND_METHODS, true)) {
                return self::json($resp, ['ok' => false, 'error' => 'invalid_refund_method', 'allowed' => self::REFUND_METHODS], 400);
            }
            $sets[] = 'refund_method = ?'; $args[] = ($v === '' ? null : $v);
        }
        if (!$sets) return self::json($resp, ['ok' => false, 'error' => 'no_fields'], 400);

        try {
            $sets[] = 'updated_at = ?'; $args[] = gmdate('Y-m-d H:i:s');
            $args[] = $id; $args[] = $tenant;   // ★tenant_id 조건 필수(테넌트 격리)
            $st = $pdo->prepare('UPDATE orderhub_claims SET ' . implode(', ', $sets) . ' WHERE id = ? AND tenant_id = ?');
            $st->execute($args);
            // 매칭 0건은 성공으로 위장하지 않는다(타 테넌트 id·오타를 조용히 삼키면 UI 가 반영된 줄 안다).
            if ($st->rowCount() === 0) {
                return self::json($resp, ['ok' => false, 'error' => 'not_found', 'updated' => 0], 404);
            }
            return self::json($resp, ['ok' => true, 'updated' => $st->rowCount()]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * [현 차수] 주문 통계 서버측 집계 — limit 캡 과소집계 근본해소(감사 P2).
     *
     * 기존 프론트(GlobalDataContext.orderStats)는 /orderhub/orders?limit=1000 으로 받은
     * 주문 배열을 클라이언트에서 집계 → 주문 1000건 초과 테넌트는 count/revenue/버킷이 과소집계됐다.
     * 본 엔드포인트는 channel_orders 전체를 SQL 집계(LIMIT 없음)해 정확한 합계를 반환한다.
     *
     * 취소 판정은 Rollup::isCancel / 프론트 CANCELLED_STATUSES 와 동일한 캐논(event_type='cancel'
     * 우선 + CANCEL_TOKENS)을 사용 → orderStats ↔ Rollup 발산 제거(218차 데이터일관성 정본 연장).
     */
    public static function ordersStats(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $q = $req->getQueryParams();
        $channel = isset($q['channel']) ? (string)$q['channel'] : null;
        // [정밀감사 A] 기간(from/to) 필터 — 대시보드 기간 토글이 1000건 캡 클라 배열 대신 서버 전체행
        //   집계를 쓰도록(캡 과소집계 해소). ordered_at 은 어댑터별 ISO/'Y-m-d H:i:s' 혼재라 날짜 prefix(앞 10자
        //   'YYYY-MM-DD') 비교로 포맷 강건. 미지정(전체기간)이면 기존 동작 100% 보존(가산적).
        $from = isset($q['from']) ? substr(trim((string)$q['from']), 0, 10) : '';
        $to   = isset($q['to'])   ? substr(trim((string)$q['to']),   0, 10) : '';

        // 캐논 토큰(취소=SSOT const, status 버킷=프론트 orderStats 동일)
        $pendingTokens  = ['발주Confirm','paid'];
        $shippingTokens = ['출고대기','배송중','preparing','shipping'];
        $doneTokens     = ['배송Done','delivered','confirmed','Done'];

        $base = ['tenant_id = ?'];
        $baseArgs = [$tenant];
        if ($channel !== null) { $base[] = 'channel = ?'; $baseArgs[] = $channel; }
        if ($from !== '') { $base[] = "SUBSTR(ordered_at,1,10) >= ?"; $baseArgs[] = $from; }
        if ($to   !== '') { $base[] = "SUBSTR(ordered_at,1,10) <= ?"; $baseArgs[] = $to; }
        $baseSql = implode(' AND ', $base);

        $ph = fn(array $a) => implode(',', array_fill(0, count($a), '?'));
        // event_type 우선 취소 판정 + status 토큰(SSOT). NULL-safe(COALESCE): 프론트 _isCancelled(null)=false(활성)와
        //   일치시켜 NULL status/event 행이 NOT 평가에서 NULL→제외되는 SQL 3value 함정 차단.
        [$cancelExpr, $cancelTokens] = self::cancelExclusion();

        try {
            // 활성(취소 제외) 주문수 + 매출 합계 — 전체 행 SQL 집계
            $stA = $pdo->prepare("SELECT COUNT(*) AS cnt, COALESCE(SUM(total_price),0) AS rev
                FROM channel_orders WHERE $baseSql AND NOT $cancelExpr");
            $stA->execute(array_merge($baseArgs, $cancelTokens));
            $active = $stA->fetch(\PDO::FETCH_ASSOC) ?: ['cnt' => 0, 'rev' => 0];

            // status 버킷 카운트(프론트 orderStats와 동일 토큰셋)
            // [현 차수] 상태버킷도 취소 제외(2축) — 종전엔 status IN(...)만 봐서 event_type='cancel' 이나 status='delivered'
            //   로 남은 주문이 done·cancelled 에 이중 계상, 상태별 합≠활성주문수였다(매출/이익 영향 없는 표시용 카운트 왜곡).
            $bucket = function (array $tokens) use ($pdo, $baseSql, $baseArgs, $ph, $cancelExpr, $cancelTokens) {
                $s = $pdo->prepare("SELECT COUNT(*) FROM channel_orders WHERE $baseSql AND NOT $cancelExpr AND status IN (" . $ph($tokens) . ")");
                $s->execute(array_merge($baseArgs, $cancelTokens, $tokens));
                return (int)$s->fetchColumn();
            };
            $pending  = $bucket($pendingTokens);
            $shipping = $bucket($shippingTokens);
            $done     = $bucket($doneTokens);

            $stC = $pdo->prepare("SELECT COUNT(*) FROM channel_orders WHERE $baseSql AND $cancelExpr");
            $stC->execute(array_merge($baseArgs, $cancelTokens));
            $cancelled = (int)$stC->fetchColumn();

            // [현 차수] 219 P2(데모/운영 정합): 반품 건수 노출(반품은 매출 포함·건수만 별도, 데모 settlement.returns 정합).
            //   토큰=SSOT(self::RETURN_TOKENS) — 인라인 배열 제거(Rollup 과 드리프트 방지).
            $returnTokens = self::RETURN_TOKENS;
            $stR = $pdo->prepare("SELECT COUNT(*) FROM channel_orders WHERE $baseSql AND (COALESCE(event_type,'')='return' OR status IN (" . $ph($returnTokens) . "))");
            $stR->execute(array_merge($baseArgs, $returnTokens));
            $returned = (int)$stR->fetchColumn();
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        // [225차 P1-11 + 233차 P2 정합] 서버측 COGS 집계(전체 행) — 기존 프론트는 매출만 서버집계로 고치고 COGS 는
        //   activeOrders(1000캡 배열) 계산이라 1000건 초과 테넌트의 총이익/영업이익이 과대(219 비대칭)였다.
        //   channel_orders 엔 cost 컬럼이 없어 channel_inventory.cost(sku별)와 조인 집계. 취소 제외(cancelExpr SSOT).
        //   ★233차 P2: ①sku 가 (channel·warehouse)별 다중행이라 기존 MAX(cost)=최고가 → COGS 과대·이익 과소.
        //     실제 재고수량 가중평균(WAC=Σ(cost×available)/Σavailable, cost>0 행만; 재고 0 이면 비영(非零) cost 평균)
        //     으로 교체 → 실제 원가·재고에서 자동산출. ②원가 미등록 SKU 주문을 0(무료)으로 묵살하지 않고
        //     uncosted_units 로 정직 노출(소비측이 "원가 등록분 기준" 임을 인지). 실패 시 cogs=null(프론트 배열 폴백).
        //   [현 차수] COGS(WAC) 집계는 self::aggregateCogs SSOT 로 위임 — Pnl 핸들러와 동일 로직 공유(divergence 방지).
        [$cogs, $cogsUncostedUnits, $cogsCostedUnits] = self::aggregateCogs($pdo, $tenant, $baseSql, $baseArgs, $cancelExpr, $cancelTokens);

        return self::json($resp, [
            'ok'        => true,
            'count'     => (int)$active['cnt'],
            'totalOrders' => (int)$active['cnt'],
            'revenue'   => (float)$active['rev'],
            'cogs'      => $cogs,
            'cogs_uncosted_units' => $cogsUncostedUnits, // [233차 P2] 원가 미등록 units(정직 노출 — COGS 는 등록분 기준)
            'cogs_costed_units'   => $cogsCostedUnits,
            'pending'   => $pending,
            'shipping'  => $shipping,
            'done'      => $done,
            'cancelled' => $cancelled,
            'returned'  => $returned,
            // [정밀감사 A] 적용된 기간 echo — 프론트가 이 echo 일치 시에만 기간값으로 신뢰(구버전 백엔드면
            //   echo 부재 → 프론트가 클라 배열 폴백). 배포 순서 무관 안전.
            'period_from' => $from !== '' ? $from : null,
            'period_to'   => $to   !== '' ? $to   : null,
            '_env'      => Db::envLabel(),
            '_isDemo'   => $isDemo,
        ]);
    }

    /**
     * [225차 P1-16] 클레임(반품) 통계 서버집계 — 전체 행(limit 캡 무관) 상태별 카운트 + 반품액 합계.
     *   ReturnsPortal 은 claims?limit=200 배열로 KPI 를 세어 200건 초과 테넌트가 과소 집계됐다.
     *   상태별 카운트와 총 반품액을 DB 에서 집계해 정확한 반품 KPI 를 제공.
     */
    public static function claimsStats(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $byStatus = [];
        $total = 0; $amount = 0.0;
        try {
            // [현 차수 P2] (channel, order_id) 로 dedup(MAX amount) 후 집계 — 정산 롤업(272차)은 이미 dedup 하는데
            //   claimsStats 만 전 행 카운트라, 폴링('CLM-')+CSV('clm_') 공존 시 건수·금액이 부풀어 정산과 발산했다.
            $st = $pdo->prepare("SELECT COALESCE(channel,'') ch, COALESCE(order_id,'') oid, COALESCE(status,'pending') status, COALESCE(amount,0) amt FROM orderhub_claims WHERE tenant_id=?");
            $st->execute([$tenant]);
            $dedup = []; $rn = 0;
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $key = ($r['oid'] === '') ? ('row_' . ($rn++)) : ($r['ch'] . '|' . $r['oid']); // order_id 없으면 개별 카운트
                if (!isset($dedup[$key]) || (float)$r['amt'] > $dedup[$key]['amt']) $dedup[$key] = ['status' => (string)$r['status'], 'amt' => (float)$r['amt']];
            }
            foreach ($dedup as $d) {
                $byStatus[$d['status']] = ($byStatus[$d['status']] ?? 0) + 1;
                $total  += 1;
                $amount += $d['amt'];
            }
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        return self::json($resp, [
            'ok'        => true,
            'total'     => $total,
            'byStatus'  => $byStatus,
            'pending'   => (int)($byStatus['pending'] ?? 0),
            'approved'  => (int)($byStatus['approved'] ?? 0),
            'refunded'  => (int)($byStatus['refunded'] ?? 0),
            'rejected'  => (int)($byStatus['rejected'] ?? 0),
            'restocked' => (int)($byStatus['restocked'] ?? 0),
            'disposed'  => (int)($byStatus['disposed'] ?? 0),
            'amount'    => round($amount, 2),
            '_env'      => Db::envLabel(),
            '_isDemo'   => $isDemo,
        ]);
    }

    public static function claims(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        self::ensureClaimColumns($pdo); // [289차 후속] 첫 조회만으로도 컬럼이 수렴하도록(쓰기 선행 불필요)

        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $type = isset($q['type']) ? (string)$q['type'] : null;

        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($type !== null) { $where[] = 'type = ?'; $args[] = $type; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orderhub_claims WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM orderhub_claims WHERE $whereSql ORDER BY created_at DESC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)$r['id'],
            'orderId' => (string)($r['order_id'] ?? ''),
            'buyer' => (string)($r['buyer'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'type' => (string)($r['type'] ?? 'return'),
            'reason' => (string)($r['reason'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'amount' => (float)($r['amount'] ?? 0),
            'createdAt' => (string)($r['created_at'] ?? ''),
            // [289차 후속] 검수등급·환불수단 — 미기록이면 null(0/'' 로 채우지 않는다.
            //   프론트가 '—'(미측정)로 정직 표기하고, 값이 있을 때만 뱃지를 렌더한다).
            'inspGrade' => (($r['insp_grade'] ?? '') !== '' && $r['insp_grade'] !== null) ? (string)$r['insp_grade'] : null,
            'refundMethod' => (($r['refund_method'] ?? '') !== '' && $r['refund_method'] !== null) ? (string)$r['refund_method'] : null,
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            '_env' => Db::envLabel(),
            '_isDemo' => $isDemo,
        ]);
    }

    public static function settlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $period = isset($q['period']) ? (string)$q['period'] : null;

        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($period !== null) { $where[] = 'period = ?'; $args[] = $period; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orderhub_settlements WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM orderhub_settlements WHERE $whereSql ORDER BY period DESC, channel ASC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)$r['id'],
            'period' => (string)($r['period'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'grossSales' => (float)($r['gross_sales'] ?? 0),
            'netPayout' => (float)($r['net_payout'] ?? 0),
            'platformFee' => (float)($r['platform_fee'] ?? 0),
            'adFee' => (float)($r['ad_fee'] ?? 0),
            'couponDiscount' => (float)($r['coupon_discount'] ?? 0),
            'returnFee' => (float)($r['return_fee'] ?? 0),
            'orders' => (int)($r['orders_count'] ?? 0),
            'returns' => (int)($r['returns_count'] ?? 0),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            '_env' => Db::envLabel(),
            '_isDemo' => $isDemo,
        ]);
    }

    /**
     * [225차 P0-1] 정산 통계 서버집계 — 전체 행 SQL 집계(limit 캡 무관).
     *   기존 프론트 settlementStats 는 settlements?limit=200 배열을 재집계해
     *   정산행 200건 초과 테넌트의 매출/수수료/순지급/반품이 과소되었다(P&L 정본 오염).
     *   ordersStats 와 동일하게 전체 행을 DB에서 SUM 하여 정확한 정산 머니경로를 제공.
     *   반환 키는 프론트 settlementStats 객체와 1:1 매핑(totalGross 등).
     */
    public static function settlementsStats(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $q = $req->getQueryParams();
        $period  = isset($q['period'])  ? (string)$q['period']  : null;
        $channel = isset($q['channel']) ? (string)$q['channel'] : null;

        $where = ['tenant_id = ?'];
        $args  = [$tenant];
        if ($period  !== null) { $where[] = 'period = ?';  $args[] = $period;  }
        if ($channel !== null) { $where[] = 'channel = ?'; $args[] = $channel; }
        $whereSql = implode(' AND ', $where);

        try {
            // status NULL/빈값은 프론트 filter(s => s.status !== 'settled')와 동일하게 pending 으로 분류
            //   → COALESCE(status,'') 로 settled/pending 을 빠짐없이 양분(NULL 3-value 함정 차단).
            $st = $pdo->prepare(
                "SELECT COUNT(*) AS rows_count,
                        COALESCE(SUM(gross_sales),0)     AS gross,
                        COALESCE(SUM(net_payout),0)      AS net,
                        COALESCE(SUM(platform_fee),0)    AS pfee,
                        COALESCE(SUM(ad_fee),0)          AS adfee,
                        COALESCE(SUM(coupon_discount),0) AS coupon,
                        COALESCE(SUM(return_fee),0)      AS rfee,
                        COALESCE(SUM(CASE WHEN COALESCE(status,'')='settled'  THEN net_payout ELSE 0 END),0) AS settled_amt,
                        COALESCE(SUM(CASE WHEN COALESCE(status,'')<>'settled' THEN net_payout ELSE 0 END),0) AS pending_amt,
                        COALESCE(SUM(CASE WHEN COALESCE(status,'')='estimated' THEN net_payout ELSE 0 END),0) AS net_est,
                        COALESCE(SUM(orders_count),0)    AS ord,
                        COALESCE(SUM(returns_count),0)   AS ret
                 FROM orderhub_settlements WHERE $whereSql"
            );
            $st->execute($args);
            $r = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $orders  = (int)($r['ord'] ?? 0);
        $returns = (int)($r['ret'] ?? 0);

        // [231차] 채널별 배송비(정률·무료배송 기준금액) → 순이익 정합.
        //   주문별: free_ship_threshold>0 && total>=threshold → 무료(0), 아니면 shipping_standard(유료).
        //   채널 규칙(kr_fee_rule 최신) 없거나 컬럼 부재 시 0(무후퇴). 활성 주문만(취소/반품 제외).
        $shipFee = 0.0;
        try {
            $sw = ['co.tenant_id = ?']; $sa = [$tenant];
            if ($period  !== null) { $sw[] = "co.ordered_at LIKE ?"; $sa[] = $period . '%'; }
            if ($channel !== null) { $sw[] = "co.channel = ?";        $sa[] = $channel; }
            // [286차 SSOT 통일] 취소 제외를 매출과 동일한 2축(event_type+status 토큰) cancelExclusion 으로 교체.
            //   종전 하드코딩 8토큰은 'CancelDone'/'취소완료'/'취소요청'/'주문취소'·event_type='cancel'(웹훅취소)을 놓쳐
            //   매출에선 제외된 주문에 배송비를 청구해 영업이익이 과소계상됐다. 반품은 매출에 포함(returnFee)되므로 배송비도 포함(대칭).
            [$cxSql, $cxTok] = self::cancelExclusion('co');
            $sw[] = "NOT $cxSql";
            foreach ($cxTok as $tk) { $sa[] = $tk; }
            $swSql = implode(' AND ', $sw);
            $shipSt = $pdo->prepare(
                "SELECT COALESCE(SUM(CASE WHEN fr.ship > 0 AND (fr.thr <= 0 OR co.total_price < fr.thr) THEN fr.ship ELSE 0 END),0) AS shipfee
                 FROM channel_orders co
                 JOIN (SELECT channel_key, shipping_standard AS ship, free_ship_threshold AS thr FROM kr_fee_rule
                       WHERE tenant_id = ? AND id IN (SELECT MAX(id) FROM kr_fee_rule WHERE tenant_id = ? GROUP BY channel_key)) fr
                   ON LOWER(fr.channel_key) = LOWER(co.channel)
                 WHERE $swSql"
            );
            $shipSt->execute(array_merge([$tenant, $tenant], $sa));
            $shipFee = (float)($shipSt->fetchColumn() ?: 0);
        } catch (\Throwable $e) { $shipFee = 0.0; }

        return self::json($resp, [
            'ok'                  => true,
            'rowsCount'           => (int)($r['rows_count'] ?? 0),
            'totalGross'          => (float)($r['gross'] ?? 0),
            'totalNetPayout'      => (float)($r['net'] ?? 0),
            'totalNetEst'         => (float)($r['net_est'] ?? 0),   // [281차 P2] estimated 정산 net_payout — 프론트 netProfit 배송비 estShare 정합용
            'totalPlatformFee'    => (float)($r['pfee'] ?? 0),
            'totalAdFee'          => (float)($r['adfee'] ?? 0),
            'totalCouponDiscount' => (float)($r['coupon'] ?? 0),
            'totalReturnFee'      => (float)($r['rfee'] ?? 0),
            'totalShippingFee'    => $shipFee,
            'settledAmount'       => (float)($r['settled_amt'] ?? 0),
            'pendingAmount'       => (float)($r['pending_amt'] ?? 0),
            'totalOrders'         => $orders,
            'totalReturns'        => $returns,
            'returnRate'          => $orders > 0 ? $returns / $orders : 0,
            '_env'                => Db::envLabel(),
            '_isDemo'             => $isDemo,
        ]);
    }

    /* ════════════════════════════════════════════════════════════════════
     * 206차 #3 — claims/settlements 인제스트 라이터 (CSV/API)
     *   기존엔 읽기 전용(빈 테이블). 채널 정산 데이터를 적재한다.
     *   - POST orderhub/claims        : 반품/취소 클레임 인제스트(JSON 배열 또는 CSV)
     *   - POST orderhub/settlements   : 정산 레코드 인제스트(period+channel upsert)
     *   - POST orderhub/settlements/rollup : channel_orders 집계로 정산 파생
     * ════════════════════════════════════════════════════════════════════ */

    /** body 에서 레코드 배열 추출 — {items:[]} / 배열 / 단일객체 / {csv:"..."} 모두 수용. */
    private static function extractItems(Request $req): array
    {
        $body = $req->getParsedBody();
        if (is_array($body)) {
            if (isset($body['items']) && is_array($body['items'])) return array_values($body['items']);
            if (isset($body['csv']) && is_string($body['csv'])) return self::parseCsv($body['csv']);
            if (array_is_list($body)) return $body;
            if (!empty($body)) return [$body];
        }
        // raw CSV 본문(content-type: text/csv)
        $raw = (string)$req->getBody();
        if ($raw !== '' && str_contains($raw, ',')) {
            $maybe = json_decode($raw, true);
            if (is_array($maybe)) return array_is_list($maybe) ? $maybe : [$maybe];
            return self::parseCsv($raw);
        }
        return [];
    }

    /** 헤더 행 기반 CSV → 연관배열 목록. */
    private static function parseCsv(string $csv): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        if (!$lines || count($lines) < 2) return [];
        $header = array_map('trim', str_getcsv(array_shift($lines)));
        $out = [];
        foreach ($lines as $ln) {
            if (trim($ln) === '') continue;
            $cols = str_getcsv($ln);
            $row = [];
            foreach ($header as $i => $h) { $row[$h] = $cols[$i] ?? null; }
            $out[] = $row;
        }
        return $out;
    }

    private static function genId(string $prefix, string $tenant): string
    {
        return $prefix . '_' . substr(md5($tenant), 0, 6) . '_' . str_replace('.', '', uniqid('', true));
    }

    public static function ingestClaims(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        self::ensureClaimColumns($pdo); // [289차 후속] insp_grade/refund_method 수용 준비

        $items = self::extractItems($req);
        $now = gmdate('Y-m-d H:i:s');
        $ingested = 0; $skipped = 0; $invalidMeta = 0;
        try {
            $chk = $pdo->prepare("SELECT 1 FROM orderhub_claims WHERE id=? AND tenant_id=? LIMIT 1");
            /* [289차 후속] 검수등급·환불수단 수집.
             * ★COALESCE 보존 시맨틱 — 값을 준 필드만 갱신하고 **미제공(null)은 기존 값을 지킨다**.
             *   채널 폴링·CSV 재업로드가 이 필드를 안 실어 보낸다고 해서 운영자가 수기로 입력한
             *   등급/환불수단을 지워버리면 안 되기 때문이다(재수집이 수기 입력을 덮는 회귀 차단).
             * ★ingest 로는 해제(미측정 되돌리기)를 지원하지 않는다 — 해제는 명시적 행위이므로
             *   setClaimMeta('' 전달) 로만 가능하게 두어 대량 수집의 사고 반경을 좁힌다. */
            $metaUpd = $pdo->prepare("UPDATE orderhub_claims SET insp_grade=COALESCE(?,insp_grade), refund_method=COALESCE(?,refund_method), updated_at=? WHERE id=? AND tenant_id=?");
            $upd = $pdo->prepare("UPDATE orderhub_claims SET buyer=?,channel=?,type=?,reason=?,status=?,amount=?,updated_at=? WHERE id=? AND tenant_id=?");
            $ins = $pdo->prepare("INSERT INTO orderhub_claims (id,tenant_id,order_id,buyer,channel,type,reason,status,amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            $po = $pdo->prepare("SELECT SUBSTR(ordered_at,1,7) FROM channel_orders WHERE tenant_id=? AND (channel_order_id=? OR order_no=?) LIMIT 1");
            $affected = [];
            foreach ($items as $it) {
                $orderId = (string)($it['order_id'] ?? $it['orderId'] ?? '');
                if ($orderId === '') { $skipped++; continue; }
                $status  = (string)($it['status'] ?? 'pending');
                // [커머스 보강] type 미지정/무효 시 status 로 캐논 분류(claimType: 교환 우선) → 교환을 '반품'으로 오분류하지 않음.
                $type = (string)($it['type'] ?? '');
                if (!in_array($type, ['return','cancel','exchange'], true)) $type = self::claimType($status) ?? 'return';
                $buyer   = isset($it['buyer']) ? (string)$it['buyer'] : null;
                $channel = isset($it['channel']) ? (string)$it['channel'] : null;
                $reason  = isset($it['reason']) ? (string)$it['reason'] : null;
                $amount  = (float)($it['amount'] ?? 0);
                $id = (string)($it['id'] ?? '');
                // [225차 P1-9] id 미제공 시 자연키(tenant|channel|order_id|type) 결정적 id 로 멱등화.
                //   기존엔 항상 신규 INSERT → 동일 반품 재업로드(CSV/API)가 중복 적재되어 rollupSettlementsCore
                //   의 반품·반품비가 이중집계되던 결함 차단. 존재확인 기반 upsert 로 rowCount=0(무변경) 함정도 회피.
                if ($id === '') {
                    $id = 'clm_' . substr(hash('sha256', $tenant . '|' . (string)$channel . '|' . $orderId . '|' . $type), 0, 24);
                }
                // [289차 후속] 검수등급·환불수단 — snake/camel 양쪽 수용(채널 어댑터·CSV 헤더 편차 흡수).
                //   화이트리스트 위반은 **그 필드만 무시**하고 건수를 응답에 노출한다(무음 폐기 금지).
                //   한 셀이 잘못됐다고 주문 자체를 떨구면 대량 수집이 취약해지므로 항목은 살린다.
                $ig = null; $rm = null;
                if (array_key_exists('insp_grade', $it) || array_key_exists('inspGrade', $it)) {
                    $v = strtoupper(trim((string)($it['insp_grade'] ?? $it['inspGrade'] ?? '')));
                    if ($v !== '') { in_array($v, self::INSP_GRADES, true) ? $ig = $v : $invalidMeta++; }
                }
                if (array_key_exists('refund_method', $it) || array_key_exists('refundMethod', $it)) {
                    $v = strtolower(trim((string)($it['refund_method'] ?? $it['refundMethod'] ?? '')));
                    if ($v !== '') { in_array($v, self::REFUND_METHODS, true) ? $rm = $v : $invalidMeta++; }
                }

                $chk->execute([$id, $tenant]);
                if ($chk->fetchColumn()) {
                    $upd->execute([$buyer,$channel,$type,$reason,$status,$amount,$now,$id,$tenant]);
                } else {
                    $ins->execute([$id,$tenant,$orderId,$buyer,$channel,$type,$reason,$status,$amount,$now,$now]);
                }
                if ($ig !== null || $rm !== null) { $metaUpd->execute([$ig, $rm, $now, $id, $tenant]); }
                $ingested++;
                // [227차 감사 P1] 반품 ordered_at 귀속 정합 — 원주문 월을 재롤업 대상으로 수집(cron 당월 한정 보완).
                try {
                    $po->execute([$tenant, $orderId, $orderId]);
                    $pm = (string)($po->fetchColumn() ?: '');
                    if (preg_match('/^\d{4}-\d{2}$/', $pm)) $affected[$pm] = true;
                } catch (\Throwable $e) {}
                // [현 차수 P1] 취소/반품 claim 등록 시 CRM LTV 역분개(자동 폴링/웹훅과 대칭) — 원주문 총액 기준.
                //   ingestClaims 는 event_type 을 바꾸지 않아 재고/claim 은 폴링이 담당 → 여기선 CRM 역분개만(재고 이중복원 방지).
                //   order_id 멱등이라 이후 채널 폴링 recordCrmRefund 와 중복돼도 이중역분개 없음.
                if (in_array($type, ['cancel', 'return'], true)) {
                    try {
                        $bo = $pdo->prepare("SELECT channel, buyer_email, buyer_name, total_price FROM channel_orders WHERE tenant_id=? AND (channel_order_id=? OR order_no=?) LIMIT 1");
                        $bo->execute([$tenant, $orderId, $orderId]);
                        $br = $bo->fetch(\PDO::FETCH_ASSOC);
                        if ($br) {
                            // [현 차수 P1] 부분클레임 과다역분개 수정 — 클레임 실환불액($amount)이 있으면 그 값(원주문 상한),
                            //   없을 때만 원주문 전액. 기존엔 항상 total_price 를 차감해 부분반품이 전액 LTV 차감→오염.
                            $orderTotal = (float)($br['total_price'] ?? 0);
                            $claimAmt   = (float)$amount;
                            $refundAmt  = $claimAmt > 0 ? ($orderTotal > 0 ? min($claimAmt, $orderTotal) : $claimAmt) : $orderTotal;
                            \Genie\Handlers\ChannelSync::crmRefundForOrder(
                                $pdo, $tenant, (string)($channel ?: ($br['channel'] ?? '')),
                                (string)($br['buyer_email'] ?? ''), (string)($br['buyer_name'] ?? ''),
                                $refundAmt, $orderId
                            );
                        }
                    } catch (\Throwable $e) {}
                }
            }
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
        // 영향받은 원주문 월 재롤업 — 늦은 반품이 판매월 정산(returnFee/net_payout)에 정확히 반영.
        foreach (array_keys($affected) as $pm) {
            try { self::rollupSettlementsCore($pdo, $tenant, $pm, null, $now); } catch (\Throwable $e) {}
        }
        // [289차 후속] invalid_meta — 화이트리스트 위반으로 무시된 검수등급/환불수단 셀 수.
        //   0 이 아니면 업로드 원본에 오타·비표준 값이 있다는 뜻이므로 호출측이 알아야 한다.
        return self::json($resp, ['ok' => true, 'ingested' => $ingested, 'skipped' => $skipped, 'invalid_meta' => $invalidMeta, 'rerolled' => array_keys($affected), '_env' => Db::envLabel(), '_isDemo' => $isDemo]);
    }

    public static function ingestSettlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $items = self::extractItems($req);
        $now = gmdate('Y-m-d H:i:s');
        $ingested = 0; $skipped = 0;
        try {
            foreach ($items as $it) {
                $period  = (string)($it['period'] ?? '');
                $channel = (string)($it['channel'] ?? '');
                if ($period === '' || $channel === '') { $skipped++; continue; }
                $ingested += self::upsertSettlement($pdo, $tenant, $period, $channel, [
                    'status'          => (string)($it['status'] ?? 'pending'),
                    'gross_sales'     => (float)($it['gross_sales'] ?? $it['grossSales'] ?? 0),
                    'net_payout'      => (float)($it['net_payout'] ?? $it['netPayout'] ?? 0),
                    'platform_fee'    => (float)($it['platform_fee'] ?? $it['platformFee'] ?? 0),
                    'ad_fee'          => (float)($it['ad_fee'] ?? $it['adFee'] ?? 0),
                    'coupon_discount' => (float)($it['coupon_discount'] ?? $it['couponDiscount'] ?? 0),
                    'return_fee'      => (float)($it['return_fee'] ?? $it['returnFee'] ?? 0),
                    'orders_count'    => (int)($it['orders_count'] ?? $it['orders'] ?? 0),
                    'returns_count'   => (int)($it['returns_count'] ?? $it['returns'] ?? 0),
                ], $now);
                // [현 차수 P1-2] 웹훅 — settlement.created(사용자/커넥터 HTTP 인제스트만, cron rollup 경로 제외 → 재발화 없음).
                if (!$isDemo) {
                    \Genie\Handlers\OpenPlatform::emit($tenant, 'settlement.created', [
                        'period' => $period, 'channel' => $channel,
                        'net_payout' => (float)($it['net_payout'] ?? $it['netPayout'] ?? 0),
                        'gross_sales' => (float)($it['gross_sales'] ?? $it['grossSales'] ?? 0),
                        'currency' => 'KRW', 'status' => (string)($it['status'] ?? 'pending'),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
        return self::json($resp, ['ok' => true, 'ingested' => $ingested, 'skipped' => $skipped, '_env' => Db::envLabel(), '_isDemo' => $isDemo]);
    }

    /**
     * [현 차수] 프로그래매틱 정산 적재(cron/ChannelSync 정산 자동풀 공용).
     *   실 채널 정산 데이터를 status='confirmed'(기본)로 적재 → rollupSettlementsCore 의 "추정 미덮어쓰기"
     *   보존 로직이 실 정산을 유지한다. ingestSettlements(HTTP)와 동일 필드 매핑.
     * @return int 적재 건수
     */
    public static function ingestSettlementRows(\PDO $pdo, string $tenant, array $rows, string $defaultStatus = 'confirmed'): int
    {
        self::ensureSettlementTables($pdo);
        $now = gmdate('Y-m-d H:i:s'); $n = 0;
        foreach ($rows as $it) {
            if (!is_array($it)) continue;
            $period  = (string)($it['period'] ?? '');
            $channel = (string)($it['channel'] ?? '');
            if ($period === '' || $channel === '') continue;
            $n += self::upsertSettlement($pdo, $tenant, $period, $channel, [
                'status'          => (string)($it['status'] ?? $defaultStatus),
                'gross_sales'     => (float)($it['gross_sales'] ?? $it['grossSales'] ?? 0),
                'net_payout'      => (float)($it['net_payout'] ?? $it['netPayout'] ?? 0),
                'platform_fee'    => (float)($it['platform_fee'] ?? $it['platformFee'] ?? 0),
                'ad_fee'          => (float)($it['ad_fee'] ?? $it['adFee'] ?? 0),
                'coupon_discount' => (float)($it['coupon_discount'] ?? $it['couponDiscount'] ?? 0),
                'return_fee'      => (float)($it['return_fee'] ?? $it['returnFee'] ?? 0),
                'orders_count'    => (int)($it['orders_count'] ?? $it['orders'] ?? 0),
                'returns_count'   => (int)($it['returns_count'] ?? $it['returns'] ?? 0),
            ], $now);
        }
        return $n;
    }

    /** channel_orders + orderhub_claims 집계로 정산 파생(plaform_fee 추정율 적용). */
    public static function rollupSettlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $q = $req->getQueryParams();
        $body = (array)($req->getParsedBody() ?? []);
        $period = (string)($q['period'] ?? $body['period'] ?? gmdate('Y-m'));
        if (!preg_match('/^\d{4}-\d{2}$/', $period)) $period = gmdate('Y-m');
        // [현 차수] fee_rate 명시 전달 시 전 채널 일괄 override, 미지정이면 null→채널별 실수수료 스케줄.
        $feeRate = (isset($q['fee_rate']) || isset($body['fee_rate'])) ? (float)($q['fee_rate'] ?? $body['fee_rate']) : null;
        $now = gmdate('Y-m-d H:i:s');

        try {
            $rolled = self::rollupSettlementsCore($pdo, $tenant, $period, $feeRate, $now);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
        return self::json($resp, ['ok' => true, 'period' => $period, 'fee_rate' => $feeRate ?? 'per-channel', 'rolled' => $rolled, '_env' => Db::envLabel(), '_isDemo' => $isDemo]);
    }

    /**
     * 208차 동기화 P0: 정산 롤업 코어(핸들러+cron 공용). channel_orders/orderhub_claims → orderhub_settlements 집계.
     * commerce_sync_cron 이 주문 폴링 후 자동 호출 → 운영 정산이 수동 호출 없이 자동 채워짐.
     * @return int rolled count
     */
    /** [현 차수] 채널별 판매 수수료율 — 프론트 channelRates.js(CHANNEL_RATES) 미러(SSOT 정합).
     *   과거 전 채널 단일 10% 하드코딩 → 채널별 실수수료로 정산 추정 정확도 향상. 미등록=10% 폴백. */
    public static function channelFeeRate(string $channel): float
    {
        static $rates = [
            'coupang'=>0.11,'naver'=>0.05,'naver_smartstore'=>0.05,'11st'=>0.12,'gmarket'=>0.12,
            'auction'=>0.12,'kakao_commerce'=>0.10,'cafe24'=>0.03,'wemakeprice'=>0.11,'interpark'=>0.09,
            'lotteon'=>0.10,'own_mall'=>0.00,
            'shopify'=>0.02,'amazon'=>0.15,'amazon_spapi'=>0.15,'ebay'=>0.13,'tiktok'=>0.08,'tiktok_shop'=>0.08,
            'rakuten'=>0.08,'yahoo_jp'=>0.06,'line'=>0.05,
            'lazada'=>0.04,'shopee'=>0.10,'qoo10'=>0.10,'zalando'=>0.20,'woocommerce'=>0.02,
        ];
        return $rates[strtolower(trim($channel))] ?? 0.10;
    }

    /** [현 차수] 보편 채널 동기화: 테넌트가 admin 에서 설정한 채널별 수수료(kr_fee_rule 최신 유효 규칙)를
     *  { channel_key(소문자) => rate(분수) } 맵으로 반환. 신규 채널도 admin 수수료 등록 시 정산 정확.
     *  kr_fee_rule 테이블 부재/오류 시 빈 맵(정적 스케줄 폴백). 단위=분수(gross*rate, KrChannel 정합). */
    private static function tenantFeeRates(\PDO $pdo, string $tenant): array
    {
        $map = [];
        try {
            $st = $pdo->prepare(
                "SELECT channel_key, platform_fee_rate FROM kr_fee_rule
                  WHERE tenant_id = ? AND id IN (
                    SELECT MAX(id) FROM kr_fee_rule WHERE tenant_id = ? GROUP BY channel_key
                  )"
            );
            $st->execute([$tenant, $tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $rate = (float)($r['platform_fee_rate'] ?? 0);
                $key  = strtolower(trim((string)($r['channel_key'] ?? '')));
                if ($key !== '' && $rate > 0) $map[$key] = $rate;
            }
        } catch (\Throwable $e) { /* 테이블 부재 등 → 정적 폴백 */ }
        return $map;
    }

    /**
     * @param ?float $feeRate null=채널별 스케줄 적용(권장, cron), 값 전달 시 전 채널 일괄 override(HTTP fee_rate).
     */
    public static function rollupSettlementsCore(\PDO $pdo, string $tenant, string $period, ?float $feeRate, string $now): int
    {
        self::ensureSettlementTables($pdo); // 208차: cron/신규 테넌트 대비 테이블 보장(없으면 생성, 있으면 no-op)
        // [현 차수] 감사 P0: 취소주문을 정산 gross/주문수에서 제외(ordersStats·Rollup 캐논과 정합).
        //   기존엔 취소 필터가 없어 정산 gross_sales/net_payout 가 취소율만큼 과대 → 대시보드 매출과 발산하고
        //   영업이익·순이익(pnlStats=정산우선)까지 오염됐다. 반품은 매출 포함 유지(claim returnFee 로 별도 차감).
        [$cancelExpr, $cancelTokens] = self::cancelExclusion();
        $os = $pdo->prepare("SELECT channel, COUNT(*) AS cnt, COALESCE(SUM(total_price),0) AS gross
            FROM channel_orders WHERE tenant_id=? AND SUBSTR(ordered_at,1,7)=? AND NOT $cancelExpr GROUP BY channel");
        $os->execute(array_merge([$tenant, $period], $cancelTokens));
        $orders = $os->fetchAll(\PDO::FETCH_ASSOC);
        // [227차] 채널별 쿠폰 할인액 집계(취소제외) — 기존 coupon_discount=0 하드코딩 대체.
        $couponBy = self::couponDiscountByChannel($pdo, $tenant, $period, $cancelExpr, $cancelTokens);

        // [227차 감사 P1] 반품 기간귀속 = 원주문 ordered_at 월(기존 created_at=반품접수월은 월경계 부정합:
        //   5월주문 6월반품이 6월정산에 잡혀 5월엔 미반영·6월엔 주문없는 반품 발생). 원주문 없으면 created_at 폴백.
        //   ★늦은 반품도 판매월에 포착되도록 ingestClaims 가 원주문 월을 재롤업 트리거(cron은 당월만 롤업이라).
        // [현 차수 감사 #2] returnFee 는 '반품(return)'만 차감. 취소(cancel)는 이미 gross 에서 제외되어
        //   매출 0 이므로, 취소 클레임까지 returnFee 로 빼면 이중차감(순이익 과소)이었다. 사용자 확정:
        //   취소는 매출 제외로만 처리(P&L 영향 0), 실제 취소수수료는 실 정산 ingest(status!='estimated')가 반영.
        //   → type IN('return','cancel') 을 type='return' 으로 좁혀 설계의도(주석 1080)와 정합. rcnt 도 반품수로 정확화.
        // [272차 D-P2] 반품 claim 이중계상·팬아웃 차단:
        //   ① 동일 반품이 두 경로(수동 ingestClaims=clm_{sha256} · 폴링 recordClaim=CLM-{ch}-{oid})로 서로 다른
        //      id 2행이 되면 COUNT/SUM 이 2배(returnFee·returns_count 이중계상). ② LEFT JOIN 이 주문당 다라인(SKU
        //      여러 행)일 때 claim 을 라인 수만큼 곱하는 팬아웃 위험. → (channel, order_id) 단위로 먼저 dedup(주문당
        //      1행, MAX amount)하고, ordered_at 은 상관 서브쿼리 LIMIT 1 로 해석(조인 팬아웃 제거). Rollup:266 팬아웃
        //      수정과 동일 패턴. SQLite/MySQL 공통 문법.
        $cs = $pdo->prepare("SELECT t.channel, COUNT(*) AS rcnt, COALESCE(SUM(t.amt),0) AS rfee FROM (
                SELECT c.channel AS channel, c.order_id AS oid, MAX(c.amount) AS amt,
                       MIN(COALESCE((SELECT o.ordered_at FROM channel_orders o
                                       WHERE o.tenant_id=c.tenant_id AND o.channel=c.channel
                                         AND (o.channel_order_id=c.order_id OR o.order_no=c.order_id) LIMIT 1),
                                    c.created_at)) AS oat
                  FROM orderhub_claims c
                 WHERE c.tenant_id=? AND c.type='return'
                 GROUP BY c.channel, c.order_id
            ) t
            WHERE SUBSTR(t.oat,1,7)=?
            GROUP BY t.channel");
        $cs->execute([$tenant, $period]);
        $claimsBy = [];
        foreach ($cs->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $claimsBy[(string)$r['channel']] = ['rcnt' => (int)$r['rcnt'], 'rfee' => (float)$r['rfee']];
        }

        $rolled = 0;
        // [현 차수] 보편 채널 동기화: 테넌트가 admin 에서 설정한 채널별 수수료(kr_fee_rule 최신 유효)를 우선 적용.
        //   신규 채널도 admin 이 수수료를 등록하면 정산이 정확히 반영(정적 맵 0.10 폴백 오계산 회피).
        $krFees = self::tenantFeeRates($pdo, $tenant);
        // [현 차수] 수동 ingest 된 실 정산은 추정으로 덮어쓰지 않도록 기존 status 사전조회.
        $exStmt = $pdo->prepare("SELECT status FROM orderhub_settlements WHERE tenant_id=? AND period=? AND channel=? LIMIT 1");
        foreach ($orders as $o) {
            $channel = (string)($o['channel'] ?? '');
            if ($channel === '') continue;
            // 실 정산(status!='estimated', 예: ingest 된 confirmed/pending)이 이미 있으면 추정 스킵(정합 보존).
            $exStmt->execute([$tenant, $period, $channel]);
            $exStatus = (string)($exStmt->fetchColumn() ?: '');
            if ($exStatus !== '' && $exStatus !== 'estimated') continue;
            $gross    = (float)$o['gross'];
            $cnt      = (int)$o['cnt'];
            // [현 차수] 수수료율 우선순위: ①HTTP 일괄 override ②테넌트 admin 설정(kr_fee_rule) ③채널별 정적 스케줄.
            $rate = ($feeRate !== null && $feeRate > 0)
                ? $feeRate
                : ($krFees[strtolower($channel)] ?? self::channelFeeRate($channel));
            $platform = round($gross * $rate, 2);
            $returnFee = $claimsBy[$channel]['rfee'] ?? 0.0;
            $returns   = $claimsBy[$channel]['rcnt'] ?? 0;
            $net = round($gross - $platform - $returnFee, 2);
            $rolled += self::upsertSettlement($pdo, $tenant, $period, $channel, [
                'status'          => 'estimated',
                'gross_sales'     => $gross,
                'net_payout'      => $net,
                'platform_fee'    => $platform,
                'ad_fee'          => 0.0,
                'coupon_discount' => round($couponBy[$channel] ?? 0.0, 2),
                'return_fee'      => $returnFee,
                'orders_count'    => $cnt,
                'returns_count'   => $returns,
            ], $now);
        }
        // [현 차수 P1] 전량취소 등으로 활성주문이 0이 된 채널의 estimated 정산행 zero-out.
        //   종전엔 활성주문 있는 채널만($os 결과) 순회 → 취소로 결과에서 사라진 채널의 estimated gross 가 잔존,
        //   settlementsStats/Pnl::components 가 취소매출을 revenue 로 영구 계상(영업·순이익 과대)했다.
        //   실 정산(status!='estimated', ingest 된 confirmed/pending)은 보존 — estimated 행만 0 처리.
        try {
            $activeChannels = array_values(array_filter(
                array_map(static fn($o) => (string)($o['channel'] ?? ''), $orders),
                static fn($c) => $c !== ''
            ));
            if ($activeChannels) {
                $ph  = implode(',', array_fill(0, count($activeChannels), '?'));
                $pdo->prepare("UPDATE orderhub_settlements SET gross_sales=0,net_payout=0,platform_fee=0,ad_fee=0,coupon_discount=0,return_fee=0,orders_count=0,returns_count=0,updated_at=? WHERE tenant_id=? AND period=? AND status='estimated' AND channel NOT IN ($ph)")
                    ->execute(array_merge([$now, $tenant, $period], $activeChannels));
            } else {
                // 이 기간 활성주문 전무 → 모든 estimated 행 0 처리(실 정산은 미포함).
                $pdo->prepare("UPDATE orderhub_settlements SET gross_sales=0,net_payout=0,platform_fee=0,ad_fee=0,coupon_discount=0,return_fee=0,orders_count=0,returns_count=0,updated_at=? WHERE tenant_id=? AND period=? AND status='estimated'")
                    ->execute([$now, $tenant, $period]);
            }
        } catch (\Throwable $e) { /* best-effort — zero-out 실패가 롤업을 막지 않음 */ }
        return $rolled;
    }

    /** 208차: orderhub_settlements/claims 테이블 보장(cron 견고성). 이미 있으면 no-op. */
    private static function ensureSettlementTables(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (id VARCHAR(190) PRIMARY KEY, tenant_id VARCHAR(190), period VARCHAR(20), channel VARCHAR(190), status VARCHAR(50), gross_sales DOUBLE DEFAULT 0, net_payout DOUBLE DEFAULT 0, platform_fee DOUBLE DEFAULT 0, ad_fee DOUBLE DEFAULT 0, coupon_discount DOUBLE DEFAULT 0, return_fee DOUBLE DEFAULT 0, orders_count INT DEFAULT 0, returns_count INT DEFAULT 0, created_at VARCHAR(40), updated_at VARCHAR(40), KEY idx_stl (tenant_id, period, channel)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                // [289차 후속] insp_grade/refund_method 는 신규 설치용 DDL 에 포함. 기존 테이블은
                //   ensureClaimColumns() 가 멱등 ALTER 로 보강한다(양 경로 필요).
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (id VARCHAR(190) PRIMARY KEY, tenant_id VARCHAR(190), order_id VARCHAR(190), buyer VARCHAR(190), channel VARCHAR(190), type VARCHAR(50), reason TEXT, status VARCHAR(50), amount DOUBLE DEFAULT 0, insp_grade VARCHAR(4), refund_method VARCHAR(16), created_at VARCHAR(40), updated_at VARCHAR(40), KEY idx_clm (tenant_id, created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (id TEXT PRIMARY KEY, tenant_id TEXT, period TEXT, channel TEXT, status TEXT, gross_sales REAL DEFAULT 0, net_payout REAL DEFAULT 0, platform_fee REAL DEFAULT 0, ad_fee REAL DEFAULT 0, coupon_discount REAL DEFAULT 0, return_fee REAL DEFAULT 0, orders_count INTEGER DEFAULT 0, returns_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (id TEXT PRIMARY KEY, tenant_id TEXT, order_id TEXT, buyer TEXT, channel TEXT, type TEXT, reason TEXT, status TEXT, amount REAL DEFAULT 0, insp_grade TEXT, refund_method TEXT, created_at TEXT, updated_at TEXT)");
            }
        } catch (\Throwable $e) {}
    }

    /** period+channel 유니크 기준 포터블 업서트(MySQL/SQLite 공용). @return int 1 */
    private static function upsertSettlement(\PDO $pdo, string $tenant, string $period, string $channel, array $v, string $now): int
    {
        $sel = $pdo->prepare("SELECT id FROM orderhub_settlements WHERE tenant_id=? AND period=? AND channel=? LIMIT 1");
        $sel->execute([$tenant, $period, $channel]);
        $id = $sel->fetchColumn();
        if ($id !== false && $id !== null) {
            $pdo->prepare("UPDATE orderhub_settlements SET status=?,gross_sales=?,net_payout=?,platform_fee=?,ad_fee=?,coupon_discount=?,return_fee=?,orders_count=?,returns_count=?,updated_at=? WHERE id=?")
                ->execute([$v['status'],$v['gross_sales'],$v['net_payout'],$v['platform_fee'],$v['ad_fee'],$v['coupon_discount'],$v['return_fee'],$v['orders_count'],$v['returns_count'],$now,$id]);
        } else {
            $newId = self::genId('stl', $tenant);
            $pdo->prepare("INSERT INTO orderhub_settlements (id,tenant_id,period,channel,status,gross_sales,net_payout,platform_fee,ad_fee,coupon_discount,return_fee,orders_count,returns_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$newId,$tenant,$period,$channel,$v['status'],$v['gross_sales'],$v['net_payout'],$v['platform_fee'],$v['ad_fee'],$v['coupon_discount'],$v['return_fee'],$v['orders_count'],$v['returns_count'],$now,$now]);
        }
        return 1;
    }
}
