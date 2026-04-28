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
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $raw = (string)$request->getBody();
            $decoded = json_decode($raw, true);
            $body = is_array($decoded) ? $decoded : ['raw' => $raw];
        }

        $payload = [
            'ok' => true,
            'vendor' => $vendor,
            'received' => $body,
            'note' => 'Signature verification is not enforced in this PHP port.',
        ];
        return TemplateResponder::respond($response, $payload);
    }

    public static function esignWebhook(Request $request, Response $response, array $args): Response {
        $provider = (string)($args['provider'] ?? '');
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            $raw = (string)$request->getBody();
            $decoded = json_decode($raw, true);
            $body = is_array($decoded) ? $decoded : ['raw' => $raw];
        }

        $payload = [
            'ok' => true,
            'provider' => $provider,
            'received' => $body,
            'note' => 'E-sign webhook signature verification is not enforced in this PHP port.',
        ];
        return TemplateResponder::respond($response, $payload);
    }
}
