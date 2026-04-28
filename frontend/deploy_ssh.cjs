/**
 * Deploy dist to production and demo servers via SSH/SFTP
 * Uses ssh2 npm module
 * IMPORTANT: Only deploys frontend dist - no data, no demo contamination
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

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
  keepaliveInterval: 5000,
};

const LOCAL_DIST = path.resolve(__dirname, 'dist');

// Key files to deploy (index.html + logo + assets)
function getDeployFiles(dir, base = '') {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const rel = base ? `${base}/${item.name}` : item.name;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...getDeployFiles(full, rel));
    } else {
      results.push({ relative: rel, absolute: full, size: fs.statSync(full).size });
    }
  }
  return results;
}

async function deployToServer(server) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Deploying to ${server.name} (${server.host}:${server.remotePath})`);
  console.log('='.repeat(50));

  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log(`  ✅ Connected to ${server.name}`);
      
      conn.sftp((err, sftp) => {
        if (err) { reject(err); return; }
        
        const files = getDeployFiles(LOCAL_DIST);
        console.log(`  📦 ${files.length} files to deploy`);
        
        let uploaded = 0;
        let failed = 0;
        
        // Create directories first, then upload files
        const dirs = new Set();
        files.forEach(f => {
          const dir = path.dirname(f.relative);
          if (dir && dir !== '.') {
            dirs.add(dir);
          }
        });
        
        // Ensure remote directories exist
        function ensureDirs(callback) {
          const dirList = Array.from(dirs);
          let idx = 0;
          
          function nextDir() {
            if (idx >= dirList.length) { callback(); return; }
            const dir = dirList[idx++];
            const remoteDirPath = `${server.remotePath}/${dir}`;
            sftp.mkdir(remoteDirPath, (err) => {
              // Ignore error if dir already exists
              nextDir();
            });
          }
          nextDir();
        }
        
        ensureDirs(() => {
          // Upload files one by one
          let fileIdx = 0;
          
          function uploadNext() {
            if (fileIdx >= files.length) {
              console.log(`  ✅ Deployed ${uploaded}/${files.length} files (${failed} skipped)`);
              conn.end();
              resolve();
              return;
            }
            
            const file = files[fileIdx++];
            const remotePath = `${server.remotePath}/${file.relative}`.replace(/\\/g, '/');
            const localData = fs.readFileSync(file.absolute);
            
            sftp.writeFile(remotePath, localData, (err) => {
              if (err) {
                console.log(`  ⚠️ Failed: ${file.relative} (${err.message})`);
                failed++;
              } else {
                uploaded++;
                if (uploaded % 10 === 0 || file.relative.includes('index.html') || file.relative.includes('logo')) {
                  console.log(`  📤 ${uploaded}/${files.length} - ${file.relative}`);
                }
              }
              uploadNext();
            });
          }
          
          uploadNext();
        });
      });
    });
    
    conn.on('error', (err) => {
      console.log(`  ❌ Connection error: ${err.message}`);
      reject(err);
    });
    
    conn.connect({
      host: server.host,
      port: 22,
      ...SSH_CONFIG,
    });
  });
}

async function main() {
  console.log('🚀 GenieROI Frontend Deployment');
  console.log(`📁 Local dist: ${LOCAL_DIST}`);
  
  const files = getDeployFiles(LOCAL_DIST);
  console.log(`📦 Total files: ${files.length}`);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`📏 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  for (const server of SERVERS) {
    try {
      await deployToServer(server);
    } catch (err) {
      console.log(`\n❌ Failed to deploy to ${server.name}: ${err.message}`);
    }
  }
  
  console.log('\n🎉 Deployment complete!');
  console.log('Production: https://roi.geniego.com/login');
  console.log('Demo: https://roidemo.genie-go.com/login');
}

main();
