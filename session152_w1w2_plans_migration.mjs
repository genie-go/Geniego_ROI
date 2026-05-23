#!/usr/bin/env node
/**
 * session152_w1w2_plans_migration.mjs
 *
 * 152차 W1+W2: AuthContext.jsx / PlanGate.jsx 를 plans.js SSOT 로 마이그레이션
 *
 * 변경 사항:
 * - AuthContext.jsx
 *   1. import { planRank } from "./plans.js"; 추가
 *   2. 라인 17~20 의 PLAN_RANK + planRank 함수 제거
 *   3. 라인 155 의 PLAN_RANK_LOCAL 블록 제거 (기존 planRank 사용으로 변경)
 *
 * - PlanGate.jsx
 *   1. import { planRank, planLabel, PLAN_LABEL } from "../auth/plans.js"; 추가
 *   2. 라인 19~22 의 PLAN_RANK + PLAN_LABEL 제거 (주석 포함)
 *   3. 라인 74~75 의 userRank/requiredRank 를 planRank() 호출로 변경 (비대칭 default 제거)
 *
 * 안전 가드:
 * - G1: 원본 백업 (backup_session152_W1W2/{AuthContext,PlanGate}.jsx.bak)
 * - G2: plans.js 존재 확인
 * - G3: dry-run 모드 (--dry) 지원, 기본 dry, --apply 로 실제 변경
 * - G4: 적용 후 vite build 시도 (선택, --build 옵션)
 * - G5: rollback 시 G1 백업 복원 (--rollback 옵션)
 *
 * 사용:
 *   node session152_w1w2_plans_migration.mjs               # dry-run
 *   node session152_w1w2_plans_migration.mjs --apply       # 실제 적용
 *   node session152_w1w2_plans_migration.mjs --rollback    # G1 백업으로 원복
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const AUTH_PATH = 'frontend/src/auth/AuthContext.jsx';
const GATE_PATH = 'frontend/src/components/PlanGate.jsx';
const PLANS_PATH = 'frontend/src/auth/plans.js';
const BACKUP_DIR = 'backup_session152_W1W2';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ROLLBACK = args.includes('--rollback');
const RUN_BUILD = args.includes('--build');

const ANSI = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m' };
const log = (color, msg) => console.log(`${ANSI[color] || ''}${msg}${ANSI.reset}`);

/* ──────────────────────────────────────────────────────────────────────── */
/* Rollback                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */
if (ROLLBACK) {
  log('yellow', '[rollback] Restoring from backup...');
  const authBak = path.join(BACKUP_DIR, 'AuthContext.jsx.bak');
  const gateBak = path.join(BACKUP_DIR, 'PlanGate.jsx.bak');
  if (!fs.existsSync(authBak) || !fs.existsSync(gateBak)) {
    log('red', `[rollback] backup not found in ${BACKUP_DIR}/`);
    process.exit(1);
  }
  fs.copyFileSync(authBak, AUTH_PATH);
  fs.copyFileSync(gateBak, GATE_PATH);
  log('green', `[rollback] ${AUTH_PATH} restored`);
  log('green', `[rollback] ${GATE_PATH} restored`);
  process.exit(0);
}

/* ──────────────────────────────────────────────────────────────────────── */
/* G2: plans.js 존재 확인                                                  */
/* ──────────────────────────────────────────────────────────────────────── */
if (!fs.existsSync(PLANS_PATH)) {
  log('red', `[abort] G2 violation: ${PLANS_PATH} not found`);
  process.exit(1);
}
log('green', `[guard] G2 passed: ${PLANS_PATH} exists`);

/* ──────────────────────────────────────────────────────────────────────── */
/* Source 로드                                                             */
/* ──────────────────────────────────────────────────────────────────────── */
if (!fs.existsSync(AUTH_PATH) || !fs.existsSync(GATE_PATH)) {
  log('red', `[abort] Source files not found`);
  process.exit(1);
}
const authSrc = fs.readFileSync(AUTH_PATH, 'utf8');
const gateSrc = fs.readFileSync(GATE_PATH, 'utf8');

/* ──────────────────────────────────────────────────────────────────────── */
/* AuthContext.jsx 변경 정의                                                */
/* ──────────────────────────────────────────────────────────────────────── */

const AUTH_PATCHES = [
  {
    name: 'A1: remove in-file PLAN_RANK + planRank',
    find: `/* 플랜 계층: free=0, demo: 0, starter=1, growth=2, pro=3, enterprise=4, admin=5 */
const PLAN_RANK = { free: 0, demo: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 5 };
function planRank(plan) { return PLAN_RANK[plan] ?? 0; }`,
    replace: `/* PLAN_RANK / planRank: ./plans.js SSOT (152차 W1) */
import { planRank, PLAN_RANK } from "./plans.js";`,
  },
  {
    name: 'A2: replace PLAN_RANK_LOCAL block',
    find: `const PLAN_RANK_LOCAL = { free: 0, demo: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 5 };`,
    replace: `/* PLAN_RANK_LOCAL → planRank() SSOT (152차 W1) */`,
  },
];

/* PLAN_RANK_LOCAL 사용처 (라인 156~) 처리 */
const AUTH_LOCAL_USAGE_PATCHES = [
  {
    name: 'A3: PLAN_RANK_LOCAL usage → planRank()',
    find: /PLAN_RANK_LOCAL\[([^\]]+)\]\s*\?\?\s*0/g,
    replace: 'planRank($1)',
  },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* PlanGate.jsx 변경 정의                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

const GATE_PATCHES = [
  {
    name: 'G1: remove in-file PLAN_RANK + PLAN_LABEL',
    find: `/* Plan 계층 */
const PLAN_RANK = { demo: 0, pro: 1, starter: 1, enterprise: 2, admin: 3 };
const PLAN_LABEL = { demo: "", pro: "Pro", enterprise: "Enterprise", admin: "Admin" };`,
    replace: `/* PLAN_RANK / PLAN_LABEL: ../auth/plans.js SSOT (152차 W2) */`,
  },
  {
    name: 'G2: userRank/requiredRank → planRank()',
    find: `    const userRank = PLAN_RANK[plan] ?? 0;
    const requiredRank = PLAN_RANK[requiredPlan] ?? 1;`,
    replace: `    const userRank = planRank(plan);
    const requiredRank = planRank(requiredPlan);`,
  },
];

/* import 추가 위치: PlanGate.jsx 의 import 블록 끝 */
const GATE_IMPORT_PATCH = {
  name: 'G0: add plans.js import',
  find: `import { useGlobalData } from "../context/GlobalDataContext.jsx";`,
  replace: `import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { planRank, planLabel, PLAN_LABEL } from "../auth/plans.js";`,
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Patch 적용 함수                                                          */
/* ──────────────────────────────────────────────────────────────────────── */
function applyPatch(src, patch) {
  if (patch.find instanceof RegExp) {
    const matches = src.match(patch.find);
    if (!matches) return { ok: false, src, count: 0 };
    const newSrc = src.replace(patch.find, patch.replace);
    return { ok: true, src: newSrc, count: matches.length };
  } else {
    if (!src.includes(patch.find)) return { ok: false, src, count: 0 };
    const newSrc = src.replace(patch.find, patch.replace);
    return { ok: true, src: newSrc, count: 1 };
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* AuthContext.jsx 처리                                                     */
/* ──────────────────────────────────────────────────────────────────────── */
log('blue', '\n[w1] AuthContext.jsx');
let newAuth = authSrc;
let authOk = true;

for (const p of AUTH_PATCHES) {
  const r = applyPatch(newAuth, p);
  if (r.ok) {
    log('green', `  ✓ ${p.name} (${r.count} replacement)`);
    newAuth = r.src;
  } else {
    log('red', `  ✗ ${p.name} — find pattern not matched`);
    authOk = false;
  }
}

for (const p of AUTH_LOCAL_USAGE_PATCHES) {
  const r = applyPatch(newAuth, p);
  if (r.ok) {
    log('green', `  ✓ ${p.name} (${r.count} replacements)`);
    newAuth = r.src;
  } else {
    log('yellow', `  - ${p.name} — no usage (skipped)`);
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* PlanGate.jsx 처리                                                        */
/* ──────────────────────────────────────────────────────────────────────── */
log('blue', '\n[w2] PlanGate.jsx');
let newGate = gateSrc;
let gateOk = true;

const r0 = applyPatch(newGate, GATE_IMPORT_PATCH);
if (r0.ok) {
  log('green', `  ✓ ${GATE_IMPORT_PATCH.name} (${r0.count} replacement)`);
  newGate = r0.src;
} else {
  log('red', `  ✗ ${GATE_IMPORT_PATCH.name} — find pattern not matched`);
  gateOk = false;
}

for (const p of GATE_PATCHES) {
  const r = applyPatch(newGate, p);
  if (r.ok) {
    log('green', `  ✓ ${p.name} (${r.count} replacement)`);
    newGate = r.src;
  } else {
    log('red', `  ✗ ${p.name} — find pattern not matched`);
    gateOk = false;
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Diff 요약                                                                */
/* ──────────────────────────────────────────────────────────────────────── */
log('blue', '\n[diff summary]');
console.log(`  AuthContext.jsx: ${authSrc.length} B → ${newAuth.length} B (Δ ${newAuth.length - authSrc.length})`);
console.log(`  PlanGate.jsx   : ${gateSrc.length} B → ${newGate.length} B (Δ ${newGate.length - gateSrc.length})`);

if (!authOk || !gateOk) {
  log('red', '\n[abort] Some patches failed — review and re-run');
  process.exit(1);
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Apply 모드                                                               */
/* ──────────────────────────────────────────────────────────────────────── */
if (!APPLY) {
  log('yellow', '\n[dry-run] No files written. Re-run with --apply to commit changes.');
  process.exit(0);
}

/* G1: 백업 */
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.copyFileSync(AUTH_PATH, path.join(BACKUP_DIR, 'AuthContext.jsx.bak'));
fs.copyFileSync(GATE_PATH, path.join(BACKUP_DIR, 'PlanGate.jsx.bak'));
log('green', `\n[backup] G1: ${BACKUP_DIR}/`);

/* 적용 */
fs.writeFileSync(AUTH_PATH, newAuth, 'utf8');
fs.writeFileSync(GATE_PATH, newGate, 'utf8');
log('green', `[apply] ${AUTH_PATH} written`);
log('green', `[apply] ${GATE_PATH} written`);

/* G4: vite build 검증 (옵션) */
if (RUN_BUILD) {
  log('blue', '\n[guard] G4: running vite build...');
  try {
    execSync('npm --prefix frontend run build', { stdio: 'inherit', maxBuffer: 16 * 1024 * 1024 });
    log('green', '[guard] G4 passed: vite build green');
  } catch (e) {
    log('red', '[guard] G4 FAILED: vite build error. Auto-rollback...');
    fs.copyFileSync(path.join(BACKUP_DIR, 'AuthContext.jsx.bak'), AUTH_PATH);
    fs.copyFileSync(path.join(BACKUP_DIR, 'PlanGate.jsx.bak'), GATE_PATH);
    log('yellow', '[rollback] Files restored');
    process.exit(1);
  }
}

log('green', '\n[done] W1+W2 migration complete.');
log('yellow', '\nNext step: verify manually then commit.');
log('yellow', '  t bash -c "git diff --stat frontend/src/auth/AuthContext.jsx frontend/src/components/PlanGate.jsx"');
