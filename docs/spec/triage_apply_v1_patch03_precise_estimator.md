# triage_apply v1 — patch03: precise estimator + strict G3 promotion

> **세션**: 159
> **선행**: patch01 (P1 collision dry-run), patch02 (hierarchical overlap), 158차 spec §5.1.3 safety-net G3
> **목적**: §5.1.2 precise estimator 완성 → G3 safety-net → strict 졸업

---

## 1. 배경

158차 P2 는 G3 을 **safety-net mode** (loss-only) 로 도입했다. estimator 가 leaf-shadowed / block_identical 케이스에서 부정확하여 strict equality 비교 시 false positive 위험. 159차에서 이 두 케이스를 정밀화하고 strict G3 으로 졸업한다.

---

## 2. estimator 결함 (158 baseline)

### 2.1 leaf-shadowed (Δ 부정확)

**현 동작**: leaf decision 이 parent block decision 에 의해 demote 된 경우 (hierarchical overlap fix), estimator 가 demoted leaf 를 여전히 카운트하여 Δ 과대 계산.

**정확값**: Δ=0 (block decision 이 leaf 포함 → 별도 차감 없음)

### 2.2 block_identical (Δ 부정확)

**현 동작**: block decision 의 Δ 를 -1 로 일괄 처리 (block = 1 leaf 가정).

**정확값**: Δ = -(block 내 leaf 수). hierarchical block 은 N leaves 를 포함하므로 N 단위 차감.

---

## 3. precise estimator 구현

### 3.1 함수 시그니처

```javascript
function estimateLeafDelta(decisions, srcAST) {
  // decisions: triage_apply 의 normalized decisions array
  // srcAST: 원본 ko.js AST (leaf count source of truth)
  // returns: { totalDelta: number, perDecision: Map<id, delta> }
}
```

### 3.2 케이스별 Δ 정의

| Decision type | Δ 공식 | 비고 |
|---|---|---|
| `leaf_delete` (단독) | -1 | 기존 그대로 |
| `leaf_delete` (shadowed by block) | 0 | demoted, 계산 제외 |
| `block_identical` | -(countLeavesInBlock) | AST walk 필요 |
| `block_dead` | -(countLeavesInBlock) | 동일 |
| `leaf_keep` | 0 | no-op |
| `block_keep` | 0 | no-op |

### 3.3 shadowing 판정

leaf decision `L` 이 block decision `B` 에 shadowed:
- `L.path` 가 `B.path` 의 prefix descendant
- `B.action` ∈ {`delete`, `dead`}

shadowed leaf 의 Δ 는 **B.Δ 에 흡수** (중복 카운트 방지).

### 3.4 countLeavesInBlock

```javascript
function countLeavesInBlock(blockPath, srcAST) {
  const node = resolvePath(srcAST, blockPath);
  if (!node) return 0;
  return walkLeaves(node).length;
}
```

`walkLeaves` 는 158 P3 `leaf_count.mjs` 의 walker 와 동일 invariant 사용 (cross-tool consistency 보장).

---

## 4. G3 strict promotion

### 4.1 safety-net → strict 전환

**현재 (158)**:
```javascript
if (actualDelta > estimatedDelta) {  // loss-only: actual 이 estimated 보다 더 많이 삭제됨
  abort("G3 safety-net: unexpected loss");
}
```

**159 strict**:
```javascript
if (actualDelta !== estimatedDelta) {  // strict equality
  abort(`G3 strict: actual=${actualDelta} expected=${estimatedDelta}`);
}
```

### 4.2 전환 조건

다음 셋 모두 만족 시 strict 활성:
1. precise estimator 구현 완료 (§3)
2. ed3c4a0~1 baseline 에서 estimated === actual 확인
3. self-test 14번째 invariant 통과

만족 못하면 safety-net 유지 (회귀 방지).

---

## 5. self-test 확장 (13 → 14 invariants)

### 5.1 신규 invariant: I14 precise estimator equality

```bash
# After triage_apply run on ed3c4a0~1 sandbox:
ESTIMATED=$(jq '.estimatedDelta' plan.json)
ACTUAL=$((BEFORE_LEAVES - AFTER_LEAVES))
if [ "$ESTIMATED" != "$ACTUAL" ]; then
  fail "I14: estimator drift (estimated=$ESTIMATED actual=$ACTUAL)"
fi
```

### 5.2 기존 13 invariants 유지

P3 spec 의 I01~I13 그대로 (regression 방지).

---

## 6. acceptance 기준

- [ ] `tools/triage_apply.mjs` estimator 함수 §3.1 시그니처로 교체
- [ ] leaf-shadowed / block_identical Δ 정확 계산
- [ ] G3 strict equality 활성 (safety-net 코드 제거 또는 flag-gate)
- [ ] `tools/triage_apply_self_test.sh` I14 추가 (13 → 14 invariants)
- [ ] ed3c4a0~1 baseline 재실행 → 14/14 PASS
- [ ] CONTRIBUTING.md §7 갱신 (필요 시)
- [ ] commit + push + production smoke green

---

## 7. 비-목표 (159 범위 밖)

- G4 target-line gate (별도 트랙)
- G5 triage-rerun gate (별도 트랙)
- P4 detector apply paths (별도 트랙)
- P5 14 non-ko locale dry-run (별도 트랙)

---

**spec 종결.**