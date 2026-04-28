// Remove broken "lang. = Object.assign(lang. || {}, {" blocks from all locale files
const fs=require('fs');
const DIR='src/i18n/locales/';
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.js'));
files.forEach(f=>{
  let src=fs.readFileSync(DIR+f,'utf8');
  const lang=f.replace('.js','');
  // Remove blocks like: ja. = Object.assign(ja. || {}, { ... });
  // Pattern: langCode. = Object.assign(langCode. || {}, { ... });
  const pattern=new RegExp('//[^\\n]*\\n'+lang.replace('-','\\-')+'\\.\\s*=\\s*Object\\.assign\\('+lang.replace('-','\\-')+'\\.\\s*\\|\\|\\s*\\{\\}\\s*,\\s*\\{[^}]*\\}\\);','g');
  const cleaned=src.replace(pattern,'');
  // Also try multiline version
  let result=cleaned;
  // More robust: find "lang. =" pattern and remove until closing ");"
  const badPattern=lang.replace('-','\\-')+'\\.\\s+=\\s+Object\\.assign';
  const regex=new RegExp(badPattern);
  while(regex.test(result)){
    const match=result.match(new RegExp('(//[^\\n]*\\n)?'+badPattern+'[\\s\\S]*?\\}\\);'));
    if(match)result=result.replace(match[0],'');
    else break;
  }
  if(result!==src){fs.writeFileSync(DIR+f,result);console.log(f+': cleaned broken blocks');}
  else console.log(f+': OK');
});
