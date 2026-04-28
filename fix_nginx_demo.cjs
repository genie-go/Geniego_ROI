const { Client } = require('ssh2');

const c = new Client();
c.on('ready', () => {
  const cmd = [
    // Remove Clear-Site-Data line
    "sed -i '/Clear-Site-Data/d' /usr/local/nginx/conf/vhost/roidemo.genie-go.com.conf",
    // Verify removal
    "echo '=== Verify no Clear-Site-Data ==='",
    "grep -c Clear-Site-Data /usr/local/nginx/conf/vhost/roidemo.genie-go.com.conf || echo 'REMOVED OK'",
    // Reload nginx
    "nginx -s reload",
    "echo '=== Nginx reloaded ==='",
    // Show updated config
    "head -25 /usr/local/nginx/conf/vhost/roidemo.genie-go.com.conf"
  ].join(' && ');

  c.exec(cmd, (err, stream) => {
    if (err) { console.error(err); c.end(); return; }
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      c.end();
    });
  });
});
c.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
