const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  console.log('SSH connected');
  const P = '/home/wwwroot/roidemo.geniego.com/backend/src/Handlers/Rollup.php';

  // Check current line 249 area
  const line249 = await ex(c, `sed -n '245,260p' ${P}`);
  console.log('Lines 245-260:\n', line249);

  // Fix: replace \\PDO with PDO everywhere in the file
  await ex(c, `sed -i 's/\\\\\\\\PDO/PDO/g' ${P}`);

  // Also check for any stray double-backslashes before variable names
  // And fix \\$ issues from template literal escaping
  const content = await ex(c, `cat ${P}`);

  // Check for remaining issues
  const syntax1 = await ex(c, `php -l ${P} 2>&1`);
  console.log('Syntax check 1:', syntax1.trim());

  if (!syntax1.includes('No syntax errors')) {
    // More aggressive fix - read, fix in Node, write back
    console.log('Attempting full content fix...');

    // Fix common escaping issues from template literals
    let fixed = content;
    // Remove extra backslashes before $ (from JS template literal escaping)
    fixed = fixed.replace(/\\\\\$/g, '$');
    // Fix \\PDO -> PDO
    fixed = fixed.replace(/\\\\PDO/g, 'PDO');

    const b64 = Buffer.from(fixed).toString('base64');
    // Write in chunks if needed (base64 can be very long)
    const chunkSize = 50000;
    if (b64.length > chunkSize) {
      // Write first chunk
      await ex(c, `echo '${b64.substring(0, chunkSize)}' > /tmp/rollup_b64.txt`);
      // Append remaining chunks
      for (let i = chunkSize; i < b64.length; i += chunkSize) {
        await ex(c, `echo '${b64.substring(i, i + chunkSize)}' >> /tmp/rollup_b64.txt`);
      }
      await ex(c, `base64 -d /tmp/rollup_b64.txt > ${P}`);
    } else {
      await ex(c, `echo '${b64}' | base64 -d > ${P}`);
    }

    const syntax2 = await ex(c, `php -l ${P} 2>&1`);
    console.log('Syntax check 2:', syntax2.trim());
  }

  // If still failing, restore backup and apply a cleaner patch
  const finalSyntax = await ex(c, `php -l ${P} 2>&1`);
  if (!finalSyntax.includes('No syntax errors')) {
    console.log('Still has errors. Restoring backup and rewriting...');

    // Get the latest backup
    const backups = await ex(c, `ls -t ${P}.bak.* 2>/dev/null | head -1`);
    const backup = backups.trim();
    if (backup) {
      console.log('Restoring from:', backup);
      await ex(c, `cp ${backup} ${P}`);
    }

    // Now write the ENTIRE file fresh with proper PHP
    const freshRollup = `<?php
declare(strict_types=1);

namespace Genie\\Handlers;

use Genie\\Db;
use Genie\\TemplateResponder;
use PDO;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;

final class Rollup {

    private static function tenantId(Request $req): string {
        $t = $req->getHeaderLine('X-Tenant-Id');
        return $t !== '' ? $t : 'demo';
    }

    public static function sku(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = max(7, min(90, (int)($q['n'] ?? 30)));
        $tenant = self::tenantId($req);
        $pdo = Db::pdo();
        $since = date('Y-m-d', strtotime("-{$n} days"));

        $stmt = $pdo->prepare(
            'SELECT sku, SUM(orders) AS total_orders, SUM(units) AS total_units,
                    SUM(revenue) AS total_revenue, SUM(refunds) AS total_refunds
             FROM commerce_sku_day WHERE tenant_id=? AND date>=?
             GROUP BY sku ORDER BY total_revenue DESC LIMIT 20'
        );
        $stmt->execute([$tenant, $since]);
        $skuRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $rows = [];
        foreach ($skuRows as $s) {
            $ds = $pdo->prepare(
                'SELECT date, SUM(orders) AS orders, SUM(revenue) AS revenue, SUM(refunds) AS refunds
                 FROM commerce_sku_day WHERE tenant_id=? AND sku=? AND date>=?
                 GROUP BY date ORDER BY date'
            );
            $ds->execute([$tenant, $s['sku'], $since]);
            $series = $ds->fetchAll(PDO::FETCH_ASSOC);
            foreach ($series as &$pt) {
                $pt['orders']  = (int)$pt['orders'];
                $pt['revenue'] = (float)$pt['revenue'];
                $pt['refunds'] = (float)$pt['refunds'];
                $pt['roas']    = 0;
            }
            $rev = (float)$s['total_revenue'];
            $ref = (float)$s['total_refunds'];
            $rows[] = [
                'sku_id'          => $s['sku'],
                'name'            => $s['sku'],
                'platform'        => 'commerce',
                'total_revenue'   => $rev,
                'total_orders'    => (int)$s['total_orders'],
                'total_refunds'   => $ref,
                'avg_roas'        => 0,
                'avg_return_rate' => $rev > 0 ? round($ref / $rev * 100, 1) : 0,
                'series'          => $series,
            ];
        }
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'sku',
            'period' => $period, 'n' => $n, 'rows' => $rows,
        ]);
    }

    public static function campaign(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = max(7, min(90, (int)($q['n'] ?? 30)));
        $tenant = self::tenantId($req);
        $pdo = Db::pdo();
        $since = date('Y-m-d', strtotime("-{$n} days"));

        $stmt = $pdo->prepare(
            'SELECT campaign_id, platform,
                    SUM(spend) AS total_spend, SUM(revenue) AS total_revenue,
                    SUM(impressions) AS total_impressions, SUM(clicks) AS total_clicks,
                    SUM(conversions) AS total_conversions
             FROM ad_insight_agg WHERE tenant_id=? AND date>=?
             GROUP BY campaign_id, platform ORDER BY total_revenue DESC LIMIT 15'
        );
        $stmt->execute([$tenant, $since]);
        $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $rows = [];
        foreach ($campaigns as $cm) {
            $ds = $pdo->prepare(
                'SELECT date, SUM(spend) AS spend, SUM(revenue) AS revenue,
                        SUM(impressions) AS impressions, SUM(clicks) AS clicks,
                        SUM(conversions) AS conversions
                 FROM ad_insight_agg WHERE tenant_id=? AND campaign_id=? AND date>=?
                 GROUP BY date ORDER BY date'
            );
            $ds->execute([$tenant, $cm['campaign_id'], $since]);
            $series = $ds->fetchAll(PDO::FETCH_ASSOC);
            foreach ($series as &$pt) {
                $pt['spend']       = (float)$pt['spend'];
                $pt['revenue']     = (float)$pt['revenue'];
                $pt['impressions'] = (int)$pt['impressions'];
                $pt['clicks']      = (int)$pt['clicks'];
                $pt['conversions'] = (int)$pt['conversions'];
                $pt['roas'] = $pt['spend'] > 0 ? round($pt['revenue'] / $pt['spend'], 2) : 0;
                $pt['ctr']  = $pt['impressions'] > 0 ? round($pt['clicks'] / $pt['impressions'] * 100, 2) : 0;
                $pt['cpc']  = $pt['clicks'] > 0 ? round($pt['spend'] / $pt['clicks']) : 0;
            }
            $totS = (float)$cm['total_spend'];
            $totR = (float)$cm['total_revenue'];
            $totConv = (int)$cm['total_conversions'];
            $rows[] = [
                'campaign_id'       => $cm['campaign_id'],
                'name'              => $cm['campaign_id'],
                'platform'          => $cm['platform'],
                'total_spend'       => $totS,
                'total_revenue'     => $totR,
                'total_conversions' => $totConv,
                'avg_roas'          => $totS > 0 ? round($totR / $totS, 2) : 0,
                'avg_cpa'           => $totConv > 0 ? round($totS / $totConv) : 0,
                'series'            => $series,
            ];
        }
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'campaign',
            'period' => $period, 'n' => $n, 'rows' => $rows,
        ]);
    }

    public static function creator(Request $req, Response $res, array $args = []): Response {
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'creator',
            'period' => 'weekly', 'n' => 8, 'rows' => [],
        ]);
    }

    public static function platform(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = max(7, min(90, (int)($q['n'] ?? 30)));
        $tenant = self::tenantId($req);
        $pdo = Db::pdo();
        $since = date('Y-m-d', strtotime("-{$n} days"));

        $stmt = $pdo->prepare(
            'SELECT platform, SUM(spend) AS total_spend, SUM(revenue) AS total_revenue,
                    SUM(impressions) AS total_impressions, SUM(clicks) AS total_clicks,
                    SUM(conversions) AS total_conversions
             FROM ad_insight_agg WHERE tenant_id=? AND date>=?
             GROUP BY platform ORDER BY total_revenue DESC'
        );
        $stmt->execute([$tenant, $since]);
        $platforms = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $rows = [];
        foreach ($platforms as $p) {
            $ds = $pdo->prepare(
                'SELECT date, SUM(spend) AS spend, SUM(revenue) AS revenue,
                        SUM(impressions) AS impressions, SUM(clicks) AS clicks
                 FROM ad_insight_agg WHERE tenant_id=? AND platform=? AND date>=?
                 GROUP BY date ORDER BY date'
            );
            $ds->execute([$tenant, $p['platform'], $since]);
            $series = $ds->fetchAll(PDO::FETCH_ASSOC);
            foreach ($series as &$pt) {
                $pt['spend']       = (float)$pt['spend'];
                $pt['revenue']     = (float)$pt['revenue'];
                $pt['impressions'] = (int)$pt['impressions'];
                $pt['clicks']      = (int)$pt['clicks'];
                $pt['roas'] = $pt['spend'] > 0 ? round($pt['revenue'] / $pt['spend'], 2) : 0;
            }
            $totS = (float)$p['total_spend'];
            $totR = (float)$p['total_revenue'];
            $rows[] = [
                'platform'          => $p['platform'],
                'total_spend'       => $totS,
                'total_revenue'     => $totR,
                'total_impressions' => (int)$p['total_impressions'],
                'total_clicks'      => (int)$p['total_clicks'],
                'avg_roas'          => $totS > 0 ? round($totR / $totS, 2) : 0,
                'series'            => $series,
            ];
        }
        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'platform',
            'period' => $period, 'n' => $n, 'rows' => $rows,
        ]);
    }

    public static function summary(Request $req, Response $res, array $args = []): Response {
        $q = $req->getQueryParams();
        $period = $q['period'] ?? 'daily';
        $n = max(7, min(90, (int)($q['n'] ?? 30)));
        $tenant = self::tenantId($req);
        $pdo = Db::pdo();
        $since = date('Y-m-d', strtotime("-{$n} days"));

        $cs = $pdo->prepare(
            'SELECT COALESCE(SUM(revenue),0) AS rev, COALESCE(SUM(orders),0) AS ord,
                    COALESCE(SUM(refunds),0) AS ref
             FROM commerce_sku_day WHERE tenant_id=? AND date>=?'
        );
        $cs->execute([$tenant, $since]);
        $commerce = $cs->fetch(PDO::FETCH_ASSOC);

        $adStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(spend),0) AS spend, COALESCE(SUM(revenue),0) AS ad_rev,
                    COALESCE(SUM(clicks),0) AS clicks, COALESCE(SUM(impressions),0) AS impr
             FROM ad_insight_agg WHERE tenant_id=? AND date>=?'
        );
        $adStmt->execute([$tenant, $since]);
        $ads = $adStmt->fetch(PDO::FETCH_ASSOC);

        $totalRev   = (float)$commerce['rev'] + (float)$ads['ad_rev'];
        $totalSpend = (float)$ads['spend'];
        $totalOrders = (int)$commerce['ord'];

        $ps = $pdo->prepare(
            'SELECT platform, SUM(revenue) AS rev FROM ad_insight_agg
             WHERE tenant_id=? AND date>=? GROUP BY platform ORDER BY rev DESC'
        );
        $ps->execute([$tenant, $since]);
        $byPlatform = new \\stdClass();
        while ($r = $ps->fetch(PDO::FETCH_ASSOC)) {
            $key = $r['platform'];
            $byPlatform->$key = (float)$r['rev'];
        }

        $ts = $pdo->prepare(
            'SELECT sku, SUM(revenue) AS rev, SUM(orders) AS ord, SUM(refunds) AS ref
             FROM commerce_sku_day WHERE tenant_id=? AND date>=?
             GROUP BY sku ORDER BY rev DESC LIMIT 5'
        );
        $ts->execute([$tenant, $since]);
        $topSkus = [];
        while ($r = $ts->fetch(PDO::FETCH_ASSOC)) {
            $rev = (float)$r['rev'];
            $ref = (float)$r['ref'];
            $topSkus[] = [
                'sku_id'      => $r['sku'],
                'name'        => $r['sku'],
                'revenue'     => $rev,
                'orders'      => (int)$r['ord'],
                'roas'        => 0,
                'return_rate' => $rev > 0 ? round($ref / $rev * 100, 1) : 0,
            ];
        }

        return TemplateResponder::json($res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'summary',
            'period' => $period, 'n' => $n,
            'kpi' => [
                'total_revenue'     => $totalRev,
                'total_spend'       => $totalSpend,
                'total_orders'      => $totalOrders,
                'avg_roas'          => $totalSpend > 0 ? round($totalRev / $totalSpend, 2) : 0,
                'revenue_per_order' => $totalOrders > 0 ? round($totalRev / $totalOrders) : 0,
                'total_clicks'      => (int)$ads['clicks'],
                'total_impressions' => (int)$ads['impr'],
            ],
            'by_platform' => $byPlatform,
            'top_skus'    => $topSkus,
            'alerts'      => [],
        ]);
    }
}
`;

    const freshB64 = Buffer.from(freshRollup).toString('base64');
    // Split into manageable chunks for echo
    const chunks = [];
    for (let i = 0; i < freshB64.length; i += 40000) {
      chunks.push(freshB64.substring(i, i + 40000));
    }

    // Write first chunk
    await ex(c, `echo '${chunks[0]}' > /tmp/rollup_fix.b64`);
    // Append rest
    for (let i = 1; i < chunks.length; i++) {
      await ex(c, `echo '${chunks[i]}' >> /tmp/rollup_fix.b64`);
    }
    await ex(c, `base64 -d /tmp/rollup_fix.b64 > ${P}`);

    const finalCheck = await ex(c, `php -l ${P} 2>&1`);
    console.log('Final syntax:', finalCheck.trim());

    if (finalCheck.includes('No syntax errors')) {
      await ex(c, 'systemctl restart php8.2-fpm');
      console.log('PHP-FPM restarted');
    }
  }

  // Final API test
  const test = await ex(c, "curl -s 'http://localhost/api/v423/rollup/summary?period=daily&n=30' -H 'Host: roidemo.genie-go.com' -H 'X-Tenant-Id: demo' 2>/dev/null | python3 -m json.tool 2>/dev/null | head -40");
  console.log('API test:\n', test);

  c.end();
})();
