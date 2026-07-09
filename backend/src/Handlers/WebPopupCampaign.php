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
            // [264차] A/B 변형 — 한 팝업의 콘텐츠 변형(A/B/…). 방문자는 vid 결정론적 가중 버킷팅으로 1:1 sticky 할당.
            //   변형별 노출/클릭/전환을 멱등 집계 → 2-표본 비율 z-검정으로 승자 판정. weight=트래픽 배분(정수 가중).
            $pdo->exec("CREATE TABLE IF NOT EXISTS web_popup_variant (
                id $AI, tenant_id VARCHAR(100) NOT NULL, popup_id INT NOT NULL,
                label VARCHAR(60), title VARCHAR(200), subtitle VARCHAR(200), body TEXT,
                cta VARCHAR(120), link_url VARCHAR(500), discount INT DEFAULT 0,
                weight INT DEFAULT 1, status VARCHAR(20) DEFAULT 'active',
                impressions INT DEFAULT 0, clicks INT DEFAULT 0, conversions INT DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32)
            )");
            // 원장에 sticky 변형 할당 기록(변형 교차오염·다변형 노출조작 차단). 기존 테이블엔 멱등 ALTER.
            try { $pdo->exec("ALTER TABLE web_popup_assign ADD COLUMN variant_id INT DEFAULT 0"); } catch (\Throwable $e2) { /* 이미 존재 */ }
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function variantMap(array $r): array
    {
        $impr = (int)($r['impressions'] ?? 0);
        return [
            'id'          => (int)$r['id'],
            'popupId'     => (int)($r['popup_id'] ?? 0),
            'label'       => (string)($r['label'] ?? ''),
            'title'       => (string)($r['title'] ?? ''),
            'subtitle'    => (string)($r['subtitle'] ?? ''),
            'body'        => (string)($r['body'] ?? ''),
            'cta'         => (string)($r['cta'] ?? ''),
            'linkUrl'     => (string)($r['link_url'] ?? ''),
            'discount'    => (int)($r['discount'] ?? 0),
            'weight'      => max(0, (int)($r['weight'] ?? 1)),
            'status'      => (string)($r['status'] ?? 'active'),
            'impressions' => $impr,
            'clicks'      => (int)($r['clicks'] ?? 0),
            'conversions' => (int)($r['conversions'] ?? 0),
            'ctr'         => $impr > 0 ? round(((int)($r['clicks'] ?? 0) / $impr) * 100, 2) : 0,
            'cvr'         => $impr > 0 ? round(((int)($r['conversions'] ?? 0) / $impr) * 100, 2) : 0,
        ];
    }

    /** 표준정규 CDF(erf 근사, Abramowitz–Stegun 7.1.26). 외부 라이브러리 불요. */
    private static function normCdf(float $x): float
    {
        $t = 1.0 / (1.0 + 0.3275911 * abs($x) / M_SQRT2);
        $y = 1.0 - (((((1.061405429 * $t - 1.453152027) * $t) + 1.421413741) * $t - 0.284496736) * $t + 0.254829592) * $t * exp(-($x * $x) / 2.0);
        return $x >= 0 ? 0.5 * (1 + $y) : 0.5 * (1 - $y);
    }

    /** 2-표본 비율 z-검정(pooled) — 변형 B의 전환율이 기준 A와 유의하게 다른지. two-tailed p-value 반환. */
    private static function propZTest(int $cA, int $nA, int $cB, int $nB): array
    {
        if ($nA < 1 || $nB < 1) return ['z' => 0.0, 'p' => 1.0, 'lift' => 0.0];
        $pA = $cA / $nA; $pB = $cB / $nB;
        $pPool = ($cA + $cB) / ($nA + $nB);
        $se = sqrt(max(0.0, $pPool * (1 - $pPool) * (1 / $nA + 1 / $nB)));
        if ($se <= 0) return ['z' => 0.0, 'p' => 1.0, 'lift' => 0.0];
        $z = ($pB - $pA) / $se;
        $p = 2 * (1 - self::normCdf(abs($z)));
        $lift = $pA > 0 ? round((($pB - $pA) / $pA) * 100, 1) : 0.0;
        return ['z' => round($z, 3), 'p' => round(max(0.0, min(1.0, $p)), 4), 'lift' => $lift];
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
            'type'        => (string)($r['ptype'] ?? ''), // [266차 계약불일치] 프론트 p.type 소비(트리거 라벨)→ptype 별칭
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

    /* ═══════════ A/B 변형 (세션 authed) ═══════════ */

    /** 팝업이 이 테넌트 소유인지 확인. 소유면 popup_id, 아니면 0. */
    private static function ownsPopup(PDO $pdo, string $t, int $pid): int
    {
        if ($pid <= 0 || $t === '') return 0;
        $st = $pdo->prepare("SELECT id FROM web_popup WHERE id=? AND tenant_id=?");
        $st->execute([$pid, $t]);
        return (int)$st->fetchColumn();
    }

    /** GET /v424/web-popups/{id}/variants — 변형 목록 + 변형별 지표 + z-검정 유의성/승자. */
    public static function variants(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $pid = (int)($args['id'] ?? 0);
        if (!self::ownsPopup($pdo, $t, $pid)) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $st = $pdo->prepare("SELECT * FROM web_popup_variant WHERE tenant_id=? AND popup_id=? ORDER BY id ASC LIMIT 20");
        $st->execute([$t, $pid]);
        $variants = array_map([self::class, 'variantMap'], $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
        return self::json($res, ['ok' => true, 'variants' => $variants, 'test' => self::evaluateTest($variants)]);
    }

    /** 변형 배열 → 승자/유의성 판정. 기준(control)=최초 변형. 전환율(conversions/impressions) 비교. */
    private static function evaluateTest(array $variants): array
    {
        $active = array_values(array_filter($variants, fn($v) => $v['status'] === 'active'));
        if (count($active) < 2) {
            return ['status' => 'insufficient_variants', 'significant' => false, 'winnerId' => 0, 'pValue' => 1.0, 'lift' => 0.0, 'confidence' => 0.0];
        }
        $minSample = (int)(getenv('WEBPOPUP_AB_MIN_SAMPLE') ?: 100);
        $control = $active[0];
        // 승자 후보 = 전환율 최고 변형(노출>0). control 대비 z-검정.
        $best = $control; $bestCvr = $control['impressions'] > 0 ? $control['conversions'] / $control['impressions'] : -1;
        foreach ($active as $v) {
            $cvr = $v['impressions'] > 0 ? $v['conversions'] / $v['impressions'] : -1;
            if ($cvr > $bestCvr) { $bestCvr = $cvr; $best = $v; }
        }
        $z = self::propZTest((int)$control['conversions'], (int)$control['impressions'], (int)$best['conversions'], (int)$best['impressions']);
        $enoughSample = $control['impressions'] >= $minSample && $best['impressions'] >= $minSample;
        // [현 차수 잔여] ★Bonferroni 다중비교 보정 — best-of-N 변형을 α=0.05 로 판정하면 변형 수만큼 위양성이
        //   팽창(5개 변형 → 실질 α≈0.23)해 무효 변형을 '승자'로 오선언했다. 비교횟수(=대조군 제외 변형수)로 α 보정.
        $numComparisons = max(1, count($active) - 1);
        $alpha = 0.05 / $numComparisons;
        $significant = $enoughSample && $best['id'] !== $control['id'] && $z['p'] < $alpha && $bestCvr > ($control['impressions'] > 0 ? $control['conversions'] / $control['impressions'] : 0);
        return [
            'status'      => !$enoughSample ? 'collecting' : ($significant ? 'significant' : 'no_winner'),
            'significant' => $significant,
            'winnerId'    => $significant ? $best['id'] : 0,
            'controlId'   => $control['id'],
            'pValue'      => $z['p'],
            'alpha'       => round($alpha, 5),       // Bonferroni 보정 임계
            'comparisons' => $numComparisons,
            'lift'        => $z['lift'],
            'confidence'  => round(max(0.0, min(100.0, (1 - $z['p']) * 100)), 1),
            'minSample'   => $minSample,
        ];
    }

    public static function createVariant(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $pid = (int)($args['id'] ?? 0);
        if (!self::ownsPopup($pdo, $t, $pid)) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM web_popup_variant WHERE tenant_id=? AND popup_id=?");
        $cnt->execute([$t, $pid]);
        $existing = (int)$cnt->fetchColumn();
        if ($existing >= 6) return self::json($res, ['ok' => false, 'error' => 'variant limit (6) reached'], 422);
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $b = json_decode((string)$req->getBody(), true) ?: []; }
        $label = self::clean((string)($b['label'] ?? ''));
        if ($label === '') $label = 'V' . ($existing + 1);
        $now = self::now();
        $st = $pdo->prepare("INSERT INTO web_popup_variant
            (tenant_id,popup_id,label,title,subtitle,body,cta,link_url,discount,weight,status,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $st->execute([
            $t, $pid, mb_substr($label, 0, 60),
            self::clean((string)($b['title'] ?? '')),
            self::clean((string)($b['subtitle'] ?? '')),
            self::clean((string)($b['body'] ?? '')),
            self::clean((string)($b['cta'] ?? '')),
            self::clean((string)($b['linkUrl'] ?? '')),
            (int)($b['discount'] ?? 0),
            max(1, min(1000, (int)($b['weight'] ?? 1))),
            in_array(($b['status'] ?? 'active'), ['active', 'paused'], true) ? (string)$b['status'] : 'active',
            $now, $now,
        ]);
        $id = (int)$pdo->lastInsertId();
        $r = $pdo->prepare("SELECT * FROM web_popup_variant WHERE id=? AND tenant_id=?"); $r->execute([$id, $t]);
        return self::json($res, ['ok' => true, 'variant' => self::variantMap($r->fetch(PDO::FETCH_ASSOC) ?: ['id' => $id])]);
    }

    public static function updateVariant(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $vid = (int)($args['vid'] ?? 0);
        $chk = $pdo->prepare("SELECT id FROM web_popup_variant WHERE id=? AND tenant_id=?"); $chk->execute([$vid, $t]);
        if (!$chk->fetchColumn()) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $b = json_decode((string)$req->getBody(), true) ?: []; }
        $st = $pdo->prepare("UPDATE web_popup_variant SET label=?,title=?,subtitle=?,body=?,cta=?,link_url=?,discount=?,weight=?,status=?,updated_at=? WHERE id=? AND tenant_id=?");
        $st->execute([
            mb_substr(self::clean((string)($b['label'] ?? '')), 0, 60),
            self::clean((string)($b['title'] ?? '')),
            self::clean((string)($b['subtitle'] ?? '')),
            self::clean((string)($b['body'] ?? '')),
            self::clean((string)($b['cta'] ?? '')),
            self::clean((string)($b['linkUrl'] ?? '')),
            (int)($b['discount'] ?? 0),
            max(1, min(1000, (int)($b['weight'] ?? 1))),
            in_array(($b['status'] ?? 'active'), ['active', 'paused'], true) ? (string)$b['status'] : 'active',
            self::now(), $vid, $t,
        ]);
        return self::json($res, ['ok' => true, 'id' => $vid]);
    }

    public static function deleteVariant(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $vid = (int)($args['vid'] ?? 0);
        $pdo->prepare("DELETE FROM web_popup_variant WHERE id=? AND tenant_id=?")->execute([$vid, $t]);
        return self::json($res, ['ok' => true]);
    }

    /** POST /v424/web-popups/variants/{vid}/promote — 승자 변형을 팝업 본문으로 승격(무손실: 변형은 유지). */
    public static function promoteVariant(Request $req, Response $res, array $args): Response
    {
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $vid = (int)($args['vid'] ?? 0);
        $v = $pdo->prepare("SELECT * FROM web_popup_variant WHERE id=? AND tenant_id=?"); $v->execute([$vid, $t]);
        $row = $v->fetch(PDO::FETCH_ASSOC);
        if (!$row) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        $pid = (int)$row['popup_id'];
        // 승자 콘텐츠를 팝업 본문으로 복사(방문자 서빙 기본값). 나머지 변형은 paused(무손실 보존).
        $upd = $pdo->prepare("UPDATE web_popup SET title=?,subtitle=?,body=?,cta=?,link_url=?,discount=?,updated_at=? WHERE id=? AND tenant_id=?");
        $upd->execute([
            (string)($row['title'] ?? ''), (string)($row['subtitle'] ?? ''), (string)($row['body'] ?? ''),
            (string)($row['cta'] ?? ''), (string)($row['link_url'] ?? ''), (int)($row['discount'] ?? 0),
            self::now(), $pid, $t,
        ]);
        $pdo->prepare("UPDATE web_popup_variant SET status='paused', updated_at=? WHERE popup_id=? AND tenant_id=? AND id<>?")
            ->execute([self::now(), $pid, $t, $vid]);
        return self::json($res, ['ok' => true, 'promoted' => $vid, 'popupId' => $pid]);
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
        // [264차] 활성 A/B 변형을 팝업별 그룹핑(방문자 서빙용 — 콘텐츠+가중치만, 지표 제외).
        $vst = $pdo->prepare("SELECT id,popup_id,label,title,subtitle,body,cta,link_url,discount,weight FROM web_popup_variant WHERE tenant_id=? AND status='active' ORDER BY id ASC");
        $vst->execute([$t]);
        $vByPopup = [];
        foreach ($vst->fetchAll(PDO::FETCH_ASSOC) ?: [] as $vr) {
            $vByPopup[(int)$vr['popup_id']][] = [
                'id' => (int)$vr['id'], 'label' => (string)($vr['label'] ?? ''),
                'title' => (string)($vr['title'] ?? ''), 'subtitle' => (string)($vr['subtitle'] ?? ''),
                'body' => (string)($vr['body'] ?? ''), 'cta' => (string)($vr['cta'] ?? ''),
                'linkUrl' => (string)($vr['link_url'] ?? ''), 'discount' => (int)($vr['discount'] ?? 0),
                'weight' => max(1, (int)($vr['weight'] ?? 1)),
            ];
        }
        // 서빙 응답은 지표 필드 제외(외부 노출 최소화). 변형 ≥2개면 A/B 활성.
        $out = array_map(function ($p) use ($vByPopup) {
            unset($p['impressions'], $p['clicks'], $p['conversions'], $p['created_at']);
            $vs = $vByPopup[(int)$p['id']] ?? [];
            if (count($vs) >= 2) { $p['variants'] = $vs; }
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
        $clientVar = (int)($b['variant_id'] ?? 0);
        if ($t === '' || $pid <= 0 || $vid === '' || !in_array($type, ['impression', 'click', 'conversion'], true)) {
            return self::json($res, ['ok' => false, 'error' => 'bad request'], 400);
        }
        if (!self::rateOk($pdo, self::clientIp($req))) return self::json($res, ['ok' => true, 'throttled' => true]);
        // 팝업이 해당 테넌트 소유인지 확인(교차 테넌트 지표 오염 차단).
        $own = $pdo->prepare("SELECT id FROM web_popup WHERE id=? AND tenant_id=?"); $own->execute([$pid, $t]);
        if (!$own->fetchColumn()) return self::json($res, ['ok' => false, 'error' => 'not found'], 404);
        // 클라 제출 변형이 이 팝업/테넌트 소유인지 검증(위조 차단). 미소유·0이면 변형집계 없음(0).
        $var = 0;
        if ($clientVar > 0) {
            $vchk = $pdo->prepare("SELECT id FROM web_popup_variant WHERE id=? AND popup_id=? AND tenant_id=?");
            $vchk->execute([$clientVar, $pid, $t]);
            if ($vchk->fetchColumn()) $var = $clientVar;
        }
        $now = self::now();
        try {
            $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
            // 원장 upsert — 최초 노출 시 sticky 변형 할당 확정(first-write-wins). 이후 이벤트는 저장된 변형 사용.
            $ins = $isMy
                ? "INSERT INTO web_popup_assign(tenant_id,popup_id,vid,seen_at,variant_id) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE tenant_id=tenant_id"
                : "INSERT INTO web_popup_assign(tenant_id,popup_id,vid,seen_at,variant_id) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,popup_id,vid) DO NOTHING";
            $pdo->prepare($ins)->execute([$t, $pid, $vid, $now, $var]);
            $row = $pdo->prepare("SELECT seen_at,clicked_at,converted_at,variant_id FROM web_popup_assign WHERE tenant_id=? AND popup_id=? AND vid=?");
            $row->execute([$t, $pid, $vid]);
            $a = $row->fetch(PDO::FETCH_ASSOC) ?: [];
            // sticky 변형 = 원장에 최초 확정된 값(클라가 이후 다른 변형 제출해도 무시 → 다변형 노출조작 차단).
            $sv = (int)($a['variant_id'] ?? 0);
            $bumpVar = function (string $col) use ($pdo, $sv, $t, $pid) {
                if ($sv > 0) { $pdo->prepare("UPDATE web_popup_variant SET $col=$col+1 WHERE id=? AND popup_id=? AND tenant_id=?")->execute([$sv, $pid, $t]); }
            };
            if ($type === 'impression') {
                if (($a['seen_at'] ?? '') === $now) {
                    $pdo->prepare("UPDATE web_popup SET impressions=impressions+1 WHERE id=? AND tenant_id=?")->execute([$pid, $t]);
                    $bumpVar('impressions');
                }
            } elseif ($type === 'click') {
                if (($a['clicked_at'] ?? null) === null || ($a['clicked_at'] ?? '') === '') {
                    $pdo->prepare("UPDATE web_popup_assign SET clicked_at=? WHERE tenant_id=? AND popup_id=? AND vid=? AND (clicked_at IS NULL OR clicked_at='')")->execute([$now, $t, $pid, $vid]);
                    $pdo->prepare("UPDATE web_popup SET clicks=clicks+1 WHERE id=? AND tenant_id=?")->execute([$pid, $t]);
                    $bumpVar('clicks');
                }
            } elseif ($type === 'conversion') {
                // 선행 노출 보유 + 미전환일 때만 1회(전환 위조 차단).
                $hasSeen = ($a['seen_at'] ?? '') !== '';
                $notConv = (($a['converted_at'] ?? null) === null || ($a['converted_at'] ?? '') === '');
                if ($hasSeen && $notConv) {
                    $pdo->prepare("UPDATE web_popup_assign SET converted_at=? WHERE tenant_id=? AND popup_id=? AND vid=? AND (converted_at IS NULL OR converted_at='')")->execute([$now, $t, $pid, $vid]);
                    $pdo->prepare("UPDATE web_popup SET conversions=conversions+1 WHERE id=? AND tenant_id=?")->execute([$pid, $t]);
                    $bumpVar('conversions');
                }
            }
        } catch (\Throwable $e) { /* graceful */ }
        return self::json($res, ['ok' => true]);
    }

    /** GET /v424/web-popups/embed.js?tenant=X — [262차] 머천트 외부사이트 임베드 로더(자기완결 vanilla JS).
     *  트리거(exit-intent/시간/스크롤/유휴) 감지 → active fetch → 렌더 → impression/click/conversion 비콘.
     *  공개(세션 불요). tenant 파라미터 스코프. api_key 미들웨어 bypass(full-public). */
    public static function embedJs(Request $req, Response $res): Response
    {
        $t = (string)($req->getQueryParams()['tenant'] ?? '');
        // tenant 는 영숫자/._- 만 허용(JS 리터럴 주입 방어).
        $t = substr(preg_replace('/[^a-zA-Z0-9._-]/', '', $t), 0, 100);
        $base = self::publicBase($req) . '/api';
        $tj = json_encode($t, JSON_UNESCAPED_SLASHES);
        $bj = json_encode($base, JSON_UNESCAPED_SLASHES);
        // 자기완결 IIFE — 외부 의존 없음. metric poisoning 은 백엔드 (tenant,popup,vid) 멱등원장이 방어.
        $js = <<<JS
/* GenieGo Web Popup Loader — tenant-scoped, self-contained. */
(function(){
  "use strict";
  var TENANT={$tj}, BASE={$bj};
  if(!TENANT) return;
  try {
    var VK="__gg_pop_vid", vid=localStorage.getItem(VK);
    if(!vid){ vid=(Date.now().toString(36)+Math.random().toString(36).slice(2,10)); localStorage.setItem(VK,vid); }
    function beacon(pid,type,vr){
      try{
        var body=JSON.stringify({tenant:TENANT,popup_id:pid,type:type,vid:vid,variant_id:vr||0});
        if(navigator.sendBeacon){ navigator.sendBeacon(BASE+"/v424/web-popups/event", new Blob([body],{type:"application/json"})); }
        else{ fetch(BASE+"/v424/web-popups/event",{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:true}).catch(function(){}); }
      }catch(e){}
    }
    /* A/B: vid+popup 결정론적 가중 버킷팅 — 방문자당 sticky 1변형(서버 원장과 정합). */
    function hashStr(s){ var h=2166136261,i; for(i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h>>>0; }
    function pickVariant(p){
      var vs=p&&p.variants; if(!vs||vs.length<2) return null;
      var total=0,i,w; for(i=0;i<vs.length;i++){ total+=Math.max(1,(vs[i].weight|0)||1); }
      var r=hashStr(vid+":"+p.id)%total, acc=0;
      for(i=0;i<vs.length;i++){ acc+=Math.max(1,(vs[i].weight|0)||1); if(r<acc) return vs[i]; }
      return vs[0];
    }
    var SHOWN={};
    function esc(s){ var d=document.createElement("div"); d.textContent=(s==null?"":String(s)); return d.innerHTML; }
    function render(p){
      if(SHOWN[p.id]) return; SHOWN[p.id]=1;
      var ov=document.createElement("div");
      ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true");
      ov.style.cssText="position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif";
      var card=document.createElement("div");
      card.style.cssText="background:#fff;max-width:420px;width:100%;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);padding:28px 26px;position:relative;text-align:center";
      var x=document.createElement("button");
      x.textContent="×"; x.setAttribute("aria-label","close");
      x.style.cssText="position:absolute;top:10px;right:14px;border:none;background:none;font-size:26px;line-height:1;color:#94a3b8;cursor:pointer";
      x.onclick=function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); };
      var h="";
      if(p.title) h+="<div style='font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px'>"+esc(p.title)+"</div>";
      if(p.subtitle) h+="<div style='font-size:14px;color:#6366f1;font-weight:700;margin-bottom:8px'>"+esc(p.subtitle)+"</div>";
      if(p.discount>0) h+="<div style='font-size:34px;font-weight:900;color:#f97316;margin:6px 0'>"+esc(p.discount)+"% OFF</div>";
      if(p.body) h+="<div style='font-size:13px;color:#475569;line-height:1.6;margin-bottom:16px'>"+esc(p.body)+"</div>";
      card.innerHTML=h;
      if(p.cta){
        var a=document.createElement("a");
        a.textContent=p.cta; a.href=p.linkUrl||"#"; if(p.linkUrl) a.target="_blank"; a.rel="noopener";
        a.style.cssText="display:inline-block;margin-top:6px;padding:12px 28px;border-radius:99px;background:linear-gradient(135deg,#f97316,#f7931e);color:#fff;font-weight:800;font-size:14px;text-decoration:none;cursor:pointer";
        /* [현 차수 P3] CTA 클릭은 'click' 만 기록 — 기존엔 클릭 즉시 'conversion' 도 쐈다(클릭=전환 오등식→
           전환율 100% 날조). 실 전환은 머천트 구매완료 페이지에서 GenieGoPopup.conversion(pid) 호출로 집계. */
        a.onclick=function(){ beacon(p.id,"click",p.__variant); };
        card.appendChild(a);
      }
      card.appendChild(x); ov.appendChild(card);
      ov.addEventListener("click",function(e){ if(e.target===ov && ov.parentNode) ov.parentNode.removeChild(ov); });
      document.body.appendChild(ov);
      beacon(p.id,"impression",p.__variant);
    }
    function arm(p){
      var trig=(p.trigger||"exit");
      if(trig==="time"){ setTimeout(function(){ render(p); }, 6000); }
      else if(trig==="scroll"){
        var f=function(){ var h=document.documentElement; if((h.scrollTop+window.innerHeight)/h.scrollHeight>0.5){ render(p); window.removeEventListener("scroll",f); } };
        window.addEventListener("scroll",f,{passive:true});
      }
      else if(trig==="inactive"){ var tm; var r=function(){ clearTimeout(tm); tm=setTimeout(function(){ render(p); },15000); }; ["mousemove","keydown","scroll","touchstart"].forEach(function(ev){ document.addEventListener(ev,r,{passive:true}); }); r(); }
      else { /* exit-intent */ var g=function(e){ if(e.clientY<=0){ render(p); document.removeEventListener("mouseout",g); } }; document.addEventListener("mouseout",g); }
    }
    /* [현 차수 P3] 머천트 구매완료 페이지에서 실 전환 집계용 공개 API — 기존엔 settings 미소비로
       빈도캡·모바일·조용시간이 전혀 작동 안 했고 전환은 클릭으로 날조됐다. window.GenieGoPopup.conversion(pid) 로 실 전환 기록. */
    window.GenieGoPopup=window.GenieGoPopup||{ conversion:function(pid,vr){ beacon(pid,"conversion",vr||0); } };
    fetch(BASE+"/v424/web-popups/active?tenant="+encodeURIComponent(TENANT))
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(d){ if(!d||!d.ok) return;
        var S=d.settings||{};
        /* 모바일 노출 토글 — 설정이 명시적으로 끄면 모바일에서 미표시 */
        var isMobile=/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"");
        if(isMobile && (S.showOnMobile===false||S.mobile===false||S.mobileEnabled===false)) return;
        /* 조용시간(quiet hours) — 방문자 로컬시간 기준 차단 */
        var qs=(S.quietStart!=null?(S.quietStart|0):null), qe=(S.quietEnd!=null?(S.quietEnd|0):null);
        if(qs!=null&&qe!=null&&qs!==qe){ var hr=new Date().getHours(); var inQ=(qs<qe)?(hr>=qs&&hr<qe):(hr>=qs||hr<qe); if(inQ) return; }
        /* 빈도캡 — 방문자당 표시 간격(시간). 미설정 시 세션당 1회 */
        var capH=(S.frequencyHours!=null?S.frequencyHours:(S.frequency!=null?S.frequency:null));
        var FK="__gg_pop_last_"+TENANT;
        if(capH!=null){ var last=+(localStorage.getItem(FK)||0); if(last && (Date.now()-last)<capH*3600000) return; }
        else { if(sessionStorage.getItem(FK)) return; }
        if(d.popups&&d.popups.length){
          var p=d.popups[0], v=pickVariant(p);
          if(v){ p.__variant=v.id;
            if(v.title) p.title=v.title; if(v.subtitle) p.subtitle=v.subtitle; if(v.body) p.body=v.body;
            if(v.cta) p.cta=v.cta; if(v.linkUrl) p.linkUrl=v.linkUrl;
            if(typeof v.discount==="number") p.discount=v.discount;
          }
          try{ if(capH!=null) localStorage.setItem(FK,String(Date.now())); else sessionStorage.setItem(FK,"1"); }catch(e){}
          arm(p);
        }
      })
      .catch(function(){});
  } catch(e){}
})();
JS;
        $res->getBody()->write($js);
        return $res
            ->withHeader('Content-Type', 'application/javascript; charset=utf-8')
            ->withHeader('Cache-Control', 'public, max-age=300')
            ->withHeader('Access-Control-Allow-Origin', '*');
    }

    /** 임베드 절대경로용 공개 베이스 URL(내부 localhost 호출은 운영 도메인 정규화). */
    private static function publicBase(Request $req): string
    {
        $uri = $req->getUri();
        $host = $uri->getHost() ?: 'www.genieroi.com';
        $scheme = $uri->getScheme() ?: 'https';
        if ($host === 'localhost' || $host === '127.0.0.1') { $host = 'www.genieroi.com'; $scheme = 'https'; }
        return $scheme . '://' . $host;
    }
}
