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
        $pdo->prepare("INSERT INTO digital_shelf_keyword (tenant_id,keyword,channel,our_sos,comp_sos,rank_now,rank_prev,note,status,created_at,updated_at)
                       VALUES (?,?,?,?,?,?,?,?,'tracking',?,?)")
            ->execute([$t, $kw, $ch, $ourSos, $compSos, $rank, null, $note, $now, $now]);
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
        $pdo->prepare("UPDATE digital_shelf_keyword SET our_sos=?, comp_sos=?, rank_now=?, rank_prev=?, note=?, status=?, updated_at=? WHERE id=? AND tenant_id=?")
            ->execute([$ourSos, $compSos, $rankNow, $rankPrev, $note, $status, self::now(), $id, $t]);
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
}
