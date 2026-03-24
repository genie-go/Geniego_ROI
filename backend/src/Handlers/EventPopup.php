<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * EventPopup — 이벤트 팝업 CRUD 핸들러
 *
 * DB 테이블: event_popups
 *   id, title, body, image_url, badge_text, badge_color,
 *   cta_text, cta_url, cta_color, cta_new_tab,
 *   start_date, end_date, is_active, width, created_at
 */
class EventPopup
{
    private static function db(): \PDO
    {
        static $pdo = null;
        if (!$pdo) {
            $h = $_ENV['DB_HOST'] ?? 'localhost';
            $d = $_ENV['DB_NAME'] ?? 'geniedb';
            $u = $_ENV['DB_USER'] ?? 'root';
            $p = $_ENV['DB_PASS'] ?? '';
            $pdo = new \PDO("mysql:host={$h};dbname={$d};charset=utf8mb4", $u, $p, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);
            self::migrate($pdo);
        }
        return $pdo;
    }

    private static function migrate(\PDO $pdo): void
    {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS event_popups (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                title       VARCHAR(200) NOT NULL,
                body        TEXT,
                image_url   VARCHAR(500),
                badge_text  VARCHAR(50),
                badge_color VARCHAR(50)  DEFAULT 'rgba(79,142,247,0.2)',
                cta_text    VARCHAR(100),
                cta_url     VARCHAR(500),
                cta_color   VARCHAR(200) DEFAULT 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                cta_new_tab TINYINT(1)   DEFAULT 0,
                start_date  DATE         NOT NULL,
                end_date    DATE         NOT NULL,
                is_active   TINYINT(1)   DEFAULT 1,
                width       INT          DEFAULT 520,
                created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }

    private static function json(Response $response, array $data, int $status = 200): Response
    {
        $body = $response->getBody();
        $body->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    /* ── 공개 활성 팝업 조회 (로그인 사용자용, 인증 불요) ─── */
    public static function listActive(Request $req, Response $res, array $args): Response
    {
        try {
            $pdo = self::db();
            $today = date('Y-m-d');
            $stmt = $pdo->prepare("
                SELECT id, title, body, image_url, badge_text, badge_color,
                       cta_text, cta_url, cta_color, cta_new_tab, start_date, end_date, width
                FROM event_popups
                WHERE is_active = 1 AND start_date <= :today AND end_date >= :today
                ORDER BY id DESC
            ");
            $stmt->execute([':today' => $today]);
            return self::json($res, ['ok' => true, 'popups' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) {
            // DB 없으면 빈 배열 반환 (데모 모드에서도 오류 없음)
            return self::json($res, ['ok' => true, 'popups' => []]);
        }
    }

    /* ── 관리자: 전체 목록 ─── */
    public static function list(Request $req, Response $res, array $args): Response
    {
        try {
            $pdo = self::db();
            $stmt = $pdo->query("SELECT * FROM event_popups ORDER BY id DESC");
            return self::json($res, ['ok' => true, 'popups' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /* ── 관리자: 생성 ─── */
    public static function create(Request $req, Response $res, array $args): Response
    {
        try {
            $b = (array)$req->getParsedBody();
            $pdo = self::db();
            $stmt = $pdo->prepare("
                INSERT INTO event_popups
                    (title, body, image_url, badge_text, badge_color, cta_text, cta_url, cta_color, cta_new_tab, start_date, end_date, is_active, width)
                VALUES
                    (:title, :body, :image_url, :badge_text, :badge_color, :cta_text, :cta_url, :cta_color, :cta_new_tab, :start_date, :end_date, :is_active, :width)
            ");
            $stmt->execute([
                ':title'      => $b['title']      ?? '',
                ':body'       => $b['body']        ?? '',
                ':image_url'  => $b['image_url']   ?? '',
                ':badge_text' => $b['badge_text']  ?? '',
                ':badge_color'=> $b['badge_color'] ?? 'rgba(79,142,247,0.2)',
                ':cta_text'   => $b['cta_text']    ?? '',
                ':cta_url'    => $b['cta_url']     ?? '',
                ':cta_color'  => $b['cta_color']   ?? 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                ':cta_new_tab'=> (int)($b['cta_new_tab'] ?? 0),
                ':start_date' => $b['start_date']  ?? date('Y-m-d'),
                ':end_date'   => $b['end_date']    ?? date('Y-m-d'),
                ':is_active'  => (int)($b['is_active'] ?? 1),
                ':width'      => (int)($b['width']  ?? 520),
            ]);
            return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /* ── 관리자: 수정 ─── */
    public static function update(Request $req, Response $res, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            $b  = (array)$req->getParsedBody();
            $pdo = self::db();
            $pdo->prepare("
                UPDATE event_popups SET
                    title=:title, body=:body, image_url=:image_url,
                    badge_text=:badge_text, badge_color=:badge_color,
                    cta_text=:cta_text, cta_url=:cta_url, cta_color=:cta_color, cta_new_tab=:cta_new_tab,
                    start_date=:start_date, end_date=:end_date, is_active=:is_active, width=:width
                WHERE id=:id
            ")->execute([
                ':id'         => $id,
                ':title'      => $b['title']      ?? '',
                ':body'       => $b['body']        ?? '',
                ':image_url'  => $b['image_url']   ?? '',
                ':badge_text' => $b['badge_text']  ?? '',
                ':badge_color'=> $b['badge_color'] ?? 'rgba(79,142,247,0.2)',
                ':cta_text'   => $b['cta_text']    ?? '',
                ':cta_url'    => $b['cta_url']     ?? '',
                ':cta_color'  => $b['cta_color']   ?? 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                ':cta_new_tab'=> (int)($b['cta_new_tab'] ?? 0),
                ':start_date' => $b['start_date']  ?? date('Y-m-d'),
                ':end_date'   => $b['end_date']    ?? date('Y-m-d'),
                ':is_active'  => (int)($b['is_active'] ?? 1),
                ':width'      => (int)($b['width']  ?? 520),
            ]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /* ── 관리자: 삭제 ─── */
    public static function delete(Request $req, Response $res, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            self::db()->prepare("DELETE FROM event_popups WHERE id=:id")->execute([':id' => $id]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /* ── 관리자: 활성화/비활성화 토글 ─── */
    public static function toggle(Request $req, Response $res, array $args): Response
    {
        try {
            $id = (int)($args['id'] ?? 0);
            $pdo = self::db();
            $pdo->prepare("UPDATE event_popups SET is_active = 1 - is_active WHERE id=:id")
                ->execute([':id' => $id]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
