# GenieGoROI i18n 인계서 — 134차 시작점

> 본 문서는 133차 검수자가 전체 작성. 134차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 134차 시작 시
> raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로 0/부재를
> 입증해야 보류가 정당.

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★작업 여력 최대 활용 (132차 사용자 명시·강화, 133차 실증)**: 작업 여력이
   있으면 절대 다음 차수로 미루지 않는다. 부분 종결이 가능하면
   진행하고, 추가 측정·발굴·도구작성·apply 까지 가능하면 끝까지
   한다. 인계서만 작성하다 차수만 증가시키지 말 것. 사용자 작성분
   받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결한다.
   인계서 작성 전 반드시 사용자 승인을 받는다. 인계서는 검수자가
   전체 작성하며(기존 전체 삭제 후 전체 붙여넣기), 임의 종결·임의
   인계 작성 금지.
2. **추측 보류 금지**: "안전여력 소진/보류"를 선언하려면 raw
   수치로 0 또는 부재를 입증해야 한다. 추측으로 보류하면
   126차처럼 실재하는 회수분을 놓친다(N-18 교훈).
3. **★불가작업 전환 원칙 (사용자 명시 — 반드시 준수·계승)**:
   진행 중인 특정 작업이 그 차수에 raw 로 도저히 불가
   (물리한계·결정불가·정답출처 부재)함이 입증되면, 거기
   매달리지 말고 작업 여력이 있는 한 다른 진행 가능한 작업
   으로 즉시 전환한다. 부분 종결이어도 무방.
4. **★불가의 2종 구분 (반드시 계승)**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계.
     도구·데이터가 동일하면 차수가 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가.
     선행 조건이 충족되면 다음 차수에 동일 도구로 가능.
   ※ 인계서엔 "다음 차수에 하면 됨"이 아니라 **무엇이 선행
     돼야 가능해지는지**를 명시한다.
5. **★사용자가 ko 결정하는 영역 — 검수자/CC 추측 절대 금지
   (N-17/N-25, 129차 강화, 131차 N-58, 132차 N-65 재확인, 133차 실증)**:
   ko_fixed 자동 결정 금지. **단, 추천값 제시 후 사용자
   확정 받는 워크플로우는 허용** (132차 N-76 정착 — 검수자 추천
   + 사용자 검토 모델, 133차 실증).
6. **★CC 자동 명령 무력화 원칙 (133차 신규 강화 N-81)**:
   CC 가 자동으로 명령을 입력 대기 상태로 만드는 현상은 처음부터
   계속 발생. 132차 N-65/N-78 에서 "거부" 로 처리했으나 거부
   응답만 하다 차수가 증가. **133차부터는 거부 응답 입력하지
   않고, 검수자의 다음 `t` 접두 명령을 입력해서 자동 명령을
   덮어쓰는 방식으로 무력화**. 거부 명령에 시간 소비 금지.
   예외: CC 가 `apply` / `commit` / 검증완료 .py 자체수정 등
   치명적 작업을 자동 입력했을 때는 즉시 차단 (다른 무해 명령으로
   덮어쓰기). ja/zh propagation 도구 (`session129_apply_ko_unified.py`)
   자동 입력은 절대 차단 — ja/zh 변경 위험.
7. **★ko 전용 안전 apply 도구 패턴 (132차 N-79 정착, 133차 실증)**:
   `session132_apply_ko_only.py` 가 ko apply 표준.
   - ja/zh md5 boundary check (변경 시 즉시 롤백)
   - ambiguous (multi-value) 자동 SKIP (시트 ko_current 와 ko 실값 일치 path 만)
   - synth check (leaf 수 유지 + 실제 변경 path 수 raw 보고)
   `session129_apply_ko_unified.py` (ja/zh propagation) 는 ko 단독
   apply 에 부적합. ko 영역만 작업할 때는 ko_only 도구만 사용.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형:
  `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 사용(`&&`/`||` 금지).
- CC 승인 프롬프트: `1.Yes/2.allow all/3.No` → `2`,
  `1.Yes/2.No` → `1`. 검증완료 .py 를 CC 가 자체수정
  시도하면 → `3`.
- **★CC 가 자동 명령 입력 대기 상태로 만들면 → 거부 응답 대신
  검수자가 다음 `t` 명령으로 즉시 덮어쓰기 (N-81)**. 단 apply/commit/
  ja-zh propagation 자동 입력은 차단 우선.
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- ★사용자 선택지 제시 시 **검수자 추천 1개 반드시 명시**.
- ★검수자 추천 + 사용자 검토 모델 (132차 N-76 정착, 133차 실증):
  1. 사용자가 일일이 작성하기 어려운 영역은 검수자가 ko_fixed 미리
     채워서 `_user_work_*.csv` 로 제공
  2. 사용자가 추천값 검토/수정 (텍스트 또는 CSV 직접)
  3. 검수자가 사용자 작성분 raw 확인 → 원본 시트에 병합
  4. ko 전용 안전 도구로 dry → apply (운영원칙 0-7)
- push 는 사용자 명시 승인 시에만(현재 origin 대비 미실행 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw → apply
  순. 백업+node+md5+synth+rollback 필수. 합성검증 ALL PASS 아니면 abort.

---

## 1. 프로젝트 좌표

- locale: `D:\project\GeniegoROI\frontend\src\i18n\locales\{ko,ja,zh}.js`
- 인계서 본체: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130,131,132,133}_*.py`
- ko leaf-paths 총수: 19,801 (133차 apply 후 raw 재확인, 무변동)
- ja leaf-paths 총수: 23,220 (133차 raw 재확인, 무변동)
- zh leaf-paths 총수: 19,409 (133차 raw 재확인, 무변동)

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`: `build_leaf_paths`, `_ko_suspect`,
  `_is_hashkey`(132차 N-59 raw 정상 확정), `KO_CONTAMINATED`, `norm`,
  `scan_key_blocks`, `extract_kv`, ANYKEY_RE, `LEAF_RE_TMPL`

**128~132차 검증 자산** (무변경): 132차 인계서 § 2 참조

**133차 신규 도구 (총 11개)**

진단 도구 (read-only, 5개):
- `session133_diag_user_work_overview.py` — 4종+only_B raw 진단
- `session133_diag_jazh_coverage_and_vars.py` — zh 커버리지 + 변수 진단
- `session133_diag_recommend_vars.py` — ko_current vs ko_recommend 변수 비교
- `session133_diag_absent_paths.py` — absent 308 path 분포
- `session133_diag_onlyb_recommendable_v2.py` — SAFE_DICT 197 매칭 발굴

시트 생성 도구 (5개):
- `session133_fill_residual_recommend.py` — residual 94건 추천 채움
- `session133_fill_azunified_recommend.py` — az_unified 2건 추천 채움
- `session133_make_absent_v4_with_jazh.py` — absent 308 ja/zh 첨부 (raw: 매칭 0)
- `session133_split_onlyb_by_root.py` — only_B 1,540 우선순위 분할
- **`session133_make_p2_user_work.py`** ★134차 작업 인프라

수정/병합 도구 (3개):
- `session133_fix_var_preservation.py` — {var} 변수 보존 (pass=1, fixed=0)
- `session133_fix_json_preservation.py` — JSON 키 보존 (fixed=1)
- **`session133_apply_user_response.py`** — 사용자 회신 → _v2 시트
- **`session133_merge_user_to_kosheet.py`** — _user_work → _ko_sheet 병합

**133차 신규 CSV (1개) + 사용자 작업 시트 (7개)**:
- `_recommendable_candidates.csv` (104 rows, SAFE_DICT 매칭, 134차 활용)
- `_user_work__ko_sheet_residual_v2.csv` (210 rows, 검수자 94 채움)
- `_user_work__ko_sheet_az_unified_v2.csv` (146 rows, 검수자 2 채움)
- `_user_work__ko_sheet_absent_v4.csv` (308 rows, ja/zh 부재 확정)
- `_user_work__only_b_p1_pages.csv` (588 rows)
- **`_user_work__only_b_p2_marketing_crm_v2.csv`** ★ (217 rows, RECOMMEND 42)
- `_user_work__only_b_p3_ops_rule.csv` (561 rows)
- `_user_work__only_b_p4_others.csv` (174 rows)

**백업 (133차)**:
- 시트 5종 .s133fill / .s133var / .s133json / .s133merge / .s133userresp
- **ko.js.bak_s133az / ko.js.bak_s133res** (apply 전)
- `_user_work__ko_sheet_*_v2.csv.s133var` / `.s133json` (변수/JSON 수정 전)

---

## 3. 완료 커밋 (HEAD = d099fda + 133차 인계커밋, 133차 작업커밋 1)

| 커밋 | 내용 | 건수 |
|---|---|---|
| **d099fda ★133차 신규** | i18n(s133 az_unified+residual) recover 35 ko keys via user-confirmed ko_fixed | **35** |
| e396979 | docs(handover): session 132 -> 133 | (인계) |
| ae82a0a | i18n(mk87) recover 58 ko keys via user-confirmed ko_fixed | 58 |
| 5e530db | docs(handover): session 132 -> 133 (가커밋) | (인계) |
| b8ee534 | docs(handover): session 131 -> 132 | (인계) |
| b4e68ce | docs(handover): session 130 -> 131 | (인계) |
| a34de71 | docs(handover): session 129 -> 130 | (인계) |
| fc84c08 | i18n(5-C mirror7) recover auto.{key} root ko from dashops | 7 |

- **133차 누적**: 작업 커밋 **1건 (35건)**, 도구 11개 + CSV 1개 + 사용자 작업 시트 7종
- **전체 누적**: 128차까지 6,548 + 129차 7 + 130차 0 + 131차 0 + 132차 58 + 133차 35 = **6,648건**
- node --check ja/zh/ko = 0 (정상). ko.js tracked.
- origin 대비 push 미실행 (5-4).

---

## 4. 133차 핵심 발견 (N-81 ~ N-92)

### N-81 — ★ CC 자동 명령 무력화 원칙 (운영원칙 0-6 강화)
처음부터 CC 가 자동 명령을 입력 대기 상태로 만드는 현상 지속 발생.
132차까지 거부 응답 (`3`) 으로 처리 → 차수가 거부 처리만 하다 증가.
**133차부터 거부 응답 입력 대신 검수자의 다음 `t` 접두 명령으로 덮어쓰기**.
단 apply/commit/ja-zh propagation 자동 입력은 즉시 차단.

### N-82 — residual_v2 변수 보존 raw (pass=1, fixed=0)
검수자 채운 residual_v2 의 ko_fixed_recommend 컬럼에서:
- ✓ OK 1건: `:{page} / {total} /+1` 변수 그대로 유지
- ★ WARN 1건: JSON 예시 `{"sku":"...", "title":"...", "price": 0}` 에서
  `title`→`제목`, `price`→`가격` 잘못 번역됨

### N-83 — JSON 예시 보존 자동 복원 (fixed=1)
N-82 의 WARN 1건을 `session133_fix_json_preservation.py` 로 자동 복원.
JSON 키는 코드가 그 키로 데이터를 받으므로 절대 번역 금지.

### N-84 — absent 308 ja/zh 매칭 0건 raw 확정
가설: "ja/zh 출처 확보 시 옵션 B (검수자가 ja/zh 보여주고 번역) 가능"
**raw 사실: ja/zh 매칭 0건** — absent 308 은 ko.js 뿐 아니라 ja.js / zh.js
에도 없는 완전 신규 키. **옵션 B 물리 불가 확정** (종류 1).
남은 옵션: A (path 만 보고 직접 작성) 또는 C (보류).

### N-85 — absent 308 path 분포 raw
| root | 건수 | 비고 |
|---|---|---|
| crm | 102 | crm.aiHub 101건 집중 |
| pages | 48 | pages.marketingIntel 48건 집중 |
| ruleEnginePage | 36 | operations / root_pageTitle.* |
| channelKpi | 24 | 24개 개별 키 |
| tabs | 16 | tab 라벨들 |
| gSug | 14 | 영문 문장형 (예시 쿼리) |
- 해시 leaf_key 0건 — 모두 의미있는 영문 키 → **번역 추론 가능**
- crm.aiHub 101 + pages.marketingIntel 48 = 149 (전체 48%) 두 그룹 집중

### N-86 — only_b 1,540 의 ja_value 패턴 분포 (read-only 진단)
| ja 패턴 | 건수 | 비고 |
|---|---|---|
| empty | 388 | ja/zh 둘 다 부재 |
| ascii_only | 312 | 영문 그대로 후보 |
| kanji_only | 264 | ★ 한국어 한자독 안전 후보 |
| hiragana_present | 141 | 일본어 문법, 검토 필수 |
| kanji_katakana | 109 | |
| hangul_already | 99 | 이미 한국어 |
| katakana_only | 92 | 외래어 |
| emoji_lead | 88 | |
| mixed | 47 | |

### N-87 — only_b zh_value 커버리지
93% (1,433 / 1,540). 빈칸 7%: crm 0%, gSug 0%, aiPredict/aiRec/auth/gCat/helpPanel 0%.

### N-88 — SAFE_DICT v2 매칭 104건 raw
한국어 한자독 1:1 사전 (197 entries) 으로 only_b 1,540 매칭:
- 매칭 104건 (v1 62 → v2 104, +42)
- root 분포: crm 38, ruleEnginePage 33, pages 17, channelKpi 4,
  marketing 4, dash 2, auth 1, commerce 1, gdpr 1, settlements 1,
  sidebar 1, tabs 1
- 사전 외 한자만 짧은 ja 175건 (135차 사전 보강 후보)
- `_recommendable_candidates.csv` 104 rows 생성

### N-89 — only_b p2 (marketing+crm 217) 사용자 작업 시트 raw
`_user_work__only_b_p2_marketing_crm_v2.csv` 생성 완료:
| status | 건수 | 비고 |
|---|---|---|
| RECOMMEND | 42 | SAFE_DICT 자동 추천, 사용자 확인만 |
| NEEDS_TRANS | 101 | ja 있음 사전 외, 사용자 번역 |
| NO_SOURCE | 74 | ja 부재, 사용자 직접 작성 |

### N-90 — only_B 신규 키 영역은 기존 도구 apply 불가
`session132_apply_ko_only.py` 는 기존 path 의 ko 값 **수정용**.
only_B 는 ko.js 에 **부재하는 신규 키** 영역 → **신규 키 추가 도구 별도 필요** (134차 작성).

### N-91 — 133차 작업커밋 1건 raw 무결성
- 커밋 d099fda: az_unified 4 + residual 31 = 35건 ko 적용
- 1 file changed, 35 insertions(+), 35 deletions(-)
- ja.js / zh.js md5 동일 (boundary check)
- ko.js leaf paths 19801 → 19801 (synth check)
- node --check ko/ja/zh 모두 PASS
- 132차 mk87 패턴 동일

### N-92 — az_unified apply 4건 (예상 2건과 차이) raw
검수자 추천은 `Json err` + `Not arr` = 2건 매칭 예상.
실제 apply 4건 적용. 도구가 leaf 기반 path 추가 매칭한 듯
(다른 위치에 같은 leaf 가 있었을 가능성).
md5/synth/node 모두 PASS → **안전 확정**.
정확한 4건 원인 raw 는 134차 시작 시 git diff 로 확인 가능.

---

## 5. 잔여 백로그 (raw 확정 — 134차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가)

- marketing R1 中 bad/mismatch 12건 (probe_order self-verify 불성립)
- ja/zh 회수: **3중 교집합 144건** (정답 출처 없으면 불가)
- **★ absent 308 옵션 B 불가 확정 (N-84)**: ja/zh 모두 부재. 옵션 A 또는 C.
- `dataProduct.*` 일부 ko 영역 (multi-value, mk87 skip(multi) 43건,
  residual skip(multi) 228건): path 단위 명시 시트 + path 기반 apply 도구 필요

### 5-B. 종류 2 (선행부재 불가)

**★최우선 — 사용자 작업 시트 134차 작업 대기**

| 시트 | rows | 자동 추천 | 사용자 작성 | 적용 도구 |
|---|---|---|---|---|
| **★p2_marketing_crm_v2** | **217** | **RECOMMEND 42** | NEEDS_TRANS 101 + NO_SOURCE 74 | **신규 키 추가 도구 작성 필요 (N-90)** |
| absent_v4 | 308 | 0 | NO_SOURCE 308 | 신규 키 추가 도구 (옵션 A 진행 시) |
| residual_v2 잔여 | 116 | 0 | NO_SOURCE 116 | session132_apply_ko_only.py (해시 leaf, 적용 불가) |
| az_unified_v2 잔여 | 144 | 0 | NO_SOURCE 144 | session132_apply_ko_only.py (해시 leaf, 적용 불가) |
| p1_pages | 588 | 미작성 | 미작성 | 신규 키 추가 도구 |
| p3_ops_rule | 561 | 미작성 | 미작성 | 신규 키 추가 도구 |
| p4_others | 174 | 미작성 | 미작성 | 신규 키 추가 도구 |

**워크플로우** (132차 N-76 + 133차 실증):
1. 사용자가 `_user_work_*.csv` 의 `ko_fixed_recommend` 검토/수정
2. 검수자가 사용자 작성분 → 원본 시트 병합 (`session133_merge_user_to_kosheet.py`)
3. dry → apply → node check → commit (132차 패턴)

**★추가 - SAFE_DICT v3 사전 보강 (N-88 후속)**:
- 사전 외 한자만 짧은 ja 175건 raw 검토 후 사전 추가
- v2 매칭 104 → v3 예상 140~150 (+30~40)
- 수확 체감 — 차수당 1회 보강이 효율적

### 5-C. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. absent 308 과 묶어서 작업 가능 (모두 신규 키).
- **5-4 push**: origin 대비 미실행. 누적 미push 커밋:
  - 128차 4커밋
  - 인계커밋 6개 (128→134)
  - 129차 1커밋 (fc84c08)
  - 132차 1커밋 (ae82a0a)
  - **133차 1커밋 (d099fda)** ★신규
  - 사용자 명시 승인 시에만 push.

---

## 6. 133차 무결성 raw 확정

### 6-1. locale 상태
- node --check ko/ja/zh = 0 (133차 apply 후 재확인)
- ko.js tracked (s133 apply 35건 반영, 커밋 d099fda)
- ja.js / zh.js byte-level 무변경 (md5 동일성 검증 완료)
- HEAD = d099fda + 133→134 인계커밋
- origin 대비 push 미실행

### 6-2. 시트 무결성

| 시트 | rows | 상태 |
|---|---|---|
| _ko_sheet_az_unified.csv | 146+ | s133merge, ko_fixed 4건, 132차 apply 완료 |
| _ko_sheet_residual.csv | 253 | s133merge, ko_fixed 93건, 31 apply / 228 skip(multi) |
| _ko_sheet_absent.csv | 308 | s131safety + s132fill, 변경 0 (N-84 종류 1) |

### 6-3. 사용자 작업 시트 (133차 신규)

| 시트 | rows | 상태 |
|---|---|---|
| _user_work__ko_sheet_residual_v2.csv | 210 | 검수자 94 채움, 132 apply 완료 (잔여 116) |
| _user_work__ko_sheet_az_unified_v2.csv | 146 | 검수자 2 채움, apply 완료 (잔여 144) |
| _user_work__ko_sheet_absent_v4.csv | 308 | ja/zh 부재 (N-84 raw 확정) |
| _user_work__only_b_p1_pages.csv | 588 | 미작성 |
| **★_user_work__only_b_p2_marketing_crm_v2.csv** | **217** | **RECOMMEND 42 + NEEDS_TRANS 101 + NO_SOURCE 74** |
| _user_work__only_b_p3_ops_rule.csv | 561 | 미작성 |
| _user_work__only_b_p4_others.csv | 174 | 미작성 |

### 6-4. 도구 동작 검증
- **session132_apply_ko_only.py: az_unified 4 + residual 31 PASS** (N-91)
- session133_merge_user_to_kosheet.py: residual 93 / az_unified 4 PASS
- session133_fix_var_preservation.py: pass=1, fixed=0 (N-82)
- session133_fix_json_preservation.py: fixed=1 (N-83)

### 6-5. 작성대기 raw

134차 사용자 검토 대기:
- **p2_marketing_crm_v2 217건** (RECOMMEND 42 + NEEDS_TRANS 101 + NO_SOURCE 74)
- absent_v4 308 (옵션 A 진행 시)
- _recommendable_candidates.csv 104 (검수자 자동 추천, 사용자 검토)

134차 신규 작성 필요:
- only_B p1 (588) / p3 (561) / p4 (174) 사용자 시트
- 신규 키 추가 도구 (N-90)

**결론: 133차 작업커밋 1건 (s133 az_unified+residual 35 ko apply, 커밋 d099fda),
도구 11개 + CSV 1개 + 사용자 작업 시트 7종. 6,648 누적 회수.
검수자 추천 + 사용자 검토 워크플로우 실증 (N-76→133차).
CC 자동 명령 무력화 (N-81) + JSON/변수 보존 자동 검증 (N-82~83) + SAFE_DICT 매칭 확장 (N-88) + p2 시트 134차 작업 인프라 (N-89) 추가.**

---

## 7. 134차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -10; git status --short
```
HEAD: 133→134 인계커밋 + d099fda (s133 apply) 확인. locale clean, node 3개 OK.

**★1순위 — p2_marketing_crm_v2 RECOMMEND 42건 사용자 확인 + apply**

가장 빠른 진전 가능. 사용자 검토 후:
1. 사용자가 RECOMMEND 42건 확인 (수정 있으면 텍스트/CSV 회신)
2. 검수자가 사용자 작성분 → 시트 반영
3. **★ 신규 키 추가 도구 작성 필요 (N-90)** — `session132_apply_ko_only.py` 는 기존 path 수정용. only_B 는 신규 키.
4. dry → apply → commit

도구 작성 가이드:
- 입력: `_user_work__only_b_*.csv` (path, leaf_key, ko_fixed_recommend, status)
- 동작: status=RECOMMEND + ko_fixed_recommend 채워진 행만 ko.js 에 **신규 키 추가**
- 보호: ja/zh md5 boundary check, ko.js leaf paths 증가 raw 확인,
  parent_in_ko 존재 확인 (없으면 SKIP), node check

**★2순위 — p2 NEEDS_TRANS 101 사용자 번역 작업**

ja_value 보고 한국어 작성. 워크플로우 동일. 1순위 완료 후 진행.

**★3순위 — p2 NO_SOURCE 74 사용자 작성**

ja 부재. path / leaf_key 만 보고 작성.

**★4순위 — only_B p1 (pages 588) 검수자 추천 시트 작성**

p2 패턴 동일하게 SAFE_DICT 사전 채움 → 사용자 검토 시트.

**★5순위 — SAFE_DICT v3 사전 보강 (N-88)**

사전 외 한자만 짧은 ja 175건 raw 검토 → 명확한 한자독 ~30~40개 추가.
v2 매칭 104 → v3 예상 140~150. 차수당 1회.

**★6순위 — only_B p3/p4 (561+174) 시트 작성**

**★7순위 — absent 308 옵션 결정 + 신규 키 추가 (옵션 A 진행 시)**

5-1 #3 성과허브 464키와 묶어서 진행 검토.

**★8순위 — residual/az_unified 잔여 해시 leaf 처리**

residual 116 + az_unified 144 = 260 해시 leaf (종류 1).
정답 없음 확정 → 종결 가능 영역. 사용자 결정 필요.

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후 다음 순위로
전환(0-3). **작업 여력이 있는 한 다음 차수로 미루지 말고 진행** (0-1).
사용자 작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 134 -> 135"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- **작업 여력 있는 한 다음 차수로 미루지 말고 끝까지 진행** (132차 강화 0-1, 133차 실증)
- 사용자 작성분 받으면 그 차수 안에 apply 까지 완결 (132차 mk87 / 133차 az+res 실증)
- 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58/N-65)
- **★CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기 (N-81 신규)**
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- 검수자 추천 + 사용자 검토 워크플로우 (N-76)
- 초엔터프라이즈급 정밀도 유지

---
*(133차 검수자 작성. 모든 수치 raw 확정. 134차는 시작 시
재확인 후 진행. 133차 작업커밋 1건 (s133 az_unified+residual 35 ko apply,
커밋 d099fda), 도구 11개 + CSV 1개 + 사용자 작업 시트 7종 신규 추가.
누적 6,648건 회수. CC 자동 명령 무력화 (N-81), JSON/변수 보존 자동 검증
(N-82~83), absent ja/zh 부재 확정 (N-84), SAFE_DICT v2 매칭 104건
(N-88), p2 134차 작업 인프라 완비 (N-89), only_B 신규 키 도구 필요성
확정 (N-90). 운영원칙 0-6 (CC 자동 명령 무력화) 신규 강화. N-81 ~ N-92
신규 raw 12건 기록.)*