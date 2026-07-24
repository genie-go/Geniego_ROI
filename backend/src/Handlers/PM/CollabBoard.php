<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * CollabBoard — 팀/프로젝트/조직 스코프 비동기 협업 대화·공지 게시판(초엔터프라이즈 협업 레이어).
 *
 * ★벤치마크(Slack 채널·Basecamp Message Board·Notion·Asana Conversations)의 "대화/토론/공지" 레이어를
 *   실시간 인프라(WebSocket/CRDT) 없이 request/response 로 정직하게 구현한다(실시간 채팅 위장 금지).
 * ★재사용(헌법 Reuse→Extend): PM\Shared(세션인증·테넌트격리·역할게이트·감사·genId) + team 스코프 +
 *   UserAuth::notify(user_notification) 멘션 알림. 신규 엔진 아님 — 대화 데이터(collab_post/reply/reaction)만 신설.
 * ★스코프: space_type = team|project|org, space_id = 팀ID/프로젝트ID/'' (조직 전체 공지). 화장품 예시의
 *   "제조↔재고 일부 협업"(project 스코프)·"전 팀 공지"(org 스코프)·"팀 내부 논의"(team 스코프) 모두 커버.
 *
 * Endpoints (routes.php · /v425/pm/collaboration/board/*):
 *   GET  /board/posts?space_type=&space_id=          => listPosts
 *   POST /board/posts                                 => createPost   {space_type,space_id,title,body,is_announcement,mentions_csv}
 *   DELETE /board/posts/{id}                          => deletePost
 *   POST /board/posts/{id}/pin                        => togglePin
 *   GET  /board/posts/{id}/replies                    => listReplies
 *   POST /board/posts/{id}/replies                    => createReply  {body,mentions_csv}
 *   POST /board/react                                 => react        {target_type,target_id,emoji}
 */
final class CollabBoard extends Shared
{
    private static array $ensured = [];
    private const SPACE_TYPES = ['team', 'project', 'org'];
    private const EMOJIS = ['👍', '❤️', '🎉', '✅', '👀', '🙏', '🔥', '😄'];

    private static function ensureTables(\PDO $pdo, bool $isDemo): void
    {
        $memo = $isDemo ? 'demo' : 'ops';
        if (isset(self::$ensured[$memo])) return;
        self::$ensured[$memo] = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collab_post (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                    space_type VARCHAR(16) NOT NULL, space_id VARCHAR(64) NOT NULL DEFAULT '',
                    author_id VARCHAR(64), author_name VARCHAR(160),
                    title VARCHAR(300), body MEDIUMTEXT,
                    is_pinned TINYINT(1) DEFAULT 0, is_announcement TINYINT(1) DEFAULT 0,
                    reply_count INT DEFAULT 0, created_at VARCHAR(32), updated_at VARCHAR(32),
                    KEY idx_cp_space (tenant_id, space_type, space_id, is_pinned, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS collab_post_reply (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, post_id VARCHAR(64) NOT NULL,
                    author_id VARCHAR(64), author_name VARCHAR(160), body MEDIUMTEXT, created_at VARCHAR(32),
                    KEY idx_cpr_post (tenant_id, post_id, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS collab_reaction (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                    target_type VARCHAR(12) NOT NULL, target_id VARCHAR(64) NOT NULL,
                    user_id VARCHAR(64) NOT NULL, emoji VARCHAR(16) NOT NULL, created_at VARCHAR(32),
                    UNIQUE KEY uq_react (tenant_id, target_type, target_id, user_id, emoji)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collab_post (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, space_type TEXT NOT NULL, space_id TEXT NOT NULL DEFAULT '', author_id TEXT, author_name TEXT, title TEXT, body TEXT, is_pinned INTEGER DEFAULT 0, is_announcement INTEGER DEFAULT 0, reply_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS collab_post_reply (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, post_id TEXT NOT NULL, author_id TEXT, author_name TEXT, body TEXT, created_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS collab_reaction (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL, created_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_react ON collab_reaction(tenant_id, target_type, target_id, user_id, emoji)");
            }
        } catch (\Throwable $e) { /* 존재 시 무영향 */ }
    }

    private static function callerName(Request $req): string
    {
        try { $au = \Genie\Handlers\UserAuth::authedUser($req); if (is_array($au)) return (string)($au['name'] ?? $au['email'] ?? ''); } catch (\Throwable $e) {}
        return '';
    }

    /** 멘션 해석 → 알림(Comments 와 동일 규칙 재사용 — @토큰+mentions_csv → 테넌트 사용자 매칭 → user_notification). */
    private static function notifyMentions(\PDO $pdo, string $tenant, string $body, string $mentionsCsv, string $authorId): int
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
            $st = $pdo->prepare("SELECT id, email, name FROM app_user WHERE tenant_id=? AND (email IN ($ph) OR name IN ($ph))");
            $st->execute(array_merge([$tenant], $tokens, $tokens));
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return 0; }
        $count = 0; $seen = [];
        foreach ($rows as $u) {
            $uid = (int)($u['id'] ?? 0);
            if ($uid <= 0 || isset($seen[$uid])) continue;
            $seen[$uid] = true;
            if ((string)($u['email'] ?? '') === $authorId || (string)$uid === $authorId) continue;
            try { \Genie\Handlers\UserAuth::notify($pdo, $uid, $tenant, 'mention', '협업 게시판 멘션', mb_substr($body, 0, 120), '/pm/collaboration'); $count++; } catch (\Throwable $e) {}
        }
        return $count;
    }

    private static function normSpace(array $src): array
    {
        $st = (string)($src['space_type'] ?? 'org');
        if (!in_array($st, self::SPACE_TYPES, true)) $st = 'org';
        $sid = $st === 'org' ? '' : (string)($src['space_id'] ?? '');
        return [$st, $sid];
    }

    /** 게시글 목록(핀 우선·최신순) + 리액션 집계 + 내 리액션. */
    public static function listPosts(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        [$st, $sid] = self::normSpace($req->getQueryParams());
        [$limit, $offset] = self::clampLimit($req);
        $posts = [];
        try {
            $q = $pdo->prepare("SELECT id, space_type, space_id, author_id, author_name, title, body, is_pinned, is_announcement, reply_count, created_at
                                FROM collab_post WHERE tenant_id=? AND space_type=? AND space_id=?
                                ORDER BY is_pinned DESC, created_at DESC LIMIT $limit OFFSET $offset");
            $q->execute([$tenant, $st, $sid]);
            $rows = $q->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $ids = array_column($rows, 'id');
            $reactMap = self::reactionsFor($pdo, $tenant, 'post', $ids, (string)$g['user_id']);
            foreach ($rows as $r) {
                $r['is_pinned'] = (int)$r['is_pinned']; $r['is_announcement'] = (int)$r['is_announcement']; $r['reply_count'] = (int)$r['reply_count'];
                $r['reactions'] = $reactMap[$r['id']] ?? ['counts' => new \stdClass(), 'mine' => []];
                $posts[] = $r;
            }
        } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true, 'space_type' => $st, 'space_id' => $sid, 'posts' => $posts, 'emojis' => self::EMOJIS]);
    }

    /** 대상들의 리액션 집계(emoji→count) + 내가 누른 emoji 목록. */
    private static function reactionsFor(\PDO $pdo, string $tenant, string $type, array $ids, string $me): array
    {
        $out = [];
        if (!$ids) return $out;
        try {
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $q = $pdo->prepare("SELECT target_id, emoji, user_id FROM collab_reaction WHERE tenant_id=? AND target_type=? AND target_id IN ($ph)");
            $q->execute(array_merge([$tenant, $type], $ids));
            foreach ($q->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $tid = (string)$r['target_id']; $em = (string)$r['emoji'];
                if (!isset($out[$tid])) $out[$tid] = ['counts' => [], 'mine' => []];
                $out[$tid]['counts'][$em] = ($out[$tid]['counts'][$em] ?? 0) + 1;
                if ((string)$r['user_id'] === $me) $out[$tid]['mine'][] = $em;
            }
        } catch (\Throwable $e) {}
        return $out;
    }

    public static function createPost(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        $b = (array)$req->getParsedBody();
        [$st, $sid] = self::normSpace($b);
        $title = trim((string)($b['title'] ?? ''));
        $body = trim((string)($b['body'] ?? ''));
        if ($body === '' && $title === '') return self::json($resp, ['error' => 'empty'], 422);
        if (mb_strlen($body) > 20000 || mb_strlen($title) > 300) return self::json($resp, ['error' => 'too_long'], 422);
        $id = self::genId('post'); $now = gmdate('c'); $name = self::callerName($req);
        try {
            $pdo->prepare("INSERT INTO collab_post (id,tenant_id,space_type,space_id,author_id,author_name,title,body,is_announcement,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$id, $tenant, $st, $sid, (string)$g['user_id'], $name, $title, $body, !empty($b['is_announcement']) ? 1 : 0, $now, $now]);
        } catch (\Throwable $e) { return self::json($resp, ['error' => 'insert_failed'], 500); }
        self::auditLog($pdo, ['tenant_id' => $tenant, 'actor_user_id' => (string)$g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'comment', 'entity_id' => $id, 'action' => 'create', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        $notified = self::notifyMentions($pdo, $tenant, $title . ' ' . $body, (string)($b['mentions_csv'] ?? ''), (string)$g['user_id']);
        return self::json($resp, ['ok' => true, 'id' => $id, 'mentions_notified' => $notified], 201);
    }

    public static function deletePost(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        // 작성자 본인 또는 admin 만 삭제
        try {
            $row = $pdo->prepare("SELECT author_id FROM collab_post WHERE id=? AND tenant_id=?");
            $row->execute([$id, $tenant]); $author = $row->fetchColumn();
            if ($author === false) return self::json($resp, ['error' => 'not_found'], 404);
            if ((string)$author !== (string)$g['user_id'] && (string)$g['role'] !== 'admin') return self::json($resp, ['error' => 'forbidden'], 403);
            $pdo->prepare("DELETE FROM collab_post WHERE id=? AND tenant_id=?")->execute([$id, $tenant]);
            $pdo->prepare("DELETE FROM collab_post_reply WHERE post_id=? AND tenant_id=?")->execute([$id, $tenant]);
            $pdo->prepare("DELETE FROM collab_reaction WHERE target_type='post' AND target_id=? AND tenant_id=?")->execute([$id, $tenant]);
        } catch (\Throwable $e) { return self::json($resp, ['error' => 'delete_failed'], 500); }
        return self::json($resp, ['ok' => true]);
    }

    public static function togglePin(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        try {
            $row = $pdo->prepare("SELECT is_pinned FROM collab_post WHERE id=? AND tenant_id=?");
            $row->execute([$id, $tenant]); $cur = $row->fetchColumn();
            if ($cur === false) return self::json($resp, ['error' => 'not_found'], 404);
            $new = ((int)$cur === 1) ? 0 : 1;
            $pdo->prepare("UPDATE collab_post SET is_pinned=? WHERE id=? AND tenant_id=?")->execute([$new, $id, $tenant]);
            return self::json($resp, ['ok' => true, 'is_pinned' => $new]);
        } catch (\Throwable $e) { return self::json($resp, ['error' => 'update_failed'], 500); }
    }

    public static function listReplies(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        $pid = (string)($args['id'] ?? '');
        if (!self::validId($pid)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $replies = [];
        try {
            $q = $pdo->prepare("SELECT id, author_id, author_name, body, created_at FROM collab_post_reply WHERE tenant_id=? AND post_id=? ORDER BY created_at ASC LIMIT 200");
            $q->execute([$tenant, $pid]);
            $rows = $q->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $reactMap = self::reactionsFor($pdo, $tenant, 'reply', array_column($rows, 'id'), (string)$g['user_id']);
            foreach ($rows as $r) { $r['reactions'] = $reactMap[$r['id']] ?? ['counts' => new \stdClass(), 'mine' => []]; $replies[] = $r; }
        } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true, 'replies' => $replies, 'emojis' => self::EMOJIS]);
    }

    public static function createReply(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        $pid = (string)($args['id'] ?? '');
        if (!self::validId($pid)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $b = (array)$req->getParsedBody();
        $body = trim((string)($b['body'] ?? ''));
        if ($body === '' || mb_strlen($body) > 20000) return self::json($resp, ['error' => 'invalid_body'], 422);
        $id = self::genId('rply'); $now = gmdate('c'); $name = self::callerName($req);
        try {
            $exists = $pdo->prepare("SELECT 1 FROM collab_post WHERE id=? AND tenant_id=?"); $exists->execute([$pid, $tenant]);
            if (!$exists->fetchColumn()) return self::json($resp, ['error' => 'post_not_found'], 404);
            $pdo->prepare("INSERT INTO collab_post_reply (id,tenant_id,post_id,author_id,author_name,body,created_at) VALUES (?,?,?,?,?,?,?)")
                ->execute([$id, $tenant, $pid, (string)$g['user_id'], $name, $body, $now]);
            $pdo->prepare("UPDATE collab_post SET reply_count = reply_count + 1, updated_at=? WHERE id=? AND tenant_id=?")->execute([$now, $pid, $tenant]);
        } catch (\Throwable $e) { return self::json($resp, ['error' => 'insert_failed'], 500); }
        $notified = self::notifyMentions($pdo, $tenant, $body, (string)($b['mentions_csv'] ?? ''), (string)$g['user_id']);
        return self::json($resp, ['ok' => true, 'id' => $id, 'mentions_notified' => $notified], 201);
    }

    /** 리액션 토글 — 같은 (대상,이모지,사용자) 있으면 제거, 없으면 추가. */
    public static function react(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureTables($pdo, $g['isDemo']);
        $b = (array)$req->getParsedBody();
        $type = (string)($b['target_type'] ?? '');
        $tid = (string)($b['target_id'] ?? '');
        $emoji = (string)($b['emoji'] ?? '');
        if (!in_array($type, ['post', 'reply'], true) || !self::validId($tid) || !in_array($emoji, self::EMOJIS, true)) {
            return self::json($resp, ['error' => 'invalid'], 422);
        }
        $me = (string)$g['user_id'];
        try {
            $ex = $pdo->prepare("SELECT id FROM collab_reaction WHERE tenant_id=? AND target_type=? AND target_id=? AND user_id=? AND emoji=?");
            $ex->execute([$tenant, $type, $tid, $me, $emoji]); $rid = $ex->fetchColumn();
            if ($rid !== false) {
                $pdo->prepare("DELETE FROM collab_reaction WHERE id=?")->execute([$rid]);
                return self::json($resp, ['ok' => true, 'reacted' => false]);
            }
            $pdo->prepare("INSERT INTO collab_reaction (id,tenant_id,target_type,target_id,user_id,emoji,created_at) VALUES (?,?,?,?,?,?,?)")
                ->execute([self::genId('rct'), $tenant, $type, $tid, $me, $emoji, gmdate('c')]);
            return self::json($resp, ['ok' => true, 'reacted' => true]);
        } catch (\Throwable $e) { return self::json($resp, ['error' => 'react_failed'], 500); }
    }
}
