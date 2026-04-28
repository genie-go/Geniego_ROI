<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * CreativeStore — AI 광고 크리에이티브 서버 저장 + 중복 방지 핸들러
 *
 * 중복 방지 전략:
 *   1) content_hash: SHA-256(title + platform + category + eventType + season + imageData의 앞 500bytes)
 *   2) 동일 content_hash가 이미 존재하면 → 409 Conflict 반환
 *   3) source_page 필드로 어디서 생성했는지 추적
 */
final class CreativeStore
{
    /* ── JSON 응답 헬퍼 ──────────────────────────────────────────── */
    private static function json(Response $res, mixed $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /* ── content_hash 생성 ───────────────────────────────────────── */
    private static function makeHash(array $d): string
    {
        $sig = implode('|', [
            $d['title'] ?? '',
            $d['platform'] ?? '',
            $d['category'] ?? '',
            $d['event_type'] ?? '',
            $d['season'] ?? '',
            substr($d['image_data'] ?? '', 0, 500),   // 이미지 앞 500자로 유사도 판별
        ]);
        return hash('sha256', $sig);
    }

    /* ━━━━ LIST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function list(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $params = $req->getQueryParams();
        $platform = $params['platform'] ?? null;

        $sql = 'SELECT * FROM creative_asset WHERE user_id = ?';
        $bind = [$userId];
        if ($platform) { $sql .= ' AND platform = ?'; $bind[] = $platform; }
        $sql .= ' ORDER BY created_at DESC LIMIT 200';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll();

        // image_data는 목록에서 제외 (크기가 크므로)
        foreach ($rows as &$r) { unset($r['image_data']); }

        return self::json($res, ['creatives' => $rows, 'total' => count($rows)]);
    }

    /* ━━━━ GET ONE (이미지 포함) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function get(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $id = (int)$args['id'];

        $stmt = $pdo->prepare('SELECT * FROM creative_asset WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();

        if (!$row) return self::json($res, ['error' => 'Not found'], 404);
        return self::json($res, $row);
    }

    /* ━━━━ CREATE (중복 방지 핵심) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function create(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $body = (array)$req->getParsedBody();

        // 필수 필드 검증
        $title    = trim($body['title'] ?? '');
        $platform = $body['platform'] ?? 'popup';
        $category = $body['category'] ?? 'general';
        $eventType = $body['event_type'] ?? 'sale';
        $season   = $body['season'] ?? 'spring';
        $imageData = $body['image_data'] ?? '';
        $linkUrl  = $body['link_url'] ?? '';
        $sourcePage = $body['source_page'] ?? 'auto-marketing';  // 어디서 생성했는지

        if ($title === '' && $imageData === '') {
            return self::json($res, ['error' => 'title or image_data required'], 400);
        }

        // ── 중복 방지: content_hash 계산 ───────────────
        $hash = self::makeHash($body);

        // 동일 hash 존재 확인
        $dup = $pdo->prepare('SELECT id, title, platform, source_page, created_at FROM creative_asset WHERE user_id = ? AND content_hash = ?');
        $dup->execute([$userId, $hash]);
        $existing = $dup->fetch();

        if ($existing) {
            return self::json($res, [
                'error' => 'duplicate',
                'message' => '동일한 크리에이티브가 이미 존재합니다',
                'existing' => $existing,
            ], 409);
        }

        // ── 저장 ─────────────────────────────────────
        $now = gmdate('c');
        $stmt = $pdo->prepare('INSERT INTO creative_asset
            (user_id, title, platform, category, event_type, season, image_data, link_url, source_page, content_hash, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId, $title, $platform, $category, $eventType, $season,
            $imageData, $linkUrl, $sourcePage, $hash, 'ready', $now,
        ]);

        $id = (int)$pdo->lastInsertId();
        return self::json($res, [
            'id' => $id,
            'content_hash' => $hash,
            'message' => 'Creative saved successfully',
        ], 201);
    }

    /* ━━━━ UPDATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function update(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $id = (int)$args['id'];
        $body = (array)$req->getParsedBody();

        // 소유권 확인
        $check = $pdo->prepare('SELECT id FROM creative_asset WHERE id = ? AND user_id = ?');
        $check->execute([$id, $userId]);
        if (!$check->fetch()) return self::json($res, ['error' => 'Not found'], 404);

        $sets = [];
        $vals = [];
        foreach (['title','platform','category','event_type','season','image_data','link_url','status'] as $col) {
            if (isset($body[$col])) { $sets[] = "$col = ?"; $vals[] = $body[$col]; }
        }
        if (empty($sets)) return self::json($res, ['error' => 'No fields to update'], 400);

        // content_hash 재생성
        $newHash = self::makeHash($body);
        $sets[] = 'content_hash = ?';
        $vals[] = $newHash;
        $sets[] = 'updated_at = ?';
        $vals[] = gmdate('c');
        $vals[] = $id;
        $vals[] = $userId;

        $pdo->prepare("UPDATE creative_asset SET " . implode(', ', $sets) . " WHERE id = ? AND user_id = ?")->execute($vals);
        return self::json($res, ['id' => $id, 'updated' => true]);
    }

    /* ━━━━ DELETE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function delete(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $id = (int)$args['id'];

        $stmt = $pdo->prepare('DELETE FROM creative_asset WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        return self::json($res, ['deleted' => $stmt->rowCount() > 0]);
    }

    /* ━━━━ DUPLICATE CHECK (저장 전 사전 확인용) ━━━━━━━━━━━━━━━━━ */
    public static function checkDuplicate(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $body = (array)$req->getParsedBody();
        $hash = self::makeHash($body);

        $stmt = $pdo->prepare('SELECT id, title, platform, source_page, created_at FROM creative_asset WHERE user_id = ? AND content_hash = ?');
        $stmt->execute([$userId, $hash]);
        $existing = $stmt->fetch();

        return self::json($res, [
            'isDuplicate' => $existing ? true : false,
            'existing' => $existing ?: null,
            'content_hash' => $hash,
        ]);
    }

    /* ── userId 추출 (JWT 토큰 또는 기본값) ───────────────────── */
    private static function userId(Request $req): string
    {
        // JWT에서 user_id 추출 시도
        $authHeader = $req->getHeaderLine('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                if (isset($payload['sub'])) return (string)$payload['sub'];
                if (isset($payload['user_id'])) return (string)$payload['user_id'];
                if (isset($payload['id'])) return (string)$payload['id'];
            }
        }
        return 'default';
    }
}
