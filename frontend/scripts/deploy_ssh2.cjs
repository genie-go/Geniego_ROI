/**
 * SSH2 Deploy Script — Upload dist/ to production server
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    host: '1.201.177.46',
    port: 22,
    username: 'root',
    password: 'vot@Wlroi6!',
    remotePath: '/home/wwwroot/roi.geniego.com/frontend/dist',
};

const LOCAL_DIST = path.join(__dirname, '..', 'dist');

function getAllFiles(dir, base = '') {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.join(base, entry.name);
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getAllFiles(full, rel));
        } else {
            results.push({ local: full, remote: rel.replace(/\\/g, '/') });
        }
    }
    return results;
}

async function deploy() {
    const files = getAllFiles(LOCAL_DIST);
    console.log(`📦 Found ${files.length} files to deploy`);

    const conn = new Client();
    
    return new Promise((resolve, reject) => {
        conn.on('ready', () => {
            console.log('✅ SSH connected');
            
            conn.sftp((err, sftp) => {
                if (err) { reject(err); return; }
                
                // Collect unique directories
                const dirs = new Set();
                for (const f of files) {
                    const parts = f.remote.split('/');
                    for (let i = 1; i <= parts.length - 1; i++) {
                        dirs.add(parts.slice(0, i).join('/'));
                    }
                }
                
                // Create directories first, then upload files
                const sortedDirs = [...dirs].sort();
                
                let dirIdx = 0;
                function mkdirNext() {
                    if (dirIdx >= sortedDirs.length) {
                        uploadFiles();
                        return;
                    }
                    const remoteDir = `${CONFIG.remotePath}/${sortedDirs[dirIdx]}`;
                    dirIdx++;
                    sftp.mkdir(remoteDir, (err) => {
                        // Ignore errors (dir may already exist)
                        mkdirNext();
                    });
                }
                
                let fileIdx = 0;
                let uploaded = 0;
                function uploadFiles() {
                    if (fileIdx >= files.length) {
                        console.log(`\n🎉 Deploy complete! ${uploaded}/${files.length} files uploaded`);
                        conn.end();
                        resolve();
                        return;
                    }
                    
                    const f = files[fileIdx];
                    fileIdx++;
                    const remoteFull = `${CONFIG.remotePath}/${f.remote}`;
                    
                    sftp.fastPut(f.local, remoteFull, (err) => {
                        if (err) {
                            console.error(`  ❌ ${f.remote}: ${err.message}`);
                        } else {
                            uploaded++;
                            if (uploaded % 10 === 0 || uploaded === files.length) {
                                process.stdout.write(`\r  📤 ${uploaded}/${files.length} files uploaded...`);
                            }
                        }
                        uploadFiles();
                    });
                }
                
                mkdirNext();
            });
        });
        
        conn.on('error', (err) => {
            console.error('❌ SSH error:', err.message);
            reject(err);
        });
        
        conn.connect(CONFIG);
    });
}

deploy().catch(err => {
    console.error('Deploy failed:', err.message);
    process.exit(1);
});
