# triage_apply v1 — patch07: dead-subtree detector apply path

> **세션**: 159
> **선행**: patch01~06 (6-gate, collision + wrong-language apply 완성)
> **목적**: dead-subtree detector 산출물 자동 apply (resolver 미참조 path 삭제)
> **개정**: 159차 patch07. spec §3 의 detector CSV columns 는 CC 첫 단계에서 실제 확인 후 진입 (patch06 학습 적용).

---

## 1. 배경

158 인계서 §3.2.1 의 카테고리. detector 가 i18n resolver 에 의해 참조되지 않는 dead path (block 또는 leaf) 를 산출. apply path 미구현. patch07 으로 완성.

`session157_*` 또는 `session158_*` 디렉토리에 detector 산출물 존재 가정. CC 가 실제 디렉토리 / CSV columns 확인 후 진입.

---

## 2. dead-subtree 의 특징 (collision / wrong-language 와 차이)

| 항목 | collision | wrong-language | dead-subtree |
|---|---|---|---|
| 수정 단위 | line/block 삭제 | char substitution | **path subtree 삭제** |
| leaf count Δ | 음수 | 0 | **음수 (-N)** |
| size Δ | 음수 | ~0 | **음수** |
| key existence post | 변경 | unchanged | **path 완전 제거** |
| resolver consumer | 검증 안 함 | n/a | **검증 필요** (false-positive 방지) |

핵심: dead-subtree 는 collision 과 유사한 size/leaf 감소 패턴이지만, **resolver 미참조** 가 진짜인지 추가 검증 (prefix retry, dynamic key, AST-not-found alias) 필수.

---

## 3. detector CSV format (159차 patch07 실측 + 재정의)

### 3.1 detector 실제 출력 — per-root analysis (multi-candidate 아님)

`tools/triage.mjs --mode dead-subtree --root <dotted.path>` 은 **단일 root** 에 대한 L1/L2/L3/L4 layer 분석만 수행. 출력 CSV columns:
```
locale, root_path, layer, pattern, hit_count, file, line_number, context_preview
```
한 invocation = 한 root × N layers (multi-candidate enumeration 안 함).

### 3.2 patch07 입력 CSV format (verdict aggregation)

multi-candidate enumeration 책임은 patch07 범위 밖. patch07 은 **사전 집계된 verdict CSV** 를 입력으로 받음:

```
locale, root_path, status, verdict, subtree_leaf_count, total_consumers, root_line
"ko","pages.legacy.unused","dead","safe_to_delete","16","0","12345"
"ko","dash.archived","live_dynamic_only","do_not_delete","8","12","8741"
```

각 row = 1 root analyzed. `status` ∈ {dead, dead_uncertain, live_dynamic_only, live}. `verdict` ∈ {safe_to_delete, review_resolver, do_not_delete}.

verdict CSV 생성은 외부 책임 (검수자 수동 또는 별도 enumeration tool).

**159차 patch07 단순화**: 본 트랙은 **plumbing-only** (manifest 부재 시 모든 row skip, apply 0건). 검수자는 verdict CSV 생성 + manifest 통합을 별도 트랙에서 진행 후 dead-subtree apply 활성화.

---

## 4. plan 형식

### 4.1 decision schema

```json
{
  "row_index": 0,
  "detector": "dead-subtree",
  "action": "delete" | "skip",
  "kind": "block" | "leaf",
  "key_path": "pages.legacy.unused",
  "line": 12345,
  "leaf_count": 16,
  "rationale": "dead-subtree (0 resolver refs)" | "skip: prefix-match candidate detected"
}
```

### 4.2 false-positive 방지 알고리즘

```javascript
function buildDeadSubtreePlan(rows, options, srcAST, resolverManifest) {
  const decisions = [];
  for (const r of rows) {
    // Step 1: 정확 참조 확인 (detector 결과 신뢰)
    if (r.resolver_refs > 0) {
      decisions.push({ ...r, action: 'skip', rationale: `has ${r.resolver_refs} direct refs` });
      continue;
    }
    
    // Step 2: prefix retry 검증 (158 학습)
    // 예: 'pages.legacy.unused' 가 resolver 에서 'pages.legacy.*' wildcard 로 참조될 가능성
    const hasPrefixCandidate = checkPrefixMatch(r.path, resolverManifest);
    if (hasPrefixCandidate) {
      decisions.push({ ...r, action: 'skip', rationale: `prefix candidate: ${hasPrefixCandidate}` });
      continue;
    }
    
    // Step 3: dynamic key suspicion (template literal, computed access)
    const dynamicSuspect = checkDynamicSuspect(r.path, resolverManifest);
    if (dynamicSuspect) {
      decisions.push({ ...r, action: 'skip', rationale: `dynamic suspect: ${dynamicSuspect}` });
      continue;
    }
    
    // Step 4: AST 존재 재확인 (CSV ↔ AST drift 방지)
    const resolved = resolvePath(srcAST, r.path);
    if (resolved === undefined) {
      decisions.push({ ...r, action: 'skip', rationale: `path not in current AST (drift)` });
      continue;
    }
    
    // 통과: delete
    decisions.push({ ...r, action: 'delete', rationale: 'dead-subtree (no refs, no prefix, no dynamic)' });
  }
  return decisions;
}
```

### 4.3 resolver manifest

`tools/resolver_consumer_manifest.json` 또는 156/157 기존 산출물 재활용. 없으면 patch07 진입 전 별도 단계로 생성 (별도 spec).

**159차 patch07 단순화**: resolverManifest = null 인 경우 prefix/dynamic 검증 skip + 모든 row 를 `action: skip, rationale: 'manifest unavailable; conservative skip'` 로 처리. 즉 manifest 없으면 dry-run 만 가능, apply 는 항상 0건. 안전 우선.

---

## 5. apply algorithm

### 5.1 block / leaf delete

```javascript
function applyDeadSubtree(localePath, decisions, srcAST) {
  // collision applier (applyDeletions) 의 line-range deletion 로직 재활용 가능 여부 검토.
  // 단, dead-subtree 는 'last-wins' / 'first-wins' 같은 occurrence 선택 없음. 단일 path 단일 occurrence 가정.
  // 다중 occurrence 라면 (block_identical 케이스) detector 가 별도 보고 → skip 권장.
  ...
}
```

### 5.2 안전 조건

- 단일 path 단일 occurrence (다중 시 skip)
- block 삭제 시 child leaves 도 함께 삭제 (line-range)
- AST 재검증 (apply 직전 path 존재 확인)

---

## 6. gate 재정의 (dead-subtree 한정)

| Gate | collision | wrong-language | dead-subtree |
|---|---|---|---|
| G1 size | post < pre | post ≈ pre | **post < pre** |
| G2 sacred SHA | unchanged | unchanged | unchanged |
| G3 leaf count | post == pre + estΔ | strict-zero | **post == pre - sum(leaf_count of deleted)** |
| G4 target-line | survivor | path-preserve | **path-removed** (resolvePath === undefined) |
| G5 detector rerun | unique-path | wronglang count | **dead-subtree count == pre - delete_count** |
| G6 value-content | n/a | strict | n/a |
| **G7 (신규)** resolver-impact | n/a | n/a | **production smoke 후 4xx/5xx 비교** (선택적) |

G7 은 dead-subtree 한정 신규. 단, production smoke 는 CI 외부 검증이므로 self-test 에서는 mock. patch07 §6.1 에 명시.

### 6.1 G7 구현 옵션

- 옵션 A: self-test 에서 skip (apply 까지만 검증)
- 옵션 B: 별도 smoke script 추가 (선택적 추후)

159차 patch07 은 옵션 A (단순화). 옵션 B 는 별도 트랙.

---

## 7. CLI 확장

### 7.1 detector 분기

기존 `if/else if` 체인 확장:
```javascript
if (opts.detector === 'collision') { /* ... */ }
else if (opts.detector === 'wrong-language') { /* ... */ }
else if (opts.detector === 'dead-subtree') { /* patch07 */ }
```

### 7.2 manifest flag

`--resolver-manifest <path>` (optional. 없으면 §4.3 conservative skip).

---

## 8. self-test (별도 파일)

### 8.1 `tools/triage_apply_dead_subtree_self_test.sh`

baseline: 158 인계서 §1.5 에 언급된 `pages.*` 케이스 (resolver prefix retry 검증 필수 사례) 또는 158/159 detector 산출에서 명확한 dead-subtree 1건 선택.

CC 가 진입 전 baseline candidate 보고 → 사용자 승인 후 진행.

invariants (예상 8개):
- D1: detector finds N dead-subtree entries
- D2: plan delete count == expected (manifest 적용 후)
- D3: apply exit 0
- D4: leaf count == pre - sum(deleted leaf_count) (strict)
- D5: post detector dead-subtree count == 0
- D6: deleted paths absent from post-AST
- D7: sacred SHA unchanged
- D8: success log contains dead-subtree gate labels

---

## 9. acceptance 기준

- [ ] CC 가 detector CSV columns 확인 (§3)
- [ ] CC 가 baseline candidate 선정 + 사용자 승인 (§8.1)
- [ ] resolver manifest 존재 / 부재 정책 결정 (§4.3)
- [ ] `tools/triage_apply.mjs` 에 `--detector dead-subtree` 분기
- [ ] `buildDeadSubtreePlan` + 4-step false-positive 검증 (§4.2)
- [ ] `applyDeadSubtree` 함수 (§5.1)
- [ ] `currentGates` 에 dead-subtree 필드
- [ ] `validateGates` dead-subtree 분기 (§6) — G3 leaf-sum, G4 path-removed, G5 dead-subtree rerun
- [ ] apply 성공 메시지에 dead-subtree 모드 gate label
- [ ] `tools/triage_apply_dead_subtree_self_test.sh` 신규 (~8 D-invariants)
- [ ] baseline N/N PASS
- [ ] commit 분리: A (plan + apply impl), B (gates), C (self-test)
- [ ] push + production smoke green
- [ ] ko.js 영향 평가 (이번 트랙은 도구만 또는 실제 cleanup — 사용자 결정)

---

## 10. 비-목표

- non-ko dead-subtree apply (별도)
- resolver manifest 생성 트랙 (별도, 없으면 §4.3 fallback)
- G7 production smoke 자동화 (별도)
- 다중 occurrence dead-subtree (현 spec 단일 가정)

---

## 11. 위험 (CC 진입 전 확인)

- detector CSV columns 가 §3 추정과 다르면 spec 재작성 (patch06 학습 적용)
- resolver manifest 부재 → conservative skip 모드만 동작
- baseline candidate 부재 시 self-test 작성 불가 → 사용자 협의
- 158 인계서 §1.5 pages.* 케이스가 실제 dead-subtree detector 산출에 포함되어 있는지 확인 필요

---

**spec 종결.**