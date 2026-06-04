<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Genie\TemplateResponder;

/**
 * Webhook + settlement parsing endpoints used in v402-v404.
 *
 * Upstream validates signatures and parses vendor documents.
 * This PHP port preserves endpoint paths and returns a compatible
 * JSON structure while avoiding hard dependency on vendor-specific
 * SDKs / signature secrets.
 */
final class Webhooks {

    // 189차+ 웹훅 서명검증(HMAC-SHA256, opt-in 강제).
    //   시크릿 설정(env GENIE_WEBHOOK_SECRET_<VENDOR> 또는 GENIE_WEBHOOK_SECRET) 시 강제 검증,
    //   미설정 벤더는 하위호환으로 수신 허용하되 verified=false 표기(설정만 하면 즉시 강제 전환).
    private static function webhookSecret(string $vendor): string {
        $v = strtoupper(preg_replace('/[^A-Za-z0-9]/', '_', $vendor));
        $s = (string)(getenv("GENIE_WEBHOOK_SECRET_{$v}") ?: '');
        if ($s === '') $s = (string)(getenv('GENIE_WEBHOOK_SECRET') ?: '');
        return $s;
    }

    private static function extractSignature(Request $req): string {
        foreach (['X-Signature', 'X-Hub-Signature-256', 'X-Webhook-Signature', 'X-Hub-Signature'] as $h) {
            $v = $req->getHeaderLine($h);
            if ($v !== '') return $v;
        }
        return '';
    }

    /** @return array{verified:bool,enforced:bool,error:?string} */
    private static function checkSignature(Request $req, string $rawBody, string $vendor): array {
        $secret = self::webhookSecret($vendor);
        if ($secret === '') return ['verified' => false, 'enforced' => false, 'error' => null];
        $sig = self::extractSignature($req);
        if ($sig === '') return ['verified' => false, 'enforced' => true, 'error' => 'missing signature header'];
        $provided = (stripos($sig, 'sha256=') === 0) ? substr($sig, 7) : $sig;
        $expected = hash_hmac('sha256', $rawBody, $secret);
        $ok = hash_equals($expected, strtolower(trim($provided)));
        return ['verified' => $ok, 'enforced' => true, 'error' => $ok ? null : 'invalid signature'];
    }

    private static function rawBody(Request $req): string {
        try { $b = $req->getBody(); $b->rewind(); return (string)$b; } catch (\Throwable $e) { return ''; }
    }

    public static function influencerSettlementParse(Request $request, Response $response, array $args): Response {
        // FastAPI signature is: (vendor: str, file: UploadFile)
        // In practice, the vendor may arrive as query param or form field.
        $q = $request->getQueryParams() ?? [];
        $parsedBody = $request->getParsedBody();
        $vendor = (string)($q['vendor'] ?? (is_array($parsedBody) ? ($parsedBody['vendor'] ?? '') : ''));

        $files = $request->getUploadedFiles();
        $textPreview = null;
        if (isset($files['file'])) {
            try {
                $stream = $files['file']->getStream();
                $content = (string)$stream;
                $textPreview = mb_substr($content, 0, 400);
            } catch (\Throwable $e) {
                $textPreview = null;
            }
        }

        $payload = [
            'vendor' => $vendor,
            'parsed' => [
                // Keep a predictable shape even without a real parser.
                'lines' => [],
                'summary' => [
                    'total' => 0,
                    'currency' => null,
                ],
                'text_preview' => $textPreview,
                'note' => 'Stub parse (vendor-specific settlement parsing not implemented in PHP port).',
            ],
        ];
        return TemplateResponder::respond($response, $payload);
    }

    public static function vendorWebhook(Request $request, Response $response, array $args): Response {
        $vendor = (string)($args['vendor'] ?? '');
        $raw = self::rawBody($request);
        $sig = self::checkSignature($request, $raw, $vendor);
        if ($sig['enforced'] && !$sig['verified']) {
            error_log("[webhook] vendor={$vendor} signature rejected: {$sig['error']}");
            return TemplateResponder::respond($response->withStatus(401), ['ok' => false, 'error' => 'Webhook signature verification failed']);
        }
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $decoded = json_decode($raw, true);
            $body = is_array($decoded) ? $decoded : ['raw' => $raw];
        }
        return TemplateResponder::respond($response, [
            'ok' => true,
            'vendor' => $vendor,
            'received' => $body,
            'verified' => $sig['verified'],
        ]);
    }

    public static function esignWebhook(Request $request, Response $response, array $args): Response {
        $provider = (string)($args['provider'] ?? '');
        $raw = self::rawBody($request);
        $sig = self::checkSignature($request, $raw, $provider);
        if ($sig['enforced'] && !$sig['verified']) {
            error_log("[webhook] esign provider={$provider} signature rejected: {$sig['error']}");
            return TemplateResponder::respond($response->withStatus(401), ['ok' => false, 'error' => 'Webhook signature verification failed']);
        }
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $decoded = json_decode($raw, true);
            $body = is_array($decoded) ? $decoded : ['raw' => $raw];
        }
        return TemplateResponder::respond($response, [
            'ok' => true,
            'provider' => $provider,
            'received' => $body,
            'verified' => $sig['verified'],
        ]);
    }
}
