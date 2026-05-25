# build_resolver_manifest_v2.mjs patch11 — `--emit-parse-errors` 플래그 추가

> **세션**: 161차
> **대상 파일**: `tools/build_resolver_manifest_v2.mjs` (179 lines)
> **목적**: babel-parser 실패 파일을 silent drop 하지 않고 명시 수집·dump
> **외부 의존**: 0
> **분량**: 0.2 세션
> **선행 학습 적용**: §6 #33 path canonical (✓), §6 #34 import 패턴 (해당없음, 신규 flag), §7 spec 저장 경로 중첩 회피 (저장 시 사용자 확인)

---

## 1. 배경

### 1.1 현재 동작 (patch11 이전)

`tools/build_resolver_manifest_v2.mjs:122-150` main() 의 file loop 내 try/catch:

```javascript
// line 138-140 (현재)
} catch (e) {
  parseErrors++;
}
```

parse 실패 시 카운터만 증가, **어떤 파일이 어떤 에러로 실패했는지 기록 0**.

stderr 최종 출력 (line 145-150):

```javascript
console.error(`[v2] scanned=${scanned} parseErrors=${parseErrors} ...`);
```

→ 사용자는 `parseErrors=43` 만 확인 가능, drill-down 불가.

### 1.2 161차 진입 동기 (#29 트랙)

160 patch08 에서 manifest v2 가 default 로 승격됨 (`RESOLVER_MANIFEST_DEFAULT`).
하지만 v2 가 43개 파일을 silent skip 중 → P4 dead-subtree apply 시 false-positive 위험 (skip 파일이 사용 중인 키를 manifest 가 모름 → unused 오판 가능).

**#29 분석 목표**: 43건 실 경로·에러 분류 → babel-parser plugin 누락 여부 확인 → manifest v2 정밀도 정량 측정.

### 1.3 patch11 산출물

`--emit-parse-errors` flag 신규 추가:
1. **default OFF** (backwards compat, 기존 사용자 영향 0)
2. **ON 시**: parse error 발생 파일별 `{path, message, errorName}` 수집
3. **출력**: stderr 한 줄 요약 + 옵션 `--parse-errors-out <path>` 로 JSON dump

---

## 2. 수정 사양

### 2.1 parseArgs 확장 (line 29-50)

**기존**:
```javascript
function parseArgs(argv) {
  const opts = { root: 'frontend/src', locale: 'ko', out: 'tools/resolver_consumer_manifest_v2.json' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--root': opts.root = argv[++i]; break;
      case '--locale': opts.locale = argv[++i]; break;
      case '--out': opts.out = argv[++i]; break;
      case '--help':
        console.log('Usage: node tools/build_resolver_manifest_v2.mjs [--root <dir>] [--locale <code>] [--out <path>]');
        process.exit(0);
      default:
        console.error(`unknown flag: ${a}`);
        process.exit(2);
    }
  }
  return opts;
}
```

**patch11**:
```javascript
function parseArgs(argv) {
  const opts = {
    root: 'frontend/src',
    locale: 'ko',
    out: 'tools/resolver_consumer_manifest_v2.json',
    emitParseErrors: false,            // [patch11] default OFF
    parseErrorsOut: null,              // [patch11] null = stderr only
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--root': opts.root = argv[++i]; break;
      case '--locale': opts.locale = argv[++i]; break;
      case '--out': opts.out = argv[++i]; break;
      case '--emit-parse-errors':       // [patch11]
        opts.emitParseErrors = true; break;
      case '--parse-errors-out':        // [patch11]
        opts.parseErrorsOut = argv[++i];
        opts.emitParseErrors = true;    // implicit ON
        break;
      case '--help':
        console.log('Usage: node tools/build_resolver_manifest_v2.mjs [--root <dir>] [--locale <code>] [--out <path>] [--emit-parse-errors] [--parse-errors-out <path>]');
        process.exit(0);
      default:
        console.error(`unknown flag: ${a}`);
        process.exit(2);
    }
  }
  return opts;
}
```

### 2.2 main() catch 블록 확장 (line 122-150)

**기존 catch (line 138-140)**:
```javascript
} catch (e) {
  parseErrors++;
}
```

**patch11**:
```javascript
} catch (e) {
  parseErrors++;
  if (opts.emitParseErrors) {                      // [patch11]
    parseErrorRecords.push({
      path: f,
      errorName: e.name || 'Error',
      message: String(e.message || e).split('\n')[0].slice(0, 200),
    });
  }
}
```

**main() 상단에 배열 선언 추가**:
```javascript
async function main() {
  const opts = parseArgs(process.argv);
  const files = await walkFiles(opts.root);
  const manifest = { /* ... 기존 ... */ };
  let scanned = 0, parseErrors = 0;
  const parseErrorRecords = [];                    // [patch11]

  // ... 기존 loop ...
}
```

### 2.3 main() 종결부 확장

**기존 (line 145-150 부근)**:
```javascript
fs.writeFileSync(opts.out, JSON.stringify(manifest, null, 2));
console.error(`[v2] scanned=${scanned} parseErrors=${parseErrors} ...`);
```

**patch11**:
```javascript
fs.writeFileSync(opts.out, JSON.stringify(manifest, null, 2));

if (opts.emitParseErrors && parseErrorRecords.length > 0) {     // [patch11]
  // stderr 분류 요약
  const byName = {};
  for (const r of parseErrorRecords) {
    byName[r.errorName] = (byName[r.errorName] || 0) + 1;
  }
  const summary = Object.entries(byName)
    .map(([k, v]) => `${k}=${v}`).join(' ');
  console.error(`[v2] parse-error-breakdown: ${summary}`);

  if (opts.parseErrorsOut) {
    fs.writeFileSync(
      opts.parseErrorsOut,
      JSON.stringify(parseErrorRecords, null, 2)
    );
    console.error(`[v2] parse errors dumped: ${opts.parseErrorsOut} (${parseErrorRecords.length} records)`);
  } else {
    // stderr 에 상위 5건만
    for (const r of parseErrorRecords.slice(0, 5)) {
      console.error(`[v2]   ${r.path}: ${r.errorName}: ${r.message}`);
    }
    if (parseErrorRecords.length > 5) {
      console.error(`[v2]   ... +${parseErrorRecords.length - 5} more (use --parse-errors-out <path>)`);
    }
  }
}

console.error(`[v2] scanned=${scanned} parseErrors=${parseErrors} ...`);  // 기존 마지막 줄 유지
```

---

## 3. 호환성 / 회귀 검증

### 3.1 Backward compatibility

- 기본값 `emitParseErrors=false` → 기존 호출 (`node tools/build_resolver_manifest_v2.mjs`) 동작 100% 동일
- 160 patch08 default-resolution 경로 (`RESOLVER_MANIFEST_DEFAULT`) 영향 0
- pre-commit hook G7-self-test 영향 0 (manifest 파일 자체 unchanged)

### 3.2 회귀 테스트 (수동 dogfood)

```bash
# T1: 기존 동작 보존
node tools/build_resolver_manifest_v2.mjs
# 기대: stderr "[v2] scanned=NN parseErrors=43 ..." 만 (breakdown 없음)
# 기대: tools/resolver_consumer_manifest_v2.json 변화 0 (diff 0)

# T2: 신규 flag — stderr summary
node tools/build_resolver_manifest_v2.mjs --emit-parse-errors 2>&1 | grep parse-error
# 기대: "[v2] parse-error-breakdown: SyntaxError=N TypeError=M ..." 출력

# T3: 신규 flag — JSON dump
node tools/build_resolver_manifest_v2.mjs --parse-errors-out /tmp/parse_errors_161.json
# 기대: 파일 생성 + 43건 array
test -f /tmp/parse_errors_161.json && jq 'length' /tmp/parse_errors_161.json
# 기대: 43

# T4: invalid flag 검증
node tools/build_resolver_manifest_v2.mjs --bogus 2>&1
# 기대: exit 2 + "unknown flag: --bogus"
```

### 3.3 manifest_v2.json 불변

T1-T4 모두 `tools/resolver_consumer_manifest_v2.json` SHA 가 patch11 전후 동일해야 함.

```bash
# patch11 적용 전 SHA 기록
sha256sum tools/resolver_consumer_manifest_v2.json > /tmp/manifest_v2_pre.sha

# patch11 적용 후 재빌드
node tools/build_resolver_manifest_v2.mjs
sha256sum tools/resolver_consumer_manifest_v2.json > /tmp/manifest_v2_post.sha

# 동일성 검증
diff /tmp/manifest_v2_pre.sha /tmp/manifest_v2_post.sha
# 기대: 0 diff
```

---

## 4. 적용 절차 (CC 직접 수정)

### Step 1: 사전 sanity (§6 #33/#34 의무)

```bash
cd /e/project/GeniegoROI
# 코드 위치 재확인 (spec 작성 시점과 동일성)
grep -n 'parseErrors' tools/build_resolver_manifest_v2.mjs
# 기대: 4-5건 hit (선언/증가/출력)
```

### Step 2: parseArgs 확장 (Edit)

CC 가 §2.1 변경을 str_replace 로 적용.

### Step 3: main() 배열 선언 추가 (Edit)

`let scanned = 0, parseErrors = 0;` 다음 라인에 `const parseErrorRecords = [];` 삽입.

### Step 4: catch 블록 확장 (Edit)

§2.2 변경.

### Step 5: 종결부 확장 (Edit)

§2.3 변경. **주의**: 기존 `console.error('[v2] scanned=...')` 줄을 건드리지 말고 **그 앞에** breakdown 블록을 삽입.

### Step 6: 회귀 검증

§3.2 T1-T4 + §3.3 SHA 불변 검증.

### Step 7: commit

```
feat(tools): build_resolver_manifest_v2 --emit-parse-errors flag (#29 prep)
```

---

## 5. 다음 단계 (#29 본 분석, patch11 이후)

```bash
# patch11 적용 후
node tools/build_resolver_manifest_v2.mjs --parse-errors-out /tmp/parse_errors_43.json

# 분류 분석
jq 'group_by(.errorName) | map({name: .[0].errorName, count: length})' /tmp/parse_errors_43.json

# 경로 패턴 분석
jq -r '.[].path' /tmp/parse_errors_43.json | xargs -I{} dirname {} | sort | uniq -c | sort -rn | head -10

# 메시지 패턴 분석 (상위 5개 distinct message)
jq -r '.[].message' /tmp/parse_errors_43.json | sort | uniq -c | sort -rn | head -5
```

→ 분석 결과 기반으로 `@babel/parser` plugin 추가 (e.g. `'decorators-legacy'`, `'typescript'` 옵션 누락 여부) 또는 파일 유형 (`.vue`, `.svelte` 등) 제외 판정.

---

## 6. §6 / §7 self-audit

| 검증 | 상태 |
|---|---|
| #33 repo path canonical | ✓ `tools/build_resolver_manifest_v2.mjs` grep 확인됨 |
| #34 import 패턴 | N/A (신규 flag, import 변경 없음) |
| #35 production 도메인 | N/A (production 영향 0) |
| #36 shell idiom | N/A (Node.js 스크립트, bash 변경 없음) |
| #37 spec 저장 경로 중첩 | 사용자 저장 시 `docs/spec/` 단일 레벨 확인 의무 |

---

**spec 종결.**