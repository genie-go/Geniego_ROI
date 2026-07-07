#!/usr/bin/env node
/**
 * i18n_autofill.mjs — ko(SSOT)에만 있는 UI 키를 14개국 현지 자연어로 자동 번역·채움. [270차 신설]
 *
 * 목적: "추가되는 모든 것이 자동으로 15개국 현지어가 되도록". 개발자는 신규 UI 라벨을 ko.js(+en.js)에만
 *   추가하면, 이 스크립트가 base 로케일에 없는 키를 감지→Claude 로 현지 번역→오버레이(frontend/src/i18n/autofill.json)
 *   에 채운다. 1MB base 로케일 파일은 미접촉(안전). 런타임 t() 가 base → 오버레이 → en 순으로 해석.
 *
 * 실행: CLAUDE_API_KEY=sk-... node tools/i18n_autofill.mjs   (deploy.ps1 훅·CI 스텝)
 *   - 키 없으면 gap 만 리포트하고 종료(빌드 실패 없음·미채움 키는 영어 폴백=깨지지 않음).
 * 멱등: 이미 base/오버레이에 있는 키는 건너뜀. 새 키만 번역.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const LOCDIR = path.join(ROOT, 'frontend/src/i18n/locales');
const OVERLAY = path.join(ROOT, 'frontend/src/i18n/autofill.json');
const LANGS = { ja:'Japanese', zh:'Simplified Chinese', 'zh-TW':'Traditional Chinese', de:'German', th:'Thai', vi:'Vietnamese', id:'Indonesian', ar:'Arabic', es:'Spanish', fr:'French', hi:'Hindi', pt:'Portuguese (Brazil)', ru:'Russian', en:'English' };
// inline 모드용: ko 포함 15국(영어폴백 키는 ko 로도 번역해야 함).
const LANGS_ALL = { ko:'Korean', ...LANGS };
const API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_PER_BATCH = parseInt(process.env.AUTOFILL_BATCH || '', 10) || 40; // 긴 문자열 응답 잘림 방지(40으로 하향)
// 스코프 제어: AUTOFILL_ONLY=쉼표구분 키접두(예: rulesEditorPage,mmm) → 해당 키만. AUTOFILL_MAX=언어당 최대 키수(런어웨이 방지).
const ONLY = (process.env.AUTOFILL_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const MAX_PER_LANG = parseInt(process.env.AUTOFILL_MAX || '0', 10) || 0;
const inScope = k => ONLY.length === 0 || ONLY.some(p => k === p || k.startsWith(p + '.'));

const flatten = (o, pre = '', out = {}) => {
  for (const [k, v] of Object.entries(o || {})) {
    const kk = pre ? pre + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, kk, out);
    else if (typeof v === 'string') out[kk] = v;
  }
  return out;
};

async function loadLocale(lang) {
  const mod = await import(url.pathToFileURL(path.join(LOCDIR, lang + '.js')).href);
  return mod.default || {};
}

async function translateBatch(lang, langName, entries) {
  // entries: [[key, koText], ...] → {key: translated}
  const sys = `You are a professional UI localizer for GeniegoROI, an e-commerce ROI/marketing SaaS. Translate the given Korean UI strings into ${langName}, using natural, native, concise product-UI phrasing. Keep technical tokens unchanged: ROAS, CPA, CPC, CPM, ROI, SKU, MMM, CAPI, A/B, T*, KPI, VAT, {{...}} placeholders, brand/menu names in Latin. Return ONLY a JSON object mapping each key to its translation, no prose.`;
  const payload = { model: MODEL, max_tokens: 8192, system: sys,
    messages: [{ role: 'user', content: 'Translate these keys to ' + langName + ' (JSON in → JSON out):\n' + JSON.stringify(Object.fromEntries(entries), null, 0) }] };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  let txt = (j.content || []).map(c => c.text || '').join('').trim();
  const m = txt.match(/\{[\s\S]*\}/); if (m) txt = m[0];
  return JSON.parse(txt);
}

// ── 사이드바 모드: sidebarI18n.js(const D={ko:{...},...}) 를 SSOT=ko 로 14국 채움·직접 재생성 ──
async function fillSidebar() {
  const SBFILE = path.join(ROOT, 'frontend/src/layout/sidebarI18n.js');
  const mod = await import(url.pathToFileURL(SBFILE).href + '?t=' + Date.now());
  const D = mod.default || {};
  const ko = D.ko || {};
  const TECH = /^(whatsapp|WhatsApp|CRM|WMS|SMS|DB|PG|AI|KPI|P&L|BI|SNS)/;
  const report = [];
  for (const [lang, langName] of Object.entries(LANGS)) {
    if (lang === 'ko') continue;
    D[lang] = D[lang] || {};
    const missing = Object.keys(ko).filter(k => inScope(k) && typeof ko[k] === 'string' && (D[lang][k] === undefined || (D[lang][k] === ko[k] && !TECH.test(ko[k]))));
    if (!missing.length) { report.push(`${lang}:0`); continue; }
    if (!API_KEY) { report.push(`${lang}:${missing.length} missing (NO KEY)`); continue; }
    let filled = 0;
    for (let i = 0; i < missing.length; i += MAX_PER_BATCH) {
      const chunk = missing.slice(i, i + MAX_PER_BATCH).map(k => [k, ko[k]]);
      try { const res = await translateBatch(lang, langName, chunk); for (const [k] of chunk) if (typeof res[k] === 'string' && res[k].trim()) { D[lang][k] = res[k].trim(); filled++; } }
      catch (e) { report.push(`${lang}:batch@${i} FAIL ${e.message}`); }
    }
    report.push(`${lang}:${missing.length}→${filled}`);
  }
  fs.writeFileSync(SBFILE, 'const D=' + JSON.stringify(D) + ';\nexport default D;\n', 'utf8');
  console.error('[i18n_autofill:sidebar] ' + report.join(' | '));
}

// ── 백엔드 모드: backend/data/backend_i18n.json({ko:{code:text},...}) 를 SSOT=ko 로 14국 채움 ──
async function fillBackend() {
  const BFILE = path.join(ROOT, 'backend/data/backend_i18n.json');
  const D = (() => { try { return JSON.parse(fs.readFileSync(BFILE, 'utf8')); } catch { return { ko: {} }; } })();
  const ko = D.ko || {};
  const report = [];
  for (const [lang, langName] of Object.entries(LANGS)) {
    if (lang === 'ko') continue;
    D[lang] = D[lang] || {};
    const missing = Object.keys(ko).filter(k => inScope(k) && typeof ko[k] === 'string' && D[lang][k] === undefined);
    if (!missing.length) { report.push(`${lang}:0`); continue; }
    if (!API_KEY) { report.push(`${lang}:${missing.length} missing (NO KEY)`); continue; }
    let filled = 0;
    for (let i = 0; i < missing.length; i += MAX_PER_BATCH) {
      const chunk = missing.slice(i, i + MAX_PER_BATCH).map(k => [k, ko[k]]);
      try { const res = await translateBatch(lang, langName, chunk); for (const [k] of chunk) if (typeof res[k] === 'string' && res[k].trim()) { D[lang][k] = res[k].trim(); filled++; } }
      catch (e) { report.push(`${lang}:batch@${i} FAIL ${e.message}`); }
    }
    report.push(`${lang}:${missing.length}→${filled}`);
    try { fs.writeFileSync(BFILE, JSON.stringify(D) + '\n', 'utf8'); } catch {}
  }
  const sorted = {};
  for (const l of Object.keys(D).sort()) { sorted[l] = {}; for (const k of Object.keys(D[l]).sort()) sorted[l][k] = D[l][k]; }
  fs.writeFileSync(BFILE, JSON.stringify(sorted) + '\n', 'utf8');
  console.error('[i18n_autofill:backend] ' + report.join(' | '));
}

// ── 인라인 폴백 모드: JSX 의 t('key','한글fb') 중 key 가 ko.js 부재 → 폴백을 ko 소스로 14국 번역→오버레이 ──
//   (컴포넌트가 인라인 한글 폴백만 쓰고 로케일에 키를 안 넣은 경우 = 전 비한국어 UI 한글 누출. 백필 사각지대.)
async function fillInline() {
  const SRC = path.join(ROOT, 'frontend/src');
  const ko = flatten(await loadLocale('ko'));
  const koFlat = new Set(Object.keys(ko));
  // JSX 전수 스캔
  const files = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const fp = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|dist|locales|__|backup/.test(fp)) walk(fp); } else if (/\.jsx?$/.test(e.name)) files.push(fp); } };
  walk(SRC);
  // 한글폴백(source=ko) + 영어/기타 폴백(source=en) 모두 캡처. 소스언어 verbatim 저장 + 나머지 14국 번역.
  const re = /\bt\(\s*["']([\w.]+)["']\s*,\s*["']([^"']*[A-Za-z가-힣][^"']*)["']/g;
  const srcMap = {}; // key → { src:'ko'|'en', text }
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); let m; while ((m = re.exec(s))) { const [, k, v] = m; if (koFlat.has(k) || koFlat.has('pages.' + k) || srcMap[k]) continue; srcMap[k] = { src: /[가-힣]/.test(v) ? 'ko' : 'en', text: v }; } }
  // [현 차수] 모듈상수 동적키 패턴: 얕은 객체 리터럴에 {label:'한글', labelKey:'dotted.key'}(또는 lk/sectionKey 등) 가
  //   같이 있고 t(x.labelKey, x.label) 로 렌더되는 경우 — 정적 스캔 사각지대. dotted key 만 추출(prefix 확정 가능).
  const objRe = /\{[^{}]*\}/g;
  const keyRe = /\b(?:labelKey|sectionKey|titleKey|descKey|nameKey|itemKey|tabKey|optKey)\s*:\s*["']([\w]+(?:\.[\w]+)+)["']/;
  const valRe = /\b(?:label|title|desc|name|section|text|tab|opt)\s*:\s*["']([^"'\\]*[가-힣][^"'\\]*)["']/;
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); for (const om of s.matchAll(objRe)) { const obj = om[0]; const km = obj.match(keyRe); const vm = obj.match(valRe); if (km && vm) { const k = km[1]; if (!koFlat.has(k) && !srcMap[k]) srcMap[k] = { src: 'ko', text: vm[1] }; } } }
  const allKeys = Object.keys(srcMap).filter(inScope);
  const overlay = (() => { try { return JSON.parse(fs.readFileSync(OVERLAY, 'utf8')); } catch { return {}; } })();
  const report = [];
  // ①소스언어 verbatim 채움(번역 불요) — ko 회귀 방지(한글폴백 키의 ko 오버레이·영어폴백 키의 en 오버레이)
  for (const k of allKeys) { const { src, text } = srcMap[k]; overlay[src] = overlay[src] || {}; if (overlay[src][k] === undefined) overlay[src][k] = text; }
  try { fs.writeFileSync(OVERLAY, JSON.stringify(overlay, null, 0) + '\n', 'utf8'); } catch {}
  // ②나머지 14국 번역
  for (const [lang, langName] of Object.entries(LANGS_ALL)) {
    overlay[lang] = overlay[lang] || {};
    let missing = allKeys.filter(k => srcMap[k].src !== lang && overlay[lang][k] === undefined);
    if (MAX_PER_LANG > 0) missing = missing.slice(0, MAX_PER_LANG);
    if (!missing.length) { report.push(`${lang}:0`); continue; }
    if (!API_KEY) { report.push(`${lang}:${missing.length} (NO KEY)`); continue; }
    let filled = 0;
    for (let i = 0; i < missing.length; i += MAX_PER_BATCH) {
      const chunk = missing.slice(i, i + MAX_PER_BATCH).map(k => [k, srcMap[k].text]);
      try { const res = await translateBatch(lang, langName, chunk); for (const [k] of chunk) if (typeof res[k] === 'string' && res[k].trim()) { overlay[lang][k] = res[k].trim(); filled++; } }
      catch (e) { report.push(`${lang}:batch@${i} FAIL ${e.message}`); }
    }
    report.push(`${lang}:${missing.length}→${filled}`);
    try { fs.writeFileSync(OVERLAY, JSON.stringify(overlay, null, 0) + '\n', 'utf8'); } catch {}
  }
  const sorted = {};
  for (const l of Object.keys(overlay).sort()) { sorted[l] = {}; for (const k of Object.keys(overlay[l]).sort()) sorted[l][k] = overlay[l][k]; }
  fs.writeFileSync(OVERLAY, JSON.stringify(sorted, null, 0) + '\n', 'utf8');
  console.error(`[i18n_autofill:inline] 부재키 ${allKeys.length}개 | ` + report.join(' | '));
}

(async () => {
  if ((process.env.AUTOFILL_TARGET || '') === 'sidebar') { await fillSidebar(); return; }
  if ((process.env.AUTOFILL_TARGET || '') === 'backend') { await fillBackend(); return; }
  if ((process.env.AUTOFILL_TARGET || '') === 'inline') { await fillInline(); return; }
  const ko = flatten(await loadLocale('ko'));
  const overlay = (() => { try { return JSON.parse(fs.readFileSync(OVERLAY, 'utf8')); } catch { return {}; } })();
  const report = [];
  let totalMissing = 0, totalFilled = 0;

  for (const [lang, langName] of Object.entries(LANGS)) {
    if (lang === 'ko') continue;
    const base = flatten(await loadLocale(lang));
    overlay[lang] = overlay[lang] || {};
    // 누락 = ko 에 있으나 base 로케일·오버레이에 없는 키
    let missing = Object.keys(ko).filter(k => inScope(k) && base[k] === undefined && overlay[lang][k] === undefined && typeof ko[k] === 'string' && ko[k].length <= 400);
    if (MAX_PER_LANG > 0) missing = missing.slice(0, MAX_PER_LANG);
    totalMissing += missing.length;
    if (!missing.length) { report.push(`${lang}: 0 missing`); continue; }
    if (!API_KEY) { report.push(`${lang}: ${missing.length} missing (NO API KEY — skip fill)`); continue; }
    let filled = 0;
    for (let i = 0; i < missing.length; i += MAX_PER_BATCH) {
      const chunk = missing.slice(i, i + MAX_PER_BATCH).map(k => [k, ko[k]]);
      try {
        const res = await translateBatch(lang, langName, chunk);
        for (const [k] of chunk) if (typeof res[k] === 'string' && res[k].trim()) { overlay[lang][k] = res[k].trim(); filled++; }
      } catch (e) { report.push(`${lang}: batch@${i} FAIL ${e.message}`); }
    }
    totalFilled += filled;
    report.push(`${lang}: ${missing.length} missing → ${filled} filled`);
    // [하드닝] 언어별 증분 저장 — 장시간 백필 중단 시에도 진행분 보존·멱등 재개 가능.
    try { fs.writeFileSync(OVERLAY, JSON.stringify(overlay, null, 0) + '\n', 'utf8'); } catch {}
  }

  // 오버레이 저장(키 정렬로 안정적 diff)
  const sorted = {};
  for (const lang of Object.keys(overlay).sort()) { sorted[lang] = {}; for (const k of Object.keys(overlay[lang]).sort()) sorted[lang][k] = overlay[lang][k]; }
  fs.writeFileSync(OVERLAY, JSON.stringify(sorted, null, 0) + '\n', 'utf8');

  console.error('[i18n_autofill] ' + report.join(' | '));
  console.error(`[i18n_autofill] total missing=${totalMissing} filled=${totalFilled} · overlay=${OVERLAY}`);
  if (totalMissing > 0 && !API_KEY) console.error('[i18n_autofill] ⚠ CLAUDE_API_KEY 미설정 — 미채움 키는 영어 폴백. 키 설정 후 재실행하면 자동 현지화.');
})();
