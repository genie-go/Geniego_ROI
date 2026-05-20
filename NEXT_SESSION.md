# GenieGoROI i18n 인계서 — 131차 시작점

> 본 문서는 130차 검수자가 전체 작성. 131차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 131차 시작 시
> raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로 0/부재를
> 입증해야 보류가 정당.

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. 작업 여력이 있으면 부분 종결이라도 최대한 진행한다. 복구가
   불가하면 검증·진단이라도 끝까지 수행한다. 인계서 작성 전
   반드시 사용자 승인을 받는다. 인계서는 검수자가 전체 작성
   하며(기존 전체 삭제 후 전체 붙여넣기), 임의 종결·임의 인계
   작성 금지.
2. **추측 보류 금지**: "안전여력 소진/보류"를 선언하려면 raw
   수치로 0 또는 부재를 입증해야 한다. 추측으로 보류하면
   126차처럼 실재하는 회수분을 놓친다(N-18 교훈).
3. **★불가작업 전환 원칙 (사용자 명시 — 반드시 준수·계승)**:
   진행 중인 특정 작업이 그 차수에 raw 로 도저히 불가
   (물리한계·결정불가·정답출처 부재)함이 입증되면, 거기
   매달리지 말고 작업 여력이 있는 한 다른 진행 가능한 작업
   으로 즉시 전환한다. 부분 종결이어도 무방. 이 원칙을 인계
   작업 시 운영원칙에 반드시 반영한다.
4. **★불가의 2종 구분 (반드시 계승)**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계.
     도구·데이터가 동일하면 차수가 바뀌어도 결과 동일. 다음
     차수에 자동으로 풀리지 않음. 풀리려면 새 식별축 발굴
     또는 데이터 구조 변경이 선행돼야 함.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가.
     선행 조건이 충족되면 다음 차수에 동일 도구로 가능.
   ※ 인계서엔 "다음 차수에 하면 됨"이 아니라 **무엇이 선행
     돼야 가능해지는지**를 명시한다. 차수가 바뀐다는 사실
     자체는 아무것도 가능하게 만들지 않는다.
5. **★사용자가 ko 결정하는 영역 — 검수자/CC 추측 절대 금지
   (N-17/N-25, 129차 강화, 130차 재확인)**: ko_fixed 작성/보조표
   추천/"자동 복원" 등 어떤 형태로도 검수자·CC 가 ko 값을
   결정·추천·시사해선 안 된다. "영문 유지가 자연스러워 보이는"
   항목도 사용자 확정 없이는 적용 금지. 적을수록 사용자 확정 +
   일괄 처리가 효율적.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형:
  `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 사용(`&&`/`||` 금지). PowerShell에서
  `copy /Y` 안 됨 → CC가 자동으로 Bash `cp`로 재실행함(정상).
- CC 승인 프롬프트: `1.Yes/2.allow all/3.No` → `2`,
  `1.Yes/2.No` → `1`. 검증완료 .py 를 CC 가 자체수정
  시도하면 → `3`. 도구 버그는 CC 에 안 시키고 검수자가
  직접 수정(N-18).
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- ★사용자 선택지 제시 시 **검수자 추천 1개 반드시 명시**
  (128차 사용자 명시 지시). 사용자가 "검수자 추천"이라
  답하면 그대로 진행.
- ★검수자가 수정 문서를 만들면 사용자가 폴더에 저장 →
  검수자가 CC 명령으로 적용 (129차 사용자 명시 워크플로우).
  사용자 직접 수정은 ko_fixed CSV 작성 등 꼭 필요한 경우만.
- push 는 사용자 명시 승인 시에만(현재 origin 대비 미실행
  유지 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw → apply
  순. 백업+node+rollback 필수. 합성검증 ALL PASS 아니면
  abort.

---

## 1. 프로젝트 좌표

- locale: `D:\project\GeniegoROI\frontend\src\i18n\locales\{ko,ja,zh}.js`
- 인계서 본체: `D:\project\GeniegoROI\NEXT_SESSION.md`
  (PM_HANDOVER.md / FEATURE_PLAN_120.md 는 불변, 건드리지 말 것)
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130}_*.py`
- ko leaf-paths 총수: 19,801 (129차 기준, 130차 미변동)

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`:
  `build_leaf_paths`(text→dict, **값은 JS raw escape 보존**
  — 128 N-28 raw 확정),
  `_ko_suspect(path, ko_val)` — 2인자 시그니처(128 N-18 raw),
  `_is_hashkey`(auto.<숫자없는 영숫자> 미식별 한계),
  `KO_CONTAMINATED`, `norm`,
  `scan_key_blocks`(최상위 블록만),
  `extract_kv(body)` 1인자, ANYKEY_RE, `locate_and_plan`/
  `apply_plans`, **LEAF_RE_TMPL** = `("%s"\s*:\s*)("(?:[^"\\]|\\.)*")`

**128차 검증 자산 (무변경 재사용 가능)**
- `session128_apply_auto4_ko.py` (8ca2ff5 회수 도구)
- `session128_make_ko_sheet_az88.py` (시트 생성 도구 모체)

**129차 검증 자산**
- `session129_recover_mirror7.py` — fc84c08 회수 도구
- `session129_apply_ko_unified.py` — leaf_re 토큰 치환 일반화 도구
  (--csv/--bak-suffix 인자, 3 시트 az_unified/mk87/residual 처리)
- 진단 도구 다수 (인계서 129차 § 2 참조)
- 시트 생성 도구: `session129_make_ko_sheet_az_unified.py`,
  `session129_make_ko_sheet_mk87.py`,
  `session129_make_ko_sheet_residual.py`

**130차 신규 도구 (검증완료 — dry PASS)**

진단 도구 (read-only):
- `session130_diag_jazh_residual.py`     → ja/zh 깨진값 전파 raw 확정 (0건)
- `session130_diag_absent_only.py`       → ABSENT-only 289 leaf_key/308 path 발굴
- `session130_diag_absent_parent.py`     → ABSENT path 의 parent 유일성 (group A/B/C 분류)
- `session130_diag_groupB_fail.py`       → group B v1 실패 원인 (step 0 token 중복)
- `session130_diag_groupC_structure.py`  → group C 173 path 11 클러스터 raw 확정

시트 생성 도구:
- `session130_make_ko_sheet_absent.py`   → _ko_sheet_absent.csv (308행)

apply 도구 (dry 검증 PASS, ko_fixed 작성 대기):
- `session130_apply_absent_groupA.py`    → 단순 부모 삽입 (52/52 OK)
- `session130_apply_absent_groupB_v2.py` → full-path top-level 한정 traversal (83/83 OK)
- `session130_apply_absent_groupC.py`    → 신규 sub-tree 클러스터 삽입 (11/11 OK)
- `session130_apply_all.py`              → ★일괄 apply 통합 도구 (6 stage 파이프라인)

폐기:
- `session130_apply_absent_groupB.py` v1 (step 0 token 중복으로 82/83 FAIL)
  → v2 로 교체. v1 파일은 보존하지만 사용 금지.

---

## 3. 완료 커밋 (HEAD = a34de71 + 130 인계커밋, 130차 0 작업커밋)

| 커밋 | 내용 | 건수 |
|---|---|---|
| a34de71 | docs(handover): session 129 -> 130 | (인계) |
| fc84c08 | i18n(5-C mirror7) recover auto.{key} root ko from dashops | 7 |

- **130차 누적**: 작업 커밋 0건 (locale 무변경, 도구만 추가)
- **전체 누적**: 128차까지 6,548 + 129차 7 + 130차 0 = **6,555건**
- node --check ja/zh/ko = 0 (정상). locale tracked clean.
- origin 대비 push 미실행(5-4, 사용자 승인 대기).

---

## 4. 130차 핵심 발견 (131차가 반드시 알아야 할 것)

### N-38 — ABSENT-only 영역 신규 발굴 (대규모, 130차 핵심)

**129차 인계서에 미인지된 영역**:

| 항목 | 129차 추정 | 130차 실측 |
|---|---|---|
| ko 측 ABSENT path 전체 (ja or zh 에 있고 ko 에 없음) | 미인지 | **18,445** |
| ABSENT-only leaf_key (ko 에 한 번도 등장 안 함, 신규 작성 대상) | 미인지 | **289 leaf_key / 308 path** |
| 시트 3종(454)과 ABSENT-only 교집합 | 미인지 | **0** (완전 별개) |

**prefix 분포 상위 (ABSENT-only 308 path)**:
- crm 102 (대부분 crm.aiHub 101)
- pages 48 (대부분 pages.marketingIntel 47)
- ruleEnginePage 36
- channelKpi 24
- tabs 16
- gSug 14

**131차 raw 재확인 필수**: 시트 3종과 ABSENT 시트 path 교집합 0 가정,
ja/zh 분포 변동 가능성 등.

### N-39 — ABSENT path 의 group A/B/C 분류 (parent 유일성 기반)

각 ABSENT path 의 parent (path 의 `.` 직전 부분) 가 ko.js 에서
어떻게 식별되는지 기준:

| 그룹 | 정의 | 130차 수치 | 처리 도구 |
|---|---|---|---|
| A | parent 존재 + parent 마지막 토큰이 ko.js 중간노드 집합에서 유일 | **52 path** | apply_absent_groupA.py |
| B | parent 존재 + parent 마지막 토큰이 중복 (nav/pages 래퍼 등) | **83 path** | apply_absent_groupB_v2.py |
| C | parent 자체가 ko.js 에 없음 (신규 sub-tree 필요) | **173 path** | apply_absent_groupC.py |

**합계 308 path / 289 leaf_key** (일부 leaf_key 가 여러 path 에 분산).

### N-40 — group B 실패 원인 raw 확정 (v1→v2 진화)

130차 group B v1 도구는 첫 토큰 매칭이 2+ 면 ambiguous abort.
실제 라이브 검증 결과 **82/83 FAIL**. 원인 raw 분석:

- step 0 에서 전부 깨짐 = 최상위 토큰부터 ko.js 내 여러 위치에 등장
- 예: `channelKpi` 가 root + nav 래퍼 + pages 래퍼 안에 4 위치 동시 존재
- target path `channelKpi.X` 는 root 의 channelKpi 를 의미하나, v1 은
  단순 토큰 매칭으로 ambiguous 판정

**v2 해법** (raw 입증):
- 첫 토큰은 **export 객체의 직계 자식 한정** 매칭
- nav/pages 래퍼 안의 동명 블록은 자동 배제 (직계 자식 아니므로)
- 두번째 토큰부터는 직전 블록의 직계 자식 매칭

v2 라이브 검증: **group B 83/83 OK + group A 52/52 호환 OK** (회귀 0).

### N-41 — group C 클러스터 구조 raw 확정

ABSENT 173 path 의 parent 부재 영역이 사실 **11개 클러스터로 집약**:

| 클러스터 (ancestor → new_subtree) | children | 비고 |
|---|---|---|
| crm → aiHub | 101 | 단일 신규 블록 생성으로 101건 처리 |
| pages → marketingIntel | 47 | 단일 신규 블록 |
| `<TOP>` → lineChannel | 8 | 최상위 신규 블록 |
| `<TOP>` → journeyBuilder | 4 | |
| `<TOP>` → dataTrust | 3 | |
| aiPredict → grade | 2 | |
| cmpVal.aiPredict → grade | 2 | |
| `<TOP>` → graph | 2 | |
| ruleEnginePage → operations | 2 | |
| `<TOP>` → developerHub | 1 | |
| pages → marketingIntel.campaignMgr | 1 | depth=2 (유일) |

- depth=1 클러스터 10개, depth=2 클러스터 1개
- 단일 도구로 11개 클러스터 모두 처리 가능 (apply_absent_groupC.py
  라이브 검증 11/11 OK)

### N-42 — 일괄 apply 파이프라인 (6 stage 통합)

130차 신규 통합 도구 `session130_apply_all.py`:

| stage | 시트 | 로직 | 130차 dry 결과 |
|---|---|---|---|
| 1 | az_unified 146 | leaf_re 토큰 치환 (apply_ko_unified 동일) | NOOP (ko_fixed 0) |
| 2 | mk87 55 | 동일 | NOOP |
| 3 | residual 253 | 동일 | NOOP |
| 4 | absent groupA 52 | 부모 블록 `{` 직후 삽입 | NOOP |
| 5 | absent groupB 83 | top-level 한정 traversal | NOOP |
| 6 | absent groupC 173 | 신규 sub-tree 클러스터 | NOOP |

- 단계별 in-memory node --check + 합성검증
- 단계 실패 시 즉시 전체 abort (최초 ko 스냅샷 보존)
- 마지막에 ja/zh byte-level 무변경 검증
- 옵션: `--skip-stage <name>` 으로 특정 단계 건너뛰기 가능
- **762 leaf_key 전체 apply 인프라 완비 (ko_fixed 작성 선행만 대기)**

### N-43 — ja/zh 깨진값 영역 전역 부재 raw 확정

129차 추정으로 N-36 잔여 가능성 있었으나, 130차 전수 raw 측정:
- 전역 ja/zh KO_CONTAMINATED 패턴 0건
- mirror 회수 가능 0건
- mirror7 7키의 root ja/zh 도 dashops 측 자체 부재로 회수 불가
  (정답출처 부재 = 종류 1)

→ ja/zh 회수는 **별도 번역자원 (사용자/번역자) 선행 없이는 종류 1 불가**
확정. raw 0 입증.

### N-44 — 도구 파이프라인 검증 패턴 (live test 강화)

130차 신설: apply 도구 마다 dry 모드에서 **전수 라이브 traversal
테스트**. ko_fixed 빈칸이라도 도구의 핵심 알고리즘이 실패하는 path
가 있는지 raw 확인 가능.

예시:
- group B v2 도구의 dry: group B 83 + group A 52 path 모두 traversal
  성공 검증
- group C 도구의 dry: 11 클러스터 ancestor-block 식별 검증

131차 이후에도 신규 도구에 라이브 테스트 동봉 권장.

---

## 5. 잔여 백로그 (raw 확정 — 131차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 선행 없이는 차수 무관 불가)

**128~129차 인계 그대로**:
- marketing R1 中 bad/mismatch 12건 (probe_order self-verify 불성립)
- marketing R1 中 ko 부재로 종류2인 분 (130차 시점 mk87 87 path 로 통합)
- **131차 가능 조건**: 5번째 결정적 식별축을 read-only effect 측정
  으로 발굴해야만 가능. 단순 차수 변경으론 불가.

**130차 추가 (N-43)**:
- ja/zh 회수: 전역 raw 0건. 별도 번역자원 작성 선행 시에만 가능.
  - mirror7 7키 root ja/zh + 임의 신규 ja/zh 영역
  - **131차 가능 조건**: 일본어/중국어 정답 출처(사용자/번역자) 확보.
    raw 데이터로는 도출 불가.

### 5-B. 종류 2 (선행부재 불가 — ko 정답 작성 선행 시 가능)

**★최우선 — 시트 4종 사용자 작성 대기 (총 762 leaf_key)**

| 시트 | 영역 | leaf_key/path | 적용 도구 |
|---|---|---|---|
| `_ko_sheet_az_unified.csv` | auto.* | 146 | apply_ko_unified.py --bak s130azu |
| `_ko_sheet_mk87.csv` | marketing | 55 | apply_ko_unified.py --bak s130mk87 |
| `_ko_sheet_residual.csv` | 잔여 | 253 | apply_ko_unified.py --bak s130res |
| `_ko_sheet_absent.csv` | ABSENT-only (A 52 + B 83 + C 173) | 308 | apply_absent_groupA/B_v2/C |

**일괄 적용 (권장)**:
```
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_all.py dry --bak-suffix s131all 2>&1 | Out-File -Encoding utf8 _t131_all_dry.log; $env:PYTHONIOENCODING=""; code _t131_all_dry.log
```
dry PASS 후:
```
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_all.py apply --bak-suffix s131all 2>&1 | Out-File -Encoding utf8 _t131_all_apply.log; $env:PYTHONIOENCODING=""; code _t131_all_apply.log
```

**개별 적용 (특정 시트만)**:
```
# az_unified (예시)
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py apply --csv _ko_sheet_az_unified.csv --bak-suffix s131azu 2>&1 | Out-File -Encoding utf8 _t131_azu_apply.log; $env:PYTHONIOENCODING=""; code _t131_azu_apply.log

# absent group A
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_absent_groupA.py apply --bak-suffix s131gA 2>&1 | Out-File -Encoding utf8 _t131_gA_apply.log; $env:PYTHONIOENCODING=""; code _t131_gA_apply.log

# absent group B (v2 사용)
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_absent_groupB_v2.py apply --bak-suffix s131gB 2>&1 | Out-File -Encoding utf8 _t131_gB_apply.log; $env:PYTHONIOENCODING=""; code _t131_gB_apply.log

# absent group C
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_absent_groupC.py apply --bak-suffix s131gC 2>&1 | Out-File -Encoding utf8 _t131_gC_apply.log; $env:PYTHONIOENCODING=""; code _t131_gC_apply.log
```

빈칸 자동 SKIP (부분 처리 OK).

**131차 가능 조건**: 사용자가 시트 ko_fixed 칸 채우면 즉시 가능.
한 시트 부분 작성도 OK.

### 5-C. 독립 과제 (인계 계승 + 130차 변동)

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. 별개 과제.
- **5-4 push**: origin 대비 미실행. 128차 4커밋 + 128→129 인계
  커밋 + 129차 1커밋 (fc84c08) + 129→130 인계커밋 + 130→131 인계커밋.
  사용자 명시 승인 시에만.
- **_is_hashkey 경계 부정확**: 'auto.<숫자없는 영숫자>' 미식별
  한계 그대로. az_unified 처리하면 영향 영역 대부분 해소될 가능성.
- **SyntaxWarning '\p'**: 일부 도구 docstring 내 `\p` 표기에서
  발생. 실행 무관. 정리는 선택사항.

---

## 6. 130차 무결성 raw 확정 (131차 신뢰 기반)

### 6-1. locale 상태

- node --check ko/ja/zh = 0 (정상)
- locale tracked clean (수정된 추적 파일 없음, 130차 작업 커밋 0건)
- HEAD = a34de71 (129→130 인계커밋)
- origin 대비 push 미실행 (5-4)

### 6-2. 시트 무결성

- _ko_sheet_az_unified.csv : 146 key (129차 생성, 130차 미변경)
- _ko_sheet_mk87.csv       : 55 key  (129차 생성, 130차 미변경)
- _ko_sheet_residual.csv   : 253 key (129차 생성, 130차 미변경)
- _ko_sheet_absent.csv     : 308 row (130차 신규 생성, group A 52 + B 83 + C 173)
- 합계 762 leaf_key 작성 대기

### 6-3. 도구 동작 검증 (130차 dry 검증 완료)

- session130_apply_absent_groupA.py:    dry NOOP + group A 52/52 OK
- session130_apply_absent_groupB_v2.py: dry NOOP + group B 83/83 OK + group A 52/52 호환
- session130_apply_absent_groupC.py:    dry NOOP + 11/11 클러스터 OK
- session130_apply_all.py:              dry NOOP + 6 stage 파이프라인 무결성 PASS
- 모든 도구: ja/zh byte-level 무변경 보장 로직 동봉

### 6-4. 작성대기 raw

- _ko_sheet_az_unified.csv : 0/146 작성
- _ko_sheet_mk87.csv       : 0/55  작성
- _ko_sheet_residual.csv   : 0/253 작성
- _ko_sheet_absent.csv     : 0/308 작성
- **총 762 leaf_key 100% 미작성, apply 인프라 100% 완비**

**결론: 130차 작업커밋 0건, 인계서 갱신 + 도구 7개 추가만.
131차는 사용자 ko_fixed 작성 진행도에 따라 즉시 apply 가능.**

---

## 7. 131차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -8; git status --short
```
HEAD 130→131 인계커밋 + a34de71 확인, locale clean, node 3개 OK.

**시트 진행도 측정**:
```
t $env:PYTHONIOENCODING="utf-8"; python _t130_check.py 2>&1 | Out-File -Encoding utf8 _t131_sheet_progress.log; $env:PYTHONIOENCODING=""; code _t131_sheet_progress.log
```
(_t130_check.py 가 4 시트 진행도 출력 — 필요 시 _ko_sheet_absent.csv
포함하도록 검수자가 갱신)

**★1순위 — 시트 ko_fixed 작성된 분 apply (일괄 또는 개별)**

권장: 일괄 (apply_all)
```
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_all.py dry --bak-suffix s131all 2>&1 | Out-File -Encoding utf8 _t131_all_dry.log; $env:PYTHONIOENCODING=""; code _t131_all_dry.log
```
dry PASS 후 apply 실행. 어느 단계라도 fail 시 전체 abort + 최초 ko 복원.

특정 시트만 처리 시 5-B 의 개별 명령 사용.

**★2순위 — 신규 측정·발굴 영역**
- 작성 후 새로운 raw 측정으로 미발견 작성대상 추가 발굴 가능성
- session129_diag_global_writetarget.py 재실행 권장 (전수 작성대상 분포)
- ja/zh 영역도 한 번 더 raw 재측정 (사용자 번역자원 추가 시)

**★3순위 — order-axis R1 새 식별축 발굴 (5-A, 도박성)**
- effect>0 식별축 못 찾으면 종결
- 우선순위 최하

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후 다음 순위로
전환(0-3). 전부 불가면 정직하게 부분종결, 사용자 승인 받아 인계.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 131 -> 132"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지, N-18)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37)
- 검수자 수정 문서 → 사용자 폴더 저장 → 검수자 CC 명령 적용 워크플로우
- 초엔터프라이즈급 정밀도 유지

---
*(130차 검수자 작성. 모든 수치 raw 확정. 131차는 시작 시
재확인 후 진행. 130차 작업커밋 0건, 도구 7개 + 시트 1개 신규
추가, 762 leaf_key apply 인프라 완비.)*