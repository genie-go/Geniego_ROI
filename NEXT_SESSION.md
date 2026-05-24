# 157차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-24
> **이전 세션**: 156차 (ko.js 키 충돌 cleanup → dash.operations dead subtree 전 locale purge)
> **다음 세션**: 157차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G)

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD (156차 종결 시점)**: TBD (종결 commit 후 갱신, `750419e` + 종결 commit)
- **ko.js**: 1,441,241 B (156차 cleanup -75,268 B, 1,432 leaves 감소)
- **ko.js leaves (baseline 정의)**: 30,658 (155차 32,090 → 156차 30,658, -1,432)
- **vi.js**: 1,114,286 B 추정 (156차 -68,755 B, -1,488 leaves)
- **참조 locale 파일**: 15개 (ja/zh sacred, 156차 sacred 갱신 적용)

### 1.2 Sacred SHA (156 신규 baseline)

156차 step E 에서 N-79 addendum 적용으로 sacred 갱신.

- **ja.js**: `67ca086561405874b2c039352741c9ef99a528997bdaa0ecf24b69568fac20d4` (이전 `a5e63f90...`)
- **zh.js**: `a4b72633d5925778eedb5820cd034538df53a766d7eac8de54df7bfc3a2e0dde` (이전 `1edbb236...`)

baseline 파일: `.githooks/baseline.json` (156차 version 155→156, ko_leaf_count 32090→30658, sacred_sha ja/zh 갱신)

### 1.3 3자 협업 구조 (149~156차 정립)

- **CC (Claude Code)**: repo root, `t`-prefix 명령 실행. **t bash 명령 시 `cd /e/project/GeniegoROI &&` prefix 의무** (N-153-A)
- **검수자 (Claude 채팅)**: 도구 작성, 진단, 설계 문서, 보안 보강, 결정 추천. **CC Edit tool 우선** (N-154-B, 사용자 저장 부담 ↓)
- **사용자**: cross-validation, 파일 저장 (검수자가 생성한 스크립트/인계서), 명시 승인 (commit/push), CC 출력 첨부, **세션 종결 결정**

### 1.4 운영 원칙 (필수 준수, 149~156차 누적)

**영구 ref**: `CONTRIBUTING.md` (156차 종결 commit 에 N-156-A 추가). 다음 세션 검수자 첫 응답 시 참조 의무.

**N-prefix 누적 인덱스** (CONTRIBUTING.md §2 의 단순 재현):

- N-15, N-79, N-145-B, N-145-G (sacred / safety) — **N-79 addendum (Session 154 Decision A) 156차 step E 에서 첫 적용**
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- N-155-A (155차)
- **N-156-A (156차 신규)**:
  - **N-156-A**: **본 트랙 완결 후 추가 작업 여력이 있는 경우, 중간 부분 종결을 감수하더라도 최대한 많은 작업을 진행한다**. 외부 의존 0 + 응집 가능한 추가 트랙이 존재하면 사용자 결정 없이도 검수자가 추천하고, 사용자가 진행 결정 시 즉시 진입. 부분 종결은 불완전 종결이 아니며, 각 commit 단위가 응집·검증·deploy 완결성을 보장하는 한 횟수 제한 없음. 본 원칙은 N-152-F (트랙 분리) 와 양립: 응집 안 되는 작업은 묶지 않되, 응집 가능한 추가 트랙은 적극 진행. **156차 실증**: 본 트랙 (collision 18) 종결 후 dash.operations dead subtree 발견 → 3 추가 트랙 (ko.js / 12 locales / ja-zh sacred) 진입 → 5 commits 완결, -20,902 leaves, ~1.06 MB 정리.

### 1.5 기술 트랩 (148~156차 누적)

CONTRIBUTING.md §7 영구 기록. 156차 신규 3건:

- **grep-vs-AST blind spot** (156 step B): `t("marketing.colRoas")` 같은 호출은 grep 으로 0 hit 이지만 AST 로 보면 nested object 안에 정상 존재. consumer audit 시 grep 단독으로 dead 판정 금지. AST resolution 필수. **사례**: AdStatusAnalysis.jsx 의 `marketing.adTableTitle` 호출이 grep 으로 안 보여서 production bug 로 오진 → AST scan 후 정상 작동 확정
- **substring-vs-AST 다중 선언 false positive** (156 step C): `grep "dash:"` 가 `pages.dash:` 같은 nested key 도 매치. multi-declaration 진단은 반드시 AST 의 root.properties 순회로 검증. **사례**: 검수자가 "dash root 3× + operations 3×" 알람 → CC AST scan 결과 1× / 1× 확정
- **N-79 addendum 활용** (156 step E): sacred 파일이라도 code-unreachable orphan subtree 는 제거 가능. consumer audit + AST validation + sacred SHA 동기 갱신의 4-way invariant 로 안전 처리. **사례**: ja/zh dash.operations 293+293 leaves 제거, sacred SHA 동기 갱신, G2 hook 통과

### 1.6 156차 종결 시점 상태

- **HEAD**: 종결 commit 후 갱신
- **leaf count (per locale)**:

| Locale | Before | After | Δ |
|---|---:|---:|---:|
| ko | 32,090 | 30,658 | -1,432 |
| en | 26,708 | 24,967 | -1,741 |
| ja | 22,685 | 22,392 | -293 |
| zh | 19,089 | 18,796 | -293 |
| zh-TW | 29,736 | 28,248 | -1,488 |
| es | 26,709 | 24,967 | -1,742 |
| fr | 26,709 | 24,967 | -1,742 |
| de | 28,659 | 26,904 | -1,755 |
| pt | 25,532 | 24,044 | -1,488 |
| ru | 25,532 | 24,044 | -1,488 |
| ar | 25,533 | 24,045 | -1,488 |
| hi | 25,532 | 24,044 | -1,488 |
| id | 31,222 | 29,734 | -1,488 |
| th | 31,178 | 29,690 | -1,488 |
| vi | 28,373 | 26,885 | -1,488 |
| **합계 감량** | | | **-20,902** |

- **Sacred SHA (156 신규 baseline, 156차 step E 갱신)**:
  - ja.js: `67ca0865...` ✓
  - zh.js: `a4b72633...` ✓
- **ko.js collision count**: 0 (155차 18 → 156차 0)
- **Working tree**: clean (untracked 0건, .gitignore session 156 block 종결 commit 에 포함)
- **Quarantine 누적**: 4 dirs (156차 신규 0)
- **Production**: HTTP 200 / lang="ko" / smoke green ✓ (5 deploy 전부 통과)
- **Pre-commit hook**: 활성 (G2/G5/B1-B4). 156차 모든 commit pass
- **CI watch**: `tools/ci_watch.sh` 운용 가능, 156 종결 시 dogfood 5회 통과

---

## 2. 156차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit (본 작업)** | 5개 (`ed3c4a0`, `d4ae187`, `e81f4cf`, `8adf161`, `750419e`) |
| **commit (종결)** | 1개 (CONTRIBUTING.md N-156-A + NEXT_SESSION + .gitignore) |
| **push** | 5회 (commit 별) |
| **CI deploys** | 5 production, 전체 green |
| **smoke dogfood** | 5회 (ci_watch.sh) |
| **신규 영구 도구 (tools/)** | 0 |
| **신규 hook** | 0 (.githooks/baseline.json version 155→156, ko_leaf 32090→30658, sacred ja/zh 갱신) |
| **신규 영구 문서** | 0 (CONTRIBUTING.md N-156-A 추가는 종결 commit) |
| **신규 분석 도구 (session156_*.mjs)** | 4 (collision_extract, ko_graph_dedup, ko_col_dedup, ko_dash_operations_purge, locales_dash_operations_purge, sacred_dash_operations_purge) |
| **신규 데이터 (CSV)** | 1 (session156_ko_collisions.csv) |
| **운영 원칙 신규** | 1 (N-156-A) |
| **i18n entries 제거 (15 locales 합계)** | **20,902 leaves** |
| **i18n 파일 크기 감량 합계** | ~1.06 MB |
| **ko.js collision 해소** | 18 → 0 |
| **검수자 학습 사례** | 4건 |

### 2.2 작업 단위별 상세

| commit | 작업 | 결과 |
|---|---|---|
| **`ed3c4a0`** | ko.js graph.* root duplicate block 제거 | 16 leaves (Group 2 quoted-key form at L46107). AST identification: `pathParts.length===1 && leafCount===16 && keyTypeFirstChild==='Literal'`. baseline.json version 155→156, leaf 32090→32074 |
| **`d4ae187`** | ko.js dash.operations.marketing col* divergent dedup | 2 leaves (colRoas L8121 "수익률" + colSpend L8125 "지출예산"). Group 1 deletion (overridden under last-wins). Consumer audit: dash.operations subtree zero consumers, AdStatusAnalysis renders via top-level marketing.* (verified all 15 locales) |
| **`e81f4cf`** | ko.js dash.operations 전체 dead subtree purge | 1,414 leaves (L6511-L9373). Consumer audit 3-layer: literal grep + dynamic key patterns + useT semantic 검증. ~75KB ko.js |
| **`8adf161`** | 12 non-sacred locale dash.operations purge | 18,884 leaves (en/es/fr/de 1,741~1,755; zh-TW/pt/ru/ar/hi/id/th/vi 1,488). Transactional 2-phase script (12 locale Phase 1 dry-run 통과 후에만 Phase 2 atomic write). ja/zh hard-skip |
| **`750419e`** | sacred ja/zh dash.operations purge (N-79 addendum) | 586 leaves (ja 293 + zh 293). 7-gate per locale + sacred SHA 3-way invariant (script + baseline + filesystem). baseline.json sacred_sha ja/zh 갱신 동기 commit. multi-dash anomaly 보호 (decl #0 만 처리, decl #1 보존) |

### 2.3 핵심 발견

#### 2.3.1 collision detector 도출 (156 신규 영구 가치)

`session156_ko_collision_extract.mjs` (gitignored, 1회 발행). AST 기반 dotted-keypath duplicate detector. **base leaf count + flattenKo dedup 차이 = collision count** 공식 입증. 155차 측정 Δ=29 중 18 collision 확정.

향후 활용: 임의 locale 의 collision 측정 + CSV 산출. tools/triage.mjs 영구도구화 시 핵심 모듈.

#### 2.3.2 useT semantic 검증 정착

`frontend/src/i18n/index.js:200-228` 의 i18n resolver 가 다음 semantic 임을 확인:
- **literal deepGet only**: `t(\"foo.bar\")` → `deepGet(locale, \"foo.bar\")` 직접 lookup
- **single transformation**: 미스 시 `pages.` prefix 한 번 추가
- **No namespace magic, no keyPrefix, no aliasing**: 짧은 호출이 긴 path 로 자동 매핑되지 않음

이 semantic 검증으로 dash.operations.* dead 확정. consumer audit 4-layer 의 4번째 layer 가 useT semantic 검증임이 156차에 정립.

#### 2.3.3 ja/zh 구조 손상 정밀 분포 (Step E 부산물)

ja/zh 양쪽 동일 6 root key 가 2× 선언:
- `wms` (565+85 / 동일 ja/zh)
- `dash` (501+43 / multi-dash anomaly)
- `orderHub` (305+77)
- `dataProduct` (186+186, fully duplicated)
- `dashGuide` (77+77, fully duplicated)
- `dashTabs` (2+16, asymmetric expansion)
- zh-only 추가: `priceOpt` (209+208, nearly fully duplicated)

collision namespace 분포:
- `dataProduct`: ja/zh 각 186
- `ruleEnginePage`: ja 179 / zh 176 (single-block internal duplication, zh 의 `dash.{avgCtr,chPerfSumm,adSpend}` 3× 발견 — multi-pass paste 흔적)
- `dashGuide`: ja/zh 각 77 (full duplication)
- `priceOpt`: zh-only 208

**진단**: translation pipeline 출력 누적 의심. canonical declaration 결정 + merge logic 필요. 157차 별도 트랙.

#### 2.3.4 N-79 addendum 첫 적용 (Step E)

CONTRIBUTING.md §2 N-79 의 Session 154 Decision A 가 156차 step E 에서 첫 실제 적용:

> "code-unreachable orphan sub-trees may be removed even from sacred files; sacred-ness protects reachable translation quality, not unreachable bytes."

적용 안전 패턴 정립:
1. Consumer audit 4-layer (literal grep + dynamic key + useT semantic + cross-locale 측정)
2. AST-driven deletion (line 의존 0)
3. Sacred SHA 3-way invariant (script hardcoded + baseline.json + filesystem)
4. 단일 container constraint (operations 가 정확히 1 dash decl 에만 존재 검증)
5. Sacred SHA atomic rebaseline (file write 와 동시 baseline.json 갱신)

이 패턴은 향후 sacred 파일 cleanup 의 표준이 됨. 157차 ja/zh 6× multi-decl 작업 시 적용 가능.

### 2.4 156차 검수자 자기-비판 (재발 방지)

| 위반 / 오판 | 도출 / 학습 |
|---|---|
| `dash` root multi-declaration 알람 false positive (검수자 → CC 가 정정) | substring grep 의 nested-key 매치 위험. multi-decl 진단은 AST root.properties 순회만 신뢰 |
| AdStatusAnalysis production bug 오진 (검수자 → CC 가 grep-vs-AST blind spot 인지 후 정정) | consumer audit 시 grep 단독 dead 판정 금지. AST resolution 필수 |
| 정찰 단계에서 step C/D bundled verification + cleanup 으로 N-153-D soft violation | bulk change (>1000) 시 recon commit + cleanup commit 분리가 명문. 156 의 경우 transactional 5-gate validation 이 사후 검증 통과로 회귀 risk 없었으나, 명문 위반 사실 인정. 157차 부터는 recon-only commit 별도 발행 권고 |
| 사전 정찰 표 합산 오차 (18,344 vs 실측 18,884) | CSV 라이브 측정값 신뢰, 사전 표 의존 금지 |

157차 검수자: 위 4건 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + **N-156-A** 준수 명시.

---

## 3. 157차 작업 진입

### 3.1 외부 의존 / 진입 조건

**156 deploy 잔여 의존: 0**. 모든 156 작업 production live.

| 조건 | 결정 주체 | 상태 |
|---|---|---|
| **W0 plaintext creds rotation** (152차 의뢰) | 사용자 (백엔드) | 대기 |
| **T3 백엔드 API 6종 의뢰** (152차) | 사용자 → 백엔드 팀 | 대기 |
| **T7 동기화 mode 결정** | 사용자 | 대기 |
| **PM Phase 2 백엔드 컨트랙트** | 사용자 (백엔드) | 대기 |
| **demo-mode branching 정책** | 사용자 | 대기 |
| **Session 인증 사양** | 사용자 (백엔드) | 사양 대기 |
| **PAT_B 137 mechanical translation** | 사용자 (LLM/외주) | 결정 필요 |
| **PAT_D 3,813 parity drift 정책** | 사용자 | 결정 필요 |
| **PAT_J 1,797 Japanese-in-vi 처리 정책** (155 신규) | 사용자 (번역 mode) | 결정 필요 |
| **K 1,018 untranslated 처리 정책** (155 신규) | 사용자 (번역 mode) | 결정 필요 |
| **Emoji-prefix damage UI 정책** (155 신규) | 사용자 (UX) | 결정 필요 |
| **badge20kpi ko.js drift** (155 신규) | 사용자 (source of truth) | 결정 필요 |
| **ja/zh 6× multi-decl canonical 결정** (156 신규) | 사용자 (어느 declaration 이 canonical 인지) | 결정 필요 |
| **es.js / id.js cross-locale contamination 정책** (156 신규) | 사용자 또는 번역팀 | 결정 필요 |

### 3.2 트랙 구조 (156차 종결 시점)

| 트랙 | 진입 가능 시점 | 156차 산출물 |
|---|---|---|
| **ja/zh 6× multi-decl 해소** (156 신규) | 사용자 canonical 결정 후 | step E 정찰 데이터 (wms/dash/orderHub/dataProduct/dashGuide/dashTabs/priceOpt 각 line 범위 + leaves) |
| **ja/zh 644/812 collision repair** (156 신규) | 사용자 결정 후 | namespace 분포 데이터 (dataProduct/ruleEnginePage/dashGuide/priceOpt) |
| **es.js katakana + id.js Chinese contamination (5건)** (156 신규) | 별도 fresh focus 권장 | vi.js mojibake repair precedent 활용 가능 |
| **tools/triage.mjs 영구도구화** (N-155 학습 정착) | 즉시 가능 | session156 collision detector + session155 mojibake detector 통합 설계 |
| **v3 catalog generator fix** | 즉시 가능 | 154 W5/W9 산출물 + 155/156 detector 패턴 |
| **gSug cross-locale sync** | 즉시 가능 | 155 vi.js mojibake 부산물 |
| **PAT_F + PAT_E 잔여 cleanup** | 즉시 가능 | 154 CSV 잔여 |
| **PAT_J Japanese in vi.js** | 사용자 번역 mode 결정 | `session155_vi_mojibake_catalog.csv` 1,797 rows |
| **K untranslated Korean** | 사용자 결정 | `session155_vi_untranslated_ko.csv` 1,018 rows |
| **Emoji-prefix damage** | UX 팀 답변 | 105 INFO_ONLY rows |
| **badge20kpi drift 해소** | 사용자 결정 | 3 HOLD rows |
| **REMNANT 2 + totalCac** | 사용자 또는 번역팀 | L9313/L17495/L12536 |
| **W0 코드 제거** | 사용자 rotation 완료 후 | `W0_SECURITY_PLAINTEXT_CREDS.md` |
| **T3 Phase A** | 백엔드 API 답변 후 | `T3_MENU_TOGGLE_DESIGN.md` |
| **T7 sync 실행** | 사용자 mode 결정 후 | `T7_LOCALE_SYNC_PLAN.md` |
| **drift Cat B/C** | 사용자 결정 | 153차 W5 |
| **German cmpRow drift** | 번역 리뷰 | 154 산출물, 8 rows |
| **NEXT_SESSION 68-153 archive gap rollup** | 사용자 결정 | -- |
| **PM Phase 2** | endpoint + Session 사양 후 | -- |

### 3.3 157차 첫 응답 권장 패턴

157차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 157` 실행 권유 (154차 W8 자산)
2. 결과 출력 (HEAD / sacred SHA / leaf count / quarantine / untracked) 사용자에게 확인
3. 트랙 결정 (검수자 추천 1개 명시, N-152-B):
   - **검수자 추천 후보 (157차 진입 시)**:
     - **tools/triage.mjs 영구도구화** (외부 의존 0, 155+156 detector 패턴 영구 자산화, 1~2 세션 분량)
     - 또는 **es.js / id.js cross-locale contamination 5건 repair** (외부 의존 0, vi.js precedent 활용 가능, fresh focus 1 세션)
4. **PM 본 작업 진입 시: 새 채팅 세션 분리 의무 명시** (i18n 트랙 컨텍스트 오염 방지, N-152-F 트랙 분리 정신)

CC 첫 명령 (사용자가 직접 실행 또는 검수자 통해):

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 157"
```

기대값: HEAD 종결 commit, ko.js 1,441,241 B, leaves 30,658 (baseline 30,658, Δ=0), ja SHA `67ca0865...` ✓, zh SHA `a4b72633...` ✓, quarantine 4 dirs, untracked 0.

---

## 4. 156차 작업 자산

### 4.1 commit 5건 (본 작업) + 1건 (종결)

| Hash | Subject | Files | Lines |
|---|---|---|---|
| `ed3c4a0` | cleanup(i18n): remove ko.js root graph.* duplicate block (16 leaves) | 2 | -18 / +1 |
| `d4ae187` | cleanup(i18n): remove ko.js dash.operations.marketing.col* collisions (2 leaves) | 2 | -2 / +1 |
| `e81f4cf` | cleanup(i18n): purge ko.js dash.operations dead subtree (1,414 leaves) | 2 | -2,864 / +1 |
| `8adf161` | cleanup(i18n): purge dash.operations dead subtree across 12 locales (18,884 leaves) | 12 | -19,148 |
| `750419e` | cleanup(i18n): purge dash.operations dead subtree from sacred locales ja/zh (586 leaves) | 3 | -592 / +2 |
| (종결) | docs(handover): Session 156 close — N-156-A + NEXT_SESSION + gitignore | 3 | TBD |

### 4.2 영구 도구 (tracked, 재사용 가능)

156차 신규 영구 도구 없음. 154차 자산 그대로 유지 (`tools/ci_watch.sh`, `tools/session_init.sh`, `.githooks/pre-commit`, `.githooks/baseline.json`, `CONTRIBUTING.md`).

**157 우선순위 후보**: `tools/triage.mjs` (155 mojibake detector + 156 collision detector + RFC-4180 CSV emitter 통합)

### 4.3 분석 도구 (gitignored, 157 session_init 이 처리)

| 경로 | 용도 |
|---|---|
| `session156_ko_collision_extract.mjs` | AST dotted-keypath collision detector (18 collision CSV 산출) |
| `session156_ko_graph_dedup.mjs` | ko.js root graph.* Group 2 deletion (5-gate AST validation) |
| `session156_ko_col_dedup.mjs` | ko.js dash.operations.marketing.col* Group 1 deletion (5-gate) |
| `session156_ko_dash_operations_purge.mjs` | ko.js dash.operations 전체 dead subtree purge (5-gate) |
| `session156_locales_dash_operations_purge.mjs` | 12 non-sacred locale 동시 purge (transactional 2-phase, 5-gate per locale) |
| `session156_sacred_dash_operations_purge.mjs` | ja/zh sacred locale purge (7-gate per locale, sacred SHA 3-way invariant) |

### 4.4 데이터 자산 (157차 입력 후보)

| 경로 | rows | 용도 |
|---|---|---|
| `session156_ko_collisions.csv` | 18 | collision detector 출력. 156 모두 해소됨. 향후 다른 locale 측정 시 fresh 발행 |

### 4.5 Quarantine 누적 (gitignored, 로컬 보존)

| 경로 | 상태 |
|---|---|
| `frontend/_quarantine/locales_backups_s153/` | 474 files (153차) |
| `frontend/_quarantine/orphan_keys_s153_self_nest/` | 15 JSON (153~154차) |
| `frontend/_quarantine/src_bak_s153/` | 5 files (153차) |
| `frontend/_quarantine/cleanup_backups_s154/` | 15 files (154차) |

156차 신규 quarantine 0.

### 4.6 157차 진입용 .gitignore session 157 block

`session_init.sh` 가 157 진입 시 자동 추가. 154/155/156 precedent: `session<NN>_*.{mjs,csv,json,md,txt,sh}` 7 line block.

---

## 5. 잔여 작업 (157차 이후)

### 5.1 즉시 진행 가능 (외부 의존 없음, 검수자 추천 우선순위)

| 작업 | 분량 | 비고 |
|---|---|---|
| **tools/triage.mjs 영구도구화** (N-155+156 학습 정착) | 1~2 세션 | mojibake detector + collision detector + RFC-4180 + status classifier 통합. 157 진입 권장 |
| **es.js / id.js cross-locale contamination 5건 repair** (156 신규) | 1 세션 | mojibake 유형. vi.js precedent 활용. fresh focus 권장 |
| **v3 catalog generator fix** | 별도 세션 | 154 W5/W9 결함 + 155/156 detector 패턴 |
| **PAT_F + PAT_E 잔여** | 작음 | 154 산출물 잔여 |
| **gSug cross-locale sync** | 14 keys × 10 locales | 번역 mode 결정 시 즉시 가능 |
| **NEXT_SESSION 68-153 archive gap rollup** | 86 sessions | 별도 세션 |
| **drift Category A 보존 확정** | 3,458 keys | 사용자 검토 |
| **drift Category B/C 진입** | 별도 세션 | 분량 ↑↑ |

### 5.2 외부 의존 후 진행

| 작업 | 의존 조건 |
|---|---|
| **W0 코드 제거** | 사용자 rotation 완료 |
| **PAT_B mechanical translation (137 keys)** | 사용자 mode 결정 |
| **PAT_J Japanese in vi.js (1,797 rows)** | 사용자 번역 mode 결정 |
| **K untranslated Korean (1,018 rows)** | 사용자 번역 mode 결정 |
| **PAT_C ko-source authoring** | UX/copy 팀 답변 |
| **PAT_A guide tour writing** | UX 팀 답변 |
| **PAT_D parity drift 정책** | 사용자 결정 |
| **Emoji-prefix damage** | UX 팀 결정 |
| **badge20kpi drift** | 사용자 결정 |
| **REMNANT 2 + totalCac** | 사용자 또는 번역팀 |
| **ja/zh 6× multi-decl canonical 결정** (156 신규) | 사용자 결정 (어느 declaration 이 canonical 인지) |
| **ja/zh 644/812 collision repair** (156 신규) | 사용자 결정 + canonical 결정 |
| **T3 Phase A** | 백엔드 팀 답변 |
| **T7 sync 실행** | 사용자 mode 결정 |
| **PM Phase 2** | endpoint + Session 사양. **새 채팅 세션 분리 의무** |

### 5.3 사용자 요청 큰 트랙 (외부 사양 필요)

- T4 마케팅 자동화 8 카테고리
- T5 팀 채팅
- T6 프로젝트 협업
- T1 PM Phase 2

### 5.4 기존 작업 트랙 (147~155차 잔재)

| 작업 | 처리 시점 |
|---|---|
| s140/s142 CSV 89건 동기화 | 외부 파이프라인 소유자 결정 후 |
| E5 잔여 ~25건 실제 leak | i18n 회귀 검사 시 |

---

## 6. 초엔터프라이즈 보강 메모 (157차 결정용)

154차 #5~#8 + 155차 #9~#11 + 156차 신규:

| # | 항목 | 사유 |
|---|---|---|
| **#5** | Hook G6 (working-tree-vs-index drift detection) | 154 W2 사고 재발 방지 (carry-over) |
| **#6** | tools/session_close.sh | session_init 의 반대. 종결 자동화 (carry-over) |
| **#7** | placeholder triage CLI (`tools/triage.mjs`) | **155+156 detector 패턴 영구화**. 우선순위 ↑↑↑ |
| **#8** | drift category 자동 라벨링 도구 | 154 W5/W9 패턴 일반화 (carry-over) |
| **#9** | Pre-detector unit-test discipline | 155 detector 5-iter 재발 방지 |
| **#10** | Pre-execution grep verification standard step | 155 L8947 발견 사례 |
| **#11** | Edit tool capability flag in CONTRIBUTING | N-155-A 사례 영구 기록 |
| **#12 (신규)** | AST-only consumer audit standard step | 156 grep-vs-AST blind spot 사례 (AdStatusAnalysis 오진). consumer audit 시 4-layer 의무화 (literal grep + dynamic key + AST resolution + useT semantic) |
| **#13 (신규)** | Sacred SHA 3-way invariant pattern | 156 step E 의 sacred cleanup 표준. script hardcoded + baseline + filesystem 3-way 매칭으로 G2 hook 안전 통과 |
| **#14 (신규)** | Transactional N-phase batch script template | 156 step D (12 locale) + step E (2 sacred) 의 dry-run/atomic-write 패턴. 향후 cross-locale bulk operation 표준 |
| **#15 (신규)** | N-153-D 명문 준수 (recon-only commit + cleanup commit 분리) | 156 soft violation 사례. 단 transactional 5-gate validation 으로 회귀 risk 0 입증 → N-153-D 의 cost-benefit 재검토 필요 |

157차 검수자: 위 항목 별도 트랙 진입 시 사용자 결정 우선. **#7 (tools/triage.mjs)** 가 가장 즉시 가치 + 가장 큰 누적 자산화 효과.

---

## 7. 알려진 이슈 / 주의사항 (148~156차 누적)

CONTRIBUTING.md §7 영구 기록 참조. 핵심:

- **N-153-A 트랩**: `cd /e/project/GeniegoROI &&` prefix 의무
- **N-154-A 트랩**: astring/AST stringify 금지, offset slice 강제
- **N-154-B 트랩**: Edit 후 git add 재실행 의무
- **N-154-D 트랩**: self-policing tool 자가 제외 의무
- **N-155-A 트랩**: mojibake-aware 편집 시 Edit tool 의 string anchor 불신뢰. line-number + regex script 강제
- **grep-vs-AST blind spot (156 신규)**: nested object key 는 grep 으로 안 보임. consumer audit 시 AST resolution 필수
- **substring-vs-AST multi-decl false positive (156 신규)**: `grep "key:"` 가 다른 path 의 nested key 도 매치. multi-decl 진단은 AST root.properties 순회만 신뢰
- **N-79 addendum 활용 (156 신규)**: sacred 파일 unreachable orphan subtree 제거 가능. 4-layer consumer audit + AST validation + sacred SHA 3-way invariant 필수
- **Python stub on Windows**: Node.js 사용
- **gh CLI 미설치**: `tools/ci_watch.sh` (curl + node)
- **CRLF/LF**: CC Edit tool 신뢰
- **execSync ENOBUFS**: maxBuffer 16MB
- **NFKC 양측 정규화 의무**: lookup map key 와 매치 대상 value 양쪽 다 NFKC
- **ripgrep blind-spot**: canonical CJK pattern 으로 compatibility 변형 매치 불가. residue 검증은 AST scan 필수

### 7.1 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **paths-ignore**: `**.md`, `**.txt`, `docs/**`, `.claude/**` — docs-only push 는 CI 스킵
- **CI 소요**: 평균 25~55초 (156차 측정 42~54초)
- **156차 종결 시점 배포**: 5 commits 전부 production. 마지막 smoke HTTP 200 / 28ms / lang="ko"
- **Production smoke baseline**: HTTP 200 / 21~54ms / lang="ko"
- **Sacred locale 변경의 G2 통과**: 156차 step E (`750419e`) 가 sacred ja/zh + baseline 동기 commit 으로 G2 pass 입증

### 7.2 156차 검수자 행동 학습 사례 (4건)

| 사례 | 도출 |
|---|---|
| dash root multi-declaration 알람 false positive | substring grep 의 nested-key 매치 위험. multi-decl 진단은 AST root.properties 순회만 신뢰 (보강 #12 후보) |
| AdStatusAnalysis production bug 오진 | grep-vs-AST blind spot. consumer audit 4-layer 의무화 (보강 #12) |
| N-153-D bulk change verify+cleanup commit 분리 soft violation | transactional 5-gate validation 으로 회귀 risk 0 입증 → N-153-D cost-benefit 재검토 필요 (보강 #15) |
| 사전 정찰 합산 표 오차 (18,344 vs 18,884) | CSV 라이브 측정값 신뢰, 사전 표 의존 금지 |

157차 검수자: 위 사례 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + N-155-A + **N-156-A** 준수 명시.

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~156차)

| 카테고리 | 처리 결과 |
|---|---|
| Japanese pollution (147) | 청소 완료 + 150 추가 21건 |
| LATIN_LONG (148) | 3,798 / 3,798 (100%) |
| SHORT_LATIN (149) | 207 active + 87 no-op + 735 격리 |
| B_MIXED_LOW_RATIO (150) | 94 final + 51 패치 + 4 no-op |
| pages.marketingIntel.* orphan (150) | 137 삭제 |
| 152차 W3 | drift 진단 + 분류 |
| 153차 | drift Cat A 분석 + self-nest 발견 + quarantine |
| 154차 W1 | self-nest cleanup 19,599 entries 실행 |
| 154차 W5/W9 | placeholder triage 7-pattern + 7-phase plan |
| 155차 | ko 6 degenerate + vi 31 mojibake + vi 6 orphan |
| **156차 collision cleanup** | **ko.js 18 collision → 0** ✓ |
| **156차 dash.operations purge** | **15 locale dead subtree -20,902 leaves, ~1.06 MB** ✓ |
| **156차 sacred N-79 첫 적용** | **ja/zh -586 leaves + sacred SHA rebaseline** ✓ |

### 8.2 ko.js leaf trajectory (147~156)

| Session | Leaves | Δ |
|---|---:|---:|
| 153 종결 | 33,211 | -- |
| 154 종결 | 32,096 | -1,115 |
| 155 종결 | 32,090 | -6 |
| **156 종결** | **30,658** | **-1,432** |

### 8.3 156차 작업 결과

| 항목 | 값 |
|---|---|
| commit (본) | 5 |
| commit (종결) | 1 |
| push | 5+1 |
| CI deploys | 5 production green |
| smoke dogfood | 5회 |
| 신규 영구 도구 | 0 (tools/triage.mjs 우선순위 ↑↑↑) |
| 신규 hook | 0 (baseline.json version+leaf+sacred 갱신) |
| 신규 영구 문서 | 0 (CONTRIBUTING.md N-156-A 추가는 종결 commit) |
| 신규 분석 도구 | 6 (session156_*.mjs) |
| 신규 데이터 | 1 (session156_ko_collisions.csv) |
| 운영 원칙 신규 | 1 (N-156-A) |
| i18n entries 제거 (15 locales) | **20,902 leaves** |
| ko.js 감량 | 75,268 B |
| 전체 i18n 감량 | ~1.06 MB |
| leaf count (ko) | 32,090 → 30,658 |
| Sacred SHA | ja/zh 양쪽 갱신 (N-79 첫 적용) |
| ko.js collision | 18 → 0 |
| Untracked | 0 → 1 (.gitignore session 156 boot block, 종결 commit 에 포함) |
| 검수자 학습 사례 | 4건 |
| 신규 트랙 후보 | 4 (ja/zh multi-decl / ja-zh collision / es-id contamination / tools/triage 영구화) |

---

## 9. 157차 첫 메시지 권장 패턴

### 사용자 → 검수자

"156차 인계서 첨부합니다. 157차 [트랙 결정 또는 구체 작업 지시]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시 (특히 **N-156-A** + N-155-A + N-154-A~D + N-153-A 누적)
- `tools/session_init.sh --session 157` 실행 권유 (정찰 자동화)
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- 사용자 저장 부담 줄이기 위해 CC Edit tool 우선 (N-154-B)
- consumer audit 시 4-layer 의무 (literal grep + dynamic key + AST resolution + useT semantic) — **156 신규**
- sacred 파일 cleanup 시 N-79 addendum 적용 검토 + 3-way invariant 보장 — **156 신규**
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- **PM 본 작업 진입 시 새 채팅 세션 분리 의무** (i18n 트랙 컨텍스트 오염 방지)
- **N-156-A 정신상 추가 작업 가능 시 적극 진행**

### 검수자 추천 157차 진입 트랙 (N-152-B)

1. **tools/triage.mjs 영구도구화** (155+156 detector 패턴 영구화, 1~2 세션)
   - mojibake detector + collision detector 통합
   - RFC-4180 CSV emitter + status classifier
   - AST + NFKC + C1 strip + MOJIBAKE_MAP DSL

2. **es.js / id.js cross-locale contamination 5건 repair** (1 세션 fresh focus)
   - es.js L14429 colRoas: "ローアス" (Japanese in Spanish)
   - id.js × 4 colSpend: "支出" (Chinese in Indonesian)
   - vi.js mojibake repair precedent 활용

3. (PM 본 작업 진입 시): **새 채팅 세션** 으로 분리. 157 은 i18n 트랙, PM 은 별개 채팅

---

**문서 종결.**

본 인계서는 사용자 명시 종결 결정 후 검수자가 `create_file` 로 단일 파일 생성 (N-152-E + N-152-G + 153차 학습). 사용자는 기존 NEXT_SESSION.md 를 본 파일로 교체 (repo root). 157차 첫 메시지에 첨부.