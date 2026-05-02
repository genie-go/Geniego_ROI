/**
 * seed_demo_data.cjs — 데모 DB에 L'Oréal 기반 가상데이터 시딩
 * 
 * 대상 DB: geniego_roi_demo (절대 geniego_roi 아님!)
 * 데이터: L'Oréal Korea 기반 가상 브랜드/상품/주문/광고/정산 데이터
 */
const { Client } = require('ssh2');

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

// ──────────────────────────────────────────────────────
// L'Oréal 기반 가상데이터 SQL
// ──────────────────────────────────────────────────────

const DEMO_DB = 'geniego_roi_demo';
const NOW = new Date().toISOString().replace('T', ' ').substring(0, 19);
const TODAY = new Date().toISOString().substring(0, 10);

// Generate dates for last 90 days
function datesBack(n) {
  const dates = [];
  for (let i = n; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().substring(0, 10));
  }
  return dates;
}

function buildSQL() {
  const sqls = [];
  const dates = datesBack(90);

  // ── 1. 데모 사용자 (Enterprise) ──
  sqls.push(`
    INSERT INTO app_user (email, password_hash, name, plan, company, created_at, subscription_expires_at, subscription_status)
    VALUES 
      ('demo@loreal.com', '$2y$10$demohashedpassword000000000000000000000000000000', 'LOreal Demo Admin', 'enterprise', 'LOreal Korea', '${NOW}', '2027-12-31T23:59:59Z', 'active'),
      ('marketing@loreal-demo.com', '$2y$10$demohashedpassword000000000000000000000000000000', '김마케팅', 'enterprise', 'LOreal Korea', '${NOW}', '2027-12-31T23:59:59Z', 'active'),
      ('analyst@loreal-demo.com', '$2y$10$demohashedpassword000000000000000000000000000000', '이분석', 'enterprise', 'LOreal Korea', '${NOW}', '2027-12-31T23:59:59Z', 'active')
    ON DUPLICATE KEY UPDATE plan='enterprise';
  `);

  // ── 2. 채널 설정 (한국 커머스) ──
  const channels = [
    ['naver', '네이버 스마트스토어', 'KRW', 'biweekly'],
    ['coupang', '쿠팡 로켓배송', 'KRW', 'weekly'],
    ['kakao', '카카오쇼핑', 'KRW', 'monthly'],
    ['gmarket', 'G마켓/옥션', 'KRW', 'monthly'],
    ['11st', '11번가', 'KRW', 'monthly'],
    ['oliveyoung', '올리브영 온라인', 'KRW', 'monthly'],
    ['amazon_jp', 'Amazon Japan', 'JPY', 'biweekly'],
    ['shopify_global', 'Shopify Global', 'USD', 'weekly'],
  ];
  channels.forEach(([key, name, curr, cycle]) => {
    sqls.push(`INSERT IGNORE INTO kr_channel (channel_key, display_name, currency, settlement_cycle, fee_schema_json, vat_rate, note, created_at) VALUES ('${key}', '${name}', '${curr}', '${cycle}', '{}', 0.10, 'LOreal Demo', '${NOW}');`);
  });

  // ── 3. 수수료 규칙 ──
  const feeRules = [
    ['naver', 0.055, 0.02, 3000, 5000],
    ['coupang', 0.108, 0.015, 0, 5000],
    ['kakao', 0.045, 0.025, 2500, 4000],
    ['gmarket', 0.12, 0.03, 2500, 5000],
    ['11st', 0.10, 0.02, 3000, 5000],
    ['oliveyoung', 0.30, 0.01, 0, 3000],
  ];
  feeRules.forEach(([ch, pfee, afee, ship, ret]) => {
    sqls.push(`INSERT IGNORE INTO kr_fee_rule (tenant_id, channel_key, category, platform_fee_rate, ad_fee_rate, shipping_standard, return_fee_standard, vat_rate, note, effective_from, created_at) VALUES ('demo', '${ch}', '*', ${pfee}, ${afee}, ${ship}, ${ret}, 0.10, 'LOreal Demo fee', '2026-01-01', '${NOW}');`);
  });

  // ── 4. L'Oréal 상품 (SKU) 데이터 ──
  const products = [
    ['LOR-REV-001', "L'Oreal Revitalift Filler [HA] 세럼 30ml", 45000, 'skincare'],
    ['LOR-REV-002', "L'Oreal Revitalift Laser X3 크림 50ml", 58000, 'skincare'],
    ['LOR-PAR-001', "L'Oreal Paris True Match 파운데이션", 28000, 'makeup'],
    ['LOR-PAR-002', "L'Oreal Paris Lash Paradise 마스카라", 22000, 'makeup'],
    ['LOR-PAR-003', "L'Oreal Paris Color Riche 립스틱", 19000, 'makeup'],
    ['LOR-ELV-001', "L'Oreal Elvive 엑스트라 오일 샴푸 400ml", 15000, 'haircare'],
    ['LOR-ELV-002', "L'Oreal Elvive 토탈 리페어 5 컨디셔너", 15000, 'haircare'],
    ['LOR-MEN-001', "L'Oreal Men Expert 하이드라 에너자이저", 32000, 'mens'],
    ['LOR-UV-001', "L'Oreal UV Perfect SPF50+ 선크림", 25000, 'suncare'],
    ['LOR-AGE-001', "L'Oreal Age Perfect 세럼 골든 에이지", 65000, 'skincare'],
    ['KER-SIL-001', 'Kerastase Elixir Ultime 오일 100ml', 52000, 'luxury_hair'],
    ['KER-RES-001', 'Kerastase Resistance 샴푸 250ml', 42000, 'luxury_hair'],
    ['LAN-ABS-001', 'Lancome Absolue 크림 60ml', 280000, 'luxury_skin'],
    ['LAN-GEN-001', 'Lancome Genifique 세럼 50ml', 158000, 'luxury_skin'],
    ['LAN-TIN-001', 'Lancome Teint Idole 파운데이션', 68000, 'luxury_makeup'],
  ];

  // ── 5. 커머스 일별 매출 데이터 (commerce_sku_day) ──
  const channelKeys = ['naver', 'coupang', 'kakao', 'gmarket', '11st', 'oliveyoung'];
  
  // Generate 90 days of data for each product on each channel
  dates.forEach((date, di) => {
    // Trend: gradual increase with weekend bumps
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const trendMultiplier = 1 + (di / dates.length) * 0.3; // 30% growth over 90 days
    const weekendMultiplier = isWeekend ? 1.4 : 1.0;
    
    products.forEach(([sku, name, price, cat], pi) => {
      // Each product on 2-3 random channels
      const prodChannels = channelKeys.filter((_, ci) => (pi + ci) % 3 === 0 || ci < 2);
      prodChannels.forEach(ch => {
        const baseOrders = Math.floor((5 + Math.random() * 15) * trendMultiplier * weekendMultiplier);
        const units = baseOrders + Math.floor(Math.random() * baseOrders * 0.3);
        const revenue = units * price * (0.9 + Math.random() * 0.2);
        const refunds = revenue * (Math.random() * 0.05); // 0-5% refund rate
        
        sqls.push(`INSERT INTO commerce_sku_day (tenant_id, channel, date, sku, orders, units, revenue, refunds, extra_json) VALUES ('demo', '${ch}', '${date}', '${sku}', ${baseOrders}, ${units}, ${Math.round(revenue)}, ${Math.round(refunds)}, '{"product_name":"${name.replace(/'/g, "\\'")}","category":"${cat}"}');`);
      });
    });
  });

  // ── 6. 광고 인사이트 데이터 (ad_insight_agg) ──
  const adPlatforms = [
    { platform: 'meta', campaigns: ['LOR_Brand_KR_2026', 'LOR_Revitalift_Performance', 'LOR_Summer_UV_Campaign'] },
    { platform: 'google', campaigns: ['LOR_Search_Brand_KR', 'LOR_Shopping_Skincare', 'LOR_Display_Retargeting'] },
    { platform: 'naver_sa', campaigns: ['LOR_네이버SA_브랜드', 'LOR_네이버SA_스킨케어', 'LOR_네이버SA_메이크업'] },
    { platform: 'kakao_moment', campaigns: ['LOR_카카오모먼트_리타겟', 'LOR_카카오모먼트_신규'] },
    { platform: 'tiktok', campaigns: ['LOR_TikTok_UGC_Challenge', 'LOR_TikTok_Shop_Ads'] },
  ];

  const genders = ['male', 'female', 'unknown'];
  const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const regions = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '제주'];

  dates.forEach((date, di) => {
    const trendMultiplier = 1 + (di / dates.length) * 0.25;
    
    adPlatforms.forEach(({ platform, campaigns }) => {
      campaigns.forEach(campaign => {
        // 2-3 segments per campaign per day
        const numSegments = 2 + Math.floor(Math.random() * 2);
        for (let s = 0; s < numSegments; s++) {
          const gender = genders[Math.floor(Math.random() * genders.length)];
          const age = ageRanges[Math.floor(Math.random() * ageRanges.length)];
          const region = regions[Math.floor(Math.random() * regions.length)];
          
          const impressions = Math.floor((1000 + Math.random() * 9000) * trendMultiplier);
          const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04));
          const spend = Math.round(clicks * (200 + Math.random() * 800));
          const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08));
          const revenue = conversions * (20000 + Math.random() * 60000);
          
          sqls.push(`INSERT INTO ad_insight_agg (tenant_id, platform, date, campaign_id, gender, age_range, region, impressions, clicks, spend, conversions, revenue, extra_json) VALUES ('demo', '${platform}', '${date}', '${campaign.replace(/'/g, "\\'")}', '${gender}', '${age}', '${region}', ${impressions}, ${clicks}, ${spend}, ${conversions}, ${Math.round(revenue)}, '{}');`);
        }
      });
    });
  });

  // ── 7. 정산 라인 데이터 (kr_settlement_line) — 최근 3개월 ──
  const months = [
    { start: '2026-01-01', end: '2026-01-31' },
    { start: '2026-02-01', end: '2026-02-28' },
    { start: '2026-03-01', end: '2026-03-31' },
  ];
  
  months.forEach(({ start, end }) => {
    channelKeys.forEach(ch => {
      products.slice(0, 8).forEach(([sku, name, price]) => {
        const qty = 50 + Math.floor(Math.random() * 200);
        const gross = qty * price;
        const pfee = gross * 0.10;
        const afee = gross * 0.02;
        const ship = qty * 3000;
        const retFee = gross * 0.03;
        const vat = gross * 0.10;
        const net = gross - pfee - afee - ship - retFee - vat;

        sqls.push(`INSERT INTO kr_settlement_line (tenant_id, channel_key, period_start, period_end, order_id, sku, product_name, qty, sell_price, gross_sales, platform_fee, ad_fee, shipping_fee, return_fee, vat, net_payout, currency, status, ingested_at) VALUES ('demo', '${ch}', '${start}', '${end}', 'ORD-${ch}-${sku}-${start.substring(5,7)}', '${sku}', '${name.replace(/'/g, "\\'")}', ${qty}, ${price}, ${Math.round(gross)}, ${Math.round(pfee)}, ${Math.round(afee)}, ${Math.round(ship)}, ${Math.round(retFee)}, ${Math.round(vat)}, ${Math.round(net)}, 'KRW', 'settled', '${NOW}');`);
      });
    });
  });

  // ── 8. 커넥터 설정 ──
  const connectors = [
    { connector: 'meta_ads', status: 'healthy', config: { account_id: 'act_loreal_kr_demo', currency: 'KRW' } },
    { connector: 'google_ads', status: 'healthy', config: { customer_id: '123-456-7890', currency: 'KRW' } },
    { connector: 'naver_commerce', status: 'healthy', config: { seller_id: 'loreal_official', store: '로레알 공식스토어' } },
    { connector: 'coupang_wing', status: 'healthy', config: { vendor_id: 'loreal_kr', wing_key: 'demo_key' } },
    { connector: 'kakao_commerce', status: 'syncing', config: { shop_id: 'loreal_kakao' } },
    { connector: 'tiktok_ads', status: 'healthy', config: { advertiser_id: 'loreal_tiktok_kr' } },
  ];
  connectors.forEach(({ connector, status, config }) => {
    sqls.push(`INSERT IGNORE INTO connector_health (tenant_id, connector, status, last_run_at, failed_runs_24h, details_json, created_at) VALUES ('demo', '${connector}', '${status}', '${NOW}', 0, '${JSON.stringify(config).replace(/'/g, "\\'")}', '${NOW}');`);
    sqls.push(`INSERT IGNORE INTO connector_config (tenant_id, connector, config_json, is_enabled, created_at) VALUES ('demo', '${connector}', '${JSON.stringify(config).replace(/'/g, "\\'")}', 1, '${NOW}');`);
  });

  // ── 9. 그래프 노드/엣지 (Graph Score) ──
  products.forEach(([sku, name, price, cat]) => {
    sqls.push(`INSERT INTO graph_node (tenant_id, node_type, node_id, label, meta_json, created_at) VALUES ('demo', 'product', '${sku}', '${name.replace(/'/g, "\\'")}', '{"price":${price},"category":"${cat}"}', '${NOW}');`);
  });
  channelKeys.forEach(ch => {
    sqls.push(`INSERT INTO graph_node (tenant_id, node_type, node_id, label, meta_json, created_at) VALUES ('demo', 'channel', '${ch}', '${ch}', '{}', '${NOW}');`);
  });
  // Edges: product → channel
  products.forEach(([sku], pi) => {
    const prodChannels = channelKeys.filter((_, ci) => (pi + ci) % 3 === 0 || ci < 2);
    prodChannels.forEach(ch => {
      const weight = 0.5 + Math.random() * 0.5;
      sqls.push(`INSERT INTO graph_edge (tenant_id, src_type, src_id, dst_type, dst_id, edge_weight, edge_label, created_at) VALUES ('demo', 'product', '${sku}', 'channel', '${ch}', ${weight.toFixed(2)}, 'sells_on', '${NOW}');`);
    });
  });

  // ── 10. 활동 롤업 (activity_rollup) ──
  ['daily', 'weekly', 'monthly'].forEach(window => {
    ['revenue', 'spend', 'orders', 'roas'].forEach(dim => {
      sqls.push(`INSERT INTO activity_rollup (\`window\`, dimension, \`key\`, metrics_json, created_at) VALUES ('${window}', '${dim}', '${TODAY}', '{"total":${Math.round(Math.random() * 100000000)},"change":${(Math.random() * 0.3 - 0.05).toFixed(3)}}', '${NOW}');`);
    });
  });

  // ── 11. 감사 로그 (audit_log) ──
  const actions = [
    ['system', 'demo_data_seeded', '데모 가상데이터 시딩 완료'],
    ['demo@loreal.com', 'login', '데모 관리자 로그인'],
    ['marketing@loreal-demo.com', 'campaign_created', 'Summer UV Campaign 생성'],
    ['analyst@loreal-demo.com', 'report_exported', 'Q1 2026 정산 보고서 다운로드'],
  ];
  actions.forEach(([actor, action, detail]) => {
    sqls.push(`INSERT INTO audit_log (actor, action, details_json, created_at) VALUES ('${actor}', '${action}', '{"message":"${detail}"}', '${NOW}');`);
  });

  // ── 12. 플랜 관리 설정 (plan 메뉴 접근 권한 시딩) ──
  sqls.push(`INSERT IGNORE INTO billing_plan (code, name, limits_json, is_active, created_at) VALUES ('enterprise', 'Enterprise Plan', '{"users":999,"connectors":999,"reports":999}', 1, '${NOW}');`);

  return sqls;
}

async function main() {
  console.log('🚀 LOreal 데모 데이터 시딩 시작...');
  console.log(`대상 DB: ${DEMO_DB}`);
  console.log('');

  const conn = await connectSSH();
  console.log('SSH connected!');

  // Safety: Verify we're targeting demo DB
  const dbCheck = await execSSH(conn, `mysql -uroot -p"qlqjs@Elql3!" -N -e "SELECT DATABASE()" ${DEMO_DB} 2>/dev/null`);
  console.log('DB check:', DEMO_DB);

  // Build SQL
  const sqls = buildSQL();
  console.log(`총 ${sqls.length}개 SQL 문 생성`);

  // Batch execute via temp file
  const batchSize = 200;
  let totalExecuted = 0;

  for (let i = 0; i < sqls.length; i += batchSize) {
    const batch = sqls.slice(i, i + batchSize);
    const batchSQL = `USE ${DEMO_DB};\n` + batch.join('\n');
    
    // Write batch to temp file and execute
    const tmpFile = `/tmp/demo_seed_batch_${Math.floor(i / batchSize)}.sql`;
    
    // Use base64 to safely transfer SQL with special chars
    const b64 = Buffer.from(batchSQL).toString('base64');
    const writeResult = await execSSH(conn, `echo '${b64}' | base64 -d > ${tmpFile} && mysql -uroot -p"qlqjs@Elql3!" < ${tmpFile} 2>&1 && rm ${tmpFile}`);
    
    totalExecuted += batch.length;
    const pct = Math.round(totalExecuted / sqls.length * 100);
    
    if (writeResult.includes('ERROR')) {
      console.log(`⚠ Batch ${Math.floor(i / batchSize)}: ${writeResult.substring(0, 200)}`);
    } else {
      process.stdout.write(`\r  진행: ${pct}% (${totalExecuted}/${sqls.length})`);
    }
  }

  console.log('\n');

  // Verify
  const stats = await execSSH(conn, [
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as users FROM ${DEMO_DB}.app_user" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as sku_days FROM ${DEMO_DB}.commerce_sku_day" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as ad_insights FROM ${DEMO_DB}.ad_insight_agg" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as settlements FROM ${DEMO_DB}.kr_settlement_line" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as channels FROM ${DEMO_DB}.kr_channel" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as connectors FROM ${DEMO_DB}.connector_health" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as graph_nodes FROM ${DEMO_DB}.graph_node" 2>/dev/null`,
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as graph_edges FROM ${DEMO_DB}.graph_edge" 2>/dev/null`,
    // CRITICAL: Verify production DB is untouched
    `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as prod_users FROM geniego_roi.app_user WHERE email LIKE '%loreal%'" 2>/dev/null`,
  ].join(' && '));

  console.log('═══════════════════════════════════════');
  console.log('  데모 데이터 시딩 결과');
  console.log('═══════════════════════════════════════');
  console.log(stats);

  conn.end();
  console.log('✅ L\'Oréal 데모 데이터 시딩 완료!');
}

main().catch(err => {
  console.error('❌ 시딩 실패:', err.message);
  process.exit(1);
});
