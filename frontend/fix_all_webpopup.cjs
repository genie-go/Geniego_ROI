const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const LANGS=['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
const V={ko:'AI 디자인',en:'AI Design',ja:'AIデザイン',zh:'AI设计','zh-TW':'AI設計',es:'Diseño IA',fr:'Design IA',de:'KI-Design',th:'ออกแบบ AI',vi:'Thiết kế AI',id:'Desain AI',pt:'Design IA',ru:'ИИ-дизайн',ar:'تصميم بالذكاء الاصطناعي',hi:'AI डिज़ाइन'};
LANGS.forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const v=V[lang]||V.en;
  // Find ALL "webPopup":{ occurrences and inject tabAiDesign if missing
  const re=/"webPopup"\s*:\s*\{/g;
  let match,injected=0;
  // Work backwards to avoid index shifting
  const matches=[];
  while((match=re.exec(src))!==null){matches.push(match);}
  for(let i=matches.length-1;i>=0;i--){
    const m=matches[i];
    const insertPos=m.index+m[0].length;
    // Check if this particular webPopup block has tabAiDesign
    let depth=1,pos=insertPos;
    while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
    const content=src.substring(insertPos,pos-1);
    if(!content.includes('"tabAiDesign"')){
      src=src.slice(0,insertPos)+'"tabAiDesign":"'+v+'",'+src.slice(insertPos);
      injected++;
    }
  }
  if(injected>0){
    fs.writeFileSync(file,src,'utf8');
    console.log('✅ '+lang+': injected into '+injected+' webPopup blocks');
  } else {
    console.log('⏭️  '+lang);
  }
});
