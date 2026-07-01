<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * v420 — Supply Chain Visibility
 *
 * 206차 #6: 기존 `sqlite::memory:`(요청마다 소실 + 테넌트 미격리)를 영속 SQLite 파일 +
 *   전 테이블 tenant_id + 전 쿼리 테넌트 스코핑으로 전환(PriceOpt 와 동일 패턴).
 *   영속: backend/data/supplychain.sqlite(운영/데모 디렉터리 분리로 파일 자동 분리).
 *   격리: tenant = UserAuth::authedTenant(익명/데모→'demo').
 */
class SupplyChain
{
    private static ?\PDO $db = null;

    private static function db(): \PDO
    {
        if (self::$db !== null) return self::$db;

        $dir = __DIR__ . '/../../data';
        if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
        $pdo = new \PDO('sqlite:' . $dir . '/supplychain.sqlite');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->exec("PRAGMA journal_mode=WAL");
        $pdo->exec("PRAGMA busy_timeout=5000");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            line_id TEXT, supplier TEXT, sku TEXT, name TEXT, leadTime INTEGER DEFAULT 14,
            risk TEXT DEFAULT 'low', delayRate REAL DEFAULT 0, totalCost REAL DEFAULT 0, created_at TEXT,
            UNIQUE(tenant_id, line_id))");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_stages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            line_id TEXT NOT NULL, stage TEXT, stageDate TEXT, done INTEGER DEFAULT 0,
            note TEXT, sort_order INTEGER DEFAULT 0)");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            sup_id TEXT, name TEXT, country TEXT, category TEXT, leadTime INTEGER, delayRate REAL,
            orderCount INTEGER DEFAULT 0, reliability REAL DEFAULT 95, contact TEXT, created_at TEXT,
            UNIQUE(tenant_id, sup_id))");
        // [257차 통합] 공급업체 SSOT 일원화 — sc_suppliers(공급망 분석)를 wms_suppliers(거래처 마스터, Db::pdo)에
        //   wms_id 로 링크. 마스터=wms_suppliers(TeamMembers 거래처+WMS 발주/입고), 분석오버레이=sc_suppliers.
        try { $pdo->exec("ALTER TABLE sc_suppliers ADD COLUMN wms_id INTEGER"); } catch (\Throwable $e) { /* 이미 존재 */ }

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_risk_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
            rule TEXT, action TEXT, active INTEGER DEFAULT 1, created_at TEXT)");

        self::$db = $pdo;
        return $pdo;
    }

    private static function tenant(Request $request): string
    {
        $t = UserAuth::authedTenant($request);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    /**
     * [227차] 감사 P2 #5: /v420/supply/* 는 공개(bypass) 라우트라 익명 요청이 'demo' 버킷을 읽었다.
     *   읽기에도 인증 게이트 — 미인증(세션 토큰 없음)이면 true → 호출부가 빈 결과 반환(demo 데이터 미노출).
     *   쓰기는 이미 requirePro 로 차단됨. 인증된 데모/운영 사용자는 토큰 보유 → 정상 조회.
     */
    private static function isAnon(Request $request): bool
    {
        return UserAuth::authedTenant($request) === null;
    }

    private static function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function body(Request $request): array
    {
        $parsed = $request->getParsedBody();
        if (is_array($parsed) && count($parsed)) return $parsed;
        $raw = (string)$request->getBody();
        if ($raw === '') return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    // ── Supply Lines ─────────────────────────────────────────────────────────

    public static function listLines(Request $request, Response $response, array $args): Response
    {
        if (self::isAnon($request)) return self::json($response, ['ok'=>true,'lines'=>[]]); // [227차] 익명 demo 버킷 미노출
        $db = self::db(); $t = self::tenant($request);
        $ls = $db->prepare("SELECT * FROM sc_lines WHERE tenant_id=? ORDER BY created_at DESC");
        $ls->execute([$t]); $lines = $ls->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($lines as &$l) {
            $st = $db->prepare("SELECT * FROM sc_stages WHERE line_id=? AND tenant_id=? ORDER BY sort_order");
            $st->execute([$l['line_id'], $t]);
            $l['stages'] = $st->fetchAll(\PDO::FETCH_ASSOC);
        }
        return self::json($response, ['ok'=>true,'lines'=>$lines]);
    }

    public static function createLine(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1: 익명/무권한 쓰기 차단
        $db = self::db(); $t = self::tenant($request); $b = self::body($request);
        $lid = $b['line_id'] ?? ('SUP-' . strtoupper(substr(uniqid('', true), -10))); // [현 차수] rand 충돌 → 시간기반 고유 ID
        $db->prepare("INSERT OR REPLACE INTO sc_lines (tenant_id,line_id,supplier,sku,name,leadTime,risk,delayRate,totalCost,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
            ->execute([$t,$lid,$b['supplier']??'',$b['sku']??'',$b['name']??'',(int)($b['leadTime']??14),$b['risk']??'low',(float)($b['delayRate']??0),(float)($b['totalCost']??0),gmdate('c')]);
        // 재생성 시 기존 stage 정리(중복 방지)
        $db->prepare("DELETE FROM sc_stages WHERE line_id=? AND tenant_id=?")->execute([$lid, $t]);
        $stages = $b['stages'] ?? [
            ['stage'=>'Purchase Order','done'=>0],['stage'=>'생산','done'=>0],
            ['stage'=>'선적','done'=>0],['stage'=>'통관','done'=>0],
            ['stage'=>'입고','done'=>0],['stage'=>'출고준비','done'=>0]
        ];
        $ins = $db->prepare("INSERT INTO sc_stages (tenant_id,line_id,stage,stageDate,done,note,sort_order) VALUES (?,?,?,?,?,?,?)");
        foreach ($stages as $i => $s) {
            $ins->execute([$t,$lid,$s['stage']??'',$s['stageDate']??$s['date']??'',(int)($s['done']??0),$s['note']??'',$i]);
        }
        return self::json($response, ['ok'=>true,'line_id'=>$lid]);
    }

    public static function updateLine(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $db = self::db(); $t = self::tenant($request); $b = self::body($request); $id = (int)($args['id']??0);
        $sets = []; $params = [':id'=>$id, ':t'=>$t];
        foreach (['supplier','sku','name','leadTime','risk','delayRate','totalCost'] as $f) {
            if (isset($b[$f])) { $sets[] = "$f=:$f"; $params[":$f"] = $b[$f]; }
        }
        if (count($sets)) $db->prepare("UPDATE sc_lines SET ".implode(',',$sets)." WHERE id=:id AND tenant_id=:t")->execute($params);
        return self::json($response, ['ok'=>true]);
    }

    public static function deleteLine(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $db = self::db(); $t = self::tenant($request); $id = (int)($args['id']??0);
        $line = $db->prepare("SELECT line_id FROM sc_lines WHERE id=? AND tenant_id=?"); $line->execute([$id, $t]);
        $r = $line->fetch(\PDO::FETCH_ASSOC);
        if ($r) { $db->prepare("DELETE FROM sc_stages WHERE line_id=? AND tenant_id=?")->execute([$r['line_id'], $t]); }
        $db->prepare("DELETE FROM sc_lines WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($response, ['ok'=>true]);
    }

    public static function updateStage(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $db = self::db(); $t = self::tenant($request); $b = self::body($request); $id = (int)($args['id']??0);
        $line = $db->prepare("SELECT line_id FROM sc_lines WHERE id=? AND tenant_id=?"); $line->execute([$id, $t]);
        $r = $line->fetch(\PDO::FETCH_ASSOC);
        if (!$r) return self::json($response, ['ok'=>false,'error'=>'line not found'], 404);
        $stage = $b['stage']??''; $done = (int)($b['done']??1);
        $db->prepare("UPDATE sc_stages SET done=?, note=?, stageDate=? WHERE line_id=? AND stage=? AND tenant_id=?")
            ->execute([$done,$b['note']??'',gmdate('Y-m-d'),$r['line_id'],$stage,$t]);
        return self::json($response, ['ok'=>true]);
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────

    /* [257차 통합] 공급업체(공급망)↔거래처(WMS) 백엔드 SSOT 일원화.
       마스터=wms_suppliers(Db::pdo — TeamMembers 거래처+WMS 발주/입고), 분석오버레이=sc_suppliers(wms_id 링크).
       list=wms 마스터 기준 통합뷰(sc 분석 오버레이·legacy 비파괴 마이그레이션). CRUD=wms+sc 양측 동기.
       ★wms(Db::pdo) 접근 실패 시 기존 sc-only 동작으로 graceful 강등(회귀0). id 공간=wms supplier id. */
    private static function wmsPdo(): ?\PDO { try { return \Genie\Db::pdo(); } catch (\Throwable $e) { return null; } }

    public static function listSuppliers(Request $request, Response $response, array $args): Response
    {
        if (self::isAnon($request)) return self::json($response, ['ok'=>true,'suppliers'=>[]]); // [227차] 익명 demo 버킷 미노출
        $t = self::tenant($request);
        $db = self::db();
        $scStmt = $db->prepare("SELECT * FROM sc_suppliers WHERE tenant_id=?"); $scStmt->execute([$t]);
        $scRows = $scStmt->fetchAll(\PDO::FETCH_ASSOC);

        $w = self::wmsPdo(); $wmsRows = null;
        if ($w) { try { $wq = $w->prepare("SELECT id,name,contact FROM wms_suppliers WHERE tenant_id=? ORDER BY name"); $wq->execute([$t]); $wmsRows = $wq->fetchAll(\PDO::FETCH_ASSOC); } catch (\Throwable $e) { $wmsRows = null; } }

        if ($wmsRows === null) { // 강등: 기존 sc-only 동작 보존(회귀0)
            usort($scRows, fn($a,$b)=>strcmp((string)($a['name']??''),(string)($b['name']??'')));
            return self::json($response, ['ok'=>true,'suppliers'=>$scRows]);
        }

        $scByWms = []; $scByName = [];
        foreach ($scRows as $r) { if (!empty($r['wms_id'])) $scByWms[(int)$r['wms_id']] = $r; $nm=mb_strtolower(trim((string)($r['name']??''))); if($nm!=='') $scByName[$nm]=$r; }
        $wmsByName = [];
        foreach ($wmsRows as $w2) { $nm=mb_strtolower(trim((string)($w2['name']??''))); if($nm!=='') $wmsByName[$nm]=$w2; }

        // 비파괴 마이그레이션: wms_id 없는 legacy sc → 이름매칭 wms 백필, 없으면 wms 신규생성(거래처에도 노출).
        try {
            foreach ($scRows as $r) {
                if (!empty($r['wms_id'])) continue;
                $nm = mb_strtolower(trim((string)($r['name']??''))); if ($nm==='') continue;
                if (isset($wmsByName[$nm])) { $wid = (int)$wmsByName[$nm]['id']; }
                else {
                    $now=gmdate('c');
                    $w->prepare("INSERT INTO wms_suppliers (tenant_id,name,contact,active,created_at,updated_at) VALUES (?,?,?,1,?,?)")->execute([$t,(string)($r['name']??''),(string)($r['contact']??''),$now,$now]);
                    $wid = (int)$w->lastInsertId();
                    $row = ['id'=>$wid,'name'=>(string)($r['name']??''),'contact'=>(string)($r['contact']??'')];
                    $wmsRows[] = $row; $wmsByName[$nm] = $row;
                }
                $db->prepare("UPDATE sc_suppliers SET wms_id=? WHERE id=? AND tenant_id=?")->execute([$wid,(int)$r['id'],$t]);
                $scByWms[$wid] = $r;
            }
        } catch (\Throwable $e) { /* best-effort */ }

        $out = [];
        foreach ($wmsRows as $w2) {
            $wid = (int)$w2['id'];
            $s = $scByWms[$wid] ?? ($scByName[mb_strtolower(trim((string)($w2['name']??'')))] ?? null);
            $out[] = [
                'id' => $wid, 'sup_id' => $s['sup_id'] ?? ('WMS-'.$wid),
                'name' => (string)($w2['name'] ?? ''),
                'contact' => (string)((($w2['contact'] ?? '') !== '') ? $w2['contact'] : ($s['contact'] ?? '')),
                'country' => (string)($s['country'] ?? ''), 'category' => (string)($s['category'] ?? ''),
                'leadTime' => (int)($s['leadTime'] ?? 14), 'delayRate' => (float)($s['delayRate'] ?? 0),
                'orderCount' => (int)($s['orderCount'] ?? 0), 'reliability' => (float)($s['reliability'] ?? 95),
            ];
        }
        usort($out, fn($a,$b)=>strcmp($a['name'],$b['name']));
        return self::json($response, ['ok'=>true,'suppliers'=>$out]);
    }

    public static function createSupplier(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $db = self::db(); $t = self::tenant($request); $b = self::body($request);
        $sid = $b['sup_id'] ?? ('SUPL-'.strtoupper(substr(uniqid('', true), -10)));
        // 마스터 wms_suppliers 생성 → 거래처(TeamMembers)에도 등록(이중등록 해소). 실패 시 sc-only.
        $wid = null; $w = self::wmsPdo();
        if ($w) { try { $now=gmdate('c'); $w->prepare("INSERT INTO wms_suppliers (tenant_id,name,contact,active,created_at,updated_at) VALUES (?,?,?,1,?,?)")->execute([$t,(string)($b['name']??''),(string)($b['contact']??''),$now,$now]); $wid=(int)$w->lastInsertId(); } catch (\Throwable $e) { $wid=null; } }
        $db->prepare("INSERT OR REPLACE INTO sc_suppliers (tenant_id,sup_id,wms_id,name,country,category,leadTime,delayRate,orderCount,reliability,contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$t,$sid,$wid,$b['name']??'',$b['country']??'',$b['category']??'',(int)($b['leadTime']??14),(float)($b['delayRate']??0),(int)($b['orderCount']??0),(float)($b['reliability']??95),$b['contact']??'',gmdate('c')]);
        return self::json($response, ['ok'=>true,'sup_id'=>$sid,'id'=>$wid]);
    }

    public static function updateSupplier(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $db = self::db(); $t = self::tenant($request); $b = self::body($request); $id = (int)($args['id']??0);
        // 마스터 name/contact 동기화(wms). best-effort.
        $w = self::wmsPdo();
        if ($w) { try { $ws=[]; $wp=[':id'=>$id,':t'=>$t]; if(isset($b['name'])){$ws[]="name=:name";$wp[':name']=$b['name'];} if(isset($b['contact'])){$ws[]="contact=:contact";$wp[':contact']=$b['contact'];} if($ws) $w->prepare("UPDATE wms_suppliers SET ".implode(',',$ws)." WHERE id=:id AND tenant_id=:t")->execute($wp); } catch (\Throwable $e) {} }
        // 분석 오버레이 upsert(sc, wms_id 키). wms-origin(거래처 등록·sc 미존재)이면 신규 주석 행 생성.
        $exists = false;
        try { $q=$db->prepare("SELECT id FROM sc_suppliers WHERE wms_id=? AND tenant_id=? LIMIT 1"); $q->execute([$id,$t]); $exists=(bool)$q->fetchColumn(); } catch (\Throwable $e) {}
        if ($exists) {
            $sets = []; $params = [':wid'=>$id, ':t'=>$t];
            foreach (['name','country','category','leadTime','delayRate','orderCount','reliability','contact'] as $f) { if (isset($b[$f])) { $sets[]="$f=:$f"; $params[":$f"]=$b[$f]; } }
            if ($sets) $db->prepare("UPDATE sc_suppliers SET ".implode(',',$sets)." WHERE wms_id=:wid AND tenant_id=:t")->execute($params);
        } else {
            $sid = 'SUPL-'.strtoupper(substr(uniqid('', true), -10));
            $db->prepare("INSERT INTO sc_suppliers (tenant_id,sup_id,wms_id,name,country,category,leadTime,delayRate,orderCount,reliability,contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$t,$sid,$id,$b['name']??'',$b['country']??'',$b['category']??'',(int)($b['leadTime']??14),(float)($b['delayRate']??0),(int)($b['orderCount']??0),(float)($b['reliability']??95),$b['contact']??'',gmdate('c')]);
        }
        return self::json($response, ['ok'=>true]);
    }

    public static function deleteSupplier(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $t = self::tenant($request); $id = (int)($args['id']??0);
        // 오버레이 삭제(wms_id 또는 legacy sc.id) + 마스터 삭제(거래처에서도 제거=단일 마스터).
        try { self::db()->prepare("DELETE FROM sc_suppliers WHERE (wms_id=? OR id=?) AND tenant_id=?")->execute([$id,$id,$t]); } catch (\Throwable $e) {}
        $w = self::wmsPdo();
        if ($w) { try { $w->prepare("DELETE FROM wms_suppliers WHERE id=? AND tenant_id=?")->execute([$id,$t]); } catch (\Throwable $e) {} }
        return self::json($response, ['ok'=>true]);
    }

    // ── Risk Rules ───────────────────────────────────────────────────────────

    public static function listRiskRules(Request $request, Response $response, array $args): Response
    {
        if (self::isAnon($request)) return self::json($response, ['ok'=>true,'rules'=>[]]); // [227차] 익명 demo 버킷 미노출
        $t = self::tenant($request);
        $stmt = self::db()->prepare("SELECT * FROM sc_risk_rules WHERE tenant_id=? ORDER BY id");
        $stmt->execute([$t]);
        return self::json($response, ['ok'=>true,'rules'=>$stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function createRiskRule(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $db = self::db(); $t = self::tenant($request); $b = self::body($request);
        $db->prepare("INSERT INTO sc_risk_rules (tenant_id,rule,action,active,created_at) VALUES (?,?,?,1,?)")
            ->execute([$t,$b['rule']??'',$b['action']??'',gmdate('c')]);
        return self::json($response, ['ok'=>true,'id'=>$db->lastInsertId()]);
    }

    public static function toggleRiskRule(Request $request, Response $response, array $args): Response
    {
        if ($err = UserAuth::requirePro($request, $response)) return $err; // [현 차수] 감사 P1
        $t = self::tenant($request); $id = (int)($args['id']??0);
        self::db()->prepare("UPDATE sc_risk_rules SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($response, ['ok'=>true]);
    }

    // ── Summary ──────────────────────────────────────────────────────────────

    public static function summary(Request $request, Response $response, array $args): Response
    {
        if (self::isAnon($request)) return self::json($response, ['ok'=>true,'lines'=>0,'suppliers'=>0,'highRisk'=>0,'avgLeadTime'=>0,'totalCost'=>0]); // [227차] 익명 demo 버킷 미노출
        $db = self::db(); $t = self::tenant($request);
        $cnt = function(string $sql) use ($db, $t) { $s = $db->prepare($sql); $s->execute([$t]); return $s->fetchColumn(); };
        $lines = (int)$cnt("SELECT COUNT(*) FROM sc_lines WHERE tenant_id=?");
        // [257차 통합] 공급업체 수 = 통합 마스터(wms_suppliers) 기준. wms 실패 시 sc 폴백(회귀0).
        $suppliers = (int)$cnt("SELECT COUNT(*) FROM sc_suppliers WHERE tenant_id=?");
        $w = self::wmsPdo();
        if ($w) { try { $ws=$w->prepare("SELECT COUNT(*) FROM wms_suppliers WHERE tenant_id=?"); $ws->execute([$t]); $suppliers=(int)$ws->fetchColumn(); } catch (\Throwable $e) {} }
        $highRisk = (int)$cnt("SELECT COUNT(*) FROM sc_lines WHERE risk='high' AND tenant_id=?");
        $avgLead = $cnt("SELECT AVG(leadTime) FROM sc_lines WHERE tenant_id=?");
        $totalCost = $cnt("SELECT SUM(totalCost) FROM sc_lines WHERE tenant_id=?");
        return self::json($response, [
            'ok'=>true,'lines'=>$lines,'suppliers'=>$suppliers,'highRisk'=>$highRisk,
            'avgLeadTime'=>$avgLead!==false&&$avgLead!==null?round((float)$avgLead,1):0,
            'totalCost'=>(float)($totalCost??0)
        ]);
    }
}
