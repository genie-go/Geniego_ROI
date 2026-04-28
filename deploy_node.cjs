const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Step 1: Setup SSH key on remote server using ssh2 module if available
// Alternatively, use a simple approach: write an expect-like script

const PASS = 'vot@Wlroi6!';
const HOST = '1.201.177.46';
const USER = 'root';
const LOCAL_DIST = 'd:/project/GeniegoROI/frontend/dist';
const REMOTE_PATH = '/home/wwwroot/roi.geniego.com/frontend/dist';

// Try to install ssh2 and scp2 for node-based deploy
try {
  require.resolve('ssh2');
} catch {
  console.log('Installing ssh2...');
  execSync('npm install ssh2 --no-save', { cwd: 'd:/project/GeniegoROI', stdio: 'inherit' });
}

const { Client } = require('ssh2');

// First, copy SSH public key to server
const pubKey = fs.readFileSync(path.join(process.env.USERPROFILE, '.ssh', 'id_rsa.pub'), 'utf8').trim();

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({
      host: HOST,
      port: 22,
      username: USER,
      password: PASS,
      readyTimeout: 15000,
    });
  });
}

function execCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => out += d.toString());
      stream.on('close', (code) => resolve({ code, out }));
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function uploadDir(conn, localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      
      const uploadRecursive = async (lDir, rDir) => {
        // Create remote dir
        try { await new Promise((res, rej) => sftp.mkdir(rDir, err => err && err.code !== 4 ? rej(err) : res())); } catch {}
        
        const entries = fs.readdirSync(lDir, { withFileTypes: true });
        for (const entry of entries) {
          const lPath = path.join(lDir, entry.name);
          const rPath = rDir + '/' + entry.name;
          if (entry.isDirectory()) {
            await uploadRecursive(lPath, rPath);
          } else {
            await new Promise((res, rej) => {
              sftp.fastPut(lPath, rPath, err => err ? rej(err) : res());
            });
          }
        }
      };
      
      uploadRecursive(localDir, remoteDir).then(resolve).catch(reject);
    });
  });
}

async function main() {
  console.log('Connecting to server...');
  const conn = await connectSSH();
  console.log('SSH connected!');

  // Setup SSH key auth for future use 
  console.log('Setting up SSH key...');
  const r1 = await execCmd(conn, `mkdir -p ~/.ssh && echo "${pubKey}" >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && sort -u -o ~/.ssh/authorized_keys ~/.ssh/authorized_keys`);
  console.log('SSH key setup:', r1.out || 'OK');
  
  // Clean remote dist
  console.log('Cleaning remote dist...');
  const r2 = await execCmd(conn, `rm -rf ${REMOTE_PATH}/* && mkdir -p ${REMOTE_PATH}`);
  console.log('Clean:', r2.out || 'OK');

  // Upload dist directory
  console.log('Uploading dist files...');
  await uploadDir(conn, LOCAL_DIST, REMOTE_PATH);
  console.log('Upload complete!');

  // Verify
  const r3 = await execCmd(conn, `ls -la ${REMOTE_PATH}/ | head -20`);
  console.log('Remote files:', r3.out);

  conn.end();
  console.log('\n✅ Deployment completed successfully!');
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
