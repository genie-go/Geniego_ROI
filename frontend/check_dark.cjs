const fs=require('fs');
const src=fs.readFileSync('src/pages/PriceOpt.jsx','utf8');
['#0f172a','#0d1117','#1c2842','var(--bg-1','var(--surface','var(--text-2'].forEach(p=>{
  const c=(src.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
  if(c>0) console.log(p+': '+c);
});
console.log('Lines:',src.split('\n').length);
