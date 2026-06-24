<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * [현 차수] H4: InfluencerUGC 라이브 데이터 백엔드 — /v423/influencer/*.
 *   프론트(InfluencerUGC.useInfluencerDataSync)는 creators/ugc-reviews/channel-stats/neg-keywords
 *   4개 GET 으로 동기화하나 백엔드 라우트가 전무하여 404 → 시드/빈 상태만 표시되던 결함.
 *   테넌트 격리 영속 store(JSON payload) 신설. 세션 self-auth(requirePro)+authedTenant 격리.
 *   GET = 저장된 배열 그대로 반환(프론트는 Array 기대), POST = 해당 kind 전체 교체 저장(autosave).
 *
 * ★[228차 R5] 이 store(influencer_store JSON 블롭)는 이제 **인플루언서 마케팅(InfluencerUGC)** 전용이다.
 *   과거 제품 리뷰 페이지(ReviewsUGC)도 이 블롭의 ugc/channel_stats/neg_keywords kind 를 공유해
 *   두 기능의 데이터가 한 블롭에 섞였으나, R1~R4 에서 제품 리뷰는 전용 테이블(product_review,
 *   Reviews.php, /v428/reviews/*)+ 전용 프론트 상태(GlobalData reviewItems 등)로 완전 분리됐다.
 *   따라서 본 핸들러를 리뷰 데이터 저장소로 재사용하지 말 것(교차 오염 회귀 방지).
 */
class Influencer
{
    private static function pdo(): \PDO { return Db::pdo(); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function ensure(): void
    {
        $pdo  = self::pdo();
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($isMy) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS influencer_store (
                tenant_id VARCHAR(100) NOT NULL,
                kind VARCHAR(40) NOT NULL,
                payload_json LONGTEXT,
                updated_at VARCHAR(32),
                PRIMARY KEY (tenant_id, kind)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS influencer_store (
                tenant_id TEXT NOT NULL, kind TEXT NOT NULL,
                payload_json TEXT, updated_at TEXT,
                PRIMARY KEY (tenant_id, kind))");
        }
    }

    private static function json(Response $res, $data, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json');
    }

    private static function read(Request $req, Response $res, string $kind): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensure();
        $st = self::pdo()->prepare("SELECT payload_json FROM influencer_store WHERE tenant_id=? AND kind=?");
        $st->execute([self::tenant($req), $kind]);
        $row = $st->fetchColumn();
        $arr = $row ? json_decode((string)$row, true) : [];
        return self::json($res, is_array($arr) ? $arr : []); // 프론트는 배열을 직접 기대
    }

    private static function write(Request $req, Response $res, string $kind): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensure();
        $body  = (array)($req->getParsedBody() ?? []);
        $items = $body['items'] ?? ($body['list'] ?? $body);
        if (!is_array($items)) $items = [];
        $pdo = self::pdo(); $t = self::tenant($req); $now = gmdate('c');
        $payload = json_encode(array_values($items), JSON_UNESCAPED_UNICODE);
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO influencer_store (tenant_id,kind,payload_json,updated_at) VALUES (?,?,?,?)
               ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json), updated_at=VALUES(updated_at)"
            : "INSERT INTO influencer_store (tenant_id,kind,payload_json,updated_at) VALUES (?,?,?,?)
               ON CONFLICT(tenant_id,kind) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at";
        $pdo->prepare($sql)->execute([$t, $kind, $payload, $now]);
        return self::json($res, ['ok' => true, 'count' => count($items)]);
    }

    // ── GET (프론트 useInfluencerDataSync) ────────────────────────────────────
    public static function creators(Request $req, Response $res): Response     { return self::read($req, $res, 'creators'); }
    public static function ugcReviews(Request $req, Response $res): Response    { return self::read($req, $res, 'ugc'); }
    public static function channelStats(Request $req, Response $res): Response  { return self::read($req, $res, 'channel_stats'); }
    public static function negKeywords(Request $req, Response $res): Response   { return self::read($req, $res, 'neg_keywords'); }

    // ── POST (프론트 autosave) ────────────────────────────────────────────────
    public static function saveCreators(Request $req, Response $res): Response     { return self::write($req, $res, 'creators'); }
    public static function saveUgcReviews(Request $req, Response $res): Response    { return self::write($req, $res, 'ugc'); }
    public static function saveChannelStats(Request $req, Response $res): Response  { return self::write($req, $res, 'channel_stats'); }
    public static function saveNegKeywords(Request $req, Response $res): Response   { return self::write($req, $res, 'neg_keywords'); }

    /* [240차] 인플루언서 비용 P&L 집계 — creators 의 실 지급액(settle.paid) 합산(tenant격리). 미등록 시 0(목데이터 0).
     *   P&L operatingProfit/netProfit 의 influencerCost 항목 소스(유일 누락 P&L 항목 보강). 운영=실 정산만,
     *   데모는 프론트가 데모 creators(격리)로 직접 합산(_isDemo 가드)하므로 본 엔드포인트는 운영 실데이터 경로.
     *   committed(계약금액)은 참고치. by_period 는 정산일/캠페인월 귀속(기간 P&L 정합). */
    public static function costSummary(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensure();
        $st = self::pdo()->prepare("SELECT payload_json FROM influencer_store WHERE tenant_id=? AND kind='creators'");
        $st->execute([self::tenant($req)]);
        $row = $st->fetchColumn();
        $creators = $row ? json_decode((string)$row, true) : [];
        if (!is_array($creators)) $creators = [];
        $paid = 0.0; $committed = 0.0; $count = 0; $byPeriod = [];
        foreach ($creators as $c) {
            if (!is_array($c)) continue;
            $settle   = (array)($c['settle'] ?? []);
            $contract = (array)($c['contract'] ?? []);
            $p   = (float)($settle['paid'] ?? 0);                                              // 실 지급액(realized)
            $amt = (float)($contract['amount'] ?? $contract['fee'] ?? $contract['cost'] ?? 0); // 계약금액(committed)
            if ($p > 0 || $amt > 0) $count++;
            $paid += $p; $committed += $amt;
            $dt = (string)($c['campaignMonth'] ?? $settle['resolvedAt'] ?? $c['date'] ?? '');
            if ($p > 0 && strlen($dt) >= 7) { $pm = substr($dt, 0, 7); $byPeriod[$pm] = ($byPeriod[$pm] ?? 0) + $p; }
        }
        return self::json($res, ['ok' => true, 'influencer_cost' => round($paid), 'committed' => round($committed), 'creator_count' => $count, 'by_period' => $byPeriod]);
    }
}
