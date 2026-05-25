# Session 159 — P4 ko dead-subtree dry-run (manifest applied)

> **세션**: 159 (resolver manifest 후속)
> **선행**: patch07 (dead-subtree apply, manifest 통합 완료), resolver_consumer_manifest v1
> **목적**: ko 의 dead-subtree 실제 후보를 detector + manifest 결합으로 산출, dry-run plan + SUMMARY 생성 (실 apply 는 사용자 결정 후)

---

## 1. 배경

158 인계서 §3.2.1 의 P4 dead-subtree apply 트랙. 159차 patch07 + manifest 통합으로 도구 production-ready 도달. 이제 실제 ko 데이터에서 dry-run 가능.

**핵심 제약**: `tools/triage.mjs --mode dead-subtree` 는 `--root <path>` 필수 (single-root 검사). multi-root enumeration 은 외부 책임. 이 트랙이 그 책임을 다룬다.

---

## 2. 작업 정의

### 2.1 ko top-level root 후보 enumeration

ko.js 의 `export default { ... }` 의 1단계 key 들을 detector root 후보로 사용. 예:
```
auth, dash, pages, orderHub, statusShipped, common, ...
```

도구: `tools/p4_root_enumerator.mjs` 신규 또는 inline (단순 AST top-level keys 추출).

### 2.2 각 root 에 대해 detector 실행

```bash
for root in $ROOTS; do
  node tools/triage.mjs \
    --locale ko --mode dead-subtree \
    --root "$root" \
    --csv "session159_dead_subtree/ko_${root}_verdict.csv" \
    --quiet
done
```

detector 의 verdict 컬럼 (`safe_to_delete`, `do_not_delete`) 가 1차 분류. 추가 보호는 manifest.

### 2.3 verdict CSV 합산

모든 verdict CSV → 단일 `session159_dead_subtree/ko_all_verdicts.csv` 로 결합. header 1회 + 각 row 합.

### 2.4 dry-run plan 생성

```bash
node tools/triage_apply.mjs \
  --locale ko --detector dead-subtree \
  --input session159_dead_subtree/ko_all_verdicts.csv \
  --target frontend/src/i18n/locales/ko.js \
  --resolver-manifest tools/resolver_consumer_manifest.json \
  --out session159_dead_subtree/ko_plan.json
# --apply 없음 = dry-run
```

### 2.5 SUMMARY 보고서

`session159_dead_subtree/SUMMARY.md`:

| 항목 | 값 |
|---|---:|
| ko top-level roots 검사 | N |
| 총 verdict rows | M |
| verdict=safe_to_delete | X |
| verdict=do_not_delete | Y |
| manifest 검증 통과 (실제 delete 후보) | Z |
| manifest 검증 차단 (direct/prefix/dynamic) | W |
| AST drift 차단 | V |
| dry-run total estimated leaf delta | -L |

표 + top 10 delete candidate (root_path + subtree_leaf_count + verdict + manifest 결과).

---

## 3. 구현

### 3.1 스크립트

`tools/p4_dead_subtree_dryrun.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

LOCALE="ko"
LOCALE_PATH="frontend/src/i18n/locales/${LOCALE}.js"
OUT_DIR="session159_dead_subtree"
MANIFEST="tools/resolver_consumer_manifest.json"
mkdir -p "$OUT_DIR"

# Step 1: top-level roots enumeration
ROOTS=$(node tools/p4_root_enumerator.mjs "$LOCALE_PATH")
echo "Roots: $(echo "$ROOTS" | wc -w)"

# Step 2: per-root detector
> "$OUT_DIR/ko_all_verdicts.csv"
HEADER_WRITTEN=0
for root in $ROOTS; do
  CSV="$OUT_DIR/ko_${root}_verdict.csv"
  node tools/triage.mjs --locale "$LOCALE" --mode dead-subtree \
    --root "$root" --csv "$CSV" --quiet || true
  if [[ -f "$CSV" ]]; then
    if [[ $HEADER_WRITTEN -eq 0 ]]; then
      cat "$CSV" >> "$OUT_DIR/ko_all_verdicts.csv"
      HEADER_WRITTEN=1
    else
      awk 'NR>1' "$CSV" >> "$OUT_DIR/ko_all_verdicts.csv"
    fi
  fi
done

# Step 3: dry-run plan
node tools/triage_apply.mjs \
  --locale "$LOCALE" --detector dead-subtree \
  --input "$OUT_DIR/ko_all_verdicts.csv" \
  --target "$LOCALE_PATH" \
  --resolver-manifest "$MANIFEST" \
  --out "$OUT_DIR/ko_plan.json" >/dev/null

# Step 4: summary
node tools/p4_summary.mjs "$OUT_DIR" > "$OUT_DIR/SUMMARY.md"
echo "Done. See $OUT_DIR/SUMMARY.md"
```

### 3.2 도구 신규

- `tools/p4_root_enumerator.mjs` — ko.js AST 의 top-level keys 출력 (newline-separated)
- `tools/p4_summary.mjs` — verdict CSV + plan JSON → SUMMARY.md 생성

### 3.3 gitignore 정책

- `session159_dead_subtree/*_verdict.csv` — local artifact (gitignore)
- `session159_dead_subtree/ko_all_verdicts.csv` — local (gitignore)
- `session159_dead_subtree/ko_plan.json` — local (gitignore)
- `session159_dead_subtree/SUMMARY.md` — tracked

---

## 4. acceptance 기준

- [ ] `tools/p4_root_enumerator.mjs` 신규
- [ ] `tools/p4_dead_subtree_dryrun.sh` 신규
- [ ] `tools/p4_summary.mjs` 신규
- [ ] 도구 실행 → ko top-level roots N, verdict CSV, plan JSON, SUMMARY.md 생성
- [ ] SUMMARY.md 본문을 검수자가 화면 출력
- [ ] commit 분리 (또는 통합): A (도구 3개 + .gitignore), B (SUMMARY.md)
- [ ] push + CI green
- [ ] ko.js 절대 불변 (dry-run only, --apply 금지)
- [ ] manifest / patch07 회귀 검증 (collision 16/16, wronglang 8/8, dead-subtree dual-mode)

---

## 5. 비-목표

- 실제 dead-subtree apply (사용자 SUMMARY review 후 별도 트랙)
- non-ko locale 처리 (별도)
- manifest 보강 (현 ko-only manifest 그대로 사용)

---

## 6. 위험 신호 (SUMMARY 에 경고)

- delete 후보가 0 → manifest 가 과보호 (false-positive 보호) 또는 detector 가 거의 모두 do_not_delete
- delete 후보가 >100 → 사용자 review 부담 ↑, 분할 apply 권장
- subtree_leaf_count >50 인 단일 path → 대규모 삭제 위험, 별도 확인

---

## 7. 위험 (CC 진입 전 확인)

- detector --root <path> 사용 시 root 가 ko 의 실제 top-level key 인지 검증 필요. 없으면 detector error.
- 일부 root 가 leaf value (object 아닌 string) 인 경우 detector 처리 방식 — CC 가 확인 후 skip 처리
- p4_root_enumerator 의 출력 순서 안정 (sort)

---

**spec 종결.**