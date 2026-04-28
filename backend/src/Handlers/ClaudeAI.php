<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v422 – Claude AI Marketing Analysis Engine
 *
 * POST /v422/ai/analyze   → Claude API 분석 요청 + DB 저장
 * GET  /v422/ai/analyses  → 분석 이력 조회
 */
final class ClaudeAI {

    private const MODEL   = 'claude-sonnet-4-6';
    private const API_URL = 'https://api.anthropic.com/v1/messages';
    private const MAX_TOKENS = 4096;

    /* ── 환경변수 or 하드코딩 fallback ─────────────────────── */
    private static function apiKey(): string {
        $env = getenv('CLAUDE_API_KEY');
        if ($env && strlen($env) > 10) return $env;
        // fallback: provided by user (store in env on prod)
        return 'sk-ant-api03-***MASKED_FOR_GITHUB***';
    }

    /* ── DB 스키마 자동 생성 ─────────────────────────────────── */
    private static function migrate(PDO $pdo): void {
        // MySQL 호환 스키마 (SQLite 시 AUTOINCREMENT → MySQL AUTO_INCREMENT)
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ai_analyses (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                context       TEXT    NOT NULL DEFAULT 'general',
                question      TEXT    NOT NULL,
                data_snapshot TEXT,
                summary       TEXT,
                bullets       TEXT,
                recommendation TEXT,
                model         TEXT,
                tokens_used   INTEGER DEFAULT 0,
                status        TEXT    NOT NULL DEFAULT 'ok',
                error_msg     TEXT,
                created_at    TEXT    NOT NULL
            )");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ai_analyses (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                context       VARCHAR(64)   NOT NULL DEFAULT 'general',
                question      TEXT          NOT NULL,
                data_snapshot MEDIUMTEXT,
                summary       TEXT,
                bullets       TEXT,
                recommendation TEXT,
                model         VARCHAR(128),
                tokens_used   INT           DEFAULT 0,
                status        VARCHAR(16)   NOT NULL DEFAULT 'ok',
                error_msg     TEXT,
                created_at    VARCHAR(32)   NOT NULL
            )");
        }
    }

    /* ── Claude API 호출 ─────────────────────────────────────── */
    private static function callClaude(string $systemPrompt, string $userMsg): array {
        $apiKey = self::apiKey();
        $payload = json_encode([
            'model'      => self::MODEL,
            'max_tokens' => self::MAX_TOKENS,
            'system'     => $systemPrompt,
            'messages'   => [
                ['role' => 'user', 'content' => $userMsg]
            ],
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init(self::API_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 8,          // 8초 후 fast-fail → fallback
            CURLOPT_CONNECTTIMEOUT => 4,          // 연결 4초 이내
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01',
            ],
        ]);
        $raw    = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($err) throw new \RuntimeException('curl error: ' . $err);
        $resp = json_decode($raw, true);
        if ($status !== 200 || !isset($resp['content'][0]['text'])) {
            $msg = $resp['error']['message'] ?? $raw;
            throw new \RuntimeException("Claude API error ({$status}): {$msg}");
        }
        return [
            'text'         => $resp['content'][0]['text'],
            'tokens_input' => $resp['usage']['input_tokens']  ?? 0,
            'tokens_output'=> $resp['usage']['output_tokens'] ?? 0,
        ];
    }

    /* ── 응답 텍스트 → 구조화 파싱 ─────────────────────────── */
    private static function parseAnalysis(string $text): array {
        // Claude에게 JSON 형식으로 응답하도록 프롬프트하므로 JSON 파싱 시도
        // 마크다운 코드블럭 제거
        $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
        $clean = trim($clean ?? $text);

        $data = json_decode($clean, true);
        if (is_array($data)) {
            return [
                'summary'        => $data['summary']        ?? $text,
                'bullets'        => is_array($data['bullets']) ? $data['bullets'] : [],
                'recommendation' => $data['recommendation'] ?? null,
            ];
        }

        // JSON 파싱 실패 시 텍스트 그대로 summary에 저장
        return [
            'summary'        => $text,
            'bullets'        => [],
            'recommendation' => null,
        ];
    }

    /* ── 시스템 프롬프트 ─────────────────────────────────────── */
    private static function systemPrompt(string $context): string {
        $ctx = match($context) {
            'roas'    => 'ROAS(광고 투자 수익률) 및 채널별 광고 성과',
            'returns' => '반품률, SKU별 반품 데이터',
            'pnl'     => 'P&L(손익), 순이익, 광고비, 인플루언서 비용',
            default   => '마케팅 통합 성과(광고비, ROAS, 캠페인, 채널)',
        };

        return <<<PROMPT
당신은 한국 이커머스 마케팅 데이터 전문 AI 분석가입니다.
분석 컨텍스트: {$ctx}

사용자의 질문과 함께 제공된 데이터를 바탕으로 분석하고,
반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이 순수 JSON):

{
  "summary": "핵심 분석 요약 (2-3문장, 한국어)",
  "bullets": [
    "구체적 인사이트 1",
    "구체적 인사이트 2",
    "구체적 인사이트 3"
  ],
  "recommendation": "가장 우선적으로 실행할 액션 제안 (1문장)"
}

규칙:
- 수치를 구체적으로 언급하세요
- 긍정/부정 측면 모두 다루세요
- 실행 가능한 인사이트를 제공하세요
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── 마케팅 평가 시스템 프롬프트 ───────────────────────── */
    private static function marketingEvalPrompt(): string {
        return <<<PROMPT
당신은 글로벌 이커머스 광고 성과 전문 AI 평가 엔진입니다.
제공된 마케팅 채널과 캠페인 데이터를 분석하여 100점 만점 기준으로 평가합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 코드블록 없이):

{
  "overall_score": 숫자(0-100),
  "grade": "S|A|B|C|D",
  "summary": "전체 마케팅 성과 핵심 요약 (2-3문장)",
  "channels": [
    {
      "name": "채널명",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "breakdown": {
        "roas_score": 숫자(0-35, ROAS 효율),
        "ctr_score": 숫자(0-25, 클릭률),
        "conversion_score": 숫자(0-25, 전환 규모),
        "cpc_score": 숫자(0-15, CPC 효율)
      },
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "ai_recommendation": "이 채널에 대한 구체적 액션 한 문장"
    }
  ],
  "campaigns": [
    {
      "name": "캠페인명",
      "channel": "채널명",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "breakdown": {
        "roas_score": 숫자(0-35),
        "burn_rate_score": 숫자(0-25),
        "ctr_score": 숫자(0-25),
        "status_score": 숫자(0-15)
      },
      "ai_insight": "캠페인 핵심 인사이트 한 문장",
      "action": "즉시 실행 권고 액션"
    }
  ],
  "budget_reallocation": [
    {
      "channel": "채널명",
      "current_pct": 숫자,
      "recommended_pct": 숫자,
      "rationale": "이유"
    }
  ],
  "top_insight": "가장 중요한 단일 인사이트",
  "immediate_action": "즉시 실행해야 할 최우선 액션"
}

평가 기준:
- ROAS 5.0x 이상: 최상급, 4.0x: 우수, 3.0x: 보통, 2.0x 미만: 개선 필요
- CTR 3.0% 이상: 우수, 2.0%: 보통, 1.0% 미만: 소재 개선 필요
- CPC ₩1,000 미만: 우수, ₩2,000: 보통, ₩3,000 초과: 개선 필요
- 예산 소진율 70-90%: 최적, 과소(50% 미만): 노출 부족, 과다(95% 초과): 조기소진 위험
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── 인플루언서 평가 시스템 프롬프트 ───────────────────── */
    private static function influencerEvalPrompt(): string {
        return <<<PROMPT
당신은 인플루언서 마케팅 ROI 전문 AI 평가 엔진입니다.
제공된 크리에이터 데이터를 분석하여 100점 만점 기준 종합 평가와 적정 수수료를 추천합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 코드블록 없이):

{
  "overall_summary": "인플루언서 포트폴리오 전체 요약 (2-3문장)",
  "creators": [
    {
      "id": "크리에이터ID",
      "name": "크리에이터명",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "breakdown": {
        "roi_score": 숫자(0-30, 투자수익률),
        "conversion_score": 숫자(0-25, 전환 효율),
        "engagement_score": 숫자(0-20, 참여율),
        "content_quality_score": 숫자(0-15, 콘텐츠 품질),
        "reliability_score": 숫자(0-10, 신뢰도/계약 준수)
      },
      "roi": 숫자(배수),
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "ai_insight": "이 크리에이터에 대한 핵심 인사이트",
      "fee_recommendation": {
        "current_fee": 숫자(현재 지급 총액),
        "recommended_flat_fee": 숫자(권장 고정 단가),
        "recommended_perf_rate": 숫자(권장 성과 요율, 0.00~0.10),
        "recommended_total_est": 숫자(권장 예상 총액),
        "contract_type": "flat|perf|flat+perf",
        "fee_rationale": "수수료 추천 근거 (한 문장)",
        "negotiation_tip": "협상 팁"
      },
      "renewal_recommendation": "계약 갱신 권고: 강력 갱신|갱신 권장|조건부 갱신|재검토 필요|종료 권고"
    }
  ],
  "portfolio_insights": ["포트폴리오 인사이트1", "인사이트2", "인사이트3"],
  "budget_optimization": "전체 인플루언서 예산 최적화 제안",
  "top_performer": "최고 성과 크리에이터명",
  "immediate_action": "즉시 실행 최우선 액션"
}

평가 기준:
- ROI 100x 이상: S등급, 50x: A, 20x: B, 10x: C, 10x 미만: D
- 전환율(주문/조회) 0.1% 이상: 우수
- 참여율 7% 이상: 우수, 5%: 보통, 3% 미만: 개선 필요
- 수수료 추천: ROI와 tier 기반으로 공정한 성과 연동 구조 권장
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── POST /v422/ai/marketing-eval ───────────────────────── */
    public static function marketingEval(Request $req, Response $res, array $args = []): Response {
        $pdo  = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];

        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $dataStr  = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $userMsg  = "다음 마케팅 채널 및 캠페인 데이터를 분석하여 종합 평가 점수와 인사이트를 제공해주세요:\n\n" . $dataStr;
        $question = "마케팅 채널 효과 종합 평가";
        $now      = gmdate('c');

        try {
            $result = self::callClaude(self::marketingEvalPrompt(), $userMsg);
            $parsed = self::parseAnalysis($result['text']);
            $tokens = $result['tokens_input'] + $result['tokens_output'];

            // raw 분석 결과도 DB에 저장
            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text']];
            }

            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':ctx'   => 'marketing_eval',
                ':q'     => $question,
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['overall_summary'] ?? ($evalData['summary'] ?? ''),
                ':bul'   => json_encode($evalData['portfolio_insights'] ?? [], JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? ($evalData['recommendation'] ?? ''),
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);

            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);

        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* ── POST /v422/ai/influencer-eval ──────────────────────── */
    public static function influencerEval(Request $req, Response $res, array $args = []): Response {
        $pdo  = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];

        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $dataStr  = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $userMsg  = "다음 인플루언서(크리에이터) 데이터를 분석하여 종합 평가 점수, 수수료 추천, 계약 갱신 의견을 제공해주세요:\n\n" . $dataStr;
        $question = "인플루언서 효과 종합 평가 및 수수료 추천";
        $now      = gmdate('c');

        try {
            $result = self::callClaude(self::influencerEvalPrompt(), $userMsg);
            $tokens = $result['tokens_input'] + $result['tokens_output'];

            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text']];
            }

            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':ctx'   => 'influencer_eval',
                ':q'     => $question,
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['overall_summary'] ?? '',
                ':bul'   => json_encode($evalData['portfolio_insights'] ?? [], JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? '',
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);

            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);

        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* ── POST /v422/ai/analyze ───────────────────────────────── */
    public static function analyze(Request $req, Response $res, array $args = []): Response {
        $pdo  = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];

        $context  = trim($payload['context']  ?? 'marketing');
        $question = trim($payload['question'] ?? '');
        $data     = $payload['data'] ?? [];

        if ($question === '') {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'question is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        // 데이터를 사람이 읽기 좋은 형태로 변환
        $dataStr = '';
        if (!empty($data)) {
            $dataStr = "\n\n[분석 데이터]\n" . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }

        $userMsg = "질문: {$question}{$dataStr}";

        $now = gmdate('c');
        $analysisId = null;

        try {
            $result  = self::callClaude(self::systemPrompt($context), $userMsg);
            $parsed  = self::parseAnalysis($result['text']);
            $tokens  = $result['tokens_input'] + $result['tokens_output'];

            // DB 저장
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:context, :question, :data_snap, :summary, :bullets, :rec, :model, :tokens, 'ok', :now)");
            $stmt->execute([
                ':context'  => $context,
                ':question' => $question,
                ':data_snap'=> json_encode($data, JSON_UNESCAPED_UNICODE),
                ':summary'  => $parsed['summary'],
                ':bullets'  => json_encode($parsed['bullets'], JSON_UNESCAPED_UNICODE),
                ':rec'      => $parsed['recommendation'],
                ':model'    => self::MODEL,
                ':tokens'   => $tokens,
                ':now'      => $now,
            ]);
            $analysisId = (int)$pdo->lastInsertId();

            return TemplateResponder::json($res, [
                'ok'             => true,
                'analysis_id'    => $analysisId,
                'context'        => $context,
                'summary'        => $parsed['summary'],
                'bullets'        => $parsed['bullets'],
                'recommendation' => $parsed['recommendation'],
                'model'          => self::MODEL,
                'tokens_used'    => $tokens,
                'created_at'     => $now,
            ]);

        } catch (\Throwable $e) {
            // 실패도 DB에 기록
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (context, question, data_snapshot, status, error_msg, model, tokens_used, created_at)
                VALUES (:context, :question, :data_snap, 'error', :err, :model, 0, :now)");
            $stmt->execute([
                ':context'  => $context,
                ':question' => $question,
                ':data_snap'=> json_encode($data, JSON_UNESCAPED_UNICODE),
                ':err'      => $e->getMessage(),
                ':model'    => self::MODEL,
                ':now'      => $now,
            ]);

            $res->getBody()->write(json_encode([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* ── GET /v422/ai/analyses ───────────────────────────────── */
    public static function analyses(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        self::migrate($pdo);

        $q       = $req->getQueryParams();
        $limit   = max(1, min(50, (int)($q['limit'] ?? 20)));
        $context = trim($q['context'] ?? '');

        $where  = $context ? "WHERE context = :ctx" : "";
        $params = $context ? [':ctx' => $context] : [];

        $stmt = $pdo->prepare("SELECT id, context, question, summary, bullets, recommendation,
            model, tokens_used, status, error_msg, created_at
            FROM ai_analyses {$where}
            ORDER BY id DESC LIMIT :lim");
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        // bullets JSON 디코딩
        foreach ($rows as &$row) {
            $row['bullets'] = json_decode($row['bullets'] ?? '[]', true) ?: [];
        }
        unset($row);

        return TemplateResponder::json($res, [
            'ok'       => true,
            'total'    => count($rows),
            'analyses' => $rows,
        ]);
    }

    /* ── 마케팅 인텔리전스: 유입/전환/기여도 분석 + AI 추천 ───────── */
    public function marketingIntelligence(Request $req, Response $res): Response {
        $body = (array)($req->getParsedBody() ?? []);
        $data = $body['data'] ?? null;
        if (!$data) {
            return TemplateResponder::json($res, ['ok'=>false,'error'=>'data required'], 400);
        }

        $channels    = json_encode($data['channels']     ?? [], JSON_UNESCAPED_UNICODE);
        $influencers = json_encode($data['influencers']  ?? [], JSON_UNESCAPED_UNICODE);
        $contrib     = json_encode($data['contribution'] ?? [], JSON_UNESCAPED_UNICODE);

        $prompt = "당신은 전문 디지털 마케팅 전략가입니다.\n채널 성과: $channels\n인플루언서: $influencers\n기여도 분석: $contrib\n\n위 데이터를 기반으로 마케팅 전략 추천 5건을 아래 JSON 형식으로만 반환하세요:\n{\"recommendations\":[{\"id\":1,\"title\":\"제목\",\"category\":\"분류\",\"confidence\":85,\"expectedROAS\":\"4.2x\",\"effort\":\"낮음\",\"reason\":\"근거\",\"actions\":[\"액션1\",\"액션2\"],\"color\":\"#4f8ef7\"}],\"summary\":\"요약\",\"top_priority\":\"최우선항목\"}";

        $payload = [
            'model'      => self::MODEL,
            'max_tokens' => self::MAX_TOKENS,
            'messages'   => [['role'=>'user','content'=>$prompt]],
        ];

        $ch = curl_init(self::API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . self::apiKey(),
                'anthropic-version: 2023-06-01',
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 90,
        ]);
        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200) {
            return TemplateResponder::json($res, ['ok'=>false,'error'=>"Claude API $code"], 502);
        }

        $claudeResp = json_decode($raw, true);
        $text = $claudeResp['content'][0]['text'] ?? '';

        if (preg_match('/\{[\s\S]*\}/u', $text, $m)) {
            $result = json_decode($m[0], true);
            if ($result) {
                return TemplateResponder::json($res, ['ok'=>true,'result'=>$result]);
            }
        }
        return TemplateResponder::json($res, ['ok'=>true,'result'=>['raw'=>$text]]);
    }
    /* ── 채널 KPI 평가 시스템 프롬프트 ─────────────────────── */
    private static function channelKpiPrompt(): string {
        return <<<PROMPT
당신은 한국 디지털 마케팅 채널 KPI 전문 AI 분석가입니다.
제공된 채널별 KPI 목표와 실적 데이터를 분석하여 종합 평가합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 없이):

{
  "overall_score": 숫자(0-100),
  "grade": "S|A|B|C|D",
  "summary": "전체 채널 KPI 달성 현황 핵심 요약 (2-3문장, 한국어)",
  "channels": [
    {
      "name": "채널명 (검색광고|SNS광고|블로그|커뮤니티)",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "kpi_status": {
        "achieved": ["달성 KPI 목록"],
        "missed": ["미달 KPI 목록"]
      },
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "action": "이 채널에 대한 즉시 실행 개선 액션"
    }
  ],
  "improvements": [
    {
      "title": "개선 과제 제목",
      "detail": "구체적 개선 방법"
    }
  ],
  "weekly_focus": "이번 주 가장 집중해야 할 채널과 이유",
  "budget_advice": "예산 배분 조정 제안",
  "top_insight": "가장 중요한 단일 인사이트",
  "immediate_action": "즉시 실행해야 할 최우선 액션"
}

채널별 평가 기준:
- 검색광고: CTR≥3%, 전환율≥5%, ROAS≥300%, CPA 목표 이하
- SNS광고: Reach 증가율, Engagement Rate≥3%, CTR≥1%, 영상조회율≥30%
- 블로그: 월간 방문자 증가, 체류시간≥180초, 검색유입 비율≥50%
- 커뮤니티: 댓글/조회 비율≥2%, 신규회원 월간 증가, 문의 전환율≥5%
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── POST /v422/ai/channel-kpi-eval ─────────────────────── */
    public static function channelKpiEval(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];

        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $dataStr = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $period  = $data['period'] === 'monthly' ? '월간' : '주간';
        $userMsg = "다음 채널별 KPI 목표와 실적 데이터를 분석하여 {$period} KPI 달성 평가 및 채널별 개선 액션을 제공해주세요:\n\n" . $dataStr;
        $now     = gmdate('c');

        try {
            $result = self::callClaude(self::channelKpiPrompt(), $userMsg);
            $tokens = $result['tokens_input'] + $result['tokens_output'];

            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text']];
            }

            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':ctx'   => 'channel_kpi_eval',
                ':q'     => "채널 KPI {$period} 평가",
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['summary'] ?? '',
                ':bul'   => json_encode($evalData['improvements'] ?? [], JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? '',
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);

            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);

        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }
    /* -- 캠페인 마케팅 추천 시스템 프롬프트 */
    private static function campaignRecommendPrompt(): string {
        return <<<PROMPT
당신은 한국 이커머스 및 물류 서비스 전문 디지털 마케팅 AI 전략가입니다.
배송대행 또는 구매대행 서비스에 최적화된 광고 마케팅 채널 전략과 예산을 추천합니다.
반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 없이):
{
  "summary": "전체 마케팅 전략 요약 3-4문장",
  "strategy": "핵심 전략 한 문장",
  "expected_roas": "예상 ROAS (예: 3.5x)",
  "expected_conversions": "예상 전환/문의 수",
  "expected_cpa": "예상 CPA (예: 12000원)",
  "channels": [
    {
      "channel_id": "채널ID(google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog)",
      "channel_name": "채널명",
      "priority": 1,
      "ad_type": "광고 유형",
      "ad_format": "광고 형태",
      "targeting": "타겟팅 방법",
      "budget": 0,
      "budget_pct": 35,
      "expected_roas": "채널 예상 ROAS",
      "kpi_goal": "KPI 목표",
      "reason": "채널 선택 이유",
      "action_plan": "구체적 집행 계획"
    }
  ],
  "timeline": [
    { "phase": "1-2주차", "title": "단계명", "detail": "실행 내용" }
  ],
  "immediate_action": "즉시 실행 첫번째 액션"
}
가이드: 배송/구매대행은 검색광고 최우선, SNS 인지도, YouTube 후기영상.
예산합계 100%, 채널 3-5개, 반드시 한국어로.
PROMPT;
    }

    /* -- POST /v422/ai/campaign-recommend */
    public static function campaignRecommend(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        self::migrate($pdo);
        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];
        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
        $svcType  = $data['service_type']   ?? '배송대행';
        $budget   = (int)($data['total_budget'] ?? 5000000);
        $period   = $data['campaign_period'] ?? '1개월';
        $region   = $data['target_region']  ?? '전국';
        $age      = $data['target_age']     ?? '25-44';
        $keyword  = $data['keyword']        ?? '';
        $keywords = implode(', ', (array)($data['keywords'] ?? []));
        $userMsg  = "다음 조건에 맞는 {$svcType} 서비스의 최적 광고 채널 전략과 예산 배분을 추천해주세요:\n"
            . "- 서비스: {$svcType}\n- 총 예산: ₩{$budget} ({$period})\n"
            . "- 타겟: {$region} / {$age}세\n- 키워드: {$keyword}\n- 관련어: {$keywords}\n\n"
            . "채널 우선순위, 예산 배분, 광고 집행 계획, 예상 성과, 타임라인을 제공해주세요.";
        $now = gmdate('c');
        try {
            $result = self::callClaude(self::campaignRecommendPrompt(), $userMsg);
            $tokens = $result['tokens_input'] + $result['tokens_output'];
            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text'], 'channels' => []];
            }
            $channels = $evalData['channels'] ?? [];
            foreach ($channels as &$ch) {
                if (empty($ch['budget']) && !empty($ch['budget_pct']))
                    $ch['budget'] = (int)round($budget * $ch['budget_pct'] / 100);
            }
            unset($ch);
            $evalData['channels'] = $channels;
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':ctx'   => 'campaign_recommend',
                ':q'     => "{$svcType} 마케팅 채널 추천 (₩{$budget})",
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['summary'] ?? '',
                ':bul'   => json_encode(array_column($channels, 'channel_name'), JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? '',
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);
            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* -- 캠페인 광고 소재(크리에이티브) 생성 프롬프트 */
    private static function campaignAdCreativePrompt(): string {
        return <<<PROMPT
당신은 한국 디지털 광고 크리에이티브 전문 카피라이터이자 마케팅 AI입니다.
배송대행 또는 구매대행 서비스의 채널별 광고 소재(헤드라인, 카피, CTA, 포맷)를 생성합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON):
{
  "creatives": [
    {
      "channel_id": "채널ID (google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog)",
      "headline": "광고 헤드라인 (채널 특성에 맞게, 임팩트 있게)",
      "copy": "광고 카피 본문 (서비스 혜택 강조, 2-3문장)",
      "cta": "행동유도 버튼 문구",
      "format": "광고 포맷 (검색텍스트/피드이미지/스토리/영상/배너 등)",
      "spec": "권장 사이즈/규격",
      "tone": "광고 톤앤매너",
      "keywords": ["검색키워드1", "키워드2"],
      "tips": "이 채널 소재 운영 팁"
    }
  ]
}

채널별 소재 가이드:
- google_search/naver_search: 키워드 기반 텍스트, 혜택+수치 강조, 확장 소재
- meta/instagram: 비주얼 임팩트, 스와이프형, 후기/신뢰 강조
- tiktok: 짧고 강렬한 훅, 트렌디한 표현, 해시태그
- youtube: 스킵 전 5초 훅 중요, 스토리텔링, 상세 설명
- kakao: 친근한 톤, 이모지 활용, 카카오채널 특성 반영
- blog: SEO 중심, 정보성 제목, 롱테일 키워드
- 배송대행: 출발국(한국) 강조, 국제특송, 빠른 배송, 관세 편의성
- 구매대행: 해외상품 접근성, 안전한 거래, 통관 편의성
- 반드시 한국어로 작성
PROMPT;
    }


    /* -- 캠페인 검색 기반 AI 분석 프롬프트 (강화버전) */
    private static function campaignSearchPrompt(): string {
        return <<<PROMPT
당신은 한국 배송대행·구매대행 전문 디지털 마케팅 전략가 AI입니다.
배송대행(한국→해외 국제특송)과 구매대행(해외→한국 통관대행) 서비스에 특화된 광고 마케팅 전략을 제공합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 코드블록 없이):
{
  "summary": "검색 쿼리 분석 요약 (4-5문장, 서비스 특성·경쟁 현황·핵심 기회 설명)",
  "strategy": "핵심 마케팅 전략 한 문장 (구체적 수치 포함)",
  "total_monthly_budget": 8000000,
  "monthly_budget": "월간 추천 예산 표시 (예: ₩800만)",
  "annual_budget": "연간 추천 예산 표시 (예: ₩9,600만)",
  "expected_roas": "전체 예상 ROAS (예: 4.2x)",
  "expected_conversions": "월간 예상 신규 고객 수 (예: 120명)",
  "budget_rationale": "예산 추천 근거 (왜 이 금액인지 2-3문장 설명)",
  "channels": [
    {
      "channel_id": "google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog",
      "channel_name": "채널명 (예: 네이버 검색광고)",
      "priority": 1,
      "effectiveness_score": 92,
      "ad_type": "광고 유형 (예: 키워드 검색광고)",
      "ad_format": "광고 형태 (예: 텍스트 + 이미지 확장소재)",
      "targeting": "구체적 타겟팅 방법",
      "monthly_budget": 3000000,
      "budget_pct": 38,
      "expected_roas": "채널 예상 ROAS",
      "expected_cpa": "예상 고객 획득 비용",
      "kpi_goal": "KPI 수치 목표 (예: CTR 4% 이상, 전환율 3%)",
      "key_metric": "핵심 성과 지표",
      "reason": "이 채널 선택 이유 (배송대행/구매대행 서비스 특성 연계)",
      "efficiency_tips": [
        "효율 극대화 팁 1 (구체적 실행 방법)",
        "효율 극대화 팁 2",
        "효율 극대화 팁 3"
      ],
      "keywords": ["핵심키워드1", "키워드2", "키워드3"],
      "action_plan": "구체적 광고 집행 계획 (단계별)"
    }
  ],
  "efficiency_maximization": {
    "overall_tips": [
      "전체 효율 극대화 방법 1",
      "방법 2",
      "방법 3"
    ],
    "ab_test_ideas": "A/B 테스트 제안",
    "funnel_strategy": "고객 획득 퍼널 전략 (인지→관심→구매 단계별)",
    "retargeting": "리타겟팅 전략"
  },
  "timeline": [
    { "phase": "1-2주차", "title": "단계명", "detail": "구체적 실행 내용 (KPI 목표 포함)" }
  ],
  "immediate_action": "지금 당장 해야 할 첫 번째 실행 액션"
}

배송대행 서비스 마케팅 전문 지식:
- 배송대행(한국→해외): 네이버 검색광고 필수 (배송대행, 국제특송, DHL대행 등), 카카오 모먼트 보조, 블로그 SEO 병행
- 구매대행(해외→한국): 구글/네이버 검색 + SNS 비주얼 광고 (인스타그램, 페이스북) 강함
- 핵심 키워드: 배송대행, 구매대행, 해외직구, 국제특송, 세관대행, Amazon대행
- 타겟: 20-40대 직구족, 해외거주 교포, 소상공인, 크로스보더 이커머스
- 시즌 피크: 블랙프라이데이, 아마존프라임데이, 연말 연시
- 효율 극대화 핵심: 검색광고 키워드 매칭타입 최적화, 브랜드 검색어 확보, 후기/리뷰 콘텐츠 활용
- 월간 적정 예산: 소규모 ₩200-500만, 중규모 ₩600-1200만, 대규모 ₩1500만+
- 채널 배분 원칙: 검색광고 40-50%, SNS 20-30%, 콘텐츠 20-30%
- 반드시 한국어로 응답
PROMPT;
    }


    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-search
    // 마케팅 채널 AI 추천 (전체 카테고리 + 상품 데이터 지원)
    // Body: { data: { query, service_type, service_route, category_id, products? } }
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignSearch(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }
            $data     = $body['data'] ?? $body;
            $query    = trim((string)($data['query']       ?? ''));
            $svcType  = trim((string)($data['service_type'] ?? ''));
            $svcRoute = trim((string)($data['service_route'] ?? ''));
            $catId    = trim((string)($data['category_id']  ?? 'general'));

            if (!$query) {
                $res->getBody()->write(json_encode(['ok' => false, 'error' => '검색어를 입력해 주세요.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type', 'application/json')->withStatus(422);
            }

            $systemPrompt = <<<PROMPT
당신은 대한민국 최고의 디지털 마케팅 전문가 AI입니다.
카테고리: {$svcType}
판매/서비스 형태: {$svcRoute}

사용자의 질문과 상품 데이터를 분석하여 최적의 광고 마케팅 채널과 전략을 추천하세요.
반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 코드블록/```json 없이):

{
  "summary": "전체 마케팅 전략 요약 (2-3문장, 카테고리·상품 특성 반영)",
  "strategy": "핵심 전략 한 문장 (구체적 수치와 채널 포함)",
  "total_monthly_budget": 숫자(원),
  "monthly_budget": "월간 추천 예산 표시 (예: ₩800만)",
  "annual_budget": "연간 추천 예산 표시 (예: ₩9,600만)",
  "expected_roas": "전체 예상 ROAS (예: 3.5x)",
  "expected_conversions": "월간 예상 고객/전환 수 (예: 150명)",
  "budget_rationale": "예산 추천 근거 상세 설명 (SKU 수·단가·마진율·매출 목표 기반의 광고비 계산 논리, 2-3문장, 반드시 구체적 수치 포함)",
  "product_analysis": "상품 데이터 기반 광고 효율 예측 (단가대·경쟁강도·마진 구조별 채널 효율 분석)",
  "channels": [
    {
      "channel_id": "google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog",
      "channel_name": "채널명",
      "priority": 1,
      "ad_type": "광고 유형",
      "ad_format": "광고 형태",
      "effectiveness_score": 숫자(0-100),
      "monthly_budget": 숫자(원),
      "budget_pct": 숫자(0-100),
      "expected_roas": "예상 ROAS",
      "expected_cpa": "예상 CPA",
      "kpi_goal": "KPI 목표 (구체적 수치 포함)",
      "targeting": "타겟팅 전략 (상품 특성·가격대 기반)",
      "key_metric": "핵심 지표",
      "reason": "이 채널 추천 이유 (카테고리·상품 특성·단가 기반, 구체적 수치 포함)",
      "action_plan": "구체적 집행 계획 (단계별)",
      "efficiency_tips": ["효율 극대화 팁1", "팁2", "팁3"],
      "keywords": ["핵심 키워드1", "키워드2", "키워드3"]
    }
  ],
  "efficiency_maximization": {
    "overall_tips": ["전체 효율 극대화 방법1", "방법2", "방법3"],
    "ab_test_ideas": "A/B 테스트 제안",
    "funnel_strategy": "고객 획득 퍼널 전략 (인지→관심→구매 단계별)",
    "retargeting": "리타겟팅 전략"
  },
  "timeline": [
    {"phase": "1-2주차", "title": "단계명", "detail": "실행 내용 (KPI 목표 포함)"}
  ],
  "immediate_action": "즉시 실행 최우선 액션"
}

카테고리별 채널 우선순위:
- 뷰티·코스메틱: Instagram > TikTok > Meta > 네이버 > YouTube
- 패션·의류: Instagram > Meta > TikTok > 네이버 > 카카오
- 생활·잡화: 쿠팡광고 > 네이버 > 카카오 > Meta > Google
- 식품·건강: 네이버 > 카카오 > YouTube > Meta > 쿠팡광고
- 전자·IT: Google > 네이버 > YouTube > Meta > 커뮤니티
- 배송대행: Google > 네이버 > 커뮤니티 > Meta > YouTube
- 구매대행: 네이버 > Google > 커뮤니티 > Meta
- 스포츠·레저: Instagram > YouTube > Meta > 네이버 > TikTok

예산 추천 계산 기준 (상품 데이터 있을 때):
- 광고비/매출 비율(A/S ratio) 목표: 뷰티 15-25%, 전자 8-15%, 식품 10-20%, 패션 20-30%
- 광고비 상한: 마진의 40-60% 이내여야 수익성 유지
- SKU 수가 많을수록 → 네이버·Google 검색광고 비중 증가
- 단가가 높을수록(₩50,000 이상) → 리타겟팅·비교검색 채널 중요
- 단가가 낮을수록(₩30,000 이하) → TikTok·SNS 임펄스 구매 채널 중요
- 반드시 한국어로 응답하고, 상품 데이터 기반의 구체적 수치를 포함하세요.
PROMPT;

            // ── 상품 정보 파라미터 처리
            $products = $data['products'] ?? null;
            $productContext = '';
            if ($products && is_array($products) && !in_array($catId, ['forwarding', 'purchasing'])) {
                $skuCount    = (int)($products['sku_count']      ?? 0);
                $monthlyQty  = (int)($products['monthly_qty']    ?? 0);
                $avgPrice    = (int)($products['avg_price']      ?? 0);
                $marginRate  = (int)($products['margin_rate']    ?? 0);
                $targetRev   = (int)($products['target_revenue'] ?? 0);
                $period      = (string)($products['period']      ?? 'monthly');
                $salesChList = implode(', ', (array)($products['sales_channels'] ?? []));
                $dataSource  = (string)($products['data_source'] ?? 'user_input');

                $estMonthlyRev = ($avgPrice > 0 && $monthlyQty > 0) ? $avgPrice * $monthlyQty : 0;
                $marginAmt     = ($estMonthlyRev > 0) ? (int)round($estMonthlyRev * $marginRate / 100) : 0;
                $srcLabel      = ($dataSource === 'catalog_auto') ? '카탈로그 자동 집계' : '사용자 입력';

                $productContext = "\n\n=== 판매 상품 데이터 ({$srcLabel}) ===\n"
                    . "- SKU 수: {$skuCount}개\n"
                    . "- 월 판매 목표: {$monthlyQty}개\n"
                    . "- 평균 단가: ₩" . number_format($avgPrice) . "\n"
                    . "- 마진율: {$marginRate}%\n";
                if ($estMonthlyRev > 0) $productContext .= "- 예상 월 매출: ₩" . number_format($estMonthlyRev) . "\n";
                if ($marginAmt     > 0) $productContext .= "- 예상 월 마진: ₩" . number_format($marginAmt) . "\n";
                if ($targetRev     > 0) {
                    $pLabel = ($period === 'monthly') ? '월간' : '연간';
                    $productContext .= "- 목표 {$pLabel} 매출: ₩" . number_format($targetRev) . "\n";
                }
                if ($salesChList) $productContext .= "- 주요 판매 채널: {$salesChList}\n";

                $topProds = (array)($products['top_products'] ?? []);
                if (!empty($topProds)) {
                    $topStr = implode(', ', array_map(
                        fn($p) => "{$p['name']}(월{$p['monthly_sales']}개·₩" . number_format((int)$p['price']) . ")",
                        array_slice($topProds, 0, 3)
                    ));
                    $productContext .= "- 주요 상품: {$topStr}\n";
                }

                $productContext .= "\n위 상품 데이터를 반드시 기반으로:\n"
                    . "1. budget_rationale에 SKU 수 × 단가 × 마진율 기반 적정 광고비 계산 근거를 상세히 제시\n"
                    . "2. product_analysis에 단가대·마진 구조별 채널 효율 예측 제공\n"
                    . "3. 각 채널의 reason에 상품 특성(단가·마진·SKU 수)을 연계한 구체적 근거 포함\n";
            }

            $userMsg = "카테고리: {$svcType}\n질문: {$query}{$productContext}\n\n위 카테고리, 질문, 상품 데이터에 맞는 최적 마케팅 채널 3~5개와 예산 배분 전략을 추천해 주세요.";

            // ── Claude API 시도 → 실패 시 내장 지식 베이스 폴백 ─────────────
            $evalData    = null;
            $tokens      = 0;
            $dataSource  = 'ai';
            try {
                $claude = self::callClaude($systemPrompt, $userMsg);
                $text   = $claude['text'];
                $tokens = ($claude['tokens_input'] ?? 0) + ($claude['tokens_output'] ?? 0);

                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
                $clean = trim($clean ?? $text);
                $evalData = json_decode($clean, true);
                if (!is_array($evalData)) {
                    $evalData = null; // 파싱 실패 시 폴백으로
                } else {
                    // monthly_budget / annual_budget 문자열 정규화
                    if (!isset($evalData['monthly_budget']) && isset($evalData['total_monthly_budget'])) {
                        $tmb = (int)$evalData['total_monthly_budget'];
                        $evalData['monthly_budget'] = '₩' . number_format($tmb);
                        $evalData['annual_budget']  = '₩' . number_format($tmb * 12);
                    }
                    $evalData['data_source'] = 'ai';
                }
            } catch (\Throwable $claudeEx) {
                // Claude API 실패 → 내장 지식 베이스로 즉시 폴백
                $evalData   = null;
                $dataSource = 'fallback';
            }

            // 내장 지식 베이스 폴백 (Claude 실패 또는 JSON 파싱 실패 시)
            if (!is_array($evalData)) {
                $products  = $data['products'] ?? [];
                $period    = trim((string)($products['period'] ?? 'monthly'));
                $evalData  = self::generateFallbackResponse($catId, $svcType, $query, $products, $period);
                $dataSource = 'fallback';
            }

            // DB 저장 시도 (실패해도 응답은 반환)
            try {
                $pdo = \Genie\Db::pdo();
                self::migrate($pdo);
                $now = gmdate('Y-m-d\TH:i:s\Z');
                $stmt = $pdo->prepare(
                    'INSERT INTO ai_analyses (context,question,data_snapshot,summary,bullets,recommendation,model,tokens_used,status,created_at)
                     VALUES (:ctx,:q,:snap,:sum,:bul,:rec,:model,:tok,"ok",:now)'
                );
                $stmt->execute([
                    ':ctx'   => 'campaign_search_' . $catId,
                    ':q'     => "{$svcType}: {$query}",
                    ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                    ':sum'   => $evalData['summary'] ?? '',
                    ':bul'   => json_encode(array_column($evalData['channels'] ?? [], 'channel_name'), JSON_UNESCAPED_UNICODE),
                    ':rec'   => $evalData['immediate_action'] ?? '',
                    ':model' => $dataSource === 'ai' ? self::MODEL : 'knowledge_base_v1',
                    ':tok'   => $tokens,
                    ':now'   => $now,
                ]);
            } catch (\Throwable $dbEx) { /* silent */ }

            $res->getBody()->write(json_encode([
                'ok'          => true,
                'result'      => $evalData,
                'model'       => $dataSource === 'ai' ? self::MODEL : '전문가 지식 베이스',
                'tokens_used' => $tokens,
                'data_source' => $dataSource,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            // 최후 방어: 어떤 오류도 JSON으로 반환
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }


    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-ad-creative
    // 채널별 광고 소재(헤드라인·카피·CTA) 자동 생성
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignAdCreative(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }
            $data     = $body['data'] ?? $body;
            $svcType  = trim((string)($data['service_type'] ?? ''));
            $svcRoute = trim((string)($data['service_route'] ?? ''));
            $keyword  = trim((string)($data['keyword']      ?? ''));
            $channels = $data['channels'] ?? [];

            if (empty($channels)) {
                $res->getBody()->write(json_encode(['ok' => false, 'error' => 'channels 필드가 필요합니다.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type', 'application/json')->withStatus(422);
            }

            $chList = json_encode($channels, JSON_UNESCAPED_UNICODE);
            $systemPrompt = <<<PROMPT
당신은 대한민국 광고 카피 전문가입니다.
서비스/카테고리: {$svcType} ({$svcRoute})
키워드: {$keyword}

각 채널에 맞는 광고 소재를 생성하세요.
반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON):

{
  "creatives": [
    {
      "channel_id": "채널ID",
      "headline": "광고 헤드라인 (임팩트 있게, 20자 이내)",
      "copy": "광고 본문 카피 (혜택·서비스 설명 2문장)",
      "cta": "CTA 문구 (예: 지금 신청, 무료 상담)",
      "main_title": "광고 대제목",
      "sub_title": "광고 중제목",
      "tips": "이 채널 광고 운영 핵심 팁"
    }
  ]
}
PROMPT;

            $userMsg = "채널 목록: {$chList}\n\n각 채널에 맞게 '{$keyword}' 광고 소재를 생성해 주세요.";

            // ── Claude API 시도 → 실패 시 내장 소재 폴백 ─────────────────────
            $result     = null;
            $dataSource = 'ai';
            try {
                $claude = self::callClaude($systemPrompt, $userMsg);
                $text   = $claude['text'];
                $clean  = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
                $clean  = trim($clean ?? $text);
                $result = json_decode($clean, true);
                if (!is_array($result) || empty($result['creatives'])) {
                    $result = null;
                } else {
                    $result['data_source'] = 'ai';
                }
            } catch (\Throwable $claudeEx) {
                $result     = null;
                $dataSource = 'fallback';
            }

            if (!is_array($result)) {
                $catId  = trim((string)($data['category_id'] ?? 'general'));
                $result = self::generateFallbackCreatives($catId, $svcType, $keyword, $channels);
                $dataSource = 'fallback';
            }

            $res->getBody()->write(json_encode([
                'ok'         => true,
                'result'     => $result,
                'data_source'=> $dataSource,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 내장 마케팅 전문가 지식 베이스 (Claude API 실패 시 폴백)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * 카테고리별 채널 마케팅 전문가 데이터
     * 각 항목: [channel_id, channel_name, score, budget_pct, roas, cpa, ad_type, ad_format, targeting, key_metric, tips[], keywords[]]
     */
    private static function getChannelKnowledgeBase(): array {
        return [
            'beauty' => [
                'channels' => [
                    ['id'=>'instagram','name'=>'Instagram','score'=>95,'pct'=>30,'roas'=>'4.2x','cpa'=>'₩18,000','type'=>'이미지/릴스 광고','format'=>'스토리·피드','target'=>'18-35세 여성, 뷰티 관심사, 스킨케어·메이크업 팔로워','metric'=>'전환율·ROAS','tips'=>['비포·애프터 콘텐츠로 효과 극대화','인플루언서 협업 UGC 활용','쇼핑 태그 연동으로 즉시 구매 유도'],'keywords'=>['스킨케어','뷰티','화장품','피부 미백']],
                    ['id'=>'tiktok','name'=>'TikTok','score'=>90,'pct'=>25,'roas'=>'3.8x','cpa'=>'₩15,000','type'=>'숏폼 동영상','format'=>'인피드·탑뷰','target'=>'16-28세 Z세대, 뷰티 챌린지 참여자','metric'=>'조회수·클릭률','tips'=>['15초 이내 강렬한 효과 시연','#뷰티챌린지 해시태그 활용','DM 전환 유도 CTA 삽입'],'keywords'=>['뷰티 추천','화장품 리뷰','스킨케어 루틴']],
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>82,'pct'=>20,'roas'=>'3.5x','cpa'=>'₩22,000','type'=>'검색 CPC','format'=>'파워링크·쇼핑검색','target'=>'뷰티 상품 검색자, 성분·브랜드 검색','metric'=>'CTR·전환수','tips'=>['브랜드명+카테고리 키워드 필수','파워콘텐츠로 정보성 광고 운영','쇼핑 검색광고 이미지 최적화'],'keywords'=>['토너 추천','세럼 효과','선크림 추천']],
                    ['id'=>'meta','name'=>'Meta(Facebook)','score'=>75,'pct'=>15,'roas'=>'3.2x','cpa'=>'₩25,000','type'=>'다이나믹 광고','format'=>'피드·메신저','target'=>'25-44세 여성, 구매 의도 높은 Lookalike','metric'=>'구매전환·CPA','tips'=>['동적 카탈로그 광고로 개인화','리타겟팅 필수(장바구니 이탈)','UGC·리뷰 이미지 활용'],'keywords'=>['화장품 추천','뷰티 세일']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>68,'pct'=>10,'roas'=>'2.8x','cpa'=>'₩30,000','type'=>'인스트림·범퍼','format'=>'스킵형 15/30초','target'=>'뷰티 관련 콘텐츠 시청자','metric'=>'조회율·브랜드 인지도','tips'=>['5초 내 핵심 훅 제시','튜토리얼 형식으로 효과 시연','유명 뷰티 채널 스폰서십 연계'],'keywords'=>['화장품 리뷰','뷰티 하울','스킨케어 루틴']],
                ],
                'a_s_ratio' => 20, 'label' => '뷰티·코스메틱', 'strategy_tip' => '비주얼 임팩트와 인플루언서 신뢰도 활용, 체험·리뷰 콘텐츠로 구매 전환 극대화',
            ],
            'fashion' => [
                'channels' => [
                    ['id'=>'instagram','name'=>'Instagram','score'=>92,'pct'=>35,'roas'=>'3.9x','cpa'=>'₩20,000','type'=>'이미지/릴스','format'=>'피드·스토리·쇼핑','target'=>'18-39세 패션 관심층, 스타일링 팔로워','metric'=>'전환율·ROAS','tips'=>['시즌별 룩북 콘텐츠 제작','인스타그램 쇼핑 기능 적극 활용','트렌드 해시태그 일 2-3개 삽입'],'keywords'=>['OOD','패션 코디','스타일링']],
                    ['id'=>'meta','name'=>'Meta','score'=>80,'pct'=>25,'roas'=>'3.4x','cpa'=>'₩23,000','type'=>'다이나믹 제품광고','format'=>'카탈로그·컬렉션','target'=>'구매 이력 기반 리타겟팅','metric'=>'구매전환·CTR','tips'=>['SKU 카탈로그 자동 동기화','신상품 출시마다 컬렉션 광고 갱신','남녀 타겟 분리 운영'],'keywords'=>['패션 쇼핑','트렌드 의류']],
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>76,'pct'=>20,'roas'=>'3.2x','cpa'=>'₩25,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑검색','target'=>'스타일 검색 국내 쇼핑몰 이용자','metric'=>'노출·전환','tips'=>['상품명에 브랜드+모델명+색상 포함','UGC 리뷰 이미지 업로드','쿠폰+포인트 혜택 노출'],'keywords'=>['원피스 추천','트렌치코트','청바지 코디']],
                    ['id'=>'tiktok','name'=>'TikTok','score'=>70,'pct'=>12,'roas'=>'2.8x','cpa'=>'₩18,000','type'=>'숏폼 영상','format'=>'인피드·해시태그챌린지','target'=>'16-25세 MZ세대 패션 관심층','metric'=>'조회·공유·팔로워','tips'=>['패션 챌린지 트렌드 탑승','음악과 함께 착용 시연','10초 룩북 숏폼'],'keywords'=>['패션 하울','코디 추천']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>62,'pct'=>8,'roas'=>'2.5x','cpa'=>'₩28,000','type'=>'카카오 비즈보드','format'=>'읽기/비즈보드','target'=>'카카오톡 사용 30-50대','metric'=>'클릭·전환','tips'=>['카카오 채널 연동 팔로워 확보','톡보드 이미지 고품질 제작','카카오쇼핑 연계'],'keywords'=>['의류 쇼핑','패션몰']],
                ],
                'a_s_ratio' => 25, 'label' => '패션·의류', 'strategy_tip' => '비주얼 중심 SNS 플랫폼 집중, 시즌·트렌드 반응 콘텐츠로 즉시 구매 유도',
            ],
            'food' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>88,'pct'=>30,'roas'=>'4.0x','cpa'=>'₩12,000','type'=>'파워링크+쇼핑','format'=>'검색+쇼핑검색','target'=>'식품 검색 성인, 건강식품 관심층','metric'=>'CPC·전환율','tips'=>['성분·효능 키워드 우선 입찰','파워콘텐츠로 정보 제공','리뷰 별점 관리 필수'],'keywords'=>['단백질 보충제','다이어트 식품','건강식']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>80,'pct'=>22,'roas'=>'3.2x','cpa'=>'₩16,000','type'=>'인스트림','format'=>'스킵형 광고','target'=>'건강·요리·다이어트 콘텐츠 시청자','metric'=>'조회율·브랜드 인지','tips'=>['전문가·영양사 출연 신뢰도 강화','레시피 형식 자연스러운 노출','건강 정보 채널 협업'],'keywords'=>['건강식품 추천','다이어트']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>76,'pct'=>18,'roas'=>'3.0x','cpa'=>'₩14,000','type'=>'비즈보드+친구추가','format'=>'카카오채널','target'=>'30-55세 건강 관심 주부·직장인','metric'=>'채널 팔로워·주문','tips'=>['정기배송 할인 쿠폰 제공','채널에서 레시피 콘텐츠 발행','카카오쇼핑 연동'],'keywords'=>['건강식품','영양제 추천']],
                    ['id'=>'meta','name'=>'Meta','score'=>70,'pct'=>18,'roas'=>'2.8x','cpa'=>'₩18,000','type'=>'리드광고+전환','format'=>'카탈로그·리드','target'=>'건강·운동 관심 25-50대','metric'=>'리드수·CPA','tips'=>['무료샘플·체험 이벤트 광고','타겟 세분화(다이어터·운동인)','동영상 리뷰 광고 효과'],'keywords'=>['건강기능식품','다이어트 식품']],
                    ['id'=>'instagram','name'=>'Instagram','score'=>65,'pct'=>12,'roas'=>'2.6x','cpa'=>'₩20,000','type'=>'이미지/영상','format'=>'피드·스토리','target'=>'건강·다이어트 팔로워 20-40대','metric'=>'참여율·클릭','tips'=>['비포애프터 결과 이미지 강력','해시태그 식품 커뮤니티 공략','릴스로 조리/섭취 방법 시연'],'keywords'=>['건강식이요법','영양제']],
                ],
                'a_s_ratio' => 15, 'label' => '식품·건강', 'strategy_tip' => '신뢰성 콘텐츠와 전문가 추천으로 구매 장벽 낮추기, 정기구독·리뷰 전략 필수',
            ],
            'electronics' => [
                'channels' => [
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>90,'pct'=>30,'roas'=>'4.5x','cpa'=>'₩35,000','type'=>'검색 CPC','format'=>'확장 텍스트','target'=>'전자제품 비교·구매 검색자','metric'=>'CTR·전환율','tips'=>['모델명+스펙 키워드 정밀 타겟','쇼핑 캠페인 병행 운영','경쟁사 브랜드 키워드 입찰 검토'],'keywords'=>['버즈이어폰 추천','노트북 비교','스마트폰 할인']],
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>85,'pct'=>25,'roas'=>'4.0x','cpa'=>'₩32,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑','target'=>'전자제품 검색·비교 국내 소비자','metric'=>'노출수·전환','tips'=>['상품명에 정확한 모델·스펙 기재','최저가·당일배송 혜택 노출','카테고리 광고 연동'],'keywords'=>['가성비 이어폰','태블릿 추천']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>78,'pct'=>20,'roas'=>'3.0x','cpa'=>'₩40,000','type'=>'인스트림·예약','format'=>'스킵형·범퍼','target'=>'IT 리뷰 채널 구독자','metric'=>'조회율·브랜드인지','tips'=>['언박싱·사용기 형식 효과적','테크 유튜버 협업 리뷰','비교 영상 스폰서십'],'keywords'=>['전자기기 리뷰','IT 제품']],
                    ['id'=>'meta','name'=>'Meta','score'=>65,'pct'=>15,'roas'=>'2.6x','cpa'=>'₩42,000','type'=>'카탈로그 광고','format'=>'다이나믹·리드','target'=>'30-50대 남성, IT 관심층','metric'=>'전환율·리드','tips'=>['할부·무이자 혜택 강조','리타겟팅(상세페이지 방문자)','전문가 추천 형식 광고'],'keywords'=>['가전제품 쇼핑']],
                    ['id'=>'blog','name'=>'블로그·커뮤니티','score'=>60,'pct'=>10,'roas'=>'2.8x','cpa'=>'₩28,000','type'=>'네이버 블로그 SEO','format'=>'정보성 콘텐츠','target'=>'구매 전 정보 탐색자','metric'=>'방문자·전환','tips'=>['비교리뷰 정보성 콘텐츠 제작','디시·클리앙 등 커뮤니티 마케팅','SEO 키워드 최적화'],'keywords'=>['전자제품 추천','스펙 비교']],
                ],
                'a_s_ratio' => 10, 'label' => '전자·IT', 'strategy_tip' => '검색 의도 기반 정밀 타겟팅, 스펙·가격 비교 콘텐츠와 리뷰 신뢰도 구축이 핵심',
            ],
            'lifestyle' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>82,'pct'=>28,'roas'=>'3.6x','cpa'=>'₩16,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑','target'=>'생활용품 검색 주부·직장인','metric'=>'전환율·노출','tips'=>['시즌별 기획전 연동','리뷰 이미지 활용','번들 상품 할인 강조'],'keywords'=>['주방용품 추천','생활용품 세트']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>76,'pct'=>22,'roas'=>'3.2x','cpa'=>'₩14,000','type'=>'비즈보드','format'=>'배너·채널','target'=>'카카오톡 30-55세 주부','metric'=>'클릭·주문','tips'=>['카카오 선물하기 연동','정기배송 구독 프로그램','채널 팔로워 쿠폰 지급'],'keywords'=>['생활용품 세일','인테리어 소품']],
                    ['id'=>'meta','name'=>'Meta','score'=>70,'pct'=>20,'roas'=>'2.9x','cpa'=>'₩18,000','type'=>'다이나믹+컬렉션','format'=>'카탈로그·컬렉션','target'=>'인테리어·라이프스타일 관심층','metric'=>'전환·CPA','tips'=>['인테리어 스타일링 이미지 고퀄리티','가족·홈리빙 라이프스타일 타겟','재구매 리타겟팅'],'keywords'=>['인테리어 쇼핑','홈데코']],
                    ['id'=>'instagram','name'=>'Instagram','score'=>65,'pct'=>18,'roas'=>'2.7x','cpa'=>'₩20,000','type'=>'이미지·릴스','format'=>'피드·스토리','target'=>'인테리어·라이프스타일 팔로워','metric'=>'참여율·클릭','tips'=>['홈스타일링 인플루언서 협업','공간 연출 이미지 컨셉 통일','릴스로 제품 사용 장면 시연'],'keywords'=>['홈인테리어','생활용품 추천']],
                    ['id'=>'blog','name'=>'블로그 SEO','score'=>58,'pct'=>12,'roas'=>'2.5x','cpa'=>'₩15,000','type'=>'정보성 콘텐츠','format'=>'네이버 블로그','target'=>'구매 전 정보 탐색자','metric'=>'방문자·전환','tips'=>['인기 상품 리뷰 콘텐츠 발행','SEO 홈인테리어 키워드 공략','상품 사용 후기 블로그 마케팅'],'keywords'=>['생활용품 리뷰','주방용품 추천']],
                ],
                'a_s_ratio' => 12, 'label' => '생활·잡화', 'strategy_tip' => '카카오·네이버 쇼핑 중심, 주부 타겟 쿠폰·정기구독 프로그램으로 LTV 극대화',
            ],
            'sports' => [
                'channels' => [
                    ['id'=>'instagram','name'=>'Instagram','score'=>88,'pct'=>30,'roas'=>'3.7x','cpa'=>'₩22,000','type'=>'이미지·릴스','format'=>'피드·스토리','target'=>'20-45세 운동 관심층, 스포츠 팔로워','metric'=>'전환율·참여율','tips'=>['운동 영상·결과 비포애프터','스포츠 인플루언서 협업','챌린지 해시태그 참여 유도'],'keywords'=>['운동용품 추천','헬스 장비']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>82,'pct'=>25,'roas'=>'3.2x','cpa'=>'₩26,000','type'=>'인스트림','format'=>'스킵형·협찬','target'=>'피트니스·스포츠 채널 구독자','metric'=>'조회율·전환','tips'=>['운동 유튜버 스폰서십','사용법·훈련 영상 노출','성과 리뷰 형식 효과적'],'keywords'=>['헬스용품','운동화 추천']],
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>76,'pct'=>20,'roas'=>'3.5x','cpa'=>'₩24,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑','target'=>'스포츠용품 검색자','metric'=>'노출·전환','tips'=>['종목별 키워드 세분화','시즌 스포츠 기획전','인기 브랜드 가격비교 출연'],'keywords'=>['러닝화 추천','요가매트','헬스글러브']],
                    ['id'=>'meta','name'=>'Meta','score'=>68,'pct'=>15,'roas'=>'2.8x','cpa'=>'₩28,000','type'=>'다이나믹+리드','format'=>'카탈로그·피드','target'=>'스포츠·피트니스 관심 25-50대','metric'=>'전환·리드','tips'=>['운동 목표 달성 스토리 광고','성별·종목 세분화 타겟','리타겟팅 장바구니 이탈자'],'keywords'=>['스포츠 용품']],
                    ['id'=>'tiktok','name'=>'TikTok','score'=>62,'pct'=>10,'roas'=>'2.5x','cpa'=>'₩18,000','type'=>'숏폼','format'=>'인피드','target'=>'MZ세대 헬스·트렌드 운동','metric'=>'조회·팔로워','tips'=>['15초 워크아웃 챌린지','에너제틱한 음악과 편집','트렌드 운동 해시태그'],'keywords'=>['헬스챌린지','운동 루틴']],
                ],
                'a_s_ratio' => 18, 'label' => '스포츠·레저', 'strategy_tip' => '운동 커뮤니티·인플루언서 협업, 동기부여 콘텐츠로 감성 브랜드 이미지 구축',
            ],
            'forwarding' => [
                'channels' => [
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>92,'pct'=>35,'roas'=>'4.8x','cpa'=>'₩28,000','type'=>'검색 CPC','format'=>'확장 텍스트','target'=>'해외거주 교포·유학생, 국제배송 검색자','metric'=>'CTR·신규가입','tips'=>['해외 배송비·통관 키워드 집중','국가별 랜딩페이지 최적화','브랜드 인지도 검색광고 병행'],'keywords'=>['배송대행','해외배송 대행','한국직구']],
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>85,'pct'=>25,'roas'=>'4.2x','cpa'=>'₩25,000','type'=>'파워링크','format'=>'검색 상단','target'=>'국내 해외쇼핑 관심자','metric'=>'클릭·가입','tips'=>['배송대행지 주소 제공 서비스 강조','해외직구 절차 간편함 어필','배송비 계산기 랜딩 연동'],'keywords'=>['해외직구 방법','배송대행지','아마존 직구']],
                    ['id'=>'blog','name'=>'블로그·커뮤니티','score'=>75,'pct'=>18,'roas'=>'3.8x','cpa'=>'₩18,000','type'=>'SEO 콘텐츠','format'=>'정보성 블로그','target'=>'해외직구 방법 탐색자','metric'=>'유입·가입','tips'=>['해외직구 가이드 콘텐츠 발행','관세 계산·배송비 비교 정보 제공','커뮤니티(카페·오픈채팅) 활동'],'keywords'=>['해외직구 방법','배송대행 추천','관세 계산']],
                    ['id'=>'meta','name'=>'Meta','score'=>65,'pct'=>12,'roas'=>'3.0x','cpa'=>'₩32,000','type'=>'트래픽·전환','format'=>'피드·재타겟','target'=>'해외 거주 한국인·유학생 커뮤니티','metric'=>'가입·이용','tips'=>['해외 한인 타겟 지역설정','한인 커뮤니티 그룹 광고','첫 이용 할인 이벤트 강조'],'keywords'=>['배송대행 서비스','해외배송']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>58,'pct'=>10,'roas'=>'2.5x','cpa'=>'₩35,000','type'=>'인스트림','format'=>'스킵형','target'=>'해외직구 방법 탐색 유튜브 시청자','metric'=>'조회율·가입','tips'=>['해외직구 따라하기 영상 시리즈','이용 후기·절약 팁 구독자 채널','서비스 비교 영상 스폰서십'],'keywords'=>['해외직구 방법','배송대행 후기']],
                ],
                'a_s_ratio' => 12, 'label' => '배송대행', 'strategy_tip' => 'Google·네이버 검색광고로 구매 의도층 직접 포착, 블로그 정보성 콘텐츠로 자연유입 확보',
            ],
            'purchasing' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>90,'pct'=>32,'roas'=>'4.5x','cpa'=>'₩20,000','type'=>'파워링크+블로그','format'=>'검색+콘텐츠','target'=>'해외상품 구매대행 검색자','metric'=>'클릭·주문','tips'=>['상품명+구매대행 키워드 필수','통관·관세 포함 가격 강조','카카오채널 상담 연동'],'keywords'=>['구매대행','해외상품 구매','아마존 구매대행']],
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>85,'pct'=>25,'roas'=>'4.2x','cpa'=>'₩22,000','type'=>'검색 CPC','format'=>'확장 텍스트','target'=>'해외 쇼핑몰 이용 경험자','metric'=>'전환·가입','tips'=>['해외 쇼핑몰별 키워드 공략','편의성·안전성 강조','브랜드 검색 보호 확보'],'keywords'=>['구매대행 추천','해외직구 쇼핑']],
                    ['id'=>'blog','name'=>'블로그·카페 SEO','score'=>80,'pct'=>20,'roas'=>'3.8x','cpa'=>'₩15,000','type'=>'정보성 콘텐츠','format'=>'네이버 블로그·카페','target'=>'상품 정보 탐색 구매 의도자','metric'=>'유입·문의','tips'=>['상품 구매 가이드 시리즈 발행','해외쇼핑 카페 커뮤니티 활동','관세·배송비 절약 팁 콘텐츠'],'keywords'=>['구매대행 방법','해외직구 site','관세 계산']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>70,'pct'=>13,'roas'=>'3.2x','cpa'=>'₩18,000','type'=>'비즈보드','format'=>'배너·채널','target'=>'카카오톡 사용 30-50대 쇼핑 관심자','metric'=>'채널팔로우·문의','tips'=>['카카오 채널 상담 봇 운영','단체 구매 프로그램 홍보','카카오 쇼핑 연계 검토'],'keywords'=>['구매대행 서비스']],
                    ['id'=>'meta','name'=>'Meta','score'=>60,'pct'=>10,'roas'=>'2.8x','cpa'=>'₩26,000','type'=>'트래픽','format'=>'피드·메신저','target'=>'해외 명품·브랜드 관심층','metric'=>'클릭·가입','tips'=>['특정 해외 브랜드 관심자 타겟','첫 주문 수수료 할인 광고','신뢰도 후기 광고 활용'],'keywords'=>['해외 쇼핑','명품 구매대행']],
                ],
                'a_s_ratio' => 10, 'label' => '구매대행', 'strategy_tip' => '네이버·Google 검색 및 블로그 정보성 콘텐츠로 신뢰 기반 포착, 카카오 상담 연동으로 전환율 제고',
            ],
            'general' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>80,'pct'=>30,'roas'=>'3.5x','cpa'=>'₩22,000','type'=>'파워링크+쇼핑','format'=>'검색+쇼핑','target'=>'국내 검색 사용자','metric'=>'CTR·전환','tips'=>['핵심 키워드 집중 입찰','브랜드 검색 보호 캠페인','쇼핑검색 연동'],'keywords'=>['신제품 출시','할인 쇼핑']],
                    ['id'=>'meta','name'=>'Meta','score'=>72,'pct'=>25,'roas'=>'3.0x','cpa'=>'₩25,000','type'=>'전환·트래픽','format'=>'피드·카탈로그','target'=>'관심사 기반타겟','metric'=>'전환·ROAS','tips'=>['Lookalike 대상 확장','리타겟팅 필수 운영','동영상 20초 이내'],'keywords'=>['추천 상품','할인 이벤트']],
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>70,'pct'=>20,'roas'=>'3.2x','cpa'=>'₩28,000','type'=>'검색CPC','format'=>'텍스트+쇼핑','target'=>'고구매의도 검색자','metric'=>'CTR·전환','tips'=>['정확히 일치 키워드 우선','전환 추적 설치 필수','스마트 캠페인 활용'],'keywords'=>['상품 추천','최저가']],
                    ['id'=>'instagram','name'=>'Instagram','score'=>65,'pct'=>15,'roas'=>'2.8x','cpa'=>'₩22,000','type'=>'이미지·영상','format'=>'피드·스토리','target'=>'SNS 활성 이용자','metric'=>'참여율·클릭','tips'=>['고품질 제품 이미지 필수','릴스로 사용법 시연','인플루언서 협업 검토'],'keywords'=>['제품 추천','쇼핑']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>60,'pct'=>10,'roas'=>'2.6x','cpa'=>'₩24,000','type'=>'비즈보드','format'=>'배너','target'=>'카카오톡 전 연령층','metric'=>'클릭·도달','tips'=>['비즈보드 고품질 소재','카카오채널 팔로워 확보','카카오쇼핑 연동 검토'],'keywords'=>['쇼핑 할인','이벤트']],
                ],
                'a_s_ratio' => 15, 'label' => '일반', 'strategy_tip' => '네이버·메타 검색+SNS 병행, 리타겟팅으로 전환율 최대화',
            ],
        ];
    }

    /**
     * MarketingDataHub 기반 마케팅 분석 응답 생성
     * Claude API 실패 시 폴백으로 사용 (16개 전 플랫폼 데이터 활용)
     */
    private static function generateFallbackResponse(
        string $catId, string $svcType, string $query, array $products = [], string $period = 'monthly') {
        $labelMap = ['beauty'=>'뷰티', 'fashion'=>'패션', 'food'=>'식품'];
        $label = $labelMap[$catId] ?? $svcType ?: '일반';

        // A/S ratio (광고비/매출 비율)
        $asRatioMap = ['beauty'=>20,'fashion'=>25,'food'=>15,'electronics'=>10,
                       'lifestyle'=>12,'sports'=>18,'forwarding'=>12,'purchasing'=>10];
        $asRatio = $asRatioMap[$catId] ?? 15;

        // 예산 계산
        $skuCount   = (int)($products['sku_count']     ?? 0);
        $monthlyQty = (int)($products['monthly_qty']   ?? 0);
        $avgPrice   = (int)($products['avg_price']     ?? 0);
        $marginRate = (int)($products['margin_rate']   ?? 0);
        $targetRev  = (int)($products['target_revenue']?? 0);

        $estMonthlyRev = ($avgPrice > 0 && $monthlyQty > 0) ? $avgPrice * $monthlyQty : 0;
        $marginAmt     = ($estMonthlyRev > 0 && $marginRate > 0) ? (int)($estMonthlyRev * $marginRate / 100) : 0;

        $stdBudgets = ['beauty'=>3000000,'fashion'=>4000000,'food'=>2500000,'electronics'=>2000000,
                       'lifestyle'=>1500000,'sports'=>2000000,'forwarding'=>1500000,'purchasing'=>1200000];

        if ($estMonthlyRev > 0) {
            $baseFromRev   = (int)($estMonthlyRev * $asRatio / 100);
            $maxFromMargin = $marginAmt > 0 ? (int)($marginAmt * 0.5) : $baseFromRev;
            $totalMonthly  = max(min($baseFromRev, $maxFromMargin ?: $baseFromRev), 1000000);
            $budgetRationale = "{$label} 카테고리 A/S ratio {$asRatio}% 적용. 예상 월 매출 ₩".number_format($estMonthlyRev)
                ." × {$asRatio}% = ₩".number_format($baseFromRev)
                .($marginAmt > 0 ? ". 마진(₩".number_format($marginAmt).")의 50% 상한 적용" : "")
                .". 최종 월 광고비: ₩".number_format($totalMonthly);
            $productAnalysis = "단가 ₩".number_format($avgPrice)." × 마진율 {$marginRate}% 구조. "
                .($avgPrice >= 50000 ? "고단가 상품 → 검색·리타겟팅 채널 집중." : "중저가 상품 → SNS 임펄스 구매 채널 집중.")
                .($skuCount >= 20 ? " SKU {$skuCount}개 → 쇼핑광고·카탈로그 광고 권장." : "");
        } elseif ($targetRev > 0) {
            $totalMonthly    = max((int)($targetRev * $asRatio / 100 / ($period === 'annual' ? 12 : 1)), 1000000);
            $budgetRationale = "목표 매출 ₩".number_format($targetRev)." × {$asRatio}% = 월 ₩".number_format($totalMonthly);
            $productAnalysis = "{$label} 업종 평균 기준 분석. 상품 정보 입력 시 더 정밀한 계산 가능.";
        } else {
            $totalMonthly    = $stdBudgets[$catId] ?? 2000000;
            $budgetRationale = "{$label} 소규모 브랜드 표준 예산. 상품 데이터 입력 시 맞춤 계산 제공.";
            $productAnalysis = "상품 정보 없음 → 업종 표준값 사용. 좌측 판매 상품 정보 패널에서 데이터를 입력하세요.";
        }

        $annualBudget = $totalMonthly * 12;
        $monthlyFmt   = '₩'.number_format((int)round($totalMonthly/10000)).'만';
        $annualFmt    = '₩'.number_format((int)round($annualBudget/10000)).'만';

        // MarketingDataHub에서 채널 데이터 획득
        $topPlatforms = \Genie\Handlers\MarketingDataHub::getTopPlatformsForCategory($catId, 5);

        $chResult = [];
        $priority = 1;
        $budgetPcts = [35, 25, 18, 13, 9]; // 우선순위별 예산 배분
        foreach ($topPlatforms as $id => $p) {
            $pct    = $budgetPcts[$priority - 1] ?? 8;
            $budget = (int)($totalMonthly * $pct / 100);
            $bm     = $p['benchmark'] ?? [];
            $cpaNum = (int)preg_replace('/[^0-9]/', '', $bm['avg_cpa'] ?? '20000') ?: 20000;
            $chResult[] = [
                'channel_id'          => $id,
                'channel_name'        => $p['name'],
                'priority'            => $priority,
                'ad_type'             => $p['ad_format'],
                'ad_format'           => $p['type'],
                'effectiveness_score' => $p['score'] ?? 70,
                'monthly_budget'      => $budget,
                'budget_pct'          => $pct,
                'expected_roas'       => $bm['roas'] ?? $bm['avg_roas'] ?? '3.0x',
                'expected_cpa'        => $bm['avg_cpa'] ?? '₩25,000',
                'kpi_goal'            => "월 ".number_format((int)($budget / $cpaNum))."건 전환 목표 | CTR ".($bm['avg_ctr'] ?? '-'),
                'targeting'           => "국내 {$p['kr_users']} 중 {$label} 관심층",
                'key_metric'          => "ROAS ".($bm['roas'] ?? $bm['avg_roas'] ?? '3.0x')." | CTR ".($bm['avg_ctr'] ?? '-'),
                'reason'              => "{$p['name']} 효과점수 ".($p['score']??70)."점. {$p['strength']} | {$p['kr_trend']}",
                'action_plan'         => "1. {$p['name']} 계정 셋업 → 2. {$p['ad_format']} 테스트 캠페인 → 3. 데이터 기반 최적화",
                'efficiency_tips'     => $p['tips'] ?? [],
                'keywords'            => [],
                'data_source_name'    => $p['name'],
                'data_source_ref'     => $p['source'],
                'monthly_users_global'=> $p['monthly_users'],
                'kr_users'            => $p['kr_users'],
                'kr_trend'            => $p['kr_trend'],
            ];
            $priority++;
        }

        // 가중평균 ROAS
        $scores = array_column($chResult, 'effectiveness_score');
        $totalScore = array_sum($scores) ?: 1;
        $weightedRoas = 0;
        foreach ($chResult as $i => $ch) {
            $r = (float)str_replace('x','', $ch['expected_roas']);
            $weightedRoas += $r * $scores[$i] / $totalScore;
        }
        $roasFmt = number_format($weightedRoas, 1).'x';

        // 플랫폼 출처 목록
        $allPlatforms = \Genie\Handlers\MarketingDataHub::getAllPlatforms();
        $sourceList   = array_map(fn($p) => $p['name'].' ('.$p['source'].')', array_values($allPlatforms));

        $timeline = [
            ['phase'=>'1-2주차','title'=>'계정 셋업 및 소재 제작','detail'=>'상위 3개 채널 광고 계정 생성·픽셀 설치, 이미지·영상 소재 3종 이상 제작, 랜딩페이지 최적화'],
            ['phase'=>'3-4주차','title'=>'테스트 캠페인 런칭','detail'=>'전체 예산 30%로 A/B 테스트, CTR·전환율 기준 소재 선별, 채널별 CPA 비교'],
            ['phase'=>'2달차','title'=>'데이터 기반 최적화','detail'=>'상위 채널 예산 확대, 하위 채널 조정, 리타겟팅 캠페인 추가'],
            ['phase'=>'3달차+','title'=>'스케일업','detail'=>'Lookalike 오디언스 확장, 자동입찰 전환, 월별 성과 리포트 기반 재배분'],
        ];

        $topCh = $chResult[0] ?? [];
        return [
            'summary'               => "{$label} 카테고리 최적 마케팅 채널 분석. ".count($chResult)."개 채널(ChatGPT·Google·Meta·TikTok·유튜브·아마존·쇼피파이·네이버·카카오 등 16개 플랫폼 데이터 기반)에 월 {$monthlyFmt}을 분산 투자 시 예상 ROAS {$roasFmt} 달성 가능.",
            'strategy'              => "{$label} 특성 최적화 멀티채널 전략. ".($topCh['channel_name'] ?? '')." 중심 월 {$monthlyFmt} 투자 시 ROAS {$roasFmt} 목표",
            'total_monthly_budget'  => $totalMonthly,
            'monthly_budget'        => $monthlyFmt,
            'annual_budget'         => $annualFmt,
            'expected_roas'         => $roasFmt,
            'expected_conversions'  => '월 '.number_format((int)($totalMonthly / 20000)).'명 예상',
            'budget_rationale'      => $budgetRationale,
            'product_analysis'      => $productAnalysis,
            'channels'              => $chResult,
            'data_sources'          => array_slice($sourceList, 0, 8),
            'efficiency_maximization'=> [
                'overall_tips'   => ['초기 1개월 테스트 예산(30%)으로 채널별 CPA 측정','전환율 2% 이상 채널에 집중 예산 배분','리타겟팅으로 전환율 30-50% 향상 가능'],
                'ab_test_ideas'  => '소재(이미지 vs 동영상), 헤드라인(혜택형 vs 정보형), CTA(지금 구매 vs 자세히 보기) A/B 테스트',
                'funnel_strategy'=> '인지(SNS·유튜브) → 관심(검색광고·리타겟팅) → 구매(전환 최적화·쿠폰) → 재구매(이메일·카카오채널)',
                'retargeting'    => '상세페이지 방문 후 미구매 고객에게 3-7일 내 리타겟팅 → 전환율 대폭 상승',
            ],
            'timeline'              => $timeline,
            'immediate_action'      => ($topCh['channel_name'] ?? '네이버')." 광고 계정 개설 후 ₩".number_format((int)($totalMonthly * ($budgetPcts[0]/100)))." 예산으로 테스트 캠페인 즉시 시작",
            'data_source'           => 'fallback',
        ];
    }

    /**
     * 내장 광고 소재 폴백 (Creative) 생성
        $channels = $cd['channels'];
        $asRatio  = (int)($cd['a_s_ratio'] ?? 15);
        $label    = $cd['label'] ?? $svcType;

        // ── 예산 계산 (상품 데이터 기반)
        $skuCount   = (int)($products['sku_count']      ?? 0);
        $monthlyQty = (int)($products['monthly_qty']     ?? 0);
        $avgPrice   = (int)($products['avg_price']       ?? 0);
        $marginRate = (int)($products['margin_rate']     ?? 0);
        $targetRev  = (int)($products['target_revenue']  ?? 0);

        $estMonthlyRev = ($avgPrice > 0 && $monthlyQty > 0) ? $avgPrice * $monthlyQty : 0;
        $marginAmt     = ($estMonthlyRev > 0 && $marginRate > 0) ? (int)($estMonthlyRev * $marginRate / 100) : 0;

        // 예산 결정 로직
        if ($estMonthlyRev > 0) {
            // 상품 데이터 있으면 → A/S ratio 기반 계산, 마진의 50% 상한
            $baseFromRev    = (int)($estMonthlyRev * $asRatio / 100);
            $maxFromMargin  = $marginAmt > 0 ? (int)($marginAmt * 0.5) : $baseFromRev;
            $totalMonthly   = min($baseFromRev, $maxFromMargin > 0 ? $maxFromMargin : $baseFromRev);
            $totalMonthly   = max($totalMonthly, 1000000); // 최소 100만원
            $budgetRationale = "{$label} 카테고리의 광고비/매출 비율(A/S ratio) 기준 {$asRatio}%를 적용했습니다. "
                . "예상 월 매출 ₩" . number_format($estMonthlyRev) . " × {$asRatio}% = ₩" . number_format($baseFromRev) . " 이며, "
                . ($marginAmt > 0 ? "수익성 보존을 위해 마진(₩" . number_format($marginAmt) . ")의 50% 상한(₩" . number_format($maxFromMargin) . ")을 적용하여 " : "")
                . "월 적정 광고비를 ₩" . number_format($totalMonthly) . "으로 산정했습니다.";
            $productAnalysis = "평균 단가 ₩" . number_format($avgPrice) . " × 마진율 {$marginRate}% 구조에서 "
                . ($avgPrice >= 50000 ? "고단가 상품이므로 리타겟팅·비교검색 채널이 효율적입니다." : "저중단가 상품이므로 SNS·임펄스 구매 채널이 효율적입니다.")
                . ($skuCount >= 20 ? " SKU 수({$skuCount}개)가 많아 쇼핑광고·카탈로그 광고 활용을 권장합니다." : "");
        } elseif ($targetRev > 0) {
            $totalMonthly = (int)($targetRev * $asRatio / 100 / ($period === 'annual' ? 12 : 1));
            $totalMonthly = max($totalMonthly, 1000000);
            $budgetRationale = "목표 " . ($period === 'annual' ? '연간' : '월간') . " 매출 ₩" . number_format($targetRev)
                . "에 {$label} 업종 평균 광고비율 {$asRatio}%를 적용, 월 광고비 ₩" . number_format($totalMonthly) . "으로 산정했습니다.";
            $productAnalysis = "{$label} 카테고리 업종 평균 기준으로 채널별 효율을 분석했습니다. 상품 정보 입력 시 더 정밀한 예산 계산이 가능합니다.";
        } else {
            // 기본값: 카테고리별 표준 예산 (소규모/중규모/대규모)
            $stdBudgets = ['beauty'=>3000000,'fashion'=>4000000,'food'=>2500000,'electronics'=>2000000,
                           'lifestyle'=>1500000,'sports'=>2000000,'forwarding'=>1500000,'purchasing'=>1200000,'general'=>2000000];
            $totalMonthly = $stdBudgets[$catId] ?? 2000000;
            $budgetRationale = "{$label} 카테고리 소규모 브랜드 기준 월 표준 광고 예산입니다. 상품 판매 데이터(SKU 수·단가·마진율)를 입력하면 더 정확한 예산 계산이 가능합니다.";
            $productAnalysis = "상품 정보가 없어 업종 표준값을 사용했습니다. 좌측 '📦 판매 상품 정보 입력' 패널에서 상품 데이터를 입력하면 맞춤 분석이 제공됩니다.";
        }

        $annualBudget = $totalMonthly * 12;
        $monthlyFmt   = '₩' . number_format((int)round($totalMonthly / 10000)) . '만';
        $annualFmt    = '₩' . number_format((int)round($annualBudget / 10000)) . '만';

        // ── 채널별 예산 배분 계산
        $chResult = [];
        foreach ($channels as $ch) {
            $budget = (int)($totalMonthly * $ch['pct'] / 100);
            $chResult[] = [
                'channel_id'         => $ch['id'],
                'channel_name'       => $ch['name'],
                'priority'           => count($chResult) + 1,
                'ad_type'            => $ch['type'],
                'ad_format'          => $ch['format'],
                'effectiveness_score'=> $ch['score'],
                'monthly_budget'     => $budget,
                'budget_pct'         => $ch['pct'],
                'expected_roas'      => $ch['roas'],
                'expected_cpa'       => $ch['cpa'],
                'kpi_goal'           => "월 " . number_format((int)($budget / (str_replace(['₩',',','원'], '', $ch['cpa']) ?: 20000))) . "건 전환 달성",
                'targeting'          => $ch['target'],
                'key_metric'         => $ch['metric'],
                'reason'             => "{$label} 카테고리에서 효과 점수 {$ch['score']}점의 핵심 채널입니다. " . $ch['tips'][0],
                'action_plan'        => "1단계: 계정 설정 및 소재 제작 → 2단계: {$ch['type']} 테스트 광고 집행 → 3단계: 데이터 분석 후 예산 최적화",
                'efficiency_tips'    => $ch['tips'],
                'keywords'           => $ch['keywords'],
            ];
        }

        // ── 전체 예상 ROAS 가중평균
        $totalScore = array_sum(array_column($channels, 'score')) ?: 1;
        $weightedRoas = 0;
        foreach ($channels as $ch) {
            $roasNum = (float)str_replace('x', '', $ch['roas']);
            $weightedRoas += $roasNum * $ch['score'] / $totalScore;
        }
        $roasFmt = number_format($weightedRoas, 1) . 'x';

        // ── 타임라인
        $timeline = [
            ['phase' => '1-2주차', 'title' => '광고 계정 셋업 및 소재 제작',
             'detail' => '광고 계정 생성·픽셀 설치, 상위 3개 채널 소재(이미지·카피) 제작, 랜딩페이지 최적화'],
            ['phase' => '3-4주차', 'title' => '테스트 캠페인 런칭',
             'detail' => '소규모 예산으로 A/B 테스트, CTR·전환율 기준 소재 선별, 채널별 CPA 측정'],
            ['phase' => '2달차', 'title' => '성과 데이터 기반 최적화',
             'detail' => '상위 채널 예산 확대, 하위 채널 조정, 리타겟팅 캠페인 추가, ROAS 목표 달성 집중'],
            ['phase' => '3달차+', 'title' => '스케일업 및 자동화',
             'detail' => '전환 데이터 기반 Lookalike 확장, 자동입찰 전환, 월별 성과 리포트 기반 예산 재배분'],
        ];

        return [
            'summary'               => "{$label} 카테고리를 위한 최적 마케팅 채널 분석 결과입니다. {$cd['strategy_tip']} 월 광고 예산 {$monthlyFmt}으로 " . count($channels) . "개 채널에 분산 투자하여 예상 ROAS {$roasFmt}을 달성할 수 있습니다.",
            'strategy'              => "{$label} 업종 특성에 최적화된 " . $channels[0]['name'] . " 중심 멀티채널 전략으로 월 광고비 {$monthlyFmt} 투자 시 ROAS {$roasFmt} 달성 목표",
            'total_monthly_budget'  => $totalMonthly,
            'monthly_budget'        => $monthlyFmt,
            'annual_budget'         => $annualFmt,
            'expected_roas'         => $roasFmt,
            'expected_conversions'  => '월 ' . number_format((int)($totalMonthly / 20000)) . '명 예상',
            'budget_rationale'      => $budgetRationale,
            'product_analysis'      => $productAnalysis,
            'channels'              => $chResult,
            'efficiency_maximization' => [
                'overall_tips' => [
                    '초기 1개월은 테스트 예산(30%)으로 채널별 CPA를 측정하세요',
                    '전환율이 2% 이상인 채널에 집중 예산 배분하세요',
                    '구매 이탈자 리타겟팅으로 전환율을 30-50% 높일 수 있습니다',
                ],
                'ab_test_ideas'  => '광고 소재(이미지 vs 동영상), 헤드라인(혜택형 vs 정보형), CTA 문구(지금 구매 vs 자세히 보기) A/B 테스트를 진행하세요',
                'funnel_strategy'=> '인지(SNS 광고) → 관심(리타겟팅·검색광고) → 구매(전환 최적화·쿠폰) → 재구매(이메일·카카오채널) 4단계 퍼널을 구축하세요',
                'retargeting'    => '상세페이지 방문 후 구매하지 않은 고객에게 3-7일 내 리타겟팅 광고를 표시하면 전환율이 크게 상승합니다',
            ],
            'timeline'              => $timeline,
            'immediate_action'      => $channels[0]['name'] . " 광고 계정 개설 및 픽셀 설치 후, ₩" . number_format((int)($totalMonthly * $channels[0]['pct'] / 100)) . " 예산으로 테스트 캠페인을 즉시 시작하세요",
            'data_source'           => 'fallback',
        ];
    }

    /**
     * 내장 광고 소재 폴백 (Creative) 생성
     */
    private static function generateFallbackCreatives(string $catId, string $svcType, string $keyword, array $channels): array {
        $kb = self::getChannelKnowledgeBase();
        $cd = $kb[$catId] ?? $kb['general'];
        $label = $cd['label'] ?? $svcType;
        $kw = $keyword ?: $label;

        $templates = [
            'google_search' => ['headline'=>"{$kw} 공식 스토어 | 특가 할인", 'copy'=>"정품 보장 {$label} {$kw}. 오늘 주문 시 무료 배송 적용. 지금 바로 확인하세요.", 'cta'=>'지금 구매하기', 'main_title'=>"{$kw} 특가 세일", 'sub_title'=>'정품 보장 · 빠른 배송'],
            'naver_search'  => ['headline'=>"{$kw} 최저가 | 오늘만 이벤트", 'copy'=>"검증된 {$label} 브랜드. 네이버페이 포인트 적립, 당일 배송 가능. 후기를 확인해보세요.", 'cta'=>'최저가 보기', 'main_title'=>"{$kw} 네이버 최저가", 'sub_title'=>'오늘 주문 · 내일 도착'],
            'instagram'     => ['headline'=>"✨ {$kw}로 달라진 일상", 'copy'=>"진짜 후기로 증명된 {$kw}. 첫 구매 20% 할인 쿠폰 증정. 지금 프로필 링크를 확인하세요 🔗", 'cta'=>'프로필 링크 확인', 'main_title'=>"{$kw} 첫 구매 20% OFF", 'sub_title'=>'한정 수량 · 오늘 마감'],
            'tiktok'        => ['headline'=>"이거 써봤어? {$kw} 진짜 후기 🔥", 'copy'=>"틱톡에서 난리난 {$kw}. 나도 써봤는데 진짜 달라. #무조건구매 #추천", 'cta'=>'자세히 보기', 'main_title'=>"틱톡 인기 {$kw}", 'sub_title'=>'HOT 아이템 · 한정특가'],
            'youtube'       => ['headline'=>"[솔직리뷰] {$kw} 한 달 사용 후기", 'copy'=>"광고 없이 솔직하게 리뷰합니다. {$kw}의 진짜 효과와 가격 대비 만족도를 확인하세요.", 'cta'=>'전체 리뷰 보기', 'main_title'=>"{$kw} 솔직 리뷰", 'sub_title'=>'진짜 사용자 후기'],
            'meta'          => ['headline'=>"{$kw} 지금 놓치면 후회할 혜택", 'copy'=>"매일 {$kw}를 사용하는 사람이 늘고 있습니다. 첫 구매 2+1 혜택과 무료 배송으로 지금 시작하세요.", 'cta'=>'지금 시작하기', 'main_title'=>"{$kw} 2+1 EVENT", 'sub_title'=>'오늘만 · 무료배송'],
            'kakao'         => ['headline'=>"[카카오 단독] {$kw} 특가 🎁", 'copy'=>"카카오 친구만을 위한 {$kw} 특별 할인. 채널 추가하고 쿠폰 받으세요! 오늘 자정 종료", 'cta'=>'채널 추가하기', 'main_title'=>"채널 친구 전용 할인", 'sub_title'=>"{$kw} 단독 특가"],
            'blog'          => ['headline'=>"{$kw} 사용 전 꼭 알아야 할 것들", 'copy'=>"{$kw} 구매 전 체크리스트와 실제 사용 후기를 솔직하게 정리했습니다. 후회없는 선택을 위한 가이드.", 'cta'=>'자세히 읽기', 'main_title'=>"{$kw} 구매 가이드", 'sub_title'=>'전문가 추천 · 비교 분석'],
        ];

        $creatives = [];
        foreach ($channels as $ch) {
            $chId = is_array($ch) ? ($ch['channel_id'] ?? $ch['id'] ?? '') : '';
            $tpl  = $templates[$chId] ?? $templates['meta'];
            $kbCh = null;
            foreach (($cd['channels'] ?? []) as $kbcItem) {
                if ($kbcItem['id'] === $chId) { $kbCh = $kbcItem; break; }
            }
            $creatives[] = [
                'channel_id'  => $chId,
                'headline'    => $tpl['headline'],
                'copy'        => $tpl['copy'],
                'cta'         => $tpl['cta'],
                'main_title'  => $tpl['main_title'],
                'sub_title'   => $tpl['sub_title'],
                'tips'        => $kbCh ? implode(' / ', array_slice($kbCh['tips'], 0, 2)) : "{$chId} 광고 최적화를 위해 소재 A/B 테스트를 진행하세요",
                'format'      => $kbCh['format'] ?? '',
                'spec'        => $chId === 'instagram' || $chId === 'tiktok' ? '1080×1920px (9:16)' : ($chId === 'youtube' ? '1920×1080px (16:9)' : '1200×628px (1.91:1)'),
            ];
        }

        return ['creatives' => $creatives, 'data_source' => 'fallback'];
    }

}
