const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const FIXES={
ar:{tabCreative:"الإبداعي",tabGuide:"دليل الاستخدام"},
es:{tabCreative:"Creativo",tabGuide:"Guía de Uso"},
fr:{tabCreative:"Créatif",tabGuide:"Guide d'utilisation"},
de:{tabCreative:"Kreativ",tabGuide:"Anleitung"},
th:{tabCreative:"ครีเอทีฟ",tabGuide:"คู่มือ"},
vi:{tabCreative:"Sáng tạo",tabGuide:"Hướng dẫn"},
id:{tabCreative:"Kreatif",tabGuide:"Panduan"},
pt:{tabCreative:"Criativo",tabGuide:"Guia"},
ru:{tabCreative:"Креатив",tabGuide:"Руководство"},
hi:{tabCreative:"क्रिएटिव",tabGuide:"गाइड"},
"zh-TW":{tabCreative:"創意",tabGuide:"使用指南"},
};
// Replace ALL occurrences of duplicate keys within marketing namespace  
Object.keys(FIXES).forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  let src=fs.readFileSync(file,'utf8');
  const keys=FIXES[lang];
  let changed=false;
  Object.entries(keys).forEach(([k,v])=>{
    // Replace ALL "tabCreative":"..." patterns globally  
    const re=new RegExp('"'+k+'"\\s*:\\s*"[^"]*"','g');
    const newVal='"'+k+'":"'+v+'"';
    const newSrc=src.replace(re,newVal);
    if(newSrc!==src){
      const count=(src.match(re)||[]).length;
      console.log(lang+'.'+k+': replaced '+count+' occurrences');
      src=newSrc;
      changed=true;
    }
  });
  if(changed)fs.writeFileSync(file,src,'utf8');
});
console.log('Done');
