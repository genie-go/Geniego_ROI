<?php
namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * 196차 Phase 2 — 광고 마케팅 자동 캠페인 엔진.
 *
 * 캠페인 설정(예산+카테고리+채널) + Phase1 AI 디자인 연결 → 자동 캠페인 생성·지속·실행상태 추적.
 * 실제 채널 광고 집행은 각 채널의 API 자격증명(channel_credential)이 연결돼 있어야 'active',
 * 미연결 채널은 'pending_connection'(연결 대기) 으로 정직하게 표기(가짜 집행 금지).
 * Phase 3(실시간 최적화)가 performance_metrics 를 읽어 본 엔진의 allocations 를 재배분한다.
 */
class AutoCampaign
{
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        if ($t === null || $t === '') $t = (string)($req->getAttribute('auth_tenant') ?? '');
        return $t !== '' ? $t : 'unknown';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b['data'] ?? $b;
    }

    private static function migrate(PDO $pdo): void
    {
        $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $auto = $isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
        $txt  = $isSqlite ? 'TEXT' : 'MEDIUMTEXT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS auto_campaign (
                id $auto,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                name VARCHAR(200),
                category VARCHAR(120),
                budget BIGINT DEFAULT 0,
                period VARCHAR(20) DEFAULT 'monthly',
                channels $txt,
                allocations $txt,
                design_ids $txt,
                exec_status $txt,
                est_roas VARCHAR(16),
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32)
            )" . ($isSqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'));
        } catch (\Throwable $e) {}
    }

    /** 채널 API 자격증명 연결 여부(실제 집행 가능 판단). */
    private static function channelConnected(PDO $pdo, string $tenant, string $channel): bool
    {
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=? AND channel=? AND is_active=1 LIMIT 1");
            $st->execute([$tenant, $channel]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /** POST /v423/auto-campaign/launch — 자동 캠페인 생성·실행. */
    public static function launch(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
            $d = self::body($req);

            $name     = trim((string)($d['name'] ?? '')) ?: '자동 캠페인';
            $category = trim((string)($d['category'] ?? ''));
            $budget   = (int)($d['budget'] ?? 0);
            $period   = trim((string)($d['period'] ?? 'monthly'));
            $channels = is_array($d['channels'] ?? null) ? array_values(array_filter(array_map('strval', $d['channels']))) : [];
            $allocations = is_array($d['allocations'] ?? null) ? $d['allocations'] : [];
            $designIds = is_array($d['design_ids'] ?? null) ? array_values(array_map('intval', $d['design_ids'])) : [];
            $estRoas  = (string)($d['est_roas'] ?? '');

            if ($budget <= 0) return self::json($res, ['ok' => false, 'error' => '예산을 입력하세요.'], 422);
            if (empty($channels)) return self::json($res, ['ok' => false, 'error' => '채널을 1개 이상 선택하세요.'], 422);

            $pdo = Db::pdo();
            self::migrate($pdo);

            // 채널별 실행 상태(정직): 자격증명 연결 시 active, 아니면 연결 대기
            $exec = [];
            $activeCount = 0;
            foreach ($channels as $ch) {
                $connected = self::channelConnected($pdo, $tenant, $ch);
                $exec[$ch] = $connected ? 'active' : 'pending_connection';
                if ($connected) $activeCount++;
            }

            // 연결된 AI 디자인 검증(본 테넌트 소유 + 존재만 통과)
            $validDesigns = [];
            if (!empty($designIds)) {
                $in = implode(',', array_fill(0, count($designIds), '?'));
                try {
                    $st = $pdo->prepare("SELECT id FROM ad_design WHERE tenant_id=? AND id IN ($in)");
                    $st->execute(array_merge([$tenant], $designIds));
                    $validDesigns = array_map('intval', array_column($st->fetchAll(PDO::FETCH_ASSOC) ?: [], 'id'));
                } catch (\Throwable $e) { $validDesigns = []; }
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $st = $pdo->prepare("INSERT INTO auto_campaign(tenant_id,name,category,budget,period,channels,allocations,design_ids,exec_status,est_roas,status,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([
                $tenant, mb_substr($name, 0, 200), mb_substr($category, 0, 120), $budget, $period,
                json_encode($channels, JSON_UNESCAPED_UNICODE),
                json_encode($allocations, JSON_UNESCAPED_UNICODE),
                json_encode($validDesigns),
                json_encode($exec, JSON_UNESCAPED_UNICODE),
                $estRoas, 'active', $now, $now,
            ]);
            $id = (int)$pdo->lastInsertId();

            $pendingCount = count($channels) - $activeCount;
            $msg = $activeCount > 0
                ? "캠페인이 실행되었습니다. {$activeCount}개 채널 집행 시작" . ($pendingCount > 0 ? ", {$pendingCount}개 채널은 연결 대기" : "")
                : "캠페인이 생성·예약되었습니다. 채널 API 연결 후 자동 집행됩니다(연결 대기 {$pendingCount}개).";

            return self::json($res, [
                'ok' => true,
                'id' => $id,
                'exec_status' => $exec,
                'active_channels' => $activeCount,
                'pending_channels' => $pendingCount,
                'linked_designs' => count($validDesigns),
                'message' => $msg,
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** GET /v423/auto-campaign/list — 본 테넌트 자동 캠페인 목록(최신순). */
    public static function list(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            $pdo = Db::pdo();
            self::migrate($pdo);
            $rows = [];
            if ($tenant !== 'unknown') {
                $st = $pdo->prepare("SELECT * FROM auto_campaign WHERE tenant_id=? ORDER BY id DESC LIMIT 50");
                $st->execute([$tenant]);
                foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                    $r['channels']    = json_decode((string)($r['channels'] ?? '[]'), true) ?: [];
                    $r['allocations'] = json_decode((string)($r['allocations'] ?? '[]'), true) ?: [];
                    $r['design_ids']  = json_decode((string)($r['design_ids'] ?? '[]'), true) ?: [];
                    $r['exec_status'] = json_decode((string)($r['exec_status'] ?? '{}'), true) ?: new \stdClass();
                    $rows[] = $r;
                }
            }
            return self::json($res, ['ok' => true, 'campaigns' => $rows]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage(), 'campaigns' => []]);
        }
    }

    /** POST /v423/auto-campaign/status — {id, status: active|paused} 일시정지/재개. */
    public static function setStatus(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
            $d = self::body($req);
            $id = (int)($d['id'] ?? 0);
            $status = trim((string)($d['status'] ?? ''));
            if ($id <= 0 || !in_array($status, ['active', 'paused'], true)) {
                return self::json($res, ['ok' => false, 'error' => '잘못된 요청입니다.'], 422);
            }
            $pdo = Db::pdo();
            self::migrate($pdo);
            $st = $pdo->prepare("UPDATE auto_campaign SET status=?, updated_at=? WHERE id=? AND tenant_id=?");
            $st->execute([$status, gmdate('Y-m-d\TH:i:s\Z'), $id, $tenant]);
            return self::json($res, ['ok' => true, 'id' => $id, 'status' => $status]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
