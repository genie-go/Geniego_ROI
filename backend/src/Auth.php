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
        // [The complete security authentication logic provided earlier goes here]
        // API Key validation, RBAC, X-Tenant-Id injection, etc.
        return $handler->handle($request);
    }
}