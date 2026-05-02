const fs = require('fs');
const https = require('https');

function translate(text, targetLang) {
    return new Promise((resolve) => {
        if (!text || typeof text !== 'string') return resolve(text);
        if (/^[a-zA-Z0-9\s\-_.,!?\[\]()]+$/.test(text) && text.length < 5) return resolve(text); // skip very basic symbols
        
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json[0]) {
                        const translated = json[0].map(x => x[0]).join('');
                        resolve(translated);
                    } else {
                        resolve(text);
                    }
                } catch(e) {
                    resolve(text);
                }
            });
        }).on('error', () => resolve(text));
    });
}

function processJsFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const startIdx = content.indexOf('export default {');
    const endIdx = content.lastIndexOf('}');
    let objStr = content.substring(startIdx + 15, endIdx + 1).trim();
    if(objStr.endsWith(';')) objStr = objStr.slice(0, -1);
    
    let obj;
    try {
        obj = new Function(`return ` + objStr)();
    } catch(e) {
        throw new Error('Failed to parse ' + filePath);
    }
    return obj;
}

async function run() {
    console.log("Reading EN locale...");
    const enObj = processJsFile('frontend/src/i18n/locales/en.js');
    const ugcKeys = enObj.influencerUGC || {};
    
    // We also need to fix the sidebar "Influencer Mgmt" directly in crm namespace if it's there
    // Actually sidebar influencer is at the root: 'influencer_mgmt': 'Influencer Mgmt', 'influencer': 'Influencer Mgmt'
    
    console.log(`Found ${Object.keys(ugcKeys).length} keys in influencerUGC.`);
    
    const zhObj = processJsFile('frontend/src/i18n/locales/zh.js');
    zhObj.influencerUGC = zhObj.influencerUGC || {};
    
    // update root sidebar translations for Zh
    zhObj.influencer_mgmt = "网红管理";
    zhObj.influencer = "网红 & UGC";
    
    // We already injected influencer tab texts perfectly, so no need to touch influencer namespace
    
    let count = 0;
    for (const [key, text] of Object.entries(ugcKeys)) {
        // preserve some hard-coded symbols like emojis
        // translate text to Chinese
        process.stdout.write(`Translating [${key}]: ${text.substring(0, 20)}... `);
        
        let translatedText = await translate(text, 'zh-cn');
        
        // Post translation cleanups if google messes up formatting
        translatedText = translatedText.replace(/％/g, '%');
        
        zhObj.influencerUGC[key] = translatedText;
        console.log("Done");
        // small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
        count++;
    }
    
    console.log("Translations completed. Saving to zh.js and zh-TW.js...");
    
    const finalContent = 'export default ' + JSON.stringify(zhObj, null, 4) + ';\n';
    fs.writeFileSync('frontend/src/i18n/locales/zh.js', finalContent, 'utf8');
    fs.writeFileSync('frontend/src/i18n/locales/zh-TW.js', finalContent, 'utf8');
    
    console.log("Successfully fully localized to Native Chinese.");
}

run();
