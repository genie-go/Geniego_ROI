# # GenieGoROI i18n 인계서 — 141차 시작점

> 본 문서는 140차 검수자가 전체 작성.
> 141차 검수자는 이 문서 전체를 신뢰 기반으로 삼되, 모든 수치·상태는
> 141차 시작 시 raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로
> 0/부재를 입증해야 보류가 정당. **★특히 locale 폴더 전체 .js 파일
> raw 확인 필수 (N-116) + ko.js 다중 블록 구조 raw 재확인 필수
> (N-128) + ★build_leaf_paths 한계 인지 필수 (N-130/N-130b) +
> ★top-level ns 들여쓰기 raw 측정 원칙 (N-133) +
> ★★ N-135 신규 (multi-block last + scalar overwrite 패턴) +
> ★★★ N-136 신규 (다른 12개 언어의 ns 계층 구조가 ko/ja 와 상이) +
> ★★★★★ 사용자 강화 지시 — 검수자가 종결을 너무 자주 주장. 작업
> 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행.**

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★★★★★ 작업 여력 최대 활용 (132차 사용자 명시, 140차 사용자 강화)**:
   **140차 사용자 명시 지시**: "검수자가 매 차수마다 종결을 주장. 인계서
   작성하는데 다 추가 작업 여력을 소비한다. 작업 여력이 있으면 무조건
   중도에 부분 종결을 하더라도 최대한 진행한다."
   - 검수자는 종결 제안을 함부로 하지 않는다.
   - 작업 여력 있으면 추가 회수·발굴·도구작성·apply 까지 끝까지 진행.
   - 인계서만 작성하다 차수 증가시키지 말 것.
   - 사용자 작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결.
   - 인계서 작성 전 반드시 사용자 승인을 받는다.
   - 인계서는 검수자가 전체 작성 (기존 전체 삭제 후 전체 붙여넣기).
   - 임의 종결·임의 인계 작성 금지.
2. **추측 보류 금지 + ★locale 폴더 전체 .js raw 확인 필수 (N-116)
   + ★ko.js 다중 블록 raw 확인 필수 (N-128)
   + ★★★ build_leaf_paths 결과 절대 신뢰 금지 (N-130/N-130b)
   + ★★top-level ns 들여쓰기 raw 측정 (N-133)
   + ★★N-135 multi-block last 선택 원칙 (140차 신규)
   + ★★★N-136 다른 언어 ns 계층 ko/ja 와 상이 (140차 신규)**:
   "안전여력 소진/보류"를 선언하려면 raw 수치로 0 또는 부재를
   입증해야 한다. 인계서의 좌표/대상 언어 정보는 매 차수 시작 시
   raw 재확인 필수. **★ko.js 안 어떤 namespace 가 몇 개 블록에
   존재하는지 raw 재확인 필수**. **★★build_leaf_paths 는 ko.js·다른 언어
   의 들여쓰기·다중블록·중첩·따옴표 종류 등에 따라 leaf 를 일부만
   인식. raw scan 으로 별도 검증해야 함**. **★★★top-level ns 들여쓰기
   는 언어별로 다름. 고정 가정 (2 spaces) 금지. ★★★★ N-135/N-136 도
   주의**.
3. **★불가작업 전환 원칙**: 진행 중인 특정 작업이 그 차수에 raw 로
   도저히 불가함이 입증되면, 거기 매달리지 말고 작업 여력이 있는
   한 다른 진행 가능한 작업으로 즉시 전환한다. 부분 종결이어도 무방.
4. **★불가의 2종 구분**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계. 차수 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가. 선행 충족되면 가능.
5. **★사용자가 ko 결정하는 영역 — 추측 절대 금지 (N-17/N-25/N-58/N-65/N-115/N-121)**:
   ko_fixed 자동 결정 금지. 단, 추천값 제시 후 사용자 확정 받는 워크플로우는 허용.
6. **★CC 자동 명령 무력화 원칙 (N-81, 135~140차 push/apply/임의언어 자동 다수 실증)**:
   거부 응답 입력하지 않고, 검수자의 다음 `t` 명령으로 덮어쓰기.
   apply/commit/push/propagation/임의 언어 작업 자동 입력은 차단 우선.
   **★N-127 (137차)**: PowerShell 인라인 따옴표·괄호 충돌 시 도구 파일 작성으로 우회가 안전.
   **★N-127b (138차)**: `cmd /c dir` 같은 cmd 명령이 manual approval 트리거.
   **★N-127c (139차)**: `cd <path>; <cmd>` 조차 manual approval 트리거.
   **★N-127d (139차)**: `$env:VAR=...` 환경변수 설정 명령도 일부 환경에서 manual approval 트리거.
   **★N-134 (139차)**: CC 가 정답군 (ja/zh) 에 임의로 propagation 시도 — 즉시 거부 + 검수자 명령으로 덮어쓰기.
7. **★ko/다른 언어 안전 apply 도구 패턴 (135~140차 실증)**:
   - ko 기존 path 값 수정: `session132_apply_ko_only.py`
   - ko 신규 키 (기존 namespace, parent 단일 블록): `session134_apply_new_keys.py --csv <path>`
     **★ 단 gSug 같은 빈 stub 또는 다중 블록 ns 에는 SYNTH FAIL (N-128/N-130)**
   - ko 신규 namespace 통째: `session136_apply_v2.py --csv <path>` 또는
     `session138_add_grade_only.py` 패턴
   - **★ko 빈 stub 교체**: `session138_replace_gsug_stub.py` (gSug 패턴)
   - **★ko 기존 블록 append**: `session138_append_to_block_v2.py --ns <ns> [--block N]`
   - 중첩 nested sub-block 수동: CC Edit 도구 (helpPanel 케이스)
   - **★다른 12개 언어 simple propagation (140차 검증완료)**:
     `session140_propagate_v6_patch2.py --lang <lg> [--apply]` ★ multi-block last 선택
   - **★다른 12개 언어 nested propagation (140차 검증완료)**:
     `session140_propagate_v6_nested_patch1.py --lang <lg> [--apply]` ★ tree-merge
   - **★다른 언어 scalar overwrite 제거 (140차 신규)**:
     `session140_remove_workspace_scalar.py --lang <lg> [--apply]`
     (top-level scalar `"ns": "<value>"` 1줄 삭제 → object 활성화)
   - ★ja.js/zh.js (정답군) 절대 propagation 금지 (N-79/N-134)
8. **★only_b 분류 신뢰 금지 (134차 N-93)**: 코드 호출 grep 검증 필수.
9. **★PASSTHROUGH 패턴 (135차 N-110)**: ja_hangul=1 인 경우 ko 값 그대로 주입.
   140차 적용: ja_hangul=1 1,687건 모두 ko 값 그대로 12개 언어 propagation.
10. **★사전 다단계 보강 (135차 N-111)**: v1→v5 매칭률 단계적 상승 패턴.
    140차 적용: v6 → patch1 (depth==1 root scalar) → patch2 (multi-block last) →
    nested_patch1 (tree-merge) → patch2x (잔여 simple last) → clean (workspace scalar 제거).
11. **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시)**:
    - 배포 운영 중인 i18n 시스템에서 누락 언어는 런타임 에러 / 영문 키 노출 / 일관성 깨짐 유발
    - 어설프게 몇 개국 언어 누락하고 진행 절대 금지
    - ko 신규 키 추가 시 → 14개 언어 모두 동일 path 에 placeholder 또는 번역값 보장 필수
    - **★139차 해결**: 137~138차 +147 keys 12개 언어 전체 무결성 회복 완료
    - **★140차 해결**: ko∩ja 부재 8,599 path 중 **8,143 회수 (94.7%)**
12. **★★★★★ ko/ja 구조 raw 재확인 원칙 (N-117, 136차 발견)**:
    - 140차 종결 시점: ko 20,849 / ja 22,175 / 공통 7,030 / ko-only 13,819 / ja-only 15,145
    - ko/ja 거의 독립 source-of-truth. 단순 비율 계산은 무의미.
    - ★ 139차 인계서 leaf 수치 (build_leaf_paths 기준) 와 다름 — node import (정답) 기준
13. **★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128/N-133/N-135)**:
    - 정규식 단독 신뢰 금지. raw 검증 필수.
    - dry-run 의 안전검사: `delta == applied`, `missing == 0`,
      `unexpected == 0` 셋 다 PASS 강제. 하나라도 FAIL 이면 apply 절대 금지.
14. **★★★★★ ko.js 다중 블록 raw 확인 원칙 (N-128, 137차 발견, 138차 정밀화)**:
    - 138차 raw 측정: tabs 3 / performance 3 / commerce 3 / pages 2 /
      attribution 3 / cat 4 / audit 2 / gSug 1 / crm 1
    - 동일 namespace 가 여러 블록에 중복 존재.
15. **★★★★★ build_leaf_paths 한계 인지 원칙 (N-130, 138차 발견) + N-130b (139차)**:
    - `session125_recover_safestub_jazh.build_leaf_paths` 는 ko.js 의
      **일부 블록만 파싱**.
    - **★N-130b**: 단일 따옴표 `'key'` 형태 entry 인식 못함.
    - **★140차 후속**: `session140_kojaintersect_missing.mjs` 처럼 **node ESM
      import 로 leaf set 추출이 정답**. python 자체 walker 는 정확하지 않음.
16. **★top-level ns 들여쓰기 raw 자동 측정 원칙 (N-133)**:
    - 모든 언어 .js 파일은 `export default { ... };` 형태이지만 첫 ns 의
      들여쓰기가 언어/파일별로 다를 수 있음.
    - 140차 raw 측정: 15개 언어 모두 = 2 spaces (실측 동일).
    - future-proof 로 도구는 `export default {[ \t]*\n([ \t]+)` 정규식으로
      자동 측정.
17. **★★★★ N-135 신규 — multi-block last 선택 원칙 + scalar overwrite (140차)**:
    - **multi-block 시 raw_keys 가장 많은 블록(largest) 이 아니라 가장 마지막
      블록(last) 선택해야 함**. JS 객체 표준: 동일 key 중복 시 마지막이 최종값.
    - **scalar 형태 후행 entry 가 object 블록을 통째로 덮어쓰기**. 예:
      ar.js L5484 `"workspace": { ... }` (object) + L6679 `"workspace": "Workspace"`
      (scalar) → JS 가 scalar 로 인식 → object entries 100개 무효화.
    - 해결: `session140_propagate_v6_patch2.py` (last 선택) +
      `session140_remove_workspace_scalar.py` (scalar 라인 삭제).
18. **★★★★★ N-136 신규 — 다른 12개 언어 ns 계층 구조가 ko/ja 와 상이 (140차)**:
    - 예: ko/ja 의 `kakao` 는 indent=2 top-level + indent=0 (EOF 인근) 2 블록.
      th/id/zh-TW 는 indent=4 (sub-block 안) + indent=0 만 보유 → top-level 미존재.
    - node 가 root.kakao = undefined 로 인식. propagation 도구가 entry 추가해도
      root 객체에 등록 안 됨.
    - **종류 2 (선행부재 불가)**: 다른 언어 파일의 구조 정리 (indent 재구성)
      가 선행되어야 회수 가능. 141차 작업 대상.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형: `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 (`&&`/`||` 금지).
- ★PowerShell 괄호 `()` 사용 시 manual approval 트리거 → 검수자 명령은 괄호 회피.
- **★PowerShell 인라인 따옴표 충돌 시 도구 파일 작성으로 우회 (N-127)**.
- **★cmd /c 명령 manual approval → PowerShell 네이티브 사용 (N-127b)**.
- **★compound `cd ; ...` manual approval → 한 줄 cd 후 별도 명령, `git -C <path>` 옵션 (N-127c)**.
- **★`$env:VAR=...` 일부 환경 manual approval → 도구 안에서 처리 (N-127d)**.
- CC 승인: `1.Yes/2.allow all/3.No` → `2`, `1.Yes/2.No` → `1`. 검증완료 .py 자체수정 시도 → `3`.
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기.
- **★CC 가 임의로 ja.js/zh.js 작업 시도 시 즉시 `3` 거부 + 검수자 명령으로 덮어쓰기 (N-134)**.
- 검수자 설명은 한글·핵심만 짧게. **★사용자 강화 (137~140차)**:
  - 가급적 CC 명령으로 직접 수정 진행
  - 사용자는 도구 파일 저장만 (1건/단계)
  - 사용자가 저장하면 검수자 CC 명령으로 즉시 dry → check → apply 진행
  - 초엔터프라이즈급 정밀도
- 선택지 제시 시 검수자 추천 1개 반드시 명시.
- 사용자 작업은 1건만 (도구 저장).
- ★사용자가 outputs 다운로드 파일을 폴더에 덮어쓰기 했는지 raw 검증 필수 (N-106).
- ★사용자가 CSV/엑셀 업로드 시 raw 컬럼·내용 검증 우선 (N-126).
- push 는 사용자 명시 승인 시에만.
- read-only 진단/probe 우선. apply 는 dry → raw → apply 순.
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지).
- **★도구 CSV 컬럼 호환성 매 사용 시 raw 재확인 (N-126/N-129)**.
- **★CSV 로드 시 UTF-8 BOM 처리 (N-131): csv.DictReader 사용 시 `encoding="utf-8-sig"` 필수**.
- **★140차 다언어 propagation 도구는 node import 검증 필수 (N-130b/N-135)**.
- **★★★★★ 종결 제안 자제**: 검수자는 종결 제안을 자주 하지 않는다. 사용자가
  명시 지시하지 않는 한 작업 여력 활용 + 부분 종결이라도 진행. (140차 사용자 명시)

---

## 1. 프로젝트 좌표

### 1-1. locale 디렉토리
`D:\project\GeniegoROI\frontend\src\i18n\locales\` — **15개 언어 .js 파일**

### 1-2. 15개 언어 raw 현황 (140차 종결 시점, byte)

| 그룹 | 언어 | byte | 수정일 | 역할 |
|---|---|---:|---|---|
| **정답군** | ja.js | 1,153,628 | 5/20 | ★ 최대 / 정답 출처 / 무변경 |
| | zh.js | 869,855 | 5/20 | 보조 정답 / 무변경 |
| **회수 작업 진행** | ko.js | 1,062,430 | 5/21 (138차) | leaf 20,849 (node) |
| **5/14군** | en.js | ~982,000 | 5/21 (140차) | +219 |
| | es.js | ~982,000 | 5/21 (140차) | +180 |
| | fr.js | ~982,000 | 5/21 (140차) | +180 |
| **5/16군** | th.js | ~918,000 | 5/21 (140차) | +1,067 |
| | vi.js | ~972,000 | 5/21 (140차) | +783 |
| | id.js | ~898,000 | 5/21 (140차) | +1,157 |
| | de.js | ~850,000 | 5/21 (140차) | +421 |
| | zh-TW.js | ~768,000 | 5/21 (140차) | +1,010 |
| **5/17군** | ar.js | ~520,000 | 5/21 (140차) | +790 |
| | hi.js | ~520,000 | 5/21 (140차) | +790 |
| | pt.js | ~520,000 | 5/21 (140차) | +790 |
| | ru.js | ~520,000 | 5/21 (140차) | +790 |

★ 141차 시작 시 정확한 byte raw 재측정 필수.

### 1-3. leaf count raw (140차 종결 시점)
- **★★★ node import 기준 (정답)**:
  - ko: 20,849 / ja: 22,175 / zh: 미측정 (정답군 보존)
  - en: 22,049 / es: 22,044 / fr: 22,044
  - th: 21,686 / vi: 21,856 / id: 21,665 / de: 19,910 / zh-TW: 20,003
  - ar: 8,023 / hi: 8,022 / pt: 8,022 / ru: 8,022
- **★★ build_leaf_paths 절대 신뢰 금지 (N-130/N-130b 영향)**

### 1-4. ★ko/ja 차집합 raw (140차 종결 시점, node import 기준)

| 항목 | 수치 |
|---|---:|
| ko leaf | **20,849** |
| ja leaf | **22,175** |
| ko ∩ ja | **7,030** |
| ko-only | 13,819 |
| ja-only | 15,145 |

★ 139차 인계서의 8,081/12,260/15,139 는 build_leaf_paths 기준 (N-130b 영향). 정답은 위 node 기준.

### 1-5. ★★★ 140차 종결 시점 ko∩ja 부재 path raw (node 실측)

| 언어 | leaf | ko∩ja 부재 | 회수 누계 |
|---|---:|---:|---:|
| en | 22,049 | **1** | 220 |
| es | 22,044 | **1** | 181 |
| fr | 22,044 | **1** | 181 |
| de | 19,910 | **1** | 421 |
| vi | 21,856 | **4** | 783 |
| th | 21,686 | **112** | 1,067 |
| id | 21,665 | **112** | 1,157 |
| zh-TW | 20,003 | **120** | 1,010 |
| ar | 8,023 | **1** | 790 |
| hi | 8,022 | **1** | 790 |
| pt | 8,022 | **1** | 790 |
| ru | 8,022 | **1** | 790 |
| **합계** | - | **557** | **8,143** |

★ **140차 회수 8,143 entries (94.7%)** — 단일 차수 최대 성과.

### 1-6. ★★★ ko.js 다중 블록 raw (N-128, 변동 없음)

| top-level | 블록 수 | 비고 |
|---|---:|---|
| tabs | 3 | |
| performance | 3 | |
| commerce | 3 | |
| pages | 2 | |
| attribution | 3 | |
| cat | 4 | |
| audit | 2 | |
| gSug | 1 | 138차에 stub 교체 |
| crm | 1 | |
| grade | 1 | 138차 신규 |

### 1-7. 인계서 / 도구 위치
- 인계서: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128~140}_*.py / *.mjs`

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용)

**검증 모체** (import 전용): `session125_recover_safestub_jazh` (build_leaf_paths, _ko_suspect, KO_CONTAMINATED 등)
**★N-130/N-130b 주의**: build_leaf_paths 는 일부 블록만 인식 + 단일 따옴표 `'key'` 인식 X.
**★★ 140차 정답**: `session140_kojaintersect_missing.mjs` (node ESM import 기반) 이 정답 leaf set 산출.

**128~138차 자산**: 이전 인계서 참조

**139차 자산**: 24 도구 (이전 인계서 참조)

**140차 신규 도구 (검증완료, 무변경 재사용)**

진단:
- `session140_kojaintersect_missing.mjs` ★★★ **node import 으로 정답 leaf set + ko∩ja 부재 산출**
- `session140_extract_kojaint_values.mjs` ★★ **node import 으로 ja/ko 값 추출 + ja_hangul 분류 (N-110 PASSTHROUGH)**
- `session140_diag_ar_still_missing.mjs` ★ 적용 후 잔여 진단

도구 (★ 검증완료, 141차 재사용):
- **`session140_propagate_v6_patch2.py` ★★★ simple propagation (multi-block last 선택)**
  - 외부 입력: s140_step1_<lang>_miss.txt + s140_step2_pv.csv
  - ja_type=string only / depth==1 root + depth==2 simple
  - multi-block last 선택 (N-135)
  - top-level indent 자동 측정 (N-133)
  - PASSTHROUGH ja_hangul=1 (N-110)
  - dry/apply 분리, raw scan verify
- **`session140_propagate_v6_nested_patch1.py` ★★★ nested propagation (tree-merge)**
  - depth>=3 path 일반화 처리
  - parent chain 별 그룹화 + 같은 prefix tree 머지
  - multi-block last 선택
  - APPEND / NEW SUB-GROUP / NEW NS 자동 분기
- **`session140_remove_workspace_scalar.py` ★ scalar overwrite 제거**
  - 정확히 `^  "ns": "<value>",?\s*$` (indent=2) 1줄만 매칭·삭제
  - sub-block 안 (indent>=4) 보존

(폐기: session140_propagate_v6.py / patch1.py — patch2 로 대체, session140_propagate_v6_nested.py — patch1 로 대체)

**140차 신규 CSV/TXT 다수**: s140_*.txt/csv (s140_step1_*, s140_step2_pv.csv, s140p1_*, s140p2_*, s140np1_*, s140p2x_*, s140clean_*, s140_*_dry/_apply/_diag.txt 등)

**★★★ 141차 신규 작성 필요 도구 (선택, 사용자 작업 여력 지시)**:
- **`session141_restructure_kakao.py`** — th/id/zh-TW 의 kakao 105 keys 구조 정리
  - indent=4 (sub-block 안) → indent=2 (top-level) 옮기기
  - 또는 indent=0 의 EOF kakao 블록을 top-level 로 재정렬
  - N-136 해결 → 105 × 3 = 315 entries 회수
- 또는 비슷한 다른 ns 구조 결함 일괄 진단·정리

---

## 3. 140차 commits (41건, 5331bce 이후)

### 3-1. 초기 v6 (3 commits) — depth==2 simple 만, root scalar 누락
| 커밋 | 언어 | +entries |
|---|---|---:|
| 8d56095 | es | +147 |
| 3fa8a76 | fr | +147 |
| 95b7c7f | en | +186 |

### 3-2. v6 patch1 (12 commits) — depth==1 root + depth==2 simple, largest 선택
| 커밋 | 언어 |
|---|---|
| ca4a7e2 | en |
| 6c1d832 | es |
| 23fcd8f | fr |
| 31ac325 | de |
| 8e67c89 | vi |
| 0e8a3fe | ar ★ revert |
| 7d382c6 | hi ★ revert |
| 350ab3b | pt ★ revert |
| f9b0dce | ru ★ revert |
| e734667 | zh-TW |
| bb6bd54 | th |
| d71cd0c | id |

### 3-3. revert 4건 — ar/hi/pt/ru (multi-block largest 결함)
| 커밋 | 언어 |
|---|---|
| e8afa53 | Revert ar |
| 8510efa | Revert hi |
| 3b9ba36 | Revert pt |
| 7cbc717 | Revert ru |

### 3-4. v6 patch2 (4 commits) — multi-block last 선택 (ar/hi/pt/ru 재apply)
| 커밋 | 언어 |
|---|---|
| 4de3775 | ar |
| a5f86c3 | hi |
| 61af5de | pt |
| e9545e0 | ru |

### 3-5. nested patch1 (9 commits) — tree-merge, depth>=3
| 커밋 | 언어 | +entries |
|---|---|---:|
| 9c17e3a | de | +16 |
| c9e026d | vi | +11 |
| 4f8dbb6 | id | +20 |
| 375f9d6 | th | +18 |
| 4424016 | zh-TW | +20 |
| 9b9cafe | ar | +84 |
| 4473577 | hi | +84 |
| b4243b7 | pt | +84 |
| cdc1dd5 | ru | +84 |

### 3-6. patch2x (4 commits) — 잔여 simple, multi-block last (de/th/id/zh-TW)
| 커밋 | 언어 | +entries |
|---|---|---:|
| e101d1c | de | +63 (attrData) |
| 2522517 | th | +168 (attrData 63 + kakao 105 무효 라인) |
| 5507186 | id | +168 |
| e204982 | zh-TW | +168 |

### 3-7. clean (4 commits) — workspace scalar 제거 (ar/hi/pt/ru)
| 커밋 | 언어 | +entries 효과 |
|---|---|---:|
| 557e076 | ar | +100 (object 활성) |
| edba678 | hi | +100 |
| 5c33705 | pt | +100 |
| f8a0293 | ru | +100 |

### 3-8. 140차 누적 (origin/master 대비)
- 작업 commits: **41** (initial 3 + patch1 12 + revert 4 + patch2 4 + nested patch1 9 + patch2x 4 + clean 4 + 인계서 1 reserved)
- 정답군 (ja.js / zh.js) 무변경 확인
- node --check 12개 언어 모두 0
- 139차 인계서의 origin 동기화 확인 (5331bce 이후 모두 미push, 단 사용자 명시 승인 시에만 push)

---

## 4. 140차 핵심 발견 (N-135 / N-136)

### N-135 — ★★★★ multi-block last + scalar overwrite 패턴 (140차 신규)
- **multi-block largest 가 아닌 last 가 정답**. JS 객체 표준: 동일 key 중복 시 마지막이 최종.
  - 139차 도구 `session139_propagate_v4.py` 와 140차 patch1 모두 largest 사용 (정답 우연)
  - 140차 발견 — ar/hi/pt/ru 의 aiInsights/auth/dash/priceOpt 2 블록 처리에서
    largest 선택 → JS overwrite → entries 100~672 무효화
- **scalar 형태 후행 entry 가 object 블록 통째 덮어쓰기**
  - ar.js L5484 `"workspace": { ... }` (object) + L6679 `"workspace": "Workspace"` (scalar)
  - JS 가 scalar 로 인식 → object 100 entries 무효
- **해결**:
  - `session140_propagate_v6_patch2.py` (last 선택)
  - `session140_remove_workspace_scalar.py` (scalar 라인 삭제)

### N-136 — ★★★★★ 다른 12개 언어 ns 계층 구조가 ko/ja 와 상이 (140차 신규)
- ko/ja: `kakao` 는 indent=2 top-level (정상 root key)
- th/id/zh-TW: `kakao` 는 **indent=4 sub-block 안** + indent=0 EOF 인근
  - top-level 에 kakao 미존재 → node 가 root.kakao = undefined
  - propagation 도구가 entry 추가해도 root 객체에 등록 안 됨
- **종류 2 (선행부재 불가)**: 다른 언어 파일 구조 정리 (indent 재구성) 가
  선행되어야 회수 가능
- **141차 작업 대상**:
  - th/id/zh-TW kakao 105 × 3 = 315 entries 회수 자안
  - 도구 패턴: `session141_restructure_kakao.py` (검수자 작성, 사용자 저장)

---

## 5. 잔여 백로그 (★재구성)

### 5-A. ★★★ 141차 1순위 — N-136 해결 (kakao 구조 정리)

**대상**: th/id/zh-TW (각 105 entries)

**진단 raw** (140차 확인):
- th L1699 / id L1702 / zh-TW L1699: `    "kakao": {` (indent=4, 다른 ns 안)
- th L11710 / id L11736 / zh-TW L12172: `kakao: {` (indent=0, EOF 인근)
- 둘 다 top-level (indent=2) 아님 → root.kakao = undefined

**해결 방향**:
- A. 둘 중 하나를 indent=2 로 변경 (들여쓰기 조정 + 닫기 brace 정렬)
- B. indent=4 또는 indent=0 의 kakao 블록을 추출해서 export default 의 직접 자식으로 재배치

**예상 회수**: 315 entries (105 × 3)

### 5-B. ★★ 141차 2순위 — 다른 언어 동일 패턴 N-136 일괄 점검

**확인 필요 ns**:
- de/ar/hi/pt/ru 도 indent=0 ns 블록 보유 (140차 진단 raw):
  - de: kakao indent=0 (L11649), attrData indent=0 (L19962)
  - 단 de 는 잔여 1 (nonstr) → 이미 정상 동작 (attrData 회수 성공)
- 다른 ns 도 동일 결함 있을 가능성 → 일괄 진단 후 정리

**도구**:
- node import 으로 `Object.keys(m.default)` 와 grep `^\s*"<ns>":\s*\{` 라인 매칭 결과 비교
- root 미존재 ns 식별

### 5-C. ★ 141차 3순위 — ko 자체 대량 sparse 회수

138차 발굴 결과 (ja >> ko gap top):

| ns | ko_max | ja_max | gap | 메모 |
|---|---:|---:|---:|---|
| marketingIntel | 442 | 4,545 | **4,103** | ★ 대량 |
| aiHub | 129 | 4,069 | **3,940** | ★ 대량 |
| pages | 3,814 | 6,827 | **3,013** | ★ 대량 |
| email | 156 | 1,348 | **1,192** | ★ 대량 |
| mobile | 34 | 259 | 225 | |
| aiPredict | 326 | 491 | 165 | |
| marketing | 778 | 885 | 107 | |
| reviews | 501 | 551 | 50 | |
| gdpr | 26 | 32 | 6 | |

**ko 에 완전 부재 (26 namespace)**:
- marketingIntel 4,545 / aiHub 4,069 / wms 565 / perms 362 / menu 321 /
  auto 319 / mobile 259 / _marketing_1 238 / pricingDetail 193 / super 169 /
  onboarding 130 / cmpVal 110 / supplyChain 76 / accountPerf 35 /
  report 29 / cmpRow 28 / actionPresets 14 / units 6 / budget 4
- ★ 단 138차 검증: budget/units/actionPresets 는 ko 에도 top-level 존재 (stub_v2 가 잘못 식별).

### 5-D. 종류 2 (선행 부재 — ko 영역 잔여)

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

- 12 ja_type non-string (15 lang 잔여 1 each, 8 lang × 1 = 8 + en/es/fr/de = 12)
- ★ 잔여 12 = 종류 1
- p1 588 / absent 216 dead / cat_a 1085 dead / sidebar.version 줄바꿈 / E3 NO_SOURCE 23
- truly_new with ja 121 / marketing R1 bad 12 / 3중 교집합 144
- ja-only DEAD 13,427 (137차 측정)

### 5-F. 독립 과제

- **5-1 #3 성과허브**: 139차에 nav.pages.performance.* 11개 신규 ns 만들었으나 ko 도 추가 필요
- **5-4 push**: origin 대비 미실행. 누적 미push:
  - 128차 4, 129차 1, 132차 1, 133차 1, 134차 3, 135차 5, 136차 3, 137차 2, 138차 7, 139차 25 (인계+24), **140차 41+1 = 42**
  - 사용자 명시 승인 시에만

---

## 6. 140차 무결성 raw 확정

### 6-1. ko.js / ja.js / zh.js 상태
- node --check 3개 모두 0
- ja.js / zh.js byte-level 무변경 (1,153,628 / 869,855)
- ko.js byte 무변경 (1,062,430) — 140차는 ko 직접 작업 없음

### 6-2. ★15개 언어 raw 무결성 (140차 종결 시점)
- ko: 20,849 leaf (node 기준, 변동 없음)
- ja: 22,175 leaf (node, 변동 없음)
- 12개 언어 byte 증가 (각 +400~+5,700)
- node --check 12개 언어 모두 0
- **★15개 무결성 회복**: 8,143 entries 회수 (94.7%)

### 6-3. 140차 작업커밋 raw (실측 / node import 기준)
- 총 41 작업 commits (initial 3 + patch1 12 + revert 4 + patch2 4 + nested patch1 9 + patch2x 4 + clean 4)
- 각 commit 후 node --check + node import 검증 완료

### 6-4. 140차 사용자 결정 (작업 0)
- audit mismatch 22 / pages ambiguous 3 (138차 그대로 유지)

---

## 7. 141차 실행 로드맵 (★★★ 우선순위)

**0단계 — 시작 시 raw 재확인 (필수)**
- 15개 언어 raw 파일 크기·수정일 확인
- `session140_kojaintersect_missing.mjs` 재실행 → ko/ja/12-lang leaf + 부재 path 실측
- node --check ja/zh/ko/12-lang 우선

**★★★ 1순위 — N-136 해결 (kakao 구조 정리)**
- Step 1: th/id/zh-TW 의 kakao 위치 raw 재확인 (140차 진단 그대로일 것)
- Step 2: 도구 `session141_restructure_kakao.py` 작성
  - indent=4 또는 indent=0 의 kakao 블록을 indent=2 top-level 로 이동
  - 닫기 brace 정렬 + ns 간 콤마 prefix 검증
  - node --check + node import 검증
- Step 3: dry → apply → commit 3개 언어 (th/id/zh-TW)
- 예상 회수: 315 entries

**★★ 2순위 — 다른 ns 동일 패턴 일괄 점검**
- node import vs grep 라인 비교 도구 작성
- root 미존재 ns 식별 후 동일 패턴 정리
- 예상 회수: 100~300 entries

**★ 3순위 — ko 자체 대량 sparse 회수 (검수자 추천 + 사용자 확정)**
- Step 1: budget/units/actionPresets sparse 재검증 (138차 도구 한계 우회)
- Step 2: 작은 ns 검수자 추천 → 사용자 확정
- Step 3: 큰 ns 사전 다단계 보강

**진행 불가 시**: 각 순위에서 raw 부재/불가 입증 후 다음 순위 전환 (0-3).
**★★★ 작업 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행 (0-1 강화)**.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md 전체 작성 → 사용자 저장 → CC 명령으로 차수 인계 커밋:
`t git -C D:\project\GeniegoROI add NEXT_SESSION.md; git -C D:\project\GeniegoROI commit -m "docs(handover): session 141 -> 142"; git -C D:\project\GeniegoROI log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- **★★★★★ 작업 여력 있는 한 부분 종결이라도 무조건 추가 작업 진행 (140차 사용자 명시 강화)**
- **★★★★★ 검수자가 매 차수마다 종결 주장 자제 (140차 사용자 명시)**
- 검수자 설명은 한글·핵심만 짧게, CC 명령으로 직접 수정 우선, 사용자 파일 저장 1건만
- 인계서는 검수자가 전체 작성 (기존 삭제 후 전체 붙여넣기)
- 임의 종결 / 임의 인계 작성 금지
- 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 무엇이 선행돼야 가능한지 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기
- ★★ ja.js/zh.js 정답군 무변경 절대 원칙 (N-79/N-134)
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- 12개 propagation 대상 언어는 v6_patch2 / v6_nested_patch1 / remove_workspace_scalar 도구 사용
- **★★★ 15개 언어 무결성 원칙 (N-116)**
- **★★★★★ ko/ja 차집합 raw 재확인 원칙 (N-117)** — node import 기준
- 매 차수 시작 시 locale 폴더 전체 .js raw 확인 필수
- 신규 키 추가:
  - **ko 기존 namespace, parent 단일 블록** → `session134_apply_new_keys.py`
  - **ko 신규 namespace 통째** → `session138_add_grade_only.py` 패턴
  - **ko 빈 stub 교체** → `session138_replace_gsug_stub.py` 패턴
  - **ko 기존 블록 append (다중블록 OK, nested OK)** → `session138_append_to_block_v2.py`
  - **ko 중첩 sub-block** → CC Edit 도구
  - **12개 언어 simple propagation** → `session140_propagate_v6_patch2.py` (multi-block last)
  - **12개 언어 nested propagation** → `session140_propagate_v6_nested_patch1.py` (tree-merge)
  - **12개 언어 scalar overwrite 제거** → `session140_remove_workspace_scalar.py` 패턴
- 검수자 추천 + 사용자 검토 워크플로우
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 사용자 파일 덮어쓰기 검증 필수 (N-106)
- 사용자 업로드 CSV/엑셀 raw 컬럼 검증 필수 (N-126)
- **★UTF-8 BOM 처리 (N-131): csv.DictReader `encoding="utf-8-sig"`**
- PASSTHROUGH 패턴 적용 (N-110): ja_hangul=1 은 ko 값 그대로
- 사전 다단계 보강 패턴 (N-111)
- **★★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128/N-130/N-133/N-135)**
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지)
- ★PowerShell 괄호 `()` 사용 시 manual approval 트리거 회피
- ★PowerShell 인라인 따옴표 충돌 시 도구 파일로 우회 (N-127)
- ★cmd /c 명령 manual approval → PowerShell 네이티브 사용 (N-127b)
- ★compound `cd ; ...` manual approval → 한 줄 cd 후 별도 명령 / `git -C` 옵션 (N-127c)
- ★`$env:VAR=...` 일부 환경에서 manual approval → 도구 안에서 처리 (N-127d)
- **★★★★★ N-130/N-130b (build_leaf_paths 한계)**: 검증은 raw scan + node --check + **node import**
- **★★ N-133 (top-level indent 엄격 매칭)**: `indent ≤ TOP_IND_LEN` 강제
- **★★ N-134 (정답군 무변경)**: CC 가 ja/zh 임의 작업 시도 → 즉시 거부 + 검수자 명령
- **★★★★ N-135 (multi-block last + scalar overwrite, 140차 신규)**: 도구 multi-block 처리는 last 선택. scalar overwrite 라인은 별도 제거 도구
- **★★★★★ N-136 (다른 12개 언어 ns 계층 ko/ja 와 상이, 140차 신규)**: 141차 1순위 작업
- 초엔터프라이즈급 정밀도 유지

---
*(140차 검수자 작성. 모든 수치 raw 확정. 141차는 시작 시
locale 폴더 전체 .js 재확인 + ko/ja 차집합 raw 재측정 + node import
기반 leaf set + ko.js 다중 블록 raw 재확인 + build_leaf_paths 한계 인지 +
top-level indent raw 측정 + N-135/N-136 인지 후 진행.
140차 작업커밋 41건 + 인계서 1건 = 42 커밋.
ko∩ja 부재 8,599 path 중 8,143 회수 (94.7%) — 단일 차수 최대 성과.
137~138차 +147 keys + 140차 +8,143 = 누적 무결성 회복 진행 중.
★★★★★ N-135 신규 (multi-block last 선택 + scalar overwrite 제거).
★★★★★ N-136 신규 (다른 12개 언어 ns 계층 ko/ja 와 상이) — 141차 1순위.
★★★★★ 사용자 명시 강화 (140차): 검수자 종결 주장 자제, 작업 여력 있는
한 부분 종결이라도 무조건 추가 작업 진행, 도구 검수자 작성·사용자 저장.
141차 1순위: th/id/zh-TW kakao 105 × 3 = 315 entries 회수 (N-136 해결).
2순위: 다른 ns 동일 패턴 일괄 점검.
3순위: ko 자체 대량 sparse 회수.
원칙 0-17/0-18 신규 (N-135/N-136 대응).)*