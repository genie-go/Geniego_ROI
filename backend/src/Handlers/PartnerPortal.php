<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use PDO;

/**
 * 212차 #3-B: 파트너 서브계정 포털 (초엔터프라이즈/SaaS급).
 *
 * 매입처(supplier)·물류처(logistics)·창고처(warehouse) 가 각자 별도 로그인 ID 로 접속해
 *   "공유된 정보만" 스코프 한정으로 등록·수정·열람한다. 본사 직원계정과 완전 분리(은행급 격리).
 *
 * - partner_account: 파트너 로그인 계정(테넌트별, 유형+대상엔티티 연결, bcrypt 비번)
 * - partner_session: 파트너 전용 세션 토큰(본사 user_session 과 분리)
 * - 관리자(UserAuth requirePro 세션): 파트너 계정 발급/목록/비번재설정/삭제
 * - 파트너(partner token): 로그인·내정보·유형별 스코프 데이터(본인 것만)
 *
 * 유형별 최소권한:
 *   supplier  → wms_supply_orders (본인 매입처 발주내역) 열람/상태수정/입고등록
 *   logistics → wms_picking (본인 배정 출고/피킹) 열람/송장·상태 수정
 *   warehouse → wms_movements + wms_stock (본인 창고) 열람 / 입출고 등록
 */
class PartnerPortal
{
    private const TYPES = ['supplier', 'logistics', 'warehouse'];

    private static function db(): PDO { return Db::pdo(); }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b;
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($mysql) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS partner_account (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                partner_type VARCHAR(20) NOT NULL, partner_id INT NOT NULL DEFAULT 0,
                partner_name VARCHAR(200) NOT NULL DEFAULT '', login_id VARCHAR(120) NOT NULL,
                password_hash VARCHAR(255) NOT NULL, name VARCHAR(120), active TINYINT(1) DEFAULT 1,
                last_login VARCHAR(32), created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_partner_login (login_id), KEY idx_partner_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS partner_session (
                token VARCHAR(96) PRIMARY KEY, partner_account_id INT NOT NULL, tenant_id VARCHAR(100) NOT NULL,
                expires_at VARCHAR(32), created_at VARCHAR(32), KEY idx_psess_acct (partner_account_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS partner_account (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, partner_type TEXT NOT NULL, partner_id INTEGER NOT NULL DEFAULT 0, partner_name TEXT NOT NULL DEFAULT '', login_id TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT, active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS partner_session (token TEXT PRIMARY KEY, partner_account_id INTEGER NOT NULL, tenant_id TEXT NOT NULL, expires_at TEXT, created_at TEXT)");
        }
        // [231차 #3] 파트너 프로필 사진(Base64 data-URL) — 락게이트 우회 멱등 ALTER
        try { $pdo->exec("ALTER TABLE partner_account ADD COLUMN photo " . ($mysql ? "MEDIUMTEXT" : "TEXT")); } catch (\Throwable $e) {}
    }

    /* ═══════════════ 관리자(본사) — 파트너 계정 관리 ═══════════════ */
    /* GET /auth/partners — 본 테넌트 파트너 계정 목록(비번 제외) */
    public static function listAccounts(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = (UserAuth::authedTenant($req) ?? 'demo');
        $st = self::db()->prepare("SELECT id,partner_type,partner_id,partner_name,login_id,name,active,last_login,created_at,photo FROM partner_account WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([$t]);
        return self::json($res, ['ok' => true, 'partners' => $st->fetchAll(PDO::FETCH_ASSOC) ?: []]);
    }

    /* POST /auth/partners — 파트너 계정 발급. body: {partner_type, partner_id, partner_name, login_id, password, name} */
    public static function createAccount(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = (UserAuth::authedTenant($req) ?? 'demo'); $b = self::body($req); $pdo = self::db();
        $type = (string)($b['partner_type'] ?? '');
        if (!in_array($type, self::TYPES, true)) return self::json($res, ['ok' => false, 'error' => 'partner_type 은 supplier/logistics/warehouse'], 422);
        $loginId = strtolower(trim((string)($b['login_id'] ?? '')));
        $pw = (string)($b['password'] ?? '');
        if ($loginId === '' || strlen($pw) < 8) return self::json($res, ['ok' => false, 'error' => '로그인 ID 와 8자 이상 비밀번호가 필요합니다.'], 422);
        // [257차 보안 하드닝] 스코프 필수 검증 — 빈 스코프(partner_name/partner_id 미지정) 계정은 data() 의 WHERE supplier=''
        //   /wh_id='0' 로 동일 테넌트 내 무주(unassigned) 행을 과열람할 수 있다(크로스테넌트는 여전히 차단). 발급 단계에서 차단.
        $pnameIn = trim((string)($b['partner_name'] ?? ''));
        $pidIn   = (int)($b['partner_id'] ?? 0);
        if (($type === 'supplier' || $type === 'logistics') && $pnameIn === '') return self::json($res, ['ok' => false, 'error' => '공급처/물류처 계정은 거래처명(partner_name)이 필수입니다.'], 422);
        if ($type === 'warehouse' && $pidIn <= 0) return self::json($res, ['ok' => false, 'error' => '창고처 계정은 창고 지정(partner_id)이 필수입니다.'], 422);
        $dup = $pdo->prepare("SELECT 1 FROM partner_account WHERE login_id=?"); $dup->execute([$loginId]);
        if ($dup->fetchColumn()) return self::json($res, ['ok' => false, 'error' => '이미 사용 중인 로그인 ID 입니다.'], 409);
        // 212차 #3: 파트너 계정도 구독 플랜 한도 내에서만 발급 — 유형별(supplier→suppliers/logistics→logistics/warehouse→warehouses). 초과 시 402.
        try {
            $dimMap = ['supplier' => 'suppliers', 'logistics' => 'logistics', 'warehouse' => 'warehouses'];
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM partner_account WHERE tenant_id=? AND partner_type=?");
            $cnt->execute([$t, $type]);
            if ($lim = \Genie\PlanLimits::exceeded($pdo, \Genie\PlanLimits::tenantPlan($pdo, $t), $dimMap[$type], (int)$cnt->fetchColumn())) {
                return self::json($res, $lim, 402);
            }
        } catch (\Throwable $e) { /* 가용성 우선 */ }
        $now = self::now();
        $pdo->prepare("INSERT INTO partner_account (tenant_id,partner_type,partner_id,partner_name,login_id,password_hash,name,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)")
            ->execute([$t, $type, (int)($b['partner_id'] ?? 0), (string)($b['partner_name'] ?? ''), $loginId, password_hash($pw, PASSWORD_DEFAULT), (string)($b['name'] ?? ''), $now, $now]);
        $newId = (int)$pdo->lastInsertId();
        // [231차 #3] 프로필 사진(Base64) — post-insert UPDATE(있을 때만)
        $photo = (string)($b['photo'] ?? '');
        if ($photo !== '' && $newId > 0) { try { $pdo->prepare("UPDATE partner_account SET photo=? WHERE id=?")->execute([$photo, $newId]); } catch (\Throwable $e) {} }
        return self::json($res, ['ok' => true, 'id' => $newId], 201);
    }

    /* PUT /auth/partners/{id} — 비번 재설정/활성토글/이름수정 */
    public static function updateAccount(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = (UserAuth::authedTenant($req) ?? 'demo'); $b = self::body($req); $pdo = self::db();
        $id = (int)($args['id'] ?? 0);
        $sets = []; $vals = [];
        if (isset($b['password']) && strlen((string)$b['password']) >= 8) { $sets[] = 'password_hash=?'; $vals[] = password_hash((string)$b['password'], PASSWORD_DEFAULT); }
        if (isset($b['active'])) { $sets[] = 'active=?'; $vals[] = !empty($b['active']) ? 1 : 0; }
        if (isset($b['name'])) { $sets[] = 'name=?'; $vals[] = (string)$b['name']; }
        if (array_key_exists('photo', $b)) { $sets[] = 'photo=?'; $vals[] = (string)$b['photo']; } // [231차 #3] 프로필 사진
        if (!$sets) return self::json($res, ['ok' => false, 'error' => '변경할 항목이 없습니다.'], 422);
        $sets[] = 'updated_at=?'; $vals[] = self::now();
        $vals[] = $id; $vals[] = $t;
        $upd = $pdo->prepare("UPDATE partner_account SET " . implode(',', $sets) . " WHERE id=? AND tenant_id=?");
        $upd->execute($vals);
        // [233차 감사 P1] 비번/비활성 변경 시 세션 무효화 — ★계정 UPDATE 가 이 테넌트 행을 실제로 바꿨을 때만 purge.
        //   기존엔 tenant 무관 partner_account_id 로 삭제 → 타 테넌트 파트너 세션을 강제 종료(로그아웃 DoS) 가능했음.
        if ($upd->rowCount() > 0 && (isset($b['password']) || isset($b['active']))) {
            try { $pdo->prepare("DELETE FROM partner_session WHERE partner_account_id=?")->execute([$id]); } catch (\Throwable $e) {}
        }
        return self::json($res, ['ok' => true]);
    }

    /* DELETE /auth/partners/{id} */
    public static function deleteAccount(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = (UserAuth::authedTenant($req) ?? 'demo'); $id = (int)($args['id'] ?? 0); $pdo = self::db();
        $del = $pdo->prepare("DELETE FROM partner_account WHERE id=? AND tenant_id=?");
        $del->execute([$id, $t]);
        // [233차 감사 P1] 교차테넌트 세션삭제 차단 — 계정이 이 테넌트 소유라 실제 삭제됐을 때만 세션 purge.
        if ($del->rowCount() > 0) { try { $pdo->prepare("DELETE FROM partner_session WHERE partner_account_id=?")->execute([$id]); } catch (\Throwable $e) {} }
        return self::json($res, ['ok' => true]);
    }

    /* ═══════════════ 파트너 — 로그인/세션 ═══════════════ */
    /* POST /partner/login — body: {login_id, password} → 파트너 토큰 */
    public static function login(Request $req, Response $res): Response
    {
        self::ensureTables();
        $b = self::body($req); $pdo = self::db();
        $loginId = strtolower(trim((string)($b['login_id'] ?? '')));
        $pw = (string)($b['password'] ?? '');
        if ($loginId === '' || $pw === '') return self::json($res, ['ok' => false, 'error' => '로그인 ID 와 비밀번호를 입력하세요.'], 422);
        $st = $pdo->prepare("SELECT * FROM partner_account WHERE login_id=? AND active=1 LIMIT 1");
        $st->execute([$loginId]);
        $acct = $st->fetch(PDO::FETCH_ASSOC);
        if (!$acct || !password_verify($pw, (string)$acct['password_hash'])) {
            return self::json($res, ['ok' => false, 'error' => '로그인 ID 또는 비밀번호가 올바르지 않습니다.'], 401);
        }
        $token = bin2hex(random_bytes(32));
        $now = self::now(); $exp = gmdate('Y-m-d H:i:s', time() + 12 * 3600);
        $pdo->prepare("INSERT INTO partner_session (token,partner_account_id,tenant_id,expires_at,created_at) VALUES (?,?,?,?,?)")
            ->execute([$token, (int)$acct['id'], (string)$acct['tenant_id'], $exp, $now]);
        try { $pdo->prepare("UPDATE partner_account SET last_login=? WHERE id=?")->execute([$now, (int)$acct['id']]); } catch (\Throwable $e) {}
        return self::json($res, [
            'ok' => true, 'token' => $token,
            'partner' => ['type' => $acct['partner_type'], 'name' => $acct['name'] ?: $acct['partner_name'], 'partner_name' => $acct['partner_name'], 'login_id' => $acct['login_id']],
        ]);
    }

    /** Authorization 토큰 → 파트너 계정(만료/비활성 검증). 실패 시 null. */
    private static function partnerByToken(Request $req): ?array
    {
        $hdr = $req->getHeaderLine('Authorization');
        $token = (stripos($hdr, 'Bearer ') === 0) ? trim(substr($hdr, 7)) : '';
        if ($token === '') return null;
        $pdo = self::db();
        try {
            $st = $pdo->prepare("SELECT s.token, s.expires_at, a.* FROM partner_session s JOIN partner_account a ON a.id=s.partner_account_id WHERE s.token=? AND a.active=1 LIMIT 1");
            $st->execute([$token]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) return null;
            if (!empty($row['expires_at']) && $row['expires_at'] < self::now()) { return null; }
            return $row;
        } catch (\Throwable $e) { return null; }
    }

    /* POST /partner/logout */
    public static function logout(Request $req, Response $res): Response
    {
        $hdr = $req->getHeaderLine('Authorization');
        $token = (stripos($hdr, 'Bearer ') === 0) ? trim(substr($hdr, 7)) : '';
        if ($token !== '') { try { self::db()->prepare("DELETE FROM partner_session WHERE token=?")->execute([$token]); } catch (\Throwable $e) {} }
        return self::json($res, ['ok' => true]);
    }

    /* GET /partner/me — 파트너 정체성 + 허용 기능 */
    public static function me(Request $req, Response $res): Response
    {
        self::ensureTables();
        $p = self::partnerByToken($req);
        if (!$p) return self::json($res, ['ok' => false, 'error' => '파트너 인증이 필요합니다.'], 401);
        return self::json($res, ['ok' => true, 'partner' => [
            'type' => $p['partner_type'], 'name' => $p['name'] ?: $p['partner_name'],
            'partner_name' => $p['partner_name'], 'login_id' => $p['login_id'],
        ]]);
    }

    /* GET /partner/data — 유형별 본인 스코프 데이터(열람). */
    public static function data(Request $req, Response $res): Response
    {
        self::ensureTables();
        $p = self::partnerByToken($req);
        if (!$p) return self::json($res, ['ok' => false, 'error' => '파트너 인증이 필요합니다.'], 401);
        $pdo = self::db(); $t = (string)$p['tenant_id']; $type = (string)$p['partner_type'];
        $pname = (string)$p['partner_name']; $pid = (int)$p['partner_id'];
        // [257차 보안 하드닝] 빈 스코프(legacy 오배치) 계정 fail-closed — 무주 행 과열람 방지(빈 결과).
        if (($type === 'supplier' || $type === 'logistics') && trim($pname) === '') return self::json($res, ['ok' => true, 'type' => $type, 'rows' => []]);
        if ($type === 'warehouse' && $pid <= 0) return self::json($res, ['ok' => true, 'type' => $type, 'stock' => [], 'movements' => []]);
        try {
            if ($type === 'supplier') {
                // 본인 매입처 발주내역(supplier 명 매칭)
                $st = $pdo->prepare("SELECT id,sku,name,qty,supplier,wh_id,status,eta,created_at,updated_at FROM wms_supply_orders WHERE tenant_id=? AND supplier=? ORDER BY id DESC LIMIT 500");
                $st->execute([$t, $pname]);
                return self::json($res, ['ok' => true, 'type' => $type, 'rows' => $st->fetchAll(PDO::FETCH_ASSOC) ?: []]);
            }
            if ($type === 'logistics') {
                // 본인 배정 피킹/출고(carrier 명 매칭)
                $st = $pdo->prepare("SELECT id,order_ref,sku,name,qty,wh_id,carrier,status,created_at,updated_at FROM wms_picking WHERE tenant_id=? AND carrier=? ORDER BY id DESC LIMIT 500");
                $st->execute([$t, $pname]);
                return self::json($res, ['ok' => true, 'type' => $type, 'rows' => $st->fetchAll(PDO::FETCH_ASSOC) ?: []]);
            }
            if ($type === 'warehouse') {
                // 본인 창고 재고 + 최근 입출고(wh_id 매칭)
                $whId = (string)$pid;
                $stk = $pdo->prepare("SELECT sku,name,on_hand,updated_at FROM wms_stock WHERE tenant_id=? AND wh_id=? ORDER BY sku LIMIT 1000");
                $stk->execute([$t, $whId]);
                $mv = $pdo->prepare("SELECT id,type,sku,name,qty,unit,memo,ref,created_at FROM wms_movements WHERE tenant_id=? AND (wh_id=? OR dest_wh_id=?) ORDER BY id DESC LIMIT 300");
                $mv->execute([$t, $whId, $whId]);
                return self::json($res, ['ok' => true, 'type' => $type, 'stock' => $stk->fetchAll(PDO::FETCH_ASSOC) ?: [], 'movements' => $mv->fetchAll(PDO::FETCH_ASSOC) ?: []]);
            }
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => '조회 오류'], 500); }
        return self::json($res, ['ok' => false, 'error' => 'unknown type'], 400);
    }

    /* POST /partner/action — 유형별 본인 스코프 등록/수정(최소권한). body: {op, ...} */
    public static function action(Request $req, Response $res): Response
    {
        self::ensureTables();
        $p = self::partnerByToken($req);
        if (!$p) return self::json($res, ['ok' => false, 'error' => '파트너 인증이 필요합니다.'], 401);
        $pdo = self::db(); $t = (string)$p['tenant_id']; $type = (string)$p['partner_type'];
        $pname = (string)$p['partner_name']; $pid = (int)$p['partner_id'];
        // [257차 보안 하드닝] 빈 스코프 계정은 무주 행 수정 방지 — fail-closed(403).
        if (($type === 'supplier' || $type === 'logistics') && trim($pname) === '') return self::json($res, ['ok' => false, 'error' => '스코프 미지정 파트너 계정입니다.'], 403);
        if ($type === 'warehouse' && $pid <= 0) return self::json($res, ['ok' => false, 'error' => '스코프 미지정 파트너 계정입니다.'], 403);
        $b = self::body($req); $op = (string)($b['op'] ?? ''); $now = self::now();
        try {
            if ($type === 'supplier') {
                if ($op === 'update_status') {
                    // 본인 발주의 상태만 수정(확인/출고 등)
                    $id = (int)($b['id'] ?? 0); $status = (string)($b['status'] ?? '');
                    if ($id <= 0 || $status === '') return self::json($res, ['ok' => false, 'error' => 'id/status 필요'], 422);
                    $st = $pdo->prepare("UPDATE wms_supply_orders SET status=?, updated_at=? WHERE id=? AND tenant_id=? AND supplier=?");
                    $st->execute([$status, $now, $id, $t, $pname]);
                    return self::json($res, ['ok' => $st->rowCount() > 0]);
                }
                if ($op === 'add_order') {
                    // 매입처가 본인 명의 발주(입고예정) 등록
                    $st = $pdo->prepare("INSERT INTO wms_supply_orders (tenant_id,sku,name,qty,supplier,wh_id,status,eta,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
                    $st->execute([$t, (string)($b['sku'] ?? ''), (string)($b['name'] ?? ''), (float)($b['qty'] ?? 0), $pname, (string)($b['wh_id'] ?? ''), 'pending', (string)($b['eta'] ?? ''), $now, $now]);
                    return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
                }
            } elseif ($type === 'logistics') {
                if ($op === 'update_status') {
                    // 본인 배정 피킹의 상태/송장 수정. 택배출고(shipped) 시 → 재고 차감 + 입출고 이력 동기화(일체화).
                    $id = (int)($b['id'] ?? 0); $status = (string)($b['status'] ?? 'shipped');
                    if ($id <= 0) return self::json($res, ['ok' => false, 'error' => 'id 필요'], 422);
                    $sel = $pdo->prepare("SELECT * FROM wms_picking WHERE id=? AND tenant_id=? AND carrier=? LIMIT 1");
                    $sel->execute([$id, $t, $pname]);
                    $pick = $sel->fetch(PDO::FETCH_ASSOC);
                    if (!$pick) return self::json($res, ['ok' => false, 'error' => '배정된 출고가 아닙니다.'], 403);
                    $wasShipped = ($pick['status'] ?? '') === 'shipped';
                    // [현 차수] 감사 P1: 재고 차감을 status 변경 '앞'에 수행 → 재고부족 시 출고확정 자체를 막아
                    //   'shipped 인데 미차감' 불일치 차단(중복출고 방지 guard 와 결합). 재고부족=422 명시.
                    if ($status === 'shipped' && !$wasShipped) {
                        try {
                            Wms::recordMovement($t, ['type' => 'Outbound', 'wh_id' => (string)($pick['wh_id'] ?? ''), 'sku' => (string)($pick['sku'] ?? ''), 'name' => (string)($pick['name'] ?? ''), 'qty' => (float)($pick['qty'] ?? 0), 'ref' => (string)($pick['order_ref'] ?? ''), 'reason' => '택배출고(파트너)']);
                        } catch (\RuntimeException $e) {
                            if (str_starts_with($e->getMessage(), 'insufficient_stock')) return self::json($res, ['ok' => false, 'error' => '재고 부족으로 출고할 수 없습니다.', 'code' => 'INSUFFICIENT_STOCK'], 422);
                            throw $e;
                        }
                    }
                    $st = $pdo->prepare("UPDATE wms_picking SET status=?, updated_at=? WHERE id=? AND tenant_id=? AND carrier=?");
                    $st->execute([$status, $now, $id, $t, $pname]);
                    return self::json($res, ['ok' => true]);
                }
            } elseif ($type === 'warehouse') {
                if ($op === 'add_movement') {
                    // 본인 창고 입출고/반품입고 등록 → 단일 경로(recordMovement)로 재고+이력 동기화(일체화).
                    $id = Wms::recordMovement($t, [
                        'type' => (string)($b['type'] ?? 'Inbound'), 'wh_id' => (string)$pid,
                        'sku' => (string)($b['sku'] ?? ''), 'name' => (string)($b['name'] ?? ''),
                        'qty' => (float)($b['qty'] ?? 0), 'unit' => (string)($b['unit'] ?? 'EA'),
                        'memo' => (string)($b['memo'] ?? ''), 'ref' => (string)($b['ref'] ?? ''), 'reason' => '파트너 창고',
                    ]);
                    return self::json($res, ['ok' => true, 'id' => $id]);
                }
            }
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => '처리 오류'], 500); }
        return self::json($res, ['ok' => false, 'error' => '허용되지 않은 작업입니다.'], 403);
    }
}
