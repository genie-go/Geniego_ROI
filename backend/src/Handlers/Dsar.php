<?php
/**
 * Dsar — [283차] 정보주체 요청(DSAR: Data Subject Access Request) 워크플로우.
 *
 * ★신설 배경(부재증명 완료):
 *   `dsar|erasure|anonymize|data_subject|deletion_request` → backend 0건.
 *   그런데 frontend/src/pages/public/Privacy.jsx:106,117-118 이 정보주체의 **열람·삭제·이동 권리**를
 *   명시적으로 약속하고 있었다 → 약속만 있고 코드 경로가 없는 법적 노출(GDPR Art.15/17/20, PIPA §35/36/37).
 *
 *   현존 유일 삭제경로였던 CRM::deleteCustomer(CRM.php:252-266)는 캐스케이드가
 *   crm_segment_members + crm_activities **2개 테이블뿐** — 나머지 ~35개 PII 테이블이 전부 잔존했다.
 *
 * ★설계 원칙
 *   1) Extend — CRM.php 를 건드리지 않는다(동시 편집 중). 본 핸들러가 CRM 테이블을 직접 다룬다.
 *   2) DB 레벨 FK 캐스케이드는 **존재하지 않는다**. Db.php:205-215 가 DDL 에서 FOREIGN KEY 절을 제거한다.
 *      → 전 캐스케이드는 100% 애플리케이션 레벨이어야 한다. 아래 테이블 맵이 그 정본이다.
 *   3) 삭제 vs 익명화 — 법정 보존의무 데이터(주문·클레임·반품·배송·정산)는 **삭제하지 않고 익명화**한다.
 *      근거: 전자상거래법 §6(계약·청약철회 기록 5년), 국세기본법 §85-3(장부·증빙 5년),
 *            GDPR Art.17(3)(b) — 법적 의무 준수를 위한 보존은 삭제권의 예외.
 *      → 금액·일자·SKU 등 회계 정합에 필요한 값은 보존하고, 신원 식별자만 파기한다(가명처리).
 *   4) fail-closed — 신원확인(이메일 검증) 전에는 삭제/이동 실행 불가.
 *
 * ★해시 컬럼 대응(이 3개는 알고리즘이 서로 다르다 — 하나라도 틀리면 조용히 미삭제된다):
 *   - pixel_events.email_hash        = sha256(strtolower(trim(email)))            (PixelTracking.php:216)
 *   - pixel_events.phone_hash        = sha256(digits(phone))                      (PixelTracking.php:217)
 *   - attribution_identity_link.identity_hash
 *                                    = 'e'+substr(sha256(lower(trim(email))),0,32)
 *                                    | 'p'+substr(sha256(digits(phone)),0,32)     (Attribution.php:115-121)
 *   - review_request.contact_hash    = sha256(email . '|' . phone)                (Reviews.php:522)
 *
 * ★의도적 미처리(구현 불가/부적절 — 은폐하지 않고 보고서에 남긴다):
 *   - email_suppression : **삭제하지 않는다**. 삭제하면 수신거부가 해제돼 그 사람에게 다시 발송된다
 *                         (삭제권 이행이 오히려 재발송을 유발하는 역설). GDPR Art.17(3)(b)·CAN-SPAM·PIPA 상
 *                         수신거부 이행을 위한 최소보존은 적법. 보존 사실을 결과 리포트에 명시한다.
 *   - product_review.author_hash : 외부 채널에서 하베스트된 해시로 산출 알고리즘이 우리 코드에 없다
 *                         → 이메일로 역산 불가. 리뷰 본문은 tenant 스코프로 보존되며 별도 요청 시 수동 처리.
 *   - push_subscription : customer_id·email 이 **전혀 없다**(endpoint 만 보유) → 어떤 키로도 도달 불가.
 *                         구조적 한계이며 스키마 변경이 선행돼야 한다(보고서 이행계획 참조).
 *   - gdpr_consents     : user_id 가 app_user(플랫폼 사용자)를 가리킨다. 가맹점의 최종고객 PII 가 아니므로
 *                         본 캐스케이드 범위 밖(오삭제 방지).
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class Dsar
{
    /** 법정 처리기한(GDPR Art.12(3) 1개월 · PIPA 시행령 10일+연장). 보수적으로 30일. */
    private const SLA_DAYS = 30;

    /** 이메일 검증 토큰 유효기간(시간). */
    private const VERIFY_TTL_HOURS = 72;

    /**
     * ① customer_id(INT → crm_customers.id) 로 도달하는 테이블 — 완전삭제.
     *   [table => column]. crm_identity_merge_link 는 컬럼이 a_id/b_id 라 별도 처리(아래 eraseByCustomerIds).
     */
    private const DEL_BY_CUSTOMER_ID = [
        'crm_activities'      => 'customer_id',
        'crm_segment_members' => 'customer_id',
        'email_sends'         => 'customer_id',
        'kakao_sends'         => 'customer_id',
        'omni_outbox'         => 'customer_id',
        'journey_decision_log' => 'customer_id',
        'crm_channel_prefs'   => 'customer_id',
        'crm_customer_prefs'  => 'customer_id',
    ];

    /** ② 이메일 원문으로 도달하는 테이블 — 완전삭제(마케팅/발송 로그). */
    private const DEL_BY_EMAIL = [
        'coupon_notifications' => 'email',   // ★tenant_id 컬럼 없음 → tenant 조건 없이 email 로만(아래에서 분기)
    ];

    /** ③ 전화번호(수신자) 원문으로 도달하는 발송로그 — 완전삭제. */
    private const DEL_BY_PHONE = [
        'sms_messages'      => 'recipient',
        'whatsapp_messages' => 'recipient',
    ];

    /**
     * ④ 법정 보존의무 → **삭제 금지·익명화**. [table => [식별컬럼들]].
     *   금액/일자/SKU 등 회계·정산 정합 컬럼은 보존한다(무회귀).
     */
    private const ANONYMIZE = [
        // 주문 원장 — 전자상거래법 5년. buyer_email 이 유일한 고객키.
        'channel_orders'    => ['buyer_name' => 'redact', 'buyer_email' => 'pseudo_email', 'addr' => 'redact', 'raw_json' => 'json_erase'],
        // 클레임(반품/교환/취소) — 전자상거래법 5년.
        'orderhub_claims'   => ['buyer' => 'redact'],
        // 배송추적 — 수취인명/주소가 detail_json 에 포함.
        'shipment_tracking' => ['recipient' => 'redact', 'detail_json' => 'json_erase'],
        // 라이브커머스 주문 — 거래기록.
        'live_orders'       => ['buyer' => 'redact'],
    ];

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function isMysql(\PDO $pdo): bool
    {
        return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
    }

    /** 감사증적의 행위자 — 테넌트 id 가 아니라 **실제 조작자 계정**이어야 책임추적이 성립한다. */
    private static function actor(Request $req): string
    {
        try {
            $u = UserAuth::authedUser($req);
            if (is_array($u)) {
                $e = trim((string)($u['email'] ?? ''));
                if ($e !== '') return $e;
                $i = (string)($u['id'] ?? '');
                if ($i !== '') return 'user#' . $i;
            }
        } catch (\Throwable $e) {}
        return 'system';
    }

    private static function tableExists(\PDO $pdo, string $name): bool
    {
        try {
            if (self::isMysql($pdo)) {
                $st = $pdo->prepare("SHOW TABLES LIKE ?");
                $st->execute([$name]);
                return (bool)$st->fetchColumn();
            }
            $st = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
            $st->execute([$name]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /** 테이블에 특정 컬럼이 실재하는지(스키마 드리프트 방어 — 없는 컬럼 UPDATE 는 전 트랜잭션을 깬다). */
    private static function columnExists(\PDO $pdo, string $table, string $col): bool
    {
        try {
            if (self::isMysql($pdo)) {
                $st = $pdo->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
                $st->execute([$col]);
                return (bool)$st->fetch();
            }
            // PRAGMA 는 파라미터 바인딩 불가 → 테이블명을 화이트리스트(상수맵 유래)로만 받는다.
            $rows = $pdo->query("PRAGMA table_info('{$table}')")->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($rows as $r) { if (strcasecmp((string)($r['name'] ?? ''), $col) === 0) return true; }
            return false;
        } catch (\Throwable $e) { return false; }
    }

    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    /** 이메일 정규화(전 해시 알고리즘의 공통 전처리). */
    private static function normEmail(string $e): string { return strtolower(trim($e)); }

    /** 전화번호 정규화 — 숫자만(PixelTracking·Attribution 과 동일 규칙). */
    private static function normPhone(string $p): string { return (string)preg_replace('/[^0-9]/', '', $p); }

    /* ─── 스키마 ──────────────────────────────────────────────────────── */

    public static function ensureTables(): void
    {
        $pdo = Db::pdo();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS dsar_request (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                subject_email VARCHAR(255) NOT NULL,
                subject_phone VARCHAR(50),
                req_type VARCHAR(20) NOT NULL DEFAULT 'access',
                status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
                verify_token_hash VARCHAR(64),
                verify_expires_at VARCHAR(32),
                verified_at VARCHAR(32),
                requested_at VARCHAR(32),
                due_at VARCHAR(32),
                completed_at VARCHAR(32),
                result_json MEDIUMTEXT,
                note TEXT,
                KEY idx_dsar_tenant (tenant_id, status),
                KEY idx_dsar_email (tenant_id, subject_email),
                KEY idx_dsar_token (verify_token_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 처리 증적(append-only) — 감사기관 제출용.
            $pdo->exec("CREATE TABLE IF NOT EXISTS dsar_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                request_id INT NOT NULL,
                at VARCHAR(32),
                action VARCHAR(60),
                actor VARCHAR(190),
                detail TEXT,
                KEY idx_dsaraud_req (request_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS dsar_request (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                subject_email TEXT NOT NULL,
                subject_phone TEXT,
                req_type TEXT NOT NULL DEFAULT 'access',
                status TEXT NOT NULL DEFAULT 'pending_verification',
                verify_token_hash TEXT,
                verify_expires_at TEXT,
                verified_at TEXT,
                requested_at TEXT,
                due_at TEXT,
                completed_at TEXT,
                result_json TEXT,
                note TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS dsar_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                request_id INTEGER NOT NULL,
                at TEXT, action TEXT, actor TEXT, detail TEXT
            )");
            try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_dsar_tenant ON dsar_request(tenant_id, status)"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_dsar_token ON dsar_request(verify_token_hash)"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE INDEX IF NOT EXISTS idx_dsaraud_req ON dsar_audit_log(request_id)"); } catch (\Throwable $e) {}
        }
    }

    /** 처리 증적 기록(모든 상태전이·삭제실행은 반드시 여기 남는다). */
    private static function audit(\PDO $pdo, string $tenant, int $reqId, string $action, string $actor, string $detail = ''): void
    {
        try {
            $pdo->prepare("INSERT INTO dsar_audit_log(tenant_id,request_id,at,action,actor,detail) VALUES(?,?,?,?,?,?)")
                ->execute([$tenant, $reqId, self::now(), $action, $actor, mb_substr($detail, 0, 2000)]);
        } catch (\Throwable $e) { /* 증적 실패가 본처리를 막지 않는다 */ }
    }

    /* ─── ① 요청 접수 ─────────────────────────────────────────────────── */

    /**
     * POST /v424/dsar/requests — 정보주체 요청 접수(운영자 대행 접수).
     *   body: {email, phone?, type: access|erasure|portability, note?}
     *   접수 즉시 subject 이메일로 검증 토큰 발송 → 본인확인 전에는 실행 불가(fail-closed).
     */
    public static function create(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);

        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }

        $email = self::normEmail((string)($b['email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::json($res, ['ok' => false, 'error' => '유효한 이메일이 필요합니다.'], 422);
        }
        $phone = self::normPhone((string)($b['phone'] ?? ''));
        $type = in_array(($b['type'] ?? 'access'), ['access', 'erasure', 'portability'], true) ? (string)$b['type'] : 'access';

        // 검증 토큰 — 원문은 이메일로만 전달, DB 에는 sha256 해시만 저장(유출 시 재사용 불가).
        $token = bin2hex(random_bytes(32));
        $now = self::now();
        $due = gmdate('Y-m-d H:i:s', time() + self::SLA_DAYS * 86400);
        $exp = gmdate('Y-m-d H:i:s', time() + self::VERIFY_TTL_HOURS * 3600);

        $pdo->prepare("INSERT INTO dsar_request(tenant_id,subject_email,subject_phone,req_type,status,verify_token_hash,verify_expires_at,requested_at,due_at,note)
                       VALUES(?,?,?,?,'pending_verification',?,?,?,?,?)")
            ->execute([$tenant, $email, ($phone !== '' ? $phone : null), $type, hash('sha256', $token), $exp, $now, $due, mb_substr((string)($b['note'] ?? ''), 0, 1000)]);
        $id = (int)$pdo->lastInsertId();

        $actor = self::actor($req);
        self::audit($pdo, $tenant, $id, 'created', $actor, "type={$type}");

        // 신원확인 메일 발송(미설정 환경에서는 실패해도 접수는 유지 — 운영자가 재발송 가능).
        $sent = self::sendVerifyMail($pdo, $tenant, $email, $token, $type);
        self::audit($pdo, $tenant, $id, 'verify_mail', $actor, $sent ? 'sent' : 'send_failed');

        try { UserAuth::logAudit($req, 'dsar_request_created', "id={$id} type={$type}", 'medium'); } catch (\Throwable $e) {}

        return self::json($res, [
            'ok' => true, 'id' => $id, 'type' => $type, 'status' => 'pending_verification',
            'verify_mail_sent' => $sent, 'due_at' => $due,
            'note' => '정보주체 본인확인(이메일 링크) 완료 후에만 실행할 수 있습니다.',
        ], 201);
    }

    /** 신원확인 메일 — 검증 링크(원문 토큰은 이 메일에만 존재). */
    private static function sendVerifyMail(\PDO $pdo, string $tenant, string $email, string $token, string $type): bool
    {
        try {
            $base = rtrim((string)(getenv('APP_PUBLIC_URL') ?: 'https://www.genieroi.com'), '/');
            $link = $base . '/api/v424/dsar/verify?token=' . urlencode($token);
            $label = ['access' => '열람', 'erasure' => '삭제', 'portability' => '이동(내보내기)'][$type] ?? '처리';
            $body = '요청하신 개인정보 ' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . ' 건의 본인확인입니다.<br><br>'
                  . '아래 버튼을 눌러 본인확인을 완료해 주세요. 링크는 ' . self::VERIFY_TTL_HOURS . '시간 후 만료됩니다.<br>'
                  . '본인이 요청하지 않았다면 이 메일을 무시하시면 됩니다(요청은 실행되지 않습니다).';
            $html = \Genie\Mailer::wrapHtml('개인정보 요청 본인확인', $body, '본인확인 완료하기', $link);
            $r = \Genie\Mailer::send($email, '[GenieGo] 개인정보 요청 본인확인', $html, ['pdo' => $pdo, 'tenant' => $tenant]);
            return is_array($r) ? !empty($r['ok']) : (bool)$r;
        } catch (\Throwable $e) { return false; }
    }

    /* ─── ② 신원확인 ──────────────────────────────────────────────────── */

    /**
     * GET /v424/dsar/verify?token=... — 정보주체 본인확인(공개 엔드포인트).
     *   ★index.php public bypass 필요 — 인증은 토큰 자체가 수행한다(핸들러 내 검증, /creatives 와 동일 패턴).
     *   토큰은 단방향 해시로만 저장·상수시간 비교·1회성(성공 시 즉시 소거).
     */
    public static function verify(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = Db::pdo();
        $token = (string)($req->getQueryParams()['token'] ?? '');
        if ($token === '') return self::json($res, ['ok' => false, 'error' => 'token_required'], 400);

        $st = $pdo->prepare("SELECT * FROM dsar_request WHERE verify_token_hash=? LIMIT 1");
        $st->execute([hash('sha256', $token)]);
        $r = $st->fetch(\PDO::FETCH_ASSOC);
        // fail-closed — 존재하지 않거나 이미 소비된 토큰은 동일 응답(요청 존재여부 오라클 차단).
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'invalid_or_expired'], 404);

        if ((string)($r['verify_expires_at'] ?? '') < self::now()) {
            return self::json($res, ['ok' => false, 'error' => 'invalid_or_expired'], 404);
        }

        // 1회성: 검증 즉시 토큰 소거(재사용 불가).
        $pdo->prepare("UPDATE dsar_request SET status='verified', verified_at=?, verify_token_hash=NULL WHERE id=?")
            ->execute([self::now(), (int)$r['id']]);
        self::audit($pdo, (string)$r['tenant_id'], (int)$r['id'], 'verified', 'data_subject', 'email_token');

        return self::json($res, [
            'ok' => true, 'status' => 'verified', 'type' => (string)$r['req_type'],
            'message' => '본인확인이 완료되었습니다. 요청은 법정기한(30일) 내 처리됩니다.',
        ]);
    }

    /* ─── ③ 조회 ──────────────────────────────────────────────────────── */

    /** GET /v424/dsar/requests — 테넌트 DSAR 목록 + SLA 잔여일. */
    public static function listRequests(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);

        $st = $pdo->prepare("SELECT id,subject_email,subject_phone,req_type,status,requested_at,verified_at,due_at,completed_at,note
                             FROM dsar_request WHERE tenant_id=? ORDER BY id DESC LIMIT 500");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $nowTs = time();
        $out = [];
        foreach ($rows as $r) {
            $dueTs = @strtotime((string)($r['due_at'] ?? '')) ?: 0;
            $open = !in_array((string)$r['status'], ['completed', 'rejected'], true);
            $r['days_remaining'] = ($dueTs && $open) ? (int)floor(($dueTs - $nowTs) / 86400) : null;
            $r['overdue'] = ($dueTs && $open && $nowTs > $dueTs);   // SLA 초과 — 규제 리스크 가시화
            $out[] = $r;
        }
        return self::json($res, [
            'ok' => true, 'sla_days' => self::SLA_DAYS, 'count' => count($out),
            'open' => count(array_filter($out, fn($x) => !in_array((string)$x['status'], ['completed', 'rejected'], true))),
            'overdue' => count(array_filter($out, fn($x) => !empty($x['overdue']))),
            'requests' => $out,
        ]);
    }

    /** 요청 1건 로드(테넌트 스코프 강제 — 교차 테넌트 접근 차단). */
    private static function loadOwned(\PDO $pdo, string $tenant, int $id): ?array
    {
        $st = $pdo->prepare("SELECT * FROM dsar_request WHERE id=? AND tenant_id=? LIMIT 1");
        $st->execute([$id, $tenant]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /* ─── ④ 데이터 이동권(export-my-data) ─────────────────────────────── */

    /**
     * GET /v424/dsar/requests/{id}/export — 정보주체 데이터 JSON 내보내기(GDPR Art.20 이동권).
     *   ★본인확인(verified) 이후에만 가능.
     */
    public static function export(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $id = (int)($args['id'] ?? 0);

        $r = self::loadOwned($pdo, $tenant, $id);
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        if ((string)$r['status'] === 'pending_verification') {
            return self::json($res, ['ok' => false, 'error' => '정보주체 본인확인이 완료되지 않았습니다.'], 409);
        }

        $email = (string)$r['subject_email'];
        $phone = (string)($r['subject_phone'] ?? '');
        $bundle = self::collectSubjectData($pdo, $tenant, $email, $phone);

        self::audit($pdo, $tenant, $id, 'exported', self::actor($req), 'sections=' . count($bundle));
        if ((string)$r['req_type'] !== 'erasure') {
            $pdo->prepare("UPDATE dsar_request SET status='completed', completed_at=? WHERE id=? AND tenant_id=?")
                ->execute([self::now(), $id, $tenant]);
        }
        try { UserAuth::logAudit($req, 'dsar_export', "id={$id}", 'medium'); } catch (\Throwable $e) {}

        $payload = [
            'ok' => true,
            'generated_at' => gmdate('c'),
            'subject' => ['email' => $email, 'phone' => $phone !== '' ? $phone : null],
            'tenant' => $tenant,
            'format' => 'GeniegoROI DSAR export v1 (GDPR Art.20 / PIPA §35)',
            'data' => $bundle,
        ];
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        return $res->withHeader('Content-Type', 'application/json')
                   ->withHeader('Content-Disposition', 'attachment; filename="dsar_export_' . $id . '.json"');
    }

    /** 정보주체가 보유당한 전 데이터 수집(열람권·이동권 공용). 없는 테이블은 조용히 skip. */
    private static function collectSubjectData(\PDO $pdo, string $tenant, string $email, string $phone): array
    {
        $out = [];
        $cids = self::customerIds($pdo, $tenant, $email, $phone);

        // CRM 마스터
        $out['crm_profile'] = self::safeAll($pdo, "SELECT id,email,name,phone,kakao_id,grade,ltv,rfm_score,tags,memo,created_at FROM crm_customers WHERE tenant_id=? AND (email=?" . ($phone !== '' ? " OR phone=?" : "") . ")",
            $phone !== '' ? [$tenant, $email, $phone] : [$tenant, $email]);

        if ($cids) {
            $in = implode(',', array_fill(0, count($cids), '?'));
            $out['crm_activities'] = self::safeAll($pdo, "SELECT type,channel,amount,created_at FROM crm_activities WHERE tenant_id=? AND customer_id IN ($in)", array_merge([$tenant], $cids));
            $out['marketing_preferences'] = self::safeAll($pdo, "SELECT * FROM crm_channel_prefs WHERE tenant_id=? AND customer_id IN ($in)", array_merge([$tenant], $cids));
            $out['email_sends'] = self::safeAll($pdo, "SELECT campaign_id,status,sent_at FROM email_sends WHERE tenant_id=? AND customer_id IN ($in) LIMIT 1000", array_merge([$tenant], $cids));
            $out['journey_enrollments'] = self::safeAll($pdo, "SELECT journey_id,status,enrolled_at FROM journey_enrollments WHERE tenant_id=? AND customer_id IN ($in)", array_merge([$tenant], $cids));
        }

        // 주문(법정보존 — 열람/이동 대상이지만 삭제는 익명화로 갈음)
        $out['orders'] = self::safeAll($pdo, "SELECT channel,channel_order_id,product_name,sku,qty,total_price,status,ordered_at FROM channel_orders WHERE tenant_id=? AND buyer_email=? LIMIT 2000", [$tenant, $email]);

        // 발송 로그(전화 기반)
        if ($phone !== '') {
            $out['sms_messages'] = self::safeAll($pdo, "SELECT status,sent_at FROM sms_messages WHERE tenant_id=? AND recipient=? LIMIT 1000", [$tenant, $phone]);
        }

        // 수신거부 상태(보존 대상임을 정보주체에게 투명하게 고지)
        $out['email_suppression'] = self::safeAll($pdo, "SELECT email,reason,created_at FROM email_suppression WHERE tenant_id=? AND email=?", [$tenant, $email]);

        return $out;
    }

    /** 테이블/컬럼 부재를 흡수하는 안전 조회(스키마 드리프트에도 전체 export 가 죽지 않는다). */
    private static function safeAll(\PDO $pdo, string $sql, array $params): array
    {
        try {
            $st = $pdo->prepare($sql);
            $st->execute($params);
            return $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return []; }
    }

    /**
     * 정보주체의 주문번호(channel_orders.channel_order_id) 전부 해석.
     *   ★orderhub_claims·shipment_tracking·returns 는 고객키가 없고 order_id/order_ref 로만 연결된다
     *     → 이 목록이 없으면 그 3개 테이블의 PII 가 통째로 잔존한다(캐스케이드의 핵심 연결고리).
     */
    private static function subjectOrderIds(\PDO $pdo, string $tenant, string $email): array
    {
        $ids = [];
        try {
            $st = $pdo->prepare("SELECT channel_order_id FROM channel_orders WHERE tenant_id=? AND buyer_email=?");
            $st->execute([$tenant, $email]);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) as $o) { $o = (string)$o; if ($o !== '') $ids[] = $o; }
        } catch (\Throwable $e) {}
        return array_values(array_unique($ids));
    }

    /** 이메일/전화로 crm_customers.id 전부 해석(동일인이 여러 행일 수 있다). */
    private static function customerIds(\PDO $pdo, string $tenant, string $email, string $phone): array
    {
        $ids = [];
        try {
            $sql = "SELECT id FROM crm_customers WHERE tenant_id=? AND (email=?";
            $p = [$tenant, $email];
            if ($phone !== '') { $sql .= " OR phone=?"; $p[] = $phone; }
            $sql .= ")";
            $st = $pdo->prepare($sql);
            $st->execute($p);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) as $v) $ids[] = (int)$v;
        } catch (\Throwable $e) {}
        return array_values(array_unique($ids));
    }

    /* ─── ⑤ 삭제권 실행(전 테이블 캐스케이드) ────────────────────────── */

    /**
     * POST /v424/dsar/requests/{id}/execute — 요청 실행.
     *   erasure → 전 테이블 캐스케이드 삭제 + 법정보존분 익명화.
     *   access/portability → export 로 갈음(여기서는 상태만 완료 처리).
     *   ★fail-closed: status=verified 아니면 거부.
     */
    public static function execute(Request $req, Response $res, array $args): Response
    {
        // 삭제권 이행은 **플랜과 무관한 법적 의무**다(GDPR Art.17·PIPA §36). enterprise 로 게이트하면
        //   Pro 테넌트가 법적으로 삭제요청에 응할 수 없게 된다 → 기존 삭제경로(CRM::deleteCustomer=requirePro,
        //   CRM.php:254)와 동일 권한으로 맞춘다. 되돌릴 수 없는 연산이므로 안전장치는 권한이 아니라
        //   ①본인확인(verified) 강제 ②전 실행의 감사증적(dsar_audit_log)으로 건다.
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = Db::pdo();
        $tenant = self::tenant($req);
        $id = (int)($args['id'] ?? 0);

        $r = self::loadOwned($pdo, $tenant, $id);
        if (!$r) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        if ((string)$r['status'] !== 'verified') {
            // fail-closed — 미검증/이미완료 요청으로는 절대 삭제하지 않는다.
            return self::json($res, ['ok' => false, 'error' => '본인확인(verified) 상태에서만 실행할 수 있습니다.', 'status' => (string)$r['status']], 409);
        }

        $actor = self::actor($req);
        $email = (string)$r['subject_email'];
        $phone = (string)($r['subject_phone'] ?? '');
        $type = (string)$r['req_type'];

        if ($type !== 'erasure') {
            $pdo->prepare("UPDATE dsar_request SET status='completed', completed_at=? WHERE id=? AND tenant_id=?")
                ->execute([self::now(), $id, $tenant]);
            self::audit($pdo, $tenant, $id, 'completed', $actor, "type={$type} (export 로 이행)");
            return self::json($res, ['ok' => true, 'type' => $type, 'status' => 'completed', 'note' => '열람/이동 요청은 export 엔드포인트로 데이터를 제공하십시오.']);
        }

        $report = self::eraseSubject($pdo, $tenant, $email, $phone);

        $pdo->prepare("UPDATE dsar_request SET status='completed', completed_at=?, result_json=? WHERE id=? AND tenant_id=?")
            ->execute([self::now(), json_encode($report, JSON_UNESCAPED_UNICODE), $id, $tenant]);

        self::audit($pdo, $tenant, $id, 'erased', $actor,
            'deleted=' . array_sum($report['deleted'] ?? []) . ' anonymized=' . array_sum($report['anonymized'] ?? []));
        try { UserAuth::logAudit($req, 'dsar_erasure_executed', "id={$id} email_sha=" . substr(hash('sha256', $email), 0, 12), 'high'); } catch (\Throwable $e) {}

        return self::json($res, ['ok' => true, 'type' => 'erasure', 'status' => 'completed', 'report' => $report]);
    }

    /**
     * ★캐스케이드 본체 — 삭제 + 익명화.
     *   Db.php 가 FK 를 제거하므로 DB 가 대신 지워주는 것은 아무것도 없다. 여기 나열된 것이 전부다.
     *   각 테이블은 개별 try 로 격리 — 한 테이블 실패가 나머지 삭제를 막지 않는다(부분이행 > 전무이행).
     */
    private static function eraseSubject(\PDO $pdo, string $tenant, string $email, string $phone): array
    {
        $deleted = [];
        $anonymized = [];
        $retained = [];
        $unreachable = [];

        $cids = self::customerIds($pdo, $tenant, $email, $phone);

        // ── ① customer_id 기반 삭제 ──────────────────────────────────
        if ($cids) {
            $in = implode(',', array_fill(0, count($cids), '?'));
            foreach (self::DEL_BY_CUSTOMER_ID as $tbl => $col) {
                if (!self::tableExists($pdo, $tbl)) continue;
                try {
                    $st = $pdo->prepare("DELETE FROM {$tbl} WHERE tenant_id=? AND {$col} IN ($in)");
                    $st->execute(array_merge([$tenant], $cids));
                    $deleted[$tbl] = $st->rowCount();
                } catch (\Throwable $e) { $unreachable[$tbl] = 'delete_failed: ' . $e->getMessage(); }
            }

            // crm_identity_merge_link — 컬럼이 a_id/b_id (customer_id grep 으로는 안 잡히는 사각지대).
            if (self::tableExists($pdo, 'crm_identity_merge_link')) {
                try {
                    $st = $pdo->prepare("DELETE FROM crm_identity_merge_link WHERE tenant_id=? AND (a_id IN ($in) OR b_id IN ($in))");
                    $st->execute(array_merge([$tenant], $cids, $cids));
                    $deleted['crm_identity_merge_link'] = $st->rowCount();
                } catch (\Throwable $e) { $unreachable['crm_identity_merge_link'] = 'delete_failed'; }
            }

            // journey — enrollment 경유 자식(journey_node_logs / journey_node_sent)을 부모보다 먼저 지운다.
            if (self::tableExists($pdo, 'journey_enrollments')) {
                try {
                    $es = $pdo->prepare("SELECT id FROM journey_enrollments WHERE tenant_id=? AND customer_id IN ($in)");
                    $es->execute(array_merge([$tenant], $cids));
                    $eids = array_map('intval', $es->fetchAll(\PDO::FETCH_COLUMN) ?: []);
                    if ($eids) {
                        $ein = implode(',', array_fill(0, count($eids), '?'));
                        foreach (['journey_node_logs', 'journey_node_sent'] as $jt) {
                            if (!self::tableExists($pdo, $jt)) continue;
                            try {
                                $st = $pdo->prepare("DELETE FROM {$jt} WHERE tenant_id=? AND enrollment_id IN ($ein)");
                                $st->execute(array_merge([$tenant], $eids));
                                $deleted[$jt] = $st->rowCount();
                            } catch (\Throwable $e) { $unreachable[$jt] = 'delete_failed'; }
                        }
                    }
                    $st = $pdo->prepare("DELETE FROM journey_enrollments WHERE tenant_id=? AND customer_id IN ($in)");
                    $st->execute(array_merge([$tenant], $cids));
                    $deleted['journey_enrollments'] = $st->rowCount();
                } catch (\Throwable $e) { $unreachable['journey_enrollments'] = 'delete_failed'; }
            }
        }

        // ── ② 이메일 원문 기반 삭제 ─────────────────────────────────
        foreach (self::DEL_BY_EMAIL as $tbl => $col) {
            if (!self::tableExists($pdo, $tbl)) continue;
            try {
                // coupon_notifications 등 일부 테이블은 tenant_id 컬럼이 없다 → 존재할 때만 조건 추가.
                $hasT = self::columnExists($pdo, $tbl, 'tenant_id');
                $sql = "DELETE FROM {$tbl} WHERE {$col}=?" . ($hasT ? " AND tenant_id=?" : "");
                $st = $pdo->prepare($sql);
                $st->execute($hasT ? [$email, $tenant] : [$email]);
                $deleted[$tbl] = $st->rowCount();
            } catch (\Throwable $e) { $unreachable[$tbl] = 'delete_failed'; }
        }

        // ── ③ 전화 원문 기반 삭제(발송로그) ─────────────────────────
        if ($phone !== '') {
            foreach (self::DEL_BY_PHONE as $tbl => $col) {
                if (!self::tableExists($pdo, $tbl)) continue;
                try {
                    $st = $pdo->prepare("DELETE FROM {$tbl} WHERE tenant_id=? AND {$col}=?");
                    $st->execute([$tenant, $phone]);
                    $deleted[$tbl] = $st->rowCount();
                } catch (\Throwable $e) { $unreachable[$tbl] = 'delete_failed'; }
            }
        }

        // ── ④ 해시 기반 삭제(추적·귀속) — 알고리즘이 3종으로 다르다 ─
        $emailSha = hash('sha256', $email);                          // PixelTracking.php:216
        $phoneSha = $phone !== '' ? hash('sha256', $phone) : null;   // PixelTracking.php:217

        if (self::tableExists($pdo, 'pixel_events')) {
            try {
                $sql = "DELETE FROM pixel_events WHERE tenant_id=? AND (email_hash=?" . ($phoneSha ? " OR phone_hash=?" : "") . ")";
                $st = $pdo->prepare($sql);
                $st->execute($phoneSha ? [$tenant, $emailSha, $phoneSha] : [$tenant, $emailSha]);
                $deleted['pixel_events'] = $st->rowCount();
            } catch (\Throwable $e) { $unreachable['pixel_events'] = 'delete_failed'; }
        }

        // attribution_identity_link — 'e'/'p' 접두 + sha256 32자 절단(Attribution.php:118-119).
        $idHashes = ['e' . substr($emailSha, 0, 32)];
        if ($phoneSha !== null && strlen($phone) >= 9) $idHashes[] = 'p' . substr($phoneSha, 0, 32);

        // 식별자에 묶인 세션을 먼저 수집해야 세션 기반 테이블(pixel_sessions·attribution_touch)까지 닿는다.
        $sessions = [];
        if (self::tableExists($pdo, 'attribution_identity_link')) {
            try {
                $hin = implode(',', array_fill(0, count($idHashes), '?'));
                $ss = $pdo->prepare("SELECT session_id FROM attribution_identity_link WHERE tenant_id=? AND identity_hash IN ($hin)");
                $ss->execute(array_merge([$tenant], $idHashes));
                foreach ($ss->fetchAll(\PDO::FETCH_COLUMN) as $s) { $s = (string)$s; if ($s !== '') $sessions[] = $s; }

                $st = $pdo->prepare("DELETE FROM attribution_identity_link WHERE tenant_id=? AND identity_hash IN ($hin)");
                $st->execute(array_merge([$tenant], $idHashes));
                $deleted['attribution_identity_link'] = $st->rowCount();
            } catch (\Throwable $e) { $unreachable['attribution_identity_link'] = 'delete_failed'; }
        }
        $sessions = array_values(array_unique($sessions));

        if ($sessions) {
            $sin = implode(',', array_fill(0, count($sessions), '?'));
            foreach (['pixel_sessions', 'attribution_touch', 'attribution_device_sig', 'onsite_assignment', 'web_popup_assign'] as $tbl) {
                if (!self::tableExists($pdo, $tbl)) continue;
                if (!self::columnExists($pdo, $tbl, 'session_id')) continue;   // onsite/web_popup 은 vid 키 → 세션으로 안 닿음
                try {
                    $st = $pdo->prepare("DELETE FROM {$tbl} WHERE tenant_id=? AND session_id IN ($sin)");
                    $st->execute(array_merge([$tenant], $sessions));
                    $deleted[$tbl] = $st->rowCount();
                } catch (\Throwable $e) { $unreachable[$tbl] = 'delete_failed'; }
            }
        }

        // review_request.contact_hash = sha256(email . '|' . phone) — 발송 당시의 email+phone 조합이 필요(Reviews.php:522).
        if (self::tableExists($pdo, 'review_request')) {
            try {
                $ch = hash('sha256', $email . '|' . $phone);
                $st = $pdo->prepare("DELETE FROM review_request WHERE tenant_id=? AND contact_hash=?");
                $st->execute([$tenant, $ch]);
                $deleted['review_request'] = $st->rowCount();
                // ★한계: 발송 시점의 phone 이 현재 프로필과 다르면 해시가 달라 미매칭될 수 있다.
                //   phone 없이 발송된 건도 sha256(email.'|') 로 저장되므로 그 조합도 함께 시도한다.
                if ($phone !== '') {
                    $st2 = $pdo->prepare("DELETE FROM review_request WHERE tenant_id=? AND contact_hash=?");
                    $st2->execute([$tenant, hash('sha256', $email . '|')]);
                    $deleted['review_request'] += $st2->rowCount();
                }
            } catch (\Throwable $e) { $unreachable['review_request'] = 'delete_failed'; }
        }

        // 발송 로그 중 수신자 원문 키(customer_id 없음) — line/instagram 은 email 로 도달 불가.
        $unreachable['line_sends'] = 'recipient=LINE user id — 이메일/전화로 역참조 불가(스키마 한계)';
        $unreachable['instagram_messages'] = 'sender_id=IG scoped id — 이메일/전화로 역참조 불가(스키마 한계)';
        $unreachable['push_subscription'] = 'customer_id·email 컬럼 부재 — 어떤 키로도 도달 불가(스키마 변경 선행 필요)';
        $unreachable['product_review'] = 'author_hash 산출 알고리즘이 외부 채널 소유 — 역산 불가';

        // ── ⑤ 법정 보존의무 테이블 → 삭제 대신 익명화(가명처리) ────
        //   금액·일자·SKU 는 보존(회계/정산 정합 무회귀), 신원 식별자만 파기.
        $pseudoEmail = 'erased+' . substr(hash('sha256', $email . '|' . $tenant), 0, 16) . '@erased.invalid';
        $redact = '[erased]';

        // ★핵심: 주문 파생 테이블(클레임·배송추적·반품)의 고객키는 이메일이 **아니다**.
        //   orderhub_claims.buyer / shipment_tracking.recipient 는 **수취인 성명**(VARCHAR)이라
        //   email 로 WHERE 하면 0행 매칭 = 조용한 미삭제가 된다(실제 초안에서 발생했던 버그).
        //   이들은 order_id / order_ref 로만 정확히 도달한다 → 주문번호를 먼저 확보한다.
        $orderIds = self::subjectOrderIds($pdo, $tenant, $email);

        // 익명화 헬퍼 — 컬럼 존재분만 SET(스키마 드리프트 방어).
        $applyAnon = function (string $tbl, array $cols, string $whereCol, array $whereVals) use ($pdo, $tenant, $pseudoEmail, $redact, &$anonymized, &$unreachable): void {
            if (!self::tableExists($pdo, $tbl) || !$whereVals || !self::columnExists($pdo, $tbl, $whereCol)) return;
            $sets = []; $vals = [];
            foreach ($cols as $col => $mode) {
                if (!self::columnExists($pdo, $tbl, $col)) continue;
                $sets[] = "{$col}=?";
                if ($mode === 'pseudo_email')   $vals[] = $pseudoEmail;
                elseif ($mode === 'json_erase') $vals[] = '{"erased":true,"reason":"dsar_erasure"}';
                else                            $vals[] = $redact;
            }
            if (!$sets) return;
            try {
                $in = implode(',', array_fill(0, count($whereVals), '?'));
                $sql = "UPDATE {$tbl} SET " . implode(',', $sets) . " WHERE tenant_id=? AND {$whereCol} IN ($in)";
                $st = $pdo->prepare($sql);
                $st->execute(array_merge($vals, [$tenant], $whereVals));
                $anonymized[$tbl] = ($anonymized[$tbl] ?? 0) + $st->rowCount();
            } catch (\Throwable $e) { $unreachable[$tbl] = 'anonymize_failed'; }
        };

        // channel_orders — 유일하게 이메일이 직접 키(buyer_email).
        $applyAnon('channel_orders', self::ANONYMIZE['channel_orders'], 'buyer_email', [$email]);
        // 주문 파생 — order_id / order_ref 로 도달.
        $applyAnon('orderhub_claims', self::ANONYMIZE['orderhub_claims'], 'order_id', $orderIds);
        $applyAnon('shipment_tracking', self::ANONYMIZE['shipment_tracking'], 'order_ref', $orderIds);
        // live_orders.buyer 는 성명/이메일 혼재 가능 → 이메일 일치분만 익명화(가능한 범위).
        $applyAnon('live_orders', self::ANONYMIZE['live_orders'], 'buyer', [$email]);

        // raw_vendor_event.raw_payload — 벤더 원문 페이로드에 성명/전화/주소가 그대로 들어있다(Db.php:1007).
        //   고객키가 없어 LIKE 로만 도달한다. DSAR 은 드문 연산이므로 풀스캔 비용은 수용 가능하다.
        if (self::tableExists($pdo, 'raw_vendor_event') && self::columnExists($pdo, 'raw_vendor_event', 'raw_payload')) {
            try {
                $st = $pdo->prepare("UPDATE raw_vendor_event SET raw_payload='{\"erased\":true,\"reason\":\"dsar_erasure\"}'
                                     WHERE tenant_id=? AND raw_payload LIKE ?");
                $st->execute([$tenant, '%' . $email . '%']);
                $anonymized['raw_vendor_event'] = $st->rowCount();
            } catch (\Throwable $e) { $unreachable['raw_vendor_event'] = 'anonymize_failed'; }
        }

        // returns 는 **별도 SQLite 파일**(backend/data/returns.sqlite3 — ReturnsPortal.php:24).
        //   메인 PDO 만 훑으면 조용히 누락된다.
        //   ★$orderIds 를 반드시 넘긴다 — 위에서 channel_orders.buyer_email 을 이미 가명화했으므로
        //     여기서 이메일로 재조회하면 0건이 나온다(순서 의존 버그). 가명화 이전 스냅샷을 사용한다.
        $retReport = self::eraseReturnsDb($tenant, $orderIds);
        if ($retReport !== null) $anonymized['returns(separate sqlite)'] = $retReport;

        // ── ⑥ 보존 대상(삭제 금지) ─────────────────────────────────
        //   수신거부 목록을 지우면 그 사람에게 다시 마케팅이 발송된다(삭제권이 재발송을 유발하는 역설).
        //   GDPR Art.17(3)(b)·PIPA 상 수신거부 이행 목적의 최소보존은 적법. 보존 사실을 투명하게 남긴다.
        $retained['email_suppression'] = '수신거부 이행을 위해 보존(삭제 시 재발송 위험). GDPR Art.17(3)(b) 적법 보존.';
        $retained['channel_orders / orderhub_claims / returns / shipment_tracking'] =
            '전자상거래법 §6(5년)·국세기본법 §85-3(5년) 법정 보존의무 → 삭제 대신 익명화(가명처리) 수행.';

        // ── ⑦ CRM 마스터는 **맨 마지막**에 삭제(자식 행 해석에 id 가 필요하므로) ──
        if ($cids) {
            $in = implode(',', array_fill(0, count($cids), '?'));
            try {
                $st = $pdo->prepare("DELETE FROM crm_customers WHERE tenant_id=? AND id IN ($in)");
                $st->execute(array_merge([$tenant], $cids));
                $deleted['crm_customers'] = $st->rowCount();
            } catch (\Throwable $e) { $unreachable['crm_customers'] = 'delete_failed'; }
        }

        return [
            'subject_email_sha256' => substr($emailSha, 0, 16),   // 리포트에 원문 PII 를 남기지 않는다
            'customer_ids' => $cids,
            'deleted' => $deleted,
            'anonymized' => $anonymized,
            'retained' => $retained,
            'unreachable' => $unreachable,
            'executed_at' => gmdate('c'),
        ];
    }

    /**
     * returns 테이블은 메인 DB 가 아니라 backend/data/returns.sqlite3 에 있다(ReturnsPortal.php:24).
     *   반품은 법정 보존의무 대상 → 삭제하지 않고 익명화. 파일이 없으면 null(정상 — 미사용 환경).
     *   $orderIds 는 **channel_orders 가명화 이전에** 확보된 스냅샷이어야 한다(호출부 주석 참조).
     */
    private static function eraseReturnsDb(string $tenant, array $orderIds): ?int
    {
        if (!$orderIds) return 0;
        try {
            $path = dirname(__DIR__, 2) . '/data/returns.sqlite3';
            if (!is_file($path)) return null;
            $rp = new \PDO('sqlite:' . $path);
            $rp->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $in = implode(',', array_fill(0, count($orderIds), '?'));
            $st = $rp->prepare("UPDATE returns SET note='[erased]', track_no='[erased]' WHERE tenant_id=? AND order_id IN ($in)");
            $st->execute(array_merge([$tenant], $orderIds));
            return $st->rowCount();
        } catch (\Throwable $e) { return null; }
    }
}
