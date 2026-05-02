const fs = require('fs');
const content = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('"conn":')) {
        console.log(`Line ${i + 1}: ${line}`);
        // Print next 100 lines
        for (let j = 1; j <= 100 && i + j < lines.length; j++) {
            console.log(`Line ${i + j + 1}: ${lines[i + j]}`);
        }
    }
});
