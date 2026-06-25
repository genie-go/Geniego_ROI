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
    // 203차 Phase M1 — Capacitor 네이티브 앱(iOS capacitor://, Android https://localhost) WebView 출처
    'capacitor://localhost', 'https://localhost', 'http://localhost', 'ionic://localhost',
];
$app->add(function (Request $request, $handler) use ($GENIE_ALLOWED_ORIGINS) {
    $origin = $request->getHeaderLine('Origin');
    $allow  = in_array($origin, $GENIE_ALLOWED_ORIGINS, true) ? $origin : 'https://roi.genie-go.com';
    $cors = function ($resp) use ($allow) {
        return $resp
            ->withHeader('Access-Control-Allow-Origin', $allow)
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id, Authorization, X-Lang')
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
        // [237차] 헬스 프로브(대시보드 시스템현황 위젯 HEAD 핑) — 인증 불요 공개 라우트. 라우트 부재로
        //   /api/ping 은 401(미들웨어), /api/auth/check 는 404 라 위젯이 정상인데도 항상 경고를 띄웠다.
        || $path === '/ping' || $path === '/api/ping'
        || $path === '/auth/check' || $path === '/api/auth/check'
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
        // [현 차수] 발급 신청(connectors/apply)·채널 연결테스트(connectors/{ch}/test) — ChannelCreds 핸들러가
        //   세션 self-auth(tenantId=user_session, denyAnon) + 테넌트 격리. 프론트가 세션 토큰으로 호출하므로
        //   api_key 미들웨어에 막혀 401("발급 신청하기"·"Test" 버튼 불능)이었다. ★/v423/connectors/sync 와
        //   meta/google insights 는 Connectors(raw X-Tenant-Id 헤더 의존)라 bypass 제외(307 강제 보호 유지).
        || strpos($path, '/v423/connectors/apply') === 0 || strpos($path, '/api/v423/connectors/apply') === 0  // [현 차수] apply + apply/list + apply/{ticket}/status (핸들러 자체 인증·관리자게이트)
        || preg_match('#^(/api)?/v423/connectors/[^/]+/test$#', $path)
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
        // [현 차수] 통합 채널 레지스트리 — 세션 self-auth(listChannels=requirePro, admin=requirePlan('admin'))
        || strpos($path, '/v426/channels') === 0
        || strpos($path, '/api/v426/channels') === 0
        // [현 차수] v427 Logistics 배송추적 / PG 정산 — 세션 self-auth(authedTenant, 익명→demo) + tenant_id 격리.
        || strpos($path, '/v427/logistics/') === 0
        || strpos($path, '/api/v427/logistics/') === 0
        || strpos($path, '/v427/pg/') === 0
        || strpos($path, '/api/v427/pg/') === 0
        // [현 차수 P1] v429 Open Platform — 웹훅 구독은 세션 self-auth(UserAuth::requirePro+authedTenant
        //   격리), 카탈로그(webhooks/events·openapi.json)는 무인증 공개. /v429/ 는 핸들러가 자체 게이트하므로
        //   api_key 미들웨어 bypass(CRM/catalog/reports 동일 패턴). 발신 서명은 엔드포인트별 secret HMAC.
        || strpos($path, '/v429/') === 0
        || strpos($path, '/api/v429/') === 0
        || strpos($path, '/v426/admin/') === 0
        || strpos($path, '/api/v426/admin/') === 0
        // 212차 #3-B: 파트너 포털 — 파트너 토큰 자가인증(본사 api_key/세션과 분리, 핸들러가 partner_session 검증)
        || strpos($path, '/partner/') === 0
        || strpos($path, '/api/partner/') === 0
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
        // 205차 WMS 영속화: 창고/택배사/권한/입출고/피킹/발주/LOT — 세션 self-auth(Wms::requirePro + authedTenant 격리)
        || strpos($path, '/api/wms/') === 0      || strpos($path, '/wms/') === 0
        // 206차 #5 수요예측 서버측 실모델 — 세션 self-auth(DemandForecast::requirePro + authedTenant 격리)
        || strpos($path, '/api/demand/') === 0   || strpos($path, '/demand/') === 0
        // 206차 PM-Core(/v425/pm/*) — 프론트가 세션 토큰으로 호출(api_key 아님). PM Shared::gate 가
        //   세션에서 테넌트 자체 해석(authedTenant)+tenant_id 격리. 미bypass 시 api_key 미들웨어 401.
        || strpos($path, '/api/v425/pm/') === 0  || strpos($path, '/v425/pm/') === 0
        // 208차 라이브 커머스(/v425/live/*) — 프론트 세션 토큰 호출(api_key 아님). LiveCommerce::requirePro +
        //   authedTenant 격리. SSE stream 은 ?token= 로 인증(EventSource 헤더 불가). 미bypass 시 api_key 401.
        || strpos($path, '/api/v425/live/') === 0 || strpos($path, '/v425/live/') === 0
        // 208차 #2 OAuth 프레임워크(/v425/oauth/*) — callback 은 provider 리다이렉트라 무인증(state→tenant),
        //   authorize/status 는 세션 self-auth(OAuth::requirePro). api_key 미들웨어 bypass.
        || strpos($path, '/api/v425/oauth/') === 0 || strpos($path, '/v425/oauth/') === 0
        // 191차 채널 부활: SMS/WhatsApp/Instagram — 세션 self-auth(핸들러 requirePro + authedTenant 격리, webhook 무인증)
        || strpos($path, '/api/sms/') === 0        || strpos($path, '/sms/') === 0
        || strpos($path, '/api/whatsapp/') === 0   || strpos($path, '/whatsapp/') === 0
        || strpos($path, '/api/instagram/') === 0  || strpos($path, '/instagram/') === 0
        || strpos($path, '/api/line/') === 0       || strpos($path, '/line/') === 0
        // 202차 항목2c: ChannelSync(커머스 채널 연동/동기화) — 세션 기반(ChannelSync::tenant=user_session,
        //   미해결 시 demo 버킷). OmniChannel/CatalogSync 등이 세션토큰으로 호출 → api_key 401 해소.
        //   webhook(/api/channel-sync/webhooks/*)은 핸들러가 무인증 수신 처리.
        || strpos($path, '/api/channel-sync/') === 0 || strpos($path, '/channel-sync/') === 0
        // 204차: GDPR 동의 배너(GdprBanner.jsx → /api/gdpr/consent) — 프론트가 세션 토큰(또는 익명)으로
        //   호출하는데 api_key 미들웨어에 막혀 동의 저장이 401 로 깨져 있었다(컴플라이언스 기능 불능).
        //   핸들러가 Bearer→user_session 으로 user 를 자체 해석(익명 허용)하므로 bypass 가 안전.
        || strpos($path, '/api/gdpr/') === 0 || strpos($path, '/gdpr/') === 0
        // [현 차수] v420 SupplyChain Visibility(공급망: lines/suppliers/risk-rules/summary) — 세션 self-auth
        //   (SupplyChain::tenant=UserAuth::authedTenant, 익명→demo 버킷)+tenant_id 격리. 라이트테마 재작성 때
        //   프론트 배선이 드롭됐고, 미bypass라 세션토큰 호출이 api_key 미들웨어에 막혀(세션≠api_key) 운영에서
        //   공급사/라인/리스크가 항상 빈 배열이었다. WMS/ChannelSync 와 동일 패턴으로 bypass.
        || strpos($path, '/v420/supply/') === 0 || strpos($path, '/api/v420/supply/') === 0
        // [현 차수] H4: InfluencerUGC 라이브 데이터(/v423/influencer/*) — 세션 self-auth(Influencer::requirePro
        //   + authedTenant 격리). 프론트가 세션 토큰으로 호출하므로 api_key 미들웨어 bypass(미설정 시 401).
        || strpos($path, '/v423/influencer/') === 0 || strpos($path, '/api/v423/influencer/') === 0
        // [228차 R4] 리뷰 임베드 위젯·신뢰배지 — 외부 사이트 삽입용 공개 노출(token→tenant 격리, 인증 불요).
        //   widget/view(iframe HTML)·widget/data(JSON)·badge(SVG). ★widget-config 는 제외(인증 필요=AI-gate).
        || strpos($path, '/v428/reviews/widget/') === 0 || strpos($path, '/api/v428/reviews/widget/') === 0
        || strpos($path, '/v428/reviews/badge') === 0   || strpos($path, '/api/v428/reviews/badge') === 0
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
        || strpos($path, '/v423/auto-campaign/') === 0 || strpos($path, '/api/v423/auto-campaign/') === 0
        // 201차: 마케팅 자동화 추천/벤치마크 — 프론트 세션 토큰 호출(익명만 차단, 핸들러가 세션에서 테넌트 해석)
        || strpos($path, '/v424/marketing/auto-recommend') === 0 || strpos($path, '/api/v424/marketing/auto-recommend') === 0
        || strpos($path, '/v424/marketing/benchmarks') === 0 || strpos($path, '/api/v424/marketing/benchmarks') === 0
        // [현 차수] 채널×objective 퍼널 집계 — 프론트 세션 토큰 호출(익명만 차단, tenant 주입).
        || strpos($path, '/v424/connectors/campaign-funnel') === 0 || strpos($path, '/api/v424/connectors/campaign-funnel') === 0
        // [228차 S1] 매체보고 vs 실주문귀속 ROAS 정합 — 세션 토큰 호출(익명 차단, auth_tenant 주입·격리).
        || strpos($path, '/v423/connectors/roas-reconciliation') === 0 || strpos($path, '/api/v423/connectors/roas-reconciliation') === 0
        // [228차 S2] 어트리뷰션(markov 모델·여정·터치·채널·시계열) — 프론트 세션 토큰 호출(익명 차단, auth_tenant 주입).
        //   기존 미bypass라 세션토큰이 api_key 미들웨어에 막혀 어트리뷰션 페이지가 항상 빈 데이터였음. 핸들러는 auth_tenant 격리.
        || strpos($path, '/v424/attribution/') === 0 || strpos($path, '/api/v424/attribution/') === 0
        // [228차 R1] 리뷰/UGC — 프론트 세션 토큰 호출(익명 차단, auth_tenant 격리주입). 핸들러 tenant=auth_tenant.
        || strpos($path, '/v428/reviews') === 0 || strpos($path, '/api/v428/reviews') === 0
        // [현 차수] ② MMM(마케팅 믹스 모델)·예산 최적화 — 프론트 세션 토큰 호출(익명만 차단, 핸들러가 세션 테넌트 해석)
        || strpos($path, '/v424/mmm/') === 0 || strpos($path, '/api/v424/mmm/') === 0
        || strpos($path, '/v424/anomaly/') === 0 || strpos($path, '/api/v424/anomaly/') === 0
        // [현 차수] 광고비 결제수단(빌링키)·관리형 지출 월렛 — 프론트 세션 토큰 호출(익명만 차단,
        //   핸들러가 세션에서 테넌트 해석·데모 차단). 결제 정보라 절대 anonymous 허용 금지.
        || strpos($path, '/v427/billing/') === 0 || strpos($path, '/api/v427/billing/') === 0
        // [237차] OrderHub Aggregator(주문/클레임/정산) — 프론트(GlobalDataContext·OrderHub 페이지)가 세션
        //   토큰(genie_token)으로 호출하는데, 이 경로가 public bypass·세션게이트 어디에도 없어 strict
        //   api_key 미들웨어가 세션 토큰을 거부(401) → 운영 세션 사용자(관리자 포함) 전원이 주문/정산
        //   데이터를 한 줄도 못 받던 선재 결함. OrderHub 핸들러는 self-auth 없이 미들웨어 auth_tenant 만
        //   신뢰하므로(no_tenant 401), full bypass(인증 skip=tenant 미주입)가 아니라 세션→auth_tenant 주입을
        //   수행하는 본 게이트에 편입해야 한다. api_key 경유 호출(원래 설계)도 그대로 보존(키 tenant 주입).
        || strpos($path, '/v424/orderhub/') === 0 || strpos($path, '/api/v424/orderhub/') === 0
        // [237차] KrChannel(국내채널 정산/수수료/대사 /v419/kr/*) — 프론트(/kr-channel)가 세션 토큰으로
        //   호출하나 bypass·세션게이트 부재로 strict api_key 미들웨어가 거부(401). 핸들러는 OrderHub 와
        //   동일하게 self-auth 없이 미들웨어 auth_tenant 만 신뢰하므로 세션→auth_tenant 주입 게이트에 편입.
        || strpos($path, '/v419/kr/') === 0 || strpos($path, '/api/v419/kr/') === 0
        // [237차] admin 전메뉴 라이브 스윕(69페이지)서 발견된 동일 클래스 세션 인증갭 4페이지:
        //   GraphScore(/v419/graph/* — 그래프 스코어)·AttributionMetrics(/v424/marketing/* — 마케팅 일별추이)·
        //   AdPerformance(/v1/ad-performance/* 광고성과·/performance/meta-ads 어카운트성과). 셋 다 핸들러가
        //   auth_tenant(미들웨어 주입) 우선 사용(GraphScore/AdPerformance는 세션 self-auth 폴백도 보유)이라
        //   세션→auth_tenant 주입 게이트 편입이 정합. marketing 은 prefix 로 향후 갭 방지(auto-recommend/
        //   benchmarks 이미 위 블록 포함, daily-trends 누락분 흡수).
        || strpos($path, '/v419/graph/') === 0 || strpos($path, '/api/v419/graph/') === 0
        || strpos($path, '/v424/marketing/') === 0 || strpos($path, '/api/v424/marketing/') === 0
        // [237차 감사] viewer 메뉴트리(/v425/menu-tree) — 프론트(MenuVisibilityContext) 가 admin 트리 403 시
        //   세션 토큰으로 폴백 호출하는데 게이트 부재로 401 → 메뉴 가시성 캐시폴백. AdminMenu::gate(viewer) 는
        //   auth_tenant+auth_role(위에서 viewer 주입)만 읽으므로 세션 게이트 편입이 정합. (admin 트리는 별도 bypass.)
        || $path === '/v425/menu-tree' || $path === '/api/v425/menu-tree'
        // [237차 감사] 자격증명 저장 직후 즉시 광고 ingest(/v423/connectors/sync) — 프론트가 세션 토큰으로 호출하나
        //   bypass 제외(raw 헤더 보호) + 세션게이트 부재로 401 → 즉시 sync 불능(cron 시간당 백업만). 핸들러는
        //   authedTenant 세션 self-auth 폴백 보유 → 세션→auth_tenant 주입 게이트 편입이 정합(즉시 동기화 복구).
        || $path === '/v423/connectors/sync' || $path === '/api/v423/connectors/sync'
        || strpos($path, '/v1/ad-performance/') === 0 || strpos($path, '/api/v1/ad-performance/') === 0
        || $path === '/performance/meta-ads' || $path === '/api/performance/meta-ads') {
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
                    // ★ 202차 P1(격리): api_key 인증 시 키의 tenant_id 를 auth_tenant 로 주입 + X-Tenant-Id 강제.
                    //   기존엔 AI-게이트가 tenant 를 주입하지 않아, api_key 보유자가 핸들러의 raw X-Tenant-Id
                    //   헤더 폴백(AutoRecommend)으로 타 테넌트 집계지표를 위조 열람할 수 있었다(메인 미들웨어 패턴 미러).
                    // 219차 잔여 P1: 기존엔 tenant_id 만 조회·주입해 auth_role/auth_key(scopes) 가 빠져 있었다.
                    //   그 결과 AI-게이트 경유 라우트(예: PUT /v424/marketing/benchmarks)의 핸들러측 RBAC
                    //   (auth_role=admin 또는 admin:keys/write:* 스코프)가 admin api_key 로도 항상 403 이었다.
                    //   메인 api_key 미들웨어와 동일하게 전체 행을 조회해 auth_role/auth_key 까지 주입한다.
                    $sa = $pdoAi->prepare('SELECT * FROM api_key WHERE key_hash=? AND is_active=1 LIMIT 1');
                    $sa->execute([hash('sha256', $bearer)]);
                    $keyRowAi = $sa->fetch(\PDO::FETCH_ASSOC);
                    if ($keyRowAi) {
                        $aiOk = true;
                        $request = $request
                            ->withAttribute('auth_tenant', (string)$keyRowAi['tenant_id'])
                            ->withAttribute('auth_role',   isset($keyRowAi['role']) ? (string)$keyRowAi['role'] : 'viewer')
                            ->withAttribute('auth_key',    $keyRowAi)
                            ->withHeader('X-Tenant-Id', (string)$keyRowAi['tenant_id']);
                    }
                    if (!$aiOk) {
                        // [현 차수] 219 P2(격리): 세션 인증도 테넌트를 도출·주입한다. 기존엔 토큰 존재만 확인하고
                        //   auth_tenant 를 주입하지 않아, 핸들러가 raw X-Tenant-Id 헤더 폴백(위조 가능) 또는
                        //   'unknown' 공유 버킷으로 떨어졌다. user_session→app_user.tenant_id 로 권위 주입.
                        // [현 차수 P1 보안] 세션 만료/비활성 검증 추가 — userByToken·EventPopup::requireAdmin 과 동일하게
                        //   s.expires_at > now AND u.is_active=1 강제. 기존엔 토큰 존재만 확인해 만료·해지 세션으로도
                        //   공용 AI(/v422/ai)·결제(/v427/billing)·MMM·Attribution 경로 우회가 가능했다(세션수명 무력화).
                        $ss = $pdoAi->prepare('SELECT u.tenant_id FROM user_session s JOIN app_user u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1 LIMIT 1');
                        $ss->execute([$bearer, gmdate('Y-m-d\TH:i:s\Z')]);
                        $sessTenant = $ss->fetchColumn();
                        if ($sessTenant !== false) {
                            $aiOk = true;
                            $st = trim((string)$sessTenant);
                            if ($st !== '') {
                                $request = $request
                                    ->withAttribute('auth_tenant', $st)
                                    // [237차] 세션 사용자에 최소권한 viewer 역할 주입(권한상승 아님 — 최하위 등급).
                                    //   /v425/menu-tree(AdminMenu::gate viewer rank 검사) 등 auth_role 을 읽는 세션-게이트
                                    //   핸들러가 빈 role(-1<viewer=0)로 403 나던 것을 해소. 쓰기 RBAC 는 여전히 미상승.
                                    ->withAttribute('auth_role', 'viewer')
                                    ->withHeader('X-Tenant-Id', $st);
                            }
                        }
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

// [237차] 공개 헬스 프로브 — 대시보드 시스템현황 위젯(HEAD 핑)이 정상 200 을 받도록.
//   Slim 4 는 GET 라우트가 HEAD 를 자동 처리. 미들웨어 bypass(위 공개목록)와 짝.
$pingHandler = function (Request $request, Response $response) {
    $response->getBody()->write(json_encode(['ok' => true, 'status' => 'ok', 'ts' => gmdate('c')], JSON_UNESCAPED_UNICODE));
    return $response->withHeader('Content-Type', 'application/json');
};
$app->get('/ping', $pingHandler);
$app->get('/api/ping', $pingHandler);
$app->get('/auth/check', $pingHandler);
$app->get('/api/auth/check', $pingHandler);

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
) use ($app, $GENIE_ALLOWED_ORIGINS) {
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
    // ★ 201차 P1: 에러 응답도 와일드카드(*) 대신 허용 origin 만 반영(메인 CORS 정책과 일치).
    $eOrigin = $request->getHeaderLine('Origin');
    $eAllow  = in_array($eOrigin, $GENIE_ALLOWED_ORIGINS, true) ? $eOrigin : 'https://roi.genie-go.com';
    return $response
        ->withStatus($statusCode)
        ->withHeader('Content-Type', 'application/json')
        ->withHeader('Access-Control-Allow-Origin', $eAllow);
});

$app->run();
