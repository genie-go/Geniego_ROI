#!/usr/bin/env node
/**
 * fill_overlay_supplement.mjs — {키: 한글값} 보충 JSON 을 오버레이(autofill.json)에 병합. [현 차수]
 *   inline 스캔 사각지대(동적키·계산키: t('prefix.'+var, label) 등)를 명시적으로 채운다.
 *   SUPPL=<json경로> node tools/fill_overlay_supplement.mjs
 *   ko verbatim + 14국 Claude 번역. 멱등(이미 오버레이에 있으면 스킵).
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OVERLAY = path.join(ROOT, 'frontend/src/i18n/autofill.json');
const SUPPL = process.env.SUPPL;
const API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const LANGS = { ja:'Japanese', zh:'Simplified Chinese', 'zh-TW':'Traditional Chinese', de:'German', th:'Thai', vi:'Vietnamese', id:'Indonesian', ar:'Arabic', es:'Spanish', fr:'French', hi:'Hindi', pt:'Portuguese (Brazil)', ru:'Russian', en:'English' };

async function translateBatch(langName, entries) {
  const sys = `You are a professional UI localizer for GeniegoROI (e-commerce ROI SaaS). Translate the given Korean UI labels into ${langName}, natural and concise. Keep technical tokens unchanged: ROAS, CRM, WMS, API, LTV, SMS, LINE, Markov, 1st-Party, Admin, AI, KPI. Return ONLY a JSON object mapping each key to its translation.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, system: sys, messages: [{ role: 'user', content: 'Translate to ' + langName + ':\n' + JSON.stringify(Object.fromEntries(entries)) }] }),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const j = await r.json();
  let txt = (j.content || []).map(c => c.text || '').join('').trim();
  const m = txt.match(/\{[\s\S]*\}/); if (m) txt = m[0];
  return JSON.parse(txt);
}

(async () => {
  const koMap = JSON.parse(fs.readFileSync(SUPPL, 'utf8'));
  const keys = Object.keys(koMap);
  const overlay = (() => { try { return JSON.parse(fs.readFileSync(OVERLAY, 'utf8')); } catch { return {}; } })();
  overlay.ko = overlay.ko || {};
  for (const k of keys) if (overlay.ko[k] === undefined) overlay.ko[k] = koMap[k];
  const report = [];
  for (const [lang, langName] of Object.entries(LANGS)) {
    overlay[lang] = overlay[lang] || {};
    const missing = keys.filter(k => overlay[lang][k] === undefined);
    if (!missing.length) { report.push(`${lang}:0`); continue; }
    if (!API_KEY) { report.push(`${lang}:${missing.length}(NOKEY)`); continue; }
    let filled = 0;
    try { const res = await translateBatch(langName, missing.map(k => [k, koMap[k]])); for (const k of missing) if (typeof res[k] === 'string' && res[k].trim()) { overlay[lang][k] = res[k].trim(); filled++; } }
    catch (e) { report.push(`${lang}:FAIL ${e.message}`); }
    report.push(`${lang}:${missing.length}→${filled}`);
  }
  const sorted = {};
  for (const l of Object.keys(overlay).sort()) { sorted[l] = {}; for (const k of Object.keys(overlay[l]).sort()) sorted[l][k] = overlay[l][k]; }
  fs.writeFileSync(OVERLAY, JSON.stringify(sorted, null, 0) + '\n', 'utf8');
  console.error('[fill_supplement] keys=' + keys.length + ' | ' + report.join(' | '));
})();
