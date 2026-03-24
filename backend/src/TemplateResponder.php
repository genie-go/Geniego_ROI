<?php
declare(strict_types=1);

namespace Genie;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class TemplateResponder {

    public static function respond(Response $response, mixed $data): Response {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type','application/json');
    }

    public static function fill(mixed $tpl, array $vars): mixed {
        if (is_array($tpl)) {
            $out = [];
            foreach ($tpl as $k => $v) {
                $outKey = is_string($k) ? self::fillString($k, $vars) : $k;
                $out[$outKey] = self::fill($v, $vars);
            }
            return $out;
        }
        if (is_string($tpl)) return self::fillString($tpl, $vars);
        return $tpl;
    }

    private static function fillString(string $s, array $vars): mixed {
        if (str_starts_with($s, '__NAME__:')) {
            $key = substr($s, 8);
            return $vars[$key] ?? null;
        }
        if (str_starts_with($s, '__CALL__:')) {
            $fn = substr($s, 8);
            // We only need isoformat-like timestamps for this repo.
            if ($fn === 'isoformat') return gmdate('c');
            if ($fn === 'utcnow' || $fn === 'now') return gmdate('c');
            return gmdate('c');
        }
        if ($s === '__EXPR__') return null;
        if ($s === '__UNSUPPORTED__') return null;
        if (str_starts_with($s, '__ATTR__:')) return null;
        return $s;
    }

    public static function varsFrom(Request $request, array $args): array {
        $vars = [];
        // query params
        foreach (($request->getQueryParams() ?? []) as $k => $v) $vars[$k] = $v;
        // parsed body
        $body = $request->getParsedBody();
        if (is_array($body)) {
            foreach ($body as $k => $v) $vars[$k] = $v;
        }
        // path params
        foreach ($args as $k => $v) $vars[$k] = $v;
        return $vars;
    }
}
