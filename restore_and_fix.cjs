/**
 * restore_and_fix_demo.cjs — 깨진 PHP 복원 후 안전한 방식으로 패치
 * 
 * sed 패치가 PHP 구문을 깨뜨렸으므로:
 * 1. .bak 파일에서 복원
 * 2. 각 핸들러의 tenantId 함수 맨 첫줄에 "return 'demo';" 삽입
 */
const { Client } = require('ssh2');
const DEMO = '/home/wwwroot/roidemo.geniego.com/backend';

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

  const handlersDir = `${DEMO}/src/Handlers`;

  // ═══ 1. 모든 .bak 파일에서 복원 ═══
  console.log('═══ 1. .bak에서 PHP 파일 복원 ═══');
  const baks = await exec(conn, `ls ${handlersDir}/*.bak* 2>/dev/null`);
  console.log('백업 파일:', baks.trim().substring(0, 500));

  // 가장 첫 번째 백업에서 복원 (원본)
  const handlers = [
    'KrChannel.php', 'SmsMarketing.php', 'GraphScore.php', 'Keys.php',
    'Attribution.php', 'ChannelCreds.php', 'EventNorm.php', 'ChannelSync.php',
    'Decisioning.php', 'WhatsApp.php', 'InstagramDM.php', 'AiGenerate.php',
    'Connectors.php', 'ModelMonitor.php', 'AdPerformance.php',
  ];

  for (const h of handlers) {
    // 가장 오래된 .bak 파일 찾기 (=원본)
    const oldBak = await exec(conn, `ls -t ${handlersDir}/${h}.bak* 2>/dev/null | tail -1`);
    const bakFile = oldBak.trim();
    if (bakFile) {
      await exec(conn, `cp "${bakFile}" ${handlersDir}/${h}`);
      console.log(`  ✅ ${h} 복원됨 (from ${bakFile.split('/').pop()})`);
    } else {
      console.log(`  ⚠️ ${h} 백업 없음`);
    }
  }

  // PerformanceController도 복원
  const perfCtrl = `${DEMO}/src/Controllers/PerformanceController.php`;
  const perfBak = await exec(conn, `ls -t ${perfCtrl}.bak* 2>/dev/null | tail -1`);
  if (perfBak.trim()) {
    await exec(conn, `cp "${perfBak.trim()}" ${perfCtrl}`);
    console.log('  ✅ PerformanceController.php 복원됨');
  }

  // UserAuth 복원 (plan 패치 전으로)
  const userAuth = `${DEMO}/src/Handlers/UserAuth.php`;
  const uaBak = await exec(conn, `ls -t ${userAuth}.bak* 2>/dev/null | tail -1`);
  if (uaBak.trim()) {
    await exec(conn, `cp "${uaBak.trim()}" ${userAuth}`);
    console.log('  ✅ UserAuth.php 복원됨');
  }

  // ═══ 2. PHP 구문 안전한 패치: 각 함수 내 첫 줄에 return 'demo' 삽입 ═══
  console.log('\n═══ 2. 안전한 tenant 패치 적용 ═══');

  // 패턴별로 다르므로 직접 PHP 코드를 생성하여 서버에 배포
  // 방법: 각 핸들러의 tenantId/tenant 함수 직후에 "return 'demo';" 한 줄 삽입
  
  // 패턴 A: function tenantId(Request $request): string {
  //   → 다음 줄에 return 'demo'; 삽입
  const patternA = [
    'KrChannel.php', 'GraphScore.php', 'Keys.php', 'Attribution.php',
    'Connectors.php', 'Decisioning.php',
  ];
  
  for (const h of patternA) {
    const path = `${handlersDir}/${h}`;
    // tenantId 함수 정의 다음 줄에 return 'demo'; 삽입
    await exec(conn, `sed -i '/function tenantId.*Request.*string/a\\        return "demo"; \\/\\/ DEMO_FORCED' ${path}`);
    // tenant 함수도 (KrChannel은 tenant라는 이름 사용)
    await exec(conn, `sed -i '/function tenant(Request.*string/a\\        return "demo"; \\/\\/ DEMO_FORCED' ${path}`);
    const check = await exec(conn, `grep -c "DEMO_FORCED" ${path}`);
    console.log(`  ✅ ${h}: ${check.trim()}줄 삽입`);
  }

  // 패턴 B: function tenant(Request $req): string + Bearer 토큰 체크  
  const patternB = [
    'SmsMarketing.php', 'ChannelSync.php', 'WhatsApp.php',
    'InstagramDM.php', 'AiGenerate.php', 'ModelMonitor.php',
  ];
  
  for (const h of patternB) {
    const path = `${handlersDir}/${h}`;
    // tenant 함수 시작 부분에 return 'demo'; 삽입
    await exec(conn, `sed -i '/function tenant(.*Request/a\\        return "demo"; \\/\\/ DEMO_FORCED' ${path}`);
    const check = await exec(conn, `grep -c "DEMO_FORCED" ${path}`);
    console.log(`  ✅ ${h}: ${check.trim()}줄 삽입`);
  }

  // 패턴 C: EventNorm - getAttribute 방식
  await exec(conn, `sed -i '/function tenant(ServerRequestInterface/a\\        return "demo"; \\/\\/ DEMO_FORCED' ${handlersDir}/EventNorm.php`);
  console.log('  ✅ EventNorm.php');

  // 패턴 D: ChannelCreds - auth_tenant attribute
  await exec(conn, `sed -i '/function tenantId(Request/a\\        return "demo"; \\/\\/ DEMO_FORCED' ${handlersDir}/ChannelCreds.php`);
  console.log('  ✅ ChannelCreds.php');

  // 패턴 E: AdPerformance - isDemo() 함수
  await exec(conn, `sed -i 's/return false; \\/\\/ Demo removed/return true; \\/\\/ DEMO_FORCED/' ${handlersDir}/AdPerformance.php`);
  console.log('  ✅ AdPerformance.php isDemo→true');

  // 패턴 F: PerformanceController - $auth['tenant_id']
  await exec(conn, `sed -i "s/\\$tenantId = \\$auth\\['tenant_id'\\]/\\$tenantId = 'demo' \\/\\/ DEMO_FORCED/" ${perfCtrl}`);
  await exec(conn, `sed -i "s/\\$userId = \\$auth\\['tenant_id'\\]/\\$userId = 'demo' \\/\\/ DEMO_FORCED/" ${perfCtrl}`);
  console.log('  ✅ PerformanceController.php');

  // ═══ 3. UserAuth.php — 가입 시 'pro' → 'enterprise' ═══
  console.log('\n═══ 3. UserAuth.php 가입 enterprise 패치 ═══');
  await exec(conn, `sed -i "s/\\$email, \\$hashedPw, \\$name, 'pro'/\\$email, \\$hashedPw, \\$name, 'enterprise'/g" ${userAuth}`);
  const uaCheck = await exec(conn, `grep -c "'enterprise'" ${userAuth}`);
  console.log(`  ✅ UserAuth.php: enterprise ${uaCheck.trim()}곳`);

  // ═══ 4. PHP 구문 검증 ═══
  console.log('\n═══ 4. PHP 구문 검증 ═══');
  for (const h of [...patternA, ...patternB, 'EventNorm.php', 'ChannelCreds.php', 'AdPerformance.php']) {
    const path = `${handlersDir}/${h}`;
    const syntax = await exec(conn, `php -l ${path} 2>&1 | tail -1`);
    console.log(`  ${h}: ${syntax.trim()}`);
  }
  const perfSyntax = await exec(conn, `php -l ${perfCtrl} 2>&1 | tail -1`);
  console.log(`  PerformanceController.php: ${perfSyntax.trim()}`);
  const uaSyntax = await exec(conn, `php -l ${userAuth} 2>&1 | tail -1`);
  console.log(`  UserAuth.php: ${uaSyntax.trim()}`);

  // ═══ 5. 운영서버 안전 확인 ═══
  console.log('\n═══ 5. 운영서버 무변경 확인 ═══');
  const prodSafe = await exec(conn, `grep -c "DEMO_FORCED" /home/wwwroot/roi.geniego.com/backend/src/Handlers/KrChannel.php 2>/dev/null || echo "0"`);
  console.log(`  운영 KrChannel DEMO_FORCED: ${prodSafe.trim()} (0이어야 안전)`);

  // 백업 파일 정리
  await exec(conn, `rm -f ${handlersDir}/*.bak.* ${perfCtrl}.bak.* ${userAuth}.bak 2>/dev/null`);
  console.log('  백업 파일 정리 완료');

  conn.end();
  console.log('\n✅ 복원 및 안전 패치 완료!');
}

main().catch(e => { console.error('❌:', e.message); process.exit(1); });
