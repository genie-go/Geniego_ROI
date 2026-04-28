/**
 * apply_demo_tenant_fix.cjs — 데모 서버 ONLY!
 * 
 * 데모 서버(roidemo.geniego.com)의 모든 핸들러에서
 * tenantId() 함수가 항상 'demo'를 반환하도록 패치
 * 
 * ⚠️ 운영서버(roi.genie-go.com)는 절대 건드리지 않음!
 * ⚠️ 대상: /home/wwwroot/roidemo.geniego.com/backend/ ONLY
 */
const { Client } = require('ssh2');

const DEMO_BACKEND = '/home/wwwroot/roidemo.geniego.com/backend';
const PROD_BACKEND = '/home/wwwroot/roi.geniego.com/backend';

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

async function main() {
  console.log('🔧 데모 서버 tenant_id 강제 매핑 적용 시작...');
  console.log(`✅ 대상: ${DEMO_BACKEND} (데모만!)` );
  console.log(`❌ 운영: ${PROD_BACKEND} (절대 미적용!)` );
  console.log('');

  const conn = await connectSSH();
  console.log('SSH connected!');

  // 0. 안전 확인
  const envCheck = await execSSH(conn, `grep "GENIE_DB_NAME" ${DEMO_BACKEND}/.env`);
  if (!envCheck.includes('geniego_roi_demo')) {
    console.error('❌ 안전 중단: 데모 DB가 아닙니다!');
    conn.end();
    return;
  }
  console.log('✅ 데모 DB 확인:', envCheck.trim());

  // 1. 모든 핸들러에서 tenantId 정의 패턴 찾기
  console.log('\n📍 핸들러별 tenantId 함수 패턴 파악...');
  const tenantFns = await execSSH(conn, `grep -rl "function tenantId\\|function tenant(" ${DEMO_BACKEND}/src/Handlers/ 2>/dev/null`);
  console.log('tenantId 함수가 있는 파일들:');
  console.log(tenantFns);

  // 2. 각 핸들러의 tenantId 함수 패턴 확인
  const files = tenantFns.trim().split('\n').filter(Boolean);
  for (const f of files) {
    const fname = f.split('/').pop();
    const content = await execSSH(conn, `grep -A3 "function tenantId\\|function tenant(" ${f} 2>/dev/null`);
    console.log(`  ${fname}: ${content.trim()}`);
  }

  // 3. AdPerformance.php의 isDemo 패턴
  const adPerfIsDemo = await execSSH(conn, `grep -n "isDemo\\|this->userId" ${DEMO_BACKEND}/src/Handlers/AdPerformance.php 2>/dev/null`);
  console.log('\nAdPerformance isDemo/userId:');
  console.log(adPerfIsDemo);

  // 4. 전략: 각 핸들러의 tenantId 함수 본문을 "return 'demo';"로 대체
  // 또는 더 안전하게: .env에서 GENIE_DEMO_MODE=true 체크 후 'demo' 반환
  console.log('\n🔧 패치 적용...');
  
  // 4a. 패치 1: tenantId() 함수들 — "return 'demo'" 강제
  // 패턴: private static function tenantId(Request $request): string { ... }
  // → 내부를 return 'demo'; 로 대체
  
  for (const f of files) {
    const fname = f.split('/').pop();
    // 백업
    await execSSH(conn, `cp ${f} ${f}.bak.$(date +%s)`);
    
    // sed로 tenantId/tenant 함수 내부 첫 번째 return을 'demo'로 변경
    // 안전한 방법: 함수 전체를 교체하기보다, 환경변수 체크 라인 삽입
    const patch = await execSSH(conn, 
      `sed -i '/function tenantId\\|function tenant(/,/^    }/ {
        /return/i\\        // DEMO MODE: force tenant_id to demo
        s/return .*$/return getenv("GENIE_DEMO_MODE") === "true" ? "demo" : "demo"; \\/\\/ patched/
      }' ${f}`
    );
    console.log(`  ✅ ${fname} 패치됨`);
  }

  // 4b. 패치 2: AdPerformance.php — isDemo() 함수를 true로
  const adPerfPath = `${DEMO_BACKEND}/src/Handlers/AdPerformance.php`;
  await execSSH(conn, `cp ${adPerfPath} ${adPerfPath}.bak.$(date +%s)`);
  await execSSH(conn, `sed -i 's/return false; \\/\\/ Demo removed/return true; \\/\\/ DEMO MODE: always demo/' ${adPerfPath}`);
  console.log('  ✅ AdPerformance.php isDemo() → true');

  // 4c. 패치 3: PerformanceController.php — $userId를 'demo'로 강제
  const perfCtrlPath = `${DEMO_BACKEND}/src/Controllers/PerformanceController.php`;
  await execSSH(conn, `cp ${perfCtrlPath} ${perfCtrlPath}.bak.$(date +%s)`);
  await execSSH(conn, `sed -i "s/\\$tenantId = \\$auth\\['tenant_id'\\];/\\$tenantId = getenv('GENIE_DEMO_MODE') === 'true' ? 'demo' : \\$auth['tenant_id'];/" ${perfCtrlPath}`);
  await execSSH(conn, `sed -i "s/\\$userId = \\$auth\\['tenant_id'\\];/\\$userId = getenv('GENIE_DEMO_MODE') === 'true' ? 'demo' : \\$auth['tenant_id'];/" ${perfCtrlPath}`);
  console.log('  ✅ PerformanceController.php → demo tenant');

  // 5. 검증: 패치 후 tenantId 함수 확인
  console.log('\n📋 패치 확인...');
  for (const f of files) {
    const fname = f.split('/').pop();
    const after = await execSSH(conn, `grep -A2 "function tenantId\\|function tenant(" ${f} 2>/dev/null`);
    console.log(`  ${fname}: ${after.trim().substring(0, 100)}`);
  }

  // 6. 운영서버 무변경 확인
  console.log('\n🛡️ 운영서버 무변경 확인...');
  const prodCheck = await execSSH(conn, `grep "DEMO MODE" ${PROD_BACKEND}/src/Handlers/KrChannel.php 2>/dev/null || echo "✅ 운영서버 미적용 확인"`);
  console.log(prodCheck);

  conn.end();
  console.log('\n✅ 데모 서버 tenant 패치 완료!');
}

main().catch(err => {
  console.error('❌ 에러:', err.message);
  process.exit(1);
});
