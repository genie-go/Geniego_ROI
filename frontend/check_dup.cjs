// Check for duplicate keys WITHIN the wms object in each locale
const fs=require('fs'),path=require('path'),D=path.join(__dirname,'src/i18n/locales');
['ja','zh','zh-TW','th','vi','id','de','es','fr','pt','ru','ar','hi'].forEach(l=>{
    const c=fs.readFileSync(path.join(D,l+'.js'),'utf8');
    // Find the wms object boundaries
    const wmsStart=c.indexOf('"wms":{');
    if(wmsStart===-1){console.log(l+': NO wms object found!'); return;}
    
    // Find the matching closing brace
    let depth=0, end=0;
    for(let i=wmsStart+6;i<c.length;i++){
        if(c[i]==='{')depth++;
        if(c[i]==='}'){if(depth===0){end=i;break;}depth--;}
    }
    const wmsStr=c.substring(wmsStart+6,end+1);
    
    // Count occurrences of invColProduct within the wms object
    let count=0, p=0;
    while(true){
        p=wmsStr.indexOf('invColProduct',p);
        if(p===-1)break;
        count++;
        const val=wmsStr.substring(p+15,p+50);
        console.log(l+' invColProduct #'+count+': '+val);
        p+=14;
    }
    if(count===0) console.log(l+': invColProduct NOT in wms object!');
});
