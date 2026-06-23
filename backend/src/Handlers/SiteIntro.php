<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * SiteIntro — 187차 Phase2 신규.
 *
 * 공개 소개 페이지(회사소개·연혁·운영진)의 admin 관리 + 공개 조회.
 * - 공개: GET /auth/site/intro (인증 불요) — 첫페이지/소개 페이지가 사용.
 * - admin: GET/PUT/POST/DELETE /v424/admin/site/* (UserAuth::requirePlan('admin')).
 *
 * 콘텐츠는 한글 입력 + 자동표시(공개 chrome 만 15개국). visible 플래그로 첫페이지 메뉴 노출 제어.
 */
final class SiteIntro
{
    private static function ensureTables(\PDO $pdo): void
    {
        $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $AI = ($drv === 'mysql') ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_company (
            id INTEGER PRIMARY KEY,
            name TEXT, tagline TEXT, summary TEXT, description TEXT,
            founded TEXT, ceo TEXT, address TEXT, email TEXT, phone TEXT, website TEXT,
            vision TEXT, mission TEXT,
            about_visible INTEGER DEFAULT 1, team_visible INTEGER DEFAULT 1, history_visible INTEGER DEFAULT 1,
            biz_reg TEXT, copyright TEXT,
            updated_at TEXT
        )");
        // [239차+] 기존 테이블에 footer 필드(biz_reg·copyright) 추가(idempotent — 이미 있으면 무시).
        foreach (['biz_reg', 'copyright'] as $col) {
            try { $pdo->exec("ALTER TABLE site_company ADD COLUMN $col TEXT"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
        // [239차+] footer 기본값 1회 설정(admin 미편집 시): biz_reg·copyright NULL/빈값이면 신규값, 구 이메일도 신규 도메인으로.
        try {
            $pdo->prepare("UPDATE site_company SET biz_reg=? WHERE id=1 AND (biz_reg IS NULL OR biz_reg='')")->execute(['104-81-65037']);
            $pdo->prepare("UPDATE site_company SET copyright=? WHERE id=1 AND (copyright IS NULL OR copyright='')")->execute(['© 2001. 09. 11. Ociell Co., Ltd. All rights reserved.']);
            $pdo->prepare("UPDATE site_company SET email=? WHERE id=1 AND (email IS NULL OR email='' OR email='support@genie-go.com')")->execute(['geniegoroi@ociell.com']);
        } catch (\Throwable $e) { /* best-effort */ }
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_team (
            id $AI,
            name TEXT, title TEXT, bio TEXT, photo_url TEXT, email TEXT, linkedin TEXT,
            display_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
            created_at TEXT, updated_at TEXT
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_history (
            id $AI,
            ymd TEXT, title TEXT, description TEXT,
            display_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
            created_at TEXT
        )");
        // 최초 1회 회사 기본행 seed (id=1)
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM site_company")->fetchColumn();
        if ($cnt === 0) {
            $now = gmdate('c');
            $st = $pdo->prepare("INSERT INTO site_company
                (id, name, tagline, summary, description, founded, ceo, address, email, phone, website, vision, mission,
                 about_visible, team_visible, history_visible, updated_at)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?)");
            $st->execute([
                '주식회사 OCIELL',
                'AI로 커머스 운영의 A부터 Z까지 자동화하는 글로벌 SaaS',
                'Geniego-ROI는 광고·판매·재고·배송·정산 등 모든 채널 운영을 인공지능 데이터 분석으로 자동화하는 올인원 커머스 플랫폼입니다.',
                "Geniego-ROI는 30개 이상의 국내외 마켓을 하나의 허브로 연결하고, AI 마케팅 인텔리전스·통합 손익 분석·정산 대사·창고(WMS)·자동화 엔진까지 커머스 운영의 전 과정을 자동화합니다.\n\n전 세계 15개국 현지 자연어를 지원하며, 은행급 보안과 99.9% 가동률 SLA로 글로벌 시장 어디에서도 신뢰할 수 있는 초엔터프라이즈 SaaS를 지향합니다.",
                '2024',
                '',
                '서울특별시, 대한민국',
                'support@genie-go.com',
                '',
                'https://roi.genie-go.com',
                '데이터로 연결된 커머스, 누구나 글로벌로 성장하는 세상',
                'AI 자동화로 커머스 운영의 복잡함을 없애고, 모든 셀러가 데이터에 기반해 성장하도록 돕습니다.',
                $now,
            ]);
        }
    }

    private static function company(\PDO $pdo): array
    {
        $row = $pdo->query("SELECT * FROM site_company WHERE id=1")->fetch(\PDO::FETCH_ASSOC) ?: [];
        $row['about_visible']   = (int)($row['about_visible']   ?? 1) === 1;
        $row['team_visible']    = (int)($row['team_visible']    ?? 1) === 1;
        $row['history_visible'] = (int)($row['history_visible'] ?? 1) === 1;
        return $row;
    }

    private static function teamRows(\PDO $pdo, bool $activeOnly): array
    {
        $where = $activeOnly ? 'WHERE is_active=1' : '';
        $rows = $pdo->query("SELECT * FROM site_team $where ORDER BY display_order, id")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['is_active'] = (int)$r['is_active'] === 1; $r['display_order'] = (int)$r['display_order']; }
        return $rows;
    }

    private static function historyRows(\PDO $pdo, bool $activeOnly): array
    {
        $where = $activeOnly ? 'WHERE is_active=1' : '';
        $rows = $pdo->query("SELECT * FROM site_history $where ORDER BY display_order, id")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['is_active'] = (int)$r['is_active'] === 1; $r['display_order'] = (int)$r['display_order']; }
        return $rows;
    }

    // ── 공개: GET /auth/site/intro ────────────────────────────────────
    public static function publicIntro(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        self::ensureTables($pdo);
        $c = self::company($pdo);
        return self::json($res, [
            'ok'      => true,
            'company' => $c,
            'team'    => $c['team_visible']    ? self::teamRows($pdo, true)    : [],
            'history' => $c['history_visible'] ? self::historyRows($pdo, true) : [],
            'visibility' => [
                'about'   => $c['about_visible'],
                'team'    => $c['team_visible'],
                'history' => $c['history_visible'],
            ],
        ]);
    }

    // ── admin: GET /v424/admin/site/intro (전체, 비활성 포함) ──────────
    public static function adminGet(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        self::ensureTables($pdo);
        return self::json($res, [
            'ok'      => true,
            'company' => self::company($pdo),
            'team'    => self::teamRows($pdo, false),
            'history' => self::historyRows($pdo, false),
        ]);
    }

    // ── admin: PUT /v424/admin/site/company ───────────────────────────
    public static function saveCompany(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = (array)$req->getParsedBody();
        $f = ['name','tagline','summary','description','founded','ceo','address','email','phone','website','vision','mission','biz_reg','copyright'];
        $set = []; $vals = [];
        foreach ($f as $k) { if (array_key_exists($k, $b)) { $set[] = "$k=?"; $vals[] = (string)$b[$k]; } }
        $set[] = "updated_at=?"; $vals[] = gmdate('c');
        $vals[] = 1;
        $pdo->prepare("UPDATE site_company SET " . implode(',', $set) . " WHERE id=?")->execute($vals);
        return self::json($res, ['ok' => true, 'company' => self::company($pdo)]);
    }

    // ── admin: PUT /v424/admin/site/visibility ────────────────────────
    public static function saveVisibility(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = (array)$req->getParsedBody();
        $set = []; $vals = [];
        foreach (['about_visible','team_visible','history_visible'] as $k) {
            if (array_key_exists($k, $b)) { $set[] = "$k=?"; $vals[] = !empty($b[$k]) ? 1 : 0; }
        }
        if ($set) { $vals[] = 1; $pdo->prepare("UPDATE site_company SET " . implode(',', $set) . " WHERE id=?")->execute($vals); }
        return self::json($res, ['ok' => true, 'company' => self::company($pdo)]);
    }

    // ── admin: POST /v424/admin/site/team (id 있으면 update, 없으면 insert) ─
    public static function teamSave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = (array)$req->getParsedBody();
        $now = gmdate('c');
        $id = isset($b['id']) ? (int)$b['id'] : 0;
        $cols = ['name','title','bio','photo_url','email','linkedin'];
        if ($id > 0) {
            $set = []; $vals = [];
            foreach ($cols as $k) { $set[] = "$k=?"; $vals[] = (string)($b[$k] ?? ''); }
            $set[] = "display_order=?"; $vals[] = (int)($b['display_order'] ?? 0);
            $set[] = "is_active=?";     $vals[] = !empty($b['is_active']) || !isset($b['is_active']) ? 1 : 0;
            $set[] = "updated_at=?";    $vals[] = $now;
            $vals[] = $id;
            $pdo->prepare("UPDATE site_team SET " . implode(',', $set) . " WHERE id=?")->execute($vals);
        } else {
            $st = $pdo->prepare("INSERT INTO site_team (name,title,bio,photo_url,email,linkedin,display_order,is_active,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)");
            $st->execute([
                (string)($b['name'] ?? ''), (string)($b['title'] ?? ''), (string)($b['bio'] ?? ''),
                (string)($b['photo_url'] ?? ''), (string)($b['email'] ?? ''), (string)($b['linkedin'] ?? ''),
                (int)($b['display_order'] ?? 0), !empty($b['is_active']) || !isset($b['is_active']) ? 1 : 0, $now, $now,
            ]);
            $id = (int)$pdo->lastInsertId();
        }
        return self::json($res, ['ok' => true, 'id' => $id, 'team' => self::teamRows($pdo, false)]);
    }

    public static function teamDelete(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $pdo->prepare("DELETE FROM site_team WHERE id=?")->execute([(int)($args['id'] ?? 0)]);
        return self::json($res, ['ok' => true, 'team' => self::teamRows($pdo, false)]);
    }

    // ── admin: POST /v424/admin/site/history ──────────────────────────
    public static function historySave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = (array)$req->getParsedBody();
        $now = gmdate('c');
        $id = isset($b['id']) ? (int)$b['id'] : 0;
        if ($id > 0) {
            $pdo->prepare("UPDATE site_history SET ymd=?, title=?, description=?, display_order=?, is_active=? WHERE id=?")
                ->execute([(string)($b['ymd'] ?? ''), (string)($b['title'] ?? ''), (string)($b['description'] ?? ''),
                    (int)($b['display_order'] ?? 0), !empty($b['is_active']) || !isset($b['is_active']) ? 1 : 0, $id]);
        } else {
            $pdo->prepare("INSERT INTO site_history (ymd,title,description,display_order,is_active,created_at) VALUES (?,?,?,?,?,?)")
                ->execute([(string)($b['ymd'] ?? ''), (string)($b['title'] ?? ''), (string)($b['description'] ?? ''),
                    (int)($b['display_order'] ?? 0), !empty($b['is_active']) || !isset($b['is_active']) ? 1 : 0, $now]);
            $id = (int)$pdo->lastInsertId();
        }
        return self::json($res, ['ok' => true, 'id' => $id, 'history' => self::historyRows($pdo, false)]);
    }

    public static function historyDelete(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $pdo->prepare("DELETE FROM site_history WHERE id=?")->execute([(int)($args['id'] ?? 0)]);
        return self::json($res, ['ok' => true, 'history' => self::historyRows($pdo, false)]);
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
