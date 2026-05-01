// Verify 16 keys in ko.js using search
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/i18n/locales/ko.js');
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== ko.js 16개 키 존재 여부 검증 ===\n');

const newKeys = [
    'onboardingWelcome', 'onboardingTitle', 'onboardingDesc',
    'onboardingStep1', 'onboardingStep2', 'onboardingStep3',
    'onboardingShowGuide', 'onboardingStart', 'onboardingDontShow',
    'emptyTitle', 'emptyDesc', 'useTemplate',
    'templateWelcome', 'templateAbandon', 'templateThanks', 'templateChurn'
];

let foundCount = 0;
const missing = [];

newKeys.forEach(key => {
    // Search for the key in jb object context
    const pattern = new RegExp(`["']${key}["']\\s*:`);
    const exists = pattern.test(content);

    if (exists) {
        foundCount++;
        console.log(`✅ ${key}`);
    } else {
        missing.push(key);
        console.log(`❌ ${key}`);
    }
});

console.log(`\n📊 결과:`);
console.log(`✅ 발견: ${foundCount}/16개`);
console.log(`❌ 누락: ${missing.length}/16개`);

if (missing.length > 0) {
    console.log(`\n누락된 키 목록:`);
    missing.forEach(key => console.log(`  - ${key}`));
}

console.log('\n=== 검증 완료 ===');
