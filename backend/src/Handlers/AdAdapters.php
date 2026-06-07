<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Throwable;

/**
 * 201차 — 광고 매체 outbound 집행 어댑터.
 *
 * AdChannelConnect 로 등록한 매체 자격증명(channel_credential, 테넌트 격리)을 사용해
 * 각 매체에 실제 캠페인을 생성/예산변경/일시정지한다. AutoCampaign(launch/optimize)에서 호출.
 *
 * ★★ 안전 설계(2중) — 검증 안 된 코드가 실제 광고비를 쓰지 않도록:
 *   1) 전역 게이트 AD_EXECUTION_ENABLED!=='1' 이면 어떤 매체 API 도 호출하지 않고
 *      {ok:false, status:'execution_disabled'} 반환(코드 배포만으로는 절대 집행 안 됨).
 *   2) 활성화돼도 모든 캠페인은 PAUSED/정지 상태로 생성 → 사용자가 매체 화면에서
 *      검토 후 직접 활성화하기 전까지 단 1원도 집행되지 않음.
 *   - 모든 호출은 honest 결과(매체 에러 그대로) 반환. 무음 성공 금지.
 *
 * ★ 미검증 고지: 실 쓰기 OAuth 자격증명이 없어 라이브 API 응답을 검증하지 못함.
 *   문서 스펙 기준 구현이며, 자격증명 연결 후 라이브 검증 단계가 필요하다.
 *   Coupang 광고 집행 생성 API 는 파트너 승인이 별도 필요 → 자동 생성 미지원(정직 표기).
 */
final class AdAdapters
{
    private const META_VER = 'v19.0';
    private const GOOGLE_VER = 'v16';

    public static function executionEnabled(): bool
    {
        return getenv('AD_EXECUTION_ENABLED') === '1';
    }

    /** channel_credential 에서 자격증명 1건 조회(테넌트 스코프). */
    private static function cred(PDO $pdo, string $tenant, string $channel, string $keyName): string
    {
        try {
            $st = $pdo->prepare('SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1');
            $st->execute([$tenant, $channel, $keyName]);
            return (string)($st->fetchColumn() ?: '');
        } catch (Throwable $e) { return ''; }
    }

    /** 공용 HTTP. 반환: [httpCode, decodedJson|raw, errStr] */
    private static function http(string $method, string $url, array $headers = [], $body = null, int $timeout = 20): array
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : http_build_query($body));
        }
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        $json = is_string($resp) ? json_decode($resp, true) : null;
        return [$code, ($json !== null ? $json : $resp), $err];
    }

    private static function ok(string $extId, string $status = 'paused', string $note = ''): array
    {
        return ['ok' => true, 'external_id' => $extId, 'status' => $status, 'note' => $note];
    }
    private static function fail(string $error, string $status = 'error'): array
    {
        return ['ok' => false, 'external_id' => '', 'status' => $status, 'error' => $error];
    }

    /** 일 예산 산출(매체는 보통 일예산). 채널 배정액 / 기간일수. */
    private static function dailyBudget(int $alloc, string $period): int
    {
        $days = ['monthly' => 30, 'quarter' => 90, 'halfyear' => 180, 'annual' => 365][$period] ?? 30;
        return max(1000, (int)round($alloc / $days / 100) * 100);
    }

    /* ════════════════════════ 디스패치 ════════════════════════ */

    /** 캠페인 생성(PAUSED). $camp: name, budget(채널 배정액), period, objective. */
    public static function createCampaign(PDO $pdo, string $tenant, string $channel, array $camp): array
    {
        if (!self::executionEnabled()) {
            return ['ok' => false, 'external_id' => '', 'status' => 'execution_disabled',
                'note' => '집행 어댑터 비활성. AD_EXECUTION_ENABLED=1 + 매체 자격증명 연결 후 PAUSED 로 생성됩니다.'];
        }
        $name   = mb_substr((string)($camp['name'] ?? 'GenieGo Auto'), 0, 100);
        $alloc  = (int)($camp['budget'] ?? 0);
        $period = (string)($camp['period'] ?? 'monthly');
        $daily  = self::dailyBudget($alloc, $period);
        try {
            switch ($channel) {
                case 'meta_ads':        return self::metaCreate($pdo, $tenant, $name, $daily);
                case 'google_ads':      return self::googleCreate($pdo, $tenant, $name, $daily);
                case 'tiktok_business': return self::tiktokCreate($pdo, $tenant, $name, $daily);
                case 'naver_sa':        return self::naverCreate($pdo, $tenant, $name, $daily);
                case 'coupang':         return self::fail('Coupang 광고 집행 생성은 파트너 승인 API 가 별도 필요합니다. 수동 연동을 이용하세요.', 'unsupported');
                default:                return self::fail('지원하지 않는 채널: ' . $channel, 'unsupported');
            }
        } catch (Throwable $e) {
            return self::fail($e->getMessage());
        }
    }

    /** 예산 변경(최적화 액추에이터). */
    public static function updateBudget(PDO $pdo, string $tenant, string $channel, string $externalId, int $newDaily): array
    {
        if (!self::executionEnabled() || $externalId === '') return ['ok' => false, 'status' => 'skipped'];
        try {
            switch ($channel) {
                case 'meta_ads':        return self::metaUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                case 'tiktok_business': return self::tiktokUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                case 'naver_sa':        return self::naverUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                default:                return ['ok' => false, 'status' => 'unsupported'];
            }
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /** 일시정지(손해 채널 회수). */
    public static function pause(PDO $pdo, string $tenant, string $channel, string $externalId): array
    {
        if (!self::executionEnabled() || $externalId === '') return ['ok' => false, 'status' => 'skipped'];
        try {
            switch ($channel) {
                case 'meta_ads':        return self::metaSetStatus($pdo, $tenant, $externalId, 'PAUSED');
                case 'tiktok_business': return self::tiktokSetStatus($pdo, $tenant, $externalId, 'DISABLE');
                case 'naver_sa':        return self::naverSetLock($pdo, $tenant, $externalId, true);
                default:                return ['ok' => false, 'status' => 'unsupported'];
            }
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /* ════════════════════════ Meta ════════════════════════ */
    private static function metaCreate(PDO $pdo, string $tenant, string $name, int $daily): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        $acct  = self::cred($pdo, $tenant, 'meta_ads', 'ad_account_id');
        if ($token === '' || $acct === '') return self::fail('Meta 자격증명(access_token/ad_account_id) 미등록', 'no_credentials');
        if (strncmp($acct, 'act_', 4) !== 0) $acct = 'act_' . $acct;
        $url = "https://graph.facebook.com/" . self::META_VER . "/{$acct}/campaigns";
        // status=PAUSED, CBO 일예산, 트래픽 목표(특수 카테고리 없음)
        $body = [
            'name' => $name, 'objective' => 'OUTCOME_TRAFFIC', 'status' => 'PAUSED',
            'special_ad_categories' => json_encode([]), 'daily_budget' => (string)$daily,
            'access_token' => $token,
        ];
        [$code, $res] = self::http('POST', $url, ['Content-Type: application/x-www-form-urlencoded'], $body);
        if ($code >= 200 && $code < 300 && !empty($res['id'])) return self::ok((string)$res['id'], 'paused', 'Meta 캠페인 생성(PAUSED)');
        return self::fail('Meta: ' . (self::errMsg($res) ?: ('HTTP ' . $code)));
    }
    private static function metaUpdateBudget(PDO $pdo, string $tenant, string $extId, int $daily): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        [$code, $res] = self::http('POST', "https://graph.facebook.com/" . self::META_VER . "/{$extId}",
            ['Content-Type: application/x-www-form-urlencoded'], ['daily_budget' => (string)$daily, 'access_token' => $token]);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }
    private static function metaSetStatus(PDO $pdo, string $tenant, string $extId, string $status): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        [$code, $res] = self::http('POST', "https://graph.facebook.com/" . self::META_VER . "/{$extId}",
            ['Content-Type: application/x-www-form-urlencoded'], ['status' => $status, 'access_token' => $token]);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }

    /* ════════════════════════ Google Ads ════════════════════════ */
    private static function googleCreate(PDO $pdo, string $tenant, string $name, int $daily): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        $cid   = preg_replace('/\D/', '', self::cred($pdo, $tenant, 'google_ads', 'customer_id'));
        if ($dev === '' || $token === '' || $cid === '') return self::fail('Google 자격증명(developer_token/access_token/customer_id) 미등록', 'no_credentials');
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        // 1) campaignBudget 생성 (amountMicros = 원*1,000,000)
        $budgetBody = json_encode(['operations' => [['create' => [
            'name' => $name . ' Budget ' . substr(md5($name . $daily), 0, 6),
            'amountMicros' => (string)((int)$daily * 1000000),
            'deliveryMethod' => 'STANDARD',
        ]]]]);
        [$bc, $br] = self::http('POST', "{$base}/campaignBudgets:mutate", $hdr, $budgetBody);
        $budgetRes = $br['results'][0]['resourceName'] ?? '';
        if ($budgetRes === '') return self::fail('Google 예산 생성 실패: ' . (self::errMsg($br) ?: ('HTTP ' . $bc)));
        // 2) campaign 생성 (PAUSED, SEARCH)
        $campBody = json_encode(['operations' => [['create' => [
            'name' => $name, 'status' => 'PAUSED', 'advertisingChannelType' => 'SEARCH',
            'manualCpc' => new \stdClass(), 'campaignBudget' => $budgetRes,
        ]]]]);
        [$cc, $cr] = self::http('POST', "{$base}/campaigns:mutate", $hdr, $campBody);
        $campRes = $cr['results'][0]['resourceName'] ?? '';
        if ($campRes === '') return self::fail('Google 캠페인 생성 실패: ' . (self::errMsg($cr) ?: ('HTTP ' . $cc)));
        return self::ok($campRes, 'paused', 'Google 캠페인 생성(PAUSED)');
    }

    /* ════════════════════════ TikTok ════════════════════════ */
    private static function tiktokCreate(PDO $pdo, string $tenant, string $name, int $daily): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '') return self::fail('TikTok 자격증명(access_token/advertiser_id) 미등록', 'no_credentials');
        $body = json_encode([
            'advertiser_id' => $advId, 'campaign_name' => $name, 'objective_type' => 'TRAFFIC',
            'budget_mode' => 'BUDGET_MODE_DAY', 'budget' => $daily, 'operation_status' => 'DISABLE',
        ]);
        [$code, $res] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/campaign/create/',
            ['Access-Token: ' . $token, 'Content-Type: application/json'], $body);
        if (($res['code'] ?? -1) === 0 && !empty($res['data']['campaign_id'])) return self::ok((string)$res['data']['campaign_id'], 'paused', 'TikTok 캠페인 생성(DISABLE)');
        return self::fail('TikTok: ' . (($res['message'] ?? '') ?: ('HTTP ' . $code)));
    }
    private static function tiktokUpdateBudget(PDO $pdo, string $tenant, string $extId, int $daily): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        $body = json_encode(['advertiser_id' => $advId, 'campaign_id' => $extId, 'budget' => $daily]);
        [$code, $res] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/campaign/update/',
            ['Access-Token: ' . $token, 'Content-Type: application/json'], $body);
        return (($res['code'] ?? -1) === 0) ? ['ok' => true] : ['ok' => false, 'error' => ($res['message'] ?? 'HTTP ' . $code)];
    }
    private static function tiktokSetStatus(PDO $pdo, string $tenant, string $extId, string $status): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        $body = json_encode(['advertiser_id' => $advId, 'campaign_ids' => [$extId], 'operation_status' => $status]);
        [$code, $res] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/',
            ['Access-Token: ' . $token, 'Content-Type: application/json'], $body);
        return (($res['code'] ?? -1) === 0) ? ['ok' => true] : ['ok' => false, 'error' => ($res['message'] ?? 'HTTP ' . $code)];
    }

    /* ════════════════════════ Naver SearchAd (HMAC) ════════════════════════ */
    private static function naverHeaders(PDO $pdo, string $tenant, string $method, string $path): ?array
    {
        $apiKey = self::cred($pdo, $tenant, 'naver_sa', 'api_key');
        $secret = self::cred($pdo, $tenant, 'naver_sa', 'api_secret');
        $cust   = self::cred($pdo, $tenant, 'naver_sa', 'customer_id');
        if ($apiKey === '' || $secret === '' || $cust === '') return null;
        $ts = (string)round(microtime(true) * 1000);
        $sig = base64_encode(hash_hmac('sha256', $ts . '.' . strtoupper($method) . '.' . $path, $secret, true));
        return ['Content-Type: application/json', 'X-Timestamp: ' . $ts, 'X-API-KEY: ' . $apiKey, 'X-Customer: ' . $cust, 'X-Signature: ' . $sig];
    }
    private static function naverCreate(PDO $pdo, string $tenant, string $name, int $daily): array
    {
        $path = '/ncc/campaigns';
        $hdr = self::naverHeaders($pdo, $tenant, 'POST', $path);
        if ($hdr === null) return self::fail('Naver 자격증명(api_key/api_secret/customer_id) 미등록', 'no_credentials');
        $body = json_encode(['name' => $name, 'campaignTp' => 'WEB_SITE', 'dailyBudget' => $daily, 'useDailyBudget' => true, 'userLock' => true]); // userLock=정지
        [$code, $res] = self::http('POST', 'https://api.searchad.naver.com' . $path, $hdr, $body);
        if ($code >= 200 && $code < 300 && !empty($res['nccCampaignId'])) return self::ok((string)$res['nccCampaignId'], 'paused', 'Naver 캠페인 생성(userLock)');
        return self::fail('Naver: ' . (self::errMsg($res) ?: ('HTTP ' . $code)));
    }
    private static function naverUpdateBudget(PDO $pdo, string $tenant, string $extId, int $daily): array
    {
        $path = '/ncc/campaigns/' . $extId;
        $hdr = self::naverHeaders($pdo, $tenant, 'PUT', $path);
        if ($hdr === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$code, $res] = self::http('PUT', 'https://api.searchad.naver.com' . $path . '?fields=budget', $hdr,
            json_encode(['nccCampaignId' => $extId, 'dailyBudget' => $daily, 'useDailyBudget' => true]));
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }
    private static function naverSetLock(PDO $pdo, string $tenant, string $extId, bool $lock): array
    {
        $path = '/ncc/campaigns/' . $extId;
        $hdr = self::naverHeaders($pdo, $tenant, 'PUT', $path);
        if ($hdr === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$code, $res] = self::http('PUT', 'https://api.searchad.naver.com' . $path . '?fields=userLock', $hdr,
            json_encode(['nccCampaignId' => $extId, 'userLock' => $lock]));
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }

    private static function errMsg($res): string
    {
        if (is_array($res)) {
            return (string)($res['error']['message'] ?? $res['error']['error_user_msg']
                ?? $res['title'] ?? $res['message'] ?? ($res['errors'][0]['message'] ?? ''));
        }
        return is_string($res) ? mb_substr($res, 0, 200) : '';
    }
}
