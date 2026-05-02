const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected. Fixing Nginx...');
  
  const cmd = [
    // Remove Clear-Site-Data header that causes infinite reload
    "sed -i '/Clear-Site-Data/d' /usr/local/nginx/conf/vhost/roi.genie-go.com.conf",
    // Verify the change
    "grep -c 'Clear-Site-Data' /usr/local/nginx/conf/vhost/roi.genie-go.com.conf || echo 'REMOVED_OK'",
    // Reload nginx
    "/usr/local/nginx/sbin/nginx -s reload",
    "echo 'NGINX_RELOADED'"
  ].join(' && ');
  
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += '[err] ' + d.toString());
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
});

conn.on('error', e => console.error('SSH Error:', e.message));
conn.connect({
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
});
