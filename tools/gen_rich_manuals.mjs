#!/usr/bin/env node
/**
 * tools/gen_rich_manuals.mjs — 발급 매뉴얼 "리치" 제너레이터 (다중섹션·테이블·문제해결)
 *
 * 229차 잔여 #3 — 단계 위주 단순 매뉴얼을 ko 수준 리치(시작전/발급단계/등록정보/
 * 문제해결/체크리스트, API Key vs OAuth 비교·옵션표 포함)로 보강하기 위한 데이터모델 기반 제너레이터.
 *
 * 입력(SSOT): frontend/src/data/manual_rich/<channel>.json
 *   { name, titleType?, langs: { <lang>: { titleType, badge, intro, quick:[[l,v]], org, sections:[...] } } }
 *   section = { h2, desc?, blocks:[ block, ... ] }
 *   block   = {type:'cards', items:[{tag,h3,p}]}
 *           | {type:'steps', items:[{h3,p,path?}]}
 *           | {type:'table', head:[...], rows:[[...]]}
 *           | {type:'checklist', items:[...]}
 *           | {type:'notice', kind:''|'success'|'danger', html}   // html=원문(이미 이스케이프됨)
 *
 * 출력: frontend/public/api_manuals/<lang>/<channel>.html
 *   → manual_rich 에 정의된 (channel,lang) 조합만 리치로 덮어씀.
 *   → 정의 안 된 언어는 그대로(단순 제너레이터 tools/gen_api_manuals.mjs 산출물) 유지.
 *
 * 사용법:
 *   node tools/gen_rich_manuals.mjs              # public/api_manuals 에 생성 (★기본: ko 제외 = en 등만)
 *   node tools/gen_rich_manuals.mjs --include-ko # ko 도 모델에서 재생성(손수 작성 ko HTML 덮어씀 — 주의)
 *   node tools/gen_rich_manuals.mjs --out DIR    # DIR/<lang> 로 (검증용)
 *   node tools/gen_rich_manuals.mjs --only meta_ads,google_ads
 *
 * ★ ko 보호: ko 매뉴얼은 채널별 손수 작성/큐레이트 리치 HTML 이 정본이라
 *   기본적으로 출력하지 않는다. 모델(manual_rich/<ch>.json)의 ko 블록은
 *   추출 충실도 검증(ko 재생성=원본 콘텐츠 동일) + 향후 단일소스 재생성용이다.
 *   ko 까지 모델 기반으로 전환하려면 --include-ko 로 명시 opt-in.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'frontend/src/data/manual_rich');
const RTL = new Set(['ar']);

const args = process.argv.slice(2);
let outBase = path.join(ROOT, 'frontend/public/api_manuals');
const outIdx = args.indexOf('--out');
if (outIdx >= 0 && args[outIdx + 1]) outBase = path.resolve(ROOT, args[outIdx + 1]);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 && args[onlyIdx + 1] ? new Set(args[onlyIdx + 1].split(',')) : null;
const includeKo = args.includes('--include-ko');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `:root{--red:#ff0033;--dark:#111827;--gray:#6b7280;--light:#f8fafc;--line:#e5e7eb;--blue:#2563eb;--green:#16a34a;--yellow:#f59e0b;--card:#fff}*{box-sizing:border-box}body{margin:0;font-family:"Pretendard","Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%);color:var(--dark);line-height:1.65}.page{max-width:1120px;margin:0 auto;padding:44px 22px 80px}.hero{background:linear-gradient(135deg,#111827 0%,#1f2937 60%,#3b0764 100%);color:#fff;border-radius:28px;padding:48px;position:relative;overflow:hidden;box-shadow:0 25px 70px rgba(17,24,39,.25)}.hero::after{content:"";position:absolute;inset-inline-end:-80px;top:-80px;width:260px;height:260px;background:rgba(255,0,51,.28);border-radius:50%;filter:blur(8px)}.badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);font-size:14px;font-weight:700}h1{font-size:clamp(34px,5vw,58px);line-height:1.12;margin:24px 0 16px;letter-spacing:-1.7px}.hero p{max-width:730px;color:#d1d5db;font-size:18px;margin:0}.quick{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px}.quick-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:18px;backdrop-filter:blur(8px)}.quick-card strong{display:block;font-size:15px;color:#fff}.quick-card span{font-size:13px;color:#d1d5db}.section{margin-top:34px;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:34px;box-shadow:0 14px 40px rgba(15,23,42,.06)}.section h2{margin:0 0 16px;font-size:28px;letter-spacing:-.7px}.section-desc{color:var(--gray);margin-top:-4px;margin-bottom:24px}.steps{counter-reset:step;display:grid;gap:18px}.step{display:grid;grid-template-columns:56px 1fr;gap:18px;padding:22px;border:1px solid var(--line);border-radius:20px;background:#fff}.num{width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,var(--red),#ef4444);color:#fff;display:grid;place-items:center;font-weight:900;font-size:18px;box-shadow:0 10px 20px rgba(255,0,51,.22)}.step h3{margin:0 0 8px;font-size:20px}.step p{margin:0 0 10px;color:#374151}.path{display:inline-block;padding:8px 12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;font-family:Consolas,Monaco,monospace;font-size:14px;color:#111827}.notice{border-inline-start:5px solid var(--yellow);background:#fffbeb;padding:18px 20px;border-radius:16px;margin-top:18px}.notice.success{border-inline-start-color:var(--green);background:#f0fdf4}.notice.danger{border-inline-start-color:var(--red);background:#fff1f2}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px}.mini-card{border:1px solid var(--line);border-radius:18px;padding:22px;background:#fff}.mini-card h3{margin-top:0}.tag{display:inline-block;padding:4px 10px;border-radius:999px;background:#eff6ff;color:var(--blue);font-size:13px;font-weight:800;margin-bottom:10px}table{width:100%;border-collapse:collapse;overflow:hidden;border-radius:16px;border:1px solid var(--line);background:#fff}th,td{padding:16px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}th{background:#f9fafb;font-weight:900}tr:last-child td{border-bottom:0}.checklist{display:grid;gap:10px;padding:0;list-style:none;margin:0}.checklist li{padding:13px 15px;background:#f9fafb;border:1px solid var(--line);border-radius:14px}.checklist li::before{content:"\\2713";color:var(--green);font-weight:900;margin-inline-end:8px}.footer{margin-top:28px;text-align:center;color:var(--gray);font-size:14px}@media(max-width:820px){.hero{padding:34px 24px}.quick,.two-col{grid-template-columns:1fr}.step{grid-template-columns:1fr}.section{padding:24px}}@media print{body{background:#fff}.page{padding:0;max-width:none}.hero,.section{box-shadow:none;break-inside:avoid}}`;

function renderBlock(b) {
  switch (b.type) {
    case 'cards':
      return `<div class="two-col">${b.items.map(c =>
        `<div class="mini-card"><span class="tag">${esc(c.tag)}</span><h3>${esc(c.h3)}</h3><p>${esc(c.p)}</p></div>`).join('')}</div>`;
    case 'steps':
      return `<div class="steps">${b.items.map((s, i) =>
        `<div class="step"><div class="num">${i + 1}</div><div><h3>${esc(s.h3)}</h3><p>${esc(s.p)}</p>${s.path ? `<span class="path">${esc(s.path)}</span>` : ''}</div></div>`).join('')}</div>`;
    case 'table':
      return `<table><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
        b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'checklist':
      return `<ul class="checklist">${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'notice':
      return `<div class="notice${b.kind ? ' ' + b.kind : ''}">${b.html}</div>`;
    default:
      throw new Error('unknown block type: ' + b.type);
  }
}

function renderSection(s) {
  const desc = s.desc ? `<p class="section-desc">${esc(s.desc)}</p>` : '';
  return `<section class="section"><h2>${esc(s.h2)}</h2>${desc}${s.blocks.map(renderBlock).join('')}</section>`;
}

function renderManual(lang, name, icon, L) {
  const titleType = L.titleType;
  const fullTitle = `${name} ${titleType}`;
  const quick = L.quick.map(([l, v]) => `<div class="quick-card"><strong>${esc(l)}</strong><span>${esc(v)}</span></div>`).join('');
  const htmlAttr = `lang="${lang}"${RTL.has(lang) ? ' dir="rtl"' : ''}`;
  return `<!DOCTYPE html><html ${htmlAttr}><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${esc(fullTitle)}</title><style>${CSS}</style></head><body><main class="page"><section class="hero"><span class="badge"><span style="font-size:20px;line-height:1" aria-hidden="true">${icon}</span> ${esc(L.badge)}</span><h1>${esc(name)}<br/>${esc(titleType)}</h1><p>${esc(L.intro)}</p><div class="quick">${quick}</div></section>${L.sections.map(renderSection).join('')}<p class="footer">${esc(fullTitle)} · ${esc(L.org)}</p></main></body></html>`;
}

/* CHANNELS 메타(icon)는 ApiKeys.jsx 에서 — 단순 제너레이터와 동일 파서 */
function parseChannels(src) {
  const map = {};
  const re = /\{\s*key:\s*'([^']+)',\s*name:\s*'([^']+)',\s*icon:\s*'([^']*)',\s*color:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) if (!(m[1] in map)) map[m[1]] = { name: m[2], icon: m[3], color: m[4] };
  return map;
}

function main() {
  const CH = parseChannels(fs.readFileSync(path.join(ROOT, 'frontend/src/pages/ApiKeys.jsx'), 'utf8'));
  if (!fs.existsSync(DATA_DIR)) { console.log('no manual_rich dir; nothing to do'); return; }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  let written = 0; const done = [];
  for (const f of files) {
    const ch = f.replace(/\.json$/, '');
    if (only && !only.has(ch)) continue;
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    const name = data.name || (CH[ch] && CH[ch].name) || ch;
    const icon = data.icon || (CH[ch] && CH[ch].icon) || '🔑';
    const langs = Object.keys(data.langs).filter(l => includeKo || l !== 'ko');
    for (const lang of langs) {
      const dir = path.join(outBase, lang);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${ch}.html`), renderManual(lang, name, icon, data.langs[lang]), 'utf8');
      written++;
    }
    done.push(`${ch}[${langs.join(',')}]`);
  }
  console.log(`rich written=${written} -> ${outBase}`);
  console.log('channels: ' + (done.join(' ') || '(none)'));
}

main();
