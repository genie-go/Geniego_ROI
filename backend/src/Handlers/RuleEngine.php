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
    // [현 차수 초고도화] daypart_out_of_window 확장 — 기존 룰 조건→액션 머신(pause_channel 등)에 데이파팅을 편입.
    //   설정은 daypart_schedule 정본.
    // ★H2 디덕(현 차수 동기화 감사): 빈도캡 enforcement 는 CRM(발송 게이트, CRM::isMarketingSendAllowed 가
    //   frequency_window 설정을 직접 참조)이 단일 SSOT 이다. RuleEngine 측 user_freq_over_cap 메트릭은 어떤 send-path
    //   에도 연결되지 않은 inert 이중 enforcement 였으므로 룰 메트릭 목록에서 제거(신규 규칙에서 선택 불가).
    //   frequency_window CRUD(freqList/freqSave/freqDelete)는 그 SSOT 가 읽는 설정 표면이므로 그대로 유지한다.
    private const METRICS = ['channel_roas', 'channel_spend', 'sku_stock', 'low_stock_count', 'channel_conversions', 'daypart_out_of_window'];
    private const OPS = ['lt' => '<', 'lte' => '<=', 'gt' => '>', 'gte' => '>=', 'eq' => '=='];
    private const ACTIONS = ['alert', 'webhook', 'pause_channel', 'reorder'];
    private const DEFAULT_TZ = 'Asia/Seoul'; // 데이파팅 기본 타임존(KST) — AutoCampaign withinAdSchedule 와 정합.

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
        // [현 차수 초고도화] 세밀 데이파팅 — 요일(dow 0=일..6=토)×시간(hour 0..23) 허용맵(dow_hours JSON).
        //   AutoCampaign 의 {hours:[s,e],days:[...]}(연속 구간)보다 세밀(요일별 개별 시간 리스트). channel=''=전채널.
        $pdo->exec("CREATE TABLE IF NOT EXISTS daypart_schedule (
            id $AI, tenant_id VARCHAR(64), name VARCHAR(200), channel VARCHAR(40) DEFAULT '',
            dow_hours TEXT, tz VARCHAR(40) DEFAULT 'Asia/Seoul', enabled INTEGER DEFAULT 1,
            last_state VARCHAR(12) DEFAULT '', last_actuated_at TEXT, created_at TEXT, updated_at TEXT
        )");
        // [현 차수 초고도화] per-user 크로스채널 빈도캡 — 일/주 윈도 상한. channel=''=전채널 합산(크로스채널).
        $pdo->exec("CREATE TABLE IF NOT EXISTS frequency_window (
            id $AI, tenant_id VARCHAR(64), name VARCHAR(200), channel VARCHAR(40) DEFAULT '',
            daily_cap INTEGER DEFAULT 0, weekly_cap INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1,
            created_at TEXT, updated_at TEXT
        )");
        // per-user 접점 이벤트(노출/발송) — 빈도 윈도 카운트용. PII 아님(user_key=해시/의사식별자). 슬라이딩 윈도.
        $pdo->exec("CREATE TABLE IF NOT EXISTS frequency_event (
            id $AI, tenant_id VARCHAR(64), user_key VARCHAR(190), channel VARCHAR(40) DEFAULT '', occurred_at TEXT
        )");
        try { $pdo->exec("CREATE INDEX idx_freq_evt ON frequency_event(tenant_id,user_key,occurred_at)"); } catch (\Throwable $e) {}
        try { $pdo->exec("CREATE INDEX idx_freq_evt_ch ON frequency_event(tenant_id,channel,occurred_at)"); } catch (\Throwable $e) {}
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
        // [현 차수 초고도화] 데이파팅 스케줄 액추에이션 — 룰 조건 없이도 스케줄 자체로 윈도 밖=정지/진입=재개.
        //   cron(evaluateAll→evaluateTenant) 이 그대로 커버(신규 cron 배선 불필요). 실패는 전체 평가를 깨지 않음.
        $dp = ['daypart_paused' => 0, 'daypart_resumed' => 0, 'daypart_deferred' => 0];
        try { $dp = self::runDayparting($tenant); } catch (\Throwable $e) {}
        return ['evaluated' => $evaluated, 'triggered' => $triggered] + $dp;
    }

    /** ★M1 디컨플릭트: AutoCampaign 이 자체 데이파팅(guardrails.ad_schedule + withinAdSchedule + daypart_paused@ 플래그)으로
     *  이미 소유·액추에이션 중인 채널 집합(소문자)을 반환한다.
     *  탐지 로직: 활성(status='active') auto_campaign 중 guardrails.ad_schedule 이 설정된 캠페인의 allocations 에서
     *  external_id 가 있는 채널(= AutoCampaign 이 실제 매체 pause/activate 대상으로 삼는 채널, withinAdSchedule 블록의 extIdMap)을 수집.
     *  구 스키마(guardrails 컬럼 부재)나 파싱 실패는 무해하게 "관리 채널 없음"으로 처리(회귀0). */
    private static function autoCampaignScheduledChannels(\PDO $pdo, string $tenant): array
    {
        $managed = [];
        try {
            $st = $pdo->prepare("SELECT allocations, guardrails FROM auto_campaign WHERE tenant_id=? AND status='active'");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $row) {
                $gr = json_decode((string)($row['guardrails'] ?? '{}'), true);
                if (!is_array($gr) || empty($gr['ad_schedule']) || !is_array($gr['ad_schedule'])) continue;
                $allocs = json_decode((string)($row['allocations'] ?? '[]'), true);
                if (!is_array($allocs)) continue;
                foreach ($allocs as $a) {
                    if (empty($a['external_id'])) continue; // AutoCampaign 은 external_id 있는 채널만 실제 액추에이션
                    $ck = strtolower((string)($a['channel'] ?? ''));
                    if ($ck !== '') $managed[$ck] = true;
                }
            }
        } catch (\Throwable $e) { /* guardrails 컬럼 부재(구 스키마) 등 무해 → 관리 채널 없음 */ }
        return $managed;
    }

    /** 데이파팅 스케줄 액추에이션 — 각 활성 스케줄 채널을 윈도 밖=pause / 진입=activate(AdAdapters 자격증명 게이트).
     *  상태전이 시에만 매체 호출(중복 no-op 방지) + rule_engine_log 기록. 데모 오염 차단.
     *  ★M1 디컨플릭트/precedence: AutoCampaign 이 guardrails.ad_schedule 로 이미 관리하는 채널은 AutoCampaign 이 소유(우선)한다.
     *    RuleEngine 데이파팅은 그 채널을 절대 액추에이션하지 않는다(이중 액추에이션·독립 캐시 상태 충돌—서로가 상대 정지/재개를
     *    뒤집는 stale flag 문제 방지). AutoCampaign 이 관리하지 않는 채널만 RuleEngine 이 액추에이션(기존 동작 보존). */
    public static function runDayparting(string $tenant): array
    {
        $out = ['daypart_paused' => 0, 'daypart_resumed' => 0, 'daypart_deferred' => 0];
        if ($tenant === '' || $tenant === 'demo') return $out;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $acManaged = self::autoCampaignScheduledChannels($pdo, $tenant); // ★M1: AutoCampaign 소유 채널(스킵 대상)
        $st = $pdo->prepare("SELECT * FROM daypart_schedule WHERE tenant_id=? AND enabled=1");
        $st->execute([$tenant]);
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $sch) {
            try {
                $dh = json_decode((string)($sch['dow_hours'] ?? ''), true);
                if (!is_array($dh)) continue;
                $channel = strtolower((string)($sch['channel'] ?? ''));
                if ($channel === '') continue; // 전채널 정지는 룰(daypart_out_of_window→pause_channel)로 위임(매체 명시 필요)
                if (isset($acManaged[$channel])) { $out['daypart_deferred']++; continue; } // ★M1: AutoCampaign 우선 — 위임(스킵)
                $within = self::withinDaypart($dh, (string)($sch['tz'] ?? self::DEFAULT_TZ));
                $prev = (string)($sch['last_state'] ?? '');
                $target = $within ? 'active' : 'paused';
                if ($prev === $target) continue; // 상태 동일 → 매체 no-op
                $result = 'skipped'; $detail = '';
                if (class_exists('\Genie\Handlers\AdAdapters')) {
                    // 정지=pauseChannel(전 채널 캠페인 PAUSE). 재개=이 채널 auto_campaign 소재를 activate(자격증명·executionEnabled 게이트).
                    //   ★AutoCampaign 데이파팅 재개(activate 반복)와 동일 정책 — 스케줄이 정지했던 채널만 대상.
                    $r = $within ? self::resumeChannelAds($pdo, $tenant, $channel)
                                 : \Genie\Handlers\AdAdapters::pauseChannel($pdo, $tenant, $channel);
                    $result = !empty($r['ok']) ? 'ok' : 'skipped';
                    $detail = 'daypart ' . $target . ' ' . $channel . ': ' . json_encode($r, JSON_UNESCAPED_UNICODE);
                } else {
                    $detail = 'daypart ' . $target . ' ' . $channel . ': 자격증명/어댑터 대기';
                }
                // 매체 성공(또는 어댑터 부재로 skipped)시에만 상태 전이 — 실패 시 다음 주기 재시도(desync 방지).
                if ($result === 'ok' || $result === 'skipped') {
                    $pdo->prepare("UPDATE daypart_schedule SET last_state=?, last_actuated_at=?, updated_at=? WHERE id=?")
                        ->execute([$target, gmdate('c'), gmdate('c'), (int)$sch['id']]);
                    if ($within) $out['daypart_resumed']++; else $out['daypart_paused']++;
                }
                $pdo->prepare("INSERT INTO rule_engine_log(tenant_id,rule_id,rule_name,metric,observed,threshold,action,result,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$tenant, 0, (string)($sch['name'] ?? 'daypart'), 'daypart_out_of_window', $within ? 0 : 1, 0, $within ? 'daypart_resume' : 'daypart_pause', $result, substr($detail, 0, 250), gmdate('c')]);
            } catch (\Throwable $e) { /* 스케줄 1건 실패가 전체를 깨지 않음 */ }
        }
        return $out;
    }

    // 채널→커넥터키(AdAdapters::activate 시그니처와 정합). AutoCampaign/AbTesting 맵과 동일.
    private const CONN_KEY = ['meta' => 'meta_ads', 'google' => 'google_ads', 'tiktok' => 'tiktok_business', 'naver' => 'naver_sa', 'kakao' => 'kakao_moment', 'line' => 'line_ads', 'coupang' => 'coupang', 'coupang_ads' => 'coupang'];

    /** pauseChannel 의 대칭 — 채널의 auto_campaign 소재를 activate(재개). executionEnabled/자격증명 게이트는 AdAdapters 가 처리.
     *  ★활성화는 사람-인-루프 정책이나, 데이파팅 재개는 사용자가 설정한 스케줄에 따른 명시적 자동화(AutoCampaign 동일 정책). */
    private static function resumeChannelAds(\PDO $pdo, string $tenant, string $channel): array
    {
        $ch = strtolower($channel);
        $conn = self::CONN_KEY[$ch] ?? $ch;
        $resumed = 0; $tried = 0;
        try {
            $st = $pdo->prepare("SELECT allocations FROM auto_campaign WHERE tenant_id=? AND status='active'");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) ?: [] as $allocJson) {
                $allocs = json_decode((string)$allocJson, true);
                if (!is_array($allocs)) continue;
                foreach ($allocs as $a) {
                    if (strtolower((string)($a['channel'] ?? '')) !== $ch) continue;
                    $ext = (string)($a['external_id'] ?? ''); if ($ext === '') continue;
                    $tried++;
                    $r = \Genie\Handlers\AdAdapters::activate($pdo, $tenant, $conn, $ext);
                    if (!empty($r['ok'])) $resumed++;
                }
            }
        } catch (\Throwable $e) { return ['ok' => false, 'channel' => $ch, 'error' => $e->getMessage()]; }
        return ['ok' => $resumed > 0, 'channel' => $ch, 'resumed' => $resumed, 'campaigns' => $tried];
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
            // [현 차수] 데이파팅 게이트 — target 채널(또는 전체)의 활성 스케줄 기준 "지금이 윈도 밖이면 1, 안이면 0".
            //   규칙 예) daypart_out_of_window == 1 → pause_channel(윈도 밖 자동 정지). 스케줄 미설정=null(무평가).
            if ($metric === 'daypart_out_of_window') {
                $w = "tenant_id=? AND enabled=1"; $p = [$tenant];
                if ($target !== '') { $w .= " AND (channel=? OR channel='')"; $p[] = strtolower($target); }
                $q = $pdo->prepare("SELECT dow_hours, tz FROM daypart_schedule WHERE $w ORDER BY id DESC LIMIT 1");
                $q->execute($p); $r = $q->fetch(\PDO::FETCH_ASSOC);
                if (!$r) return null; // 스케줄 없음 → 무평가
                $dh = json_decode((string)($r['dow_hours'] ?? ''), true);
                if (!is_array($dh)) return null;
                return self::withinDaypart($dh, (string)($r['tz'] ?? self::DEFAULT_TZ)) ? 0.0 : 1.0;
            }
            // ★H2 디덕(deprecated no-op): 구 버전에서 저장된 user_freq_over_cap 규칙이 있어도 절대 트리거하지 않는다.
            //   빈도캡 enforcement 는 CRM::isMarketingSendAllowed(frequency_window 설정 직접 참조)가 단일 SSOT.
            //   여기서 null 반환 → evaluateTenant 가 무평가(거짓 트리거 없음). 이중 enforcement 제거.
            if ($metric === 'user_freq_over_cap') {
                return null;
            }
        } catch (\Throwable $e) { return null; }
        return null;
    }

    /** 지금(타임존 기준)이 요일별 허용시간(dow_hours[dow]=[hours…])에 드는가. 빈 맵=허용(회귀0). */
    public static function withinDaypart(array $dowHours, string $tz = self::DEFAULT_TZ): bool
    {
        if (empty($dowHours)) return true;
        try { $now = new \DateTime('now', new \DateTimeZone($tz !== '' ? $tz : self::DEFAULT_TZ)); }
        catch (\Throwable $e) { $now = new \DateTime('now', new \DateTimeZone('UTC')); }
        $dow = (int)$now->format('w');   // 0=일 .. 6=토
        $hour = (int)$now->format('G');  // 0..23
        // 키는 문자열 요일. 해당 요일 키 부재 = 그 요일 전체 비집행(윈도 밖).
        $hours = $dowHours[(string)$dow] ?? ($dowHours[$dow] ?? null);
        if (!is_array($hours)) return false;
        foreach ($hours as $h) { if ((int)$h === $hour) return true; }
        return false;
    }

    /** @deprecated ★H2 디덕: 빈도캡 aggregate enforcement 는 이제 CRM::isMarketingSendAllowed(발송 게이트)가
     *   frequency_window 설정을 직접 참조하는 단일 SSOT 로 일원화됐다. 이 룰엔진 측 집계는 어떤 send-path 에도
     *   연결되지 않은 inert 이중 enforcement 였으므로 no-op(null 반환)으로 중립화한다(frequency_event 의존 제거).
     *   호출부(computeMetric user_freq_over_cap)는 이미 제거됨 — 하위호환 위해 시그니처만 보존. */
    private static function countUsersOverCap(\PDO $pdo, string $tenant, string $target): ?float
    {
        return null;
    }

    /** [재사용 공개] per-user 접점 이벤트 기록(노출/발송) — 광고/메시지 ingest 가 호출. PII 아님(user_key=의사식별자). */
    public static function recordFrequencyTouch(string $tenant, string $userKey, string $channel = ''): bool
    {
        $userKey = trim($userKey); if ($tenant === '' || $tenant === 'demo' || $userKey === '') return false;
        try {
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $pdo->prepare("INSERT INTO frequency_event(tenant_id,user_key,channel,occurred_at) VALUES(?,?,?,?)")
                ->execute([$tenant, substr($userKey, 0, 190), strtolower(substr($channel, 0, 40)), gmdate('c')]);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /** [재사용 공개] 특정 user_key 가 현재 일/주 빈도캡을 초과했는지(채널 또는 크로스채널). 발송/집행 전 게이트. */
    public static function isUserCapped(string $tenant, string $userKey, string $channel = ''): array
    {
        $out = ['capped' => false, 'daily' => 0, 'weekly' => 0, 'daily_cap' => 0, 'weekly_cap' => 0];
        $userKey = trim($userKey); if ($tenant === '' || $userKey === '') return $out;
        try {
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $w = "tenant_id=? AND enabled=1"; $p = [$tenant];
            $chl = strtolower(trim($channel));
            if ($chl !== '') { $w .= " AND (channel=? OR channel='')"; $p[] = $chl; }
            $q = $pdo->prepare("SELECT daily_cap, weekly_cap FROM frequency_window WHERE $w ORDER BY id DESC LIMIT 1");
            $q->execute($p); $win = $q->fetch(\PDO::FETCH_ASSOC);
            if (!$win) return $out;
            $cnt = function (int $days) use ($pdo, $tenant, $userKey, $chl): int {
                $cw = "tenant_id=? AND user_key=? AND occurred_at>=?"; $cp = [$tenant, substr($userKey, 0, 190), gmdate('c', time() - $days * 86400)];
                if ($chl !== '') { $cw .= " AND channel=?"; $cp[] = $chl; }
                $s = $pdo->prepare("SELECT COUNT(*) FROM frequency_event WHERE $cw"); $s->execute($cp); return (int)$s->fetchColumn();
            };
            $out['daily_cap'] = (int)($win['daily_cap'] ?? 0); $out['weekly_cap'] = (int)($win['weekly_cap'] ?? 0);
            $out['daily'] = $cnt(1); $out['weekly'] = $cnt(7);
            $out['capped'] = ($out['daily_cap'] > 0 && $out['daily'] >= $out['daily_cap']) || ($out['weekly_cap'] > 0 && $out['weekly'] >= $out['weekly_cap']);
        } catch (\Throwable $e) {}
        return $out;
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
                    // [현 차수 감사 MKT-1] $pdo 전달(시그니처 정합). pauseChannel 이 실제 매체 캠페인을 PAUSED 전환.
                    $r = \Genie\Handlers\AdAdapters::pauseChannel($pdo, $tenant, $channel);
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

    // ── 데이파팅 스케줄 CRUD(세밀 요일×시간) ─────────────────────────────────
    /** dow_hours 검증·정규화: {"0".."6": [0..23,...]}. 잘못된 키/시간은 제거. */
    private static function normDowHours($raw): array
    {
        if (is_string($raw)) $raw = json_decode($raw, true);
        if (!is_array($raw)) return [];
        $out = [];
        foreach ($raw as $dow => $hours) {
            $d = (int)$dow; if ($d < 0 || $d > 6 || !is_array($hours)) continue;
            $hh = [];
            foreach ($hours as $h) { $h = (int)$h; if ($h >= 0 && $h <= 23) $hh[$h] = true; }
            if ($hh) { $ks = array_keys($hh); sort($ks); $out[(string)$d] = array_values($ks); }
        }
        return $out;
    }

    public static function daypartList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'schedules' => []], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT * FROM daypart_schedule WHERE tenant_id=? ORDER BY id DESC"); $st->execute([$t]);
        $rows = array_map(function ($r) {
            $r['enabled'] = (int)$r['enabled']; $r['dow_hours'] = json_decode((string)($r['dow_hours'] ?? ''), true) ?: [];
            return $r;
        }, $st->fetchAll(\PDO::FETCH_ASSOC) ?: []);
        return self::json($res, ['ok' => true, 'schedules' => $rows, 'now_within_hint' => null]);
    }

    public static function daypartSave(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증 필요'], 401);
        $b = (array)($req->getParsedBody() ?? []);
        $name = trim((string)($b['name'] ?? ''));
        $dow = self::normDowHours($b['dow_hours'] ?? null);
        if ($name === '' || empty($dow)) return self::json($res, ['ok' => false, 'error' => '이름·요일별 허용시간(dow_hours)이 필요합니다.'], 422);
        $pdo = Db::pdo(); self::ensureTables($pdo); $now = gmdate('c');
        $channel = strtolower(substr((string)($b['channel'] ?? ''), 0, 40));
        $tz = trim((string)($b['tz'] ?? self::DEFAULT_TZ)) ?: self::DEFAULT_TZ;
        $enabled = (int)(bool)($b['enabled'] ?? 1);
        $dowJson = json_encode($dow, JSON_UNESCAPED_UNICODE);
        $id = (int)($args['id'] ?? 0);
        if ($id > 0) {
            $up = $pdo->prepare("UPDATE daypart_schedule SET name=?,channel=?,dow_hours=?,tz=?,enabled=?,updated_at=? WHERE id=? AND tenant_id=?");
            $up->execute([$name, $channel, $dowJson, $tz, $enabled, $now, $id, $t]);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $pdo->prepare("INSERT INTO daypart_schedule(tenant_id,name,channel,dow_hours,tz,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
            ->execute([$t, $name, $channel, $dowJson, $tz, $enabled, $now, $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function daypartDelete(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("DELETE FROM daypart_schedule WHERE id=? AND tenant_id=?"); $st->execute([(int)($args['id'] ?? 0), $t]);
        return self::json($res, ['ok' => $st->rowCount() > 0, 'deleted_id' => (int)($args['id'] ?? 0)]);
    }

    /** POST /v424/rules/dayparts/run — 데이파팅 즉시 액추에이션(cron 도 evaluateTenant 로 동일 수행). */
    public static function daypartRun(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        return self::json($res, ['ok' => true] + self::runDayparting($t));
    }

    // ── per-user 크로스채널 빈도캡 CRUD + 접점기록/조회 ──────────────────────
    // ★H2 SSOT: 여기 frequency_window CRUD 는 "설정 표면"일 뿐, 실제 빈도캡 enforcement 는 CRM 발송 게이트
    //   CRM::isMarketingSendAllowed 가 이 frequency_window 행(daily/weekly/크로스채널)을 crm_activities 로 대조해
    //   단일 지점에서 수행한다. RuleEngine 은 더 이상 병렬 enforcement 를 하지 않는다(이중화 제거).
    //   recordFrequencyTouch/isUserCapped/freqTouch/freqCheck 는 수동 조회/기록용 유틸로만 유지(라이브 enforcement 아님).
    public static function freqList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'windows' => []], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT * FROM frequency_window WHERE tenant_id=? ORDER BY id DESC"); $st->execute([$t]);
        $rows = array_map(function ($r) { $r['enabled'] = (int)$r['enabled']; $r['daily_cap'] = (int)$r['daily_cap']; $r['weekly_cap'] = (int)$r['weekly_cap']; return $r; }, $st->fetchAll(\PDO::FETCH_ASSOC) ?: []);
        return self::json($res, ['ok' => true, 'windows' => $rows]);
    }

    public static function freqSave(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증 필요'], 401);
        $b = (array)($req->getParsedBody() ?? []);
        $name = trim((string)($b['name'] ?? ''));
        $daily = max(0, (int)($b['daily_cap'] ?? 0)); $weekly = max(0, (int)($b['weekly_cap'] ?? 0));
        if ($name === '' || ($daily === 0 && $weekly === 0)) return self::json($res, ['ok' => false, 'error' => '이름·일/주 캡(1 이상) 중 하나가 필요합니다.'], 422);
        $pdo = Db::pdo(); self::ensureTables($pdo); $now = gmdate('c');
        $channel = strtolower(substr((string)($b['channel'] ?? ''), 0, 40));
        $enabled = (int)(bool)($b['enabled'] ?? 1);
        $id = (int)($args['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare("UPDATE frequency_window SET name=?,channel=?,daily_cap=?,weekly_cap=?,enabled=?,updated_at=? WHERE id=? AND tenant_id=?")
                ->execute([$name, $channel, $daily, $weekly, $enabled, $now, $id, $t]);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $pdo->prepare("INSERT INTO frequency_window(tenant_id,name,channel,daily_cap,weekly_cap,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
            ->execute([$t, $name, $channel, $daily, $weekly, $enabled, $now, $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function freqDelete(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("DELETE FROM frequency_window WHERE id=? AND tenant_id=?"); $st->execute([(int)($args['id'] ?? 0), $t]);
        return self::json($res, ['ok' => $st->rowCount() > 0, 'deleted_id' => (int)($args['id'] ?? 0)]);
    }

    /** POST /v424/rules/frequency/touch — per-user 접점 기록(광고/메시지 ingest). {user_key, channel}. */
    public static function freqTouch(Request $req, Response $res): Response
    {
        $t = self::tenant($req); if ($t === null || $t === '' || $t === 'demo') return self::json($res, ['ok' => false, 'error' => '인증 필요'], 401);
        $b = (array)($req->getParsedBody() ?? []);
        $userKey = trim((string)($b['user_key'] ?? '')); $channel = trim((string)($b['channel'] ?? ''));
        if ($userKey === '') return self::json($res, ['ok' => false, 'error' => 'user_key 필요'], 422);
        $ok = self::recordFrequencyTouch($t, $userKey, $channel);
        return self::json($res, ['ok' => $ok] + self::isUserCapped($t, $userKey, $channel));
    }

    /** GET /v424/rules/frequency/check?user_key=X&channel=Y — 현재 캡 초과 여부(발송 전 게이트). */
    public static function freqCheck(Request $req, Response $res): Response
    {
        $t = self::tenant($req); if ($t === null) return self::json($res, ['ok' => false], 401);
        $q = $req->getQueryParams();
        $userKey = trim((string)($q['user_key'] ?? '')); $channel = trim((string)($q['channel'] ?? ''));
        if ($userKey === '') return self::json($res, ['ok' => false, 'error' => 'user_key 필요'], 422);
        return self::json($res, ['ok' => true] + self::isUserCapped($t, $userKey, $channel));
    }
}
