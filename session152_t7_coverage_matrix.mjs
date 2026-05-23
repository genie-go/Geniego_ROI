#!/usr/bin/env node
/**
 * session152_t7_coverage_matrix.mjs
 *
 * 목적: 마스터 ko.js 대비 14개 locale의 leaf-key coverage 측정
 * 출력: CSV (locale, total_leaves, missing_vs_ko, extra_vs_ko, identical_to_ko, ratio)
 *
 * 사용: node session152_t7_coverage_matrix.mjs
 * 출력 파일: session152_t7_coverage_matrix.csv
 *
 * 가드:
 * - 모든 locale 파일을 동적 import (ESM default export 가정)
 * - 파일 누락 / 파싱 실패 시 해당 locale skip + stderr 경고
 * - ko.js 마스터 leaf 0건이면 abort
 *
 * 산출:
 * - 콘솔: 요약 테이블
 * - CSV: 상세 매트릭스
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LOCALES_DIR = 'frontend/src/i18n/locales';
const MASTER = 'ko';
const OUT_CSV = 'session152_t7_coverage_matrix.csv';
const ACTIVE_LOCALES = [
  'ko', 'en', 'ja', 'zh', 'zh-TW',
  'es', 'fr', 'de', 'pt', 'ru',
  'ar', 'hi', 'id', 'th', 'vi',
];

/**
 * 객체를 평탄화하여 leaf-key path 배열 반환
 * - 객체가 아닌 값은 leaf
 * - 배열은 leaf로 간주 (i18n 변수 배열 패턴 보호)
 */
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
    console.error(`[skip] ${locale}: file not found (${file})`);
    return null;
  }
  try {
    const url = pathToFileURL(file).href + `?t=${Date.now()}`;
    const mod = await import(url);
    const data = mod.default ?? mod;
    if (!data || typeof data !== 'object') {
      console.error(`[skip] ${locale}: invalid export shape`);
      return null;
    }
    return flattenLeaves(data);
  } catch (e) {
    console.error(`[skip] ${locale}: import failed — ${e.message}`);
    return null;
  }
}

function csvEscape(s) {
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function main() {
  console.log('[t7] Loading master:', MASTER);
  const master = await loadLocale(MASTER);
  if (!master || master.size === 0) {
    console.error('[abort] master ko.js empty or unloadable');
    process.exit(1);
  }
  console.log(`[t7] master leaves: ${master.size.toLocaleString()}`);

  const rows = [
    ['locale', 'total_leaves', 'missing_vs_ko', 'extra_vs_ko', 'identical_to_ko', 'coverage_ratio'],
  ];

  for (const locale of ACTIVE_LOCALES) {
    const flat = locale === MASTER ? master : await loadLocale(locale);
    if (!flat) {
      rows.push([locale, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']);
      continue;
    }

    let missing = 0;
    let identical = 0;
    for (const [k, v] of master.entries()) {
      if (!flat.has(k)) {
        missing++;
      } else if (flat.get(k) === v && locale !== MASTER) {
        identical++;
      }
    }
    let extra = 0;
    for (const k of flat.keys()) {
      if (!master.has(k)) extra++;
    }
    const ratio = ((master.size - missing) / master.size * 100).toFixed(2);

    rows.push([
      locale,
      flat.size.toLocaleString(),
      missing.toLocaleString(),
      extra.toLocaleString(),
      identical.toLocaleString(),
      `${ratio}%`,
    ]);
  }

  // 콘솔 출력
  console.log('\n[t7] Coverage Matrix vs ko (master):');
  console.log('─'.repeat(100));
  for (const r of rows) {
    console.log(r.map(c => String(c).padEnd(16)).join(' '));
  }
  console.log('─'.repeat(100));

  // CSV 저장
  const csvBody = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(OUT_CSV, csvBody, 'utf8');
  console.log(`\n[t7] CSV saved: ${OUT_CSV}`);
  console.log('[t7] Done.');
}

main().catch(e => {
  console.error('[fatal]', e);
  process.exit(1);
});
