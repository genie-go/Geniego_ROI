const fs=require('fs');
const p=__dirname+'/src/i18n/locales/ko.js';
const s=fs.readFileSync(p,'utf8');
// Try to find the exact syntax error position using eval
try {
    new Function(s.replace('export default','return'));
    console.log('✅ ko.js is valid');
} catch(e) {
    console.log('Error:', e.message);
    // Find the position mentioned in the error
    const match = e.message.match(/position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        console.log('At position', pos, ':', s.substring(Math.max(0,pos-50), pos+50));
    }
}
