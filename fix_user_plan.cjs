const { Client } = require('ssh2');
function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
  });
}
function exec(conn, cmd) {
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

async function main() {
  const conn = await connectSSH();
  console.log('SSH connected!');

  // 1. 실제 컬럼 확인
  const cols = await exec(conn, `mysql -uroot -p'qlqjs@Elql3!' geniego_roi_demo -N -e "SHOW COLUMNS FROM app_user;" 2>/dev/null`);
  console.log('app_user 컬럼:');
  console.log(cols);

  // 2. plan 컬럼만 업데이트 (subscription_status 제외)
  const r = await exec(conn, `mysql -uroot -p'qlqjs@Elql3!' geniego_roi_demo -e "UPDATE app_user SET plan='enterprise' WHERE plan != 'enterprise';" 2>/dev/null`);
  console.log('UPDATE 결과:', r || 'OK');

  // 3. subscription_expires_at 존재하면 업데이트
  const r2 = await exec(conn, `mysql -uroot -p'qlqjs@Elql3!' geniego_roi_demo -e "UPDATE app_user SET subscription_expires_at='2027-12-31 23:59:59' WHERE subscription_expires_at IS NULL OR subscription_expires_at < '2027-01-01';" 2>/dev/null`);
  console.log('subscription_expires_at:', r2 || 'OK');

  // 4. 검증
  const v = await exec(conn, `mysql -uroot -p'qlqjs@Elql3!' geniego_roi_demo -e "SELECT id,email,name,plan,subscription_expires_at FROM app_user ORDER BY id;" 2>/dev/null`);
  console.log('\n최종 유저 상태:');
  console.log(v);

  conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
