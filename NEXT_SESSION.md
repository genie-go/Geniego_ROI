# GenieGoROI i18n 인계서 — 128차 시작점

> 본 문서는 127차 검수자가 전체 작성. 128차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 128차 시작 시
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
4. **★불가의 2종 구분 (사용자 질문에서 확립 — 반드시 계승)**:
   - **종류 1 (물리·논리 불가)**: 데이터 구조 자체의 한계.
     도구·데이터가 동일하면 차수가 바뀌어도 결과 동일. 다음
     차수에 자동으로 풀리지 않음. 풀리려면 새 식별축 발굴
     또는 데이터 구조 변경이 선행돼야 함. 예: 순서대응 불성립
     leaf(4축 소진).
   - **종류 2 (선행부재 불가)**: 선행 작업이 없어서 불가.
     선행 조건이 충족되면 다음 차수에 동일 도구로 가능. 예:
     auto.* 정답부재 → ko 정답 신규작성(5-1) 선행 시 가능.
   ※ 인계서엔 "다음 차수에 하면 됨"이 아니라 **무엇이 선행
     돼야 가능해지는지**를 명시한다. 차수가 바뀐다는 사실
     자체는 아무것도 가능하게 만들지 않는다(검수자·도구·
     데이터 동일).

**작업 수칙**
- 모든 CC 명령 맨 앞 `t ` 접두 필수.
- cp949 회피 표준형:
  `t $env:PYTHONIOENCODING="utf-8"; python <도구> 2>&1 | Out-File -Encoding utf8 <log>; $env:PYTHONIOENCODING=""; code <log>`
- 명령 연결은 `;` 만 사용(`&&`/`||` 금지).
- CC 승인 프롬프트: `1.Yes/2.allow all/3.No` → `2`,
  `1.Yes/2.No` → `1`. 검증완료 .py 를 CC 가 자체수정
  시도하면 → `3`. 도구 버그는 CC 에 안 시키고 검수자가
  직접 수정(N-18).
- 검수자 설명은 한글·핵심만 짧게. 초엔터프라이즈급 정밀도.
- push 는 사용자 명시 승인 시에만(현재 origin 대비 미실행
  유지 — 5-4).
- read-only 진단/probe 우선. apply 는 dry → raw 확인 →
  apply 순. 백업+node+rollback 필수. 합성검증 ALL PASS
  아니면 abort.

---

## 1. 프로젝트 좌표

- locale: `D:\project\GeniegoROI\frontend\src\i18n\locales\{ko,ja,zh}.js`
- 인계서 본체: `D:\project\GeniegoROI\NEXT_SESSION.md`
  (PM_HANDOVER.md / FEATURE_PLAN_120.md 는 불변, 건드리지 말 것)
- 작업 도구: `D:\project\GeniegoROI\session127_*.py` (검증자산)
- ko leaf-paths 총수(127차 raw): 19,801

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`:
  `_is_balanced_jsstr`(양끝 `"` JS 더블쿼트 리터럴 검사 —
  probe_safefn raw 확정), `_ko_suspect`, `_is_hashkey`,
  `quote_integrity`, `KO_CONTAMINATED`, `norm`,
  `build_leaf_paths`(text→dict {fullpath:val}, 출현순서
  보존, 127차 raw len=19801),
  `scan_key_blocks`(→ list of tuple `(key,start,end,depth)`
  — **최상위 블록만**. 중첩 leaf 는 scan_blocks=0,
  offsetmap raw 확정), `extract_kv(body)` 1인자, ANYKEY_RE,
  `locate_and_plan`/`apply_plans` 치환메커니즘,
  LEAF_RE_TMPL = `("%s"\s*:\s*)("(?:[^"\\]|\\.)*")`
- `session123_diag_keydiff`: build_leaf_paths(text)→dict,
  출현순서 보존, ko len=19801
- `session124_recover_mi_jazh`: safety_check 는 **블록치환
  전용**(4인자 correct_block/target_blocks). leaf 토큰치환
  부적합 — raw 확정, 미사용(N-18 ②).

**127차 신규 복구도구 (검증완료, 커밋 실증)**
- `session127_recover_zhsolo.py`  → 61e89db (5-2c, 18건)
- `session127_recover_pathsolo.py`→ 233eb73 (5-2d, 465건)
- `session127_recover_sibset.py`  → a03ac9d (5-2a, 1711건)
- `session127_recover_valuniq.py` → 6365c97 (값-유일, 500건)
  ※ valuniq = pathsolo 의 locate/검증/합성검증 무변경
    계승(N-13), select 만 '값-유일' 로 교체.
- `session127_fix_uwwysx.py`      → 3988bca (기존오염 1건
  원복, 토큰 텍스트유일성 기반)

**127차 진단/probe (read-only, 재사용 가능)**
diag: autozone, axis2, axis3, brokenexact, integrity,
komean, offsetmap, ordergap, recheck, siblingset,
sibremain, spread6, uwwysx, uwwysx_fix, valuniq
probe: order, payload, recmech, safefn, sc124, struct

---

## 3. 완료 커밋 (HEAD = 102d2b8, 127차 5커밋 + 인계커밋)

| 커밋 | 내용 | 건수 |
|---|---|---|
| 61e89db | i18n(5-2c) zh단독 stub→ko | 18 |
| 233eb73 | i18n(5-2d) 풀경로 stub-유일 (ja326/zh139) | 465 |
| a03ac9d | i18n(5-2a) 형제집합 (ja1159/zh552) | 1711 |
| 6365c97 | i18n(5-2 valuniq) 값-유일 (ja418/zh82) | 500 |
| 3988bca | i18n(fix) auto.uwwysx ja 기존오염 원복 | 1 |
| 102d2b8 | docs(handover) 127→128 인계 | - |

- **127차 누적**: 복구 2,694건 + 기존오염 원복 1건
- **전체 누적**: 126차 3,528 + 127차 2,694 ≈ **6,222건**
  EN stub → ko 로컬라이즈
- 전 커밋 공통 안전검증: 합성검증 ALL PASS + 125 자산
  무변경(N-13) + escape정합(예상Δ=실제Δ) + brace균형 +
  범위밖무변경 + (s,e)겹침SKIP(N-27) + node --check OK +
  백업 + rollback. payloadPlaceholder 는 node 실파싱으로
  의미보존 raw 확정.
- node --check ja/zh = 0 (정상). locale tracked clean.
- origin 대비 push 미실행(5-4, 사용자 승인 대기).

---

## 4. 127차 핵심 발견 (128차가 반드시 알아야 할 것)

**N-18 — 126차 보류의 진짜 원인 = 진단도구 입력형식 버그**
126차까지 "안전여력 소진(보류)"는 진단이
`_is_balanced_jsstr` 에 언쿼트 순수값(`보안`)을 넣어 전량
unbalanced 오판한 것. 복구도구는 `"보안"` 큰따옴표 토큰을
받음. `json.dumps(v, ensure_ascii=False)` 정합입력(N-28)
으로 시정 후 재측정 → 2,694건 추가 회수. **교훈: 진단
입력형식이 복구도구와 정합하는지 항상 raw 검증. 보류는
추측이 아니라 raw 0 입증으로만.**

**도구 버그 3건 — 검수자 직접 시정 (CC 에 안 시킴, N-18)**
1. scan_key_blocks 반환을 dict 로 추측 → tuple
   `(key,start,end,depth)` 최상위 블록 전용 raw 확정.
2. 124 safety_check 3인자 추측호출 → 블록치환 전용(4인자)
   raw 확정, 호출 제거.
3. sibset locate 보수적 텍스트스캔 → 결정적 순서대응
   self-verify 재작성(probe_order: dict순서↔정규식순서
   성립률 ja 98.4%/zh 98.6%, 불성립 leaf 전건 SKIP).

**N-18 추가 — auto.* 기존오염을 5-2(b) 점검이 발견**
`_is_hashkey` 가 'auto.<숫자없는 영숫자>'(uwwysx 류)를
해시키로 판정 못함(False, raw 확정). 따라서:
- auto.uwwysx ja 가 ko 깨진값 `'Count동 Register · Edit
  · Test'` 로 오염돼 있었음 → 127차가 만든 게 아니라
  126차 이전부터 존재한 **기존오염**(백업 3개 전부 동일).
  올바른 값 `"Uwwysx"` 가 zh미전파+형제출현+placeholder
  표준 3중으로 raw 유일확정 → 3988bca 로 원복 정당.
- **단 uwwysx 는 특수 케이스**(원래 placeholder 자리라
  키 캐피탈라이즈가 정답). 다른 auto.* 깨짐은 ko 에 의미
  한국어가 있다가 깨진 것이라 캐피탈라이즈가 정답 아님 —
  추측원복 금지(N-17/N-25).

---

## 5. 잔여 백로그 (raw 확정 — 128차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 선행 없이는 차수 무관 불가)

**순서대응 불성립 leaf (ja~140 / zh~138, sibset SKIP분)**
- 4개 식별축 모두 결정 불가 raw 확정:
  ① leaf 단독 path 비유일(N-29)
  ② 형제집합 지문 — 성립분 회수완료, 불성립분 SKIP
  ③ 정규식 순서대응 — build_leaf_paths 논리평탄화 ≠
     텍스트 물리순서(ordergap raw: liveSyncStatus 수일치
     인데도 순서 어긋남 = 구조적 불일치)
  ④ scan_key_blocks offset — 중첩 leaf 미제공
     (offsetmap raw: 전 표본 scan_blocks=0, 최상위만)
- path↔출현 결정적 매핑 수단 부재. 추측 매핑은 오치환
  위험(N-17). 안전장치(순서대응 self-verify)가 정확히
  차단 — 올바른 종결 상태.
- **128차 가능 조건**: 위 4축 외 **새로운 결정적 식별축**
  을 발굴해야만 가능. 단순히 차수가 바뀌는 것으로는 불가.
  발굴 시도는 read-only 진단으로 먼저 effect 측정 필수.

### 5-B. 종류 2 (선행부재 불가 — ko 정답 작성 선행 시 가능)

**auto.* 깨진 ko + 전파 (brokenexact raw 확정 수치)**
- auto.* 진짜깨짐 ja/zh 전파 = **48건** (uwwysx 1건
  원복완료, **47건 잔존**)
- auto.* ko 깨진값 총 = 약 92건(autozone raw, 비전파분
  포함)
- auto.* 外 진짜깨짐 전파 = **10건**
  (Metric명/Compare표/Token/Suite/CVC/SNS/Partial/
   GlobalDataContext 등 — 일반영단어 박힘)
- **제품용어 오탐 79건은 정상**(SKU와/ROAS가/CJ대한통운/
  AI가/CRM에 등 — 제품 고유어+조사). **무조치**.
- 이 깨짐들은 **ko 원본 자체가 깨진 것**. 올바른 한국어를
  raw 로 확정할 출처가 ko/ja/zh 어디에도 없음(uwwysx 만
  placeholder 라 예외였음). 추측원복 = N-17/N-25 위반.
- **128차 가능 조건**: 인계서 5-1 "ko 정답 신규작성"이
  **선행 완료**되면(=올바른 한국어가 ko.js 에 채워지면)
  그때 동일 복구도구로 ja/zh 회수 가능. 선행 없이는 128
  차에도 동일하게 불가. → **ko 정답 신규작성은 별개 과제,
  검수자 단독 판정 불가(정답 출처 부재).**

**marketing (5-3)**: ko 부재·오염 보류영역. pathsolo/
valuniq 의 N-17 필터가 marketing.*/marketingIntel.* 를
SKIP 중. ko 정답 확보 선행 필요(종류 2).

### 5-C. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. 별개 과제.
  5-B 의 선행조건이기도 함(auto.* 정답 작성과 연계).
- **5-4 push**: origin 대비 미실행. 사용자 명시 승인 시
  에만. 현재 5커밋 로컬 보유.
- **_is_hashkey 경계 부정확 (인계 필수 기재)**: 'auto.<숫자
  없는 영숫자>'(uwwysx/akwt48/b46onw…)를 해시키로 판정
  못함(False). 복구도구가 배제 못해 일부 깨진 ko 전파
  가능. 단 정답 raw 부재라 원복 불가(5-B). 128차가
  _is_hashkey 경계를 수정하려면 먼저 영향범위 read-only
  측정 후 신중히(검증자산 무변경 원칙 vs 경계수정 trade-off
  — 사용자 판단 필요).

---

## 6. 127차 무결성 raw 확정 (128차 신뢰 기반)

- 정합 전파(ja/zh==ko) 중 ko 정상값 전파 = **4,627건 안전**
- 토큰 비균형 전파 = **0** (구조 무결성 확정)
- auto.* 外 진짜깨짐 전파 = 10 (전부 기존 ko 깨짐, 127차
  복구도구가 만든 게 아님 — 정상복구에 기존깨짐이 함께
  옮겨진 것. _ko_suspect/_is_balanced 필터 유효 입증)
- **결론: 127차 5커밋 복구분 무결성 raw 확정.** 회수
  가능한 안전 식별축(zh단독/풀경로/형제집합/값-유일)
  전부 발굴·측정·실행 소진. 잔여는 5-A(종류1) /
  5-B(종류2) 로 raw 분류 완료.

---

## 7. 128차 실행 로드맵 (★사용자 확정 우선순위 — 이 순서대로)

> 잔여는 전부 종류1(매핑수단 부재) 또는 종류2(정답 부재).
> 127차에 기계적 회수분(6,222)은 소진. 남은 것을 **가장
> 쉽고 확실하게 푸는 순서**를 사용자가 확정함. 의존관계:
> ④ko정답 작성이 ②③의 선행조건. ③측정이 전체 잔여규모를
> 닫는 마지막 미지수. 아래 순서를 반드시 지킬 것.

**0단계 — 시작 시 raw 재확인 (필수)**
`t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; git log --oneline -6; git status --short`
→ HEAD=102d2b8(인계커밋), locale clean 확인.

**★1순위 — ③ marketing/marketingIntel 물량 raw 측정
(read-only, 최우선·즉시)**
- 이유: "작업"이 아니라 "측정"이라 즉시 가능. 결과로
  (a) 전체 잔여 지도가 닫힘 (b) ko 가 멀쩡한 marketing
  분량은 ④ 없이도 즉시 회수 가능 = 가장 빠른 확실한 진전.
- 방법: pathsolo/valuniq 의 N-17 marketing 필터를 끈
  read-only 변형 진단 작성(125 계승, locale 무변경) →
  marketing.* / marketingIntel.* 의 ① 총 stub 수
  ② ko 정상값 존재분(즉시 회수 가능, 종류 없음)
  ③ ko 부재·오염분(종류2) 을 raw 분리 측정.
- effect(ko정상 존재분) > 0 → 그 분량만 valuniq/pathsolo
  방식으로 dry→raw→apply→커밋 (즉시 추가 복구).
- ko 부재분은 ②와 함께 5-B(종류2) 로 확정 인계.

**2순위 — ④ ko 정답 신규작성 착수 여부 (사용자 결정)**
- 가장 큰 레버리지: 풀리면 ②(auto.* 약92) + ③ko부재분 +
  5-1(464키)이 연쇄로 기계작업화. 단 **검수자 단독 불가**
  — ko 정답은 제품 올바른 한국어를 아는 주체가 정해야 함
  (추측작성 = N-17/N-25 위반, 금지).
- 128차 검수자는 사용자에게 ④ 착수 여부를 물어 결정.
  착수 시: ko 작성 완료분에 대해 127차 검증 복구도구
  (zhsolo/pathsolo/sibset/valuniq) 그대로 재사용해 ja/zh
  회수(N-13). 미착수 시 ②③ko부재분은 종류2 보류 유지.

**3순위 — ① 순서대응 불성립 새 식별축 발굴 (도박성)**
- 독립 문제(ko 무관). 4축 소진 raw 확정(5-A). 5번째
  결정적 매핑 수단을 read-only effect 측정으로 먼저 가늠.
  effect>0 시에만 복구도구(125 계승). effect=0 이면
  종류1 물리한계 재확정하고 매달리지 말 것(0-3 원칙).
- 우선순위 최하 — ②③④ 정리 후 또는 여력 있을 때만.

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후
다음 순위로 전환(0-3). 전부 불가면 정직하게 부분종결,
사용자 승인받아 인계. 모든 apply 는 dry→raw→apply,
백업+node+rollback, 합성검증 ALL PASS 필수.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 128 -> 129"; git log --oneline -3`

※ 사용자가 명시적으로 강조: 작업 여력 있는 한 미측정 축
계속 발굴·진행. 불가작업엔 매달리지 말고 전환(0-3).
종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 인계에
반드시 명시(0-4).

---
*(127차 검수자 작성. 모든 수치 raw 확정. 128차는 시작 시
재확인 후 진행.)*