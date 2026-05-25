## 159차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-25
> **이전 세션**: 158차 (P2 apply + hierarchical dedup + P3 self-test + B-1/B-2 마무리)
> **다음 세션**: 159차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G)

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD**: `d608a91` feat(tools): session_init.sh self-test integration
- **ko.js**: 1,441,177 B (158차 변화 0 B, 2 leaf 수정 = size 보존)
- **ko.js leaves**: 30,656 (157차 30,656 → 158차 30,656, Δ=0)
- **참조 locale 파일**: 15개 (ja/zh sacred 156차 갱신 그대로 유지)

### 1.2 Sacred SHA (156 baseline 유지, 157~158 변경 없음)

- **ja.js**: `67ca086561405874b2c039352741c9ef99a528997bdaa0ecf24b69568fac20d4` ✓
- **zh.js**: `a4b72633d5925778eedb5820cd034538df53a766d7eac8de54df7bfc3a2e0dde` ✓

baseline 파일: `.githooks/baseline.json` (version 156, ko_leaf_count 30656)

### 1.3 3자 협업 구조

- **CC (Claude Code)**: repo root, `t`-prefix 명령 실행. `cd /e/project/GeniegoROI &&` prefix 의무 (N-153-A)
- **검수자 (Claude 채팅)**: 도구 작성, 진단, 설계 문서, 결정 추천. **CC Edit tool 우선** (N-154-B)
- **사용자**: cross-validation, 파일 저장 (검수자 spec 문서), 명시 승인 (commit/push), 세션 종결 결정

### 1.4 운영 원칙 (필수 준수, 149~158차 누적)

**영구 ref**: `CONTRIBUTING.md` (158차 commit `fee1388` 에 §7 신규 trap 3건 추가). 다음 세션 검수자 첫 응답 시 참조 의무.

**N-prefix 누적 인덱스** (CONTRIBUTING.md §2 의 단순 재현):

- N-15, N-79, N-145-B, N-145-G (sacred / safety)
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- N-155-A (155차)
- N-156-A (156차)
- N-157-A (157차)
- **158차는 신규 N-prefix 추가 없음**: N-157-A 4-tier 패턴이 그대로 적용된 직접 실증 세션. 단, 158차 학습은 §7 trap 3건 + 신규 도구 4개로 영구화

### 1.5 기술 트랩 (148~158차 누적)

CONTRIBUTING.md §7 영구 기록. 158차 신규 3건 (hybrid format 도입):

- **MSYS path-translation 비대칭 (158차)**: bare CLI args 는 자동 변환되지만 `node -e` string literal 내부의 경로는 미변환. Mitigation: `cygpath -m` 사전 변환 + Linux fallback (`triage_apply_self_test.sh` 패턴 참조)
- **Node ESM dynamic-import 캐시 (158차)**: `await import(url)` 가 URL 기준 caching → write 후 stale 반환. Mitigation: `?v=${Date.now()}` query suffix (`triage_apply.mjs countLeaves`, `leaf_count.mjs` 참조)
- **Heredoc backslash double-escape (158차)**: `t bash -c "cat << EOF"` 의 2-layer 처리로 backslash collapse. Mitigation: heredoc 대신 CC Create/Write tool 사용

### 1.6 158차 종결 시점 상태

- **HEAD**: `d608a91`
- **Working tree**: clean (M .gitignore session158 block 만 unstaged, 정상)
- **ko.js**: 30,656 leaves, 0 collisions, 0 mojibake, 0 wrong-language ✓
- **Sacred SHA**: ja/zh 156차 값 그대로 보존 ✓
- **Quarantine 누적**: 4 dirs (158차 신규 0)
- **Production**: HTTP 200 / lang="ko" / smoke green ✓ (8 production deploys + 2 paths-ignore)
- **Pre-commit hook**: G2/G5/B1-B4/G6 활성 (157차 baseline 그대로)
- **신규 도구 4개**: triage_apply.mjs, leaf_count.mjs, triage_apply_self_test.sh, triage.mjs --src

---

## 2. 158차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit (본 작업)** | 10개 |
| **push** | 10회 |
| **CI deploys** | 8 production green + 2 paths-ignore (정상, docs-only) |
| **smoke dogfood** | 8회 |
| **신규 영구 도구 (tools/)** | 3 (triage_apply.mjs 513 lines / leaf_count.mjs 38 lines / triage_apply_self_test.sh 208 lines) |
| **기존 도구 확장** | 2 (triage.mjs --src flag / session_init.sh --self-test) |
| **신규 영구 문서** | 1 spec (triage_apply_v1.md 287 lines) + 1 spec patch (patch02 흡수) |
| **CONTRIBUTING.md 갱신** | §7 3건 추가 (hybrid format 도입) |
| **운영 원칙 신규** | 0 (N-157-A 패턴 직접 실증) |
| **i18n entries 수정 (ko)** | 2 leaves (Han 中 → Hangul 중) |
| **ko.js size 변화** | 0 B (UTF-8 3-byte 동일) |
| **ko.js leaves 변화** | 0 |
| **ko triage 상태** | collision 0 / mojibake 0 / wrong-language 0 (158 신규 wrong-language fix 후) |

### 2.2 commit 별 상세

| # | Hash | Subject | LOC |
|---|---|---|---|
| 1 | `641c609` | fix(i18n/ko): 배송中 → 배송중 | +2/-2 |
| 2 | `751f538` | docs(spec): triage_apply v1 spec | +238 |
| 3 | `460b185` | feat(tools): triage_apply v1 P1 (collision dry-run) | +349 |
| 4 | `08d387c` | feat(tools): triage.mjs --src flag | +12/-8 |
| 5 | `5c3ac5f` | docs(spec): patch02 hierarchical overlap | +51/-1 |
| 6 | `8521971` | feat(tools): triage_apply v1 P2 (apply + dedup + safety-net G3) | +175/-11 |
| 7 | `0d1b0f6` | feat(tools): leaf_count.mjs (P3 self-test 의존 영구화) | +38 |
| 8 | `c5fd04f` | feat(tools): triage_apply_self_test.sh (13 invariants) | +208 |
| 9 | `fee1388` | docs(contributing): 3 new traps from session 158 | +30 |
| 10 | `d608a91` | feat(tools): session_init.sh self-test integration | +32/-10 |

### 2.3 핵심 발견 및 학습

#### 2.3.1 hierarchical overlap destruction risk

158차 P2 live test 의 **가장 중요한 발견**. ed3c4a0~1 snapshot 의 graph subtree (16 leaves) 가 naive apply 시 파괴됨. 원인:
- detector 가 block-level + leaf-level 을 독립 보고
- applier 가 양쪽 모두 처리 시 parent block 의 child 가 sibling block 결정으로 사라짐

Fix: `demoteOverlappingLeaves` 함수 — block decision 이 path-prefix 매칭 leaf decision 흡수. spec §5.1.1 로 영구화.

**Lesson**: detector 와 applier 의 invariant 가 일치하지 않으면 data destruction risk. 양쪽 spec 을 명문화하고 cross-check 필수.

#### 2.3.2 N-157-A Tier 2 (regression validation) 의 가치 입증

P2 live test 가 hierarchical overlap bug 를 **commit 전에** 발견. 만약 spec 만 보고 구현 후 production locale 에 적용했다면 16 leaves 손실. self-test 의 사후 자동화 가치 즉시 입증.

#### 2.3.3 cross-platform tooling 의 함정 3종

158차에서 직접 부딪힌 환경 트랩이 CONTRIBUTING.md §7 에 영구화. 모두 Mitigation 패턴 확립:
- MSYS path: cygpath -m
- ESM cache: ?v=Date.now()
- Heredoc: Create/Write tool

#### 2.3.4 safety-net G3 의 실용성

§5.1.3 의 2단계 설계 (safety-net → strict) 가 단계적 도입을 가능케 함. precise estimator (§5.1.2) 가 미완성이어도 loss-only 검증으로 P2 production-ready 도달. 향후 strict promotion 은 별도 작업.

### 2.4 158차 검수자 자기-비판

| 사례 | 도출 |
|---|---|
| spec patch 파일 경로 mishap 재발 (patch01 + contributing_patch_158 양쪽) — 검수자가 `cd docs/spec/` 컨텍스트 가정 명시 안 함 | spec 파일 저장 경로 안내 시 **항상 repo root 기준 절대경로 명시** (e.g., `E:\project\GeniegoROI\docs\spec\<file>.md`) |
| spec §5.1 의 identical leaf preserve 방향이 instruction (last-wins) 과 불일치 | spec 변경 시 instruction 과 cross-check 의무화. 또는 spec 본문에 "단, 158차 instruction 으로 last-wins 채택" 명시 |
| ko.js 경로 추정 오류 (locales/ vs frontend/src/i18n/locales/) | CLAUDE.md / NEXT_SESSION.md 의 file system map 우선 참조 |

159차 검수자: 위 3건 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + N-156-A + N-157-A 준수 명시.

---

## 3. 159차 작업 진입

### 3.1 외부 의존 / 진입 조건

**158 deploy 잔여 의존: 0**. 모든 158 작업 production live.

157차 잔여 의존 그대로 계승 (사용자 canonical 결정 필요). 158차 신규 외부 의존 없음.

### 3.2 트랙 구조 (158차 종결 시점)

#### 3.2.1 외부 의존 0, 즉시 진입 가능 (158 신규 트랙)

| 트랙 | 분량 | 비고 |
|---|---|---|
| **§5.1.2 precise estimator + strict G3 promotion** | 0.4 세션 | leaf-shadowed Δ=0 정확 계산. block_identical Δ=-leaf_count 정밀화. 그 후 G3 strict equality 활성 |
| **G4 target-line gate** | 0.2 세션 | post-apply 에 target line 의 key 가 사라졌는지 sed 검증. spec §6 G4 명문 |
| **G5 triage-rerun gate** | 0.3 세션 | post-apply 에 detector 재실행 → collision count = pre - delete count 일치 검증 |
| **P4 wrong-language detector apply path** | 0.5 세션 | 단일 char 치환 자동화. 158 ko 배송中 케이스 같은 패턴 일괄 처리 |
| **P4 dead-subtree detector apply path** | 0.5 세션 | resolver prefix retry 검증 (`pages.*` 케이스) 필수 |
| **P5 14 non-ko locale dry-run + plan review** | 0.5 세션 | session157_collisions/ 14 CSV → 14 plan JSON 생성 + 사용자 review |
| **--self-test default-on** | 작음 | 안정성 충분 입증 후 `--no-self-test` bypass 도입 |
| **tools/triage_apply --target --dry-run-write** | 작음 | apply 결과를 별도 파일에 출력 (diff 검토용) |

#### 3.2.2 사용자 canonical 결정 후 (157차 carry-over)

| 트랙 | 의존 |
|---|---|
| **ja ruleEnginePage.dash.\* cleanup** | sacred SHA 갱신 + N-79 addendum. canonical 결정 (Group 1 vs 2) |
| **zh ruleEnginePage.dash.\* cleanup** | 동일 |
| **id 6,010 Chinese contamination** | 번역 mode 결정 |
| **pt=ru=ar=hi 5,298 identical fallback** | 번역 pipeline 수정 (system-wide) |
| **es=fr 5,083 identical** | 동일 |
| **de Thai 191** | 번역 누락 처리 |
| **vi mojibake HOLD 3 + DEFER 2 잔재** | 번역 mode |

#### 3.2.3 156~157차 carry-over 트랙

CONTRIBUTING.md §7 참조. W0/T3/T7/PM Phase 2/badge20kpi/PAT_B/PAT_D/PAT_J/K/Emoji-prefix damage/REMNANT 2+totalCac.

### 3.3 159차 첫 응답 권장 패턴

159차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 159 --self-test` 실행 권유 (158 신규 --self-test 활용)
2. 결과 확인 (HEAD / sacred SHA / leaf count / 13 invariants)
3. 트랙 결정 (검수자 추천 1개 명시, N-152-B)

**검수자 추천 후보 (159차 진입 시)**:
- **§5.1.2 precise estimator + strict G3** (외부 의존 0, P2 완성도 ↑↑, 0.4 세션)
- 또는 **G5 triage-rerun gate** (P2 검증 강화, 작은 응집)
- 또는 **P5 14 non-ko locale dry-run** (158 도구 즉시 활용, 사용자 review 기반 의사결정 데이터 확보)

CC 첫 명령:

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 159 --self-test"
```

기대값: HEAD `d608a91`, ko.js 1,441,177 B, leaves 30,656, ja SHA `67ca0865...` ✓, zh SHA `a4b72633...` ✓, quarantine 4 dirs, self-test PASS (13/13).

---

## 4. 158차 작업 자산

### 4.1 영구 도구 (tools/, tracked)

| 경로 | 크기 | 용도 |
|---|---:|---|
| `tools/triage_apply.mjs` | 18 KB / 513 lines | N-157-A Tier 1 applier (collision dry-run + apply + dedup + 3-gate) |
| `tools/leaf_count.mjs` | 1 KB / 38 lines | cross-platform leaf count diagnostic |
| `tools/triage_apply_self_test.sh` | 12 KB / 208 lines | 13 invariants regression validation |

158차 기존 도구 확장:
- `tools/triage.mjs` (--src flag 추가, 12/-8 lines)
- `tools/session_init.sh` (--self-test flag, leaf_count.mjs 호출, 32/-10 lines)

### 4.2 Hook gate (157차 그대로, 158 신규 0)

| Gate | 트리거 | 동작 |
|---|---|---|
| G2 | sacred ja/zh SHA mismatch | abort |
| G5 | ko.js leaf count drift > 5% | abort |
| B1-B4 | backup/quarantine file staged | abort |
| G6 | locale staged + collision detected | abort (TRIAGE_SKIP=1 bypass) |

### 4.3 데이터 자산 (gitignored, 158차 신규)

| 경로 | 내용 |
|---|---|
| `/tmp/ko_at_ed3c4a0_parent.js` | ed3c4a0~1 snapshot (158 P2/P3 baseline) |
| `/tmp/triage_apply_selftest_*` | self-test sandbox (PID-suffixed, trap cleanup) |
| `/tmp/session_init_selftest_*.log` | --self-test 실패 시 로그 |

### 4.4 Quarantine 누적 (gitignored, 로컬 보존)

157차 그대로 (158차 신규 0): 4 dirs.

### 4.5 .gitignore session 158 block

session_init.sh 가 자동 추가한 7 line block. 158 종결 시점에 unstaged (정상, 159 진입 시 처리).

---

## 5. 잔여 작업 (159차 이후)

### 5.1 즉시 진행 가능 (외부 의존 0)

158 신규:
- **§5.1.2 precise estimator** (0.4 세션)
- **G4 target-line gate** (0.2 세션)
- **G5 triage-rerun gate** (0.3 세션)
- **P4 wrong-language apply path** (0.5 세션)
- **P4 dead-subtree apply path** (0.5 세션)
- **P5 14 non-ko locale dry-run** (0.5 세션)
- **--self-test default-on** (작음)

157 carry-over:
- v3 catalog generator fix / PAT_F + PAT_E 잔여 / gSug cross-locale sync / NEXT_SESSION 68-153 archive gap rollup / drift Category A 보존 확정

### 5.2 외부 의존 후 진행

157 carry-over (사용자 결정 필요): ja/zh ruleEnginePage.dash.\* cleanup / id 6,010 / pt=ru=ar=hi 5,298 / es=fr 5,083 / de Thai 191 / vi HOLD+DEFER 잔재.

156 carry-over: W0 / PAT_B / PAT_J / K / PAT_C / PAT_A / PAT_D / Emoji-prefix damage / badge20kpi / REMNANT 2+totalCac / ja-zh multi-decl canonical / T3 / T7 / PM Phase 2.

### 5.3 큰 사용자 요청 트랙 (외부 사양 필요)

- T1 PM Phase 2
- T4 마케팅 자동화 8 카테고리
- T5 팀 채팅
- T6 프로젝트 협업

---

## 6. 초엔터프라이즈 보강 메모 (159차 결정용)

154차 #5~#8 + 155차 #9~#11 + 156차 #12~#15 + 157차 #16~#19 + 158차 신규:

| # | 항목 | 사유 | 158 상태 |
|---|---|---|---|
| **#5** | Hook G6 working-tree-vs-index drift | 154 W2 carry-over | 진행 |
| **#6** | tools/session_close.sh | session_init 반대 | 진행 |
| **#7** | tools/triage.mjs | 157차 달성 ✓ | 완료 |
| **#8** | drift category 자동 라벨링 | 154 carry-over | 진행 |
| **#9** | Pre-detector unit-test discipline | 155 carry-over | 진행 |
| **#10** | Pre-execution grep verification | 155 carry-over | 진행 |
| **#11** | Edit tool capability flag | 155 N-155-A | 진행 |
| **#12** | AST-only consumer audit standard step | 156 carry-over | 진행 |
| **#13** | Sacred SHA 3-way invariant pattern | 156 carry-over | 진행 |
| **#14** | Transactional N-phase batch script template | 156 carry-over | 진행 |
| **#15** | N-153-D 명문 준수 (recon-only / cleanup 분리) | 156 carry-over | 진행 |
| **#16** | tools/triage_apply.mjs batch cleanup | 157 carry-over | **158차 P1+P2 완료** ✓ |
| **#17** | G7 wrong-language hook gate | 157 carry-over | 진행 |
| **#18** | CI workflow PR-time --mode all | 157 carry-over | 진행 |
| **#19** | tools/triage_self_test.sh | 157 carry-over | **158차 완료** ✓ |
| **#20 (158 신규)** | §5.1.2 precise estimator + strict G3 | 158 P2 의 safety-net 졸업 | 후보 |
| **#21 (158 신규)** | G4 + G5 gates | spec §6 의 full 5-gate 도달 | 후보 |
| **#22 (158 신규)** | P4 detector apply paths | wrong-language / dead-subtree 확장 | 후보 |
| **#23 (158 신규)** | P5 non-ko locale dry-run | 14 locale plan JSON 생성기 | 후보 |
| **#24 (158 신규)** | --self-test default-on | opt-in 안정성 입증 후 | 후보 |

159차 검수자: 위 항목 별도 트랙 진입 시 사용자 결정 우선. **#20 (precise estimator)** 가 가장 logical 다음.

---

## 7. 알려진 이슈 / 주의사항 (148~158차 누적)

CONTRIBUTING.md §7 영구 기록 참조. 158차 신규 3건 (hybrid format):

- **MSYS path-translation 비대칭**: cygpath -m 사전 변환
- **Node ESM dynamic-import 캐시**: ?v=Date.now() query suffix
- **Heredoc backslash double-escape**: Create/Write tool 사용

### 7.1 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **paths-ignore**: `**.md`, `**.txt`, `docs/**`, `.claude/**`
- **CI 소요**: 평균 53~65초 (158차 측정)
- **158차 종결 시점 배포**: 8 commits production + 2 docs-only paths-ignore
- **Sacred locale 변경 없이 G2 통과**: 158차 10 commits 전부

### 7.2 158차 검수자 행동 학습 사례 (3건)

| 사례 | 도출 |
|---|---|
| spec patch 파일 경로 mishap (patch01 + contributing_patch_158 양쪽 발생) | 저장 경로 안내 시 repo root 기준 절대경로 명시 의무 (보강 #25 후보) |
| spec §5.1 의 identical leaf preserve 방향 instruction 불일치 | spec 변경 시 instruction cross-check 의무 |
| ko.js 경로 추정 오류 | CLAUDE.md / NEXT_SESSION.md 우선 참조 |

159차 검수자: 위 3건 인지.

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~158차)

| 카테고리 | 처리 결과 |
|---|---|
| 147~157 (147 Japanese pollution ~ 157 triage 영구화) | 157차 인계서 참조 |
| **158차 ko 2 leaf 수정** | 배송中 → 배송중 (orderHub.tabShipped, statusShipped) ✓ |
| **158차 P2 hierarchical overlap fix** | data destruction risk 사전 발견 + spec §5.1.1 영구화 ✓ |
| **158차 P3 regression validation** | 13 invariants 자동 검증 (ed3c4a0~1 baseline) ✓ |

### 8.2 ko.js leaf trajectory (147~158)

| Session | Leaves | Δ |
|---|---:|---:|
| 153 종결 | 33,211 | -- |
| 154 종결 | 32,096 | -1,115 |
| 155 종결 | 32,090 | -6 |
| 156 종결 | 30,658 | -1,432 |
| 157 종결 | 30,656 | -2 |
| **158 종결** | **30,656** | **0** (size 보존 fix only) |

### 8.3 158차 작업 결과

| 항목 | 값 |
|---|---|
| commit | 10 |
| push | 10 |
| CI deploys | 8 production + 2 paths-ignore |
| smoke dogfood | 8회 |
| 신규 영구 도구 | 3 (triage_apply.mjs / leaf_count.mjs / triage_apply_self_test.sh) |
| 기존 도구 확장 | 2 (triage.mjs --src / session_init.sh --self-test) |
| 신규 영구 문서 | 1 spec (287 lines) + patch02 흡수 |
| CONTRIBUTING.md 갱신 | 3 trap entries (hybrid format 도입) |
| 운영 원칙 신규 | 0 (N-157-A 직접 실증) |
| i18n entries 수정 (ko) | 2 leaves |
| ko.js size 변화 | 0 B |
| ko wrong-language | 2 → 0 |
| 검수자 학습 사례 | 3건 |
| 신규 트랙 후보 | 5 (#20~#24 보강 메모) |

---

## 9. 159차 첫 메시지 권장 패턴

### 사용자 → 검수자

"158차 인계서 첨부합니다. 159차 [트랙 결정 또는 구체 작업 지시]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시 (특히 N-157-A + N-156-A + N-155-A + N-154-A~D + N-153-A 누적)
- `tools/session_init.sh --session 159 --self-test` 실행 권유 (158 신규 활용)
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B 의무)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- 사용자 저장 부담 줄이기 위해 CC Edit tool 우선 (N-154-B)
- consumer audit 4-layer 의무 (156 신규)
- sacred 파일 cleanup 시 N-79 addendum + 3-way invariant (156 신규)
- detector 반복 패턴 발견 시 즉시 productionise 검토 (N-157-A)
- spec 파일 저장 경로 안내 시 repo root 기준 절대경로 명시 (158 학습)
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- **PM 본 작업 진입 시 새 채팅 세션 분리 의무** (N-152-F)
- **N-156-A 정신상 추가 작업 가능 시 적극 진행**

### 검수자 추천 159차 진입 트랙 (N-152-B)

1. **§5.1.2 precise estimator + strict G3** (외부 의존 0, P2 safety-net 졸업, 0.4 세션)
   - leaf-shadowed Δ=0 정확 계산
   - block_identical Δ=-leaf_count 정밀화
   - G3 strict equality 활성
   - 158 spec §5.1.3 의 "도입 시점" 도달

2. (작은 응집 선호 시): **G5 triage-rerun gate** (0.3 세션, P2 검증 강화)

3. (사용자 review 필요 데이터 확보 시): **P5 14 non-ko locale dry-run** (0.5 세션)

4. (사용자 결정 후): ja/zh ruleEnginePage.dash.\* cleanup (sacred SHA + N-79)

---

**문서 종결.**