<?php
/**
 * AnomalyDetection — 광고 지표 통계적 이상감지(SPC) + 실시간 경보.
 *
 * ② 광고·채널 분석 초고도화. performance_metrics(채널×일자)에서 채널별 핵심 지표
 * (ROAS·CPA·일지출·CTR·CVR) 시계열을 만들어, 관리도(Control Chart) μ±kσ 기반으로
 * Western Electric 규칙(±3σ 단일점 / 최근 3점 중 2점 ±2σ)을 적용해 이상점을 자동 탐지한다.
 * 규칙기반 Alerting(수동 정책)과 달리 정책 없이 통계적으로 급변·드리프트를 잡아낸다.
 *
 * 실데이터 기반(테넌트 격리). 데모는 합성 이상 사례. 추정 아닌 실측 통계.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class AnomalyDetection
{
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        if ($t === null || $t === '') $t = (string)($req->getAttribute('auth_tenant') ?? '');
        return $t !== '' ? $t : 'unknown';
    }

    private static function isDemo(string $tenant): bool
    {
        if ($tenant === '' || $tenant === 'demo' || $tenant === 'unknown' || str_starts_with($tenant, 'demo')) return true;
        try { if (\Genie\Db::env() === 'demo') return true; } catch (\Throwable $e) {}
        // [239차+ P2 하드닝] substring('demo') → 정확일치/suffix('_demo')만(운영 DB명에 'demo' 부분문자열
        //   포함 시 합성 이상치 오노출 방지). Mmm::isDemo 와 동일 패턴으로 일관화(심층방어).
        try {
            $dbn = strtolower((string)Db::pdo()->query('SELECT DATABASE()')->fetchColumn());
            if ($dbn === 'demo' || str_ends_with($dbn, '_demo')) return true;
        } catch (\Throwable $e) {}
        return false;
    }

    /** GET /v424/anomaly/scan?window=60 — 채널별 지표 이상감지. */
    public static function scan(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        $qs = $req->getQueryParams();
        $window = max(14, min(180, (int)($qs['window'] ?? 60)));

        if (self::isDemo($tenant)) {
            return self::json($res, self::demoScan($window));
        }
        try {
            $series = self::loadSeries(Db::pdo(), $tenant, $window);
            $anoms = [];
            foreach ($series as $ch => $rows) {
                foreach (self::channelAnomalies($ch, $rows) as $a) $anoms[] = $a;
            }
            // 심각도(sigma 절대값) + 최신순 정렬
            usort($anoms, function ($a, $b) {
                if ($a['severity_rank'] !== $b['severity_rank']) return $b['severity_rank'] <=> $a['severity_rank'];
                return strcmp($b['date'], $a['date']);
            });
            $summary = ['total' => count($anoms), 'critical' => 0, 'warning' => 0];
            foreach ($anoms as $a) { if ($a['severity'] === 'critical') $summary['critical']++; else $summary['warning']++; }
            return self::json($res, [
                'ok' => true, 'demo' => false, 'window_days' => $window,
                'anomalies' => array_slice($anoms, 0, 50),
                'summary' => $summary,
                'data_driven' => true,
                'note' => count($anoms) > 0 ? '실측 performance_metrics 통계 기반 SPC 탐지' : '최근 기간에 통계적 이상 신호가 없습니다(정상 범위).',
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** 채널별 일자 시계열: [channel => [ ['date','spend','revenue','conversions','clicks','impressions'], ... ]] */
    private static function loadSeries(\PDO $pdo, string $tenant, int $window): array
    {
        $since = gmdate('Y-m-d', time() - $window * 86400);
        $st = $pdo->prepare(
            "SELECT channel, date,
                    SUM(spend) AS spend, SUM(revenue) AS revenue, SUM(conversions) AS conversions,
                    SUM(clicks) AS clicks, SUM(impressions) AS impressions
               FROM performance_metrics
              WHERE tenant_id = ? AND date >= ? AND channel IS NOT NULL AND channel <> ''
              GROUP BY channel, date ORDER BY channel, date"
        );
        $st->execute([$tenant, $since]);
        $out = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $out[(string)$r['channel']][] = [
                'date' => (string)$r['date'],
                'spend' => (float)$r['spend'], 'revenue' => (float)$r['revenue'],
                'conversions' => (float)$r['conversions'], 'clicks' => (float)$r['clicks'], 'impressions' => (float)$r['impressions'],
            ];
        }
        return $out;
    }

    /** 한 채널의 지표별 SPC 이상점 탐지. */
    private static function channelAnomalies(string $channel, array $rows): array
    {
        $n = count($rows);
        if ($n < 10) return []; // 통계적 신뢰 최소 표본

        // 지표 시계열 구성(0 분모 보호)
        $metrics = [
            'roas'  => ['label' => 'ROAS',   'unit' => 'x',  'bad' => 'down', 'vals' => []],
            'cpa'   => ['label' => 'CPA',    'unit' => '원', 'bad' => 'up',   'vals' => []],
            'spend' => ['label' => '일 지출', 'unit' => '원', 'bad' => 'up',   'vals' => []],
            'ctr'   => ['label' => 'CTR',    'unit' => '%',  'bad' => 'down', 'vals' => []],
            'cvr'   => ['label' => 'CVR',    'unit' => '%',  'bad' => 'down', 'vals' => []],
        ];
        $dates = [];
        foreach ($rows as $r) {
            $dates[] = $r['date'];
            $metrics['roas']['vals'][]  = $r['spend'] > 0 ? $r['revenue'] / $r['spend'] : 0.0;
            $metrics['cpa']['vals'][]   = $r['conversions'] > 0 ? $r['spend'] / $r['conversions'] : 0.0;
            $metrics['spend']['vals'][] = $r['spend'];
            $metrics['ctr']['vals'][]   = $r['impressions'] > 0 ? $r['clicks'] / $r['impressions'] * 100 : 0.0;
            $metrics['cvr']['vals'][]   = $r['clicks'] > 0 ? $r['conversions'] / $r['clicks'] * 100 : 0.0;
        }

        $anoms = [];
        foreach ($metrics as $key => $m) {
            $vals = $m['vals'];
            // 기준선: 마지막 3일을 제외한 구간으로 μ,σ 산출(최근 변화 탐지). 표본 부족 시 전체.
            $baseN = max(7, $n - 3);
            $base = array_slice($vals, 0, $baseN);
            $mean = array_sum($base) / count($base);
            $var = 0.0; foreach ($base as $v) $var += ($v - $mean) ** 2;
            $sd = sqrt($var / max(1, count($base) - 1));
            if ($sd < 1e-9) continue; // 변동 없음 → 이상 정의 불가

            // 최근 3일 점검(WE 규칙1: |3σ| 단일점)
            $recentIdx = range(max(0, $n - 3), $n - 1);
            foreach ($recentIdx as $i) {
                $v = $vals[$i];
                $z = ($v - $mean) / $sd;
                $absZ = abs($z);
                if ($absZ < 2.0) continue;
                // 나쁜 방향만 경보(ROAS/CTR/CVR↓, CPA/지출↑) — 좋은 방향 급변은 정보성으로 약하게
                $isBad = ($m['bad'] === 'down' && $z < 0) || ($m['bad'] === 'up' && $z > 0);
                $severity = $absZ >= 3.0 ? 'critical' : 'warning';
                if (!$isBad && $severity !== 'critical') continue; // 좋은 방향 약신호는 생략
                $dir = $z < 0 ? '하락' : '상승';
                $reason = self::reasonText($m['label'], $dir, $isBad);
                $anoms[] = [
                    'channel' => $channel, 'metric' => $key, 'metric_label' => $m['label'], 'unit' => $m['unit'],
                    'date' => $dates[$i], 'value' => round($v, 3), 'expected' => round($mean, 3),
                    'sigma' => round($z, 2), 'direction' => $dir, 'is_bad' => $isBad,
                    'severity' => $severity, 'severity_rank' => ($severity === 'critical' ? 2 : 1) + ($isBad ? 0.5 : 0),
                    'reason' => $reason, 'action' => self::actionText($key, $isBad, $dir),
                ];
            }
        }
        return $anoms;
    }

    private static function reasonText(string $label, string $dir, bool $isBad): string
    {
        $tag = $isBad ? '⚠ 악화' : '↕ 급변';
        return "{$tag}: {$label} {$dir}(기준 대비 통계적 이탈)";
    }

    private static function actionText(string $metric, bool $isBad, string $dir): string
    {
        if (!$isBad) return '원인 확인(이벤트·시즌성 여부) 후 기준선 재학습';
        return match ($metric) {
            'roas'  => 'ROAS 급락 — 소재·타겟 점검, 손실 채널 예산 회수 검토',
            'cpa'   => 'CPA 급등 — 입찰가·타겟 과열 점검, 예산 페이싱 강화',
            'spend' => '지출 급증 — 일예산 캡·과집행 점검(예산 한도 확인)',
            'ctr'   => 'CTR 하락 — 크리에이티브 피로도·소재 교체 검토',
            'cvr'   => 'CVR 하락 — 랜딩·퍼널·재고/가격 점검',
            default => '지표 이탈 — 원인 진단 권장',
        };
    }

    /* ── 데모 합성 이상 사례 ── */
    private static function demoScan(int $window): array
    {
        $today = gmdate('Y-m-d');
        $d1 = gmdate('Y-m-d', time() - 86400);
        $d2 = gmdate('Y-m-d', time() - 2 * 86400);
        $anoms = [
            ['channel' => 'meta_ads', 'metric' => 'roas', 'metric_label' => 'ROAS', 'unit' => 'x', 'date' => $today, 'value' => 1.8, 'expected' => 3.4, 'sigma' => -3.6, 'direction' => '하락', 'is_bad' => true, 'severity' => 'critical', 'severity_rank' => 2.5, 'reason' => '⚠ 악화: ROAS 하락(기준 대비 통계적 이탈)', 'action' => 'ROAS 급락 — 소재·타겟 점검, 손실 채널 예산 회수 검토'],
            ['channel' => 'google_ads', 'metric' => 'spend', 'metric_label' => '일 지출', 'unit' => '원', 'date' => $today, 'value' => 620000, 'expected' => 300000, 'sigma' => 3.1, 'direction' => '상승', 'is_bad' => true, 'severity' => 'critical', 'severity_rank' => 2.5, 'reason' => '⚠ 악화: 일 지출 상승(기준 대비 통계적 이탈)', 'action' => '지출 급증 — 일예산 캡·과집행 점검(예산 한도 확인)'],
            ['channel' => 'tiktok_business', 'metric' => 'cpa', 'metric_label' => 'CPA', 'unit' => '원', 'date' => $d1, 'value' => 48000, 'expected' => 22000, 'sigma' => 2.7, 'direction' => '상승', 'is_bad' => true, 'severity' => 'warning', 'severity_rank' => 1.5, 'reason' => '⚠ 악화: CPA 상승(기준 대비 통계적 이탈)', 'action' => 'CPA 급등 — 입찰가·타겟 과열 점검, 예산 페이싱 강화'],
            ['channel' => 'naver_sa', 'metric' => 'ctr', 'metric_label' => 'CTR', 'unit' => '%', 'date' => $d2, 'value' => 0.9, 'expected' => 1.7, 'sigma' => -2.3, 'direction' => '하락', 'is_bad' => true, 'severity' => 'warning', 'severity_rank' => 1.5, 'reason' => '⚠ 악화: CTR 하락(기준 대비 통계적 이탈)', 'action' => 'CTR 하락 — 크리에이티브 피로도·소재 교체 검토'],
        ];
        return ['ok' => true, 'demo' => true, 'window_days' => $window, 'anomalies' => $anoms, 'summary' => ['total' => 4, 'critical' => 2, 'warning' => 2], 'data_driven' => true, 'note' => '데모 합성 이상 사례(체험용)'];
    }
}
