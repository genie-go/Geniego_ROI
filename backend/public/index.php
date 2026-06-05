<?php
declare(strict_types=1);

// ── 에러 출력 비활성화 (JSON 응답 보호) ─────────────────────────────────────
// display_errors=1이면 PHP 에러 HTML이 JSON 앞에 출력되어 파싱 실패 발생
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);  // 에러는 error_log에만 기록
ini_set('log_errors', '1');
// ─────────────────────────────────────────────────────────────────────────────

use Slim\Factory\AppFactory;
use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

require __DIR__ . '/../vendor/autoload.php';

date_default_timezone_set('UTC');

// ─────────────────────────────────────────────────────────────────────────────

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

// ── 로컬 개발 환경: htdocs/api Junction으로 서빙 시 basePath 자동 설정 ─────────
// Apache에서 /api/auth/login 요청 시 REQUEST_URI=/api/auth/login 으로 오므로
// Slim이 /api prefix를 제거하고 /auth/login으로 라우팅하도록 설정
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$requestUri  = $_SERVER['REQUEST_URI'] ?? '';
// /api/로 시작하는 경우에만 basePath 적용
if (strpos($requestUri, '/api/') === 0 || $requestUri === '/api') {
    $app->setBasePath('/api');
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// 189차+ 보안: 와일드카드 '*' 제거 → 허용 출처 화이트리스트(요청 Origin 반향, 미허용은 운영 도메인 폴백).
$GENIE_ALLOWED_ORIGINS = [
    'https://roi.genie-go.com', 'https://roidemo.genie-go.com',
    'https://roi.geniego.com',  'https://roidemo.geniego.com',
    'http://localhost:5173', 'http://localhost:4173', 'http://localhost:4180',
];
$app->add(function (Request $request, $handler) use ($GENIE_ALLOWED_ORIGINS) {
    $origin = $request->getHeaderLine('Origin');
    $allow  = in_array($origin, $GENIE_ALLOWED_ORIGINS, true) ? $origin : 'https://roi.genie-go.com';
    $cors = function ($resp) use ($allow) {
        return $resp
            ->withHeader('Access-Control-Allow-Origin', $allow)
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id, Authorization')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    };
    if ($request->getMethod() === 'OPTIONS') {
        return $cors((new \Slim\Psr7\Response())->withStatus(204))->withHeader('Access-Control-Max-Age', '3600');
    }
    return $cors($handler->handle($request));
});

// ── v421 API Key Auth + RBAC (inlined for PHP compatibility) ─────────────────
$app->add(function (Request $request, $handler) {
    $path = $request->getUri()->getPath();

    // Public paths — no API key required
    // Note: when using Alias /api, REQUEST_URI is /api/auth/login (not /auth/login)
    if ($path === '/'
        || preg_match('#^(/api)?/v\d+[\w.]*/health[z]?$#', $path)
        || preg_match('#^(/api)?/v\d+[\w.]*/system/metrics$#', $path)
        || strpos($path, '/auth/') === 0
        || $path === '/auth'
        || strpos($path, '/api/auth/') === 0
        || $path === '/api/auth'
        || strpos($path, '/v423/rollup/') === 0
        || strpos($path, '/api/v423/rollup/') === 0
        || strpos($path, '/v420/price/') === 0
        || strpos($path, '/api/v420/price/') === 0
        || strpos($path, '/v420/channel-mix/') === 0
        || strpos($path, '/api/v420/channel-mix/') === 0
        || strpos($path, '/v423/creds') === 0
        || strpos($path, '/api/v423/creds') === 0
        || strpos($path, '/v423/popups/') === 0
        || strpos($path, '/api/v423/popups/') === 0
        // Paddle Billing v2 — public (webhook is self-signed via HMAC, others are product catalog)
        || $path === '/v423/paddle/webhook' || $path === '/api/v423/paddle/webhook'
        || $path === '/v423/paddle/plans'   || $path === '/api/v423/paddle/plans'
        || $path === '/v423/paddle/config'  || $path === '/api/v423/paddle/config'
        || $path === '/v423/paddle/migrate' || $path === '/api/v423/paddle/migrate'
        // Admin panel — session-based auth (requireAdmin handles its own auth)
        || strpos($path, '/v423/admin/') === 0
        || strpos($path, '/api/v423/admin/') === 0
        // v424/v425 admin — handler-level admin auth via UserAuth::requirePlan('admin')
        || strpos($path, '/v424/admin/') === 0
        || strpos($path, '/api/v424/admin/') === 0
        || strpos($path, '/v425/admin/') === 0
        || strpos($path, '/api/v425/admin/') === 0
        // v424 Creative Store — JWT auth handled in handler
        || strpos($path, '/api/creatives') === 0
        || strpos($path, '/creatives') === 0
        // 190차: CRM / CustomerAI — 세션 기반(UserAuth::requirePro 가 핸들러에서 self-auth + 테넌트 격리).
        //   프론트는 api_key 가 아닌 세션 토큰(genie_token)으로 호출하므로 api_key 미들웨어를 bypass 하고
        //   핸들러가 requirePro 게이트 + authedTenant 로 격리. (admin 패널 세션 인증과 동일 패턴)
        || strpos($path, '/api/crm/') === 0
        || strpos($path, '/crm/') === 0
        // 192차: 상품 카탈로그 writeback(일괄 등록/가격) — 세션 self-auth(requirePro)+테넌트 격리
        || strpos($path, '/api/catalog/') === 0
        || strpos($path, '/catalog/') === 0
        || strpos($path, '/api/customer-ai/') === 0
        || strpos($path, '/customer-ai/') === 0
        // 193차 Sprint4: Reports(리포트 빌더+예약발송) — 세션 self-auth(requirePro+테넌트 격리)
        || strpos($path, '/api/reports/') === 0
        || strpos($path, '/reports/') === 0
        // 190차 Sprint2-b: EmailMarketing 부활 — 세션 기반(requirePro self-auth + 테넌트 격리)
        || strpos($path, '/api/email/') === 0
        || strpos($path, '/email/') === 0
        // 190차 Sprint2-c: KakaoChannel/PixelTracking/JourneyBuilder 부활 — 세션 self-auth + 테넌트 격리.
        //   (pixel/collect 는 공개 비콘 — 핸들러가 pixel_id→tenant 도출, requirePro 미적용)
        || strpos($path, '/api/kakao/') === 0    || strpos($path, '/kakao/') === 0
        || strpos($path, '/api/pixel/') === 0    || strpos($path, '/pixel/') === 0
        || strpos($path, '/api/journey/') === 0  || strpos($path, '/journey/') === 0
        // 191차 채널 부활: SMS/WhatsApp/Instagram — 세션 self-auth(핸들러 requirePro + authedTenant 격리, webhook 무인증)
        || strpos($path, '/api/sms/') === 0        || strpos($path, '/sms/') === 0
        || strpos($path, '/api/whatsapp/') === 0   || strpos($path, '/whatsapp/') === 0
        || strpos($path, '/api/instagram/') === 0  || strpos($path, '/instagram/') === 0
        || strpos($path, '/api/line/') === 0       || strpos($path, '/line/') === 0
    ) {
        return $handler->handle($request);
    }

    // 188차 P0 보안: /v422/ai/* (서버 공용 Claude API 키 = 우리 비용) 무인증 비용남용 차단.
    // 과거엔 public bypass 라 누구나 인증 없이 호출해 Claude 비용을 소진할 수 있었다.
    // 프론트는 세션 토큰(genie_token)으로 호출하므로 api_key 미들웨어로는 막을 수 없어(세션≠api_key),
    // 여기서 'api_key OR 유효 user_session OR demo/local 토큰' 을 요구한다(익명 호출만 차단, 정상 흐름 보존).
    // 196차 Phase2: /v423/auto-campaign/* 도 프론트 세션 토큰(genie_token) 으로 호출 → 동일 게이트
    //   (세션 OR api_key 허용, 익명만 차단). 테넌트는 핸들러가 세션에서 해석.
    if (strpos($path, '/v422/ai/') === 0 || strpos($path, '/api/v422/ai/') === 0
        || strpos($path, '/v423/auto-campaign/') === 0 || strpos($path, '/api/v423/auto-campaign/') === 0) {
        $bearer = '';
        $ah = $request->getHeaderLine('Authorization');
        if (strpos($ah, 'Bearer ') === 0) { $bearer = trim(substr($ah, 7)); }
        if ($bearer === '') { $qp = $request->getQueryParams(); $bearer = (string)($qp['api_key'] ?? $qp['token'] ?? ''); }
        $aiOk = false;
        if ($bearer !== '') {
            // 189차+ 보안: 'demo'/'local' 접두 자동승인 제거(누구나 `Bearer demoX`로 공용 AI 키 비용남용 가능했음).
            //   실 데모 사용자는 데모 백엔드 user_session 에 토큰이 존재하므로 아래 세션 검증으로 정상 통과한다.
            {
                try {
                    $pdoAi = Db::pdo();
                    $sa = $pdoAi->prepare('SELECT 1 FROM api_key WHERE key_hash=? AND is_active=1 LIMIT 1');
                    $sa->execute([hash('sha256', $bearer)]);
                    if ($sa->fetchColumn()) { $aiOk = true; }
                    if (!$aiOk) {
                        $ss = $pdoAi->prepare('SELECT 1 FROM user_session WHERE token=? LIMIT 1');
                        $ss->execute([$bearer]);
                        if ($ss->fetchColumn()) { $aiOk = true; }
                    }
                } catch (\Throwable $eAi) { $aiOk = false; }
            }
        }
        if (!$aiOk) {
            $aiBody = json_encode(['ok' => false, 'error' => 'Unauthorized', 'detail' => 'AI endpoints require a valid session or API key'], JSON_UNESCAPED_UNICODE);
            $aiResp = new \Slim\Psr7\Response();
            $aiResp->getBody()->write($aiBody);
            return $aiResp->withStatus(401)->withHeader('Content-Type', 'application/json');
        }
        return $handler->handle($request);
    }

    // Extract Bearer token or ?api_key=
    $rawKey = '';
    $authHeader = $request->getHeaderLine('Authorization');
    if (strpos($authHeader, 'Bearer ') === 0) {
        $rawKey = trim(substr($authHeader, 7));
    }
    if ($rawKey === '') {
        $params = $request->getQueryParams();
        $rawKey = isset($params['api_key']) ? (string)$params['api_key'] : '';
    }

    $makeJson = function ($status, $data) {
        $body = json_encode($data, JSON_UNESCAPED_UNICODE);
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write($body);
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    };

    if ($rawKey === '') {
        return $makeJson(401, [
            'error'  => 'Unauthorized',
            'detail' => 'API key required. Pass Authorization: Bearer <key> or ?api_key=<key>',
        ]);
    }

    $keyHash = hash('sha256', $rawKey);
    $keyRow  = null;
    try {
        $pdo  = Db::pdo();
        $stmt = $pdo->prepare('SELECT * FROM api_key WHERE key_hash = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$keyHash]);
        $keyRow = $stmt->fetch(\PDO::FETCH_ASSOC);
    } catch (\Exception $ex) {
        error_log('[auth] key lookup error: ' . $ex->getMessage()); // 189차+ 보안: 상세는 로그만
        return $makeJson(401, ['error' => 'Unauthorized', 'detail' => 'Authentication unavailable']);
    }

    if (!$keyRow) {
        return $makeJson(401, ['error' => 'Unauthorized', 'detail' => 'Invalid or inactive API key']);
    }

    if (!empty($keyRow['expires_at']) && strtotime($keyRow['expires_at']) < time()) {
        return $makeJson(401, ['error' => 'Unauthorized', 'detail' => 'API key has expired']);
    }

    // best-effort update last_used_at + use_count 증가(194차 #4: 호출량 추적, 동일 statement→핫패스 비용 무증가)
    try {
        $pdo->prepare('UPDATE api_key SET last_used_at=?, use_count=COALESCE(use_count,0)+1 WHERE id=?')->execute([gmdate('c'), $keyRow['id']]);
    } catch (\Exception $ex2) { /* non-fatal */ }

    // RBAC
    $roleRank = ['viewer' => 0, 'connector' => 1, 'analyst' => 2, 'admin' => 3];
    $method   = strtoupper($request->getMethod());
    $role     = isset($keyRow['role']) ? (string)$keyRow['role'] : 'viewer';
    $rank     = isset($roleRank[$role]) ? $roleRank[$role] : 0;
    $scopes   = json_decode(isset($keyRow['scopes_json']) ? (string)$keyRow['scopes_json'] : '[]', true);
    if (!is_array($scopes)) { $scopes = []; }

    // admin:keys routes need admin:keys scope
    // 192차 보안 P0: /api 별칭(/api/v421/keys)으로 접근 시 이 게이트가 우회되어 일반 write:* 키가
    //   admin 키를 발급할 수 있던 권한상승 차단. bypass 리스트와 동일하게 /api 변형도 매칭한다.
    if (strpos($path, '/v421/keys') === 0 || strpos($path, '/api/v421/keys') === 0) {
        if (!in_array('admin:keys', $scopes, true) && $rank < 3) {
            return $makeJson(403, ['error' => 'Forbidden', 'detail' => 'Scope admin:keys required']);
        }
    } elseif (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        // Write access
        if (!in_array('write:*', $scopes, true)) {
            if (preg_match('#/ingest|/settle/ingest#', $path)) {
                if (!in_array('write:ingest', $scopes, true) && $rank < 1) {
                    return $makeJson(403, ['error' => 'Forbidden', 'detail' => 'write:ingest or connector+ required']);
                }
            } elseif ($rank < 2) {
                return $makeJson(403, ['error' => 'Forbidden', 'detail' => 'Write access requires analyst role or write:* scope']);
            }
        }
    }

    // Attach auth context to request
    $request = $request
        ->withAttribute('auth_key',    $keyRow)
        ->withAttribute('auth_role',   $role)
        ->withAttribute('auth_tenant', (string)$keyRow['tenant_id']);

    // 188차 P0 보안: 크로스테넌트 데이터 유출 차단.
    // 과거엔 클라이언트가 X-Tenant-Id 헤더를 보내면 그대로 두어(if === '' 일 때만 주입),
    // 인증된 api_key 보유자가 임의 테넌트 헤더를 위조해 타 테넌트의 데이터(OAuth 토큰·정산·api키 등)를
    // 읽고/쓸 수 있었다. 이제 인증된 키의 tenant_id 로 '무조건' 덮어써 위조를 원천 차단한다.
    // (api_key 는 단일 tenant_id 에 귀속되므로 다른 테넌트를 표적할 정당한 사유가 없다.)
    $request = $request->withHeader('X-Tenant-Id', (string)$keyRow['tenant_id']);

    return $handler->handle($request);
});

// Health root (public)
$app->get('/', function (Request $request, Response $response) {
    $payload = [
        'name'   => 'GENIE ROI PHP API',
        'status' => 'ok',
        'ts'     => gmdate('c'),
        'auth'   => 'API Key required for all routes (except / and /health)',
        // 189차+ 보안: 동작하는 데모 API 키 평문 노출 제거(무인증 / 응답이 키를 광고하던 결함).
    ];
    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
    return $response->withHeader('Content-Type', 'application/json');
});

$routes = require __DIR__ . '/../src/routes.php';
$routes($app);

// ── Slim Error Middleware (JSON 형식으로 에러 반환) ────────────────────────────
$errorMiddleware = $app->addErrorMiddleware(false, true, true);
$errorMiddleware->setDefaultErrorHandler(function (
    \Psr\Http\Message\ServerRequestInterface $request,
    \Throwable $exception,
    bool $displayErrorDetails,
    bool $logErrors,
    bool $logErrorDetails
) use ($app) {
    $statusCode = 500;
    if ($exception instanceof \Slim\Exception\HttpException) {
        $statusCode = $exception->getCode();
    }
    if ($logErrors) {
        error_log('[Slim] ' . $exception->getMessage() . ' in ' . $exception->getFile() . ':' . $exception->getLine());
    }
    // 189차+ 보안: 내부 경로·스택·예외 메시지 클라 노출 제거(정찰 보조 차단). 서버 로그(error_log)만 상세 보존.
    //   4xx(HttpException)는 안전한 사유문구(Not found/Method not allowed 등)만 노출, 5xx 는 일반 메시지.
    $payload = [
        'ok'    => false,
        'error' => ($exception instanceof \Slim\Exception\HttpException)
            ? $exception->getMessage()
            : '서버 오류가 발생했습니다.',
    ];
    $response = $app->getResponseFactory()->createResponse();
    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
    return $response
        ->withStatus($statusCode)
        ->withHeader('Content-Type', 'application/json')
        ->withHeader('Access-Control-Allow-Origin', '*');
});

$app->run();
