<?php
// seed_performance_metrics.php
// Generates mock data for performance_metrics table.

require_once __DIR__ . '/Db.php';
use Genie\Db;

try {
    $pdo = Db::pdo();
    
    // Create table if not exists (redundant but safe)
    $pdo->exec("CREATE TABLE IF NOT EXISTS performance_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        team VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        account_id VARCHAR(100),
        date DATE NOT NULL,
        impressions INT DEFAULT 0,
        clicks INT DEFAULT 0,
        spend DECIMAL(15,2) DEFAULT 0.00,
        conversions INT DEFAULT 0,
        revenue DECIMAL(15,2) DEFAULT 0.00,
        extra_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $teams = ['USA', 'Japan', 'Europe'];
    $channels = ['Meta', 'TikTok', 'Amazon'];
    $startDate = new DateTime('-30 days');
    $endDate = new DateTime('now');

    $pdo->exec("DELETE FROM performance_metrics WHERE tenant_id = 'demo'");

    $stmt = $pdo->prepare("INSERT INTO performance_metrics (tenant_id, team, channel, account, date, impressions, clicks, spend, conversions, revenue) 
                           VALUES ('demo', :team, :channel, :account, :date, :impressions, :clicks, :spend, :conversions, :revenue)");

    for ($d = clone $startDate; $d <= $endDate; $d->modify('+1 day')) {
        foreach ($teams as $team) {
            foreach ($channels as $channel) {
                $accountId = strtolower($team) . "_" . strtolower($channel) . "_001";
                $impressions = rand(5000, 20000);
                $clicks = rand(200, 1000);
                $conversions = rand(10, 50);
                $spend = $impressions * 0.005 + $clicks * 0.2;
                $revenue = $conversions * rand(50, 150);

                $stmt->execute([
                    ':team' => $team,
                    ':channel' => $channel,
                    ':account' => $accountId,
                    ':date' => $d->format('Y-m-d'),
                    ':impressions' => $impressions,
                    ':clicks' => $clicks,
                    ':spend' => $spend,
                    ':conversions' => $conversions,
                    ':revenue' => $revenue
                ]);
            }
        }
    }


    echo "Successfully seeded performance_metrics with demo data.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
