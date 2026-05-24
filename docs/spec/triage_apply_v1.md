# tools/triage_apply.mjs v1 Spec

> **세션**: 158차
> **원칙**: N-157-A 4-tier (Tier 1 Applier)
> **선행 자산**: tools/triage.mjs (157차)
> **상태**: spec draft, 구현 대기

---

## 1. 목적

triage.mjs detector 의 CSV/JSON 출력을 입력으로, **안전 deletion plan 생성 및 (사용자 명시 승인 시) 적용**. 156 step C/D/E + 157 perf/attrib purge 의 transactional 5-gate 패턴 영구화.

## 2. 비목표

- Sacred locale (ja, zh) write — N-79 violation, 차단
- mojibake mode 처리 — false-positive 비율 높음 (157 vi 127 중 122 context_required), 별도 도구
- canonical 결정 자동화 — 외부 의존, 도구 범위 외
- merge / reorder / rename — 본 도구는 **delete-only**

## 3. 입력

| Flag | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `--locale <name>` | yes | — | ko, en, id, etc. ja/zh 입력 시 abort (N-79) |
| `--detector <mode>` | yes | — | `collision` \| `wrong-language` \| `dead-subtree` |
| `--input <path>` | no | auto | CSV path. 미지정 시 triage.mjs 즉시 실행 |
| `--severity <level>` | no | `forbidden` | `forbidden` \| `warn` \| `all` |
| `--apply` | no | false | 미지정 시 100% dry-run |
| `--yes` | no | false | `--apply` 와 결합 시 interactive confirm 생략 (CI 용) |
| `--out <path>` | no | `triage_apply_plan_<locale>_<detector>.json` | plan 출력 경로 |

## 4. 출력 — Deletion Plan JSON

```json
{
  "version": 1,
  "tool": "triage_apply",
  "generated_at": "ISO8601",
  "input": {
    "locale": "ko",
    "detector": "collision",
    "csv": "session157_collisions/ko.csv",
    "row_count": 21
  },
  "decisions": [
    {
      "row_index": 0,
      "key_path": "performance",
      "kind": "block",
      "action": "delete",
      "rationale": "last-wins: earlier declaration at line 12538 superseded by line 39842",
      "target": { "file": "frontend/src/i18n/locales/ko.js", "line_start": 12538, "line_end": 12562 },
      "safety": { "is_sacred": false, "consumers_grep_count": 0 }
    },
    {
      "row_index": 1,
      "key_path": "attribution",
      "kind": "leaf",
      "action": "skip",
      "rationale": "ambiguous: divergent values, canonical 결정 외부 의존",
      "target": { "file": "...", "line": 14209 }
    }
  ],
  "summary": {
    "delete": 18,
    "skip": 3,
    "estimated_leaf_delta": -18,
    "estimated_size_delta_bytes": -640
  },
  "gates": {
    "pre_size": 1441177,
    "pre_leaves": 30656,
    "pre_ja_sha": "67ca0865...",
    "pre_zh_sha": "a4b72633..."
  }
}
```

## 5. Decision Rules (detector 별)

### 5.1 collision

| 상황 | Action | Rationale |
|---|---|---|
| `status=identical` (동일 값 duplicate) | delete (앞쪽 보존, 뒤쪽 제거) | 무손실 |
| `status=divergent` + last 가 더 나중 commit | delete (앞쪽) | last-wins JS 의미론 매치 |
| `status=block_identical` | delete (뒤쪽 block) | 무손실 |
| `status=block_divergent` | **skip** | canonical 결정 필요 |

### 5.2 wrong-language

| 상황 | Action |
|---|---|
| `severity=forbidden` + 단일 char 치환 가능 | (skip — 본 도구 delete-only. 단일 char 치환은 별도 tool 또는 manual) |
| 그 외 | skip |

**참고**: 158차 ko `배송中` 케이스는 **manual edit** 으로 처리. 본 도구 범위 외.

### 5.3 dead-subtree

| 상황 | Action |
|---|---|
| consumer grep count = 0 + resolver prefix retry 검증 통과 | delete |
| consumer grep count > 0 | skip |
| resolver prefix retry 의심 (`pages.*`) | skip + warning |

## 6. 5-Gate Validation (--apply 시)

156 step C/D/E + 157 perf/attrib purge 의 직접 재현:

| Gate | Pre-check | Action 후 Post-check | 실패 시 |
|---|---|---|---|
| **G1 size** | wc -c 기록 | 예상 Δ ± 허용 오차 (8 B) | abort + git checkout |
| **G2 sacred SHA** | ja/zh SHA 기록 | 불변 확인 | **즉시 abort** (N-79 violation 의심) |
| **G3 leaf count** | 30,656 기록 | 예상 Δ 정확히 매치 | abort + rollback |
| **G4 target lines** | sed 로 target 확인 | post 에서 사라짐 확인 | abort + rollback |
| **G5 triage re-run** | pre detector count 기록 | post = pre - delete count | abort + 사용자 reporting |

**Abort 시 rollback**: `git checkout HEAD -- <target file>`. working tree 만 영향, 다른 파일 보존.

## 7. Interactive Confirmation Flow (`--apply` w/o `--yes`)

```
$ node tools/triage_apply.mjs --locale ko --detector collision --apply

[triage_apply v1] Plan summary:
  Locale: ko
  Detector: collision
  Delete: 18 (block_identical: 5, identical: 13)
  Skip: 3 (block_divergent: 3 — canonical 결정 필요)

  Pre-state:
    size: 1,441,177 B
    leaves: 30,656
    ja SHA: 67ca0865...
    zh SHA: a4b72633...

  Expected post-state:
    size: ~1,440,537 B (Δ -640)
    leaves: 30,638 (Δ -18)

  First 3 deletions:
    [1] performance @ line 12538-12562 (block, 24 leaves) — last-wins
    [2] attribution @ line 14209 (leaf) — identical duplicate
    [3] ...

  Plan written to: triage_apply_plan_ko_collision.json

Proceed? [yes/no/diff]:
```

- `yes`: 5-gate validation 후 write
- `no`: abort, plan JSON 만 보존
- `diff`: full plan JSON 출력 후 재질문

## 8. Regression Test

`tools/triage_apply_self_test.sh`:

| Step | 목적 |
|---|---|
| `git stash` | 현재 상태 보존 |
| `git checkout ed3c4a0~1 -- frontend/src/i18n/locales/ko.js` | 21 collisions 시점 재현 |
| `node tools/triage.mjs --locale ko --mode collision --csv /tmp/collision.csv` | detector 실행 |
| `node tools/triage_apply.mjs --locale ko --detector collision --input /tmp/collision.csv --apply --yes` | applier 실행 |
| diff vs ed3c4a0 결과 | invariant: triage_apply 결과 ⊇ 156 ad-hoc 결과 |
| `git checkout HEAD -- frontend/src/i18n/locales/ko.js && git stash pop` | 복원 |

## 9. Hook 통합 (선택)

본 도구는 write 전용이라 hook gate 비도입. 단, `.githooks/pre-commit` 의 G6 collision gate 가 본 도구 결과의 정합성 자동 보장.

## 10. 파일 구조

```
tools/triage_apply.mjs        (~600 lines 예상)
├── parseArgs()
├── loadDetectorOutput()      → CSV/JSON 파싱
├── buildPlan()               → decision rules 적용
├── displayPlanSummary()      → interactive 출력
├── promptConfirm()           → yes/no/diff
├── validateGates(phase)      → G1-G5 (phase: 'pre' | 'post')
├── applyDeletions()          → atomic write per file
├── rollback()                → git checkout HEAD -- <file>
└── main()                    → orchestration
```

**모듈 별 책임**:

| 함수 | 입력 | 출력 | side-effect |
|---|---|---|---|
| `parseArgs` | argv | options object | none |
| `loadDetectorOutput` | csv path | row[] | read fs |
| `buildPlan` | row[], options | plan object | none |
| `displayPlanSummary` | plan | — | stdout |
| `promptConfirm` | plan | 'yes' \| 'no' \| 'diff' | stdin |
| `validateGates` | phase, plan | { ok, failed[] } | read fs + git |
| `applyDeletions` | plan | result object | write fs |
| `rollback` | files[] | — | git checkout |

## 11. 실증 시나리오 (158차 본 작업)

ko 는 현재 collision 0. 본 도구 빈 입력 처리 검증 후, **다른 locale 의 collision 데이터** (session157_collisions/ 의 14 non-ko CSV) 로 dry-run 실증.

| Locale | 157 archive collisions | 본 도구 dry-run 가치 |
|---|---:|---|
| ko | 0 (cleaned) | 빈 케이스 처리 |
| en, ja, zh | (정찰 필요) | sacred 차단 검증 (ja/zh) |
| id, pt, es, fr, de, ru, ar, hi, th, vi, zh-TW | (정찰 필요) | 본 작업 후보 |

dry-run 으로 plan JSON 14개 생성 → 사용자 review → canonical 결정 가능 케이스 우선 apply.

## 12. 진행 단계

| Phase | 분량 | 외부 의존 |
|---|---|---|
| **P1** | parseArgs + loadDetectorOutput + buildPlan (collision only) + displayPlanSummary | 0.3 세션 | 없음 |
| **P2** | promptConfirm + validateGates + applyDeletions + rollback | 0.4 세션 | 없음 |
| **P3** | self-test 스크립트 + regression 검증 | 0.2 세션 | 없음 |
| **P4** | wrong-language / dead-subtree detector 확장 | 별도 세션 | 사용자 결정 |
| **P5** | 14 non-ko locale dry-run + plan review | 0.5 세션 | 사용자 canonical |

158차 목표: **P1 + P2 + P3 = 1 세션 분량** (collision detector 만).

## 13. 운영 원칙 준수

- N-79: sacred ja/zh write 차단 (Gate G2 + locale flag 검증)
- N-145-G: dry-run default, apply 명시 필요
- N-152-G: 종결은 사용자 결정
- N-153-D: recon (dry-run) 과 cleanup (--apply) 분리
- N-154-B: CC Edit tool 우선 (본 도구 구현 시)
- N-156-A: 추가 트랙 적극 진행
- **N-157-A**: detector 패턴 영구 도구화의 Tier 1 (applier)

---

**스펙 종결.**