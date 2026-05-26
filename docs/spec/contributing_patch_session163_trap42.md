# 163차 CONTRIBUTING patch — #42 트랙 학습 영구화

> **세션**: 163차
> **트랙**: #42 wrapper 함수 추적 (162 carry-over)
> **저장 일시**: 2026-05-26
> **patch 대상**: `CONTRIBUTING.md`
> **저장 방식**: CC inline heredoc (§7 #37 v4 적용 — save dialog 우회)

## 1. 배경

163차 #42 트랙 진행 중 다음 자가 반박 발생:

1. **가설**: pages_backup/ 의 useT 호출 (Step 4 grep 7+ hits) 이 manifest consumer count 를 inflate. P4 dead-key cleanup under-delete 원인.
2. **실측 (P4)**: `SKIP_PATH_SUBSTRINGS` 에 `pages_backup` 추가 → scanner 재실행 → Δ=0 (변화 없음).
3. **진실 (F1)**: `tools/build_resolver_manifest_v2.mjs` line 56 `SKIP_DIRS` 에 `pages_backup` 이미 포함. 디렉터리 진입 단계에서 prune.
4. **검수자 grep 누락**: F1-2 의 filter 패턴 grep 이 line 56 `SKIP_DIRS` 를 잡지 못함 (단발 grep 의 구조적 한계).

## 2. 영구화 항목

### §6 #38 v3 (추론 → 실측 의무 강화)

**§6 #38 v2 직후 재발**. v2 가 "test input vs production source layer 분리" 만 다룸. v3 가 추론-실측 갭 명시.

**의무**:
- scanner/manifest/hook 관련 가설은 **B-recon (실측 명령)** 없이 결론 금지.
- grep hit (단발 검색) 과 manifest scan hit (scanner 실행 결과) 은 별개 우주.
- 가설 수립 시 "이 가설을 부정할 실측 명령" 을 동시 작성.

**예시 (반박된 케이스)**:
- 가설: pages_backup 7 useT calls → consumer count inflated
- 실측 명령: `SKIP_PATH_SUBSTRINGS` patch → 재실행 → Δ 측정 (Δ=0 → 가설 반박)

### §6 #41 영구화 직후 재발 명시 재확인

**의무**:
- step 시작 시 직전 step 의 영구화 항목 명시 재확인.
- 162 mini-patch (§6 #38 v2) 영구화 commit 후 163 #42 트랙에서 동일 패턴 재발 — 영구화 인지가 자동 적용 보장 안 됨.
- 검수자 첫 응답의 "운영 원칙 인지 명시" 와 별개로, **step 진입마다 관련 #-prefix / trap-letter 재인용** 필요.

### §7 trap G — Scanner 변경 전 전수 읽기 의무

**사례**: 163 #42 트랙. `SKIP_PATH_SUBSTRINGS` (line 58) 만 grep → `SKIP_DIRS` (line 56) 놓침.

**의무**:
- scanner 동작 변경 전 **전체 파일 view** (또는 SKIP / walk / filter / extension 조건 전수 grep 다중 패턴).
- 단발 grep 으로 변경 안전성 결론 금지.
- F1 의 4-step grep 도 부족 — line range view 또는 `grep -nE 'SKIP|walk|filter|readdir'` 통합 패턴 의무.

### §7 trap H — 영구화 직후 재발 trap

**사례**: 162 §6 #38 v2 영구화 commit (`8965cdb`, `a6897c2`) 후 163 #42 트랙에서 검수자가 동일 dogfood self-consistency 위반.

**기존 §7 #37 v4** (162 trap41) 는 spec save dialog 우회 만 다룸. 영구화 직후 재발 자체는 별도 trap.

**의무**:
- 영구화 commit 직후 작업 진입 시 **재확인 step** 명시 (§6 #41 와 연계).
- 영구화 항목 누적이 영구화 효력 보장 못함 인지.

### §7 trap I — Baseline commit 누락

**사례**: 163 #42 B6 step. HEAD `881ea06` 의 `tools/resolver_consumer_manifest_v2.json` 은 247/43 (낡음). working-tree 는 205/0 (161 baseline). 161 baseline regen 이 stage 됐다가 commit 안 됨 (또는 commit 되지 않은 채 다음 commit 들이 진행).

**162 인계서 §1.1** "manifest v2 summary direct 5272 / prefix 53 / dynamic 3 / scan_files 205 / parse_errors 0 (161차 baseline 유지)" — working-tree 기준 진술. HEAD 와 불일치.

**의무**:
- baseline 변경 commit 시 변경 파일이 commit 에 포함됐는지 `git show HEAD --stat` 검증.
- 인계서 baseline 진술은 HEAD 기준 (`git show HEAD:파일`) 명시.

## 3. 관찰 데이터 (영구 기록)

### useTr 파편화 (P4 진입 전 통합 candidate)

**3 파일 in-file 정의 (공유 hook 없음)**:
- `frontend/src/pages/BudgetTracker.jsx:125` — block-form, fallback semantics A
- `frontend/src/pages/ReturnsPortal.jsx:11` — one-liner, RP[lang] dictionary
- `frontend/src/pages/SupplyChain.jsx:118` — useI18n + SC_DICT[lang] + t(d[0],d[1]) delegate

추가 inline fallback 패턴 2건:
- `frontend/src/pages/CampaignManager.jsx:129` — useCallback + FB[key]
- `frontend/src/pages/JourneyBuilder.jsx:53` — 동일 패턴

### 25k dead-key gap 원인

162 종결 시점: 30,656 leaves − 5,328 referenced ≈ 25,328 unreferenced.

**원인 pages_backup 아님 확정**. 별도 조사 필요 (P4 진입 전).

### t alias 표준화

`const t = useT()` 102회 (단일 canonical alias). pages_backup 제외 23 files.

## 4. 검증

본 patch 적용 후:
- CONTRIBUTING.md line count: 465 → 예상 ~540 (+75 lines)
- §6 newest entry: #41 (was #40)
- §7 newest trap: trap I (was trap F)

## 5. 후속 candidate

- **P4 dead-key cleanup 진입 전**: 25k orphan 원인 조사 (별도 트랙)
- **useTr 통합**: 3 in-file 정의 → 공유 hook (별도 트랙)
- **baseline commit 위생**: `git show HEAD --stat` 자동 검증 hook (G9 후보)

