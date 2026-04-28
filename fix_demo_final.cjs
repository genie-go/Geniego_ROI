/**
 * fix_demo_apply.cjs — 최종 적용
 * 1. plans 컬럼도 enterprise로 업데이트
 * 2. UserAuth.php INSERT에서 'pro' → 'enterprise' 변경
 */
const { Client } = require('ssh2');
const DEMO = '/home/wwwroot/roidemo.geniego.com/backend';
const DB = 'geniego_roi_demo';
const PW = 'qlqjs@Elql3!';

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
      stream.stderr.on('data', d => {});
      stream.on('close', () => resolve(out));
    });
  });
}

async function main() {
  const conn = await connectSSH();
  console.log('SSH connected!');

  // ═══ 1. plans + plan 둘 다 enterprise ═══
  console.log('\n═══ 1. plans + plan = enterprise ═══');
  await exec(conn, `mysql -uroot -p'${PW}' ${DB} -e "
    UPDATE app_user SET 
      plan='enterprise', 
      plans='enterprise', 
      subscription_status='active', 
      subscription_expires_at='2027-12-31 23:59:59'
    WHERE id > 0;
  " 2>/dev/null`);
  
  const v1 = await exec(conn, `mysql -uroot -p'${PW}' ${DB} -N -e "SELECT id, email, plan, plans FROM app_user ORDER BY id;" 2>/dev/null`);
  console.log(v1);

  // ═══ 2. UserAuth.php — 'pro' → 'enterprise' 하드코딩 변경 ═══
  console.log('═══ 2. UserAuth.php plan 하드코딩 변경 ═══');
  const authPath = `${DEMO}/src/Handlers/UserAuth.php`;
  
  // INSERT 문에서 'pro' → 'enterprise' (가입 시 plan)
  // 3개의 INSERT fallback 모두 수정
  await exec(conn, `sed -i "s/\\$email, \\$hashedPw, \\$name, 'pro'/\\$email, \\$hashedPw, \\$name, 'enterprise'/g" ${authPath}`);
  
  // 검증
  const after = await exec(conn, `grep -n "enterprise\\|'pro'" ${authPath} | grep -i "insert\\|execute\\|hashedPw" | head -10`);
  console.log('패치 후 INSERT plan 값:');
  console.log(after);

  // ═══ 3. 최종 검증 ═══
  console.log('\n═══ 3. 최종 검증 ═══');
  
  // 유저 상태
  const users = await exec(conn, `mysql -uroot -p'${PW}' ${DB} -e "SELECT id, email, name, plan, plans, subscription_status FROM app_user ORDER BY id;" 2>/dev/null`);
  console.log('유저 상태:');
  console.log(users);

  // tenant 패치 확인
  const tenantCheck = await exec(conn, `grep "DEMO" ${DEMO}/src/Handlers/KrChannel.php | head -3`);
  console.log('KrChannel tenant 패치:', tenantCheck.trim());

  // 운영서버 안전 확인
  const prodSafe = await exec(conn, `grep "enterprise" /home/wwwroot/roi.geniego.com/backend/src/Handlers/UserAuth.php 2>/dev/null | grep -c "hashedPw"`);
  console.log('운영서버 enterprise 하드코딩:', prodSafe.trim() === '0' ? '✅ 없음 (안전)' : '⚠️ 확인 필요');

  conn.end();
  console.log('\n✅ 데모 서버 최종 수정 완료!');
}

main().catch(e => { console.error('❌:', e.message); process.exit(1); });
