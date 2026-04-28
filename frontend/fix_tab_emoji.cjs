const fs=require('fs'),path=require('path'),dir=__dirname+'/src/i18n/locales/';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));

let totalFixed=0;
for(const f of files){
    const p=path.join(dir,f);
    let s=fs.readFileSync(p,'utf8');
    let changed=false;
    
    // Remove leading emoji from tab_* values in influencer block
    // Pattern: "tab_something":"🧑 text" → "tab_something":"text"
    const tabKeys=['tab_identity','tab_contract','tab_settle','tab_roi','tab_ugc','tab_ai_eval','tab_guide'];
    for(const k of tabKeys){
        // Match "tab_key":"EMOJI text" and remove the emoji + space
        const regex=new RegExp(`"${k}":"[^"]*"`);
        const m=s.match(regex);
        if(m){
            const val=m[0];
            // Extract the value part
            const colonIdx=val.indexOf('":"');
            const rawVal=val.substring(colonIdx+3, val.length-1);
            // Remove leading emoji (1-4 chars) + space
            const cleaned=rawVal.replace(/^[\u{1F000}-\u{1FFFF}][\u{FE00}-\u{FE0F}]?\s*/u,'')
                                .replace(/^[\u2600-\u2BFF]\s*/,'')
                                .replace(/^[\u{1F300}-\u{1FFFF}]\s*/u,'');
            if(cleaned!==rawVal){
                const newVal=`"${k}":"${cleaned}"`;
                s=s.replace(val,newVal);
                changed=true;
                totalFixed++;
            }
        }
    }
    if(changed){
        fs.writeFileSync(p,s);
        console.log('Fixed emoji in',f);
    }
}
console.log('Total tab emoji fixes:',totalFixed);
