const { Client } = require('ssh2');
const CFG = { host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' };

const cmds = [
  'grep -A5 "roi.genie-go.com" /usr/local/nginx/conf/nginx.conf | head -20',
  'echo "---"',
  'grep "root " /usr/local/nginx/conf/nginx.conf | head -10',
  'echo "---"',
  // Also check if there are vhosts
  'ls /usr/local/nginx/conf/vhost/ 2>/dev/null || echo "no vhost dir"',
  'echo "---"',
  'grep -rn "roi.genie-go" /usr/local/nginx/conf/ 2>/dev/null | head -10',
].join(' ; ');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmds, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(CFG);
