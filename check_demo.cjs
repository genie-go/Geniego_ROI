const {Client}=require('ssh2');
const c=new Client();
c.on('ready',()=>{
  // Fix: the previous deploy created files with backslash in names
  // We need to: 1) ensure assets/ dir exists, 2) move files correctly, 3) clean broken files
  const cmds = [
    // Check current state
    'echo "=== Before fix ==="',
    'ls /home/wwwroot/roidemo.geniego.com/frontend/dist/assets/ 2>&1 | head -3',
    
    // Remove broken backslash-named files and re-create assets dir
    'cd /home/wwwroot/roidemo.geniego.com/frontend/dist',
    'rm -f assets\\\\*',  // remove files with backslash in name
    'mkdir -p assets',
    
    // Also clean on the other demo path
    'cd /home/wwwroot/roidemo.genie-go.com/frontend/dist',
    'rm -f assets\\\\*',
    'mkdir -p assets',
    
    'echo "=== Cleaned ==="',
  ].join(' && ');
  c.exec(cmds,(_,s)=>{
    let d='';
    s.on('data',x=>d+=x);
    s.stderr.on('data',x=>d+=x);
    s.on('close',()=>{console.log(d);c.end()});
  });
}).connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'});
