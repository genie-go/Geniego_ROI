const parser = require('./node_modules/@babel/parser');
const fs = require('fs');

try {
    parser.parse(
        fs.readFileSync('src/pages/CampaignManager.jsx', 'utf8'),
        { sourceType: 'module', plugins: ['jsx'] }
    );
    console.log('OK - no parse errors');
} catch (e) {
    console.log('Parse error at line', e.loc && e.loc.line, 'col', e.loc && e.loc.column);
    console.log('Message:', e.message);
}
