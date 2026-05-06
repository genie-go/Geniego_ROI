const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// [설정] 상대 경로를 절대 경로로 변환하여 안정성 확보
const targetPath = path.resolve(process.cwd(), './frontend/src/i18n/locales/en.js');
const tempPath = path.join(os.tmpdir(), `en_debug_${Date.now()}.mjs`);

if (!fs.existsSync(targetPath)) {
    console.error(`[ERROR] 파일을 찾을 수 없습니다: ${targetPath}`);
    process.exit(1);
}

const src = fs.readFileSync(targetPath, 'utf8').replace(/^\uFEFF/, ''); // BOM 제거
const lines = src.split('\n');

function testUpTo(n) {
    const content = lines.slice(0, n).join('\n');
    fs.writeFileSync(tempPath, content, 'utf8');
    try {
        execSync(`node --check "${tempPath}"`, { stdio: 'pipe', timeout: 3000 });
        return true;
    } catch(e) {
        const stderr = e.stderr ? e.stderr.toString() : '';
        // 실제 문법 오류와 단순 끝맺음 오류 분리
        if (stderr.includes('SyntaxError') && !stderr.includes('Unexpected end')) {
            return false; 
        }
        return true;
    }
}

console.log(`분석 시작: ${targetPath} (총 ${lines.length} 라인)`);
let lo = 1, hi = lines.length, lastOk = 0;

while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (testUpTo(mid)) {
        lastOk = mid;
        lo = mid + 1;
    } else {
        hi = mid - 1;
    }
}

console.log(`\n✅ 검증 완료`);
console.log(`마지막 정상 라인: ${lastOk}`);
console.log(`최초 에러 발생 지점: ${lastOk + 1}\n`);

const start = Math.max(0, lastOk - 2);
const end = Math.min(lines.length - 1, lastOk + 3);

for (let i = start; i <= end; i++) {
    const marker = i === lastOk ? '>>>' : '   ';
    console.log(`${marker} ${String(i + 1).padStart(5)}: ${lines[i].trimEnd().substring(0, 100)}`);
}

// 임시 파일 삭제
if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);