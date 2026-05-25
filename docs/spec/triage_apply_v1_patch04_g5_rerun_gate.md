# triage_apply v1 — patch04: G5 triage-rerun gate

> **세션**: 159
> **선행**: patch01/02/03 (estimator strict, G3 promotion 완료)
> **목적**: post-apply 에 detector 재실행 → collision 감소량이 plan delete count 와 일치 검증

---

## 1. 배경

patch03 G3 가 leaf count 의 산술 정합성을 보장하지만, **detector 시각의 collision 해소 검증은 별도**. apply 가 의도된 collision 만 정확히 제거했는지 확인하려면 post-apply 에 detector 를 재실행하여 collision count 변화량을 plan 의 collision-targeted delete 수와 대조해야 한다.

self-test I7 (post detector collision count = 0) 은 ed3c4a0~1 sandbox 한정 동작. **production apply 일반화** 가 필요.

---

## 2. G5 정의

### 2.1 invariant (unique-path semantics)

```
post_unique_collision_paths == pre_unique_collision_paths − collision_delete_paths
```

- `pre_collision_count`: apply 직전 detector CSV 의 unique `path` 수
  (= `new Set(rows.map(r => r.path)).size`)
- `post_unique_collision_paths`: apply 직후 detector 재실행 CSV 의 unique `path` 수
- `collision_delete_count`: plan 이 해소 가능한 unique 충돌 path 집합 크기 (§3.1 IIFE 참조)
  - direct: `decisions` 중 `action === 'delete'` 인 `key_path`
  - shadow: 위 direct 중 `kind === 'block'` 경로의 strict-descendant 인 모든 충돌 path
  - 합집합 크기

**왜 unique-path semantics?**
collision 은 본질적으로 path 현상 (≥2 occurrence at same path). row(occurrence) 수 단위로 빼면
demote/shadow 케이스에서 산술이 일관되지 않음. ed3c4a0~1 baseline 검증
(post unique = 0 → expected = 0) 과 정합.

### 2.2 위반 시

`failed.push('G5_collision_drift (post X !== expected Y)')` + rollback.

### 2.3 ed3c4a0~1 실증

- pre unique paths = 21 (block "graph" 1 + leaves "graph.contribCreative…" 16 + 기타 4)
- direct delete paths = 5 ({graph, dash…colRoas, dash…colSpend, performance, X})
- shadow paths = 16 (graph 의 strict-descendant 인 leaf 충돌 path)
- 합집합 = 21
- expected = 21 − 21 = 0
- 실제 post detector unique paths = 0 ✓

---

## 3. 구현

### 3.1 plan.gates 확장

`buildPlan` 의 `currentGates` 반환에 추가:
```javascript
// patch04 §3.1 — unique-path semantics (occurrence 아닌 path 단위)
// rationale: collision 은 path 현상이고 baseline 검증 (post == 0) 과 정합
pre_collision_count: new Set(rows.map(r => r.path)).size,
collision_delete_count: (() => {
  const resolved = new Set();
  const blockDeletePaths = decisions
    .filter(d => d.action === 'delete' && d.kind === 'block')
    .map(d => d.key_path);
  for (const r of rows) {
    // direct: path 가 delete decision 의 key_path
    const direct = decisions.some(d =>
      d.action === 'delete' && d.key_path === r.path);
    // shadow: path 가 block-delete 의 descendant
    const shadowed = blockDeletePaths.some(bp =>
      r.path !== bp && r.path.startsWith(bp + '.'));
    if (direct || shadowed) resolved.add(r.path);
  }
  return resolved.size;
})(),
```

### 3.2 validateGates 확장

```javascript
async function validateGates(plan, postGates, g3Mode, opts) {
  // ... 기존 G1/G2/G3 ...
  
  // patch04 §2 — G5 triage-rerun
  if (opts.detector === 'collision') {
    const postCsv = `/tmp/triage_apply_g5_${process.pid}.csv`;
    const rerun = spawnSync('node', [
      'tools/triage.mjs',
      '--locale', opts.locale,
      '--mode', 'collision',
      '--src', opts.target || localeFilePath(opts.locale),
      '--csv', postCsv,
      '--quiet',
    ], { encoding: 'utf-8' });
    // triage.mjs: exit 0 = no findings, exit 1 = findings (both ok for G5)
    if (rerun.status !== 0 && rerun.status !== 1) {
      failed.push(`G5_detector_rerun_failed (rc=${rerun.status})`);
    } else {
      const postUniquePaths = countUniqueCollisionPaths(postCsv);  // §2.1
      const expected = plan.gates.pre_collision_count - plan.gates.collision_delete_count;
      if (postUniquePaths !== expected) {
        failed.push(`G5_collision_drift (post ${postUniquePaths} !== expected ${expected})`);
      }
    }
  }
}
```

### 3.3 G5 mode flag

`--g5-mode strict|skip` (default strict). skip 은 회귀 시 비상 비활성용. safety-net 은 정의되지 않음 (G5 는 binary).

### 3.4 detector 비-collision 경우

`wrong-language`, `dead-subtree` 는 158 종결 시점 detector apply path 미구현. G5 는 collision 한정. 향후 patch 에서 일반화.

---

## 4. self-test 확장 (14 → 15 invariants)

### 4.1 신규 invariant: I15 G5 rerun gate

```bash
echo "[7/11] G5 triage-rerun gate"
G5_LINE=$(grep -E 'G5|All gates passed' "$APPLY_LOG" | head -1)
if echo "$G5_LINE" | grep -q "G3 leaf count.*G5 collision"; then
  check "I15: G5 gate active in success log" "PRESENT" "PRESENT"
else
  check "I15: G5 gate active in success log" "ABSENT" "PRESENT"
fi
```

(apply 성공 메시지에 G5 표기 확인. ed3c4a0~1 baseline 은 post collision == 0 이므로 expected == 0 일치)

---

## 5. acceptance 기준

- [ ] `currentGates` 에 `pre_collision_count`, `collision_delete_count` 추가
- [ ] `validateGates` 에 G5 logic 구현 (`spawnSync` triage.mjs)
- [ ] `--g5-mode strict|skip` flag 추가
- [ ] apply 성공 메시지에 `G5 collision` 표기
- [ ] self-test I15 추가 (14 → 15 invariants)
- [ ] ed3c4a0~1 baseline 15/15 PASS
- [ ] commit 분리: A (gates expand + validate), B (self-test I15)
- [ ] push + production smoke green

---

## 6. 비-목표 (159 범위 밖)

- G4 target-line gate (별도)
- P4 detector apply paths
- P5 14 non-ko locale dry-run

---

**spec 종결.**