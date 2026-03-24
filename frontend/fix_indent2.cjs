const fs = require('fs');
const path = require('path');
const dir = 'D:\\project\\GeniegoROI\\frontend\\src\\i18n\\locales';

// explainTitle이 있는 줄을 기준으로 해당 블록(explainTitle ~ cat_explain_sports)의 들여쓰기를 추가
['ko', 'ja', 'zh'].forEach(lang => {
    const file = path.join(dir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');
    
    // 각 줄 처리
    const lines = c.split('\n');
    let inBlock = false;
    let blockStarted = false;
    
    const fixed = lines.map(line => {
        // explainTitle 줄을 찾으면 블록 시작
        if (!blockStarted && line.includes('explainTitle:')) {
            const indent = line.match(/^(\s*)/)[1].length;
            if (indent === 4) {
                inBlock = true;
                blockStarted = true;
                return '    ' + line; // 4칸 추가
            }
        }
        
        if (inBlock) {
            // cat_explain_sports 줄이 끝나면 블록 종료
            if (line.includes('cat_explain_sports:')) {
                inBlock = false;
                return '    ' + line; // 이 줄도 4칸 추가
            }
            // 빈 줄이거나 다음 섹션(tag_skincare 등)이면 블록 종료
            if (line.trim() !== '' && !line.includes('ch_explain_') && 
                !line.includes('cat_explain_') && !line.includes('explainTitle') &&
                !line.includes('explainSub') && !line.includes('explainCatInsight') &&
                !line.includes('explainChWhy') && !line.includes('explainEditNote') &&
                !line.includes('// ── AI')) {
                inBlock = false;
                return line; // 이 줄은 수정 안 함
            }
            if (line.trim() === '') return line; // 빈 줄은 그대로
            return '    ' + line; // 4칸 추가
        }
        return line;
    });
    
    fs.writeFileSync(file, fixed.join('\n'), 'utf8');
    console.log('FIXED ' + lang);
});
console.log('Done');
