#!/usr/bin/env node
/**
 * session152_t7_drift_topn.mjs
 *
 * 목적: 각 locale의 extra_vs_ko (ko에 없는 leaf) 를
 *       top-level / 2-level 네임스페이스별로 집계
 *       → 153차 drift cleanup 입력 데이터로 활용
 *
 * 산출:
 * - session152_t7_drift_topn_l1.csv  (top-level namespace × locale 매트릭스)
 * - session152_t7_drift_topn_l2.csv  (2-level namespace × locale, TopN=50)
 * - session152_t7_drift_examples.csv (네임스페이스별 샘플 키 5개씩)
 *
 * 사용: node session152_t7_drift_topn.mjs
 *
 * 가드:
 * - master ko.js 로딩 실패 시 abort
 * - 개별 locale 로딩 실패 시 skip (stderr 경고)
 * - clone-cluster (en/es/fr, pt/ru/hi/ar) 표시 마크 추가
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LOCALES_DIR = 'frontend/src/i18n/locales';
const MASTER = 'ko';
const ACTIVE_LOCALES = [
  'ko', 'en', 'ja', 'zh', 'zh-TW',
  'es', 'fr', 'de', 'pt', 'ru',
  'ar', 'hi', 'id', 'th', 'vi',
];

const CLONE_CLUSTERS = {
  'en-cluster': ['en', 'es', 'fr'],
  'pt-cluster': ['pt', 'ru', 'hi', 'ar'],
};

const OUT_L1 = 'session152_t7_drift_topn_l1.csv';
const OUT_L2 = 'session152_t7_drift_topn_l2.csv';
const OUT_EX = 'session152_t7_drift_examples.csv';
const TOPN_L2 = 50;
const EXAMPLES_PER_NS = 5;

function flattenLeaves(obj, prefix = '', out = new Map()) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    out.set(prefix, obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    flattenLeaves(v, next, out);
  }
  return out;
}

async function loadLocale(locale) {
  const file = path.resolve(LOCALES_DIR, `${locale}.js`);
  if (!fs.existsSync(file)) {
    console.error(`[skip] ${locale}: file not found`);
    return null;
  }
  try {
    const url = pathToFileURL(file).href + `?t=${Date.now()}`;
    const mod = await import(url);
    const data = mod.default ?? mod;
    if (!data || typeof data !== 'object') return null;
    return flattenLeaves(data);
  } catch (e) {
    console.error(`[skip] ${locale}: ${e.message}`);
    return null;
  }
}

function csvEscape(s) {
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function nsLevel(key, depth) {
  const parts = key.split('.');
  return parts.slice(0, depth).join('.') || '(root)';
}

async function main() {
  console.log('[t7-drift] Loading master:', MASTER);
  const master = await loadLocale(MASTER);
  if (!master || master.size === 0) {
    console.error('[abort] master ko.js unloadable');
    process.exit(1);
  }
  console.log(`[t7-drift] master leaves: ${master.size.toLocaleString()}`);

  // locale별 drift 키 수집
  const driftByLocale = {};      // locale → Map<key, value>
  for (const locale of ACTIVE_LOCALES) {
    if (locale === MASTER) continue;
    const flat = await loadLocale(locale);
    if (!flat) continue;
    const drift = new Map();
    for (const [k, v] of flat.entries()) {
      if (!master.has(k)) drift.set(k, v);
    }
    driftByLocale[locale] = drift;
    console.log(`[t7-drift] ${locale}: ${drift.size.toLocaleString()} drift keys`);
  }

  // clone-cluster 마킹
  const cloneOf = {};
  for (const [cluster, members] of Object.entries(CLONE_CLUSTERS)) {
    for (const m of members) cloneOf[m] = cluster;
  }

  // L1 매트릭스: top-level NS × locale
  const l1Namespaces = new Set();
  const l1Counts = {};  // ns → locale → count
  for (const [locale, drift] of Object.entries(driftByLocale)) {
    for (const k of drift.keys()) {
      const ns = nsLevel(k, 1);
      l1Namespaces.add(ns);
      l1Counts[ns] ??= {};
      l1Counts[ns][locale] = (l1Counts[ns][locale] || 0) + 1;
    }
  }
  const l1Sorted = [...l1Namespaces].sort((a, b) => {
    const sa = Object.values(l1Counts[a] || {}).reduce((x, y) => x + y, 0);
    const sb = Object.values(l1Counts[b] || {}).reduce((x, y) => x + y, 0);
    return sb - sa;
  });

  // L2 매트릭스: 2-level NS × locale, TopN
  const l2Namespaces = new Map();   // ns → total
  for (const [locale, drift] of Object.entries(driftByLocale)) {
    for (const k of drift.keys()) {
      const ns = nsLevel(k, 2);
      l2Namespaces.set(ns, (l2Namespaces.get(ns) || 0) + 1);
    }
  }
  const l2TopN = [...l2Namespaces.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOPN_L2)
    .map(([ns]) => ns);
  const l2Counts = {};
  for (const ns of l2TopN) l2Counts[ns] = {};
  for (const [locale, drift] of Object.entries(driftByLocale)) {
    for (const k of drift.keys()) {
      const ns = nsLevel(k, 2);
      if (l2Counts[ns]) {
        l2Counts[ns][locale] = (l2Counts[ns][locale] || 0) + 1;
      }
    }
  }

  // 예시 키 수집 (L2 TopN 네임스페이스 × 5개)
  const examples = [];  // [ns, locale, key, value]
  for (const ns of l2TopN) {
    for (const [locale, drift] of Object.entries(driftByLocale)) {
      const matches = [...drift.entries()]
        .filter(([k]) => nsLevel(k, 2) === ns)
        .slice(0, EXAMPLES_PER_NS);
      for (const [k, v] of matches) {
        examples.push([
          ns,
          locale,
          cloneOf[locale] || '',
          k,
          typeof v === 'string' ? v.slice(0, 100) : String(v).slice(0, 100),
        ]);
      }
    }
  }

  // CSV 저장
  const writeCSV = (path, header, rows) => {
    const body = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    fs.writeFileSync(path, body, 'utf8');
    console.log(`[t7-drift] saved: ${path}`);
  };

  // L1
  const localeCols = Object.keys(driftByLocale);
  writeCSV(OUT_L1,
    ['namespace_l1', 'total', ...localeCols.map(l => `${l}${cloneOf[l] ? `(${cloneOf[l]})` : ''}`)],
    l1Sorted.map(ns => [
      ns,
      Object.values(l1Counts[ns] || {}).reduce((x, y) => x + y, 0),
      ...localeCols.map(l => l1Counts[ns]?.[l] || 0),
    ]),
  );

  // L2 TopN
  writeCSV(OUT_L2,
    ['namespace_l2', 'total', ...localeCols.map(l => `${l}${cloneOf[l] ? `(${cloneOf[l]})` : ''}`)],
    l2TopN.map(ns => [
      ns,
      l2Namespaces.get(ns),
      ...localeCols.map(l => l2Counts[ns]?.[l] || 0),
    ]),
  );

  // Examples
  writeCSV(OUT_EX,
    ['namespace_l2', 'locale', 'clone_cluster', 'key', 'value_sample'],
    examples,
  );

  // 콘솔 요약
  console.log('\n[t7-drift] Top 10 L1 namespaces by total drift:');
  for (const ns of l1Sorted.slice(0, 10)) {
    const total = Object.values(l1Counts[ns] || {}).reduce((x, y) => x + y, 0);
    console.log(`  ${ns.padEnd(30)} ${total.toLocaleString()}`);
  }
  console.log('\n[t7-drift] Done.');
}

main().catch(e => {
  console.error('[fatal]', e);
  process.exit(1);
});
