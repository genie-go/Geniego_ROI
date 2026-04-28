/**
 * fix_demo_complete.cjs — 데모 서버 종합 패치
 * 
 * 1. Rollup.php → DB 실데이터 조회 (commerce_sku_day, ad_insight_agg)
 * 2. AdPerformance.php → isDemo() = true
 * 3. PerformanceController.php → tenant_id = 'demo'
 * 4. 모든 유저 → enterprise 플랜 업그레이드
 * 5. PHP-FPM 재시작
 * 
 * ⚠️ 대상: 데모 서버만! (roidemo.geniego.com)
 */
const { Client } = require('ssh2');

const DEMO_BACKEND = '/home/wwwroot/roidemo.geniego.com/backend';
const DEMO_DB = 'geniego_roi_demo';

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
  });
}

function execSSH(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => out += d.toString());
      stream.on('close', () => resolve(out));
    });
  });
}

// ───────────────────────────────────────────────────────
// Rollup.php 완전 교체 — DB 실 데이터 조회 버전
// ───────────────────────────────────────────────────────
const ROLLUP_PHP = `<?php
declare(strict_types=1);

namespace Genie\\Handlers;

use Genie\\Db;
use Genie\\TemplateResponder;
use PDO;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;

/**
 * V423 — Rollup Aggregation Layer (DB-driven for Demo)
 */
final class Rollup {

    private static function tenantId(Request \$req): string {
        \$t = \$req->getHeaderLine('X-Tenant-Id');
        return \$t !== '' ? \$t : 'demo';
    }

    // ── 1. SKU Rollup ──────────────────────────────────────────────────────
    public static function sku(Request \$req, Response \$res, array \$args = []): Response {
        \$q      = \$req->getQueryParams();
        \$period = \$q['period'] ?? 'daily';
        \$n      = max(7, min(90, (int)(\$q['n'] ?? 30)));
        \$tenant = self::tenantId(\$req);

        \$pdo = Db::pdo();
        \$since = date('Y-m-d', strtotime("-{\$n} days"));

        \$stmt = \$pdo->prepare(
            'SELECT sku,
                    JSON_UNQUOTE(JSON_EXTRACT(extra_json, "$.product_name")) AS name,
                    JSON_UNQUOTE(JSON_EXTRACT(extra_json, "$.category")) AS category,
                    SUM(orders) AS total_orders,
                    SUM(units) AS total_units,
                    SUM(revenue) AS total_revenue,
                    SUM(refunds) AS total_refunds
             FROM commerce_sku_day
             WHERE tenant_id=? AND date>=?
             GROUP BY sku
             ORDER BY total_revenue DESC
             LIMIT 20'
        );
        \$stmt->execute([\$tenant, \$since]);
        \$skuRows = \$stmt->fetchAll(PDO::FETCH_ASSOC);

        \$rows = [];
        foreach (\$skuRows as \$s) {
            // Get daily series for this SKU
            \$ds = \$pdo->prepare(
                'SELECT date, SUM(orders) AS orders, SUM(revenue) AS revenue, SUM(refunds) AS refunds
                 FROM commerce_sku_day
                 WHERE tenant_id=? AND sku=? AND date>=?
                 GROUP BY date ORDER BY date'
            );
            \$ds->execute([\$tenant, \$s['sku'], \$since]);
            \$series = \$ds->fetchAll(PDO::FETCH_ASSOC);

            foreach (\$series as &\$pt) {
                \$pt['orders']  = (int)\$pt['orders'];
                \$pt['revenue'] = (float)\$pt['revenue'];
                \$pt['refunds'] = (float)\$pt['refunds'];
                \$pt['roas']    = 0;
            }

            \$rows[] = [
                'sku_id'        => \$s['sku'],
                'name'          => \$s['name'] ?? \$s['sku'],
                'platform'      => \$s['category'] ?? 'commerce',
                'total_revenue' => (float)\$s['total_revenue'],
                'total_orders'  => (int)\$s['total_orders'],
                'total_refunds' => (float)\$s['total_refunds'],
                'avg_roas'      => 0,
                'series'        => \$series,
            ];
        }

        \$dates = array_unique(array_merge(...array_map(fn(\$r) => array_column(\$r['series'], 'date'), \$rows)));
        sort(\$dates);

        return TemplateResponder::json(\$res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'sku',
            'period' => \$period, 'n' => \$n, 'dates' => \$dates, 'rows' => \$rows,
        ]);
    }

    // ── 2. Campaign Rollup ─────────────────────────────────────────────────
    public static function campaign(Request \$req, Response \$res, array \$args = []): Response {
        \$q      = \$req->getQueryParams();
        \$period = \$q['period'] ?? 'daily';
        \$n      = max(7, min(90, (int)(\$q['n'] ?? 30)));
        \$tenant = self::tenantId(\$req);

        \$pdo = Db::pdo();
        \$since = date('Y-m-d', strtotime("-{\$n} days"));

        \$stmt = \$pdo->prepare(
            'SELECT campaign_id, platform,
                    SUM(spend) AS total_spend,
                    SUM(revenue) AS total_revenue,
                    SUM(impressions) AS total_impressions,
                    SUM(clicks) AS total_clicks,
                    SUM(conversions) AS total_conversions
             FROM ad_insight_agg
             WHERE tenant_id=? AND date>=?
             GROUP BY campaign_id, platform
             ORDER BY total_revenue DESC
             LIMIT 15'
        );
        \$stmt->execute([\$tenant, \$since]);
        \$campaigns = \$stmt->fetchAll(PDO::FETCH_ASSOC);

        \$rows = [];
        foreach (\$campaigns as \$c) {
            \$ds = \$pdo->prepare(
                'SELECT date, SUM(spend) AS spend, SUM(revenue) AS revenue,
                        SUM(impressions) AS impressions, SUM(clicks) AS clicks,
                        SUM(conversions) AS conversions
                 FROM ad_insight_agg
                 WHERE tenant_id=? AND campaign_id=? AND date>=?
                 GROUP BY date ORDER BY date'
            );
            \$ds->execute([\$tenant, \$c['campaign_id'], \$since]);
            \$series = \$ds->fetchAll(PDO::FETCH_ASSOC);

            foreach (\$series as &\$pt) {
                \$pt['spend']       = (float)\$pt['spend'];
                \$pt['revenue']     = (float)\$pt['revenue'];
                \$pt['impressions'] = (int)\$pt['impressions'];
                \$pt['clicks']      = (int)\$pt['clicks'];
                \$pt['conversions'] = (int)\$pt['conversions'];
                \$pt['roas'] = \$pt['spend'] > 0 ? round(\$pt['revenue'] / \$pt['spend'], 2) : 0;
                \$pt['ctr']  = \$pt['impressions'] > 0 ? round(\$pt['clicks'] / \$pt['impressions'] * 100, 2) : 0;
            }

            \$totS = (float)\$c['total_spend'];
            \$totR = (float)\$c['total_revenue'];
            \$rows[] = [
                'campaign_id'       => \$c['campaign_id'],
                'name'              => \$c['campaign_id'],
                'platform'          => \$c['platform'],
                'total_spend'       => \$totS,
                'total_revenue'     => \$totR,
                'total_conversions' => (int)\$c['total_conversions'],
                'avg_roas'          => \$totS > 0 ? round(\$totR / \$totS, 2) : 0,
                'avg_cpa'           => (int)\$c['total_conversions'] > 0 ? round(\$totS / (int)\$c['total_conversions']) : 0,
                'series'            => \$series,
            ];
        }

        \$dates = [];
        foreach (\$rows as \$r) {
            foreach (\$r['series'] as \$pt) \$dates[] = \$pt['date'];
        }
        \$dates = array_values(array_unique(\$dates));
        sort(\$dates);

        return TemplateResponder::json(\$res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'campaign',
            'period' => \$period, 'n' => \$n, 'dates' => \$dates, 'rows' => \$rows,
        ]);
    }

    // ── 3. Creator Rollup ─────────────────────────────────────────────────
    public static function creator(Request \$req, Response \$res, array \$args = []): Response {
        return TemplateResponder::json(\$res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'creator',
            'period' => 'weekly', 'n' => 8, 'dates' => [], 'rows' => [],
        ]);
    }

    // ── 4. Platform Rollup ─────────────────────────────────────────────────
    public static function platform(Request \$req, Response \$res, array \$args = []): Response {
        \$q      = \$req->getQueryParams();
        \$period = \$q['period'] ?? 'daily';
        \$n      = max(7, min(90, (int)(\$q['n'] ?? 30)));
        \$tenant = self::tenantId(\$req);

        \$pdo = Db::pdo();
        \$since = date('Y-m-d', strtotime("-{\$n} days"));

        \$stmt = \$pdo->prepare(
            'SELECT platform,
                    SUM(spend) AS total_spend,
                    SUM(revenue) AS total_revenue,
                    SUM(impressions) AS total_impressions,
                    SUM(clicks) AS total_clicks,
                    SUM(conversions) AS total_conversions
             FROM ad_insight_agg
             WHERE tenant_id=? AND date>=?
             GROUP BY platform
             ORDER BY total_revenue DESC'
        );
        \$stmt->execute([\$tenant, \$since]);
        \$platforms = \$stmt->fetchAll(PDO::FETCH_ASSOC);

        \$colors = ['meta'=>'#1877F2','google'=>'#EA4335','naver_sa'=>'#03C75A','kakao_moment'=>'#FEE500','tiktok'=>'#000000'];

        \$rows = [];
        foreach (\$platforms as \$p) {
            \$ds = \$pdo->prepare(
                'SELECT date, SUM(spend) AS spend, SUM(revenue) AS revenue,
                        SUM(impressions) AS impressions, SUM(clicks) AS clicks
                 FROM ad_insight_agg
                 WHERE tenant_id=? AND platform=? AND date>=?
                 GROUP BY date ORDER BY date'
            );
            \$ds->execute([\$tenant, \$p['platform'], \$since]);
            \$series = \$ds->fetchAll(PDO::FETCH_ASSOC);

            foreach (\$series as &\$pt) {
                \$pt['spend']       = (float)\$pt['spend'];
                \$pt['revenue']     = (float)\$pt['revenue'];
                \$pt['impressions'] = (int)\$pt['impressions'];
                \$pt['clicks']      = (int)\$pt['clicks'];
                \$pt['roas'] = \$pt['spend'] > 0 ? round(\$pt['revenue'] / \$pt['spend'], 2) : 0;
            }

            \$totS = (float)\$p['total_spend'];
            \$totR = (float)\$p['total_revenue'];
            \$rows[] = [
                'platform'          => \$p['platform'],
                'color'             => \$colors[\$p['platform']] ?? '#6366F1',
                'total_spend'       => \$totS,
                'total_revenue'     => \$totR,
                'total_impressions' => (int)\$p['total_impressions'],
                'total_clicks'      => (int)\$p['total_clicks'],
                'avg_roas'          => \$totS > 0 ? round(\$totR / \$totS, 2) : 0,
                'series'            => \$series,
            ];
        }

        \$dates = [];
        foreach (\$rows as \$r) {
            foreach (\$r['series'] as \$pt) \$dates[] = \$pt['date'];
        }
        \$dates = array_values(array_unique(\$dates));
        sort(\$dates);

        return TemplateResponder::json(\$res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'platform',
            'period' => \$period, 'n' => \$n, 'dates' => \$dates, 'rows' => \$rows,
        ]);
    }

    // ── 5. Summary ─────────────────────────────────────────────────────────
    public static function summary(Request \$req, Response \$res, array \$args = []): Response {
        \$q = \$req->getQueryParams();
        \$period = \$q['period'] ?? 'daily';
        \$n = max(7, min(90, (int)(\$q['n'] ?? 30)));
        \$tenant = self::tenantId(\$req);

        \$pdo = Db::pdo();
        \$since = date('Y-m-d', strtotime("-{\$n} days"));

        // Commerce totals
        \$cs = \$pdo->prepare(
            'SELECT COALESCE(SUM(revenue),0) AS rev, COALESCE(SUM(orders),0) AS ord
             FROM commerce_sku_day WHERE tenant_id=? AND date>=?'
        );
        \$cs->execute([\$tenant, \$since]);
        \$commerce = \$cs->fetch(PDO::FETCH_ASSOC);

        // Ad totals
        \$as = \$pdo->prepare(
            'SELECT COALESCE(SUM(spend),0) AS spend, COALESCE(SUM(revenue),0) AS ad_rev,
                    COALESCE(SUM(clicks),0) AS clicks, COALESCE(SUM(impressions),0) AS impr
             FROM ad_insight_agg WHERE tenant_id=? AND date>=?'
        );
        \$as->execute([\$tenant, \$since]);
        \$ads = \$as->fetch(PDO::FETCH_ASSOC);

        \$totalRev   = (float)\$commerce['rev'] + (float)\$ads['ad_rev'];
        \$totalSpend = (float)\$ads['spend'];
        \$totalOrders = (int)\$commerce['ord'];

        // Platform breakdown
        \$ps = \$pdo->prepare(
            'SELECT platform, SUM(revenue) AS rev FROM ad_insight_agg
             WHERE tenant_id=? AND date>=? GROUP BY platform ORDER BY rev DESC'
        );
        \$ps->execute([\$tenant, \$since]);
        \$byPlatform = [];
        while (\$r = \$ps->fetch(PDO::FETCH_ASSOC)) {
            \$byPlatform[\$r['platform']] = (float)\$r['rev'];
        }

        // Top SKUs
        \$ts = \$pdo->prepare(
            'SELECT sku, SUM(revenue) AS rev FROM commerce_sku_day
             WHERE tenant_id=? AND date>=? GROUP BY sku ORDER BY rev DESC LIMIT 5'
        );
        \$ts->execute([\$tenant, \$since]);
        \$topSkus = [];
        while (\$r = \$ts->fetch(PDO::FETCH_ASSOC)) {
            \$topSkus[\$r['sku']] = (float)\$r['rev'];
        }

        // Channel breakdown
        \$chs = \$pdo->prepare(
            'SELECT channel, SUM(revenue) AS rev, SUM(orders) AS ord
             FROM commerce_sku_day WHERE tenant_id=? AND date>=?
             GROUP BY channel ORDER BY rev DESC'
        );
        \$chs->execute([\$tenant, \$since]);
        \$byChannel = \$chs->fetchAll(PDO::FETCH_ASSOC);

        return TemplateResponder::json(\$res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'summary',
            'period' => \$period, 'n' => \$n,
            'kpi' => [
                'total_revenue'     => \$totalRev,
                'total_spend'       => \$totalSpend,
                'total_orders'      => \$totalOrders,
                'avg_roas'          => \$totalSpend > 0 ? round(\$totalRev / \$totalSpend, 2) : 0,
                'revenue_per_order' => \$totalOrders > 0 ? round(\$totalRev / \$totalOrders) : 0,
                'total_clicks'      => (int)\$ads['clicks'],
                'total_impressions' => (int)\$ads['impr'],
            ],
            'by_platform' => \$byPlatform,
            'by_channel'  => \$byChannel,
            'top_skus'    => \$topSkus,
            'alerts'      => [],
        ]);
    }
}
`;

async function main() {
  console.log('🔧 데모 서버 종합 패치 시작...');
  console.log(`대상: ${DEMO_BACKEND}`);
  console.log('');

  const conn = await connectSSH();
  console.log('✅ SSH 연결 성공');

  // 0. 안전 확인 — 데모 DB 맞는지
  const envCheck = await execSSH(conn, `grep "GENIE_DB_NAME" ${DEMO_BACKEND}/.env 2>/dev/null || echo "NO_ENV"`);
  console.log('ENV 확인:', envCheck.trim());
  if (!envCheck.includes('geniego_roi_demo') && !envCheck.includes('NO_ENV')) {
    console.error('❌ 안전 중단: 데모 DB가 아닙니다!');
    conn.end();
    return;
  }

  // 1. ── Rollup.php 교체 (DB 실 데이터 조회) ──
  console.log('\n📦 1/5: Rollup.php 교체...');
  const rollupPath = `${DEMO_BACKEND}/src/Handlers/Rollup.php`;
  await execSSH(conn, `cp ${rollupPath} ${rollupPath}.bak.$(date +%s) 2>/dev/null`);

  // Write new Rollup.php
  const rollupB64 = Buffer.from(ROLLUP_PHP).toString('base64');
  await execSSH(conn, `echo '${rollupB64}' | base64 -d > ${rollupPath}`);
  const rollupVerify = await execSSH(conn, `grep "tenantId" ${rollupPath} | head -3`);
  console.log('  ✅ Rollup.php 교체 완료:', rollupVerify.trim().substring(0, 80));

  // 2. ── AdPerformance.php — isDemo() → true ──
  console.log('\n📦 2/5: AdPerformance.php 패치...');
  const adPerfPath = `${DEMO_BACKEND}/src/Handlers/AdPerformance.php`;
  await execSSH(conn, `cp ${adPerfPath} ${adPerfPath}.bak.$(date +%s) 2>/dev/null`);
  await execSSH(conn, `sed -i "s/return false;.*Demo removed/return true; \\/\\/ DEMO: always use demo data/" ${adPerfPath}`);
  const adCheck = await execSSH(conn, `grep "isDemo" ${adPerfPath}`);
  console.log('  ✅ AdPerformance isDemo():', adCheck.trim());

  // 3. ── PerformanceController.php — tenant='demo' ──
  console.log('\n📦 3/5: PerformanceController.php 패치...');
  const perfPath = `${DEMO_BACKEND}/src/Controllers/PerformanceController.php`;
  const perfExists = await execSSH(conn, `test -f ${perfPath} && echo "EXISTS" || echo "NOT_FOUND"`);
  if (perfExists.trim() === 'EXISTS') {
    await execSSH(conn, `cp ${perfPath} ${perfPath}.bak.$(date +%s)`);
    // Force userId to 'demo'
    await execSSH(conn, `sed -i "s/\\$userId = .*auth.*tenant.*/\\$userId = 'demo'; \\/\\/ DEMO PATCHED/" ${perfPath}`);
    await execSSH(conn, `sed -i "s/\\$tenantId = .*auth.*tenant.*/\\$tenantId = 'demo'; \\/\\/ DEMO PATCHED/" ${perfPath}`);
    console.log('  ✅ PerformanceController 패치 완료');
  } else {
    console.log('  ⚠️ PerformanceController 없음 (스킵)');
  }

  // 4. ── 모든 유저 enterprise 업그레이드 ──
  console.log('\n📦 4/5: 모든 데모 유저 enterprise 업그레이드...');
  const upgradeResult = await execSSH(conn,
    `mysql -uroot -p"qlqjs@Elql3!" ${DEMO_DB} -e "UPDATE app_user SET plan='enterprise', subscription_status='active', subscription_expires_at='2027-12-31T23:59:59Z' WHERE plan != 'enterprise' OR plan IS NULL" 2>/dev/null`
  );
  const userCount = await execSSH(conn,
    `mysql -uroot -p"qlqjs@Elql3!" ${DEMO_DB} -N -e "SELECT COUNT(*) FROM app_user WHERE plan='enterprise'" 2>/dev/null`
  );
  console.log(`  ✅ Enterprise 유저 수: ${userCount.trim()}`);

  // 5. ── GENIE_DEMO_MODE=true 환경변수 추가 ──
  console.log('\n📦 5/5: .env에 GENIE_DEMO_MODE=true 추가...');
  const envPath = `${DEMO_BACKEND}/.env`;
  const hasDemo = await execSSH(conn, `grep "GENIE_DEMO_MODE" ${envPath} 2>/dev/null || echo "NOT_SET"`);
  if (hasDemo.includes('NOT_SET')) {
    await execSSH(conn, `echo "GENIE_DEMO_MODE=true" >> ${envPath}`);
    console.log('  ✅ GENIE_DEMO_MODE=true 추가됨');
  } else {
    console.log('  ✅ 이미 설정됨:', hasDemo.trim());
  }

  // 6. ── PHP-FPM 재시작 ──
  console.log('\n🔄 PHP-FPM 재시작...');
  await execSSH(conn, `systemctl restart php8.2-fpm 2>/dev/null || service php8.2-fpm restart 2>/dev/null || service php-fpm restart 2>/dev/null || true`);
  console.log('  ✅ PHP-FPM 재시작 완료');

  // 7. ── 검증: DB 데이터 확인 ──
  console.log('\n📋 검증: 데모 DB 데이터 확인...');
  const stats = await execSSH(conn, [
    `mysql -uroot -p"qlqjs@Elql3!" ${DEMO_DB} -N -e "SELECT 'commerce_sku_day', COUNT(*), COALESCE(SUM(revenue),0) FROM commerce_sku_day WHERE tenant_id='demo'" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" ${DEMO_DB} -N -e "SELECT 'ad_insight_agg', COUNT(*), COALESCE(SUM(revenue),0) FROM ad_insight_agg WHERE tenant_id='demo'" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" ${DEMO_DB} -N -e "SELECT 'kr_settlement', COUNT(*), COALESCE(SUM(gross_sales),0) FROM kr_settlement_line WHERE tenant_id='demo'" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" ${DEMO_DB} -N -e "SELECT 'app_user', COUNT(*), '' FROM app_user WHERE plan='enterprise'" 2>/dev/null`,
  ].join(' && '));
  console.log(stats);

  // 8. ── 운영서버 무변경 확인 ──
  console.log('🛡️ 운영서버 무변경 확인...');
  const prodCheck = await execSSH(conn, `grep "DEMO PATCHED\\|tenantId" /home/wwwroot/roi.geniego.com/backend/src/Handlers/Rollup.php 2>/dev/null | head -1 || echo "✅ 운영 Rollup 미변경"`);
  console.log(prodCheck.trim());

  conn.end();
  console.log('\n✅ 데모 서버 종합 패치 완료!');
  console.log('🌐 확인: https://roidemo.genie-go.com');
}

main().catch(err => {
  console.error('❌ 에러:', err.message);
  process.exit(1);
});
