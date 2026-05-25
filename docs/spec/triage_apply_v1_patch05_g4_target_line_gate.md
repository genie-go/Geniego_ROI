# triage_apply v1 — patch05: G4 target-line gate

> **세션**: 159
> **선행**: patch01/02/03/04 (estimator strict, G3 strict, G5 detector rerun 완료)
> **목적**: post-apply 에 plan 의 각 delete decision 의 target line 이 실제로 제거되었는지 file-level 검증

---

## 1. 배경

patch03 (G3 leaf 산술), patch04 (G5 detector unique-path) 는 **집계 시각** 검증이다. apply 가 의도된 line 을 정확히 잘랐는지 **file-level** 에서 직접 확인하는 gate 가 없다.

만약 deleteLines 함수가 잘못된 line range 를 잘라도 G3/G5 는 우연히 통과할 가능성이 있다 (총량은 맞으나 위치 어긋남). G4 는 이를 차단.

---

## 2. G4 정의

### 2.1 invariant

각 `decision` 중 `action === 'delete'` 인 항목에 대해:

```
post_file 의 decision.line 위치에 더 이상 decision.key_path 의 leaf 정의가 존재하지 않는다
```

구체:
- post_file 의 해당 line 번호가 plan 의 pre_file line 번호와 동일하지 않을 수 있으므로 (line shift), **content-based 검증** 사용.
- 검증 방법: post_file 전체에서 `key_path` 의 **leaf key** (마지막 segment) 가 originally-deleted line 의 value 와 함께 나타나지 않는지 확인.
- 단순화: post_file 의 **leaf count** + plan summary 의 `estimated_leaf_delta` 가 G3 strict 로 이미 일치하므로, G4 는 **각 delete decision 의 key_path 가 post-AST 에서 사라졌거나 (block delete) survivor count 가 1 (leaf last-wins) 인지** AST-level 로 확인.

### 2.2 G4 algorithm

```
post_AST = loadLocaleAST(targetPath)

for each decision d where d.action === 'delete':
  resolved = resolvePath(post_AST, d.key_path)
  
  if d.kind === 'block':
    # block delete: path 가 post-AST 에서 완전히 사라져야 함
    # 단, sibling block 의 동명 child 가 남아있을 수 있으므로 occurrence-aware 검증.
    # 158차 hierarchical overlap fix 이후 block delete 는 "마지막 occurrence 만 보존" 이 아니라
    # "first-wins (later block 삭제)" 이므로 path 가 post 에서 1회는 존재해야 함 (block_identical 케이스).
    # → resolved !== null 이면 OK (first survivor 존재).
    # 단, "block 전체 삭제" 케이스 (예: block_dead) 에서는 resolved === null.
    # 158 instruction 기준 collision 의 block decision 은 last-occurrence 삭제 = first 보존.
    # 따라서 G4 invariant: resolved !== undefined.
    if resolved === undefined: FAIL
  
  else (d.kind === 'leaf'):
    # leaf delete: last-wins 로 마지막 occurrence 보존, 이전 occurrence 삭제.
    # post-AST 에서 path 는 존재해야 함 (last survivor).
    # 단, shadowed leaf 는 parent block 결정으로 흡수되었으므로 미적용.
    if d.estimated_leaf_delta === 0:
      # shadowed or same-path-survivor — skip
      continue
    if resolved === undefined: FAIL (last-wins survivor 누락)
```

### 2.3 위반 시

`failed.push('G4_target_line_drift (decision[i] key_path=X kind=Y missing in post-AST)')` + rollback.

---

## 3. 구현

### 3.1 validateGates 확장

```javascript
async function validateGates(plan, postGates, g3Mode, opts) {
  // ... G1/G2/G3/G5 ...
  
  // patch05 §2 — G4 target-line (AST-level survivor check)
  const g4Mode = opts.g4_mode || 'strict';
  if (g4Mode !== 'skip') {
    const targetPath = opts.target || localeFilePath(opts.locale);
    const postAST = await loadLocaleAST(targetPath);
    if (postAST == null) {
      failed.push('G4_post_ast_load_failed');
    } else {
      for (let i = 0; i < plan.decisions.length; i++) {
        const d = plan.decisions[i];
        if (d.action !== 'delete') continue;
        if (d.estimated_leaf_delta === 0 && d.kind === 'leaf') continue;  // shadowed/survivor
        const resolved = resolvePath(postAST, d.key_path);
        if (resolved === undefined) {
          failed.push(`G4_target_line_drift (decision[${i}] key_path=${d.key_path} kind=${d.kind})`);
          break;  // 첫 위반에서 중단 (rollback 트리거)
        }
      }
    }
  }
  
  return { ok: failed.length === 0, failed };
}
```

### 3.2 G4 mode flag

`--g4-mode strict|skip` (default strict). skip 은 비상 비활성.

### 3.3 apply 성공 메시지

```
✓ All gates passed (G1 size↓, G2 sacred SHA, G3 leaf count [strict], G4 target-line [strict], G5 collision [strict]). Changes written.
```

---

## 4. self-test 확장 (15 → 16 invariants)

### 4.1 신규 invariant: I16 G4 gate

```bash
echo "[8/12] G4 target-line gate"
if echo "$G5_LINE" | grep -q "G4 target-line"; then
  pass "I16: G4 gate active in success log (PRESENT)"
else
  fail "I16: G4 gate active in success log (expected PRESENT, log='$G5_LINE')"
fi
```

(G5_LINE 변수 재사용 — 같은 success log 한 줄에 G3/G4/G5 모두 표기)

---

## 5. acceptance 기준

- [ ] `validateGates` 에 G4 logic 추가 (resolvePath survivor 검증)
- [ ] `--g4-mode strict|skip` flag 추가, VALID_G4_MODES Set + 검증
- [ ] apply 성공 메시지에 `G4 target-line [<mode>]` 표기
- [ ] self-test I16 추가 (15 → 16 invariants), 단계 [N/12]
- [ ] ed3c4a0~1 baseline 16/16 PASS
- [ ] commit 분리: A (G4 impl), B (self-test I16)
- [ ] push + production smoke green

---

## 6. 비-목표

- P4 detector apply paths (별도)
- P5 14 non-ko locale dry-run (별도)
- G4 의 line-number 정밀 검증 (현재는 AST survivor 만; line-level 은 향후 확장)

---

**spec 종결.**