const {execSync}=require('child_process');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  try{
    // Redirect stdout to nul, only capture stderr
    execSync(`npx acorn --ecma2020 --module frontend/src/i18n/locales/${lang}.js > nul`,{
      cwd:__dirname,
      stdio:['pipe','pipe','pipe'],
      timeout:15000
    });
    console.log(`✅ ${lang}: syntax OK`);
  }catch(e){
    const stderr=(e.stderr||'').toString().trim();
    console.log(`❌ ${lang}: ${stderr.substring(0,80)}`);
  }
});

// If all OK, try build
console.log('\nBuilding...');
try{
  execSync('npm run build',{cwd:require('path').join(__dirname,'frontend'),timeout:120000,stdio:'inherit'});
}catch(e){
  console.log('Build ended');
}
