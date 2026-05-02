require('dotenv').config();
const { execSync } = require('child_process');
const axios = require('axios');

const CONFIG = {
    REMOTE_IP: process.env.REMOTE_IP,
    REMOTE_ROOT: "/home/wwwroot/roi.geniego.com",
    WEBHOOK: process.env.SLACK_WEBHOOK
};

async function runStep(name, command) {
    try {
        console.log(`\n[${name}] 실행 중...`);
        execSync(command, { stdio: 'inherit' });
        console.log(`✓ ${name} 완료`);
        return true;
    } catch (e) {
        console.error(`\n!!! [FATAL] ${name} 단계에서 오류 발생 !!!`);
        return false;
    }
}

async function main() {
    console.log("===============================================");
    console.log("   GENIE-GO ROI TITAN SUPREME V10 CONSOLE      ");
    console.log("===============================================");

    // PHASE 1: 구문 검증 (ESM export 문법 호환성 강화)
    const syntaxCheck = `node -e "const fs=require('fs'); const src=fs.readFileSync('./frontend/src/i18n/locales/en.js', 'utf8').replace(/export default/g, 'const dummy ='); require('vm').createScript(src); console.log('✓ Syntax 무결성 확인됨');"`;
    if (!await runStep("I18N Syntax Guard", syntaxCheck)) return;

    // PHASE 2: 빌드 실행
    if (!await runStep("Production Build", "cd frontend && npm run build")) return;

    // PHASE 3: 헬스 체크
    console.log("\n[Health Check] API 연결성 검증 중...");
    try {
        const res = await axios.post("https://roi.genie-go.com/api/auth/login", {
            email: process.env.TEST_EMAIL,
            password: process.env.TEST_PASS
        });
        
        if (res.data && res.data.token) {
            console.log("✓ Health Check Passed: Token Received");
            await axios.post(CONFIG.WEBHOOK, {
                text: "✅ [GenieGo] v10 배포 성공 및 통합 진단 통과" 
            });
        }
    } catch (e) {
        console.error("!!! [CRITICAL] 로그인 검증 실패 !!!");
        await axios.post(CONFIG.WEBHOOK, { text: "🚨 [GenieGo] 배포 후 로그인 검증 실패!" });
    }
    
    console.log("\n===============================================");
    console.log("   공정이 종료되었습니다.   ");
    console.log("===============================================");
}

main();