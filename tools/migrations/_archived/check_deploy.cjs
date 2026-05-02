const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // Check what happened
  const ls1 = await ex(c, `ls -la ${DEMO}/dist/ 2>&1 | head -20`);
  console.log('dist contents:\n', ls1);

  const ls2 = await ex(c, `ls -la ${DEMO}/dist_old/ 2>&1 | head -10`);
  console.log('dist_old contents:\n', ls2);

  // Check if zip was extracted correctly (maybe it created an extra dir)
  const find = await ex(c, `find ${DEMO}/dist -name 'index.html' 2>&1 | head -5`);
  console.log('index.html location:', find);

  // Check tmp file
  const tmp = await ex(c, `ls -la /tmp/demo_dist.* 2>&1`);
  console.log('tmp files:', tmp);

  // Fix: If dist_old has the good content, restore it  
  if (ls2.includes('index.html') || ls2.includes('assets')) {
    console.log('Restoring from dist_old...');
    await ex(c, `rm -rf ${DEMO}/dist && mv ${DEMO}/dist_old ${DEMO}/dist`);
    console.log('Restored!');
  }

  // Try unzipping properly
  console.log('\nRe-trying zip extraction...');
  await ex(c, `cd ${DEMO} && rm -rf dist_new && mkdir -p dist_new && cd dist_new && unzip -o /tmp/demo_dist.zip 2>&1 | tail -5`);
  const ls3 = await ex(c, `ls -la ${DEMO}/dist_new/ | head -15`);
  console.log('dist_new after unzip:\n', ls3);

  // Find index.html
  const find2 = await ex(c, `find ${DEMO}/dist_new -name 'index.html' 2>&1`);
  console.log('index.html in dist_new:', find2);

  c.end();
})();
