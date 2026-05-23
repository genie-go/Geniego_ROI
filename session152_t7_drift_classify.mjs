#!/usr/bin/env node
/**
 * session152_t7_drift_classify.mjs
 *
 * 목적: 86,900 drift leaf 를 153차 인간 검토 가능 형태로 분류
 *
 * 3 카테고리:
 * (A) intentional_english   — 영어 그대로 의도된 라벨 (브랜드/기술용어/UI common)
 *     판정: value가 ASCII-only + 짧음 (≤30자) + 다중 locale에서 동일 영어 값
 *
 * (B) ko_rename_drift       — ko에서 rename/restructure 되어 다른 locale 에 잔재
 *     판정: value 가 비-ASCII (실제 번역됨) AND >= 3 locale 에 존재
 *
 * (C) clone_leak            — 단일 locale 또는 clone-cluster 에만 존재
 *     판정: 위 둘에 해당하지 않음 — 단순 잔재 또는 작업 미완료
 *
 * 산출:
 * - session152_t7_drift_category_A.csv  (의도된 영어, 153차 사용자 검토용)
 * - session152_t7_drift_category_B.csv  (ko-rename drift, ko 마스터 sync 후보)
 * - session152_t7_drift_category_C.csv  (단순 잔재, 153차 cleanup 후보)
 * - session152_t7_drift_summary.csv     (카테고리별 namespace TopN 요약)
 *
 * 가드:
 * - 마스터 로딩 실패 시 abort
 * - 개별 locale 로딩 실패 시 skip
 * - 카테고리별 row 수 콘솔 출력
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

const OUT_A = 'session152_t7_drift_category_A_intentional_english.csv';
const OUT_B = 'session152_t7_drift_category_B_ko_rename_drift.csv';
const OUT_C = 'session152_t7_drift_category_C_clone_leak.csv';
const OUT_SUMMARY = 'session152_t7_drift_classify_summary.csv';

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

/** ASCII-only 검사 (영어 / 숫자 / 일반 기호만) */
function isAsciiOnly(s) {
  if (typeof s !== 'string') return false;
  return /^[\x20-\x7e]*$/.test(s);
}

function nsLevel(key, depth) {
  return key.split('.').slice(0, depth).join('.') || '(root)';
}

async function main() {
  console.log('[t7-classify] Loading master:', MASTER);
  const master = await loadLocale(MASTER);
  if (!master || master.size === 0) {
    console.error('[abort] master ko.js unloadable');
    process.exit(1);
  }
  console.log(`[t7-classify] master leaves: ${master.size.toLocaleString()}`);

  // locale별 flat map 로드
  const flatByLocale = {};
  for (const locale of ACTIVE_LOCALES) {
    if (locale === MASTER) continue;
    const flat = await loadLocale(locale);
    if (flat) flatByLocale[locale] = flat;
  }
  console.log(`[t7-classify] loaded ${Object.keys(flatByLocale).length} non-master locales`);

  // drift key 수집 (key → { locales: [...], values: { locale: value } })
  const driftMap = new Map();
  for (const [locale, flat] of Object.entries(flatByLocale)) {
    for (const [k, v] of flat.entries()) {
      if (master.has(k)) continue;
      if (!driftMap.has(k)) driftMap.set(k, { locales: [], values: {} });
      const entry = driftMap.get(k);
      entry.locales.push(locale);
      entry.values[locale] = v;
    }
  }
  console.log(`[t7-classify] total unique drift keys: ${driftMap.size.toLocaleString()}`);

  // 분류
  const catA = [];   // intentional_english
  const catB = [];   // ko_rename_drift
  const catC = [];   // clone_leak

  for (const [key, entry] of driftMap.entries()) {
    const localeCount = entry.locales.length;
    const values = Object.values(entry.values);

    // ASCII-only 검사: 모든 locale 의 값이 ASCII
    const allAscii = values.every(v => isAsciiOnly(v));
    // 짧은 길이 (≤30자)
    const allShort = values.every(v => typeof v === 'string' && v.length <= 30);
    // 다중 locale 에서 동일 값
    const uniqueValues = new Set(values.map(v => String(v)));
    const sameValueAcrossLocales = uniqueValues.size === 1;

    if (allAscii && allShort && localeCount >= 3 && sameValueAcrossLocales) {
      // (A) 의도된 영어 라벨 — 같은 영어 값이 3개 이상 locale 에 동일하게 존재
      catA.push({
        key,
        namespace_l2: nsLevel(key, 2),
        value: values[0],
        locale_count: localeCount,
        locales: entry.locales.join(','),
      });
    } else if (!allAscii && localeCount >= 3) {
      // (B) ko-rename drift — 실제 번역된 값이 다수 locale 에 존재 = ko가 빠진 케이스
      catB.push({
        key,
        namespace_l2: nsLevel(key, 2),
        locale_count: localeCount,
        sample_value: typeof values[0] === 'string' ? values[0].slice(0, 80) : String(values[0]).slice(0, 80),
        locales: entry.locales.join(','),
      });
    } else {
      // (C) 단순 잔재 / clone-leak
      catC.push({
        key,
        namespace_l2: nsLevel(key, 2),
        locale_count: localeCount,
        sample_value: typeof values[0] === 'string' ? values[0].slice(0, 80) : String(values[0]).slice(0, 80),
        locales: entry.locales.join(','),
      });
    }
  }

  console.log(`[t7-classify] (A) intentional_english : ${catA.length.toLocaleString()}`);
  console.log(`[t7-classify] (B) ko_rename_drift     : ${catB.length.toLocaleString()}`);
  console.log(`[t7-classify] (C) clone_leak          : ${catC.length.toLocaleString()}`);

  // CSV 저장
  const writeCSV = (path, header, rows) => {
    const body = [header, ...rows.map(r => header.map(h => r[h]))]
      .map(r => r.map(csvEscape).join(','))
      .join('\n');
    fs.writeFileSync(path, body, 'utf8');
    console.log(`[t7-classify] saved: ${path}`);
  };

  writeCSV(OUT_A, ['key', 'namespace_l2', 'value', 'locale_count', 'locales'], catA);
  writeCSV(OUT_B, ['key', 'namespace_l2', 'locale_count', 'sample_value', 'locales'], catB);
  writeCSV(OUT_C, ['key', 'namespace_l2', 'locale_count', 'sample_value', 'locales'], catC);

  // namespace TopN 요약
  const summaryByCategory = { A: catA, B: catB, C: catC };
  const summaryRows = [];
  for (const [cat, list] of Object.entries(summaryByCategory)) {
    const nsCounts = new Map();
    for (const r of list) {
      nsCounts.set(r.namespace_l2, (nsCounts.get(r.namespace_l2) || 0) + 1);
    }
    const top = [...nsCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [ns, count] of top) {
      summaryRows.push({ category: cat, namespace_l2: ns, count });
    }
  }
  writeCSV(OUT_SUMMARY, ['category', 'namespace_l2', 'count'], summaryRows);

  console.log('\n[t7-classify] Done.');
}

main().catch(e => {
  console.error('[fatal]', e);
  process.exit(1);
});
