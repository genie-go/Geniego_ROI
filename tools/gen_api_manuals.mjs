#!/usr/bin/env node
/**
 * tools/gen_api_manuals.mjs — API 발급 매뉴얼 정적 HTML 제너레이터 (영구화)
 *
 * 229차까지 매 차수 임시 스크립트(_tmp_gen*.mjs)로 생성하던 발급 매뉴얼을
 * 1커맨드로 재생성하기 위해 정착시킨 도구. (NEXT_SESSION 229차 잔여 #2)
 *
 * 산출물: frontend/public/api_manuals/<lang>/<channel>.html
 *
 * 데이터 소스(SSOT):
 *   - 채널 메타(key/name/icon/color)  ← frontend/src/pages/ApiKeys.jsx CHANNELS
 *   - 매뉴얼 노출 채널 집합            ← frontend/src/pages/ApiKeys.jsx MANUAL_KEYS
 *   - 단계 본문(언어별)               ← frontend/src/data/issuanceGuide.js ISSUANCE_GUIDE_I18N
 *   - 언어별 UI 크롬·CSS 템플릿        ← tools/manual_templates/<lang>.tpl.html
 *
 * ★ 범위 = 비-ko 14개 언어만 (en/ja/zh/zh-TW/de/th/vi/id/ar/es/fr/hi/pt/ru).
 *   ko 매뉴얼은 채널별 리치 큐레이트 코퍼스(다중 섹션·상세, 커밋 44437294e2a)라
 *   본 단순 템플릿으로 덮어쓰면 안 됨 → 제너레이터는 ko 를 절대 건드리지 않는다.
 *
 * 사용법:
 *   node tools/gen_api_manuals.mjs            # 실제 생성 (public/api_manuals/<lang>)
 *   node tools/gen_api_manuals.mjs --out DIR  # DIR/<lang> 로 생성 (검증용 드라이런)
 *   node tools/gen_api_manuals.mjs --check    # _tmp_genchk 에 생성 후 안내만 (덮어쓰기 없음)
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.cwd();
const APIKEYS = path.join(ROOT, 'frontend/src/pages/ApiKeys.jsx');
const GUIDE = path.join(ROOT, 'frontend/src/data/issuanceGuide.js');
const TPL_DIR = path.join(ROOT, 'tools/manual_templates');
const NONKO = ['en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'hi', 'pt', 'ru'];

const args = process.argv.slice(2);
let outBase = path.join(ROOT, 'frontend/public/api_manuals');
if (args.includes('--check')) outBase = path.join(ROOT, '_tmp_genchk');
const outIdx = args.indexOf('--out');
if (outIdx >= 0 && args[outIdx + 1]) outBase = path.resolve(ROOT, args[outIdx + 1]);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── CHANNELS 메타 파싱 (ApiKeys.jsx) ── */
function parseChannels(src) {
  const map = {};
  const re = /\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*icon:\s*'([^']*)',\s*color:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    if (!(m[1] in map)) map[m[1]] = { name: m[2], icon: m[3], color: m[4] };
  }
  return map;
}

/* ── MANUAL_KEYS 파싱 (ApiKeys.jsx) ── */
function parseManualKeys(src) {
  const start = src.indexOf('const MANUAL_KEYS = new Set([');
  if (start < 0) throw new Error('MANUAL_KEYS not found in ApiKeys.jsx');
  const close = src.indexOf(']);', start);
  const block = src.slice(start, close);
  return [...new Set([...block.matchAll(/'([^']+)'/g)].map(x => x[1]))];
}

function render(tpl, { name, icon, color }, steps) {
  const stepsHtml = steps
    .map((s, i) => `<div class="step"><div class="num">${i + 1}</div><div><p>${esc(s)}</p></div></div>`)
    .join('\n');
  const checkHtml = steps.map(s => `<li>${esc(s)}</li>`).join('\n');
  return tpl
    .split('{{STEPS}}').join(stepsHtml)
    .split('{{CHECKLIST}}').join(checkHtml)
    .split('{{N}}').join(String(steps.length))
    .split('{{NAME}}').join(name)
    .split('{{ICON}}').join(icon)
    .split('{{COLOR}}').join(color);
}

async function main() {
  const src = fs.readFileSync(APIKEYS, 'utf8');
  const CH = parseChannels(src);
  const MANUAL_KEYS = parseManualKeys(src);
  const { ISSUANCE_GUIDE_I18N, ISSUANCE_GUIDE_KO } = await import(pathToFileURL(GUIDE).href);

  const stepsFor = (lang, ch) => {
    const t = ISSUANCE_GUIDE_I18N[lang];
    if (t && Array.isArray(t[ch]) && t[ch].length) return t[ch];
    const en = ISSUANCE_GUIDE_I18N.en;
    if (en && Array.isArray(en[ch]) && en[ch].length) return en[ch];
    return ISSUANCE_GUIDE_KO[ch] || null;
  };

  let written = 0, skipped = 0;
  const warnings = [];
  for (const lang of NONKO) {
    const tplPath = path.join(TPL_DIR, `${lang}.tpl.html`);
    if (!fs.existsSync(tplPath)) { warnings.push(`template missing: ${lang}`); continue; }
    const tpl = fs.readFileSync(tplPath, 'utf8');
    const dir = path.join(outBase, lang);
    fs.mkdirSync(dir, { recursive: true });
    for (const ch of MANUAL_KEYS) {
      const meta = CH[ch];
      if (!meta) { warnings.push(`no CHANNELS meta: ${ch}`); skipped++; continue; }
      const steps = stepsFor(lang, ch);
      if (!steps) { warnings.push(`no steps: ${lang}/${ch}`); skipped++; continue; }
      fs.writeFileSync(path.join(dir, `${ch}.html`), render(tpl, meta, steps), 'utf8');
      written++;
    }
  }
  console.log(`channels=${MANUAL_KEYS.length} langs(non-ko)=${NONKO.length}`);
  console.log(`written=${written} skipped=${skipped} -> ${outBase}`);
  if (warnings.length) console.log('WARN:\n  ' + warnings.join('\n  '));
  console.log('NOTE: ko 매뉴얼(리치 큐레이트)은 제너레이터 범위 밖 — 미변경.');
}

main().catch(e => { console.error(e); process.exit(1); });
