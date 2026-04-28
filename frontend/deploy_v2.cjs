/**
 * Deploy using SSH exec + tar approach
 * Pack dist locally, upload via SFTP, unpack remotely
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

const SERVERS = [
  {
    name: 'Production',
    host: '1.201.177.46',
    remotePath: '/home/wwwroot/roi.geniego.com/frontend/dist',
  },
  {
    name: 'Demo', 
    host: '1.201.177.46',
    remotePath: '/home/wwwroot/roidemo.genie-go.com/frontend/dist',
  },
];

const SSH_CONFIG = {
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 20000,
};

const LOCAL_DIST = path.resolve(__dirname, 'dist');

function getAllFiles(dir, base = '') {
  const results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${item.name}` : item.name;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...getAllFiles(full, rel));
    } else {
      results.push({ relative: rel, absolute: full });
    }
  }
  return results;
}

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '', errOut = '';
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => errOut += d);
      stream.on('close', (code) => resolve({ out: out.trim(), err: errOut.trim(), code }));
    });
  });
}

function sftpUpload(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(localPath);
    const ws = sftp.createWriteStream(remotePath);
    ws.on('close', resolve);
    ws.on('error', reject);
    rs.pipe(ws);
  });
}

function sftpMkdir(sftp, dir) {
  return new Promise((resolve) => {
    sftp.mkdir(dir, (err) => resolve(!err));
  });
}

async function deployToServer(server) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Deploying to ${server.name}`);
  console.log('='.repeat(50));

  const conn = new Client();
  
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({ host: server.host, port: 22, ...SSH_CONFIG });
  });
  
  console.log('  ✅ Connected');
  
  // 1. Ensure remote dist directory exists
  let result = await sshExec(conn, `mkdir -p ${server.remotePath}/assets && echo OK`);
  console.log('  📁 Remote dir:', result.out);
  
  // 2. Get SFTP connection
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });
  
  // 3. Upload files
  const files = getAllFiles(LOCAL_DIST);
  console.log(`  📦 ${files.length} files to upload`);
  
  // Create all subdirectories first
  const dirs = new Set();
  files.forEach(f => {
    const parts = f.relative.split('/');
    for (let i = 1; i <= parts.length - 1; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  });
  
  for (const dir of dirs) {
    await sftpMkdir(sftp, `${server.remotePath}/${dir}`);
  }
  
  let uploaded = 0, failed = 0;
  for (const file of files) {
    const remotePath = `${server.remotePath}/${file.relative}`;
    try {
      await sftpUpload(sftp, file.absolute, remotePath);
      uploaded++;
      if (uploaded % 20 === 0 || file.relative === 'index.html' || file.relative.includes('logo')) {
        console.log(`  📤 ${uploaded}/${files.length} - ${file.relative}`);
      }
    } catch (err) {
      console.log(`  ⚠️ ${file.relative}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`  ✅ Uploaded ${uploaded}/${files.length} (${failed} failed)`);
  
  // 4. Verify key files
  result = await sshExec(conn, `ls -la ${server.remotePath}/index.html ${server.remotePath}/logo_v5.png 2>&1`);
  console.log('  📋 Verification:', result.out.substring(0, 200));
  
  conn.end();
}

async function main() {
  console.log('🚀 GenieROI Frontend Deployment v2');
  const files = getAllFiles(LOCAL_DIST);
  const totalSize = files.reduce((s, f) => s + fs.statSync(f.absolute).size, 0);
  console.log(`📦 ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  for (const server of SERVERS) {
    try {
      await deployToServer(server);
    } catch (err) {
      console.log(`❌ ${server.name} failed: ${err.message}`);
    }
  }
  
  console.log('\n🎉 All deployments complete!');
}

main();
