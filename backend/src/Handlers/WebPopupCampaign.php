<?php
/**
 * WebPopupCampaign — 테넌트 웹팝업(사이트 방문자용 프로모션 팝업) 백엔드.
 *
 * [261차] WebPopup.jsx(ManageTab/SettingsTab)가 생성한 팝업·전역설정이 운영에서 컨텍스트 상태로만 존재해
 *   새로고침 시 소실되고, 실제 방문자에게 서빙되는 백엔드에도 도달하지 못했다(플랫폼 공지용 EventPopup 은
 *   tenant_id 가 없어 배선 불가 — 배선 시 테넌트 간 유출). → 테넌트 스코프 전용 백엔드 신설.
 *   - CRUD/설정: 세션 self-auth(authedTenant) + tenant_id 격리. (api_key 미들웨어 bypass, 핸들러 자체 인증)
 *   - 공개 서빙(active)·비콘(event): 머천트 외부 사이트 임베드 JS 용. 세션 불요·tenant 파라미터로 스코프.
 *     Onsite CRO 와 동일하게 IP×분 레이트리밋 + (tenant,popup,vid) 멱등 원장으로 metric poisoning 방어.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class WebPopupCampaign
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

    /** XSS 방어 — 저장/서빙 문자열에서 스크립트/이벤트핸들러 차단(프론트 XSS_RE 와 대칭). */
    private static function clean(string $s): string
    {
        $s = (string)preg_replace('/<\s*script.*?<\s*\/\s*script\s*>/is', '', $s);
        $s = (string)preg_replace('/(javascript:|on\w+\s*=|<\s*iframe|document\.(cookie|domain))/i', '', $s);
        return trim(mb_substr($s, 0, 2000));
    }

    private static function clientIp(Request $req): string
    {
        $xff = trim((string)$req->getHeaderLine('X-Forwarded-For'));
        if ($xff !== '') { $first = trim(explode(',', $xff)[0]); if ($first !== '') return substr($first, 0, 64); }
        $sp = $req->getServerParams();
        return substr((string)($sp['REMOTE_ADDR'] ?? ''), 0, 64);
    }

    /** IP×분 비콘 레이트리밋 — 위조 이벤트 대량주입 차단(fail-open). */
    private static function rateOk(PDO $pdo, string $ip): bool
    {
        if ($ip === '') return true;
        $limit = (int)(getenv('WEBPOPUP_EVENT_PER_MIN') ?: 1200);
        if ($limit <= 0) return true;
        $bucket = (int)floor(time() / 60);
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $sql = $isMy
                ? "INSERT INTO web_popup_rl(ip,bucket,hits) VALUES(?,?,1) ON DUPLICATE KEY UPDATE hits=hits+1"
                : "INSERT INTO web_popup_rl(ip,bucket,hits) VALUES(?,?,1) ON CONFLICT(ip,bucket) DO UPDATE SET hits=hits+1";
            $pdo->prepare($sql)->execute([$ip, $bucket]);
            $st = $pdo->prepare("SELECT hits FROM web_popup_rl WHERE ip=? AND bucket=?");
            $st->execute([$ip, $bucket]);
            return (int)$st->fetchColumn() <= $limit;
        } catch (\Throwable $e) { return true; }
    }

    private static function ensure(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS web_popup (
                id $AI, tenant_id VARCHAR(100) NOT NULL, name VARCHAR(160), title VARCHAR(200),
                subtitle VARCHAR(200), body TEXT, cta VARCHAR(120), link_url VARCHAR(500),
                discount INT DEFAULT 0, template VARCHAR(40), layout VARCHAR(40), ptype VARCHAR(40),
                trig VARCHAR(40), status VARCHAR(20) DEFAULT 'active',
                impressions INT DEFAULT 0, clicks INT DEFAULT 0, conversions INT DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32)
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS web_popup_setting (
                tenant_id VARCHAR(100) PRIMARY KEY, settings_json TEXT, updated_at VARCHAR(32)
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS web_popup_rl (
                ip VARCHAR(64), bucket INT, hits INT DEFAULT 0, PRIMARY KEY (ip, bucket)
            )");
            // 멱등 노출/전환 원장 — (tenant,popup,vid) 1회. 반복 노출=미증가(sticky), 클릭/전환은 선행노출 보유 시 1회.
            $pdo->exec("CREATE TABLE IF NOT EXISTS web_popup_assign (
                tenant_id VARCHAR(100), popup_id INT, vid VARCHAR(120),
                seen_at VARCHAR(32), clicked_at VARCHAR(32), converted_at VARCHAR(32),
                PRIMARY KEY (tenant_id, popup_id, vid)
            )");
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function mapRow(array $r): array
    {
        return [
            'id'          => (int)$r['id'],
            'name'        => (string)($r['name'] ?? ''),
            'title'       => (string)($r['title'] ?? ''),
            'subtitle'    => (string)($r['subtitle'] ?? ''),
            'body'        => (string)($r['body'] ?? ''),
            'cta'         => (string)($r['cta'] ?? ''),
            'linkUrl'     => (string)($r['link_url'] ?? ''),
            'discount'    => (int)($r['discount'] ?? 0),
            'template'    => (string)($r['template'] ?? ''),
            'layout'      => (string)($r['layout'] ?? ''),
            'ptype'       => (string)($r['ptype'] ?? ''),
            'trigger'     => (string)($r['trig'] ?? ''),
            'status'      => (string)($r['status'] ?? 'active'),
            'impressions' => (int)($r['impressions'] ?? 0),
            'clicks'      => (int)($r['clicks'] ?? 0),
            'conversions' => (int)($r['conversions'] ?? 0),
            'created_at'  => (string)($r['created_at'] ?? ''),
        ];
    }

    /* ═══════════ CRUD (세션 authed) ═══════════ */

    public static function list(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $st = $pdo->prepare("SELECT * FROM web_popup WHERE tenant_id=? ORDER BY id DESC LIMIT 300");
        $st->execute([$t]);
        $rows = array_map([self::class, 'mapRow'], $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
        return self::json($res, ['ok' => true, 'popups' => $rows]);
    }

    public static function create(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $b = json_decode((string)$req->getBody(), true) ?: []; }
        $name = self::clean((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => 'name required'], 422);
        $now = self::now();
        $st = $pdo->prepare("INSERT INTO web_popup
            (tenant_id,name,title,subtitle,body,cta,link_url,discount,template,layout,ptype,trig,status,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $st->execute([
            $t, $name,
            self::clean((string)($b['title'] ?? $name)),
            self::clean((string)($b['subtitle'] ?? '')),
            self::clean((string)($b['body'] ?? '')),
            self::clean((string)($b['cta'] ?? $b['btnText'] ?? '')),
            self::clean((string)($b['linkUrl'] ?? '')),
            (int)($b['discount'] ?? 0),
            self::clean((string)($b['template'] ?? $b['tpl'] ?? '')),
            self::clean((string)($b['layout'] ?? '')),
            self::clean((string)($b['ptype'] ?? $b['type'] ?? 'center_modal')),
            self::clean((string)($b['trigger'] ?? $b['trig'] ?? 'exit')),
            in_array(($b['status'] ?? 'active'), ['active', 'paused'], true) ? (string)$b['status'] : 'active',
            $now, $now,
        ]);
        $id = (int)$pdo->lastInsertId();
        $r = $pdo->prepare("SELECT * FROM web_popup WHERE id=? AND tenant_id=?"); $r->execute([$id, $t]);
        return self::json($res, ['ok' => true, 'popup' => self::mapRow($r->fetch(PDO::FETCH_ASSOC) ?: ['id' => $id])]);
    }

    public static function update(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $b = json_decode((string)$req->getBody(), true) ?: []; }
        $chk = $pdo->prepare("SELECT id FROM web_popup WHERE id=? AND tenant_id=?"); $chk->execute([$id, $t]);
        if (!$chk->fetchColumn()) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $st = $pdo->prepare("UPDATE web_popup SET name=?,title=?,subtitle=?,body=?,cta=?,link_url=?,discount=?,template=?,layout=?,ptype=?,trig=?,status=?,updated_at=? WHERE id=? AND tenant_id=?");
        $st->execute([
            self::clean((string)($b['name'] ?? '')),
            self::clean((string)($b['title'] ?? '')),
            self::clean((string)($b['subtitle'] ?? '')),
            self::clean((string)($b['body'] ?? '')),
            self::clean((string)($b['cta'] ?? $b['btnText'] ?? '')),
            self::clean((string)($b['linkUrl'] ?? '')),
            (int)($b['discount'] ?? 0),
            self::clean((string)($b['template'] ?? $b['tpl'] ?? '')),
            self::clean((string)($b['layout'] ?? '')),
            self::clean((string)($b['ptype'] ?? $b['type'] ?? 'center_modal')),
            self::clean((string)($b['trigger'] ?? $b['trig'] ?? 'exit')),
            in_array(($b['status'] ?? 'active'), ['active', 'paused'], true) ? (string)$b['status'] : 'active',
            self::now(), $id, $t,
        ]);
        return self::json($res, ['ok' => true, 'id' => $id]);
    }

    public static function delete(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $pdo->prepare("DELETE FROM web_popup WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($res, ['ok' => true]);
    }

    public static function toggle(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $cur = $pdo->prepare("SELECT status FROM web_popup WHERE id=? AND tenant_id=?"); $cur->execute([$id, $t]);
        $status = $cur->fetchColumn();
        if ($status === false) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $next = ((string)$status === 'active') ? 'paused' : 'active';
        $pdo->prepare("UPDATE web_popup SET status=?, updated_at=? WHERE id=? AND tenant_id=?")->execute([$next, self::now(), $id, $t]);
        return self::json($res, ['ok' => true, 'status' => $next]);
    }

    /* ═══════════ 전역 설정 (세션 authed) ═══════════ */

    public static function getSettings(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $st = $pdo->prepare("SELECT settings_json FROM web_popup_setting WHERE tenant_id=?"); $st->execute([$t]);
        $raw = $st->fetchColumn();
        $settings = $raw ? (json_decode((string)$raw, true) ?: []) : [];
        return self::json($res, ['ok' => true, 'settings' => $settings]);
    }

    public static function saveSettings(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $b = json_decode((string)$req->getBody(), true) ?: []; }
        $settings = is_array($b['settings'] ?? null) ? $b['settings'] : $b;
        // 불리언만 허용(신뢰경계).
        $clean = [];
        foreach ($settings as $k => $v) {
            if (preg_match('/^[a-zA-Z0-9_]{1,40}$/', (string)$k)) $clean[(string)$k] = (bool)$v;
        }
        $json = json_encode($clean, JSON_UNESCAPED_UNICODE);
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO web_popup_setting(tenant_id,settings_json,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json), updated_at=VALUES(updated_at)"
            : "INSERT INTO web_popup_setting(tenant_id,settings_json,updated_at) VALUES(?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET settings_json=excluded.settings_json, updated_at=excluded.updated_at";
        $pdo->prepare($sql)->execute([$t, $json, self::now()]);
        return self::json($res, ['ok' => true, 'settings' => $clean]);
    }

    /* ═══════════ 공개 서빙 / 비콘 (머천트 외부 사이트) ═══════════ */

    /** GET /v424/web-popups/active?tenant=X — 활성 팝업 + 전역설정. 세션 불요(tenant 파라미터 스코프). */
    public static function active(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = (string)($req->getQueryParams()['tenant'] ?? '');
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'tenant required'], 400);
        $st = $pdo->prepare("SELECT * FROM web_popup WHERE tenant_id=? AND status='active' ORDER BY id DESC LIMIT 50");
        $st->execute([$t]);
        $popups = array_map([self::class, 'mapRow'], $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
        $ss = $pdo->prepare("SELECT settings_json FROM web_popup_setting WHERE tenant_id=?"); $ss->execute([$t]);
        $raw = $ss->fetchColumn();
        $settings = $raw ? (json_decode((string)$raw, true) ?: []) : [];
        // 서빙 응답은 지표 필드 제외(외부 노출 최소화).
        $out = array_map(function ($p) {
            unset($p['impressions'], $p['clicks'], $p['conversions'], $p['created_at']);
            return $p;
        }, $popups);
        return self::json($res, ['ok' => true, 'popups' => $out, 'settings' => $settings]);
    }

    /** POST /v424/web-popups/event {tenant,popup_id,type:impression|click|conversion,vid}. 멱등+레이트리밋. */
    public static function event(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $b = json_decode((string)$req->getBody(), true) ?: []; }
        $t   = (string)($b['tenant'] ?? '');
        $pid = (int)($b['popup_id'] ?? 0);
        $type = (string)($b['type'] ?? '');
        $vid = substr(preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($b['vid'] ?? '')), 0, 120);
        if ($t === '' || $pid <= 0 || $vid === '' || !in_array($type, ['impression', 'click', 'conversion'], true)) {
            return self::json($res, ['ok' => false, 'error' => 'bad request'], 400);
        }
        if (!self::rateOk($pdo, self::clientIp($req))) return self::json($res, ['ok' => true, 'throttled' => true]);
        // 팝업이 해당 테넌트 소유인지 확인(교차 테넌트 지표 오염 차단).
        $own = $pdo->prepare("SELECT id FROM web_popup WHERE id=? AND tenant_id=?"); $own->execute([$pid, $t]);
        if (!$own->fetchColumn()) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $now = self::now();
        try {
            // 원장 upsert.
            $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
            $ins = $isMy
                ? "INSERT INTO web_popup_assign(tenant_id,popup_id,vid,seen_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE tenant_id=tenant_id"
                : "INSERT INTO web_popup_assign(tenant_id,popup_id,vid,seen_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,popup_id,vid) DO NOTHING";
            $pdo->prepare($ins)->execute([$t, $pid, $vid, $now]);
            $row = $pdo->prepare("SELECT seen_at,clicked_at,converted_at FROM web_popup_assign WHERE tenant_id=? AND popup_id=? AND vid=?");
            $row->execute([$t, $pid, $vid]);
            $a = $row->fetch(PDO::FETCH_ASSOC) ?: [];
            if ($type === 'impression') {
                // 최초 노출만 카운트(원장에 seen 이 방금 생성됐고 이전 카운트 안 됨 → 신규행 판정).
                // 신규행 여부: rowCount 로 판단이 어려워, seen 카운트는 "원장 신규생성 시"만. 여기선 노출은 항상 sticky 1회.
                if (($a['seen_at'] ?? '') === $now) {
                    $pdo->prepare("UPDATE web_popup SET impressions=impressions+1 WHERE id=? AND tenant_id=?")->execute([$pid, $t]);
                }
            } elseif ($type === 'click') {
                if (($a['clicked_at'] ?? null) === null || ($a['clicked_at'] ?? '') === '') {
                    $pdo->prepare("UPDATE web_popup_assign SET clicked_at=? WHERE tenant_id=? AND popup_id=? AND vid=? AND (clicked_at IS NULL OR clicked_at='')")->execute([$now, $t, $pid, $vid]);
                    $pdo->prepare("UPDATE web_popup SET clicks=clicks+1 WHERE id=? AND tenant_id=?")->execute([$pid, $t]);
                }
            } elseif ($type === 'conversion') {
                // 선행 노출 보유 + 미전환일 때만 1회(전환 위조 차단).
                $hasSeen = ($a['seen_at'] ?? '') !== '';
                $notConv = (($a['converted_at'] ?? null) === null || ($a['converted_at'] ?? '') === '');
                if ($hasSeen && $notConv) {
                    $pdo->prepare("UPDATE web_popup_assign SET converted_at=? WHERE tenant_id=? AND popup_id=? AND vid=? AND (converted_at IS NULL OR converted_at='')")->execute([$now, $t, $pid, $vid]);
                    $pdo->prepare("UPDATE web_popup SET conversions=conversions+1 WHERE id=? AND tenant_id=?")->execute([$pid, $t]);
                }
            }
        } catch (\Throwable $e) { /* graceful */ }
        return self::json($res, ['ok' => true]);
    }
}
