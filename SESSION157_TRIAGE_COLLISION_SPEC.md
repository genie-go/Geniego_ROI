# tools/triage.mjs collision detector v1 사양

> **세션**: 157차 Step B
> **목표**: 156차 ed3c4a0/d4ae187 의 AST dotted-keypath collision detection 패턴을 영구 도구화
> **범위**: collision mode 만. mojibake/dead-subtree mode 는 후속 commit
> **저장 경로**: `tools/triage.mjs` (영구 tracked)

---

## 1. CLI 사양

```bash
node tools/triage.mjs --locale <name> --mode collision [--csv <path>] [--json <path>] [--quiet]
```

**Args**:
- `--locale <name>` (required): `ko` | `en` | `ja` | `zh` | `zh-TW` | `es` | `fr` | `de` | `pt` | `ru` | `ar` | `hi` | `id` | `th` | `vi`
- `--mode collision` (required for v1, 향후 `mojibake` / `dead-subtree` / `all` 추가)
- `--csv <path>` (optional): RFC-4180 CSV 출력 경로. 미지정 시 stdout 에 요약만
- `--json <path>` (optional): machine-readable JSON 출력. 미지정 시 생략
- `--quiet` (optional): summary 만 출력, per-row 출력 생략

**Exit code**:
- `0`: collision 0건 (clean)
- `1`: collision ≥1건 발견
- `2`: 입력/파일 오류 (locale 파일 없음, AST 파싱 실패 등)

---

## 2. 입력

`frontend/src/i18n/locales/<locale>.js`

전제: ESM 형태, `export default { ... }` 단일 object literal. 156차 e81f4cf / ed3c4a0 의 AST traversal 방식과 동일.

---

## 3. 처리 알고리즘

### 3.1 AST 파싱

- **Parser**: `acorn` (이미 repo 의존성). `ecmaVersion: 'latest'`, `sourceType: 'module'`
- **buffer 한계**: `execSync` 가 아니므로 `fs.readFileSync` 직접 + `maxBuffer` 무관. 단 ko.js ~1.4MB 정도라 Node 의 V8 string 한계 내.

### 3.2 root object literal 추출

```
program.body.find(n => n.type === 'ExportDefaultDeclaration')
  .declaration  // ObjectExpression
```

### 3.3 dotted-keypath 수집

재귀 traversal. 각 property 에 대해:

```
walk(node, pathParts):
  for prop of node.properties:
    if prop.type !== 'Property': continue  // SpreadElement 등 무시
    keyName = (prop.key.type === 'Identifier') ? prop.key.name
            : (prop.key.type === 'Literal')   ? String(prop.key.value)
            : null
    if keyName === null: continue
    
    keyType = prop.key.type  // 'Identifier' | 'Literal'
    fullPath = [...pathParts, keyName].join('.')
    
    if prop.value.type === 'ObjectExpression':
      walk(prop.value, [...pathParts, keyName])
      // 또한 이 object 자체를 collision 후보로 기록 (block-level)
      record({
        path: fullPath,
        line: prop.loc.start.line,
        keyType,
        leafCount: countLeaves(prop.value),
        kind: 'block',
      })
    else:
      record({
        path: fullPath,
        line: prop.loc.start.line,
        keyType,
        leafCount: 1,
        kind: 'leaf',
      })
```

`countLeaves(objectExpr)`: 재귀, ObjectExpression 이 아닌 모든 prop.value 의 개수.

### 3.4 collision 감지

같은 `fullPath` 에 record 가 2개 이상이면 collision.

각 collision group 에 대해:
- **Group 1** (먼저 선언): 첫 record
- **Group 2** (이후 선언, last-wins 가 이김): 두 번째 이후

ed3c4a0 식별 패턴:
- `pathParts.length === 1` (root level)
- `leafCount === 16`
- `keyTypeFirstChild === 'Literal'` (quoted-key form)

→ 이 셋이 한 row 에 다 들어가야 향후 ed3c4a0 식별 가능.

### 3.5 divergent value 분석

leaf-level collision (양쪽이 ObjectExpression 이 아님) 의 경우:
- 양쪽 value 가 동일 → `status=identical` (no-op deletion 가능)
- 다름 → `status=divergent` (operator 결정 필요, d4ae187 케이스)

Block-level (ObjectExpression vs ObjectExpression) 의 경우:
- 양쪽 subtree 의 leafCount 비교
- 양쪽 leaf key set 비교
- 동일 leaf key set + 동일 value 전부 → `status=block_identical`
- 그 외 → `status=block_divergent`

---

## 4. 출력

### 4.1 stdout summary (항상)

```
[triage:collision] locale=ko
  total collisions: 18
    block-level: 1
    leaf-level: 17
  by status:
    identical: 16
    divergent: 2
    block_identical: 0
    block_divergent: 0
exit code: 1
```

### 4.2 RFC-4180 CSV (`--csv` 시)

**컬럼** (header row 포함):

```
locale,path,kind,group_index,line,key_type,leaf_count,first_child_key_type,status,value_preview
```

**예** (ed3c4a0 케이스):
```
ko,graph,block,1,37219,Identifier,16,Identifier,block_identical,
ko,graph,block,2,46107,Literal,16,Literal,block_identical,
```

**예** (d4ae187 케이스):
```
ko,dash.operations.marketing.colRoas,leaf,1,8121,Identifier,1,,divergent,"수익률"
ko,dash.operations.marketing.colRoas,leaf,2,N,Identifier,1,,divergent,"<other_value>"
```

**RFC-4180 룰**:
- 모든 필드 quote 필수 (안전 기본)
- `"` 는 `""` 로 escape
- CRLF line ending
- BOM 없음 (Excel 호환 옵션은 후속)

### 4.3 JSON (`--json` 시)

```json
{
  "locale": "ko",
  "mode": "collision",
  "file": "frontend/src/i18n/locales/ko.js",
  "ast_root_type": "ObjectExpression",
  "total_collisions": 18,
  "by_kind": { "block": 1, "leaf": 17 },
  "by_status": { "identical": 16, "divergent": 2, "block_identical": 0, "block_divergent": 0 },
  "collisions": [
    {
      "path": "graph",
      "kind": "block",
      "groups": [
        { "index": 1, "line": 37219, "key_type": "Identifier", "leaf_count": 16, "first_child_key_type": "Identifier" },
        { "index": 2, "line": 46107, "key_type": "Literal", "leaf_count": 16, "first_child_key_type": "Literal" }
      ],
      "status": "block_identical"
    }
  ],
  "generated_at": "2026-05-24T..."
}
```

---

## 5. 안전장치

### 5.1 AST 파싱 실패

```
try {
  ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
} catch (e) {
  console.error(`[triage:collision] AST parse failed for ${file}: ${e.message}`);
  process.exit(2);
}
```

### 5.2 export default 없음

```
if (!exportDefault || exportDefault.declaration.type !== 'ObjectExpression') {
  console.error(`[triage:collision] no \`export default { ... }\` in ${file}`);
  process.exit(2);
}
```

### 5.3 locale 파일 부재

```
if (!fs.existsSync(file)) {
  console.error(`[triage:collision] locale file not found: ${file}`);
  process.exit(2);
}
```

### 5.4 read-only 보증

본 도구는 어떠한 파일도 수정하지 않음. `fs.readFileSync` + 출력만. write 작업은 별도 도구 (`tools/triage_apply.mjs`, 후속) 에서 담당.

---

## 6. 코드 구조 (CC 작성 시 참고)

```
tools/triage.mjs
├── parseArgs(argv) → { locale, mode, csvPath, jsonPath, quiet }
├── loadLocale(locale) → { src, file }
├── parseAST(src, file) → ast
├── extractRoot(ast, file) → ObjectExpression
├── walk(node, pathParts, records) → void
├── countLeaves(objectExpr) → number
├── detectCollisions(records) → collisionGroups[]
├── classifyStatus(group, src) → 'identical' | 'divergent' | 'block_identical' | 'block_divergent'
├── emitCSV(collisions, csvPath) → void
├── emitJSON(result, jsonPath) → void
├── emitSummary(result, quiet) → void
└── main()
```

**의존성**: `acorn` (이미 있음, package.json 의 dependencies 또는 devDependencies 확인). 별도 install 불필요.

**Shebang**: `#!/usr/bin/env node` 첫 줄.

**Module type**: ESM (`.mjs` 확장자) - repo 다른 mjs 파일들과 일관.

---

## 7. 검증 (Step C 의 dogfood plan)

CC 작성 후 검증:

### 7.1 unit-level

```bash
# ko.js @ master (HEAD d3b4f5a): 156 cleanup 잔여 + detector 신규 검출
node tools/triage.mjs --locale ko --mode collision
# expected: total collisions: 2, exit 1
#   - performance: leaf(L12538 Literal) vs block(L43242 Identifier 24-leaf), divergent
#   - attribution: leaf(L12830 Literal) vs block(L43268 Literal 9-leaf), divergent
# 둘 다 ed3c4a0 graph.* 와 동일 패턴 (mixed-kind, root-level, last-wins block 이 유효).
# leaf 형태 unreachable, cleanup 가능 (별도 트랙).
```

### 7.2 15 locale full scan

```bash
for L in ko en ja zh zh-TW es fr de pt ru ar hi id th vi; do
  node tools/triage.mjs --locale $L --mode collision --csv session157_${L}_collisions.csv --quiet
  echo "$L: exit=$?"
done
```

기대: ko=0, 나머지 14 locale 의 collision 분포 측정 (사전 정찰 가치).

실측 결과 (master HEAD d3b4f5a):
  ko: 2 groups (4 rows)
  en, zh-TW, es, fr, de, pt, ru, ar, hi, id, th, vi: 0
  ja: 651 groups (1,302 rows) — ⚠️ sacred, ruleEnginePage.dash.* namespace
  zh: 819 groups (1,656 rows) — ⚠️ sacred, ruleEnginePage.dash.* namespace
    (588 identical noise + 1,054 divergent + 14 block_divergent)

ja/zh 결과는 156 step E (sacred ja/zh 6× multi-decl) 정찰 데이터와 일치:
  - ruleEnginePage.dash.* 가 ja 179 / zh 176 single-block 내부 중복 (multi-pass paste 흔적)
  - 일부 divergent 는 영어 source 잔존 / 한국어 source 미번역
  - production runtime: ja/zh 사용자가 ruleEnginePage 의 일부에서 한국어/영어 strings 노출 가능
  - cleanup 은 사용자 canonical 결정 + N-79 addendum 적용 필요 (157차 잔여 트랙)

### 7.3 156 commit 재현 검증 (regression test)

```bash
# detector reproducibility 검증 — 156 history 와 invariant 확인
# 단 git stash -u 는 untracked tools/triage.mjs 까지 stash 되므로 사용 금지.
# git checkout <hash> -- <path> 형태로 단일 파일만 일시 변경.

PARENT=$(git rev-parse ed3c4a0~1)  # ee1ae5ce
git checkout $PARENT -- frontend/src/i18n/locales/ko.js
node tools/triage.mjs --locale ko --mode collision
# expected: total collisions: 21, exit 1
#   = 16 graph.* identical leaves
#   + 1 graph block self (block_identical) — 156 ad-hoc 미검출
#   + 2 dash.operations.marketing.col* divergent (d4ae187 타겟)
#   + 2 performance/attribution mixed-kind — 156 ad-hoc 미검출
git checkout master -- frontend/src/i18n/locales/ko.js

검증 의미:
  - 18 (ed3c4a0 보고) ⊂ 21 (detector 측정)
  - detector 가 strictly more conservative (false-negative 없음)
  - 추가 3건 모두 진짜 collision (graph block self + perf + attrib mixed-kind)
  - 156 ad-hoc 의 narrower scope 가 검출 누락한 케이스를 detector 가 메움
```

이 reproducibility 검증으로 detector 가 156 history 와 invariant 임을 입증.

---

## 8. Step C 진입 조건

- [x] CC 가 `tools/triage.mjs` 작성 완료 (329 lines)
- [x] `node tools/triage.mjs --locale ko --mode collision` → exit 1, 2 collisions
       (spec §7.1 갱신본 기대값과 일치)
- [x] 15 locale dogfood scan 완료, CSV 산출 (session157_collisions/)
- [x] regression test 통과 (ko @ parent_of_ed3c4a0 → 21 collisions ⊇ 18)
- [ ] pre-commit hook G2/G5/B1-B4 pass (commit 직전 확인)

위 4개 [x] 충족. pre-commit hook 확인 후 commit:

  feat(tools): add triage.mjs collision detector (155+156 detector pattern persistence)

  Session 157 Step B+C. Persists 156's ed3c4a0/d4ae187 AST dotted-keypath
  collision detection. Read-only. ESM, acorn-based, 329 lines.

  Detector 사양:
    - CLI: --locale --mode collision [--csv] [--json] [--quiet]
    - dotted-keypath duplicate detection (block/leaf, mixed-kind 포함)
    - status classifier: identical / divergent / block_identical / block_divergent
    - RFC-4180 CSV + JSON emitters
    - exit code: 0 (clean) / 1 (collisions found) / 2 (parse error)

  15-locale dogfood 측정 baseline (master HEAD d3b4f5a):
    ko: 2 (performance + attribution, mixed-kind, separate cleanup track)
    ja: 651 (ruleEnginePage.dash.*, sacred, N-79 검토 대상)
    zh: 819 (ruleEnginePage.dash.*, sacred, N-79 검토 대상)
    en + 11 others: 0

  Regression validation: ko @ ed3c4a0~1 → 21 collisions = 18 (156 보고) + 3
  (graph block self + performance + attribution mixed-kind). Detector strictly
  more conservative than 156 ad-hoc scan.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

---

## 9. Step D 이후 (응집 시 추가 트랙, N-156-A)

### 9.1 즉시 cleanup 가능 (외부 의존 0)

- **ko performance + attribution mixed-kind cleanup** (2 collisions)
  - ed3c4a0 패턴 재현 (root-level Group 1 leaf 삭제, Group 2 block 보존)
  - identifier: pathParts.length === 1 AND kind === 'leaf' AND collision_with_block_at_same_path
  - 별도 commit 권장 (N-153-D 준수)

### 9.2 사용자 canonical 결정 후

- **ja/zh ruleEnginePage.dash.* cleanup** (ja 651 + zh 819 groups)
  - sacred locale, N-79 addendum 적용 필요
  - 156 step E sacred SHA 3-way invariant 패턴 그대로
  - 다만 canonical declaration (Group 1 vs Group 2 어느 쪽) 사용자 결정 필요
  - 일부 divergent 는 영어 source / 한국어 leftover (번역 누락 — 별도 트랙)

### 9.3 mojibake / dead-subtree mode 추가 (별도 commit)

- triage.mjs v1 은 collision only
- f68117d mojibake 패턴 (NFKC + MOJIBAKE_MAP DSL + C1 strip + run-equality) 영구화
- e81f4cf dead-subtree 패턴 (consumer audit 4-layer + AST resolution) 영구화

여력 시:
- **mojibake mode** (f68117d 패턴 영구화): NFKC + MOJIBAKE_MAP DSL + C1 strip + run-equality
- **dead-subtree mode** (e81f4cf 패턴 영구화): consumer audit 4-layer + AST resolution
- **`--mode all`** combined report

별도 commit 들로 진입.

---

**문서 종결.**
