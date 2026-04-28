const fs = require('fs');
const path = require('path');

const koMapRaw = fs.readFileSync('d:/project/GeniegoROI/korean_map.json', 'utf8');
const koMap = JSON.parse(koMapRaw);

const enMapRaw = fs.readFileSync('d:/project/GeniegoROI/english_map.json', 'utf8');
const enMap = JSON.parse(enMapRaw);

const localesDir = 'd:/project/GeniegoROI/frontend/src/i18n/locales';
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.js'));

function getAutoObj(map) {
    const autoObj = {};
    for (const [k, v] of Object.entries(map)) {
        const key = k.replace('auto.', '');
        autoObj[key] = v;
    }
    return autoObj;
}

const koAuto = getAutoObj(koMap);
const enAuto = getAutoObj(enMap);

for (const file of files) {
    const filePath = path.join(localesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const objToUse = file.startsWith('en') ? enAuto : koAuto;

    let autoStr = `\n    auto: {\n`;
    for (const [k, v] of Object.entries(objToUse)) {
        autoStr += `        "${k}": ${JSON.stringify(v)},\n`;
    }
    autoStr += `    },`;

    const regex = /(const\s+[a-zA-Z_-]+\s*=\s*{)/;
    if (regex.test(content) && !content.includes('auto: {')) {
        content = content.replace(regex, `$1${autoStr}`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`Failed to update ${file}`);
    }
}
