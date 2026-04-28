const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
// Use JS require to load, modify, and re-serialize
const FIXES={
ar:{tabCreative:"الإبداعي",tabGuide:"دليل الاستخدام"},
es:{tabCreative:"Creativo",tabGuide:"Guía de Uso"},
fr:{tabCreative:"Créatif",tabGuide:"Guide"},
de:{tabCreative:"Kreativ",tabGuide:"Anleitung"},
th:{tabCreative:"ครีเอทีฟ",tabGuide:"คู่มือ"},
vi:{tabCreative:"Sáng tạo",tabGuide:"Hướng dẫn"},
id:{tabCreative:"Kreatif",tabGuide:"Panduan"},
pt:{tabCreative:"Criativo",tabGuide:"Guia"},
ru:{tabCreative:"Креатив",tabGuide:"Руководство"},
hi:{tabCreative:"क्रिएटिव",tabGuide:"गाइड"},
"zh-TW":{tabCreative:"創意",tabGuide:"使用指南"},
};
// String replace approach: find FIRST occurrence of tabCreative/tabGuide that comes AFTER "marketing":{
Object.keys(FIXES).forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  let src=fs.readFileSync(file,'utf8');
  const mIdx=src.indexOf('"marketing"');
  if(mIdx===-1)return;
  const keys=FIXES[lang];
  Object.entries(keys).forEach(([k,v])=>{
    // Find first occurrence of "tabCreative":" AFTER marketing position
    const searchFrom=mIdx;
    const keyStr='"'+k+'":"';
    let i=src.indexOf(keyStr,searchFrom);
    if(i===-1)return;
    const valStart=i+keyStr.length;
    let valEnd=valStart;
    // Find closing quote (handle escaped quotes)
    while(valEnd<src.length){
      if(src[valEnd]==='"'&&src[valEnd-1]!=='\\')break;
      valEnd++;
    }
    const oldVal=src.substring(valStart,valEnd);
    if(oldVal===v)return;
    src=src.substring(0,valStart)+v+src.substring(valEnd);
    console.log(lang+'.'+k+': "'+oldVal+'" -> "'+v+'"');
  });
  fs.writeFileSync(file,src,'utf8');
});
console.log('Done');
