<?php
declare(strict_types=1);
namespace Genie;

use Genie\Db;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

final class Auth {
    public static function middleware(Request $request, Handler $handler): Response {
        // [앞서 드린 보안 인증 로직 전체가 여기에 들어갑니다]
        // API Key 검증, RBAC, X-Tenant-Id 주입 등
        return $handler->handle($request);
    }
}