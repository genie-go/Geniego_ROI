## 158차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-24
> **이전 세션**: 157차 (triage.mjs 영구화 + G6 hook + TRIAGE_SKIP bypass + N-157-A)
> **다음 세션**: 158차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G)

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD**: `e97286e` docs(contributing): add N-157-A
- **ko.js**: 1,441,177 B (157차 -64 B, 2 leaves 감소)
- **ko.js leaves**: 30,656 (156차 30,658 → 157차 30,656, -2)
- **참조 locale 파일**: 15개 (ja/zh sacred 156차 갱신 그대로 유지)

### 1.2 Sacred SHA (156 baseline 유지, 157 변경 없음)

- **ja.js**: `67ca086561405874b2c039352741c9ef99a528997bdaa0ecf24b69568fac20d4` ✓
- **zh.js**: `a4b72633d5925778eedb5820cd034538df53a766d7eac8de54df7bfc3a2e0dde` ✓

baseline 파일: `.githooks/baseline.json` (version 156, ko_leaf_count 30656)

### 1.3 3자 협업 구조

- **CC (Claude Code)**: repo root, `t`-prefix 명령 실행. `cd /e/project/GeniegoROI &&` prefix 의무 (N-153-A)
- **검수자 (Claude 채팅)**: 도구 작성, 진단, 설계 문서, 결정 추천. **CC Edit tool 우선** (N-154-B)
- **사용자**: cross-validation, 파일 저장 (검수자 spec 문서), 명시 승인 (commit/push), 세션 종결 결정

### 1.4 운영 원칙 (필수 준수, 149~157차 누적)

**영구 ref**: `CONTRIBUTING.md` (157차 commit `e97286e` 에 N-157-A 추가). 다음 세션 검수자 첫 응답 시 참조 의무.

**N-prefix 누적 인덱스** (CONTRIBUTING.md §2 의 단순 재현):

- N-15, N-79, N-145-B, N-145-G (sacred / safety)
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- N-155-A (155차)
- N-156-A (156차)
- **N-157-A (157차 신규)**:
  - **N-157-A**: **세션 내 반복 검출/수정 패턴은 영구 도구화하고 hook gate 로 자동 차단한다**. 동일 패턴의 ad-hoc detection script 가 2회 이상 작성되거나 4+ 세션 재사용 예상 시 `tools/` 영구 자산화. 4-tier 구조:
    1. Detector (`tools/<name>.mjs`): AST-based, read-only, mode 분기, CSV/JSON emitter, 외부 데이터는 JSON 분리
    2. Regression validation: detector 가 과거 commit history 와 invariant, strictly more conservative 확인
    3. Hook gate (`.githooks/pre-commit` G<N>): exit code 를 gate 로 변환, staged file 매치 한정
    4. Bypass env var (`<TOOL>_SKIP=1`): G<N> 단독 bypass, G2 sacred 보호 유지
  - **157차 실증**: triage.mjs (5 mode) + 2 JSON + G6 hook + TRIAGE_SKIP bypass. 155+156 ad-hoc script 5개 → 1개 영구 도구로 통합
  - N-156-A 와 양립: 추가 트랙 적극 진행 + detector pattern 반복 시 즉시 productionise

### 1.5 기술 트랩 (148~157차 누적)

CONTRIBUTING.md §7 영구 기록. 157차 신규:

- **detector reproducibility 의 strictly-more-conservative 속성**: 새 detector 가 과거 ad-hoc 보다 더 많이 찾는 것이 정상 (156 의 18 vs 157 detector 의 21 = 3 추가 mixed-kind). 차이를 commit body 에 explicit 명시
- **G5 leaf-count tolerance 의 gap**: Δ1434/1532 같은 narrow pass 케이스가 collision-introducing 변경을 놓침. G6 가 이 gap 을 메움
- **pages.marketingIntel literal-grep 0 hit 의 의미**: i18n resolver 가 `pages.` prefix 자동 retry 하므로 consumer 는 짧게 호출 (`t('marketingIntel.foo')`). L1 literal-grep dead 판정해도 실제로는 live. dead-subtree spec test target 선택 시 주의

### 1.6 157차 종결 시점 상태

- **HEAD**: `e97286e`
- **Working tree**: clean (staged .gitignore session157 block 만 unstaged, 정상)
- **ko.js**: 30,656 leaves, 0 collisions ✓
- **Sacred SHA**: ja/zh 156차 값 그대로 보존 ✓
- **Quarantine 누적**: 4 dirs (157차 신규 0)
- **Production**: HTTP 200 / lang="ko" / smoke green ✓ (8 deploy 통과, 9번째 paths-ignore 정상)
- **Pre-commit hook**: G2/G5/B1-B4 + **G6 신규** 활성
- **Bypass**: `TRIAGE_SKIP=1` 환경변수 신규

---

## 2. 157차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit (본 작업)** | 9개 |
| **push** | 9회 |
| **CI deploys** | 8 production green + 1 paths-ignore (정상, docs-only) |
| **smoke dogfood** | 8회 (ci_watch.sh) |
| **신규 영구 도구 (tools/)** | 1 (triage.mjs, 36,814 B, ~1100 lines, 5 modes) |
| **신규 영구 데이터 (tools/)** | 2 (mojibake_map.json 9 families + locale_script_profile.json 15 locales) |
| **신규 hook gate** | 1 (G6 collision auto-check) |
| **신규 bypass mechanism** | 1 (TRIAGE_SKIP env var) |
| **신규 영구 문서** | 1 (CONTRIBUTING.md N-157-A) |
| **신규 분석 도구 (session157_*.mjs)** | 1 (session157_ko_perf_attrib_purge.mjs, gitignored, 1회용) |
| **신규 데이터 (CSV)** | 30 (session157_collisions/ 15 + session157_wronglang/ 15, gitignored) |
| **운영 원칙 신규** | 1 (N-157-A) |
| **i18n entries 제거 (ko)** | 2 leaves (perf + attrib unreachable) |
| **ko.js 감량** | 64 B |
| **ko.js collision** | 0 → 0 (검증 + 신규 발견 + 해소) |
| **detector 신규 검출 카테고리** | 4 (mojibake + wrong-language 등 cross-locale) |

### 2.2 commit 별 상세

| # | Hash | Subject | LOC |
|---|---|---|---|
| 1 | `1673322` | triage.mjs collision mode + spec | +719 |
| 2 | `34504bb` | ko performance/attribution cleanup | +1/-5 |
| 3 | `6c32ac7` | triage.mjs mojibake mode + MOJIBAKE_MAP | +269 |
| 4 | `9e69183` | triage.mjs wrong-language mode + script profile | +269 |
| 5 | `0281530` | triage.mjs dead-subtree mode | +304/-2 |
| 6 | `3245422` | triage.mjs --mode all combined report | +85/-1 |
| 7 | `67c07be` | G6 hook auto-collision gate | +25 |
| 8 | `3dc0992` | TRIAGE_SKIP bypass env var | +23/-18 |
| 9 | `e97286e` | N-157-A principle in CONTRIBUTING.md | +10 |

### 2.3 핵심 발견

#### 2.3.1 detector 가 156 ad-hoc 보다 strictly more conservative

regression test (ko @ ed3c4a0~1):
- 156 ad-hoc 보고: 18 collisions
- 157 detector 측정: 21 collisions = 18 + 3 (graph block self + perf + attrib mixed-kind)
- 156 narrower scope 가 검출 누락한 케이스를 detector 가 메움
- 향후 새 detector 도입 시 이 invariant 패턴 적용

#### 2.3.2 cross-locale contamination system-wide

15 locale dogfood (wrong-language mode):

| Locale | Detections | Pattern |
|---|---:|---|
| ko | 2 | 거의 clean (source) |
| en | 5,085 | Katakana/Han/Hangul mixed |
| ja | 3,739 | 100% Hangul (한국어 source 잔존) |
| zh | 2,713 | 거의 100% Hangul |
| pt = ru = ar = hi | 5,298 | identical (source-fallback clone) |
| es = fr | 5,083 | identical |
| de | 4,731 (incl. Thai 191) | |
| id | **6,010** (worst) | Chinese contamination |
| th | 4,771 | |
| vi | 5,433 | |
| zh-TW | 3,048 | |

translation pipeline 의 system-wide 누락 + cross-locale paste 사고. cleanup 은 사용자 canonical/번역 결정 필요 (외부 의존).

#### 2.3.3 G6 의 G5 gap 메움 입증

ed3c4a0~1 ko.js staged:
- G5: Δ1434 ≤ 1532 narrow pass ✓
- G6: 21 collisions detected → abort ✓

G5 의 leaf-count tolerance 가 너무 coarse 하여 collision-introducing 변경을 잡지 못함. G6 가 정확히 이 gap 메움.

#### 2.3.4 TRIAGE_SKIP 의 안전 bypass 계층

| Mechanism | Skips |
|---|---|
| Default commit | nothing (모든 gate 활성) |
| `TRIAGE_SKIP=1` | G6 only (G2/G5/B1-B4 보호) |
| `--no-verify` | ALL (sacred SHA 노출) |

recon-only commit 시 `--no-verify` 대비 안전한 옵션.

### 2.4 157차 검수자 자기-비판

| 사례 | 도출 |
|---|---|
| spec §8.2 의 pages.marketingIntel live test target 선택 오류 (resolver prefix retry 특성 미고려) | CC 가 정정 후 auth 로 검증. detector 설계 시 i18n resolver 의 implicit transformation 항상 고려 |
| --mode all 분량 추정 ~50 → 실제 85 라인 (per-mode JSON extraction 추가 비용) | 통합 mode 설계 시 child output 파싱 오버헤드 사전 추정 |
| mojibake mode 의 vi 127 detection 중 122 가 context_required (??) | short pattern false-positive 처리 정착. 향후 신규 family 추가 시 `requires_context_match` flag 적극 활용 |

158차 검수자: 위 3건 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + N-156-A + **N-157-A** 준수 명시.

---

## 3. 158차 작업 진입

### 3.1 외부 의존 / 진입 조건

**157 deploy 잔여 의존: 0**. 모든 157 작업 production live.

156차 잔여 의존 그대로 계승. 신규 의존:

| 조건 | 결정 주체 | 상태 |
|---|---|---|
| 156차 모든 의존 (W0/T3/T7/PM Phase 2/번역 mode 등) | 사용자/외부 | 대기 |
| **id 6,010 Chinese contamination cleanup 정책** (157 신규) | 사용자 | 결정 필요 |
| **pt=ru=ar=hi 5,298 identical fallback 정책** (157 신규) | 사용자/번역팀 | 결정 필요 |
| **es=fr 5,083 identical 정책** (157 신규) | 사용자 | 결정 필요 |
| **de Thai 191 paste 사고 처리** (157 신규) | 사용자/번역팀 | 결정 필요 |
| **vi 127 mojibake detection 잔여 처리** (157 신규) | 사용자 (HOLD/DEFER 잔재) | 결정 필요 |

### 3.2 트랙 구조 (157차 종결 시점)

#### 3.2.1 외부 의존 0, 즉시 진입 가능

| 트랙 | 분량 | 비고 |
|---|---|---|
| **tools/triage_apply.mjs** (cleanup automation, dry-run) | 1~2 세션 | detector 결과 입력 → 안전 deletion 후보. write 는 사용자 confirm. 156 step C/D/E 의 transactional 5-gate 패턴 재사용 |
| **tools/session_init.sh 에 triage all 통합** | 작음 | 158차 진입 첫 명령에서 자동 정찰. 157 데이터 즉시 확보 |
| **tools/triage.mjs --help 정비** | 작음 | 5 mode + 환경변수 + 예시 문서화 |
| **G7 wrong-language gate** | 작음 | --no-verify 와 TRIAGE_SKIP 양립. cross-locale contamination 차단 |
| **CI workflow PR-time --mode all** | 중간 | GitHub Actions yaml 추가. PR 별 triage 자동 실행 |
| **tools/triage_self_test.sh** | 작음 | 4 mode regression (e81f4cf~1, ed3c4a0~1, f68117d~1) CI 통합 |
| **NEXT_SESSION 68-153 archive gap rollup** | 큼 | 별도 세션 |

#### 3.2.2 사용자 canonical 결정 후

| 트랙 | 의존 |
|---|---|
| **ja ruleEnginePage.dash.\* cleanup** | sacred SHA 갱신 + N-79 addendum. canonical declaration 결정 (Group 1 vs 2) |
| **zh ruleEnginePage.dash.\* cleanup** | 동일 |
| **id 6,010 Chinese contamination** | 번역 mode 결정 |
| **pt=ru=ar=hi 5,298 identical fallback** | 번역 pipeline 수정 (system-wide) |
| **es=fr 5,083 identical** | 동일 |
| **de Thai 191** | 번역 누락 처리 |
| **vi mojibake HOLD 3 + DEFER 2 잔재** | 번역 mode |

#### 3.2.3 156차 carry-over 트랙

CONTRIBUTING.md §7 참조. W0/T3/T7/PM Phase 2/badge20kpi/PAT_B/PAT_D/PAT_J/K/Emoji-prefix damage/REMNANT 2+totalCac.

### 3.3 158차 첫 응답 권장 패턴

158차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 158` 실행 권유
2. **신규 권유**: `node tools/triage.mjs --locale ko --mode all --quiet` 도 함께 실행 (157 신규 자산 즉시 활용)
3. 결과 확인 (HEAD / sacred SHA / leaf count / 4 mode 종합 detection 분포)
4. 트랙 결정 (검수자 추천 1개 명시, N-152-B)

**검수자 추천 후보 (158차 진입 시)**:
- **tools/triage_apply.mjs** (외부 의존 0, 157 detector 패턴 활용도 ↑↑, 1~2 세션 분량)
- 또는 **tools/session_init.sh + triage all 통합** (작은 응집, 즉시 가치, 0.5 세션)
- 또는 **G7 wrong-language gate** (G6 패턴 재사용, system-wide contamination 자동 차단, 작은 응집)

CC 첫 명령:

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 158 && echo '---triage---' && node tools/triage.mjs --locale ko --mode all --quiet"
```

기대값: HEAD `e97286e`, ko.js 1,441,177 B, leaves 30,656 (Δ=0), ja SHA `67ca0865...` ✓, zh SHA `a4b72633...` ✓, quarantine 4 dirs, ko triage all: collision 0 / mojibake 0 / wrong-language 2.

---

## 4. 157차 작업 자산

### 4.1 영구 도구 (tools/, tracked)

| 경로 | 크기 | 용도 |
|---|---:|---|
| `tools/triage.mjs` | 36,814 B | 5-mode detector (collision/mojibake/wrong-language/dead-subtree/all) |
| `tools/mojibake_map.json` | 1,816 B | 9 mojibake families (f68117d) |
| `tools/locale_script_profile.json` | 3,379 B | 15-locale Unicode script profiles |

기존 (154차 자산): `tools/ci_watch.sh`, `tools/session_init.sh`, `.githooks/pre-commit`, `.githooks/baseline.json`, `CONTRIBUTING.md`.

### 4.2 Hook gate (영구, .githooks/)

| Gate | 트리거 | 동작 |
|---|---|---|
| G2 | sacred ja/zh SHA mismatch | abort |
| G5 | ko.js leaf count drift > 5% | abort |
| B1-B4 | backup/quarantine file staged | abort |
| **G6 (신규)** | locale staged + collision detected | abort (TRIAGE_SKIP=1 로 bypass) |

### 4.3 분석 도구 (gitignored)

| 경로 | 용도 |
|---|---|
| `session157_ko_perf_attrib_purge.mjs` | ko 2 leaf 제거 (1회용, 5-gate validation) |

### 4.4 데이터 자산 (gitignored, 158차 입력 후보)

| 경로 | 내용 |
|---|---|
| `session157_collisions/{ko,en,...}.csv` | 15 locale × collision detector 결과 |
| `session157_wronglang/{ko,en,...}.csv` | 15 locale × wrong-language detector 결과 |

### 4.5 Quarantine 누적 (gitignored, 로컬 보존)

156차 그대로 (157차 신규 0): 4 dirs.

### 4.6 .gitignore session 157 block

session_init.sh 가 자동 추가한 7 line block. 157 종결 시점에 unstaged (정상, 다음 세션 commit 에 포함 예정 또는 158 진입 시 처리).

---

## 5. 잔여 작업 (158차 이후)

### 5.1 즉시 진행 가능 (외부 의존 0)

| 작업 | 분량 |
|---|---|
| **tools/triage_apply.mjs** (cleanup automation) | 1~2 세션 |
| **session_init.sh + triage all 통합** | 0.5 세션 |
| **triage.mjs --help 정비** | 0.5 세션 |
| **G7 wrong-language hook gate** | 작음 |
| **CI workflow PR-time --mode all** | 중간 |
| **tools/triage_self_test.sh** | 작음 |
| **v3 catalog generator fix** | 별도 |
| **PAT_F + PAT_E 잔여** | 작음 |
| **gSug cross-locale sync** | 14 keys × 10 locales |
| **NEXT_SESSION 68-153 archive gap rollup** | 86 sessions |
| **drift Category A 보존 확정** | 3,458 keys |

### 5.2 외부 의존 후 진행

156차 carry-over + 157차 신규:
- 156: W0 / PAT_B / PAT_J / K / PAT_C / PAT_A / PAT_D / Emoji-prefix damage / badge20kpi / REMNANT 2+totalCac / ja-zh multi-decl canonical / T3 / T7 / PM Phase 2
- 157: ja/zh ruleEnginePage.dash.\* cleanup / id 6,010 / pt=ru=ar=hi 5,298 / es=fr 5,083 / de Thai 191 / vi HOLD+DEFER 잔재

### 5.3 큰 사용자 요청 트랙 (외부 사양 필요)

- T1 PM Phase 2
- T4 마케팅 자동화 8 카테고리
- T5 팀 채팅
- T6 프로젝트 협업

---

## 6. 초엔터프라이즈 보강 메모 (158차 결정용)

154차 #5~#8 + 155차 #9~#11 + 156차 #12~#15 + 157차 신규:

| # | 항목 | 사유 |
|---|---|---|
| **#5** | Hook G6 working-tree-vs-index drift | 154 W2 사고 재발 방지 (carry-over) |
| **#6** | tools/session_close.sh | session_init 의 반대 (carry-over) |
| **#7** | tools/triage.mjs | **157차 달성** ✓ |
| **#8** | drift category 자동 라벨링 | 154 W5/W9 (carry-over) |
| **#9** | Pre-detector unit-test discipline | 155 (carry-over) |
| **#10** | Pre-execution grep verification | 155 (carry-over) |
| **#11** | Edit tool capability flag | N-155-A (carry-over) |
| **#12** | AST-only consumer audit standard step | 156 grep-vs-AST blind spot (carry-over) |
| **#13** | Sacred SHA 3-way invariant pattern | 156 step E (carry-over) |
| **#14** | Transactional N-phase batch script template | 156 step D/E (carry-over) |
| **#15** | N-153-D 명문 준수 (recon-only / cleanup 분리) | 156 soft violation (carry-over) |
| **#16 (신규)** | tools/triage_apply.mjs batch cleanup | 157 detector 4 mode 출력 → 안전 deletion plan 생성기. transactional + 사용자 confirm |
| **#17 (신규)** | G7 wrong-language hook gate | 157 system-wide contamination 자동 차단. G6 패턴 재사용 |
| **#18 (신규)** | CI workflow PR-time --mode all | 157 detector 의 CI 통합. 모든 locale 변경 PR 에서 4 mode 실행 |
| **#19 (신규)** | tools/triage_self_test.sh | 157 detector 회귀 방지. e81f4cf~1, ed3c4a0~1, f68117d~1 시점 자동 검증 |

158차 검수자: 위 항목 별도 트랙 진입 시 사용자 결정 우선. **#16 (triage_apply.mjs)** 가 가장 즉시 가치.

---

## 7. 알려진 이슈 / 주의사항 (148~157차 누적)

CONTRIBUTING.md §7 영구 기록 참조. 157차 신규:

- **detector strictly-more-conservative 패턴**: 새 detector 가 과거 보고보다 많이 찾으면 정상. commit body 에 명시
- **G5 leaf tolerance gap**: G6 가 메움. 다른 gate 도 유사 gap 가능성 검토
- **pages.marketingIntel 같은 resolver-prefix retry 케이스**: literal-grep 0 이 dead 보장 안 함. dead-subtree mode 사용 시 결과 해석 주의
- **--mode all child output 파싱 overhead**: 통합 도구 설계 시 stdout 보다 file output 권장

### 7.1 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **paths-ignore**: `**.md`, `**.txt`, `docs/**`, `.claude/**` — docs-only push CI skip (157차 9번 commit 정상 동작)
- **CI 소요**: 평균 40~55초 (157차 측정 ~40초)
- **157차 종결 시점 배포**: 8 commits production + 1 docs-only paths-ignore. 마지막 smoke HTTP 200 / lang="ko"
- **Sacred locale 변경 없이 G2 통과**: 157차 9 commits 전부

### 7.2 157차 검수자 행동 학습 사례 (3건)

| 사례 | 도출 |
|---|---|
| pages.marketingIntel live test target 선택 오류 (resolver prefix retry 미고려) | detector 설계 시 i18n resolver 의 implicit transformation 항상 고려 (보강 #20 후보) |
| --mode all 분량 추정 오차 (~50 → 85) | child output 파싱 오버헤드 사전 추정 |
| mojibake context_required 122/127 비율 | short pattern false-positive 의 requires_context_match flag 적극 활용 |

158차 검수자: 위 3건 인지.

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~157차)

| 카테고리 | 처리 결과 |
|---|---|
| 147~156 (147 Japanese pollution ~ 156 dash.operations purge) | 156차 인계서 참조 |
| **157차 ko 2 leaf cleanup** | perf + attrib unreachable 제거 ✓ |
| **157차 detector 영구화** | 155+156 ad-hoc 5개 → triage.mjs 5 modes ✓ |
| **157차 system-wide contamination 정찰** | 14 non-ko locale 의 wrong-language 분포 측정 (157 wronglang/) |

### 8.2 ko.js leaf trajectory (147~157)

| Session | Leaves | Δ |
|---|---:|---:|
| 153 종결 | 33,211 | -- |
| 154 종결 | 32,096 | -1,115 |
| 155 종결 | 32,090 | -6 |
| 156 종결 | 30,658 | -1,432 |
| **157 종결** | **30,656** | **-2** |

### 8.3 157차 작업 결과

| 항목 | 값 |
|---|---|
| commit (본 작업) | 9 |
| commit (종결) | 0 (인계서는 158 진입 시) |
| push | 9 |
| CI deploys | 8 production green + 1 paths-ignore (정상) |
| smoke dogfood | 8회 |
| 신규 영구 도구 | 1 (triage.mjs) |
| 신규 영구 데이터 | 2 JSON |
| 신규 hook | 1 (G6) |
| 신규 bypass | 1 (TRIAGE_SKIP) |
| 신규 영구 문서 | 1 (N-157-A in CONTRIBUTING.md) |
| 신규 분석 도구 | 1 (session157_ko_perf_attrib_purge.mjs) |
| 신규 데이터 | 30 CSV (15 collisions + 15 wronglang) |
| 운영 원칙 신규 | 1 (N-157-A) |
| i18n entries 제거 (ko) | 2 leaves |
| ko.js 감량 | 64 B |
| ko collision | 2 → 0 (157 신규 발견 + 해소) |
| 검수자 학습 사례 | 3건 |
| 신규 트랙 후보 | 4 (#16~#19 보강 메모) |

---

## 9. 158차 첫 메시지 권장 패턴

### 사용자 → 검수자

"157차 인계서 첨부합니다. 158차 [트랙 결정 또는 구체 작업 지시]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시 (특히 **N-157-A** + N-156-A + N-155-A + N-154-A~D + N-153-A 누적)
- `tools/session_init.sh --session 158` + `node tools/triage.mjs --locale ko --mode all --quiet` 실행 권유
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B 의무)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- 사용자 저장 부담 줄이기 위해 CC Edit tool 우선 (N-154-B)
- consumer audit 4-layer 의무 (156 신규)
- sacred 파일 cleanup 시 N-79 addendum + 3-way invariant (156 신규)
- **detector 반복 패턴 발견 시 즉시 productionise 검토** (N-157-A)
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- **PM 본 작업 진입 시 새 채팅 세션 분리 의무** (N-152-F)
- **N-156-A 정신상 추가 작업 가능 시 적극 진행**

### 검수자 추천 158차 진입 트랙 (N-152-B)

1. **tools/triage_apply.mjs** (외부 의존 0, 157 detector 활용도 ↑↑, 1~2 세션)
   - 4 mode 결과 → 안전 deletion plan
   - transactional 5-gate validation + 사용자 confirm
   - 156 step C/D/E 패턴 재사용

2. (작은 응집 선호 시): **session_init.sh + triage all 통합** (0.5 세션, 즉시 가치)

3. (사용자 결정 후): ja/zh ruleEnginePage.dash.\* cleanup (sacred SHA + N-79)

---

**문서 종결.**