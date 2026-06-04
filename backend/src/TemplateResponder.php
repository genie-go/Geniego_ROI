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

    /** Alias for respond() — used by Rollup handler */
    public static function json(Response $response, mixed $data): Response {
        return self::respond($response, $data);
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
            $fn = substr($s, 9); // "__CALL__:" = 9자 (기존 8 오프셋은 ':' 포함 → isoformat 분기 dead 였음)
            // 191차: 타임스탬프 함수만 실값. 그 외(validate_product·list_versions·get_current_template_text·
            //   len 등)는 과거에 전부 default 로 timestamp 를 돌려줘 "타임스탬프를 결과로 위장"하는 가짜였음
            //   → null(정직). 템플릿 폴백 라우트가 미구현 필드를 가짜 타임스탬프 대신 null 로 노출.
            if ($fn === 'isoformat' || $fn === 'utcnow' || $fn === 'now') return gmdate('c');
            return null;
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
