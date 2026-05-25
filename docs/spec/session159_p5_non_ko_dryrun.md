# Session 159 — P5 14 non-ko locale dry-run

> **세션**: 159 (patch05 후속)
> **선행**: 156차 detector run (session157_collisions/ 14 CSV 생성), 158/159 triage_apply 도구 완성 (5-gate)
> **목적**: 14 non-ko locale 의 collision plan dry-run 일괄 생성 + 사용자 review 용 집계 보고

---

## 1. 배경

156차에 detector 가 14 non-ko locale 의 collision 을 `session157_collisions/<locale>_collisions.csv` 로 산출. 158/159 까지 ko 만 도구 검증 (ed3c4a0~1 baseline) 으로 진행했고 non-ko 는 미적용. patch03/04/05 까지 5-gate 완성 (G1/G2/G3/G4/G5) 된 지금, **apply 는 보류하고 dry-run plan 만 일괄 생성** 하여 사용자가 14 locale × delete 분포를 한눈에 보고 canonical 결정을 내리도록 한다.

apply 진행은 사용자 결정 후 별도 트랙.

---

## 2. 작업 정의

### 2.1 14 non-ko locale

ko 와 sacred (ja/zh) 제외한 모든 locale:
`ar, de, es, fr, hi, id, it, ms, nl, pl, pt, ru, th, tr, vi` 중 14개 (실제 session157_collisions/ 디렉토리 기준).

### 2.2 입력

- 디렉토리: `session157_collisions/`
- 파일 패턴: `<locale>_collisions.csv` (or 유사 — 실제 파일명 ls 로 확인)

### 2.3 출력

- 디렉토리: `session159_plans/` (gitignore 대상 또는 tracked — 사용자 결정. 기본 gitignore + report 만 tracked)
- 파일 패턴: `<locale>_plan.json`
- 추가 산출: `session159_plans/SUMMARY.md` — 14 locale 집계표

### 2.4 dry-run 명령 (per locale)

```bash
node tools/triage_apply.mjs \
  --locale <locale> --detector collision \
  --input session157_collisions/<locale>_collisions.csv \
  --target frontend/src/i18n/locales/<locale>.js \
  --out session159_plans/<locale>_plan.json
# --apply 없음 = dry-run
```

---

## 3. 집계 보고서 (SUMMARY.md)

### 3.1 표 형식

| locale | pre_collisions (unique paths) | delete count | estimated Δ | block deletes | leaf deletes | demoted (shadowed) |
|---|---:|---:|---:|---:|---:|---:|
| ar | … | … | … | … | … | … |
| … | | | | | | |
| **TOTAL** | … | … | … | … | … | … |

### 3.2 추가 정보

- pre_size / pre_leaves 각 locale
- 잠재적 위험 신호 (예: estimated Δ 가 비정상적으로 큰 locale, block delete 비율 높음)
- 검수자 코멘트 섹션 (apply 진행 권장 우선순위)

---

## 4. 구현 절차

### 4.1 스크립트 작성

`tools/p5_non_ko_dryrun.sh` (영구 tool 또는 일회성 — 일회성 권장. 결과만 commit).

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

LOCALES_DIR="frontend/src/i18n/locales"
CSV_DIR="session157_collisions"
OUT_DIR="session159_plans"
mkdir -p "$OUT_DIR"

# CSV 디렉토리에서 locale 추출
for csv in "$CSV_DIR"/*_collisions.csv; do
  locale=$(basename "$csv" _collisions.csv)
  if [[ "$locale" == "ko" || "$locale" == "ja" || "$locale" == "zh" ]]; then
    continue
  fi
  target="$LOCALES_DIR/$locale.js"
  if [[ ! -f "$target" ]]; then
    echo "SKIP $locale (no target file)"
    continue
  fi
  echo "→ $locale"
  node tools/triage_apply.mjs \
    --locale "$locale" --detector collision \
    --input "$csv" --target "$target" \
    --out "$OUT_DIR/${locale}_plan.json" >/dev/null
done

# 집계
node tools/p5_summary.mjs "$OUT_DIR" > "$OUT_DIR/SUMMARY.md"
echo "Done. See $OUT_DIR/SUMMARY.md"
```

### 4.2 집계 도구 (tools/p5_summary.mjs)

- 인자: plan 디렉토리
- 동작: 각 `*_plan.json` 읽어 gates / summary 추출
- 출력: §3.1 표 형식 markdown (stdout)

### 4.3 sacred / ko 불변 보장

- 14 locale 만 처리, ja/zh/ko 명시적 skip
- dry-run 이므로 파일 수정 없음 (도구 자체가 `--apply` 없이 plan JSON 만 산출)
- pre-commit hook G2 통과 (sacred SHA 미변경)

---

## 5. acceptance 기준

- [ ] `tools/p5_non_ko_dryrun.sh` 작성 (또는 inline bash)
- [ ] `tools/p5_summary.mjs` 작성
- [ ] 14 plan JSON 생성 (session159_plans/)
- [ ] SUMMARY.md 생성 + 14 row + TOTAL row 포함
- [ ] commit: `feat(tools): P5 non-ko 14 locale dry-run + summary (session 159)`
- [ ] push + CI green (도구 추가만, 프로덕션 영향 없음)
- [ ] 사용자 review 용 SUMMARY.md 본문을 검수자가 화면에 출력

---

## 6. 비-목표

- apply 실행 (사용자 canonical 결정 후 별도 트랙)
- ja/zh sacred locale 처리 (N-79 / N-15)
- non-ko translation 품질 검증

---

## 7. 위험 신호 트리거 (검수자 판단)

다음 경우 검수자가 사용자에게 명시 보고:
- estimated_leaf_delta < -1000 (대규모 삭제)
- block delete 가 leaf delete 보다 많은 locale
- pre_collisions 가 ko (21) 의 10배 이상
- demoted (shadowed) 비율이 50% 초과

---

**spec 종결.**