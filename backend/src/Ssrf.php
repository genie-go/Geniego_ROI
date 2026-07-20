<?php
declare(strict_types=1);

namespace Genie;

/**
 * SSRF 방어 SSOT — 서버측 아웃바운드 요청 대상 URL의 사설/루프백/링크로컬/클라우드 메타데이터 차단.
 *
 * [현 차수] 신설: 코드베이스에 동형 가드가 5~6개 산재(ClaudeAI::urlSafe·OpenPlatform::isPublicHttpsUrl·
 *   Alerting::isSafeWebhookUrl·DataExport/JourneyBuilder::isPublicHttpsUrl·WebPush::isPushServiceEndpoint)했으나,
 *   신규 사용자 URL 표면(SSO IdP·스토어 커넥터 base·헬프데스크 domain·이미지 fetch)엔 적용이 누락돼 있었다.
 *   본 클래스를 정본으로 삼아 미가드 sink에 적용한다(기존 가드의 본 SSOT 통합은 후속·무회귀 우선).
 *
 * 판정: http/https 스킴 + 호스트 DNS 해석 후 사설/예약 대역·메타데이터 IP 차단(fail-closed=미해석도 거부).
 *   기존 가드와 동일 로직(gethostbynamel + FILTER_FLAG_NO_PRIV_RANGE|NO_RES_RANGE). 공개 벤더 호스트는 통과.
 */
final class Ssrf
{
    /** 대상 URL이 SSRF 관점에서 안전하면 true. 사설/루프백/링크로컬/메타데이터/미해석/비 http(s) = false. */
    public static function safeUrl(string $url): bool
    {
        $url = trim($url);
        if ($url === '' || !preg_match('#^https?://#i', $url)) return false;
        $host = strtolower((string)(parse_url($url, PHP_URL_HOST) ?? ''));
        if ($host === '' || $host === 'localhost'
            || str_ends_with($host, '.localhost') || str_ends_with($host, '.internal') || str_ends_with($host, '.local')) {
            return false;
        }
        // 호스트가 리터럴 IP면 직접, 아니면 DNS 해석 후 검사. 해석 실패 = fail-closed(false).
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips[] = $host;
        } else {
            $r = @gethostbynamel($host);
            if (is_array($r)) $ips = $r;
        }
        if (empty($ips)) return false;
        foreach ($ips as $ip) {
            // 사설(10/8·172.16/12·192.168/16)·예약(127/8·0/8·링크로컬 169.254/16·멀티캐스트 등) 차단.
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
            if ($ip === '169.254.169.254') return false; // 클라우드 인스턴스 메타데이터(명시 차단)
        }
        return true;
    }

    /**
     * curl 핸들에 프로토콜 제한 적용 — 초기 요청·리다이렉트 모두 http/https 로 제한.
     *   FOLLOWLOCATION=true 인 호출에서 file://·gopher://·dict:// 등으로의 리다이렉트 SSRF 를 차단한다.
     */
    public static function guardCurl($ch): void
    {
        if (defined('CURLPROTO_HTTP')) {
            @curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
            @curl_setopt($ch, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
        }
    }
}
