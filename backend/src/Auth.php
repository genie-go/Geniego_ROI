<?php
declare(strict_types=1);

namespace Genie;

use Genie\Db;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;

/**
 * v421 API Key Authentication + RBAC Middleware (PHP 7.0+ compatible)
 *
 * Usage: Authorization: Bearer <api_key>   or   ?api_key=<key>
 *
 * Roles (ascending privileges):
 *   viewer < connector < analyst < admin
 *
 * Public (no auth): GET /   and   GET /v{n}-/health[z]
 */
final class Auth
{
    /** @return bool */
    private static function isPublic($path)
    {
        if ($path === '/') return true;
        if (preg_match('#^/v[\d]+[\w.]*/health[z]?$#', $path)) return true;
        if (strpos($path, '/v423/rollup/') === 0) return true;
        if (strpos($path, '/v420/price/') === 0) return true;
        if (strpos($path, '/v420/channel-mix/') === 0) return true;
        if (strpos($path, '/api/v420/price/') === 0) return true;
        if (strpos($path, '/api/v420/channel-mix/') === 0) return true;
        // v422 Claude AI - auth handled internally via session token
        if (strpos($path, '/v422/ai/') === 0) return true;
        if (strpos($path, '/api/v422/ai/') === 0) return true;
        // v423 Channel Credentials - auth handled internally via session cookie
        if (strpos($path, '/v423/creds') === 0) return true;
        if (strpos($path, '/api/v423/creds') === 0) return true;
        // Session auth endpoints - no API key required
        // Note: with Alias /api, path may be /api/auth/login or /auth/login
        if (strpos($path, '/auth/') === 0) return true;
        if (strpos($path, '/api/auth/') === 0) return true;
        return false;

    }

    /** @return int */
    private static function roleRank($role)
    {
        $ranks = ['viewer' => 0, 'connector' => 1, 'analyst' => 2, 'admin' => 3];
        return isset($ranks[$role]) ? $ranks[$role] : 0;
    }

    public static function middleware(Request $request, Handler $handler): Response
    {
        $path = $request->getUri()->getPath();

        if (self::isPublic($path)) {
            return $handler->handle($request);
        }

        // Extract raw key from Bearer header or ?api_key= param
        $rawKey = '';
        $authHeader = $request->getHeaderLine('Authorization');
        if (strpos($authHeader, 'Bearer ') === 0) {
            $rawKey = substr($authHeader, 7);
        }
        if ($rawKey === '') {
            $params = $request->getQueryParams();
            $rawKey = (string)($params['api_key'] ?? '');
        }

        if ($rawKey === '') {
            return self::unauthorized('API key required. Pass Authorization: Bearer <key> or ?api_key=<key>');
        }

        $keyHash = hash('sha256', $rawKey);
        $keyRow  = null;
        try {
            $pdo  = Db::pdo();
            $stmt = $pdo->prepare(
                'SELECT * FROM api_key WHERE key_hash = ? AND is_active = 1 LIMIT 1'
            );
            $stmt->execute([$keyHash]);
            $keyRow = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::unauthorized('Auth backend error: ' . $e->getMessage());
        }

        if (!$keyRow) {
            // ── Fallback: Check session token (from /auth/login) ──────────────
            try {
                $now  = gmdate('Y-m-d\TH:i:s\Z');
                $stmt2 = $pdo->prepare(
                    'SELECT u.id, u.email, u.name, u.plan
                       FROM user_session s
                       JOIN app_user u ON u.id = s.user_id
                      WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
                      LIMIT 1'
                );
                $stmt2->execute([$rawKey, $now]);
                $sessionUser = $stmt2->fetch(\PDO::FETCH_ASSOC);
                if ($sessionUser) {
                    // Session token accepted — attach minimal auth context
                    $request = $request
                        ->withAttribute('auth_user', $sessionUser)
                        ->withAttribute('auth_role', $sessionUser['plan'] === 'pro' ? 'analyst' : 'viewer')
                        ->withAttribute('auth_tenant', (string)$sessionUser['id']);
                    return $handler->handle($request);
                }
            } catch (\Throwable $se) {
                return self::unauthorized('Session lookup error: ' . $se->getMessage());
            }
            return self::unauthorized('Invalid or inactive API key');
        }

        // Check expiry
        if (!empty($keyRow['expires_at']) && strtotime((string)$keyRow['expires_at']) < time()) {
            return self::unauthorized('API key has expired');
        }

        // Update last_used_at (best-effort)
        try {
            $pdo->prepare('UPDATE api_key SET last_used_at=? WHERE id=?')
                ->execute([gmdate('c'), $keyRow['id']]);
        } catch (\Throwable $upd) {
            // non-fatal
        }

        // RBAC check
        $method = strtoupper($request->getMethod());
        $role   = (string)($keyRow['role'] ?? 'viewer');
        $raw    = $keyRow['scopes_json'] ?? '[]';
        $scopes = json_decode((string)$raw, true);
        if (!is_array($scopes)) {
            $scopes = [];
        }

        $denied = self::checkAccess($method, $path, $role, $scopes);
        if ($denied !== null) {
            return self::forbidden($denied);
        }

        // Attach auth context
        $request = $request
            ->withAttribute('auth_key',    $keyRow)
            ->withAttribute('auth_role',   $role)
            ->withAttribute('auth_tenant', (string)$keyRow['tenant_id']);

        if ($request->getHeaderLine('X-Tenant-Id') === '') {
            $request = $request->withHeader('X-Tenant-Id', (string)$keyRow['tenant_id']);
        }

        return $handler->handle($request);
    }

    /**
     * @param string   $method
     * @param string   $path
     * @param string   $role
     * @param string[] $scopes
     * @return string|null  null = allowed, string = denial reason
     */
    private static function checkAccess($method, $path, $role, array $scopes)
    {
        $rank = self::roleRank($role);

        // API Key management requires admin:keys scope
        if (strpos($path, '/v421/keys') === 0) {
            if (!in_array('admin:keys', $scopes, true) && $rank < self::roleRank('admin')) {
                return 'Scope admin:keys required for key management';
            }
            return null;
        }

        // Write operations
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            if (in_array('write:*', $scopes, true)) {
                return null;
            }
            // Connector-level ingest
            if (preg_match('#/ingest|/settle/ingest#', $path)) {
                if (in_array('write:ingest', $scopes, true) || $rank >= self::roleRank('connector')) {
                    return null;
                }
                return 'Scope write:ingest or role connector+ required';
            }
            if ($rank >= self::roleRank('analyst')) {
                return null;
            }
            return 'Write access requires analyst role or write:* scope';
        }

        // GET: viewer and up
        if ($method === 'GET') {
            if (in_array('read:*', $scopes, true) || $rank >= self::roleRank('viewer')) {
                return null;
            }
        }

        return null;
    }

    /** @return Response */
    private static function unauthorized($msg)
    {
        $body = json_encode(
            ['error' => 'Unauthorized', 'detail' => $msg],
            JSON_UNESCAPED_UNICODE
        );
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write((string)$body);
        return $response
            ->withStatus(401)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('WWW-Authenticate', 'Bearer realm="Geniego-ROI"');
    }

    /** @return Response */
    private static function forbidden($msg)
    {
        $body = json_encode(
            ['error' => 'Forbidden', 'detail' => $msg],
            JSON_UNESCAPED_UNICODE
        );
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write((string)$body);
        return $response
            ->withStatus(403)
            ->withHeader('Content-Type', 'application/json');
    }
}
