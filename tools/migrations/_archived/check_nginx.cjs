const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // 1. Read full nginx config
  const conf = await ex(c, `cat /usr/local/nginx/conf/vhost/roidemo.genie-go.com.conf`);
  console.log('NGINX CONFIG:\n', conf);

  // 2. Check actual document root
  const root = conf.match(/root\s+([^;]+)/);
  console.log('\nDocument root:', root ? root[1] : 'NOT FOUND');

  // 3. Check if assets are accessible via the correct root
  const test = await ex(c, `curl -sI 'http://127.0.0.1/assets/index-mWIeg_kq.js' -H 'Host: roidemo.genie-go.com' 2>/dev/null | head -5`);
  console.log('\nInternal assets test:', test.trim());

  // 4. Check where files actually are
  const tree = await ex(c, `find ${DEMO}/dist -name 'index-mWIeg_kq.js' 2>/dev/null`);
  console.log('index.js location:', tree.trim());

  const tree2 = await ex(c, `find ${DEMO} -name 'Dashboard-CHfqMQdf.js' 2>/dev/null`);
  console.log('Dashboard.js location:', tree2.trim());

  c.end();
})();
