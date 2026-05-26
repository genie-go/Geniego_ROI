## 165차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-26
> **이전 세션**: 164차 (4 commit, 3 push batch, 2 트랙 종결: #46 anchored gitignore 근본 해소 + #47 frontend i18n 패턴 분기 검증)
> **다음 세션**: 165차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 검수자 권고 → 사용자 승인 (U-163-A: 작업 여력 부족 판단 + §6 #41 v2 재발 3회 누적)

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD**: `29ed731` docs(contributing): #47 frontend i18n 패턴 분기 영구화 + §7 trap M
- **origin/master**: `29ed731` (164차 3 push batch 모두 반영)
- **ko.js**: 1,441,177 B (164차 변화 0 B — i18n entries 무터치)
- **ko.js leaves (canonical, `tools/leaf_count.mjs`)**: **30,656** (163→164 Δ=0)
- **manifest v2 summary** (working-tree, HEAD M-dirty 3세션 carry): direct 5272 / prefix 53 / dynamic 3 / **parse_errors 0**
  - **HEAD baseline**: direct 5272 / prefix 53 / parse_errors 43 (162 stale, trap I carry 3세션 — §7)
- **참조 locale 파일**: 15개 (ja/zh sacred 156차 갱신 그대로)
- **CONTRIBUTING.md**: **492 lines** (163 종결 486 → 164 종결 492, **+6 lines**)
- **.githooks/pre-commit**: 179 lines (162 종결 그대로, G8 hook 영구 보호 유지)

### 1.2 Sacred SHA (156 baseline 그대로 유지)

- **ja.js**: `67ca086561405874b2c039352741c9ef99a528997bdaa0ecf24b69568fac20d4` ✓
- **zh.js**: `a4b72633d5925778eedb5820cd034538df53a766d7eac8de54df7bfc3a2e0dde` ✓

baseline 파일: `.githooks/baseline.json` (version 156, ko_leaf_count 30656)

### 1.3 3자 협업 구조 (158차 그대로 계승)

- **CC (Claude Code)**: repo root, `t`-prefix 명령. `cd /e/project/GeniegoROI &&` prefix 의무 (N-153-A)
- **검수자 (Claude 채팅)**: 도구 spec, 결정 추천, CC Edit 우선 (N-154-B + U-163-C)
- **사용자**: cross-validation, spec 파일 저장, 명시 승인, 세션 종결 결정

### 1.4 운영 원칙 (필수 준수, 149~164차 누적)

**영구 ref**: `CONTRIBUTING.md` (164차 §6 #46/#47 + §7 trap L 갱신 + trap M 영구화 완결).

**N-prefix 누적 인덱스** (변화 없음):
- N-15, N-79, N-145-B, N-145-G (sacred / safety)
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- N-155-A (155차)
- N-156-A (156차)
- N-157-A (157차)
- 158~164차 신규 N-prefix 없음

**U-prefix 사용자 명시 지시 (164 누적)**:
- **U-161-A ~ H** (161차)
- **U-162-A** (162차): 작업 여력 잔존 시 최대 진행 — 부분 종결 포함
- **U-162-B** (162차): 인계서에 작업 범위 강제 명시 금지
- **U-162-C** (162차): step 종결 시점마다 검수자 작업 여력 보고 의무
- **U-163-A** (163차): 인계서 작성 = 작업 여력 부족 판단 시 사용자 승인 요청 의무
- **U-163-B** (163차): 검수자 사용자 설명은 핵심만 짧게
- **U-163-C** (163차): CC 직접 수정 원칙 (사용자 직접 수정은 예외)
- **U-163-D** (163차): 초엔터프라이즈급 품질 의무
- **U-163-E** (163차): 사용자 선택 시 검수자 추천 1개 의무 (N-152-B 강화)

### 1.5 164차 작업 결과 통계

| 항목 | 값 |
|---|---|
| **commit** | 4 (모두 push) |
| **push batch** | 3 |
| **CI deploys** | 2 발생 (c1d5bd4 .gitignore/tools/sh + 6d19387 .github/workflows/*.yml — paths-ignore 미커버 / 이후 ba3ac15·29ed731 **.md skip 예상) |
| **신규 영구 도구** | 0 |
| **신규 영구 spec 문서** | 0 (§7 #37 v4 적용: CC inline heredoc/Edit 만으로 영구화) |
| **CONTRIBUTING.md 갱신** | +6 lines (§6 #46 + #47 + §7 trap L (b) + trap M) |
| **운영 원칙 신규** | 0 (U-163-A~E 그대로 적용 + 본 세션 실증) |
| **i18n entries 수정 (ko)** | 0 |
| **ko.js size 변화** | 0 B |
| **ko.js leaves 변화** | 0 (canonical 30,656) |
| **manifest parse_errors (working-tree)** | 0 → 0 (유지) |
| **§6 #41 재발** | 164차 3회 (Step 1 in-file 정의 가정 정정 + M3 drift 2회) → 자동 carry-over trigger 작동 |

### 1.6 164차 commit 분포

| # | sha | type | 트랙 | CI |
|---|---|---|---|---|
| 0 | `ceb73b7` | docs | 164차 인계서 (163 종결) | skip |
| 1 | `c1d5bd4` | fix(gitignore) | #46 anchored session patterns (.gitignore 60 라인 + tools/session_init.sh PATTERN_BLOCK 6 확장자) | **fire** (paths-ignore 미커버 시점) |
| 2 | `6d19387` | fix(ci) | #46 paths-ignore 확장 (.gitignore / tools/** / .githooks/**) | **fire** (.github/workflows/*.yml 자체 미커버) |
| 3 | `ba3ac15` | docs(contributing) | §6 #46 + §7 trap L (b) 갱신 | skip |
| 4 | `29ed731` | docs(contributing) | §6 #47 + §7 trap M (frontend i18n 패턴 분기) | skip (paths-ignore **.md 검증 1차 증거) |

### 1.7 164차 트랙별 영구화 핵심

**Commit A/B/C — #46 트랙 (trap L 근본 해소 + paths-ignore 확장)**:
- 출발: 163 trap L (.gitignore unanchored basename) 근본 fix carry
- 발견 1: .gitignore exception (negation) 패턴이 file-end append 방식에 취약 — line 순서 race (negation 후 append 된 unanchored 라인이 무력화)
- 해소: 패턴 자체를 `/session{N}_*.{ext}` anchored 화 (negation 의존 제거). .gitignore 60 라인 일괄 전환 + tools/session_init.sh PATTERN_BLOCK 6 확장자 모두 / prefix
- 발견 2: c1d5bd4 자체가 .gitignore/tools/*.sh paths-ignore 미커버 → housekeeping commit deploy 트리거
- 부가 해소: 6d19387 paths-ignore 확장 (.gitignore / tools/** / .githooks/**) — frontend build 무관 검증 (grep 0건)
- 회귀 테스트 PASS: docs/spec/session{163,164,165}_*.md NOT IGNORED ✓ / repo root session163_*.md IGNORED 유지 ✓
- 영구화: §6 #46 + §7 trap L (b) #46 영구화 완료 갱신

**Commit D — #47 트랙 (frontend i18n 패턴 분기 검증)**:
- 출발: 163 #42 트랙 carry — useTr 3 in-file 정의 (BudgetTracker/ReturnsPortal/SupplyChain) 통합 여부
- Step 1 진단 정정 (#41 재발 1회): ReturnsPortal 은 rpI18n.js 별도 sidecar import — in-file 가정 반박
- Step 3 dict 구조 분석: 3 페이지 완전 상이 (inline T / sidecar / hybrid), 통합 가설 반박
- Step 5/6 전수 인벤토리 (117 files): 6 패턴 공존 — useT/context 111 / inline T 1 / sidecar 2 / hybrid 1 / k_helper 1 / DICT_named 1
- **중대 발견**: BudgetTracker 98 keys × ko.js `budgetTracker:` ns 부재 → 전 키 영어 default 폴백 = **한국어 사용자 전수 미번역 확정**
- 부가 발견: PriceOpt dual-source (ko.js `priceOpt:` + poI18n.js 사이드카 동시) 우선순위 미확인 / CampaignManager `_k=k=>'campMgr.'+k` 정의 위치 미확인
- 인라인 `t(key, default)` callsites 705건 — 영어 default 폴백 의존 광범위
- 영구화: §6 #47 + §7 trap M (i18n inline default 폴백의 한국어 미번역 hidden 위험, §6 #43 dead-key 와 대척점)

**M3 트랙 미진입 (drift 인지 + 자가 중지)**:
- 종결 직전 Step 10-A/10-B 에서 M3 (731 orphan guide* 출처) 본 측정 step 진입 실패 2회
- CC drift: context exploration → 4 선택지 재제시, 측정 본 실행 없음
- 검수자 brake 약화 인지 → §6 #41 v2 재발 3회 도달 → U-163-A 적용 → 종결 권고
- M3 본 측정은 165 P5 트랙으로 carry

### 1.8 164차 검수자 자기-비판 (§6 #41 재발 3건)

| # | 가설 | 반박 (CC 정정) |
|---|---|---|
| 1 | useTr 3 in-file 정의 (BudgetTracker/ReturnsPortal/SupplyChain) | ReturnsPortal 은 rpI18n.js 별도 sidecar import — Step 3 재검증 |
| 2 | Step 10-A "163 carry context 확인" 으로 M3 measurement 진입 | CC drift 4 선택지 재제시, 측정 본 실행 없음 |
| 3 | Step 10-B "spec 본문 + 도구 위치" 재확인으로 M3 진입 재시도 | CC drift 재발 + 검수자 measurement-first 원칙 약화 인지 |

165차 검수자: §6 #41 v2 의 null hypothesis 의무 + 자동 carry-over 자동 적용 의무. 첫 응답에서 인지 명시. M3 진입 시 measurement step 직접 명령 (context exploration 우회) 의무.

### 1.9 164차 §7 trap 활동 요약

| Trap | 활동 | 결과 |
|---|---|---|
| **trap I** | manifest HEAD baseline 미커밋 carry | 3세션 (162~164) 지속. 165 B-Commit 후보. |
| **trap J** | /dev/stdin → Windows ENOENT | 1회 재발 (Step 11-B 측정), `fs.readFileSync(0)` fd=0 우회. 영구화 본문 carry 명시. |
| **trap L** | .gitignore unanchored | **#46 영구화로 근본 해소 완료** (c1d5bd4 + 6d19387) |
| **trap M (신규)** | i18n inline default 한국어 미번역 hidden 위험 | BudgetTracker 98 keys 확정 + 705 callsites 광범위 carry |

### 1.10 164차 작업 흐름 학습 (165 검수자 인지 의무)

164 종결 직전 추가 학습 (사용자 직접 지시 + 본 세션 실증):

- **인계서는 검수자가 artifact 로 작성 + 사용자 직접 저장 → CC commit 흐름**: 본 165 인계서가 그 방식으로 작성됨. CC heredoc 일괄 작성 시도 (Step 12-A) 는 parser timeout / resource limit 으로 실패. 다음 적용: 200+ line 본문은 artifact 우선, CC heredoc 은 < 200 line 본문에만 적용 (162 §7 #37 v4 보완).
- **CC drift signal**: 측정 step 요청 → context exploration 응답 + 4 선택지 재제시 = drift. 즉시 중지 + measurement step 직접 명령으로 재정렬.
- **N-152-B + U-163-E 강화 실증**: 사용자가 "1 또는 2" / "검수자 추천" 등 모호 응답 시, 검수자가 추천 1건 명시 + 사용자 명시 응답 재요청 의무.

---

## 2. 165차 진입 가이드

### 2.1 외부 의존 / 진입 조건

**164 deploy 잔여 의존**: 0. 4 commit 모두 push 완료.

**carry-over 잔여 (HEAD M-dirty)**:
- **B-Commit candidate**: `tools/resolver_consumer_manifest_v2.json` (161 baseline regen, HEAD parse_errors 43 → WT 0). 3세션 carry, **사용자 명시 승인 의무** (deploy 1회 발생, tools/** paths-ignore 적용 후 첫 검증 기회 — 사실상 skip 예상이나 확인 필요).
- **세션 close**: `.gitignore` (session-init append) + 4 quarantine 디렉터리 (session157_*, triage_*).

### 2.2 165차 첫 응답 권장 패턴

165차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 165 --self-test` 실행 권유
2. 결과 확인 (HEAD `29ed731` / sacred SHA / leaf count canonical 30,656 / self-test PASS / manifest WT parse_errors 0)
3. 운영 원칙 인지 명시 (N-152~157 누적 + U-161-A~H + U-162-A/B/C + U-163-A/B/C/D/E)
4. 트랙 결정 시 사용자에게 후보 제시 + 검수자 추천 1개 명시 (N-152-B + U-163-E)

CC 첫 명령:

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 165 --self-test"
```

기대값: HEAD `29ed731`, ko.js 1,441,177 B, leaves 30,656 (canonical), ja/zh SHA ✓, self-test PASS (13/13), manifest WT parse_errors 0.

### 2.3 검수자 행동 의무 (164 신규 영구화 포함)

164차에 영구화된 행동 의무 — 165 검수자 첫 응답에 인지 명시:

- **§6 #46 anchored gitignore + paths-ignore 학습**: .gitignore 패턴은 anchored (/ prefix) 가 negation 보다 견고. paths-ignore 는 build artifact 무관 경로 모두 명시 의무.
- **§6 #47 i18n 패턴 분기 검증 3축**: (a) ns vs ko.js 정합 (b) sidecar dual-source 충돌 (c) helper 공유 정의 위치 — 동시 측정 의무
- **§7 trap M i18n under-translation hidden 위험**: `t(key, default)` callsite 705건 광범위, BudgetTracker 98 keys 확정 미번역. inline default 사용 시 ko.js ns 추가 동시 의무
- **measurement-first 원칙** (164 §6 #41 v2 재발 3회 학습): 트랙 진입 시 context exploration 우회, measurement step 직접 명령. 4 선택지 재제시 = drift signal → 즉시 중지
- **인계서 작성 흐름** (164 §1.10 학습): 200+ line = artifact 우선. CC heredoc 은 < 200 line 본문에만.
- §7 trap J Windows Node `/dev/stdin` ENOENT 회피: `fs.readFileSync(0)` fd=0 우회 (164 1회 재발 실증)
- 163 §6 #41 v2 / #42 / #43 의무 그대로 유지 (null hypothesis + 영구화 직후 재확인 + strict pattern)
- 163 §7 trap G/H/I/J/K/L 인지 그대로

### 2.4 후보 트랙 (165차 진입 시점)

**참고**: 본 목록은 **후보 제시** 만 (U-162-B). 사용자가 그 시점에 결정. 검수자 추천 1건 명시 의무 (N-152-B + U-163-E).

**164 carry-over (신규)**:

| 트랙 | 분량 | 외부 의존 | 비고 |
|---|---|---|---|
| **B-Commit** | 0.1 세션 | **사용자 승인** | 161 baseline regen commit (3세션 carry). 6d19387 paths-ignore 확장 후 첫 검증 — deploy skip 예상이나 사용자 명시 승인 의무. trap I 해소. |
| **P5-M3 guide* template 출처** | 0.3 세션 | 없음 | 164 미진입 (drift 회피). 165 measurement-first 진입 의무. orphan top namespace 중 guide* prefix 분석. |
| **P5 BudgetTracker 수정** | PM급 | 14 lang 번역 | 98 keys × 14 lang, T1~T6 분리 의무 (N-152-F). 한국어만 부분 종결 가능. |
| **P5 PriceOpt dual-source 우선순위** | 0.3 세션 | 없음 | ko.js priceOpt + poI18n.js 사이드카 동시, 어느 source 우선인지 측정 |
| **P5 CampaignManager `_k` 정의 측정** | 0.2 세션 | 없음 | in-file vs 공유 hook 가능성 |
| **P5 705 inline default 정합률** | 0.5 세션 | 없음 | callsites 전수 default vs ko.js 일치율 정량 (시스템 under-translation 규모) |
| **#48 manifest scanner ns 컬럼** | 0.5+ 세션 | 없음 | trap M Mitigation (b). build_resolver_manifest_v2.mjs 확장 + baseline regen carry (trap I 연계) |

**163 carry-over**:

| 트랙 | 분량 | 외부 의존 | 비고 |
|---|---|---|---|
| **P5-M4 abandoned 검증** | 0.5 세션 | 없음 | influencer (63) / recon (56) / email (53) orphan 출처 |
| **P4 dead-key cleanup 진입** | 1-2 세션 | 사용자 review | 18,001 candidates, strict pattern (§6 #43) 적용 |
| **#43 non-ko locale manifest** | 0.4 세션 | 없음 | 157 carry — locale_scope=ko 고정 재정의 필요 |
| **useTr 통합** | - | - | 164 #47 로 분석 종결: 3 페이지 의도 상이 (통합 부적합), 인벤토리만 가치. carry 해제 검토 |

**기존 carry-over**:

| 트랙 | 분량 | 외부 의존 | 비고 |
|---|---|---|---|
| **#47 id 6,010 Chinese contamination** | - | 번역 mode | 156 carry-over |
| **#48 pt=ru=ar=hi 5,298 identical** | - | 번역 pipeline | 156 carry-over |
| **#49 es=fr 5,083 identical** | - | 번역 pipeline | 156 carry-over |
| **#50 de Thai 191** | - | 번역 누락 | 156 carry-over |
| **#51 vi mojibake HOLD/DEFER** | - | 번역 mode | 156 carry-over |
| **#52 v3 catalog generator** | - | 사양 미정 | 157 carry-over |

### 2.5 큰 사용자 요청 트랙 (외부 사양 필요)

- **T1 PM Phase 2**: 프로젝트 관리 기능 확장
- **T4 마케팅 자동화**: 8 카테고리 구현
- **T5 팀 채팅**
- **T6 프로젝트 협업**

**중요**: N-152-F (PM 본 작업 진입 시 새 채팅 세션 분리 의무).

---

## 3. 164차 작업 자산

### 3.1 영구 spec 문서 (docs/spec/, 164 신규 0)

164차는 §7 #37 v4 (CC inline heredoc + Edit) 적용으로 spec 파일 생성 없이 CONTRIBUTING.md 직접 Edit 만으로 영구화 완결. 단 165 인계서 자체는 artifact 우선 흐름 적용 (§1.10).

### 3.2 영구 도구 / Hook (164 변화)

- **신규 도구**: 0
- **신규 hook**: 0
- **기존 변경**: `tools/session_init.sh` PATTERN_BLOCK 6 확장자 anchored (`session${SESSION}_*.{md,mjs,csv,json,txt,sh}` → `/session${SESSION}_*.{...}`)
- **기존 G8 hook**: 162 영구 보호 그대로

### 3.3 CI 변경 (164 신규)

- `.github/workflows/deploy.yml` paths-ignore +3 항목: `.gitignore`, `tools/**`, `.githooks/**`
- 효과: 향후 housekeeping commit (.gitignore / tools / githooks 변경) 자동 deploy skip

---

## 4. 잔여 작업 (165차 이후)

### 4.1 즉시 진행 가능 (외부 의존 0)

**164 신규 carry-over**:
- **P5-M3** (guide* template 출처) ← 165 measurement-first 진입 의무
- **P5 PriceOpt dual-source 우선순위**
- **P5 CampaignManager `_k` 정의**
- **P5 705 default 정합률**
- **#48 manifest scanner ns 컬럼** (단 trap I 연계로 baseline regen 고려)

**163 carry-over**:
- **P5-M4 abandoned 검증** (influencer/recon/email)
- non-ko locale manifest 재정의
- v3 catalog generator

### 4.2 외부 의존 후 진행

**164 신규**:
- **B-Commit** (사용자 승인, deploy skip 예상이나 명시 의무)
- **P5 BudgetTracker 98 keys 수정** (14 lang 번역, PM급)

**163 carry-over**: P4 dead-key cleanup (18,001 candidates, 사용자 review).

**기존 carry-over**: ja/zh dash.* / id 6,010 / pt=ru=ar=hi 5,298 / es=fr 5,083 / de Thai 191 / vi HOLD+DEFER / W0 / PAT_B/J/K/C/A/D / Emoji-prefix damage / badge20kpi / REMNANT 2+totalCac / ja-zh multi-decl / T3 / T7.

---

## 5. 핵심 메트릭

### 5.1 i18n 진행 누적

164차 i18n entries 직접 변경 0. 도구·hook·문서·patch 영구화 + **정량 분석** 만:
- **frontend/src/pages 117 files 전수 i18n 패턴 분포** (6 패턴 공존)
- **BudgetTracker 98 keys 한국어 미번역 확정** (시스템 under-translation 단일 케이스 확정)
- **705 inline t(key, default) callsites** (시스템 under-translation 잠재 규모)

### 5.2 ko.js leaf trajectory (156~164, canonical)

| Session | Leaves (canonical) | Δ |
|---|---:|---:|
| 156 종결 | 30,658 | -1,432 |
| 157 종결 | 30,656 | -2 |
| 158~163 종결 | 30,656 | 0 |
| **164 종결** | **30,656** | **0** |

### 5.3 manifest v2 trajectory

| Session | HEAD parse_errors | Working-tree parse_errors |
|---|---:|---:|
| 159 (v2 도입) | 43 | 43 |
| 160 (v2 default) | 43 | 43 |
| 161 종결 | **43** | 0 |
| 162~164 종결 | 43 | 0 |

**Trap I carry**: HEAD baseline 이 161 baseline regen 미커밋 (3세션 carry). B-Commit 시 해소.

### 5.4 CONTRIBUTING.md 진행 누적

| Session | Lines | Δ |
|---|---:|---:|
| 161 종결 | 399 | -- |
| 162 종결 | 465 | +66 |
| 163 종결 | 486 | +21 |
| **164 종결** | **492** | **+6** |

---

## 6. 알려진 이슈 / 주의사항 (148~164차 누적)

CONTRIBUTING.md §7 영구 기록 참조 (164차 §7 trap 누적: 15+ 기존 + E/F (162) + G/H/I/J/K/L (163) + **M (164)**).

### 6.1 §7 trap 누적

기존 trap (148~163): 15+ trap table + 158~163 detailed entries.

**164 신규**:
- **#46 트랙**: §6 #46 영구화 (anchored gitignore + paths-ignore 학습) + §7 trap L (b) #46 완료 갱신
- **#47 트랙**: §6 #47 영구화 (i18n 패턴 분기 3축 검증) + §7 trap M 신규 (i18n under-translation hidden 위험)
- **trap J 1회 재발**: Windows Node /dev/stdin ENOENT, fd=0 우회 (Step 11-B)
- **trap I 3세션 carry**: HEAD baseline parse_errors=43 stale, WT=0 청정. B-Commit 미해소.

**§6 #41 진화**:
- 163 #42 트랙 v1: "추론→실측" 의무 영구화
- 163 orphan 트랙 v2: 1 세션 재발 3회 학습 → null hypothesis + 2회 carry-over + CC 카운트
- 164 실증: v2 carry-over trigger 작동 (Step 10-A/10-B M3 drift + Step 1 정정 = 3회), 종결 사유

**§7 #37 v4 (162) — 164 적용 실증 + 한계**:
- 164차 영구화 100% CC inline heredoc + Edit (spec 파일 0건) — v4 워크플로 본문 영구화에 성공
- 단 인계서 (200+ line) 일괄 heredoc 작성 시 CC parser timeout — artifact 흐름으로 회귀 필요 (§1.10 학습)
- trap J 1회 재발 (별도 차원)

### 6.2 CI / 프로덕션

- **paths-ignore** (164 확장 후): `**.md`, `**.txt`, `docs/**`, `.claude/**`, `.githooks/**`, `.gitignore`, `tools/**`
- 164차 commit 분포: c1d5bd4 + 6d19387 = deploy 2회 발생 (paths-ignore 적용 전), ba3ac15 + 29ed731 = skip 예상 (1차 검증)
- **B-Commit (carry)**: tools/resolver_consumer_manifest_v2.json — tools/** paths-ignore 적용 후 첫 검증 기회. deploy skip 예상이나 사용자 명시 승인 의무.

### 6.3 운영 사항

- **G8 hook**: 162 영구 보호 그대로 (parse_errors=0 회귀 방지)
- **leaf count canonical**: `tools/leaf_count.mjs <path>` (path 인자 필수). 다른 walk 사용 시 Δ 명시 의무.
- **spec 파일명 prefix**: `contributing_patch_session<N>_<topic>.md` 권장 (단 #46 영구화 후 `docs/spec/session<N>_*.md` 도 NOT IGNORED 가능, anchored 차단 회피 확인됨)
- **stdin redirect**: Windows Node `/dev/stdin` 회피, `fs.readFileSync(0)` fd=0 우회
- **인계서 작성**: artifact 흐름 (검수자 → 사용자 저장 → CC commit) 우선, CC heredoc 은 < 200 line 본문에만

---

## 7. 165차 첫 메시지 권장 패턴

### 사용자 → 검수자

"164차 인계서 첨부합니다. 165차 [트랙 결정 또는 자유 진행]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시:
  - N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + N-156-A + N-157-A 누적
  - U-161-A~H (161 사용자 명시)
  - U-162-A/B/C (162 사용자 명시)
  - U-163-A/B/C/D/E (163 사용자 명시)
- `tools/session_init.sh --session 165 --self-test` 실행 권유
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B + U-163-E)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- CC Edit tool 우선 (N-154-B + U-163-C)
- 164 §6 #46/#47 + §7 trap M 의무 (anchored / 3축 검증 / under-translation 위험)
- 164 measurement-first 원칙 (§6 #41 v2 carry-over 실증): 트랙 진입 시 context exploration 우회, measurement step 직접 명령
- 164 인계서 작성 흐름 (§1.10): 200+ line = artifact 우선
- 163 §7 trap G/H/I/J/K/L 인지 + 164 trap M 추가
- 162 §7 #37 v4 (164 적용 실증 + 인계서 한계): spec 본문 < 200 line 시 CC inline heredoc + Edit 직접 사용, 그 외 artifact
- U-162-C 적용: step 종결마다 작업 여력 보고
- U-163-A 적용: 인계서 작성 = 작업 여력 부족 판단 시 사용자 승인 요청
- U-163-B 적용: 사용자 설명 핵심만 짧게
- U-163-D 적용: 초엔터프라이즈급 품질
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- PM 본 작업 (T1~T6) 진입 시 새 채팅 세션 분리 의무 (N-152-F)

### 검수자 추천 패턴 (N-152-B + U-163-E)

165 검수자 첫 응답 추천 후보 (그 시점 사용자 의도 따라 결정):

- 사용자가 트랙 결정 요청 시: **P5-M3 (guide* template 출처)** 또는 **B-Commit** (164 carry, 정량 진입 가치 높음) 우선 추천
- 사용자가 P4 진입 의사 시: 사전 조건 4건 충족 + strict pattern 적용 의무
- 사용자가 #48 manifest scanner 의사 시: trap I (baseline regen) 연계 처리 필수
- 사용자가 자유 진행 시: U-162-A 적용, 검수자가 가치 높은 트랙 1건 추천

---

**문서 종결.**

*164차 4 commit live, baseline 모두 ✓, 학습 영구화 완결 (§6 #46/#47 + §7 trap L (b)/M). 165차 첫 응답에 본 인계서 명시 인지 의무. measurement-first 원칙 + §6 #41 v2 carry-over 자동 적용.*