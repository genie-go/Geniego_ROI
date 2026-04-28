/**
 * Windows 배포 스크립트 — Node.js + ssh2 기반
 * sshpass 없이도 비밀번호 기반 SSH 배포 가능
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REMOTE_USER = 'root';
const REMOTE_HOST = '1.201.177.46';
const REMOTE_PATH = '/home/wwwroot/roi.geniego.com/frontend/dist';
const LOCAL_BUILD_DIR = path.join(__dirname, 'frontend', 'dist');
const PASSWORD = 'vot@Wlroi6!';

if (!fs.existsSync(LOCAL_BUILD_DIR)) {
  console.error('❌ Build directory does not exist:', LOCAL_BUILD_DIR);
  process.exit(1);
}

// PuTTY 레지스트리에 호스트 키 등록 (batch 모드 사용 가능하도록)
console.log('🔑 Registering host key...');
try {
  // ssh-keyscan -> PuTTY known hosts 레지스트리
  execSync(`"C:\\Program Files\\PuTTY\\plink.exe" -ssh -pw "${PASSWORD}" -batch root@${REMOTE_HOST} "echo ok"`, {
    timeout: 15000, stdio: 'pipe'
  });
  console.log('✅ SSH connection verified');
} catch (e) {
  // PuTTY가 호스트 키 미등록일 수 있음 → 수동 등록 시도
  console.log('⚠ PuTTY batch mode failed, trying to register host key via registry...');
  try {
    // ssh-keyscan으로 호스트 키 가져오기
    const scanResult = execSync(`"C:\\Program Files\\Git\\bin\\bash.exe" -c "ssh-keyscan -t ed25519 ${REMOTE_HOST} 2>/dev/null"`, { encoding: 'utf8', timeout: 10000 });
    console.log('  Host key scanned:', scanResult.trim().substring(0, 80));
    
    // PuTTY 레지스트리에 등록: 서버 fingerprints
    const keyPart = scanResult.trim().split(' ').pop(); // base64 key
    if (keyPart) {
      try {
        execSync(`reg add "HKCU\\SOFTWARE\\SimonTatham\\PuTTY\\SshHostKeys" /v "ed25519@22:${REMOTE_HOST}" /d "0x${Buffer.from(keyPart, 'base64').toString('hex')}" /f`, { stdio: 'pipe' });
        console.log('  ✅ Host key registered in PuTTY registry');
      } catch {
        console.log('  ⚠ Registry registration skipped');
      }
    }
  } catch (e2) {
    console.log('  ⚠ Host key scan failed:', e2.message?.substring(0, 100));
  }
}

// pscp를 사용한 파일 업로드
console.log('\n📦 Uploading build files to production server...');
console.log(`   From: ${LOCAL_BUILD_DIR}`);
console.log(`   To:   ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}`);

// assets 디렉토리와 개별 파일 분리해서 업로드
const items = fs.readdirSync(LOCAL_BUILD_DIR);
console.log(`   Files: ${items.length} items\n`);

let uploaded = 0;
let failed = 0;

// 1단계: 서버에서 기존 dist 정리 (assets 폴더)
console.log('🧹 Step 1: Cleaning remote dist directory...');
try {
  execSync(`"C:\\Program Files\\PuTTY\\plink.exe" -ssh -pw "${PASSWORD}" -batch ${REMOTE_USER}@${REMOTE_HOST} "rm -rf ${REMOTE_PATH}/assets && mkdir -p ${REMOTE_PATH}/assets"`, {
    timeout: 20000, stdio: 'pipe'
  });
  console.log('   ✅ Remote directory cleaned');
} catch (e) {
  console.log('   ⚠ Clean step failed (will try to overwrite):', e.message?.substring(0, 80));
}

// 2단계: pscp로 전체 디렉토리 업로드
console.log('\n📤 Step 2: Uploading files via PSCP...');
try {
  const result = execSync(
    `"C:\\Program Files\\PuTTY\\pscp.exe" -pw "${PASSWORD}" -batch -r "${LOCAL_BUILD_DIR}\\*" ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/`,
    { timeout: 300000, encoding: 'utf8', stdio: 'pipe' }
  );
  console.log('   ✅ Upload completed');
  console.log(result);
  uploaded = items.length;
} catch (e) {
  console.log('   ❌ Bulk upload failed:', e.message?.substring(0, 200));
  console.log('   Trying individual file upload...');
  
  // 개별 파일 업로드
  for (const item of items) {
    const fullPath = path.join(LOCAL_BUILD_DIR, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    try {
      if (isDir) {
        execSync(
          `"C:\\Program Files\\PuTTY\\pscp.exe" -pw "${PASSWORD}" -batch -r "${fullPath}" ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/`,
          { timeout: 120000, stdio: 'pipe' }
        );
      } else {
        execSync(
          `"C:\\Program Files\\PuTTY\\pscp.exe" -pw "${PASSWORD}" -batch "${fullPath}" ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/${item}`,
          { timeout: 60000, stdio: 'pipe' }
        );
      }
      uploaded++;
      console.log(`   ✅ ${item}`);
    } catch (err) {
      failed++;
      console.log(`   ❌ ${item}: ${err.message?.substring(0, 80)}`);
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Deployment Summary:`);
console.log(`   Total:    ${items.length} items`);
console.log(`   Uploaded: ${uploaded}`);
console.log(`   Failed:   ${failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0 && uploaded > 0) {
  console.log('🎉 Deployment completed successfully!');
  console.log('🌐 Visit: https://roi.genie-go.com');
} else if (uploaded > 0) {
  console.log('⚠ Partial deployment. Some files failed to upload.');
} else {
  console.log('❌ Deployment failed. No files were uploaded.');
  process.exit(1);
}
