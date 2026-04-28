// Fix locale files: restore from clean_src (multi-line format, no corruption)
const fs=require('fs');
const CLEAN='d:/project/GeniegoROI/clean_src/frontend/src/i18n/locales/';
const DIR='src/i18n/locales/';
const avail=['ko','en','ja','zh','zh-TW','th','vi','id','de'];
const missing=['fr','es','pt','ru','ar','hi'];

// Use clean_src files (multi-line, proper JS)
avail.forEach(l=>{fs.copyFileSync(CLEAN+l+'.js',DIR+l+'.js');console.log('Restored: '+l);});
missing.forEach(l=>{fs.copyFileSync(CLEAN+'en.js',DIR+l+'.js');console.log('en->'+l);});
console.log('Done');
