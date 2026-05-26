<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Events Handler — N-152-F §8 SSE 채널 (skeleton).
 *
 * 본 skeleton 은 SSE handshake + heartbeat. 실제 event 발행 (mutation hook → pub/sub) 은
 * 별도 트랙 (N-152-F5 Redis bus 또는 PHP local queue).
 *
 * 운영 nginx 설정 의무:
 *  - X-Accel-Buffering: no
 *  - proxy_buffering off
 *  - 5분 hard cap (PHP-FPM worker 점유 보호)
 */
final class Events extends Shared
{
    /** GET /v425/pm/events/stream?project_id= — SSE long-poll */
    public static function stream(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];

        $q = $req->getQueryParams();
        $projectId = (string)($q['project_id'] ?? '');
        if ($projectId !== '' && !self::validId($projectId)) {
            return self::json($resp, ['error' => 'invalid_project_id'], 422);
        }

        $resp = $resp
            ->withHeader('Content-Type', 'text/event-stream; charset=utf-8')
            ->withHeader('Cache-Control', 'no-cache, no-transform')
            ->withHeader('Connection', 'keep-alive')
            ->withHeader('X-Accel-Buffering', 'no');

        // Skeleton: 본 endpoint 는 즉시 1 hello 이벤트 + close. 실 long-poll 은 본체 구현 단계.
        $body = $resp->getBody();
        $payload = [
            'tenant'     => $g['tenant'],
            'project_id' => $projectId ?: null,
            'ts'         => date('c'),
            'note'       => 'skeleton — long-poll 본체는 169차 이후 구현',
        ];
        $body->write("event: hello\ndata: " . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n");
        return $resp;
    }
}
