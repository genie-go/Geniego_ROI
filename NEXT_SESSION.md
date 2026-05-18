# GeniegoROI i18n 인계서 — 120차 시작점

> 119차 종결 시 전면 재작성 / 페어 모드(검수자 명령 → 사용자가 CC에 t 접두로 전달)
> 상단부터 순서대로. 0순위 먼저.

---

## 0. 운영 방식 (먼저 읽기 — 특히 ★진행 강제 / ★★검수자 추천 강제)

- 기본값: 검수자가 CC에 직접 수정/실행 명령. 신규 .py 본문은 검수자가 산출물 파일로 만들어 전달 → 사용자가 루트에 1회 저장. 진단·git은 CC가 직접.
- **sed·서브식·복합 파이프는 자동승인+Bash변환 반복 유발.** 신규 .py는 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 `python xxx.py 2>&1 | Out-File yyy.txt -Encoding utf8; code yyy.txt` 한 줄 실행. 이 패턴이 114~119차 내내 안정(119차 4커밋 전부 이 방식, apply 한 줄은 `python --apply` + `node --check` Append + `git add/commit` Append 결합형도 안정).
- **인라인 `python -c` 다줄 절대 금지**: PowerShell 경유 시 줄바꿈/괄호 깨져 SyntaxError. 진단·소스덤프도 전부 산출물 .py로(119 1순위에서 `python -c`+`cmd /c`+복합파이프 결합 명령이 자동승인 무한반복 → Esc 후 산출물 .py로 전환해 해결, 교훈).
- 모든 CC 명령은 t 접두 한 줄. **분기: ① 단순 `cd; python xxx.py | Out-File`(node --check·git add/commit Append 결합 포함) 한 줄 → "경로 우회 방지" 프롬프트 → Yes(정착, 안전, 119 전건). ② 임베디드 표현식($()/$LASTEXITCODE)·`python -c` 다줄·`cmd /c`·if/else·복합 다단 파이프 → Esc 후 산출물 .py로 단순화.**
- **CC 자체 패치 제안은 계속 reject.** CC가 산출물 안 기다리고 .py 자기판단 수정 시 "User rejected update" 거부. 도구는 오직 검수자 산출물만. 단 CC *진단 출력*(상태/소스 dump)은 채택 가능.
- 검수자 설명 매 턴 핵심만(명령 + 확인 1~2개). raw 우선, CC 요약/제안 절대 불신.
- 환경변수 설정 금지. cp949는 .py 내부 `sys.stdout.reconfigure(encoding="utf-8")`.
- **검증완료 파서 무변경 재사용 절대원칙(117·118·119 핵심)**: 신규 .py는 session112_inspect_suspect.py 의 `scan_key_blocks`/`extract_kv` 를 **import 무변경 사용**. 키집합/블록/span 자작 파서 금지. **119 결정적 교훈: 실모체 시그니처를 raw 로 확인하기 전 인계서 표기 계약을 신뢰해 도구 작성 → 실패. 반드시 실모체 소스 dump 로 호출규약 확인 후 도구 작성(아래 3절 모체 실측계약 참조).**
- node --check 판정: **Out-File 결과에 SyntaxError 텍스트 없으면 = PASS** (114~119 전건 이 방식).
- **컨테이너 초기화 → 검수자는 산출물 전달 전 합성검증 필수.** 합성검증 = 실모체 파서 무변경 미러 import + 실파일 구조 반영 픽스처(ROOT직속 R=parent_chain==[] & min depth / dash>ops=parent_chain에 dash&operations / ruleEnginePage 동명 / 따옴표내 콤마값 / 마지막키 / 중괄호균형 / 더미 vs 실값). 합성검증 통과 + 실파일 dry-run 양쪽 필수.
- **119 핵심교훈(키존재 ≠ 정답, 더미 함정)**: `(D−R)−K=0` (ko에 키 존재)만으로 ins 강행 금지. **반드시 ko 값을 raw 교차해 is_dummy_ko 판정**. ko값==키명(대소문자무시)이면 더미 → ins 시 무의미 토큰을 R에 영구 주입하는 오염(auto ja D−R 147 전부 ko더미 사례). 운영규칙 6(키존재만 → 값까지 직접 교차)의 결정적 실증.
- **119 핵심교훈(인계서 표기 비관 오기록 가능)**: 인계서 "정답출처 없음/수동이관" 표기가 lang_ratio 잔재로 틀릴 수 있음. super ja 3순위 "ko부재 수동이관" → raw 실측 시 D−R 97 전부 ko 실값 정답 보유(KO_DUMMY=0/KO_ABSENT=0)였음. **항상 raw 실측 우선(운영규칙 9·10), 인계서 표기는 출발점일 뿐.** 117 zh marketing 잔재정정과 동일 구조.

### ★★ 검수자 추천 강제 규칙 (의사결정 분기 시 — 최우선)
1. **선택지(ask_user_input) 제시 시 항상 검수자 추천 1개를 옵션 라벨 안에 "— 검수자 추천"으로 명시**하고, 직후 응답에서 추천 근거를 인계서 규칙 번호로 1~3줄 제시.
2. 사용자가 "검수자 추천대로"라고만 답해도 즉시 그 선택으로 진행(재질문 금지).
3. 추천은 반드시 인계서 규칙(★진행 강제/운영규칙/안전장치)에 근거.

### ★ 진행 강제 규칙 (미루기 금지 — 최우선)
1. **raw로 처리방향 확정 즉시 다음 단계 연속.** dry-run→raw확인→apply→node→commit 한 흐름 종결. 단계마다 멈추고 종결 금지.
2. **부분종결은 "인계서 작성 직전 단 1회"만.** 안전 즉시처리 대상 전부 소진 후(119: auto/marketing안전분/super 전부 소진 후 종결 — 표준). "다음 차수에서"는 raw로 손상/불완전/오염 입증된 경우만.
3. **한 세션 목표 = 최소 2단계 apply+commit.** (119차 4커밋 = 기준선 2배.)
4. "추측 금지"는 안전장치(백업·dry-run·가드·ROLLBACK) 있으므로 속도저하 명분 불가. raw 확정 안전대상 즉시 처리. 단 raw 입증 가능한 사실 확인용 진단 1회는 미루기 아님(가드 정당성).
5. 작업 여력 남으면 다음 우선순위로 계속. raw가 손실/불완전/오염 입증 시(복구선행·잔차·이관·한영혼재·KO_ABSENT) 강행 대신 정밀 이관.
6. 파괴 작업 전 백업·dry-run·검증·이상시 ROLLBACK 절대 생략 금지(속도 무관, 항상).

## 1. 컨텍스트

- 작업: i18n 번역 키 동기화. **정답 원본은 ko.js(원본 한국어)** — 115~119차 일관. EN 일부 키명그대로 stub라 ko 우선.
- locale: frontend\src\i18n\locales\{lang}.js (15개, ES모듈). 주 대상 ja.js/zh.js. 정답 출처 = ko.js, 참조 = en.js.
- 키는 따옴표 형태("pageTitle":...). 검증 node --check (SyntaxError 없음=PASS).
- **실측 트리구조**: ja.js/zh.js operations[dash] = dash > operations > 섹션. 인계서 표기 ≠ 실제, 항상 검증파서 scan_key_blocks 출력 + span 포함관계로 실측(운영규칙 9).
- **미번역키 ≠ 전부 복구가능**: is_dummy_ko 판정 = ko값 공백 OR ko값==키명(대소문자무시, 따옴표 포함값도 인식). 영숫자토큰 규칙 금지.
- **손실0 판정기준(117·118·119 표준)**: 값언어비율 아니라 **키집합 포함관계 + 값방향 raw**. ① D⊆R(키집합) ② R∩D 에서 D정답·R더미=0(D가 R보다 나은 키 전무) ③ D−R 전부 더미/부재. 이 3조건이면 dashdel 손실0. D−R 에 ko실값 정답 있으면 ins24 파생 복구선행 → D⊆R 성립 후 dashdel(super ja 119 표준 패턴).

## 2. 운영규칙 (절대준수)

1. 자동승인 → 0의 분기(① Yes / ② Esc 산출물.py화).
2. 한 줄·Windows 경로. 출력 Out-File; code <f>로 파일 원본 직접 확인.
3. node --check (SyntaxError 없음=PASS).
4. commit 영문 한 줄. .js만 스테이징(.bak/t*.txt/.py 제외 = 전부 ?? 미추적 정상). push는 사용자 확인 하(deploy.yml 자동배포).
5. CC 요약·제안 신뢰 금지 → 부모체인/brace-depth/값/키집합 raw만. CC 자체 .py 패치 reject.
6. **dry-run SKIP/SHARED·`(D−R)−K=0` 는 "키 존재"만. 값·is_dummy_ko 까지 직접 교차(119 더미함정 핵심교훈).**
7. 파괴 편집 전 .bak 백업. 재검증(3중/4중 동시 AND) 실패 시 자동 ROLLBACK.
8. **키집합 동일 ≠ 무손실. D⊆R 키집합 + R∩D D정답·R더미=0 + 원소속 R 정답보존이어야 손실0.** 고유명사(ko=en=현지어 동일 영문값) 미번역 아닌 정답.
9. **동명 블록 다중존재 주의**: 한 키가 ROOT/[ui]/[dash/operations]/[ruleEnginePage]/[pages] 등 복수 depth. 처리 전 probe로 부모체인·키수·키집합 raw 확정. **R 확정 = parent_chain==[] 且 동일 key 중 최소 depth (실모체 파서는 export default 래퍼를 key=None 으로 블록 제외 → ROOT 가 parent_chain 에 안 나타남. '가장 큰 것'·'parent_chain==[ROOT]' 휴리스틱 금지, 119 핵심).** D 확정 = parent_chain 에 dash & operations 포함 최내곽.
10. **값방향 raw 필수**: 통계·키존재만 믿지 말 것. 손실0 = 키집합 + 값방향(R∩D 더미/정답 분류) 동시. 인계서 표기 비관/낙관 둘 다 raw로 재판정(119 super 입증).

## 3. 핵심 .py 자산 (루트 보존, 컨테이너 초기화 → 매번 재저장)

### 검증완료 파서 모체 (읽기전용, 무변경 인용 — 절대원칙)
- **session112_inspect_suspect.py ★★** — 모든 신규도구 파서 모체. **119 실측 확정 계약(반드시 이 호출규약 준수):**
  - `scan_key_blocks(text)` → `[(key, start, end, depth), …]` 4-튜플. start='{' 위치, end='}' 위치, **depth=len(stack) (0-base; ROOT직속은 depth=1, export default 래퍼는 key=None 으로 blocks 제외)**. 부모체인 dict 없음 → span 진포함관계로 산출.
  - `extract_kv(body)` → `{key: value}` 평면 dict. **호출 시 body=text[s+1 : e] (여는 '{' 제외, 닫는 '}' 미포함). text[start:end+1] 넘기면 keys=0 (119 v1 실패원인).** 값은 **따옴표 포함 + `re.sub(r"\s+"," ")` 정규화**. 비교는 dict 통째(단일 리터럴 `==` 금지, N-14). 값 비교 시 unq() 로 양끝 따옴표만 제거 후 비교(내용 무변경).
- **표준 헬퍼(119 확립, 신규 도구 무변경 복붙):**
  - `pick_R(blocks)` = parent_chain==[] 중 최소 depth (ROOT직속).
  - `pick_D(blocks)` = parent_chain 에 'dash'&'operations' 포함 중 최대 depth.
  - `blocks_for_key(text,target)` = scan_key_blocks 에서 key==target + span 진포함 parent_chain.
  - `is_dummy_ko(key,val)` = unq(val).strip()=="" OR ==key.lower() (N-10, 따옴표 포함값 인식).

### 119차 신규 자산 (★ = 120차 재사용 표준)
- **session119_diag_auto_lossfree.py ★★** — 손실0 재판정 표준. R⊆D + R∩D 값방향 5분류(BOTH_SAME/BOTH_DUMMY/R_ANS_D_DUM/D_ANS_R_DUM/DIFF_NONDUM) + is_dummy_ko + D−R 더미율. **TARGET(blocks_for_key 인자 'auto') 치환만으로 임의 SEC 손실0 진단(super 파생 입증). 결론가이드는 보수적(DIFF_NONDUM>0 시 위험 플래그) — D_ANS_R_DUM=0 이면 raw 정밀판독으로 손실0 확정 가능(auto/super 양건 입증).**
- **session119_adopt_ops_ja_autodel.py ★★ (e8c32a8 적용·검증완료)** — dashdel 표준. 파서/3중 동시 AND(removed∧preserved∧siblings)/deletion_span(선행콤마 유무 균형)/ROLLBACK/self_test 무변경. **TARGET·self_test 픽스처만 변경 → 임의 dash 격리(superdel 4b836cd 파생 입증). dashdel 의 120차 모체.**
- **session119_adopt_marketing_ja_ins15.py ★★ (aac9ab2 적용·검증완료)** — ROOT직속 ins 표준(ins24 모체 계승). 4중 동시 AND(inserted∧preserved∧ins_val∧count_ok). **SEC·INSERT_KV 만 변경 → 임의 ko기반 복구 ins(super_ins97 1fa21db 파생 입증). ins 의 120차 모체. 미리보기 라인은 INSERT_KV 첫키 동적참조(하드코딩 금지, 6순위/N-13).**
- session119_adopt_super_ja_ins97.py (1fa21db) / session119_adopt_ops_ja_superdel.py (4b836cd) / session119_diag_marketing_ja.py / session119_diag_super_lossfree.py / session119_dump_super_dmr_ko.py / session119_dump_parser.py(실모체 소스 dump 표준) — 위 모체들의 검증완료 파생. 재사용 가능.

### 118/117/116 자산 (보존·재사용 가능)
- session118_adopt_acctperf_ja_ins24.py ★★ / session118_adopt_ops_ja_acctperfdel.py ★★ / session117_keyset_verdict.py ★★ / session118_keyset_verdict_budget.py ★ / session116_adopt_gairec_ja_ins37.py ★★ / session115_adopt_gcat_zh_translate.py ★★.
- ※ 폐기·참고만: session111_subset_absent.py / session117_dump_dash_lossrisk.py(v5 lang_ratio) / session118_probe_recovery_v1 / session119_diag_auto_ja_vs_ko.py(v1, 인계서계약 신뢰 실패본 — v2 가 표준).

## 4. [DONE] 119차 결과 (raw 확정·apply 성공만 — 4커밋)

### 4-0. push — 묶음 보류 유지
HEAD=4b836cd. origin 대비 ↑30 추정(117 종결 ↑21 + 118 6 + 119 4 + docs; 정확값 120 0순위 git log 실측). 검수자 결정: 계속 묶음 보류.

### 4-1. ★ auto ja 완전 종결 (1순위 핵심, 117·118 최난도 잔여) — 1커밋
- raw: auto ja 3블록 = ruleEnginePage(d2,319) / dash>ops(d3,319=D) / ROOT직속(d1,172=R). R⊆D=True, R−D=0, **D−R=147 전부 ko더미**(144 직접 + event_empty/json_err/not_arr 키명변형). R∩D 172: R정답·D더미=160 / BOTH_SAME=6 / DIFF_NONDUM 6(R=ko정답·D=stub) / **D정답·R더미=0**.
- **핵심교훈**: 인계서 119 1순위 "D⊆K=True → ko기반 ins 147" 강행했으면 무의미 더미를 R에 영구 주입(오염)이었음. raw 값교차로 ko더미 판명 → ins 폐기, ins 없이 dashdel 만으로 손실0(D−R 전부 더미 = 잃을 정답 없음 + D정답·R더미=0).
- **e8c32a8**: session119_adopt_ops_ja_autodel.py --apply. dash>ops auto 319키 격리. 형제 3→2, blk 397→396. 3중 AND True. node PASS. (321 deletions)

### 4-2. ★ marketing ja 안전분 종결 (2순위 일부) — 1커밋
- raw: D=625, R=733, D−R=65, D−K=50. D−R 분류: **KO_REAL=15**(ko 한국어 정답 존재) / KO_DUMMY=0 / **KO_ABSENT=50**(ko·R 부재, D에만 영문 Creative Studio 콘텐츠 csAiGen*/csType*/csPerf*). R∩D 560: BOTH_SAME=366 / DIFF_NONDUM=176(R=일본어정답·D=영문stub) / D정답·R더미=0.
- **aac9ab2**: session119_adopt_marketing_ja_ins15.py --apply. KO_REAL 15키 ko기반 일본어 ROOT직속 R ins. 733→748. 4중 AND True. node PASS. (15 insertions)
- **잔여**: KO_ABSENT 50 = ko·R 양쪽 부재, 정답출처 없는 신규번역 필요분 → 정밀 이관(120 2순위). marketing dashdel 은 KO_ABSENT 50 손실 불가피로 강행금지 확정(D⊆R 불성립).

### 4-3. ★ super ja 완전 종결 (3순위, 인계서 비관오기록 raw 반박) — 2커밋
- raw: 인계서 3순위 "D−R 97 + ko부재, 정답출처 없음, 수동이관" → **실측 정반대**. R⊆D=True, R−D=0, **D−R=97 전부 KO_REAL**(ko 한국어 정답, KO_DUMMY=0/KO_ABSENT=0, D−K=0). 인계서 lang_ratio 잔재 오기록.
- **1fa21db**: session119_adopt_super_ja_ins97.py --apply. D−R 97키 ko기반 일본어 ROOT직속 R ins. 72→169. 4중 AND True. node PASS. (97 insertions)
- **4b836cd**: session119_adopt_ops_ja_superdel.py --apply. ins97 후 재판정 R(169)=D(169) 키집합 완전일치, R∩D 169: BOTH_SAME=29 / DIFF_NONDUM=140 / **D정답·R더미=0**(결정적). dash>ops super 169키 격리. 형제 2→1, blk 396→395. 3중 AND True. node PASS. (171 deletions) → super ja = ins97+del 짝 완전 종결(117·118 acctPerf/budget 패턴).

## 5. [PENDING] 120차 작업 (★raw 확정 즉시 연속 진행, 손실입증 시만 이관)

### 0순위 — push 상태 재확인
```
t cd D:\project\GeniegoROI; git log --oneline -12 2>&1 | Out-File t120_status.txt -Encoding utf8; git status --short frontend/src/i18n/locales 2>&1 | Out-File t120_status.txt -Append -Encoding utf8; node --check frontend/src/i18n/locales/ja.js 2>&1 | Out-File t120_status.txt -Append -Encoding utf8; node --check frontend/src/i18n/locales/zh.js 2>&1 | Out-File t120_status.txt -Append -Encoding utf8; code t120_status.txt
```
확인: HEAD=4b836cd, origin 대비 ↑(실측), locales clean(?? .bak/.py/t*.txt만), ja/zh node PASS. 이상 없으면 즉시 1순위.

### 1순위 — zh dash 잔여 손실0 격리 (★최우선, 119 패턴 직접재사용)
- 119는 ja 전용(auto/marketing/super)이었음. **zh.js 의 dash>ops 동명 잔여 섹션이 119 ja 와 동일 구조일 가능성 높음**(zh 도 ja 처럼 dash 중첩본 존재). session119_diag_super_lossfree.py 의 blocks_for_key 인자를 zh + 후보섹션(auto/marketing/super/acctPerf 등)으로, 파일경로 JA→zh.js 로 바꿔 진단. D⊆R + D정답·R더미=0 + D−R 더미/부재면 superdel 모체 파생 dashdel(zh). ko실값이면 ins15 모체 파생 복구선행. **117 zh 6키 + 118 zh marketing 처리됐으나 잔여 동명블록 전수 미확인 — diag 부터.**
- 검수자 추천: ① zh dash>ops 동명블록 전수 진단(session119_diag_super_lossfree.py 파생, TARGET 후보 순회 + 파일 zh.js)부터. raw 후 손실0이면 즉시 dashdel, ko실값이면 ins 복구선행. ★진행 강제 #5.

### 2순위 — ja marketing KO_ABSENT 50 정밀 이관
- raw(t119_mkt.txt): csAiGenDesc/csAiGenTitle/csAiOpt1~3/csType*/csPerf*/csCol* 등 50키, ko·R 양쪽 부재(ko=None), D(dash>ops)에만 영문 Creative Studio 콘텐츠 존재. 정답출처 없음.
- 분기: (a) ko.js 에 csAiGen* 등이 **다른 섹션(타 페이지)에 존재**하는지 키단위 규명(keyset_verdict_budget 파생, 전 ko 블록 스캔) → 있으면 그 정답으로 ins. (b) ko 전무면 D 영문을 정답으로 채택해 ROOT직속 ins(영문이라도 콘텐츠 보존, 미번역 상태 ins) 후 dashdel. (c) 신규 일본어 번역. 자동 금지(운영규칙 10), raw 키단위 후 검수자 추천 분기.

### 3순위 — ja marketing dashdel (2순위 해소 후)
- 2순위로 KO_ABSENT 50 이 R 에 보강되면 marketing D⊆R 성립 가능. session119_diag_super_lossfree.py marketing 파생으로 재판정 → D정답·R더미=0 확인 시 superdel 파생 dashdel(marketing ja). 619차 zh marketing(9020dc4)과 대칭.

### 4순위 — accountPerf ja 의미충돌 3키 (114 4-2 잔여, N-7)
pageSub/pageTitle/teamDashboard 폴백경로 raw 후 정정. 키단위 수동.

### 5순위 — priceOpt 잔여 (113 4-2, N-8)
priceOpt ROOT[1]↔파편[2](208,값상이66)·[2](90,타페이지오염38키). 키단위 수동.

### 6순위 — DIVERGE 본래분
zh supplyChain(∩75)+ja supplyChain/marketing(∩124)/acctPerf(∩11). 수동 키단위. 자동 금지.

### 7순위 — 미번역·백로그
[N-6] settlements ROOT/auth 중복. [C] 키단위diff/comingSoon·runAI·runAi/workspace 브랜드·CRLF(git warning 무해, .gitattributes 정리 후순위)·ESLint/CSV/Connectors/107 attrData zh.

### 마지막 — 묶음 push (검수자 확인 하)
```
t cd D:\project\GeniegoROI; git log --oneline -35 2>&1 | Out-File t120_pushchk.txt -Encoding utf8; code t120_pushchk.txt
```
검수자 push 승인 시: `t cd D:\project\GeniegoROI; git push origin master` (deploy.yml 자동배포). 누적분(117~120) 일괄 반영.

## 6. 즉시 체크리스트 (120차)

1. [ ] 0순위 git log/status(HEAD=4b836cd, locales clean, ja/zh node PASS). 이상 없으면 즉시 1순위.
2. [ ] **검증완료 파서 무변경 import + 실모체 호출규약 절대 준수**: extract_kv(text[s+1:e]), pick_R=parent_chain==[]&min depth, depth=0-base. 실모체 소스 미확인 시 session119_dump_parser.py 로 먼저 dump(119 v1 실패 교훈).
3. [ ] **키존재 ≠ 정답**: (D−R)−K=0 만으로 ins 금지. ko값 raw 교차 is_dummy_ko 판정 필수(119 auto 더미함정).
4. [ ] **인계서 표기 raw 재판정**: 비관("정답없음")/낙관 둘 다 실측 우선(119 super 입증, 운영규칙 9·10).
5. [ ] 신규 .py sed·인라인 다줄 -c·cmd /c 금지, 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 한 줄. 합성검증 = 실모체 무변경 미러 import + 실파일 구조 픽스처. 합성검증+dry-run 양쪽 필수.
6. [ ] node --check SyntaxError 없음=PASS. apply 한 줄 = python --apply + node Append + git add/commit Append 결합형(119 4건 안정).
7. [ ] raw 확인은 code <txt> 원본. CC 요약·분류·자체패치 절대 불신(reject).
8. [ ] 동명블록 다중존재 매번 실측(운영규칙 9). R=parent_chain==[]&min depth, D=dash&ops 최내곽. '가장 큰 것'·'parent_chain==[ROOT]' 휴리스틱 금지.
9. [ ] 손실0 = ① D⊆R ② R∩D D정답·R더미=0 ③ D−R 전부 더미/부재. lossfree 결론가이드는 보수적(DIFF_NONDUM>0 위험플래그) → D_ANS_R_DUM=0 이면 raw 정밀판독으로 손실0 확정(auto/super 입증). 검증식 3중/4중 동시 AND, plan 단독비교 금지.
10. [ ] D−R ko실값이면 ins24/ins15 모체 파생 복구선행 → D⊆R 성립 후 dashdel(super ja 119 표준 패턴). ko더미면 ins 폐기 dashdel만(auto ja 119). ko·R부재(KO_ABSENT)면 정밀 이관(marketing 50).
11. [ ] 의사결정 분기 시 검수자 추천 1개 옵션 명시+근거(0의 ★★). 사용자 "추천대로"=즉시 진행.
12. [ ] 부분종결은 인계서 작성 직전 1회, 안전 즉시처리 대상 소진 시(119 표준: auto/marketing안전분/super 소진 후). 종결 시 본 인계서 동일 형식 전체 재작성(검수자 단일파일 → 사용자 NEXT_SESSION.md 전체 교체).

## 7. 파일 상태

- t113_*~t119_* 결과 txt 루트 보존(raw 이력). 120차는 t120_* 사용.
- 119차 백업 4개: ja.js.bak_session119_opsJaAutoDel_20260518_170919(e8c32a8) / ja.js.bak_session119_marketingJaIns15_20260518_171640(aac9ab2) / ja.js.bak_session119_superJaIns97_20260518_172605(1fa21db) / ja.js.bak_session119_opsJaSuperDel_20260518_173049(4b836cd). 118 이전 백업 보존.
- .py 자산: 3절 목록. 검수자 산출물 → 사용자 루트 저장. 컨테이너 초기화 → 매번 재저장. 폐기목록(3절 말미) 사용금지.
- git: HEAD=4b836cd, origin 대비 ↑(120 0순위 실측). 추적변경 NEXT_SESSION.md만(나머지 ?? 미추적 정상).
- NEXT_SESSION.md = 본 인계서. 120차 종결 시 전체 교체.

### 신규 사안
- [N-1~N-9] 이전 차수 처리/유지분(115~118).
- [N-6] ★진척(119): operations dash 중첩본 정밀이관 — 117 zh6/ja2 + 118 acctPerf/budget/zh marketing + **119 auto ja del319 / marketing ja ins15 / super ja ins97+del169** D⊆R 손실0 격리·복구. 잔여: **zh dash 동명블록 전수 미확인(120 1순위)**, marketing ja KO_ABSENT 50 정밀이관(120 2순위), marketing ja dashdel(2순위 해소 후 3순위).
- [N-7] 미해결(4순위): accountPerf ja 의미충돌 3키.
- [N-8] 미해결(5순위): priceOpt 잔여.
- [N-9] 미해결(7순위): settlements 중복.
- [N-10] 유지·강화(119): 미번역키 중 더미 다수. is_dummy_ko(따옴표 포함값 인식). **(D−R)−K=0 ≠ 복구가능 — ko값 raw 교차 필수(119 auto 147 전부 더미 실증).**
- [N-11] ★유지·강화(119): 손실0 = ① D⊆R ② R∩D D정답·R더미=0 ③ D−R 더미/부재. D−K(ko부재)는 R 보존 시 dash격리 무관. 값언어비율 폐기. 검증완료 파서 무변경 재사용 절대.
- [N-12] ✅해소(119): auto ja ROOT직속 한영혼재 → raw 규명 결과 HANGUL_DIFF=0(미번역 ko복사, 오염 아님). D−R 147 ko더미로 ins 폐기·dashdel만으로 종결(e8c32a8).
- [N-13] ★유지·강화(119): probe/도구 자작 휴리스틱 금지. **R 확정 = parent_chain==[] & min depth (실모체는 export default 래퍼 key=None 으로 ROOT 미블록화 — 'parent_chain==[ROOT]'·'가장 큰 것' 둘 다 금지). 실모체 호출규약(extract_kv body=text[s+1:e], depth 0-base) raw 확인 후 도구작성(v1 실패 교훈, session119_dump_parser.py 표준).**
- [N-14] ★유지(118·119): 모체 검증식에 자작 리터럴 비교 추가 금지. extract_kv 따옴표 미제거+공백정규화 → dict 통째 비교, 값비교 시 unq() 양끝따옴표만 제거.
- [N-15] ★신규(119): **인계서 표기 비관/낙관 오기록 가능 — 항상 raw 실측 우선**(super 3순위 "정답없음 수동이관" → 실측 D−R 97 전부 ko실값 정답, 단일세션 완전종결). lang_ratio 잔재 표기 불신, 운영규칙 9·10.
- [N-16] ★신규(119): 파생 도구 print/미리보기 라인 하드코딩 키 금지 → INSERT_KV 첫키 등 동적참조(super_ins97 미리보기 marketing 잔재 사례, 6순위/N-13 정신).
- 속도 원칙(필독): "초엔터프라이즈급"=품질·안전, 진행 더디게 아님. (a) 합성검증=실모체 무변경 미러 import + 실파일 구조 픽스처 + dry-run. (b) **검증완료 파서·검증식 무변경 재사용 절대, 실모체 호출규약 raw 확인 선행(119 핵심)**. (c) 매 턴 결과확인+다음도구 동시. (d) 부분종결 인계서 직전 1회·안전대상 소진 시(119: 4커밋 후 종결), 한 세션 최소 2단계 apply+commit(119 4커밋 충족). (e) raw 확정 즉시 연속, "추측 금지"를 속도저하 명분 금지. raw로 손실/미완/오염 입증 시(KO_ABSENT·이관) 강행 대신 정밀. (f) 의사결정 분기 시 검수자 추천 1개 강제. (g) 신규 .py 검수자 완성본 + 전달 전 합성검증. (h) 손실0 = D⊆R + D정답·R더미=0 + D−R 더미/부재. (i) 검증식 3중/4중 동시 AND, plan 단독비교 금지. (j) CC 자체 .py 패치 reject, 진단출력만 채택. (k) 키존재 ≠ 정답, ko값 raw 교차 필수. (l) 인계서 표기 raw 재판정(비관/낙관 불신).