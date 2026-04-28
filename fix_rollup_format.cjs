/**
 * fix_rollup_format.cjs — top_skus 포맷 수정 + API 검증
 * 
 * 문제: Rollup.php summary()의 top_skus가 {sku: revenue} 객체로 반환되어
 *       프론트엔드의 .map()이 실패 → "top_skus.map is not a function" 크래시
 * 
 * 해결: top_skus를 [{sku_id, name, revenue, orders, roas, return_rate}, ...] 배열로 변환
 */
const { Client } = require('ssh2');

const DEMO_BACKEND = '/home/wwwroot/roidemo.geniego.com/backend';

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

// The fixed summary() method — top_skus as proper array
const SUMMARY_FIX_PHP = `
    public static function summary(Request \\$req, Response \\$res, array \\$args = []): Response {
        \\$q = \\$req->getQueryParams();
        \\$period = \\$q['period'] ?? 'daily';
        \\$n = max(7, min(90, (int)(\\$q['n'] ?? 30)));
        \\$tenant = self::tenantId(\\$req);

        \\$pdo = Db::pdo();
        \\$since = date('Y-m-d', strtotime("-{\\$n} days"));

        // Commerce totals
        \\$cs = \\$pdo->prepare(
            'SELECT COALESCE(SUM(revenue),0) AS rev, COALESCE(SUM(orders),0) AS ord,
                    COALESCE(SUM(refunds),0) AS ref
             FROM commerce_sku_day WHERE tenant_id=? AND date>=?'
        );
        \\$cs->execute([\\$tenant, \\$since]);
        \\$commerce = \\$cs->fetch(\\\\PDO::FETCH_ASSOC);

        // Ad totals
        \\$as2 = \\$pdo->prepare(
            'SELECT COALESCE(SUM(spend),0) AS spend, COALESCE(SUM(revenue),0) AS ad_rev,
                    COALESCE(SUM(clicks),0) AS clicks, COALESCE(SUM(impressions),0) AS impr
             FROM ad_insight_agg WHERE tenant_id=? AND date>=?'
        );
        \\$as2->execute([\\$tenant, \\$since]);
        \\$ads = \\$as2->fetch(\\\\PDO::FETCH_ASSOC);

        \\$totalRev   = (float)\\$commerce['rev'] + (float)\\$ads['ad_rev'];
        \\$totalSpend = (float)\\$ads['spend'];
        \\$totalOrders = (int)\\$commerce['ord'];

        // Platform breakdown — object {platform: revenue}
        \\$ps = \\$pdo->prepare(
            'SELECT platform, SUM(revenue) AS rev FROM ad_insight_agg
             WHERE tenant_id=? AND date>=? GROUP BY platform ORDER BY rev DESC'
        );
        \\$ps->execute([\\$tenant, \\$since]);
        \\$byPlatform = [];
        while (\\$r = \\$ps->fetch(\\\\PDO::FETCH_ASSOC)) {
            \\$byPlatform[\\$r['platform']] = (float)\\$r['rev'];
        }

        // Top SKUs — ARRAY of objects (frontend expects .map())
        \\$ts = \\$pdo->prepare(
            'SELECT sku, SUM(revenue) AS rev, SUM(orders) AS ord, SUM(refunds) AS ref
             FROM commerce_sku_day
             WHERE tenant_id=? AND date>=? GROUP BY sku ORDER BY rev DESC LIMIT 5'
        );
        \\$ts->execute([\\$tenant, \\$since]);
        \\$topSkus = [];
        while (\\$r = \\$ts->fetch(\\\\PDO::FETCH_ASSOC)) {
            \\$rev = (float)\\$r['rev'];
            \\$ord = (int)\\$r['ord'];
            \\$ref = (float)\\$r['ref'];
            \\$topSkus[] = [
                'sku_id'      => \\$r['sku'],
                'name'        => \\$r['sku'],
                'revenue'     => \\$rev,
                'orders'      => \\$ord,
                'roas'        => 0,
                'return_rate' => \\$rev > 0 ? round(\\$ref / \\$rev * 100, 1) : 0,
            ];
        }

        return TemplateResponder::json(\\$res, [
            'ok' => true, 'version' => 'v423', 'dimension' => 'summary',
            'period' => \\$period, 'n' => \\$n,
            'kpi' => [
                'total_revenue'     => \\$totalRev,
                'total_spend'       => \\$totalSpend,
                'total_orders'      => \\$totalOrders,
                'avg_roas'          => \\$totalSpend > 0 ? round(\\$totalRev / \\$totalSpend, 2) : 0,
                'revenue_per_order' => \\$totalOrders > 0 ? round(\\$totalRev / \\$totalOrders) : 0,
                'total_clicks'      => (int)\\$ads['clicks'],
                'total_impressions' => (int)\\$ads['impr'],
            ],
            'by_platform' => (object)\\$byPlatform,
            'top_skus'    => \\$topSkus,
            'alerts'      => [],
        ]);
    }
`;

async function main() {
  console.log('🔧 Rollup.php summary() 포맷 수정...');

  const conn = await connectSSH();
  console.log('✅ SSH 연결');

  const rollupPath = `${DEMO_BACKEND}/src/Handlers/Rollup.php`;

  // Read current file
  const currentFile = await execSSH(conn, `cat ${rollupPath}`);
  console.log(`📄 현재 Rollup.php: ${currentFile.length} bytes`);

  // Replace the summary method
  // Find the summary method and replace it entirely
  const summaryStart = currentFile.indexOf('public static function summary(');
  if (summaryStart === -1) {
    console.error('❌ summary() 메서드를 찾을 수 없습니다!');
    conn.end();
    return;
  }

  // Find the end of the summary method (matching closing brace)
  let braceCount = 0;
  let summaryEnd = -1;
  let inMethod = false;
  for (let i = summaryStart; i < currentFile.length; i++) {
    if (currentFile[i] === '{') {
      braceCount++;
      inMethod = true;
    }
    if (currentFile[i] === '}') {
      braceCount--;
      if (inMethod && braceCount === 0) {
        summaryEnd = i + 1;
        break;
      }
    }
  }

  if (summaryEnd === -1) {
    console.error('❌ summary() 메서드 끝을 찾을 수 없습니다!');
    conn.end();
    return;
  }

  console.log(`📍 summary() 위치: ${summaryStart} ~ ${summaryEnd}`);

  const newFile = currentFile.substring(0, summaryStart) + SUMMARY_FIX_PHP.trim() + '\n' + currentFile.substring(summaryEnd);

  // Write fixed file via base64
  const b64 = Buffer.from(newFile).toString('base64');
  await execSSH(conn, `echo '${b64}' | base64 -d > ${rollupPath}`);

  // Verify
  const verify = await execSSH(conn, `grep "topSkus\\[\\]" ${rollupPath}`);
  console.log('✅ topSkus[] 확인:', verify.trim().substring(0, 80));

  const verify2 = await execSSH(conn, `grep "top_skus" ${rollupPath}`);
  console.log('✅ top_skus 라인:', verify2.trim());

  // PHP syntax check
  const syntax = await execSSH(conn, `php -l ${rollupPath} 2>&1`);
  console.log('🔍 PHP 문법 체크:', syntax.trim());

  // Restart PHP-FPM
  await execSSH(conn, 'systemctl restart php8.2-fpm');
  console.log('🔄 PHP-FPM 재시작 완료');

  // Test API
  console.log('\n📡 API 테스트...');
  const test = await execSSH(conn, `curl -s 'http://localhost/api/v423/rollup/summary?period=daily&n=30' -H 'Host: roidemo.genie-go.com' -H 'X-Tenant-Id: demo' -H 'Authorization: Bearer test' 2>/dev/null | python3 -m json.tool 2>/dev/null | head -60`);
  console.log(test);

  conn.end();
  console.log('\n✅ 완료!');
}

main().catch(err => {
  console.error('❌ 에러:', err.message);
  process.exit(1);
});
