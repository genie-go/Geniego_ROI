<?php
/**
 * FeedTemplate — 채널 피드템플릿(속성 매핑 Rule) 버전관리 + Approval + 배포. [270차 신설]
 *
 * 배경: RulesEditorV2.jsx(드래그&드롭 매핑 에디터·/rules-editor-v2 라우팅)가 소비하는
 *   `/v395/templates/v2/{channel}/*` 7엔드포인트가 templates.json 정적 스텁($templateHandler)이라
 *   draft 생성/저장/제출/승인/배포·versions/current 전 워크플로우가 항상 no-op(draft.id=null)였다.
 *   → 실 백엔드(메인 DB feed_template 테이블·테넌트 격리·상태전이)로 배선.
 * 설계(WorkspaceState 패턴): Db::pdo() 메인DB · 세션 self-auth(authedTenant) · tenant_id 격리 ·
 *   런타임 CREATE(MySQL/SQLite variant, TEXT DEFAULT 회피) · 채널당 published 1개(발행 시 이전 published archived).
 * 라우트: routes.php v395 templates/v2 7개 $register→실 매핑(FeedTemplate::*).
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class FeedTemplate
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

    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    /** [282차 R3] 채널 화이트리스트 — writeback 실어댑터 보유 채널 전체(기존 4채널 제약 해소).
     *   피드 변환이 실제 적용되려면 pushProductInner 어댑터가 있는 채널이어야 의미가 있다. */
    public const CHANNELS = [
        'shopee', 'qoo10', 'rakuten', 'amazon', 'lazada', 'ebay', 'etsy', 'walmart', 'yahoo_jp',
        'cafe24', 'coupang', 'naver', 'naver_smartstore', 'tiktok', 'tiktok_shop', '11st', 'st11',
        'gmarket', 'auction', 'lotteon', 'godomall', 'woocommerce', 'magento', 'shopify',
    ];
    private static function chan(array $args): string
    {
        $c = strtolower(trim((string)($args['channel'] ?? '')));
        // 형식 안전(영숫자/언더스코어) + writeback 어댑터 보유 채널만. 미보유 채널은 변환 무의미(차단).
        if ($c === '' || !preg_match('/^[a-z0-9_]{2,40}$/', $c)) return '';
        return in_array($c, self::CHANNELS, true) ? $c : '';
    }

    /** 실전송에 즉시 반영되는 canonical 상품 필드(오버레이 대상). 그 외 target 은 채널-네이티브 확장으로 전달만. */
    public const CANONICAL_FIELDS = ['title', 'name', 'price', 'currency', 'inventory', 'quantity',
        'category', 'category_code', 'channel_category', 'category_id', 'spec', 'detail_html', 'image_url',
        'brand', 'maker', 'model', 'barcode', 'origin', 'description'];

    /* ═══ [282차 R3] 피드 변환 실배선 — 스펙 파싱·발행본 해석·상품 적용 ═══ */

    /** body(JSON 또는 레거시 YAML) → 정규 스펙 ['version','fields'=>[...]]. 파싱 실패 시 빈 스펙. */
    public static function parseSpec(string $body): array
    {
        $body = trim($body);
        if ($body === '') return ['version' => 2, 'fields' => []];
        // 1) JSON 우선.
        $j = json_decode($body, true);
        if (is_array($j)) {
            if (isset($j['fields']) && is_array($j['fields'])) return ['version' => (int)($j['version'] ?? 2), 'fields' => array_values($j['fields'])];
            // mapping(오브젝트 src→target) + transforms(target→op배열) 형태 지원.
            if (isset($j['mapping']) && is_array($j['mapping'])) {
                $fields = [];
                $trAll = (array)($j['transforms'] ?? []);
                foreach ($j['mapping'] as $src => $tgt) {
                    $tgt = (string)$tgt; if ($tgt === '') continue;
                    $fields[] = ['target' => $tgt, 'source' => (string)$src, 'transforms' => (array)($trAll[$tgt] ?? [])];
                }
                return ['version' => 2, 'fields' => $fields];
            }
            return ['version' => 2, 'fields' => []];
        }
        // 2) 레거시 YAML-ish (RulesEditorV2 buildYaml): "mapping:" 블록의 "  src: target" 라인.
        $fields = []; $inMap = false;
        foreach (explode("\n", $body) as $ln) {
            $trimmed = trim($ln);
            if ($trimmed === 'mapping:') { $inMap = true; continue; }
            if ($trimmed === 'transforms:' || (substr($ln, 0, 1) !== ' ' && $trimmed !== '')) { $inMap = ($trimmed === 'mapping:'); }
            if ($inMap && strpos($ln, ':') !== false && substr($ln, 0, 1) === ' ') {
                [$k, $v] = array_map('trim', explode(':', $trimmed, 2));
                if ($k !== '' && $v !== '') $fields[] = ['target' => $v, 'source' => $k, 'transforms' => []];
            }
        }
        return ['version' => 1, 'fields' => $fields];
    }

    /** 발행된(published) 스펙 해석 — 요청당 캐시(테넌트·채널). 없으면 null. */
    private static $specCache = [];
    public static function resolvePublished(PDO $pdo, string $tenant, string $channel): ?array
    {
        $channel = strtolower(trim($channel));
        $key = $tenant . '|' . $channel;
        if (array_key_exists($key, self::$specCache)) return self::$specCache[$key];
        $spec = null;
        try {
            self::ensure($pdo);
            $st = $pdo->prepare("SELECT body FROM feed_template WHERE tenant_id=? AND channel=? AND status='published' ORDER BY id DESC LIMIT 1");
            $st->execute([$tenant, $channel]);
            $body = $st->fetchColumn();
            if ($body !== false && trim((string)$body) !== '') {
                $parsed = self::parseSpec((string)$body);
                if (!empty($parsed['fields'])) $spec = $parsed;
            }
        } catch (\Throwable $e) { $spec = null; /* 무회귀: 오류 시 미적용 */ }
        return self::$specCache[$key] = $spec;
    }

    /**
     * 발행 스펙을 상품에 적용 — writeback 파이프라인이 전송 직전 호출.
     *   무발행/오류 시 상품 원본 반환(회귀0). @return ['product','applied','errors','warnings','mapped'].
     */
    public static function transformProduct(PDO $pdo, string $tenant, string $channel, array $product): array
    {
        $spec = self::resolvePublished($pdo, $tenant, $channel);
        if ($spec === null) return ['product' => $product, 'applied' => false, 'errors' => [], 'warnings' => [], 'mapped' => []];
        $r = FeedTransform::apply($spec, $product);
        // mapped 를 상품에 오버레이(canonical 은 실전송 반영·나머지는 네이티브 확장으로 전달). meta 는 상품에 넣지 않음.
        $overlaid = array_merge($product, $r['mapped']);
        return ['product' => $overlaid, 'applied' => true, 'errors' => $r['errors'], 'warnings' => $r['warnings'], 'mapped' => $r['mapped']];
    }

    private static function ensure(PDO $pdo): void
    {
        $my = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($my) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS feed_template (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(64) NOT NULL,
                channel VARCHAR(40) NOT NULL,
                status VARCHAR(20) NOT NULL,
                body MEDIUMTEXT,
                created_by VARCHAR(64),
                updated_by VARCHAR(64),
                created_at VARCHAR(32),
                updated_at VARCHAR(32),
                published_at VARCHAR(32),
                KEY idx_ft_tc (tenant_id, channel, status)
            )");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS feed_template (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                status TEXT NOT NULL,
                body TEXT,
                created_by TEXT,
                updated_by TEXT,
                created_at TEXT,
                updated_at TEXT,
                published_at TEXT
            )");
        }
    }

    /** 소유·격리 검증된 draft 행 조회(테넌트+채널+id). 없으면 null. */
    private static function row(PDO $pdo, string $t, string $ch, string $id): ?array
    {
        $st = $pdo->prepare("SELECT * FROM feed_template WHERE tenant_id=? AND channel=? AND id=? LIMIT 1");
        $st->execute([$t, $ch, $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // ── GET /v395/templates/v2/{channel}/versions ──
    public static function versions(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $pdo = Db::pdo(); self::ensure($pdo);
        $st = $pdo->prepare("SELECT id, status, updated_at, published_at FROM feed_template WHERE tenant_id=? AND channel=? ORDER BY id DESC LIMIT 50");
        $st->execute([$t, $ch]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $pub = null;
        foreach ($rows as $r) { if (($r['status'] ?? '') === 'published') { $pub = (string)$r['id']; break; } }
        return self::json($res, ['ok' => true, 'meta' => ['current_published' => $pub, 'versions' => $rows]]);
    }

    // ── GET /v395/templates/v2/{channel}/current ──
    public static function current(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $pdo = Db::pdo(); self::ensure($pdo);
        $st = $pdo->prepare("SELECT body FROM feed_template WHERE tenant_id=? AND channel=? AND status='published' ORDER BY id DESC LIMIT 1");
        $st->execute([$t, $ch]);
        $body = (string)($st->fetchColumn() ?: '');
        return self::json($res, ['ok' => true, 'text' => $body]);
    }

    // ── POST /v395/templates/v2/{channel}/drafts ──
    public static function createDraft(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $b = (array)$req->getParsedBody();
        $by = substr((string)($b['created_by'] ?? 'user'), 0, 64);
        $pdo = Db::pdo(); self::ensure($pdo);
        // 직전 published 를 씨앗으로 body 복사(있으면) — 편집 시작점 제공.
        $seed = '';
        $sq = $pdo->prepare("SELECT body FROM feed_template WHERE tenant_id=? AND channel=? AND status='published' ORDER BY id DESC LIMIT 1");
        $sq->execute([$t, $ch]); $seed = (string)($sq->fetchColumn() ?: '');
        $now = self::now();
        $pdo->prepare("INSERT INTO feed_template (tenant_id,channel,status,body,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
            ->execute([$t, $ch, 'draft', $seed, $by, $by, $now, $now]);
        $id = (string)$pdo->lastInsertId();
        return self::json($res, ['ok' => true, 'draft' => ['id' => $id, 'channel' => $ch, 'status' => 'draft', 'text' => $seed]]);
    }

    // ── GET /v395/templates/v2/{channel}/drafts/{draft_id} ──
    public static function getDraft(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $pdo = Db::pdo(); self::ensure($pdo);
        $r = self::row($pdo, $t, $ch, (string)($args['draft_id'] ?? ''));
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        return self::json($res, ['ok' => true, 'draft' => ['id' => (string)$r['id'], 'channel' => $ch, 'status' => $r['status'], 'text' => (string)($r['body'] ?? '')]]);
    }

    // ── PUT /v395/templates/v2/{channel}/drafts/{draft_id} ──
    public static function saveDraft(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $pdo = Db::pdo(); self::ensure($pdo);
        $id = (string)($args['draft_id'] ?? '');
        $r = self::row($pdo, $t, $ch, $id);
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        if (in_array((string)$r['status'], ['published', 'archived'], true)) return self::json($res, ['ok' => false, 'error' => 'not_editable'], 409);
        $b = (array)$req->getParsedBody();
        $text = (string)($b['text'] ?? '');
        if (strlen($text) > 2000000) return self::json($res, ['ok' => false, 'error' => 'body_too_large'], 413); // [현 차수] MEDIUMTEXT blob 캡(2MB)
        $by = substr((string)($b['updated_by'] ?? 'user'), 0, 64);
        $pdo->prepare("UPDATE feed_template SET body=?, updated_by=?, updated_at=? WHERE tenant_id=? AND channel=? AND id=?")
            ->execute([$text, $by, self::now(), $t, $ch, $id]);
        return self::json($res, ['ok' => true, 'draft' => ['id' => $id, 'status' => $r['status']]]);
    }

    /** 상태 전이 공용(submit/approve). */
    private static function transition(Request $req, Response $res, array $args, string $from, string $to): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $pdo = Db::pdo(); self::ensure($pdo);
        $id = (string)($args['draft_id'] ?? '');
        $r = self::row($pdo, $t, $ch, $id);
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        // draft→submitted→approved 순차 강제(멱등 아님·역행 차단).
        if ((string)$r['status'] !== $from) return self::json($res, ['ok' => false, 'error' => 'invalid_state', 'status' => $r['status']], 409);
        $pdo->prepare("UPDATE feed_template SET status=?, updated_at=? WHERE tenant_id=? AND channel=? AND id=?")
            ->execute([$to, self::now(), $t, $ch, $id]);
        return self::json($res, ['ok' => true, 'draft' => ['id' => $id, 'status' => $to]]);
    }

    // ── POST .../submit ──  (draft→submitted)
    public static function submitDraft(Request $req, Response $res, array $args): Response
    {
        return self::transition($req, $res, $args, 'draft', 'submitted');
    }

    // ── POST .../approve ──  (submitted→approved)
    public static function approveDraft(Request $req, Response $res, array $args): Response
    {
        return self::transition($req, $res, $args, 'submitted', 'approved');
    }

    // ── POST .../publish ──  (approved→published, 이전 published 는 archived) ──
    public static function publishDraft(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $pdo = Db::pdo(); self::ensure($pdo);
        $id = (string)($args['draft_id'] ?? '');
        $r = self::row($pdo, $t, $ch, $id);
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        if ((string)$r['status'] !== 'approved') return self::json($res, ['ok' => false, 'error' => 'must_approve_first', 'status' => $r['status']], 409);
        $now = self::now();
        try {
            $pdo->beginTransaction();
            // 채널당 published 1개 — 기존 published 를 archived 로 강등.
            $pdo->prepare("UPDATE feed_template SET status='archived', updated_at=? WHERE tenant_id=? AND channel=? AND status='published'")
                ->execute([$now, $t, $ch]);
            $pdo->prepare("UPDATE feed_template SET status='published', published_at=?, updated_at=? WHERE tenant_id=? AND channel=? AND id=?")
                ->execute([$now, $now, $t, $ch, $id]);
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::json($res, ['ok' => false, 'error' => 'publish_failed'], 500);
        }
        return self::json($res, ['ok' => true, 'draft' => ['id' => $id, 'status' => 'published']]);
    }

    // ── POST /v395/templates/v2/{channel}/preview ── [282차 R3] 변환 dry-run(무전송·무저장) ──
    //   body:{ text?(스펙 원문), product(샘플 상품) }. text 없으면 발행본 사용. 변환 결과+오류+경고 반환.
    public static function preview(Request $req, Response $res, array $args): Response
    {
        $t = self::tenant($req); if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthenticated'], 401);
        $ch = self::chan($args); if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'unknown_channel'], 400);
        $b = (array)$req->getParsedBody();
        $product = (array)($b['product'] ?? []);
        if (!$product) return self::json($res, ['ok' => false, 'error' => 'product_required'], 400);
        // text(편집중 스펙) 우선 — 저장 전에도 미리보기 가능. 없으면 발행본.
        $spec = null;
        if (isset($b['text']) && trim((string)$b['text']) !== '') {
            $parsed = self::parseSpec((string)$b['text']);
            if (!empty($parsed['fields'])) $spec = $parsed;
        } else {
            $spec = self::resolvePublished(Db::pdo(), $t, $ch);
        }
        if ($spec === null) return self::json($res, ['ok' => true, 'applied' => false, 'input' => $product, 'output' => $product, 'mapped' => [], 'errors' => [], 'warnings' => [], 'note' => 'no_published_template']);
        $r = FeedTransform::apply($spec, $product);
        return self::json($res, [
            'ok' => empty($r['errors']),
            'applied' => true,
            'input' => $product,
            'mapped' => $r['mapped'],
            'output' => array_merge($product, $r['mapped']),
            'errors' => $r['errors'],   // 필수 미충족 target 목록
            'warnings' => $r['warnings'],
            'ops' => FeedTransform::OPS,
            'canonical_fields' => self::CANONICAL_FIELDS,
        ]);
    }
}
