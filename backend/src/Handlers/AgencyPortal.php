<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use PDO;

/**
 * 272차: 마케팅 대행사(Agency) 멀티클라이언트 콘솔 — 초엔터프라이즈/은행급 격리.
 *
 * 대행사가 "여러 클라이언트(기업/테넌트)"를 하나의 대행사 로그인으로 관리한다. 단, 클라이언트의
 * 데이터는 클라이언트 테넌트 경계를 절대 벗어나지 않으며, 대행사 접근은 반드시 **클라이언트 승인
 * 게이트**를 통과해야 하고, 클라이언트가 언제든 **즉시 철회**할 수 있다(매 요청 fail-closed 재검증).
 *
 * 3계층 격리:
 *  - agency_account : 대행사 로그인 계정(본사 user_session·partner_session 과 완전 분리, bcrypt).
 *  - agency_client_link : 대행사↔클라이언트 테넌트 N:N 위임(status pending→approved→revoked, scope_json).
 *  - agency_session : 대행사 전용 세션 토큰(접두 `agt_`) + 현재 전환한 클라이언트(active_link_id/tenant).
 *
 * 접근 규칙(은행급):
 *  1. 대행사는 status='approved' 링크의 클라이언트만 열람/운영 가능.
 *  2. 클라이언트 tenant 는 서버가 링크에서 도출(요청 헤더 위조 불가).
 *  3. 매 클라이언트-데이터 요청마다 링크 승인상태 재검증(철회 즉시 403 = fail-closed) — index.php agency 브랜치.
 *  4. 스코프(scope_json.write) 미허용 시 쓰기(POST/PUT/PATCH/DELETE) 차단(읽기전용 위임).
 *  5. 전 행위 감사(SecurityAudit: agency_id + client_tenant + action).
 *  6. 데이터 동기화: 대행사 운영은 클라이언트 tenant 로 주입되어 **기존 핸들러 그대로** 실행 → 클라이언트가
 *     직접 한 것과 동일 경로로 적재/집계(별도 데이터 경로 0 = 완전 동기화·무회귀).
 */
class AgencyPortal
{
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

    public static function ensureTables(): void
    {
        $pdo = self::db();
        $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($mysql) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS agency_account (
                    id INT AUTO_INCREMENT PRIMARY KEY, agency_key VARCHAR(100) NOT NULL,
                    name VARCHAR(200) NOT NULL DEFAULT '', login_id VARCHAR(190) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL, brand_json MEDIUMTEXT NULL,
                    active TINYINT(1) NOT NULL DEFAULT 1, last_login VARCHAR(32) NULL,
                    created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_agency_login (login_id), UNIQUE KEY uq_agency_key (agency_key)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS agency_client_link (
                    id INT AUTO_INCREMENT PRIMARY KEY, agency_id INT NOT NULL,
                    client_tenant_id VARCHAR(100) NOT NULL, client_email VARCHAR(190) NOT NULL DEFAULT '',
                    client_name VARCHAR(200) NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    scope_json TEXT NULL, invited_at VARCHAR(32), approved_at VARCHAR(32) NULL,
                    revoked_at VARCHAR(32) NULL, created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_agency_client (agency_id, client_tenant_id),
                    KEY idx_link_tenant (client_tenant_id), KEY idx_link_agency (agency_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS agency_session (
                    token VARCHAR(96) PRIMARY KEY, agency_id INT NOT NULL,
                    active_link_id INT NULL, active_client_tenant VARCHAR(100) NULL,
                    expires_at VARCHAR(32), created_at VARCHAR(32), KEY idx_asess_agency (agency_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS agency_account (id INTEGER PRIMARY KEY AUTOINCREMENT, agency_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', login_id TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, brand_json TEXT, active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS agency_client_link (id INTEGER PRIMARY KEY AUTOINCREMENT, agency_id INTEGER NOT NULL, client_tenant_id TEXT NOT NULL, client_email TEXT NOT NULL DEFAULT '', client_name TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', scope_json TEXT, invited_at TEXT, approved_at TEXT, revoked_at TEXT, created_at TEXT, updated_at TEXT, UNIQUE(agency_id, client_tenant_id))");
                $pdo->exec("CREATE TABLE IF NOT EXISTS agency_session (token TEXT PRIMARY KEY, agency_id INTEGER NOT NULL, active_link_id INTEGER, active_client_tenant TEXT, expires_at TEXT, created_at TEXT)");
            }
        } catch (\Throwable $e) { /* best-effort — 재호출 안전 */ }
    }

    /** 기본 위임 스코프(클라이언트가 조정 가능). write=false=읽기전용 위임(은행급 기본 최소권한). */
    private static function defaultScope(): array
    {
        return ['write' => false, 'menus' => ['dashboard', 'marketing', 'campaign', 'attribution', 'commerce']];
    }

    /* ════════════════ 플랫폼 관리자: 대행사 계정 발급/관리 ════════════════ */

    /** GET /auth/agencies — 최고관리자만(대행사 계정 목록). */
    public static function listAccounts(Request $req, Response $res): Response
    {
        if ($err = self::requireMasterAdmin($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->query("SELECT id,agency_key,name,login_id,active,last_login,created_at FROM agency_account ORDER BY id DESC");
        return self::json($res, ['ok' => true, 'agencies' => $st->fetchAll(PDO::FETCH_ASSOC) ?: []]);
    }

    /** POST /auth/agencies {name, login_id, password} — 최고관리자만. */
    public static function createAccount(Request $req, Response $res): Response
    {
        if ($err = self::requireMasterAdmin($req, $res)) return $err;
        self::ensureTables();
        $b = self::body($req); $pdo = self::db();
        $loginId = strtolower(trim((string)($b['login_id'] ?? '')));
        $pw = (string)($b['password'] ?? '');
        $name = trim((string)($b['name'] ?? ''));
        if ($loginId === '' || strlen($pw) < 8 || $name === '') {
            return self::json($res, ['ok' => false, 'error' => '대행사명·로그인 ID·8자 이상 비밀번호가 필요합니다.'], 422);
        }
        $dup = $pdo->prepare("SELECT 1 FROM agency_account WHERE login_id=?"); $dup->execute([$loginId]);
        if ($dup->fetchColumn()) return self::json($res, ['ok' => false, 'error' => '이미 사용 중인 로그인 ID 입니다.'], 409);
        $now = self::now();
        $pdo->prepare("INSERT INTO agency_account (agency_key,name,login_id,password_hash,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)")
            ->execute(['pending', $name, $loginId, password_hash($pw, PASSWORD_DEFAULT), $now, $now]);
        $newId = (int)$pdo->lastInsertId();
        // agency_key = 안정 식별자(agency_<id>) — 발급 후 확정.
        $pdo->prepare("UPDATE agency_account SET agency_key=? WHERE id=?")->execute(['agency_' . $newId, $newId]);
        return self::json($res, ['ok' => true, 'id' => $newId, 'agency_key' => 'agency_' . $newId]);
    }

    /** PUT /auth/agencies/{id} {name?, password?, active?} — 최고관리자만. */
    public static function updateAccount(Request $req, Response $res, array $args): Response
    {
        if ($err = self::requireMasterAdmin($req, $res)) return $err;
        self::ensureTables();
        $id = (int)($args['id'] ?? 0); $b = self::body($req); $pdo = self::db();
        $sets = []; $vals = [];
        if (isset($b['name']))   { $sets[] = 'name=?';          $vals[] = trim((string)$b['name']); }
        if (isset($b['active'])) { $sets[] = 'active=?';        $vals[] = ((int)$b['active'] ? 1 : 0); }
        if (!empty($b['password'])) {
            if (strlen((string)$b['password']) < 8) return self::json($res, ['ok' => false, 'error' => '비밀번호는 8자 이상'], 422);
            $sets[] = 'password_hash=?'; $vals[] = password_hash((string)$b['password'], PASSWORD_DEFAULT);
        }
        if (!$sets) return self::json($res, ['ok' => false, 'error' => '변경할 항목이 없습니다.'], 422);
        $sets[] = 'updated_at=?'; $vals[] = self::now(); $vals[] = $id;
        $pdo->prepare("UPDATE agency_account SET " . implode(',', $sets) . " WHERE id=?")->execute($vals);
        // 비활성화/비번변경 시 활성 세션 무효화(즉시 로그아웃).
        if (isset($b['active']) && !(int)$b['active'] || !empty($b['password'])) {
            try { $pdo->prepare("DELETE FROM agency_session WHERE agency_id=?")->execute([$id]); } catch (\Throwable $e) {}
        }
        return self::json($res, ['ok' => true]);
    }

    /** DELETE /auth/agencies/{id} — 최고관리자만(계정+링크+세션 정리). */
    public static function deleteAccount(Request $req, Response $res, array $args): Response
    {
        if ($err = self::requireMasterAdmin($req, $res)) return $err;
        self::ensureTables();
        $id = (int)($args['id'] ?? 0); $pdo = self::db();
        $pdo->prepare("DELETE FROM agency_account WHERE id=?")->execute([$id]);
        try { $pdo->prepare("DELETE FROM agency_session WHERE agency_id=?")->execute([$id]); } catch (\Throwable $e) {}
        try { $pdo->prepare("DELETE FROM agency_client_link WHERE agency_id=?")->execute([$id]); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true]);
    }

    /* ════════════════ 대행사: 로그인/세션 ════════════════ */

    /** POST /agency/login {login_id, password} — 대행사 전용 로그인(별도 세션). */
    public static function login(Request $req, Response $res): Response
    {
        self::ensureTables();
        $b = self::body($req); $pdo = self::db();
        $loginId = strtolower(trim((string)($b['login_id'] ?? '')));
        $pw = (string)($b['password'] ?? '');
        if ($loginId === '' || $pw === '') return self::json($res, ['ok' => false, 'error' => '로그인 ID 와 비밀번호를 입력하세요.'], 422);
        // [현 차수 P2] ★로그인 무차별 대입 방지 — IP+login_id 기준 실패 카운터(15분窓 8회 초과 시 15분 잠금).
        //   기존 주석만 있고 실제 구현 부재로 agt_ 세션(12h)을 온라인 브루트포스에 무방비였다.
        $sp = $req->getServerParams();
        $ip = (string)($sp['HTTP_X_FORWARDED_FOR'] ?? $sp['REMOTE_ADDR'] ?? '');
        $ip = trim(explode(',', $ip)[0]);
        $ident = 'agy|' . $ip . '|' . $loginId;
        $nowTs = time();
        $rl = null; // [P4후속 실결함] 아래 try 안(fetch)에서만 할당돼, CREATE/prepare 예외 시 $rl 미정의 → 실패카운트 분기(192)가 undefined 변수 접근. 초기화로 보장(false/array 의미 동일).
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS agency_login_attempt (ident VARCHAR(190) PRIMARY KEY, fail_count INT DEFAULT 0, first_at INT, locked_until INT)");
            $qr = $pdo->prepare("SELECT fail_count, first_at, locked_until FROM agency_login_attempt WHERE ident=?");
            $qr->execute([$ident]); $rl = $qr->fetch(PDO::FETCH_ASSOC);
            if ($rl && (int)($rl['locked_until'] ?? 0) > $nowTs) {
                return self::json($res, ['ok' => false, 'error' => '로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'retry_after' => (int)$rl['locked_until'] - $nowTs], 429);
            }
        } catch (\Throwable $e) {}
        $st = $pdo->prepare("SELECT * FROM agency_account WHERE login_id=? AND active=1 LIMIT 1");
        $st->execute([$loginId]);
        $acct = $st->fetch(PDO::FETCH_ASSOC);
        if (!$acct || !password_verify($pw, (string)$acct['password_hash'])) {
            // 실패 카운트 증가(15분 윈도우 리셋·8회 초과 시 15분 잠금).
            try {
                if (!$rl) { $pdo->prepare("INSERT INTO agency_login_attempt (ident,fail_count,first_at,locked_until) VALUES (?,1,?,0)")->execute([$ident, $nowTs]); }
                else {
                    $fc = ((int)$rl['first_at'] < $nowTs - 900) ? 1 : ((int)$rl['fail_count'] + 1);
                    $fa = ((int)$rl['first_at'] < $nowTs - 900) ? $nowTs : (int)$rl['first_at'];
                    $lu = $fc >= 8 ? $nowTs + 900 : 0;
                    $pdo->prepare("UPDATE agency_login_attempt SET fail_count=?, first_at=?, locked_until=? WHERE ident=?")->execute([$fc, $fa, $lu, $ident]);
                }
            } catch (\Throwable $e) {}
            return self::json($res, ['ok' => false, 'error' => '로그인 ID 또는 비밀번호가 올바르지 않습니다.'], 401);
        }
        try { $pdo->prepare("DELETE FROM agency_login_attempt WHERE ident=?")->execute([$ident]); } catch (\Throwable $e) {} // 성공 → 클리어
        $token = 'agt_' . bin2hex(random_bytes(32));
        $now = self::now(); $exp = gmdate('Y-m-d H:i:s', time() + 12 * 3600);
        // [현 차수 보안] 세션 토큰 at-rest 해시(user_session P5 동형) — DB덤프 replay 차단. 원문은 클라이언트만 보유.
        $pdo->prepare("INSERT INTO agency_session (token,agency_id,active_link_id,active_client_tenant,expires_at,created_at) VALUES (?,?,NULL,NULL,?,?)")
            ->execute([\Genie\Handlers\UserAuth::hashToken($token), (int)$acct['id'], $exp, $now]);
        try { $pdo->prepare("UPDATE agency_account SET last_login=? WHERE id=?")->execute([$now, (int)$acct['id']]); } catch (\Throwable $e) {}
        return self::json($res, [
            'ok' => true, 'token' => $token,
            'agency' => ['id' => (int)$acct['id'], 'name' => $acct['name'], 'login_id' => $acct['login_id'], 'brand' => json_decode((string)($acct['brand_json'] ?? ''), true) ?: null],
        ]);
    }

    /** Authorization agt_ 토큰 → agency_session + 계정(만료/비활성 검증). 실패 시 null. */
    public static function sessionByToken(Request $req): ?array
    {
        $hdr = $req->getHeaderLine('Authorization');
        $token = (stripos($hdr, 'Bearer ') === 0) ? trim(substr($hdr, 7)) : '';
        if ($token === '' && isset($req->getQueryParams()['agency_token'])) $token = (string)$req->getQueryParams()['agency_token'];
        if (strncmp($token, 'agt_', 4) !== 0) return null;
        $pdo = self::db();
        try {
            // [현 차수 보안] dual-read — 신규 해시행/레거시 평문행 모두 조회(무중단 마이그레이션).
            $st = $pdo->prepare("SELECT s.token, s.agency_id, s.active_link_id, s.active_client_tenant, s.expires_at, a.name, a.login_id, a.active FROM agency_session s JOIN agency_account a ON a.id=s.agency_id WHERE s.token IN (?, ?) LIMIT 1");
            $st->execute([\Genie\Handlers\UserAuth::hashToken($token), $token]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row || (int)($row['active'] ?? 0) !== 1) return null;
            if (!empty($row['expires_at']) && $row['expires_at'] < self::now()) return null;
            $row['_token'] = (string)$row['token'];    // ★저장값(해시/레거시평문) — 이후 WHERE token 갱신이 정합
            return $row;
        } catch (\Throwable $e) { return null; }
    }

    /** POST /agency/logout */
    public static function logout(Request $req, Response $res): Response
    {
        $hdr = $req->getHeaderLine('Authorization');
        $token = (stripos($hdr, 'Bearer ') === 0) ? trim(substr($hdr, 7)) : '';
        if (strncmp($token, 'agt_', 4) === 0) { try { self::db()->prepare("DELETE FROM agency_session WHERE token IN (?, ?)")->execute([\Genie\Handlers\UserAuth::hashToken($token), $token]); } catch (\Throwable $e) {} }
        return self::json($res, ['ok' => true]);
    }

    /** GET /agency/me — 대행사 정체성 + 현재 전환 클라이언트 + 브랜드. */
    public static function me(Request $req, Response $res): Response
    {
        self::ensureTables();
        $s = self::sessionByToken($req);
        if (!$s) return self::json($res, ['ok' => false, 'error' => '대행사 인증이 필요합니다.'], 401);
        $pdo = self::db();
        $brand = null;
        try { $b = $pdo->prepare("SELECT brand_json FROM agency_account WHERE id=?"); $b->execute([(int)$s['agency_id']]); $brand = json_decode((string)$b->fetchColumn(), true) ?: null; } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'agency' => [
            'id' => (int)$s['agency_id'], 'name' => $s['name'], 'login_id' => $s['login_id'],
            'active_client_tenant' => $s['active_client_tenant'] ?: null, 'active_link_id' => $s['active_link_id'] ? (int)$s['active_link_id'] : null,
            'brand' => $brand,
        ]]);
    }

    /* ════════════════ 대행사: 클라이언트 목록/초대/전환 ════════════════ */

    /** GET /agency/clients — 대행사가 위임받은/요청한 클라이언트 목록(상태 포함). */
    public static function clients(Request $req, Response $res): Response
    {
        self::ensureTables();
        $s = self::sessionByToken($req);
        if (!$s) return self::json($res, ['ok' => false, 'error' => '대행사 인증이 필요합니다.'], 401);
        $pdo = self::db();
        $st = $pdo->prepare("SELECT id,client_tenant_id,client_email,client_name,status,scope_json,invited_at,approved_at,revoked_at FROM agency_client_link WHERE agency_id=? ORDER BY id DESC");
        $st->execute([(int)$s['agency_id']]);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $r['scope'] = json_decode((string)($r['scope_json'] ?? ''), true) ?: self::defaultScope();
            unset($r['scope_json']);
            $rows[] = $r;
        }
        return self::json($res, ['ok' => true, 'clients' => $rows]);
    }

    /** POST /agency/clients/invite {client_email} — 대행사가 클라이언트(테넌트 owner 이메일)에 접근 요청.
     *  실존 owner 만 대상(팬텀 링크 방지). 승인 전엔 접근 0(status=pending). */
    public static function inviteClient(Request $req, Response $res): Response
    {
        self::ensureTables();
        $s = self::sessionByToken($req);
        if (!$s) return self::json($res, ['ok' => false, 'error' => '대행사 인증이 필요합니다.'], 401);
        $pdo = self::db();
        $b = self::body($req);
        $email = strtolower(trim((string)($b['client_email'] ?? '')));
        if ($email === '' || !str_contains($email, '@')) return self::json($res, ['ok' => false, 'error' => '클라이언트 이메일을 입력하세요.'], 422);
        // 실존 클라이언트 owner 해석(팀원 아님·owner 만 위임 승인권 보유).
        $u = $pdo->prepare("SELECT id,tenant_id,name FROM app_user WHERE LOWER(email)=? AND (parent_user_id IS NULL OR parent_user_id=0) LIMIT 1");
        $u->execute([$email]);
        $owner = $u->fetch(PDO::FETCH_ASSOC);
        if (!$owner) return self::json($res, ['ok' => false, 'error' => '해당 이메일의 클라이언트(계정 소유자)를 찾을 수 없습니다.'], 404);
        $tenant = trim((string)($owner['tenant_id'] ?? ''));
        if ($tenant === '') return self::json($res, ['ok' => false, 'error' => '클라이언트 테넌트 미해석'], 409);
        if ($tenant === 'demo' || strncmp($tenant, 'demo', 4) === 0) return self::json($res, ['ok' => false, 'error' => '데모 계정은 위임 대상이 아닙니다.'], 422);
        $now = self::now();
        // 멱등: 기존 링크 있으면 상태별 처리(revoked→재요청 pending, approved→그대로, pending→그대로).
        $ex = $pdo->prepare("SELECT id,status FROM agency_client_link WHERE agency_id=? AND client_tenant_id=? LIMIT 1");
        $ex->execute([(int)$s['agency_id'], $tenant]);
        $row = $ex->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            if (($row['status'] ?? '') === 'revoked') {
                $pdo->prepare("UPDATE agency_client_link SET status='pending', invited_at=?, revoked_at=NULL, updated_at=? WHERE id=?")
                    ->execute([$now, $now, (int)$row['id']]);
            }
            return self::json($res, ['ok' => true, 'link_id' => (int)$row['id'], 'status' => (($row['status'] ?? '') === 'revoked') ? 'pending' : $row['status']]);
        }
        $pdo->prepare("INSERT INTO agency_client_link (agency_id,client_tenant_id,client_email,client_name,status,scope_json,invited_at,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?,?,?)")
            ->execute([(int)$s['agency_id'], $tenant, $email, (string)($owner['name'] ?? ''), json_encode(self::defaultScope(), JSON_UNESCAPED_UNICODE), $now, $now, $now]);
        return self::json($res, ['ok' => true, 'link_id' => (int)$pdo->lastInsertId(), 'status' => 'pending']);
    }

    /** POST /agency/clients/{id}/switch — 승인된 클라이언트로 세션 전환(active 설정). */
    public static function switchClient(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $s = self::sessionByToken($req);
        if (!$s) return self::json($res, ['ok' => false, 'error' => '대행사 인증이 필요합니다.'], 401);
        $pdo = self::db();
        $linkId = (int)($args['id'] ?? 0);
        $st = $pdo->prepare("SELECT id,client_tenant_id,status FROM agency_client_link WHERE id=? AND agency_id=? LIMIT 1");
        $st->execute([$linkId, (int)$s['agency_id']]);
        $link = $st->fetch(PDO::FETCH_ASSOC);
        if (!$link) return self::json($res, ['ok' => false, 'error' => '클라이언트 링크를 찾을 수 없습니다.'], 404);
        if (($link['status'] ?? '') !== 'approved') return self::json($res, ['ok' => false, 'error' => '클라이언트 승인 대기/철회 상태입니다.'], 403);
        $pdo->prepare("UPDATE agency_session SET active_link_id=?, active_client_tenant=? WHERE token=?")
            ->execute([$linkId, (string)$link['client_tenant_id'], (string)$s['_token']]);
        self::audit($pdo, (int)$s['agency_id'], (string)$link['client_tenant_id'], 'agency.switch', ['link_id' => $linkId]);
        return self::json($res, ['ok' => true, 'active_client_tenant' => $link['client_tenant_id'], 'active_link_id' => $linkId]);
    }

    /** POST /agency/clients/exit — 클라이언트 컨텍스트 해제(대행사 대시보드로). */
    public static function exitClient(Request $req, Response $res): Response
    {
        self::ensureTables();
        $s = self::sessionByToken($req);
        if (!$s) return self::json($res, ['ok' => false, 'error' => '대행사 인증이 필요합니다.'], 401);
        self::db()->prepare("UPDATE agency_session SET active_link_id=NULL, active_client_tenant=NULL WHERE token=?")->execute([(string)$s['_token']]);
        return self::json($res, ['ok' => true]);
    }

    /* ════════════════ 클라이언트(테넌트 owner): 승인 게이트 ════════════════ */

    /** GET /api/v423/agency-access/requests — 클라이언트 owner 가 자기 테넌트에 대한 대행사 접근요청/현황 조회. */
    public static function myAgencyRequests(Request $req, Response $res): Response
    {
        self::ensureTables();
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        if (!self::isTenantOwner($req)) return self::json($res, ['ok' => false, 'error' => '계정 소유자만 대행사 위임을 관리할 수 있습니다.'], 403);
        $pdo = self::db();
        $st = $pdo->prepare("SELECT l.id,l.agency_id,l.status,l.scope_json,l.invited_at,l.approved_at,l.revoked_at,a.name AS agency_name,a.login_id AS agency_login FROM agency_client_link l JOIN agency_account a ON a.id=l.agency_id WHERE l.client_tenant_id=? ORDER BY l.id DESC");
        $st->execute([$tenant]);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $r['scope'] = json_decode((string)($r['scope_json'] ?? ''), true) ?: self::defaultScope();
            unset($r['scope_json']);
            $rows[] = $r;
        }
        return self::json($res, ['ok' => true, 'requests' => $rows]);
    }

    /** POST /api/v423/agency-access/{id}/approve {write?, menus?} — 클라이언트 승인(+스코프 지정). */
    public static function approveAgency(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        if (!self::isTenantOwner($req)) return self::json($res, ['ok' => false, 'error' => '계정 소유자만 승인할 수 있습니다.'], 403);
        $pdo = self::db(); $linkId = (int)($args['id'] ?? 0); $b = self::body($req);
        $st = $pdo->prepare("SELECT id,agency_id,scope_json FROM agency_client_link WHERE id=? AND client_tenant_id=? LIMIT 1");
        $st->execute([$linkId, $tenant]);
        $link = $st->fetch(PDO::FETCH_ASSOC);
        if (!$link) return self::json($res, ['ok' => false, 'error' => '접근요청을 찾을 수 없습니다.'], 404);
        // 스코프: 클라이언트가 write 허용 여부·메뉴 지정(기본 읽기전용).
        $scope = json_decode((string)($link['scope_json'] ?? ''), true) ?: self::defaultScope();
        if (array_key_exists('write', $b)) $scope['write'] = (bool)$b['write'];
        if (isset($b['menus']) && is_array($b['menus'])) $scope['menus'] = array_values(array_filter(array_map('strval', $b['menus'])));
        $now = self::now();
        $pdo->prepare("UPDATE agency_client_link SET status='approved', scope_json=?, approved_at=?, revoked_at=NULL, updated_at=? WHERE id=?")
            ->execute([json_encode($scope, JSON_UNESCAPED_UNICODE), $now, $now, $linkId]);
        self::audit($pdo, (int)$link['agency_id'], $tenant, 'agency.client_approved', ['link_id' => $linkId, 'scope' => $scope], $req);
        return self::json($res, ['ok' => true, 'status' => 'approved', 'scope' => $scope]);
    }

    /** POST /api/v423/agency-access/{id}/revoke — 클라이언트 즉시 철회(대행사 세션도 무효화 = fail-closed 즉시효력). */
    public static function revokeAgency(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        if (!self::isTenantOwner($req)) return self::json($res, ['ok' => false, 'error' => '계정 소유자만 철회할 수 있습니다.'], 403);
        $pdo = self::db(); $linkId = (int)($args['id'] ?? 0);
        $st = $pdo->prepare("SELECT id,agency_id FROM agency_client_link WHERE id=? AND client_tenant_id=? LIMIT 1");
        $st->execute([$linkId, $tenant]);
        $link = $st->fetch(PDO::FETCH_ASSOC);
        if (!$link) return self::json($res, ['ok' => false, 'error' => '접근권한을 찾을 수 없습니다.'], 404);
        $now = self::now();
        $pdo->prepare("UPDATE agency_client_link SET status='revoked', revoked_at=?, updated_at=? WHERE id=?")->execute([$now, $now, $linkId]);
        // 즉시효력: 이 클라이언트로 전환돼 있던 대행사 세션의 active 컨텍스트 해제(다음 요청부터 링크 재검증도 차단).
        try { $pdo->prepare("UPDATE agency_session SET active_link_id=NULL, active_client_tenant=NULL WHERE agency_id=? AND active_link_id=?")->execute([(int)$link['agency_id'], $linkId]); } catch (\Throwable $e) {}
        self::audit($pdo, (int)$link['agency_id'], $tenant, 'agency.client_revoked', ['link_id' => $linkId], $req);
        return self::json($res, ['ok' => true, 'status' => 'revoked']);
    }

    /* ════════════════ 미들웨어 지원: 접근 컨텍스트 해석(fail-closed) ════════════════ */

    /**
     * index.php agency 브랜치용 — agt_ 토큰의 현재 클라이언트 접근 컨텍스트를 해석.
     * 매 요청 링크 status='approved' 재검증(철회/만료 즉시 차단). 반환:
     *   ['tenant'=>client_tenant, 'agency_id'=>..., 'link_id'=>..., 'write'=>bool] 또는 null(접근불가).
     */
    public static function resolveAccessContext(Request $req): ?array
    {
        $s = self::sessionByToken($req);
        if (!$s) return null;
        $linkId = (int)($s['active_link_id'] ?? 0);
        $tenant = trim((string)($s['active_client_tenant'] ?? ''));
        if ($linkId <= 0 || $tenant === '') return null; // 클라이언트 미전환 = 클라이언트 데이터 접근 불가
        $pdo = self::db();
        try {
            $st = $pdo->prepare("SELECT id,client_tenant_id,status,scope_json FROM agency_client_link WHERE id=? AND agency_id=? LIMIT 1");
            $st->execute([$linkId, (int)$s['agency_id']]);
            $link = $st->fetch(PDO::FETCH_ASSOC);
            if (!$link) return null;
            if (($link['status'] ?? '') !== 'approved') return null;           // 철회/대기 = fail-closed
            if ((string)$link['client_tenant_id'] !== $tenant) return null;      // 세션↔링크 tenant 불일치 방어
            $scope = json_decode((string)($link['scope_json'] ?? ''), true) ?: self::defaultScope();
            return ['tenant' => $tenant, 'agency_id' => (int)$s['agency_id'], 'link_id' => $linkId, 'write' => (bool)($scope['write'] ?? false)];
        } catch (\Throwable $e) { return null; }
    }

    /* ════════════════ 화이트라벨 브랜드(공개 — 로그인 화면용) ════════════════ */

    /** GET /agency/brand?key=agency_N — 로그인 화면 화이트라벨(공개, 비밀 아님). */
    public static function brand(Request $req, Response $res): Response
    {
        self::ensureTables();
        $key = trim((string)($req->getQueryParams()['key'] ?? ''));
        if ($key === '') return self::json($res, ['ok' => true, 'brand' => null]);
        $pdo = self::db();
        try {
            $st = $pdo->prepare("SELECT name,brand_json FROM agency_account WHERE agency_key=? AND active=1 LIMIT 1");
            $st->execute([$key]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) return self::json($res, ['ok' => true, 'brand' => null]);
            $brand = json_decode((string)($row['brand_json'] ?? ''), true) ?: [];
            $brand['name'] = $brand['name'] ?? $row['name'];
            return self::json($res, ['ok' => true, 'brand' => $brand]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'brand' => null]); }
    }

    /** PUT /agency/brand {logo?, color?, company?} — 대행사 자기 브랜드 설정(자체 세션). */
    public static function saveBrand(Request $req, Response $res): Response
    {
        self::ensureTables();
        $s = self::sessionByToken($req);
        if (!$s) return self::json($res, ['ok' => false, 'error' => '대행사 인증이 필요합니다.'], 401);
        $pdo = self::db(); $b = self::body($req);
        $brand = [
            'company' => mb_substr(trim((string)($b['company'] ?? $s['name'])), 0, 120),
            'color'   => preg_match('/^#[0-9a-fA-F]{3,8}$/', (string)($b['color'] ?? '')) ? (string)$b['color'] : null,
            'logo'    => (is_string($b['logo'] ?? null) && strlen((string)$b['logo']) < 400000) ? (string)$b['logo'] : null, // data URI 상한
        ];
        $pdo->prepare("UPDATE agency_account SET brand_json=?, updated_at=? WHERE id=?")
            ->execute([json_encode($brand, JSON_UNESCAPED_UNICODE), self::now(), (int)$s['agency_id']]);
        return self::json($res, ['ok' => true, 'brand' => $brand]);
    }

    /* ════════════════ 내부 헬퍼 ════════════════ */

    /** 계정 소유자(owner)만 대행사 위임을 관리(팀원/하위 불가). */
    private static function isTenantOwner(Request $req): bool
    {
        $u = UserAuth::authedUser($req);
        if (!$u) return false;
        $pid = (int)($u['parent_user_id'] ?? 0);
        $role = (string)($u['team_role'] ?? '');
        return $pid === 0 && ($role === '' || $role === 'owner');
    }

    /** 최고관리자(master) 게이트 — UserAdmin 미러(대행사 계정 발급은 플랫폼 최고관리자만). */
    private static function requireMasterAdmin(Request $req, Response $res): ?Response
    {
        $u = UserAuth::authedUser($req);
        if (!$u) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $isAdmin = (strtolower((string)($u['plan'] ?? '')) === 'admin' || strtolower((string)($u['plans'] ?? '')) === 'admin');
        if (!$isAdmin) return self::json($res, ['ok' => false, 'error' => '관리자만 접근할 수 있습니다.'], 403);
        if ((string)($u['admin_level'] ?? '') === 'sub') return self::json($res, ['ok' => false, 'error' => '최고관리자만 대행사 계정을 관리할 수 있습니다.'], 403);
        return null;
    }

    /** 감사 로그(best-effort·비차단). */
    private static function audit(PDO $pdo, int $agencyId, string $clientTenant, string $action, array $meta = [], ?Request $req = null): void
    {
        try {
            \Genie\SecurityAudit::log($pdo, $clientTenant, 'agency_' . $agencyId, $action, $meta, $req);
        } catch (\Throwable $e) { /* 감사 실패는 기능 비차단 */ }
    }
}
