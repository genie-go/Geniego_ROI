<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Task Comments Handler — N-152-F §4.1 (skeleton).
 */
final class Comments extends Shared
{
    /** POST /v425/pm/tasks/{id}/comments */
    public static function create(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $taskId = (string)($args['id'] ?? '');
        if (!self::validId($taskId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $body = (array)$req->getParsedBody();
        $text = trim((string)($body['body'] ?? ''));
        if ($text === '' || strlen($text) > 10000) {
            return self::json($resp, ['error' => 'invalid_body'], 422);
        }
        $id = self::genId('cmt');
        $g['pdo']->prepare(
            'INSERT INTO pm_task_comments (id, tenant_id, task_id, author_id, body, mentions_csv)
             VALUES (?,?,?,?,?,?)'
        )->execute([
            $id, $g['tenant'], $taskId, $g['user_id'], $text,
            $body['mentions_csv'] ?? null,
        ]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'comment',
            'entity_id' => $id, 'action' => 'create',
            'diff' => ['task' => $taskId, 'body_len' => strlen($text)],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        // [Part A-2] 멘션 해석·알림 파이프라인 — 종전엔 mentions_csv 를 저장만 하고 알림이 없었다(collaboration.mention PARTIAL).
        //   본문 @토큰 + mentions_csv 를 테넌트 사용자로 해석해 user_notification 을 남긴다(best-effort·댓글 저장 무영향).
        $notified = self::notifyMentions($g['pdo'], $g['tenant'], $taskId, $text, (string)($body['mentions_csv'] ?? ''), (string)$g['user_id']);
        return self::json($resp, ['id' => $id, 'ok' => true, 'mentions_notified' => $notified], 201);
    }

    /**
     * [Part A-2] 멘션 해석 → 알림. 본문 @토큰 + mentions_csv 를 테넌트 사용자(email/name)로 매칭,
     *   중복 제거·작성자 제외 후 UserAuth::notify(user_notification) 재사용. 반환=알림 발송 수.
     */
    private static function notifyMentions(\PDO $pdo, string $tenant, string $taskId, string $body, string $mentionsCsv, string $authorId): int
    {
        $tokens = [];
        if (preg_match_all('/@([A-Za-z0-9._%+\-]+(?:@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})?)/u', $body, $mm)) {
            foreach ($mm[1] as $tk) { $tk = trim($tk); if ($tk !== '') $tokens[] = $tk; }
        }
        foreach (explode(',', $mentionsCsv) as $tk) { $tk = ltrim(trim($tk), '@'); if ($tk !== '') $tokens[] = $tk; }
        $tokens = array_values(array_unique(array_filter($tokens)));
        if (!$tokens) return 0;

        try {
            $ph = implode(',', array_fill(0, count($tokens), '?'));
            $params = array_merge([$tenant], $tokens, $tokens);
            $st = $pdo->prepare("SELECT id, email, name FROM app_user WHERE tenant_id=? AND (email IN ($ph) OR name IN ($ph))");
            $st->execute($params);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return 0; }

        $count = 0; $seen = [];
        foreach ($rows as $u) {
            $uid = (int)($u['id'] ?? 0);
            if ($uid <= 0 || isset($seen[$uid])) continue;
            $seen[$uid] = true;
            // 작성자 자기 자신 멘션 제외(email/id 로 대조)
            if ((string)($u['email'] ?? '') === $authorId || (string)$uid === $authorId) continue;
            try {
                \Genie\Handlers\UserAuth::notify($pdo, $uid, $tenant, 'mention',
                    '새 멘션', mb_substr($body, 0, 120), '/pm/collaboration');
                $count++;
            } catch (\Throwable $e) { /* 개별 알림 실패는 나머지에 무영향 */ }
        }
        return $count;
    }

    /** GET /v425/pm/tasks/{id}/comments */
    public static function listByTask(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $taskId = (string)($args['id'] ?? '');
        if (!self::validId($taskId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        [$limit, $offset] = self::clampLimit($req);
        $stmt = $g['pdo']->prepare(
            'SELECT * FROM pm_task_comments
             WHERE tenant_id = ? AND task_id = ?
             ORDER BY created_at DESC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $stmt->execute([$g['tenant'], $taskId]);
        return self::json($resp, ['items' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }
}
