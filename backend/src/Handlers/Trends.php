<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\TemplateResponder;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * V422 — Trends & AI Insight endpoints
 * All data is mock/seeded for demo purposes.
 */
final class Trends {

    private static function weeks(int $n): array {
        $result = [];
        $now = strtotime('2026-03-04');
        for ($i = $n - 1; $i >= 0; $i--) {
            $ts = $now - $i * 7 * 86400;
            $result[] = gmdate('Y-m-d', $ts);
        }
        return $result;
    }

    private static function seed(int $base, float $noise, int $n): array {
        $vals = [];
        $cur = $base;
        for ($i = 0; $i < $n; $i++) {
            $cur += ($noise * (mt_rand(-100, 100) / 100));
            $vals[] = round($cur, 2);
        }
        return $vals;
    }

    /**
     * GET /v422/trends/pnl?weeks=8
     * Weekly P&L time-series (mock)
     */
    public static function pnl(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $n = max(4, min(52, (int)($q['weeks'] ?? 8)));
        $dates = self::weeks($n);

        $revenue   = self::seed(185000000, 12000000, $n);
        $adSpend   = self::seed(55000000,  4000000,  $n);
        $fees      = self::seed(22000000,  2000000,  $n);
        $infCost   = self::seed(18000000,  1500000,  $n);

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
     * Channel-level ROAS time-series (mock)
     */
    public static function roas(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $n = max(4, min(52, (int)($q['weeks'] ?? 8)));
        $dates = self::weeks($n);

        $channels = [
            'Meta'    => ['base' => 4.2,  'noise' => 0.5],
            'Google'  => ['base' => 6.8,  'noise' => 0.4],
            'TikTok'  => ['base' => 2.1,  'noise' => 0.6],
            'Naver'   => ['base' => 7.1,  'noise' => 0.3],
            'Coupang' => ['base' => 1.7,  'noise' => 0.4],
        ];

        $series = [];
        foreach ($channels as $ch => $cfg) {
            $vals = [];
            $cur = $cfg['base'];
            for ($i = 0; $i < $n; $i++) {
                $cur = round($cur + $cfg['noise'] * (mt_rand(-100, 100) / 100), 2);
                $cur = max(0.5, $cur);
                $vals[] = $cur;
            }
            $series[$ch] = $vals;
        }

        $rows = [];
        foreach ($dates as $i => $d) {
            $row = ['week' => $d];
            foreach ($series as $ch => $vals) {
                $row[$ch] = $vals[$i];
            }
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
     * SKU return-rate time-series (mock)
     */
    public static function returnRates(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $n = max(4, min(52, (int)($q['weeks'] ?? 8)));
        $dates = self::weeks($n);

        $skus = [
            'SKU-A1' => ['base' => 4.1, 'noise' => 0.6],
            'SKU-B2' => ['base' => 12.1, 'noise' => 1.2],
            'SKU-C3' => ['base' => 19.8, 'noise' => 1.8],
            'SKU-D4' => ['base' => 20.2, 'noise' => 2.0],
        ];

        $series = [];
        foreach ($skus as $sku => $cfg) {
            $vals = [];
            $cur = $cfg['base'];
            for ($i = 0; $i < $n; $i++) {
                $cur = round($cur + $cfg['noise'] * (mt_rand(-100, 100) / 100), 1);
                $cur = max(0.5, min(40.0, $cur));
                $vals[] = $cur;
            }
            $series[$sku] = $vals;
        }

        $rows = [];
        foreach ($dates as $i => $d) {
            $row = ['week' => $d];
            foreach ($series as $sku => $vals) {
                $row[$sku] = $vals[$i];
            }
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
     * AI insight generation (mock LLM response)
     * Body: { "context": "pnl" | "roas" | "returns" | "custom", "question": "..." }
     */
    public static function aiInsight(Request $req, Response $res, array $args = []): Response {
        $raw  = (string)$req->getBody();
        $data = json_decode($raw, true) ?: [];
        $ctx  = trim($data['context'] ?? 'pnl');
        $question = trim($data['question'] ?? '');

        // Mock AI responses keyed by context
        $insights = [
            'pnl' => [
                'summary' => '지난 8주간 Net Profit 마진이 평균 28.4%를 기록하고 있으나, 2주 연속 하락세입니다.',
                'bullets' => [
                    '광고비 비중이 전체 매출의 30%를 초과 — 입찰 전략 검토 권장',
                    'TikTok 채널 인플루언서 정산 비용이 전주 대비 +12% 증가',
                    'SKU-C3, SKU-D4 반품률이 임계치(12%) 초과 — 즉시 조치 필요',
                ],
                'recommendation' => 'Meta/Google 캠페인으로 예산 재배분 시 예상 ROAS 개선: +0.8x',
            ],
            'roas' => [
                'summary' => 'Google Brand KW ROAS 7.0x로 최고 효율, TikTok CPP 2.1x로 최저 효율입니다.',
                'bullets' => [
                    'Naver SA ROAS 7.1x — 예산 20% 증액 권장',
                    'TikTok CPP 소재 B의 CTR 하락 중 — 소재 교체 검토',
                    'Coupang DA ROAS 1.7x — 손익분기 미달, 일시 중지 검토',
                ],
                'recommendation' => 'Coupang DA 예산 → Google/Naver 재배분 시 월 +₩45M 추가 매출 예상',
            ],
            'returns' => [
                'summary' => 'SKU-C3(4K 웹캠) 반품률 19.8%로 가장 높습니다. 주요 원인은 화질 기대 불일치입니다.',
                'bullets' => [
                    'SKU-D4 반품률 지속 상승 중 (주 +2%p) — 패키지 불량 의심',
                    'SKU-A1 반품률 4.1% — 정상 범위 유지',
                    '쿠팡 채널 반품 처리 비용 월 ₩12M 추산',
                ],
                'recommendation' => 'SKU-C3 상품 설명 개선 + 샘플 영상 추가로 반품률 -5%p 기대',
            ],
        ];

        $resp = $insights[$ctx] ?? $insights['pnl'];

        // If custom question, prepend to response
        if ($question !== '') {
            $resp['question'] = $question;
            $resp['answer'] = "'{$question}'에 대한 분석: " . $resp['summary'];
        }

        return TemplateResponder::json($res, [
            'ok'      => true,
            'version' => 'v422',
            'context' => $ctx,
            'insight' => $resp,
            'model'   => 'genie-ai-mock-v1',
            'generated_at' => gmdate('c'),
        ]);
    }
}
