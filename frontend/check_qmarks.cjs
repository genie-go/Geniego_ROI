const fs=require('fs'),p=require('path'),D=p.join(__dirname,'src/i18n/locales');
['ja','zh','zh-TW','es','fr','de','pt','ru','th','ar','hi','vi','id'].forEach(l=>{
    const c=fs.readFileSync(p.join(D,l+'.js'),'utf8');
    // Find values that are literally question marks
    const matches=[];
    const regex=/"([^"]+)":"(\?+[^"]*?)"/g;
    let m;
    while(m=regex.exec(c)){
        if(m[2].includes('???'))matches.push(m[1]+'='+m[2]);
    }
    if(matches.length>0){
        console.log(l+': '+matches.length+' keys with literal ???');
        matches.slice(0,5).forEach(x=>console.log('  '+x));
        if(matches.length>5)console.log('  ...and '+(matches.length-5)+' more');
    } else {
        console.log(l+': OK - no ??? found');
    }
});
