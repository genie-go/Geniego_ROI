<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v419 Korean Domestic Channel Handler
 *
 * Supported channels:
 *   coupang | naver | 11st | gmarket | auction | kakaogift | lotteon | wemef | tmon
 *
 * Canonical settlement fields per line:
 *   gross_sales, platform_fee, ad_fee, shipping_fee, return_fee,
 *   vat, coupon_discount, point_discount, other_deductions, net_payout
 *
 * Endpoints:
 *   GET  /v419/kr/channels                      — 채널 목록
 *   GET  /v419/kr/channels/{key}                — 채널 상세 + 수수료 스키마
 *   POST /v419/kr/fee-rules                     — 수수료 규칙 등록
 *   GET  /v419/kr/fee-rules/{key}               — 채널 수수료 규칙 조회
 *   POST /v419/kr/settle/ingest                 — 정산 라인 적재 (표준 포맷)
 *   POST /v419/kr/settle/ingest-raw/{key}       — 채널별 원본 CSV형 JSON 파싱 후 적재
 *   GET  /v419/kr/settle/lines                  — 정산 라인 조회
 *   GET  /v419/kr/settle/summary                — 기간별 채널 집계
 *   POST /v419/kr/recon/run                     — 정산 대사 실행
 *   GET  /v419/kr/recon/reports                 — 대사 리포트 목록
 *   GET  /v419/kr/recon/reports/{id}            — 대사 리포트 상세
 *   PATCH /v419/kr/recon/tickets/{id}           — 대사 티켓 상태 변경
 */
final class KrChannel {

    private static function tenant(Request $request): string {
        $t = $request->getHeaderLine('X-Tenant-Id');
        return $t !== '' ? $t : 'demo';
    }

    // ─── Channel Registry ─────────────────────────────────────────────────────

    public static function listChannels(Request $request, Response $response, array $args): Response {
        $pdo  = Db::pdo();
        $stmt = $pdo->query('SELECT * FROM kr_channel ORDER BY channel_key');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['fee_schema'] = $r['fee_schema_json'] ? json_decode((string)$r['fee_schema_json'], true) : null;
            unset($r['fee_schema_json']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'channels' => $rows]);
    }

    public static function getChannel(Request $request, Response $response, array $args): Response {
        $pdo  = Db::pdo();
        $key  = (string)($args['key'] ?? '');
        $tenant = self::tenant($request);

        $stmt = $pdo->prepare('SELECT * FROM kr_channel WHERE channel_key=?');
        $stmt->execute([$key]);
        $ch = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$ch) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'channel not found: '.$key]);
        }
        $ch['fee_schema'] = $ch['fee_schema_json'] ? json_decode((string)$ch['fee_schema_json'], true) : null;
        unset($ch['fee_schema_json']);

        // Attach fee rules for this tenant
        $fr = $pdo->prepare('SELECT * FROM kr_fee_rule WHERE tenant_id=? AND channel_key=? ORDER BY category,effective_from DESC');
        $fr->execute([$tenant, $key]);
        $ch['fee_rules'] = $fr->fetchAll(PDO::FETCH_ASSOC);

        return TemplateResponder::respond($response, ['ok' => true, 'channel' => $ch]);
    }

    // ─── Fee Rules ────────────────────────────────────────────────────────────

    public static function upsertFeeRule(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $key      = trim((string)($body['channel_key'] ?? ''));
        $category = trim((string)($body['category']    ?? '*'));
        if ($key === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel_key required']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO kr_fee_rule
             (tenant_id,channel_key,category,platform_fee_rate,ad_fee_rate,shipping_standard,
              return_fee_standard,vat_rate,note,effective_from,created_at)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $tenant, $key, $category,
            (float)($body['platform_fee_rate']    ?? 0),
            (float)($body['ad_fee_rate']           ?? 0),
            (float)($body['shipping_standard']     ?? 0),
            (float)($body['return_fee_standard']   ?? 0),
            (float)($body['vat_rate']              ?? 0.10),
            $body['note']           ?? null,
            $body['effective_from'] ?? date('Y-m-d'),
            gmdate('c'),
        ]);
        return TemplateResponder::respond($response, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function listFeeRules(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $key    = (string)($args['key'] ?? '');

        $stmt = $pdo->prepare('SELECT * FROM kr_fee_rule WHERE tenant_id=? AND channel_key=? ORDER BY effective_from DESC, id DESC');
        $stmt->execute([$tenant, $key]);
        return TemplateResponder::respond($response, ['ok' => true, 'rules' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // ─── Settlement Ingestion ─────────────────────────────────────────────────

    /**
     * POST /v419/kr/settle/ingest
     * Body: { channel_key, lines: [ {...canonical fields...} ] }
     * Canonical line fields:
     *   order_id, period_start, period_end, sku, product_name, qty, sell_price,
     *   gross_sales, platform_fee, ad_fee, shipping_fee, return_fee, vat,
     *   coupon_discount, point_discount, other_deductions, net_payout, currency, status
     */
    public static function ingestLines(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $key   = trim((string)($body['channel_key'] ?? ''));
        $lines = (array)($body['lines'] ?? []);

        if ($key === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel_key required']);
        }
        if (empty($lines)) {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'lines array required']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO kr_settlement_line
             (tenant_id,channel_key,settlement_id,period_start,period_end,order_id,product_id,
              sku,product_name,qty,sell_price,gross_sales,platform_fee,ad_fee,shipping_fee,
              return_fee,vat,coupon_discount,point_discount,other_deductions,net_payout,
              currency,status,raw_json,ingested_at)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );

        $now  = gmdate('c');
        $count = 0;
        foreach ($lines as $line) {
            $l = (array)$line;
            $stmt->execute([
                $tenant, $key,
                $l['settlement_id']    ?? null,
                $l['period_start']     ?? $now,
                $l['period_end']       ?? $now,
                $l['order_id']         ?? null,
                $l['product_id']       ?? null,
                $l['sku']              ?? null,
                $l['product_name']     ?? null,
                (int)  ($l['qty']              ?? 1),
                (float)($l['sell_price']       ?? 0),
                (float)($l['gross_sales']      ?? 0),
                (float)($l['platform_fee']     ?? 0),
                (float)($l['ad_fee']           ?? 0),
                (float)($l['shipping_fee']     ?? 0),
                (float)($l['return_fee']       ?? 0),
                (float)($l['vat']              ?? 0),
                (float)($l['coupon_discount']  ?? 0),
                (float)($l['point_discount']   ?? 0),
                (float)($l['other_deductions'] ?? 0),
                (float)($l['net_payout']       ?? 0),
                $l['currency'] ?? 'KRW',
                $l['status']   ?? 'settled',
                json_encode($l, JSON_UNESCAPED_UNICODE),
                $now,
            ]);
            $count++;
        }

        return TemplateResponder::respond($response, ['ok' => true, 'inserted' => $count, 'channel_key' => $key]);
    }

    /**
     * POST /v419/kr/settle/ingest-raw/{key}
     * Accepts channel-specific raw field names and normalizes to canonical schema.
     *
     * Field map per channel (handles Korean column name aliases):
     *   coupang:   정산금액=net_payout,  수수료=platform_fee, 쿠폰할인=coupon_discount
     *   naver:     정산가능금액=net_payout, 판매자부담할인=coupon_discount
     *   11st:      확정판매가=gross_sales, 수수료=platform_fee
     *   gmarket:   청구금액=net_payout,   판매수수료=platform_fee
     *   common fallback: any numeric field mapping attempt
     */
    public static function ingestRaw(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $key    = (string)($args['key'] ?? '');
        $body   = (array)($request->getParsedBody() ?? []);
        $rows   = (array)($body['rows'] ?? []);

        if (empty($rows)) {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'rows required']);
        }

        // Channel-specific field alias maps
        $maps = [
            'coupang' => [
                '주문번호'=>'order_id','정산기간시작'=>'period_start','정산기간종료'=>'period_end',
                '판매가'=>'sell_price','수량'=>'qty','판매금액'=>'gross_sales',
                '쿠팡수수료'=>'platform_fee','광고비'=>'ad_fee','배송비'=>'shipping_fee',
                '반품비'=>'return_fee','부가세'=>'vat','쿠폰할인'=>'coupon_discount',
                '포인트할인'=>'point_discount','기타차감'=>'other_deductions','정산금액'=>'net_payout',
                '상품번호'=>'product_id','상품명'=>'product_name','옵션코드'=>'sku',
            ],
            'naver' => [
                '주문번호'=>'order_id','정산시작일'=>'period_start','정산종료일'=>'period_end',
                '판매가'=>'sell_price','수량'=>'qty','주문금액'=>'gross_sales',
                '네이버수수료'=>'platform_fee','광고비'=>'ad_fee','배송비'=>'shipping_fee',
                '반품배송비'=>'return_fee','부가가치세'=>'vat',
                '판매자부담할인금액'=>'coupon_discount','포인트사용액'=>'point_discount',
                '기타공제'=>'other_deductions','정산가능금액'=>'net_payout',
                '상품관리코드'=>'sku','상품명'=>'product_name',
            ],
            '11st' => [
                '주문번호'=>'order_id','정산일자'=>'period_start',
                '확정판매가'=>'gross_sales','수량'=>'qty',
                '수수료'=>'platform_fee','배송비'=>'shipping_fee',
                '쿠폰할인액'=>'coupon_discount','포인트'=>'point_discount',
                '부가세'=>'vat','반품차감'=>'return_fee','정산금액'=>'net_payout',
                '상품코드'=>'sku','상품명'=>'product_name',
            ],
            'gmarket' => [
                '주문번호'=>'order_id','정산기간'=>'period_start',
                '판매금액'=>'gross_sales','수량'=>'qty',
                '판매수수료'=>'platform_fee','배송비'=>'shipping_fee',
                '할인쿠폰'=>'coupon_discount','부가세'=>'vat','반품비'=>'return_fee',
                '청구금액'=>'net_payout','상품코드'=>'sku','상품명'=>'product_name',
            ],
            'auction' => [
                '주문번호'=>'order_id','정산기간'=>'period_start',
                '판매금액'=>'gross_sales','수량'=>'qty',
                '판매수수료'=>'platform_fee','배송비'=>'shipping_fee',
                '할인쿠폰'=>'coupon_discount','부가세'=>'vat','반품비'=>'return_fee',
                '청구금액'=>'net_payout','상품코드'=>'sku','상품명'=>'product_name',
            ],
        ];

        $aliasMap = $maps[$key] ?? [];

        $normalized = [];
        foreach ($rows as $row) {
            $row = (array)$row;
            $n   = [];
            foreach ($row as $col => $val) {
                $canonical = $aliasMap[$col] ?? $col;
                $n[$canonical] = $val;
            }
            // Ensure period fields default to today
            if (!isset($n['period_start'])) $n['period_start'] = date('Y-m-01');
            if (!isset($n['period_end']))   $n['period_end']   = date('Y-m-t');
            $normalized[] = $n;
        }

        // Reuse ingestLines logic
        $fakeBody = ['channel_key' => $key, 'lines' => $normalized];
        $fakeRequest = $request->withParsedBody($fakeBody);
        return self::ingestLines($fakeRequest, $response, $args);
    }

    // ─── Settlement Query ─────────────────────────────────────────────────────

    public static function listLines(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $q      = $request->getQueryParams();
        $key    = trim((string)($q['channel_key'] ?? ''));
        $since  = $q['since'] ?? date('Y-m-01');
        $until  = $q['until'] ?? date('Y-m-t');
        $limit  = max(1, min(1000, (int)($q['limit'] ?? 200)));

        if ($key !== '') {
            $stmt = $pdo->prepare(
                'SELECT * FROM kr_settlement_line WHERE tenant_id=? AND channel_key=?
                 AND DATE(period_start)>=? AND DATE(period_end)<=?
                 ORDER BY ingested_at DESC LIMIT ?'
            );
            $stmt->execute([$tenant, $key, $since, $until, $limit]);
        } else {
            $stmt = $pdo->prepare(
                'SELECT * FROM kr_settlement_line WHERE tenant_id=?
                 AND DATE(period_start)>=? AND DATE(period_end)<=?
                 ORDER BY channel_key, ingested_at DESC LIMIT ?'
            );
            $stmt->execute([$tenant, $since, $until, $limit]);
        }
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['raw'] = $r['raw_json'] ? json_decode((string)$r['raw_json'], true) : null;
            unset($r['raw_json']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'total' => count($rows), 'lines' => $rows]);
    }

    public static function summary(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $q      = $request->getQueryParams();
        $since  = $q['since'] ?? date('Y-m-01');
        $until  = $q['until'] ?? date('Y-m-t');

        $stmt = $pdo->prepare(
            'SELECT
                s.channel_key,
                c.display_name,
                COUNT(*) AS lines,
                SUM(s.gross_sales) AS gross_sales,
                SUM(s.platform_fee) AS platform_fee,
                SUM(s.ad_fee) AS ad_fee,
                SUM(s.shipping_fee) AS shipping_fee,
                SUM(s.return_fee) AS return_fee,
                SUM(s.vat) AS vat,
                SUM(s.coupon_discount) AS coupon_discount,
                SUM(s.point_discount) AS point_discount,
                SUM(s.other_deductions) AS other_deductions,
                SUM(s.net_payout) AS net_payout,
                ROUND(SUM(s.platform_fee)/NULLIF(SUM(s.gross_sales),0)*100,2) AS effective_fee_rate_pct
             FROM kr_settlement_line s
             LEFT JOIN kr_channel c ON c.channel_key=s.channel_key
             WHERE s.tenant_id=?
               AND DATE(s.period_start)>=?
               AND DATE(s.period_end)<=?
             GROUP BY s.channel_key
             ORDER BY net_payout DESC'
        );
        $stmt->execute([$tenant, $since, $until]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Total row
        $totals = ['gross_sales'=>0,'platform_fee'=>0,'ad_fee'=>0,'shipping_fee'=>0,
                   'return_fee'=>0,'vat'=>0,'coupon_discount'=>0,'point_discount'=>0,
                   'other_deductions'=>0,'net_payout'=>0];
        foreach ($rows as $r) {
            foreach (array_keys($totals) as $k) {
                $totals[$k] += (float)($r[$k] ?? 0);
            }
        }

        return TemplateResponder::respond($response, [
            'ok'       => true,
            'since'    => $since,
            'until'    => $until,
            'channels' => $rows,
            'totals'   => array_map(fn($v) => round($v, 0), $totals),
        ]);
    }

    // ─── Reconciliation ───────────────────────────────────────────────────────

    /**
     * POST /v419/kr/recon/run
     * Runs reconciliation between kr_settlement_line and itself,
     * computing variance and generating tickets.
     *
     * Body: { channel_key, period_start, period_end }
     */
    public static function runRecon(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $key    = trim((string)($body['channel_key'] ?? ''));
        $since  = $body['period_start'] ?? date('Y-m-01');
        $until  = $body['period_end']   ?? date('Y-m-t');

        if ($key === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel_key required']);
        }

        // Fetch lines for the period
        $stmt = $pdo->prepare(
            'SELECT order_id, gross_sales, platform_fee, ad_fee, shipping_fee, return_fee,
                    vat, coupon_discount, point_discount, other_deductions, net_payout, status
             FROM kr_settlement_line
             WHERE tenant_id=? AND channel_key=?
               AND DATE(period_start)>=? AND DATE(period_end)<=?'
        );
        $stmt->execute([$tenant, $key, $since, $until]);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $total      = count($lines);
        $matched    = 0;
        $mismatch   = 0;
        $grossDiff  = 0.0;
        $feeDiff    = 0.0;
        $netDiff    = 0.0;
        $tickets    = [];
        $now        = gmdate('c');

        // Get fee rule for this channel/tenant (latest effective)
        $fr = $pdo->prepare('SELECT * FROM kr_fee_rule WHERE tenant_id=? AND channel_key=? ORDER BY effective_from DESC, id DESC LIMIT 1');
        $fr->execute([$tenant, $key]);
        $rule = $fr->fetch(PDO::FETCH_ASSOC);
        $feeRate = $rule ? (float)$rule['platform_fee_rate'] : 0.0;

        foreach ($lines as $line) {
            $gross   = (float)$line['gross_sales'];
            $pFee    = (float)$line['platform_fee'];
            $net     = (float)$line['net_payout'];

            // Expected fee based on registered rule
            $expectedFee = $feeRate > 0 ? round($gross * $feeRate, 0) : $pFee;
            $feeVariance = abs($pFee - $expectedFee);
            $netExpected = $gross - $expectedFee - (float)$line['ad_fee'] - (float)$line['shipping_fee']
                           + (float)$line['return_fee'] * -1
                           - (float)$line['vat'] - (float)$line['coupon_discount'] - (float)$line['point_discount']
                           - (float)$line['other_deductions'];
            $netVariance = abs($net - $netExpected);

            if ($feeVariance < 1.0 && $netVariance < 1.0) {
                $matched++;
            } else {
                $mismatch++;
                $grossDiff += 0;
                $feeDiff   += $feeVariance;
                $netDiff   += $netVariance;

                if ($netVariance >= 100 || $feeVariance >= 50) {
                    $tickets[] = [
                        'order_id'    => $line['order_id'],
                        'channel_key' => $key,
                        'category'    => $feeVariance >= 50 ? 'fee_mismatch' : 'net_mismatch',
                        'severity'    => $netVariance >= 10000 ? 'high' : ($netVariance >= 1000 ? 'medium' : 'low'),
                        'gross_diff'  => 0,
                        'fee_diff'    => round($feeVariance, 0),
                        'net_diff'    => round($netVariance, 0),
                        'title'       => sprintf(
                            '[%s] %s 수수료차이 ₩%s / 정산차이 ₩%s',
                            $key, $line['order_id'] ?? '?', number_format($feeVariance), number_format($netVariance)
                        ),
                    ];
                }
            }
        }

        // Create report
        $rStmt = $pdo->prepare(
            'INSERT INTO kr_recon_report
             (tenant_id,channel_key,period_start,period_end,status,total_orders,matched,mismatch,
              missing_settlement,missing_order,gross_diff,fee_diff,net_diff,summary_json,created_at)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $rStmt->execute([
            $tenant, $key, $since, $until, 'draft', $total, $matched, $mismatch,
            0, 0,
            round($grossDiff, 0), round($feeDiff, 0), round($netDiff, 0),
            json_encode(['fee_rate_used' => $feeRate], JSON_UNESCAPED_UNICODE),
            $now,
        ]);
        $reportId = (int)$pdo->lastInsertId();

        // Insert tickets
        $tStmt = $pdo->prepare(
            'INSERT INTO kr_recon_ticket
             (tenant_id,report_id,order_id,channel_key,category,severity,status,gross_diff,fee_diff,net_diff,title,created_at)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        foreach ($tickets as $t) {
            $tStmt->execute([
                $tenant, $reportId, $t['order_id'], $t['channel_key'],
                $t['category'], $t['severity'], 'open',
                $t['gross_diff'], $t['fee_diff'], $t['net_diff'],
                $t['title'], $now,
            ]);
        }

        return TemplateResponder::respond($response, [
            'ok'        => true,
            'report_id' => $reportId,
            'channel_key' => $key,
            'period_start' => $since,
            'period_end'   => $until,
            'total_orders' => $total,
            'matched'      => $matched,
            'mismatch'     => $mismatch,
            'fee_diff_krw' => round($feeDiff, 0),
            'net_diff_krw' => round($netDiff, 0),
            'tickets_created' => count($tickets),
        ]);
    }

    public static function listReports(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenant($request);
        $q      = $request->getQueryParams();
        $key    = trim((string)($q['channel_key'] ?? ''));

        if ($key !== '') {
            $stmt = $pdo->prepare('SELECT * FROM kr_recon_report WHERE tenant_id=? AND channel_key=? ORDER BY id DESC LIMIT 100');
            $stmt->execute([$tenant, $key]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM kr_recon_report WHERE tenant_id=? ORDER BY id DESC LIMIT 100');
            $stmt->execute([$tenant]);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'reports' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public static function getReport(Request $request, Response $response, array $args): Response {
        $pdo      = Db::pdo();
        $tenant   = self::tenant($request);
        $reportId = (int)($args['id'] ?? 0);

        $stmt = $pdo->prepare('SELECT * FROM kr_recon_report WHERE id=? AND tenant_id=?');
        $stmt->execute([$reportId, $tenant]);
        $report = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$report) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'report not found']);
        }
        $report['summary'] = $report['summary_json'] ? json_decode((string)$report['summary_json'], true) : null;
        unset($report['summary_json']);

        $tStmt = $pdo->prepare('SELECT * FROM kr_recon_ticket WHERE report_id=? AND tenant_id=? ORDER BY severity DESC, id DESC');
        $tStmt->execute([$reportId, $tenant]);
        $report['tickets'] = $tStmt->fetchAll(PDO::FETCH_ASSOC);

        return TemplateResponder::respond($response, ['ok' => true, 'report' => $report]);
    }

    public static function patchTicket(Request $request, Response $response, array $args): Response {
        $pdo      = Db::pdo();
        $tenant   = self::tenant($request);
        $ticketId = (int)($args['id'] ?? 0);
        $body     = (array)($request->getParsedBody() ?? []);

        $status = trim((string)($body['status'] ?? ''));
        $note   = trim((string)($body['note']   ?? ''));

        $allowed = ['open', 'investigating', 'resolved', 'waived'];
        if ($status !== '' && !in_array($status, $allowed, true)) {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'invalid status']);
        }

        if ($status !== '') {
            $pdo->prepare('UPDATE kr_recon_ticket SET status=? WHERE id=? AND tenant_id=?')
                ->execute([$status, $ticketId, $tenant]);
        }
        if ($note !== '') {
            $pdo->prepare('UPDATE kr_recon_ticket SET note=? WHERE id=? AND tenant_id=?')
                ->execute([$note, $ticketId, $tenant]);
        }

        $stmt = $pdo->prepare('SELECT * FROM kr_recon_ticket WHERE id=? AND tenant_id=?');
        $stmt->execute([$ticketId, $tenant]);
        return TemplateResponder::respond($response, ['ok' => true, 'ticket' => $stmt->fetch(PDO::FETCH_ASSOC)]);
    }
}
