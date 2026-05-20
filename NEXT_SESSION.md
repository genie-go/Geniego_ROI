# GenieGoROI i18n 인계서 — 132차 시작점

> 본 문서는 131차 검수자가 전체 작성. 132차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 132차 시작 시
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
   (N-17/N-25, 129차 강화, 130차 재확인, 131차 N-58 재확인)**:
   ko_fixed 작성/보조표 추천/"자동 복원"/"ko_current → ko_fixed
   자동 복사" 등 **어떤 형태로도** 검수자·CC 가 ko 값을
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
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130,131}_*.py`
- ko leaf-paths 총수: 19,801 (129차 기준, 130/131차 미변동)
- ja leaf-paths 총수: 23,220 (131차 N-46 raw 확정)
- zh leaf-paths 총수: 19,409 (131차 N-46 raw 확정)

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`:
  `build_leaf_paths`(text→dict, **값은 JS raw escape 보존**
  — 128 N-28 raw 확정),
  `_ko_suspect(path, ko_val)` — 2인자 시그니처(128 N-18 raw),
  `_is_hashkey`(131차 N-54 raw: 함수 시그니처/판별 한계 — 5-C 참조),
  `KO_CONTAMINATED`, `norm`,
  `scan_key_blocks`(최상위 블록만),
  `extract_kv(body)` 1인자, ANYKEY_RE, `locate_and_plan`/
  `apply_plans`, **LEAF_RE_TMPL** = `("%s"\s*:\s*)("(?:[^"\\]|\\.)*")`

**128차 검증 자산 (무변경 재사용 가능)**
- `session128_apply_auto4_ko.py` (8ca2ff5 회수 도구)
- `session128_make_ko_sheet_az88.py` (시트 생성 도구 모체)

**129차 검증 자산**
- `session129_recover_mirror7.py` — fc84c08 회수 도구
- `session129_apply_ko_unified.py` — leaf_key 기반 자동 탐색 도구
  (--csv/--bak-suffix 인자, paths(요약) 컬럼 무시·세미콜론 분해 불필요,
  131차 N-58 raw 확정)
- 진단 도구 다수 (인계서 129차 § 2 참조)
- 시트 생성 도구: `session129_make_ko_sheet_az_unified.py`,
  `session129_make_ko_sheet_mk87.py`,
  `session129_make_ko_sheet_residual.py`

**130차 검증 자산 (dry PASS)**
- 진단 도구: `session130_diag_jazh_residual.py`,
  `session130_diag_absent_only.py`, `session130_diag_absent_parent.py`,
  `session130_diag_groupB_fail.py`, `session130_diag_groupC_structure.py`
- 시트 생성: `session130_make_ko_sheet_absent.py`
- apply: `session130_apply_absent_groupA.py` (52/52 OK),
  `session130_apply_absent_groupB_v2.py` (83/83 OK + groupA 호환),
  `session130_apply_absent_groupC.py` (11/11 클러스터 OK),
  `session130_apply_all.py` (6 stage 파이프라인 dry PASS — 131차 dry 재검증 NOOP)
- 폐기: `session130_apply_absent_groupB.py` v1 (사용 금지)

**131차 신규 도구 (총 9개 + 시트 1개 신규)**

진단 도구 (read-only):
- `session131_diag_absent_def_mismatch.py` — absent 정의 A/B 불일치 raw (N-46)
- `session131_diag_sheets_overlap.py` — 시트 5종 path/leaf_key 중복 측정 (N-47)
- `session131_diag_only_a_detail.py` — only_A 63 path 분석 (N-50)
- `session131_diag_absent_apply_safety.py` — 단독 토큰 시뮬레이션 (N-51, false alarm)
- `session131_diag_hashkey_boundary.py` v1 — auto.* 커버리지 측정 (N-54, 세미콜론 미분해 버그)
- `session131_diag_hashkey_boundary_v2.py` — v1 버그 수정 + 진실 raw (N-56)

시트 생성 도구:
- `session131_make_ko_sheet_hidden.py` — hidden 575 시트 생성
- `session131_make_ko_sheet_hidden_new.py` — hidden 중복 제거 후 잔여 (N-48, 결과 4건 false positive N-49)
- `session131_make_ko_sheet_az_uncovered.py` — az_uncovered 173 시트 생성 (N-57)

기타 도구:
- `_t131_check.py` v1 — 컬럼명 정확 매칭 (3시트 NO_KO_FIXED_COL 표시)
- `_t131_check_v2.py` — 컬럼명 fuzzy 매칭 (4 시트)
- `_t131_check_v3.py` — 5 시트 통합 진행도 (az_uncovered 포함, ★현역)
- `session131_safety_absent_single_token.py` — absent 단독토큰 안전표기 시도

**131차 신규 시트 (1개)**:
- `_ko_sheet_az_uncovered.csv` — 173 leaf_key (au_unified 미커버, 동일 컬럼 형식)
- ko_current 모두 채워져 있음 (실제 텍스트 173). 사용자가 한글화/영문유지 결정 후 ko_fixed 작성.

**131차 시트 헤더 통일 (사용자 작업 안전성)**:
- az_unified / mk87 / residual 의 `ko_fixed(여기 작성)` → `ko_fixed` 일괄 변경
- 백업: 각 시트의 `.s131bak`
- 효과: apply_all.py 의 ko_fixed 정확매칭이 모든 시트 인식 가능 (N-45)

---

## 3. 완료 커밋 (HEAD = b4e68ce + 131차 인계커밋, 131차 작업커밋 0)

| 커밋 | 내용 | 건수 |
|---|---|---|
| b4e68ce | docs(handover): session 130 -> 131 | (인계) |
| a34de71 | docs(handover): session 129 -> 130 | (인계) |
| fc84c08 | i18n(5-C mirror7) recover auto.{key} root ko from dashops | 7 |

- **131차 누적**: 작업 커밋 0건 (locale 무변경, 도구 9개 + 시트 1개 추가)
- **전체 누적**: 128차까지 6,548 + 129차 7 + 130차 0 + 131차 0 = **6,555건**
- node --check ja/zh/ko = 0 (정상). locale tracked clean.
- origin 대비 push 미실행(5-4, 사용자 승인 대기).

---

## 4. 131차 핵심 발견 (132차가 반드시 알아야 할 것)

### N-45 — 시트 컬럼명 통일 (사용자 작성 직전 사고 방지)

130차 시트 3종 (az_unified/mk87/residual) 의 ko_fixed 컬럼이
`ko_fixed(여기 작성)` 한글 괄호 포함이었음. 130차 검증 시 발견 못함.

| 도구 | 매칭 방식 | 영향 |
|---|---|---|
| `apply_ko_unified.py` | fuzzy (`"ko_fixed" in kn`) | 안전 |
| `apply_absent_groupA/B_v2/C` | 정확 (`r.get("ko_fixed")`) | absent 시트가 `ko_fixed` 라 호환 |
| `apply_all.py` | 정확 | **위험** — az/mk/res 컬럼명 인식 실패 |

131차 처리: 시트 3개 헤더만 `ko_fixed` 로 일괄 변경 (백업 동봉).
검증완료 도구는 무변경 (N-13).

### N-46 — ABSENT 정의 불일치 raw (130차 인계 수치 일부 부정확)

130차 `_ko_sheet_absent.csv` 의 ABSENT 정의 ≠ 진단도구 정의.

| 정의 | 산출 |
|---|---|
| A (CSV 308 path, 352 unique path) | 308 행 / 352 unique path |
| B (ja \| zh 에 있고 ko 에 없는 leaf-path) | **18,445** |
| A ∩ B (양정의 일치) | 294 |
| only_A (CSV에만, ja/zh 양쪽 부재) | **58** |
| only_B (ja/zh 있는데 CSV 누락) | **18,151** |

**해석**:
- only_B 18,151 대부분 ja 전용 `pages.marketingIntel.*`, `crm.aiHub.*` 영역
  — ko 에 원래 없어야 하는 ja 전용 path 가능성 큼. 본 인계서에선
  작성대상으로 보지 않음.
- only_A 58 (CSV 분해 63) 은 N-50 으로 추가 raw 점검됨.
- 어쨌든 absent 시트 그대로 사용 가능 (path 기반 도구가 처리).

### N-47 — 시트 5종 path/leaf_key 중복 raw

| 교집합 | path | leaf_key |
|---|---|---|
| residual ∩ hidden | 202 | 243 |
| az_unified ∩ hidden | 0 | 146 (전체) |
| mk87 ∩ hidden | 13 | 32 |
| 그 외 | 0 또는 소규모 | |

→ 130차 4시트 (az_unified/mk87/residual/absent) 가
hidden(575) 영역을 거의 완전 포함. **hidden 시트 별도 처리 불필요** 확정.

### N-48 — hidden 잔여 4건 (검증 후 false positive)

hidden 575 - 중복 571 = 잔여 4건 (전부 EMPTY).
샘플: `Data.`, `dash.gCat.`, `gSug.`, `priceOpt.`

### N-49 — hidden 잔여 4건 false positive 확정

raw 재검색 결과 `"Data"`, `"priceOpt"`, `"gSug"`, `"gCat"`
모두 ko.js 에 객체 블록 키로 정상 존재 (L4461, L1147/5432/19200,
L16270, L2527/19135). **진단도구가 부모 객체 노드를 leaf 로 잘못
추출한 false positive**. _ko_sheet_hidden_new.csv 4건 처리 불필요.

### N-50 — only_A 63 raw 분석

absent CSV 안 path_col 분해 후 ko/ja/zh 어디에도 없는 63 path 의 raw:

| 분류 | 건수 |
|---|---|
| parent 가 ko 에 존재 | 14 (대부분 `gSug.*`) |
| 동명 leaf_key 가 ko 다른 위치 존재 | 14 |
| 동명 leaf_key 가 ja 다른 위치 존재 | 15 |
| 동명 leaf_key 가 zh 다른 위치 존재 | 15 |

**해석**: 63 중 14건 `gSug.Apparel/Beauty/...` 는 정상 작성대상.
나머지 49건 `target/audience/budget/...` 단독 토큰은 path_col 안
multi-path 문자열 분해 부산물. 130차 도구는 행 단위 처리이므로
실제 영향 없음 (N-51 ~ N-53 으로 확정).

### N-51 / N-52 / N-53 — absent 도구 안전성 검증 (3중 raw)

| Note | 내용 |
|---|---|
| N-51 (시뮬레이션) | 분해 후 단독 토큰 49건 발견. budget(4 paths)/marketing(778 paths) root 충돌 우려 |
| N-52 (CSV 행 raw) | 실제 absent CSV 행 단위 단독 토큰 = **0건** |
| N-53 (도구 코드 raw) | groupA.py L161 `parent = path.rsplit(".", 1)[0] if "." in path else ""` — 단독 토큰 자동 무시 |

→ **absent 308 행 apply 안전 확정**. N-51 의 위험은 분해 시뮬레이션
부산물, 실제 도구 동작과 무관.

### N-54 — _is_hashkey 한계 raw (v1, 버그 포함)

ko `auto.*` 319 path 전수 측정 시 `_is_hashkey` 0 식별 / 319 미식별.
v1 진단도구가 az_unified 시트의 `paths(요약)` 컬럼을 세미콜론(`;`)
분해 안 해서 시트 path 0 커버 라고 잘못 결론.

### N-55 — az_unified 시트 path 컬럼은 세미콜론 multi-path

샘플:
```
leaf_key=097xk9, paths(요약)=auto.097xk9;dash.operations.auto.097xk9
```
- 세미콜론 구분으로 root + dashops 양 path 동시 처리 설계
- v1 진단도구의 분해 버그 원인. 시트 자체는 정상.

### N-56 — _is_hashkey 한계 raw v2 (진실)

세미콜론 분해 추가 후 진단:

| 항목 | 값 |
|---|---|
| ko `auto.*` + `dash.operations.auto.*` 전체 | **638** (pure 319 + dash 319) |
| az_unified 시트 path 커버 | **292** (146 leaf_key × 2 path) |
| ko 미커버 (132차 후보) | **346** (pure 173 + dash 173) |
| 시트에만 있고 ko 부재 | 0 |
| ko_current 분류 | hash 자체값 41 + 실제 텍스트 105 |

**132차 작업 후보 raw 확정**: 미커버 leaf_key 173 (× 2 path = 346)

### N-57 — az_uncovered 173 시트 생성

`_ko_sheet_az_uncovered.csv` 신규 (az_unified 동일 컬럼).

| 항목 | 값 |
|---|---|
| rows | 173 |
| ko_current 분류 | hash 자체값 0 / 실제 텍스트값 **173** / 빈값 0 |

샘플:
- `015zcn | ko='새 Channel Add'` (한글+영문 혼재)
- `0dge9p | ko='🔄 불러오는 in progress...'`
- `08tz61 | ko='베네피아'` (한글만)
- `04xbs5 | ko='Auto 스캔 · Integration · Issue신청'`

**중요**: 173 전부 ko_current 채워져 있어 사용자 작성 부담 낮음.
다만 한글화/영문 유지/혼합 결정은 사용자 영역 (0-5).

### N-58 — apply_ko_unified.py 호환성 raw

- 도구는 leaf_key 기반 자동 탐색 → `paths(요약)` 컬럼 무시
- 세미콜론 분해 불필요
- `build_leaf_paths + split('.')[-1]` 로 ko.js 전체 스캔
- `_ko_sheet_az_uncovered.csv` 173 leaf_key 즉시 호환 raw 확정

---

## 5. 잔여 백로그 (raw 확정 — 132차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 선행 없이는 차수 무관 불가)

**128~130차 인계 그대로**:
- marketing R1 中 bad/mismatch 12건 (probe_order self-verify 불성립)
- ja/zh 회수: 전역 raw 0건 (130차 N-43)
  - mirror7 7키 root ja/zh + 임의 신규 ja/zh 영역
  - **132차 가능 조건**: 일본어/중국어 정답 출처(사용자/번역자) 확보.
    raw 데이터로는 도출 불가.

### 5-B. 종류 2 (선행부재 불가 — ko 정답 작성 선행 시 가능)

**★최우선 — 시트 5종 사용자 작성 대기 (총 935 leaf_key/path)**

| 시트 | 영역 | rows | 적용 도구 |
|---|---|---|---|
| `_ko_sheet_az_unified.csv` | auto.* (146 leaf_key) | 146 | apply_ko_unified.py --bak s132azu |
| `_ko_sheet_mk87.csv` | marketing | 55 | apply_ko_unified.py --bak s132mk87 |
| `_ko_sheet_residual.csv` | 잔여 | 253 | apply_ko_unified.py --bak s132res |
| `_ko_sheet_absent.csv` | ABSENT (A 52 + B 83 + C 173) | 308 | apply_absent_groupA/B_v2/C |
| `_ko_sheet_az_uncovered.csv` ★131차 신규 | auto.* 미커버 (173 leaf_key) | 173 | apply_ko_unified.py --bak s132azu2 |
| **합계** | | **935** | |

**일괄 적용 (130차 4시트 — 권장)**:
```
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_all.py dry --bak-suffix s132all 2>&1 | Out-File -Encoding utf8 _t132_all_dry.log; $env:PYTHONIOENCODING=""; code _t132_all_dry.log
```
dry PASS 후:
```
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_all.py apply --bak-suffix s132all 2>&1 | Out-File -Encoding utf8 _t132_all_apply.log; $env:PYTHONIOENCODING=""; code _t132_all_apply.log
```

**az_uncovered 적용 (131차 신규 시트)**:
```
# dry
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py dry --csv _ko_sheet_az_uncovered.csv --bak-suffix s132azu2 2>&1 | Out-File -Encoding utf8 _t132_azu2_dry.log; $env:PYTHONIOENCODING=""; code _t132_azu2_dry.log

# apply
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py apply --csv _ko_sheet_az_uncovered.csv --bak-suffix s132azu2 2>&1 | Out-File -Encoding utf8 _t132_azu2_apply.log; $env:PYTHONIOENCODING=""; code _t132_azu2_apply.log
```

**개별 적용 (특정 시트만)**: 130차 인계서 § 5-B 참조 (변동 없음)

빈칸 자동 SKIP (부분 처리 OK).

**132차 가능 조건**: 사용자가 시트 ko_fixed 칸 채우면 즉시 가능.
한 시트 부분 작성도 OK.

### 5-C. 독립 과제 (인계 계승 + 131차 변동)

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. 별개 과제.
- **5-4 push**: origin 대비 미실행. 128차 4커밋 + 128→129/129→130/
  130→131/131→132 인계커밋 + 129차 1커밋 (fc84c08). 사용자 명시
  승인 시에만.
- **`_is_hashkey` 함수 동작 raw 미확정 (N-54 잔여)**:
  131차 v2 진단으론 우회 가능했음(시트 path 직접 측정으로 결론 도출).
  단, 함수 자체의 식별 로직 raw 점검은 미수행. 132차에 az 영역 추가
  작업 시 함수 거동 raw 점검 권장. (단순 사용엔 시트가 우선)
- **SyntaxWarning '\p'**: 일부 도구 docstring 내 `\p` 표기에서
  발생. 실행 무관. 정리는 선택사항.
- **only_B 18,151 ja/zh 전용 path 의 ko 측 의도 raw**:
  ko 에 원래 없어야 하는 ja 전용일 가능성 큼. 132차에 raw 재측정
  시 leaf_key 의 ko 측 동명 위치 raw (N-50 패턴) 활용 권장.

---

## 6. 131차 무결성 raw 확정 (132차 신뢰 기반)

### 6-1. locale 상태

- node --check ko/ja/zh = 0 (정상)
- locale tracked clean (수정된 추적 파일 없음, 131차 작업 커밋 0건)
- HEAD = b4e68ce (130→131 인계커밋) + 131→132 인계커밋
- origin 대비 push 미실행 (5-4)

### 6-2. 시트 무결성

| 시트 | 신규/계승 | rows | 컬럼명 |
|---|---|---|---|
| _ko_sheet_az_unified.csv | 129차 (헤더 통일) | 146 | ko_fixed (s131bak 백업) |
| _ko_sheet_mk87.csv | 129차 (헤더 통일) | 55 | ko_fixed (s131bak 백업) |
| _ko_sheet_residual.csv | 129차 (헤더 통일) | 253 | ko_fixed (s131bak 백업) |
| _ko_sheet_absent.csv | 130차 (131차 백업 시도) | 308 | ko_fixed (s131safety 백업, 실제 변경 0건) |
| _ko_sheet_az_uncovered.csv ★ | **131차 신규** | 173 | ko_fixed (백업 불필요) |

합계 **935 leaf_key/path 작성 대기**

### 6-3. 도구 동작 검증 (131차 dry 검증)

- session130_apply_all.py: 6 stage 파이프라인 dry NOOP 재검증 PASS (헤더 통일 후)
- session129_apply_ko_unified.py: az_uncovered 시트 호환성 raw 확정 (N-58)
- 모든 도구: ja/zh byte-level 무변경 보장 로직 동봉 (130차 계승)

### 6-4. 작성대기 raw

- _ko_sheet_az_unified.csv    : 0/146 작성
- _ko_sheet_mk87.csv          : 0/55  작성
- _ko_sheet_residual.csv      : 0/253 작성
- _ko_sheet_absent.csv        : 0/308 작성
- _ko_sheet_az_uncovered.csv  : 0/173 작성 (131차 신규)
- **총 935 leaf_key/path 100% 미작성, apply 인프라 100% 완비**

**결론: 131차 작업커밋 0건, 인계서 갱신 + 도구 9개 + 시트 1개 신규
추가. 132차는 사용자 ko_fixed 작성 진행도에 따라 즉시 apply 가능.**

---

## 7. 132차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -8; git status --short
```
HEAD 131→132 인계커밋 + b4e68ce 확인, locale clean, node 3개 OK.

**시트 진행도 측정 (5시트)**:
```
t $env:PYTHONIOENCODING="utf-8"; python _t131_check_v3.py 2>&1 | Out-File -Encoding utf8 _t132_sheet_progress.log; $env:PYTHONIOENCODING=""; code _t132_sheet_progress.log
```
(131차 신규 az_uncovered 포함 5시트 진행도 출력)

**★1순위 — 시트 ko_fixed 작성된 분 apply (일괄 또는 개별)**

권장: 일괄 (apply_all 으로 130차 4시트 처리) + az_uncovered 별도
```
t $env:PYTHONIOENCODING="utf-8"; python session130_apply_all.py dry --bak-suffix s132all 2>&1 | Out-File -Encoding utf8 _t132_all_dry.log; $env:PYTHONIOENCODING=""; code _t132_all_dry.log
```
dry PASS 후 apply 실행. 어느 단계라도 fail 시 전체 abort + 최초 ko 복원.

az_uncovered 별도:
```
t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py dry --csv _ko_sheet_az_uncovered.csv --bak-suffix s132azu2 2>&1 | Out-File -Encoding utf8 _t132_azu2_dry.log; $env:PYTHONIOENCODING=""; code _t132_azu2_dry.log
```

특정 시트만 처리 시 5-B 의 개별 명령 사용.

**★2순위 — 신규 측정·발굴 영역**
- 작성 후 새로운 raw 측정으로 미발견 작성대상 추가 발굴 가능성
- session131_diag_hashkey_boundary_v2.py 재실행 권장 (auto.* 영역 변동 확인)
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
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 132 -> 133"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지, N-18)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58)
- 검수자 수정 문서 → 사용자 폴더 저장 → 검수자 CC 명령 적용 워크플로우
- 초엔터프라이즈급 정밀도 유지

---
*(131차 검수자 작성. 모든 수치 raw 확정. 132차는 시작 시
재확인 후 진행. 131차 작업커밋 0건, 도구 9개 + 시트 1개 신규
추가 (az_uncovered 173 leaf_key), 935 leaf_key/path apply 인프라
완비. N-45 ~ N-58 신규 raw 14건 기록.)*