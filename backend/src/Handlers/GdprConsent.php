<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * GDPR / PIPA 개인정보 동의 관리
 *
 * Routes:
 *   POST /api/gdpr/consent          — 동의 저장
 *   GET  /api/gdpr/consent          — 내 동의 조회
 *   DELETE /api/gdpr/consent        — 동의 철회
 *   GET  /api/gdpr/stats            — 플랫폼 동의 통계
 */
final class GdprConsent
{
    private static function ensureTables(): void
    {
        // 204차 P1: SQLite 전용 DDL(INTEGER PK AUTOINCREMENT)이 MySQL 주backend 에서 throw → 전 /api/gdpr/* 500.
        //   WhatsApp/CRM/Pixel/Kakao 패턴과 동일하게 드라이버 분기.
        $pdo = Db::pdo();
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS gdpr_consents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(64),
                session_id VARCHAR(64),
                ip VARCHAR(64),
                user_agent TEXT,
                necessary TINYINT DEFAULT 1,
                analytics TINYINT DEFAULT 0,
                marketing TINYINT DEFAULT 0,
                personalization TINYINT DEFAULT 0,
                consented_at VARCHAR(32),
                withdrawn_at VARCHAR(32),
                is_active TINYINT DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS gdpr_consents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                session_id TEXT,
                ip TEXT,
                user_agent TEXT,
                necessary INTEGER DEFAULT 1,
                analytics INTEGER DEFAULT 0,
                marketing INTEGER DEFAULT 0,
                personalization INTEGER DEFAULT 0,
                consented_at TEXT,
                withdrawn_at TEXT,
                is_active INTEGER DEFAULT 1
            )");
        }
    }

    /**
     * 익명 방문자 안정 식별자.
     * 209차 P2: 기존 md5(User-Agent + 날짜)는 같은 브라우저·같은 날짜의 서로 다른 익명
     *   방문자가 동일 session_id 를 공유 → 동의기록 상호 덮어쓰기(저장 시 is_active=0)·오조회.
     *   클라가 발급한 안정 consent_id(쿠키 영속)를 우선 사용해 방문자별 격리. 미발급 구버전
     *   클라는 레거시 UA+날짜 해시로 폴백(하위호환).
     */
    private static function sessionId(Request $req): string
    {
        $cid  = '';
        $body = (array)($req->getParsedBody() ?? []);
        if (!empty($body['consent_id'])) {
            $cid = (string)$body['consent_id'];
        }
        if ($cid === '') {
            $cid = (string)($req->getQueryParams()['cid'] ?? '');
        }
        if ($cid === '') {
            $cid = $req->getHeaderLine('X-Consent-Id');
        }
        $cid = preg_replace('/[^a-zA-Z0-9_-]/', '', $cid);
        if ($cid !== '') {
            return substr($cid, 0, 40);
        }
        // 레거시 폴백(consent_id 미발급 구버전 클라)
        return substr(md5($req->getHeaderLine('User-Agent') . gmdate('Y-m-d')), 0, 16);
    }

    // POST /api/gdpr/consent
    public static function save(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo  = Db::pdo();
        $body = (array)($req->getParsedBody() ?? []);
        $now  = gmdate('c');

        $consents = (array)($body['consents'] ?? []);
        $userId   = null;
        $auth     = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token') {
            try {
                $s = $pdo->prepare('SELECT user_id FROM user_session WHERE token=? LIMIT 1');
                $s->execute([$m[1]]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                $userId = $r ? (string)$r['user_id'] : null;
            } catch (\Throwable) {}
        }

        $sessId = self::sessionId($req);

        // 기존 동의 비활성화
        $pdo->prepare("UPDATE gdpr_consents SET is_active=0 WHERE session_id=? OR user_id=?")
            ->execute([$sessId, $userId]);

        $pdo->prepare("INSERT INTO gdpr_consents(user_id,session_id,ip,user_agent,necessary,analytics,marketing,personalization,consented_at,is_active) VALUES(?,?,?,?,?,?,?,?,?,1)")
            ->execute([
                $userId, $sessId,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $req->getHeaderLine('User-Agent'),
                1,
                (int)($consents['analytics'] ?? false),
                (int)($consents['marketing'] ?? false),
                (int)($consents['personalization'] ?? false),
                $now,
            ]);

        return TemplateResponder::respond($res, ['ok' => true, 'consented_at' => $now]);
    }

    // GET /api/gdpr/consent
    public static function get(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $sessId = self::sessionId($req);

        $stmt = $pdo->prepare("SELECT * FROM gdpr_consents WHERE (session_id=?) AND is_active=1 ORDER BY consented_at DESC LIMIT 1");
        $stmt->execute([$sessId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return TemplateResponder::respond($res, ['ok' => true, 'consent' => $row ?: null]);
    }

    // DELETE /api/gdpr/consent
    public static function withdraw(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $sessId = self::sessionId($req);
        $now    = gmdate('c');

        $pdo->prepare("UPDATE gdpr_consents SET is_active=0, withdrawn_at=? WHERE session_id=? AND is_active=1")
            ->execute([$now, $sessId]);

        return TemplateResponder::respond($res, ['ok' => true, 'withdrawn_at' => $now]);
    }

    // GET /api/gdpr/stats
    public static function stats(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = Db::pdo();

        // 209차 P2: 가짜 폴백(?: 3842 등) 제거 — COUNT(*)는 빈 테이블서 '0'(falsy)을 반환해
        //   `?:`가 오히려 날조 통계를 노출하던 운영 오염. 실집계만(빈=0).
        $total     = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=1")->fetchColumn();
        $analytics = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=1 AND analytics=1")->fetchColumn();
        $marketing = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=1 AND marketing=1")->fetchColumn();
        $withdrawn = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=0 AND withdrawn_at IS NOT NULL")->fetchColumn();

        return TemplateResponder::respond($res, [
            'ok' => true,
            'stats' => [
                'total'             => $total,
                'opted_in'          => $total,
                'analytics'         => $analytics,
                'marketing'         => $marketing,
                'withdrawn'         => $withdrawn,
                'analytics_rate'    => $total > 0 ? round($analytics/$total*100, 1) : 0,
                'marketing_rate'    => $total > 0 ? round($marketing/$total*100, 1) : 0,
            ],
        ]);
    }
}
