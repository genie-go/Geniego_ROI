const fs=require('fs');
const fp=require('path').join(__dirname,'src/pages/PriceOpt.jsx');
let src=fs.readFileSync(fp,'utf8');
// Fix remaining #fff text colors in guide and fee tabs
src=src.replace(/color:\s*['"]#fff['"],\s*marginBottom:\s*6/g,'color: "#1e293b", marginBottom: 6');
src=src.replace(/color:\s*['"]#fff['"],\s*marginBottom:\s*4\s*\}/g,'color: "#1e293b", marginBottom: 4}');
// channelFeeTitle color
src=src.replace(/fontWeight:\s*900,\s*color:\s*['"]#fff['"]/g,'fontWeight: 900, color: "#1e293b"');
// remaining generic #fff for text (not background/border)
const lines=src.split('\n');
let fixCount=0;
for(let i=0;i<lines.length;i++){
  // Only fix color:'#fff' that are for text, not for tab selected state
  if(lines[i].includes("color: '#fff'") && !lines[i].includes('tab ===') && !lines[i].includes('background')){
    // Check context - skip if it's selected tab color
    if(!lines[i].includes('gradient') && !lines[i].includes('Gradient')){
      lines[i]=lines[i].replace(/color:\s*'#fff'/g,"color: '#1e293b'");
      fixCount++;
    }
  }
  if(lines[i].includes('color: "#fff"') && !lines[i].includes('tab ===') && !lines[i].includes('background')){
    if(!lines[i].includes('gradient') && !lines[i].includes('Gradient')){
      lines[i]=lines[i].replace(/color:\s*"#fff"/g,'color: "#1e293b"');
      fixCount++;
    }
  }
}
src=lines.join('\n');
fs.writeFileSync(fp,src,'utf8');
// Count remaining
const remaining=(src.match(/#fff/g)||[]).length;
console.log(`Fixed ${fixCount} lines, remaining #fff: ${remaining}`);
