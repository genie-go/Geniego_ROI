#!/usr/bin/env node
/**
 * gen_channel_i18n_overlay.mjs — 연동허브 전 채널 필드라벨·발급안내 15개국 현지화(오버레이). [현 차수]
 *   ApiKeys.jsx 의 CHANNEL_FIELDS(필드 라벨)·CHANNEL_APPLY_NOTE(발급 안내)를 추출 →
 *   파생키 ak.field.<채널>.<필드키> / ak.note.<채널> 의 ko 값 생성 → Claude 로 14국 번역 →
 *   frontend/src/i18n/autofill.json 오버레이 병합(ko verbatim + 14국). ko.js 대수술 회피.
 *   렌더는 t('ak.field.'+channel.key+'.'+f.k, f.label) / t('ak.note.'+channel.key, n.note) 로 파생키 조회.
 * 멱등: 이미 오버레이에 있는 키는 스킵.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const APIKEYS = path.join(ROOT, 'frontend/src/pages/ApiKeys.jsx');
const OVERLAY = path.join(ROOT, 'frontend/src/i18n/autofill.json');
const API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const BATCH = parseInt(process.env.AUTOFILL_BATCH || '', 10) || 40;
const LANGS = { ja:'Japanese', zh:'Simplified Chinese', 'zh-TW':'Traditional Chinese', de:'German', th:'Thai', vi:'Vietnamese', id:'Indonesian', ar:'Arabic', es:'Spanish', fr:'French', hi:'Hindi', pt:'Portuguese (Brazil)', ru:'Russian', en:'English' };

/* 중괄호 매칭으로 const NAME = { ... }; 객체 리터럴 추출 */
function extractObj(src, name) {
  const anchor = `const ${name} = {`;
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error(`${name} not found`);
  let i = start + anchor.length - 1, depth = 0, inStr = null;
  for (; i < src.length; i++) {
    const c = src[i], p = src[i - 1];
    if (inStr) { if (c === inStr && p !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const objStr = src.slice(start + `const ${name} = `.length, i);
  return new Function('return ' + objStr)();
}

async function translateBatch(langName, entries) {
  const sys = `You are a professional UI localizer for GeniegoROI, an e-commerce integration hub. Translate the given Korean API-credential field labels / issuance guidance into ${langName}, natural and concise. KEEP technical tokens unchanged exactly: API, OAuth, Client ID, Client Secret, Access Token, App Key, App Secret, Partner ID, Shop ID, Seller ID, Vendor ID, Marketplace ID, refresh_token, HMAC, SP-API, Webhook, AES-256, brand names (Meta, Google, TikTok, Shopify, Amazon, Naver, Kakao, Coupang, Grip, GenieGo...). Return ONLY a JSON object mapping each key to its translation, no prose.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8192, system: sys, messages: [{ role: 'user', content: 'Translate to ' + langName + ':\n' + JSON.stringify(Object.fromEntries(entries)) }] }),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const j = await r.json();
  let txt = (j.content || []).map(c => c.text || '').join('').trim();
  const m = txt.match(/\{[\s\S]*\}/); if (m) txt = m[0];
  return JSON.parse(txt);
}

(async () => {
  const src = fs.readFileSync(APIKEYS, 'utf8');
  const FIELDS = extractObj(src, 'CHANNEL_FIELDS');
  const NOTES = extractObj(src, 'CHANNEL_APPLY_NOTE');
  const koMap = {};
  for (const [ch, arr] of Object.entries(FIELDS)) {
    if (ch === 'grip') continue; // grip 은 labelKey(ak.fieldGrip) 로 이미 처리
    if (!Array.isArray(arr)) continue;
    for (const f of arr) { if (f && f.k && typeof f.label === 'string' && /[가-힣]/.test(f.label)) koMap[`ak.field.${ch}.${f.k}`] = f.label; }
  }
  for (const [ch, n] of Object.entries(NOTES)) {
    if (ch === 'grip') continue;
    if (n && typeof n.note === 'string' && /[가-힣]/.test(n.note)) koMap[`ak.note.${ch}`] = n.note;
  }
  const keys = Object.keys(koMap);
  console.error(`[gen_channel_i18n] 대상 키: ${keys.length} (field+note, 한글 라벨만)`);

  const overlay = (() => { try { return JSON.parse(fs.readFileSync(OVERLAY, 'utf8')); } catch { return {}; } })();
  // ko verbatim
  overlay.ko = overlay.ko || {};
  for (const k of keys) if (overlay.ko[k] === undefined) overlay.ko[k] = koMap[k];
  fs.writeFileSync(OVERLAY, JSON.stringify(overlay, null, 0) + '\n', 'utf8');

  const report = [];
  for (const [lang, langName] of Object.entries(LANGS)) {
    overlay[lang] = overlay[lang] || {};
    const missing = keys.filter(k => overlay[lang][k] === undefined);
    if (!missing.length) { report.push(`${lang}:0`); continue; }
    if (!API_KEY) { report.push(`${lang}:${missing.length}(NOKEY)`); continue; }
    let filled = 0;
    for (let i = 0; i < missing.length; i += BATCH) {
      const chunk = missing.slice(i, i + BATCH).map(k => [k, koMap[k]]);
      try { const res = await translateBatch(langName, chunk); for (const [k] of chunk) if (typeof res[k] === 'string' && res[k].trim()) { overlay[lang][k] = res[k].trim(); filled++; } }
      catch (e) { report.push(`${lang}@${i}FAIL:${e.message}`); }
    }
    report.push(`${lang}:${missing.length}→${filled}`);
    try { fs.writeFileSync(OVERLAY, JSON.stringify(overlay, null, 0) + '\n', 'utf8'); } catch {}
  }
  const sorted = {};
  for (const l of Object.keys(overlay).sort()) { sorted[l] = {}; for (const k of Object.keys(overlay[l]).sort()) sorted[l][k] = overlay[l][k]; }
  fs.writeFileSync(OVERLAY, JSON.stringify(sorted, null, 0) + '\n', 'utf8');
  console.error('[gen_channel_i18n] ' + report.join(' | '));
})();
