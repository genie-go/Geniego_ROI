<?php
/**
 * DigitalShelf — 디지털 셸프(검색 노출) 추적 키워드 백엔드.
 *
 * [265차] DigitalShelf.jsx 의 SoS(Share of Search) 추적 키워드가 운영에서 로컬 state 로만 존재해
 *   새로고침 시 소실됐다(백엔드 부재·routes 전무). → 테넌트 스코프 전용 영속 백엔드 신설.
 *   - CRUD: 세션 self-auth(UserAuth::requirePro + authedTenant) + tenant_id 격리.
 *     /v429/ 접두는 index.php 에서 이미 세션 self-auth bypass(OpenPlatform/DataExport 동일 그룹).
 *   - 정직성: 실 SoS/순위 값은 채널 검색 API(Naver/Coupang 등) 실 harvest 가 필요한 외부의존 로드맵.
 *     본 백엔드는 사용자가 추적 등록한 키워드와(선택) 관측 지표를 영속할 뿐 값을 날조하지 않는다.
 *     운영은 등록분만 표시(빈 시작), 데모는 프론트 IS_DEMO 샘플 유지.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class DigitalShelf
{
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /** 세션 인증 테넌트(미들웨어 주입 우선, 세션 self-auth 폴백). '' = 미인증. */
    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t === '') { $t = UserAuth::authedTenant($req) ?? ''; }
        return $t;
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    private static function clean(string $s, int $max = 120): string
    {
        $s = (string)preg_replace('/[<>\x00-\x1f]/', '', $s);
        return trim(mb_substr($s, 0, $max));
    }

    private static function ensure(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS digital_shelf_keyword (
                id $AI, tenant_id VARCHAR(100) NOT NULL,
                keyword VARCHAR(160) NOT NULL, channel VARCHAR(40) DEFAULT 'all',
                our_sos DECIMAL(5,2) DEFAULT NULL, comp_sos DECIMAL(5,2) DEFAULT NULL,
                rank_now INT DEFAULT NULL, rank_prev INT DEFAULT NULL,
                note VARCHAR(300) DEFAULT NULL, status VARCHAR(20) DEFAULT 'tracking',
                created_at VARCHAR(32), updated_at VARCHAR(32)
            )");
        } catch (\Throwable $e) { /* graceful */ }
        // [현 차수] 라이브 순위 harvest 지원 컬럼 — 기존 테이블에도 멱등 ALTER(이미 존재 시 예외무시, MySQL·SQLite 공통).
        //   brand=검색결과에서 "우리 노출"을 식별할 몰/브랜드/판매자명(미설정 시 harvest 는 rank/SoS 미산출·날조 안 함).
        //   harvest_* = 최근 자동수집 출처·상태·시각(수동 입력과 구분·투명성).
        foreach ([
            "brand VARCHAR(120) DEFAULT NULL",
            "harvest_source VARCHAR(40) DEFAULT NULL",
            "harvest_status VARCHAR(20) DEFAULT NULL",
            "harvest_note VARCHAR(300) DEFAULT NULL",
            "harvested_at VARCHAR(32) DEFAULT NULL",
        ] as $col) {
            try { $pdo->exec("ALTER TABLE digital_shelf_keyword ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
    }

    private static function mapRow(array $r): array
    {
        $rankNow = $r['rank_now'] !== null ? (int)$r['rank_now'] : null;
        $rankPrev = $r['rank_prev'] !== null ? (int)$r['rank_prev'] : null;
        $trend = 'flat';
        if ($rankNow !== null && $rankPrev !== null) {
            if ($rankNow < $rankPrev) $trend = 'up';       // 순위 숫자 감소 = 상승
            elseif ($rankNow > $rankPrev) $trend = 'down';
        }
        return [
            'id'       => (int)$r['id'],
            'keyword'  => (string)($r['keyword'] ?? ''),
            'channel'  => (string)($r['channel'] ?? 'all'),
            'ourSos'   => $r['our_sos'] !== null ? (float)$r['our_sos'] : null,
            'compSos'  => $r['comp_sos'] !== null ? (float)$r['comp_sos'] : null,
            'rank'     => $rankNow,
            'prevRank' => $rankPrev,
            'trend'    => $trend,
            'note'     => (string)($r['note'] ?? ''),
            'status'   => (string)($r['status'] ?? 'tracking'),
            'updatedAt'=> (string)($r['updated_at'] ?? ''),
            // [현 차수] 라이브 harvest 메타(수동 입력과 구분·투명성). 컬럼 미보강 환경에서도 graceful null.
            'brand'         => isset($r['brand']) && $r['brand'] !== null ? (string)$r['brand'] : '',
            'harvestSource' => isset($r['harvest_source']) ? (string)($r['harvest_source'] ?? '') : '',
            'harvestStatus' => isset($r['harvest_status']) ? (string)($r['harvest_status'] ?? '') : '',
            'harvestNote'   => isset($r['harvest_note']) ? (string)($r['harvest_note'] ?? '') : '',
            'harvestedAt'   => isset($r['harvested_at']) ? (string)($r['harvested_at'] ?? '') : '',
        ];
    }

    /** GET /v429/shelf/keywords — 테넌트 추적 키워드 목록. */
    public static function list(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $st = $pdo->prepare("SELECT * FROM digital_shelf_keyword WHERE tenant_id=? ORDER BY id DESC LIMIT 500");
        $st->execute([$t]);
        $rows = array_map([self::class, 'mapRow'], $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
        return self::json($res, ['ok' => true, 'keywords' => $rows]);
    }

    /** POST /v429/shelf/keywords — 키워드 추적 등록(테넌트+키워드+채널 멱등). */
    public static function add(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $kw = self::clean((string)($body['keyword'] ?? ''), 160);
        if ($kw === '') return self::json($res, ['ok' => false, 'error' => 'keyword 필요'], 422);
        $ch = self::clean((string)($body['channel'] ?? 'all'), 40) ?: 'all';
        // 멱등: 동일 테넌트+키워드+채널 존재 시 재사용(중복 방지)
        $dup = $pdo->prepare("SELECT id FROM digital_shelf_keyword WHERE tenant_id=? AND keyword=? AND channel=? LIMIT 1");
        $dup->execute([$t, $kw, $ch]);
        if ($eid = $dup->fetchColumn()) return self::json($res, ['ok' => true, 'id' => (int)$eid, 'duplicate' => true]);
        $now = self::now();
        $ourSos = isset($body['ourSos']) && $body['ourSos'] !== '' ? (float)$body['ourSos'] : null;
        $compSos = isset($body['compSos']) && $body['compSos'] !== '' ? (float)$body['compSos'] : null;
        $rank = isset($body['rank']) && $body['rank'] !== '' ? (int)$body['rank'] : null;
        $note = self::clean((string)($body['note'] ?? ''), 300);
        // [현 차수] brand = 검색결과에서 우리 노출을 식별할 몰/브랜드/판매자명(라이브 순위 harvest 매칭용, 선택).
        $brand = self::clean((string)($body['brand'] ?? ''), 120);
        $pdo->prepare("INSERT INTO digital_shelf_keyword (tenant_id,keyword,channel,our_sos,comp_sos,rank_now,rank_prev,note,status,brand,created_at,updated_at)
                       VALUES (?,?,?,?,?,?,?,?,'tracking',?,?,?)")
            ->execute([$t, $kw, $ch, $ourSos, $compSos, $rank, null, $note, $brand !== '' ? $brand : null, $now, $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /** PATCH /v429/shelf/keywords/{id} — 관측 지표 갱신(순위는 이전값 보존→트렌드 산출). */
    public static function update(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $cur = $pdo->prepare("SELECT * FROM digital_shelf_keyword WHERE id=? AND tenant_id=? LIMIT 1");
        $cur->execute([$id, $t]);
        $row = $cur->fetch(PDO::FETCH_ASSOC);
        if (!$row) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $ourSos = array_key_exists('ourSos', $body) ? (($body['ourSos'] === '' || $body['ourSos'] === null) ? null : (float)$body['ourSos']) : ($row['our_sos'] !== null ? (float)$row['our_sos'] : null);
        $compSos = array_key_exists('compSos', $body) ? (($body['compSos'] === '' || $body['compSos'] === null) ? null : (float)$body['compSos']) : ($row['comp_sos'] !== null ? (float)$row['comp_sos'] : null);
        // 새 순위가 오면 기존 순위를 prev 로 이월(트렌드 근거)
        $rankNow = $row['rank_now'] !== null ? (int)$row['rank_now'] : null;
        $rankPrev = $row['rank_prev'] !== null ? (int)$row['rank_prev'] : null;
        if (array_key_exists('rank', $body) && $body['rank'] !== '' && $body['rank'] !== null) {
            $newRank = (int)$body['rank'];
            if ($rankNow !== null && $newRank !== $rankNow) $rankPrev = $rankNow;
            $rankNow = $newRank;
        }
        $note = array_key_exists('note', $body) ? self::clean((string)$body['note'], 300) : (string)($row['note'] ?? '');
        $status = array_key_exists('status', $body) ? self::clean((string)$body['status'], 20) : (string)($row['status'] ?? 'tracking');
        // [현 차수] brand 갱신(라이브 harvest 매칭 식별자) — 미전달 시 기존값 보존.
        $brand = array_key_exists('brand', $body) ? self::clean((string)$body['brand'], 120) : (isset($row['brand']) ? (string)($row['brand'] ?? '') : '');
        $pdo->prepare("UPDATE digital_shelf_keyword SET our_sos=?, comp_sos=?, rank_now=?, rank_prev=?, note=?, status=?, brand=?, updated_at=? WHERE id=? AND tenant_id=?")
            ->execute([$ourSos, $compSos, $rankNow, $rankPrev, $note, $status, $brand !== '' ? $brand : null, self::now(), $id, $t]);
        return self::json($res, ['ok' => true]);
    }

    /** DELETE /v429/shelf/keywords/{id} — 추적 해제. */
    public static function remove(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $pdo->prepare("DELETE FROM digital_shelf_keyword WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($res, ['ok' => true]);
    }

    // ── Live rank/SoS harvest ────────────────────────────────────────────────
    //   ★수동 입력(4/10)을 넘어 실 마켓 검색 결과 위치에서 우리 유기 순위 + Share-of-Shelf 를 계산한다.
    //   PriceOpt::harvestCompetitors 패턴(연동허브 자격증명 → Crypto 복호화 → curl → 자격 미설정 시 graceful pending)
    //   을 그대로 미러링한다. 자격증명/브랜드가 없으면 값을 날조하지 않고 pending/no_brand 로 정직하게 축약한다.
    //   수동 입력 경로(add/update)는 유지 — harvest 로 값이 나올 때만 our_sos/comp_sos/rank 를 덮어쓴다.

    /** 연동허브 자격증명 읽기 — channel_credential(AES-256-GCM 복호화). PriceOpt::loadChannelCred 정합. */
    private static function cred(PDO $pdo, string $t, string $channel, string $key): string
    {
        try {
            $st = $pdo->prepare("SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1");
            $st->execute([$t, $channel, $key]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            return \Genie\Crypto::decrypt((string)($row['key_value'] ?? ''));
        } catch (\Throwable $e) { return ''; }
    }

    /**
     * Naver 쇼핑 검색 위치 harvest — sort=sim(관련도=유기 노출순)로 상위 결과를 받아 우리(brand) 노출 위치를
     *   계산한다. @return array{ok:bool, total:int, positions:int[], note?:string}  positions=1-based 우리 노출 순위 목록.
     */
    private static function naverShelfPositions(string $cid, string $sec, string $keyword, string $brand): array
    {
        $ch = curl_init('https://openapi.naver.com/v1/search/shop.json?display=40&sort=sim&query=' . rawurlencode($keyword));
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ["X-Naver-Client-Id: {$cid}", "X-Naver-Client-Secret: {$sec}"]]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($code !== 200 || !$raw) return ['ok' => false, 'total' => 0, 'positions' => [], 'note' => "Naver HTTP {$code}"];
        $j = json_decode((string)$raw, true);
        $items = (array)($j['items'] ?? []);
        $positions = []; $pos = 0;
        $bl = mb_strtolower(trim($brand));
        foreach ($items as $it) {
            $pos++;
            // 검색결과 응답의 HTML 태그(<b>) 제거 후 몰명/브랜드/제조사에서 우리 식별.
            $hay = mb_strtolower(strip_tags((string)($it['mallName'] ?? '') . ' ' . (string)($it['brand'] ?? '') . ' ' . (string)($it['maker'] ?? '') . ' ' . (string)($it['title'] ?? '')));
            if ($bl !== '' && mb_strpos($hay, $bl) !== false) $positions[] = $pos;
        }
        return ['ok' => true, 'total' => count($items), 'positions' => $positions];
    }

    /**
     * Coupang 검색 위치 harvest — 판매자 자격증명(access_key/secret_key/vendor_id) CEA HMAC 서명(ChannelSync 정합).
     *   ★Coupang 은 공개 키워드 검색 API 를 제공하지 않아 라이브 검증은 실 벤더 계정 필요 — 실패/미지원 시 graceful []
     *   (날조 금지). 응답 파싱 성공분만 위치화한다.
     */
    private static function coupangShelfPositions(array $creds, string $keyword, string $brand): array
    {
        $accessKey = trim((string)($creds['access_key'] ?? ''));
        $secretKey = trim((string)($creds['secret_key'] ?? ''));
        $vendorId  = trim((string)($creds['vendor_id'] ?? ''));
        if ($accessKey === '' || $secretKey === '' || $vendorId === '') return ['ok' => false, 'total' => 0, 'positions' => [], 'note' => 'no_credentials'];
        $host  = 'https://api-gateway.coupang.com';
        $path  = "/v2/providers/seller_api/apis/api/v1/marketplace/meta/search";
        $query = 'keyword=' . rawurlencode($keyword) . '&limit=40';
        $datetime  = gmdate('ymd\THis\Z');
        $signature = hash_hmac('sha256', $datetime . 'GET' . $path . $query, $secretKey);
        $auth = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$signature}";
        $ch = curl_init($host . $path . '?' . $query);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ["Authorization: {$auth}", "Content-Type: application/json;charset=UTF-8"]]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($code !== 200 || !$raw) return ['ok' => false, 'total' => 0, 'positions' => [], 'note' => "Coupang HTTP {$code} (공개검색 미지원 가능 — 실벤더 검증 필요)"];
        $j = json_decode((string)$raw, true);
        $items = (array)($j['data'] ?? $j['productData'] ?? $j['products'] ?? []);
        if (!$items) return ['ok' => false, 'total' => 0, 'positions' => [], 'note' => 'Coupang: 검색결과 파싱 불가'];
        $positions = []; $pos = 0; $bl = mb_strtolower(trim($brand));
        foreach ($items as $it) {
            $pos++;
            $hay = mb_strtolower((string)($it['sellerName'] ?? '') . ' ' . (string)($it['vendorName'] ?? '') . ' ' . (string)($it['brand'] ?? '') . ' ' . (string)($it['productName'] ?? ''));
            if ($bl !== '' && mb_strpos($hay, $bl) !== false) $positions[] = $pos;
        }
        return ['ok' => true, 'total' => count($items), 'positions' => $positions];
    }

    /** 위치 결과 → SoS/rank 로 환산. our_sos = 우리노출/총노출·comp_sos = 나머지. rank = 최상위 우리노출(없으면 null). */
    private static function positionsToMetrics(array $pos): array
    {
        $total = (int)($pos['total'] ?? 0);
        $positions = (array)($pos['positions'] ?? []);
        if ($total <= 0) return ['ourSos' => null, 'compSos' => null, 'rank' => null];
        $ourCount = count($positions);
        $ourSos = round($ourCount / $total * 100, 1);
        return ['ourSos' => $ourSos, 'compSos' => round(100 - $ourSos, 1), 'rank' => $ourCount > 0 ? min($positions) : null];
    }

    /** 채널 → harvest 어댑터 디스패치. 미지원 채널은 graceful skip(현재 naver/coupang 구현, 그 외 로드맵). */
    private static function harvestOneRow(PDO $pdo, string $t, array $row, array $creds): array
    {
        $keyword = (string)($row['keyword'] ?? '');
        $brand   = trim((string)($row['brand'] ?? ''));
        $channel = strtolower((string)($row['channel'] ?? 'all'));
        if ($keyword === '') return ['status' => 'skip', 'note' => 'empty keyword'];
        if ($brand === '') return ['status' => 'no_brand', 'note' => 'brand(몰/브랜드명) 미설정 — 순위·SoS 계산 불가(등록 시 brand 입력)'];

        // 채널 라우팅: 'coupang'=쿠팡만, 'naver'/'smartstore'=네이버만, 'all'/기타=네이버 우선(공개 검색 가용).
        $tryNaver   = in_array($channel, ['all', 'naver', 'naver_smartstore', 'smartstore', ''], true);
        $tryCoupang = in_array($channel, ['all', 'coupang'], true);

        $res = null; $source = '';
        if ($tryNaver && ($creds['naver_id'] ?? '') !== '' && ($creds['naver_sec'] ?? '') !== '') {
            $r = self::naverShelfPositions($creds['naver_id'], $creds['naver_sec'], $keyword, $brand);
            if (!empty($r['ok'])) { $res = $r; $source = 'naver_shopping'; }
            elseif ($res === null) { $res = $r; $source = 'naver_shopping'; }
        }
        if ($res === null && $tryCoupang && ($creds['coupang']['access_key'] ?? '') !== '') {
            $r = self::coupangShelfPositions($creds['coupang'], $keyword, $brand);
            $res = $r; $source = 'coupang';
        }
        if ($res === null) return ['status' => 'pending', 'note' => '해당 채널 검색 자격증명 미설정 — 설정 후 라이브 순위 수집'];
        if (empty($res['ok'])) return ['status' => 'error', 'source' => $source, 'note' => (string)($res['note'] ?? 'harvest 실패')];

        $m = self::positionsToMetrics($res);
        // 순위 이월(트렌드 근거) + our_sos/comp_sos 갱신. harvest 로 값이 나온 경우에만 덮어쓴다(수동 입력 보존).
        $rankPrev = $row['rank_prev'] !== null ? (int)$row['rank_prev'] : null;
        $rankNow  = $row['rank_now'] !== null ? (int)$row['rank_now'] : null;
        if ($m['rank'] !== null) {
            if ($rankNow !== null && $m['rank'] !== $rankNow) $rankPrev = $rankNow;
            $rankNow = (int)$m['rank'];
        }
        $ourSos  = $m['ourSos'] !== null ? (float)$m['ourSos'] : ($row['our_sos'] !== null ? (float)$row['our_sos'] : null);
        $compSos = $m['compSos'] !== null ? (float)$m['compSos'] : ($row['comp_sos'] !== null ? (float)$row['comp_sos'] : null);
        $hnote = $m['rank'] === null ? "상위 {$res['total']}개 중 우리 노출 없음(brand='{$brand}')" : "상위 {$res['total']}개 중 우리 {$m['rank']}위·SoS {$ourSos}%";
        $now = self::now();
        $pdo->prepare("UPDATE digital_shelf_keyword SET our_sos=?, comp_sos=?, rank_now=?, rank_prev=?, harvest_source=?, harvest_status='ok', harvest_note=?, harvested_at=?, updated_at=? WHERE id=? AND tenant_id=?")
            ->execute([$ourSos, $compSos, $rankNow, $rankPrev, $source, mb_substr($hnote, 0, 300), $now, $now, (int)$row['id'], $t]);
        return ['status' => 'ok', 'source' => $source, 'id' => (int)$row['id'], 'rank' => $rankNow, 'ourSos' => $ourSos, 'compSos' => $compSos, 'total' => (int)$res['total']];
    }

    /** 테넌트 자격증명 번들 로드(어댑터 게이트). Naver=naver_shopping, Coupang=coupang(별칭 없음). */
    private static function loadTenantCreds(PDO $pdo, string $t): array
    {
        return [
            'naver_id'  => self::cred($pdo, $t, 'naver_shopping', 'client_id')     ?: (string)(getenv('NAVER_SHOP_CLIENT_ID') ?: ''),
            'naver_sec' => self::cred($pdo, $t, 'naver_shopping', 'client_secret') ?: (string)(getenv('NAVER_SHOP_CLIENT_SECRET') ?: ''),
            'coupang'   => [
                'access_key' => self::cred($pdo, $t, 'coupang', 'access_key'),
                'secret_key' => self::cred($pdo, $t, 'coupang', 'secret_key'),
                'vendor_id'  => self::cred($pdo, $t, 'coupang', 'vendor_id'),
            ],
        ];
    }

    /** 테넌트 전 키워드 순위 harvest 코어(HTTP 핸들러 + cron 공용, 중복 0). @return array 요약 */
    public static function harvestAllForTenant(string $t): array
    {
        if ($t === '') return ['ok' => false, 'error' => 'unauthorized'];
        $pdo = Db::pdo(); self::ensure($pdo);
        $creds = self::loadTenantCreds($pdo, $t);
        $anyCred = ($creds['naver_id'] !== '' && $creds['naver_sec'] !== '')
            || (($creds['coupang']['access_key'] ?? '') !== '' && ($creds['coupang']['secret_key'] ?? '') !== '' && ($creds['coupang']['vendor_id'] ?? '') !== '');
        if (!$anyCred) return ['ok' => true, 'pending' => true, 'harvested' => 0, 'note' => '검색 자격증명(Naver 쇼핑/쿠팡) 미설정 — 연동허브 등록 후 라이브 순위 자동 수집(현재는 수동 입력 사용)'];
        $st = $pdo->prepare("SELECT * FROM digital_shelf_keyword WHERE tenant_id=? ORDER BY id DESC LIMIT 200");
        $st->execute([$t]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $summary = ['ok' => true, 'harvested' => 0, 'no_brand' => 0, 'pending' => 0, 'errors' => 0, 'results' => []];
        foreach ($rows as $row) {
            try { $r = self::harvestOneRow($pdo, $t, $row, $creds); }
            catch (\Throwable $e) { $r = ['status' => 'error', 'note' => $e->getMessage()]; }
            $s = (string)($r['status'] ?? 'error');
            if ($s === 'ok') $summary['harvested']++;
            elseif ($s === 'no_brand') $summary['no_brand']++;
            elseif ($s === 'pending') $summary['pending']++;
            elseif ($s !== 'skip') $summary['errors']++;
            $summary['results'][] = ['id' => (int)($row['id'] ?? 0), 'keyword' => (string)($row['keyword'] ?? '')] + $r;
        }
        $summary['note'] = $summary['harvested'] . '개 키워드 라이브 순위 수집' . ($summary['no_brand'] > 0 ? " · {$summary['no_brand']}개는 brand 미설정으로 미산출" : '');
        return $summary;
    }

    /** 순위 harvest 보유 테넌트 목록 — cron 팬아웃용. */
    public static function tenantsWithShelfKeywords(): array
    {
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $rs = $pdo->query("SELECT DISTINCT tenant_id FROM digital_shelf_keyword WHERE tenant_id IS NOT NULL AND tenant_id<>''");
            return array_values(array_filter(array_map(fn($r) => (string)$r, $rs->fetchAll(PDO::FETCH_COLUMN))));
        } catch (\Throwable $e) { return []; }
    }

    /** POST /v429/shelf/harvest — 테넌트 전 키워드 라이브 순위/SoS 자동수집(자격 미설정 시 graceful pending). */
    public static function harvest(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        return self::json($res, self::harvestAllForTenant($t));
    }

    /** POST /v429/shelf/harvest/{id} — 단일 키워드 라이브 순위/SoS 수집. */
    public static function harvestOne(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $cur = $pdo->prepare("SELECT * FROM digital_shelf_keyword WHERE id=? AND tenant_id=? LIMIT 1");
        $cur->execute([$id, $t]);
        $row = $cur->fetch(PDO::FETCH_ASSOC);
        if (!$row) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        $creds = self::loadTenantCreds($pdo, $t);
        try { $r = self::harvestOneRow($pdo, $t, $row, $creds); }
        catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500); }
        return self::json($res, ['ok' => ($r['status'] ?? '') === 'ok'] + $r);
    }
}
