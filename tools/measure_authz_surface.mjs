#!/usr/bin/env node
/**
 * 인가 표면(authorization surface) 실측 — 회귀 범위 산정용 SSOT 산출기.
 *
 * 배경(289차 승인 세션 ②):
 *   `requirePro` 호출부 수가 **351** 이라는 값이 286차 코드 주석(UserAuth.php:329)에서 출발해
 *   문서 15편 + 코드 1곳으로 복제됐다. 5-6 이 455 로 정정했으나 나머지는 351 그대로였고,
 *   다음 사람은 **다수결로 351을 정본으로 읽게 되는** 상태였다(틀린 값이 복제 수로 이김).
 *   실측 결과 351은 실제보다 ~100 적었다 → **회귀 범위를 351로 잡으면 약 30%를 빠뜨린다.**
 *
 * 근본 원인은 "값이 틀렸다"가 아니라 **"값이 문서에 손으로 박혀 있었다"** 이다.
 *   숫자를 다시 손으로 박으면 같은 사고가 반복된다(값 복사 금지 · 실제값 자동산출 원칙).
 *   그래서 이 스크립트가 **측정 방법 자체를 코드로 고정**하고, 문서는 값이 아니라 이 명령을 가리킨다.
 *
 * ★수치를 인용해야 하면: 이 스크립트를 실행해 **그 자리에서 측정**하라. 문서의 숫자를 베끼지 말 것.
 *   문서에 값을 적어야 한다면 **반드시 측정 차수·명령을 함께** 적어라(GD-2: measurement_method 필수).
 *
 * 사용: node tools/measure_authz_surface.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const BACKEND_SRC = join(ROOT, 'backend', 'src');

/** 주석 전용 라인 판정 — 라인 앞 공백 제거 후 주석 토큰으로 시작하면 주석. */
const COMMENT_START = /^(\/\/|\*|#|\/\*)/;

function* walkPhp(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'vendor' || name === 'node_modules') continue;
      yield* walkPhp(p);
    } else if (name.endsWith('.php')) yield p;
  }
}

const files = [...walkPhp(BACKEND_SRC)].map(f => ({
  rel: relative(ROOT, f).split(sep).join('/'),
  lines: readFileSync(f, 'utf8').split('\n'),
}));

/**
 * @param {RegExp} callRe   호출구문 매치(예: /(requirePro|requirePlan)\s*\(/)
 * @param {RegExp} defRe    정의부(선언) 매치 — 호출부에서 제외
 */
function measure(callRe, defRe) {
  let mentionLines = 0, callLines = 0, callLinesNoComment = 0, defLines = 0;
  const fileSet = new Set();
  const mentionRe = new RegExp(callRe.source.replace(/\\s\*\\\(/, ''), 'g');

  for (const { rel, lines } of files) {
    for (const raw of lines) {
      const line = raw.replace(/^\s+/, '');
      if (mentionRe.test(line)) mentionLines++;
      mentionRe.lastIndex = 0;
      if (!callRe.test(line)) continue;
      callLines++;
      if (COMMENT_START.test(line)) continue;
      callLinesNoComment++;
      if (defRe && defRe.test(line)) { defLines++; continue; }
      fileSet.add(rel);
    }
  }
  return {
    A_mention_lines: mentionLines,
    B_call_syntax_lines: callLines,
    C_call_minus_comment_lines: callLinesNoComment,
    definitions: defLines,
    callsites: callLinesNoComment - defLines,
    handler_files: fileSet.size,
  };
}

const RESULT = {
  measured_from: 'backend/src (vendor 제외)',
  targets: {
    'requirePro|requirePlan': measure(
      /(requirePro|requirePlan)\s*\(/,
      /function\s+(requirePro|requirePlan)\s*\(/,
    ),
    authedTenant: measure(/authedTenant\s*\(/, /function\s+authedTenant\s*\(/),
    requireMasterAdmin2: measure(/requireMasterAdmin2\s*\(/, /function\s+requireMasterAdmin2\s*\(/),
  },
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(RESULT, null, 2));
} else {
  console.log('인가 표면 실측 — 측정 대상: ' + RESULT.measured_from + '\n');
  for (const [name, m] of Object.entries(RESULT.targets)) {
    console.log(`■ ${name}`);
    console.log(`   A 언급 라인            : ${m.A_mention_lines}`);
    console.log(`   B 호출구문 라인        : ${m.B_call_syntax_lines}`);
    console.log(`   C B − 주석전용 라인    : ${m.C_call_minus_comment_lines}`);
    console.log(`   정의부(선언)           : ${m.definitions}`);
    console.log(`   ★호출부(C − 정의부)    : ${m.callsites}`);
    console.log(`   보유 파일 수           : ${m.handler_files}\n`);
  }
  console.log('★이 값을 문서에 베껴 적지 말 것 — 인용이 필요하면 이 명령을 다시 실행하라.');
  console.log('  (289차 ②: 손으로 박은 351 이 문서 15편에 복제돼 3개 차수를 살아남았다)');
}
