const fs = require('fs');

const fixComma = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\},,/g, '},');
    fs.writeFileSync(filePath, content, 'utf8');
};

fixComma('d:\\\\project\\\\GeniegoROI\\\\frontend\\\\src\\\\i18n\\\\locales\\\\ko.js');
fixComma('d:\\\\project\\\\GeniegoROI\\\\frontend\\\\src\\\\i18n\\\\locales\\\\en.js');
fixComma('d:\\\\project\\\\GeniegoROI\\\\frontend\\\\src\\\\i18n\\\\locales\\\\ja.js');
