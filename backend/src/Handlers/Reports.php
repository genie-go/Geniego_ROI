<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Mailer;

/**
 * Reports — 리포트 빌더 + 예약 발송 (193차 Sprint4 신규 실구현).
 *
 * 배경: 192차에 ReportBuilder 는 "가짜 셸"로 /dashboard 리다이렉트 숨김 상태였다.
 *   본 핸들러로 실구현: 예약 리포트(report_schedule) CRUD + KPI 요약 생성(performance_metrics 집계,
 *   테넌트 격리) + 이메일 발송(Mailer 재사용, 190차) + 실행 이력(report_run) + cron(bin/reports_cron.php).
 *
 * 인증: /api/reports/* index.php public bypass(세션 기반) → 핸들러 self-auth(requirePro+authedTenant).
 *   (190차 CRM/CustomerAI/Catalog 패턴 정합. 마이그레이션락 회피 위해 CREATE TABLE IF NOT EXISTS 자가보장.)
 */
class Reports
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function json(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function body(Request $req): array
    {
        $b = $req->getParsedBody();
        if (is_array($b) && $b) return $b;
        $raw = (string)$req->getBody();
        $j = json_decode($raw, true);
        return is_array($j) ? $j : [];
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS report_schedule (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL,
                report_type VARCHAR(50) NOT NULL DEFAULT 'kpi_summary',
                period_days INT NOT NULL DEFAULT 30,
                frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
                recipients TEXT,
                enabled TINYINT NOT NULL DEFAULT 1,
                last_run_at VARCHAR(32), next_run_at VARCHAR(32),
                created_at VARCHAR(32),
                KEY idx_rs_tenant (tenant_id), KEY idx_rs_next (next_run_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS report_run (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                schedule_id INT, report_type VARCHAR(50),
                generated_at VARCHAR(32), status VARCHAR(20) NOT NULL DEFAULT 'ok',
                recipients_count INT DEFAULT 0, summary_json TEXT,
                KEY idx_rr_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS report_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                name TEXT NOT NULL, report_type TEXT NOT NULL DEFAULT 'kpi_summary',
                period_days INTEGER NOT NULL DEFAULT 30, frequency TEXT NOT NULL DEFAULT 'weekly',
                recipients TEXT, enabled INTEGER NOT NULL DEFAULT 1,
                last_run_at TEXT, next_run_at TEXT, created_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS report_run (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                schedule_id INTEGER, report_type TEXT, generated_at TEXT,
                status TEXT NOT NULL DEFAULT 'ok', recipients_count INTEGER DEFAULT 0, summary_json TEXT
            )");
        }
    }

    /** frequency → 다음 실행 시각(UTC). */
    public static function computeNextRun(string $frequency, ?int $fromTs = null): string
    {
        $ts = $fromTs ?? time();
        $add = match ($frequency) {
            'daily'   => 86400,
            'monthly' => 30 * 86400,
            default   => 7 * 86400, // weekly
        };
        return gmdate('Y-m-d H:i:s', $ts + $add);
    }

    /** KPI 요약 집계 — performance_metrics 테넌트 격리. 실패/무데이터 시 정직한 0. */
    public static function generateKpiSummary(\PDO $pdo, string $tenant, int $periodDays = 30): array
    {
        $since = gmdate('Y-m-d', time() - max(1, $periodDays) * 86400);
        $agg = ['impressions' => 0, 'clicks' => 0, 'conversions' => 0, 'spend' => 0.0, 'revenue' => 0.0];
        try {
            $st = $pdo->prepare("SELECT
                    COALESCE(SUM(impressions),0) AS impressions, COALESCE(SUM(clicks),0) AS clicks,
                    COALESCE(SUM(conversions),0) AS conversions, COALESCE(SUM(spend),0) AS spend,
                    COALESCE(SUM(revenue),0) AS revenue
                FROM performance_metrics WHERE tenant_id = ? AND date >= ?");
            $st->execute([$tenant, $since]);
            $r = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
            foreach ($agg as $k => $_) $agg[$k] = $r[$k] ?? $agg[$k];
        } catch (\Throwable $e) { /* 테이블 없거나 빈 환경 → 0 유지(정직) */ }

        $spend = (float)$agg['spend']; $revenue = (float)$agg['revenue'];
        $clicks = (int)$agg['clicks']; $impr = (int)$agg['impressions']; $conv = (int)$agg['conversions'];
        return [
            'period_days' => $periodDays,
            'since'       => $since,
            'until'       => gmdate('Y-m-d'),
            'revenue'     => round($revenue, 0),
            'spend'       => round($spend, 0),
            'net'         => round($revenue - $spend, 0),
            'roas'        => $spend > 0 ? round($revenue / $spend, 2) : 0,
            'conversions' => $conv,
            'clicks'      => $clicks,
            'impressions' => $impr,
            'ctr'         => $impr > 0 ? round($clicks / $impr * 100, 2) : 0,
            'cvr'         => $clicks > 0 ? round($conv / $clicks * 100, 2) : 0,
            'cpa'         => $conv > 0 ? round($spend / $conv, 0) : 0,
        ];
    }

    private static function summaryHtml(string $name, array $s): string
    {
        $fmt = fn($n) => number_format((float)$n);
        $rows = [
            ['매출 (Revenue)', '₩' . $fmt($s['revenue'])],
            ['광고비 (Ad Spend)', '₩' . $fmt($s['spend'])],
            ['순이익 (Net)', '₩' . $fmt($s['net'])],
            ['ROAS', (string)$s['roas'] . 'x'],
            ['전환 (Conversions)', $fmt($s['conversions'])],
            ['클릭 (Clicks)', $fmt($s['clicks'])],
            ['노출 (Impressions)', $fmt($s['impressions'])],
            ['CTR', $s['ctr'] . '%'],
            ['CVR', $s['cvr'] . '%'],
            ['CPA', '₩' . $fmt($s['cpa'])],
        ];
        $tr = '';
        foreach ($rows as [$k, $v]) {
            $tr .= "<tr><td style=\"padding:8px 12px;border-bottom:1px solid #eee;color:#555\">" . htmlspecialchars($k) . "</td>"
                 . "<td style=\"padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#111\">" . htmlspecialchars($v) . "</td></tr>";
        }
        $body = "<p style=\"color:#555\">기간: {$s['since']} ~ {$s['until']} ({$s['period_days']}일)</p>"
              . "<table style=\"width:100%;border-collapse:collapse;font-size:14px\">{$tr}</table>";
        return Mailer::wrapHtml('📊 ' . $name, $body);
    }

    // ── GET /reports/schedules ──
    public static function listSchedules(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureTables();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT * FROM report_schedule WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([$tenant]);
        return self::json($res, ['ok' => true, 'schedules' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    // ── POST /reports/schedules ──
    public static function createSchedule(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureTables();
        $tenant = self::tenant($req); $b = self::body($req);
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '리포트 이름을 입력하세요.'], 400);
        $freq = in_array(($b['frequency'] ?? ''), ['daily', 'weekly', 'monthly'], true) ? $b['frequency'] : 'weekly';
        $period = max(1, min(365, (int)($b['period_days'] ?? 30)));
        $recipients = trim((string)($b['recipients'] ?? ''));
        $pdo->prepare("INSERT INTO report_schedule(tenant_id,name,report_type,period_days,frequency,recipients,enabled,next_run_at,created_at)
            VALUES(?,?,?,?,?,?,?,?,?)")
            ->execute([$tenant, $name, 'kpi_summary', $period, $freq, $recipients, 1, self::computeNextRun($freq), self::now()]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    // ── PATCH /reports/schedules/{id} ──
    public static function updateSchedule(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureTables();
        $tenant = self::tenant($req); $id = (int)($args['id'] ?? 0); $b = self::body($req);
        $cur = $pdo->prepare("SELECT * FROM report_schedule WHERE id=? AND tenant_id=?");
        $cur->execute([$id, $tenant]); $row = $cur->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return self::json($res, ['ok' => false, 'error' => '리포트를 찾을 수 없습니다.'], 404);
        $name = trim((string)($b['name'] ?? $row['name']));
        $freq = in_array(($b['frequency'] ?? $row['frequency']), ['daily', 'weekly', 'monthly'], true) ? ($b['frequency'] ?? $row['frequency']) : $row['frequency'];
        $period = max(1, min(365, (int)($b['period_days'] ?? $row['period_days'])));
        $recipients = array_key_exists('recipients', $b) ? trim((string)$b['recipients']) : $row['recipients'];
        $enabled = array_key_exists('enabled', $b) ? (int)(!!$b['enabled']) : (int)$row['enabled'];
        $pdo->prepare("UPDATE report_schedule SET name=?,frequency=?,period_days=?,recipients=?,enabled=? WHERE id=? AND tenant_id=?")
            ->execute([$name, $freq, $period, $recipients, $enabled, $id, $tenant]);
        return self::json($res, ['ok' => true]);
    }

    // ── DELETE /reports/schedules/{id} ──
    public static function deleteSchedule(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureTables();
        $tenant = self::tenant($req); $id = (int)($args['id'] ?? 0);
        $pdo->prepare("DELETE FROM report_schedule WHERE id=? AND tenant_id=?")->execute([$id, $tenant]);
        return self::json($res, ['ok' => true]);
    }

    // ── GET /reports/preview ── (생성만, 미발송)
    public static function preview(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db();
        $tenant = self::tenant($req);
        $period = max(1, min(365, (int)($req->getQueryParams()['period_days'] ?? 30)));
        $summary = self::generateKpiSummary($pdo, $tenant, $period);
        return self::json($res, ['ok' => true, 'summary' => $summary]);
    }

    /**
     * [237차] POST /api/reports/query — 셀프서비스 BI 쿼리 엔진(Funnel.io/Looker 급 커스텀 분석).
     *   사용자가 지표×차원×기간을 선택하면 실 performance_metrics 에서 집계해 표를 반환한다.
     *   ★보안: 지표·차원은 화이트리스트만 허용(임의 SQL/컬럼 불가 — DataProduct 의 SQL-injection 경계와 정합).
     *   ★중복0: 기존 Reports 핸들러 확장(신규 메뉴/핸들러 없음)·performance_metrics 집계 재사용.
     *   body: { metrics:[...], dimension:'channel'|'campaign'|'date', period_days, limit }
     */
    public static function query(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db();
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }

        // [240차 BI⑤] 데이터 소스 인지 — ads(광고 성과) | commerce(주문 머니경로). 경쟁사 BI 대비 P&L/주문 통합 쿼리 우위.
        $source = ((string)($body['source'] ?? 'ads') === 'commerce') ? 'commerce' : 'ads';
        $baseParams = [];
        if ($source === 'commerce') {
            // 커머스 머니경로(channel_orders) — 취소만 제외(반품은 P&L과 동일하게 매출 포함). [현 차수]
            //   취소 SSOT = OrderHub::cancelExclusion() 재사용(인라인 토큰 드리프트 제거). 반품 토큰은 제외 대상 아님.
            [$cancelExpr, $cancelTokens] = OrderHub::cancelExclusion();
            $METRICS = [
                'gross_sales' => 'ROUND(SUM(total_price))',
                'orders'      => 'COUNT(*)',
                'units'       => 'SUM(qty)',
                'aov'         => 'ROUND(SUM(total_price)/NULLIF(COUNT(*),0))',
            ];
            $DIMS = ['channel' => 'channel', 'date' => "SUBSTR(ordered_at,1,10)"];
            $TABLE = 'channel_orders'; $PERIOD_COL = 'ordered_at'; $BASE_WHERE = " AND NOT {$cancelExpr}";
            $baseParams = $cancelTokens; // 취소 토큰 바인드(WHERE 절 ? 순서와 정합)
            $defaultMetrics = ['gross_sales', 'orders', 'aov'];
        } else {
            // 화이트리스트: 광고 지표 SQL 식(performance_metrics). [240차] 계산필드(profit/margin/aov/cpm) 추가 — 경쟁사 BI 계산필드 정합.
            $METRICS = [
                'spend'       => 'ROUND(SUM(spend))',
                'revenue'     => 'ROUND(SUM(revenue))',
                'impressions' => 'SUM(impressions)',
                'clicks'      => 'SUM(clicks)',
                'conversions' => 'SUM(conversions)',
                'roas'        => 'ROUND(SUM(revenue)/NULLIF(SUM(spend),0),2)',
                'ctr'         => 'ROUND(SUM(clicks)/NULLIF(SUM(impressions),0)*100,2)',
                'cvr'         => 'ROUND(SUM(conversions)/NULLIF(SUM(clicks),0)*100,2)',
                'cpc'         => 'ROUND(SUM(spend)/NULLIF(SUM(clicks),0))',
                'cpa'         => 'ROUND(SUM(spend)/NULLIF(SUM(conversions),0))',
                // [240차 BI⑤] 계산필드(파생지표) — 광고 이익·이익률·객단가·CPM. SUM 집계 식 결합(인젝션 불가).
                'profit'      => 'ROUND(SUM(revenue)-SUM(spend))',
                'margin'      => 'ROUND((SUM(revenue)-SUM(spend))/NULLIF(SUM(revenue),0)*100,2)',
                'aov'         => 'ROUND(SUM(revenue)/NULLIF(SUM(conversions),0))',
                'cpm'         => 'ROUND(SUM(spend)/NULLIF(SUM(impressions),0)*1000)',
            ];
            // [239차+ BI심화] 차원 확장(account) + 2차 차원(breakdown=피벗). 전부 화이트리스트.
            $DIMS = ['channel' => 'channel', 'campaign' => 'campaign_ext_id', 'date' => 'date', 'account' => 'account'];
            $TABLE = 'performance_metrics'; $PERIOD_COL = 'date'; $BASE_WHERE = '';
            $defaultMetrics = ['spend', 'revenue', 'roas', 'conversions'];
        }

        $reqMetrics = array_values(array_filter((array)($body['metrics'] ?? []), fn($m) => isset($METRICS[$m])));
        if (!$reqMetrics) $reqMetrics = $defaultMetrics;
        $dim = (string)($body['dimension'] ?? 'channel');
        if (!isset($DIMS[$dim])) $dim = 'channel';
        $dimCol = $DIMS[$dim];
        // 2차 차원(피벗): 1차와 다른 화이트리스트 차원일 때만. 빈값/동일/비화이트리스트면 단일차원(기존 동작 동일=회귀0).
        $brk = (string)($body['breakdown'] ?? '');
        $brkValid = ($brk !== '' && isset($DIMS[$brk]) && $brk !== $dim);
        $brkCol = $brkValid ? $DIMS[$brk] : null;
        $period = max(1, min(365, (int)($body['period_days'] ?? 30)));
        $limit = max(1, min(2000, (int)($body['limit'] ?? ($brkValid ? 1000 : 100))));
        $since = gmdate('Y-m-d', time() - $period * 86400);

        // SELECT 절(화이트리스트 식만 결합 → 인젝션 불가). 차원 컬럼 + (2차차원) + 선택 지표.
        $selects = ["{$dimCol} AS dim"];
        if ($brkCol) $selects[] = "{$brkCol} AS brk";
        foreach ($reqMetrics as $m) $selects[] = "{$METRICS[$m]} AS {$m}";
        $orderMetric = $reqMetrics[0];
        $groupBy = $brkCol ? "{$dimCol}, {$brkCol}" : $dimCol;
        $whereBrk = $brkCol ? " AND {$brkCol} IS NOT NULL AND {$brkCol} <> ''" : '';
        $sql = "SELECT " . implode(', ', $selects) . "
                  FROM {$TABLE}
                 WHERE tenant_id = ? AND {$PERIOD_COL} >= ? AND {$dimCol} IS NOT NULL AND {$dimCol} <> ''{$BASE_WHERE}{$whereBrk}
                 GROUP BY {$groupBy}
                 ORDER BY " . ($dim === 'date' ? 'dim ASC' : "{$orderMetric} DESC") . "
                 LIMIT {$limit}";
        try {
            $st = $pdo->prepare($sql);
            $st->execute(array_merge([$tenant, $since], $baseParams));
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'query_failed'], 500);
        }
        // 합계 행(date 차원 제외)
        $totals = [];
        if ($dim !== 'date' && $rows) {
            $sumKeys = $source === 'commerce' ? ['gross_sales', 'orders', 'units'] : ['spend', 'revenue', 'impressions', 'clicks', 'conversions'];
            foreach ($sumKeys as $k) {
                if (in_array($k, $reqMetrics, true)) $totals[$k] = array_sum(array_map(fn($r) => (float)($r[$k] ?? 0), $rows));
            }
            if ($source === 'ads' && isset($totals['revenue'], $totals['spend']) && $totals['spend'] > 0) $totals['roas'] = round($totals['revenue'] / $totals['spend'], 2);
            if (isset($totals['gross_sales'], $totals['orders']) && $totals['orders'] > 0) $totals['aov'] = round($totals['gross_sales'] / $totals['orders']);
        }
        return self::json($res, [
            'ok' => true, 'source' => $source, 'dimension' => $dim, 'breakdown' => ($brkValid ? $brk : null), 'metrics' => $reqMetrics, 'period_days' => $period,
            'columns' => array_merge(['dim'], ($brkCol ? ['brk'] : []), $reqMetrics), 'rows' => $rows, 'totals' => $totals,
            'count' => count($rows),
            'note' => count($rows) === 0 ? '선택 기간·차원에 집계할 광고 성과 데이터가 없습니다(집행·수집 후 표시).' : null,
        ]);
    }

    // ── POST /reports/run/{id} ── (지금 생성 + 발송)
    public static function runNow(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureTables();
        $tenant = self::tenant($req); $id = (int)($args['id'] ?? 0);
        $st = $pdo->prepare("SELECT * FROM report_schedule WHERE id=? AND tenant_id=?");
        $st->execute([$id, $tenant]); $sch = $st->fetch(\PDO::FETCH_ASSOC);
        if (!$sch) return self::json($res, ['ok' => false, 'error' => '리포트를 찾을 수 없습니다.'], 404);
        $result = self::runSchedule($pdo, $sch);
        return self::json($res, ['ok' => true] + $result);
    }

    // ── GET /reports/history ──
    public static function history(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureTables();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT * FROM report_run WHERE tenant_id=? ORDER BY id DESC LIMIT 50");
        $st->execute([$tenant]);
        return self::json($res, ['ok' => true, 'runs' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /**
     * 한 스케줄 실행: KPI 생성 → 수신자 이메일 발송(Mailer) → report_run 기록 → next_run 갱신.
     * HTTP runNow 와 CLI cron 공유. 반환: {summary, sent, recipients, status}.
     */
    public static function runSchedule(\PDO $pdo, array $sch): array
    {
        self::ensureTables();
        $tenant = (string)($sch['tenant_id'] ?? 'demo');
        $summary = self::generateKpiSummary($pdo, $tenant, (int)($sch['period_days'] ?? 30));
        $recips = array_values(array_filter(array_map('trim', preg_split('/[,;\s]+/', (string)($sch['recipients'] ?? '')))));
        $sent = 0; $status = 'ok';
        if ($recips) {
            $html = self::summaryHtml((string)($sch['name'] ?? 'KPI Report'), $summary);
            $subject = '[GeniegoROI] ' . (string)($sch['name'] ?? 'KPI 리포트') . ' — ' . $summary['until'];
            foreach ($recips as $to) {
                if (!filter_var($to, FILTER_VALIDATE_EMAIL)) continue;
                try { $r = Mailer::send($to, $subject, $html, ['tenant' => $tenant]); if (!empty($r['ok'])) $sent++; }
                catch (\Throwable $e) { $status = 'partial'; }
            }
            if ($sent === 0 && $recips) $status = 'failed';
        } else {
            $status = 'no_recipients';
        }
        try {
            $pdo->prepare("INSERT INTO report_run(tenant_id,schedule_id,report_type,generated_at,status,recipients_count,summary_json) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, (int)($sch['id'] ?? 0), (string)($sch['report_type'] ?? 'kpi_summary'), self::now(), $status, $sent, json_encode($summary, JSON_UNESCAPED_UNICODE)]);
        } catch (\Throwable $e) {}
        try {
            $pdo->prepare("UPDATE report_schedule SET last_run_at=?, next_run_at=? WHERE id=?")
                ->execute([self::now(), self::computeNextRun((string)($sch['frequency'] ?? 'weekly')), (int)($sch['id'] ?? 0)]);
        } catch (\Throwable $e) {}
        return ['summary' => $summary, 'sent' => $sent, 'recipients' => count($recips), 'status' => $status];
    }

    /** CLI cron 진입점: due(enabled, next_run_at<=now) 스케줄 전체 실행. */
    public static function runDue(?string $onlyTenant = null): array
    {
        $pdo = self::db(); self::ensureTables();
        $now = self::now();
        $sql = "SELECT * FROM report_schedule WHERE enabled=1 AND (next_run_at IS NULL OR next_run_at <= ?)";
        $params = [$now];
        if ($onlyTenant) { $sql .= " AND tenant_id=?"; $params[] = $onlyTenant; }
        $st = $pdo->prepare($sql); $st->execute($params);
        $due = $st->fetchAll(\PDO::FETCH_ASSOC);
        $out = [];
        foreach ($due as $sch) { $out[] = ['id' => $sch['id'], 'tenant' => $sch['tenant_id']] + self::runSchedule($pdo, $sch); }
        return $out;
    }

    // ═══ [239차+ BI심화] 저장된 커스텀 리포트(saved_report) — ReportBuilder 구성(지표×차원×피벗×기간) 영속 ═══
    //   ★중복0: 기존 Reports 핸들러 확장. report_schedule(예약발송)과 별개 용도(저장된 분석 뷰).
    private static function ensureSavedReport(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS saved_report (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, config TEXT NOT NULL, viz VARCHAR(20) DEFAULT 'table',
                created_at VARCHAR(32),
                KEY idx_sr2_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS saved_report (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                name TEXT NOT NULL, config TEXT NOT NULL, viz TEXT DEFAULT 'table', created_at TEXT
            )");
        }
    }

    /** GET /reports/saved — 저장된 리포트 목록(테넌트 격리). */
    public static function savedList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureSavedReport();
        $st = self::db()->prepare("SELECT id,name,config,viz,created_at FROM saved_report WHERE tenant_id=? ORDER BY id DESC LIMIT 200");
        $st->execute([self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) { $r['config'] = json_decode((string)$r['config'], true) ?: []; }
        return self::json($res, ['ok' => true, 'reports' => $rows]);
    }

    /** POST /reports/saved — 저장(name, config{metrics,dimension,breakdown,period_days}, viz). */
    public static function savedCreate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureSavedReport();
        $b = self::body($req);
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => 'name_required'], 400);
        $cfg = (array)($b['config'] ?? []);
        $viz = in_array(($b['viz'] ?? 'table'), ['table', 'bar', 'line', 'donut'], true) ? (string)$b['viz'] : 'table';
        self::db()->prepare("INSERT INTO saved_report(tenant_id,name,config,viz,created_at) VALUES(?,?,?,?,?)")
            ->execute([self::tenant($req), mb_substr($name, 0, 200), json_encode($cfg, JSON_UNESCAPED_UNICODE), $viz, self::now()]);
        return self::json($res, ['ok' => true, 'id' => (int)self::db()->lastInsertId()]);
    }

    /** DELETE /reports/saved/{id} — 삭제(테넌트 격리). */
    public static function savedDelete(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureSavedReport();
        self::db()->prepare("DELETE FROM saved_report WHERE id=? AND tenant_id=?")
            ->execute([(int)($args['id'] ?? 0), self::tenant($req)]);
        return self::json($res, ['ok' => true]);
    }
}
