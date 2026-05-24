# 156차 세션 인계서 (NEXT_SESSION.md)

> **작성일**: 2026-05-24
> **이전 세션**: 155차 (degenerate keys cleanup + vi.js mojibake repair + orphan delete + leaf-count baseline 진단)
> **다음 세션**: 156차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 사용자 명시 종결 결정 (N-152-G)

---

## 1. 즉시 컨텍스트

### 1.1 환경

- **Repo**: `E:\project\GeniegoROI\` (Windows, PowerShell + Git Bash)
- **Branch**: `master`
- **HEAD (155차 종결 시점)**: `9c18640` (4 commits ahead of 154차 종결 `6ae0335`)
- **ko.js**: 1,516,498 B (155차 cleanup -90 B, 6 degenerate keys 제거)
- **ko.js leaves (baseline 정의)**: 32,090 (154차 32,096 → 155차 32,090, 6 leaves 감소)
- **ko.js leaves (string-only AST)**: 32,079
- **ko.js leaves (dedup keypath)**: 32,061
- **vi.js**: 29,370 lines (155차 -6 lines, 6 orphan delete), 31 mojibake repair 적용
- **참조 locale 파일**: `frontend/src/i18n/locales/{ko,en,ja,zh,zh-TW,es,fr,de,pt,ru,ar,hi,id,th,vi}.js` (15개, 활성)

### 1.2 Sacred SHA (154 baseline 유지)

154차 sacred SHA 변동 없음. vi.js 는 sacred 아님 (155차 vi.js 수정 → G2 trigger 0).

- **ja.js**: `a5e63f90a76ebd28fd75381e648fa1b979f7a473f0d6ffecbd0ae8de4d523c9c`
- **zh.js**: `1edbb236dd7c4af859c4e9b6f0cc0b69dab6dc8ae119cce75d9b7382c081207a`

baseline 파일: `.githooks/baseline.json` (155차 version 154→155, ko_leaf_count 32096→32090 갱신, commit `42ae3ba`)

### 1.3 3자 협업 구조 (149~155차 정립)

- **CC (Claude Code)**: repo root, `t`-prefix 명령 실행. **t bash 명령 시 `cd /e/project/GeniegoROI &&` prefix 의무** (N-153-A)
- **검수자 (Claude 채팅)**: 도구 작성, 진단, 설계 문서, 보안 보강, 결정 추천. **CC Edit tool 우선** (N-154-B, 사용자 저장 부담 ↓)
- **사용자**: cross-validation, 파일 저장 (검수자가 생성한 인계서 등), 명시 승인 (commit/push), CC 출력 첨부, **세션 종결 결정**

### 1.4 운영 원칙 (필수 준수, 149~155차 누적)

**영구 ref**: `CONTRIBUTING.md` (commit `e04db86` + `6ae0335` §5 refresh). 다음 세션 검수자 첫 응답 시 참조 의무. 155차 종결 시 N-155-A 추가 commit 예정.

**N-prefix 누적 인덱스** (CONTRIBUTING.md §2 의 단순 재현):

- N-15, N-79, N-145-B, N-145-G (sacred / safety)
- N-150-A (collaboration)
- N-152-A ~ N-152-H (152차)
- N-153-A ~ N-153-D (153차)
- N-154-A ~ N-154-D (154차)
- **N-155-A (155차 신규)**:
  - **N-155-A**: Mojibake-aware 로케일 편집은 Edit tool 의 string anchor 대신 line-number + regex value substitution 스크립트로 강제. Edit tool 의 byte-anchor 매칭은 CJK Compatibility Ideographs (U+F900-U+FAFF) 와 C1 control characters (U+0080-U+009F) 의 변형 보존을 보장하지 않음. `\uXXXX` 자동 스왑은 단일 codepoint 변형만 커버하며, 변형 + invisible-char 결합 손상은 못 잡음. **사례**: 紐 (U+F9CF), 留 (U+F9CD), 吏 (U+F9DE) compatibility 형태 + hidden U+0080 (50 instances) → 22 Edit 중 15 실패 (step 7 1st attempt). Option R rollback + script approach (line splice / regex value substitution) 으로 해소 (commit `f68117d`, `9c18640`).

### 1.5 기술 트랩 (148~155차 누적)

CONTRIBUTING.md §7 영구 기록. 155차 신규 3건:

- **Edit tool byte-anchor 실패** (155 step 7 1st attempt): compatibility CJK (U+F900-U+FAFF) + hidden C1 (U+0080) 조합 시 22 Edit 중 15 실패. byte canonicalization 으로 anchor 무력화. line-number + regex script (N-155-A) 로 해소
- **NFKC normalization 양측 의무** (155 detector bug #4): map key 와 value 양쪽 다 NFKC. 한 쪽만 정규화 시 ⑸→(5) 같은 분해로 longest-match 매칭 깨짐. 4 visitors row regression 후 정정
- **ripgrep blind-spot** (155 step 7 pre-execution): canonical CJK pattern (`紐?`, `吏??`) 으로 grep 시 compatibility 변형 (U+F9CF, U+F9DE) + C1 contaminated 변형 미매치 → 0 hit 오인. residue 검증은 AST/node scan 필수, grep 불가

### 1.6 155차 종결 시점 상태

- **HEAD**: `9c18640` (origin/master sync)
- **leaf count**: 32,090 (154차 32,096 → 155차 32,090, 6 감소)
- **파일 크기**: ko.js 1,516,498 B (-90 B), vi.js 1,183,041 B (-6 lines 효과)
- **Sacred SHA (154 baseline, 유지)**:
  - ja.js: `a5e63f90a76ebd28...` ✓
  - zh.js: `1edbb236dd7c4af8...` ✓
- **Working tree**: clean (untracked 0건)
- **Quarantine 누적**: 4 dirs (155차 신규 0)
- **Production**: HTTP 200 / lang="ko" / smoke green ✓ (4 deploy 전부 통과)
- **Pre-commit hook**: 활성 (G2/G5/B1-B4). 155차 모든 commit pass
- **CI watch**: `tools/ci_watch.sh` 운용 가능, 155 종결 시 dogfood 2회 통과

---

## 2. 155차 작업 완결 보고

### 2.1 통계 요약

| 항목 | 값 |
|---|---|
| **commit** | 4개 (`42ae3ba`, `1415d4c`, `f68117d`, `9c18640`) |
| **push** | 2회 (2 commit + 2 commit 묶음) |
| **CI deploys** | 4 production, 전체 green |
| **smoke dogfood** | 2회 (ci_watch.sh) |
| **신규 영구 도구 (tools/)** | 0 (tools/triage.mjs 후보 도출, 156 진입 대상) |
| **신규 hook** | 0 (.githooks/baseline.json version 154→155 갱신) |
| **신규 영구 문서** | 0 (CONTRIBUTING.md N-155-A 추가는 155 종결 commit) |
| **신규 분석 도구 (session155_*.mjs)** | 7 (scan, apply, orphan_delete, invisible_audit, precision_diag, uniqueness_check, leaf_audit) |
| **신규 데이터 (CSV/MD)** | 6 (handover_notes, repair_plan, orphan_delete_plan, mojibake_catalog, untranslated_ko, repair_summary) |
| **운영 원칙 신규** | 1 (N-155-A) |
| **i18n entries 제거 (ko)** | 6 (degenerate keys) |
| **i18n entries 제거 (vi)** | 6 (orphan keys) |
| **i18n entries 수정 (vi)** | 31 (mojibake repair) |
| **ko.js 감량** | 90 B |
| **vi.js 변동** | -6 lines, 31 value 치환 (line 불변) |
| **leaf count 감소 (ko)** | 32,096 → 32,090 (6) |
| **untracked 정리** | 0 → 0 (유지) |
| **검수자 학습 사례** | 5건 |

### 2.2 작업 단위별 상세

| commit | 작업 | 결과 |
|---|---|---|
| **`42ae3ba`** | ko.js degenerate keys cleanup | 6 keys (line 4629, 6511, 10586, 15541, 15543, 20684). PAT_F CSV 가 1/6 만 catch, 5 keys 는 context audit 으로 발견. baseline.json version 154→155, leaf 32096→32090 동기 갱신 |
| **`1415d4c`** | gitignore Session 155 artifact block | session155_*.{mjs,csv,json,md,txt,sh} pattern. 154 precedent 일관성 |
| **`f68117d`** | vi.js mojibake repair (31 keys, 9 families) | scan → 5-iter detector hardening → catalog 1,944 rows → 31 apply scope 확정 → Edit tool 1st attempt 실패 (15/22) → Option R rollback → line-substitution script (session155_vi_mojibake_apply.mjs) → 31/31 success |
| **`9c18640`** | vi.js orphan delete (6 keys) | 6 ORPHAN_KEY (ko empty, consumer 0 검증, mojibake placeholder 값). line splice script (session155_vi_orphan_delete.mjs) → 6/6 success. ORPHAN_KEY 6 → 0 |

### 2.3 핵심 발견

#### 2.3.1 Detector evolution (5 bugs → frozen)

| # | Bug | Fix | MAPPED Δ |
|---|---|---|---:|
| 1 | Run-equality lookup against MOJIBAKE_MAP | Substring-match (`includes`) against keys | 3 → 18 |
| 2 | `??` outside `units.perDay` mis-classified | Special-case for units.perDay + INFO_ONLY fallback | (split categories) |
| 3 | CJK regex missed Compatibility Ideographs (U+F900-U+FAFF) | NFKC normalize values | 18 → 22 |
| 4 | NFKC normalization broke map keys (⑸ → `(5)`) — 4 visitors regressed | NFKC normalize map keys too | 22 → 26 (regression restored) |
| 5 | Hidden U+0080 (C1 controls) separated mojibake chars in vi.js (50 instances, 47 lines) | Strip C1 controls from valueN + map keys via cleanForMatch helper | 27 → 35 |

**Wide invisible-char audit** (5 Unicode classes: C0-non-WS, C1, ZWJ/BOM family, Bidi controls, BMP variation selectors): C1 50 instances + U+FE0F 120 instances 만 발견. U+FE0F (legitimate emoji VS-16) 보존. **Detector frozen** after C1 strip; supplementary plane / CJK Ext B/C/D / halfwidth-fullwidth 미audit (cost vs benefit 평가 후 156 이관).

#### 2.3.2 L8947 detector narrowness (Option A semantic-locked addition)

`pages.commerce.perDay` (value `??`) 는 detector 의 의도된 narrow rule (`units.perDay` suffix 만 검사) 로 인해 INFO_ONLY 분류. ko_value `일` + keyname `perDay` + 동일 mojibake byte pattern 으로 semantic-locked. Option A 채택: detector 미수정 + 수동 scope 확장. apply count 30 → 31.

**156 검수자 주의**: 이 패턴은 detector freeze 후 발견된 6번째 bug 인접 사례. tools/triage.mjs 영구도구화 시 rule 재설계 (keypath suffix 기반이 아니라 ko_value + key 의미 매칭) 권고.

#### 2.3.3 ko.js keypath collisions (~18 — 신규 발견)

`session155_leaf_audit.mjs` 실행 결과:

- Literal string Property: 32,079
- Literal boolean: 1
- ArrayExpression-as-leaf: 10
- **baseline 정의 합계**: 32,090 ✓
- flattenKo (Map dedup): 32,061
- **차이 18**: ko.js 에 동일 dotted keypath 중복 정의 18건 존재 → runtime 에 후행 정의가 선행 덮어씀

**156 트랙 후보**: keypath 충돌 18건 audit + cleanup. 외부 의존 0, 즉시 가능.

#### 2.3.4 vi.js 3-damage-class taxonomy

| Class | 규모 | 처리 |
|---|---:|---|
| **M (mojibake)** | 35 catalog (155 repaired 31, 잔류 5: 3 HOLD + 2 REMNANT) | 155 완료 (외부 의존 0) |
| **PAT_J (Japanese in vi.js)** | 1,797 NEEDS_MAPPING | **156+ 외부 의존** (번역 mode) |
| **K (untranslated Korean)** | 1,018 rows | **156+ 외부 의존** (PAT_B 합류) |

**Emoji-prefix damage (105 INFO_ONLY)**: ✅/⚠ 등 Korean source emoji → `??Approve` 류 손상. UI design 결정 필요 (이모지 보존 여부).

**Escape damage**: K catalog spot-check 에서 `"오늘, \\\09\\\":30 AM"` 류 발견. 별도 inspection.

### 2.4 155차 검수자 자기-비판 (재발 방지)

| 위반 / 오판 | 도출 / 학습 |
|---|---|
| 5-iteration detector 패턴 (각 productive 하나 누적 시간 ↑) | pre-detector unit-test discipline 부재. 156 보강 메모 #9 후보 |
| Edit tool 가 compat CJK + C1 보존하리라 가정 (22 Edit 중 15 실패) | **N-155-A** 도출. Option R rollback 으로 복구 (12 partial 폐기) |
| "MAPPED 35 → 4" 산수 오류 (REMNANT 2 잔류 누락) | CC 가 정확히 정정. scan re-run + status histogram 의 가치 입증 |
| Pre-grep insufficient (perDay expect 3 vs 실측 4) | L8947 INFO_ONLY 발견 + Option A 확장. 사전 측정 의무 강화 |
| 신규 mapping 추가 시 confidence 차등 미적용 | 留ㅼ＜ medium → keypath context 로 high 승격, 吏?? high → 즉시 채택. Confidence × context 매트릭스 필요 |

156 검수자: 위 5건 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + **N-155-A** 준수 명시.

---

## 3. 156차 작업 진입

### 3.1 외부 의존 / 진입 조건

**155 deploy 잔여 의존: 0**. 모든 155 작업 production live.

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
| **badge20kpi ko.js drift** (155 신규, 3 HOLD) | 사용자 (source of truth) | 결정 필요 |

### 3.2 트랙 구조 (155차 종결 시점)

| 트랙 | 진입 가능 시점 | 155차 산출물 |
|---|---|---|
| **ko.js 키 충돌 18건 cleanup** (155 신규) | 즉시 가능 (외부 의존 0) | `session155_leaf_audit.mjs` 측정 결과 |
| **tools/triage.mjs 영구도구화** (N-155 학습 정착) | 즉시 가능 (외부 의존 0) | 155 detector 5-bug history 가 설계 input |
| **v3 catalog generator fix** | 즉시 가능 | 154차 W5/W9 산출물 + 155 detector freeze 패턴 |
| **gSug cross-locale sync** | 즉시 가능 | 155 vi.js mojibake repair 부산물 발견 |
| **PAT_F + PAT_E 잔여 cleanup** | 즉시 가능 | 154 CSV (155 에서 PAT_F 1/6 만 처리, PAT_E false positive 확정) |
| **PAT_J Japanese in vi.js** | 사용자 번역 mode 결정 | `session155_vi_mojibake_catalog.csv` 1,797 rows |
| **K untranslated Korean** | 사용자 결정 (PAT_B 합류 가능) | `session155_vi_untranslated_ko.csv` 1,018 rows |
| **Emoji-prefix damage** | UX 팀 답변 | 105 INFO_ONLY rows |
| **badge20kpi drift 해소** | 사용자 (source of truth) | 3 HOLD rows + ko.js KPI 20개/Badge20kpi 불일치 |
| **REMNANT 2 + totalCac multi-run** | 사용자 또는 번역팀 | L9313 cái?, L17495 khu vực7??, L12536 totalCac |
| **W0 코드 제거** | 사용자 rotation 완료 후 | `W0_SECURITY_PLAINTEXT_CREDS.md` |
| **T3 Phase A** | 백엔드 API 답변 후 | `T3_MENU_TOGGLE_DESIGN.md` |
| **T7 동기화 실행** | 사용자 mode 결정 후 | `T7_LOCALE_SYNC_PLAN.md` + 153차 산출물 |
| **drift Cat B/C** | 사용자 결정 | 153차 W5 산출물 |
| **German cmpRow drift** | 번역 리뷰 | 154 산출물, 8 rows |
| **NEXT_SESSION 68-153 archive gap rollup** | 사용자 결정 | -- |
| **PM Phase 2** | endpoint + Session 사양 후 | -- |

### 3.3 156차 첫 응답 권장 패턴

156차 검수자가 사용자 첫 메시지 받으면:

1. `tools/session_init.sh --session 156` 실행 권유 (154차 W8 자산)
2. 결과 출력 (HEAD / sacred SHA / leaf count / quarantine / untracked) 사용자에게 확인
3. 트랙 결정 (검수자 추천 1개 명시, N-152-B):
   - **검수자 추천 후보 (156차 진입 시)**:
     - **ko.js 키 충돌 18건 cleanup** (외부 의존 0, 즉시 가능, 신규 발견)
     - 또는 **tools/triage.mjs 영구도구화** (N-155 학습 정착, detector 5-bug 패턴 영구 자산화)
4. **PM 본 작업 진입 시: 새 채팅 세션 분리 의무 명시** (i18n 트랙 컨텍스트 오염 방지, N-152-F 트랙 분리 정신)

CC 첫 명령 (사용자가 직접 실행 또는 검수자 통해):

```
t bash -c "cd /e/project/GeniegoROI && tools/session_init.sh --session 156"
```

기대값: HEAD `9c18640`, ko.js 1,516,498 B, leaves 32,090 (baseline 32,090, Δ=0), ja SHA `a5e63f90...` ✓, zh SHA `1edbb236...` ✓, quarantine 4 dirs, untracked 0.

---

## 4. 155차 작업 자산

### 4.1 commit 4건

| Hash | Subject | Files | Lines |
|---|---|---|---|
| `42ae3ba` | cleanup(i18n): remove 6 degenerate ko.js keys (PAT_F + 5 uncaught) | 2 | +2 / -14 |
| `1415d4c` | chore(gitignore): add Session 155 analysis artifact block | 1 | +8 |
| `f68117d` | fix(i18n): vi.js mojibake repair (31 keys, 9 families) | 1 | +31 / -31 |
| `9c18640` | fix(i18n): remove 6 vi.js orphan keys (zero consumer) | 1 | -6 |

### 4.2 영구 도구 (tracked, 재사용 가능)

155차 신규 영구 도구 없음. 154차 자산 그대로 유지 (`tools/ci_watch.sh`, `tools/session_init.sh`, `.githooks/pre-commit`, `.githooks/baseline.json`, `CONTRIBUTING.md`).

**156 후보**:
- `tools/triage.mjs` (N-155 학습 정착: AST + NFKC + C1 strip + MOJIBAKE_MAP DSL + RFC-4180 CSV + status classifier)

### 4.3 분석 도구 (gitignored, 156 session_init 이 처리)

| 경로 | 용도 |
|---|---|
| `session155_vi_mojibake_scan.mjs` | catalog generator (5-iter hardened, frozen) |
| `session155_vi_mojibake_apply.mjs` | line-number + regex substitution (31 row, N-155-A 정신) |
| `session155_vi_orphan_delete.mjs` | line splice (6 row, idempotent + atomic + abort-before-write) |
| `session155_invisible_audit.mjs` | wide Unicode class audit (5 classes) |
| `session155_precision_diag.mjs` | byte-level diagnostic (CP932/UTF-8/Vietnamese density) |
| `session155_uniqueness_check.mjs` | Edit anchor uniqueness 사전 측정 |
| `session155_leaf_audit.mjs` | ko.js leaf-count 정의 진단 (Δ=29 해소) |

### 4.4 데이터 자산 (156차 입력 후보)

| 경로 | rows | 용도 |
|---|---|---|
| `session155_vi_mojibake_catalog.csv` | 1,944 | M classification (post-detector freeze) |
| `session155_vi_untranslated_ko.csv` | 1,018 | K classification (untranslated Korean in vi.js) |
| `session155_vi_repair_summary.md` | -- | status breakdown + 사용자 결정 옵션 |
| `session155_handover_notes.md` | 152 lines | 작업 incremental notes (본 인계서가 핵심 발췌 통합) |
| `session155_vi_repair_plan.md` | -- | 31 row apply plan (step 5c 산출물) |
| `session155_vi_orphan_delete_plan.md` | -- | 6 row delete plan (step 6 산출물) |

### 4.5 Quarantine 누적 (gitignored, 로컬 보존)

| 경로 | 상태 |
|---|---|
| `frontend/_quarantine/locales_backups_s153/` | 474 files (153차) |
| `frontend/_quarantine/orphan_keys_s153_self_nest/` | 15 JSON, 19,599 entries (153~154차) |
| `frontend/_quarantine/src_bak_s153/` | 5 files (153차) |
| `frontend/_quarantine/cleanup_backups_s154/` | 15 files (154차) |

155차 신규 quarantine 0.

### 4.6 156차 진입용 .gitignore session 156 block

`session_init.sh` 가 156 진입 시 자동 추가 (TBD, 156 session_init.sh 실행 후 확정). 154/155 precedent: `session<NN>_*.{mjs,csv,json,md,txt,sh}` 7 line block.

---

## 5. 잔여 작업 (156차 이후)

### 5.1 즉시 진행 가능 (외부 의존 없음, 검수자 추천 우선순위)

| 작업 | 분량 | 비고 |
|---|---|---|
| **ko.js 키 충돌 18건 cleanup** (155 신규) | 18 row, 1 commit | runtime override 정리. session155_leaf_audit.mjs 재실행 + 분류 |
| **tools/triage.mjs 영구도구화** (N-155 학습 정착) | 1~2 세션 | detector 5-bug pattern + RFC-4180 + classifier. 156 별도 트랙 |
| **v3 catalog generator fix** | 별도 세션 | RFC-4180 quoting + acronym whitelist + PASS-row filter (154 W5/W9 결함) |
| **PAT_F + PAT_E 잔여** | 작음 | 154 산출물에서 일부 처리, 잔여 분류 |
| **gSug cross-locale sync** | 14 keys × 10 locales | 번역 mode 결정 시 즉시 가능 (검수자가 mechanical translation 권장 LLM 사용) |
| **NEXT_SESSION 68-153 archive gap rollup** | 86 sessions | 분량 ↑↑, 별도 세션 권장 |
| **drift Category A 보존 확정** | 3,458 keys | 사용자 검토 |
| **drift Category B/C 진입** | 분량 ↑↑ | 별도 세션 권장 |

### 5.2 외부 의존 후 진행

| 작업 | 의존 조건 |
|---|---|
| **W0 코드 제거** | 사용자 rotation 완료 |
| **PAT_B mechanical translation (137 keys)** | 사용자 mode 결정 (LLM/외주/in-house) |
| **PAT_J Japanese in vi.js (1,797 rows)** (155 신규) | 사용자 번역 mode 결정 |
| **K untranslated Korean (1,018 rows)** (155 신규) | 사용자 번역 mode 결정 (PAT_B 합류 가능) |
| **PAT_C ko-source authoring** | UX/copy 팀 답변 |
| **PAT_A guide tour writing** | UX 팀 답변 |
| **PAT_D parity drift 정책** | 사용자 결정 |
| **Emoji-prefix damage** (155 신규) | UX 팀 결정 (이모지 보존 여부) |
| **badge20kpi drift** (155 신규) | 사용자 (source of truth) |
| **REMNANT 2 + totalCac** (155 신규) | 사용자 또는 번역팀 |
| **T3 Phase A** | 백엔드 팀 답변 |
| **T7 sync 실행** | 사용자 mode 결정 |
| **PM Phase 2** | endpoint + Session 사양. **새 채팅 세션 분리 의무** |

### 5.3 사용자 요청 큰 트랙 (외부 사양 필요)

- T4 마케팅 자동화 8 카테고리
- T5 팀 채팅
- T6 프로젝트 협업
- T1 PM Phase 2

### 5.4 기존 작업 트랙 (147~153차 잔재)

| 작업 | 처리 시점 |
|---|---|
| s140/s142 CSV 89건 동기화 | 외부 파이프라인 소유자 결정 후 |
| E5 잔여 ~25건 실제 leak | i18n 회귀 검사 시 |

---

## 6. 초엔터프라이즈 보강 메모 (156차 결정용)

154차 #5~#8 + 155차 신규 검토 후보:

| # | 항목 | 사유 |
|---|---|---|
| **#5** | Hook G6 (working-tree-vs-index drift detection) | 154 W2 사고 재발 방지 (carry-over) |
| **#6** | tools/session_close.sh | session_init 의 반대. 종결 자동화 (carry-over) |
| **#7** | placeholder triage CLI (`tools/triage.mjs`) | **155 N-155 학습 정착 + detector 5-bug 패턴 영구화**. 우선순위 ↑↑↑ |
| **#8** | drift category 자동 라벨링 도구 | 154차 W5/W9 패턴 일반화 (carry-over) |
| **#9 (신규)** | Pre-detector unit-test discipline | 155 detector 5-iter 재발 방지. detector 작성 시 known-mojibake fixture 10건으로 매 패치 검증 |
| **#10 (신규)** | Pre-execution grep verification standard step | L8947 발견 사례. 모든 batch operation 전에 expected count 측정 의무 (CONTRIBUTING.md §3 standard practice) |
| **#11 (신규)** | Edit tool capability flag in CONTRIBUTING | N-155-A 사례를 도구 capability matrix 로 영구 기록 (compatibility CJK / C1 / RLM 등의 byte-anchor 미보장 명시) |

156차 검수자: 위 항목 별도 트랙 진입 시 사용자 결정 우선. **#7 (tools/triage.mjs)** 가 가장 즉시 가치 + 가장 큰 N-155 자산화 효과.

---

## 7. 알려진 이슈 / 주의사항 (148~155차 누적)

CONTRIBUTING.md §7 영구 기록 참조. 핵심:

- **N-153-A 트랩**: `cd /e/project/GeniegoROI &&` prefix 의무
- **N-154-A 트랩**: astring/AST stringify 금지, offset slice 강제
- **N-154-B 트랩**: Edit 후 git add 재실행 의무
- **N-154-D 트랩**: self-policing tool 자가 제외 의무
- **N-155-A 트랩 (신규)**: mojibake-aware 편집 시 Edit tool 의 string anchor 불신뢰. line-number + regex script 강제. compat CJK (U+F900-U+FAFF) + C1 (U+0080-U+009F) 결합 손상 사례 50+ instances
- **Python stub on Windows**: Node.js 사용
- **gh CLI 미설치**: `tools/ci_watch.sh` (curl + node)
- **CRLF/LF**: CC Edit tool 신뢰
- **execSync ENOBUFS**: maxBuffer 16MB
- **NFKC 양측 정규화 의무 (신규)**: lookup map key 와 매치 대상 value 양쪽 다 NFKC. 한 쪽만 정규화 시 longest-match 깨짐
- **ripgrep blind-spot (신규)**: canonical CJK pattern 으로 compatibility 변형 매치 불가. residue 검증은 AST scan 필수

### 7.1 CI / 프로덕션

- **배포 자동 트리거**: master push 시 자동 (deploy.yml)
- **paths-ignore**: `**.md`, `**.txt`, `docs/**`, `.claude/**` — docs-only push 는 CI 스킵
- **CI 소요**: 평균 25~35초 (155차 측정 21~42초)
- **155차 종결 시점 배포**: 4 commits 전부 production. 마지막 smoke HTTP 200 / 42ms / lang="ko"
- **Production smoke baseline**: HTTP 200 / 21~42ms / lang="ko"
- **vi.js 변경의 G2/G5 무영향 확인**: 155차 f68117d/9c18640 commit 모두 G2 pass (ja/zh SHA 불변), G5 skip (ko.js 미변경)

### 7.2 155차 검수자 행동 학습 사례 (5건)

| 사례 | 도출 |
|---|---|
| Edit tool byte-anchor 가정 → 15/22 실패 → Option R rollback | **N-155-A** (line-number + regex script 강제) |
| 5-iteration detector 패턴 (각 productive, 누적 시간 ↑) | 보강 메모 #9 (pre-detector unit-test) |
| Pre-grep insufficient (perDay expect 3 vs 4) → L8947 발견 | 보강 메모 #10 (pre-execution grep verification) |
| "MAPPED 35 → 4" 산수 오류 → CC 가 정정 | scan re-run + status histogram 의 가치 (검수자가 계산보다 측정 우선) |
| 신규 mapping confidence 차등 미적용 | Confidence × context 매트릭스 필요 (留ㅼ＜ medium → keypath context 로 high 승격) |

156차 검수자: 위 사례 인지 + 첫 응답에서 N-152-A~H + N-153-A~D + N-154-A~D + **N-155-A** 준수 명시.

---

## 8. 핵심 메트릭 요약

### 8.1 i18n 전체 진행 누적 (147~155차)

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
| **155차 cleanup** | **6 degenerate ko.js keys 제거** ✓ |
| **155차 mojibake repair** | **vi.js 31 keys × 9 families 치환** ✓ |
| **155차 orphan delete** | **vi.js 6 ORPHAN_KEY 제거** ✓ |
| **155차 baseline 정의 진단** | **leaf-count Δ=29 공식 도출 (string + boolean + array-as-leaf)** ✓ |

### 8.2 ko.js leaf trajectory (147~155)

| Session | Leaves | Δ |
|---|---:|---:|
| 153 종결 | 33,211 | -- |
| 154 종결 | 32,096 | -1,115 |
| **155 종결** | **32,090** | **-6** |

### 8.3 155차 작업 결과

| 항목 | 값 |
|---|---|
| commit | 4 (`42ae3ba` ~ `9c18640`) |
| push | 2회 (2+2 묶음) |
| CI deploys | 4 production green |
| smoke dogfood | 2회 (ci_watch.sh) |
| 신규 영구 도구 | 0 (tools/triage.mjs 후보 도출) |
| 신규 hook | 0 (baseline.json version+leaf 갱신) |
| 신규 영구 문서 | 0 (CONTRIBUTING.md N-155-A 추가는 별도 commit 예정) |
| 신규 분석 도구 | 7 (session155_*.mjs) |
| 신규 데이터 | 6 (CSV/MD) |
| 운영 원칙 신규 | 1 (N-155-A) |
| i18n entries 제거 (ko) | 6 |
| i18n entries 제거 (vi) | 6 |
| i18n entries 수정 (vi) | 31 |
| ko.js 감량 | 90 B |
| leaf count | 32,096 → 32,090 |
| Sacred SHA | 불변 (vi.js 는 sacred 아님) |
| Untracked | 0 → 0 |
| 검수자 학습 사례 | 5건 |
| Detector evolution | 5 bugs → frozen |
| 신규 트랙 후보 | 6 (ko.js 키 충돌 / tools/triage / PAT_J / K untranslated / Emoji / badge20kpi) |

---

## 9. 156차 첫 메시지 권장 패턴

### 사용자 → 검수자

"155차 인계서 첨부합니다. 156차 [트랙 결정 또는 구체 작업 지시]. [NEXT_SESSION.md 첨부]"

### 검수자 첫 응답 의무

- 운영 원칙 인지 명시 (특히 **N-155-A** + N-154-A~D + N-153-A 누적)
- `tools/session_init.sh --session 156` 실행 권유 (정찰 자동화)
- 트랙 결정 시 검수자 추천 1개 명시 (N-152-B)
- t bash 명령은 `cd /e/project/GeniegoROI &&` prefix (N-153-A)
- 사용자 저장 부담 줄이기 위해 CC Edit tool 우선 (N-154-B)
- mojibake/encoding 작업 시 Edit tool 의 byte-anchor 신뢰 금지, line-number + regex script (**N-155-A**)
- 핵심만 짧게, 한 번에 하나씩, 세션 종결은 사용자 결정 후에만
- **PM 본 작업 진입 시 새 채팅 세션 분리 의무** (i18n 트랙 컨텍스트 오염 방지)

### 검수자 추천 156차 진입 트랙 (N-152-B)

1. **ko.js 키 충돌 18건 cleanup** (외부 의존 0, 즉시 가능, 1 commit)
   - `session155_leaf_audit.mjs` 재실행 + 충돌 keypath 추출
   - 각 충돌의 정상 정의 식별 + 중복 제거
   - leaf 32,090 → 32,072 예상

2. **tools/triage.mjs 영구도구화** (N-155 자산화, 1~2 세션 별도)
   - 155 detector 5-bug pattern + RFC-4180 + status classifier
   - AST + NFKC + C1 strip + MOJIBAKE_MAP DSL
   - 156 진입 시 사용자 결정 후 별도 트랙 권장

3. (PM 본 작업 진입 시): **새 채팅 세션** 으로 분리. 156 은 i18n 트랙, PM 은 별개 채팅

---

**문서 종결.**

본 인계서는 사용자 명시 종결 결정 후 검수자가 `create_file` 로 단일 파일 생성 (N-152-E + N-152-G + 153차 학습). 사용자는 기존 NEXT_SESSION.md 를 본 파일로 교체 (repo root). 156차 첫 메시지에 첨부.