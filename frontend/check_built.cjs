// Import the built vendor-locales and check if Japanese wms.invColProduct is correct
const c=require('fs').readFileSync('dist/assets/vendor-locales-C1KigD_7.js','utf8');

// Find the ja module export
// In vendor-locales, each locale is a separate module with a variable name
// Let's look for the pattern: invColProduct:"商品名" (Japanese)
const jaInvIdx=c.indexOf('invColProduct:"商品名"');
console.log('Japanese invColProduct at:', jaInvIdx);
if(jaInvIdx>-1){
    // Check what's around it
    console.log('Context before:',c.substring(jaInvIdx-80,jaInvIdx));
    console.log('---');
    console.log('Context after:',c.substring(jaInvIdx,jaInvIdx+100));
}

// Also search for Korean invColProduct
const koInvIdx=c.indexOf('invColProduct:"상품명"');
console.log('\nKorean invColProduct at:', koInvIdx);
if(koInvIdx>-1){
    console.log('Context before:',c.substring(koInvIdx-80,koInvIdx));
}

// Check how many separate locale modules exist
const modulePattern = /export\s*\{/g;
let mCount=0;
while(modulePattern.exec(c)){mCount++;}
console.log('\nExport count in vendor-locales:', mCount);
