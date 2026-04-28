const {Client}=require('ssh2');
const conn=new Client();
conn.on('ready',()=>{
  const cmds=[
    // Check index.html references
    'echo "=== INDEX.HTML ===" && grep -o "vendor-locales-[^.]*\\.js" /home/wwwroot/roi.genie-go.com/frontend/dist/index.html',
    // Check if Chinese invColProduct exists in the locale file
    'echo "=== ZH invColProduct ===" && grep -c "invColProduct" /home/wwwroot/roi.genie-go.com/frontend/dist/assets/vendor-locales-*.js',
    // Check the actual Chinese inventory text
    'echo "=== ZH invTableTitle ===" && grep -o "SKU别仓库库存现况" /home/wwwroot/roi.genie-go.com/frontend/dist/assets/vendor-locales-*.js | head -1',
    // Check .htaccess for caching rules
    'echo "=== HTACCESS ===" && cat /home/wwwroot/roi.genie-go.com/frontend/dist/.htaccess 2>/dev/null || echo "no htaccess"',
    // Check index.html modification time
    'echo "=== INDEX MTIME ===" && stat -c "%Y %n" /home/wwwroot/roi.genie-go.com/frontend/dist/index.html',
    // Check if there are multiple vendor-locales files
    'echo "=== LOCALE FILES ===" && ls -la /home/wwwroot/roi.genie-go.com/frontend/dist/assets/vendor-locales-*.js',
  ];
  let i=0;
  function next(){
    if(i>=cmds.length){conn.end();return;}
    conn.exec(cmds[i++],(e,s)=>{
      if(e){console.error(e);next();return;}
      let o='';s.on('data',d=>o+=d.toString());s.stderr.on('data',d=>o+=d.toString());
      s.on('close',()=>{console.log(o);next();});
    });
  }
  next();
}).connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'});
