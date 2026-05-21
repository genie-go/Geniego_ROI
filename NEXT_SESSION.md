# GenieGoROI i18n 인계서 — 138차 시작점

> 본 문서는 137차 검수자가 전체 작성.
> 138차 검수자는 이 문서 전체를 신뢰 기반으로 삼되, 모든 수치·상태는
> 138차 시작 시 raw 재확인 후 진행할 것. 추측 보류 금지 — raw 로
> 0/부재를 입증해야 보류가 정당. **★특히 locale 폴더 전체 .js 파일
> raw 확인 필수 (N-116) + ko.js 다중 블록 구조 raw 재확인 필수
> (N-128 신규, 137차 발견 — ko.js 안 같은 namespace 가 여러 블록에
> 중복 존재하여 134/136 도구 정상 작동 불가).**

---

## 0. 운영 원칙 (절대 — 매 차수 최우선 준수)

**0순위 절대원칙**
1. **★작업 여력 최대 활용 (132차 사용자 명시·강화, 133~137차 실증)**:
   작업 여력이 있으면 절대 다음 차수로 미루지 않는다. 부분 종결이
   가능하면 진행하고, 추가 측정·발굴·도구작성·apply 까지 가능하면
   끝까지 한다. 인계서만 작성하다 차수만 증가시키지 말 것. 사용자
   작성분 받으면 즉시 병합·dry·apply 까지 그 차수 안에 완결한다.
   인계서 작성 전 반드시 사용자 승인을 받는다. 인계서는 검수자가
   전체 작성하며(기존 전체 삭제 후 전체 붙여넣기), 임의 종결·임의
   인계 작성 금지.
2. **추측 보류 금지 + ★locale 폴더 전체 .js raw 확인 필수 (N-116)
   + ★ko.js 다중 블록 raw 확인 필수 (N-128 신규)**:
   "안전여력 소진/보류"를 선언하려면 raw 수치로 0 또는 부재를
   입증해야 한다. 인계서의 좌표/대상 언어 정보는 매 차수 시작 시
   `cmd /c dir locales\*.js /O-S` raw 재확인 필수. **★추가로 137차
   N-128 발견 이후, ko.js 안 어떤 namespace 가 몇 개 블록에 존재하는지
   `session137_find_blocks.py` 류 도구로 raw 재확인 필수**.
3. **★불가작업 전환 원칙**: 진행 중인 특정 작업이 그 차수에 raw 로
   도저히 불가함이 입증되면, 거기 매달리지 말고 작업 여력이 있는
   한 다른 진행 가능한 작업으로 즉시 전환한다. 부분 종결이어도 무방.
4. **★불가의 2종 구분**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계. 차수 바뀌어도 결과 동일.
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가. 선행 충족되면 가능.
5. **★사용자가 ko 결정하는 영역 — 추측 절대 금지 (N-17/N-25/N-58/N-65/N-115/N-121)**:
   ko_fixed 자동 결정 금지. 단, 추천값 제시 후 사용자 확정 받는 워크플로우는 허용.
6. **★CC 자동 명령 무력화 원칙 (N-81, 135~137차 push/apply 자동 다수 실증)**:
   거부 응답 입력하지 않고, 검수자의 다음 `t` 명령으로 덮어쓰기.
   apply/commit/push/propagation 자동 입력은 차단 우선.
   **★137차 N-127 추가**: CC 가 PowerShell 승인 대기 (1.Yes/2.No) 발생 시
   검수자는 `3` (No) 입력 또는 다음 `t` 명령으로 덮어쓰기. PowerShell
   인라인 따옴표·괄호 충돌 시 Bash 도구 우회 시도하지만 검수자가
   도구 파일 작성으로 우회하는 것이 더 안전.
   **★137차 N-122 후속 강화**: CC 가 "추측 분석"으로 사용자에게 답변
   유도하는 경우 raw 검증 안 한 정보 신뢰 금지. 진단 도구로 raw 직접 확인 필수.
7. **★ko 전용 안전 apply 도구 패턴 (135~137차 실증)**:
   - 기존 path ko 값 수정: `session132_apply_ko_only.py`
   - 신규 키 추가 (기존 namespace): `session134_apply_new_keys.py --csv <path>` ★ 검증완료, **단 N-128 영향**
   - 신규 namespace 통째 생성: `session136_apply_v2.py --csv <path>` ★검증완료, **단 N-128 영향**
   - 중첩 nested sub-block 수동: CC Edit 도구 (helpPanel 케이스, 136차)
   - **★15개 언어 propagation: 138차 도구 작성 필요 (현재 부재)**
   - **★★N-128 영향**: ko.js 다중 블록 구조에서 134/136 도구가 어느
     블록에 삽입할지 결정 못 함. 138차에서 ko.js 구조 정밀 분석 후
     도구 재작성 또는 CC Edit 직접 삽입 전략 필요.
8. **★only_b 분류 신뢰 금지 (134차 N-93)**: 코드 호출 grep 검증 필수.
9. **★PASSTHROUGH 패턴 (135차 N-110)**: ja/zh가 이미 한국어인 경우 그대로 ko 사용.
10. **★사전 다단계 보강 (135차 N-111)**: v1→v5 매칭률 단계적 상승 패턴.
11. **★★★ 15개 언어 무결성 원칙 (N-116, 사용자 명시)**:
    - 배포 운영 중인 i18n 시스템에서 누락 언어는 런타임 에러 / 영문 키 노출 / 일관성 깨짐 유발
    - 어설프게 몇 개국 언어 누락하고 진행 절대 금지
    - ko 신규 키 추가 시 → 14개 언어 모두 동일 path 에 placeholder 또는 번역값 보장 필수
    - propagation 도구는 boundary check 를 ja/zh 만이 아니라 **15개 전체 무결성** 으로 확장
    - **★137차 미해결**: 137차 +14 commit 은 ko 만 적용. 14개 언어 propagation 미실시.
      138차 우선 과제로 처리 필요.
12. **★★★★★ ko/ja 구조 raw 재확인 원칙 (N-117, 136차 발견, 137차 확정)**:
    - 137차 1단계 raw 측정 결과: ko 20,194 / ja 23,220 / 공통 7,949 / ko-only 12,245 / ja-only 15,271
    - ko/ja 거의 독립 source-of-truth. ja-only 의 ACTIVE 영역은 매우 제한적 (137차 측정: 183건).
13. **★도구 정규식 매칭 검증 원칙 (N-122/N-124 → N-128 확장)**:
    - 정규식 단독 신뢰 금지. `build_leaf_paths` 결과로 top-level set 미리 확정 후
      매칭 인정. raw 검증 필수.
    - dry-run 의 안전검사: `delta == applied`, `missing == 0`,
      `unexpected == 0` 셋 다 PASS 강제. 하나라도 FAIL 이면 apply 절대 금지.
    - **★N-128 신규 (137차)**: ko.js 자체에 동일 top-level namespace 가
      여러 블록에 중복 존재. 134/136 도구가 어느 블록에 삽입할지 결정
      못 함. apply 시 SYNTH FAIL 자동 롤백 패턴 다수 발생.
14. **★★★★★ ko.js 다중 블록 raw 확인 원칙 (N-128 신규, 137차 발견)**:
    - 137차 raw 측정: tabs 3 / performance 3 / commerce 3 / pages 2 /
      attribution 3 / cat 4 / audit 2 / gSug 1 / crm 1
    - 동일 namespace 가 여러 블록에 중복 존재하는 ko.js 의 구조적 결함.
    - build_leaf_paths 는 일부 블록만 파싱, 134/136 도구는 다른 블록에 삽입
      → SYNTH FAIL 다발.
    - 138차 시작 시 모든 namespace 의 블록 수 raw 재확인 필수.
    - 신규 leaf 추가 전 어느 블록에 삽입해야 코드에서 호출되는지
      별도 분석 (frontend 코드의 t() 호출 위치 확인) 필요.

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형: `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 (`&&`/`||` 금지).
- ★PowerShell 괄호 `()` 사용 시 manual approval 트리거 → 검수자 명령은 괄호 회피 (136차 발견).
- **★PowerShell 인라인 따옴표 충돌 시 Bash 도구 우회 시도** → 검수자는 도구 파일 작성으로 우회 (137차 N-127).
- CC 승인: `1.Yes/2.allow all/3.No` → `2`, `1.Yes/2.No` → `1`. 검증완료 .py 자체수정 시도 → `3`.
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기.
- 검수자 설명은 한글·핵심만 짧게. **★137차 사용자 강화: 가급적 CC 명령으로 직접 수정 진행, 사용자는 파일 저장만**. 초엔터프라이즈급 정밀도.
- 선택지 제시 시 검수자 추천 1개 반드시 명시.
- 사용자 작업은 1건만 (도구 저장).
- ★사용자가 outputs 다운로드 파일을 폴더에 덮어쓰기 했는지 raw 검증 필수 (N-106).
- ★사용자가 CSV/엑셀 업로드 시 raw 컬럼·내용 검증 우선 (N-126).
- push 는 사용자 명시 승인 시에만 (현재 origin 대비 미실행 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw → apply 순.
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지, N-122 후속).
- **★도구 CSV 컬럼 호환성 매 사용 시 raw 재확인 (N-126 후속)**: 134=`path,ko_final` 136=`path,ko_final` 동일.

---

## 1. 프로젝트 좌표

### 1-1. locale 디렉토리
`D:\project\GeniegoROI\frontend\src\i18n\locales\` — **15개 언어 .js 파일**

### 1-2. 15개 언어 raw 현황 (137차 종결 시점, 단위 KB)

| 그룹 | 언어 | KB | 수정일 | 역할 |
|---|---|---:|---|---|
| **정답군** | ja.js | 1,126.6 | 5/20 (135차) | ★ 최대 / 정답 출처 |
| | zh.js | 849.5 | 5/20 (135차) | 보조 정답 |
| **회수 작업 진행** | ko.js | ~1,013.9 | 5/21 (137차 +14) | **leaf 20,208 (ja 87.0%)** |
| **5/16군** | th.js | 1,049.7 | 5/16 | leaf 20,267 |
| | vi.js | 924.6 | 5/16 | leaf 20,893 |
| | id.js | 853.0 | 5/16 | leaf 20,219 |
| | de.js | 828.4 | 5/16 | leaf 19,304 |
| | zh-TW.js | 776.7 | 5/16 | leaf 18,699 |
| **5/14군** | en.js | 948.5 | 5/14 | leaf 21,581 |
| | es.js | 954.5 | 5/14 | leaf 21,615 |
| | fr.js | 952.6 | 5/14 | leaf 21,615 |
| **5/17군 (대량 회수)** | ar.js | 487.1 | 5/17 | leaf 9,829 ★ |
| | hi.js | 492.7 | 5/17 | leaf 9,827 ★ |
| | pt.js | 478.1 | 5/17 | leaf 9,827 ★ |
| | ru.js | 487.5 | 5/17 | leaf 9,827 ★ |

### 1-3. leaf count raw (137차 종결 시점)
- ko: **20,208** (136차 종결 20,194 → 137차 +14)
- ja: 23,220 (변동 없음, 정답)
- zh: 19,409 (변동 없음)
- 12개 언어 leaf 변동 없음 (137차 미작업)
- 138차 시작 시 raw 재확인 (변동 없을 것)

### 1-4. ★ko/ja 차집합 raw 확정 (137차 1단계 측정)

| 항목 | 수치 | 비고 |
|---|---:|---|
| ko leaf | 20,208 | 137차 종결 |
| ja leaf | 23,220 | 정답 (변동 없음) |
| ko ∩ ja | 7,949 → **재측정 필요** | 137차 +14 반영 안 됨 |
| ko-only | 12,245 → **재측정 필요** | 137차 +14 반영 안 됨 |
| ja-only | 15,271 → **재측정 필요** | 137차 -14 예상 (attribution 4 + cat 10 처리됨) |

★ ko 와 ja 가 **거의 독립된 source-of-truth**. 단순 ko 87% 완성 아님.
138차 시작 시 `session137_diag_kojadiff.py` 재실행으로 정확한 차집합 재측정 필수.

### 1-5. ★★★ ko.js 다중 블록 raw (N-128 신규, 137차 발견)

| top-level | 블록 수 | 위치 (line) |
|---|---:|---|
| tabs | **3** | 1869, 17384, 24670 |
| performance | **3** | 17672, 21722, 42634 |
| commerce | **3** | 10680, 38477, 39568 |
| pages | **2** | 10026, 38435 |
| attribution | **3** | 10480, 38461, 42640 |
| cat | **4** | 13682, 21636, 21698, 42646 |
| audit | **2** | 38597, 42565 |
| gSug | 1 | 32622 |
| crm | 1 | 32730 |

★ ko.js 자체의 구조적 결함. **138차 시작 시 모든 top-level 의 블록 수
raw 재확인 + 어느 블록이 active(코드 호출 대상) 인지 분석 필요**.

### 1-6. 인계서 / 도구 위치
- 인계서: `D:\project\GeniegoROI\NEXT_SESSION.md`
- 작업 도구: `D:\project\GeniegoROI\session{125,128~137}_*.py`

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용)

**검증 모체** (import 전용): `session125_recover_safestub_jazh` (build_leaf_paths, _ko_suspect, KO_CONTAMINATED 등)

**128~136차 자산**: 이전 인계서 참조

**137차 신규 도구 (10개)**
- `session137_diag_kojadiff.py` ★ ko/ja path 차집합 raw 측정 (build_leaf_paths 가 dict 반환이므로 .keys() 변환 필수)
- `session137_classify_ja_only_v2.py` ★ ja-only 15,271 의 5분류 (ACTIVE_FULL 0 / ACTIVE_LEAF 61 / PARENT_DYN 122 / PAGES_BACKUP 1,661 / DEAD 13,427)
- `session137_active_leaf_recommend.py` ★ 183건 (active_leaf + parent_dyn) 1차 추천
- `session137_auto_dict_recommend_v2.py` ★ ko/ja 공통 7,949 에서 자동 사전 구축 (3,157 entries, ambiguous 226) + 183건 매칭 (matched 55 + passthrough 32 + needs_trans 96)
- `session137_fill_needs_trans.py` ★ NEEDS_TRANS 96 의 INSPECTOR_DICT (111 entries) 채우기 (filled 16, remained 80)
- `session137_fill_v2.py` ★ REVIEWER_NEEDED 80 의 INSPECTOR_BY_PATH 직접 채우기 (filled 80)
- `session137_prep_ko_csv_v2.py` ★ session136_apply_v2 호환 컬럼 변환 (`path,ko_final`)
- `session137_prep_ko_csv_v3.py` ★ ko 미존재 path 만 정제 (NEW_NAMESPACE/EXISTING 분류)
- `session137_diag_leaf_diff.py` ★ SYNTH FAIL 진단 (단순 grep 한계 발견)
- `session137_recheck_clean31.py` ★ clean 31 각 path 의 build/raw_quoted 재확인 (truly_new 31 확정)
- `session137_check_parents.py` ★ 31건 parent 부재 정밀 진단 (모두 parent 존재 확정)
- `session137_find_blocks.py` ★★★ ko.js 다중 블록 raw 추출 (N-128 발견)

**137차 신규 CSV/TXT (다수)**:
s137_kojadiff_summary.txt, s137_ko_only_paths.csv (12,245),
s137_ja_only_paths.csv (15,271), s137_intersection.csv (7,949),
s137_ja_only_v2_summary.txt, s137_ja_only_v2_active_leaf.csv (61),
s137_ja_only_v2_parent_dyn.csv (122), s137_ja_only_v2_pages_backup.csv (1,661),
s137_ja_only_v2_dead.csv (13,427), s137_active_leaf_recommend.csv (183),
s137_auto_dict.json, s137_active_leaf_recommend_v2.csv (183),
s137_active_leaf_ko_review.csv (183), s137_active_leaf_ko_final_v3.csv (183),
s137_ko_apply.csv (183), s137_ko_apply_pure.csv (169 = 183 - 14 이미 적용된 attribution+cat),
s137_ko_apply_clean31.csv (31 truly_new), s137_step9_blocks.txt 등.

**★★★ 138차 신규 작성 필요 도구**:
- **`session138_ko_block_analyze.py`** — ko.js 의 모든 multi-block namespace 의 코드 호출 위치 분석 + active 블록 식별
- **`session138_apply_to_active_block.py`** — N-128 우회 apply 도구 (active 블록에 leaf 삽입, build_leaf_paths 와 일치 보장)
- **`session138_propagate_keys.py`** — ko 신규 키 → 14개 언어 propagation (15개 무결성 boundary check)
- **`session138_apply_to_lang.py`** — 언어별 apply 도구 (per-lang csv 입력)

---

## 3. 완료 커밋 (HEAD = 9b43d0a + 인계 amend)

| 커밋 | 내용 | +leaf |
|---|---|---:|
| 인계 | docs(handover): session 137 -> 138 | — |
| **9b43d0a** | i18n(s137) add 14 ko leafs for ja-only new namespace (attribution 4 + cat 10) | +14 |
| 6892bef | docs(handover): session 136 -> 137 | — |
| 7484297 | i18n(s136) add 7 ko leafs for helpPanel.staticHelp | +7 |
| 5880167 | i18n(s136) add 69 ko leafs for ja-only active_full (audit/graph/performance) | +69 |
| 0008b33 | docs(handover): session 135 -> 136 | — |

- **137차 누적**: 1 작업 commit + 1 인계 = **+14 leaf**
- **전체 누적 ko**: 6,548 + 132차 58 + 133차 35 + 134차 32 + 135차 285 + 136차 76 + 137차 14 = **7,048건**
- **★주의**: 위 누적은 ko 만 — 다른 14개 언어 회수 누적 미측정
- node --check ja/zh/ko = 0. ko.js tracked. origin 대비 87 commits ahead (push 미실행).

---

## 4. 137차 핵심 발견 (N-127 ~ N-128)

### N-127 — ★★ CC 자동 명령 트리거 다양화 (N-81 후속)
- PowerShell 인라인 따옴표 충돌 시 CC 가 Bash 도구로 우회 시도
- `Compound command contains cd with path operation — manual approval required` 트리거
- `1.Yes / 2.Yes-allow-all / 3.No` 대기 발생 시 검수자는 `3` 또는 다음 `t` 명령 덮어쓰기
- **★검수자 우회 권장**: 도구 파일로 작성해서 PowerShell 인라인 회피

### N-128 — ★★★★★ ko.js 다중 블록 구조 결함 (137차 최대 발견)
ko.js 안 동일 top-level namespace 가 **여러 블록에 중복 존재**:
- tabs 3 / performance 3 / commerce 3 / pages 2 / attribution 3 / cat 4 / audit 2
- gSug, crm 은 단일 블록

**영향**:
- `build_leaf_paths` 는 일부 블록만 파싱 (정확히 어떤 블록인지는 추가 raw 분석 필요)
- `session134_apply_new_keys.py` 의 depth-aware 매칭이 ambiguous 인 경우 abort,
  하지만 단일 블록이 우선 매칭되면 거기에 삽입 → build_leaf_paths 와 다른 블록일 가능성
- `session136_apply_v2.py` 의 신규 namespace 생성도 같은 결함 영향 받을 수 있음 (단 137차 +14 는 성공 — attribution/cat 이 이미 존재함에도 신규 생성 PASS 한 것은 우연 가능성)
- **SYNTH FAIL 패턴**: applied N 인데 leaf delta 가 14건 적게 나오는 현상 다수 발생
  - 1차: clean 169 시도 → delta 149 (14차이)
  - 2차: clean 31 시도 → delta 17 (14차이)
  - 동일하게 **14건이 매번 누락**

**138차 우선 분석**:
1. 어느 블록이 active (코드 호출 대상) 인가? — frontend 코드의 t('tabs.X') 호출 위치 확인
2. build_leaf_paths 가 어느 블록을 파싱하는가? — 도구 내부 로직 raw 분석
3. 134/136 도구가 어느 블록에 삽입하는가? — depth-aware 매칭 로직 raw 분석
4. 셋이 일치하지 않으면 우회 도구 작성 (active 블록에 강제 삽입)

### N-129 — ★ 도구 CSV 컬럼명 호환성 (134=136=`path,ko_final`)
- 137차 첫 시도 컬럼명 `path,ko_value` → 인식 0건
- 컬럼명 확인: 134 와 136 모두 `path,ko_final`
- prep_v2.py 로 변환 후 정상 작동

---

## 5. 잔여 백로그 (★재구성)

### 5-A. ★★★ 138차 1순위 — N-128 해결 + 137차 미처리 169건 회수

**Step 1 — ko.js 다중 블록 raw 재측정**
- `session138_ko_block_analyze.py` 작성 — 모든 top-level 의 블록 수 + 위치 + 안 leaf 수 + 각 블록의 code 호출 빈도
- 어느 블록이 active 인지 판정

**Step 2 — 137차 미처리 169건 (clean 31 + ghost-like 138) 정확한 분류**
- s137_ko_apply_pure.csv (169) 의 각 path 를 ko.js 어느 블록에 삽입해야 하는지 결정
- 블록 우선순위: active 블록 우선

**Step 3 — apply 도구 작성 또는 CC Edit 우회**
- `session138_apply_to_active_block.py` 작성 (정확한 line 위치 지정)
- 또는 169건이 적으므로 CC Edit 으로 직접 삽입 (검수자가 정확한 before/after 텍스트 작성)

**Step 4 — apply + commit**
- 169건 모두 적용 시 ko 20,208 → 20,377 예상

### 5-B. ★★★ 138차 2순위 — 15개 언어 propagation 도구 작성

**137차 +14 (attribution + cat) 누락 보강**:
- 14개 언어 모두 attribution.* (4) + cat.* (10) 추가 필요
- ASCII passthrough / ja 원문 stub 정책

**전략**:
- `session138_propagate_keys.py` 작성 (ja/zh boundary → 15개 전체)
- depth-aware 매칭, leaf 중복, ambiguous 차단 (N-122 + N-128 패턴)
- 우선순위:
  - ★ 5/14군 (en/es/fr) — 가장 정렬 양호
  - ★ 5/16군 (th/vi/id/de/zh-TW)
  - ★ 5/17군 (ar/hi/pt/ru) — 대량 회수

### 5-C. 종류 2 (선행 부재 — ko 영역 잔여)

- **only_B 잔여 88건** (135차 cat_a 130 외, 진짜 신규 233-130=103 분석 필요)
- **absent 308 옵션 B 우회** (133차 N-84, 134차 N-103)
- **multi-value dataProduct.* 영역** (5-A, 도구 작성 시간 큼)
- **SAFE_DICT v6 보강** (가성비 점진 감소)
- **rgba 오염 1건** (`rgba(99,140,255,0.12)` — ko.js 데이터 결함, 후순위)
- **PARENT_DYN 122 검증** (137차 측정, 진짜 동적 호출인지 검증 필요)
- **ja-only PAGES_BACKUP 1,661** (백업/구버전, 후순위)

### 5-D. 종류 1 (회수 불가 확정)

- p1 588 / absent 216 dead / cat_a 1085 dead / sidebar.version 줄바꿈 / E3 NO_SOURCE 23
- truly_new with ja 121 / marketing R1 bad 12 / 3중 교집합 144 / gSug 14
- ja-only DEAD 13,427 (137차 측정)

### 5-E. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행
- **5-4 push**: origin 대비 미실행. 누적 미push:
  - 128차 4커밋, 인계 8개, 129차 1, 132차 1, 133차 1, 134차 3, 135차 5, 136차 3, **137차 2 (인계+1 작업)** = **87 커밋**
  - 사용자 명시 승인 시에만

---

## 6. 137차 무결성 raw 확정

### 6-1. ko.js / ja.js / zh.js 상태
- node --check 3개 모두 0
- ja.js / zh.js byte-level 무변경
- ko.js: 20,194 → 20,208 (+14)

### 6-2. ★15개 언어 raw 무결성 (137차 종결 시점)
- ko: 20,208 leaf (+14 from 136차)
- ja: 23,220 leaf (변동 없음)
- zh: 19,409 leaf (변동 없음)
- **12개 언어 leaf 변동 없음** (137차 미작업)
- node --check 미수행 (12개 언어) — 138차 시작 시 raw 필수
- **★15개 무결성 위반**: attribution.* + cat.* (14건) 가 ko 에만 추가됨. 14개 언어에 미반영.

### 6-3. 137차 작업커밋 raw

| 커밋 | 영역 | +leaf |
|---|---|---:|
| 9b43d0a | attribution(4) + cat(10) 신규 namespace | +14 |
| **합계** | | **+14** |

### 6-4. 137차 미적용 잔여
| 항목 | 건수 | 상태 |
|---|---:|---|
| s137_ko_apply_pure.csv | 169 | dry-run PASS, apply 3회 모두 SYNTH FAIL 롤백 (N-128) |
| s137_ko_apply_clean31.csv | 31 | dry-run PASS, apply SYNTH FAIL 롤백 (N-128) |

### 6-5. 137차 시도/실패 raw
- 134 apply 시도 3회 (각각 자동 롤백 PASS)
  - 백업: ko.js.bak_s134newkeys_20260521_095212 (1,038,613 bytes)
  - 백업: ko.js.bak_s134newkeys_20260521_100058 (1,013,893 bytes)
  - 백업: ko.js.bak_s134newkeys_20260521_101226 (1,013,893 bytes)
- 136 apply 시도 1회 (성공, +14)
- 백업 정리 필요 여부: 138차 시작 시 결정

---

## 7. 138차 실행 로드맵 (★★★ 우선순위)

**0단계 — 시작 시 raw 재확인 (필수 확장)**
- `cmd /c dir locales\*.js /O-S` 15개 언어 raw
- `session137_diag_kojadiff.py` 재실행 → ko/ja 차집합 raw (137차 +14 반영)
- `session137_find_blocks.py` 재실행 → ko.js 다중 블록 raw 재확인 (N-128 후속)
- node --check ja/zh/ko 우선

**★★★ 1순위 — N-128 해결 + 169건 회수**

Step 1: `session138_ko_block_analyze.py` 작성 — 모든 multi-block namespace 의 active 블록 식별
Step 2: 169건 (clean 31 + 138 ghost) 의 각 path 가 어느 블록에 삽입돼야 하는지 결정
Step 3: `session138_apply_to_active_block.py` 작성 또는 CC Edit 직접 삽입
Step 4: apply + commit
Step 5: ko 20,208 → 20,377 예상

**예상 결과**: 169건 회수, ko leaf +169

**★★★ 2순위 — 15개 언어 propagation 도구 작성**

Step 1: `session138_propagate_keys.py` 작성 (ja/zh boundary → 15개 전체)
Step 2: 137차 +14 attribution + cat 14개 언어 보강 (15개 무결성 회복)
Step 3: 138차 1순위 +169 도 14개 언어 propagation
Step 4: 5/14군 (en/es/fr) propagation 우선
Step 5: 5/16군, 5/17군 별도 차수 또는 같은 차수

**★ 3순위 — PARENT_DYN 122 검증**
- 진짜 동적 호출인지 확인. 일부는 ACTIVE_LEAF 로 재분류 가능할 수도.

**★ 4순위 — ko 잔여 only_B 영역** (cat_a 외 103건)

**★ 5순위 — absent 308 옵션 B 우회 검증**

**진행 불가 시**: 각 순위에서 raw 부재/불가 입증 후 다음 순위 전환 (0-3).
작업 여력 있는 한 다음 차수로 미루지 말고 진행 (0-1).

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md 전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 → CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 138 -> 139"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 다음 차수로 미루지 말고 끝까지 진행 (132차 강화 0-1, 135~137차 실증)
- 사용자 작성분 받으면 그 차수 안에 apply 까지 완결
- 미측정 축 계속 발굴·진행 (★137차 N-128 — ko.js 다중 블록 구조)
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 무엇이 선행돼야 가능한지 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25/N-37/N-58/N-65)
- CC 자동 명령은 거부 응답 대신 다음 `t` 명령으로 덮어쓰기 (N-81/N-127)
- ko 전용 안전 도구로만 apply (ja/zh propagation 도구 사용 금지) (N-79)
- **★★★ 15개 언어 무결성 원칙 (N-116) — 어설프게 몇 개국 언어 누락하고 진행 금지**
  - **★137차 미해결**: +14 (attribution+cat) 가 ko 만 적용. 138차 1순위 보강
- **★★★★★ ko/ja 차집합 raw 재확인 원칙 (N-117) — 인계서 leaf 수만 보지 말고 path set 비교 필수**
- ★ 매 차수 시작 시 locale 폴더 전체 .js raw 확인 필수 (운영원칙 0-2 확장)
- 신규 키 추가:
  - 기존 namespace → `session134_apply_new_keys.py --csv <path>` ★ N-128 영향 주의
  - 신규 namespace 통째 → `session136_apply_v2.py --csv <path>` ★ N-128 영향 주의
  - 중첩 sub-block → CC Edit 도구 (정규식 false positive 회피)
  - **★N-128 우회**: 다중 블록 namespace 는 active 블록 식별 후 line 지정 삽입 필요
  - 다른 언어는 138차에서 도구 작성
- 검수자 추천 + 사용자 검토 워크플로우 (N-76, 134차 N-104, 135차 N-115, 136차 N-121 사용자 수정 우선)
- only_b 영역 작업 시 코드 호출 grep 검증 선행 (N-93)
- 사용자 파일 덮어쓰기 검증 필수 (N-106)
- 사용자 업로드 CSV/엑셀 raw 컬럼 검증 필수 (N-126)
- PASSTHROUGH 패턴 적용 (N-110)
- 사전 다단계 보강 패턴 (N-111)
- **★★도구 정규식 매칭 검증 원칙 (N-122/N-124/N-128)**
- ★dry-run 결과는 raw 메모장 출력으로 검수자 직접 확인 (CC 요약 신뢰 금지)
- ★PowerShell 괄호 `()` 사용 시 manual approval 트리거 → 검수자 명령은 괄호 회피
- ★PowerShell 인라인 따옴표 충돌 시 도구 파일로 우회 (N-127 신규)
- **★137차 사용자 강화**: 검수자 설명 짧고 핵심만, CC 명령으로 직접 수정 우선, 사용자 파일 저장 1건만, 부분 종결 OK
- 초엔터프라이즈급 정밀도 유지

---
*(137차 검수자 작성. 모든 수치 raw 확정. 138차는 시작 시
locale 폴더 전체 .js 재확인 + ko/ja 차집합 raw 재측정 + ko.js 다중
블록 raw 재확인 후 진행.
137차 작업커밋 1건 (+14 leaf, 20194→20208), 도구 11개 + CSV/TXT 다수.
누적 7,048건 ko 회수. 1단계 ko/ja diff raw 확정 PASS,
2단계 ja-only 5분류 PASS (ACTIVE 183, DEAD 13,427),
3-5단계 183건 ko 추천값 사전 PASS,
6단계 +14 commit PASS,
★★★★★ N-128 ko.js 다중 블록 구조 결함 발견 (137차 최대) →
134/136 도구 SYNTH FAIL 자동 롤백 다수 → 137차 +169 미적용.
★★ N-127 신규 (CC 자동 명령 트리거 다양화).
138차 1순위: N-128 해결 + 169건 회수. 2순위: 15개 언어 propagation 도구 작성.
원칙 0-13 후속 (N-128) + 0-14 (ko.js 다중 블록 raw 확인) 신설.
137차 사용자 강화 지시 (검수자 설명 짧게, CC 직접 명령 우선) 반영.)*