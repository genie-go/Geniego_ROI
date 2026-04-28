// Create dist.tar.gz from the dist directory and deploy
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const DIST_DIR = path.join(__dirname, 'dist');
const LOCAL_TAR = 'C:/Users/user00/AppData/Local/Temp/dist.tar.gz';

// Step 1: Create tar.gz using PowerShell's Compress-Archive workaround
// Actually use 7zip or a tar library - let's use archiver
let archiver;
try {
  archiver = require('archiver');
} catch {
  console.log('Installing archiver...');
  execSync('npm install archiver --no-save', { cwd: __dirname, stdio: 'inherit' });
  archiver = require('archiver');
}

console.log('[0/4] Creating dist.tar.gz...');
const output = fs.createWriteStream(LOCAL_TAR);
const archive = archiver('tar', { gzip: true });

output.on('close', () => {
  console.log(`[1/4] Archive created: ${(archive.pointer() / 1024 / 1024).toFixed(1)} MB`);
  
  // Step 2: Deploy via SSH
  const CFG = {
    host: '1.201.177.46', port: 22,
    username: 'root', password: 'vot@Wlroi6!',
  };
  const REMOTE_TMP = '/tmp/dist_deploy.tar.gz';
  const TARGETS = [
    '/home/wwwroot/roi.geniego.com/frontend/dist',
    '/home/wwwroot/roi.genie-go.com/frontend/dist',
    '/home/wwwroot/roidemo.genie-go.com/frontend/dist',
    '/home/wwwroot/roidemo.geniego.com/frontend/dist',
  ];

  const conn = new Client();
  conn.on('ready', () => {
    console.log('[2/4] Connected. Uploading...');
    conn.sftp((err, sftp) => {
      if (err) { console.error(err); process.exit(1); }
      const rs = fs.createReadStream(LOCAL_TAR);
      const ws = sftp.createWriteStream(REMOTE_TMP);
      ws.on('close', () => {
        console.log('[3/4] Upload done. Extracting to all targets...');
        const cmds = TARGETS.map(t =>
          `mkdir -p ${t} && rm -rf ${t}/* && tar -xzf ${REMOTE_TMP} -C ${t}/`
        ).join(' && ');
        const fullCmd = cmds + ` && rm ${REMOTE_TMP} && echo ALL_DEPLOY_OK`;
        conn.exec(fullCmd, (e2, stream) => {
          if (e2) { console.error(e2); process.exit(1); }
          stream.on('data', d => process.stdout.write(d));
          stream.stderr.on('data', d => process.stderr.write(d));
          stream.on('close', code => {
            console.log(`[4/4] Done (exit ${code})`);
            conn.end(); process.exit(code || 0);
          });
        });
      });
      ws.on('error', e => { console.error(e); process.exit(1); });
      rs.pipe(ws);
    });
  }).connect(CFG);
});

archive.on('error', err => { throw err; });
archive.pipe(output);
archive.directory(DIST_DIR, false);
archive.finalize();
