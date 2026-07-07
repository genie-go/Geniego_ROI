<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Auth Handler — 회원가입 / 로그인 / 구독 관리 / 플랜 잠금
 *
 * plan=demo  : 전체 열람 가능, 쓰기 작업 제한
 * plan=pro   : 전체 이용 가능 (subscription_expires_at 기간 내)
 * plan=admin : 최고 관리자 (무제한)
 */
final class UserAuth
{
    private static function json(ResponseInterface $res, array $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    private static function generateToken(): string
    {
        return bin2hex(random_bytes(32)); // 64-char hex
    }

    /**
     * 203차 ⓒ — 테넌트 owner 의 유효 플랜(만료 다운그레이드 반영). 해석 불가 시 null(fail-open).
     * api_key 는 plan 을 갖지 않으므로 app_user(owner) 의 구독 등급으로 테넌트 plan 을 도출한다.
     */
    public static function resolveTenantPlan(\PDO $pdo, string $tenant): ?string
    {
        $tenant = trim($tenant);
        if ($tenant === '' || strtolower($tenant) === 'unknown') return null;
        try {
            $st = $pdo->prepare("SELECT plan, subscription_expires_at FROM app_user WHERE tenant_id = ? AND (parent_user_id IS NULL OR team_role = 'owner') ORDER BY id LIMIT 1");
            $st->execute([$tenant]);
            $row = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$row) {
                $st2 = $pdo->prepare("SELECT plan, subscription_expires_at FROM app_user WHERE tenant_id = ? ORDER BY id LIMIT 1");
                $st2->execute([$tenant]);
                $row = $st2->fetch(\PDO::FETCH_ASSOC);
            }
            if (!$row) return null;
            $resolved = self::resolveActivePlan($row); // 만료 → free 다운그레이드 반영
            return (string)($resolved['plan'] ?? $row['plan'] ?? 'free');
        } catch (\Throwable $e) {
            return null; // 스키마/쿼리 문제 → fail-open(레거시 무중단)
        }
    }

    /**
     * 203차 ⓒ — 상용 기능 plan 게이트(심층방어). 테넌트 plan < 요구 시 403, 충족/해석불가 시 null.
     *  - 데이터 보안은 테넌트 격리+RBAC 가 담당. 본 가드는 "미구매 기능 직접호출 차단"(상용).
     *  - fail-open: plan 해석 불가(app_user 부재 등) 또는 가드 자체 실패 시 통과(레거시 api_key 무중단).
     *  - admin api_key role / admin·demo plan 은 통과.
     * @param string $featureKey \Genie\PlanPolicy::FEATURE_MIN_PLAN 키
     */
    public static function requireFeaturePlan(ServerRequestInterface $req, ResponseInterface $res, string $featureKey, ?\PDO $pdo = null): ?ResponseInterface
    {
        try {
            $pdo = $pdo ?? Db::pdo();
            if (((string)($req->getAttribute('auth_role') ?? '')) === 'admin') return null;
            $tenant = self::authedTenant($req);
            if ($tenant === null || $tenant === '') $tenant = (string)($req->getAttribute('auth_tenant') ?? '');
            $plan = self::resolveTenantPlan($pdo, (string)$tenant);
            if ($plan === null || $plan === 'admin' || $plan === 'demo') return null; // fail-open / 관리·데모
            if (\Genie\PlanPolicy::allows($plan, $featureKey)) return null;
            $min = \Genie\PlanPolicy::minPlanFor($featureKey);
            return self::json($res, [
                'ok' => false,
                'error' => "이 기능은 {$min} 플랜 이상에서 이용 가능합니다.",
                'code' => 'PLAN_REQUIRED',
                'currentPlan' => $plan,
                'requiredPlan' => $min,
            ], 403);
        } catch (\Throwable $e) {
            return null; // 가드 자체 실패 → fail-open
        }
    }

    private static function extractToken(ServerRequestInterface $req): ?string
    {
        $h = $req->getHeaderLine('Authorization');
        if (preg_match('/^Bearer\s+(.+)$/i', $h, $m)) return $m[1];
        $params = $req->getQueryParams();
        return $params['token'] ?? null;
    }

    /**
     * 구독 만료 여부 확인 → 만료 시 plan을 free로 자동 다운그레이드
     * 지원 플랜: free, demo, starter, growth, pro, enterprise, admin
     */
    private static function resolveActivePlan(array $user): array
    {
        $plan = $user['plan'] ?? 'free';

        // admin은 만료 없음
        if ($plan === 'admin') {
            return array_merge($user, [
                'subscription_status' => 'admin',
                'subscription_expires_at' => null,
            ]);
        }

        // free / demo 플랜 (무료 가입 or 데모) → 바로 반환
        if (in_array($plan, ['free', 'demo'], true)) {
            return array_merge($user, [
                'plan' => $plan,
                'subscription_status' => 'none',
                'subscription_expires_at' => null,
            ]);
        }

        // 유료 플랜(starter, growth, pro, enterprise) 만료 체크
        if (!empty($user['subscription_expires_at'])) {
            $expiresTs = strtotime($user['subscription_expires_at']);
            if ($expiresTs !== false && $expiresTs < time()) {
                // 만료됨 → DB에 free로 다운그레이드
                try {
                    $pdo = Db::pdo();
                    $id = $user['id'] ?? $user['idx'] ?? 0;
                    // [261차] plans 컬럼도 함께 'free' 로 강등해야 한다. plan 만 내리면 재로그인 시
                    //   effectivePlan=COALESCE(plans,plan) 가 여전히 유료로 해석돼 만료 후 유료가 영구부활한다.
                    // [265차 스키마드리프트] app_user 엔 idx 컬럼 없음 → `OR idx=?` 가 문장 전체를 1054 예외로 만들어
                    //   만료 유료→free 강등이 무음 무효화(261차 취지 훼손)되던 것 수정. id 단독 조건.
                    $pdo->prepare("UPDATE app_user SET plan = 'free', plans = 'free', subscription_expires_at = NULL WHERE id = ?")
                        ->execute([$id]);
                } catch (\Throwable $e) { /* 조용히 처리 */ }

                return array_merge($user, [
                    'plan' => 'free',
                    'subscription_status' => 'expired',
                    'subscription_expires_at' => $user['subscription_expires_at'],
                ]);
            }
            // 유효한 유료 플랜
            return array_merge($user, ['subscription_status' => 'active']);
        }

        // 만료일 없는 유료 플랜 (수동 부여 등)
        return array_merge($user, [
            'subscription_status' => 'active',
            'subscription_expires_at' => null,
        ]);
    }

    /**
     * 180차 멀티테넌트 신원 체계 — app_user 에 tenant/팀 컬럼 idempotent 보강.
     *   tenant_id      : 계정(테넌트) 식별자. 격리 경계. owner = 'acct_<id>'.
     *   parent_user_id : 하위(팀원) 계정의 상위 owner id. owner=NULL.
     *   team_role      : 'owner' | 'manager' | 'member' (테넌트 내 RBAC).
     *   team_name      : 팀 그룹명(선택).
     * MySQL/SQLite 공통: 컬럼 존재 시 ALTER 예외 → 무시.
     */
    private static function ensureTenantColumns(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $alters = [
            "ALTER TABLE app_user ADD COLUMN tenant_id VARCHAR(100) NULL",
            "ALTER TABLE app_user ADD COLUMN parent_user_id INTEGER NULL",
            "ALTER TABLE app_user ADD COLUMN team_role VARCHAR(40) NULL",
            "ALTER TABLE app_user ADD COLUMN team_name VARCHAR(100) NULL",
            // [현 차수] 하위 관리자(sub-admin) 체계: admin_level('master'|'sub'), admin_menus(JSON 허용 메뉴 경로 배열)
            "ALTER TABLE app_user ADD COLUMN admin_level VARCHAR(20) NULL",
            "ALTER TABLE app_user ADD COLUMN admin_menus TEXT NULL",
            // [231차 #3] 멤버/하위관리자 프로필 사진(Base64 data-URL)
            "ALTER TABLE app_user ADD COLUMN photo MEDIUMTEXT NULL",
            // [231차 OS#4] AI Agent 권한모드: 'recommend'|'approval'(기본)|'auto'. 민감 실행 기본=승인필수.
            "ALTER TABLE app_user ADD COLUMN agent_mode VARCHAR(20) NULL",
            // [231차 팀권한] 멤버가 소속된 팀 엔터티(team.id) 참조. NULL=미배정(레거시 무후퇴). TeamPermissions 핸들러가 소비.
            "ALTER TABLE app_user ADD COLUMN team_id INTEGER NULL",
        ];
        foreach ($alters as $sql) {
            try { $pdo->exec($sql); } catch (\Throwable $e) { /* 이미 존재 or 미지원 — 무시 */ }
        }
        $done = true;
    }

    /** 262차 — user_session.last_seen_at 보강(서버측 유휴 자동로그아웃). 멱등 ALTER. */
    private static function ensureSessionIdleColumn(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        try { $pdo->exec("ALTER TABLE user_session ADD COLUMN last_seen_at VARCHAR(32) NULL"); } catch (\Throwable $e) { /* 이미 존재 or 미지원 */ }
        $done = true;
    }

    /**
     * 180차 — 사용자 행에서 tenant_id 해석(+필요 시 lazy 영속).
     *   하위계정(parent_user_id 보유)은 상위 owner 의 tenant_id 를 그대로 따름(데이터 공유).
     *   tenant_id 미설정 owner 는 'acct_<id>' 로 영속(기존 회원 마이그레이션).
     */
    private static function resolveTenantId(\PDO $pdo, array $user): string
    {
        $id  = (int)($user['id'] ?? $user['idx'] ?? 0);
        $tid = trim((string)($user['tenant_id'] ?? ''));
        if ($tid !== '') return $tid;

        // 하위계정 → 상위 owner tenant 상속
        $pid = (int)($user['parent_user_id'] ?? 0);
        if ($pid > 0) {
            try {
                $st = $pdo->prepare('SELECT tenant_id FROM app_user WHERE id = ? LIMIT 1');
                $st->execute([$pid]);
                $ptid = trim((string)($st->fetchColumn() ?: ''));
                if ($ptid === '') $ptid = 'acct_' . $pid;
                try { $pdo->prepare('UPDATE app_user SET tenant_id = ? WHERE id = ?')->execute([$ptid, $id]); } catch (\Throwable $e) {}
                return $ptid;
            } catch (\Throwable $e) { /* fallthrough */ }
        }

        // owner → 자기 계정 기준 tenant 발급 + 영속
        $tid = 'acct_' . $id;
        if ($id > 0) {
            try { $pdo->prepare('UPDATE app_user SET tenant_id = ? WHERE id = ?')->execute([$tid, $id]); } catch (\Throwable $e) {}
        }
        return $tid;
    }


    /** 토큰으로 사용자 조회 (구독 정보 포함) */
    private static function userByToken(string $token): ?array
    {
        $pdo = Db::pdo();
        self::ensureTenantColumns($pdo); // 180차: tenant/팀 컬럼 보강
        self::ensureSessionIdleColumn($pdo); // 262차: 서버측 유휴 자동로그아웃 last_seen_at 보강
        // subscription_expires_at, plans 컬럼 포함 조회 (없으면 null)
        try {
            $stmt = $pdo->prepare(
                'SELECT u.id, u.email, u.name,
                        (CASE WHEN u.plan = \'admin\' OR u.plans = \'admin\' THEN \'admin\' ELSE COALESCE(u.plans, u.plan, \'demo\') END) AS plan,
                        u.company, u.created_at,
                        u.subscription_expires_at,
                        u.subscription_cycle,
                        u.phone, u.extra_data,
                        u.tenant_id, u.parent_user_id, u.team_role,
                        u.admin_level, u.admin_menus,
                        s.last_seen_at AS _sess_last_seen
                   FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, self::now()]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // subscription_expires_at 컬럼이 없는 경우 또는 plans 컬럼이 없는 경우 폴백
            $stmt = $pdo->prepare(
                'SELECT u.id, u.email, u.name,
                        (CASE WHEN u.plan = \'admin\' THEN \'admin\' ELSE COALESCE(u.plan, \'demo\') END) AS plan,
                        u.company, u.created_at
                   FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, self::now()]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        }

        if (!$row) return null;

        // 262차 서버측 유휴 자동로그아웃(은행급 defense-in-depth): 클라 게이트가 우회/변조돼도
        //   서버가 유휴 초과 세션을 무효화한다. 유휴 임계는 사용자 설정(extra_data.auto_logout_min)이
        //   진실원천. 마지막 접속(last_seen_at) 이후 임계 경과 → 세션 삭제·null 반환(재로그인 강제).
        //   활동 시각은 인증 요청마다 throttle(60s) 로 갱신(쓰기 폭주 방지).
        if (array_key_exists('_sess_last_seen', $row)) {
            $lastSeen = $row['_sess_last_seen'] ?? null;
            unset($row['_sess_last_seen']);
            $almMin = 0;
            if (!empty($row['extra_data']) && is_string($row['extra_data'])) {
                $ed = json_decode($row['extra_data'], true);
                if (is_array($ed)) $almMin = (int)($ed['auto_logout_min'] ?? 0);
            }
            $nowTs = time();
            $lastTs = $lastSeen ? (int)strtotime((string)$lastSeen) : 0;
            if ($almMin > 0 && $lastTs > 0 && ($nowTs - $lastTs) >= $almMin * 60) {
                // 유휴 초과 → 세션 폐기(재로그인 강제).
                try { $pdo->prepare('DELETE FROM user_session WHERE token = ?')->execute([$token]); } catch (\Throwable $e) {}
                return null;
            }
            // 활동 갱신(throttle: 최초 또는 60s 초과 시에만 write).
            if ($lastTs === 0 || ($nowTs - $lastTs) >= 60) {
                try { $pdo->prepare('UPDATE user_session SET last_seen_at = ? WHERE token = ?')->execute([self::now(), $token]); } catch (\Throwable $e) {}
            }
        }

        // 180차: tenant_id 해석/lazy 영속 → 응답에 항상 포함(프론트 격리 스코프 활성화)
        $row['tenant_id'] = self::resolveTenantId($pdo, $row);
        $row['parent_user_id'] = isset($row['parent_user_id']) ? (int)$row['parent_user_id'] : null;
        $row['team_role'] = $row['team_role'] ?? ($row['parent_user_id'] ? 'member' : 'owner');
        // 213차 결제 게이팅 #2: 전체정보(사업자) 프로필을 프론트가 완비 여부 판정에 쓸 수 있도록 노출.
        $profile = [];
        if (!empty($row['extra_data']) && is_string($row['extra_data'])) {
            $dec = json_decode($row['extra_data'], true);
            if (is_array($dec)) $profile = $dec;
        }
        $row['phone']   = $row['phone'] ?? ($profile['phone'] ?? null);
        $row['profile'] = [
            'company'         => $row['company'] ?? '',
            'business_number' => (string)($profile['business_number'] ?? ''),
            'ceo_name'        => (string)($profile['ceo_name'] ?? ''),
            'phone'           => (string)($row['phone'] ?? ''),
            'address'         => (string)($profile['address'] ?? ''),
            'business_type'   => (string)($profile['business_type'] ?? ''),
            'country'         => (string)($profile['country'] ?? ''),
            'website'         => (string)($profile['website'] ?? ''),
        ];
        // 262차: 유휴 자동로그아웃 임계를 응답에 노출(클라가 다른 기기 로그인 시 서버값 채택 가능).
        $row['auto_logout_min'] = (int)($profile['auto_logout_min'] ?? 0);
        unset($row['extra_data']); // 원본 JSON 은 응답에서 제거(profile 로 정규화 노출)
        return self::resolveActivePlan($row);
    }

    /**
     * 플랜 권한 확인 미들웨어 (백엔드 API 보호용)
     * 반환: null이면 통과, ResponseInterface면 에러
     *
     * 지원 플랜 계층:
     *   demo < pro < enterprise < admin
     */
    public static function requirePro(ServerRequestInterface $req, ResponseInterface $res): ?ResponseInterface
    {
        return self::requirePlan($req, $res, 'pro');
    }

    /**
     * 범용 플랜 미들웨어 — 지정 플랜 이상 사용자만 통과
     * @param string $minPlan  'pro' | 'enterprise' | 'admin'
     */
    public static function requirePlan(ServerRequestInterface $req, ResponseInterface $res, string $minPlan = 'pro'): ?ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.', 'code' => 'AUTH_REQUIRED'], 401);
        }

        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.', 'code' => 'SESSION_EXPIRED'], 401);
        }

        // 플랜 계층: free/demo=0, starter/growth/pro=1, enterprise=2, admin=3
        // [225차 P1-3] starter/growth/free 누락 → rank 0 폴백으로 유료 Starter/Growth 가입자가
        //   requirePro 전체(WMS·LiveCommerce 등) 403 받던 게이트 붕괴. Paddle resolveAppPlan 은
        //   'starter'/'growth' 를 정식 유료로 반환하므로 pro 동급(rank 1)으로 인정.
        $rank = ['free' => 0, 'demo' => 0, 'starter' => 1, 'growth' => 1, 'pro' => 1, 'enterprise' => 2, 'admin' => 3];
        $userRank = $rank[strtolower(trim((string)($user['plan'] ?? '')))] ?? 0;
        $minRank  = $rank[strtolower(trim($minPlan))] ?? 1;

        if ($userRank < $minRank) {
            return self::json($res, [
                'ok'          => false,
                'error'       => "이 기능은 {$minPlan} 플랜 이상에서 이용 가능합니다.",
                'code'        => 'PLAN_REQUIRED',
                'currentPlan' => $user['plan'],
                'requiredPlan'=> $minPlan,
            ], 403);
        }
        return null; // 통과
    }

    /**
     * 190차: 세션 토큰에서 인증 사용자(tenant_id 포함)를 반환. 미인증 시 null.
     *   CRM 등 세션 기반 핸들러가 테넌트 격리 스코프를 서버측에서 도출하는 정본 경로.
     *   ★X-Tenant-Id 헤더(클라이언트 위조 가능, 188차 차단)가 아닌 인증 user 행의 tenant_id 사용.
     */
    public static function authedUser(ServerRequestInterface $req): ?array
    {
        $token = self::extractToken($req);
        if (!$token) return null;
        return self::userByToken($token);
    }

    /** 190차: 인증 사용자의 격리 테넌트 식별자. 미인증 시 null(호출측이 401 처리). */
    public static function authedTenant(ServerRequestInterface $req): ?string
    {
        $u = self::authedUser($req);
        if (!$u) return null;
        // [251차] ★admin 전용 'platform_growth' 컨텍스트 전환 — 플랫폼 자체 성장을 기존 모든 메뉴(크리에이티브
        //   스튜디오·자동화 전략·캠페인·어트리뷰션·채널KPI 등)로 조회·운영(신규 메뉴 0·기능 재사용).
        //   ★보안: 오직 admin 계정 + 오직 'platform_growth' 값만 허용(고객 테넌트 임의 임퍼소네이트 불가 =
        //   블래스트 반경 최소). 헤더 부재 = 정상 자기 테넌트(기본 OFF·기존 동작 무영향).
        $isAdmin = (strtolower((string)($u['plan'] ?? '')) === 'admin' || strtolower((string)($u['plans'] ?? '')) === 'admin');
        if ($isAdmin && trim($req->getHeaderLine('X-Act-As-Tenant')) === 'platform_growth') {
            return 'platform_growth';
        }
        $t = trim((string)($u['tenant_id'] ?? ''));
        return $t !== '' ? $t : ('acct_' . (int)($u['id'] ?? 0));
    }

    // ─────────────────────────────────────────────────────────────
    // GET /v423/member-logs — 구독계정 본인 보안 활동 로그(team-members "로그 기록" 탭)
    //
    //   ★보안: 테넌트는 반드시 서버 도출값(authedTenant)만 사용한다. 클라이언트가 보낸
    //   tenant/tenant_id 등 어떤 파라미터도 신뢰하지 않으므로 크로스테넌트 누출이 구조적으로 불가.
    //   SecurityAudit::recent 가 WHERE tenant_id=? 로 스코프 조회 → 자기 계정 로그만 반환.
    // ─────────────────────────────────────────────────────────────
    public static function memberLogs(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $tenant = self::authedTenant($req); // 서버 도출 전용(클라 파라미터 절대 미사용)
        if ($tenant === null) {
            return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        }
        $rows = \Genie\SecurityAudit::recent(Db::pdo(), $tenant, 300);
        $logs = [];
        foreach ($rows as $r) {
            $det = json_decode((string)($r['details_json'] ?? ''), true);
            $logs[] = [
                'id'         => (int)($r['id'] ?? 0),
                'actor'      => (string)($r['actor'] ?? ''),
                'action'     => (string)($r['action'] ?? ''),
                'details'    => is_array($det) ? $det : [],
                'ip_address' => (string)($r['ip_address'] ?? ''),
                'created_at' => (string)($r['created_at'] ?? ''),
            ];
        }
        return self::json($res, ['ok' => true, 'tenant' => $tenant, 'logs' => $logs]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/register
    // Body: { email, password, name, company? }
    // ─────────────────────────────────────────────────────────────
    public static function register(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo  = Db::pdo();
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }
        $now  = self::now();

        $email    = strtolower(trim((string)($body['email'] ?? ''))); // 180차: 이메일 정규화(대소문자 중복 방지)
        $password = (string)($body['password'] ?? '');
        $name     = trim((string)($body['name'] ?? ''));
        $company  = trim((string)($body['company'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::json($res, ['ok' => false, 'error' => '올바른 이메일 형식이 아닙니다.'], 422);
        }
        if (($pwErr = self::passwordPolicyError($password)) !== null) { // 189차 비번정책 강화
            return self::json($res, ['ok' => false, 'error' => $pwErr], 422);
        }
        if (strlen($name) < 1) {
            return self::json($res, ['ok' => false, 'error' => '이름을 입력해 주세요.'], 422);
        }

        self::ensureTenantColumns($pdo); // 180차: tenant/팀 컬럼 보강
        // 계정 중복 검사 — 대소문자 무관(SQLite 포함). 같은 이메일 다른 케이스 중복가입 차단.
        $check = $pdo->prepare('SELECT id FROM app_user WHERE LOWER(email) = ?');
        $check->execute([$email]);
        if ($check->fetchColumn()) {
            return self::json($res, ['ok' => false, 'error' => '이미 가입된 이메일입니다.'], 409);
        }

        $hashedPw = password_hash($password, PASSWORD_DEFAULT);
        $userId = null;

        // ── [현 차수] 신규 회원 20일 무료 체험 (요구: "플랜별 가입 시 20일 무료 이용 후 결제") ──────
        //   213차엔 신규가입을 무조건 free 로 강등해 유료 플랜 체험이 불가했다. 이제 가입 시 유료
        //   플랜(Starter/Growth/Pro/Enterprise)을 선택하면 해당 플랜을 20일간 무료로 제공(체험)하고,
        //   20일 뒤 결제하면 계속 이용한다. ※신규 가입자에 한함(기존 회원은 갱신=결제 경로라 미적용).
        //   free 선택/미선택은 종전대로 평생 무료(만료 없음).
        $TRIAL_DAYS = 20;
        $requestedPlan = strtolower(trim((string)($body['plan'] ?? '')));
        // [현 차수] 무료 체험 데모 회원가입 → 무조건 PRO 메뉴접근: 플랜 미선택/free 가입은 'pro' 로 승격해
        //   기존 20일 PRO 체험 경로를 그대로 태운다(만료 시 resolveActivePlan 이 free 로 자동 강등 = 검증된 로직 재사용).
        //   신규 회원은 20일간 전체(PRO) 메뉴를 체험하고, 종료 후 결제 없으면 free 로 내려간다(누수 없음).
        $autoProTrial  = ($requestedPlan === '' || $requestedPlan === 'free');
        if ($autoProTrial) { $requestedPlan = 'pro'; }
        $isPaidSignup  = in_array($requestedPlan, ['starter', 'growth', 'pro', 'enterprise'], true);

        // ── 추가 비즈니스 필드 파싱 ──────────────────────────────────
        $phone = trim((string)($body['phone'] ?? ''));
        $extraFields = [];
        foreach ([
            'ceo_name','business_type','business_number','country',
            'zip_code','address','website','sales_channels',
            'ad_channels','monthly_revenue','agree_marketing'
        ] as $fk) {
            $v = trim((string)($body[$fk] ?? ''));
            if ($v !== '') $extraFields[$fk] = $v;
        }

        if ($isPaidSignup) {
            $signupPlan = $requestedPlan;                                            // 선택 유료 플랜(또는 무료가입 자동 PRO)을 체험으로 부여
            $expiresAt  = gmdate('Y-m-d\TH:i:s\Z', time() + $TRIAL_DAYS * 24 * 3600); // 20일 후 체험 만료
            $extraFields['pending_plan'] = $autoProTrial ? 'free' : $requestedPlan;  // 자동 PRO 체험은 종료 후 free(결제 유도 아님), 유료선택은 해당 플랜 결제
            $extraFields['trial']        = '1';
            $extraFields['trial_days']   = (string)$TRIAL_DAYS;
            if ($autoProTrial) { $extraFields['trial_source'] = 'free_demo_pro'; }   // 무료 데모 가입 = 무조건 PRO 메뉴접근 체험 마커
        } else {
            $signupPlan = 'free';
            $expiresAt  = null; // free = 평생, 만료 없음
        }
        $extraDataJson = !empty($extraFields) ? json_encode($extraFields, JSON_UNESCAPED_UNICODE) : null;

        try {
            $pdo->prepare(
                'INSERT INTO app_user(email,password_hashs,name,plan,company,is_active,created_at,subscription_expires_at,phone,extra_data) VALUES(?,?,?,?,?,?,?,?,?,?)'
            )->execute([$email, $hashedPw, $name, $signupPlan, $company ?: null, 1, $now, $expiresAt, $phone ?: null, $extraDataJson]);
            $userId = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            try {
                $pdo->prepare(
                    'INSERT INTO app_user(email,password_hash,name,plan,company,is_active,created_at,subscription_expires_at,phone,extra_data) VALUES(?,?,?,?,?,?,?,?,?,?)'
                )->execute([$email, $hashedPw, $name, $signupPlan, $company ?: null, 1, $now, $expiresAt, $phone ?: null, $extraDataJson]);
                $userId = (int)$pdo->lastInsertId();
            } catch (\Throwable $e2) {
                // 만약 phone/extra_data 컬럼이 없으면 fallback
                try {
                    $pdo->prepare(
                        'INSERT INTO app_user(email,password_hash,name,plan,company,is_active,created_at) VALUES(?,?,?,?,?,?,?)'
                    )->execute([$email, $hashedPw, $name, $signupPlan, $company ?: null, 1, $now]);
                    $userId = (int)$pdo->lastInsertId();
                    try {
                        $pdo->prepare('UPDATE app_user SET subscription_expires_at=?, phone=?, extra_data=? WHERE id=?')
                            ->execute([$expiresAt, $phone ?: null, $extraDataJson, $userId]);
                    } catch (\Throwable $e3) {}
                } catch (\Throwable $e4) {
                    return self::json($res, ['ok' => false, 'error' => '회원가입 중 오류가 발생했습니다: ' . $e4->getMessage()], 500);
                }
            }
        }

        // userId가 0이면 email로 재조회
        if (!$userId) {
            try {
                $rr = $pdo->prepare('SELECT id FROM app_user WHERE LOWER(email) = ? LIMIT 1');
                $rr->execute([$email]);
                $userId = (int)($rr->fetchColumn() ?: 0);
            } catch (\Throwable $e) {}
        }

        // 180차: 신규 가입자는 owner → tenant_id='acct_<id>' + team_role='owner' 영속
        $tenantId = 'acct_' . $userId;
        if ($userId > 0) {
            try {
                $pdo->prepare("UPDATE app_user SET tenant_id = ?, team_role = 'owner', parent_user_id = NULL WHERE id = ?")
                    ->execute([$tenantId, $userId]);
            } catch (\Throwable $e) { /* 컬럼 미존재 등 — 무시(런타임 backfill 로 보장) */ }
        }
        // [현 차수] 20일 체험 회원 마커: plans 동기화(로그인 effectivePlan 정합) + 구독 시작/체험 표식.
        if ($isPaidSignup && $userId > 0) {
            try {
                $pdo->prepare("UPDATE app_user SET plans = ?, subscription_started_at = ?, subscription_cycle = 'trial' WHERE id = ?")
                    ->execute([$signupPlan, $now, $userId]);
            } catch (\Throwable $e) { /* subscription_* 컬럼 미존재 — 무시 */ }
        }
        
        $token  = self::generateToken();
        $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 24 * 3600);

        try {
            $pdo->prepare('INSERT INTO user_session(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
                ->execute([$userId, $token, $expires, $now]);
            self::recordSessionMeta($pdo, $req, $token); // 189차+ 세션 ip/ua 메타 기록
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => '세션 생성 중 오류가 발생했습니다.'], 500);
        }
        $couponResult = null;
        // [현 차수] 유료 체험 가입($isPaidSignup)은 20일 무료 체험 자체가 신규 혜택이므로, 가입 환영
        //   쿠폰(signup free, 기본 7일)을 적용하지 않는다. (적용 시 7일 쿠폰이 20일 체험 만료를 덮어써
        //   체험이 7일로 단축되는 회귀가 있었다.) free 가입만 종전대로 환영 쿠폰 부여.
        if ($userId > 0 && !$isPaidSignup) {
            try {
                $couponResult = \Genie\CouponEngine::fire($pdo, $userId, $email, 'signup', 'free');
            } catch (\Throwable $ce) {
                error_log('[register] CouponEngine: ' . $ce->getMessage());
            }
        }

        // ── 213차 결제 게이팅(정본) — [현 차수] 20일 체험 예외: 체험 가입($isPaidSignup)은 의도된
        //   무료 체험이므로 환원하지 않는다. 그 외 경로(쿠폰 등)로 결제 없이 유료로 올라간 비-체험
        //   계정만 free 로 환원한다(체험 종료 후 결제 미완은 별도 로그인 시점 게이트가 처리).
        if ($userId > 0 && !$isPaidSignup) {
            try {
                $pc = strtolower((string)($pdo->query("SELECT COALESCE(plans,plan,'free') FROM app_user WHERE id={$userId} LIMIT 1")->fetchColumn() ?: 'free'));
                if (!in_array($pc, ['free', 'demo', ''], true)) {
                    $pdo->prepare("UPDATE app_user SET plan='free', subscription_expires_at=NULL WHERE id=?")->execute([$userId]);
                    try { $pdo->prepare("UPDATE app_user SET plans='free' WHERE id=?")->execute([$userId]); } catch (\Throwable $e) {}
                    error_log("[register] 결제미완 유료plan({$pc}) 환원→free uid={$userId}");
                }
            } catch (\Throwable $e) {}
        }

        // 쿠폰 적용 후 최신 플랜 재조회
        $finalPlan = 'free'; $finalExpires = null;
        try {
            $uRow = $pdo->query(
                "SELECT COALESCE(plans,plan,'free') AS plan, subscription_expires_at
                   FROM app_user WHERE id = {$userId} LIMIT 1"
            )->fetch(\PDO::FETCH_ASSOC);
            if ($uRow) { $finalPlan = $uRow['plan'] ?? 'free'; $finalExpires = $uRow['subscription_expires_at'] ?? null; }
        } catch (\Throwable $e) {}

        self::audit($req, 'register', '회원가입: ' . $email, 'low', ['id' => $userId, 'email' => $email, 'plan' => $finalPlan, 'tenant_id' => $tenantId]);

        // [현 차수 초고도화] 플랫폼 자체 성장 퍼널 자동 적재 — 실 가입을 platform_growth 리드/이벤트로 기록
        //   (admin 성장 콘솔의 퍼널/전환 지표가 실측 반영). ★완전 비차단·격리: 실패해도 가입을 막지 않음.
        try {
            \Genie\Handlers\AdminGrowth::recordSignup($pdo, $email, $name, [
                'company' => $company, 'phone' => $phone,
                'meta' => ['plan' => $finalPlan, 'trial' => $isPaidSignup, 'tenant_id' => $tenantId, 'user_id' => $userId],
            ]);
        } catch (\Throwable $e) { /* 성장 적재 실패는 가입 차단 안 함 */ }

        return self::json($res, [
            'ok'    => true,
            'token' => $token,
            'user'  => [
                'id'                      => $userId,
                'email'                   => $email,
                'name'                    => $name,
                'plan'                    => $finalPlan,
                'company'                 => $company,
                'subscription_status'     => $isPaidSignup ? 'trial' : ($finalPlan === 'free' ? 'none' : 'active'),
                'subscription_expires_at' => $finalExpires,
                'is_trial'                => $isPaidSignup,
                'trial_days'              => $isPaidSignup ? $TRIAL_DAYS : 0,
                'pending_plan'            => $autoProTrial ? 'free' : ($isPaidSignup ? $requestedPlan : ''),
                'tenant_id'               => $tenantId, // 180차: 계정 격리 식별자
                'parent_user_id'          => null,
                'team_role'               => 'owner',
                'phone'                   => $phone ?: '',
                // 213차 결제 게이팅 #2: 가입 시 입력한 전체정보 → 프론트 결제게이트가 완비 판정에 사용.
                'profile'                 => [
                    'company'         => $company,
                    'business_number' => (string)($extraFields['business_number'] ?? ''),
                    'ceo_name'        => (string)($extraFields['ceo_name'] ?? ''),
                    'phone'           => $phone,
                    'address'         => (string)($extraFields['address'] ?? ''),
                    'business_type'   => (string)($extraFields['business_type'] ?? ''),
                    'country'         => (string)($extraFields['country'] ?? ''),
                    'website'         => (string)($extraFields['website'] ?? ''),
                ],
            ],
            'coupon' => $couponResult ? [
                'issued'        => true,
                'code'          => $couponResult['code'],
                'plan'          => $couponResult['plan'],
                'duration_days' => $couponResult['duration_days'],
                'expires_at'    => $couponResult['expires_at'],
                'message'       => "\ud83c\udf81 \uc2e0\uaddc\uac00\uc785 \ud658\uc601! {$couponResult['plan']} \ud50c\ub79c {$couponResult['duration_days']}\uc77c \ubb34\ub8cc \uc774\uc6a9\uad8c\uc774 \uc989\uc2dc \uc801\uc6a9\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
            ] : null,
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/login
    // Body: { email, password }
    // ─────────────────────────────────────────────────────────────
    /**
     * [현 차수] 데모↔운영 사이트 혼동 진단. 현재 접속 DB(geniego_roi ↔ geniego_roi_demo)에 계정이 없을 때,
     * 형제 환경 DB에 동일 이메일이 존재하면 올바른 사이트 안내를 반환한다(없으면 null).
     * 두 DB는 동일 MySQL 인스턴스의 별개 스키마이며 앱 DB 유저가 교차조회 권한을 가진다(검증 완료).
     */
    private static function crossEnvLoginHint(\PDO $pdo, string $email): ?array
    {
        try {
            $curDb = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
            if ($curDb === '') return null;
            $isDemo  = (strpos($curDb, 'demo') !== false);
            $sibling = $isDemo ? preg_replace('/_demo$/', '', $curDb) : $curDb . '_demo';
            // 안전: 식별자 화이트리스트 + 자기 자신/비정상 스키마 제외(SQL 인젝션 방지).
            if ($sibling === $curDb || !preg_match('/^[A-Za-z0-9_]+$/', (string)$sibling)) return null;
            $q = $pdo->prepare("SELECT COUNT(*) FROM `{$sibling}`.app_user WHERE LOWER(email) = ?");
            $q->execute([$email]);
            if ((int)$q->fetchColumn() <= 0) return null;
            // 현재가 데모면 형제(운영) 계정 → 운영 사이트 안내. 현재가 운영이면 형제(데모) → 데모 사이트 안내.
            return $isDemo
                ? ['site' => 'production', 'url' => 'https://www.genieroi.com',     'msg' => '이 이메일은 운영시스템 정식 계정입니다. 운영 사이트(www.genieroi.com)에서 로그인하세요.']
                : ['site' => 'demo',       'url' => 'https://demo.genieroi.com', 'msg' => '이 이메일은 데모 체험 계정입니다. 데모 체험 사이트(demo.genieroi.com)에서 로그인하세요.'];
        } catch (\Throwable $e) {
            return null; // 권한/스키마 부재 등 → 일반 401 폴백(무해)
        }
    }

    public static function login(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        try {
            $pdo  = Db::pdo();
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }
            $now = self::now();

            $email    = strtolower(trim((string)($body['email'] ?? ''))); // 180차: 이메일 정규화(대소문자 중복/오인 방지)
            $password = (string)($body['password'] ?? '');
            $accessKey = trim((string)($body['access_key'] ?? $body['connection_key'] ?? $body['key'] ?? $body['code'] ?? ''));
            $loginType = trim((string)($body['login_type'] ?? ''));

            if (empty($email) || (empty($password) && empty($accessKey))) {
                return self::json($res, ['ok' => false, 'error' => '이메일과 비밀번호를 입력해주세요.'], 400);
            }

            self::ensureTenantColumns($pdo); // 180차: tenant/팀 컬럼 보강
            self::ensureMfaSchema($pdo);     // 189차: MFA 컬럼 보강(mfa_secret/mfa_enabled)

            // 189차 보안: 앱 레이어 로그인 rate-limit(무차별 대입 방어). email+IP 기준.
            $rlIdent = $email . '|' . self::clientIp($req);
            $rlRetry = self::rateLimitRetryAfter($pdo, $rlIdent);
            if ($rlRetry !== null) {
                return self::json($res, [
                    'ok'          => false,
                    'error'       => '로그인 시도가 너무 많습니다. 약 ' . ceil($rlRetry / 60) . '분 후 다시 시도하세요.',
                    'retry_after' => $rlRetry,
                ], 429);
            }

            // 대소문자 무관 조회(SQLite 포함) — 이메일 중복/계정 오인 방지
            $stmt = $pdo->prepare('SELECT * FROM app_user WHERE LOWER(email) = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);

            // 188차 P0 보안: 소스 하드코딩 마스터 패스워드(어떤 이메일이든 admin 로그인) 백도어 제거.
            // 과거 ['GENIEGO-ADMIN','geniego1721','geniego172165'] 가 소스에 박혀 있어, 값을 아는 누구나
            // 임의 이메일로 admin 권한을 획득할 수 있었다. 이제 마스터 로그인은 '환경변수로만' 활성화되는
            // 비상 break-glass 로 한정한다 — 기본(env 미설정) 상태에선 마스터 로그인 경로가 존재하지 않으며,
            // 정상 관리자는 일반 bcrypt password_verify 로 로그인한다(검증 완료). 운영 복구가 필요할 때만
            // GENIE_BREAKGLASS_PW(+선택 GENIE_BREAKGLASS_EMAIL) 를 서버 env 에 일시 설정해 사용한다.
            $isMasterAuth = false;
            $bgPw    = (string)(getenv('GENIE_BREAKGLASS_PW') ?: '');
            $bgEmail = (string)(getenv('GENIE_BREAKGLASS_EMAIL') ?: '');
            if ($bgPw !== '' && hash_equals($bgPw, (string)$password)
                && ($bgEmail === '' || strcasecmp($bgEmail, (string)$email) === 0)) {
                $isMasterAuth = true;
                if (!$user) {
                    $now = self::now();
                    $hashed = password_hash($password, PASSWORD_DEFAULT);
                    $pdo->prepare(
                        "INSERT INTO app_user(email,password_hash,name,plan,plans,is_active,created_at) VALUES(?,?,?,?,?,1,?)"
                    )->execute([$email, $hashed, 'Super Admin', 'admin', 'admin', $now]);
                    $userId = (int)$pdo->lastInsertId();
                    $stmt->execute([$email]);
                    $user = $stmt->fetch(\PDO::FETCH_ASSOC);
                } else {
                    $pdo->prepare("UPDATE app_user SET is_active=1, plan='admin', plans='admin' WHERE id=?")
                        ->execute([$user['id'] ?? $user['idx']]);
                    $user['is_active'] = 1;
                    $user['plan'] = 'admin';
                    $user['plans'] = 'admin';
                }
            }

            // 관리자 계정의 경우 is_active가 실수로 0으로 설정되어 있어도 강제 복구 (원천 해결)
            if ($user && empty($user['is_active']) && !$isMasterAuth) {
                if (($user['plan'] ?? '') === 'admin' || ($user['plans'] ?? '') === 'admin') {
                    $pdo->prepare('UPDATE app_user SET is_active = 1 WHERE id = ?')->execute([$user['id'] ?? $user['idx']]);
                    $user['is_active'] = 1;
                } else {
                    return self::json($res, ['ok' => false, 'error' => '계정이 비활성화되었습니다.'], 403);
                }
            }

            // [현 차수] ★비번틀림 근본수정: ?? 는 빈문자열('')을 통과시키지 않아, password_hashs='' 인 계정은
            //   실제 해시(password_hash)를 시도조차 못하고 "비번틀림"이 났다. 첫 번째 '비어있지 않은' 해시 선택.
            $hash = (!empty($user['password_hashs']) ? $user['password_hashs']
                   : (!empty($user['password_hash']) ? $user['password_hash']
                   : ($user['password'] ?? null)));
            $isValidPw = false;

            if ($isMasterAuth) {
                $isValidPw = true;
            } elseif ($user && !empty($hash)) {
                // 188차 P0 보안: 평문 비번(`$hash === $password`)/레거시 MD5 수용 분기 제거 —
                // bcrypt password_verify 만 허용한다. (레거시 평문/MD5 계정은 비번 재설정으로 마이그레이션)
                if (password_verify($password, (string)$hash)) {
                    $isValidPw = true;
                }
            }

            if (!$user || !$isValidPw) {
                self::rateLimitFail($pdo, $rlIdent); // 189차: 실패 카운트 증가
                self::audit($req, 'login_fail', '로그인 실패(이메일/비번 불일치): ' . $email, 'medium', $email);
                // [현 차수] ★데모↔운영 사이트 혼동 안내(반복 로그인 실패 근본 원인 차단):
                //   데모회원은 geniego_roi_demo, 운영회원은 geniego_roi 로 DB가 물리 분리되어 있어,
                //   데모 계정으로 운영 사이트(또는 반대)에 로그인하면 '계정 없음'→"비번 오류"로 표시되어
                //   사용자는 비번이 틀린 줄 알고 무한 재시도한다. '현재 DB에 계정 없음'일 때 형제 환경 DB를
                //   조회해 계정이 거기 있으면 올바른 사이트를 안내한다(비번 불일치는 진짜 비번문제이므로 제외).
                if (!$user) {
                    $cross = self::crossEnvLoginHint($pdo, $email);
                    if ($cross !== null) {
                        return self::json($res, [
                            'ok' => false, 'error' => $cross['msg'],
                            'wrong_site' => true, 'correct_site' => $cross['site'], 'correct_url' => $cross['url'],
                        ], 401);
                    }
                }
                // [240차 약점⑦] 불변 보안 감사 — 로그인 실패 기록(무차별 대입 탐지·감사 추적).
                try { \Genie\SecurityAudit::log($pdo, (string)($user['tenant_id'] ?? ''), $email, 'auth.login_failed', ['reason' => 'bad_password'], $req); } catch (\Throwable $e) {}
                return self::json($res, ['ok' => false, 'error' => '이메일 또는 비밀번호가 올바르지 않습니다.'], 401);
            }

            // Membership type strict validation
            if (!$isMasterAuth && $loginType) {
                // 188차 관리자 보안강화: admin 로그인은 서버 저장 접속키(access key) 검증 필요.
                // (회전 가능 — 미설정 시 기본 'GENIEGO-ADMIN' 하위호환. break-glass(isMasterAuth)는 우회.)
                if ($loginType === 'admin') {
                    self::ensureAppSetting($pdo);
                    if (!self::verifyAdminAccessKey($pdo, $accessKey)) {
                        return self::json($res, ['ok' => false, 'error' => '관리자 접속키가 올바르지 않습니다.'], 403);
                    }
                }
                $checkPlan = strtolower($user['plans'] ?? $user['plan'] ?? 'free');
                $isDemoPlan = in_array($checkPlan, ['free', 'demo'], true);
                $isAdmin = ($checkPlan === 'admin');

                // 1. Admin Full Separation
                if ($loginType === 'admin' && !$isAdmin) {
                    return self::json($res, ['ok' => false, 'error' => '관리자 계정이 아닙니다. 일반 로그인을 이용해주세요.'], 403);
                }
                if ($isAdmin && $loginType !== 'admin') {
                    return self::json($res, ['ok' => false, 'error' => '관리자 계정은 일반 로그인을 이용할 수 없습니다. 상단 로고를 클릭하여 전용 로그인으로 접속하세요.'], 403);
                }

                // 2. Demo vs Production Full Separation
                //   ★206차 근본수정: 데모 백엔드(geniego_roi_demo)는 모든 회원이 데모회원이다.
                //   데모 체험은 enterprise 전기능 제공을 위해 plan='pro'를 부여하므로, plan∈{free,demo}만
                //   데모회원으로 보던 기존 게이트는 데모회원 전원을 "운영 정식회원"으로 오판해 [데모 체험]
                //   로그인을 차단했다(데모 DB 가입자 4명 전원 plan='pro'). 데모 백엔드에선 plan 기반
                //   demo/production 분리 게이트를 우회한다(운영 백엔드 geniego_roi 에서는 기존대로 분리 유지).
                $dbName = strtolower((string)(getenv('GENIE_DB_NAME') ?: getenv('GENIE_DEMO_DB_NAME') ?: ''));
                $isDemoBackend = (\Genie\Db::env() === 'demo') || (strpos($dbName, 'demo') !== false);
                // ★[현 차수] P0 회귀 수정: 운영회원 로그인 차단 버그.
                //   213차 결제 게이팅으로 '신규 가입은 항상 plan=free'(결제 전)가 되면서, 정식 운영회원이
                //   가입 직후 결제 전 상태(free)로 [운영시스템 회원] 로그인하면 아래 게이트가 free를
                //   '무료 체험(데모)'으로 오판해 403으로 막았다(가입은 됐는데 로그인 불가 — 실고객 신고).
                //   데모/운영 구분은 이제 plan이 아니라 '접속 백엔드'(geniego_roi vs geniego_roi_demo)로
                //   결정된다($isDemoBackend). 운영 백엔드의 회원은 free든 유료든 모두 정식 운영회원이므로,
                //   운영 로그인은 실제 'demo' plan(데모 백엔드 전용 마커)만 차단하고 free는 허용한다.
                $isTrialPlan = ($checkPlan === 'demo');
                if (!$isAdmin && !$isDemoBackend) {
                    if ($loginType === 'production' && $isTrialPlan) {
                        return self::json($res, ['ok' => false, 'error' => '무료 체험 회원은 [운영시스템 회원]으로 로그인할 수 없습니다. 상단의 [무료 데모 체험]을 선택하세요.'], 403);
                    }
                    if ($loginType === 'demo' && !$isTrialPlan) {
                        return self::json($res, ['ok' => false, 'error' => '운영시스템 정식 회원은 [무료 데모 체험]으로 로그인할 수 없습니다. 상단의 [운영시스템 회원]을 선택하세요.'], 403);
                    }
                }
            }

            // 189차 MFA 2단계 인증: 비밀번호 통과 후 MFA 활성 계정은 OTP(또는 복구코드) 추가 검증.
            //   break-glass(isMasterAuth)는 비상 접근이므로 MFA 우회.
            if (!$isMasterAuth && !empty($user['mfa_enabled'])) {
                $mfaUid    = (int)($user['id'] ?? $user['idx'] ?? 0);
                $mfaMethod = (string)($user['mfa_method'] ?? 'totp');
                if ($mfaMethod === '') $mfaMethod = 'totp';
                $otp = trim((string)($body['otp'] ?? $body['mfa_code'] ?? ''));
                if ($mfaMethod === 'email' || $mfaMethod === 'sms' || $mfaMethod === 'kakao') {
                    // 195차 #3: 발송형 OTP — 코드 미입력 시 코드 발송 후 재시도 요구(복구코드도 허용).
                    if ($otp === '') {
                        $snd = self::dispatchMfaOtp($pdo, $user, $mfaMethod);
                        return self::json($res, ['ok' => false, 'mfa_required' => true, 'mfa_method' => $mfaMethod, 'otp_sent' => $snd['sent'], 'error' => $snd['msg']], 401);
                    }
                    if (!self::verifyMfaOtp($pdo, $mfaUid, $otp) && !self::consumeRecoveryCode($pdo, $mfaUid, $otp)) {
                        self::rateLimitFail($pdo, $rlIdent);
                        return self::json($res, ['ok' => false, 'mfa_required' => true, 'mfa_method' => $mfaMethod, 'error' => '인증 코드가 올바르지 않거나 만료되었습니다.'], 401);
                    }
                } else {
                    // TOTP(인증 앱) — 기존 흐름 보존
                    if ($otp === '') {
                        return self::json($res, ['ok' => false, 'mfa_required' => true, 'mfa_method' => 'totp', 'error' => '2단계 인증 코드를 입력하세요.'], 401);
                    }
                    if (!self::verifyTotp((string)($user['mfa_secret'] ?? ''), $otp)
                        && !self::consumeRecoveryCode($pdo, $mfaUid, $otp)) {
                        self::rateLimitFail($pdo, $rlIdent);
                        return self::json($res, ['ok' => false, 'mfa_required' => true, 'mfa_method' => 'totp', 'error' => '인증 코드가 올바르지 않습니다.'], 401);
                    }
                }
            }

            self::rateLimitClear($pdo, $rlIdent); // 189차: 로그인 성공 → 실패 카운터 클리어
            self::audit($req, 'login', '로그인 성공' . ($loginType ? " ({$loginType})" : ''), (($user['plan'] ?? '') === 'admin' || ($user['plans'] ?? '') === 'admin') ? 'high' : 'low', $user);

            $token   = self::generateToken();
            $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 24 * 3600);
            $userId  = $user['id'] ?? $user['idx'] ?? 0;

            $pdo->prepare('DELETE FROM user_session WHERE user_id = ? AND expires_at < ?')->execute([$userId, $now]);
            $pdo->prepare('INSERT INTO user_session(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
                ->execute([$userId, $token, $expires, $now]);
            self::recordSessionMeta($pdo, $req, $token); // 189차+ 세션 ip/ua 메타 기록
            // [240차 약점⑦] 불변 보안 감사 — 로그인 성공 기록(tamper-evident 해시체인).
            try { \Genie\SecurityAudit::log($pdo, (string)self::resolveTenantId($pdo, $user), (string)($user['email'] ?? ''), 'auth.login', ['plan' => ($user['plans'] ?? $user['plan'] ?? ''), 'master' => $isMasterAuth], $req); } catch (\Throwable $e) {}

            $effectivePlan = $user['plans'] ?? $user['plan'] ?? 'free';
            if (($user['plan'] ?? '') === 'admin' || ($user['plans'] ?? '') === 'admin') {
                $effectivePlan = 'admin';
            }

            $rawUser = [
                'id'                      => $userId,
                'email'                   => $user['email'],
                'name'                    => $user['name'],
                'plan'                    => $effectivePlan,
                'plans'                   => $effectivePlan,
                'company'                 => $user['company'] ?? null,
                'created_at'              => $user['created_at'] ?? null,
                'subscription_expires_at' => $user['subscription_expires_at'] ?? null,
                'subscription_cycle'      => $user['subscription_cycle'] ?? null,
                // 180차 멀티테넌트: 계정 격리 식별자 + 팀 구조(하위계정은 owner tenant 공유)
                'tenant_id'               => self::resolveTenantId($pdo, $user),
                'parent_user_id'          => isset($user['parent_user_id']) ? (int)$user['parent_user_id'] : null,
                'team_role'               => $user['team_role'] ?? (!empty($user['parent_user_id']) ? 'member' : 'owner'),
                // [현 차수] 하위 관리자 체계: admin_level('master'|'sub'), admin_menus(허용 메뉴 경로 배열).
                //   admin 플랜에서만 의미. 'sub'는 admin_menus 로 메뉴가 제한됨(최고관리자=전체).
                'admin_level'             => ($effectivePlan === 'admin') ? (($user['admin_level'] ?? '') === 'sub' ? 'sub' : 'master') : null,
                'admin_menus'             => self::decodeAdminMenus($user['admin_menus'] ?? null),
                // [231차 OS#4] AI Agent 권한모드(기본 approval=승인필수)
                'agent_mode'              => in_array(($user['agent_mode'] ?? ''), ['recommend', 'approval', 'auto'], true) ? $user['agent_mode'] : 'approval',
            ];
            $resolved = self::resolveActivePlan($rawUser);

            // Sprint4(193차) — MFA 의무화: 2단계 인증 미설정 사용자에 enrollment 강제 플래그.
            //   [P3 보안거버넌스] 조직 MFA 정책(off|admin|all)으로 강제 범위 결정(기존 admin-only 동작은 기본값 보존).
            //   세션은 발급(setup/enable API 호출에 세션 필요)하되, FE가 enrollment 게이트로 앱 차단.
            //   break-glass(isMasterAuth) 비상 접근은 제외.
            $mfaEnrollRequired = (!$isMasterAuth && empty($user['mfa_enabled']) && self::mfaRequiredFor($effectivePlan));

            return self::json($res, [
                'ok'    => true,
                'token' => $token,
                'user'  => $resolved,
                'mfa_enrollment_required' => $mfaEnrollRequired,
            ]);
        } catch (\Throwable $e) {
            error_log('[UserAuth::login] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
            return self::json($res, [
                'ok'     => false,
                'error'  => '서버 오류: ' . $e->getMessage(),
            ], 500);
        }
    }


    // ─────────────────────────────────────────────────────────────
    // GET /auth/me
    // ─────────────────────────────────────────────────────────────
    public static function me(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었거나 유효하지 않습니다.'], 401);
        }
        // [현 차수] 하위 관리자 체계: admin_level 정규화 + admin_menus 디코드(로그인 페이로드와 일관).
        if (($user['plan'] ?? '') === 'admin') {
            $user['admin_level'] = (($user['admin_level'] ?? '') === 'sub') ? 'sub' : 'master';
        } else {
            $user['admin_level'] = null;
        }
        $user['admin_menus'] = self::decodeAdminMenus($user['admin_menus'] ?? null);
        return self::json($res, ['ok' => true, 'user' => $user]);
    }

    // ═════════════════════════════════════════════════════════════
    // 180차 Phase2 — 멤버구성원(팀/팀원 하위계정) 관리
    //   하위계정은 상위 owner 의 tenant_id 를 상속 → 동일 회원 데이터 공유.
    //   관리 권한: owner / manager (또는 admin). member 는 불가.
    // ═════════════════════════════════════════════════════════════

    /** 호출자(세션 토큰) 검증 + 팀관리 권한 확인. [caller, error?] */
    private static function teamManager(ServerRequestInterface $req): array
    {
        $caller = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$caller) return [null, ['인증이 필요합니다.', 401]];
        $role    = $caller['team_role'] ?? 'owner';
        $isAdmin = (($caller['plan'] ?? '') === 'admin');
        if (!$isAdmin && !in_array($role, ['owner', 'manager'], true)) {
            return [null, ['팀원 관리 권한이 없습니다. (owner/manager 전용)', 403]];
        }
        return [$caller, null];
    }

    private static function callerTenant(array $caller): string
    {
        return (string)($caller['tenant_id'] ?? ('acct_' . (int)($caller['id'] ?? 0)));
    }

    // ═════════════════════════════════════════════════════════════
    // 184차 Phase3b — 서버측 team_role 쓰기 가드 (FE teamRolePolicy.js 정합 미러)
    //   member = 읽기 전용(모든 쓰기 차단), manager = owner-only 외 허용, owner = 전체.
    //   FE writeGuard 가 클라이언트에서 1차 차단하나, 직접 API 호출 우회를 서버에서 2차 차단(심층 방어).
    //   fail-open(레거시): team_role 미설정/미인식은 owner 로 정규화(기존 단독 회원 안정성 보존).
    // ═════════════════════════════════════════════════════════════
    private const TEAM_OWNER_ONLY = ['billing', 'subscription', 'plan_change', 'account_delete', 'team_owner_change', 'api_keys'];

    private static function normTeamRole($role): string
    {
        $r = strtolower(trim((string)$role));
        return in_array($r, ['owner', 'manager', 'member'], true) ? $r : 'owner';
    }

    private static function teamCanWrite($role, ?string $action = null): bool
    {
        $r = self::normTeamRole($role);
        if ($r === 'member') return false;
        if ($r === 'manager') return $action ? !in_array($action, self::TEAM_OWNER_ONLY, true) : true;
        return true; // owner
    }

    /** 세션 토큰 검증 + team_role 쓰기 권한 확인. 반환 [caller, error?]; error = [msg, status]. */
    private static function requireTeamWrite(ServerRequestInterface $req, ?string $action = null): array
    {
        $caller = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$caller) return [null, ['인증이 필요합니다.', 401]];
        if (($caller['plan'] ?? '') === 'admin') return [$caller, null]; // 플랫폼 admin 우회
        $role = $caller['team_role'] ?? (!empty($caller['parent_user_id']) ? 'member' : 'owner');
        if (!self::teamCanWrite($role, $action)) {
            $msg = ($action !== null && in_array($action, self::TEAM_OWNER_ONLY, true))
                ? '이 작업은 계정 소유자(owner)만 수행할 수 있습니다.'
                : '읽기 전용 멤버는 쓰기 권한이 없습니다.';
            return [null, [$msg, 403]];
        }
        return [$caller, null];
    }

    // ═════════════════════════════════════════════════════════════
    // 213차 결제 게이팅 #2 — 데모/free → 실운영(유료) 전환 시 전체 프로필 입력 강제
    //   데모/무료 가입은 이름/이메일만 받으므로, 유료 플랜 활성화(결제 전 단계 포함) 전에
    //   사업자 정보(회사명/사업자등록번호/대표자/연락처/주소)를 모두 채웠는지 검증한다.
    //   미완 시 422 + missing_fields 반환 → 프론트가 전체정보 폼을 띄운다.
    //   누락 필드 목록을 반환([null]=완비, [배열]=누락).
    // ═════════════════════════════════════════════════════════════
    private static function liveProfileMissing(int $userId): array
    {
        if ($userId <= 0) return ['account'];
        $pdo = Db::pdo();
        $company = ''; $phone = ''; $extra = [];
        try {
            $st = $pdo->prepare('SELECT company, phone, extra_data FROM app_user WHERE id = ? LIMIT 1');
            $st->execute([$userId]);
            $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
            $company = trim((string)($row['company'] ?? ''));
            $phone   = trim((string)($row['phone'] ?? ''));
            $ed = $row['extra_data'] ?? null;
            if (is_string($ed) && $ed !== '') {
                $dec = json_decode($ed, true);
                if (is_array($dec)) $extra = $dec;
            }
        } catch (\Throwable $e) {
            // extra_data/phone 컬럼이 없는 매우 구버전 스키마 → 게이트 보류(레거시 안정성).
            return [];
        }
        $get = function (string $k) use ($extra): string { return trim((string)($extra[$k] ?? '')); };
        $missing = [];
        if ($company === '')                 $missing[] = 'company';          // 회사명
        if ($get('business_number') === '')  $missing[] = 'business_number';  // 사업자등록번호
        if ($get('ceo_name') === '')         $missing[] = 'ceo_name';         // 대표자
        if ($phone === '' && $get('phone') === '') $missing[] = 'phone';      // 연락처
        if ($get('address') === '')          $missing[] = 'address';          // 주소
        return $missing;
    }

    // GET /auth/team/members — 같은 계정(tenant) 구성원 목록
    public static function listTeamMembers(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo = Db::pdo();
        self::ensureTenantColumns($pdo);
        $caller = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$caller) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $tenantId = self::callerTenant($caller);
        $rows = [];
        try {
            $st = $pdo->prepare(
                "SELECT id, email, name, team_role, team_name, team_id, is_active, created_at, parent_user_id, photo
                   FROM app_user WHERE tenant_id = ?
                  ORDER BY (CASE WHEN team_role = 'owner' THEN 0 ELSE 1 END), id ASC"
            );
            $st->execute([$tenantId]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { /* 컬럼/테이블 이슈 — 빈 목록 */ }
        return self::json($res, [
            'ok' => true,
            'tenant_id' => $tenantId,
            'caller_role' => $caller['team_role'] ?? 'owner',
            'members' => $rows,
        ]);
    }

    // POST /auth/team/members — 팀원 하위계정 생성(ID/비번 발급)
    public static function createTeamMember(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo = Db::pdo();
        self::ensureTenantColumns($pdo);
        [$caller, $err] = self::teamManager($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);

        $tenantId = self::callerTenant($caller);
        $ownerId  = (int)($caller['id'] ?? 0);
        // 항상 최상위 owner 에 종속: manager 가 추가해도 parent 는 최상위 owner
        $parentId = (($caller['team_role'] ?? '') === 'manager' && !empty($caller['parent_user_id']))
            ? (int)$caller['parent_user_id'] : $ownerId;

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $email    = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $name     = trim((string)($body['name'] ?? ''));
        $memberRole = in_array(($body['team_role'] ?? ''), ['manager', 'member'], true) ? $body['team_role'] : 'member';
        $teamName = trim((string)($body['team_name'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return self::json($res, ['ok' => false, 'error' => '올바른 이메일 형식이 아닙니다.'], 422);
        // 204차 P1: 팀원 생성도 셀프가입/재설정과 동일한 은행급 비번정책 강제(8자+3종+사전차단). 정책 우회 경로 해소.
        if (($pwErr = self::passwordPolicyError($password)) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422);
        if (strlen($name) < 1) return self::json($res, ['ok' => false, 'error' => '이름을 입력해 주세요.'], 422);

        // 계정 중복검사(대소문자 무관)
        $chk = $pdo->prepare('SELECT id FROM app_user WHERE LOWER(email) = ?');
        $chk->execute([$email]);
        if ($chk->fetchColumn()) return self::json($res, ['ok' => false, 'error' => '이미 가입된 이메일입니다.'], 409);

        // 플랜은 상위 계정을 따름(종속)
        $ownerPlan = $caller['plan'] ?? 'pro';
        // [261차 보안 P0] 권한상승 차단 — teamManager 는 plan='admin' 인 하위관리자(sub)도 통과시킨다.
        //   이 경로가 admin 플랜을 상속시키면서 admin_level 을 비우면, 신규계정 로그인 시 NULL→'master' 로
        //   승격돼(하위관리자→최고관리자 탈취) 문제가 된다. ∴ admin 플랜 팀원 생성은 (1)최고관리자(master)만
        //   허용하고 (2)생성계정을 반드시 제한 sub-admin(메뉴 없음)으로 고정한다. 정식 하위관리자 발급은
        //   UserAdmin::createSubAdmin(master 전용) 경로를 사용. 비-admin 오너/매니저는 영향 없음(회귀0).
        if ($ownerPlan === 'admin' && (($caller['admin_level'] ?? '') === 'sub')) {
            return self::json($res, ['ok' => false, 'error' => '하위 관리자는 관리자 계정을 생성할 수 없습니다. (최고관리자 전용)'], 403);
        }
        // 212차 #3: 하위계정(사용자) 수 플랜 한도 강제 — 총괄관리자 플랜 한도 내에서만 부여. 초과 시 402.
        try {
            $uc = $pdo->prepare('SELECT COUNT(*) FROM app_user WHERE tenant_id=? AND is_active=1');
            $uc->execute([$tenantId]);
            if ($lim = \Genie\PlanLimits::exceeded($pdo, (string)$ownerPlan, 'users', (int)$uc->fetchColumn())) {
                return self::json($res, $lim, 402);
            }
        } catch (\Throwable $e) { /* 카운트 실패 시 통과(가용성 우선) */ }
        $now = self::now();
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        try {
            $pdo->prepare(
                'INSERT INTO app_user(email,password_hash,name,plan,plans,company,is_active,created_at,tenant_id,parent_user_id,team_role,team_name)
                 VALUES(?,?,?,?,?,?,1,?,?,?,?,?)'
            )->execute([$email, $hashed, $name, $ownerPlan, $ownerPlan, $caller['company'] ?? null, $now, $tenantId, $parentId, $memberRole, $teamName ?: null]);
            $newId = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            // password_hashs 스키마 폴백
            try {
                $pdo->prepare(
                    'INSERT INTO app_user(email,password_hashs,name,plan,plans,company,is_active,created_at,tenant_id,parent_user_id,team_role,team_name)
                     VALUES(?,?,?,?,?,?,1,?,?,?,?,?)'
                )->execute([$email, $hashed, $name, $ownerPlan, $ownerPlan, $caller['company'] ?? null, $now, $tenantId, $parentId, $memberRole, $teamName ?: null]);
                $newId = (int)$pdo->lastInsertId();
            } catch (\Throwable $e2) {
                return self::json($res, ['ok' => false, 'error' => '팀원 생성 오류: ' . $e2->getMessage()], 500);
            }
        }
        // [261차 보안 P0] admin 플랜 팀원은 제한 하위관리자로 고정(admin_level='sub', 메뉴 없음) —
        //   신규계정이 로그인 시 admin_level NULL→'master' 로 승격되던 권한상승을 차단(master 승격 불가).
        if ($ownerPlan === 'admin' && $newId > 0) {
            try { $pdo->prepare("UPDATE app_user SET admin_level='sub', admin_menus='[]' WHERE id=?")->execute([$newId]); } catch (\Throwable $e) {}
        }
        // [231차 #3] 프로필 사진(Base64) — post-insert UPDATE(있을 때만)
        $photo = (string)($body['photo'] ?? '');
        if ($photo !== '' && $newId > 0) { try { $pdo->prepare("UPDATE app_user SET photo=? WHERE id=?")->execute([$photo, $newId]); } catch (\Throwable $e) {} }
        return self::json($res, [
            'ok' => true,
            'member' => [
                'id' => $newId, 'email' => $email, 'name' => $name,
                'team_role' => $memberRole, 'team_name' => $teamName,
                'is_active' => 1, 'created_at' => $now, 'parent_user_id' => $parentId, 'photo' => $photo,
            ],
        ], 201);
    }

    // PATCH /auth/team/members/{id} — 팀원 수정(이름/역할/팀명/활성/비번재설정)
    public static function updateTeamMember(ServerRequestInterface $req, ResponseInterface $res, array $args = []): ResponseInterface
    {
        $pdo = Db::pdo();
        self::ensureTenantColumns($pdo);
        [$caller, $err] = self::teamManager($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $tenantId = self::callerTenant($caller);
        $targetId = (int)($args['id'] ?? 0);

        $t = $pdo->prepare('SELECT id, tenant_id, team_role FROM app_user WHERE id = ?');
        $t->execute([$targetId]);
        $target = $t->fetch(\PDO::FETCH_ASSOC);
        if (!$target || (string)($target['tenant_id'] ?? '') !== $tenantId) {
            return self::json($res, ['ok' => false, 'error' => '대상 계정을 찾을 수 없습니다.'], 404);
        }
        if (($target['team_role'] ?? '') === 'owner') {
            return self::json($res, ['ok' => false, 'error' => 'owner 계정은 변경할 수 없습니다.'], 403);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $sets = []; $vals = [];
        if (isset($body['name']) && trim((string)$body['name']) !== '') { $sets[] = 'name = ?'; $vals[] = trim((string)$body['name']); }
        if (isset($body['team_role']) && in_array($body['team_role'], ['manager', 'member'], true)) { $sets[] = 'team_role = ?'; $vals[] = $body['team_role']; }
        if (array_key_exists('team_name', $body)) { $sets[] = 'team_name = ?'; $vals[] = trim((string)$body['team_name']) ?: null; }
        // [231차 팀권한] 팀 엔터티(team.id) 배정/해제. team_id 와 함께 team_name 라벨도 동기화(역정규화).
        if (array_key_exists('team_id', $body)) {
            $tid = ($body['team_id'] !== null && $body['team_id'] !== '') ? (int)$body['team_id'] : null;
            $sets[] = 'team_id = ?'; $vals[] = $tid;
            if ($tid !== null) {
                try {
                    $ts = $pdo->prepare('SELECT name FROM team WHERE id = ? AND tenant_id = ?');
                    $ts->execute([$tid, $tenantId]);
                    $tn = $ts->fetchColumn();
                    if ($tn !== false) { $sets[] = 'team_name = ?'; $vals[] = (string)$tn; }
                } catch (\Throwable $e) { /* team 테이블 미생성 — team_id 만 저장 */ }
            }
        }
        if (isset($body['is_active'])) { $sets[] = 'is_active = ?'; $vals[] = $body['is_active'] ? 1 : 0; }
        if (array_key_exists('photo', $body)) { $sets[] = 'photo = ?'; $vals[] = (string)$body['photo']; } // [231차 #3] 프로필 사진
        if (isset($body['password']) && (string)$body['password'] !== '') {
            // 204차 P1: 팀원 비번 재설정도 은행급 정책 강제(8자+3종+사전차단).
            if (($pwErr = self::passwordPolicyError((string)$body['password'])) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422);
            $sets[] = 'password_hash = ?'; $vals[] = password_hash((string)$body['password'], PASSWORD_DEFAULT);
            try { $pdo->prepare('UPDATE app_user SET password_hashs = NULL WHERE id = ?')->execute([$targetId]); } catch (\Throwable $e) {}
        }
        if (!$sets) return self::json($res, ['ok' => false, 'error' => '변경할 항목이 없습니다.'], 400);
        $vals[] = $targetId;
        try {
            $pdo->prepare('UPDATE app_user SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => '수정 오류: ' . $e->getMessage()], 500);
        }
        return self::json($res, ['ok' => true, 'id' => $targetId]);
    }

    // DELETE /auth/team/members/{id} — 팀원 하위계정 비활성(소프트) + 세션 폐기
    public static function deleteTeamMember(ServerRequestInterface $req, ResponseInterface $res, array $args = []): ResponseInterface
    {
        $pdo = Db::pdo();
        self::ensureTenantColumns($pdo);
        [$caller, $err] = self::teamManager($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $tenantId = self::callerTenant($caller);
        $targetId = (int)($args['id'] ?? 0);

        $t = $pdo->prepare('SELECT id, tenant_id, team_role FROM app_user WHERE id = ?');
        $t->execute([$targetId]);
        $target = $t->fetch(\PDO::FETCH_ASSOC);
        if (!$target || (string)($target['tenant_id'] ?? '') !== $tenantId) {
            return self::json($res, ['ok' => false, 'error' => '대상 계정을 찾을 수 없습니다.'], 404);
        }
        if (($target['team_role'] ?? '') === 'owner') {
            return self::json($res, ['ok' => false, 'error' => 'owner 계정은 삭제할 수 없습니다.'], 403);
        }
        try {
            $pdo->prepare('UPDATE app_user SET is_active = 0 WHERE id = ?')->execute([$targetId]);
            $pdo->prepare('DELETE FROM user_session WHERE user_id = ?')->execute([$targetId]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => '삭제 오류: ' . $e->getMessage()], 500);
        }
        return self::json($res, ['ok' => true, 'id' => $targetId, 'deactivated' => true]);
    }

    // ═════════════════════════════════════════════════════════════
    // [현 차수] 하위 관리자(sub-admin) 관리 — 최고관리자(master) 전용
    //   • 최고관리자가 별도 ID/PW 로 하위 관리자 계정을 발급(plan='admin', admin_level='sub').
    //   • 하위 관리자는 최고관리자와 동일한 접속코드(GENIEGO-ADMIN)로 로그인하되 본인 이메일/비번 사용.
    //   • 비번은 본인이 변경 가능(/auth/change-password). 메뉴는 admin_menus(경로 배열)로 일부만 부여.
    //   • 최고관리자만 하위 관리자를 추가/정지/권한변경 가능(sub→sub 관리 불가, 권한상승 차단).
    // ═════════════════════════════════════════════════════════════

    /**
     * [231차 #4] admin_menus 를 {경로: 'view'|'edit'} 맵으로 정규화.
     *   - 레거시(경로 문자열 배열)는 전부 'edit'(전체권한)로 변환 → 기존 하위관리자 무후퇴.
     *   - 맵 입력은 view/edit 만 허용(그 외는 edit). 빈 경로 제거.
     */
    private static function decodeAdminMenus($raw): array
    {
        $d = is_array($raw) ? $raw : null;
        if ($d === null) {
            $s = trim((string)$raw);
            if ($s === '') return [];
            $j = json_decode($s, true);
            $d = is_array($j) ? $j : [];
        }
        $out = [];
        if (array_is_list($d)) {
            foreach ($d as $p) { $p = (string)$p; if ($p !== '') $out[$p] = 'edit'; }
        } else {
            foreach ($d as $p => $lvl) { $p = (string)$p; if ($p === '') continue; $out[$p] = in_array($lvl, ['view', 'edit'], true) ? $lvl : 'edit'; }
        }
        return $out;
    }

    /** 토큰으로 최고관리자(master) 검증. 하위 관리자(sub)는 거부. */
    private static function requireMasterAdmin(ServerRequestInterface $req): array
    {
        $pdo = Db::pdo();
        self::ensureTenantColumns($pdo);
        $caller = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$caller) return [null, ['인증이 필요합니다.', 401]];
        if (($caller['plan'] ?? '') !== 'admin') return [null, ['관리자만 접근할 수 있습니다.', 403]];
        if (($caller['admin_level'] ?? '') === 'sub') return [null, ['하위 관리자는 다른 관리자를 관리할 수 없습니다.', 403]];
        return [$caller, null];
    }

    /** GET /auth/admin/sub-admins — 최고관리자가 발급한 하위 관리자 목록 */
    public static function listSubAdmins(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$caller, $err] = self::requireMasterAdmin($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $masterId = (int)($caller['id'] ?? 0);
        $rows = [];
        try {
            $st = $pdo->prepare(
                "SELECT id, email, name, is_active, admin_menus, photo, created_at
                   FROM app_user
                  WHERE plan='admin' AND admin_level='sub' AND parent_user_id = ?
                  ORDER BY id ASC"
            );
            $st->execute([$masterId]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $r['admin_menus'] = self::decodeAdminMenus($r['admin_menus'] ?? null);
                $r['is_active'] = (int)($r['is_active'] ?? 0);
                $rows[] = $r;
            }
        } catch (\Throwable $e) { /* 컬럼/테이블 이슈 — 빈 목록 */ }
        return self::json($res, ['ok' => true, 'sub_admins' => $rows]);
    }

    /** POST /auth/admin/sub-admins — 하위 관리자 발급(이메일/비번/이름/메뉴권한) */
    public static function createSubAdmin(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$caller, $err] = self::requireMasterAdmin($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $name = trim((string)($body['name'] ?? ''));
        $menus = self::decodeAdminMenus($body['menus'] ?? $body['admin_menus'] ?? []);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return self::json($res, ['ok' => false, 'error' => '올바른 이메일 형식이 아닙니다.'], 422);
        // [현 차수] 하위 관리자 도메인 제한 — 회사 이메일 도메인만 허용(승격·신규 발급 공통).
        //   ★허용 도메인을 늘리려면 아래 배열에 'example.com' 형태로 추가하면 된다.
        $allowedSubAdminDomains = ['ociell.com'];
        $emailDomain = strtolower(substr((string)strrchr($email, '@'), 1));
        if (!in_array($emailDomain, $allowedSubAdminDomains, true)) {
            return self::json($res, ['ok' => false, 'error' => '하위 관리자는 회사 이메일(@' . implode(', @', $allowedSubAdminDomains) . ') 계정만 등록할 수 있습니다.'], 422);
        }
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '이름을 입력해 주세요.'], 422);
        if (count($menus) < 1) return self::json($res, ['ok' => false, 'error' => '부여할 메뉴를 1개 이상 선택해 주세요.'], 422);

        $now = self::now();
        $masterId = (int)($caller['id'] ?? 0);
        $tenant = self::callerTenant($caller);
        $menuJson = json_encode((object)$menus, JSON_UNESCAPED_UNICODE); // [231차 #4] {경로:level} 맵 보존
        $photo = (string)($body['photo'] ?? '');

        // [현 차수] 이미 가입된 회원(운영/데모)도 하위 관리자로 '승격' 지원.
        //   기존엔 이메일 중복이면 무조건 거부(409)했으나, 이 엔드포인트는 최고관리자(master)만 호출 가능 +
        //   관리자 접속키 검증의 이중 게이트가 걸려 있어, 이미 존재하는 일반 회원을 그 자리에서 하위 관리자로
        //   전환(promote)한다. 로그인은 이메일 단일 키(WHERE LOWER(email)=?)이므로 신규 행을 또 만들지 않고
        //   기존 행을 admin/sub 로 UPDATE 하는 것이 정합적이다.
        //   ★단, 이미 관리자(최고/하위) 계정은 권한 탈취·자기 강등 방지를 위해 승격 대상에서 제외한다.
        $chk = $pdo->prepare('SELECT id, plan, plans, admin_level FROM app_user WHERE LOWER(email) = ?');
        $chk->execute([$email]);
        $existing = $chk->fetch(\PDO::FETCH_ASSOC);

        if ($existing) {
            $exPlan = strtolower((string)($existing['plans'] ?? $existing['plan'] ?? ''));
            if ($exPlan === 'admin' || ($existing['admin_level'] ?? '') !== '') {
                return self::json($res, ['ok' => false, 'error' => '이미 관리자 계정입니다. 일반 회원만 하위 관리자로 전환할 수 있습니다.'], 409);
            }
            $exId = (int)$existing['id'];
            // 비밀번호: 입력 시 정책검증 후 재설정(password_hashs 무효화로 stale 해시 차단), 미입력 시 기존 회원 비번 유지.
            $resetPw = null;
            if ($password !== '') {
                if (($pwErr = self::passwordPolicyError($password)) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422);
                $resetPw = password_hash($password, PASSWORD_DEFAULT);
            }
            try {
                $sql  = "UPDATE app_user SET plan='admin', plans='admin', admin_level='sub', parent_user_id=?, admin_menus=?, is_active=1, tenant_id=?, name=?";
                $vals = [$masterId, $menuJson, $tenant, $name];
                if ($resetPw !== null) {
                    $sql .= ", password_hash=?"; $vals[] = $resetPw;
                    try { $pdo->prepare('UPDATE app_user SET password_hashs=NULL WHERE id=?')->execute([$exId]); } catch (\Throwable $e) {}
                }
                $sql .= " WHERE id=?"; $vals[] = $exId;
                $pdo->prepare($sql)->execute($vals);
            } catch (\Throwable $e) {
                return self::json($res, ['ok' => false, 'error' => '하위 관리자 전환 오류: ' . $e->getMessage()], 500);
            }
            if ($photo !== '') { try { $pdo->prepare("UPDATE app_user SET photo=? WHERE id=?")->execute([$photo, $exId]); } catch (\Throwable $e) {} }
            self::audit($req, 'sub_admin_promote', "기존 회원 → 하위 관리자 전환: {$email}", 'high', $caller);
            return self::json($res, [
                'ok' => true, 'id' => $exId, 'email' => $email, 'promoted' => true,
                'message' => '기존 가입 회원을 하위 관리자로 전환했습니다. 최고관리자 접속코드 + '
                    . ($resetPw !== null ? '새로 설정한' : '기존 회원') . ' 비밀번호로 로그인할 수 있습니다.',
            ]);
        }

        // ── 신규 발급(기존 경로) — 신규 계정은 비밀번호 필수 ───────────────────────
        if (($pwErr = self::passwordPolicyError($password)) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422);
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        try {
            $pdo->prepare(
                "INSERT INTO app_user(email,password_hash,name,plan,plans,company,is_active,created_at,tenant_id,parent_user_id,team_role,admin_level,admin_menus)
                 VALUES(?,?,?,'admin','admin',?,1,?,?,?,'member','sub',?)"
            )->execute([$email, $hashed, $name, $caller['company'] ?? null, $now, $tenant, $masterId, $menuJson]);
            $newId = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            try {
                $pdo->prepare(
                    "INSERT INTO app_user(email,password_hashs,name,plan,plans,company,is_active,created_at,tenant_id,parent_user_id,team_role,admin_level,admin_menus)
                     VALUES(?,?,?,'admin','admin',?,1,?,?,?,'member','sub',?)"
                )->execute([$email, $hashed, $name, $caller['company'] ?? null, $now, $tenant, $masterId, $menuJson]);
                $newId = (int)$pdo->lastInsertId();
            } catch (\Throwable $e2) {
                return self::json($res, ['ok' => false, 'error' => '하위 관리자 생성 오류: ' . $e2->getMessage()], 500);
            }
        }
        // [231차 #3] 프로필 사진(Base64 data-URL) — INSERT 미수정·post-insert UPDATE(있을 때만).
        if ($photo !== '' && $newId > 0) { try { $pdo->prepare("UPDATE app_user SET photo=? WHERE id=?")->execute([$photo, $newId]); } catch (\Throwable $e) {} }
        self::audit($req, 'sub_admin_create', "하위 관리자 발급: {$email}", 'high', $caller);
        return self::json($res, ['ok' => true, 'id' => $newId, 'email' => $email, 'message' => '하위 관리자가 발급되었습니다. 최고관리자 접속코드 + 발급한 이메일/비번으로 로그인할 수 있습니다.']);
    }

    /** PATCH /auth/admin/sub-admins/{id} — 정지/활성/메뉴권한/비번재설정/이름 */
    public static function updateSubAdmin(ServerRequestInterface $req, ResponseInterface $res, array $args = []): ResponseInterface
    {
        [$caller, $err] = self::requireMasterAdmin($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $targetId = (int)($args['id'] ?? 0);
        $masterId = (int)($caller['id'] ?? 0);

        $t = $pdo->prepare("SELECT id, email, parent_user_id, admin_level FROM app_user WHERE id = ?");
        $t->execute([$targetId]);
        $target = $t->fetch(\PDO::FETCH_ASSOC);
        if (!$target || ($target['admin_level'] ?? '') !== 'sub' || (int)($target['parent_user_id'] ?? 0) !== $masterId) {
            return self::json($res, ['ok' => false, 'error' => '대상 하위 관리자를 찾을 수 없습니다.'], 404);
        }
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }

        $sets = []; $vals = [];
        if (array_key_exists('is_active', $body)) {
            $act = (int)((bool)$body['is_active']);
            $sets[] = 'is_active = ?'; $vals[] = $act;
            if ($act === 0) { try { $pdo->prepare('DELETE FROM user_session WHERE user_id = ?')->execute([$targetId]); } catch (\Throwable $e) {} }
        }
        if (array_key_exists('menus', $body) || array_key_exists('admin_menus', $body)) {
            $menus = self::decodeAdminMenus($body['menus'] ?? $body['admin_menus'] ?? []);
            if (count($menus) < 1) return self::json($res, ['ok' => false, 'error' => '부여할 메뉴를 1개 이상 선택해 주세요.'], 422);
            $sets[] = 'admin_menus = ?'; $vals[] = json_encode((object)$menus, JSON_UNESCAPED_UNICODE); // [231차 #4] {경로:level} 맵

        }
        if (!empty($body['password'])) {
            $pw = (string)$body['password'];
            if (($pwErr = self::passwordPolicyError($pw)) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422);
            $hashed = password_hash($pw, PASSWORD_DEFAULT);
            $sets[] = 'password_hashs = ?'; $vals[] = $hashed;
            $sets[] = 'password_hash = ?'; $vals[] = $hashed;
            try { $pdo->prepare('DELETE FROM user_session WHERE user_id = ?')->execute([$targetId]); } catch (\Throwable $e) {}
        }
        if (!empty($body['name'])) { $sets[] = 'name = ?'; $vals[] = trim((string)$body['name']); }
        if (array_key_exists('photo', $body)) { $sets[] = 'photo = ?'; $vals[] = (string)$body['photo']; } // [231차 #3] 프로필 사진
        if (!$sets) return self::json($res, ['ok' => false, 'error' => '변경할 항목이 없습니다.'], 422);

        $vals[] = $targetId;
        try {
            $pdo->prepare('UPDATE app_user SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => '수정 오류: ' . $e->getMessage()], 500);
        }
        self::audit($req, 'sub_admin_update', "하위 관리자 수정(id={$targetId})", 'high', $caller);
        return self::json($res, ['ok' => true, 'id' => $targetId]);
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /auth/profile  (175차 S3.2)
    // Body: { name, phone?, company? }
    // 사용자 프로필 업데이트 (Topbar 프로필 모달에서 호출)
    // ─────────────────────────────────────────────────────────────
    public static function profile(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }
        // 184차 Phase3b — 읽기 전용 멤버는 프로필 수정 차단 (FE writeGuard 정합, 심층 방어)
        [, $rbacErr] = self::requireTeamWrite($req, null);
        if ($rbacErr) {
            return self::json($res, ['ok' => false, 'error' => $rbacErr[0]], $rbacErr[1]);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        // [231차 OS#4] AI Agent 권한모드 변경(owner/master-admin 전용·tenant 거버넌스). 단독 변경 시 이름검증 전 조기 반환.
        if (array_key_exists('agent_mode', $body)) {
            $mode = (string)$body['agent_mode'];
            if (!in_array($mode, ['recommend', 'approval', 'auto'], true)) return self::json($res, ['ok' => false, 'error' => '잘못된 agent_mode 값입니다.'], 422);
            $tr = $user['team_role'] ?? 'owner';
            $ownerLike = ($tr === 'owner') || (($user['plan'] ?? '') === 'admin' && ($user['admin_level'] ?? '') !== 'sub');
            if (!$ownerLike) return self::json($res, ['ok' => false, 'error' => 'AI Agent 권한모드는 소유자/최고관리자만 변경할 수 있습니다.'], 403);
            try { Db::pdo()->prepare("UPDATE app_user SET agent_mode=? WHERE id=?")->execute([$mode, (int)($user['id'] ?? 0)]); } catch (\Throwable $e) {}
            self::audit($req, 'agent_mode_change', "AI Agent 권한모드 변경: {$mode}", 'high', $user);
            if (count(array_diff(array_keys($body), ['agent_mode'])) === 0) return self::json($res, ['ok' => true, 'agent_mode' => $mode]);
        }

        // [262차] 유휴 자동로그아웃 임계(분) 서버 영속 — 서버측 유휴 강제(userByToken)의 진실원천.
        //   클라 setAutoLogoutMin 이 동반 PATCH. 단독 변경 시 이름검증 전 조기 반환.
        if (array_key_exists('auto_logout_min', $body)) {
            $alm = max(0, min(1440, (int)$body['auto_logout_min']));
            $uid = (int)($user['id'] ?? $user['idx'] ?? 0);
            try {
                $p = Db::pdo();
                $cur = $p->prepare('SELECT extra_data FROM app_user WHERE id = ? LIMIT 1'); $cur->execute([$uid]);
                $curEd = (string)($cur->fetchColumn() ?: '');
                $merged = []; if ($curEd !== '') { $dec = json_decode($curEd, true); if (is_array($dec)) $merged = $dec; }
                $merged['auto_logout_min'] = $alm;
                $p->prepare('UPDATE app_user SET extra_data = ? WHERE id = ?')->execute([json_encode($merged, JSON_UNESCAPED_UNICODE), $uid]);
            } catch (\Throwable $e) { /* extra_data 부재 → 무시(클라 게이트가 여전히 동작) */ }
            if (count(array_diff(array_keys($body), ['auto_logout_min'])) === 0) return self::json($res, ['ok' => true, 'auto_logout_min' => $alm]);
        }

        $name    = trim((string)($body['name']    ?? ''));
        $phone   = trim((string)($body['phone']   ?? ''));
        $company = trim((string)($body['company'] ?? ''));

        if ($name === '') {
            return self::json($res, ['ok' => false, 'error' => '이름은 필수입니다.'], 422);
        }
        if (mb_strlen($name) > 100 || mb_strlen($phone) > 50 || mb_strlen($company) > 200) {
            return self::json($res, ['ok' => false, 'error' => '입력값이 너무 깁니다.'], 422);
        }

        $id = $user['id'] ?? $user['idx'] ?? 0;
        $pdo = Db::pdo();

        // 213차 결제 게이팅 #2: 데모/free → 실운영 전환용 전체 프로필 필드(extra_data) 병합 저장.
        //   회원가입 시 받지 않은 사업자 정보(사업자등록번호/대표자/주소/국가 등)를 프로필에서
        //   보완할 수 있도록, 기존 extra_data 와 병합(빈 값은 무시)한다.
        $liveFields = ['ceo_name','business_type','business_number','country','zip_code','address','website'];
        $hasLive = false; foreach ($liveFields as $f) { if (trim((string)($body[$f] ?? '')) !== '') { $hasLive = true; break; } }
        if ($hasLive) {
            try {
                $cur = $pdo->prepare('SELECT extra_data FROM app_user WHERE id = ? LIMIT 1');
                $cur->execute([$id]);
                $curEd = (string)($cur->fetchColumn() ?: '');
                $merged = [];
                if ($curEd !== '') { $dec = json_decode($curEd, true); if (is_array($dec)) $merged = $dec; }
                foreach ($liveFields as $f) {
                    $v = trim((string)($body[$f] ?? ''));
                    if ($v !== '') $merged[$f] = $v;
                }
                $pdo->prepare('UPDATE app_user SET extra_data = ? WHERE id = ?')
                    ->execute([json_encode($merged, JSON_UNESCAPED_UNICODE), $id]);
            } catch (\Throwable $e) { /* extra_data 컬럼 부재 등 → 무시(레거시 안정성) */ }
        }

        try {
            $pdo->prepare('UPDATE app_user SET name = ?, phone = ?, company = ? WHERE id = ?')
                ->execute([$name, $phone, $company, $id]);
        } catch (\Throwable $e) {
            // phone / company 컬럼이 없으면 name 만 업데이트 (스키마 호환)
            try {
                $pdo->prepare('UPDATE app_user SET name = ? WHERE id = ?')->execute([$name, $id]);
            } catch (\Throwable $e2) {
                return self::json($res, ['ok' => false, 'error' => '프로필 업데이트 실패: ' . $e2->getMessage()], 500);
            }
        }

        $updated = self::userByToken($token);
        return self::json($res, [
            'ok'   => true,
            'user' => $updated,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/logout
    // ─────────────────────────────────────────────────────────────
    public static function logout(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if ($token) {
            $who = self::userByToken($token);
            Db::pdo()->prepare('DELETE FROM user_session WHERE token = ?')->execute([$token]);
            if ($who) self::audit($req, 'logout', '로그아웃', 'low', $who);
        }
        return self::json($res, ['ok' => true]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/upgrade
    // Body: { plan: 'pro'|'demo', cycle: 'monthly'|'quarterly'|'yearly' }
    // 구독 기간 계산 후 subscription_expires_at 저장
    // ─────────────────────────────────────────────────────────────
    public static function upgrade(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }
        // 184차 Phase3b — 구독/플랜 변경은 owner 전용 (FE teamRolePolicy 'subscription'/'plan_change' 정합)
        [, $rbacErr] = self::requireTeamWrite($req, 'plan_change');
        if ($rbacErr) {
            return self::json($res, ['ok' => false, 'error' => $rbacErr[0]], $rbacErr[1]);
        }

        $body  = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        // 213차: starter/growth 도 정식 유료 플랜 → 화이트리스트 확장(기존엔 'pro' 로 붕괴됨).
        $plan  = in_array($body['plan'] ?? 'pro', ['starter', 'growth', 'pro', 'demo', 'enterprise'], true)
                 ? ($body['plan'] ?? 'pro') : 'pro';
        $cycle = in_array($body['cycle'] ?? 'monthly', ['monthly', 'quarterly', 'yearly'], true)
                 ? ($body['cycle'] ?? 'monthly') : 'monthly';

        // 구독 만료일 계산 (213차: 모든 유료 플랜 대상)
        $now = self::now();
        $expiresAt = null;
        if ($plan !== 'demo') {
            $days = match ($cycle) {
                'quarterly' => 90,
                'yearly'    => 365,
                default     => 30,  // monthly
            };
            $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + $days * 86400);
        }

        $id = $user['id'] ?? $user['idx'] ?? 0;
        $pdo = Db::pdo();

        // ── 213차 결제 게이팅 #2: 데모/free → 실운영(유료) 전환 시 전체 프로필 입력 강제 ──
        //   유료 플랜 활성화 전, 사업자 정보(회사명/사업자등록번호/대표자/연락처/주소) 완비 검증.
        //   미완 시 422 + missing_fields → 프론트가 전체정보 입력 폼을 띄운다.
        if ($plan !== 'demo') {
            $missing = self::liveProfileMissing((int)$id);
            if (!empty($missing)) {
                return self::json($res, [
                    'ok'             => false,
                    'error'          => '실운영 전환을 위해 회사 정보를 모두 입력해 주세요. (회사명·사업자등록번호·대표자·연락처·주소)',
                    'profile_incomplete' => true,
                    'missing_fields' => $missing,
                ], 422);
            }
        }

        // ── 204차 P0: 결제 우회 자가-업그레이드 차단 ──────────────────────────
        //   /auth/upgrade 는 결제 confirm(Payment::confirm = Toss API DONE 검증) 또는
        //   PG 웹훅이 plan 을 부여한 뒤 "로컬 상태 동기화"용으로만 호출되는 경로다
        //   (frontend PaymentSuccess.jsx: payment/confirm 성공 후 upgrade()).
        //   따라서 demo(다운그레이드)는 항상 허용하되, 유료(pro/enterprise)는
        //   검증된 결제 증거가 있어야만 부여한다. 증거 없으면 402.
        if ($plan !== 'demo') {
            $verified = false;
            // (1) confirm()/PG 가 기록한 성공 결제 내역
            try {
                $chk = $pdo->prepare(
                    "SELECT 1 FROM payment_history WHERE user_id=? AND plan=? AND status IN ('success','active','paid') LIMIT 1"
                );
                $chk->execute([$id, $plan]);
                if ($chk->fetchColumn()) $verified = true;
            } catch (\Throwable $e) { /* 테이블 부재 등 → 다음 단계 */ }
            // (2) 이미 검증된 서버 플로우(웹훅 등)가 동일 유료플랜/admin 을 부여해 둔 경우
            if (!$verified) {
                try {
                    $cur = $pdo->prepare("SELECT COALESCE(plans,plan,'demo') AS p FROM app_user WHERE id=?");
                    $cur->execute([$id]);
                    $curPlan = (string)$cur->fetchColumn();
                    if ($curPlan === $plan || $curPlan === 'admin') $verified = true;
                } catch (\Throwable $e) { /* ignore */ }
            }
            if (!$verified) {
                return self::json($res, [
                    'ok'    => false,
                    'error' => '결제 확인이 필요합니다. 결제를 완료한 후 다시 시도해 주세요.',
                ], 402);
            }
        }

        // 212차 #5: 자동 무료쿠폰 발급용 — 업데이트 전 직전 플랜 캡처(유료전환 여부 판정).
        $prevPlan = 'free';
        try { $pp = $pdo->prepare("SELECT COALESCE(plans,plan,'free') FROM app_user WHERE id=?"); $pp->execute([$id]); $prevPlan = strtolower((string)($pp->fetchColumn() ?: 'free')); } catch (\Throwable $e) {}

        // subscription_expires_at, subscription_cycle 컬럼 업데이트 시도
        try {
            // [현 차수 S-3] plans 컬럼 동반 갱신 — read 경로가 COALESCE(plans,plan)이라 plan만 쓰면
            //   plans 가 채워진 트라이얼/쿠폰 사용자는 업그레이드 후에도 구 플랜이 반환됨(다른 모든 플랜 mutation은 두 컬럼 다 씀).
            $pdo->prepare(
                'UPDATE app_user SET plan = ?, plans = ?, subscription_expires_at = ?, subscription_cycle = ? WHERE id = ?'
            )->execute([$plan, $plan, $expiresAt, $plan !== 'demo' ? $cycle : null, $id]);
        } catch (\Throwable $e) {
            // 컬럼이 없으면 plan(+plans) 만 업데이트 (idx 호환)
            try {
                $pdo->prepare('UPDATE app_user SET plan = ?, plans = ? WHERE id = ?')->execute([$plan, $plan, $id]);
            } catch (\Throwable $e2) {
                $pdo->prepare('UPDATE app_user SET plan = ? WHERE idx = ?')->execute([$plan, $id]);
            }
        }

        // 212차 #5b: 자동 무료쿠폰 — 가입 기간별 보너스(유료기간 소진 후 자동 연장 적용, silent fail).
        //   3개월 가입→0.5개월(15일) / 6개월→1.5개월(45일) / 1년→3개월(90일). 무료일수는 coupon_rules
        //   (term_3mo/term_6mo/term_12mo) 에서 admin 편집. 쿠폰 플랜=가입한 플랜. CouponEngine 이 현재
        //   만료일(유료기간 끝) 기준으로 연장 → "유료 개월수 소진 후" 무료 적용. 가입 기간당 1회.
        $autoCoupons = [];
        // 246차: 무료기간 쿠폰을 전 유료 플랜(Starter/Growth/Pro/Enterprise)으로 확장(기존 pro/ent만).
        //   "1년=3개월 무료" 비례: 1mo→7.5d·3mo→22.5d·6mo→45d·12mo→90d (coupon_rules term_*mo, admin 편집).
        if (in_array($plan, ['starter', 'growth', 'pro', 'enterprise'], true)) {
            $email = (string)($user['email'] ?? '');
            // 가입 기간(개월) — 검증으로 덮인 $cycle 대신 원본 body 에서 산출(semiAnnual/6개월 포함).
            $rawCycle = strtolower((string)($body['cycle'] ?? $cycle));
            $paidMonths = (int)($body['period_months'] ?? $body['months'] ?? 0);
            if ($paidMonths <= 0) {
                $paidMonths = match ($rawCycle) {
                    'quarterly' => 3, 'semiannual', 'semi_annual', 'halfyear' => 6,
                    'yearly', 'annual' => 12, 'monthly' => 1, default => 0,
                };
            }
            if (in_array($paidMonths, [1, 3, 6, 12], true)) {
                try {
                    // 기간 윈도우(가입 기간 내 1회) — 신규/갱신 모두 기간당 보너스 1회.
                    $r = \Genie\CouponEngine::fire($pdo, (int)$id, $email, "term_{$paidMonths}mo", $prevPlan, $plan, 0, $paidMonths * 30);
                    if ($r) $autoCoupons[] = $r;
                } catch (\Throwable $e) { /* 쿠폰 실패는 업그레이드를 깨지 않음 */ }
            }
        }
        // 보너스 적용으로 만료일이 연장됐을 수 있으니 최신 만료일 재조회
        if ($autoCoupons) {
            try { $ex = $pdo->prepare("SELECT subscription_expires_at FROM app_user WHERE id=?"); $ex->execute([$id]); $ne = $ex->fetchColumn(); if ($ne) $expiresAt = (string)$ne; } catch (\Throwable $e) {}
        }

        // 246차: 구독 이력(ledger) 기록 + 재가입 소급적용 — 이전 1개월 내 환불분의 ‘사용일’을 신규 구독에서 차감.
        $retroApplied = 0;
        if ($plan !== 'demo') {
            try {
                $unitPrice = (float)($body['amount'] ?? $body['price_usd'] ?? 0);
                [$expiresAt, $retroApplied] = self::recordSubscriptionStart($pdo, (int)$id, (string)($user['email'] ?? ''), $plan, $cycle, $expiresAt, $unitPrice);
            } catch (\Throwable $e) { /* ledger 실패는 업그레이드를 깨지 않음 */ }
        }

        // 응답용 사용자 정보
        $updatedUser = array_merge($user, [
            'plan'                    => $plan,
            'subscription_expires_at' => $expiresAt,
            'subscription_cycle'      => $plan !== 'demo' ? $cycle : null,
            'subscription_status'     => $plan !== 'demo' ? 'active' : 'none', // 213차: 모든 유료 플랜 active
        ]);

        $cycleLabel = match ($cycle) {
            'quarterly' => '3개월',
            'yearly'    => '1년',
            default     => '1개월',
        };
        $planLabel = ucfirst($plan);
        $msg = "🎉 {$planLabel} 플랜 {$cycleLabel} 구독이 시작되었습니다! 만료일: {$expiresAt}";
        // 212차 #5: 자동 무료 보너스 안내
        if ($autoCoupons) {
            $bonusDays = 0; foreach ($autoCoupons as $c) { $bonusDays += (int)($c['duration_days'] ?? 0); }
            if ($bonusDays > 0) $msg .= " 🎁 추가 " . (int)round($bonusDays / 30) . "개월 무료 보너스가 자동 적용되었습니다!";
        }
        // 246차: 재가입 소급 차감 안내
        if (!empty($retroApplied) && $retroApplied > 0) {
            $msg .= " ⏪ 직전 환불분 사용 {$retroApplied}일이 소급 적용(차감)되었습니다.";
        }

        // [현 차수] 불변 보안 감사 — 플랜 업그레이드 성공 기록(login 배선 패턴 동일 재사용).
        try { \Genie\SecurityAudit::log($pdo, (string)self::resolveTenantId($pdo, $user), (string)($user['email'] ?? ''), 'plan.upgrade', ['plan' => $plan, 'cycle' => $cycle], $req); } catch (\Throwable $e) {}

        return self::json($res, [
            'ok'   => true,
            'user' => $updatedUser,
            'msg'  => $msg,
            'auto_coupons' => $autoCoupons,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 246차: 구독 이력 ledger (환불 1개월 정책 + 재가입 소급적용 기반)
    // ─────────────────────────────────────────────────────────────
    /** subscription_ledger 런타임 보장 (MySQL/SQLite 양립 — AUTO_INCREMENT 드라이버 분기). */
    private static function ensureLedgerTable(\PDO $pdo): void
    {
        $driver = '';
        try { $driver = (string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME); } catch (\Throwable $e) {}
        $auto = $driver === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS subscription_ledger (
              id $auto,
              user_id INT NOT NULL,
              email VARCHAR(190),
              plan VARCHAR(30),
              cycle VARCHAR(20),
              unit_price DECIMAL(10,2) DEFAULT 0,
              started_at VARCHAR(32),
              expires_at VARCHAR(32),
              ended_at VARCHAR(32),
              used_days INT DEFAULT 0,
              refunded TINYINT DEFAULT 0,
              refund_amount DECIMAL(10,2) DEFAULT 0,
              retro_days_pending INT DEFAULT 0,
              retro_applied TINYINT DEFAULT 0,
              created_at VARCHAR(32)
            )"
        );
    }

    /** 신규 구독 기록 + 재가입 소급적용. 반환 [adjustedExpiresAt, retroDaysApplied]. */
    private static function recordSubscriptionStart(\PDO $pdo, int $userId, string $email, string $plan, string $cycle, ?string $expiresAt, float $unitPrice): array
    {
        self::ensureLedgerTable($pdo);
        $now = gmdate('Y-m-d\TH:i:s\Z');
        // 1) 직전 1개월 내 환불분의 미적용 사용일(소급 대상) 합산
        $retro = 0;
        try {
            $q = $pdo->prepare("SELECT COALESCE(SUM(retro_days_pending),0) FROM subscription_ledger WHERE user_id=? AND refunded=1 AND retro_applied=0");
            $q->execute([$userId]);
            $retro = (int)$q->fetchColumn();
        } catch (\Throwable $e) {}
        // 2) 소급분만큼 신규 만료일 차감(이미 사용·환불한 기간을 유료로 소급) + pending 소진 표시
        if ($retro > 0 && $expiresAt) {
            $ts = strtotime($expiresAt);
            if ($ts) {
                $expiresAt = gmdate('Y-m-d\TH:i:s\Z', $ts - $retro * 86400);
                try {
                    $pdo->prepare("UPDATE app_user SET subscription_expires_at=? WHERE id=?")->execute([$expiresAt, $userId]);
                    $pdo->prepare("UPDATE subscription_ledger SET retro_applied=1 WHERE user_id=? AND refunded=1 AND retro_applied=0")->execute([$userId]);
                } catch (\Throwable $e) {}
            }
        }
        // 3) 신규 구독 ledger 행
        try {
            $pdo->prepare("INSERT INTO subscription_ledger (user_id,email,plan,cycle,unit_price,started_at,expires_at,refunded,retro_applied,created_at) VALUES (?,?,?,?,?,?,?,0,0,?)")
                ->execute([$userId, $email, $plan, $cycle, $unitPrice, $now, $expiresAt, $now]);
        } catch (\Throwable $e) {}
        return [$expiresAt, $retro];
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/refund-request — 1개월 내 구독 취소 환불 (재가입 시 사용분 소급)
    // ─────────────────────────────────────────────────────────────
    public static function refundRequest(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        $user = self::userByToken($token);
        if (!$user) return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        // 구독 변경은 owner 전용(plan_change 정합)
        [, $rbacErr] = self::requireTeamWrite($req, 'plan_change');
        if ($rbacErr) return self::json($res, ['ok' => false, 'error' => $rbacErr[0]], $rbacErr[1]);

        $id  = (int)($user['id'] ?? $user['idx'] ?? 0);
        $pdo = Db::pdo();
        self::ensureLedgerTable($pdo);

        $row = null;
        try {
            $q = $pdo->prepare("SELECT * FROM subscription_ledger WHERE user_id=? AND refunded=0 ORDER BY id DESC LIMIT 1");
            $q->execute([$id]);
            $row = $q->fetch(\PDO::FETCH_ASSOC) ?: null;
        } catch (\Throwable $e) {}
        if (!$row) return self::json($res, ['ok' => false, 'error' => '환불 가능한 활성 구독이 없습니다.'], 404);

        $startTs  = strtotime((string)($row['started_at'] ?? ''));
        $usedDays = $startTs ? (int)floor((time() - $startTs) / 86400) : 0;
        $REFUND_WINDOW = 30; // 1개월
        if ($usedDays > $REFUND_WINDOW) {
            return self::json($res, ['ok' => false, 'error' => "구독 시작 후 30일이 지나 환불할 수 없습니다. (경과 {$usedDays}일)", 'used_days' => $usedDays], 403);
        }
        $unit         = (float)($row['unit_price'] ?? 0);
        $refundAmount = $unit; // 1개월 내 전액 환불(사용분은 재가입 시 소급 청구)
        try {
            $pdo->prepare("UPDATE subscription_ledger SET refunded=1, used_days=?, refund_amount=?, retro_days_pending=?, ended_at=? WHERE id=?")
                ->execute([$usedDays, $refundAmount, $usedDays, gmdate('Y-m-d\TH:i:s\Z'), (int)$row['id']]);
        } catch (\Throwable $e) {}
        // 구독 해지 → demo 다운그레이드
        try {
            $pdo->prepare("UPDATE app_user SET plan='demo', plans='demo', subscription_expires_at=NULL, subscription_cycle=NULL WHERE id=?")->execute([$id]);
        } catch (\Throwable $e) {
            try { $pdo->prepare("UPDATE app_user SET plan='demo' WHERE idx=?")->execute([$id]); } catch (\Throwable $e2) {}
        }
        try { \Genie\SecurityAudit::log($pdo, (string)self::resolveTenantId($pdo, $user), (string)($user['email'] ?? ''), 'plan.refund', ['used_days' => $usedDays, 'refund' => $refundAmount], $req); } catch (\Throwable $e) {}

        return self::json($res, [
            'ok'                 => true,
            'refunded'           => true,
            'used_days'          => $usedDays,
            'refund_amount'      => $refundAmount,
            'retro_days_pending' => $usedDays,
            'msg'                => "환불 처리되었습니다. (사용 {$usedDays}일, 환불액 \${$refundAmount}) 재가입 시 사용 {$usedDays}일이 신규 구독에 소급 적용됩니다.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/subscription
    // 현재 구독 상태 상세 조회
    // ─────────────────────────────────────────────────────────────
    public static function subscription(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        $expiresAt = $user['subscription_expires_at'] ?? null;
        $daysLeft  = null;
        if ($expiresAt) {
            $ts = strtotime($expiresAt);
            $daysLeft = max(0, (int)ceil(($ts - time()) / 86400));
        }

        return self::json($res, [
            'ok' => true,
            'subscription' => [
                'plan'       => $user['plan'],
                'status'     => $user['subscription_status'] ?? 'none',
                'cycle'      => $user['subscription_cycle'] ?? null,
                'expires_at' => $expiresAt,
                'days_left'  => $daysLeft,
                'is_pro'     => in_array($user['plan'], ['pro', 'admin', 'enterprise']),
            ],
        ]);
    }



    // ─────────────────────────────────────────────────────────────
    // GET /auth/plan-check
    // 현재 토큰의 플랜 정보 + 접근 가능 기능 목록 반환
    // ─────────────────────────────────────────────────────────────
    public static function planCheck(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        $plan = $user['plan'];
        $rank = ['demo' => 0, 'pro' => 1, 'enterprise' => 2, 'admin' => 3];
        $userRank = $rank[$plan] ?? 0;

        // 기능별 접근 여부
        $features = [
            'crm'             => ['plan' => 'pro',  'access' => $userRank >= 1],
            'email_marketing' => ['plan' => 'pro',  'access' => $userRank >= 1],
            'kakao_channel'   => ['plan' => 'pro',  'access' => $userRank >= 1],
            'pixel_tracking'  => ['plan' => 'pro',  'access' => $userRank >= 1],
            'journey_builder' => ['plan' => 'pro',  'access' => $userRank >= 1],
            'customer_ai'     => ['plan' => 'pro',  'access' => $userRank >= 1],
            'ab_testing'      => ['plan' => 'pro',  'access' => $userRank >= 1],
            'sms'             => ['plan' => 'pro',  'access' => $userRank >= 1],
            'api_access'      => ['plan' => 'enterprise', 'access' => $userRank >= 2],
            'white_label'     => ['plan' => 'enterprise', 'access' => $userRank >= 2],
            'admin_panel'     => ['plan' => 'admin', 'access' => $userRank >= 3],
        ];

        $expiresAt = $user['subscription_expires_at'] ?? null;
        $daysLeft  = null;
        if ($expiresAt) {
            $daysLeft = max(0, (int)ceil((strtotime($expiresAt) - time()) / 86400));
        }

        return self::json($res, [
            'ok'       => true,
            'plan'     => $plan,
            'rank'     => $userRank,
            'is_pro'   => $userRank >= 1,
            'features' => $features,
            'subscription' => [
                'status'     => $user['subscription_status'] ?? 'none',
                'cycle'      => $user['subscription_cycle'] ?? null,
                'expires_at' => $expiresAt,
                'days_left'  => $daysLeft,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/license
    // Body: { license_key: "GENIE-XXXX-XXXX-XXXX" }
    // 라이선스 키 검증 후 enterprise 플랜 + 10년 구독 부여
    // ─────────────────────────────────────────────────────────────
    public static function activateLicense(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }
        // 184차 Phase3b — 라이선스 활성화(플랜 변경)는 owner 전용 (FE teamRolePolicy 'plan_change' 정합)
        [, $rbacErr] = self::requireTeamWrite($req, 'plan_change');
        if ($rbacErr) {
            return self::json($res, ['ok' => false, 'error' => $rbacErr[0]], $rbacErr[1]);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        $licenseKey = trim((string)($body['license_key'] ?? ''));
        if (!$licenseKey) {
            return self::json($res, ['ok' => false, 'error' => '라이선스 키를 입력해주세요.'], 422);
        }

        // 213차 결제 게이팅 #2: 라이선스 기반 실운영(enterprise) 활성화도 전체 프로필 입력 강제.
        $missingProf = self::liveProfileMissing((int)($user['id'] ?? 0));
        if (!empty($missingProf)) {
            return self::json($res, [
                'ok'             => false,
                'error'          => '실운영 전환을 위해 회사 정보를 모두 입력해 주세요. (회사명·사업자등록번호·대표자·연락처·주소)',
                'profile_incomplete' => true,
                'missing_fields' => $missingProf,
            ], 422);
        }

        $pdo = Db::pdo();
        $keyHash = hash('sha256', $licenseKey);
        $now = self::now();
        $userId = (int)($user['id'] ?? 0);
        $valid = false;
        $licenseId = null;
        $licensePlan = 'enterprise';
        $licenseExpiry = gmdate('Y-m-d\TH:i:s\Z', time() + 3650 * 86400); // 10년

        // 1) license_key 테이블 검증 (테이블이 있는 경우)
        try {
            $stmt = $pdo->prepare(
                'SELECT * FROM license_key WHERE key_hash = ? AND is_active = 1 LIMIT 1'
            );
            $stmt->execute([$keyHash]);
            $lrow = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($lrow) {
                // 이미 사용된 키인지 확인
                if (!empty($lrow['used_by']) && (int)$lrow['used_by'] !== $userId) {
                    return self::json($res, ['ok' => false, 'error' => '이미 다른 계정에서 활성화된 키입니다.'], 409);
                }
                $valid = true;
                $licenseId = $lrow['id'];
                if (!empty($lrow['plan'])) $licensePlan = $lrow['plan'];
                if (!empty($lrow['expires_at'])) {
                    // 라이선스 키에 만료일이 있으면 그것 사용, 없으면 10년
                    $licenseExpiry = $lrow['expires_at'];
                }
                // 키 사용 처리
                try {
                    $pdo->prepare(
                        'UPDATE license_key SET used_by=?, used_at=?, use_count=COALESCE(use_count,0)+1 WHERE id=?'
                    )->execute([$userId, $now, $licenseId]);
                } catch (\Throwable $e) { /* non-fatal */ }
            }
        } catch (\Throwable $e) {
            // license_key 테이블 없음 — 환경변수 마스터키로 폴백
        }

        // 2) 환경변수 마스터 키 검증 (테이블 무관하게 항상 유효)
        if (!$valid) {
            $masterKeys = array_filter(array_map('trim', explode(',',
                getenv('GENIE_LICENSE_KEYS') ?: ''
            )));
            if (!empty($masterKeys) && in_array($licenseKey, $masterKeys, true)) {
                $valid = true;
            }
        }

        // 189차+ 보안: 소스 하드코딩 내장 라이선스 키(GENIE-FULL-2026-ENTERPRISE 등) 제거 —
        //   깃 소스만 알면 누구나 enterprise 무료 활성화 가능했던 백도어. 이제 DB license_key 또는
        //   env(GENIE_LICENSE_KEYS) 등록 키만 허용한다.

        if (!$valid) {
            return self::json($res, ['ok' => false, 'error' => '유효하지 않은 라이선스 키입니다.'], 422);
        }

        // DB: 사용자 플랜 enterprise로 업그레이드
        try {
            // plans 또는 plan 컬럼으로 시도
            try {
                $pdo->prepare(
                    "UPDATE app_user SET plan='enterprise', plans='enterprise',
                     subscription_expires_at=?, subscription_cycle='license',
                     updated_at=? WHERE id=?"
                )->execute([$licenseExpiry, $now, $userId]);
            } catch (\Throwable $e) {
                $pdo->prepare(
                    "UPDATE app_user SET plan='enterprise',
                     subscription_expires_at=?, subscription_cycle='license',
                     updated_at=? WHERE id=?"
                )->execute([$licenseExpiry, $now, $userId]);
            }
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 업데이트 실패: ' . $e->getMessage()], 500);
        }

        // 갱신된 사용자 정보 반환
        $updatedUser = [
            'id'                      => $userId,
            'email'                   => $user['email'] ?? '',
            'name'                    => $user['name'] ?? '',
            'plan'                    => $licensePlan,
            'company'                 => $user['company'] ?? '',
            'subscription_status'     => 'active',
            'subscription_expires_at' => $licenseExpiry,
            'subscription_cycle'      => 'license',
        ];

        // [현 차수] 불변 보안 감사 — 라이선스 활성화 성공 기록(login 배선 패턴 동일 재사용).
        try { \Genie\SecurityAudit::log($pdo, (string)self::resolveTenantId($pdo, $user), (string)($user['email'] ?? ''), 'plan.license_activate', ['plan' => $licensePlan, 'expires_at' => $licenseExpiry], $req); } catch (\Throwable $e) {}

        return self::json($res, [
            'ok'           => true,
            'message'      => '🎉 라이선스가 성공적으로 활성화되었습니다! 모든 기능이 해제되었습니다.',
            'plan'         => $licensePlan,
            'expires_at'   => $licenseExpiry,
            'user'         => $updatedUser,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/license/list
    // Admin 전용 — 라이선스 키 목록 조회
    // ─────────────────────────────────────────────────────────────
    public static function listLicenseKeys(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user || ($user['plan'] ?? '') !== 'admin') {
            return self::json($res, ['ok' => false, 'error' => '관리자 전용 기능입니다.'], 403);
        }

        $pdo = Db::pdo();
        try {
            $stmt = $pdo->query(
                'SELECT lk.id, lk.key_display, lk.plan, lk.expires_at, lk.is_active,
                        lk.used_at, lk.use_count, lk.created_at,
                        u.email AS used_by_email, u.name AS used_by_name
                   FROM license_key lk
                   LEFT JOIN app_user u ON u.id = lk.used_by
                   ORDER BY lk.created_at DESC LIMIT 200'
            );
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // license_key 테이블이 없는 경우 빈 배열 반환
            $rows = [];
        }

        return self::json($res, ['ok' => true, 'licenses' => $rows]);
    }

    // ═════════════════════════════════════════════════════════════
    // 188차+ 계정 자기관리: 비밀번호 변경 / 아이디(이메일) 찾기 / 비밀번호 재설정
    //   POST /auth/change-password  (인증) 현재비번 검증 → 변경
    //   POST /auth/find-id          (공개) 이름+전화 → 마스킹 이메일
    //   POST /auth/forgot-password  (공개) 이메일+이름(+전화) 본인확인 → reset_token
    //   POST /auth/reset-password   (공개) reset_token → 새 비밀번호
    //   ※ 신뢰가능한 이메일 발송 인프라 부재(@mail best-effort) → 이메일 링크 대신 본인확인 기반.
    // ═════════════════════════════════════════════════════════════
    private static function readBody(ServerRequestInterface $req): array
    {
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        return $body;
    }

    private static function maskEmail(string $email): string
    {
        $at = strpos($email, '@');
        if ($at === false) return $email;
        $local = substr($email, 0, $at);
        $domain = substr($email, $at);
        $len = max(1, mb_strlen($local));
        $keep = min(2, max(1, $len - 1));
        return mb_substr($local, 0, $keep) . str_repeat('*', max(2, $len - $keep)) . $domain;
    }

    private static function ensureResetSchema(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS password_reset (token VARCHAR(80) PRIMARY KEY, user_id INT NOT NULL, expires_at VARCHAR(32) NOT NULL, created_at VARCHAR(32) NOT NULL)");
        } catch (\Throwable $e) { /* best-effort */ }
    }

    public static function changePassword(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = (string)(self::extractToken($req) ?? '');
        $user  = self::userByToken($token);
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $b   = self::readBody($req);
        $cur = (string)($b['current_password'] ?? '');
        $new = (string)($b['new_password'] ?? '');
        if (($pwErr = self::passwordPolicyError($new)) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422); // 189차 비번정책 강화
        $pdo = Db::pdo();
        try {
            $st = $pdo->prepare('SELECT password_hash, password_hashs, password FROM app_user WHERE id=?');
            $st->execute([$user['id']]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            $st = $pdo->prepare('SELECT password_hash FROM app_user WHERE id=?');
            $st->execute([$user['id']]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        }
        $hash = $row['password_hashs'] ?? $row['password_hash'] ?? $row['password'] ?? '';
        if ($hash === '' || !password_verify($cur, (string)$hash)) {
            return self::json($res, ['ok' => false, 'error' => '현재 비밀번호가 올바르지 않습니다.'], 400);
        }
        if (password_verify($new, (string)$hash)) {
            return self::json($res, ['ok' => false, 'error' => '새 비밀번호가 기존 비밀번호와 동일합니다.'], 400);
        }
        $pdo->prepare('UPDATE app_user SET password_hash=?, password_hashs=NULL WHERE id=?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
        // 보안: 비번 변경 시 현재 세션을 제외한 다른 세션 무효화
        try { $pdo->prepare('DELETE FROM user_session WHERE user_id=? AND token<>?')->execute([$user['id'], $token]); } catch (\Throwable $e) {}
        self::audit($req, 'password_change', '비밀번호 변경', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => '비밀번호가 변경되었습니다.']);
    }

    // 189차+ 보안: 계정복구 엔드포인트(find-id/forgot/reset) IP 기준 throttle — 본인확인 정보 무차별 추측·계정 열거 방어.
    //   모든 시도를 카운트(15분窓 8회 초과 시 잠금). null=허용, int=남은 잠금 초.
    private static function recoveryThrottle(ServerRequestInterface $req): ?int
    {
        $pdo = Db::pdo();
        $ident = 'recovery|' . self::clientIp($req);
        $ra = self::rateLimitRetryAfter($pdo, $ident);
        if ($ra !== null) return $ra;
        self::rateLimitFail($pdo, $ident);
        return null;
    }

    public static function findId(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (($ra = self::recoveryThrottle($req)) !== null) return self::json($res, ['ok' => false, 'error' => '시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'retry_after' => $ra], 429);
        $b = self::readBody($req);
        $name  = trim((string)($b['name'] ?? ''));
        $phone = trim((string)($b['phone'] ?? ''));
        if ($name === '' || $phone === '') return self::json($res, ['ok' => false, 'error' => '이름과 전화번호를 입력하세요.'], 422);
        $pdo = Db::pdo();
        try {
            $st = $pdo->prepare('SELECT email, created_at FROM app_user WHERE name=? AND phone=? AND is_active=1 ORDER BY id LIMIT 5');
            $st->execute([$name, $phone]); $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { $rows = []; }
        if (!$rows) return self::json($res, ['ok' => false, 'error' => '일치하는 계정을 찾을 수 없습니다.'], 404);
        $out = array_map(fn($r) => ['email' => self::maskEmail((string)$r['email']), 'joined' => substr((string)($r['created_at'] ?? ''), 0, 10)], $rows);
        return self::json($res, ['ok' => true, 'accounts' => $out]);
    }

    public static function forgotPassword(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (($ra = self::recoveryThrottle($req)) !== null) return self::json($res, ['ok' => false, 'error' => '시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'retry_after' => $ra], 429);
        $b = self::readBody($req);
        $email = trim(strtolower((string)($b['email'] ?? '')));
        $name  = trim((string)($b['name'] ?? ''));
        $phone = trim((string)($b['phone'] ?? ''));
        if ($email === '' || $name === '') return self::json($res, ['ok' => false, 'error' => '이메일과 이름을 입력하세요.'], 422);
        $pdo = Db::pdo(); self::ensureResetSchema($pdo);
        try {
            $st = $pdo->prepare('SELECT id, name, phone FROM app_user WHERE LOWER(email)=? AND is_active=1 LIMIT 1');
            $st->execute([$email]); $u = $st->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $st = $pdo->prepare('SELECT id, name FROM app_user WHERE LOWER(email)=? AND is_active=1 LIMIT 1');
            $st->execute([$email]); $u = $st->fetch(\PDO::FETCH_ASSOC);
        }
        $nameOk  = $u && (trim((string)($u['name'] ?? '')) === $name);
        $dbPhone = trim((string)($u['phone'] ?? ''));
        $phoneOk = ($dbPhone === '') ? true : ($phone === $dbPhone); // 계정에 전화 등록 시 일치 필요
        if (!$u || !$nameOk || !$phoneOk) {
            return self::json($res, ['ok' => false, 'error' => '본인확인 정보가 일치하지 않습니다. 이메일·이름·전화번호를 확인하세요.'], 400);
        }
        $rtok = self::generateToken();
        $now  = self::now();
        $exp  = gmdate('Y-m-d\TH:i:s\Z', time() + 900); // 15분
        try { $pdo->prepare('DELETE FROM password_reset WHERE user_id=? OR expires_at<?')->execute([$u['id'], $now]); } catch (\Throwable $e) {}
        $pdo->prepare('INSERT INTO password_reset(token,user_id,expires_at,created_at) VALUES(?,?,?,?)')->execute([$rtok, $u['id'], $exp, $now]);
        self::audit($req, 'password_reset_request', '비밀번호 재설정 본인확인 통과: ' . $email, 'high', $u + ['email' => $email]);

        // 190차+203차: 재설정 링크를 이메일(SMTP) + 문자(네이버 SENS) 로 발송하고 응답에서 토큰 제거.
        //   둘 다 미설정/실패 시 기존 본인확인 기반(인라인 토큰) 폴백(무회귀).
        $link = 'https://www.genieroi.com/login?reset=' . urlencode($rtok);
        $emailSent = false; $smsSent = false;
        if (\Genie\Mailer::isConfigured($pdo)) {
            $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
            $body = \Genie\Mailer::wrapHtml(
                '비밀번호 재설정 안내',
                "<p>안녕하세요 {$safeName}님,</p>"
                . "<p>비밀번호 재설정 요청을 접수했습니다. 아래 버튼을 눌러 새 비밀번호를 설정하세요.</p>"
                . "<p style=\"color:#e67e22;font-weight:600\">이 링크는 15분간만 유효합니다.</p>"
                . "<p style=\"color:#999;font-size:12px\">본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.</p>",
                '새 비밀번호 설정',
                $link
            );
            $mr = \Genie\Mailer::send($email, '[Geniego-ROI] 비밀번호 재설정 안내', $body, ['pdo' => $pdo]);
            $emailSent = !empty($mr['ok']);
        }
        // 203차: SMS(네이버 SENS) — 계정에 전화 등록 + SMS 설정 시 재설정 링크 문자 발송.
        if ($dbPhone !== '' && \Genie\NaverSms::isConfigured($pdo)) {
            $sr = \Genie\NaverSms::sendPlatform($pdo, $dbPhone, "[GeniegoROI] 비밀번호 재설정 링크(15분 유효): {$link}");
            $smsSent = !empty($sr['ok']);
        }
        if ($emailSent || $smsSent) {
            $ch = [];
            if ($emailSent) $ch[] = '이메일';
            if ($smsSent)   $ch[] = '문자(SMS)';
            return self::json($res, ['ok' => true, 'email_sent' => $emailSent, 'sms_sent' => $smsSent,
                'message' => implode('·', $ch) . '(으)로 비밀번호 재설정 링크를 보냈습니다. (15분 유효)']);
        }
        // 폴백: 이메일·SMS 인프라 미설정/발송실패 → 본인확인 기반 인라인 재설정(토큰 반환)
        return self::json($res, ['ok' => true, 'reset_token' => $rtok, 'email_sent' => false, 'sms_sent' => false, 'message' => '본인확인이 완료되었습니다. 새 비밀번호를 설정하세요.']);
    }

    public static function resetPassword(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (($ra = self::recoveryThrottle($req)) !== null) return self::json($res, ['ok' => false, 'error' => '시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'retry_after' => $ra], 429);
        $b   = self::readBody($req);
        $tok = (string)($b['reset_token'] ?? '');
        $new = (string)($b['new_password'] ?? '');
        if ($tok === '') return self::json($res, ['ok' => false, 'error' => '재설정 토큰이 없습니다.'], 400);
        if (($pwErr = self::passwordPolicyError($new)) !== null) return self::json($res, ['ok' => false, 'error' => $pwErr], 422); // 189차 비번정책 강화
        $pdo = Db::pdo(); self::ensureResetSchema($pdo);
        $now = self::now();
        try { $pdo->prepare('DELETE FROM password_reset WHERE expires_at<?')->execute([$now]); } catch (\Throwable $e) {}
        $st = $pdo->prepare('SELECT user_id FROM password_reset WHERE token=? AND expires_at>?');
        $st->execute([$tok, $now]); $uid = $st->fetchColumn();
        if (!$uid) return self::json($res, ['ok' => false, 'error' => '재설정 세션이 만료되었습니다. 다시 시도하세요.'], 401);
        $pdo->prepare('UPDATE app_user SET password_hash=?, password_hashs=NULL WHERE id=?')->execute([password_hash($new, PASSWORD_DEFAULT), $uid]);
        $pdo->prepare('DELETE FROM password_reset WHERE token=?')->execute([$tok]);
        try { $pdo->prepare('DELETE FROM user_session WHERE user_id=?')->execute([$uid]); } catch (\Throwable $e) {} // 전 세션 무효화
        self::audit($req, 'password_reset', '비밀번호 재설정 완료', 'high', ['id' => (int)$uid]);
        return self::json($res, ['ok' => true, 'message' => '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인하세요.']);
    }

    // ═════════════════════════════════════════════════════════════
    // 188차 관리자 보안강화 — 접속키(access key) 서버 저장·검증·회전
    //   POST /auth/admin/verify-access-key {access_key}            (공개) 게이트 검증
    //   POST /auth/admin/access-key {current_password,new_access_key} (인증·admin) 접속키 변경
    //   ※ 미설정 시 기본 'GENIEGO-ADMIN'(하위호환). 변경 후엔 해시 검증만 통과.
    // ═════════════════════════════════════════════════════════════
    private static function ensureAppSetting(\PDO $pdo): void
    {
        // SSOT: 전역 KV 스토어 단일 정의(Db::ensureAppSetting) — PDO 별 멱등 보장
        Db::ensureAppSetting($pdo);
    }

    private static function getAppSetting(\PDO $pdo, string $k): string
    {
        try {
            $s = $pdo->prepare('SELECT svalue FROM app_setting WHERE skey=?');
            $s->execute([$k]);
            $v = $s->fetchColumn();
            return $v === false ? '' : (string)$v;
        } catch (\Throwable $e) { return ''; }
    }

    private static function setAppSetting(\PDO $pdo, string $k, string $v): void
    {
        $now = self::now();
        try {
            $ex = $pdo->prepare('SELECT 1 FROM app_setting WHERE skey=?'); $ex->execute([$k]);
            if ($ex->fetchColumn()) {
                $pdo->prepare('UPDATE app_setting SET svalue=?, updated_at=? WHERE skey=?')->execute([$v, $now, $k]);
            } else {
                $pdo->prepare('INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?)')->execute([$k, $v, $now]);
            }
        } catch (\Throwable $e) { /* best-effort */ }
    }

    private static function verifyAdminAccessKey(\PDO $pdo, string $key): bool
    {
        $hash = self::getAppSetting($pdo, 'admin_access_key_hash');
        if ($hash !== '') return password_verify($key, $hash); // 회전됨 → 엄격 검증
        // 미회전(기본) 상태: 하위호환 — 기본값 'GENIEGO-ADMIN' 또는 빈 값 허용(구 프론트 무파손, 락아웃 방지).
        // 관리자가 접속키를 한 번 변경하면 이후부터 엄격 검증된다.
        return $key === '' || strcasecmp(trim($key), 'GENIEGO-ADMIN') === 0;
    }

    public static function verifyAdminKey(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $b = self::readBody($req);
        $key = trim((string)($b['access_key'] ?? $b['code'] ?? ''));
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        if ($key === '' || !self::verifyAdminAccessKey($pdo, $key)) {
            return self::json($res, ['ok' => false, 'error' => '접속키가 올바르지 않습니다.'], 403);
        }
        return self::json($res, ['ok' => true]);
    }

    public static function adminChangeAccessKey(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        if (($user['plan'] ?? '') !== 'admin') return self::json($res, ['ok' => false, 'error' => '관리자만 변경할 수 있습니다.'], 403);
        $pdo = Db::pdo();
        // [현 차수] 접속코드는 모든 관리자가 공유 → 하위 관리자는 변경 불가(최고관리자만 회전).
        //   ★방어적 재조회: userByToken 폴백 경로가 admin_level 을 누락할 수 있어, DB 에서 직접 확인한다.
        $lv = (string)($user['admin_level'] ?? '');
        try { $ls = $pdo->prepare('SELECT admin_level FROM app_user WHERE id=?'); $ls->execute([$user['id']]); $lv = (string)($ls->fetchColumn() ?: ''); } catch (\Throwable $e) {}
        if ($lv === 'sub') return self::json($res, ['ok' => false, 'error' => '하위 관리자는 접속코드를 변경할 수 없습니다.'], 403);
        $b = self::readBody($req);
        $cur    = (string)($b['current_password'] ?? '');
        $newKey = trim((string)($b['new_access_key'] ?? ''));
        if (mb_strlen($newKey) < 6) return self::json($res, ['ok' => false, 'error' => '접속키는 6자 이상이어야 합니다.'], 422);
        $st = $pdo->prepare('SELECT password_hash, password_hashs FROM app_user WHERE id=?');
        $st->execute([$user['id']]);
        $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        $hash = $row['password_hashs'] ?? $row['password_hash'] ?? '';
        if ($hash === '' || !password_verify($cur, (string)$hash)) {
            return self::json($res, ['ok' => false, 'error' => '현재 비밀번호가 올바르지 않습니다.'], 400);
        }
        self::ensureAppSetting($pdo);
        $now = self::now();
        $kh  = password_hash($newKey, PASSWORD_DEFAULT);
        if (self::getAppSetting($pdo, 'admin_access_key_hash') !== '') {
            $pdo->prepare('UPDATE app_setting SET svalue=?, updated_at=? WHERE skey=?')->execute([$kh, $now, 'admin_access_key_hash']);
        } else {
            $pdo->prepare('INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?)')->execute(['admin_access_key_hash', $kh, $now]);
        }
        self::audit($req, 'admin_access_key_change', '관리자 접속키 변경', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => '관리자 접속키가 변경되었습니다.']);
    }

    // ── 196차 #3 — 플랫폼 SMTP 설정(관리자) : MFA OTP·비번재설정 메일 발송 인프라 ──
    //   app_setting smtp_* 에 저장 → Mailer 가 tenant=null(플랫폼) 발송 시 우선 사용.
    private static function requireAdminUser(ServerRequestInterface $req)
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return [null, ['인증이 필요합니다.', 401]];
        if ((($user['plan'] ?? '') !== 'admin') && (($user['plans'] ?? '') !== 'admin')) return [null, ['관리자만 접근할 수 있습니다.', 403]];
        return [$user, null];
    }

    /** GET /auth/admin/smtp — 현재 SMTP 설정(비밀번호 마스킹). */
    public static function smtpGet(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $g = fn($k) => self::getAppSetting($pdo, $k);
        $pass = $g('smtp_pass');
        $configured = false; try { $configured = \Genie\Mailer::isConfigured($pdo); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'smtp' => [
            'host' => $g('smtp_host'),
            'port' => $g('smtp_port') !== '' ? (int)$g('smtp_port') : 587,
            'user' => $g('smtp_user'),
            'pass_set' => $pass !== '',         // 비밀번호 자체는 미반환(설정 여부만)
            'from' => $g('smtp_from') !== '' ? $g('smtp_from') : 'geniegoroi@ociell.com',
            'from_name' => $g('smtp_from_name') !== '' ? $g('smtp_from_name') : 'Geniego-ROI',
            'secure' => $g('smtp_secure') !== '' ? $g('smtp_secure') : 'tls',
        ], 'configured' => $configured]);
    }

    /** POST /auth/admin/smtp — SMTP 설정 저장. pass 는 비워두면 기존 유지. */
    public static function smtpSave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $host = trim((string)($b['host'] ?? ''));
        $from = trim((string)($b['from'] ?? ''));
        if ($host === '') return self::json($res, ['ok' => false, 'error' => 'SMTP 호스트를 입력하세요.'], 422);
        if ($from === '' || !filter_var($from, FILTER_VALIDATE_EMAIL)) return self::json($res, ['ok' => false, 'error' => '발신 이메일 주소가 올바르지 않습니다.'], 422);
        self::setAppSetting($pdo, 'smtp_host', $host);
        self::setAppSetting($pdo, 'smtp_port', (string)((int)($b['port'] ?? 587)));
        self::setAppSetting($pdo, 'smtp_user', trim((string)($b['user'] ?? '')));
        // 203차: SMTP 비밀번호 은행급 암호화 저장(AES-256-GCM). 빈값=기존 유지. (평문 저장 갭 해소)
        if (isset($b['pass']) && (string)$b['pass'] !== '') self::setAppSetting($pdo, 'smtp_pass', \Genie\Crypto::encrypt((string)$b['pass']));
        self::setAppSetting($pdo, 'smtp_from', $from);
        self::setAppSetting($pdo, 'smtp_from_name', trim((string)($b['from_name'] ?? 'Geniego-ROI')));
        $secure = (string)($b['secure'] ?? 'tls');
        self::setAppSetting($pdo, 'smtp_secure', in_array($secure, ['tls','ssl','none',''], true) ? $secure : 'tls');
        self::audit($req, 'smtp_config', 'SMTP 설정 변경', 'high', $user);
        $configured = false; try { $configured = \Genie\Mailer::isConfigured($pdo); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'message' => 'SMTP 설정이 저장되었습니다.', 'configured' => $configured]);
    }

    /** POST /auth/admin/smtp/test {to} — 테스트 메일 발송. */
    public static function smtpTest(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $to = trim((string)($b['to'] ?? ($user['email'] ?? '')));
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) return self::json($res, ['ok' => false, 'error' => '수신 이메일 주소가 올바르지 않습니다.'], 422);
        if (!\Genie\Mailer::isConfigured($pdo)) return self::json($res, ['ok' => false, 'error' => 'SMTP가 아직 설정되지 않았습니다. 먼저 설정을 저장하세요.'], 400);
        $html = \Genie\Mailer::wrapHtml('SMTP 테스트 메일', '<p>Geniego-ROI SMTP 설정이 정상 동작합니다. 이 메일이 수신되면 이메일 발송 인프라가 준비되었습니다.</p>');
        $r = \Genie\Mailer::send($to, '[Geniego-ROI] SMTP 테스트 메일', $html, ['pdo' => $pdo]);
        if (empty($r['ok'])) return self::json($res, ['ok' => false, 'error' => '발송 실패: ' . (string)($r['error'] ?? '알 수 없는 오류')], 502);
        return self::json($res, ['ok' => true, 'message' => "{$to} 로 테스트 메일을 보냈습니다. 메일함(스팸 포함)을 확인하세요."]);
    }

    // ── 203차 — 네이버 SENS SMS 설정(관리자) : 비밀번호찾기·MFA OTP 문자 발송 ──
    //   app_setting sms_* 에 저장(secret_key 는 Crypto 암호화) → NaverSms 가 플랫폼 발송 시 사용.
    /** GET /auth/admin/sms — 현재 SMS(네이버 SENS) 설정(시크릿 마스킹). */
    public static function smsGet(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $g = fn($k) => self::getAppSetting($pdo, $k);
        $configured = false; try { $configured = \Genie\NaverSms::isConfigured($pdo); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'sms' => [
            'provider'   => 'naver',
            'access_key' => $g('sms_access_key'),
            'service_id' => $g('sms_service_id'),
            'from'       => $g('sms_from'),
            'secret_set' => $g('sms_secret_key') !== '',   // 시크릿 자체 미반환(설정 여부만)
        ], 'configured' => $configured]);
    }

    /** POST /auth/admin/sms — SMS 설정 저장. secret_key 비우면 기존 유지(암호화 저장). */
    public static function smsSave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $accessKey = trim((string)($b['access_key'] ?? ''));
        $serviceId = trim((string)($b['service_id'] ?? ''));
        $from      = preg_replace('/[^0-9]/', '', (string)($b['from'] ?? ''));
        if ($accessKey === '' || $serviceId === '') return self::json($res, ['ok' => false, 'error' => 'Access Key 와 Service ID 를 입력하세요.'], 422);
        if ($from === '') return self::json($res, ['ok' => false, 'error' => '발신번호를 입력하세요(네이버에 사전 등록된 번호).'], 422);
        self::setAppSetting($pdo, 'sms_provider', 'naver');
        self::setAppSetting($pdo, 'sms_access_key', $accessKey);
        self::setAppSetting($pdo, 'sms_service_id', $serviceId);
        self::setAppSetting($pdo, 'sms_from', $from);
        // 203차: SENS secret key 은행급 암호화 저장(AES-256-GCM). 빈값=기존 유지.
        if (isset($b['secret_key']) && (string)$b['secret_key'] !== '') self::setAppSetting($pdo, 'sms_secret_key', \Genie\Crypto::encrypt((string)$b['secret_key']));
        self::audit($req, 'sms_config', '네이버 SMS 설정 변경', 'high', $user);
        $configured = false; try { $configured = \Genie\NaverSms::isConfigured($pdo); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'message' => 'SMS 설정이 저장되었습니다.', 'configured' => $configured]);
    }

    /** POST /auth/admin/sms/test {to} — 테스트 SMS 발송. */
    public static function smsTest(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $to = preg_replace('/[^0-9]/', '', (string)($b['to'] ?? ''));
        if ($to === '') return self::json($res, ['ok' => false, 'error' => '수신 휴대폰 번호를 입력하세요.'], 422);
        if (!\Genie\NaverSms::isConfigured($pdo)) return self::json($res, ['ok' => false, 'error' => 'SMS가 아직 설정되지 않았습니다. 먼저 설정을 저장하세요.'], 400);
        $r = \Genie\NaverSms::sendPlatform($pdo, $to, '[GeniegoROI] SMS 테스트 발송 — 설정이 정상 동작합니다.');
        if (empty($r['ok'])) return self::json($res, ['ok' => false, 'error' => '발송 실패: ' . (string)($r['detail'] ?? '알 수 없는 오류')], 502);
        return self::json($res, ['ok' => true, 'message' => "{$to} 로 테스트 SMS를 보냈습니다."]);
    }

    // ── 196차 — 플랫폼 AI(Claude/Anthropic) API 키 설정(관리자). 실 AI 디자인·분석 활성화. ──
    /** GET /auth/admin/ai-key — Claude 키 설정 여부(키 자체 미반환). */
    public static function aiKeyGet(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $set = self::getAppSetting($pdo, 'claude_api_key') !== '';
        $configured = false; try { $configured = \Genie\Handlers\ClaudeAI::aiKeyConfigured(); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'key_set' => $set, 'configured' => $configured]);
    }

    /** POST /auth/admin/ai-key {api_key} — Claude(Anthropic) API 키 저장. */
    public static function aiKeySave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $key = trim((string)($b['api_key'] ?? ''));
        if ($key !== '') {
            if (strncmp($key, 'sk-ant-', 7) !== 0 || strlen($key) < 20) {
                return self::json($res, ['ok' => false, 'error' => 'Anthropic API 키 형식이 올바르지 않습니다(sk-ant-...).'], 422);
            }
            self::setAppSetting($pdo, 'claude_api_key', \Genie\Crypto::encrypt($key)); // 204차 P1: 평문→AES-256-GCM
        } elseif (isset($b['clear']) && $b['clear']) {
            self::setAppSetting($pdo, 'claude_api_key', '');
        } else {
            return self::json($res, ['ok' => false, 'error' => 'API 키를 입력하세요.'], 422);
        }
        self::audit($req, 'ai_key_config', 'AI(Claude) API 키 설정', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => 'AI API 키가 저장되었습니다. 실시간 AI 디자인·분석이 활성화됩니다.']);
    }

    // ── 196차 — 실사 이미지 생성 API(DALL·E/Stability) 키 설정(관리자). ──
    /** GET /auth/admin/img-key — 이미지 생성 API 설정 여부 + provider. */
    public static function imgKeyGet(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $set = self::getAppSetting($pdo, 'imggen_api_key') !== '';
        $provider = self::getAppSetting($pdo, 'imggen_provider'); if ($provider === '') $provider = 'openai';
        $configured = false; try { $configured = \Genie\Handlers\ClaudeAI::imgGenConfigured(); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'key_set' => $set, 'configured' => $configured, 'provider' => $provider]);
    }

    /** POST /auth/admin/img-key {api_key, provider} — 이미지 생성 API 키·provider 저장. */
    public static function imgKeySave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $provider = trim((string)($b['provider'] ?? 'openai'));
        if (!in_array($provider, ['openai', 'stability'], true)) $provider = 'openai';
        self::setAppSetting($pdo, 'imggen_provider', $provider);
        $key = trim((string)($b['api_key'] ?? ''));
        if ($key !== '') {
            if (strlen($key) < 16) return self::json($res, ['ok' => false, 'error' => 'API 키 형식이 올바르지 않습니다.'], 422);
            self::setAppSetting($pdo, 'imggen_api_key', \Genie\Crypto::encrypt($key)); // 204차 P1: 평문→AES-256-GCM
        } elseif (isset($b['clear']) && $b['clear']) {
            self::setAppSetting($pdo, 'imggen_api_key', '');
        }
        self::audit($req, 'imgkey_config', '이미지 생성 API 키 설정', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => '이미지 생성 API가 저장되었습니다. 대화형 AI 디자인에서 실사 이미지가 활성화됩니다.']);
    }

    // ── 196차 — AI 동영상 생성 API(Replicate 등) 키 설정(관리자). ──
    /** GET /auth/admin/video-key — 동영상 생성 API 설정 여부 + provider/model. */
    public static function vidKeyGet(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $set = self::getAppSetting($pdo, 'videogen_api_key') !== '';
        $provider = self::getAppSetting($pdo, 'videogen_provider'); if ($provider === '') $provider = 'replicate';
        $model = self::getAppSetting($pdo, 'videogen_model');
        $configured = false; try { $configured = \Genie\Handlers\ClaudeAI::videoGenConfigured(); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'key_set' => $set, 'configured' => $configured, 'provider' => $provider, 'model' => $model]);
    }

    /** POST /auth/admin/video-key {api_key, provider, model} — 동영상 생성 API 설정. */
    public static function vidKeySave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $provider = trim((string)($b['provider'] ?? 'replicate'));
        self::setAppSetting($pdo, 'videogen_provider', $provider !== '' ? $provider : 'replicate');
        if (isset($b['model'])) self::setAppSetting($pdo, 'videogen_model', trim((string)$b['model']));
        $key = trim((string)($b['api_key'] ?? ''));
        if ($key !== '') {
            if (strlen($key) < 16) return self::json($res, ['ok' => false, 'error' => 'API 키 형식이 올바르지 않습니다.'], 422);
            self::setAppSetting($pdo, 'videogen_api_key', \Genie\Crypto::encrypt($key)); // 204차 P1: 평문→AES-256-GCM
        } elseif (isset($b['clear']) && $b['clear']) {
            self::setAppSetting($pdo, 'videogen_api_key', '');
        }
        self::audit($req, 'vidkey_config', 'AI 동영상 생성 API 키 설정', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => 'AI 동영상 생성 API가 저장되었습니다. 대화형 AI 디자인에서 동영상 생성이 활성화됩니다.']);
    }

    // ═════════════════════════════════════════════════════════════
    // [227차] 채널 OAuth 앱(플랫폼 전역) — 런칭 시 관리자 1회 등록 → 전 구독회원 즉시 원클릭 연결.
    //   OAuth.php::config() 가 읽는 동일 app_setting 키(oauth_{provider}_client_id/secret, AES 암호화)에 저장.
    //   회원 플로우(authorize→callback→테넌트별 토큰)는 이미 완비 → 본 등록만 하면 전 회원 즉시 활성.
    // ═════════════════════════════════════════════════════════════
    private const OAUTH_APP_PROVIDERS = ['google', 'meta', 'facebook', 'tiktok', 'kakao', 'naver'];

    /** OAuth callback 베이스 URL(provider 앱에 등록할 redirect_uri 안내용). */
    private static function oauthBaseUrl(ServerRequestInterface $req): string
    {
        $base = trim((string)(getenv('OAUTH_BASE_URL') ?: ($_ENV['OAUTH_BASE_URL'] ?? '')));
        if ($base === '') {
            $uri = $req->getUri();
            $host = $uri->getHost();
            $allow = ['www.genieroi.com', 'roi.geniego.com', 'demo.genieroi.com', 'roidemo.geniego.com'];
            if (!in_array($host, $allow, true)) $host = 'www.genieroi.com';
            $base = ($uri->getScheme() ?: 'https') . '://' . $host;
        }
        return rtrim($base, '/');
    }

    /** GET /auth/admin/oauth-apps — provider별 {configured, client_id_mask, redirect_uri}. */
    public static function oauthAppsGet(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $base = self::oauthBaseUrl($req);
        $out = [];
        foreach (self::OAUTH_APP_PROVIDERS as $p) {
            $cidEnc = self::getAppSetting($pdo, 'oauth_' . $p . '_client_id');
            $cid = ''; if ($cidEnc !== '') { try { $cid = \Genie\Crypto::decrypt($cidEnc); } catch (\Throwable $e) {} }
            $secSet = self::getAppSetting($pdo, 'oauth_' . $p . '_client_secret') !== '';
            $mask = $cid !== '' ? (substr($cid, 0, 4) . '••••••' . substr($cid, -2)) : '';
            $out[$p] = [
                'configured'    => ($cid !== '' && $secSet),
                'client_id_set' => ($cid !== ''),
                'client_id_mask'=> $mask,
                'redirect_uri'  => $base . '/api/v425/oauth/' . $p . '/callback',
            ];
        }
        $notify = self::getAppSetting($pdo, 'apply_notify_email');
        if ($notify === '' && getenv('APPLY_NOTIFY_EMAIL')) $notify = (string)getenv('APPLY_NOTIFY_EMAIL');
        return self::json($res, ['ok' => true, 'providers' => $out, 'base' => $base, 'apply_notify_email' => $notify]);
    }

    /** POST /auth/admin/apply-notify {email} — 발급신청 알림 수신 이메일(운영팀) 설정. */
    public static function applyNotifySave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $email = trim((string)($b['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::json($res, ['ok' => false, 'error' => '이메일 형식이 올바르지 않습니다.'], 422);
        }
        self::setAppSetting($pdo, 'apply_notify_email', $email);
        self::audit($req, 'apply_notify_config', '발급신청 알림 이메일 설정', 'medium', $user);
        return self::json($res, ['ok' => true, 'apply_notify_email' => $email,
            'message' => $email !== '' ? '발급신청 알림 수신 이메일이 저장되었습니다.' : '발급신청 알림 수신 이메일을 해제했습니다.']);
    }

    /** POST /auth/admin/oauth-apps {provider, client_id, client_secret | clear} — OAuth 앱 등록(암호화). */
    public static function oauthAppsSave(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$user, $err] = self::requireAdminUser($req);
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo(); self::ensureAppSetting($pdo);
        $b = self::readBody($req);
        $provider = strtolower(trim((string)($b['provider'] ?? '')));
        if (!in_array($provider, self::OAUTH_APP_PROVIDERS, true)) return self::json($res, ['ok' => false, 'error' => '지원하지 않는 provider'], 422);
        if (!empty($b['clear'])) {
            self::setAppSetting($pdo, 'oauth_' . $provider . '_client_id', '');
            self::setAppSetting($pdo, 'oauth_' . $provider . '_client_secret', '');
            self::audit($req, 'oauth_app_config', "OAuth 앱 해제: {$provider}", 'high', $user);
            return self::json($res, ['ok' => true, 'provider' => $provider, 'configured' => false]);
        }
        $cid = trim((string)($b['client_id'] ?? ''));
        $sec = trim((string)($b['client_secret'] ?? ''));
        // 마스킹(•) 재전송·빈값은 무시 → 기존 값 보존(부분 수정 지원).
        if ($cid !== '' && strpos($cid, '•') === false) self::setAppSetting($pdo, 'oauth_' . $provider . '_client_id', \Genie\Crypto::encrypt($cid));
        if ($sec !== '' && strpos($sec, '•') === false) self::setAppSetting($pdo, 'oauth_' . $provider . '_client_secret', \Genie\Crypto::encrypt($sec));
        $cidNow = self::getAppSetting($pdo, 'oauth_' . $provider . '_client_id') !== '';
        $secNow = self::getAppSetting($pdo, 'oauth_' . $provider . '_client_secret') !== '';
        self::audit($req, 'oauth_app_config', "OAuth 앱 등록: {$provider}", 'high', $user);
        return self::json($res, ['ok' => true, 'provider' => $provider, 'configured' => ($cidNow && $secNow),
            'message' => "{$provider} OAuth 앱이 저장되었습니다. 전 구독회원이 즉시 원클릭 연결을 사용할 수 있습니다."]);
    }

    // ═════════════════════════════════════════════════════════════
    // 189차 보안 하드닝 — 비밀번호 정책 / 로그인 rate-limit / MFA(TOTP)
    // ═════════════════════════════════════════════════════════════

    /**
     * 엔터프라이즈/은행급 비밀번호 정책 검증.
     *   - 최소 8자(기존 6/8 혼재 → 통일·강화), 최대 200자
     *   - 영문 대문자·소문자·숫자·특수문자 중 3종 이상
     *   - 동일 문자 4회 이상 연속 / 흔하거나 추측하기 쉬운 비번 차단
     * 위반 시 한글 사유 문자열, 통과 시 null.
     * ※ SET 시점(가입/변경/재설정)에만 강제 — 로그인 검증엔 미적용하여
     *    기존 약한 비번 계정의 락아웃을 방지한다(재설정으로 점진 마이그레이션).
     */
    private static function passwordPolicyError(string $pw): ?string
    {
        $len = mb_strlen($pw);
        if ($len < 8) return '비밀번호는 8자 이상이어야 합니다.';
        if ($len > 200) return '비밀번호가 너무 깁니다. (최대 200자)';
        if (trim($pw) === '') return '비밀번호에 공백만 사용할 수 없습니다.';
        $classes = 0;
        if (preg_match('/[a-z]/', $pw)) $classes++;
        if (preg_match('/[A-Z]/', $pw)) $classes++;
        if (preg_match('/[0-9]/', $pw)) $classes++;
        if (preg_match('/[^a-zA-Z0-9]/', $pw)) $classes++;
        if ($classes < 3) return '비밀번호는 영문 대문자·소문자·숫자·특수문자 중 3종류 이상을 포함해야 합니다.';
        if (preg_match('/(.)\1{3,}/u', $pw)) return '같은 문자를 4회 이상 연속해서 사용할 수 없습니다.';
        $lower = strtolower($pw);
        foreach ([
            'password', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyuiop',
            'geniego', 'genie-go', 'geniego1721', 'admin1234', 'letmein', 'iloveyou',
            'welcome1', 'changeme', 'passw0rd',
        ] as $w) {
            if ($lower === $w || strpos($lower, $w) !== false) {
                return '너무 흔하거나 추측하기 쉬운 비밀번호입니다. 더 안전한 비밀번호를 사용하세요.';
            }
        }
        return null;
    }

    // ── 로그인 rate-limit (앱 레이어 무차별 대입 방어) ─────────────
    private static function ensureRateLimitSchema(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS login_attempt (ident VARCHAR(190) PRIMARY KEY, fail_count INT NOT NULL DEFAULT 0, first_at VARCHAR(32), last_at VARCHAR(32), locked_until VARCHAR(32))");
        } catch (\Throwable $e) { /* best-effort */ }
    }

    private static function clientIp(ServerRequestInterface $req): string
    {
        // 193차 Sprint4: XFF 스푸핑 rate-limit 우회 차단.
        //   기존: 클라이언트가 위조 가능한 X-Forwarded-For 첫 홉을 신뢰 → 공격자가 IP 를 회전해
        //   email|IP rate-limit 을 무력화(같은 계정 무제한 brute-force)할 수 있었다.
        //   → 신뢰 프록시(nginx)가 설정하는 X-Real-IP 를 우선. nginx 가 proxy_set_header 로
        //   덮어쓰므로 클라이언트가 위조 불가. 그 다음 REMOTE_ADDR(직접 연결 IP).
        //   XFF 는 nginx 뒤가 아닌 예외 환경의 최후 폴백으로만, 그것도 마지막 홉(직전 프록시 추가)을 사용.
        $sp = $req->getServerParams();
        $real = trim((string)($sp['HTTP_X_REAL_IP'] ?? ''));
        if ($real !== '') return $real;
        $remote = trim((string)($sp['REMOTE_ADDR'] ?? ''));
        if ($remote !== '' && $remote !== '127.0.0.1' && $remote !== '::1') return $remote;
        $xff = (string)($sp['HTTP_X_FORWARDED_FOR'] ?? '');
        if ($xff !== '') {
            $parts = array_map('trim', explode(',', $xff));
            $last = end($parts); // 첫 홉(클라이언트 제어) 대신 마지막 홉(직전 프록시 기록)
            if ($last !== '') return $last;
        }
        return $remote !== '' ? $remote : '0.0.0.0';
    }

    private const RL_THRESHOLD = 8;    // 윈도우 내 실패 허용 횟수
    private const RL_WINDOW    = 900;  // 카운터 윈도우(초) = 15분
    private const RL_LOCK      = 900;  // 잠금 지속(초) = 15분

    /** 잠금 중이면 남은 초, 허용이면 null. DB 오류 시 fail-open. */
    private static function rateLimitRetryAfter(\PDO $pdo, string $ident): ?int
    {
        self::ensureRateLimitSchema($pdo);
        try {
            $st = $pdo->prepare('SELECT locked_until FROM login_attempt WHERE ident=?');
            $st->execute([$ident]);
            $lu = (string)($st->fetchColumn() ?: '');
            if ($lu !== '' && $lu > self::now()) {
                $ra = strtotime($lu) - time();
                return $ra > 0 ? $ra : 1;
            }
        } catch (\Throwable $e) { /* fail-open */ }
        return null;
    }

    private static function rateLimitFail(\PDO $pdo, string $ident): void
    {
        self::ensureRateLimitSchema($pdo);
        $now = self::now();
        try {
            $st = $pdo->prepare('SELECT fail_count, first_at FROM login_attempt WHERE ident=?');
            $st->execute([$ident]);
            $row = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$row) {
                $pdo->prepare('INSERT INTO login_attempt(ident,fail_count,first_at,last_at) VALUES(?,1,?,?)')
                    ->execute([$ident, $now, $now]);
                return;
            }
            $firstAt = (string)($row['first_at'] ?? $now);
            if (strtotime($firstAt) < time() - self::RL_WINDOW) {
                // 윈도우 경과 → 카운터 리셋
                $pdo->prepare('UPDATE login_attempt SET fail_count=1, first_at=?, last_at=?, locked_until=NULL WHERE ident=?')
                    ->execute([$now, $now, $ident]);
                return;
            }
            $cnt = (int)$row['fail_count'] + 1;
            $lockedUntil = $cnt >= self::RL_THRESHOLD
                ? gmdate('Y-m-d\TH:i:s\Z', time() + self::RL_LOCK)
                : null;
            $pdo->prepare('UPDATE login_attempt SET fail_count=?, last_at=?, locked_until=? WHERE ident=?')
                ->execute([$cnt, $now, $lockedUntil, $ident]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    private static function rateLimitClear(\PDO $pdo, string $ident): void
    {
        try { $pdo->prepare('DELETE FROM login_attempt WHERE ident=?')->execute([$ident]); } catch (\Throwable $e) {}
    }

    // ── MFA / 2FA (RFC 6238 TOTP, 외부 라이브러리 없이 구현) ────────
    private static function ensureMfaSchema(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        foreach (['mfa_secret VARCHAR(64)', 'mfa_enabled TINYINT DEFAULT 0', 'mfa_enrolled_at VARCHAR(32)',
                  'mfa_method VARCHAR(20)', 'mfa_otp_hash VARCHAR(80)', 'mfa_otp_expires VARCHAR(32)'] as $col) {
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS mfa_recovery (user_id INT NOT NULL, code_hash VARCHAR(80) NOT NULL, used_at VARCHAR(32) NULL)");
        } catch (\Throwable $e) {}
    }

    private static function base32Decode(string $b32): string
    {
        $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $b32 = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $b32));
        $bits = '';
        for ($i = 0, $n = strlen($b32); $i < $n; $i++) {
            $bits .= str_pad(decbin(strpos($map, $b32[$i])), 5, '0', STR_PAD_LEFT);
        }
        $bytes = '';
        for ($i = 0, $n = strlen($bits); $i + 8 <= $n; $i += 8) {
            $bytes .= chr(bindec(substr($bits, $i, 8)));
        }
        return $bytes;
    }

    private static function base32Encode(string $bin): string
    {
        $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        for ($i = 0, $n = strlen($bin); $i < $n; $i++) {
            $bits .= str_pad(decbin(ord($bin[$i])), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        for ($i = 0, $n = strlen($bits); $i < $n; $i += 5) {
            $out .= $map[bindec(str_pad(substr($bits, $i, 5), 5, '0', STR_PAD_RIGHT))];
        }
        return $out;
    }

    private static function totpAt(string $secretB32, int $counter): string
    {
        $key = self::base32Decode($secretB32);
        if ($key === '') return '';
        $bin  = "\0\0\0\0" . pack('N', $counter); // 8-byte big-endian counter
        $hash = hash_hmac('sha1', $bin, $key, true);
        $off  = ord($hash[19]) & 0x0f;
        $part = ((ord($hash[$off]) & 0x7f) << 24)
              | ((ord($hash[$off + 1]) & 0xff) << 16)
              | ((ord($hash[$off + 2]) & 0xff) << 8)
              | (ord($hash[$off + 3]) & 0xff);
        return str_pad((string)($part % 1000000), 6, '0', STR_PAD_LEFT);
    }

    /** 현재 ±1 윈도우(±30초)에서 코드 일치 검증. */
    private static function verifyTotp(string $secretB32, string $code): bool
    {
        $code = preg_replace('/\D/', '', (string)$code);
        if ($secretB32 === '' || strlen($code) !== 6) return false;
        $t = (int)floor(time() / 30);
        for ($w = -1; $w <= 1; $w++) {
            $cand = self::totpAt($secretB32, $t + $w);
            if ($cand !== '' && hash_equals($cand, $code)) return true;
        }
        return false;
    }

    private static function genMfaSecret(): string
    {
        return self::base32Encode(random_bytes(20)); // 160-bit
    }

    private static function genRecoveryCodes(int $n = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $n; $i++) {
            $raw = strtoupper(bin2hex(random_bytes(4))); // 8 hex
            $codes[] = substr($raw, 0, 4) . '-' . substr($raw, 4, 4);
        }
        return $codes;
    }

    private static function recoveryHash(string $code): string
    {
        $norm = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$code));
        return hash('sha256', $norm);
    }

    /** 복구 코드 1회 소모(일치+미사용 시 used 처리 후 true). */
    private static function consumeRecoveryCode(\PDO $pdo, int $userId, string $code): bool
    {
        $code = preg_replace('/[^A-Za-z0-9]/', '', (string)$code);
        if (strlen($code) < 8) return false;
        self::ensureMfaSchema($pdo);
        try {
            $h = self::recoveryHash($code);
            $st = $pdo->prepare('SELECT rowid FROM mfa_recovery WHERE user_id=? AND code_hash=? AND used_at IS NULL LIMIT 1');
            try { $st->execute([$userId, $h]); } catch (\Throwable $e) {
                // MySQL: rowid 없음 → code_hash 기준 업데이트로 대체
                $upd = $pdo->prepare('UPDATE mfa_recovery SET used_at=? WHERE user_id=? AND code_hash=? AND used_at IS NULL');
                $upd->execute([self::now(), $userId, $h]);
                return $upd->rowCount() > 0;
            }
            if (!$st->fetchColumn()) return false;
            $pdo->prepare('UPDATE mfa_recovery SET used_at=? WHERE user_id=? AND code_hash=? AND used_at IS NULL')
                ->execute([self::now(), $userId, $h]);
            return true;
        } catch (\Throwable $e) { return false; }
    }

    /** GET /auth/mfa/status — 현재 사용자 MFA 활성 여부. */
    public static function mfaStatus(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureMfaSchema($pdo);
        $enabled = 0; $remaining = 0; $method = '';
        try {
            $st = $pdo->prepare('SELECT mfa_enabled, mfa_method FROM app_user WHERE id=?');
            $st->execute([$user['id']]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
            $enabled = (int)($row['mfa_enabled'] ?? 0);
            $method  = (string)($row['mfa_method'] ?? '');
        } catch (\Throwable $e) {}
        if ($enabled) {
            try {
                $st = $pdo->prepare('SELECT COUNT(*) FROM mfa_recovery WHERE user_id=? AND used_at IS NULL');
                $st->execute([$user['id']]);
                $remaining = (int)$st->fetchColumn();
            } catch (\Throwable $e) {}
        }
        // 이메일 인증 가용 여부(UI 게이트용): Mailer 설정 시 true
        $emailAvail = false; try { $emailAvail = \Genie\Mailer::isConfigured($pdo); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true, 'enabled' => $enabled === 1, 'method' => $method, 'recovery_remaining' => $remaining,
            'policy' => self::mfaPolicy($pdo), 'enforced' => self::mfaRequiredFor((string)($user['plan'] ?? $user['plans'] ?? ''), $pdo),
            'methods_available' => ['email' => $emailAvail, 'totp' => true, 'sms' => false, 'kakao' => false]]);
    }

    /** [P3 보안거버넌스] 조직 MFA 강제 정책(app_setting mfa_policy): off|admin|all. 기본 admin(기존 동작 보존). */
    public static function mfaPolicy(\PDO $pdo): string
    {
        try {
            $st = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey='mfa_policy' LIMIT 1");
            $st->execute(); $v = (string)$st->fetchColumn();
            if (in_array($v, ['off', 'admin', 'all'], true)) return $v;
        } catch (\Throwable $e) {}
        return 'admin';
    }

    /** 정책×역할 → MFA 강제 여부. off=없음·admin=관리자만·all=전원. */
    public static function mfaRequiredFor(string $plan, ?\PDO $pdo = null): bool
    {
        $pol = self::mfaPolicy($pdo ?: Db::pdo());
        if ($pol === 'off') return false;
        if ($pol === 'all') return true;
        return $plan === 'admin';
    }

    /** GET/PUT /auth/mfa/policy — 조직 MFA 강제 정책 조회/설정(PUT=관리자). 강제 시 로그인이 MFA 미설정 사용자에 enrollment 게이트. */
    public static function mfaPolicyConfig(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo = Db::pdo();
        if (strtoupper($req->getMethod()) === 'PUT') {
            if ($err = self::requirePlan($req, $res, 'admin')) return $err;
            $b = (array)($req->getParsedBody() ?? []);
            if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
            $pol = in_array(($b['policy'] ?? ''), ['off', 'admin', 'all'], true) ? (string)$b['policy'] : 'admin';
            try {
                $now = gmdate('c'); $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
                $sql = $isMy
                    ? "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('mfa_policy',?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)"
                    : "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('mfa_policy',?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at";
                $pdo->prepare($sql)->execute([$pol, $now]);
            } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => 'save_failed'], 500); }
            try { self::logAudit($req, 'mfa_policy_update', 'policy=' . $pol, 'high'); } catch (\Throwable $e) {}
            return self::json($res, ['ok' => true, 'policy' => $pol]);
        }
        if ($err = self::requirePro($req, $res)) return $err;
        return self::json($res, ['ok' => true, 'policy' => self::mfaPolicy($pdo),
            'options' => ['off', 'admin', 'all'],
            'labels' => ['off' => 'MFA 강제 안 함', 'admin' => '관리자만 강제', 'all' => '전 사용자 강제']]);
    }

    /** POST /auth/mfa/setup — 새 시크릿 발급(아직 미활성). secret + otpauth URI 반환. */
    public static function mfaSetup(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureMfaSchema($pdo);
        try {
            $st = $pdo->prepare('SELECT mfa_enabled FROM app_user WHERE id=?');
            $st->execute([$user['id']]);
            if ((int)($st->fetchColumn() ?: 0) === 1) {
                return self::json($res, ['ok' => false, 'error' => '이미 2단계 인증이 활성화되어 있습니다.'], 409);
            }
        } catch (\Throwable $e) {}
        $secret = self::genMfaSecret();
        try {
            $pdo->prepare('UPDATE app_user SET mfa_secret=?, mfa_enabled=0 WHERE id=?')->execute([$secret, $user['id']]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'MFA 설정 저장 중 오류가 발생했습니다.'], 500);
        }
        $issuer = 'GeniegoROI';
        $label  = rawurlencode($issuer . ':' . (string)($user['email'] ?? 'user'));
        $otpauth = "otpauth://totp/{$label}?secret={$secret}&issuer=" . rawurlencode($issuer) . "&algorithm=SHA1&digits=6&period=30";
        return self::json($res, ['ok' => true, 'secret' => $secret, 'otpauth_uri' => $otpauth]);
    }

    /** POST /auth/mfa/enable {code} — 보류 시크릿을 코드로 검증 후 활성화. 복구코드 반환(1회). */
    public static function mfaEnable(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureMfaSchema($pdo);
        $b = self::readBody($req);
        $code = (string)($b['code'] ?? $b['otp'] ?? '');
        try {
            $st = $pdo->prepare('SELECT mfa_secret, mfa_enabled FROM app_user WHERE id=?');
            $st->execute([$user['id']]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { $row = []; }
        $secret = (string)($row['mfa_secret'] ?? '');
        if ((int)($row['mfa_enabled'] ?? 0) === 1) {
            return self::json($res, ['ok' => false, 'error' => '이미 2단계 인증이 활성화되어 있습니다.'], 409);
        }
        if ($secret === '') {
            return self::json($res, ['ok' => false, 'error' => '먼저 설정(setup)을 진행하세요.'], 400);
        }
        if (!self::verifyTotp($secret, $code)) {
            return self::json($res, ['ok' => false, 'error' => '인증 코드가 올바르지 않습니다. 인증 앱의 6자리 코드를 확인하세요.'], 400);
        }
        // 복구 코드 생성·저장(해시)
        $codes = self::genRecoveryCodes(8);
        try {
            $pdo->prepare('DELETE FROM mfa_recovery WHERE user_id=?')->execute([$user['id']]);
            $ins = $pdo->prepare('INSERT INTO mfa_recovery(user_id,code_hash,used_at) VALUES(?,?,NULL)');
            foreach ($codes as $c) $ins->execute([$user['id'], self::recoveryHash($c)]);
        } catch (\Throwable $e) {}
        try {
            $pdo->prepare('UPDATE app_user SET mfa_enabled=1, mfa_method=?, mfa_enrolled_at=? WHERE id=?')->execute(['totp', self::now(), $user['id']]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'MFA 활성화 중 오류가 발생했습니다.'], 500);
        }
        self::audit($req, 'mfa_enable', '2단계 인증 활성화 (totp)', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => '2단계 인증이 활성화되었습니다.', 'recovery_codes' => $codes]);
    }

    /** POST /auth/mfa/disable {current_password} — 비번 확인 후 MFA 해제. */
    public static function mfaDisable(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureMfaSchema($pdo);
        $b = self::readBody($req);
        $cur = (string)($b['current_password'] ?? '');
        try {
            $st = $pdo->prepare('SELECT password_hash, password_hashs, password FROM app_user WHERE id=?');
            $st->execute([$user['id']]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            $st = $pdo->prepare('SELECT password_hash FROM app_user WHERE id=?');
            $st->execute([$user['id']]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        }
        $hash = $row['password_hashs'] ?? $row['password_hash'] ?? $row['password'] ?? '';
        if ($hash === '' || !password_verify($cur, (string)$hash)) {
            return self::json($res, ['ok' => false, 'error' => '현재 비밀번호가 올바르지 않습니다.'], 400);
        }
        try {
            $pdo->prepare('UPDATE app_user SET mfa_enabled=0, mfa_secret=NULL, mfa_enrolled_at=NULL WHERE id=?')->execute([$user['id']]);
            $pdo->prepare('DELETE FROM mfa_recovery WHERE user_id=?')->execute([$user['id']]);
        } catch (\Throwable $e) {}
        self::audit($req, 'mfa_disable', '2단계 인증 해제', 'high', $user);
        return self::json($res, ['ok' => true, 'message' => '2단계 인증이 해제되었습니다.']);
    }

    // ── 195차 #3 — 이메일/카카오/SMS OTP 기반 2단계 인증 (TOTP 대안) ──
    //   이메일=실발송(Mailer). SMS/카카오=외부 제공자 자격증명 필요 → 미설정 시 게이트(가짜 인증 없음).
    //   미설정 제공자는 enroll 자체가 막혀 method 로 저장 불가 → 로그인 락아웃 방지.
    private static function mfaMethodConfigured(string $method, \PDO $pdo): bool
    {
        if ($method === 'email') return \Genie\Mailer::isConfigured($pdo);
        if ($method === 'sms')   return \Genie\NaverSms::isConfigured($pdo);
        if ($method === 'kakao') return trim((string)getenv('KAKAO_ALIMTALK_KEY')) !== '';
        return false;
    }

    private static function genOtp6(): string
    {
        try { return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT); }
        catch (\Throwable $e) { return str_pad((string)mt_rand(0, 999999), 6, '0', STR_PAD_LEFT); }
    }

    /** OTP 생성·저장(해시+5분 만료)·발송. 반환 ['sent'=>bool,'error'=>?,'msg'=>string]. */
    private static function dispatchMfaOtp(\PDO $pdo, array $user, string $method): array
    {
        if (!in_array($method, ['email','sms','kakao'], true)) return ['sent'=>false,'error'=>'invalid_method','msg'=>'지원하지 않는 인증 방식입니다.'];
        if (!self::mfaMethodConfigured($method, $pdo)) {
            $label = $method === 'sms' ? 'SMS' : ($method === 'kakao' ? '카카오톡' : '이메일');
            return ['sent'=>false,'error'=>'provider_not_configured','msg'=>"{$label} 인증 제공자가 아직 설정되지 않았습니다. 관리자에게 문의하거나 다른 인증 방식을 선택하세요."];
        }
        $code = self::genOtp6();
        $exp  = gmdate('Y-m-d\TH:i:s\Z', time() + 300); // 5분
        try {
            $pdo->prepare('UPDATE app_user SET mfa_otp_hash=?, mfa_otp_expires=? WHERE id=?')
                ->execute([password_hash($code, PASSWORD_DEFAULT), $exp, $user['id']]);
        } catch (\Throwable $e) { return ['sent'=>false,'error'=>'store_failed','msg'=>'인증 코드 저장 중 오류가 발생했습니다.']; }
        if ($method === 'email') {
            $to = (string)($user['email'] ?? '');
            if ($to === '') return ['sent'=>false,'error'=>'no_email','msg'=>'등록된 이메일이 없습니다.'];
            $html = \Genie\Mailer::wrapHtml('관리자 2단계 인증 코드',
                "<p>아래 6자리 인증 코드를 입력하세요. 코드는 5분간 유효합니다.</p>"
                . "<div style='font-size:30px;font-weight:800;letter-spacing:8px;margin:18px 0;color:#1e293b'>{$code}</div>"
                . "<p style='color:#64748b;font-size:13px'>본인이 요청하지 않았다면 즉시 비밀번호를 변경하세요.</p>");
            $r = \Genie\Mailer::send($to, '[Geniego-ROI] 관리자 2단계 인증 코드', $html, ['pdo'=>$pdo]);
            if (empty($r['ok'])) return ['sent'=>false,'error'=>'send_failed','msg'=>'이메일 발송에 실패했습니다. 잠시 후 다시 시도하세요.'];
            return ['sent'=>true,'msg'=>'인증 코드를 이메일로 보냈습니다. 메일함(스팸 포함)을 확인하세요.'];
        }
        // 203차: SMS = 네이버 SENS 실발송(NaverSms). 미설정은 위 게이트에서 차단.
        if ($method === 'sms') {
            $to = preg_replace('/[^0-9]/', '', (string)($user['phone'] ?? $user['mobile'] ?? ''));
            if ($to === '') return ['sent'=>false,'error'=>'no_phone','msg'=>'등록된 휴대폰 번호가 없습니다. 프로필에서 번호를 등록하세요.'];
            $r = \Genie\NaverSms::sendPlatform($pdo, $to, "[GeniegoROI] 인증코드 {$code} — 5분 이내 입력하세요.");
            if (empty($r['ok'])) return ['sent'=>false,'error'=>'send_failed','msg'=>'SMS 발송에 실패했습니다. 잠시 후 다시 시도하세요.'];
            return ['sent'=>true,'msg'=>'인증 코드를 SMS로 보냈습니다. 휴대폰을 확인하세요.'];
        }
        // kakao: 제공자 설정 시에만 도달. 실제 연동 자리(자격증명 확보 시 구현).
        return ['sent'=>false,'error'=>'provider_not_implemented','msg'=>'해당 제공자 발송이 아직 구현되지 않았습니다.'];
    }

    private static function verifyMfaOtp(\PDO $pdo, int $userId, string $code): bool
    {
        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) return false;
        try {
            $st = $pdo->prepare('SELECT mfa_otp_hash, mfa_otp_expires FROM app_user WHERE id=?');
            $st->execute([$userId]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return false; }
        $hash = (string)($row['mfa_otp_hash'] ?? '');
        $exp  = (string)($row['mfa_otp_expires'] ?? '');
        if ($hash === '' || $exp === '' || strtotime($exp) < time()) return false;
        if (!password_verify($code, $hash)) return false;
        try { $pdo->prepare('UPDATE app_user SET mfa_otp_hash=NULL, mfa_otp_expires=NULL WHERE id=?')->execute([$userId]); } catch (\Throwable $e) {}
        return true;
    }

    /** POST /auth/mfa/otp/send {method} — (enroll/로그인) OTP 발송. */
    public static function mfaOtpSend(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureMfaSchema($pdo);
        $b = self::readBody($req);
        $method = (string)($b['method'] ?? 'email');
        $r = self::dispatchMfaOtp($pdo, $user, $method);
        if (!$r['sent']) {
            // provider_not_configured 는 정상 흐름(UI 게이트)이라 200, 그 외는 400.
            return self::json($res, ['ok'=>false,'error'=>$r['msg'],'reason'=>$r['error'] ?? 'failed'], ($r['error'] ?? '')==='provider_not_configured' ? 200 : 400);
        }
        return self::json($res, ['ok'=>true,'message'=>$r['msg'],'method'=>$method]);
    }

    /** POST /auth/mfa/otp/enable {method, code} — OTP 검증 후 MFA 활성화(method 저장). 복구코드 반환. */
    public static function mfaOtpEnable(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureMfaSchema($pdo);
        $b = self::readBody($req);
        $method = (string)($b['method'] ?? 'email');
        $code   = (string)($b['code'] ?? $b['otp'] ?? '');
        if (!in_array($method, ['email','sms','kakao'], true)) return self::json($res, ['ok'=>false,'error'=>'지원하지 않는 인증 방식입니다.'], 400);
        try {
            $st = $pdo->prepare('SELECT mfa_enabled FROM app_user WHERE id=?'); $st->execute([$user['id']]);
            if ((int)($st->fetchColumn() ?: 0) === 1) return self::json($res, ['ok'=>false,'error'=>'이미 2단계 인증이 활성화되어 있습니다.'], 409);
        } catch (\Throwable $e) {}
        if (!self::verifyMfaOtp($pdo, (int)$user['id'], $code)) {
            return self::json($res, ['ok'=>false,'error'=>'인증 코드가 올바르지 않거나 만료되었습니다.'], 400);
        }
        $codes = self::genRecoveryCodes(8);
        try {
            $pdo->prepare('DELETE FROM mfa_recovery WHERE user_id=?')->execute([$user['id']]);
            $ins = $pdo->prepare('INSERT INTO mfa_recovery(user_id,code_hash,used_at) VALUES(?,?,NULL)');
            foreach ($codes as $c) $ins->execute([$user['id'], self::recoveryHash($c)]);
        } catch (\Throwable $e) {}
        try {
            $pdo->prepare('UPDATE app_user SET mfa_enabled=1, mfa_method=?, mfa_enrolled_at=? WHERE id=?')->execute([$method, self::now(), $user['id']]);
        } catch (\Throwable $e) { return self::json($res, ['ok'=>false,'error'=>'MFA 활성화 중 오류가 발생했습니다.'], 500); }
        self::audit($req, 'mfa_enable', "2단계 인증 활성화 ({$method})", 'high', $user);
        return self::json($res, ['ok'=>true,'message'=>'2단계 인증이 활성화되었습니다.','method'=>$method,'recovery_codes'=>$codes]);
    }

    // ═════════════════════════════════════════════════════════════
    // 189차+ 인증/관리자 행위 감사로그 (auth audit trail)
    //   로그인/로그아웃/가입/비번변경·재설정/MFA/관리자 접속키 등 보안 이벤트를 append-only 기록.
    //   Audit.jsx(GET /auth/audit-logs) 가 소비. best-effort(기록 실패가 호출 액션을 깨지 않음).
    // ═════════════════════════════════════════════════════════════
    private static function ensureAuditSchema(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS auth_audit_log (at VARCHAR(32), user_id INT NULL, actor VARCHAR(190), role VARCHAR(32), tenant_id VARCHAR(64), action VARCHAR(64), detail TEXT, ip VARCHAR(64), ua VARCHAR(255), risk VARCHAR(16))");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_auth_audit_at ON auth_audit_log(at)");
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /**
     * 감사 이벤트 1건 기록. $who 는 user 배열(있으면 email/role/tenant/id 추출) 또는 이메일 문자열.
     * risk: 'low'|'medium'|'high'. 실패해도 호출측 액션에 영향 없음.
     */
    private static function audit(ServerRequestInterface $req, string $action, string $detail, string $risk, $who = null): void
    {
        try {
            $pdo = Db::pdo();
            self::ensureAuditSchema($pdo);
            $email = ''; $role = ''; $tenant = ''; $uid = null;
            if (is_array($who)) {
                $email  = (string)($who['email'] ?? '');
                $role   = (string)($who['plan'] ?? $who['plans'] ?? '');
                $tenant = (string)($who['tenant_id'] ?? '');
                $uid    = isset($who['id']) ? (int)$who['id'] : (isset($who['idx']) ? (int)$who['idx'] : null);
            } elseif (is_string($who)) {
                $email = $who;
            }
            $ua = substr((string)$req->getHeaderLine('User-Agent'), 0, 255);
            $ip = self::clientIp($req);
            $pdo->prepare('INSERT INTO auth_audit_log(at,user_id,actor,role,tenant_id,action,detail,ip,ua,risk) VALUES(?,?,?,?,?,?,?,?,?,?)')
                ->execute([self::now(), $uid, $email, $role, $tenant, $action, $detail, $ip, $ua, $risk]);
            // [254차 초고도화] 실시간 SIEM 포워딩 — high 심각도만(DB read·전송 모두 high에서만). siem_config.realtime opt-in 시에만 실제 전송(비차단·기본off=회귀0).
            if ($risk === 'high') {
                try { \Genie\Handlers\Compliance::forwardEvent(['action' => $action, 'actor' => $email, 'ip' => $ip, 'role' => $role, 'tenant' => $tenant, 'detail' => $detail, 'risk' => $risk]); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* 기록 실패는 무시 */ }
    }

    /**
     * [231차 팀권한] 외부 핸들러(TeamPermissions 등)가 동일 감사로그(auth_audit_log)에 기록하기 위한 공개 래퍼.
     *   단일 SSOT 유지 → 팀/권한 변경 이벤트가 GET /auth/audit-logs 에 함께 노출된다.
     */
    public static function logAudit(ServerRequestInterface $req, string $action, string $detail, string $risk = 'low', $who = null): void
    {
        self::audit($req, $action, $detail, $risk, $who);
    }

    /** GET /auth/audit-logs — admin=전체, 그 외=본인(user_id) 이벤트. */
    public static function auditLogs(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureAuditSchema($pdo);
        $isAdmin = (($user['plan'] ?? '') === 'admin') || (($user['plans'] ?? '') === 'admin');
        try {
            if ($isAdmin) {
                $st = $pdo->prepare('SELECT at,actor,role,tenant_id,action,detail,ip,risk FROM auth_audit_log ORDER BY at DESC LIMIT 1000');
                $st->execute();
            } else {
                $st = $pdo->prepare('SELECT at,actor,role,tenant_id,action,detail,ip,risk FROM auth_audit_log WHERE user_id=? OR actor=? ORDER BY at DESC LIMIT 500');
                $st->execute([(int)($user['id'] ?? 0), (string)($user['email'] ?? '')]);
            }
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { $rows = []; }
        return self::json($res, ['ok' => true, 'logs' => $rows, 'count' => count($rows)]);
    }

    // ═════════════════════════════════════════════════════════════
    // 189차+ 세션/기기 관리 (활성 세션 목록 + 다른 기기 로그아웃)
    //   user_session 에 ip/ua/last_seen 메타 보강 후 본인 활성 세션 조회·폐기.
    // ═════════════════════════════════════════════════════════════
    private static function ensureSessionMeta(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        foreach (['ip VARCHAR(64)', 'ua VARCHAR(255)', 'last_seen VARCHAR(32)'] as $col) {
            try { $pdo->exec("ALTER TABLE user_session ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
    }

    /** 세션 생성 직후 ip/ua/last_seen 기록(best-effort). */
    private static function recordSessionMeta(\PDO $pdo, ServerRequestInterface $req, string $token): void
    {
        try {
            self::ensureSessionMeta($pdo);
            $ua = substr((string)$req->getHeaderLine('User-Agent'), 0, 255);
            $pdo->prepare('UPDATE user_session SET ip=?, ua=?, last_seen=? WHERE token=?')
                ->execute([self::clientIp($req), $ua, self::now(), $token]);
        } catch (\Throwable $e) { /* 무시 */ }
    }

    /** GET /auth/sessions — 본인 활성 세션 목록(토큰 마스킹, 현재 세션 표시). */
    public static function listSessions(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = (string)(self::extractToken($req) ?? '');
        $user  = self::userByToken($token);
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureSessionMeta($pdo);
        $now = self::now();
        try { $pdo->prepare('DELETE FROM user_session WHERE user_id=? AND expires_at < ?')->execute([(int)$user['id'], $now]); } catch (\Throwable $e) {}
        try {
            $st = $pdo->prepare('SELECT token, ip, ua, created_at, expires_at, last_seen FROM user_session WHERE user_id=? ORDER BY created_at DESC LIMIT 100');
            $st->execute([(int)$user['id']]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { $rows = []; }
        $out = array_map(function ($r) use ($token) {
            $tk = (string)($r['token'] ?? '');
            return [
                'id'         => substr(hash('sha256', $tk), 0, 12), // 안정 식별자(원토큰 비노출)
                'current'    => hash_equals($tk, $token),
                'ip'         => (string)($r['ip'] ?? ''),
                'ua'         => (string)($r['ua'] ?? ''),
                'created_at' => (string)($r['created_at'] ?? ''),
                'last_seen'  => (string)($r['last_seen'] ?? $r['created_at'] ?? ''),
                'expires_at' => (string)($r['expires_at'] ?? ''),
            ];
        }, $rows);
        return self::json($res, ['ok' => true, 'sessions' => $out, 'count' => count($out)]);
    }

    /** POST /auth/sessions/revoke-others — 현재 세션 제외 전부 폐기. */
    public static function revokeOtherSessions(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = (string)(self::extractToken($req) ?? '');
        $user  = self::userByToken($token);
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo();
        $revoked = 0;
        try {
            $st = $pdo->prepare('DELETE FROM user_session WHERE user_id=? AND token<>?');
            $st->execute([(int)$user['id'], $token]);
            $revoked = $st->rowCount();
        } catch (\Throwable $e) {}
        self::audit($req, 'session_revoke_others', "다른 기기 로그아웃({$revoked}개 세션 폐기)", 'high', $user);
        return self::json($res, ['ok' => true, 'revoked' => $revoked, 'message' => "다른 기기의 {$revoked}개 세션을 로그아웃했습니다."]);
    }

    // ═════════════════════════════════════════════════════════════
    // 189차+ API 키 관리 (세션 인증 — 소유자 전용)
    //   /v421/keys 는 api_key 미들웨어 인증이라 세션토큰으로 호출 불가 → 세션 기반 래퍼 제공.
    //   본인 tenant 의 api_key CRUD. 모든 작업 owner-only(requireTeamWrite('api_keys')).
    // ═════════════════════════════════════════════════════════════
    private static function apiKeyDefaultScopes(string $role): array
    {
        if ($role === 'admin')     return ['read:*', 'write:*', 'admin:keys'];
        if ($role === 'analyst')   return ['read:*', 'write:attribution', 'write:mta'];
        if ($role === 'connector') return ['read:*', 'write:ingest'];
        return ['read:*'];
    }

    /** GET /auth/api-keys — 본인 tenant API 키 목록(해시 비노출). */
    public static function apiKeysList(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$caller, $err] = self::requireTeamWrite($req, 'api_keys');
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $tenant = self::resolveTenantId($pdo, $caller);
        // 194차 #4: use_count(호출량) 포함. 레거시 DB(컬럼 미존재) 회귀 방지 — 실패 시 use_count 없이 폴백.
        try {
            $st = $pdo->prepare('SELECT id, key_prefix, name, role, scopes_json, is_active, last_used_at, use_count, expires_at, created_at FROM api_key WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200');
            $st->execute([$tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            try {
                $st = $pdo->prepare('SELECT id, key_prefix, name, role, scopes_json, is_active, last_used_at, expires_at, created_at FROM api_key WHERE tenant_id=? ORDER BY created_at DESC LIMIT 200');
                $st->execute([$tenant]);
                $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            } catch (\Throwable $e2) { $rows = []; }
        }
        foreach ($rows as &$r) {
            $r['scopes'] = json_decode((string)($r['scopes_json'] ?? '[]'), true); unset($r['scopes_json']);
            $r['use_count'] = (int)($r['use_count'] ?? 0);
        }
        return self::json($res, ['ok' => true, 'keys' => $rows]);
    }

    /** POST /auth/api-keys {name, role, expires_at?} — 키 생성(raw 1회 반환). */
    public static function apiKeysCreate(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        [$caller, $err] = self::requireTeamWrite($req, 'api_keys');
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $tenant = self::resolveTenantId($pdo, $caller);
        $b = self::readBody($req);
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '키 이름을 입력하세요.'], 422);
        $role = trim((string)($b['role'] ?? 'viewer'));
        if (!in_array($role, ['viewer', 'connector', 'analyst', 'admin'], true)) $role = 'viewer';
        $raw  = 'genie_key_' . bin2hex(random_bytes(16));
        $pfx  = substr($raw, 0, 16);
        $hash = hash('sha256', $raw);
        $expires = trim((string)($b['expires_at'] ?? '')) ?: null;
        try {
            $pdo->prepare('INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
                ->execute([$tenant, $pfx, $hash, $name, $role, json_encode(self::apiKeyDefaultScopes($role)), 1, $expires, self::now()]);
            $id = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => '키 생성 중 오류가 발생했습니다.'], 500); }
        self::audit($req, 'api_key_create', "API 키 생성: {$name} ({$role})", 'high', $caller);
        return self::json($res, ['ok' => true, 'id' => $id, 'api_key' => $raw, 'key_prefix' => $pfx, 'role' => $role, 'warning' => '이 키는 다시 표시되지 않습니다. 안전하게 보관하세요.']);
    }

    /** DELETE /auth/api-keys/{id} — 키 폐기(soft, tenant 스코프). */
    public static function apiKeysRevoke(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        [$caller, $err] = self::requireTeamWrite($req, 'api_keys');
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $tenant = self::resolveTenantId($pdo, $caller);
        $id = (int)($args['id'] ?? 0);
        $n = 0;
        try { $st = $pdo->prepare('UPDATE api_key SET is_active=0 WHERE id=? AND tenant_id=?'); $st->execute([$id, $tenant]); $n = $st->rowCount(); } catch (\Throwable $e) {}
        if ($n === 0) return self::json($res, ['ok' => false, 'error' => '키를 찾을 수 없습니다.'], 404);
        self::audit($req, 'api_key_revoke', "API 키 폐기 #{$id}", 'high', $caller);
        return self::json($res, ['ok' => true, 'revoked_id' => $id]);
    }

    /** POST /auth/api-keys/{id}/rotate — 폐기 후 동일 메타 신규키 발급(raw 1회). */
    public static function apiKeysRotate(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        [$caller, $err] = self::requireTeamWrite($req, 'api_keys');
        if ($err) return self::json($res, ['ok' => false, 'error' => $err[0]], $err[1]);
        $pdo = Db::pdo();
        $tenant = self::resolveTenantId($pdo, $caller);
        $id = (int)($args['id'] ?? 0);
        try { $old = $pdo->prepare('SELECT * FROM api_key WHERE id=? AND tenant_id=? AND is_active=1'); $old->execute([$id, $tenant]); $row = $old->fetch(\PDO::FETCH_ASSOC); } catch (\Throwable $e) { $row = null; }
        if (!$row) return self::json($res, ['ok' => false, 'error' => '활성 키를 찾을 수 없습니다.'], 404);
        $raw  = 'genie_key_' . bin2hex(random_bytes(16));
        $pfx  = substr($raw, 0, 16);
        $hash = hash('sha256', $raw);
        try {
            $pdo->prepare('UPDATE api_key SET is_active=0 WHERE id=?')->execute([$id]);
            $pdo->prepare('INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
                ->execute([$tenant, $pfx, $hash, (string)$row['name'] . ' (rotated)', $row['role'], $row['scopes_json'], 1, $row['expires_at'], self::now()]);
            $newId = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => '키 회전 중 오류가 발생했습니다.'], 500); }
        self::audit($req, 'api_key_rotate', "API 키 회전 #{$id}→#{$newId}", 'high', $caller);
        return self::json($res, ['ok' => true, 'revoked_id' => $id, 'new_id' => $newId, 'api_key' => $raw, 'key_prefix' => $pfx, 'warning' => '이 키는 다시 표시되지 않습니다. 안전하게 보관하세요.']);
    }

    // ═════════════════════════════════════════════════════════════
    // 189차+ 인앱 알림센터 서버백킹 (기기 간 동기화)
    //   기존 localStorage 전용 → user_notification 테이블. 본인 알림 CRUD.
    // ═════════════════════════════════════════════════════════════
    private static function ensureNotifSchema(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $driver = (string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            $idCol = $driver === 'mysql' ? 'id INT AUTO_INCREMENT PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT';
            $pdo->exec("CREATE TABLE IF NOT EXISTS user_notification ($idCol, user_id INT, tenant_id VARCHAR(64), type VARCHAR(32), title TEXT, body TEXT, link VARCHAR(255), is_read TINYINT DEFAULT 0, created_at VARCHAR(32))");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_user_notif_uid ON user_notification(user_id)");
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /** 서버측 이벤트가 알림을 적재할 때 쓰는 헬퍼(best-effort). */
    public static function notify(\PDO $pdo, int $userId, string $tenant, string $type, string $title, string $body = '', string $link = ''): void
    {
        try {
            self::ensureNotifSchema($pdo);
            $pdo->prepare('INSERT INTO user_notification(user_id,tenant_id,type,title,body,link,is_read,created_at) VALUES(?,?,?,?,?,?,0,?)')
                ->execute([$userId, $tenant, $type, $title, $body, $link, self::now()]);
        } catch (\Throwable $e) {}
    }

    private static function notifMap(array $r): array
    {
        return [
            'id'   => (string)($r['id'] ?? ''),
            'type' => (string)($r['type'] ?? 'system'),
            'title'=> (string)($r['title'] ?? ''),
            'body' => (string)($r['body'] ?? ''),
            'link' => (string)($r['link'] ?? ''),
            'time' => (string)($r['created_at'] ?? ''),
            'read' => (int)($r['is_read'] ?? 0) === 1,
        ];
    }

    /** GET /auth/notifications — 본인 알림(최신 100). */
    public static function notifList(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureNotifSchema($pdo);
        try {
            $st = $pdo->prepare('SELECT id,type,title,body,link,is_read,created_at FROM user_notification WHERE user_id=? ORDER BY id DESC LIMIT 100');
            $st->execute([(int)$user['id']]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { $rows = []; }
        $out = array_map([self::class, 'notifMap'], $rows);
        $unread = 0; foreach ($out as $o) if (!$o['read']) $unread++;
        return self::json($res, ['ok' => true, 'notifications' => $out, 'unread' => $unread]);
    }

    /** POST /auth/notifications {type,title,body?,link?} — 본인 알림 적재. */
    public static function notifCreate(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureNotifSchema($pdo);
        $b = self::readBody($req);
        $title = trim((string)($b['title'] ?? ''));
        if ($title === '') return self::json($res, ['ok' => false, 'error' => '제목이 필요합니다.'], 422);
        $tenant = self::resolveTenantId($pdo, $user);
        try {
            $pdo->prepare('INSERT INTO user_notification(user_id,tenant_id,type,title,body,link,is_read,created_at) VALUES(?,?,?,?,?,?,0,?)')
                ->execute([(int)$user['id'], $tenant, (string)($b['type'] ?? 'system'), $title, (string)($b['body'] ?? ''), (string)($b['link'] ?? ''), self::now()]);
            $id = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => '알림 저장 오류'], 500); }
        return self::json($res, ['ok' => true, 'id' => (string)$id]);
    }

    /** POST /auth/notifications/read {id?} — id 지정 시 해당, 없으면 전체 읽음. */
    public static function notifRead(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureNotifSchema($pdo);
        $b = self::readBody($req);
        $id = $b['id'] ?? null;
        try {
            if ($id !== null && $id !== '') {
                $pdo->prepare('UPDATE user_notification SET is_read=1 WHERE user_id=? AND id=?')->execute([(int)$user['id'], (int)$id]);
            } else {
                $pdo->prepare('UPDATE user_notification SET is_read=1 WHERE user_id=?')->execute([(int)$user['id']]);
            }
        } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true]);
    }

    /** DELETE /auth/notifications/{id} — 1건 삭제. */
    public static function notifDelete(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureNotifSchema($pdo);
        try { $pdo->prepare('DELETE FROM user_notification WHERE user_id=? AND id=?')->execute([(int)$user['id'], (int)($args['id'] ?? 0)]); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true]);
    }

    /** POST /auth/notifications/clear — 전체 삭제. */
    public static function notifClear(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $user = self::userByToken((string)(self::extractToken($req) ?? ''));
        if (!$user) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::ensureNotifSchema($pdo);
        try { $pdo->prepare('DELETE FROM user_notification WHERE user_id=?')->execute([(int)$user['id']]); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true]);
    }
}
