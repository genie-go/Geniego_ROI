<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * LegalDoc — 239차+ 신규. 공개 법적 페이지(이용약관·개인정보·환불)의 admin 다국어 편집 + 공개 조회.
 *
 * 배경: /terms·/privacy·/refund 가 프론트에 영문 하드코딩이라 admin 편집 불가였다.
 *   → DB 기반 다국어 편집(SiteIntro 패턴 재사용). 콘텐츠 없으면 프론트가 기존 하드코딩으로 graceful 폴백(무회귀).
 *
 * - 공개: GET /v424/legal/{key}?lang=xx (인증 불요, index.php bypass) — 공개 페이지가 사용. lang 폴백: 요청lang→en→임의.
 * - admin: GET /v424/admin/legal(전체), PUT /v424/admin/legal/{key}/{lang}(저장). UserAuth::requirePlan('admin').
 *
 * 본문(body)은 lite-markdown(## 헤딩 / - 불릿 / 빈줄 문단). 프론트가 안전 파싱(innerHTML 미사용=XSS 없음).
 * ★MySQL 트랩: TEXT 는 PRIMARY KEY 불가 → 복합키 (doc_key,lang) VARCHAR.
 */
final class LegalDoc
{
    /** 편집 가능한 문서 키(SSOT). */
    public const DOC_KEYS = ['terms', 'privacy', 'refund'];

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($code);
    }

    private static function ensureTables(\PDO $pdo): void
    {
        $pdo->exec("CREATE TABLE IF NOT EXISTS legal_doc (
            doc_key VARCHAR(32) NOT NULL,
            lang VARCHAR(8) NOT NULL,
            title VARCHAR(255),
            subtitle VARCHAR(255),
            body MEDIUMTEXT,
            updated_at TEXT,
            PRIMARY KEY (doc_key, lang)
        )");
    }

    private static function normKey(string $k): string
    {
        $k = strtolower(trim($k));
        return in_array($k, self::DOC_KEYS, true) ? $k : '';
    }

    /** 한 문서의 lang 우선순위 조회: 요청lang → en → 임의(첫 행). 없으면 null. */
    private static function fetchDoc(\PDO $pdo, string $key, string $lang): ?array
    {
        $st = $pdo->prepare("SELECT doc_key, lang, title, subtitle, body, updated_at FROM legal_doc WHERE doc_key=? AND lang=?");
        $st->execute([$key, $lang]);
        $row = $st->fetch(\PDO::FETCH_ASSOC);
        if ($row && trim((string)($row['body'] ?? '')) !== '') return $row;
        if ($lang !== 'en') {
            $st->execute([$key, 'en']);
            $row = $st->fetch(\PDO::FETCH_ASSOC);
            if ($row && trim((string)($row['body'] ?? '')) !== '') return $row;
        }
        $any = $pdo->prepare("SELECT doc_key, lang, title, subtitle, body, updated_at FROM legal_doc WHERE doc_key=? AND body IS NOT NULL AND TRIM(body)<>'' ORDER BY (lang='ko') DESC, lang LIMIT 1");
        $any->execute([$key]);
        $row = $any->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // ── 공개: GET /v424/legal/{key}?lang=xx ──────────────────────────────
    public static function publicGet(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        self::ensureTables($pdo);
        $key = self::normKey((string)($args['key'] ?? ''));
        if ($key === '') return self::json($res, ['ok' => false, 'error' => 'unknown_doc'], 404);
        $lang = strtolower(trim((string)($req->getQueryParams()['lang'] ?? 'en'))) ?: 'en';
        $doc = self::fetchDoc($pdo, $key, $lang);
        // 콘텐츠 없으면 doc=null → 프론트가 하드코딩 폴백(무회귀).
        return self::json($res, ['ok' => true, 'key' => $key, 'lang' => $lang, 'doc' => $doc]);
    }

    // ── admin: GET /v424/admin/legal (전체 문서×언어) ────────────────────
    public static function adminList(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        self::ensureTables($pdo);
        $rows = $pdo->query("SELECT doc_key, lang, title, subtitle, body, updated_at FROM legal_doc ORDER BY doc_key, lang")->fetchAll(\PDO::FETCH_ASSOC);
        // 문서키별 그룹
        $docs = [];
        foreach (self::DOC_KEYS as $k) $docs[$k] = [];
        foreach ($rows as $r) {
            $k = (string)$r['doc_key'];
            if (!isset($docs[$k])) $docs[$k] = [];
            $docs[$k][(string)$r['lang']] = $r;
        }
        return self::json($res, ['ok' => true, 'doc_keys' => self::DOC_KEYS, 'docs' => $docs]);
    }

    // ── admin: PUT /v424/admin/legal/{key}/{lang} (upsert) ───────────────
    public static function adminSave(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        self::ensureTables($pdo);
        $key = self::normKey((string)($args['key'] ?? ''));
        if ($key === '') return self::json($res, ['ok' => false, 'error' => 'unknown_doc'], 400);
        $lang = strtolower(trim((string)($args['lang'] ?? '')));
        if ($lang === '' || !preg_match('/^[a-z]{2}(-[a-z]{2})?$/', $lang)) return self::json($res, ['ok' => false, 'error' => 'bad_lang'], 400);
        $b = (array)$req->getParsedBody();
        $title = (string)($b['title'] ?? '');
        $subtitle = (string)($b['subtitle'] ?? '');
        $body = (string)($b['body'] ?? '');
        $now = gmdate('c');
        $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($drv === 'mysql') {
            $sql = "INSERT INTO legal_doc (doc_key, lang, title, subtitle, body, updated_at) VALUES (?,?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE title=VALUES(title), subtitle=VALUES(subtitle), body=VALUES(body), updated_at=VALUES(updated_at)";
        } else {
            $sql = "INSERT INTO legal_doc (doc_key, lang, title, subtitle, body, updated_at) VALUES (?,?,?,?,?,?)
                    ON CONFLICT(doc_key, lang) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, body=excluded.body, updated_at=excluded.updated_at";
        }
        $pdo->prepare($sql)->execute([$key, $lang, $title, $subtitle, $body, $now]);
        return self::json($res, ['ok' => true, 'key' => $key, 'lang' => $lang, 'updated_at' => $now]);
    }
}
