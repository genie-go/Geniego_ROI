const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'frontend/src/i18n/locales/ko.js');
const code=fs.readFileSync(file,'utf8');

// Write as a proper ESM file using file:// URL
const tmpFile=path.join(__dirname,'frontend','_tmp_check.mjs');
fs.writeFileSync(tmpFile,code);

const {pathToFileURL}=require('url');
import(pathToFileURL(tmpFile).href).then(m=>{
  console.log('✅ OK!',Object.keys(m.default).length);
  fs.unlinkSync(tmpFile);
}).catch(e=>{
  console.log('❌ Error:');
  console.log(e.message);
  // The error message should include line/column info
  const stack=e.stack||'';
  console.log(stack.substring(0,500));
  fs.unlinkSync(tmpFile);
});
