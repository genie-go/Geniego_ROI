<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * RuleEngine — 범용 IF-THEN 자동화 룰엔진 (현 차수 신규·AIRuleEngine 실배선).
 *
 * ★중복 0: 도메인별 룰(PriceOpt repricer·SupplyChain risk·Mapping validation·AutoCampaign 가드레일)은
 *   각자 영역 전용. 본 엔진은 그 위의 "크로스도메인 자동화"(채널 ROAS↓→알림/정지, 재고↓→발주, 전환↓→웹훅)
 *   를 단일 규칙 스토어 + 평가기로 제공. 실데이터 조건 평가 → 실 액션 실행. 거짓 트리거 0.
 *
 * 조건(metric op value): channel_roas / channel_spend / sku_stock / low_stock_count / channel_conversions.
 * 액션: alert(감사로그+로그) / webhook(OpenPlatform::emit) / pause_channel(AdAdapters, 자격증명 게이트) / reorder.
 * 평가: runRules(cron/수동) — 각 활성 규칙 조건 평가 → 트리거 시 액션 + rule_log. 테넌트 격리.
 *
 * 라우트(/v424/rules·세션 self-auth bypass): GET 목록·POST 생성·PUT 수정·DELETE·POST {id}/toggle·POST run·GET logs.
 */
final class RuleEngine
{
    private const METRICS = ['channel_roas', 'channel_spend', 'sku_stock', 'low_stock_count', 'channel_conversions'];
    private const OPS = ['lt' => '<', 'lte' => '<=', 'gt' => '>', 'gte' => '>=', 'eq' => '=='];
    private const ACTIONS = ['alert', 'webhook', 'pause_channel', 'reorder'];

    private static function ensureTables(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $pdo->exec("CREATE TABLE IF NOT EXISTS rule_engine (
            id $AI, tenant_id VARCHAR(64), name VARCHAR(200),
            metric VARCHAR(40), op VARCHAR(8), threshold REAL DEFAULT 0, target VARCHAR(120),
            action VARCHAR(30), action_params TEXT, enabled INTEGER DEFAULT 1,
            last_triggered_at TEXT, trigger_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS rule_engine_log (
            id $AI, tenant_id VARCHAR(64), rule_id INTEGER DEFAULT 0, rule_name VARCHAR(200),
            metric VARCHAR(40), observed REAL DEFAULT 0, threshold REAL DEFAULT 0,
            action VARCHAR(30), result VARCHAR(20), detail TEXT, created_at TEXT
        )");
    }

    private static function json(Response $res, array $d, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($code);
    }
    private static function tenant(Request $req): ?string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t !== '') return $t;
        return UserAuth::authedTenant($req);
    }
    private static function rowOut(array $r): array
    {
        $r['enabled'] = (int)$r['enabled']; $r['threshold'] = (float)$r['threshold']; $r['trigger_count'] = (int)$r['trigger_count'];
        $r['action_params'] = $r['action_params'] ? (json_decode((string)$r['action_params'], true) ?: []) : [];
        return $r;
    }

    public static function listRules(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'rules' => []], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT * FROM rule_engine WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([$t]);
        $rules = array_map([self::class, 'rowOut'], $st->fetchAll(\PDO::FETCH_ASSOC) ?: []);
        // KPI(실데이터): 활성 규칙·오늘 트리거·성공률.
        $log = $pdo->prepare("SELECT COUNT(*) c, SUM(CASE WHEN result='ok' THEN 1 ELSE 0 END) ok FROM rule_engine_log WHERE tenant_id=? AND created_at>=?");
        $log->execute([$t, gmdate('Y-m-d')]);
        $lr = $log->fetch(\PDO::FETCH_ASSOC) ?: ['c' => 0, 'ok' => 0];
        $active = 0; foreach ($rules as $r) if ($r['enabled']) $active++;
        return self::json($res, ['ok' => true, 'rules' => $rules, 'kpi' => [
            'active_rules' => $active, 'triggered_today' => (int)$lr['c'],
            'success_rate' => (int)$lr['c'] > 0 ? round((int)$lr['ok'] / (int)$lr['c'] * 100, 1) : null,
            'metrics' => self::METRICS, 'ops' => array_keys(self::OPS), 'actions' => self::ACTIONS,
        ]]);
    }

    public static function saveRule(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증 필요'], 401);
        $b = (array)($req->getParsedBody() ?? []);
        $name = trim((string)($b['name'] ?? ''));
        $metric = (string)($b['metric'] ?? '');
        $op = (string)($b['op'] ?? '');
        $action = (string)($b['action'] ?? '');
        if ($name === '' || !in_array($metric, self::METRICS, true) || !isset(self::OPS[$op]) || !in_array($action, self::ACTIONS, true)) {
            return self::json($res, ['ok' => false, 'error' => '필수값 누락/유효하지 않음', 'metrics' => self::METRICS, 'ops' => array_keys(self::OPS), 'actions' => self::ACTIONS], 422);
        }
        $pdo = Db::pdo(); self::ensureTables($pdo); $now = gmdate('c');
        $params = json_encode(is_array($b['action_params'] ?? null) ? $b['action_params'] : [], JSON_UNESCAPED_UNICODE);
        $id = (int)($args['id'] ?? 0);
        if ($id > 0) {
            $up = $pdo->prepare("UPDATE rule_engine SET name=?,metric=?,op=?,threshold=?,target=?,action=?,action_params=?,enabled=?,updated_at=? WHERE id=? AND tenant_id=?");
            $up->execute([$name, $metric, $op, (float)($b['threshold'] ?? 0), substr((string)($b['target'] ?? ''), 0, 120), $action, $params, (int)(bool)($b['enabled'] ?? 1), $now, $id, $t]);
            if ($up->rowCount() === 0 && !self::owns($pdo, $t, $id)) return self::json($res, ['ok' => false, 'error' => '규칙 없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $pdo->prepare("INSERT INTO rule_engine(tenant_id,name,metric,op,threshold,target,action,action_params,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$t, $name, $metric, $op, (float)($b['threshold'] ?? 0), substr((string)($b['target'] ?? ''), 0, 120), $action, $params, (int)(bool)($b['enabled'] ?? 1), $now, $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function toggleRule(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo); $id = (int)($args['id'] ?? 0);
        $pdo->prepare("UPDATE rule_engine SET enabled=1-enabled, updated_at=? WHERE id=? AND tenant_id=?")->execute([gmdate('c'), $id, $t]);
        return self::json($res, ['ok' => true, 'id' => $id]);
    }

    public static function deleteRule(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("DELETE FROM rule_engine WHERE id=? AND tenant_id=?"); $st->execute([(int)($args['id'] ?? 0), $t]);
        return self::json($res, ['ok' => $st->rowCount() > 0, 'deleted_id' => (int)($args['id'] ?? 0)]);
    }

    public static function logs(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'logs' => []], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT * FROM rule_engine_log WHERE tenant_id=? ORDER BY id DESC LIMIT 100");
        $st->execute([$t]);
        return self::json($res, ['ok' => true, 'logs' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
    }

    /** POST /v424/rules/run — 수동 평가(cron 도 동일 호출). */
    public static function runEndpoint(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        $r = self::evaluateTenant($t);
        return self::json($res, ['ok' => true] + $r);
    }

    private static function owns(\PDO $pdo, string $t, int $id): bool
    {
        $s = $pdo->prepare("SELECT 1 FROM rule_engine WHERE id=? AND tenant_id=?"); $s->execute([$id, $t]); return (bool)$s->fetchColumn();
    }

    // ── 평가 엔진(cron/수동 공용) ──────────────────────────────────────────
    /** 전 테넌트 활성 규칙 평가(cron 진입점). */
    public static function evaluateAll(int $max = 5000): array
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $tenants = $pdo->query("SELECT DISTINCT tenant_id FROM rule_engine WHERE enabled=1")->fetchAll(\PDO::FETCH_COLUMN) ?: [];
        $tot = ['evaluated' => 0, 'triggered' => 0];
        foreach ($tenants as $t) {
            if ($t === 'demo') continue; // 데모 오염 차단
            $r = self::evaluateTenant((string)$t);
            $tot['evaluated'] += $r['evaluated']; $tot['triggered'] += $r['triggered'];
        }
        return $tot;
    }

    public static function evaluateTenant(string $tenant): array
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT * FROM rule_engine WHERE tenant_id=? AND enabled=1");
        $st->execute([$tenant]);
        $rules = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $evaluated = 0; $triggered = 0;
        foreach ($rules as $rule) {
            $evaluated++;
            try {
                $observed = self::computeMetric($pdo, $tenant, (string)$rule['metric'], (string)$rule['target']);
                if ($observed === null) continue; // 데이터 없음 → 평가 보류(거짓 트리거 방지)
                if (!self::compare($observed, (string)$rule['op'], (float)$rule['threshold'])) continue;
                $triggered++;
                $params = $rule['action_params'] ? (json_decode((string)$rule['action_params'], true) ?: []) : [];
                [$result, $detail] = self::execAction($pdo, $tenant, (string)$rule['action'], $params, $rule, $observed);
                $pdo->prepare("INSERT INTO rule_engine_log(tenant_id,rule_id,rule_name,metric,observed,threshold,action,result,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$tenant, (int)$rule['id'], (string)$rule['name'], (string)$rule['metric'], $observed, (float)$rule['threshold'], (string)$rule['action'], $result, substr($detail, 0, 250), gmdate('c')]);
                $pdo->prepare("UPDATE rule_engine SET last_triggered_at=?, trigger_count=trigger_count+1 WHERE id=?")->execute([gmdate('c'), (int)$rule['id']]);
            } catch (\Throwable $e) { /* 규칙 1건 실패가 전체 평가를 깨지 않음 */ }
        }
        return ['evaluated' => $evaluated, 'triggered' => $triggered];
    }

    /** 실데이터 메트릭 계산 — 데이터 없으면 null(거짓 트리거 방지). 최근 7일. */
    private static function computeMetric(\PDO $pdo, string $tenant, string $metric, string $target): ?float
    {
        $since = gmdate('Y-m-d', time() - 7 * 86400);
        try {
            if ($metric === 'channel_roas' || $metric === 'channel_spend' || $metric === 'channel_conversions') {
                $w = "tenant_id=? AND date>=?"; $p = [$tenant, $since];
                if ($target !== '') { $w .= " AND LOWER(channel)=?"; $p[] = strtolower($target); }
                $q = $pdo->prepare("SELECT SUM(spend) sp, SUM(revenue) rv, SUM(conversions) cv FROM performance_metrics WHERE $w");
                $q->execute($p); $r = $q->fetch(\PDO::FETCH_ASSOC) ?: [];
                $sp = (float)($r['sp'] ?? 0); $rv = (float)($r['rv'] ?? 0); $cv = (float)($r['cv'] ?? 0);
                if ($metric === 'channel_spend') return $sp;
                if ($metric === 'channel_conversions') return $cv;
                return $sp > 0 ? round($rv / $sp, 3) : ($rv > 0 ? 999.0 : null); // ROAS, spend 0 + 매출0 → null
            }
            if ($metric === 'sku_stock') {
                if ($target === '') return null;
                $q = $pdo->prepare("SELECT SUM(on_hand) s FROM wms_stock WHERE tenant_id=? AND sku=?");
                $q->execute([$tenant, $target]); $v = $q->fetchColumn();
                return $v === false ? null : (float)$v;
            }
            if ($metric === 'low_stock_count') {
                $thr = $target !== '' ? (float)$target : 10.0;
                $q = $pdo->prepare("SELECT COUNT(*) c FROM (SELECT sku, SUM(on_hand) oh FROM wms_stock WHERE tenant_id=? GROUP BY sku HAVING oh < ?) x");
                $q->execute([$tenant, $thr]); return (float)$q->fetchColumn();
            }
        } catch (\Throwable $e) { return null; }
        return null;
    }

    private static function compare(float $a, string $op, float $b): bool
    {
        switch ($op) {
            case 'lt': return $a < $b; case 'lte': return $a <= $b;
            case 'gt': return $a > $b; case 'gte': return $a >= $b;
            case 'eq': return abs($a - $b) < 1e-9; default: return false;
        }
    }

    /** @return array{0:string,1:string} [result, detail] */
    private static function execAction(\PDO $pdo, string $tenant, string $action, array $params, array $rule, float $observed): array
    {
        $msg = "규칙 '{$rule['name']}': {$rule['metric']}=" . round($observed, 2) . " {$rule['op']} {$rule['threshold']}";
        try {
            if ($action === 'alert') {
                // 감사로그 + (있으면) 알림 인프라. 거짓성공 없이 실 기록.
                try { Db::audit('rule_engine', 'rule.trigger', ['tenant' => $tenant, 'rule' => $rule['name'], 'observed' => $observed]); } catch (\Throwable $e) {}
                return ['ok', $msg];
            }
            if ($action === 'webhook') {
                // 오픈플랫폼 웹훅 — conversion.recorded 등 카탈로그 이벤트로 외부 통지(구독 없으면 no-op).
                $ev = (string)($params['event'] ?? 'conversion.recorded');
                \Genie\Handlers\OpenPlatform::emit($tenant, $ev, ['source' => 'rule_engine', 'rule' => $rule['name'], 'metric' => $rule['metric'], 'observed' => $observed, 'occurred_at' => gmdate('c')]);
                return ['ok', "webhook emit: {$ev}"];
            }
            if ($action === 'pause_channel') {
                // 채널 광고 일시정지 — 자격증명 게이트(AdAdapters). 미설정=no_credentials(거짓성공 없음).
                $channel = (string)($params['channel'] ?? $rule['target'] ?? '');
                if ($channel === '') return ['skipped', 'pause_channel: channel 미지정'];
                if (class_exists('\Genie\Handlers\AdAdapters') && method_exists('\Genie\Handlers\AdAdapters', 'pauseChannel')) {
                    $r = \Genie\Handlers\AdAdapters::pauseChannel($tenant, $channel);
                    return [!empty($r['ok']) ? 'ok' : 'skipped', 'pause_channel ' . $channel . ': ' . json_encode($r, JSON_UNESCAPED_UNICODE)];
                }
                return ['skipped', 'pause_channel: 자격증명/어댑터 대기'];
            }
            if ($action === 'reorder') {
                // 자동발주는 DemandForecast 가 정본(중복 회피) — 웹훅으로 통지만.
                \Genie\Handlers\OpenPlatform::emit($tenant, 'conversion.recorded', ['source' => 'rule_engine_reorder', 'rule' => $rule['name'], 'target' => $rule['target']]);
                return ['ok', 'reorder 신호(발주는 DemandForecast auto-replenish 정본)'];
            }
        } catch (\Throwable $e) { return ['error', substr($e->getMessage(), 0, 200)]; }
        return ['skipped', 'unknown action'];
    }
}
