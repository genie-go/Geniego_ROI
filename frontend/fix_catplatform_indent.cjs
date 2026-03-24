const fs = require('fs');
const path = require('path');
const dir = 'D:\\project\\GeniegoROI\\frontend\\src\\i18n\\locales';

// cat_platform이 4칸 들여쓰기인 경우 8칸으로 수정
['ko', 'ja', 'zh', 'de', 'th', 'vi', 'id', 'zh-TW', 'en'].forEach(lang => {
    const file = path.join(dir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');
    
    // 4칸 들여쓰기 cat_platform (잘못된 위치)를 8칸으로 수정
    const wrongPat = /\n    cat_platform: ("([^"]*)")/g;
    const fixed = c.replace(wrongPat, '\n        cat_platform: $1');
    
    if (fixed !== c) {
        fs.writeFileSync(file, fixed, 'utf8');
        console.log('FIXED ' + lang + ' - cat_platform indented to 8 spaces');
    } else {
        console.log('OK ' + lang + ' - cat_platform already at 8 spaces');
    }
    
    // tag_b2b, tag_api, tag_enterprise도 동일 수정
    let c2 = fs.readFileSync(file, 'utf8');
    const wrongPat2 = /\n    (tag_b2b|tag_api|tag_enterprise): /g;
    const fixed2 = c2.replace(wrongPat2, '\n        $1: ');
    if (fixed2 !== c2) {
        fs.writeFileSync(file, fixed2, 'utf8');
        console.log('  ALSO fixed tag_b2b/api/enterprise for ' + lang);
    }
});
console.log('All done');
