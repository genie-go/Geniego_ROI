const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // 1. Check which Dashboard chunk is on server
  const dashFile = await ex(c, `ls ${DEMO}/dist/assets/ | grep -i dashboard`);
  console.log('Dashboard chunks on server:\n', dashFile.trim());

  // 2. Check if DashOverview code is in the Dashboard chunk (search for 'roidemo' or 'demoData')
  const dashChunk = dashFile.trim().split('\n')[0]; // First Dashboard file
  console.log('\nSearching for demo code in', dashChunk);

  const hasRoidemo = await ex(c, `grep -c 'roidemo' ${DEMO}/dist/assets/${dashChunk} 2>/dev/null`);
  console.log('  "roidemo" occurrences:', hasRoidemo.trim());

  const hasDemoData = await ex(c, `grep -c 'demoData' ${DEMO}/dist/assets/${dashChunk} 2>/dev/null`);
  console.log('  "demoData" occurrences:', hasDemoData.trim());

  const hasRollupSummary = await ex(c, `grep -c 'rollup/summary' ${DEMO}/dist/assets/${dashChunk} 2>/dev/null`);
  console.log('  "rollup/summary" occurrences:', hasRollupSummary.trim());

  const hasTenantId = await ex(c, `grep -c 'X-Tenant-Id' ${DEMO}/dist/assets/${dashChunk} 2>/dev/null`);
  console.log('  "X-Tenant-Id" occurrences:', hasTenantId.trim());

  // 3. Also check the main index bundle
  const indexFile = await ex(c, `ls ${DEMO}/dist/assets/ | grep '^index-'`);
  console.log('\nIndex bundle:', indexFile.trim());

  const indexHasRoidemo = await ex(c, `grep -c 'roidemo' ${DEMO}/dist/assets/${indexFile.trim().split('\n')[0]} 2>/dev/null`);
  console.log('  Index "roidemo" occurrences:', indexHasRoidemo.trim());

  // 4. Check what the index.html references
  const htmlRefs = await ex(c, `grep -o 'src="[^"]*"' ${DEMO}/dist/index.html`);
  console.log('\nHTML script refs:', htmlRefs.trim());

  // 5. Check nginx response headers for caching
  const headers = await ex(c, `curl -sI 'https://roidemo.genie-go.com/assets/${dashChunk}' -k 2>/dev/null | head -10`);
  console.log('\nNginx response headers:\n', headers.trim());

  c.end();
})();
