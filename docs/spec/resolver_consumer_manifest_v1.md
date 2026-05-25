# Resolver consumer manifest v1

> **세션**: 159 (patch07 후속)
> **선행**: patch07 (dead-subtree apply, plumbing-only)
> **목적**: i18n resolver 의 실제 consumer path 를 정적 grep 으로 산출한 manifest 생성 → patch07 의 conservative-skip 해제

---

## 1. 배경

patch07 의 `buildPlanDeadSubtree` 가 `resolver_consumer_manifest.json` 부재 시 모든 verdict row 를 conservative skip 처리. manifest 가 있으면 prefix-match / dynamic-suspect 검증을 실제 수행 가능.

manifest 는 **frontend 코드 grep** 으로 산출 (runtime 추적 X). 정적 산출이므로 false-negative 가능하지만 dead-subtree 의 "삭제 금지 후보" 풀로 사용하므로 **false-positive (잘못된 삭제) 가 우선 차단** 되는 방향으로 설계.

---

## 2. manifest schema

### 2.1 파일

`tools/resolver_consumer_manifest.json` (tracked)

### 2.2 스키마

```json
{
  "version": 1,
  "generated_at": "2026-05-25T...",
  "generator": "tools/build_resolver_manifest.mjs",
  "locale_scope": "ko",
  "consumers": {
    "direct": [
      "dash.kpi.totalRevenue",
      "pages.orderHub.title",
      ...
    ],
    "prefix": [
      "pages.legacy.*",
      "dash.operations.*",
      ...
    ],
    "dynamic": [
      "dash.kpi",
      "pages.orderHub",
      ...
    ]
  },
  "summary": {
    "direct_count": 0,
    "prefix_count": 0,
    "dynamic_count": 0,
    "scan_files": 0,
    "scan_root": "frontend/src"
  }
}
```

### 2.3 카테고리 정의

- **direct**: `t('foo.bar.baz')` 또는 `i18n.t('foo.bar.baz')` 같은 정적 literal 참조. path 완전 일치.
- **prefix**: `t(\`foo.bar.\${x}\`)` 같은 template literal 의 정적 prefix. `foo.bar.` 까지 추출, wildcard 표기.
- **dynamic**: 동적 키 접근 (`t(key)`, `t(\`\${a}.\${b}\`)`) 의 부분 추정. 보수적으로 root path 만 산출.

---

## 3. 산출 도구

### 3.1 파일

`tools/build_resolver_manifest.mjs`

### 3.2 알고리즘

```javascript
// 1. frontend/src 전체 .js/.jsx/.ts/.tsx 파일 스캔
// 2. 각 파일에서 t(...), i18n.t(...), $t(...) 패턴 grep
// 3. 인자 분류:
//    - 'foo.bar.baz' (string literal) → direct
//    - `foo.bar.${x}` (template literal with prefix) → prefix
//    - 식별자 또는 복잡 표현 → dynamic (가능하면 root path 추정)
// 4. 중복 제거, 정렬
// 5. manifest JSON 산출
```

### 3.3 패턴 정규식 (예시)

```javascript
const PATTERNS = [
  /\bt\s*\(\s*['"`]([^'"`$]+)['"`]\s*[,)]/g,    // direct
  /\bt\s*\(\s*`([^`$]+)\$\{/g,                   // prefix (template literal)
  /\bi18n\.t\s*\(\s*['"`]([^'"`$]+)['"`]/g,      // i18n.t direct
  // ... (보강)
];
```

정규식만으로는 한계 → AST 파싱 옵션 (babel-parser) 추가 검토 가능. 159차 patch08 은 정규식 우선 (단순성). 정확도 부족 시 별도 트랙.

### 3.4 CLI

```bash
node tools/build_resolver_manifest.mjs \
  --root frontend/src \
  --locale ko \
  --out tools/resolver_consumer_manifest.json
```

---

## 4. patch07 통합

### 4.1 buildPlanDeadSubtree 의 manifest 사용

158/159 spec §4.2 의 4-step 검증 활성화:

```javascript
function buildPlanDeadSubtree(rows, options, leafCount, srcAST, manifest) {
  for (const r of rows) {
    // Step 1: detector verdict 신뢰
    if (r.verdict !== 'safe_to_delete') {
      decisions.push({ ...r, action: 'skip', rationale: `verdict=${r.verdict}` });
      continue;
    }
    
    // Step 2: direct consumer 검사
    if (manifest.consumers.direct.some(p => p === r.root_path || p.startsWith(r.root_path + '.'))) {
      decisions.push({ ...r, action: 'skip', rationale: 'direct consumer exists' });
      continue;
    }
    
    // Step 3: prefix consumer 검사
    if (manifest.consumers.prefix.some(p => r.root_path.startsWith(p.replace(/\.\*$/, '.')))) {
      decisions.push({ ...r, action: 'skip', rationale: 'prefix consumer exists' });
      continue;
    }
    
    // Step 4: dynamic consumer 검사
    if (manifest.consumers.dynamic.some(p => r.root_path === p || r.root_path.startsWith(p + '.'))) {
      decisions.push({ ...r, action: 'skip', rationale: 'dynamic consumer suspect' });
      continue;
    }
    
    // Step 5: AST 존재 재확인 (기존 로직)
    const resolved = resolvePath(srcAST, r.root_path);
    if (resolved === undefined) {
      decisions.push({ ...r, action: 'skip', rationale: 'path not in AST (drift)' });
      continue;
    }
    
    decisions.push({ ...r, action: 'delete', ... });
  }
}
```

### 4.2 self-test 갱신

`tools/triage_apply_dead_subtree_self_test.sh` 의 EXPECTED_DELETE 를 manifest 적용 후 실제 값으로 갱신. 단, **synthetic CSV 가 manifest 와 일치하지 않으면** D2 expected 가 달라짐.

해결: self-test 의 synthetic CSV 를 manifest 기반 case 로 변경. 또는 EXPECTED_DELETE 는 plumbing-only 케이스 (manifest 부재 mode flag) 와 manifest-present 케이스 양쪽 검증.

159차 patch08 은 **양쪽 모드 검증** 도입:
- mode A (manifest absent / `--no-manifest` 강제): 기존 D2=0
- mode B (manifest present): 합성 CSV 의 dead path 가 실제 manifest 에서 unreferenced 라면 D2>=1

---

## 5. acceptance 기준

- [ ] `tools/build_resolver_manifest.mjs` 신규
- [ ] frontend/src 전체 스캔 → ko manifest 생성
- [ ] `tools/resolver_consumer_manifest.json` 신규 (tracked, ko 한정)
- [ ] patch07 `buildPlanDeadSubtree` 에 manifest 통합 (§4.1 5-step)
- [ ] `triage_apply_dead_subtree_self_test.sh` 의 EXPECTED_DELETE 재계산 또는 양쪽 모드 검증
- [ ] dead-subtree self-test N/N PASS (manifest present 모드)
- [ ] collision (16/16) + wronglang (8/8) regression 유지
- [ ] commit 분리: A (build_resolver_manifest 도구), B (manifest JSON 산출물), C (patch07 통합), D (self-test 갱신)
- [ ] push + production smoke green
- [ ] ko.js 불변 (이번 트랙은 도구 + manifest 만; 실제 dead-subtree apply 는 사용자 review 후)

---

## 6. 비-목표

- non-ko locale manifest (별도)
- AST 기반 정밀 grep (정규식 1차, 부족 시 별도)
- 실제 dead-subtree apply 실행 (manifest 확인 후 사용자 결정)
- runtime tracing 기반 manifest (정적만)

---

## 7. 위험

- 정규식 grep 의 false-negative (실제 consumer 누락) → dead-subtree 가 실제 사용 중인 path 삭제 위험. **mitigation**: 보수적으로 prefix/dynamic 카테고리 광범위 산출 + 사용자 dry-run review 의무.
- frontend/src 외부 (예: server-side i18n, scripts) consumer 누락 → 추후 scan-root 확장.
- t() 외 변형 (useTranslation hook 의 t, $t Vue style 등) 누락 → patch08 진입 전 CC 가 grep 으로 변형 확인.

### 7.1 159차 코드베이스 실측 (CC 진입 검증)

- `useTranslation` hook: **0 회 사용** (react-i18next 패턴 부재)
- `i18n.t(`: 0 회 사용
- `$t(`: 0 회 사용 (Vue 패턴 부재)
- `t('...')` / `t("...")`: 다수 (예: Topbar.jsx 만 51회)
- `` t(`prefix.${...}`) ``: 일부 (예: AIBudgetAllocator.jsx 4회)
- 결론: **plain `t()` 단일 패턴**. spec §3.3 정규식으로 충분. i18n.t/$t 패턴은 유지 (호환성).

---

**spec 종결.**