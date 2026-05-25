# Session 159 — P4-depth3 ko dead-subtree enumeration

> **세션**: 159 (P4-depth2 후속)
> **선행**: P4-depth1 (141 root, delete=0), P4-depth2 (120 paths, delete=73, est Δ -11,390)
> **목적**: depth=3 path 후보로 dead-subtree 정밀화 발굴

---

## 1. 배경

P4-depth2 가 73 dead candidates 발굴. 시나리오 A 확정. 다만:
- depth=2 의 47 skip 중 26건이 manifest prefix consumer 차단 → 해당 parent 의 일부 child 는 죽었을 가능성
- depth=2 dead 27건이 >50 leaves → 일부 leaf subset 만 dead 일 수 있음
- 더 정밀한 (smaller, safer) apply candidate 발굴 가능

depth=3 enumeration 으로 위 가설 검증.

---

## 2. 작업 정의

### 2.1 depth=3 enumeration

기존 `tools/p4_root_enumerator.mjs` 의 `--depth N` flag 활용. depth=3 모드는 `parent.child.grandchild` 형식 (단, 모두 object).

예: `pages.marketingIntel.banner`, `ruleEnginePage.wms.config` 등.

### 2.2 pipeline 재사용

기존 `tools/p4_dead_subtree_dryrun.sh --depth 3` 으로 그대로 호출 가능. 출력은 `session159_dead_subtree_depth3/`.

### 2.3 시간 예측

depth=2 = 120 paths × 1.6s ≈ 3.2분.
depth=3 예상: 120 × ~5 child = ~600 paths × 1.6s ≈ 16분.

처음 진입 시 enumerator 만 실행하여 실제 count 보고 → 너무 많으면 (>1000) 사용자 협의 옵션 추가.

### 2.4 산출

- `session159_dead_subtree_depth3/SUMMARY.md` — tracked
- verdict CSV / plan JSON — gitignore (기존 패턴 재사용)

---

## 3. 비교 분석 (depth1 / depth2 / depth3)

SUMMARY.md 에 비교 섹션 추가:

| Depth | paths | safe_to_delete | delete | manifest prefix block | est Δ leaves |
|---:|---:|---:|---:|---:|---:|
| 1 | 141 | 0 | 0 | 0 | 0 |
| 2 | 120 | 99 | 73 | 26 | -11,390 |
| 3 | ? | ? | ? | ? | ? |

이 표로 사용자 점진 apply 의사결정 데이터 제공.

---

## 4. acceptance 기준

- [ ] enumerator depth=3 동작 확인 (path count 보고)
- [ ] path count >1000 시 사용자 협의 (default 진행 OK, 단 진행 결정 명시)
- [ ] runner `--depth 3` 실행 → `session159_dead_subtree_depth3/` 산출
- [ ] SUMMARY.md 생성 + 비교 섹션 (depth1/2/3) 포함
- [ ] commit 분리: A (runner 변경 있으면), B (SUMMARY.md)
- [ ] push + CI green
- [ ] 회귀 검증: collision 16/16, wronglang 8/8, dead-subtree dual-mode
- [ ] ko.js 절대 불변

---

## 5. 가능 시나리오

### A: depth=3 가 추가 dead 발굴 (depth=2 보다 ↑)
- 더 정밀한 candidate 풀 → 사용자 review 시 작은 단위 apply 가능
- 다음 트랙: depth=4 또는 사용자 의사결정

### B: depth=3 가 depth=2 와 거의 동일 (포화)
- enumeration 깊이의 한계 도달
- 다음 트랙: 사용자 의사결정 (점진 apply) 또는 detector 개선

### C: depth=3 가 오히려 적게 발굴 (manifest prefix 가 더 차단)
- manifest precision 이 잘 작동 (false-positive 보호 강화)
- depth=2 후보가 안전한 선택지

---

## 6. 비-목표

- 실제 apply (사용자 review 필수)
- depth=4 이상 (depth=3 결과 보고 결정)
- non-ko locale

---

## 7. 위험

- enumeration path 수 폭증 → 메모리 / 실행 시간 폭증. enumerator 시점에서 count 보고 후 진행.
- detector 가 깊은 path 에서 비정상 종료할 가능성 → FAILED_ROOTS 카운팅 + SUMMARY 명시.
- depth=3 path 중 일부는 leaf object {a:1, b:2} 같은 작은 단위 → leaf_count 0 또는 1 케이스 정상 처리 확인.

---

**spec 종결.**