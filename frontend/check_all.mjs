import { parse } from 'acorn';
import { readFileSync, readdirSync } from 'fs';
const DIR = 'src/i18n/locales/';
const files = readdirSync(DIR).filter(f=>f.endsWith('.js'));
let ok=0,fail=0;
files.forEach(f=>{
  try{parse(readFileSync(DIR+f,'utf8'),{ecmaVersion:2020,sourceType:'module'});ok++;console.log(f+': OK');}
  catch(e){fail++;console.log(f+': ERR pos '+e.pos+' '+e.message.substring(0,50));}
});
console.log('\n'+ok+' OK, '+fail+' FAIL');
