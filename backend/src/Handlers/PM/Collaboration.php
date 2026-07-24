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
        ['collaboration.workspace',    '워크스페이스',     'ENABLED', '002', ['collaboration.foundation'],  '개인 워크스페이스 홈(GET /hub) 실배선 — 작업/활동/멘션/프로젝트 집계 + 플랜별 기능 컨텍스트. 전 구독플랜 사용(viewer+)'],
        // [CWIS Part002] 조직/워크스페이스/팀/멤버 — 대부분 기존구조 재사용(교차검증: 명세 §4 복제금지·§1 Reuse).
        ['collaboration.organization', '조직',             'ENABLED', '002', ['collaboration.foundation'],  'tenant=조직(tenant_business_profile: company_name/industry). 별도 org 계층 신설은 제품범위 검토 후'],
        ['collaboration.external',     '외부 협업(게스트/파트너)', 'ENABLED', '003', ['collaboration.invitation'], '외부 스코프 초대·접근 그랜트 구현 — 특정 프로젝트만·만료·최소권한(read/comment)·PM 게이트 Default Deny·감사'],
        ['collaboration.access',       '접근통제(RBAC+스코프)',    'ENABLED', '003', ['collaboration.security'],    '기존 RBAC(TeamPermissions/api_key/PM 역할) 재사용 + 외부 스코프 그랜트 evaluateAccess. 전면 ABAC/JIT/위임/SoD 는 제품범위 보류'],
        ['collaboration.invitation',   '초대',             'ENABLED', '002', ['collaboration.member'],      '초대 엔진 구현 — token_hash(SHA256)/만료/1회성/이메일검증/rate/감사·수락 시 UserAuth 프로비저너 재사용(member/manager)'],
        ['collaboration.department',   '부서',             'PLANNED', '002', ['collaboration.workspace'],   '부재 · 제품범위(소규모 팀 SaaS) 검토 필요 — 다단계 부서계층 수요 확인 후'],
        ['collaboration.squad',        '스쿼드',           'PLANNED', '002', ['collaboration.team'],        '부재 · 제품범위 검토(스쿼드/애자일 조직 수요 확인 후)'],
        ['collaboration.community',    '커뮤니티',         'PLANNED', '002', ['collaboration.workspace'],   '부재 · 제품범위 검토(관심사 기반 커뮤니티 수요 확인 후)'],
        // [CWIS Part004-01] 내비게이션/정보구조 — 진단만 실구현. 미구현을 ENABLED 로 위장하지 않는다(§26·§38).
        ['collaboration.navigation.analysis',        '내비게이션 진단',       'ENABLED',   '004', ['collaboration.foundation'],                 'tools/navigation_analyze.mjs 스캐너·정합검사·리포트 + 본 API. 정적분석(소스 미실행)'],
        // [Part004-02] 레지스트리 실구현 — 스냅샷 생성기 + Resolver + 사용자 조회 API 가 실제 동작해야만 ENABLED(§50).
        ['collaboration.navigation.registry',        '통합 메뉴 레지스트리',  'ENABLED',   '004', ['collaboration.navigation.analysis'],        'navigation_registry.json(빌드 스냅샷·89항목/105 alias) + PM\\Navigation Resolver + GET /v425/pm/navigation 실배선. 정본은 정적 SSOT 유지(DB 이원화 안 함)'],
        // [Part004-03] 실배선 완료 — API(GET /v425/pm/sidebar) + UI(UnifiedSidebar/SidebarSwitch) 연결됨.
        //   ★status=ENABLED 는 "구현 완료"를 뜻하고, 테넌트별 실제 노출은 아래 오버레이 토글(기본 OFF)이 결정한다.
        //   이 capability 를 켜는 것이 곧 신규 사이드바 전환 스위치다(신규 Feature Flag 저장소 신설 없음).
        ['collaboration.navigation.sidebar',         '통합 사이드바',         'ENABLED',   '004', ['collaboration.navigation.registry'],        'Registry 트리 렌더 + Active/조상 활성 + 접기/미니/모바일 오버레이(Focus Trap) + Skip Link. ★본 capability 토글이 레거시↔신규 전환 스위치(기본 OFF=레거시 유지)'],
        ['collaboration.navigation.context_switcher', '컨텍스트 전환기',      'ENABLED',   '004', ['collaboration.navigation.sidebar'],         '실재 축만: TENANT(자기+대행사 승인 위임+admin act-as)·PROJECT(pm_projects). 조직/워크스페이스/팀은 엔티티 부재로 unavailable_axes 정직 반환'],
        ['collaboration.navigation.breadcrumb',      'Breadcrumb',            'ENABLED',   '004', ['collaboration.navigation.registry'],        '메뉴 계층+리소스(PM 프로젝트/하위탭) 결합·테넌트 격리·XSS 제거·축약+스크린리더 전체경로'],
        ['collaboration.navigation.mobile_foundation', '모바일 내비 기반',    'PARTIAL',   '004', ['collaboration.navigation.sidebar'],         'Drawer/Focus Trap/Escape/배경 스크롤 잠금 구현. 하단 탭(MobileBottomNav)은 아직 레거시 하드코딩 — Part004-07 에서 Registry 연결'],
        ['collaboration.navigation.favorites',       '즐겨찾기·고정',         'PARTIAL',   '004', ['collaboration.navigation.sidebar'],         'Sidebar QuickAccessPanel 실재(localStorage 디바이스 로컬) · 서버 영속/계정 이동 부재'],
        ['collaboration.navigation.recents',         '최근 항목',             'PARTIAL',   '004', ['collaboration.navigation.sidebar'],         '최근 방문 5건 실재(경로만 저장·언어 무관 재해석) · 서버 영속 부재'],
        ['collaboration.navigation.personal_hub',    '개인 작업함',           'ENABLED',   '004', ['collaboration.task'],                       '협업 홈 워크스페이스(GET /hub)에 내 작업·활동·멘션·프로젝트 통합 진입점 실배선. 승인 통합은 collaboration.approval 연동(진행 중)'],
        ['collaboration.navigation.command_palette', 'Command Palette',       'PARTIAL',   '004', ['collaboration.navigation.registry'],        'Ctrl+K 팔레트 실재(28개 하드코딩·플랜필터 적용) · manifest 미참조라 구조적 드리프트'],
        ['collaboration.mention',      '멘션',             'ENABLED', '003', ['collaboration.comment'],     '본문 @토큰+mentions_csv 해석 → 테넌트 사용자 매칭 → user_notification 알림(Comments::notifyMentions). 협업 홈 멘션 피드 표면화'],
        ['collaboration.approval',     '승인 워크플로',    'ENABLED', '009', ['collaboration.foundation'],  '통합 승인함 — action_request(승인 SSOT) pending 을 협업 홈에 표면화 + 기존 /v423/approvals decide 재사용(집행 SSOT 불변·중복 생산 0)'],
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
        // ★재구성 P0: 내부 구현 정보(개발자 설명·CWIS Part 번호·의존 capability 키·성숙도 가중치)를
        //   API 응답에서 제거 — 이 필드들이 테이블/클래스/API 경로/내부 설계를 노출했다. UI 는 자체 비즈니스
        //   라벨을 쓰고 key/enabled 만 소비한다. name/status/enabled/key(토글용)만 반환한다.
        return [
            'key'               => $cat['key'],
            'name'              => $cat['name'],
            'status'            => $cat['status'],
            'enabled'           => self::effectiveEnabled($cat, $overlay),
            'tenant_overridden' => array_key_exists($cat['key'], $overlay),
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

    /* ══════════════════════════════════════════════════════════════════════
     * [CWIS Part002] Invitation 엔진 (초엔터프라이즈급 · 진짜 결여였던 초대 구현)
     *  ★보안: token 은 hash-only 저장(UserAuth::hashToken=SHA256·세션토큰 hash-gate 교훈 승계)·raw 는 생성 시 1회만
     *    노출 · 192bit 엔트로피(brute-force 불가) · 만료 · 1회성(status 게이트) · 이메일 결속 · 테넌트격리 · 감사(pm_audit_log).
     *  ★멤버 프로비저닝은 UserAuth::provisionInvitedMember 재사용(중복 재구현 금지)·admin/owner 부여 불가(member/manager).
     * ════════════════════════════════════════════════════════════════════ */

    private static array $invEnsured = [];
    private const INV_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'];

    private static function ensureInvitationTable(\PDO $pdo, bool $isDemo): void
    {
        $memo = $isDemo ? 'demo' : 'ops';
        if (isset(self::$invEnsured[$memo])) return;
        self::$invEnsured[$memo] = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_invitations (
                    id INT AUTO_INCREMENT PRIMARY KEY, public_id VARCHAR(64), tenant_id VARCHAR(100) NOT NULL,
                    scope_type VARCHAR(30) DEFAULT 'ORGANIZATION', scope_id VARCHAR(100),
                    email VARCHAR(190) NOT NULL, membership_type VARCHAR(30) DEFAULT 'member', team_name VARCHAR(100),
                    token_hash VARCHAR(80) NOT NULL, status VARCHAR(20) DEFAULT 'PENDING', invited_by VARCHAR(100),
                    fail_count INT DEFAULT 0, expires_at VARCHAR(32), accepted_at VARCHAR(32), declined_at VARCHAR(32),
                    revoked_at VARCHAR(32), accepted_user_id VARCHAR(100), created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_inv_token (token_hash), KEY idx_inv_tenant (tenant_id, email, status), KEY idx_inv_exp (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_invitations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT, tenant_id TEXT NOT NULL,
                    scope_type TEXT DEFAULT 'ORGANIZATION', scope_id TEXT, email TEXT NOT NULL,
                    membership_type TEXT DEFAULT 'member', team_name TEXT, token_hash TEXT NOT NULL UNIQUE,
                    status TEXT DEFAULT 'PENDING', invited_by TEXT, fail_count INTEGER DEFAULT 0, expires_at TEXT,
                    accepted_at TEXT, declined_at TEXT, revoked_at TEXT, accepted_user_id TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE INDEX IF NOT EXISTS idx_inv_tenant ON collaboration_invitations(tenant_id, email, status)");
            }
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function hostIsDemo(Request $req): bool
    {
        $h = strtolower((string)($req->getServerParams()['HTTP_HOST'] ?? ''));
        return str_contains($h, 'demo') || str_contains($h, 'roidemo');
    }

    private static function tenantOwnerPlan(\PDO $pdo, string $tenant): string
    {
        try {
            $st = $pdo->prepare("SELECT plan FROM app_user WHERE tenant_id=? AND (parent_user_id IS NULL OR team_role='owner') ORDER BY id LIMIT 1");
            $st->execute([$tenant]);
            $p = (string)($st->fetchColumn() ?: '');
            return $p !== '' ? $p : 'pro';
        } catch (\Throwable $e) { return 'pro'; }
    }

    /** POST /v425/pm/collaboration/invitations (admin) — 초대 발급. raw token 1회 반환. */
    public static function createInvitation(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureInvitationTable($pdo, $g['isDemo']);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $roleIn = (string)($b['membership_type'] ?? $b['role'] ?? 'member');
        $role  = in_array($roleIn, ['member', 'manager', 'guest', 'partner'], true) ? $roleIn : 'member';
        $isExternal = in_array($role, ['guest', 'partner'], true);   // [CWIS Part003] 외부 협업자
        $teamName = trim((string)($b['team_name'] ?? '')) ?: null;
        // 외부(게스트/파트너)는 특정 프로젝트 스코프 필수(전사 접근 금지·최소권한). 내부는 조직 스코프.
        $scopeType = $isExternal ? 'PROJECT' : 'ORGANIZATION';
        $scopeId   = $isExternal ? trim((string)($b['scope_id'] ?? $b['project_id'] ?? '')) : $tenant;
        $days = max(1, min($isExternal ? 90 : 30, (int)($b['expires_days'] ?? ($isExternal ? 14 : 7)))); // 외부는 만료 필수·기본 14일
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return self::json($resp, ['ok' => false, 'error' => '올바른 이메일 형식이 아닙니다.'], 422);
        if ($isExternal && $scopeId === '') return self::json($resp, ['ok' => false, 'error' => '외부 협업자는 접근할 프로젝트(scope_id)를 지정해야 합니다.'], 422);

        // 중복검사: 이미 가입된 이메일 / 대기중 초대
        try {
            $ex = $pdo->prepare("SELECT id FROM app_user WHERE LOWER(email)=? AND tenant_id=?");
            $ex->execute([$email, $tenant]);
            if ($ex->fetchColumn()) return self::json($resp, ['ok' => false, 'error' => '이미 팀에 속한 이메일입니다.'], 409);
        } catch (\Throwable $e) {}
        $pend = $pdo->prepare("SELECT id FROM collaboration_invitations WHERE tenant_id=? AND email=? AND status='PENDING'");
        $pend->execute([$tenant, $email]);
        if ($pend->fetchColumn()) return self::json($resp, ['ok' => false, 'error' => '이미 대기중인 초대가 있습니다. 재발송 또는 철회 후 다시 시도하세요.'], 409);
        // Rate: 테넌트 PENDING 상한
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM collaboration_invitations WHERE tenant_id=? AND status='PENDING'");
        $cnt->execute([$tenant]);
        if ((int)$cnt->fetchColumn() >= 200) return self::json($resp, ['ok' => false, 'error' => '대기중 초대가 너무 많습니다(최대 200).'], 429);

        $raw = bin2hex(random_bytes(24)); // 192bit
        $hash = \Genie\Handlers\UserAuth::hashToken($raw);
        $now = gmdate('c'); $exp = gmdate('c', time() + $days * 86400);
        try {
            $pdo->prepare("INSERT INTO collaboration_invitations (public_id,tenant_id,scope_type,scope_id,email,membership_type,team_name,token_hash,status,invited_by,expires_at,created_at,updated_at)
                           VALUES (?,?,?,?,?,?,?,?,'PENDING',?,?,?,?)")
                ->execute(['inv_' . substr($hash, 0, 16), $tenant, $scopeType, $scopeId, $email, $role, $teamName, $hash, (string)($g['user_id'] ?? $tenant), $exp, $now, $now]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'persist_failed', 'message' => $e->getMessage()], 500);
        }
        $base = $g['isDemo'] ? 'https://demo.genieroi.com' : 'https://www.genieroi.com';
        $acceptUrl = $base . '/collab/accept?token=' . $raw;

        // 이메일 발송(best-effort · 미설정 시 skip). 원문 토큰은 링크에만.
        $emailSent = false;
        try {
            if (\Genie\Mailer::isConfigured($pdo)) {
                $bodyHtml = '<p>안녕하세요.</p><p>GeniegoROI 팀 협업에 <b>' . htmlspecialchars($role) . '</b> 권한으로 초대되었습니다.</p>'
                    . '<p>아래 버튼을 눌러 계정을 만들고 초대를 수락하세요. (만료: ' . htmlspecialchars(substr($exp, 0, 10)) . ')</p>';
                $html = \Genie\Mailer::wrapHtml('GeniegoROI 팀 초대', $bodyHtml, '초대 수락', $acceptUrl);
                $r = \Genie\Mailer::send($email, 'GeniegoROI 팀 협업 초대', $html);
                $emailSent = is_array($r) ? (bool)($r['ok'] ?? false) : (bool)$r;
            }
        } catch (\Throwable $e) { /* 발송 실패는 무음 — 링크 수동전달 폴백 */ }

        try {
            self::auditLog($pdo, ['tenant_id' => $tenant, 'actor_user_id' => (string)($g['user_id'] ?? $tenant), 'actor_api_key' => $g['api_key'] ?? null,
                'entity_type' => 'collaboration_invitation', 'entity_id' => $email, 'action' => 'invitation_created',
                'diff' => ['role' => $role, 'expires_at' => $exp, 'email_sent' => $emailSent], 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        } catch (\Throwable $e) {}

        // ★raw token/accept_url 은 이 응답에서 1회만 노출.
        return self::json($resp, ['ok' => true, 'invitation' => ['email' => $email, 'role' => $role, 'status' => 'PENDING', 'expires_at' => $exp],
            'accept_url' => $acceptUrl, 'token' => $raw, 'email_sent' => $emailSent], 201);
    }

    /** GET /v425/pm/collaboration/invitations (analyst+) — 목록(token 미노출·만료 sweep). */
    public static function listInvitations(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureInvitationTable($pdo, $g['isDemo']);
        // 만료 sweep(멱등).
        try { $pdo->prepare("UPDATE collaboration_invitations SET status='EXPIRED', updated_at=? WHERE tenant_id=? AND status='PENDING' AND expires_at < ?")->execute([gmdate('c'), $tenant, gmdate('c')]); } catch (\Throwable $e) {}
        $rows = [];
        try {
            $st = $pdo->prepare("SELECT public_id,email,membership_type,team_name,status,invited_by,expires_at,accepted_at,revoked_at,created_at FROM collaboration_invitations WHERE tenant_id=? ORDER BY id DESC LIMIT 200");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true, 'tenant' => $tenant, 'invitations' => $rows, 'count' => count($rows)]);
    }

    /** POST /v425/pm/collaboration/invitations/{id}/revoke (admin). */
    public static function revokeInvitation(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];
        self::ensureInvitationTable($pdo, $g['isDemo']);
        $pid = (string)($args['id'] ?? '');
        $st = $pdo->prepare("UPDATE collaboration_invitations SET status='REVOKED', revoked_at=?, updated_at=? WHERE tenant_id=? AND public_id=? AND status='PENDING'");
        $st->execute([gmdate('c'), gmdate('c'), $tenant, $pid]);
        if ($st->rowCount() === 0) return self::json($resp, ['ok' => false, 'error' => '철회할 대기중 초대가 없습니다.'], 404);
        try { self::auditLog($pdo, ['tenant_id' => $tenant, 'actor_user_id' => (string)($g['user_id'] ?? $tenant), 'entity_type' => 'collaboration_invitation', 'entity_id' => $pid, 'action' => 'invitation_revoked', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]); } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true]);
    }

    /** GET /v425/pm/collaboration/invitations/verify?token= (public) — 수락 전 미리보기(email/role). */
    public static function verifyInvitation(Request $req, Response $resp): Response
    {
        $isDemo = self::hostIsDemo($req);
        $pdo = \Genie\Db::pdoFor($isDemo);
        self::ensureInvitationTable($pdo, $isDemo);
        $token = (string)($req->getQueryParams()['token'] ?? '');
        if (strlen($token) < 32) return self::json($resp, ['ok' => false, 'error' => 'invalid_token'], 400);
        $inv = self::lookupInvitation($pdo, $token);
        if (!$inv) return self::json($resp, ['ok' => false, 'error' => 'not_found_or_used'], 404);
        if (($inv['status'] ?? '') !== 'PENDING' || (string)($inv['expires_at'] ?? '') < gmdate('c')) {
            return self::json($resp, ['ok' => false, 'error' => 'expired_or_used', 'status' => $inv['status'] ?? ''], 410);
        }
        return self::json($resp, ['ok' => true, 'invitation' => ['email' => $inv['email'], 'role' => $inv['membership_type'], 'expires_at' => $inv['expires_at']]]);
    }

    /** POST /v425/pm/collaboration/invitations/accept (public·pre-auth) — token+password+name → 멤버 프로비저닝. */
    public static function acceptInvitation(Request $req, Response $resp): Response
    {
        $isDemo = self::hostIsDemo($req);
        $pdo = \Genie\Db::pdoFor($isDemo);
        self::ensureInvitationTable($pdo, $isDemo);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $token = (string)($b['token'] ?? '');
        $password = (string)($b['password'] ?? '');
        $name = trim((string)($b['name'] ?? ''));
        if (strlen($token) < 32) return self::json($resp, ['ok' => false, 'error' => 'invalid_token'], 400);
        $inv = self::lookupInvitation($pdo, $token);
        if (!$inv) return self::json($resp, ['ok' => false, 'error' => 'not_found_or_used'], 404);
        if (($inv['status'] ?? '') !== 'PENDING') return self::json($resp, ['ok' => false, 'error' => 'already_' . strtolower((string)$inv['status'])], 410);
        if ((string)($inv['expires_at'] ?? '') < gmdate('c')) {
            try { $pdo->prepare("UPDATE collaboration_invitations SET status='EXPIRED', updated_at=? WHERE id=?")->execute([gmdate('c'), $inv['id']]); } catch (\Throwable $e) {}
            return self::json($resp, ['ok' => false, 'error' => 'expired'], 410);
        }
        $tenant = (string)$inv['tenant_id'];
        $membershipType = (string)$inv['membership_type'];
        $isExternal = in_array($membershipType, ['guest', 'partner'], true);
        $ownerPlan = self::tenantOwnerPlan($pdo, $tenant);
        $prov = \Genie\Handlers\UserAuth::provisionInvitedMember($pdo, $tenant, (int)($inv['invited_by'] ?? 0), $ownerPlan, (string)$inv['email'], $password, $name, $isExternal ? 'guest' : $membershipType, $inv['team_name'] ?? null);
        if (empty($prov['ok'])) return self::json($resp, ['ok' => false, 'error' => $prov['error'] ?? 'provision_failed'], (int)($prov['code'] ?? 422));
        // [CWIS Part003] 외부(게스트/파트너)는 full 접근이 아니라 초대된 프로젝트에만 스코프 그랜트(만료·최소권한 read/comment).
        if ($isExternal) {
            self::ensureGrantsTable($pdo, $isDemo);
            self::insertGrant($pdo, $tenant, strtoupper($membershipType), (string)$prov['user_id'], (string)($inv['scope_type'] ?: 'PROJECT'), (string)($inv['scope_id'] ?? ''), ['read', 'comment'], (string)($inv['invited_by'] ?? ''), '초대 수락(외부 협업)', (string)($inv['expires_at'] ?? ''));
        }
        // 1회성 소진(status→ACCEPTED). 조건부 UPDATE 로 경쟁 이중수락 차단.
        $mk = $pdo->prepare("UPDATE collaboration_invitations SET status='ACCEPTED', accepted_at=?, accepted_user_id=?, updated_at=? WHERE id=? AND status='PENDING'");
        $mk->execute([gmdate('c'), (string)$prov['user_id'], gmdate('c'), $inv['id']]);
        try { self::auditLog($pdo, ['tenant_id' => $tenant, 'actor_user_id' => (string)$prov['user_id'], 'entity_type' => 'collaboration_invitation', 'entity_id' => (string)$inv['email'], 'action' => 'invitation_accepted', 'diff' => ['role' => $inv['membership_type']], 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]); } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true, 'tenant' => $tenant, 'email' => $inv['email'], 'role' => $inv['membership_type'], 'message' => '초대가 수락되었습니다. 로그인하세요.']);
    }

    /** token(raw) → invitation row (hash-only 조회·SHA256). */
    private static function lookupInvitation(\PDO $pdo, string $token): ?array
    {
        try {
            $hash = \Genie\Handlers\UserAuth::hashToken($token);
            $st = $pdo->prepare("SELECT * FROM collaboration_invitations WHERE token_hash=? LIMIT 1");
            $st->execute([$hash]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            return $r ?: null;
        } catch (\Throwable $e) { return null; }
    }

    /* ══════════════════════════════════════════════════════════════════════
     * [CWIS Part003] 외부 스코프 접근 그랜트 (ReBAC 스코프 그랜트 + 외부정책 · 비중복)
     *  ★기존 RBAC(TeamPermissions/api_key/PM 역할게이트) 재사용 — 외부(게스트/파트너)만 스코프 한정 접근을 신규 관리.
     *  Default Deny · 만료 · 최소권한 · 테넌트격리 · 감사. 전면 ABAC/JIT/위임/SoD 는 제품범위 보류(analysis §4).
     * ════════════════════════════════════════════════════════════════════ */

    private static array $grantsEnsured = [];

    private static function ensureGrantsTable(\PDO $pdo, bool $isDemo): void
    {
        $memo = $isDemo ? 'demo' : 'ops';
        if (isset(self::$grantsEnsured[$memo])) return;
        self::$grantsEnsured[$memo] = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_access_grants (
                    id INT AUTO_INCREMENT PRIMARY KEY, public_id VARCHAR(64), tenant_id VARCHAR(100) NOT NULL,
                    principal_type VARCHAR(20) DEFAULT 'GUEST', principal_id VARCHAR(100) NOT NULL,
                    scope_type VARCHAR(30) DEFAULT 'PROJECT', scope_id VARCHAR(100), permissions_json TEXT,
                    effect VARCHAR(10) DEFAULT 'ALLOW', valid_from VARCHAR(32), valid_until VARCHAR(32),
                    granted_by VARCHAR(100), grant_reason VARCHAR(255), revoked_at VARCHAR(32), created_at VARCHAR(32), updated_at VARCHAR(32),
                    KEY idx_grant_principal (tenant_id, principal_id), KEY idx_grant_scope (tenant_id, scope_type, scope_id), KEY idx_grant_exp (valid_until)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_access_grants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT, tenant_id TEXT NOT NULL, principal_type TEXT DEFAULT 'GUEST',
                    principal_id TEXT NOT NULL, scope_type TEXT DEFAULT 'PROJECT', scope_id TEXT, permissions_json TEXT,
                    effect TEXT DEFAULT 'ALLOW', valid_from TEXT, valid_until TEXT, granted_by TEXT, grant_reason TEXT,
                    revoked_at TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE INDEX IF NOT EXISTS idx_grant_principal ON collaboration_access_grants(tenant_id, principal_id)");
            }
        } catch (\Throwable $e) {}
    }

    private static function insertGrant(\PDO $pdo, string $tenant, string $principalType, string $principalId, string $scopeType, string $scopeId, array $perms, string $grantedBy, string $reason, string $validUntil): void
    {
        $now = gmdate('c');
        try {
            $pdo->prepare("INSERT INTO collaboration_access_grants (public_id,tenant_id,principal_type,principal_id,scope_type,scope_id,permissions_json,effect,valid_from,valid_until,granted_by,grant_reason,created_at,updated_at)
                           VALUES (?,?,?,?,?,?,?,'ALLOW',?,?,?,?,?,?)")
                ->execute(['grt_' . bin2hex(random_bytes(6)), $tenant, $principalType, $principalId, $scopeType, $scopeId, json_encode($perms, JSON_UNESCAPED_UNICODE), $now, $validUntil, $grantedBy, $reason, $now, $now]);
        } catch (\Throwable $e) {}
    }

    /**
     * [CWIS Part003] 접근 결정(RBAC+ReBAC 통합·Default Deny). 평가순서: 내부멤버(기존 역할)=ALLOW →
     *   외부(guest/partner)는 유효(미만료·미철회) 스코프 그랜트가 action 커버 시만 ALLOW → 그 외 Default Deny.
     * @return array ['allowed','decision','reason','expires_at']
     */
    public static function evaluateAccess(\PDO $pdo, bool $isDemo, string $tenant, string $principalId, string $teamRole, string $scopeType, string $scopeId, string $action): array
    {
        if (!in_array($teamRole, ['guest', 'partner'], true)) {
            return ['allowed' => true, 'decision' => 'ALLOW', 'reason' => 'internal_member', 'expires_at' => null];
        }
        self::ensureGrantsTable($pdo, $isDemo);
        try {
            $st = $pdo->prepare("SELECT permissions_json, valid_until FROM collaboration_access_grants
                                 WHERE tenant_id=? AND principal_id=? AND scope_type=? AND scope_id=? AND effect='ALLOW' AND revoked_at IS NULL");
            $st->execute([$tenant, $principalId, $scopeType, $scopeId]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                if ((string)($r['valid_until'] ?? '') !== '' && (string)$r['valid_until'] < gmdate('c')) continue; // 만료
                $perms = json_decode((string)($r['permissions_json'] ?? '[]'), true) ?: [];
                if (in_array($action, $perms, true) || in_array('*', $perms, true)) {
                    return ['allowed' => true, 'decision' => 'ALLOW', 'reason' => 'external_scoped_grant', 'expires_at' => $r['valid_until'] ?? null];
                }
            }
        } catch (\Throwable $e) {}
        return ['allowed' => false, 'decision' => 'DENY', 'reason' => 'default_deny_external', 'expires_at' => null];
    }

    private static function principalTeamRole(\PDO $pdo, string $tenant, string $principalId): string
    {
        if (ctype_digit($principalId)) {
            try {
                $st = $pdo->prepare("SELECT team_role FROM app_user WHERE id=? AND tenant_id=?");
                $st->execute([(int)$principalId, $tenant]);
                $r = $st->fetchColumn();
                if ($r !== false) return (string)($r ?: 'member');
            } catch (\Throwable $e) {}
        }
        return 'member';
    }

    /** POST /v425/pm/collaboration/access/check (analyst+) — 특정 principal 의 스코프 접근 결정(권한확인/시뮬레이션). */
    public static function checkAccess(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $principalId = (string)($b['principal_id'] ?? $b['user_id'] ?? '');
        if ($principalId === '') return self::json($resp, ['ok' => false, 'error' => 'principal_id 필요'], 422);
        $scopeType = strtoupper((string)($b['scope_type'] ?? 'PROJECT'));
        $scopeId = (string)($b['scope_id'] ?? '');
        $action = (string)($b['action'] ?? 'read');
        $teamRole = self::principalTeamRole($g['pdo'], $g['tenant'], $principalId);
        $dec = self::evaluateAccess($g['pdo'], $g['isDemo'], $g['tenant'], $principalId, $teamRole, $scopeType, $scopeId, $action);
        return self::json($resp, ['ok' => true, 'principal_id' => $principalId, 'data' => $dec]);
    }

    /** GET /v425/pm/collaboration/access/grants (analyst+) — 외부 접근 그랜트 목록. */
    public static function listAccessGrants(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        self::ensureGrantsTable($g['pdo'], $g['isDemo']);
        $rows = [];
        try {
            $st = $g['pdo']->prepare("SELECT public_id,principal_type,principal_id,scope_type,scope_id,permissions_json,valid_until,granted_by,grant_reason,revoked_at,created_at FROM collaboration_access_grants WHERE tenant_id=? ORDER BY id DESC LIMIT 200");
            $st->execute([$g['tenant']]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true, 'tenant' => $g['tenant'], 'grants' => $rows, 'count' => count($rows)]);
    }

    /** POST /v425/pm/collaboration/access/grants/{id}/revoke (admin). */
    public static function revokeAccessGrant(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        self::ensureGrantsTable($g['pdo'], $g['isDemo']);
        $pid = (string)($args['id'] ?? '');
        $st = $g['pdo']->prepare("UPDATE collaboration_access_grants SET revoked_at=?, updated_at=? WHERE tenant_id=? AND public_id=? AND revoked_at IS NULL");
        $st->execute([gmdate('c'), gmdate('c'), $g['tenant'], $pid]);
        if ($st->rowCount() === 0) return self::json($resp, ['ok' => false, 'error' => '철회할 그랜트가 없습니다.'], 404);
        try { self::auditLog($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => (string)($g['user_id'] ?? $g['tenant']), 'entity_type' => 'collaboration_access_grant', 'entity_id' => $pid, 'action' => 'access_grant_revoked', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]); } catch (\Throwable $e) {}
        return self::json($resp, ['ok' => true]);
    }

    /* ── [CWIS Part004-01] 내비게이션 진단 리포트 ──────────────────────────────────
     *
     * ★교차검증: 본 저장소의 내비게이션 정본은 **프론트엔드 정적 소스**(sidebarManifest.js·App.jsx·
     *   CommandPalette·MobileBottomNav·planMenuPolicy)이고 백엔드는 menu_tree 가시성 오버레이만 갖는다.
     *   따라서 분석 자체는 PHP 런타임이 아니라 빌드타임 스캐너(tools/navigation_analyze.mjs)가 수행하고,
     *   본 엔드포인트는 그 **스냅샷을 관리자에게 노출**하는 읽기 전용 창구다.
     *   (PHP 가 프론트 JSX 를 재파싱하는 두 번째 분석 엔진을 만드는 것은 중복 — 헌법 Reuse→Extend 위배.)
     *
     * 권한(명세 §27·§39~41): admin 게이트 + 테넌트 격리(gate). 일반 사용자/게스트/파트너는 Shared::gate 에서
     *   차단된다. 스냅샷에는 테넌트 데이터가 전혀 없다(정적 소스 경로/라벨/권한키만).
     *
     * ★정직 미산출: 스냅샷이 없으면 0 이나 빈 배열로 '정상'인 척하지 않고 available=false + 생성방법을 반환한다.
     */
    private const NAV_SNAPSHOT = __DIR__ . '/../../../data/cwis_navigation_analysis.json';

    /** GET /v425/pm/collaboration/navigation/analysis (admin) */
    public static function navigationAnalysis(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];

        $path = realpath(self::NAV_SNAPSHOT);
        $baseDir = realpath(__DIR__ . '/../../../data');
        // 출력/입력 경로 화이트리스트 — data 디렉터리 밖 파일은 절대 읽지 않는다(§44·§45).
        if ($path === false || $baseDir === false || strpos($path, $baseDir . DIRECTORY_SEPARATOR) !== 0) {
            return self::json($resp, [
                'ok' => true,
                'available' => false,
                'reason' => 'snapshot_not_generated',
                'message' => '내비게이션 진단 스냅샷이 아직 생성되지 않았습니다.',
                'how_to_generate' => 'node tools/navigation_analyze.mjs --snapshot',
            ]);
        }

        $raw = @file_get_contents($path);
        $data = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($data)) {
            return self::json($resp, ['ok' => false, 'available' => false, 'reason' => 'snapshot_unreadable'], 500);
        }

        try {
            self::auditLog($g['pdo'], [
                'tenant_id' => $g['tenant'], 'actor_user_id' => (string)($g['user_id'] ?? $g['tenant']),
                'entity_type' => 'collaboration_navigation', 'entity_id' => 'analysis',
                'action' => 'navigation_analysis_viewed', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
            ]);
        } catch (\Throwable $e) { /* 감사 실패가 조회를 막지 않는다 */ }

        return self::json($resp, [
            'ok' => true,
            'available' => true,
            'generated_at' => $data['generated_at'] ?? null,
            'source_revision' => $data['source_revision'] ?? null,
            'metrics' => $data['metrics'] ?? null,
            'context' => $data['context'] ?? null,
            'preference_stores' => $data['preference_stores'] ?? null,
            'issues' => $data['issues'] ?? [],
        ]);
    }

    /* ── [CWIS Part A] 협업 워크스페이스 홈(개인 작업함) — 모든 구독플랜 회원 사용 ───────────── */

    /** 플랜 티어(협업 고급기능 게이팅용). 코어(개인 워크스페이스)는 전 플랜 tier 0. */
    private const PLAN_RANK = ['demo'=>0,'free'=>0,'starter'=>1,'basic'=>1,'growth'=>2,'pro'=>3,'business'=>3,'platform_growth'=>4,'enterprise'=>4,'admin'=>5];

    /** capability_key → 최소 플랜 티어(그 미만 플랜은 잠금 표시·업셀). 미지정=0(전 플랜 사용). */
    private const CAPABILITY_MIN_TIER = [
        'collaboration.member'=>1, 'collaboration.team'=>1, 'collaboration.invitation'=>1,
        'collaboration.mention'=>2, 'collaboration.approval'=>2, 'collaboration.external'=>2, 'collaboration.access'=>2,
    ];

    private static function planTier(string $plan): int
    {
        return self::PLAN_RANK[strtolower(trim($plan))] ?? 0;
    }

    /**
     * GET /v425/pm/collaboration/hub — 협업 워크스페이스 홈(개인 작업함).
     *   내 열린 작업·최근 활동·멘션·프로젝트를 집계(PM 테이블 재사용·신규 도메인 0). 테넌트 격리.
     *   ★모든 구독플랜 세션 회원 사용 가능(gate viewer+·requirePro 아님) — 고급 기능만 플랜 티어로 잠금 표시(자기에 맞게).
     */
    public static function personalHub(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];

        $hub = [
            'tasks'     => ['by_status' => [], 'open_total' => 0, 'overdue' => 0, 'due_soon' => 0, 'items' => []],
            'activity'  => [],
            'mentions'  => [],
            'projects'  => ['active' => 0, 'total' => 0],
            'approvals' => ['pending' => 0, 'items' => []],
        ];

        // 작업 현황(테넌트 스코프·비보관)
        try {
            $st = $pdo->prepare("SELECT status, COUNT(*) c FROM pm_tasks WHERE tenant_id=? AND archived_at IS NULL GROUP BY status");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) { $hub['tasks']['by_status'][(string)$r['status']] = (int)$r['c']; }
            foreach (['todo','in_progress','review','blocked'] as $s) { $hub['tasks']['open_total'] += $hub['tasks']['by_status'][$s] ?? 0; }
            $today = gmdate('Y-m-d'); $soon = gmdate('Y-m-d', time() + 7 * 86400);
            $q = $pdo->prepare("SELECT COUNT(*) FROM pm_tasks WHERE tenant_id=? AND archived_at IS NULL AND status NOT IN ('done','cancelled') AND due_date IS NOT NULL AND due_date < ?");
            $q->execute([$tenant, $today]); $hub['tasks']['overdue'] = (int)$q->fetchColumn();
            $q2 = $pdo->prepare("SELECT COUNT(*) FROM pm_tasks WHERE tenant_id=? AND archived_at IS NULL AND status NOT IN ('done','cancelled') AND due_date IS NOT NULL AND due_date BETWEEN ? AND ?");
            $q2->execute([$tenant, $today, $soon]); $hub['tasks']['due_soon'] = (int)$q2->fetchColumn();
            $q3 = $pdo->prepare("SELECT t.id, t.title, t.status, t.priority, t.due_date, t.progress_pct, t.project_id, p.name project_name
                                 FROM pm_tasks t LEFT JOIN pm_projects p ON p.id=t.project_id AND p.tenant_id=t.tenant_id
                                 WHERE t.tenant_id=? AND t.archived_at IS NULL AND t.status NOT IN ('done','cancelled')
                                 ORDER BY (t.due_date IS NULL) ASC, t.due_date ASC, t.updated_at DESC LIMIT 12");
            $q3->execute([$tenant]); $hub['tasks']['items'] = $q3->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { /* 테이블 부재/쿼리 실패 → 빈 집계(정직·0 위장 안 함) */ }

        // 최근 활동(pm_audit_log 재사용)
        try {
            $st = $pdo->prepare("SELECT entity_type, entity_id, action, actor_user_id, created_at FROM pm_audit_log WHERE tenant_id=? ORDER BY id DESC LIMIT 15");
            $st->execute([$tenant]); $hub['activity'] = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}

        // 최근 멘션(워크스페이스 내 @언급 댓글 — collaboration.mention 기반)
        try {
            $st = $pdo->prepare("SELECT c.id, c.task_id, c.author_id, c.body, c.mentions_csv, c.created_at, t.title task_title
                                 FROM pm_task_comments c LEFT JOIN pm_tasks t ON t.id=c.task_id AND t.tenant_id=c.tenant_id
                                 WHERE c.tenant_id=? AND c.mentions_csv IS NOT NULL AND c.mentions_csv <> ''
                                 ORDER BY c.created_at DESC LIMIT 10");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $body = (string)($r['body'] ?? '');
                $hub['mentions'][] = [
                    'id' => $r['id'], 'task_id' => $r['task_id'], 'task_title' => $r['task_title'],
                    'author_id' => $r['author_id'], 'excerpt' => mb_substr($body, 0, 140),
                    'mentions' => array_values(array_filter(explode(',', (string)$r['mentions_csv']))),
                    'created_at' => $r['created_at'],
                ];
            }
        } catch (\Throwable $e) {}

        // 프로젝트 집계
        try {
            $st = $pdo->prepare("SELECT status, COUNT(*) c FROM pm_projects WHERE tenant_id=? GROUP BY status");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $hub['projects']['total'] += (int)$r['c'];
                if ((string)$r['status'] === 'active') $hub['projects']['active'] += (int)$r['c'];
            }
        } catch (\Throwable $e) {}

        // 승인 대기(action_request pending) — 통합 승인함(collaboration.approval). action_request=승인 SSOT(289차).
        //   테넌트 격리·같은 물리 DB(Db::pdoFor). 테이블 부재 시 빈 목록(정직).
        try {
            $st = $pdo->prepare("SELECT id, policy_id, status, action_json, created_at FROM action_request WHERE tenant_id=? AND status='pending' ORDER BY id DESC LIMIT 10");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $act = json_decode((string)($r['action_json'] ?? ''), true);
                $hub['approvals']['items'][] = [
                    'id'         => (int)$r['id'],
                    'type'       => is_array($act) ? (string)($act['type'] ?? $act['action'] ?? 'action') : 'action',
                    'summary'    => is_array($act) ? mb_substr(json_encode($act, JSON_UNESCAPED_UNICODE), 0, 120) : '',
                    'created_at' => $r['created_at'],
                ];
            }
            $hub['approvals']['pending'] = count($hub['approvals']['items']);
        } catch (\Throwable $e) { /* action_request 부재 → 승인 없음(정직) */ }

        // 플랜 컨텍스트 — 각 플랜이 자기에 맞게: 활성 capability + 잠금(상위플랜 필요) 목록.
        $plan = \Genie\PlanLimits::tenantPlan($pdo, $tenant);
        $tier = self::planTier($plan);
        $overlay = self::tenantOverlay($pdo, $tenant);
        $available = []; $locked = [];
        foreach (self::CATALOG as $c) {
            $key = $c[0]; $status = $c[2];
            if (!in_array($status, ['ENABLED', 'PARTIAL'], true)) continue; // 미착수(PLANNED 등)는 제외
            $minTier = self::CAPABILITY_MIN_TIER[$key] ?? 0;
            if ($tier >= $minTier && self::effectiveEnabled(['key' => $key, 'status' => $status], $overlay)) {
                $available[] = $key;
            } elseif ($tier < $minTier) {
                $locked[] = ['key' => $key, 'name' => $c[1], 'min_tier' => $minTier];
            }
        }

        return self::json($resp, [
            'ok'   => true,
            'hub'  => $hub,
            'plan' => ['name' => $plan, 'tier' => $tier, 'available_capabilities' => $available, 'locked_capabilities' => $locked],
        ]);
    }

    /**
     * GET /v425/pm/collaboration/teams — 팀/부서 간 협업 워크스페이스.
     *   업종 무관(유통·제조·대행사 등 각 기업이 정의한 team 테이블 그대로) 팀 목록·멤버·부서 분포 +
     *   팀 간 협업 프로젝트(태스크 담당자가 2개 이상 팀에 걸친 프로젝트)를 집계. 테넌트 격리·전 구독플랜(viewer+).
     *   ★기존 인프라 재사용(team/app_user/acl_permission/pm_*) — 신규 도메인 0.
     */
    public static function teamWorkspace(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $pdo = $g['pdo']; $tenant = $g['tenant'];

        // 호출자 팀 해석(내 팀 하이라이트)
        $callerTeamId = null;
        try {
            $au = \Genie\Handlers\UserAuth::authedUser($req);
            $cid = is_array($au) ? (int)($au['id'] ?? 0) : 0;
            if ($cid > 0) {
                $s = $pdo->prepare("SELECT team_id FROM app_user WHERE id=? AND tenant_id=? LIMIT 1");
                $s->execute([$cid, $tenant]);
                $callerTeamId = ((int)($s->fetchColumn() ?: 0)) ?: null;
            }
        } catch (\Throwable $e) { /* 익명/해석실패 → 내 팀 없음 */ }

        // 팀 목록 + 멤버수 + 매니저 + 대표 멤버
        $teams = [];
        try {
            $st = $pdo->prepare("SELECT id, name, description, team_type, manager_user_id, status FROM team WHERE tenant_id=? AND status<>'deleted' ORDER BY (status='active') DESC, id ASC");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $t) {
                $tid = (int)$t['id'];
                $mc = 0; $mgr = ''; $members = [];
                try { $q = $pdo->prepare("SELECT COUNT(*) FROM app_user WHERE tenant_id=? AND team_id=? AND is_active=1"); $q->execute([$tenant, $tid]); $mc = (int)$q->fetchColumn(); } catch (\Throwable $e) {}
                if (!empty($t['manager_user_id'])) {
                    try { $q = $pdo->prepare("SELECT name, email FROM app_user WHERE id=? AND tenant_id=?"); $q->execute([(int)$t['manager_user_id'], $tenant]); $m = $q->fetch(\PDO::FETCH_ASSOC); if ($m) $mgr = (string)($m['name'] ?: $m['email']); } catch (\Throwable $e) {}
                }
                try { $q = $pdo->prepare("SELECT name, email, team_role FROM app_user WHERE tenant_id=? AND team_id=? AND is_active=1 ORDER BY id ASC LIMIT 8"); $q->execute([$tenant, $tid]); $members = $q->fetchAll(\PDO::FETCH_ASSOC) ?: []; } catch (\Throwable $e) {}
                $teams[] = [
                    'id' => $tid, 'name' => (string)$t['name'], 'description' => (string)($t['description'] ?? ''),
                    'team_type' => (string)($t['team_type'] ?? 'custom'), 'status' => (string)($t['status'] ?? 'active'),
                    'member_count' => $mc, 'manager_name' => $mgr, 'members' => $members, 'is_mine' => ($tid === $callerTeamId),
                ];
            }
        } catch (\Throwable $e) { /* team 테이블 부재 → 빈 목록(정직) */ }

        // 팀 간 협업 프로젝트 — 태스크 담당자가 2개 이상 팀에 걸친 프로젝트(크로스팀 협업 실측). best-effort.
        //   ★user_id 조인: app_user.id(INT) vs pm_task_assignees.user_id(VARCHAR)는 컬레이션이 달라 문자열
        //   비교가 실패한다 → `a.user_id + 0`(수치 문맥 강제)로 컬레이션 무관 숫자 비교(MySQL·SQLite 공통).
        $crossTeam = [];
        try {
            $sql = "SELECT p.id pid, p.name pname, COUNT(DISTINCT u.team_id) team_cnt, COUNT(DISTINCT a.user_id) member_cnt
                    FROM pm_projects p
                    JOIN pm_tasks t ON t.project_id = p.id AND t.tenant_id = p.tenant_id
                    JOIN pm_task_assignees a ON a.task_id = t.id AND a.tenant_id = t.tenant_id
                    JOIN app_user u ON u.id = a.user_id + 0 AND u.tenant_id = p.tenant_id AND u.team_id IS NOT NULL
                    WHERE p.tenant_id = ?
                    GROUP BY p.id, p.name HAVING team_cnt >= 2 ORDER BY team_cnt DESC, member_cnt DESC LIMIT 8";
            $st = $pdo->prepare($sql); $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $crossTeam[] = ['project_id' => (string)$r['pid'], 'name' => (string)$r['pname'], 'team_count' => (int)$r['team_cnt'], 'member_count' => (int)$r['member_cnt']];
            }
        } catch (\Throwable $e) { /* 조인/스키마 차이 → 크로스팀 미산출(빈 목록·정직) */ }

        return self::json($resp, [
            'ok' => true,
            'teams' => $teams,
            'cross_team_projects' => $crossTeam,
            'my_team_id' => $callerTeamId,
            'can_manage' => in_array((string)$g['role'], ['admin'], true),
        ]);
    }
}
