/**
 * Production Deployment Script via SSH2
 * Deploys frontend/dist to remote server with strict data isolation.
 * 
 * SAFETY: Only deploys static frontend assets (HTML/JS/CSS).
 * No database operations. No backend changes. No demo data.
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 30000,
};

const LOCAL_DIST = path.join(__dirname, 'frontend', 'dist');
const REMOTE_PATH = '/home/wwwroot/roi.geniego.com/frontend/dist';

// Collect all files in dist
function walkSync(dir, base = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSync(full, rel));
    } else {
      results.push({ rel, full, size: fs.statSync(full).size });
    }
  }
  return results;
}

async function deploy() {
  console.log('=== PRODUCTION DEPLOYMENT ===');
  console.log(`Local:  ${LOCAL_DIST}`);
  console.log(`Remote: ${CONFIG.host}:${REMOTE_PATH}`);
  
  if (!fs.existsSync(LOCAL_DIST)) {
    console.error('ERROR: dist directory not found!');
    process.exit(1);
  }
  
  const files = walkSync(LOCAL_DIST);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  console.log(`Files: ${files.length} (${(totalSize / 1024 / 1024).toFixed(1)} MB)\n`);
  
  // Connect
  const conn = new Client();
  
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('SSH connected.\n');
      
      conn.sftp((err, sftp) => {
        if (err) { reject(err); return; }
        
        // Step 1: Clean remote dist/assets directory
        console.log('Step 1: Cleaning remote assets...');
        conn.exec(`rm -rf ${REMOTE_PATH}/assets && mkdir -p ${REMOTE_PATH}/assets`, (err, stream) => {
          if (err) { reject(err); return; }
          
          stream.on('close', async () => {
            console.log('Remote assets cleaned.\n');
            
            // Step 2: Create remote directories
            console.log('Step 2: Creating directories...');
            const dirs = new Set();
            files.forEach(f => {
              const d = path.dirname(f.rel).replace(/\\/g, '/');
              if (d !== '.') dirs.add(d);
            });
            
            for (const dir of dirs) {
              try {
                await new Promise((res, rej) => {
                  conn.exec(`mkdir -p ${REMOTE_PATH}/${dir}`, (err, stream) => {
                    if (err) { rej(err); return; }
                    stream.on('close', res);
                    stream.resume();
                  });
                });
              } catch (e) {
                console.log(`  mkdir warn: ${dir}`);
              }
            }
            console.log(`Created ${dirs.size} directories.\n`);
            
            // Step 3: Upload files
            console.log('Step 3: Uploading files...');
            let uploaded = 0;
            let errors = 0;
            
            for (const file of files) {
              const remotePath = `${REMOTE_PATH}/${file.rel.replace(/\\/g, '/')}`;
              try {
                await new Promise((res, rej) => {
                  const readStream = fs.createReadStream(file.full);
                  const writeStream = sftp.createWriteStream(remotePath);
                  
                  writeStream.on('close', () => {
                    uploaded++;
                    if (uploaded % 10 === 0 || uploaded === files.length) {
                      process.stdout.write(`  ${uploaded}/${files.length} files uploaded\r`);
                    }
                    res();
                  });
                  
                  writeStream.on('error', (e) => {
                    console.log(`  ERROR: ${file.rel}: ${e.message}`);
                    errors++;
                    res(); // continue despite error
                  });
                  
                  readStream.pipe(writeStream);
                });
              } catch (e) {
                console.log(`  FAIL: ${file.rel}`);
                errors++;
              }
            }
            
            console.log(`\n\nStep 4: Verification...`);
            conn.exec(`ls -la ${REMOTE_PATH}/ && echo "---" && ls -la ${REMOTE_PATH}/assets/ | head -10`, (err, stream) => {
              if (err) { reject(err); return; }
              let output = '';
              stream.on('data', d => output += d.toString());
              stream.on('close', () => {
                console.log(output);
                console.log(`\n========================================`);
                console.log(`DEPLOYMENT COMPLETE`);
                console.log(`Uploaded: ${uploaded} files`);
                console.log(`Errors: ${errors}`);
                console.log(`========================================\n`);
                
                conn.end();
                resolve();
              });
            });
          });
          
          stream.resume();
        });
      });
    });
    
    conn.on('error', (err) => {
      console.error('SSH error:', err.message);
      reject(err);
    });
    
    console.log('Connecting to server...');
    conn.connect(CONFIG);
  });
}

deploy().catch(e => { console.error('Deploy failed:', e.message); process.exit(1); });
