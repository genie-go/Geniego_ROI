## 161차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-25
> **이전 세션**: 160차 (patch08 + patch09 + patch10 + CONTRIBUTING §7 trap 6건 + §6 spec drafting standards, 7 commit)
> **다음 세션**: 161차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G), 검수자 추천 → 사용자 승인

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD**: `8fbda89` docs(contributing): §7 신규 trap — spec 파일 저장 경로 중첩 재발 (160 patch08/09/10 공통 학습)
- **ko.js**: 1,441,177 B (160차 변화 0 B — tooling/hooks/docs 만 변경)
- **ko.js leaves**: 30,656 (159→160 Δ=0, frontend 무터치)
- **참조 locale 파일**: 15개 (ja/zh sacred 156차 갱신 그대로)

### 1.2 Sacred SHA (156 baseline 그대로 유지)

- **ja.js**: `67ca086561405874b2c039352741c9ef99a528997bdaa0ecf24b69568fac20d4` ✓
- **zh.js**: `a4b72633d5925778eedb5820cd034538df53a766d7eac8de54df7bfc3a2e0dde` ✓

baseline 파일: `.githooks/baseline.json` (version 156, ko_leaf_count 30656)

### 1.3 3자 협업 구조 (158차 그대로 계승)

- **CC (Claude Code)**: repo root, `t`-prefix 명령. `cd /e/project/GeniegoROI &&` prefix 의무 (N-153-A)
- **검수자 (Claude 채팅)**: 도구 spec, 결정 추천, CC Edit 우선 (N-154-B)
- **사용자**: cross-validation, spec 파일 저장, 명시 승인, 세션 종결 결정

### 1.4 운영 원칙 (필수 준수, 149~160차 누적)

**영구 ref**: `CONTRIBUTING.md` (160차 commit `4c1b083` §6 신규 sub-section + commit `8fbda89` §7 신규 trap 추가).

**N-prefix 누적 인덱스** (CONTRIBUTING.md §2 단순 재현):

- N-15, N-79, N-145-B, N-145-G (sacred / safety)
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- N-155-A (155차)
- N-156-A (156차)
- N-157-A (157차)
- **158~160차 신규 N-prefix 없음**: §6 Spec drafting standards (160 신규 sub-section) 는 trap-style 학습 카탈로그로 영구화

### 1.5 기술 트랩 (148~160차 누적)

CONTRIBUTING.md §7 영구 기록. **160차 §7 신규 trap 6건 추가**:
- (160 commit `f90e938`): Detector CSV columns ≠ spec 추정 (159 patch06/07 학습)
- (160 commit `f90e938`): paths-ignore 정상 동작 인지 (159 학습)
- (160 commit `f90e938`): Default-resolution 도입 시 self-test 의미 침범 (160 patch08 학습)
- (160 commit `4c1b083`): bash `set -e` + 함수 마지막 `[[ ]] && X` 패턴 silent abort (160 patch09 학습)
- (160 commit `4c1b083`): `pipefail` + `$(cmd | grep | ...)` silent abort (160 patch09 학습)
- (160 commit `8fbda89`): Spec 파일 저장 경로 중첩 재발 (160 patch08/09/10 공통 학습)

§6 신규 sub-section (`### Spec drafting standards`, 160 commit `4c1b083`):
- Repo path canonical verification (#33)
- Import pattern sanity check (#34)
- Production domain sanity check (#35)
- `set -e` / `pipefail` shell idiom audit (patch09 학습)

### 1.6 160차 종결 시점 상태

- **HEAD**: `8fbda89`
- **Working tree**: clean (untracked: 사전 quarantine `triage_out_ko/`, `session157_*/` 등 모두 gitignore 적용)
- **ko.js**: 30,656 leaves, 0 collisions, 0 wrong-language, dead-subtree 0 (dry-run 만)
- **Sacred SHA**: ja/zh 156차 값 그대로 보존 ✓
- **Quarantine 누적**: 4 dirs (160차 신규 0)
- **Production**: HTTP 200 / lang="ko" / patch09 self-smoke + patch10 T1-T7 PASS ✓
- **Pre-commit hook**: G2/G5/B1-B4/G6 + **160 신규 G7-self-test** (ko.js staged 시 aggregate 자동 invoke)
- **신규 영구 도구 (160차)**: 2개 (`tools/triage_apply_self_test_all.sh`, `tools/production_smoke.sh`)

---

## 2. 160차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit** | 7개 |
| **push** | 4회 |
| **CI deploys** | 다수 success |
| **smoke dogfood** | 다회 (HTTP 200 / lang="ko") |
| **신규 영구 도구** | 2 (triage_apply_self_test_all.sh + production_smoke.sh) |
| **신규 영구 문서** | 4 spec (patch08/09/10 + CONTRIBUTING §7 patch draft) |
| **CONTRIBUTING.md 갱신** | §7 trap 6건 + §6 신규 sub-section |
| **운영 원칙 신규** | 0 |
| **i18n entries 수정 (ko)** | 0 |
| **ko.js size 변화** | 0 B |
| **ko.js leaves 변화** | 0 |

### 2.2 commit 분포

| commit | 내용 | 결과 |
|---|---|---|
| `5d4e708` | feat(triage_apply): manifest v2 default 자동 적용 (#27) | G2 PASS |
| `f0503a9` | feat(tools): triage_apply_self_test_all.sh aggregate runner (#24) | G2 PASS, 3/3 |
| `f90e938` | feat(hooks): pre-commit self-test default-on + CONTRIBUTING §7 trap 3건 | G2 PASS |
| `af859bd` | feat(tools): production_smoke.sh — standalone G7-smoke + snapshot diff (#28) | G2 PASS, S1-S7 |
| `4c1b083` | docs(contributing): §7 patch09 trap 2건 + §6 spec drafting standards | G2 PASS |
| `a67d718` | refactor(tools): ci_watch.sh ↔ production_smoke.sh 통합 (DRY, #28 마무리) | G2 PASS, T1-T7 |
| `8fbda89` | docs(contributing): §7 신규 trap — spec 파일 저장 경로 중첩 재발 | G2 PASS |

### 2.3 patch 그룹별 영구화

#### 2.3.1 patch08 (manifest v2 default + self-test aggregate + pre-commit default-on)

- `RESOLVER_MANIFEST_DEFAULT = 'tools/resolver_consumer_manifest_v2.json'`
- `--resolver-manifest` 미지정 시 default v2 자동 fallback
- `TRIAGE_NO_DEFAULT_MANIFEST=1` env escape hatch
- `triage_apply_self_test_all.sh` aggregate runner
- `.githooks/pre-commit`: ko.js staged 시 aggregate 자동 invoke, `TRIAGE_SELFTEST_SKIP=1` bypass

R1-R8 PASS

#### 2.3.2 patch09 (production_smoke.sh standalone)

- ci_watch.sh embedded smoke 를 standalone 화
- before/after snapshot mode + JSON diff
- `--paths` multi-probe, `--domain` override
- exit codes 0/1/2/3/4
- `set -e` + pipefail 함정 회피
- `.gitignore`: `.smoke_snapshots/`

S1-S7 PASS, self-smoke 자기검증 PASS

#### 2.3.3 patch10 (ci_watch ↔ production_smoke DRY 통합)

- production_smoke.sh: `--soft-lang` flag 추가
- ci_watch.sh: embedded smoke → production_smoke.sh 위임
- 의미론 보존 + DRY

T1-T7 PASS

#### 2.3.4 CONTRIBUTING.md §6 신규 sub-section + §7 trap 6건

§6 `### Spec drafting standards (160 학습)`:
- Repo path canonical verification (#33)
- Import pattern sanity check (#34)
- Production domain sanity check (#35)
- `set -e` / `pipefail` shell idiom audit

§7 신규 trap 6건: 위 §1.5 명시.

### 2.4 핵심 학습 (160 신규 3건)

#### 2.4.1 Default-resolution 도입 시 self-test 의미 침범

patch08 default v2 fallback 도입 직후 dead-subtree self-test Mode A 가 default v2 강제 주입으로 6/16 D-check 실패. env var escape hatch 로 self-test 만 default 우회.

#### 2.4.2 bash set -e + pipefail 함정 (2건)

patch09 production_smoke.sh 의 정상 입력 silent abort 회귀:
- 함수 마지막 `[[ ]] && X` 패턴
- `lang=$(curl | grep | ...)` pipefail

**Mitigation**: `return 0` 명시 + `|| echo ""` 폴백.

#### 2.4.3 Spec 파일 저장 경로 중첩 (3회 재발)

patch08/09/10 모두 `docs/spec/docs/spec/` 중첩. CC 매번 cleanup. IDE save dialog default 원인.

### 2.5 160차 검수자 자기-비판

| 사례 | 도출 |
|---|---|
| spec §3.2.2 path regex 오류 (`src/locale/` → 실: `frontend/src/i18n/locales/`) | §6 #33 영구화 |
| spec §3.1.2 `fs.existsSync` (실: named `existsSync`) | §6 #34 영구화 |
| smoke 도메인 typo (`geniegoroi.app` → 실: `roi.genie-go.com`) | §6 #35 영구화 |
| spec §3.1 shell idiom 미대비 | §6 shell idiom audit + §7 trap 2건 영구화 |
| **NEXT_SESSION 초안 사용자 미승인 작성 (세션 중반)** | **161차: 인계서 작성 전 사용자 명시 승인 의무** |
| **작업 여력 잔존 시 추가 트랙 진입 적극성 부족 (1차 종결 시도 후 사용자 지적)** | **161차: 핵심 목표 달성 후 작업 여력 명시 확인 + 추가 트랙 후보 제시 의무** |
| CC tool 의 본문 출력 압축 회피 우회 다회 시도 | 161차: 짧은 범위 + `cat -n` + `printf '=== ===\n'` 패턴 우선 |

161차 검수자: 위 7건 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + N-156-A + N-157-A 준수 명시.

---

## 3. 161차 작업 진입

### 3.1 외부 의존 / 진입 조건

**160 deploy 잔여 의존: 0**. 7 commit 모두 production live.

159 외부 의존 그대로 계승:
- **P4 dead-subtree 실 apply** — 사용자 review 후 결정 (depth=2 73건, depth=3 115건 candidates)
- **manifest v2 default 승격** — **160 patch08 완료** ✓
- **G7 production smoke 자동화** — **160 patch09 + patch10 완료** ✓

### 3.2 트랙 구조 (160차 종결 시점)

#### 3.2.1 외부 의존 0, 즉시 진입 가능

| 트랙 | 분량 | 비고 |
|---|---|---|
| **parse_errors 43건 분석** | 0.3 세션 | babel-parser 실패 frontend/src 파일 |
| **wrapper 함수 추적** | 0.5 세션 | `const tx = useT(); tx('foo')` 패턴 |
| **non-ko locale manifest** | 0.4 세션 | 우선순위 ↓ |

#### 3.2.2 사용자 canonical 결정 후 (159 carry-over)

| 트랙 | 의존 |
|---|---|
| **P4 점진 apply 시작** | 사용자가 159 SUMMARY review 후 candidate 결정 |
| **ja/zh ruleEnginePage.dash.\* cleanup** | sacred SHA 갱신 + N-79 addendum |
| **id 6,010 Chinese contamination** | 번역 mode 결정 |
| **pt=ru=ar=hi 5,298 identical fallback** | 번역 pipeline 수정 |
| **es=fr 5,083 identical** | 동일 |
| **de Thai 191** | 번역 누락 처리 |
| **vi mojibake HOLD 3 + DEFER 2 잔재** | 번역 mode |

#### 3.2.3 큰 사용자 요청 트랙 (외부 사양 필요, 사용자 명시 우선순위)

- **T1 PM Phase 2**: 프로젝트 관리 기능 확장
- **T4 마케팅 자동화**: 8 카테고리 구현
- **T5 팀 채팅**: 팀 협업 채팅
- **T6 프로젝트 협업**: 프로젝트 단위 협업

**중요**: N-152-F (PM 본 작업 진입 시 새 채팅 세션 분리 의무). 사양 작성 후 별도 세션에서 본 작업 진입.

### 3.3 161차 첫 응답 권장 패턴

161차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 161 --self-test` 실행 권유
2. 결과 확인 (HEAD / sacred SHA / leaf count / 13 invariants)
3. 트랙 결정 (검수자 추천 1개 명시, N-152-B)

**검수자 추천 후보 (161차 진입 시)**:

1. **T1~T6 spec 작성** (사용자 명시 우선순위)
   - 사용자 지정 1개 트랙 spec 작성
   - 본 작업은 별도 세션 (N-152-F)

2. **parse_errors 43건 분석** (외부 의존 0, 0.3 세션)
   - manifest v2 정밀도 추가 ↑

3. **P4 점진 apply 시작** (사용자 결정 후)
   - patch09/10 G7 smoke 로 안전 보장

CC 첫 명령:

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 161 --self-test"
```

기대값: HEAD `8fbda89` (or descendant), ko.js 1,441,177 B, leaves 30,656, ja/zh SHA ✓, self-test PASS (13/13).

---

## 4. 160차 작업 자산

### 4.1 영구 도구 (tools/, tracked)

159차 16개 + 160차 2개 신규 = 18개 누적:

| 경로 | 158/159/160 | 용도 |
|---|---|---|
| `tools/triage_apply.mjs` | 158/확장/**160 default v2 + env hatch** | 3 detector × 6-gate apply |
| `tools/leaf_count.mjs` | 158 | cross-platform leaf count |
| `tools/triage_apply_self_test.sh` | 158/확장 | collision 16 invariants |
| `tools/triage_apply_wronglang_self_test.sh` | 159 | wronglang 8 W-invariants |
| `tools/triage_apply_dead_subtree_self_test.sh` | 159/**160 env prefix** | dead-subtree dual-mode 16 D-checks |
| `tools/triage_apply_self_test_all.sh` | **160 신규** | aggregate 3 self-test runner |
| `tools/production_smoke.sh` | **160 신규** | standalone G7-smoke + snapshot diff + soft-lang |
| `tools/ci_watch.sh` | 154/**160 DRY** | production_smoke.sh 위임 |
| `tools/wrong_language_replacement_map.json` | 159 | char substitution map |
| `tools/build_resolver_manifest.mjs` | 159 | regex 기반 (v1) |
| `tools/build_resolver_manifest_v2.mjs` | 159 | babel-parser AST (v2, **default**) |
| `tools/resolver_consumer_manifest.json` | 159 | v1 산출 |
| `tools/resolver_consumer_manifest_v2.json` | 159/**160 default** | v2 산출 |
| `tools/p4_root_enumerator.mjs` | 159 | depth N AST enumeration |
| `tools/p4_verdict_aggregator.mjs` | 159 | verdict CSV 생성 |
| `tools/p4_summary.mjs` | 159 | SUMMARY 생성 |
| `tools/p4_dead_subtree_dryrun.sh` | 159 | depth N pipeline |
| `tools/p5_non_ko_dryrun.sh` | 158→159 | 12 non-ko dryrun |
| `tools/p5_summary.mjs` | 158→159 | P5 SUMMARY |

### 4.2 Hook gate (160 신규 G7)

| Gate | 위치 | 트리거 | 신규 |
|---|---|---|---|
| G2 | pre-commit | sacred SHA mismatch | -- |
| G5 | pre-commit | leaf drift >5% | -- |
| B1-B4 | pre-commit | backup/quarantine staged | -- |
| G6 | pre-commit | locale staged + collision | -- |
| **G7-self-test** | **pre-commit** | **ko.js staged → aggregate self-test 자동 invoke** | **160 신규** |
| **G7-smoke** (de-facto) | **post-apply / CI** | **production_smoke.sh + before/after diff** | **160 신규** |

### 4.3 영구 spec 문서 (docs/spec/, tracked, 160 신규 4개)

| 경로 | 용도 |
|---|---|
| 기존 159 spec 13개 | 그대로 |
| `docs/spec/triage_apply_v1_patch08_v2_default_and_selftest_default.md` | **160** |
| `docs/spec/triage_apply_v1_patch09_production_smoke.md` | **160** |
| `docs/spec/triage_apply_v1_patch10_ci_watch_integration.md` | **160** |
| `docs/spec/CONTRIBUTING_S7_159_traps_patch.md` | **160** patch draft |

---

## 5. 잔여 작업 (161차 이후)

### 5.1 즉시 진행 가능 (외부 의존 0)

160 신규 완료: 1순위 묶음 + G7 smoke 자동화 + DRY 통합 + §7 trap 영구화.

159 carry-over:
- parse_errors 43건 분석 (0.3 세션)
- wrapper 함수 추적 (0.5 세션)
- non-ko locale manifest (0.4 세션, 우선순위 ↓)

157 carry-over: v3 catalog generator / PAT_F/E / gSug cross-locale sync / drift Category A 보존.

### 5.2 외부 의존 후 진행

159 신규: P4 점진 apply (사용자 review 후).

157 carry-over: ja/zh dash.* / id 6,010 / pt=ru=ar=hi 5,298 / es=fr 5,083 / de Thai 191 / vi HOLD+DEFER.

156 carry-over: W0 / PAT_B/J/K/C/A/D / Emoji-prefix damage / badge20kpi / REMNANT 2+totalCac / ja-zh multi-decl / T3 / T7.

### 5.3 큰 사용자 요청 트랙 (외부 사양 필요, 사용자 명시 우선순위)

- **T1 PM Phase 2**
- **T4 마케팅 자동화** 8 카테고리
- **T5 팀 채팅**
- **T6 프로젝트 협업**

---

## 6. 초엔터프라이즈 보강 메모 (161차 결정용)

| # | 항목 | 사유 | 160 상태 |
|---|---|---|---|
| #25 | resolver manifest v1/v2 | dead-subtree apply 의존 | 완료 |
| #26 | P4 depth1/2/3 dry-run | candidate 발굴 | 완료 |
| **#27** | **manifest v2 default 승격** | v1 false-positive 제거 | **160 patch08 완료** ✓ |
| **#28** | **G7 production smoke 자동화** | 실 apply 진입 전 안전 | **160 patch09 + patch10 완료** ✓ |
| #29 | parse_errors 43건 분석 | manifest v2 정밀도 ↑ | 후보 |
| #30 | wrapper 함수 추적 | const tx=useT() 패턴 | 후보 |
| #31 | P4 점진 apply 트랙 | 115 candidates 실 apply | 후보 (외부 의존) |
| **#32** | **--self-test default-on (pre-commit G7)** | ko.js staged 자동 회귀 | **160 patch08 완료** ✓ |
| **#33** | **detector spec repo path canonical 표준** | spec 작성 시 path 사전 grep | **160 §6 영구화** ✓ |
| **#34** | **spec 코드 예제 import 패턴 사전 grep** | fs.existsSync 회귀 방지 | **160 §6 영구화** ✓ |
| **#35** | **smoke 도메인 spec 사전 검증** | production domain 확인 | **160 §6 영구화** ✓ |
| **#36 (160 신규)** | **shell set -e/pipefail idiom audit 표준** | patch09 silent abort 회피 | **160 §6 영구화** ✓ |
| **#37 (160 신규)** | **spec 파일 저장 경로 중첩 회피 표준** | patch08/09/10 3회 재발 | **160 §7 영구화** ✓ |

161차 검수자: **#29 parse_errors 분석** 또는 **#31 P4 점진 apply (사용자 결정 후)** 가 logical 다음 후보.

---

## 7. 알려진 이슈 / 주의사항 (148~160차 누적)

CONTRIBUTING.md §7 영구 기록 참조. **160차 §7 trap 누적**: 158 신규 3건 + 159 신규 2건 + **160 신규 3건** = 8건+.

### 7.1 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **paths-ignore**: `**.md`, `**.txt`, `docs/**`, `.claude/**` (158 인계서 명시)
- **160차 7 push**: tools/ + .githooks/ 변경 다수 → CI 트리거 모두 success
- **CI 소요**: 평균 38~46초

### 7.2 160차 검수자 행동 학습 (7건)

| 사례 | 도출 |
|---|---|
| spec path regex 오류 | 161차: §6 #33 의무 준수 |
| spec import 패턴 오류 | 161차: §6 #34 의무 준수 |
| smoke 도메인 typo | 161차: §6 #35 의무 준수 |
| spec shell idiom 미대비 | 161차: §6 shell idiom audit 의무 준수 |
| **NEXT_SESSION 초안 사용자 미승인 작성** | **161차: 인계서 작성 전 사용자 명시 승인 의무** |
| **작업 여력 잔존 시 추가 트랙 진입 적극성 부족** | **161차: 핵심 목표 달성 후 작업 여력 명시 확인 + 추가 트랙 후보 제시 의무** |
| CC tool 의 본문 출력 압축 회피 우회 | 161차: 짧은 범위 + `cat -n` + `printf '=== ===\n'` 패턴 우선 |

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~160차)

| 카테고리 | 처리 결과 |
|---|---|
| 147~159 | 159차 인계서 참조 |
| **160 patch08 manifest v2 default** | RESOLVER_MANIFEST_DEFAULT + escape hatch ✓ |
| **160 patch08 self-test aggregate** | triage_apply_self_test_all.sh ✓ |
| **160 patch08 pre-commit G7** | ko.js staged 시 자동 invoke ✓ |
| **160 patch09 production_smoke standalone** | snapshot diff + soft-lang ✓ |
| **160 patch10 ci_watch DRY 통합** | embedded smoke 제거, 단일 진입점 ✓ |
| **160 CONTRIBUTING §6 + §7 영구화** | spec drafting standards + 6 신규 trap ✓ |

### 8.2 ko.js leaf trajectory (147~160)

| Session | Leaves | Δ |
|---|---:|---:|
| 153 종결 | 33,211 | -- |
| 154 종결 | 32,096 | -1,115 |
| 155 종결 | 32,090 | -6 |
| 156 종결 | 30,658 | -1,432 |
| 157 종결 | 30,656 | -2 |
| 158 종결 | 30,656 | 0 |
| 159 종결 | 30,656 | 0 |
| **160 종결** | **30,656** | **0** (tooling/hooks/docs only) |

**P4 dry-run 잠재 감축** (사용자 review 후 실 apply 시):
- depth=2 73 candidates: 최대 -11,390 leaves
- depth=3 115 candidates: 최대 -6,770 leaves

### 8.3 160차 작업 결과

| 항목 | 값 |
|---|---|
| commit | 7 |
| push | 4 batch |
| CI deploys | 다수 success |
| smoke dogfood | 다회 (HTTP 200 / lang="ko") |
| 신규 영구 도구 | 2 (triage_apply_self_test_all.sh + production_smoke.sh) |
| 신규 영구 문서 | 4 spec |
| 신규 SUMMARY (tracked) | 0 |
| CONTRIBUTING.md 갱신 | §6 신규 sub-section + §7 trap 6건 ✓ |
| 운영 원칙 신규 | 0 |
| i18n entries 수정 (ko) | 0 |
| ko.js size 변화 | 0 B |
| 검수자 학습 사례 | 7건 |
| 신규 트랙 후보 | 6 (#32~#37 보강 메모) |

---

## 9. 161차 첫 메시지 권장 패턴

### 사용자 → 검수자

"160차 인계서 첨부합니다. 161차 [T1~T6 중 하나 또는 #29/#31 결정]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시 (N-157-A + N-156-A + N-155-A + N-154-A~D + N-153-A 누적)
- `tools/session_init.sh --session 161 --self-test` 실행 권유
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B 의무)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- CC Edit tool 우선 (N-154-B)
- consumer audit 4-layer 의무 (156 신규)
- sacred 파일 cleanup 시 N-79 addendum + 3-way invariant (156 신규)
- detector 반복 패턴 발견 시 즉시 productionise (N-157-A)
- **§6 Spec drafting standards 4건 의무 준수** (160 신규): repo path / import 패턴 / production 도메인 / shell idiom 사전 grep
- **spec 파일 안내 시 절대경로 + dropdown 주의 + 저장 후 find 검증 3건 명시** (160 §7 trap)
- **NEXT_SESSION 인계서 작성 전 사용자 명시 승인 의무** (160 검수자 자기-비판)
- **작업 여력 잔존 시 추가 트랙 후보 제시 의무** (160 검수자 자기-비판)
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- **PM 본 작업 (T1~T6) 진입 시 새 채팅 세션 분리 의무** (N-152-F)
- **N-156-A 정신상 추가 작업 가능 시 적극 진행**

### 검수자 추천 161차 진입 트랙 (N-152-B)

**1순위 (사용자 명시 우선순위 T1~T6)**:
- 사용자 지정 T1~T6 중 1개 spec 작성
- 검수자 spec draft 작성 → 사용자 저장 → CC repo 반영
- 본 작업은 별도 세션 (N-152-F)

**2순위 (작업 여력 최대 원칙 시, 외부 의존 0)**:
- **parse_errors 43건 분석** (#29, 0.3 세션)

**3순위 (사용자 결정 후)**:
- **P4 점진 apply 시작** (#31, patch09/10 G7 smoke 로 안전 보장)

**4순위 (사용자 결정 후)**: ja/zh ruleEnginePage.dash.\* cleanup

---

**문서 종결.**