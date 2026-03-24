<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * ML Model Monitor — 드리프트 감지 + 자동 재학습 파이프라인
 *
 * Routes:
 *   GET  /api/models                    — 모델 목록 + 상태
 *   GET  /api/models/{id}/metrics       — 모델 성능 지표
 *   POST /api/models/{id}/retrain       — 수동 재학습 요청
 *   GET  /api/models/drift-report       — 드리프트 분석 리포트
 *   POST /api/models/drift-check        — 드리프트 감지 실행
 */
final class ModelMonitor
{
    private static function ensureTables(): void
    {
        $pdo = Db::pdo();
        $pdo->exec("CREATE TABLE IF NOT EXISTS ml_models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'classification',
            version TEXT DEFAULT 'v1.0',
            status TEXT DEFAULT 'active',
            accuracy REAL DEFAULT 0,
            auc_roc REAL DEFAULT 0,
            f1_score REAL DEFAULT 0,
            training_samples INTEGER DEFAULT 0,
            last_trained_at TEXT,
            drift_score REAL DEFAULT 0,
            drift_status TEXT DEFAULT 'ok',
            auto_retrain INTEGER DEFAULT 1,
            retrain_threshold REAL DEFAULT 0.15,
            created_at TEXT,
            updated_at TEXT
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS ml_model_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id INTEGER NOT NULL,
            tenant_id TEXT NOT NULL,
            accuracy REAL,
            auc_roc  REAL,
            f1_score REAL,
            precision_val REAL,
            recall_val REAL,
            drift_score REAL,
            sample_count INTEGER,
            recorded_at TEXT
        )");
        $pdo->exec("CREATE TABLE IF NOT EXISTS ml_retrain_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id INTEGER NOT NULL,
            tenant_id TEXT NOT NULL,
            trigger_type TEXT DEFAULT 'manual',
            old_accuracy REAL,
            new_accuracy REAL,
            status TEXT DEFAULT 'pending',
            started_at TEXT,
            completed_at TEXT
        )");
    }

    private static function tenant(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token') {
            try {
                $s = Db::pdo()->prepare('SELECT user_id FROM user_session WHERE token=? LIMIT 1');
                $s->execute([$m[1]]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) return (string)$r['user_id'];
            } catch (\Throwable) {}
        }
        return 'demo';
    }

    // GET /api/models
    public static function listModels(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);

        $stmt = $pdo->prepare("SELECT * FROM ml_models WHERE tenant_id=? ORDER BY id");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            // 데모 초기화
            $rows = self::seedDemoModels($pdo, $tenant);
        }

        // 각 모델의 드리프트 경보 자동 확인
        foreach ($rows as &$m) {
            $m['needs_retrain'] = (float)$m['drift_score'] > (float)$m['retrain_threshold'];
        }

        return TemplateResponder::respond($res, [
            'ok' => true,
            'models' => $rows,
            'summary' => [
                'total'   => count($rows),
                'healthy' => count(array_filter($rows, fn($m) => $m['drift_status'] === 'ok')),
                'drifted' => count(array_filter($rows, fn($m) => in_array($m['drift_status'], ['warning','critical']))),
                'retraining' => count(array_filter($rows, fn($m) => $m['status'] === 'retraining')),
            ],
        ]);
    }

    // GET /api/models/{id}/metrics
    public static function modelMetrics(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $modelId  = (int)($args['id'] ?? 0);

        $stmt = $pdo->prepare("SELECT * FROM ml_model_metrics WHERE model_id=? AND tenant_id=? ORDER BY recorded_at DESC LIMIT 30");
        $stmt->execute([$modelId, $tenant]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($history)) {
            $history = self::demoMetricHistory($modelId);
        }

        return TemplateResponder::respond($res, ['ok' => true, 'metrics' => $history]);
    }

    // POST /api/models/{id}/retrain
    public static function retrain(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo      = Db::pdo();
        $tenant   = self::tenant($req);
        $modelId  = (int)($args['id'] ?? 0);
        $now      = gmdate('c');

        // 모델 현재 정확도 조회
        $m = $pdo->prepare("SELECT accuracy FROM ml_models WHERE id=? AND tenant_id=?");
        $m->execute([$modelId, $tenant]);
        $model = $m->fetch(PDO::FETCH_ASSOC);
        $oldAcc = $model ? (float)$model['accuracy'] : 0.0;

        // 재학습 로그 생성
        $pdo->prepare("INSERT INTO ml_retrain_log(model_id,tenant_id,trigger_type,old_accuracy,status,started_at) VALUES(?,?,?,?,?,?)")
            ->execute([$modelId, $tenant, 'manual', $oldAcc, 'running', $now]);

        // 재학습 시뮬레이션: 약간 향상된 정확도
        $newAcc = min(0.999, $oldAcc + (mt_rand(5, 30) / 1000));
        $newDrift = max(0, (mt_rand(0, 50) / 1000)); // 재학습 후 드리프트 낮아짐

        $pdo->prepare("UPDATE ml_models SET accuracy=?,drift_score=?,drift_status='ok',status='active',last_trained_at=?,updated_at=? WHERE id=? AND tenant_id=?")
            ->execute([$newAcc, $newDrift, $now, $now, $modelId, $tenant]);

        $pdo->prepare("UPDATE ml_retrain_log SET new_accuracy=?,status='completed',completed_at=? WHERE model_id=? AND tenant_id=? AND status='running'")
            ->execute([$newAcc, $now, $modelId, $tenant]);

        return TemplateResponder::respond($res, [
            'ok'          => true,
            'model_id'    => $modelId,
            'old_accuracy' => round($oldAcc * 100, 2),
            'new_accuracy' => round($newAcc * 100, 2),
            'improvement' => round(($newAcc - $oldAcc) * 100, 2),
            'drift_score' => $newDrift,
            'message'     => '재학습 완료',
        ]);
    }

    // GET /api/models/drift-report
    public static function driftReport(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);

        $stmt = $pdo->prepare("SELECT id,name,accuracy,drift_score,drift_status,last_trained_at FROM ml_models WHERE tenant_id=?");
        $stmt->execute([$tenant]);
        $models = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($models)) $models = self::demoDriftReport();

        return TemplateResponder::respond($res, [
            'ok'      => true,
            'report'  => $models,
            'generated_at' => gmdate('c'),
            'recommendation' => count(array_filter($models, fn($m)=>($m['drift_score']??0)>0.15)) > 0
                ? '드리프트가 감지된 모델이 있습니다. 재학습을 권장합니다.'
                : '모든 모델이 정상 범위 내에 있습니다.',
        ]);
    }

    // POST /api/models/drift-check
    public static function driftCheck(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $now    = gmdate('c');

        $stmt = $pdo->prepare("SELECT id,name,accuracy,drift_score,retrain_threshold,auto_retrain FROM ml_models WHERE tenant_id=? AND status='active'");
        $stmt->execute([$tenant]);
        $models = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $retrainTriggered = [];
        foreach ($models as $m) {
            // 새 드리프트 점수 시뮬레이션
            $newDrift = (float)$m['drift_score'] + (mt_rand(-20, 30) / 1000);
            $newDrift = max(0, min(0.5, $newDrift));
            $status   = $newDrift < 0.1 ? 'ok' : ($newDrift < 0.2 ? 'warning' : 'critical');
            $pdo->prepare("UPDATE ml_models SET drift_score=?,drift_status=?,updated_at=? WHERE id=? AND tenant_id=?")
                ->execute([$newDrift, $status, $now, $m['id'], $tenant]);

            // 자동 재학습 조건 충족 시
            if ($m['auto_retrain'] && $newDrift >= (float)$m['retrain_threshold']) {
                $retrainTriggered[] = ['model_id' => $m['id'], 'name' => $m['name'], 'drift' => $newDrift];
                $pdo->prepare("UPDATE ml_models SET status='retraining',updated_at=? WHERE id=? AND tenant_id=?")
                    ->execute([$now, $m['id'], $tenant]);
            }
        }

        return TemplateResponder::respond($res, [
            'ok'                => true,
            'checked'           => count($models),
            'retrain_triggered' => $retrainTriggered,
            'message'           => count($retrainTriggered) > 0 ? count($retrainTriggered).'개 모델 자동 재학습 시작됨' : '모든 모델 정상',
        ]);
    }

    private static function seedDemoModels(PDO $pdo, string $tenant): array
    {
        $now = gmdate('c');
        $models = [
            ['이탈 예측 모델 (Churn)', 'classification', 'v2.1', 'active', 0.891, 0.923, 0.874, 45200, 0.03, 'ok'],
            ['구매 전환 예측', 'classification', 'v1.8', 'active', 0.856, 0.889, 0.841, 32800, 0.18, 'warning'],
            ['상품 추천 엔진', 'recommendation', 'v3.0', 'active', 0.912, 0.945, 0.903, 78000, 0.05, 'ok'],
            ['LTV 예측 모델', 'regression', 'v1.5', 'active', 0.834, 0.871, 0.819, 28900, 0.27, 'critical'],
            ['광고 ROAS 예측', 'regression', 'v2.3', 'retraining', 0.879, 0.898, 0.867, 51200, 0.08, 'ok'],
        ];
        $rows = [];
        foreach ($models as $m) {
            $pdo->prepare("INSERT INTO ml_models(tenant_id,name,type,version,status,accuracy,auc_roc,f1_score,training_samples,drift_score,drift_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute(array_merge([$tenant], $m, [$now, $now]));
            $rows[] = array_combine(['tenant_id','name','type','version','status','accuracy','auc_roc','f1_score','training_samples','drift_score','drift_status'], array_merge([$tenant], $m));
        }
        return $pdo->prepare("SELECT * FROM ml_models WHERE tenant_id=?")->execute([$tenant]) ? $pdo->query("SELECT * FROM ml_models WHERE tenant_id='$tenant'")->fetchAll(PDO::FETCH_ASSOC) : $rows;
    }

    private static function demoMetricHistory(int $modelId): array
    {
        $history = [];
        for ($i = 29; $i >= 0; $i--) {
            $base = 0.85 + ($modelId % 5) * 0.01;
            $history[] = [
                'recorded_at'   => date('Y-m-d', strtotime("-{$i} days")),
                'accuracy'      => round($base + sin($i/5)*0.02 + (mt_rand(-5,5)/1000), 4),
                'auc_roc'       => round($base + 0.03 + cos($i/5)*0.02, 4),
                'drift_score'   => round(abs(sin($i/8))*0.3, 4),
                'sample_count'  => 1000 + $i * 50,
            ];
        }
        return $history;
    }

    private static function demoDriftReport(): array
    {
        return [
            ['id'=>1,'name'=>'이탈 예측 모델','accuracy'=>0.891,'drift_score'=>0.03,'drift_status'=>'ok','last_trained_at'=>date('Y-m-d',strtotime('-5 days'))],
            ['id'=>2,'name'=>'구매 전환 예측','accuracy'=>0.856,'drift_score'=>0.18,'drift_status'=>'warning','last_trained_at'=>date('Y-m-d',strtotime('-21 days'))],
            ['id'=>3,'name'=>'상품 추천 엔진','accuracy'=>0.912,'drift_score'=>0.05,'drift_status'=>'ok','last_trained_at'=>date('Y-m-d',strtotime('-3 days'))],
            ['id'=>4,'name'=>'LTV 예측 모델','accuracy'=>0.834,'drift_score'=>0.27,'drift_status'=>'critical','last_trained_at'=>date('Y-m-d',strtotime('-45 days'))],
        ];
    }
}
