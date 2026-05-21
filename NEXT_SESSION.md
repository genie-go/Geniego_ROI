# # GenieGoROI i18n 인계서 — 142차 시작점

> 본 문서는 141차 검수자가 전체 작성.
> 142차 검수자는 이 문서 전체를 신뢰 기반으로 삼되, 모든 수치·상태는
> 142차 시작 시 raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로
> 0/부재를 입증해야 보류가 정당. **★특히 locale 폴더 전체 .js 파일
> raw 확인 필수 (N-116) + ko.js 다중 블록 구조 raw 재확인 필수
> (N-128) + ★build_leaf_paths 한계 인지 필수 (N-130/N-130b) +
> ★top-level ns 들여쓰기 raw 측정 원칙 (N-133) +
> ★★ N-135 (multi-block last + scalar overwrite 패턴) +
> ★★★ N-136 (다른 12개 언어의 ns 계층 구조가 ko/ja 와 상이) +
> ★★★★ N-137 신규 (ns 명이 따옴표 없이 unquoted indent=2 패턴 — th/vi/id/zh-TW reportBuilder) +
> ★★★★★ N-138 신규 (deep-merge 도구의 last block 통째 교체 패턴 — sub-tree 보존) +
> ★★★★★ 사용자 강화 지시 — 검수자가 종결을 너무 자주 주장. 작업
> 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행.**

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★★★★★ 작업 여력 최대 활용 (132차 사용자 명시, 140차 강화, 141차 강화)**:
   - 검수자는 종결 제안을 함부로 하지 않는다.
   - 작업 여력 있으면 추가 회수·발굴·도구작성·apply 까지 끝까지 진행.
   - 인계서만 작성하다 차수 증가시키지 말 것.
   - 인계서 작성 전 반드시 사용자 승인을 받는다.
   - 인계서는 검수자가 전체 작성 (기존 전체 삭제 후 전체 붙여넣기).
   - 임의 종결·임의 인계 작성 금지.
2. **추측 보류 금지** (raw 측정 + node import 기반): N-116/N-117/N-128/N-130/N-130b/N-133/N-135/N-136/N-137/N-138 모두 동일.
3. **★불가작업 전환 원칙**: 진행 중인 특정 작업이 그 차수에 raw 로
   도저히 불가함이 입증되면, 거기 매달리지 말고 작업 여력이 있는
   한 다른 진행 가능한 작업으로 즉시 전환. 부분 종결이어도 무방.
4. **★불가의 2종 구분**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계. 차수 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가. 선행 충족되면 가능.
5. **★사용자가 ko 결정하는 영역 — 추측 절대 금지 (N-17/N-25/N-58/N-65/N-115/N-121)**:
   ko_fixed 자동 결정 금지. 단, 추천값 제시 후 사용자 확정 받는 워크플로우는 허용.
   **★141차 적용**: ja_hangul=1 (ja 값이 한글) 은 PASSTHROUGH 로 허용
   (결정이 아니라 복사). ja_en (영문값) / ja_jp (일본어값) 는 사용자 결정 영역.
6. **★CC 자동 명령 무력화 원칙**: 거부 응답 입력하지 않고, 검수자의 다음 `t` 명령으로 덮어쓰기.
   - **★N-127 시리즈 (PowerShell manual approval)**: a) 인라인 따옴표 충돌 → 도구 파일 우회, b) `cmd /c dir` → PowerShell 네이티브, c) `cd <path>; <cmd>` compound → 한 줄 cd 또는 `git -C`, d) `$env:VAR=...` → 도구 안에서 처리.
   - **★N-134**: CC 가 ja.js/zh.js 임의 작업 시도 → 즉시 거부 + 검수자 명령 덮어쓰기.
   - **★N-139 (141차 신규)**: CC 가 검증완료 .py 자체 수정 시도 → `3` 거부 + 검수자가 PowerShell 명령으로 직접 수정.
7. **★ko/다른 언어 안전 apply 도구 패턴 (135~141차 실증)**:
   - ko 기존 path 값 수정: `session132_apply_ko_only.py`
   - ko 신규 키 (기존 namespace, parent 단일 블록): `session134_apply_new_keys.py --csv <path>`
   - ko 신규 namespace 통째: `session136_apply_v2.py` 또는 `session138_add_grade_only.py` 패턴
   - **★ko 빈 stub 교체**: `session138_replace_gsug_stub.py` (gSug 패턴)
   - **★ko 기존 블록 append**: `session138_append_to_block_v2.py --ns <ns> [--block N]`
   - 중첩 nested sub-block 수동: CC Edit 도구 (helpPanel 케이스)
   - **★ko PASSTHROUGH deep-merge (141차 신규, N-138)**:
     `session141_ko_passthrough_v2.py --ns <ns> [--apply]`
     입력: `s141_passthrough_targets.tsv`
   - **★다른 12개 언어 simple propagation**:
     `session140_propagate_v6_patch2.py --lang <lg> [--apply]`
   - **★다른 12개 언어 nested propagation**:
     `session140_propagate_v6_nested_patch1.py --lang <lg> [--apply]`
   - **★다른 12개 언어 deep-merge propagation (141차 신규)**:
     `session141_propagate_v3_deepmerge.py --lang <lg> [--apply]`
   - **★다른 12개 언어 scalar overwrite 제거**:
     `session140_remove_workspace_scalar.py --lang <lg> [--apply]`
   - **★N-136 kakao 구조 정리 (141차 신규)**:
     `session141_restructure_kakao.py --lang <lg> [--apply]`
   - **★N-136 pages nested sub-ns 추가 (141차 신규)**:
     `session141_pages_nested.py --lang <lg> [--apply]`
   - **★N-137 unquoted indent root 처리 (141차 신규)**:
     `session141_reportbuilder_unquoted.py` 패턴
   - ★ja.js/zh.js (정답군) 절대 propagation 금지 (N-79/N-134)
8. **★only_b 분류 신뢰 금지 (N-93)**: 코드 호출 grep 검증 필수.
9. **★PASSTHROUGH 패턴 (N-110, 141차 ko 적용)**:
   ja_hangul=1 (ja 값이 한글) → ko 결정 아니라 값 복사. ko 에 자동 회수 가능.
   141차 실적: 1,770 path ko 회수 + 12개 언어로 propagation.
10. **★사전 다단계 보강 (N-111)**: v1→v6 패턴 단계적 상승.
11. **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시)**:
    배포 운영 중. ko 신규 키 추가 시 → 14개 언어 모두 동일 path 보장 필수.
    **★141차 적용**: ko PASSTHROUGH 1,770 후 12개 언어 propagation 동시 진행.
12. **★★★★★ ko/ja 구조 raw 재확인 원칙 (N-117)**:
    141차 종결 시점: ko 22,619 / ja 22,175 / 공통 8,800 / ko-only 13,819 / ja-only 13,375.
    ★ node import (정답) 기준.
13. **★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128/N-133/N-135/N-137)**:
    정규식 단독 신뢰 금지. raw 검증 필수.
    dry-run 안전검사: `delta == applied`, `missing == 0`, `unexpected == 0` 셋 다 PASS 강제.
14. **★★★★★ ko.js 다중 블록 raw 확인 원칙 (N-128)**:
    동일 namespace 가 여러 블록에 중복 존재. 141차 raw:
    tabs 3 / performance 3 / commerce 3 / pages 2 / attribution 3 / cat 4 /
    audit 2 / gSug 1 / crm 1 / banner 4 / marketing 4 / reportBuilder 2.
15. **★★★★★ build_leaf_paths 한계 인지 원칙 (N-130/N-130b)**:
    python walker 부정확. **node ESM import 으로 leaf set 추출이 정답**.
    `session140_kojaintersect_missing.mjs` 가 표준.
16. **★top-level ns 들여쓰기 raw 자동 측정 원칙 (N-133)**:
    141차 raw 측정: 15개 언어 모두 = 2 spaces (실측 동일).
    future-proof 로 도구는 `export default {[ \t]*\n([ \t]+)` 정규식으로 자동 측정.
17. **★★★★ N-135 (140차) — multi-block last 선택 + scalar overwrite 제거**:
    - multi-block 시 last 블록 선택 (JS 표준: 마지막이 이김).
    - scalar 후행 entry 가 object 블록 덮어쓰기 → 별도 제거 도구.
18. **★★★★★ N-136 (140~141차) — 다른 언어 ns 계층 ko/ja 와 상이**:
    - 141차 해결: th/id/zh-TW kakao 구조 정리 → +315 entries 회수.
    - 141차 해결: th/id/zh-TW/vi pages sub-ns 추가 → +30 entries.
19. **★★★★ N-137 신규 (141차) — unquoted ns root + indent=2 패턴**:
    - th/vi/id/zh-TW 의 `reportBuilder:` 가 따옴표 없이 indent=2.
    - 정규식 `^[ \t]*reportBuilder:\s*\{` 사용. 내부 entries indent=4.
    - 141차 해결: reportBuilder.downloadExcel 4 entries 회수.
20. **★★★★★ N-138 신규 (141차) — deep-merge 도구 last block 통째 교체 패턴**:
    - ko_passthrough_v2 / propagate_v3_deepmerge 의 핵심 로직.
    - node import 으로 ns sub-tree 통째 가져오기 → 새 tree 와 deep merge (기존 우선)
      → last top-level 블록 통째 교체.
    - first/middle 블록은 손대지 않음. multi-block JS 표준 (last 이김) 활용.
    - 검증: 기존 sub-tree 손실 0, 충돌 0, leaf delta 정확.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피: `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; code <log>`
- 명령 연결은 `;` 만 (`&&`/`||` 금지).
- PowerShell 괄호 `()` / 인라인 따옴표 / `cmd /c` / compound `cd ; ...` / `$env:VAR` manual approval 회피.
- CC 승인: `1.Yes/2.allow all/3.No` → `2`, `1.Yes/2.No` → `1`. 검증완료 .py 자체수정 시도 → `3` (N-139).
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기.
- 검수자 설명은 한글·핵심만 짧게. **★사용자 강화 (137~141차)**:
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
- ★다언어 propagation 도구는 node import 검증 필수 (N-130b/N-135/N-138).
- **★★★★★ 종결 제안 자제**: 검수자는 종결 제안을 자주 하지 않는다. 사용자가
  명시 지시하지 않는 한 작업 여력 활용 + 부분 종결이라도 진행.

---

## 1. 프로젝트 좌표

### 1-1. locale 디렉토리
`D:\project\GeniegoROI\frontend\src\i18n\locales\` — **15개 언어 .js 파일**

### 1-2. 15개 언어 raw 현황 (141차 종결 시점, byte)

| 그룹 | 언어 | byte | 수정일 | leaf | 역할 |
|---|---|---:|---|---:|---|
| **정답군** | ja.js | 1,153,628 | 5/20 | 22,175 | ★ 최대 / 정답 출처 / 무변경 |
| | zh.js | 869,855 | 5/20 | - | 보조 정답 / 무변경 |
| **회수 작업** | ko.js | 1,107,953 | 5/21 (141차) | 22,619 | leaf +1,770 |
| **5/14군** | en.js | 1,045,481 | 5/21 | 23,780 | +1,731 |
| | es.js | 1,047,346 | 5/21 | 23,775 | +1,731 |
| | fr.js | 1,045,449 | 5/21 | 23,775 | +1,731 |
| **5/16군** | th.js | 1,197,868 | 5/21 | 22,939 | +1,142 |
| | vi.js | 1,043,469 | 5/21 | 23,579 | +1,723 |
| | id.js | 1,000,988 | 5/21 | 22,918 | +1,142 |
| | de.js | 935,740 | 5/21 | 21,122 | +1,212 |
| | zh-TW.js | 921,579 | 5/21 | 21,265 | +1,143 |
| **5/17군** | ar.js | 631,302 | 5/21 | 9,792 | +1,769 |
| | hi.js | 637,069 | 5/21 | 9,791 | +1,769 |
| | pt.js | 622,129 | 5/21 | 9,791 | +1,769 |
| | ru.js | 631,690 | 5/21 | 9,791 | +1,769 |

★ 142차 시작 시 정확한 byte raw 재측정 필수.

### 1-3. leaf count raw (141차 종결, node import 기준)
- ko: 22,619 / ja: 22,175 / zh: 미측정 (정답군 보존)
- en: 23,780 / es: 23,775 / fr: 23,775
- th: 22,939 / vi: 23,579 / id: 22,918 / de: 21,122 / zh-TW: 21,265
- ar: 9,792 / hi/pt/ru: 9,791 각

### 1-4. ★ko/ja 차집합 raw (141차 종결, node import)

| 항목 | 수치 |
|---|---:|
| ko leaf | **22,619** |
| ja leaf | **22,175** |
| ko ∩ ja | **8,800** |
| ko-only | 13,819 |
| ja-only | 13,375 |

### 1-5. ★★★ 141차 종결 시점 ko∩ja 부재 path raw (node 실측)

| 언어 | leaf | ko∩ja 부재 | 종류 1 (회수 불가) |
|---|---:|---:|---:|
| en | 23,780 | **1** | marketing.injected_nav (boolean) |
| es | 23,775 | **1** | marketing.injected_nav |
| fr | 23,775 | **1** | marketing.injected_nav |
| th | 22,939 | **1** | helpPanel...connectors.tips (array) |
| vi | 23,579 | **0** | ✓ 완전 회수 |
| id | 22,918 | **1** | helpPanel...connectors.tips |
| de | 21,122 | **1** | helpPanel...connectors.tips |
| zh-TW | 21,265 | **1** | helpPanel...connectors.tips |
| ar | 9,792 | **1** | marketing.injected_nav |
| hi | 9,791 | **1** | marketing.injected_nav |
| pt | 9,791 | **1** | marketing.injected_nav |
| ru | 9,791 | **1** | marketing.injected_nav |
| **합계** | - | **11** | 종류 1 only (회수 불가 확정) |

★ **141차 회수 약 16,100 entries (단일 차수 역대 최대 성과)**.
★ ko∩ja 부재 잔여 11건은 모두 종류 1 (boolean/array). 차수 진행해도 회수 불가.

### 1-6. ★★★ ko.js 다중 블록 raw (N-128, 141차 종결 시점)

| top-level | 블록 수 | 비고 |
|---|---:|---|
| tabs | 3 | |
| performance | 3 | |
| commerce | 3 | |
| pages | 2 | 141차 last 블록에 +556 |
| attribution | 3 | |
| cat | 4 | |
| audit | 2 | |
| gSug | 1 | 138차 stub 교체 |
| crm | 1 | 141차 +1,044 |
| grade | 1 | 138차 신규 |
| banner | 4 | 141차 last +7 |
| marketing | 4 | 141차 last +1 |
| reportBuilder | 2 | 141차 last +1 |
| ruleEnginePage | 1 | 141차 +161 |

### 1-7. 인계서 / 도구 위치
- 인계서: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128~141}_*.py / *.mjs`

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용)

**검증 모체** (import 전용): `session125_recover_safestub_jazh` (build_leaf_paths, _ko_suspect, KO_CONTAMINATED 등)
**★N-130/N-130b 주의**: build_leaf_paths 일부 블록만 인식 + 단일 따옴표 `'key'` 미인식.
**★★ 140~141차 정답**: `session140_kojaintersect_missing.mjs` (node ESM import 기반).

**128~140차 자산**: 이전 인계서 참조

**141차 신규 도구 (검증완료, 무변경 재사용)**

진단:
- `session140_kojaintersect_missing.mjs` ★★★ (140차 자산, 141차에도 표준 사용)

도구 (★ 검증완료, 142차 재사용):
- **`session141_restructure_kakao.py` ★★★ (N-136 kakao 구조 정리)**
  - 외부 입력: 없음 (ja.js 의 kakao 블록 직접 추출)
  - 대상: th/id/zh-TW (각 +105)
  - 로직: ja 의 indent=2 kakao 블록 추출 → 대상의 export default 마지막 `};` 직전 indent=2 로 삽입
  - 검증: node --check + node import root.kakao = object 105 keys
- **`session141_pages_nested.py` ★★★ (N-136 pages sub-ns 추가)**
  - 대상: th/id/zh-TW/vi 의 pages 안 누락 sub-ns 추가
  - 로직: ja.pages.<sub> 값 가져와 last top-level pages 블록 안에 indent=4 nested 삽입
  - dry/apply 분리, raw scan verify
- **`session141_ko_passthrough_v2.py` ★★★★★ (N-110 + N-138 deep-merge)**
  - 외부 입력: `s141_passthrough_targets.tsv` (path \t JSON-quoted value, 1,770 rows)
  - 처리: node import 으로 ko ns sub-tree 통째 가져오기 → 새 tree deep merge (기존 우선)
    → last top-level 블록 통째 교체
  - 안전: 기존 sub-tree 0 손실, 충돌 시 기존 우선, ns whitelist
  - 검증: 141차 6 ns 모두 PASS (marketing 1, reportBuilder 1, banner 7, ruleEnginePage 161, crm 1044, pages 556)
- **`session141_propagate_v3_deepmerge.py` ★★★★★ (다른 12개 언어 deep-merge propagation)**
  - 외부 입력: `s140_step1_<lang>_miss.txt` + `s140_step2_pv.csv`
  - 처리: ko_passthrough_v2 와 동일 패턴 (deep merge + last block 교체)
  - 한계: unquoted indent=2 ns 미매칭 (N-137 → 별도 도구)
- **`session141_reportbuilder_unquoted.py` ★ (N-137 unquoted indent=2 root 처리)**
  - 정규식 `^[ \t]*reportBuilder:\s*\{` 매칭 (따옴표 없음 + indent flexible)
  - 내부 entries indent=4 로 삽입
  - 141차: th/vi/id/zh-TW reportBuilder.downloadExcel +4

(폐기: `session141_ko_passthrough.py` v1 — v2 로 대체. tree-merge 머지 시 기존 sub-tree overwrite 결함)

**141차 신규 CSV/TXT 다수**:
- `s141_passthrough_targets.tsv` (ko 회수 대상 1,770 rows)
- `s141_step19_pv.csv` (8,800 rows, ko∩ja 갱신 후 PV)
- `s141_step19_<lang>_miss.txt` (12개, 각 언어 부재)
- `s140_step2_pv.csv` + `s140_step1_<lang>_miss.txt` (141차 갱신 복사본)
- `s141_*` 다수 (dry/apply/diag 로그)

---

## 3. 141차 commits (34건, 작업 commits만)

### 3-1. kakao 구조 정리 (3 commits, N-136)
| 커밋 | 언어 | +entries |
|---|---|---:|
| c01b48e | th | +105 |
| 78cb838 | id | +105 |
| 868778a | zh-TW | +105 |

### 3-2. pages nested sub-ns (4 commits, N-136 변형)
| 커밋 | 언어 | +entries | sub-ns |
|---|---|---:|---|
| 10860da | th | +6 | aiPolicy/approvals/mappingRegistry |
| 18414df | id | +6 | aiPolicy/approvals/mappingRegistry |
| b9c7741 | vi | +4 | approvals/mappingRegistry |
| 94a0f37 | zh-TW | +14 | aiPolicy/approvals/mappingRegistry/influencer/settlements/connectors/admin |

### 3-3. ko PASSTHROUGH (6 commits, N-110 + N-138)
| 커밋 | ns | +entries |
|---|---|---:|
| fa83316 | marketing | +1 |
| 3567c1e | reportBuilder | +1 |
| 7308e7b | banner | +7 |
| 420f379 | ruleEnginePage | +161 |
| 6fdd431 | crm | +1,044 |
| f316995 | pages | +556 |
| **소계** | - | **+1,770** |

### 3-4. ko passthrough 후 12개 언어 1차 propagation (12 commits)
| 커밋 | 언어 |
|---|---|
| cd2fb0f | ar (+1,769) |
| e970ea9 | hi (+1,769) |
| d500250 | pt (+1,769) |
| 9c9ac98 | ru (+1,769) |
| 539487b | en |
| ed5a57f | es |
| 619b6ef | fr |
| 5fe9675 | de |
| 0e765a8 | th |
| 1322423 | vi |
| 73a598d | id |
| 35f48d9 | zh-TW |

### 3-5. deep-merge propagation 잔여 회수 (8 commits, N-138)
| 커밋 | 언어 | +entries |
|---|---|---:|
| c17e0d2 | th | +90 (ruleEnginePage) |
| 08bd018 | id | +90 |
| f94334d | en | +779 (crm 등) |
| 4975636 | es | +779 |
| 8165e13 | fr | +779 |
| b8acb58 | vi | +775 |
| - | zh-TW | (포함 commit) |
| - | de | (포함 commit) |

### 3-6. reportBuilder unquoted (1 commit, N-137)
| 커밋 | 대상 | +entries |
|---|---|---:|
| b247b61 | th/vi/id/zh-TW | +4 (각 downloadExcel) |

### 3-7. 141차 누적 (origin/master 대비)
- 141차 작업 commits: **34** + 인계서 1 = 35
- 누적 미push: 138차 7 + 139차 25 + 140차 42 + 141차 35 = **109 commits**
- 정답군 (ja.js / zh.js) 무변경 확인
- node --check 13개 언어 (ko + 12 lang) 모두 0
- 사용자 명시 승인 시에만 push

---

## 4. 141차 핵심 발견 (N-137 / N-138)

### N-137 — ★★★★ unquoted ns root + indent=2 패턴 (141차 신규)
- 일부 언어의 root key 가 따옴표 없이 작성되어 표준 정규식 `^( {2})"ns":\s*\{` 미매칭.
- th/vi/id/zh-TW 의 `reportBuilder:` (indent=2, unquoted) 사례.
- 해결: 정규식 `^[ \t]*<ns>:\s*\{` 사용 (indent flexible + unquoted).
- 내부 entries 의 indent 도 raw 측정 필요 (대상 파일에서 4-space 였음).

### N-138 — ★★★★★ deep-merge 도구 last block 통째 교체 패턴 (141차 신규)
- ko_passthrough_v1 (140차 패턴): tree-merge 시 새 entries 의 root path 가 기존 sub-key 와 같으면 **기존 sub-tree 통째 덮어쓰기 버그**. 예: crm.email 156 keys 가 새 객체로 교체되어 2 keys 만 남음.
- ko_passthrough_v2 (141차): node import 으로 기존 sub-tree 통째 가져오기 → 새 tree 와 deep merge (기존 우선) → last top-level 블록 통째 교체.
- 검증: existing leaves 손실 0, 새 entries 정확히 추가, JS 표준 (multi-block 마지막 이김) 활용.
- 다른 12개 언어 propagation 에도 동일 패턴 적용: `session141_propagate_v3_deepmerge.py`.
- 141차 실적: ko +1,770 + 12개 언어 약 14,330 entries.

---

## 5. 잔여 백로그

### 5-A. ko∩ja 부재 잔여 (종류 1 only, 회수 불가 확정)

| path | type | 영향 |
|---|---|---|
| marketing.injected_nav | boolean | en/es/fr/ar/hi/pt/ru (7) |
| helpPanel.staticHelp.connectors.tips | object(array) | th/id/de/zh-TW (4) |

★ 142차 차수 진행해도 회수 불가. 종결 표시 권장.

### 5-B. ★★★ 142차 1순위 후보 — ja-only 영문 PASSTHROUGH 검토

raw (141차 측정):
- ja-only 영문 path: **5,727건**
- ns 분포: pages 3,647 / ruleEnginePage 1,064 / crm 878 / marketing 89 / audit 37 등

**N-17 ko 추측 금지 원칙과 충돌**:
- ja 영문 → ko 영문 그대로 적용은 "ko 결정" 영역
- PASSTHROUGH (N-110) 는 ja_hangul=1 에만 적용 (한글 복사). ja_en 은 별개.
- **사용자 명시 승인 필요**.

**142차 검수자 추천**: 사용자에게 ja_en 5,727 path 의 ko 처리 방침 확인.
- 옵션 A: 영문 그대로 ko 에 자동 회수 (PASSTHROUGH 확장)
- 옵션 B: 사용자 ko 확정 (작업량 큼)
- 옵션 C: 보류 (운영 상 영문 표시 허용 시)

### 5-C. ★ 142차 2순위 — ko 자체 대량 sparse (사용자 결정 필요)

141차 raw (node import):
- pages: ko 287 / ja 6,830 gap 6,543 (영문/일본어 혼합)
- crm: ko 1,345 / ja 5,508 gap 4,163 (141차 +1,044 진행)
- ruleEnginePage: ko 293 / ja 2,784 gap 2,491 (141차 +161 진행)
- audit: ko 52 / ja 183 gap 131
- ko=0 인 ns: marketingIntel 4,545 / aiHub 4,069 / wms 565 / perms 362 / journeyBuilder 36 / gAttr 31 / lineChannel 18 / 등 (대부분 일본어 전용)

대부분 ja_jp (일본어값) → ko 사용자 확정 필요. 추측 금지 원칙 적용.

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
- ja-only DEAD 13,427 (137차 측정, 141차 후 13,375)

### 5-F. 독립 과제

- **5-1 #3 성과허브**: 139차 nav.pages.performance.* 11개 신규 ns
- **5-4 push**: origin 대비 미실행. 누적 미push:
  - 138차 7 + 139차 25 + 140차 42 + **141차 35** = **109 commits**
  - 사용자 명시 승인 시에만

---

## 6. 141차 무결성 raw 확정

### 6-1. ko.js / ja.js / zh.js 상태
- node --check 3개 모두 0
- ja.js / zh.js byte-level 무변경 (1,153,628 / 869,855)
- ko.js byte 변동: 1,062,430 → **1,107,953** (+45,523, +1,770 entries 반영)

### 6-2. ★15개 언어 raw 무결성 (141차 종결 시점)
- ko: 22,619 leaf (node, +1,770)
- ja: 22,175 leaf (변동 없음)
- 12개 언어 byte/leaf 각각 증가 (위 1-2/1-3 참조)
- node --check 13개 언어 모두 0
- **★15개 무결성 회복**: 141차 약 16,100 entries 회수, ko∩ja 부재 0~1 잔여 (vi=0, 나머지 종류 1 only)

### 6-3. 141차 작업커밋 raw
- 총 34 작업 commits + 인계서 1 = 35
- 각 commit 후 node --check + node import 검증 완료
- 정답군 (ja.js / zh.js) byte-level 무변경 확인 완료

### 6-4. 141차 사용자 결정 (작업 0)
- ja_en 5,727 / ja_jp 7,255 / ja_other 5,972 — 모두 사용자 ko 확정 영역으로 보류

---

## 7. 142차 실행 로드맵 (★★★ 우선순위)

**0단계 — 시작 시 raw 재확인 (필수)**
- 15개 언어 raw 파일 크기·수정일 확인
- `session140_kojaintersect_missing.mjs` 재실행 → ko/ja/12-lang leaf + 부재 path 실측
- node --check ja/zh/ko/12-lang 우선

**★★★ 1순위 — ja_en 5,727 path PASSTHROUGH 사용자 승인**
- Step 1: 사용자에게 ja_en 처리 방침 확인 (옵션 A/B/C, 검수자 추천 명시)
- Step 2: 승인 시 `session141_ko_passthrough_v2.py` 패턴 응용
- Step 3: PASSTHROUGH 후 12개 언어 propagation 동시 진행 (N-116)
- 예상 회수: 5,727 entries × 12 lang = 약 68,000+ entries

**★★ 2순위 — ko 자체 sparse 잔여 사용자 확정**
- Step 1: 가장 큰 ns (pages 6,543 / crm 4,163 등) 작은 배치로 분할
- Step 2: 검수자 추천값 제시 → 사용자 확정 워크플로우
- 예상 회수: 사용자 결정 속도에 따라

**★ 3순위 — 잔여 종류 2 검증**
- audit mismatch 22 / pages ambiguous 3 / only_B 88 등 사용자 결정 영역
- 종결 표시 또는 사용자 확정 후 진행

**진행 불가 시**: 각 순위에서 raw 부재/불가 입증 후 다음 순위 전환 (0-3).
**★★★ 작업 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행 (0-1 강화)**.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md 전체 작성 → 사용자 저장 → CC 명령으로 차수 인계 커밋:
`t git -C D:\project\GeniegoROI add NEXT_SESSION.md; git -C D:\project\GeniegoROI commit -m "docs(handover): session 142 -> 143"; git -C D:\project\GeniegoROI log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- **★★★★★ 작업 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행 (140~141차 강화)**
- **★★★★★ 검수자가 매 차수마다 종결 주장 자제 (140~141차)**
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
  - deep-merge (141차 신규): `session141_propagate_v3_deepmerge.py`
  - scalar overwrite 제거: `session140_remove_workspace_scalar.py`
- ko 신규 키 추가:
  - 기존 ns 단일 블록: `session134_apply_new_keys.py`
  - 신규 ns 통째: `session138_add_grade_only.py` 패턴
  - 빈 stub 교체: `session138_replace_gsug_stub.py`
  - 기존 블록 append: `session138_append_to_block_v2.py`
  - 중첩 sub-block 수동: CC Edit 도구
  - **★ko PASSTHROUGH deep-merge (141차)**: `session141_ko_passthrough_v2.py`
  - **★N-136 kakao 구조 정리 (141차)**: `session141_restructure_kakao.py`
  - **★N-136 pages nested (141차)**: `session141_pages_nested.py`
  - **★N-137 unquoted root (141차)**: `session141_reportbuilder_unquoted.py` 패턴
- 검수자 추천 + 사용자 검토 워크플로우
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 사용자 파일 덮어쓰기 검증 필수 (N-106)
- 사용자 업로드 CSV/엑셀 raw 컬럼 검증 필수 (N-126)
- ★UTF-8 BOM 처리 (N-131): `encoding="utf-8-sig"`
- PASSTHROUGH 패턴 적용 (N-110): ja_hangul=1 은 ko 값 그대로
- 사전 다단계 보강 패턴 (N-111)
- ★★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128/N-130/N-133/N-135/N-137)
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지)
- ★PowerShell 괄호 `()` / 인라인 따옴표 / `cmd /c` / compound `cd ; ...` / `$env:VAR` manual approval 회피
- ★★★★★ N-130/N-130b (build_leaf_paths 한계): 검증은 raw scan + node --check + node import
- ★★ N-133 (top-level indent 자동 측정)
- ★★ N-134 (정답군 무변경): CC 가 ja/zh 임의 작업 시도 → 즉시 거부 + 검수자 명령
- ★★★★ N-135 (multi-block last + scalar overwrite, 140차)
- ★★★★★ N-136 (다른 12개 언어 ns 계층 ko/ja 와 상이, 140~141차)
- **★★★★ N-137 신규 (141차, unquoted ns root + indent=2 패턴)**
- **★★★★★ N-138 신규 (141차, deep-merge 도구 last block 통째 교체 패턴)**
- **★★★★★ N-139 신규 (141차, CC 가 검증완료 .py 자체수정 시도 → `3` 거부 + 검수자 직접 수정)**
- 초엔터프라이즈급 정밀도 유지

---
*(141차 검수자 작성. 모든 수치 raw 확정. 142차는 시작 시
locale 폴더 전체 .js 재확인 + ko/ja 차집합 raw 재측정 + node import
기반 leaf set + ko.js 다중 블록 raw 재확인 + build_leaf_paths 한계 인지 +
top-level indent raw 측정 + N-135/N-136/N-137/N-138/N-139 인지 후 진행.
141차 작업커밋 34건 + 인계서 1건 = 35 커밋.
ko∩ja 부재 557 path 중 546 회수 (98.0%) — 잔여 11건은 종류 1 (회수 불가) 확정.
141차 총 회수: ko +1,770 + 12개 언어 약 14,330 = **약 16,100 entries** (단일 차수 역대 최대).
138차 +147 + 140차 +8,143 + 141차 +16,100 = 누적 무결성 회복.
★★★★ N-137 신규 (unquoted ns root + indent=2 패턴).
★★★★★ N-138 신규 (deep-merge 도구 last block 통째 교체 — sub-tree 보존).
★★★★★ N-139 신규 (CC 자체수정 거부 + 검수자 직접 수정).
★★★★★ 사용자 명시 원칙 (140~141차): 검수자 종결 주장 자제, 작업 여력 있는
한 부분 종결이라도 무조건 추가 작업 진행, 도구 검수자 작성·사용자 저장.
142차 1순위: ja_en 5,727 path PASSTHROUGH 사용자 승인 검토 (예상 +68,000 entries).
2순위: ko 자체 sparse 잔여 사용자 확정.
3순위: 잔여 종류 2 검증.
원칙 0-19/0-20 신규 (N-137/N-138/N-139 대응).)*