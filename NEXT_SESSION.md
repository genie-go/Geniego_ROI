# GenieGoROI i18n 인계서 — 133차 시작점

> 본 문서는 132차 검수자가 전체 작성. 133차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 133차 시작 시
> raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로 0/부재를
> 입증해야 보류가 정당.

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★작업 여력 최대 활용 (132차 사용자 명시·강화)**: 작업 여력이
   있으면 절대 다음 차수로 미루지 않는다. 부분 종결이 가능하면
   진행하고, 추가 측정·발굴·도구작성 가능하면 끝까지 한다.
   인계서만 작성하다 차수만 증가시키지 말 것. raw 측정/도구작성/
   시트생성/추천보강 등 검수자가 할 수 있는 모든 작업을 그 차수
   안에 진행한다. 인계서 작성 전 반드시 사용자 승인을 받는다.
   인계서는 검수자가 전체 작성하며(기존 전체 삭제 후 전체 붙여
   넣기), 임의 종결·임의 인계 작성 금지.
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
   (N-17/N-25, 129차 강화, 130차 재확인, 131차 N-58 재확인,
   132차 N-65 재확인)**:
   ko_fixed 작성/보조표 추천/"자동 복원"/"ko_current → ko_fixed
   자동 복사" 등 **어떤 형태로도** 검수자·CC 가 ko 값을
   결정·추천·시사해선 안 된다. "영문 유지가 자연스러워 보이는"
   항목도 사용자 확정 없이는 적용 금지. **단, 추천값 제시 후
   사용자 확정 받는 워크플로우는 허용** (132차 N-77 신규 — 검수자
   추천 + 사용자 검토 모델). 적을수록 사용자 확정 + 일괄 처리가
   효율적.
6. **★CC 자동 apply 제안 거부 원칙 (132차 N-65 강화)**: CC 가
   "ko/ja/zh 값을 자동 복사 적용" 같은 제안을 하면 무조건 거부.
   raw 로 보면 ko 값 자체가 임시/혼재 상태인 경우 다수. 사용자
   확정 없는 자동 apply 는 차수 전체를 망친다. 검수자는 CC 제안
   을 raw 로 점검하고 명시적으로 거부 표명할 것.

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
- ★검수자 추천 + 사용자 검토 모델 (132차 N-77 신규 워크플로우):
  사용자가 일일이 작성하기 어려운 영역은 검수자가 ko_fixed 미리
  채워서 _user_work_*.csv 로 제공 → 사용자가 추천값 검토/수정 →
  검수자가 원본 시트에 병합 → dry → apply. 추천값은 명사/약어/
  명확 동사만 사전 매핑하고, 일반 영문어 (on/at/for/the 등) 는
  자동 매핑 금지 (한국어 어순 불일치).
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
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130,131,132}_*.py`
- ko leaf-paths 총수: 19,801 (132차 raw 재확인, 무변동)
- ja leaf-paths 총수: 23,220 (132차 raw 재확인, 무변동)
- zh leaf-paths 총수: 19,409 (132차 raw 재확인, 무변동)

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`:
  `build_leaf_paths`(text→dict, **값은 JS raw escape 보존**
  — 128 N-28 raw 확정),
  `_ko_suspect(path, ko_val)` — 2인자 시그니처(128 N-18 raw),
  `_is_hashkey(path)` — **132차 N-59 raw 확정: 함수 정상,
     ko 데이터에 auto.* root 부재가 미식별 원인. 무변경 유지**,
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
  `session130_apply_all.py` (6 stage 파이프라인 dry PASS — 131/132차 dry 재검증 NOOP)
- 폐기: `session130_apply_absent_groupB.py` v1 (사용 금지)

**131차 검증 자산**
- 진단/시트생성 도구 9개 (인계서 131차 § 2 참조)
- 시트 생성: `session131_make_ko_sheet_az_uncovered.py`

**132차 신규 도구 (총 16개)**

진단 도구 (read-only):
- `session132_diag_hashkey_function.py` — `_is_hashkey` 함수 raw 정밀
- `session132_diag_auto_root_jazh.py` — ko/ja/zh 의 auto.* root 분포
- `session132_diag_auto_detail.py` — ja 부재 / zh 오염 / 시트 관계
- `session132_diag_three_way.py` — 3중 교집합 raw
- `session132_extract_jazh_targets.py` — ja 3 / zh 148 CSV 생성
- `session132_diag_only_b.py` — only_B 18,445 의 ko 작성후보 (A) 추출
- `session132_diag_cumulative_integrity.py` — 누적 회수 무결성 raw
- `session132_diag_placeholder_vs_sheets.py` — placeholder/시트 교차
- `session132_diag_path_diff_54.py` — path 외부 54건 정밀
- `session132_diag_unmapped_words.py` — REVIEW unmapped 단어 빈도

시트/추천 생성 도구:
- `session132_fill_az_uncovered.py` — az_uncovered ko_fixed=ko_current
- `session132_fill_safe_abbrev.py` — safe abbrev/label 자동 채움
- `session132_make_user_worksheet.py` — 사용자 작업 시트 v1
- `session132_make_user_worksheet_with_recommend.py` — v1 추천
- `session132_make_user_worksheet_v2.py` — v2 사전 확장 (폐기, 품질↓)
- `session132_make_user_worksheet_v3.py` — **v3 채택 (품질 우선)**
- `session132_show_mk87_review.py` — mk87 정밀 출력

검증 도구:
- `session132_dry_verify_filled.py` — 검수자 자체 채움 226건 dry 검증

**132차 신규 CSV (7개)**:
- `_ja_targets_3.csv` — ja 부재 3건 (사용자 ja_fixed 작성 대기)
- `_zh_targets_148.csv` — zh placeholder 148건 (zh_fixed 작성 대기)
- `_only_b_cat_a_candidates.csv` — only_B (A) 1,540건 (ko 신규 작성 후보)
- `_ko_external_placeholders.csv` — placeholder 외부분 (실제 0건, raw)
- `_user_work__ko_sheet_az_unified.csv` — 사용자 작업 시트
- `_user_work__ko_sheet_residual.csv` — 사용자 작업 시트
- `_user_work__ko_sheet_mk87.csv` — 사용자 작업 시트 (가장 빠른 진전)
- `_user_work__ko_sheet_absent.csv` — 사용자 작업 시트

**시트 백업 (132차)**:
- 시트 5종 .s132fill 백업 (az_uncovered 173 + safe abbrev 53 적용 전)

---

## 3. 완료 커밋 (HEAD = b8ee534 + 132차 인계커밋, 132차 작업커밋 0)

| 커밋 | 내용 | 건수 |
|---|---|---|
| b8ee534 | docs(handover): session 131 -> 132 | (인계) |
| b4e68ce | docs(handover): session 130 -> 131 | (인계) |
| a34de71 | docs(handover): session 129 -> 130 | (인계) |
| fc84c08 | i18n(5-C mirror7) recover auto.{key} root ko from dashops | 7 |

- **132차 누적**: 작업 커밋 0건 (locale 무변경, 도구 16개 + CSV 7개)
- **전체 누적**: 128차까지 6,548 + 129차 7 + 130차 0 + 131차 0 + 132차 0 = **6,555건**
- node --check ja/zh/ko = 0 (정상). locale tracked clean.
- origin 대비 push 미실행(5-4, 사용자 승인 대기).

---

## 4. 132차 핵심 발견 (133차가 반드시 알아야 할 것)

### N-59 — `_is_hashkey` 함수 버그 아님 raw 확정

130차 N-54 잔여 과제 해결:
- 함수 로직: `if segs[0] != "auto": return False` — `auto.*` root 만 처리
- ko 실제 데이터: 638 path 가 모두 `dash.operations.auto.xxx` (segs[0]="dash")
- 따라서 `_is_hashkey(ko_path)` = 0 식별 정상 (함수와 데이터 층위 차이)
- **함수 무변경 유지** 확정 (N-13)

### N-60 — ko auto.* root 319 의 실값 분포 raw

| 종류 | 건수 |
|---|---|
| 한글만 | 44 |
| 영문만 | 2 |
| 한+영 혼재 | 129 |
| Capitalized 자체값 placeholder | **144** |
| 합계 | 319 |

→ ko 도 319 중 144 (45%) 가 placeholder 상태.

### N-61 — 3중 교집합 144 = 종류1 핵심 영역 raw

| 집합 | 건수 |
|---|---|
| ko placeholder (auto.* root) | 144 |
| ja 부재 (ko 있고 ja 없음) | 147 |
| zh placeholder (auto.* root) | 292 |
| ko_ph ∩ ja_absent ∩ zh_ph | **144** |
| ja_absent 만 (ko/zh 실값) | 3 |
| zh_ph 만 (ko/ja 실값) | 148 |

→ 144 = 세 언어 모두 정답 없음. **정답 출처 없이는 차수 무관 불가** (종류1).
→ ja 3 / zh 148 = 종류2 (정답 출처 확보 시 가능).

### N-62 — az_uncovered 173 의 ko_current 100% 실값 raw

| 분류 | 건수 |
|---|---|
| 한글만 | 44 |
| 한+영 혼재 | 129 |
| placeholder | **0** |
| 합계 | 173 |

→ 사용자가 ko_current 그대로 유지 결정 시 즉시 apply 가능. (132차 N-77 워크플로우 적용)

### N-63 — az_unified 146 ≈ ko placeholder 144 (3중 교집합)

az_unified 시트 146 leaf 가 거의 정확히 3중 교집합 144 영역.
→ az_unified 시트 작업은 종류1, 정답 출처 확보 선행 필요.

### N-64 — ja 부재 3 / zh placeholder 148 정확 raw

ja 부재 3건:
- `auto.event_empty` ko='이벤트 없음' / zh='Event empty'
- `auto.json_err` ko='Json err' / zh='Json err'
- `auto.not_arr` ko='Not arr' / zh='Not arr'

zh placeholder 148건: ko/ja 동일 한+영 혼재값, zh 만 placeholder.

→ `_ja_targets_3.csv` / `_zh_targets_148.csv` 생성됨.

### N-65 — CC 자동 복사 제안 거부 사례 (운영원칙 0-6 강화)

CC: "ko/ja 값이 동일하므로 zh 도 그대로 복사 가능"
→ 검수자 거부. 근거:
- ko/ja 값 자체가 한+영 혼재 임시 상태 가능성 (운영원칙 0-5)
- zh 가 ko 와 동일하면 중국어 사용자에게 한글 노출
- 사용자 확정 없는 자동 복사는 N-17 위반

### N-66 — only_B 18,445 raw 재정밀화

131차 N-46 "18,151 대부분 ja 전용 → ko 작성대상 아닌 가능성 큼" 정정:

| 분류 | 건수 |
|---|---|
| (A) ko 부모 path 존재 | **1,540** ← ko 신규 작성 강 후보 |
| (B) leaf 동명 ko 다른 위치 존재 | 16,732 |
| (C) ko 어디에도 없음 | 173 |

(A) 1,540 의 top-level: pages 588 / operations 283 / ruleEnginePage 278 / marketing 144 / crm 73.
→ `_only_b_cat_a_candidates.csv` 생성. ko_fixed 작성 후 apply 가능 (종류2).

### N-67 — 현재 ko.js placeholder/empty raw

| 종류 | 건수 |
|---|---|
| empty value | 4 |
| placeholder (capitalized) | 344 |
| placeholder (exact_leaf) | 107 |
| placeholder (upper) | 32 |
| 합계 placeholder | **483** |
| clean (실값) | 19,314 |

→ placeholder 영역별: dash.operations 235 / auto 144 / nav.pages 37 / aiPredict.kpi 11 / 기타 산발

### N-68 — 누적 회수 6,555 무결성 양호 raw

- marketing.* 778건 placeholder 0
- crm.* 228건 placeholder 0
- pages.* 258건 placeholder 0
- → 128차 회수 영역의 placeholder 회귀 없음 확정.

### N-69 — placeholder 483 = 시트 5종이 leaf 단위 완전 커버 raw

| 항목 | 건수 |
|---|---|
| ko placeholder 총수 | 483 |
| 시트 path 정확 매칭 | 429 |
| 시트 leaf 매칭 | **483 (100%)** |
| 시트 외부 placeholder | 0 |

→ 추가 시트 발굴 불필요. 기존 시트 작업이 placeholder 전체 커버.

### N-70 — path 외부 54건 = 같은 leaf 다른 path raw

54건 전부 (A) leaf 시트 존재 / path 만 다름.
- 예: `aiPredict.kpi.k_3` (placeholder) vs 시트 `kpi.k_3 +nested` (커버)
- `apply_ko_unified.py` 의 leaf_key 자동 탐색 (N-58) 으로 자동 처리됨.
- 별도 시트 추가 불필요.

### N-71 — 검수자 자체 채움 226건 dry 검증 결과 raw

| 분류 | 건수 |
|---|---|
| 매칭 OK (apply 효과) | **0** |
| unchanged (이미 ko=fixed) | 202 |
| ambiguous (ko 다중 값) | 24 |
| FAIL | 0 |

해석:
- **시트의 placeholder 진단 ≠ 항상 변경 의도**. ko 가 이미 정상 약어/라벨 값이면 ko_fixed 동일값 작성해도 NOOP.
- ambiguous 24건: 같은 leaf 가 ko 의 여러 path 에서 다른 값 (예: `colCpa` = `'CPA'` vs `'CPA 비용'`). apply 위험.
- **결론**: 검수자 자체 채움 226건 apply 보류. NOOP 또는 위험.

### N-72 — ambiguous 24건 raw 샘플

```
colCpa  -> ko 값들: ['CPA', 'CPA 비용']
colRoas -> ['수익률', '최종 ROAS', 'ROAS']
cpa     -> ['CPA', '전환 단가 (CPA)', '전환당 비용 (CPA)']
ctr     -> ['클릭률', '클릭률 (CTR)', '클릭률 ']
k_18    -> ['상품조회', 'K_18', '방문']
```
→ 사용자가 path 별로 다른 ko_fixed 결정해야 함. 현재 시트 구조는 leaf 단위라 불충분.

### N-73 — 사용자 작업 시트 v1/v2/v3 비교 raw

| 버전 | RECOMMEND | REVIEW | NO_SOURCE | already |
|---|---|---|---|---|
| v1 (사전 204단어) | 10 | 130 | 569 | 53 |
| v2 (사전 292단어, 일반어 포함) | 42 | 98 | 569 | 53 |
| v3 (사전 264단어, 명사/명확동사만) | **33** | **107** | 569 | 53 |

v2 자기검증 결과: `on/at/for/the/can/will/before` 등 일반 영문어 매핑이 **한국어 어순 불일치** 야기.
- 예: `'Optimized based on past'` → v2: `'최적화 기반 켜기 과거'` (부자연)
- v3 에서 일반 영문어 제거 → 추천 줄지만 품질 향상

**v3 채택. v1/v2 폐기.**

### N-74 — 사용자 작업 시트 분포 raw (v3, 사용자 작업 대기)

| 시트 | 총 | RECOMMEND | REVIEW | NO_SOURCE | already |
|---|---|---|---|---|---|
| az_unified | 146 | 0 | 2 | 144 | 0 |
| residual | 253 | 16 | 78 | 116 | 43 |
| mk87 | 55 | 17 | 27 | 1 | 10 |
| absent | 308 | 0 | 0 | 308 | 0 |
| **합계** | 762 | **33** | **107** | 569 | 53 |

해석:
- **mk87 = 가장 빠른 진전 가능** (REVIEW 27 검토만 하면 거의 완결, NO_SOURCE 1)
- residual REVIEW 78 = 검수자 부분 추천, 사용자 일부 수정
- az_unified 144 + absent 308 = 종류1 (3중 placeholder, 정답 출처 부재)

### N-75 — az_uncovered 173 = unchanged NOOP raw

az_uncovered ko_fixed=ko_current 적용 시뮬레이션 결과 173/173 unchanged.
→ ko_current 가 한+영 혼재 그대로 유지 결정 의미. apply 효과 없음.
→ 132차 검수자가 채운 173건은 사용자 결정 표명용 (실제 변경 없음).

### N-76 — 검수자 추천 + 사용자 검토 워크플로우 (N-77 신규 정착)

132차 사용자 명시 지시:
> "검수자 추천으로 사용자에게 제공해 주세요. 그럼 사용자가 수정해서 검수자에게 전달"

워크플로우:
1. 검수자가 영문 단어 → 한국어 사전 매핑으로 ko_fixed 미리 채움 (`_user_work_*.csv`)
2. 사용자가 추천값 검토. RECOMMEND 는 OK 면 그대로, REVIEW 는 unmapped 단어만 수정, NO_SOURCE 는 직접 작성
3. 사용자 완료 시트 검수자에게 전달
4. 검수자가 원본 시트에 ko_fixed 병합 → dry → apply

→ 운영원칙 0-5 (사용자 결정 영역) 와 양립. "추천 제시 + 사용자 확정" 모델.

### N-77 — 사전 v3 정책 raw (한국어 자연스러움 우선)

v3 사전 정책:
- **포함**: 명사 (Channel/Marketing/Strategy/Score), 명확 동사 (Add/Delete/Save/Approve), 비즈니스 등급 (Premium/Enterprise/Free)
- **제외**: 일반 영문어 (on/at/for/the/can/will/before/after/Once/automatically), 브랜드명/약어 (TikTok/SaaS/CRM/CTR)

→ 일반 영문어는 문맥 의존이라 단어 치환이 한국어 어순 깨뜨림. 사용자 직접 작성이 더 빠름.

---

## 5. 잔여 백로그 (raw 확정 — 133차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 선행 없이는 차수 무관 불가)

**128~131차 인계 그대로 + 132차 추가**:
- marketing R1 中 bad/mismatch 12건 (probe_order self-verify 불성립)
- ja/zh 회수: **3중 교집합 144건 + zh 오염 만 148건 + ja 부재 만 3건** (132차 N-61)
  - 144건: 정답 출처 (사용자/번역자) 없이는 차수 무관 불가
  - 148건: zh 정답 출처 확보 시 가능 (종류2 → 1 분기)
  - 3건: ja 정답 출처 확보 시 가능 (종류2 → 1 분기)
- 정답 출처 없으면 종류1.

### 5-B. 종류 2 (선행부재 불가 — ko 정답 작성 선행 시 가능)

**★최우선 — 사용자 작업 시트 4종 작업 대기 (총 709 leaf/path)**

| 시트 | RECOMMEND | REVIEW | NO_SOURCE | 적용 도구 |
|---|---|---|---|---|
| `_user_work__ko_sheet_mk87.csv` ★최우선 | 17 | 27 | 1 | apply_ko_unified |
| `_user_work__ko_sheet_residual.csv` | 16 | 78 | 116 | apply_ko_unified |
| `_user_work__ko_sheet_az_unified.csv` | 0 | 2 | 144 | apply_ko_unified |
| `_user_work__ko_sheet_absent.csv` | 0 | 0 | 308 | apply_absent_groupA/B/C |

**작업 흐름**:
1. 사용자가 `_user_work_*.csv` 의 `ko_fixed_recommend` 검토/수정/직접작성
2. 사용자 작업 완료 시트 검수자에게 전달
3. 검수자가 사용자 작업 결과를 원본 시트 (_ko_sheet_*.csv) 의 ko_fixed 컬럼에 병합
4. dry → apply

**133차 권장 진행 순서**: mk87 부터 (가장 빠른 진전).

**★추가 영역 — only_B (A) 1,540 신규 작성대상 (132차 N-66 발굴)**:

`_only_b_cat_a_candidates.csv` (1,540 행)
- ko 에 부모 path 존재하지만 leaf 부재 (ja/zh 에는 있음)
- 사용자 결정 후 ko 신규 키 작성 + apply 도구 신규 작성 필요
- 133차 우선순위 ★2순위 (시트 4종 완료 후)

### 5-C. 독립 과제 (인계 계승 + 132차 변동)

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. 별개 과제.
- **5-4 push**: origin 대비 미실행. 128차 4커밋 + 128→129/129→130/
  130→131/131→132/132→133 인계커밋 + 129차 1커밋 (fc84c08). 사용자 명시
  승인 시에만.
- **`_is_hashkey` 함수 동작 — 132차 N-59 raw 완료**: 함수 정상, ko 데이터 구조 차이가 원인. 잔여 과제 없음.
- **SyntaxWarning '\p'**: 일부 도구 docstring 내 `\p` 표기에서
  발생. 실행 무관. 정리는 선택사항.
- **사용자 작업 ko_fixed 결정 후 apply 도구 검증**:
  - apply_ko_unified.py (leaf 기반) — mk87/residual/az_unified 처리
  - apply_absent_groupA/B/C — absent 308 처리 (단, 308 전부 NO_SOURCE 라 사용자 정답 작성 선행 필요)

---

## 6. 132차 무결성 raw 확정 (133차 신뢰 기반)

### 6-1. locale 상태

- node --check ko/ja/zh = 0 (정상)
- locale tracked clean (수정된 추적 파일 없음, 132차 작업 커밋 0건)
- HEAD = b8ee534 (131→132 인계커밋) + 132→133 인계커밋
- origin 대비 push 미실행 (5-4)

### 6-2. 시트 무결성

| 시트 | 신규/계승 | rows | 상태 |
|---|---|---|---|
| _ko_sheet_az_unified.csv | 129차 계승 | 146 | s132fill 백업, ko_fixed 0건 작성 (검수자 자체 채움 dry NOOP 라 보류) |
| _ko_sheet_mk87.csv | 129차 계승 | 55 | s132fill 백업, ko_fixed 10건 작성 (safe abbrev, dry NOOP) |
| _ko_sheet_residual.csv | 129차 계승 | 253 | s132fill 백업, ko_fixed 43건 작성 (safe abbrev, dry NOOP/ambiguous) |
| _ko_sheet_absent.csv | 130차 계승 | 308 | s131safety + s132fill, 변경 0 |
| _ko_sheet_az_uncovered.csv | 131차 신규 | 173 | s132fill, ko_fixed 173건 작성 (ko_current 복사, dry 전부 unchanged) |
| _ja_targets_3.csv ★ | 132차 신규 | 3 | ja_fixed 0건 (정답 출처 필요) |
| _zh_targets_148.csv ★ | 132차 신규 | 148 | zh_fixed 0건 (정답 출처 필요) |
| _only_b_cat_a_candidates.csv ★ | 132차 신규 | 1,540 | ko_fixed 0건 (사용자 작성 필요) |

### 6-3. 사용자 작업 시트 (v3, 132차 신규)

| 시트 | rows |
|---|---|
| _user_work__ko_sheet_az_unified.csv | 146 |
| _user_work__ko_sheet_residual.csv | 210 |
| _user_work__ko_sheet_mk87.csv | 45 |
| _user_work__ko_sheet_absent.csv | 308 |

ko_fixed_recommend 컬럼에 v3 추천값 채워져 있음. 사용자 검토 대기.

### 6-4. 도구 동작 검증

- session130_apply_all.py: 6 stage 파이프라인 dry NOOP 재검증 PASS (132차 시점)
- session129_apply_ko_unified.py: az_uncovered 173 시뮬레이션 unchanged 173 raw 확정
- session132_dry_verify_filled.py: 226건 dry 결과 NOOP 202 / ambiguous 24 / FAIL 0 raw
- 모든 도구: ja/zh byte-level 무변경 보장 로직 동봉 (130차 계승)

### 6-5. 작성대기 raw

- _user_work__ko_sheet_mk87.csv : RECOMMEND 17 / REVIEW 27 / NO_SOURCE 1 (최우선)
- _user_work__ko_sheet_residual.csv : RECOMMEND 16 / REVIEW 78 / NO_SOURCE 116
- _user_work__ko_sheet_az_unified.csv : RECOMMEND 0 / REVIEW 2 / NO_SOURCE 144
- _user_work__ko_sheet_absent.csv : RECOMMEND 0 / REVIEW 0 / NO_SOURCE 308
- **사용자 검토 대기: 709 leaf/path**
- + _only_b_cat_a_candidates.csv 1,540 (신규 작성)
- + _ja_targets_3.csv 3 / _zh_targets_148.csv 148 (정답 출처 대기)

**결론: 132차 작업커밋 0건, 인계서 갱신 + 도구 16개 + CSV 7개 신규
추가. 검수자 추천 + 사용자 검토 워크플로우 (N-76) 정착. 133차는
사용자 _user_work_*.csv 검토 진행도에 따라 즉시 apply 가능.**

---

## 7. 133차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -8; git status --short
```
HEAD 132→133 인계커밋 + b8ee534 확인, locale clean, node 3개 OK.

**사용자 작업 시트 진행도 측정**:
- 사용자가 _user_work_*.csv 에 추가 작성한 분 raw 확인
- 작성된 분 있으면 → 검수자가 원본 시트에 병합 → apply

**★1순위 — mk87 사용자 작업 완료 후 apply (가장 빠른 진전)**

mk87 사용자 검토 완료 시:
```
# (검수자가 _user_work__ko_sheet_mk87.csv 의 ko_fixed_recommend 를
#  _ko_sheet_mk87.csv 의 ko_fixed 컬럼에 병합하는 도구 작성 후)

t $env:PYTHONIOENCODING="utf-8"; python session129_apply_ko_unified.py dry --csv _ko_sheet_mk87.csv --bak-suffix s133mk87 2>&1 | Out-File -Encoding utf8 _t133_mk87_dry.log; $env:PYTHONIOENCODING=""; code _t133_mk87_dry.log
```

dry PASS 후 apply 실행.

**★2순위 — residual / az_unified / absent 사용자 작업 완료 후 apply**

각 시트 사용자 작업 진행도에 따라 개별 apply.

**★3순위 — only_B (A) 1,540 신규 작성대상**

`_only_b_cat_a_candidates.csv` 사용자 ko_fixed 작성 후:
- ko 에 신규 키 추가하는 apply 도구 신규 작성 필요 (현재 도구는 기존 path 수정용)
- 133차에 도구 작성 + dry/apply 진행

**★4순위 — ja_targets_3 / zh_targets_148 적용 (정답 출처 확보 시)**

사용자가 ja_fixed / zh_fixed 작성하면:
- ja/zh apply 도구 신규 작성 (현재는 ko 전용)
- dry/apply 진행

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후 다음 순위로
전환(0-3). **작업 여력이 있는 한 다음 차수로 미루지 말고 진행** (0-1).
전부 불가면 정직하게 부분종결, 사용자 승인 받아 인계.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 133 -> 134"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- **작업 여력 있는 한 다음 차수로 미루지 말고 끝까지 진행** (132차 강화)
- 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지, N-18)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58/N-65)
- CC 자동 apply 제안 무조건 거부 (132차 N-65)
- 검수자 수정 문서 → 사용자 폴더 저장 → 검수자 CC 명령 적용 워크플로우
- 검수자 추천 + 사용자 검토 워크플로우 (132차 N-76)
- 초엔터프라이즈급 정밀도 유지

---
*(132차 검수자 작성. 모든 수치 raw 확정. 133차는 시작 시
재확인 후 진행. 132차 작업커밋 0건, 도구 16개 + CSV 7개 신규
추가 (사용자 작업 시트 v3 4종 + ja/zh targets + only_B candidates),
709 leaf/path 사용자 검토 인프라 완비. N-59 ~ N-77 신규 raw 19건
기록. 운영원칙 0-1 (작업여력 최대활용) + 0-6 (CC 자동 apply 거부)
신규 강화.)*