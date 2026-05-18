# GeniegoROI i18n 인계서 — 119차 시작점

> 118차 종결 시 전면 재작성 / 페어 모드(검수자 명령 → 사용자가 CC에 t 접두로 전달)
> 상단부터 순서대로. 0순위 먼저.

---

## 0. 운영 방식 (먼저 읽기 — 특히 ★진행 강제 / ★★검수자 추천 강제)

- 기본값: 검수자가 CC에 직접 수정/실행 명령. 신규 .py 본문은 검수자가 산출물 파일로 만들어 전달 → 사용자가 루트에 1회 저장. 진단·git은 CC가 직접.
- **sed·서브식·복합 파이프는 자동승인+Bash변환 반복 유발.** 신규 .py는 sed 파생 금지, **검수자 완성본 산출물 → 사용자 1회 저장 → 단순 `python xxx.py 2>&1 | Out-File yyy.txt -Encoding utf8; code yyy.txt` 한 줄 실행**. 이 패턴이 114~118차 내내 안정 작동(118차 6커밋 전부 이 방식).
- **인라인 `python -c` 다줄 금지**: PowerShell 경유 시 줄바꿈/괄호 깨져 SyntaxError. 진단도 전부 산출물 .py로. 한 줄 -c도 가급적 회피.
- 모든 CC 명령은 t 접두 한 줄. 자동승인 프롬프트 계속 뜸. **분기 패턴: ① 단순 `cd; python xxx.py | Out-File`(node --check 1~2개 Append 포함) 한 줄 → "경로 우회 방지" 프롬프트 → Yes 진행(정착, 안전). ② 임베디드 표현식($()/$LASTEXITCODE)·if/else·sed `"..."`·복합 다단 파이프·Select-String 스크립트블록 → Esc 후 단순화.** 118차 내내 ①은 Yes로 안정.
- **CC 자체 패치 제안은 계속 reject.** CC가 산출물을 안 기다리고 .py를 자기판단으로 직접 수정 시도하면 사용자가 "User rejected update"로 거부. 도구는 오직 검수자 산출물만 채택. 단 CC의 *진단 출력*(상태/소스 dump)은 채택 가능.
- 검수자 설명 매 턴 핵심만(명령 + 확인 포인트 1~2개). raw 우선, CC 요약/제안 절대 불신.
- 환경변수 설정 금지. cp949는 .py 내부 `sys.stdout.reconfigure(encoding="utf-8")`.
- **검증완료 파서 무변경 재사용 절대원칙(117·118 핵심교훈)**: 신규 .py는 session112_inspect_suspect.py 의 `scan_key_blocks(text)->[(key,start,end,depth)…]` / `extract_kv(...)` 를 **import 무변경 사용**. 키집합/블록/span 자작 파서 금지. 부모체인은 블록 span 포함관계로 산출(파서 무변경). **118 교훈: probe v1 자작 휴리스틱(operations>dash 가정)이 실파일(dash>operations>섹션 depth1/2/3)과 불일치해 span=None 실패 → 검증파서 출력을 span 포함관계로만 산출하는 v2로 정정 후 정상.**
- node --check 판정: syntax 오류 시에만 출력+rc≠0. **Out-File 결과에 SyntaxError 텍스트 없으면 = PASS** (114~118 전건 이 방식 PASS).
- **컨테이너 초기화 → 검수자는 산출물 전달 전 합성검증(미니 픽스처) 필수.** **합성검증 커버리지 = 실파일 구조 반영필수**: 픽스처에 연속인접/비대상혼재(동명 아닌 별칭)/마지막키/원소속분리/중괄호균형/실제 depth(dash=d1, operations=d2, 섹션=d3) 포함. 합성검증 통과 + 실파일 dry-run 양쪽 필수.
- **118 핵심교훈(검증식 무변경 절대)**: 모체 도구의 검증식에 **자작 리터럴 비교 추가 금지**. acctperfdel self_test 에 `rm.get("m")=="原"` 같은 단일값 리터럴 비교를 추가했다가, 실제 session112 extract_kv 가 따옴표를 벗기지 않아(`'"原"'`) FAIL. 모체 방식(dict 통째 비교)만 사용 — 파서 따옴표처리와 무관하게 양변 동일적용.

### ★★ 검수자 추천 강제 규칙 (의사결정 분기 시 — 최우선)
1. **선택지(ask_user_input) 제시 시 항상 검수자 추천 1개를 옵션 라벨 안에 "— 검수자 추천"으로 명시**하고, 직후 응답에서 추천 근거를 인계서 규칙 번호로 1~3줄 제시.
2. 사용자가 "검수자 추천대로"라고만 답해도 즉시 그 선택으로 진행(재질문 금지).
3. 추천은 반드시 인계서 규칙(★진행 강제/운영규칙/안전장치)에 근거. 근거 없는 추천 금지.

### ★ 진행 강제 규칙 (미루기 금지 — 최우선)
1. **raw로 처리방향 확정 즉시 다음 단계 연속 진행.** dry-run→raw확인→apply→node→독립검증→commit 한 흐름으로 종결. 단계마다 멈추고 종결 금지.
2. **부분종결은 "인계서 작성 직전 단 1회"만 허용.** 그 전까지 작업 여력 있는 한 멈추지 않음. "다음 차수에서"는 raw로 손상/불완전/오염이 입증된 경우에 한해서만 허용. **118: 안전 즉시처리 대상(acctPerf/budget/zh marketing) 전부 소진 후 부분종결 — 이 조건이 표준.**
3. **한 세션 목표 = 최소 2단계 apply+commit.** (118차는 6커밋 = 기준선 3배.)
4. "추측 금지"는 안전장치(백업·dry-run·가드·ROLLBACK)가 있으므로 속도저하 명분 불가. raw 확정 안전대상은 즉시 처리.
5. 작업 여력 남으면 다음 우선순위로 계속. 단 raw가 손상/불완전/오염 입증 시 강행 대신 정밀 이관(가드가 손실·미번역·구조오염 차단이 안전설계 정당성).
6. 파괴 작업 전 백업·dry-run·검증·이상시 ROLLBACK 절대 생략 금지(속도 무관, 항상).

## 1. 컨텍스트

- 작업: i18n 번역 키 동기화. **정답 원본은 ko.js(원본 한국어)** — 115~118차 일관 입증. EN은 일부 키가 키명 그대로인 stub라 ko 의미 우선.
- locale: frontend\src\i18n\locales\{lang}.js (15개, ES모듈). 주 대상 ja.js/zh.js. 정답 출처 = ko.js, 참조 = en.js.
- 키는 따옴표 형태("pageTitle":...). 검증은 node --check (SyntaxError 없음=PASS).
- **실측 트리구조(118 핵심)**: ja.js/zh.js 의 operations[dash] 는 **dash(depth1) > operations(depth2) > 섹션(depth3)** 구조. 인계서 표기 ≠ 실제, 항상 검증파서 scan_key_blocks 출력 + span 포함관계로 실측(운영규칙 9). dash>operations 포함쌍 = dash 중 operations 를 진포함하는 가장 큰 것.
- **116 발견 유지**: 미번역키 ≠ 전부 복구가능. is_dummy_ko 판정 = ko값 공백 OR ko값==키명(대소문자무시, 따옴표 포함값도 인식). 영숫자토큰 규칙 금지.
- **손실0 판정기준(117·118 표준)**: 값언어비율(부정확) 아니라 **키집합 포함관계**. D(dash중첩본 키집합) ⊆ R(원소속 ROOT직속 동명섹션 키집합) 이면 dash삭제 손실0. D⊄R·D⊆K(ko) 면 ko기반 ins로 R 보강 후 격리(복구선행). ko·원소속 부재면 이관. **D−K(ko부재)는 dash격리와 무관 — 원소속 R 보존이면 손실0**(118 zh marketing 입증: 117차 lang_ratio 결함으로 보류했으나 keyset 기준 D⊆R 안전).

## 2. 운영규칙 (절대준수)

1. 자동승인 → 0의 분기(① Yes / ② Esc 단순화).
2. 한 줄·Windows 경로. 출력 Out-File; code <f>로 파일 원본 직접 확인.
3. node --check (SyntaxError 없음=PASS).
4. commit 영문 한 줄. .js만 스테이징(.bak/t*.txt/.py 제외). push는 사용자 확인 하(deploy.yml 자동배포).
5. CC 요약·제안 신뢰 금지 → 부모체인/brace-depth/값/키집합 raw만. CC 자체 .py 패치 reject.
6. dry-run SKIP/SHARED는 "키 존재"만. 값·키집합까지 직접 교차.
7. 파괴 편집 전 .bak 백업. 재검증(3중 동시 AND) 실패 시 자동 ROLLBACK.
8. **키집합 동일 ≠ 무손실. D⊆R 키집합 + 원소속이 정답(현지어/ko기반)이어야 손실0.** 고유명사(ko=en=현지어 동일 영문값, whatsapp/Coupang/11Street/Amazon/channel_)는 미번역 아닌 정답 → 가드 화이트리스트 예외.
9. **동명 블록 다중존재 주의**: 한 키가 ROOT/[ui]/[dash/operations]/[ruleEnginePage] 등 복수 depth 존재. 처리 전 probe로 부모체인·키수·키집합 raw 확정. **118 실측 예: ja auto 3개(ruleEnginePage d2 319 / dash>ops d3 319 / ROOT d1 172). probe 가 "가장 큰 것" 휴리스틱으로 ROOT직속 아닌 블록을 R 로 오선택한 사례 — 반드시 parent_chain==['ROOT'] 로 R 확정.** 검증완료 파서 scan+span 포함관계 부모체인이 표준. 인계서 표기 부모체인 != 실제 가능(116·117·118 교훈, 항상 실측).
10. **값방향 raw 필수**: 통계·값언어비율만 믿지 말 것. 손실0 판정은 키집합 포함관계 우선. 미번역이 ko에 정답 존재 시 ko기반 복구 가능(115/116 표준).

## 3. 핵심 .py 자산 (루트 보존, 컨테이너 초기화 → 매번 재저장)

### 검증완료 파서 모체 (읽기전용, 무변경 인용 — 절대원칙)
- **session112_inspect_suspect.py ★★** — 모든 신규도구 파서 모체.
  - `scan_key_blocks(text)` → `[(key, start, end, depth), …]` (start='{' 위치, end='}' 위치, depth=스택깊이). 부모체인 dict 없음 → span 포함관계로 산출. **반환은 4-튜플. 정답 키 인식은 '{' 직전 `"key":` 패턴.**
  - `extract_kv(body)` → `{key: value}` 평면 dict. **주의: 값 따옴표를 벗기지 않고 포함 반환(`'"原"'`). 단일값 리터럴 비교 금지, dict 통째 비교만(118 교훈).**
- session111_ident_valuediff_v4.py ★ — 파서 원형.

### 117차 자산 (재사용 표준)
- **session117_keyset_verdict.py ★★** — **키집합 포함관계 손실0 판정 표준**. TARGET_KEYS(7키) × ja/zh. D/R/K 추출·비교, self_test 4종 내장. **118: 무변경 재실행으로 zh marketing ③격리-안전 신발견(117 보류분 해소). TARGET_KEYS 확장만으로 다른 SEC 진단 가능(파생 표준).**
- session117_adopt_ops_zh_dashdel6.py ★★ / session117_adopt_ops_ja_dashdel2.py ★★ — operations[dash] 내 N키 통째삭제 표준(3중 가드). **118 acctperfdel/budgetdel/marketingdel 의 모체.**
- session117_probe_zh_opsdash_span.py / session117_probe_rootblk_boundary.py ★ — 진단 표준.
- session117_dump_dash_lossrisk.py(v5) — lang_ratio 결함, 폐기. keyset_verdict 대체.

### 118차 신규 자산 (★ = 119차 재사용 표준)
- **session118_adopt_ops_ja_acctperfdel.py ★★ (7e45134 적용·검증완료)** — dashdel2 의 단일 TARGET 파생 표준. 파서/3중가드/deletion_span/ROLLBACK/self_test 무변경 계승, TARGET·self_test 픽스처만 변경. **dashdel 파생의 119차 모체.**
- **session118_adopt_acctperf_ja_ins24.py ★★ (4e6279a 적용·검증완료)** — ins37(116) 의 ROOT직속 ins 파생 표준. SEC·TARGET_OPEN(span start)·EXPECT_R_COUNT·INSERT_KV(ko기반 일본어)만 변경. 검증식 = inserted∧preserved∧val∧ins_val∧fixed∧**dsubR_ok**(D⊆R 직접확인) 동시 AND. **ins 파생의 119차 모체(auto 복구선행에 직접 사용).**
- session118_adopt_ops_zh_budgetdel.py (b030136) / session118_adopt_budget_ja_ins2.py (1d32647) / session118_adopt_ops_ja_budgetdel.py (f0534bc) / session118_adopt_ops_zh_marketingdel.py (9020dc4) — 위 두 모체의 검증완료 파생. 재사용 가능.
- **session118_keyset_verdict_budget.py ★** — keyset_verdict 파생 + is_dummy_ko 보조출력(ko 실값/더미 분리). SEC 추가만으로 A군/더미 판정. 119차 budget류 추가 SEC 진단에 재사용.
- session118_probe_recovery_v2.py ★ — dash>ops>섹션(d1/2/3) 실측구조 반영 D/R/K + 부족키 + ko정답 dump 진단 표준. **v1(자작 휴리스틱) 폐기, v2 표준.**
- session118_diag_auto_ja.py ★ — 동명 다중블록 전수 parent_chain/키집합/한글혼입/상호포함 raw dump 진단(운영규칙 9 실측 표준). 119 auto 1순위 출발점.
- session118_diag_selftest.py — self_test FAIL 원인 raw 규명용(파서 실출력 dump). 참고.

### 116/115 자산 (보존·재사용 가능)
- session116_adopt_gairec_ja_nestdel_v2.py ★★ / session116_adopt_gairec_ja_ins37.py ★★ (118 ins 모체) / session116_dump_ops_ja_Agroup.py·zh_Agroup.py ★★ / session116_adopt_ops_ja_ruleengine_A33.py·zh_root_A35.py ★ / session116_probe_ops_dashdel.py ★.
- session115_adopt_gcat_zh_translate.py ★★ / session115_adopt_gnav_zh_subsetdel_v2.py ★★.
- ※ session111_subset_absent.py·session114_adopt_gnav_zh_subsetdel.py·session117_dump_dash_lossrisk.py(v5)·session118_probe_recovery_v1(=probe_acctperf_auto_recovery 초판)·session118_struct_dump.py = 폐기·참고만.

## 4. [DONE] 118차 결과 (raw 확정·apply 성공만 — 6커밋)

### 4-0. push — 묶음 보류 유지
HEAD=9020dc4. origin 대비 **↑26**(117 종결 ↑21 + 118 6커밋 — 단 117 인계서커밋 1 포함하므로 실측: 117 종결시 ↑21, 118 5신규 apply커밋 + 인계서 직전 49fb5b3 1 = ↑26 추정, 119 0순위에서 git log 실측 확인). 검수자 결정: 계속 묶음 보류.

### 4-1. ★ acctPerf ja 복구선행 완전 종결 (1순위 핵심) — 2커밋
- raw(t118_recov2.txt): D=35, R=40, D−R=24 전부 ko 정답 보유(D−R∩K=24, D⊆K=True). 인계서 117 예상과 정확 일치.
- **4e6279a**: session118_adopt_acctperf_ja_ins24.py --apply. ROOT직속 R(span 962867~) 에 D−R 24키 ko기반 일본어 ins. 40→64. inserted/preserved/val/ins_val/dsubR_ok=True. node PASS.
- **7e45134**: session118_adopt_ops_ja_acctperfdel.py --apply. dash>ops 内 acctPerf D(35) 격리. 형제 298→297. 3중 AND True. node PASS. (self_test 1차 FAIL = 자작 리터럴비교 결함, dict통째비교로 정정 후 PASS — 0의 핵심교훈.)

### 4-2. ★ budget ja/zh 완전 종결 (6순위) — 3커밋
- raw(t118_budget.txt): zh budget D=4⊆R=4(③격리-안전, 한자 정상). ja budget D=4,R=2,D−R={onTrack,overspend}, D⊆K. ko 4키 전부 실값(더미0).
- **b030136**: session118_adopt_ops_zh_budgetdel.py --apply. zh dash budget 4키 격리(ins 불필요). 형제 295→294. 3중 AND True. node PASS.
- **1d32647**: session118_adopt_budget_ja_ins2.py --apply. ja ROOT직속 budget(span 568468~) 에 2키 ins(onTrack=正常執行, overspend=超過執行). 2→4. dsubR_ok=True. node PASS.
- **f0534bc**: session118_adopt_ops_ja_budgetdel.py --apply. ja dash budget 4키 격리. 형제 297→296. 3중 AND True. node PASS.

### 4-3. ★ zh marketing 종결 (2순위 zh분) — 1커밋
- raw(t118_verdict_recheck.txt): zh marketing D=625 ⊆ R=798 ③격리-안전(한자 정상). D−K 70은 ko부재일뿐 원소속 R 보존(dash격리 무관). **117차 4-3 "D−K 70 잔차로 비대상"은 lang_ratio 시절 잔재 — keyset 기준 재판정으로 안전 입증(컨텍스트 1·운영규칙 8·N-11).**
- **9020dc4**: session118_adopt_ops_zh_marketingdel.py --apply. zh dash marketing 625키 격리. 형제 294→293. 원소속 798 불변. 3중 AND True. node PASS.

## 5. [PENDING] 119차 작업 (★raw 확정 즉시 연속 진행, 손실입증 시만 이관)

### 0순위 — push 상태 재확인
```
t cd D:\project\GeniegoROI; git log --oneline -10 2>&1 | Out-File t119_status.txt -Encoding utf8; git status --short frontend/src/i18n/locales 2>&1 | Out-File t119_status.txt -Append -Encoding utf8; node --check frontend/src/i18n/locales/ja.js 2>&1 | Out-File t119_status.txt -Append -Encoding utf8; node --check frontend/src/i18n/locales/zh.js 2>&1 | Out-File t119_status.txt -Append -Encoding utf8; code t119_status.txt
```
확인: HEAD=9020dc4, origin 대비 ↑(실측), locales clean(?? = .bak/.py/t*.txt만), ja/zh node PASS. 이상 없으면 즉시 1순위.

### 1순위 — auto ja 복구선행 (★최난도 잔여, raw 단서 확보됨)
- raw(t118_diagauto.txt + t118_verdict_recheck.txt): **auto ja 3블록 = ruleEnginePage(d2,319) / dash>ops(d3,319=D) / ROOT직속(d1,172=R)**. D−R=147, **D⊆K(ko auto 정답 ROOT직속@576201 319키·dash@96686 319키 양쪽 존재)**. → 복구선행(ins 147키 → D⊆R → dashdel 격리).
- **★선해결 필요(N-12 한영혼재 오염)**: ja ROOT직속 auto(R 172키) 중 **166키가 한국어 실값**("Qoo10 (큐텐)" "Rakuten (라쿠텐)" "Global Ads Platform API 키" 등). 단순 ins 강행 시 한글오염 그대로 격리 보존됨 → **강행금지**. ins 전 raw 규명: ① ko auto 정답값이 한국어인지(ko 원본이므로 당연 한국어 → ja ROOT auto "한글"이 오염이 아니라 ja 미번역상태로 ko복사된 정상 미번역키일 가능성) ② dash 영문stub D 가 오히려 참조원인지. session118_diag_auto_ja.py 파생으로 ja ROOT auto 166한글키 vs ko auto 동일키 값 1:1 raw 비교 → 미번역(ko복사)이면 ko기반 일본어 정정 후 ins, 진짜 오염이면 정밀.
- 검수자 추천: ① ja ROOT auto 166키 vs ko auto 값 1:1 dump부터(읽기전용). raw로 미번역/오염 판정 후에만 ins 설계(ins24 모체 파생, INSERT_KV=ko기반 일본어 147+α). ★진행 강제 #5.

### 2순위 — ja marketing 잔차 정밀
- raw(t118_verdict_recheck.txt): ja marketing D=625, R=733, **D−R=65**(csAiGenDesc/csAiGenTitle/csAiOpt1~3 등), **D−K=70**(abSetup/alertNewApproval 등). 잔차존재-수동판정(강행금지). D−R 65 = 원소속 부족 → ko 존재여부 키단위 규명(keyset_verdict_budget 파생, SEC=marketing, is_dummy 보조). D−R∩K 면 ins 복구선행, D−R−K 면 (a)타섹션귀속 (b)신규번역 (c)이관 분기. 자동 금지(운영규칙 10).

### 3순위 — super ja 이관 + 잔여
- raw: ja super D=169, R=72, **D−R=97 + ko부재(K없음)**. 정답출처 없음 → 키단위 수동 이관(강행금지). zh super 는 dash 없음(117 4380109 처리완료, 무관). accountPerf ja 의미충돌 3키(114 4-2 잔여, pageSub/pageTitle/teamDashboard) 폴백경로 raw 후 정정.

### 4순위 — priceOpt 잔여 (113차 4-2)
priceOpt ROOT[1]↔파편[2](208,값상이66)·[2](90,타페이지오염38키). 키단위 수동.

### 5순위 — DIVERGE 본래분
zh supplyChain(∩75)+ja supplyChain/marketing(∩124)/acctPerf(∩11). 수동 키단위. 자동 금지.

### 6순위 — 미번역·백로그
- [N-6] settlements ROOT/auth 중복. [C] 키단위diff/comingSoon·runAI·runAi/workspace 브랜드·CRLF/ESLint/CSV/Connectors/107차 attrData zh.
- 도구 출력 라벨 정리: budgetdel/marketingdel 파생본 print 문구 일부에 "JA"/"ja operations" 잔존(로직·파일 무관, zh 처리 정상). 119차 파생 시 라벨도 정정 권장.

### 마지막 — 묶음 push (검수자 확인 하)
```
t cd D:\project\GeniegoROI; git log --oneline -30 2>&1 | Out-File t119_pushchk.txt -Encoding utf8; code t119_pushchk.txt
```
검수자 push 승인 시: `t cd D:\project\GeniegoROI; git push origin master` (deploy.yml 자동배포). 누적분 일괄 반영.

## 6. 즉시 체크리스트 (119차)

1. [ ] 0순위 git log/status(HEAD=9020dc4, locales clean, ja/zh node PASS). 이상 없으면 즉시 1순위.
2. [ ] 1순위 auto ja: **한영혼재 선판정 필수**(ja ROOT auto 166한글키 vs ko auto 1:1 raw). 미번역이면 ko기반 ins(ins24 파생) → D⊆R → dashdel. 오염이면 정밀(강행금지).
3. [ ] **검증완료 파서 무변경 재사용 절대원칙**. scan_key_blocks/extract_kv import. 자작 키집합/span/휴리스틱 파서 금지(probe v1 실패 교훈).
4. [ ] **검증식 무변경 절대**(118 핵심): 모체 검증식에 자작 리터럴 비교 추가 금지. dict 통째 비교만(extract_kv 따옴표 미제거).
5. [ ] 신규 .py는 sed·인라인 다줄 -c 금지, 검수자 완성본 산출물 → 사용자 1회 저장 → 단순 python 한 줄. 합성검증 픽스처는 실파일 구조 반영(dash=d1/ops=d2/섹션=d3, 동명 아닌 별칭 비대상, 마지막키, 중괄호). 합성검증+실파일 dry-run 양쪽 필수.
6. [ ] node --check SyntaxError 없음=PASS. `$LASTEXITCODE` 등 임베디드 금지.
7. [ ] raw 확인은 code <txt> 파일 원본. CC 요약·분류·자체패치 절대 불신(reject).
8. [ ] 동명블록 다중존재 매번 실측(운영규칙 9). **R 확정은 parent_chain==['ROOT'] 로**(118 auto probe 오선택 교훈). dash>ops>섹션 d1/2/3.
9. [ ] 손실0 판정 = **키집합 포함관계 D⊆R**(운영규칙 8). D−K(ko부재)는 dash격리 무관. 값언어비율 금지. 검증식 = 3중 동시 AND(제거/원소속불변/형제정합), plan 단독비교 절대금지.
10. [ ] 미번역 ≠ 복구가능(116). is_dummy_ko(따옴표 포함값도 인식). A군만 치환/복구, B군·고유명사 SKIP.
11. [ ] 의사결정 분기 시 검수자 추천 1개 옵션 명시+근거(0의 ★★). 사용자 "추천대로"=즉시 진행.
12. [ ] 부분종결은 인계서 작성 직전 1회만, 안전 즉시처리 대상 소진 시(118 표준). 종결 시 본 인계서 동일 형식 전체 재작성(검수자 단일파일 → 사용자 NEXT_SESSION.md 전체 교체).

## 7. 파일 상태

- t113_*~t118_* 결과 txt 루트 보존(raw 이력). 119차는 t119_* 사용.
- 118차 백업 5개: ja.js.bak_session118_acctPerfJaIns24_20260518_155127(4e6279a) / ja.js.bak_session118_opsJaAcctPerfDel_20260518_160005(7e45134) / zh.js.bak_session118_opsZhBudgetDel_20260518_161141(b030136) / ja.js.bak_session118_budgetJaIns2_20260518_161511(1d32647) / ja.js.bak_session118_opsJaBudgetDel_20260518_161813(f0534bc) / zh.js.bak_session118_opsZhMarketingDel_20260518_162448(9020dc4). 117 이전 백업 보존.
- .py 자산: 3절 목록. 검수자 산출물 → 사용자 루트 저장. 컨테이너 초기화 → 매번 재저장. 폐기목록(3절 말미) 사용금지.
- git: HEAD=9020dc4, origin 대비 ↑(119 0순위 실측). 추적변경 NEXT_SESSION.md만(나머지 ?? 미추적 정상).
- NEXT_SESSION.md = 본 인계서. 119차 종결 시 전체 교체.

### 신규 사안
- [N-1~N-6] ✅ 115·116차 완료분.
- [N-6] ★진척(118): operations dash 중첩본 정밀이관 — 117 zh6/ja2 + **118 acctPerf ja(ins24+del35) / budget zh(del4)·ja(ins2+del4) / marketing zh(del625)** D⊆R 손실0 격리 완료. 잔여: **auto ja 복구선행+한영혼재 선판정(119 1순위)**, ja marketing 잔차 D−R65/D−K70(119 2순위), ja super 이관 D−R97+ko부재(119 3순위).
- [N-7] 미해결(3순위): accountPerf ja 의미충돌 3키.
- [N-8] 미해결(4순위): priceOpt 잔여.
- [N-9] 미해결(6순위): settlements 중복.
- [N-10] 유지(116): 미번역키 중 더미 다수. is_dummy_ko(따옴표 포함값도 인식, 118 보강).
- [N-11] ★유지·강화(117·118): 손실0 = 키집합 D⊆R. **D−K(ko부재)는 dash격리와 무관 — 원소속 R 보존이면 손실0**(118 zh marketing 입증, 117 lang_ratio 잔재 정정). 값언어비율 도구 폐기. 검증완료 파서 무변경 재사용 절대.
- [N-12] ★유지·정밀화(117·118): **auto ja ROOT직속 한영혼재**(R 172키 중 한국어 실값 166키). probe v2 가 R 을 ruleEnginePage(d2)로 오선택했던 것 raw 규명완료 — 진짜 ROOT직속(d1@562146/561991) 기준 D−R=147, 한글166. **119 1순위: ko auto 정답값과 1:1 비교로 "미번역(ko복사) vs 진짜오염" 판정 후 ins/정밀 분기. 강행금지.**
- [N-13] ★신규(118): probe/도구 자작 휴리스틱 금지 재확인. v1 operations>dash 가정이 실파일 dash>operations>섹션(d1/2/3)과 불일치해 실패. 검증파서 출력 span 포함관계로만 산출. **R 확정은 parent_chain==['ROOT']**(가장 큰 것 휴리스틱 금지).
- [N-14] ★신규(118): 모체 검증식에 자작 리터럴 비교 추가 금지. extract_kv 따옴표 미제거(`'"原"'`) → 단일값 `==` 비교 깨짐. dict 통째 비교만(양변 동일적용으로 따옴표 무관).
- 속도 원칙(필독): "초엔터프라이즈급"=품질·안전, 진행 더디게 하란 의미 아님. (a) 합성검증 핵심 + 실파일 구조반영 픽스처(d1/2/3, 동명아닌별칭) + dry-run. (b) **검증완료 파서·검증식 무변경 재사용 절대(117·118 핵심)**, 도구 버전 난립 금지. (c) 매 턴 결과확인+다음도구 동시. (d) 부분종결 인계서 직전 1회·안전대상 소진 시(118 표준), 한 세션 최소 2단계 apply+commit(118차 6커밋 충족). (e) raw 확정 즉시 연속, "추측 금지"를 속도저하 명분 금지. 단 raw로 손실/미완/오염 입증 시(복구선행·잔차·이관·한영혼재) 강행 대신 정밀. (f) 의사결정 분기 시 검수자 추천 1개 강제. (g) 신규 .py는 검수자 완성본 산출물 + 전달 전 합성검증(실파일구조 반영). (h) 손실0 = 키집합 D⊆R, D−K 무관. (i) 검증식 3중 동시 AND, plan 단독비교 금지. (j) CC 자체 .py 패치 reject, 진단출력만 채택.