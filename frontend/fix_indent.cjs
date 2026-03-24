const fs = require('fs');
const path = require('path');
const localesDir = 'D:\\project\\GeniegoROI\\frontend\\src\\i18n\\locales';

// en.js의 explainTitle 블록 들여쓰기 수정 (marketing 객체 밖 → 안)
const langs = ['en', 'ko', 'ja', 'zh'];

langs.forEach(lang => {
    const file = path.join(localesDir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');
    
    // 패턴: 들여쓰기 없는 (4칸 미만) explainTitle ~ cat_explain_sports 블록
    // 이를 4칸 들여쓰기 버전으로 교체
    const badPattern = /\n(    \/\/ ── AI 추천 근거[\s\S]*?cat_explain_sports: "[^"]*",)\n\n(\s{8}tag_skincare)/;
    const badPattern2 = /\n    \/\/ ── AI 추천 근거[\s\S]*?cat_explain_sports: "[^"]*",\n\n    tag_skincare/;
    
    // 들여쓰기가 4칸(marketing 객체 이름공간)인지 확인 후 수정
    // 잘못된 위치 (0-4칸 들여쓰기)의 explainTitle 찾기
    const wrongIndent = /\n((?:    )?(?:\/\/ ── AI 추천[^\n]*\n|    explainTitle:[^\n]*\n[\s\S]*?cat_explain_sports: "[^"]*",\n))/;
    
    // 더 직접적인 접근: explainTitle이 정확히 4칸 들여쓴 형태인지 확인
    if (c.includes('        explainTitle:')) {
        console.log('ALREADY OK ' + lang + ' (8-space indent inside nested object)');
        return;
    }
    if (!c.includes('    explainTitle:')) {
        console.log('NO 4-SPACE ' + lang + ' - checking for no-indent version');
    }
    
    // 실제 수정: 잘못된 들여쓰기 블록을 찾아서 4칸 추가
    // marketing.explainTitle should be inside the marketing object = 4 spaces indent
    // but first we need to find the exact structure
    
    // approach: replace each wrong-indent key with 4-space indent version
    // Find all lines between // ── AI 추천 근거 and cat_explain_sports
    const startMark = '    // ── AI 추천 근거 설명 패널 ────────────────────────────────────────';
    const endMark = "    cat_explain_sports:";
    
    const startIdx = c.indexOf(startMark);
    const endIdx = c.indexOf(endMark, startIdx);
    if (startIdx === -1 || endIdx === -1) {
        // Try alternative start marks
        const altStart = '    // ── AI 추천 근거';
        const s2 = c.indexOf(altStart);
        if (s2 !== -1) {
            const e2 = c.indexOf(endMark, s2);
            if (e2 !== -1) {
                const endOfLine = c.indexOf('\n', e2 + endMark.length);
                const block = c.slice(s2, endOfLine + 1);
                console.log('Found block in ' + lang + ':');
                console.log(block.slice(0, 200));
            }
        }
        console.log('WARN ' + lang + ' cannot find block');
        return;
    }
    
    const endOfSportsLine = c.indexOf('\n', endIdx) + 1;
    const block = c.slice(startIdx, endOfSportsLine);
    
    // Check indentation of first key line
    const firstKeyLine = block.split('\n').find(l => l.includes('explainTitle:'));
    if (!firstKeyLine) { console.log('WARN no explainTitle line in ' + lang); return; }
    
    const currentIndent = firstKeyLine.match(/^(\s*)/)[1].length;
    console.log(lang + ' explainTitle indent: ' + currentIndent);
    
    if (currentIndent === 8) { console.log('OK ' + lang); return; }
    if (currentIndent === 4) {
        // Need to add 4 more spaces to all lines in block
        const fixed = block.split('\n').map(line => {
            if (line.trim() === '') return line;
            return '    ' + line; // add 4 spaces
        }).join('\n');
        c = c.slice(0, startIdx) + fixed + c.slice(endOfSportsLine);
        fs.writeFileSync(file, c, 'utf8');
        console.log('FIXED ' + lang + ' (added 4 more spaces)');
    } else {
        console.log('UNEXPECTED indent ' + currentIndent + ' in ' + lang);
    }
});

console.log('Done');
