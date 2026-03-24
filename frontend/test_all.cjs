const parser = require('./node_modules/@babel/parser');
const fs = require('fs');

const files = [
    'src/pages/CampaignManager.jsx',
    'src/pages/AIRecommendTab.jsx',
    'src/pages/ImgCreativeEditor.jsx',
    'src/pages/ResultSection.jsx',
];

for (const file of files) {
    try {
        if (!fs.existsSync(file)) {
            console.log(`MISSING: ${file}`);
            continue;
        }
        const content = fs.readFileSync(file, 'utf8');
        parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
        console.log(`OK: ${file}`);
    } catch (e) {
        console.log(`ERROR ${file} at line ${e.loc && e.loc.line} col ${e.loc && e.loc.column}: ${e.message.substring(0, 100)}`);
    }
}
