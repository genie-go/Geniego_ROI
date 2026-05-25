#!/usr/bin/env node
/**
 * tools/leaf_count.mjs
 *
 * 158차 P2 live test 에서 ephemeral diagnostic 으로 시작.
 * P3 self-test 의존이 되어 영구 자산화.
 *
 * Usage: node tools/leaf_count.mjs <locale-file-path>
 * Output: <path> : <leaf-count>
 *
 * 기능:
 * - ESM dynamic import 로 locale 의 default export 로드
 * - 재귀 leaf 카운트 (object 가 아닌 terminal value)
 * - pathToFileURL: cross-platform (Windows drive-letter + POSIX)
 * - ?v=Date.now() cache-bust: 같은 파일 반복 import 시 stale cache 회피
 */

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function count(o) {
  let n = 0;
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) n += count(v);
    else n++;
  }
  return n;
}

const target = process.argv[2];
if (!target) {
  console.error('usage: node leaf_count.mjs <file>');
  process.exit(2);
}

const url = pathToFileURL(resolve(target)).href + '?v=' + Date.now();
const m = await import(url);
console.log(target, ':', count(m.default ?? m));
