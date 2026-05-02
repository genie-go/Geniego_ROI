const fs = require('fs');

const srcPath = 'd:/project/GeniegoROI/frontend/src/pages/ApiKeys.jsx';
let c = fs.readFileSync(srcPath, 'utf8');

c = c.replace(/`\$\{SC_CHANNELS\.length\}개 Channel Analysis Done, 감지된 키를 Confirm하세요\.`/g, "`\${SC_CHANNELS.length} Channels Analyzed. Please confirm paths.`");

c = c.replace(/body: r\.ok \? \(r\.capabilities\?\.join\(\", \"\) \+ \" Activate\"\) : t\('auto\.j0pwc5'\)/g, "body: r.ok ? (r.capabilities?.join(\", \") + \" Activate\") : t('auto.j0pwc5')");

// Delete // 주석이 있는 한국어들
const lines = c.split('\n');
const newLines = lines.map(l => {
    if (l.trim().startsWith('//')) {
        return l.replace(/[가-힣]/g, '');
    }
    return l;
});
c = newLines.join('\n');

c = c.replace(/\{applyModal\.ch\?\.name\} API 키 Issue 신청/, "{applyModal.ch?.name} API Key Application");
c = c.replace(/\{stats\.found\}건/, "{stats.found} items");

fs.writeFileSync(srcPath, c, 'utf8');
console.log('Done replacements.');
