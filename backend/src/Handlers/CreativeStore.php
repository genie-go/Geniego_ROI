<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * CreativeStore — AI 광고 크리에이티브 서버 저장 + 중복 방지 핸들러
 *
 * 중복 방지 전략:
 *   1) content_hash: SHA-256(title + platform + category + eventType + season + imageData의 앞 500bytes)
 *   2) 동일 content_hash가 이미 존재하면 → 409 Conflict 반환
 *   3) source_page 필드로 어디서 생성했는지 추적
 */
final class CreativeStore
{
    /* ── JSON 응답 헬퍼 ──────────────────────────────────────────── */
    private static function json(Response $res, mixed $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    // [현 차수] 289차후속 실결함 수정: create/update 의 image_data 무검증(무제한 크기·비이미지 스킴 허용) 정합.
    //   sibling brandAssetUpload(259차)는 이미 5MB 캡을 강제하나 원조 create/update 경로엔 아무 가드도 없어
    //   인증 테넌트가 거대 blob 적재(저장소 고갈·max_allowed_packet 실패) / data:text/html 등 비이미지 스킴 저장이 가능했다.
    private const MAX_IMAGE_BYTES = 5000000; // 5MB — brandAssetUpload 컨벤션과 정합(base64 data_url 문자열 길이 캡)

    /** image_data 검증 — 위반 시 에러코드 문자열, 정상/미제공 시 null. 비파괴(빈 값=이미지 없는 title 크리에이티브 허용). */
    private static function validateImageData(string $img): ?string
    {
        if ($img === '') return null;                                   // 이미지 없음 = 허용
        if (strlen($img) > self::MAX_IMAGE_BYTES) return 'image_too_large';
        // data: URL 이면 image/* 만 허용 — data:text/html·application/* 등 비이미지 스킴 저장 차단.
        if (str_starts_with($img, 'data:') && !str_starts_with($img, 'data:image/')) {
            return 'invalid_image_type';
        }
        return null;
    }

    /* ── content_hash 생성 ───────────────────────────────────────── */
    private static function makeHash(array $d): string
    {
        $sig = implode('|', [
            $d['title'] ?? '',
            $d['platform'] ?? '',
            $d['category'] ?? '',
            $d['event_type'] ?? '',
            $d['season'] ?? '',
            substr($d['image_data'] ?? '', 0, 500),   // 이미지 앞 500자로 유사도 판별
        ]);
        return hash('sha256', $sig);
    }

    /* ━━━━ LIST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function list(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $params = $req->getQueryParams();
        $platform = $params['platform'] ?? null;

        $sql = 'SELECT * FROM creative_asset WHERE user_id = ?';
        $bind = [$userId];
        if ($platform) { $sql .= ' AND platform = ?'; $bind[] = $platform; }
        $sql .= ' ORDER BY created_at DESC LIMIT 200';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll();

        // image_data는 목록에서 제외 (크기가 크므로)
        foreach ($rows as &$r) { unset($r['image_data']); }

        return self::json($res, ['creatives' => $rows, 'total' => count($rows)]);
    }

    /* ━━━━ GET ONE (이미지 포함) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function get(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $id = (int)$args['id'];

        $stmt = $pdo->prepare('SELECT * FROM creative_asset WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();

        if (!$row) return self::json($res, ['error' => 'Not found'], 404);
        return self::json($res, $row);
    }

    /* ━━━━ CREATE (중복 방지 핵심) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function create(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        // [225차 P1-18] 익명('default' 공유 풀) 쓰기 차단 — 미인증자가 공유 버킷에 무제한 blob 적재/오염 방지.
        if ($userId === 'default') return self::json($res, ['error' => 'Unauthorized'], 401);
        $body = (array)$req->getParsedBody();

        // 필수 필드 검증
        $title    = trim($body['title'] ?? '');
        $platform = $body['platform'] ?? 'popup';
        $category = $body['category'] ?? 'general';
        $eventType = $body['event_type'] ?? 'sale';
        $season   = $body['season'] ?? 'spring';
        $imageData = $body['image_data'] ?? '';
        $linkUrl  = $body['link_url'] ?? '';
        $sourcePage = $body['source_page'] ?? 'auto-marketing';  // 어디서 생성했는지

        if ($title === '' && $imageData === '') {
            return self::json($res, ['error' => 'title or image_data required'], 400);
        }
        if ($err = self::validateImageData((string)$imageData)) {
            return self::json($res, ['error' => $err], 422);
        }

        // ── 중복 방지: content_hash 계산 ───────────────
        $hash = self::makeHash($body);

        // 동일 hash 존재 확인
        $dup = $pdo->prepare('SELECT id, title, platform, source_page, created_at FROM creative_asset WHERE user_id = ? AND content_hash = ?');
        $dup->execute([$userId, $hash]);
        $existing = $dup->fetch();

        if ($existing) {
            return self::json($res, [
                'error' => 'duplicate',
                'message' => '동일한 크리에이티브가 이미 존재합니다',
                'existing' => $existing,
            ], 409);
        }

        // ── 저장 ─────────────────────────────────────
        $now = gmdate('c');
        $stmt = $pdo->prepare('INSERT INTO creative_asset
            (user_id, title, platform, category, event_type, season, image_data, link_url, source_page, content_hash, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId, $title, $platform, $category, $eventType, $season,
            $imageData, $linkUrl, $sourcePage, $hash, 'ready', $now,
        ]);

        $id = (int)$pdo->lastInsertId();
        return self::json($res, [
            'id' => $id,
            'content_hash' => $hash,
            'message' => 'Creative saved successfully',
        ], 201);
    }

    /* ━━━━ UPDATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function update(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        // [225차 P1-18] 익명('default') 수정 차단.
        if ($userId === 'default') return self::json($res, ['error' => 'Unauthorized'], 401);
        $id = (int)$args['id'];
        $body = (array)$req->getParsedBody();

        // 소유권 확인
        $check = $pdo->prepare('SELECT id FROM creative_asset WHERE id = ? AND user_id = ?');
        $check->execute([$id, $userId]);
        if (!$check->fetch()) return self::json($res, ['error' => 'Not found'], 404);

        if (isset($body['image_data']) && ($err = self::validateImageData((string)$body['image_data']))) {
            return self::json($res, ['error' => $err], 422);
        }

        $sets = [];
        $vals = [];
        foreach (['title','platform','category','event_type','season','image_data','link_url','status'] as $col) {
            if (isset($body[$col])) { $sets[] = "$col = ?"; $vals[] = $body[$col]; }
        }
        if (empty($sets)) return self::json($res, ['error' => 'No fields to update'], 400);

        // content_hash 재생성
        $newHash = self::makeHash($body);
        $sets[] = 'content_hash = ?';
        $vals[] = $newHash;
        $sets[] = 'updated_at = ?';
        $vals[] = gmdate('c');
        $vals[] = $id;
        $vals[] = $userId;

        $pdo->prepare("UPDATE creative_asset SET " . implode(', ', $sets) . " WHERE id = ? AND user_id = ?")->execute($vals);
        return self::json($res, ['id' => $id, 'updated' => true]);
    }

    /* ━━━━ DELETE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    public static function delete(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        // [225차 P1-18] 익명('default') 삭제 차단.
        if ($userId === 'default') return self::json($res, ['error' => 'Unauthorized'], 401);
        $id = (int)$args['id'];

        $stmt = $pdo->prepare('DELETE FROM creative_asset WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        return self::json($res, ['deleted' => $stmt->rowCount() > 0]);
    }

    /* ━━━━ DUPLICATE CHECK (저장 전 사전 확인용) ━━━━━━━━━━━━━━━━━ */
    public static function checkDuplicate(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $userId = self::userId($req);
        $body = (array)$req->getParsedBody();
        $hash = self::makeHash($body);

        $stmt = $pdo->prepare('SELECT id, title, platform, source_page, created_at FROM creative_asset WHERE user_id = ? AND content_hash = ?');
        $stmt->execute([$userId, $hash]);
        $existing = $stmt->fetch();

        return self::json($res, [
            'isDuplicate' => $existing ? true : false,
            'existing' => $existing ?: null,
            'content_hash' => $hash,
        ]);
    }

    /* ── userId 추출 — 서버 user_session 토큰 실검증 ───────────────────── */
    private static function userId(Request $req): string
    {
        // [현 차수] ★보안(P1): 기존엔 Bearer JWT payload(sub/user_id/id)를 서명검증 없이 base64 디코드만 해
        //   신뢰 → 누구나 임의 user_id 위조 가능했다. 본 플랫폼 토큰은 JWT가 아니라 불투명 user_session 토큰이므로
        //   서버 user_session 조회로 실제 user_id 를 도출한다(위조 불가). 미인증/무효는 'default' 공유 풀 유지.
        $authHeader = $req->getHeaderLine('Authorization');
        $token = (is_string($authHeader) && str_starts_with($authHeader, 'Bearer ')) ? trim(substr($authHeader, 7)) : '';
        if ($token === '') return 'default';
        try {
            $st = Db::pdo()->prepare('SELECT user_id FROM user_session WHERE token = ? AND expires_at > ? LIMIT 1');
            $st->execute([UserAuth::hashToken($token), gmdate('c')]);
            $uid = $st->fetchColumn();
            if ($uid !== false && $uid !== null && (string)$uid !== '') return (string)$uid;
        } catch (\Throwable $e) { /* 스키마/연결 오류 → 공유 풀 폴백 */ }
        return 'default';
    }

    /* ━━━━ [259차] 브랜드 에셋(로고/가이드/컬러/폰트) — CreativeStudio "에셋 업로드" 실배선 ━━━━
       ★테넌트 스코프(계정별 독립·철칙)·세션 requirePro. data_url(base64) 5MB 캡. */
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }
    private static function ensureBrandAssets(): void
    {
        $pdo = Db::pdo();
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($isMy) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS brand_asset (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                name VARCHAR(255), type VARCHAR(20), size VARCHAR(30), data_url LONGTEXT, updated_at VARCHAR(32),
                KEY idx_ba_tenant (tenant_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS brand_asset (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
                name TEXT, type TEXT, size TEXT, data_url TEXT, updated_at TEXT)");
        }
    }
    // GET /v426/creatives/brand-assets — 목록(data_url 제외=경량). 테넌트 스코프.
    public static function brandAssetsList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureBrandAssets();
        $st = Db::pdo()->prepare("SELECT id,name,type,size,updated_at FROM brand_asset WHERE tenant_id=? ORDER BY id DESC LIMIT 200");
        $st->execute([self::tenant($req)]);
        return self::json($res, ['ok' => true, 'assets' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
    }
    // GET /v426/creatives/brand-assets/{id} — 단건(data_url 포함, 다운로드/미리보기).
    public static function brandAssetGet(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureBrandAssets();
        $st = Db::pdo()->prepare("SELECT id,name,type,size,data_url,updated_at FROM brand_asset WHERE id=? AND tenant_id=?");
        $st->execute([(int)($args['id'] ?? 0), self::tenant($req)]);
        $r = $st->fetch(\PDO::FETCH_ASSOC);
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        return self::json($res, ['ok' => true, 'asset' => $r]);
    }
    // POST /v426/creatives/brand-assets — 업로드(data_url base64, 5MB 캡). 테넌트 스코프.
    public static function brandAssetUpload(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureBrandAssets();
        $b = (array)($req->getParsedBody() ?? []);
        $dataUrl = (string)($b['data_url'] ?? '');
        if ($dataUrl === '' || strlen($dataUrl) > 5000000) return self::json($res, ['ok' => false, 'error' => 'invalid_or_too_large'], 422);
        $now = gmdate('c');
        Db::pdo()->prepare("INSERT INTO brand_asset(tenant_id,name,type,size,data_url,updated_at) VALUES(?,?,?,?,?,?)")
            ->execute([self::tenant($req), mb_substr((string)($b['name'] ?? 'asset'), 0, 255), mb_substr((string)($b['type'] ?? ''), 0, 20), mb_substr((string)($b['size'] ?? ''), 0, 30), $dataUrl, $now]);
        return self::json($res, ['ok' => true]);
    }
    // DELETE /v426/creatives/brand-assets/{id} — 삭제(테넌트 스코프).
    public static function brandAssetDelete(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureBrandAssets();
        Db::pdo()->prepare("DELETE FROM brand_asset WHERE id=? AND tenant_id=?")->execute([(int)($args['id'] ?? 0), self::tenant($req)]);
        return self::json($res, ['ok' => true]);
    }
}
