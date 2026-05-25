# CONTRIBUTING.md mini-patch — Session 162 학습 영구화

> **목적**: 162차 발생 trap 3건 영구화 — §6 #38 v2 강화 (dogfood self-consistency) + §6 #33 강화 (codebase pattern mirror) + §7 #37 v3 강화 (5회 재발 self-check 의무)
> **트랙**: 162차 3순위 (U-161-E)
> **저장 경로**: `E:\project\GeniegoROI\docs\spec\contributing_patch_session162_mini.md`
> **저장 후 검증** (§7 #37 161 강화 적용):
> ```
> t bash -c "cd /e/project/GeniegoROI && find docs/spec -name 'contributing_patch_session162_mini.md' -type f"
> ```
> 단일 라인 출력 의무. 중첩 출력 시 STOP. **162차 patch 적용 시 5회 재발 발생 — 사용자 IDE save dialog dropdown 만 사용 의무.**
> **rollback**: `git checkout HEAD -- CONTRIBUTING.md` (commit 전이면 즉시 복구)

---

## §1. 배경

162차 patch suite (1순위 트랙) 적용 과정에서 검수자 자기-비판 6건 발생:

1. **§7 #37 5회 재발**: 161 강화 mitigation patch 적용 **직후** 본인이 같은 trap 발생 (G8 spec 첫 저장 시 `docs/spec/docs/spec/` 중첩)
2. **§6 #33 위반 (1회)**: G8 spec 작성 시 ko.js 경로 `frontend/src/locales/` 사용 — canonical 은 `frontend/src/i18n/locales/`. 인계서 §1.2 에 명시되었음에도 누락
3. **§6 #38 self-consistent dogfood trap**: dogfood 의 test input (`echo 'frontend/src/locales/ko.js'`) 과 production regex (`^(frontend/src/locales/ko\.js|...)$`) 가 **같은 wrong path** 에서 도출 → dogfood PASS 하지만 production hook broken-by-design. CC 가 §6 #33 + codebase L130 pattern 비교로 dual-catch
4. **N-152-B 위반 (1회)**: 사용자 결정 항목 제시 시 추천 누락
5. **N-152-D 잠재 위반**: 인계서 작성을 사용자 승인 없이 진행 의도 (사용자 선제 지적으로 회피)
6. **U-161-G 위반 (1회)**: 검수자가 평문 설명으로 spec 안내 → CC 가 file 미저장 발견 후 spec read 옵션 제시 필요

본 mini-patch 는 §6 #38 v2 + §6 #33 강화 + §7 #37 v3 + §6 신규 #39 (검수자 self-check) 4건 영구화. N-152-B/D, U-161-G 는 기존 영구화로 충분 (재위반 시 강화 검토).

---

## §2. 적용 spec

### §2.1 Patch M1 — §6 #38 v2 강화 (dogfood self-consistency)

**Anchor**: §6 #38 두 번째 bullet (Tool CLI option spec) 직후, blank line 직전.

CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n '#38 Tool CLI option spec' CONTRIBUTING.md"
```

기대: 단일 라인 출력 (line 217 추정).

**str_replace 명령**:

**old_str**:
```
- **#38 Tool CLI option spec** (161 production_smoke.sh 학습): before issuing any tool invocation, reviewer confirms the exact flag form by `tools/<tool>.sh --help` or `grep -E "while.*\-\-" tools/<tool>.sh`. 161차 검수자 guessed `--snapshot-before` and `--out`, both failed; correct form was `--snapshot before|after` (space-separated). Never construct flag names by analogy.
```

**new_str**:
```
- **#38 Tool CLI option spec** (161 production_smoke.sh 학습): before issuing any tool invocation, reviewer confirms the exact flag form by `tools/<tool>.sh --help` or `grep -E "while.*\-\-" tools/<tool>.sh`. 161차 검수자 guessed `--snapshot-before` and `--out`, both failed; correct form was `--snapshot before|after` (space-separated). Never construct flag names by analogy.
- **#38 v2 Dogfood self-consistency trap** (162 G8 spec 학습): dogfood 의 test input 과 production source 가 **같은 검수자 가정**에서 도출되면 dogfood PASS 하지만 production broken. 162 G8 spec 의 dogfood echo `'frontend/src/locales/ko.js'` 와 production regex `^(frontend/src/locales/ko\.js|...)$` 모두 동일 wrong path — dogfood self-consistent PASS, 실 codebase 적용 시 hook 미발화. Mitigation: test input 은 **실 production source** (`git diff --cached --name-only` 실 출력 / `ls <dir>` 실 결과) 에서 도출. 검수자 가정으로 작성 금지.
```

**Abort 조건**: str_replace FAIL 시 STOP.

---

### §2.2 Patch M2 — §6 #33 강화 (codebase pattern mirror)

**Anchor**: §6 의 첫 #33 entry. CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n '#33\|Path canonical' CONTRIBUTING.md | head -5"
```

기대: #33 entry line 출력 (line 198~213 추정).

**판정**: anchor 정확 line 확인 후 검수자가 정확 old_str/new_str 발급. **본 spec 의 Patch M2 본문은 grep 결과 후 작성**. 사용자는 일단 Patch M1, M3, M4 만 저장 후 진행. M2 는 grep 결과 받은 후 검수자가 추가 명령으로 발급.

**예상 추가 본문** (참고):
```markdown
- **#33 v2 Codebase pattern mirror** (162 G8 spec 학습): new 도구의 regex/path/option 형식은 codebase 기존 패턴 검색 후 mirror 의무. 162 G8 spec 의 ko.js trigger regex 가 codebase L130 (`.githooks/pre-commit`) 의 strict `\.` form 과 불일치 (`ko.js` loose) 했음. Mitigation: 신규 spec 작성 전 `grep -rn "<유사 pattern>" .githooks/ tools/` 로 기존 form 확인 의무. analogy 작성 금지.
```

---

### §2.3 Patch M3 — §6 신규 #39 (검수자 self-check pre-flight)

**Anchor**: §6 의 `### `로 시작하는 다음 subheader 직전 (160 patch 영구화 entry 들 마지막 bullet 후).

CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n '^### \|^## 7' CONTRIBUTING.md | head -10"
```

§6 종결 line 확정 후 anchor 발급.

**예상 본문**:
```markdown
- **#39 Reviewer pre-flight self-check** (162 §7 #37 5회 재발 학습): 검수자가 spec 저장 안내 명령 발송 **직전**, 본인 명령에 다음 3건 자체 포함 여부 확인 의무:
  1. 절대경로 (`E:\project\GeniegoROI\docs\spec\<filename>.md`) 명시
  2. IDE save dialog dropdown 주의 ("textbox 추가 입력 금지")
  3. 저장 직후 find 검증 명령 동봉

  3건 중 1건이라도 누락 시 메시지 보내기 전 보강. 162차 1순위 patch (161 강화 영구화) 적용 **직후** 본인이 G8 spec 안내 시 누락 → 5회 재발 발생. self-check 영구화로 차단.
```

**Patch M3 도 anchor grep 후 검수자가 정확 old_str/new_str 발급**.

---

### §2.4 Patch M4 — §7 #37 v3 (5회 재발 명시 + Recurrence counter)

**Anchor**: §7 #37 의 161 강화 block 말미 (162 patch 1순위로 영구화한 block).

CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n '162차 patch 적용 시점 누적 재발' CONTRIBUTING.md"
```

기대: 단일 라인 출력 (line ~363 추정).

**str_replace 명령**:

**old_str**:
```
위 3건 중 1건이라도 누락 시 §7 #37 재발 위험. 162차 patch 적용 시점 누적 재발 4회 (160 ×3 + 161 ×1).
```

**new_str**:
```
위 3건 중 1건이라도 누락 시 §7 #37 재발 위험. 162차 patch 적용 시점 누적 재발 5회 (160 ×3 + 161 ×1 + **162 ×1 — 본 patch 적용 직후 G8 spec 안내 시 재발**). 162차 강화: §6 #39 (검수자 pre-flight self-check) 영구화로 검수자 측 차단. 추가 재발 시 IDE-side intervention 요구 (사용자 환경 조정 권유).
```

**Abort 조건**: str_replace FAIL 시 STOP.

---

## §3. 적용 후 검증 (CC 자동 실행)

```
t bash -c "cd /e/project/GeniegoROI && wc -l CONTRIBUTING.md && grep -c '#38 v2\|#33 v2\|#39\|162 ×1' CONTRIBUTING.md"
```

**기대값**:
- wc -l: ≥ 436 (431 + 5 이상)
- markers count: ≥ 4

전 항목 PASS 시 commit 진행.

---

## §4. Commit + push

```
t bash -c "cd /e/project/GeniegoROI && git diff --stat CONTRIBUTING.md"
```

**Abort 조건**: diff stat 0 시 STOP.

사용자 승인 후:

```
t bash -c "cd /e/project/GeniegoROI && git add CONTRIBUTING.md && git commit -m 'docs(contributing): §6 #38 v2 + #33 v2 + #39 + §7 #37 v3 (162 학습 영구화)'"
```

**Abort 조건**: pre-commit FAIL 시 STOP.

Push 는 사용자 명시 승인 후 별도 turn (162차 4번째 batch).

---

## §5. 진행 흐름

1. **사용자**: 본 spec 저장 + find 검증
2. **CC**: §2.1 Patch M1 anchor grep → str_replace
3. **검수자**: §2.2 Patch M2 anchor grep 결과 받은 후 old_str/new_str 발급
4. **CC**: Patch M2 str_replace
5. **검수자**: §2.3 Patch M3 anchor grep 결과 받은 후 old_str/new_str 발급
6. **CC**: Patch M3 str_replace
7. **CC**: §2.4 Patch M4 str_replace
8. **CC**: 검증 + diff stat → 사용자 승인 → commit
9. **사용자 승인**: push (162 batch 4 → 162차 인계서 전 사전 push)

---

## §6. 종결 조건

- [ ] Patch M1~M4 전수 적용
- [ ] 검증 markers ≥ 4
- [ ] commit + push 완결
- [ ] 162차 인계서 (NEXT_SESSION.md) — 사용자 명시 승인 후 작성

전 항목 완료 시 162차 트랙 3건 (1순위 + 2순위 + 3순위) 완전 종결.