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
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_lead (
            id $AI,
            email TEXT, name TEXT, company TEXT, phone TEXT,
            segment_key TEXT, source TEXT,
            stage TEXT DEFAULT 'visitor', score INTEGER DEFAULT 0, grade TEXT DEFAULT 'cold',
            owner TEXT, notes TEXT,
            mrr REAL DEFAULT 0,
            last_activity_at TEXT, created_at TEXT, updated_at TEXT
        )");

        // 퍼널/터치포인트 이벤트 (스코어링·퍼널·어트리뷰션 구동).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_event (
            id $AI,
            lead_id INTEGER DEFAULT 0, email TEXT,
            event_type TEXT, channel TEXT, campaign_key TEXT,
            value REAL DEFAULT 0,
            occurred_at TEXT, meta_json TEXT
        )");

        // 플랫폼 홍보 캠페인 (mode=test/live, 승인·AI콘텐츠 상태).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_campaign (
            id $AI,
            camp_key TEXT, name TEXT, objective TEXT,
            segment_key TEXT, channels_json TEXT, budget REAL DEFAULT 0,
            mode TEXT DEFAULT 'test', status TEXT DEFAULT 'draft',
            content_json TEXT, est_json TEXT,
            spend REAL DEFAULT 0, revenue REAL DEFAULT 0,
            created_by TEXT, created_at TEXT, updated_at TEXT
        )");

        // 승인 큐 (AI콘텐츠/캠페인실행/메시지/예산/최적화/Live전환).
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_approval (
            id $AI,
            ref_type TEXT, ref_id INTEGER DEFAULT 0, ref_key TEXT,
            summary TEXT, payload_json TEXT,
            status TEXT DEFAULT 'pending',
            requested_by TEXT, decided_by TEXT, decided_at TEXT,
            created_at TEXT
        )");

        // 설정 (mode 등) — key/value.
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_growth_setting (
            skey TEXT PRIMARY KEY, svalue TEXT, updated_at TEXT
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
        foreach ($rows as $r) {
            $et = strtolower((string)$r['event_type']);
            $score += (int)(self::SCORE_WEIGHTS[$et] ?? 0);
            $lastAt = (string)($r['occurred_at'] ?? $lastAt);
            $fi = array_search($et, self::FUNNEL, true);
            if ($fi !== false && $fi > $reachedIdx) $reachedIdx = $fi;
            if (in_array($et, ['paid', 'upsell'], true)) $mrr = max($mrr, (float)($r['value'] ?? 0));
        }
        $score = max(0, min(100, $score));
        $stage = self::FUNNEL[$reachedIdx] ?? 'visitor';
        $grade = self::gradeFor($score, $stage);
        $upd = $pdo->prepare("UPDATE admin_growth_lead SET score=?, grade=?, stage=?, mrr=?, last_activity_at=?, updated_at=? WHERE id=?");
        $upd->execute([$score, $grade, $stage, $mrr, $lastAt ?: gmdate('c'), gmdate('c'), $leadId]);
        return ['score' => $score, 'grade' => $grade, 'stage' => $stage, 'mrr' => $mrr];
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
        }
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
        if ($id > 0) {
            $st = $pdo->prepare("UPDATE admin_growth_campaign SET name=?, objective=?, segment_key=?, channels_json=?, budget=?, updated_at=? WHERE id=?");
            $st->execute([(string)($b['name'] ?? ''), (string)($b['objective'] ?? ''), (string)($b['segment_key'] ?? ''), $channels, (float)($b['budget'] ?? 0), $now, $id]);
        } else {
            $campKey = 'gcamp_' . substr(bin2hex(random_bytes(4)), 0, 8);
            $st = $pdo->prepare("INSERT INTO admin_growth_campaign (camp_key,name,objective,segment_key,channels_json,budget,mode,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?, 'draft', ?,?,?)");
            $st->execute([$campKey, (string)($b['name'] ?? ''), (string)($b['objective'] ?? ''), (string)($b['segment_key'] ?? ''), $channels, (float)($b['budget'] ?? 0), self::mode($pdo), self::actor($req), $now, $now]);
            $id = (int)$pdo->lastInsertId();
        }
        self::audit($pdo, self::actor($req), 'campaign.save', ['id' => $id, 'name' => $b['name'] ?? '']);
        return self::json($res, ['id' => $id], '캠페인 저장');
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
            'sms'              => "[GeniegoROI] {$seg} 맞춤 운영 자동화 — 무료 데모 신청: roi.genie-go.com",
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

        // 실행: 기존 안전 철학(PAUSED→활성) 따라 running 마킹 + 감사. 실제 매체 push 는
        //   AdAdapters/AutoCampaign 가 platform_growth 테넌트 자격증명으로 집행.
        $pdo->prepare("UPDATE admin_growth_campaign SET status='running', updated_at=? WHERE id=?")->execute([gmdate('c'), $id]);
        self::audit($pdo, self::actor($req), 'campaign.launch.live', ['id' => $id, 'channels' => $channels, 'budget' => (float)$c['budget']]);
        return self::json($res, ['mode' => 'live', 'executed' => true, 'status' => 'running', 'channels' => $channels], 'Live 캠페인 실행 (승인+자격증명 통과)');
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
            try {
                $st = $pdo->prepare("SELECT COUNT(*) FROM channel_credential WHERE tenant_id=? AND channel=? AND is_active=1");
                $st->execute([self::TENANT, $ch]);
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
        return self::json($res, ['mode' => self::mode($pdo)], '설정 저장');
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
}
