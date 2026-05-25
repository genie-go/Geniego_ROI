# triage_apply v1 — patch06: wrong-language detector apply path

> **세션**: 159
> **선행**: patch01~05 (5-gate collision apply 완성), 158차 ko 수동 fix (배송中 → 배송중) 패턴
> **목적**: wrong-language detector 산출물을 자동 apply (char-level substitution)

---

## 1. 배경

158차에 ko 의 wrong-language 2 leaves (`orderHub.tabShipped`, `orderHub.statusShipped`) 를 수동으로 Han `中` → Hangul `중` 치환. detector 는 있으나 자동 apply path 없음.

`session157_wronglang/<locale>_wronglang.csv` 에 detector 산출물 존재 (159차 P5 작업 시 확인됨). 158차 패턴을 일반화하여 detector → apply 흐름 완성.

---

## 2. wrong-language 의 특징 (collision 과 차이)

| 항목 | collision | wrong-language |
|---|---|---|
| 수정 단위 | line/block 삭제 | leaf value 의 char substitution |
| leaf count Δ | 음수 (-N) | **0** (수정만, 삭제 아님) |
| size Δ | 음수 | **0 또는 미세** (UTF-8 동일 byte 가정) |
| detector CSV columns | path, line, kind, ... | path, line, ch_orig, ch_replace, value_preview |
| key existence post | 변경 (block delete) 또는 unchanged (leaf last-wins) | **unchanged** (path 보존) |

**핵심**: wrong-language 는 leaf count / size 거의 불변. 기존 G3 strict (산술) / G1 (size 감소) 가 그대로 적용되지 않음.

---

## 3. detector CSV format (159차 실측 + 매핑 JSON 도입)

### 3.1 실제 detector 출력 (tools/triage.mjs:636 emitWrongLanguageCSV)

```
locale,path,line,value_preview,detected_script,char_count,total_chars,ratio,severity
ko,orderHub.tabShipped,3071,"배송中",Han,1,3,0.33,forbidden
ko,orderHub.statusShipped,3091,"배송中",Han,1,3,0.33,forbidden
```

**ch_orig / ch_replace 컬럼이 detector 출력에 존재하지 않음.** 158차 초기 추정과 다름. 159차 검증 결과.

### 3.2 ch_orig 추출 (apply 측에서 derive)

- `value_preview` 의 각 char 순회 → `detected_script` 와 일치하는 char 가 `char_count` 개.
- `char_count === 1` 이어야 line 당 단일 치환 (§5.2 안전 조건).
- 추출된 char 가 `ch_orig`.

ko 예: `value_preview="배송中"`, `detected_script=Han`, `char_count=1` → 배(Hangul) 송(Hangul) 中(Han) → ch_orig=`中`.

### 3.3 ch_replace 결정 (replacement map JSON)

`tools/wrong_language_replacement_map.json` (신규 자산):
```json
{
  "ko": { "Han": { "中": "중" } },
  "_comment": "locale → detected_script → ch_orig → ch_replace"
}
```

plan 생성 시 `map[locale][detected_script][ch_orig]` lookup.
- 매핑 부재 시 → decision action='skip' rationale='no replacement mapping'
- 158차 ko 케이스만 부트스트랩. 추가 locale/script 는 사용자가 map 확장.

### 3.4 char_count > 1 케이스

`char_count !== 1` 이면 decision action='skip' rationale='multi-char per line (out of scope, §11)'

---

## 4. plan 형식

### 4.1 decision schema

```json
{
  "row_index": 0,
  "detector": "wrong-language",
  "action": "substitute" | "skip",
  "kind": "leaf",
  "key_path": "orderHub.tabShipped",
  "line": 3071,
  "ch_orig": "中",          // §3.2 derived from value_preview × detected_script
  "ch_replace": "중",       // §3.3 from replacement map JSON
  "detected_script": "Han",
  "value_preview": "배송中",
  "rationale": "wrong-language substitution" | "no replacement mapping" | "multi-char per line (out of scope)"
}
```

### 4.2 gates

기존 currentGates 에 추가:
```javascript
pre_wronglang_count: rows.length,  // wrong-language detector 한정
wronglang_substitute_count: decisions.filter(d => d.action === 'substitute').length,
```

---

## 5. apply algorithm

### 5.1 char-level substitution

```javascript
function applyWrongLanguage(localePath, decisions) {
  const src = readFileSync(localePath, 'utf-8');
  const lines = src.split(/(\r?\n)/);  // preserve line endings
  
  for (const d of decisions) {
    if (d.action !== 'substitute') continue;
    // lines array: indexes 0,2,4,... = content, 1,3,5,... = line endings
    const idx = (d.line - 1) * 2;
    if (idx >= lines.length) {
      throw new Error(`line ${d.line} out of range`);
    }
    // 안전성: ch_orig 가 정확히 1회만 등장하는지 확인
    const original = lines[idx];
    const occurrences = (original.match(new RegExp(escapeRegex(d.ch_orig), 'g')) || []).length;
    if (occurrences !== 1) {
      throw new Error(`ch_orig "${d.ch_orig}" found ${occurrences} times in line ${d.line} (expected 1)`);
    }
    lines[idx] = original.replace(d.ch_orig, d.ch_replace);
  }
  
  writeFileSync(localePath, lines.join(''), 'utf-8');
}
```

### 5.2 안전 조건

- `ch_orig` 가 해당 line 에 정확히 1회 등장해야 함 (다회 등장 시 abort, 다른 위치 오염 방지)
- multi-byte char 도 UTF-8 안전 (string replace)
- line ending 보존 (CRLF/LF mixed file 대응)

---

## 6. 적합 gate 재정의 (wrong-language 한정)

| Gate | collision | wrong-language |
|---|---|---|
| G1 size | post < pre | post ≤ pre + ε (불변 또는 미세 변경 허용) |
| G2 sacred SHA | unchanged | unchanged |
| G3 leaf count | post == pre + estΔ | post **==** pre (불변) |
| G4 target-line AST | survivor 검증 | path 보존 검증 (모든 substitute path 가 post-AST 에 존재) |
| G5 detector rerun | collision unique-path | wrong-language count 감소량 == substitute count |
| **G6 (신규)** value-content | n/a | substituted line 에 ch_orig 미존재 + ch_replace 존재 |

G6 은 wrong-language 한정 신규 invariant. patch06 에 포함.

---

## 7. CLI 확장

### 7.1 detector 분기

```javascript
if (opts.detector === 'wrong-language') {
  // wrong-language plan/apply path
} else if (opts.detector === 'collision') {
  // 기존 collision path
}
```

### 7.2 mode flag

기존 g3/g4/g5-mode 그대로 (단, wrong-language 모드에서 G3 는 자동 strict-equal-zero, G5 는 wrong-language detector rerun).

---

## 8. self-test 확장 (16 → 17 invariants 또는 별도 wrong-language self-test)

### 8.1 옵션 A: 기존 self-test 에 wrong-language phase 추가
복잡도 ↑, 단일 sandbox 재활용 어려움.

### 8.2 옵션 B: 별도 `tools/triage_apply_wronglang_self_test.sh` 신규
**권장**. patch06 §8 acceptance.

baseline: ed3c4a0~1 의 ko `orderHub.tabShipped` 2 leaves (158차 fix 직전 상태).

invariants:
- W1: detector finds 2 wrong-language entries
- W2: plan substitute count == 2
- W3: apply exit 0
- W4: leaf count unchanged (post == pre)
- W5: post detector wrong-language count == 0
- W6: substituted lines contain `중` and no `中`
- W7: sacred SHA unchanged
- W8: G6 success log present

---

## 9. acceptance 기준

- [ ] CC 가 session157_wronglang/ko_wronglang.csv format 확인 (§3 columns)
- [ ] `tools/triage_apply.mjs` 에 `--detector wrong-language` 분기 추가
- [ ] `applyWrongLanguage` 함수 구현 (§5.1)
- [ ] `currentGates` 에 `pre_wronglang_count`, `wronglang_substitute_count` 추가
- [ ] `validateGates` 에 wrong-language 분기 (§6) — G3 strict-zero, G4 path-preserve, G5 wronglang rerun, G6 신규
- [ ] apply 성공 메시지에 모드별 gate label
- [ ] `tools/triage_apply_wronglang_self_test.sh` 신규 (8 W-invariants)
- [ ] ed3c4a0~1 ko orderHub baseline 8/8 PASS
- [ ] commit 분리: A (plan + apply impl), B (validation gates), C (self-test)
- [ ] push + production smoke green
- [ ] ko.js 불변 (이번 트랙은 도구만; 실제 데이터는 158차 이미 fix 완료)

---

## 10. 비-목표

- non-ko wrong-language apply (별도, P5 zero-finding 결과 보고 후 결정)
- dead-subtree apply path (별도 patch)
- 자동 ch_orig/ch_replace 결정 로직 (detector 가 산출 가정)

---

## 11. 위험

- detector CSV columns 가 §3 추정과 다르면 § 전반 재작성 필요 (CC 첫 단계에서 확인)
- 158차 ko fix 가 이미 적용 → ed3c4a0~1 sandbox 에서 재현 테스트 필요 (실 production 영향 없음)
- multi-char substitution 케이스 (한 line 에 2개 이상 wrong-language char) — 현 spec 은 line 당 1회 제약. 필요 시 별도 트랙.

---

**spec 종결.**