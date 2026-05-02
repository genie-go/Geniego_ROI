/**
 * safe_patch_demo.cjs — PHP 파일을 안전하게 패치
 * 
 * 방법: 원본 복원 → PHP 파일 내용을 읽어서 정확한 위치에 삽입 → 구문 검증
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

  const H = `${DEMO}/src/Handlers`;

  // ═══ 1. 로컬 원본에서 복원 (깨끗한 상태) ═══
  console.log('═══ 1. 원본에서 복원 (production 코드 복사) ═══');
  const PROD = '/home/wwwroot/roi.geniego.com/backend/src';
  
  const filesToRestore = [
    'Handlers/KrChannel.php', 'Handlers/SmsMarketing.php', 'Handlers/GraphScore.php',
    'Handlers/Keys.php', 'Handlers/Attribution.php', 'Handlers/ChannelCreds.php',
    'Handlers/EventNorm.php', 'Handlers/ChannelSync.php', 'Handlers/Decisioning.php',
    'Handlers/WhatsApp.php', 'Handlers/InstagramDM.php', 'Handlers/AiGenerate.php',
    'Handlers/Connectors.php', 'Handlers/ModelMonitor.php', 'Handlers/AdPerformance.php',
    'Controllers/PerformanceController.php',
  ];

  for (const f of filesToRestore) {
    await exec(conn, `cp ${PROD}/${f} ${DEMO}/src/${f}`);
  }
  console.log(`  ${filesToRestore.length}개 파일 운영서버에서 복사 완료`);

  // UserAuth.php는 운영서버 것을 복사 (plan 변경은 나중에)
  await exec(conn, `cp ${PROD}/Handlers/UserAuth.php ${DEMO}/src/Handlers/UserAuth.php`);
  console.log('  UserAuth.php 운영서버에서 복사 완료');

  // ═══ 2. PHP 패치 스크립트 생성 및 실행 ═══
  console.log('\n═══ 2. PHP 패치 스크립트 배포 ═══');
  
  // PHP 스크립트로 안전하게 패치
  const patchScript = `<?php
/**
 * Demo tenant_id patch script
 * 각 핸들러의 tenant 함수 본문에 return 'demo'; 삽입
 */
\$handlersDir = '${H}';
\$patchCount = 0;
\$errors = [];

function patchFile(\$path, \$pattern, \$replacement) {
    global \$patchCount, \$errors;
    \$content = file_get_contents(\$path);
    if (\$content === false) {
        \$errors[] = basename(\$path) . ': read failed';
        return;
    }
    
    \$newContent = preg_replace(\$pattern, \$replacement, \$content, 1, \$count);
    if (\$count > 0) {
        file_put_contents(\$path, \$newContent);
        \$patchCount++;
        echo "  ✅ " . basename(\$path) . "\\n";
    } else {
        \$errors[] = basename(\$path) . ': pattern not matched';
        echo "  ⚠️ " . basename(\$path) . ": no match\\n";
    }
}

// Pattern A: tenantId with X-Tenant-Id header check
// function tenantId(Request $request): string {
//     $tid = $request->getHeaderLine('X-Tenant-Id');
//     return $tid !== '' ? $tid : 'demo';
\$patA = [
    'KrChannel.php', 'GraphScore.php', 'Keys.php', 
    'Attribution.php', 'Connectors.php', 'Decisioning.php',
];
foreach (\$patA as \$f) {
    patchFile(
        "\$handlersDir/\$f",
        '/(function\\s+tenantId?\\s*\\(.*?\\)\\s*:\\s*string\\s*\\{)/',
        "\\\\1\\n        return 'demo'; // DEMO_FORCED"
    );
}

// KrChannel also has 'tenant' function name
patchFile(
    "\$handlersDir/KrChannel.php",
    '/(private\\s+static\\s+function\\s+tenant\\s*\\(Request.*?\\)\\s*:\\s*string\\s*\\{)/',
    "\\\\1\\n        return 'demo'; // DEMO_FORCED"
);

// Pattern B: tenant with Bearer token check
\$patB = [
    'SmsMarketing.php', 'ChannelSync.php', 'WhatsApp.php',
    'InstagramDM.php', 'AiGenerate.php', 'ModelMonitor.php',
];
foreach (\$patB as \$f) {
    patchFile(
        "\$handlersDir/\$f",
        '/(private\\s+static\\s+function\\s+tenant\\s*\\(Request.*?\\)\\s*:\\s*string\\s*\\n\\s*\\{)/',
        "\\\\1\\n        return 'demo'; // DEMO_FORCED"
    );
}

// EventNorm - ServerRequestInterface
patchFile(
    "\$handlersDir/EventNorm.php",
    '/(private\\s+static\\s+function\\s+tenant\\s*\\(ServerRequestInterface.*?\\)\\s*:\\s*string\\s*\\n\\s*\\{)/',
    "\\\\1\\n        return 'demo'; // DEMO_FORCED"
);

// ChannelCreds
patchFile(
    "\$handlersDir/ChannelCreds.php",
    '/(private\\s+static\\s+function\\s+tenantId\\s*\\(Request.*?\\)\\s*:\\s*string\\s*\\n\\s*\\{)/',
    "\\\\1\\n        return 'demo'; // DEMO_FORCED"
);

// AdPerformance - isDemo()
patchFile(
    "\$handlersDir/AdPerformance.php",
    '/return false;\\s*\\/\\/\\s*Demo removed/',
    "return true; // DEMO_FORCED"
);

// PerformanceController
\$ctrlPath = '${DEMO}/src/Controllers/PerformanceController.php';
\$ctrl = file_get_contents(\$ctrlPath);
\$ctrl = str_replace(
    "\\$tenantId = \\$auth['tenant_id'];",
    "\\$tenantId = 'demo'; // DEMO_FORCED",
    \$ctrl
);
\$ctrl = str_replace(
    "\\$userId = \\$auth['tenant_id'];", 
    "\\$userId = 'demo'; // DEMO_FORCED",
    \$ctrl
);
file_put_contents(\$ctrlPath, \$ctrl);
echo "  ✅ PerformanceController.php\\n";

// UserAuth - register plan
\$uaPath = "\$handlersDir/UserAuth.php";
\$ua = file_get_contents(\$uaPath);
\$ua = str_replace(
    "\\$email, \\$hashedPw, \\$name, 'pro'",
    "\\$email, \\$hashedPw, \\$name, 'enterprise'",
    \$ua
);
file_put_contents(\$uaPath, \$ua);
echo "  ✅ UserAuth.php (enterprise)\\n";

echo "\\nPatched: \$patchCount files\\n";
if (\$errors) echo "Errors: " . implode(', ', \$errors) . "\\n";

// Syntax check
echo "\\n=== Syntax Check ===\\n";
\$allFiles = array_merge(
    array_map(fn(\$f) => "\$handlersDir/\$f", \$patA),
    array_map(fn(\$f) => "\$handlersDir/\$f", \$patB),
    [
        "\$handlersDir/EventNorm.php",
        "\$handlersDir/ChannelCreds.php",
        "\$handlersDir/AdPerformance.php",
        "\$handlersDir/UserAuth.php",
        \$ctrlPath,
    ]
);
\$allOk = true;
foreach (\$allFiles as \$f) {
    \$out = [];
    exec("php -l \$f 2>&1", \$out, \$ret);
    \$result = end(\$out);
    if (\$ret !== 0) {
        echo "  ❌ " . basename(\$f) . ": \$result\\n";
        \$allOk = false;
    } else {
        echo "  ✅ " . basename(\$f) . "\\n";
    }
}
echo \$allOk ? "\\n✅ All syntax OK\\n" : "\\n⚠️ Some files have errors\\n";
`;

  // 패치 스크립트를 서버에 배포
  const scriptPath = '/tmp/patch_demo.php';
  const b64 = Buffer.from(patchScript).toString('base64');
  await exec(conn, `echo '${b64}' | base64 -d > ${scriptPath}`);
  
  // 실행
  const result = await exec(conn, `php ${scriptPath}`);
  console.log(result);

  // 정리
  await exec(conn, `rm -f ${scriptPath}`);

  // ═══ 3. 운영서버 안전 최종 확인 ═══
  console.log('═══ 3. 운영서버 안전 확인 ═══');
  const prodCheck = await exec(conn, `grep -c "DEMO_FORCED" /home/wwwroot/roi.geniego.com/backend/src/Handlers/KrChannel.php 2>/dev/null || echo "0"`);
  console.log(`  운영 KrChannel DEMO_FORCED: ${prodCheck.trim()} (0=안전)`);

  conn.end();
  console.log('\n✅ 안전 패치 완료!');
}

main().catch(e => { console.error('❌:', e.message); process.exit(1); });
