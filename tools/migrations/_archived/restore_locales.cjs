/**
 * Reconstruct de, th, id locale files from English + bundle extracted values
 * Since we can't find these 3 locales as standalone objects in the bundle,
 * we'll clone the English structure and fill in translations from the bundle
 */
const { Client } = require('ssh2');
const fs = require('fs');
const vm = require('vm');

const LOCAL_BUNDLE = 'd:/project/GeniegoROI/_server_bundle.js';
const LOCALE_DIR = 'd:/project/GeniegoROI/frontend/src/i18n/locales/';

async function main() {
  // Re-download if needed
  if (!fs.existsSync(LOCAL_BUNDLE)) {
    const conn = new (require('ssh2').Client)();
    await new Promise((res, rej) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) return rej(err);
          sftp.fastGet('/home/wwwroot/roi.geniego.com/frontend/dist/assets/index-Dic5r2_z.js', LOCAL_BUNDLE, err => {
            conn.end();
            err ? rej(err) : res();
          });
        });
      });
      conn.on('error', rej);
      conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!', readyTimeout: 15000 });
    });
  }

  const bundle = fs.readFileSync(LOCAL_BUNDLE, 'utf8');
  
  // Load English locale as template
  const enContent = fs.readFileSync(LOCALE_DIR + 'en.js', 'utf8');
  const enObj = eval('(' + enContent.replace('export default', '') .replace(/;\s*$/, '') + ')');
  
  // Extract ALL key-value pairs from bundle for each target language
  // German markers in bundle
  const LANG_SEARCH = {
    'de': {
      markers: ['Übersicht', 'Gesamtbudget', 'Kampagne', 'bereits', 'Bereit', 'Ergebnis', 'Daten'],
      script: /[äöüÄÖÜß]/
    },
    'th': {
      markers: ['แดชบอร์ด', 'แคมเปญ', 'งบประมาณ', 'ข้อมูล', 'การตั้งค่า'],
      script: /[\u0E01-\u0E3A\u0E40-\u0E5B]/
    },
    'id': {
      markers: ['Manajemen', 'Anggaran', 'Ikhtisar', 'Pengaturan', 'Kampanye'],
      script: null
    }
  };

  // For each missing language, search bundle for its specific object
  // try larger extraction: find 9 large objects that look like locale data
  
  // Search for ALL assignments of large objects (>50KB)
  const allObjs = [];
  let searchStart = 0;
  
  // Find all { that are at object-literal depth by tracking nearby keywords
  const regex2 = /([A-Za-z_$][A-Za-z0-9_$]{0,3})=\{/g;
  let m2;
  while ((m2 = regex2.exec(bundle)) !== null) {
    const objStart = m2.index + m2[1].length + 1;
    // Quick check: does this object start with a known locale key?
    const peek = bundle.substring(objStart, objStart + 100);
    if (peek.includes('dataProduct') || peek.includes('heroTitle') || peek.includes('sidebar')) {
      allObjs.push({ varName: m2[1], start: objStart });
    }
  }
  
  console.log(`Found ${allObjs.length} obj assignments with locale-like keys`);
  
  function extractObj(src, start) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < src.length; i++) {
      if (esc) { esc = false; continue; }
      if (src[i] === '\\' && inStr) { esc = true; continue; }
      if (src[i] === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (src[i] === '{') depth++;
        if (src[i] === '}') { depth--; if (depth === 0) return src.substring(start, i + 1); }
      }
    }
    return null;
  }
  
  const found = new Map();
  
  for (const obj of allObjs) {
    const extracted = extractObj(bundle, obj.start);
    if (!extracted || extracted.length < 50000) continue;
    
    const sample = extracted.substring(0, 5000);
    
    for (const [lang, cfg] of Object.entries(LANG_SEARCH)) {
      if (found.has(lang)) continue;
      
      const markerHits = cfg.markers.filter(m => sample.includes(m)).length;
      const scriptHit = cfg.script ? cfg.script.test(sample) : false;
      
      if (markerHits >= 2 || (markerHits >= 1 && scriptHit)) {
        console.log(`✅ ${lang}: ${obj.varName}, ${extracted.length} chars, markers: ${markerHits}`);
        fs.writeFileSync(LOCALE_DIR + lang + '.js', `export default ${extracted};\n`, 'utf8');
        found.set(lang, true);
      }
    }
  }
  
  // Special: if Thai has unique Unicode range, search more broadly
  for (const obj of allObjs) {
    const extracted = extractObj(bundle, obj.start);
    if (!extracted || extracted.length < 50000) continue;
    
    if (!found.has('th') && /[\u0E01-\u0E3A]/.test(extracted.substring(0, 2000))) {
      console.log(`✅ th (by Thai Unicode): ${extracted.length} chars`);
      fs.writeFileSync(LOCALE_DIR + 'th.js', `export default ${extracted};\n`, 'utf8');
      found.set('th', true);
    }
    if (!found.has('id') && extracted.includes('Anggaran') && extracted.includes('Manajemen')) {
      console.log(`✅ id (by Indonesian): ${extracted.length} chars`);
      fs.writeFileSync(LOCALE_DIR + 'id.js', `export default ${extracted};\n`, 'utf8');
      found.set('id', true);
    }
    if (!found.has('de') && (extracted.includes('Bereit') || extracted.includes('Zusammenfassung'))) {
      console.log(`✅ de (by German): ${extracted.length} chars`);
      fs.writeFileSync(LOCALE_DIR + 'de.js', `export default ${extracted};\n`, 'utf8');
      found.set('de', true);
    }
  }
  
  console.log('\nStill missing:', ['de','th','id'].filter(l => !found.has(l)).join(', ') || 'none');
  
  // If still missing, use en.js as base
  for (const lang of ['de','th','id']) {
    if (!found.has(lang)) {
      console.log(`⚠️ ${lang}: copying en.js as fallback`);
      const enFile = fs.readFileSync(LOCALE_DIR + 'en.js', 'utf8');
      fs.writeFileSync(LOCALE_DIR + lang + '.js', enFile, 'utf8');
    }
  }
  
  // Final verify
  console.log('\nFinal verification:');
  for (const f of ['ko.js','en.js','ja.js','zh.js','zh-TW.js','de.js','vi.js','th.js','id.js']) {
    const content = fs.readFileSync(LOCALE_DIR + f, 'utf8');
    const nodeC = content.replace('export default', 'module.exports =');
    try {
      new vm.Script(nodeC);
      console.log(`✅ ${f}: OK (${content.length})`);
    } catch(e) {
      console.log(`❌ ${f}: ${e.message.slice(0,80)}`);
    }
  }
  
  try { fs.unlinkSync(LOCAL_BUNDLE); } catch {}
}

main().catch(console.error);
