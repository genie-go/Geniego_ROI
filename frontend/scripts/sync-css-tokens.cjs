/**
 * sync-css-tokens.cjs - 56ch Track B
 * Read tokens.js (SSoT) and update styles.css :root block
 * with arctic_white (defaultTheme) values as static fallback.
 *
 * Usage: node scripts/sync-css-tokens.cjs
 */
const fs = require('fs');
const path = require('path');

const TOKENS_PATH = path.join(__dirname, '..', 'src', 'theme', 'tokens.js');
const STYLES_PATH = path.join(__dirname, '..', 'src', 'styles.css');
const DEFAULT_THEME = 'arctic_white';

function parseThemeBlock(source, themeName) {
  const re = new RegExp(themeName + '\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\}', 'm');
  const m = source.match(re);
  if (!m) throw new Error('theme block not found: ' + themeName);
  const body = m[1];
  const vars = {};
  const lineRe = /"(--[a-zA-Z0-9-]+)"\s*:\s*"([^"]+)"/g;
  let lm;
  while ((lm = lineRe.exec(body)) !== null) {
    vars[lm[1]] = lm[2];
  }
  return vars;
}

function patchRootBlock(stylesSrc, vars) {
  const rootRe = /(:root\s*\{)([\s\S]*?)(\n\})/m;
  const m = stylesSrc.match(rootRe);
  if (!m) throw new Error(':root block not found in styles.css');
  let body = m[2];
  let patched = 0;
  for (const [k, v] of Object.entries(vars)) {
    const lineRe = new RegExp('(\\s+)(' + k.replace(/[-]/g, '\\-') + '\\s*:\\s*)([^;]+)(;)', 'g');
    if (lineRe.test(body)) {
      body = body.replace(lineRe, '$1$2' + v + '$4');
      patched++;
    }
  }
  return { result: stylesSrc.replace(rootRe, m[1] + body + m[3]), patched: patched };
}

function main() {
  const tokensSrc = fs.readFileSync(TOKENS_PATH, 'utf8');
  const stylesSrc = fs.readFileSync(STYLES_PATH, 'utf8');
  const vars = parseThemeBlock(tokensSrc, DEFAULT_THEME);
  const keys = Object.keys(vars);
  if (keys.length === 0) throw new Error('no vars parsed from theme: ' + DEFAULT_THEME);
  const { result: updated, patched } = patchRootBlock(stylesSrc, vars);
  if (updated === stylesSrc) {
    console.log('[sync-css-tokens] no change (already in sync)');
    return;
  }
  fs.writeFileSync(STYLES_PATH, updated, 'utf8');
  console.log('[sync-css-tokens] OK: patched ' + patched + '/' + keys.length + ' vars from ' + DEFAULT_THEME + ' (other vars preserved)');
}

main();
