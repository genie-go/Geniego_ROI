<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * AI Content Generator — Claude API (Anthropic) 기반
 * API Key 등록만으로 이메일 제목/본문, 세그먼트 설명, 광고 카피 자동 생성
 *
 * Routes:
 *   POST /api/ai/generate/email       — 이메일 제목/본문 생성
 *   POST /api/ai/generate/segment     — 세그먼트 정의/설명 생성
 *   POST /api/ai/generate/ad-copy     — 광고 카피 생성
 *   GET  /api/ai/settings             — AI 설정 조회
 *   POST /api/ai/settings             — AI API Key 저장
 */
final class AiGenerate
{
    private const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
    private const DEFAULT_MODEL = 'claude-3-5-haiku-20241022'; // 빠르고 저렴한 모델

    private static function plan(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token') {
            try {
                $s = Db::pdo()->prepare('SELECT u.plan FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? LIMIT 1');
                $s->execute([$m[1]]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) return (string)$r['plan'];
            } catch (\Throwable) {}
        }
        return 'demo';
    }

    private static function tenant(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token') {
            try {
                $s = Db::pdo()->prepare('SELECT user_id FROM user_session WHERE token=? LIMIT 1');
                $s->execute([$m[1]]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) return (string)$r['user_id'];
            } catch (\Throwable) {}
        }
        return 'demo';
    }

    private static function ensureTables(): void
    {
        Db::pdo()->exec("CREATE TABLE IF NOT EXISTS ai_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            provider TEXT DEFAULT 'claude',
            api_key TEXT,
            model TEXT DEFAULT 'claude-3-5-haiku-20241022',
            is_active INTEGER DEFAULT 1,
            updated_at TEXT,
            UNIQUE(tenant_id)
        )");
        Db::pdo()->exec("CREATE TABLE IF NOT EXISTS ai_generate_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            type TEXT,
            prompt TEXT,
            result TEXT,
            tokens_used INTEGER DEFAULT 0,
            created_at TEXT
        )");
    }

    // GET /api/ai/settings
    public static function getSettings(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);

        $stmt = $pdo->prepare("SELECT id,tenant_id,provider,model,is_active,updated_at FROM ai_settings WHERE tenant_id=?");
        $stmt->execute([$tenant]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $usageStmt = $pdo->prepare("SELECT COUNT(*) as cnt, SUM(tokens_used) as tokens FROM ai_generate_log WHERE tenant_id=?");
        $usageStmt->execute([$tenant]);
        $usage = $usageStmt->fetch(PDO::FETCH_ASSOC);

        return TemplateResponder::respond($res, [
            'ok' => true,
            'settings' => $row ?: null,
            'usage' => [
                'generations' => (int)($usage['cnt'] ?? 0),
                'tokens'      => (int)($usage['tokens'] ?? 0),
            ],
        ]);
    }

    // POST /api/ai/settings
    public static function saveSettings(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $body   = (array)($req->getParsedBody() ?? []);
        $apiKey = trim((string)($body['api_key'] ?? ''));
        $model  = trim((string)($body['model'] ?? self::DEFAULT_MODEL));

        if (!$apiKey) return TemplateResponder::respond($res->withStatus(422), ['error' => 'api_key required']);

        // 연결 테스트
        $testResult = self::testClaude($apiKey, $model);
        $now = gmdate('c');

        $pdo->prepare("INSERT INTO ai_settings(tenant_id,provider,api_key,model,is_active,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET api_key=excluded.api_key,model=excluded.model,updated_at=excluded.updated_at")
            ->execute([$tenant, 'claude', $apiKey, $model, 1, $now]);

        return TemplateResponder::respond($res, [
            'ok'      => $testResult['ok'],
            'message' => $testResult['message'],
        ]);
    }

    // POST /api/ai/generate/email
    public static function generateEmail(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $product  = trim((string)($body['product'] ?? ''));
        $audience = trim((string)($body['audience'] ?? '일반 고객'));
        $goal     = trim((string)($body['goal'] ?? '구매 전환'));
        $tone     = trim((string)($body['tone'] ?? '친근하고 전문적'));
        $discount = trim((string)($body['discount'] ?? ''));
        $lang     = trim((string)($body['lang'] ?? 'ko'));

        // 데모 모드: 미리 정의된 샘플 반환
        if (false /*was demo*/) {
            $samples = self::demoEmailSamples($product, $goal, $discount, $lang);
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'result' => $samples]);
        }

        // API Key 조회
        $s = $pdo->prepare("SELECT api_key,model FROM ai_settings WHERE tenant_id=? AND is_active=1");
        $s->execute([$tenant]);
        $cfg = $s->fetch(PDO::FETCH_ASSOC);

        if (!$cfg) {
            // API 키 없으면 데모 샘플 반환
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'fallback', 'result' => self::demoEmailSamples($product, $goal, $discount, $lang)]);
        }

        $prompt = self::buildEmailPrompt($product, $audience, $goal, $tone, $discount, $lang);
        $result = self::callClaude($cfg['api_key'], $cfg['model'] ?? self::DEFAULT_MODEL, $prompt);

        if ($result['ok']) {
            $pdo->prepare("INSERT INTO ai_generate_log(tenant_id,type,prompt,result,tokens_used,created_at) VALUES(?,?,?,?,?,?)")
                ->execute([$tenant, 'email', $prompt, $result['content'], $result['tokens'] ?? 0, gmdate('c')]);
        }

        return TemplateResponder::respond($res, ['ok' => $result['ok'], 'result' => $result['ok'] ? self::parseEmailResponse($result['content']) : null, 'error' => $result['error'] ?? null]);
    }

    // POST /api/ai/generate/segment
    public static function generateSegment(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $criteria = trim((string)($body['criteria'] ?? ''));
        $context  = trim((string)($body['context'] ?? ''));

        if (false /*was demo*/ || !$criteria) {
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'result' => self::demoSegmentSamples()]);
        }

        $s = $pdo->prepare("SELECT api_key,model FROM ai_settings WHERE tenant_id=? AND is_active=1");
        $s->execute([$tenant]);
        $cfg = $s->fetch(PDO::FETCH_ASSOC);
        if (!$cfg) return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'fallback', 'result' => self::demoSegmentSamples()]);

        $prompt = "당신은 마케팅 데이터 분석가입니다. 다음 기준으로 고객 세그먼트를 정의하고 마케팅 전략을 제안하세요.\n기준: {$criteria}\n컨텍스트: {$context}\n\n다음 형식으로 JSON으로만 응답하세요:\n{\"name\":\"...\",\"description\":\"...\",\"size_estimate\":\"...\",\"ltv_estimate\":\"...\",\"recommended_channel\":\"...\",\"message_strategy\":\"...\",\"expected_cvr\":\"...\"}";

        $result = self::callClaude($cfg['api_key'], $cfg['model'] ?? self::DEFAULT_MODEL, $prompt);
        $parsed = $result['ok'] ? json_decode((string)$result['content'], true) : null;

        return TemplateResponder::respond($res, ['ok' => $result['ok'], 'result' => $parsed ?? self::demoSegmentSamples()[0]]);
    }

    // POST /api/ai/generate/ad-copy
    public static function generateAdCopy(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $product  = trim((string)($body['product'] ?? ''));
        $platform = trim((string)($body['platform'] ?? 'meta'));
        $goal     = trim((string)($body['goal'] ?? '브랜드 인지도'));

        if (false /*was demo*/) {
            return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'demo', 'result' => self::demoAdCopySamples($product, $platform)]);
        }

        $s = $pdo->prepare("SELECT api_key,model FROM ai_settings WHERE tenant_id=? AND is_active=1");
        $s->execute([$tenant]);
        $cfg = $s->fetch(PDO::FETCH_ASSOC);
        if (!$cfg) return TemplateResponder::respond($res, ['ok' => true, 'plan' => 'fallback', 'result' => self::demoAdCopySamples($product, $platform)]);

        $prompt = "당신은 광고 카피라이터입니다. {$platform} 플랫폼용 {$product} 광고 카피를 3가지 버전으로 작성하세요. 목표: {$goal}. JSON 배열로만 응답: [{\"headline\":\"...\",\"body\":\"...\",\"cta\":\"...\"}]";
        $result = self::callClaude($cfg['api_key'], $cfg['model'] ?? self::DEFAULT_MODEL, $prompt);
        $parsed = $result['ok'] ? json_decode((string)$result['content'], true) : null;

        return TemplateResponder::respond($res, ['ok' => true, 'result' => $parsed ?? self::demoAdCopySamples($product, $platform)]);
    }

    // ── Claude API 호출 ─────────────────────────────────────────────────────
    private static function callClaude(string $apiKey, string $model, string $prompt): array
    {
        $payload = json_encode([
            'model'      => $model,
            'max_tokens' => 1024,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ]);

        $ch = curl_init(self::CLAUDE_API);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                "x-api-key: {$apiKey}",
                'anthropic-version: 2023-06-01',
                'Content-Type: application/json',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) return ['ok' => false, 'error' => $err];

        $data = json_decode((string)$raw, true) ?? [];
        if ($code === 200 && isset($data['content'][0]['text'])) {
            return ['ok' => true, 'content' => $data['content'][0]['text'], 'tokens' => $data['usage']['input_tokens'] + $data['usage']['output_tokens']];
        }
        return ['ok' => false, 'error' => $data['error']['message'] ?? "HTTP {$code}"];
    }

    private static function testClaude(string $apiKey, string $model): array
    {
        $result = self::callClaude($apiKey, $model, '응답 테스트: "연결 성공"이라고만 답하세요.');
        return ['ok' => $result['ok'], 'message' => $result['ok'] ? 'Claude API 연결 성공' : ($result['error'] ?? '연결 실패')];
    }

    // ── 프롬프트 빌더 ────────────────────────────────────────────────────────
    private static function buildEmailPrompt(string $product, string $audience, string $goal, string $tone, string $discount, string $lang): string
    {
        $langHint = $lang === 'en' ? '영어로' : ($lang === 'ja' ? '일본어로' : '한국어로');
        $discountHint = $discount ? "프로모션: {$discount}" : '';
        return <<<PROMPT
당신은 마케팅 이메일 전문가입니다. 아래 조건으로 이메일 {$langHint} 작성하세요.

상품/서비스: {$product}
대상: {$audience}
목표: {$goal}
톤: {$tone}
{$discountHint}

다음 JSON 형식만으로 응답하세요 (다른 텍스트 없이):
{
  "subjects": ["제목1", "제목2", "제목3"],
  "preview_text": "미리보기 텍스트",
  "body": {
    "greeting": "인사말",
    "main": "주요 본문 (2~3 문단)",
    "cta": "CTA 버튼 텍스트",
    "ps": "P.S. 추가 메시지 (선택)"
  },
  "a_variant": {"subject": "A 변형 제목", "cta": "A CTA"},
  "b_variant": {"subject": "B 변형 제목", "cta": "B CTA"}
}
PROMPT;
    }

    private static function parseEmailResponse(string $raw): array
    {
        // JSON 추출 시도
        if (preg_match('/\{[\s\S]+\}/m', $raw, $m)) {
            $parsed = json_decode($m[0], true);
            if ($parsed) return $parsed;
        }
        return self::demoEmailSamples('상품', '구매 전환', '', 'ko');
    }

    // ── 데모 샘플 ────────────────────────────────────────────────────────────
    private static function demoEmailSamples(string $product, string $goal, string $discount, string $lang): array
    {
        $p = $product ?: '프리미엄 상품';
        return [
            'subjects' => [
                "🔥 {$p} 지금 구매하면 특별 혜택!",
                "⏰ {$p} 한정 특가 마감 임박",
                "[{$p}] 당신을 위한 맞춤 제안",
            ],
            'preview_text' => "지금 확인하지 않으면 놓치는 기회! {$p}의 특별가를 지금 확인하세요.",
            'body' => [
                'greeting' => "안녕하세요, {{고객명}}님 👋",
                'main' => "{$p}을 찾고 계셨나요?\n\n저희가 특별히 준비한 혜택을 확인해보세요. 기존 고객님들께서 평균 4.8점을 주신 {$p}를 지금 가장 좋은 조건으로 만나보실 수 있습니다.\n\n" . ($discount ? "✨ 특별 혜택: {$discount}" : "✨ 지금 구매 시 특별 포인트 적립"),
                'cta' => '지금 바로 확인하기 →',
                'ps' => "P.S. 이 혜택은 48시간 한정입니다. 서두르세요! ⏰",
            ],
            'a_variant' => ['subject' => "💡 {$p} 오늘만 특가!", 'cta' => '특가 확인하기'],
            'b_variant' => ['subject' => "{$p} 고객 후기 98%가 만족한 이유", 'cta' => '후기 보러가기'],
        ];
    }

    private static function demoSegmentSamples(): array
    {
        return [
            ['name' => 'VIP 재구매 고객', 'description' => '최근 90일 내 3회 이상 구매, LTV 상위 10%', 'size_estimate' => '약 2,300명', 'ltv_estimate' => '₩820,000', 'recommended_channel' => '이메일 + 카카오 알림톡', 'message_strategy' => '독점 VIP 혜택, 신상품 우선 알림', 'expected_cvr' => '12.4%'],
            ['name' => '이탈 위험 고객', 'description' => '30일 이상 미접속, 이전 구매 이력 있음', 'size_estimate' => '약 5,800명', 'ltv_estimate' => '₩210,000', 'recommended_channel' => 'SMS + 앱 푸시', 'message_strategy' => '재방문 쿠폰 10%, 맞춤 상품 추천', 'expected_cvr' => '3.8%'],
            ['name' => '신규 잠재 고객', 'description' => '최근 7일 가입, 미구매', 'size_estimate' => '약 1,200명', 'ltv_estimate' => '₩0 (예측 ₩145,000)', 'recommended_channel' => '이메일 + 웹팝업', 'message_strategy' => '첫 구매 15% 할인, 브랜드 소개 시리즈', 'expected_cvr' => '5.2%'],
        ];
    }

    private static function demoAdCopySamples(string $product, string $platform): array
    {
        $p = $product ?: '프리미엄 상품';
        return [
            ['headline' => "🔥 {$p} 특별 한정가!", 'body' => "지금 구매하면 20% 할인! 98% 고객 만족도의 {$p}를 지금 만나보세요.", 'cta' => '지금 구매'],
            ['headline' => "{$p}로 일상이 달라집니다", 'body' => "단 하나의 선택이 일상을 바꿉니다. {$p} 무료 체험 시작하기.", 'cta' => '무료 체험'],
            ['headline' => "10,000명이 선택한 {$p}", 'body' => "만족도 4.9점! {$platform}에서 가장 핫한 {$p}의 비결을 확인하세요.", 'cta' => '더 알아보기'],
        ];
    }
}
