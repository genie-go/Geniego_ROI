const fs = require('fs');
const path = require('path');
const dir = 'D:\\project\\GeniegoROI\\frontend\\src\\i18n\\locales';

// 각 로케일 파일에서 marketing 객체를 찾아 그 안에 올바르게 explainTitle 블록 이동
['ko', 'ja', 'zh', 'en'].forEach(lang => {
    const file = path.join(dir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');
    
    // 현재 상태: cat_platform이 4칸 들여쓰기(marketing 밖)로 삽입된 경우가 있음
    // explainTitle 블록이 marketing 객체 안에 있는지 확인
    // marketing 객체 시작을 찾음
    const marketingStart = c.indexOf('\n    marketing: {');
    if (marketingStart < 0) { console.log('SKIP ' + lang + ' - no marketing object'); return; }
    
    // marketing 객체 끝을 찾음 (다음 top-level 키 = 4칸 들여쓰기 + non-space)
    const afterMarketing = c.indexOf('\n    },\n', marketingStart);
    if (afterMarketing < 0) { console.log('WARN ' + lang + ' - cannot find marketing end'); return; }
    
    const marketingBlock = c.slice(marketingStart, afterMarketing + 5);
    
    // marketing 블록 안에 explainTitle이 있는지
    if (marketingBlock.includes('explainTitle:')) {
        console.log('OK ' + lang + ' - explainTitle already inside marketing');
        return;
    }
    
    console.log(lang + ' - explainTitle is OUTSIDE marketing object, fixing...');
    
    // explainTitle 블록 찾기 (현재 위치)
    const explainStart = c.indexOf('explainTitle:');
    if (explainStart < 0) { console.log('WARN ' + lang + ' - no explainTitle'); return; }
    
    // explainTitle 줄의 시작 찾기
    const lineStart = c.lastIndexOf('\n', explainStart) + 1;
    // cat_explain_sports 줄의 끝 찾기
    const sportsIdx = c.indexOf('cat_explain_sports:', explainStart);
    if (sportsIdx < 0) { console.log('WARN ' + lang + ' - no cat_explain_sports'); return; }
    const sportsLineEnd = c.indexOf('\n', sportsIdx) + 1;
    
    // 블록 추출 (// ── AI 추천 줄부터 cat_explain_sports 줄 끝까지)
    // 실제 블록 시작: // ── AI 추천 줄 또는 explainTitle 줄 중 더 앞의 것
    const commentIdx = c.lastIndexOf('// ── AI 추천', explainStart);
    const blockStart = commentIdx > lineStart - 200 ? commentIdx : lineStart;
    const blockLineStart = c.lastIndexOf('\n', blockStart) + 1;
    
    let explainBlock = c.slice(blockLineStart, sportsLineEnd);
    
    // 1. 현재 위치에서 블록 제거
    c = c.slice(0, blockLineStart) + c.slice(sportsLineEnd);
    
    // 2. marketing 객체 끝(},) 바로 전에 삽입
    // marketing 객체 끝 다시 찾기 (블록 제거 후)
    const marketingStart2 = c.indexOf('\n    marketing: {');
    const afterMarketing2 = c.indexOf('\n    },\n', marketingStart2);
    
    // 삽입할 블록: 8칸 들여쓰기로 정규화
    const normalizedBlock = explainBlock.split('\n').map(line => {
        if (line.trim() === '') return '';
        // 기존 들여쓰기 제거 후 8칸으로 설정
        const trimmed = line.trimStart();
        if (trimmed.startsWith('//')) return '        ' + trimmed;
        if (trimmed) return '        ' + trimmed;
        return line;
    }).join('\n');
    
    c = c.slice(0, afterMarketing2) + '\n' + normalizedBlock.trimEnd() + c.slice(afterMarketing2);
    
    fs.writeFileSync(file, c, 'utf8');
    console.log('FIXED ' + lang);
});
console.log('All done');
