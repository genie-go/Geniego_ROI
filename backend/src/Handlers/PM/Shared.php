<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * PM Handler 공통 베이스 — N-152-F PM-Core.
 *
 * spec: docs/spec/n152f_pm_features_spec.md §5.1-5.2
 * 12 sub-handler 가 본 클래스를 상속하거나 static helper 호출.
 *
 * 보안 baseline (N-152-A):
 *  - tenant 격리: 모든 쿼리에 tenant_id 필수
 *  - audit_log: 모든 mutation 기록 (append-only)
 *  - prepared statement
 */
abstract class Shared
{
    /* ──────────────────────────────────────────────────────────────────
     * tenant + role gate (OrderHub 패턴 재사용)
     * ────────────────────────────────────────────────────────────────── */

    protected static function gate(Request $req, Response $resp, string $minRole = 'viewer'): array
    {
        $role   = (string)($req->getAttribute('auth_role') ?? '');
        $tenant = (string)($req->getAttribute('auth_tenant') ?? '');

        // 206차: /api/v425/pm/* public bypass(세션 토큰 호출) 시 api_key 미들웨어 미경유로 auth_tenant 부재.
        //   프론트(PMOverview 등)는 세션 토큰(genie_token)으로 호출 → 세션에서 테넌트 자체 해석(journey/wms 패턴).
        //   세션 사용자는 자기 테넌트 PM 전권(admin) — 모든 쿼리 tenant_id 격리로 타 테넌트 접근 불가.
        if ($tenant === '') {
            $st = \Genie\Handlers\UserAuth::authedTenant($req);
            if ($st !== null && $st !== '') { $tenant = $st; if ($role === '') $role = 'admin'; }
        }

        if ($tenant === '') {
            return ['error' => self::json($resp, ['error' => 'tenant_required'], 401)];
        }

        $rank = ['viewer' => 0, 'connector' => 1, 'analyst' => 2, 'admin' => 3];
        $cur = $rank[$role] ?? -1;
        $need = $rank[$minRole] ?? 99;
        if ($cur < $need) {
            return ['error' => self::json($resp, [
                'error'    => 'insufficient_role',
                'required' => $minRole,
                'current'  => $role,
            ], 403)];
        }

        $isDemo = self::isDemoTenant($tenant);
        $pdo = Db::pdoFor($isDemo);

        return [
            'tenant'  => $tenant,
            'role'    => $role,
            'isDemo'  => $isDemo,
            'pdo'     => $pdo,
            'user_id' => $tenant,
            'api_key' => $req->getAttribute('auth_key'),
        ];
    }

    protected static function isDemoTenant(string $tenant): bool
    {
        return $tenant === 'demo' || str_starts_with($tenant, 'demo_') || str_starts_with($tenant, 'demo-');
    }

    /* ──────────────────────────────────────────────────────────────────
     * 응답 + paging
     * ────────────────────────────────────────────────────────────────── */

    protected static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)
                    ->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    protected static function clampLimit(Request $req): array
    {
        $q = $req->getQueryParams();
        $limit  = max(1, min(200, (int)($q['limit'] ?? 50)));
        $offset = max(0, (int)($q['offset'] ?? 0));
        return [$limit, $offset];
    }

    /* ──────────────────────────────────────────────────────────────────
     * audit_log (append-only)
     * ────────────────────────────────────────────────────────────────── */

    protected static function auditLog(\PDO $pdo, array $r): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO pm_audit_log
             (tenant_id, actor_user_id, actor_api_key, entity_type, entity_id, action,
              diff_json, ip_addr, user_agent)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $r['tenant_id'],
            $r['actor_user_id'] ?? null,
            $r['actor_api_key'] ?? null,
            $r['entity_type'],
            $r['entity_id'],
            $r['action'],
            isset($r['diff']) ? json_encode($r['diff'], JSON_UNESCAPED_UNICODE) : null,
            $r['ip'] ?? null,
            $r['ua'] ?? null,
        ]);
    }

    protected static function clientIp(Request $req): ?string
    {
        $s = $req->getServerParams();
        return $s['HTTP_X_FORWARDED_FOR'] ?? $s['HTTP_X_REAL_IP'] ?? $s['REMOTE_ADDR'] ?? null;
    }

    protected static function userAgent(Request $req): ?string
    {
        $ua = $req->getServerParams()['HTTP_USER_AGENT'] ?? null;
        return $ua ? substr((string)$ua, 0, 500) : null;
    }

    /* ──────────────────────────────────────────────────────────────────
     * ID 생성 (ULID-like)
     * ────────────────────────────────────────────────────────────────── */

    protected static function genId(string $prefix): string
    {
        try {
            $rand = bin2hex(random_bytes(8));
        } catch (\Throwable $e) {
            $rand = substr(md5(uniqid('', true)), 0, 16);
        }
        return $prefix . '_' . date('YmdHis') . '_' . $rand;
    }

    /* ──────────────────────────────────────────────────────────────────
     * input validation
     * ────────────────────────────────────────────────────────────────── */

    protected static function validId(string $id): bool
    {
        if ($id === '' || strlen($id) > 64) return false;
        return (bool)preg_match('/^[a-z0-9_-]+$/i', $id);
    }
}
