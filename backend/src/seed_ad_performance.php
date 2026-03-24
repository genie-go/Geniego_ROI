<?php
// seed_ad_performance.php
// Generates mock ad performance data for demo users.

require_once __DIR__ . '/../../vendor/autoload.php'; // adjust path as needed

$pdo = new PDO('mysql:host=localhost;dbname=geniego_roi;charset=utf8', 'root', 'qlqjs@Elql3!');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$teams = ['US', 'JP', 'EU'];
$channels = ['Meta', 'TikTok', 'Amazon'];
$productIds = range(1, 5);
$startDate = new DateTime('-30 days');
$endDate = new DateTime('now');

$insertStmt = $pdo->prepare('INSERT INTO ad_performance (team, channel, product_id, date, impressions, clicks, conversions, spend, is_demo) VALUES (:team, :channel, :product_id, :date, :impressions, :clicks, :conversions, :spend, 1)');

for ($d = clone $startDate; $d <= $endDate; $d->modify('+1 day')) {
    foreach ($teams as $team) {
        foreach ($channels as $channel) {
            foreach ($productIds as $pid) {
                $impressions = rand(1000, 10000);
                $clicks = rand(100, 500);
                $conversions = rand(10, 100);
                $spend = $impressions * 0.01 + $clicks * 0.5; // simple cost model
                $insertStmt->execute([
                    ':team' => $team,
                    ':channel' => $channel,
                    ':product_id' => $pid,
                    ':date' => $d->format('Y-m-d'),
                    ':impressions' => $impressions,
                    ':clicks' => $clicks,
                    ':conversions' => $conversions,
                    ':spend' => $spend,
                ]);
            }
        }
    }
}

echo "Demo ad_performance data seeded.\n";
?>
