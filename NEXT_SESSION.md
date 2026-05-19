# GenieGoROI i18n 인계서 — 129차 시작점

> 본 문서는 128차 검수자가 전체 작성. 129차 검수자는 이 문서
> 전체를 신뢰 기반으로 삼되, 모든 수치·상태는 129차 시작 시
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
- 작업 도구: `D:\project\GeniegoROI\session128_*.py` (검증자산)
- ko leaf-paths 총수(128차 시작 raw): 19,801

---

## 2. 핵심 검증자산 (N-13: 무변경 재사용 — 절대 재작성 금지)

**검증 모체 (import 전용, 무변경)**
- `session125_recover_safestub_jazh`:
  `build_leaf_paths`(text→dict, **값은 JS raw escape 보존**
  — 128 N-28 raw 확정. e.g. `\"` 보존),
  `_ko_suspect(path, ko_val)` — 2인자 시그니처(128 N-18 raw),
  `_is_hashkey`(auto.<숫자없는 영숫자> 미식별 한계 존재),
  `KO_CONTAMINATED`, `norm`,
  `scan_key_blocks`(최상위 블록만, 중첩 leaf scan_blocks=0),
  `extract_kv(body)` 1인자, ANYKEY_RE, `locate_and_plan`/
  `apply_plans`, **LEAF_RE_TMPL** = `("%s"\s*:\s*)("(?:[^"\\]|\\.)*")`
- `session123_diag_keydiff`, `session124_recover_mi_jazh`
  (124 safety_check 는 블록치환 전용 4인자, leaf 토큰
  치환 부적합 — 미사용, N-18 ②)

**127차 신규 복구도구 (무변경 재사용 가능)**
- `session127_recover_zhsolo.py`  → 61e89db
- `session127_recover_pathsolo.py`→ 233eb73 (select 함수
  L137, N-17 marketing 필터 L164-169, locate L184, apply
  L230, synth L270, main L398)
- `session127_recover_sibset.py`  → a03ac9d
- `session127_recover_valuniq.py` → 6365c97 (select L140,
  N-17 L174-178)
- `session127_fix_uwwysx.py`      → 3988bca
- `session127_probe_order.py`     : 134줄, dict순서↔정규식
  finditer 순서 대응 검증 (build_leaf_paths + LEAF_RE_TMPL +
  order_ok/order_bad/count_mismatch)
- `session127_diag_autozone.py`   : 175줄, **[1]_is_hashkey
  분류 [2]ko깨짐 [3]ja/zh전파 측정 — 인계서 정합 표준**

**128차 신규 도구 (검증완료, 커밋 실증)**
- `session128_diag_marketing.py`         → marketing 잔여 raw 분류
- `session128_diag_mk227_effect.py`      → valuniq/pathsolo effect 측정
- `session128_recover_mk_valuniq.py`     → 415c93a (260건)
- `session128_recover_mk_pathsolo.py`    → 45da896 (8건)
- `session128_diag_mk_remain.py`         → 잔여 R1/R2/미상 분류
- `session128_diag_orderaxis_r88.py`     → R1-88 effect 측정
- `session128_probe_order_mk88.py`       → R1-88 self-verify
- `session128_recover_mk_orderaxis.py`   → d8bd83a (44건)
- `session128_diag_kosrc_recheck.py`     → auto.* 판정기준 정합
- `session128_make_ko_sheet_auto4.py`    → auto4 ko 시트 생성
- `session128_apply_auto4_ko.py`         → 8ca2ff5 (14건)
- `session128_make_ko_sheet_az88.py`     → az88 ko 시트 생성 (대기)
- `_t128_esc_diag.py`                    → escape 정합 진단 (1회성)

---

## 3. 완료 커밋 (HEAD = 8ca2ff5 직후 또는 인계커밋, 128차 4커밋 + 인계커밋)

| 커밋 | 내용 | 건수 |
|---|---|---|
| 415c93a | i18n(5-3 mk-valuniq) marketing KO_OK 값-유일 (ja116/zh144) | 260 |
| 45da896 | i18n(5-3 mk-pathsolo) marketing KO_OK 풀경로-유일 (ja1/zh7) | 8 |
| d8bd83a | i18n(5-A order-axis) marketing R1 probe_order self-verify (ja26/zh18) | 44 |
| 8ca2ff5 | i18n(5-B auto4) user-confirmed ko fix + ja/zh propagation restore (ko8/ja4/zh2) | 14 |

- **128차 누적**: 회수 326건 (marketing 312 + auto4 14)
- **전체 누적**: 127차까지 6,222 + 128차 326 = **6,548건**
  EN stub/오염 → ko 로컬라이즈
- 안전검증 공통: dry→raw→apply, 백업+node+rollback, 합성검증
  ALL PASS, 125 자산 무변경(N-13), escape 정합(jtok 정합치환),
  brace 균형, 범위밖 무변경, (s,e) 겹침 SKIP(N-27).
- node --check ja/zh/ko = 0 (정상). locale tracked clean.
- origin 대비 push 미실행(5-4, 사용자 승인 대기).

---

## 4. 128차 핵심 발견 (129차가 반드시 알아야 할 것)

### N-28 — build_leaf_paths 반환값은 JS raw escape 보존
build_leaf_paths 가 `\"` 포함 JS 문자열을 unescape **하지
않고** raw 그대로 반환함. 따라서:
- 파일 토큰 재구성 = `'"' + value + '"'` (따옴표만 감쌈)
- `json.dumps(v, ensure_ascii=False)` 적용하면 **이중 escape**
  발생 (FAIL). 마찬가지로 수동 `s.replace('\\','\\\\').replace('"','\\"')` 도
  이중 escape 유발.
- **올바른 helper**: `def jtok(s): return '"' + s + '"'`
- 이 사실은 `_t128_esc_diag.py` 로 gf8Desc/gf10Desc(값 안에
  `\"` 포함) 케이스에서 raw 입증됨. backslash 없는 일본어
  샘플만 보면 unescaped로 잘못 결론 가능 — **샘플 선택 주의**.

### N-29 — Windows Python text 모드는 CRLF→LF 자동 변환
`open(path, "w", encoding="utf-8", newline="")` 가 윈도우에서
write 시 CRLF→LF 변환을 일으킴(read도 universal newlines
효과). ko.js apply 후 63,303줄 폭증 사고 발생.
**해결**: read/write 모두 binary 모드.
```python
def read_text_keep_eol(p):
    with open(p, "rb") as f: return f.read().decode("utf-8")
def write_text_keep_eol(p, txt):
    with open(p, "wb") as f: f.write(txt.encode("utf-8"))
```
locale 파일에 쓰는 모든 도구는 이 패턴 사용 필수.
git commit 시 `warning: CRLF will be replaced by LF` 는 git의
.gitattributes/core.autocrlf 정책에 따른 정규화 경고 — 정상.

### N-30 — 인계서 "약 92건"의 정확한 raw 출처
127차 인계서의 "auto.* ko 깨짐 약 92건"은 **autozone [2]
출력값** (path 단위 92건). leaf_key 단위로는 **128개**
(평균 한 key가 2위치 — `auto.K` + `dash.operations.auto.K`).
- `_ko_suspect` 기준으로는 0 (다른 판정기준)
- "ko에 한글+영문 혼재" 기준 = autozone [2] 정합
- 128차 8ca2ff5 로 4 key 처리 → **잔여 128-4 = 124 leaf_key**
  (단, az88 시트 도구는 4 key 제외해 **128 leaf_key 시트
  생성** — 인계서 "잔여 88"과 실측치 차이 있음. 129차 raw
  재측정 필요. 또는 도구 출력 그대로 신뢰: leaf_key 수가
  진실, "88"은 인계서 추정치였음을 raw 확정.)

### N-31 — 워크플로우 1사이클 실증 완료 (auto4)
사용자 ko 확정 → 검수자 binary-safe 도구 → ko/ja/zh
동시 반영 → 합성검증 ALL PASS → 커밋. 이 사이클이
8ca2ff5 로 raw 입증됨. 동일 방식으로 az88(128 leaf_key),
marketing(3,020) 등 모든 종류2 처리 가능.
**핵심 가정 (auto4에서 검증됨)**:
- 같은 leaf_key 가 두 위치(`auto.K` + `dash.operations.auto.K`)
  에 있으면 ko_broken 값이 동일 → 동일 ko_fixed 적용 안전
- ko_broken set 안에 있는 ja/zh 현재값만 전파분으로 인정
  → placeholder(`Ynyctt` 등 캐피탈라이즈) 자연 제외
- path-precise leaf_re 치환 (dict 순서 == finditer 순서)
- 안전치환: 토큰 일치 확인 후 group(2)만 교체

---

## 5. 잔여 백로그 (raw 확정 — 129차 작업 후보)

### 5-A. 종류 1 (물리·논리 불가 — 선행 없이는 차수 무관 불가)

**순서대응 불성립 leaf**
- marketing R1 中 bad/mismatch 12건 (probe_order self-verify
  불성립, 128차 d8bd83a 시 종류1 확정)
- marketing R1 中 ko 부재로 종류2인 분 3,020건(5-B 참조)
- 인계서 127차 5-A 의 marketing 외 R1 잔여 (수치 미측정)
- **129차 가능 조건**: 5번째 결정적 식별축을 read-only effect
  측정으로 발굴해야만 가능. 단순 차수 변경으론 불가.
  단 128차 R1-88 effect 측정에서 C1+C2+C3 union=38 중
  probe ok=44, bad/mismatch=12 라는 raw 가 나옴 — 38 후보
  중 probe 통과분이 회수됐고 나머지는 정합 불성립.
  추가 식별축 발굴 시 같은 방식(effect→self-verify→회수)
  적용 가능.

### 5-B. 종류 2 (선행부재 불가 — ko 정답 작성 선행 시 가능)

**★최우선 — az88 (autozone [2] 잔여)**
- 128차 8ca2ff5 로 4 key (ynyctt/rzmlkl/zrqhyh/mgmepv) 처리
- `session128_make_ko_sheet_az88.py` 실행 결과 raw:
  - 잔여 후보 path = **255개** (4건 완료 제외)
  - 작성 대상 **leaf_key = 128개**
  - ko_broken 다중값 충돌 = **0** (단일값 확정 — auto4 가정
    그대로 적용 가능)
- 시트 생성됨: `_ko_sheet_az88.csv` / `_ko_sheet_az88.json`
- 오염 패턴 5종 (autozone 분석 raw):
  ① 영문 직후 한글 (Kakao Notification톡 → 카카오 알림톡)
  ② Count+한글 (OrdersCount집 → 주문 수집)
  ③ Auto+화 (AdsAuto화 → 광고 자동화)
  ④ 영문 명사+한글 조사 (Management자 → 관리자)
  ⑤ 영문 동사+완료 (Delete되었습니다 → 삭제되었습니다)
- **129차 가능 조건**: 사용자가 ko_fixed 칸 채우면 즉시
  가능. 검수자는 `session128_apply_auto4_ko.py` 를 N-13
  계승해 az88 회수 도구 작성 (binary-safe read/write,
  path-precise 치환, ko_broken_set 기반 ja/zh 한정).
- 절대 금지: CC/검수자가 추측으로 ko_fixed 채우기(N-17/N-25).

**marketing ko 부재 (대규모)**
- 128차 `session128_diag_marketing.py` raw:
  TOTAL_STUB 3,979 = KO_OK 227 + KO_ABSENT/BAD 3,752
- 3,020건은 marketing R1 중 ko 부재(autozone 와 별개 측정,
  measure_kosrc_recheck.py raw)
- ko 부재 namespace 대부분이 `ruleEnginePage.marketing.*`
- **129차 가능 조건**: az88 완료 후 사용자가 marketing 분량
  ko 작성. 시트는 별도 도구로 namespace 단위 분할 권장
  (3,020을 한 번에 채우긴 부담 큼).

**auto.* 외 진짜깨짐 ja/zh 전파 = 10건 (127차 N-18 raw)**
- Metric명/Compare표/Token/Suite/CVC/SNS/Partial/
  GlobalDataContext 등 일반영단어 박힘
- 인계서 127차 5-B 그대로 인계. ko 정답 작성 선행 필요.

### 5-C. 독립 과제

- **5-1 #3 성과허브**: ko 464키 신규작성 선행. 별개 과제.
- **5-4 push**: origin 대비 미실행. 128차에 4커밋 + 인계
  커밋 추가. 사용자 명시 승인 시에만.
- **_is_hashkey 경계 부정확**: 'auto.<숫자없는 영숫자>'
  미식별 한계 그대로(127차 인계). az88 처리하면 영향 영역
  대부분 해소될 가능성.
- **SyntaxWarning '\p'**: 일부 도구 docstring 내 `\p` 표기
  에서 발생. 실행 무관. 정리는 선택사항.

---

## 6. 128차 무결성 raw 확정 (129차 신뢰 기반)

- 4커밋 모두 dry→raw→apply, 백업+node+rollback, 합성검증
  ALL PASS 통과
- 415c93a/45da896: 268건 marketing valuniq+pathsolo, ins=del
  균형
- d8bd83a: 44건 order-axis, ins=del=44, probe ok 기반
- 8ca2ff5: 14건 auto4, ko 8+ja 4+zh 2, CRLF 보존 (binary 모드)
  - ko.js diff 16줄(8건×2), ja.js 8줄, zh.js 4줄
- 128차 이전 ko.js 63,303줄 폭증 사고 → rollback 후 binary
  모드로 재apply 성공 (N-29)
- **결론: 128차 4커밋 무결성 raw 확정.** 워크플로우 1사이클
  실증 완료. az88 시트 준비됨.

---

## 7. 129차 실행 로드맵 (★우선순위 — 이 순서대로)

**0단계 — 시작 시 raw 재확인 (필수)**
```
t node --check frontend/src/i18n/locales/ja.js; node --check frontend/src/i18n/locales/zh.js; node --check frontend/src/i18n/locales/ko.js; git log --oneline -7; git status --short
```
HEAD 인계커밋 + 8ca2ff5/d8bd83a/45da896/415c93a 확인,
locale clean, node 3개 OK.

**★1순위 — az88 진행 (사용자 ko 입력 후 즉시 가능)**
- 사용자가 `_ko_sheet_az88.csv` 의 ko_fixed 칸을 채워
  저장한 상태인지 확인. 안 채워졌으면 사용자에게 진행 의사
  확인 (128차 부분종결 시점에 미작성 상태).
- 채워진 항목 수를 raw 확인 (read-only).
- 검수자가 `session128_apply_auto4_ko.py` 를 N-13 계승해
  `session129_apply_az88_ko.py` 작성:
  - binary-safe read/write (N-29)
  - jtok = `'"' + s + '"'` (N-28)
  - path-precise leaf_re 치환 (auto4 검증됨)
  - ko_broken_set 기반 ja/zh 전파분 한정 (placeholder 자연 제외)
  - 사용자 확정 ko 매핑은 CSV 에서 로드(하드코딩 금지 —
    az88 은 128개라 하드코딩 비현실적)
- dry → raw → apply → 합성검증 ALL PASS → 커밋
- 빈칸 항목은 자동 제외 — 부분 처리 OK (0-1)

**2순위 — marketing 3,020 ko 작성 시트 (namespace 분할)**
- az88 종결 후 진행
- 한 시트에 3,020 부담 → namespace(ruleEnginePage.marketing.*
  하위) 단위로 분할 시트 생성 권장
- 도구는 az88 도구 N-13 계승

**3순위 — order-axis R1 추가 새 식별축 발굴 (도박성)**
- 5번째 결정적 매핑 수단 read-only effect 측정 후 effect>0
  분만 self-verify 거쳐 회수
- 우선순위 최하 — 1/2 순위 정리 후 또는 여력 있을 때만

**진행 불가 시**: 각 순위에서 raw 로 부재/불가 입증 후 다음
순위로 전환(0-3). 전부 불가면 정직하게 부분종결, 사용자 승인
받아 인계.

---

## 8. 종결 절차 (사용자 승인 후에만)

종결 요약 보고 → 사용자 승인 → 검수자가 NEXT_SESSION.md
전체 작성(기존 삭제 후 전체 붙여넣기) → 사용자 저장 →
CC 명령으로 차수 인계 커밋:
`t git add NEXT_SESSION.md; git commit -m "docs(handover): session 129 -> 130"; git log --oneline -3`

※ 사용자 명시 지시 (반드시 계승):
- 작업 여력 있는 한 미측정 축 계속 발굴·진행
- 불가작업엔 매달리지 말고 전환 (0-3)
- 종류1/종류2 구분으로 "무엇이 선행돼야 가능한지" 명시 (0-4)
- 선택지 제시 시 검수자 추천 1개 반드시 명시
- 도구는 검수자가 작성 (CC 자체작성 금지, N-18)
- 사용자가 ko 결정하는 영역은 추측원복 절대 금지 (N-17/N-25)

---
*(128차 검수자 작성. 모든 수치 raw 확정. 129차는 시작 시
재확인 후 진행.)*