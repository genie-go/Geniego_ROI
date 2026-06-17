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

        $pdo = Db::pdo(); self::ensureTable($pdo);
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
        foreach ($reviews as $r) {
            if (!is_array($r)) continue;
            $ext = trim((string)($r['external_review_id'] ?? $r['id'] ?? ''));
            if ($ext === '') continue;
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
        return self::json($res, ['ok' => true, 'channel' => $channel, 'saved' => $saved]);
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
