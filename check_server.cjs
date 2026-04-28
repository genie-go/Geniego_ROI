const { Client } = require('ssh2');
const c = new Client();
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

c.on('ready', async () => {
  try {
    const DB = 'geniego_roi_demo';
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  데모 DB 가상데이터 주입 현황 점검               ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // 1. 사용자
    let r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT id, email, name, plan, company FROM ${DB}.app_user" 2>/dev/null`);
    console.log('━━━ 1. 데모 사용자 ━━━');
    console.log(r);

    // 2. 커머스 SKU 일별 매출
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as total, MIN(date) as start_date, MAX(date) as end_date, COUNT(DISTINCT sku) as sku_count, COUNT(DISTINCT channel) as channel_count, FORMAT(SUM(revenue),0) as total_revenue_KRW FROM ${DB}.commerce_sku_day" 2>/dev/null`);
    console.log('━━━ 2. 커머스 SKU 일별 매출 (commerce_sku_day) ━━━');
    console.log(r);

    // Sample products
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT sku, JSON_EXTRACT(extra_json, '$.product_name') as product_name, SUM(orders) as total_orders, FORMAT(SUM(revenue),0) as revenue_KRW FROM ${DB}.commerce_sku_day GROUP BY sku ORDER BY SUM(revenue) DESC LIMIT 10" 2>/dev/null`);
    console.log('  상위 10개 상품:');
    console.log(r);

    // 3. 광고 인사이트
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as total, COUNT(DISTINCT platform) as platform_count, COUNT(DISTINCT campaign_id) as campaign_count, FORMAT(SUM(impressions),0) as total_impressions, FORMAT(SUM(clicks),0) as total_clicks, FORMAT(SUM(spend),0) as total_spend_KRW, FORMAT(SUM(revenue),0) as total_revenue_KRW FROM ${DB}.ad_insight_agg" 2>/dev/null`);
    console.log('━━━ 3. 광고 인사이트 (ad_insight_agg) ━━━');
    console.log(r);

    // Platform breakdown
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT platform, COUNT(*) as rows_count, FORMAT(SUM(spend),0) as spend_KRW, FORMAT(SUM(revenue),0) as revenue_KRW FROM ${DB}.ad_insight_agg GROUP BY platform ORDER BY SUM(spend) DESC" 2>/dev/null`);
    console.log('  플랫폼별 광고비:');
    console.log(r);

    // 4. 정산 라인
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as total, COUNT(DISTINCT channel_key) as channels, COUNT(DISTINCT sku) as products, FORMAT(SUM(gross_sales),0) as gross_KRW, FORMAT(SUM(net_payout),0) as net_KRW FROM ${DB}.kr_settlement_line" 2>/dev/null`);
    console.log('━━━ 4. 정산 라인 (kr_settlement_line) ━━━');
    console.log(r);

    // 5. 채널
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT channel_key, display_name, currency FROM ${DB}.kr_channel" 2>/dev/null`);
    console.log('━━━ 5. 등록 채널 (kr_channel) ━━━');
    console.log(r);

    // 6. 수수료 규칙
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as total FROM ${DB}.kr_fee_rule" 2>/dev/null`);
    console.log('━━━ 6. 수수료 규칙 (kr_fee_rule) ━━━');
    console.log(r);

    // 7. 커넥터
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT connector, status FROM ${DB}.connector_health" 2>/dev/null`);
    console.log('━━━ 7. 커넥터 현황 (connector_health) ━━━');
    console.log(r);

    // 8. 그래프 노드/엣지
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT node_type, COUNT(*) as cnt FROM ${DB}.graph_node GROUP BY node_type" 2>/dev/null`);
    console.log('━━━ 8. 그래프 노드 (graph_node) ━━━');
    console.log(r);

    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as edges FROM ${DB}.graph_edge" 2>/dev/null`);
    console.log('  그래프 엣지: ', r.trim());

    // 9. 감사 로그
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT COUNT(*) as logs FROM ${DB}.audit_log" 2>/dev/null`);
    console.log('\n━━━ 9. 감사 로그 (audit_log) ━━━');
    console.log(r);

    // 10. 전체 테이블 행 수 요약
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -e "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB}' AND TABLE_ROWS > 0 ORDER BY TABLE_ROWS DESC" 2>/dev/null`);
    console.log('━━━ 10. 데이터가 있는 전체 테이블 ━━━');
    console.log(r);

    // Safety: Production DB untouched
    r = await execSSH(c, `mysql -uroot -p"qlqjs@Elql3!" -N -e "SELECT COUNT(*) FROM geniego_roi.app_user WHERE email LIKE '%loreal%' OR email LIKE '%demo%'" 2>/dev/null`);
    console.log('━━━ 🛡️ 운영 DB 오염 확인 ━━━');
    console.log(`  운영 DB 데모 사용자: ${r.trim()}건 ${r.trim() === '0' ? '✅ CLEAN' : '❌ CONTAMINATED!'}`);

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  점검 완료                                       ║');
    console.log('╚══════════════════════════════════════════════════╝');

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    c.end();
  }
});
c.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
