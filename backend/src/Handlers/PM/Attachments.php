<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Attachments Handler — N-152-F §4.1 (skeleton, 서명 URL pattern).
 *
 * 본 skeleton 은 서명 URL 발급 + 메타 등록까지. 실제 S3-compat / local storage 연동은 별도 트랙.
 */
final class Attachments extends Shared
{
    /** POST /v425/pm/attachments/sign — 서명 URL 발급 (skeleton — placeholder URL) */
    public static function signUpload(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $body = (array)$req->getParsedBody();
        $filename = (string)($body['filename'] ?? '');
        $mime = (string)($body['mime_type'] ?? '');
        $size = (int)($body['size_bytes'] ?? 0);
        if ($filename === '' || $size <= 0 || $size > 100 * 1024 * 1024) {
            return self::json($resp, ['error' => 'invalid_input'], 422);
        }
        $key = sprintf('pm/%s/%s_%s',
            $g['tenant'],
            date('YmdHis'),
            preg_replace('/[^A-Za-z0-9._-]/', '_', $filename)
        );
        // Skeleton: 실제 storage backend 연동은 별도 트랙. URL 은 placeholder.
        $url = sprintf('/v425/pm/attachments/upload?key=%s&exp=%d',
            urlencode($key), time() + 600);
        return self::json($resp, [
            'storage_key' => $key,
            'upload_url'  => $url,
            'expires_in'  => 600,
        ]);
    }

    /** POST /v425/pm/attachments — 업로드 완료 후 메타 등록 */
    public static function create(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $body = (array)$req->getParsedBody();
        $filename = (string)($body['filename'] ?? '');
        $sha = (string)($body['sha256_hex'] ?? '');
        $key = (string)($body['storage_key'] ?? '');
        $size = (int)($body['size_bytes'] ?? 0);
        if ($filename === '' || strlen($sha) !== 64 || $key === '' || $size <= 0) {
            return self::json($resp, ['error' => 'invalid_input'], 422);
        }
        $id = self::genId('att');
        $g['pdo']->prepare(
            'INSERT INTO pm_attachments
             (id, tenant_id, task_id, comment_id, filename, mime_type, size_bytes, sha256_hex,
              storage_key, uploaded_by)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $g['tenant'],
            $body['task_id'] ?? null,
            $body['comment_id'] ?? null,
            $filename,
            $body['mime_type'] ?? null,
            $size, $sha, $key, $g['user_id'],
        ]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'attachment',
            'entity_id' => $id, 'action' => 'create',
            'diff' => ['filename' => $filename, 'sha256' => $sha, 'size' => $size],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }
}
