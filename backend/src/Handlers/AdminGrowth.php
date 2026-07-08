<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;
use Genie\Handlers\ClaudeAI;

/**
 * AdminGrowth — 236차 신규.
 *
 * "GeniegoROI Admin Growth Automation" — 플랫폼 운영사가 GeniegoROI 자체를 마케팅
 * 자동화로 성장시키는 내부 Growth Command Center.
 *
 * ★중복 구현 0 원칙 (조사 근거: 236차 전수 탐색):
 *   - AI 콘텐츠 생성  → ClaudeAI::complete() 재사용 (신규 AI 플러밍 없음)
 *   - 광고 집행 어댑터 → AdAdapters (Meta/Google/TikTok/Naver/Kakao/LINE) 재사용
 *   - 자격증명 Vault   → channel_credential 테이블 재사용
 *   - 감사 로그        → audit_log 테이블 재사용 (action 'growth.*' prefix)
 *   - Admin 인증       → UserAuth::requirePlan('admin') 재사용 (FE 숨김 아닌 서버 검증)
 *   - 라우트 bypass    → /v424/admin/* 는 index.php 에서 이미 세션 admin bypass
 *
 *   고객용 마케팅 자동화(AutoCampaign/CRM/JourneyBuilder/Attribution 등)는 테넌트
 *   스코프 격리되어 있다. Admin 플랫폼 성장 데이터는 예약 테넌트 'platform_growth'
 *   로 격리 → 기존 테넌트 격리 메커니즘을 무료 재사용하면서 고객 데이터와 완전 분리.
 *
 *   진짜 부재였던 엔티티만 신설: admin_growth_segment/lead/event/campaign/approval/setting.
 *
 * 라우트: /v424/admin/growth/* (+ /api 변형). 전부 requirePlan('admin') 게이트.
 * 응답: 표준 봉투 {success,data,message,error,meta}.
 */
final class AdminGrowth
{
    /** 예약 격리 테넌트 — 고객 테넌트와 절대 충돌 불가. */
    private const TENANT  = 'platform_growth';
    private const VERSION = 'v424.growth';

    /** 퍼널 단계(순서 = 전환 흐름). */
    private const FUNNEL = [
        'visitor', 'landing', 'download', 'inquiry', 'demo',
        'trial', 'onboarded', 'paid', 'active', 'upsell',
    ];

    /** 리드 스코어링 가중치 (행동 → 점수). 실제 추적 이벤트만 사용. */
    private const SCORE_WEIGHTS = [
        'visit'       => 2,   // 사이트 방문
        'landing'     => 5,   // 랜딩페이지 조회
        'pricing'     => 15,  // 가격 페이지 조회
        'download'    => 10,  // 콘텐츠 다운로드
        'inquiry'     => 18,  // 문의
        'email_open'  => 5,
        'email_click' => 10,
        'demo'        => 30,  // 데모 신청
        'trial'       => 25,  // 무료 체험 가입
        'login'       => 3,
        'feature_use' => 4,
        'invite'      => 15,  // 팀원 초대
        'checkout'    => 20,  // 결제 페이지 진입
        'consult'     => 25,  // 상담 예약
        'paid'        => 0,   // 단계 전환(점수보다 grade override)
        'onboarded'   => 8,
        'active'      => 6,
        'upsell'      => 0,
    ];

    // ─────────────────────────────────────────── 스키마

    private static function ensureTables(\PDO $pdo): void
    {
        $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $AI = ($drv === 'mysql') ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

        // 타겟 영업 세그먼트 라이브러리 (Pain Point/메시지/추정 CAC·LTV = 기획 벤치마크).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_segment (
            id $AI,
            seg_key TEXT, name TEXT, industry TEXT,
            pain_point TEXT, key_message TEXT,
            channels_json TEXT, landing TEXT, email_seq TEXT, demo_scenario TEXT,
            est_conv_rate REAL DEFAULT 0, est_cac REAL DEFAULT 0, est_ltv REAL DEFAULT 0,
            monthly_value REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1, sort INTEGER DEFAULT 0,
            created_at TEXT, updated_at TEXT
        )");

        // GeniegoROI 자체 리드 (고객사 리드와 완전 분리).
        // ★MySQL 호환: TEXT 컬럼은 DEFAULT/PRIMARY KEY 불가 → 상태성 짧은 컬럼은 VARCHAR 사용.
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_lead (
            id $AI,
            email TEXT, name TEXT, company TEXT, phone TEXT,
            segment_key TEXT, source TEXT,
            stage VARCHAR(20) DEFAULT 'visitor', score INTEGER DEFAULT 0, grade VARCHAR(20) DEFAULT 'cold',
            owner TEXT, notes TEXT,
            mrr REAL DEFAULT 0,
            last_activity_at TEXT, created_at TEXT, updated_at TEXT
        )");
        // [254차 감사] email 중복 리드 방지 — UNIQUE 인덱스(best-effort·멱등). 공개 capture 더블서밋/봇 동시도착 시
        //   recordEvent 의 SELECT-then-INSERT TOCTOU 로 중복 리드 생성되던 것을 DB 레벨에서 차단. recordEvent 는
        //   INSERT 충돌 시 재조회로 graceful 처리. 기존 중복행 존재 테이블에선 ALTER 가 실패하나 무해(catch).
        //   ★MySQL TEXT 컬럼은 prefix 길이(191) 필수, SQLite 는 IF NOT EXISTS 지원.
        try {
            if ($drv === 'mysql') $pdo->exec("ALTER TABLE admin_growth_lead ADD UNIQUE INDEX uq_agl_email (email(191))");
            else                  $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_agl_email ON admin_growth_lead(email)");
        } catch (\Throwable $e) { /* 이미 존재 or 기존 중복행 → 무해 */ }

        // 퍼널/터치포인트 이벤트 (스코어링·퍼널·어트리뷰션 구동).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_event (
            id $AI,
            lead_id INTEGER DEFAULT 0, email TEXT,
            event_type TEXT, channel TEXT, campaign_key TEXT,
            variant VARCHAR(40) DEFAULT '',
            value REAL DEFAULT 0,
            occurred_at TEXT, meta_json TEXT
        )");
        // [Phase2 ③] 기존 설치 멱등 보강 — variant 컬럼(성장 A/B 측정). 이미 있으면 무시.
        try { $pdo->exec("ALTER TABLE admin_growth_event ADD COLUMN variant VARCHAR(40) DEFAULT ''"); } catch (\Throwable $e) {}

        // [현 차수 P2] 공개 capture 레이트리밋 원장(IP 고정창 카운터) — 비인증 /v424/growth/capture 자기오염
        //   (가짜 리드 대량주입으로 플랫폼 자체 성장분석·리드스코어·A/B verdict 왜곡) 방어. CRO 비콘과 동일 '원장+레이트'
        //   패턴. ★platform_growth 자체 퍼널 보호용(고객 테넌트 데이터 무관)·앱레벨 심층방어(nginx limit_req 보완).
        $pdo->exec("CREATE TABLE IF NOT EXISTS growth_capture_rl (
            ip_hash VARCHAR(64) PRIMARY KEY, win_start INTEGER DEFAULT 0, cnt INTEGER DEFAULT 0
        )");

        // 플랫폼 홍보 캠페인 (mode=test/live, 승인·AI콘텐츠 상태).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_campaign (
            id $AI,
            camp_key TEXT, name TEXT, objective TEXT,
            segment_key TEXT, channels_json TEXT, budget REAL DEFAULT 0,
            design_ids TEXT,
            mode VARCHAR(10) DEFAULT 'test', status VARCHAR(30) DEFAULT 'draft',
            content_json TEXT, est_json TEXT,
            spend REAL DEFAULT 0, revenue REAL DEFAULT 0,
            created_by TEXT, created_at TEXT, updated_at TEXT
        )");
        // [Phase2 소재] 기존 설치 멱등 보강 — design_ids(광고 소재 ad_design.id 배열). 이미 있으면 무시.
        try { $pdo->exec("ALTER TABLE admin_growth_campaign ADD COLUMN design_ids TEXT"); } catch (\Throwable $e) {}

        // 승인 큐 (AI콘텐츠/캠페인실행/메시지/예산/최적화/Live전환).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_approval (
            id $AI,
            ref_type VARCHAR(40), ref_id INTEGER DEFAULT 0, ref_key TEXT,
            summary TEXT, payload_json TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            requested_by TEXT, decided_by TEXT, decided_at TEXT,
            created_at TEXT
        )");

        // 설정 (mode 등) — key/value.
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_setting (
            skey VARCHAR(64) PRIMARY KEY, svalue TEXT, updated_at TEXT
        )");

        // audit_log 는 기존 테이블 재사용 (없으면 생성 — Db::migrate 가 보통 선행).
        $pdo->exec("CREATE TABLE IF NOT EXISTS audit_log (
            id $AI, actor TEXT, action TEXT, details_json TEXT, created_at TEXT
        )");
    }

    // ─────────────────────────────────────────── 공용 헬퍼

    private static function json(Response $res, $data, string $msg = '', int $code = 200, ?array $err = null): Response
    {
        $body = [
            'success' => $err === null,
            'data'    => $err === null ? $data : null,
            'message' => $msg,
            'error'   => $err,
            'meta'    => [
                'request_id' => bin2hex(random_bytes(8)),
                'timestamp'  => gmdate('c'),
                'version'    => self::VERSION,
            ],
        ];
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    private static function fail(Response $res, string $detail, string $codeStr = 'ERROR', int $http = 400): Response
    {
        return self::json($res, null, $detail, $http, ['code' => $codeStr, 'detail' => $detail]);
    }

    private static function body(Request $req): array
    {
        $b = $req->getParsedBody();
        if (is_array($b)) return $b;
        $raw = (string)$req->getBody();
        $j = json_decode($raw, true);
        return is_array($j) ? $j : [];
    }

    private static function actor(Request $req): string
    {
        $u = UserAuth::authedUser($req);
        return $u ? (string)($u['email'] ?? ('user#' . ($u['id'] ?? '?'))) : 'admin';
    }

    private static function audit(\PDO $pdo, string $actor, string $action, array $details): void
    {
        try {
            $st = $pdo->prepare("INSERT INTO audit_log (actor, action, details_json, created_at) VALUES (?,?,?,?)");
            $st->execute([$actor, 'growth.' . $action, json_encode($details, JSON_UNESCAPED_UNICODE), gmdate('c')]);
        } catch (\Throwable $e) { /* 감사 실패가 본 작업을 막지 않음 */ }
    }

    private static function getSetting(\PDO $pdo, string $k, string $def): string
    {
        try {
            $st = $pdo->prepare("SELECT svalue FROM admin_growth_setting WHERE skey=?");
            $st->execute([$k]);
            $v = $st->fetchColumn();
            return $v === false ? $def : (string)$v;
        } catch (\Throwable $e) { return $def; }
    }

    private static function setSetting(\PDO $pdo, string $k, string $v): void
    {
        $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $sql = ($drv === 'mysql')
            ? "INSERT INTO admin_growth_setting (skey,svalue,updated_at) VALUES (?,?,?)
               ON DUPLICATE KEY UPDATE svalue=VALUES(svalue), updated_at=VALUES(updated_at)"
            : "INSERT INTO admin_growth_setting (skey,svalue,updated_at) VALUES (?,?,?)
               ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue, updated_at=excluded.updated_at";
        $pdo->prepare($sql)->execute([$k, $v, gmdate('c')]);
    }

    private static function mode(\PDO $pdo): string
    {
        $m = strtolower(trim(self::getSetting($pdo, 'mode', 'test')));
        return $m === 'live' ? 'live' : 'test';
    }

    /** 리드 점수 → 등급. stage 가 우선(trial/paid/upsell). */
    private static function gradeFor(int $score, string $stage): string
    {
        $stage = strtolower($stage);
        if (in_array($stage, ['upsell'], true)) return 'expansion';
        if (in_array($stage, ['paid', 'active'], true)) return 'paid';
        if (in_array($stage, ['trial', 'onboarded'], true)) return 'trial';
        if ($score >= 80) return 'sql';
        if ($score >= 50) return 'hot';
        if ($score >= 20) return 'warm';
        return 'cold';
    }

    /** 이벤트 누계로 리드 점수 재계산 + 최고 도달 stage 갱신. */
    private static function rescore(\PDO $pdo, int $leadId): array
    {
        $st = $pdo->prepare("SELECT event_type, value, occurred_at FROM admin_growth_event WHERE lead_id=? ORDER BY id ASC");
        $st->execute([$leadId]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $score = 0; $lastAt = ''; $reachedIdx = 0; $mrr = 0.0;
        // [272차 H-P1] 구독 종결(churn/refund) 추적 — 시간순 마지막 라이프사이클 상태로 MRR/stage 역분개.
        //   rescore 는 원래 '최고 도달 stage + max MRR' 단조증가라 취소/환불이 반영 안 돼 성장콘솔 MRR/revenue/LTV
        //   가 과대였다. paid/upsell 후 churn/refund 가 최신이면 churned 로 강등하고 MRR=0(revenue 집계서 제외).
        $churned = false;
        foreach ($rows as $r) {
            $et = strtolower((string)$r['event_type']);
            $score += (int)(self::SCORE_WEIGHTS[$et] ?? 0);
            $lastAt = (string)($r['occurred_at'] ?? $lastAt);
            $fi = array_search($et, self::FUNNEL, true);
            if ($fi !== false && $fi > $reachedIdx) $reachedIdx = $fi;
            if (in_array($et, ['paid', 'upsell'], true)) { $mrr = max($mrr, (float)($r['value'] ?? 0)); $churned = false; }
            if (in_array($et, ['churn', 'refund', 'cancel'], true)) $churned = true;
        }
        $score = max(0, min(100, $score));
        $stage = self::FUNNEL[$reachedIdx] ?? 'visitor';
        if ($churned) { $stage = 'churned'; $mrr = 0.0; } // 종결 시 revenue 집계(stage IN paid/active/upsell)서 제외
        $grade = self::gradeFor($score, $stage);
        $upd = $pdo->prepare("UPDATE admin_growth_lead SET score=?, grade=?, stage=?, mrr=?, last_activity_at=?, updated_at=? WHERE id=?");
        $upd->execute([$score, $grade, $stage, $mrr, $lastAt ?: gmdate('c'), gmdate('c'), $leadId]);
        return ['score' => $score, 'grade' => $grade, 'stage' => $stage, 'mrr' => $mrr];
    }

    // ─────────────────────────────────────────── 실 획득 이벤트 자동 적재(폐루프 입구)

    /**
     * [현 차수 초고도화] 실 제품 이벤트(가입·결제 등)를 platform_growth 성장 퍼널에 자동 적재.
     *   기존엔 admin 수동 입력만 가능해 퍼널/CAC/LTV/MRR 이 비실측이었다. 이제 실제 회원 행동이 자동으로
     *   리드 생성·이벤트 기록·스코어링·단계전이로 이어져 플랫폼 자체 마케팅 자동화가 "진짜 성과"를 반영한다.
     *   ★완전 비차단: 어떤 예외도 호출측(가입/결제 sacred 경로)을 절대 막지 않는다.
     *   ★격리: TENANT='platform_growth' 전용 테이블만 사용(고객 테넌트 데이터 무관).
     *   @param array $ctx name/company/phone/source/channel/segment_key/campaign_key/value/meta
     *   @return int lead_id (0=무시)
     */
    public static function recordEvent(\PDO $pdo, string $email, string $eventType, array $ctx = []): int
    {
        $email = strtolower(trim($email));
        $eventType = strtolower(trim($eventType));
        if ($email === '' || $eventType === '' || !str_contains($email, '@')) return 0;
        try {
            self::ensureTables($pdo);
            $now = gmdate('c');
            // 1) 리드 upsert(email 기준, 대소문자 무관).
            $st = $pdo->prepare("SELECT id FROM admin_growth_lead WHERE LOWER(email)=? LIMIT 1");
            $st->execute([$email]);
            $lid = (int)($st->fetchColumn() ?: 0);
            if ($lid === 0) {
                // [254차 감사] UNIQUE(email) 충돌(동시 캡처) 시 INSERT 실패 → 재조회로 graceful(중복 리드 0).
                try {
                    $ins = $pdo->prepare("INSERT INTO admin_growth_lead(email,name,company,phone,segment_key,source,stage,score,grade,mrr,created_at,updated_at,last_activity_at) VALUES(?,?,?,?,?,?,?,0,'cold',0,?,?,?)");
                    $ins->execute([$email, (string)($ctx['name'] ?? ''), (string)($ctx['company'] ?? ''), (string)($ctx['phone'] ?? ''),
                        (string)($ctx['segment_key'] ?? ''), (string)($ctx['source'] ?? 'product'), 'visitor', $now, $now, $now]);
                    $lid = (int)$pdo->lastInsertId();
                } catch (\Throwable $e) {
                    $rq = $pdo->prepare("SELECT id FROM admin_growth_lead WHERE LOWER(email)=? LIMIT 1");
                    $rq->execute([$email]); $lid = (int)($rq->fetchColumn() ?: 0);
                }
            } else {
                // 기존 리드 빈 필드만 보강(기존 값 우선 — 덮어쓰기 금지).
                if (!empty($ctx['name']) || !empty($ctx['company']) || !empty($ctx['phone'])) {
                    $pdo->prepare("UPDATE admin_growth_lead SET name=COALESCE(NULLIF(name,''),?), company=COALESCE(NULLIF(company,''),?), phone=COALESCE(NULLIF(phone,''),?), updated_at=? WHERE id=?")
                        ->execute([(string)($ctx['name'] ?? ''), (string)($ctx['company'] ?? ''), (string)($ctx['phone'] ?? ''), $now, $lid]);
                }
            }
            if ($lid === 0) return 0;
            // 2) 터치포인트 이벤트 기록(스코어링·퍼널·어트리뷰션·A/B 구동).
            $pdo->prepare("INSERT INTO admin_growth_event(lead_id,email,event_type,channel,campaign_key,variant,value,occurred_at,meta_json) VALUES(?,?,?,?,?,?,?,?,?)")
                ->execute([$lid, $email, $eventType, (string)($ctx['channel'] ?? 'product'), (string)($ctx['campaign_key'] ?? ''),
                    substr((string)($ctx['variant'] ?? ''), 0, 40),
                    (float)($ctx['value'] ?? 0), $now, json_encode($ctx['meta'] ?? [], JSON_UNESCAPED_UNICODE)]);
            // 3) 누계 재스코어링(단계전이·등급 자동 갱신).
            self::rescore($pdo, $lid);
            self::audit($pdo, 'system', 'event.' . $eventType, ['email' => $email, 'lead_id' => $lid, 'value' => (float)($ctx['value'] ?? 0)]);
            // 4) [Phase2 ①] 능동 자동화 — 가입 시 환영 너처(기본 OFF·승인후 자동). 비차단.
            if ($eventType === 'trial') self::maybeNurtureWelcome($pdo, $email, (string)($ctx['name'] ?? ''));
            // 5) [254차 #7] 비주얼 저니빌더 브리지 — platform_growth 리드를 crm_customers(예약테넌트)로 미러 후
            //    기존 JourneyBuilder::enrollByTrigger 재사용(신규코드 0·완전 격리). admin 이 그로스센터(act-as platform_growth)
            //    에서 signup/purchase 트리거 비주얼 저니를 만들면 가입·결제 즉시 자동 진입(미정의 시 enrollByTrigger=no-op).
            //    maybeNurtureWelcome(단순 Mailer)와 병행 — 저니빌더는 다단계/대기/분기/A-B 까지 확장 가능한 상위 레이어.
            if ($eventType === 'trial' || $eventType === 'paid') {
                $cid = self::mirrorLeadToCrm($pdo, $email, (string)($ctx['name'] ?? ''), (string)($ctx['phone'] ?? ''));
                if ($cid > 0) {
                    $trigger = $eventType === 'paid' ? 'purchase' : 'signup';
                    $jctx = $eventType === 'paid' ? ['revenue' => (float)($ctx['value'] ?? 0)] : [];
                    try { \Genie\Handlers\JourneyBuilder::enrollByTrigger($pdo, self::TENANT, $trigger, $cid, $jctx); } catch (\Throwable $e) {}
                }
            }
            return $lid;
        } catch (\Throwable $e) { return 0; }
    }

    /** [254차 #7] platform_growth 리드를 crm_customers(tenant=platform_growth)로 email 기준 멱등 미러.
     *   JourneyBuilder/세그먼트가 crm_customers.id(INT)를 요구하므로 브리지 역할. 반환=crm_customers.id(실패 0).
     *   ★예약테넌트 격리: 실 고객 테넌트와 절대 혼입 안 됨(tenant_id='platform_growth' 고정). */
    private static function mirrorLeadToCrm(\PDO $pdo, string $email, string $name, string $phone): int
    {
        $email = strtolower(trim($email));
        if ($email === '' || !str_contains($email, '@')) return 0;
        $tenant = self::TENANT;
        try {
            try { \Genie\Handlers\CRM::ensureTables(); } catch (\Throwable $e) {}
            $now = gmdate('Y-m-d H:i:s');   // crm_customers.created_at 포맷 정합(CRM::now)
            $st = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=? AND LOWER(email)=? LIMIT 1");
            $st->execute([$tenant, $email]);
            $id = (int)($st->fetchColumn() ?: 0);
            if ($id > 0) {
                if ($name !== '' || $phone !== '') {
                    $pdo->prepare("UPDATE crm_customers SET name=COALESCE(NULLIF(name,''),?), phone=COALESCE(NULLIF(phone,''),?), updated_at=? WHERE id=? AND tenant_id=?")
                        ->execute([$name, $phone, $now, $id, $tenant]);
                }
                return $id;
            }
            $pdo->prepare("INSERT INTO crm_customers (tenant_id, email, name, phone, grade, tags, memo, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
                ->execute([$tenant, $email, $name, $phone, 'normal', '[]', 'platform_growth lead', $now, $now]);
            return (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            // 경합(동시 가입)으로 UNIQUE 충돌 시 재조회.
            try {
                $st = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=? AND LOWER(email)=? LIMIT 1");
                $st->execute([$tenant, $email]);
                return (int)($st->fetchColumn() ?: 0);
            } catch (\Throwable $e2) { return 0; }
        }
    }

    /** 실 가입(=무료체험 시작) 자동 적재. UserAuth::register 비차단 훅. */
    public static function recordSignup(\PDO $pdo, string $email, string $name = '', array $ctx = []): int
    {
        return self::recordEvent($pdo, $email, 'trial', array_merge(['name' => $name, 'source' => 'signup', 'channel' => 'organic'], $ctx));
    }

    /** 실 결제 전환(MRR=월환산 value) 자동 적재. Paddle::onSubscriptionActivated 비차단 훅. */
    public static function recordPaid(\PDO $pdo, string $email, float $mrr, array $ctx = []): int
    {
        return self::recordEvent($pdo, $email, 'paid', array_merge(['value' => $mrr, 'source' => 'subscription', 'channel' => 'product'], $ctx));
    }

    /** [272차 H-P1] 구독 취소/환불 역분개 — churn 이벤트 적재 → rescore 가 stage=churned·MRR=0 으로 강등.
     *   Paddle::onSubscriptionCanceled / refund 비차단 훅. platform_growth 자체지표(고객 P&L 무관·격리). */
    public static function recordChurn(\PDO $pdo, string $email, string $reason = 'canceled', array $ctx = []): int
    {
        return self::recordEvent($pdo, $email, 'churn', array_merge(['value' => 0, 'source' => 'subscription', 'channel' => 'product', 'meta' => ['reason' => $reason]], $ctx));
    }

    /**
     * [Phase2 ①] 가입 환영 너처 자동발송 — ★기본 OFF(setting auto_nurture). auto_nurture='on' AND mode='live'
     *   일 때만 실제 발송(사용자 승인 후 자동 운영). Mailer 미설정 시 honest 미발송. ★완전 비차단·발송결과 audit.
     *   실 사용자에게 메일이 나가는 민감 동작이라 이중 게이트(설정 토글 + Live 승인)로만 가동.
     */
    private static function maybeNurtureWelcome(\PDO $pdo, string $email, string $name): void
    {
        try {
            if (self::getSetting($pdo, 'auto_nurture', 'off') !== 'on') return;   // 기본 OFF
            if (self::mode($pdo) !== 'live') return;                              // Live 모드(승인 완료)에서만 실발송
            $nm = $name !== '' ? $name : '고객';
            $subject = '[GeniegoROI] 환영합니다 — 20일 무료로 전 광고매체 ROI를 한 곳에서';
            $html = self::welcomeEmailHtml($nm);
            $r = \Genie\Mailer::send($email, $subject, $html, ['pdo' => $pdo, 'from_name' => 'GeniegoROI']);
            self::audit($pdo, 'system', 'nurture.welcome', ['email' => $email, 'ok' => (bool)($r['ok'] ?? false), 'mode' => (string)($r['mode'] ?? '')]);
        } catch (\Throwable $e) { /* 비차단 */ }
    }

    private static function welcomeEmailHtml(string $name): string
    {
        $cta = 'https://www.genieroi.com/app-pricing';
        $n = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        return '<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">'
            . '<h2 style="color:#4f8ef7">' . $n . '님, GeniegoROI에 오신 것을 환영합니다 🎉</h2>'
            . '<p>20일 무료 체험으로 메타·구글·틱톡·네이버·카카오 등 <b>전 광고매체의 ROI를 한 곳</b>에서 분석하고,'
            . ' AI가 채널별 효과를 진단해 예산을 자동 최적화하는 마케팅 자동화를 경험해 보세요.</p>'
            . '<p style="margin:24px 0"><a href="' . $cta . '" style="background:#4f8ef7;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">지금 시작하기</a></p>'
            . '<p style="color:#94a3b8;font-size:12px">본 메일은 GeniegoROI 가입 안내입니다. 수신을 원치 않으시면 회신해 주세요.</p></div>';
    }

    /**
     * [Phase2 ④] GET /v424/admin/growth/channel-analysis — 모든 광고매체 종합 효과 분석(플랫폼 자체 가입 유입).
     *   ★AutoRecommend::effectivenessData('platform_growth') 재사용(중복0) — 진실 ROAS·CAC·전환·추세·자가학습 prior
     *   종합 효과점수로 최고/최저 매체 식별 + 채널별 액션(증액/회수). 플랫폼 자체 광고비를 가입 전환 기준으로 최적화.
     */
    public static function channelAnalysis(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $q = (array)$req->getQueryParams();
        $period = (string)($q['period'] ?? 'monthly');
        $data = \Genie\Handlers\AutoRecommend::effectivenessData(self::TENANT, $period, \Genie\I18n::lang($req));
        $data['tenant'] = self::TENANT;
        // [Phase2 ⑤] 가입 유입 어트리뷰션(첫터치 채널/소스 → 가입·유료·MRR·진실 CAC) 동봉.
        $data['acquisition'] = self::acquisitionByChannel($pdo);
        return self::json($res, $data, '채널 종합 효과 분석');
    }

    /**
     * [Phase2 ⑤] 가입 유입 어트리뷰션 — 리드 첫터치(최초 이벤트) 채널/소스 기준으로 가입(trial)·유료(paid)·MRR 귀속.
     *   채널별 진실 CAC = 광고비(performance_metrics, platform_growth) / 유료전환수. "어느 매체가 실제 가입을 유입시켰나".
     *   ★self-contained(admin_growth_event/lead) — 외부 의존 없이 정직 집계. MySQL/SQLite 공통 SQL.
     */
    private static function acquisitionByChannel(\PDO $pdo): array
    {
        $rows = [];
        try {
            // 첫터치 = 리드별 최소 id 이벤트의 channel. 채널별 리드/가입/유료/MRR 집계.
            $sql = "SELECT ft.channel ch,
                        COUNT(*) leads,
                        SUM(CASE WHEN l.stage IN ('trial','onboarded','paid','active','upsell') THEN 1 ELSE 0 END) signups,
                        SUM(CASE WHEN l.stage IN ('paid','active','upsell') THEN 1 ELSE 0 END) paid,
                        COALESCE(SUM(l.mrr),0) mrr
                    FROM admin_growth_lead l
                    JOIN (
                        SELECT e1.lead_id, e1.channel
                        FROM admin_growth_event e1
                        WHERE e1.id = (SELECT MIN(e2.id) FROM admin_growth_event e2 WHERE e2.lead_id = e1.lead_id)
                    ) ft ON ft.lead_id = l.id
                    GROUP BY ft.channel";
            $st = $pdo->query($sql);
            $acc = [];
            foreach (($st ? $st->fetchAll(\PDO::FETCH_ASSOC) : []) as $r) {
                $ch = (string)($r['ch'] ?? '') ?: 'unknown';
                $acc[$ch] = [
                    'channel' => $ch,
                    'leads' => (int)$r['leads'], 'signups' => (int)$r['signups'],
                    'paid' => (int)$r['paid'], 'mrr' => round((float)$r['mrr'], 0),
                    'spend' => 0.0,
                ];
            }
            // 채널별 광고비(platform_growth performance_metrics, 최근 90일) → 진실 CAC.
            try {
                $sp = $pdo->prepare("SELECT channel, COALESCE(SUM(spend),0) spend FROM performance_metrics
                    WHERE tenant_id=? AND date >= ? GROUP BY channel");
                $sp->execute([self::TENANT, gmdate('Y-m-d', time() - 90 * 86400)]);
                foreach ($sp->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                    $ch = (string)($r['channel'] ?? '') ?: 'unknown';
                    if (!isset($acc[$ch])) $acc[$ch] = ['channel' => $ch, 'leads' => 0, 'signups' => 0, 'paid' => 0, 'mrr' => 0.0, 'spend' => 0.0];
                    $acc[$ch]['spend'] = round((float)$r['spend'], 0);
                }
            } catch (\Throwable $e) {}
            foreach ($acc as &$a) {
                $a['cac'] = $a['paid'] > 0 ? round($a['spend'] / $a['paid'], 0) : 0;
                $a['signup_to_paid'] = $a['signups'] > 0 ? round($a['paid'] / $a['signups'] * 100, 1) : 0.0;
            }
            unset($a);
            $rows = array_values($acc);
            usort($rows, fn($x, $y) => $y['paid'] <=> $x['paid']);
        } catch (\Throwable $e) { $rows = []; }
        return $rows;
    }

    /**
     * [Phase2 ②] POST /v424/growth/capture — 공개(비인증) 방문/이메일 캡처 → platform_growth 리드 자동생성.
     *   랜딩·가격 페이지의 팝업/이메일 폼이 호출(퍼널 최상단 자동 유입). ★격리: platform_growth 전용 테이블만.
     *   ★안전: 이벤트 화이트리스트·이메일 검증·완전 비차단. A/B: variant(arm)·campaign_key 를 이벤트에 기록.
     */
    /** 클라이언트 IP(프록시 X-Forwarded-For 우선·첫 홉). */
    private static function clientIp(Request $req): string
    {
        $xff = trim($req->getHeaderLine('X-Forwarded-For'));
        if ($xff !== '') { $p = explode(',', $xff); return trim($p[0]); }
        $sp = $req->getServerParams();
        return (string)($sp['REMOTE_ADDR'] ?? '');
    }

    /** [현 차수 P2] 공개 capture 고정창(60s) IP 레이트리밋 — 한도 초과 시 false(가짜 리드 대량주입 차단).
     *   ★fail-open(레이트리밋 인프라 예외가 정상 캡처를 막지 않음). IP 부재=통과(검증불가). */
    private static function captureRateOk(\PDO $pdo, string $ip): bool
    {
        if ($ip === '') return true;
        $LIMIT = 20; $WIN = 60;
        try {
            $iph = hash('sha256', $ip);
            $now = time(); $bucket = $now - ($now % $WIN);
            $st = $pdo->prepare("SELECT win_start, cnt FROM growth_capture_rl WHERE ip_hash=? LIMIT 1");
            $st->execute([$iph]); $row = $st->fetch(\PDO::FETCH_ASSOC) ?: null;
            if ($row === null) {
                try { $pdo->prepare("INSERT INTO growth_capture_rl(ip_hash,win_start,cnt) VALUES(?,?,1)")->execute([$iph, $bucket]); } catch (\Throwable $e) {}
                return true;
            }
            if ((int)$row['win_start'] !== $bucket) {
                $pdo->prepare("UPDATE growth_capture_rl SET win_start=?, cnt=1 WHERE ip_hash=?")->execute([$bucket, $iph]);
                return true;
            }
            if ((int)$row['cnt'] >= $LIMIT) return false;
            $pdo->prepare("UPDATE growth_capture_rl SET cnt=cnt+1 WHERE ip_hash=?")->execute([$iph]);
            return true;
        } catch (\Throwable $e) { return true; }
    }

    public static function publicCapture(Request $req, Response $res): Response
    {
        $b = self::body($req);
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $event = strtolower(trim((string)($b['event'] ?? 'landing')));
        $allow = ['visit', 'landing', 'pricing', 'download', 'inquiry', 'demo', 'email_capture'];
        if (!in_array($event, $allow, true)) $event = 'landing';
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::json($res, ['captured' => false], '유효한 이메일이 필요합니다', 200);
        }
        try {
            $pdo = Db::pdo();
            self::ensureTables($pdo);
            // [현 차수 P2] IP 레이트리밋(자기오염 방어) — 한도 초과는 조용히 무시(200, 비차단 계약 유지).
            if (!self::captureRateOk($pdo, self::clientIp($req))) {
                return self::json($res, ['captured' => false], 'ok', 200);
            }
            $evt = $event === 'email_capture' ? 'landing' : $event;  // FUNNEL/SCORE_WEIGHTS 정합
            $lid = self::recordEvent($pdo, $email, $evt, [
                'name' => (string)($b['name'] ?? ''), 'company' => (string)($b['company'] ?? ''),
                'source' => substr((string)($b['source'] ?? 'landing_popup'), 0, 60),
                'channel' => substr((string)($b['channel'] ?? 'organic'), 0, 40),
                'campaign_key' => substr((string)($b['campaign_key'] ?? ''), 0, 60),
                'variant' => substr((string)($b['variant'] ?? ''), 0, 40),
                'meta' => ['page' => (string)($b['page'] ?? ''), 'ref' => (string)($b['ref'] ?? '')],
            ]);
            return self::json($res, ['captured' => $lid > 0, 'lead_id' => $lid], $lid > 0 ? '캡처 완료' : '무시', 200);
        } catch (\Throwable $e) { return self::json($res, ['captured' => false], 'ok', 200); }
    }

    /**
     * [Phase2 ③] GET /v424/admin/growth/ab-report?campaign=KEY — 성장 메시지/소재 A/B 결과.
     *   variant(arm)별 캡처(노출)·가입전환(conversions=해당 variant 첫터치 리드 중 trial+ 도달) 집계 →
     *   ★AbTesting::pickBest(베이지안 코어 재사용·중복0)로 승자·최고확률 산출. 데이터 기반 메시지 최적화.
     */
    public static function abReport(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $q = (array)$req->getQueryParams();
        $camp = trim((string)($q['campaign'] ?? ''));
        $variants = [];
        try {
            // 첫터치가 해당 campaign_key·variant 인 리드별: 노출(리드수) + 전환(trial+ 도달).
            $where = "ft.variant<>''";
            $bind = [];
            if ($camp !== '') { $where .= " AND ft.campaign_key=?"; $bind[] = $camp; }
            $sql = "SELECT ft.variant arm, COUNT(*) impressions,
                        SUM(CASE WHEN l.stage IN ('trial','onboarded','paid','active','upsell') THEN 1 ELSE 0 END) conversions,
                        SUM(CASE WHEN l.stage IN ('paid','active','upsell') THEN 1 ELSE 0 END) paid
                    FROM admin_growth_lead l
                    JOIN (
                        SELECT e1.lead_id, e1.variant, e1.campaign_key
                        FROM admin_growth_event e1
                        WHERE e1.id = (SELECT MIN(e2.id) FROM admin_growth_event e2 WHERE e2.lead_id = e1.lead_id)
                    ) ft ON ft.lead_id = l.id
                    WHERE $where
                    GROUP BY ft.variant";
            $st = $pdo->prepare($sql); $st->execute($bind);
            $i = 0;
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $variants[] = ['id' => ++$i, 'arm' => (string)$r['arm'],
                    'impressions' => (int)$r['impressions'], 'conversions' => (int)$r['conversions'], 'paid' => (int)$r['paid']];
            }
        } catch (\Throwable $e) { $variants = []; }
        $verdict = null;
        if (count($variants) >= 2) {
            $best = \Genie\Handlers\AbTesting::pickBest($variants);
            $byId = []; foreach ($variants as $v) $byId[$v['id']] = $v;
            $verdict = [
                'winner' => $byId[$best['winnerId']]['arm'] ?? null,
                'probability' => $best['prob'],
                'significant' => $best['prob'] >= 0.95,
                'rates' => $best['rates'],
                'note' => $best['prob'] >= 0.95 ? '통계적으로 유의미한 승자 — 승자 메시지로 전환 권장' : '표본 누적 중 — 유의수준(95%) 미달',
            ];
        }
        return self::json($res, ['campaign' => $camp, 'variants' => $variants, 'verdict' => $verdict], '성장 A/B 결과');
    }

    // ─────────────────────────────────────────── 대시보드 / 퍼널

    public static function dashboard(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);

        $funnel = self::computeFunnel($pdo);
        $leads  = self::leadGradeCounts($pdo);

        // 캠페인 집계
        $cs = $pdo->query("SELECT
            COUNT(*) c,
            SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) running,
            COALESCE(SUM(spend),0) spend,
            COALESCE(SUM(revenue),0) revenue
            FROM admin_growth_campaign")->fetch(\PDO::FETCH_ASSOC) ?: [];
        $pending = (int)$pdo->query("SELECT COUNT(*) FROM admin_growth_approval WHERE status='pending'")->fetchColumn();

        // 오늘 리드 / 이번달 데모
        $today = substr(gmdate('c'), 0, 10);
        $month = substr(gmdate('c'), 0, 7);
        $todayLeads = (int)self::scalar($pdo, "SELECT COUNT(*) FROM admin_growth_lead WHERE substr(created_at,1,10)=?", [$today]);
        $monthDemos = (int)self::scalar($pdo, "SELECT COUNT(*) FROM admin_growth_event WHERE event_type='demo' AND substr(occurred_at,1,7)=?", [$month]);

        $cards = [
            'todayLeads'      => $todayLeads,
            'monthDemos'      => $monthDemos,
            'trialSignups'    => $funnel['stages']['trial']['count'] ?? 0,
            'paidConversions' => $funnel['stages']['paid']['count'] ?? 0,
            'mrr'             => round((float)($cs['revenue'] ?? 0), 2),
            'cac'             => $funnel['cac'],
            'ltv'             => $funnel['ltv'],
            'trialToPaidRate' => $funnel['trialToPaid'],
            'roas'            => $funnel['roas'],
            'paybackMonths'   => $funnel['paybackMonths'],
            'hotLeads'        => ($leads['hot'] ?? 0) + ($leads['sql'] ?? 0),
            'runningCampaigns'=> (int)($cs['running'] ?? 0),
            'totalCampaigns'  => (int)($cs['c'] ?? 0),
            'pendingApprovals'=> $pending,
            'totalSpend'      => round((float)($cs['spend'] ?? 0), 2),
        ];

        return self::json($res, [
            'mode'        => self::mode($pdo),
            'cards'       => $cards,
            'funnel'      => $funnel,
            'leadGrades'  => $leads,
        ], '대시보드');
    }

    public static function funnel(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        return self::json($res, self::computeFunnel($pdo), '퍼널');
    }

    private static function computeFunnel(\PDO $pdo): array
    {
        // 단계별 도달 리드 수 = 해당 stage 이상 도달한 리드.
        $byStage = [];
        $st = $pdo->query("SELECT stage, COUNT(*) c FROM admin_growth_lead GROUP BY stage");
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) $byStage[(string)$r['stage']] = (int)$r['c'];

        // 누적(이상 도달) 계산
        $cum = [];
        $total = 0;
        foreach (array_reverse(self::FUNNEL) as $sg) { $total += ($byStage[$sg] ?? 0); $cum[$sg] = $total; }

        $stages = [];
        $prev = null;
        foreach (self::FUNNEL as $i => $sg) {
            $count = $cum[$sg] ?? 0;
            $convFromPrev = ($prev !== null && $prev > 0) ? round($count / $prev * 100, 1) : null;
            $stages[$sg] = ['index' => $i, 'count' => $count, 'convFromPrev' => $convFromPrev];
            $prev = $count;
        }

        $visitors = $stages['visitor']['count'] ?? 0;
        $trial    = $stages['trial']['count'] ?? 0;
        $paid     = $stages['paid']['count'] ?? 0;

        // 실제 추적값만: spend = running/완료 캠페인 합, revenue = paid 이벤트 value 합(MRR).
        $spend   = (float)self::scalar($pdo, "SELECT COALESCE(SUM(spend),0) FROM admin_growth_campaign", []);
        $revenue = (float)self::scalar($pdo, "SELECT COALESCE(SUM(mrr),0) FROM admin_growth_lead WHERE stage IN ('paid','active','upsell')", []);
        $avgMrr  = $paid > 0 ? $revenue / $paid : 0.0;

        $cac          = $paid > 0 ? round($spend / $paid, 2) : 0.0;
        $trialToPaid  = $trial > 0 ? round($paid / $trial * 100, 1) : 0.0;
        $roas         = $spend > 0 ? round($revenue / $spend, 2) : 0.0;
        $ltv          = self::estLtv($pdo, $avgMrr);
        $paybackMonths= $avgMrr > 0 ? round($cac / $avgMrr, 1) : 0.0;

        return [
            'stages'       => $stages,
            'order'        => self::FUNNEL,
            'visitors'     => $visitors,
            'spend'        => round($spend, 2),
            'revenue'      => round($revenue, 2),
            'cac'          => $cac,
            'ltv'          => $ltv,
            'trialToPaid'  => $trialToPaid,
            'roas'         => $roas,
            'paybackMonths'=> $paybackMonths,
            'netProfitRoi' => $spend > 0 ? round(($revenue - $spend) / $spend * 100, 1) : 0.0,
        ];
    }

    /** LTV 추정 = 평균 MRR × 예상 수명(개월). 세그먼트 평균 수명 사용, 기본 18개월. */
    private static function estLtv(\PDO $pdo, float $avgMrr): float
    {
        if ($avgMrr <= 0) return 0.0;
        $months = 18.0;
        try {
            $v = self::scalar($pdo, "SELECT AVG(CASE WHEN monthly_value>0 THEN est_ltv/monthly_value ELSE NULL END) FROM admin_growth_segment WHERE is_active=1", []);
            if ($v !== null && (float)$v > 0) $months = (float)$v;
        } catch (\Throwable $e) {}
        return round($avgMrr * $months, 2);
    }

    private static function leadGradeCounts(\PDO $pdo): array
    {
        $out = ['cold' => 0, 'warm' => 0, 'hot' => 0, 'sql' => 0, 'trial' => 0, 'paid' => 0, 'expansion' => 0];
        $st = $pdo->query("SELECT grade, COUNT(*) c FROM admin_growth_lead GROUP BY grade");
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
            $g = (string)$r['grade'];
            if (isset($out[$g])) $out[$g] = (int)$r['c'];
        }
        return $out;
    }

    private static function scalar(\PDO $pdo, string $sql, array $args)
    {
        $st = $pdo->prepare($sql); $st->execute($args);
        $v = $st->fetchColumn();
        return $v === false ? null : $v;
    }

    // ─────────────────────────────────────────── 세그먼트

    public static function segments(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $rows = $pdo->query("SELECT * FROM admin_growth_segment ORDER BY sort ASC, id ASC")->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) { $r['channels'] = json_decode((string)($r['channels_json'] ?? '[]'), true) ?: []; }
        return self::json($res, ['segments' => $rows, 'count' => count($rows)], '세그먼트');
    }

    public static function segmentSave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $now = gmdate('c');
        $id = (int)($b['id'] ?? 0);
        $channels = json_encode($b['channels'] ?? [], JSON_UNESCAPED_UNICODE);
        if ($id > 0) {
            $st = $pdo->prepare("UPDATE admin_growth_segment SET seg_key=?, name=?, industry=?, pain_point=?, key_message=?, channels_json=?, landing=?, email_seq=?, demo_scenario=?, est_conv_rate=?, est_cac=?, est_ltv=?, monthly_value=?, is_active=?, sort=?, updated_at=? WHERE id=?");
            $st->execute([
                (string)($b['seg_key'] ?? ''), (string)($b['name'] ?? ''), (string)($b['industry'] ?? ''),
                (string)($b['pain_point'] ?? ''), (string)($b['key_message'] ?? ''), $channels,
                (string)($b['landing'] ?? ''), (string)($b['email_seq'] ?? ''), (string)($b['demo_scenario'] ?? ''),
                (float)($b['est_conv_rate'] ?? 0), (float)($b['est_cac'] ?? 0), (float)($b['est_ltv'] ?? 0),
                (float)($b['monthly_value'] ?? 0), (int)($b['is_active'] ?? 1), (int)($b['sort'] ?? 0), $now, $id,
            ]);
        } else {
            $st = $pdo->prepare("INSERT INTO admin_growth_segment (seg_key,name,industry,pain_point,key_message,channels_json,landing,email_seq,demo_scenario,est_conv_rate,est_cac,est_ltv,monthly_value,is_active,sort,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([
                (string)($b['seg_key'] ?? ''), (string)($b['name'] ?? ''), (string)($b['industry'] ?? ''),
                (string)($b['pain_point'] ?? ''), (string)($b['key_message'] ?? ''), $channels,
                (string)($b['landing'] ?? ''), (string)($b['email_seq'] ?? ''), (string)($b['demo_scenario'] ?? ''),
                (float)($b['est_conv_rate'] ?? 0), (float)($b['est_cac'] ?? 0), (float)($b['est_ltv'] ?? 0),
                (float)($b['monthly_value'] ?? 0), (int)($b['is_active'] ?? 1), (int)($b['sort'] ?? 0), $now, $now,
            ]);
            $id = (int)$pdo->lastInsertId();
        }
        self::audit($pdo, self::actor($req), 'segment.save', ['id' => $id, 'name' => $b['name'] ?? '']);
        return self::json($res, ['id' => $id], '세그먼트 저장');
    }

    public static function segmentDelete(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $id = (int)($args['id'] ?? 0);
        $pdo->prepare("DELETE FROM admin_growth_segment WHERE id=?")->execute([$id]);
        self::audit($pdo, self::actor($req), 'segment.delete', ['id' => $id]);
        return self::json($res, ['id' => $id], '세그먼트 삭제');
    }

    /** 기본 타겟 세그먼트 17종 시드 (idempotent, 비어있을 때만). */
    public static function segmentSeed(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $existing = (int)$pdo->query("SELECT COUNT(*) FROM admin_growth_segment")->fetchColumn();
        if ($existing > 0) {
            return self::json($res, ['seeded' => 0, 'existing' => $existing], '이미 세그먼트가 존재하여 시드를 건너뜀');
        }
        $now = gmdate('c');
        $defs = self::defaultSegments();
        $st = $pdo->prepare("INSERT INTO admin_growth_segment (seg_key,name,industry,pain_point,key_message,channels_json,landing,email_seq,demo_scenario,est_conv_rate,est_cac,est_ltv,monthly_value,is_active,sort,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)");
        $i = 0;
        foreach ($defs as $d) {
            $st->execute([
                $d['seg_key'], $d['name'], $d['industry'], $d['pain_point'], $d['key_message'],
                json_encode($d['channels'], JSON_UNESCAPED_UNICODE), $d['landing'], $d['email_seq'], $d['demo_scenario'],
                $d['est_conv_rate'], $d['est_cac'], $d['est_ltv'], $d['monthly_value'], $i, $now, $now,
            ]);
            $i++;
        }
        self::audit($pdo, self::actor($req), 'segment.seed', ['count' => $i]);
        return self::json($res, ['seeded' => $i], "기본 세그먼트 {$i}종 시드 완료");
    }

    private static function defaultSegments(): array
    {
        $mk = function (string $key, string $name, string $ind, string $pain, string $msg, array $ch, float $conv, float $cac, float $ltv, float $mv) {
            return [
                'seg_key' => $key, 'name' => $name, 'industry' => $ind, 'pain_point' => $pain, 'key_message' => $msg,
                'channels' => $ch,
                'landing' => "/landing/{$key}", 'email_seq' => "{$key}_welcome",
                'demo_scenario' => "{$name} 대상 ROI 진단 데모",
                'est_conv_rate' => $conv, 'est_cac' => $cac, 'est_ltv' => $ltv, 'monthly_value' => $mv,
            ];
        };
        return [
            $mk('ecommerce_seller', '이커머스 셀러', 'commerce', '여러 마켓 주문·정산을 수기로 취합, 채널별 실수익을 모름', '30개 마켓을 한 화면에서 통합 손익·정산 자동 대사', ['google','meta','naver','kakao'], 3.5, 180, 3240, 180),
            $mk('mall_operator', '쇼핑몰 운영사', 'commerce', '광고비 대비 진짜 ROAS를 채널별로 증명하지 못함', '광고→주문 귀속(어트리뷰션)으로 진실 ROAS 자동 산출', ['google','meta','naver'], 3.0, 220, 4320, 240),
            $mk('logistics', '물류회사', 'logistics', '입출고·재고·배송 데이터가 분산되어 가시성 부족', 'WMS·주문허브 통합으로 실시간 재고·출고 자동화', ['linkedin','naver_blog','email'], 2.2, 320, 7200, 400),
            $mk('fulfillment', '풀필먼트 회사', 'logistics', '고객사별 정산·SLA 관리가 수작업', '멀티테넌트 정산·SLA 대시보드로 운영 자동화', ['linkedin','email'], 2.0, 350, 8640, 480),
            $mk('live_commerce', '라이브커머스 운영사', 'commerce', '방송 중 실시간 매출·재고 연동이 어려움', '라이브 커머스 SSE 실시간 대시보드+재고 자동 차감', ['youtube','instagram','tiktok'], 4.0, 160, 2880, 160),
            $mk('cosmetics_brand', '화장품 브랜드', 'brand', '재구매·CRM 세그먼트를 데이터로 운영 못함', 'RFM·여정 자동화로 재구매율을 데이터로 끌어올림', ['meta','instagram','kakao'], 3.8, 170, 3600, 200),
            $mk('fashion_brand', '패션 브랜드', 'brand', '시즌별 광고 크리에이티브 제작·집행이 느림', 'AI 디자인+멀티채널 집행으로 시즌 캠페인 가속', ['meta','instagram','tiktok'], 3.6, 175, 3240, 180),
            $mk('food_brand', '식품 브랜드', 'brand', '구독·정기배송 LTV를 추적/최적화 못함', '구독 LTV·이탈 위험 예측으로 정기배송 최적화', ['meta','naver','kakao'], 3.2, 190, 4320, 240),
            $mk('global_seller', '해외 판매 셀러', 'commerce', '통화·해외 마켓 정산이 비대칭이라 손익 왜곡', '통화 정규화·해외 마켓 정산 대사 자동화', ['google','meta','email'], 2.8, 240, 5040, 280),
            $mk('amazon_seller', 'Amazon 판매자', 'commerce', 'SP-API 수수료·정산 구조가 복잡해 실수익 불명', 'Amazon SP-API 수수료 분해+실수익 자동 산출', ['google','amazon_ads','email'], 3.0, 210, 4320, 240),
            $mk('yahoo_jp_seller', 'Yahoo Japan 판매자', 'commerce', '일본 마켓 정산·언어 장벽으로 운영 부담', 'Yahoo! JAPAN 연동+일본어 현지화 운영 자동화', ['yahoo_jp','line','email'], 2.6, 230, 4680, 260),
            $mk('rakuten_seller', 'Rakuten 판매자', 'commerce', '라쿠텐 포인트·수수료 구조 정산이 까다로움', 'Rakuten 정산·포인트 차감 자동 대사', ['rakuten','line','email'], 2.6, 235, 4680, 260),
            $mk('b2b_distributor', 'B2B 유통사', 'b2b', '거래처별 단가·정산·여신 관리가 수기', 'B2B 거래처 정산·여신·리포트 자동화', ['linkedin','email','naver'], 1.8, 380, 9600, 533),
            $mk('ad_agency', '광고대행사', 'agency', '다수 클라이언트 채널 성과 리포팅이 반복 노동', '멀티클라이언트 통합 리포트+화이트라벨 대시보드', ['linkedin','google','email'], 2.4, 300, 8640, 480),
            $mk('manufacturer', '제조사', 'b2b', 'D2C 전환 시 커머스 운영 노하우 부재', 'D2C 풀스택(광고~정산) 턴키 운영 자동화', ['linkedin','naver','email'], 1.6, 400, 10800, 600),
            $mk('wholesaler', '도매상', 'b2b', '오프라인 거래의 온라인 전환·재고 동기화 난항', '도매 재고 동기화+온라인 채널 확장 자동화', ['naver','email','kakao'], 1.8, 360, 8640, 480),
            $mk('distributor_agent', '총판/대리점', 'b2b', '본사-대리점 간 실적·정산 가시성 부족', '대리점 실적·정산 멀티테넌트 가시화', ['linkedin','email'], 1.7, 370, 9600, 533),
        ];
    }

    // ─────────────────────────────────────────── 리드 / 이벤트

    public static function leads(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $q = $req->getQueryParams();
        $where = []; $args = [];
        if (!empty($q['grade']))   { $where[] = 'grade=?';       $args[] = (string)$q['grade']; }
        if (!empty($q['stage']))   { $where[] = 'stage=?';       $args[] = (string)$q['stage']; }
        if (!empty($q['segment'])) { $where[] = 'segment_key=?'; $args[] = (string)$q['segment']; }
        $sql = "SELECT * FROM admin_growth_lead";
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY score DESC, id DESC LIMIT 500';
        $st = $pdo->prepare($sql); $st->execute($args);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return self::json($res, ['leads' => $rows, 'count' => count($rows)], '리드');
    }

    public static function leadSave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $email = trim((string)($b['email'] ?? ''));
        if ($email === '') return self::fail($res, '이메일은 필수입니다.', 'VALIDATION', 422);
        $now = gmdate('c');
        $id = (int)($b['id'] ?? 0);
        if ($id > 0) {
            $st = $pdo->prepare("UPDATE admin_growth_lead SET email=?, name=?, company=?, phone=?, segment_key=?, source=?, owner=?, notes=?, updated_at=? WHERE id=?");
            $st->execute([$email, (string)($b['name'] ?? ''), (string)($b['company'] ?? ''), (string)($b['phone'] ?? ''), (string)($b['segment_key'] ?? ''), (string)($b['source'] ?? ''), (string)($b['owner'] ?? ''), (string)($b['notes'] ?? ''), $now, $id]);
        } else {
            $st = $pdo->prepare("INSERT INTO admin_growth_lead (email,name,company,phone,segment_key,source,stage,score,grade,owner,notes,created_at,updated_at,last_activity_at) VALUES (?,?,?,?,?,?, 'visitor',0,'cold', ?,?,?,?,?)");
            $st->execute([$email, (string)($b['name'] ?? ''), (string)($b['company'] ?? ''), (string)($b['phone'] ?? ''), (string)($b['segment_key'] ?? ''), (string)($b['source'] ?? 'manual'), (string)($b['owner'] ?? ''), (string)($b['notes'] ?? ''), $now, $now, $now]);
            $id = (int)$pdo->lastInsertId();
        }
        self::audit($pdo, self::actor($req), 'lead.save', ['id' => $id, 'email' => $email]);
        return self::json($res, ['id' => $id], '리드 저장');
    }

    /** 리드 이벤트 기록 → 점수/등급/단계 자동 재계산 (스코어링 엔진). */
    public static function leadEvent(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $leadId = (int)($args['id'] ?? 0);
        $b = self::body($req);
        $et = strtolower(trim((string)($b['event_type'] ?? '')));
        if ($et === '') return self::fail($res, 'event_type은 필수입니다.', 'VALIDATION', 422);
        $lead = self::scalar($pdo, "SELECT email FROM admin_growth_lead WHERE id=?", [$leadId]);
        if ($lead === null) return self::fail($res, '리드를 찾을 수 없습니다.', 'NOT_FOUND', 404);
        $st = $pdo->prepare("INSERT INTO admin_growth_event (lead_id,email,event_type,channel,campaign_key,value,occurred_at,meta_json) VALUES (?,?,?,?,?,?,?,?)");
        $st->execute([$leadId, (string)$lead, $et, (string)($b['channel'] ?? ''), (string)($b['campaign_key'] ?? ''), (float)($b['value'] ?? 0), gmdate('c'), json_encode($b['meta'] ?? [], JSON_UNESCAPED_UNICODE)]);
        $scored = self::rescore($pdo, $leadId);
        self::audit($pdo, self::actor($req), 'lead.event', ['lead_id' => $leadId, 'event' => $et]);
        return self::json($res, ['lead_id' => $leadId, 'scored' => $scored], '이벤트 기록 + 재스코어링');
    }

    // ─────────────────────────────────────────── 캠페인 (AI 생성·승인·실행)

    public static function campaigns(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $rows = $pdo->query("SELECT * FROM admin_growth_campaign ORDER BY id DESC LIMIT 200")->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) {
            $r['channels'] = json_decode((string)($r['channels_json'] ?? '[]'), true) ?: [];
            $r['content']  = json_decode((string)($r['content_json'] ?? 'null'), true);
            $r['design_ids'] = json_decode((string)($r['design_ids'] ?? '[]'), true) ?: [];
        }
        unset($r);
        return self::json($res, ['campaigns' => $rows, 'count' => count($rows), 'mode' => self::mode($pdo)], '캠페인');
    }

    public static function campaignSave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $now = gmdate('c');
        $id = (int)($b['id'] ?? 0);
        $channels = json_encode($b['channels'] ?? [], JSON_UNESCAPED_UNICODE);
        // [Phase2 소재] 광고 소재(ad_design.id) 첨부 — 집행 시 buildDelivery 로 실제 이미지/영상 광고 생성.
        $designIds = json_encode(array_values(array_map('intval', (array)($b['design_ids'] ?? []))), JSON_UNESCAPED_UNICODE);
        if ($id > 0) {
            $st = $pdo->prepare("UPDATE admin_growth_campaign SET name=?, objective=?, segment_key=?, channels_json=?, budget=?, design_ids=?, updated_at=? WHERE id=?");
            $st->execute([(string)($b['name'] ?? ''), (string)($b['objective'] ?? ''), (string)($b['segment_key'] ?? ''), $channels, (float)($b['budget'] ?? 0), $designIds, $now, $id]);
        } else {
            $campKey = 'gcamp_' . substr(bin2hex(random_bytes(4)), 0, 8);
            $st = $pdo->prepare("INSERT INTO admin_growth_campaign (camp_key,name,objective,segment_key,channels_json,budget,design_ids,mode,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'draft', ?,?,?)");
            $st->execute([$campKey, (string)($b['name'] ?? ''), (string)($b['objective'] ?? ''), (string)($b['segment_key'] ?? ''), $channels, (float)($b['budget'] ?? 0), $designIds, self::mode($pdo), self::actor($req), $now, $now]);
            $id = (int)$pdo->lastInsertId();
        }
        self::audit($pdo, self::actor($req), 'campaign.save', ['id' => $id, 'name' => $b['name'] ?? '']);
        return self::json($res, ['id' => $id], '캠페인 저장');
    }

    /**
     * [Phase2 소재] GET /v424/admin/growth/designs — platform_growth 광고 소재 목록.
     *   ★기존 크리에이티브 엔진 재사용: 고객용과 동일한 ad_design 테이블을 platform_growth 스코프로 사용.
     *   campaignLaunch 가 design_ids → AdAdapters::buildDelivery 로 실제 이미지/영상 광고 생성에 소비.
     */
    public static function designs(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        try { \Genie\Handlers\ClaudeAI::migrateAdDesign($pdo); } catch (\Throwable $e) {}
        $rows = [];
        try {
            $st = $pdo->prepare("SELECT id,category,product,channel,svg,status,created_at FROM ad_design WHERE tenant_id=? ORDER BY id DESC LIMIT 120");
            $st->execute([self::TENANT]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$r) { $r['has_image'] = ((string)($r['svg'] ?? '') !== ''); unset($r['svg']); }
            unset($r);
        } catch (\Throwable $e) { $rows = []; }
        return self::json($res, ['designs' => $rows, 'count' => count($rows)], '플랫폼 광고 소재');
    }

    /**
     * [Phase2 소재] POST /v424/admin/growth/designs — platform_growth 광고 소재 저장(기존 크리에이티브 스튜디오 재사용).
     *   스튜디오가 생성한 design(spec)/svg(이미지 base64)를 platform_growth 테넌트로 저장 → 캠페인에 첨부.
     *   ★ad_design 스키마/소비경로(buildDelivery)는 고객용과 100% 동일(중복 구현 0·격리 유지).
     */
    public static function designSave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo();
        try { \Genie\Handlers\ClaudeAI::migrateAdDesign($pdo); } catch (\Throwable $e) {}
        $b = self::body($req);
        $design = is_array($b['design'] ?? null) ? $b['design'] : [];
        $channel = (string)($design['channel'] ?? ($b['channel'] ?? ''));
        if ($channel === '') return self::fail($res, '채널(channel)은 필수입니다.', 'VALIDATION', 422);
        $status = in_array((string)($b['status'] ?? 'approved'), ['draft', 'approved'], true) ? (string)($b['status'] ?? 'approved') : 'approved';
        $now = gmdate('Y-m-d\TH:i:s\Z');
        try {
            $st = $pdo->prepare('INSERT INTO ad_design(tenant_id,category,product,channel,spec_json,svg,status,created_at) VALUES(?,?,?,?,?,?,?,?)');
            $st->execute([
                self::TENANT,
                mb_substr((string)($b['category'] ?? 'GeniegoROI'), 0, 120),
                mb_substr((string)($b['product_description'] ?? 'AI 마케팅 ROI 플랫폼'), 0, 2000),
                $channel,
                json_encode($design, JSON_UNESCAPED_UNICODE),
                (string)($b['svg'] ?? $b['image'] ?? ''),
                $status, $now,
            ]);
            $id = (int)$pdo->lastInsertId();
            self::audit($pdo, self::actor($req), 'design.save', ['id' => $id, 'channel' => $channel]);
            return self::json($res, ['id' => $id, 'channel' => $channel, 'status' => $status], '플랫폼 광고 소재 저장');
        } catch (\Throwable $e) {
            return self::fail($res, '소재 저장 실패: ' . substr($e->getMessage(), 0, 120), 'SAVE_FAILED', 500);
        }
    }

    /**
     * AI 콘텐츠 생성 — ClaudeAI::complete() 재사용. 세그먼트 컨텍스트 기반 광고카피/
     * 이메일/SMS/알림톡/SNS 등 다채널 카피 생성. 생성 후 status='pending_approval'
     * + 승인 큐 등록(허위 성과 수치 금지 시스템 프롬프트).
     */
    public static function campaignGenerate(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $id = (int)($args['id'] ?? 0);
        $camp = $pdo->prepare("SELECT * FROM admin_growth_campaign WHERE id=?"); $camp->execute([$id]);
        $c = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$c) return self::fail($res, '캠페인을 찾을 수 없습니다.', 'NOT_FOUND', 404);

        $seg = null;
        if (!empty($c['segment_key'])) {
            $s = $pdo->prepare("SELECT * FROM admin_growth_segment WHERE seg_key=?"); $s->execute([$c['segment_key']]);
            $seg = $s->fetch(\PDO::FETCH_ASSOC) ?: null;
        }
        $b = self::body($req);
        $lang = (string)($b['lang'] ?? 'ko');

        $content = self::aiGenerateContent($c, $seg, $lang);

        $st = $pdo->prepare("UPDATE admin_growth_campaign SET content_json=?, status='pending_approval', updated_at=? WHERE id=?");
        $st->execute([json_encode($content, JSON_UNESCAPED_UNICODE), gmdate('c'), $id]);

        // 승인 큐 등록 (AI 생성 콘텐츠 승인 필수).
        self::createApproval($pdo, 'content', $id, (string)$c['camp_key'], "AI 콘텐츠 생성: {$c['name']}", ['content' => $content], self::actor($req));
        self::audit($pdo, self::actor($req), 'campaign.generate', ['id' => $id, 'ai' => $content['_source']]);
        return self::json($res, ['id' => $id, 'content' => $content, 'status' => 'pending_approval'], 'AI 콘텐츠 생성 — 승인 대기');
    }

    /** ClaudeAI::complete 재사용. 키 미설정 시 구조화 폴백(허위 성과 수치 없음). */
    private static function aiGenerateContent(array $c, ?array $seg, string $lang): array
    {
        $name = (string)($c['name'] ?? '');
        $obj  = (string)($c['objective'] ?? 'GeniegoROI 가입 전환');
        $segName = $seg['name'] ?? '일반 타겟';
        $pain    = $seg['pain_point'] ?? '커머스 운영 비효율';
        $msg     = $seg['key_message'] ?? 'AI로 커머스 운영 전 과정을 자동화';

        $langName = ['ko' => '한국어', 'en' => '영어', 'ja' => '일본어'][$lang] ?? '한국어';
        $sys = "당신은 B2B SaaS 그로스 마케터다. GeniegoROI(AI 커머스 운영 자동화 SaaS)를 홍보한다. "
             . "출력 언어: {$langName}. 절대 허위 성과 수치(가짜 ROAS·매출·고객수)를 만들지 마라. "
             . "검증 가능한 가치 제안과 행동 유도만 작성하라. 반드시 순수 JSON 객체만 출력하라.";
        $user = "타겟 세그먼트: {$segName}\nPain Point: {$pain}\n핵심 메시지: {$msg}\n캠페인 목표: {$obj}\n"
             . "다음 키를 가진 JSON 으로 카피를 작성하라: "
             . "ad_copy(헤드라인·본문·CTA 3변형 배열), landing_headline, email_subject, email_body, "
             . "sms, alimtalk, line, blog_outline, sns_post, youtube_script_outline, demo_pitch, sales_message.";

        if (ClaudeAI::aiKeyConfigured()) {
            $raw = ClaudeAI::complete($sys, $user, 14, self::TENANT);
            if ($raw) {
                $j = json_decode(self::extractJson($raw), true);
                if (is_array($j)) { $j['_source'] = 'claude'; $j['_lang'] = $lang; return $j; }
            }
        }
        // 폴백 — 결정적·검증가능, 허위 수치 없음.
        return self::fallbackContent($segName, $pain, $msg, $obj, $lang);
    }

    private static function extractJson(string $s): string
    {
        $a = strpos($s, '{'); $b = strrpos($s, '}');
        if ($a !== false && $b !== false && $b > $a) return substr($s, $a, $b - $a + 1);
        return $s;
    }

    private static function fallbackContent(string $seg, string $pain, string $msg, string $obj, string $lang): array
    {
        return [
            '_source' => 'fallback', '_lang' => $lang,
            'ad_copy' => [
                ['headline' => "{$seg}, 운영은 자동화하고 성장에 집중하세요", 'body' => "{$pain} — GeniegoROI가 {$msg}합니다. 지금 무료로 진단받으세요.", 'cta' => '무료 데모 신청'],
                ['headline' => "광고비 대비 진짜 수익, 데이터로 증명", 'body' => "채널별 실수익과 ROAS를 자동으로 산출합니다.", 'cta' => '14일 무료 체험'],
                ['headline' => "30개 마켓을 한 화면에서", 'body' => "주문·정산·재고·광고를 하나의 허브에서 자동화.", 'cta' => '도입 상담 예약'],
            ],
            'landing_headline' => "{$seg}를 위한 AI 커머스 운영 자동화, GeniegoROI",
            'email_subject'    => "[{$seg}] 운영 비효율, 데이터로 해결하는 방법",
            'email_body'       => "안녕하세요.\n\n{$pain} 때문에 고민이신가요? GeniegoROI는 {$msg}합니다.\n무료 데모로 직접 확인해 보세요.\n\n— GeniegoROI 팀",
            'sms'              => "[GeniegoROI] {$seg} 맞춤 운영 자동화 — 무료 데모 신청: www.genieroi.com",
            'alimtalk'         => "안녕하세요, GeniegoROI입니다. {$seg} 운영 자동화 무료 진단을 신청하시겠어요?",
            'line'             => "GeniegoROI — {$msg}. 무료 데모를 신청하세요.",
            'blog_outline'     => ["{$seg}의 운영 문제 정의", "데이터 기반 해결 접근", "GeniegoROI 적용 워크플로우", "도입 효과와 다음 단계"],
            'sns_post'         => "{$seg}라면 주목 👀 {$msg} — GeniegoROI #커머스자동화 #ROI",
            'youtube_script_outline' => ["문제 제기({$pain})", "솔루션 데모", "도입 절차", "무료 체험 CTA"],
            'demo_pitch'       => "{$seg} 대상 30분 ROI 진단: 현재 운영 데이터를 연결하면 채널별 실수익과 개선 포인트를 즉시 제시합니다.",
            'sales_message'    => "{$seg} 담당자님, {$pain}를 GeniegoROI로 자동화하면 운영 리소스를 절감할 수 있습니다. 무료 진단 일정을 잡아볼까요?",
        ];
    }

    /** 캠페인 실행 — Test: 시뮬레이션(실발송/집행 금지). Live: 승인+자격증명 필요. */
    public static function campaignLaunch(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $id = (int)($args['id'] ?? 0);
        $cs = $pdo->prepare("SELECT * FROM admin_growth_campaign WHERE id=?"); $cs->execute([$id]);
        $c = $cs->fetch(\PDO::FETCH_ASSOC);
        if (!$c) return self::fail($res, '캠페인을 찾을 수 없습니다.', 'NOT_FOUND', 404);

        $mode = self::mode($pdo);
        $channels = json_decode((string)($c['channels_json'] ?? '[]'), true) ?: [];

        if ($mode === 'test') {
            // 시뮬레이션: 실제 발송/집행 0. 예상 성과만 계산.
            $sim = self::simulate($pdo, $c, $channels);
            $pdo->prepare("UPDATE admin_growth_campaign SET status='simulated', est_json=?, updated_at=? WHERE id=?")
                ->execute([json_encode($sim, JSON_UNESCAPED_UNICODE), gmdate('c'), $id]);
            self::audit($pdo, self::actor($req), 'campaign.simulate', ['id' => $id, 'channels' => $channels]);
            return self::json($res, ['mode' => 'test', 'simulation' => $sim, 'executed' => false], '테스트 모드 — 시뮬레이션 완료 (실제 발송/집행 없음)');
        }

        // Live 모드: 승인된 실행 승인 필요.
        $appr = self::scalar($pdo, "SELECT COUNT(*) FROM admin_growth_approval WHERE ref_type='campaign_launch' AND ref_id=? AND status='approved'", [$id]);
        if ((int)$appr === 0) {
            // 실행 승인 자동 요청 후 대기.
            self::createApproval($pdo, 'campaign_launch', $id, (string)$c['camp_key'], "Live 캠페인 실행 승인: {$c['name']}", ['channels' => $channels, 'budget' => (float)$c['budget']], self::actor($req));
            $pdo->prepare("UPDATE admin_growth_campaign SET status='pending_launch_approval', updated_at=? WHERE id=?")->execute([gmdate('c'), $id]);
            return self::json($res, ['mode' => 'live', 'executed' => false, 'status' => 'pending_launch_approval'], 'Live 실행 승인이 필요합니다 — 승인 큐에 등록됨', 202);
        }

        // 승인됨: 자격증명 게이트(기존 channel_credential 재사용, platform_growth 테넌트).
        $missing = self::missingCreds($pdo, $channels);
        if (!empty($missing)) {
            $pdo->prepare("UPDATE admin_growth_campaign SET status='pending_credentials', updated_at=? WHERE id=?")->execute([gmdate('c'), $id]);
            return self::json($res, ['mode' => 'live', 'executed' => false, 'missingCredentials' => $missing, 'status' => 'pending_credentials'], '채널 자격증명이 필요합니다 — 등록 후 재실행', 409);
        }

        // [현 차수 M-1] ★실 매체 집행 — 기존엔 status='running' + executed:true 로 거짓 마킹만 하고
        //   AdAdapters 호출이 전혀 없어(디스패처/cron 부재) Live 캠페인이 단 한 건도 실제 집행되지 않으면서
        //   UI 에는 '실행됨'으로 표시되던 거짓성공. 승인+자격증명 게이트 통과 후 각 광고채널을
        //   AdAdapters::createCampaign 으로 실제 생성한다(기존 안전철학=PAUSED 무지출·사람-인-루프 유지,
        //   platform_growth 테넌트 자격증명 사용). honest 결과(active/connect_error/partial) 집계·est_json 저장.
        // [Phase2 소재] 캠페인 첨부 소재(platform_growth ad_design) 로드 — buildDelivery 로 실제 이미지/영상 광고 생성.
        $designIds = array_values(array_map('intval', (array)(json_decode((string)($c['design_ids'] ?? '[]'), true) ?: [])));
        $designCh = [];
        if (!empty($designIds)) {
            try {
                $in = implode(',', array_fill(0, count($designIds), '?'));
                $ds = $pdo->prepare("SELECT id, channel FROM ad_design WHERE tenant_id=? AND id IN ($in)");
                $ds->execute(array_merge([self::TENANT], $designIds));
                foreach ($ds->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $dr) $designCh[(int)$dr['id']] = (string)($dr['channel'] ?? '');
            } catch (\Throwable $e) {}
        }
        $landing = 'https://www.genieroi.com/app-pricing';
        $daily = (int)max(1000, round((float)$c['budget'] / 30));
        $results = []; $anyLive = false; $anyErr = false;
        foreach ($channels as $ch) {
            $ch = (string)$ch;
            if (!\Genie\Handlers\Connectors::isAdChannel($ch)) {
                // 이메일/콘텐츠 등 비광고 채널은 실 매체 캠페인 생성 대상 아님(별도 발송 경로) — 정직 표기.
                $results[$ch] = ['ok' => false, 'status' => 'not_ad_channel', 'note' => '실 광고 집행 대상 아님(비광고 채널)'];
                continue;
            }
            try {
                $r = \Genie\Handlers\AdAdapters::createCampaign($pdo, self::TENANT, $ch, [
                    'name'   => (string)$c['name'],
                    'budget' => (float)$c['budget'],
                    'period' => 'monthly',
                ]);
            } catch (\Throwable $e) {
                $r = ['ok' => false, 'status' => 'error', 'note' => $e->getMessage()];
            }
            // [Phase2 소재] 캠페인 생성 성공 + 소재 첨부 시 — 기존 buildDelivery 로 실제 광고(이미지/영상) 생성(고객 흐름 동일).
            if (!empty($r['ok']) && (string)($r['external_id'] ?? '') !== '') {
                if (!empty($designIds)) {
                    $pick = 0;
                    foreach ($designIds as $did) {
                        $dc = strtolower($designCh[$did] ?? '');
                        if ($dc !== '' && (strpos($ch, $dc) !== false || strpos($dc, $ch) !== false)) { $pick = $did; break; }
                    }
                    if ($pick === 0) $pick = $designIds[0];
                    try {
                        $dl = \Genie\Handlers\AdAdapters::buildDelivery($pdo, self::TENANT, $ch, (string)$r['external_id'], $pick, $daily, $landing, []);
                        $r['delivery'] = ['ok' => !empty($dl['ok']), 'status' => (string)($dl['status'] ?? (!empty($dl['ok']) ? 'full' : 'failed')), 'design_id' => $pick, 'note' => (string)($dl['note'] ?? ($dl['error'] ?? ''))];
                    } catch (\Throwable $e) { $r['delivery'] = ['ok' => false, 'status' => 'error', 'note' => substr($e->getMessage(), 0, 120)]; }
                } else {
                    // 소재 미첨부 = 광고 노출 불가(매체가 ad 를 못 만듦) — 정직 경고.
                    $r['delivery'] = ['ok' => false, 'status' => 'no_creative', 'note' => '소재 미첨부 — 광고 노출 불가. [소재] 탭에서 소재 생성 후 캠페인에 첨부하세요.'];
                }
            }
            $results[$ch] = $r;
            if (!empty($r['ok'])) $anyLive = true; else $anyErr = true;
        }
        // 상태 정직화: 전 채널 성공=running, 일부=partial, 전부 실패=launch_failed.
        $finalStatus = $anyLive ? ($anyErr ? 'partial' : 'running') : 'launch_failed';
        $pdo->prepare("UPDATE admin_growth_campaign SET status=?, est_json=?, updated_at=? WHERE id=?")
            ->execute([$finalStatus, json_encode(['live' => true, 'results' => $results, 'launched_at' => gmdate('c')], JSON_UNESCAPED_UNICODE), gmdate('c'), $id]);
        self::audit($pdo, self::actor($req), 'campaign.launch.live', ['id' => $id, 'channels' => $channels, 'results' => $results, 'budget' => (float)$c['budget']]);
        return self::json($res, [
            'mode' => 'live', 'executed' => $anyLive, 'status' => $finalStatus, 'channels' => $channels, 'results' => $results,
        ], $anyLive
            ? ('실 매체 캠페인 생성(PAUSED 안전) — ' . ($anyErr ? '일부 채널 실패(연결 상태 확인)' : '전 채널 성공'))
            : '실 집행 실패 — 자격증명/매체 연결 상태를 확인하세요');
    }

    /** Test 모드 예상 성과 = 세그먼트 추정치 기반(허위 실적 아님, 명시적 '예상'). */
    private static function simulate(\PDO $pdo, array $c, array $channels): array
    {
        $budget = (float)($c['budget'] ?? 0);
        $conv = 3.0; $cac = 200.0; $ltv = 4000.0; $mv = 200.0;
        if (!empty($c['segment_key'])) {
            $s = $pdo->prepare("SELECT est_conv_rate,est_cac,est_ltv,monthly_value FROM admin_growth_segment WHERE seg_key=?");
            $s->execute([$c['segment_key']]);
            if ($row = $s->fetch(\PDO::FETCH_ASSOC)) {
                $conv = (float)($row['est_conv_rate'] ?: $conv);
                $cac  = (float)($row['est_cac'] ?: $cac);
                $ltv  = (float)($row['est_ltv'] ?: $ltv);
                $mv   = (float)($row['monthly_value'] ?: $mv);
            }
        }
        $estPaid = $cac > 0 ? floor($budget / $cac) : 0;
        return [
            'note'            => '예상 성과(추정 벤치마크) — 실제 집행/발송 없음',
            'budget'          => $budget,
            'channels'        => $channels,
            'estLeads'        => $cac > 0 ? (int)floor($budget / $cac * (100 / max($conv, 0.1))) : 0,
            'estPaidCustomers'=> (int)$estPaid,
            'estCac'          => $cac,
            'estMonthlyRevenue'=> round($estPaid * $mv, 2),
            'estLtvTotal'     => round($estPaid * $ltv, 2),
            'estPaybackMonths'=> $mv > 0 ? round($cac / $mv, 1) : 0,
        ];
    }

    /** 채널 자격증명 누락 체크 — channel_credential 재사용(platform_growth 격리). */
    private static function missingCreds(\PDO $pdo, array $channels): array
    {
        $missing = [];
        foreach ($channels as $ch) {
            $ch = (string)$ch;
            if (!\Genie\Handlers\Connectors::isAdChannel($ch)) continue; // 비광고 채널은 매체 자격증명 게이트 대상 아님(별도 발송 경로)
            try {
                // [265차] AdAdapters::cred() 와 동일 별칭 키공간(short 'meta'/full 'meta_ads' 혼용 저장 대응) — 단일 정확매치라
                //   full 저장 시 항상 pending_credentials 로 Live 실행 영구 차단되던 비대칭 해소.
                $aliases = \Genie\Handlers\AdAdapters::credChannelAliases($ch);
                $ph = implode(',', array_fill(0, count($aliases), '?'));
                $st = $pdo->prepare("SELECT COUNT(*) FROM channel_credential WHERE tenant_id=? AND channel IN ($ph) AND is_active=1");
                $st->execute(array_merge([self::TENANT], $aliases));
                if ((int)$st->fetchColumn() === 0) $missing[] = $ch;
            } catch (\Throwable $e) { $missing[] = $ch; }
        }
        return $missing;
    }

    // ─────────────────────────────────────────── 승인 큐

    private static function createApproval(\PDO $pdo, string $refType, int $refId, string $refKey, string $summary, array $payload, string $by): int
    {
        // 동일 ref 의 pending 중복 방지.
        $dup = self::scalar($pdo, "SELECT id FROM admin_growth_approval WHERE ref_type=? AND ref_id=? AND status='pending'", [$refType, $refId]);
        if ($dup !== null) return (int)$dup;
        $st = $pdo->prepare("INSERT INTO admin_growth_approval (ref_type,ref_id,ref_key,summary,payload_json,status,requested_by,created_at) VALUES (?,?,?,?,?, 'pending', ?,?)");
        $st->execute([$refType, $refId, $refKey, $summary, json_encode($payload, JSON_UNESCAPED_UNICODE), $by, gmdate('c')]);
        return (int)$pdo->lastInsertId();
    }

    public static function approvals(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $q = $req->getQueryParams();
        $status = (string)($q['status'] ?? 'pending');
        $st = $pdo->prepare("SELECT * FROM admin_growth_approval WHERE status=? ORDER BY id DESC LIMIT 200");
        $st->execute([$status]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) { $r['payload'] = json_decode((string)($r['payload_json'] ?? 'null'), true); }
        return self::json($res, ['approvals' => $rows, 'count' => count($rows)], '승인 큐');
    }

    public static function approvalDecide(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $id = (int)($args['id'] ?? 0);
        $b = self::body($req);
        $decision = strtolower(trim((string)($b['decision'] ?? '')));
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return self::fail($res, "decision은 approved 또는 rejected 여야 합니다.", 'VALIDATION', 422);
        }
        $ap = $pdo->prepare("SELECT * FROM admin_growth_approval WHERE id=?"); $ap->execute([$id]);
        $a = $ap->fetch(\PDO::FETCH_ASSOC);
        if (!$a) return self::fail($res, '승인 항목을 찾을 수 없습니다.', 'NOT_FOUND', 404);
        if ($a['status'] !== 'pending') return self::fail($res, '이미 처리된 항목입니다.', 'CONFLICT', 409);

        $now = gmdate('c'); $actor = self::actor($req);
        $pdo->prepare("UPDATE admin_growth_approval SET status=?, decided_by=?, decided_at=? WHERE id=?")
            ->execute([$decision, $actor, $now, $id]);

        // ref_type 별 후속 상태 반영.
        if ($decision === 'approved') {
            if ($a['ref_type'] === 'content') {
                $pdo->prepare("UPDATE admin_growth_campaign SET status='approved', updated_at=? WHERE id=?")->execute([$now, (int)$a['ref_id']]);
            } elseif ($a['ref_type'] === 'live_mode') {
                self::setSetting($pdo, 'mode', 'live');
            }
            // campaign_launch 승인 시 상태는 다음 launch 호출에서 처리.
        }
        self::audit($pdo, $actor, 'approval.decide', ['id' => $id, 'ref_type' => $a['ref_type'], 'ref_id' => (int)$a['ref_id'], 'decision' => $decision]);
        return self::json($res, ['id' => $id, 'status' => $decision], "승인 항목 {$decision}");
    }

    // ─────────────────────────────────────────── 설정 (Test/Live 모드)

    public static function settings(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        return self::json($res, [
            'mode'              => self::mode($pdo),
            'tenant'           => self::TENANT,
            'liveExecEnabled'   => self::getSetting($pdo, 'live_exec_enabled', '0') === '1',
            'autoNurture'       => self::getSetting($pdo, 'auto_nurture', 'off') === 'on',  // [Phase2 ①] 가입 환영 너처 자동발송(기본 OFF)
        ], '설정');
    }

    /**
     * 설정 변경. mode='live' 전환은 승인 필요(요청 시 승인 큐 등록, 즉시 전환 금지).
     * 다른 설정(예: live_exec_enabled)은 즉시 반영.
     */
    public static function settingsSave(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = self::body($req);
        $actor = self::actor($req);

        if (array_key_exists('mode', $b)) {
            $req_mode = strtolower(trim((string)$b['mode']));
            if ($req_mode === 'test') {
                self::setSetting($pdo, 'mode', 'test');
                self::audit($pdo, $actor, 'mode.set', ['mode' => 'test']);
            } elseif ($req_mode === 'live') {
                // Live 전환은 승인 필수.
                $aid = self::createApproval($pdo, 'live_mode', 0, '', 'Live 모드 전환 승인 (실제 발송/광고 집행 활성화)', ['from' => self::mode($pdo)], $actor);
                self::audit($pdo, $actor, 'mode.request_live', ['approval_id' => $aid]);
                return self::json($res, ['mode' => self::mode($pdo), 'requestedLive' => true, 'approvalId' => $aid], 'Live 전환 승인 요청됨 — 승인 후 활성화', 202);
            }
        }
        if (array_key_exists('live_exec_enabled', $b)) {
            self::setSetting($pdo, 'live_exec_enabled', !empty($b['live_exec_enabled']) ? '1' : '0');
        }
        // [Phase2 ①] 가입 환영 너처 자동발송 토글(기본 OFF). on + Live 모드에서만 실발송.
        if (array_key_exists('auto_nurture', $b)) {
            self::setSetting($pdo, 'auto_nurture', !empty($b['auto_nurture']) ? 'on' : 'off');
            self::audit($pdo, $actor, 'nurture.toggle', ['auto_nurture' => !empty($b['auto_nurture']) ? 'on' : 'off']);
        }
        return self::json($res, ['mode' => self::mode($pdo), 'autoNurture' => self::getSetting($pdo, 'auto_nurture', 'off') === 'on'], '설정 저장');
    }

    // ─────────────────────────────────────────── 감사 로그 (audit_log 재사용)

    public static function audit_log(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT id, actor, action, details_json, created_at FROM audit_log WHERE action LIKE 'growth.%' ORDER BY id DESC LIMIT 300");
        $st->execute();
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) { $r['details'] = json_decode((string)($r['details_json'] ?? 'null'), true); }
        return self::json($res, ['logs' => $rows, 'count' => count($rows)], '감사 로그');
    }

    /* [240차 약점⑦] 불변 보안 감사 로그 조회 + 무결성 검증 — tamper-evident 해시체인(SOC2/ISO 감사 정합). */
    public static function securityAudit(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin'); if ($gate !== null) return $gate;
        $pdo  = Db::pdo();
        // [현 차수 보강1] 회원 유형 필터(all|demo|subscriber). recentByType 가 화이트리스트 강제.
        $q  = $req->getQueryParams();
        $mt = (string)($q['member_type'] ?? 'all');
        $mt = in_array($mt, ['all', 'demo', 'subscriber'], true) ? $mt : 'all';
        $rows = \Genie\SecurityAudit::recentByType($pdo, $mt, 300);
        foreach ($rows as &$r) { $r['details'] = json_decode((string)($r['details_json'] ?? 'null'), true); unset($r['details_json']); }
        unset($r);
        // [현 차수 보강2] 유입 요약 — 어드민 유입 현황 + 마케팅 자동화(funnel) 참조용.
        return self::json($res, [
            'logs'        => $rows,
            'count'       => count($rows),
            'member_type' => $mt,
            'acquisition' => \Genie\SecurityAudit::acquisitionSummary($pdo, 30),
            'integrity'   => \Genie\SecurityAudit::verify($pdo),
        ], '보안 감사 로그');
    }
}
