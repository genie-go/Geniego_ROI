<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\TemplateResponder;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * V422 — Trends & AI Insight endpoints
 * Removed mock data for production. Returns 0/empty arrays.
 */
final class Trends {

    private static function weeks(int $n): array {
        $result = [];
        $now = time();
        for ($i = $n - 1; $i >= 0; $i--) {
            $ts = $now - $i * 7 * 86400;
            $result[] = gmdate('Y-m-d', $ts);
        }
        return $result;
    }

    private static function zeros(int $n): array {
        return array_fill(0, $n, 0);
    }

    /**
     * GET /v422/trends/pnl?weeks=8
     */
    public static function pnl(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $n = max(4, min(52, (int)($q['weeks'] ?? 8)));
        $dates = self::weeks($n);

        $revenue   = self::zeros($n);
        $adSpend   = self::zeros($n);
        $fees      = self::zeros($n);
        $infCost   = self::zeros($n);

        $rows = [];
        foreach ($dates as $i => $d) {
            $net = $revenue[$i] - $adSpend[$i] - $fees[$i] - $infCost[$i];
            $rows[] = [
                'week'      => $d,
                'revenue'   => $revenue[$i],
                'ad_spend'  => $adSpend[$i],
                'fees'      => $fees[$i],
                'inf_cost'  => $infCost[$i],
                'net_profit'=> round($net, 0),
                'margin_pct'=> $revenue[$i] > 0 ? round($net / $revenue[$i] * 100, 1) : 0,
            ];
        }

        return TemplateResponder::json($res, [
            'ok'      => true,
            'version' => 'v422',
            'metric'  => 'pnl',
            'weeks'   => $rows,
        ]);
    }

    /**
     * GET /v422/trends/roas?weeks=8
     */
    public static function roas(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $n = max(4, min(52, (int)($q['weeks'] ?? 8)));
        $dates = self::weeks($n);

        $channels = [];
        $rows = [];
        foreach ($dates as $i => $d) {
            $row = ['week' => $d];
            $rows[] = $row;
        }

        return TemplateResponder::json($res, [
            'ok'       => true,
            'version'  => 'v422',
            'metric'   => 'roas',
            'channels' => array_keys($channels),
            'weeks'    => $rows,
        ]);
    }

    /**
     * GET /v422/trends/returns?weeks=8
     */
    public static function returnRates(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $n = max(4, min(52, (int)($q['weeks'] ?? 8)));
        $dates = self::weeks($n);

        $skus = [];
        $rows = [];
        foreach ($dates as $i => $d) {
            $row = ['week' => $d];
            $rows[] = $row;
        }

        return TemplateResponder::json($res, [
            'ok'     => true,
            'version'=> 'v422',
            'metric' => 'returns',
            'skus'   => array_keys($skus),
            'weeks'  => $rows,
        ]);
    }

    /**
     * POST /v422/ai/insight
     */
    public static function aiInsight(Request $req, Response $res, array $args = []): Response {
        $raw  = (string)$req->getBody();
        $data = json_decode($raw, true) ?: [];
        $ctx  = trim($data['context'] ?? 'pnl');
        $question = trim($data['question'] ?? '');

        // Replaced mock insights with empty structures
        $resp = [
            'summary' => '',
            'bullets' => [],
            'recommendation' => '',
        ];

        if ($question !== '') {
            $resp['question'] = $question;
            $resp['answer'] = "";
        }

        return TemplateResponder::json($res, [
            'ok'      => true,
            'version' => 'v422',
            'context' => $ctx,
            'insight' => $resp,
            'model'   => 'prod-v1',
            'generated_at' => gmdate('c'),
        ]);
    }
}
