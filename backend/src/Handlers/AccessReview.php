<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\SecurityAudit;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v424 Access Review — 휴면/만료 접근권한 검토 (EPIC 06-A Part 3-8 실 구현 슬라이스)
 * ──────────────────────────────────────────────────────────────────────────
 *   설계 정본: docs/spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md
 *             docs/architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md
 *
 *   ★범위(정직): 본 슬라이스는 **api_key(머신 아이덴티티) 축**만 검토한다.
 *     - api_key 는 tenant_id 를 보유해 테넌트 격리가 확실(188차 P0 규칙 준수).
 *     - app_user(사람 계정)는 base 스키마에 tenant_id 가 없어(Db.php:1099) 테넌트 스코프 검토 시
 *       교차테넌트 유출 위험 → 확실한 tenant 매핑 확정 후 후속 슬라이스로 확장(그린필드 확인·설계 DSAR §4 Scope 참조).
 *
 *   ★Golden Rule(Extend, 대체 아님):
 *     - 탐지: 기존 substrate 재사용 — expires_at 강제(index.php:518)·last_used_at/use_count(index.php:522).
 *     - 회수(revoke): 기존 api_key is_active=0 의미 재사용(Keys::revoke 와 동일 semantics·신규 파괴경로 신설 안 함).
 *     - 증거: SecurityAudit 해시체인(유일 tamper-evident)에 기록(ADR D-2 — 참조·흡수 아님).
 *   ★fail-secure: admin 전용 · 회수 결정은 사유(justification) 필수(증거 없는 결정 금지 · ADR D-4).
 *   ★추가전용: 신규 핸들러·라우트·테이블(access_review_item) — 기존 동작 무변경·무회귀.
 *
 *   Routes(admin 세션 self-auth · /v424/admin/ = api_key 미들웨어 bypass):
 *     GET  /v424/admin/access-review/keys       휴면/만료 api_key 검토 큐(read-only)
 *     POST /v424/admin/access-review/decision   검토 결정(approve|revoke) + 증거기록
 *     GET  /v424/admin/access-review/history    검토 결정 이력
 */
final class AccessReview
{
    /** 휴면 판정 임계(일) — 이 기간 미사용 시 DORMANT. */
    private const DORMANT_DAYS = 90;
    /** 만료 임박 경고 임계(일). */
    private const EXPIRY_WARN_DAYS = 14;

    // ★인증 규약(정정): 본 핸들러는 admin 패널 라우트(/v424/admin/access-review/*)에 배선된다.
    //   이 접두는 index.php:196 에서 api_key 미들웨어를 bypass 하므로 auth_tenant/auth_role 속성이 주입되지
    //   않는다 → 프론트 세션 토큰(genie_token)으로 호출. 따라서 AdminPlans 와 동일하게 세션 self-auth
    //   (UserAuth::requirePlan 'admin' 게이트 + UserAuth::authedTenant 테넌트 격리)를 사용한다.

    /** 세션 admin 게이트. 통과 시 null, 아니면 401/403 Response. */
    private static function requireAdmin(Request $request, Response $response): ?Response
    {
        return UserAuth::requirePlan($request, $response, 'admin');
    }

    /** 세션에서 서버도출한 테넌트(X-Act-As-Tenant platform_growth 는 admin 한정 존중 · 위조 차단). */
    private static function tenantId(Request $request): string
    {
        $t = (string)(UserAuth::authedTenant($request) ?? '');
        return $t !== '' ? $t : 'demo';
    }

    /** 검토 이력·결정 저장소(추가전용 substrate). */
    private static function ensureTable(PDO $pdo): void
    {
        $my = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $ai = $my ? 'BIGINT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS access_review_item (
                id $ai,
                tenant_id     VARCHAR(100) NOT NULL,
                kind          VARCHAR(32)  NOT NULL,
                target_id     VARCHAR(64)  NOT NULL,
                target_label  VARCHAR(255),
                status_at_review VARCHAR(24),
                decision      VARCHAR(16)  NOT NULL,
                justification TEXT,
                reviewer      VARCHAR(190),
                created_at    VARCHAR(32)  NOT NULL
            )"
        );
        try { $pdo->exec('CREATE INDEX idx_access_review_tenant ON access_review_item(tenant_id, created_at)'); } catch (\Throwable $e) { /* idempotent */ }
    }

    /**
     * api_key 1행의 실효 상태 산출(임의값 금지 — 실 필드 파생).
     * @return array{status:string, reason:string, days_idle:?int}
     */
    private static function classify(array $row, int $now): array
    {
        $expiresAt = trim((string)($row['expires_at'] ?? ''));
        $lastUsed  = trim((string)($row['last_used_at'] ?? ''));
        $createdAt = trim((string)($row['created_at'] ?? ''));
        $useCount  = (int)($row['use_count'] ?? 0);

        // 유휴 기준 시각: 마지막 사용, 없으면 생성 시각.
        $refTs = $lastUsed !== '' ? strtotime($lastUsed) : ($createdAt !== '' ? strtotime($createdAt) : false);
        $daysIdle = ($refTs !== false) ? (int)floor(($now - $refTs) / 86400) : null;

        // 우선순위: EXPIRED > DORMANT/STALE > EXPIRING_SOON > OK (심각도 순).
        if ($expiresAt !== '') {
            $expTs = strtotime($expiresAt);
            if ($expTs !== false && $expTs < $now) {
                return ['status' => 'EXPIRED', 'reason' => '만료 시각 경과(런타임 401 차단됨) — 정리 대상', 'days_idle' => $daysIdle];
            }
        }

        if ($daysIdle !== null && $daysIdle >= self::DORMANT_DAYS) {
            if ($useCount === 0 || $lastUsed === '') {
                return ['status' => 'STALE_UNUSED', 'reason' => self::DORMANT_DAYS . '일 이상 한 번도 사용되지 않은 키', 'days_idle' => $daysIdle];
            }
            return ['status' => 'DORMANT', 'reason' => "마지막 사용 후 {$daysIdle}일 경과(휴면)", 'days_idle' => $daysIdle];
        }

        if ($expiresAt !== '') {
            $expTs = strtotime($expiresAt);
            if ($expTs !== false && $expTs < $now + self::EXPIRY_WARN_DAYS * 86400) {
                $daysLeft = (int)ceil(($expTs - $now) / 86400);
                return ['status' => 'EXPIRING_SOON', 'reason' => "만료 임박(약 {$daysLeft}일 이내)", 'days_idle' => $daysIdle];
            }
        }

        return ['status' => 'OK', 'reason' => '정상', 'days_idle' => $daysIdle];
    }

    /** GET /v424/access-review/keys — 검토 큐(휴면/만료 우선). read-only. */
    public static function keys(Request $request, Response $response, array $args): Response
    {
        if ($resp = self::requireAdmin($request, $response)) return $resp;
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $now    = time();

        // 활성 키만 검토 대상(비활성은 이미 회수됨).
        $stmt = $pdo->prepare(
            'SELECT id, key_prefix, name, role, last_used_at, use_count, expires_at, created_at
               FROM api_key WHERE tenant_id = ? AND is_active = 1 ORDER BY id DESC'
        );
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        $summary = ['EXPIRED' => 0, 'STALE_UNUSED' => 0, 'DORMANT' => 0, 'EXPIRING_SOON' => 0, 'OK' => 0];
        foreach ($rows as $r) {
            $c = self::classify($r, $now);
            $summary[$c['status']] = ($summary[$c['status']] ?? 0) + 1;
            $items[] = [
                'kind'         => 'api_key',
                'target_id'    => (int)$r['id'],
                'key_prefix'   => (string)$r['key_prefix'],   // 접두만 — 비밀키·해시 비노출
                'name'         => (string)$r['name'],
                'role'         => (string)$r['role'],
                'last_used_at' => $r['last_used_at'] ?: null,
                'use_count'    => (int)($r['use_count'] ?? 0),
                'expires_at'   => $r['expires_at'] ?: null,
                'created_at'   => (string)$r['created_at'],
                'status'       => $c['status'],
                'reason'       => $c['reason'],
                'days_idle'    => $c['days_idle'],
                'needs_review' => $c['status'] !== 'OK',
            ];
        }
        // 검토 필요 항목 우선 정렬(심각도).
        $order = ['EXPIRED' => 0, 'STALE_UNUSED' => 1, 'DORMANT' => 2, 'EXPIRING_SOON' => 3, 'OK' => 4];
        usort($items, fn($a, $b) => ($order[$a['status']] ?? 9) <=> ($order[$b['status']] ?? 9));

        return TemplateResponder::respond($response, [
            'ok'        => true,
            'tenant'    => $tenant,
            'thresholds'=> ['dormant_days' => self::DORMANT_DAYS, 'expiry_warn_days' => self::EXPIRY_WARN_DAYS],
            'summary'   => $summary,
            'total'     => count($items),
            'needs_review' => array_sum([$summary['EXPIRED'], $summary['STALE_UNUSED'], $summary['DORMANT'], $summary['EXPIRING_SOON']]),
            'items'     => $items,
        ]);
    }

    /** POST /v424/access-review/decision — 검토 결정 + 증거기록. */
    public static function decision(Request $request, Response $response, array $args): Response
    {
        if ($resp = self::requireAdmin($request, $response)) return $resp;
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $targetId      = (int)($body['target_id'] ?? 0);
        $decision      = strtolower(trim((string)($body['decision'] ?? '')));
        $justification = trim((string)($body['justification'] ?? ''));

        if (!in_array($decision, ['approve', 'revoke'], true)) {
            return TemplateResponder::respond($response->withStatus(400), ['error' => 'decision must be approve|revoke']);
        }
        // fail-secure: 증거 없는 결정 금지(ADR D-4). revoke 는 특히 사유 필수.
        if ($justification === '') {
            return TemplateResponder::respond($response->withStatus(400), ['error' => 'justification required (evidence-based decision)']);
        }

        // 테넌트 스코프 조회 — 교차테넌트 위조 차단.
        $sel = $pdo->prepare('SELECT id, key_prefix, name, role, last_used_at, use_count, expires_at, created_at, is_active FROM api_key WHERE id = ? AND tenant_id = ?');
        $sel->execute([$targetId, $tenant]);
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return TemplateResponder::respond($response->withStatus(404), ['error' => 'api_key not found in tenant']);
        }

        $statusAtReview = self::classify($row, time())['status'];
        $admin = UserAuth::authedUser($request) ?: [];
        $reviewer = (string)(($admin['email'] ?? '') ?: ($admin['name'] ?? '') ?: 'admin');
        $label = trim(((string)$row['key_prefix']) . ' ' . ((string)$row['name']));

        $revoked = false;
        if ($decision === 'revoke') {
            // 기존 revoke semantics 재사용(is_active=0) — 신규 파괴경로 신설 안 함.
            $upd = $pdo->prepare('UPDATE api_key SET is_active = 0 WHERE id = ? AND tenant_id = ?');
            $upd->execute([$targetId, $tenant]);
            $revoked = $upd->rowCount() > 0;
        }

        // 검토 이력 영속(추가전용).
        self::ensureTable($pdo);
        $pdo->prepare(
            'INSERT INTO access_review_item (tenant_id, kind, target_id, target_label, status_at_review, decision, justification, reviewer, created_at)
             VALUES (?,?,?,?,?,?,?,?,?)'
        )->execute([$tenant, 'api_key', (string)$targetId, $label, $statusAtReview, $decision, $justification, substr($reviewer, 0, 190), gmdate('c')]);

        // 증거: 불변 해시체인 기록(ADR D-2 — SecurityAudit 참조, 흡수 아님).
        SecurityAudit::log($pdo, $tenant, $reviewer, 'access_review.decision', [
            'kind'      => 'api_key',
            'target_id' => $targetId,
            'label'     => $label,
            'status'    => $statusAtReview,
            'decision'  => $decision,
            'revoked'   => $revoked,
            'reason'    => $justification,
        ], $request);

        return TemplateResponder::respond($response, [
            'ok'        => true,
            'target_id' => $targetId,
            'decision'  => $decision,
            'revoked'   => $revoked,
            'status_at_review' => $statusAtReview,
        ]);
    }

    /** GET /v424/access-review/history — 검토 결정 이력. */
    public static function history(Request $request, Response $response, array $args): Response
    {
        if ($resp = self::requireAdmin($request, $response)) return $resp;
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        self::ensureTable($pdo);

        $stmt = $pdo->prepare('SELECT kind, target_id, target_label, status_at_review, decision, justification, reviewer, created_at FROM access_review_item WHERE tenant_id = ? ORDER BY id DESC LIMIT 200');
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return TemplateResponder::respond($response, ['ok' => true, 'tenant' => $tenant, 'total' => count($rows), 'items' => $rows]);
    }
}
