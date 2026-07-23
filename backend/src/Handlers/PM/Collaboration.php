<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * CWIS Part001 — Collaboration Platform Foundation (Slim/PDO 적응 구현).
 *
 * ★교차검증(feedback_cross_verify_all_commands): 명령서는 Laravel/DDD/artisan/Eloquent-migration/
 *   PHPStan-L8/Pest/Enum/Interface 전제였으나 실제 스택은 Slim4 + PDO + routes.php 문자열매핑 +
 *   Handler + ensureTables 자가치유 + 테스트러너 부재 + Enum/Interface 0개(CCIS Part005). → 명세 형식을
 *   맹목 이행하지 않고 저장소 관례로 적응(static 클래스 + const 배열, DDD 4계층/Enum/Repository 인터페이스 없음).
 *
 * ★재사용(헌법 Reuse→Extend·신규엔진 금지): PM\Shared 확장으로 세션인증·테넌트격리·역할게이트·pm_audit_log
 *   감사(→PM 활동피드/SSE 자동연동)·genId·validId 를 그대로 승계. 테넌트격리·RBAC(TeamPermissions)·
 *   SecurityAudit·user_notification·SSE 는 기존 인프라 재사용(gap analysis part001 §3).
 *
 * ★스코프(part001 분석 결론): capability = **테넌트 스코프**(프로젝트 종속 아님). 진입점만 /pm 에 노출.
 *   프로젝트 협업(태스크 댓글·활동)=PM 재사용, 팀/조직 협업(채널·문서·회의)=팀/워크스페이스 레이어(후속 Part).
 *
 * ★MISSING 코어(messaging/document/meeting/whiteboard/presence·양방향 실시간)는 PLANNED 로 등록만 하고
 *   실기능은 후속 Part. 미구현을 ENABLED(구현완료)로 위장하지 않는다(정직 상태표기).
 *
 * Endpoints (routes.php · /v425/pm/collaboration/* — 기존 PM 세션 bypass 재사용):
 *   GET  /v425/pm/collaboration/capabilities            => listCapabilities
 *   GET  /v425/pm/collaboration/capabilities/{key}       => getCapability
 *   POST /v425/pm/collaboration/capabilities/{key}/enable  => enableCapability (admin)
 *   POST /v425/pm/collaboration/capabilities/{key}/disable => disableCapability (admin)
 *   GET  /v425/pm/collaboration/readiness                => readiness
 */
final class Collaboration extends Shared
{
    /** ensureCollabTables 메모(운영/데모 각각 1회). */
    private static array $collabEnsured = [];

    private const STATUSES = ['PLANNED', 'ANALYZING', 'PARTIAL', 'ENABLED', 'DISABLED', 'DEPRECATED', 'BLOCKED'];

    /** readiness 가중치(status → [0,1]). ENABLED=실사용, PARTIAL=부분, 그 외=0. */
    private const WEIGHT = ['ENABLED' => 1.0, 'PARTIAL' => 0.5, 'ANALYZING' => 0.2, 'PLANNED' => 0.0, 'DISABLED' => 0.0, 'DEPRECATED' => 0.0, 'BLOCKED' => 0.0];

    /**
     * Capability 카탈로그 시드 — 근거=docs/cwis/part001-gap-analysis.md(실측 gap analysis).
     * [key, name, status, implementation_part, dependencies[], description]
     * status 는 "실제 구현 상태"를 정직 반영(ENABLED=실배선·PARTIAL=부분·PLANNED=미착수).
     */
    private const CATALOG = [
        ['collaboration.foundation',   '협업 기반',        'ENABLED', '001', [],                            'Capability Registry·테넌트별 기능제어·감사·readiness (본 Part)'],
        ['collaboration.security',     '협업 보안·감사',   'ENABLED', '001', ['collaboration.foundation'],  '테넌트격리·RBAC(TeamPermissions)·SecurityAudit 재사용'],
        ['collaboration.team',         '팀',               'ENABLED', '001', ['collaboration.foundation'],  '기존 /auth/team 재사용(EXISTS_COMPLETE)'],
        ['collaboration.member',       '멤버',             'ENABLED', '001', ['collaboration.team'],        '기존 팀 멤버 재사용'],
        ['collaboration.task',         '업무 협업(태스크)', 'ENABLED', '001', ['collaboration.foundation'],  'PM 태스크 재사용(EXISTS_COMPLETE)'],
        ['collaboration.comment',      '댓글',             'ENABLED', '001', ['collaboration.task'],        'PM pm_task_comments 재사용(태스크 스코프)'],
        ['collaboration.activity',     '활동 피드',        'ENABLED', '001', ['collaboration.foundation'],  'pm_audit_log + 단방향 SSE 재사용'],
        ['collaboration.attachment',   '첨부',             'ENABLED', '001', ['collaboration.task'],        'PM pm_attachments 재사용'],
        ['collaboration.notification', '알림',             'ENABLED', '001', ['collaboration.foundation'],  'user_notification/WebPush 재사용'],
        ['collaboration.realtime',     '실시간(단방향)',   'PARTIAL', '001', ['collaboration.foundation'],  'PM SSE 단방향 존재 · 양방향(WS/CRDT) 부재'],
        ['collaboration.workspace',    '워크스페이스',     'PARTIAL', '002', ['collaboration.foundation'],  'WorkspaceState KV 실재 · 협업 UI 는 데모 shell(재작성 대상)'],
        // [CWIS Part002] 조직/워크스페이스/팀/멤버 — 대부분 기존구조 재사용(교차검증: 명세 §4 복제금지·§1 Reuse).
        ['collaboration.organization', '조직',             'ENABLED', '002', ['collaboration.foundation'],  'tenant=조직(tenant_business_profile: company_name/industry). 별도 org 계층 신설은 제품범위 검토 후'],
        ['collaboration.external',     '외부 협업(게스트/파트너)', 'PARTIAL', '002', ['collaboration.organization'], 'AgencyPortal(agency_client_link)·PartnerPortal 부분 존재 · 통합 게스트/파트너 초대는 후속'],
        ['collaboration.invitation',   '초대',             'PLANNED', '002', ['collaboration.member'],      '일반 초대(token_hash/만료/수락/철회) 부재 — agency/live 도메인특화만 존재. Part002 후속 착수 대상(1순위)'],
        ['collaboration.department',   '부서',             'PLANNED', '002', ['collaboration.workspace'],   '부재 · 제품범위(소규모 팀 SaaS) 검토 필요 — 다단계 부서계층 수요 확인 후'],
        ['collaboration.squad',        '스쿼드',           'PLANNED', '002', ['collaboration.team'],        '부재 · 제품범위 검토(스쿼드/애자일 조직 수요 확인 후)'],
        ['collaboration.community',    '커뮤니티',         'PLANNED', '002', ['collaboration.workspace'],   '부재 · 제품범위 검토(관심사 기반 커뮤니티 수요 확인 후)'],
        ['collaboration.mention',      '멘션',             'PARTIAL', '003', ['collaboration.comment'],     'mentions_csv 컬럼 스텁 · 해석/알림 파이프라인 부재'],
        ['collaboration.approval',     '승인 워크플로',    'PARTIAL', '009', ['collaboration.foundation'],  '3계열 산재(Alerting/Catalog/FeedTemplate) · 통합 필요'],
        ['collaboration.presence',     '접속 상태',        'PLANNED', '004', ['collaboration.realtime'],    '양방향 실시간 전제(미착수)'],
        ['collaboration.messaging',    '메시징',           'PLANNED', '005', ['collaboration.channel'],     '팀 내부 메시징(미착수·인프라 부재)'],
        ['collaboration.channel',      '채널',             'PLANNED', '005', ['collaboration.workspace'],   '협업 채널(미착수)'],
        ['collaboration.thread',       '스레드',           'PLANNED', '005', ['collaboration.messaging'],   '스레드(미착수)'],
        ['collaboration.document',     '문서·위키',        'PLANNED', '010', ['collaboration.workspace'],   '문서 공동편집(미착수·CRDT 전제)'],
        ['collaboration.meeting',      '회의',             'PLANNED', '015', ['collaboration.realtime'],    '회의·안건·회의록·액션아이템(미착수)'],
        ['collaboration.whiteboard',   '화이트보드',       'PLANNED', '020', ['collaboration.realtime'],    '시각 협업(미착수)'],
        ['collaboration.knowledge',    '지식·검색',        'PLANNED', '025', ['collaboration.document'],    '지식그래프·전문가탐색(미착수)'],
        ['collaboration.ai',           'AI 협업',          'PLANNED', '028', ['collaboration.foundation'],  'Copilot/요약/추천(미착수)'],
        ['collaboration.automation',   '자동화',           'PLANNED', '030', ['collaboration.foundation'],  '규칙/트리거/에스컬레이션(미착수)'],
        ['collaboration.analytics',    '협업 분석',        'PLANNED', '032', ['collaboration.foundation'],  '협업 지표(미착수)'],
    ];

    /** disable 금지(비활성화 시 기반 붕괴) capability. */
    private const PROTECTED_KEYS = ['collaboration.foundation', 'collaboration.security'];

    /* ── 테이블 자가치유 + 카탈로그 시드(멱등, ChannelRegistry 패턴) ───────────────── */

    private static function ensureCollabTables(\PDO $pdo, bool $isDemo): void
    {
        $memo = $isDemo ? 'demo' : 'ops';
        if (isset(self::$collabEnsured[$memo])) return;
        self::$collabEnsured[$memo] = true;

        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_capabilities (
                    id INT AUTO_INCREMENT PRIMARY KEY, public_id VARCHAR(64), capability_key VARCHAR(120) NOT NULL,
                    name VARCHAR(160), description TEXT, status VARCHAR(30) DEFAULT 'PLANNED',
                    implementation_part VARCHAR(10), version VARCHAR(20) DEFAULT '1.0',
                    dependencies_json TEXT, metadata_json TEXT, created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_collab_cap_key (capability_key), KEY idx_collab_cap_part (implementation_part)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_collaboration_capabilities (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, capability_key VARCHAR(120) NOT NULL,
                    is_enabled TINYINT(1) DEFAULT 0, configuration_json TEXT, enabled_at VARCHAR(32), disabled_at VARCHAR(32),
                    enabled_by VARCHAR(100), created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_tcc (tenant_id, capability_key), KEY idx_tcc_tenant (tenant_id, is_enabled)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_capabilities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT, capability_key TEXT NOT NULL UNIQUE,
                    name TEXT, description TEXT, status TEXT DEFAULT 'PLANNED', implementation_part TEXT,
                    version TEXT DEFAULT '1.0', dependencies_json TEXT, metadata_json TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_collaboration_capabilities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, capability_key TEXT NOT NULL,
                    is_enabled INTEGER DEFAULT 0, configuration_json TEXT, enabled_at TEXT, disabled_at TEXT,
                    enabled_by TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_tcc ON tenant_collaboration_capabilities(tenant_id, capability_key)");
            }
        } catch (\Throwable $e) { /* graceful — 존재 시 무영향 */ }

        // 카탈로그 시드(멱등 upsert — 재배포 시 status/name 갱신). capability_key UNIQUE 기준.
        $now = gmdate('c');
        try {
            $sql = $isMy
                ? "INSERT INTO collaboration_capabilities (public_id,capability_key,name,description,status,implementation_part,dependencies_json,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status=VALUES(status),
                     implementation_part=VALUES(implementation_part), dependencies_json=VALUES(dependencies_json), updated_at=VALUES(updated_at)"
                : "INSERT INTO collaboration_capabilities (public_id,capability_key,name,description,status,implementation_part,dependencies_json,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(capability_key) DO UPDATE SET name=excluded.name, description=excluded.description, status=excluded.status,
                     implementation_part=excluded.implementation_part, dependencies_json=excluded.dependencies_json, updated_at=excluded.updated_at";
            $st = $pdo->prepare($sql);
            foreach (self::CATALOG as $c) {
                [$key, $name, $status, $part, $deps, $desc] = $c;
                $st->execute(['cap_' . substr(md5($key), 0, 16), $key, $name, $desc, $status, $part, json_encode($deps, JSON_UNESCAPED_UNICODE), $now, $now]);
            }
        } catch (\Throwable $e) { /* 시드 실패는 무음 — 조회는 CATALOG 폴백 가능 */ }
    }

    /** capability_key → 카탈로그 엔트리(정적). */
    private static function catalogByKey(string $key): ?array
    {
        foreach (self::CATALOG as $c) {
            if ($c[0] === $key) {
                return ['key' => $c[0], 'name' => $c[1], 'status' => $c[2], 'implementation_part' => $c[3], 'dependencies' => $c[4], 'description' => $c[5]];
            }
        }
        return null;
    }

    /** 테넌트별 활성화 오버레이 맵(capability_key → is_enabled bool). */
    private static function tenantOverlay(\PDO $pdo, string $tenant): array
    {
        $out = [];
        try {
            $st = $pdo->prepare("SELECT capability_key, is_enabled FROM tenant_collaboration_capabilities WHERE tenant_id = ?");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['capability_key']] = (int)$r['is_enabled'] === 1;
            }
        } catch (\Throwable $e) { /* 빈 오버레이 = 카탈로그 기본값 */ }
        return $out;
    }

    /** 테넌트 유효 활성 여부 — 오버레이 우선, 없으면 status 기본(ENABLED/PARTIAL=true, 그 외 false). */
    private static function effectiveEnabled(array $cat, array $overlay): bool
    {
        if (array_key_exists($cat['key'], $overlay)) return $overlay[$cat['key']];
        return in_array($cat['status'], ['ENABLED', 'PARTIAL'], true);
    }

    private static function toDTO(array $cat, array $overlay): array
    {
        return [
            'key'                 => $cat['key'],
            'name'                => $cat['name'],
            'status'              => $cat['status'],
            'enabled'             => self::effectiveEnabled($cat, $overlay),
            'tenant_overridden'   => array_key_exists($cat['key'], $overlay),
            'maturity_weight'     => self::WEIGHT[$cat['status']] ?? 0.0,
            'implementation_part' => $cat['implementation_part'],
            'dependencies'        => $cat['dependencies'],
            'description'         => $cat['description'],
        ];
    }

    /* ── Endpoints ─────────────────────────────────────────────────────── */

    /** GET /v425/pm/collaboration/capabilities */
    public static function listCapabilities(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        self::ensureCollabTables($g['pdo'], $g['isDemo']);
        $overlay = self::tenantOverlay($g['pdo'], $g['tenant']);
        $caps = array_map(fn($c) => self::toDTO(self::catalogByKey($c[0]), $overlay), self::CATALOG);
        return self::json($resp, ['ok' => true, 'tenant' => $g['tenant'], 'capabilities' => $caps, 'count' => count($caps)]);
    }

    /** GET /v425/pm/collaboration/capabilities/{key} */
    public static function getCapability(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $key = (string)($args['key'] ?? '');
        $cat = self::catalogByKey($key);
        if ($cat === null) return self::json($resp, ['ok' => false, 'error' => 'unknown_capability', 'key' => $key], 404);
        self::ensureCollabTables($g['pdo'], $g['isDemo']);
        $overlay = self::tenantOverlay($g['pdo'], $g['tenant']);
        return self::json($resp, ['ok' => true, 'tenant' => $g['tenant'], 'capability' => self::toDTO($cat, $overlay)]);
    }

    /** POST /v425/pm/collaboration/capabilities/{key}/enable (admin) */
    public static function enableCapability(Request $req, Response $resp, array $args): Response
    {
        return self::setEnabled($req, $resp, $args, true);
    }

    /** POST /v425/pm/collaboration/capabilities/{key}/disable (admin) */
    public static function disableCapability(Request $req, Response $resp, array $args): Response
    {
        return self::setEnabled($req, $resp, $args, false);
    }

    private static function setEnabled(Request $req, Response $resp, array $args, bool $enable): Response
    {
        $g = self::gate($req, $resp, 'admin'); // 관리자 전용(spec §21)
        if (isset($g['error'])) return $g['error'];
        $key = (string)($args['key'] ?? '');
        $cat = self::catalogByKey($key);
        if ($cat === null) return self::json($resp, ['ok' => false, 'error' => 'unknown_capability', 'key' => $key], 404);

        // ★정직성 게이트: PLANNED/미구현 capability 는 활성화 불가(미구현을 '사용가능'으로 위장 금지).
        if ($enable && !in_array($cat['status'], ['ENABLED', 'PARTIAL'], true)) {
            return self::json($resp, ['ok' => false, 'error' => 'capability_not_implemented',
                'key' => $key, 'status' => $cat['status'],
                'message' => "'{$cat['name']}'({$cat['status']})는 아직 구현되지 않아 활성화할 수 없습니다. 후속 Part에서 제공됩니다."], 409);
        }
        // 기반 capability 비활성화 금지(붕괴 방지).
        if (!$enable && in_array($key, self::PROTECTED_KEYS, true)) {
            return self::json($resp, ['ok' => false, 'error' => 'protected_capability',
                'key' => $key, 'message' => "'{$cat['name']}'는 협업 기반이라 비활성화할 수 없습니다."], 409);
        }

        self::ensureCollabTables($g['pdo'], $g['isDemo']);
        $overlay = self::tenantOverlay($g['pdo'], $g['tenant']);

        // 의존성 검증(활성화 시) — 의존 capability 가 유효 활성 상태여야.
        if ($enable) {
            foreach ($cat['dependencies'] as $dep) {
                $depCat = self::catalogByKey($dep);
                if ($depCat && !self::effectiveEnabled($depCat, $overlay)) {
                    return self::json($resp, ['ok' => false, 'error' => 'dependency_not_enabled',
                        'key' => $key, 'missing_dependency' => $dep,
                        'message' => "선행 기능 '{$depCat['name']}'을(를) 먼저 활성화해야 합니다."], 409);
                }
            }
        }

        $pdo = $g['pdo']; $tenant = $g['tenant']; $now = gmdate('c');
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $sql = $isMy
                ? "INSERT INTO tenant_collaboration_capabilities (tenant_id,capability_key,is_enabled,enabled_at,disabled_at,enabled_by,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?)
                   ON DUPLICATE KEY UPDATE is_enabled=VALUES(is_enabled), enabled_at=VALUES(enabled_at), disabled_at=VALUES(disabled_at), enabled_by=VALUES(enabled_by), updated_at=VALUES(updated_at)"
                : "INSERT INTO tenant_collaboration_capabilities (tenant_id,capability_key,is_enabled,enabled_at,disabled_at,enabled_by,created_at,updated_at)
                   VALUES (?,?,?,?,?,?,?,?)
                   ON CONFLICT(tenant_id,capability_key) DO UPDATE SET is_enabled=excluded.is_enabled, enabled_at=excluded.enabled_at, disabled_at=excluded.disabled_at, enabled_by=excluded.enabled_by, updated_at=excluded.updated_at";
            $pdo->prepare($sql)->execute([
                $tenant, $key, $enable ? 1 : 0,
                $enable ? $now : null, $enable ? null : $now,
                (string)($g['user_id'] ?? $tenant), $now, $now,
            ]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'persist_failed', 'message' => $e->getMessage()], 500);
        }

        // 감사(pm_audit_log 재사용 → PM 활동피드/SSE 자동연동).
        try {
            self::auditLog($pdo, [
                'tenant_id' => $tenant, 'actor_user_id' => (string)($g['user_id'] ?? $tenant), 'actor_api_key' => $g['api_key'] ?? null,
                'entity_type' => 'collaboration_capability', 'entity_id' => $key,
                'action' => $enable ? 'capability_enabled' : 'capability_disabled',
                'diff' => ['status' => $cat['status'], 'is_enabled' => $enable], 'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
            ]);
        } catch (\Throwable $e) { /* 감사 실패는 무음 — 상태변경 우선 */ }

        $overlay[$key] = $enable;
        return self::json($resp, ['ok' => true, 'capability' => self::toDTO($cat, $overlay)]);
    }

    /** GET /v425/pm/collaboration/readiness — capability 상태 기반 준비도 산출. */
    public static function readiness(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        self::ensureCollabTables($g['pdo'], $g['isDemo']);
        $overlay = self::tenantOverlay($g['pdo'], $g['tenant']);

        $byStatus = ['ENABLED' => 0, 'PARTIAL' => 0, 'PLANNED' => 0, 'ANALYZING' => 0, 'DISABLED' => 0, 'DEPRECATED' => 0, 'BLOCKED' => 0];
        $weightSum = 0.0; $enabledForTenant = 0; $blocking = [];
        foreach (self::CATALOG as $c) {
            $cat = self::catalogByKey($c[0]);
            $byStatus[$cat['status']] = ($byStatus[$cat['status']] ?? 0) + 1;
            $weightSum += self::WEIGHT[$cat['status']] ?? 0.0;
            if (self::effectiveEnabled($cat, $overlay)) $enabledForTenant++;
            // 차단이슈: 다수 후속 기능의 선행인 PLANNED 인프라(realtime) 노출.
            if ($cat['status'] === 'PLANNED' && in_array($cat['key'], ['collaboration.realtime', 'collaboration.messaging', 'collaboration.document'], true)) {
                $blocking[] = ['key' => $cat['key'], 'name' => $cat['name'], 'status' => $cat['status'], 'reason' => '미착수(후속 Part 전제)'];
            }
        }
        $total = count(self::CATALOG);
        $score = $total > 0 ? (int)round($weightSum / $total * 100) : 0;

        return self::json($resp, ['ok' => true, 'tenant' => $g['tenant'], 'data' => [
            'readiness_score'      => $score,          // 0~100 (ENABLED=1·PARTIAL=0.5 가중 평균)
            'total_capabilities'   => $total,
            'enabled_for_tenant'   => $enabledForTenant,
            'by_status'            => $byStatus,
            'blocking_issues'      => $blocking,
            'note'                 => 'readiness 는 capability 실구현 상태 가중평균. PLANNED 코어(실시간/메시징/문서)는 후속 Part에서 상승.',
        ]]);
    }
}
