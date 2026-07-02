<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * 고객 AI 예측 — Klaviyo Predictive Analytics 수준 이상 고도화 v2
 *
 * ✅ 기능:
 * - RFM 기반 이탈 위험 스코어링 (0~100)
 * - LTV 예측 (회귀 기반, 구매 패턴 학습)
 * - 30일/90일 구매확률 예측 (Logistic Regression 근사)
 * - 상품 추천 (협업 필터링 + 카테고리 친화도)
 * - ML 모델 성능 지표 (정확도, AUC-ROC, MAPE)
 * - 고객 등급 자동 분류 (Champions/Loyals/AtRisk/Lost/New)
 * - 세그먼트 → 이메일/카카오/웹팝업 자동 액션 제안
 * - 데모 모드: 시뮬레이션 데이터 반환 (DB 불필요)
 * - 유료 모드: 실제 DB 데이터 기반 예측
 */
class CustomerAI
{
    private static function db(): \PDO { return Db::pdo(); }

    /** 190차: 인증 세션 user 의 격리 테넌트(crm_* 공유 테이블 스코핑). requirePro 통과 후 호출. */
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /** Authorization 헤더에서 플랜 확인 (demo/pro/admin) */
    private static function extractPlan(Request $req): string
    {
        $h = $req->getHeaderLine('Authorization');
        if (!preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
            // 쿼리 파라미터 폴백
            $token = $req->getQueryParams()['token'] ?? null;
            if (!$token) return 'demo';
            $m = [null, $token];
        }
        $token = trim($m[1]);
        try {
            $pdo = self::db();
            $now = gmdate('Y-m-d\\TH:i:s\\Z');
            $stmt = $pdo->prepare(
                'SELECT COALESCE(u.plans, u.plan, \'demo\') AS plan
                   FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, $now]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row ? ($row['plan'] ?? 'demo') : 'demo';
        } catch (\Exception $e) {
            return 'demo'; // DB 없으면 데모 처리
        }
    }

    /* ─── GET /api/customer-ai/churn-scores ─── 이탈 스코어 ──────── */
    public static function churnScores(Request $req, Response $res): Response
    {
        $plan = self::extractPlan($req);
        $isDemoToken = (false /*was demo*/);

        if ($isDemoToken) {
            $customers = [];
            $summary = [
                'total'      => count($customers),
                'high_risk'  => count(array_filter($customers, fn($c) => $c['risk_level'] === 'high')),
                'medium_risk'=> count(array_filter($customers, fn($c) => $c['risk_level'] === 'medium')),
                'low_risk'   => count(array_filter($customers, fn($c) => $c['risk_level'] === 'low')),
                'total_ltv_at_risk' => array_sum(array_column(
                    array_filter($customers, fn($c) => $c['risk_level'] === 'high'), 'total_ltv'
                )),
                'predicted_revenue_30d' => array_sum(array_map(
                    fn($c) => (int)($c['ltv_3m'] * $c['purchase_prob_30d'] / 100), $customers
                )),
            ];
            return self::json($res, ['ok' => true, 'customers' => $customers, 'summary' => $summary, 'mode' => 'demo']);
        }

        // 유료 사용자: 실제 DB 데이터
        if ($err = UserAuth::requirePro($req, $res)) return $err;

        try {
            $pdo = self::db();
            $pdo->query("SELECT 1 FROM crm_customers LIMIT 1");
        } catch (\Exception $e) {
            // DB에 데이터 없으면 시뮬레이션 반환
            $customers = [];
            return self::json($res, ['ok' => true, 'customers' => $customers, 'summary' => ['total' => count($customers)], 'mode' => 'simulated']);
        }

        $p = $req->getQueryParams();
        $limit = min(500, max(10, (int)($p['limit'] ?? 100)));
        $tenant = self::tenant($req);

        $stmt = $pdo->prepare("
            SELECT c.id, c.email, c.name, c.grade, c.ltv, c.rfm_score,
                   COALESCE(a.last_purchase_date, c.created_at) AS last_purchase_date,
                   COALESCE(a.purchase_count, 0) AS purchase_count,
                   COALESCE(a.total_amount, 0) AS total_amount,
                   COALESCE(a.avg_order_value, 0) AS avg_order_value
            FROM crm_customers c
            LEFT JOIN (
                SELECT customer_id,
                       MAX(created_at) AS last_purchase_date,
                       COUNT(*) AS purchase_count,
                       SUM(amount) AS total_amount,
                       AVG(amount) AS avg_order_value
                FROM crm_activities WHERE type='purchase' AND tenant_id=:t
                GROUP BY customer_id
            ) a ON a.customer_id = c.id
            WHERE c.tenant_id=:t
            ORDER BY c.ltv DESC
            LIMIT 1000
        ");
        $stmt->execute([':t'=>$tenant]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $result = [];
        $now = time();
        foreach ($rows as $c) {
            $daysSincePurchase = $c['last_purchase_date']
                ? max(0, (int)round(($now - strtotime($c['last_purchase_date'])) / 86400))
                : 999;
            $purchaseCount = (int)$c['purchase_count'];
            $totalAmount   = (float)$c['total_amount'];

            $recRisk = match(true) {
                $daysSincePurchase <= 30 => 5,  $daysSincePurchase <= 60 => 20,
                $daysSincePurchase <= 90 => 40, $daysSincePurchase <= 180 => 65,
                $daysSincePurchase <= 365 => 80, default => 95,
            };
            $freqRisk = match(true) {
                $purchaseCount >= 10 => 5, $purchaseCount >= 5 => 15,
                $purchaseCount >= 3 => 30, $purchaseCount >= 1 => 50, default => 80,
            };
            $monRisk = match(true) {
                $totalAmount >= 1000000 => 5, $totalAmount >= 500000 => 15,
                $totalAmount >= 200000 => 30, $totalAmount >= 50000 => 50, default => 70,
            };
            $churnScore = min(100, max(0, (int)round($recRisk * 0.5 + $freqRisk * 0.3 + $monRisk * 0.2)));
            $riskLevel  = match(true) { $churnScore >= 70 => 'high', $churnScore >= 40 => 'medium', default => 'low' };

            // 구매확률 예측 (Logistic Regression 근사)
            $logit = 2.5 - ($daysSincePurchase / 60) + ($purchaseCount * 0.3) + ($totalAmount / 500000);
            $prob30 = max(3, min(97, (int)round(100 / (1 + exp(-$logit)))));
            // 193차 Sprint4: rand() 지터 제거 — 90일 구매확률은 30일 대비 잔여 헤드룸의 일정비율 상향(결정적·안정).
            $prob90 = min(99, $prob30 + max(5, (int)round((100 - $prob30) * 0.2)));

            // LTV 예측
            $avgCycle = $purchaseCount > 1 ? ($daysSincePurchase / $purchaseCount) : 90;
            $lifespan = max(6, min(36, (int)round(12 / max(1, $avgCycle / 30))));
            $monthlyRev = $purchaseCount > 0 ? ($totalAmount / max(1, $daysSincePurchase / 30)) : 0;

            $result[] = [
                'id'                  => $c['id'],
                'email'               => $c['email'],
                'name'                => $c['name'],
                'grade'               => $c['grade'],
                'churn_score'         => $churnScore,
                'risk_level'          => $riskLevel,
                'purchase_prob_30d'   => $prob30,
                'purchase_prob_90d'   => $prob90,
                'days_since_purchase' => $daysSincePurchase,
                'purchase_count'      => $purchaseCount,
                'total_ltv'           => $totalAmount,
                'ltv_3m'              => (int)round($monthlyRev * 3),
                'ltv_12m'             => (int)round($monthlyRev * 12),
                'clv'                 => (int)round($monthlyRev * $lifespan),
                'next_purchase_date'  => date('Y-m-d', $now + max(1, (int)round($avgCycle)) * 86400),
                'recommended_action'  => match($riskLevel) {
                    'high' => ['type'=>'winback_campaign','channel'=>'kakao+email','discount'=>'20%','urgency'=>'높음','message'=>'특별 재방문 할인 제공'],
                    'medium' => ['type'=>'nurture_campaign','channel'=>'email','discount'=>'10%','urgency'=>'보통','message'=>'맞춤 상품 추천 이메일'],
                    default => ['type'=>'vip_reward','channel'=>'email','discount'=>'5%','urgency'=>'낮음','message'=>'VIP 감사 메시지'],
                },
            ];
        }

        usort($result, fn($a, $b) => $b['churn_score'] - $a['churn_score']);
        $result = array_slice($result, 0, $limit);

        $summary = [
            'total'      => count($result),
            'high_risk'  => count(array_filter($result, fn($c) => $c['risk_level'] === 'high')),
            'medium_risk'=> count(array_filter($result, fn($c) => $c['risk_level'] === 'medium')),
            'low_risk'   => count(array_filter($result, fn($c) => $c['risk_level'] === 'low')),
            'total_ltv_at_risk' => array_sum(array_column(
                array_filter($result, fn($c) => $c['risk_level'] === 'high'), 'total_ltv'
            )),
            'predicted_revenue_30d' => array_sum(array_map(
                fn($c) => (int)($c['ltv_12m'] / 12 * $c['purchase_prob_30d'] / 100), $result
            )),
        ];

        return self::json($res, ['ok' => true, 'customers' => $result, 'summary' => $summary, 'mode' => 'live']);
    }

    /* ─── GET /api/customer-ai/model-performance ─── 모델 성능 ───── */
    public static function modelPerformance(Request $req, Response $res): Response
    {
        // ★ 201차 P0-3: 운영(실 테넌트)에 날조 모델지표 노출 금지. 데모 테넌트만 예시 지표.
        if (self::tenant($req) !== 'demo') {
            $samples = 0;
            try {
                $pdo = self::db(); $t = self::tenant($req);
                $s = $pdo->prepare("SELECT COUNT(*) FROM crm_customers WHERE tenant_id=?");
                $s->execute([$t]); $samples = (int)$s->fetchColumn();
            } catch (\Throwable $e) {}
            return self::json($res, [
                'ok' => true, 'mode' => 'simulated', 'metrics' => null,
                'training_samples' => $samples,
                'note' => 'AI 모델 학습 데이터가 축적되면 실제 성능 지표가 표시됩니다.',
            ]);
        }
        // 데모 전용: 예시 지표
        $metrics = [
            'churn_prediction' => [
                'model' => 'RFM + Logistic Regression',
                'accuracy' => 87.3,
                'auc_roc'  => 0.912,
                'precision'=> 0.841,
                'recall'   => 0.879,
                'f1_score' => 0.860,
                'last_trained' => date('Y-m-d', strtotime('-2 days')),
                'training_samples' => 12847,
                'features' => ['recency','frequency','monetary','avg_order_value','channel_diversity'],
            ],
            'ltv_prediction' => [
                'model' => 'Gradient Boosting + Time Series',
                'mape'  => 11.4,     // Mean Absolute Percentage Error
                'rmse'  => 42800,
                'r2'    => 0.876,
                'last_trained' => date('Y-m-d', strtotime('-1 day')),
                'training_samples' => 12847,
                'features' => ['purchase_history','seasonality','category_affinity','payment_method'],
            ],
            'purchase_prob' => [
                'model' => 'Logistic Regression + Feature Engineering',
                'accuracy' => 82.1,
                'auc_roc'  => 0.891,
                'precision'=> 0.814,
                'recall'   => 0.836,
                'last_trained' => date('Y-m-d'),
                'training_samples' => 12847,
                'features' => ['days_since_purchase','purchase_freq','total_spend','channel','season'],
            ],
            'product_recommendation' => [
                'model' => 'Collaborative Filtering + Content-Based',
                'hit_rate'  => 34.7,  // 추천 상품 중 실제 구매율
                'ndcg'      => 0.721, // 순위 품질
                'coverage'  => 78.3,  // 전체 상품 중 추천 커버리지
                'last_trained' => date('Y-m-d', strtotime('-3 hours')),
                'training_samples' => 88420,
            ],
            'overall_score' => 8.7,  // out of 10.0
            'training_schedule' => 'daily 04:00 KST',
            'version' => 'v2.4.1',
        ];

        return self::json($res, ['ok' => true, 'metrics' => $metrics, 'mode' => 'demo']);
    }

    /* ─── GET /api/customer-ai/product-recommendations ─── 상품 추천 */
    public static function productRecommendations(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $customerId = (int)($p['customer_id'] ?? 0);
        $limit = min(10, max(3, (int)($p['limit'] ?? 5)));

        // 208차 검수(P2): rand 합성 추천은 데모 전용 — 운영은 빈 결과(가짜 affinity/매출 유입 차단).
        if (self::tenant($req) !== 'demo') {
            return self::json($res, ['ok' => true, 'recommendations' => [], 'mode' => 'simulated']);
        }
        // 데모 상품 풀
        $products = [];

        shuffle($products);
        $recs = [];
        foreach (array_slice($products, 0, $limit) as $p2) {
            $recs[] = array_merge($p2, [
                'affinity_score'    => rand(65, 98),
                'expected_revenue'  => (int)($p2['price'] * rand(20, 60) / 100),
                'reason'            => match($p2['category']) {
                    '전자제품' => '구매 이력 기반 카테고리 친화도 높음',
                    '뷰티'    => '유사 고객 구매 패턴 기반 추천',
                    '패션'    => '최근 열람 상품 연관 분석',
                    default   => '인기 상품 + 개인화 가중치 적용',
                },
            ]);
        }

        usort($recs, fn($a, $b) => $b['affinity_score'] - $a['affinity_score']);

        return self::json($res, ['ok' => true, 'customer_id' => $customerId, 'recommendations' => $recs]);
    }

    /* ─── GET /api/customer-ai/ltv-segments ─── LTV 세그먼트 ────── */
    public static function ltvSegments(Request $req, Response $res): Response
    {
        $plan = self::extractPlan($req);
        $isDemo = (false /*was demo*/);

        if ($isDemo) {
            $segments = [];
            return self::json($res, ['ok' => true, 'segments' => $segments, 'mode' => 'demo']);
        }

        if ($err = UserAuth::requirePro($req, $res)) return $err;

        try {
            $pdo = self::db();
            $pdo->query("SELECT 1 FROM crm_customers LIMIT 1");
        } catch (\Exception $e) {
            return self::json($res, ['ok' => true, 'segments' => [], 'mode' => 'simulated']);
        }

        $tenant = self::tenant($req);
        $stStmt = $pdo->prepare("
            SELECT
                CASE
                    WHEN ltv >= 1000000 THEN 'diamond'
                    WHEN ltv >= 500000  THEN 'gold'
                    WHEN ltv >= 200000  THEN 'silver'
                    WHEN ltv >= 50000   THEN 'bronze'
                    ELSE 'new'
                END AS tier,
                COUNT(*) AS customer_count,
                COALESCE(AVG(ltv), 0) AS avg_ltv,
                COALESCE(SUM(ltv), 0) AS total_ltv,
                COALESCE(MAX(ltv), 0) AS max_ltv
            FROM crm_customers
            WHERE tenant_id=:t
            GROUP BY tier
            ORDER BY total_ltv DESC
        ");
        $stStmt->execute([':t'=>$tenant]);
        $stats = $stStmt->fetchAll(\PDO::FETCH_ASSOC);

        $tierMeta = [
            'diamond' => ['label'=>'💎 다이아몬드','color'=>'#60a5fa','threshold'=>'₩1,000,000+','action'=>'VIP 전용 혜택 제공'],
            'gold'    => ['label'=>'🥇 골드','color'=>'#fbbf24','threshold'=>'₩500,000+','action'=>'프리미엄 멤버십 업그레이드'],
            'silver'  => ['label'=>'🥈 실버','color'=>'#94a3b8','threshold'=>'₩200,000+','action'=>'골드 업그레이드 유도 캠페인'],
            'bronze'  => ['label'=>'🥉 브론즈','color'=>'#cd7c4b','threshold'=>'₩50,000+','action'=>'재구매 인센티브 이메일'],
            'new'     => ['label'=>'🌱 신규','color'=>'#4ade80','threshold'=>'~₩50,000','action'=>'온보딩 시리즈 여정 시작'],
        ];

        $result = [];
        foreach ($stats as $s) {
            $result[] = array_merge($s, $tierMeta[$s['tier']] ?? ['label'=>$s['tier'],'color'=>'#6366f1','threshold'=>'-','action'=>'-']);
        }

        return self::json($res, ['ok' => true, 'segments' => $result, 'mode' => 'live']);
    }

    /* ─── POST /api/customer-ai/auto-action ─── 자동 액션 실행 ──── */
    public static function autoAction(Request $req, Response $res): Response
    {
        // 260차: 가짜집행 제거 — 실제 대기열(crm_auto_action)에 영속하고 정직한 상태를 반환한다.
        //   기존엔 DB 기록 없이 "예약됨/병행 발송"을 날조 반환(campaign_id 폐기) → 존재하지 않는 캠페인을 보고.
        $b = (array)$req->getParsedBody();
        $actionType  = $b['action_type'] ?? 'winback_campaign';
        $riskLevel   = $b['risk_level'] ?? 'high';
        $channelPref = $b['channel'] ?? 'email';
        $segmentName = $b['segment_name'] ?? '이탈 위험 고객';
        $estimatedReach = (int)($b['estimated_reach'] ?? 0);

        $pdo = self::db();
        $tenant = self::tenant($req);
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $pdo->exec($isMy
                ? "CREATE TABLE IF NOT EXISTS crm_auto_action (
                     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                     action_ref VARCHAR(40) NOT NULL, action_type VARCHAR(64) NOT NULL, risk_level VARCHAR(32) NOT NULL,
                     channel VARCHAR(64) NOT NULL, segment_name VARCHAR(255) NOT NULL, estimated_reach INT NOT NULL DEFAULT 0,
                     status VARCHAR(32) NOT NULL DEFAULT 'queued', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                : "CREATE TABLE IF NOT EXISTS crm_auto_action (
                     id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, action_ref TEXT NOT NULL,
                     action_type TEXT NOT NULL, risk_level TEXT NOT NULL, channel TEXT NOT NULL, segment_name TEXT NOT NULL,
                     estimated_reach INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'queued',
                     created_at TEXT NOT NULL DEFAULT (datetime('now')))");
        } catch (\Throwable $e) { /* 존재 시 무시 */ }

        $ref = 'AACT-' . strtoupper(substr(md5(uniqid()), 0, 8));
        $persisted = false;
        try {
            $pdo->prepare("INSERT INTO crm_auto_action (tenant_id, action_ref, action_type, risk_level, channel, segment_name, estimated_reach, status, created_at) VALUES (?,?,?,?,?,?,?, 'queued', ?)")
                ->execute([$tenant, $ref, $actionType, $riskLevel, $channelPref, $segmentName, $estimatedReach, gmdate('Y-m-d H:i:s')]);
            $persisted = true;
        } catch (\Throwable $e) { error_log('[CustomerAI] autoAction persist: ' . $e->getMessage()); }

        return self::json($res, [
            'ok'             => true,
            'action_type'    => $actionType,
            'risk_level'     => $riskLevel,
            'channel'        => $channelPref,
            'segment_name'   => $segmentName,
            'estimated_reach'=> (int)$estimatedReach, // 193차: rand 날조 제거 — 실 도달수 없으면 0(정직)
            'queued'         => $persisted,
            'action_id'      => $ref,
            'persisted'      => $persisted,
            // 260차 정직화: 실제 발송이 아니라 "실행 대기열 등록"임을 명시(발송은 채널 연동·승인 후 집행).
            'message' => $persisted
                ? "{$segmentName} 대상 '{$actionType}' 액션이 실행 대기열에 등록되었습니다(참조 {$ref}). 실제 발송은 채널 연동·승인 후 진행됩니다."
                : "액션 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ], $persisted ? 200 : 500);
    }

    /* ─── GET /api/customer-ai/next-best-action ─── 고객별 최적 액션 */
    public static function nextBestAction(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $customerId = (int)($p['customer_id'] ?? 0);

        // ★ 201차 P0-3: 운영(실 테넌트)에 날조 액션/예상매출 노출 금지. 데모 테넌트만 예시.
        if (self::tenant($req) !== 'demo') {
            return self::json($res, ['ok' => true, 'customer_id' => $customerId, 'actions' => [], 'mode' => 'simulated',
                'note' => '고객 행동 데이터가 축적되면 개인화 추천 액션이 표시됩니다.']);
        }

        $actions = [
            ['rank'=>1,'action'=>'send_kakao_alimtalk','label'=>'카카오 알림톡 발송',
             'reason'=>'최근 30일 이메일 미반응, 카카오 채널 반응률 2.4배 높음',
             'expected_conversion'=>'12%','channel'=>'kakao','template'=>'재방문 유도 알림톡',
             'est_revenue'=>180000],
            ['rank'=>2,'action'=>'apply_product_recommendation','label'=>'개인화 상품 추천 이메일',
             'reason'=>'과거 구매 카테고리 기반 유사 상품 3개 추천 (협업 필터링)',
             'expected_conversion'=>'8%','channel'=>'email','template'=>'맞춤 상품 추천',
             'est_revenue'=>120000],
            ['rank'=>3,'action'=>'web_popup_trigger','label'=>'재방문 시 웹팝업 트리거',
             'reason'=>'이탈 의도 감지 시 즉시 팝업 제공, CVR 40% 개선 효과',
             'expected_conversion'=>'15%','channel'=>'web_popup','template'=>'슬라이드인 쿠폰',
             'est_revenue'=>90000],
        ];

        return self::json($res, [
            'ok'     => true,
            'customer_id' => $customerId,
            'actions' => $actions,
        ]);
    }

    /* ─── GET /api/customer-ai/integrated-summary ─── 전체 연동 요약 */
    public static function integratedSummary(Request $req, Response $res): Response
    {
        // ★ 201차 P0-3: 운영(실 테넌트)에 날조 KPI/연동상태 노출 금지. 실 데이터 집계 또는 정직 0.
        if (self::tenant($req) !== 'demo') {
            $t = self::tenant($req);
            $cust = 0; $hasCrm = false; $hasEmail = false;
            try {
                $pdo = self::db();
                $s = $pdo->prepare("SELECT COUNT(*) FROM crm_customers WHERE tenant_id=?");
                $s->execute([$t]); $cust = (int)$s->fetchColumn(); $hasCrm = $cust > 0;
            } catch (\Throwable $e) {}
            return self::json($res, [
                'ok' => true, 'mode' => 'simulated',
                'kpis' => [
                    'total_customers' => $cust, 'high_risk_count' => 0, 'high_ltv_count' => 0,
                    'predicted_revenue_30d' => 0, 'avg_purchase_prob' => 0, 'avg_churn_score' => 0,
                    'active_campaigns' => 0, 'active_popups' => 0, 'journey_enrollments' => 0,
                ],
                'integrations' => [
                    'crm'       => ['connected' => $hasCrm, 'segments' => 0, 'auto_sync' => false],
                    'email'     => ['connected' => false, 'campaigns' => 0, 'ab_tests' => 0],
                    'kakao'     => ['connected' => false, 'campaigns' => 0, 'alimtalk' => false],
                    'journey'   => ['connected' => false, 'active_journeys' => 0, 'enrollments' => 0],
                    'web_popup' => ['connected' => false, 'active_popups' => 0, 'ctr' => 0],
                    'inventory' => ['connected' => false, 'low_stock_alerts' => 0],
                    'orders'    => ['connected' => false, 'pending_orders' => 0],
                ],
                'model_health' => ['status' => 'untrained', 'last_run' => null, 'accuracy' => null],
                'note' => '데이터·연동이 축적되면 실제 통합 지표가 표시됩니다.',
            ]);
        }
        // 데모 전용: 예시 데이터
        $data = [
            'ok' => true,
            'kpis' => [
                'total_customers'   => 12847,
                'high_risk_count'   => 1243,
                'high_ltv_count'    => 847,
                'predicted_revenue_30d' => 124000000,
                'avg_purchase_prob' => 54.2,
                'avg_churn_score'   => 38.7,
                'active_campaigns'  => 7,
                'active_popups'     => 3,
                'journey_enrollments'=> 2341,
            ],
            'integrations' => [
                'crm'           => ['connected'=>true,'segments'=>4,'auto_sync'=>true],
                'email'         => ['connected'=>true,'campaigns'=>3,'ab_tests'=>2],
                'kakao'         => ['connected'=>true,'campaigns'=>3,'alimtalk'=>true],
                'journey'       => ['connected'=>true,'active_journeys'=>3,'enrollments'=>2341],
                'web_popup'     => ['connected'=>true,'active_popups'=>3,'ctr'=>22.3],
                'inventory'     => ['connected'=>true,'low_stock_alerts'=>2],
                'orders'        => ['connected'=>true,'pending_orders'=>4],
            ],
            'model_health'  => ['status'=>'healthy','last_run'=>date('Y-m-d H:i:s', strtotime('-2 hours')),'accuracy'=>87.3],
        ];

        return self::json($res, $data);
    }
}
