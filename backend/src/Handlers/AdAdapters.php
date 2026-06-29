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
    private const GOOGLE_VER = 'v17'; // [237차] 인제스트(Connectors v17)와 통일 — 집행도 동일 버전(구 v16 sunset 대비)

    /** 집행 허용 여부. [현 차수] 기본 활성(자격증명+PAUSED 안전장치). 명시적 비활성/킬스위치만 차단. */
    public static function executionEnabled(): bool
    {
        if (getenv('AD_EXECUTION_DISABLED') === '1') return false; // 긴급 킬스위치
        if (getenv('AD_EXECUTION_ENABLED') === '0') return false;  // 명시적 비활성(레거시 보존)
        return true; // 기본 활성 — 자격증명 미연결 시 어댑터가 no_credentials, 캠페인은 PAUSED 생성(무지출)
    }

    /** [231차 OS#4] 테넌트 AI Agent 권한모드 — owner 행의 agent_mode('recommend'|'approval'|'auto'). 기본 'approval'(안전). */
    public static function agentMode(PDO $pdo, string $tenant): string
    {
        try {
            $st = $pdo->prepare("SELECT agent_mode FROM app_user WHERE tenant_id = ? AND (parent_user_id IS NULL OR team_role = 'owner') ORDER BY id LIMIT 1");
            $st->execute([$tenant]);
            $m = (string)$st->fetchColumn();
            return in_array($m, ['recommend', 'approval', 'auto'], true) ? $m : 'approval';
        } catch (\Throwable $e) { return 'approval'; }
    }

    /** 자율(승인없이) 실행 허용 여부 — 'auto' 모드 + 킬스위치 OFF 일 때만 true. 자율 실행 경로에서 호출. */
    public static function agentAutoAllowed(PDO $pdo, string $tenant): bool
    {
        return self::executionEnabled() && self::agentMode($pdo, $tenant) === 'auto';
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
            'kakao_moment'    => ['kakao_moment', 'kakao'], // [232차 Sprint3] Kakao Moment 집행
            'line_ads'        => ['line_ads'],             // [232차] LINE Ads 집행(메시징 'line'과 별개)
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

    /** 일 예산 산출(매체는 보통 일예산). 채널 배정액 / 기간일수. (KRW 기준) */
    private static function dailyBudget(int $alloc, string $period): int
    {
        $days = ['monthly' => 30, 'quarter' => 90, 'halfyear' => 180, 'annual' => 365][$period] ?? 30;
        return max(1000, (int)round($alloc / $days / 100) * 100);
    }

    /* ════════════════════════ [현 차수] 멀티통화 집행 + 자동입찰 ════════════════════════
     *   기존: 예산을 KRW 정수로 매체에 그대로 전송 → 비-KRW 계정에서 단위 오류(Meta=계정통화 minor단위/Google=micros).
     *   기존: 고정 manual bid(daily/100·manualCpc) → 매체 머신러닝 자동입찰(maximize/tROAS/tCPA) 미활용.
     *   개선: 계정통화(cred 'account_currency', 기본 KRW=무변환=기존동작 보존) 환산 + 입찰전략 선택(auto 기본). */

    /** 매체 계정 통화(cred 'account_currency'). 미설정=KRW(기존 동작 보존). */
    private static function accountCur(PDO $pdo, string $tenant, string $channel): string
    {
        $c = strtoupper(trim(self::cred($pdo, $tenant, $channel, 'account_currency')));
        return $c !== '' ? $c : 'KRW';
    }

    /** KRW 일예산 → 계정 통화 major 단위(소수). KRW/미상통화=무변환(기존 KRW 동작 그대로). */
    private static function toAcctMajor(int $dailyKrw, string $cur): float
    {
        if ($cur === '' || $cur === 'KRW') return (float)$dailyKrw;
        $rate = \Genie\Handlers\Connectors::fxToKrw(1.0, $cur); // fxToKrw(1,cur)=1 cur당 KRW 환율
        return ($rate > 0 && $rate !== 1.0) ? $dailyKrw / $rate : (float)$dailyKrw;
    }

    /** 0-decimal 통화(원/엔/동 등)는 minor=major, 그 외 ×100(Meta daily_budget=계정통화 minor 단위). */
    private static function toMinor(float $major, string $cur): int
    {
        $zero = ['KRW' => 1, 'JPY' => 1, 'VND' => 1, 'CLP' => 1, 'IDR' => 1]; // 무소수 통화
        return max(1, (int)round($major * (isset($zero[$cur]) ? 1 : 100)));
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
        // [현 차수 초고도화] 캠페인 목표 — 커머스 ROI 플랫폼은 클릭이 아니라 구매/전환 최적화가 본질.
        //   'conversions'|'sales' 면 매체 전환목표 + 픽셀 전환최적화로 생성(픽셀 자격증명 있을 때만, 없으면 트래픽 honest 폴백).
        // [현 차수] 집행 설정 — 목표/입찰전략/타깃CPA·ROAS/타깃국가. 입찰 기본 auto(매체 머신러닝 자동입찰).
        $settings = [
            'objective'    => strtolower((string)($camp['objective'] ?? 'conversions')),
            'bid_strategy' => strtolower((string)($camp['bid_strategy'] ?? 'auto')),  // auto|tcpa|troas|manual
            'target_cpa'   => (float)($camp['target_cpa'] ?? 0),   // KRW(계정통화 환산)
            'target_roas'  => (float)($camp['target_roas'] ?? 0),  // 비율(예: 3.0 = 300%)
            'countries'    => (is_array($camp['countries'] ?? null) && $camp['countries']) ? array_values(array_filter(array_map('strval', $camp['countries']))) : ['KR'],
        ];
        try {
            switch ($channel) {
                case 'meta_ads':        return self::metaCreate($pdo, $tenant, $name, $daily, $settings);
                case 'google_ads':      return self::googleCreate($pdo, $tenant, $name, $daily, $settings);
                case 'tiktok_business': return self::tiktokCreate($pdo, $tenant, $name, $daily, $settings);
                case 'naver_sa':        return self::naverCreate($pdo, $tenant, $name, $daily);
                case 'kakao_moment':    return self::kakaoCreate($pdo, $tenant, $name, $daily);
                case 'line_ads':        return self::lineCreate($pdo, $tenant, $name, $daily);
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
                case 'google_ads':      return self::googleUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                case 'tiktok_business': return self::tiktokUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                case 'naver_sa':        return self::naverUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                case 'kakao_moment':    return self::kakaoUpdateBudget($pdo, $tenant, $externalId, $newDaily);
                case 'line_ads':        return self::lineUpdateBudget($pdo, $tenant, $externalId, $newDaily);
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
                case 'kakao_moment':    return self::kakaoSetConfig($pdo, $tenant, $externalId, 'OFF');
                case 'line_ads':        return self::lineSetStatus($pdo, $tenant, $externalId, 'PAUSED');
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
                case 'kakao_moment':    return self::kakaoSetConfig($pdo, $tenant, $externalId, 'ON');
                case 'line_ads':        return self::lineSetStatus($pdo, $tenant, $externalId, 'ACTIVE');
                default:                return ['ok' => false, 'status' => 'unsupported'];
            }
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /**
     * [현 차수 감사 P1] 딜리버리 캐스케이드 활성화 — 캠페인만 ACTIVE 하던 결함 해소.
     *   매체 effective_status = 캠페인 ∧ 광고세트/그룹 ∧ 광고 의 AND 라, buildDelivery 가 PAUSED/OFF 로 만든
     *   하위(adset/adgroup/ad)를 함께 활성화하지 않으면 캠페인만 ACTIVE 여도 노출·지출 0(사일런트 미집행)이었다.
     *   하위 ext_id 가 없으면(구 캠페인·미보존) 캠페인만 활성(폴백). 레벨별 honest 결과 반환.
     *   ※ 일시정지(pause)는 캠페인 정지만으로 전 하위 게재가 중단되므로 캐스케이드 불요(기존 pause 유지).
     */
    public static function activateDelivery(PDO $pdo, string $tenant, string $channel, string $campExtId, string $adsetExtId = '', string $adExtId = ''): array
    {
        if (!self::executionEnabled()) return ['ok' => false, 'status' => 'skipped'];
        $r = [];
        try {
            switch ($channel) {
                case 'meta_ads': // 동일 /{id} status 엔드포인트가 캠페인/광고세트/광고 모두 처리
                    if ($campExtId !== '')  $r['campaign'] = self::metaSetStatus($pdo, $tenant, $campExtId, 'ACTIVE');
                    if ($adsetExtId !== '') $r['adset']    = self::metaSetStatus($pdo, $tenant, $adsetExtId, 'ACTIVE');
                    if ($adExtId !== '')    $r['ad']       = self::metaSetStatus($pdo, $tenant, $adExtId, 'ACTIVE');
                    break;
                case 'google_ads':
                    if ($campExtId !== '')  $r['campaign'] = self::googleSetStatus($pdo, $tenant, $campExtId, 'ENABLED');
                    if ($adsetExtId !== '') $r['adgroup']  = self::googleResourceStatus($pdo, $tenant, $adsetExtId, 'adGroups', 'ENABLED');
                    if ($adExtId !== '')    $r['ad']       = self::googleResourceStatus($pdo, $tenant, $adExtId, 'adGroupAds', 'ENABLED');
                    break;
                case 'tiktok_business':
                    if ($campExtId !== '')  $r['campaign'] = self::tiktokSetStatus($pdo, $tenant, $campExtId, 'ENABLE');
                    if ($adsetExtId !== '') $r['adgroup']  = self::tiktokEntityStatus($pdo, $tenant, 'adgroup', 'adgroup_ids', $adsetExtId, 'ENABLE');
                    if ($adExtId !== '')    $r['ad']       = self::tiktokEntityStatus($pdo, $tenant, 'ad', 'ad_ids', $adExtId, 'ENABLE');
                    break;
                case 'naver_sa':
                    if ($campExtId !== '')  $r['campaign'] = self::naverSetLock($pdo, $tenant, $campExtId, false);
                    if ($adsetExtId !== '') $r['adgroup']  = self::naverEntityLock($pdo, $tenant, '/ncc/adgroups', 'nccAdgroupId', $adsetExtId, false);
                    if ($adExtId !== '')    $r['ad']       = self::naverEntityLock($pdo, $tenant, '/ncc/ads', 'nccAdId', $adExtId, false);
                    break;
                case 'kakao_moment':
                    if ($campExtId !== '')  $r['campaign'] = self::kakaoSetConfig($pdo, $tenant, $campExtId, 'ON');
                    if ($adsetExtId !== '') $r['adgroup']  = self::kakaoEntityConfig($pdo, $tenant, '/openapi/v4/adGroups/config', $adsetExtId, 'ON');
                    if ($adExtId !== '')    $r['creative'] = self::kakaoEntityConfig($pdo, $tenant, '/openapi/v4/creatives/config', $adExtId, 'ON');
                    break;
                case 'line_ads':
                    if ($campExtId !== '')  $r['campaign'] = self::lineSetStatus($pdo, $tenant, $campExtId, 'ACTIVE');
                    if ($adsetExtId !== '') $r['adgroup']  = self::lineEntityStatus($pdo, $tenant, '/api/v3/adgroups', $adsetExtId, 'ACTIVE');
                    if ($adExtId !== '')    $r['ad']       = self::lineEntityStatus($pdo, $tenant, '/api/v3/ads', $adExtId, 'ACTIVE');
                    break;
                default: return ['ok' => false, 'status' => 'unsupported'];
            }
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
        $ok = true; $errs = [];
        foreach ($r as $lvl => $rr) { if (empty($rr['ok'])) { $ok = false; $errs[] = $lvl . ':' . (string)($rr['error'] ?? $rr['status'] ?? 'fail'); } }
        return ['ok' => $ok, 'levels' => array_keys($r), 'error' => implode(';', $errs)];
    }

    /** Google adGroups/adGroupAds 상태 변경(캐스케이드 활성화용). resourceName=customers/{cid}/adGroups|adGroupAds/{id}. */
    private static function googleResourceStatus(PDO $pdo, string $tenant, string $resourceName, string $service, string $status): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        if ($dev === '' || $token === '' || $resourceName === '') return ['ok' => false, 'status' => 'no_credentials'];
        if (!preg_match('#customers/(\d+)/#', $resourceName, $mm)) return ['ok' => false, 'error' => 'bad_resource'];
        $cid = $mm[1];
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        $body = json_encode(['operations' => [['update' => ['resourceName' => $resourceName, 'status' => $status], 'updateMask' => 'status']]]);
        [$code, $res] = self::http('POST', "{$base}/{$service}:mutate", $hdr, $body);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }

    /** TikTok adgroup/ad 상태 변경(캐스케이드). endpoint=adgroup|ad, idsField=adgroup_ids|ad_ids. */
    private static function tiktokEntityStatus(PDO $pdo, string $tenant, string $endpoint, string $idsField, string $extId, string $status): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '' || $extId === '') return ['ok' => false, 'status' => 'no_credentials'];
        $body = json_encode(['advertiser_id' => $advId, $idsField => [$extId], 'operation_status' => $status]);
        [$code, $res] = self::http('POST', "https://business-api.tiktok.com/open_api/v1.3/{$endpoint}/status/update/",
            ['Access-Token: ' . $token, 'Content-Type: application/json'], $body);
        return (($res['code'] ?? -1) === 0) ? ['ok' => true] : ['ok' => false, 'error' => ($res['message'] ?? 'HTTP ' . $code)];
    }

    /** Naver 광고그룹/광고 userLock 해제(캐스케이드). pathPrefix=/ncc/adgroups|/ncc/ads, idField=nccAdgroupId|nccAdId. */
    private static function naverEntityLock(PDO $pdo, string $tenant, string $pathPrefix, string $idField, string $extId, bool $lock): array
    {
        $path = $pathPrefix . '/' . $extId;
        $hdr = self::naverHeaders($pdo, $tenant, 'PUT', $path);
        if ($hdr === null) return ['ok' => false, 'status' => 'no_credentials'];
        [$code, $res] = self::http('PUT', 'https://api.searchad.naver.com' . $path . '?fields=userLock', $hdr,
            json_encode([$idField => $extId, 'userLock' => $lock]));
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res)];
    }

    /** Kakao 광고그룹/소재 config 전환(캐스케이드). path=/openapi/v4/adGroups/config|/openapi/v4/creatives/config. */
    private static function kakaoEntityConfig(PDO $pdo, string $tenant, string $path, string $extId, string $config): array
    {
        $h = self::kakaoHeaders($pdo, $tenant);
        if ($h === null) return ['ok' => false, 'status' => 'no_credentials'];
        [$hdr, $acc] = $h;
        $body = json_encode(['adAccountId' => (int)$acc, 'id' => (int)$extId, 'config' => $config], JSON_UNESCAPED_UNICODE);
        [$code, $res] = self::http('PUT', 'https://apis.moment.kakao.com' . $path, $hdr, $body);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res) ?: ('HTTP ' . $code)];
    }

    /** LINE 광고그룹/광고 status 전환(캐스케이드). pathPrefix=/api/v3/adgroups|/api/v3/ads. */
    private static function lineEntityStatus(PDO $pdo, string $tenant, string $pathPrefix, string $extId, string $status): array
    {
        $c = self::lineCreds($pdo, $tenant);
        if ($c === null) return ['ok' => false, 'status' => 'no_credentials'];
        [$ak, $sk] = $c;
        $path = $pathPrefix . '/' . rawurlencode($extId);
        [$code, $res] = self::lineReq('PUT', $path, ['status' => $status], $ak, $sk);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res) ?: ('HTTP ' . $code)];
    }

    /* ════════════════════════ Meta ════════════════════════ */
    /** [현 차수 초고도화] 전환 최적화 캠페인 여부 — objective 가 conversions/sales 이고 pixel_id 자격증명이 있을 때만.
     *   픽셀 없으면 전환 캠페인 생성이 불가(매체 요구)하므로 트래픽으로 honest 폴백. */
    private static function metaIsConversion(PDO $pdo, string $tenant, string $objective): bool
    {
        return in_array($objective, ['conversions', 'sales', 'purchase'], true)
            && trim(self::cred($pdo, $tenant, 'meta_ads', 'pixel_id')) !== '';
    }
    /** Meta 캠페인 입찰전략 매핑. auto=LOWEST_COST_WITHOUT_CAP(예산 내 최대성과)·tcpa=COST_CAP·troas=최소ROAS(전환만)·manual=미설정(adset bid). */
    private static function metaBidStrategy(string $bs, bool $conv): string
    {
        switch ($bs) {
            case 'auto':  return 'LOWEST_COST_WITHOUT_CAP';
            case 'tcpa':  return 'COST_CAP';
            case 'troas': return $conv ? 'LOWEST_COST_WITH_MIN_ROAS' : 'LOWEST_COST_WITHOUT_CAP';
            default:      return ''; // manual → adset bid_amount(기존)
        }
    }
    private static function metaCreate(PDO $pdo, string $tenant, string $name, int $daily, array $settings = []): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        $acct  = self::cred($pdo, $tenant, 'meta_ads', 'ad_account_id');
        if ($token === '' || $acct === '') return self::fail('Meta 자격증명(access_token/ad_account_id) 미등록', 'no_credentials');
        if (strncmp($acct, 'act_', 4) !== 0) $acct = 'act_' . $acct;
        $url = "https://graph.facebook.com/" . self::META_VER . "/{$acct}/campaigns";
        // [현 차수] 전환(구매) 목표 우선 — 픽셀 있으면 OUTCOME_SALES, 없으면 트래픽 폴백(honest). status=PAUSED, CBO 일예산.
        $conv = self::metaIsConversion($pdo, $tenant, (string)($settings['objective'] ?? 'traffic'));
        // [현 차수] 멀티통화 — 계정 통화 minor 단위로 예산 환산(KRW 계정=무변환=기존동작).
        $cur    = self::accountCur($pdo, $tenant, 'meta_ads');
        $budget = self::toMinor(self::toAcctMajor($daily, $cur), $cur);
        $body = [
            'name' => $name, 'objective' => $conv ? 'OUTCOME_SALES' : 'OUTCOME_TRAFFIC', 'status' => 'PAUSED',
            'special_ad_categories' => json_encode([]), 'daily_budget' => (string)$budget,
            'access_token' => $token,
        ];
        // [현 차수] 자동입찰 전략(매체 머신러닝). 기본 auto. COST_CAP/최소ROAS는 adset bid 제약과 함께 동작(metaDeliver).
        $bidStrategy = self::metaBidStrategy((string)($settings['bid_strategy'] ?? 'auto'), $conv);
        if ($bidStrategy !== '') $body['bid_strategy'] = $bidStrategy;
        [$code, $res] = self::http('POST', $url, ['Content-Type: application/x-www-form-urlencoded'], $body);
        if ($code >= 200 && $code < 300 && !empty($res['id'])) return self::ok((string)$res['id'], 'paused', 'Meta 캠페인 생성(PAUSED·' . ($conv ? '전환/구매' : '트래픽') . '·입찰=' . ($bidStrategy ?: 'manual') . ($cur !== 'KRW' ? '·' . $cur : '') . ')');
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
    private static function googleCreate(PDO $pdo, string $tenant, string $name, int $daily, array $settings = []): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        $cid   = preg_replace('/\D/', '', self::cred($pdo, $tenant, 'google_ads', 'customer_id'));
        if ($dev === '' || $token === '' || $cid === '') return self::fail('Google 자격증명(developer_token/access_token/customer_id) 미등록', 'no_credentials');
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        // 1) campaignBudget — [현 차수] 멀티통화: 계정통화 micros(KRW 계정=원*1e6=기존동작).
        $cur = self::accountCur($pdo, $tenant, 'google_ads');
        $amountMicros = (int)round(self::toAcctMajor($daily, $cur) * 1000000);
        $budgetBody = json_encode(['operations' => [['create' => [
            'name' => $name . ' Budget ' . substr(md5($name . $daily), 0, 6),
            'amountMicros' => (string)$amountMicros, 'deliveryMethod' => 'STANDARD',
        ]]]]);
        [$bc, $br] = self::http('POST', "{$base}/campaignBudgets:mutate", $hdr, $budgetBody);
        $budgetRes = $br['results'][0]['resourceName'] ?? '';
        if ($budgetRes === '') return self::fail('Google 예산 생성 실패: ' . (self::errMsg($br) ?: ('HTTP ' . $bc)));
        // 2) campaign 생성 (PAUSED, SEARCH). [현 차수] 자동입찰 — 전환추적(conversion_action) 있으면 전환 기반 입찰
        //   (troas=전환가치 최대화/tcpa=전환수 최대화+목표CPA/auto=전환수 최대화), 없으면 manualCpc honest 폴백.
        $bs       = (string)($settings['bid_strategy'] ?? 'auto');
        $hasConvAction = trim(self::cred($pdo, $tenant, 'google_ads', 'conversion_action')) !== '';
        $bidNote = 'manualCpc';
        $camp = ['name' => $name, 'status' => 'PAUSED', 'advertisingChannelType' => 'SEARCH', 'campaignBudget' => $budgetRes];
        if ($hasConvAction && $bs !== 'manual') {
            if ($bs === 'troas' && (float)($settings['target_roas'] ?? 0) > 0) {
                $camp['maximizeConversionValue'] = ['targetRoas' => (float)$settings['target_roas']]; $bidNote = 'tROAS';
            } elseif ($bs === 'tcpa' && (float)($settings['target_cpa'] ?? 0) > 0) {
                $camp['maximizeConversions'] = ['targetCpaMicros' => (string)(int)round(self::toAcctMajor((int)round((float)$settings['target_cpa']), $cur) * 1000000)]; $bidNote = 'tCPA';
            } else {
                $camp['maximizeConversions'] = new \stdClass(); $bidNote = 'maxConv';
            }
        } else {
            $camp['manualCpc'] = new \stdClass();
        }
        $campBody = json_encode(['operations' => [['create' => $camp]]]);
        [$cc, $cr] = self::http('POST', "{$base}/campaigns:mutate", $hdr, $campBody);
        $campRes = $cr['results'][0]['resourceName'] ?? '';
        if ($campRes === '') return self::fail('Google 캠페인 생성 실패: ' . (self::errMsg($cr) ?: ('HTTP ' . $cc)));
        return self::ok($campRes, 'paused', 'Google 캠페인 생성(PAUSED·입찰=' . $bidNote . ($cur !== 'KRW' ? '·' . $cur : '') . ')');
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

    /** [현 차수 P2] Google Ads 서버 전환 업로드(Offline Conversion Import / Enhanced Conversions).
     *  gclid(또는 hashedEmail) 기반 전환을 Google Ads로 업로드 → 쿠키리스·iOS 환경 귀속 보강. 자격증명만 등록하면 동작. */
    public static function googleUploadConversion(PDO $pdo, string $tenant, string $gclid, float $value, string $currency, string $convDateTime, ?string $hashedEmail = null): array
    {
        $dev    = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token  = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        $cid    = preg_replace('/\D/', '', self::cred($pdo, $tenant, 'google_ads', 'customer_id'));
        $action = trim(self::cred($pdo, $tenant, 'google_ads', 'conversion_action'));
        if ($dev === '' || $token === '' || $cid === '' || $action === '') return self::fail('Google 전환 자격증명(developer_token/access_token/customer_id/conversion_action) 미등록', 'no_credentials');
        if ($gclid === '' && ($hashedEmail === null || $hashedEmail === '')) return self::fail('gclid 또는 이메일 식별자 필요', 'no_click_id');
        $actionRes = (strpos($action, 'customers/') === 0) ? $action : "customers/{$cid}/conversionActions/{$action}";
        $conv = array_filter([
            'gclid'              => $gclid !== '' ? $gclid : null,
            'conversionAction'   => $actionRes,
            'conversionDateTime' => $convDateTime, // 'yyyy-MM-dd HH:mm:ss+hh:mm'
            'conversionValue'    => $value > 0 ? $value : null,
            'currencyCode'       => $currency !== '' ? $currency : 'KRW',
            'userIdentifiers'    => ($hashedEmail !== null && $hashedEmail !== '') ? [['hashedEmail' => $hashedEmail]] : null,
        ], fn($v) => $v !== null);
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $url = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}:uploadClickConversions";
        [$code, $res] = self::http('POST', $url, $hdr, json_encode(['conversions' => [$conv], 'partialFailure' => true]));
        if ($code >= 200 && $code < 300 && empty($res['partialFailureError'])) return self::ok('', 'uploaded', 'Google Ads 전환 업로드 완료');
        return self::fail('Google 전환 업로드 실패: ' . (self::errMsg($res) ?: ($res['partialFailureError']['message'] ?? ('HTTP ' . $code))), 'failed');
    }

    /** [현 차수 P2] 최근 주문 중 gclid 보유 건을 Google Ads 전환으로 일괄 업로드(멱등 log). cron/endpoint 공용. */
    public static function uploadPendingGoogleConversions(PDO $pdo, string $tenant, int $days = 7): array
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try { $pdo->exec("CREATE TABLE IF NOT EXISTS gads_conversion_log (tenant_id VARCHAR(100) NOT NULL, order_id VARCHAR(128) NOT NULL, status VARCHAR(20), detail VARCHAR(255), created_at VARCHAR(32), PRIMARY KEY (tenant_id, order_id))"); } catch (\Throwable $e) {}
        $cut = gmdate('Y-m-d H:i:s', time() - max(1, $days) * 86400);
        try {
            $st = $pdo->prepare("SELECT order_id, total_price, currency, ordered_at, raw_json FROM channel_orders WHERE tenant_id=:t AND ordered_at >= :c AND raw_json LIKE '%gclid%' ORDER BY ordered_at DESC LIMIT 500");
            $st->execute([':t' => $tenant, ':c' => $cut]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return ['ok' => false, 'error' => 'orders_query_failed']; }
        $uploaded = 0; $skipped = 0; $failed = 0;
        $ins = $isMy ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
        foreach ($rows as $r) {
            $oid = (string)($r['order_id'] ?? ''); if ($oid === '') continue;
            $chk = $pdo->prepare("SELECT 1 FROM gads_conversion_log WHERE tenant_id=:t AND order_id=:o LIMIT 1");
            $chk->execute([':t' => $tenant, ':o' => $oid]);
            if ($chk->fetchColumn()) { $skipped++; continue; }
            if (!preg_match('/"?gclid"?\s*[:=]\s*"?([A-Za-z0-9_\-.]{10,})/', (string)($r['raw_json'] ?? ''), $m)) { continue; }
            $dt = gmdate('Y-m-d H:i:s', strtotime((string)($r['ordered_at'] ?? '')) ?: time()) . '+00:00';
            $res = self::googleUploadConversion($pdo, $tenant, $m[1], (float)($r['total_price'] ?? 0), (string)($r['currency'] ?: 'KRW'), $dt);
            if (($res['status'] ?? '') === 'no_credentials') return ['ok' => false, 'status' => 'no_credentials', 'uploaded' => $uploaded, 'failed' => $failed];
            $status = !empty($res['ok']) ? 'uploaded' : 'failed';
            try { $pdo->prepare("{$ins} INTO gads_conversion_log (tenant_id, order_id, status, detail, created_at) VALUES (:t,:o,:s,:d,:c)")->execute([':t' => $tenant, ':o' => $oid, ':s' => $status, ':d' => substr((string)($res['error'] ?? ''), 0, 250), ':c' => gmdate('Y-m-d H:i:s')]); } catch (\Throwable $e) {}
            if ($status === 'uploaded') $uploaded++; else $failed++;
        }
        return ['ok' => true, 'uploaded' => $uploaded, 'skipped' => $skipped, 'failed' => $failed];
    }

    /* ════════════════════════ 서버 전환(Conversions API) — Meta CAPI · TikTok Events ════════════════════════ */

    /** 이메일 정규화(소문자·trim) 후 sha256 — Meta/TikTok Advanced Matching 표준. PII 원문 미전송. */
    private static function hashEmail(string $email): string
    {
        $n = strtolower(trim($email));
        return ($n !== '' && filter_var($n, FILTER_VALIDATE_EMAIL)) ? hash('sha256', $n) : '';
    }

    /**
     * [정밀감사] Meta Conversions API(서버 전환) 1건 업로드 — 쿠키리스·iOS 환경 귀속 보강(픽셀과 event_id dedup).
     *   자격증명: meta_ads 'pixel_id' + (capi_token | access_token). 미등록 시 honest no_credentials.
     */
    public static function metaUploadConversion(PDO $pdo, string $tenant, string $eventId, float $value, string $currency, int $eventTime, string $hashedEmail = '', string $fbc = '', string $eventName = 'Purchase'): array
    {
        $pixel = trim(self::cred($pdo, $tenant, 'meta_ads', 'pixel_id'));
        $token = trim(self::cred($pdo, $tenant, 'meta_ads', 'capi_token')) ?: trim(self::cred($pdo, $tenant, 'meta_ads', 'access_token'));
        if ($pixel === '' || $token === '') return self::fail('Meta CAPI 자격증명(pixel_id + capi_token/access_token) 미등록', 'no_credentials');
        if ($hashedEmail === '' && $fbc === '') return self::fail('이메일/fbclid 식별자 필요', 'no_identifier');
        $userData = array_filter(['em' => $hashedEmail !== '' ? [$hashedEmail] : null, 'fbc' => $fbc !== '' ? $fbc : null], fn($v) => $v !== null);
        $event = [
            'event_name'   => $eventName,
            'event_time'   => $eventTime,
            'action_source'=> 'website',
            'event_id'     => $eventId, // 픽셀 브라우저 이벤트와 dedup
            'user_data'    => $userData,
            'custom_data'  => array_filter(['value' => $value > 0 ? $value : null, 'currency' => $currency !== '' ? $currency : 'KRW'], fn($v) => $v !== null),
        ];
        $api = "https://graph.facebook.com/" . self::META_VER;
        [$code, $res] = self::http('POST', "{$api}/{$pixel}/events", ['Content-Type: application/x-www-form-urlencoded'],
            ['data' => json_encode([$event]), 'access_token' => $token]);
        if ($code >= 200 && $code < 300 && isset($res['events_received'])) return self::ok('', 'uploaded', 'Meta CAPI 전환 업로드(events_received=' . (int)$res['events_received'] . ')');
        return self::fail('Meta CAPI 전환 업로드 실패: ' . (self::errMsg($res) ?: ('HTTP ' . $code)), 'failed');
    }

    /**
     * [정밀감사] TikTok Events API(서버 전환) 1건 업로드. 자격증명: tiktok_business 'pixel_code' + access_token.
     *   미등록 시 honest no_credentials.
     */
    public static function tiktokUploadConversion(PDO $pdo, string $tenant, string $eventId, float $value, string $currency, int $eventTime, string $hashedEmail = '', string $ttclid = '', string $eventName = 'CompletePayment'): array
    {
        $token = trim(self::cred($pdo, $tenant, 'tiktok_business', 'access_token'));
        $pixel = trim(self::cred($pdo, $tenant, 'tiktok_business', 'pixel_code'));
        if ($token === '' || $pixel === '') return self::fail('TikTok Events 자격증명(access_token + pixel_code) 미등록', 'no_credentials');
        if ($hashedEmail === '' && $ttclid === '') return self::fail('이메일/ttclid 식별자 필요', 'no_identifier');
        $user = array_filter(['email' => $hashedEmail !== '' ? $hashedEmail : null, 'ttclid' => $ttclid !== '' ? $ttclid : null], fn($v) => $v !== null);
        $body = json_encode([
            'event_source'    => 'web',
            'event_source_id' => $pixel,
            'data'            => [[
                'event'      => $eventName,
                'event_time' => $eventTime,
                'event_id'   => $eventId, // 픽셀 이벤트와 dedup
                'user'       => $user,
                'properties' => array_filter(['value' => $value > 0 ? $value : null, 'currency' => $currency !== '' ? $currency : 'KRW'], fn($v) => $v !== null),
            ]],
        ]);
        [$code, $res] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
            ['Access-Token: ' . $token, 'Content-Type: application/json'], $body);
        if (($res['code'] ?? -1) === 0) return self::ok('', 'uploaded', 'TikTok Events 전환 업로드');
        return self::fail('TikTok Events 전환 업로드 실패: ' . (($res['message'] ?? '') ?: ('HTTP ' . $code)), 'failed');
    }

    /**
     * [정밀감사] 최근 주문을 Meta CAPI + TikTok Events 서버 전환으로 일괄 업로드(채널별 멱등 log).
     *   uploadPendingGoogleConversions 와 동형(google=gclid, 여기=해시이메일/fbclid/ttclid). 자격증명 미설정 채널은 skip.
     *   매칭 신호: buyer_email(sha256, Advanced Matching) + raw_json 의 fbclid/ttclid(있으면 보강).
     */
    public static function uploadPendingServerConversions(PDO $pdo, string $tenant, int $days = 7): array
    {
        if ($tenant === '' || $tenant === 'demo' || strncmp($tenant, 'demo', 4) === 0) return ['ok' => true, 'skipped' => 'demo'];
        try { $pdo->exec("CREATE TABLE IF NOT EXISTS server_conversion_log (tenant_id VARCHAR(100) NOT NULL, order_id VARCHAR(128) NOT NULL, channel VARCHAR(40) NOT NULL, status VARCHAR(20), detail VARCHAR(255), created_at VARCHAR(32), PRIMARY KEY (tenant_id, order_id, channel))"); } catch (\Throwable $e) {}
        // 채널별 자격증명 사전 점검 — 미설정이면 해당 채널 전체 skip(불필요한 주문 스캔/호출 방지).
        $metaOn   = trim(self::cred($pdo, $tenant, 'meta_ads', 'pixel_id')) !== '' && (trim(self::cred($pdo, $tenant, 'meta_ads', 'capi_token')) !== '' || trim(self::cred($pdo, $tenant, 'meta_ads', 'access_token')) !== '');
        $tiktokOn = trim(self::cred($pdo, $tenant, 'tiktok_business', 'pixel_code')) !== '' && trim(self::cred($pdo, $tenant, 'tiktok_business', 'access_token')) !== '';
        if (!$metaOn && !$tiktokOn) return ['ok' => true, 'status' => 'no_credentials', 'meta' => 0, 'tiktok' => 0];
        $cut = gmdate('Y-m-d H:i:s', time() - max(1, $days) * 86400);
        try {
            $st = $pdo->prepare("SELECT order_id, total_price, currency, ordered_at, buyer_email, raw_json FROM channel_orders WHERE tenant_id=:t AND ordered_at >= :c AND buyer_email IS NOT NULL AND buyer_email<>'' ORDER BY ordered_at DESC LIMIT 1000");
            $st->execute([':t' => $tenant, ':c' => $cut]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return ['ok' => false, 'error' => 'orders_query_failed']; }
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $ins  = $isMy ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
        $counts = ['meta' => 0, 'tiktok' => 0]; $failed = 0;
        foreach ($rows as $r) {
            $oid = (string)($r['order_id'] ?? ''); if ($oid === '') continue;
            $he  = self::hashEmail((string)($r['buyer_email'] ?? ''));
            if ($he === '') continue;
            $et  = strtotime((string)($r['ordered_at'] ?? '')) ?: time();
            $val = (float)($r['total_price'] ?? 0);
            $cur = (string)($r['currency'] ?: 'KRW');
            $raw = (string)($r['raw_json'] ?? '');
            foreach (['meta', 'tiktok'] as $ch) {
                if ($ch === 'meta' && !$metaOn) continue;
                if ($ch === 'tiktok' && !$tiktokOn) continue;
                $chk = $pdo->prepare("SELECT 1 FROM server_conversion_log WHERE tenant_id=:t AND order_id=:o AND channel=:c LIMIT 1");
                $chk->execute([':t' => $tenant, ':o' => $oid, ':c' => $ch]);
                if ($chk->fetchColumn()) continue;
                $eventId = $ch . '_' . $oid; // 픽셀 브라우저 이벤트와 동일 규칙이면 dedup(서버↔클라 중복 제거)
                if ($ch === 'meta') {
                    $fbc = preg_match('/"?fbclid"?\s*[:=]\s*"?([A-Za-z0-9_\-.]{6,})/', $raw, $m) ? 'fb.1.' . $et . '.' . $m[1] : '';
                    $res = self::metaUploadConversion($pdo, $tenant, $eventId, $val, $cur, $et, $he, $fbc);
                } else {
                    $ttclid = preg_match('/"?ttclid"?\s*[:=]\s*"?([A-Za-z0-9_\-.]{6,})/', $raw, $m) ? $m[1] : '';
                    $res = self::tiktokUploadConversion($pdo, $tenant, $eventId, $val, $cur, $et, $he, $ttclid);
                }
                $status = !empty($res['ok']) ? 'uploaded' : (($res['status'] ?? '') ?: 'failed');
                if ($status === 'uploaded') $counts[$ch]++; elseif ($status !== 'no_identifier') $failed++;
                // no_identifier(식별자 없음)는 로그하지 않음(다음 주문에서 재시도 의미 없음과 무관·일시적 아님이라 기록).
                try { $pdo->prepare("{$ins} INTO server_conversion_log (tenant_id, order_id, channel, status, detail, created_at) VALUES (:t,:o,:c,:s,:d,:ts)")->execute([':t' => $tenant, ':o' => $oid, ':c' => $ch, ':s' => $status, ':d' => substr((string)($res['error'] ?? ''), 0, 250), ':ts' => gmdate('Y-m-d H:i:s')]); } catch (\Throwable $e) {}
            }
        }
        return ['ok' => true, 'meta' => $counts['meta'], 'tiktok' => $counts['tiktok'], 'failed' => $failed];
    }

    /* ════════════════════════ TikTok ════════════════════════ */
    private static function tiktokCreate(PDO $pdo, string $tenant, string $name, int $daily, array $settings = []): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '') return self::fail('TikTok 자격증명(access_token/advertiser_id) 미등록', 'no_credentials');
        // [현 차수] 전환(구매) 목표 — pixel_code 있으면 CONVERSIONS, 없으면 TRAFFIC honest 폴백. 예산=계정통화 major(KRW=무변환).
        $conv = in_array((string)($settings['objective'] ?? 'traffic'), ['conversions', 'sales', 'purchase'], true) && trim(self::cred($pdo, $tenant, 'tiktok_business', 'pixel_code')) !== '';
        $cur  = self::accountCur($pdo, $tenant, 'tiktok_business');
        $budget = round(self::toAcctMajor($daily, $cur), 2);
        $body = json_encode([
            'advertiser_id' => $advId, 'campaign_name' => $name, 'objective_type' => $conv ? 'CONVERSIONS' : 'TRAFFIC',
            'budget_mode' => 'BUDGET_MODE_DAY', 'budget' => $budget, 'operation_status' => 'DISABLE',
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

    /* ════════════════════════ Kakao Moment (Bearer + adAccountId) ════════════════════════
     *   인증 패턴은 검증된 ingest(Connectors::fetchKakaoRows)와 동일: Authorization Bearer + adAccountId 헤더.
     *   OpenAPI v4 campaigns. config=OFF 로 생성(PAUSED 안전정책) → 사용자 활성화 시에만 집행. graceful 에러. */
    private static function kakaoHeaders(PDO $pdo, string $tenant): ?array
    {
        $token = self::cred($pdo, $tenant, 'kakao_moment', 'access_token');
        $acc   = self::cred($pdo, $tenant, 'kakao_moment', 'ad_account_id');
        if ($acc === '') $acc = self::cred($pdo, $tenant, 'kakao_moment', 'account_id'); // 레거시 키명 폴백
        if ($token === '' || $acc === '') return null;
        return [['Authorization: Bearer ' . $token, 'adAccountId: ' . $acc, 'Content-Type: application/json'], $acc];
    }
    private static function kakaoCreate(PDO $pdo, string $tenant, string $name, int $daily): array
    {
        $h = self::kakaoHeaders($pdo, $tenant);
        if ($h === null) return self::fail('카카오모먼트 자격증명(access_token/ad_account_id) 미등록', 'no_credentials');
        [$hdr, $acc] = $h;
        // OpenAPI v4 캠페인 생성 — DISPLAY/전환 목표, config=OFF(정지=무지출). dailyBudgetAmount 동시 설정.
        $body = json_encode(['adAccountId' => (int)$acc, 'name' => $name,
            'campaignTypeGoal' => ['campaignType' => 'DISPLAY', 'goal' => 'CONVERSION'],
            'config' => 'OFF', 'dailyBudgetAmount' => $daily], JSON_UNESCAPED_UNICODE);
        [$code, $res] = self::http('POST', 'https://apis.moment.kakao.com/openapi/v4/campaigns', $hdr, $body);
        $id = $res['id'] ?? $res['campaignId'] ?? ($res['data']['id'] ?? '');
        if ($code >= 200 && $code < 300 && $id !== '') return self::ok((string)$id, 'paused', '카카오모먼트 캠페인 생성(OFF)');
        return self::fail('Kakao Moment: ' . (self::errMsg($res) ?: ('HTTP ' . $code)));
    }
    private static function kakaoUpdateBudget(PDO $pdo, string $tenant, string $extId, int $daily): array
    {
        $h = self::kakaoHeaders($pdo, $tenant);
        if ($h === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$hdr, $acc] = $h;
        $body = json_encode(['adAccountId' => (int)$acc, 'id' => (int)$extId, 'dailyBudgetAmount' => $daily], JSON_UNESCAPED_UNICODE);
        [$code, $res] = self::http('PUT', 'https://apis.moment.kakao.com/openapi/v4/campaigns', $hdr, $body);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res) ?: ('HTTP ' . $code)];
    }
    private static function kakaoSetConfig(PDO $pdo, string $tenant, string $extId, string $config): array // ON|OFF
    {
        $h = self::kakaoHeaders($pdo, $tenant);
        if ($h === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$hdr, $acc] = $h;
        $body = json_encode(['adAccountId' => (int)$acc, 'id' => (int)$extId, 'config' => $config], JSON_UNESCAPED_UNICODE);
        [$code, $res] = self::http('PUT', 'https://apis.moment.kakao.com/openapi/v4/campaigns/config', $hdr, $body);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res) ?: ('HTTP ' . $code)];
    }

    /* ════════════════════════ LINE Ads (JWS HMAC-SHA256) ════════════════════════
     *   인증=Connectors::lineAdsAuthHeaders(JWS). status=PAUSED 생성(안전정책). 키=Ad Manager>Group 발급.
     *   ★엔드포인트 경로/필드명은 실 자격증명 등록 시 라이브 응답으로 최종 확정(graceful 드롭인). */
    private static function lineCreds(PDO $pdo, string $tenant): ?array
    {
        $ak = self::cred($pdo, $tenant, 'line_ads', 'access_key');
        $sk = self::cred($pdo, $tenant, 'line_ads', 'secret_key');
        $gid = self::cred($pdo, $tenant, 'line_ads', 'group_id');
        if ($gid === '') $gid = self::cred($pdo, $tenant, 'line_ads', 'ad_account_id');
        if ($ak === '' || $sk === '' || $gid === '') return null;
        return [$ak, $sk, $gid];
    }
    private static function lineReq(string $method, string $path, ?array $payload, string $ak, string $sk): array
    {
        $body = $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE) : '';
        $h = \Genie\Handlers\Connectors::lineAdsAuthHeaders($method, $path, $body, $ak, $sk);
        $hdr = []; foreach ($h as $k => $v) $hdr[] = "$k: $v";
        return self::http($method, 'https://ads.line.me' . $path, $hdr, $body !== '' ? $body : null);
    }
    private static function lineCreate(PDO $pdo, string $tenant, string $name, int $daily): array
    {
        $c = self::lineCreds($pdo, $tenant);
        if ($c === null) return self::fail('LINE Ads 자격증명(access_key/secret_key/group_id) 미등록', 'no_credentials');
        [$ak, $sk, $gid] = $c;
        $path = '/api/v3/groups/' . rawurlencode($gid) . '/campaigns';
        [$code, $res] = self::lineReq('POST', $path, ['name' => $name, 'objective' => 'WEBSITE_CONVERSION', 'status' => 'PAUSED', 'dailyBudget' => $daily], $ak, $sk);
        $id = $res['id'] ?? $res['campaignId'] ?? ($res['data']['id'] ?? '');
        if ($code >= 200 && $code < 300 && $id !== '') return self::ok((string)$id, 'paused', 'LINE Ads 캠페인 생성(PAUSED)');
        return self::fail('LINE Ads: ' . (self::errMsg($res) ?: ('HTTP ' . $code)));
    }
    private static function lineUpdateBudget(PDO $pdo, string $tenant, string $extId, int $daily): array
    {
        $c = self::lineCreds($pdo, $tenant);
        if ($c === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$ak, $sk] = $c;
        $path = '/api/v3/campaigns/' . rawurlencode($extId);
        [$code, $res] = self::lineReq('PUT', $path, ['dailyBudget' => $daily], $ak, $sk);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res) ?: ('HTTP ' . $code)];
    }
    private static function lineSetStatus(PDO $pdo, string $tenant, string $extId, string $status): array // ACTIVE|PAUSED
    {
        $c = self::lineCreds($pdo, $tenant);
        if ($c === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$ak, $sk] = $c;
        $path = '/api/v3/campaigns/' . rawurlencode($extId);
        [$code, $res] = self::lineReq('PUT', $path, ['status' => $status], $ak, $sk);
        return ($code >= 200 && $code < 300) ? ['ok' => true] : ['ok' => false, 'error' => self::errMsg($res) ?: ('HTTP ' . $code)];
    }

    /* ════════════════════════ 크리에이티브/딜리버리 레이어 ════════════════════════ */

    /** ad_design(AI 디자인) spec_json → 광고 카피 추출. svg 는 래스터화 필요(이미지 매체용). */
    private static function loadDesign(PDO $pdo, string $tenant, int $designId): array
    {
        $out = ['headline' => 'GenieGo', 'copy' => '', 'subheadline' => '', 'cta' => 'LEARN_MORE', 'has_svg' => false, 'image_b64' => '', 'image_mime' => '', 'animation' => ''];
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
            $out['animation']   = (string)($spec['animation'] ?? '');  // [현 차수] 채널별 광고물 CSS 모션(온사이트 소재 적용·정직 표기)
            $svg = (string)($row['svg'] ?? '');
            $out['has_svg']     = $svg !== '';
            // [227차 P0] 래스터 이미지 감지 — AI 이미지생성(DALL-E/Stability) 결과는 data:image/*;base64 로
            //   svg 컬럼에 저장된다(adDesignSave: image→svg). 서버 래스터화(Imagick/GD) 없이 그대로 매체
            //   업로드 가능. SVG 마크업(<svg…)은 래스터화 불가라 이미지 광고 미사용(텍스트 크리에이티브 폴백).
            if (preg_match('#^data:image/(png|jpe?g|webp);base64,#i', $svg, $mm)) {
                $out['image_b64']  = substr($svg, strpos($svg, ',') + 1);
                $out['image_mime'] = 'image/' . strtolower($mm[1] === 'jpg' ? 'jpeg' : $mm[1]); // png|jpeg|webp
            }
        } catch (Throwable $e) {}
        return $out;
    }

    /** [현 차수] base64 래스터 이미지 → 임시파일(CURLFile 업로드용). 반환=[path, mime, filename] 또는 null.
     *  미디어 자산 멀티파트 업로드(Kakao imageFile 등) 공용. 호출부에서 @unlink(path) 책임. */
    private static function b64TempFile(string $b64, string $mime = 'image/png'): ?array
    {
        $bin = base64_decode($b64, true);
        if ($bin === false || $bin === '' || strlen($bin) < 64) return null;
        // 매직바이트로 mime 보정(loadDesign 이 mime 미보존 시 폴백) — PNG/JPEG/WebP.
        if (strncmp($bin, "\x89PNG", 4) === 0) $mime = 'image/png';
        elseif (strncmp($bin, "\xFF\xD8\xFF", 3) === 0) $mime = 'image/jpeg';
        elseif (strncmp($bin, 'RIFF', 4) === 0 && substr($bin, 8, 4) === 'WEBP') $mime = 'image/webp';
        $ext = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'][$mime] ?? 'png';
        $tmp = tempnam(sys_get_temp_dir(), 'gcr_');
        if ($tmp === false) return null;
        if (@file_put_contents($tmp, $bin) === false) { @unlink($tmp); return null; }
        return [$tmp, $mime, 'creative.' . $ext];
    }

    /** 캠페인 하위 adset/adgroup + ad 생성(PAUSED). 매체별 딜리버리 완성 레이어. */
    public static function buildDelivery(PDO $pdo, string $tenant, string $channel, string $campExtId, int $designId, int $daily, string $landing, array $settings = []): array
    {
        if (!self::executionEnabled() || $campExtId === '') return ['ok' => false, 'status' => 'skipped'];
        $d = self::loadDesign($pdo, $tenant, $designId);
        if ($landing === '') $landing = 'https://roi.genie-go.com';
        try {
            switch ($channel) {
                case 'google_ads':      $r = self::googleDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing, $settings); break;
                case 'naver_sa':        $r = self::naverDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing); break;
                case 'meta_ads':        $r = self::metaDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing, $settings); break;
                case 'tiktok_business': $r = self::tiktokDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing, $settings); break;
                case 'kakao_moment':    $r = self::kakaoDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing); break;
                case 'line_ads':        $r = self::lineDeliver($pdo, $tenant, $campExtId, $d, $daily, $landing); break;
                default:                return ['ok' => false, 'status' => 'unsupported'];
            }
            // [현 차수] 저장 광고물 애니메이션(CSS 모션) 표기 — 매체는 정적 프레임 업로드, 모션은 온사이트/웹팝업 소재에 적용.
            $anim = (string)($d['animation'] ?? '');
            if ($anim !== '' && $anim !== 'none' && is_array($r)) {
                $r['animation'] = $anim;
                $r['note'] = trim((string)($r['note'] ?? '') . ' · 애니메이션:' . $anim);
            }
            return $r;
        } catch (Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    /* ════════════════════════ [현 차수] 딜리버리 재시도 큐(DLQ) ════════════════════════
     *   buildDelivery 가 일시 장애(HTTP 5xx/timeout/빈응답)로 실패하면 캠페인만 남고 광고 미생성(영구 미집행).
     *   재시도 큐에 적재 → cron(지수 백오프) 재시도 → 성공 시 allocations 에 ad/adset ext 영속(활성화 캐스케이드).
     *   no_credentials/unsupported/by-design partial 은 재시도 대상 아님(외부 등록 대기·정직). */
    private static function ensureDlqTable(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $auto = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try { $pdo->exec("CREATE TABLE IF NOT EXISTS ad_delivery_dlq (
            id $auto, tenant_id VARCHAR(100) NOT NULL, campaign_id INT DEFAULT 0, channel VARCHAR(40),
            camp_ext_id VARCHAR(255), design_id INT DEFAULT 0, daily INT DEFAULT 0, landing VARCHAR(500),
            settings_json TEXT, attempts INT DEFAULT 0, last_error VARCHAR(500), status VARCHAR(20) DEFAULT 'pending',
            next_retry_at VARCHAR(32), created_at VARCHAR(32), updated_at VARCHAR(32)
        )" . ($isMy ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '')); } catch (\Throwable $e) {}
    }

    /** 재시도 가능한 딜리버리 실패인지(일시 장애 의심). 외부 등록 대기/정직 partial 은 제외. */
    public static function isTransientDeliveryFailure(array $dl): bool
    {
        if (!empty($dl['ok'])) return false;
        $st = (string)($dl['status'] ?? '');
        if (in_array($st, ['no_credentials', 'skipped', 'unsupported', 'execution_disabled', 'needs_channel', 'partial'], true)) return false;
        // deliver 레벨은 status 미설정·error 문자열만 줄 수 있음 → 자격증명/미지원도 비-transient 처리(불필요 재시도 방지).
        $err = strtolower((string)($dl['error'] ?? ''));
        if ($err !== '' && (strpos($err, 'credential') !== false || strpos($err, 'unsupported') !== false)) return false;
        return true;
    }

    /** 딜리버리 재시도 큐 적재(데모/익명 제외). campaignId = auto_campaign.id(성공 시 allocations 영속용). */
    public static function enqueueDeliveryRetry(PDO $pdo, string $tenant, int $campaignId, string $channel, string $campExtId, int $designId, int $daily, string $landing, array $settings, string $error): void
    {
        if ($tenant === '' || strncmp($tenant, 'demo', 4) === 0 || $campExtId === '') return;
        self::ensureDlqTable($pdo);
        $now = gmdate('Y-m-d\TH:i:s\Z'); $next = gmdate('Y-m-d\TH:i:s\Z', time() + 600); // 10분 후 첫 재시도
        try {
            $pdo->prepare("INSERT INTO ad_delivery_dlq (tenant_id,campaign_id,channel,camp_ext_id,design_id,daily,landing,settings_json,attempts,last_error,status,next_retry_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?,'pending',?,?,?)")
                ->execute([$tenant, $campaignId, $channel, $campExtId, $designId, $daily, mb_substr($landing, 0, 500), json_encode($settings, JSON_UNESCAPED_UNICODE), mb_substr($error, 0, 500), $next, $now, $now]);
        } catch (\Throwable $e) {}
    }

    /** 성공 딜리버리 ext 를 캠페인 allocations 에 영속(활성화 캐스케이드용). 채널 키 일치 행만 갱신. */
    private static function writeBackDeliveryExt(PDO $pdo, string $tenant, int $campaignId, string $channel, string $adsetExt, string $adExt): void
    {
        if ($campaignId <= 0) return;
        try {
            $st = $pdo->prepare("SELECT allocations FROM auto_campaign WHERE id=? AND tenant_id=? LIMIT 1");
            $st->execute([$campaignId, $tenant]);
            $allocs = json_decode((string)($st->fetchColumn() ?: '[]'), true) ?: [];
            $hit = false;
            foreach ($allocs as &$a) { if ((string)($a['channel'] ?? '') === $channel) { $a['adset_ext_id'] = $adsetExt; $a['ad_ext_id'] = $adExt; $hit = true; } }
            unset($a);
            if ($hit) $pdo->prepare("UPDATE auto_campaign SET allocations=? WHERE id=? AND tenant_id=?")->execute([json_encode($allocs, JSON_UNESCAPED_UNICODE), $campaignId, $tenant]);
        } catch (\Throwable $e) {}
    }

    /** DLQ 재시도 처리(cron). 지수 백오프, maxAttempts 초과 시 failed. 반환 통계. */
    public static function retryDeliveryDlq(PDO $pdo, int $maxAttempts = 5, int $limit = 50): array
    {
        self::ensureDlqTable($pdo);
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $done = 0; $failed = 0; $retried = 0;
        try {
            $st = $pdo->prepare("SELECT * FROM ad_delivery_dlq WHERE status='pending' AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY id LIMIT " . (int)$limit);
            $st->execute([$now]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return ['ok' => false, 'error' => 'query_failed']; }
        foreach ($rows as $row) {
            $tenant = (string)$row['tenant_id'];
            $settings = json_decode((string)($row['settings_json'] ?? '[]'), true) ?: [];
            $dl = self::buildDelivery($pdo, $tenant, (string)$row['channel'], (string)$row['camp_ext_id'], (int)$row['design_id'], (int)$row['daily'], (string)$row['landing'], $settings);
            $retried++;
            $attempts = (int)$row['attempts'] + 1;
            $tsNow = gmdate('Y-m-d\TH:i:s\Z');
            if (!empty($dl['ok']) && (((string)($dl['ad_id'] ?? '')) !== '' || ((string)($dl['adgroup_id'] ?? '')) !== '')) {
                self::writeBackDeliveryExt($pdo, $tenant, (int)$row['campaign_id'], (string)$row['channel'], (string)($dl['adset_id'] ?? ($dl['adgroup_id'] ?? '')), (string)($dl['ad_id'] ?? ''));
                try { $pdo->prepare("UPDATE ad_delivery_dlq SET status='done',attempts=?,updated_at=? WHERE id=?")->execute([$attempts, $tsNow, (int)$row['id']]); } catch (\Throwable $e) {}
                $done++;
            } else {
                $status = $attempts >= $maxAttempts ? 'failed' : 'pending';
                $backoff = (int)min(86400, 600 * (2 ** $attempts)); // 지수 백오프(최대 24h)
                $next = gmdate('Y-m-d\TH:i:s\Z', time() + $backoff);
                try { $pdo->prepare("UPDATE ad_delivery_dlq SET status=?,attempts=?,last_error=?,next_retry_at=?,updated_at=? WHERE id=?")
                    ->execute([$status, $attempts, mb_substr((string)($dl['error'] ?? ($dl['status'] ?? '')), 0, 500), $next, $tsNow, (int)$row['id']]); } catch (\Throwable $e) {}
                if ($status === 'failed') $failed++;
            }
        }
        return ['ok' => true, 'retried' => $retried, 'done' => $done, 'failed' => $failed];
    }

    /* ── Google: 광고그룹 + 반응형 검색광고(텍스트) — 완전 빌드 가능 ── */
    private static function googleDeliver(PDO $pdo, string $tenant, string $campRes, array $d, int $daily, string $landing, array $settings = []): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        $cid   = preg_replace('/\D/', '', self::cred($pdo, $tenant, 'google_ads', 'customer_id'));
        if ($dev === '' || $token === '' || $cid === '') return ['ok' => false, 'error' => 'no_credentials'];
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        // 1) 광고그룹. [현 차수] cpcBidMicros 는 수동입찰에서만 유효 — 자동입찰(전환추적+비-manual) 캠페인은 생략(전략이 입찰결정).
        $bs  = (string)($settings['bid_strategy'] ?? 'auto');
        $cur = self::accountCur($pdo, $tenant, 'google_ads');
        $auto = (trim(self::cred($pdo, $tenant, 'google_ads', 'conversion_action')) !== '') && $bs !== 'manual';
        $ag = ['name' => $d['headline'] . ' AG', 'campaign' => $campRes, 'status' => 'PAUSED', 'type' => 'SEARCH_STANDARD'];
        if (!$auto) $ag['cpcBidMicros'] = (string)(int)round(self::toAcctMajor((int)max(100, (int)($daily / 50)), $cur) * 1000000);
        $agBody = json_encode(['operations' => [['create' => $ag]]]);
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
    private static function metaDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily, string $landing, array $settings = []): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        $acct  = self::cred($pdo, $tenant, 'meta_ads', 'ad_account_id');
        $page  = self::cred($pdo, $tenant, 'meta_ads', 'page_id'); // 광고 게재용 Facebook 페이지 ID
        if ($token === '' || $acct === '') return ['ok' => false, 'error' => 'no_credentials'];
        if (strncmp($acct, 'act_', 4) !== 0) $acct = 'act_' . $acct;
        $api = "https://graph.facebook.com/" . self::META_VER;
        // 1) 광고세트(PAUSED). [현 차수] 전환 캠페인=픽셀 구매전환 최적화(OFFSITE_CONVERSIONS+promoted_object PURCHASE),
        //   타깃국가 파라미터화(멀티국가), 자동입찰 제약(tcpa=cap/troas=최소ROAS floor/auto=lowest-cost/manual=수동bid).
        $conv  = self::metaIsConversion($pdo, $tenant, (string)($settings['objective'] ?? 'traffic'));
        $pixel = $conv ? trim(self::cred($pdo, $tenant, 'meta_ads', 'pixel_id')) : '';
        $cur   = self::accountCur($pdo, $tenant, 'meta_ads');
        $countries = (is_array($settings['countries'] ?? null) && $settings['countries']) ? array_values($settings['countries']) : ['KR'];
        $asBody = [
            'name' => $d['headline'] . ' AdSet', 'campaign_id' => $campId, 'status' => 'PAUSED',
            'billing_event' => 'IMPRESSIONS',
            'optimization_goal' => ($conv && $pixel !== '') ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS',
            'targeting' => json_encode(['geo_locations' => ['countries' => $countries]]),
            'access_token' => $token,
        ];
        if ($conv && $pixel !== '') {
            $asBody['promoted_object'] = json_encode(['pixel_id' => $pixel, 'custom_event_type' => 'PURCHASE']); // 구매 전환 최적화
        }
        $bs = (string)($settings['bid_strategy'] ?? 'auto');
        if ($bs === 'tcpa' && (float)($settings['target_cpa'] ?? 0) > 0) {
            $asBody['bid_amount'] = (string)self::toMinor(self::toAcctMajor((int)round((float)$settings['target_cpa']), $cur), $cur); // COST_CAP 상한(계정통화 minor)
        } elseif ($bs === 'troas' && $conv && $pixel !== '' && (float)($settings['target_roas'] ?? 0) > 0) {
            $asBody['bid_constraints'] = json_encode(['roas_average_floor' => (int)round((float)$settings['target_roas'] * 10000)]); // 최소 ROAS(1.0=10000)
        } elseif ($bs === 'manual') {
            $asBody['bid_amount'] = (string)max(100, (int)($daily / 100));
        }
        // auto → bid 생략(campaign LOWEST_COST_WITHOUT_CAP 자동입찰과 정합).
        // [현 차수] 프리퀀시 캡(노출 피로 방지) — opt-in. 전환 adset 은 매체가 빈도 자동관리하므로 트래픽 adset 에만 적용.
        $fc = (int)($settings['frequency_cap'] ?? 0);
        if ($fc > 0 && !($conv && $pixel !== '')) {
            $asBody['frequency_control_specs'] = json_encode([['event' => 'IMPRESSIONS', 'interval_days' => max(1, (int)($settings['frequency_days'] ?? 7)), 'max_frequency' => $fc]]);
        }
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

    /* ── TikTok: 광고그룹 + 광고. identity_id + 영상(video_id)/이미지(image_id) 소재가 있으면 광고까지 완성. ── */
    private static function tiktokDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily, string $landing = '', array $settings = []): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '') return ['ok' => false, 'error' => 'no_credentials'];
        $hdr = ['Access-Token: ' . $token, 'Content-Type: application/json'];
        // 1) 광고그룹(정지). [현 차수] 전환=픽셀 구매전환 최적화(CONVERT+OCPM+optimization_event), 아니면 클릭. 멀티통화 예산·타깃국가.
        $tkPixel = (in_array((string)($settings['objective'] ?? 'traffic'), ['conversions', 'sales', 'purchase'], true)) ? trim(self::cred($pdo, $tenant, 'tiktok_business', 'pixel_code')) : '';
        $cur = self::accountCur($pdo, $tenant, 'tiktok_business');
        $countries = (is_array($settings['countries'] ?? null) && $settings['countries']) ? array_values($settings['countries']) : ['KR'];
        $ag = ['advertiser_id' => $advId, 'campaign_id' => $campId, 'adgroup_name' => $d['headline'] . ' AG',
            'placement_type' => 'PLACEMENT_TYPE_AUTOMATIC', 'budget_mode' => 'BUDGET_MODE_DAY', 'budget' => round(self::toAcctMajor($daily, $cur), 2),
            'location_ids' => $countries, 'operation_status' => 'DISABLE', 'schedule_type' => 'SCHEDULE_FROM_NOW'];
        if ($tkPixel !== '') {
            $ag['optimization_goal'] = 'CONVERT'; $ag['billing_event'] = 'OCPM';
            $ag['pixel_id'] = $tkPixel; $ag['optimization_event'] = 'ON_WEB_ORDER'; // 웹 구매 전환 이벤트
            $ag['promotion_type'] = 'WEBSITE';
        } else {
            $ag['optimization_goal'] = 'CLICK'; $ag['billing_event'] = 'CPC';
        }
        // [현 차수] 입찰 — tcpa(목표CPA)면 BID_TYPE_CUSTOM+conversion_bid_price(계정통화), 그 외는 미설정(TikTok 기본 자동입찰 보존).
        if ((string)($settings['bid_strategy'] ?? 'auto') === 'tcpa' && $tkPixel !== '' && (float)($settings['target_cpa'] ?? 0) > 0) {
            $ag['bid_type'] = 'BID_TYPE_CUSTOM';
            $ag['conversion_bid_price'] = round(self::toAcctMajor((int)round((float)$settings['target_cpa']), $cur), 2);
        }
        // [현 차수] 프리퀀시 캡(노출 피로 방지) — opt-in. frequency=최대노출수, frequency_schedule=기간(일).
        $fc = (int)($settings['frequency_cap'] ?? 0);
        if ($fc > 0) { $ag['frequency'] = $fc; $ag['frequency_schedule'] = max(1, (int)($settings['frequency_days'] ?? 7)); }
        $agBody = json_encode($ag);
        [$ac, $ar] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/adgroup/create/', $hdr, $agBody);
        $agId = $ar['data']['adgroup_id'] ?? '';
        if ($agId === '') return ['ok' => false, 'error' => 'adgroup: ' . (($ar['message'] ?? '') ?: ('HTTP ' . $ac))];
        // 2) 광고 — identity_id + 영상(video_id)/이미지(image_id) 소재 자격증명이 있으면 실제 생성(/ad/create/).
        //   TikTok 광고는 인앱 게시 정책상 identity(브랜드/계정)와 미디어 자산(영상 우선) ID 가 필수 → 등록 시 자동 완성.
        $identity = self::cred($pdo, $tenant, 'tiktok_business', 'identity_id');
        $videoId  = self::cred($pdo, $tenant, 'tiktok_business', 'video_id');
        $imageId  = self::cred($pdo, $tenant, 'tiktok_business', 'image_id');
        if ($identity === '' || ($videoId === '' && $imageId === '')) {
            return ['ok' => true, 'adgroup_id' => $agId, 'ad_id' => '', 'status' => 'partial',
                'note' => 'TikTok 광고그룹 생성(DISABLE). 광고(ad)는 identity_id + 영상(video_id)/이미지(image_id) 소재 등록 후 자동 완성 — 자격증명에 추가하세요.'];
        }
        $creative = array_filter([
            'ad_name'          => mb_substr($d['headline'], 0, 40) . ' Ad',
            'identity_id'      => $identity,
            'identity_type'    => 'CUSTOMIZED_USER',
            'ad_format'        => $videoId !== '' ? 'SINGLE_VIDEO' : 'SINGLE_IMAGE',
            'video_id'         => $videoId !== '' ? $videoId : null,
            'image_ids'        => $imageId !== '' ? [$imageId] : null,
            'ad_text'          => mb_substr($d['copy'] ?: $d['headline'], 0, 100),
            'call_to_action'   => 'LEARN_MORE',
            'landing_page_url' => $landing !== '' ? $landing : 'https://roi.genie-go.com',
            'operation_status' => 'DISABLE',
        ], fn($v) => $v !== null);
        $adBody = json_encode(['advertiser_id' => $advId, 'adgroup_id' => $agId, 'creatives' => [$creative]], JSON_UNESCAPED_UNICODE);
        [$adc, $adr] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/ad/create/', $hdr, $adBody);
        $adId = $adr['data']['ad_ids'][0] ?? '';
        if ($adId === '') return ['ok' => true, 'adgroup_id' => $agId, 'ad_id' => '', 'status' => 'partial',
            'note' => 'TikTok 광고그룹 생성(DISABLE). 광고 생성 보류: ' . (($adr['message'] ?? '') ?: ('HTTP ' . $adc))];
        return ['ok' => true, 'adgroup_id' => $agId, 'ad_id' => (string)$adId, 'note' => 'TikTok 광고그룹+광고 생성(DISABLE)'];
    }

    /* ── Kakao Moment: 광고그룹 + 소재(OFF). kakaoCreate 와 동일 인증(Bearer+adAccountId, OpenAPI v4).
     *   ★엔드포인트/스키마는 실 자격증명 등록 시 라이브 응답으로 최종 확정(graceful 드롭인). fail-closed·OFF(무지출). ── */
    private static function kakaoDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily, string $landing): array
    {
        $h = self::kakaoHeaders($pdo, $tenant);
        if ($h === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$hdr, $acc] = $h;
        // 1) 광고그룹(캠페인 하위, OFF=정지)
        $agBody = json_encode(['adAccountId' => (int)$acc, 'campaignId' => (int)$campId, 'name' => mb_substr($d['headline'], 0, 50) . ' AG',
            'config' => 'OFF', 'dailyBudgetAmount' => $daily], JSON_UNESCAPED_UNICODE);
        [$ac, $ar] = self::http('POST', 'https://apis.moment.kakao.com/openapi/v4/adGroups', $hdr, $agBody);
        $agId = $ar['id'] ?? $ar['adGroupId'] ?? ($ar['data']['id'] ?? '');
        if ($agId === '') return ['ok' => true, 'status' => 'partial', 'note' => 'Kakao 캠페인까지 생성. 광고그룹 보류(라이브 스키마 확정 필요): ' . (self::errMsg($ar) ?: ('HTTP ' . $ac))];
        // [현 차수 1순위] 2) 소재 자동업로드 — Kakao Moment Display 소재는 이미지 파일 멀티파트가 필수다.
        //   (POST /openapi/v4/creatives, Content-Type: multipart/form-data, 필수: adGroupId·format·imageFile·altText.)
        //   AI 생성 래스터(ad_design.svg 의 data:image base64)를 imageFile 로 직접 업로드 → 별도 자산 등록 단계 불요.
        //   이미지가 없으면(텍스트 전용 디자인) honest partial — Display 소재는 이미지 없이 생성 불가.
        if (empty($d['image_b64'])) {
            return ['ok' => true, 'adgroup_id' => (string)$agId, 'ad_id' => '', 'status' => 'partial',
                'note' => 'Kakao 광고그룹 생성(OFF). 소재 보류 — 이미지 소재 필요(AI 디자인에 이미지 생성 후 재집행).'];
        }
        $tf = self::b64TempFile((string)$d['image_b64'], (string)($d['image_mime'] ?: 'image/png'));
        if ($tf === null) return ['ok' => true, 'adgroup_id' => (string)$agId, 'ad_id' => '', 'status' => 'partial',
            'note' => 'Kakao 광고그룹 생성(OFF). 소재 보류 — 이미지 디코드 실패.'];
        [$imgPath, $imgMime, $imgName] = $tf;
        // 멀티파트는 curl 이 boundary 포함 Content-Type 을 자동설정 → JSON content-type 헤더 제거(Authorization·adAccountId 만).
        $mpHdr = array_values(array_filter($hdr, fn($h) => stripos($h, 'content-type:') !== 0));
        $alt   = mb_substr($d['headline'] ?: ($d['copy'] ?: 'GenieGo'), 0, 30);
        $fields = array_filter([
            'adGroupId'        => (string)(int)$agId,
            'format'           => 'IMAGE_BANNER',           // 이미지 배너(프로필이미지 불요·단일 이미지) — 무지출 OFF 정책 유지.
            'name'             => mb_substr($d['headline'], 0, 50) . ' CR',
            'altText'          => $alt,
            'mobileLandingUrl' => $landing,
            'pcLandingUrl'     => $landing,
            // ※ 무지출(정지)은 상위 adGroup·campaign 의 config=OFF 로 이미 보장된다. 소재 생성 API 는 'config' 파라미터를
            //    받지 않으므로(미지원 파라미터 거부 방지) 전송하지 않는다. 사용자가 매체 화면에서 활성화 전까지 집행 0.
            'imageFile'        => ['__file__' => $imgPath, 'name' => $imgName, 'mime' => $imgMime],
        ], fn($v) => $v !== '' && $v !== null);
        try {
            [$cc, $cr] = self::httpMultipart('https://apis.moment.kakao.com/openapi/v4/creatives', $mpHdr, $fields, 40);
        } finally { @unlink($imgPath); }
        $crId = $cr['id'] ?? $cr['creativeId'] ?? ($cr['data']['id'] ?? '');
        if ($crId === '' || $crId === null) return ['ok' => true, 'adgroup_id' => (string)$agId, 'ad_id' => '', 'status' => 'partial',
            'note' => 'Kakao 광고그룹 생성(OFF). 소재 업로드 보류: ' . (self::errMsg($cr) ?: ('HTTP ' . $cc))];
        $imgUrl = $cr['image']['url'] ?? ($cr['data']['image']['url'] ?? '');
        return ['ok' => true, 'adgroup_id' => (string)$agId, 'ad_id' => (string)$crId, 'image_url' => $imgUrl,
            'note' => 'Kakao 광고그룹+이미지 소재 업로드·생성(OFF)' . ($imgUrl !== '' ? ' — 소재이미지 등록완료' : '')];
    }

    /** [현 차수 1순위] LINE Ads 미디어(이미지) 자동업로드 → hash 획득. creative(IMAGE)는 이 hash 를 참조.
     *   ★LINE JWS 인증(lineAdsAuthHeaders)이 JSON body 의 Content-MD5 를 서명하므로 멀티파트(이진) 대신 base64 JSON
     *   미디어 등록을 사용한다(서명 일관성·graceful 드롭인). 엔드포인트/필드는 실 자격증명 라이브 응답으로 최종 확정.
     *   반환=['hash'=>string, 'code'=>int, 'res'=>mixed]. */
    private static function lineUploadMedia(string $ak, string $sk, string $gid, string $b64, string $mime): array
    {
        $path = '/api/v3/groups/' . rawurlencode($gid) . '/media';
        [$code, $res] = self::lineReq('POST', $path, [
            'name' => 'GenieGo Creative', 'type' => 'IMAGE', 'mime' => $mime, 'data' => $b64,
        ], $ak, $sk);
        $hash = $res['hash'] ?? $res['mediaHash'] ?? ($res['id'] ?? ($res['data']['hash'] ?? ($res['data']['id'] ?? '')));
        return ['hash' => (string)$hash, 'code' => $code, 'res' => $res];
    }

    /* ── LINE Ads: 광고그룹 + 광고(소재) PAUSED. lineCreate 와 동일 JWS 인증.
     *   ★엔드포인트/스키마는 실 자격증명 등록 시 라이브 응답으로 최종 확정(graceful). fail-closed·PAUSED(무지출). ── */
    private static function lineDeliver(PDO $pdo, string $tenant, string $campId, array $d, int $daily, string $landing): array
    {
        $c = self::lineCreds($pdo, $tenant);
        if ($c === null) return ['ok' => false, 'error' => 'no_credentials'];
        [$ak, $sk, $gid] = $c;
        // 1) 광고그룹(캠페인 하위, PAUSED)
        $agPath = '/api/v3/campaigns/' . rawurlencode($campId) . '/adgroups';
        [$ac, $ar] = self::lineReq('POST', $agPath, ['name' => mb_substr($d['headline'], 0, 50) . ' AG', 'status' => 'PAUSED', 'bidAmount' => max(100, (int)($daily / 100))], $ak, $sk);
        $agId = $ar['id'] ?? $ar['adgroupId'] ?? ($ar['data']['id'] ?? '');
        if ($agId === '') return ['ok' => true, 'status' => 'partial', 'note' => 'LINE 캠페인까지 생성. 광고그룹 보류(라이브 스키마 확정 필요): ' . (self::errMsg($ar) ?: ('HTTP ' . $ac))];
        // [현 차수 1순위] 2) 소재 자동업로드 — 이미지 미디어 업로드 → hash 획득 후 ad(소재) 생성.
        //   creativeFormat=IMAGE 소재는 등록 미디어 hash 가 필수다. AI 생성 래스터를 자동 업로드(없으면 텍스트 소재).
        $mediaHash = ''; $mediaNote = '';
        if (!empty($d['image_b64'])) {
            $up = self::lineUploadMedia($ak, $sk, $gid, (string)$d['image_b64'], (string)($d['image_mime'] ?: 'image/png'));
            $mediaHash = (string)$up['hash'];
            if ($mediaHash === '') $mediaNote = ' · 미디어 업로드 보류: ' . (self::errMsg($up['res']) ?: ('HTTP ' . $up['code']));
        } else {
            $mediaNote = ' · 이미지 소재 없음(텍스트 소재)';
        }
        $adPath = '/api/v3/adgroups/' . rawurlencode((string)$agId) . '/ads';
        $adBody = array_filter([
            'name'              => mb_substr($d['headline'], 0, 50) . ' Ad',
            'status'            => 'PAUSED',
            'creativeFormat'    => $mediaHash !== '' ? 'IMAGE' : null,
            'mediaHash'         => $mediaHash !== '' ? $mediaHash : null,
            'title'             => mb_substr($d['headline'], 0, 50),
            'description'       => mb_substr($d['copy'] ?: '', 0, 100),
            'actionButtonLabel' => $mediaHash !== '' ? 'LEARN_MORE' : null,
            'landingUrl'        => $landing,
        ], fn($v) => $v !== null);
        [$adc, $adr] = self::lineReq('POST', $adPath, $adBody, $ak, $sk);
        $adId = $adr['id'] ?? ($adr['data']['id'] ?? '');
        if ($adId === '') return ['ok' => true, 'adgroup_id' => (string)$agId, 'ad_id' => '', 'status' => 'partial',
            'note' => 'LINE 광고그룹 생성(PAUSED). 소재 생성 보류' . $mediaNote . ': ' . (self::errMsg($adr) ?: ('HTTP ' . $adc))];
        return ['ok' => true, 'adgroup_id' => (string)$agId, 'ad_id' => (string)$adId, 'media_hash' => $mediaHash,
            'note' => 'LINE 광고그룹+소재 생성(PAUSED)' . ($mediaHash !== '' ? ' — 이미지 미디어 업로드 포함' : $mediaNote)];
    }

    /* ════════════════════════ 오디언스/리타겟팅 (Custom Audience · Customer Match) ════════════════════════ */

    /**
     * [227차] 테넌트 고객 이메일을 sha256 해시 목록으로 수집(매체 오디언스 업로드용).
     *   ★PII 안전: 원문 미저장·미전송. 정규화(소문자·trim) 후 sha256 해시만 사용(Meta/Google 표준).
     *   소스: crm_customers(고객) + channel_orders(구매자) distinct. 데모/익명은 빈 배열.
     */
    private static function collectHashedEmails(PDO $pdo, string $tenant, int $limit = 10000): array
    {
        if ($tenant === '' || $tenant === 'demo' || strncmp($tenant, 'demo', 4) === 0) return [];
        $emails = [];
        foreach ([
            "SELECT DISTINCT email FROM crm_customers WHERE tenant_id=? AND email IS NOT NULL AND email<>''",
            "SELECT DISTINCT buyer_email AS email FROM channel_orders WHERE tenant_id=? AND buyer_email IS NOT NULL AND buyer_email<>''",
        ] as $sql) {
            try {
                $st = $pdo->prepare($sql . ' LIMIT ' . (int)$limit);
                $st->execute([$tenant]);
                foreach ($st->fetchAll(PDO::FETCH_COLUMN) ?: [] as $e) {
                    $norm = strtolower(trim((string)$e));
                    if ($norm !== '' && filter_var($norm, FILTER_VALIDATE_EMAIL)) $emails[hash('sha256', $norm)] = true;
                }
            } catch (Throwable $e) { /* 테이블 부재 등 무시 */ }
            if (count($emails) >= $limit) break;
        }
        return array_slice(array_keys($emails), 0, $limit);
    }

    /**
     * [227차] 오디언스/리타겟팅 매체 push 디스패치. 고객 해시 이메일을 매체 오디언스로 업로드한다.
     *   $opts: ['lookalike'=>bool, 'country'=>'KR', 'name'=>string]. 반환=honest 결과.
     */
    public static function syncAudience(PDO $pdo, string $tenant, string $channel, array $opts = []): array
    {
        if (!self::executionEnabled()) return ['ok' => false, 'status' => 'execution_disabled'];
        $hashes = self::collectHashedEmails($pdo, $tenant);
        if (empty($hashes)) return ['ok' => false, 'status' => 'no_audience', 'note' => '업로드할 고객 데이터가 없습니다(CRM 고객/구매자 이메일 필요).'];
        try {
            switch ($channel) {
                case 'meta_ads': case 'meta':   return self::metaSyncAudience($pdo, $tenant, $hashes, $opts);
                case 'google_ads': case 'google': return self::googleSyncAudience($pdo, $tenant, $hashes, $opts);
                case 'tiktok_business': case 'tiktok': return self::tiktokSyncAudience($pdo, $tenant, $hashes, $opts);
                default: return ['ok' => false, 'status' => 'unsupported',
                    'note' => '오디언스 push 미지원 채널: ' . $channel . ' (Naver SA/Kakao Moment 해시 오디언스는 별도 광고상품·승인 필요 — 로드맵)'];
            }
        } catch (Throwable $e) { return self::fail($e->getMessage()); }
    }

    /** Meta Custom Audience 생성 + 해시 이메일 업로드(+선택 Lookalike). */
    private static function metaSyncAudience(PDO $pdo, string $tenant, array $hashes, array $opts): array
    {
        $token = self::cred($pdo, $tenant, 'meta_ads', 'access_token');
        $acct  = self::cred($pdo, $tenant, 'meta_ads', 'ad_account_id');
        if ($token === '' || $acct === '') return ['ok' => false, 'status' => 'no_credentials', 'error' => 'Meta 자격증명(access_token/ad_account_id) 미등록'];
        if (strncmp($acct, 'act_', 4) !== 0) $acct = 'act_' . $acct;
        $api  = "https://graph.facebook.com/" . self::META_VER;
        $name = mb_substr((string)($opts['name'] ?? 'GenieGo 고객 오디언스'), 0, 80);
        // 1) 커스텀 오디언스 생성
        [$cc, $cr] = self::http('POST', "{$api}/{$acct}/customaudiences", ['Content-Type: application/x-www-form-urlencoded'], [
            'name' => $name, 'subtype' => 'CUSTOM', 'description' => 'GenieGo CRM 고객(해시)',
            'customer_file_source' => 'USER_PROVIDED_ONLY', 'access_token' => $token,
        ]);
        $audId = $cr['id'] ?? '';
        if ($audId === '') return ['ok' => false, 'error' => 'Meta 오디언스 생성 실패: ' . (self::errMsg($cr) ?: ('HTTP ' . $cc))];
        // 2) 해시 이메일 업로드(배치 1만, payload schema=EMAIL_SHA256)
        $added = 0; $batches = array_chunk($hashes, 5000);
        foreach ($batches as $b) {
            $payload = json_encode(['schema' => 'EMAIL_SHA256', 'data' => array_map(fn($h) => [$h], $b)]);
            [$uc, $ur] = self::http('POST', "{$api}/{$audId}/users", ['Content-Type: application/x-www-form-urlencoded'], ['payload' => $payload, 'access_token' => $token]);
            if (isset($ur['num_received'])) $added += (int)$ur['num_received'];
            elseif ($uc >= 200 && $uc < 300) $added += count($b);
        }
        $out = ['ok' => true, 'channel' => 'meta', 'audience_id' => $audId, 'uploaded' => $added, 'note' => "Meta 커스텀 오디언스 생성·{$added}건 업로드(해시)"];
        // 3) 선택: 룩어라이크(유사 타깃 확장)
        if (!empty($opts['lookalike'])) {
            $country = (string)($opts['country'] ?? 'KR');
            [$lc, $lr] = self::http('POST', "{$api}/{$acct}/customaudiences", ['Content-Type: application/x-www-form-urlencoded'], [
                'name' => $name . ' Lookalike', 'subtype' => 'LOOKALIKE', 'origin_audience_id' => $audId,
                'lookalike_spec' => json_encode(['type' => 'similarity', 'country' => $country, 'ratio' => 0.01]),
                'access_token' => $token,
            ]);
            $out['lookalike_id'] = $lr['id'] ?? '';
            if (($lr['id'] ?? '') === '') $out['lookalike_note'] = '룩어라이크 생성 보류: ' . (self::errMsg($lr) ?: ('HTTP ' . $lc));
        }
        return $out;
    }

    /** Google Customer Match — CRM 기반 user list 생성 + OfflineUserDataJob 으로 해시 이메일 적재. */
    private static function googleSyncAudience(PDO $pdo, string $tenant, array $hashes, array $opts): array
    {
        $dev   = self::cred($pdo, $tenant, 'google_ads', 'developer_token');
        $token = self::cred($pdo, $tenant, 'google_ads', 'access_token');
        $cid   = preg_replace('/\D/', '', self::cred($pdo, $tenant, 'google_ads', 'customer_id'));
        if ($dev === '' || $token === '' || $cid === '') return ['ok' => false, 'status' => 'no_credentials', 'error' => 'Google 자격증명 미등록'];
        $hdr = ['Authorization: Bearer ' . $token, 'developer-token: ' . $dev, 'Content-Type: application/json', 'login-customer-id: ' . $cid];
        $base = "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/customers/{$cid}";
        // 1) CRM 기반 user list 생성
        $name = mb_substr((string)($opts['name'] ?? 'GenieGo 고객 매치'), 0, 80);
        $ulBody = json_encode(['operations' => [['create' => [
            'name' => $name . ' ' . substr(md5($name . count($hashes)), 0, 6), 'membershipLifeSpan' => 540,
            'crmBasedUserList' => ['uploadKeyType' => 'CONTACT_INFO', 'dataSourceType' => 'FIRST_PARTY'],
        ]]]]);
        [$lc, $lr] = self::http('POST', "{$base}/userLists:mutate", $hdr, $ulBody);
        $listRes = $lr['results'][0]['resourceName'] ?? '';
        if ($listRes === '') return ['ok' => false, 'error' => 'Google user list 생성 실패: ' . (self::errMsg($lr) ?: ('HTTP ' . $lc))];
        // 2) OfflineUserDataJob 생성(CUSTOMER_MATCH_USER_LIST)
        $jobBody = json_encode(['job' => ['type' => 'CUSTOMER_MATCH_USER_LIST', 'customerMatchUserListMetadata' => ['userList' => $listRes]]]);
        [$jc, $jr] = self::http('POST', "{$base}/offlineUserDataJobs:create", $hdr, $jobBody);
        $jobRes = $jr['resourceName'] ?? '';
        if ($jobRes === '') return ['ok' => true, 'channel' => 'google', 'user_list' => $listRes, 'uploaded' => 0, 'note' => 'user list 생성됨. 적재 job 생성 보류: ' . (self::errMsg($jr) ?: ('HTTP ' . $jc))];
        // 3) addOperations(해시 이메일) — 배치
        $added = 0;
        foreach (array_chunk($hashes, 5000) as $b) {
            $ops = array_map(fn($h) => ['create' => ['userIdentifiers' => [['hashedEmail' => $h]]]], $b);
            [$ac, $ar] = self::http('POST', "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/{$jobRes}:addOperations",
                $hdr, json_encode(['operations' => $ops, 'enablePartialFailure' => true]));
            if ($ac >= 200 && $ac < 300) $added += count($b);
        }
        // 4) run job
        self::http('POST', "https://googleads.googleapis.com/" . self::GOOGLE_VER . "/{$jobRes}:run", $hdr, json_encode([]));
        return ['ok' => true, 'channel' => 'google', 'user_list' => $listRes, 'job' => $jobRes, 'uploaded' => $added, 'note' => "Google Customer Match user list 생성·{$added}건 적재(job 실행)"];
    }

    /** multipart/form-data POST(파일 업로드). $fields 의 값 중 ['__file__'=>path,'name'=>...] 는 CURLFile 로 전송. */
    private static function httpMultipart(string $url, array $headers, array $fields, int $timeout = 30): array
    {
        $post = [];
        foreach ($fields as $k => $v) {
            if (is_array($v) && isset($v['__file__'])) {
                $post[$k] = new \CURLFile($v['__file__'], (string)($v['mime'] ?? 'text/plain'), (string)($v['name'] ?? basename($v['__file__'])));
            } else { $post[$k] = $v; }
        }
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout, CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_POSTFIELDS => $post, // 배열+CURLFile → multipart 자동
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $json = is_string($resp) ? json_decode($resp, true) : null;
        return [$code, ($json !== null ? $json : $resp)];
    }

    /**
     * [정밀감사] TikTok Custom Audience — 해시 이메일 파일(EMAIL_SHA256) 업로드 후 오디언스 생성.
     *   2단계: file/upload(multipart) → custom_audience/create. honest-partial(코드≠0 시 정직 보류).
     */
    private static function tiktokSyncAudience(PDO $pdo, string $tenant, array $hashes, array $opts): array
    {
        $token = self::cred($pdo, $tenant, 'tiktok_business', 'access_token');
        $advId = self::cred($pdo, $tenant, 'tiktok_business', 'advertiser_id');
        if ($token === '' || $advId === '') return ['ok' => false, 'status' => 'no_credentials', 'error' => 'TikTok 자격증명(access_token/advertiser_id) 미등록'];
        $name = mb_substr((string)($opts['name'] ?? 'GenieGo 고객 오디언스'), 0, 80);
        // 1) 해시 목록을 임시 파일로 기록(한 줄당 sha256 이메일) — TikTok file/upload(multipart) 요구사항.
        $tmp = tempnam(sys_get_temp_dir(), 'ttaud_');
        if ($tmp === false) return ['ok' => false, 'error' => 'temp_file_failed'];
        try {
            file_put_contents($tmp, implode("\n", $hashes));
            $hdr = ['Access-Token: ' . $token];
            [$uc, $ur] = self::httpMultipart('https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/file/upload/', $hdr, [
                'advertiser_id' => $advId, 'calculate_type' => 'EMAIL_SHA256',
                'file' => ['__file__' => $tmp, 'name' => 'audience.csv', 'mime' => 'text/csv'],
            ]);
            if (($ur['code'] ?? -1) !== 0 || empty($ur['data']['file_paths'])) {
                return ['ok' => true, 'channel' => 'tiktok', 'status' => 'partial', 'uploaded' => 0,
                    'note' => 'TikTok 오디언스 파일 업로드 보류(라이브 스키마 확정 필요): ' . (($ur['message'] ?? '') ?: ('HTTP ' . $uc))];
            }
            $filePaths = $ur['data']['file_paths'];
            // 2) 오디언스 생성
            $body = json_encode(['advertiser_id' => $advId, 'custom_audience_name' => $name, 'calculate_type' => 'EMAIL_SHA256', 'file_paths' => $filePaths], JSON_UNESCAPED_UNICODE);
            [$cc, $cr] = self::http('POST', 'https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/create/',
                ['Access-Token: ' . $token, 'Content-Type: application/json'], $body);
            $audId = $cr['data']['custom_audience_id'] ?? '';
            if ($audId === '') return ['ok' => true, 'channel' => 'tiktok', 'status' => 'partial', 'uploaded' => count($hashes),
                'note' => 'TikTok 오디언스 파일 업로드 완료. 생성 보류: ' . (($cr['message'] ?? '') ?: ('HTTP ' . $cc))];
            return ['ok' => true, 'channel' => 'tiktok', 'audience_id' => (string)$audId, 'uploaded' => count($hashes),
                'note' => "TikTok 커스텀 오디언스 생성·" . count($hashes) . "건 업로드(해시)"];
        } finally {
            @unlink($tmp);
        }
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
