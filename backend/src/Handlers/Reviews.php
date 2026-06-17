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
                    author_hash VARCHAR(80), sentiment VARCHAR(20), lang VARCHAR(10), helpful INT DEFAULT 0,
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
                    author_hash TEXT, sentiment TEXT, lang TEXT, helpful INTEGER DEFAULT 0,
                    reviewed_at TEXT, collected_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_review ON product_review(tenant_id,channel,external_review_id)"); } catch (\Throwable $e) {}
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

    /** GET /v428/reviews/neg-keywords — 부정 리뷰 본문에서 사전 매칭 빈도 추출(실 데이터 기반, R2 AI 대체). */
    public static function negKeywords(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === '' || self::isDemo($tenant)) return self::json($res, ['ok' => true, 'keywords' => []]);
        try {
            $pdo = Db::pdo(); self::ensureTable($pdo);
            $st = $pdo->prepare("SELECT body FROM product_review WHERE tenant_id=? AND sentiment='negative' ORDER BY id DESC LIMIT 2000");
            $st->execute([$tenant]);
            $counts = array_fill_keys(self::NEG_DICT, 0);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) as $body) {
                $b = (string)$body;
                foreach (self::NEG_DICT as $kw) { if ($kw !== '' && mb_strpos($b, $kw) !== false) $counts[$kw]++; }
            }
            arsort($counts);
            $out = [];
            foreach ($counts as $word => $c) { if ($c > 0) $out[] = ['word' => $word, 'count' => $c, 'change' => 0]; }
            return self::json($res, ['ok' => true, 'keywords' => array_slice($out, 0, 15)]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'keywords' => []]); }
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
