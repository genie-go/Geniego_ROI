# CONTRIBUTING.md §41 trap patch — Session 162 (G8 broken-by-design + meta self-blind)

> **목적**: 162차 G8 hook broken-by-design (commit `d2c4315`) + fix (`62621e8`) 학습 2건 영구화
> **트랙**: 162차 4순위 (U-161-E + U-162-A 작업 여력 최대 진행)
> **저장 경로**: `E:\project\GeniegoROI\docs\spec\contributing_patch_session162_trap41.md`
> **저장 후 검증** (§7 #37 v3 적용 — 162차 7회 재발 회피 의무):
> ```
> t bash -c "cd /e/project/GeniegoROI && find docs/spec -name 'contributing_patch_session162_trap41.md' -type f"
> ```
> **사용자 의무 (IDE-side intervention, §7 #37 v3 영구화)**:
> 1. save dialog directory dropdown 의 sticky `docs/spec/docs/spec/` 항목 제거 확인
> 2. directory 입력란 manual clear 후 `docs/spec` 단일 입력
> 3. Recent locations 의 nested 경로 명시 제거
>
> **rollback**: `git checkout HEAD -- CONTRIBUTING.md` (commit 전이면 즉시 복구)

---

## §1. 배경

### §1.1 G8 broken-by-design (162 commit `d2c4315`)

G8-manifest-clean hook 의 count read 가 `m.parse_errors` (top-level, 존재하지 않음) 를 읽음. 실 schema 는 `m.summary.parse_errors` (nested).

- `(undefined || []).length === 0` → 항상 PASS (false-negative no-op gate)
- 162차 #29 트랙 (parse_errors=0 baseline) 회귀 방지가 hook 의 존재 이유 — 그 hook 이 broken 이면 회귀 즉시 발생해도 차단 못 함

**Fix** (commit `62621e8`):
- `m.summary && typeof m.summary.parse_errors === 'number') ? m.summary.parse_errors : -1` (strict type guard)
- FAIL handler: broken `node -e ... forEach` 제거, `/tmp/g8_parse_errors.json` 직접 cat
- Live dogfood 실증: parse_errors=1 → G8 abort, HEAD 미변경 ✓

### §1.2 Meta hook self-blind (162 commit `62621e8` 적용 시점 발견)

G8 hook 변경 (.githooks/pre-commit 만 staged) 시 G8 trigger 패턴 (`^(frontend/src/i18n/locales/ko\.js|tools/build_resolver_manifest_v2\.mjs)$`) 에 안 잡힘 → G8 self-trigger 안 됨 → hook 자체 결함 commit 차단 불가.

이는 **defense-in-depth 의 본질적 한계** — gate 가 자기 자신을 검증하려면 trigger 패턴에 hook file 포함해야 하는데, 그러면 모든 hook 변경 시 G8 발화 → 일상 운영 부담 + manifest builder 가 hook file 안 scan 하므로 의미도 없음.

**Mitigation**: hook 변경 시 **별도 dogfood 절차 의무** (real commit 시도 → abort 확인 → reset). spec §5.2 에 명시.

### §1.3 §6 #38 v2 동시 발생

162차 mini-patch (`8965cdb`) 에 §6 #38 v2 dogfood self-consistency trap 영구화한 직후, **본인이 같은 trap 으로 broken hook commit**. dogfood 의 count read 와 production hook 의 count read 가 같은 wrong field 사용 — self-consistent PASS.

**자가-모순 흔적**: 영구화 commit (`8965cdb`) ↔ broken hook commit (`d2c4315`) 1 turn 차. 본 §41 영구화로 자기-비판 명시.

---

## §2. Patch 본문

### §2.1 Patch T1 — §7 신규 trap entry #41 (G8 broken-by-design)

**Anchor**: §7 의 `### 161 patch11/12 학습` 종결 후 + §7 종결 `---` 직전. CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n 'Trap D\|^### \|^## 8' CONTRIBUTING.md | head -10"
```

기대: Trap D entry line 종결 위치 + §7 종결 line.

**검수자가 grep 결과 받은 후 정확 old_str/new_str 발급**. 본 spec 의 §2.1 본문은 grep 결과 후 검수자 추가 명령으로 진행.

**예상 본문**:
```markdown
### 162 G8 hook 학습 (신규 trap 2건 영구화)

**Trap E — Hook field-name self-consistency** (162 commit `d2c4315` → `62621e8` fix): G8-manifest-clean hook 의 count read 가 `m.parse_errors` (top-level, schema 에 미존재) 를 읽어 항상 0 반환 → false-negative no-op gate. 실 schema 는 `m.summary.parse_errors` (nested). dogfood 도 같은 wrong field 사용 → self-consistent PASS. §6 #38 v2 (162 mini-patch 영구화) 의 구체 사례 — 영구화 commit (`8965cdb`) 직후 본인이 위반.

**Mitigation**:
1. spec 작성 시 `node -e "const m=require('./<manifest>'); console.log(Object.keys(m));"` 으로 실 schema 확인 의무
2. nested key 사용 시 `m.X && typeof m.X.Y === 'number') ? m.X.Y : -1` strict type guard 패턴 적용
3. dogfood 의 test input source 와 production check source 가 **다른 layer** 에서 도출 (test input 은 `git diff --cached`, check 는 manifest schema)
4. **수치 검증**: dogfood 시 의도적 parse_errors > 0 케이스 (`/tmp/g8_parse_errors.json` 존재 확인) → real commit 시도 → abort 검증. PASS-only dogfood 무효

**Trap F — Hook self-modification blind** (162 commit `62621e8` 적용 시점 발견): hook 이 자기 자신 (`.githooks/pre-commit`) 만 staged 상태에서 commit 시도 시, hook 의 trigger 패턴이 자기 자신 file path 포함 안 함 → self-trigger 안 됨 → hook 결함 commit 차단 불가. defense-in-depth 의 본질적 한계.

**Mitigation**:
1. hook 변경 시 **별도 real-commit dogfood 의무**: intentional 결함 ko.js + broken external file → real `git commit` 시도 → exit 1 + HEAD 미변경 확인 → reset/restore
2. hook spec 의 dogfood 절차에 "real commit 시도" 단계 명시 의무 (PASS path + FAIL path + abort verification 3건)
3. hook commit message 에 dogfood 결과 SHA 포함 권장 (`refs: 62621e8` 식)

**§7 #37 v4 영구화 후보** (7회 재발 학습): IDE save dialog 의 nested path stickiness 가 검수자/사용자 의지로 차단 불가 확정. **워크플로 변경 의무** — 검수자 outputs/ 산출물을 사용자가 저장하는 대신 **CC 가 spec 본문 inline 받아 직접 `cat > docs/spec/<name>.md << 'EOF' ... EOF` 로 생성**. save dialog 우회로 IDE 환경 문제 회피. spec 본문 크기 < 200 line 시 적용 가능.

---
```

---

### §2.2 Patch T2 — §6 #38 v2 강화 (schema verification 의무 명시)

**Anchor**: §6 #38 v2 bullet (line 232 추정). CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n '#38 v2' CONTRIBUTING.md"
```

기대: 단일 라인 출력.

**str_replace 후보**:

**old_str**:
```
- **#38 v2 Dogfood self-consistency trap** (162 G8 spec 학습): dogfood 의 test input 과 production source 가 **같은 검수자 가정**에서 도출되면 dogfood PASS 하지만 production broken-by-design. 162 G8 spec 의 dogfood echo `'frontend/src/locales/ko.js'` 와 production regex `^(frontend/src/locales/ko\.js|...)$` 모두 동일 wrong path — dogfood self-consistent PASS, 실 codebase 적용 시 hook 미발화. Mitigation: test input 은 **실 production source** (`git diff --cached --name-only` 실 출력 / `ls <dir>` 실 결과 / `grep -rn` 의 codebase 기존 패턴) 에서 도출. 검수자 가정으로 작성 금지.
```

**new_str**:
```
- **#38 v2 Dogfood self-consistency trap** (162 G8 spec 학습 + Trap E 162 G8 hook): dogfood 의 test input 과 production source 가 **같은 검수자 가정**에서 도출되면 dogfood PASS 하지만 production broken-by-design. 162 G8 spec 의 dogfood echo `'frontend/src/locales/ko.js'` 와 production regex `^(frontend/src/locales/ko\.js|...)$` 모두 동일 wrong path. 162 G8 hook 의 count read `m.parse_errors` 와 dogfood `m.parse_errors` 모두 동일 wrong field (실은 `m.summary.parse_errors`). 양건 모두 dogfood self-consistent PASS, 실 codebase 적용 시 broken. Mitigation: (a) test input 은 **실 production source** (`git diff --cached --name-only` 실 출력 / `ls <dir>` 실 결과 / `grep -rn` 의 codebase 기존 패턴) 에서 도출, (b) **JSON schema verification**: `node -e "console.log(Object.keys(m));"` 으로 nested key 위치 확인 의무, (c) **dogfood 의 의도적 FAIL case 포함**: PASS-only dogfood 무효, FAIL case 로 abort 실증 의무. 검수자 가정으로 작성 금지.
```

**Abort 조건**: str_replace FAIL 시 STOP.

---

### §2.3 Patch T3 — §6 신규 #40 (Pre-commit hook fix dogfood 의무)

**Anchor**: §6 #39 (Reviewer pre-flight self-check) entry 직후. CC 사전 확인:

```
t bash -c "cd /e/project/GeniegoROI && grep -n '#39 Reviewer pre-flight' CONTRIBUTING.md"
```

**검수자가 grep 결과 받은 후 정확 old_str/new_str 발급**.

**예상 본문**:
```markdown
- **#40 Hook fix real-commit dogfood** (162 G8 fix 학습): pre-commit hook (또는 다른 git hook) 변경 시 다음 3-stage dogfood 의무:
  1. **PASS dogfood**: 정상 입력으로 hook 실행 → 의도 통과 메시지 확인
  2. **FAIL dogfood**: intentional 결함 입력 (broken ko.js / broken external file 등) 으로 hook 실행 → FAIL 메시지 + details 출력 확인
  3. **Real-commit abort dogfood**: FAIL 입력을 actual staged 상태로 `git commit` 시도 → exit 1 + HEAD 미변경 확인 → reset/restore

  PASS-only dogfood 는 §6 #38 v2 trap 발생 위험. abort verification 까지 완료 후 commit. 162 G8 hook (commit `d2c4315`) 가 PASS dogfood 만으로 commit 된 결과 broken-by-design no-op gate 가 origin/master 에 4 commit 동안 live 상태.
```

---

## §3. 적용 후 검증

```
t bash -c "cd /e/project/GeniegoROI && wc -l CONTRIBUTING.md && grep -c 'Trap E\|Trap F\|#40 Hook fix\|JSON schema verification' CONTRIBUTING.md"
```

**기대값**:
- wc -l: ≥ 460 (439 + 21 이상)
- markers count: ≥ 4

---

## §4. Commit + push

검수자 추천 commit message: `docs(contributing): §7 trap E/F + §6 #38 v2 강화 + #40 hook dogfood (162 §41 학습 영구화)`

```
t bash -c "cd /e/project/GeniegoROI && git diff --stat CONTRIBUTING.md"
```

사용자 승인 후 commit + spec 별도 commit (162 1+3순위 patch 와 동일 패턴):

```
t bash -c "cd /e/project/GeniegoROI && git add CONTRIBUTING.md && git commit -m 'docs(contributing): §7 trap E/F + §6 #38 v2 강화 + #40 hook dogfood (162 §41 학습 영구화)' && git add docs/spec/contributing_patch_session162_trap41.md && git commit -m 'docs(spec): §41 trap patch spec (G8 broken-by-design + meta self-blind 영구화 근거)'"
```

Push 는 사용자 명시 승인 후.

---

## §5. 진행 흐름 (작업 범위 강제 X — U-162-B 적용)

1. 사용자: spec 저장 + find 검증 (단일 라인)
2. CC: §2.1 Patch T1 anchor grep
3. 검수자: grep 결과 받은 후 정확 old_str/new_str 발급
4. CC: Patch T1 str_replace
5. CC: §2.2 Patch T2 str_replace
6. CC: §2.3 Patch T3 anchor grep
7. 검수자: grep 결과 받은 후 정확 old_str/new_str 발급
8. CC: Patch T3 str_replace
9. CC: 검증
10. 사용자 승인 → commit + spec commit
11. 사용자 승인 → push
12. **검수자 작업 여력 보고** (U-162-C) → 다음 결정

각 step 종결 시점 검수자 작업 여력 보고 의무 (U-162-C).