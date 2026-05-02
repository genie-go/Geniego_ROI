const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected!');
  const DB = 'geniego_roi_demo';
  const PW = 'qlqjs@Elql3!';
  const queries = [
    ['app_user COUNT', `SELECT COUNT(*) FROM ${DB}.app_user`],
    ['commerce_sku_day COUNT', `SELECT COUNT(*) FROM ${DB}.commerce_sku_day`],
    ['ad_insight_agg COUNT', `SELECT COUNT(*) FROM ${DB}.ad_insight_agg`],
    ['kr_settlement_line COUNT', `SELECT COUNT(*) FROM ${DB}.kr_settlement_line`],
    ['kr_channel COUNT', `SELECT COUNT(*) FROM ${DB}.kr_channel`],
    ['kr_fee_rule COUNT', `SELECT COUNT(*) FROM ${DB}.kr_fee_rule`],
    ['connector_health COUNT', `SELECT COUNT(*) FROM ${DB}.connector_health`],
    ['graph_node COUNT', `SELECT COUNT(*) FROM ${DB}.graph_node`],
    ['graph_edge COUNT', `SELECT COUNT(*) FROM ${DB}.graph_edge`],
    ['activity_rollup COUNT', `SELECT COUNT(*) FROM ${DB}.activity_rollup`],
    ['commerce tenant_ids', `SELECT DISTINCT tenant_id FROM ${DB}.commerce_sku_day LIMIT 5`],
    ['ad tenant_ids', `SELECT DISTINCT tenant_id FROM ${DB}.ad_insight_agg LIMIT 5`],
    ['settlement tenant_ids', `SELECT DISTINCT tenant_id FROM ${DB}.kr_settlement_line LIMIT 5`],
    ['users list', `SELECT id,email,name,plan FROM ${DB}.app_user ORDER BY id DESC LIMIT 15`],
  ];

  let idx = 0;
  function runNext() {
    if (idx >= queries.length) { conn.end(); return; }
    const [label, sql] = queries[idx++];
    const cmd = `mysql -uroot -p'${PW}' -N -e "${sql}" 2>/dev/null`;
    conn.exec(cmd, (err, stream) => {
      if (err) { console.log(`${label}: ERROR ${err.message}`); runNext(); return; }
      let out = '';
      stream.on('data', d => out += d.toString());
      stream.on('close', () => { console.log(`${label}: ${out.trim()}`); runNext(); });
    });
  }
  runNext();
});
conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
