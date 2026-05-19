# GenieGoROI i18n 인계서 — 126차 시작점

> 본 문서는 매 세션 종결 시 **검수자가 단일 파일로 전체 재작성** → 사용자가
> `D:\project\GeniegoROI\NEXT_SESSION.md` 전체 교체. PM_HANDOVER.md /
> FEATURE_PLAN_120.md 는 **별개 인계서로 불변**(절대 건드리지 않음).

---

## 0. 작업 개요

i18n 번역 키 동기화 프로젝트. locale 경로:
`D:\project\GeniegoROI\frontend\src\i18n\locales\{lang}.js`

- **정답원본 = ko.js (한국어)** — 모든 복구/번역의 의미 출처.
  ★단 ko.js 도 일부 오염 존재(N-25, 5-1). 무조건 신뢰 금지.
- **ja.js 정답언어 = 일본어**, **zh.js 정답언어 = 중국어(간체)**
- 그 외 다국어 다수 존재하나 본 라인 외

### 검증 파서 모체 (★무변경 import 절대원칙)
`session112_inspect_suspect.py` 의 `scan_key_blocks`/`extract_kv`/
`ANYKEY_RE`. 신규 .py 도구는 무변경 재사용 (N-13).
`session123_diag_keydiff.py` `build_leaf_paths(text)` →
`{full.key.path: stripped_value}` (N-22 한계 有).

### ★ 검증완료 복구 자산 (차기 표준, 무변경 재사용)
- `session124_recover_mi_jazh.py` `safety_check` — delta 누적
  5종 안전검사(N-23). 블록치환 표준.
- ★`session125_recover_safestub_jazh.py` (**차기 1순위 표준**):
  - `_is_balanced_jsstr` — 정상 JS 더블쿼트 결정 검증.
  - `quote_integrity` (N-24) — 따옴표 '수 불변' 아닌 (a)정상
    JS 문자열 (b)실제Δ==예상Δ. dry/apply 동일 호출.
  - `locate_and_plan(...,parent_scoped=)` (N-26) — 동일 leafkey
    다출현 시 최근접 부모키 일치로 출현 특정. (s,e)겹침 plan
    전체 SKIP(N-27). 기본 False(5-2 본 무변경).
  - `KO_CONTAMINATED`+`_ko_suspect` (N-25) — ko 오염 제외 +
    의심 휴리스틱(출력만, 자동제외 안 함).
  - `_is_hashkey` — auto.* 랜덤 해시키 제외.
  - **import-가드**: 함수=모듈레벨 / 실행=`_run`·`_run_remain`
    + `__main__` 가드 / 파서 lazy(`_get_parsers`) / `load_data()`.
    진단도구 무변경 import 재사용(N-13 실현).
  - 합성검증 **F1~F13**. 모드: 무옵션=dry / `--apply` /
    `--diag` / `--remain-dry` / `--remain-apply`.

---

## 1. 운영 방식 (사용자 확정 — 불변)

- **검수자(=Claude)** 가 한 줄 명령으로 CC 에 직접 작성·실행 지시
  기본. 사용자는 복사 1회 붙여넣기만.
- 검수자가 수정문서 산출 → 사용자 폴더 저장 → 검수자 CC 명령 반영.
- 검수자 설명 **한글, 핵심만 짧게**. 장황 금지.
- 분기 시 **검수자 추천 1개 명시** 후 사용자 선택 대기.
- **여력껏 최대 작업**. *할 수 있는 만큼만*, 무리한 추측 금지.
  ★**보류는 물리적 불가(ko 정답부재/오염)일 때만. 여력 있으면
  다음 안전 백로그 계속**(125차: #3 보류 → 5-2본 → 5-2잔여
  3,478건 커밋). 부분 종결 시 검증완료만 인계.
- **초엔터프라이즈급 이상**.

### ★ 명령 표기 (불변)
한 줄 명령 = 맨 앞 `t ` 접두 포함 전체. 복사 1회 붙여넣기.
입력창 잔존/위험명령(`git push`) 시 **ESC 안내 먼저**.

### ★ CC 승인 프롬프트
- `1.Yes/2.Yes,allow all/3.No` → **`2`**
- `1.Yes/2.No` → **`1`**
- 단순읽기/`code *` → `1`/`2`
- ★CC 가 검증완료 .py 자체수정 시도 → **`3`(No)**, 검수자 직접 수정.
- 없는 파일/옵션 → ESC/취소.

### ★ 실행 환경
VS Code/Antigravity PowerShell. 한 줄=`;` 연결 (★`&&`/`||` 금지).
`python -c` 인라인 금지(cp949). .py 산출 + UTF-8 결과 →
`code <파일>` 캡처. 항상 raw 교차확인.

### ★ CC auto-compact
도구 .py/git 커밋 디스크·git 보존 → 압축돼도 무손실.

### apply 한 줄 = 결합 명령
`t python <tool>.py --<모드> 2>&1 | Out-File -Encoding utf8
<log>` (;) `node --check ja` (;) `node --check zh` (;)
`git add <locales>` (;) `git commit -m "<영문>"` (;)
`git log --oneline -3` (;) `code <log>`. ★`;` 만.

---

## 2. 핵심 노트 (N-시리즈, 불변 계승)

- **N-13**: 검증완료 파서/도구 무변경 재사용. CC 자체수정 거부(`3`).
- **N-17 (★최중요)**: 파서·node 단독 신뢰 불가. 안전 = 다중 AND
  + 합성검증 + 괄호균형 + 범위밖무변경 + escape정합(N-24) +
  (s,e)겹침SKIP(N-27) + node + ROLLBACK. apply 는 합성검증 ALL
  PASS & **dry 가 apply 와 동일검증 실제 거친 raw 확인** &
  안전검사 ALL & node PASS 시만. CC 요약/“승인?” 신뢰 금지 —
  검수자 raw 직접 판정.
- **N-18**: 인계서/CC vs raw 불일치 → raw 기준. 글리프/슬라이스
  잘림을 결함 오판 금지 — raw repr 확정.
- **N-19**: ROOT직속 중복 = 키 단위 병합(JS last-wins).
- **N-20**: 검증·치환 '이번 출현'만. 동일 leafkey 다출현 현재값
  매칭 특정, 비유일 SKIP. 정답에만 키 INSERT 안 함(부재 SKIP).
- **N-21**: 파일끝 rfind 마지막만. 들여쓰기 동적추출.
- **N-22**: build_leaf_paths 루트직속 스칼라 미수집 → ROOT 병행.
- **N-23 (124)**: 블록치환 안전검증 = dry 확정인자 + delta 누적
  결정 슬라이스. `session124.safety_check` 표준.
- **N-24 (125)**: 따옴표 = `quote_integrity` (수불변 금지. ko
  정상 escape `\"` 의도증가). old/new 정상 JS + 실제Δ==예상Δ.
- **N-25 (125, ★중요)**: **정답원본 ko.js 도 오염 존재**. ko값이
  leafkey 의미와 명백 불일치(예 apiKeys.status ko=`'에
  만료됩니다. 상태'`, apiKeys.createdAt ko=`'작성자:'`) → ko
  복구 시 ja/zh 전파. raw 확정분 `KO_CONTAMINATED` 명시 제외.
  추가 의심 `_ko_suspect`(★출력만, 자동제외 안 함). ko 교정은
  ko 보강 별개과제.
- **N-26 (125)**: 동일 leafkey 다출현 SKIP 분은 **최근접 부모키
  일치**(parent_scoped=True)로 출현 특정 → 추가 안전복구. 기본
  False(5-2본 무변경).
- **N-27 (125)**: parent_scoped 등으로 다른 path 가 같은/겹친
  (s,e) 가리킬 수 있음 → 겹친 plan 전체 SKIP. apply_plans
  `assert text[s:e]==old` 최종 안전망(3중: N-20/N-27/assert).

### 합성검증 필수 구성
실모체 import(또는 lazy) + 픽스처(중첩/동일키 다른부모/RULES
불일치/가짜 파일끝앵커/대형·오염블록/ko escape `\"`/부재 path/
불균형토큰/parent_scoped 최근접부모/(s,e)겹침/KO_CONTAMINATED·
_ko_suspect) + node 교차. F1~F13 레퍼런스.

---

## 3. 125차 종결 상태 — 3커밋 (HEAD = d75d079)

**125차: 5-1 #3 ko부재 raw확정(보류) + 5-2본(a69ea56) +
5-2잔여(d75d079). 총 3,478건. 검증자산 N-24~27 신규.**

- HEAD = **d75d079**(5-2잔여) ← **a69ea56**(5-2본) ←
  038c5b4(124) ← 548444b(122)
- origin 대비 **↑51 commits**(push 보류)
- 워킹트리: 진단 txt/py untracked. **locale 커밋됨 clean**
- 백업: `*.bak_session125_20260519_133619`(5-2본),
  `*.bak_session125r_20260519_140909`(5-2잔여)
- ★push 보류 계속 — 사용자 명시 승인 하에서만(5-4). 125차
  사용자 `git push` 입력 → 검수자 ESC 차단(정상).

### 125차 확정 사실 (검증완료, 추측 아님)

**[사실1] 5-1 #3 ko 정답부재 raw 확정 (보류)**
ko.performanceHub = off 687716, 20키 소형(`📊 성과 허브`).
ja/zh #3 = 각 464키, 정합률 **1.9%**. ko 464키 정답 부재 →
overwrite/rename 불가 → 보류(ko 보강 별개과제. 124가설→125사실).

**[사실2] 5-2 본 (a69ea56)**
안전대상 2,488(ko정답+단순값+MI제외+공통) → N-20 SKIP →
**ja 1,323/zh 1,350=2,673**. 합성검증 13/13, 안전검사 7종,
escape정합 ja Δ4=4(super.aaTime `\"09\"`)/zh 0=0, node OK.

**[사실3] 5-2 잔여 (d75d079)**
parent_scoped(N-26) SKIP분 부모한정+단독, auto.*제외,
(s,e)겹침 SKIP(N-27 ja6쌍), ko오염 2건 제외(N-25). →
**ja 316/zh 489=805**. 합성검증 F1~F13, 안전검사 7종,
escape정합 0=0, node OK.

**[사실4] ko.js 오염 발견 (★N-25)**
ko apiKeys.status(off 96243/575818)=`'에 만료됩니다. 상태'`,
apiKeys.createdAt(off 96277/575848)=`'작성자:'` — 의미불일치.
zh/ja 의미정상. ko 복구 시 전파 → KO_CONTAMINATED 제외.
추가 ko오염 가능 → 차기 _ko_suspect 출력 raw 검토.

### 125차 누적 치환
- 5-2본 a69ea56: 2,673 / 5-2잔여 d75d079: 805
- **총 3,478건 EN stub → ko 로컬라이즈 완료**

### 125차 영구 자산 (루트 저장)
- ★`session125_recover_safestub_jazh.py`(quote_integrity/
  parent_scoped/겹침SKIP/KO_CONTAMINATED/import-가드/F1~F13)
  — 차기 stub 복구 1순위 표준.
- 진단: `session125_diag_perfhub_ko.py`/`_ko2.py`/`keydiff2.py`/
  `quotebug.py`/`quotedelta.py`/`remain.py`/`remainbug.py`/
  `remainsus.py`. 결과 txt 다수.
- 124/123/122/121 도구 루트 잔존.

---

## 4. N-17 디버그 교훈 (복구 도구 진입 시 내장)

1. node_check cp949 bytes+decode replace, returncode 판정.
2. norm() strip 금지.
3. 다중출현: 전출현/rfind(N-21)/치환·검증 구분(N-20)/비유일
   SKIP/부모한정(N-26).
4. JS 이스케이프 `\n`/`\t`, ko `\`,`"`→`\\`,`\"`. new_tok 정상
   JS(_is_balanced_jsstr).
5. 루트직속 ROOT 스캔(N-22).
6. (124) 블록치환 delta 위치계산(N-23).
7. (125) quote_integrity(N-24). dry 가 apply 동일검증 실제
   거친 raw 확인 후 apply.
8. (125) import-가드: 함수 모듈레벨/실행 가드/파서 lazy/load_data.
9. (125) ko 오염(N-25): 정답원본 불신. KO_CONTAMINATED 제외 +
   _ko_suspect 출력(자동제외 금지).
10. (125) parent_scoped(N-26) + (s,e)겹침 전체 SKIP(N-27).
    apply_plans assert 최종 안전망(3중).

→ ★`session125_recover_safestub_jazh.py`(N-20·24·25·26·27,
  F1~F13), `session124_recover_mi_jazh.py`(N-23).

---

## 5. 잔여 백로그 (126차 후보)

### 5-1. #3 성과허브 — ko 보강 선행 별개과제
ko 464키 정답 신규작성 선행. 대형·별개프로젝트성. 126차
보류 유지, 다른 안전 백로그 우선. ko 보강 착수는 사용자 협의.

### 5-2. 키단위 diff 잔여 — 계속 (★126 우선 권장)
- 3,478건 복구 후 잔여: 여전SKIP(parent_scoped 후도 비유일
  ja~290/zh~260) / ko 의심·오염 path / 나머지 stub.
- 126 절차(추천): ① keydiff2/remain 재실행 → d75d079 후
  잔여 raw → ② _ko_suspect 출력 raw 검토 → KO_CONTAMINATED
  확장 → ③ safestub 도구 무변경 재사용(필요 시 다중부모
  풀스택 특정 + F14 픽스처) → 합성검증 → remain-dry raw →
  안전검사 → remain-apply 1커밋. 여력껏 최대.

### 5-3. 4순위 잔여
- runAI → 122 c3931b4 종결. workspace 브랜드키/CRLF/ESLint/
  attrData zh(#3 연계) / marketing 복구불가(ko부재·오염, 보류).

### 5-4. 마지막 (전 종결 후)
- 묶음 push (검수자 승인 필수). origin ↑51 → deploy.yml
  자동배포. **사용자 명시 승인 없이 절대 금지**. 입력창 push
  잔존 시 ESC 안내 우선.

---

## 6. 126차 즉시 재개 절차

1. **0순위 상태 확인** (검수자 첫 산출, t 접두 한 줄):
   `t git log --oneline -5; node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; git status --short`
   → raw 로 HEAD=d75d079 / ja·zh OK / clean 확인.
2. **5-2 잔여 우선**. 5절 5-2 절차(keydiff2/remain 재실행 →
   _ko_suspect raw 검토 → KO_CONTAMINATED 확장 → safestub 무변경
   재사용)부터. read-only 진단 → raw 확정 → 검수자 추천 →
   사용자 선택 → 복구도구(4절 1~10+N-19~27 재사용) → 합성검증
   ALL PASS → remain-dry raw(escape정합 실제) → 안전검사 ALL →
   remain-apply 1커밋.
3. 분기 시 검수자 추천 1개 후 사용자 선택. 무리 금지, 보류는
   물리불가(ko부재/오염)시만, 여력 있으면 계속(125차 3,478건).
   CC 추측·“승인?”은 raw 정정(N-17/N-18).
4. 종결 시 본 NEXT_SESSION.md 전체 재작성 → 사용자 저장 →
   검수자 CC 명령 교체. PM_HANDOVER.md/FEATURE_PLAN_120.md 불변.

### 자산 위치
- ★`session125_recover_safestub_jazh.py`(N-24~27+import-가드+
  F1~F13) + `session124_recover_mi_jazh.py`(N-23) 차기 표준.
- 백업 `*.bak_session121_*`~`*.bak_session125r_*` 다수.
- 컨테이너 세션 한정, 루트 잔존분 재사용.

---

*(끝. 본 문서만으로 126차 무손실 재개. 125차 5-1 #3 ko부재
raw확정(보류·별개) + 5-2본 a69ea56(2,673) + 5-2잔여
d75d079(805) = 총 3,478건 EN stub→ko 로컬라이즈 종결.
ko.js 오염 발견(N-25). 검증자산 N-24~27·import-가드 신규.
raw 우선, 추측·CC요약 신뢰 금지 N-17/N-18. 검수자 명령 t
접두 한 줄. `&&`/`||` 금지 `;` 만. push 사용자 명시 승인 필수.)*