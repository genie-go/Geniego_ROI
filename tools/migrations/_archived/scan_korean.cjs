const fs = require('fs');
const path = require('path');

function scan(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory() && !fp.includes('i18n') && !fp.includes('data') && !fp.includes('pages_backup') && !fp.includes('node_modules')) {
      scan(fp);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const c = fs.readFileSync(fp, 'utf8');
      const lines = c.split('\n');
      let results = [];
      lines.forEach((l, i) => {
        const trimmed = l.trim();
        // skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        // check for Korean strings in actual code (inside quotes or JSX text)
        if (/[가-힣]{3,}/.test(l) && (/['"`].*[가-힣]{3,}/.test(l) || />[가-힣]{3,}/.test(l))) {
          // exclude fallback strings in t() calls like t('key', '한국어')
          if (!/t\(['"`][\w.]+['"`]\s*,\s*['"`].*[가-힣]/.test(l)) {
            results.push((i + 1) + ': ' + trimmed.substring(0, 100));
          }
        }
      });
      if (results.length > 0) {
        console.log('\n=== ' + fp.replace('frontend/src/', '') + ' (' + results.length + ' lines) ===');
        results.slice(0, 10).forEach(r => console.log('  ' + r));
      }
    }
  });
}

scan('frontend/src');
