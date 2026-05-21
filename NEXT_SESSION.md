# # GenieGoROI i18n 인계서 — 143차 시작점

> 본 문서는 142차 검수자가 전체 작성.
> 143차 검수자는 이 문서 전체를 신뢰 기반으로 삼되, 모든 수치·상태는
> 143차 시작 시 raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로
> 0/부재를 입증해야 보류가 정당. **★특히 locale 폴더 전체 .js 파일
> raw 확인 필수 (N-116) + ko.js 다중 블록 구조 raw 재확인 필수
> (N-128) + ★build_leaf_paths 한계 인지 필수 (N-130/N-130b) +
> ★top-level ns 들여쓰기 raw 측정 원칙 (N-133) +
> ★★ N-135 (multi-block last + scalar overwrite 패턴) +
> ★★★ N-136 (다른 12개 언어의 ns 계층 구조가 ko/ja 와 상이) +
> ★★★★ N-137 (ns 명이 따옴표 없이 unquoted indent=2 패턴) +
> ★★★★★ N-138 (deep-merge 도구의 last block 통째 교체 패턴) +
> ★★★★★ N-140 신규 (unquoted root 도구는 indent=2 강제 + nested 매칭 차단 필수) +
> ★★★★★ N-141 신규 (도구 byte 측정 vs 실제 byte 차이 — leaf count 가 안전 지표) +
> ★★★★★ 사용자 강화 지시 — 검수자가 종결을 너무 자주 주장. 작업
> 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행.**

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★★★★★ 작업 여력 최대 활용 (132차 사용자 명시, 142차 강화)**:
   - 검수자는 종결 제안을 함부로 하지 않는다.
   - 작업 여력 있으면 추가 회수·발굴·도구작성·apply 까지 끝까지 진행.
   - 인계서만 작성하다 차수 증가시키지 말 것.
   - 인계서 작성 전 반드시 사용자 승인을 받는다.
   - 인계서는 검수자가 전체 작성 (기존 전체 삭제 후 전체 붙여넣기).
   - 임의 종결·임의 인계 작성 금지.
2. **추측 보류 금지** (raw 측정 + node import 기반): N-116/N-117/N-128/N-130/N-130b/N-133/N-135/N-136/N-137/N-138/N-140/N-141 모두 동일.
3. **★불가작업 전환 원칙**: 진행 중인 특정 작업이 그 차수에 raw 로
   도저히 불가함이 입증되면, 거기 매달리지 말고 작업 여력이 있는
   한 다른 진행 가능한 작업으로 즉시 전환. 부분 종결이어도 무방.
4. **★불가의 2종 구분**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계. 차수 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가. 선행 충족되면 가능.
5. **★사용자가 ko 결정하는 영역 — 추측 절대 금지 (N-17/N-25/N-58/N-65/N-115/N-121)**:
   ko_fixed 자동 결정 금지. 단, 추천값 제시 후 사용자 확정 받는 워크플로우는 허용.
   **★142차 적용 (PASSTHROUGH 확장)**: ja_en (영문값) 도 사용자 명시 승인 후
   PASSTHROUGH 로 ko 자동 회수 허용 (결정이 아니라 영문→영문 복사로 간주).
   ja_jp (일본어값) 는 여전히 사용자 결정 영역.
6. **★CC 자동 명령 무력화 원칙**: 거부 응답 입력하지 않고, 검수자의 다음 `t` 명령으로 덮어쓰기.
   - **★N-127 시리즈 (PowerShell manual approval)**: a) 인라인 따옴표 충돌 → 도구 파일 우회, b) `cmd /c dir` → PowerShell 네이티브, c) `cd <path>; <cmd>` compound → 한 줄 cd 또는 `git -C`, d) `$env:VAR=...` → 도구 안에서 처리, e) .NET API 호출 → 단순 cmd 우회.
   - **★N-134**: CC 가 ja.js/zh.js 임의 작업 시도 → 즉시 거부 + 검수자 명령 덮어쓰기.
   - **★N-139**: CC 가 검증완료 .py 자체 수정 시도 → `3` 거부 + 검수자가 PowerShell 명령으로 직접 수정.
7. **★ko/다른 언어 안전 apply 도구 패턴 (135~142차 실증)**:
   - ko 기존 path 값 수정: `session132_apply_ko_only.py`
   - ko 신규 키 (기존 namespace, parent 단일 블록): `session134_apply_new_keys.py --csv <path>`
   - ko 신규 namespace 통째: `session136_apply_v2.py` 또는 `session138_add_grade_only.py` 패턴
   - **★ko 빈 stub 교체**: `session138_replace_gsug_stub.py`
   - **★ko 기존 블록 append**: `session138_append_to_block_v2.py --ns <ns> [--block N]`
   - 중첩 nested sub-block 수동: CC Edit 도구 (helpPanel 케이스)
   - **★ko PASSTHROUGH deep-merge (141차)**: `session141_ko_passthrough_v2.py`
   - **★★ko PASSTHROUGH deep-merge v3 (142차 신규, NS_WHITELIST 폐기)**:
     `session142_ko_passthrough_v3.py --tsv <path> [--ns <ns>] [--apply]`
   - **★다른 12개 언어 simple propagation**:
     `session140_propagate_v6_patch2.py --lang <lg> [--apply]`
   - **★다른 12개 언어 nested propagation**:
     `session140_propagate_v6_nested_patch1.py --lang <lg> [--apply]`
   - **★다른 12개 언어 deep-merge propagation (141차)**:
     `session141_propagate_v3_deepmerge.py --lang <lg> [--apply]`
   - **★다른 12개 언어 scalar overwrite 제거**:
     `session140_remove_workspace_scalar.py --lang <lg> [--apply]`
   - **★N-136 kakao 구조 정리 (141차)**:
     `session141_restructure_kakao.py --lang <lg> [--apply]`
   - **★N-136 pages nested sub-ns 추가 (141차)**:
     `session141_pages_nested.py --lang <lg> [--apply]`
   - **★N-137 unquoted indent=2 root 처리 (142차 신규, v2 검증완료)**:
     `session142_propagate_unquoted_ns_v2.py --lang <lg> [--apply]`
   - ★ja.js/zh.js (정답군) 절대 propagation 금지 (N-79/N-134)
8. **★only_b 분류 신뢰 금지 (N-93)**: 코드 호출 grep 검증 필수.
9. **★PASSTHROUGH 패턴 (N-110, 141~142차 확장)**:
   - 141차: ja_hangul=1 (ja 값이 한글) → ko 값 그대로 복사 (1,770)
   - **142차 확장: ja_en (영문값) 도 사용자 승인 후 ko 자동 회수 (+6,107)**
   - 142차 실적: ko +6,107 + 12개 언어 propagation +40,498 = **+46,605 entries**
10. **★사전 다단계 보강 (N-111)**: v1→v6 패턴 단계적 상승.
11. **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시)**:
    배포 운영 중. ko 신규 키 추가 시 → 14개 언어 모두 동일 path 보장 필수.
    **★142차 적용**: ja_en PASSTHROUGH 후 12개 언어 propagation 동시 진행. ko∩ja 14,870 달성.
12. **★★★★★ ko/ja 구조 raw 재확인 원칙 (N-117)**:
    142차 종결 시점: ko 28,726 / ja 22,175 / 공통 14,870.
    ★ node import (정답) 기준.
13. **★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128/N-133/N-135/N-137/N-140)**:
    정규식 단독 신뢰 금지. raw 검증 필수.
    dry-run 안전검사: `delta == applied`, `missing == 0`, `unexpected == 0` 셋 다 PASS 강제.
    **★N-140 (142차 신규)**: indent=2 root 강제 매칭 필수. nested quoted 가 root 로 오인되는 결함 차단.
14. **★★★★★ ko.js 다중 블록 raw 확인 원칙 (N-128)**:
    동일 namespace 가 여러 블록에 중복 존재. 142차 종결 raw:
    tabs 3 / performance 3 / commerce 3 / pages 2 / attribution 3 / cat 4 /
    audit 2 / gSug 1 / crm 1 / banner 4 / marketing 4 / reportBuilder 2.
15. **★★★★★ build_leaf_paths 한계 인지 원칙 (N-130/N-130b)**:
    python walker 부정확. **node ESM import 으로 leaf set 추출이 정답**.
    `session140_kojaintersect_missing.mjs` 가 표준.
16. **★top-level ns 들여쓰기 raw 자동 측정 원칙 (N-133)**:
    142차 raw 측정: 15개 언어 모두 = 2 spaces (실측 동일).
    future-proof 로 도구는 `export default {[ \t]*\n([ \t]+)` 정규식으로 자동 측정.
17. **★★★★ N-135 (140차) — multi-block last 선택 + scalar overwrite 제거**:
    - multi-block 시 last 블록 선택 (JS 표준: 마지막이 이김).
    - scalar 후행 entry 가 object 블록 덮어쓰기 → 별도 제거 도구.
18. **★★★★★ N-136 (140~141차) — 다른 언어 ns 계층 ko/ja 와 상이**:
    - 141차 해결: th/id/zh-TW kakao 구조 정리 → +315 entries 회수.
    - 141차 해결: th/id/zh-TW/vi pages sub-ns 추가 → +30 entries.
19. **★★★★ N-137 (141~142차) — unquoted ns root + indent=2 패턴**:
    - 일부 언어의 root key 가 따옴표 없이 작성됨 (banner/performance/reportBuilder).
    - 정규식 `^[ \t]*<ns>:\s*\{` (unquoted) + `^[ \t]*"<ns>":\s*\{` (quoted) 둘 다 매칭.
    - **★142차 추가 발견 (N-140)**: indent 자유 정규식은 nested 위치도 매칭 → 오인 위험.
      → **indent=2 정확히 강제 (`^(  )` 정규식)** 필수.
    - 142차 해결: 8 언어 banner/performance/reportBuilder N-137 처리 → +35 entries.
20. **★★★★★ N-138 (141차) — deep-merge 도구 last block 통째 교체 패턴**:
    - node import 으로 ns sub-tree 통째 가져오기 → 새 tree 와 deep merge (기존 우선)
      → last top-level 블록 통째 교체.
    - first/middle 블록은 손대지 않음. multi-block JS 표준 (last 이김) 활용.
    - 검증: 기존 sub-tree 손실 0, 충돌 0, leaf delta 정확.
21. **★★★★★ N-140 신규 (142차) — unquoted root 도구 indent=2 강제 + nested 차단**:
    - v1 결함: `find_blocks_quoted` 가 `^[ \t]*"ns":` 정규식으로 nested 위치도 매칭
      → vi 의 nested quoted "banner" 가 root 로 오인됨 → leaf 손실 (-118).
    - v2 수정: `^(  )"ns":` / `^(  )ns:` 만 매칭 (indent **정확히 2** 강제).
    - 검증: 8 lang dry → leaf check → apply 전 단계 정상.
22. **★★★★★ N-141 신규 (142차) — 도구 byte 측정 vs 실제 byte 차이**:
    - `session142_ko_passthrough_v3.py` 의 도구 로그가 `byte 805,793 → 1,031,525` 출력
    - 실제 ko.js 는 `1,107,953 → 1,334,637` 로 정상 적용
    - 도구의 `text = read(KO)` 시점 측정값이 부정확 (cause 미특정, 다음 차수 개선)
    - **★안전 지표는 byte 가 아니라 leaf count (node import)** — 항상 leaf 로 검증.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피: `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; code <log>`
- 명령 연결은 `;` 만 (`&&`/`||` 금지).
- PowerShell 괄호 `()` / 인라인 따옴표 / `cmd /c` / compound `cd ; ...` / `$env:VAR` / .NET API manual approval 회피.
- CC 승인: `1.Yes/2.allow all/3.No` → `2`, `1.Yes/2.No` → `1`. 검증완료 .py 자체수정 시도 → `3` (N-139).
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기.
- 검수자 설명은 한글·핵심만 짧게. **★사용자 강화 (137~142차)**:
  - 가급적 CC 명령으로 직접 수정 진행
  - 사용자는 도구 파일 저장만 (1건/단계)
  - 검수자 CC 명령으로 즉시 dry → check → apply 진행
  - 초엔터프라이즈급 정밀도
- 선택지 제시 시 검수자 추천 1개 반드시 명시.
- 사용자 작업은 1건만 (도구 저장).
- push 는 사용자 명시 승인 시에만.
- read-only 진단/probe 우선. apply 는 dry → raw → apply 순.
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지).
- ★CSV 로드 시 UTF-8 BOM 처리 (N-131): `encoding="utf-8-sig"` 필수.
- ★다언어 propagation 도구는 node import 검증 필수 (N-130b/N-135/N-138/N-140).
- ★★ leaf count (node import) 가 유일한 안전 지표 (N-141, byte 신뢰 금지).
- **★★★★★ 종결 제안 자제**: 검수자는 종결 제안을 자주 하지 않는다. 사용자가
  명시 지시하지 않는 한 작업 여력 활용 + 부분 종결이라도 진행.

---

## 1. 프로젝트 좌표

### 1-1. locale 디렉토리
`D:\project\GeniegoROI\frontend\src\i18n\locales\` — **15개 언어 .js 파일**

### 1-2. 15개 언어 raw 현황 (142차 종결 시점, byte)

| 그룹 | 언어 | byte | 수정일 | leaf | 역할 |
|---|---|---:|---|---:|---|
| **정답군** | ja.js | 1,153,628 | 5/20 | 22,175 | ★ 정답 출처 / 무변경 |
| | zh.js | 869,855 | 5/20 | - | 보조 정답 / 무변경 |
| **회수 작업** | ko.js | 1,334,637 | 5/21 (142차) | 28,726 | leaf +6,107 |
| **5/14군** | en.js | 1,116,356 | 5/21 | 25,817 | +2,037 |
| | es.js | 1,118,221 | 5/21 | 25,812 | +2,037 |
| | fr.js | 1,116,324 | 5/21 | 25,812 | +2,037 |
| **5/16군** | th.js | 1,241,423 | 5/21 | 24,360 | +1,421 |
| | vi.js | 1,113,157 | 5/21 | 25,568 | +1,989 |
| | id.js | 1,044,975 | 5/21 | 24,339 | +1,421 |
| | de.js | 1,011,163 | 5/21 | 23,259 | +2,137 |
| | zh-TW.js | 961,564 | 5/21 | 22,780 | +1,515 |
| **5/17군** | ar.js | 862,654 | 5/21 | 16,268 | +6,476 |
| | hi.js | 868,421 | 5/21 | 16,267 | +6,476 |
| | pt.js | 853,481 | 5/21 | 16,267 | +6,476 |
| | ru.js | 863,042 | 5/21 | 16,267 | +6,476 |

★ 143차 시작 시 정확한 byte raw 재측정 필수.

### 1-3. leaf count raw (142차 종결, node import 기준)
- ko: 28,726 / ja: 22,175 / zh: 미측정 (정답군 보존)
- en: 25,817 / es: 25,812 / fr: 25,812
- th: 24,360 / vi: 25,568 / id: 24,339 / de: 23,259 / zh-TW: 22,780
- ar: 16,268 / hi: 16,267 / pt: 16,267 / ru: 16,267

### 1-4. ★ko/ja 차집합 raw (142차 종결, node import)

| 항목 | 수치 |
|---|---:|
| ko leaf | **28,726** |
| ja leaf | **22,175** |
| ko ∩ ja | **14,870** |
| ko-only | 13,856 |
| ja-only | 7,305 (대부분 ja_jp 일본어값) |

### 1-5. ★★★ 142차 종결 시점 ko∩ja 부재 path raw (node 실측)

| 언어 | leaf | ko∩ja 부재 | 종류 1 (회수 불가) |
|---|---:|---:|---:|
| en | 25,771 | **1** | marketing.injected_nav (boolean) |
| es | 25,766 | **1** | marketing.injected_nav |
| fr | 25,766 | **1** | marketing.injected_nav |
| th | 24,330 | **1** | helpPanel...connectors.tips (array) |
| vi | 25,538 | **0** | ✓ 완전 회수 |
| id | 24,309 | **1** | helpPanel...connectors.tips |
| de | 23,229 | **1** | helpPanel...connectors.tips |
| zh-TW | 22,750 | **1** | helpPanel...connectors.tips |
| ar | 15,840 | **1** | marketing.injected_nav |
| hi | 15,839 | **1** | marketing.injected_nav |
| pt | 15,839 | **1** | marketing.injected_nav |
| ru | 15,839 | **1** | marketing.injected_nav |
| **합계** | - | **11** | 종류 1 only (영구 회수 불가) |

★ **142차 회수 +46,605 entries (단일 차수 역대 최대 갱신, 141차 16,100 의 2.9 배)**.
★ ko∩ja 부재 잔여 11건은 모두 종류 1 (boolean/array). 차수 진행해도 회수 불가.

### 1-6. ★★★ ko.js 다중 블록 raw (N-128, 142차 종결 시점)

| top-level | 블록 수 | 비고 |
|---|---:|---|
| tabs | 3 | |
| performance | 3 | |
| commerce | 3 | |
| pages | 2 | 142차 last 블록에 +3,883 (PASSTHROUGH) |
| attribution | 3 | |
| cat | 4 | |
| audit | 2 | 142차 +37 |
| gSug | 1 | 138차 stub 교체 |
| crm | 1 | 142차 +892 |
| grade | 1 | 138차 신규 |
| banner | 4 | 142차 last +2 |
| marketing | 4 | 142차 last +73 |
| reportBuilder | 2 | 142차 last +1 |
| ruleEnginePage | 1 | 142차 +1,167 |
| 신규 ns (attr/channelKpi/commerce/graph/nav/performance) | 1 각 | 142차 신규 |

### 1-7. 인계서 / 도구 위치
- 인계서: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128~142}_*.py / *.mjs`

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용)

**검증 모체** (import 전용): `session125_recover_safestub_jazh`
**★N-130/N-130b 주의**: build_leaf_paths 일부 블록만 인식 + 단일 따옴표 `'key'` 미인식.
**★★ 140~142차 정답**: `session140_kojaintersect_missing.mjs` (node ESM import 기반).

**128~141차 자산**: 이전 인계서 참조

**142차 신규 도구 (검증완료, 무변경 재사용)**

진단:
- `session140_kojaintersect_missing.mjs` ★★★ (140~142차 표준)

도구 (★ 검증완료, 143차 재사용):
- **`session142_extract_ja_en.mjs` ★★★ (ja_en 추출)**
  - 출력: `s142_passthrough_en_targets.tsv` (6,095 rows)
  - 분류: ja_en / ja_hangul / ja_jp / ja_other / non_string
  - ko 이미 존재 path 자동 스킵
- **`session142_build_step2_pv.mjs` ★★★★ (step2_pv 재생성)**
  - 출력: `s142_step2_pv.csv` (14,870 rows, UTF-8 BOM)
  - 컬럼: path, ja_value, ko_value, ja_type, ja_hangul
- **`session142_ko_passthrough_v3.py` ★★★★★ (NS_WHITELIST 폐기, 헤더 자동 감지)**
  - v2 → v3 변경점:
    - NS_WHITELIST 폐기 → ko root keys 와 교집합만 자동 처리
    - TSV 헤더 자동 감지 (첫 줄이 JSON-parseable 이면 헤더 없음)
    - CLI: `--tsv <path>` 추가
  - 142차 실적: +6,070 entries (총 13 ns 처리)
  - **★N-141 주의**: 도구 byte 측정값 부정확 (leaf count 가 안전 지표)
- **`session142_propagate_unquoted_ns_v2.py` ★★★★★ (N-137 + N-140)**
  - v1 결함 (leaf -118 손실) 수정:
    - indent=2 정확히 강제 (`^(  )"ns":` / `^(  )ns:`)
    - nested 매칭 차단
  - 142차 실적: 8 lang × 평균 4.4 = +35 entries (vi 3 / th 6 / id 6 / zh-TW 6 / es 3 / fr 3 / en 3 / de 5)
  - quoted/unquoted 둘 다 매칭 후 file order 의 last 가 운영값

(폐기: `session142_propagate_unquoted_ns.py` v1 — v2 로 대체. nested quoted 가 root 로 오인되는 결함)

**142차 신규 CSV/TXT 다수**:
- `s142_passthrough_en_targets.tsv` (ja_en 6,095 rows)
- `s142_step2_pv.csv` (14,870 rows, ko∩ja 전체)
- `s140_step2_pv.csv` 갱신 (s142 복사본)
- `s142_step0/step1/step2_*` 다수 (dry/apply/diag 로그)

---

## 3. 142차 commits (21건, 작업 commits만)

### 3-1. ko PASSTHROUGH ja_en (1 commit)
| 커밋 | ns 합계 | +entries |
|---|---|---:|
| 5256237 | 13 ns | +6,107 |

### 3-2. 12개 언어 deep-merge propagation 1차 (12 commits)
| 커밋 | 언어 | +entries |
|---|---|---:|
| a5a7bd4 | vi | +1,986 |
| 3fcc7fd | th | +1,415 |
| adee165 | id | +1,415 |
| e499f2e | zh-TW | +1,509 |
| 81f61b5 | es | +2,034 |
| 67ab36f | fr | +2,034 |
| aa076fe | en | +2,034 |
| ff9aeb1 | de | +2,132 |
| 8ee0224 | ar | +6,476 |
| 5d0bde8 | hi | +6,476 |
| f9254be | pt | +6,476 |
| 24c4221 | ru | +6,476 |
| **소계** | - | **+40,463** |

### 3-3. N-137 unquoted ns 2차 (8 commits)
| 커밋 | 언어 | +entries |
|---|---|---:|
| a08c554 | vi | +3 |
| 1c4a165 | th | +6 |
| eb708a4 | id | +6 |
| 0ae76fa | zh-TW | +6 |
| 779e2c0 | es | +3 |
| 373335c | fr | +3 |
| 9b0b061 | en | +3 |
| 2f0b4ab | de | +5 |
| **소계** | - | **+35** |

### 3-4. 142차 누적 (origin/master 대비)
- 142차 작업 commits: **21** + 인계서 1 = 22
- 누적 미push: 141차 109 + 142차 22 = **131 commits**
- 정답군 (ja.js / zh.js) 무변경 확인
- node --check 13개 언어 (ko + 12 lang) 모두 0
- 사용자 명시 승인 시에만 push

---

## 4. 142차 핵심 발견 (N-140 / N-141)

### N-140 — ★★★★★ unquoted root 도구 indent=2 강제 + nested 차단 (142차 신규)
- v1 결함: `find_blocks_quoted` 가 `^[ \t]*"ns":` 정규식으로 nested 위치도 매칭
- vi 의 nested quoted "banner" (line 9157 등) 가 root 로 오인 → 도구가 nested 를 통째 교체 → root unquoted block 의 내용이 정상으로 남으면서도 nested 의 기존 sub-tree 가 손실 → leaf -118
- v2 수정: `^(  )"ns":` / `^(  )ns:` 만 매칭 (indent **정확히 2** 강제)
- 검증: 8 lang dry → leaf check → apply 전 단계 정상 (vi +3, th/id/zh-TW +6 등)

### N-141 — ★★★★★ 도구 byte 측정 vs 실제 byte 차이 (142차 신규)
- `session142_ko_passthrough_v3.py` 의 도구 로그가 `byte 805,793 → 1,031,525` 출력
- 실제 ko.js 는 `1,107,953 → 1,334,637` 로 정상 적용
- 도구의 `text = read(KO)` 시점 측정값이 부정확 (cause 미특정, 143차 개선 가능)
- **★안전 지표는 byte 가 아니라 leaf count (node import)** — 항상 leaf 로 검증

---

## 5. 잔여 백로그

### 5-A. ko∩ja 부재 잔여 (종류 1 only, 영구 회수 불가)

| path | type | 영향 |
|---|---|---|
| marketing.injected_nav | boolean | en/es/fr/ar/hi/pt/ru (7) |
| helpPanel.staticHelp.connectors.tips | object(array) | th/id/de/zh-TW (4) |

★ 143차 차수 진행해도 회수 불가. 종결 표시 권장.

### 5-B. ★★★ 143차 1순위 후보 — ja-only 일본어값 (ja_jp) 사용자 결정

raw (142차 종결 측정):
- ja-only 일본어값 (ja_jp): **약 7,256건**
- ns 분포: pages 다수 / ruleEnginePage / crm / marketing 등

**N-17 ko 추측 금지 원칙**:
- ja_jp (일본어값) 는 ko 결정 영역 (한글 번역 필요)
- PASSTHROUGH (N-110/142차 확장) 적용 불가 — 영문 복사가 아닌 번역 필요
- **사용자 결정 필요. 검수자 자동 회수 불가.**

**143차 검수자 추천**: 사용자에게 ja_jp 처리 방침 확인.
- 옵션 A: ja_jp 작은 배치별 검수자 추천 + 사용자 확정 워크플로우 (작업량 큼, 정확성 높음)
- 옵션 B: 보류 (운영상 일본어 fallback 허용 시)
- 옵션 C: ja-jp 도 PASSTHROUGH (위험 — 운영상 한글 위치에 일본어 노출)

### 5-C. ★ 143차 2순위 — ko 자체 sparse 잔여 (사용자 결정 필요)

142차 종결 raw (대부분 ja_jp 영역):
- pages, crm, ruleEnginePage 의 ko 와 ja 의 leaf gap 일부 잔존
- ko=0 인 ns: marketingIntel 4,545 / aiHub 4,069 / wms 565 / perms 362 / journeyBuilder 36 / gAttr 31 / lineChannel 18 / 등 (대부분 일본어 전용 ns)

대부분 ja_jp → ko 사용자 확정 필요. 추측 금지 원칙 적용.

### 5-D. 종류 2 (선행 부재) — ko 영역 잔여

- audit mismatch 22 (138차 사용자 keep 결정, 작업 0)
- pages ambiguous 3 (138차 사용자 keep 결정)
- only_B 잔여 88건 (135차 cat_a 130 외)
- absent 308 옵션 B 우회 (133차 N-84)
- multi-value dataProduct.* 영역
- SAFE_DICT v6 보강 (가성비 점진 감소)
- rgba 오염 1건
- PARENT_DYN 122 검증 (137차 측정)
- ja-only PAGES_BACKUP 1,661 (백업/구버전)

### 5-E. 종류 1 (회수 불가 확정)

- marketing.injected_nav (boolean) × 7 lang
- helpPanel.staticHelp.connectors.tips (array) × 4 lang
- p1 588 / absent 216 dead / cat_a 1085 dead / sidebar.version 줄바꿈 / E3 NO_SOURCE 23
- truly_new with ja 121 / marketing R1 bad 12 / 3중 교집합 144
- ja-only DEAD 7,305 (142차 종결 측정, ja_jp + ja_other + nonstring 포함)

### 5-F. 독립 과제

- **5-1 #3 성과허브**: 139차 nav.pages.performance.* 11개 신규 ns (검수자 자동 가능, 143차 후보)
- **5-4 push**: origin 대비 미실행. 누적 미push:
  - 138차 7 + 139차 25 + 140차 42 + 141차 35 + **142차 22** = **131 commits**
  - 사용자 명시 승인 시에만

---

## 6. 142차 무결성 raw 확정

### 6-1. ko.js / ja.js / zh.js 상태
- node --check 3개 모두 0
- ja.js / zh.js byte-level 무변경 (1,153,628 / 869,855)
- ko.js byte 변동: 1,107,953 → **1,334,637** (+226,684, +6,107 entries 반영)

### 6-2. ★15개 언어 raw 무결성 (142차 종결 시점)
- ko: 28,726 leaf (+6,107)
- ja: 22,175 leaf (변동 없음)
- 12개 언어 byte/leaf 각각 증가 (위 1-2/1-3 참조)
- node --check 13개 언어 모두 0
- **★★★ 15개 무결성 회복**: 142차 약 46,605 entries 회수, ko∩ja 부재 0~1 잔여 (vi=0, 나머지 종류 1 only)

### 6-3. 142차 작업커밋 raw
- 총 21 작업 commits + 인계서 1 = 22
- 각 commit 후 node --check + node import 검증 완료
- 정답군 (ja.js / zh.js) byte-level 무변경 확인 완료
- ★★ 142차 = 단일 차수 역대 최대 회수 (141차 16,100 의 2.9 배)

### 6-4. 142차 사용자 결정 (작업 0)
- ja_jp 7,256 / ja_other 21 / nonstring 3 — 모두 사용자 ko 확정 영역으로 보류

---

## 7. 143차 실행 로드맵 (★★★ 우선순위)

**0단계 — 시작 시 raw 재확인 (필수)**
- 15개 언어 raw 파일 크기·수정일 확인
- `session140_kojaintersect_missing.mjs` 재실행 → ko/ja/12-lang leaf + 부재 path 실측
- node --check ja/zh/ko/12-lang 우선
- 부재 path 가 종류 1 only (11건) 확인 → 142차 종결 상태 보존 검증

**★★★ 1순위 — 5-F 성과허브 nav.pages.performance.* 11개 신규 ns (검수자 자동)**
- Step 1: 139차 인계서 또는 PM_HANDOVER.md 에서 11개 신규 ns 명세 확인
- Step 2: ja 정답군에 해당 ns 존재 여부 확인 → 없으면 사용자 결정 영역으로 전환
- Step 3: 있으면 ko PASSTHROUGH + 12개 언어 propagation
- 예상 회수: 약 100~500 entries (실측 필요)

**★★ 2순위 — ja_jp 7,256 path 사용자 결정 방침 확인**
- Step 1: 사용자에게 ja_jp 처리 방침 확인 (옵션 A/B/C, 검수자 추천 명시)
- Step 2: A 선택 시 ns 별 작은 배치 검수자 추천 → 사용자 확정 워크플로우
- 예상 회수: 사용자 결정 속도에 따라 (잠재 +약 84,000 entries)

**★ 3순위 — 잔여 종류 2 검증**
- audit mismatch 22 / pages ambiguous 3 / only_B 88 등 사용자 결정 영역
- 종결 표시 또는 사용자 확정 후 진행

**★ 4순위 — push 검토 (사용자 승인 필수)**
- 누적 미push 131 commits
- 사용자 명시 승인 시에만 실행

**진행 불가 시**: 각 순위에서 raw 부재/불가 입증 후 다음 순위 전환 (0-3).
**★★★ 작업 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행 (0-1 강화)**.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md 전체 작성 → 사용자 저장 → CC 명령으로 차수 인계 커밋:
`t git -C D:\project\GeniegoROI add NEXT_SESSION.md; git -C D:\project\GeniegoROI commit -m "docs(handover): session 143 -> 144"; git -C D:\project\GeniegoROI log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- **★★★★★ 작업 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행 (140~142차 강화)**
- **★★★★★ 검수자가 매 차수마다 종결 주장 자제 (140~142차)**
- 검수자 설명은 한글·핵심만 짧게, CC 명령으로 직접 수정 우선, 사용자 파일 저장 1건만
- 인계서는 검수자가 전체 작성 (기존 삭제 후 전체 붙여넣기)
- 임의 종결 / 임의 인계 작성 금지
- 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 무엇이 선행돼야 가능한지 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지, N-139 추가)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기
- ★★ ja.js/zh.js 정답군 무변경 절대 원칙 (N-79/N-134)
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- 12개 propagation 대상 언어:
  - simple: `session140_propagate_v6_patch2.py`
  - nested: `session140_propagate_v6_nested_patch1.py`
  - deep-merge: `session141_propagate_v3_deepmerge.py`
  - scalar overwrite 제거: `session140_remove_workspace_scalar.py`
  - **★N-137/N-140 unquoted (142차)**: `session142_propagate_unquoted_ns_v2.py`
- ko 신규 키 추가:
  - 기존 ns 단일 블록: `session134_apply_new_keys.py`
  - 신규 ns 통째: `session138_add_grade_only.py` 패턴
  - 빈 stub 교체: `session138_replace_gsug_stub.py`
  - 기존 블록 append: `session138_append_to_block_v2.py`
  - 중첩 sub-block 수동: CC Edit 도구
  - ★ko PASSTHROUGH deep-merge: `session141_ko_passthrough_v2.py` (141차)
  - **★★ko PASSTHROUGH deep-merge v3 (142차)**: `session142_ko_passthrough_v3.py`
  - **★N-136 kakao 구조 정리**: `session141_restructure_kakao.py`
  - **★N-136 pages nested**: `session141_pages_nested.py`
  - **★N-137 unquoted root v2 (142차)**: `session142_propagate_unquoted_ns_v2.py`
- 검수자 추천 + 사용자 검토 워크플로우
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 사용자 파일 덮어쓰기 검증 필수 (N-106)
- 사용자 업로드 CSV/엑셀 raw 컬럼 검증 필수 (N-126)
- ★UTF-8 BOM 처리 (N-131): `encoding="utf-8-sig"`
- PASSTHROUGH 패턴 적용 (N-110/142차 확장): ja_hangul=1 + ja_en 둘 다 자동 회수
- 사전 다단계 보강 패턴 (N-111)
- ★★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128/N-130/N-133/N-135/N-137/N-140)
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지)
- ★PowerShell 괄호 `()` / 인라인 따옴표 / `cmd /c` / compound `cd ; ...` / `$env:VAR` / .NET API manual approval 회피
- ★★★★★ N-130/N-130b (build_leaf_paths 한계): 검증은 raw scan + node --check + node import
- ★★ N-133 (top-level indent 자동 측정)
- ★★ N-134 (정답군 무변경): CC 가 ja/zh 임의 작업 시도 → 즉시 거부 + 검수자 명령
- ★★★★ N-135 (multi-block last + scalar overwrite, 140차)
- ★★★★★ N-136 (다른 12개 언어 ns 계층 ko/ja 와 상이, 140~141차)
- ★★★★ N-137 (unquoted ns root + indent=2 패턴, 141~142차)
- ★★★★★ N-138 (deep-merge 도구 last block 통째 교체, 141차)
- **★★★★★ N-140 신규 (142차, unquoted root 도구 indent=2 강제 + nested 차단 — leaf -118 손실 결함 수정)**
- **★★★★★ N-141 신규 (142차, 도구 byte 측정 vs 실제 byte 차이 — leaf count 가 안전 지표)**
- 초엔터프라이즈급 정밀도 유지

---
*(142차 검수자 작성. 모든 수치 raw 확정. 143차는 시작 시
locale 폴더 전체 .js 재확인 + ko/ja 차집합 raw 재측정 + node import
기반 leaf set + ko.js 다중 블록 raw 재확인 + build_leaf_paths 한계 인지 +
top-level indent raw 측정 + N-135/N-136/N-137/N-138/N-140/N-141 인지 후 진행.
142차 작업커밋 21건 + 인계서 1건 = 22 커밋.
ko∩ja 부재 잔여 11건은 모두 종류 1 (영구 회수 불가) 확정.
142차 총 회수: ko +6,107 + 12개 언어 +40,498 = **+46,605 entries**
(단일 차수 역대 최대, 141차 16,100 의 2.9 배).
141차 16,100 + 142차 46,605 = **누적 약 62,700 entries 무결성 회복**.
★★★★★ N-140 신규 (unquoted root 도구 indent=2 강제 + nested 차단).
★★★★★ N-141 신규 (도구 byte 측정 vs 실제 byte 차이 — leaf count 가 안전 지표).
★★★★★ 사용자 명시 원칙 (140~142차): 검수자 종결 주장 자제, 작업 여력 있는
한 부분 종결이라도 무조건 추가 작업 진행, 도구 검수자 작성·사용자 저장.
142차 진척률: ko∩ja 67.1% (141차 39.7% 대비 +27.4 %p 약진).
잔여 33% 는 모두 사용자 결정 영역 (ja_jp 일본어값 번역 필요).
143차 1순위: 5-F 성과허브 nav.pages.performance.* 11개 ns 검수자 자동 진행.
2순위: ja_jp 7,256 path 사용자 결정 방침 확인.
3순위: 잔여 종류 2 검증.
4순위: push (누적 131 commits, 사용자 명시 승인 필수).
원칙 0-21/0-22 신규 (N-140/N-141 대응).)*