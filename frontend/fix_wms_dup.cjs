// CRITICAL FIX: Remove duplicate flat "wms" key that overwrites the wms translation object
// Also rename sidebar.wms to sidebar.wmsMenu in all files
const fs=require('fs'),path=require('path'),D=path.join(__dirname,'src/i18n/locales');
const locales=['ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','th','vi','id','ko','en'];

locales.forEach(l=>{
    const fp=path.join(D,l+'.js');
    let c=fs.readFileSync(fp,'utf8');
    
    // Find all occurrences of "wms" in the raw JSON
    let positions=[];
    let p=0;
    while(true){
        p=c.indexOf('"wms"',p);
        if(p===-1)break;
        // Check what follows: ":" then "{" means object, ":" then '"' means string
        const after=c.substring(p+5,p+10).trim();
        const isString = after.startsWith(':') && c.substring(p+5).trim().charAt(1)==='"';
        const isObject = after.startsWith(':') && c.substring(p+5).trim().charAt(1)==='{';
        positions.push({pos:p,isString,isObject,ctx:c.substring(p+6,p+50)});
        p+=5;
    }
    
    // Count objects vs strings
    const objs=positions.filter(x=>x.isObject);
    const strs=positions.filter(x=>x.isString);
    
    if(strs.length>0 && objs.length>0){
        console.log(l+': FOUND CONFLICT - '+objs.length+' object(s) + '+strs.length+' string(s)');
        // Remove the flat string "wms":"..." by replacing with "wmsMenu":"..."
        // Process from last to first to maintain positions
        strs.reverse().forEach(s=>{
            const before=c.substring(0,s.pos);
            const after=c.substring(s.pos+5);
            c=before+'"wmsMenu"'+after;
            console.log('  Fixed: renamed flat "wms" to "wmsMenu" at pos '+s.pos);
        });
        fs.writeFileSync(fp,c);
    } else if(strs.length>0 && objs.length===0){
        console.log(l+': ONLY string wms - checking if wms object was lost');
    } else {
        console.log(l+': OK ('+objs.length+' object, '+strs.length+' string)');
    }
});

// Verify the fix
console.log('\n--- Verification ---');
locales.forEach(l=>{
    const fp=path.join(D,l+'.js');
    const c=fs.readFileSync(fp,'utf8');
    const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    try{
        const obj=eval('('+m[1]+')');
        const wmsType=typeof obj.wms;
        const wmsKeys=wmsType==='object'?Object.keys(obj.wms).length:0;
        console.log(l+': wms='+wmsType+' ('+wmsKeys+' keys), wmsMenu='+(obj.wmsMenu||'N/A'));
    }catch(e){
        console.log(l+': PARSE ERROR - '+e.message.slice(0,80));
    }
});
