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
 * ★★ 안전 설계(SaaS 기본 활성 + 무지출 보장) — [현 차수]:
 *   구독회원이 자격증명을 등록하고 실행하면 즉시 집행되도록 기본 활성화한다. 다만 실제
 *   광고비가 의도치 않게 나가지 않도록 3중 안전장치를 둔다:
 *   1) 자격증명 게이트: 각 어댑터는 해당 매체 자격증명이 없으면 no_credentials 반환(실 API 호출 안 함).
 *   2) PAUSED 생성: 모든 캠페인은 PAUSED/정지 상태로만 생성 → 사용자가 매체 화면에서 검토 후
 *      직접 활성화하기 전까지 단 1원도 집행되지 않음.
 *   3) 긴급 킬스위치: AD_EXECUTION_DISABLED=1(또는 AD_EXECUTION_ENABLED=0)이면 전역 차단(사고 대응).
 *   - 모든 호출은 honest 결과(매체 에러 그대로) 반환. 무음 성공 금지.
 *
 * ★ 미검증 고지: 실 쓰기 자격증명으로 라이브 검증 후 운영 권장. 문서 스펙 기준 구현.
 *   Coupang 광고 집행 생성 API 는 파트너 승인이 별도 필요 → 자동 생성 미지원(정직 표기).
 */
final class AdAdapters
{
    private const META_VER = 'v19.0';
    private const GOOGLE_VER = 'v16';

    /** 집행 허용 여부. [현 차수] 기본 활성(자격증명+PAUSED 안전장치). 명시적 비활성/킬스위치만 차단. */
    public static function executionEnabled(): bool
    {
        if (getenv('AD_EXECUTION_DISABLED') === '1') return false; // 긴급 킬스위치
        if (getenv('AD_EXECUTION_ENABLED') === '0') return false;  // 명시적 비활성(레거시 보존)
        return true; // 기본 활성 — 자격증명 미연결 시 어댑터가 no_credentials, 캠페인은 PAUSED 생성(무지출)
    }

    /** channel_credential 에서 자격증명 1건 조회(테넌트 스코프).
     *  [현 차수] 채널·키 별칭 통합 — AdChannelConnect 수동등록('meta_ads'/'access_token')과
     *  OAuth 콜백 저장('meta'/'oauth_access_token') 양 경로 모두에서 자격증명을 찾는다. */
    private static function cred(PDO $pdo, string $tenant, string $channel, string $keyName): string
    {
        static $chanAlias = [
            'meta_ads'        => ['meta_ads', 'meta', 'facebook'],
            'google_ads'      => ['google_ads', 'google'],
            'tiktok_business' => ['tiktok_business', 'tiktok'],
            'naver_sa'        => ['naver_sa', 'naver'],
        ];
        static $keyAlias = ['access_token' => ['access_token', 'oauth_access_token']];
        $chans = $chanAlias[$channel] ?? [$channel];
        $keys  = $keyAlias[$keyName] ?? [$keyName];
        foreach ($chans as $c) {
            foreach ($keys as $k) {
                $v = self::credRaw($pdo, $tenant, $c, $k);
                if ($v !== '') return $v;
            }
        }
        return '';
    }

    private static function credRaw(PDO $pdo, string $tenant, string $channel, string $keyName): string
    {
        try {
            $st = $pdo->prepare('SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1');
            $st->execute([$tenant, $channel, $keyName]);
            return \Genie\Crypto::decrypt((string)($st->fetchColumn() ?: '')); // 202차 은행급 복호화
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
                case 'kakao_moment':    return self::fail('카카오모먼트 광고 집행 자동화는 준비 중입니다. 현재는 메타/구글/틱톡/네이버SA 채널을 이용하세요(카카오 알림톡 메시징은 정상 지원).', 'unsupported');
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
                case 'google_ads':      return self::googleUpdateBudget($pdo, $tenant, $externalId, $newDaily);
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
                case 'google_ads':      return self::googleSetStatus($pdo, $tenant, $externalId, 'PAUSED');
                case 'tiktok_business': return self::tiktokSetStatus($pdo, $tenant, $externalId, 'DISABLE');
                case 'naver_sa':        return self::naverSetLock($pdo, $tenant, $externalId, true);
                default:                return ['ok' => false, 'status' => 'unsupported'];
            }
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /**
     * [227차 P0] 활성화(PAUSED→실집행). pause() 의 대칭 — 실제 광고를 매체에서 ON.
     *   ★호출부(AutoCampaign::setStatus)에서 결제수단 게이트 + 명시적 사용자 승인(인앱 버튼) 후에만 호출.
     *   PAUSED 기본생성 안전정책은 유지하고, 옵티마이저는 절대 자동 활성화하지 않는다(사람-인-루프).
     *   여기서 비로소 실 광고비가 집행되기 시작하므로 매체별 status=ACTIVE/ENABLED/ENABLE/unlock 으로 전환.
     */
    public static function activate(PDO $pdo, string $tenant, string $channel, string $externalId): array
    {
        if (!self::executionEnabled() || $externalId === '') return ['ok' => false, 'status' => 'skipped'];
        try {
            switch ($channel) {
                case 'meta_ads':        return self::metaSetStatus($pdo, $tenant, $externalId, 'ACTIVE');
                case 'google_ads':      return self::googleSetStatus($pdo, $tenant, $externalId, 'ENABLED');
                case 'tiktok_business': return self::tiktokSetStatus($pdo, $tenant, $externalId, 'ENABLE');
                case 'naver_sa':        return self::naverSetLock($pdo, $tenant, $externalId, false);
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
    /** Google 캠페인 상태 변경(최적화 액추에이터 — 일시정지/재개). extId = customers/{cid}/campaigns/{id}. */
    private static function googleSetStatus(PDO $pdo, string $tenant, string $extId, string $status): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        if ($dev === '' || $token === '' || $extId === '') return ['ok' => false, 'status' => 'no_credentials'];
        if (!preg_match('#customers/(\d+)/#', $extId, $mm)) return ['ok' => false, 'error' => 'bad_external_id'];
        $cid = $mm[1];
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        $body = json_encode(['operations' => [['update' => ['resourceName' => $extId, 'status' => $status], 'updateMask' => 'status']]]);
        [$code, $res] = self::http('POST', "{$base}/campaigns:mutate", $hdr, $body);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }
    /** Google 캠페인 일예산 변경 — 캠페인의 campaignBudget 리소스를 조회 후 amountMicros 갱신. */
    private static function googleUpdateBudget(PDO $pdo, string $tenant, string $extId, int $daily): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        if ($dev === '' || $token === '' || $extId === '') return ['ok' => false, 'status' => 'no_credentials'];
        if (!preg_match('#customers/(\d+)/#', $extId, $mm)) return ['ok' => false, 'error' => 'bad_external_id'];
        $cid = $mm[1];
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        // 1) 캠페인의 campaign_budget 리소스명 조회(GAQL)
        $gaql = "SELECT campaign.campaign_budget FROM campaign WHERE campaign.resource_name = '{$extId}'";
        [$sc, $sr] = self::http('POST', "{$base}/googleAds:searchStream", $hdr, json_encode(['query' => $gaql]));
        $budgetRes = $sr[0]['results'][0]['campaign']['campaignBudget']
            ?? ($sr['results'][0]['campaign']['campaignBudget'] ?? '');
        if ($budgetRes === '') return ['ok' => false, 'error' => 'budget_not_found'];
        // 2) campaignBudget amountMicros 갱신
        $body = json_encode(['operations' => [['update' => ['resourceName' => $budgetRes, 'amountMicros' => (string)((int)$daily * 1000000)], 'updateMask' => 'amount_micros']]]);
        [$code, $res] = self::http('POST', "{$base}/campaignBudgets:mutate", $hdr, $body);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
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

    /* ════════════════════════ 크리에이티브/딜리버리 레이어 ════════════════════════ */

    /** ad_design(AI 디자인) spec_json → 광고 카피 추출. svg 는 래스터화 필요(이미지 매체용). */
    private static function loadDesign(PDO $pdo, string $tenant, int $designId): array
    {
        $out = ['headline' => 'GenieGo', 'copy' => '', 'subheadline' => '', 'cta' => 'LEARN_MORE', 'has_svg' => false, 'image_b64' => ''];
        if ($designId <= 0) return $out;
        try {
            $st = $pdo->prepare('SELECT spec_json, svg FROM ad_design WHERE tenant_id=? AND id=? LIMIT 1');
            $st->execute([$tenant, $designId]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) return $out;
            $spec = json_decode((string)($row['spec_json'] ?? '{}'), true) ?: [];
            $out['headline']    = mb_substr((string)($spec['headline'] ?? $out['headline']), 0, 30);
            $out['copy']        = mb_substr((string)($spec['copy'] ?? $spec['body'] ?? ''), 0, 90);
            $out['subheadline'] = mb_substr((string)($spec['subheadline'] ?? ''), 0, 30);
            $out['cta']         = (string)($spec['cta'] ?? 'LEARN_MORE');
            $svg = (string)($row['svg'] ?? '');
            $out['has_svg']     = $svg !== '';
            // [227차 P0] 래스터 이미지 감지 — AI 이미지생성(DALL-E/Stability) 결과는 data:image/*;base64 로
            //   svg 컬럼에 저장된다(adDesignSave: image→svg). 서버 래스터화(Imagick/GD) 없이 그대로 매체
            //   업로드 가능. SVG 마크업(<svg…)은 래스터화 불가라 이미지 광고 미사용(텍스트 크리에이티브 폴백).
            if (preg_match('#^data:image/(png|jpe?g|webp);base64,#i', $svg)) {
                $out['image_b64'] = substr($svg, strpos($svg, ',') + 1);
            }
        } catch (Throwable $e) {}
        return $out;
    }

    /** 캠페인 하위 adset/adgroup + ad 생성(PAUSED). 매체별 딜리버리 완성 레이어. */
    public static function buildDelivery(PDO $pdo, string $tenant, string $channel, string $campExtId, int $designId, int $daily, string $landing): array
    {
        if (!self::executionEnabled() || $campExtId === '') return ['ok' => false, 'status' => 'skipped'];
        $d = self::loadDesign($pdo, $tenant, $designId);
        if ($landing === '') $landing = 'https://roi.genie-go.com';
        try {
            switch ($channel) {
                case 'google_ads':      return self::googleDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing);
                case 'naver_sa':        return self::naverDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing);
                case 'meta_ads':        return self::metaDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing);
                case 'tiktok_business': return self::tiktokDeliver($pdo, $tenant, $campExtId, $d, $daily);
                default:                return ['ok' => false, 'status' => 'unsupported'];
            }
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /* ── Google: 광고그룹 + 반응형 검색광고(텍스트) — 완전 빌드 가능 ── */
    private static function googleDeliver(PDO $pdo, string $tenant, string $campRes, array $d, int $daily, string $landing): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        $cid   = preg_replace('/\D/', '', self::cred($pdo, $tenant, 'google_ads', 'customer_id'));
        if ($dev === '' || $token === '' || $cid === '') return ['ok' => false, 'error' => 'no_credentials'];
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        // 1) 광고그룹
        $agBody = json_encode(['operations' => [['create' => [
            'name' => $d['headline'] . ' AG', 'campaign' => $campRes, 'status' => 'PAUSED',
            'type' => 'SEARCH_STANDARD', 'cpcBidMicros' => (string)(max(100, (int)($daily / 50)) * 1000000),
        ]]]]);
        [$ac, $ar] = self::http('POST', "{$base}/adGroups:mutate", $hdr, $agBody);
        $agRes = $ar['results'][0]['resourceName'] ?? '';
        if ($agRes === '') return ['ok' => false, 'error' => 'adgroup: ' . (self::errMsg($ar) ?: ('HTTP ' . $ac))];
        // 2) 반응형 검색광고(헤드라인 3+, 설명 2)
        $h = array_values(array_filter([$d['headline'], $d['subheadline'] ?: ($d['headline'] . ' 지금'), 'GenieGo ROI']));
        $desc = array_values(array_filter([$d['copy'] ?: '데이터 기반 마케팅 자동화', '최적 채널·예산으로 성과 극대화']));
        $heads = array_map(fn($t) => ['text' => mb_substr($t, 0, 30)], array_slice($h, 0, 15));
        while (count($heads) < 3) $heads[] = ['text' => 'GenieGo ' . (count($heads) + 1)];
        $descs = array_map(fn($t) => ['text' => mb_substr($t, 0, 90)], array_slice($desc, 0, 4));
        while (count($descs) < 2) $descs[] = ['text' => '지금 시작하세요'];
        $adBody = json_encode(['operations' => [['create' => [
            'adGroup' => $agRes, 'status' => 'PAUSED',
            'ad' => ['finalUrls' => [$landing], 'responsiveSearchAd' => ['headlines' => $heads, 'descriptions' => $descs]],
        ]]]]);
        [$adc, $adr] = self::http('POST', "{$base}/adGroupAds:mutate", $hdr, $adBody);
        $adRes = $adr['results'][0]['resourceName'] ?? '';
        if ($adRes === '') return ['ok' => false, 'error' => 'ad: ' . (self::errMsg($adr) ?: ('HTTP ' . $adc))];
        return ['ok' => true, 'adgroup_id' => $agRes, 'ad_id' => $adRes, 'note' => 'Google 광고그룹+RSA 생성(PAUSED)'];
    }

    /* ── Naver: 광고그룹 + 텍스트 광고. (비즈채널 ID 필요 — cred 'channel_id' 사용) ── */
    private static function naverDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily, string $landing): array
    {
        $chId = self::cred($pdo, $tenant, 'naver_sa', 'channel_id'); // 등록된 비즈채널(사이트) ID
        if ($chId === '') return ['ok' => false, 'status' => 'needs_channel', 'note' => 'Naver 비즈채널(사이트) ID(channel_id) 등록 필요 — 광고그룹 생성 보류'];
        // 1) 광고그룹
        $agPath = '/ncc/adgroups';
        $agHdr = self::naverHeaders($pdo, $tenant, 'POST', $agPath);
        if ($agHdr === null) return ['ok' => false, 'error' => 'no_credentials'];
        $agBody = json_encode(['nccCampaignId' => $campId, 'name' => mb_substr($d['headline'], 0, 30), 'pcChannelId' => $chId, 'mobileChannelId' => $chId, 'bidAmt' => max(70, (int)($daily / 100)), 'useDailyBudget' => false]);
        [$ac, $ar] = self::http('POST', 'https://api.searchad.naver.com' . $agPath, $agHdr, $agBody);
        $agId = $ar['nccAdgroupId'] ?? '';
        if ($agId === '') return ['ok' => false, 'error' => 'adgroup: ' . (self::errMsg($ar) ?: ('HTTP ' . $ac))];
        // 2) 텍스트 광고
        $adPath = '/ncc/ads';
        $adHdr = self::naverHeaders($pdo, $tenant, 'POST', $adPath);
        $adBody = json_encode(['nccAdgroupId' => $agId, 'type' => 'TEXT_45', 'ad' => [
            'headline' => mb_substr($d['headline'], 0, 15), 'description' => mb_substr($d['copy'] ?: $d['subheadline'] ?: 'GenieGo', 0, 45),
            'pc' => ['final' => $landing], 'mobile' => ['final' => $landing],
        ], 'userLock' => true]);
        [$adc, $adr] = self::http('POST', 'https://api.searchad.naver.com' . $adPath, $adHdr, $adBody);
        $adId = $adr['nccAdId'] ?? '';
        if ($adId === '') return ['ok' => false, 'error' => 'ad: ' . (self::errMsg($adr) ?: ('HTTP ' . $adc))];
        return ['ok' => true, 'adgroup_id' => $agId, 'ad_id' => $adId, 'note' => 'Naver 광고그룹+텍스트광고 생성(userLock)'];
    }

    /* ── Meta: 광고세트 + 광고. 이미지/페이지 필요(page_id cred + 래스터 이미지). ── */
    private static function metaDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily, string $landing): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        $acct  = self::cred($pdo, $tenant, 'meta_ads', 'ad_account_id');
        $page  = self::cred($pdo, $tenant, 'meta_ads', 'page_id'); // 광고 게재용 Facebook 페이지 ID
        if ($token === '' || $acct === '') return ['ok' => false, 'error' => 'no_credentials'];
        if (strncmp($acct, 'act_', 4) !== 0) $acct = 'act_' . $acct;
        $api = "https://graph.facebook.com/" . self::META_VER;
        // 1) 광고세트(타깃 KR, 링크클릭 최적화, PAUSED)
        $asBody = [
            'name' => $d['headline'] . ' AdSet', 'campaign_id' => $campId, 'status' => 'PAUSED',
            'billing_event' => 'IMPRESSIONS', 'optimization_goal' => 'LINK_CLICKS',
            'bid_amount' => (string)max(100, (int)($daily / 100)),
            'targeting' => json_encode(['geo_locations' => ['countries' => ['KR']]]),
            'access_token' => $token,
        ];
        [$ac, $ar] = self::http('POST', "{$api}/{$acct}/adsets", ['Content-Type: application/x-www-form-urlencoded'], $asBody);
        $asId = $ar['id'] ?? '';
        if ($asId === '') return ['ok' => false, 'error' => 'adset: ' . (self::errMsg($ar) ?: ('HTTP ' . $ac))];
        if ($page === '') return ['ok' => true, 'adset_id' => $asId, 'ad_id' => '', 'status' => 'partial',
            'note' => 'Meta 광고세트 생성(PAUSED). 광고(ad) 생성은 page_id + 이미지 소재 필요 — 자격증명에 page_id 추가 후 완성.'];
        // [227차 P0] 2) 이미지 소재 업로드 — AI 생성 래스터(data:image base64)를 Meta /adimages 에 올려 image_hash 획득.
        //   이미지가 있으면 image 광고(link_data.image_hash), 없으면 링크 크리에이티브(Meta 가 OG 이미지 자동수집).
        $imageHash = '';
        if (!empty($d['image_b64'])) {
            $imageHash = self::metaUploadImage($api, $acct, $token, (string)$d['image_b64']);
        }
        // 3) 크리에이티브 + 광고
        $linkData = ['message' => $d['copy'] ?: $d['headline'], 'link' => $landing, 'name' => $d['headline'], 'description' => $d['subheadline']];
        if ($imageHash !== '') $linkData['image_hash'] = $imageHash; // 이미지 광고
        $creative = json_encode(['object_story_spec' => ['page_id' => $page, 'link_data' => $linkData]]);
        [$cc, $cr] = self::http('POST', "{$api}/{$acct}/adcreatives", ['Content-Type: application/x-www-form-urlencoded'], ['name' => $d['headline'] . ' Creative', 'object_story_spec' => $creative, 'access_token' => $token]);
        $crId = $cr['id'] ?? '';
        if ($crId === '') return ['ok' => true, 'adset_id' => $asId, 'ad_id' => '', 'status' => 'partial', 'note' => 'Meta 광고세트 생성. 크리에이티브 실패(이미지 필요): ' . self::errMsg($cr)];
        [$adc, $adr] = self::http('POST', "{$api}/{$acct}/ads", ['Content-Type: application/x-www-form-urlencoded'], ['name' => $d['headline'] . ' Ad', 'adset_id' => $asId, 'creative' => json_encode(['creative_id' => $crId]), 'status' => 'PAUSED', 'access_token' => $token]);
        $adId = $adr['id'] ?? '';
        if ($adId === '') return ['ok' => true, 'adset_id' => $asId, 'ad_id' => '', 'status' => 'partial', 'note' => 'Meta 광고세트+크리에이티브 생성. 광고 실패: ' . self::errMsg($adr)];
        return ['ok' => true, 'adset_id' => $asId, 'ad_id' => $adId, 'image_hash' => $imageHash,
            'note' => 'Meta 광고세트+광고 생성(PAUSED)' . ($imageHash !== '' ? ' — 이미지 소재 포함' : ' — 링크 크리에이티브(이미지 없음)')];
    }

    /**
     * [227차 P0] Meta /adimages 업로드 — base64 래스터 이미지 → image_hash.
     *   서버 래스터화(Imagick/GD) 없이 AI 생성 PNG(base64)를 그대로 bytes 파라미터로 전송한다.
     *   반환=image_hash(실패 시 '' → 호출부가 링크 크리에이티브로 폴백).
     */
    private static function metaUploadImage(string $api, string $acct, string $token, string $b64): string
    {
        [$code, $res] = self::http('POST', "{$api}/{$acct}/adimages",
            ['Content-Type: application/x-www-form-urlencoded'],
            ['bytes' => $b64, 'access_token' => $token]);
        if (is_array($res) && !empty($res['images'])) {
            foreach ($res['images'] as $img) {
                if (!empty($img['hash'])) return (string)$img['hash'];
            }
        }
        return '';
    }

    /* ── TikTok: 광고그룹 + 광고. 영상(video_id)·identity 필요. ── */
    private static function tiktokDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '') return ['ok' => false, 'error' => 'no_credentials'];
        // 1) 광고그룹(예산·게재 KR, 정지)
        $agBody = json_encode(['advertiser_id' => $advId, 'campaign_id' => $campId, 'adgroup_name' => $d['headline'] . ' AG',
            'placement_type' => 'PLACEMENT_TYPE_AUTOMATIC', 'budget_mode' => 'BUDGET_MODE_DAY', 'budget' => $daily,
            'optimization_goal' => 'CLICK', 'billing_event' => 'CPC', 'location_ids' => ['KR'], 'operation_status' => 'DISABLE',
            'schedule_type' => 'SCHEDULE_FROM_NOW']);
        [$ac, $ar] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/adgroup/create/', ['Access-Token: ' . $token, 'Content-Type: application/json'], $agBody);
        $agId = $ar['data']['adgroup_id'] ?? '';
        if ($agId === '') return ['ok' => false, 'error' => 'adgroup: ' . (($ar['message'] ?? '') ?: ('HTTP ' . $ac))];
        // 2) 광고 — 영상 소재(video_id) + identity 필요. SVG 디자인은 영상 변환 필요 → 보류 정직 표기.
        return ['ok' => true, 'adgroup_id' => $agId, 'ad_id' => '', 'status' => 'partial',
            'note' => 'TikTok 광고그룹 생성(DISABLE). 광고(ad)는 영상 소재(video_id)+identity 업로드 필요 — 영상 소재 등록 후 완성.'];
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
