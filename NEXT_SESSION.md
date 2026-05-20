# GenieGoROI i18n 인계서 — 135차 시작점

> 본 문서는 134차 검수자가 전체 작성. 135차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 135차 시작 시
> raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로 0/부재를
> 입증해야 보류가 정당.

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★작업 여력 최대 활용 (132차 사용자 명시·강화, 133차 실증, 134차 재실증)**:
   작업 여력이 있으면 절대 다음 차수로 미루지 않는다. 부분 종결이
   가능하면 진행하고, 추가 측정·발굴·도구작성·apply 까지 가능하면
   끝까지 한다. 인계서만 작성하다 차수만 증가시키지 말 것. 사용자
   작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결한다.
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
   (N-17/N-25, 129차 강화, 131차 N-58, 132차 N-65 재확인, 133차 실증,
   134차 재실증)**: ko_fixed 자동 결정 금지. **단, 추천값 제시 후 사용자
   확정 받는 워크플로우는 허용** (132차 N-76 정착 — 검수자 추천
   + 사용자 검토 모델, 133차 실증, 134차 대규모 실증).
6. **★CC 자동 명령 무력화 원칙 (133차 N-81 신규 강화, 134차 정착)**:
   CC 가 자동으로 명령을 입력 대기 상태로 만드는 현상은 처음부터
   계속 발생. **거부 응답 입력하지 않고, 검수자의 다음 `t` 접두
   명령을 입력해서 자동 명령을 덮어쓰는 방식으로 무력화**. 거부
   명령에 시간 소비 금지. 예외: CC 가 `apply` / `commit` / `push` /
   검증완료 .py 자체수정 등 치명적 작업을 자동 입력했을 때는 즉시
   차단 (다른 무해 명령으로 덮어쓰기). ja/zh propagation 도구
   (`session129_apply_ko_unified.py`) 자동 입력은 절대 차단 — ja/zh
   변경 위험. **134차 push 자동 명령 발생 시 무력화 정상 작동 (N-100)**.
7. **★ko 전용 안전 apply 도구 패턴 (132차 N-79, 133차 실증, 134차
   신규 키 추가 도구로 확장)**:
   - 기존 path ko 값 수정: `session132_apply_ko_only.py`
   - **★신규 키 추가 (only_B 영역)**: `session134_apply_new_keys.py` ★134차 정착
     - ja/zh md5 boundary check (변경 시 즉시 abort)
     - parent_in_ko 가 ko.js 에 실제 존재 확인 (없으면 SKIP)
     - **depth-aware 매칭** (top-level 키는 depth=1 만, 다중 매칭 시 ambiguous)
     - leaf 중복 확인 (이미 있으면 SKIP) + apply-time dup 재확인 (이중 안전장치)
     - ko.js leaf paths 증가 raw 확인 (정확히 적용수만큼)
     - 신규 leaf set 에 적용 path 들어왔는지 확인 (잘못된 위치 삽입 차단)
     - node --check ko.js PASS 필수 (★ tmp 파일 확장자 `.js` 필수 — N-95)
     - 백업 자동 + 실패/abort 시 즉시 롤백
     - `--apply` 없이는 dry-run 기본
8. **★only_b 분류 신뢰 금지 원칙 (134차 N-93 신규 강화)**:
   132차 only_b 분류 도구는 leaf_key 가 동일한 다른 path 의 호출/존재를
   고려하지 않음. **only_b 영역 작업 전 반드시 코드 호출 검증 필수**:
   - p1 588: 코드 호출 0건 → **전부 분류 오류** (N-93 확정)
   - p2 217: 진짜 신규 50건만 (23%)
   - p3 561: 진짜 신규 173건만 (31%)
   - p4 174: 진짜 신규 10건만 (6%)
   - **검증 도구**: 정확한 path 가 frontend/src 에서 grep 호출되는지

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형:
  `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 사용(`&&`/`||` 금지).
- CC 승인 프롬프트: `1.Yes/2.allow all/3.No` → `2`,
  `1.Yes/2.No` → `1`. 검증완료 .py 를 CC 가 자체수정
  시도하면 → `3`.
- **★CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 즉시 덮어쓰기 (N-81)**.
  단 apply/commit/push/ja-zh propagation 자동 입력은 차단 우선.
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- ★사용자 선택지 제시 시 **검수자 추천 1개 반드시 명시**.
- ★검수자 추천 + 사용자 검토 모델 (132차 N-76 정착, 133차 실증, 134차 대규모 실증):
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
- 작업 도구: `D:\project\GeniegoROI\session{125,128,129,130,131,132,133,134}_*.py`
- ko leaf-paths 총수: **19,833** (134차 apply 3건 후 raw 확인, +32 from 134차 시작)
- ja leaf-paths 총수: 23,220 (134차 raw 재확인, 무변동)
- zh leaf-paths 총수: 19,409 (134차 raw 재확인, 무변동)

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`: `build_leaf_paths`, `_ko_suspect`,
  `_is_hashkey`(132차 N-59 raw 정상 확정), `KO_CONTAMINATED`, `norm`,
  `scan_key_blocks`, `extract_kv`, ANYKEY_RE, `LEAF_RE_TMPL`

**128~133차 검증 자산** (무변경): 133차 인계서 § 2 참조

**134차 신규 도구 (총 19개)**

핵심 apply 도구 (★1개 — 차수 영구 자산):
- **`session134_apply_new_keys.py`** ★★★ — 신규 키 추가 도구 (depth-aware, 초엔터프라이즈)
  - parent_in_ko 검증, leaf 중복, ambiguous 차단, ja/zh md5 boundary,
    synth check, tmp `.js` 확장자, 백업 + 자동 롤백
  - ko_final > ko_recommend > ko_fixed_recommend 우선순위 자동 인식
  - status='RECOMMEND' 만 적용, 'SKIP' 명시 시 제외

진단 도구 (read-only, 9개):
- `session134_diag_p2_sample.py` — p2 컬럼/샘플 raw
- `session134_diag_parent_check.py` — RECOMMEND parent 존재 검증
- `session134_diag_marketing.py` — marketing 키 위치 (4곳 발견)
- `session134_diag_marketing2.py` — marketing 4중 블록 분석
- `session134_diag_marketing3.py` — depth-aware 진단 (depth=1 식별)
- `session134_diag_crm_email.py` — crm.email 안전성 검증
- `session134_diag_usage.py` — crm.email 38 호출 검증 (0건)
- `session134_diag_onlyb_classification.py` — ★only_b 4시트 전체 분류 (N-93)
- `session134_diag_p1_dup_called.py` — p1 588 회수 가능성 (0건)
- `session134_diag_e2.py` — p3/p4 dup 회수 가능성
- `session134_diag_needs_trans.py` — NEEDS_TRANS ja 패턴 분석

시트 생성/처리 도구 (9개):
- `session134_make_crm_only.py` — marketing 4건 SKIP CSV 생성
- `session134_extract_real_new.py` — 진짜 신규 233건 + SAFE_DICT v2 1차 매칭
- `session134_ba_combined.py` — SAFE_DICT v3 + parent root 분할 (B+A)
- `session134_e3_extract.py` — p3/p4 dup_called 회수 후보 추출 (43건)
- `session134_user_work_setup.py` — parent root 별 사용자 시트 + 가이드
- `session134_make_all.py` — 201건 통합 단일 파일
- `session134_fill_recommendations.py` — zh→ko 사전 167건 자동 추천
- `session134_extract_star1.py` — ★ 문장급 34건 추출
- `session134_fill_star1.py` — ★ 문장급 34건 검수자 직접 추천 (201/201)

**134차 신규 CSV/TXT (총 20개)** — 사용자 작업 인프라:
- `s134_real_new_review.csv` (233 rows) / `s134_real_new_review_v3.csv` (v3)
- `s134_e3_recoverable.csv` (43 rows, RECOMMEND 2)
- `s134_user_<root>.csv` (5개: operations, marketing, ruleEnginePage, gdpr, reportBuilder)
- `s134_user_<root>.txt` (각 영역별 가이드)
- `s134_user_GUIDE.txt` (종합 가이드)
- `s134_user_ALL.csv` / `s134_user_ALL.txt` (통합)
- **`s134_user_ALL_v2.csv`** (zh→ko 167건 자동 추천)
- **★`s134_user_ALL_v3.csv`** ★★★ — **최종 사용자 작업 파일 (201/201 검수자 추천 100%)**
- `s134_user_ALL_v3.txt` (검토용 전체 보기)

**백업 (134차)**:
- `ko.js.bak_s134newkeys_<timestamp>` 3개 (각 apply 별, 모두 PASS 후 보존)

---

## 3. 완료 커밋 (HEAD = b45ce39 + 134차 인계커밋)

| 커밋 | 내용 | 건수 |
|---|---|---:|
| **b45ce39 ★134차 작업3** | i18n(s134-e3) recover 2 ko leafs from dup_called analysis | **+2** |
| **48acb3d ★134차 작업2** | i18n(s134-v3) add 21 new ko leafs via SAFE_DICT v3 expansion | **+21** |
| **d3a0ab8 ★134차 작업1** | i18n(s134) add 9 new ko leafs to marketing/operations | **+9** |
| 4b10fd1 | docs(handover): session 133 -> 134 | (인계) |
| d099fda | i18n(s133 az_unified+residual) recover 35 ko keys | 35 |
| e396979 | docs(handover): session 132 -> 133 | (인계) |
| ae82a0a | i18n(mk87) recover 58 ko keys via user-confirmed ko_fixed | 58 |
| 5e530db | docs(handover): session 132 -> 133 (가커밋) | (인계) |
| b8ee534 | docs(handover): session 131 -> 132 | (인계) |
| b4e68ce | docs(handover): session 130 -> 131 | (인계) |
| a34de71 | docs(handover): session 129 -> 130 | (인계) |
| fc84c08 | i18n(5-C mirror7) recover auto.{key} root ko from dashops | 7 |

- **134차 누적**: 작업 커밋 **3건 (+32 leaf — 19801 → 19833)**, 도구 19개, CSV/TXT 20개
- **전체 누적**: 128차까지 6,548 + 129차 7 + 130차 0 + 131차 0 + 132차 58 + 133차 35 + **134차 32** = **6,680건**
- node --check ja/zh/ko = 0 (정상). ko.js tracked.
- origin 대비 push 미실행 (5-4).

---

## 4. 134차 핵심 발견 (N-93 ~ N-104)

### N-93 — ★★★ only_b 분류 전체 신뢰 금지 (134차 최대 발견)
132차 only_b 분류 도구는 ja/zh 와 ko 의 path 차이만 보고 분류했으나,
**leaf_key 가 동일한 다른 path 의 호출/존재를 검증하지 않음**:
- p1 588: 정확한 path 코드 호출 0건 → **전부 분류 오류 확정**
- p2 217: 진짜 신규 50건만 (23%)
- p3 561: 진짜 신규 173건만 (31%)
- p4 174: 진짜 신규 10건만 (6%)
- 합계 1,540 → 진짜 신규 233건 (15%)
- 나머지 1,307건 = 분류 오류 (종류 1) 또는 죽은 키 위험

**135차 이후 only_b 작업 시 반드시 코드 호출 grep 검증 선행**.

### N-94 — ★ marketing 키 ko.js 에 4중 블록 존재 (depth-aware 매칭 필요성)
ko.js 에 `marketing:{` 키가 4곳 존재 (line 6385/10437/33794/38301).
- depth=1 진짜 top-level: line 33794 (body 29978) 만 정답
- 나머지 3개는 중첩 블록 (nav.pages 등 안)
- 단순 첫 매칭 도구는 잘못된 위치 삽입 → ★★ apply 도구 강제 종료 후
  depth-aware 매칭으로 강화 (`session134_apply_new_keys.py`)

### N-95 — node 24 ESM 확장자 제약
node --check 가 ESM 모드에서 `.tmp_s134` 등 알 수 없는 확장자 거부.
**해결**: 임시 파일 확장자 반드시 `.js` (예: `ko.js.tmp_s134.js`).
도구에 반영 완료.

### N-96 — depth_at 정의 raw 확정
JS export object 의 직속 자식 키는 **`depth_at(key_pos) == 1`** (export `{`
가 depth 0→1 으로 만든 후 그 내부).
- 초기 도구는 `d == 0` 기대 → marketing top-level 못 찾음
- 수정: `d == 1` 로 정정 후 정상 매칭

### N-97 — apply-time leaf 중복 재확인 (이중 안전장치)
도구가 path 변환 후 같은 parent 에 leaf 삽입할 때, 사전 ko_leaf_set 에
없어도 **block_body 안에 leaf_key 가 이미 있을 수 있음** (`build_leaf_paths`
가 인식 못한 변종 등). 실제 발생: `helpPanel.staticHelp.connectors.steps`
가 apply-time dup 으로 SKIP — 이중 안전장치 정상 작동.

### N-98 — applied paths in new leaf set 검증의 중요성
apply 후 leaf count 가 +N 이어도 **삽입 위치가 잘못되면 path 가 leaf set
에 안 들어옴**. 1차 apply 시 `marketing.csColName` 등 4건이 +4 leaf 증가
했으나 신규 set 에 부재 → abort 후 롤백. 이 검증으로 잘못된 위치 삽입
조기 차단.

### N-99 — ★ SAFE_DICT v3 확장 효과 raw
v2 33 entries → v3 60+ entries (한자독 + 외래어 + 자주 출현 동작/명사):
- p2 217 NEEDS_TRANS 222건 중 v2 매칭 10건만 → v3 +21건 신규 매칭
- 가성비 우수 — 차수당 1회 보강 정착

### N-100 — ★ CC push 자동 명령 무력화 실증 (N-81 강화)
134차 apply 후 CC 가 `git push origin master` 자동 입력 → 다음 `t git log`
명령으로 즉시 덮어쓰기 → push 차단 + 다음 작업 진입. N-81 원칙 정상 작동.

### N-101 — p1 588 회수 가능성 raw 확정 = 0건
nav.pages 변환 가설 (`pages.X.Y` → `nav.pages.X.Y`) 매칭 0건.
다른 path 호출 + ko.js 부재 조합도 0건. **p1 영역 자동 회수 = 0건** (종류 1).

### N-102 — p3/p4 dup_called 회수 38건 (parent OK 15건)
- p3 dup_called 회수 가능: 14건
- p4 dup_called 회수 가능: 24건
- 합 38건 중 parent 존재 + RECOMMEND = 2건만 즉시 적용
- 나머지 36건은 parent 부재 (선행 필요) 또는 NEEDS_TRANS/NO_SOURCE

### N-103 — truly_new with ja 121건 (보류 결정)
정확한 path 호출 없음 + 다른 path 호출 없음 + ja/zh 만 존재.
신규 추가 시 **죽은 키 위험** (코드가 그 키를 부르지 않음).
→ 보류 (종류 1 준한 대우, 정답 호출 출처 부재).

### N-104 — ★ 검수자 추천 100% 채움 워크플로우 정착
NEEDS_TRANS 201건 전체에 검수자 추천 ko_recommend 채움:
- zh→ko 자동 사전 매칭: 167건 (★★★ 100% / ★★ 97% / ★ 0%)
- ★ 문장급 34건 검수자 직접 작성 (`session134_fill_star1.py` 내 RECOMMENDATIONS dict)
- **사용자 작업 부담 = 검토만 (직접 작성 0건)** ★★★ 134차 새 워크플로우 표준

---

## 5. 잔여 백로그 (raw 확정 — 135차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 자동 회수 0건 확정)

- **★ p1 588건 전부**: nav.pages 변환 매칭 0건, 코드 호출 0건 (N-101)
- p3/p4 dup_in_ko_only / dup_called parent 부재 후 잔여
- **truly_new with ja 121건**: 호출 없음 (N-103, 죽은 키 위험)
- marketing R1 中 bad/mismatch 12건 (probe_order self-verify 불성립)
- ja/zh 회수: **3중 교집합 144건** (정답 출처 없으면 불가)
- absent 308 옵션 B 불가 확정 (133차 N-84): ja/zh 모두 부재
- residual 116 + az_unified 144 = 260 해시 leaf (정답 부재)
- `dataProduct.*` 일부 ko 영역 (multi-value, mk87 skip(multi) 43건,
  residual skip(multi) 228건): path 단위 명시 시트 + path 기반 apply 도구 필요

### 5-B. 종류 2 (선행부재 불가) ★ 최우선

**★★★ 1순위 — 사용자 v3 시트 검토 + apply (135차 즉시 가능)**

| 시트 | rows | 자동 추천 | 사용자 부담 | 적용 도구 |
|---|---:|---:|---|---|
| **★`s134_user_ALL_v3.csv`** | **201** | **201 (100%)** | **검토만** | `session134_apply_new_keys.py` |

워크플로우:
1. 사용자가 v3 CSV 열어서 ko_recommend 검토 → 그대로 OK 면 빈칸 / 수정 시 ko_final / 거부 시 SKIP
2. 검수자가 v3 시트 raw 확인 → `--csv s134_user_ALL_v3.csv` 로 dry
3. dry PASS → apply → commit
4. 예상 적용 건수: 201건 - SKIP 일부 = **~180~201건 추가 회수 가능**

**2순위 — absent 308 옵션 A (사용자 직접 작성 영역)**

- absent_v4 308 (ja/zh 부재, path/leaf_key 만)
- crm.aiHub 101 + pages.marketingIntel 48 두 그룹 집중 (133차 N-85)
- 모두 의미있는 영문 키 → 사용자가 path 보고 한국어 작성
- **검수자 추천 가능 영역도 있음**: leaf_key 가 영문 단어 (예: `pageTitle`, `tabAll`)
  은 자동 추천 가능. 134차 패턴 적용 가능

**3순위 — p3/p4 dup_called parent 부재 36건 (parent 추가 선행 필요)**

- E3 추출 결과 중 parent 부재로 SKIP 된 영역
- parent 생성 가능 여부 raw 검증 후 진행

**4순위 — only_B p3/p4 NEEDS_TRANS 잔여 (v3 적용 후 남은 영역)**

- v3 적용 시 ★ 문장급 부분 SKIP 되면 잔여 발생
- 사용자 거부 항목 검수자 재추천 가능

**5순위 — SAFE_DICT v4 사전 보강 (차수당 1회)**

- 사전 외 한자/외래어 자주 출현 패턴 추가
- 가성비 점진 감소 — 우선순위 낮음

### 5-C. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. absent 308 과 묶어서 작업 가능.
- **5-4 push**: origin 대비 미실행. 누적 미push 커밋:
  - 128차 4커밋
  - 인계커밋 7개 (128→135)
  - 129차 1커밋 (fc84c08)
  - 132차 1커밋 (ae82a0a)
  - 133차 1커밋 (d099fda)
  - **134차 3커밋 (d3a0ab8, 48acb3d, b45ce39)** ★신규
  - 사용자 명시 승인 시에만 push.

---

## 6. 134차 무결성 raw 확정

### 6-1. locale 상태
- node --check ko/ja/zh = 0 (134차 apply 3건 후 재확인)
- ko.js tracked (s134 apply 3건 반영)
- ja.js / zh.js byte-level 무변경 (md5 동일성 검증, 3차례 boundary check 모두 PASS)
- ko.js 변화: 19801 → 19810 (+9) → 19831 (+21) → 19833 (+2) = **+32 leaf**
- ko.js md5: 572f5f60... → d899559c... → fd934522... → d075349727fb9936034a3ac3a81791c1
- HEAD = b45ce39 + 134→135 인계커밋
- origin 대비 push 미실행

### 6-2. 134차 작업커밋 raw

| 커밋 | 시점 | 적용 path | +leaf |
|---|---|---|---:|
| d3a0ab8 | s134 1차 | marketing 8 + operations.items 1 (helpPanel SKIP) | +9 |
| 48acb3d | s134 v3 | marketing 16 + ruleEnginePage 2 + gdpr 2 + sidebar 1 (helpPanel SKIP) | +21 |
| b45ce39 | s134 e3 | priceOpt.labelChannel + pnl.tabOverview | +2 |
| **합계** | | | **+32** |

### 6-3. 사용자 작업 시트 (134차 신규 — 135차 작업 인프라)

| 시트 | rows | 상태 |
|---|---:|---|
| **★`s134_user_ALL_v3.csv`** | **201** | **검수자 추천 100% 채움 — 135차 1순위** |
| s134_user_ALL.csv (v1) | 201 | 검수자 추천 없음 (v3 가 최종) |
| s134_user_ALL_v2.csv | 201 | zh→ko 자동 167건 (v3 가 최종) |
| s134_user_operations.csv | 150 | parent root 분할 (선택지) |
| s134_user_marketing.csv | 26 | parent root 분할 (선택지) |
| s134_user_ruleEnginePage.csv | 20 | parent root 분할 (선택지) |
| s134_user_gdpr.csv | 4 | parent root 분할 (선택지) |
| s134_user_reportBuilder.csv | 1 | parent root 분할 (선택지) |
| s134_real_new_review_v3.csv | 233 | 진짜 신규 233 (RECOMMEND 31 적용 완료, NEEDS_TRANS 200 = v3 와 동일) |
| s134_e3_recoverable.csv | 43 | dup_called 회수 (RECOMMEND 2 적용 완료) |

### 6-4. 도구 동작 검증
- `session134_apply_new_keys.py`: 3차례 apply 모두 PASS
  - 1차 (s134 9건): node/synth/md5/leafset 모두 PASS
  - 2차 (s134-v3 21건): 동일 PASS, helpPanel apply-time dup SKIP (이중 안전장치 정상)
  - 3차 (s134-e3 2건): 동일 PASS
- depth-aware 매칭: marketing 4중 블록에서 depth=1 (line 33794) 정확 식별
- 백업 파일 3개 보존 (롤백 가능)

### 6-5. 작성대기 raw

135차 사용자 검토 대기:
- **★★★ s134_user_ALL_v3.csv 201건** (RECOMMEND 100% 채움, 사용자는 검토만)
- absent_v4 308 (옵션 A 진행 시)
- _recommendable_candidates.csv 104 (133차 자산, 미사용)

135차 신규 작성 필요:
- 없음 (134차에서 작업 인프라 완비)

**결론: 134차 작업커밋 3건 (+32 leaf — d3a0ab8 +9, 48acb3d +21, b45ce39 +2),
도구 19개, CSV/TXT 20개. 6,680 누적 회수.
★★★ N-93 only_b 분류 전체 신뢰 금지 (1,540 중 진짜 신규 233만 = 15%) +
★★ N-94~98 depth-aware 신규 키 추가 도구 정착 +
★★ N-99 SAFE_DICT v3 확장 +
★★★ N-104 사용자 작업 부담 검토만으로 축소 (201/201 검수자 추천 100%) — 134차 새 워크플로우 표준.**

---

## 7. 135차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -10; git status --short
```
HEAD: 134→135 인계커밋 + b45ce39 (s134-e3) + 48acb3d (s134-v3) + d3a0ab8 (s134) 확인. locale clean, node 3개 OK, ko.js leaf 19833.

**★★★ 1순위 — s134_user_ALL_v3.csv 사용자 검토 + apply (135차 최대 진전 가능)**

가장 빠른 진전 — 사용자 검토만으로 ~200건 추가 회수 가능:

1. 사용자에게 안내:
   - 엑셀에서 `s134_user_ALL_v3.csv` 열기
   - ko_recommend 컬럼에 검수자 추천값 (201건 100%) 채워져 있음
   - 그대로 OK → 그냥 두기 (자동 적용)
   - 수정 → ko_final 컬럼에 새 값
   - 거부 → ko_final 에 SKIP
2. 사용자 작성분 받으면 즉시:
   ```
   t $env:PYTHONIOENCODING="utf-8"; python session134_apply_new_keys.py --csv s134_user_ALL_v3.csv 2>&1 | Out-File -Encoding utf8 s135_v3_dry.txt; $env:PYTHONIOENCODING=""; code s135_v3_dry.txt
   ```
3. dry PASS → apply:
   ```
   t $env:PYTHONIOENCODING="utf-8"; python session134_apply_new_keys.py --csv s134_user_ALL_v3.csv --apply 2>&1 | Out-File -Encoding utf8 s135_v3_apply.txt; $env:PYTHONIOENCODING=""; code s135_v3_apply.txt
   ```
4. 검증 + commit:
   ```
   t node --check frontend/src/i18n/locales/ko.js; git diff --stat frontend/src/i18n/locales/ko.js; git add frontend/src/i18n/locales/ko.js; git commit -m "i18n(s135) apply user-confirmed ko_final for NEEDS_TRANS 201 batch"; git log --oneline -5
   ```

**예상 결과**: 6,680 → **~6,860~6,880건** (단일 차수 최대 진전 가능성).

**★ 2순위 — absent 308 옵션 A 진입**

- crm.aiHub 101 + pages.marketingIntel 48 두 그룹 집중
- 검수자가 영문 leaf_key 기반 추천 가능한 영역 자동 채움 (134차 패턴)
- 사용자 검토 → apply

**★ 3순위 — p3/p4 dup_called parent 부재 36건**

- 134차 E3 미적용분
- parent 추가 가능 여부 raw 검증 후 진행

**★ 4순위 — only_B p3/p4 NEEDS_TRANS 잔여**

- 1순위 v3 apply 후 SKIP 된 항목 재추천

**★ 5순위 — SAFE_DICT v4 보강 (선택)**

- 가성비 점진 감소 — 필수 아님

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후 다음 순위로
전환(0-3). **작업 여력이 있는 한 다음 차수로 미루지 말고 진행** (0-1).
사용자 작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 135 -> 136"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- **작업 여력 있는 한 다음 차수로 미루지 말고 끝까지 진행** (132차 강화 0-1, 133/134차 실증)
- 사용자 작성분 받으면 그 차수 안에 apply 까지 완결 (132차 mk87 / 133차 az+res / 134차 32 leaf 실증)
- 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58/N-65)
- **★CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기 (N-81, 134차 push 자동 N-100 실증)**
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- **신규 키 추가는 `session134_apply_new_keys.py` 만 사용 (depth-aware, 초엔터프라이즈)**
- 검수자 추천 + 사용자 검토 워크플로우 (N-76, 134차 N-104 검토만으로 축소)
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 초엔터프라이즈급 정밀도 유지

---
*(134차 검수자 작성. 모든 수치 raw 확정. 135차는 시작 시
재확인 후 진행. 134차 작업커밋 3건 (d3a0ab8 +9, 48acb3d +21, b45ce39 +2 =
**+32 leaf**, 19801→19833), 도구 19개 + CSV/TXT 20개 신규 추가.
누적 6,680건 회수. ★★★ N-93 only_b 분류 전체 신뢰 금지 (1,540 중 진짜 신규 233만),
★★ N-94~98 depth-aware 신규 키 추가 도구 정착, ★★ N-99 SAFE_DICT v3 확장,
★★★ N-104 사용자 작업 부담 검토만으로 축소 (201/201 검수자 추천 100%). 134차 핵심
워크플로우: 검수자 추천 100% → 사용자 검토만 → apply. N-93 ~ N-104 신규 raw 12건 기록.)*