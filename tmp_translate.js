const fs = require('fs');

function autoTranslateJSX() {
    const filePath = 'frontend/src/pages/OperationsHub.jsx';
    const namespace = 'operations';
    let code = fs.readFileSync(filePath, 'utf8');
    let dict = {};
    let count = 0;

    // 1. >한글< 
    code = code.replace(/>([^<>]*[가-힣][^<>]*)</g, (match, p1) => {
        let text = p1.trim();
        if (!text || text.includes('{') || text.includes('}')) return match;
        
        let key = Math.random().toString(36).substr(2, 6);
        dict[key] = text;
        const before = p1.match(/^\s*/)[0];
        const after = p1.match(/\s*$/)[0];
        return ">" + before + "{t('" + namespace + "." + key + "', '" + text + "')}" + after + "<";
    });

    // 2. label="한글"
    code = code.replace(/([a-zA-Z0-9_]+)="([^"]*[가-힣][^"]*)"/g, (match, attrName, text) => {
        let key = Math.random().toString(36).substr(2, 6);
        dict[key] = text;
        return attrName + "={t('" + namespace + "." + key + "', '" + text + "')}";
    });

    // 3. Object prop: "한글"
    code = code.replace(/([a-zA-Z0-9_]+):\s*"([^"]*[가-힣][^"]*)"/g, (match, propName, text) => {
        if (match.includes("t(")) return match;
        let key = Math.random().toString(36).substr(2, 6);
        dict[key] = text;
        return propName + ": t('" + namespace + "." + key + "', '" + text + "')";
    });

    // 4. Object prop: '한글'
    code = code.replace(/([a-zA-Z0-9_]+):\s*'([^']*[가-힣][^']*)'/g, (match, propName, text) => {
        if (match.includes("t(")) return match;
        let key = Math.random().toString(36).substr(2, 6);
        dict[key] = text;
        return propName + ": t('" + namespace + "." + key + "', '" + text + "')";
    });

    fs.writeFileSync(filePath, code, 'utf8');
    fs.writeFileSync('./tmp_dict.json', JSON.stringify({[namespace]: dict}, null, 2));
    console.log("Done");
}

autoTranslateJSX();
