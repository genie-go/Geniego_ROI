## 162차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-25
> **이전 세션**: 161차 (#29 트랙 완전 종결: parse_errors 43→0, 5 commit, 4 push)
> **다음 세션**: 162차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G), 검수자 추천 → 사용자 승인

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD**: `6a7c3ba` fix(pages): TierPricingTab spread operator typo on line 259/285 (#29 残)
- **origin/master**: `6a7c3ba` (161차 4 push 모두 반영)
- **ko.js**: 1,441,177 B (161차 변화 0 B — frontend pages fix 만, locales 무터치)
- **ko.js leaves**: 30,656 (160→161 Δ=0)
- **manifest v2**: direct 5272 / prefix 53 / dynamic 3 / scan_files 205 / parse_errors **0** (161차 향상: -42 scan, -43 parse_errors)
- **참조 locale 파일**: 15개 (ja/zh sacred 156차 갱신 그대로)

### 1.2 Sacred SHA (156 baseline 그대로 유지)

- **ja.js**: `67ca086561405874b2c039352741c9ef99a528997bdaa0ecf24b69568fac20d4` ✓
- **zh.js**: `a4b72633d5925778eedb5820cd034538df53a766d7eac8de54df7bfc3a2e0dde` ✓

baseline 파일: `.githooks/baseline.json` (version 156, ko_leaf_count 30656)

### 1.3 3자 협업 구조 (158차 그대로 계승)

- **CC (Claude Code)**: repo root, `t`-prefix 명령. `cd /e/project/GeniegoROI &&` prefix 의무 (N-153-A)
- **검수자 (Claude 채팅)**: 도구 spec, 결정 추천, CC Edit 우선 (N-154-B)
- **사용자**: cross-validation, spec 파일 저장, 명시 승인, 세션 종결 결정

### 1.4 운영 원칙 (필수 준수, 149~161차 누적)

**영구 ref**: `CONTRIBUTING.md` (160차 §6 + §7 영구화). **161차 신규 N-prefix 없음** — §6 #38 신규 도출, §7 #37 4회째 재발 (강화 필요).

**N-prefix 누적 인덱스** (변경 없음):
- N-15, N-79, N-145-B, N-145-G (sacred / safety)
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- N-155-A (155차)
- N-156-A (156차)
- N-157-A (157차)
- **158~161차 신규 N-prefix 없음**

### 1.5 161차 사용자 명시 지시 (162 계승)

160차 N-prefix 와 동급 운영 원칙:
- **U-161-A**: 검수자 응답 핵심만 짧게. CC 가 답변할 시간을 보장 (중복 보고 회피)
- **U-161-B**: CC 직접 수정 우선. 사용자 직접 수정은 예외 (sacred 파일, 사양 저장 등)
- **U-161-C**: `t` prefix CC 명령 패턴 유지
- **U-161-D**: 검수자 수정 문서 작성 → 사용자 저장 → 검수자가 CC 에 반영 명령 흐름
- **U-161-E**: 작업 여력 잔존 시 추가 진행 (부분 종결 포함). 핵심 목표 달성 후 작업 여력 명시 확인 + 추가 트랙 후보 제시 의무
- **U-161-F**: 초엔터프라이즈급 품질
- **U-161-G**: 검수자 명령은 명시 명령 블록 형태. CC 가 받을 명령을 평문 설명 없이 정확한 도구 호출 형식으로 전달
- **U-161-H**: 다단계 명령 시 각 step abort 조건 명시 (`diff 0 이면 STOP` 등)

### 1.6 기술 트랩 (148~161차 누적)

CONTRIBUTING.md §7 영구 기록. 161차 신규 trap 도출:
- **§6 #38 (161 dogfood 도출, 미영구화)**: spec 검증식 자체 dogfood 의무. jq 미설치 / generated_at drift / MSYS path 변환 / grep prefix anchor — 4건 spec 결함이 patch11 dogfood 로 드러남
- **§6 #38 확장 (161 미영구화)**: 도구 CLI 옵션 spec 부재 시 검수자 추측 명령 회피 (production_smoke.sh `--snapshot-before` / `--out` 2회 오용)
- **§7 #37 재발 4회째 (161 미영구화)**: spec 저장 경로 중첩 (`docs/spec/docs/spec/`) 다시 발생. 현행 §7 #37 영구화로도 부족, 강화 patch 필요

### 1.7 161차 종결 시점 상태

- **HEAD**: `6a7c3ba` (origin/master 동기)
- **Working tree**: clean 후보 (untracked: `session157_*/`, `triage_*`, modified: `.gitignore`/`NEXT_SESSION.md` 161 in-progress 흔적)
- **ko.js**: 30,656 leaves, 0 collisions, 0 wrong-language, dead-subtree 0 (dry-run 만)
- **manifest v2 parse_errors**: **0** (161 트랙 성과)
- **Sacred SHA**: ja/zh 156차 값 그대로 보존 ✓
- **Quarantine 누적**: 4 dirs (161차 신규 0)
- **Production**: HTTP 200 / lang="ko" / TierPricingTab fix 반영 / smoke before-after no diff ✓
- **Pre-commit hook**: G2/G5/B1-B4/G6/G7-self-test (160 patch08 도입) 모두 PASS
- **신규 영구 도구 (161차)**: 0 (기존 patch11/12 는 build_resolver_manifest_v2.mjs 확장)
- **신규 영구 문서 (161차)**: 2 spec (patch11 + patch12)

---

## 2. 161차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit** | 5개 (그 중 4개 push) |
| **push** | 1 batch (4 commit) |
| **CI deploys** | 1 success (frontend 변경 트리거) |
| **smoke** | before/after 2회 (no diff PASS) |
| **신규 영구 도구** | 0 (기존 도구 patch11/12 확장) |
| **신규 영구 문서** | 2 spec |
| **CONTRIBUTING.md 갱신** | 0 (161 학습 영구화는 162 carry-over) |
| **운영 원칙 신규** | U-161-A ~ H (사용자 명시 지시 8건, 162 계승) |
| **i18n entries 수정 (ko)** | 0 |
| **ko.js size 변화** | 0 B |
| **ko.js leaves 변화** | 0 |
| **manifest parse_errors 변화** | -43 (43 → 0) |
| **manifest scan_files 변화** | -42 (247 → 205) |

### 2.2 commit 분포

| commit | 내용 | CI 영향 | 결과 |
|---|---|---|---|
| `2188557` | feat(tools): build_resolver_manifest_v2 --emit-parse-errors flag (#29 prep) | paths-ignore skip | G2 PASS |
| `9e47321` | docs(spec): patch11 spec self-correction — dogfood-driven (#38) | docs/** skip | G2 PASS |
| `ba51b25` | feat(tools): build_resolver_manifest_v2 pages_backup SKIP_DIRS (#29 fix) | paths-ignore skip | G2 PASS |
| `6a7c3ba` | fix(pages): TierPricingTab spread operator typo on line 259/285 (#29 残) | **CI 트리거** | G2 PASS, deploy success, smoke no diff |

### 2.3 트랙별 영구화

#### 2.3.1 #29 parse_errors 트랙 (완결)

**patch11 (commit `2188557`)** — `--emit-parse-errors` 분석 flag:
- parseArgs 확장: `--emit-parse-errors`, `--parse-errors-out <path>` 2개 신규
- main() 의 silent parse 실패를 명시 수집·dump
- backward compat 100% (default OFF)

**patch11 spec self-correction (commit `9e47321`)** — dogfood 결과 영구화:
- spec §3.2/§3.3/§5 검증식 4건 결함 발견 후 보정
  - jq 미설치 환경 (node -e 대체)
  - generated_at drift (content SHA 비교)
  - MSYS path 변환 (argv 전달 패턴)
  - grep prefix anchor (false positive 회피)
- §6 self-audit 표에 #38 trap 영구화

**patch12 (commit `ba51b25`)** — pages_backup SKIP_DIRS:
- patch11 dogfood 발견: parse_errors 43건 중 42건 (98%) = `pages_backup/` false-positive scan
- `SKIP_DIRS` 에 `'pages_backup'` 1개 member 추가
- 효과: scan_files 247→205 (-42), parse_errors 43→1 (-42)
- consumer 영향: direct 5272/prefix 53/dynamic 3 **불변** → P4 의사결정 입력 데이터 영향 0

**TierPricingTab fix (commit `6a7c3ba`)** — 잔존 1건 실 syntax 해결:
- patch12 후 잔존 1건 dogfood: `frontend/src/pages/TierPricingTab.jsx`
- 두 line typo (line 259/285): `style={{ .btn(...)` → `style={{ ...S.btn(...)`
- 인접 정상 라인 (258, 283, 284) 와 패턴 일치
- 효과: parse_errors 1 → 0 (161차 #29 트랙 완전 종결)

#### 2.3.2 누적 효과

| 161차 진행 | scan_files | parse_errors | consumers (direct/prefix/dynamic) |
|---|---|---|---|
| 시작 (160 종결) | 247 | 43 | 5272 / 53 / 3 |
| patch12 적용 후 | 205 | 1 | 5272 / 53 / 3 (불변) |
| TierPricingTab fix 후 | 205 | **0** | 5272 / 53 / 3 (불변) |

**핵심 성과**: manifest v2 **정밀도 100% 달성**, P4 dead-subtree apply 진입 baseline 완전 안전 확정.

### 2.4 핵심 학습 (161 신규)

#### 2.4.1 spec 검증식 자체 dogfood 의무 (§6 #38 후보)

patch11 spec §3.2/§3.3/§5 의 4건 검증식이 dogfood 안 된 채 작성됨. 실 환경 dogfood 로 모두 결함 노출:
- `jq 'length'` → bash 환경에 jq 없음. node -e 대체 필요
- `sha256sum tools/resolver_consumer_manifest_v2.json` → `generated_at` 매 빌드 갱신, raw SHA 항상 FAIL
- `node -e "...require('/tmp/...')..."` → MSYS bash `/tmp/` argv 변환은 자동이나 JS 리터럴 내부는 미변환
- `grep parse-error` → unknown flag 메시지도 match, prefix anchor 필요

**Mitigation**: spec 작성 후 적용 전 dogfood 의무. 162 CONTRIBUTING patch 로 §6 영구화 필요.

#### 2.4.2 도구 CLI 옵션 spec 부재 회피 (§6 #38 확장)

production_smoke.sh push 검증 단계에서 검수자가 `--snapshot-before`, `--out` 추측 사용 → 2회 실패. 정확한 옵션 `--snapshot before/after` (space-separated) 였음.

**Mitigation**: 도구 CLI 명령 전 `tools/<도구>.sh --help` 또는 사용법 grep 의무.

#### 2.4.3 §7 #37 spec 저장 경로 trap 4회 재발

160 patch08/09/10 3회 재발 후 §7 #37 영구화에도 161 patch12 spec 저장 시 `docs/spec/docs/spec/` 4회째 재발. 현행 §7 #37 만으로는 부족.

**Mitigation 후보** (162 영구화):
- spec 파일 안내 시 절대경로 강제
- IDE save dialog default 경로 회피를 위한 "탐색 후 저장" 강제 절차 명시
- 저장 후 `find` 검증을 검수자 명령에 자동 포함

### 2.5 161차 검수자 자기-비판

| 사례 | 도출 |
|---|---|
| spec §3.2/§3.3/§5 dogfood 안 된 채 작성 | §6 #38 영구화 (162) |
| production_smoke.sh CLI 옵션 추측 사용 (2회 실패) | §6 #38 확장 영구화 (162) |
| spec 저장 경로 중첩 4회째 재발 | §7 #37 강화 patch (162) |
| commit 명령에 abort 조건 미명시 (Step E 사용자 미승인 `066bb80` 발생) | U-161-H 영구화 (162) |
| Edit 명령 평문 설명만 보내고 명령 블록 미전달 (1회) | U-161-G 영구화 (162) |
| patch11 spec 의 async/await 표기 오타 (CC 가 sync 코드 보고 발견) | spec 작성 시 실 코드 grep 의무 강화 (§6 #34 강화 후보) |

162차 검수자: 위 6건 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + N-156-A + N-157-A + U-161-A~H 준수 명시.

---

## 3. 162차 작업 진입

### 3.1 외부 의존 / 진입 조건

**161 deploy 잔여 의존: 0**. 5 commit 모두 정상 (4 production live + 1 인계서).

160 carry-over (그대로 계승):
- **P4 dead-subtree 실 apply** — 사용자 review 후 결정 (depth=2 73건, depth=3 115건 candidates). **161차 patch12 + TierPricingTab fix 로 manifest 정밀도 100% 확정** → P4 진입 안전성 baseline 확보 ✓

### 3.2 트랙 구조 (162차 종결 시점)

#### 3.2.1 외부 의존 0, 즉시 진입 가능 (162 추천)

| 트랙 | 분량 | 비고 |
|---|---|---|
| **CONTRIBUTING.md §6/§7 patch — 161 학습 영구화** | 0.2 세션 | #38 (dogfood + CLI spec), §7 #37 강화, U-161 시리즈 영구화. 162 진입 시 의무 후보 |
| **parse_errors 0건 maintenance hook** | 0.1 세션 | pre-commit G8 신규 후보: ko.js 변경 시 manifest v2 parse_errors == 0 검증. 회귀 방지 |
| **wrapper 함수 추적** | 0.5 세션 | `const tx = useT(); tx('foo')` 패턴 (157 carry-over) |
| **non-ko locale manifest** | 0.4 세션 | 우선순위 ↓ (157 carry-over) |

#### 3.2.2 사용자 canonical 결정 후 (159 carry-over)

| 트랙 | 의존 |
|---|---|
| **P4 점진 apply 시작** | 사용자가 159 SUMMARY review 후 candidate 결정. **161차 manifest 100% baseline 확보 → 안전성 ↑↑** |
| **pages_backup/ 디렉터리 정리** | backup 의도성 확인. 정리 시 P4 candidate 추가 발굴 가능 (잠재 -수백 leaves) |
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

### 3.3 162차 첫 응답 권장 패턴

162차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 162 --self-test` 실행 권유
2. 결과 확인 (HEAD / sacred SHA / leaf count / 13 invariants / manifest parse_errors 0)
3. 트랙 결정 (검수자 추천 1개 명시, N-152-B)

**검수자 추천 후보 (162차 진입 시)**:

1. **CONTRIBUTING.md §6/§7 patch 영구화** (외부 의존 0, 0.2 세션)
   - 161 학습 영구화 의무 트랙 (160 학습 패턴 동일)
   - §6 #38 (dogfood + CLI spec), §7 #37 강화, U-161-A~H 시리즈

2. **parse_errors 회귀 방지 hook** (외부 의존 0, 0.1 세션)
   - 161 성과 (parse_errors 0) 영구화
   - pre-commit G8-manifest-clean: ko.js staged 시 manifest 재빌드 후 parse_errors == 0 확인

3. **P4 점진 apply 시작** (사용자 결정 후)
   - 161 manifest 100% baseline 확보 → 안전성 최고 시점
   - patch10 G7 smoke 로 안전 보장

CC 첫 명령:

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 162 --self-test"
```

기대값: HEAD `6a7c3ba` (or descendant), ko.js 1,441,177 B, leaves 30,656, ja/zh SHA ✓, self-test PASS (13/13), manifest parse_errors 0.

---

## 4. 161차 작업 자산

### 4.1 영구 도구 (tools/, tracked)

160차 18개 → 161차 0 신규 (기존 1개 patch11/12 확장):

| 경로 | 161 상태 | 용도 |
|---|---|---|
| `tools/build_resolver_manifest_v2.mjs` | **161 patch11 + patch12** | --emit-parse-errors flag + pages_backup SKIP_DIRS |
| 기타 17개 | 변화 없음 | 160 인계서 참조 |

### 4.2 Hook gate (변경 없음)

160차 G7-self-test (pre-commit) + G7-smoke (post-apply) 그대로. 161차 신규 hook 없음.

162 후보: **G8-manifest-clean** (pre-commit, ko.js staged → manifest 재빌드 → parse_errors == 0 검증)

### 4.3 영구 spec 문서 (docs/spec/, tracked, 161 신규 2개)

| 경로 | 용도 |
|---|---|
| 기존 160 spec 17개 | 그대로 |
| `docs/spec/build_resolver_manifest_v2_patch11_emit_parse_errors.md` | **161** patch11 spec (dogfood 보정 포함) |
| `docs/spec/build_resolver_manifest_v2_patch12_pages_backup_skip.md` | **161** patch12 spec (§6.5 dogfood baseline 포함) |

---

## 5. 잔여 작업 (162차 이후)

### 5.1 즉시 진행 가능 (외부 의존 0)

**162 신규 의무 후보**:
- CONTRIBUTING.md §6/§7 patch — 161 학습 영구화

**161 신규 carry-over**:
- TierPricingTab.jsx 잔존 검토 (이미 fix 적용, 추가 분석 불필요)
- pages_backup/ scan 효율 (이미 patch12 해결)
- parse_errors 회귀 방지 hook (G8 신규)

**160 carry-over 일부 완료**:
- ~~parse_errors 43건 분석~~ **161 완결** ✓
- wrapper 함수 추적 (0.5 세션) — 잔존
- non-ko locale manifest (0.4 세션, 우선순위 ↓) — 잔존

**157 carry-over**: v3 catalog generator / PAT_F/E / gSug cross-locale sync / drift Category A 보존.

### 5.2 외부 의존 후 진행

**159 신규 (161 baseline 확보로 진입 안전성 향상)**:
- P4 점진 apply (사용자 review 후)
- pages_backup/ 디렉터리 자체 정리 (사용자 결정 의존)

157 carry-over: ja/zh dash.\* / id 6,010 / pt=ru=ar=hi 5,298 / es=fr 5,083 / de Thai 191 / vi HOLD+DEFER.

156 carry-over: W0 / PAT_B/J/K/C/A/D / Emoji-prefix damage / badge20kpi / REMNANT 2+totalCac / ja-zh multi-decl / T3 / T7.

### 5.3 큰 사용자 요청 트랙 (외부 사양 필요, 사용자 명시 우선순위)

- **T1 PM Phase 2**
- **T4 마케팅 자동화** 8 카테고리
- **T5 팀 채팅**
- **T6 프로젝트 협업**

---

## 6. 초엔터프라이즈 보강 메모 (162차 결정용)

| # | 항목 | 사유 | 161 상태 |
|---|---|---|---|
| #25-#37 | 159-160 carry-over | 160 인계서 참조 | 변화 없음 |
| **#29 (parse_errors 분석)** | manifest v2 정밀도 측정 | **161 완결 ✓** | parse_errors 43→0 |
| **#38 (160 dogfood 도출, 161 미영구화)** | spec 검증식 자체 dogfood 의무 + 도구 CLI spec 회피 | **162 §6 영구화 의무** | 후보 |
| **#39 (161 신규 도출)** | §7 #37 spec 저장 경로 강화 (4회 재발) | 절대경로 강제 + find 검증 자동 포함 | **162 §7 강화 patch 의무** |
| **#40 (161 신규 도출)** | parse_errors 회귀 방지 hook (G8) | manifest 100% 정밀도 영구화 | 후보 |
| **#41 (161 신규 도출)** | TierPricingTab fix 패턴 발굴 — frontend syntax 사전 검증 | manifest v2 빌더로 frontend syntax bug 발견 가능 | 부수 효과 (의도적 트랙 X) |

162차 검수자: **#38/#39 §6+§7 patch 영구화** 또는 **#40 G8 hook** 가 logical 다음 후보.

---

## 7. 알려진 이슈 / 주의사항 (148~161차 누적)

CONTRIBUTING.md §7 영구 기록 참조. **161차 §7 trap 누적**: 160 신규 6건 + **161 신규 0 (영구화 대기 #38/#39 carry-over)** = 8건+.

### 7.1 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **paths-ignore**: `**.md`, `**.txt`, `docs/**`, `.claude/**` (158 인계서 명시)
- **161차 1 push (4 commit)**: tools/+docs/ 3건 skip, frontend/ 1건 CI 트리거 → deploy success
- **CI 소요**: 평균 38~46초 (161 dogfood 추정: 90초 wait 후 smoke after PASS)

### 7.2 161차 검수자 행동 학습 (6건)

| 사례 | 도출 |
|---|---|
| spec dogfood 안 된 채 작성 | 162차: §6 #38 의무 준수 |
| 도구 CLI 옵션 추측 사용 | 162차: §6 #38 확장 의무 준수 |
| spec 저장 경로 trap 4회 재발 | 162차: §7 #37 강화 patch |
| commit abort 조건 미명시 (사용자 미승인 commit 발생) | 162차: U-161-H 준수 |
| Edit 명령 평문 설명만 전달 | 162차: U-161-G 준수 |
| patch11 spec async/await 오타 (실 코드 미확인) | 162차: §6 #34 강화 |

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~161차)

| 카테고리 | 처리 결과 |
|---|---|
| 147~160 | 160차 인계서 참조 |
| **161 patch11 (--emit-parse-errors flag)** | manifest v2 분석 도구 영구화 ✓ |
| **161 patch11 spec self-correction** | spec dogfood 영구화 (#38) ✓ |
| **161 patch12 (pages_backup SKIP_DIRS)** | manifest noise 제거 (-42 scan, -42 parse_errors) ✓ |
| **161 TierPricingTab fix** | 잔존 실 syntax 1건 해결 (parse_errors 1→0) ✓ |

### 8.2 ko.js leaf trajectory (147~161)

| Session | Leaves | Δ |
|---|---:|---:|
| 153 종결 | 33,211 | -- |
| 154 종결 | 32,096 | -1,115 |
| 155 종결 | 32,090 | -6 |
| 156 종결 | 30,658 | -1,432 |
| 157 종결 | 30,656 | -2 |
| 158 종결 | 30,656 | 0 |
| 159 종결 | 30,656 | 0 |
| 160 종결 | 30,656 | 0 |
| **161 종결** | **30,656** | **0** (frontend/pages 만 변경, locales 무터치) |

**P4 dry-run 잠재 감축** (사용자 review 후 실 apply 시):
- depth=2 73 candidates: 최대 -11,390 leaves
- depth=3 115 candidates: 최대 -6,770 leaves
- **161차 manifest 정밀도 100% baseline 확보로 P4 진입 안전성 ↑↑**

### 8.3 manifest v2 trajectory (159~161)

| Session | scan_files | parse_errors | consumers (direct/prefix/dynamic) |
|---|---:|---:|---|
| 159 (v2 도입) | 247 | 43 | 5272 / 53 / 3 |
| 160 (v2 default 승격) | 247 | 43 | 5272 / 53 / 3 |
| **161 종결** | **205** | **0** | **5272 / 53 / 3 (불변)** |

### 8.4 161차 작업 결과

| 항목 | 값 |
|---|---|
| commit | 5 (그 중 4 push) |
| push | 1 batch |
| CI deploys | 1 success (frontend) |
| smoke dogfood | 2회 (before/after no diff PASS) |
| 신규 영구 도구 | 0 (기존 1개 확장) |
| 신규 영구 문서 | 2 spec |
| 신규 SUMMARY (tracked) | 0 |
| CONTRIBUTING.md 갱신 | 0 (162 carry-over) |
| 운영 원칙 신규 | U-161-A ~ H (사용자 명시 8건, 162 계승) |
| i18n entries 수정 (ko) | 0 |
| ko.js size 변화 | 0 B |
| 검수자 학습 사례 | 6건 (162 영구화 의무) |
| 신규 트랙 후보 | 3 (#39~#41) |

---

## 9. 162차 첫 메시지 권장 패턴

### 사용자 → 검수자

"161차 인계서 첨부합니다. 162차 [#38/#39 영구화 또는 다른 트랙 결정]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시 (N-157-A + N-156-A + N-155-A + N-154-A~D + N-153-A 누적 + **U-161-A~H 신규**)
- `tools/session_init.sh --session 162 --self-test` 실행 권유
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B 의무)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- CC Edit tool 우선 (N-154-B)
- consumer audit 4-layer 의무 (156 신규)
- sacred 파일 cleanup 시 N-79 addendum + 3-way invariant (156 신규)
- detector 반복 패턴 발견 시 즉시 productionise (N-157-A)
- §6 Spec drafting standards 4건 의무 준수 (160 신규)
- **§6 #38 신규: spec 검증식 dogfood 의무 + 도구 CLI 추측 회피** (161 신규)
- spec 파일 안내 시 절대경로 + dropdown 주의 + 저장 후 find 검증 3건 명시 (160 §7 trap)
- **§7 #37 강화 patch 의무** (161 4회 재발)
- NEXT_SESSION 인계서 작성 전 사용자 명시 승인 의무 (160 검수자 자기-비판)
- 작업 여력 잔존 시 추가 트랙 후보 제시 의무 (160 검수자 자기-비판)
- **검수자 응답 핵심만 짧게, CC 답변 시간 보장** (U-161-A 신규)
- **CC 직접 수정 우선** (U-161-B 신규)
- **검수자 명령은 명시 명령 블록 형태** (U-161-G 신규)
- **다단계 명령 시 각 step abort 조건 명시** (U-161-H 신규)
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- PM 본 작업 (T1~T6) 진입 시 새 채팅 세션 분리 의무 (N-152-F)
- N-156-A 정신상 추가 작업 가능 시 적극 진행

### 검수자 추천 162차 진입 트랙 (N-152-B)

**1순위 (의무 영구화, 외부 의존 0)**:
- **CONTRIBUTING.md §6/§7 patch — 161 학습 영구화**
  - §6 #38 (spec dogfood + 도구 CLI spec)
  - §7 #37 강화 patch (4회 재발 대응)
  - U-161-A~H 시리즈 영구화

**2순위 (작업 여력 최대 원칙, 외부 의존 0)**:
- **#40 parse_errors 회귀 방지 hook (G8)** — manifest 정밀도 100% 영구화

**3순위 (사용자 결정 후)**:
- **P4 점진 apply 시작** (#31, 161 baseline 확보로 안전성 최고 시점)

**4순위 (사용자 결정 후)**: pages_backup/ 디렉터리 정리 (잠재 leaves 감소)

---

**문서 종결.**