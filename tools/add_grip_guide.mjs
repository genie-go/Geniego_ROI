#!/usr/bin/env node
/**
 * add_grip_guide.mjs — 그립(Grip) 라이브커머스 발급 가이드를 15개 issuanceGuide 파일에 삽입. [현 차수]
 *   ko 원본 스텝 → Claude 로 14개국 현지 번역 → 각 파일(export default {...} / ISSUANCE_GUIDE_KO = {...})의
 *   객체 첫 키로 grip 삽입. 이후 tools/gen_api_manuals.mjs 가 grip.html × 15 생성.
 * 멱등: 이미 grip 있으면 스킵.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'frontend/src/data');
const API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const GRIP_KO = [
  '준비물: 그립(Grip) 파트너/셀러 계정이 필요합니다. (그립컴퍼니 파트너 등록이 완료된 상태)',
  '그립 파트너 센터(파트너/셀러 어드민)에 로그인합니다.',
  '[설정] 또는 [연동·개발자] 메뉴에서 API/연동 관리 항목을 찾습니다.',
  '파트너 API 키(액세스 키) 발급을 신청·생성합니다. (메뉴가 보이지 않으면 그립컴퍼니 파트너 지원에 API 연동을 문의하세요.)',
  '발급된 API 키와 셀러/스토어 ID를 확인합니다.',
  'GenieGo 연동허브 > 그립 (Grip) [등록]에 API 키와 셀러 ID를 입력해 저장합니다.',
];

const LANGS = { en:'English', ja:'Japanese', zh:'Simplified Chinese', 'zh-TW':'Traditional Chinese', de:'German', th:'Thai', vi:'Vietnamese', id:'Indonesian', ar:'Arabic', es:'Spanish', fr:'French', hi:'Hindi', pt:'Portuguese (Brazil)', ru:'Russian' };
const FILE = { en:'issuanceGuide.en.js', ja:'issuanceGuide.ja.js', zh:'issuanceGuide.zh.js', 'zh-TW':'issuanceGuide.zh-TW.js', de:'issuanceGuide.de.js', th:'issuanceGuide.th.js', vi:'issuanceGuide.vi.js', id:'issuanceGuide.id.js', ar:'issuanceGuide.ar.js', es:'issuanceGuide.es.js', fr:'issuanceGuide.fr.js', hi:'issuanceGuide.hi.js', pt:'issuanceGuide.pt.js', ru:'issuanceGuide.ru.js' };

async function translate(langName, steps) {
  const sys = `You are a professional localizer for GeniegoROI. Translate the given Korean step-by-step API-key issuance guide lines into ${langName}, natural and clear for beginners. Keep brand/product names as-is: Grip, GenieGo, API. Return ONLY a JSON array of strings, same length/order, no prose.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, system: sys, messages: [{ role: 'user', content: JSON.stringify(steps) }] }),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const j = await r.json();
  let txt = (j.content || []).map(c => c.text || '').join('').trim();
  const m = txt.match(/\[[\s\S]*\]/); if (m) txt = m[0];
  const arr = JSON.parse(txt);
  if (!Array.isArray(arr) || arr.length !== steps.length) throw new Error('length mismatch');
  return arr;
}

function block(steps) {
  return '\n  grip: [\n' + steps.map(s => '    ' + JSON.stringify(s) + ',').join('\n') + '\n  ],';
}
function insert(file, anchor, steps) {
  const p = path.join(DIR, file);
  let s = fs.readFileSync(p, 'utf8');
  if (/\bgrip:\s*\[/.test(s)) { console.error(`[skip] ${file} already has grip`); return; }
  const idx = s.indexOf(anchor);
  if (idx < 0) { console.error(`[FAIL] ${file}: anchor not found`); return; }
  const at = idx + anchor.length;
  s = s.slice(0, at) + block(steps) + s.slice(at);
  fs.writeFileSync(p, s, 'utf8');
  console.error(`[ok] ${file}`);
}

(async () => {
  // ko 원본
  insert('issuanceGuide.js', 'export const ISSUANCE_GUIDE_KO = {', GRIP_KO);
  for (const [lang, langName] of Object.entries(LANGS)) {
    let steps = GRIP_KO;
    if (API_KEY) { try { steps = await translate(langName, GRIP_KO); } catch (e) { console.error(`[${lang}] translate FAIL ${e.message} — ko 폴백`); steps = GRIP_KO; } }
    insert(FILE[lang], 'export default {', steps);
  }
  console.error('[add_grip_guide] done' + (API_KEY ? '' : ' (NO API KEY — 전 언어 ko 폴백)'));
})();
