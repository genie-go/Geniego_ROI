# Resolver consumer manifest v2 — AST-based grep

> **세션**: 159 (manifest v1 + P4-depth3 후속)
> **선행**: manifest v1 (regex 1차, 7,542 direct + 98 prefix + 3 dynamic), P4-depth3 (115 dead candidates)
> **목적**: regex false-negative/positive 가능성 해소 → babel-parser AST 기반 정밀 grep 도입 → manifest 신뢰도 ↑

---

## 1. 배경

manifest v1 (regex) 의 한계:
- 정규식이 코드 컨텍스트 무시 (주석 내 `t('foo')` 도 매칭)
- template literal 의 `${...}` 내부 식별자 추론 못함
- `function t(x)` 같은 변수명 충돌 또는 wrapper 함수 추적 불가
- conditional require / dynamic import 무시

P4-depth3 결과 (115 dead, prefix 차단 23) 의 신뢰도가 manifest 정밀도에 직접 의존. 점진 apply 진입 전 manifest v2 가 필수.

---

## 2. 작업 정의

### 2.1 babel-parser 기반 새 도구

`tools/build_resolver_manifest_v2.mjs` 신규 (v1 보존, 비교 가능).

dependencies: `@babel/parser`, `@babel/traverse` (npm install --save-dev).

### 2.2 AST 패턴 매칭

```javascript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

function extractI18nKeys(code, filepath) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });
  const direct = [], prefix = [], dynamic = [];
  traverse(ast, {
    CallExpression(path) {
      // t(...) 또는 i18n.t(...) 또는 $t(...)
      const callee = path.node.callee;
      const isT = (
        (callee.type === 'Identifier' && callee.name === 't') ||
        (callee.type === 'MemberExpression' && callee.property.name === 't')
      );
      if (!isT) return;
      const arg = path.node.arguments[0];
      if (!arg) return;
      
      // direct: StringLiteral
      if (arg.type === 'StringLiteral') {
        direct.push(arg.value);
      }
      // prefix: TemplateLiteral with leading static prefix
      else if (arg.type === 'TemplateLiteral') {
        const firstQuasi = arg.quasis[0].value.cooked;
        if (firstQuasi && firstQuasi.endsWith('.')) {
          prefix.push(firstQuasi.replace(/\.$/, '') + '.*');
        }
      }
      // dynamic: Identifier
      else if (arg.type === 'Identifier') {
        dynamic.push(arg.name);  // 보수적: 변수명 그대로
      }
    },
  });
  return { direct, prefix, dynamic };
}
```

### 2.3 v1 vs v2 비교

manifest v2 산출 후 v1 과 차이 보고:
- direct: v1 ∩ v2, v1 only, v2 only
- prefix: 동일
- dynamic: 동일

if v2.direct < v1.direct: regex 가 false-positive 산출 (주석/문자열 내 false match)
if v2.direct > v1.direct: regex 가 누락 (예: 멀티라인 호출 인자)

### 2.4 manifest v2 산출 → triage_apply 검증

manifest v2 를 별도 `tools/resolver_consumer_manifest_v2.json` 으로 저장 (v1 그대로 유지).

`triage_apply.mjs --resolver-manifest tools/resolver_consumer_manifest_v2.json` 로 P4-depth2/3 재실행 → delete count 변동 보고.

---

## 3. acceptance 기준

- [ ] `npm install --save-dev @babel/parser @babel/traverse` 또는 dependency 확인
- [ ] `tools/build_resolver_manifest_v2.mjs` 작성
- [ ] frontend/src 전체 스캔 → `tools/resolver_consumer_manifest_v2.json` 생성
- [ ] v1 vs v2 비교 표 (manifest_comparison.md) 생성
- [ ] manifest v2 로 P4-depth2/3 재실행 → 결과 비교
- [ ] commit 분리: A (도구 + dependency), B (manifest v2 산출물), C (비교 보고서), D (depth2/3 v2 재실행 SUMMARY 갱신)
- [ ] push + CI green (paths-ignore 시 skip 정상)
- [ ] 회귀: collision 16/16, wronglang 8/8, dead-subtree dual-mode
- [ ] ko.js 절대 불변

---

## 4. 비-목표

- v1 도구 제거 (보존, 호환성 유지)
- non-ko manifest
- 실제 apply (사용자 결정)

---

## 5. 가능 시나리오

### A: v2 가 v1 보다 정밀 (direct 감소 + dynamic 정확)
- delete candidates 증가 → 더 많은 dead 발굴
- manifest v2 를 default 로 승격

### B: v2 가 v1 보다 보호 강화 (direct 증가 + prefix/dynamic 정확)
- delete candidates 감소 → 안전성 ↑
- 점진 apply 진입 안전

### C: v1 ≈ v2 (차이 미미)
- regex 가 이미 충분히 정확
- 추가 트랙 (depth=4 또는 점진 apply) 진행

---

## 6. 위험

- @babel/parser dependency 충돌 (다른 babel 버전 존재 시)
- AST traverse 가 너무 광범위하여 ko.js 자체를 스캔할 위험 → scan_root 명확히 `frontend/src` (locale 제외)
- TypeScript 파일 parser plugin 설정 누락 시 parse error → errorRecovery: true 로 안전
- conditional require / dynamic import 는 여전히 미탐 → spec §1 의 v1 한계 일부 잔존

---

**spec 종결.**