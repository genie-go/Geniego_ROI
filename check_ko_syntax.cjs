// Check ko.js syntax
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/i18n/locales/ko.js');

console.log('=== ko.js 문법 검증 시작 ===\n');

try {
    // Try to require the file
    const koData = require(filePath);
    console.log('✅ ko.js 문법 오류 없음');
    console.log('✅ 파일 로드 성공');

    // Check if jb object exists
    if (koData.jb) {
        const jbKeys = Object.keys(koData.jb);
        console.log(`\n📊 jb 객체 키 개수: ${jbKeys.length}개`);

        // Check for the 16 new keys
        const newKeys = [
            'onboardingWelcome', 'onboardingTitle', 'onboardingDesc',
            'onboardingStep1', 'onboardingStep2', 'onboardingStep3',
            'onboardingShowGuide', 'onboardingStart', 'onboardingDontShow',
            'emptyTitle', 'emptyDesc', 'useTemplate',
            'templateWelcome', 'templateAbandon', 'templateThanks', 'templateChurn'
        ];

        console.log('\n🔍 16개 신규 키 존재 여부:');
        let foundCount = 0;
        newKeys.forEach(key => {
            const exists = koData.jb[key] !== undefined;
            if (exists) foundCount++;
            console.log(`  ${exists ? '✅' : '❌'} jb.${key}`);
        });

        console.log(`\n📈 발견된 키: ${foundCount}/16개`);
        console.log(`📉 누락된 키: ${16 - foundCount}/16개`);
    } else {
        console.log('❌ jb 객체가 존재하지 않습니다');
    }

} catch (error) {
    console.log('❌ ko.js 문법 오류 발견:\n');
    console.log(error.message);
    console.log('\n상세 오류:');
    console.log(error.stack);
}

console.log('\n=== 검증 완료 ===');
