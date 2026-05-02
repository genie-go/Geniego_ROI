const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected');

  const commands = [
    // 1. Create demo database
    'mysql -uroot -p"qlqjs@Elql3!" -e "CREATE DATABASE IF NOT EXISTS geniego_roi_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1',
    'echo "=== DB Created ==="',

    // 2. Export production schema (structure ONLY, no data)
    'mysqldump -uroot -p"qlqjs@Elql3!" --no-data geniego_roi 2>/dev/null | mysql -uroot -p"qlqjs@Elql3!" geniego_roi_demo 2>&1',
    'echo "=== Schema Migrated ==="',

    // 3. Verify demo DB tables
    'mysql -uroot -p"qlqjs@Elql3!" -e "USE geniego_roi_demo; SHOW TABLES;" 2>&1',
    'echo "=== Demo DB Tables Listed ==="',

    // 4. Copy backend code to demo path
    'mkdir -p /home/wwwroot/roidemo.geniego.com/backend',
    'cp -r /home/wwwroot/roi.geniego.com/backend/src /home/wwwroot/roidemo.geniego.com/backend/src',
    'cp -r /home/wwwroot/roi.geniego.com/backend/public /home/wwwroot/roidemo.geniego.com/backend/public',
    'cp -r /home/wwwroot/roi.geniego.com/backend/data /home/wwwroot/roidemo.geniego.com/backend/data 2>/dev/null || echo "no data dir"',
    'cp /home/wwwroot/roi.geniego.com/backend/composer.json /home/wwwroot/roidemo.geniego.com/backend/',
    'cp /home/wwwroot/roi.geniego.com/backend/composer.lock /home/wwwroot/roidemo.geniego.com/backend/',
    'cp /home/wwwroot/roi.geniego.com/backend/composer.phar /home/wwwroot/roidemo.geniego.com/backend/',
    'echo "=== Backend Copied ==="',

    // 5. Create demo-specific .env (pointing to demo DB)
    'cat > /home/wwwroot/roidemo.geniego.com/backend/.env << EOF\nGENIE_DB_CONNECTION=mysql\nGENIE_DB_HOST=127.0.0.1\nGENIE_DB_PORT=3306\nGENIE_DB_NAME=geniego_roi_demo\nGENIE_DB_USER=root\nGENIE_DB_PASS=qlqjs@Elql3!\nGENIE_DEMO_MODE=true\nEOF',
    'echo "=== Demo .env Created ==="',

    // 6. Install composer deps in demo backend
    'cd /home/wwwroot/roidemo.geniego.com/backend && php composer.phar install --no-dev 2>&1 | tail -5',
    'echo "=== Composer Install Done ==="',

    // 7. Create demo frontend dist directory
    'mkdir -p /home/wwwroot/roidemo.geniego.com/frontend/dist',
    'echo "=== Frontend Dir Ready ==="',

    // 8. Update .user.ini for demo
    'cat > /home/wwwroot/roidemo.geniego.com/.user.ini << EOF\nopen_basedir=/home/wwwroot/roidemo.geniego.com:/tmp/:/proc/\nEOF',
    'echo "=== .user.ini Updated ==="',

    // 9. Set correct permissions
    'chown -R www:www /home/wwwroot/roidemo.geniego.com/',
    'echo "=== Permissions Set ==="',

    // 10. Final verification
    'echo "=== FINAL CHECK ==="',
    'ls -la /home/wwwroot/roidemo.geniego.com/',
    'ls -la /home/wwwroot/roidemo.geniego.com/backend/',
    'cat /home/wwwroot/roidemo.geniego.com/backend/.env',
  ].join(' && ');

  conn.exec(commands, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
});

conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
