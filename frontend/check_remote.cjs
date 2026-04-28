const {Client}=require('ssh2');
const conn=new Client();
conn.on('ready',()=>{
  conn.exec('grep -o "SKU别仓库库存现况" /home/wwwroot/roi.genie-go.com/frontend/dist/assets/vendor-locales-*.js | head -3 && echo "---" && ls -la /home/wwwroot/roi.genie-go.com/frontend/dist/assets/vendor-locales-*.js',
  (e,s)=>{
    if(e)throw e;
    let o='';s.on('data',d=>o+=d.toString());s.stderr.on('data',d=>o+=d.toString());
    s.on('close',()=>{console.log(o);conn.end();});
  });
}).connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'});
