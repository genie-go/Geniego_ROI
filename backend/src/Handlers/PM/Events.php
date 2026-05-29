<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Events Handler — N-152-F §8 SSE 채널 (178차 long-loop 본체).
 *
 * 이벤트 소스 = pm_audit_log 신규 행 (mutation 시 Shared::auditLog 가 적재).
 * EventSource(클라) 는 커스텀 헤더 불가 → ?api_key=<token> 로 인증 (index.php 미들웨어 지원).
 * project_id 지정 시 해당 프로젝트 + 그 task/milestone entity 로 스코프.
 *
 * 운영 nginx 의무 (vhost):
 *  - location /api/v425/pm/events { proxy_buffering off; proxy_read_timeout 360s; chunked_transfer_encoding off; }
 *  - X-Accel-Buffering: no (핸들러가 헤더로도 송신)
 *
 * 보호장치: 300s hard cap (PHP-FPM worker 점유) · 2s poll · 25s heartbeat · connection_aborted 즉시 종료.
 */
final class Events extends Shared
{
    private const MAX_DURATION_SEC = 300;   // 5분 hard cap
    private const POLL_INTERVAL_SEC = 2;    // DB 폴링 주기
    private const HEARTBEAT_SEC = 25;       // heartbeat 주기 (프록시 idle timeout 방지)
    private const BATCH_LIMIT = 50;         // 1 poll 당 최대 emit 행

    /** GET /v425/pm/events/stream?project_id=&last_event_id= — SSE long-poll */
    public static function stream(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];

        $q = $req->getQueryParams();
        $projectId = (string)($q['project_id'] ?? '');
        if ($projectId !== '' && !self::validId($projectId)) {
            return self::json($resp, ['error' => 'invalid_project_id'], 422);
        }

        /** @var \PDO $pdo */
        $pdo = $g['pdo'];
        $tenant = (string)$g['tenant'];

        // 재개 지점: Last-Event-ID 헤더(EventSource 자동 재연결) > ?last_event_id > 현재 MAX(id)
        $lastId = self::resolveLastId($req, $q, $pdo, $tenant, $projectId);

        // ── SSE 헤더 (Slim 버퍼 응답 우회: 직접 출력 + exit) ──
        if (!headers_sent()) {
            header('Content-Type: text/event-stream; charset=utf-8');
            header('Cache-Control: no-cache, no-transform');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');
        }
        // 출력 버퍼 전부 해제 → echo 즉시 flush
        while (ob_get_level() > 0) { @ob_end_flush(); }
        @ini_set('zlib.output_compression', '0');
        ob_implicit_flush(true);
        @set_time_limit(self::MAX_DURATION_SEC + 10);
        ignore_user_abort(false);

        // 핸드셰이크
        echo "retry: 5000\n\n";
        self::emit('ready', ['tenant' => $tenant, 'project_id' => $projectId ?: null, 'last_event_id' => $lastId, 'ts' => date('c')], $lastId);
        @flush();

        // 스코프 쿼리 준비 (lastId 만 매 루프 재바인딩)
        [$sql, $baseParams] = self::buildPollQuery($pdo, $tenant, $projectId);
        $stmt = $pdo->prepare($sql);

        $start = time();
        $lastHeartbeat = $start;

        while (true) {
            if (connection_aborted()) break;
            if ((time() - $start) >= self::MAX_DURATION_SEC) {
                self::emitComment('cap reached — reconnect');
                self::emit('bye', ['reason' => 'duration_cap', 'last_event_id' => $lastId], null);
                @flush();
                break;
            }

            try {
                $stmt->execute(array_merge($baseParams, [$lastId]));
                $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {
                self::emitComment('poll error');
                $rows = [];
            }

            if ($rows) {
                foreach ($rows as $r) {
                    $eid = (int)$r['id'];
                    self::emit((string)($r['action'] ?: 'event'), [
                        'id'          => $eid,
                        'entity_type' => $r['entity_type'] ?? null,
                        'entity_id'   => $r['entity_id'] ?? null,
                        'action'      => $r['action'] ?? null,
                        'actor'       => $r['actor_user_id'] ?? ($r['actor_api_key'] ?? null),
                        'diff'        => isset($r['diff_json']) ? json_decode((string)$r['diff_json'], true) : null,
                        'ts'          => $r['created_at'] ?? null,
                    ], $eid);
                    $lastId = max($lastId, $eid);
                }
                $lastHeartbeat = time();
                @flush();
            } elseif ((time() - $lastHeartbeat) >= self::HEARTBEAT_SEC) {
                self::emitComment('hb ' . date('c'));
                @flush();
                $lastHeartbeat = time();
            }

            // 짧은 sleep 분할 → abort 빠른 감지
            for ($i = 0; $i < self::POLL_INTERVAL_SEC; $i++) {
                if (connection_aborted()) break 2;
                sleep(1);
            }
        }

        exit;
    }

    /** 재개 지점 id 결정. */
    private static function resolveLastId(Request $req, array $q, \PDO $pdo, string $tenant, string $projectId): int
    {
        $hdr = $req->getHeaderLine('Last-Event-ID');
        if ($hdr !== '' && ctype_digit($hdr)) return (int)$hdr;
        if (!empty($q['last_event_id']) && ctype_digit((string)$q['last_event_id'])) return (int)$q['last_event_id'];

        // 신규 연결: 현재 max id 부터 (과거 전체 replay 방지)
        [$sql, $params] = self::buildPollQuery($pdo, $tenant, $projectId, true);
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $max = $stmt->fetchColumn();
            return $max ? (int)$max : 0;
        } catch (\Throwable $e) {
            return 0;
        }
    }

    /**
     * 폴링 쿼리 빌드.
     * @param bool $maxOnly true 면 MAX(id) 만 (재개 지점 계산용, lastId placeholder 없음).
     * @return array{0:string,1:array}
     */
    private static function buildPollQuery(\PDO $pdo, string $tenant, string $projectId, bool $maxOnly = false): array
    {
        $params = [$tenant];
        $scope = '';
        if ($projectId !== '') {
            // project 본체 + 그 task/milestone entity 로 스코프
            $scope = ' AND (entity_id = ?'
                   . ' OR entity_id IN (SELECT id FROM pm_tasks WHERE tenant_id = ? AND project_id = ?)'
                   . ' OR entity_id IN (SELECT id FROM pm_milestones WHERE tenant_id = ? AND project_id = ?))';
            $params[] = $projectId;
            $params[] = $tenant; $params[] = $projectId;
            $params[] = $tenant; $params[] = $projectId;
        }

        if ($maxOnly) {
            return ['SELECT MAX(id) FROM pm_audit_log WHERE tenant_id = ?' . $scope, $params];
        }
        // lastId placeholder 는 호출부에서 params 끝에 append
        $sql = 'SELECT id, entity_type, entity_id, action, actor_user_id, actor_api_key, diff_json, created_at'
             . ' FROM pm_audit_log WHERE tenant_id = ?' . $scope . ' AND id > ?'
             . ' ORDER BY id ASC LIMIT ' . self::BATCH_LIMIT;
        return [$sql, $params];
    }

    /** SSE 이벤트 1건 emit. */
    private static function emit(string $event, array $data, ?int $id): void
    {
        if ($id !== null) echo 'id: ' . $id . "\n";
        echo 'event: ' . $event . "\n";
        echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    }

    /** SSE 주석(heartbeat) — 클라 onmessage 미발화, 연결 유지용. */
    private static function emitComment(string $msg): void
    {
        echo ': ' . $msg . "\n\n";
    }
}
