#!/usr/bin/env node
/**
 * gen_chatbot_knowledge.mjs — 상담 챗봇(무엇이든 물어보세요) 기능맵 자동 생성기. [270차 신설]
 *
 * 목적: "기능이 추가되면 챗봇이 자동으로 그 기능을 설명"하도록, 정본에서 전체 기능맵을 생성한다.
 *   신규 페이지는 App.jsx 라우트 등록이 필수이므로, 라우트만 추가하면 이 생성기가 그 메뉴를
 *   기능맵에 자동 포함시켜 챗봇이 "그런 기능 없다"고 오답하지 않는다.
 *
 * 병합 규칙:
 *   1) tools/chatbot_feature_curated.md — 사람이 관리하는 리치 정본(그룹·서브기능 상세). 우선.
 *   2) frontend/src/App.jsx 라우트 — 완전성 정본. 큐레이션에 없는 라우트는 "자동 감지" 섹션으로 append.
 *      → 신규 기능은 라우트만 추가해도 즉시 챗봇에 노출되고, 큐레이션에 한 줄 추가하면 설명이 풍부해진다.
 * 출력: backend/data/chatbot_feature_map.md (ClaudeAI::assistant 가 런타임에 읽어 시스템프롬프트에 주입)
 * 실행: node tools/gen_chatbot_knowledge.mjs   (배포 파이프라인 deploy.ps1 훅)
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

// ── 1. 큐레이션 정본 ──
const curated = read(p('tools/chatbot_feature_curated.md')).trim();

// ── 2. App.jsx 라우트 파싱 ──
const app = read(p('frontend/src/App.jsx'));
const lazyMap = {};
for (const m of app.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"][^'"]*\/([A-Za-z0-9_]+)\.jsx['"]\)\)/g)) lazyMap[m[1]] = m[2];
const routes = [];
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<([A-Za-z0-9_]+)/g)) routes.push({ path: m[1], comp: m[2] });

// ── 3. CommandPalette 라벨 보조 ──
const cp = read(p('frontend/src/components/CommandPalette.jsx'));
const cpLabel = {};
for (const m of cp.matchAll(/label:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'/g)) cpLabel[m[2]] = m[1].replace(/^[^\p{L}\p{N}]+/u, '').trim();

// ── 4. 큐레이션에 이미 언급된 경로 집합 ──
const mentioned = new Set();
for (const m of curated.matchAll(/\(?(\/[a-z][a-z0-9/_:-]*)/g)) mentioned.add(m[1]);

// ── 5. 큐레이션에 없는 라우트 자동 감지 ──
const SKIP_COMP = new Set(['Navigate']);
const SKIP_PATH = new Set(['/', '/register', '/login', '*']);
const humanize = s => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();
const missing = [];
const seen = new Set();
for (const r of routes) {
  if (SKIP_COMP.has(r.comp) || SKIP_PATH.has(r.path)) continue;
  if (r.path.includes(':')) continue;      // 동적 상세경로(부모 메뉴로 커버)
  if (seen.has(r.path)) continue; seen.add(r.path);
  if (mentioned.has(r.path)) continue;     // 이미 큐레이션됨
  const label = cpLabel[r.path] || humanize(r.comp);
  missing.push(`- ${label}(${r.path})`);
}

// ── 6. 병합 출력 ──
let out = curated + '\n';
if (missing.length) {
  out += '\n**★ 자동 감지된 메뉴 (라우트에서 발견·큐레이션 상세 대기 — 실제로 존재하는 기능이니 경로로 안내하라)**\n';
  out += missing.join('\n') + '\n';
}

const outFile = p('backend/data/chatbot_feature_map.md');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');

console.error(`[gen_chatbot_knowledge] routes=${routes.length} curated_paths=${mentioned.size} auto_appended=${missing.length}`);
console.error(`[gen_chatbot_knowledge] wrote ${outFile} (${out.length} bytes)`);
if (missing.length) console.error(`[gen_chatbot_knowledge] 자동 append: ${missing.map(x => x.match(/\(([^)]+)\)/)?.[1]).join(', ')}`);
