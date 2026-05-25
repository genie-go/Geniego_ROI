# Session 159 — P4-depth2 ko dead-subtree enumeration

> **세션**: 159 (P4 후속, 동일 세션 연속)
> **선행**: P4 top-level (141 root 전부 live, delete=0)
> **목적**: 2-depth path 후보로 dead-subtree 재발굴

---

## 1. 배경

P4 결과: 141 top-level root 전부 `verdict=do_not_delete`. detector 가 root path 의 어딘가에서 consumer 1건이라도 발견하면 live 판정. top-level granularity 로는 무용.

가설: 2-depth (`auth.login`, `dash.kpi`, `pages.orderHub` 등) 에서는 일부 subtree 가 진짜 unused. 159차 P4-depth2 가 이를 검증.

---

## 2. 작업 정의

### 2.1 2-depth root enumeration

`tools/p4_root_enumerator.mjs` 확장 또는 신규 `tools/p4_root_enumerator_depth2.mjs`:

```javascript
// ko.js AST 로드
// for each top-level key K:
//   if K is object:
//     for each child key K2:
//       if K[K2] is object:
//         emit `${K}.${K2}`
// sort, unique
```

예상 출력 규모: 141 top-level × 평균 ~10 child object = ~1,000~2,000 depth2 paths. 정확 수치는 CC 가 실행 후 보고.

### 2.2 pipeline 재사용

`tools/p4_dead_subtree_dryrun.sh` 가 enumerator output 을 단순히 받으므로, **enumerator 만 교체** 하면 나머지 pipeline (detector / aggregator / summary) 그대로 동작.

옵션 A: `p4_dead_subtree_dryrun.sh` 에 `--depth <N>` flag 추가 (default 1)
옵션 B: 별도 스크립트 `p4_dead_subtree_dryrun_depth2.sh`

**선택**: 옵션 A (flag 추가, 재사용성 ↑). enumerator 가 depth 인자 받음.

### 2.3 출력 분리

`session159_dead_subtree_depth2/` 별도 디렉토리.

---

## 3. 구현

### 3.1 enumerator 확장

`tools/p4_root_enumerator.mjs` 의 시그니처에 depth 인자 추가:

```bash
node tools/p4_root_enumerator.mjs <locale-path> [--depth N]
```

depth=1: 기존 동작 (top-level only)
depth=2: top-level.child object key 들도 포함 (또는 depth=2 만)

선택: **depth=2 는 depth=2 만 출력** (top-level 은 P4 에서 이미 검증). 명확한 분리.

### 3.2 runner script

`tools/p4_dead_subtree_dryrun.sh` 에 `--depth N` flag + OUT_DIR 분기:
```bash
OUT_DIR="session159_dead_subtree${DEPTH:+_depth$DEPTH}"
```

depth=1 (default) → `session159_dead_subtree/`
depth=2 → `session159_dead_subtree_depth2/`

### 3.3 detector --root 검증

depth-2 path (`auth.login`) 를 detector 가 root 로 받아 처리하는지 확인. CC 가 한 케이스 수동 테스트:
```bash
node tools/triage.mjs --locale ko --mode dead-subtree --root "auth.login" --json /tmp/test.json
```

지원되면 진행. 미지원 시 즉시 중단 + 보고 → detector 보강 또는 별도 트랙.

---

## 4. acceptance 기준

- [ ] `tools/p4_root_enumerator.mjs` 에 `--depth N` flag (또는 별도 도구)
- [ ] depth=2 enumeration 작동 확인 (수십~수천 paths 산출)
- [ ] detector 가 depth-2 path 를 root 로 받아 처리 검증
- [ ] `tools/p4_dead_subtree_dryrun.sh` 에 `--depth N` flag
- [ ] 실행 → `session159_dead_subtree_depth2/` 산출
- [ ] SUMMARY.md 생성, 위험 신호 (spec §6) 적용
- [ ] commit 분리: A (enumerator + runner 확장), B (SUMMARY.md)
- [ ] push + CI green
- [ ] 회귀 검증: collision 16/16, wronglang 8/8, dead-subtree dual-mode
- [ ] ko.js 절대 불변

---

## 5. 가능한 결과 시나리오

### 시나리오 A: 일부 depth-2 path 가 dead 판정
- delete 후보 > 0 → manifest 4-step 가 실제로 동작
- 사용자 review 후 실 apply 트랙 진입 가능

### 시나리오 B: depth-2 도 모두 live
- 깊은 granularity (depth=3) 또는 leaf-level 직접 검사 필요
- detector L1~L4 분석 자체의 over-broad 가능성 → manifest precision 보다 detector 개선 우선

### 시나리오 C: detector 가 depth-2 path 미지원
- 별도 detector 확장 트랙
- 또는 leaf-level grep 기반 dead path 발굴 (manifest 활용)

CC 가 어느 시나리오인지 보고. 시나리오 C 만 즉시 중단 + 별도 협의.

---

## 6. 비-목표

- 실제 apply (사용자 review 필수)
- depth=3 이상 (별도; depth=2 결과 보고 결정)
- non-ko locale

---

## 7. 위험

- depth-2 path 수가 너무 많아 detector 실행 시간 폭증 → 처음 N (예: 100) 만 진행 후 trend 파악
- detector 가 depth-2 root 를 거부할 가능성 (위 시나리오 C)
- manifest 의 prefix entries 가 depth-2 path 보호 → 적절한 차단이지만 delete=0 가능성 ↑

---

**spec 종결.**