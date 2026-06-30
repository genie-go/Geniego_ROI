<?php
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Genie\Db;

/**
 * Geo — 접속 IP 기반 국가/언어 자동 감지 (서버측, 동일 출처).
 * ──────────────────────────────────────────────────────────────────────────
 *  기존 프론트는 브라우저에서 ipapi.co 단일 호출 → 광고차단기·서비스 장애·요청한도에 취약했다.
 *  본 엔드포인트는 동일 출처(/api)로 호출되어 광고차단 불가 + 서버측에서 다중 제공자 페일오버 +
 *  IP 해시 캐시(원문 미저장)로 안정성을 확보한다. 응답의 country 는 프론트 COUNTRY_LANG_MAP 으로
 *  언어 변환(단일 출처 유지). lookup 은 '호출자 연결 IP' 에만 수행한다(임의 IP 파라미터 불허 → 스캔 악용 차단).
 *
 *  GET /v424/geo/lang  (공개) → { ok, country: "KR"|null, accept_lang: "ko"|null, source }
 */
class Geo
{
    /** 프론트 LOCALES 와 동일한 지원 언어 코드 집합(Accept-Language 매칭용). */
    private const SUPPORTED = ['ko','en','ja','zh','zh-tw','de','th','vi','id','es','fr','pt','ru','ar','hi'];

    public static function lang(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $ip         = self::clientIp($req);
        $acceptLang = self::langFromAcceptLanguage($req->getHeaderLine('Accept-Language'));
        $country    = null;
        $source     = 'none';

        if (self::isPrivateIp($ip)) {
            $source = 'private'; // 로컬/사설 IP → 외부 조회 스킵(개발 환경)
        } else {
            $pdo = null;
            try { $pdo = Db::pdo(); } catch (\Throwable $e) {}
            if ($pdo) $country = self::cacheGet($pdo, $ip);
            if ($country !== null) {
                $source = 'cache';
            } else {
                $country = self::lookupCountry($ip);
                if ($country !== null) {
                    $source = 'lookup';
                    if ($pdo) self::cacheSet($pdo, $ip, $country);
                }
            }
        }

        return self::json($res, [
            'ok'          => true,
            'country'     => $country,     // ISO-3166-1 alpha-2 (대문자) 또는 null
            'accept_lang' => $acceptLang,  // 헤더에서 추출한 지원 언어 코드 또는 null
            'source'      => $source,      // cache | lookup | private | none
        ]);
    }

    // ── 호출자 IP (UserAuth::clientIp 와 동일 정책: X-Real-IP 우선, XFF 는 마지막 홉) ──
    private static function clientIp(ServerRequestInterface $req): string
    {
        $sp   = $req->getServerParams();
        $real = trim((string)($sp['HTTP_X_REAL_IP'] ?? ''));
        if ($real !== '') return $real;
        $remote = trim((string)($sp['REMOTE_ADDR'] ?? ''));
        if ($remote !== '' && $remote !== '127.0.0.1' && $remote !== '::1') return $remote;
        $xff = (string)($sp['HTTP_X_FORWARDED_FOR'] ?? '');
        if ($xff !== '') {
            $parts = array_map('trim', explode(',', $xff));
            $last  = end($parts);
            if ($last !== '') return $last;
        }
        return $remote !== '' ? $remote : '0.0.0.0';
    }

    private static function isPrivateIp(string $ip): bool
    {
        if ($ip === '' || $ip === '0.0.0.0' || $ip === '127.0.0.1' || $ip === '::1') return true;
        // 공인 IP 가 아니면(사설/예약 대역) true
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    /** Accept-Language("ko-KR,ko;q=0.9,en;q=0.8") → 지원 언어 best-match 또는 null. */
    private static function langFromAcceptLanguage(string $header): ?string
    {
        if ($header === '') return null;
        $best = null; $bestQ = -1.0;
        foreach (explode(',', $header) as $part) {
            $seg = array_map('trim', explode(';', $part));
            $tag = strtolower((string)($seg[0] ?? ''));
            if ($tag === '' || $tag === '*') continue;
            $q = 1.0;
            for ($i = 1; $i < count($seg); $i++) {
                if (strpos($seg[$i], 'q=') === 0) $q = (float)substr($seg[$i], 2);
            }
            $full = str_replace('_', '-', $tag);
            $cand = null;
            if (in_array($full, self::SUPPORTED, true))            $cand = $full;
            elseif (in_array(substr($full, 0, 2), self::SUPPORTED, true)) $cand = substr($full, 0, 2);
            if ($cand !== null && $q > $bestQ) { $bestQ = $q; $best = $cand; }
        }
        return $best === 'zh-tw' ? 'zh-TW' : $best;
    }

    /** 다중 IP-geo 제공자 페일오버(서버측 → 광고차단 불가). 국가 ISO2(대문자) 또는 null. */
    private static function lookupCountry(string $ip): ?string
    {
        // 1) ipwho.is (HTTPS, no key)  2) ip-api.com (HTTP, no key)  3) ipapi.co (HTTPS, plain text)
        $candidates = [
            ['url' => "https://ipwho.is/{$ip}?fields=success,country_code", 'json' => 'country_code', 'ok' => 'success'],
            ['url' => "http://ip-api.com/json/{$ip}?fields=status,countryCode", 'json' => 'countryCode', 'okeq' => ['status' => 'success']],
            ['url' => "https://ipapi.co/{$ip}/country/", 'raw' => true],
        ];
        foreach ($candidates as $c) {
            $body = self::httpGet($c['url'], 1800);
            if ($body === null) continue;
            if (!empty($c['raw'])) {
                $cc = strtoupper(trim($body));
                if (preg_match('/^[A-Z]{2}$/', $cc)) return $cc;
                continue;
            }
            $d = json_decode($body, true);
            if (!is_array($d)) continue;
            if (isset($c['ok']) && empty($d[$c['ok']])) continue;
            if (isset($c['okeq'])) {
                foreach ($c['okeq'] as $k => $v) { if (($d[$k] ?? null) !== $v) continue 2; }
            }
            $cc = isset($d[$c['json']]) ? strtoupper(trim((string)$d[$c['json']])) : '';
            if (preg_match('/^[A-Z]{2}$/', $cc)) return $cc;
        }
        return null;
    }

    /** 짧은 타임아웃 HTTP GET (cURL 우선, 없으면 stream). 실패 시 null. */
    private static function httpGet(string $url, int $timeoutMs): ?string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER    => true,
                CURLOPT_TIMEOUT_MS        => $timeoutMs,
                CURLOPT_CONNECTTIMEOUT_MS => $timeoutMs,
                CURLOPT_FOLLOWLOCATION    => true,
                CURLOPT_MAXREDIRS         => 2,
                CURLOPT_SSL_VERIFYPEER    => true,
                CURLOPT_USERAGENT         => 'GeniegoROI-Geo/1.0',
            ]);
            $out  = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            return ($out !== false && $code >= 200 && $code < 300) ? (string)$out : null;
        }
        $ctx = stream_context_create(['http' => [
            'timeout'       => $timeoutMs / 1000,
            'ignore_errors' => true,
            'user_agent'    => 'GeniegoROI-Geo/1.0',
        ]]);
        $out = @file_get_contents($url, false, $ctx);
        return $out === false ? null : $out;
    }

    // ── 캐시(app_setting): key=geoc_<sha1(ip)> · value="CC|epoch" · TTL 30일 · IP 원문 미저장(No-PII) ──
    private static function cacheGet(\PDO $pdo, string $ip): ?string
    {
        try {
            $st = $pdo->prepare('SELECT svalue FROM app_setting WHERE skey = ?');
            $st->execute(['geoc_' . sha1($ip)]);
            $v = (string)($st->fetchColumn() ?: '');
            if ($v === '') return null;
            [$cc, $ts] = array_pad(explode('|', $v, 2), 2, '0');
            if ((time() - (int)$ts) > 2592000) return null; // 30일 만료
            return preg_match('/^[A-Z]{2}$/', $cc) ? $cc : null;
        } catch (\Throwable $e) { return null; }
    }

    private static function cacheSet(\PDO $pdo, string $ip, string $cc): void
    {
        try {
            $k   = 'geoc_' . sha1($ip);
            $v   = $cc . '|' . time();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $ex  = $pdo->prepare('SELECT 1 FROM app_setting WHERE skey = ?');
            $ex->execute([$k]);
            if ($ex->fetchColumn()) {
                $pdo->prepare('UPDATE app_setting SET svalue = ?, updated_at = ? WHERE skey = ?')->execute([$v, $now, $k]);
            } else {
                $pdo->prepare('INSERT INTO app_setting(skey, svalue, updated_at) VALUES(?,?,?)')->execute([$k, $v, $now]);
            }
        } catch (\Throwable $e) { /* 캐시 실패는 무시 — 다음 호출에서 재조회 */ }
    }

    private static function json(ResponseInterface $res, array $payload): ResponseInterface
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json; charset=utf-8')
                   ->withHeader('Cache-Control', 'no-store');
    }
}
