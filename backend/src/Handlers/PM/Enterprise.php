<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM 초엔터프라이즈 확장 (231차) — 기존 PM-Core(Projects/Tasks/Gantt/Milestones…) 위에 추가.
 *
 * 추가 도메인(중복 신설 아님 — 기존 pm_* 스키마/Shared 게이트/감사 재사용):
 *   • 포트폴리오/프로그램      : pm_portfolio (+ pm_projects.portfolio_id) — 프로젝트 묶음·롤업
 *   • RAID 등록부             : pm_raid (risk/issue/assumption/dependency, 확률×영향=심각도)
 *   • 타임시트(시간 추적)       : pm_time_log (실투입 시간·청구 가능)
 *   • EVM(획득가치)           : 기존 pm_tasks(progress/estimate) + budget + 타임로그로 PV/EV/AC/SPI/CPI/EAC 계산
 *   • 베이스라인              : pm_baseline (일정·예산 스냅샷 + 변화 추적)
 *   • 리소스 가용량           : pm_task_assignees × pm_tasks 워크로드 집계
 *
 * 인증/격리: Shared::gate (세션토큰→authedTenant, 모든 쿼리 tenant_id 격리). read=viewer, write=analyst.
 * 라우팅: /v425/pm/*  (index.php 기존 bypass 포함). 테이블은 런타임 ensure(IF NOT EXISTS, MySQL/SQLite).
 */
class Enterprise extends Shared
{
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }

    /** 신규 테이블 + pm_projects.portfolio_id 보강(additive, idempotent). */
    private static function ensure(\PDO $pdo): void
    {
        static $done = []; $k = spl_object_id($pdo); if (!empty($done[$k])) return; $done[$k] = true;
        try {
            if (self::isMysql($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_portfolio (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                    name VARCHAR(200) NOT NULL, description TEXT, owner_user_id VARCHAR(100),
                    status VARCHAR(20) DEFAULT 'active', color VARCHAR(20),
                    created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_pf_tenant (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_raid (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, project_id VARCHAR(64) NOT NULL,
                    type VARCHAR(16) NOT NULL DEFAULT 'risk', title VARCHAR(255) NOT NULL, description TEXT,
                    owner VARCHAR(120), probability INT DEFAULT 3, impact INT DEFAULT 3, severity INT DEFAULT 9,
                    status VARCHAR(20) DEFAULT 'open', mitigation TEXT, due_date VARCHAR(32),
                    created_at VARCHAR(32), updated_at VARCHAR(32),
                    KEY idx_raid_tenant (tenant_id), KEY idx_raid_project (tenant_id, project_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_time_log (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, project_id VARCHAR(64) NOT NULL,
                    task_id VARCHAR(64), user_id VARCHAR(120), hours DOUBLE DEFAULT 0, log_date VARCHAR(32),
                    billable TINYINT(1) DEFAULT 1, note VARCHAR(500), created_at VARCHAR(32),
                    KEY idx_tl_tenant (tenant_id), KEY idx_tl_project (tenant_id, project_id), KEY idx_tl_task (task_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_baseline (
                    id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, project_id VARCHAR(64) NOT NULL,
                    name VARCHAR(160), bac DOUBLE DEFAULT 0, snapshot_json LONGTEXT, created_at VARCHAR(32),
                    KEY idx_bl_project (tenant_id, project_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_portfolio (id VARCHAR(64) PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, owner_user_id TEXT, status TEXT DEFAULT 'active', color TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_raid (id VARCHAR(64) PRIMARY KEY, tenant_id TEXT NOT NULL, project_id TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'risk', title TEXT NOT NULL, description TEXT, owner TEXT, probability INTEGER DEFAULT 3, impact INTEGER DEFAULT 3, severity INTEGER DEFAULT 9, status TEXT DEFAULT 'open', mitigation TEXT, due_date TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_time_log (id VARCHAR(64) PRIMARY KEY, tenant_id TEXT NOT NULL, project_id TEXT NOT NULL, task_id TEXT, user_id TEXT, hours REAL DEFAULT 0, log_date TEXT, billable INTEGER DEFAULT 1, note TEXT, created_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS pm_baseline (id VARCHAR(64) PRIMARY KEY, tenant_id TEXT NOT NULL, project_id TEXT NOT NULL, name TEXT, bac REAL DEFAULT 0, snapshot_json TEXT, created_at TEXT)");
            }
            try { $pdo->exec(self::isMysql($pdo) ? "ALTER TABLE pm_projects ADD COLUMN portfolio_id VARCHAR(64) NULL" : "ALTER TABLE pm_projects ADD COLUMN portfolio_id VARCHAR(64)"); } catch (\Throwable $e) {}
            // pm_audit_log.entity_type 는 MySQL ENUM(제한값)이라 신규 엔터티(portfolio/raid/time_log/baseline) 기록 시
            //   enum 위반→INSERT 예외 발생. 값 추가(additive, 비파괴, 기존행 보존)로 감사 기록 허용. SQLite=TEXT라 무관.
            if (self::isMysql($pdo)) {
                try { $pdo->exec("ALTER TABLE pm_audit_log MODIFY COLUMN entity_type ENUM('project','task','milestone','dependency','assignee','comment','attachment','portfolio','raid','time_log','baseline') NOT NULL"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* best-effort */ }
    }

    private static function now(): string { return gmdate('Y-m-d H:i:s'); }
    private static function today(): string { return gmdate('Y-m-d'); }

    /** 감사 기록은 best-effort — 실패해도 성공한 쓰기를 500으로 깨뜨리지 않는다(UserAuth audit 정책 정합). */
    private static function safeAudit(\PDO $pdo, array $r): void
    {
        try { self::auditLog($pdo, $r); } catch (\Throwable $e) { /* 무시 */ }
    }

    // ════════════════════ 포트폴리오 ════════════════════
    public static function listPortfolios(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $st = $g['pdo']->prepare("SELECT * FROM pm_portfolio WHERE tenant_id=? ORDER BY (CASE status WHEN 'active' THEN 0 ELSE 1 END), created_at DESC");
        $st->execute([$g['tenant']]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$p) {
            $c = $g['pdo']->prepare("SELECT COUNT(*) FROM pm_projects WHERE tenant_id=? AND portfolio_id=?");
            $c->execute([$g['tenant'], $p['id']]); $p['project_count'] = (int)$c->fetchColumn();
        }
        unset($p);
        return self::json($resp, ['items' => $rows, '_tenant' => $g['tenant']]);
    }

    public static function createPortfolio(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $b = (array)$req->getParsedBody();
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '' || strlen($name) > 200) return self::json($resp, ['error' => 'invalid_name'], 422);
        $id = self::genId('pf');
        $g['pdo']->prepare("INSERT INTO pm_portfolio (id,tenant_id,name,description,owner_user_id,status,color,created_at,updated_at) VALUES (?,?,?,?,?, 'active',?,?,?)")
            ->execute([$id, $g['tenant'], $name, $b['description'] ?? null, $b['owner_user_id'] ?? $g['user_id'], $b['color'] ?? null, self::now(), self::now()]);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'portfolio', 'entity_id' => $id, 'action' => 'create', 'diff' => ['name' => $name], 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    public static function patchPortfolio(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $id = (string)($args['id'] ?? ''); if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $b = (array)$req->getParsedBody(); $sets = []; $vals = [];
        foreach (['name', 'description', 'owner_user_id', 'color'] as $f) if (array_key_exists($f, $b)) { $sets[] = "$f=?"; $vals[] = (string)$b[$f]; }
        if (isset($b['status']) && in_array($b['status'], ['active', 'archived'], true)) { $sets[] = 'status=?'; $vals[] = $b['status']; }
        if (!$sets) return self::json($resp, ['error' => 'no_fields'], 400);
        $sets[] = 'updated_at=?'; $vals[] = self::now(); $vals[] = $id; $vals[] = $g['tenant'];
        $g['pdo']->prepare("UPDATE pm_portfolio SET " . implode(',', $sets) . " WHERE id=? AND tenant_id=?")->execute($vals);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'portfolio', 'entity_id' => $id, 'action' => 'update', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['ok' => true]);
    }

    public static function deletePortfolio(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $id = (string)($args['id'] ?? ''); if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        // 소속 프로젝트는 portfolio_id 해제(데이터 보존), 포트폴리오는 archived
        $g['pdo']->prepare("UPDATE pm_projects SET portfolio_id=NULL WHERE tenant_id=? AND portfolio_id=?")->execute([$g['tenant'], $id]);
        $g['pdo']->prepare("UPDATE pm_portfolio SET status='archived', updated_at=? WHERE id=? AND tenant_id=?")->execute([self::now(), $id, $g['tenant']]);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'portfolio', 'entity_id' => $id, 'action' => 'delete', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['ok' => true, 'archived' => true]);
    }

    /** POST /v425/pm/portfolios/{id}/attach — 프로젝트 소속 지정/해제. {project_id, attach:bool} */
    public static function attachProject(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $pid = (string)($args['id'] ?? ''); $b = (array)$req->getParsedBody();
        $projectId = (string)($b['project_id'] ?? '');
        if (!self::validId($pid) || !self::validId($projectId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $attach = ($b['attach'] ?? true) ? $pid : null;
        $g['pdo']->prepare("UPDATE pm_projects SET portfolio_id=? WHERE id=? AND tenant_id=?")->execute([$attach, $projectId, $g['tenant']]);
        return self::json($resp, ['ok' => true]);
    }

    /** GET /v425/pm/portfolios/{id}/rollup — 소속 프로젝트 KPI + 집계 EVM. */
    public static function portfolioRollup(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $pid = (string)($args['id'] ?? ''); if (!self::validId($pid)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $ps = $g['pdo']->prepare("SELECT * FROM pm_projects WHERE tenant_id=? AND portfolio_id=?");
        $ps->execute([$g['tenant'], $pid]);
        $projects = $ps->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $agg = ['projects' => count($projects), 'pv' => 0.0, 'ev' => 0.0, 'ac' => 0.0, 'bac' => 0.0, 'at_risk' => 0, 'by_status' => []];
        $items = [];
        foreach ($projects as $pr) {
            $evm = self::computeEvm($g['pdo'], $g['tenant'], $pr);
            $agg['pv'] += $evm['pv']; $agg['ev'] += $evm['ev']; $agg['ac'] += $evm['ac']; $agg['bac'] += $evm['bac'];
            $st = (string)($pr['status'] ?? 'planning'); $agg['by_status'][$st] = ($agg['by_status'][$st] ?? 0) + 1;
            if (($evm['spi'] !== null && $evm['spi'] < 0.9) || ($evm['cpi'] !== null && $evm['cpi'] < 0.9)) $agg['at_risk']++;
            $items[] = ['id' => $pr['id'], 'name' => $pr['name'], 'status' => $st, 'completion_pct' => $evm['ev_pct'], 'spi' => $evm['spi'], 'cpi' => $evm['cpi'], 'bac' => $evm['bac']];
        }
        $agg['spi'] = $agg['pv'] > 0 ? round($agg['ev'] / $agg['pv'], 3) : null;
        $agg['cpi'] = $agg['ac'] > 0 ? round($agg['ev'] / $agg['ac'], 3) : null;
        $agg['completion_pct'] = $agg['bac'] > 0 ? round($agg['ev'] / $agg['bac'] * 100, 1) : 0;
        return self::json($resp, ['summary' => $agg, 'projects' => $items]);
    }

    // ════════════════════ EVM (획득가치) ════════════════════
    /** 프로젝트 1건 EVM 계산(공용). 반환 PV/EV/AC/SV/CV/SPI/CPI/EAC/VAC/ETC + pct. */
    private static function computeEvm(\PDO $pdo, string $tenant, array $project): array
    {
        $pid = (string)$project['id'];
        $bac = (float)($project['budget_amount'] ?? 0);
        $meta = json_decode((string)($project['metadata_json'] ?? ''), true);
        // 단가는 음수/비숫자 방어(비숫자 문자열은 PHP 캐스팅상 0 → AC 0). 안정적 0 이상 보장.
        $rate = (is_array($meta) && isset($meta['hourly_rate'])) ? max(0.0, (float)$meta['hourly_rate']) : 0.0;

        $ts = $pdo->prepare("SELECT estimate_hours, progress_pct, status, due_date FROM pm_tasks WHERE tenant_id=? AND project_id=? AND archived_at IS NULL");
        $ts->execute([$tenant, $pid]);
        $tasks = $ts->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $today = self::today();
        $totW = 0.0; $evW = 0.0; $pvW = 0.0;
        foreach ($tasks as $t) {
            $w = max((float)($t['estimate_hours'] ?? 0), 1.0); // 추정 미입력 시 1 가중
            $totW += $w;
            $prog = max(0, min(100, (float)($t['progress_pct'] ?? 0)));
            if (($t['status'] ?? '') === 'done') $prog = 100;
            $evW += $w * ($prog / 100);
            $due = (string)($t['due_date'] ?? '');
            if ($due !== '' && $due <= $today) $pvW += $w; // 오늘까지 완료 예정분 = 계획가치
        }
        $evPct = $totW > 0 ? $evW / $totW : 0;
        $pvPct = $totW > 0 ? $pvW / $totW : 0;
        if ($bac <= 0) $bac = $totW * ($rate > 0 ? $rate : 1); // 예산 미설정 시 추정시간 기반 대체 BAC

        // AC: 타임로그 실투입 × rate(없으면 시간 자체)
        $al = $pdo->prepare("SELECT COALESCE(SUM(hours),0) FROM pm_time_log WHERE tenant_id=? AND project_id=?");
        $al->execute([$tenant, $pid]);
        $hours = (float)$al->fetchColumn();
        $ac = $rate > 0 ? $hours * $rate : $hours;

        $ev = $bac * $evPct; $pv = $bac * $pvPct;
        $spi = $pv > 0 ? round($ev / $pv, 3) : null;
        $cpi = $ac > 0 ? round($ev / $ac, 3) : null;
        $eac = ($cpi !== null && $cpi > 0) ? round($bac / $cpi, 2) : null;
        return [
            'bac' => round($bac, 2), 'pv' => round($pv, 2), 'ev' => round($ev, 2), 'ac' => round($ac, 2),
            'sv' => round($ev - $pv, 2), 'cv' => round($ev - $ac, 2), 'spi' => $spi, 'cpi' => $cpi,
            'eac' => $eac, 'vac' => $eac !== null ? round($bac - $eac, 2) : null, 'etc' => $eac !== null ? round($eac - $ac, 2) : null,
            'ev_pct' => round($evPct * 100, 1), 'pv_pct' => round($pvPct * 100, 1),
            'actual_hours' => round($hours, 1), 'hourly_rate' => $rate,
        ];
    }

    /** GET /v425/pm/projects/{id}/evm */
    public static function projectEvm(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $id = (string)($args['id'] ?? ''); if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $ps = $g['pdo']->prepare("SELECT * FROM pm_projects WHERE id=? AND tenant_id=?");
        $ps->execute([$id, $g['tenant']]);
        $project = $ps->fetch(\PDO::FETCH_ASSOC);
        if (!$project) return self::json($resp, ['error' => 'not_found'], 404);
        return self::json($resp, ['evm' => self::computeEvm($g['pdo'], $g['tenant'], $project), 'budget_currency' => $project['budget_currency'] ?? 'KRW']);
    }

    // ════════════════════ RAID 등록부 ════════════════════
    public static function listRaid(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $q = $req->getQueryParams(); $where = ['tenant_id=?']; $params = [$g['tenant']];
        if (!empty($q['project_id'])) { $where[] = 'project_id=?'; $params[] = (string)$q['project_id']; }
        if (!empty($q['type'])) { $where[] = 'type=?'; $params[] = (string)$q['type']; }
        $st = $g['pdo']->prepare("SELECT * FROM pm_raid WHERE " . implode(' AND ', $where) . " ORDER BY severity DESC, created_at DESC LIMIT 500");
        $st->execute($params);
        return self::json($resp, ['items' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
    }

    public static function createRaid(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $b = (array)$req->getParsedBody();
        $projectId = (string)($b['project_id'] ?? ''); $title = trim((string)($b['title'] ?? ''));
        $type = in_array($b['type'] ?? '', ['risk', 'issue', 'assumption', 'dependency'], true) ? $b['type'] : 'risk';
        if (!self::validId($projectId) || $title === '') return self::json($resp, ['error' => 'invalid_input'], 422);
        $prob = max(1, min(5, (int)($b['probability'] ?? 3)));
        $imp = max(1, min(5, (int)($b['impact'] ?? 3)));
        $id = self::genId('raid');
        $g['pdo']->prepare("INSERT INTO pm_raid (id,tenant_id,project_id,type,title,description,owner,probability,impact,severity,status,mitigation,due_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$id, $g['tenant'], $projectId, $type, $title, $b['description'] ?? null, $b['owner'] ?? null, $prob, $imp, $prob * $imp, $b['status'] ?? 'open', $b['mitigation'] ?? null, $b['due_date'] ?? null, self::now(), self::now()]);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'raid', 'entity_id' => $id, 'action' => 'create', 'diff' => ['type' => $type, 'title' => $title], 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    public static function patchRaid(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $id = (string)($args['id'] ?? ''); if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $b = (array)$req->getParsedBody(); $sets = []; $vals = [];
        foreach (['title', 'description', 'owner', 'mitigation', 'due_date'] as $f) if (array_key_exists($f, $b)) { $sets[] = "$f=?"; $vals[] = (string)$b[$f]; }
        if (isset($b['type']) && in_array($b['type'], ['risk', 'issue', 'assumption', 'dependency'], true)) { $sets[] = 'type=?'; $vals[] = $b['type']; }
        if (isset($b['status']) && in_array($b['status'], ['open', 'mitigating', 'closed', 'accepted'], true)) { $sets[] = 'status=?'; $vals[] = $b['status']; }
        $reSev = false; $prob = null; $imp = null;
        if (isset($b['probability'])) { $prob = max(1, min(5, (int)$b['probability'])); $sets[] = 'probability=?'; $vals[] = $prob; $reSev = true; }
        if (isset($b['impact'])) { $imp = max(1, min(5, (int)$b['impact'])); $sets[] = 'impact=?'; $vals[] = $imp; $reSev = true; }
        if (!$sets) return self::json($resp, ['error' => 'no_fields'], 400);
        $sets[] = 'updated_at=?'; $vals[] = self::now(); $vals[] = $id; $vals[] = $g['tenant'];
        $g['pdo']->prepare("UPDATE pm_raid SET " . implode(',', $sets) . " WHERE id=? AND tenant_id=?")->execute($vals);
        if ($reSev) { // 심각도 재계산
            $r = $g['pdo']->prepare("SELECT probability, impact FROM pm_raid WHERE id=? AND tenant_id=?"); $r->execute([$id, $g['tenant']]);
            if ($row = $r->fetch(\PDO::FETCH_ASSOC)) $g['pdo']->prepare("UPDATE pm_raid SET severity=? WHERE id=? AND tenant_id=?")->execute([(int)$row['probability'] * (int)$row['impact'], $id, $g['tenant']]);
        }
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'raid', 'entity_id' => $id, 'action' => 'update', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['ok' => true]);
    }

    public static function deleteRaid(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $id = (string)($args['id'] ?? ''); if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $g['pdo']->prepare("DELETE FROM pm_raid WHERE id=? AND tenant_id=?")->execute([$id, $g['tenant']]);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'raid', 'entity_id' => $id, 'action' => 'delete', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['ok' => true]);
    }

    // ════════════════════ 타임시트 ════════════════════
    public static function listTime(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $q = $req->getQueryParams(); $where = ['tenant_id=?']; $params = [$g['tenant']];
        if (!empty($q['project_id'])) { $where[] = 'project_id=?'; $params[] = (string)$q['project_id']; }
        if (!empty($q['task_id'])) { $where[] = 'task_id=?'; $params[] = (string)$q['task_id']; }
        $st = $g['pdo']->prepare("SELECT * FROM pm_time_log WHERE " . implode(' AND ', $where) . " ORDER BY log_date DESC, created_at DESC LIMIT 500");
        $st->execute($params);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $total = 0.0; $billable = 0.0;
        foreach ($rows as $r) { $total += (float)$r['hours']; if ((int)$r['billable']) $billable += (float)$r['hours']; }
        return self::json($resp, ['items' => $rows, 'total_hours' => round($total, 1), 'billable_hours' => round($billable, 1)]);
    }

    public static function createTime(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $b = (array)$req->getParsedBody();
        $projectId = (string)($b['project_id'] ?? ''); $hours = (float)($b['hours'] ?? 0);
        if (!self::validId($projectId) || $hours <= 0 || $hours > 1000) return self::json($resp, ['error' => 'invalid_input'], 422);
        $id = self::genId('tl');
        $g['pdo']->prepare("INSERT INTO pm_time_log (id,tenant_id,project_id,task_id,user_id,hours,log_date,billable,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
            ->execute([$id, $g['tenant'], $projectId, $b['task_id'] ?? null, $b['user_id'] ?? $g['user_id'], $hours, $b['log_date'] ?? self::today(), ($b['billable'] ?? true) ? 1 : 0, isset($b['note']) ? substr((string)$b['note'], 0, 500) : null, self::now()]);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'time_log', 'entity_id' => $id, 'action' => 'create', 'diff' => ['hours' => $hours], 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    public static function deleteTime(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $id = (string)($args['id'] ?? ''); if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $g['pdo']->prepare("DELETE FROM pm_time_log WHERE id=? AND tenant_id=?")->execute([$id, $g['tenant']]);
        return self::json($resp, ['ok' => true]);
    }

    // ════════════════════ 베이스라인 ════════════════════
    public static function listBaselines(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $pid = (string)($args['id'] ?? ''); if (!self::validId($pid)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $st = $g['pdo']->prepare("SELECT id, name, bac, created_at FROM pm_baseline WHERE tenant_id=? AND project_id=? ORDER BY created_at DESC");
        $st->execute([$g['tenant'], $pid]);
        return self::json($resp, ['items' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
    }

    /** POST /v425/pm/projects/{id}/baselines — 현재 일정/예산 스냅샷 저장. */
    public static function createBaseline(Request $req, Response $resp, array $args = []): Response
    {
        $g = self::gate($req, $resp, 'analyst'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $pid = (string)($args['id'] ?? ''); if (!self::validId($pid)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $ps = $g['pdo']->prepare("SELECT * FROM pm_projects WHERE id=? AND tenant_id=?"); $ps->execute([$pid, $g['tenant']]);
        $project = $ps->fetch(\PDO::FETCH_ASSOC);
        if (!$project) return self::json($resp, ['error' => 'not_found'], 404);
        $ts = $g['pdo']->prepare("SELECT id, title, start_date, due_date, estimate_hours FROM pm_tasks WHERE tenant_id=? AND project_id=?");
        $ts->execute([$g['tenant'], $pid]);
        $snapshot = ['captured_at' => self::now(), 'budget_amount' => $project['budget_amount'], 'start_date' => $project['start_date'], 'target_date' => $project['target_date'], 'tasks' => $ts->fetchAll(\PDO::FETCH_ASSOC) ?: []];
        $b = (array)$req->getParsedBody();
        $id = self::genId('bl');
        $g['pdo']->prepare("INSERT INTO pm_baseline (id,tenant_id,project_id,name,bac,snapshot_json,created_at) VALUES (?,?,?,?,?,?,?)")
            ->execute([$id, $g['tenant'], $pid, trim((string)($b['name'] ?? 'Baseline ' . self::today())), (float)($project['budget_amount'] ?? 0), json_encode($snapshot, JSON_UNESCAPED_UNICODE), self::now()]);
        self::safeAudit($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'], 'actor_api_key' => $g['api_key'], 'entity_type' => 'baseline', 'entity_id' => $id, 'action' => 'create', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    // ════════════════════ 리소스 가용량/워크로드 ════════════════════
    /** GET /v425/pm/resources — 담당자별 진행 중 태스크 수·추정시간·지연·실투입 집계(테넌트 전역). */
    public static function resourceCapacity(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer'); if (isset($g['error'])) return $g['error'];
        self::ensure($g['pdo']);
        $tenant = $g['tenant']; $today = self::today();
        // 담당자별 열린 태스크 집계
        $sql = "SELECT a.user_id AS user_id,
                       COUNT(*) AS open_tasks,
                       COALESCE(SUM(t.estimate_hours),0) AS est_hours,
                       SUM(CASE WHEN t.due_date<>'' AND t.due_date < ? AND t.status NOT IN ('done','cancelled') THEN 1 ELSE 0 END) AS overdue
                  FROM pm_task_assignees a
                  JOIN pm_tasks t ON t.id = a.task_id AND t.tenant_id = a.tenant_id
                 WHERE a.tenant_id = ? AND a.user_id IS NOT NULL AND a.user_id <> '' AND t.status NOT IN ('done','cancelled') AND t.archived_at IS NULL
                 GROUP BY a.user_id
                 ORDER BY est_hours DESC LIMIT 200";
        $rows = [];
        try { $st = $g['pdo']->prepare($sql); $st->execute([$today, $tenant]); $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: []; } catch (\Throwable $e) {}
        // 실투입 시간 합류
        foreach ($rows as &$r) {
            if (empty($r['user_id'])) { $r['logged_hours'] = 0; $r['est_hours'] = round((float)$r['est_hours'], 1); $r['load_pct'] = round((float)$r['est_hours'] / 40 * 100, 0); continue; }
            $lg = $g['pdo']->prepare("SELECT COALESCE(SUM(hours),0) FROM pm_time_log WHERE tenant_id=? AND user_id=?");
            $lg->execute([$tenant, $r['user_id']]);
            $r['logged_hours'] = round((float)$lg->fetchColumn(), 1);
            $r['est_hours'] = round((float)$r['est_hours'], 1);
            // 주 40h 기준 부하율(추정시간/40)
            $r['load_pct'] = round((float)$r['est_hours'] / 40 * 100, 0);
        }
        unset($r);
        return self::json($resp, ['resources' => $rows, 'capacity_week_hours' => 40]);
    }
}
