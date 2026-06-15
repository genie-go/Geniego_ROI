<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v421 API Key Management
 * Required scope: admin:keys  (role >= admin)
 *
 * Routes:
 *   GET    /v421/keys           list keys for tenant
 *   POST   /v421/keys           create new key
 *   DELETE /v421/keys/{id}      revoke key
 *   POST   /v421/keys/{id}/rotate  rotate (invalidate + create new)
 *   GET    /v421/keys/whoami    return current key info
 */
final class Keys
{
    private static function tenantId(Request $request): string
    {
        // [현 차수] 하드닝: 미들웨어가 키/세션에서 서버도출해 주입한 auth_tenant 우선 — raw 헤더 신뢰 회귀 방지.
        //   (API 키 발급/조회는 민감 — bypass 추가 시에도 교차테넌트 위조 차단.)
        $auth = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($auth !== '') return $auth;
        $tid = $request->getHeaderLine('X-Tenant-Id');
        return $tid !== '' ? $tid : 'demo';
    }

    private static function generateKey(string $prefix): array
    {
        $secret = $prefix . bin2hex(random_bytes(16));
        return [
            'raw'    => $secret,
            'prefix' => $prefix,
            'hash'   => hash('sha256', $secret),
        ];
    }

    public static function whoami(Request $request, Response $response, array $args): Response
    {
        $keyRow = $request->getAttribute('auth_key', []);
        if (empty($keyRow)) {
            return TemplateResponder::respond($response->withStatus(401), ['error' => 'Not authenticated']);
        }
        $safe = $keyRow;
        unset($safe['key_hash']);          // never expose
        $safe['scopes'] = json_decode((string)($keyRow['scopes_json'] ?? '[]'), true);
        unset($safe['scopes_json']);
        return TemplateResponder::respond($response, ['ok' => true, 'key' => $safe]);
    }

    public static function list(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);

        $stmt = $pdo->prepare(
            'SELECT id, tenant_id, key_prefix, name, role, scopes_json, is_active, last_used_at, expires_at, created_at
             FROM api_key WHERE tenant_id=? ORDER BY created_at DESC'
        );
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['scopes'] = json_decode((string)($r['scopes_json'] ?? '[]'), true);
            unset($r['scopes_json']);
        }

        return TemplateResponder::respond($response, [
            'ok'   => true,
            'keys' => $rows,
            'note' => 'key values are not stored; only prefix and SHA-256 hash.',
        ]);
    }

    public static function create(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $name       = trim((string)($body['name'] ?? ''));
        $role       = trim((string)($body['role'] ?? 'viewer'));
        $prefix     = trim((string)($body['prefix'] ?? 'genie_key_'));
        $expiresAt  = $body['expires_at'] ?? null;

        if ($name === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'name required']);
        }
        $validRoles = ['viewer', 'connector', 'analyst', 'admin'];
        if (!in_array($role, $validRoles, true)) {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'invalid role', 'valid' => $validRoles]);
        }
        // [225차 P2-4] 클라 제공 scopes 무검증 수용 차단(권한상승 통로): 화이트리스트 + 역할 상한 검증.
        //   요청 scope 가 미지 토큰이거나 해당 role 이 가질 수 없는 권한이면 422(예: viewer 키에 write:*/admin:keys).
        if (array_key_exists('scopes', $body)) {
            $reqScopes = is_array($body['scopes']) ? array_values(array_unique(array_map('strval', $body['scopes']))) : null;
            if ($reqScopes === null) {
                return TemplateResponder::respond($response->withStatus(422), ['error' => 'scopes must be an array']);
            }
            $allowed = self::allowedScopesForRole($role);
            $bad = array_values(array_diff($reqScopes, $allowed));
            if (!empty($bad)) {
                return TemplateResponder::respond($response->withStatus(422), ['error' => 'invalid or over-privileged scopes', 'rejected' => $bad, 'allowed' => $allowed]);
            }
            $scopesJson = json_encode($reqScopes);
        } else {
            $scopesJson = json_encode(self::defaultScopes($role));
        }

        ['raw' => $raw, 'prefix' => $pfx, 'hash' => $hash] = self::generateKey($prefix);

        $stmt = $pdo->prepare(
            'INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,expires_at,created_at)
             VALUES(?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([$tenant, $pfx, $hash, $name, $role, $scopesJson, 1, $expiresAt, gmdate('c')]);
        $id = (int)$pdo->lastInsertId();

        return TemplateResponder::respond($response, [
            'ok'         => true,
            'id'         => $id,
            'api_key'    => $raw,       // returned ONCE only
            'key_prefix' => $pfx,
            'role'       => $role,
            'warning'    => 'Store this key securely — it will NOT be shown again.',
        ]);
    }

    public static function revoke(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $id     = (int)($args['id'] ?? 0);

        $stmt = $pdo->prepare('UPDATE api_key SET is_active=0 WHERE id=? AND tenant_id=?');
        $stmt->execute([$id, $tenant]);

        if ($stmt->rowCount() === 0) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'Key not found']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'revoked_id' => $id]);
    }

    public static function rotate(Request $request, Response $response, array $args): Response
    {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $id     = (int)($args['id'] ?? 0);

        // Get current key meta
        $old = $pdo->prepare('SELECT * FROM api_key WHERE id=? AND tenant_id=? AND is_active=1');
        $old->execute([$id, $tenant]);
        $oldRow = $old->fetch(PDO::FETCH_ASSOC);
        if (!$oldRow) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'Key not found or already inactive']);
        }

        // Revoke old
        $pdo->prepare('UPDATE api_key SET is_active=0 WHERE id=?')->execute([$id]);

        // Create new
        ['raw' => $raw, 'prefix' => $pfx, 'hash' => $hash] = self::generateKey((string)$oldRow['key_prefix']);
        $stmt = $pdo->prepare(
            'INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,expires_at,created_at)
             VALUES(?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $tenant, $pfx, $hash,
            $oldRow['name'] . ' (rotated)',
            $oldRow['role'], $oldRow['scopes_json'], 1, $oldRow['expires_at'], gmdate('c'),
        ]);
        $newId = (int)$pdo->lastInsertId();

        return TemplateResponder::respond($response, [
            'ok'           => true,
            'revoked_id'   => $id,
            'new_id'       => $newId,
            'api_key'      => $raw,
            'warning'      => 'Store this key securely — it will NOT be shown again.',
        ]);
    }

    private static function defaultScopes(string $role): array
    {
        if ($role === 'admin')     return ['read:*', 'write:*', 'admin:keys'];
        if ($role === 'analyst')   return ['read:*', 'write:attribution', 'write:mta'];
        if ($role === 'connector') return ['read:*', 'write:ingest'];
        return ['read:*'];
    }

    /**
     * [225차 P2-4] 역할별 부여 가능한 scope 상한(화이트리스트). 발급 요청 scope 는 이 집합의 부분집합이어야 한다.
     *   상위 역할일수록 더 넓은 권한 부여 가능. 미지 토큰/상위권한 요청은 발급 거부(권한상승 차단).
     */
    private static function allowedScopesForRole(string $role): array
    {
        $base    = ['read:*'];
        $write   = ['write:*', 'write:ingest', 'write:attribution', 'write:mta'];
        $adminSc = ['admin:keys', 'admin:*'];
        if ($role === 'admin')     return array_merge($base, $write, $adminSc);
        if ($role === 'analyst')   return array_merge($base, $write);
        if ($role === 'connector') return array_merge($base, ['write:ingest']);
        return $base; // viewer
    }
}

