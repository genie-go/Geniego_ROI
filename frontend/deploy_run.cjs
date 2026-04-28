const {Client} = require('ssh2');
const fs = require('fs');
const path = require('path');

const REMOTE = {host:'1.201.177.46', port:22, username:'root', password:'vot@Wlroi6!'};
const LOCAL_DIST = path.join(__dirname, 'dist');

// Deploy to ALL 3 targets
const TARGETS = [
  '/home/wwwroot/roi.geniego.com/frontend/dist',
  '/home/wwwroot/roi.genie-go.com/frontend/dist',
  '/home/wwwroot/roidemo.genie-go.com/frontend/dist',
];

function walk(dir, base='') {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const rel = base ? base + '/' + f : f;
    if (fs.statSync(full).isDirectory()) results.push(...walk(full, rel));
    else results.push({local: full, rel: rel});
  }
  return results;
}

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected');
  const files = walk(LOCAL_DIST);
  console.log(`${files.length} files to deploy to ${TARGETS.length} targets`);
  
  // Step 1: Clean all targets and create dirs via exec
  const cleanCmds = TARGETS.map(t => `rm -rf ${t}/* && mkdir -p ${t}/assets`).join(' && ');
  conn.exec(cleanCmds + ' && echo CLEANED', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => {
      console.log('All targets cleaned.');
      
      conn.sftp((err, sftp) => {
        if (err) throw err;
        
        // Collect dirs
        const relDirs = new Set();
        files.forEach(f => {
          const parts = f.rel.split('/'); parts.pop();
          let cur = '';
          parts.forEach(p => { cur = cur ? cur+'/'+p : p; relDirs.add(cur); });
        });
        const sortedDirs = [...relDirs].sort();
        
        // Create dirs in all targets
        let dirOps = [];
        for (const target of TARGETS) {
          for (const d of sortedDirs) {
            dirOps.push(target + '/' + d);
          }
        }
        
        let dirIdx = 0;
        function mkdirNext() {
          if (dirIdx >= dirOps.length) { uploadToTargets(); return; }
          sftp.mkdir(dirOps[dirIdx++], () => mkdirNext());
        }
        
        // Upload files to first target, then copy to others via exec
        let fileIdx = 0;
        let uploaded = 0;
        const PRIMARY = TARGETS[0];
        
        function uploadToTargets() {
          console.log('Uploading files to primary target...');
          uploadNext();
        }
        
        function uploadNext() {
          if (fileIdx >= files.length) {
            console.log(`\n${uploaded} files uploaded to primary. Copying to other targets...`);
            // Copy from primary to other targets
            const copyCmds = TARGETS.slice(1).map(t => 
              `cp -rf ${PRIMARY}/* ${t}/`
            ).join(' && ');
            conn.exec(copyCmds + ' && echo ALL_DONE', (err, stream) => {
              if (err) throw err;
              stream.on('data', d => process.stdout.write(d));
              stream.on('close', () => {
                console.log('\n✅ Deployed to all targets!');
                TARGETS.forEach(t => console.log('  → ' + t));
                conn.end();
              });
            });
            return;
          }
          const f = files[fileIdx++];
          sftp.fastPut(f.local, PRIMARY + '/' + f.rel, err => {
            if (err) console.error(`ERR ${f.rel}: ${err.message}`);
            else uploaded++;
            if (uploaded % 20 === 0) process.stdout.write(`  ${uploaded}/${files.length}\r`);
            uploadNext();
          });
        }
        
        mkdirNext();
      });
    });
  });
}).connect(REMOTE);
