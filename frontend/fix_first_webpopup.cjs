const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const LANGS=['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
const TAB_VALS={
ko:'AI 디자인',en:'AI Design',ja:'AIデザイン',zh:'AI设计','zh-TW':'AI設計',
es:'Diseño IA',fr:'Design IA',de:'KI-Design',th:'ออกแบบ AI',vi:'Thiết kế AI',
id:'Desain AI',pt:'Design IA',ru:'ИИ-дизайн',ar:'تصميم بالذكاء الاصطناعي',hi:'AI डिज़ाइन'
};
// Strategy: find the FIRST occurrence of "webPopup":{  and inject tabAiDesign right after
LANGS.forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const v=TAB_VALS[lang]||TAB_VALS.en;
  // Find FIRST webPopup
  const first=src.indexOf('"webPopup"');
  if(first===-1)return;
  const braceOpen=src.indexOf('{',first);
  const insertPos=braceOpen+1;
  // Check if first webPopup already has tabAiDesign
  // Find its closing brace
  let depth=1,pos=insertPos;
  while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
  const firstContent=src.substring(insertPos,pos-1);
  if(!firstContent.includes('"tabAiDesign"')){
    src=src.slice(0,insertPos)+'"tabAiDesign":"'+v+'",'+src.slice(insertPos);
    fs.writeFileSync(file,src,'utf8');
    console.log('✅ '+lang+': injected into FIRST webPopup');
  } else {
    console.log('⏭️  '+lang+': already in first webPopup');
  }
});
console.log('Done');
