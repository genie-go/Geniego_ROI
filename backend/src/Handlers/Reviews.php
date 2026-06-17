<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * [228차 R1] 고객 리뷰/UGC 수집·집계 — 진짜 데이터 계층(기존 Influencer.php 범용 JSON 블롭 stopgap 대체).
 *   product_review(테넌트 격리·채널별·멱등) + 채널별 서버집계(평점/감성분포) + 부정키워드 추출.
 *   사진/영상 리뷰 media_json. 작성자는 PII 안전(sha256 해시).
 *   수집 경로: POST /v428/reviews/ingest(범용 push — 채널별 리뷰 API 수집기/웹훅 공용 적재 진입점).
 *   감성(R1)=평점 규칙기반(R2에서 ClaudeAI 텍스트 분석으로 고도화), 부정키워드(R1)=사전 매칭 빈도(R2 AI 추출).
 */
final class Reviews
{
    /** R1 부정 키워드 사전(뷰티/커머스) — 실 리뷰 텍스트에서 빈도 추출(하드코딩 카운트 아님). R2에서 AI 추출로 대체. */
    private const NEG_DICT = [
        '번짐', '뭉침', '트러블', '백탁', '따가움', '건조함', '밀림', '반품', '환불', '가품', '배송', '늦음',
        '실망', '냄새', '자극', '발진', '뜯김', '불량', '파손', '누수', '광고과장', '효과없', '비추',
    ];

    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        return $t !== '' && strtolower($t) !== 'unknown' ? $t : '';
    }

    private static function isDemo(string $t): bool
    {
        return $t === '' || $t === 'demo' || strncmp($t, 'demo', 4) === 0;
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTable(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS product_review (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(190), channel VARCHAR(190), external_review_id VARCHAR(190),
                    product_name VARCHAR(500), product_id VARCHAR(190), sku VARCHAR(190), category VARCHAR(120),
                    rating DOUBLE DEFAULT 0, title VARCHAR(500), body TEXT, media_json TEXT,
                    author_hash VARCHAR(80), sentiment VARCHAR(20), sentiment_src VARCHAR(10) DEFAULT 'rule',
                    ai_topics TEXT, lang VARCHAR(10), helpful INT DEFAULT 0,
                    reviewed_at VARCHAR(40), collected_at VARCHAR(40),
                    UNIQUE KEY uq_review (tenant_id, channel, external_review_id),
                    KEY idx_rev_tc (tenant_id, channel)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS product_review (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT, channel TEXT, external_review_id TEXT,
                    product_name TEXT, product_id TEXT, sku TEXT, category TEXT,
                    rating REAL DEFAULT 0, title TEXT, body TEXT, media_json TEXT,
                    author_hash TEXT, sentiment TEXT, sentiment_src TEXT DEFAULT 'rule',
                    ai_topics TEXT, lang TEXT, helpful INTEGER DEFAULT 0,
                    reviewed_at TEXT, collected_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_review ON product_review(tenant_id,channel,external_review_id)"); } catch (\Throwable $e) {}
            }
            // R2 컬럼 best-effort ALTER(기존 R1 테이블 보강) — 이미 존재 시 예외 무시(멱등).
            foreach (["sentiment_src " . ($isMy ? "VARCHAR(10) DEFAULT 'rule'" : "TEXT DEFAULT 'rule'"), 'ai_topics TEXT'] as $col) {
                try { $pdo->exec("ALTER TABLE product_review ADD COLUMN $col"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** 평점 규칙 기반 감성(R1) — body 텍스트 분석은 R2(ClaudeAI). */
    private static function sentimentFromRating(float $r): string
    {
        if ($r >= 4) return 'positive';
        if ($r <= 2) return 'negative';
        return 'neutral';
    }

    /**
     * POST /v428/reviews/ingest — 리뷰 일괄 멱등 적재(채널별 수집기/웹훅 공용).
     *   body: { channel, reviews:[{external_review_id,product_name,product_id,sku,category,rating,title,body,
     *           media:[{type,url}],author,sentiment?,lang?,helpful?,reviewed_at?}] }
     */
    public static function ingest(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => false, 'error' => 'tenant_required'], 403);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $channel = trim((string)($b['channel'] ?? ''));
        $reviews = is_array($b['reviews'] ?? null) ? $b['reviews'] : [];
        if ($channel === '' || !$reviews) return self::json($res, ['ok' => false, 'error' => 'channel and reviews[] required'], 422);

        $pdo = Db::pdo();
        $r = self::persistReviews($pdo, $tenant, $channel, $reviews);
        return self::json($res, ['ok' => true, 'channel' => $channel, 'saved' => $r['saved'], 'converted' => $r['converted']]);
    }

    /**
     * 리뷰 배열을 product_review 에 멱등 upsert + 주문ID 매칭 전환표기.
     *   ingest(웹훅/푸시)와 collect(채널 API 수집기)가 공용으로 사용. 반환 ['saved'=>n,'converted'=>n].
     */
    private static function persistReviews(\PDO $pdo, string $tenant, string $channel, array $reviews): array
    {
        self::ensureTable($pdo);
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $now = gmdate('c'); $saved = 0;
        $sql = $isMy
            ? "INSERT INTO product_review (tenant_id,channel,external_review_id,product_name,product_id,sku,category,rating,title,body,media_json,author_hash,sentiment,lang,helpful,reviewed_at,collected_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE product_name=VALUES(product_name),rating=VALUES(rating),title=VALUES(title),body=VALUES(body),media_json=VALUES(media_json),sentiment=VALUES(sentiment),helpful=VALUES(helpful),reviewed_at=VALUES(reviewed_at)"
            : "INSERT INTO product_review (tenant_id,channel,external_review_id,product_name,product_id,sku,category,rating,title,body,media_json,author_hash,sentiment,lang,helpful,reviewed_at,collected_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(tenant_id,channel,external_review_id) DO UPDATE SET product_name=excluded.product_name,rating=excluded.rating,title=excluded.title,body=excluded.body,media_json=excluded.media_json,sentiment=excluded.sentiment,helpful=excluded.helpful,reviewed_at=excluded.reviewed_at";
        $st = $pdo->prepare($sql);
        $matchedOrderIds = []; // [R3] 리뷰가 주문 식별자를 동반하면 review_request 전환 매칭에 사용.
        foreach ($reviews as $r) {
            if (!is_array($r)) continue;
            $ext = trim((string)($r['external_review_id'] ?? $r['id'] ?? ''));
            if ($ext === '') continue;
            $oid = trim((string)($r['order_id'] ?? ''));
            if ($oid !== '') $matchedOrderIds[] = $oid;
            $rating = (float)($r['rating'] ?? 0);
            $sentiment = (string)($r['sentiment'] ?? '') ?: self::sentimentFromRating($rating);
            $author = trim((string)($r['author'] ?? ''));
            $media = is_array($r['media'] ?? null) ? $r['media'] : [];
            try {
                $st->execute([
                    $tenant, $channel, $ext,
                    (string)($r['product_name'] ?? $r['product'] ?? ''), (string)($r['product_id'] ?? ''), (string)($r['sku'] ?? ''),
                    (string)($r['category'] ?? ''), $rating, (string)($r['title'] ?? ''), (string)($r['body'] ?? $r['text'] ?? ''),
                    json_encode($media, JSON_UNESCAPED_UNICODE),
                    $author !== '' ? hash('sha256', $author) : '', $sentiment, (string)($r['lang'] ?? ''),
                    (int)($r['helpful'] ?? 0), (string)($r['reviewed_at'] ?? $r['date'] ?? $now), $now,
                ]);
                $saved++;
            } catch (\Throwable $e) { /* skip bad row */ }
        }
        // [R3] 수집된 리뷰가 주문ID 동반 시, 해당 주문의 대기중 리뷰요청을 '전환'으로 표기(실 전환신호, 과대계상 없음).
        $converted = $matchedOrderIds ? self::markRequestsReviewed($pdo, $tenant, $channel, $matchedOrderIds) : 0;
        return ['saved' => $saved, 'converted' => $converted];
    }

    /** 채널 자격증명 로드(channel_credential, key_name=>복호화값). Catalog 패턴 재사용(쓰기 인증과 동일 소스). */
    private static function loadChannelCreds(\PDO $pdo, string $tenant, string $channel): array
    {
        try {
            $st = $pdo->prepare("SELECT key_name, key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND is_active=1");
            $st->execute([$tenant, $channel]);
            $creds = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $kn = (string)$r['key_name'];
                if ($kn === '' || isset($creds[$kn])) continue;
                $creds[$kn] = \Genie\Crypto::decrypt((string)$r['key_value']);
            }
            return $creds;
        } catch (\Throwable $e) { return []; }
    }

    /**
     * POST /v428/reviews/collect — [228차] 채널별 리뷰 API 실수집기 진입점.
     *   body: { channel }. 테넌트의 channel_credential(쓰기 인증과 동일 소스)로 채널 리뷰 API를 실호출,
     *   정규화 후 product_review 에 멱등 적재. 자격증명 미설정/파트너 게이트는 정직한 note 반환(가짜수집 없음).
     *   ChannelSync 의 검증된 채널 인증(OAuth/HMAC) 재사용.
     */
    public static function collect(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => false, 'error' => 'tenant_required'], 403);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $channel = strtolower(trim((string)($b['channel'] ?? '')));
        if ($channel === '') return self::json($res, ['ok' => false, 'error' => 'channel required'], 422);

        $pdo = Db::pdo();
        $creds = self::loadChannelCreds($pdo, $tenant, $channel);
        if (!$creds) return self::json($res, ['ok' => true, 'channel' => $channel, 'fetched' => 0, 'saved' => 0, 'mode' => 'no_credentials', 'note' => '채널 자격증명 미등록 — 연동허브에서 등록 후 수집하세요.']);

        $result = ChannelSync::collectReviews($channel, $creds, $tenant);
        $reviews = is_array($result['reviews'] ?? null) ? $result['reviews'] : [];
        $note = (string)($result['note'] ?? '');
        $mode = (string)($result['mode'] ?? (count($reviews) ? 'live' : 'empty'));
        $saved = 0; $converted = 0;
        if ($reviews) { $p = self::persistReviews($pdo, $tenant, $channel, $reviews); $saved = $p['saved']; $converted = $p['converted']; }
        return self::json($res, ['ok' => true, 'channel' => $channel, 'fetched' => count($reviews), 'saved' => $saved, 'converted' => $converted, 'mode' => $mode, 'note' => $note]);
    }

    /** [R3] 주문ID 일치하는 대기 리뷰요청을 reviewed 로 플립(전환 측정). 반환=전환 건수. */
    private static function markRequestsReviewed(\PDO $pdo, string $tenant, string $channel, array $orderIds): int
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $orderIds), fn($v) => $v !== '')));
        if (!$ids) return 0;
        try {
            self::ensureRequestTable($pdo);
            $now = gmdate('c'); $n = 0;
            $up = $pdo->prepare("UPDATE review_request SET status='reviewed', reviewed_at=? WHERE tenant_id=? AND channel=? AND order_id=? AND status='sent'");
            foreach ($ids as $oid) { $up->execute([$now, $tenant, $channel, $oid]); $n += $up->rowCount(); }
            return $n;
        } catch (\Throwable $e) { return 0; }
    }

    /** GET /v428/reviews?channel=&sentiment=&limit= — 리뷰 목록(프론트 ugcReviews 형태). */
    public static function list(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => true, 'reviews' => []]);
        $q = $req->getQueryParams();
        $where = "tenant_id=?"; $params = [$tenant];
        if (!empty($q['channel'])) { $where .= " AND channel=?"; $params[] = (string)$q['channel']; }
        if (!empty($q['sentiment'])) { $where .= " AND sentiment=?"; $params[] = (string)$q['sentiment']; }
        $limit = max(1, min(500, (int)($q['limit'] ?? 200)));
        try {
            $pdo = Db::pdo(); self::ensureTable($pdo);
            $st = $pdo->prepare("SELECT id,channel,product_name,category,rating,sentiment,body,media_json,helpful,reviewed_at FROM product_review WHERE $where ORDER BY reviewed_at DESC, id DESC LIMIT $limit");
            $st->execute($params);
            $out = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $out[] = [
                    'id' => (string)$r['id'], 'channel' => (string)$r['channel'], 'product' => (string)$r['product_name'],
                    'category' => (string)$r['category'], 'rating' => (float)$r['rating'], 'sentiment' => (string)$r['sentiment'],
                    'text' => (string)$r['body'], 'media' => json_decode((string)($r['media_json'] ?? '[]'), true) ?: [],
                    'helpful' => (int)$r['helpful'], 'date' => (string)$r['reviewed_at'],
                ];
            }
            return self::json($res, ['ok' => true, 'reviews' => $out]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'reviews' => []]); }
    }

    /** GET /v428/reviews/channel-stats — 채널별 서버집계(건수·평균평점·긍/부정 %). 하드코딩 아님. */
    public static function channelStats(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => true, 'stats' => []]);
        try {
            $pdo = Db::pdo(); self::ensureTable($pdo);
            $st = $pdo->prepare("SELECT channel,
                COUNT(*) total, AVG(rating) avg_rating,
                SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) pos,
                SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) neg
                FROM product_review WHERE tenant_id=? GROUP BY channel ORDER BY total DESC");
            $st->execute([$tenant]);
            $out = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $tot = max(1, (int)$r['total']);
                $out[] = [
                    'channel' => (string)$r['channel'], 'total' => (int)$r['total'],
                    'avg' => round((float)$r['avg_rating'], 1),
                    'pos' => (int)round((int)$r['pos'] * 100 / $tot),
                    'neg' => (int)round((int)$r['neg'] * 100 / $tot),
                ];
            }
            return self::json($res, ['ok' => true, 'stats' => $out]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'stats' => []]); }
    }

    /**
     * GET /v428/reviews/neg-keywords — 부정 리뷰 키워드 빈도.
     *   R2: AI 추출 키워드(ai_topics)가 있으면 우선 집계(실 텍스트 의미 기반), 없으면 R1 사전 매칭 폴백.
     */
    public static function negKeywords(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => true, 'keywords' => []]);
        try {
            $pdo = Db::pdo(); self::ensureTable($pdo);
            // R2 우선: AI 추출 키워드 집계(부정·중립 리뷰의 ai_topics.keywords).
            $aiCounts = [];
            try {
                $sa = $pdo->prepare("SELECT ai_topics FROM product_review WHERE tenant_id=? AND sentiment IN('negative','neutral') AND ai_topics IS NOT NULL AND ai_topics<>'' ORDER BY id DESC LIMIT 3000");
                $sa->execute([$tenant]);
                foreach ($sa->fetchAll(\PDO::FETCH_COLUMN) as $tj) {
                    $d = json_decode((string)$tj, true);
                    $kws = is_array($d['keywords'] ?? null) ? $d['keywords'] : [];
                    foreach ($kws as $kw) { $kw = trim((string)$kw); if ($kw !== '') $aiCounts[$kw] = ($aiCounts[$kw] ?? 0) + 1; }
                }
            } catch (\Throwable $e) {}
            if ($aiCounts) {
                arsort($aiCounts);
                $out = [];
                foreach ($aiCounts as $word => $c) { $out[] = ['word' => $word, 'count' => $c, 'change' => 0, 'src' => 'ai']; }
                return self::json($res, ['ok' => true, 'mode' => 'ai', 'keywords' => array_slice($out, 0, 15)]);
            }
            // R1 폴백: 사전 매칭 빈도.
            $st = $pdo->prepare("SELECT body FROM product_review WHERE tenant_id=? AND sentiment='negative' ORDER BY id DESC LIMIT 2000");
            $st->execute([$tenant]);
            $counts = array_fill_keys(self::NEG_DICT, 0);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) as $body) {
                $b = (string)$body;
                foreach (self::NEG_DICT as $kw) { if ($kw !== '' && mb_strpos($b, $kw) !== false) $counts[$kw]++; }
            }
            arsort($counts);
            $out = [];
            foreach ($counts as $word => $c) { if ($c > 0) $out[] = ['word' => $word, 'count' => $c, 'change' => 0, 'src' => 'dict']; }
            return self::json($res, ['ok' => true, 'mode' => 'dict', 'keywords' => array_slice($out, 0, 15)]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'keywords' => []]); }
    }

    /**
     * POST /v428/reviews/analyze — [R2] ClaudeAI 텍스트 분석 엔진.
     *   AI 미분석 리뷰(ai_topics 빈값)를 배치로 Claude 에 전달 → 리뷰별 감성(positive/neutral/negative) +
     *   부정/품질 키워드(최대 5) + 1줄 핵심 측면(aspect) 추출 → sentiment(AI 우선)·sentiment_src='ai'·ai_topics 갱신.
     *   AI 키 미설정 시 R1 규칙기반 유지(analyzed:0, mode:'rule'). 테넌트 격리·데모 차단·quota 게이트(callClaude).
     *   body(optional): { limit?:int(기본 60, 최대 200), channel? }
     */
    public static function analyze(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => false, 'error' => 'tenant_required'], 403);
        if (!ClaudeAI::aiKeyConfigured()) return self::json($res, ['ok' => true, 'analyzed' => 0, 'mode' => 'rule', 'detail' => 'AI key not configured — rule-based sentiment in effect']);

        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $limit = max(1, min(200, (int)($b['limit'] ?? 60)));
        $channel = trim((string)($b['channel'] ?? ''));

        $pdo = Db::pdo(); self::ensureTable($pdo);
        $where = "tenant_id=? AND (ai_topics IS NULL OR ai_topics='')"; $params = [$tenant];
        if ($channel !== '') { $where .= " AND channel=?"; $params[] = $channel; }
        $st = $pdo->prepare("SELECT id,rating,title,body FROM product_review WHERE $where ORDER BY id DESC LIMIT $limit");
        $st->execute($params);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        if (!$rows) return self::json($res, ['ok' => true, 'analyzed' => 0, 'mode' => 'ai', 'detail' => 'no pending reviews']);

        $upd = $pdo->prepare("UPDATE product_review SET sentiment=?, sentiment_src='ai', ai_topics=? WHERE id=? AND tenant_id=?");
        $sys = "당신은 커머스 고객 리뷰 분석 엔진입니다. 입력은 리뷰 배열(JSON)입니다. "
             . "각 리뷰에 대해 감성(sentiment: positive|neutral|negative), 부정·품질 관련 핵심 키워드(keywords: 한국어 명사구 최대 5개, 긍정 리뷰면 빈 배열), "
             . "한 줄 핵심 측면 요약(aspect: 30자 이내)을 판단하세요. "
             . "반드시 코드블록 없이 순수 JSON 배열만 출력: [{\"id\":<원본 id>,\"sentiment\":\"...\",\"keywords\":[...],\"aspect\":\"...\"}]. 다른 텍스트 금지.";
        $analyzed = 0;
        foreach (array_chunk($rows, 15) as $chunk) {
            $payload = [];
            foreach ($chunk as $r) {
                $payload[] = ['id' => (int)$r['id'], 'rating' => (float)$r['rating'],
                    'text' => mb_substr(trim((string)($r['title'] ?? '') . ' ' . (string)($r['body'] ?? '')), 0, 600)];
            }
            $text = ClaudeAI::complete($sys, json_encode($payload, JSON_UNESCAPED_UNICODE), 15, $tenant);
            if ($text === null) break; // quota/에러 → 남은 배치 중단(이미 처리분 보존)
            $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
            $arr = json_decode(trim((string)($clean ?? $text)), true);
            if (!is_array($arr)) continue;
            $byId = [];
            foreach ($chunk as $r) { $byId[(int)$r['id']] = $r; }
            foreach ($arr as $a) {
                if (!is_array($a)) continue;
                $id = (int)($a['id'] ?? 0);
                if (!isset($byId[$id])) continue;
                $sent = (string)($a['sentiment'] ?? '');
                if (!in_array($sent, ['positive', 'neutral', 'negative'], true)) {
                    $sent = self::sentimentFromRating((float)$byId[$id]['rating']);
                }
                $kws = [];
                foreach ((is_array($a['keywords'] ?? null) ? $a['keywords'] : []) as $kw) {
                    $kw = trim((string)$kw); if ($kw !== '') $kws[] = mb_substr($kw, 0, 40);
                }
                $topics = json_encode(['keywords' => array_slice($kws, 0, 5), 'aspect' => mb_substr(trim((string)($a['aspect'] ?? '')), 0, 60)], JSON_UNESCAPED_UNICODE);
                try { $upd->execute([$sent, $topics, $id, $tenant]); $analyzed++; } catch (\Throwable $e) {}
            }
        }
        return self::json($res, ['ok' => true, 'analyzed' => $analyzed, 'mode' => 'ai']);
    }

    /* ══════════════════ R3: 리뷰요청·활성화 캠페인 (이메일/SMS + 인센티브 쿠폰) ══════════════════ */

    private static function ensureRequestTable(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS review_request (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(190), channel VARCHAR(190), order_id VARCHAR(190),
                    product_name VARCHAR(500), contact_type VARCHAR(20), contact_hash VARCHAR(80),
                    incentive_code VARCHAR(60), incentive_label VARCHAR(190), review_url VARCHAR(700),
                    status VARCHAR(20) DEFAULT 'sent', email_status VARCHAR(30), sms_status VARCHAR(30),
                    sent_at VARCHAR(40), reviewed_at VARCHAR(40),
                    UNIQUE KEY uq_rr (tenant_id, channel, order_id),
                    KEY idx_rr_ts (tenant_id, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS review_request (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT, channel TEXT, order_id TEXT,
                    product_name TEXT, contact_type TEXT, contact_hash TEXT,
                    incentive_code TEXT, incentive_label TEXT, review_url TEXT,
                    status TEXT DEFAULT 'sent', email_status TEXT, sms_status TEXT,
                    sent_at TEXT, reviewed_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_rr ON review_request(tenant_id,channel,order_id)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    /**
     * POST /v428/reviews/request-campaign — [R3] 리뷰요청 캠페인 실행(구매고객 활성화).
     *   대상 주문별로 ① 인센티브 쿠폰코드 발급(옵션) ② 이메일(Mailer)·SMS(NaverSms) 실발송(미설정 시 정직한 미발송)
     *   ③ review_request 적재(주문당 멱등·연락처 sha256 PII안전). 전환은 ingest 의 주문ID 매칭으로 측정.
     *   body: { targets:[{order_id,channel,product,email?,phone?,review_url?}],
     *           incentive:{enabled:bool,label?,duration_days?}, message:{subject?,body?} }
     */
    public static function requestCampaign(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => false, 'error' => 'tenant_required'], 403);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $targets = is_array($b['targets'] ?? null) ? $b['targets'] : [];
        if (!$targets) return self::json($res, ['ok' => false, 'error' => 'targets[] required'], 422);
        $incentive = is_array($b['incentive'] ?? null) ? $b['incentive'] : [];
        $incEnabled = !empty($incentive['enabled']);
        $incLabel = trim((string)($incentive['label'] ?? '리뷰 작성 감사 쿠폰'));
        $msg = is_array($b['message'] ?? null) ? $b['message'] : [];
        $subject = trim((string)($msg['subject'] ?? '')) ?: '소중한 리뷰를 남겨주세요 ⭐';

        $pdo = Db::pdo(); self::ensureRequestTable($pdo);
        $smsConfigured = \Genie\NaverSms::isConfigured($pdo);
        $mailConfigured = \Genie\Mailer::isConfigured($pdo);
        $now = gmdate('c');
        $ins = $pdo->prepare("INSERT INTO review_request (tenant_id,channel,order_id,product_name,contact_type,contact_hash,incentive_code,incentive_label,review_url,status,email_status,sms_status,sent_at)
            VALUES (?,?,?,?,?,?,?,?,?, 'sent', ?, ?, ?)");

        $sent = 0; $emailed = 0; $smsed = 0; $skipped = 0; $results = [];
        foreach ($targets as $tg) {
            if (!is_array($tg)) { $skipped++; continue; }
            $orderId = trim((string)($tg['order_id'] ?? ''));
            $channel = trim((string)($tg['channel'] ?? ''));
            $product = trim((string)($tg['product'] ?? $tg['product_name'] ?? ''));
            $email = trim((string)($tg['email'] ?? ''));
            $phone = preg_replace('/[^0-9]/', '', (string)($tg['phone'] ?? ''));
            $reviewUrl = trim((string)($tg['review_url'] ?? ''));
            if ($orderId === '' || $channel === '') { $skipped++; continue; }
            // 멱등: 이미 요청한 주문이면 skip(중복 발송·중복 쿠폰 방지).
            try {
                $chk = $pdo->prepare("SELECT 1 FROM review_request WHERE tenant_id=? AND channel=? AND order_id=? LIMIT 1");
                $chk->execute([$tenant, $channel, $orderId]);
                if ($chk->fetchColumn()) { $skipped++; $results[] = ['order_id' => $orderId, 'status' => 'duplicate']; continue; }
            } catch (\Throwable $e) {}

            $code = $incEnabled ? ('RV-' . strtoupper(bin2hex(random_bytes(4)))) : '';
            $contactType = ($email !== '' ? 'email' : '') . ($phone !== '' ? ($email !== '' ? '+sms' : 'sms') : '');
            if ($contactType === '') $contactType = 'none';
            $contactHash = hash('sha256', ($email ?: '') . '|' . ($phone ?: ''));

            // 메시지 본문
            $incLine = $incEnabled && $code !== '' ? "리뷰를 남겨주시면 <b>{$incLabel}</b>(코드: <b>{$code}</b>)을 드립니다." : '';
            $smsIncLine = $incEnabled && $code !== '' ? " 리뷰 작성 시 {$incLabel} 쿠폰({$code}) 증정." : '';
            $bodyHtml = htmlspecialchars($product !== '' ? "{$product} 구매 감사합니다." : '구매해 주셔서 감사합니다.', ENT_QUOTES, 'UTF-8')
                      . "<br><br>고객님의 한 줄 리뷰가 다른 분께 큰 도움이 됩니다." . ($incLine ? "<br><br>{$incLine}" : '');
            $cta = $reviewUrl !== '' ? '리뷰 작성하기' : '';

            $emailStatus = 'skipped'; $smsStatus = 'skipped';
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                if ($mailConfigured) {
                    $html = \Genie\Mailer::wrapHtml($subject, $bodyHtml, $cta, $reviewUrl);
                    $r = \Genie\Mailer::send($email, $subject, $html, ['pdo' => $pdo, 'tenant' => $tenant]);
                    // 테넌트 캠페인 SMTP 미설정 시 플랫폼 트랜잭션 SMTP 로 폴백(리뷰요청이 실제 발송되도록).
                    if (empty($r['ok'])) { $r = \Genie\Mailer::send($email, $subject, $html, ['pdo' => $pdo]); }
                    $emailStatus = !empty($r['ok']) ? 'sent' : ('fail:' . substr((string)($r['mode'] ?? 'err'), 0, 20));
                    if (!empty($r['ok'])) $emailed++;
                } else { $emailStatus = 'unconfigured'; }
            }
            if ($phone !== '') {
                if ($smsConfigured) {
                    $smsText = ($product !== '' ? "[{$product}] " : '') . "구매 감사합니다. 리뷰를 남겨주세요." . $smsIncLine . ($reviewUrl !== '' ? " {$reviewUrl}" : '');
                    $r = \Genie\NaverSms::sendPlatform($pdo, $phone, mb_substr($smsText, 0, 300));
                    $smsStatus = !empty($r['ok']) ? 'sent' : ('fail:' . substr((string)($r['mode'] ?? 'err'), 0, 20));
                    if (!empty($r['ok'])) $smsed++;
                } else { $smsStatus = 'unconfigured'; }
            }

            try {
                $ins->execute([$tenant, $channel, $orderId, $product, $contactType, $contactHash, $code, $incEnabled ? $incLabel : '', $reviewUrl, $emailStatus, $smsStatus, $now]);
                $sent++;
                $results[] = ['order_id' => $orderId, 'status' => 'sent', 'email' => $emailStatus, 'sms' => $smsStatus, 'incentive_code' => $code];
            } catch (\Throwable $e) { $skipped++; }
        }
        return self::json($res, [
            'ok' => true, 'sent' => $sent, 'emailed' => $emailed, 'smsed' => $smsed, 'skipped' => $skipped,
            'mail_configured' => $mailConfigured, 'sms_configured' => $smsConfigured, 'results' => $results,
        ]);
    }

    /** GET /v428/reviews/requests — [R3] 리뷰요청 목록 + 전환 퍼널(발송/전환/전환율). */
    public static function requests(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => true, 'requests' => [], 'funnel' => ['sent' => 0, 'reviewed' => 0, 'rate' => 0]]);
        try {
            $pdo = Db::pdo(); self::ensureRequestTable($pdo);
            $q = $req->getQueryParams();
            $limit = max(1, min(500, (int)($q['limit'] ?? 200)));
            $st = $pdo->prepare("SELECT id,channel,order_id,product_name,contact_type,incentive_code,incentive_label,status,email_status,sms_status,sent_at,reviewed_at
                FROM review_request WHERE tenant_id=? ORDER BY id DESC LIMIT $limit");
            $st->execute([$tenant]);
            $out = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $out[] = [
                    'id' => (string)$r['id'], 'channel' => (string)$r['channel'], 'order_id' => (string)$r['order_id'],
                    'product' => (string)$r['product_name'], 'contact' => (string)$r['contact_type'],
                    'incentive' => (string)$r['incentive_code'], 'incentiveLabel' => (string)$r['incentive_label'],
                    'status' => (string)$r['status'], 'email' => (string)$r['email_status'], 'sms' => (string)$r['sms_status'],
                    'sentAt' => (string)$r['sent_at'], 'reviewedAt' => (string)$r['reviewed_at'],
                ];
            }
            $cnt = $pdo->prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='reviewed' THEN 1 ELSE 0 END) reviewed FROM review_request WHERE tenant_id=?");
            $cnt->execute([$tenant]);
            $row = $cnt->fetch(\PDO::FETCH_ASSOC) ?: [];
            $totReq = (int)($row['total'] ?? 0); $rev = (int)($row['reviewed'] ?? 0);
            return self::json($res, ['ok' => true, 'requests' => $out, 'funnel' => [
                'sent' => $totReq, 'reviewed' => $rev, 'rate' => $totReq > 0 ? round($rev * 100 / $totReq, 1) : 0,
            ]]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'requests' => [], 'funnel' => ['sent' => 0, 'reviewed' => 0, 'rate' => 0]]); }
    }

    /* ══════════════════ R4: 리뷰 노출·신디케이션 (임베드 위젯 + 신뢰배지) ══════════════════ */

    private static function ensureWidgetTable(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS review_widget (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(190) UNIQUE, public_token VARCHAR(80) UNIQUE,
                    theme VARCHAR(20) DEFAULT 'light', created_at VARCHAR(40)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS review_widget (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT UNIQUE, public_token TEXT UNIQUE, theme TEXT DEFAULT 'light', created_at TEXT)");
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** 위젯 공개 토큰 조회/발급(테넌트당 1개·멱등). */
    private static function widgetTokenFor(\PDO $pdo, string $tenant, bool $rotate = false): string
    {
        self::ensureWidgetTable($pdo);
        try {
            if (!$rotate) {
                $st = $pdo->prepare("SELECT public_token FROM review_widget WHERE tenant_id=? LIMIT 1");
                $st->execute([$tenant]);
                $tok = (string)($st->fetchColumn() ?: '');
                if ($tok !== '') return $tok;
            }
            $tok = 'rw_' . bin2hex(random_bytes(12));
            $now = gmdate('c');
            $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
            $sql = $isMy
                ? "INSERT INTO review_widget (tenant_id,public_token,created_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE public_token=VALUES(public_token)"
                : "INSERT INTO review_widget (tenant_id,public_token,created_at) VALUES (?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET public_token=excluded.public_token";
            $pdo->prepare($sql)->execute([$tenant, $tok, $now]);
            return $tok;
        } catch (\Throwable $e) { return ''; }
    }

    private static function tenantFromWidgetToken(\PDO $pdo, string $token): string
    {
        if ($token === '' || strncmp($token, 'rw_', 3) !== 0) return '';
        try {
            self::ensureWidgetTable($pdo);
            $st = $pdo->prepare("SELECT tenant_id FROM review_widget WHERE public_token=? LIMIT 1");
            $st->execute([$token]);
            return (string)($st->fetchColumn() ?: '');
        } catch (\Throwable $e) { return ''; }
    }

    /** 위젯용 집계(평균/건수/별점분포) + 최근 리뷰 — token→tenant 격리. */
    private static function widgetPayload(\PDO $pdo, string $tenant, string $product, int $limit): array
    {
        self::ensureTable($pdo);
        $where = "tenant_id=?"; $params = [$tenant];
        if ($product !== '') { $where .= " AND product_name=?"; $params[] = $product; }
        $agg = ['count' => 0, 'avg' => 0.0, 'dist' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]];
        $reviews = [];
        try {
            $a = $pdo->prepare("SELECT COUNT(*) c, AVG(rating) a FROM product_review WHERE $where");
            $a->execute($params);
            $r = $a->fetch(\PDO::FETCH_ASSOC) ?: [];
            $agg['count'] = (int)($r['c'] ?? 0); $agg['avg'] = round((float)($r['a'] ?? 0), 1);
            $d = $pdo->prepare("SELECT ROUND(rating) rr, COUNT(*) c FROM product_review WHERE $where GROUP BY ROUND(rating)");
            $d->execute($params);
            foreach ($d->fetchAll(\PDO::FETCH_ASSOC) as $row) { $k = max(1, min(5, (int)$row['rr'])); $agg['dist'][$k] = (int)$row['c']; }
            $ls = $pdo->prepare("SELECT product_name,rating,title,body,sentiment,reviewed_at FROM product_review WHERE $where ORDER BY (rating>=4) DESC, helpful DESC, id DESC LIMIT $limit");
            $ls->execute($params);
            foreach ($ls->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $reviews[] = [
                    'product' => (string)$row['product_name'], 'rating' => (float)$row['rating'],
                    'title' => (string)$row['title'], 'text' => (string)$row['body'],
                    'sentiment' => (string)$row['sentiment'], 'date' => substr((string)$row['reviewed_at'], 0, 10),
                ];
            }
        } catch (\Throwable $e) {}
        return ['agg' => $agg, 'reviews' => $reviews];
    }

    /** GET /v428/reviews/widget-config — [R4·authed] 테넌트 위젯 공개토큰 + 임베드 코드. ?rotate=1 로 토큰 회전. */
    public static function widgetConfig(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => false, 'error' => 'tenant_required'], 403);
        $q = $req->getQueryParams();
        $rotate = !empty($q['rotate']);
        $pdo = Db::pdo();
        $tok = self::widgetTokenFor($pdo, $tenant, $rotate);
        if ($tok === '') return self::json($res, ['ok' => false, 'error' => 'token_failed'], 500);
        // 외부 임베드 절대경로는 /api 프리픽스 사용(nginx 가 /api/* 만 백엔드로 프록시, 베어 /v428 미프록시).
        $base = self::publicBase($req) . '/api';
        $iframe = "<iframe src=\"{$base}/v428/reviews/widget/view?token={$tok}\" width=\"100%\" height=\"520\" style=\"border:0;max-width:680px\" loading=\"lazy\" title=\"Customer Reviews\"></iframe>";
        $badge  = "<a href=\"{$base}/v428/reviews/widget/view?token={$tok}\" target=\"_blank\" rel=\"noopener\"><img src=\"{$base}/v428/reviews/badge?token={$tok}\" alt=\"Customer Reviews\" height=\"28\"></a>";
        return self::json($res, [
            'ok' => true, 'token' => $tok,
            'viewUrl'  => "{$base}/v428/reviews/widget/view?token={$tok}",
            'dataUrl'  => "{$base}/v428/reviews/widget/data?token={$tok}",
            'badgeUrl' => "{$base}/v428/reviews/badge?token={$tok}",
            'embedIframe' => $iframe, 'embedBadge' => $badge,
        ]);
    }

    /** 요청 호스트 기반 공개 베이스 URL(임베드 절대경로용). */
    private static function publicBase(Request $req): string
    {
        $uri = $req->getUri();
        $host = $uri->getHost() ?: 'roi.genie-go.com';
        $scheme = $uri->getScheme() ?: 'https';
        // 내부 localhost 호출은 운영 도메인으로 정규화(임베드 코드가 외부에서 동작하도록).
        if ($host === 'localhost' || $host === '127.0.0.1') { $host = 'roi.genie-go.com'; $scheme = 'https'; }
        return $scheme . '://' . $host;
    }

    /** GET /v428/reviews/widget/data — [R4·public] token 기반 위젯 데이터(JSON). 외부 임베드용 CORS *. */
    public static function widgetData(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $q = $req->getQueryParams();
        $tenant = self::tenantFromWidgetToken($pdo, (string)($q['token'] ?? ''));
        $out = ['ok' => true, 'agg' => ['count' => 0, 'avg' => 0, 'dist' => []], 'reviews' => []];
        if ($tenant !== '') {
            $limit = max(1, min(50, (int)($q['limit'] ?? 12)));
            $out = ['ok' => true] + self::widgetPayload($pdo, $tenant, trim((string)($q['product'] ?? '')), $limit);
        }
        $res->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json')->withHeader('Access-Control-Allow-Origin', '*')->withHeader('Cache-Control', 'public, max-age=300');
    }

    /** GET /v428/reviews/widget/view — [R4·public] 자체완결 임베드 HTML(iframe 삽입용, 서버 렌더·XSS 이스케이프). */
    public static function widgetView(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $q = $req->getQueryParams();
        $tenant = self::tenantFromWidgetToken($pdo, (string)($q['token'] ?? ''));
        $dark = ((string)($q['theme'] ?? '') === 'dark');
        $esc = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
        $bg = $dark ? '#0f172a' : '#ffffff'; $fg = $dark ? '#e2e8f0' : '#1f2937'; $sub = $dark ? '#94a3b8' : '#6b7280'; $card = $dark ? '#1e293b' : '#f8fafc'; $bd = $dark ? '#334155' : '#e5e7eb';
        if ($tenant === '') {
            $html = "<!doctype html><html><body style=\"font-family:sans-serif;color:{$sub};padding:20px\">위젯 토큰이 유효하지 않습니다.</body></html>";
            $res->getBody()->write($html);
            return $res->withHeader('Content-Type', 'text/html; charset=utf-8');
        }
        $limit = max(1, min(50, (int)($q['limit'] ?? 10)));
        $p = self::widgetPayload($pdo, $tenant, trim((string)($q['product'] ?? '')), $limit);
        $agg = $p['agg'];
        $stars = fn($n) => str_repeat('★', max(0, min(5, (int)round($n)))) . str_repeat('☆', 5 - max(0, min(5, (int)round($n))));
        $items = '';
        foreach ($p['reviews'] as $rv) {
            $col = $rv['sentiment'] === 'negative' ? '#ef4444' : ($rv['sentiment'] === 'positive' ? '#22c55e' : '#f59e0b');
            $items .= "<div style=\"background:{$card};border:1px solid {$bd};border-radius:10px;padding:12px 14px;margin-bottom:10px\">"
                . "<div style=\"display:flex;justify-content:space-between;align-items:center;gap:8px\">"
                . "<span style=\"color:#fbbf24;font-size:13px\">{$stars($rv['rating'])}</span>"
                . "<span style=\"font-size:11px;color:{$sub}\">" . $esc($rv['date']) . "</span></div>"
                . ($rv['product'] !== '' ? "<div style=\"font-size:11px;color:{$sub};margin-top:3px\">" . $esc($rv['product']) . "</div>" : '')
                . ($rv['title'] !== '' ? "<div style=\"font-weight:700;font-size:13px;margin-top:5px;color:{$fg}\">" . $esc($rv['title']) . "</div>" : '')
                . "<div style=\"font-size:12.5px;line-height:1.55;margin-top:4px;color:{$fg}\">" . $esc(mb_substr($rv['text'], 0, 400)) . "</div>"
                . "<span style=\"display:inline-block;margin-top:6px;width:6px;height:6px;border-radius:50%;background:{$col}\"></span>"
                . "</div>";
        }
        if ($items === '') $items = "<div style=\"color:{$sub};font-size:13px;padding:14px 0\">아직 등록된 리뷰가 없습니다.</div>";
        $avg = number_format((float)$agg['avg'], 1);
        $html = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            . "<title>고객 리뷰</title></head><body style=\"margin:0;background:{$bg};font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;padding:14px\">"
            . "<div style=\"max-width:660px;margin:0 auto\">"
            . "<div style=\"display:flex;align-items:center;gap:12px;padding:6px 2px 14px;border-bottom:1px solid {$bd};margin-bottom:14px\">"
            . "<div style=\"font-size:30px;font-weight:900;color:{$fg}\">{$avg}</div>"
            . "<div><div style=\"color:#fbbf24;font-size:16px\">{$stars($agg['avg'])}</div>"
            . "<div style=\"font-size:12px;color:{$sub}\">" . (int)$agg['count'] . "개 리뷰</div></div></div>"
            . $items
            . "<div style=\"text-align:center;font-size:10px;color:{$sub};margin-top:8px\">powered by Geniego-ROI</div>"
            . "</div></body></html>";
        $res->getBody()->write($html);
        return $res->withHeader('Content-Type', 'text/html; charset=utf-8')->withHeader('Cache-Control', 'public, max-age=300');
    }

    /** GET /v428/reviews/badge — [R4·public] 신뢰 배지 SVG(평균 별점+건수). <img> 임베드용. */
    public static function badge(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $q = $req->getQueryParams();
        $tenant = self::tenantFromWidgetToken($pdo, (string)($q['token'] ?? ''));
        $avg = '0.0'; $count = 0;
        if ($tenant !== '') {
            $p = self::widgetPayload($pdo, $tenant, trim((string)($q['product'] ?? '')), 1);
            $avg = number_format((float)$p['agg']['avg'], 1); $count = (int)$p['agg']['count'];
        }
        $label = '리뷰'; $val = "★ {$avg} ({$count})";
        $lw = 46; $vw = 9 * mb_strlen($val) + 22; $w = $lw + $vw;
        $svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{$w}\" height=\"28\" role=\"img\" aria-label=\"{$label}: {$val}\">"
            . "<rect width=\"{$lw}\" height=\"28\" fill=\"#374151\" rx=\"4\"/>"
            . "<rect x=\"{$lw}\" width=\"{$vw}\" height=\"28\" fill=\"#f59e0b\" rx=\"4\"/>"
            . "<rect x=\"{$lw}\" width=\"6\" height=\"28\" fill=\"#f59e0b\"/>"
            . "<g font-family=\"-apple-system,'Apple SD Gothic Neo',sans-serif\" font-size=\"12\" font-weight=\"700\">"
            . "<text x=\"8\" y=\"19\" fill=\"#fff\">{$label}</text>"
            . "<text x=\"" . ($lw + 9) . "\" y=\"19\" fill=\"#fff\">{$val}</text></g></svg>";
        $res->getBody()->write($svg);
        return $res->withHeader('Content-Type', 'image/svg+xml; charset=utf-8')->withHeader('Cache-Control', 'public, max-age=300')->withHeader('Access-Control-Allow-Origin', '*');
    }

    /** DELETE /v428/reviews/{id} — 테넌트 격리 삭제. */
    public static function remove(Request $req, Response $res, array $args): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => false, 'error' => 'tenant_required'], 403);
        try {
            $pdo = Db::pdo();
            $pdo->prepare("DELETE FROM product_review WHERE id=? AND tenant_id=?")->execute([(int)($args['id'] ?? 0), $tenant]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500); }
    }
}
